Session: Artifacts and Forge gate moved, a Stats screen, and a Reduce effects setting.
No economy numbers changed.

What changed
- Gate: Artifacts and the Forge now appear with the Fresh Batch box, at 500K lifetime
  juice (they were at 100 Rose Pearls popped, about a minute in). Read from the state,
  no stored flag. A save keeps both buttons, whatever its juice, if it has an owned
  copy, forge jobs, stock or upgrades, a pearl type marked Keep, a Fresh Batch, or
  Flavors. The Pink Duck and Forge goals follow the buttons, since they use the same
  gate.
- Stats screen (Settings > Stats > Open stats):
  - From existing counters: juice earned, pearls popped, shiny pops, Fresh Batches,
    Flavors, and pops per found pearl type with shinies.
  - From the new saved stats object: taps, time played, fastest Fresh Batch run,
    biggest Fresh Batch, best single pop, highest combo.
  - Numbers use fmt / fmtV, times use durTxt rounded down.
- Save v9: the migration starts every counter at 0. A run already in progress is not
  timed (runSecs -1), so it can never count as the fastest. Loads clamp every value. Stats
  travel through export, import, backup and Restore; Fresh Batch keeps them; Reset save
  starts them over.
- Reduce effects (Settings): saved with the settings. With no saved choice it follows
  the browser's prefers-reduced-motion. When on: no particle bursts, shake, floating
  numbers or words, marble screen flash, or reveal particles and animations. Sounds,
  the juice counter and every number stay. The existing reduced-motion behaviour is
  unchanged.
- tools/audit.js: a "settings" mode (Settings and Stats screenshots and widths). Every
  browser check still launches Chrome with --mute-audio.

Audit (docs/onboarding-audit.md), visible controls at 390x844: before / after / now
- 0 s: 6 / 2 / 2
- after the first pop: 6 / 3 / 3
- after the first purchase: 9 / 7 / 6
- about 3 min: 18 / 18 / 16 (11 on screen; Artifacts and Forge no longer there)

Verification
- npm run build: built index.html. npm test: exit 0; node test files 0 failures
  (32, 19, 9, 21, 8, 2); the harness prints ALL PASSED.
- New tests/stats_tests.js covers:
  - the gate: a save under 500K with no artifact or forge state loses both buttons;
    each kind of state keeps them (owned copy, forge job, stock, upgrade, Keep); a
    Fresh Batch or Flavors keeps them; 500K shows both;
  - counters from real board taps, pops and frames; the Stats screen;
  - the v8 -> v9 migration and clamping;
  - Fresh Batch: best gain, fastest run, untimed runs;
  - save, save code, import, backup, Restore, and Reset zeroing;
  - Reduce effects: a golden pop with no particles, floating text, shake or flash
    while its sounds play and its juice lands; the same pop with the setting off does
    burst; the reveal shows no particles.
- The last session's two fixture saves still show exactly their old controls.
- Settings and Stats at 390x844 (mid-game save): page 390/390, panels 316/316,
  nothing past the panel edge.
- npm run sim twice: identical, and unchanged.

Choices I made
- "Fastest Fresh Batch run" had no existing counter, so it lives in the new stats
  object. Only fully timed runs count, so a save that migrates mid-run shows
  "None yet" until its next full run.
- "Kept pearls for a duck" means any pearl type marked Keep.
- The Stats row in Settings shows once there is any progress, like Reset.
- Taps count every press on the board, including on empty spots, but not during a Fresh
  Batch. Best single pop counts helper pops too.
- Time played counts only while the page runs. Away time is not counted.
- Reduce effects also turns off the white screen flash on marble and heavy pops (it is
  flashing). Hit stop and the reveal's one-by-one perks still follow reduced motion only.
- Reset save keeps the Reduce effects choice, like Sound and Music.
- The v7 -> v8 unit test now asks for SAVE_VERSION >= 8 instead of exactly 8.

Still open
- The real-phone check.
- The Flavors decision (balance: 10% per Flavor, gain curve, floor).
