// The forge engine inside the real game (run from tests/harness32.js). Date.now is pinned so timestamps are exact.
module.exports = ({ G, ok, frames, E, store, els }) => {
  const st = G.state, F = require('../src/forge.js'), realNow = Date.now;
  let now = 1.7e12; Date.now = () => now;
  try {
    G.loadState({ version: 5, lv: E.zeroLevels() }); G.resetRun();
    ok('a new game has an empty forge: one slot, no stock, no upgrades', JSON.stringify(F.toSave(st.forge, now)) === '{"slots":[null],"stock":{},"lv":{"speed":0,"slot":0}}');

    // one start and finish, with the numbers
    st.inv.pearl = 250; st.invV.pearl = 500; st.inv['pearl:s'] = 4;
    const before = st.inv.pearl, t0 = now;
    const started = G.forgeStart(0, 'rose_dust'), job = st.forge.slots[0];
    ok('starting Rose Dust takes 100 Rose Pearls at once (normal only)', started && st.inv.pearl === 150 && st.inv['pearl:s'] === 4 && st.invV.pearl === 300 && job.start === t0 && job.end === t0 + 30000,
      'pearls ' + before + ' -> ' + st.inv.pearl + ', job ' + (job.end - job.start) / 1000 + ' s');
    ok('a second job does not fit in the one slot', G.forgeStart(0, 'rose_dust') === false && G.forgeStart(1, 'rose_dust') === false && st.inv.pearl === 150);
    now = t0 + 15000; G.forgeTick();
    ok('half way: progress 0.5, nothing in stock yet', F.progress(st.forge, 0, now) === 0.5 && !st.forge.stock.rose_dust);
    now = t0 + 30000; frames(1);
    ok('at the end time the loop finishes it: one Rose Dust, slot free', st.forge.stock.rose_dust === 1 && st.forge.slots[0] === null,
      'pearls ' + before + ' -> ' + st.inv.pearl + ', Rose Dust 0 -> ' + st.forge.stock.rose_dust + ' after ' + (now - t0) / 1000 + ' s');

    // frenzy speeds the forge only while the page is open, and saves never carry it
    now = t0 + 100000; G.forgeStart(0, 'rose_dust'); G.startFrenzy(); G.forgeTick();
    ok('frenzy doubles the forge speed while open', st.forge.rate === 2 && st.forge.slots[0].end === now + 15000);
    const saved = G.serialize().forge.slots[0];
    ok('a save during frenzy stores the end at x1', saved.end === now + 30000 && st.forge.slots[0].end === now + 15000);
    now += 5000; ok('a Strike takes 1 s off', G.forgeStrike(0) === true && st.forge.slots[0].end === now - 5000 + 15000 - 1000);
    G.resetRun(); G.forgeTick(); // the board reset ends the frenzy
    ok('frenzy over: back to x1, the remaining work re-timed', st.forge.rate === 1 && st.forge.slots[0].end === now + 18000, (st.forge.slots[0].end - now) / 1000 + ' s left');
    now = st.forge.slots[0].end; G.forgeCatchUp();

    // offline: finished on return, counted in the toast; a backwards clock finishes nothing
    st.inv.pearl = 1000; st.forge.lv.slot = 1; st.forge.slots = [null, null];
    G.forgeStart(0, 'rose_dust'); G.forgeStart(1, 'rose_dust'); G.save(); const raw = store['poppit.v1'], tSave = now;
    G.loadState(JSON.parse(raw)); now = tSave - 3600e3;
    const r0 = G.awayBonus(0);
    ok('a clock set back an hour finishes no job', r0.jobs === 0 && st.forge.slots[0] && st.forge.slots[1] && !/forge job/.test(els.toast.textContent));
    G.loadState(JSON.parse(raw)); now = tSave + 31000; st.lv.auto = 0;
    const s1 = st.forge.stock.rose_dust || 0, r1 = G.awayBonus(31);
    ok('back after 31 s: both jobs finish and the toast says so', r1.jobs === 2 && st.forge.stock.rose_dust === s1 + 2 && els.toast.textContent === 'Welcome back! 2 forge jobs finished while you were away', els.toast.textContent);
    st.lv.auto = 3; G.recalc(); G.forgeStart(0, 'rose_dust'); now += 40000;
    const r2 = G.awayBonus(40);
    ok('with helpers the toast names juice and jobs', r2.jobs === 1 && r2.gain > 0 && /^Welcome back! Your helpers popped .+ juice and 1 forge job finished while you were away$/.test(els.toast.textContent), els.toast.textContent);

    // upgrades bought with juice
    st.sparks = 100000; const sp0 = st.sparks;
    ok('Forge Speed costs 20,000 juice and gives +25%', G.forgeBuy('speed') === true && st.sparks === sp0 - 20000 && st.forge.lv.speed === 1 && st.forge.rate === 1.25);
    ok('short of juice, nothing is bought', G.forgeBuy('slot') === false && st.forge.lv.slot === 1);

    // Fresh Batch keeps the forge; saves carry it; Reset forgets it
    st.forge.stock = { rose_dust: 5, blue_dust: 1 }; st.inv.pearl = 300; G.forgeStart(0, 'rose_dust');
    const keep = JSON.stringify(F.toSave(st.forge, now));
    st.runEarned = E.COLLAPSE_MIN_RUN * 1.2; G.updateShelf(); els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {}); frames(160);
    ok('Fresh Batch keeps forge jobs, stock and upgrades', st.collapses > 0 && JSON.stringify(F.toSave(st.forge, now)) === keep, keep);
    const code = G.encodeSave(G.serialize()); G.loadState({ version: 5 });
    ok('a save code carries the forge', G.loadState(G.decodeSave(code)) === 'ok' && JSON.stringify(F.toSave(st.forge, now)) === keep);
    G.save(); const rawF = store['poppit.v1'];
    ok('importing another code backs up the forge, Restore brings it back', G.checkImport(G.encodeSave({ version: 5, sparks: 1 })) === 'ok' && G.applyImport() === true && st.forge.stock.rose_dust === undefined && store['poppit.backup'] === rawF &&
      G.restoreBackup() === 'ok' && JSON.stringify(F.toSave(st.forge, now)) === keep);
    const m4 = G.migrateSave({ version: 4, sparks: 2 }).save;
    ok('a v4 save migrates to an empty forge', m4.version === 5 && JSON.stringify(m4.forge) === '{"slots":[null],"stock":{},"lv":{"speed":0,"slot":0}}' && G.loadState({ version: 4 }) === 'ok' && st.forge.slots.length === 1 && !st.forge.slots[0]);
    ok('loaded forge values are clamped', G.loadState({ version: 5, forge: { slots: [{ mat: 'nope', start: 1, end: 2 }], stock: { rose_dust: -1, ruby_dust: 3 }, lv: { speed: 50, slot: -2 } } }) === 'ok' &&
      JSON.stringify(F.toSave(st.forge, now)) === '{"slots":[null],"stock":{"ruby_dust":3},"lv":{"speed":10,"slot":0}}');
    ok('Reset save forgets the forge', (els.resetBtn.fire('click', {}), els.resetBtn.fire('click', {}), JSON.stringify(F.toSave(st.forge, now)) === '{"slots":[null],"stock":{},"lv":{"speed":0,"slot":0}}'));
  } finally { Date.now = realNow; }
};
