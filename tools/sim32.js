// Pacing sim: plays several Fresh Batch cycles per player profile. Seeded, so two runs print the same thing.
//   node tools/sim32.js                 baseline (the live numbers in src/econ.js)
//   node tools/sim32.js --variant=NAME  one tuning option from VARIANTS below (nothing in src/ changes)
//   node tools/sim32.js --wait=25       the player keeps playing until minute 25 even if Fresh Batch is ready sooner
//   node tools/sim32.js --compare       one summary line per variant, profile and player policy
//   node tools/sim32.js --duck          the player owns a plain Pink Duck (Common, x1.4) from the start (no ducks by default)
//   node tools/sim32.js --duck=best     the best-case duck instead: a Mythic copy with a top payout perk (+15%), x1.61
//   node tools/sim32.js --early         the early beats of run 1 (first purchase, tool, tool upgrade, helper, Fresh Batch) against the rule of thumb
//   node tools/sim32.js --flavors       the Flavor study: rules A-E, six cycles, three strategies over 3 hours, early timings (docs/flavor-study.md)
//   node tools/sim32.js --flavors-ducks=C   one Flavor rule with the plain Pink Duck and with all ten ducks
//   node tools/sim32.js --ducks         the Hall of Ducks report: per-type pop rates, suggested duck costs, cycle times with ducks
//   node tools/sim32.js --log           also print the old per-mark pacing log for every cycle
const E = require('../src/econ.js'), A = require('../src/artifacts.js');
const CELLS = [120, 252, 440];
const CAP = {}; E.PEARLS.forEach((p) => { CAP[p.id] = p.cap; });
const CYCLES = 6, MAX_CYCLE_MIN = 120;
const TYPE_WIN = 300; // seconds of normal pops behind each per-type rate in the --ducks report (60 s is too noisy for rare types)
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
  // the Flavor study (docs/flavor-study.md): lifetime rules B-E; A (the live rule) is baseline
  flavorB: { flavor: { div: 1.25e6, exp: 0.5, need: 0 } },
  flavorC: { flavor: { div: 1.25e6, exp: 0.5, need: 0.5 } },
  flavorD: { flavor: { div: 1.25e6, exp: 0.5, need: 1 } },
  flavorE: { flavor: { div: 5e6 / Math.pow(2, 1 / 0.4), exp: 0.4, need: 0 } },
  allDucks: { artifacts: A.ARTIFACTS.filter((a) => a.hall === 'ducks').map((a) => a.id) }, // every duck as one plain Common copy
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
  const minRun = (echoes) => (typeof v.minRun === 'function' ? v.minRun(echoes) : v.minRun || E.COLLAPSE_MIN_RUN);
  // a lifetime rule (v.flavor = { div, exp, need }): the Flavors owed are floor((lifetime juice / div)^exp); a Fresh Batch pays what is
  // owed minus the Flavors already held, and is ready at the run floor once that gain is at least max(2, ceil(need x Flavors held)).
  // life = lifetime juice including this run. The 1e-9 keeps an exact 2.0 from flooring to 1 after pow's rounding.
  const LF = v.flavor, owed = LF ? (life) => Math.floor(Math.pow(Math.max(0, life) / LF.div, LF.exp) + 1e-9) : null;
  const collapseGain = LF ? (run, echoes, life) => Math.max(0, owed(life) - echoes) : v.gain || E.collapseGain;
  const collapseReady = LF ? (run, echoes, life) => run >= minRun(echoes) && collapseGain(run, echoes, life) >= Math.max(2, Math.ceil(LF.need * echoes - 1e-9))
    : (run, echoes) => run >= minRun(echoes) && collapseGain(run) >= 2;
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
// takeIf(gain, echoes): the player takes a ready Fresh Batch only once this holds (the strategy comparison); st.lifetime carries the
// lifetime juice for the lifetime Flavor rules.
function cycle(X, st, rng, tapsPerSec, skill, verbose, waitMin, measure, takeIf) {
  freshRun(st);
  let sparks = 0, runEarned = 0, t = 0, spawnT = 0, combo = 0, comboT = 99, meter = 0, frenzy = 0, tapAcc = 0, autoAcc = 0, lastMark = 0, earnedWin = 0, ready = null, satiated = 0, satiatedX = 0, helperAt = null, awayHelper = 0, awayReady = 0, idleHelper = null, idleReady = null;
  // Rose collection for the Pink Duck: normal Rose pops and their juice over the last 60 s (the sim cannot keep pearls)
  const roseWin = [], roseSnap = () => { const w = roseWin.filter((r) => r[0] > t - 60), juice = win.reduce((a, x) => a + x[1], 0), n = w.length, rj = w.reduce((a, r) => a + r[1], 0);
    return { perMin: n * 60 / Math.min(60, t), juiceEach: n ? rj / n : 0, share: juice > 0 ? rj / juice : 0 }; };
  let roseHelper = null, roseReady = null;
  // per-type duck stash rates: normal (not shiny) pops of every type over the TYPE_WIN seconds before a checkpoint
  const typeWin = [], typeSnap = () => { const span = Math.min(TYPE_WIN, t), o = {}; X.PEARLS.forEach((p) => { o[p.id] = 0; }); for (const w of typeWin) if (w[0] > t - TYPE_WIN) o[w[1]]++; for (const k in o) o[k] *= 60 / span; return o; };
  let typeHelper = null, typeReady = null;
  const black = { at: null, spawnsAfter: 0, expected: 0, spawned: 0, capped: 0, byTap: 0, byHelper: 0, hitsAtUnlock: null, hitsAtEnd: null, powerAtEnd: null };
  const pearls = [], log = [], bought = [], marks = [60, 120, 300, 600, 900, 1200], early = { buy: null, tool: null, toolUp: null };
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
  const life0 = st.lifetime || 0;
  while (!(ready != null && t >= (waitMin || 0) * 60 && (!takeIf || takeIf(X.collapseGain(runEarned, st.echoes, life0 + runEarned), st.echoes))) && t < MAX_CYCLE_MIN * 60) {
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
      if (!p.sh) typeWin.push([t, p.kind]);
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
    while (typeWin.length && typeWin[0][0] <= t - TYPE_WIN) typeWin.shift();
    const cands = candidates();
    let best = null; for (const c of cands) if (c.c <= sparks && (!best || c.s < best.s)) best = c;
    if (best) { sparks -= best.c; best.f(); if (best.n.startsWith('buy')) bought.push(best.n.slice(4) + '@' + (t / 60).toFixed(1));
      // the early beats (--early): first purchase of anything, first tool bought, first tool upgrade (power, speed or the tool's own)
      if (early.buy == null) early.buy = t; if (early.tool == null && best.n.startsWith('buy')) early.tool = t; if (early.toolUp == null && /^(pow|spd|uniq)/.test(best.n)) early.toolUp = t; }
    st.lv.tool = bestOwned();
    // nothing left to want: every upgrade still on offer is already affordable (or there is nothing left at all)
    // also without Sharp: at max 99 it always has a next level, so it alone keeps the first measure near zero
    const left = candidates(); if (left.every((c) => c.c <= sparks)) satiated += dt;
    if (left.every((c) => c.n === 'sharp' || c.c <= sparks)) satiatedX += dt;
    for (const c of left) if (c.c > top.cost) top.cost = c.c;
    // awayBonus() in src/ui.js for a 1 hour absence: idle rate at the pool's expected payout, times AWAY_SHARE (half)
    const away1h = () => X.idleRate(X.stats(st), X.PEARLS.map((p) => p.id), st.lv) * 3600 * X.stats(st).awayShare;
    if (helperAt == null && st.lv.auto > 0) { helperAt = t / 60; awayHelper = away1h(); roseHelper = roseSnap(); typeHelper = typeSnap(); if (measure) idleHelper = helperHours(X, st, pearls, fill(), measure); }
    if (black.at == null && st.lv.black > 0) { black.at = t / 60; black.hitsAtUnlock = X.hitsNeeded('black', X.stats(st).power); }
    for (const id in X.UPG) if (maxAt[id] == null && st.lv[id] >= X.UPG[id].max) maxAt[id] = t / 60;
    if (sparks > top.sparks) top.sparks = sparks;
    if (t >= 60) { const rate = win.reduce((a, w) => a + w[1], 0) / 60; if (rate > top.rate) top.rate = rate; }
    while (verbose && marks.length && t >= marks[0]) { const m = marks.shift(); log.push('t=' + m + 's earned=' + Math.round(runEarned) + ' avg/s=' + Math.round(earnedWin / (m - lastMark)) + ' tool=' + X.TOOLS[bestOwned()].name + ' power=' + S.power + ' ups=' + JSON.stringify(st.toolUp[bestOwned()] || {}) + ' swing=' + ((st.toolUp[0] || {}).u | 0) + ' helpers=' + st.lv.auto); earnedWin = 0; lastMark = m; }
    if (ready == null && X.collapseReady(runEarned, st.echoes, life0 + runEarned)) { ready = t; awayReady = away1h(); roseReady = roseSnap(); typeReady = typeSnap(); if (measure) idleReady = helperHours(X, st, pearls, fill(), measure + 1); }
  }
  const rate = win.reduce((a, w) => a + w[1], 0) / Math.min(60, t);
  const gainF = ready == null ? 0 : X.collapseGain(runEarned, st.echoes, life0 + runEarned);
  st.echoes += gainF; st.lifetime = life0 + runEarned;
  const furthest = X.PEARLS.filter((p) => X.isUnlocked(p.id, st.lv)).pop().id;
  black.powerAtEnd = X.stats(st).power; black.hitsAtEnd = X.hitsNeeded('black', black.powerAtEnd);
  return { early, furthest, helperAt, roseHelper, roseReady, typeHelper, typeReady, awayHelper, awayReady, idleHelper, idleReady, black, ready, minutes: ready == null ? null : t / 60, runEarned, gain: gainF, echoes: st.echoes, mult: (1 + X.FLAVOR_BONUS * st.echoes) * X.stats(st).artMult, satiated: satiated / 60, satiatedX: satiatedX / 60, maxAt, income, rate, bought, log, top };
}

function play(v, profile, verbose, measure) {
  const nb = Object.assign({}, E.NEW_BASE); Object.assign(E.NEW_BASE, v.newBase || {});
  try { return playRun(v, profile, verbose, measure); } finally { Object.assign(E.NEW_BASE, nb); }
}
function playRun(v, profile, verbose, measure) {
  const [, taps, skill, seed] = profile, X = econ(v), rng = mulberry32(seed);
  const st = { lv: E.zeroLevels(), echoes: 0, owned: [], equip: -1, toolUp: {}, artifacts: {}, artEquip: [] };
  for (const id of v.artifacts || []) { A.addCopy(st.artifacts, id, 'common', []); A.equip(st.artEquip, st.artifacts, id); } // one Common copy on its pedestal (a relic also takes a free slot); artifacts are never wiped by Fresh Batch
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
// The Hall of Ducks report. The sim cannot keep pearls, so a duck's collection time is its cost over the rate at which its type
// pops (normal pops, manual and helper, over the TYPE_WIN seconds before each checkpoint, or the whole run if shorter), averaged
// over DUCK_SEEDS seeds per profile (the reference seed first). Suggested cost: the geometric mean of the six checkpoint rates
// (two profiles x three checkpoints; the profiles differ up to 10x) x DUCK_TARGET_MIN, two significant figures, at least 5,
// falling with rarity.
const DUCK_TARGET_MIN = 120, DUCK_SEEDS = 4;
function duckReport() {
  const pad = (x, n) => String(x).padStart(n), padE = (x, n) => String(x).padEnd(n);
  const ducks = A.ARTIFACTS.filter((a) => a.hall === 'ducks' && a.bonus.scope);
  const runs = PROFILES.map((p) => play({}, p, false, false));
  const avg = (xs) => { const o = {}; for (const t of E.PEARLS) o[t.id] = xs.reduce((a, x) => a + (x ? x[t.id] : 0), 0) / xs.length; return o; };
  const seeded = PROFILES.map((p, i) => [runs[i]].concat([1, 2, 3].slice(0, DUCK_SEEDS - 1).map((k) => play({}, [p[0], p[1], p[2], p[3] + 100 * k], false, false))));
  const last = (rs) => (rs.length === CYCLES ? rs[CYCLES - 1].typeReady : null);
  const marks = seeded.map((ss) => [['first helper', avg(ss.map((rs) => rs[0].typeHelper))], ['first Fresh Batch', avg(ss.map((rs) => rs[0].typeReady))], ['C' + CYCLES + ' Fresh Batch', avg(ss.map(last))]]);
  console.log('# Hall of Ducks report (seeded; normal pops per minute over the ' + TYPE_WIN + ' s before each checkpoint; keeping is not simulated)');
  console.log('Rates are the mean of ' + DUCK_SEEDS + ' seeds per profile; the checkpoint minutes are the reference seed\'s.\n');
  for (let i = 0; i < PROFILES.length; i++) console.log(PROFILES[i][0] + ' checkpoints: ' + marks[i].map((m, k) => m[0] + ' ' + f1(k ? (k === 1 ? runs[i][0].ready : runs[i][runs[i].length - 1].ready) / 60 : runs[i][0].helperAt) + ' min').join(', '));
  console.log('\nPops per minute: casual (helper / first FB / C6), engaged (same)\n');
  console.log(padE('type', 8) + pad('casual', 26) + pad('engaged', 26));
  let prev = Infinity; const suggest = {};
  for (const t of E.PEARLS) {
    const rates = [].concat(...marks.map((ms) => ms.map((m) => (m[1] ? m[1][t.id] : 0))));
    console.log(padE(t.id, 8) + pad(rates.slice(0, 3).map((r) => r.toFixed(2)).join(' / '), 26) + pad(rates.slice(3).map((r) => r.toFixed(2)).join(' / '), 26));
    if (t.id === 'pearl') continue;
    const nz = rates.filter((r) => r > 0), gm = nz.length ? Math.exp(nz.reduce((a, r) => a + Math.log(r), 0) / nz.length) : 0;
    let n = Math.max(5, E.sig2(Math.max(1, gm * DUCK_TARGET_MIN)));
    if (n >= prev) n = Math.max(5, E.sig2(prev * 0.9)); // keep it falling: the next lower two-figure count
    prev = n; suggest[t.id] = n;
  }
  console.log('\nDuck first-craft cost (data) against the suggestion, and minutes to collect it at each checkpoint rate (- = none popped)\n');
  console.log(padE('duck', 13) + pad('data', 7) + pad('suggest', 9) + pad('casual min', 22) + pad('engaged min', 22));
  for (const a of ducks) {
    const k = a.bonus.scope, q = a.cost[0].qty, mins = marks.map((ms) => ms.map((m) => (m[1] && m[1][k] > 0 ? (q / m[1][k]).toFixed(0) : '-')).join(' / '));
    console.log(padE(a.name, 13) + pad(q, 7) + pad(suggest[k], 9) + pad(mins[0], 22) + pad(mins[1], 22));
  }
  console.log('\nCycle times (min, Fresh Batch taken as soon as ready), C1..C' + CYCLES + '\n');
  for (const [name, v] of [['no ducks', {}], ['Pink Duck only (Common)', VARIANTS.pinkDuck], ['all ' + VARIANTS.allDucks.artifacts.length + ' ducks (Common)', VARIANTS.allDucks]]) {
    for (const p of PROFILES) { const rs = name === 'no ducks' ? runs[PROFILES.indexOf(p)] : play(v, p, false, false); console.log(padE(name, 28) + padE(p[0], 9) + rs.map((r) => (r.ready == null ? '>' + MAX_CYCLE_MIN : f1(r.minutes))).join(' / ') + '   Flavors ' + rs[rs.length - 1].echoes + ', global payout x ' + rs[rs.length - 1].mult.toFixed(1)); }
  }
}
// The early beats of run 1 (seconds) against the usual rule of thumb: first upgrade within about 60 s, first automation (a helper)
// about 3 min, first prestige (Fresh Batch) 10 to 15 min. Report only. The reference seed, then the mean of seeds 1-8.
function earlyReport() {
  const f0 = (x) => (x == null ? '-' : Math.round(x) + ' s'), fm = (x) => (x == null ? '-' : (x / 60).toFixed(1) + ' min');
  const beats = (r) => ({ buy: r.early.buy, tool: r.early.tool, toolUp: r.early.toolUp, helper: r.helperAt == null ? null : r.helperAt * 60, ready: r.ready });
  const line = (b) => 'first purchase ' + f0(b.buy) + ', first tool ' + f0(b.tool) + ', first tool upgrade ' + f0(b.toolUp) + ', first helper ' + fm(b.helper) + ', first Fresh Batch ready ' + fm(b.ready);
  console.log('# Early beats, run 1 (rule of thumb: first upgrade within about 60 s, first automation about 3 min, first prestige 10-15 min)\n');
  for (const p of PROFILES) {
    console.log(p[0] + ' (' + p[1] + ' taps/s, skill ' + p[2] + '), reference seed ' + p[3] + ': ' + line(beats(play({}, p, false, false)[0])));
    const all = [1, 2, 3, 4, 5, 6, 7, 8].map((sd) => beats(play({}, [p[0], p[1], p[2], sd], false, false)[0])), mean = {};
    for (const k of ['buy', 'tool', 'toolUp', 'helper', 'ready']) { const v = all.map((b) => b[k]).filter((x) => x != null); mean[k] = v.length ? v.reduce((a, x) => a + x, 0) / v.length : null; }
    console.log(p[0] + ', mean of seeds 1-8: ' + line(mean));
  }
}
/* ----- The Flavor study (--flavors): docs/flavor-study.md. Report only. ----- */
const FLAVOR_RULES = [['A', 'baseline', 'live rule: floor(sqrt(run / 1.25M)), ready at 5M run juice with a gain of at least 2'],
  ['B', 'flavorB', 'lifetime: owed floor(sqrt(lifetime / 1.25M)), pays the difference, at least 2'],
  ['C', 'flavorC', 'B, and ready only once the gain is at least 50% of the Flavors held'],
  ['D', 'flavorD', 'B, and ready only once the gain is at least 100% of the Flavors held'],
  ['E', 'flavorE', 'B with exponent 0.4: owed floor((lifetime / ' + Math.round(5e6 / Math.pow(2, 2.5)) + ')^0.4), still 2 at the first 5M']];
const STRATEGIES = [['at once', null, 0], ['+100%', (g, e) => g >= e, 0], ['minute 25', null, 25]];
// one profile for a fixed span of play: Fresh Batches by a strategy until the clock passes hours; returns the Flavors held at each mark.
// A run that reaches MAX_CYCLE_MIN without a Fresh Batch ends the play (it would earn no more Flavors before the horizon).
function playFor(v, profile, takeIf, waitMin, hours) {
  const [, taps, skill, seed] = profile, X = econ(v), rng = mulberry32(seed);
  const st = { lv: E.zeroLevels(), echoes: 0, owned: [], equip: -1, toolUp: {}, artifacts: {}, artEquip: [], lifetime: 0 };
  for (const id of v.artifacts || []) { A.addCopy(st.artifacts, id, 'common', []); A.equip(st.artEquip, st.artifacts, id); }
  if (v.duck) A.addCopy(st.artifacts, 'pink_duck', DUCKS[v.duck].rarity, DUCKS[v.duck].perks);
  const marks = [], ends = []; let clock = 0, stalled = false;
  while (clock < hours * 3600) { const r = cycle(X, st, rng, taps, skill, false, waitMin, 0, takeIf); if (r.ready == null) { stalled = true; break; } clock += r.minutes * 60; ends.push([clock, st.echoes]); }
  for (let h = 1; h <= hours; h++) { let e = 0; for (const [c, f] of ends) if (c <= h * 3600) e = f; marks.push(e); }
  return { marks, resets: ends.filter(([c]) => c <= hours * 3600).length, stalled, X };
}
function flavorStudy() {
  const X0 = econ({}), mult = (e) => (1 + X0.FLAVOR_BONUS * e).toFixed(1), f1c = (x) => (x == null ? '>' + MAX_CYCLE_MIN : f1(x));
  console.log('# Flavor study: rules');
  for (const [k, , d] of FLAVOR_RULES) console.log('- ' + k + ': ' + d);
  console.log('All rules: the 5M run floor, 10% payout per Flavor, no artifacts unless named.\n');
  // 1. six cycles, at once and waiting to minute 25
  console.log('## Six cycles: minutes, Flavors held and payout multiplier after each cycle\n');
  console.log('| rule | profile | policy | minutes C1..C6 | Flavors after each | payout x after each |'); console.log('|---|---|---|---|---|---|');
  const early = {};
  for (const [k, name] of FLAVOR_RULES) for (const p of PROFILES) for (const w of [0, 25]) {
    const rs = play(Object.assign({}, VARIANTS[name], w ? { waitMin: w } : {}), p);
    if (!w) early[k + p[0]] = rs;
    console.log('| ' + k + ' | ' + p[0] + ' | ' + (w ? 'to minute 25' : 'at once') + ' | ' + rs.map((r) => f1c(r.minutes)).join(' / ') + ' | ' + rs.map((r) => r.echoes).join(' / ') + ' | ' + rs.map((r) => mult(r.echoes)).join(' / ') + ' |');
  }
  // 2. the strategy comparison
  console.log('\n## Strategies over 3 hours of play: Flavors held (payout x) at 1, 2 and 3 hours\n');
  console.log('Strategies: at once = Fresh Batch the moment it is ready; +100% = only once the gain is at least the Flavors held; minute 25 = keep playing to minute 25 of each run.');
  console.log('Spread = the best strategy\'s 3-hour payout over the worst one\'s (1.00 = they end level).\n');
  console.log('| rule | profile | at once 1h / 2h / 3h | +100% 1h / 2h / 3h | minute 25 1h / 2h / 3h | resets (at once / +100% / 25) | spread at 3h | best |'); console.log('|---|---|---|---|---|---|---|---|');
  for (const [k, name] of FLAVOR_RULES) for (const p of PROFILES) {
    const res = STRATEGIES.map(([, take, w]) => playFor(Object.assign({}, VARIANTS[name]), p, take, w, 3));
    const fin = res.map((r) => 1 + X0.FLAVOR_BONUS * r.marks[2]), hi = Math.max(...fin), lo = Math.min(...fin), best = STRATEGIES[fin.indexOf(hi)][0];
    console.log('| ' + k + ' | ' + p[0] + ' | ' + res.map((r) => r.marks.map((e) => e + ' (x' + mult(e) + ')').join(' / ') + (r.stalled ? ' (stalled)' : '')).join(' | ') + ' | ' + res.map((r) => r.resets).join(' / ') + ' | ' + (hi / lo).toFixed(2) + ' | ' + best + ' |');
  }
  // 3. early timings
  console.log('\n## Early timings, Fresh Batch at once: first Fresh Batch ready, then cycles 2-6 (minutes)\n');
  console.log('Marks: * under 4 minutes, ^ longer than the cycle before.\n');
  console.log('| rule | profile | C1 ready | C2 | C3 | C4 | C5 | C6 |'); console.log('|---|---|---|---|---|---|---|---|');
  for (const [k] of FLAVOR_RULES) for (const p of PROFILES) {
    const rs = early[k + p[0]], cells = rs.map((r, i) => { const m = i ? r.minutes : (r.ready == null ? null : r.ready / 60), prev = i ? (i === 1 ? rs[0].minutes : rs[i - 1].minutes) : null;
      return f1c(m) + (m != null && m < 4 ? '*' : '') + (i && m != null && prev != null && m > prev ? '^' : ''); });
    while (cells.length < 6) cells.push('-');
    console.log('| ' + k + ' | ' + p[0] + ' | ' + cells.join(' | ') + ' |');
  }
}
// --flavors-ducks=X: one rule with the plain Pink Duck and with all ten ducks (six cycles at once and to minute 25, and the strategies)
function flavorDucks(k) {
  const rule = FLAVOR_RULES.find((r) => r[0] === k); if (!rule) { console.error('unknown rule ' + k); process.exit(1); }
  const X0 = econ({}), f1c = (x) => (x == null ? '>' + MAX_CYCLE_MIN : f1(x));
  console.log('# Flavor rule ' + k + ' with ducks (payout x counts Flavors and the global duck)\n');
  console.log('| ducks | profile | policy | minutes C1..C6 | Flavors after each | payout x after each |'); console.log('|---|---|---|---|---|---|');
  const sets = [['Pink Duck (Common)', { duck: 'plain' }], ['all ten (Common)', { artifacts: VARIANTS.allDucks.artifacts }]];
  for (const [dn, dv] of sets) for (const p of PROFILES) for (const w of [0, 25]) {
    const rs = play(Object.assign({}, VARIANTS[rule[1]], dv, w ? { waitMin: w } : {}), p);
    console.log('| ' + dn + ' | ' + p[0] + ' | ' + (w ? 'to minute 25' : 'at once') + ' | ' + rs.map((r) => f1c(r.minutes)).join(' / ') + ' | ' + rs.map((r) => r.echoes).join(' / ') + ' | ' + rs.map((r) => r.mult.toFixed(1)).join(' / ') + ' |');
  }
  console.log('\n| ducks | profile | at once 1h / 2h / 3h | +100% 1h / 2h / 3h | minute 25 1h / 2h / 3h | spread at 3h |'); console.log('|---|---|---|---|---|---|');
  for (const [dn, dv] of sets) for (const p of PROFILES) {
    const res = STRATEGIES.map(([, take, w]) => playFor(Object.assign({}, VARIANTS[rule[1]], dv), p, take, w, 3)), fin = res.map((r) => 1 + X0.FLAVOR_BONUS * r.marks[2]);
    console.log('| ' + dn + ' | ' + p[0] + ' | ' + res.map((r) => r.marks.join(' / ') + (r.stalled ? ' (stalled)' : '')).join(' | ') + ' | ' + (Math.max(...fin) / Math.min(...fin)).toFixed(2) + ' |');
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
  else if (arg('ducks')) duckReport();
  else if (arg('early')) earlyReport();
  else if (arg('flavors-ducks')) flavorDucks(arg('flavors-ducks'));
  else if (arg('flavors')) flavorStudy();
  else { const name = arg('variant') || 'baseline'; if (!VARIANTS[name]) { console.error('unknown variant ' + name + '; have: ' + Object.keys(VARIANTS).join(', ')); process.exit(1); } report(name, Object.assign({}, VARIANTS[name], arg('wait') ? { waitMin: +arg('wait') } : {}, arg('duck') ? { duck: arg('duck') === 'best' ? 'best' : 'plain' } : {}), !!arg('log')); }
}
