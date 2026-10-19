# Poppit balance report: the late game after Fresh Batch

Date: 2026-10-18. Numbers come from `tools/sim32.js` on the economy in `src/econ.js` at this commit. **No balance change has been applied**; the options below are for Ian to pick from.

## How this was measured

- `npm run sim` plays **6 consecutive Fresh Batch cycles** for two player profiles. The RNG is seeded (mulberry32, seed 1 for casual and 2 for engaged), so the output is the same every run.
  - **casual:** 1.5 taps/s, skill 0.3
  - **engaged:** 2.5 taps/s, skill 0.7
- **Fresh Batch** resets what `finishCollapse()` / `resetRun()` / `resetTools()` / `zeroInv()` in `src/ui.js` reset:
  - **Wiped:** juice, run juice, every upgrade level (Bigger Board included), owned tools and tool upgrades, the backpack, and board, combo, frenzy, meter and timers.
  - **Kept:** Flavors (`echoes`), discoveries and the pool.
  - The board is then prefilled with 30% rose pearls, like `prefill()`.
- The sim enforces the per-type spawn `cap` the way `trySpawn()` does. The old sim ignored the cap.
- The buy order is unchanged: the cheapest affordable item each 0.1 s tick, with a first verb level at half weight and tools at 0.8 weight.
- **Two player policies:**
  - **Take it at once.** This is the default (`npm run sim`). The player presses Fresh Batch the tick it is ready.
  - **Plays 25 min.** Run with `node tools/sim32.js --wait=25`. The player keeps going until minute 25 of each run, then presses Fresh Batch. Real players sit somewhere between the two policies. Most problems only show under one of them, so both are reported.
- **Column definitions:**
  - **nothing-to-want:** minutes in the cycle when every item still on offer is already affordable.
  - **ignoring Sharp:** the same measure, but Sharp is left out. Sharp has max level 99, so it always has a next level, and on its own it keeps the first measure near zero.
  - **furthest pearl:** the highest pearl type unlocked in that cycle.
- **Not modelled:**
  - selling from the backpack (income counts as if auto-sell were on);
  - the 1.9 s Fresh Batch animation and the confirm click;
  - the away bonus;
  - switching pearl types off in the pool;
  - real cell counts, which depend on screen size (the sim uses 120 / 252 / 440 cells per board tier);
  - sweep, modelled as a doubled tap rate.

## Step 4 tables: baseline, Fresh Batch taken as soon as it is ready

### casual (1.5 taps/s, skill 0.3, seed 1)

| cycle | Fresh Batch ready (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11.1 | 11.1 | 1.2M | +9 | 9 | 2.8 | 0.0 | 0.0 | 6597 | marble |
| 2 | 4.3 | 4.3 | 1.2M | +9 | 18 | 4.6 | 0.0 | 0.0 | 13K | marble |
| 3 | 2.8 | 2.8 | 1.3M | +10 | 28 | 6.6 | 0.0 | 0.0 | 17K | marble |
| 4 | 1.9 | 1.9 | 1.3M | +10 | 38 | 8.6 | 0.0 | 0.0 | 20K | marble |
| 5 | 1.6 | 1.6 | 1.2M | +9 | 47 | 10.4 | 0.0 | 0.0 | 20K | marble |
| 6 | 1.3 | 1.3 | 1.2M | +9 | 56 | 12.2 | 0.0 | 0.0 | 21K | marble |

Minute each upgrade reaches max level (- = not maxed before Fresh Batch):

| upgrade (max) | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| tool (5) | - | - | - | - | - | - |
| lucky (8) | 7.3 | 2.8 | 1.8 | 1.3 | 1.0 | 1.0 |
| sweep (5) | 9.3 | 3.5 | 2.3 | 1.7 | 1.3 | 1.1 |
| chain (8) | - | - | - | - | - | - |
| auto (20) | - | - | - | - | - | - |
| sharp (99) | - | - | - | - | - | - |
| mint (5) | 9.6 | 3.7 | 2.4 | 1.7 | 1.4 | 1.2 |
| golden (6) | - | - | - | - | - | - |
| violet (5) | - | - | - | - | - | - |
| coral (5) | - | - | - | - | - | - |
| marble (5) | - | - | - | - | - | - |
| opal (5) | - | - | - | - | - | - |
| ruby (5) | - | - | - | - | - | - |
| black (5) | - | - | - | - | - | - |
| shiny (10) | - | - | - | - | - | - |
| spawn (12) | 9.5 | 3.7 | 2.3 | 1.7 | 1.4 | 1.2 |
| combo (10) | 6.2 | 2.4 | 1.6 | 1.2 | 0.9 | 0.8 |
| fuel (5) | 6.7 | 2.6 | 1.7 | 1.2 | 0.9 | 0.9 |
| tempo (10) | - | - | - | - | - | - |
| board (2) | 10.7 | 4.1 | 2.7 | 1.9 | 1.5 | 1.3 |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 14.3 | 15.0 | 17.0 | 14.5 | 18.3 | 15.0 |
| blue | 18.6 | 18.9 | 19.5 | 18.8 | 19.5 | 15.0 |
| mint | 15.2 | 16.2 | 15.1 | 15.1 | 14.5 | 17.5 |
| golden | 12.4 | 11.5 | 13.0 | 10.5 | 10.4 | 14.0 |
| violet | 21.9 | 20.7 | 22.0 | 28.4 | 28.8 | 9.8 |
| coral | 12.9 | 17.6 | 8.1 | 12.7 | 8.5 | 28.6 |
| marble | 4.7 | 0.0 | 5.4 | 0.0 | 0.0 | 0.0 |
| opal | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| ruby | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| black | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |

Tools bought: C1 Awl@1.7, Brass Mallet@3.9, Steel Hammer@8.0 / C2 Awl@0.7, Brass Mallet@1.5, Steel Hammer@3.0 / C3 Awl@0.6, Brass Mallet@1.1, Steel Hammer@1.9 / C4 Awl@0.4, Brass Mallet@0.8, Steel Hammer@1.4 / C5 Awl@0.4, Brass Mallet@0.7, Steel Hammer@1.1 / C6 Awl@0.3, Brass Mallet@0.6, Steel Hammer@1.0
Largest values (whole cycles, all 6): juice held 112146, run juice 1269735, single pop 123552, income/s 20735, cost on offer 123688

### engaged (2.5 taps/s, skill 0.7, seed 2)

| cycle | Fresh Batch ready (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 6.3 | 6.3 | 1.2M | +9 | 9 | 2.8 | 0.0 | 0.0 | 8574 | marble |
| 2 | 2.3 | 2.3 | 1.3M | +10 | 19 | 4.8 | 0.0 | 0.0 | 20K | marble |
| 3 | 1.5 | 1.5 | 1.2M | +9 | 28 | 6.6 | 0.0 | 0.0 | 20K | marble |
| 4 | 1.1 | 1.1 | 1.2M | +9 | 37 | 8.4 | 0.0 | 0.0 | 20K | marble |
| 5 | 0.9 | 0.9 | 1.3M | +10 | 47 | 10.4 | 0.0 | 0.0 | 24K | marble |
| 6 | 0.8 | 0.8 | 1.2M | +9 | 56 | 12.2 | 0.0 | 0.0 | 25K | marble |

Minute each upgrade reaches max level (- = not maxed before Fresh Batch):

| upgrade (max) | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| tool (5) | - | - | - | - | - | - |
| lucky (8) | 3.9 | 1.5 | 0.9 | 0.7 | 0.6 | 0.5 |
| sweep (5) | 5.0 | 1.9 | 1.2 | 0.9 | 0.7 | 0.7 |
| chain (8) | - | - | - | - | - | - |
| auto (20) | - | - | - | - | - | - |
| sharp (99) | - | - | - | - | - | - |
| mint (5) | 5.2 | 2.0 | 1.2 | 0.9 | 0.7 | 0.7 |
| golden (6) | - | - | - | - | - | - |
| violet (5) | - | - | - | - | - | - |
| coral (5) | - | - | - | - | - | - |
| marble (5) | - | - | - | - | - | - |
| opal (5) | - | - | - | - | - | - |
| ruby (5) | - | - | - | - | - | - |
| black (5) | - | - | - | - | - | - |
| shiny (10) | - | - | - | - | - | - |
| spawn (12) | 5.1 | 1.9 | 1.2 | 0.9 | 0.7 | 0.7 |
| combo (10) | 3.3 | 1.2 | 0.8 | 0.6 | 0.5 | 0.4 |
| fuel (5) | 3.5 | 1.3 | 0.8 | 0.7 | 0.6 | 0.5 |
| tempo (10) | - | - | - | - | - | - |
| board (2) | 6.0 | 2.2 | 1.4 | 1.0 | 0.9 | 0.8 |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 8.3 | 7.0 | 8.3 | 8.1 | 7.7 | 10.0 |
| blue | 18.7 | 13.3 | 19.2 | 17.5 | 17.2 | 29.6 |
| mint | 12.5 | 12.3 | 16.9 | 10.0 | 13.3 | 17.8 |
| golden | 16.1 | 17.9 | 16.9 | 14.4 | 17.0 | 13.8 |
| violet | 22.5 | 9.5 | 17.8 | 24.0 | 26.2 | 18.6 |
| coral | 17.2 | 19.0 | 20.9 | 25.9 | 0.0 | 10.2 |
| marble | 4.7 | 20.9 | 0.0 | 0.0 | 18.6 | 0.0 |
| opal | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| ruby | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| black | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |

Tools bought: C1 Awl@1.0, Brass Mallet@2.2, Steel Hammer@4.1 / C2 Awl@0.4, Brass Mallet@0.8, Steel Hammer@1.6 / C3 Awl@0.3, Brass Mallet@0.5, Steel Hammer@1.0 / C4 Awl@0.3, Brass Mallet@0.5, Steel Hammer@0.7 / C5 Awl@0.2, Brass Mallet@0.4, Steel Hammer@0.6 / C6 Awl@0.2, Brass Mallet@0.3, Steel Hammer@0.5
Largest values (whole cycles, all 6): juice held 204164, run juice 1349402, single pop 232848, income/s 20433, cost on offer 123688

## Baseline when the player keeps playing to minute 25

Only the summary and the income split are shown here; `node tools/sim32.js --wait=25` prints the full tables.

### casual (1.5 taps/s, skill 0.3, seed 1)

| cycle | Fresh Batch ready (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11.1 | 25.0 | 29.9M | +48 | 48 | 10.6 | 0.0 | 0.0 | 70K | black |
| 2 | 1.3 | 25.0 | 2164M | +416 | 464 | 93.8 | 0.0 | 18.4 | 1.5M | black |
| 3 | 0.3 | 25.0 | 24995M | +1414 | 1878 | 376.6 | 0.1 | 23.9 | 12.2M | black |
| 4 | 0.2 | 25.0 | 102696M | +2866 | 4744 | 949.8 | 0.3 | 24.8 | 110M | black |
| 5 | 0.2 | 25.0 | 285282M | +4777 | 9521 | 1905.2 | 0.3 | 24.9 | 180M | black |
| 6 | 0.1 | 25.0 | 555468M | +6666 | 16187 | 3238.4 | 0.3 | 25.0 | 400M | black |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 2.0 | 0.7 | 0.7 | 0.7 | 0.7 | 0.7 |
| blue | 4.1 | 2.1 | 2.1 | 2.2 | 2.1 | 2.3 |
| mint | 2.9 | 1.5 | 1.5 | 1.5 | 1.4 | 1.5 |
| golden | 4.3 | 2.9 | 2.8 | 2.8 | 2.8 | 2.9 |
| violet | 6.1 | 3.5 | 3.5 | 3.7 | 3.3 | 3.7 |
| coral | 8.1 | 3.2 | 2.9 | 3.4 | 3.2 | 2.9 |
| marble | 12.9 | 5.0 | 4.9 | 4.9 | 4.5 | 5.0 |
| opal | 19.5 | 14.0 | 13.7 | 17.0 | 16.5 | 15.2 |
| ruby | 25.4 | 30.4 | 26.7 | 27.5 | 25.7 | 30.0 |
| black | 14.9 | 36.7 | 41.2 | 36.3 | 39.8 | 35.8 |

### engaged (2.5 taps/s, skill 0.7, seed 2)

| cycle | Fresh Batch ready (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 6.3 | 25.0 | 101M | +89 | 89 | 18.8 | 0.0 | 0.0 | 118K | black |
| 2 | 0.5 | 25.0 | 4266M | +584 | 673 | 135.6 | 0.0 | 22.1 | 3.4M | black |
| 3 | 0.2 | 25.0 | 35871M | +1694 | 2367 | 474.4 | 0.2 | 24.6 | 25.3M | black |
| 4 | 0.1 | 25.0 | 135291M | +3289 | 5656 | 1132.2 | 0.3 | 24.9 | 111M | black |
| 5 | 0.1 | 25.0 | 369094M | +5433 | 11089 | 2218.8 | 0.3 | 25.0 | 208M | black |
| 6 | 0.1 | 25.0 | 717594M | +7576 | 18665 | 3734.0 | 0.3 | 25.0 | 400M | black |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 1.0 | 0.9 | 0.9 | 0.9 | 0.9 | 0.9 |
| blue | 2.7 | 2.8 | 2.7 | 2.7 | 2.5 | 2.6 |
| mint | 1.8 | 1.8 | 1.8 | 1.9 | 1.7 | 1.8 |
| golden | 3.4 | 3.7 | 3.5 | 3.5 | 3.2 | 3.4 |
| violet | 3.6 | 4.3 | 4.1 | 4.2 | 4.3 | 3.9 |
| coral | 4.7 | 4.9 | 5.0 | 5.0 | 4.4 | 4.3 |
| marble | 11.0 | 4.4 | 4.4 | 4.7 | 4.5 | 5.0 |
| opal | 14.8 | 14.8 | 15.6 | 14.8 | 14.1 | 15.8 |
| ruby | 24.9 | 28.0 | 26.5 | 27.0 | 26.0 | 29.6 |
| black | 32.0 | 34.5 | 35.5 | 35.2 | 38.5 | 32.7 |

## The three biggest problems

### 1. The Fresh Batch floor never grows, so cycles shrink to about a minute and progress stops at Marble

`collapseReady` needs `COLLAPSE_MIN_RUN` = 1.2M run juice, and `collapseGain(1.2M)` = 9. Each Fresh Batch therefore pays +9 or +10 Flavors (+1.8x payout), and the next run reaches the same fixed 1.2M sooner.

| profile | Cycle 1 | Cycle 6 |
|---|---|---|
| casual | 11.1 min | 1.3 min |
| engaged | 6.3 min | 0.8 min |

A player who presses the button when it lights up:
- never unlocks Opal, Ruby or Black (furthest pearl is Marble in every cycle);
- never owns the Sledgehammer;
- never maxes Chain, Helpers, Golden or anything above it.

From cycle 3 on, the whole run is over in under 3 minutes.

### 2. Fresh Batch gains are tiny when taken at once and explode when the player waits

Gain is `floor(sqrt(run / 12500))`. Run income scales with the payout multiplier, so a player who waits gets Flavors that compound.

**Cycle 1:**

| profile | Flavors if taken at once (min 11.1 / 6.3) | Flavors at min 25 | Ratio |
|---|---|---|---|
| casual | +9 | +48 | 5x |
| engaged | +9 | +89 | 10x |

**After 6 cycles of 25 min:**
- The payout multiplier is **x3,238** (casual) and **x3,734** (engaged).
- Run juice reaches 555B–718B.
- From cycle 3 on, Fresh Batch is ready 0.1–0.3 min into each run.

Compare 6 cycles taken at once: x12.2, about 23 min of play for casual and 13 min for engaged.

So the button's best use depends heavily on patience. Neither path is a good loop:
- **Take at once:** a one-minute grind.
- **Wait:** the multiplier overwhelms every upgrade, and a run ends with 25 minutes of nothing to buy (problem 3).

### 3. From the second long run on, the upgrade shelf is empty and three pearls earn ~80% of the juice

**Shelf (plays-25 policy):** every upgrade except Sharp, Diamond Hammer included, maxes within 4.1 minutes in cycle 2 and within 0.7 minutes from cycle 3 on.

| profile | Cycle 2 | Cycle 6 |
|---|---|---|
| casual | 18.4 of 25 min with nothing to buy except Sharp | 25.0 of 25 min |
| engaged | 22.1 of 25 min | 25.0 of 25 min |

**Pearls:** in the same runs (cycles 2–6), Opal + Ruby + Black earn 77–82% of all income. Rose through Coral are each under 5%.

When Fresh Batch is taken at once, income is well spread instead (no type above ~30%). Pearl dominance is therefore a late-game symptom of problem 2, not a separate roster problem.

**Cycle 1, either policy:** the cheap tuning upgrades max early. Combo maxes at 6.2 min (casual) / 3.3 min (engaged), Fuel at 6.7 / 3.5, and Lucky at 7.3 / 3.9. After that, only the expensive chain upgrades are left.

## Tuning options (none applied)

Each option is a variant in `tools/sim32.js` (`--variant=NAME`), and `--compare` reproduces the table below. Each option was run under both player policies.

Columns: time per cycle C1..C6 (minutes), payout multiplier after 6 cycles, minutes per cycle with nothing to buy except Sharp, and furthest pearl per cycle.

| variant | profile | taken min C1..C6 | Flavors total | payout x | upgrades maxed in C1 | nothing-to-want ignoring Sharp, min C1..C6 | furthest pearl C1..C6 |
|---|---|---|---|---|---|---|---|
| baseline | casual | 11.1 / 4.3 / 2.8 / 1.9 / 1.6 / 1.3 | 56 | 12.2 | 7 of 20 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | marble / marble / marble / marble / marble / marble |
| baseline | engaged | 6.3 / 2.3 / 1.5 / 1.1 / 0.9 / 0.8 | 56 | 12.2 | 7 of 20 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | marble / marble / marble / marble / marble / marble |
| baseline +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 16187 | 3238.4 | 14 of 20 | 0.0 / 18.4 / 23.9 / 24.8 / 24.9 / 25.0 | black / black / black / black / black / black |
| baseline +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 18665 | 3734.0 | 18 of 20 | 0.0 / 22.1 / 24.6 / 24.9 / 25.0 / 25.0 | black / black / black / black / black / black |
| A_floor4M | casual | 15.0 / 4.0 / 2.2 / 1.7 / 1.2 / 1.1 | 104 | 21.8 | 10 of 20 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | ruby / ruby / ruby / ruby / ruby / ruby |
| A_floor4M | engaged | 8.3 / 2.1 / 1.3 / 1.0 / 0.8 / 0.6 | 107 | 22.4 | 10 of 20 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | ruby / ruby / ruby / ruby / ruby / ruby |
| A_floor4M +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 16187 | 3238.4 | 14 of 20 | 0.0 / 18.4 / 23.9 / 24.8 / 24.9 / 25.0 | black / black / black / black / black / black |
| A_floor4M +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 18665 | 3734.0 | 18 of 20 | 0.0 / 22.1 / 24.6 / 24.9 / 25.0 / 25.0 | black / black / black / black / black / black |
| B_logGain | casual | 11.1 / 3.9 / 2.5 / 1.9 / 1.5 / 1.3 | 60 | 13.0 | 7 of 20 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | marble / marble / marble / marble / marble / marble |
| B_logGain | engaged | 6.3 / 2.2 / 1.4 / 1.1 / 0.8 / 0.7 | 60 | 13.0 | 7 of 20 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | marble / marble / marble / marble / marble / marble |
| B_logGain +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 252 | 51.4 | 14 of 20 | 0.0 / 13.8 / 19.8 / 21.6 / 22.1 / 23.2 | black / black / black / black / black / black |
| B_logGain +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 262 | 53.4 | 18 of 20 | 0.0 / 17.1 / 21.1 / 22.7 / 23.3 / 24.0 | black / black / black / black / black / black |
| C_scaledFloorLog | casual | 13.8 / 7.3 / 6.3 / 7.7 / 9.6 / 11.6 | 198 | 40.6 | 9 of 20 | 0.0 / 0.0 / 0.0 / 3.1 / 6.4 / 9.2 | ruby / black / black / black / black / black |
| C_scaledFloorLog | engaged | 7.9 / 4.8 / 5.3 / 6.2 / 9.3 / 10.2 | 197 | 40.4 | 9 of 20 | 0.0 / 0.0 / 0.0 / 2.4 / 6.6 / 8.4 | ruby / black / black / black / black / black |
| C_scaledFloorLog +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 252 | 51.4 | 14 of 20 | 0.0 / 13.8 / 19.8 / 21.6 / 22.1 / 23.2 | black / black / black / black / black / black |
| C_scaledFloorLog +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 262 | 53.4 | 18 of 20 | 0.0 / 17.1 / 21.1 / 22.7 / 23.3 / 24.0 | black / black / black / black / black / black |
| C_plusCost12 | casual | 22.9 / 11.7 / 9.1 / 9.9 / 11.4 / 12.8 | 197 | 40.4 | 7 of 20 | 0.0 / 0.0 / 0.0 / 0.6 / 5.1 / 8.3 | marble / black / black / black / black / black |
| C_plusCost12 | engaged | 12.7 / 7.8 / 6.2 / 8.1 / 10.5 / 11.3 | 197 | 40.4 | 7 of 20 | 0.0 / 0.0 / 0.0 / 0.5 / 4.6 / 8.3 | marble / black / black / black / black / black |
| C_plusCost12 +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 234 | 47.8 | 8 of 20 | 0.0 / 0.0 / 12.9 / 17.5 / 19.9 / 21.3 | opal / black / black / black / black / black |
| C_plusCost12 +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 253 | 51.6 | 13 of 20 | 0.0 / 7.9 / 16.5 / 20.4 / 21.8 / 22.3 | black / black / black / black / black / black |
| cost12 | casual | 17.9 / 6.9 / 4.3 / 3.1 / 2.4 / 2.0 | 54 | 11.8 | 4 of 20 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | coral / coral / coral / coral / coral / coral |
| cost12 | engaged | 9.7 / 3.5 / 2.1 / 1.8 / 1.3 / 1.1 | 54 | 11.8 | 4 of 20 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | coral / coral / coral / coral / coral / coral |
| cost12 +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 12529 | 2506.8 | 8 of 20 | 0.0 / 0.0 / 21.7 / 24.4 / 24.6 / 24.9 | opal / black / black / black / black / black |
| cost12 +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 16715 | 3344.0 | 13 of 20 | 0.0 / 15.4 / 23.4 / 24.8 / 25.0 / 24.9 | black / black / black / black / black / black |
| scaledFloorOnly | casual | 11.1 / 6.9 / 4.1 / 5.0 / 10.1 / 23.8 | 3150 | 631.0 | 7 of 20 | 0.0 / 0.0 / 0.0 / 1.9 / 8.8 / 23.4 | marble / black / black / black / black / black |
| scaledFloorOnly | engaged | 6.3 / 3.6 / 3.2 / 4.3 / 7.5 / 20.9 | 3133 | 627.6 | 7 of 20 | 0.0 / 0.0 / 0.0 / 1.7 / 6.7 / 20.8 | marble / black / black / black / black / black |
| scaledFloorOnly +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 39.7 / 108.3 / >120 | 16500 | 3301.0 | 14 of 20 | 0.0 / 18.4 / 23.9 / 39.5 / 108.2 / 120.0 | black / black / black / black / black / black |
| scaledFloorOnly +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 46.9 / >120 | 7016 | 1404.2 | 18 of 20 | 0.0 / 22.1 / 24.6 / 46.8 / 120.0 | black / black / black / black / black |
| moreTuneLevels | casual | 11.2 / 4.1 / 2.7 / 2.0 / 1.7 / 1.3 | 55 | 12.0 | 1 of 20 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | marble / marble / marble / marble / marble / marble |
| moreTuneLevels | engaged | 6.4 / 2.4 / 1.5 / 1.2 / 0.9 / 0.8 | 55 | 12.0 | 1 of 20 | 0.0 / 0.0 / 0.0 / 0.0 / 0.0 / 0.0 | marble / marble / marble / marble / marble / marble |
| moreTuneLevels +plays 25 min | casual | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 22456 | 4492.2 | 14 of 20 | 0.0 / 20.0 / 24.2 / 24.8 / 25.0 / 25.0 | black / black / black / black / black / black |
| moreTuneLevels +plays 25 min | engaged | 25.0 / 25.0 / 25.0 / 25.0 / 25.0 / 25.0 | 26246 | 5250.2 | 19 of 20 | 0.0 / 22.5 / 24.8 / 24.9 / 25.0 / 25.0 | black / black / black / black / black / black |

### Option A: raise `COLLAPSE_MIN_RUN` from 1.2M to 4M (`A_floor4M`)

**Change:** one constant.

**Result:**
- **Cycle 1 gets longer:** 15.0 min (casual) and 8.3 min (engaged).
- **First run reaches further:** up to Ruby.
- **Later cycles still shrink:** 1.1 / 0.6 min by cycle 6, because the floor is still fixed.
- **No effect on waiting players:** x3,238 / x3,734 as before.

**Verdict:** a stopgap that improves the first run only.

### Option B: flatter `collapseGain` curve, `floor(10 * log10(run / 100000))` (`B_logGain`)

**Change:** one function. Gain is 10 at 1.2M, 26 at 44M and 54 at 30B.

**Result:**
- **Taming the waiting player is all it does.** After 6 runs of 25 min the multiplier is x51 (casual) and x53 (engaged), instead of x3,238 / x3,734. Every run still reaches Black.
- **Run length is unchanged** for players who take Fresh Batch at once: still 11.1 → 1.3 min.
- **The shelf is still empty for 14–24 of 25 minutes** from cycle 2 on, though less than baseline.

**Verdict:** fixes problem 2 only.

### Option C: floor scales with the multiplier plus the log curve (`C_scaledFloorLog`), recommended starting point

**Change:** `minRun = 3,000,000 × (1 + 0.2 × Flavors)²`, together with option B's gain curve.

**Result:**

| profile | cycle times C1 → C6 (min) |
|---|---|
| casual | 13.8 / 7.3 / 6.3 / 7.7 / 9.6 / 11.6 |
| engaged | 7.9 / 4.8 / 5.3 / 6.2 / 9.3 / 10.2 |

- **Cycles stop shrinking.** They settle at 5–12 minutes and slowly lengthen.
- **Each cycle reaches further:** Ruby in cycle 1, Black from cycle 2.
- **Flavors per Fresh Batch grow steadily** (+14, +26, +34, +38, +42, +44), ending at x40 after 6 cycles.
- **Waiting is no longer a trap:** x51–53 after six 25-minute runs, versus x40 for taking it at once over a much shorter total time.

**Costs:**
- `collapseReady` needs to know the player's Flavors.
- The "Earn X juice to unlock a Fresh Batch" text in `updateShelf()` needs the same number.

**Remaining gap:** from cycle 4 on, 2.4–9.2 minutes per cycle still have nothing to buy except Sharp. See "Open question" below.

Full tables for option C (`node tools/sim32.js --variant=C_scaledFloorLog`), summary and income split:

#### casual (1.5 taps/s, skill 0.3, seed 1)

| cycle | Fresh Batch ready (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 13.8 | 13.8 | 3.0M | +14 | 14 | 3.8 | 0.0 | 0.0 | 13K | ruby |
| 2 | 7.3 | 7.3 | 44.0M | +26 | 40 | 9.0 | 0.0 | 0.0 | 333K | black |
| 3 | 6.3 | 6.3 | 256M | +34 | 74 | 15.8 | 0.0 | 0.0 | 881K | black |
| 4 | 7.7 | 7.7 | 758M | +38 | 112 | 23.4 | 0.0 | 3.1 | 2.7M | black |
| 5 | 9.6 | 9.6 | 1658M | +42 | 154 | 31.8 | 0.0 | 6.4 | 3.0M | black |
| 6 | 11.6 | 11.6 | 3035M | +44 | 198 | 40.6 | 0.0 | 9.2 | 4.1M | black |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 8.7 | 1.6 | 0.9 | 0.8 | 0.8 | 0.7 |
| blue | 12.6 | 3.4 | 2.2 | 2.3 | 2.2 | 2.3 |
| mint | 9.8 | 2.4 | 1.7 | 1.5 | 1.5 | 1.6 |
| golden | 8.1 | 3.3 | 2.8 | 3.1 | 3.1 | 2.8 |
| violet | 15.8 | 4.4 | 3.3 | 3.1 | 3.6 | 3.5 |
| coral | 15.6 | 6.5 | 3.1 | 3.3 | 3.8 | 3.0 |
| marble | 19.8 | 14.4 | 5.8 | 5.1 | 4.5 | 4.1 |
| opal | 9.7 | 21.8 | 17.6 | 16.7 | 16.4 | 15.0 |
| ruby | 0.0 | 14.9 | 24.9 | 19.8 | 30.8 | 29.8 |
| black | 0.0 | 27.3 | 37.9 | 44.2 | 33.4 | 37.2 |

#### engaged (2.5 taps/s, skill 0.7, seed 2)

| cycle | Fresh Batch ready (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 7.9 | 7.9 | 3.1M | +14 | 14 | 3.8 | 0.0 | 0.0 | 23K | ruby |
| 2 | 4.8 | 4.8 | 44.0M | +26 | 40 | 9.0 | 0.0 | 0.0 | 377K | black |
| 3 | 5.3 | 5.3 | 243M | +33 | 73 | 15.6 | 0.0 | 0.0 | 999K | black |
| 4 | 6.2 | 6.2 | 730M | +38 | 111 | 23.2 | 0.0 | 2.4 | 2.9M | black |
| 5 | 9.3 | 9.3 | 1615M | +42 | 153 | 31.6 | 0.0 | 6.6 | 4.0M | black |
| 6 | 10.2 | 10.2 | 2996M | +44 | 197 | 40.4 | 0.0 | 8.4 | 4.3M | black |

Share of cycle income by pearl type (%):

| pearl | C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|---|
| pearl | 5.1 | 1.3 | 0.9 | 0.9 | 1.0 | 0.9 |
| blue | 10.0 | 3.4 | 3.1 | 2.6 | 2.9 | 2.5 |
| mint | 7.7 | 2.5 | 2.1 | 1.5 | 1.9 | 1.7 |
| golden | 10.0 | 5.1 | 3.8 | 3.2 | 4.0 | 3.4 |
| violet | 17.9 | 3.8 | 4.2 | 4.5 | 5.1 | 4.3 |
| coral | 13.9 | 7.5 | 4.8 | 3.4 | 5.1 | 4.7 |
| marble | 21.2 | 14.1 | 8.1 | 4.4 | 5.6 | 5.2 |
| opal | 14.1 | 19.5 | 19.8 | 16.1 | 16.1 | 14.2 |
| ruby | 0.0 | 27.6 | 20.8 | 20.2 | 29.8 | 23.1 |
| black | 0.0 | 15.4 | 32.4 | 43.2 | 28.5 | 40.0 |

#### Also tried (not recommended)

| variant | levers | why not |
|---|---|---|
| `cost12` | `COST_SCALE` 6 → 12 | Cycle 1 goes to 17.9 / 9.7 min, but cycles still shrink to 2.0 / 1.1 min. The first run only reaches Coral. Waiting players still reach x2,507 / x3,344. |
| `C_plusCost12` | option C + `COST_SCALE` 12 | Cycle 1 is 22.9 min for casual, which is long for a first prestige. The shelf is still empty 8.3 min per cycle by cycle 6. Doubling every cost does not keep up with an income that multiplies each cycle. |
| `scaledFloorOnly` | 1.2M × multiplier², gain curve unchanged | Flavors per batch grow with the multiplier, so the floor runs away: cycle 6 takes 23.8 min (casual). With waiting, cycles 4–5 take 40–108 min, and the engaged run's cycle 5 does not reach the floor within 120 min. |
| `moreTuneLevels` | max Combo 20, Fuel 8, Spawn 18, Lucky 12, Sweep 8 | Only 1 of 20 upgrades maxes in cycle 1 instead of 7, but run length is unchanged. Waiting players reach x4,492 / x5,250, because the extra levels add more income. |

## Open question for Ian

None of the four levers solves the empty shelf. Every upgrade cost is fixed, while income multiplies with Flavors, so after a few Fresh Batches everything is affordable within a minute or two of a run. Fixing that needs one of two things:
- costs that scale with Flavors;
- spending that lasts across Fresh Batches, such as a Flavor shop (artifacts are not built yet).

Both are design decisions rather than number tweaks.

## Number display (step 5)

`fmt` in `src/econ.js` formats juice, rate, costs and backpack values.

**Bugs fixed:**
- **Wrong rounding at suffix boundaries.**
  - 999,500 showed as `1000K` instead of `1.00M`, at every boundary (`1000M`, `1000B`, …).
  - 99,950 showed as `100.0K` (one character wider than any other value).
- **No guard past the end of the suffix table.** Past 1e36 it printed `1000Dc` and `10000000Dc`, and `Infinity` printed as `InfinityDc`. The suffix list now runs to `Vg` (1e63), and Infinity prints `∞`.

**Not changed:**
- **The Fresh Batch button and the Flavors line print raw integers** (`+6666 Flavors`, `payouts x3238.4`). They still fit at every value the sim reaches.
- **The largest value the sim reaches** is 718B run juice, 233B held, and 379B as the most expensive item on offer (Sharp). That is far inside the suffix range.

Output after the fix (`n`, `fmt(n)`, `fmtV(n)`; the last row is the largest run juice the sim reaches):

| n | fmt(n) | fmtV(n) |
|---|---|---|
| 0 | 0 | 0 |
| -5 | 0 | -5 |
| NaN | 0 | 0 |
| Infinity | ∞ | ∞ |
| 0.004 | 0 | 0 |
| 0.25 | 0 | 0.3 |
| 0.5 | 0 | 0.5 |
| 0.999 | 0 | 1 |
| 1.5 | 1 | 1.5 |
| 9.99 | 9 | 10 |
| 12.7 | 12 | 12 |
| 999.9 | 999 | 999 |
| 1000 | 1,000 | 1,000 |
| 9999 | 9,999 | 9,999 |
| 9999.5 | 9,999 | 9,999 |
| 10000 | 10.0K | 10.0K |
| 99949 | 99.9K | 99.9K |
| 99950 | 100K | 100K |
| 99999 | 100K | 100K |
| 100000 | 100K | 100K |
| 999499 | 999K | 999K |
| 999500 | 1.00M | 1.00M |
| 999999 | 1.00M | 1.00M |
| 1000000 | 1.00M | 1.00M |
| 10000000 | 10.0M | 10.0M |
| 100000000 | 100M | 100M |
| 1000000000 | 1.00B | 1.00B |
| 10000000000 | 10.0B | 10.0B |
| 100000000000 | 100B | 100B |
| 1000000000000 | 1.00T | 1.00T |
| 10000000000000 | 10.0T | 10.0T |
| 100000000000000 | 100T | 100T |
| 1000000000000000 | 1.00Qa | 1.00Qa |
| 10000000000000000 | 10.0Qa | 10.0Qa |
| 100000000000000000 | 100Qa | 100Qa |
| 1000000000000000000 | 1.00Qi | 1.00Qi |
| 1e+21 | 1.00Sx | 1.00Sx |
| 1e+33 | 1.00Dc | 1.00Dc |
| 1e+36 | 1.00Ud | 1.00Ud |
| 1e+40 | 10.0Dd | 10.0Dd |
| 717594129858 | 718B | 718B |
