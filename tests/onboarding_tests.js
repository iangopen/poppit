// What a new player sees (run from tests/harness32.js): the reveal rules from a fresh state, two saves that passed them showing every
// control they showed before, Reset save, the goal table, the "new" dots, and toasts batched within a second.
module.exports = ({ G, ok, E, els, store }) => {
  const st = G.state, realNow = Date.now;
  const col = (ids, popped) => Object.fromEntries(E.PEARLS.map((t) => [t.id, { found: ids.includes(t.id), popped: ids.includes(t.id) ? popped : 0, sFound: false, sPopped: 0 }]));
  // two saves past every reveal threshold: mid-game (800K lifetime juice, four types found) and after a first Fresh Batch
  const FIXTURES = {
    midgame: { version: 8, sparks: 900, runEarned: 800000, lifetime: 800000, lv: { sharp: 12, lucky: 4, spawn: 6, combo: 5, fuel: 2, mint: 2, golden: 1, shiny: 1 }, owned: [true, true, true, false, false, false], equip: -1, toolUp: { 1: { p: 1, s: 0, u: 0 } }, col: col(['pearl', 'blue', 'mint', 'golden'], 900), pool: ['pearl', 'blue', 'mint', 'golden'], autoSell: true },
    veteran: { version: 8, sparks: 0, runEarned: 0, lifetime: 6200000, echoes: 2, collapses: 1, lv: {}, col: col(['pearl', 'blue', 'mint', 'golden', 'violet', 'coral'], 400), pool: ['pearl', 'blue', 'mint', 'golden', 'violet', 'coral'], autoSell: true },
  };
  // the interactive controls each fixture showed before this session: produced by running commit 50de9ac's sources on the same saves
  const BEFORE = {
    midgame: 'packBtn toolBtn bookBtn poolBtn setBtn artBtn forgeBtn collapseBtn resetBtn copySave dlSave saveFile shop:lucky shop:sharp shop:mint shop:golden shop:violet shop:shiny shop:spawn shop:combo shop:fuel shop:board',
    veteran: 'packBtn toolBtn bookBtn poolBtn setBtn artBtn forgeBtn collapseBtn resetBtn copySave dlSave saveFile',
  };
  const ROW_OF = { collapseBtn: 'collapseBox', resetBtn: 'resetRow', copySave: 'copyRow', dlSave: 'dlRow' };
  const CTL = ['packBtn', 'toolBtn', 'bookBtn', 'poolBtn', 'setBtn', 'artBtn', 'forgeBtn', 'collapseBtn', 'resetBtn', 'copySave', 'dlSave', 'saveFile'];
  const controls = () => CTL.filter((id) => !els[id].hidden && !(ROW_OF[id] && els[ROW_OF[id]].hidden)).concat(E.ORDER.filter((id) => !G.rows[id].el.hidden).map((id) => 'shop:' + id)).join(' ');
  const refresh = () => { G.recalc(); G.updateShelf(); G.syncDock(); };
  const load = (d) => { G.loadState(JSON.parse(JSON.stringify(d))); G.syncDiscoveries(); refresh(); };
  const reset = () => { els.resetBtn.fire('click', {}); els.resetBtn.fire('click', {}); refresh(); };
  const START = 'setBtn saveFile';
  try {
    // ---- the reveal thresholds, one at a time from a fresh state ----
    reset();
    ok('a fresh game shows only Settings (and the save paste box inside it), no dock buttons, no shop heading, no Fresh Batch box',
      controls() === START && els.hTune.hidden && !els.shopEmpty.hidden && els.collapseBox.hidden && els.resetRow.hidden && els.copyRow.hidden, controls());
    st.lifetime = 2; refresh();
    ok('the first juice shows the backpack, and the Reset and save-out rows in Settings', controls() === 'packBtn setBtn resetBtn copySave dlSave saveFile', controls());
    const tAt = 0.4 * Math.min(E.toolPrice(1), E.uniqueCost(0, 0));
    st.lifetime = tAt - 1; refresh(); const toolsBefore = els.toolBtn.hidden;
    st.lifetime = tAt; refresh();
    ok('the Tools button shows at 40% of the cheapest thing in it (' + tAt + ' juice), next to the backpack with no gap', toolsBefore && !els.toolBtn.hidden && els.packBtn.style.left === '6px' && els.toolBtn.style.left === '76px', els.toolBtn.style.left);
    G.discover('blue'); refresh();
    ok('a second pearl type shows the Collection book', !els.bookBtn.hidden && els.poolBtn.hidden && els.bookBtn.style.left === '146px');
    G.discover('mint'); refresh();
    ok('a third type shows the Pool button', !els.poolBtn.hidden);
    st.col.pearl.popped = 99; refresh(); const artsBefore = els.artBtn.hidden;
    st.col.pearl.popped = 100; refresh();
    ok('100 Rose Pearls popped show Artifacts and the Forge, as before this session', artsBefore && !els.artBtn.hidden && !els.forgeBtn.hidden && els.artBtn.style.left === '202px' && els.forgeBtn.style.left === '258px');
    st.lifetime = 0.1 * E.COLLAPSE_MIN_RUN - 1; refresh(); const boxBefore = els.collapseBox.hidden;
    st.lifetime = 0.1 * E.COLLAPSE_MIN_RUN; refresh();
    ok('the Fresh Batch box shows at 10% of a Fresh Batch\'s run juice in lifetime juice (500K)', boxBefore && !els.collapseBox.hidden);
    reset(); st.runEarned = 25; st.sparks = 25; refresh();
    ok('the Upgrades heading shows with its first row, and the empty-shop line goes', !els.hTune.hidden && !G.rows.sharp.el.hidden && els.shopEmpty.hidden);
    reset(); st.col.golden.sFound = true; refresh();
    ok('a shiny alone shows the book and the Pool (the shiny toggle lives there)', !els.bookBtn.hidden && !els.poolBtn.hidden && els.bookBtn.style.left === '6px');

    // ---- saves past the thresholds show every control they showed before ----
    for (const k in FIXTURES) { load(FIXTURES[k]); ok('the ' + k + ' save shows exactly the controls it showed before this session', controls() === BEFORE[k], controls()); }
    load({ version: 8, lifetime: 3000, runEarned: 3000, sparks: 40, lv: { sharp: 2 }, col: col(['pearl'], 40) });
    ok('an early save (3,000 juice, Rose only) gets the new-player view: backpack, Tools and Settings, no Fresh Batch box yet', controls().startsWith('packBtn toolBtn setBtn resetBtn copySave dlSave saveFile') && els.bookBtn.hidden && els.collapseBox.hidden, controls());

    // ---- Reset save returns to the starting view ----
    load(FIXTURES.veteran); reset();
    ok('Reset save returns to the starting view', controls() === START && G.currentGoal().id === 'juice' && !els.goal.hidden, controls());

    // ---- the goal table ----
    ok('the goals, in order', G.GOALS.map((g) => g.id).join() === 'juice,buy,blue,tool,helpers,fresh,duck,forge');
    const seen = [];
    const step = (f) => { f(); refresh(); seen.push(G.updateGoal()); };
    step(() => {});
    step(() => { st.lifetime = 20; });
    step(() => { st.lv.sharp = 1; });
    step(() => { st.col.blue.found = true; });
    step(() => { st.owned[1] = true; });
    step(() => { st.lv.auto = 1; });
    step(() => { st.collapses = 1; });
    step(() => { st.col.pearl.popped = 100; });
    step(() => { G.ARTS.addCopy(st.artifacts, 'pink_duck', 'common', []); });
    step(() => { st.forge.stock.rose_dust = 1; });
    ok('each goal completes on its own test and the next shows; after the Fresh Batch nothing until Artifacts unlock; none once all are done', seen.join() === 'juice,buy,blue,tool,helpers,fresh,,duck,forge,', seen.join());
    reset(); st.collapses = 1; refresh();
    ok('Artifacts and Forge goals wait until their buttons unlock', G.updateGoal() === null && els.goal.hidden);
    reset();
    ok('the first goal names the price of the first upgrade', els.goalText.textContent === 'Pop pearls to earn ' + E.cost('sharp', 0) + ' juice for your first upgrade.', els.goalText.textContent);
    st.lifetime = 20; st.lv.sharp = 1; refresh();
    ok('the goal line reads plainly', els.goalText.textContent === 'Unlock Blue Pearls in the shop. Each pays x7.5.', els.goalText.textContent);
    els.goalX.fire('click', {});
    ok('dismissing hides the line, for that goal, and remembers it on this device', els.goal.hidden && JSON.parse(store['poppit.goalsOff']).join() === 'blue' && G.updateGoal() === null);
    G.updateShelf(); refresh();
    ok('it stays hidden', els.goal.hidden);
    G.discover('blue'); refresh();
    ok('the next goal still shows when it comes', !els.goal.hidden && G.currentGoal().id === 'tool');
    reset();
    ok('Reset save brings dismissed goals back', !store['poppit.goalsOff'] && !els.goal.hidden && G.currentGoal().id === 'juice');

    // ---- the dots ----
    reset(); st.lifetime = 200; refresh(); G.seeDots();
    ok('no dot after a load: what was on offer counts as seen', els.toolsDot.hidden && els.bookDot.hidden);
    st.sparks = E.toolPrice(1); refresh();
    ok('the Tools button gets a dot when the next tool becomes affordable', !els.toolsDot.hidden);
    G.openPanel('tools');
    ok('opening Tools clears it', els.toolsDot.hidden);
    G.openPanel('tools'); refresh();
    ok('and it stays clear after closing', els.toolsDot.hidden && els.tools.hidden);
    G.discover('blue'); refresh();
    ok('a new discovery puts a dot on the Collection book', !els.bookDot.hidden && !els.bookBtn.hidden);
    G.openPanel('book'); G.openPanel('book');
    ok('opening the book clears it', els.bookDot.hidden);
    reset(); G.seeShop(); st.sparks = 19; st.runEarned = 19; refresh();
    ok('a newly shown shop row puts a dot on its group heading', !G.rows.sharp.el.hidden && els.hTune.classList.contains('ndot'));
    for (const id of E.ORDER) if (!G.rows[id].el.hidden) G.seeRow(id); G.syncShopDots();
    ok('seeing the new rows (on screen, or a tap) clears it', !els.hTune.classList.contains('ndot'));
    st.sparks = 20; refresh();
    ok('the row becoming affordable lights it again', G.rows.sharp.can && els.hTune.classList.contains('ndot'));
    G.rows.sharp.el.fire('click', {}); G.updateShelf();
    ok('tapping the row buys it and clears the dot', st.lv.sharp === 1 && !els.hTune.classList.contains('ndot'));

    // ---- toasts within a second share one toast ----
    let now = 2e12; Date.now = () => now;
    G.toast('First'); now += 400; G.toast('Second');
    ok('two toasts 0.4 s apart show together, one per line', els.toast.textContent === 'First\nSecond' && G.lastToast() === 'Second');
    now += 300; G.toast('Second'); now += 200; G.toast('Third'); now += 100; G.toast('Fourth');
    ok('a repeat is not shown twice, and at most three lines stay (the newest)', els.toast.textContent === 'Second\nThird\nFourth', JSON.stringify(els.toast.textContent));
    now += 1500; G.toast('Later');
    ok('a toast more than a second later replaces them', els.toast.textContent === 'Later');
  } finally { Date.now = realNow; reset(); }
};
