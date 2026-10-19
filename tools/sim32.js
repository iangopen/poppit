// Pacing sim: plays several Fresh Batch cycles per player profile. Seeded, so two runs print the same thing.
//   node tools/sim32.js                 baseline (the live numbers in src/econ.js)
//   node tools/sim32.js --variant=NAME  one tuning option from VARIANTS below (nothing in src/ changes)
//   node tools/sim32.js --wait=25       the player keeps playing until minute 25 even if Fresh Batch is ready sooner
//   node tools/sim32.js --compare       one summary line per variant, profile and player policy
//   node tools/sim32.js --log           also print the old per-mark pacing log for every cycle
const E = require('../src/econ.js');
const CELLS = [120, 252, 440];
const CAP = {}; E.PEARLS.forEach((p) => { CAP[p.id] = p.cap; });
const CYCLES = 6, MAX_CYCLE_MIN = 120;
const PROFILES = [['casual', 1.5, 0.3, 1], ['engaged', 2.5, 0.7, 2]]; // label, taps/s, skill, seed

// small seeded generator (mulberry32) so runs can be compared
function mulberry32(a) {
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Tuning options for docs/balance-report.md. Each overrides only the levers it names; the sim never edits src/econ.js.
// minRun may depend on Flavors (echoes); gain replaces collapseGain(run).
const logGain = (run) => Math.floor(10 * Math.log10(run / 1e5));
const VARIANTS = {
  baseline: {},
  A_floor4M: { minRun: 4e6 },
  B_logGain: { gain: logGain },
  C_scaledFloorLog: { minRun: (e) => 3e6 * Math.pow(1 + 0.2 * e, 2), gain: logGain },
  // also tried, see the report
  C_plusCost12: { minRun: (e) => 3e6 * Math.pow(1 + 0.2 * e, 2), gain: logGain, costScale: 12 },
  cost12: { costScale: 12 },
  scaledFloorOnly: { minRun: (e) => 1.2e6 * Math.pow(1 + 0.2 * e, 2) },
  moreTuneLevels: { max: { combo: 20, fuel: 8, spawn: 18, lucky: 12, sweep: 8 } },
};

// The economy the sim plays: ECON itself, with a variant's levers swapped in.
// The cost formulas are copies of src/econ.js; checkCopies() fails loudly if they drift.
function econ(v) {
  const scale = v.costScale || 6;
  const UPG = {}; for (const id in E.UPG) UPG[id] = Object.assign({}, E.UPG[id], v.max && v.max[id] != null ? { max: v.max[id] } : {});
  const cost = (id, lvl) => Math.ceil(UPG[id].base * scale * Math.pow(UPG[id].grow, lvl));
  const toolUpCost = (i, kind, lvl) => Math.ceil(Math.max(400, cost('tool', i) * 0.5) * Math.pow(2.2, lvl) * (kind === 'speed' ? 0.8 : 1));
  const toolPrice = (idx) => (idx <= 0 ? 0 : cost('tool', idx - 1));
  const collapseGain = v.gain || E.collapseGain;
  const minRun = (echoes) => (typeof v.minRun === 'function' ? v.minRun(echoes) : v.minRun || E.COLLAPSE_MIN_RUN);
  const collapseReady = (run, echoes) => run >= minRun(echoes) && collapseGain(run) >= 2;
  return Object.assign({}, E, { UPG, cost, toolUpCost, toolPrice, collapseGain, collapseReady, minRun });
}
function checkCopies() {
  const X = econ({});
  for (const id in E.UPG) for (let l = 0; l < 12; l++) if (X.cost(id, l) !== E.cost(id, l)) throw new Error('sim cost copy drifted: ' + id);
  for (let i = 0; i < E.TOOLS.length; i++) {
    if (X.toolPrice(i) !== E.toolPrice(i)) throw new Error('sim toolPrice copy drifted');
    for (let l = 0; l < E.TOOL_UP_MAX; l++) for (const k of ['power', 'speed']) if (X.toolUpCost(i, k, l) !== E.toolUpCost(i, k, l)) throw new Error('sim toolUpCost copy drifted');
  }
  for (const r of [0, 5e4, 1.2e6, 3e7]) if (X.collapseReady(r, 0) !== E.collapseReady(r)) throw new Error('sim collapseReady copy drifted');
}

// Fresh Batch, as finishCollapse/resetRun/resetTools/zeroInv in src/ui.js do it: run juice, every upgrade level
// (board included), owned tools and tool upgrades, the backpack and the board are wiped; Flavors (echoes),
// discoveries and the pool are kept. The board is then prefilled with rose pearls like prefill() in src/world.js.
function freshRun(st) {
  st.lv = E.zeroLevels(); st.owned = [true, false, false, false, false, false]; st.equip = -1; st.toolUp = {};
}

// One run from a fresh board until Fresh Batch is ready. st.echoes carries over between calls.
// A variant's waitMin makes the player keep going until that minute even when Fresh Batch is ready earlier.
function cycle(X, st, rng, tapsPerSec, skill, verbose, waitMin) {
  freshRun(st);
  let sparks = 0, runEarned = 0, t = 0, spawnT = 0, combo = 0, comboT = 99, meter = 0, frenzy = 0, tapAcc = 0, autoAcc = 0, lastMark = 0, earnedWin = 0, ready = null, satiated = 0, satiatedX = 0;
  const pearls = [], log = [], bought = [], marks = [60, 120, 300, 600, 900, 1200];
  const fill = () => CELLS[st.lv.board];
  for (let i = 0; i < Math.max(3, Math.round(fill() * 0.3)); i++) pearls.push({ kind: 'pearl', dmg: 0, hp: X.KIND.pearl.hp, sh: false });
  const bestOwned = () => { let b = 0; st.owned.forEach((o, i) => { if (o) b = i; }); return b; };
  const up = (i) => st.toolUp[i] || (st.toolUp[i] = { p: 0, s: 0 });
  const income = {}; X.PEARLS.forEach((p) => { income[p.id] = 0; });
  const maxAt = {}, top = { sparks: 0, pop: 0, rate: 0, cost: 0 };
  const win = []; // [t, gain] over the last 60 s, for income per second
  // candidates: upgrades, next tool, upgrades on the equipped tool
  const candidates = () => {
    const cands = [];
    for (const id of X.ORDER) { const u = X.UPG[id], l = st.lv[id]; if (l >= u.max || (u.req && !u.req(st.lv))) continue; cands.push({ n: id, c: X.cost(id, l), s: X.cost(id, l) * (u.group === 'verb' && l === 0 ? 0.5 : 1), f: () => st.lv[id]++ }); }
    const nx = bestOwned() + 1;
    if (nx < X.TOOLS.length) cands.push({ n: 'buy:' + X.TOOLS[nx].name, c: X.toolPrice(nx), s: X.toolPrice(nx) * 0.8, f: () => { st.owned[nx] = true; } });
    const e = bestOwned(), U = up(e);
    if (U.p < X.TOOL_UP_MAX) cands.push({ n: 'pow' + e, c: X.toolUpCost(e, 'power', U.p), s: X.toolUpCost(e, 'power', U.p), f: () => U.p++ });
    if (U.s < X.TOOL_UP_MAX) cands.push({ n: 'spd' + e, c: X.toolUpCost(e, 'speed', U.s), s: X.toolUpCost(e, 'speed', U.s), f: () => U.s++ });
    return cands;
  };
  while (!(ready != null && t >= (waitMin || 0) * 60) && t < MAX_CYCLE_MIN * 60) {
    const dt = 0.1; t += dt; comboT += dt; frenzy = Math.max(0, frenzy - dt);
    st.lv.tool = bestOwned(); st.equip = st.lv.tool;
    const S = X.stats(st);
    spawnT += dt; const every = S.spawnEvery / (frenzy > 0 ? 4 : 1);
    while (spawnT >= every) {
      spawnT -= every;
      if (pearls.length < fill()) {
        const ch = X.poolChances(X.PEARLS.map((p) => p.id), st.lv, frenzy > 0); let kind = 'pearl', r = rng();
        for (const id in ch) { r -= ch[id]; if (r < 0) { kind = id; break; } }
        if (kind !== 'pearl' && pearls.filter((p) => p.kind === kind).length >= CAP[kind]) kind = 'pearl'; // per-type cap, as trySpawn in src/world.js
        pearls.push({ kind, dmg: 0, hp: X.KIND[kind].hp, sh: rng() < X.shinyChance(st.lv) });
      }
    }
    let gain = 0;
    const hit = (p, dmg, manual, depth) => {
      const i = pearls.indexOf(p); if (i < 0) return;
      p.dmg += dmg; if (p.dmg < p.hp) return;
      pearls.splice(i, 1);
      const val = X.popValue(S, manual ? combo : 0, frenzy > 0, p.kind) * (p.sh ? X.SHINY_MULT : 1);
      gain += val; income[p.kind] += val; if (val > top.pop) top.pop = val;
      if (manual) meter += 1;
      if (S.chain > 0 && depth < 5) {
        const nb = Math.min(pearls.length, Math.round(3 * Math.min(1, pearls.length / (fill() * 0.55))));
        for (let k = 0; k < nb; k++) if (rng() < S.chain * Math.pow(0.78, depth) && pearls.length) hit(pearls[Math.floor(rng() * pearls.length)], S.power, false, depth + 1);
      }
    };
    tapAcc += dt * tapsPerSec * S.toolSpeed * (S.sweep ? 2 : 1);
    while (tapAcc >= 1 && pearls.length) {
      tapAcc -= 1; let pick;
      if (rng() < skill) { pick = pearls[0]; let bs = -1; for (const p of pearls) { const s = X.KIND[p.kind].mult / Math.ceil((p.hp - p.dmg) / S.power); if (s > bs) { bs = s; pick = p; } } }
      else pick = pearls[Math.floor(rng() * pearls.length)];
      combo = comboT < S.comboWindow ? combo + 1 : 1; comboT = 0;
      hit(pick, S.power, true, 0);
    }
    autoAcc += dt * S.autoRate;
    while (autoAcc >= 1 && pearls.length) { autoAcc -= 1; const c = pearls.filter((p) => p.hp <= S.power * 3); if (c.length) hit(c[Math.floor(rng() * c.length)], S.power, false, 0); }
    if (meter >= S.frenzyNeed && frenzy <= 0) { meter = 0; frenzy = 7; }
    sparks += gain; runEarned += gain; earnedWin += gain;
    if (gain > 0) win.push([t, gain]);
    while (win.length && win[0][0] <= t - 60) win.shift();
    const cands = candidates();
    let best = null; for (const c of cands) if (c.c <= sparks && (!best || c.s < best.s)) best = c;
    if (best) { sparks -= best.c; best.f(); if (best.n.startsWith('buy')) bought.push(best.n.slice(4) + '@' + (t / 60).toFixed(1)); }
    st.lv.tool = bestOwned();
    // nothing left to want: every upgrade still on offer is already affordable (or there is nothing left at all)
    // also without Sharp: at max 99 it always has a next level, so it alone keeps the first measure near zero
    const left = candidates(); if (left.every((c) => c.c <= sparks)) satiated += dt;
    if (left.every((c) => c.n === 'sharp' || c.c <= sparks)) satiatedX += dt;
    for (const c of left) if (c.c > top.cost) top.cost = c.c;
    for (const id in X.UPG) if (maxAt[id] == null && st.lv[id] >= X.UPG[id].max) maxAt[id] = t / 60;
    if (sparks > top.sparks) top.sparks = sparks;
    if (t >= 60) { const rate = win.reduce((a, w) => a + w[1], 0) / 60; if (rate > top.rate) top.rate = rate; }
    while (verbose && marks.length && t >= marks[0]) { const m = marks.shift(); log.push('t=' + m + 's earned=' + Math.round(runEarned) + ' avg/s=' + Math.round(earnedWin / (m - lastMark)) + ' tool=' + X.TOOLS[bestOwned()].name + ' power=' + S.power + ' ups=' + JSON.stringify(st.toolUp[bestOwned()] || {}) + ' lv=' + st.lv.sweep + '/' + st.lv.chain + '/' + st.lv.auto); earnedWin = 0; lastMark = m; }
    if (ready == null && X.collapseReady(runEarned, st.echoes)) ready = t;
  }
  const rate = win.reduce((a, w) => a + w[1], 0) / Math.min(60, t);
  const gainF = ready == null ? 0 : X.collapseGain(runEarned);
  st.echoes += gainF;
  const furthest = X.PEARLS.filter((p) => X.isUnlocked(p.id, st.lv)).pop().id;
  return { furthest, ready, minutes: ready == null ? null : t / 60, runEarned, gain: gainF, echoes: st.echoes, mult: 1 + 0.2 * st.echoes, satiated: satiated / 60, satiatedX: satiatedX / 60, maxAt, income, rate, bought, log, top };
}

function play(v, profile, verbose) {
  const [, taps, skill, seed] = profile, X = econ(v), rng = mulberry32(seed);
  const st = { lv: E.zeroLevels(), echoes: 0, owned: [], equip: -1, toolUp: {} };
  const out = [];
  for (let c = 0; c < CYCLES; c++) { const r = cycle(X, st, rng, taps, skill, verbose, v.waitMin); out.push(r); if (r.ready == null) break; }
  return out;
}

const f1 = (x) => (x == null ? '-' : x.toFixed(1));
const big = (x) => (x >= 1e6 ? (x / 1e6).toFixed(x >= 1e8 ? 0 : 1) + 'M' : x >= 1e4 ? (x / 1e3).toFixed(0) + 'K' : Math.round(x).toString());
function report(name, v, verbose) {
  console.log('# variant: ' + name + (v.waitMin ? ', player keeps going until minute ' + v.waitMin : ', Fresh Batch taken as soon as it is ready'));
  for (const p of PROFILES) {
    const rs = play(v, p, verbose), cols = rs.map((_, i) => 'C' + (i + 1));
    console.log('\n## ' + p[0] + ' (' + p[1] + ' taps/s, skill ' + p[2] + ', seed ' + p[3] + ')\n');
    console.log('| cycle | Fresh Batch ready (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl |');
    console.log('|---|---|---|---|---|---|---|---|---|---|---|');
    rs.forEach((r, i) => console.log('| ' + (i + 1) + ' | ' + (r.ready == null ? 'not by ' + MAX_CYCLE_MIN : f1(r.ready / 60)) + ' | ' + f1(r.minutes) + ' | ' + big(r.runEarned) + ' | +' + r.gain + ' | ' + r.echoes + ' | ' + r.mult.toFixed(1) + ' | ' + f1(r.satiated) + ' | ' + f1(r.satiatedX) + ' | ' + big(r.rate) + ' | ' + r.furthest + ' |'));
    console.log('\nMinute each upgrade reaches max level (- = not maxed before Fresh Batch):\n');
    console.log('| upgrade (max) | ' + cols.join(' | ') + ' |'); console.log('|---|' + cols.map(() => '---|').join(''));
    for (const id of ['tool'].concat(E.ORDER)) console.log('| ' + id + ' (' + econ(v).UPG[id].max + ') | ' + rs.map((r) => f1(r.maxAt[id])).join(' | ') + ' |');
    console.log('\nShare of cycle income by pearl type (%):\n');
    console.log('| pearl | ' + cols.join(' | ') + ' |'); console.log('|---|' + cols.map(() => '---|').join(''));
    for (const t of E.PEARLS) console.log('| ' + t.id + ' | ' + rs.map((r) => (100 * r.income[t.id] / Math.max(1, r.runEarned)).toFixed(1)).join(' | ') + ' |');
    console.log('\nTools bought: ' + rs.map((r, i) => 'C' + (i + 1) + ' ' + r.bought.join(', ')).join(' / '));
    const top = rs.reduce((a, r) => ({ sparks: Math.max(a.sparks, r.top.sparks), pop: Math.max(a.pop, r.top.pop), rate: Math.max(a.rate, r.top.rate), cost: Math.max(a.cost, r.top.cost), run: Math.max(a.run, r.runEarned) }), { sparks: 0, pop: 0, rate: 0, cost: 0, run: 0 });
    console.log('Largest values (whole cycles, all ' + rs.length + '): juice held ' + top.sparks.toFixed(0) + ', run juice ' + top.run.toFixed(0) + ', single pop ' + top.pop.toFixed(0) + ', income/s ' + top.rate.toFixed(0) + ', cost on offer ' + top.cost);
    if (verbose) rs.forEach((r, i) => { console.log('\ncycle ' + (i + 1) + ' log:'); r.log.forEach((l) => console.log(l)); });
  }
}
function compare() {
  console.log('| variant | profile | taken min C1..C6 | Flavors total | payout x | upgrades maxed in C1 | nothing-to-want ignoring Sharp, min C1..C6 | furthest pearl C1..C6 |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const name in VARIANTS) for (const w of [0, 25]) for (const p of PROFILES) {
    const rs = play(Object.assign({}, VARIANTS[name], w ? { waitMin: w } : {}), p), last = rs[rs.length - 1], U = econ(VARIANTS[name]).UPG;
    const maxed = Object.keys(U).filter((id) => rs[0].maxAt[id] != null).length;
    console.log('| ' + name + (w ? ' +plays ' + w + ' min' : '') + ' | ' + p[0] + ' | ' + rs.map((r) => (r.ready == null ? '>' + MAX_CYCLE_MIN : f1(r.minutes))).join(' / ') + ' | ' + last.echoes + ' | ' + last.mult.toFixed(1) + ' | ' + maxed + ' of ' + Object.keys(U).length + ' | ' + rs.map((r) => f1(r.satiatedX)).join(' / ') + ' | ' + rs.map((r) => r.furthest).join(' / ') + ' |');
  }
}

checkCopies();
const args = process.argv.slice(2), arg = (k) => { const a = args.find((x) => x.startsWith('--' + k)); return a ? (a.split('=')[1] || true) : null; };
if (arg('compare')) compare();
else { const name = arg('variant') || 'baseline'; if (!VARIANTS[name]) { console.error('unknown variant ' + name + '; have: ' + Object.keys(VARIANTS).join(', ')); process.exit(1); } report(name, Object.assign({}, VARIANTS[name], arg('wait') ? { waitMin: +arg('wait') } : {}), !!arg('log')); }
