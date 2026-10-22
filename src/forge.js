/* ---------- Forge: pearls become dusts, and dusts become alloys, over time. Pure, no DOM; every number is data. ---------- */
// A job is { mat, start, end } in ms timestamps. end is planned at the forge's current speed (rate): when the rate
// changes (frenzy, a Forge Speed level) the remaining work is re-timed from now. Saves always store ends at the
// no-frenzy rate (toSave), so a closed or hidden page never carries frenzy, and a job is done only when now >= end:
// a clock that jumps backwards can delay a job but never finish it early.
const FORGE = (() => {
  // recipe inputs: { kind: 'pearl', id, qty } takes normal pearls from the backpack, { kind: 'material', id, qty } takes from the stock
  const P = (id, qty) => ({ kind: 'pearl', id, qty }), M = (id, qty) => ({ kind: 'material', id, qty });
  // dusts: one per pearl type, made from pearls; the quantity falls and the time doubles per roster position
  const MATERIALS = [
    { id: 'rose_dust', name: 'Rose Dust', recipe: { inputs: [P('pearl', 100)], secs: 30 } },
    { id: 'blue_dust', name: 'Blue Dust', recipe: { inputs: [P('blue', 70)], secs: 60 } },
    { id: 'mint_dust', name: 'Mint Dust', recipe: { inputs: [P('mint', 45)], secs: 120 } },
    { id: 'golden_dust', name: 'Golden Dust', recipe: { inputs: [P('golden', 30)], secs: 240 } },
    { id: 'violet_dust', name: 'Violet Dust', recipe: { inputs: [P('violet', 20)], secs: 480 } },
    { id: 'coral_dust', name: 'Coral Dust', recipe: { inputs: [P('coral', 14)], secs: 960 } },
    { id: 'marble_dust', name: 'Marble Dust', recipe: { inputs: [P('marble', 10)], secs: 1920 } },
    { id: 'opal_dust', name: 'Opal Dust', recipe: { inputs: [P('opal', 7)], secs: 3840 } },
    { id: 'ruby_dust', name: 'Ruby Dust', recipe: { inputs: [P('ruby', 5)], secs: 7680 } },
    { id: 'black_dust', name: 'Black Dust', recipe: { inputs: [P('black', 3)], secs: 15360 } }, // 4 h 16 min
  ];
  // alloys: the second tier, made from dusts; relics in the Hall of Relics cost alloys. Untuned.
  const ALLOYS = [
    { id: 'rosegold', name: 'Rosegold', recipe: { inputs: [M('rose_dust', 6), M('blue_dust', 2)], secs: 120 } },
    { id: 'azure_steel', name: 'Azure Steel', recipe: { inputs: [M('blue_dust', 4), M('mint_dust', 2)], secs: 300 } },
    { id: 'mintsilver', name: 'Mintsilver', recipe: { inputs: [M('mint_dust', 4), M('golden_dust', 2)], secs: 600 } },
  ];
  const ALL = MATERIALS.concat(ALLOYS); // every stock item, dusts first
  const BASE_SLOTS = 1;
  const SPEED_PER_LEVEL = 0.25; // Forge Speed: +25% per level
  const FRENZY_FACTOR = 2; // while frenzy is on and the page is open
  const STRIKE_SECS = 1, STRIKE_CAP = 5, STRIKE_WINDOW_MS = 1000; // a Strike takes 1 s off the running job, at most 5 per second
  // upgrades bought with juice and kept through Fresh Batch; cost = ceil(base * grow^level)
  const UPG = {
    speed: { name: 'Forge Speed', base: 20000, grow: 2.8, max: 10 },
    slot: { name: 'Extra Slot', base: 250000, grow: 10, max: 3 },
  };
  const byId = (id) => ALL.find((m) => m.id === id) || null;
  const isAlloy = (id) => ALLOYS.some((m) => m.id === id);
  // bonus: the active artifacts' forge speed bonus (an added fraction), live only like rate and frenzy
  const blank = () => ({ slots: [null], stock: {}, lv: { speed: 0, slot: 0 }, rate: 1, frenzy: false, bonus: 0, strikes: [] });
  const slotCount = (f) => BASE_SLOTS + f.lv.slot;
  const speedFactor = (speedLv, frenzy, bonus) => (1 + SPEED_PER_LEVEL * speedLv) * (1 + (bonus || 0)) * (frenzy ? FRENZY_FACTOR : 1);
  const baseRate = (f) => speedFactor(f.lv.speed, false, f.bonus);
  // re-time every running job for a new speed; the work left (ms at rate 1) never exceeds the recipe
  function setRate(f, rate, now) {
    for (const j of f.slots) {
      if (!j || now >= j.end) continue;
      const t = Math.max(now, j.start), work = Math.min(byId(j.mat).recipe.secs * 1000, (j.end - t) * f.rate); // a clock behind the start counts from the start
      j.end = t + work / rate;
    }
    f.rate = rate;
  }
  function setFrenzy(f, on, now) { if (f.frenzy !== !!on) { f.frenzy = !!on; setRate(f, speedFactor(f.lv.speed, f.frenzy, f.bonus), now); } }
  // an artifact forge speed bonus came or went (a craft, a pedestal swap, a load): re-time running jobs
  function setBonus(f, bonus, now) { bonus = bonus || 0; if (f.bonus !== bonus) { f.bonus = bonus; setRate(f, speedFactor(f.lv.speed, f.frenzy, bonus), now); } }
  const haveOf = (f, inp, inv) => (inp.kind === 'material' ? f.stock[inp.id] || 0 : (inv && inv[inp.id]) || 0);
  // the first input the player is short of, with its numbers (name is set for materials; the game names pearls), or null
  function missing(f, matId, inv) {
    const m = byId(matId); if (!m) return null;
    for (const inp of m.recipe.inputs) {
      const h = haveOf(f, inp, inv);
      if (h < inp.qty) return { kind: inp.kind, id: inp.id, qty: inp.qty, have: h, short: inp.qty - h, name: inp.kind === 'material' ? byId(inp.id).name : null };
    }
    return null;
  }
  function canStart(f, slot, matId, inv) {
    return !!byId(matId) && Number.isInteger(slot) && slot >= 0 && slot < slotCount(f) && !f.slots[slot] && !missing(f, matId, inv);
  }
  // takes every input right away: normal pearls (and their share of stored sale value) from the backpack, materials from the stock
  function start(f, slot, matId, inv, now, invV) {
    if (!canStart(f, slot, matId, inv)) return false;
    const r = byId(matId).recipe;
    for (const inp of r.inputs) {
      if (inp.kind === 'material') { f.stock[inp.id] -= inp.qty; if (!f.stock[inp.id]) delete f.stock[inp.id]; continue; }
      const have = inv[inp.id];
      if (invV && invV[inp.id] != null) invV[inp.id] = have - inp.qty > 0 ? invV[inp.id] * (have - inp.qty) / have : 0;
      inv[inp.id] = have - inp.qty;
    }
    f.slots[slot] = { mat: matId, start: now, end: now + r.secs * 1000 / f.rate };
    return true;
  }
  // everything a material takes from nothing, one job after another at rate 1: { pearls: { id: n }, secs }
  function fromScratch(matId) {
    const m = byId(matId), out = { pearls: {}, secs: m.recipe.secs };
    for (const inp of m.recipe.inputs) {
      if (inp.kind === 'pearl') { out.pearls[inp.id] = (out.pearls[inp.id] || 0) + inp.qty; continue; }
      const sub = fromScratch(inp.id);
      for (const k in sub.pearls) out.pearls[k] = (out.pearls[k] || 0) + sub.pearls[k] * inp.qty;
      out.secs += sub.secs * inp.qty;
    }
    return out;
  }
  // 0..1 by work done; a clock behind the start reads 0
  function progress(f, slot, now) {
    const j = f.slots[slot]; if (!j) return 0;
    if (now >= j.end) return 1;
    const total = byId(j.mat).recipe.secs * 1000, left = Math.min(total, (j.end - now) * f.rate);
    return now < j.start ? 0 : 1 - left / total;
  }
  const secsLeft = (f, slot, now) => { const j = f.slots[slot]; return j ? Math.max(0, (j.end - now) / 1000) : 0; };
  // a done job puts one material in the stock and frees its slot; returns the material id or null
  function finish(f, slot, now) {
    const j = f.slots[slot];
    if (!j || now < j.end) return null;
    f.stock[j.mat] = (f.stock[j.mat] || 0) + 1; f.slots[slot] = null;
    return j.mat;
  }
  // finishes every done job; returns how many
  function collect(f, now) { let n = 0; for (let i = 0; i < f.slots.length; i++) if (finish(f, i, now)) n++; return n; }
  // Strike: 1 s off a running job (the first running one unless a slot is named), capped at 5 per rolling second
  function strike(f, now, slot) {
    f.strikes = (f.strikes || []).filter((t) => t > now - STRIKE_WINDOW_MS && t <= now);
    if (f.strikes.length >= STRIKE_CAP) return false;
    const i = slot == null ? f.slots.findIndex((j) => j && now < j.end) : slot, j = f.slots[i];
    if (!j || now >= j.end) return false;
    j.end = Math.max(now, j.start, j.end - STRIKE_SECS * 1000);
    f.strikes.push(now);
    return true;
  }
  // a material cost line as the player reads it: "2 of 5 Rose Dust"
  const costText = (have, need, id) => Math.floor(Math.min(have, need)).toLocaleString('en-US') + ' of ' + need.toLocaleString('en-US') + ' ' + ((byId(id) || { name: id }).name);
  const upgCost = (id, lvl) => Math.ceil(UPG[id].base * Math.pow(UPG[id].grow, lvl));
  const canBuy = (f, id, sparks) => !!UPG[id] && f.lv[id] < UPG[id].max && sparks >= upgCost(id, f.lv[id]);
  // returns the juice to take (0 = not bought); Forge Speed re-times running jobs, Extra Slot opens an empty slot
  function buy(f, id, sparks, now) {
    if (!canBuy(f, id, sparks)) return 0;
    const c = upgCost(id, f.lv[id]); f.lv[id]++;
    if (id === 'speed') setRate(f, speedFactor(f.lv.speed, f.frenzy, f.bonus), now);
    while (f.slots.length < slotCount(f)) f.slots.push(null);
    return c;
  }
  // what a save stores: ends re-timed to the no-frenzy rate, no transient fields
  function toSave(f, now) {
    const b = baseRate(f);
    const at = (j) => Math.max(now, j.start);
    const slots = f.slots.map((j) => (j ? { mat: j.mat, start: j.start, end: now >= j.end || f.rate === b ? j.end : at(j) + Math.min(byId(j.mat).recipe.secs * 1000, (j.end - at(j)) * f.rate) / b } : null));
    return { slots, stock: Object.assign({}, f.stock), lv: { speed: f.lv.speed, slot: f.lv.slot } };
  }
  // untrusted input (a save) -> a valid forge at the no-frenzy rate; bad jobs are dropped, numbers clamped.
  // bonus is the loaded artifacts' forge speed bonus: the saved ends were planned at the rate that included it
  function fromSave(d, bonus) {
    const f = blank(), o = d && typeof d === 'object' && !Array.isArray(d) ? d : {}, lv = o.lv && typeof o.lv === 'object' ? o.lv : {};
    const lvl = (x, max) => { const n = Math.floor(+x); return Number.isFinite(n) && n > 0 ? Math.min(max, n) : 0; };
    f.lv.speed = lvl(lv.speed, UPG.speed.max); f.lv.slot = lvl(lv.slot, UPG.slot.max); f.bonus = bonus || 0; f.rate = baseRate(f);
    const stock = o.stock && typeof o.stock === 'object' ? o.stock : {};
    for (const m of ALL) { const n = lvl(stock[m.id], 1e15); if (n > 0) f.stock[m.id] = n; }
    const src = Array.isArray(o.slots) ? o.slots : [];
    f.slots = [];
    for (let i = 0; i < slotCount(f); i++) {
      const j = src[i], m = j && byId(j.mat);
      const okT = (t) => typeof t === 'number' && Number.isFinite(t) && t >= 0;
      if (!m || !okT(j.start) || !okT(j.end)) { f.slots.push(null); continue; }
      f.slots.push({ mat: m.id, start: j.start, end: Math.min(Math.max(j.end, j.start), j.start + m.recipe.secs * 1000) });
    }
    return f;
  }
  return { MATERIALS, ALLOYS, ALL, BASE_SLOTS, SPEED_PER_LEVEL, FRENZY_FACTOR, STRIKE_SECS, STRIKE_CAP, STRIKE_WINDOW_MS, UPG, byId, isAlloy, blank, slotCount, speedFactor, baseRate,
    setRate, setFrenzy, setBonus, missing, canStart, start, fromScratch, progress, secsLeft, finish, collect, strike, costText, upgCost, canBuy, buy, toSave, fromSave };
})();
if (typeof module !== 'undefined') module.exports = FORGE;
