Session: the achievement cap is the table total, the sim applies achievements, one book close.

What changed
- src/achievements.js: ACH_CAP is 0.375, the table's total reward, so every achievement keeps
  paying (the last one too). total(list) sums any list's rewards, rounded like bonus().
  - tests/achievements.test.js: the cap equals the total, every achievement adds its full reward,
    and the same check fails for an over-cap fixture (one extra +0.5% entry).
  - The summary line no longer says "(the most achievements give)". With every achievement it
    reads "57 of 57 · payouts +37.5%".
- The book sheet has one close control: the 44 px X in the tab row that both tabs share. The
  spread's own red X (and its CSS) is gone. Escape still closes the book from either tab.
- The tab row is as wide as the card and the spread (min(640px, 100%), centred). On desktop the
  tabs and the close used to sit at the far edges of the board; now they sit over the card.
- tools/sim32.js applies achievements:
  - every run keeps counters (pops in all and per type, shiny types, taps, best combo, best pop,
    types unlocked, upgrades at max, Fresh Batches, fastest run);
  - once a second of play and after each Fresh Batch it grants what they satisfy through the
    module's own tests, so ECON.stats gives the run its achMult;
  - it skips the 11 Crafting achievements and the combo tiers above the first: 44 of 57 count;
  - the report header says "achievements applied", each profile prints the achievements per
    cycle, and "payout x after" includes them;
  - --no-ach (any mode) or a variant's noAch lever plays without them.
- docs/balance-report.md: a new top section with before and after side by side (six cycles, both
  profiles, with and without the Pink Duck, and minute 25); the default, Pink Duck and minute-25
  sections are regenerated. The rule C sections stay, marked as the numbers without achievements.
- docs/achievement-report.md regenerated with the bonus applied.
- tools/audit.js ach takes a size: "node tools/audit.js ach 1280 800" runs as a desktop window
  (no touch, mouse clicks). Files are ach-<width>-*.png and ach-<width>.json.

Before and after (minutes per cycle C1..C6; Flavors held after C6)
- No duck, casual: 12.8 / 12.9 / 11.7 / 9.2 / 7.7 / 6.4 -> 11.4 / 11.3 / 6.9 / 7.7 / 7.1 / 6.9;
  Flavors 27 -> 29; payout x after C6 3.7 -> 4.3.
- No duck, engaged: 6.0 / 3.7 / 4.0 / 4.5 / 3.9 / 3.0 -> 4.5 / 4.4 / 3.5 / 3.3 / 3.0 / 3.1;
  Flavors 37 -> 24; payout x after C6 4.7 -> 3.8.
- Pink Duck, casual: 11.0 / 8.6 / 6.5 / 5.5 / 5.5 / 5.1 -> 9.5 / 8.5 / 5.6 / 5.8 / 6.7 / 5.9;
  Flavors 27 -> 21.
- Pink Duck, engaged: 3.6 / 3.3 / 2.7 / 2.9 / 3.1 / 3.0 -> 3.5 / 3.5 / 3.0 / 3.3 / 2.2 / 2.5;
  Flavors 23 -> 24.
- Minute 25: Flavors after six runs 953 -> 1,080 casual and 2,109 -> 2,460 engaged.
- Achievements granted by the end of each cycle: 14 to 20 casual (x1.08 to x1.115), 15 to 19
  engaged (x1.085 to x1.11).
- Reported only, no dial changed:
  - Engaged C3-C6 are under 4 min (3.5, 3.3, 3.0, 3.1); before, C2, C3 (3.997), C5 and C6 were.
  - The engaged first Fresh Batch is ready at 4.5 min (6.0 before), and gains +2 Flavors, not +3:
    the first run no longer ends on a Black pop at 14M.
  - Engaged ends six cycles with fewer Flavors (24 against 37): under rule C, shorter runs earn
    less juice before each gate.

Verification
- npm run build: "built index.html".
- npm test: exit 0. Node test files 36, 11, 19, 9, 21 and 9 pass with 0 fail, then 2 pass. The
  harness prints ALL PASSED (481 PASS lines).
- New tests:
  - the cap equals the table total, and the total-versus-cap check fails for an over-cap fixture;
  - shown by hand too: with one extra tier added to the real table, that test failed ("fail 1");
    with the file restored it passed;
  - tests/page.test.js: exactly one data-close="book" button, the .bkClose in the shared tab row,
    outside both tab panels;
  - harness: Escape closes the book from the Achievements tab and from the Pearls tab, through the
    page's own keydown handler (the harness document now keeps its listeners);
  - with every achievement: "57 of 57 · payouts +37.5%" and achMult 1.375.
- npm run sim twice: identical.
- The --no-ach flag reproduces the outputs before this session byte for byte: default, --duck,
  --wait=25, --ducks, --early, --flavors and --variant=ruleA (all compared with cmp).
- tests/away.test.js still passes with achievements applied (2 of 2).
- Book screenshots at 390x844 and 1280x800, both tabs (docs/audit/ach-390-*, ach-1280-*):
  - 390: page 390/390, book 358/358, card 336/336, list 312/312, chips 312/312 (44 px tall),
    Pearls spread 342x236;
  - 1280: page 1280/1280, book 894/894, card 634/634, list 610/610, chips 610/610 (one row),
    Pearls spread 640x441;
  - no row wider than itself, nothing past the card, no console errors at either size.

Choices I made
- ACH_CAP is a literal (0.375), not computed from the table, so the test can catch a table that
  outgrows it.
- With every achievement the summary reads "57 of 57 · payouts +37.5%" with no note.
- The sim also counts taps, best pop and shiny types, which it can count. Taps are its hits, as
  in the report before.
- The sim grants once a second of play, like the game, and right after each Fresh Batch.
- The per-type pop counts stay as they were, although with the bonus applied the same method now
  suggests lower counts for the rarer types (Violet 190 against 230, Black 12 against 15).
- The cap change and the close-button change are one game commit: they share index.html and
  tests/achievement_tests.js, and splitting them would leave a commit that fails npm test.
- The minute-25 tables were regenerated too, because they are default sim output.
- The default sim now takes about 20-30 s (18 s with --no-ach on this machine). The extra time is
  in the helper-hour checkpoints, whose boards differ.

Still open
- Ladder thresholds and rewards are first values. Every pearl type found and 10 upgrades at max
  still come in run 1. The sim cannot judge the combo tiers above the first or the Crafting ones.
- Engaged later cycles are further under 4 min with achievements; this needs a run-length lever.
- Real-phone check of the book sheet, the tabs, the chips and the list scrolling.
