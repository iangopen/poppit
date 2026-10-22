// The Forge panel and dock button in the real game (run from tests/harness32.js). Date.now is pinned.
module.exports = ({ G, ok, frames, E, store, els }) => {
  const st = G.state, realNow = Date.now;
  let now = 1.8e12; Date.now = () => now;
  const rec = (id) => G.forgeView().recipes.find((r) => r.id === id);
  const clickIn = (el, attr, value) => el.fire('click', { detail: 1, target: { closest: (sel) => (sel === '[' + attr + ']' ? { dataset: { [attr.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())]: value }, disabled: false } : null) } });
  try {
    G.loadState({ version: 5, lv: E.zeroLevels() }); G.resetRun(); els.forge.hidden = true; G.updateForge();

    // dock gate, the same as Artifacts, through PANEL_BTN
    st.col.pearl.popped = 99; st.col.pearl.sPopped = 0; G.syncDock();
    const hidden99 = els.forgeBtn.hidden;
    st.col.pearl.popped = 100; G.syncDock();
    ok('the Forge button shows from 100 Rose Pearls popped, like Artifacts', hidden99 === true && els.forgeBtn.hidden === false && els.artBtn.hidden === false && els.stage.classList.contains('forge') && G.PANEL_BTN.forge === 'forgeBtn');
    st.col.pearl.popped = 0; G.syncDock(); const gone = els.forgeBtn.hidden;
    st.forge.stock.rose_dust = 1; G.syncDock();
    ok('a save with forge work keeps the button even under 100 Roses', gone === true && els.forgeBtn.hidden === false);
    delete st.forge.stock.rose_dust; st.col.pearl.popped = 150; G.syncDock();

    // Start's disabled reasons
    st.autoSell = true; st.inv.pearl = 37;
    ok('short with auto-sell on and Rose not kept: the Keep message', rec('rose_dust').can === false && rec('rose_dust').reason === 'Turn on Keep for Rose Pearls, or turn off auto-sell', rec('rose_dust').reason);
    st.autoSell = false;
    ok('with auto-sell off: how many more are needed', rec('rose_dust').reason === 'Need 63 more Rose Pearls in your backpack', rec('rose_dust').reason);
    st.autoSell = true; st.col.blue.found = true; st.keep.blue = true; st.lv.lucky = 0;
    ok('a kept type that is not spawning says so', /^Blue Pearls are not spawning right now/.test(rec('blue_dust').reason), rec('blue_dust').reason);
    delete st.keep.blue;
    ok('only discovered types have recipes, then the alloys their dusts make', G.forgeView().recipes.map((r) => r.id).join() === 'rose_dust,blue_dust,rosegold', G.forgeView().recipes.map((r) => r.id).join());

    // the Keep toggle in the panel is the backpack's Keep state
    els.forge.hidden = false; G.updateForge();
    clickIn(els.fRecipes, 'data-fkeep', 'pearl');
    ok('the panel Keep toggle turns on Keep for Rose Pearls everywhere', st.keep.pearl === true && G.isKept('pearl') && rec('rose_dust').kept && rec('rose_dust').reason === 'Need 63 more Rose Pearls in your backpack');
    clickIn(els.fRecipes, 'data-fkeep', 'pearl'); const off = !G.isKept('pearl'); clickIn(els.fRecipes, 'data-fkeep', 'pearl');
    ok('and off again, then on', off && G.isKept('pearl'));

    // Start consumes the recipe
    st.inv.pearl = 150; st.invV.pearl = 300;
    ok('Start is enabled with 150 kept Roses', rec('rose_dust').can && rec('rose_dust').reason === '' && rec('rose_dust').have === '150' && rec('rose_dust').time === '30s');
    clickIn(els.fRecipes, 'data-fstart', 'rose_dust');
    const v1 = G.forgeView();
    ok('Start takes exactly 100 Rose Pearls and fills slot 1', st.inv.pearl === 50 && v1.slots[0].mat === 'rose_dust' && v1.slots[0].left === '30s' && v1.slots[0].progress === 0, 'pearls 150 -> ' + st.inv.pearl);
    ok('with the one slot busy, Start says so', rec('rose_dust').reason === 'The forge slot is busy');

    // Strike: 1 s off, at most 5 per second
    const btn = { dataset: { strike: '0' }, classList: { add() {}, remove() {} }, offsetWidth: 1, parentNode: { appendChild() {} } };
    const hits = [0, 1, 2, 3, 4, 5].map(() => G.strikeUI(btn));
    ok('Strike from the panel: 5 land in one second, the 6th is refused', hits.join() === 'true,true,true,true,true,false' && G.forgeView().slots[0].left === '25s', hits.join() + ' / ' + G.forgeView().slots[0].left);
    now += 1000; ok('a second later Strike works again', G.strikeUI(btn) === true && G.forgeView().slots[0].left === '23s');
    // the events one press sends: a mouse or touch press is pointerdown then click (detail 1); a key press is click (detail 0)
    const fb = Object.assign({}, btn, { closest: () => fb, disabled: false }), endAt = () => st.forge.slots[0].end;
    const press = (evs) => { now += 1000; const e0 = endAt(); for (const [t, d] of evs) els.fSlots.fire(t, { target: fb, detail: d, preventDefault() {} }); return (e0 - endAt()) / 1000; };
    const shaved = [press([['pointerdown'], ['click', 1]]), press([['click', 0]])];
    ok('one mouse press and one key press each take exactly 1 s off (no double strike)', shaved.join() === '1,1', shaved.join());

    // a finished job raises the stock with no click; the dot shows while the panel is closed
    els.forge.hidden = true; G.setForgeDot(false);
    now += 30000; frames(1);
    ok('a finished job lands in the stock by itself and lights the dot', st.forge.stock.rose_dust === 1 && st.forge.slots[0] === null && G.getForgeDot() === true && els.forgeDot.hidden === false);
    G.openPanel('forge');
    ok('opening the panel clears the dot and shows the stock', els.forge.hidden === false && G.getForgeDot() === false && els.forgeDot.hidden === true && els.fStock.textContent === 'Rose Dust 1', els.fStock.textContent);

    // upgrades: the shop's buy pattern, the panel follows
    st.sparks = 25000;
    ok('Forge Speed shows level, price and effect', (() => { const u = G.forgeView().upg[0]; return u.id === 'speed' && u.lvl === 0 && u.cost === 20000 && u.can && u.desc === '+25% forge speed per level (now x1)'; })());
    clickIn(els.fUpg, 'data-fup', 'speed');
    const u1 = G.forgeView().upg[0];
    ok('buying it updates the panel: level 1, next price, speed line', st.sparks === 5000 && u1.lvl === 1 && u1.cost === 56000 && !u1.can && u1.desc === '+25% forge speed per level (now x1.25)' && els.fSpeed.textContent === 'Forge speed x1.25: level 1' && rec('rose_dust').time === '24s', els.fSpeed.textContent);
    ok('Extra Slot shows its effect', G.forgeView().upg[1].desc === 'One more job at once (now 1 slot)' && G.forgeView().upg[1].cost === 250000);

    // the speed line follows frenzy live
    G.startFrenzy(); frames(6); // one HUD tick
    const fr = els.fSpeed.textContent; G.resetRun(); frames(6);
    ok('the speed line shows frenzy while it runs', fr === 'Forge speed x2.5: level 1, frenzy x2' && els.fSpeed.textContent === 'Forge speed x1.25: level 1', fr + ' / ' + els.fSpeed.textContent);

    // material cost lines on a fixture artifact (not a real duck)
    const fx = { id: 'ui_fixture', hall: 'ducks', name: 'Fixture', description: 'test only', cost: [{ kind: 'material', id: 'rose_dust', qty: 5 }], bonus: { type: 'payout', value: 1 } };
    G.ARTS.ARTIFACTS.push(fx);
    try {
      const line = G.artView()[0].items.find((a) => a.id === 'ui_fixture').cost[0];
      ok('a material cost line reads owned of needed', line.mat === true && line.text === '1 of 5 Rose Dust' && G.materialLine() === 'Your materials: Rose Dust 1', line.text);
    } finally { G.ARTS.ARTIFACTS.splice(G.ARTS.ARTIFACTS.indexOf(fx), 1); }

    // the away toast, with and without finished jobs
    st.lv.auto = 0; G.recalc(); els.toast.textContent = 'before';
    const r0 = G.awayBonus(60);
    ok('nothing finished and no helpers: no away toast', r0.jobs === 0 && els.toast.textContent === 'before');
    st.inv.pearl = 200; G.forgeStartUI('rose_dust'); now += 60000;
    const r1 = G.awayBonus(60);
    ok('one job finished away: the toast says so in plain words', r1.jobs === 1 && els.toast.textContent === 'Welcome back! 1 forge job finished while you were away', els.toast.textContent);
    st.lv.auto = 2; G.recalc(); const r2 = G.awayBonus(60);
    ok('with helpers and no jobs, the toast names only the juice', r2.jobs === 0 && /^Welcome back! Your helpers popped .+ juice while you were away$/.test(els.toast.textContent), els.toast.textContent);

    // Fresh Batch and loads refresh the open panel
    els.forge.hidden = false; G.updateForge(); const stockBefore = els.fStock.textContent;
    st.runEarned = E.COLLAPSE_MIN_RUN * 1.2; G.updateShelf(); els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {}); frames(160);
    ok('Fresh Batch keeps the panel open and its stock', els.forge.hidden === false && els.fStock.textContent === stockBefore && st.forge.lv.speed === 1, els.fStock.textContent);
    const code = G.encodeSave(Object.assign(G.serialize(), { forge: { slots: [null], stock: { blue_dust: 7 }, lv: { speed: 3, slot: 0 } } }));
    ok('importing a save leaves no stale numbers in the open panel', G.checkImport(code) === 'ok' && G.applyImport() === true && els.fStock.textContent === 'Blue Dust 7' && els.fSpeed.textContent === 'Forge speed x1.75: level 3', els.fStock.textContent + ' / ' + els.fSpeed.textContent);
  } finally { Date.now = realNow; }
};
