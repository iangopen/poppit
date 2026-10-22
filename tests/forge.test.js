// The forge engine (src/forge.js): dust and alloy recipes, jobs on timestamps, speed, Strike, slots, upgrades, saves, material costs.
const test = require('node:test'), assert = require('node:assert');
const F = require('../src/forge.js'), E = require('../src/econ.js'), A = require('../src/artifacts.js');
const T = 1.7e12, S = 1000; // a fixed "now" in ms
const inv0 = () => ({ pearl: 250, 'pearl:s': 9, blue: 140 });
const pin = (m) => m.recipe.inputs[0]; // a dust's one pearl input

test('one material per pearl type, in roster order, named from the type', () => {
  assert.deepStrictEqual(F.MATERIALS.map((m) => pin(m).id), E.PEARLS.map((t) => t.id));
  assert.deepStrictEqual(F.MATERIALS.map((m) => m.name), ['Rose Dust', 'Blue Dust', 'Mint Dust', 'Golden Dust', 'Violet Dust', 'Coral Dust', 'Marble Dust', 'Opal Dust', 'Ruby Dust', 'Black Dust']);
  for (const m of F.MATERIALS) { assert.ok(/_dust$/.test(m.id) && m.recipe.inputs.length === 1 && pin(m).kind === 'pearl' && Number.isInteger(pin(m).qty) && pin(m).qty > 0 && m.recipe.secs > 0, m.id); assert.strictEqual(F.byId(m.id), m); }
  assert.strictEqual(new Set(F.MATERIALS.map((m) => m.id)).size, F.MATERIALS.length);
});
test('quantity falls and time doubles per roster position, Rose 100 / 30 s to Black 3 / about 4 h', () => {
  const r = F.MATERIALS.map((m) => ({ qty: pin(m).qty, secs: m.recipe.secs }));
  assert.deepStrictEqual([r[0].qty, r[0].secs], [100, 30]);
  assert.strictEqual(r[9].qty, 3); assert.ok(r[9].secs >= 3.5 * 3600 && r[9].secs <= 4.5 * 3600, r[9].secs);
  for (let i = 1; i < r.length; i++) { assert.ok(r[i].qty < r[i - 1].qty, 'qty falls at ' + i); assert.strictEqual(r[i].secs, 2 * r[i - 1].secs, 'time doubles at ' + i); }
});
test('starting a job takes exactly the recipe, normal pearls only, and plans the end', () => {
  const f = F.blank(), inv = inv0(), invV = { pearl: 500, 'pearl:s': 90, blue: 1400 };
  assert.strictEqual(F.start(f, 0, 'rose_dust', inv, T, invV), true);
  assert.deepStrictEqual(inv, { pearl: 150, 'pearl:s': 9, blue: 140 });
  assert.strictEqual(invV.pearl, 300); assert.strictEqual(invV['pearl:s'], 90);
  assert.deepStrictEqual(f.slots[0], { mat: 'rose_dust', start: T, end: T + 30 * S });
});
test('a job cannot start short, in a busy or missing slot, or for an unknown material', () => {
  const f = F.blank(), inv = { pearl: 99, 'pearl:s': 500 };
  assert.strictEqual(F.start(f, 0, 'rose_dust', inv, T), false, 'short (shinies do not count)');
  inv.pearl = 300; assert.strictEqual(F.start(f, 1, 'rose_dust', inv, T), false, 'only one slot');
  assert.strictEqual(F.start(f, 0, 'gold_bar', inv, T), false);
  assert.strictEqual(F.start(f, 0, 'rose_dust', inv, T), true); assert.strictEqual(F.start(f, 0, 'rose_dust', inv, T), false, 'busy');
  assert.strictEqual(inv.pearl, 200, 'failed starts take nothing');
});
test('progress and finish by timestamp; collect finishes every done job', () => {
  const f = F.blank(); F.start(f, 0, 'blue_dust', inv0(), T);
  assert.strictEqual(F.progress(f, 0, T), 0); assert.strictEqual(F.progress(f, 0, T + 30 * S), 0.5); assert.strictEqual(F.secsLeft(f, 0, T + 45 * S), 15);
  assert.strictEqual(F.finish(f, 0, T + 60 * S - 1), null, 'one ms early is not done');
  assert.strictEqual(F.finish(f, 0, T + 60 * S), 'blue_dust');
  assert.deepStrictEqual([f.stock, f.slots], [{ blue_dust: 1 }, [null]]);
  assert.strictEqual(F.finish(f, 0, T + 99 * S), null, 'nothing to finish twice');
});
test('offline: a load long after the end finishes every job whose end has passed', () => {
  const f = F.blank(); f.lv.slot = 2; f.slots = [null, null, null]; const inv = { pearl: 1000, black: 3 };
  F.start(f, 0, 'rose_dust', inv, T); F.start(f, 1, 'rose_dust', inv, T); F.start(f, 2, 'black_dust', inv, T);
  const back = F.fromSave(JSON.parse(JSON.stringify(F.toSave(f, T + 5 * S))));
  assert.strictEqual(F.collect(back, T + 3600 * S), 2, 'the Rose jobs, not the 4 h Black job');
  assert.deepStrictEqual(back.stock, { rose_dust: 2 }); assert.strictEqual(back.slots[2].mat, 'black_dust');
  assert.strictEqual(F.collect(back, T + 15360 * S), 1); assert.deepStrictEqual(back.stock, { rose_dust: 2, black_dust: 1 });
});
test('a clock that jumps backwards never finishes a job early', () => {
  const f = F.blank(); F.start(f, 0, 'rose_dust', inv0(), T); const end = f.slots[0].end;
  const back = T - 3600 * S;
  assert.strictEqual(F.progress(f, 0, back), 0); assert.strictEqual(F.collect(f, back), 0);
  F.setFrenzy(f, true, back); // re-timed from the start, not from the earlier clock
  assert.strictEqual(f.slots[0].end, T + 15 * S, 'frenzy from the start is the most it can gain');
  F.setFrenzy(f, false, back); assert.strictEqual(f.slots[0].end, end, 'and off again restores it');
  for (let i = 0; i < 5; i++) F.strike(f, back + i);
  assert.ok(f.slots[0].end >= T, 'strikes never move the end before the start');
  assert.strictEqual(F.collect(f, back + 10 * S), 0);
  const saved = F.fromSave(F.toSave(f, back));
  assert.ok(saved.slots[0].end >= saved.slots[0].start && F.collect(saved, back) === 0);
});
test('speed: +25% per Forge Speed level, x2 in frenzy, and running jobs are re-timed', () => {
  assert.deepStrictEqual([0, 1, 4, 10].map((l) => F.speedFactor(l, false)), [1, 1.25, 2, 3.5]);
  assert.strictEqual(F.speedFactor(10, true), 7); assert.strictEqual(F.speedFactor(0, true), 2);
  const f = F.blank(); F.start(f, 0, 'mint_dust', { mint: 45 }, T); // 120 s
  F.setFrenzy(f, true, T + 60 * S); assert.strictEqual(f.slots[0].end, T + 90 * S, 'half the work left, at x2');
  F.setFrenzy(f, false, T + 70 * S); assert.strictEqual(f.slots[0].end, T + 110 * S, '20 s of work done at x2, 40 s left at x1');
  f.lv.speed = 4; F.setRate(f, F.speedFactor(4, false), T + 70 * S); assert.strictEqual(f.slots[0].end, T + 90 * S);
  const g = F.blank(); g.lv.speed = 4; g.rate = F.baseRate(g); F.start(g, 0, 'rose_dust', { pearl: 100 }, T); assert.strictEqual(g.slots[0].end, T + 15 * S, 'new jobs use the current speed');
});
test('Strike: 1 s off the running job, at most 5 per second', () => {
  const f = F.blank(); F.start(f, 0, 'golden_dust', { golden: 30 }, T); const end = f.slots[0].end;
  const ok = [0, 100, 200, 300, 400, 500].map((ms) => F.strike(f, T + ms));
  assert.deepStrictEqual(ok, [true, true, true, true, true, false]);
  assert.strictEqual(f.slots[0].end, end - 5 * S);
  assert.strictEqual(F.strike(f, T + 1000), true, 'the first strike left the window');
  assert.strictEqual(F.STRIKE_SECS, 1); assert.strictEqual(F.STRIKE_CAP, 5);
  const g = F.blank(); F.start(g, 0, 'rose_dust', { pearl: 100 }, T);
  for (let i = 0; i < 40; i++) F.strike(g, T + 29 * S + i * 250);
  assert.ok(g.slots[0].end >= T + 29 * S, 'a strike never pushes the end into the past');
  assert.strictEqual(F.strike(F.blank(), T), false, 'nothing running');
});
test('slots: one at the start, one more per Extra Slot level, up to 4', () => {
  const f = F.blank(); assert.strictEqual(F.slotCount(f), 1);
  let sparks = 1e12; for (let i = 0; i < 5; i++) sparks -= F.buy(f, 'slot', sparks, T);
  assert.strictEqual(f.lv.slot, 3); assert.strictEqual(F.slotCount(f), 4); assert.strictEqual(f.slots.length, 4);
  const inv = { pearl: 1000 };
  for (let i = 0; i < 4; i++) assert.strictEqual(F.start(f, i, 'rose_dust', inv, T), true, 'slot ' + i);
  assert.strictEqual(F.start(f, 4, 'rose_dust', inv, T), false);
});
test('upgrade prices grow steeply, buying stops at the cap and when juice is short', () => {
  assert.deepStrictEqual([0, 1, 2].map((l) => F.upgCost('speed', l)), [20000, 56000, 156800]);
  assert.deepStrictEqual([0, 1, 2].map((l) => F.upgCost('slot', l)), [250000, 2500000, 25000000]);
  assert.deepStrictEqual([F.UPG.speed.max, F.UPG.slot.max], [10, 3]);
  const f = F.blank();
  assert.strictEqual(F.buy(f, 'speed', 19999, T), 0); assert.strictEqual(f.lv.speed, 0);
  assert.strictEqual(F.buy(f, 'speed', 20000, T), 20000); assert.strictEqual(f.lv.speed, 1); assert.strictEqual(f.rate, 1.25);
  f.lv.speed = 10; assert.strictEqual(F.canBuy(f, 'speed', 1e30), false); assert.strictEqual(F.buy(f, 'speed', 1e30, T), 0);
  assert.strictEqual(F.buy(f, 'nope', 1e30, T), 0);
});
test('saves: ends are stored at the no-frenzy speed, and loading clamps', () => {
  const f = F.blank(); F.start(f, 0, 'rose_dust', { pearl: 100 }, T); F.setFrenzy(f, true, T); f.stock.rose_dust = 4;
  const s = F.toSave(f, T + 10 * S);
  assert.deepStrictEqual(s, { slots: [{ mat: 'rose_dust', start: T, end: T + 10 * S + 10 * S }], stock: { rose_dust: 4 }, lv: { speed: 0, slot: 0 } }, '20 s of work done at x2, 10 s left at x1');
  assert.strictEqual(f.slots[0].end, T + 15 * S, 'the live forge keeps its frenzy timing');
  const b = F.fromSave(JSON.parse(JSON.stringify(s)));
  assert.deepStrictEqual([b.slots, b.stock, b.lv, b.rate, b.frenzy], [s.slots, s.stock, s.lv, 1, false]);
  const bad = F.fromSave({ slots: [{ mat: 'gold', start: 1, end: 2 }, { mat: 'rose_dust', start: 5, end: 9e15 }], stock: { rose_dust: -3, blue_dust: 2.7, x: 5 }, lv: { speed: 99, slot: 'a' } });
  assert.deepStrictEqual([bad.slots, bad.stock, bad.lv], [[null], { blue_dust: 2 }, { speed: 10, slot: 0 }]);
  const two = F.fromSave({ slots: [null, { mat: 'rose_dust', start: 5, end: 9e15 }], lv: { slot: 1 } });
  assert.deepStrictEqual(two.slots, [null, { mat: 'rose_dust', start: 5, end: 5 + 30 * S }], 'an end beyond the recipe is clamped');
  assert.deepStrictEqual(F.fromSave(undefined).slots, [null]); assert.deepStrictEqual(F.fromSave([1, 2]).lv, { speed: 0, slot: 0 });
});
test('artifact costs accept material lines (fixture artifact, not a real one)', () => {
  const fx = { id: 'test_fixture', hall: 'ducks', name: 'Fixture', description: 'test only', cost: [{ kind: 'material', id: 'rose_dust', qty: 2 }, { kind: 'pearl', qty: 50 }], bonus: { type: 'payout', value: 1 } };
  const n0 = A.ARTIFACTS.length; A.ARTIFACTS.push(fx);
  try {
    const inv = { pearl: 80 }, stock = { rose_dust: 1 }, owned = {};
    assert.strictEqual(A.canCraft('test_fixture', inv, owned, stock), false, 'one Rose Dust short');
    assert.strictEqual(A.canCraft('test_fixture', inv, owned), false, 'no stock passed');
    stock.rose_dust = 3;
    assert.ok(A.craft('test_fixture', inv, owned, undefined, stock));
    assert.deepStrictEqual([inv, stock, A.count(owned, 'test_fixture')], [{ pearl: 30 }, { rose_dust: 1 }, 1]);
    assert.strictEqual(A.craft('test_fixture', { pearl: 999 }, owned, undefined, { rose_dust: 1 }), null, 'short again');
    stock.rose_dust = 2; inv.pearl = 50; const o2 = {}; A.craft('test_fixture', inv, o2, undefined, stock);
    assert.deepStrictEqual(stock, {}, 'a spent-out material leaves the stock');
  } finally { A.ARTIFACTS.splice(A.ARTIFACTS.indexOf(fx), 1); }
  assert.strictEqual(A.byId('test_fixture'), null); assert.strictEqual(A.ARTIFACTS.length, n0);
});

// ---- alloys: the second tier, made from dusts ----
test('three alloys made from dusts only, as data', () => {
  const sum = (id) => F.byId(id).recipe.inputs.map((i) => i.kind + ':' + i.id + 'x' + i.qty).join(' ') + ' ' + F.byId(id).recipe.secs + 's';
  assert.deepStrictEqual(F.ALLOYS.map((a) => a.name), ['Rosegold', 'Azure Steel', 'Mintsilver']);
  assert.strictEqual(sum('rosegold'), 'material:rose_dustx6 material:blue_dustx2 120s');
  assert.strictEqual(sum('azure_steel'), 'material:blue_dustx4 material:mint_dustx2 300s');
  assert.strictEqual(sum('mintsilver'), 'material:mint_dustx4 material:golden_dustx2 600s');
  for (const a of F.ALLOYS) { assert.ok(F.isAlloy(a.id) && a.recipe.inputs.every((i) => i.kind === 'material' && F.byId(i.id) && !F.isAlloy(i.id)), a.id); }
  assert.strictEqual(F.ALL.length, F.MATERIALS.length + F.ALLOYS.length); assert.strictEqual(new Set(F.ALL.map((m) => m.id)).size, F.ALL.length);
});
test('an alloy start consumes exactly its dusts and no pearls', () => {
  const f = F.blank(), inv = inv0(), invV = { pearl: 500, blue: 1400 };
  f.stock = { rose_dust: 7, blue_dust: 2, mint_dust: 3 };
  assert.strictEqual(F.start(f, 0, 'rosegold', inv, T, invV), true);
  assert.deepStrictEqual(f.stock, { rose_dust: 1, mint_dust: 3 }, '6 Rose Dust and both Blue Dust taken, Mint untouched');
  assert.deepStrictEqual([inv, invV], [inv0(), { pearl: 500, blue: 1400 }], 'no pearls taken');
  assert.deepStrictEqual(f.slots[0], { mat: 'rosegold', start: T, end: T + 120 * S });
});
test('a short alloy is refused, takes nothing, and the reason names the dust', () => {
  const f = F.blank(); f.stock = { rose_dust: 6, blue_dust: 1 };
  assert.strictEqual(F.canStart(f, 0, 'rosegold', {}), false);
  assert.strictEqual(F.start(f, 0, 'rosegold', { pearl: 9999 }, T), false);
  assert.deepStrictEqual(f.stock, { rose_dust: 6, blue_dust: 1 });
  assert.deepStrictEqual(F.missing(f, 'rosegold', {}), { kind: 'material', id: 'blue_dust', qty: 2, have: 1, short: 1, name: 'Blue Dust' });
  f.stock = {}; assert.strictEqual(F.missing(f, 'rosegold', {}).name, 'Rose Dust', 'the first missing input');
  assert.deepStrictEqual(F.missing(f, 'rose_dust', { pearl: 40 }), { kind: 'pearl', id: 'pearl', qty: 100, have: 40, short: 60, name: null });
  assert.strictEqual(F.missing(f, 'rose_dust', { pearl: 100 }), null);
});
test('an alloy job finishes by timestamp, into the same stock, with Strike and speed', () => {
  const f = F.blank(); f.stock = { blue_dust: 4, mint_dust: 2 };
  F.start(f, 0, 'azure_steel', {}, T);
  assert.strictEqual(F.strike(f, T + 1, 0), true); assert.strictEqual(f.slots[0].end, T + 299 * S);
  assert.strictEqual(F.finish(f, 0, T + 299 * S - 1), null); assert.strictEqual(F.collect(f, T + 299 * S), 1);
  assert.deepStrictEqual([f.stock, f.slots], [{ azure_steel: 1 }, [null]]);
});
test('an alloy job finishes offline from a save, and alloys load in the stock', () => {
  const f = F.blank(); f.stock = { mint_dust: 4, golden_dust: 2, rosegold: 3 };
  F.start(f, 0, 'mintsilver', {}, T);
  const back = F.fromSave(JSON.parse(JSON.stringify(F.toSave(f, T + 5 * S))));
  assert.deepStrictEqual([back.slots, back.stock], [[{ mat: 'mintsilver', start: T, end: T + 600 * S }], { rosegold: 3 }]);
  assert.strictEqual(F.collect(back, T + 599 * S), 0); assert.strictEqual(F.collect(back, T + 3600 * S), 1, 'an hour later');
  assert.deepStrictEqual(back.stock, { rosegold: 3, mintsilver: 1 });
  assert.deepStrictEqual(F.fromSave({ stock: { azure_steel: 2, mintsilver: -1, adamant: 4 } }).stock, { azure_steel: 2 });
  assert.deepStrictEqual(F.fromSave({ slots: [{ mat: 'rosegold', start: 5, end: 9e15 }] }).slots, [{ mat: 'rosegold', start: 5, end: 5 + 120 * S }], 'clamped to the alloy recipe');
});
test('costText renders alloy lines', () => {
  assert.strictEqual(F.costText(1, 2, 'rosegold'), '1 of 2 Rosegold');
  assert.strictEqual(F.costText(5, 2, 'azure_steel'), '2 of 2 Azure Steel');
  assert.strictEqual(F.costText(0, 2, 'mintsilver'), '0 of 2 Mintsilver');
});
test('fromScratch: pearls and serial forge time behind each alloy at level 0', () => {
  assert.deepStrictEqual(F.fromScratch('rose_dust'), { pearls: { pearl: 100 }, secs: 30 });
  assert.deepStrictEqual(F.fromScratch('rosegold'), { pearls: { pearl: 600, blue: 140 }, secs: 6 * 30 + 2 * 60 + 120 });
  assert.deepStrictEqual(F.fromScratch('azure_steel'), { pearls: { blue: 280, mint: 90 }, secs: 4 * 60 + 2 * 120 + 300 });
  assert.deepStrictEqual(F.fromScratch('mintsilver'), { pearls: { mint: 180, golden: 60 }, secs: 4 * 120 + 2 * 240 + 600 });
});
test('an artifact forge bonus multiplies the speed, re-times jobs, and saves at the bonus rate', () => {
  assert.strictEqual(F.speedFactor(0, false, 0.3), 1.3); assert.strictEqual(F.speedFactor(2, true, 0.5), 1.5 * 1.5 * 2); assert.strictEqual(F.speedFactor(1, false), 1.25);
  const f = F.blank(); F.start(f, 0, 'blue_dust', inv0(), T);
  F.setBonus(f, 0.5, T + 30 * S);
  assert.strictEqual(f.slots[0].end, T + 30 * S + 20 * S, '30 s of work left at x1.5');
  const s = F.toSave(f, T + 30 * S); assert.strictEqual(s.slots[0].end, T + 50 * S);
  const back = F.fromSave(JSON.parse(JSON.stringify(s)), 0.5);
  assert.deepStrictEqual([back.rate, back.bonus, back.slots[0].end], [1.5, 0.5, T + 50 * S], 'loaded with the same bonus: same end');
  F.setBonus(back, 0, T + 40 * S); assert.strictEqual(back.slots[0].end, T + 40 * S + 15 * S, 'the bonus gone: 10 s at x1.5 = 15 s at x1');
});
