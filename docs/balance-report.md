# Poppit balance report: the sim applies achievements

Date: 2026-10-26. Numbers come from `tools/sim32.js` on the economy in `src/econ.js` at this commit (`npm run sim`, seeded, identical run to run). Since this session the sim applies the achievement bonus: every run counts what it can (pops in all and per type, taps, best combo, best pop, pearl types and shiny types found, juice, upgrades at max, Fresh Batches, Flavors, fastest run), grants once a second of play what those counters satisfy through `src/achievements.js`'s own tests, and multiplies payouts by the resulting `achMult` (`ECON.stats`). It skips the 11 Crafting achievements (the sim never crafts, forges or keeps pearls) and the combo tiers above the first (its combo never breaks while it taps), so it counts 44 of the 57. `--no-ach` plays without them and reproduces the output before this session byte for byte (default, `--duck`, `--wait=25`, `--ducks`, `--early` and `--flavors` checked). The achievement cap is now the table's total (+37.5%), so every achievement keeps paying.

No other number changed. The rule C report (2026-10-24) follows below; its tables are the numbers without achievements (`--no-ach`).

## Six cycles, before and after (reference seeds, Fresh Batch taken as soon as it is ready)

"Before" is `--no-ach` (the output until this session); "after" is the default now. Payout x after each cycle counts Flavors, the global duck and, after, the achievements.

| run | profile | minutes C1..C6, before | minutes C1..C6, after | Flavors after each, before | Flavors after each, after | payout x after each, before | payout x after each, after |
|---|---|---|---|---|---|---|---|
| no duck | casual | 12.8 / 12.9 / 11.7 / 9.2 / 7.7 / 6.4 | 11.4 / 11.3 / 6.9 / 7.7 / 7.1 / 6.9 | 2 / 4 / 6 / 12 / 18 / 27 | 2 / 5 / 8 / 12 / 19 / 29 | 1.2 / 1.4 / 1.6 / 2.2 / 2.8 / 3.7 | 1.3 / 1.6 / 2.0 / 2.4 / 3.2 / 4.3 |
| no duck | engaged | 6.0 / 3.7 / 4.0 / 4.5 / 3.9 / 3.0 | 4.5 / 4.4 / 3.5 / 3.3 / 3.0 / 3.1 | 3 / 5 / 9 / 14 / 21 / 37 | 2 / 4 / 6 / 10 / 15 / 24 | 1.3 / 1.5 / 1.9 / 2.4 / 3.1 / 4.7 | 1.3 / 1.5 / 1.7 / 2.2 / 2.8 / 3.8 |
| Pink Duck | casual | 11.0 / 8.6 / 6.5 / 5.5 / 5.5 / 5.1 | 9.5 / 8.5 / 5.6 / 5.8 / 6.7 / 5.9 | 3 / 5 / 8 / 12 / 18 / 27 | 2 / 4 / 6 / 9 / 14 / 21 | 1.8 / 2.1 / 2.5 / 3.1 / 3.9 / 5.2 | 1.8 / 2.1 / 2.4 / 2.9 / 3.7 / 4.8 |
| Pink Duck | engaged | 3.6 / 3.3 / 2.7 / 2.9 / 3.1 / 3.0 | 3.5 / 3.5 / 3.0 / 3.3 / 2.2 / 2.5 | 2 / 4 / 6 / 10 / 15 / 23 | 2 / 4 / 6 / 10 / 16 / 24 | 1.7 / 2.0 / 2.2 / 2.8 / 3.5 / 4.6 | 1.8 / 2.1 / 2.5 / 3.1 / 4.0 / 5.3 |

Achievements granted by the end of each cycle (achievement multiplier):

- no duck, casual: 14 (x1.08) / 14 (x1.08) / 16 (x1.09) / 17 (x1.095) / 18 (x1.1) / 20 (x1.115)
- no duck, engaged: 15 (x1.085) / 16 (x1.09) / 16 (x1.09) / 17 (x1.095) / 19 (x1.11) / 19 (x1.11)
- Pink Duck, casual: 15 (x1.085) / 15 (x1.085) / 16 (x1.09) / 16 (x1.09) / 17 (x1.095) / 18 (x1.1)
- Pink Duck, engaged: 13 (x1.065) / 15 (x1.08) / 17 (x1.1) / 19 (x1.11) / 19 (x1.11) / 19 (x1.11)

- **The first Fresh Batch comes sooner:** casual 12.8 -> 11.4 min (still inside the 10-15 band); engaged 6.0 -> 4.5 min. By the first Fresh Batch the sim has about 13-15 achievements (x1.065-1.085), most of them from Popping and Collecting tiers that the first run passes quickly. Engaged's first run no longer ends on a Black pop at 14M run juice, so it gains +2 Flavors, not +3.
- **Cycles are shorter, and engaged dips further under 4 minutes.** Engaged C2-C6 under 4 min: 4 of 5 before (3.7, 3.997 printed as 4.0, 3.9, 3.0), 4 of 5 after, and deeper (4.4 / 3.5 / 3.3 / 3.0 / 3.1). Reported only; no dial was changed for it.
- **Fewer Flavors for engaged, about the same for casual.** Six cycles end at 29 Flavors casual (27 before) and 24 engaged (37 before): under rule C the Flavors come from all juice so far, and shorter runs earn less juice before each Fresh Batch is ready. The payout multiplier after C6 is x4.3 casual (x3.7) and x3.8 engaged (x4.7).
- **With the Pink Duck** engaged C2-C6 under 4 min: 5 of 5 before and 5 of 5 after; the shortest is 2.2 min (2.7 before). Casual's shortest is 5.6 min (5.1 before).
- **Not monotone:** some later cycles are longer than before (casual C6 6.4 -> 6.9, Pink Duck casual C4-C6). A faster run reaches the 5M floor and the Flavor gate with less juice behind it, so the next gate (half the Flavors held) can take longer; the seeded runs also take different random paths once anything changes.

## Waiting to minute 25, before and after (`--wait=25`)

| profile | minutes C1..C6, before | after | Flavors after each, before | after | payout x after C6, before / after |
|---|---|---|---|---|---|
| casual | 25.0 / 25.0 / 25.0 / 25.0 / 29.4 / 44.0 | 25.0 / 25.0 / 25.0 / 25.0 / 27.1 / 43.2 | 40 / 133 / 263 / 423 / 635 / 953 | 41 / 149 / 299 / 478 / 718 / 1080 | x96.3 / x131.3 |
| engaged | 25.0 / 25.0 / 25.0 / 25.0 / 28.7 / 44.1 | 25.0 / 25.0 / 25.0 / 25.0 / 26.7 / 40.3 | 74 / 275 / 571 / 937 / 1406 / 2109 | 81 / 309 / 663 / 1093 / 1640 / 2460 | x211.9 / x300.1 |

- Waiting earns more with achievements (1080 and 2460 Flavors after six runs, against 953 and 2109): the bonus raises the juice, and rule C pays for all of it. From C5 the gate is still not met by minute 25.

# The rule C report (2026-10-24), without achievements

The sections below are from 2026-10-24, before the sim applied achievements (`--no-ach` reproduces them), except the three sim-output sections at the end, which are regenerated with achievements applied.

## What changed

One system, no balance dial. Payouts, costs, upgrades, `FLAVOR_BONUS` (10% per Flavor) and the 5M floor did not move. One model fix came with it: the away bonus's frenzy share (below).

| | rule A (until 2026-10-24) | rule C (now) |
|---|---|---|
| Flavors from | this run's juice | all juice so far (`flavorJuice`, saved) |
| gain | `floor(sqrt(run / 1.25M))` | `floor(sqrt(flavorJuice / 1.25M))` minus the Flavors held |
| ready | run juice at least 5M and a gain of at least 2 | run juice at least 5M and a gain of at least max(2, ceil(0.5 × Flavors held)) |
| constants | `COLLAPSE_GAIN_DIV` 1.25M | `COLLAPSE_GAIN_DIV` 1.25M, `FLAVOR_NEED` 0.5, `FLAVOR_MIN_GAIN` 2 |

Why and how it was chosen: `docs/flavor-study.md`.

## Six cycles, Fresh Batch taken as soon as it is ready (reference seeds)

Minutes per cycle (taken), Flavors gained, Flavors held after each cycle, payout multiplier after each cycle (Flavors and the global duck).

| run | profile | minutes C1..C6 | gained | Flavors after each | payout x after each |
|---|---|---|---|---|---|
| rule C, no duck | casual | 12.8 / 12.9 / 11.7 / 9.2 / 7.7 / 6.4 | +2 +2 +2 +6 +6 +9 | 2 / 4 / 6 / 12 / 18 / 27 | 1.2 / 1.4 / 1.6 / 2.2 / 2.8 / 3.7 |
| rule C, no duck | engaged | 6.0 / 3.7 / 4.0 / 4.5 / 3.9 / 3.0 | +3 +2 +4 +5 +7 +16 | 3 / 5 / 9 / 14 / 21 / 37 | 1.3 / 1.5 / 1.9 / 2.4 / 3.1 / 4.7 |
| rule C, Pink Duck | casual | 11.0 / 8.6 / 6.5 / 5.5 / 5.5 / 5.1 | +3 +2 +3 +4 +6 +9 | 3 / 5 / 8 / 12 / 18 / 27 | 1.8 / 2.1 / 2.5 / 3.1 / 3.9 / 5.2 |
| rule C, Pink Duck | engaged | 3.6 / 3.3 / 2.7 / 2.9 / 3.1 / 3.0 | +2 +2 +2 +4 +5 +8 | 2 / 4 / 6 / 10 / 15 / 23 | 1.7 / 2.0 / 2.2 / 2.8 / 3.5 / 4.6 |
| rule A, no duck | casual | 12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4 | +2 +3 +3 +5 +2 +4 | 2 / 5 / 8 / 13 / 15 / 19 | 1.2 / 1.5 / 1.8 / 2.3 / 2.5 / 2.9 |
| rule A, no duck | engaged | 6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3 | +3 +3 +5 +4 +2 +2 | 3 / 6 / 11 / 15 / 17 / 19 | 1.3 / 1.6 / 2.1 / 2.5 / 2.7 / 2.9 |
| rule A, Pink Duck | casual | 11.0 / 8.6 / 6.2 / 5.0 / 4.1 / 4.6 | +3 +3 +4 +4 +2 +3 | 3 / 6 / 10 / 14 / 16 / 19 | 1.8 / 2.2 / 2.8 / 3.4 / 3.6 / 4.1 |
| rule A, Pink Duck | engaged | 3.6 / 3.3 / 2.6 / 2.1 / 2.4 / 1.8 | +2 +3 +4 +2 +5 +5 | 2 / 5 / 9 / 11 / 16 / 21 | 1.7 / 2.1 / 2.7 / 2.9 / 3.6 / 4.3 |

The Pink Duck is a plain Common copy (x1.4) owned from minute 0 (`--duck`).

- **The first Fresh Batch is unchanged:** ready at 12.8 min casual (6.0M run juice, +2 Flavors) and 6.0 min engaged. Engaged gains +3, as under rule A: its first run ends with a Black pop that takes run juice to 14.0M, and sqrt(14.0M / 1.25M) floors to 3.
- **Later cycles are longer and steadier.** Casual C3-C6 are 1.5, 0.6, 1.1 and 1.0 min longer than under rule A. Engaged C3-C6 are 0.6, 1.5, 1.7 and 0.7 min longer.
- **More Flavors after six cycles:** 27 casual and 37 engaged (x3.7 and x4.7), against 19 and 19 (x2.9) under rule A. Short runs now add up instead of being thrown away.
- **Engaged still dips under 4 min:** C2 3.7, C3 3.997 (prints 4.0), C5 3.9 and C6 3.0, so 4 of 5 later cycles, against 5 of 5 under rule A. Rule C was never meant to fix this; that needs a run-length lever.
- **Each cycle shorter than the one before:** casual C2 is 0.1 min longer than C1 (as before); engaged C3 and C4 are longer than C2 (3.7, 4.0, 4.5).
- **With the Pink Duck** every engaged cycle is under 4 min (2.7 to 3.6), as under rule A, and casual's shortest is 5.1 (4.1 under rule A).

## Waiting to minute 25 (`--wait=25`)

| rule | profile | minutes C1..C6 | Flavors after each | payout x after C6 |
|---|---|---|---|---|
| C | casual | 25.0 / 25.0 / 25.0 / 25.0 / 29.4 / 44.0 | 40 / 133 / 263 / 423 / 635 / 953 | x96.3 |
| C | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 28.7 / 44.1 | 74 / 275 / 571 / 937 / 1406 / 2109 | x211.9 |
| A | casual | 25.0 x 6 | 40 / 167 / 426 / 863 / 1462 / 2238 | x224.8 |
| A | engaged | 25.0 x 6 | 74 / 338 / 903 / 1828 / 3137 / 4871 | x488.1 |

- Waiting pays less than under rule A (953 and 2,109 Flavors against 2,238 and 4,871), so the waiting habit no longer runs away from the quick one.
- From C5 the gate is not met by minute 25: the gain must reach half the Flavors held, so those runs take 29 and 44 min.

## The save migration (v9 to v10)

`flavorJuice = max(lifetime, 1.25M × Flavors²)`, so every Flavor already held stays owed and the next Fresh Batch needs the same step a player at that count faces (from F held to 1.5 F owed: 2.25 times the flavor juice). For example, 300 Flavors give 1.125e11 flavor juice, the next Fresh Batch needs +150 at 2.53e11, so 1.41e11 more juice. Without the migration a rule A save would need 9 to 10 times its lifetime juice (`docs/flavor-study.md`).

## The away bonus's frenzy share (fixed with this change)

Rule C ends runs later, with more helpers. At the engaged cycle 6 checkpoint the away bonus fell to 0.83 of half the measured helper hour, under the 15% band `tests/away.test.js` enforces. The cause: `helperIdle` counted the frenzy meter as filled only at the normal pop rate, but the game (`src/world.js`) and the sim keep filling it during a frenzy, at the frenzy's 4x pop rate. Now one cycle is a frenzy plus the normal time that fills what the frenzy left: share = frenzySecs / (frenzySecs + (frenzyNeed - frenzySecs x frenzy pops x 0.25) / (normal pops x 0.25)). When helpers are the limit in both phases this equals the old formula, so every rule A checkpoint is unchanged (the `ruleA` output is byte-identical to the 2026-10-22 baseline).

Away 1 h against half the measured helper hour, rule C (the test checks C1 first helper, C1 ready and C6 ready):

| checkpoint | casual | engaged |
|---|---|---|
| C1 first helper | 0.94 | 1.04 |
| C1 Fresh Batch ready | 1.02 | 1.01 |
| C2 Fresh Batch ready | 0.99 | **0.60** |
| C3 Fresh Batch ready | **0.69** | **0.78** |
| C4 Fresh Batch ready | **0.80** | 0.98 |
| C5 Fresh Batch ready | 1.01 | 1.02 |
| C6 Fresh Batch ready | 1.03 | 1.00 |

Before the fix, C6 ready was 0.83 engaged. The bold rows are open: there the frenzy itself is limited by helper hits, so helpers pick the best pearls during it and pop the leftover Roses afterwards, which the formula does not model. A first attempt (spending helper hits on the best types in both phases) made the first-helper checkpoints 6-7x too high, because a saturated board fills and stops spawning, so it was reverted.

## Default sim output (`npm run sim`)

The full baseline report, rule C, no duck, Fresh Batch taken as soon as it is ready, achievements applied (2026-10-26).

### casual (1.5 taps/s, skill 0.3, seed 1)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
Achievements granted by the end of each cycle: 14 (x1.08) / 14 (x1.08) / 16 (x1.09) / 17 (x1.095) / 18 (x1.1) / 20 (x1.115)

| 1 | 11.4 | 10.4 | 11.4 | 5.2M | +2 | 2 | 1.3 | 0.0 | 0.0 | 79K | black | 227K | 5.8M |
| 2 | 11.3 | 9.3 | 11.3 | 29.5M | +3 | 5 | 1.6 | 0.0 | 0.0 | 452K | black | 290K | 2.4M |
| 3 | 6.9 | 4.9 | 6.9 | 46.7M | +3 | 8 | 2.0 | 0.1 | 0.1 | 683K | black | 352K | 26.6M |
| 4 | 7.7 | 4.9 | 7.7 | 129M | +4 | 12 | 2.4 | 0.1 | 0.1 | 2.0M | black | 426K | 88.8M |
| 5 | 7.1 | 5.1 | 7.1 | 261M | +7 | 19 | 3.2 | 0.1 | 0.1 | 4.2M | black | 525K | 116M |
| 6 | 6.9 | 3.8 | 6.9 | 586M | +10 | 29 | 4.3 | 0.1 | 0.8 | 8.9M | black | 692K | 178M |

Minute each upgrade reaches max level (- = not maxed before Fresh Batch):

| upgrade (max) | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| tool (5) | 11.2 | 11.3 | 5.4 | 6.5 | 5.7 | 4.5 |
| lucky (8) | 6.2 | 4.6 | 3.3 | 2.9 | 2.7 | 2.1 |
| auto (20) | - | - | - | - | 7.0 | 6.3 |
| sharp (99) | - | - | - | - | - | - |
| mint (5) | 7.6 | 6.5 | 4.2 | 3.7 | 3.3 | 2.8 |
| golden (6) | 10.4 | 9.2 | 4.9 | 4.9 | 5.3 | 3.8 |
| violet (5) | 10.7 | 9.9 | 4.9 | 5.8 | 5.4 | 3.8 |
| coral (5) | 11.3 | - | 5.5 | 6.5 | 6.0 | 4.5 |
| marble (5) | - | - | 6.4 | 7.1 | 6.3 | 5.7 |
| opal (5) | - | - | 6.4 | 7.1 | 6.3 | 5.7 |
| ruby (5) | - | - | 6.7 | 7.3 | 6.6 | 5.7 |
| black (5) | - | - | - | 7.4 | 6.6 | 6.0 |
| shiny (10) | - | - | 6.4 | 7.1 | 6.3 | 5.7 |
| spawn (12) | 7.5 | 6.5 | 3.9 | 3.6 | 3.3 | 2.8 |
| combo (10) | 5.0 | 3.8 | 2.9 | 2.9 | 2.3 | 1.8 |
| fuel (5) | 5.5 | 4.1 | 3.0 | 2.9 | 2.5 | 2.0 |
| tempo (10) | - | - | - | 7.4 | 6.6 | 5.8 |
| board (2) | 9.6 | 8.4 | 4.6 | 4.4 | 4.4 | 3.3 |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 0.7 | 0.2 | 0.2 | 0.1 | 0.1 | 0.0 |
| blue | 0.6 | 0.1 | 0.1 | 0.0 | 0.0 | 0.1 |
| mint | 1.0 | 0.3 | 0.1 | 0.1 | 0.1 | 0.1 |
| golden | 1.1 | 0.3 | 0.2 | 0.1 | 0.1 | 0.2 |
| violet | 2.4 | 1.4 | 0.8 | 0.6 | 0.4 | 0.3 |
| coral | 5.5 | 2.1 | 2.7 | 0.7 | 0.4 | 1.5 |
| marble | 11.7 | 1.5 | 4.8 | 1.8 | 2.1 | 2.4 |
| opal | 27.5 | 6.1 | 14.0 | 2.2 | 2.6 | 3.5 |
| ruby | 49.5 | 0.0 | 0.0 | 19.3 | 10.0 | 8.7 |
| black | 0.0 | 88.0 | 77.2 | 75.1 | 84.2 | 83.3 |

Tools bought: C1 Awl@0.9, Brass Mallet@3.0, Steel Hammer@6.6, Sledgehammer@10.0, Diamond Hammer@11.2 / C2 Awl@0.8, Brass Mallet@2.2, Steel Hammer@5.2, Sledgehammer@8.9, Diamond Hammer@11.3 / C3 Awl@0.6, Brass Mallet@1.6, Steel Hammer@3.3, Sledgehammer@4.6, Diamond Hammer@5.4 / C4 Awl@0.6, Brass Mallet@1.7, Steel Hammer@3.0, Sledgehammer@4.7, Diamond Hammer@6.5 / C5 Awl@0.5, Brass Mallet@1.4, Steel Hammer@2.7, Sledgehammer@5.0, Diamond Hammer@5.7 / C6 Awl@0.4, Brass Mallet@1.1, Steel Hammer@2.4, Sledgehammer@3.4, Diamond Hammer@4.5
Largest values (whole cycles, all 6): juice held 209639022, run juice 586060918, single pop 213347200, income/s 8971382, cost on offer 220446308

Away bonus calibration: helpers alone for 1 h from that moment's board (helperHour, mean of 4 seeds), against awayBonus(3600):

| checkpoint | helper-only juice, 1 h | half of it | away bonus, 1 h | away / half |
|---|---|---|---|---|
| C1 first helper (10.4 min) | 463K | 231K | 227K | 0.98 |
| C1 Fresh Batch ready (11.4 min) | 11.3M | 5.7M | 5.8M | 1.02 |
| C2 first helper (9.3 min) | 668K | 334K | 290K | 0.87 |
| C2 Fresh Batch ready (11.3 min) | 4.8M | 2.4M | 2.4M | 1.01 |
| C3 first helper (4.9 min) | 679K | 340K | 352K | 1.04 |
| C3 Fresh Batch ready (6.9 min) | 64.7M | 32.3M | 26.6M | 0.82 |
| C4 first helper (4.9 min) | 952K | 476K | 426K | 0.89 |
| C4 Fresh Batch ready (7.7 min) | 175M | 87.7M | 88.8M | 1.01 |
| C5 first helper (5.1 min) | 1.2M | 587K | 525K | 0.90 |
| C5 Fresh Batch ready (7.1 min) | 231M | 115M | 116M | 1.01 |
| C6 first helper (3.8 min) | 1.4M | 687K | 692K | 1.01 |
| C6 Fresh Batch ready (6.9 min) | 337M | 169M | 178M | 1.06 |

Rose collection for the Pink Duck (normal Rose pops over the 60 s before each checkpoint; keeping is not simulated):

| checkpoint | Rose pops / min | minutes for 10,000 | juice 10,000 would sell for | Rose share of income |
|---|---|---|---|---|
| C1 first helper (10.4 min) | 100 | 100 | 485K | 0.6% |
| C1 first Fresh Batch (11.4 min) | 169 | 59 | 438K | 0.2% |
| C6 Fresh Batch (6.9 min) | 489 | 20 | 2.0M | 0.0% |

Black Pearls per cycle:

| cycle | unlocked (min) | run length (min) | spawns after unlock | Blacks expected | spawned | spawns turned Rose by the cap | popped by taps | popped by helpers | hits at unlock | hits at end (power) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11.2 | 11.4 | 49 | 0.26 | 0 | 0 | 0 | 0 | 27 | 18 (18) |
| 2 | 10.0 | 11.3 | 315 | 1.85 | 1 | 0 | 1 | 0 | 27 | 27 (12) |
| 3 | 5.1 | 6.9 | 661 | 6.20 | 2 | 3 | 2 | 0 | 27 | 13 (26) |
| 4 | 5.8 | 7.7 | 650 | 7.08 | 3 | 3 | 3 | 0 | 27 | 11 (30) |
| 5 | 5.7 | 7.1 | 547 | 7.47 | 5 | 1 | 5 | 0 | 27 | 9 (38) |
| 6 | 3.9 | 6.9 | 1218 | 15.56 | 7 | 8 | 6 | 0 | 27 | 9 (38) |

### engaged (2.5 taps/s, skill 0.7, seed 2)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
Achievements granted by the end of each cycle: 15 (x1.085) / 16 (x1.09) / 16 (x1.09) / 17 (x1.095) / 19 (x1.11) / 19 (x1.11)

| 1 | 4.5 | 3.7 | 4.5 | 5.8M | +2 | 2 | 1.3 | 0.0 | 0.0 | 91K | black | 225K | 7.8M |
| 2 | 4.4 | 3.8 | 4.4 | 16.3M | +2 | 4 | 1.5 | 0.0 | 0.0 | 266K | black | 284K | 2.4M |
| 3 | 3.5 | 2.9 | 3.5 | 38.3M | +2 | 6 | 1.7 | 0.0 | 0.0 | 633K | black | 341K | 12.7M |
| 4 | 3.3 | 2.7 | 3.3 | 65.5M | +4 | 10 | 2.2 | 0.1 | 0.1 | 1.1M | black | 379K | 23.1M |
| 5 | 3.0 | 2.1 | 3.0 | 156M | +5 | 15 | 2.8 | 0.1 | 0.1 | 2.6M | black | 475K | 99.6M |
| 6 | 3.1 | 1.9 | 3.1 | 440M | +9 | 24 | 3.8 | 0.1 | 0.2 | 7.3M | black | 602K | 141M |

Minute each upgrade reaches max level (- = not maxed before Fresh Batch):

| upgrade (max) | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| tool (5) | 4.3 | - | 3.3 | 3.2 | 2.6 | 2.5 |
| lucky (8) | 2.6 | 2.4 | 1.8 | 1.7 | 1.4 | 1.2 |
| auto (20) | - | - | - | - | - | 3.0 |
| sharp (99) | - | - | - | - | - | - |
| mint (5) | 3.0 | 2.9 | 2.4 | 2.2 | 1.6 | 1.5 |
| golden (6) | 3.7 | 3.8 | 2.9 | 2.7 | 2.1 | 1.9 |
| violet (5) | 3.8 | 3.9 | 3.1 | 2.8 | 2.1 | 2.1 |
| coral (5) | 4.3 | - | 3.3 | 3.2 | 2.6 | 2.5 |
| marble (5) | - | - | - | 3.2 | 2.6 | 2.6 |
| opal (5) | - | - | - | 3.3 | 2.7 | 2.6 |
| ruby (5) | - | - | - | - | 2.7 | 2.6 |
| black (5) | - | - | - | - | 2.9 | 2.9 |
| shiny (10) | - | - | - | 3.3 | 2.7 | 2.6 |
| spawn (12) | 2.9 | 2.8 | 2.3 | 2.2 | 1.6 | 1.5 |
| combo (10) | 2.2 | 1.9 | 1.7 | 1.7 | 1.1 | 1.1 |
| fuel (5) | 2.5 | 2.3 | 1.8 | 1.7 | 1.2 | 1.2 |
| tempo (10) | - | - | - | - | 2.9 | 2.9 |
| board (2) | 3.4 | 3.4 | 2.6 | 2.3 | 1.8 | 1.7 |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 0.3 | 0.2 | 0.1 | 0.0 | 0.0 | 0.0 |
| blue | 0.7 | 0.4 | 0.1 | 0.1 | 0.0 | 0.0 |
| mint | 1.4 | 0.5 | 0.3 | 0.1 | 0.1 | 0.0 |
| golden | 2.5 | 0.7 | 0.4 | 0.3 | 0.2 | 0.1 |
| violet | 5.3 | 1.4 | 0.8 | 0.6 | 0.4 | 0.3 |
| coral | 4.7 | 1.7 | 0.8 | 1.1 | 2.0 | 0.6 |
| marble | 13.0 | 8.8 | 1.4 | 1.5 | 0.6 | 1.0 |
| opal | 25.4 | 5.7 | 2.9 | 0.0 | 0.0 | 2.2 |
| ruby | 46.6 | 0.0 | 9.8 | 8.4 | 7.3 | 9.3 |
| black | 0.0 | 80.6 | 83.3 | 87.9 | 89.3 | 86.4 |

Tools bought: C1 Awl@0.7, Brass Mallet@1.6, Steel Hammer@2.6, Sledgehammer@3.7, Diamond Hammer@4.3 / C2 Awl@0.5, Brass Mallet@1.4, Steel Hammer@2.4, Sledgehammer@3.8 / C3 Awl@0.4, Brass Mallet@1.2, Steel Hammer@1.9, Sledgehammer@2.7, Diamond Hammer@3.3 / C4 Awl@0.4, Brass Mallet@1.1, Steel Hammer@1.8, Sledgehammer@2.3, Diamond Hammer@3.2 / C5 Awl@0.3, Brass Mallet@0.9, Steel Hammer@1.4, Sledgehammer@2.0, Diamond Hammer@2.6 / C6 Awl@0.3, Brass Mallet@1.0, Steel Hammer@1.3, Sledgehammer@1.9, Diamond Hammer@2.5
Largest values (whole cycles, all 6): juice held 171851269, run juice 440296472, single pop 202991250, income/s 7302679, cost on offer 59198096

Away bonus calibration: helpers alone for 1 h from that moment's board (helperHour, mean of 4 seeds), against awayBonus(3600):

| checkpoint | helper-only juice, 1 h | half of it | away bonus, 1 h | away / half |
|---|---|---|---|---|
| C1 first helper (3.7 min) | 462K | 231K | 225K | 0.97 |
| C1 Fresh Batch ready (4.5 min) | 15.2M | 7.6M | 7.8M | 1.02 |
| C2 first helper (3.8 min) | 600K | 300K | 284K | 0.95 |
| C2 Fresh Batch ready (4.4 min) | 5.0M | 2.5M | 2.4M | 0.98 |
| C3 first helper (2.9 min) | 679K | 339K | 341K | 1.01 |
| C3 Fresh Batch ready (3.5 min) | 32.2M | 16.1M | 12.7M | 0.79 |
| C4 first helper (2.7 min) | 758K | 379K | 379K | 1.00 |
| C4 Fresh Batch ready (3.3 min) | 65.4M | 32.7M | 23.1M | 0.71 |
| C5 first helper (2.1 min) | 1.0M | 504K | 475K | 0.94 |
| C5 Fresh Batch ready (3.0 min) | 194M | 96.8M | 99.6M | 1.03 |
| C6 first helper (1.9 min) | 1.5M | 728K | 602K | 0.83 |
| C6 Fresh Batch ready (3.1 min) | 286M | 143M | 141M | 0.99 |

Rose collection for the Pink Duck (normal Rose pops over the 60 s before each checkpoint; keeping is not simulated):

| checkpoint | Rose pops / min | minutes for 10,000 | juice 10,000 would sell for | Rose share of income |
|---|---|---|---|---|
| C1 first helper (3.7 min) | 71 | 141 | 483K | 0.3% |
| C1 first Fresh Batch (4.5 min) | 139 | 72 | 452K | 0.1% |
| C6 Fresh Batch (3.1 min) | 646 | 15 | 1.2M | 0.0% |

Black Pearls per cycle:

| cycle | unlocked (min) | run length (min) | spawns after unlock | Blacks expected | spawned | spawns turned Rose by the cap | popped by taps | popped by helpers | hits at unlock | hits at end (power) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 4.3 | 4.5 | 48 | 0.26 | 0 | 0 | 0 | 0 | 27 | 18 (18) |
| 2 | 4.2 | 4.4 | 92 | 0.63 | 1 | 0 | 1 | 0 | 27 | 27 (12) |
| 3 | 3.3 | 3.5 | 78 | 0.83 | 1 | 1 | 1 | 0 | 27 | 18 (18) |
| 4 | 3.0 | 3.3 | 123 | 1.24 | 2 | 1 | 2 | 0 | 27 | 15 (22) |
| 5 | 2.6 | 3.0 | 195 | 2.96 | 3 | 0 | 3 | 0 | 27 | 10 (34) |
| 6 | 2.2 | 3.1 | 450 | 5.29 | 5 | 1 | 5 | 0 | 27 | 9 (38) |

## With the Pink Duck (`npm run sim -- --duck`), six-cycle tables

Achievements applied (2026-10-26).

### casual (1.5 taps/s, skill 0.3, seed 1)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
Achievements granted by the end of each cycle: 15 (x1.085) / 15 (x1.085) / 16 (x1.09) / 16 (x1.09) / 17 (x1.095) / 18 (x1.1)

| 1 | 9.5 | 8.2 | 9.5 | 5.1M | +2 | 2 | 1.8 | 0.0 | 0.0 | 52K | black | 316K | 8.5M |
| 2 | 8.5 | 5.8 | 8.5 | 20.4M | +2 | 4 | 2.1 | 0.0 | 0.0 | 298K | black | 396K | 3.0M |
| 3 | 5.6 | 4.2 | 5.6 | 25.5M | +2 | 6 | 2.4 | 0.0 | 0.0 | 392K | black | 477K | 11.4M |
| 4 | 5.8 | 4.7 | 5.8 | 51.5M | +3 | 9 | 2.9 | 0.1 | 0.1 | 725K | black | 530K | 36.5M |
| 5 | 6.7 | 4.8 | 6.7 | 148M | +5 | 14 | 3.7 | 0.1 | 0.1 | 2.3M | black | 647K | 135M |
| 6 | 5.9 | 3.7 | 5.9 | 346M | +7 | 21 | 4.8 | 0.1 | 0.2 | 5.7M | black | 802K | 193M |

### engaged (2.5 taps/s, skill 0.7, seed 2)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
Achievements granted by the end of each cycle: 13 (x1.065) / 15 (x1.08) / 17 (x1.1) / 19 (x1.11) / 19 (x1.11) / 19 (x1.11)

| 1 | 3.5 | 3.4 | 3.5 | 8.6M | +2 | 2 | 1.8 | 0.0 | 0.0 | 140K | ruby | 366K | 698K |
| 2 | 3.5 | 2.2 | 3.5 | 12.0M | +2 | 4 | 2.1 | 0.0 | 0.0 | 180K | black | 388K | 2.9M |
| 3 | 3.0 | 2.5 | 3.0 | 31.5M | +2 | 6 | 2.5 | 0.0 | 0.0 | 522K | black | 459K | 19.3M |
| 4 | 3.3 | 2.0 | 3.3 | 95.5M | +4 | 10 | 3.1 | 0.1 | 0.1 | 1.6M | black | 535K | 37.0M |
| 5 | 2.2 | 1.5 | 2.2 | 173M | +6 | 16 | 4.0 | 0.1 | 0.1 | 2.9M | black | 675K | 145M |
| 6 | 2.5 | 1.4 | 2.5 | 415M | +8 | 24 | 5.3 | 0.1 | 0.4 | 6.9M | black | 877K | 211M |

## When the player keeps playing to minute 25 (`--wait=25`)

Achievements applied (2026-10-26).

### casual (1.5 taps/s, skill 0.3, seed 1)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
Achievements granted by the end of each cycle: 26 (x1.15) / 32 (x1.185) / 32 (x1.185) / 32 (x1.185) / 32 (x1.185) / 34 (x1.205)

| 1 | 11.4 | 10.4 | 25.0 | 2162M | +41 | 41 | 5.9 | 0.1 | 10.7 | 2.1M | black | 227K | 5.8M |
| 2 | 5.7 | 2.1 | 25.0 | 25920M | +108 | 149 | 18.8 | 0.1 | 21.4 | 17.3M | black | 1.3M | 361M |
| 3 | 11.7 | 1.2 | 25.0 | 83711M | +150 | 299 | 36.6 | 0.2 | 23.2 | 105M | black | 4.1M | 1306M |
| 4 | 20.9 | 0.8 | 25.0 | 174806M | +179 | 478 | 57.8 | 0.1 | 23.6 | 138M | black | 7.9M | 2693M |
| 5 | 27.1 | 0.9 | 27.1 | 358348M | +240 | 718 | 86.3 | 0.1 | 26.0 | 176M | black | 12.6M | 4417M |
| 6 | 43.2 | 0.5 | 43.2 | 813826M | +362 | 1080 | 131.3 | 0.2 | 42.3 | 541M | black | 18.7M | 6891M |

Minute each upgrade reaches max level (- = not maxed before Fresh Batch):

| upgrade (max) | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| tool (5) | 11.2 | 2.7 | 1.2 | 1.1 | 1.0 | 0.6 |
| lucky (8) | 6.2 | 1.3 | 0.5 | 0.4 | 0.5 | 0.3 |
| auto (20) | 14.2 | 3.7 | 1.9 | 1.5 | 1.3 | 1.0 |
| sharp (99) | - | - | - | - | - | - |
| mint (5) | 7.6 | 1.5 | 0.8 | 0.6 | 0.5 | 0.3 |
| golden (6) | 10.4 | 2.2 | 1.2 | 0.8 | 0.9 | 0.6 |
| violet (5) | 10.7 | 2.2 | 1.2 | 0.8 | 0.9 | 0.6 |
| coral (5) | 11.3 | 2.8 | 1.2 | 1.2 | 1.0 | 0.6 |
| marble (5) | 11.9 | 3.1 | 1.3 | 1.2 | 1.0 | 0.9 |
| opal (5) | 12.0 | 3.2 | 1.3 | 1.5 | 1.1 | 1.0 |
| ruby (5) | 12.4 | 3.3 | 1.9 | 1.5 | 1.1 | 1.0 |
| black (5) | 13.0 | 3.4 | 1.9 | 1.5 | 1.2 | 1.0 |
| shiny (10) | 12.0 | 3.2 | 1.4 | 1.5 | 1.1 | 1.0 |
| spawn (12) | 7.5 | 1.5 | 0.8 | 0.5 | 0.5 | 0.3 |
| combo (10) | 5.0 | 1.2 | 0.5 | 0.3 | 0.4 | 0.2 |
| fuel (5) | 5.5 | 1.2 | 0.5 | 0.3 | 0.5 | 0.2 |
| tempo (10) | 13.0 | 3.3 | 1.9 | 1.5 | 1.2 | 1.0 |
| board (2) | 9.6 | 1.9 | 0.8 | 0.6 | 0.5 | 0.5 |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| blue | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 |
| mint | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 |
| golden | 0.2 | 0.1 | 0.2 | 0.2 | 0.1 | 0.2 |
| violet | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 |
| coral | 0.6 | 0.5 | 0.6 | 0.5 | 0.5 | 0.5 |
| marble | 1.3 | 1.2 | 1.3 | 1.4 | 1.0 | 1.0 |
| opal | 4.9 | 3.4 | 5.4 | 4.8 | 3.8 | 4.1 |
| ruby | 11.9 | 12.0 | 9.6 | 9.5 | 9.9 | 10.6 |
| black | 80.7 | 82.4 | 82.4 | 83.2 | 84.3 | 83.2 |

Tools bought: C1 Awl@0.9, Brass Mallet@3.0, Steel Hammer@6.6, Sledgehammer@10.0, Diamond Hammer@11.2 / C2 Awl@0.3, Brass Mallet@0.6, Steel Hammer@1.3, Sledgehammer@2.1, Diamond Hammer@2.7 / C3 Awl@0.1, Brass Mallet@0.3, Steel Hammer@0.6, Sledgehammer@0.8, Diamond Hammer@1.2 / C4 Awl@0.1, Brass Mallet@0.2, Steel Hammer@0.4, Sledgehammer@0.7, Diamond Hammer@1.1 / C5 Awl@0.0, Brass Mallet@0.2, Steel Hammer@0.5, Sledgehammer@0.8, Diamond Hammer@1.0 / C6 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.3, Sledgehammer@0.5, Diamond Hammer@0.6
Largest values (whole cycles, all 6): juice held 243470609084, run juice 813825598133, single pop 20000380400, income/s 676580018, cost on offer 379264066136

### engaged (2.5 taps/s, skill 0.7, seed 2)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
Achievements granted by the end of each cycle: 29 (x1.165) / 32 (x1.185) / 32 (x1.185) / 34 (x1.205) / 35 (x1.21) / 36 (x1.215)

| 1 | 4.5 | 3.7 | 25.0 | 8210M | +81 | 81 | 10.6 | 0.1 | 19.2 | 5.8M | black | 225K | 7.8M |
| 2 | 4.6 | 0.6 | 25.0 | 111910M | +228 | 309 | 37.8 | 0.2 | 24.0 | 130M | black | 2.3M | 693M |
| 3 | 9.9 | 0.4 | 25.0 | 430809M | +354 | 663 | 79.8 | 0.2 | 24.4 | 321M | black | 8.2M | 2780M |
| 4 | 19.0 | 0.2 | 25.0 | 944119M | +430 | 1093 | 132.9 | 0.2 | 24.7 | 543M | black | 17.3M | 6257M |
| 5 | 26.7 | 0.3 | 26.7 | 1870496M | +547 | 1640 | 199.7 | 0.2 | 26.4 | 1049M | black | 29.7M | 10950M |
| 6 | 40.3 | 0.2 | 40.3 | 4201580M | +820 | 2460 | 300.1 | 0.2 | 40.1 | 1871M | black | 44.6M | 17014M |

Minute each upgrade reaches max level (- = not maxed before Fresh Batch):

| upgrade (max) | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| tool (5) | 4.3 | 0.9 | 0.5 | 0.3 | 0.4 | 0.3 |
| lucky (8) | 2.6 | 0.5 | 0.2 | 0.1 | 0.1 | 0.1 |
| auto (20) | 5.9 | 1.1 | 0.8 | 0.5 | 0.5 | 0.4 |
| sharp (99) | - | - | - | - | - | - |
| mint (5) | 3.0 | 0.6 | 0.3 | 0.2 | 0.2 | 0.1 |
| golden (6) | 3.7 | 0.6 | 0.4 | 0.3 | 0.2 | 0.2 |
| violet (5) | 3.8 | 0.7 | 0.4 | 0.3 | 0.3 | 0.2 |
| coral (5) | 4.3 | 0.9 | 0.5 | 0.3 | 0.4 | 0.3 |
| marble (5) | 4.6 | 0.9 | 0.6 | 0.4 | 0.4 | 0.3 |
| opal (5) | 4.6 | 0.9 | 0.6 | 0.4 | 0.4 | 0.3 |
| ruby (5) | 4.9 | 0.9 | 0.6 | 0.4 | 0.4 | 0.4 |
| black (5) | 5.2 | 1.0 | 0.6 | 0.5 | 0.5 | 0.4 |
| shiny (10) | 4.6 | 0.9 | 0.6 | 0.4 | 0.4 | 0.4 |
| spawn (12) | 2.9 | 0.6 | 0.2 | 0.2 | 0.2 | 0.1 |
| combo (10) | 2.2 | 0.4 | 0.2 | 0.1 | 0.1 | 0.1 |
| fuel (5) | 2.5 | 0.5 | 0.2 | 0.1 | 0.1 | 0.1 |
| tempo (10) | 4.9 | 1.0 | 0.6 | 0.5 | 0.4 | 0.4 |
| board (2) | 3.4 | 0.6 | 0.3 | 0.2 | 0.2 | 0.1 |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| blue | 0.1 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| mint | 0.1 | 0.0 | 0.0 | 0.1 | 0.0 | 0.0 |
| golden | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 | 0.1 |
| violet | 0.3 | 0.3 | 0.2 | 0.3 | 0.2 | 0.2 |
| coral | 0.5 | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 |
| marble | 1.1 | 0.9 | 0.9 | 1.1 | 0.8 | 1.0 |
| opal | 3.4 | 3.5 | 3.7 | 3.5 | 3.8 | 3.4 |
| ruby | 10.6 | 9.9 | 9.4 | 9.1 | 8.6 | 8.5 |
| black | 83.8 | 84.7 | 85.1 | 85.4 | 85.9 | 86.2 |

Tools bought: C1 Awl@0.7, Brass Mallet@1.6, Steel Hammer@2.6, Sledgehammer@3.7, Diamond Hammer@4.3 / C2 Awl@0.1, Brass Mallet@0.2, Steel Hammer@0.5, Sledgehammer@0.6, Diamond Hammer@0.9 / C3 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.2, Sledgehammer@0.4, Diamond Hammer@0.5 / C4 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.1, Sledgehammer@0.2, Diamond Hammer@0.3 / C5 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.1, Sledgehammer@0.2, Diamond Hammer@0.4 / C6 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.1, Sledgehammer@0.2, Diamond Hammer@0.3
Largest values (whole cycles, all 6): juice held 1405172310327, run juice 4201580481635, single pop 49441144500, income/s 3607739614, cost on offer 2189114560136

## Earlier report (2026-10-22, rule A): 10% per Flavor, an earlier and commoner Black Pearl, the artifact stack

Date: 2026-10-22. Numbers come from `tools/sim32.js` on the economy in `src/econ.js` at this commit. This replaces the 2026-10-21 report. That report's baseline is still playable as the sim variant `oldDials`, which reproduces it byte for byte.

### What changed

Three data values. No system changed, and the Fresh Batch floor, the payout table, hits per type and `COST_SCALE` did not move.

| dial | before | now |
|---|---|---|
| `FLAVOR_BONUS` (payout added per Flavor) | 0.2 | **0.1** |
| `UPG.black.base` (Black Pearls, level 1 costs base × 2.5) | 60,000 (150,000) | **55,000 (137,500)** |
| `NEW_BASE.black` (Black's first-level spawn weight) | 0.15 | **0.8** |
| `COLLAPSE_MIN_RUN` (Fresh Batch floor) | 5M | 5M (a Flavor-scaled floor was tried and not applied) |

Unchanged from the last report: `COST_SCALE` 2.5, Helpers base 45,000, `collapseGain = floor(sqrt(run / 1,250,000))`, `PAYOUT_STEEPNESS` 1.5.

- The Fresh Batch button text now reads the bonus from `FLAVOR_BONUS` ("Each Flavor adds 10% ..."); it said 20% as a literal.
- `ECON` now exports `NEW_BASE`, so the sim can override it.

### Payout table

| rank | type | hits | base | now (base × 1.5^rank, 2 s.f.) | shiny (× 5) |
|---|---|---|---|---|---|
| 0 | Rose Pearl | 1 | 1 | 1 | 5 |
| 1 | Blue Pearl | 3 | 5 | 7.5 | 37.5 |
| 2 | Mint Pearl | 7 | 12 | 27 | 135 |
| 3 | Golden Pearl | 15 | 30 | 100 | 500 |
| 4 | Violet Pearl | 30 | 70 | 350 | 1,750 |
| 5 | Coral Pearl | 50 | 150 | 1,100 | 5,500 |
| 6 | Glass Marble | 80 | 350 | 4,000 | 20K |
| 7 | Opal Pearl | 130 | 800 | 14K | 70K |
| 8 | Ruby Pearl | 200 | 2,000 | 51K | 255K |
| 9 | Black Pearl | 320 | 5,000 | 190K | 950K |

Payouts are printed with `fmtX` (bottom of `src/econ.js`): whole numbers with separators below 10,000 (7.5 keeps its half), then `fmt` without trailing zeros (`14K`, not `14.0K`). The shop descriptions, the Collection book and the pool cards use it. The pool cards now show `x… payout` under the name, because they showed no payout before. In headless Chrome at 1280×800 and 390×844, no payout text in the book (all 10 pages, both sides) or on the pool cards has `scrollWidth > clientWidth`.

### How this was measured

- `npm run sim` plays **6 consecutive Fresh Batch cycles** for two profiles, seeded (seed 1 casual, seed 2 engaged), so the output is identical run to run.
  - **casual:** 1.5 taps/s, skill 0.3
  - **engaged:** 2.5 taps/s, skill 0.7
- Fresh Batch wipes what `finishCollapse()` / `resetRun()` / `resetTools()` / `zeroInv()` wipe and keeps Flavors, discoveries, the pool and artifacts. The per-type spawn cap is enforced like `trySpawn()`. The buy order is the cheapest affordable item each 0.1 s tick, with a first verb level at half weight and tools at 0.8 weight.
- **New in the sim this session:**
  - `newBase` lever: a variant can override first-level spawn weights (`NEW_BASE`). It sets ECON's own table for the run and restores it afterwards.
  - `--duck` owns a plain Pink Duck (one Common copy, x1.4) from minute 0; `--duck=best` owns the best-case duck (a Mythic copy with a top payout perk of +15%, x1.61). Variants `pinkDuck` and `pinkDuckBest` are the same. Only payout is modelled: a real Mythic would also carry two other perks.
  - `oldDials`: the dials before this session (20%, 60,000, 0.15), for before and after.
  - `scaledFloor` now follows the live bonus: floor × (1 + `FLAVOR_BONUS` × Flavors), so 10% per Flavor.
  - `flavor10` became `flavor20` (the old value, on the new Black dials); `flavor5` stays.
- **Not modelled:** selling from the backpack, the Fresh Batch animation, actually taking the away bonus, switching types off in the pool, real cell counts (the sim uses 120 / 252 / 440), helper credit to the frenzy meter during a run, the in-run helper's choice (random among breakable pearls), sweep (a doubled tap rate), keeping pearls or crafting, relics, and any duck perk other than payout.
- **The nothing-to-want columns read 0.0 throughout,** as before. Treat them as uninformative.

### Targets and result (new dials, reference seeds, Fresh Batch taken at once)

| target | casual | engaged | met? |
|---|---|---|---|
| first Fresh Batch 11–13 min (casual), 6–8 min (engaged) | **12.8** | **6.0** (was 6.2) | yes |
| first Fresh Batch unchanged at 12.8 / 6.2 (this session's constraint) | 12.8 | 6.0 | casual yes, **engaged no** (see *Choosing the Black dials*) |
| first helper 70–90% of the way to it | 11.4 min = **89%** | 4.8 min = **80%** | yes |
| no upgrade group at max before the first Fresh Batch | none of verb / Pearls & Marbles / tune is fully maxed | same | yes (by group) |
| … read per upgrade instead | 10 of 18 upgrades reach max in C1 | 9 of 18 | **no** |
| each later cycle shorter than the one before | 12.8 → 12.9 → 10.2 → 8.6 → 6.6 → 5.4 | 6.0 → 3.6 → 3.4 → 3.0 → 2.2 → 2.3 | **no** for both (C2 +0.1 casual, C6 +0.1 engaged) |
| no cycle under 4 min (no duck) | min 5.4 | C2 to C6 are 2.2–3.6 | casual yes, **engaged no** |
| Black earns in at least 3 of 6 cycles | 4 of 6 (C2, C3, C4, C6) | 4 of 6 (C1–C4) | yes |

#### Why the engaged 4-minute floor still misses

- **10% per Flavor alone** (old Black dials) gave engaged 6.2 / 4.5 / 4.2 / 3.4 / 2.9 / 3.0 and casual 12.8 / 13.4 / 6.7 / 8.0 / 8.8 / 7.1. That is two engaged cycles over 4 min instead of none.
- **Black earning brings them back under.** A Black pop pays about 190K × the multipliers, which is 70–93% of the cycle's income in one tap. Run juice jumps far past the floor at once, so the run ends early and the gain is larger. With the chosen Black dials, engaged is 6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3.
- **Over seeds 1–8,** 33 of 40 engaged later cycles run under 4 min at 10% with the old Black dials, and 35 of 40 with the new ones. So on average Black costs little against the floor; most of the miss is there either way. Casual has no cycle under 4 min on any seed with either.
- What would fix it is still outside data: Fresh Batch costs that grow with Flavors faster than the multiplier (the scaled floor below is too weak), or a gain curve that does not pay for overshoot.

#### How robust the first-run numbers are

- Over seeds 1–8 with the new dials: casual first Fresh Batch 12.8 min on average, engaged 5.4 min. With the old dials: 12.7 and 5.6. The engaged reference seed moved 6.2 → 6.0, but its seed average moved only 0.2 min.
- Casual still sits about 2.3x longer than engaged on seed averages, wider than the bands allow (13 / 6 = 2.17x). That gap comes from tap rate and skill, as before.

### Before and after (reference seeds, Fresh Batch taken at once)

| | casual before | casual after | engaged before | engaged after |
|---|---|---|---|---|
| first Fresh Batch (min) | 12.8 | 12.8 | 6.2 | 6.0 |
| first helper (min) | 11.4 (89%) | 11.4 (89%) | 4.8 (77%) | 4.8 (80%) |
| cycles 2–6 (min) | 10.8 / 7.7 / 6.6 / 5.9 / 5.8 | 12.9 / 10.2 / 8.6 / 6.6 / 5.4 | 3.5 / 3.1 / 3.1 / 2.1 / 2.4 | 3.6 / 3.4 / 3.0 / 2.2 / 2.3 |
| Flavors after 6 cycles | 15 (x4.0) | 19 (x2.9) | 13 (x3.6) | 19 (x2.9) |
| Black's share of income, C1..C6 (%) | 0 / 0 / 0 / 0 / 0 / 0 | 0 / 80.7 / 86.3 / 92.9 / 0 / 86.7 | 0 / 0 / 0 / 0 / 0 / 0 | 71.6 / 79.2 / 87.3 / 86.2 / 0 / 0 |

### Choosing the Black dials

The rule: lower `UPG.black.base` to 45,000, 35,000 or 28,000 and keep the highest value where Black earns a non-zero share in at least 3 of 6 cycles for both profiles, with the first Fresh Batch inside 11–13 min (casual) and 6–8 min (engaged). If none qualifies, also raise `NEW_BASE.black`. All at 10% per Flavor.

**Base cost alone (weight 0.15): none qualifies.**

| `UPG.black.base` | first Fresh Batch (casual / engaged) | cycles with Black income (casual / engaged) | verdict |
|---|---|---|---|
| 60,000 (before) | 12.8 / 6.2 | 1 / 1 | no |
| 45,000 | 12.8 / 6.2 | 2 / 1 | no: too few |
| 35,000 | 14.2 / 5.9 | 1 / 0 | no: both out of band |
| 28,000 | 13.5 / 6.8 | 1 / 3 | no: casual out of band |

**Base cost with a larger first-level weight (reference seeds).** Columns: base, `NEW_BASE.black`, first Fresh Batch casual / engaged, cycles with Black income casual / engaged, casual cycles, engaged cycles.

| base | weight | C1 (min) | Black cycles | casual C1..C6 | engaged C1..C6 |
|---|---|---|---|---|---|
| 60000 | 0.15 | 12.8 / 6.2 | 1 / 1 | 12.8/13.4/6.7/8.0/8.8/7.1 | 6.2/4.5/4.2/3.4/2.9/3.0 |
| 60000 | 0.3 | 12.8 / 6.2 | 1 / 2 | 12.8/13.2/8.2/9.7/7.9/5.7 | 6.2/5.0/3.7/2.8/3.0/2.3 |
| 60000 | 0.45 | 12.8 / 6.0 | 1 / 3 | 12.8/13.2/7.8/10.2/5.7/5.9 | 6.0/4.8/4.3/3.2/2.7/2.9 |
| 60000 | 0.6 | 12.8 / 6.0 | 1 / 4 | 12.8/13.4/10.2/8.4/6.5/7.2 | 6.0/4.8/4.4/3.2/3.2/2.5 |
| 60000 | 0.8 | 12.8 / 6.0 | 3 / 2 | 12.8/13.4/11.8/10.1/7.4/7.2 | 6.0/3.5/4.3/2.7/2.8/2.7 |
| 60000 | 1 | 12.8 / 6.0 | 3 / 3 | 12.8/13.4/11.9/7.7/7.2/4.7 | 6.0/3.5/4.0/2.5/2.2/2.2 |
| 60000 | 1.2 | 12.8 / 6.0 | 3 / 4 | 12.8/11.9/9.0/7.5/8.7/6.0 | 6.0/3.5/4.0/2.5/2.2/2.2 |
| 55000 | 0.15 | 12.8 / 6.6 | 0 / 0 | 12.8/12.7/9.8/7.4/8.9/7.7 | 6.6/4.1/4.5/3.3/2.7/2.7 |
| 55000 | 0.3 | 12.8 / 6.6 | 1 / 0 | 12.8/12.9/10.1/9.8/6.8/6.5 | 6.6/4.1/4.2/3.1/2.6/2.7 |
| 55000 | 0.45 | 12.8 / 6.0 | 1 / 0 | 12.8/12.9/10.1/9.8/6.8/6.5 | 6.0/3.9/3.7/3.9/3.5/2.6 |
| 55000 | 0.6 | 12.8 / 6.0 | 3 / 0 | 12.8/12.9/10.2/8.5/7.1/6.5 | 6.0/3.9/3.7/3.9/3.3/2.7 |
| 55000 | 0.8 | 12.8 / 6.0 | 4 / 4 | 12.8/12.9/10.2/8.6/6.6/5.4 | 6.0/3.6/3.4/3.0/2.2/2.3 |
| 55000 | 1 | 12.8 / 6.0 | 5 / 4 | 12.8/12.9/10.2/8.6/6.8/5.3 | 6.0/3.6/3.2/3.3/2.8/2.5 |
| 55000 | 1.2 | 12.8 / 6.0 | 4 / 5 | 12.8/12.0/8.6/9.3/5.5/6.6 | 6.0/3.6/3.3/2.7/3.5/2.2 |
| 50000 | 0.15 | 12.8 / 5.9 | 3 / 1 | 12.8/11.8/9.3/8.0/6.6/7.1 | 5.9/4.7/4.6/3.5/2.6/2.7 |
| 50000 | 0.3 | 12.8 / 5.9 | 1 / 1 | 12.8/12.0/8.9/8.4/8.8/6.3 | 5.9/4.7/4.4/3.4/2.8/2.6 |
| 50000 | 0.45 | 12.8 / 6.0 | 2 / 2 | 12.8/11.9/9.2/7.7/10.4/5.8 | 6.0/4.5/4.0/2.9/2.6/2.5 |
| 50000 | 0.6 | 12.8 / 6.0 | 4 / 3 | 12.8/12.0/7.2/8.1/6.7/5.2 | 6.0/4.5/4.1/2.8/2.1/2.5 |
| 50000 | 0.8 | 12.8 / 6.0 | 2 / 2 | 12.8/12.0/7.2/8.0/7.5/7.5 | 6.0/4.0/4.1/2.8/2.5/2.6 |
| 50000 | 1 | 12.8 / 6.0 | 3 / 5 | 12.8/12.2/9.5/11.2/6.3/7.4 | 6.0/4.0/3.9/2.4/2.7/2.7 |
| 50000 | 1.2 | 12.8 / 6.0 | 5 / 5 | 12.8/12.2/9.6/7.0/7.7/6.6 | 6.0/4.0/3.9/2.4/2.7/2.6 |
| 45000 | 0.15 | 12.8 / 6.2 | 2 / 1 | 12.8/11.8/9.3/8.0/7.1/7.4 | 6.2/4.8/4.7/4.7/2.8/2.8 |
| 45000 | 0.3 | 12.8 / 6.2 | 1 / 1 | 12.8/12.0/8.9/8.4/8.6/8.3 | 6.2/5.0/4.0/3.2/2.9/3.1 |
| 45000 | 0.45 | 12.9 / 6.0 | 2 / 2 | 12.9/11.0/9.6/9.9/6.6/4.4 | 6.0/4.6/4.6/2.9/2.6/2.5 |
| 45000 | 0.6 | 12.9 / 6.0 | 2 / 2 | 12.9/10.6/8.5/6.3/6.2/5.9 | 6.0/4.5/4.0/3.0/3.1/2.8 |
| 45000 | 0.8 | 13.3 / 6.0 | 4 / 4 | 13.3/9.4/9.1/7.0/5.9/4.8 | 6.0/3.6/3.1/3.0/2.7/2.7 |
| 45000 | 1 | 14.4 / 6.0 | 5 / 6 | 14.4/9.4/9.4/9.9/6.1/5.2 | 6.0/3.6/3.1/3.1/2.6/2.4 |
| 45000 | 1.2 | 13.4 / 6.0 | 5 / 6 | 13.4/8.9/7.8/7.1/5.4/5.6 | 6.0/3.6/3.1/3.1/2.6/2.2 |
| 40000 | 0.15 | 13.1 / 5.9 | 1 / 3 | 13.1/13.0/11.0/10.9/6.9/6.2 | 5.9/4.6/4.7/3.3/2.6/2.3 |
| 40000 | 0.3 | 13.1 / 5.8 | 3 / 1 | 13.1/11.4/7.6/6.9/6.7/7.1 | 5.8/4.9/4.1/2.9/3.2/2.7 |
| 40000 | 0.45 | 13.3 / 5.7 | 2 / 3 | 13.3/11.7/8.0/6.0/7.3/5.9 | 5.7/4.6/3.2/3.4/2.9/2.6 |
| 40000 | 0.6 | 13.1 / 5.7 | 2 / 4 | 13.1/10.2/9.7/5.4/6.1/5.3 | 5.7/4.3/5.0/3.5/2.6/2.6 |
| 40000 | 0.8 | 13.1 / 5.7 | 5 / 4 | 13.1/10.2/9.5/6.7/5.6/5.7 | 5.7/4.4/3.4/3.4/2.3/2.6 |
| 40000 | 1 | 13.1 / 6.2 | 5 / 2 | 13.1/10.2/9.5/6.0/6.9/4.9 | 6.2/4.6/4.4/2.8/2.4/2.5 |
| 40000 | 1.2 | 12.9 / 6.2 | 2 / 5 | 12.9/11.1/8.5/6.0/7.0/4.8 | 6.2/3.9/3.1/3.4/2.3/2.2 |
| 35000 | 0.15 | 14.2 / 5.9 | 1 / 0 | 14.2/9.4/9.5/9.0/7.9/8.1 | 5.9/4.5/4.0/2.8/2.8/2.8 |
| 35000 | 0.3 | 14.4 / 5.8 | 0 / 3 | 14.4/10.0/11.0/8.4/7.6/7.0 | 5.8/4.6/4.1/3.2/3.1/2.4 |
| 35000 | 0.45 | 14.1 / 5.7 | 2 / 5 | 14.1/7.7/7.2/7.9/6.6/5.2 | 5.7/4.5/3.3/3.2/2.7/2.3 |
| 35000 | 0.6 | 13.1 / 5.7 | 2 / 3 | 13.1/10.2/9.7/5.4/6.1/5.3 | 5.7/4.6/3.4/2.8/2.6/2.6 |
| 35000 | 0.8 | 13.1 / 5.7 | 5 / 2 | 13.1/10.2/9.5/6.7/5.6/5.7 | 5.7/4.4/3.3/3.3/2.7/2.8 |
| 35000 | 1 | 13.1 / 6.5 | 5 / 3 | 13.1/10.2/9.5/6.0/4.4/5.4 | 6.5/4.2/4.6/2.6/2.2/2.4 |
| 35000 | 1.2 | 12.9 / 6.5 | 4 / 5 | 12.9/11.9/11.1/7.6/8.3/6.0 | 6.5/3.9/3.5/2.8/2.7/2.0 |
| 28000 | 0.15 | 13.5 / 6.8 | 1 / 3 | 13.5/11.2/8.3/7.6/7.6/7.9 | 6.8/4.7/4.1/3.2/2.6/2.7 |
| 28000 | 0.3 | 13.6 / 6.8 | 3 / 2 | 13.6/8.5/8.4/8.0/6.6/6.0 | 6.8/3.8/3.9/2.9/2.7/2.7 |
| 28000 | 0.45 | 13.2 / 5.8 | 3 / 1 | 13.2/11.6/10.6/7.1/7.8/5.5 | 5.8/4.2/3.3/3.1/2.7/2.7 |
| 28000 | 0.6 | 13.0 / 5.9 | 6 / 4 | 13.0/9.6/5.9/6.8/5.2/4.5 | 5.9/4.2/3.4/3.1/2.6/2.4 |
| 28000 | 0.8 | 13.0 / 5.6 | 5 / 6 | 13.0/9.3/7.1/8.5/6.4/4.5 | 5.6/3.9/3.3/3.2/2.8/2.1 |
| 28000 | 1 | 13.0 / 5.6 | 4 / 6 | 13.0/9.3/7.1/6.9/5.4/4.4 | 5.6/3.9/3.5/3.1/2.1/1.7 |
| 28000 | 1.2 | 12.9 / 5.6 | 4 / 6 | 12.9/11.9/11.2/7.6/7.4/6.6 | 5.6/3.9/3.2/2.9/2.3/2.1 |

- **Black's share is all or nothing.** A cycle either sees one Black pop (70–98% of its income) or none, so "non-zero" means "at least one Black popped". Neighbouring cells of the grid flip at random.
- **No combination keeps the first run at exactly 12.8 / 6.2 and qualifies.** Any combination that spawns more Blacks shifts the random stream inside run 1, so engaged's first run moves even when the unlock comes after it.
- **Of the three listed bases, only 35,000 with weight 1.2 qualifies** (first run 12.9 / 6.5; 4 and 5 cycles). It moves the first run the most, and over seeds 1–8 Black takes 77% (casual) and 58% (engaged) of all income.
- **Chosen: base 55,000 with weight 0.8.** It is the smallest lowering of the base that qualifies on the reference seeds: first run 12.8 / 6.0, Black earning in 4 of 6 cycles for each. It also holds over seeds 1–8, where Black earns in 3.5 (casual) and 3.1 (engaged) of 6 cycles, with 48% and 44% of income. 60,000 with weight 1.0 qualified too, but it does not unlock Black any earlier, which was the point of option A.
- Seed check of every candidate (seeds 1–8, 10% per Flavor; "earning" = cycles with Black income, "under 4" = engaged C2–C6 under 4 min out of 40):

| base / weight | casual C1 avg | casual earning | engaged C1 avg | engaged earning | engaged under 4 |
|---|---|---|---|---|---|
| 60,000 / 0.15 (old Black) | 12.7 | 1.0 of 6 | 5.6 | 0.6 of 6 | 33 / 40 |
| 45,000 / 0.15 | 12.7 | 1.3 of 6 | 5.6 | 0.9 of 6 | 28 / 40 |
| 60,000 / 1.0 | 12.8 | 2.9 of 6 | 5.5 | 3.3 of 6 | 34 / 40 |
| **55,000 / 0.8 (chosen)** | **12.8** | **3.5 of 6** | **5.4** | **3.1 of 6** | **35 / 40** |
| 50,000 / 0.6 | 12.8 | 3.3 of 6 | 5.4 | 2.0 of 6 | 32 / 40 |
| 45,000 / 0.8 | 12.9 | 3.4 of 6 | 5.4 | 3.3 of 6 | 36 / 40 |
| 40,000 / 0.8 | 12.7 | 4.5 of 6 | 5.3 | 4.0 of 6 | 35 / 40 |
| 35,000 / 1.2 | 12.6 | 5.3 of 6 | 5.4 | 4.0 of 6 | 37 / 40 |

- **What Black now does in a run** (reference seeds, new dials): it unlocks 0.1–1.1 min before the run ends, and 0.23–1.42 Blacks are expected per cycle where it unlocks (0.02–0.29 before). It is still tap-only: helpers would need power 107.

### The Fresh Batch floor scaled by Flavors (`scaledFloor`, not applied)

Floor × (1 + 0.1 × Flavors), against the unscaled 5M floor, on the new dials:

| floor | casual C1..C6 (min) | engaged C1..C6 (min) | Flavors after C6 (casual / engaged) |
|---|---|---|---|
| unscaled (5M) | 12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4 | 6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3 | 19 / 19 |
| scaled, 10% per Flavor | 12.8 / 12.9 / 10.2 / 8.6 / 7.2 / 5.5 | 6.0 / 3.6 / 3.4 / 3.0 / 2.5 / 2.2 | 23 / 25 |

- **Not applied:** engaged C2 is 3.6 min, under 4, and C6 is not shorter than C5 in the unscaled run either. The rule needs every engaged cycle at 4 min or more, each shorter than the one before.
- **Why it barely moves anything:** with the floor at 5–7M, most runs end on a big pop (often a Black) that carries run juice well past the scaled floor too, so C1–C4 are identical. A 20% scale gave exactly the same cycle times on these seeds. The first run is unchanged by construction (0 Flavors).

### The artifact stack: duck off, plain duck, best-case duck

The duck is owned from minute 0 and never wiped. The 4-minute target applies to the no-duck run only. These are not tuned against.

| run | casual C1..C6 (min) | engaged C1..C6 (min) | Flavors / payout x after C6 (casual; engaged) |
|---|---|---|---|
| no duck | 12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4 | 6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3 | 19 x2.9; 19 x2.9 |
| plain duck (x1.4) | 11.0 / 8.6 / 6.2 / 5.0 / 4.1 / 4.6 | 3.6 / 3.3 / 2.6 / 2.1 / 2.4 / 1.8 | 19 x4.1; 21 x4.3 |
| best-case duck (x1.61) | 8.9 / 7.4 / 4.6 / 5.1 / 4.8 / 2.9 | 2.7 / 2.8 / 2.2 / 1.9 / 2.1 / 1.7 | 15 x4.0; 22 x5.2 |

How far under the 4-minute floor the duck runs fall:

- **Plain duck, casual:** no cycle under 4 min (shortest 4.1).
- **Plain duck, engaged:** all six cycles under, by 0.4 to 2.2 min (3.6 down to 1.8).
- **Best-case duck, casual:** one cycle under, C6 by 1.1 min (2.9).
- **Best-case duck, engaged:** all six under, by 1.2 to 2.3 min (2.8 down to 1.7).
- **Note:** the duck also shortens the first run, to 11.0 or 8.9 min casual and 3.6 or 2.7 min engaged. That is what a 10,000-Rose, multi-run purchase is for; the first-run targets apply to new players, who cannot own one.

### Waiting to minute 25 (report only, nothing changed)

`--wait=25`: the player keeps going to minute 25 every cycle.

| | before (20%, old Black) | now (10%, new Black) |
|---|---|---|
| casual, Flavors after 6 cycles | 1,827 (x366) | 2,238 (x224.8) |
| engaged, Flavors after 6 cycles | 3,567 (x714) | 4,871 (x488.1) |

- The payout multiplier is about a third lower (x225 and x488 against x366 and x714). Halving the bonus outweighs the 22–37% more Flavors.
- Those extra Flavors come from Black, which is now 79–87% of a long run's income (45–61% before), because it spawns about five times as often.
- **Flavors still explode when the player waits.** The square-root gain curve has no cap on overshoot; only a curve change would stop it.

### Per-Flavor bonus on the new Black dials (variants)

| bonus per Flavor | casual C1..C6 (min) | engaged C1..C6 (min) | Flavors / x after C6 (casual; engaged) |
|---|---|---|---|
| 20% (`flavor20`) | 12.8 / 10.5 / 8.8 / 6.4 / 5.7 / 4.9 | 6.0 / 3.4 / 2.6 / 2.4 / 2.0 / 1.6 | 18 x4.6; 15 x4.0 |
| **10% (now)** | 12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4 | 6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3 | 19 x2.9; 19 x2.9 |
| 5% (`flavor5`) | 12.8 / 13.3 / 9.8 / 8.0 / 8.2 / 7.8 | 6.0 / 4.0 / 5.0 / 3.5 / 3.5 / 3.0 | 19 x2.0; 16 x1.8 |

- Even at 5%, engaged C4–C6 fall under 4 min on these dials.

### Income share dominated by one type (over 60%)

Spawn weights other than Black's were not retuned. With Black now common, it is the type that dominates:

- **casual:** C2 Black 80.7%, C3 Black 86.3%, C4 Black 92.9%, C5 Ruby 71.5%, C6 Black 86.7%. (C1: Ruby 43.3%, the top type.)
- **engaged:** C1 Black 71.6%, C2 79.2%, C3 87.3%, C4 86.2%, C5 Ruby 83.9%. (C6: Opal 37.7%, the top type.)
- Before, Ruby, Opal or Marble dominated four casual cycles and one engaged cycle. Now 10 of 12 cycles have one dominant type, because one Black pop outweighs a whole run. This is the cost of option B named in the last report; spreading it out would need Black's payout (or the payout curve) to change, which this session leaves alone.

### Away bonus for 1 hour

#### The formula (`helperIdle` in `src/econ.js`)

It is the steady state of `stepAuto` and `trySpawn` with nobody playing:

- **Which pearls count.** Helpers only take pearls with hp ≤ 3 × the held tool's power (`helperCanHit`). A type they cannot break fills its cap and stays there, and `trySpawn` then turns its share of spawns into Rose. So its chance is moved to Rose, not spread over the other types.
- **Preference.** Helpers pick the best payout per remaining hit (`helperScore`, the same function `stepAuto` calls). With the board full, a spawn only happens when a pop frees a cell, so the greedy helper pops every hittable arrival and nothing good waits forever. The popped mix therefore equals the arrival mix, and the preference decides the order, not the totals.
- **Rate.** pops/s = helper hits/s ÷ mean hits per pop, unless the board runs dry; then pops/s = the spawn rate (4x in frenzy).
- **Value.** pops/s × popBase × Flavor multiplier × (sum of mix × payout) × the shiny bonus (1 + shiny chance × 4, when shinies are on).
- **Frenzy.** Helper pops fill the meter at 0.25 each, so helpers alone trigger frenzy: one every frenzyNeed ÷ (0.25 × pops/s) seconds, 7 s long, paying double with rare types twice as likely. The first fix left this out and paid about 12% too little at the Fresh Batch checkpoints, where frenzy was 9% of the time and 19% of the juice. `FRENZY_SECS` and `HELPER_METER` are now `ECON` constants, used by the game, the formula and the sim.

#### Calibration (new dials)

One hour away (`awayBonus(3600)`) against half of what helpers alone earned in one simulated hour (helperHour, mean of 4 seeds). The target is within 15%.

- All 24 checkpoints land between 0.88 and 1.04 (casual 0.88–1.03, engaged 0.90–1.04). `tests/away.test.js` holds the three reference checkpoints to 0.85–1.15 and passes.
- At the first Fresh Batch one hour away pays 7.2M (casual) and 5.0M (engaged).
- Black never counts: helpers cannot hit it.

### Variants (`node tools/sim32.js --compare`)

- `oldDials`: the dials before this session.
- `scaledFloor`: the floor × (1 + 0.1 × Flavors).
- `moreFlavors`: gain `floor(sqrt(run / 312,500))`, i.e. 4 Flavors at the floor.
- `moreTuneLevels`: higher max levels on Combo, Fuel, Spawn and Blue.
- `flavor20`, `flavor5`: each Flavor adds 20% or 5% instead of 10%.
- `pinkDuck`, `pinkDuckBest`: a plain (x1.4) or best-case (x1.61) duck from minute 0.

None is applied.

```
| variant | profile | taken min C1..C6 | Flavors total | payout x | upgrades maxed in C1 | nothing-to-want ignoring Sharp, min C1..C6 | furthest pearl C1..C6 |
|---|---|---|---|---|---|---|---|
| baseline | casual | 12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4 | 19 | 2.9 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| baseline | engaged | 6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3 | 19 | 2.9 | 9 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / ruby / black |
| baseline +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 2238 | 224.8 | 17 of 18 | 9.5 / 21.9 / 23.4 / 23.8 / 24.3 / 24.1 | black / black / black / black / black / black |
| baseline +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 4871 | 488.1 | 17 of 18 | 18.3 / 23.8 / 24.4 / 24.6 / 24.8 / 24.8 | black / black / black / black / black / black |
| oldDials | casual | 12.8 / 10.8 / 7.7 / 6.6 / 5.9 / 5.8 | 15 | 4.0 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / opal / black / black / black |
| oldDials | engaged | 6.2 / 3.5 / 3.1 / 3.1 / 2.1 / 2.4 | 13 | 3.6 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| oldDials +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 1827 | 366.4 | 17 of 18 | 8.5 / 21.4 / 23.6 / 24.0 / 24.5 / 24.4 | black / black / black / black / black / black |
| oldDials +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 3567 | 714.4 | 17 of 18 | 16.1 / 23.7 / 24.6 / 24.7 / 24.7 / 24.8 | black / black / black / black / black / black |
| scaledFloor | casual | 12.8 / 12.9 / 10.2 / 8.6 / 7.2 / 5.5 | 23 | 3.3 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| scaledFloor | engaged | 6.0 / 3.6 / 3.4 / 3.0 / 2.5 / 2.2 | 25 | 3.5 | 9 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.1 / 0.1 | black / black / black / black / black / black |
| scaledFloor +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 2238 | 224.8 | 17 of 18 | 9.5 / 21.9 / 23.4 / 23.8 / 24.3 / 24.1 | black / black / black / black / black / black |
| scaledFloor +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 4871 | 488.1 | 17 of 18 | 18.3 / 23.8 / 24.4 / 24.6 / 24.8 / 24.8 | black / black / black / black / black / black |
| moreFlavors | casual | 12.8 / 10.5 / 8.4 / 4.1 / 3.4 / 3.5 | 48 | 5.8 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / ruby / ruby / black |
| moreFlavors | engaged | 6.0 / 3.4 / 2.6 / 2.4 / 2.0 / 1.6 | 30 | 4.0 | 9 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| moreFlavors +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 8361 | 837.1 | 17 of 18 | 9.5 / 22.0 / 23.9 / 24.3 / 24.6 / 24.7 | black / black / black / black / black / black |
| moreFlavors +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 18204 | 1821.4 | 17 of 18 | 18.3 / 24.3 / 24.7 / 24.8 / 25.0 / 25.0 | black / black / black / black / black / black |
| moreTuneLevels | casual | 13.2 / 11.9 / 7.9 / 6.3 / 6.5 / 4.9 | 21 | 3.1 | 5 of 18 | 0.0 / 0.1 / 0.1 / 0.0 / 0.0 / 0.0 | ruby / black / black / black / black / ruby |
| moreTuneLevels | engaged | 5.5 / 5.2 / 5.3 / 2.8 / 2.0 / 2.2 | 14 | 2.4 | 6 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.1 / 0.0 | black / black / black / black / black / black |
| moreTuneLevels +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 3825 | 383.5 | 17 of 18 | 10.0 / 21.4 / 23.6 / 23.9 / 24.4 / 24.5 | black / black / black / black / black / black |
| moreTuneLevels +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 10202 | 1021.2 | 17 of 18 | 19.1 / 24.2 / 24.6 / 24.9 / 24.9 / 25.0 | black / black / black / black / black / black |
| flavor20 | casual | 12.8 / 10.5 / 8.8 / 6.4 / 5.7 / 4.9 | 18 | 4.6 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| flavor20 | engaged | 6.0 / 3.4 / 2.6 / 2.4 / 2.0 / 1.6 | 15 | 4.0 | 9 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| flavor20 +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 4130 | 827.0 | 17 of 18 | 9.5 / 22.5 / 23.8 / 24.5 / 24.6 / 24.6 | black / black / black / black / black / black |
| flavor20 +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 9111 | 1823.2 | 17 of 18 | 18.3 / 24.1 / 24.5 / 24.8 / 25.0 / 25.0 | black / black / black / black / black / black |
| flavor5 | casual | 12.8 / 13.3 / 9.8 / 8.0 / 8.2 / 7.8 | 19 | 2.0 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| flavor5 | engaged | 6.0 / 4.0 / 5.0 / 3.5 / 3.5 / 3.0 | 16 | 1.8 | 9 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| flavor5 +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 1296 | 65.8 | 17 of 18 | 9.5 / 19.3 / 22.5 / 23.3 / 23.6 / 23.7 | black / black / black / black / black / black |
| flavor5 +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 2924 | 147.2 | 17 of 18 | 18.3 / 23.3 / 24.2 / 24.3 / 24.5 / 24.6 | black / black / black / black / black / black |
| pinkDuck | casual | 11.0 / 8.6 / 6.2 / 5.0 / 4.1 / 4.6 | 19 | 4.1 | 9 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / ruby / black |
| pinkDuck | engaged | 3.6 / 3.3 / 2.6 / 2.1 / 2.4 / 1.8 | 21 | 4.3 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| pinkDuck +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 3065 | 430.5 | 17 of 18 | 12.0 / 22.4 / 23.6 / 24.0 / 24.3 / 24.5 | black / black / black / black / black / black |
| pinkDuck +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 7000 | 981.4 | 17 of 18 | 20.5 / 24.2 / 24.5 / 24.8 / 24.9 / 25.0 | black / black / black / black / black / black |
| pinkDuckBest | casual | 8.9 / 7.4 / 4.6 / 5.1 / 4.8 / 2.9 | 15 | 4.0 | 7 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.1 / 0.0 | ruby / black / ruby / black / black / opal |
| pinkDuckBest | engaged | 2.7 / 2.8 / 2.2 / 1.9 / 2.1 / 1.7 | 22 | 5.2 | 7 of 18 | 0.0 / 0.0 / 0.0 / 0.1 / 0.0 / 0.0 | ruby / black / black / black / black / black |
| pinkDuckBest +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 3640 | 587.6 | 17 of 18 | 14.2 / 22.7 / 23.7 / 24.3 / 24.4 / 24.7 | black / black / black / black / black / black |
| pinkDuckBest +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 8029 | 1294.3 | 17 of 18 | 21.4 / 24.2 / 24.6 / 24.7 / 24.9 / 24.9 | black / black / black / black / black / black |
```

The full rule A tables: `node tools/sim32.js --variant=ruleA` (and `--wait=25`).
