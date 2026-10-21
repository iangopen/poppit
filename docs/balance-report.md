# Poppit balance report: frenzy x4, steeper payouts, retuned dials

Date: 2026-10-21. Numbers come from `tools/sim32.js` on the economy in `src/econ.js` at this commit. The previous report (2026-10-18) measured the economy before Chain Reaction was removed; its numbers and options A/B/C are superseded by this one.

## What changed

- **Frenzy is 4x harder to trigger.** `stats().frenzyNeed` is `200 - 24 × Fuel level` (200 at Fuel 0, 80 at Fuel 5), up from `50 - 6 × Fuel`. Frenzy still lasts 7 s, a tap still adds 1 to the meter and a helper pop 0.25.
- **Payouts are steeper.** `PAYOUT_STEEPNESS = 1.5`. Each type pays `base × 1.5^rank`, rounded to two significant figures, where rank is the type's position in `PEARLS` (Rose is 0). The old table is kept as `baseMult`. Hits per type did not change.
- **The away bonus follows the economy.** `idleRate(S, pool, L)` is `autoRate × popBase × echoMult × popEV(pool, L)`, where `popEV` is the sum of chance × payout over the pooled types. Before, a fixed 1.2 stood in for the payout. It still pays 50% and is still capped at 8 h.
- **Global dials retuned** (the only levers moved):

| dial | before | now |
|---|---|---|
| `COST_SCALE` | 6 | 2.5 |
| Helpers base cost (`UPG.auto.base`) | 8,500 | 45,000 |
| `COLLAPSE_MIN_RUN` | 1.2M | 5M |
| `collapseGain(run)` | `floor(sqrt(run / 12,500))` | `floor(sqrt(run / 1,250,000))` (`COLLAPSE_GAIN_DIV`), exactly 2 Flavors at the floor |

## Payout table

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

## How this was measured

- `npm run sim` plays **6 consecutive Fresh Batch cycles** for two profiles, seeded (seed 1 casual, seed 2 engaged), so the output is identical run to run.
  - **casual:** 1.5 taps/s, skill 0.3
  - **engaged:** 2.5 taps/s, skill 0.7
- Fresh Batch wipes what `finishCollapse()` / `resetRun()` / `resetTools()` / `zeroInv()` wipe and keeps Flavors, discoveries and the pool. The per-type spawn cap is enforced like `trySpawn()`. The buy order is the cheapest affordable item each 0.1 s tick, with a first verb level at half weight and tools at 0.8 weight.
- The sim now reads `COST_SCALE` from `src/econ.js`, which it used to hard-code as 6. A variant can override an upgrade's base cost (`base: { auto: … }`) as well as its max level.
- **New columns:** `away 1 h at first helper` and `away 1 h at ready` are what `awayBonus(3600)` would pay at that moment: idle rate × 3,600 × 50%, with every type pooled.
- **Not modelled:** selling from the backpack, the Fresh Batch animation, actually taking the away bonus, switching types off in the pool, real cell counts (the sim uses 120 / 252 / 440), helper credit to the frenzy meter (taps only), and sweep (modelled as a doubled tap rate).
- **The nothing-to-want columns read 0.0 throughout, before and after this change.** Some item is always just out of reach. Treat those two columns as uninformative.

## Targets and result

| target | casual | engaged | met? |
|---|---|---|---|
| first Fresh Batch 11–13 min (casual), 6–8 min (engaged) | **12.8** | **6.2** | yes |
| first helper 70–90% of the way to it | 11.4 min = **89%** | 4.8 min = **77%** | yes |
| no upgrade group at max before the first Fresh Batch | none of verb / Pearls & Marbles / tune is fully maxed | same | yes (by group) |
| … read per upgrade instead | 10 of 18 upgrades reach max in C1 | 10 of 18 | **no** (6 of 18 before) |
| each later cycle shorter than the one before | 12.8 → 10.8 → 7.7 → 6.6 → 5.9 → 5.8 | 6.2 → 3.5 → 3.1 → 3.1 → 2.1 → 2.4 | casual yes, **engaged no** |
| no cycle under 4 min | min 5.8 | C2 to C6 are 2.1–3.5 | casual yes, **engaged no** |

### Why the engaged cycle targets miss

- `collapseReady` needs at least 2 Flavors, and each Flavor adds 0.2 to the payout multiplier. The new gain curve already gives the minimum: exactly 2 Flavors at the floor, so C2 plays at x1.4.
- Even that x1.4 takes engaged C2 from 6.2 to 3.5 min. Run income grows almost exponentially through the tool and pearl unlocks, so a constant multiplier removes a fixed slice of the run, and most of a 6-minute run is that slice.
- A floor that rises with the multiplier does not fix it either. `scaledFloor` (floor × (1 + 0.2 × Flavors)) gives engaged 6.2 / 3.5 / 3.5 / 2.7 / 2.6 / 2.3. Raising the floor to (1 + 0.2 × Flavors)² in a scratch run still left C2 at 3.9 min.
- Meeting the floor for engaged needs a change outside the four dials: a smaller multiplier per Flavor, or Fresh Batch costs that grow with Flavors.

### Why the per-upgrade "nothing maxed" reading misses

- The casual first run is bound by the early game, where Rose and Blue pay little and the steeper curve does not help. At `COST_SCALE` 6, casual cannot finish under about 19 min at any floor. Measured: 19.5 min at a 0.3M floor, 26 min at 1.2M.
- Getting casual to 11–13 min therefore needs a cost scale near 2.5. At that price, the cheap tune upgrades and the early unlocks (Blue, Mint, Spawn, Combo, Fuel, Board, plus Golden, Violet, Coral and the tool tiers) max inside the first run. The upgrade shelf empties sooner than it did before.

### How robust the first-run numbers are

- The sim's two seeds are the reference. Over seeds 1–8 the same dials give casual **12.7 min on average (10.3–14.5)** and engaged **5.6 min (3.8–6.9)**. The helper lands at 87% and 84% on average.
- On seed averages, casual sits about 2.3x longer than engaged at every setting of these four dials tried, and the target bands need at most 13 / 6 = 2.17x. The gap comes from tap rate and skill. The steeper payouts reward a skilled player who targets the valuable pearls. No global dial closes the gap, so the engaged average sits just under its band while the reference seed is inside it.

## Before and after (reference seeds, Fresh Batch taken at once)

| | casual before | casual after | engaged before | engaged after |
|---|---|---|---|---|
| first Fresh Batch (min) | 42.9 | 12.8 | 18.6 | 6.2 |
| first helper (min) | 36.1 (84%) | 11.4 (89%) | 14.9 (80%) | 4.8 (77%) |
| cycles 2–6 (min) | 15.8 / 9.7 / 7.2 / 5.9 / 4.8 | 10.8 / 7.7 / 6.6 / 5.9 / 5.8 | 6.2 / 3.9 / 2.5 / 2.1 / 1.7 | 3.5 / 3.1 / 3.1 / 2.1 / 2.4 |
| Flavors after 6 cycles | 57 (x12.4) | 15 (x4.0) | 55 (x12.0) | 13 (x3.6) |

## Away bonus for 1 hour

Measured at three points in the sim (every type pooled):

| point | casual | engaged | income/s at that cycle's end, for scale |
|---|---|---|---|
| C1, the moment the first helper is bought | 1.2M | 1.2M | |
| C1, Fresh Batch ready | 84.2M | 67.3M | 70K / 66K |
| C6, Fresh Batch ready | 207M | 193M | 332K / 197K |

**This is large.** One hour away at the end of the first run pays 13–17x the 5M floor, which is roughly 8 Flavors' worth of run juice where playing earns 2.

- The expected-payout formula assumes helpers pop the average pooled pearl. In the game, helpers only pick pearls they can break in three hits (`hp ≤ 3 × power`), and the per-type caps keep the rare, valuable types scarce. So the formula overstates what helpers earn live.
- Possible fixes, none applied:
  - limit `popEV` to the types helpers can break;
  - scale it down;
  - cap the bonus at a fraction of the run floor.

## Income share dominated by one type (over 60%)

Spawn weights were not retuned; this is only a report. One type takes over 60% of a cycle's income in these cycles:

- **casual:** C3 Opal 89.6%, C4 Ruby 81.3%, C5 Glass Marble 63.6%, C6 Ruby 79.1%.
- **engaged:** C6 Ruby 67.1%.
- In the other cycles the top type holds 31–46%.
- Black is unlocked in most cycles but earns 0%. With 320 hits, a cap of 1 and a weight of 0.15, it rarely spawns and is rarely finished before Fresh Batch.

## Waiting still explodes Flavors

With `--wait=25` (the player keeps going to minute 25), six cycles give 1,827 Flavors (x366) casual and 3,567 (x714) engaged. The square-root gain curve still rewards long runs without limit. See `--compare` below.

## Variants (`node tools/sim32.js --compare`)

- `scaledFloor`: the floor × (1 + 0.2 × Flavors).
- `moreFlavors`: gain `floor(sqrt(run / 312,500))`, i.e. 4 Flavors at the floor.
- `moreTuneLevels`: higher max levels on Combo, Fuel, Spawn and Blue. It halves the upgrades maxed in C1 (5 and 7 of 18) at about the same pacing, so it is a candidate fix for the empty shelf, but it is outside this session's dials.

None is applied.

```
| variant | profile | taken min C1..C6 | Flavors total | payout x | upgrades maxed in C1 | nothing-to-want ignoring Sharp, min C1..C6 | furthest pearl C1..C6 |
|---|---|---|---|---|---|---|---|
| baseline | casual | 12.8 / 10.8 / 7.7 / 6.6 / 5.9 / 5.8 | 15 | 4.0 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / opal / black / black / black |
| baseline | engaged | 6.2 / 3.5 / 3.1 / 3.1 / 2.1 / 2.4 | 13 | 3.6 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| baseline +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 1827 | 366.4 | 17 of 18 | 8.5 / 21.4 / 23.6 / 24.0 / 24.5 / 24.4 | black / black / black / black / black / black |
| baseline +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 3567 | 714.4 | 17 of 18 | 16.1 / 23.7 / 24.6 / 24.7 / 24.7 / 24.8 | black / black / black / black / black / black |
| scaledFloor | casual | 12.8 / 10.8 / 8.0 / 6.4 / 6.1 / 4.5 | 19 | 4.8 | 10 of 18 | 0.0 / 0.0 / 0.1 / 0.0 / 0.0 / 0.1 | black / black / black / black / black / black |
| scaledFloor | engaged | 6.2 / 3.5 / 3.5 / 2.7 / 2.6 / 2.3 | 16 | 4.2 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.1 / 0.0 / 0.1 | black / black / black / black / black / black |
| scaledFloor +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 1827 | 366.4 | 17 of 18 | 8.5 / 21.4 / 23.6 / 24.0 / 24.5 / 24.4 | black / black / black / black / black / black |
| scaledFloor +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 3567 | 714.4 | 17 of 18 | 16.1 / 23.7 / 24.6 / 24.7 / 24.7 / 24.8 | black / black / black / black / black / black |
| moreFlavors | casual | 12.8 / 8.4 / 4.5 / 3.5 / 2.7 / 2.3 | 38 | 8.6 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.1 / 0.1 | black / black / black / ruby / black / black |
| moreFlavors | engaged | 6.2 / 3.1 / 2.0 / 2.1 / 1.3 / 1.2 | 30 | 7.0 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.1 / 0.0 | black / black / ruby / black / black / black |
| moreFlavors +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 6616 | 1324.2 | 17 of 18 | 8.5 / 21.7 / 23.8 / 24.5 / 24.6 / 24.9 | black / black / black / black / black / black |
| moreFlavors +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 13914 | 2783.8 | 17 of 18 | 16.1 / 23.9 / 24.8 / 25.0 / 25.0 / 25.0 | black / black / black / black / black / black |
| moreTuneLevels | casual | 13.2 / 10.2 / 6.9 / 5.7 / 5.9 / 5.2 | 14 | 3.8 | 5 of 18 | 0.0 / 0.0 / 0.1 / 0.0 / 0.1 / 0.0 | ruby / black / black / black / black / black |
| moreTuneLevels | engaged | 5.7 / 3.6 / 2.9 / 2.4 / 1.9 / 1.7 | 13 | 3.6 | 7 of 18 | 0.0 / 0.0 / 0.0 / 0.1 / 0.1 / 0.0 | black / black / black / black / black / opal |
| moreTuneLevels +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 5083 | 1017.6 | 17 of 18 | 9.2 / 22.9 / 24.3 / 24.5 / 24.8 / 24.8 | black / black / black / black / black / black |
| moreTuneLevels +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 8778 | 1756.6 | 17 of 18 | 17.8 / 24.3 / 24.8 / 25.0 / 25.0 / 25.0 | black / black / black / black / black / black |
```

## Baseline tables: Fresh Batch taken as soon as it is ready


### casual (1.5 taps/s, skill 0.3, seed 1)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 12.8 | 11.4 | 12.8 | 6.0M | +2 | 2 | 1.4 | 0.0 | 0.0 | 70K | black | 1.2M | 84.2M |
| 2 | 10.8 | 9.3 | 10.8 | 8.5M | +2 | 4 | 1.8 | 0.0 | 0.0 | 110K | black | 1.7M | 94.3M |
| 3 | 7.7 | - | 7.7 | 6.2M | +2 | 6 | 2.2 | 0.0 | 0.0 | 98K | opal | 0 | 0 |
| 4 | 6.6 | 5.3 | 6.6 | 14.0M | +3 | 9 | 2.8 | 0.0 | 0.0 | 206K | black | 2.7M | 87.9M |
| 5 | 5.9 | 4.1 | 5.9 | 7.3M | +2 | 11 | 3.2 | 0.0 | 0.0 | 87K | black | 3.4M | 181M |
| 6 | 5.8 | 4.6 | 5.8 | 21.8M | +4 | 15 | 4.0 | 0.0 | 0.0 | 332K | black | 9.3M | 207M |

Minute each upgrade reaches max level (- = not maxed before Fresh Batch):

| upgrade (max) | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| tool (5) | 12.7 | 10.5 | - | - | 5.4 | 5.6 |
| lucky (8) | 6.4 | 4.5 | 3.6 | 2.8 | 2.6 | 2.1 |
| auto (20) | - | - | - | - | - | - |
| sharp (99) | - | - | - | - | - | - |
| mint (5) | 8.7 | 7.1 | 5.2 | 4.6 | 3.3 | 2.7 |
| golden (6) | 11.4 | 9.3 | - | 5.3 | 4.2 | 3.8 |
| violet (5) | 11.5 | 9.3 | - | 5.4 | 4.7 | 4.6 |
| coral (5) | 12.7 | 10.5 | - | - | 5.8 | 5.6 |
| marble (5) | - | - | - | - | - | - |
| opal (5) | - | - | - | - | - | - |
| ruby (5) | - | - | - | - | - | - |
| black (5) | - | - | - | - | - | - |
| shiny (10) | - | - | - | - | - | - |
| spawn (12) | 8.4 | 6.9 | 5.2 | 4.2 | 3.1 | 2.6 |
| combo (10) | 5.5 | 4.0 | 3.2 | 2.5 | 2.1 | 1.6 |
| fuel (5) | 6.2 | 4.2 | 3.6 | 2.7 | 2.2 | 1.9 |
| tempo (10) | - | - | - | - | - | - |
| board (2) | 10.7 | 7.9 | 6.6 | 4.7 | 3.6 | 3.1 |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 0.7 | 0.7 | 0.7 | 0.4 | 1.1 | 0.4 |
| blue | 0.5 | 0.4 | 0.5 | 0.1 | 0.3 | 0.2 |
| mint | 0.9 | 0.8 | 0.9 | 0.6 | 1.5 | 0.7 |
| golden | 1.1 | 2.3 | 1.5 | 2.1 | 2.7 | 1.3 |
| violet | 3.3 | 5.4 | 4.1 | 1.7 | 11.1 | 2.9 |
| coral | 8.6 | 3.1 | 2.6 | 2.2 | 19.8 | 6.4 |
| marble | 31.3 | 20.8 | 0.0 | 11.6 | 63.6 | 8.9 |
| opal | 10.3 | 22.2 | 89.6 | 0.0 | 0.0 | 0.0 |
| ruby | 43.3 | 44.2 | 0.0 | 81.3 | 0.0 | 79.1 |
| black | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |

Tools bought: C1 Awl@0.9, Brass Mallet@2.6, Steel Hammer@6.6, Sledgehammer@10.8, Diamond Hammer@12.7 / C2 Awl@0.8, Brass Mallet@2.0, Steel Hammer@4.8, Sledgehammer@8.3, Diamond Hammer@10.5 / C3 Awl@0.7, Brass Mallet@1.7, Steel Hammer@3.7, Sledgehammer@7.0 / C4 Awl@0.5, Brass Mallet@1.6, Steel Hammer@2.9, Sledgehammer@5.1 / C5 Awl@0.5, Brass Mallet@1.2, Steel Hammer@2.6, Sledgehammer@3.9, Diamond Hammer@5.4 / C6 Awl@0.4, Brass Mallet@1.0, Steel Hammer@2.2, Sledgehammer@3.5, Diamond Hammer@5.6
Largest values (whole cycles, all 6): juice held 17222868, run juice 21775016, single pop 17233920, income/s 331751, cost on offer 870218

### engaged (2.5 taps/s, skill 0.7, seed 2)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 6.2 | 4.8 | 6.2 | 5.0M | +2 | 2 | 1.4 | 0.0 | 0.0 | 66K | black | 1.2M | 67.3M |
| 2 | 3.5 | 2.9 | 3.5 | 8.2M | +2 | 4 | 1.8 | 0.0 | 0.0 | 133K | black | 1.7M | 90.5M |
| 3 | 3.1 | 2.5 | 3.1 | 5.6M | +2 | 6 | 2.2 | 0.0 | 0.0 | 88K | black | 4.6M | 121M |
| 4 | 3.1 | 2.5 | 3.1 | 5.1M | +2 | 8 | 2.6 | 0.0 | 0.0 | 78K | black | 2.7M | 105M |
| 5 | 2.1 | 1.7 | 2.1 | 5.1M | +2 | 10 | 3.0 | 0.0 | 0.0 | 85K | black | 3.2M | 175M |
| 6 | 2.4 | 1.8 | 2.4 | 12.0M | +3 | 13 | 3.6 | 0.0 | 0.0 | 197K | black | 3.6M | 193M |

Minute each upgrade reaches max level (- = not maxed before Fresh Batch):

| upgrade (max) | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| tool (5) | 5.9 | 3.5 | 2.8 | 3.1 | 2.1 | 2.3 |
| lucky (8) | 2.9 | 2.2 | 1.7 | 1.5 | 1.2 | 1.0 |
| auto (20) | - | - | - | - | - | - |
| sharp (99) | - | - | - | - | - | - |
| mint (5) | 3.2 | 2.4 | 1.8 | 1.7 | 1.5 | 1.4 |
| golden (6) | 4.7 | 3.0 | 2.4 | 2.3 | 1.7 | 1.8 |
| violet (5) | 5.4 | 3.3 | 2.8 | 2.6 | 1.9 | 1.9 |
| coral (5) | 6.0 | 3.5 | 3.0 | - | 2.1 | - |
| marble (5) | - | - | - | - | - | - |
| opal (5) | - | - | - | - | - | - |
| ruby (5) | - | - | - | - | - | - |
| black (5) | - | - | - | - | - | - |
| shiny (10) | - | - | - | - | - | - |
| spawn (12) | 3.2 | 2.3 | 1.8 | 1.6 | 1.5 | 1.4 |
| combo (10) | 2.6 | 1.9 | 1.4 | 1.2 | 1.1 | 0.9 |
| fuel (5) | 2.7 | 2.0 | 1.7 | 1.3 | 1.2 | 1.0 |
| tempo (10) | - | - | - | - | - | - |
| board (2) | 3.8 | 2.8 | 2.1 | 2.1 | 1.6 | 1.5 |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 0.6 | 0.2 | 0.4 | 0.6 | 0.4 | 0.3 |
| blue | 1.9 | 0.5 | 1.0 | 1.4 | 0.8 | 0.6 |
| mint | 2.8 | 0.7 | 1.9 | 2.1 | 1.6 | 1.3 |
| golden | 5.6 | 1.0 | 3.9 | 3.4 | 3.1 | 2.3 |
| violet | 9.6 | 2.5 | 8.8 | 13.8 | 2.9 | 6.7 |
| coral | 10.1 | 4.3 | 14.9 | 29.1 | 26.2 | 11.7 |
| marble | 26.6 | 8.6 | 27.3 | 17.5 | 30.7 | 10.1 |
| opal | 42.8 | 35.9 | 41.8 | 32.0 | 34.3 | 0.0 |
| ruby | 0.0 | 46.2 | 0.0 | 0.0 | 0.0 | 67.1 |
| black | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |

Tools bought: C1 Awl@0.7, Brass Mallet@1.6, Steel Hammer@3.0, Sledgehammer@4.3, Diamond Hammer@5.9 / C2 Awl@0.5, Brass Mallet@1.4, Steel Hammer@2.2, Sledgehammer@2.9, Diamond Hammer@3.5 / C3 Awl@0.4, Brass Mallet@1.1, Steel Hammer@1.7, Sledgehammer@2.2, Diamond Hammer@2.8 / C4 Awl@0.3, Brass Mallet@1.0, Steel Hammer@1.5, Sledgehammer@2.2, Diamond Hammer@3.1 / C5 Awl@0.3, Brass Mallet@0.9, Steel Hammer@1.2, Sledgehammer@1.7, Diamond Hammer@2.1 / C6 Awl@0.2, Brass Mallet@0.7, Steel Hammer@1.1, Sledgehammer@1.6, Diamond Hammer@2.3
Largest values (whole cycles, all 6): juice held 7977677, run juice 12032415, single pop 8078400, income/s 196869, cost on offer 870218

## Baseline when the player keeps playing to minute 25


### casual (1.5 taps/s, skill 0.3, seed 1)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 12.8 | 11.4 | 25.0 | 750M | +24 | 24 | 5.8 | 0.1 | 8.5 | 2.4M | black | 1.2M | 84.2M |
| 2 | 2.5 | 2.0 | 25.0 | 10044M | +89 | 113 | 23.6 | 0.1 | 21.4 | 5.2M | black | 7.0M | 142M |
| 3 | 1.1 | 0.8 | 25.0 | 51722M | +203 | 316 | 64.2 | 0.1 | 23.6 | 34.1M | black | 28.6M | 103M |
| 4 | 0.6 | 0.6 | 25.0 | 155390M | +352 | 668 | 134.6 | 0.1 | 24.0 | 76.1M | black | 165M | 4149M |
| 5 | 0.4 | 0.4 | 25.0 | 304219M | +493 | 1161 | 233.2 | 0.2 | 24.5 | 373M | black | 163M | 163M |
| 6 | 0.5 | 0.4 | 25.0 | 556020M | +666 | 1827 | 366.4 | 0.2 | 24.4 | 345M | black | 283M | 15700M |

Minute each upgrade reaches max level (- = not maxed before Fresh Batch):

| upgrade (max) | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| tool (5) | 12.7 | 2.5 | 1.1 | 0.6 | 0.5 | 0.5 |
| lucky (8) | 6.4 | 1.4 | 0.5 | 0.3 | 0.2 | 0.2 |
| auto (20) | 16.6 | 3.5 | 1.6 | 1.2 | 0.7 | 0.8 |
| sharp (99) | - | - | - | - | - | - |
| mint (5) | 8.7 | 1.7 | 0.8 | 0.3 | 0.2 | 0.3 |
| golden (6) | 11.4 | 2.0 | 0.9 | 0.5 | 0.4 | 0.4 |
| violet (5) | 11.5 | 2.2 | 1.1 | 0.6 | 0.4 | 0.4 |
| coral (5) | 12.7 | 2.6 | 1.1 | 0.6 | 0.5 | 0.5 |
| marble (5) | 13.2 | 2.6 | 1.1 | 0.8 | 0.5 | 0.6 |
| opal (5) | 14.1 | 2.7 | 1.2 | 0.9 | 0.5 | 0.7 |
| ruby (5) | 14.1 | 2.7 | 1.2 | 0.9 | 0.6 | 0.7 |
| black (5) | 15.0 | 2.8 | 1.5 | 0.9 | 0.6 | 0.8 |
| shiny (10) | 14.1 | 2.7 | 1.2 | 0.9 | 0.5 | 0.7 |
| spawn (12) | 8.4 | 1.7 | 0.7 | 0.3 | 0.2 | 0.2 |
| combo (10) | 5.5 | 1.1 | 0.4 | 0.3 | 0.1 | 0.2 |
| fuel (5) | 6.2 | 1.3 | 0.5 | 0.3 | 0.1 | 0.2 |
| tempo (10) | 14.4 | 2.7 | 1.5 | 0.9 | 0.6 | 0.8 |
| board (2) | 10.7 | 1.7 | 0.8 | 0.4 | 0.2 | 0.3 |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 0.1 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| blue | 0.1 | 0.1 | 0.1 | 0.1 | 0.2 | 0.2 |
| mint | 0.2 | 0.2 | 0.1 | 0.1 | 0.2 | 0.1 |
| golden | 0.5 | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 |
| violet | 0.9 | 0.8 | 0.7 | 0.8 | 0.8 | 0.7 |
| coral | 1.5 | 1.6 | 1.3 | 1.2 | 1.5 | 1.1 |
| marble | 3.2 | 2.9 | 2.4 | 2.7 | 3.1 | 3.3 |
| opal | 12.4 | 14.2 | 12.7 | 10.8 | 12.9 | 12.0 |
| ruby | 29.2 | 34.8 | 21.1 | 29.2 | 33.0 | 29.7 |
| black | 52.0 | 44.9 | 60.9 | 54.6 | 47.9 | 52.3 |

Tools bought: C1 Awl@0.9, Brass Mallet@2.6, Steel Hammer@6.6, Sledgehammer@10.8, Diamond Hammer@12.7 / C2 Awl@0.3, Brass Mallet@0.7, Steel Hammer@1.4, Sledgehammer@1.8, Diamond Hammer@2.5 / C3 Awl@0.1, Brass Mallet@0.3, Steel Hammer@0.6, Sledgehammer@0.8, Diamond Hammer@1.1 / C4 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.3, Sledgehammer@0.4, Diamond Hammer@0.6 / C5 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.2, Sledgehammer@0.2, Diamond Hammer@0.5 / C6 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.2, Sledgehammer@0.4, Diamond Hammer@0.5
Largest values (whole cycles, all 6): juice held 153930273004, run juice 556020253280, single pop 26806340000, income/s 1030491118, cost on offer 244686494282

### engaged (2.5 taps/s, skill 0.7, seed 2)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 6.2 | 4.8 | 25.0 | 2558M | +45 | 45 | 10.0 | 0.0 | 16.1 | 2.2M | black | 1.2M | 67.3M |
| 2 | 1.0 | 0.6 | 25.0 | 40204M | +179 | 224 | 45.8 | 0.1 | 23.7 | 17.3M | black | 12.1M | 56.7M |
| 3 | 0.5 | 0.4 | 25.0 | 194782M | +394 | 618 | 124.6 | 0.2 | 24.6 | 84.5M | black | 55.5M | 2960M |
| 4 | 0.3 | 0.3 | 25.0 | 538144M | +656 | 1274 | 255.8 | 0.2 | 24.7 | 469M | black | 151M | 8389M |
| 5 | 0.3 | 0.2 | 25.0 | 1300477M | +1019 | 2293 | 459.6 | 0.2 | 24.7 | 1833M | black | 310M | 1465M |
| 6 | 0.2 | 0.2 | 25.0 | 2029030M | +1274 | 3567 | 714.4 | 0.3 | 24.8 | 1361M | black | 557M | 0 |

Minute each upgrade reaches max level (- = not maxed before Fresh Batch):

| upgrade (max) | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| tool (5) | 5.9 | 1.0 | 0.4 | 0.3 | 0.3 | 0.2 |
| lucky (8) | 2.9 | 0.5 | 0.3 | 0.1 | 0.1 | 0.1 |
| auto (20) | 8.6 | 1.4 | 0.6 | 0.5 | 0.5 | 0.4 |
| sharp (99) | - | - | - | - | - | - |
| mint (5) | 3.2 | 0.6 | 0.3 | 0.2 | 0.1 | 0.2 |
| golden (6) | 4.7 | 0.6 | 0.4 | 0.3 | 0.2 | 0.2 |
| violet (5) | 5.4 | 0.9 | 0.4 | 0.3 | 0.3 | 0.2 |
| coral (5) | 6.0 | 1.0 | 0.5 | 0.3 | 0.3 | 0.2 |
| marble (5) | 6.9 | 1.0 | 0.5 | 0.4 | 0.4 | 0.2 |
| opal (5) | 7.3 | 1.1 | 0.5 | 0.4 | 0.4 | 0.3 |
| ruby (5) | 7.6 | 1.3 | 0.5 | 0.4 | 0.4 | 0.3 |
| black (5) | 8.1 | 1.4 | 0.5 | 0.4 | 0.4 | 0.3 |
| shiny (10) | 7.3 | 1.1 | 0.5 | 0.4 | 0.4 | 0.3 |
| spawn (12) | 3.2 | 0.6 | 0.3 | 0.2 | 0.1 | 0.1 |
| combo (10) | 2.6 | 0.5 | 0.2 | 0.1 | 0.1 | 0.1 |
| fuel (5) | 2.7 | 0.5 | 0.3 | 0.1 | 0.1 | 0.1 |
| tempo (10) | 7.9 | 1.4 | 0.5 | 0.4 | 0.4 | 0.3 |
| board (2) | 3.8 | 0.6 | 0.3 | 0.2 | 0.2 | 0.2 |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| blue | 0.1 | 0.1 | 0.1 | 0.2 | 0.1 | 0.2 |
| mint | 0.1 | 0.1 | 0.1 | 0.2 | 0.1 | 0.2 |
| golden | 0.4 | 0.4 | 0.5 | 0.5 | 0.4 | 0.5 |
| violet | 0.8 | 0.8 | 0.8 | 0.8 | 0.7 | 1.0 |
| coral | 1.3 | 1.1 | 1.1 | 1.3 | 1.2 | 1.3 |
| marble | 2.2 | 2.7 | 2.7 | 2.7 | 2.4 | 3.1 |
| opal | 9.4 | 10.4 | 11.0 | 12.9 | 10.7 | 10.3 |
| ruby | 24.4 | 28.3 | 27.9 | 27.2 | 27.5 | 24.9 |
| black | 61.1 | 55.9 | 55.7 | 54.2 | 56.7 | 58.6 |

Tools bought: C1 Awl@0.7, Brass Mallet@1.6, Steel Hammer@3.0, Sledgehammer@4.3, Diamond Hammer@5.9 / C2 Awl@0.1, Brass Mallet@0.3, Steel Hammer@0.5, Sledgehammer@0.6, Diamond Hammer@1.0 / C3 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.3, Sledgehammer@0.3, Diamond Hammer@0.4 / C4 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.1, Sledgehammer@0.2, Diamond Hammer@0.3 / C5 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.1, Sledgehammer@0.2, Diamond Hammer@0.3 / C6 Awl@0.0, Brass Mallet@0.1, Steel Hammer@0.1, Sledgehammer@0.2, Diamond Hammer@0.2
Largest values (whole cycles, all 6): juice held 573707915884, run juice 2029030040020, single pop 101819784000, income/s 5878393031, cost on offer 911181918891
