# Pearl Collection: 10 types, Pool, Shinies, Collection Book

Status: draft for review. Artifacts are explicitly OUT of scope (planned later).

## Intent
Ian wants Poppit to have a collecting layer: ten pearl types on the existing upgrade progression, a Pool menu to choose which discovered types spawn (with live spawn chances), shiny variants, and a book-style Collection of discoveries. Success: unlocking a type feels like a milestone, the pool makes spawn odds legible and controllable, and the book gives a reason to hunt rare/shiny entries.

## Decided
- All 10 types unlock via shop upgrades for now (milestone unlocks later). Blue is also an upgrade, a very cheap one among the first purchases, so the player learns the concept.
- First discovery of a type auto-adds it to the pool (toast). Player can remove it anytime.
- Shinies are separate collection entries (20 total entries). Shiny spawning is toggleable and upgradable.
- Collection is a book that opens, with pages; undiscovered entries are blacked-out silhouettes.
- Pool and Collection buttons sit top right beside the settings cog.
- Not included: artifacts (future: permanent bonuses surviving Fresh Batch; crafting consumes all required pearls).

## Roster (single table in ECON.PEARLS)
| id | name | hp | x value | unlock |
|---|---|---|---|---|
| rose | Rose | 1 | 1 | start |
| blue | Blue | 3 | 4 | cheap early upgrade |
| mint | Mint | 4 | 7 | upgrade |
| golden | Golden | 6 | 12 | existing golden upgrade |
| violet | Violet | 8 | 20 | upgrade |
| coral | Coral | 11 | 35 | upgrade |
| marble | Glass Marble | 14 | 60 | existing marble upgrade |
| opal | Opal | 20 | 110 | upgrade |
| ruby | Ruby | 30 | 200 | upgrade |
| black | Black Pearl | 45 | 400 | upgrade |

Each row: hp, mult, base spawn weight, color palette, unlock upgrade id, sound tier. Unlock costs ~3x the previous (Blue is the exception, near-free); exact numbers set with the pacing sim so first Fresh Batch time stays ~7-10 min. Later upgrade levels raise that type's weight.

## Spawn and pool math
- State: `pool` = set of type ids. Rose is the baseline; empty pool falls back to Rose.
- Chance(t) = weight(t) / sum(weight over pool). Pool menu recomputes live as types are toggled.
- Existing caps (marble<3, golden<2, blue<8) generalize to a per-type on-screen cap in the table.
- Existing goldenChance/marbleChance/blueChance in ECON.stats() are replaced by weights derived from upgrade levels.

## Shinies
- Roll per spawn: shinyChance (base ~0.5%), only when shinies toggle is on. New "Shiny Hunter" upgrade raises it.
- Shiny pays 5x, same hp. Own sparkle sprite variant per type, own backpack and collection counts.
- Toggle lives in the Pool menu.

## Data and save
- `state.pearls[id] = { discovered, popped, shinyDiscovered, shinyPopped }`, `state.pool`, `state.shinyOn`.
- Backpack inventory keyed by `id` and `id+':s'` for shiny.
- Save gains `version: 2`. Migration from v1 ('poppit.v1', no version): any type already unlocked (blue always, golden/marble if levels > 0) becomes discovered and in-pool; upgrade levels, tools, juice, and prestige carry over; inventory kinds map over. New unlock upgrades start at level 0.
- Blue note: existing saves treat Blue as owned (its new unlock upgrade is granted at level 1 on migrate).

## Rendering
- buildSprites generates normal + shiny sprite per type from palette table (replaces hand-written four defs). Shiny adds a highlight sheen and occasional sparkle particles.
- spawnAt palette lookup moves to the table.

## UI
- Pool menu: grid of discovered types, each with add/remove switch, live chance %, and a Shiny toggle with current shiny chance.
- Collection book: opens with an animation, left/right page turns, one type per spread showing normal and shiny entries (art, stats, popped counts). Undiscovered = black silhouette with "???".
- Backpack and sell UI iterate over the roster instead of the fixed KINDS list.

## Sound
- Hit sounds mapped by hp tier onto existing samples (thud/hit92/hit18); shiny adds a shimmer from the library on pop. Swappable later.

## Tests
- Econ: chances sum to 1, empty-pool fallback, weight changes with levels, shiny chance bounds.
- Migration: v1 save loads into v2 with the same juice/levels and correct discovered/pool sets.
- Harness: spawn each type, pop, collection counters increment, shiny counted separately.
- Pacing sim extended with the new unlock costs.

## Build stages
1. Roster table + pool + migration + 10 types (+ Blue upgrade).
2. Shinies and Shiny Hunter.
3. Collection book.

## Update (later the same day): steeper scaling and unlock order

- Roster is now hits/payout: Rose 1/1, Blue 3/5, Mint 7/12, Golden 15/30, Violet 30/70, Coral 50/150, Marble 80/350, Opal 130/800, Ruby 200/2000, Black 320/5000.
- Unlock chain follows the roster: Blue (Lucky) → Mint → Golden → Violet → Coral → Marble → Opal → Ruby → Black. Costs rise along the chain; Marble also needs the Brass Mallet.
- "Pearls & Marbles" now holds only per-type upgrades; Richer Pearls and Shiny Hunter moved to the general upgrades group.
- Burst effects are chosen by pearl kind (FXW tiers in world.js), not by hit count.
- First Fresh Batch in the pacing sim: about 9.7 min casual, 5.7 min engaged.
