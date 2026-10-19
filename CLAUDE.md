# Poppit

Single-file browser idle/clicker game: pop pearls for juice, buy upgrades, Fresh Batch (prestige) for Flavors. Hosted on GitHub Pages straight from `index.html` on `main`.

## Architecture contract

- **`index.html` is a build output.** Never edit it by hand; edit `src/` and rebuild. It is committed because Pages serves it.
- **Concat order (fixed):**
  - `src/head.html`
  - then `src/econ.js`, `save.js`, `samples.js`, `audio.js`, `music.js`, `world.js`, `render.js`, `ui.js`
  - then `src/tail.html`
  - The JS files share one scope inside the page, so later files use earlier files' top-level names.
  - `tests/harness32.js` repeats this list. Keep the two lists in step with `tools/build.js`.
- **`src/econ.js`** holds the pure economy and no DOM:
  - upgrades: `UPG`, buy `ORDER`, `TOOLS`;
  - the pearl roster: `PEARLS`, with hp, payout `mult` and spawn `cap`;
  - spawn weights (`NEW_BASE`, `typeWeight`);
  - `COST_SCALE`, `COLLAPSE_MIN_RUN` and `collapseGain` / `collapseReady`;
  - `stats()` and `popValue()`.
  - It is also `require`d by node tests and the sim, so **every economy number lives here**. The number formatters `fmt` / `fmtV` sit at the bottom of it, outside the `ECON` export.
- **`src/save.js`** holds pure save helpers with no DOM: `encodeSave` / `decodeSave`, plus `SAVE_VERSION`, `MIGRATIONS` and `migrateSave`.
- **`src/world.js`** holds state, board, spawning (`trySpawn` enforces the per-type cap) and effects.
- **`src/render.js`** draws the canvas.
- **`src/ui.js`** holds the shop, panels, input, save/load, Fresh Batch and the main loop.
- **Fresh Batch:**
  - Code: the `collapseBtn` handler, `finishCollapse()` and `resetRun()` in `src/ui.js`.
  - **Wipes:** juice, run juice, all upgrade levels, tools and tool upgrades, the backpack and the board.
  - **Keeps:** Flavors (`echoes`), `collapses`, `lifetime`, discoveries (`col`), the pool and settings.
- **Save storage:**
  - The `localStorage` key is `poppit.v1`. **Never rename it**: every existing player's save lives there. The key name is not the format version.
  - The JSON inside carries `version`. The current version is `SAVE_VERSION = 2` in `src/save.js`. `serialize()` and `loadState()` live in `src/ui.js`.
  - The game saves every 5 s, after purchases, on `visibilitychange` to hidden, and on `pagehide` (iOS Safari does not reliably fire `visibilitychange` when a tab is closed).
- **Versioning rules:**
  - A save without `version` is version 1.
  - `MIGRATIONS[n]` turns a version n save into version n + 1. `migrateSave` runs every step from the save's version up to `SAVE_VERSION`. The v1 → v2 step grants Blue, marks unlocked and seen types as found, and pools them.
  - To change the format: bump `SAVE_VERSION`, add one migration step, and **never edit a step that has shipped**.
  - A save with a version newer than `SAVE_VERSION` is refused with a toast. If it is the stored save, `saveBlocked` stops autosave from overwriting it. Reset save, an import or a restore clears the block.
  - A version that is not an integer ≥ 1, or a save that is not an object, is refused as invalid.
- **Loading is untrusted input:**
  - `loadState(obj)` returns `'ok'`, `'invalid'` or `'newer'`. On anything but `'ok'` it leaves the state untouched.
  - Numbers must be finite and ≥ 0, otherwise they become 0. Levels clamp to 0..max.
  - Tool upgrades clamp to 0..5, unknown tool indexes are dropped, and `equip` must be a tool that is owned (or -1).
  - Booleans must be real booleans. `musicVol` must be finite, otherwise it becomes 0.5.
  - The pool keeps only real, discovered pearl ids, without duplicates, and is never empty (it falls back to `pearl`).
  - `col` entries are rebuilt in their known shape, and unknown keys are ignored.
- **Save codes:**
  - Format: `POPPIT2:` + base64 of the UTF-8 JSON + `.` + 8 hex digits of FNV-1a over the base64 text. Whitespace is ignored.
  - `decodeSave` returns `null` for a wrong prefix, a bad checksum, bad base64, bad UTF-8, or JSON that is not an object. A truncated code or a single changed character is always caught.
- **Settings → Save:**
  - **Copy save code:** uses `navigator.clipboard`, then a hidden-textarea `execCommand`. If both fail, the code is shown selected in a read-only box.
  - **Download save file:** `poppit-save.txt`.
  - **Paste box:** the Open file picker fills it (files over 1 MB are refused).
  - **Load:** checks the code and shows an in-panel confirm with its juice and Flavors. **Confirm** loads it.
- **Backup:**
  - Before an import, the current raw save (or the serialized state, if nothing is stored yet) is copied to `localStorage` key `poppit.backup`.
  - If a stored save exists and the backup cannot be written, the import is aborted.
  - **Restore previous save** shows only while `poppit.backup` exists. It needs a second click to confirm, loads the backup, and deletes it.

## Commands (Windows PowerShell and macOS alike, no bash needed)

- `npm run build`: runs `node tools/build.js`, which concatenates into `build/all.js` (gitignored), syntax-checks it with `vm.Script`, and writes `index.html`. **This is the gate.**
- `npm test`:
  - `tests/econ32.test.js`: `node:test` unit tests of `ECON` and `fmt`.
  - `tests/harness32.js`: runs the real concatenated game against stubbed DOM APIs and drives it like a player. It prints PASS/FAIL lines and ends with `ALL PASSED`. It pulls in `tests/pearl_tests.js`.
- `npm run sim`: runs `tools/sim32.js`, the seeded pacing sim. It plays 6 Fresh Batch cycles for a casual and an engaged profile, and the output is identical run to run.
  - `--wait=25`: the player keeps going to minute 25 before pressing Fresh Batch.
  - `--variant=NAME`: plays a tuning option.
  - `--compare`: prints a summary of every variant.
  - `--log`: prints a per-mark pacing log.
  - Variants override levers inside the sim only. The sim's copies of the cost formulas are checked against `src/econ.js` at startup.

## State: real and verified (2026-10-18)

- **Build:** the Node build replaced `build.sh`, and its output is byte-identical to the old build.
- **Tests:** 22 unit tests and 102 harness checks pass. 19 of the harness checks cover save codes, versions, clamping, backup/restore and `pagehide`.
- **Save export / import (2026-10-18):** all four paths work in Chrome:
  - copy → clear site data → paste → Load → Confirm brings the progress back;
  - the copy fallback shows the selected code;
  - a truncated code is refused;
  - a stored v99 save is neither loaded nor overwritten by autosave.
  - No console errors.
- **Roster and unlock chain:** 10 pearl types, unlocked in the order Blue, Mint, Golden, Violet, Coral, Marble, Opal, Ruby, Black.
- **Collection and pool:** the collection book, pool toggles with the "next type maxed" lock, and shiny pearls.
- **Tools:** six tools, each with power and speed upgrades.
- **Backpack:** selling from the backpack, plus auto-sell.
- **Other systems:** Frenzy, Fresh Batch and the radio (`music/tracks.json`).
- **Number display:** `fmt` was fixed for suffix rollover (`1000K` now shows `1.00M`) and checked in the browser up to `99.9Qa`.
- **Balance:** measured in `docs/balance-report.md`. **No tuning option from it has been applied**; that choice is Ian's.

## Still open

- **Balance:**
  - Fresh Batch cycles shrink to about 1 minute when it is taken at once.
  - Flavors explode (x3,000+) when the player waits.
  - The upgrade shelf empties in late runs.
  - See the report's options A, B and C and the open question about Flavor-scaled costs.
- **Offline progress:** not built as a feature. Only a simple away bonus exists (`awayBonus()`: helper idle rate × 50%, capped at 8 h).
- **Save sync between devices:** not built. Moving a save is manual (code or file). Tested only on desktop Chrome so far; iOS Safari `pagehide` and the clipboard on phones are not yet verified on a device.
- **Unreadable stored save:** if `poppit.v1` holds broken JSON, the game starts fresh and the next autosave overwrites it. This is the same as before; it is not backed up.
- **"Copy save code" button:** the label wraps to two lines in the 318 px panel.
- **Phone layout:** not built or verified. There is only one `@media (max-width: 820px)` rule that stacks the panel under the board.
- **Artifacts:** not built. A Flavor shop or other spending that lasts across Fresh Batches would also be the natural fix for the empty late-game shelf.
- **Raw numbers:** the Fresh Batch button and the Flavors line print raw integers (`+6666 Flavors`, `x3238.4`). They fit today, but they don't use `fmt`.
- **Sim limitations** (see the report): no backpack selling, no away bonus, pool never toggled, fixed cell counts per board tier.
