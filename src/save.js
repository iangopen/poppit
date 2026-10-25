/* ---------- Save codes and save versions: pure functions, no DOM. ---------- */
// A save code is POPPIT2: + base64 of the UTF-8 JSON + '.' + 8 hex digits of FNV-1a over the base64 text.
// Whitespace is ignored, so a code that wrapped across lines still loads; anything else that is off returns null.
const SAVE_PREFIX = 'POPPIT2:';
function saveHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function encodeSave(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const body = btoa(bin);
  return SAVE_PREFIX + body + '.' + saveHash(body);
}
function decodeSave(text) {
  if (typeof text !== 'string') return null;
  const s = text.replace(/\s+/g, '');
  if (!s.startsWith(SAVE_PREFIX)) return null;
  const m = /^([A-Za-z0-9+/]+={0,2})\.([0-9a-f]{8})$/.exec(s.slice(SAVE_PREFIX.length));
  if (!m || saveHash(m[1]) !== m[2]) return null;
  try {
    const bin = atob(m[1]), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const d = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return d && typeof d === 'object' && !Array.isArray(d) ? d : null;
  } catch (e) { return null; }
}

// Save versions. serialize() writes SAVE_VERSION; MIGRATIONS[n] turns a version n save into version n + 1, and they run
// in order, so an old save passes through every step. A save without a version is version 1. Never edit a shipped
// migration: add a new SAVE_VERSION and a new step instead.
const SAVE_VERSION = 10;
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const MIGRATIONS = {
  // v1 had no pool, collection or shiny toggle, and always had blue pearls (blue is now the first unlock)
  1: (d) => {
    const lv = Object.assign({}, isObj(d.lv) ? d.lv : {}), seen = isObj(d.seen) ? d.seen : {};
    const lvl = (k) => Math.max(0, Math.min(ECON.UPG[k].max, lv[k] | 0));
    if (lvl('lucky') < 1) lv.lucky = 1;
    const L = {}; for (const k in ECON.UPG) L[k] = lvl(k);
    const col = {};
    for (const t of ECON.PEARLS) col[t.id] = { found: t.id === 'pearl' || ECON.isUnlocked(t.id, L) || !!seen[t.id], popped: 0, sFound: false, sPopped: 0 };
    const pool = ECON.PEARLS.map((t) => t.id).filter((k) => col[k].found); // locked types are ignored by poolChances, so a re-buy after a Fresh Batch spawns them again
    return Object.assign({}, d, { version: 2, lv, col, pool, shinyOn: true });
  },
  // v2 had Chain Reaction and Wide Swing in the shop. Chain is gone: refund what its levels cost. Wide Swing is now the
  // Steel Pin's unique upgrade: its level moves to toolUp[0].u. The prices are frozen here as they were when v2 shipped
  // (chain base 110, grow 2.5, max 8, COST_SCALE 6), so later economy changes never alter this refund.
  2: (d) => {
    const lv = Object.assign({}, isObj(d.lv) ? d.lv : {}), toolUp = Object.assign({}, isObj(d.toolUp) ? d.toolUp : {});
    const chain = Math.max(0, Math.min(8, lv.chain | 0)), sweep = Math.max(0, Math.min(5, lv.sweep | 0));
    let refund = 0; for (let l = 0; l < chain; l++) refund += Math.ceil(110 * 6 * Math.pow(2.5, l));
    const n = +d.sparks, sparks = (Number.isFinite(n) && n > 0 ? n : 0) + refund;
    if (sweep > 0 || isObj(toolUp[0])) toolUp[0] = Object.assign({}, isObj(toolUp[0]) ? toolUp[0] : { p: 0, s: 0 }, { u: sweep });
    delete lv.chain; delete lv.sweep;
    return Object.assign({}, d, { version: 3, lv, toolUp, sparks });
  },
  // v3 had no artifacts and no Keep: none owned, nothing kept
  3: (d) => Object.assign({}, d, { version: 4, artifacts: isObj(d.artifacts) ? d.artifacts : {}, keep: isObj(d.keep) ? d.keep : {} }),
  // v4 had no forge: one empty slot, no materials, no forge upgrades
  4: (d) => Object.assign({}, d, { version: 5, forge: isObj(d.forge) ? d.forge : { slots: [null], stock: {}, lv: { speed: 0, slot: 0 } } }),
  // v5 artifacts were id: true. Now each is a list of copies with one on its pedestal: an owned artifact becomes one
  // Common copy with no perks, active, so it pays exactly as before. Copy ids count from 1 in the order the ids appear.
  5: (d) => {
    const src = isObj(d.artifacts) ? d.artifacts : {}, artifacts = {}; let n = 0;
    for (const k of Object.keys(src)) if (src[k] === true) { n++; artifacts[k] = { copies: [{ id: n, art: k, rarity: 'common', perks: [] }], active: n }; }
    return Object.assign({}, d, { version: 6, artifacts });
  },
  // v6 copies had no paid cost and no lock. Each copy gets what it would have cost: an artifact's repeat-craft price, except
  // a Pink Duck's first copy (its lowest id), which paid the first-craft price. The prices are frozen here as they were on
  // 2026-10-22, so a later change to the tables never changes this step. Epic and Mythic copies start locked, like new ones.
  6: (d) => {
    const FIRST = { pink_duck: [{ kind: 'pearl', qty: 10000 }] };
    const REPEAT = {
      pink_duck: [{ kind: 'pearl', qty: 2500 }],
      rose_lantern: [{ kind: 'material', id: 'rosegold', qty: 2 }],
      blue_compass: [{ kind: 'material', id: 'azure_steel', qty: 2 }, { kind: 'material', id: 'rosegold', qty: 1 }],
      mint_clock: [{ kind: 'material', id: 'mintsilver', qty: 2 }, { kind: 'material', id: 'azure_steel', qty: 1 }],
    };
    const src = isObj(d.artifacts) ? d.artifacts : {}, artifacts = {};
    for (const k of Object.keys(src)) {
      const e = src[k];
      if (!isObj(e) || !Array.isArray(e.copies) || !REPEAT[k]) { artifacts[k] = e; continue; }
      const ids = e.copies.filter((c) => isObj(c) && Number.isInteger(c.id)).map((c) => c.id), first = ids.length ? Math.min(...ids) : null;
      const copies = e.copies.map((c) => (isObj(c) ? Object.assign({}, c, {
        paid: ((FIRST[k] && c.id === first) ? FIRST[k] : REPEAT[k]).map((x) => Object.assign({}, x)),
        locked: c.rarity === 'epic' || c.rarity === 'mythic',
      }) : c));
      artifacts[k] = Object.assign({}, e, { copies });
    }
    return Object.assign({}, d, { version: 7, artifacts });
  },
  // v7 had no equip slots: every relic worked once owned. Now relics work only while equipped, so every relic the save owns
  // (one with at least one copy) is equipped, in the Hall of Relics order, up to the 5 slots. Frozen here as of 2026-10-23.
  7: (d) => {
    const RELICS = ['rose_lantern', 'blue_compass', 'mint_clock'], SLOTS = 5, src = isObj(d.artifacts) ? d.artifacts : {};
    const artEquip = RELICS.filter((k) => isObj(src[k]) && Array.isArray(src[k].copies) && src[k].copies.length > 0).slice(0, SLOTS);
    return Object.assign({}, d, { version: 8, artEquip });
  },
  // v8 had no stats object: every new counter starts at zero. The run in progress is not timed (runSecs -1), so a run that began
  // before this version can never count as the fastest Fresh Batch. Reduce effects is absent, so it takes the browser's default.
  8: (d) => Object.assign({}, d, { version: 9, stats: { taps: 0, secs: 0, runSecs: -1, bestPop: 0, bestCombo: 0, bestGain: 0, fastest: 0 } }),
  // v9 earned Flavors from one run's juice (rule A). Rule C owes floor(sqrt(flavorJuice / 1.25M)) for all the juice so far, so the
  // flavor juice starts at max(lifetime, 1.25M x Flavors^2): every Flavor held stays owed, and the next Fresh Batch is the same step
  // a player at that count faces. 1.25M is COLLAPSE_GAIN_DIV, frozen here as of 2026-10-24. Bad numbers count as 0 (loadState clamps).
  9: (d) => {
    const num = (x) => { const n = +x; return Number.isFinite(n) && n > 0 ? n : 0; };
    const e = Math.floor(num(d.echoes));
    return Object.assign({}, d, { version: 10, flavorJuice: Math.max(num(d.lifetime), 1250000 * e * e) });
  },
};
// { save } ready for loadState, or { error: 'invalid' | 'newer', version }
function migrateSave(d) {
  if (!isObj(d)) return { error: 'invalid' };
  let v = d.version == null ? 1 : +d.version;
  if (!Number.isInteger(v) || v < 1) return { error: 'invalid' };
  if (v > SAVE_VERSION) return { error: 'newer', version: v };
  for (; v < SAVE_VERSION; v++) d = MIGRATIONS[v](d);
  return { save: d };
}
