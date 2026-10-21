'use strict';
/* ---------- Economy: pure functions, no DOM. Tested headlessly in node. ---------- */
const ECON = (() => {
  // base cost, growth per level, max level, optional requirement on current levels
  const UPG = {
    tool:   { base: 60,  grow: 6.5,  max: 5,  group: 'verb' },
    auto:   { base: 45000, grow: 1.3, max: 20, group: 'verb', req: (L) => L.coral > 0 }, // late game: opens with Coral Pearls, priced so the first helper lands 70-90% of the way to the first Fresh Batch (tools/sim32.js)
    golden: { base: 400, grow: 2.3, max: 6, group: 'marble', req: (L) => L.mint > 0 },
    marble: { base: 7000, grow: 2.4, max: 5, group: 'marble', req: (L) => L.coral > 0 && L.tool >= 3 },
    sharp:  { base: 8,   grow: 1.55, max: 99, group: 'tune' },
    lucky:  { base: 30,  grow: 1.8,  max: 8,  group: 'marble' },
    spawn:  { base: 20,  grow: 1.65, max: 12, group: 'tune' },
    combo:  { base: 16,  grow: 1.6,  max: 10, group: 'tune' },
    fuel:   { base: 90,  grow: 2.0,  max: 5,  group: 'tune' },
    tempo:  { base: 260, grow: 2.6,  max: 10, group: 'tune', req: (L) => L.auto > 0 },
    board:  { base: 600, grow: 14,   max: 2,  group: 'tune' },
    mint:   { base: 150,    grow: 2.4, max: 5, group: 'marble', req: (L) => L.lucky > 0 },
    violet: { base: 1200,   grow: 2.4, max: 5, group: 'marble', req: (L) => L.golden > 0 },
    coral:  { base: 3000,   grow: 2.4, max: 5, group: 'marble', req: (L) => L.violet > 0 },
    opal:   { base: 14000,  grow: 2.4, max: 5, group: 'marble', req: (L) => L.marble > 0 },
    ruby:   { base: 28000,  grow: 2.4, max: 5, group: 'marble', req: (L) => L.opal > 0 },
    black:  { base: 60000,  grow: 2.4, max: 5, group: 'marble', req: (L) => L.ruby > 0 },
    shiny:  { base: 400,    grow: 2.2, max: 10, group: 'tune' },
  };
  const ORDER = ['lucky', 'auto', 'sharp', 'mint', 'golden', 'violet', 'coral', 'marble', 'opal', 'ruby', 'black', 'shiny', 'spawn', 'combo', 'fuel', 'tempo', 'board'];
  // the cursor is a tool; harder pearls need more damage per hit, so they crack before they burst
  // unique: the tool's own upgrade, bought on its page in the Tools panel and active only while that tool is in hand.
  // effect(level) returns the stats it adds; base, grow and max price it like a shop upgrade. Every tool gets one later.
  const TOOLS = [
    { name: 'Steel Pin', power: 1, speed: 1, unique: { id: 'sweep', name: 'Wide Swing', desc: 'Hold and drag to hit everything in reach', base: 35, grow: 3.4, max: 5,
      effect: (lvl) => ({ sweep: true, brush: 0.045 + 0.02 * Math.max(0, lvl - 1) }) } }, // brush: fraction of half the short board side
    { name: 'Awl', power: 2, speed: 1.1 }, { name: 'Brass Mallet', power: 3, speed: 1.2 },
    { name: 'Steel Hammer', power: 6, speed: 1.4 }, { name: 'Sledgehammer', power: 10, speed: 1.6 }, { name: 'Diamond Hammer', power: 18, speed: 2 },
  ];
  // The roster. `pearl` is the base type (shown as Rose). cap = most of that type alive on the board at once.
  // `mult` here is the base payout; the live payout is base × PAYOUT_STEEPNESS^rank (Rose is rank 0), rounded to two significant figures.
  const PAYOUT_STEEPNESS = 1.5;
  const sig2 = (x) => Number(x.toPrecision(2));
  const PEARLS = [
    { id: 'pearl',  name: 'Rose Pearl',   hp: 1, mult: 1,   cap: 99 },
    { id: 'blue',   name: 'Blue Pearl',   hp: 3, mult: 5,   cap: 8 },
    { id: 'mint',   name: 'Mint Pearl',   hp: 7, mult: 12,   cap: 6 },
    { id: 'golden', name: 'Golden Pearl', hp: 15, mult: 30,  cap: 2 },
    { id: 'violet', name: 'Violet Pearl', hp: 30, mult: 70,  cap: 5 },
    { id: 'coral',  name: 'Coral Pearl',  hp: 50, mult: 150,  cap: 4 },
    { id: 'marble', name: 'Glass Marble', hp: 80, mult: 350,  cap: 3 },
    { id: 'opal',   name: 'Opal Pearl',   hp: 130, mult: 800, cap: 3 },
    { id: 'ruby',   name: 'Ruby Pearl',   hp: 200, mult: 2000, cap: 2 },
    { id: 'black',  name: 'Black Pearl',  hp: 320, mult: 5000, cap: 1 },
  ];
  PEARLS.forEach((t, i) => { t.baseMult = t.mult; t.mult = sig2(t.mult * Math.pow(PAYOUT_STEEPNESS, i)); });
  const KIND = {}; PEARLS.forEach((t) => { KIND[t.id] = { hp: t.hp, mult: t.mult }; });
  const SHINY_MULT = 5;
  // spawn weight of a type, relative to a base pearl weight of 100 (0 = locked)
  const NEW_BASE = { mint: 3, golden: 2, violet: 1.2, coral: 0.8, marble: 0.5, opal: 0.35, ruby: 0.25, black: 0.15 };
  function typeWeight(id, L) {
    if (id === 'pearl') return 100;
    if (id === 'blue') return L.lucky > 0 ? 4 + 3 * L.lucky : 0;
    return L[id] > 0 ? NEW_BASE[id] * (1 + 0.4 * (L[id] - 1)) : 0;
  }
  const isUnlocked = (id, L) => typeWeight(id, L) > 0;
  // the upgrade that unlocks (and levels) a type; the base pearl has none
  const unlockUpg = (id) => (id === 'pearl' ? null : id === 'blue' ? 'lucky' : id);
  // a type can be switched off only once the next type up has its unlock upgrade at max level; the top type is always free
  function canToggleOff(id, L) {
    const i = PEARLS.findIndex((t) => t.id === id), nx = PEARLS[i + 1];
    if (!nx) return true;
    const u = unlockUpg(nx.id);
    return L[u] >= UPG[u].max;
  }
  // chosen types plus every type that is not allowed to be off yet, in roster order
  const effectivePool = (pool, L) => PEARLS.map((t) => t.id).filter((id) => pool.includes(id) || !canToggleOff(id, L));
  // chance of each pooled, unlocked type; the others' odds are renormalized so the board always fills at the same rate
  function poolChances(pool, L, frenzy) {
    const ids = effectivePool(pool, L).filter((id) => isUnlocked(id, L));
    if (!ids.length) return { pearl: 1 };
    const w = {}; let tot = 0;
    for (const id of ids) { w[id] = typeWeight(id, L) * (frenzy && id !== 'pearl' ? 2 : 1); tot += w[id]; }
    for (const id of ids) w[id] /= tot;
    return w;
  }
  const shinyChance = (L) => 0.005 + 0.0025 * (L.shiny || 0);
  const COST_SCALE = 2.5; // global dial: how long each upgrade takes to afford
  const COLLAPSE_MIN_RUN = 5000000; // run juice needed before a Fresh Batch
  const COLLAPSE_GAIN_DIV = 1250000; // Flavors = floor(sqrt(run / this)): exactly 2 at the floor, so cycles shrink slowly

  const zeroLevels = () => { const o = {}; for (const k in UPG) o[k] = 0; return o; };
  const cost = (id, lvl) => Math.ceil(UPG[id].base * COST_SCALE * Math.pow(UPG[id].grow, lvl));
  // each tool can be upgraded on its own: power adds a step per level, pop speed adds 12% of its base per level
  const TOOL_UP_MAX = 5;
  const powerStep = (i) => Math.max(1, Math.round(TOOLS[i].power * 0.2));
  const toolPower = (i, p) => TOOLS[i].power + p * powerStep(i);
  const toolSpeed = (i, s) => TOOLS[i].speed * (1 + 0.12 * s);
  const toolUpCost = (i, kind, lvl) => Math.ceil(Math.max(400, cost('tool', i) * 0.5) * Math.pow(2.2, lvl) * (kind === 'speed' ? 0.8 : 1));
  const uniqueCost = (i, lvl) => { const u = TOOLS[i].unique; return Math.ceil(u.base * COST_SCALE * Math.pow(u.grow, lvl)); };
  const uniqueLevel = (i, up) => (TOOLS[i].unique && up ? Math.max(0, Math.min(TOOLS[i].unique.max, up.u | 0)) : 0);
  const toolPrice = (idx) => (idx <= 0 ? 0 : cost('tool', idx - 1)); // a tool in the store costs what its tier used to cost

  function stats(st) {
    const L = st.lv;
    const echoMult = 1 + 0.2 * st.echoes;
    const autoCd = 2.4 * Math.pow(0.9, L.tempo);
    const eq = (st.equip == null || st.equip < 0) ? L.tool : st.equip; // the tool in hand, not necessarily the best one owned
    const up = (st.toolUp && st.toolUp[eq]) || { p: 0, s: 0, u: 0 };
    const ul = uniqueLevel(eq, up);
    return Object.assign({
      echoMult,
      toolIdx: eq, toolName: TOOLS[eq].name, power: toolPower(eq, up.p), toolSpeed: toolSpeed(eq, up.s),
      popBase: 2 + L.sharp,
      spawnEvery: Math.max(0.14, 0.8 * Math.pow(0.9, L.spawn)),
      comboWindow: 1.1 + 0.15 * L.combo,
      sweep: false, brush: 0, // only the equipped tool's unique upgrade turns these on
      autoRate: L.auto / autoCd,
      autoCd,
      frenzyNeed: 200 - 24 * L.fuel,
      tier: L.board,
    }, ul > 0 ? TOOLS[eq].unique.effect(ul) : {});
  }

  const comboMult = (combo) => 1 + Math.min(combo, 60) * 0.02;
  function popValue(S, combo, frenzy, kind) {
    return S.popBase * S.echoMult * comboMult(combo) * (frenzy ? 2 : 1) * KIND[kind].mult;
  }
  const hitsNeeded = (kind, power) => Math.ceil(KIND[kind].hp / power);
  const collapseGain = (run) => Math.floor(Math.sqrt(run / COLLAPSE_GAIN_DIV));
  const collapseReady = (run) => run >= COLLAPSE_MIN_RUN && collapseGain(run) >= 2;
  // expected payout multiplier of one pop under the current pool chances
  const popEV = (pool, L) => { const ch = poolChances(pool, L); let ev = 0; for (const id in ch) ev += ch[id] * KIND[id].mult; return ev; };
  const idleRate = (S, pool, L) => S.autoRate * S.popBase * S.echoMult * popEV(pool, L);

  return { UPG, ORDER, TOOLS, KIND, PEARLS, PAYOUT_STEEPNESS, sig2, SHINY_MULT, COST_SCALE, typeWeight, isUnlocked, poolChances, canToggleOff, effectivePool, unlockUpg, shinyChance, COLLAPSE_MIN_RUN, COLLAPSE_GAIN_DIV, zeroLevels, cost, toolPrice, TOOL_UP_MAX, powerStep, toolPower, toolSpeed, toolUpCost, uniqueCost, uniqueLevel, stats, comboMult, popValue, hitsNeeded, collapseGain, collapseReady, popEV, idleRate };
})();
if (typeof module !== 'undefined') module.exports = ECON;

const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'];
function fmt(n) {
  if (!(n > 0)) return '0';
  if (n < 10000) return Math.floor(n).toLocaleString('en-US');
  if (!isFinite(n)) return '∞';
  let i = 0;
  while (n >= 1000 && i < SUFFIX.length - 1) { n /= 1000; i++; }
  // pick the digits from the rounded value, so 99.95K shows as 100K and 999.5K as 1.00M (not 100.0K / 1000K)
  let d = n >= 100 ? 0 : n >= 10 ? 1 : 2;
  if (+n.toFixed(d) >= [1000, 100, 10][d]) { if (d > 0) d--; else if (i < SUFFIX.length - 1) { n /= 1000; i++; d = 2; } }
  return n.toFixed(d) + SUFFIX[i];
}
// a payout multiplier: whole numbers up to 9,999 (7.5 keeps its half), then fmt without trailing zeros (14K, not 14.0K)
function fmtX(n) {
  if (n < 10000) return (Math.round(n * 10) / 10).toLocaleString('en-US');
  const s = fmt(n), m = s.match(/^([\d.]+)(\D*)$/);
  return m && m[1].includes('.') ? m[1].replace(/\.?0+$/, '') + m[2] : s;
}
function fmtV(n) { return n < 10 ? String(Math.round(n * 10) / 10) : fmt(n); }
