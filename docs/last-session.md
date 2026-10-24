Session: the halls as galleries, the equip row, and the payout line (interface only)

What changed
- One reusable Gallery (makeGallery in src/ui.js), used by both halls: one pedestal at a
  time, a sliver of each neighbour, snaps, stops at both ends (no wrap). Moves by touch or
  mouse swipe, the 44 px arrow buttons, a tap on a neighbour's sliver, and Left / Right
  while the panel is open with no dialog up and no text field focused. A dot row shows
  the position; a live region says e.g. "Blue Duck, 2 of 10". Vertical drags still
  scroll the panel. Reduced motion makes moves instant. Off-screen pedestals are inert.
- Hall of Ducks: one labeled pedestal per duck in roster order.
  - Occupied: the active copy in its rarity frame, then the old details unchanged (perks,
    next copy cost, Craft another, odds, shelf with Place / Lock / Scrap).
  - Empty: a silhouette in the pearl's colour, "Empty pedestal", "820 of 1,600 Blue
    Pearls kept" with a bar, the Keep toggle for that pearl, odds, reason and Craft.
  - Not found: dimmed, labeled, "Not found yet", no recipe.
- Hall of Artifacts (renamed from Hall of Relics): a row of 5 equip slots on top (icon
  and name, or "Empty"), then the relic gallery. Unequipped relics say "Not equipped: it
  has no effect until you equip it." with Equip into the first free slot. With all five
  full, Equip opens an in-page chooser of the five; picking one swaps. Tapping a filled
  slot offers Unequip in the existing in-page confirm. Both trap focus and take Escape.
- Each hall remembers its pedestal for the page session (not saved).
- Payout line: "Payouts x1.68 (Flavors 2 x1.2, artifacts x1.4) + 3 type ducks". It is
  now a button that opens the Hall of Ducks.
- The reveal, the shelf, scrap and lock are untouched.

Verification
- npm run build: built index.html. npm test: exit 0. Node test files 0 failures
  (32, 19, 9, 21, 8, 2); the harness prints 342 PASS lines and ALL PASSED.
- New harness file tests/gallery_tests.js covers:
  - arrows, keys and swipes; short and vertical drags; both ends; the announcement;
  - an empty pedestal's recipe, bar and disabled reason; the pedestal Keep toggle
    changing the backpack Keep state;
  - Equip into the first free slot, the chooser with five full (Escape, then swap),
    Unequip;
  - the payout line with and without type ducks, and the link.
- Older panel tests now read the drawn hall through G.hallHTML(); their assertions are
  unchanged apart from the hall name, the tab markup and one icon count.
- npm run sim twice: identical, and identical to the output from before the duck session.
- Headless Chrome 390x844, mobile with touch, real touch and mouse drags over CDP:
  - occupied (Pink Duck): framed Mythic copy, perks below; page 390/390, panel body
    316/316, gallery 310/310, pedestal 265/265
  - empty (Blue Duck, after a touch swipe): blue silhouette, recipe and bar; a real tap
    on Keep turned Keep on and the reason changed
  - not found (Coral Duck, after two mouse drags and two touch swipes): dimmed, "Not
    found yet"; same widths
  - ends: six swipes right stayed on Pink, twelve left stayed on Black; the Left key and
    Prev each moved one; a vertical touch drag scrolled the panel 239 -> 0
  - Hall of Artifacts, five slots full (three real relics + three test-only ones made in
    the page for this check): row 310/310, all five fit; Equip on the sixth opened the
    chooser (focus on Cancel), picking Mint Clock swapped it; a slot tap offered Unequip
  - The gallery view's scrollWidth is the whole clipped track (e.g. 2778/310) by design;
    nothing visible overflows. No buttons under 44 px. No console errors.
  - Forge stash warning still shows at 390 px. Desktop 1280x800: gallery capped at
    560 px.

Fixed along the way
- Tabs were 36 px tall and the panel close button 31x26: both now at least 44 px.

Choices I made
- The gallery moves a transformed track by pointer events instead of native scroll-snap,
  so the index is testable and drags are real. It sits in src/ui.js, not a new file, so
  the fixed concat order is unchanged.
- Renamed the relic hall to "Hall of Artifacts" (one constant) to match the brief; the
  items are still called relics.
- Duck pedestals also show the Keep toggle when the duck is owned (Craft another has the
  same Keep reason).
- Not-found pedestals show the duck's name (it was required) but no recipe and no Craft.
- Equip goes to the next free slot (the list is compact, so free slots are at the end).
- The payout line is always a link while the Artifacts dock button shows.

Still open
- Real-phone check: swipe feel, the slivers, the chooser, focus and screen readers.
- Only three relics exist, so the slots stay mostly empty and the chooser never shows
  in real play yet.
- Duck cost tuning (docs/duck-report.md) and how hard ten ducks stack.
