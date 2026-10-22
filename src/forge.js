/* ---------- Forge: pearls become crafting materials over time. Pure, no DOM; every number is data. ---------- */
// A job is { mat, start, end } in ms timestamps. end is planned at the forge's current speed (rate): when the rate
// changes (frenzy, a Forge Speed level) the remaining work is re-timed from now. Saves always store ends at the
// no-frenzy rate (toSave), so a closed or hidden page never carries frenzy, and a job is done only when now >= end:
// a clock that jumps backwards can delay a job but never finish it early.
const FORGE = (() => {
  // one material per pearl type: the quantity falls and the time doubles per roster position
  const MATERIALS = [
    { id: 'rose_dust', name: 'Rose Dust', recipe: { kind: 'pearl', qty: 100, secs: 30 } },
    { id: 'blue_dust', name: 'Blue Dust', recipe: { kind: 'blue', qty: 70, secs: 60 } },
    { id: 'mint_dust', name: 'Mint Dust', recipe: { kind: 'mint', qty: 45, secs: 120 } },
    { id: 'golden_dust', name: 'Golden Dust', recipe: { kind: 'golden', qty: 30, secs: 240 } },
    { id: 'violet_dust', name: 'Violet Dust', recipe: { kind: 'violet', qty: 20, secs: 480 } },
    { id: 'coral_dust', name: 'Coral Dust', recipe: { kind: 'coral', qty: 14, secs: 960 } },
    { id: 'marble_dust', name: 'Marble Dust', recipe: { kind: 'marble', qty: 10, secs: 1920 } },
    { id: 'opal_dust', name: 'Opal Dust', recipe: { kind: 'opal', qty: 7, secs: 3840 } },
    { id: 'ruby_dust', name: 'Ruby Dust', recipe: { kind: 'ruby', qty: 5, secs: 7680 } },
    { id: 'black_dust', name: 'Black Dust', recipe: { kind: 'black', qty: 3, secs: 15360 } }, // 4 h 16 min
  ];
  const BASE_SLOTS = 1;
  const SPEED_PER_LEVEL = 0.25; // Forge Speed: +25% per level
  const FRENZY_FACTOR = 2; // while frenzy is on and the page is open
  const STRIKE_SECS = 1, STRIKE_CAP = 5, STRIKE_WINDOW_MS = 1000; // a Strike takes 1 s off the running job, at most 5 per second
  // upgrades bought with juice and kept through Fresh Batch; cost = ceil(base * grow^level)
  const UPG = {
    speed: { name: 'Forge Speed', base: 20000, grow: 2.8, max: 10 },
    slot: { name: 'Extra Slot', base: 250000, grow: 10, max: 3 },
  };
  const byId = (id) => MATERIALS.find((m) => m.id === id) || null;
  const blank = () => ({ slots: [null], stock: {}, lv: { speed: 0, slot: 0 }, rate: 1, frenzy: false, strikes: [] });
  const slotCount = (f) => BASE_SLOTS + f.lv.slot;
  const speedFactor = (speedLv, frenzy) => (1 + SPEED_PER_LEVEL * speedLv) * (frenzy ? FRENZY_FACTOR : 1);
  const baseRate = (f) => speedFactor(f.lv.speed, false);
  // re-time every running job for a new speed; the work left (ms at rate 1) never exceeds the recipe
  function setRate(f, rate, now) {
    for (const j of f.slots) {
      if (!j || now >= j.end) continue;
      const t = Math.max(now, j.start), work = Math.min(byId(j.mat).recipe.secs * 1000, (j.end - t) * f.rate); // a clock behind the start counts from the start
      j.end = t + work / rate;
    }
    f.rate = rate;
  }
  function setFrenzy(f, on, now) { if (f.frenzy !== !!on) { f.frenzy = !!on; setRate(f, speedFactor(f.lv.speed, f.frenzy), now); } }
  function canStart(f, slot, matId, inv) {
    const m = byId(matId);
    return !!m && Number.isInteger(slot) && slot >= 0 && slot < slotCount(f) && !f.slots[slot] && ((inv && inv[m.recipe.kind]) || 0) >= m.recipe.qty;
  }
  // takes the recipe's normal pearls (and their share of stored sale value) right away
  function start(f, slot, matId, inv, now, invV) {
    if (!canStart(f, slot, matId, inv)) return false;
    const r = byId(matId).recipe, have = inv[r.kind];
    if (invV && invV[r.kind] != null) invV[r.kind] = have - r.qty > 0 ? invV[r.kind] * (have - r.qty) / have : 0;
    inv[r.kind] = have - r.qty;
    f.slots[slot] = { mat: matId, start: now, end: now + r.secs * 1000 / f.rate };
    return true;
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
    if (id === 'speed') setRate(f, speedFactor(f.lv.speed, f.frenzy), now);
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
  // untrusted input (a save) -> a valid forge at the no-frenzy rate; bad jobs are dropped, numbers clamped
  function fromSave(d) {
    const f = blank(), o = d && typeof d === 'object' && !Array.isArray(d) ? d : {}, lv = o.lv && typeof o.lv === 'object' ? o.lv : {};
    const lvl = (x, max) => { const n = Math.floor(+x); return Number.isFinite(n) && n > 0 ? Math.min(max, n) : 0; };
    f.lv.speed = lvl(lv.speed, UPG.speed.max); f.lv.slot = lvl(lv.slot, UPG.slot.max); f.rate = baseRate(f);
    const stock = o.stock && typeof o.stock === 'object' ? o.stock : {};
    for (const m of MATERIALS) { const n = lvl(stock[m.id], 1e15); if (n > 0) f.stock[m.id] = n; }
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
  return { MATERIALS, BASE_SLOTS, SPEED_PER_LEVEL, FRENZY_FACTOR, STRIKE_SECS, STRIKE_CAP, STRIKE_WINDOW_MS, UPG, byId, blank, slotCount, speedFactor, baseRate,
    setRate, setFrenzy, canStart, start, progress, secsLeft, finish, collect, strike, costText, upgCost, canBuy, buy, toSave, fromSave };
})();
if (typeof module !== 'undefined') module.exports = FORGE;
