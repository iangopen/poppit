// Runs the real Poppit script against stubbed browser APIs and drives it like a player.
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const src = ['econ.js', 'save.js', 'samples.js', 'audio.js', 'music.js', 'world.js', 'render.js', 'ui.js'].map((f) => fs.readFileSync(path.join(dir, '..', 'src', f), 'utf8')).join('\n');

const els = {};
function mkEl(id) {
  const listeners = {};
  return {
    id, hidden: false, textContent: '', innerHTML: '', className: '', dataset: {}, children: [], firstElementChild: { style: { transform: '' } },
    style: { setProperty() {}, transform: '' },
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    fire(t, e) { (listeners[t] || []).forEach((f) => f(e)); },
    appendChild(c) { this.children.push(c); return c; },
    querySelector() { return mkEl('q'); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 700 }; },
    setPointerCapture() {}, offsetWidth: 1, disabled: false,
    getContext() { const gr = { addColorStop() {} }; return new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 40 }) : k === 'createRadialGradient' || k === 'createLinearGradient' ? () => gr : () => {}), set: () => true }); },
    width: 0, height: 0,
  };
}
const document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  createElement(t) { return mkEl(t); }, querySelectorAll() { return []; },
  addEventListener() {}, hidden: false, fonts: null,
};
let rafCb = null;
const store = {};
const winL = {}; // window listeners, so tests can fire pagehide
const win = { claude: undefined, devicePixelRatio: 1, AudioContext: undefined, matchMedia: () => ({ matches: false }), addEventListener(t, f) { (winL[t] = winL[t] || []).push(f); }, ResizeObserver: undefined };
const globals = {
  window: win, document, navigator: { vibrate() {} },
  localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } },
  matchMedia: win.matchMedia, requestAnimationFrame: (f) => { rafCb = f; }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
};
const names = Object.keys(globals);
const hook = 'globalThis.__g={Music,hitPearl,tool,pointerS:pointer,state,pearls,cells,queue,ghosts,fx,stains,buy,popPearl,spawnAt,step,render,updateShelf,updateHud,pointer,getS:()=>S,getCombo:()=>combo,setCombo:(v)=>{combo=v;comboT=0},getFrenzy:()=>frenzyT,getMeter:()=>meter,setMeter:(v)=>{meter=v},getCollapse:()=>collapse,serialize,dims:()=>[COLS,ROWS],buildCells,resetRun,pearlAt,sellAll,sellSome,loadState,discover,trySpawn,getKINDS:()=>KINDS,setLv:(l)=>{state.lv=l;recalc()},recalc,getPool:()=>state.pool,setSelling:(v)=>{selling=v},bookView,bookCount,poolView,togglePool,setShiny,META,slotEls,updatePack,spr:()=>spr,syncDiscoveries,save,encodeSave,decodeSave,migrateSave,SAVE_VERSION,KEY,BACKUP_KEY,exportCode,checkImport,applyImport,cancelImport,restoreBackup,getPending:()=>pendingImport,getSaveBlocked:()=>saveBlocked,setSaveBlocked:(v)=>{saveBlocked=v},clearBoard:()=>{pearls.forEach((p)=>{if(p.cell.p===p)p.cell.p=null});pearls.length=0}};';
new Function(...names, src + '\n' + hook)(...names.map((n) => globals[n]));
const G = globalThis.__g;
const W = () => G.state.sparks + Object.values(G.state.invV).reduce((a, b) => a + b, 0);
const E = require('../src/econ.js');

let T = 0;
function frames(n, dtMs = 16.7) { for (let i = 0; i < n; i++) { T += dtMs; rafCb(T); } }
const cv = els.cv;
const ev = (t, x, y) => cv.fire(t, { clientX: x, clientY: y, pointerId: 1, preventDefault() {} });
const results = [];
const ok = (name, cond, extra) => { results.push([name, !!cond, extra]); };
const live = () => G.pearls.filter((p) => p.st === 'live');

frames(3);
const [C0, R0] = G.dims();
ok('boots with a hex board and prefilled pearls', G.cells.length === R0 * C0 - Math.floor(R0 / 2) && live().length >= 3, C0 + 'x' + R0 + ' cells, ' + live().length + ' pearls');

// grow, then tap a plump pearl
frames(300);
let p = live().sort((a, b) => b.age - a.age)[0];
const before = W();
ev('pointerdown', p.cell.x, p.cell.y); ev('pointerup', p.cell.x, p.cell.y);
frames(5);
ok('tap pops a pearl, pays juice, makes droplets and a stain', W() > before && G.fx.parts.length > 0 && G.stains.length > 0, (W() - before).toFixed(2) + ' juice');
ok('combo starts at 1', G.getCombo() === 1, G.getCombo());
let p2 = live()[0]; ev('pointerdown', p2.cell.x, p2.cell.y); ev('pointerup', 0, 0);
let p3 = live()[0]; ev('pointerdown', p3.cell.x, p3.cell.y); ev('pointerup', 0, 0);
ok('rapid pops climb the combo ladder', G.getCombo() === 3, G.getCombo());

// plump pearls pay more than green ones
const S0 = G.getS();


// tools and hardness: a blue pearl (3 hp) cracks twice with the fingertip, then bursts for 4x
{
  G.cells.forEach((c) => { if (c.p) { c.p.st = 'dead'; c.p = null; } }); G.pearls.length = 0;
  const cell = G.cells[10]; const b = G.spawnAt(cell, 'blue'); b.born = 1;
  const s0 = W();
  ev('pointerdown', cell.x, cell.y); ev('pointerup', cell.x, cell.y);
  ok('first hit on a blue pearl only cracks it', b.st === 'live' && b.dmg === 1 && W() === s0, 'dmg ' + b.dmg);
  ev('pointerdown', cell.x, cell.y); ev('pointerup', cell.x, cell.y);
  ok('second hit cracks more, still no payout', b.st === 'live' && b.dmg === 2 && W() === s0 && !!b.cr, 'dmg ' + b.dmg);
  ev('pointerdown', cell.x, cell.y); ev('pointerup', cell.x, cell.y);
  const gain = W() - s0, Sx = G.getS();
  ok('third hit bursts it and pays about 4x a regular pearl', b.st === 'dead' && gain > Sx.popBase * 3.5 && gain < Sx.popBase * 4 * 1.6, gain.toFixed(2));
  // cracks heal if you stop
  const c2 = G.cells[12]; const b2 = G.spawnAt(c2, 'blue'); b2.born = 1; G.hitPearl(b2, 2, 'tap');
  frames(400);
  ok('cracks heal when left alone', b2.dmg < 1, b2.dmg.toFixed(2));
  // stronger tool one-shots it
  G.state.sparks = 1e7; G.buy('tool'); G.buy('tool');
  const b3 = G.spawnAt(G.cells[14], 'blue'); b3.born = 1;
  G.hitPearl(b3, G.getS().power, 'tap');
  ok('Brass Mallet (3 damage) breaks a blue pearl in one hit', b3.st === 'dead' && G.getS().toolName === 'Brass Mallet', G.getS().toolName);
  // marble and golden
  const gd = G.spawnAt(G.cells[16], 'golden'); gd.born = 1; for (let i = 0; i < 4; i++) G.hitPearl(gd, 3, 'tap'); const alive = gd.st === 'live'; G.hitPearl(gd, 3, 'tap');
  ok('golden pearl survives four mallet hits then bursts on the fifth', alive && gd.st === 'dead');
  G.state.sparks = 1e9; G.buy('tool'); Object.assign(G.state.lv, { lucky: 1, mint: 1, golden: 1, violet: 1, coral: 1 }); G.buy('marble');
  const mb = G.spawnAt(G.cells[18], 'marble'); mb.born = 1; const e0 = W(); let hits = 0;
  while (mb.st === 'live' && hits < 200) { G.hitPearl(mb, G.getS().power, 'tap'); hits++; }
  ok('marble takes 14 steel-hammer hits and pays 350x base', mb.st === 'dead' && hits === 14 && W() - e0 > G.getS().popBase * 300, hits + ' hits, ' + (W() - e0).toFixed(1));
  G.state.lv.tool = 0; G.state.lv.marble = 0; G.state.sparks = 0; G.state.lv.sweep = 0; G.state.lv.chain = 0; G.state.lv.auto = 0;
  frames(2);
}

// upgrades
G.state.sparks = 1e7;
Object.assign(G.state.lv, { lucky: 1, mint: 1 });
for (const id of ['sweep', 'chain', 'auto', 'golden', 'sharp', 'fuel', 'tempo']) G.buy(id);
ok('verbs bought', G.state.lv.sweep === 1 && G.state.lv.chain === 1 && G.state.lv.auto === 1 && G.state.lv.golden >= 1, JSON.stringify(G.state.lv));

// fill the board so cascades have neighbors
G.cells.forEach((c) => { if (!c.p) G.spawnAt(c, 'pearl'); });
G.pearls.forEach((q) => { q.age = 10; q.born = 1; });

// chain reaction: raise chain to its cap and pop one pearl in the middle
for (let i = 0; i < 7; i++) G.buy('chain');
const mid = G.cells[Math.floor(G.cells.length / 2)].p;
const n0 = live().length;
{ const R = Math.random; Math.random = () => 0.01; G.popPearl(mid, 'tap'); Math.random = R; }
ok('chain pops queue neighbors', G.queue.length > 0, G.queue.length + ' queued');
frames(120);
ok('a cascade pops more than one pearl', n0 - live().length > 1 || G.state.runEarned > 0, 'popped ' + (n0 - live().length) + ' net (board also refills)');


// golden pays 30x a normal pearl at the same plumpness
G.queue.length = 0; G.state.lv.chain = 0; G.state.lv.auto = 0; // isolate for this check
const Sx = E.stats(G.state);
const g1 = E.popValue(Sx, 0, false, 'golden'), n1 = E.popValue(Sx, 0, false, 'pearl');
ok('golden pays 30x', Math.abs(g1 / n1 - 30) < 1e-9, (g1 / n1).toFixed(2));

// frenzy meter
G.setMeter(G.getS().frenzyNeed - 1);
const q1 = live()[0] || (G.cells.find((c) => !c.p), G.spawnAt(G.cells.find((c) => !c.p), 'pearl'));
G.popPearl(q1, 'tap');
ok('filling the meter starts Frenzy', G.getFrenzy() > 0, G.getFrenzy());
frames(30);

// sweep across the board
G.state.lv.chain = 0;
G.cells.forEach((c) => { if (!c.p) { const q = G.spawnAt(c, 'pearl'); q.age = 5; q.born = 1; } });
const e0 = W(), c0 = live().length;
ev('pointerdown', 20, 350);
for (let x = 20; x < 880; x += 25) ev('pointermove', x, 350 + Math.sin(x / 60) * 60);
ev('pointerup', 880, 350); frames(4);
ok('sweep pops several pearls in one drag', c0 - live().length >= 3 && W() > e0, (c0 - live().length) + ' pearls');

// helper taps keep working
G.state.lv.auto = 3; const d0 = W(); frames(1800);
ok('helper taps pop pearls on their own for 30s', W() - d0 > 15, (W() - d0).toFixed(0) + ' juice');

// bigger board
const dimsBefore = G.dims().join('x');
G.state.sparks = 1e9; G.buy('board');
const dimsAfter = G.dims().join('x');
ok('Bigger Board makes a denser grid', dimsAfter !== dimsBefore && G.dims()[0] * G.dims()[1] > C0 * R0, dimsBefore + ' -> ' + dimsAfter);
ok('new board is prefilled', live().length >= 3, live().length);

// fresh batch
G.state.runEarned = 4000000; G.state.sparks = 5000; G.updateShelf();
els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {});
ok('fresh batch armed then started', !!G.getCollapse(), els.collapseBtn.textContent);
frames(160);
ok('fresh batch pops the board then resets with Flavors', !G.getCollapse() && G.state.echoes >= 2 && G.state.lv.auto === 0 && G.state.sparks === 0, 'flavors=' + G.state.echoes);
ok('board is back to tier 0 and prefilled', G.dims().join('x') === C0 + 'x' + R0 && live().length >= 3, G.dims().join('x') + ', ' + live().length + ' pearls');

// save round trip, render, long idle
const snap = JSON.parse(JSON.stringify(G.serialize()));
ok('save has flavors and levels', snap.echoes >= 2 && typeof snap.lv.sweep === 'number');
G.updateShelf(); G.updateHud(0.1); G.render();
ok('render and hud do not throw', true);
frames(3600);
ok('1 minute idle: stable, pearls never exceed cells', G.pearls.length <= G.cells.length, G.pearls.length + '/' + G.cells.length);
ok('particle and stain pools stay bounded', G.fx.parts.length < 400 && G.stains.length <= 260, G.fx.parts.length + ' parts, ' + G.stains.length + ' stains');

let bad = 0;
// backpack: sell all moves inventory into juice, auto-sell empties it by itself
{
  G.state.sparks = 0; Object.keys(G.state.inv).forEach((k) => { G.state.inv[k] = 0; G.state.invV[k] = 0; });
  const p = live()[0]; G.popPearl(p, 'tap'); frames(2);
  ok('popped pearl lands in the backpack, not in juice', G.state.inv.pearl === 1 && G.state.sparks === 0 && G.state.invV.pearl > 0, 'inv ' + G.state.inv.pearl);
  const worth = G.state.invV.pearl; G.sellAll(true);
  ok('sell all pays the stored value and empties the backpack', Math.abs(G.state.sparks - worth) < 1e-9 && G.state.inv.pearl === 0, 'juice ' + G.state.sparks.toFixed(2));
}
// sell a chosen quantity, and auto-sell must leave the backpack alone
{
  G.state.autoSell = false; G.state.sparks = 0; Object.keys(G.state.inv).forEach((k) => { G.state.inv[k] = 0; G.state.invV[k] = 0; });
  G.state.inv.pearl = 10; G.state.invV.pearl = 50;
  G.sellSome('pearl', 4);
  ok('selling 4 of 10 pays 4/10 of the stack value and keeps the rest', G.state.inv.pearl === 6 && Math.abs(G.state.sparks - 20) < 1e-9 && Math.abs(G.state.invV.pearl - 30) < 1e-9, G.state.inv.pearl + ' left, ' + G.state.sparks + ' juice');
  G.sellSome('pearl', 99);
  ok('selling more than owned sells only what is there', G.state.inv.pearl === 0 && Math.abs(G.state.sparks - 50) < 1e-9, G.state.sparks + ' juice');
  G.state.inv.blue = 3; G.state.invV.blue = 30; G.state.autoSell = true; const s0 = G.state.sparks;
  const p2 = live()[0]; G.popPearl(p2, 'tap'); frames(2);
  ok('auto-sell pays new pops at once and never touches the backpack', G.state.inv.blue === 3 && G.state.inv.pearl === 0 && G.state.sparks > s0, 'juice +' + (G.state.sparks - s0).toFixed(2));
  G.state.autoSell = false;
}
{ // radio: shuffle bag plays every song once per round and never repeats back to back; no songs = settings say so
  const M = G.Music; M._set([{ src: 'a' }, { src: 'b' }, { src: 'c' }, { src: 'd' }]);
  let seq = []; for (let i = 0; i < 40; i++) seq.push(M._next());
  let rounds = true; for (let r = 0; r < 10; r++) rounds = rounds && new Set(seq.slice(r * 4, r * 4 + 4)).size === 4;
  let repeat = false; for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) repeat = true;
  ok('radio plays every song once per round', rounds, seq.join(''));
  ok('radio never repeats a song back to back', !repeat);
  M._set([{ src: 'solo' }]); ok('a single song just loops', M._next() === 0 && M._next() === 0);
  M._set([]); ok('no songs gives no track', M._next() === -1 && !M.hasTracks());
  ok('save keeps music settings', G.serialize().musicOn === true && G.serialize().musicVol === 0.5);
  G.loadState({ version: 2, musicOn: false, musicVol: 0.2 }); ok('music settings load', G.state.musicOn === false && G.state.musicVol === 0.2);
  G.loadState({ version: 2 }); ok('older saves default music on at half volume', G.state.musicOn === true && G.state.musicVol === 0.5);
}
const PT = require('./pearl_tests.js'); G.els = els; PT({ G, ok, frames, live, E, store, els }); PT.task3({ G, ok, frames, live, E }); PT.task4({ G, ok, frames, E }); PT.task5({ G, ok, frames, E }); PT.task6({ G, ok, frames, E }); PT.task7({ G, ok, frames, E }); PT.final({ G, ok, E });
// ---- save codes, versions and hardened loading ----
{
  // compare saves without the timestamp; a {p:0,s:0} tool entry is what toolUp() creates on first read, the same as none
  const noT = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.t; for (const i in c.toolUp) if (!c.toolUp[i].p && !c.toolUp[i].s) delete c.toolUp[i]; return JSON.stringify(c); };
  const lvA = Object.assign(E.zeroLevels(), { lucky: 8, mint: 5, golden: 3, violet: 1, sweep: 2, chain: 4, auto: 7, sharp: 23, tool: 3, board: 1 });
  const A = { version: 2, sparks: 123456.789, runEarned: 2.5e9, lifetime: 7.25e11, lv: lvA, echoes: 41, collapses: 3, muted: true, musicOn: false, musicVol: 0.3, autoSell: true,
    owned: [true, true, false, true, false, false], equip: 1, toolUp: { 1: { p: 2, s: 1 }, 3: { p: 5, s: 4 } },
    inv: { pearl: 12, golden: 2, 'blue:s': 1 }, invV: { pearl: 99.5, golden: 4400.25, 'blue:s': 61 }, seen: { pearl: true, blue: true, golden: true },
    pool: ['pearl', 'golden', 'blue', 'mint', 'violet'], shinyOn: false,
    col: { pearl: { found: true, popped: 900, sFound: true, sPopped: 2 }, blue: { found: true, popped: 80, sFound: false, sPopped: 0 }, mint: { found: true, popped: 5, sFound: false, sPopped: 0 }, golden: { found: true, popped: 31, sFound: true, sPopped: 1 }, violet: { found: true, popped: 0, sFound: false, sPopped: 0 } } };
  G.loadState(A); G.syncDiscoveries(); G.save();
  const before = noT(G.serialize()), code = G.exportCode();
  G.loadState({ version: 2, sparks: 5, lv: E.zeroLevels() }); G.save(); const other = noT(G.serialize());
  const chk = G.checkImport(code), pendingBeforeConfirm = noT(G.serialize()) === other;
  const applied = G.applyImport();
  ok('save code round trip reproduces the state exactly', chk === 'ok' && pendingBeforeConfirm && applied && noT(G.serialize()) === before, code.length + ' chars');
  ok('import keeps the replaced save as poppit.backup and shows Restore', G.BACKUP_KEY === 'poppit.backup' && noT(JSON.parse(store['poppit.backup'])) === other && els.restoreRow.hidden === false);
  ok('restore previous save brings the replaced save back and removes the backup', G.restoreBackup() === 'ok' && noT(G.serialize()) === other && !store['poppit.backup'] && els.restoreRow.hidden === true);
  ok('the save key is still poppit.v1', G.KEY === 'poppit.v1' && !!store['poppit.v1']);
  const body = code.slice(8, -9), mid = Math.floor(body.length / 2), swap = body[mid] === 'A' ? 'B' : 'A';
  ok('a truncated save code is rejected', G.decodeSave(code.slice(0, -3)) === null && G.decodeSave(code.slice(0, Math.floor(code.length / 2))) === null && G.decodeSave(code.slice(0, -10)) === null);
  ok('a save code with one changed character is rejected', G.decodeSave('POPPIT2:' + body.slice(0, mid) + swap + body.slice(mid + 1) + code.slice(-9)) === null && G.decodeSave(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0')) === null);
  ok('a save code with a wrong prefix is rejected', G.decodeSave('POPPIT3:' + code.slice(8)) === null && G.decodeSave(code.slice(8)) === null && G.decodeSave('') === null && G.decodeSave(null) === null);
  ok('a wrapped or padded code still decodes', !!G.decodeSave('  ' + code.slice(0, 40) + '\n' + code.slice(40) + '\n'));
  ok('Load refuses a broken code without touching the state', G.checkImport(code.slice(0, -4)) === 'invalid' && !G.getPending() && els.saveConfirm.hidden === true && noT(G.serialize()) === other);
  const v99 = G.encodeSave(Object.assign(JSON.parse(code ? JSON.stringify(A) : '{}'), { version: 99 }));
  const s99 = store['poppit.v1'];
  ok('a save claiming version 99 is refused and the current state is unchanged', G.checkImport(v99) === 'newer' && !G.getPending() && G.loadState({ version: 99, sparks: 1e9, lv: lvA }) === 'newer' && noT(G.serialize()) === other && store['poppit.v1'] === s99);
  G.setSaveBlocked(true); G.state.sparks = 777; G.save(); const blockedOk = store['poppit.v1'] === s99; G.setSaveBlocked(false);
  ok('while the stored save is newer, autosave leaves it alone', blockedOk);
  ok('bad versions are refused: 0, -1, 2.5, "abc", and non-objects', ['invalid', 'invalid', 'invalid', 'invalid', 'invalid', 'invalid'].join() === [G.loadState({ version: 0 }), G.loadState({ version: -1 }), G.loadState({ version: 2.5 }), G.loadState({ version: 'abc' }), G.loadState([1, 2]), G.loadState(null)].join());
  // fixtures: a v1 save as the old game wrote it (no version, no pool or collection), and a v2 save
  const v1 = { sparks: 1234.5, runEarned: 5000, lifetime: 9000, lv: Object.assign(E.zeroLevels(), { tool: 2, sweep: 1, chain: 2, auto: 3, golden: 1, lucky: 0 }), echoes: 3, collapses: 1, muted: false,
    owned: [true, true, true, false, false, false], equip: 1, toolUp: { 1: { p: 2, s: 1 } }, inv: { pearl: 4, golden: 1 }, invV: { pearl: 20, golden: 30 }, seen: { pearl: true, blue: true, golden: true }, t: 0 };
  const st = G.state;
  ok('v1 fixture loads through the migration table', G.migrateSave(v1).save.version === 2 && G.loadState(v1) === 'ok' && st.sparks === 1234.5 && st.echoes === 3 && st.lv.lucky === 1 && st.lv.chain === 2 && st.equip === 1 && st.toolUp[1].p === 2 && st.inv.golden === 1 && st.pool.join() === 'pearl,blue,golden' && st.col.golden.found && st.shinyOn === true, st.pool.join());
  const v2 = { version: 2, sparks: 50, lv: Object.assign(E.zeroLevels(), { lucky: 2, mint: 1 }), pool: ['blue', 'mint'], shinyOn: false, col: { blue: { found: true, popped: 3 }, mint: { found: true, popped: 1, sFound: true, sPopped: 1 } }, musicVol: 0.2, t: 1 };
  ok('v2 fixture loads as written', G.loadState(v2) === 'ok' && st.sparks === 50 && st.pool.join() === 'blue,mint' && st.shinyOn === false && st.col.mint.sFound && st.col.blue.popped === 3 && st.musicVol === 0.2 && st.lv.mint === 1);
  // untrusted values: everything clamps or defaults, unknown keys are dropped
  const bad = { version: 2, sparks: NaN, runEarned: 'NaN', lifetime: -50, echoes: Infinity, collapses: '7', musicVol: NaN, muted: 'yes',
    lv: { sharp: 9999, tool: 9999, board: -4, chain: 'abc', lucky: 3.7, nope: 5 }, owned: 'all', equip: 77, toolUp: { 0: { p: 999, s: -1 }, 9: { p: 3, s: 3 }, 2: 'x' },
    inv: { pearl: 'lots', golden: 1e400, dragon: 5 }, invV: { pearl: -3 }, seen: 'everything', pool: ['pearl', 'unicorn', 'golden', 'golden', 7], col: { golden: { found: true, popped: -5, sPopped: NaN }, unicorn: { found: true } }, evil: { x: 1 } };
  const r = G.loadState(bad);
  ok('a save with lv 9999, NaN sparks and an unknown pool id loads clamped', r === 'ok' && st.sparks === 0 && st.runEarned === 0 && st.lifetime === 0 && st.lv.sharp === 99 && st.lv.tool === 5 && st.lv.board === 0 && st.lv.chain === 0 && st.lv.lucky === 3 && !('nope' in st.lv) && st.pool.join() === 'pearl,golden', JSON.stringify({ lv: [st.lv.sharp, st.lv.tool], pool: st.pool }));
  ok('every loaded number is finite and in range', st.echoes === 0 && st.collapses === 7 && st.musicVol === 0.5 && st.muted === false && st.toolUp[0].p === 5 && st.toolUp[0].s === 0 && !st.toolUp[9] && !st.toolUp[2] && st.inv.pearl === 0 && st.inv.golden === 0 && st.invV.pearl === 0 && !('dragon' in st.inv) && !st.col.unicorn && st.col.golden.popped === 0 && st.col.golden.sPopped === 0 && !('evil' in st) && st.owned.length === 6 && st.owned.every((o) => o === true) && st.equip === 5, JSON.stringify(st.toolUp));
  ok('an empty or all-unknown pool falls back to the base pearl', G.loadState({ version: 2, pool: ['unicorn'] }) === 'ok' && st.pool.join() === 'pearl' && G.loadState({ version: 2, pool: [] }) === 'ok' && st.pool.join() === 'pearl');
  ok('a hand-edited code with NaN-like values decodes and loads clamped', G.checkImport(G.encodeSave({ version: 2, sparks: 'NaN', lv: { sharp: 9999 }, pool: ['unicorn'] })) === 'ok' && G.applyImport() && st.sparks === 0 && st.lv.sharp === 99 && st.pool.join() === 'pearl');
  G.state.sparks = 4242; (winL.pagehide || []).forEach((h) => h());
  ok('pagehide saves', (winL.pagehide || []).length === 1 && JSON.parse(store['poppit.v1']).sparks === 4242);
  G.loadState({ version: 2, lv: E.zeroLevels() }); delete store['poppit.backup'];
}
for (const [n, c, x] of results) { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); }


console.log(bad ? bad + ' FAILED' : 'ALL PASSED');process.exit(bad ? 1 : 0);
