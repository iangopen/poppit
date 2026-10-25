// Rule C in the real game (run from tests/harness32.js): the saved flavor juice, the v9 -> v10 migration, the Fresh Batch box,
// selling kept pearls at any time, the away bonus, save round trips, Fresh Batch and Reset. It prints `flavor run:` lines.
module.exports = ({ G, ok, frames, E, store, els }) => {
  const st = G.state;
  const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
  const refresh = () => { G.recalc(); G.updateShelf(); };
  const load = (d) => { const r = G.loadState(JSON.parse(JSON.stringify(d))); G.syncDiscoveries(); refresh(); return r; };
  const fresh = () => { G.resetRun(); G.clearBoard(); G.setMeter(0); };
  // a Fresh Batch through the button, on an empty board so the batch wave pops nothing (no juice lands during it)
  const take = () => { G.clearBoard(); G.updateShelf(); els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {}); const started = !!G.getCollapse(); frames(160); G.clearBoard(); return started; };
  const earn = (j) => { st.sparks += j; st.runEarned += j; st.lifetime += j; st.flavorJuice += j; }; // what pops pay, without the board
  const bar = () => els.collapseBar['attr:aria-valuenow'];
  try {
    // ---- the v9 -> v10 migration: flavorJuice = max(lifetime, 1.25M x Flavors^2), no Flavor taken away ----
    const v9 = (echoes, lifetime) => ({ version: 9, sparks: 0, runEarned: 0, lifetime, echoes, collapses: echoes ? 3 : 0, lv: {} });
    const cases = [[0, 3e6, 3e6], [15, 1.2e8, 1.25e6 * 225], [15, 5e8, 5e8], [300, 3e10, 1.25e6 * 90000]];
    for (const [e, life, want] of cases) {
      const m = G.migrateSave(v9(e, life)).save;
      const loaded = load(v9(e, life)) === 'ok';
      ok('a v9 save with ' + e + ' Flavors and ' + life + ' lifetime juice migrates to flavor juice ' + want, m.version === 10 && m.flavorJuice === want && loaded && st.flavorJuice === want && st.echoes === e && st.lifetime === life && E.flavorsOwed(st.flavorJuice) >= e, st.flavorJuice);
    }
    ok('the migration does not change the stored v9 object, and bad numbers count as 0', (() => { const o = v9(15, 1e8); G.migrateSave(o); return o.version === 9 && !('flavorJuice' in o); })() &&
      G.migrateSave({ version: 9, echoes: 'x', lifetime: -4 }).save.flavorJuice === 0 && G.migrateSave({ version: 9, echoes: 2.9, lifetime: NaN }).save.flavorJuice === 1.25e6 * 4);
    ok('a v1 save reaches v10 too: its 3 Flavors stay owed', (() => { const m = G.migrateSave({ sparks: 1, lifetime: 9000, echoes: 3 }).save; return m.version === 10 && m.flavorJuice === 1.25e6 * 9 && E.flavorsOwed(m.flavorJuice) === 3; })());
    // 0 Flavors after migration: exactly the old first Fresh Batch, 2 Flavors at 5M
    load(v9(0, 3e6)); fresh(); st.runEarned = 3e6; refresh();
    ok('0 Flavors, 3M juice: not ready, +1 now, ready at +2, the run floor named', !G.batchView().ready && els.collapseNow.textContent === 'Now: +1 Flavor. Ready at +2.' && /^Earn 5\.00M juice in this run to unlock it \(3\.00M so far\)\.$/.test(els.collapseText.textContent) && bar() === '60', els.collapseNow.textContent + ' | ' + els.collapseText.textContent + ' | ' + bar());
    earn(2e6); refresh();
    ok('0 Flavors, 5M juice: ready for +2', G.batchView().ready && G.batchView().gain === 2 && els.collapseBtn.textContent === 'Fresh Batch for +2 Flavors' && !els.collapseBtn.disabled && bar() === '100', els.collapseBtn.textContent);
    // 15 Flavors after migration (owed exactly 15): needs +8, so 23 owed = 1.25M x 529
    load(v9(15, 1.2e8)); fresh(); st.runEarned = 6e6; refresh();
    const v15 = G.batchView();
    ok('15 Flavors: +0 now, ready at +8 (half your 15), ' + v15.more + ' more juice', !v15.ready && v15.gain === 0 && v15.need === 8 && v15.more === 1.25e6 * (529 - 225) && els.collapseNow.textContent === 'Now: +0 Flavors. Ready at +8 (half your 15).' && els.collapseText.textContent === 'Earn 380M more juice to reach +8.' && bar() === '0', els.collapseText.textContent);

    // ---- a save with 300 Flavors: the gain needed, its progress, and not ready until the gate is met ----
    load(v9(300, 3e10)); fresh(); st.runEarned = 0; refresh();
    const s0 = G.batchView(), gate = E.flavorJuiceFor(450);
    console.log('flavor run: 300 Flavors, lifetime 3.00e10 -> flavor juice ' + st.flavorJuice.toExponential(4) + ', owed ' + E.flavorsOwed(st.flavorJuice) + ', gain now +' + s0.gain + ', gain needed +' + s0.need + ', juice to go ' + s0.more.toExponential(4) + ' (gate at ' + gate.toExponential(4) + '), progress ' + bar() + '%, ready ' + s0.ready);
    console.log('flavor run:   box: "' + els.collapseNow.textContent + '" / "' + els.collapseText.textContent + '" / button "' + els.collapseBtn.textContent + '" disabled ' + els.collapseBtn.disabled);
    ok('300 Flavors: +0 now, ready at +150, 1.40625e11 more juice, progress 0', !s0.ready && s0.gain === 0 && s0.need === 150 && s0.more === 1.40625e11 && bar() === '0' && els.collapseBtn.disabled === true && els.collapseNow.textContent === 'Now: +0 Flavors. Ready at +150 (half your 300).' && els.collapseText.textContent === 'Earn 141B more juice to reach +150.', els.collapseText.textContent);
    const steps = [];
    for (const f of [0.25, 0.5, 0.999]) {
      earn(st.flavorJuice < gate ? (E.flavorJuiceFor(300) + f * (gate - E.flavorJuiceFor(300))) - st.flavorJuice : 0); refresh();
      const v = G.batchView(); steps.push([f, v.gain, v.ready, bar()]);
      console.log('flavor run:   at ' + (f * 100).toFixed(1) + '% of the way: flavor juice ' + st.flavorJuice.toExponential(4) + ', gain +' + v.gain + ', progress ' + bar() + '%, ready ' + v.ready + ', button disabled ' + els.collapseBtn.disabled);
    }
    ok('300 Flavors: a quarter, half and nearly all the way are not ready, and the bar follows', steps.every((x) => x[2] === false) && steps[0][3] === '25' && steps[1][3] === '50' && steps[2][3] === '99' && steps[2][1] === 149 && els.collapseBtn.disabled, JSON.stringify(steps));
    els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {});
    ok('a click before the gate does nothing', !G.getCollapse() && st.echoes === 300);
    earn(gate - st.flavorJuice); refresh(); const s1 = G.batchView();
    console.log('flavor run:   at the gate: flavor juice ' + st.flavorJuice.toExponential(4) + ', gain +' + s1.gain + ', progress ' + bar() + '%, ready ' + s1.ready + ', button "' + els.collapseBtn.textContent + '"');
    ok('300 Flavors: ready at exactly +150, and the Fresh Batch pays it', s1.ready && s1.gain === 150 && bar() === '100' && els.collapseBtn.textContent === 'Fresh Batch for +150 Flavors' && take() && st.echoes === 450, st.echoes);
    refresh(); const s2 = G.batchView();
    console.log('flavor run:   after it: ' + st.echoes + ' Flavors, flavor juice ' + st.flavorJuice.toExponential(4) + ' (kept), gain now +' + s2.gain + ', needed +' + s2.need + ', progress ' + bar() + '%');
    ok('Fresh Batch keeps the flavor juice, and the next gate starts at 0 progress', near(st.flavorJuice, gate) && st.runEarned === 0 && s2.gain === 0 && s2.need === 225 && bar() === '0', st.flavorJuice);

    // ---- selling kept pearls in one run or spread over several gives the same Flavors ----
    const stack = 3000, worth = 3e7;
    const start = () => { load({ version: 10, lv: {}, flavorJuice: 0, keep: { pearl: true }, inv: { pearl: stack }, invV: { pearl: worth } }); fresh(); st.autoSell = false; };
    const path = (plan) => { // plan: per run, the pearls to sell; each run also earns 5M from pops, then takes a Fresh Batch if it is ready
      start(); const log = [];
      for (const q of plan) { earn(5e6); if (q) G.sellSome('pearl', q); refresh(); const r = G.batchView().ready; if (r) take(); log.push(st.echoes); }
      return { echoes: st.echoes, fj: st.flavorJuice, life: st.lifetime, owed: E.flavorsOwed(st.flavorJuice), log };
    };
    const once = path([0, 0, stack, 0]), spread = path([1000, 1000, 1000, 0]), late = path([0, 0, 0, stack]);
    console.log('flavor run: kept pearls sold in run 3: Flavors after each run ' + once.log.join(' / ') + '; one a run: ' + spread.log.join(' / ') + '; all in run 4: ' + late.log.join(' / '));
    ok('selling kept pearls all at once or spread over runs gives the same flavor juice and Flavors owed', near(once.fj, spread.fj) && near(once.fj, late.fj) && near(once.fj, 4 * 5e6 + worth) && once.owed === spread.owed && once.owed === late.owed && near(once.life, once.fj), JSON.stringify([once, spread, late].map((x) => [x.fj, x.owed])));
    ok('and the Flavors held plus the gain on offer are the same on every path', [once, spread, late].every((x) => x.echoes + E.collapseGain(0, x.echoes, x.fj) === once.owed), JSON.stringify([once.echoes, spread.echoes, late.echoes]));

    // ---- every juice gain counts: auto-sell pops and the away bonus ----
    load({ version: 10, lv: { auto: 3, lucky: 2, coral: 1 }, flavorJuice: 1e6, lifetime: 1e6, col: { pearl: { found: true }, blue: { found: true } }, pool: ['pearl', 'blue'] }); fresh(); st.autoSell = true;
    const a0 = st.flavorJuice, l0 = st.lifetime, aw = G.awayBonus(3600);
    ok('the away bonus counts toward the flavor juice, like lifetime juice', aw.gain > 0 && near(st.flavorJuice - a0, aw.gain) && near(st.lifetime - l0, aw.gain), aw.gain);
    const c = G.cells.find((x) => !x.p), p = G.spawnAt(c, 'pearl', false); p.born = 1; const b0 = st.flavorJuice, j0 = st.sparks; G.popPearl(p, 'tap');
    ok('an auto-sold pop counts toward it too', st.sparks > j0 && near(st.flavorJuice - b0, st.sparks - j0));

    // ---- save, save code, import, backup, Restore, clamping and Reset ----
    load({ version: 10, lv: {}, sparks: 7, flavorJuice: 7.7e9, lifetime: 1e9, echoes: 40 });
    G.save(); const raw = store['poppit.v1'];
    ok('a save and reload keep the flavor juice', JSON.parse(raw).flavorJuice === 7.7e9 && G.serialize().flavorJuice === 7.7e9 && G.loadState(JSON.parse(raw)) === 'ok' && st.flavorJuice === 7.7e9);
    const code = G.exportCode(); G.loadState({ version: 10 });
    ok('a save code carries it', st.flavorJuice === 0 && G.loadState(G.decodeSave(code)) === 'ok' && st.flavorJuice === 7.7e9);
    G.save(); const raw2 = store['poppit.v1'];
    ok('an import replaces it and backs up the old one', G.checkImport(G.encodeSave({ version: 10, flavorJuice: 123 })) === 'ok' && G.applyImport() === true && st.flavorJuice === 123 && store['poppit.backup'] === raw2 && JSON.parse(store['poppit.backup']).flavorJuice === 7.7e9);
    ok('Restore brings it back', G.restoreBackup() === 'ok' && st.flavorJuice === 7.7e9);
    ok('an imported v9 code migrates on the way in', G.checkImport(G.encodeSave(v9(15, 1e8))) === 'ok' && G.applyImport() === true && st.flavorJuice === 1.25e6 * 225 && st.echoes === 15 && G.restoreBackup() === 'ok' && st.flavorJuice === 7.7e9);
    ok('a loaded flavor juice clamps: NaN, below 0, text and overflow count as 0', ['NaN', -5, 'x', 1e400, null].every((x) => G.loadState({ version: 10, flavorJuice: x }) === 'ok' && st.flavorJuice === 0) && G.loadState({ version: 10, flavorJuice: 2.5 }) === 'ok' && st.flavorJuice === 2.5);
    load({ version: 10, lv: {}, flavorJuice: 9e9, echoes: 50, lifetime: 9e9 });
    els.resetBtn.fire('click', {}); els.resetBtn.fire('click', {});
    ok('Reset save forgets the flavor juice', st.flavorJuice === 0 && st.echoes === 0 && st.lifetime === 0 && G.serialize().flavorJuice === 0);
  } finally { els.resetBtn.fire('click', {}); els.resetBtn.fire('click', {}); }
};
