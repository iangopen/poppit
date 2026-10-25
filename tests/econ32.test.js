const test = require('node:test'), assert = require('node:assert');
const E = require('../src/econ.js');
const fresh = () => ({ lv: E.zeroLevels(), echoes: 0, owned: [true,false,false,false,false,false], equip: -1, toolUp: {} });
test('golden pays 100x, marble 4000x', () => {
  const S = E.stats(fresh());
  assert.strictEqual(E.popValue(S, 0, false, 'golden') / E.popValue(S, 0, false, 'pearl'), 100);
  assert.strictEqual(E.popValue(S, 0, false, 'marble') / E.popValue(S, 0, false, 'pearl'), 4000);
});
test('no blast kind remains', () => { assert.strictEqual(E.KIND.blast, undefined); });
test('costs rise with level', () => {
  for (const id of E.ORDER) { let p = 0; for (let l = 0; l < 6; l++) { const c = E.cost(id, l); assert.ok(c >= p, id + ' l' + l); p = c; } }
});
test('tool power/speed grow with upgrades', () => {
  for (let i = 0; i < E.TOOLS.length; i++) { assert.ok(E.toolPower(i, 5) > E.toolPower(i, 0)); assert.ok(E.toolSpeed(i, 5) > E.toolSpeed(i, 0)); }
});
test('tool upgrade cost increases per level and speed is cheaper', () => {
  for (let i = 0; i < E.TOOLS.length; i++) { for (let l = 1; l < E.TOOL_UP_MAX; l++) assert.ok(E.toolUpCost(i,'power',l) > E.toolUpCost(i,'power',l-1)); assert.ok(E.toolUpCost(i,'speed',0) <= E.toolUpCost(i,'power',0)); }
});
test('combo multiplier caps at 60', () => { assert.strictEqual(E.comboMult(60), E.comboMult(500)); });
// ---- pearl collection ----
const lvz = () => E.zeroLevels();
test('chancesSumToOne', () => {
  const lv = lvz(); lv.lucky = 2; lv.golden = 1;
  const c = E.poolChances(['pearl', 'blue', 'golden'], lv);
  assert.ok(Math.abs(Object.values(c).reduce((a, b) => a + b, 0) - 1) < 1e-9);
});
test('emptyPoolFallsBackToRose', () => { assert.deepStrictEqual(E.poolChances([], lvz()), { pearl: 1 }); });
test('lockedTypeExcluded', () => {
  const c = E.poolChances(['pearl', 'ruby'], lvz());
  assert.strictEqual(c.ruby || 0, 0); assert.strictEqual(c.pearl, 1);
});
test('weightGrowsWithLevel', () => {
  const a = lvz(), b = lvz(); a.lucky = 1; b.lucky = 3;
  assert.ok(E.typeWeight('blue', b) > E.typeWeight('blue', a));
  assert.strictEqual(E.typeWeight('blue', lvz()), 0);
});
test('shinyChanceBase', () => {
  const lv = lvz(); assert.strictEqual(E.shinyChance(lv), 0.005); lv.shiny = 3; assert.ok(E.shinyChance(lv) > 0.005);
});
test('popValueUsesRoster', () => {
  const S = E.stats(fresh());
  assert.strictEqual(E.popValue(S, 0, false, 'black') / E.popValue(S, 0, false, 'pearl'), 190000);
  assert.strictEqual(E.popValue(S, 0, false, 'ruby') / E.popValue(S, 0, false, 'pearl'), 51000);
  assert.strictEqual(E.SHINY_MULT, 5);
  assert.strictEqual(E.PEARLS.length, 10);
});
test('roster hp and base payout match spec', () => {
  const want = { pearl: [1, 1], blue: [3, 5], mint: [7, 12], golden: [15, 30], violet: [30, 70], coral: [50, 150], marble: [80, 350], opal: [130, 800], ruby: [200, 2000], black: [320, 5000] };
  for (const t of E.PEARLS) { assert.strictEqual(t.hp, want[t.id][0], t.id); assert.strictEqual(t.baseMult, want[t.id][1], t.id); assert.strictEqual(E.KIND[t.id].hp, t.hp, t.id); }
});
test('payout = base x 1.5^rank, rounded to two significant figures', () => {
  assert.strictEqual(E.PAYOUT_STEEPNESS, 1.5);
  const two = (x) => { const e = Math.floor(Math.log10(x)) - 1; return Math.round(x / Math.pow(10, e)) * Math.pow(10, e); }; // independent of econ's toPrecision
  E.PEARLS.forEach((t, i) => { const w = two(t.baseMult * Math.pow(1.5, i)); assert.ok(Math.abs(t.mult - w) < 1e-9 * w, t.id + ' ' + t.mult + ' vs ' + w); assert.strictEqual(E.KIND[t.id].mult, t.mult); });
  assert.deepStrictEqual(E.PEARLS.map((t) => t.mult), [1, 7.5, 27, 100, 350, 1100, 4000, 14000, 51000, 190000]);
});
test('frenzy needs 200 pops, 24 fewer per Fuel level', () => {
  const st = fresh(); assert.strictEqual(E.stats(st).frenzyNeed, 200);
  st.lv.fuel = 5; assert.strictEqual(E.stats(st).frenzyNeed, 80); assert.strictEqual(E.UPG.fuel.max, 5);
});
// ---- away bonus: what helpers alone earn (stepAuto + trySpawn in src/world.js), see helperIdle ----
const gates = () => { const lv = E.zeroLevels(); for (const id of ['lucky', 'mint', 'golden', 'violet', 'coral', 'marble', 'opal', 'ruby', 'black']) lv[id] = E.UPG[id].max; return lv; };
// written out again here, from the game's rules, so a change to helperIdle has to agree with it
function hittableRate(S, pool, L) {
  const one = (frenzy) => {
    const ch = E.poolChances(pool, L, frenzy), mix = {};
    for (const id in ch) { const k = E.KIND[id].hp <= 3 * S.power ? id : 'pearl'; mix[k] = (mix[k] || 0) + ch[id]; } // a type helpers skip sits at its cap; trySpawn makes Rose instead
    let ev = 0, hits = 0; for (const id in mix) { ev += mix[id] * E.KIND[id].mult; hits += mix[id] * Math.ceil(E.KIND[id].hp / S.power); }
    const pops = Math.min(S.autoRate / hits, (frenzy ? 4 : 1) / S.spawnEvery);
    return { mix, pops, rate: pops * S.popBase * S.echoMult * ev * (1 + E.shinyChance(L) * (E.SHINY_MULT - 1)) * (frenzy ? 2 : 1) };
  };
  // the meter fills during a frenzy too (at the frenzy's pop rate); the normal phase fills the rest, then the next frenzy starts
  const n = one(false), f = one(true), left = Math.max(0, S.frenzyNeed - 7 * f.pops * 0.25), share = 7 / (7 + left / (n.pops * 0.25));
  return { mix: n.mix, rate: (1 - share) * n.rate + share * f.rate };
}
test('away bonus equals the helper-hittable expected value at three tool powers', () => {
  const lv = Object.assign(E.zeroLevels(), { lucky: 3, mint: 2, golden: 2, violet: 1, coral: 1, auto: 4, sharp: 3, fuel: 2 }), pool = E.PEARLS.map((t) => t.id);
  const want = { 0: ['blue', 'pearl'], 2: ['blue', 'mint', 'pearl'], 5: ['blue', 'coral', 'golden', 'mint', 'pearl', 'violet'] };
  for (const eq of [0, 2, 5]) {
    const S = E.stats({ lv, echoes: 5, equip: eq, toolUp: {} }), got = E.helperIdle(S, pool, lv), ref = hittableRate(S, pool, lv);
    assert.strictEqual(S.power, [1, 2, 3, 6, 10, 18][eq]);
    assert.deepStrictEqual(Object.keys(got.mix).sort(), want[eq], 'power ' + S.power + ' hits only these');
    assert.deepStrictEqual(Object.keys(ref.mix).sort(), want[eq]);
    assert.ok(Math.abs(got.rate - ref.rate) < 1e-9 * ref.rate && got.rate > 0, 'power ' + S.power + ': ' + got.rate + ' vs ' + ref.rate);
    assert.strictEqual(E.idleRate(S, pool, lv), got.rate);
  }
  const S = E.stats({ lv, echoes: 5, equip: 5, toolUp: {} });
  assert.ok(E.idleRate(S, pool, lv, false) < E.idleRate(S, pool, lv), 'shinies off pays a little less');
  assert.strictEqual(E.FRENZY_SECS, 7); assert.strictEqual(E.HELPER_METER, 0.25);
});
test('the frenzy share counts the meter a frenzy fills itself, and is unchanged when helpers are the limit in both phases', () => {
  const S = { autoRate: 1e9, spawnEvery: 0.5, power: 1, popBase: 1, echoMult: 1, frenzyNeed: 100, frenzySecs: 7, meterMult: 1, shinyBonus: 0 };
  const lv = E.zeroLevels(), h = E.helperIdle(S, ['pearl'], lv); // spawn-limited: 2 pops/s normal, 8 in a frenzy
  // a frenzy fills 7 x 8 x 0.25 = 14 of 100, the normal phase the other 86 at 0.5/s = 172 s: share 7 / 179
  assert.ok(Math.abs(h.pops - 2) < 1e-12 && Math.abs(h.frenzy.pops - 8) < 1e-12 && Math.abs(h.frenzyShare - 7 / 179) < 1e-12, String(h.frenzyShare));
  const T = Object.assign({}, S, { autoRate: 1 }), g = E.helperIdle(T, ['pearl'], lv); // helpers are the limit: 1 pop/s in both phases
  assert.ok(Math.abs(g.frenzyShare - 7 * 1 * 0.25 / 100) < 1e-12, 'the old formula: ' + g.frenzyShare);
  const R = Object.assign({}, S, { frenzyNeed: 10 }); // a frenzy fills its own meter: back to back
  assert.strictEqual(E.helperIdle(R, ['pearl'], lv).frenzyShare, 1);
});
test('a pool of only unhittable types pays nothing for them: only the Roses the caps turn them into', () => {
  const lv = Object.assign(gates(), { auto: 4 }), S = E.stats({ lv, echoes: 0, equip: 0, toolUp: {} }); // Steel Pin, power 1
  assert.deepStrictEqual(E.effectivePool(['ruby', 'black'], lv), ['ruby', 'black']);
  const h = E.helperIdle(S, ['ruby', 'black'], lv);
  assert.deepStrictEqual(h.mix, { pearl: 1 }, 'no ruby or black payout is counted');
  assert.strictEqual(h.rate, E.idleRate(S, ['pearl'], lv), 'same as a Rose-only pool');
  assert.ok(h.rate <= S.autoRate * S.popBase * 1.5, 'Rose pays x1 (frenzy and shinies add a little)');
  const none = E.stats({ lv: Object.assign(gates(), { auto: 0 }), echoes: 0, equip: 0, toolUp: {} });
  assert.strictEqual(E.idleRate(none, ['ruby', 'black'], lv), 0, 'and with no helpers it is 0');
});
test('idle rate grows with a richer hittable pool', () => {
  const lv = Object.assign(E.zeroLevels(), { auto: 4, lucky: 3, mint: 2, golden: 1, tool: 5 }), S = E.stats({ lv, echoes: 0, equip: -1, toolUp: {} }), pool = E.PEARLS.map((t) => t.id);
  assert.ok(E.idleRate(S, pool, Object.assign({}, lv, { golden: 4 })) > E.idleRate(S, pool, lv), 'a higher golden chance pays more once golden is hittable');
});
test('global dials', () => {
  assert.strictEqual(E.COST_SCALE, 2.5); assert.strictEqual(E.COLLAPSE_MIN_RUN, 5e6); assert.strictEqual(E.UPG.auto.base, 45000);
  assert.strictEqual(E.collapseGain(5e6, 0, 5e6), 2); assert.strictEqual(E.collapseGain(11.25e6, 0, 11.25e6), 3);
  assert.strictEqual(E.collapseReady(5e6 - 1, 0, 5e6 - 1), false); assert.strictEqual(E.collapseReady(5e6, 0, 5e6), true);
});
// ---- rule C (2026-10-24): Flavors owed = floor(sqrt(flavor juice / 1.25M)); a Fresh Batch pays owed minus held, and is ready at the
// 5M run floor once that gain is at least half the Flavors held, rounded up, never below 2 ----
test('rule C: the constants and the Flavors owed', () => {
  assert.strictEqual(E.COLLAPSE_GAIN_DIV, 1.25e6); assert.strictEqual(E.FLAVOR_NEED, 0.5); assert.strictEqual(E.FLAVOR_MIN_GAIN, 2);
  for (let n = 0; n <= 5000; n++) {
    assert.strictEqual(E.flavorsOwed(E.flavorJuiceFor(n)), n, 'exactly ' + n + ' at its own juice');
    if (n > 0) assert.strictEqual(E.flavorsOwed(E.flavorJuiceFor(n) * (1 - 1e-6)), n - 1, 'one less just below it');
  }
  assert.strictEqual(E.flavorsOwed(0), 0); assert.strictEqual(E.flavorsOwed(-5), 0);
});
test('rule C: the gain and the readiness gate at several held-Flavor counts', () => {
  const needs = { 0: 2, 1: 2, 2: 2, 3: 2, 4: 2, 5: 3, 15: 8, 41: 21, 300: 150, 4871: 2436 };
  for (const k in needs) {
    const e = +k, need = needs[k], at = E.flavorJuiceFor(e + need), below = E.flavorJuiceFor(e + need - 1), run = 6e6;
    assert.strictEqual(E.flavorNeed(e), need, 'the gain needed with ' + e + ' held');
    assert.strictEqual(E.collapseGain(run, e, at), need); assert.strictEqual(E.collapseReady(run, e, at), true, e + ' held: ready at +' + need);
    assert.strictEqual(E.collapseGain(run, e, below), need - 1); assert.strictEqual(E.collapseReady(run, e, below), false, e + ' held: not ready at +' + (need - 1));
    assert.strictEqual(E.collapseReady(E.COLLAPSE_MIN_RUN - 1, e, at * 4), false, e + ' held: never below the run floor');
    assert.strictEqual(E.collapseReady(E.COLLAPSE_MIN_RUN, e, at), true);
  }
  // the minimum of 2: with nothing or one Flavor held, a gain of 1 is never enough
  assert.strictEqual(E.collapseReady(6e6, 0, E.flavorJuiceFor(1)), false); assert.strictEqual(E.collapseReady(6e6, 1, E.flavorJuiceFor(2)), false);
  assert.strictEqual(E.collapseReady(6e6, 1, E.flavorJuiceFor(3)), true);
  // more held than owed (a hand-edited save): the gain is 0, never negative
  assert.strictEqual(E.collapseGain(6e6, 50, E.flavorJuiceFor(10)), 0);
  // the first Fresh Batch is unchanged: 2 Flavors at the 5M floor, 3 at 11.25M
  assert.strictEqual(E.collapseGain(5e6, 0, 5e6), 2); assert.strictEqual(E.collapseGain(11.25e6, 0, 11.25e6), 3);
});
test('rule C: progress toward the gate is the slower of the run floor and the flavor juice', () => {
  assert.strictEqual(E.collapseProgress(0, 0, 0), 0);
  assert.strictEqual(E.collapseProgress(2.5e6, 0, 2.5e6), 0.5);
  assert.strictEqual(E.collapseProgress(5e6, 0, 5e6), 1);
  const from = E.flavorJuiceFor(300), to = E.flavorJuiceFor(450);
  assert.strictEqual(E.collapseProgress(6e6, 300, from), 0, 'a save right after its migration starts at 0');
  assert.ok(Math.abs(E.collapseProgress(6e6, 300, (from + to) / 2) - 0.5) < 1e-12, 'halfway in juice is halfway');
  assert.strictEqual(E.collapseProgress(1e6, 300, to), 0.2, 'the run floor holds it back');
  assert.strictEqual(E.collapseProgress(6e6, 300, to), 1);
});
// ---- pool lock: a type can only be switched off once the next type up has its unlock maxed ----
const maxed = () => { const lv = E.zeroLevels(); for (const id of ['lucky', 'golden', 'mint', 'violet', 'coral', 'marble', 'opal', 'ruby', 'black']) lv[id] = E.UPG[id].max; return lv; };
test('canToggleOff needs the next type maxed', () => {
  const lv = E.zeroLevels(); lv.lucky = 7; assert.strictEqual(E.canToggleOff('pearl', lv), false);
  lv.lucky = E.UPG.lucky.max; assert.strictEqual(E.canToggleOff('pearl', lv), true);
  assert.strictEqual(E.canToggleOff('blue', lv), false);
  assert.strictEqual(E.canToggleOff('black', E.zeroLevels()), true, 'the last type has nothing above it');
});
test('a locked type stays in the pool even if it was removed', () => {
  const lv = E.zeroLevels(); lv.lucky = 1; lv.mint = 1;
  const c = E.poolChances(['mint'], lv);
  assert.ok(c.pearl > 0 && c.blue > 0 && c.mint > 0, JSON.stringify(c));
});
test('a type can really leave once its gate is open', () => {
  const lv = E.zeroLevels(); lv.lucky = E.UPG.lucky.max; lv.mint = 1;
  const c = E.poolChances(['mint'], lv);
  assert.strictEqual(c.pearl, undefined); assert.ok(c.blue > 0 && c.mint > 0, JSON.stringify(c));
});
test('effectivePool lists forced and chosen types in roster order', () => {
  const lv = maxed(); assert.deepStrictEqual(E.effectivePool(['golden', 'pearl'], lv), ['pearl', 'golden']);
});
test('unlockUpg maps blue to lucky', () => { assert.strictEqual(E.unlockUpg('blue'), 'lucky'); assert.strictEqual(E.unlockUpg('ruby'), 'ruby'); assert.strictEqual(E.unlockUpg('pearl'), null); });

test('unlock chain follows the roster: blue, mint, golden, violet, coral, marble, opal, ruby, black', () => {
  const chain = ['lucky', 'mint', 'golden', 'violet', 'coral', 'marble', 'opal', 'ruby', 'black'];
  for (let i = 1; i < chain.length; i++) {
    const lv = E.zeroLevels(); lv.tool = 3; assert.strictEqual(E.UPG[chain[i]].req(lv), false, chain[i] + ' locked at start');
    lv[chain[i - 1]] = 1; assert.strictEqual(E.UPG[chain[i]].req(lv), true, chain[i] + ' opens after ' + chain[i - 1]);
  }
  const base = chain.slice(1).map((id) => E.UPG[id].base); for (let i = 1; i < base.length; i++) assert.ok(base[i] > base[i - 1], 'cost rises along the chain');
  assert.ok(E.ORDER.indexOf('mint') < E.ORDER.indexOf('golden'));
});
test('only per-type upgrades sit in the Pearls & Marbles group', () => {
  const types = new Set(['lucky', 'mint', 'golden', 'violet', 'coral', 'marble', 'opal', 'ruby', 'black']);
  for (const id in E.UPG) assert.strictEqual(E.UPG[id].group === 'marble', types.has(id), id);
});
// ---- number display: fmt lives in econ.js but is not exported, so load it the way the page does ----
const { fmt, fmtX } = new Function('require', require('fs').readFileSync(require('path').join(__dirname, '../src/econ.js'), 'utf8') + '\nreturn { fmt, fmtX };')((p) => require(require('path').join(__dirname, '../src', p)));
test('fmtX prints payouts with no stray zeros', () => {
  assert.deepStrictEqual(E.PEARLS.map((t) => fmtX(t.mult)), ['1', '7.5', '27', '100', '350', '1,100', '4,000', '14K', '51K', '190K']);
  assert.deepStrictEqual(E.PEARLS.map((t) => fmtX(t.mult * E.SHINY_MULT)), ['5', '37.5', '135', '500', '1,750', '5,500', '20K', '70K', '255K', '950K']);
  assert.strictEqual(fmtX(1.5e6), '1.5M'); assert.strictEqual(fmtX(1e6), '1M'); assert.strictEqual(fmtX(100000), '100K'); assert.strictEqual(fmtX(1.25e9), '1.25B');
});
test('fmt rolls over to the next suffix when rounding reaches 1000', () => {
  assert.strictEqual(fmt(99950), '100K'); assert.strictEqual(fmt(999500), '1.00M'); assert.strictEqual(fmt(999.6e6), '1.00B'); assert.strictEqual(fmt(9.996e12), '10.0T');
  assert.strictEqual(fmt(0), '0'); assert.strictEqual(fmt(0.5), '0'); assert.strictEqual(fmt(9999), '9,999'); assert.strictEqual(fmt(793571074364), '794B');
});
test('fmt never prints an exponent or more than 3 significant digits up to 1e60', () => {
  for (let e = 4; e < 60; e += 0.001) { const s = fmt(Math.pow(10, e)); assert.ok(!/e/.test(s) && s.replace(/\D/g, '').length <= 3 && s.length <= 7, e + ' -> ' + s); }
  assert.strictEqual(fmt(Infinity), '∞');
});
// ---- Chain Reaction is gone: only the v2 -> v3 save migration (which refunds it) may still name it ----
test('no code path references chain', () => {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..'), hits = [];
  for (const dir of ['src', 'tools']) for (const f of fs.readdirSync(path.join(root, dir)).filter((n) => /\.(js|html)$/.test(n))) {
    let s = fs.readFileSync(path.join(root, dir, f), 'utf8');
    if (f === 'save.js') s = s.replace(/\/\/ v2 had Chain Reaction[\s\S]*?\n {2}2: \(d\) => \{[\s\S]*?\n {2}\},/, '');
    s.split(/\r?\n/).forEach((line, i) => { if (/\bchain\b/i.test(line)) hits.push(dir + '/' + f + ':' + (i + 1)); });
  }
  assert.deepStrictEqual(hits, []);
});
test('only the Steel Pin has a unique upgrade, priced like the old Wide Swing at today\'s COST_SCALE', () => {
  assert.deepStrictEqual(E.TOOLS.map((t) => !!t.unique), [true, false, false, false, false, false]);
  const u = E.TOOLS[0].unique; assert.strictEqual(u.name, 'Wide Swing'); assert.strictEqual(u.max, 5);
  assert.deepStrictEqual([0, 1, 2, 3, 4].map((l) => E.uniqueCost(0, l)), [88, 298, 1012, 3440, 11693]);
  assert.strictEqual(E.TOOLS[0].unique.effect(1).brush, 0.045); assert.ok(Math.abs(E.TOOLS[0].unique.effect(3).brush - 0.085) < 1e-12);
});
test('the 2026-10-22 pacing dials: 10% per Flavor, Black at base 55,000 with first-level weight 0.8, the floor unscaled', () => {
  assert.strictEqual(E.FLAVOR_BONUS, 0.1);
  assert.strictEqual(E.stats({ lv: E.zeroLevels(), echoes: 7, equip: -1, toolUp: {} }).echoMult, 1 + 0.1 * 7);
  assert.strictEqual(E.UPG.black.base, 55000); assert.strictEqual(E.cost('black', 0), Math.ceil(55000 * E.COST_SCALE));
  assert.strictEqual(E.NEW_BASE.black, 0.8); assert.strictEqual(E.typeWeight('black', Object.assign(E.zeroLevels(), { black: 1 })), 0.8);
  assert.strictEqual(E.COLLAPSE_MIN_RUN, 5e6); assert.strictEqual(E.collapseReady(5e6, 0, 5e6), true); assert.strictEqual(E.collapseReady(5e6 - 1, 0, 5e6 - 1), false);
  const A = require('../src/artifacts.js'), { DUCKS } = require('../tools/sim32.js'), mult = (d) => A.payoutMult({ pink_duck: { copies: [Object.assign({ id: 1 }, DUCKS[d])], active: 1 } });
  assert.ok(Math.abs(mult('plain') - 1.4) < 1e-12 && Math.abs(mult('best') - 1.61) < 1e-12, 'the sim ducks are x1.4 and x1.61');
});
