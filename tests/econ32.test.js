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
test('idle rate pays the pool expected payout and grows with richer pools', () => {
  const st = fresh(); st.lv.auto = 4; st.lv.sharp = 3; st.echoes = 5; const S = E.stats(st);
  assert.strictEqual(E.idleRate(S, ['pearl'], st.lv), S.autoRate * S.popBase * S.echoMult, 'rose only: payout x1');
  st.lv.lucky = 3; st.lv.mint = 2; st.lv.golden = 1;
  const pool = ['pearl', 'blue', 'mint', 'golden'], ch = E.poolChances(pool, st.lv);
  const ev = Object.keys(ch).reduce((a, id) => a + ch[id] * E.KIND[id].mult, 0);
  assert.ok(Math.abs(E.popEV(pool, st.lv) - ev) < 1e-9 && ev > 1);
  assert.ok(Math.abs(E.idleRate(S, pool, st.lv) - S.autoRate * S.popBase * S.echoMult * ev) < 1e-6);
  st.lv.golden = 4; assert.ok(E.idleRate(S, pool, st.lv) > E.idleRate(S, pool, Object.assign({}, st.lv, { golden: 1 })), 'a higher golden chance pays more');
  st.lv.lucky = E.UPG.lucky.max; // Rose may now leave the pool
  assert.ok(E.idleRate(S, ['blue', 'mint', 'golden'], st.lv) > E.idleRate(S, pool, st.lv), 'dropping Rose from the pool raises the idle rate');
});
test('global dials', () => {
  assert.strictEqual(E.COST_SCALE, 2.5); assert.strictEqual(E.COLLAPSE_MIN_RUN, 5e6); assert.strictEqual(E.UPG.auto.base, 45000);
  assert.strictEqual(E.collapseGain(5e6), 2); assert.strictEqual(E.collapseGain(11.25e6), 3);
  assert.strictEqual(E.collapseReady(5e6 - 1), false); assert.strictEqual(E.collapseReady(5e6), true);
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
const { fmt, fmtX } = new Function(require('fs').readFileSync(require('path').join(__dirname, '../src/econ.js'), 'utf8') + '\nreturn { fmt, fmtX };')();
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
