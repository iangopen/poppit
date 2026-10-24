# Onboarding audit

What a brand-new player sees in the first minutes. Three runs, each a fresh profile in headless Chrome at 390 x 844 (mobile, touch,
muted), made with `node tools/audit.js <label> 390 844`:

- **before**: the game before the first-minutes session (2026-10-24, commit 50de9ac).
- **after**: after the first-minutes session (reveal rules, next goal, dots; Artifacts and Forge still at 100 Rose Pearls).
- **gate**: this session (2026-10-24): Artifacts and the Forge come with the Fresh Batch box, at 500K lifetime juice.

Moments: the page at 0 s; just after the first pop (a real touch on a Rose pearl); just after the first purchase (a real tap on the
cheapest affordable shop row); and at about 3 minutes. Between them a small in-page bot plays: about 2.5 hits a second on the best
live pearl (the sim's pick), buying the cheapest affordable shop row now and then. It never opens a panel or buys a tool. The bot
plays in real time, so the juice at each moment differs a little between runs.

"Controls" are visible interactive elements (buttons, inputs, tabs, toggles) not inside a hidden or closed panel. "On screen" leaves
out shop rows scrolled below the fold.

## Control counts

| Moment | Before | After | Gate (now) | Screenshots (docs/audit/) |
|---|---|---|---|---|
| 0s | 6 (6 on screen) | 2 (2 on screen) | 2 (2 on screen) | before-0s.png, after-0s.png, gate-0s.png |
| first-pop | 6 (6 on screen) | 3 (3 on screen) | 3 (3 on screen) | before-first-pop.png, after-first-pop.png, gate-first-pop.png |
| first-purchase | 9 (9 on screen) | 7 (6 on screen) | 6 (6 on screen) | before-first-purchase.png, after-first-purchase.png, gate-first-purchase.png |
| 3min | 18 (18 on screen) | 18 (17 on screen) | 16 (11 on screen) | before-3min.png, after-3min.png, gate-3min.png |

Run juice at each moment (before / after / gate): 0s 0 / 0 / 0; first-pop 2 / 2 / 2; first-purchase 29 / 32 / 27; 3min 17876 / 14944 / 27339.

## The controls at each moment

### 0s

- Before (6): Pearl pool, Settings, Backpack, Tools, Collection book, Fresh Batch
- After (2): Hide this goal, Settings. Next goal: "Pop pearls to earn 20 juice for your first upgrade."
- Gate (2): Hide this goal, Settings. Next goal: "Pop pearls to earn 20 juice for your first upgrade."

### first-pop

- Before (6): Pearl pool, Settings, Backpack, Tools, Collection book, Fresh Batch
- After (3): Hide this goal, Settings, Backpack. Next goal: "Pop pearls to earn 20 juice for your first upgrade."
- Gate (3): Hide this goal, Settings, Backpack. Next goal: "Pop pearls to earn 20 juice for your first upgrade."

### first-purchase

- Before (9): Pearl pool, Settings, Backpack, Tools, Collection book, shop: Richer Pearls, shop: Faster Fill, shop: Combo Window, Fresh Batch
- After (7): Hide this goal, Settings, Backpack, shop: Blue Pearls, shop: Richer Pearls, shop: Faster Fill, shop: Combo Window (below the fold). Next goal: "Unlock Blue Pearls in the shop. Each pays x7.5."
- Gate (6): Hide this goal, Settings, Backpack, shop: Richer Pearls, shop: Faster Fill, shop: Combo Window. Next goal: "Unlock Blue Pearls in the shop. Each pays x7.5."

### 3min

- Before (18): Pearl pool, Settings, Backpack, Tools, Collection book, Artifacts, Forge, shop: Blue Pearls, shop: Mint Pearls, shop: Golden Pearls, shop: Violet Pearls, shop: Richer Pearls, shop: Shiny Hunter, shop: Faster Fill, shop: Combo Window, shop: Frenzy Fuel, shop: Bigger Board, Fresh Batch
- After (18): Hide this goal, Pearl pool, Settings, Backpack, Tools, Collection book, Artifacts, Forge, shop: Blue Pearls, shop: Mint Pearls, shop: Golden Pearls, shop: Violet Pearls, shop: Richer Pearls, shop: Shiny Hunter, shop: Faster Fill, shop: Combo Window, shop: Frenzy Fuel, shop: Bigger Board (below the fold). Next goal: "Open Tools (the hammer) and buy the Awl: power 2."
- Gate (16): Hide this goal, Pearl pool, Settings, Backpack, Tools, Collection book, shop: Blue Pearls, shop: Mint Pearls, shop: Golden Pearls, shop: Violet Pearls, shop: Richer Pearls, shop: Shiny Hunter (below the fold), shop: Faster Fill (below the fold), shop: Combo Window (below the fold), shop: Frenzy Fuel (below the fold), shop: Bigger Board (below the fold). Next goal: "Open Tools (the hammer) and buy the Awl: power 2."

## What changed and why

- First-minutes session: at the start only Settings and the next goal are there. Settings stays from the start because it holds
  Sound and the save paste box (to bring a save to a new device). The disabled Fresh Batch button and the empty "Upgrades" heading
  went; the shop says "Upgrades show up here as you earn juice. Pop some pearls!" until its first row appears. The backpack comes
  with the first juice, Tools at 35 lifetime juice, the book with a second pearl type, the Pool with a third, the Fresh Batch box at
  500K lifetime juice.
- This session: Artifacts and the Forge moved from 100 Rose Pearls popped (about a minute in) to the Fresh Batch box's point (500K
  lifetime juice), or any artifact or forge state in the save, or a Fresh Batch. At 3 minutes that removes both buttons: 16 controls
  instead of 18. The Tools and book buttons carry a dot then (an affordable tool, a new discovery), since the bot never opened them.

## Layout: hint, goal line, toast and bottom bar

`node tools/audit.js layout`: at each width, a fresh start (hint, goal, toast) and a mid-game save (payout line, goal, toast).
The toast holds three batched messages, the most it ever shows. Boxes in CSS px (left..right x top..bottom).

| Width | State | Page scrollWidth/clientWidth | Overlaps | Boxes | Screenshot |
|---|---|---|---|---|---|
| 360 | start | 360/360 | none | goal 24..336 x 115..156; toast 24..336 x 162..271; hint 16..344 x 314..352; bottom 24..336 x 360..398 | layout-360-start.png |
| 360 | midgame | 360/360 | none | echoes 20..332 x 101..145; goal 24..336 x 147..188; toast 24..336 x 194..303; hint 16..344 x 314..352; bottom 24..336 x 360..398 | layout-360-midgame.png |
| 390 | start | 390/390 | none | goal 24..366 x 115..156; toast 24..366 x 162..271; hint 16..374 x 314..352; bottom 24..366 x 360..398 | layout-390-start.png |
| 390 | midgame | 390/390 | none | echoes 20..352 x 101..145; goal 24..366 x 147..188; toast 24..366 x 194..303; hint 16..374 x 314..352; bottom 24..366 x 360..398 | layout-390-midgame.png |
| 430 | start | 430/430 | none | goal 24..406 x 115..156; toast 24..371 x 162..248; hint 16..414 x 314..352; bottom 24..406 x 360..398 | layout-430-start.png |
| 430 | midgame | 430/430 | none | echoes 20..352 x 101..145; goal 24..406 x 147..188; toast 24..371 x 194..280; hint 16..414 x 314..352; bottom 24..406 x 360..398 | layout-430-midgame.png |

The first layout run found one overlap at every width: the payout line's 44 px hit box (it has a negative bottom margin) reached
6 px into the goal line. The goal now sits 14 px below it; the table above is the run after that fix.

## Settings and Stats at 390 x 844

`node tools/audit.js settings`, a mid-game save (2 Fresh Batches, 2.4M juice, a stats object).

| Screen | Page scrollWidth/clientWidth | Panel scrollWidth/clientWidth | Past the panel edge | Screenshot |
|---|---|---|---|---|
| settings | 390/390 | 316/316 | none | settings-390.png |
| stats | 390/390 | 316/316 | none | stats-390.png, stats-390-end.png |

The Stats screen read: Totals | Juice earned | 2.40M | Pearls popped | 71.7K | Shiny pops | 90 | Taps | 18.3K | Time played | 2h 3m | Fresh Batches | Fresh Batches taken | 2 | Flavors | 4 | Fastest run | 12m 22s | Biggest Fresh Batch | +3 Flavors | Best moments | Best single pop | 98.8K juice | Highest combo | 61 | Pops by pearl | Rose Pearl | 48.0K + 40 shiny | Blue Pearl | 12.0K + 30 shiny | Mint Pearl | 5,333 + 20 shiny | Golden Pearl | 3,000 | Violet Pearl | 1,920 | Coral Pearl | 1,333
