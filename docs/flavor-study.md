# Flavor study (2026-10-24)

A study only: the game code, saves and tests did not change. All numbers come from `node tools/sim32.js --flavors` and
`node tools/sim32.js --flavors-ducks=C` (seeded; two runs give identical output; the default sim output is unchanged).
Each lifetime rule can also be played through the usual report with `--variant=flavorB` to `--variant=flavorE`.

## The rules compared

- A: live rule: floor(sqrt(run / 1.25M)), ready at 5M run juice with a gain of at least 2
- B: lifetime: owed floor(sqrt(lifetime / 1.25M)), pays the difference, at least 2
- C: B, and ready only once the gain is at least 50% of the Flavors held
- D: B, and ready only once the gain is at least 100% of the Flavors held
- E: B with exponent 0.4: owed floor((lifetime / 883883)^0.4), still 2 at the first 5M
All rules: the 5M run floor, 10% payout per Flavor, no artifacts unless named.

"Lifetime" is all juice earned in every run so far (in the sim: the sum of run juice; in the game it is `state.lifetime`, which
also counts the away bonus and sold backpack pearls). Under B to E a Fresh Batch pays the Flavors owed minus the Flavors held,
so a run that is reset early pays little, and its juice is not lost: it still counts toward the next one.

Strategies (the key output): for 3 hours of play, a player resets the moment it is ready ("at once"), only once the gain is at
least the Flavors already held ("+100%"), or keeps going to minute 25 of every run ("minute 25"). A good rule keeps the three
close, so the player's reset habit does not decide the outcome.

## Strategies over 3 hours of play: Flavors held (payout x) at 1, 2 and 3 hours

Strategies: at once = Fresh Batch the moment it is ready; +100% = only once the gain is at least the Flavors held; minute 25 = keep playing to minute 25 of each run.
Spread = the best strategy's 3-hour payout over the worst one's (1.00 = they end level).

| rule | profile | at once 1h / 2h / 3h | +100% 1h / 2h / 3h | minute 25 1h / 2h / 3h | resets (at once / +100% / 25) | spread at 3h | best |
|---|---|---|---|---|---|---|---|
| A | casual | 19 (x2.9) / 99 (x10.9) / 273 (x28.3) | 82 (x9.2) / 658 (x66.8) / 1316 (x132.6) | 167 (x17.7) / 863 (x87.3) / 3293 (x330.3) | 69 / 10 / 7 | 11.67 | minute 25 |
| A | engaged | 137 (x14.7) / 697 (x70.7) / 1853 (x186.3) | 1025 (x103.5) / 2050 (x206.0) / 4101 (x411.1) | 338 (x34.8) / 1828 (x183.8) / 7101 (x711.1) | 323 / 11 / 7 | 3.82 | minute 25 |
| B | casual | 10 (x2.0) / 35 (x4.5) / 67 (x7.7) | 32 (x4.2) / 256 (x26.6) / 512 (x52.2) | 133 (x14.3) / 423 (x43.3) / 970 (x98.0) | 32 / 9 / 7 | 12.73 | minute 25 |
| B | engaged | 52 (x6.2) / 154 (x16.4) / 296 (x30.6) | 448 (x45.8) / 896 (x90.6) / 1792 (x180.2) | 275 (x28.5) / 937 (x94.7) / 2193 (x220.3) | 132 / 10 / 7 | 7.20 | minute 25 |
| C | casual | 18 (x2.8) / 216 (x22.6) / 486 (x49.6) | 32 (x4.2) / 256 (x26.6) / 512 (x52.2) | 133 (x14.3) / 423 (x43.3) / 953 (x96.3) | 13 / 9 / 6 | 1.94 | minute 25 |
| C | engaged | 434 (x44.4) / 977 (x98.7) / 2199 (x220.9) | 448 (x45.8) / 896 (x90.6) / 1792 (x180.2) | 275 (x28.5) / 937 (x94.7) / 2109 (x211.9) | 16 / 10 / 6 | 1.23 | at once |
| D | casual | 32 (x4.2) / 256 (x26.6) / 512 (x52.2) | 32 (x4.2) / 256 (x26.6) / 512 (x52.2) | 133 (x14.3) / 266 (x27.6) / 532 (x54.2) | 9 / 9 / 4 | 1.04 | minute 25 |
| D | engaged | 448 (x45.8) / 896 (x90.6) / 1792 (x180.2) (stalled) | 448 (x45.8) / 896 (x90.6) / 1792 (x180.2) (stalled) | 275 (x28.5) / 1146 (x115.6) / 1146 (x115.6) | 10 / 10 / 4 | 1.56 | at once |
| E | casual | 10 (x2.0) / 30 (x4.0) / 52 (x6.2) | 16 (x2.6) / 64 (x7.4) / 64 (x7.4) | 46 (x5.6) / 89 (x9.9) / 144 (x15.4) | 26 / 6 / 7 | 2.48 | minute 25 |
| E | engaged | 37 (x4.7) / 87 (x9.7) / 139 (x14.9) | 96 (x10.6) / 96 (x10.6) / 192 (x20.2) | 77 (x8.7) / 153 (x16.3) / 253 (x26.3) | 69 / 7 / 7 | 1.77 | minute 25 |

"(stalled)": a run went past 120 minutes without a Fresh Batch becoming ready, so the play stops there (it earns nothing more
before the horizon).

## Six cycles: minutes, Flavors held and payout multiplier after each cycle

| rule | profile | policy | minutes C1..C6 | Flavors after each | payout x after each |
|---|---|---|---|---|---|
| A | casual | at once | 12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4 | 2 / 5 / 8 / 13 / 15 / 19 | 1.2 / 1.5 / 1.8 / 2.3 / 2.5 / 2.9 |
| A | casual | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 40 / 167 / 426 / 863 / 1462 / 2238 | 5.0 / 17.7 / 43.6 / 87.3 / 147.2 / 224.8 |
| A | engaged | at once | 6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3 | 3 / 6 / 11 / 15 / 17 / 19 | 1.3 / 1.6 / 2.1 / 2.5 / 2.7 / 2.9 |
| A | engaged | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 74 / 338 / 903 / 1828 / 3137 / 4871 | 8.4 / 34.8 / 91.3 / 183.8 / 314.7 / 488.1 |
| B | casual | at once | 12.8 / 12.9 / 11.7 / 9.0 / 7.9 / 7.3 | 2 / 4 / 6 / 8 / 10 / 12 | 1.2 / 1.4 / 1.6 / 1.8 / 2.0 / 2.2 |
| B | casual | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 40 / 133 / 263 / 423 / 598 / 784 | 5.0 / 14.3 / 27.3 / 43.3 / 60.8 / 79.4 |
| B | engaged | at once | 6.0 / 3.7 / 3.8 / 3.3 / 3.0 / 2.5 | 3 / 5 / 7 / 10 / 12 / 14 | 1.3 / 1.5 / 1.7 / 2.0 / 2.2 / 2.4 |
| B | engaged | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 74 / 275 / 571 / 937 / 1351 / 1748 | 8.4 / 28.5 / 58.1 / 94.7 / 136.1 / 175.8 |
| C | casual | at once | 12.8 / 12.9 / 11.7 / 9.2 / 7.7 / 6.4 | 2 / 4 / 6 / 12 / 18 / 27 | 1.2 / 1.4 / 1.6 / 2.2 / 2.8 / 3.7 |
| C | casual | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 29.4 / 44.0 | 40 / 133 / 263 / 423 / 635 / 953 | 5.0 / 14.3 / 27.3 / 43.3 / 64.5 / 96.3 |
| C | engaged | at once | 6.0 / 3.7 / 4.0 / 4.5 / 3.9 / 3.0 | 3 / 5 / 9 / 14 / 21 / 37 | 1.3 / 1.5 / 1.9 / 2.4 / 3.1 / 4.7 |
| C | engaged | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 28.7 / 44.1 | 74 / 275 / 571 / 937 / 1406 / 2109 | 8.4 / 28.5 / 58.1 / 94.7 / 141.6 / 211.9 |
| D | casual | at once | 12.8 / 12.9 / 12.2 / 10.4 / 9.1 / 10.9 | 2 / 4 / 8 / 16 / 32 / 64 | 1.2 / 1.4 / 1.8 / 2.6 / 4.2 / 7.4 |
| D | casual | to minute 25 | 25.0 / 25.0 / 25.5 / 47.3 / 87.8 / >120 | 40 / 133 / 266 / 532 / 1065 / 1065 | 5.0 / 14.3 / 27.6 / 54.2 / 107.5 / 107.5 |
| D | engaged | at once | 6.0 / 3.8 / 5.5 / 4.6 / 4.5 / 6.3 | 3 / 7 / 14 / 28 / 56 / 112 | 1.3 / 1.7 / 2.4 / 3.8 / 6.6 / 12.2 |
| D | engaged | to minute 25 | 25.0 / 25.0 / 25.0 / 40.8 / 87.9 / >120 | 74 / 275 / 571 / 1146 / 2292 / 2292 | 8.4 / 28.5 / 58.1 / 115.6 / 230.2 / 230.2 |
| E | casual | at once | 12.8 / 13.2 / 12.0 / 10.0 / 8.0 / 8.2 | 2 / 4 / 6 / 8 / 10 / 12 | 1.2 / 1.4 / 1.6 / 1.8 / 2.0 / 2.2 |
| E | casual | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 22 / 46 / 69 / 89 / 108 / 128 | 3.2 / 5.6 / 7.9 / 9.9 / 11.8 / 13.8 |
| E | engaged | at once | 6.0 / 3.8 / 4.4 / 3.7 / 3.3 / 3.3 | 3 / 5 / 7 / 9 / 11 / 13 | 1.3 / 1.5 / 1.7 / 1.9 / 2.1 / 2.3 |
| E | engaged | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 36 / 77 / 117 / 153 / 189 / 222 | 4.6 / 8.7 / 12.7 / 16.3 / 19.9 / 23.2 |

## Early timings, Fresh Batch at once: first Fresh Batch ready, then cycles 2-6 (minutes)

Marks: * under 4 minutes, ^ longer than the cycle before.

| rule | profile | C1 ready | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|---|
| A | casual | 12.8 | 12.9^ | 10.2 | 8.6 | 6.6 | 5.4 |
| A | engaged | 6.0 | 3.6* | 3.4* | 3.0* | 2.2* | 2.3*^ |
| B | casual | 12.8 | 12.9^ | 11.7 | 9.0 | 7.9 | 7.3 |
| B | engaged | 6.0 | 3.7* | 3.8*^ | 3.3* | 3.0* | 2.5* |
| C | casual | 12.8 | 12.9^ | 11.7 | 9.2 | 7.7 | 6.4 |
| C | engaged | 6.0 | 3.7* | 4.0*^ | 4.5^ | 3.9* | 3.0* |
| D | casual | 12.8 | 12.9^ | 12.2 | 10.4 | 9.1 | 10.9^ |
| D | engaged | 6.0 | 3.8* | 5.5^ | 4.6 | 4.5 | 6.3^ |
| E | casual | 12.8 | 13.2^ | 12.0 | 10.0 | 8.0 | 8.2^ |
| E | engaged | 6.0 | 3.8* | 4.4^ | 3.7* | 3.3* | 3.3* |

C2 runs 0.1 to 0.4 min longer than the first run's ready time under every rule; that was already so under A (seed noise).

## Rule C with ducks

| ducks | profile | policy | minutes C1..C6 | Flavors after each | payout x after each |
|---|---|---|---|---|---|
| Pink Duck (Common) | casual | at once | 11.0 / 8.6 / 6.5 / 5.5 / 5.5 / 5.1 | 3 / 5 / 8 / 12 / 18 / 27 | 1.8 / 2.1 / 2.5 / 3.1 / 3.9 / 5.2 |
| Pink Duck (Common) | casual | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 26.7 / 44.7 | 46 / 172 / 355 / 584 / 876 / 1314 | 7.8 / 25.5 / 51.1 / 83.2 / 124.0 / 185.4 |
| Pink Duck (Common) | engaged | at once | 3.6 / 3.3 / 2.7 / 2.9 / 3.1 / 3.0 | 2 / 4 / 6 / 10 / 15 / 23 | 1.7 / 2.0 / 2.2 / 2.8 / 3.5 / 4.6 |
| Pink Duck (Common) | engaged | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 42.2 | 95 / 387 / 815 / 1304 / 1958 / 2937 | 14.7 / 55.6 / 115.5 / 184.0 / 275.5 / 412.6 |
| all ten (Common) | casual | at once | 7.1 / 6.2 / 5.2 / 4.7 / 4.2 / 4.3 | 2 / 5 / 12 / 18 / 27 / 41 | 1.7 / 2.1 / 3.1 / 3.9 / 5.2 / 7.1 |
| all ten (Common) | casual | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 32.1 / 42.7 | 68 / 249 / 514 / 827 / 1242 / 1864 | 10.9 / 36.3 / 73.4 / 117.2 / 175.3 / 262.4 |
| all ten (Common) | engaged | at once | 2.9 / 3.0 / 2.5 / 2.1 / 2.3 / 2.1 | 4 / 8 / 13 / 20 / 32 / 49 | 2.0 / 2.5 / 3.2 / 4.2 / 5.9 / 8.3 |
| all ten (Common) | engaged | to minute 25 | 25.0 / 25.0 / 25.0 / 25.0 / 25.5 / 42.4 | 115 / 499 / 1093 / 1827 / 2742 / 4114 | 17.5 / 71.3 / 154.4 / 257.2 / 385.3 / 577.4 |

| ducks | profile | at once 1h / 2h / 3h | +100% 1h / 2h / 3h | minute 25 1h / 2h / 3h | spread at 3h |
|---|---|---|---|---|---|
| Pink Duck (Common) | casual | 63 / 485 / 1092 | 113 / 454 / 908 | 172 / 584 / 1314 | 1.44 |
| Pink Duck (Common) | engaged | 649 / 1464 / 3294 | 620 / 1241 / 2482 | 387 / 1304 / 2937 | 1.33 |
| all ten (Common) | casual | 213 / 1080 / 1620 | 192 / 770 / 1540 | 249 / 827 / 1864 | 1.21 |
| all ten (Common) | engaged | 853 / 2887 / 4331 | 621 / 2486 / 2486 | 499 / 1827 / 4114 | 1.74 |

Ducks shorten every run (all ten Common ducks: casual C1 7.1 min, engaged runs 2 to 3 min) but keep the strategy spread at
1.21 to 1.74. How hard ducks stack (docs/duck-report.md) is a separate question from the Flavor rule.

## Reading the results

- **A (today):** the reset habit decides everything. Waiting to minute 25 ends 3 hours at x330 (casual) against x28 for
  resetting at once: 11.7 times apart (3.8 engaged). Engaged later cycles run 2.2 to 3.6 min.
- **B (plain lifetime sqrt):** worse than A on the spread (12.7 casual, 7.2 engaged). Resetting at once pays 2 Flavors per
  reset again and again (32 to 132 resets in 3 hours) and throws away the run's own growth each time.
- **C (lifetime, ready at +50% of held):** the three strategies end 1.94 apart (casual) and 1.23 (engaged). For engaged play
  resetting at once is now the best habit, not the worst, and waiting to minute 25 wins by less than 2 times for casual.
  Casual cycles keep shrinking slowly (12.8 to 6.4 min). Engaged cycles 2 to 6 are still 3.0 to 4.5 min.
- **D (lifetime, ready at +100%):** the tightest spread for casual (1.04), but each Fresh Batch needs 4 times the lifetime juice
  of the last, so runs grow: engaged play stalls after 2 hours (a run of more than 120 minutes), and to-minute-25 play stalls
  for both profiles. Cycles get longer (^) instead of shorter.
- **E (exponent 0.4):** flat and slow: x6 to x26 after 3 hours, and the +100% strategy stalls between 2 and 3 hours for casual
  (64 Flavors at both marks). Spread 2.48 and 1.77.

## Recommendation: rule C

Rule C keeps the reset habit from deciding the outcome (spread 1.2 to 1.9, against 3.8 to 11.7 today) without the walls of D or
the flatness of E. The first Fresh Batch stays exactly as it is (2 Flavors at the 5M floor, ready at minute 12.8 casual and 6.0
engaged), and so does the 10% per Flavor. Waiting still pays a little more for casual play, which is fine: the player chose to
play longer.

What it does not fix: engaged cycles 2 to 6 still run under 4 minutes in most cells, and ducks shorten runs further. That needs a
run-length lever (the floor, or the 2-Flavor minimum), not the Flavor formula.

## The code it would take

- `src/econ.js`:
  - add `FLAVOR_NEED = 0.5` next to `COLLAPSE_GAIN_DIV` (1.25M stays: the first Fresh Batch still gives exactly 2);
  - add `flavorsOwed(life) = Math.floor(Math.sqrt(life / COLLAPSE_GAIN_DIV) + 1e-9)` (the 1e-9 keeps an exact 2 from flooring
    to 1 after rounding);
  - `collapseGain(run, echoes, life)` becomes `Math.max(0, flavorsOwed(life) - echoes)`;
  - `collapseReady(run, echoes, life)` becomes `run >= COLLAPSE_MIN_RUN && collapseGain(...) >= Math.max(2, Math.ceil(FLAVOR_NEED * echoes))`.
- `src/ui.js`: the three callers (`updateShelf` for the button and its text, the Fresh Batch click, and `collapse.gain`) pass
  `state.echoes` and the Flavor juice (below). The not-ready text should say what is missing, for example "Earn 4.2B more juice
  for +6 Flavors (you need at least 10)", and the `fresh` goal text likewise.
- **Saves:** add one saved number, `flavorJuice` (the lifetime juice the formula reads), with a v9 to v10 migration that sets
  `flavorJuice = max(lifetime, COLLAPSE_GAIN_DIV x echoes^2)`. Without it, existing players hold more Flavors than rule C owes for
  their lifetime juice (rule A pays more per reset, because sqrt is concave), and they would need 9 to 10 times their lifetime
  juice before the next Fresh Batch. With it every Flavor already earned stays valid, and the next Fresh Batch needs 2.25 to 2.33
  times the Flavor juice: the same step a new player at that count faces. Measured on rule-A saves after six runs:
  - casual at once: 19 Flavors, lifetime 1.12e8; rule C owes 9; the next reset would need x9.4 lifetime, x2.33 with the migration;
  - engaged at once: 19 Flavors, 1.04e8; owes 9; x10.1, x2.33 with the migration;
  - casual to minute 25: 2,238 Flavors, 1.55e12; owes 1,113; x9.1, x2.25 with the migration;
  - engaged to minute 25: 4,871 Flavors, 7.47e12; owes 2,444; x8.9, x2.25 with the migration.
  `flavorJuice` grows wherever `lifetime` grows (`award`, `cashIn`, the away bonus). Fresh Batch keeps it, Reset save clears
  it, and it goes through export, import and backups like the rest of the save. `echoes` is unchanged: no Flavors are taken away.
- `tools/sim32.js`: the rule moves from the `flavorC` variant into the copies that `checkCopies()` compares.
- Tests: `tests/econ32.test.js` (the Fresh Batch dials), and every harness test that sets `runEarned` to reach a Fresh Batch
  (the artifact, relic, duck and stats tests) must also set the Flavor juice.

## What the player would notice

- The first Fresh Batch is exactly as today: 2 Flavors at 5M.
- Later, the Fresh Batch gain grows with the whole journey, not just this run, so "+6 Flavors" can show soon after a reset if
  the last run went long. It stays locked until the gain reaches half the Flavors held (at least 2): resetting again and again
  for tiny gains is no longer possible, and juice from a short run is never wasted.
- Waiting longer still pays more Flavors at once, but quick resets catch up, so neither habit is punished.
- Existing players keep every Flavor. With the migration, their next Fresh Batch comes after about 2.3 times their juice so far.

## Found while studying (not fixed)

- **Kept pearls feed a later run's Flavors.** Selling backpack pearls adds their stored value to the current run's juice
  (`cashIn` in `src/ui.js`), and kept stacks survive a Fresh Batch. A player can keep pearls over several runs and sell them in
  one run, raising that run's Flavors under rule A. Under a lifetime rule this stops mattering: the juice counts once, whenever
  it is sold.
- The away bonus also counts as run juice, so a long absence just before a Fresh Batch raises its Flavors under rule A.

## Limits

- One seed per profile; earlier reports show single seeds vary by up to a minute per cycle.
- The sim never sells the backpack, never takes the away bonus, and holds its best tool. Its "+100%" strategy waits for the
  gain to reach the Flavors held (under A: the run's own gain).
- Ducks are plain Common copies owned from minute 0.
