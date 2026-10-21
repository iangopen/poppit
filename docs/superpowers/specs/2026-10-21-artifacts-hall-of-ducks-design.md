# Artifacts: Hall of Ducks and the Pink Duck

Date: 2026-10-21. Status: implemented in the same session; for Ian's review.

## Goal

Add permanent items (artifacts) that the player crafts by spending kept pearls. Artifacts are grouped in themed halls. This session ships the first hall, the Hall of Ducks, and its first duck, the Pink Duck. The forge (crafting materials) comes later; the data model leaves room for it, and nothing of it is built.

## Data model (`src/artifacts.js`, pure, no DOM)

- `HALLS`: `[{ id, name, blurb }]`, in display order. Today only `ducks` ("Hall of Ducks").
- `ARTIFACTS`: `[{ id, hall, name, description, cost, bonus }]`.
  - `cost` is a list of `{ kind, qty }`. `kind` is an inventory key: a pearl id (`pearl` = Rose Pearl), or later a forge material id. Only normal stacks count; a shiny Rose (`pearl:s`) is not a Rose Pearl for crafting.
  - `bonus` is `{ type, value }`. Only `type: 'payout'` exists: every payout is multiplied by `value`.
- Pink Duck: `{ id: 'pink_duck', hall: 'ducks', cost: [{ kind: 'pearl', qty: 10000 }], bonus: { type: 'payout', value: PINK_DUCK_PAYOUT } }`, with `PINK_DUCK_PAYOUT = 1.25`, a placeholder in one named constant.
- `canCraft(id, inv, owned)`: false if the artifact is unknown, already owned, or any cost line is short.
- `craft(id, inv, owned, invV)`: if `canCraft`, it removes exactly the cost from `inv`, lowers `invV` (the stored sale value) in proportion, sets `owned[id] = true`, and returns true. Otherwise it changes nothing and returns false.
- `payoutMult(owned)`: the product of every owned payout bonus (1 with none).
- Owned artifacts live in `state.artifacts`, an object of `id: true`.

## Where the bonus applies

- `ECON.stats()` adds `artMult = payoutMult(st.artifacts)`, and `popValue()` multiplies by it. That covers every pop: taps, sweeps, helpers, shinies, frenzy, auto-sold or stored in the backpack (the stored value includes it).
- The away bonus (`helperIdle`) multiplies by it too, since it prices helper pops.
- Display: the HUD line under the juice counter shows the total payout multiplier and its parts when either is above 1, e.g. "Payouts x1.75 (Flavors x1.4, ducks x1.25)". The Fresh Batch toast uses the total.
- `tools/sim32.js` plays with no ducks by default; `--duck` (or the `pinkDuck` variant) owns the Pink Duck from the start.

## Keep

- `state.keep`: an object of pearl type id to `true`. A kept type covers both its normal and shiny stacks.
- A kept type's pops always go to the backpack, even with auto-sell on.
- Sell all skips kept stacks; the Worth total and the Sell all button count only sellable stacks. Selling a kept stack by selecting it and choosing a quantity still works.
- Fresh Batch keeps kept stacks and owned artifacts and wipes everything else it wipes today, including unkept backpack stacks. Reset save wipes everything.

## Panels and layout

- **Backpack:** a "Keep" list under the slots, with one row per discovered pearl type: its icon, name, how many are held, and a Keep toggle. The toggle shows a small hand-drawn lock when on. Slot icons of kept stacks carry the same lock. Rows exist even for types with nothing held, because with auto-sell on the backpack is empty until something is kept.
- **Artifacts panel:** a large panel like Pool (inset 6 px from the board edges). The header is "Artifacts", then one section per hall: a heading and a grid of cards, so more halls just add sections. A card has a hand-drawn duck, the name, what it gives, "x of 10,000 Rose Pearls kept" with a progress bar, and a Craft button. The button is disabled until affordable and becomes an "Owned" state after crafting. While Rose is not kept, a line under the cost says to mark it Keep in the backpack.
- **Dock button:** an inked duck, after the book. It appears once Rose Pearls popped in total (normal + shiny, all time) reach 100, or once an artifact is owned. The bottom bar moves right to make room only while it shows; under 820 px wide it moves up above the dock instead, because four dock buttons leave no room beside them.
- **Phones:** under 820 px the open backpack may extend down over the dock, and the Keep list scrolls when the board is short.

## Save (version 4)

- `SAVE_VERSION` 3 → 4. `MIGRATIONS[3]` adds `artifacts: {}` and `keep: {}` when missing. The key stays `poppit.v1`.
- `loadState` clamps: `artifacts` keeps only known ids whose value is `true`; `keep` keeps only known pearl type ids whose value is `true`; anything else is dropped.
- `serialize()` writes both. Save codes, save files, the import backup and Restore all go through `serialize`, `loadState` and the raw stored text, so they carry the new fields with no extra code.

## Out of scope

The forge, other ducks, other halls, and artifact bonus types other than payout.
