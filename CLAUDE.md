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
  - **Helpers** (`UPG.auto`) are late game: they need Coral Pearls and cost base 45000 (grow 1.3, max 20), priced so the first helper lands 70–90% of the way to the first Fresh Batch in the sim. Helper Speed still needs Helpers.
  - **Chain Reaction no longer exists.** `tests/econ32.test.js` fails if `src/` or `tools/` mention "chain" outside the save migration that refunds it.
  - the pearl roster: `PEARLS`, with hp, payout and spawn `cap`. **Payouts are derived:** each entry's table value is kept as `baseMult`, and `mult` = `baseMult × PAYOUT_STEEPNESS^rank` rounded to two significant figures (`PAYOUT_STEEPNESS = 1.5`, Rose is rank 0). This gives 1, 7.5, 27, 100, 350, 1,100, 4,000, 14K, 51K and 190K. Change the curve with the constant, not the table;
  - spawn weights (`NEW_BASE`, `typeWeight`);
  - **the global dials**, the only levers the last rebalance moved: `COST_SCALE = 2.5`, Helpers base 45000, `COLLAPSE_MIN_RUN = 5e6`, and `collapseGain = floor(sqrt(run / COLLAPSE_GAIN_DIV))` with `COLLAPSE_GAIN_DIV = 1.25e6` (exactly 2 Flavors at the floor). `collapseReady` is unchanged;
  - frenzy: `stats().frenzyNeed = 200 - 24 × Fuel` (4x the old 50 - 6 × Fuel). Duration 7 s, +1 per tap, +0.25 per helper pop;
  - `idleRate(S, pool, L)` = autoRate × popBase × echoMult × `popEV(pool, L)` (sum of chance × payout over the pool). `awayBonus()` pays 50% of it, capped at 8 h;
  - `stats()` and `popValue()`.
  - It is also `require`d by node tests and the sim, so **every economy number lives here**. The number formatters `fmt` / `fmtV` / `fmtX` sit at the bottom of it, outside the `ECON` export. `fmtX` prints payouts (`7.5`, `4,000`, `14K`, `1.5M`); the shop text, the Collection book and the pool cards use it.
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
  - `--variant=NAME`: plays a tuning option (`scaledFloor`, `moreFlavors`, `moreTuneLevels`).
  - `--compare`: prints a summary of every variant.
  - `--log`: prints a per-mark pacing log.
  - Variants override levers inside the sim only. The sim's copies of the cost formulas are checked against `src/econ.js` at startup.

## State: real and verified (2026-10-21)

- **Build:** the Node build replaced `build.sh`, and its output is byte-identical to the old build.
- **Tests:** 29 unit tests, 6 page tests and 127 harness checks pass. They cover save codes, versions, the v3 migration, clamping, backup/restore, unreadable saves, `pagehide`, unique upgrades, the Helpers gate, the auto-sell defaults, `frenzyNeed`, the derived payout table, `fmtX`, the away bonus against pool chances, and the book and pool payout strings.
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
- **Payouts and frenzy (2026-10-21), checked in headless Chrome** (the Chrome extension was not connected) at 1280×800 and 390×844:
  - the book shows `x190K` / `x950K` on the Black Pearl page;
  - the pool cards show `x… payout`;
  - no payout text in the book (all 10 pages) or on the pool cards overflows (`scrollWidth` ≤ `clientWidth`);
  - the only console messages were the favicon 404 and Chrome's autoplay notice.
- **Balance (2026-10-21):** `docs/balance-report.md` is current. Pacing targets, with sim results (reference seeds):
  - **First Fresh Batch:** target 11–13 min casual, 6–8 min engaged. Sim: **12.8** and **6.2** (before this change: 42.9 and 18.6).
  - **First helper:** target 70–90% of the way to it. Sim: 11.4 min (**89%**) casual, 4.8 min (**77%**) engaged.
  - **Cycles 2–6:** target shorter each time but never under 4 min. Sim: casual 10.8 / 7.7 / 6.6 / 5.9 / 5.8 (met). Engaged 3.5 / 3.1 / 3.1 / 2.1 / 2.4 (**missed**: see below).
  - **No upgrade group maxed in run 1:** met by group (verb / Pearls & Marbles / tune). Per upgrade, 10 of 18 reach max (6 before).

## Still open

- **Other tools' unique upgrades:** only the Steel Pin has one. The other five show "No special upgrade yet".
- **Balance:**
  - **Engaged later cycles drop under 4 min.** At the minimum 2 Flavors per batch (x1.4), engaged C2 is already 3.5 min, and a Flavor-scaled floor does not fix it (`scaledFloor` variant). It needs a lever outside the four global dials: a smaller multiplier per Flavor, or Fresh Batch costs that scale with Flavors.
  - **First-run times are seed-sensitive.** Over seeds 1–8: casual 12.7 min (10.3–14.5), engaged 5.6 min (3.8–6.9). Casual runs about 2.3x engaged at every dial setting tried, wider than the 13 / 6 the bands allow; that comes from tap rate and skill.
  - **Away bonus is large.** One hour away at the end of run 1 pays 67–84M against a 5M floor. `popEV` assumes helpers pop the average pooled pearl, but they only break pearls with hp ≤ 3 × power. Candidate fixes are in the report; none applied.
  - **One type dominates income** (over 60%) in casual C3–C6 and engaged C6 (Opal, Ruby or Marble). Black earns 0%. Spawn weights were not retuned.
  - The sim always holds its best tool, so it uses Wide Swing only until it buys the Awl (about 1.7 min). A real player may switch back to the Steel Pin to sweep; nothing models that.
  - Fresh Batch cycles still shrink when Fresh Batch is taken at once.
  - Flavors still explode when the player waits: x366 casual, x714 engaged after six 25-minute runs.
  - The upgrade shelf empties early: `COST_SCALE` 2.5 maxes most tune upgrades in run 1. The `moreTuneLevels` sim variant halves that at about the same pacing.
- **Offline progress:** not built as a feature. Only a simple away bonus exists (`awayBonus()`: idle rate at the pool's expected payout × 50%, capped at 8 h).
- **Save sync between devices:** not built. Moving a save is manual (code or file). Tested only on desktop Chrome so far; iOS Safari `pagehide` and the clipboard on phones are not yet verified on a device.
- **Phone layout:** not built. The viewport meta now makes phones lay the page out at device width instead of 980 px desktop width. This has not been checked on a real phone; the 390 px checks ran in desktop Chrome. At 390 px the board and the shop share the height tightly, and the only phone rule is one `@media (max-width: 820px)` that stacks the panel under the board.
- **Artifacts:** not built. A Flavor shop or other spending that lasts across Fresh Batches would also be the natural fix for the empty late-game shelf.
- **Raw numbers:** the Fresh Batch button and the Flavors line print raw integers (`+6666 Flavors`, `x3238.4`). They fit today, but they don't use `fmt`.
- **Sim limitations** (see the report): no backpack selling, the away bonus is reported but never taken, pool never toggled, fixed cell counts per board tier, no helper credit to the frenzy meter. The nothing-to-want columns read 0.0 everywhere (before this change too), so they carry no signal.
