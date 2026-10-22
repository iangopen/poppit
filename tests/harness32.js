// Runs the real Poppit script against stubbed browser APIs and drives it like a player.
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const src = ['artifacts.js', 'forge.js', 'econ.js', 'save.js', 'samples.js', 'audio.js', 'music.js', 'world.js', 'render.js', 'ui.js'].map((f) => fs.readFileSync(path.join(dir, '..', 'src', f), 'utf8')).join('\n');

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
    setPointerCapture() {}, focus() {}, select() {}, setAttribute(k, v) { this['attr:' + k] = String(v); }, lastElementChild: { textContent: '' }, offsetWidth: 1, disabled: false,
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
const hook = 'globalThis.__g={Music,hitPearl,tool,pointerS:pointer,state,pearls,cells,queue,ghosts,fx,stains,buy,popPearl,spawnAt,step,render,updateShelf,updateHud,pointer,getS:()=>S,getCombo:()=>combo,setCombo:(v)=>{combo=v;comboT=0},getFrenzy:()=>frenzyT,getMeter:()=>meter,setMeter:(v)=>{meter=v},getCollapse:()=>collapse,serialize,dims:()=>[COLS,ROWS],buildCells,resetRun,pearlAt,sellAll,sellSome,loadState,discover,trySpawn,getKINDS:()=>KINDS,setLv:(l)=>{state.lv=l;recalc()},recalc,getPool:()=>state.pool,setSelling:(v)=>{selling=v},bookView,bookCount,bookEntryHTML,awayBonus,craftArtifact,setActiveCopy,setArtTab,getArtTab:()=>artTab,revealView,skipReveal,closeReveal,placeFromReveal,getRv:()=>rv,revealTick,oddsText,craftReason,pedestalLine,stashWarn,updateArts,startReason,setKeep,isKept,artView,payoutLine,syncArtBtn,forgeStart,forgeStrike,forgeBuy,forgeCatchUp,forgeTick,startFrenzy,forgeView,forgeStartUI,forgeBuyUI,strikeUI,setForgeDot,getForgeDot:()=>forgeDot,updateForge,openPanel,syncDock,PANEL_BTN,ARTS,materialLine,poolView,togglePool,setShiny,META,slotEls,updatePack,spr:()=>spr,syncDiscoveries,save,upTool,viewTool:(i)=>{toolView=i;updateToolPanel()},loadStored,paintRestore,UNREADABLE_KEY,encodeSave,decodeSave,migrateSave,SAVE_VERSION,KEY,BACKUP_KEY,exportCode,checkImport,applyImport,cancelImport,restoreBackup,getPending:()=>pendingImport,getSaveBlocked:()=>saveBlocked,setSaveBlocked:(v)=>{saveBlocked=v},clearBoard:()=>{pearls.forEach((p)=>{if(p.cell.p===p)p.cell.p=null});pearls.length=0}};';
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
ok('a new game has autoSell true', G.state.autoSell === true && els.autoSell.checked === true);
G.updateShelf(); const verbsHiddenAtStart = els.hVerbs.hidden === true;
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


// tools and hardness: a blue pearl (3 hp) cracks twice with the fingertip, then bursts for 7.5x
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
  ok('third hit bursts it and pays about 7.5x a regular pearl', b.st === 'dead' && gain > Sx.popBase * 7.5 && gain < Sx.popBase * 7.5 * 1.6, gain.toFixed(2));
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
  ok('marble takes 14 steel-hammer hits and pays 4000x base', mb.st === 'dead' && hits === 14 && W() - e0 > G.getS().popBase * 4000, hits + ' hits, ' + (W() - e0).toFixed(1));
  G.state.lv.tool = 0; G.state.lv.marble = 0; G.state.sparks = 0; G.state.lv.auto = 0;
  frames(2);
}

// upgrades
G.state.sparks = 1e7;
Object.assign(G.state.lv, { lucky: 1, mint: 1, coral: 0 });
G.buy('auto');
ok('Helpers stay locked until Coral Pearls', G.state.lv.auto === 0 && E.UPG.auto.req(G.state.lv) === false);
G.state.lv.coral = 1; G.updateShelf();
ok('New techniques heading is hidden until Helpers can show, then appears', verbsHiddenAtStart && els.hVerbs.hidden === false);
for (const id of ['auto', 'golden', 'sharp', 'fuel', 'tempo']) G.buy(id);
ok('verbs bought', G.state.lv.auto === 1 && G.state.lv.golden >= 1 && G.state.lv.tempo === 1, JSON.stringify(G.state.lv));
ok('Chain Reaction and Wide Swing are gone from the shop', !('chain' in E.UPG) && !('sweep' in E.UPG) && !E.ORDER.includes('chain') && !E.ORDER.includes('sweep') && !('chain' in G.getS()));

// fill the board so cascades have neighbors
G.cells.forEach((c) => { if (!c.p) G.spawnAt(c, 'pearl'); });
G.pearls.forEach((q) => { q.age = 10; q.born = 1; });

// no chain reaction: popping a pearl in the middle of a full board touches nothing else
const mid = G.cells[Math.floor(G.cells.length / 2)].p;
{ const R = Math.random; Math.random = () => 0.01; G.popPearl(mid, 'tap'); Math.random = R; }
ok('a pop no longer queues its neighbours', G.queue.length === 0, G.queue.length + ' queued');


// golden pays 100x a normal pearl at the same plumpness
G.queue.length = 0; G.state.lv.auto = 0; // isolate for this check
const Sx = E.stats(G.state);
const g1 = E.popValue(Sx, 0, false, 'golden'), n1 = E.popValue(Sx, 0, false, 'pearl');
ok('golden pays 100x', Math.abs(g1 / n1 - 100) < 1e-9, (g1 / n1).toFixed(2));

// frenzy meter
G.setMeter(G.getS().frenzyNeed - 1);
const q1 = live()[0] || (G.cells.find((c) => !c.p), G.spawnAt(G.cells.find((c) => !c.p), 'pearl'));
G.popPearl(q1, 'tap');
ok('filling the meter starts Frenzy', G.getFrenzy() > 0, G.getFrenzy());
frames(30);

// sweep across the board: Wide Swing is the Steel Pin's own upgrade, so it only works with the pin in hand
const drag = () => {
  G.cells.forEach((c) => { if (!c.p) { const q = G.spawnAt(c, 'pearl'); q.age = 5; q.born = 1; } });
  const before = live().length; let popped = 0; const h0 = G.state.col.pearl.popped;
  ev('pointerdown', 20, 350);
  for (let x = 20; x < 880; x += 25) ev('pointermove', x, 350 + Math.sin(x / 60) * 60);
  ev('pointerup', 880, 350); popped = G.state.col.pearl.popped - h0; frames(1);
  return popped;
};
G.state.owned[1] = true; G.state.toolUp[0] = { p: 0, s: 0, u: 1 }; G.state.equip = 0; G.recalc();
const e0 = W(), withPin = drag();
ok('sweep pops several pearls in one drag', withPin >= 3 && W() > e0, withPin + ' pearls');
ok('sweep is active with the Steel Pin equipped', G.getS().sweep === true && G.getS().brush > 0);
G.state.equip = 1; G.recalc();
const withAwl = drag();
ok('sweep is inactive with the Awl equipped: a drag pops at most the pearl under the press', G.getS().sweep === false && withAwl <= 1, withAwl + ' pearls');
G.state.equip = 0; G.state.toolUp[0].u = 0; G.recalc();
ok('a Steel Pin without Wide Swing does not sweep either', G.getS().sweep === false);
G.state.owned[1] = false; G.state.equip = -1; G.recalc();

// helper taps keep working
G.state.lv.auto = 3; G.recalc(); const d0 = W(); frames(1800);
ok('helper taps pop pearls on their own for 30s', W() - d0 > 15, (W() - d0).toFixed(0) + ' juice');

// bigger board
const dimsBefore = G.dims().join('x');
G.state.sparks = 1e9; G.buy('board');
const dimsAfter = G.dims().join('x');
ok('Bigger Board makes a denser grid', dimsAfter !== dimsBefore && G.dims()[0] * G.dims()[1] > C0 * R0, dimsBefore + ' -> ' + dimsAfter);
ok('new board is prefilled', live().length >= 3, live().length);

// fresh batch
G.state.runEarned = E.COLLAPSE_MIN_RUN * 1.2; G.state.sparks = 5000; G.updateShelf();
els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {});
ok('fresh batch armed then started', !!G.getCollapse(), els.collapseBtn.textContent);
frames(160);
ok('fresh batch pops the board then resets with Flavors', !G.getCollapse() && G.state.echoes >= 2 && G.state.lv.auto === 0 && G.state.sparks === 0, 'flavors=' + G.state.echoes);
ok('board is back to tier 0 and prefilled', G.dims().join('x') === C0 + 'x' + R0 && live().length >= 3, G.dims().join('x') + ', ' + live().length + ' pearls');

// save round trip, render, long idle
const snap = JSON.parse(JSON.stringify(G.serialize()));
ok('save has flavors and levels', snap.echoes >= 2 && typeof snap.lv.sharp === 'number' && snap.version === G.SAVE_VERSION);
G.updateShelf(); G.updateHud(0.1); G.render();
ok('render and hud do not throw', true);
frames(3600);
ok('1 minute idle: stable, pearls never exceed cells', G.pearls.length <= G.cells.length, G.pearls.length + '/' + G.cells.length);
ok('particle and stain pools stay bounded', G.fx.parts.length < 400 && G.stains.length <= 260, G.fx.parts.length + ' parts, ' + G.stains.length + ' stains');

let bad = 0;
// backpack: sell all moves inventory into juice, auto-sell empties it by itself
{
  G.state.autoSell = false; // manual selling, now that auto-sell starts on
  G.state.sparks = 0; Object.keys(G.state.inv).forEach((k) => { G.state.inv[k] = 0; G.state.invV[k] = 0; });
  const p = live()[0]; G.popPearl(p, 'tap'); frames(6); // > 0.08 s, so the HUD tick refreshes the backpack
  ok('popped pearl lands in the backpack, not in juice', G.state.inv.pearl === 1 && G.state.sparks === 0 && G.state.invV.pearl > 0, 'inv ' + G.state.inv.pearl);
  const worth = G.state.invV.pearl; G.sellAll(true);
  ok('sell all pays the stored value and empties the backpack', Math.abs(G.state.sparks - worth) < 1e-9 && G.state.inv.pearl === 0, 'juice ' + G.state.sparks.toFixed(2));
}
// sell a chosen quantity, and auto-sell must leave the backpack alone
{
  G.state.autoSell = false; G.state.sparks = 0; Object.keys(G.state.inv).forEach((k) => { G.state.inv[k] = 0; G.state.invV[k] = 0; });
  G.state.inv.pearl = 10; G.state.invV.pearl = 50; frames(6);
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
const PT = require('./pearl_tests.js'); G.els = els; PT({ G, ok, frames, live, E, store, els }); PT.task3({ G, ok, frames, live, E }); PT.task4({ G, ok, frames, E }); PT.task5({ G, ok, frames, E }); PT.task6({ G, ok, frames, E }); PT.task7({ G, ok, frames, E }); PT.final({ G, ok, E, frames }); require('./artifact_tests.js')({ G, ok, frames, E, store, els }); require('./forge_tests.js')({ G, ok, frames, E, store, els }); require('./forge_ui_tests.js')({ G, ok, frames, E, store, els }); require('./relic_tests.js')({ G, ok, frames, E, store, els }); require('./reveal_tests.js')({ G, ok, frames, E, store, els });
// ---- save codes, versions and hardened loading ----
{
  // compare saves without the timestamp; a {p:0,s:0} tool entry is what toolUp() creates on first read, the same as none
  const noT = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.t; for (const i in c.toolUp) if (!c.toolUp[i].p && !c.toolUp[i].s && !c.toolUp[i].u) delete c.toolUp[i]; return JSON.stringify(c); };
  const lvA = Object.assign(E.zeroLevels(), { lucky: 8, mint: 5, golden: 3, violet: 1, coral: 1, auto: 7, sharp: 23, tool: 3, board: 1 });
  const A = { version: G.SAVE_VERSION, sparks: 123456.789, runEarned: 2.5e9, lifetime: 7.25e11, lv: lvA, echoes: 41, collapses: 3, muted: true, musicOn: false, musicVol: 0.3, autoSell: true,
    owned: [true, true, false, true, false, false], equip: 1, toolUp: { 0: { p: 1, s: 0, u: 2 }, 1: { p: 2, s: 1, u: 0 }, 3: { p: 5, s: 4, u: 0 } },
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
  ok('v1 fixture loads through the migration table', G.migrateSave(v1).save.version === G.SAVE_VERSION && G.loadState(v1) === 'ok' && st.sparks === 1234.5 + 660 + 1650 && st.echoes === 3 && st.lv.lucky === 1 && st.toolUp[0].u === 1 && !('chain' in st.lv) && !('sweep' in st.lv) && st.equip === 1 && st.toolUp[1].p === 2 && st.inv.golden === 1 && st.pool.join() === 'pearl,blue,golden' && st.col.golden.found && st.shinyOn === true, st.pool.join());
  const v2 = { version: 2, sparks: 50, lv: Object.assign(E.zeroLevels(), { lucky: 2, mint: 1 }), pool: ['blue', 'mint'], shinyOn: false, col: { blue: { found: true, popped: 3 }, mint: { found: true, popped: 1, sFound: true, sPopped: 1 } }, musicVol: 0.2, t: 1 };
  ok('v2 fixture loads as written', G.loadState(v2) === 'ok' && st.sparks === 50 && st.pool.join() === 'blue,mint' && st.shinyOn === false && st.col.mint.sFound && st.col.blue.popped === 3 && st.musicVol === 0.2 && st.lv.mint === 1);
  // untrusted values: everything clamps or defaults, unknown keys are dropped
  const bad = { version: 2, sparks: NaN, runEarned: 'NaN', lifetime: -50, echoes: Infinity, collapses: '7', musicVol: NaN, muted: 'yes',
    lv: { sharp: 9999, tool: 9999, board: -4, chain: 'abc', lucky: 3.7, nope: 5 }, owned: 'all', equip: 77, toolUp: { 0: { p: 999, s: -1 }, 9: { p: 3, s: 3 }, 2: 'x' },
    inv: { pearl: 'lots', golden: 1e400, dragon: 5 }, invV: { pearl: -3 }, seen: 'everything', pool: ['pearl', 'unicorn', 'golden', 'golden', 7], col: { golden: { found: true, popped: -5, sPopped: NaN }, unicorn: { found: true } }, evil: { x: 1 } };
  const r = G.loadState(bad);
  ok('a save with lv 9999, NaN sparks and an unknown pool id loads clamped', r === 'ok' && st.sparks === 0 && st.runEarned === 0 && st.lifetime === 0 && st.lv.sharp === 99 && st.lv.tool === 5 && st.lv.board === 0 && !('chain' in st.lv) && st.lv.lucky === 3 && !('nope' in st.lv) && st.pool.join() === 'pearl,golden', JSON.stringify({ lv: [st.lv.sharp, st.lv.tool], pool: st.pool }));
  ok('every loaded number is finite and in range', st.echoes === 0 && st.collapses === 7 && st.musicVol === 0.5 && st.muted === false && st.toolUp[0].p === 5 && st.toolUp[0].s === 0 && !st.toolUp[9] && !st.toolUp[2] && st.inv.pearl === 0 && st.inv.golden === 0 && st.invV.pearl === 0 && !('dragon' in st.inv) && !st.col.unicorn && st.col.golden.popped === 0 && st.col.golden.sPopped === 0 && !('evil' in st) && st.owned.length === 6 && st.owned.every((o) => o === true) && st.equip === 5, JSON.stringify(st.toolUp));
  ok('an empty or all-unknown pool falls back to the base pearl', G.loadState({ version: 2, pool: ['unicorn'] }) === 'ok' && st.pool.join() === 'pearl' && G.loadState({ version: 2, pool: [] }) === 'ok' && st.pool.join() === 'pearl');
  ok('a hand-edited code with NaN-like values decodes and loads clamped', G.checkImport(G.encodeSave({ version: 2, sparks: 'NaN', lv: { sharp: 9999 }, pool: ['unicorn'] })) === 'ok' && G.applyImport() && st.sparks === 0 && st.lv.sharp === 99 && st.pool.join() === 'pearl');
  // a stored save that is not valid JSON goes to the backup before the fresh game overwrites it
  delete store['poppit.backup']; delete store['poppit.unreadable']; store['poppit.v1'] = '{bad json';
  const lc = G.loadStored(); G.paintRestore();
  ok('corrupt JSON in storage leaves poppit.backup holding the raw text', lc === 'invalid' && store['poppit.backup'] === '{bad json' && els.restoreRow.hidden === false && /could not be read/.test(els.restoreNote.textContent), lc);
  document.getElementById('saveOut').value = ''; document.getElementById('saveOut').hidden = true;
  ok('restoring a damaged backup hands its text back and keeps the backup', G.restoreBackup() === 'invalid' && document.getElementById('saveOut').value === '{bad json' && document.getElementById('saveOut').hidden === false && store['poppit.backup'] === '{bad json');
  const good = JSON.stringify({ version: 2, sparks: 9 }); store['poppit.backup'] = good; store['poppit.v1'] = '[1, 2]';
  ok('an unreadable save never pushes out a good backup', G.loadStored() === 'invalid' && store['poppit.backup'] === good && store['poppit.unreadable'] === '[1, 2]' && G.UNREADABLE_KEY === 'poppit.unreadable');
  delete store['poppit.backup']; delete store['poppit.unreadable']; store['poppit.v1'] = good;
  ok('a good stored save loads at boot and makes no backup', G.loadStored() === 'ok' && G.state.sparks === 9 && !store['poppit.backup']);
  // v2 -> v3: Chain Reaction refunded at its v2 prices, Wide Swing moved onto the Steel Pin
  const v2c = { version: 2, sparks: 100, lv: Object.assign(E.zeroLevels(), { chain: 3, sweep: 2, lucky: 2 }), toolUp: { 0: { p: 1, s: 2 } }, autoSell: false };
  const mig = G.migrateSave(v2c).save, oldChain = [0, 1, 2].reduce((a, l) => a + Math.ceil(110 * 6 * Math.pow(2.5, l)), 0);
  ok('a save with chain level 3 and sweep level 2 migrates with the exact refund, toolUp[0].u 2, and no lv.chain or lv.sweep',
    oldChain === 6435 && mig.version === G.SAVE_VERSION && mig.sparks === 100 + 6435 && !('chain' in mig.lv) && !('sweep' in mig.lv) && mig.toolUp[0].u === 2 && mig.toolUp[0].p === 1 &&
    G.loadState(v2c) === 'ok' && st.sparks === 6535 && st.toolUp[0].u === 2 && st.toolUp[0].s === 2 && !('chain' in st.lv) && !('sweep' in st.lv) && !('chain' in G.serialize().lv), 'sparks ' + st.sparks);
  ok('the migration does not change the stored v2 object', v2c.lv.chain === 3 && v2c.sparks === 100);
  ok('a chain refund is capped at the old max level 8', G.migrateSave({ version: 2, sparks: 0, lv: { chain: 99 } }).save.sparks === 670950);
  ok('a unique level above the max clamps, and tools without one keep 0', G.loadState({ version: 3, toolUp: { 0: { u: 40 }, 1: { u: 3 } } }) === 'ok' && st.toolUp[0].u === 5 && st.toolUp[1].u === 0);
  ok('a stored autoSell false stays false', G.loadState({ version: 3, autoSell: false }) === 'ok' && st.autoSell === false);
  ok('a save with no autoSell field starts with it on', G.loadState({ version: 3 }) === 'ok' && st.autoSell === true && G.loadState({ version: 2, autoSell: 'no' }) === 'ok' && st.autoSell === true);
  // the Tools panel reads the tool's unique definition
  G.loadState({ version: 3, sparks: 5000, owned: [true, true, false, false, false, false], equip: 0 }); G.recalc();
  G.viewTool(0); const pinRow = !els.uRow.hidden && els.uNone.hidden && els.uName.textContent === 'Wide Swing' && /Level 0\/5/.test(els.uLv.textContent);
  G.upTool('u'); const bought = st.toolUp[0].u === 1 && st.sparks === 5000 - E.uniqueCost(0, 0) && G.getS().sweep === true;
  G.viewTool(1); const awlRow = els.uRow.hidden && !els.uNone.hidden;
  G.upTool('u'); const awlNoBuy = !(st.toolUp[1] && st.toolUp[1].u);
  ok('Tools panel shows Wide Swing on the Steel Pin page and buys it there', pinRow && bought, els.uLv.textContent);
  ok('Tools panel shows the muted line on the Awl and sells nothing there', awlRow && awlNoBuy);
  G.viewTool(0);
  G.state.sparks = 4242; (winL.pagehide || []).forEach((h) => h());
  ok('pagehide saves', (winL.pagehide || []).length === 1 && JSON.parse(store['poppit.v1']).sparks === 4242);
  G.loadState({ version: 2, lv: E.zeroLevels() }); delete store['poppit.backup'];
  G.state.autoSell = false; els.resetBtn.fire('click', {}); els.resetBtn.fire('click', {});
  ok('Reset save starts with autoSell on', G.state.autoSell === true && els.autoSell.checked === true);
}
for (const [n, c, x] of results) { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); }


console.log(bad ? bad + ' FAILED' : 'ALL PASSED');process.exit(bad ? 1 : 0);
