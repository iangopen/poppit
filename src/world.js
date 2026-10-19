
/* ---------- State, board layout, pearls, effects ---------- */
const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

const INV_IDS = ECON.PEARLS.flatMap((t) => [t.id, t.id + ':s']); // normal and shiny stacks
const zeroMap = () => { const o = {}; INV_IDS.forEach((k) => { o[k] = 0; }); return o; };
const blankCol = () => { const o = {}; ECON.PEARLS.forEach((t) => { o[t.id] = { found: t.id === 'pearl', popped: 0, sFound: false, sPopped: 0 }; }); return o; };
const state = { sparks: 0, runEarned: 0, lifetime: 0, lv: ECON.zeroLevels(), echoes: 0, collapses: 0, muted: false, musicOn: true, musicVol: 0.5, owned: [true, false, false, false, false, false], equip: -1, toolUp: {}, autoSell: false, inv: zeroMap(), invV: zeroMap(), seen: { pearl: true }, pool: ['pearl'], shinyOn: true, col: blankCol() };
// a type is discovered the moment its shop unlock is bought (or loaded); Fresh Batch never undoes a discovery
function syncDiscoveries() { for (const t of ECON.PEARLS) if (ECON.isUnlocked(t.id, state.lv)) discover(t.id, false); }
// first sight of a type (or its shiny) fills a collection entry; a new normal type joins the pool once
function discover(id, shiny) {
  const c = state.col[id]; if (!c) return false;
  const t = ECON.PEARLS.find((q) => q.id === id);
  if (shiny) { if (c.sFound) return false; c.sFound = true; toast('New shiny: ' + t.name + '!'); return true; }
  if (c.found) return false;
  c.found = true; if (!state.pool.includes(id)) state.pool.push(id);
  toast('New pearl: ' + t.name + ' (added to your pool)'); return true;
}
let S = ECON.stats(state);
const recalc = () => { S = ECON.stats(state); };

// fruit palette: strawberry, passion fruit, kiwi, mint, blueberry (hue, saturation, lightness)
const PAL = [[340, 92, 58]]; // one pink for now
const GOLD = [43, 100, 55], BLUE = [205, 95, 52], MARBLE = [262, 78, 52];
// fixed colors for every type except the base pearl, which picks a random hue from PAL
const PALETTE = { blue: BLUE, mint: [152, 70, 50], golden: GOLD, violet: [285, 68, 52], coral: [12, 88, 62], marble: MARBLE, opal: [188, 58, 74], ruby: [350, 85, 42], black: [250, 22, 15] };
const TIER = [0.085, 0.06, 0.044]; // pearl spacing as a fraction of the short side

const stage = $('stage'), cv = $('cv'), g = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, U = 100, TX = 40, TY = 40, BPX = 40, BPY = 400;
let BX = 0, BY = 0, BW = 0, BH = 0, SP = 60, PR = 26, COLS = 0, ROWS = 0, HITR = 28;
const cells = [], pearls = [], queue = [], ghosts = [];
const stains = [];
const fx = { parts: [], motes: [], texts: [], blooms: [], pops: [] };
const incomeLog = [];
let time = 0, shake = 0, hitStop = 0, combo = 0, comboT = 99, frenzyT = 0, meter = 0, nextSpawn = 0, autoAcc = 0, lastBump = 0, lastHue = -1;
let collapse = null, firstPop = false, hover = null;
const pointer = { x: 0, y: 0, down: false, lastSweepSnd: 0, has: false, touch: false, last: -9 };
const tool = { sw: 99, heat: 0, spd: 1 }; // seconds since the current swing began
let flashT = 0, packBump = 0;

/* ----- board ----- */
function layout() {
  const r = stage.getBoundingClientRect();
  W = Math.max(200, r.width); H = Math.max(200, r.height);
  DPR = Math.min(dprCap, window.devicePixelRatio || 1); textCache.clear();
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  U = Math.min(W, H) / 2;
  const top = clamp(H * 0.17, 76, 104), bottom = clamp(H * 0.14, 64, 86), side = clamp(W * 0.03, 12, 28);
  BX = side; BY = top; BW = W - 2 * side; BH = H - top - bottom;
  const sp = $('sparks').getBoundingClientRect();
  const pb = $('packBtn').getBoundingClientRect(); BPX = pb.left - r.left + pb.width / 2; BPY = pb.top - r.top + pb.height / 2;
  TX = sp.left - r.left + Math.min(54, sp.width / 2); TY = sp.top - r.top + sp.height / 2;
  buildCells();
}
function buildCells() {
  const old = cells.slice(), oldCols = COLS, oldRows = ROWS;
  SP = Math.max(13, TIER[S.tier] * Math.min(W, H));
  COLS = Math.max(3, Math.floor(BW / SP)); // wide rows hold COLS, offset rows hold COLS-1, so both edges fill
  ROWS = Math.max(2, Math.floor((BH - SP) / (SP * 0.866)) + 1);
  PR = SP * 0.46; HITR = Math.max(PR * 1.12, 9);
  buildSprites();
  const gw = COLS * SP, gh = (ROWS - 1) * SP * 0.866 + SP;
  const left = BX + (BW - gw) / 2, top = BY + (BH - gh) / 2;
  cells.length = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < (r % 2 ? COLS - 1 : COLS); c++) {
    cells.push({ r, c, x: left + SP * 0.5 + c * SP + (r % 2 ? SP * 0.5 : 0), y: top + SP * 0.5 + r * SP * 0.866, p: null, nb: [], nb2: [] });
  }
  for (const a of cells) for (const b of cells) {
    if (a === b) continue;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < SP * 1.08) a.nb.push(b);
    if (d < SP * 2.15) a.nb2.push({ cell: b, k: Math.round(d / SP) });
  }
  const same = old.length && oldCols === COLS && oldRows === ROWS;
  if (same) old.forEach((o, i) => { if (o.p && o.p.st === 'live') { cells[i].p = o.p; o.p.cell = cells[i]; } });
  else { pearls.length = 0; queue.length = 0; ghosts.length = 0; prefill(); }
}
function prefill() {
  const n = Math.max(3, Math.round(cells.length * 0.3));
  const free = cells.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < n && i < free.length; i++) { const p = spawnAt(free[i], 'pearl'); p.age = rnd(0, 3); p.born = 1; }
}

/* ----- effects ----- */
const MAX_PARTS = 800, MAX_MOTES = 140;
let fxQ = 1, dprCap = 2; // adaptive quality: particle density and canvas resolution back off when frames run long
const budget = (n) => Math.max(0, Math.min(Math.round(n * fxQ), MAX_PARTS - fx.parts.length));
function burst(x, y, n, speed, col, big) {
  n = budget(n);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), v = rnd(0.35, 1) * speed * (big ? 1.25 : 1);
    fx.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.25, t: 0, life: rnd(0.45, 0.95), r: rnd(0.045, 0.12) * PR * (big ? 1.2 : 1), h: col[0] + rnd(-8, 8), s: col[1], l: col[2] + rnd(-6, 8), star: false, stain: Math.random() < 0.35 });
  }
}
function confetti(x, y, n) {
  n = budget(n);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), v = rnd(0.3, 1) * 520 * U / 350;
    fx.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 160, t: 0, life: rnd(0.7, 1.3), r: rnd(0.1, 0.2) * PR, h: rnd(36, 56), s: 100, l: rnd(55, 72), star: true, stain: false });
  }
}
function shards(x, y, n, col, speed, rainbow) {
  n = budget(n);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), v = rnd(0.35, 1) * speed;
    fx.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, t: 0, life: rnd(0.6, 1.1), r: rnd(0.12, 0.26) * PR, h: rainbow ? rnd(170, 330) : col[0] + rnd(-6, 6), s: rainbow ? 85 : col[1], l: rainbow ? rnd(60, 74) : Math.min(80, col[2] + rnd(4, 16)), shard: true, rot: rnd(0, TAU), spin: rnd(-14, 14), stain: false });
  }
}
function splat(x, y, col, scale) {
  const n = Math.round(rnd(5, 8) * Math.max(0.5, fxQ));
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), d = rnd(0.1, 1.05) * PR * scale;
    stains.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: rnd(0.12, 0.42) * PR * (1.1 - d / (PR * 2.2)), h: col[0], s: col[1], l: Math.min(82, col[2] + 14), t: 0, life: rnd(5, 8) });
  }
  while (stains.length > 200) stains.shift();
}
// shiny pop: a ring of white stars on top of the normal burst
function sparkle(x, y) { if (calm) return; for (let i = 0; i < 6; i++) { const a = rnd(0, TAU); fx.texts.push({ x: x + Math.cos(a) * PR * 0.9, y: y + Math.sin(a) * PR * 0.9, t: -i * 0.04, dur: 0.7, str: '\u2726', col: '#ffe27a', size: rnd(12, 20) }); } }
function bloom(x, y, r, col, dur) { fx.blooms.push({ x, y, r, t: 0, dur, h: col[0], s: col[1], l: col[2] }); }
function floatText(x, y, str, col, size) { fx.texts.push({ x, y, t: 0, dur: 0.9, str, col, size: size || 16 }); }
function motes(x, y, n, col, toPack) {
  const tx = toPack ? BPX : TX, ty = toPack ? BPY : TY;
  n = Math.min(n, MAX_MOTES - fx.motes.length);
  for (let i = 0; i < n; i++) fx.motes.push({ tx, ty, pack: !!toPack, x0: x, y0: y, t: -i * 0.03, dur: rnd(0.5, 0.75) + (toPack ? 0.1 : 0), bx: rnd(-1, 1) * (toPack ? 30 : 80), by: rnd(-1, 0.4) * (toPack ? 30 : 80), x, y, h: col[0], l: col[2] });
}
const addShake = (a) => { if (!calm) shake = Math.max(shake, a); };

/* ----- pearls ----- */
function spawnAt(cell, kind, shiny) {
  const col = PALETTE[kind] || null;
  let hi = Math.floor(Math.random() * PAL.length); if (hi === lastHue) hi = (hi + 1 + Math.floor(Math.random() * (PAL.length - 1))) % PAL.length; lastHue = hi;
  const c = col || PAL[hi];
  const p = { cell, kind, shiny: !!shiny, h: c[0], s: c[1], l: c[2], age: 0, born: 0, st: 'live', claimed: false, queued: false, seed: rnd(0, TAU), jx: 0, jv: 0, hpMax: ECON.KIND[kind].hp, dmg: 0, lastHit: -9, lastSweep: -9, press: 0, cr: null };
  cell.p = p; pearls.push(p);
  return p;
}
function trySpawn() {
  const empty = cells.filter((c) => !c.p);
  if (!empty.length) return;
  const cell = empty[Math.floor(Math.random() * empty.length)];
  const boost = frenzyT > 0 ? 2 : 1;
  const ch = ECON.poolChances(state.pool, state.lv, frenzyT > 0);
  let kind = 'pearl', r = Math.random();
  for (const id in ch) { r -= ch[id]; if (r < 0) { kind = id; break; } }
  const cap = ECON.PEARLS.find((t) => t.id === kind).cap;
  if (kind !== 'pearl' && pearls.filter((p) => p.kind === kind && p.st === 'live').length >= cap) kind = 'pearl';
  spawnAt(cell, kind, state.shinyOn && Math.random() < ECON.shinyChance(state.lv));
}
function pearlPos(p) { return [p.cell.x, p.cell.y]; }
// effect tiers by kind (independent of how many hits a pearl takes): FXW = juice weight, big = glints + larger body, heavy = marble-class bursts
const FXW = { pearl: 1, blue: 3, mint: 4, golden: 6, violet: 8, coral: 11, marble: 14, opal: 20, ruby: 30, black: 45 };
const isBig = (k) => FXW[k] >= 6, isHeavy = (k) => FXW[k] >= 14;
function radiusOf(p) { return PR * 0.74 * (isBig(p.kind) ? 1.1 : 1); }

function award(val, x, y, col, big, kind) {
  // popped pearls go into the backpack; juice only arrives when they are sold
  kind = kind || 'pearl'; state.seen[kind] = true;
  if (state.autoSell) { state.sparks += val; state.runEarned += val; state.lifetime += val; incomeLog.push([time, val]); } // auto-sell: straight to juice, the backpack is untouched
  else { state.inv[kind] = (state.inv[kind] || 0) + 1; state.invV[kind] = (state.invV[kind] || 0) + val; }
  floatText(x, y - PR * 0.9, '+' + fmtV(val), 'hsl(' + col[0] + ',' + Math.min(95, col[1]) + '%,' + Math.max(28, col[2] - 12) + '%)', big ? 24 : clamp(PR * 0.55, 13, 19));
  motes(x, y, clamp(Math.round(2 + Math.log2(val + 1)), 2, 6) + (big ? 3 : 0), col, !state.autoSell);
}

function popPearl(p, src, opts) {
  if (p.st !== 'live' || (collapse && src !== 'batch')) return false;
  opts = opts || {};
  const manual = src === 'tap' || src === 'sweep';
  const col = [p.h, p.s, p.l];
  const x = p.cell.x, y = p.cell.y;
  let step = opts.step || 0;
  if (manual) { combo = (combo > 0 && comboT < S.comboWindow) ? combo + 1 : 1; comboT = 0; step = combo - 1; }
  if (src !== 'batch') Snd.hit(p.kind, 1, !manual);
  p.st = 'dead'; p.cell.p = null;
  const rad = radiusOf(p);

  if (src !== 'batch') {
    const val = ECON.popValue(S, manual ? combo : (src === 'auto' ? 0 : combo), frenzyT > 0, p.kind) * (p.shiny ? ECON.SHINY_MULT : 1);
    award(val, x, y, col, (isBig(p.kind) && !isHeavy(p.kind)) || p.shiny, p.kind + (p.shiny ? ':s' : ''));
    if (p.shiny) { state.col[p.kind].sPopped++; discover(p.kind, true); Snd.shimmer(); sparkle(x, y); } else { state.col[p.kind].popped++; discover(p.kind, false); }
    meter += manual ? 1 : 0.25;
    if (meter >= S.frenzyNeed && frenzyT <= 0) startFrenzy();
  }
  // juice: droplets, a stain on the board, and a quick membrane ring
  const fw = FXW[p.kind] || 1, tough = fw >= 3;
  burst(x, y, 12 + Math.min(fw, 10) * 2, (230 + step * 6 + (tough ? 60 : 0)) * U / 350, col, true);
  if (tough) shards(x, y, 6 + Math.min(fw, 30), col, 380 * U / 350, isHeavy(p.kind));
  splat(x, y, col, 1 + 0.08 * Math.min(fw, 8));
  fx.pops.push({ x, y, kind: p.kind + (p.shiny ? ':s' : ''), r: rad, t: 0, dur: 0.13 + 0.01 * Math.min(fw, 10) });
  bloom(x, y, PR * (2.1 + 0.3 * Math.min(fw, 10)), col, 0.3 + 0.03 * Math.min(fw, 10));
  p.cell.glow = { h: col[0], s: col[1], l: col[2], t: 0 };
  if (p.kind === 'golden') {
    confetti(x, y, 26); addShake(2.4);
    if (!calm) hitStop = Math.max(hitStop, 0.06);
    Snd.golden(); floatText(x, y - PR * 1.9, 'Jackpot', '#b5740a', 13);
  } else if (p.kind === 'marble') {
    confetti(x, y, 22); shards(x, y, 22, col, 520 * U / 350, true); addShake(3.2); flashT = 0.32;
    if (!calm) hitStop = Math.max(hitStop, 0.09);
    Snd.marble(); floatText(x, y - PR * 1.9, 'Marble', '#6a3fd1', 14);
  } else if (isHeavy(p.kind)) { // opal, ruby, black: marble-class bursts
    confetti(x, y, 22); shards(x, y, 22, col, 520 * U / 350, true); addShake(3.2 + (fw >= 30 ? 1 : 0)); flashT = 0.32;
    if (!calm) hitStop = Math.max(hitStop, 0.09);
    Snd.marble(); floatText(x, y - PR * 1.9, ECON.PEARLS.find((t) => t.id === p.kind).name, 'hsl(' + col[0] + ',70%,35%)', 14);
  } else if (fw >= 8) { // violet, coral: golden-class bursts
    confetti(x, y, 16); addShake(1.8); if (!calm) hitStop = Math.max(hitStop, 0.05);
    Snd.shatter(); floatText(x, y - PR * 1.9, ECON.PEARLS.find((t) => t.id === p.kind).name, 'hsl(' + col[0] + ',70%,35%)', 13);
  } else if (fw >= 3) { // blue, mint
    addShake(0.7); if (!calm) hitStop = Math.max(hitStop, 0.03);
    Snd.pop(step, true, false, p.kind === 'mint' ? 0.7 : 0.75);
  } else if (src === 'sweep') {
    if (time - pointer.lastSweepSnd > 0.022) { pointer.lastSweepSnd = time; Snd.pop(step, true); }
  } else if (manual) Snd.pop(step, true);
  else if (src === 'auto') Snd.pop(4 + Math.floor(Math.random() * 6), true, true);
  else if (src === 'batch') Snd.pop(opts.step || 0, false, true);

  if (manual) { if (p.kind === 'pearl') addShake(0.1); try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) { /* vibration is optional */ } }
  if (!firstPop) { firstPop = true; $('hint').classList.add('gone'); }
  return true;
}
/* ----- hits: tools deal damage; hard pearls crack first and burst on the last hit ----- */
function genCracks(p) {
  p.cr = [];
  for (let i = 0; i < 8; i++) {
    let a = (i * TAU) / 8 + rnd(-0.28, 0.28); const pts = [];
    for (let k = 0; k < 5; k++) { const r = 0.08 + k * 0.23; a += rnd(-0.28, 0.28); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    p.cr.push(pts);
  }
}
function hitPearl(p, dmg, src, opts) {
  if (p.st !== 'live' || (collapse && src !== 'batch')) return false;
  p.dmg += dmg; p.lastHit = time;
  if (p.dmg >= p.hpMax) return popPearl(p, src, opts);
  if (!p.cr) genCracks(p);
  const x = p.cell.x, y = p.cell.y, col = [p.h, p.s, p.l], frac = p.dmg / p.hpMax;
  p.jv += 12; p.press = 1;
  burst(x, y, 4 + Math.round(frac * 4), 150 * U / 350, col, false);
  Snd.hit(p.kind, frac, !(src === 'tap' || src === 'sweep')); // pink pearls have no crack sound; hard ones ring with their own hit, softer for helpers
  if (src === 'tap' || src === 'sweep') { if (combo > 0) comboT = Math.min(comboT, S.comboWindow * 0.4); addShake(0.25); try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* vibration is optional */ } }
  if (!firstPop) { firstPop = true; $('hint').classList.add('gone'); }
  return true;
}
function swing() { tool.sw = 0.04; tool.heat = Math.min(6, tool.heat + 1); } // every player hit restarts the swing; the more recent hits, the faster it plays
function startFrenzy() {
  meter = 0; frenzyT = 7; Snd.frenzy(); addShake(3);
  toast('Frenzy! Pearls pop in 4x faster and pay double');
  $('surge').classList.add('on');
}

/* ----- auto pop: a ghost tap lands on the plumpest free pearl ----- */
function stepAuto(dt) {
  if (S.autoRate <= 0 || collapse) return;
  autoAcc += dt * S.autoRate;
  while (autoAcc >= 1) {
    autoAcc -= 1;
    let best = null, bs = -1;
    for (const p of pearls) {
      if (p.st !== 'live' || p.claimed || p.hpMax > S.power * 3) continue;
      const sc = ECON.KIND[p.kind].mult / Math.ceil((p.hpMax - p.dmg) / S.power) + Math.random() * 0.2;
      if (sc > bs) { bs = sc; best = p; }
    }
    if (best) { best.claimed = true; ghosts.push({ p: best, t: 0, dur: 0.22 }); }
  }
  for (let i = ghosts.length - 1; i >= 0; i--) {
    const gh = ghosts[i]; gh.t += dt;
    if (gh.t >= gh.dur) { gh.p.claimed = false; hitPearl(gh.p, S.power, 'auto'); ghosts.splice(i, 1); }
  }
}

/* ----- one simulation step ----- */
function step(dt) {
  time += dt; tool.heat *= Math.exp(-dt * 3); tool.spd = S.toolSpeed * (1 + tool.heat * 0.7); tool.sw += dt * tool.spd; if (flashT > 0) flashT = Math.max(0, flashT - dt);
  comboT += dt;
  if (combo > 0 && comboT > S.comboWindow) combo = 0;
  if (frenzyT > 0) { frenzyT -= dt; if (frenzyT <= 0) { frenzyT = 0; $('surge').classList.remove('on'); } }

  if (!collapse) {
    nextSpawn -= dt;
    const every = S.spawnEvery / (frenzyT > 0 ? 4 : 1);
    let guard = 0;
    while (nextSpawn <= 0 && guard++ < 10) { nextSpawn += every; trySpawn(); }
  }
  for (const p of pearls) {
    if (p.st !== 'live') continue;
    p.age += dt; p.born += dt;
    // jelly spring: neighbors wobble when something pops next to them
    p.jv += (-160 * p.jx - 9 * p.jv) * dt; p.jx += p.jv * dt;
    p.press *= Math.exp(-14 * dt);
    if (p.dmg > 0 && time - p.lastHit > 2.2) p.dmg = Math.max(0, p.dmg - dt * 1.1);
  }
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i];
    if (q.p.st !== 'live') { queue.splice(i, 1); continue; }
    if (time >= q.at) { queue.splice(i, 1); q.p.queued = false; if (q.src === 'batch') popPearl(q.p, q.src, q); else hitPearl(q.p, S.power, q.src, q); }
  }
  for (let i = pearls.length - 1; i >= 0; i--) if (pearls[i].st === 'dead') pearls.splice(i, 1);
  stepAuto(dt);
  stepFx(dt);
  if (collapse) {
    collapse.t += dt;
    if (collapse.t >= collapse.dur) finishCollapse();
  }
  while (incomeLog.length && time - incomeLog[0][0] > 5) incomeLog.shift();
}

function stepFx(dt) {
  const P = fx.parts, grav = 1100 * U / 350, drag = Math.exp(-1.2 * dt);
  let j = 0;
  for (let i = 0; i < P.length; i++) {
    const p = P[i]; p.t += dt;
    if (p.t >= p.life) {
      if (p.stain && p.y < H - 8) { stains.push({ x: p.x, y: p.y, r: p.r * 0.9, h: p.h, s: p.s, l: Math.min(82, p.l + 12), t: 0, life: rnd(4, 7) }); if (stains.length > 200) stains.shift(); }
      continue;
    }
    p.vy += grav * dt; p.vx *= drag; p.x += p.vx * dt; p.y += p.vy * dt;
    P[j++] = p;
  }
  P.length = j;
  j = 0; for (let i = 0; i < stains.length; i++) { const st = stains[i]; st.t += dt; if (st.t < st.life) stains[j++] = st; } stains.length = j;
  const PO = fx.pops; j = 0; for (let i = 0; i < PO.length; i++) { const o = PO[i]; o.t += dt; if (o.t < o.dur) PO[j++] = o; } PO.length = j;
  const B = fx.blooms; j = 0; for (let i = 0; i < B.length; i++) { const o = B[i]; o.t += dt; if (o.t < o.dur) B[j++] = o; } B.length = j;
  for (const c of cells) if (c.glow) { c.glow.t += dt; if (c.glow.t > 1.5) c.glow = null; }
  const T = fx.texts; j = 0; for (let i = 0; i < T.length; i++) { const o = T[i]; o.t += dt; o.y -= 40 * dt * (1 - o.t / o.dur); if (o.t < o.dur) T[j++] = o; } T.length = j;
  const M = fx.motes; j = 0;
  for (let i = 0; i < M.length; i++) {
    const m = M[i]; m.t += dt;
    if (m.t < 0) { M[j++] = m; continue; }
    const k = clamp(m.t / m.dur, 0, 1), e = k * k * (3 - 2 * k), u = 1 - e;
    const mx = (m.x0 + m.tx) / 2 + m.bx, my = (m.y0 + m.ty) / 2 + m.by;
    m.x = u * u * m.x0 + 2 * u * e * mx + e * e * m.tx; m.y = u * u * m.y0 + 2 * u * e * my + e * e * m.ty;
    if (k >= 1) {
      if (!(m.pack && state.autoSell) && time - lastBump > 0.07) { lastBump = time; const el = m.pack ? $('packBtn') : $('sparks'), cls = m.pack ? 'pop' : 'bump'; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
      continue;
    }
    M[j++] = m;
  }
  M.length = j;
  shake *= Math.exp(-10 * dt); if (shake < 0.05) shake = 0;
}
