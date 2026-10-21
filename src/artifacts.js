/* ---------- Artifacts: permanent items crafted from kept pearls, grouped in halls. Pure, no DOM. ---------- */
const ARTS = (() => {
  const PINK_DUCK_PAYOUT = 1.25; // placeholder value, Ian may change it
  // halls in display order; the Artifacts panel draws one section per hall
  const HALLS = [{ id: 'ducks', name: 'Hall of Ducks', blurb: 'Lucky ducks that make every pop pay more.' }];
  // cost: inventory keys and quantities (a pearl id now; forge materials later). bonus: { type: 'payout', value } multiplies every payout.
  const ARTIFACTS = [
    { id: 'pink_duck', hall: 'ducks', name: 'Pink Duck', description: 'Every payout x' + PINK_DUCK_PAYOUT + ', for good.', cost: [{ kind: 'pearl', qty: 10000 }], bonus: { type: 'payout', value: PINK_DUCK_PAYOUT } },
  ];
  const byId = (id) => ARTIFACTS.find((a) => a.id === id) || null;
  function canCraft(id, inv, owned) {
    const a = byId(id);
    if (!a || (owned && owned[id] === true)) return false;
    return a.cost.every((c) => ((inv && inv[c.kind]) || 0) >= c.qty);
  }
  // consumes exactly the cost (and the matching share of each stack's stored value) and marks it owned
  function craft(id, inv, owned, invV) {
    if (!canCraft(id, inv, owned)) return false;
    for (const c of byId(id).cost) {
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
  return { PINK_DUCK_PAYOUT, HALLS, ARTIFACTS, byId, canCraft, craft, payoutMult };
})();
if (typeof module !== 'undefined') module.exports = ARTS;
