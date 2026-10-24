# Onboarding audit (2026-10-24)

What a brand-new player sees in the first minutes, before and after the reveal rules, the next-goal line and the cues.
Headless Chrome, fresh profile, 390 x 844 (mobile, touch, muted). Made with `node tools/audit.js before|after 390 844`.

Moments: the page at 0 s; just after the first pop (a real touch on a Rose pearl); just after the first purchase (a real tap
on the cheapest affordable shop row); and at about 3 minutes. Between them a small in-page bot plays: about 2.5 hits a second on
the best live pearl (the sim's pick), buying the cheapest affordable shop row now and then. It never opens a panel or buys a tool.
The bot plays in real time, so the juice at each moment differs a little between runs.

"Controls" are visible interactive elements (buttons, inputs, tabs, toggles) not inside a hidden or closed panel.
"Below the fold" means rendered but scrolled out of the shop list.

## Control counts

| Moment | Before | After | Screenshots (docs/audit/) |
|---|---|---|---|
| 0s (before 1 s / 0 juice; after 1 s / 0 juice) | 6 | 2 | before-0s.png, after-0s.png |
| first-pop (before 2 s / 2 juice; after 2 s / 2 juice) | 6 | 3 | before-first-pop.png, after-first-pop.png |
| first-purchase (before 7 s / 29 juice; after 7 s / 32 juice) | 9 | 7 | before-first-purchase.png, after-first-purchase.png |
| 3min (before 181 s / 17876 juice; after 181 s / 14944 juice) | 18 | 18 | before-3min.png, after-3min.png |

## The controls at each moment

### 0s

- Before (6): Pearl pool, Settings, Backpack, Tools, Collection book, Fresh Batch
- After (2): Hide this goal, Settings
- Next goal shown: "Pop pearls to earn 20 juice for your first upgrade."

### first-pop

- Before (6): Pearl pool, Settings, Backpack, Tools, Collection book, Fresh Batch
- After (3): Hide this goal, Settings, Backpack
- Next goal shown: "Pop pearls to earn 20 juice for your first upgrade."

### first-purchase

- Before (9): Pearl pool, Settings, Backpack, Tools, Collection book, shop: Richer Pearls, shop: Faster Fill, shop: Combo Window, Fresh Batch
- After (7): Hide this goal, Settings, Backpack, shop: Blue Pearls, shop: Richer Pearls, shop: Faster Fill, shop: Combo Window (below the fold)
- Next goal shown: "Unlock Blue Pearls in the shop. Each pays x7.5."

### 3min

- Before (18): Pearl pool, Settings, Backpack, Tools, Collection book, Artifacts, Forge, shop: Blue Pearls, shop: Mint Pearls, shop: Golden Pearls, shop: Violet Pearls, shop: Richer Pearls, shop: Shiny Hunter, shop: Faster Fill, shop: Combo Window, shop: Frenzy Fuel, shop: Bigger Board, Fresh Batch
- After (18): Hide this goal, Pearl pool, Settings, Backpack, Tools, Collection book, Artifacts, Forge, shop: Blue Pearls, shop: Mint Pearls, shop: Golden Pearls, shop: Violet Pearls, shop: Richer Pearls, shop: Shiny Hunter, shop: Faster Fill, shop: Combo Window, shop: Frenzy Fuel, shop: Bigger Board (below the fold)
- Next goal shown: "Open Tools (the hammer) and buy the Awl: power 2."

## What changed and why

- At the start only Settings and the next goal are there. Settings stays from the start because it holds Sound and the save paste
  box (to bring a save to a new device). The disabled Fresh Batch button and the empty "Upgrades" heading are gone; the shop says
  "Upgrades show up here as you earn juice. Pop some pearls!" until its first row appears.
- The backpack comes with the first juice, Tools at 35 lifetime juice (40% of its cheapest item), the book with a second pearl
  type, the Pool with a third, the Fresh Batch box at 500K lifetime juice. Artifacts and the Forge keep their old gate (100 Rose
  Pearls popped), which is why the 3-minute count is the same as before: 18. Moving that gate later would hide them from saves
  already past 100 Roses.
- At 3 minutes the Tools and book buttons carry a dot (an affordable tool, a new discovery), since the bot never opened them.

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

The first run found one overlap at every width: the payout line's 44 px hit box (it has a negative bottom margin) reached 6 px
into the goal line. The goal now sits 14 px below it; the table above is the run after that fix.
