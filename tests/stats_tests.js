// The Artifacts/Forge gate at 500K, the stats object (counters from real taps and pops, migration, save round trips, Fresh Batch,
// Reset) and Reduce effects (run from tests/harness32.js).
module.exports = ({ G, ok, frames, E, store, els }) => {
  const st = G.state, A = G.ARTS, realNow = Date.now;
  const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
  const col = (ids, popped) => Object.fromEntries(E.PEARLS.map((t) => [t.id, { found: ids.includes(t.id), popped: ids.includes(t.id) ? popped : 0, sFound: false, sPopped: 0 }]));
  const refresh = () => { G.recalc(); G.updateShelf(); G.syncDock(); };
  const load = (d) => { const r = G.loadState(JSON.parse(JSON.stringify(d))); G.syncDiscoveries(); refresh(); return r; };
  const both = () => !els.artBtn.hidden && !els.forgeBtn.hidden;
  const fresh = () => { G.resetRun(); G.clearBoard(); G.setMeter(0); };
  try {
    // ---- the gate ----
    const base = { version: 8, lifetime: 120000, runEarned: 120000, lv: { lucky: 2, sharp: 6 }, col: col(['pearl', 'blue'], 400) };
    load(base);
    ok('a save under 500K juice with no artifact or forge state loses both buttons (it had them at 100 Roses)', els.artBtn.hidden && els.forgeBtn.hidden && st.col.pearl.popped >= 100);
    const cases = {
      'an owned copy': { artifacts: { pink_duck: { active: 1, copies: [{ id: 1, rarity: 'common', perks: [] }] } } },
      'a forge job': { forge: { slots: [{ mat: 'rose_dust', start: 1, end: 2 }], stock: {}, lv: { speed: 0, slot: 0 } } },
      'forge stock': { forge: { slots: [null], stock: { rose_dust: 2 }, lv: { speed: 0, slot: 0 } } },
      'a forge upgrade': { forge: { slots: [null], stock: {}, lv: { speed: 1, slot: 0 } } },
      'pearls kept for a duck': { keep: { pearl: true } },
      'a Fresh Batch': { collapses: 1, echoes: 2 },
      'Flavors alone': { echoes: 1 },
    };
    for (const k in cases) { load(Object.assign({}, base, cases[k])); ok('a save with ' + k + ' keeps both buttons under 500K juice', both()); }
    load(Object.assign({}, base, { lifetime: 500000 }));
    ok('500K lifetime juice shows both, with the Fresh Batch box', both() && !els.collapseBox.hidden);

    // ---- the stats counters from real taps and pops ----
    load({ version: 9, lv: {} }); fresh(); st.stats = { taps: 0, secs: 0, runSecs: 0, bestPop: 0, bestCombo: 0, bestGain: 0, fastest: 0 };
    const r = els.cv.getBoundingClientRect();
    const tapAt = (p) => { els.cv.fire('pointerdown', { clientX: r.left + p.cell.x, clientY: r.top + p.cell.y, pointerId: 1, pointerType: 'mouse', preventDefault() {} }); els.cv.fire('pointerup', {}); };
    let pops = 0; const pop0 = st.col.pearl.popped;
    for (let i = 0; i < 5; i++) { const c = G.cells.find((x) => !x.p), p = G.spawnAt(c, 'pearl', false); p.born = 1; tapAt(p); pops++; }
    els.cv.fire('pointerdown', { clientX: -50, clientY: -50, pointerId: 1, pointerType: 'mouse', preventDefault() {} }); els.cv.fire('pointerup', {}); // a tap on empty board
    const one = E.popValue(G.getS(), 1, false, 'pearl');
    ok('taps count every press on the board; pops land in the collection counters', st.stats.taps === 6 && st.col.pearl.popped - pop0 === pops, st.stats.taps + ' taps');
    ok('the highest combo and the best single pop follow real pops', st.stats.bestCombo === 5 && st.stats.bestPop > one, st.stats.bestCombo + ' / ' + st.stats.bestPop);
    const s0 = st.stats.secs; frames(60);
    ok('time played grows with the frames (about 1 s for 60 frames)', st.stats.secs - s0 > 0.9 && st.stats.secs - s0 < 1.1 && st.stats.runSecs > 0.9, (st.stats.secs - s0).toFixed(3));
    els.statsBtn.fire('click', {}); G.updateStats();
    const sh = els.statsBody.innerHTML;
    ok('the Stats screen opens from Settings and shows the numbers', !els.stats.hidden && els.settings.hidden && /Taps<\/span><b>6</.test(sh) && /Highest combo<\/span><b>5</.test(sh) && /Fastest run<\/span><b>None yet/.test(sh) && /Rose Pearl<\/span><b>/.test(sh) && /Time played<\/span><b>1s</.test(sh), sh.slice(0, 200));

    // ---- migration ----
    const m = G.migrateSave({ version: 8, sparks: 5, lv: {} }).save;
    ok('a v8 save migrates to v9 with every counter at zero and its run not timed', m.version === 9 && G.SAVE_VERSION === 9 && JSON.stringify(m.stats) === '{"taps":0,"secs":0,"runSecs":-1,"bestPop":0,"bestCombo":0,"bestGain":0,"fastest":0}');
    load({ version: 8, lv: {}, reduceFx: 'yes' });
    ok('and loads with them; a missing Reduce effects takes the browser default (off here)', st.stats.taps === 0 && st.stats.runSecs === -1 && st.reduceFx === false);
    load({ version: 9, lv: {}, stats: { taps: -3, secs: 'x', runSecs: 1e99, bestPop: 7.5, bestCombo: 2.7, bestGain: NaN, fastest: -1 }, reduceFx: true });
    ok('loaded stats are clamped: whole counts, finite seconds, nothing below 0', JSON.stringify(st.stats) === '{"taps":0,"secs":0,"runSecs":10000000000,"bestPop":7.5,"bestCombo":2,"bestGain":0,"fastest":0}' && st.reduceFx === true, JSON.stringify(st.stats));

    // ---- Fresh Batch keeps them and records the run ----
    const S9 = { taps: 40, secs: 900, runSecs: 600, bestPop: 1234, bestCombo: 33, bestGain: 0, fastest: 0 };
    load({ version: 9, lv: {}, stats: S9, reduceFx: false }); fresh();
    st.runEarned = E.COLLAPSE_MIN_RUN * 1.2; G.updateShelf(); const gain = E.collapseGain(st.runEarned);
    els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {}); frames(160);
    ok('Fresh Batch keeps the stats and records the biggest gain and the fastest run', !G.getCollapse() && st.stats.taps === 40 && st.stats.bestPop === 1234 && st.stats.bestCombo === 33 && st.stats.bestGain === gain && st.stats.fastest >= 600 && st.stats.fastest < 604 && st.stats.runSecs >= 0 && st.stats.runSecs < 4, JSON.stringify(st.stats));
    load({ version: 9, lv: {}, stats: Object.assign({}, S9, { runSecs: -1 }) }); fresh(); st.runEarned = E.COLLAPSE_MIN_RUN * 1.2; G.updateShelf();
    els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {}); frames(160);
    ok('a run that was not timed (from before stats) never counts as the fastest', st.stats.fastest === 0 && st.stats.runSecs >= 0 && st.stats.runSecs < 4);

    // ---- save, save code, import, backup, Restore ----
    load({ version: 9, lv: {}, lifetime: 10, stats: S9, reduceFx: true });
    const sj = JSON.stringify(st.stats);
    G.save(); ok('a save and reload keep the stats and Reduce effects', G.loadState(JSON.parse(store['poppit.v1'])) === 'ok' && JSON.stringify(st.stats) === sj && st.reduceFx === true);
    const code = G.encodeSave(G.serialize()); G.loadState({ version: 9 });
    ok('a save code carries them', G.loadState(G.decodeSave(code)) === 'ok' && JSON.stringify(st.stats) === sj && st.reduceFx === true);
    G.save(); const raw = store['poppit.v1'];
    ok('an import replaces them and backs up the old ones', G.checkImport(G.encodeSave({ version: 9, sparks: 1 })) === 'ok' && G.applyImport() === true && st.stats.taps === 0 && store['poppit.backup'] === raw);
    ok('Restore brings them back', G.restoreBackup() === 'ok' && JSON.stringify(st.stats) === sj);
    els.resetBtn.fire('click', {}); els.resetBtn.fire('click', {});
    ok('Reset save zeroes the stats and keeps the Reduce effects choice', JSON.stringify(st.stats) === '{"taps":0,"secs":0,"runSecs":0,"bestPop":0,"bestCombo":0,"bestGain":0,"fastest":0}' && st.reduceFx === true);

    // ---- Reduce effects ----
    st.reduceFx = false; G.paintFx(); fresh();
    els.fxBtn.fire('click', {});
    ok('the Settings toggle turns Reduce effects on, saves it and marks the page', st.reduceFx === true && els.fxBtn.textContent === 'On' && els.fxBtn['attr:aria-pressed'] === 'true' && G.fxClass() && G.serialize().reduceFx === true);
    const sounds = []; const hit0 = G.Snd.hit, pop0s = G.Snd.pop, gold0 = G.Snd.golden;
    G.Snd.hit = (...a) => { sounds.push('hit'); return hit0.apply(G.Snd, a); }; G.Snd.pop = (...a) => { sounds.push('pop'); return pop0s.apply(G.Snd, a); }; G.Snd.golden = (...a) => { sounds.push('golden'); return gold0.apply(G.Snd, a); };
    const popOne = (kind) => { const c = G.cells.find((x) => !x.p), p = G.spawnAt(c, kind, false); p.born = 1; G.setCombo(0); const n = [G.fx.parts.length, G.fx.texts.length], j0 = st.sparks; G.popPearl(p, 'tap'); return { parts: G.fx.parts.length - n[0], texts: G.fx.texts.length - n[1], juice: st.sparks - j0 }; };
    G.fx.parts.length = 0; G.fx.texts.length = 0; G.setShake(0);
    const off = popOne('golden'), shakeOff = G.getShake(), flashOff = G.getFlash();
    ok('with Reduce effects on, a golden pop makes no particles, no floating numbers, no shake and no flash', off.parts === 0 && off.texts === 0 && shakeOff === 0 && flashOff === 0, JSON.stringify(off));
    ok('while its sounds still play and its juice still lands', sounds.includes('hit') && sounds.includes('golden') && off.juice > 0, sounds.join());
    st.reduceFx = false; G.paintFx(); G.setShake(0); sounds.length = 0;
    const on = popOne('golden');
    ok('with it off the same pop bursts, floats its number and shakes', on.parts > 0 && on.texts > 0 && G.getShake() > 0 && near(on.juice, off.juice));
    G.Snd.hit = hit0; G.Snd.pop = pop0s; G.Snd.golden = gold0;
    st.reduceFx = true; G.paintFx();
    st.inv.pearl = 10000; A.ARTIFACTS.length && G.craftArtifact('pink_duck', () => 0.99);
    ok('the roll reveal shows no particles with Reduce effects on', !els.reveal.hidden && els.rvParts.innerHTML === '');
    G.closeReveal(); st.reduceFx = false; G.paintFx();
  } finally { Date.now = realNow; els.resetBtn.fire('click', {}); els.resetBtn.fire('click', {}); st.reduceFx = false; G.paintFx(); }
};
