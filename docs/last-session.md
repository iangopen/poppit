Session: achievements (57 in five categories, a capped payout bonus, a tab in the book).

What changed
- src/achievements.js (ACH), new, pure, after econ.js in the build order:
  - 57 achievements in Popping, Collecting, Economy, Fresh Batch and Crafting, from 18 ladders of
    data.
  - Ladders: pops 100 to 10M; taps 500 to 500K; combo 10/30/60; best pop 1M/1B; types found
    3/5/7/10; shiny types 1/5/10; one pop count per pearl type; juice 1M/1B/1T; upgrades at max
    1/10; Fresh Batches 1/10/50; Flavors 10/100/1,000; fastest run under 10/5/3 min; copies 1/25;
    first Rare/Epic/Mythic; ducks 1/10; 3 relics equipped; 25 forge jobs; first dust; first alloy.
  - Per-type counts (about an hour of pops, by the duck-cost method, from the sim): Rose 8,800,
    Blue 1,200, Mint 520, Golden 290, Violet 230, Coral 84, Marble 39, Opal 28, Ruby 17, Black 15.
  - Each has an id, name, one sentence, category, ladder, tier, test, progress { have, need } and
    reward.
  - earned(state) is a pure function of the state and stats, so achievements can be re-derived.
- Reward: +0.5% each, +1% for the hardest tier of each ladder, summed once per id. ACH_CAP = 0.25,
  so the multiplier never goes above x1.25 (the full table adds up to +37.5%).
  - ECON.stats gives achMult; popValue and helperIdle multiply by it next to the artifacts. That
    covers taps, helpers, shinies, frenzy and the away bonus.
- The game (src/ui.js): checkAch once a second and right after a Fresh Batch, a craft and a forge
  job. New ones toast through the existing batching ("Achievement: Popper! Payouts +0.5% from
  achievements"). The chime (Snd.achieve) is three notes, or one soft note with Reduce effects,
  and silent with Sound off.
  - The first achievement also says "Your achievements are in the Collection book".
- Retroactive grant: after boot, import and Restore, what the save already earns is granted
  silently with one toast ("20 achievements from your history: payouts +10.5%. See the Collection
  book."). Saved ids are kept even if the state no longer shows them; repeats and unknown ids are
  dropped.
- Save v11: state.achieved. The v10 -> v11 step adds an empty list. The poppit.v1 key is
  unchanged.
  - Loaded ids are clamped to known ones. Save codes, files, the backup and Restore carry the
    list.
  - Fresh Batch keeps it; Reset save forgets it.
  - stats gained crafts, forged and alloys (a save without them loads 0).
- The Collection book is now a sheet over the board, with Pearls and Achievements tabs and a close
  button. The Achievements tab has:
  - the summary "18 of 57 · payouts +9%" and category chips with counts;
  - per ladder: achieved tiers, then only the next one with a progress bar, then "???".
  - The book button now also shows with the first achievement (derived from state.achieved).
- Payout line: "Payouts x1.722 (Flavors 2 x1.2, artifacts x1.4, achievements x1.025)". With no
  achievements it reads exactly as before.
- Sim: node tools/sim32.js --achievements (report only). The sim does not apply the bonus, so the
  default output is byte-identical to before. Written to docs/achievement-report.md.
- tools/audit.js ach: screenshots of the tab at 390x844 (docs/audit/ach-390-*.png) with widths.

Verification
- npm run build: "built index.html".
- npm test: exit 0. Node test files 36, 10 (new), 19, 9, 21 and 8 pass with 0 fail, then 2 pass.
  The harness prints ALL PASSED (478 PASS lines).
- New tests:
  - tests/achievements.test.js: each ladder's test and progress at its boundaries, the earned set
    from fixture states, the bonus and the cap, and achMult scaling pop values and the idle rate
    exactly.
  - tests/achievement_tests.js (in the game):
    - grant and toast; the soft chime; the multiplier on tap, helper, shiny and frenzy pops and on
      the away bonus (all x1.025); the cap at x1.25;
    - the retroactive grant with one toast and none on a second load; the v10 -> v11 step;
    - save, code, import, backup and Restore; Fresh Batch keeping them; Reset forgetting them;
    - the book reveal; a mid-game save's dock unchanged; an early save gaining only the book; the
      tab.
- npm run sim twice: identical, and identical to the output at the start of the session.
- Sim, Fresh Batch taken at once (bonus not applied):
  - casual: 16 of 57 at the first Fresh Batch (12.8 min), +9.5%; 36 of 57 after 3 hours, +21%
  - engaged: 16 of 57 at the first Fresh Batch (6.0 min), +9%; 42 of 57 after 3 hours, +25% (the
    cap)
  - It cannot count the 11 Crafting achievements: it never crafts, forges or keeps pearls.
  - Its combo never breaks, so all three combo tiers land in run 1. That is overstated.
- 390x844, headless Chrome, a mid-game save, opened with real taps:
  - page 390/390, book 358/358, card 336/336, list 312/312, chips 312/312 (all 44 px tall);
  - no row wider than itself, nothing past the card, no console errors;
  - the Collecting shot shows achieved, next (bar at 6/7) and ??? together; the Pearls tab still
    shows the spread centred.
  - Layout audit at 360, 390 and 430 px: no overlaps. The longer payout line wraps to two lines at
    360.

Choices I made
- 57 entries, not exactly 50, to cover every ladder in the brief. Single-tier ladders (relics,
  forge jobs) give +1%, because their only tier is the hardest.
- The cap is +25%, below the table's +37.5% total. That is the smaller economy change; the summary
  line says "(the most achievements give)" at the cap.
- The bonus is its own factor (achMult) next to artMult, so the payout line can name it and the
  artifacts part stays as it was.
- Crafts, forge jobs and alloys are new stats counters. Copies on hand and forge stock are floors,
  so older saves get credit for what they hold.
- "Upgrades at max" counts levels now, so a past run's maxed upgrades are not re-derived on an old
  save. Once granted, they stay.
- The grant on load runs after syncDiscoveries (boot, import, Restore); loadState only clamps. The
  history toast comes before "Save loaded" in the batched toast.
- The book became a full-board sheet: the tabs collided with the juice counter and the Pool button
  when the book floated over the HUD.
- Payout probes in duck_tests.js and relic_tests.js now divide out achMult, because crafting a
  duck now also earns achievements. They still test the duck alone.

Commits (pushed to main)
- Achievements: module, save v11, grant and toasts, payout multiplier, book tab, tests.
- Sim: --achievements report.
- Audit tool: ach mode and screenshots (and the refreshed layout shots).
- Docs: achievement report, CLAUDE.md, history, last-session.
- CI on main (run 40266249944): build, index.html up to date, tests and the sim twice all green.

Still open
- Tuning: the thresholds, the rewards and the cap are first values. Combo, types found and 10
  upgrades at max all come in run 1, and engaged players hit the cap within 3 hours.
- The pacing sim does not include the bonus (up to +25% payouts), so its cycle times are too long.
- Real-phone check of the book sheet, the tabs, the chips and the list scrolling.
- The Pearls tab now shows two close buttons (the sheet's and the book's own red X).

