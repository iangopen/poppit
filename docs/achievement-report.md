# Achievement report (2026-10-25)

Achievements are in the game (`src/achievements.js`): 57 achievements in five categories, +0.5% payouts each and +1% for the
hardest tier of each ladder, summed into one global payout multiplier that never goes above x1.25 (`ACH_CAP`). Nothing here is
tuned: the thresholds and rewards are first values. This report counts what the seeded pacing sim would have earned.

Run: `node tools/sim32.js --achievements` (about 4 s). The default `npm run sim` output is unchanged: the sim does not apply the
achievement bonus, so every pacing number in `docs/balance-report.md` still holds.

## Summary

- Casual (1.5 taps/s): 16 of 57 at the first Fresh Batch (12.8 min), payouts +9.5%; 36 of 57 after 3 hours (13 Fresh Batches),
  payouts +21%.
- Engaged (2.5 taps/s): 16 of 57 at the first Fresh Batch (6.0 min), payouts +9%; 42 of 57 after 3 hours (16 Fresh Batches),
  payouts +25%, which is the cap.
- The sim cannot count the 11 Crafting achievements (copies crafted, rarest copy, ducks owned, relics equipped, forge jobs, first
  dust and first alloy): it never crafts, forges or keeps pearls. A real player who crafts would have more.
- Counted, but overstated or approximate:
  - Highest combo: the sim's combo never breaks while it taps (best combo 1,582 at the casual first Fresh Batch), so all three
    combo tiers land in run 1. A real player's combo breaks; 60 is probably later than this says.
  - Taps: the sim counts hits, and a Wide Swing drag counts every pearl it hits.
  - Pearl types found: counted once a type is unlocked, as `syncDiscoveries` does. Every type is unlocked in run 1, so the whole
    Pearl types ladder is earned by the first Fresh Batch.
  - Upgrades at max: the most at once in any run. The sim maxes 10 in run 1 (casual), so "Fully Loaded" comes with the first batch.
  - Shiny types: rolled as the game rolls them, so they count, but a few rare-type shinies swing the 3-hour number.
- Early bonus: about +9% at the first Fresh Batch, most of it from Popping and Collecting tiers that the first run passes quickly.
  Thresholds (combo, types found, upgrades at max) look easy against the sim; see "Still open" in CLAUDE.md.

## Per-type pop counts

The "Pearl by pearl" ladder asks for about an hour of each type's normal pops, by the duck-cost method: the geometric mean of the
six duck-report pop rates (casual and engaged at the first helper, the first Fresh Batch and C6; four seeds), times 60 minutes, two
significant figures, at least 5, falling with rarity. The report recomputes them; the table holds the same numbers:

- Rose 8,800, Blue 1,200, Mint 520, Golden 290, Violet 230, Coral 84, Glass Marble 39, Opal 28, Ruby 17, Black 15.

## Full output

```
# Achievements a player would have (seeded; Fresh Batch taken at once; the sim does not apply the bonus)

57 achievements; the sim can count 46 of them. It cannot count the 11 Crafting ones (copies crafted, rarest copy, ducks owned, relics equipped, forge jobs, dusts and alloys): it never crafts, forges or keeps pearls.
Taps are the sim's hits (a Wide Swing drag counts each pearl it hits); "types found" counts a type once it is unlocked, as syncDiscoveries does; shinies are rolled as the game rolls them.

## casual (1.5 taps/s, skill 0.3, seed 1)

- At the first Fresh Batch (12.8 min): 16 of 57, payouts +9.5%
  by category: Popping 7/15, Collecting 5/17, Economy 3/5, Fresh Batch 1/9, Crafting 0/11
  earned: pops1, pops2, taps1, combo1, combo2, combo3, bestpop1, found1, found2, found3, found4, shiny1, life1, maxed1, maxed2, batches1
  counters: pops 1398, taps 1582, best combo 1582, best pop 2.6M, types found 10, shiny types 2, juice 6.0M, upgrades at max (most at once) 10, Fresh Batches 1, Flavors 2, fastest run 12.8 min
  pops by type: pearl 1187/8800, blue 117/1200, mint 49/520, golden 18/290, violet 14/230, coral 7/84, marble 4/39, opal 1/28, ruby 1/17, black 0/15
- At the 3 hours (last Fresh Batch at 150.6 min, 13 taken): 36 of 57, payouts +21%
  by category: Popping 10/15, Collecting 17/17, Economy 4/5, Fresh Batch 5/9, Crafting 0/11
  earned: pops1, pops2, pops3, taps1, taps2, combo1, combo2, combo3, bestpop1, bestpop2, found1, found2, found3, found4, shiny1, shiny2, shiny3, type_pearl, type_blue, type_mint, type_golden, type_violet, type_coral, type_marble, type_opal, type_ruby, type_black, life1, life2, maxed1, maxed2, batches1, batches2, flavors1, flavors2, fastest1
  counters: pops 51761, taps 31079, best combo 7448, best pop 6981M, types found 10, shiny types 10, juice 295482M, upgrades at max (most at once) 17, Fresh Batches 13, Flavors 486, fastest run 6.0 min
  pops by type: pearl 33871/8800, blue 9630/1200, mint 2872/520, golden 2087/290, violet 1163/230, coral 766/84, marble 466/39, opal 292/28, ruby 219/17, black 395/15

## engaged (2.5 taps/s, skill 0.7, seed 2)

- At the first Fresh Batch (6.0 min): 16 of 57, payouts +9%
  by category: Popping 7/15, Collecting 5/17, Economy 2/5, Fresh Batch 2/9, Crafting 0/11
  earned: pops1, pops2, taps1, combo1, combo2, combo3, bestpop1, found1, found2, found3, found4, shiny1, life1, maxed1, batches1, fastest1
  counters: pops 1066, taps 1261, best combo 1261, best pop 10.0M, types found 10, shiny types 3, juice 14.0M, upgrades at max (most at once) 9, Fresh Batches 1, Flavors 3, fastest run 6.0 min
  pops by type: pearl 700/8800, blue 226/1200, mint 71/520, golden 42/290, violet 18/230, coral 2/84, marble 4/39, opal 2/28, ruby 0/17, black 1/15
- At the 3 hours (last Fresh Batch at 172.2 min, 16 taken): 42 of 57, payouts +25% (the cap)
  by category: Popping 12/15, Collecting 17/17, Economy 5/5, Fresh Batch 8/9, Crafting 0/11
  earned: pops1, pops2, pops3, pops4, taps1, taps2, taps3, combo1, combo2, combo3, bestpop1, bestpop2, found1, found2, found3, found4, shiny1, shiny2, shiny3, type_pearl, type_blue, type_mint, type_golden, type_violet, type_coral, type_marble, type_opal, type_ruby, type_black, life1, life2, life3, maxed1, maxed2, batches1, batches2, flavors1, flavors2, flavors3, fastest1, fastest2, fastest3
  counters: pops 103369, taps 74225, best combo 21235, best pop 36401M, types found 10, shiny types 10, juice 6044698M, upgrades at max (most at once) 17, Fresh Batches 16, Flavors 2199, fastest run 3.0 min
  pops by type: pearl 56901/8800, blue 25450/1200, mint 7089/520, golden 5300/290, violet 2886/230, coral 1877/84, marble 1144/39, opal 805/28, ruby 521/17, black 1396/15

## Pops per pearl type: 60 minutes of that type's normal pops (geometric mean of the six duck-report rates, two significant figures, at least 5, falling)

pearl 8800, blue 1200, mint 520, golden 290, violet 230, coral 84, marble 39, opal 28, ruby 17, black 15
```
