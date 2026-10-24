# Session history

## 2026-10-18: late-game measurement

- Replaced `build.sh` with `tools/build.js`, so the build runs in PowerShell. Its `index.html` output is byte-identical to the old build.
- Made `tools/sim32.js` seeded (mulberry32) and extended it:
  - it plays 6 Fresh Batch cycles per profile, with the game's real reset rules;
  - it applies the per-type spawn cap and the board prefill;
  - it reports per-cycle tables;
  - it adds a 25-minute player policy and tuning variants.
- Fixed `fmt` rollover at suffix boundaries, extended suffixes to Vg, and added tests.
- Wrote `docs/balance-report.md`, with three problems and options A/B/C. No balance change was applied.

## 2026-10-18: save export and import

- Added `src/save.js`: save codes (`POPPIT2:` + base64 + FNV-1a checksum), `SAVE_VERSION` and a `MIGRATIONS` table. The v1 → v2 logic moved into it unchanged.
- Hardened `loadState`: every field is clamped or defaulted, and newer versions are refused. A refused stored save is never overwritten.
- Added a Save section to Settings: copy, download, paste or open a file, then Load → Confirm. The replaced save is kept as `poppit.backup` and can be restored.
- Added a `pagehide` save, and an `awayBonus` guard against a NaN save time.

## 2026-10-18: standalone page

- `index.html` is now a complete document: doctype, charset and viewport metas, `<head>` / `<body>`, and a global `[hidden]` rule. Standards mode was measured against the old quirks-mode page at two sizes; the one visible regression (the book arrows) is fixed.
- An unreadable stored save is kept in `poppit.backup` (or `poppit.unreadable`) and can be recovered as text.
- The "Copy save code" button no longer wraps.

## 2026-10-18: tool unique upgrades, late Helpers, auto-sell on

- Removed Chain Reaction. Save v3 refunds it at its v2 prices.
- Wide Swing became the Steel Pin's unique upgrade, the first of a per-tool upgrade slot (`TOOLS[i].unique`, level in `toolUp[i].u`), shown on the tool's page in the Tools panel.
- Helpers now need Coral Pearls and cost base 8500. In the sim the first helper lands at 84% (casual) and 80% (engaged) of the way to the first Fresh Batch.
- Auto-sell is on for new games, after Reset save, and for saves without the field. The first-run hint and the backpack text were updated to match.
- The "New techniques" heading hides while it is empty.

## State: real and verified (2026-10-21)

- **Build:** the Node build replaced `build.sh`, and its output is byte-identical to the old build.
- **Tests:** 32 econ unit tests (one pins the 2026-10-22 dials and the sim's two ducks), 19 artifacts unit tests, 21 forge unit tests, 8 page tests, 279 harness checks (`tests/shelf_tests.js` adds the shelf, scrap, locks and confirmations) and 2 away-bonus sim tests pass. They cover save codes, versions, the v3 migration, clamping, backup/restore, unreadable saves, `pagehide`, unique upgrades, the Helpers gate, the auto-sell defaults, `frenzyNeed`, the derived payout table, `fmtX`, the away bonus at three tool powers and on a pool of unhittable types, and the book and pool payout strings.
- **Unique upgrades, Helpers and auto-sell (2026-10-18), checked in Chrome:**
  - a new game earns juice from pops with an empty backpack;
  - the Tools panel shows Wide Swing on the Steel Pin page and the muted line on the Awl page;
  - one drag across the board popped 6 pearls with the Steel Pin (Wide Swing level 2) and 0 with the Awl.
  - No console errors.
- **Standalone page (2026-10-18):** measured in Chrome with `python -m http.server`, which sends no charset:
  - `compatMode` is CSS1Compat (it was BackCompat) and `characterSet` is UTF-8 (it was windows-1252);
  - the viewport meta is present;
  - every panel is `display: none` until opened and `none` again after closing;
  - the tool label renders "·".
- **Standards-mode layout check:** compared at 1280×800 and 390×844 across the board and every panel. Upgrade cards are 0.6 px taller each (line-height strut), which was left as is. The book arrows were 3 px taller; fixed. Nothing else changed.
- **Save export / import (2026-10-18):** all four paths work in Chrome:
  - copy → clear site data → paste → Load → Confirm brings the progress back;
  - the copy fallback shows the selected code;
  - a truncated code is refused;
  - a stored v99 save is neither loaded nor overwritten by autosave.
  - No console errors.
- **Roster and unlock chain:** 10 pearl types, unlocked in the order Blue, Mint, Golden, Violet, Coral, Marble, Opal, Ruby, Black.
- **Collection and pool:** the collection book, pool toggles with the "next type maxed" lock, and shiny pearls.
- **Tools:** six tools, each with power and speed upgrades. The Steel Pin also has its unique upgrade, Wide Swing.
- **Backpack:** auto-sell is on by default. With it off, pops collect in the backpack to sell by hand.
- **Other systems:** Frenzy, Fresh Batch and the radio (`music/tracks.json`).
- **Number display:** `fmt` was fixed for suffix rollover (`1000K` now shows `1.00M`) and checked in the browser up to `99.9Qa`.
- **Payouts and frenzy (2026-10-21), checked in headless Chrome** (the Chrome extension was not connected) at 1280×800 and 390×844:
  - the book shows `x190K` / `x950K` on the Black Pearl page;
  - the pool cards show `x… payout`;
  - no payout text in the book (all 10 pages) or on the pool cards overflows (`scrollWidth` ≤ `clientWidth`);
  - the only console messages were the favicon 404 and Chrome's autoplay notice.
- **Balance (2026-10-22):** `docs/balance-report.md` is current. Pacing targets, with sim results (reference seeds, no duck):
  - **First Fresh Batch:** target 11–13 min casual, 6–8 min engaged. Sim: **12.8** and **6.0** (6.2 before the Black change; the seed 1–8 averages are 12.8 and 5.4, against 12.7 and 5.6 before).
  - **First helper:** target 70–90% of the way to it. Sim: 11.4 min (**89%**) casual, 4.8 min (**80%**) engaged.
  - **Cycles 2–6:** target shorter each time but never under 4 min. Sim: casual 12.9 / 10.2 / 8.6 / 6.6 / 5.4 (none under 4, but C2 is 0.1 min longer than C1). Engaged 3.6 / 3.4 / 3.0 / 2.2 / 2.3 (**missed**: see Still open).
  - **No upgrade group maxed in run 1:** met by group (verb / Pearls & Marbles / tune). Per upgrade, 10 of 18 (casual) and 9 of 18 (engaged) reach max.
  - **Black earns in at least 3 of 6 cycles:** casual 4 (C2, C3, C4, C6), engaged 4 (C1–C4). Over seeds 1–8: 3.5 and 3.1 of 6.
  - After six cycles: 19 Flavors (x2.9) for both profiles (15 x4.0 and 13 x3.6 before).
  - With a duck from minute 0 (not tuned against): plain x1.4, casual 11.0 / 8.6 / 6.2 / 5.0 / 4.1 / 4.6 and engaged 3.6 / 3.3 / 2.6 / 2.1 / 2.4 / 1.8; best x1.61, casual 8.9 / 7.4 / 4.6 / 5.1 / 4.8 / 2.9 and engaged 2.7 / 2.8 / 2.2 / 1.9 / 2.1 / 1.7.
- **Away bonus (2026-10-21):** one hour away against half of the measured helper-only hour is 0.89–1.04 at all 21 sim checkpoints. At the first Fresh Batch it pays 7.3M (casual) and 5.7M (engaged); the first version paid 84.2M and 67.3M. In the real game, a Ruby + Black pool with the Steel Pin makes helpers pop only Roses (harness check).

- **Artifacts and Keep (2026-10-21), checked in headless Chrome** (the Chrome extension was not connected) at 1280×800 and 390×844:
  - a save code with 10,250 kept Rose Pearls was imported through Settings (Load, then Confirm), and the duck button showed;
  - Craft spent exactly 10,000 (10,251 → 251), and one Rose pop paid 2.04 before and 2.55 after (x1.25, the duck's value at that time);
  - Fresh Batch kept the duck and the 252 kept Roses;
  - no text overflows in the Artifacts panel or the backpack, and the backpack fits inside the board;
  - console: only the favicon 404 and Chrome's autoplay and vibrate notices.

- **Shelf, scrap and locks (2026-10-22), checked in headless Chrome at 390×844** (the extension was not connected), fresh profile, rolls forced by a seeded `Math.random` installed by the test script only:
  - six crafts (four Commons, a Rare, a Mythic) left a shelf of Mythic (locked, Scrap disabled), Rare and "Common x3";
  - Scrap on the stack: Rose Pearls 37,500 → 38,500, toast "Scrapped 1 Pink Duck copy: +1,000 Rose Pearls";
  - after Unlock, Scrap on the Mythic opened "Scrap this Mythic Pink Duck?" with focus on Cancel; Tab, Tab, Shift+Tab went Scrap it, Cancel, Scrap it; Escape cancelled and left the panel open;
  - with the Mythic placed, "Scrap all unlocked below Mythic (4)" asked "Scrap 4 copies below Mythic?" for +7,000 Rose Pearls; Confirm took Rose Pearls 38,500 → 45,500;
  - eight more Rares: the shelf rows scrolled inside the card (1,226 px of rows in a 420 px box);
  - every shelf and dialog button was at least 44 px tall; scrollWidth equalled clientWidth (390) for the page and every element in every state; the only console messages were the favicon 404.
- **Artifacts panel and roll reveal (2026-10-22), checked in headless Chrome at 390×844** (the extension was not connected), fresh profile, rolls forced by a seeded `Math.random` installed by the test script only:
  - one reveal of each rarity: Common (the first copy: "Placed on your pedestal", one Nice! button, 8 particles), Rare (1 perk, 16 particles), Epic (2 perks, 28), Mythic (3 perks, 44); perks were not yet shown 150 ms in, and each compare line read against the Common on the pedestal;
  - Tab, Tab, Shift+Tab kept focus on the two buttons; Escape closed the reveal and left the panel open; a tap on the backdrop closed a finished reveal and skipped a running one; Place on pedestal put the Mythic copy up;
  - shelf Place swapped Mythic for Epic, and the pedestal line changed from "Payouts x1.596, Frenzy length +32.5%, Forge speed +36.3%" to "Payouts x1.4, Shiny chance +16.5%, Away bonus +18%";
  - the Hall of Relics tab showed the lantern, compass and clock icons (96 px) with alloy cost lines and reasons; the forge's Rose Dust row read "Uses 100 of your 4,200 kept Rose Pearls (the Pink Duck needs 10,000)" with Start enabled;
  - with `prefers-reduced-motion: reduce`, every perk showed at once and there were no particles;
  - scrollWidth equalled clientWidth (390) for the page and for every element in the reveal, the Artifacts panel and the Forge panel in every state; the only console messages were the favicon 404.
- **Artifact copies, rolls and the Hall of Relics (2026-10-21):** engine, data, save v6 and tests; the panels only keep working.
  - Harness run: two duck crafts took Rose Pearls 20,500 → 10,500 → 500. The first rolled Common and went on the pedestal; the second rolled Mythic (payout +6.4%, shiny +16%, frenzy +16%) and waited. Swapping to it raised a Rose pop from 2.86 to 3.04 (x1.064), and swapping back restored 2.86.
  - Two Rosegold jobs took 12 Rose Dust and 4 Blue Dust and no pearls; the Rose Lantern took the 2 Rosegold. The Blue Compass re-timed a running job from 30 s to 23.08 s left.
  - A Mint Clock with a +10% away perk raised a 1 h away bonus x1.3 (8,791 → 11,428).
  - In headless Chrome at 390×844: the Artifacts panel shows both halls with alloy cost lines, the forge lists Rosegold with "Need 1 more Blue Dust: make it in the forge", no overflow, no console errors.
  - `npm run sim` and `--duck` printed exactly what they printed before (an owned duck is one Common copy). The 2026-10-22 dials changed both since.
- **Forge UI (2026-10-21), checked in headless Chrome at 390×844** (the extension was not connected), from a fresh profile:
  - with default settings, 100 Rose pops showed the Forge button, and Start read "Turn on Keep for Rose Pearls, or turn off auto-sell";
  - Keep from the panel turned the backpack row to Kept;
  - after 150 more pops, Start took 100 (150 → 50);
  - 7 real Strike presses in one second shaved exactly 5 s;
  - the job finished into the stock by itself;
  - Forge Speed cost 20,000 and the speed line read x1.25;
  - reload and Fresh Batch kept Keep, stock, level and the 50 kept Roses;
  - no horizontal overflow, and no console errors.

## 2026-10-23: Hall of Ducks (ten ducks) and relic equip slots

- Nine type ducks added as data (Blue ... Black), each x1.4 on its own pearl type only; the Pink Duck is unchanged.
- Costs derived from the new `node tools/sim32.js --ducks` report (docs/duck-report.md); untuned.
- Relics now work only while equipped: EQUIP_SLOTS 5, `state.artEquip`, save v8 equips old relics.
- The forge stash warning covers every pearl type. The default sim output was byte-identical before and after.

## 2026-10-24: the halls as galleries, the equip row, the payout line

- Interface only, no number changes. One Gallery component (`makeGallery`) for both halls; pedestal states
  (occupied, empty with recipe and Keep, not found); the equip row, Equip, Unequip and the swap chooser;
  "Hall of Relics" renamed "Hall of Artifacts"; the payout line counts type ducks and opens the Hall of Ducks.
- Checked in headless Chrome at 390×844 (mobile, touch) over CDP, with real touch and mouse drags:
  - a touch swipe moved Pink -> Blue; two mouse drags Blue -> Mint -> Golden; two touches -> Coral;
    six swipes right stopped at Pink (Prev disabled), twelve left stopped at Black (Next disabled);
  - the Left key and the Prev arrow each moved one; a vertical touch drag scrolled the panel (239 -> 0)
    and left the pedestal alone; a real tap on the pedestal Keep turned on Keep for Blue Pearls;
  - page 390/390, panel body 316/316, gallery 310/310, pedestal on show 265/265, equip row 310/310 in
    every state; no button under 44 px (after raising the tabs from 36 and the close button from 31×26);
  - with three test-only relics, five equipped: Equip opened the chooser (focus on Cancel, box 25..365),
    picking Mint Clock swapped it out; a slot tap offered Unequip; Escape closed it, not the panel;
  - the forge stash warning showed for Rose, Blue and Mint; no console errors. Desktop 1280×800: gallery
    capped at 560 px, no overflow.

## 2026-10-24: the first minutes (reveal rules, next goal, dots, toast batching)

- UI only; no economy, save or rule changes. Audit before and after in docs/onboarding-audit.md (headless Chrome, 390x844,
  muted): visible controls 6 / 6 / 9 / 18 before, 2 / 3 / 7 / 18 after, at 0 s / first pop / first purchase / 3 min.
- Layout at 360, 390 and 430 px: the HUD column (juice, payout line, goal, toast) never overlaps the hint or the bottom bar,
  no sideways scroll; one overlap found and fixed (the payout line's 44 px hit box under the goal line).
- Two fixture saves past every threshold show exactly the controls they showed under commit 50de9ac.

## 2026-10-24: Artifacts and Forge gate at 500K, Stats screen, Reduce effects

- Artifacts and the Forge now come with the Fresh Batch box (500K lifetime juice), or with any artifact or forge state, a Keep, or
  a Fresh Batch. The 3-minute audit count fell from 18 to 16 (11 on screen).
- Save v9: a stats object (taps, time played, run timer, best pop, highest combo, biggest Fresh Batch, fastest run).
- Reduce effects in Settings (defaults to the browser's reduced motion): no bursts, shake, floating text or flash; sounds stay.
- Settings and Stats checked in headless Chrome at 390x844: page 390/390, panels 316/316, nothing past the edge.
