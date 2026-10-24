Session: Flavor study. A study only: no change to src/, saves or tests.

What changed
- tools/sim32.js, all behind flags (the default output is byte-identical):
  - variants flavorB to flavorE (lever flavor: { div, exp, need });
  - cycle() carries lifetime juice and an optional take-policy;
  - --flavors prints the whole study; --flavors-ducks=C plays rule C with ducks.
- docs/flavor-study.md: the tables, the recommendation, the exact code changes, the save
  impact and what the player would notice.
- CLAUDE.md: the study's location and the open decision.

Rules (all keep the 5M run floor and 10% per Flavor)
- A: today: floor(sqrt(run / 1.25M)), ready at 5M with a gain of at least 2.
- B: owed = floor(sqrt(lifetime / 1.25M)), a reset pays owed minus held, at least 2.
- C: B, ready only once the gain is at least 50% of the Flavors held.
- D: B, ready only once the gain is at least 100% of the Flavors held.
- E: B with exponent 0.4 (divisor 883,883, still exactly 2 at the first 5M).

Strategy comparison: Flavors held at 1h / 2h / 3h, then the 3-hour spread
(best payout over worst; 1.00 = level)
- A casual: at once 19 / 99 / 273; +100% 82 / 658 / 1316; minute 25 167 / 863 / 3293.
  Spread 11.67
- A engaged: at once 137 / 697 / 1853; +100% 1025 / 2050 / 4101; minute 25 338 / 1828 /
  7101. Spread 3.82
- B casual: at once 10 / 35 / 67; +100% 32 / 256 / 512; minute 25 133 / 423 / 970.
  Spread 12.73
- B engaged: at once 52 / 154 / 296; +100% 448 / 896 / 1792; minute 25 275 / 937 / 2193.
  Spread 7.20
- C casual: at once 18 / 216 / 486; +100% 32 / 256 / 512; minute 25 133 / 423 / 953.
  Spread 1.94
- C engaged: at once 434 / 977 / 2199; +100% 448 / 896 / 1792; minute 25 275 / 937 /
  2109. Spread 1.23
- D casual: at once 32 / 256 / 512; +100% 32 / 256 / 512; minute 25 133 / 266 / 532.
  Spread 1.04
- D engaged: at once 448 / 896 / 1792 (stalled); +100% the same (stalled); minute 25
  275 / 1146 / 1146. Spread 1.56
- E casual: at once 10 / 30 / 52; +100% 16 / 64 / 64; minute 25 46 / 89 / 144.
  Spread 2.48
- E engaged: at once 37 / 87 / 139; +100% 96 / 96 / 192; minute 25 77 / 153 / 253.
  Spread 1.77
- "Stalled": a run passed 120 minutes without a Fresh Batch.

Early timings, Fresh Batch at once: C1 ready, then C2 to C6 (minutes)
(* under 4 min, ^ longer than the cycle before)
- A casual: 12.8, 12.9^, 10.2, 8.6, 6.6, 5.4
- A engaged: 6.0, 3.6*, 3.4*, 3.0*, 2.2*, 2.3*^
- B casual: 12.8, 12.9^, 11.7, 9.0, 7.9, 7.3
- B engaged: 6.0, 3.7*, 3.8*^, 3.3*, 3.0*, 2.5*
- C casual: 12.8, 12.9^, 11.7, 9.2, 7.7, 6.4
- C engaged: 6.0, 3.7*, 4.0*^ (3.98), 4.5^, 3.9*, 3.0*
- D casual: 12.8, 12.9^, 12.2, 10.4, 9.1, 10.9^
- D engaged: 6.0, 3.8*, 5.5^, 4.6, 4.5, 6.3^
- E casual: 12.8, 13.2^, 12.0, 10.0, 8.0, 8.2^
- E engaged: 6.0, 3.8*, 4.4^, 3.7*, 3.3*, 3.3*

Rule C with ducks (Flavors at 1h / 2h / 3h, spread at 3h)
- Pink Duck casual: 63 / 485 / 1092, 113 / 454 / 908, 172 / 584 / 1314. Spread 1.44
- Pink Duck engaged: 649 / 1464 / 3294, 620 / 1241 / 2482, 387 / 1304 / 2937. Spread 1.33
- All ten casual: 213 / 1080 / 1620, 192 / 770 / 1540, 249 / 827 / 1864. Spread 1.21
- All ten engaged: 853 / 2887 / 4331, 621 / 2486 / 2486, 499 / 1827 / 4114. Spread 1.74
- Ducks shorten runs (all ten: engaged runs 2 to 3 min) but the spread stays small.

Recommendation: rule C
- The reset habit no longer decides the outcome: 1.2 to 1.9 apart, against 3.8 to 11.7
  today. It avoids D's walls (stalls, longer runs) and E's flatness (x6 to x26 after 3 h).
- The first Fresh Batch is unchanged (2 Flavors at 5M), and so is the 10% per Flavor.
- It does not fix engaged cycles under 4 minutes; that needs a run-length lever.
- Saves: add flavorJuice with a v9 to v10 migration, flavorJuice = max(lifetime,
  1.25M x Flavors^2), so every existing Flavor stays valid. Without it, players would
  need 9 to 10 times their lifetime juice before the next Fresh Batch; with it,
  2.25 to 2.33 times.
- Exact code changes are listed in docs/flavor-study.md.

Found while studying (reported, not fixed)
- Selling backpack pearls adds their value to the current run's juice, and kept stacks
  survive a Fresh Batch. Pearls kept over several runs and sold in one raise that run's
  Flavors under today's rule. The away bonus counts as run juice the same way.

Verification
- npm run build: built index.html (unchanged). npm test: exit 0; node test files 0
  failures (32, 19, 9, 21, 8, 2); the harness prints ALL PASSED.
- npm run sim twice: identical, and identical to the saved earlier output.
- --flavors twice: identical. --flavors-ducks=C twice: identical.
- git diff --stat for the session: only tools/sim32.js, docs/ and CLAUDE.md.

Choices I made
- Lifetime in the sim is the sum of run juice (the sim takes no away bonus and sells
  nothing).
- "At least 50% / 100% of held" is rounded up, and never below 2.
- The +100% strategy under A waits for the run's own gain to reach the Flavors held.
- A strategy run stops if a single run passes 120 minutes without a Fresh Batch, and is
  marked "stalled".
- Rule C was picked for the duck runs: it has the smallest spread without stalling.
- One seed per profile, like the other reports.

Still open
- The Flavors decision (Ian): adopt rule C, or keep today's rule.
- Engaged cycles under 4 minutes (any rule), and how hard ducks stack.
- The real-phone check.
