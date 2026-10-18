const test = require('node:test'), assert = require('node:assert');
const E = require('../src/econ.js');
const fresh = () => ({ lv: E.zeroLevels(), echoes: 0, owned: [true,false,false,false,false,false], equip: -1, toolUp: {} });
test('golden pays 30x, marble 350x', () => {
  const S = E.stats(fresh());
  assert.strictEqual(E.popValue(S, 0, false, 'golden') / E.popValue(S, 0, false, 'pearl'), 30);
  assert.strictEqual(E.popValue(S, 0, false, 'marble') / E.popValue(S, 0, false, 'pearl'), 350);
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
  assert.strictEqual(E.popValue(S, 0, false, 'black') / E.popValue(S, 0, false, 'pearl'), 5000);
  assert.strictEqual(E.popValue(S, 0, false, 'ruby') / E.popValue(S, 0, false, 'pearl'), 2000);
  assert.strictEqual(E.SHINY_MULT, 5);
  assert.strictEqual(E.PEARLS.length, 10);
});
test('roster hp/mult match spec', () => {
  const want = { pearl: [1, 1], blue: [3, 5], mint: [7, 12], golden: [15, 30], violet: [30, 70], coral: [50, 150], marble: [80, 350], opal: [130, 800], ruby: [200, 2000], black: [320, 5000] };
  for (const id in want) { assert.strictEqual(E.KIND[id].hp, want[id][0], id); assert.strictEqual(E.KIND[id].mult, want[id][1], id); }
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
