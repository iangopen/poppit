/* ---------- Artifacts: permanent items crafted from kept pearls, grouped in halls. Pure, no DOM. ---------- */
const ARTS = (() => {
  const PINK_DUCK_PAYOUT = 1.4; // Ian's value (was 1.25); may change again
  // halls in display order; the Artifacts panel draws one section per hall
  const HALLS = [{ id: 'ducks', name: 'Hall of Ducks', blurb: 'Lucky ducks that make every pop pay more.' }];
  // cost lines: { kind: <pearl id>, qty } spends normal pearls from the backpack; { kind: 'material', id, qty } spends forge
  // materials from the forge stock. bonus: { type: 'payout', value } multiplies every payout.
  const ARTIFACTS = [
    { id: 'pink_duck', hall: 'ducks', name: 'Pink Duck', description: 'Every payout x' + PINK_DUCK_PAYOUT + ', for good.', cost: [{ kind: 'pearl', qty: 10000 }], bonus: { type: 'payout', value: PINK_DUCK_PAYOUT } },
  ];
  const byId = (id) => ARTIFACTS.find((a) => a.id === id) || null;
  const isMat = (c) => c.kind === 'material';
  // how many of a cost line's item the player has: pearls from inv, materials from the forge stock
  const have = (c, inv, stock) => (isMat(c) ? (stock && stock[c.id]) || 0 : (inv && inv[c.kind]) || 0);
  function canCraft(id, inv, owned, stock) {
    const a = byId(id);
    if (!a || (owned && owned[id] === true)) return false;
    return a.cost.every((c) => have(c, inv, stock) >= c.qty);
  }
  // consumes exactly the cost (and the matching share of each pearl stack's stored value) and marks it owned
  function craft(id, inv, owned, invV, stock) {
    if (!canCraft(id, inv, owned, stock)) return false;
    for (const c of byId(id).cost) {
      if (isMat(c)) { stock[c.id] -= c.qty; if (!stock[c.id]) delete stock[c.id]; continue; }
      const have = inv[c.kind];
      if (invV && invV[c.kind] != null) invV[c.kind] = have - c.qty > 0 ? invV[c.kind] * (have - c.qty) / have : 0;
      inv[c.kind] = have - c.qty;
    }
    owned[id] = true;
    return true;
  }
  function payoutMult(owned) {
    let m = 1;
    if (owned) for (const a of ARTIFACTS) if (owned[a.id] === true && a.bonus.type === 'payout') m *= a.bonus.value;
    return m;
  }
  return { PINK_DUCK_PAYOUT, HALLS, ARTIFACTS, byId, isMat, have, canCraft, craft, payoutMult };
})();
if (typeof module !== 'undefined') module.exports = ARTS;
