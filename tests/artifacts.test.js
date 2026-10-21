// The artifacts module (src/artifacts.js) and its payout bonus in the economy.
const test = require('node:test'), assert = require('node:assert');
const A = require('../src/artifacts.js'), E = require('../src/econ.js');
const inv0 = (n) => ({ pearl: n, 'pearl:s': 40, blue: 7 });

test('the Pink Duck: hall ducks, costs 10,000 Rose Pearls, pays x1.25 from one constant', () => {
  const d = A.byId('pink_duck');
  assert.deepStrictEqual([d.hall, d.name, d.cost, d.bonus], ['ducks', 'Pink Duck', [{ kind: 'pearl', qty: 10000 }], { type: 'payout', value: 1.25 }]);
  assert.strictEqual(A.PINK_DUCK_PAYOUT, 1.25); assert.strictEqual(d.bonus.value, A.PINK_DUCK_PAYOUT);
  assert.deepStrictEqual(A.HALLS.map((h) => h.id), ['ducks']);
  for (const a of A.ARTIFACTS) { assert.ok(a.id && a.hall && a.name && a.description && a.cost.length && a.bonus, a.id); assert.ok(A.HALLS.some((h) => h.id === a.hall), a.id + ' has a hall'); }
});
test('crafting consumes exactly 10,000 Rose Pearls and their share of stored value', () => {
  const inv = inv0(12345), invV = { pearl: 24690, 'pearl:s': 400, blue: 70 }, owned = {};
  assert.strictEqual(A.canCraft('pink_duck', inv, owned), true);
  assert.strictEqual(A.craft('pink_duck', inv, owned, invV), true);
  assert.deepStrictEqual(inv, { pearl: 2345, 'pearl:s': 40, blue: 7 }, 'only normal Rose Pearls are spent');
  assert.ok(Math.abs(invV.pearl - 24690 * 2345 / 12345) < 1e-9 && invV['pearl:s'] === 400);
  assert.deepStrictEqual(owned, { pink_duck: true });
  const exact = inv0(10000), v = { pearl: 20000 }; A.craft('pink_duck', exact, {}, v);
  assert.strictEqual(exact.pearl, 0); assert.strictEqual(v.pearl, 0);
});
test('cannot craft twice', () => {
  const inv = inv0(25000), owned = {};
  assert.strictEqual(A.craft('pink_duck', inv, owned), true);
  assert.strictEqual(A.canCraft('pink_duck', inv, owned), false);
  assert.strictEqual(A.craft('pink_duck', inv, owned), false);
  assert.strictEqual(inv.pearl, 15000, 'the second try spends nothing');
});
test('cannot craft short, and shiny Roses do not count', () => {
  const inv = { pearl: 9999, 'pearl:s': 5000 }, owned = {};
  assert.strictEqual(A.canCraft('pink_duck', inv, owned), false);
  assert.strictEqual(A.craft('pink_duck', inv, owned), false);
  assert.deepStrictEqual([inv, owned], [{ pearl: 9999, 'pearl:s': 5000 }, {}]);
  assert.strictEqual(A.canCraft('pink_duck', {}, {}), false); assert.strictEqual(A.canCraft('no_such_duck', inv0(1e6), {}), false);
});
test('payoutMult multiplies owned payout bonuses', () => {
  assert.strictEqual(A.payoutMult(undefined), 1); assert.strictEqual(A.payoutMult({}), 1);
  assert.strictEqual(A.payoutMult({ pink_duck: true }), 1.25); assert.strictEqual(A.payoutMult({ pink_duck: 'yes', other: true }), 1);
});
test('the duck multiplies every pop value and the away bonus', () => {
  const st = { lv: Object.assign(E.zeroLevels(), { auto: 3, lucky: 2 }), echoes: 4, equip: -1, toolUp: {} };
  const S0 = E.stats(st), S1 = E.stats(Object.assign({}, st, { artifacts: { pink_duck: true } }));
  assert.strictEqual(S0.artMult, 1); assert.strictEqual(S1.artMult, 1.25);
  for (const [combo, fr, kind] of [[0, false, 'pearl'], [12, false, 'blue'], [0, true, 'black']]) assert.ok(Math.abs(E.popValue(S1, combo, fr, kind) / E.popValue(S0, combo, fr, kind) - 1.25) < 1e-12, kind);
  const pool = E.PEARLS.map((t) => t.id);
  assert.ok(Math.abs(E.idleRate(S1, pool, st.lv) / E.idleRate(S0, pool, st.lv) - 1.25) < 1e-12);
});
