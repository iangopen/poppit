# Poppit

Single-file browser idle/clicker game: pop pearls for juice, buy upgrades, Fresh Batch (prestige) for Flavors. Hosted on GitHub Pages straight from `index.html` on `main`.

## Architecture contract

- **`index.html` is a build output.** Never edit it by hand; edit `src/` and rebuild. It is committed because Pages serves it.
- **Standalone page rules.** `index.html` is served as is by GitHub Pages, with no wrapper, so it must be a complete document. `tests/page.test.js` checks all of this:
  - `src/head.html` opens the document: `<!doctype html>`, `<html lang="en">`, `<head>`, `<meta charset="utf-8">` first (it must stay within the first 1024 bytes), then the viewport meta `width=device-width, initial-scale=1, viewport-fit=cover`, `<title>`, the font links, `<style>`, `</head>`, `<body>`, the markup, and finally an open `<script>`.
  - `src/tail.html` closes it: `</script>`, `</body>`, `</html>`.
  - Without the doctype the page falls into quirks mode. Without the charset, a server that sends no charset (such as `python -m http.server`) shows "Â·" for "·".
  - **The hidden rule:** the CSS starts with `[hidden] { display: none !important; }`. Panels, rows, slots and the Restore row are all shown and hidden with the `hidden` attribute, so never give one a `display` that beats it some other way.
  - Inline SVG icons inside buttons need `display: block` where their box matters. Standards mode adds a baseline gap under inline images; the book arrows had one.
  - `tools/build.js` stays a plain byte concatenation.
- **Concat order (fixed):**
  - `src/head.html`
  - then `src/econ.js`, `save.js`, `samples.js`, `audio.js`, `music.js`, `world.js`, `render.js`, `ui.js`
  - then `src/tail.html`
  - The JS files share one scope inside the page, so later files use earlier files' top-level names.
  - `tests/harness32.js` repeats this list. Keep the two lists in step with `tools/build.js`.
- **`src/econ.js`** holds the pure economy and no DOM:
  - upgrades: `UPG`, buy `ORDER`, `TOOLS`;
  - **tool unique upgrades:** a `TOOLS` entry can carry `unique: { id, name, desc, base, grow, max, effect }`. It is bought on that tool's page in the Tools panel and priced by `uniqueCost(i, lvl)` (`base × COST_SCALE × grow^lvl`). Its level lives at `state.toolUp[i].u`, next to `p` and `s`, and Fresh Batch wipes it like the others. `stats()` merges `effect(level)` in only for the **equipped** tool with level > 0, so the upgrade works only while that tool is in hand.
    - Only the Steel Pin has one today: **Wide Swing** (`effect` turns on `sweep` and sets `brush`), with the old shop prices (base 35, grow 3.4, max 5).
    - The UI reads the definition (`updateToolPanel`'s `uRow`, and `toolUpgrade()`). Tools without one show the muted "No special upgrade yet" line. Add a tool's upgrade by adding its `unique` entry; the panel needs no new code.
  - **Helpers** (`UPG.auto`) are late game: they need Coral Pearls and cost base 8500 (grow 1.3, max 20), priced so the first helper lands about 80% of the way to the first Fresh Batch in the sim. Helper Speed still needs Helpers.
  - **Chain Reaction no longer exists.** `tests/econ32.test.js` fails if `src/` or `tools/` mention "chain" outside the save migration that refunds it.
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
  - The JSON inside carries `version`. The current version is `SAVE_VERSION = 3` in `src/save.js`. `serialize()` and `loadState()` live in `src/ui.js`.
  - The game saves every 5 s, after purchases, on `visibilitychange` to hidden, and on `pagehide` (iOS Safari does not reliably fire `visibilitychange` when a tab is closed).
- **Versioning rules:**
  - A save without `version` is version 1.
  - `MIGRATIONS[n]` turns a version n save into version n + 1. `migrateSave` runs every step from the save's version up to `SAVE_VERSION`. The v1 → v2 step grants Blue, marks unlocked and seen types as found, and pools them. The v2 → v3 step refunds Chain Reaction into `sparks` and moves Wide Swing: the refund is the sum of chain's v2 prices for each level below the saved one (base 110, grow 2.5, max 8, COST_SCALE 6, frozen in the step), and `lv.sweep` moves to `toolUp[0].u`. Both `lv.chain` and `lv.sweep` are removed. Run juice and lifetime are not changed.
  - To change the format: bump `SAVE_VERSION`, add one migration step, and **never edit a step that has shipped**.
  - A save with a version newer than `SAVE_VERSION` is refused with a toast. If it is the stored save, `saveBlocked` stops autosave from overwriting it. Reset save, an import or a restore clears the block.
  - A version that is not an integer ≥ 1, or a save that is not an object, is refused as invalid.
- **Loading is untrusted input:**
  - `loadState(obj)` returns `'ok'`, `'invalid'` or `'newer'`. On anything but `'ok'` it leaves the state untouched.
  - Numbers must be finite and ≥ 0, otherwise they become 0. Levels clamp to 0..max.
  - Tool upgrades clamp to 0..5, the unique level `u` clamps to that tool's own max (0 for tools without one), unknown tool indexes are dropped, and `equip` must be a tool that is owned (or -1).
  - `autoSell` is on unless the save stores `false`. A new game and Reset save also start with it on. Saves written before 2026-10-18 always stored the field, so existing players keep whatever they had, which was usually off.
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
  - **Unreadable stored save:** at boot, `loadStored()` copies a stored save that is not JSON (or not a loadable save) to `poppit.backup` before the fresh game's first save replaces it, and shows a toast. If `poppit.backup` already holds a good save, the raw text goes to `poppit.unreadable` instead, so a good backup is never pushed out.
  - When the backup cannot be loaded, the Restore row says "Your last save could not be read". Restore then shows the raw text, selected, in the read-only box so the player can copy it, and keeps the backup.

## Commands (Windows PowerShell and macOS alike, no bash needed)

- `npm run build`: runs `node tools/build.js`, which concatenates into `build/all.js` (gitignored), syntax-checks it with `vm.Script`, and writes `index.html`. **This is the gate.**
- `npm test`:
  - `tests/econ32.test.js`: `node:test` unit tests of `ECON` and `fmt`.
  - `tests/page.test.js`: checks that the built `index.html` is a standalone page (doctype, charset, viewport, `[hidden]` rule, head/body structure) and was built from the current `head.html` / `tail.html`. **Run `npm run build` before `npm test`.**
  - `tests/harness32.js`: runs the real concatenated game against stubbed DOM APIs and drives it like a player. It prints PASS/FAIL lines and ends with `ALL PASSED`. It pulls in `tests/pearl_tests.js`.
- `npm run sim`: runs `tools/sim32.js`, the seeded pacing sim. It plays 6 Fresh Batch cycles for a casual and an engaged profile, and the output is identical run to run.
  - `--wait=25`: the player keeps going to minute 25 before pressing Fresh Batch.
  - `--variant=NAME`: plays a tuning option.
  - `--compare`: prints a summary of every variant.
  - `--log`: prints a per-mark pacing log.
  - Variants override levers inside the sim only. The sim's copies of the cost formulas are checked against `src/econ.js` at startup.

## State: real and verified (2026-10-18)

- **Build:** the Node build replaced `build.sh`, and its output is byte-identical to the old build.
- **Tests:** 24 unit tests, 6 page tests and 120 harness checks pass. They cover save codes, versions, the v3 migration, clamping, backup/restore, unreadable saves, `pagehide`, unique upgrades, the Helpers gate and the auto-sell defaults.
- **Unique upgrades, Helpers and auto-sell (2026-10-18), checked in Chrome:**
  - a new game earns juice from pops with an empty backpack;
  - the Tools panel shows Wide Swing on the Steel Pin page and the muted line on the Awl page;
  - one drag across the board popped 6 pearls with the Steel Pin (Wide Swing level 2) and 0 with the Awl.
  - No console errors.
- **Standalone page (2026-10-18):** measured in Chrome with `python -m http.server`, which sends no charset:
  - `compatMode` is CSS1Compat (it was BackCompat) and `characterSet` is UTF-8 (it was windows-1252);
  - the viewport meta is present;
  - every panel is `display: none` until opened and `none` again after closing;
  - the tool label renders "·".
- **Standards-mode layout check:** compared at 1280×800 and 390×844 across the board and every panel. Upgrade cards are 0.6 px taller each (line-height strut), which was left as is. The book arrows were 3 px taller; fixed. Nothing else changed.
- **Save export / import (2026-10-18):** all four paths work in Chrome:
  - copy → clear site data → paste → Load → Confirm brings the progress back;
  - the copy fallback shows the selected code;
  - a truncated code is refused;
  - a stored v99 save is neither loaded nor overwritten by autosave.
  - No console errors.
- **Roster and unlock chain:** 10 pearl types, unlocked in the order Blue, Mint, Golden, Violet, Coral, Marble, Opal, Ruby, Black.
- **Collection and pool:** the collection book, pool toggles with the "next type maxed" lock, and shiny pearls.
- **Tools:** six tools, each with power and speed upgrades. The Steel Pin also has its unique upgrade, Wide Swing.
- **Backpack:** auto-sell is on by default. With it off, pops collect in the backpack to sell by hand.
- **Other systems:** Frenzy, Fresh Batch and the radio (`music/tracks.json`).
- **Number display:** `fmt` was fixed for suffix rollover (`1000K` now shows `1.00M`) and checked in the browser up to `99.9Qa`.
- **Balance:** `docs/balance-report.md` measured the economy **before** Chain Reaction was removed, Wide Swing became Steel Pin only and Helpers became late game. Its numbers are now out of date: the first Fresh Batch moved from 11.1 to 42.9 min (casual) and from 6.3 to 18.6 min (engaged). No tuning option from it has been applied; that choice is Ian's.

## Still open

- **Other tools' unique upgrades:** only the Steel Pin has one. The other five show "No special upgrade yet".
- **Balance:**
  - The first run is now much longer. In the sim the first Fresh Batch is at 42.9 min (casual) and 18.6 min (engaged), up from 11.1 and 6.3. Most of that comes from losing Chain Reaction and from Wide Swing working only with the Steel Pin (28.1 and 14.1 min before Helpers moved). Re-run the balance report before tuning.
  - The sim always holds its best tool, so it uses Wide Swing only until it buys the Awl (about 1.7 min). A real player may switch back to the Steel Pin to sweep; nothing models that.
  - Fresh Batch cycles still shrink when Fresh Batch is taken at once.
  - Flavors explode (x3,000+) when the player waits.
  - The upgrade shelf empties in late runs.
  - See the report's options A, B and C and the open question about Flavor-scaled costs.
- **Offline progress:** not built as a feature. Only a simple away bonus exists (`awayBonus()`: helper idle rate × 50%, capped at 8 h).
- **Save sync between devices:** not built. Moving a save is manual (code or file). Tested only on desktop Chrome so far; iOS Safari `pagehide` and the clipboard on phones are not yet verified on a device.
- **Phone layout:** not built. The viewport meta now makes phones lay the page out at device width instead of 980 px desktop width. This has not been checked on a real phone; the 390 px checks ran in desktop Chrome. At 390 px the board and the shop share the height tightly, and the only phone rule is one `@media (max-width: 820px)` that stacks the panel under the board.
- **Artifacts:** not built. A Flavor shop or other spending that lasts across Fresh Batches would also be the natural fix for the empty late-game shelf.
- **Raw numbers:** the Fresh Batch button and the Flavors line print raw integers (`+6666 Flavors`, `x3238.4`). They fit today, but they don't use `fmt`.
- **Sim limitations** (see the report): no backpack selling, no away bonus, pool never toggled, fixed cell counts per board tier.
