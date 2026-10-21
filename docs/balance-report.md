# Poppit balance report: frenzy x4, steeper payouts, retuned dials

Date: 2026-10-21, updated the same day for the away bonus fix, the Black Pearl diagnosis and the per-Flavor bonus options. Numbers come from `tools/sim32.js` on the economy in `src/econ.js` at this commit. The previous report (2026-10-18) measured the economy before Chain Reaction was removed; its numbers and options A/B/C are superseded by this one.

## What changed

- **Frenzy is 4x harder to trigger.** `stats().frenzyNeed` is `200 - 24 × Fuel level` (200 at Fuel 0, 80 at Fuel 5), up from `50 - 6 × Fuel`. Frenzy still lasts 7 s, a tap still adds 1 to the meter and a helper pop 0.25.
- **Payouts are steeper.** `PAYOUT_STEEPNESS = 1.5`. Each type pays `base × 1.5^rank`, rounded to two significant figures, where rank is the type's position in `PEARLS` (Rose is 0). The old table is kept as `baseMult`. Hits per type did not change.
- **The away bonus pays what helpers alone would earn.** `idleRate` is `helperIdle(S, pool, L, shinyOn).rate` in `src/econ.js`, a steady-state model of `stepAuto` and `trySpawn`; see *Away bonus* below. It still pays 50% and is still capped at 8 h. (A first version used the average pooled pearl's payout and overpaid 12–17x.)
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
- **Helper hour:** `helperHour()` copies the board at a checkpoint and plays one hour of helpers alone, the way `stepAuto` and `trySpawn` work: best payout per remaining hit among pearls with hp ≤ 3 × power, 0.22 s claim, cracks heal after 2.2 s, per-type caps, shinies, and frenzy from helper meter credit. Each checkpoint averages 4 seeded hours. It uses its own RNG, so the main run's numbers did not move.
- **Black Pearl counters** and the per-Flavor bonus lever (`flavorBonus`, variants `flavor10` and `flavor5`) are new in the sim too.
- **Not modelled:** selling from the backpack, the Fresh Batch animation, actually taking the away bonus, switching types off in the pool, real cell counts (the sim uses 120 / 252 / 440), helper credit to the frenzy meter during a run (taps only; the helper hour does model it), the in-run helper's choice (it hits a random pearl it can break, while the game and the helper hour take the best payout per hit), and sweep (modelled as a doubled tap rate).
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

### The formula (`helperIdle` in `src/econ.js`)

It is the steady state of `stepAuto` and `trySpawn` with nobody playing:

- **Which pearls count.** Helpers only take pearls with hp ≤ 3 × the held tool's power (`helperCanHit`). A type they cannot break fills its cap and stays there, and `trySpawn` then turns its share of spawns into Rose. So its chance is moved to Rose, not spread over the other types.
- **Preference.** Helpers pick the best payout per remaining hit (`helperScore`, the same function `stepAuto` calls). With the board full, a spawn only happens when a pop frees a cell, so the greedy helper pops every hittable arrival and nothing good waits forever. The popped mix therefore equals the arrival mix, and the preference decides the order, not the totals.
- **Rate.** pops/s = helper hits/s ÷ mean hits per pop, unless the board runs dry; then pops/s = the spawn rate (4x in frenzy).
- **Value.** pops/s × popBase × Flavor multiplier × (sum of mix × payout) × the shiny bonus (1 + shiny chance × 4, when shinies are on).
- **Frenzy.** Helper pops fill the meter at 0.25 each, so helpers alone trigger frenzy: one every frenzyNeed ÷ (0.25 × pops/s) seconds, 7 s long, paying double with rare types twice as likely. The first fix left this out and paid about 12% too little at the Fresh Batch checkpoints, where frenzy was 9% of the time and 19% of the juice. `FRENZY_SECS` and `HELPER_METER` are now `ECON` constants, used by the game, the formula and the sim.

### Calibration

One hour away (`awayBonus(3600)`) against half of what helpers alone earned in one simulated hour (helperHour, mean of 4 seeds). The target is within 15%.

| profile | checkpoint | helpers alone, 1 h | half | away bonus, 1 h | away ÷ half |
|---|---|---|---|---|---|
| casual | C1 first helper (11.4 min) | 464K | 232K | 217K | 0.94 |
| casual | C1 first Fresh Batch (12.8 min) | 14.2M | 7.1M | 7.3M | 1.02 |
| casual | C6 Fresh Batch (5.8 min) | 34.1M | 17.1M | 17.4M | 1.02 |
| engaged | C1 first helper (4.8 min) | 431K | 215K | 224K | 1.04 |
| engaged | C1 first Fresh Batch (6.2 min) | 11.2M | 5.6M | 5.7M | 1.01 |
| engaged | C6 Fresh Batch (2.4 min) | 30.3M | 15.1M | 15.0M | 0.99 |

- Every checkpoint in the run (21 of them, in the tables below) lands between 0.89 and 1.04. `tests/away.test.js` holds the three above to 0.85–1.15.
- **The first-helper points are noisy.** With one helper an hour is about 1,500 hits, so a few rare pops swing it ±20% between single seeds. Over 6 seeds per checkpoint the mean ratio was 0.92–1.03 everywhere.
- **Before the fix,** one hour away at the first Fresh Batch paid 84.2M (casual) and 67.3M (engaged). Now it pays 7.3M and 5.7M, about 1.1–1.5x the 5M floor. That is more than the whole first run earned, but under two minutes of the end-of-run active income (about 70K/s), because helpers alone earn only about 4K/s at that point.
- **A pool of only unhittable types does not pay 0.** For example, Ruby + Black with the Steel Pin: those types sit at their caps (2 and 1) and every later spawn becomes a Rose, which helpers do pop. The formula counts only those Roses. The harness checks this in the real game: in 60 s, helpers popped 71 Roses and no Ruby or Black. Only with no helpers is the bonus 0.

## Income share dominated by one type (over 60%)

Spawn weights were not retuned; this is only a report. One type takes over 60% of a cycle's income in these cycles:

- **casual:** C3 Opal 89.6%, C4 Ruby 81.3%, C5 Glass Marble 63.6%, C6 Ruby 79.1%.
- **engaged:** C6 Ruby 67.1%.
- In the other cycles the top type holds 31–46%.
- Black is unlocked in most cycles but earns 0%; see the next section.

## Why Black Pearls earn 0% in the sim

Reference seeds, Fresh Batch taken at once. "Spawns after unlock" counts every spawn between the Black unlock and Fresh Batch; "Blacks expected" sums Black's chance over those spawns.

| profile | cycle | Black unlocked (min) | run ends (min) | spawns after unlock | Blacks expected | Blacks spawned | popped | hits at unlock (power) | hits at end (power) |
|---|---|---|---|---|---|---|---|---|---|
| casual | 1 | 12.7 | 12.8 | 43 | 0.04 | 0 | 0 | 27 (12) | 18 (18) |
| casual | 2 | 10.2 | 10.8 | 195 | 0.23 | 0 | 0 | 27 (12) | 18 (18) |
| casual | 3 | not unlocked | 7.7 | 0 | 0 | 0 | 0 | - | 32 (10) |
| casual | 4 | 5.8 | 6.6 | 166 | 0.19 | 0 | 0 | 27 (12) | 27 (12) |
| casual | 5 | 5.2 | 5.9 | 213 | 0.27 | 0 | 0 | 27 (12) | 18 (18) |
| casual | 6 | 5.4 | 5.8 | 128 | 0.15 | 0 | 0 | 27 (12) | 18 (18) |
| engaged | 1 | 5.6 | 6.2 | 226 | 0.29 | 0 | 0 | 27 (12) | 18 (18) |
| engaged | 2 | 3.4 | 3.5 | 19 | 0.02 | 0 | 0 | 27 (12) | 18 (18) |
| engaged | 3 | 2.8 | 3.1 | 130 | 0.16 | 0 | 0 | 27 (12) | 18 (18) |
| engaged | 4 | 3.0 | 3.1 | 39 | 0.04 | 0 | 0 | 27 (12) | 27 (12) |
| engaged | 5 | 2.0 | 2.1 | 87 | 0.13 | 0 | 0 | 27 (12) | 18 (18) |
| engaged | 6 | 2.1 | 2.4 | 163 | 0.23 | 0 | 0 | 27 (12) | 18 (18) |

No Black spawn was ever blocked by its cap of 1.

**Cause: timing, plus a tiny spawn share. Not hits, not the cap.**

- **Cost puts the unlock at the very end of the run.** Black is the last link of the unlock chain and costs 150,000 at level 1, against 70,000 for Ruby. It opens 0.1–1.2 min before the 5M floor, and the sim presses Fresh Batch the moment it is ready.
- **The spawn share is tiny.** At Black level 1 with every other type maxed, Black is 0.10% of spawns (0.26% at level 5). On a full board a spawn only happens when a pop frees a cell, so the last minute has only 19–226 spawns. Expected Blacks per cycle are 0.02–0.29, about 1.7 across the 11 cycles with Black unlocked, so seeing none is ordinary bad luck (about a 1 in 6 chance), not a bug.
- **Hits are not the blocker for taps.** At the unlock a Black needs 27 hits at power 12 and 18 at power 18, about 7–11 s of tapping. The skilled pick (payout per remaining hit) puts it first, since 190K / 27 beats Ruby's 51K / 17.
- **Helpers can never hit it.** That needs hp 320 ≤ 3 × power, i.e. power 107, and the best tool fully upgraded has 38. So Black is tap-only and earns nothing while away.
- **The sim's own behaviour is the other half.** A player who keeps going to minute 25 (`--wait=25`) sees Black earn 45–61% of every cycle's income. Black does its job as the reward for staying in a run; the take-at-once policy just never stays.

**Two options (neither applied):**

- **A. Unlock Black earlier:** lower `UPG.black.base` from 60,000 toward Ruby's 28,000, so it opens a few minutes before the floor. This is the smallest change. It shortens runs a little, because Black income arrives sooner.
- **B. A larger first-level spawn weight:** raise `NEW_BASE.black` from 0.15 to about 0.6, so the first minute after the unlock shows about one Black. It keeps the unlock point but makes Black more common later too, which feeds the existing problem of one type dominating income.

## Waiting still explodes Flavors

With `--wait=25` (the player keeps going to minute 25), six cycles give 1,827 Flavors (x366) casual and 3,567 (x714) engaged. The square-root gain curve still rewards long runs without limit. See `--compare` below.

## Per-Flavor payout bonus: 20% (now), 10% and 5% (not applied)

Each Flavor adds `FLAVOR_BONUS` to every payout (now 0.2). Variants `flavor10` and `flavor5` change only that. Reference seeds, Fresh Batch taken at once; "payout x after C6" is the multiplier once cycle 6's Flavors are added.

| bonus per Flavor | profile | first Fresh Batch (min) | cycles 2–6 (min) | Flavors after C6 | payout x after C6 |
|---|---|---|---|---|---|
| 20% (now) | casual | 12.8 | 10.8 / 7.7 / 6.6 / 5.9 / 5.8 | 15 | 4.0 |
| 20% (now) | engaged | 6.2 | 3.5 / 3.1 / 3.1 / 2.1 / 2.4 | 13 | 3.6 |
| 10% | casual | 12.8 | 13.4 / 6.7 / 8.0 / 8.8 / 7.1 | 13 | 2.3 |
| 10% | engaged | 6.2 | 4.5 / 4.2 / 3.4 / 2.9 / 3.0 | 14 | 2.4 |
| 5% | casual | 12.8 | 13.4 / 11.8 / 11.4 / 9.3 / 9.4 | 15 | 1.8 |
| 5% | engaged | 6.2 | 4.9 / 6.5 / 4.3 / 4.2 / 3.1 | 12 | 1.6 |

- The first run never has Flavors, so it does not move.
- **10%** keeps engaged cycles 2–3 just over 4 min (4.5, 4.2), but 4–6 still fall to about 3.
- **5%** keeps engaged at or over 4 min through C5 (C6 is 3.1) and casual over 9 min. Fresh Batch is then worth little: x1.6–1.8 after six batches.
- **Run lengths stop shrinking every cycle at low bonuses.** For example, casual at 10% goes 6.7 then 8.0. With so little speed-up per cycle, seed noise (±20%, see *How robust the first-run numbers are*) outweighs the bonus, so "each cycle shorter" becomes a coin flip.
- Lowering the bonus is the lever named earlier for the engaged 4-minute floor. At 10% it is half met, at 5% nearly met, at the cost of a much weaker Fresh Batch.

## Variants (`node tools/sim32.js --compare`)

- `scaledFloor`: the floor × (1 + 0.2 × Flavors).
- `moreFlavors`: gain `floor(sqrt(run / 312,500))`, i.e. 4 Flavors at the floor.
- `flavor10`, `flavor5`: each Flavor adds 10% or 5% instead of 20% (see above).
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
| flavor10 | casual | 12.8 / 13.4 / 6.7 / 8.0 / 8.8 / 7.1 | 13 | 2.3 | 10 of 18 | 0.0 / 0.0 / 0.1 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| flavor10 | engaged | 6.2 / 4.5 / 4.2 / 3.4 / 2.9 / 3.0 | 14 | 2.4 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / ruby / black |
| flavor10 +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 1058 | 106.8 | 17 of 18 | 8.5 / 19.1 / 22.7 / 23.0 / 23.7 / 23.9 | black / black / black / black / black / black |
| flavor10 +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 2012 | 202.2 | 17 of 18 | 16.1 / 23.2 / 24.2 / 24.4 / 24.4 / 24.9 | black / black / black / black / black / black |
| flavor5 | casual | 12.8 / 13.4 / 11.8 / 11.4 / 9.3 / 9.4 | 15 | 1.8 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| flavor5 | engaged | 6.2 / 4.9 / 6.5 / 4.3 / 4.2 / 3.1 | 12 | 1.6 | 10 of 18 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | black / black / black / black / black / black |
| flavor5 +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 650 | 33.5 | 17 of 18 | 8.5 / 17.0 / 20.2 / 21.9 / 23.1 / 23.4 | black / black / black / black / black / black |
| flavor5 +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 1218 | 61.9 | 17 of 18 | 16.1 / 22.2 / 23.5 / 23.7 / 24.5 / 24.3 | black / black / black / black / black / black |
```


## Baseline tables: Fresh Batch taken as soon as it is ready


### casual (1.5 taps/s, skill 0.3, seed 1)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 12.8 | 11.4 | 12.8 | 6.0M | +2 | 2 | 1.4 | 0.0 | 0.0 | 70K | black | 217K | 7.3M |
| 2 | 10.8 | 9.3 | 10.8 | 8.5M | +2 | 4 | 1.8 | 0.0 | 0.0 | 110K | black | 304K | 7.9M |
| 3 | 7.7 | - | 7.7 | 6.2M | +2 | 6 | 2.2 | 0.0 | 0.0 | 98K | opal | 0 | 0 |
| 4 | 6.6 | 5.3 | 6.6 | 14.0M | +3 | 9 | 2.8 | 0.0 | 0.0 | 206K | black | 477K | 3.5M |
| 5 | 5.9 | 4.1 | 5.9 | 7.3M | +2 | 11 | 3.2 | 0.0 | 0.0 | 87K | black | 608K | 15.2M |
| 6 | 5.8 | 4.6 | 5.8 | 21.8M | +4 | 15 | 4.0 | 0.0 | 0.0 | 332K | black | 748K | 17.4M |

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

Away bonus calibration: helpers alone for 1 h from that moment's board (helperHour, mean of 4 seeds), against awayBonus(3600):

| checkpoint | helper-only juice, 1 h | half of it | away bonus, 1 h | away / half |
|---|---|---|---|---|
| C1 first helper (11.4 min) | 464K | 232K | 217K | 0.94 |
| C1 Fresh Batch ready (12.8 min) | 14.2M | 7.1M | 7.3M | 1.02 |
| C2 first helper (9.3 min) | 626K | 313K | 304K | 0.97 |
| C2 Fresh Batch ready (10.8 min) | 15.5M | 7.7M | 7.9M | 1.02 |
| C3 Fresh Batch ready (7.7 min) | 0 | 0 | 0 | - |
| C4 first helper (5.3 min) | 952K | 476K | 477K | 1.00 |
| C4 Fresh Batch ready (6.6 min) | 7.1M | 3.5M | 3.5M | 0.99 |
| C5 first helper (4.1 min) | 1.3M | 668K | 608K | 0.91 |
| C5 Fresh Batch ready (5.9 min) | 31.2M | 15.6M | 15.2M | 0.97 |
| C6 first helper (4.6 min) | 1.5M | 772K | 748K | 0.97 |
| C6 Fresh Batch ready (5.8 min) | 34.1M | 17.1M | 17.4M | 1.02 |

Black Pearls per cycle:

| cycle | unlocked (min) | run length (min) | spawns after unlock | Blacks expected | spawned | spawns turned Rose by the cap | popped by taps | popped by helpers | hits at unlock | hits at end (power) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 12.7 | 12.8 | 43 | 0.04 | 0 | 0 | 0 | 0 | 27 | 18 (18) |
| 2 | 10.2 | 10.8 | 195 | 0.23 | 0 | 0 | 0 | 0 | 27 | 18 (18) |
| 3 | - | 7.7 | 0 | 0.00 | 0 | 0 | 0 | 0 | - | 32 (10) |
| 4 | 5.8 | 6.6 | 166 | 0.19 | 0 | 0 | 0 | 0 | 27 | 27 (12) |
| 5 | 5.2 | 5.9 | 213 | 0.27 | 0 | 0 | 0 | 0 | 27 | 18 (18) |
| 6 | 5.4 | 5.8 | 128 | 0.15 | 0 | 0 | 0 | 0 | 27 | 18 (18) |

### engaged (2.5 taps/s, skill 0.7, seed 2)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 6.2 | 4.8 | 6.2 | 5.0M | +2 | 2 | 1.4 | 0.0 | 0.0 | 66K | black | 224K | 5.7M |
| 2 | 3.5 | 2.9 | 3.5 | 8.2M | +2 | 4 | 1.8 | 0.0 | 0.0 | 133K | black | 304K | 7.6M |
| 3 | 3.1 | 2.5 | 3.1 | 5.6M | +2 | 6 | 2.2 | 0.0 | 0.0 | 88K | black | 402K | 10.2M |
| 4 | 3.1 | 2.5 | 3.1 | 5.1M | +2 | 8 | 2.6 | 0.0 | 0.0 | 78K | black | 492K | 4.1M |
| 5 | 2.1 | 1.7 | 2.1 | 5.1M | +2 | 10 | 3.0 | 0.0 | 0.0 | 85K | black | 564K | 14.7M |
| 6 | 2.4 | 1.8 | 2.4 | 12.0M | +3 | 13 | 3.6 | 0.0 | 0.0 | 197K | black | 651K | 15.0M |

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

Away bonus calibration: helpers alone for 1 h from that moment's board (helperHour, mean of 4 seeds), against awayBonus(3600):

| checkpoint | helper-only juice, 1 h | half of it | away bonus, 1 h | away / half |
|---|---|---|---|---|
| C1 first helper (4.8 min) | 431K | 215K | 224K | 1.04 |
| C1 Fresh Batch ready (6.2 min) | 11.2M | 5.6M | 5.7M | 1.01 |
| C2 first helper (2.9 min) | 595K | 297K | 304K | 1.02 |
| C2 Fresh Batch ready (3.5 min) | 16.0M | 8.0M | 7.6M | 0.95 |
| C3 first helper (2.5 min) | 823K | 411K | 402K | 0.98 |
| C3 Fresh Batch ready (3.1 min) | 20.7M | 10.3M | 10.2M | 0.98 |
| C4 first helper (2.5 min) | 963K | 482K | 492K | 1.02 |
| C4 Fresh Batch ready (3.1 min) | 8.1M | 4.1M | 4.1M | 1.01 |
| C5 first helper (1.7 min) | 1.3M | 636K | 564K | 0.89 |
| C5 Fresh Batch ready (2.1 min) | 30.8M | 15.4M | 14.7M | 0.95 |
| C6 first helper (1.8 min) | 1.4M | 724K | 651K | 0.90 |
| C6 Fresh Batch ready (2.4 min) | 30.3M | 15.1M | 15.0M | 0.99 |

Black Pearls per cycle:

| cycle | unlocked (min) | run length (min) | spawns after unlock | Blacks expected | spawned | spawns turned Rose by the cap | popped by taps | popped by helpers | hits at unlock | hits at end (power) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 5.6 | 6.2 | 226 | 0.29 | 0 | 0 | 0 | 0 | 27 | 18 (18) |
| 2 | 3.4 | 3.5 | 19 | 0.02 | 0 | 0 | 0 | 0 | 27 | 18 (18) |
| 3 | 2.8 | 3.1 | 130 | 0.16 | 0 | 0 | 0 | 0 | 27 | 18 (18) |
| 4 | 3.0 | 3.1 | 39 | 0.04 | 0 | 0 | 0 | 0 | 27 | 27 (12) |
| 5 | 2.0 | 2.1 | 87 | 0.13 | 0 | 0 | 0 | 0 | 27 | 18 (18) |
| 6 | 2.1 | 2.4 | 163 | 0.23 | 0 | 0 | 0 | 0 | 27 | 18 (18) |

## Baseline when the player keeps playing to minute 25


### casual (1.5 taps/s, skill 0.3, seed 1)

| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 12.8 | 11.4 | 25.0 | 750M | +24 | 24 | 5.8 | 0.1 | 8.5 | 2.4M | black | 217K | 7.3M |
| 2 | 2.5 | 2.0 | 25.0 | 10044M | +89 | 113 | 23.6 | 0.1 | 21.4 | 5.2M | black | 1.3M | 6.0M |
| 3 | 1.1 | 0.8 | 25.0 | 51722M | +203 | 316 | 64.2 | 0.1 | 23.6 | 34.1M | black | 5.1M | 9.0M |
| 4 | 0.6 | 0.6 | 25.0 | 155390M | +352 | 668 | 134.6 | 0.1 | 24.0 | 76.1M | black | 14.3M | 345M |
| 5 | 0.4 | 0.4 | 25.0 | 304219M | +493 | 1161 | 233.2 | 0.2 | 24.5 | 373M | black | 29.2M | 29.2M |
| 6 | 0.5 | 0.4 | 25.0 | 556020M | +666 | 1827 | 366.4 | 0.2 | 24.4 | 345M | black | 50.6M | 1318M |

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
| 1 | 6.2 | 4.8 | 25.0 | 2558M | +45 | 45 | 10.0 | 0.0 | 16.1 | 2.2M | black | 224K | 5.7M |
| 2 | 1.0 | 0.6 | 25.0 | 40204M | +179 | 224 | 45.8 | 0.1 | 23.7 | 17.3M | black | 2.2M | 4.8M |
| 3 | 0.5 | 0.4 | 25.0 | 194782M | +394 | 618 | 124.6 | 0.2 | 24.6 | 84.5M | black | 9.9M | 248M |
| 4 | 0.3 | 0.3 | 25.0 | 538144M | +656 | 1274 | 255.8 | 0.2 | 24.7 | 469M | black | 27.0M | 704M |
| 5 | 0.3 | 0.2 | 25.0 | 1300477M | +1019 | 2293 | 459.6 | 0.2 | 24.7 | 1833M | black | 55.5M | 122M |
| 6 | 0.2 | 0.2 | 25.0 | 2029030M | +1274 | 3567 | 714.4 | 0.3 | 24.8 | 1361M | black | 99.8M | 0 |

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
