// Pacing sim: plays several Fresh Batch cycles per player profile. Seeded, so two runs print the same thing.
//   node tools/sim32.js                 baseline (the live numbers in src/econ.js)
//   node tools/sim32.js --variant=NAME  one tuning option from VARIANTS below (nothing in src/ changes)
//   node tools/sim32.js --wait=25       the player keeps playing until minute 25 even if Fresh Batch is ready sooner
//   node tools/sim32.js --compare       one summary line per variant, profile and player policy
//   node tools/sim32.js --duck          the player owns a plain Pink Duck (Common, x1.4) from the start (no ducks by default)
//   node tools/sim32.js --duck=best     the best-case duck instead: a Mythic copy with a top payout perk (+15%), x1.61
//   node tools/sim32.js --log           also print the old per-mark pacing log for every cycle
const E = require('../src/econ.js'), A = require('../src/artifacts.js');
const CELLS = [120, 252, 440];
const CAP = {}; E.PEARLS.forEach((p) => { CAP[p.id] = p.cap; });
const CYCLES = 6, MAX_CYCLE_MIN = 120;
const PROFILES = [['casual', 1.5, 0.3, 1], ['engaged', 2.5, 0.7, 2]]; // label, taps/s, skill, seed

// small seeded generator (mulberry32) so runs can be compared
function mulberry32(a) {
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Tuning options for docs/balance-report.md. Each overrides only the levers it names; the sim never edits src/econ.js.
// minRun may depend on Flavors (echoes); gain replaces collapseGain(run); base and max override an upgrade's base cost or max level;
// flavorBonus replaces FLAVOR_BONUS (what each Flavor adds to every payout); artifacts lists artifact ids owned from the start;
// newBase overrides first-level spawn weights in NEW_BASE (set on ECON's own table for the run, then restored).
const VARIANTS = {
  baseline: {},
  oldDials: { flavorBonus: 0.2, base: { black: 60000 }, newBase: { black: 0.15 } }, // the dials before 2026-10-22, for before / after
  scaledFloor: { minRun: (e) => E.COLLAPSE_MIN_RUN * (1 + E.FLAVOR_BONUS * e) }, // the floor rises with the Flavor payout multiplier
  moreFlavors: { gain: (run) => Math.floor(Math.sqrt(run / 312500)) }, // 4 Flavors at the floor instead of 2
  moreTuneLevels: { max: { combo: 20, fuel: 8, spawn: 18, lucky: 12 } },
  flavor20: { flavorBonus: 0.2 }, // each Flavor adds 20% (the old value) instead of 10%
  flavor5: { flavorBonus: 0.05 },
  pinkDuck: { duck: 'plain' }, // same as --duck
  pinkDuckBest: { duck: 'best' }, // same as --duck=best
};
// the duck the duck flags give: plain is one Common copy (x1.4); best is a Mythic copy whose payout perk is at its top roll (x1.61).
// Only payout is modelled: a real Mythic also carries two other perks.
const DUCKS = { plain: { rarity: 'common', perks: [] }, best: { rarity: 'mythic', perks: [{ stat: 'payout', value: 0.15 }] } };

// The economy the sim plays: ECON itself, with a variant's levers swapped in.
// The cost formulas are copies of src/econ.js; checkCopies() fails loudly if they drift.
function econ(v) {
  const scale = v.costScale || E.COST_SCALE;
  const UPG = {}; for (const id in E.UPG) UPG[id] = Object.assign({}, E.UPG[id], v.max && v.max[id] != null ? { max: v.max[id] } : {}, v.base && v.base[id] != null ? { base: v.base[id] } : {});
  const cost = (id, lvl) => Math.ceil(UPG[id].base * scale * Math.pow(UPG[id].grow, lvl));
  const toolUpCost = (i, kind, lvl) => Math.ceil(Math.max(400, cost('tool', i) * 0.5) * Math.pow(2.2, lvl) * (kind === 'speed' ? 0.8 : 1));
  const toolPrice = (idx) => (idx <= 0 ? 0 : cost('tool', idx - 1));
  const uniqueCost = (i, lvl) => { const u = E.TOOLS[i].unique; return Math.ceil(u.base * scale * Math.pow(u.grow, lvl)); };
  const collapseGain = v.gain || E.collapseGain;
  const minRun = (echoes) => (typeof v.minRun === 'function' ? v.minRun(echoes) : v.minRun || E.COLLAPSE_MIN_RUN);
  const collapseReady = (run, echoes) => run >= minRun(echoes) && collapseGain(run) >= 2;
  const FLAVOR_BONUS = v.flavorBonus != null ? v.flavorBonus : E.FLAVOR_BONUS;
  const stats = (st) => Object.assign(E.stats(st), { echoMult: 1 + FLAVOR_BONUS * st.echoes });
  return Object.assign({}, E, { UPG, cost, toolUpCost, toolPrice, uniqueCost, collapseGain, collapseReady, minRun, FLAVOR_BONUS, stats });
}
function checkCopies() {
  const X = econ({});
  for (const id in E.UPG) for (let l = 0; l < 12; l++) if (X.cost(id, l) !== E.cost(id, l)) throw new Error('sim cost copy drifted: ' + id);
  for (let i = 0; i < E.TOOLS.length; i++) {
    if (X.toolPrice(i) !== E.toolPrice(i)) throw new Error('sim toolPrice copy drifted');
    if (E.TOOLS[i].unique) for (let l = 0; l < E.TOOLS[i].unique.max; l++) if (X.uniqueCost(i, l) !== E.uniqueCost(i, l)) throw new Error('sim uniqueCost copy drifted');
    for (let l = 0; l < E.TOOL_UP_MAX; l++) for (const k of ['power', 'speed']) if (X.toolUpCost(i, k, l) !== E.toolUpCost(i, k, l)) throw new Error('sim toolUpCost copy drifted');
  }
  for (const r of [0, 5e4, 1.2e6, 3e7]) if (X.collapseReady(r, 0) !== E.collapseReady(r)) throw new Error('sim collapseReady copy drifted');
  const st = { lv: E.zeroLevels(), echoes: 7, equip: -1, toolUp: {} }; if (X.stats(st).echoMult !== E.stats(st).echoMult) throw new Error('sim echoMult copy drifted');
}

// Fresh Batch, as finishCollapse/resetRun/resetTools/zeroInv in src/ui.js do it: run juice, every upgrade level
// (board included), owned tools and tool upgrades, the backpack and the board are wiped; Flavors (echoes),
// discoveries and the pool are kept. The board is then prefilled with rose pearls like prefill() in src/world.js.
function freshRun(st) {
  st.lv = E.zeroLevels(); st.owned = [true, false, false, false, false, false]; st.equip = -1; st.toolUp = {};
}

// One hour of helpers alone on a copy of the board, nobody tapping: stepAuto and trySpawn from src/world.js.
// Helpers take the best payout per remaining hit among pearls they can break in three hits (ECON.helperScore),
// a hit lands 0.22 s after the pearl is claimed, cracks heal after 2.2 s without a hit, a helper pop adds HELPER_METER
// to the frenzy meter. Returns the juice earned. Its own seed, so it never moves the main run's random stream.
function helperHour(X, st, board, cells, seed) {
  const rng = mulberry32(seed), S = X.stats(st), ids = X.PEARLS.map((p) => p.id), dt = 0.05;
  const pearls = board.map((p) => ({ kind: p.kind, dmg: 0, hp: p.hp, sh: p.sh, last: -9, claimed: false })), ghosts = [];
  let t = 0, spawnT = 0, acc = 0, meter = 0, frenzy = 0, juice = 0;
  while (t < 3600) {
    t += dt; frenzy = Math.max(0, frenzy - dt);
    const every = S.spawnEvery / (frenzy > 0 ? 4 : 1); spawnT += dt;
    while (spawnT >= every) {
      spawnT -= every;
      if (pearls.length >= cells) continue;
      const ch = X.poolChances(ids, st.lv, frenzy > 0); let kind = 'pearl', r = rng();
      for (const id in ch) { r -= ch[id]; if (r < 0) { kind = id; break; } }
      if (kind !== 'pearl' && pearls.filter((p) => p.kind === kind).length >= CAP[kind]) kind = 'pearl';
      pearls.push({ kind, dmg: 0, hp: X.KIND[kind].hp, sh: rng() < X.shinyChance(st.lv, S.shinyBonus), last: -9, claimed: false });
    }
    for (const p of pearls) if (p.dmg > 0 && t - p.last > 2.2) p.dmg = Math.max(0, p.dmg - dt * 1.1);
    acc += dt * S.autoRate;
    while (acc >= 1) {
      acc -= 1; let best = null, bs = -1;
      for (const p of pearls) { if (p.claimed || !X.helperCanHit(p.kind, S.power)) continue; const sc = X.helperScore(p.kind, p.hp - p.dmg, S.power) + rng() * 0.2; if (sc > bs) { bs = sc; best = p; } }
      if (best) { best.claimed = true; ghosts.push({ p: best, t: 0 }); }
    }
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i]; g.t += dt; if (g.t < 0.22) continue;
      ghosts.splice(i, 1); const p = g.p; p.claimed = false; p.dmg += S.power; p.last = t;
      if (p.dmg < p.hp) continue;
      pearls.splice(pearls.indexOf(p), 1);
      juice += X.popValue(S, 0, frenzy > 0, p.kind) * (p.sh ? X.SHINY_MULT : 1);
      meter += X.HELPER_METER * S.meterMult; if (meter >= S.frenzyNeed && frenzy <= 0) { meter = 0; frenzy = S.frenzySecs; }
    }
  }
  return juice;
}

// one helper hour is noisy (a few rare pops swing it), so checkpoints average four seeded hours
const helperHours = (X, st, board, cells, seed) => [0, 1, 2, 3].reduce((a, k) => a + helperHour(X, st, board, cells, seed + 100 * k), 0) / 4;

// One run from a fresh board until Fresh Batch is ready. st.echoes carries over between calls.
// A variant's waitMin makes the player keep going until that minute even when Fresh Batch is ready earlier.
function cycle(X, st, rng, tapsPerSec, skill, verbose, waitMin, measure) {
  freshRun(st);
  let sparks = 0, runEarned = 0, t = 0, spawnT = 0, combo = 0, comboT = 99, meter = 0, frenzy = 0, tapAcc = 0, autoAcc = 0, lastMark = 0, earnedWin = 0, ready = null, satiated = 0, satiatedX = 0, helperAt = null, awayHelper = 0, awayReady = 0, idleHelper = null, idleReady = null;
  // Rose collection for the Pink Duck: normal Rose pops and their juice over the last 60 s (the sim cannot keep pearls)
  const roseWin = [], roseSnap = () => { const w = roseWin.filter((r) => r[0] > t - 60), juice = win.reduce((a, x) => a + x[1], 0), n = w.length, rj = w.reduce((a, r) => a + r[1], 0);
    return { perMin: n * 60 / Math.min(60, t), juiceEach: n ? rj / n : 0, share: juice > 0 ? rj / juice : 0 }; };
  let roseHelper = null, roseReady = null;
  const black = { at: null, spawnsAfter: 0, expected: 0, spawned: 0, capped: 0, byTap: 0, byHelper: 0, hitsAtUnlock: null, hitsAtEnd: null, powerAtEnd: null };
  const pearls = [], log = [], bought = [], marks = [60, 120, 300, 600, 900, 1200];
  const fill = () => CELLS[st.lv.board];
  for (let i = 0; i < Math.max(3, Math.round(fill() * 0.3)); i++) pearls.push({ kind: 'pearl', dmg: 0, hp: X.KIND.pearl.hp, sh: false });
  const bestOwned = () => { let b = 0; st.owned.forEach((o, i) => { if (o) b = i; }); return b; };
  const up = (i) => st.toolUp[i] || (st.toolUp[i] = { p: 0, s: 0, u: 0 });
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
    const un = X.TOOLS[e].unique; // the held tool's own upgrade (Wide Swing on the Steel Pin), weighted like the shop upgrade it replaced
    if (un && U.u < un.max) cands.push({ n: 'uniq' + e, c: X.uniqueCost(e, U.u), s: X.uniqueCost(e, U.u), f: () => U.u++ });
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
        if (black.at != null) { black.spawnsAfter++; black.expected += ch.black || 0; }
        if (kind !== 'pearl' && pearls.filter((p) => p.kind === kind).length >= CAP[kind]) { if (kind === 'black') black.capped++; kind = 'pearl'; } // per-type cap, as trySpawn in src/world.js
        if (kind === 'black') black.spawned++;
        pearls.push({ kind, dmg: 0, hp: X.KIND[kind].hp, sh: rng() < X.shinyChance(st.lv, S.shinyBonus) });
      }
    }
    let gain = 0;
    const hit = (p, dmg, manual) => {
      const i = pearls.indexOf(p); if (i < 0) return;
      p.dmg += dmg; if (p.dmg < p.hp) return;
      pearls.splice(i, 1);
      const val = X.popValue(S, manual ? combo : 0, frenzy > 0, p.kind) * (p.sh ? X.SHINY_MULT : 1);
      gain += val; income[p.kind] += val; if (val > top.pop) top.pop = val;
      if (p.kind === 'black') black[manual ? 'byTap' : 'byHelper']++;
      if (p.kind === 'pearl' && !p.sh) roseWin.push([t, val]);
      if (manual) meter += S.meterMult;
    };
    tapAcc += dt * tapsPerSec * S.toolSpeed * (S.sweep ? 2 : 1);
    while (tapAcc >= 1 && pearls.length) {
      tapAcc -= 1; let pick;
      if (rng() < skill) { pick = pearls[0]; let bs = -1; for (const p of pearls) { const s = X.KIND[p.kind].mult / Math.ceil((p.hp - p.dmg) / S.power); if (s > bs) { bs = s; pick = p; } } }
      else pick = pearls[Math.floor(rng() * pearls.length)];
      combo = comboT < S.comboWindow ? combo + 1 : 1; comboT = 0;
      hit(pick, S.power, true);
    }
    autoAcc += dt * S.autoRate;
    while (autoAcc >= 1 && pearls.length) { autoAcc -= 1; const c = pearls.filter((p) => p.hp <= S.power * 3); if (c.length) hit(c[Math.floor(rng() * c.length)], S.power, false); }
    if (meter >= S.frenzyNeed && frenzy <= 0) { meter = 0; frenzy = S.frenzySecs; }
    sparks += gain; runEarned += gain; earnedWin += gain;
    if (gain > 0) win.push([t, gain]);
    while (win.length && win[0][0] <= t - 60) win.shift();
    while (roseWin.length && roseWin[0][0] <= t - 60) roseWin.shift();
    const cands = candidates();
    let best = null; for (const c of cands) if (c.c <= sparks && (!best || c.s < best.s)) best = c;
    if (best) { sparks -= best.c; best.f(); if (best.n.startsWith('buy')) bought.push(best.n.slice(4) + '@' + (t / 60).toFixed(1)); }
    st.lv.tool = bestOwned();
    // nothing left to want: every upgrade still on offer is already affordable (or there is nothing left at all)
    // also without Sharp: at max 99 it always has a next level, so it alone keeps the first measure near zero
    const left = candidates(); if (left.every((c) => c.c <= sparks)) satiated += dt;
    if (left.every((c) => c.n === 'sharp' || c.c <= sparks)) satiatedX += dt;
    for (const c of left) if (c.c > top.cost) top.cost = c.c;
    // awayBonus() in src/ui.js for a 1 hour absence: idle rate at the pool's expected payout, times AWAY_SHARE (half)
    const away1h = () => X.idleRate(X.stats(st), X.PEARLS.map((p) => p.id), st.lv) * 3600 * X.stats(st).awayShare;
    if (helperAt == null && st.lv.auto > 0) { helperAt = t / 60; awayHelper = away1h(); roseHelper = roseSnap(); if (measure) idleHelper = helperHours(X, st, pearls, fill(), measure); }
    if (black.at == null && st.lv.black > 0) { black.at = t / 60; black.hitsAtUnlock = X.hitsNeeded('black', X.stats(st).power); }
    for (const id in X.UPG) if (maxAt[id] == null && st.lv[id] >= X.UPG[id].max) maxAt[id] = t / 60;
    if (sparks > top.sparks) top.sparks = sparks;
    if (t >= 60) { const rate = win.reduce((a, w) => a + w[1], 0) / 60; if (rate > top.rate) top.rate = rate; }
    while (verbose && marks.length && t >= marks[0]) { const m = marks.shift(); log.push('t=' + m + 's earned=' + Math.round(runEarned) + ' avg/s=' + Math.round(earnedWin / (m - lastMark)) + ' tool=' + X.TOOLS[bestOwned()].name + ' power=' + S.power + ' ups=' + JSON.stringify(st.toolUp[bestOwned()] || {}) + ' swing=' + ((st.toolUp[0] || {}).u | 0) + ' helpers=' + st.lv.auto); earnedWin = 0; lastMark = m; }
    if (ready == null && X.collapseReady(runEarned, st.echoes)) { ready = t; awayReady = away1h(); roseReady = roseSnap(); if (measure) idleReady = helperHours(X, st, pearls, fill(), measure + 1); }
  }
  const rate = win.reduce((a, w) => a + w[1], 0) / Math.min(60, t);
  const gainF = ready == null ? 0 : X.collapseGain(runEarned);
  st.echoes += gainF;
  const furthest = X.PEARLS.filter((p) => X.isUnlocked(p.id, st.lv)).pop().id;
  black.powerAtEnd = X.stats(st).power; black.hitsAtEnd = X.hitsNeeded('black', black.powerAtEnd);
  return { furthest, helperAt, roseHelper, roseReady, awayHelper, awayReady, idleHelper, idleReady, black, ready, minutes: ready == null ? null : t / 60, runEarned, gain: gainF, echoes: st.echoes, mult: (1 + X.FLAVOR_BONUS * st.echoes) * X.stats(st).artMult, satiated: satiated / 60, satiatedX: satiatedX / 60, maxAt, income, rate, bought, log, top };
}

function play(v, profile, verbose, measure) {
  const nb = Object.assign({}, E.NEW_BASE); Object.assign(E.NEW_BASE, v.newBase || {});
  try { return playRun(v, profile, verbose, measure); } finally { Object.assign(E.NEW_BASE, nb); }
}
function playRun(v, profile, verbose, measure) {
  const [, taps, skill, seed] = profile, X = econ(v), rng = mulberry32(seed);
  const st = { lv: E.zeroLevels(), echoes: 0, owned: [], equip: -1, toolUp: {}, artifacts: {} };
  for (const id of v.artifacts || []) A.addCopy(st.artifacts, id, 'common', []); // one Common copy on its pedestal; artifacts are never wiped by Fresh Batch
  if (v.duck) A.addCopy(st.artifacts, 'pink_duck', DUCKS[v.duck].rarity, DUCKS[v.duck].perks);
  const out = [];
  for (let c = 0; c < CYCLES; c++) { const r = cycle(X, st, rng, taps, skill, verbose, v.waitMin, measure ? 1000 * seed + 10 * c : 0); out.push(r); if (r.ready == null) break; }
  return out;
}

const f1 = (x) => (x == null ? '-' : x.toFixed(1));
const big = (x) => (x >= 1e6 ? (x / 1e6).toFixed(x >= 1e8 ? 0 : 1) + 'M' : x >= 1e4 ? (x / 1e3).toFixed(0) + 'K' : Math.round(x).toString());
function report(name, v, verbose) {
  console.log('# variant: ' + name + (v.artifacts && v.artifacts.length ? ', owns ' + v.artifacts.join(', ') : '') + (v.duck ? ', owns a ' + v.duck + ' Pink Duck (x' + +A.payoutMult({ pink_duck: { copies: [Object.assign({ id: 1 }, DUCKS[v.duck])], active: 1 } }).toFixed(3) + ')' : '') + (v.waitMin ? ', player keeps going until minute ' + v.waitMin : ', Fresh Batch taken as soon as it is ready'));
  for (const p of PROFILES) {
    const rs = play(v, p, verbose, !v.waitMin), cols = rs.map((_, i) => 'C' + (i + 1));
    console.log('\n## ' + p[0] + ' (' + p[1] + ' taps/s, skill ' + p[2] + ', seed ' + p[3] + ')\n');
    console.log('| cycle | Fresh Batch ready (min) | first helper (min) | taken (min) | run juice | Flavors gained | Flavors total | payout x after | nothing-to-want (min) | same, ignoring Sharp | income/s at end | furthest pearl | away 1 h at first helper | away 1 h at ready |');
    console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    rs.forEach((r, i) => console.log('| ' + (i + 1) + ' | ' + (r.ready == null ? 'not by ' + MAX_CYCLE_MIN : f1(r.ready / 60)) + ' | ' + f1(r.helperAt) + ' | ' + f1(r.minutes) + ' | ' + big(r.runEarned) + ' | +' + r.gain + ' | ' + r.echoes + ' | ' + r.mult.toFixed(1) + ' | ' + f1(r.satiated) + ' | ' + f1(r.satiatedX) + ' | ' + big(r.rate) + ' | ' + r.furthest + ' | ' + big(r.awayHelper) + ' | ' + big(r.awayReady) + ' |'));
    console.log('\nMinute each upgrade reaches max level (- = not maxed before Fresh Batch):\n');
    console.log('| upgrade (max) | ' + cols.join(' | ') + ' |'); console.log('|---|' + cols.map(() => '---|').join(''));
    for (const id of ['tool'].concat(E.ORDER)) console.log('| ' + id + ' (' + econ(v).UPG[id].max + ') | ' + rs.map((r) => f1(r.maxAt[id])).join(' | ') + ' |');
    console.log('\nShare of cycle income by pearl type (%):\n');
    console.log('| pearl | ' + cols.join(' | ') + ' |'); console.log('|---|' + cols.map(() => '---|').join(''));
    for (const t of E.PEARLS) console.log('| ' + t.id + ' | ' + rs.map((r) => (100 * r.income[t.id] / Math.max(1, r.runEarned)).toFixed(1)).join(' | ') + ' |');
    console.log('\nTools bought: ' + rs.map((r, i) => 'C' + (i + 1) + ' ' + r.bought.join(', ')).join(' / '));
    const top = rs.reduce((a, r) => ({ sparks: Math.max(a.sparks, r.top.sparks), pop: Math.max(a.pop, r.top.pop), rate: Math.max(a.rate, r.top.rate), cost: Math.max(a.cost, r.top.cost), run: Math.max(a.run, r.runEarned) }), { sparks: 0, pop: 0, rate: 0, cost: 0, run: 0 });
    console.log('Largest values (whole cycles, all ' + rs.length + '): juice held ' + top.sparks.toFixed(0) + ', run juice ' + top.run.toFixed(0) + ', single pop ' + top.pop.toFixed(0) + ', income/s ' + top.rate.toFixed(0) + ', cost on offer ' + top.cost);
    if (!v.waitMin) {
      // away bonus calibration: awayBonus(3600) against half of what helpers alone earned in one simulated hour
      console.log('\nAway bonus calibration: helpers alone for 1 h from that moment\'s board (helperHour, mean of 4 seeds), against awayBonus(3600):\n');
      console.log('| checkpoint | helper-only juice, 1 h | half of it | away bonus, 1 h | away / half |'); console.log('|---|---|---|---|---|');
      const row = (name, idle, away) => console.log('| ' + name + ' | ' + big(idle) + ' | ' + big(idle / 2) + ' | ' + big(away) + ' | ' + (idle > 0 ? (away / (idle / 2)).toFixed(2) : '-') + ' |');
      rs.forEach((r, i) => { if (r.idleHelper != null) row('C' + (i + 1) + ' first helper (' + f1(r.helperAt) + ' min)', r.idleHelper, r.awayHelper); if (r.idleReady != null) row('C' + (i + 1) + ' Fresh Batch ready (' + f1(r.ready / 60) + ' min)', r.idleReady, r.awayReady); });
      // the Pink Duck costs 10,000 kept Rose Pearls: at each checkpoint's Rose rate, how long they take and what selling them would have paid
      console.log('\nRose collection for the Pink Duck (normal Rose pops over the 60 s before each checkpoint; keeping is not simulated):\n');
      console.log('| checkpoint | Rose pops / min | minutes for 10,000 | juice 10,000 would sell for | Rose share of income |'); console.log('|---|---|---|---|---|');
      const rrow = (name, r) => console.log('| ' + name + ' | ' + (r ? r.perMin.toFixed(0) : '-') + ' | ' + (r && r.perMin > 0 ? (10000 / r.perMin).toFixed(0) : '-') + ' | ' + (r ? big(10000 * r.juiceEach) : '-') + ' | ' + (r ? (100 * r.share).toFixed(1) + '%' : '-') + ' |');
      rrow('C1 first helper (' + f1(rs[0].helperAt) + ' min)', rs[0].roseHelper); rrow('C1 first Fresh Batch (' + f1(rs[0].ready / 60) + ' min)', rs[0].roseReady);
      const l = rs[rs.length - 1]; rrow('C' + rs.length + ' Fresh Batch (' + f1(l.ready / 60) + ' min)', l.roseReady);
      console.log('\nBlack Pearls per cycle:\n');
      console.log('| cycle | unlocked (min) | run length (min) | spawns after unlock | Blacks expected | spawned | spawns turned Rose by the cap | popped by taps | popped by helpers | hits at unlock | hits at end (power) |'); console.log('|---|---|---|---|---|---|---|---|---|---|---|');
      rs.forEach((r, i) => { const b = r.black; console.log('| ' + (i + 1) + ' | ' + f1(b.at) + ' | ' + f1(r.minutes) + ' | ' + b.spawnsAfter + ' | ' + b.expected.toFixed(2) + ' | ' + b.spawned + ' | ' + b.capped + ' | ' + b.byTap + ' | ' + b.byHelper + ' | ' + (b.hitsAtUnlock == null ? '-' : b.hitsAtUnlock) + ' | ' + b.hitsAtEnd + ' (' + b.powerAtEnd + ') |'); });
    }
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
module.exports = { play, PROFILES, VARIANTS, DUCKS, econ, helperHour }; // tests/away.test.js
if (require.main === module) {
  const args = process.argv.slice(2), arg = (k) => { const a = args.find((x) => x.startsWith('--' + k)); return a ? (a.split('=')[1] || true) : null; };
  if (arg('compare')) compare();
  else { const name = arg('variant') || 'baseline'; if (!VARIANTS[name]) { console.error('unknown variant ' + name + '; have: ' + Object.keys(VARIANTS).join(', ')); process.exit(1); } report(name, Object.assign({}, VARIANTS[name], arg('wait') ? { waitMin: +arg('wait') } : {}, arg('duck') ? { duck: arg('duck') === 'best' ? 'best' : 'plain' } : {}), !!arg('log')); }
}
