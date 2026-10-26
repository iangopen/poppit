// The achievements module (src/achievements.js): the table, each ladder's test and progress at its boundaries, the view of a state,
// the earned set of fixture states, the bonus and its cap, and the multiplier in ECON.stats. Run: node tests/achievements.test.js
const test = require('node:test');
const assert = require('node:assert');
const ACH = require('../src/achievements.js'), E = require('../src/econ.js'), A = require('../src/artifacts.js');

test('about 50 achievements in at most five categories, each with an id, name, sentence, ladder, tier, test, progress and reward', () => {
  const L = ACH.ACHIEVEMENTS;
  assert.ok(L.length >= 45 && L.length <= 60, L.length + ' achievements');
  assert.ok(ACH.CATEGORIES.length <= 5 && ACH.CATEGORIES.map((c) => c.name).join() === 'Popping,Collecting,Economy,Fresh Batch,Crafting');
  assert.strictEqual(new Set(L.map((a) => a.id)).size, L.length, 'ids are unique');
  for (const a of L) {
    assert.ok(typeof a.id === 'string' && a.name && /^[A-Z].*\.$/.test(a.description) && !a.description.slice(0, -1).includes('. '), a.id + ': one sentence');
    assert.ok(ACH.CATEGORIES.some((c) => c.id === a.category) && ACH.ladderOf(a.ladder) && a.tier >= 1, a.id);
    assert.ok(typeof a.test === 'function' && typeof a.progress === 'function' && Number.isFinite(a.need) && a.need > 0, a.id);
  }
});
test('every ladder named in the brief exists, in its category', () => {
  const cat = (id) => ACH.ladderOf(id).cat;
  const want = { pops: 'popping', taps: 'popping', combo: 'popping', bestpop: 'popping', found: 'collecting', shiny: 'collecting', type: 'collecting', life: 'economy', maxed: 'economy',
    batches: 'batch', flavors: 'batch', fastest: 'batch', crafts: 'crafting', rarity: 'crafting', ducks: 'crafting', relics: 'crafting', forged: 'crafting', mats: 'crafting' };
  for (const id in want) assert.strictEqual(cat(id), want[id], id);
  const needs = (id) => ACH.ACHIEVEMENTS.filter((a) => a.ladder === id).map((a) => a.need).join();
  assert.strictEqual(needs('pops'), '100,1000,10000,100000,1000000,10000000');
  assert.strictEqual(needs('taps'), '500,5000,50000,500000');
  assert.strictEqual(needs('found'), '3,5,7,10');
  assert.strictEqual(needs('fastest'), '600,300,180');
  assert.strictEqual(needs('rarity'), '1,2,3');
  assert.deepStrictEqual(ACH.ACHIEVEMENTS.filter((a) => a.ladder === 'mats').map((a) => a.stat), ['dust', 'alloy']);
  assert.deepStrictEqual(ACH.ACHIEVEMENTS.filter((a) => a.ladder === 'type').map((a) => a.stat), E.PEARLS.map((t) => 'pop_' + t.id), 'one per pearl type, in roster order');
});
test('thresholds rise along each ladder (fall for a best time), and per-type counts fall with rarity, at least 5', () => {
  for (const L of ACH.LADDERS) {
    const xs = ACH.ACHIEVEMENTS.filter((a) => a.ladder === L.id);
    if (L.id === 'type' || L.id === 'mats') continue;
    for (let i = 1; i < xs.length; i++) assert.ok(L.lower ? xs[i].need < xs[i - 1].need : xs[i].need > xs[i - 1].need, L.id);
  }
  const t = E.PEARLS.map((p) => ACH.TYPE_POPS[p.id]);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] < t[i - 1] && t[i] >= 5, 'falling: ' + t.join());
});
test('rewards: +0.5% each, +1% for the hardest tier of every ladder', () => {
  for (const L of ACH.LADDERS) {
    const xs = ACH.ACHIEVEMENTS.filter((a) => a.ladder === L.id);
    xs.forEach((a, i) => assert.strictEqual(a.reward, i === xs.length - 1 ? 0.01 : 0.005, a.id));
  }
  assert.strictEqual(ACH.ACH_REWARD, 0.005); assert.strictEqual(ACH.ACH_REWARD_TOP, 0.01);
});
test('each test and progress at its boundary: one short is not earned, the threshold is', () => {
  for (const a of ACH.ACHIEVEMENTS) {
    const at = (x) => ({ [a.stat]: x });
    if (a.lower) { // a best time: 0 = none, under the threshold earns it, the threshold itself does not
      assert.strictEqual(a.test(at(0)), false, a.id + ' no run'); assert.strictEqual(a.test(at(a.need)), false, a.id + ' at'); assert.strictEqual(a.test(at(a.need - 1)), true, a.id + ' under');
      assert.deepStrictEqual(a.progress(at(0)), { have: 0, need: 1, best: 0 }); assert.strictEqual(a.progress(at(a.need * 2)).have, 0.5); assert.strictEqual(a.progress(at(a.need - 1)).have, 1);
      continue;
    }
    const below = a.need >= 1 ? a.need - (Number.isInteger(a.need) ? 1 : 1e-6) : 0;
    assert.strictEqual(a.test(at(below)), false, a.id + ' at ' + below); assert.strictEqual(a.test(at(a.need)), true, a.id + ' at ' + a.need); assert.strictEqual(a.test({}), false, a.id + ' empty');
    assert.deepStrictEqual(a.progress(at(below)), { have: below, need: a.need }, a.id);
    assert.deepStrictEqual(a.progress(at(a.need * 3)), { have: a.need, need: a.need }, a.id + ' capped at need');
  }
});
// a state shaped like src/world.js's, with only what the view reads
const col = (o) => Object.fromEntries(E.PEARLS.map((t) => [t.id, Object.assign({ found: false, popped: 0, sFound: false, sPopped: 0 }, o[t.id] || {})]));
test('view() reads the game state: pops with shinies, finds, upgrades at max, copies, rarity, ducks, relics, the forge', () => {
  const arts = {};
  A.addCopy(arts, 'pink_duck', 'common', []); A.addCopy(arts, 'pink_duck', 'epic', []); A.addCopy(arts, 'blue_duck', 'rare', []); A.addCopy(arts, 'rose_lantern', 'common', []);
  const st = { col: col({ pearl: { found: true, popped: 950, sPopped: 50, sFound: true }, blue: { found: true, popped: 10 } }), lifetime: 7e6, collapses: 2, echoes: 12,
    lv: Object.assign(E.zeroLevels(), { lucky: E.UPG.lucky.max, combo: E.UPG.combo.max, sharp: 98 }), stats: { taps: 42, bestCombo: 17, bestPop: 3e6, fastest: 290, crafts: 2, forged: 0, alloys: 0 },
    artifacts: arts, artEquip: ['rose_lantern'], forge: { stock: { rose_dust: 3, rosegold: 1 } } };
  const v = ACH.view(st);
  assert.strictEqual(v.pops, 1010); assert.strictEqual(v.pop_pearl, 1000); assert.strictEqual(v.found, 2); assert.strictEqual(v.shinies, 1);
  assert.strictEqual(v.maxed, 2, 'Sharp 98 of 99 is not at max');
  assert.strictEqual(v.crafts, 4, 'copies on hand are a floor for the counter'); assert.strictEqual(v.rarity, 2); assert.strictEqual(v.ducks, 2); assert.strictEqual(v.relics, 1);
  assert.strictEqual(v.forged, 4, 'stock units are a floor'); assert.strictEqual(v.dust, 1); assert.strictEqual(v.alloy, 1);
  assert.deepStrictEqual([v.taps, v.combo, v.bestPop, v.fastest, v.lifetime, v.batches, v.flavors], [42, 17, 3e6, 290, 7e6, 2, 12]);
  st.artEquip = []; assert.strictEqual(ACH.view(st).relics, 0, 'an unequipped relic does not count');
  assert.deepStrictEqual(ACH.view({}).pops, 0, 'an empty state is all zeros');
  assert.strictEqual(ACH.view({ stats: { forged: 5, alloys: 5 } }).dust, 1, 'an alloy means a dust was made');
  assert.strictEqual(ACH.view({ stats: { forged: 3 } }).dust, 1); assert.strictEqual(ACH.view({ stats: { forged: 3 } }).alloy, 0);
});
test('earned() from fixture states: a new game earns nothing; two saves earn exactly their milestones', () => {
  assert.deepStrictEqual(ACH.earned({}), []);
  assert.deepStrictEqual(ACH.earned({ col: col({ pearl: { found: true, popped: 40 } }), lifetime: 3000, lv: E.zeroLevels() }), []);
  const mid = { col: col({ pearl: { found: true, popped: 900 }, blue: { found: true, popped: 900 }, mint: { found: true, popped: 900 }, golden: { found: true, popped: 900 } }), lifetime: 8e5, lv: Object.assign(E.zeroLevels(), { board: 2 }) };
  assert.deepStrictEqual(ACH.earned(mid), ['pops1', 'pops2', 'found1', 'type_mint', 'type_golden', 'maxed1']);
  const vet = { col: col({ pearl: { found: true, popped: 12000 }, blue: { found: true, popped: 1300, sFound: true, sPopped: 1 } }), lifetime: 2e9, collapses: 10, echoes: 120, lv: E.zeroLevels(), stats: { taps: 6000, bestCombo: 61, bestPop: 2e6, fastest: 250 } };
  assert.deepStrictEqual(ACH.earned(vet), ['pops1', 'pops2', 'pops3', 'taps1', 'taps2', 'combo1', 'combo2', 'combo3', 'bestpop1', 'shiny1', 'type_pearl', 'type_blue', 'life1', 'life2', 'batches1', 'batches2', 'flavors1', 'flavors2', 'fastest1', 'fastest2']);
});
test('the bonus: each known id once, unknown ids ignored, never above the cap', () => {
  assert.strictEqual(ACH.bonus([]), 0); assert.strictEqual(ACH.bonus(undefined), 0); assert.strictEqual(ACH.mult(), 1);
  assert.strictEqual(ACH.bonus(['pops1', 'pops6']), 0.015);
  assert.strictEqual(ACH.bonus(['pops1', 'pops1', 'nope', 7]), 0.005, 'no double count');
  const all = ACH.ACHIEVEMENTS.map((a) => a.id);
  assert.strictEqual(ACH.bonus(all), ACH.ACH_CAP); assert.strictEqual(ACH.mult(all), 1.375); assert.strictEqual(ACH.ACH_CAP, 0.375);
  // twenty +0.5% steps are exactly +10%
  assert.strictEqual(ACH.bonus(ACH.ACHIEVEMENTS.filter((a) => a.reward === 0.005).slice(0, 20).map((a) => a.id)), 0.1);
});
// the guard for future additions: every achievement must keep paying, so the table's total may never pass the cap
const capHolds = (list) => ACH.total(list) <= ACH.ACH_CAP;
test('the cap equals the table total, so every achievement pays; a table past the cap fails the check', () => {
  assert.strictEqual(ACH.total(), ACH.ACH_CAP, 'total ' + ACH.total() + ' vs cap ' + ACH.ACH_CAP);
  assert.ok(capHolds(ACH.ACHIEVEMENTS), 'the table fits under the cap');
  // each achievement adds its full reward, the last one too
  const all = ACH.ACHIEVEMENTS.map((a) => a.id);
  for (const id of all) assert.strictEqual(ACH.bonus(all), Math.round((ACH.bonus(all.filter((x) => x !== id)) + ACH.byId(id).reward) * 1e6) / 1e6, id + ' pays');
  // an over-cap fixture: one more +0.5% achievement makes the same check fail
  const over = ACH.ACHIEVEMENTS.concat([{ id: 'fixture_extra', reward: ACH.ACH_REWARD }]);
  assert.strictEqual(capHolds(over), false, 'a table past the cap is caught');
  assert.throws(() => assert.ok(capHolds(over)), /AssertionError|false/);
});
test('fromSave keeps known string ids once, in saved order', () => {
  assert.deepStrictEqual(ACH.fromSave(['taps1', 'pops1', 'taps1', 'zzz', 3, null, { id: 'pops2' }]), ['taps1', 'pops1']);
  assert.deepStrictEqual(ACH.fromSave('pops1'), []); assert.deepStrictEqual(ACH.fromSave(undefined), []);
});
test('ECON.stats: achMult is 1 + the bonus, and pop values and the helper idle rate scale by exactly that', () => {
  const st = { lv: Object.assign(E.zeroLevels(), { auto: 4, lucky: 3, mint: 2, coral: 1, golden: 1, violet: 1 }), echoes: 3, equip: -1, toolUp: {}, artifacts: {}, artEquip: [] };
  const S0 = E.stats(st); assert.strictEqual(S0.achMult, 1, 'no achieved list: x1, so the sim is unchanged');
  st.achieved = ['pops1', 'pops2', 'pops6']; const S1 = E.stats(st);
  assert.strictEqual(S1.achMult, 1.02);
  for (const k of ['pearl', 'blue', 'golden']) for (const fr of [false, true]) {
    const r = E.popValue(S1, 7, fr, k) / E.popValue(S0, 7, fr, k); assert.ok(Math.abs(r - 1.02) < 1e-12, k + ' ' + r);
  }
  const pool = ['pearl', 'blue', 'mint', 'golden', 'violet', 'coral'], r = E.idleRate(S1, pool, st.lv) / E.idleRate(S0, pool, st.lv);
  assert.ok(Math.abs(r - 1.02) < 1e-12, 'helpers and frenzy in the away rate: ' + r);
  st.achieved = ACH.ACHIEVEMENTS.map((a) => a.id); assert.strictEqual(E.stats(st).achMult, 1 + ACH.ACH_CAP);
});
