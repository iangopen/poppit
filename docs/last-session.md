Poppit session summary, 2026-10-22: shelf scrap, locks, sort and Common stacks

Shelf copies can now be scrapped for 40% of what they cost, locked against scrapping,
sorted, and the Commons stack into one row. Each copy records what it actually cost, so
refunds never follow a later price change. Save version 7 migrates older copies.
Economy and roll numbers did not change apart from the new refund share. Everything is
pushed.

Verification
- npm run build: built index.html
- Econ unit tests: 32 of 32 pass
- Artifacts unit tests: 19 of 19 pass (5 new: paid cost, locks, scrap and refunds,
  the v6 to v7 migration, paid and lock clamping)
- Forge unit tests: 21 of 21 pass
- Page tests: 8 of 8 pass
- Harness: 279 checks, ALL PASSED (21 new, in tests/shelf_tests.js)
- Away-bonus sim tests: 2 of 2 pass
- npm run sim, twice: the two outputs are identical, and identical to the output before
  this session. --duck=best is unchanged too.
- New tests cover what you listed:
  - paid cost recorded at craft: 10,000 for the first duck, 2,500 for a repeat, alloys for
    a relic, and unchanged by a later repeatFactor change;
  - migration of old copies;
  - refund = floor(40% of paid) for pearls (1,000 and 4,000) and for alloys
    (5 and 3 back as 2 and 1, in a test fixture);
  - the pedestal copy and locked copies are refused, and nothing changes;
  - new Epic and Mythic copies start locked, Common and Rare do not;
  - Commons stack ("Common x3") and scrap one at a time;
  - the bulk action's count and refund (6 copies, +9,000 Rose Pearls), then exactly those go;
  - locks and paid costs survive save, save code, import with backup, and Restore;
  - refunded Roses stay in the backpack with auto-sell on, and Sell all leaves them.
- Fixes on the way. All three were test mistakes; the game code was right:
  - Six existing checks compared the old copy shape exactly, so I added paid and locked.
  - One test assumed a copy id that had been reused after a scrap.
  - One expected count in the bulk test was 5, not 6.

Headless Chrome, 390x844, fresh profile (rolls forced by the test script, never game code)
- Six crafts (four Commons, a Rare, a Mythic) left this shelf:
  - Mythic: locked, with Scrap disabled;
  - Rare: "Scrap: +1,000 Rose Pearls";
  - "Common x3": "+1,000 Rose Pearls each", with Scrap all 3.
- Scrap on the Common stack: Rose Pearls 37,500 -> 38,500.
  Toast: "Scrapped 1 Pink Duck copy: +1,000 Rose Pearls".
- Unlock, then Scrap on the Mythic, opened "Scrap this Mythic Pink Duck?" with its perks
  and "+1,000 Rose Pearls back"; focus started on Cancel.
- Tab, Tab, Shift+Tab: focus went Scrap it, Cancel, Scrap it. Escape cancelled, the panel
  stayed open, and the Mythic stayed.
- With the Mythic placed, the shelf offered "Scrap all unlocked below Mythic (4)".
  It asked "Scrap 4 copies below Mythic?" for +7,000 Rose Pearls.
- Confirm: Rose Pearls 38,500 -> 45,500. Toast: "Scrapped 4 Pink Duck copies: +7,000 Rose
  Pearls". The 7,000 is 4,000 (the first duck paid 10,000) + 3 x 1,000.
- After eight more Rares, the rows scrolled inside the card: 1,226 px of rows in a
  420 px box, and scrolling moved 200 px.
- Every shelf and dialog button was at least 44 px tall.
- scrollWidth equalled clientWidth (390) for the page, and no element was wider than its
  box, in every state.
- Console: only the favicon 404.
- Screenshots in the session scratchpad under shots/: shelf-390.png,
  confirm-mythic-390.png, bulk-confirm-390.png, shelf-scroll-390.png.

Rules as built
- Each copy stores paid (the cost lines spent) and locked.
- Scrap refunds floor(0.4 x each paid line), as one data value: REFUND_SHARE in
  src/artifacts.js.
- Pearls go back into the backpack; alloys go into the forge stock.
- The copy on the pedestal can never be scrapped. A locked copy cannot be scrapped.
- Save v7 (key still poppit.v1). The v6 to v7 step gives old copies the repeat-craft price,
  except a duck's first copy (its lowest id), which gets 10,000. Prices are frozen in the
  step.

Choices I made without asking
- Migrated Epic and Mythic copies are locked too, like new ones.
- Scrapping does not switch Keep on. Auto-sell only sells new pops, so refunded Roses in
  the backpack are never auto-sold. Sell all skips them while Rose is kept.
- Refunded pearls carry the stack's average stored value, or a fresh pop's value if the
  stack was empty.
- Confirmation is asked for Epic and Mythic singles, the bulk action, and Scrap all on a
  Common stack. Commons and Rares scrap one at a time without a question.
- Stack buttons: Scrap takes the newest unlocked Common; Place places the newest; Lock
  locks the whole stack if any is unlocked, else unlocks it.
- The bulk button shows only when something qualifies. A Common pedestal has nothing
  below it.
- Sort is a page-session choice, not saved. Best first: rarity, then oldest.
- Loading clamps paid to the artifact's own cost lines, as whole numbers, at most what any
  copy in that save could have paid. A missing line becomes the repeat price.
  locked must be a real true.
- The confirmation starts on Cancel. Escape or a tap outside the box cancels.

Things you should know
- Relic scraps refund nothing at today's prices: 40% of 1 or 2 alloys floors to 0.
  The rows say "Scrap: no refund". Rounding up, or a larger share for materials, would
  change that.
- A Mythic hunt now costs less net. 33.3 crafts cost 90,833 Rose Pearls on average.
  Scrapping the other 32.3 copies gives back about 35,300, so about 55,500 net (61%).
- Copy ids can be reused after the newest copy is scrapped (highest + 1). They stay unique
  among owned copies.

Commits (pushed to main)
- Engine and save: paid cost, lock flag, scrap and refund, save v7 migration.
  Built and tested alone, with the panel work stashed.
- Shelf UI and confirmations, with tests/shelf_tests.js.
- CLAUDE.md and this file.

Still open
- Relic refunds are 0 at today's alloy prices.
- The shelf sort is not saved.
- No second duck; most dusts have no use; relic icons are first drawings.
- Engaged later cycles run under 4 min; Black dominates income; Flavors explode with
  waiting (see the balance report).
- Not checked on a real phone.
