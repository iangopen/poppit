Session: the first minutes (what a new player sees). UI only: no economy, save or rule changes.

What changed
- Reveal rules (src/ui.js), all read from the state, never a stored flag:
  - Start: the board, Settings, the next-goal line, and an empty-shop line.
  - Backpack at the first juice; Tools at 35 lifetime juice (40% of its cheapest item);
    the book at a second pearl type; Pool (top right) at a third type or any shiny.
  - Fresh Batch box at 500K lifetime juice (10% of a Fresh Batch); Settings' Reset,
    Copy and Download rows once there is progress.
  - Shop headings only with a row in them. Artifacts and Forge keep their old gate.
  - Any save with a Fresh Batch or Flavors passes every rule. Dock buttons pack left to
    right with no gaps.
- Next goal: one line under the juice counter from a goals table, checked in order:
  earn the first upgrade's price, buy it, unlock Blue, buy the Awl, hire Helpers, take a
  Fresh Batch, then the Pink Duck and the Forge once they unlock. A 44 px close button
  hides that goal on this device; Reset save brings the goals back.
- Dots: Tools (newly affordable), Collection book (new discovery), Artifacts (craft in
  reach), cleared on opening. Shop headings get a dot for new or newly affordable rows
  not yet seen on screen; the price-progress strip stays the only progress display.
- Messages: the goal and toast now stack in the top-left HUD column, so they cannot
  overlap each other, the hint or the bottom bar. Toasts within 1 s share one toast,
  one line each, at most 3, repeats dropped.
- New tools: tools/audit.js (screenshots and control lists; "layout" mode measures the
  HUD column at 360, 390 and 430 px), and sim --early.

Audit (docs/onboarding-audit.md, screenshots in docs/audit/), visible controls
- 0 s: before 6, after 2 (Settings, Hide this goal)
- after the first pop: before 6, after 3 (+ Backpack)
- after the first purchase: before 9, after 7
- about 3 min: before 18, after 18 (Artifacts and Forge unlock at 100 Roses either way)

Early beats from the sim (--early; run 1; reference seed, then mean of seeds 1-8)
- casual: first purchase 7 s / 7 s, first tool 53 s / 57 s, first tool upgrade 47 s /
  47 s, first helper 11.4 / 11.0 min, first Fresh Batch ready 12.8 / 12.8 min
- engaged: first purchase 4 s / 4 s, first tool 42 s / 41 s, first tool upgrade 29 s /
  28 s, first helper 4.8 / 4.7 min, first Fresh Batch ready 6.0 / 5.4 min
- Rule of thumb: first upgrade within about 60 s (met), first automation about 3 min
  (helpers come later: 11 min casual, 5 min engaged), first prestige 10 to 15 min
  (casual 12.8 inside it; engaged 5.4 to 6.0 is early). Report only; nothing changed.

Verification
- npm run build: built index.html. npm test: exit 0; node test files 0 failures
  (32, 19, 9, 21, 8, 2); the harness prints ALL PASSED.
- New tests/onboarding_tests.js covers:
  - each reveal threshold from a fresh state, with no gaps in the dock;
  - two fixture saves past every threshold showing exactly the controls they showed
    under commit 50de9ac (lists from running that commit's sources);
  - Reset save back to the start view;
  - the goal order and each completion test, and dismissing a goal;
  - dots appearing and clearing;
  - toasts within a second batching.
- npm run sim twice: identical, and identical to the output saved before the duck work.
- Layout, 360 / 390 / 430 px, fresh start and a mid-game save with a three-line toast:
  page scrollWidth equals clientWidth at every width, no overlaps between payout line,
  goal, toast, hint and bottom bar, no button outside the page. The first run found the
  payout line's 44 px hit box overlapping the goal by 6 px; fixed, then re-measured.
- No console errors in any headless run. All browser checks now use --mute-audio.

Choices I made
- Settings shows from the start (sound, and the paste box to bring a save to a new device).
- Artifacts and Forge keep the 100-Rose gate: a later gate would hide them from saves past
  it, and a stored flag was ruled out.
- Pool comes at the third type: with two types there is nothing to switch off yet.
- Dismissed goals are kept in localStorage (poppit.goalsOff), not in the save, so the save
  format did not change. Reset save clears them.
- A dismissed goal hides the line until that goal is done; it does not skip to the next.
- Toasts in the HUD column are left-aligned now (they were centered).
- An early save (Rose only, 3,000 juice) gets the new-player view; its Pool and book
  return as soon as it finds more types.
- tools/audit.js and its screenshots are committed so the audit can be repeated.

Still open
- Next small session: a stats screen and a reduce-effects toggle.
- Artifacts and the Forge still appear about a minute in (100 Roses).
- Helpers arrive later than the 3-minute rule of thumb; engaged prestige is early.
- The real-phone check.
- The Flavors decision (balance: 10% per Flavor, gain curve, floor).
