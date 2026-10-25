Session: rule C is in the game (Flavors from all juice so far), save v10, the Fresh Batch box.

What changed
- src/econ.js: Flavors owed = floor(sqrt(flavorJuice / 1.25M)). A Fresh Batch pays owed minus
  held. It is ready at 5M run juice once the gain is at least max(2, ceil(0.5 x held)).
  - Named constants: COLLAPSE_GAIN_DIV 1.25M, FLAVOR_NEED 0.5, FLAVOR_MIN_GAIN 2.
  - New helpers: flavorsOwed, flavorJuiceFor, flavorNeed, collapseProgress.
- Save v10: state.flavorJuice grows wherever lifetime grows (auto-sold pops, sold pearls, away
  bonus). The v9 -> v10 step sets it to max(lifetime, 1.25M x Flavors^2). It is clamped on
  load, carried by save codes, import, backup and Restore, kept by Fresh Batch, and zeroed by
  Reset save. The lifetime stat is unchanged.
- Fresh Batch box: "Now: +67 Flavors. Ready at +150 (half your 300).", a progress bar, then
  whichever gate is further away ("Earn 84.4B more juice to reach +150." or "Earn 5.00M juice
  in this run to unlock it (3.00M so far)."). The goal line now names the +2 Flavors.
- Sim: the default plays the game's rule from src/econ.js (checkCopies compares the two on a
  grid). --variant=ruleA is the old rule and reproduces the 2026-10-22 baseline byte for byte.
  docs/balance-report.md is regenerated (rule C and A, with and without the Pink Duck).
- Away bonus fix (needed for npm test): tests/away.test.js failed at the engaged C6 checkpoint
  (0.83, limit 0.85), because rule C ends runs later. Cause: helperIdle counted the frenzy meter
  as filled only at the normal pop rate. The game keeps filling it during a frenzy at 4x.
  The frenzy share now counts that. When helpers are the limit it equals the old formula, and
  every rule A checkpoint is unchanged.
- Tests: new rule C tests in tests/econ32.test.js and a new tests/flavor_tests.js. Every test
  that forces a Fresh Batch now also sets flavorJuice.
- tools/audit.js batch: screenshots of the box at 390x844 (docs/audit/batch-390-*.png).

Verification
- npm run build: "built index.html". npm test: exit 0; node test files 36, 19, 9, 21, 8 and 2
  pass, 0 fail; the harness prints ALL PASSED (430 PASS lines).
- npm run sim twice: identical output.
- Six cycles, rule C, no duck (minutes; Flavors held after each cycle):
  - casual 12.8 / 12.9 / 11.7 / 9.2 / 7.7 / 6.4; Flavors 2 / 4 / 6 / 12 / 18 / 27 (x3.7)
  - engaged 6.0 / 3.7 / 4.0 / 4.5 / 3.9 / 3.0; Flavors 3 / 5 / 9 / 14 / 21 / 37 (x4.7)
  - rule A was casual 19 Flavors (x2.9), engaged 19 (x2.9)
- With the Pink Duck: casual 11.0 / 8.6 / 6.5 / 5.5 / 5.5 / 5.1 (27 Flavors); engaged
  3.6 / 3.3 / 2.7 / 2.9 / 3.1 / 3.0 (23 Flavors).
- First Fresh Batch: casual ready at 12.8 min with +2 Flavors (6.0M run juice). Engaged ready
  at 6.0 min (5.97) with +3, not +2: its first run ends on a Black pop at 14.0M run juice. Rule A
  gave the same +3, so nothing changed there.
- Harness, a v9 save with 300 Flavors and 3.0e10 lifetime juice:
  - after migration: flavorJuice 1.125e11, owed 300, gain +0, gain needed +150, 1.406e11
    more juice to go (gate at 2.531e11), progress 0%, not ready, button disabled
  - 25%: gain +43, bar 25%, not ready; 50%: +82, 50%, not ready; 99.9%: +149, 99%, not ready
  - a click before the gate does nothing
  - at the gate: +150, 100%, ready, "Fresh Batch for +150 Flavors"; taking it gives 450 Flavors,
    flavorJuice kept, next need +225, progress 0%
- Kept pearls sold in run 3, one stack per run, or all in run 4 all end at the same flavor juice
  and 6 Flavors.
- Migration checks: 0 Flavors (3M lifetime) -> 3M; 15 Flavors (1.2e8) -> 2.81e8; 15 Flavors
  (5e8) -> 5e8; 300 Flavors -> 1.125e11.
- 390x844, headless Chrome: the page is 390/390 and the box 356/356 in all three states (new
  player, not ready, ready). Every part of the box has scrollWidth = clientWidth, nothing sticks
  out, and there are no console errors. I looked at the screenshots: both states read cleanly.
- Pushed to main (3 commits). The CI run on main (40144996835) finished green.

Choices I made
- The study's call shape collapseGain(run, echoes, life) is kept; the gain ignores run.
- The bar shows the slower of the two gates, counted from the juice the Flavors held stand for,
  so it starts at 0 after a Fresh Batch or the migration.
- "(half your N)" shows only when the need is above 2. With 0 Flavors and 3M juice the box says
  "+1 Flavor" now, which is honest under rule C.
- The not-ready line names only the gate that is further away, because run juice feeds both.
- A loaded flavorJuice is not raised to lifetime; only the migration does that.
- The away frenzy-share fix is a model fix, not a balance dial. CLAUDE.md says to fix the
  formula, not the target. A first attempt (greedy helper hits) made first-helper checkpoints
  6-7x too high and was reverted before this one.
- Commits: game, tests and sim are one commit, because each needs the others to pass npm test.
  The audit tool and the docs are separate commits.

Still open
- Engaged cycles near 4 min: C2 3.7, C3 3.997, C5 3.9, C6 3.0 (4 of 5 under, against 5 of 5
  under rule A). This needs a run-length lever.
- Ducks stack hard: with the Pink Duck every engaged cycle is 2.7-3.6 min.
- With --wait=25, rule C runs from C5 take 29 and 44 min: the gate is not met by minute 25.
- Away calibration at four mid-run checkpoints the test does not check: 0.60-0.80 (frenzy
  limited by helper hits, so helpers cherry-pick; not modelled).
- Real-phone check of the box, and whether players understand "Ready at +M".
