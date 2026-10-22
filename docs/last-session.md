Poppit session summary, 2026-10-21: artifact copies, rolls, alloys and the Hall of Relics

Owned artifacts are now copies. You can craft one again, each craft rolls a rarity and
sometimes perks, and only the copy on the pedestal counts. The forge has a second tier
(alloys made from dusts), and a Hall of Relics sells three relics for alloys. This was
engine, data, save and tests only; the existing panels keep working. Everything is pushed.

Verification
- npm run build: built index.html
- Econ unit tests: 31 of 31 pass
- Artifacts unit tests: 13 of 13 pass (rewritten: copies, rolls, perks, relics, hooks, save)
- Forge unit tests: 21 of 21 pass (8 new: alloys, missing-dust reason, fromScratch, speed bonus)
- Page tests: 8 of 8 pass
- Harness: 228 checks, ALL PASSED (26 new: 25 in tests/relic_tests.js, 1 Strike check)
- Away-bonus sim tests: 2 of 2 pass
- npm run sim, twice: the two outputs are identical, and identical to the output before
  this session. --duck is unchanged too (an owned duck is now one Common copy).
- Tests cover what you listed:
  - rarity shares over 200,000 seeded rolls, each within 5 standard errors;
  - perks distinct, within min x range, and capped;
  - only the active copy counts, and swapping changes the bonuses;
  - costGrowth;
  - a relic crafted from alloys, leaving the rest of the stock alone;
  - the old duck migrating to a Common active copy with the same payout;
  - save, save code, import, backup and Restore round trips;
  - Fresh Batch keeping copies; Reset save forgetting them;
  - the away bonus and helper pops using active perks.
  - Alloys: a start takes exactly its dusts and no pearls; the reason names the missing dust;
    a job finishes by timestamp and offline; alloys survive save, import and Fresh Batch;
    costText reads "1 of 2 Rosegold".

One full run through the harness (tests/relic_tests.js prints these "run:" lines)
- A Rose pop paid 2.04 with no duck. Rose Pearls kept: 20,500.
- Craft 1: Rose Pearls 20,500 -> 10,500. Rolled Common, no perks, went on the pedestal.
  A Rose pop paid 2.86 (x1.4).
- Craft 2: Rose Pearls 10,500 -> 500. Rolled Mythic: payout +6.4%, shiny +16%, frenzy +16%.
  It waited off the pedestal; a Rose pop still paid 2.86.
- Swap to the Mythic copy: a Rose pop paid 2.86 -> 3.04 (x1.064).
  Shiny chance 0.500% -> 0.580%. A frenzy lasted 7 s x 1.16.
- Swap back: a Rose pop paid 2.86 again.
- Forge stock before: Rose Dust 12, Blue Dust 3, Mint Dust 1.
- Two Rosegold jobs (2 min each): stock Mint Dust 1, Rosegold 2. No pearls were taken.
- Rose Lantern crafted: stock Mint Dust 1. Rolled Epic: spawn +6.9%, frenzy +6.3%.
  A tap now fills the frenzy meter by 1.25.
- Blue Compass crafted: a running Rose Dust job went from 30 s to 23.08 s left.
  Speed line: "Forge speed x1.3: level 0".
- Away for 1 h: 8,791 juice -> 11,428 with a Mint Clock (x1.2) and a +10% away perk (x1.3).

Expected Pink Duck payout by rarity (no numbers changed)
- Perk stats are equally likely, so a copy gets a payout perk 1 time in 6 (Rare),
  2 in 6 (Epic) or 3 in 6 (Mythic).
- Expected payout of one craft: Common x1.400, Rare x1.409, Epic x1.423, Mythic x1.445.
- All crafts together: x1.404, which is +0.3% over a plain duck.
  A Monte Carlo of 1,000,000 rolls gives the same x1.404.
- A copy that has a payout perk: Rare x1.456 (1.428 to 1.484), Epic x1.470 (1.435 to 1.505),
  Mythic x1.490 (1.445 to 1.534).

Getting one Mythic duck
- On average 100 crafts, so 1,000,000 Rose Pearls at the flat 10,000 each.
- Play time at the sim's Rose rates (Rose pops per minute):
  - casual: 170 h at the first helper (98/min), 98 h at the first Fresh Batch (170/min),
    76 h at cycle 6 (220/min);
  - engaged: 211 h at the first helper (79/min), 81 h at the first Fresh Batch (205/min),
    127 h at cycle 6 (131/min).
- A Mythic that also has a payout perk takes twice that: 200 crafts, 2,000,000 Rose Pearls.

Alloys from scratch (one slot, Forge Speed level 0, jobs one after another)
- Rosegold: 740 pearls (600 Rose, 140 Blue) and 7 min of forge time.
- Azure Steel: 370 pearls (280 Blue, 90 Mint) and 13 min.
- Mintsilver: 240 pearls (180 Mint, 60 Golden) and 26 min.
- So the relics: Rose Lantern 1,480 pearls and 14 min. Blue Compass 1,480 pearls and 33 min.
  Mint Clock 850 pearls and 65 min.
- Collecting the pearls takes far longer than the forge time.

Strike side check (headless Chrome, 390x844, fresh profile)
- One real mouse click on Strike: 1 s off, 1 engine call. Events: pointerdown, click (detail 1).
- One Enter press: 1 s off, 1 call. One Space press: 1 s off, 1 call.
  Events: keydown, click (detail 0).
- One touch tap: 1 s off, 1 call.
- No double strike, so nothing to fix. A harness check now pins one press = one Strike.
- The Artifacts panel showed both halls with alloy cost lines, and the forge listed Rosegold
  with "Need 1 more Blue Dust: make it in the forge". No overflow, no console errors.

Choices I made without asking
- Copy ids are whole numbers, unique across all artifacts (highest + 1).
- A craft rolls with Math.random in the game; tests pass their own rng.
- Rare values use the plain range, Epic x1.25 and Mythic x1.6. Values round to 3 decimals.
- Perk ranges and caps:
  - payout 2-6%, cap 10%;
  - shiny chance, frenzy length, away bonus and forge speed 5-15%, cap 25%;
  - spawn rate 3-8%, cap 12%.
- Base bonus values are multipliers (x1.25, x1.3, x1.2). Payout multiplies; the other
  stats add, so two +10% away sources make +20%.
- Shiny and spawn perks scale the existing rate (shiny chance x1.16, not +16 points).
- The forge's artifact bonus multiplies Forge Speed levels: level 1 with a Compass is
  1.25 x 1.3.
- The Rose Lantern's "fills 25% faster" multiplies every meter fill, taps and helpers alike.
- Every artifact has costGrowth 1, written out in the data so it is easy to find.
- Loading drops a copy with an unknown rarity or a bad or repeated id. A perk beyond the
  rarity's count, a repeated stat or an unknown stat is dropped. Values clamp to min..cap.
- The payout line now says "artifacts x1.4" instead of "ducks x1.4", since relic copies
  can carry payout perks.
- The Craft toast names the rarity: "Pink Duck crafted (Rare)!".
- An alloy row shows in the forge once the pearl types behind its dusts are found.
  It has no pearl picture and no Keep toggle.
- An owned card still says "Owned"; the craft-again button is next session.
- Found and fixed: craftCost charged 12,101 for 10,000 x 1.1^2 (floating point).
  It was not live, since every costGrowth is 1.

Commits (pushed to main)
- Forge: recipe input lists and alloys. Built and tested alone in a temporary worktree first.
- Artifacts as copies: pedestal, rolls, perks, Hall of Relics, save v6.
- Forge panel test: one press is one Strike.
- Ignore .DS_Store.
- CLAUDE.md, the design note pointer and this file.

Still open (next session: the panel)
- A craft-again button, the pedestal swap (setActiveCopy is ready), and the roll reveal.
- A duck stash warning on the forge's Rose Dust Start button. One start takes 100 kept Roses.
- The relics have no card icons yet.
- Untuned: rarity weights, perk ranges and caps, the alloy recipes, the relic costs and
  bonuses.
- Dusts other than Rose, Blue, Mint and Golden have no use yet. There is no second duck.
- A Mythic duck takes 76 to 211 hours of play on average.
- Still open from earlier sessions:
  - the per-Flavor bonus;
  - a Black Pearl option;
  - one pearl type dominating income in some cycles;
  - engaged cycles under 4 minutes;
  - the noisy Rose collection rows;
  - not checked on a real phone.
