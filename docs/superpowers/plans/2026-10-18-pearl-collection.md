# Pearl Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 10 pearl types, a Pool menu with live spawn chances, shiny variants, and a book-style Collection to Poppit.

**Architecture:** One roster table (`ECON.PEARLS`) drives economy, spawning, sprites, backpack, pool and collection. Save moves to version 2 with a v1 migration. UI additions are plain DOM panels in `ui.js`, styled in `head.html`, matching the existing panel pattern.

**Tech Stack:** Single-file HTML game built by concatenating `src32/*.js`; Canvas 2D; node harness (`harness32.js`) + `econ.test.js`; Playwright for visual checks.

**Spec:** `docs/superpowers/specs/2026-10-18-pearl-collection-design.md`

## Working layout
Scratchpad root `S=/tmp/claude-0/-home-claude/dc1e759c-4469-5e8d-86e6-2bde74641a11/scratchpad`. Start by copying `S/src31` to `S/src32`, `S/mk31.sh` to `S/mk32.sh` (change 31 to 32), `S/harness31.js` to `S/harness32.js`, `S/econ.test.js` to `S/econ32.test.js` (point at src32). Build: `bash mk32.sh`. Regression gate every task: `node harness32.js` prints `ALL PASSED`; `node econ32.test.js` passes. Commits go in `S/poppit-repo` (copy src32 and tests in with each commit) with the attribution lines from the session reminder.

## Global Constraints
- Artifacts are NOT in scope.
- Roster (hp / mult): rose 1/1, blue 3/4, mint 4/7, golden 6/12, violet 8/20, coral 11/35, marble 14/60, opal 20/110, ruby 30/200, black 45/400.
- Shiny pays 5x, base chance 0.5%, same hp; shinies are separate collection entries (20 entries).
- Save key stays `poppit.v1`; payload gains `version: 2`. Saves without `version` are v1.
- Empty pool falls back to rose. First discovery auto-adds to pool with a toast.
- Pool and Collection buttons top right beside the settings cog.
- No em or en dashes in the built HTML (mk script greps for them).
- First Fresh Batch must stay between 6 and 11 minutes in `sim10.js`-style pacing.

## Review Focus
- Pool toggled to empty: spawns still happen (rose), percentages show 100% rose.
- Loading a v1 save with unlocked golden/marble: juice, levels, tools, backpack unchanged; types discovered and pooled.
- Loading a corrupt/partial save (missing `pearls`, `pool`, wrong types): game starts, no throw.
- Shiny toggle off mid-run: existing shiny pearls on board stay shiny, no new ones spawn.
- Selling and auto-sell with shiny stacks in the backpack: values use the 5x payout and nothing is lost.

---

### Task 1: Roster table and pool math (pure economy)

**Files:**
- Modify: `src32/econ.js`
- Test: `econ32.test.js`

**Interfaces:**
- Produces: `ECON.PEARLS: Array<{id, name, hp, mult, weight, cap, unlock: string|null}>` in the roster order above; `ECON.KIND` stays as `{[id]: {hp, mult}}` derived from it (all existing callers keep working); `ECON.poolChances(pool: string[], S): {[id]: number}`; `ECON.typeWeight(id, lv): number`; `ECON.isUnlocked(id, lv): boolean`; `ECON.SHINY_MULT = 5`; `ECON.shinyChance(lv): number`.
- Weights/caps: rose weight 100 cap 99; blue 40+30*lv.lucky cap 8; golden 30+12*(lv.golden-1) cap 2; marble 8+6*(lv.marble-1) cap 3; new types start weight 20,14,10,6,4,2 (mint..black) with `+3 * level` of their own unlock upgrade, caps 6,5,4,3,2,1.
- Unlock mapping: blue needs `lucky>=1`, golden `golden>=1`, marble `marble>=1`, mint/violet/coral/opal/ruby/black need new upgrades `mint,violet,coral,opal,ruby,black` (group `marble`, max 5, req previous type unlocked, base costs 400, 1200, 3600, 11000, 33000, 100000, grow 2.4).

- [ ] **Step 1: Write failing tests** in `econ32.test.js`: `chancesSumToOne` (pool of 3 types sums to 1 within 1e-9); `emptyPoolFallsBackToRose` (`poolChances([], S)` is `{rose: 1}`); `lockedTypeExcluded` (pool containing `ruby` with `lv.ruby=0` gives ruby 0); `weightGrowsWithLevel` (`typeWeight('blue', lv)` increases with `lv.lucky`); `shinyChanceBase` (`shinyChance(zeroLevels())` is 0.005, rises with `lv.shiny`); `popValueUsesRoster` (`popValue(S,1,false,'black')/popValue(S,1,false,'rose')` is 400).
- [ ] **Step 2:** `node econ32.test.js`. Expected: FAIL (poolChances not defined).
- [ ] **Step 3:** Implement the roster and functions above in `econ.js`. Rename kind `pearl` to `rose` everywhere in econ; `stats()` drops golden/marble/blueChance (callers move in Tasks 2 and 4). Add upgrades `mint..black` and `shiny` (base 500, grow 2.2, max 10, req any shiny toggle not needed) to `UPG`, put them in `ORDER` after `marble`, `shiny` last. Make `lucky` level 1 the Blue unlock: it stays base 30 but is moved to the first position of `ORDER` after `sweep`, and its description reads "Unlocks blue pearls".
- [ ] **Step 4:** `node econ32.test.js`. Expected: all PASS (update the existing 6 tests for the `rose` rename).
- [ ] **Step 5: Commit** `feat: pearl roster table and pool math`.

### Task 2: State, save v2 and migration

**Files:**
- Modify: `src32/ui.js` (serialize/loadState, state init), `src32/world.js` (state defaults)
- Test: `harness32.js`

**Interfaces:**
- Consumes: `ECON.PEARLS`, `ECON.isUnlocked`.
- Produces: `state.pool: string[]`, `state.shinyOn: boolean`, `state.col: {[id]: {found: boolean, popped: number, sFound: boolean, sPopped: number}}`; inventory keys `id` and `id+':s'`; `serialize()` includes `version: 2, pool, shinyOn, col`; `loadState(d)` handles v1 and v2; `discover(id, shiny): boolean` in `world.js` marks `col` and returns true when newly found (auto-adds non-shiny first discoveries to `pool`, fires toast "New pearl: <name>").

- [ ] **Step 1: Write failing harness tests:** `migrateV1KeepsProgress` (v1 payload with `lv.golden=2, lv.lucky=3, sparks=500, inv.pearl=4, inv.golden=1, seen.blue=true`: after load `state.sparks===500`, `state.inv.rose===4`, `state.inv.golden===1`, `state.pool` contains rose, blue, golden, `state.col.golden.found`); `migrateV1GrantsBlue` (`lv.lucky===0` payload ends with `lv.lucky>=1` and blue pooled); `corruptSaveSafe` (loadState of `{version:2, pool:'x', col:5, shinyOn:'y'}` does not throw and yields pool `['rose']`); `roundTripV2` (serialize then loadState reproduces pool, col, shinyOn); `discoverAutoAdds` (first `discover('mint')` returns true and adds to pool, second returns false, removing from pool then discovering again does not re-add).
- [ ] **Step 2:** `node harness32.js`. Expected: FAIL.
- [ ] **Step 3:** Implement state fields, `discover`, v2 serialize, and loadState (v1 path renames `pearl`->`rose` in inv/invV/seen, derives `found`/`pool` from `ECON.isUnlocked` plus `seen`, forces `lv.lucky>=1`). Sanitize every v2 field by type with defaults. Fresh game: pool `['rose']`, `col.rose.found=true`.
- [ ] **Step 4:** `node harness32.js`. Expected: new tests PASS, `ALL PASSED`.
- [ ] **Step 5: Commit** `feat: save v2 with v1 migration`.

### Task 3: Spawning, popping, sprites and sounds for 10 types

**Files:**
- Modify: `src32/world.js` (`trySpawn`, `spawnAt`, `popPearl`), `src32/render.js` (`buildSprites`), `src32/audio.js` (`HARD_SND`)

**Interfaces:**
- Consumes: `ECON.poolChances`, `ECON.PEARLS[].cap`, `discover`.
- Produces: `trySpawn()` picks a type by `poolChances(state.pool, S)` honoring per-type live caps (falls back to rose when capped); `PALETTE: {[id]: [h,s,l]}` in `render.js` with distinct hues (rose pink, blue, mint 150, golden, violet 270, coral 12 warm, marble glass, opal 190 pale iridescent, ruby 350 deep, black 0 with l 8); `spr.pearl[id]` for all ten; popping calls `discover(kind, shiny)` and increments `state.col[id].popped`.
- Sound: `HARD_SND` maps blue/mint -> thud, golden/violet/coral -> hit92, marble/opal/ruby/black -> hit18 with gains 0.8..1.0 rising by tier.

- [ ] **Step 1: Write failing harness tests:** `spawnRespectsPool` (pool `['rose','mint']` with mint unlocked, 2000 `trySpawn` calls produce only rose and mint, mint share within 5 points of `poolChances`); `capsHonored` (never more than `cap` live of a type); `popCountsAndDiscovers` (popping a mint sets `col.mint.found` and `popped===1`); `allSpritesBuilt` (every id has a sprite canvas).
- [ ] **Step 2:** `node harness32.js`. Expected: FAIL.
- [ ] **Step 3:** Implement. `spawnAt(cell, kind)` takes the color from `PALETTE`. Existing golden/marble/blue behavior (palettes, shatter sounds, particle styles) must be unchanged; new types reuse the burst style of their hp tier.
- [ ] **Step 4:** `node harness32.js` PASS; `bash mk32.sh`; run `python3 snd_test.py $PWD/build32/poppit.html` and confirm hard types trigger metal hits.
- [ ] **Step 5: Commit** `feat: ten pearl types spawn from the pool`.

### Task 4: Backpack, shop and pacing for the roster

**Files:**
- Modify: `src32/ui.js` (`KINDS`, `UPG_INFO` descriptions, sell/auto-sell, zeroInv), `sim10.js` copy as `sim32.js`

**Interfaces:**
- Consumes: `ECON.PEARLS`, `state.inv` keys.
- Produces: `KINDS` built from `ECON.PEARLS` (plus `:s` shiny keys added in Task 5); shop entries and descriptions for `mint..black` ("Unlocks Mint pearls: 7x payout, 4 hits"); `lucky` description updated.

- [ ] **Step 1: Write failing harness tests:** `sellAllCoversRoster` (inventory with 1 of every type sells for the sum of `popValue`s and leaves zero); `shopListsUnlocks` (each of the six new upgrades appears with a name and non-empty description).
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement. Backpack slot grid grows to fit 10 kinds (and 20 once shinies land); keep existing slot behavior.
- [ ] **Step 4:** Run `node harness32.js`, then extend `sim32.js` with the six unlocks purchased in `ORDER` and run it. Expected: first Fresh Batch between 6 and 11 minutes casual; adjust the six base costs in Task 1's table if outside, rerun `econ32.test.js`.
- [ ] **Step 5: Commit** `feat: backpack and shop for ten types, retune pacing`.

### Task 5: Shinies

**Files:**
- Modify: `src32/world.js` (`spawnAt`, `popPearl`), `src32/render.js` (`buildSprites`, sparkle fx), `src32/audio.js`, `src32/ui.js` (KINDS shiny keys)

**Interfaces:**
- Consumes: `ECON.shinyChance`, `ECON.SHINY_MULT`, `state.shinyOn`.
- Produces: pearl field `p.shiny: boolean`; `spr.pearl[id+':s']`; pop of a shiny adds `id+':s'` to inventory with 5x value, increments `col[id].sPopped`, sets `sFound`, toast "Shiny <name>!"; `Snd.shimmer()` plays the library shimmer clip (pick from `src_audio` CC0 set, embed in `samples.js`).

- [ ] **Step 1: Write failing harness tests:** `shinyRollRate` (with `shinyOn`, 20000 spawns at base level give 0.35%-0.65% shiny); `shinyOffNoSpawns` (`shinyOn=false` gives zero shiny spawns); `shinyPaysFive` (shiny pop value is exactly 5x the normal); `shinySeparateCounts` (shiny pop leaves `col[id].popped` unchanged and increments `sPopped`); `shinyBoardPersistsWhenToggledOff` (toggle off does not alter existing shiny pearls).
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement; shiny sprite = same pearl plus a bright rotating sheen and a few star sparkles drawn through the existing tinted `starSpr` cache so the effects budget is unaffected.
- [ ] **Step 4:** `node harness32.js` PASS; `python3 bench.py build32/poppit.html` shows no regression versus build31 (mean render ms within 10%).
- [ ] **Step 5: Commit** `feat: shiny pearls`.

### Task 6: Pool menu

**Files:**
- Modify: `src32/ui.js` (new `buildPoolPanel()`), `src32/head.html` (panel CSS, two top-right buttons)

**Interfaces:**
- Consumes: `ECON.poolChances`, `state.pool`, `state.shinyOn`, `ECON.shinyChance`.
- Produces: `#poolBtn` and `#colBtn` beside the cog; Pool panel listing discovered types (name, sprite thumbnail, add/remove switch, live chance %); Shiny toggle row with current shiny chance; undiscovered types hidden. The last type cannot be removed from an otherwise empty pool: removing it re-adds rose (rose can be removed only when another type is in the pool). Uses `Snd.click`.

- [ ] **Step 1: Write failing harness tests:** `poolToggleUpdatesChances` (calling the panel's toggle handler for mint changes the rendered percent text and the sum of shown percents is 100); `poolNeverEmpty` (removing every type leaves rose in `state.pool`); `shinyToggleFlipsState`.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement following the existing tool/shop panel markup and open/close behavior.
- [ ] **Step 4:** `node harness32.js` PASS; take a Playwright screenshot of the open panel with 4 types discovered and view it.
- [ ] **Step 5: Commit** `feat: pool menu`.

### Task 7: Collection book

**Files:**
- Modify: `src32/ui.js` (new `buildBook()`), `src32/head.html` (book CSS: cover, open animation, page turn)

**Interfaces:**
- Consumes: `state.col`, `ECON.PEARLS`, `spr.pearl`.
- Produces: Collection opens as a book (cover closes/opens with a CSS 3D flip); one spread per type in roster order: left page normal entry, right page shiny entry, each showing sprite, name, hp, payout, popped count; undiscovered entries drawn as black silhouette (sprite filtered to black) with "???" and no stats; prev/next buttons and arrow keys; header shows `found/20`. Uses `Snd.click` on turns.

- [ ] **Step 1: Write failing harness tests:** `bookHidesUndiscovered` (fresh state: spread for `ruby` has no stats text and "???" shown; rose spread shows stats); `bookCountsEntries` (header `found/20` counts normal and shiny separately); `bookRevealsOnDiscover` (after `discover('ruby')` the ruby page shows its name).
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement as DOM (not canvas) so text stays crisp; sprites copied to small canvases.
- [ ] **Step 4:** `node harness32.js` PASS; Playwright screenshots of closed book, an opened spread with a blacked-out page, and a mixed spread; view them.
- [ ] **Step 5: Commit** `feat: collection book`.

### Task 8: Integration check and publish

**Files:**
- Modify: `build32/poppit.html` (built output), publish via Artifact to url NzkKkRs5KhYv3YHfMQrPT9

- [ ] **Step 1:** `bash mk32.sh`; confirm no em or en dashes (script prints 0).
- [ ] **Step 2:** Run `node harness32.js`, `node econ32.test.js`, `python3 snd_test.py`, `python3 bench.py`. Expected: all pass, no console errors.
- [ ] **Step 3:** Load a real v1 save fixture (copy of `poppit.v1` localStorage JSON from an earlier harness) in Playwright; confirm juice/levels unchanged, Pool shows rose, blue, and any previously unlocked types.
- [ ] **Step 4:** Publish to the same URL; commit `chore: publish build32`.
