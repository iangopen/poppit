/* ---------- Artifacts: permanent items crafted from kept pearls or forge alloys, grouped in halls. Pure, no DOM. ---------- */
// Every craft makes a copy: { id, art, rarity, perks: [{ stat, value }] }. state.artifacts holds, per artifact id,
// { copies: [...], active: <copy id> }. Only the active copy (the one on its pedestal) counts: its artifact's base bonus
// plus its own perks. The first copy goes on the pedestal by itself; later copies wait until setActive puts them there.
// A copy's roll is stored in the save, so loading never re-rolls.
const ARTS = (() => {
  const PINK_DUCK_PAYOUT = 1.4; // Ian's value (was 1.25); may change again
  const RELIC_HALL_NAME = 'Hall of Relics'; // one string, easy to rename
  // halls in display order; the Artifacts panel draws one section per hall
  const HALLS = [
    { id: 'ducks', name: 'Hall of Ducks', blurb: 'Lucky ducks that make every pop pay more.' },
    { id: 'relics', name: RELIC_HALL_NAME, blurb: 'Relics assembled from forge alloys. They help the game run, not the payouts.' },
  ];
  // cost lines: { kind: <pearl id>, qty } spends normal pearls from the backpack; { kind: 'material', id, qty } spends forge
  // materials (dusts or alloys) from the forge stock. The first craft costs qty; every later one costs
  // ceil(qty x repeatFactor x costGrowth^(copies owned - 1)). repeatFactor 1 and costGrowth 1 = flat.
  // bonus: { type, value }, value is a multiplier. Payout bonuses multiply together; every other stat adds (value - 1).
  // Bonus types (and perk stats): payout, shiny (shiny chance), frenzy (frenzy length), away (away bonus rate),
  // forge (forge speed), spawn (spawn rate), meter (how fast the frenzy meter fills).
  const ARTIFACTS = [
    { id: 'pink_duck', hall: 'ducks', name: 'Pink Duck', description: 'Every payout x' + PINK_DUCK_PAYOUT + ', for good.', cost: [{ kind: 'pearl', qty: 10000 }], repeatFactor: 0.25, costGrowth: 1, bonus: { type: 'payout', value: PINK_DUCK_PAYOUT } },
    { id: 'rose_lantern', hall: 'relics', name: 'Rose Lantern', description: 'The frenzy meter fills 25% faster.', cost: [{ kind: 'material', id: 'rosegold', qty: 2 }], repeatFactor: 1, costGrowth: 1, bonus: { type: 'meter', value: 1.25 } },
    { id: 'blue_compass', hall: 'relics', name: 'Blue Compass', description: 'Forge speed x1.3.', cost: [{ kind: 'material', id: 'azure_steel', qty: 2 }, { kind: 'material', id: 'rosegold', qty: 1 }], repeatFactor: 1, costGrowth: 1, bonus: { type: 'forge', value: 1.3 } },
    { id: 'mint_clock', hall: 'relics', name: 'Mint Clock', description: 'Away bonus x1.2.', cost: [{ kind: 'material', id: 'mintsilver', qty: 2 }, { kind: 'material', id: 'azure_steel', qty: 1 }], repeatFactor: 1, costGrowth: 1, bonus: { type: 'away', value: 1.2 } },
  ];
  // each craft rolls a rarity by weight; perks = how many distinct perks it gets, range = what their rolled values are multiplied by
  const RARITIES = [
    { id: 'common', name: 'Common', weight: 55, perks: 0, range: 1 },
    { id: 'rare', name: 'Rare', weight: 30, perks: 1, range: 1 },
    { id: 'epic', name: 'Epic', weight: 12, perks: 2, range: 1.5 },
    { id: 'mythic', name: 'Mythic', weight: 3, perks: 3, range: 2.5 },
  ];
  // the perk pool: value = an added fraction (0.05 = +5%), rolled in min..max, times the rarity's range, never above cap.
  // A payout perk multiplies payouts by (1 + value); the others add to their stat's other bonuses.
  const PERKS = [
    { stat: 'payout', name: 'Payouts', min: 0.02, max: 0.06, cap: 0.2 },
    { stat: 'shiny', name: 'Shiny chance', min: 0.05, max: 0.15, cap: 0.4 },
    { stat: 'frenzy', name: 'Frenzy length', min: 0.05, max: 0.15, cap: 0.4 },
    { stat: 'away', name: 'Away bonus', min: 0.05, max: 0.15, cap: 0.4 },
    { stat: 'forge', name: 'Forge speed', min: 0.05, max: 0.15, cap: 0.4 },
    { stat: 'spawn', name: 'Spawn rate', min: 0.03, max: 0.08, cap: 0.2 },
  ];
  const STATS = ['payout', 'shiny', 'frenzy', 'away', 'forge', 'spawn', 'meter'];
  const byId = (id) => ARTIFACTS.find((a) => a.id === id) || null;
  const rarityById = (id) => RARITIES.find((r) => r.id === id) || null;
  const perkById = (stat) => PERKS.find((p) => p.stat === stat) || null;
  const isMat = (c) => c.kind === 'material';
  const entry = (arts, id) => (arts && arts[id] && Array.isArray(arts[id].copies) ? arts[id] : null);
  const count = (arts, id) => { const e = entry(arts, id); return e ? e.copies.length : 0; };
  const activeCopy = (arts, id) => { const e = entry(arts, id); return (e && e.copies.find((c) => c.id === e.active)) || null; };
  // how many of a cost line's item the player has: pearls from inv, materials from the forge stock
  const have = (c, inv, stock) => (isMat(c) ? (stock && stock[c.id]) || 0 : (inv && inv[c.kind]) || 0);
  // the cost of the next craft: the base cost for the first copy, then base x repeatFactor x costGrowth^(copies - 1)
  function craftCost(id, arts) {
    const a = byId(id); if (!a) return [];
    const n = count(arts, id), g = n ? (a.repeatFactor == null ? 1 : a.repeatFactor) * Math.pow(a.costGrowth == null ? 1 : a.costGrowth, n - 1) : 1;
    return a.cost.map((c) => Object.assign({}, c, { qty: Math.ceil(+(c.qty * g).toPrecision(12)) })); // toPrecision: 10000 x 1.1^2 is 12,100, not 12,101
  }
  const canCraft = (id, inv, arts, stock) => !!byId(id) && craftCost(id, arts).every((c) => have(c, inv, stock) >= c.qty);
  const round3 = (x) => Math.round(x * 1000) / 1000;
  // a rarity and its distinct perks from rng (any function returning 0 <= x < 1)
  function roll(rng) {
    rng = rng || Math.random;
    const total = RARITIES.reduce((s, r) => s + r.weight, 0);
    let x = rng() * total, rar = RARITIES[RARITIES.length - 1];
    for (const r of RARITIES) { if (x < r.weight) { rar = r; break; } x -= r.weight; }
    const pool = PERKS.slice(), perks = [];
    for (let i = 0; i < rar.perks && pool.length; i++) {
      const p = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      perks.push({ stat: p.stat, value: Math.min(p.cap, round3((p.min + rng() * (p.max - p.min)) * rar.range)) });
    }
    return { rarity: rar.id, perks };
  }
  const nextId = (arts) => { let n = 0; for (const k in arts) { const e = entry(arts, k); if (e) for (const c of e.copies) n = Math.max(n, c.id); } return n + 1; };
  // adds a copy; the first copy of an artifact goes on its pedestal, later ones never replace it
  function addCopy(arts, id, rarity, perks) {
    if (!entry(arts, id)) arts[id] = { copies: [], active: null };
    const c = { id: nextId(arts), art: id, rarity, perks: perks || [] };
    arts[id].copies.push(c);
    if (arts[id].copies.length === 1) arts[id].active = c.id;
    return c;
  }
  // consumes exactly the cost (and the matching share of each pearl stack's stored value), rolls the copy and returns it; null = not crafted
  function craft(id, inv, arts, invV, stock, rng) {
    if (!canCraft(id, inv, arts, stock)) return null;
    for (const c of craftCost(id, arts)) {
      if (isMat(c)) { stock[c.id] -= c.qty; if (!stock[c.id]) delete stock[c.id]; continue; }
      const h = inv[c.kind];
      if (invV && invV[c.kind] != null) invV[c.kind] = h - c.qty > 0 ? invV[c.kind] * (h - c.qty) / h : 0;
      inv[c.kind] = h - c.qty;
    }
    const r = roll(rng);
    return addCopy(arts, id, r.rarity, r.perks);
  }
  // puts an owned copy on its artifact's pedestal; free, at any time
  function setActive(arts, id, copyId) {
    const e = entry(arts, id);
    if (!e || !e.copies.some((c) => c.id === copyId)) return false;
    e.active = copyId; return true;
  }
  // every active bonus: payout as one multiplier, every other stat as an added fraction (0.25 = +25%)
  function activeBonuses(arts) {
    const b = {}; for (const s of STATS) b[s] = 0; b.payout = 1;
    for (const a of ARTIFACTS) {
      const c = activeCopy(arts, a.id); if (!c) continue;
      if (a.bonus.type === 'payout') b.payout *= a.bonus.value; else b[a.bonus.type] += a.bonus.value - 1;
      for (const p of c.perks) { if (p.stat === 'payout') b.payout *= 1 + p.value; else b[p.stat] += p.value; }
    }
    return b;
  }
  const payoutMult = (arts) => activeBonuses(arts).payout;
  // untrusted input (a save) -> valid artifacts: unknown artifacts and copies with an unknown rarity or a bad or repeated id
  // are dropped; perks keep known, distinct stats (as many as the rarity allows) with values clamped to min..cap; the active
  // copy must be an owned one, otherwise the first copy goes on the pedestal
  function fromSave(d) {
    const out = {}, src = d && typeof d === 'object' && !Array.isArray(d) ? d : {}, ids = new Set();
    for (const a of ARTIFACTS) {
      const e = src[a.id]; if (!e || typeof e !== 'object' || !Array.isArray(e.copies)) continue;
      const copies = [];
      for (const c of e.copies) {
        if (!c || typeof c !== 'object') continue;
        const rar = rarityById(c.rarity);
        if (!rar || !Number.isInteger(c.id) || c.id < 1 || ids.has(c.id)) continue;
        const perks = [], seen = new Set();
        for (const p of Array.isArray(c.perks) ? c.perks : []) {
          const def = p && perkById(p.stat);
          if (!def || seen.has(def.stat) || typeof p.value !== 'number' || !Number.isFinite(p.value) || perks.length >= rar.perks) continue;
          seen.add(def.stat); perks.push({ stat: def.stat, value: Math.min(def.cap, Math.max(def.min, p.value)) });
        }
        ids.add(c.id); copies.push({ id: c.id, art: a.id, rarity: rar.id, perks });
      }
      if (!copies.length) continue;
      out[a.id] = { copies, active: copies.some((c) => c.id === e.active) ? e.active : copies[0].id };
    }
    return out;
  }
  return { PINK_DUCK_PAYOUT, RELIC_HALL_NAME, HALLS, ARTIFACTS, RARITIES, PERKS, STATS, byId, rarityById, perkById, isMat, have, count, activeCopy,
    craftCost, canCraft, roll, addCopy, craft, setActive, activeBonuses, payoutMult, fromSave };
})();
if (typeof module !== 'undefined') module.exports = ARTS;
