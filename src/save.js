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
const SAVE_VERSION = 2;
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
