// The Hall of Ducks (one duck per pearl type, payouts scoped to that type) and the equip slots for relics:
// src/artifacts.js, the payout readers in src/econ.js, and the v7 -> v8 save step.
const test = require('node:test'), assert = require('node:assert');
const A = require('../src/artifacts.js'), E = require('../src/econ.js');
const { MIGRATIONS, SAVE_VERSION } = loadSave();
function loadSave() { const vm = require('node:vm'), fs = require('node:fs'), ctx = { ECON: E, TextEncoder, TextDecoder, btoa, atob }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(require.resolve('../src/save.js'), 'utf8') + ';this.MIGRATIONS = MIGRATIONS; this.SAVE_VERSION = SAVE_VERSION;', ctx); return ctx; }
const near = (a, b) => Math.abs(a - b) < 1e-12 * Math.max(1, Math.abs(b));
const ducks = () => A.ARTIFACTS.filter((a) => a.hall === 'ducks');
const typeDucks = () => ducks().filter((a) => a.bonus.scope);
const KINDS = E.PEARLS.map((t) => t.id);
const st0 = () => ({ lv: Object.assign(E.zeroLevels(), { auto: 3, lucky: 2, mint: 2, golden: 1 }), echoes: 3, equip: -1, toolUp: {}, artifacts: {}, artEquip: [] });
// three test-only relics, so the five slots can be filled (only three real relics exist)
function withFixtureRelics(fn) {
  const fx = [1, 2, 3].map((i) => ({ id: 'fx_relic' + i, hall: 'relics', name: 'Fixture ' + i, description: 'test only', cost: [{ kind: 'material', id: 'rosegold', qty: 1 }], bonus: { type: 'spawn', value: 1.01 } }));
  A.ARTIFACTS.push(...fx);
  try { fn(fx.map((a) => a.id)); } finally { for (const a of fx) A.ARTIFACTS.splice(A.ARTIFACTS.indexOf(a), 1); }
}

test('the roster: the Pink Duck as before, then one duck per pearl type after Rose, in roster order', () => {
  const pink = A.byId('pink_duck');
  assert.deepStrictEqual([pink.cost, pink.repeatFactor, pink.bonus], [[{ kind: 'pearl', qty: 10000 }], 0.25, { type: 'payout', value: A.PINK_DUCK_PAYOUT }]);
  assert.strictEqual(A.PINK_DUCK_PAYOUT, 1.4); assert.strictEqual(pink.bonus.scope, undefined, 'the Pink Duck is global');
  assert.deepStrictEqual(ducks().map((a) => a.id), ['pink_duck', 'blue_duck', 'mint_duck', 'golden_duck', 'violet_duck', 'coral_duck', 'marble_duck', 'opal_duck', 'ruby_duck', 'black_duck']);
  assert.deepStrictEqual(typeDucks().map((a) => a.bonus.scope), KINDS.slice(1), 'each type duck is scoped to its own type');
  assert.deepStrictEqual(typeDucks().map((a) => a.name), ['Blue Duck', 'Mint Duck', 'Golden Duck', 'Violet Duck', 'Coral Duck', 'Marble Duck', 'Opal Duck', 'Ruby Duck', 'Black Duck']);
  let prev = Infinity;
  for (const a of typeDucks()) {
    const q = a.cost[0].qty;
    assert.deepStrictEqual([a.cost.length, a.cost[0].kind, a.repeatFactor, a.bonus.type, a.bonus.value], [1, a.bonus.scope, 0.25, 'payout', A.TYPE_DUCK_PAYOUT], a.id);
    assert.ok(q >= 5 && Number(q.toPrecision(2)) === q && q < prev, a.id + ': at least 5, two significant figures, falling (' + q + ')');
    prev = q;
  }
  assert.strictEqual(A.TYPE_DUCK_PAYOUT, 1.4);
  assert.deepStrictEqual(A.craftCost('blue_duck', { blue_duck: { copies: [{ id: 1 }], active: 1 } }), [{ kind: 'blue', qty: 400 }], 'a repeat costs a quarter');
});
test('a type duck crafts from kept pearls of its own type only', () => {
  const arts = {}, inv = { pearl: 99999, blue: 1599 };
  assert.strictEqual(A.canCraft('blue_duck', inv, arts), false);
  inv.blue = 1600; inv['blue:s'] = 50;
  const c = A.craft('blue_duck', inv, arts, null, null, () => 0);
  assert.ok(c && c.rarity === 'common' && inv.blue === 0 && inv.pearl === 99999 && inv['blue:s'] === 50 && arts.blue_duck.active === c.id);
});
test('each type duck changes only its own type\'s pop value; the Pink Duck changes every type', () => {
  const S0 = E.stats(st0());
  for (const d of typeDucks()) {
    const st = st0(); A.addCopy(st.artifacts, d.id, 'common', []);
    const S1 = E.stats(st);
    assert.strictEqual(S1.artMult, 1, d.id + ' leaves the global multiplier alone');
    for (const k of KINDS) for (const [combo, fr] of [[0, false], [9, true]]) {
      const r = E.popValue(S1, combo, fr, k) / E.popValue(S0, combo, fr, k);
      assert.ok(near(r, k === d.bonus.scope ? 1.4 : 1), d.id + ' on ' + k + ': x' + r);
    }
  }
  const st = st0(); A.addCopy(st.artifacts, 'pink_duck', 'common', []); const S1 = E.stats(st);
  assert.ok(near(S1.artMult, 1.4) && JSON.stringify(S1.typeMult) === '{}');
  for (const k of KINDS) assert.ok(near(E.popValue(S1, 0, false, k) / E.popValue(S0, 0, false, k), 1.4), 'Pink Duck on ' + k);
  const both = st0(); A.addCopy(both.artifacts, 'pink_duck', 'common', []); A.addCopy(both.artifacts, 'blue_duck', 'common', []);
  const S2 = E.stats(both);
  assert.ok(near(E.popValue(S2, 0, false, 'blue') / E.popValue(S0, 0, false, 'blue'), 1.4 * 1.4) && near(E.popValue(S2, 0, false, 'pearl') / E.popValue(S0, 0, false, 'pearl'), 1.4), 'Pink and Blue stack on Blue only');
});
test('a type duck\'s payout perk stays on its type; its other perks are global', () => {
  const st = st0(); A.addCopy(st.artifacts, 'mint_duck', 'epic', [{ stat: 'payout', value: 0.05 }, { stat: 'away', value: 0.1 }]);
  const b = A.activeBonuses(st.artifacts, st.artEquip), S0 = E.stats(st0()), S1 = E.stats(st);
  assert.ok(near(b.typePay.mint, 1.4 * 1.05) && b.payout === 1 && near(b.away, 0.1) && Object.keys(b.typePay).join() === 'mint');
  assert.ok(near(E.popValue(S1, 0, false, 'mint') / E.popValue(S0, 0, false, 'mint'), 1.47) && near(E.popValue(S1, 0, false, 'blue'), E.popValue(S0, 0, false, 'blue')));
  assert.ok(near(S1.awayShare, E.AWAY_SHARE * 1.1), 'the away perk is global');
  const pk = st0(); A.addCopy(pk.artifacts, 'pink_duck', 'rare', [{ stat: 'payout', value: 0.05 }]);
  assert.ok(near(E.stats(pk).artMult, 1.47) && JSON.stringify(E.stats(pk).typeMult) === '{}', 'a Pink Duck payout perk is still global');
});
test('helpers and the away bonus: a type duck raises exactly its type\'s share of the helper value', () => {
  const pool = KINDS.slice(0, 4), st = st0(), S0 = E.stats(st);
  A.addCopy(st.artifacts, 'blue_duck', 'common', []);
  const S1 = E.stats(st), h0 = E.helperIdle(S0, pool, st.lv), h1 = E.helperIdle(S1, pool, st.lv);
  const shiny = 1 + E.shinyChance(st.lv, 0) * (E.SHINY_MULT - 1);
  for (const [a, b] of [[h0, h1], [h0.frenzy, h1.frenzy]]) {
    assert.ok(a.mix.blue > 0 && near(b.evPop - a.evPop, 0.4 * a.mix.blue * E.KIND.blue.mult * shiny), 'only the Blue share pays 40% more');
    assert.ok(near(a.pops, b.pops) && near(a.hitsPerPop, b.hitsPerPop), 'pop rate unchanged');
  }
  assert.ok(near(h1.frenzyShare, h0.frenzyShare));
  const ratio = E.idleRate(S1, pool, st.lv) / E.idleRate(S0, pool, st.lv);
  assert.ok(ratio > 1 && ratio < 1.4, 'the away bonus rises, by less than x1.4: ' + ratio);
  // a type helpers cannot hit pops as Rose (its spawns turn Rose at the cap), so its duck adds nothing to the away bonus
  const bl = st0(); bl.lv.ruby = 1; bl.lv.black = 1; A.addCopy(bl.artifacts, 'black_duck', 'common', []);
  const all = KINDS, Sb0 = E.stats(Object.assign({}, bl, { artifacts: {} })), Sb1 = E.stats(bl);
  assert.ok(!E.helperCanHit('black', Sb1.power) && near(E.idleRate(Sb1, all, bl.lv), E.idleRate(Sb0, all, bl.lv)), 'Black Duck: helpers never pop Black');
  const rs = st0(); A.addCopy(rs.artifacts, 'pink_duck', 'common', []);
  assert.ok(near(E.idleRate(E.stats(rs), pool, st.lv) / E.idleRate(S0, pool, st.lv), 1.4), 'the Pink Duck still scales the whole away bonus');
});
test('equip slots: equip, unequip, swap, the five-slot limit, owned relics only', () => {
  assert.strictEqual(A.EQUIP_SLOTS, 5);
  withFixtureRelics((fx) => {
    const arts = {}, eq = [], relics = ['rose_lantern', 'blue_compass', 'mint_clock'].concat(fx);
    assert.strictEqual(A.equip(eq, arts, 'rose_lantern'), false, 'not owned');
    for (const id of relics) A.addCopy(arts, id, 'common', []);
    A.addCopy(arts, 'pink_duck', 'common', []);
    assert.strictEqual(A.equip(eq, arts, 'pink_duck'), false, 'ducks never use slots');
    assert.strictEqual(A.equip(eq, arts, 'ghost'), false, 'unknown');
    for (const id of relics.slice(0, 5)) assert.strictEqual(A.equip(eq, arts, id), true, id);
    assert.strictEqual(A.equip(eq, arts, 'rose_lantern'), false, 'already equipped');
    assert.strictEqual(A.equip(eq, arts, relics[5]), false, 'a sixth does not fit');
    assert.deepStrictEqual(eq, relics.slice(0, 5));
    assert.strictEqual(A.activeBonuses(arts, eq).spawn > 0.019 && A.activeBonuses(arts, eq).spawn < 0.021, true, 'two fixture relics count, the sixth does not');
    assert.strictEqual(A.swap(eq, arts, 'blue_compass', relics[5]), true);
    assert.deepStrictEqual(eq, ['rose_lantern', relics[5], 'mint_clock', fx[0], fx[1]], 'the swap keeps the slot');
    assert.strictEqual(A.swap(eq, arts, 'blue_compass', 'mint_clock'), false, 'out must be equipped');
    assert.strictEqual(A.swap(eq, arts, 'mint_clock', fx[0]), false, 'in must not be equipped');
    assert.strictEqual(A.swap(eq, arts, 'mint_clock', 'pink_duck'), false, 'in must use a slot');
    assert.strictEqual(A.unequip(eq, 'mint_clock'), true); assert.strictEqual(A.unequip(eq, 'mint_clock'), false);
    assert.strictEqual(eq.length, 4);
    assert.strictEqual(A.equip(eq, arts, 'blue_compass'), true);
  });
});
test('an unequipped relic gives nothing; ducks need no slot', () => {
  const arts = {};
  A.addCopy(arts, 'blue_compass', 'epic', [{ stat: 'forge', value: 0.1 }, { stat: 'payout', value: 0.05 }]); A.addCopy(arts, 'golden_duck', 'common', []);
  const off = A.activeBonuses(arts, []), on = A.activeBonuses(arts, ['blue_compass']), none = A.activeBonuses(arts);
  assert.ok(off.forge === 0 && off.payout === 1 && near(off.typePay.golden, 1.4), 'off: nothing from the relic, the duck still pays');
  assert.ok(near(on.forge, 0.3 + 0.1) && near(on.payout, 1.05), 'on: base and perks');
  assert.deepStrictEqual(none, off, 'no list = nothing equipped');
  const st = st0(); st.artifacts = arts;
  assert.strictEqual(E.stats(st).forgeBonus, 0); st.artEquip = ['blue_compass']; assert.ok(near(E.stats(st).forgeBonus, 0.4));
});
test('equippedFromSave: unique, known, owned relics only, at most five, in saved order', () => {
  withFixtureRelics((fx) => {
    const arts = {}; for (const id of ['rose_lantern', 'mint_clock', 'pink_duck'].concat(fx)) A.addCopy(arts, id, 'common', []);
    assert.deepStrictEqual(A.equippedFromSave(['mint_clock', 'mint_clock', 'ghost', 'pink_duck', 'blue_compass', 7, null, 'rose_lantern', fx[0], fx[1], fx[2]], arts), ['mint_clock', 'rose_lantern', fx[0], fx[1], fx[2]]);
    assert.deepStrictEqual(A.equippedFromSave(['mint_clock', 'rose_lantern', fx[0], fx[1], fx[2], 'blue_compass'], Object.assign({}, arts, { blue_compass: { copies: [{ id: 99, rarity: 'common', perks: [] }], active: 99 } })).length, 5, 'never more than five');
    assert.deepStrictEqual(A.equippedFromSave('mint_clock', arts), []); assert.deepStrictEqual(A.equippedFromSave(undefined, arts), []);
  });
});
test('migration v7 -> v8: every owned relic is equipped, in hall order, up to five; ducks are not', () => {
  assert.ok(SAVE_VERSION >= 8, 'the step exists; later steps may follow');
  const v7 = { version: 7, sparks: 2, artifacts: {
    mint_clock: { active: 2, copies: [{ id: 2, rarity: 'rare', perks: [] }] }, pink_duck: { active: 1, copies: [{ id: 1, rarity: 'common', perks: [] }] },
    rose_lantern: { active: 3, copies: [{ id: 3, rarity: 'epic', perks: [] }] }, blue_compass: { copies: [] }, ghost: { copies: [{ id: 4 }] } } };
  const m = JSON.parse(JSON.stringify(MIGRATIONS[7](v7)));
  assert.deepStrictEqual([m.version, m.sparks, m.artEquip], [8, 2, ['rose_lantern', 'mint_clock']]);
  assert.deepStrictEqual(m.artifacts, JSON.parse(JSON.stringify(v7.artifacts)), 'artifacts untouched');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(MIGRATIONS[7]({ version: 7 }))).artEquip, []);
  const loaded = A.fromSave(m.artifacts), eq = A.equippedFromSave(m.artEquip, loaded), b = A.activeBonuses(loaded, eq);
  assert.ok(near(b.meter, 0.25) && near(b.away, 0.2) && near(b.payout, 1.4), 'an old save plays exactly as before');
});
