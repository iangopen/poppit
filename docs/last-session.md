Poppit session summary, 2026-10-21: forge engine and Pink Duck x1.4

The forge engine is built and the Pink Duck now pays x1.4. There is no forge UI yet:
the panel, the Strike tap and the dock button are next session.
All tests pass and everything is pushed to main.

Verification
- npm run build: built index.html
- Econ unit tests: 31 of 31 pass
- Artifacts unit tests: 6 of 6 pass
- Forge unit tests (new): 13 of 13 pass
- Page tests: 7 of 7 pass
- Harness: 177 checks, ALL PASSED (20 new)
- Away-bonus sim tests: 2 of 2 pass
- npm run sim twice: identical output.
- The new Rose table is the only addition to the sim output.

One forge job through the harness (Date.now pinned)
- Started Rose Dust: Rose Pearls went from 250 to 150.
  - The 4 shiny Roses were not touched.
- The job ran 30 s. At 15 s, progress was 0.5 and nothing was in stock yet.
- At 30 s the game loop finished it: Rose Dust went from 0 to 1 and the slot was free.
- With frenzy on, the forge ran at x2 and the job ended in 15 s.
  - A save made during frenzy stored the end at x1, 30 s.
- A Strike took exactly 1 s off.
- Two jobs and a clock set back 1 h: neither job finished early.
- Back after 31 s: both jobs finished.
  - The toast read "Welcome back! 2 forge jobs finished while you were away".

Pink Duck at x1.4: first Fresh Batch with the duck owned
- Reference seeds: casual 11.2 min, engaged 3.6 min.
  - Without the duck: 12.8 and 6.2 min. At x1.25: 8.9 and 4.3 min.
- Means over seeds 1-8:
  - Casual: 12.7 min without, 10.6 at x1.25, 9.9 at x1.4.
  - Engaged: 5.6 min without, 4.7 at x1.25, 4.0 at x1.4.
- So x1.25 cut the first run by about 16% on average, not 30%.
  - The 30% came from casual seed 1, which happened to be fast.
- x1.4 cuts it by about 22% casual and 29% engaged on average.
- Casual seed 1 alone reads slower at x1.4 than at x1.25 (11.2 vs 8.9 min).
  - That's seed noise; the averages run in order.

Collecting 10,000 kept Rose Pearls (sim; it can't keep pearls, so this uses Rose pop rates)
- Each line gives: minutes for 10,000, then what selling them would have paid,
  then the Rose share of income.
- Casual, no duck
  - First helper: 102 min, 464K, 0.5%
  - First Fresh Batch: 59 min, 441K, 0.2%
  - Cycle 6: 45 min, 1.5M, 0.2%
- Engaged, no duck
  - First helper: 127 min, 512K, 0.6%
  - First Fresh Batch: 49 min, 465K, 0.2%
  - Cycle 6: 76 min, 1.4M, 0.2%
- Casual, duck owned
  - First helper: 98 min, 689K, 0.9%
  - First Fresh Batch: 38 min, 606K, 0.1%
  - Cycle 6: 85 min, 2.5M, 0.4%
- Engaged, duck owned
  - First helper: 135 min, 627K, 0.5%
  - First Fresh Batch: 96 min, 654K, 0.1%
  - Cycle 6: 81 min, 2.0M, 0.1%
- Collecting takes 38 to 135 minutes of play, much longer than one run.
  - The stash builds up over several Fresh Batches (kept stacks survive them).
- The income given up is tiny, because Roses are well under 1% of income.
- Measured with every type in the pool; a Rose-only pool would collect faster.

What was built
- src/forge.js: one Dust per pearl type.
  - Quantity falls and time doubles per type, from Rose (100 pearls, 30 s)
    to Black (3 pearls, 4 h 16 min).
  - Jobs are start and end timestamps. Functions: start, progress, finish, collect.
  - Speed: +25% per Forge Speed level, x2 during frenzy.
  - Strike: 1 s off the running job, at most 5 per second.
  - Slots: 1 at the start, plus up to 3 from Extra Slot.
- Forge upgrades, bought with juice:
  - Forge Speed: 20,000 then x2.8 per level, max 10.
  - Extra Slot: 250,000 then x10 per level, max 3.
- Artifact costs now accept forge materials, tested with a fixture artifact.
- Save version 5: older saves get an empty forge.
  - Loaded values are clamped.
  - Save codes, import backups and Restore carry the forge.
- Fresh Batch keeps the whole forge; Reset save forgets it.
- Offline: jobs whose end time has passed finish on load or return,
  and the away toast says how many.

Choices I made without asking
- Material names and recipe numbers (above); all are data in src/forge.js.
- Upgrade prices are first guesses. They don't use COST_SCALE.
- Frenzy only speeds the forge while the page is open and visible.
  - Saves store end times at normal speed, and hiding the tab drops frenzy.
- If the clock goes back, progress is measured from the job's start, so it can't finish early.
- Strike targets the first running job unless a slot is named.
- Starting a job also takes the pearls' share of backpack sale value.
- Finished jobs go to the stock by themselves every frame; there's nothing to collect by hand.
- Small changes to existing code:
  - The Artifacts card says "in stock" for material costs, "kept" for pearls.
  - At boot, the away check now runs even when the save has no time stamp,
    so finished forge jobs are always counted.
- To get a duck-only commit, I built it in a temporary worktree,
  then moved main onto it, keeping the working tree. Nothing was lost; all commits are pushed.

Commits (pushed to main)
- Pink Duck pays x1.4.
- Forge engine, save v5 and tests. Verified alone in a clean worktree.
- Sim: Rose collection table.
- CLAUDE.md and this file.

Still open
- Next session: the forge panel, the Strike tap and the forge dock button. No UI calls the forge yet.
- Recipe numbers and forge prices are untested in play. No sim models the forge.
- Nothing uses materials yet.
- Still open from earlier sessions:
  - choose the per-Flavor bonus;
  - choose a Black Pearl option;
  - one pearl type still dominates income in some cycles;
  - engaged cycles still run under 4 minutes;
  - the 13 px bottom bar overflow on phones.
