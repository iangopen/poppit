Poppit session summary, 2026-10-21: the Forge panel

The Forge now has its interface: a dock button with a finished-job dot, a panel with slots,
Strike, recipes, Keep, materials and upgrades, and a phone layout that fits five dock buttons.
No numbers, recipes or material uses changed. All tests pass and everything is pushed to main.

Verification
- npm run build: built index.html
- Econ unit tests: 31 of 31 pass
- Artifacts unit tests: 6 of 6 pass
- Forge unit tests: 13 of 13 pass
- Page tests: 8 of 8 pass (1 new: the Forge button, dot and panel markup)
- Harness: 202 checks, ALL PASSED (25 new, in tests/forge_ui_tests.js)
- Away-bonus sim tests: 2 of 2 pass
- npm run sim: output unchanged from last session.
- The behaviour checks you listed need the running game, so they live in the harness
  (tests/forge_ui_tests.js), not in tests/page.test.js, which only checks page structure.
  They cover:
  - the dock gate and the finished-job dot;
  - every Start reason, including the Keep and auto-sell case;
  - the panel Keep toggle changing the backpack Keep state;
  - Start taking exactly 100 Roses;
  - Strike refusing the 6th press in a second;
  - a finished job reaching the stock with no click;
  - a Forge Speed purchase updating the panel;
  - a fixture artifact's material line ("1 of 5 Rose Dust");
  - the away toast with and without finished jobs;
  - Fresh Batch and save imports refreshing the open panel.

Real flow in headless Chrome at 390x844 (fresh profile, default settings)
- The Chrome extension was not connected, so this ran in headless Google Chrome.
- Clicks were real mouse input at each element's centre.
- The 250 Rose pops used the game's own pop code.
- Before popping: auto-sell on, nothing kept, Forge button hidden.
- Popped 100 Roses: the Forge and Artifacts buttons appeared.
- Rose Dust row: "100 Rose Pearls · 30s · you have 0".
  Start was disabled with "Turn on Keep for Rose Pearls, or turn off auto-sell".
- Keep in the panel: the toggle read Kept, and the backpack's Rose row showed Kept too.
  The reason changed to "Need 100 more Rose Pearls in your backpack".
- Popped 150 more: they went to the backpack (150), and juice stayed at 369.
- Start: Rose Pearls 150 -> 50.
  - The job was 15 s, because those pops had filled the frenzy meter (x2).
- Strike: 7 presses inside one second shaved exactly 5 s (the cap).
  - The button measured 79x52 px, and five "-1s" floats showed.
- The job finished by itself after a 12.6 s wait (frenzy ended part way).
  - Stock: Rose Dust 1. Slot 1: "Empty: start a recipe below".
- Forge Speed: juice 25,000 -> 5,000, level 1, "Forge speed x1.25: level 1", next price 56.0K.
  - The 25,000 juice was granted by script.
- Reload: Keep on, Rose Dust 1, Forge Speed 1 and the 50 kept Roses were all still there.
- Fresh Batch: the same stock, level, Keep and 50 kept Roses survived.
- Artifacts panel: "Your materials: Rose Dust 1".
  The duck card read "50 of 10,000 Rose Pearls kept".
- Horizontal overflow: page scrollWidth 390, clientWidth 390.
  No element in the Forge or Artifacts panel overflows its box.
- Console: no errors.

Screenshots (390 px wide)
- Folder: /private/tmp/claude-501/-Users-iangopen-Desktop-project-folders-poppit/
  46252cde-3f89-41d8-a7c3-44bf94d65bcc/scratchpad/shots/
- dock-390.png: the board with the bar above the dock, and five dock buttons.
  - Left to right: backpack, hammer, book, duck, anvil.
- forge-running-390.png: Forge panel with a Rose Dust job running in slot 1
  (bar, time left, Strike), and the recipe saying "The forge slot is busy".
- forge-strike-390.png: the same right after the Strikes, with the "-1s" float,
  and the speed line "Forge speed x2: level 0, frenzy x2".
- artifacts-390.png: the Artifacts panel with "Your materials: Rose Dust 1",
  and the Pink Duck card at "50 of 10,000 Rose Pearls kept".
- dockbar-360.png, dockbar-390.png, dockbar-430.png: crops of the bar and the dock,
  with the longest tool name and a combo showing.

Bottom bar on phones (the 13 px overflow is fixed)
- Under 820 px wide, the bar (combo, tool label, frenzy meter) now always sits above the dock.
- The start hint moved up to stay clear of it.
- The tool label and meter are a little smaller, and the combo shows only its count and multiplier.
- At 360, 390 and 430 px, tested with "Diamond Hammer · 38 hit power" and a combo of 60:
  - all five dock buttons sit inside the board;
  - nothing overlaps;
  - the page doesn't scroll sideways.
- At 360 the combo multiplier is clipped and the meter shrinks to about 35 px. Still readable.

Choices I made without asking
- The Forge button sits after Artifacts in the dock (Artifacts at 202 px, Forge at 258 px).
- It shows at 100 Roses popped, like Artifacts, or whenever a save already has forge work.
- One DOCK_GATES table drives both gated buttons, keyed by PANEL_BTN.
- The dot is not saved. It also lights for jobs that finished offline.
- The speed line shows the total rate. Your example "x1.75: level 3, frenzy x2" would read
  "x3.5: level 3, frenzy x2", since level 3 is x1.75 and frenzy doubles it.
- Recipes are listed only for discovered pearl types. Start uses the first free slot.
- Start reasons, first one that applies:
  - the slot is busy;
  - the Keep / auto-sell message;
  - the type is kept but not spawning;
  - "Need N more".
- Strike fires on pointerdown, so a press counts at once.
  - A keyboard Enter or Space press arrives as a click and also strikes.
  - A refused press shakes the button.
- Upgrades reuse the shop's card style and its price-progress strip.
- Material lines read "2 of 5 Rose Dust" via a new FORGE.costText.
  - Pearl lines keep "50 of 10,000 Rose Pearls kept".
- The away toast already reported finished jobs ("1 forge job finished") from last session.
  The new tests pin both wordings.

Commits (pushed to main)
- Forge panel, dock button, Strike, recipes with Keep, upgrades, tests.
  Built and tested alone in a temporary worktree first.
- Phones: the bottom bar always sits above the dock.
- CLAUDE.md and this file.
- I left an untracked .DS_Store (macOS folder metadata) alone, uncommitted.

Still open
- Materials have no real use yet: no artifact costs one.
- No second duck and no second hall.
- Forge recipe numbers and the Forge Speed and Extra Slot prices are untuned.
  No sim models the forge.
- The forge and the Pink Duck both use kept Rose Pearls.
  Nothing protects the duck's stash: a Rose Dust start takes 100 of them.
- Some Rose collection rows from last session look odd.
  - With the duck, casual cycle 6 shows 85 min and engaged's first Fresh Batch 96 min,
    against 45 and 49 without it.
  - Each row is one 60-second window from one seed, so it's noisy.
- Not checked on a real phone. All phone-size checks ran in desktop Chrome.
- Still open from earlier sessions:
  - choose the per-Flavor bonus;
  - choose a Black Pearl option;
  - one pearl type still dominates income in some cycles;
  - engaged cycles still run under 4 minutes.
