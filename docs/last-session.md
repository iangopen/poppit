Poppit session summary, 2026-10-22: the retune, the Artifacts panel, the shelf and the roll reveal

Rolls are now strong enough to be worth watching, and the panel shows them. Crafting
again is cheaper for the duck, and every craft opens a full-screen reveal. Owned cards
show the copy on the pedestal and a shelf of the others, each with a Place button.
The forge warns before Rose Dust eats the duck's stash. Everything is pushed.

Verification
- npm run build: built index.html
- Econ unit tests: 31 of 31 pass
- Artifacts unit tests: 14 of 14 pass (1 new: the retune; 2 rewritten for repeat costs)
- Forge unit tests: 21 of 21 pass
- Page tests: 8 of 8 pass
- Harness: 258 checks, ALL PASSED (30 new, in tests/reveal_tests.js)
- Away-bonus sim tests: 2 of 2 pass
- npm run sim, twice: the two outputs are identical, and identical to the output saved
  before last session. --duck is unchanged too. The sim never crafts, so the retune
  cannot move it.
- New harness checks cover what you listed:
  - Craft another costs 2,500 (base x repeatFactor) and the card says so;
  - the disabled reason names what is missing (pearls, Keep, or an alloy);
  - the odds hint equals the rarity table, and changes when the table changes;
  - Place on the shelf swaps the active copy, and the pedestal line follows;
  - the reveal opens for Common, Rare, Epic and Mythic, with perks one by one;
  - a tap skips, a second tap closes, Escape closes, Place on pedestal works;
  - the first copy places itself, and its reveal has no Place button;
  - the stash warning appears and disappears at each threshold, and never blocks.
- Fixes on the way: no test failed. In Chrome, Mythic particles made the reveal card
  measure 371 px wide inside 352 px (clipped, not visible). I cut the particle travel to
  at most 145 px, and it measured clean.

Item 1: the retune (data plus one rule)
- Rarity: Common 55%, Rare 30%, Epic 12%, Mythic 3%.
- Perk values: Rare x1, Epic x1.5, Mythic x2.5.
- Caps: payout 20%; shiny, frenzy, away and forge 40%; spawn 20%.
- New rule: repeatFactor. Later crafts cost base x repeatFactor x costGrowth^(copies - 1).
  The Pink Duck is 0.25 (10,000, then 2,500 each). Every relic is 1.
- Saves: no clamp or test needed fixing for the caps. Old values are below the new caps,
  and a test loads a save at the old caps unchanged. No save version change.
- Expected duck payout per craft: Common x1.400, Rare x1.409, Epic x1.428,
  Mythic x1.470. All crafts x1.408. A Monte Carlo of 1,000,000 rolls gives x1.4082.
- With a payout perk: Rare x1.456, Epic x1.484, Mythic x1.540.
- Best-case duck: x1.610 (x1.4 with a top Mythic payout perk of +15%).
  No top roll reaches a cap; the caps only clamp loaded saves.

Getting a Mythic duck (same Rose rates as last time: 98, 170, 220 per min casual;
79, 205, 131 per min engaged, at the first helper, first Fresh Batch and cycle 6)
- One Mythic: 33.3 crafts on average, 90,833 Rose Pearls (10,000 + 32.3 x 2,500).
  - casual: 927 min (15.4 h), 534 min (8.9 h), 413 min (6.9 h);
  - engaged: 1,150 min (19.2 h), 443 min (7.4 h), 693 min (11.6 h).
- A Mythic with a payout perk: 66.7 crafts, 174,167 Rose Pearls.
  - casual: 1,777 min (29.6 h), 1,025 min (17.1 h), 792 min (13.2 h);
  - engaged: 2,205 min (36.7 h), 850 min (14.2 h), 1,330 min (22.2 h).
- Before: 100 crafts and 1,000,000 Roses for a Mythic (76 to 211 h).

One full run through the harness (tests/relic_tests.js "run:" lines)
- Craft 1: Rose Pearls 20,500 -> 10,500, Common, on the pedestal; a Rose pop 2.04 -> 2.86.
- Craft 2 (a repeat): 10,500 -> 8,000. Mythic: payout +10%, shiny +25%, frenzy +25%.
- Swap to it: a Rose pop 2.86 -> 3.14 (x1.100); shiny chance 0.500% -> 0.625%.
- The rest (alloys, relics, Compass re-timing, away bonus) behaves as before.

Headless Chrome, 390x844, fresh profile (the Chrome extension was not connected)
- Rolls were forced by the test script, which swapped Math.random in the page for one
  click. Game code never seeds anything.
- Common reveal (the first copy): grey frame, small glow, 8 particles, "No perks",
  "Placed on your pedestal: Every payout x1.4, for good." and one Nice! button.
- Rare: blue, 16 particles, "Payouts +4%", "Payouts x1.456 vs your current x1.4".
- Epic: violet, 28 particles, "Shiny chance +16.5%" then "Away bonus +18%", with
  a compare line for each.
- Mythic: orange, 44 particles, three perks (payouts +14%, frenzy length +32.5%,
  forge speed +36.3%); "Payouts x1.596 vs your current x1.4; ...".
- 150 ms in, no perk had shown yet on Rare, Epic or Mythic; all showed by 2.6 s.
- Tab, Tab, Shift+Tab: focus went Keep, Place, Keep (trapped). Escape closed the reveal
  and left the panel open. A backdrop tap skipped a running reveal, and a second closed it.
- Owned card with a shelf: orange Mythic frame, the duck on a pedestal, an
  "On pedestal" badge, its perks, "Next copy costs 2,500", Craft another, and a shelf of
  4. Each shelf row says what placing it changes.
- Shelf Place on the Epic copy: the pedestal line went from "Payouts x1.596, Frenzy length
  +32.5%, Forge speed +36.3%" to "Payouts x1.4, Shiny chance +16.5%, Away bonus +18%".
- Hall of Relics tab: lantern, compass and clock icons at 96 px, alloy cost lines
  ("2 of 2 Azure Steel", "1 of 1 Rosegold"), reasons such as
  "Need 1 more Rosegold: make it in the forge".
- Forge: the Rose Dust row read "Uses 100 of your 4,200 kept Rose Pearls (the Pink Duck
  needs 10,000)", and Start stayed enabled.
- With prefers-reduced-motion: every perk showed at once, with no particles.
- Overflow: scrollWidth equalled clientWidth (390) for the page. No element in the reveal,
  the Artifacts panel or the Forge panel was wider than its box, in any state.
- Console: only the favicon 404.
- Screenshots are in the session scratchpad under shots/: reveal-common-390.png,
  reveal-rare-390.png, reveal-epic-390.png, reveal-mythic-390.png, card-shelf-390.png,
  card-shelf2-390.png, relics-tab-390.png, forge-stash-390.png, and -calm versions.

Choices I made without asking
- Halls are tabs (Hall of Ducks, Hall of Relics), not stacked sections. At 390 px there
  is little room, so the tabs stay fixed, and the pedestal line, notes and cards scroll
  together.
- Rarity colours: Common grey, Rare blue, Epic violet, Mythic orange. Text uses a darker
  shade of each, for contrast on white.
- The odds hint shows on every card, owned or not, since the first craft rolls too.
- A shelf lists copies best rarity first, and scrolls inside the card past 260 px.
- The reveal's compare line compares with the copy that was on the pedestal before the
  craft, for each stat that differs. Payout reads as a total (x1.596), others as +%.
- A tap on a finished reveal closes it and keeps the copy on the shelf, like Escape.
- Focus starts on Place on pedestal (Nice! for a first copy) and returns afterwards.
- Perks appear at 0.7 s, then every 0.55 s, driven by the game loop. Particles use fixed
  angles, so the reveal never draws on Math.random.
- The chime is a rising arpeggio of 3, 5, 7 or 9 notes using the existing synth, so the
  Sound setting mutes it. Each perk ticks as it appears. The shatter sound and the craft
  toast are gone from crafting; the reveal replaces them.
- The stash warning shows when a Start would leave fewer Roses than the duck's next
  craft needs, and only when you have enough to start. That covers "the duck is still
  unaffordable" and also "this Start would make it unaffordable". It names the next
  craft's cost, so 2,500 once a duck is owned.
- "Kept" appears in the warning only when Rose Pearls are kept.

Commits (pushed to main)
- Retune artifact rolls. It was built and tested alone (the panel work was stashed).
- Artifacts panel: tabs, relic icons, owned cards, shelf, Craft another, reveal, warning.
- Harness: panel, shelf, reveal and stash warning checks.
- CLAUDE.md and this file.

Still open
- No second duck; the Hall of Ducks has one card.
- Dusts other than Rose, Blue, Mint and Golden have no use yet.
- Relic icons are first drawings and could be polished.
- The shelf has no sell, scrap or sort option, and grows by one row per craft.
- Untuned beyond this retune: the alloy recipes, the relic costs and bonuses. No sim
  models crafting.
- Not checked on a real phone: the reveal, its focus trap, the chime and the panels.
- Still open from earlier sessions:
  - the per-Flavor bonus;
  - a Black Pearl option;
  - one pearl type dominating income in some cycles;
  - engaged cycles under 4 minutes;
  - the noisy Rose collection rows.
