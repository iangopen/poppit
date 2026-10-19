# Poppit

Single-file browser idle/clicker game: pop pearls for juice, buy upgrades, Fresh Batch (prestige) for Flavors. Hosted on GitHub Pages straight from `index.html` on `main`.

## Architecture contract

- **`index.html` is a build output.** Never edit it by hand; edit `src/` and rebuild. It is committed because Pages serves it.
- **Concat order (fixed):**
  - `src/head.html`
  - then `src/econ.js`, `samples.js`, `audio.js`, `music.js`, `world.js`, `render.js`, `ui.js`
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
- **`src/world.js`** holds state, board, spawning (`trySpawn` enforces the per-type cap) and effects.
- **`src/render.js`** draws the canvas.
- **`src/ui.js`** holds the shop, panels, input, save/load, Fresh Batch and the main loop.
- **Fresh Batch:**
  - Code: the `collapseBtn` handler, `finishCollapse()` and `resetRun()` in `src/ui.js`.
  - **Wipes:** juice, run juice, all upgrade levels, tools and tool upgrades, the backpack and the board.
  - **Keeps:** Flavors (`echoes`), `collapses`, `lifetime`, discoveries (`col`), the pool and settings.
- **Save:**
  - `localStorage` key `poppit.v1`. The current format is `version: 2` (see `serialize()` / `loadState()` in `src/ui.js`).
  - The game saves every 5 s and after purchases.
  - `loadState` migrates v1 saves: a v1 save gets Blue (lucky ≥ 1) and its seen types as discoveries.

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
- **Tests:** 22 unit tests and 83 harness checks pass.
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
- **Save export / import:** not built.
- **Phone layout:** not built or verified. There is only one `@media (max-width: 820px)` rule that stacks the panel under the board.
- **Artifacts:** not built. A Flavor shop or other spending that lasts across Fresh Batches would also be the natural fix for the empty late-game shelf.
- **Raw numbers:** the Fresh Batch button and the Flavors line print raw integers (`+6666 Flavors`, `x3238.4`). They fit today, but they don't use `fmt`.
- **Sim limitations** (see the report): no backpack selling, no away bonus, pool never toggled, fixed cell counts per board tier.
