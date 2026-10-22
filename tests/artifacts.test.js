// The artifacts module (src/artifacts.js): copies, the pedestal, rarity rolls and perks, the Hall of Relics, and the bonuses in the economy.
const test = require('node:test'), assert = require('node:assert');
const A = require('../src/artifacts.js'), E = require('../src/econ.js');
const { MIGRATIONS } = loadSave(); // save.js is a page script that reads ECON as a global
function loadSave() { const vm = require('node:vm'), fs = require('node:fs'), ctx = { ECON: E, TextEncoder, TextDecoder, btoa, atob }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(require.resolve('../src/save.js'), 'utf8') + ';this.MIGRATIONS = MIGRATIONS;', ctx); return ctx; }
const inv0 = (n) => ({ pearl: n, 'pearl:s': 40, blue: 7 });
function mulberry32(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; }; // a scripted rng
const near = (a, b) => Math.abs(a - b) < 1e-12;

test('the Pink Duck: hall ducks, costs 10,000 Rose Pearls then a quarter of that, pays x1.4 from one constant', () => {
  const d = A.byId('pink_duck');
  assert.deepStrictEqual([d.hall, d.name, d.cost, d.repeatFactor, d.costGrowth, d.bonus], ['ducks', 'Pink Duck', [{ kind: 'pearl', qty: 10000 }], 0.25, 1, { type: 'payout', value: 1.4 }]);
  for (const a of A.ARTIFACTS.filter((x) => x.hall === 'relics')) assert.strictEqual(a.repeatFactor, 1, a.id + ' repeats at full price');
  assert.strictEqual(A.PINK_DUCK_PAYOUT, 1.4); assert.strictEqual(d.bonus.value, A.PINK_DUCK_PAYOUT);
  for (const a of A.ARTIFACTS) {
    assert.ok(a.id && a.hall && a.name && a.description && a.cost.length && a.bonus, a.id); assert.ok(A.HALLS.some((h) => h.id === a.hall), a.id + ' has a hall');
    assert.ok(A.STATS.includes(a.bonus.type) && a.bonus.value > 1, a.id + ' bonus');
  }
});
test('the Hall of Relics: three relics costing alloys only, utility bonuses only', () => {
  assert.deepStrictEqual(A.HALLS.map((h) => h.id), ['ducks', 'relics']);
  assert.strictEqual(A.HALLS[1].name, A.RELIC_HALL_NAME); assert.strictEqual(A.RELIC_HALL_NAME, 'Hall of Relics');
  const relics = A.ARTIFACTS.filter((a) => a.hall === 'relics'), F = require('../src/forge.js');
  const line = (a) => a.cost.map((c) => c.qty + ' ' + c.id).join(' + ') + ' -> ' + a.bonus.type + ' x' + a.bonus.value;
  assert.deepStrictEqual(relics.map((a) => a.name + ': ' + line(a)), [
    'Rose Lantern: 2 rosegold -> meter x1.25',
    'Blue Compass: 2 azure_steel + 1 rosegold -> forge x1.3',
    'Mint Clock: 2 mintsilver + 1 azure_steel -> away x1.2',
  ]);
  for (const a of relics) { assert.ok(a.cost.every((c) => c.kind === 'material' && F.isAlloy(c.id)), a.id + ' costs alloys only'); assert.notStrictEqual(a.bonus.type, 'payout'); }
});
test('crafting consumes exactly 10,000 Rose Pearls and their share of stored value, and returns the copy', () => {
  const inv = inv0(12345), invV = { pearl: 24690, 'pearl:s': 400, blue: 70 }, arts = {};
  assert.strictEqual(A.canCraft('pink_duck', inv, arts), true);
  const c = A.craft('pink_duck', inv, arts, invV, undefined, () => 0);
  assert.deepStrictEqual(c, { id: 1, art: 'pink_duck', rarity: 'common', perks: [] });
  assert.deepStrictEqual(inv, { pearl: 2345, 'pearl:s': 40, blue: 7 }, 'only normal Rose Pearls are spent');
  assert.ok(Math.abs(invV.pearl - 24690 * 2345 / 12345) < 1e-9 && invV['pearl:s'] === 400);
  assert.deepStrictEqual(arts, { pink_duck: { copies: [c], active: 1 } }, 'the first copy goes on the pedestal');
  const exact = inv0(10000), v = { pearl: 20000 }; A.craft('pink_duck', exact, {}, v);
  assert.strictEqual(exact.pearl, 0); assert.strictEqual(v.pearl, 0);
});
test('an owned artifact crafts again; later copies never replace the active one', () => {
  const inv = inv0(35000), arts = {};
  const a = A.craft('pink_duck', inv, arts, null, null, () => 0), b = A.craft('pink_duck', inv, arts, null, null, () => 0.999), c = A.craft('pink_duck', inv, arts, null, null, () => 0.5);
  assert.deepStrictEqual([a.id, b.id, c.id], [1, 2, 3]); assert.strictEqual(b.rarity, 'mythic');
  assert.strictEqual(inv.pearl, 20000, '10,000 for the first, then 2,500 each (repeatFactor 0.25, costGrowth 1)');
  assert.strictEqual(A.count(arts, 'pink_duck'), 3); assert.strictEqual(arts.pink_duck.active, 1); assert.strictEqual(A.activeCopy(arts, 'pink_duck'), a);
  inv.pearl = 2499; assert.strictEqual(A.craft('pink_duck', inv, arts), null, 'short: nothing spent'); assert.strictEqual(inv.pearl, 2499);
});
test('cannot craft short, and shiny Roses do not count', () => {
  const inv = { pearl: 9999, 'pearl:s': 5000 }, arts = {};
  assert.strictEqual(A.canCraft('pink_duck', inv, arts), false);
  assert.strictEqual(A.craft('pink_duck', inv, arts), null);
  assert.deepStrictEqual([inv, arts], [{ pearl: 9999, 'pearl:s': 5000 }, {}]);
  assert.strictEqual(A.canCraft('pink_duck', {}, {}), false); assert.strictEqual(A.canCraft('no_such_duck', inv0(1e6), {}), false);
});
test('repeat crafts: the first costs the base, later ones base x repeatFactor x costGrowth^(copies - 1), rounded up', () => {
  const d = A.byId('pink_duck'), g0 = d.costGrowth, r0 = d.repeatFactor;
  try {
    const arts = {}, inv = { pearl: 1e6 };
    assert.deepStrictEqual(A.craftCost('pink_duck', arts), [{ kind: 'pearl', qty: 10000 }]);
    A.craft('pink_duck', inv, arts); assert.deepStrictEqual(A.craftCost('pink_duck', arts), [{ kind: 'pearl', qty: 2500 }], 'repeatFactor 0.25');
    d.costGrowth = 1.5;
    assert.strictEqual(A.craftCost('pink_duck', arts)[0].qty, 2500, 'growth^0 for the second copy');
    A.craft('pink_duck', inv, arts); assert.strictEqual(inv.pearl, 1e6 - 12500);
    assert.strictEqual(A.craftCost('pink_duck', arts)[0].qty, 3750);
    A.craft('pink_duck', inv, arts); assert.strictEqual(A.craftCost('pink_duck', arts)[0].qty, 5625);
    d.costGrowth = 1.1; assert.strictEqual(A.craftCost('pink_duck', arts)[0].qty, Math.ceil(2500 * 1.21), 'no float overcharge');
    delete d.costGrowth; delete d.repeatFactor; assert.strictEqual(A.craftCost('pink_duck', arts)[0].qty, 10000, 'no fields = 1');
    const stock = { rosegold: 4 }, ra = {}; A.craft('rose_lantern', {}, ra, null, stock);
    assert.deepStrictEqual(A.craftCost('rose_lantern', ra), [{ kind: 'material', id: 'rosegold', qty: 2 }], 'relics repeat at full price');
  } finally { d.costGrowth = g0; d.repeatFactor = r0; }
  assert.strictEqual(A.byId('pink_duck').cost[0].qty, 10000, 'the table itself never changes');
});
test('a relic crafts from alloys and leaves the rest of the stock alone', () => {
  const stock = { rosegold: 3, azure_steel: 2, rose_dust: 9, mintsilver: 1 }, inv = { pearl: 50 }, arts = {};
  assert.strictEqual(A.canCraft('mint_clock', inv, arts, stock), false, 'one Mintsilver short');
  const c = A.craft('blue_compass', inv, arts, null, stock, () => 0);
  assert.ok(c && c.art === 'blue_compass');
  assert.deepStrictEqual(stock, { rosegold: 2, rose_dust: 9, mintsilver: 1 }, '2 Azure Steel and 1 Rosegold spent; spent-out alloys leave the stock');
  assert.deepStrictEqual(inv, { pearl: 50 });
  const l = A.craft('rose_lantern', inv, arts, null, stock, () => 0);
  assert.ok(l); assert.deepStrictEqual(stock, { rose_dust: 9, mintsilver: 1 });
});
test('rarity distribution over 200,000 seeded rolls is 55 / 30 / 12 / 3 within tolerance', () => {
  const rng = mulberry32(12345), n = 200000, got = { common: 0, rare: 0, epic: 0, mythic: 0 };
  for (let i = 0; i < n; i++) { const r = A.roll(rng); got[r.rarity]++; assert.strictEqual(r.perks.length, A.rarityById(r.rarity).perks); }
  assert.deepStrictEqual(A.RARITIES.map((r) => [r.id, r.weight, r.perks]), [['common', 55, 0], ['rare', 30, 1], ['epic', 12, 2], ['mythic', 3, 3]]);
  for (const r of A.RARITIES) {
    const p = r.weight / 100, sd = Math.sqrt(p * (1 - p) / n), share = got[r.id] / n;
    assert.ok(Math.abs(share - p) < 5 * sd, r.id + ' ' + share + ' vs ' + p);
  }
});
test('perks: six stats with existing hooks; each copy has distinct perks within min x range and the cap', () => {
  assert.deepStrictEqual(A.PERKS.map((p) => p.stat), ['payout', 'shiny', 'frenzy', 'away', 'forge', 'spawn']);
  for (const p of A.PERKS) assert.ok(p.min > 0 && p.min < p.max && p.max <= p.cap, p.stat);
  const rng = mulberry32(7), seen = {};
  for (let i = 0; i < 50000; i++) {
    const r = A.roll(rng), rar = A.rarityById(r.rarity);
    assert.strictEqual(new Set(r.perks.map((p) => p.stat)).size, r.perks.length, 'distinct');
    for (const p of r.perks) {
      const d = A.perkById(p.stat); seen[p.stat] = (seen[p.stat] || 0) + 1;
      assert.ok(p.value >= d.min && p.value <= Math.min(d.cap, d.max * rar.range + 1e-9), p.stat + ' ' + p.value);
    }
  }
  assert.strictEqual(Object.keys(seen).length, 6, 'every stat comes up');
  const capped = A.roll(seq(0.9999, 0, 0.9999, 0, 0.9999, 0, 0.9999)); // Mythic, every value at its top
  assert.strictEqual(capped.rarity, 'mythic');
  for (const p of capped.perks) { const d = A.perkById(p.stat); assert.ok(near(p.value, Math.min(d.cap, Math.round(1000 * (d.min + 0.9999 * (d.max - d.min)) * 2.5) / 1000)), p.stat); assert.ok(p.value <= d.cap); }
});
test('the retune: Rare x1, Epic x1.5, Mythic x2.5 ranges; caps payout 20%, shiny, frenzy, away and forge 40%, spawn 20%', () => {
  assert.deepStrictEqual(A.RARITIES.map((r) => r.range), [1, 1, 1.5, 2.5]);
  assert.deepStrictEqual(A.PERKS.map((p) => p.stat + ' ' + p.cap), ['payout 0.2', 'shiny 0.4', 'frenzy 0.4', 'away 0.4', 'forge 0.4', 'spawn 0.2']);
  for (const p of A.PERKS) assert.ok(p.max * 2.5 <= p.cap + 1e-12, p.stat + ': a top Mythic roll never needs clamping');
  const old = { pink_duck: { active: 1, copies: [{ id: 1, rarity: 'mythic', perks: [{ stat: 'payout', value: 0.1 }, { stat: 'shiny', value: 0.25 }, { stat: 'spawn', value: 0.12 }] }] } };
  assert.deepStrictEqual(A.fromSave(old).pink_duck.copies[0].perks.map((p) => p.value), [0.1, 0.25, 0.12], 'a save at the old caps loads unchanged');
});
test('only the active copy counts, and swapping changes the bonuses', () => {
  const arts = {};
  A.addCopy(arts, 'pink_duck', 'common', []);
  const r = A.addCopy(arts, 'pink_duck', 'epic', [{ stat: 'payout', value: 0.05 }, { stat: 'away', value: 0.1 }]);
  let b = A.activeBonuses(arts);
  assert.ok(near(b.payout, 1.4) && b.away === 0, 'the Common copy is on the pedestal');
  assert.strictEqual(A.setActive(arts, 'pink_duck', r.id), true);
  b = A.activeBonuses(arts);
  assert.ok(near(b.payout, 1.4 * 1.05) && near(b.away, 0.1), 'base x1.4 kept, perk payout multiplies, the rest adds');
  assert.strictEqual(A.setActive(arts, 'pink_duck', 99), false); assert.strictEqual(A.setActive(arts, 'mint_clock', r.id), false);
  assert.strictEqual(arts.pink_duck.active, r.id);
  A.addCopy(arts, 'mint_clock', 'rare', [{ stat: 'away', value: 0.05 }]);
  b = A.activeBonuses(arts); assert.ok(near(b.away, 0.1 + 0.2 + 0.05), 'other stats add across artifacts');
  assert.strictEqual(A.setActive(arts, 'pink_duck', 1), true); assert.ok(near(A.payoutMult(arts), 1.4), 'and back, freely');
  assert.strictEqual(A.payoutMult(undefined), 1); assert.strictEqual(A.payoutMult({}), 1); assert.strictEqual(A.payoutMult({ pink_duck: true }), 1, 'the old shape counts for nothing');
});
test('the active bonuses reach every hook in stats(): payout, helpers, away, shiny, frenzy, meter, spawn, forge', () => {
  const st = { lv: Object.assign(E.zeroLevels(), { auto: 3, lucky: 2, shiny: 2, spawn: 3 }), echoes: 4, equip: -1, toolUp: {}, artifacts: {} };
  const S0 = E.stats(st);
  assert.deepStrictEqual([S0.artMult, S0.shinyBonus, S0.frenzySecs, S0.meterMult, S0.awayShare, S0.forgeBonus], [1, 0, E.FRENZY_SECS, 1, E.AWAY_SHARE, 0]);
  A.addCopy(st.artifacts, 'pink_duck', 'mythic', [{ stat: 'payout', value: 0.1 }, { stat: 'shiny', value: 0.2 }, { stat: 'frenzy', value: 0.25 }]);
  A.addCopy(st.artifacts, 'mint_clock', 'epic', [{ stat: 'spawn', value: 0.1 }, { stat: 'forge', value: 0.15 }]);
  A.addCopy(st.artifacts, 'rose_lantern', 'common', []); A.addCopy(st.artifacts, 'blue_compass', 'common', []);
  const S1 = E.stats(st), pm = 1.4 * 1.1;
  assert.ok(near(S1.artMult, pm));
  for (const [combo, fr, kind] of [[0, false, 'pearl'], [12, false, 'blue'], [0, true, 'black']]) assert.ok(near(E.popValue(S1, combo, fr, kind) / E.popValue(S0, combo, fr, kind), pm), kind);
  assert.ok(near(S1.shinyBonus, 0.2) && near(E.shinyChance(st.lv, S1.shinyBonus), E.shinyChance(st.lv) * 1.2));
  assert.ok(near(S1.frenzySecs, E.FRENZY_SECS * 1.25) && near(S1.meterMult, 1.25) && near(S1.awayShare, 0.5 * 1.2));
  assert.ok(near(S1.spawnEvery, S0.spawnEvery / 1.1) && near(S1.forgeBonus, 0.3 + 0.15));
  // helpers and the away bonus: the same pricing with only the payout perk differs by the payout factor
  const pool = E.PEARLS.map((t) => t.id), only = { lv: st.lv, echoes: 4, equip: -1, toolUp: {}, artifacts: {} };
  A.addCopy(only.artifacts, 'pink_duck', 'rare', [{ stat: 'payout', value: 0.08 }]);
  assert.ok(Math.abs(E.idleRate(E.stats(only), pool, st.lv) / E.idleRate(S0, pool, st.lv) - 1.4 * 1.08) < 1e-12, 'helper pops pay the active payout perk');
  assert.ok(E.idleRate(S1, pool, st.lv) > E.idleRate(E.stats(only), pool, st.lv) * 1.1 / 1.08, 'shiny, frenzy, meter and spawn perks raise the idle rate too');
});
test('migration v5 -> v6: an owned duck becomes one Common copy with no perks, on its pedestal, paying the same', () => {
  const m = JSON.parse(JSON.stringify(MIGRATIONS[5]({ version: 5, sparks: 3, artifacts: { pink_duck: true, ghost: 'x' } }))); // out of the vm realm
  assert.deepStrictEqual(m, { version: 6, sparks: 3, artifacts: { pink_duck: { copies: [{ id: 1, art: 'pink_duck', rarity: 'common', perks: [] }], active: 1 } } });
  assert.strictEqual(JSON.stringify(MIGRATIONS[5]({ version: 5 }).artifacts), '{}');
  const loaded = A.fromSave(m.artifacts);
  assert.strictEqual(A.payoutMult(loaded), A.PINK_DUCK_PAYOUT);
  const st = { lv: E.zeroLevels(), echoes: 2, equip: -1, toolUp: {} };
  const before = E.stats(Object.assign({}, st, { artifacts: {} })), after = E.stats(Object.assign({}, st, { artifacts: loaded }));
  assert.ok(near(after.artMult, 1.4) && after.shinyBonus === 0 && after.awayShare === before.awayShare && after.spawnEvery === before.spawnEvery && after.frenzySecs === before.frenzySecs);
});
test('fromSave clamps: unknown ids, bad rarities and ids, repeated or unknown perks, values to min..cap, the active copy', () => {
  const d = {
    pink_duck: { active: 77, copies: [
      { id: 4, rarity: 'mythic', perks: [{ stat: 'payout', value: 9 }, { stat: 'payout', value: 0.03 }, { stat: 'luck', value: 0.1 }, { stat: 'away', value: -1 }, { stat: 'spawn', value: 'x' }, { stat: 'forge', value: 0.1 }, { stat: 'shiny', value: 0.1 }] },
      { id: 4, rarity: 'rare', perks: [] }, { id: 5, rarity: 'legendary', perks: [] }, { id: 0, rarity: 'common' }, { id: 1.5, rarity: 'common' }, null,
      { id: 6, rarity: 'rare', perks: [{ stat: 'shiny', value: 0.07 }, { stat: 'frenzy', value: 0.07 }] },
    ] },
    mint_clock: { active: 9, copies: [{ id: 9, rarity: 'common', perks: [{ stat: 'away', value: 0.1 }] }] },
    golden_goose: { active: 1, copies: [{ id: 1, rarity: 'common', perks: [] }] }, rose_lantern: true, blue_compass: { copies: [] },
  };
  const out = A.fromSave(d), P = (s) => A.perkById(s);
  assert.deepStrictEqual(Object.keys(out), ['pink_duck', 'mint_clock']);
  assert.deepStrictEqual(out.pink_duck.copies.map((c) => [c.id, c.rarity, c.perks.map((p) => p.stat + '=' + p.value).join()]), [
    [4, 'mythic', 'payout=' + P('payout').cap + ',away=' + P('away').min + ',forge=0.1'],
    [6, 'rare', 'shiny=0.07'],
  ], 'perks capped by the rarity count, distinct, known, clamped');
  assert.strictEqual(out.pink_duck.active, 4, 'an active id that is not owned falls back to the first copy');
  assert.deepStrictEqual(out.mint_clock, { active: 9, copies: [{ id: 9, art: 'mint_clock', rarity: 'common', perks: [] }] }, 'a Common copy has no perks');
  assert.deepStrictEqual(A.fromSave(undefined), {}); assert.deepStrictEqual(A.fromSave([1]), {}); assert.deepStrictEqual(A.fromSave({ pink_duck: true }), {});
  const round = A.fromSave(JSON.parse(JSON.stringify(out))); assert.deepStrictEqual(round, out, 'a clean save loads unchanged: no re-roll');
});
