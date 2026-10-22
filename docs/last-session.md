Poppit session summary, 2026-10-22: pacing dials (10% Flavors, Black Pearls, the artifact stack)

Three data values changed. Flavors add 10% each instead of 20%. Black Pearls cost 55,000
base instead of 60,000, and their first-level spawn weight is 0.8 instead of 0.15. The
Fresh Batch floor did not change. Black now earns in 4 of 6 cycles for both profiles.
The engaged 4-minute floor still misses. Casual's first run stays at 12.8 min, but
engaged's moved from 6.2 to 6.0 min; see "Where I could not meet the brief".
Everything is pushed.

Verification
- npm run build: built index.html
- Econ unit tests: 32 of 32 pass (1 new: pins the new dials and the sim's two ducks)
- Artifacts unit tests: 14 of 14 pass
- Forge unit tests: 21 of 21 pass
- Page tests: 8 of 8 pass
- Harness: 258 checks, ALL PASSED (the payout-line check now reads x1.68, Flavors x1.2)
- Away-bonus sim tests: 2 of 2 pass. All 24 sim checkpoints read 0.88 to 1.04 (target
  0.85 to 1.15).
- npm run sim, twice: the two outputs are identical.
- The sim variant oldDials reproduces last report's baseline byte for byte.

Where I could not meet the brief
- The first Fresh Batch is 12.8 min casual (unchanged) and 6.0 min engaged (was 6.2).
- No Black combination that passes item 2 keeps engaged at exactly 6.2. Spawning more
  Blacks shifts the seeded random stream inside run 1, even though Black unlocks after it.
- 6.0 is inside the 6 to 8 band that item 2 allows. Over seeds 1 to 8 the engaged mean
  is 5.4 min (5.6 before), casual 12.8 (12.7 before).
- Only 45,000 with the old weight kept 12.8 / 6.2 exactly. Black then earned in only
  2 and 1 cycles.

Item 1: 10% per Flavor (old Black dials, six cycles)
- casual: 12.8 / 13.4 / 6.7 / 8.0 / 8.8 / 7.1 min (at 20%: 12.8 / 10.8 / 7.7 / 6.6 / 5.9 / 5.8)
- engaged: 6.2 / 4.5 / 4.2 / 3.4 / 2.9 / 3.0 min (at 20%: 6.2 / 3.5 / 3.1 / 3.1 / 2.1 / 2.4)

Item 2: Black Pearls
- Base cost alone, weight 0.15 (first run casual / engaged; cycles with Black income):
  - 45,000: 12.8 / 6.2; 2 and 1 cycles. Fails: too few.
  - 35,000: 14.2 / 5.9; 1 and 0. Fails: both first runs out of band.
  - 28,000: 13.5 / 6.8; 1 and 3. Fails: casual out of band.
- So I also raised NEW_BASE.black, over a grid of 7 bases x 7 weights (in the report).
  Black's share is all or nothing per cycle: one pop is 70 to 98% of that cycle.
- Of your three bases, only 35,000 with weight 1.2 passes: first run 12.9 / 6.5, and Black
  takes 77% and 58% of all income over 8 seeds.
- Chosen: base 55,000 with weight 0.8. It is the smallest lowering that passes.
  - Reference seeds: first run 12.8 / 6.0; Black earns in 4 and 4 cycles.
  - Over seeds 1 to 8: 3.5 and 3.1 of 6 cycles.
- Black's income share per cycle (C1..C6, %):
  - casual: 0 / 80.7 / 86.3 / 92.9 / 0 / 86.7
  - engaged: 71.6 / 79.2 / 87.3 / 86.2 / 0 / 0
  - before: 0 in every cycle for both.

Final numbers (npm run sim, reference seeds, Fresh Batch taken at once, no duck)
- casual: first Fresh Batch 12.8 min; cycles 12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4;
  19 Flavors, payout x2.9 after six cycles (was 15, x4.0).
- engaged: first Fresh Batch 6.0 min; cycles 6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3;
  19 Flavors, payout x2.9 (was 13, x3.6).
- Black earning makes engaged runs shorter: a Black pop jumps run juice past the floor.
  Over 8 seeds, 35 of 40 engaged later cycles are under 4 min (33 of 40 without Black).

Item 3: Fresh Batch floor scaled by Flavors (floor x (1 + 0.1 x Flavors)), not applied
- unscaled: casual 12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4; engaged 6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3
- scaled: casual 12.8 / 12.9 / 10.2 / 8.6 / 7.2 / 5.5; engaged 6.0 / 3.6 / 3.4 / 3.0 / 2.5 / 2.2
- Not applied: engaged C2 is 3.6 min, under 4, and C6 is not shorter than C5.
- It barely acts. Runs end on a big pop that clears the scaled floor too, so C1 to C4 are
  identical; a 20% scale gave the same times. The first run cannot move (0 Flavors).

Item 4: duck off and duck on (not tuned against; the 4-minute target is the no-duck run)
- no duck: casual 12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4; engaged 6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3
- plain duck x1.4: casual 11.0 / 8.6 / 6.2 / 5.0 / 4.1 / 4.6;
  engaged 3.6 / 3.3 / 2.6 / 2.1 / 2.4 / 1.8
- best duck x1.61: casual 8.9 / 7.4 / 4.6 / 5.1 / 4.8 / 2.9;
  engaged 2.7 / 2.8 / 2.2 / 1.9 / 2.1 / 1.7
- Under the floor:
  - plain duck: no casual cycle; every engaged cycle, by 0.4 to 2.2 min;
  - best duck: casual C6 by 1.1 min; every engaged cycle, by 1.2 to 2.3 min.
- New flags: --duck (plain, x1.4) and --duck=best (Mythic, top payout perk, x1.61).

Item 5: waiting to minute 25 (report only)
- casual: 2,238 Flavors, x224.8 after six cycles (before: 1,827, x366)
- engaged: 4,871 Flavors, x488.1 (before: 3,567, x714)
- The multiplier is about a third lower. Black, now 79 to 87% of a long run's income,
  brings more Flavors. Flavors still explode with waiting.

Targets from the report (new dials, reference seeds)
- First Fresh Batch 11-13 casual, 6-8 engaged: 12.8 and 6.0. Met.
- First Fresh Batch unchanged at 12.8 / 6.2: casual met; engaged not met (6.0).
- First helper 70-90% of the way: 89% casual, 80% engaged. Met.
- No upgrade group maxed in run 1: met by group.
  - Read per upgrade: not met (10 and 9 of 18 reach max).
- Each later cycle shorter: not met. Casual C2 is +0.1 min, engaged C6 is +0.1 min.
- No cycle under 4 min (no duck): casual met (shortest 5.4); engaged not met (C2 to C6
  are 2.2 to 3.6).
- Black earns in at least 3 of 6 cycles: met (4 and 4).

Choices I made without asking
- Item 2's band rule (11-13 / 6-8) won over the exact 12.8 / 6.2, which no passing option
  could hold.
- I tried bases outside your list (60,000, 55,000, 50,000, 40,000) and weights up to 1.2.
  I chose 55,000 / 0.8 over 35,000 / 1.2 (the one passing base on your list). It moves the
  first run less, and Black dominates income less.
- 60,000 with weight 1.0 also passed, but it does not unlock Black earlier, which was the
  point of option A.
- I checked every candidate over seeds 1 to 8, not only the reference seeds.
- The best-case duck models payout only (x1.61). A real Mythic also has two other perks.
- The sim's scaledFloor now follows FLAVOR_BONUS; flavor10 became flavor20 (old value).
  A new oldDials variant replays the old dials.
- The sim's newBase lever writes ECON's own NEW_BASE table for the run and restores it.
  ECON now exports NEW_BASE.
- The Fresh Batch text now reads "Each Flavor adds 10%" from the constant; it was a
  hard-coded "20%".
- The payout table, hits per type, COST_SCALE and the Fresh Batch floor are unchanged.

Commits (pushed to main)
- Sim: newBase lever, --duck=best, oldDials and pinkDuckBest variants. Checked to leave
  npm run sim unchanged at that commit.
- Pacing dials: 10% Flavors, Black base 55,000 and weight 0.8, the Fresh Batch text, tests.
- docs/balance-report.md regenerated.
- CLAUDE.md and this file.

Still open
- Engaged later cycles run under 4 min (2.2 to 3.6). This needs a non-data change:
  Fresh Batch costs growing faster than the multiplier, or a gain curve that does not
  pay for overshoot.
- Black now dominates income: one pop is 70 to 93% of a cycle, and 10 of 12 cycles have
  one type over 60%.
- Black is tap-only (helpers need power 107), so it earns nothing while away.
- Flavors still explode when the player waits (x224.8 and x488.1).
- Casual runs about 2.3x engaged, wider than the bands allow (tap rate and skill).
- With a duck, every engaged cycle runs under 4 min, by design not tuned against.
- No second duck; most dusts have no use; relic icons are first drawings.
- Not checked on a real phone.
