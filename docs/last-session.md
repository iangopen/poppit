Session: Hall of Ducks (ten ducks, type-scoped payouts) and relic equip slots

What changed
- Nine type ducks as data in src/artifacts.js (TYPE_DUCKS): Blue, Mint, Golden, Violet,
  Coral, Marble, Opal, Ruby, Black. Each is x1.4 on pops of its own type only, crafted
  from kept normal pearls of that type, repeatFactor 0.25. The Pink Duck is unchanged.
- Scope rule: activeBonuses(arts, equipped) returns payout (global) and typePay (per type).
  stats() exposes typeMult; popValue and helperIdle multiply each type by it, so taps,
  helpers, shinies, frenzy and the away bonus follow. A type duck's payout perk stays on
  its type; its other perks are global. Helper targeting ignores ducks.
- Equip slots: EQUIP_SLOTS = 5 and state.artEquip (saved). Relics work only when equipped;
  ducks need no slot. ARTS.equip / unequip / swap / equippedFromSave, and game hooks
  equipArt / unequipArt / swapArt. A crafted relic equips itself if a slot is free.
- Save v8: the v7 -> v8 step equips every owned relic in hall order, up to 5. Loads clamp
  the list (unique, known, owned, relic-only, at most 5). Fresh Batch keeps it; Reset
  forgets it; serialize carries it through codes, files, import, backup and Restore.
- Forge stash warning works for every pearl type and names the cheapest next craft, e.g.
  "Uses 70 of your 1,650 kept Blue Pearls (the Blue Duck needs 1,600)". Never blocks.
- Artifacts panel: ten duck cards with the existing cost text, duck icons recoloured per
  pearl, scoped wording ("Mint Pearl payouts +10%"), relic cards show their slot.
- Sim: new --ducks report and allDucks variant. Default output unchanged.

Duck costs (first craft; untuned; full table in docs/duck-report.md)
- Rule: geometric mean of six normal-pop rates x 120 min, 2 sig figs, min 5, falling.
  Rates: casual and engaged at first helper, first Fresh Batch and C6, 300 s windows,
  mean of 4 seeds. The sim cannot keep pearls: these are estimates from pop rates.
- Collection minutes, casual (helper / first FB / C6), then engaged:
  - Blue 1,600: casual 222 / 327 / 325, engaged 50 / 42 / 57
  - Mint 760: casual 181 / 188 / 233, engaged 80 / 71 / 64
  - Golden 410: casual 216 / 228 / 236, engaged 71 / 54 / 73
  - Violet 300: casual 162 / 107 / 223, engaged 95 / 81 / 96
  - Coral 120: casual 171 / 104 / 147, engaged 204 / 126 / 51
  - Marble 36: casual 180 / 65 / 139, engaged 172 / 60 / 167
  - Opal 22: casual 147 / 88 / 220, engaged - / 88 / 102
  - Ruby 12: casual - / 80 / 76, engaged - / 240 / 126
  - Black 10: casual - / 100 / 200, engaged - / 100 / 92
  - "-" means not yet unlocked at that point. Profiles differ up to 10x, so Blue is
    3.7-5.5 h casual but under 1 h engaged.

Do type ducks stack too hard? (cycle minutes C1..C6, Fresh Batch taken at once)
- casual, no ducks:       12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4
- casual, Pink Duck only: 11.0 / 8.6 / 6.2 / 5.0 / 4.1 / 4.6
- casual, all ten ducks:   7.1 / 5.6 / 6.4 / 4.3 / 4.4 / 3.3
- engaged, no ducks:       6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3
- engaged, Pink Duck only: 3.6 / 3.3 / 2.6 / 2.1 / 2.4 / 1.8
- engaged, all ten ducks:  2.9 / 2.6 / 2.1 / 2.3 / 1.6 / 1.6
- Reading: all ten cut casual run 1 from 12.8 to 7.1 min, far more than the Pink Duck.

Verification
- npm run build: built index.html. npm test: every node:test file 0 failures (32, 19, 9
  new duck tests, 21, 8, 2) and the harness ends ALL PASSED.
- Harness run (duck run: lines):
  - Blue Pearls kept 1,700 -> 100 after crafting a Blue Duck (common, no perks)
  - Blue pop pays 15.30 -> 21.42 (x1.400); Rose pop pays 2.04 -> 2.04 (unchanged)
  - Blue helper pop 15.00 -> 21.00, shiny Blue 76.50 -> 107.10, away 1 h 6254 -> 7336
  - Six relics crafted: equipped rose_lantern, blue_compass, mint_clock, fx_relic1,
    fx_relic2; Test Relic 3 equipped: false
  - (relics 4-6 are test-only fixtures: only three real relics exist)
- npm run sim twice: identical. Default output byte-identical to the run saved before any
  change this session; --duck also identical.
- Browser: desktop Chrome, game in a 390 x 844 iframe (the window would not resize): ten
  duck cards, scrollWidth 390, no element past the right edge, no console errors.

Choices I made
- --ducks is a separate flag so the default sim output stays unchanged.
- Rates use 300 s windows and 4 seeds; one 60 s window gave 0-1 pops for rare types.
- Geometric mean across both profiles, since they differ up to 10x.
- Equipped list is state.artEquip (state.equip is already the tool).
- A craft equips its relic whenever a slot is free, not only the first copy.
- No list passed to activeBonuses means nothing equipped (tests updated to equip).
- Migration order is the Hall of Relics order, frozen in the step.
- The juice counter's payout line still shows global payout only.
- Marble Duck is named for Glass Marble; Black Duck icon lightened to read.

Still open
- Gallery UI: swipe, arrows, labeled pedestals, and the equip row (nothing calls the
  equip hooks yet; with three relics the slots never fill).
- Real-phone check of the panel and ten-card list.
- Tuning: duck costs, and how hard ten ducks stack.
