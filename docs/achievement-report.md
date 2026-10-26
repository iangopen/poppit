# Achievement report (2026-10-26)

Achievements are in the game (`src/achievements.js`): 57 achievements in five categories, +0.5% payouts each and +1% for the
hardest tier of each ladder, summed into one global payout multiplier. Since 2026-10-26 the cap (`ACH_CAP`) is the table's
total, +37.5%, so every achievement keeps paying; `tests/achievements.test.js` fails if the total ever passes the cap. Nothing
here is tuned: the thresholds and rewards are first values.

Run: `node tools/sim32.js --achievements` (add `--no-ach` for the runs without the bonus). Since 2026-10-26 every sim run
applies the bonus as it earns achievements (see `docs/balance-report.md`), so this report plays the same runs as `npm run sim`.

## Summary

- The sim counts 44 of the 57. It cannot count the 11 Crafting achievements (copies crafted, rarest copy, ducks owned, relics
  equipped, forge jobs, first dust and first alloy): it never crafts, forges or keeps pearls. It skips the combo tiers above the
  first, because its combo never breaks while it taps.
- With the bonus applied (the default):
  - casual: 14 of 57 at the first Fresh Batch (11.4 min), payouts +8%; 34 of 57 after 3 hours (14 Fresh Batches), +19.5%.
  - engaged: 15 of 57 at the first Fresh Batch (4.5 min), payouts +8.5%; 39 of 57 after 3 hours (17 Fresh Batches), +23.5%.
- Without it (`--no-ach`, the runs before 2026-10-26, counted the same way):
  - casual: 14 at the first Fresh Batch (12.8 min), +8%; 34 after 3 hours, +19.5%.
  - engaged: 14 at the first Fresh Batch (6.0 min), +7.5%; 40 after 3 hours, +24%.
- No sim profile reaches the cap within 3 hours: the most is +24%, against +37.5% for the whole table.
- Counted, but approximate:
  - Taps: the sim counts hits, and a Wide Swing drag counts every pearl it hits (the game counts one press).
  - Pearl types found: counted once a type is unlocked, as `syncDiscoveries` does. Every type is unlocked in run 1.
  - Upgrades at max: the most at once in any run; 10 come in run 1 for casual.
  - Shiny types: rolled as the game rolls them; a few rare-type shinies swing the 3-hour number.

## Per-type pop counts

The "Pearl by pearl" ladder asks for about an hour of each type's normal pops, by the duck-cost method: the geometric mean of the
six duck-report pop rates (casual and engaged at the first helper, the first Fresh Batch and C6; four seeds), times 60 minutes, two
significant figures, at least 5, falling with rarity. The table holds the values measured without the bonus (2026-10-25):

- Rose 8,800, Blue 1,200, Mint 520, Golden 290, Violet 230, Coral 84, Glass Marble 39, Opal 28, Ruby 17, Black 15.

With the bonus applied the same method suggests Golden 270, Violet 190, Coral 100, Marble 32, Opal 27, Ruby 13 and Black 12 (the
last line of the output below): shorter runs move the checkpoints. The table was not changed; these remain first values.

## Full output (bonus applied)

```
# Achievements a player would have (seeded; Fresh Batch taken at once; the bonus applied as they come)

57 achievements; the sim counts 44 of them. It skips combo tiers above the first (its combo never breaks while it taps) and cannot count the 11 Crafting ones (copies crafted, rarest copy, ducks owned, relics equipped, forge jobs, dusts and alloys): it never crafts, forges or keeps pearls.
Taps are the sim's hits (a Wide Swing drag counts each pearl it hits); "types found" counts a type once it is unlocked, as syncDiscoveries does; shinies are rolled as the game rolls them.

## casual (1.5 taps/s, skill 0.3, seed 1)

- At the first Fresh Batch (11.4 min): 14 of 57, payouts +8%
  by category: Popping 5/15, Collecting 5/17, Economy 3/5, Fresh Batch 1/9, Crafting 0/11
  earned: pops1, pops2, taps1, combo1, bestpop1, found1, found2, found3, found4, shiny1, life1, maxed1, maxed2, batches1
  counters: pops 1219, taps 1393, best combo 1393, best pop 2.6M, types found 10, shiny types 3, juice 5.2M, upgrades at max (most at once) 10, Fresh Batches 1, Flavors 2, fastest run 11.4 min
  pops by type: pearl 1046/8800, blue 97/1200, mint 41/520, golden 16/290, violet 8/230, coral 6/84, marble 2/39, opal 2/28, ruby 1/17, black 0/15
- At the 3 hours (last Fresh Batch at 159.9 min, 14 taken): 34 of 57, payouts +19.5%
  by category: Popping 8/15, Collecting 17/17, Economy 4/5, Fresh Batch 5/9, Crafting 0/11
  earned: pops1, pops2, pops3, taps1, taps2, combo1, bestpop1, bestpop2, found1, found2, found3, found4, shiny1, shiny2, shiny3, type_pearl, type_blue, type_mint, type_golden, type_violet, type_coral, type_marble, type_opal, type_ruby, type_black, life1, life2, maxed1, maxed2, batches1, batches2, flavors1, flavors2, fastest1
  counters: pops 61290, taps 35587, best combo 8875, best pop 12654M, types found 10, shiny types 10, juice 725204M, upgrades at max (most at once) 17, Fresh Batches 14, Flavors 761, fastest run 6.0 min
  pops by type: pearl 39042/8800, blue 12033/1200, mint 3593/520, golden 2577/290, violet 1378/230, coral 898/84, marble 612/39, opal 375/28, ruby 260/17, black 522/15

## engaged (2.5 taps/s, skill 0.7, seed 2)

- At the first Fresh Batch (4.5 min): 15 of 57, payouts +8.5%
  by category: Popping 4/15, Collecting 5/17, Economy 3/5, Fresh Batch 3/9, Crafting 0/11
  earned: pops1, taps1, combo1, bestpop1, found1, found2, found3, found4, shiny1, life1, maxed1, maxed2, batches1, fastest1, fastest2
  counters: pops 765, taps 929, best combo 929, best pop 2.7M, types found 10, shiny types 2, juice 5.8M, upgrades at max (most at once) 10, Fresh Batches 1, Flavors 2, fastest run 4.5 min
  pops by type: pearl 519/8800, blue 133/1200, mint 62/520, golden 26/290, violet 15/230, coral 5/84, marble 2/39, opal 2/28, ruby 1/17, black 0/15
- At the 3 hours (last Fresh Batch at 144.4 min, 17 taken): 39 of 57, payouts +23.5%
  by category: Popping 9/15, Collecting 17/17, Economy 5/5, Fresh Batch 8/9, Crafting 0/11
  earned: pops1, pops2, pops3, taps1, taps2, taps3, combo1, bestpop1, bestpop2, found1, found2, found3, found4, shiny1, shiny2, shiny3, type_pearl, type_blue, type_mint, type_golden, type_violet, type_coral, type_marble, type_opal, type_ruby, type_black, life1, life2, life3, maxed1, maxed2, batches1, batches2, flavors1, flavors2, flavors3, fastest1, fastest2, fastest3
  counters: pops 83857, taps 60800, best combo 16156, best pop 42577M, types found 10, shiny types 10, juice 5613297M, upgrades at max (most at once) 17, Fresh Batches 17, Flavors 2119, fastest run 2.6 min
  pops by type: pearl 46552/8800, blue 20561/1200, mint 5787/520, golden 4189/290, violet 2217/230, coral 1463/84, marble 884/39, opal 649/28, ruby 433/17, black 1122/15

## Pops per pearl type: 60 minutes of that type's normal pops (geometric mean of the six duck-report rates, two significant figures, at least 5, falling)

pearl 8800, blue 1200, mint 520, golden 270 (data 290), violet 190 (data 230), coral 100 (data 84), marble 32 (data 39), opal 27 (data 28), ruby 13 (data 17), black 12 (data 15)
```
