/* ---------- Artifacts: permanent items crafted from kept pearls or forge alloys, grouped in halls. Pure, no DOM. ---------- */
// Every craft makes a copy: { id, art, rarity, perks: [{ stat, value }], paid: [cost lines as spent], locked }. state.artifacts holds, per artifact id,
// { copies: [...], active: <copy id> }. Only the active copy (the one on its pedestal) counts: its artifact's base bonus
// plus its own perks. The first copy goes on the pedestal by itself; later copies wait until setActive puts them there.
// A copy's roll is stored in the save, so loading never re-rolls.
const ARTS = (() => {
  const PINK_DUCK_PAYOUT = 1.4; // Ian's value (was 1.25); may change again
  const TYPE_DUCK_PAYOUT = 1.4; // each type duck's base: the payouts of its own pearl type only
  const EQUIP_SLOTS = 5; // how many artifacts from a hall with slots (the Hall of Artifacts) can be equipped at once
  // one duck per pearl type after Rose. qty: the first craft's cost in kept pearls of that type, from "node tools/sim32.js --ducks"
  // (2026-10-23): about 2 hours of that type's normal pops (the geometric mean of six checkpoint rates), at least 5, falling with
  // rarity. Untuned starting points: the sim cannot keep pearls, so these come from pop rates.
  const TYPE_DUCKS = [
    { pearl: 'blue', name: 'Blue Duck', pearls: 'Blue Pearl', qty: 1600 },
    { pearl: 'mint', name: 'Mint Duck', pearls: 'Mint Pearl', qty: 760 },
    { pearl: 'golden', name: 'Golden Duck', pearls: 'Golden Pearl', qty: 410 },
    { pearl: 'violet', name: 'Violet Duck', pearls: 'Violet Pearl', qty: 300 },
    { pearl: 'coral', name: 'Coral Duck', pearls: 'Coral Pearl', qty: 120 },
    { pearl: 'marble', name: 'Marble Duck', pearls: 'Glass Marble', qty: 36 },
    { pearl: 'opal', name: 'Opal Duck', pearls: 'Opal Pearl', qty: 22 },
    { pearl: 'ruby', name: 'Ruby Duck', pearls: 'Ruby Pearl', qty: 12 },
    { pearl: 'black', name: 'Black Duck', pearls: 'Black Pearl', qty: 10 },
  ];
  const REFUND_SHARE = 0.4; // scrapping a shelf copy refunds floor(this x what it cost when it was crafted), line by line
  const RELIC_HALL_NAME = 'Hall of Artifacts'; // one string, easy to rename (was 'Hall of Relics'); its items are still called relics
  // halls in display order; the Artifacts panel draws one section per hall. slots: its artifacts work only while equipped
  // (at most EQUIP_SLOTS at once); a hall without slots works as soon as it has a copy on the pedestal
  const HALLS = [
    { id: 'ducks', name: 'Hall of Ducks', blurb: 'Lucky ducks that make pops pay more: the Pink Duck every pop, the others their own pearl type.' },
    { id: 'relics', name: RELIC_HALL_NAME, blurb: 'Relics assembled from forge alloys. They help the game run, not the payouts. Only equipped relics work, up to ' + EQUIP_SLOTS + ' at once.', slots: true },
  ];
  // cost lines: { kind: <pearl id>, qty } spends normal pearls from the backpack; { kind: 'material', id, qty } spends forge
  // materials (dusts or alloys) from the forge stock. The first craft costs qty; every later one costs
  // ceil(qty x repeatFactor x costGrowth^(copies owned - 1)). repeatFactor 1 and costGrowth 1 = flat.
  // bonus: { type, value, scope }, value is a multiplier. Payout bonuses multiply together; every other stat adds (value - 1).
  // scope (a pearl id, payout only): the bonus, and the copy's payout perks, pay on pops of that type only. No scope = global.
  // Bonus types (and perk stats): payout, shiny (shiny chance), frenzy (frenzy length), away (away bonus rate),
  // forge (forge speed), spawn (spawn rate), meter (how fast the frenzy meter fills).
  const ARTIFACTS = [
    { id: 'pink_duck', hall: 'ducks', name: 'Pink Duck', description: 'Every payout x' + PINK_DUCK_PAYOUT + ', for good.', cost: [{ kind: 'pearl', qty: 10000 }], repeatFactor: 0.25, costGrowth: 1, bonus: { type: 'payout', value: PINK_DUCK_PAYOUT } },
    ...TYPE_DUCKS.map((d) => ({ id: d.pearl + '_duck', hall: 'ducks', name: d.name, description: d.pearls + ' payouts x' + TYPE_DUCK_PAYOUT + ', for good.', cost: [{ kind: d.pearl, qty: d.qty }], repeatFactor: 0.25, costGrowth: 1, bonus: { type: 'payout', value: TYPE_DUCK_PAYOUT, scope: d.pearl } })),
    { id: 'rose_lantern', hall: 'relics', name: 'Rose Lantern', description: 'The frenzy meter fills 25% faster.', cost: [{ kind: 'material', id: 'rosegold', qty: 2 }], repeatFactor: 1, costGrowth: 1, bonus: { type: 'meter', value: 1.25 } },
    { id: 'blue_compass', hall: 'relics', name: 'Blue Compass', description: 'Forge speed x1.3.', cost: [{ kind: 'material', id: 'azure_steel', qty: 2 }, { kind: 'material', id: 'rosegold', qty: 1 }], repeatFactor: 1, costGrowth: 1, bonus: { type: 'forge', value: 1.3 } },
    { id: 'mint_clock', hall: 'relics', name: 'Mint Clock', description: 'Away bonus x1.2.', cost: [{ kind: 'material', id: 'mintsilver', qty: 2 }, { kind: 'material', id: 'azure_steel', qty: 1 }], repeatFactor: 1, costGrowth: 1, bonus: { type: 'away', value: 1.2 } },
  ];
  // each craft rolls a rarity by weight; perks = how many distinct perks it gets, range = what their rolled values are multiplied by;
  // lockNew = a new copy of this rarity starts locked, so it cannot be scrapped by accident
  const RARITIES = [
    { id: 'common', name: 'Common', weight: 55, perks: 0, range: 1, lockNew: false },
    { id: 'rare', name: 'Rare', weight: 30, perks: 1, range: 1, lockNew: false },
    { id: 'epic', name: 'Epic', weight: 12, perks: 2, range: 1.5, lockNew: true },
    { id: 'mythic', name: 'Mythic', weight: 3, perks: 3, range: 2.5, lockNew: true },
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
  // adds a copy; the first copy of an artifact goes on its pedestal, later ones never replace it.
  // paid: the cost lines actually spent (default: what the next craft costs now); locked: default from the rarity's lockNew
  function addCopy(arts, id, rarity, perks, paid, locked) {
    const pay = paid || craftCost(id, arts), r = rarityById(rarity);
    if (!entry(arts, id)) arts[id] = { copies: [], active: null };
    const c = { id: nextId(arts), art: id, rarity, perks: perks || [], paid: pay.map((x) => Object.assign({}, x)), locked: locked == null ? !!(r && r.lockNew) : !!locked };
    arts[id].copies.push(c);
    if (arts[id].copies.length === 1) arts[id].active = c.id;
    return c;
  }
  // consumes exactly the cost (and the matching share of each pearl stack's stored value), rolls the copy and returns it; null = not crafted
  function craft(id, inv, arts, invV, stock, rng) {
    if (!canCraft(id, inv, arts, stock)) return null;
    const cost = craftCost(id, arts);
    for (const c of cost) {
      if (isMat(c)) { stock[c.id] -= c.qty; if (!stock[c.id]) delete stock[c.id]; continue; }
      const h = inv[c.kind];
      if (invV && invV[c.kind] != null) invV[c.kind] = h - c.qty > 0 ? invV[c.kind] * (h - c.qty) / h : 0;
      inv[c.kind] = h - c.qty;
    }
    const r = roll(rng);
    return addCopy(arts, id, r.rarity, r.perks, cost);
  }
  // what scrapping a copy gives back: floor(REFUND_SHARE x each paid line), in the same currency
  const refundOf = (c) => (c && Array.isArray(c.paid) ? c.paid : []).map((x) => Object.assign({}, x, { qty: Math.floor(+(x.qty * REFUND_SHARE).toPrecision(12)) }));
  // why a copy cannot be scrapped ('' = it can)
  function scrapBlock(arts, id, copyId) {
    const e = entry(arts, id), c = e && e.copies.find((x) => x.id === copyId);
    if (!c) return 'missing'; if (e.active === copyId) return 'pedestal'; if (c.locked) return 'locked'; return '';
  }
  // removes a shelf copy and refunds floor(REFUND_SHARE x its paid cost): pearls into inv (the backpack), materials into stock.
  // Never the copy on the pedestal, never a locked copy. Returns the refund lines (qty may be 0), or null and changes nothing.
  function scrap(arts, id, copyId, inv, stock) {
    if (scrapBlock(arts, id, copyId)) return null;
    const e = arts[id], c = e.copies.find((x) => x.id === copyId), back = refundOf(c);
    e.copies.splice(e.copies.indexOf(c), 1);
    for (const x of back) { if (!x.qty) continue; if (isMat(x)) stock[x.id] = (stock[x.id] || 0) + x.qty; else inv[x.kind] = (inv[x.kind] || 0) + x.qty; }
    return back;
  }
  function setLocked(arts, id, copyId, on) {
    const e = entry(arts, id), c = e && e.copies.find((x) => x.id === copyId);
    if (!c) return false; c.locked = !!on; return true;
  }
  // puts an owned copy on its artifact's pedestal; free, at any time
  function setActive(arts, id, copyId) {
    const e = entry(arts, id);
    if (!e || !e.copies.some((c) => c.id === copyId)) return false;
    e.active = copyId; return true;
  }
  // ---- equip slots: equipped is the saved list of equipped artifact ids (state.artEquip), in slot order ----
  const usesSlot = (id) => { const a = byId(id); return !!a && HALLS.some((h) => h.id === a.hall && h.slots); };
  const owns = (arts, id) => !!activeCopy(arts, id);
  const isEquipped = (equipped, id) => Array.isArray(equipped) && equipped.includes(id);
  // an artifact counts when it has a copy on its pedestal and, in a hall with slots, is equipped
  const applies = (a, arts, equipped) => owns(arts, a.id) && (!usesSlot(a.id) || isEquipped(equipped, a.id));
  // each returns true when it changed the list, false (and changes nothing) otherwise
  function equip(equipped, arts, id) {
    if (!usesSlot(id) || !owns(arts, id) || equipped.includes(id) || equipped.length >= EQUIP_SLOTS) return false;
    equipped.push(id); return true;
  }
  function unequip(equipped, id) { const i = equipped.indexOf(id); if (i < 0) return false; equipped.splice(i, 1); return true; }
  // puts inId in outId's slot
  function swap(equipped, arts, outId, inId) {
    const i = equipped.indexOf(outId);
    if (i < 0 || !usesSlot(inId) || !owns(arts, inId) || equipped.includes(inId)) return false;
    equipped[i] = inId; return true;
  }
  // untrusted input (a save) -> unique, known, owned slot artifacts, at most EQUIP_SLOTS, in their saved order
  function equippedFromSave(d, arts) {
    const out = [];
    for (const id of Array.isArray(d) ? d : []) if (typeof id === 'string' && out.length < EQUIP_SLOTS && !out.includes(id) && usesSlot(id) && owns(arts, id)) out.push(id);
    return out;
  }
  // every active bonus: payout as one global multiplier, typePay as one multiplier per pearl type (scoped ducks and their
  // payout perks; a missing type is x1), every other stat as an added fraction (0.25 = +25%)
  function activeBonuses(arts, equipped) {
    const b = {}; for (const s of STATS) b[s] = 0; b.payout = 1; b.typePay = {};
    for (const a of ARTIFACTS) {
      if (!applies(a, arts, equipped)) continue;
      const c = activeCopy(arts, a.id), k = a.bonus.scope, pay = (m) => { if (k) b.typePay[k] = (b.typePay[k] || 1) * m; else b.payout *= m; };
      if (a.bonus.type === 'payout') pay(a.bonus.value); else b[a.bonus.type] += a.bonus.value - 1;
      for (const p of c.perks) { if (p.stat === 'payout') pay(1 + p.value); else b[p.stat] += p.value; }
    }
    return b;
  }
  const payoutMult = (arts) => activeBonuses(arts).payout;
  // untrusted input (a save) -> valid artifacts: unknown artifacts and copies with an unknown rarity or a bad or repeated id
  // are dropped; perks keep known, distinct stats (as many as the rarity allows) with values clamped to min..cap; the active
  // copy must be an owned one, otherwise the first copy goes on the pedestal
  // paid lines from a save: each must name one of the artifact's cost lines (same kind, and id for materials), with a whole qty
  // from 0 up to the most any copy in this save could have paid; missing or bad paid falls back to the cheapest repeat price
  function paidFromSave(a, p, n) {
    const top = Math.max(1, (a.repeatFactor == null ? 1 : a.repeatFactor) * Math.pow(a.costGrowth == null ? 1 : a.costGrowth, Math.max(0, n - 1)));
    const same = (x, c) => (isMat(c) ? x.kind === 'material' && x.id === c.id : x.kind === c.kind);
    const out = [];
    for (const c of a.cost) {
      const x = Array.isArray(p) ? p.find((y) => y && typeof y === 'object' && same(y, c)) : null;
      const q = x && Number.isFinite(x.qty) ? Math.floor(x.qty) : NaN;
      const repeat = Math.ceil(+(c.qty * (a.repeatFactor == null ? 1 : a.repeatFactor)).toPrecision(12));
      out.push(Object.assign({}, c, { qty: Number.isFinite(q) ? Math.max(0, Math.min(Math.ceil(c.qty * top), q)) : repeat }));
    }
    return out;
  }
  function fromSave(d) {
    const out = {}, src = d && typeof d === 'object' && !Array.isArray(d) ? d : {}, ids = new Set();
    for (const a of ARTIFACTS) {
      const e = src[a.id]; if (!e || typeof e !== 'object' || !Array.isArray(e.copies)) continue;
      const copies = [], n = e.copies.length;
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
        ids.add(c.id); copies.push({ id: c.id, art: a.id, rarity: rar.id, perks, paid: paidFromSave(a, c.paid, n), locked: c.locked === true });
      }
      if (!copies.length) continue;
      out[a.id] = { copies, active: copies.some((c) => c.id === e.active) ? e.active : copies[0].id };
    }
    return out;
  }
  return { PINK_DUCK_PAYOUT, TYPE_DUCK_PAYOUT, TYPE_DUCKS, EQUIP_SLOTS, usesSlot, isEquipped, applies, equip, unequip, swap, equippedFromSave, REFUND_SHARE, refundOf, scrapBlock, scrap, setLocked, RELIC_HALL_NAME, HALLS, ARTIFACTS, RARITIES, PERKS, STATS, byId, rarityById, perkById, isMat, have, count, activeCopy,
    craftCost, canCraft, roll, addCopy, craft, setActive, activeBonuses, payoutMult, fromSave };
})();
if (typeof module !== 'undefined') module.exports = ARTS;
