
/* ---------- Shelf (upgrades), HUD, fresh batch, input, save, main loop ---------- */
// shop text for a pearl type: its live chance within the current pool, or what it unlocks
function typeDesc(id, locked) {
  const t = ECON.PEARLS.find((q) => q.id === id);
  if (!ECON.isUnlocked(id, state.lv)) return locked;
  const c = ECON.poolChances(state.pool, state.lv)[id];
  return (c ? (c * 100).toFixed(1) + '% of pearls' : 'Not in your pool') + ', ' + t.mult + 'x payout, ' + t.hp + ' hits';
}
const blurb = (id, lead) => { const t = ECON.PEARLS.find((x) => x.id === id); return lead + ': ' + t.mult + 'x payout, ' + t.hp + ' hits.'; };
const META = {
  sweep:  { name: 'Wide Swing', desc: () => state.lv.sweep ? 'Hold and drag to hit everything in reach' : 'Hold and drag to hit many pearls at once.' },
  chain:  { name: 'Chain Reaction', desc: () => state.lv.chain ? Math.round(S.chain * 100) + '% chance each neighbor is hit too' : 'Pops spread to the pearls next to them.' },
  auto:   { name: 'Helpers', desc: () => state.lv.auto ? S.autoRate.toFixed(2) + ' automatic hits per second' : 'Helpers hit pearls for you.' },
  golden: { name: 'Golden Pearls', desc: () => typeDesc('golden', blurb('golden', 'Rare gold pearls')) },
  marble: { name: 'Glass Marbles', desc: () => typeDesc('marble', blurb('marble', 'Very tough marbles')) },
  sharp:  { name: 'Richer Pearls', desc: () => 'Base payout ' + S.popBase + ', next ' + (S.popBase + 1) },
  lucky:  { name: 'Blue Pearls', desc: () => typeDesc('blue', blurb('blue', 'Unlocks blue pearls')) },
  spawn:  { name: 'Faster Fill', desc: () => 'New pearl every ' + S.spawnEvery.toFixed(2) + 's' },
  combo:  { name: 'Combo Window', desc: () => 'Combos hold for ' + S.comboWindow.toFixed(2) + 's' },
  fuel:   { name: 'Frenzy Fuel', desc: () => 'Frenzy after ' + S.frenzyNeed + ' pops' },
  tempo:  { name: 'Helper Speed', desc: () => 'Each helper hits every ' + S.autoCd.toFixed(1) + 's' },
  board:  { name: 'Bigger Board', desc: () => 'More, smaller pearls' },
  mint:   { name: 'Mint Pearls', desc: () => typeDesc('mint', blurb('mint', 'Unlocks mint pearls')) },
  violet: { name: 'Violet Pearls', desc: () => typeDesc('violet', blurb('violet', 'Unlocks violet pearls')) },
  coral:  { name: 'Coral Pearls', desc: () => typeDesc('coral', blurb('coral', 'Unlocks coral pearls')) },
  opal:   { name: 'Opal Pearls', desc: () => typeDesc('opal', blurb('opal', 'Unlocks opal pearls')) },
  ruby:   { name: 'Ruby Pearls', desc: () => typeDesc('ruby', blurb('ruby', 'Unlocks ruby pearls')) },
  black:  { name: 'Black Pearls', desc: () => typeDesc('black', blurb('black', 'Unlocks black pearls')) },
  shiny:  { name: 'Shiny Hunter', desc: () => 'Shiny chance ' + (ECON.shinyChance(state.lv) * 100).toFixed(2) + '% per pearl, shinies pay 5x' },
};
const rows = {};
let toastTimer = 0;
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 3400);
}
function buildShelf() {
  ECON.ORDER.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'up'; b.dataset.id = id; b.dataset.g = ECON.UPG[id].group;
    b.innerHTML = '<span class="top"><span class="nm"></span><span class="lv"></span></span><span class="ds"></span><span class="cs"></span>';
    b.addEventListener('click', () => buy(id));
    ({ verb: $('listVerbs'), marble: $('listMarble'), attr: $('listAttr') }[ECON.UPG[id].group] || $('listTune')).appendChild(b);
    rows[id] = { el: b, nm: b.querySelector('.nm'), lv: b.querySelector('.lv'), ds: b.querySelector('.ds'), cs: b.querySelector('.cs'), cache: {} };
    rows[id].nm.textContent = META[id].name;
  });
}
function setText(r, key, el, val) { if (r.cache[key] !== val) { r.cache[key] = val; el.textContent = val; } }
function updateShelf() {
  ECON.ORDER.forEach((id) => {
    const u = ECON.UPG[id], r = rows[id], lvl = state.lv[id];
    const reqOk = !u.req || u.req(state.lv), maxed = lvl >= u.max, c = ECON.cost(id, lvl);
    const shown = reqOk && (u.group === 'attr' || lvl > 0 || state.runEarned >= c * 0.4 || state.sparks >= c * 0.4);
    r.el.hidden = !shown;
    if (!shown) return;
    const can = !maxed && state.sparks >= c;
    r.el.classList.toggle('can', can); r.el.classList.toggle('max', maxed);
    r.el.style.setProperty('--p', maxed ? '0%' : (clamp(state.sparks / c, 0, 1) * 100).toFixed(0) + '%');
    setText(r, 'lv', r.lv, u.max <= 2 ? (lvl ? 'Lv ' + lvl + '/' + u.max : '') : 'Lv ' + lvl);
    setText(r, 'ds', r.ds, META[id].desc());
    setText(r, 'cs', r.cs, maxed ? 'Max' : fmt(c));
  });
  if (!$('tools').hidden) updateToolPanel();
  $('hMarble').hidden = !ECON.ORDER.some((id) => ECON.UPG[id].group === 'marble' && !rows[id].el.hidden);
  const run = state.runEarned, ready = ECON.collapseReady(run), btn = $('collapseBtn');
  btn.disabled = !ready || !!collapse; btn.classList.toggle('ready', ready && !collapse);
  if (!armed) btn.textContent = ready ? 'Fresh Batch for +' + ECON.collapseGain(run) + ' Flavors' : 'Fresh Batch';
  $('collapseText').textContent = ready
    ? 'Pops the whole board and restarts. Each Flavor adds 20% to every payout, permanently.'
    : 'Earn ' + fmt(ECON.COLLAPSE_MIN_RUN) + ' juice in one run to unlock a Fresh Batch (' + fmt(run) + ' so far).';
}
function buy(id) {
  const u = ECON.UPG[id], lvl = state.lv[id];
  if (collapse || lvl >= u.max) return;
  if (u.req && !u.req(state.lv)) return;
  const c = ECON.cost(id, lvl);
  if (state.sparks < c) return;
  state.sparks -= c; state.lv[id] = lvl + 1; recalc();
  if (id === 'board') {
    buildCells(); addShake(2); toast('Bigger board! Lots more pearls to pop');
  }
  if (lvl === 0) {
    const msg = { tool: 'New tool! The ' + S.toolName + ' hits with power ' + S.power, marble: 'Glass marbles can show up now. They are tough!', sweep: 'Hold and drag to swing at lots of pearls at once!', chain: 'Pops now bounce into the pearls next door!', auto: 'Little helpers will poke pearls for you!', golden: 'Golden pearls can show up now!' }[id];
    if (msg) toast(msg);
  }
  syncDiscoveries();
  Snd.buy(state.lv[id]);
  const el = rows[id] && rows[id].el; if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  updateShelf(); save();
}

/* ----- HUD ----- */
const lblCache = {};
function setLbl(id, v) { if (lblCache[id] !== v) { lblCache[id] = v; $(id).textContent = v; } }
let dispSparks = 0;
function updateHud(dt) {
  const diff = state.sparks - dispSparks;
  dispSparks = Math.abs(diff) < 0.6 ? state.sparks : dispSparks + diff * Math.min(1, dt * 12);
  $('sparks').textContent = fmt(dispSparks);
  let sum = 0; for (const e of incomeLog) sum += e[1];
  const rate = state.autoSell ? sum / Math.max(1, Math.min(5, time)) : 0;
  $('rate').textContent = (rate < 10 ? rate.toFixed(1) : fmt(rate)) + ' / s';
  $('rate').classList.toggle('live', state.autoSell);
  updatePack();
  const ec = $('echoes');
  if (state.echoes > 0) { ec.hidden = false; ec.textContent = 'Flavors ' + state.echoes + ' (payouts x' + S.echoMult.toFixed(1) + ')'; } else ec.hidden = true;
  setLbl('toolLbl', S.toolName + ' · ' + S.power + (S.power === 1 ? ' hit power' : ' hit power'));
  const cb = $('combo');
  cb.classList.toggle('on', combo > 1);
  if (combo > 1) {
    $('comboN').textContent = String(combo);
    $('comboX').textContent = 'x' + ECON.comboMult(combo).toFixed(2);
    $('comboBar').firstElementChild.style.transform = 'scaleX(' + clamp(1 - comboT / S.comboWindow, 0, 1).toFixed(3) + ')';
  }
  const mt = $('meter'), fr = frenzyT > 0;
  mt.classList.toggle('hot', fr);
  mt.firstElementChild.style.transform = 'scaleX(' + (fr ? frenzyT / 7 : clamp(meter / S.frenzyNeed, 0, 1)).toFixed(3) + ')';
  $('meterLbl').textContent = fr ? 'Frenzy!' : 'Frenzy meter';
}

/* ----- backpack: an inventory grid. Popped pearls collect here until sold, all at once or a chosen amount ----- */
const KINDS = ECON.PEARLS.map((t) => [t.id, t.name]).concat(ECON.PEARLS.map((t) => [t.id + ':s', 'Shiny ' + t.name])); // normals first, then shinies
const SLOT_COUNT = KINDS.length; // one icon per kind you hold, packed together from the first slot, no empty boxes
const slotEls = [];
let selling = false, sellTimer = 0, selKind = null, selQty = 1;
function buildPack() {
  for (let n = 0; n < SLOT_COUNT; n++) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'slot empty'; b.hidden = true;
    b.innerHTML = '<canvas width="128" height="128"></canvas><span class="cnt"></span>';
    const slot = { el: b, cv: b.querySelector('canvas'), cnt: b.querySelector('.cnt'), kind: null, art: 0, shown: -1 };
    b.addEventListener('click', () => { if (slot.kind) { Snd.click(); pickSlot(slot.kind); } });
    $('slots').appendChild(b); slotEls.push(slot);
  }
  $('qMinus').addEventListener('click', () => { Snd.click(); setQty(selQty - 1); });
  $('qPlus').addEventListener('click', () => { Snd.click(); setQty(selQty + 1); });
  $('qMax').addEventListener('click', () => { Snd.click(); setQty(1e9); });
  $('qIn').addEventListener('input', (e) => setQty(parseInt(e.target.value, 10) || 1));
  $('sellSel').addEventListener('click', () => { Snd.resume(); sellSome(selKind, selQty); });
}
const packCount = () => KINDS.reduce((a, k) => a + (state.inv[k[0]] || 0), 0);
const packValue = () => KINDS.reduce((a, k) => a + (state.invV[k[0]] || 0), 0);
function pickSlot(kind) {
  if (!(state.inv[kind] > 0)) { selKind = null; } else { selKind = selKind === kind ? null : kind; selQty = Math.min(selQty, state.inv[kind]) || 1; }
  Snd.tick(); updatePack();
}
function setQty(q) { if (selKind) { selQty = clamp(q | 0, 1, state.inv[selKind] || 1); updatePack(); } }
function drawIcon(s) {
  if (!spr.pearl[s.kind] || s.art === spr.ps) return;
  const x = s.cv.getContext('2d'); x.clearRect(0, 0, 128, 128); x.drawImage(bigSprite(s.kind), -10, -10, 148, 148); s.art = spr.ps;
}
function updatePack() {
  const n = packCount(), v = packValue();
  setLbl('packN', String(n));
  if (packBump > 0) { packBump = 0; const b = $('packBtn'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  if (selling || $('pack').hidden) return;
  if (selKind && !(state.inv[selKind] > 0)) selKind = null;
  const owned = KINDS.filter((k) => (state.inv[k[0]] || 0) > 0);
  slotEls.forEach((s, i) => {
    const kind = owned[i] ? owned[i][0] : null;
    if (s.kind !== kind) { s.kind = kind; s.art = 0; s.shown = -1; }
    const q = kind ? state.inv[kind] : 0;
    s.el.hidden = !kind;
    if (q > 0) drawIcon(s);
    s.el.classList.toggle('empty', q === 0); s.el.classList.toggle('sel', s.kind === selKind && q > 0);
    if (s.shown !== q) { s.shown = q; s.cnt.textContent = q > 0 ? fmt(q) : ''; s.el.title = q > 0 ? KINDS.find((k) => k[0] === s.kind)[1] + ' x' + q + ' (worth ' + fmt(state.invV[s.kind]) + ')' : ''; }
  });
  const row = $('sellRow'); row.hidden = !selKind;
  if (selKind) {
    const se = slotEls.find((e) => e.kind === selKind).el.getBoundingClientRect(), pk = $('pack').getBoundingClientRect();
    const left = clamp(se.left - pk.left + se.width / 2 - 143, 6, pk.width - 292);
    row.style.left = left + 'px'; row.style.bottom = (pk.bottom - se.top + 12) + 'px'; row.style.setProperty('--ax', (se.left - pk.left + se.width / 2 - left) + 'px');
    const have = state.inv[selKind], q = clamp(selQty, 1, have); selQty = q;
    const worth = state.invV[selKind] * q / have;
    setLbl('sellWhat', KINDS.find((k) => k[0] === selKind)[1] + ' (' + have + ')');
    if ($('qIn').value !== String(q) && document.activeElement !== $('qIn')) $('qIn').value = q;
    setLbl('sellSel', 'Sell ' + q + ' for ' + fmt(worth));
  }
  setLbl('packTotal', fmt(v));
  $('sellBtn').disabled = n === 0;
}
// pay for items, shared by "sell all" and "sell some"
function cashIn(total) {
  state.sparks += total; state.runEarned += total; state.lifetime += total; incomeLog.push([time, total]);
  const bump = $('sparks'); bump.classList.remove('bump'); void bump.offsetWidth; bump.classList.add('bump');
}
function sellSome(kind, q) {
  const have = state.inv[kind] || 0; q = clamp(q | 0, 0, have);
  if (!kind || q <= 0 || collapse) return;
  const worth = state.invV[kind] * q / have;
  state.inv[kind] = have - q; state.invV[kind] = have - q > 0 ? state.invV[kind] - worth : 0;
  cashIn(worth);
  const s = slotEls.find((e) => e.kind === kind), sr = stage.getBoundingClientRect(), rect = s.el.getBoundingClientRect();
  s.el.classList.remove('squish'); void s.el.offsetWidth; s.el.classList.add('squish');
  const cx = rect.left - sr.left + rect.width / 2, cy = rect.top - sr.top + rect.height / 2;
  motes(cx, cy, Math.min(18, 4 + q), GOLD); motes(cx, cy, Math.min(10, 2 + q), [340, 92, 58]);
  floatText(TX + 70, TY + 8, '+' + fmt(worth), 'hsl(43,100%,38%)', 22);
  addShake(0.8); Snd.sell(q);
  if (state.inv[kind] <= 0) selKind = null; else selQty = Math.min(selQty, state.inv[kind]);
  s.shown = -1; updatePack(); save();
}
function sellAll() {
  const n = packCount(), total = packValue();
  if (n === 0 || collapse) return;
  const rect = $('sellBtn').getBoundingClientRect(), sr = stage.getBoundingClientRect();
  KINDS.forEach(([id]) => { state.inv[id] = 0; state.invV[id] = 0; });
  cashIn(total); selKind = null;
  // the big sell: every stack squishes, the button squishes, the panel jolts, juice flies to the score
  selling = true; clearTimeout(sellTimer);
  slotEls.forEach((s, i) => { if (s.kind && !s.el.classList.contains('empty')) { s.el.style.animationDelay = (i * 45) + 'ms'; s.el.classList.add('sold'); } });
  const btn = $('sellBtn'); btn.classList.remove('squish'); void btn.offsetWidth; btn.classList.add('squish');
  const pk = $('pack'); pk.classList.remove('jolt'); void pk.offsetWidth; pk.classList.add('jolt');
  const cx = rect.left - sr.left + rect.width / 2, cy = rect.top - sr.top + rect.height / 2;
  motes(cx, cy, Math.min(30, 10 + n), GOLD); motes(cx, cy, Math.min(24, 6 + n), [340, 92, 58]);
  floatText(TX + 70, TY + 8, '+' + fmt(total), 'hsl(43,100%,38%)', 30);
  addShake(2.2); Snd.sell(n); confetti(cx, cy, 14);
  try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) { /* vibration is optional */ }
  sellTimer = setTimeout(() => {
    selling = false; slotEls.forEach((s) => { s.el.classList.remove('sold'); s.el.style.animationDelay = ''; s.shown = -1; });
    btn.classList.remove('squish'); pk.classList.remove('jolt'); updatePack();
  }, 700);
  save();
}
$('sellBtn').addEventListener('click', () => { Snd.resume(); sellAll(); });
$('autoSell').addEventListener('change', (e) => { state.autoSell = e.target.checked; Snd.resume(); Snd.click(); toast(state.autoSell ? 'Auto-sell on. New pops sell the moment they pop, your backpack stays as it is' : 'Auto-sell off. New pops go to your backpack'); updateHud(0.016); save(); });
const PANEL_BTN = { pack: 'packBtn', settings: 'setBtn', tools: 'toolBtn', pool: 'poolBtn', book: 'bookBtn' };
function openPanel(id) {
  Snd.click();
  Object.keys(PANEL_BTN).forEach((p) => {
    const show = p === id && $(p).hidden;
    $(p).hidden = !show; $(PANEL_BTN[p]).setAttribute('aria-expanded', String(show));
  });
  updatePack(); updatePool(); if (id === 'book' && !$('book').hidden) openBook(); if (id === 'tools' && !$('tools').hidden) { toolView = state.equip >= 0 ? state.equip : state.lv.tool; updateToolPanel(); }
}
$('packBtn').addEventListener('click', () => openPanel('pack'));
$('setBtn').addEventListener('click', () => openPanel('settings'));
$('toolBtn').addEventListener('click', () => openPanel('tools'));
$('poolBtn').addEventListener('click', () => openPanel('pool'));
$('bookBtn').addEventListener('click', () => openPanel('book'));
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { Snd.click(); $(b.dataset.close).hidden = true; $(PANEL_BTN[b.dataset.close]).setAttribute('aria-expanded', 'false'); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Object.keys(PANEL_BTN).forEach((p) => { $(p).hidden = true; $(PANEL_BTN[p]).setAttribute('aria-expanded', 'false'); }); });
const resetTools = () => { state.owned = [true, false, false, false, false, false]; state.equip = -1; state.toolUp = {}; toolView = 0; };
const zeroInv = () => { INV_IDS.forEach((id) => { state.inv[id] = 0; state.invV[id] = 0; }); };


/* ----- pool menu: choose which discovered pearl types spawn, with the resulting chances shown live ----- */
const pctText = (p) => (p >= 0.995 ? '100%' : p <= 0 ? '0%' : p < 0.001 ? '<0.1%' : (p * 100).toFixed(1) + '%');
function poolView() {
  const ch = ECON.poolChances(state.pool, state.lv), eff = ECON.effectivePool(state.pool, state.lv);
  return {
    rows: ECON.PEARLS.filter((t) => state.col[t.id].found).map((t) => {
      const i = ECON.PEARLS.indexOf(t), nx = ECON.PEARLS[i + 1], locked = !ECON.canToggleOff(t.id, state.lv);
      return { id: t.id, name: t.name, unlocked: ECON.isUnlocked(t.id, state.lv), inPool: eff.includes(t.id), locked, need: locked ? META[ECON.unlockUpg(nx.id)].name : '', p: ch[t.id] || 0 };
    }),
    shinyOn: state.shinyOn, shiny: ECON.shinyChance(state.lv),
  };
}
function togglePool(id) {
  if (!state.col[id] || !state.col[id].found) return false;
  const eff = ECON.effectivePool(state.pool, state.lv);
  if (eff.includes(id)) {
    if (!ECON.canToggleOff(id, state.lv)) { const nx = ECON.PEARLS[ECON.PEARLS.findIndex((t) => t.id === id) + 1]; toast('Max out ' + META[ECON.unlockUpg(nx.id)].name + ' to switch this off'); return false; }
    if (eff.length <= 1) { toast('Keep at least one pearl type in your pool'); return false; }
    state.pool = state.pool.filter((k) => k !== id);
  } else state.pool = ECON.PEARLS.map((t) => t.id).filter((k) => k === id || state.pool.includes(k));
  updatePool(); save(); return true;
}
function setShiny(on) { state.shinyOn = !!on; updatePool(); save(); }
let poolSig = '';
function updatePool() {
  if ($('pool').hidden) return;
  const v = poolView(), sig = JSON.stringify(v) + spr.ps;
  if (sig === poolSig) return; poolSig = sig;
  $('poolList').innerHTML = v.rows.map((r) =>
    '<div class="prow' + (r.inPool ? '' : ' off') + (r.locked ? ' lk' : '') + '"><canvas width="128" height="128" data-art="' + r.id + '"></canvas><span class="nm">' + r.name + '</span>' +
    '<b class="pc">' + (r.p > 0 ? pctText(r.p) : '&nbsp;') + '</b>' +
    '<button type="button" class="chip tgl" data-id="' + r.id + '">' + (r.locked ? 'Locked in' : r.inPool ? 'In pool' : 'Add') + '</button>' +
    '<small class="why">' + (r.locked ? 'Max out ' + r.need + ' to switch off' : !r.unlocked ? 'Buy its unlock again to spawn it' : '&nbsp;') + '</small></div>').join('');
  document.querySelectorAll('#poolList canvas').forEach((cv) => { cv.getContext('2d').drawImage(bigSprite(cv.dataset.art), -10, -10, 148, 148); });
  setLbl('shinyBtn', v.shinyOn ? 'On' : 'Off'); $('shinyBtn').classList.toggle('on', v.shinyOn); setLbl('shinyPct', pctText(v.shiny) + ' per pearl, pays 5x');
}
$('poolList').addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-id]'); if (b) { Snd.click(); togglePool(b.dataset.id); } });
$('shinyBtn').addEventListener('click', () => { Snd.click(); setShiny(!state.shinyOn); });

/* ----- collection book: one spread per type, normal entry on the left page and its shiny on the right ----- */
let bookPage = 0, bookSig = '';
function bookCount() {
  let found = 0; ECON.PEARLS.forEach((t) => { const c = state.col[t.id]; if (c.found) found++; if (c.sFound) found++; });
  return { found, total: ECON.PEARLS.length * 2 };
}
function bookView(i) {
  const t = ECON.PEARLS[clamp(i | 0, 0, ECON.PEARLS.length - 1)], c = state.col[t.id];
  const ent = (shiny) => {
    const found = shiny ? c.sFound : c.found;
    return { id: t.id, shiny, found, name: found ? (shiny ? 'Shiny ' : '') + t.name : '???', hp: found ? t.hp : null, mult: found ? t.mult * (shiny ? ECON.SHINY_MULT : 1) : null, popped: found ? (shiny ? c.sPopped : c.popped) : null };
  };
  return { index: ECON.PEARLS.indexOf(t), pages: ECON.PEARLS.length, left: ent(false), right: ent(true) };
}
function bookEntryHTML(e) {
  const tag = e.shiny ? 'Shiny' : 'Normal';
  return '<div class="ent' + (e.found ? '' : ' sil') + (e.shiny ? ' shn' : '') + '"><span class="tag2">' + tag + '</span><canvas width="264" height="264" data-art="' + e.id + (e.shiny ? ':s' : '') + '"></canvas><h4>' + e.name + '</h4>' +
    (e.found ? '<p>Hits to pop: <b>' + e.hp + '</b></p><p>Payout: <b>x' + fmt(e.mult) + '</b></p><p>Popped: <b>' + fmt(e.popped) + '</b></p>' : '<p class="dim">Not discovered yet</p>') + '</div>';
}
function updateBook() {
  if ($('book').hidden) return;
  const v = bookView(bookPage), cnt = bookCount(), sig = JSON.stringify(v) + cnt.found + spr.ps;
  setLbl('bkCount', cnt.found + ' / ' + cnt.total + ' found'); setLbl('bkPage', (v.index + 1) + ' / ' + v.pages);
  $('bkPrev').disabled = v.index <= 0; $('bkNext').disabled = v.index >= v.pages - 1;
  if (sig === bookSig) return; bookSig = sig;
  $('pgL').innerHTML = bookEntryHTML(v.left); $('pgR').innerHTML = bookEntryHTML(v.right);
  document.querySelectorAll('#book canvas[data-art]').forEach((cv) => { cv.getContext('2d').drawImage(bigSprite(cv.dataset.art), 0, 0, 264, 264); });
}
function turnBook(d) {
  const n = clamp(bookPage + d, 0, ECON.PEARLS.length - 1); if (n === bookPage) return;
  Snd.click(); bookPage = n; const b = $('bk'); b.classList.remove('turn'); void b.offsetWidth; b.classList.add('turn'); updateBook();
}
function openBook() { // the cover swings open a moment after the panel appears
  const b = $('bk'); b.classList.remove('open'); bookSig = ''; updateBook();
  setTimeout(() => b.classList.add('open'), 60); // the cover swings open
}
$('bkPrev').addEventListener('click', () => turnBook(-1));
$('bkNext').addEventListener('click', () => turnBook(1));
document.addEventListener('keydown', (e) => { if (!$('book').hidden) { if (e.key === 'ArrowLeft') turnBook(-1); else if (e.key === 'ArrowRight') turnBook(1); } });

/* ----- tools: a carousel to browse, buy, equip and upgrade each tool ----- */
let toolView = 0, spinA = 0, spinKick = 0, lastPedT = 0;
const TOOL_THICK = [16, 28, 54, 56, 68, 62]; // how deep each tool is, in sprite units, for the 2.5D spin
const variants = {}, profiles = {};
function toolProfile(i) { // per sprite row: left and right extent plus a shaded average colour, for the solid side wall
  if (profiles[i]) return profiles[i];
  if (!spr.tools[i]) paintTool(i);
  const cv2 = document.createElement('canvas'); cv2.width = 260; cv2.height = 440;
  const x = cv2.getContext('2d'); x.drawImage(spr.tools[i], 0, 0, 260, 440);
  const img = x.getImageData(0, 0, 260, 440);
  if (!img) return (profiles[i] = []);
  const d = img.data, rows = new Array(440).fill(null);
  for (let y = 0; y < 440; y++) {
    let l = -1, r = -1, R = 0, G = 0, B = 0, n = 0;
    for (let px = 0; px < 260; px++) {
      const k = (y * 260 + px) * 4; if (d[k + 3] < 60) continue;
      if (l < 0) l = px; r = px; R += d[k]; G += d[k + 1]; B += d[k + 2]; n++;
    }
    if (n) rows[y] = { l: l - 130, r: r + 1 - 130, R: Math.round(R / n * 0.5), G: Math.round(G / n * 0.5), B: Math.round(B / n * 0.5) };
  }
  return (profiles[i] = rows);
}
function toolVariants(i) {
  if (variants[i]) return variants[i];
  if (!spr.tools[i]) paintTool(i);
  const mk = (a) => {
    const cv2 = document.createElement('canvas'); cv2.width = 260; cv2.height = 440;
    const x = cv2.getContext('2d'); x.drawImage(spr.tools[i], 0, 0, 260, 440);
    if (a > 0) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(22,14,8,' + a + ')'; x.fillRect(0, 0, 260, 440); }
    return cv2;
  };
  return (variants[i] = { bright: mk(0), mid: mk(0.3), dark: mk(0.5) });
}
function buildToolPanel() {
  const d = $('tDots'); d.innerHTML = '';
  ECON.TOOLS.forEach(() => d.appendChild(document.createElement('i')));
  toolView = Math.max(0, state.equip >= 0 ? state.equip : state.lv.tool);
  $('tPrev').addEventListener('click', () => stepTool(-1));
  $('tNext').addEventListener('click', () => stepTool(1));
  $('pUp').addEventListener('click', () => upTool('p'));
  $('sUp').addEventListener('click', () => upTool('s'));
  $('tAct').addEventListener('click', () => { Snd.resume(); const i = toolView; if (state.owned[i]) equipTool(i); else buyTool(i); });
  document.addEventListener('keydown', (e) => { if ($('tools').hidden) return; if (e.key === 'ArrowLeft') stepTool(-1); else if (e.key === 'ArrowRight') stepTool(1); });
}
function stepTool(dir) {
  const n = ECON.TOOLS.length; toolView = (toolView + dir + n) % n; spinKick = 9; Snd.click(); updateToolPanel();
}
const toolUp = (i) => state.toolUp[i] || (state.toolUp[i] = { p: 0, s: 0 });
function syncTop() { let t = 0; state.owned.forEach((o, i) => { if (o) t = i; }); state.lv.tool = t; }
function buyTool(i) {
  const price = ECON.toolPrice(i);
  if (collapse || state.owned[i] || state.sparks < price) return;
  state.sparks -= price; state.owned[i] = true; state.equip = i; syncTop(); recalc();
  toast('New tool! The ' + S.toolName + ' is in your hand'); Snd.equip(); addShake(1.5);
  updateShelf(); updateToolPanel(); save();
}
function equipTool(i) {
  if (collapse || !state.owned[i] || state.equip === i) return;
  state.equip = i; recalc(); Snd.equip(); toast(S.toolName + ' equipped'); updateToolPanel(); save();
}
function upTool(kind) {
  const i = toolView, u = toolUp(i), lvl = u[kind];
  if (collapse || !state.owned[i] || lvl >= ECON.TOOL_UP_MAX) return;
  const c = ECON.toolUpCost(i, kind === 'p' ? 'power' : 'speed', lvl);
  if (state.sparks < c) return;
  state.sparks -= c; u[kind] = lvl + 1; recalc(); Snd.buy(u[kind] + 1); updateShelf(); updateToolPanel(); save();
}
function updateToolPanel() {
  const i = toolView, t = ECON.TOOLS[i], owned = state.owned[i], eq = (state.equip >= 0 ? state.equip : state.lv.tool) === i, u = toolUp(i);
  setLbl('tName', t.name);
  const tag = $('tTag'); setLbl('tTag', eq ? 'Equipped' : owned ? 'Owned' : 'Not owned'); tag.classList.toggle('on', eq);
  setLbl('pVal', String(ECON.toolPower(i, u.p)));
  setLbl('sVal', 'x' + ECON.toolSpeed(i, u.s).toFixed(2).replace(/0$/, ''));
  [['p', 'pUp', 'pLv', 'power'], ['s', 'sUp', 'sLv', 'speed']].forEach(([k, bid, lid, kind]) => {
    const lvl = u[k], max = lvl >= ECON.TOOL_UP_MAX, c = ECON.toolUpCost(i, kind, lvl), btn = $(bid);
    setLbl(lid, 'Level ' + lvl + '/' + ECON.TOOL_UP_MAX);
    setLbl(bid, !owned ? 'Buy tool first' : max ? 'Maxed' : 'Upgrade ' + fmt(c));
    btn.classList.toggle('can', owned && !max && state.sparks >= c);
  });
  const act = $('tAct'), price = ECON.toolPrice(i);
  setLbl('tAct', eq ? 'Equipped' : owned ? 'Equip' : 'Buy for ' + fmt(price));
  act.disabled = eq || (!owned && state.sparks < price);
  [...$('tDots').children].forEach((d, n) => { d.classList.toggle('cur', n === i); d.classList.toggle('own', !!state.owned[n]); });
}
function drawPedestal(ts) {
  const cvp = $('pedestal'), c = cvp.getContext('2d'), i = toolView;
  const dt = lastPedT ? Math.min(0.05, (ts - lastPedT) / 1000) : 0.016; lastPedT = ts;
  spinKick *= Math.exp(-dt * 3.2); spinA += dt * (1.3 + spinKick);
  if (!spr.tools[i]) paintTool(i);
  c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 330, 210);
  const cx = 165, topY = 170, rx = 98, ry = 22, hgt = 30;
  // pedestal: a short drum with a lit top face and a soft pink rim
  let gr = c.createLinearGradient(cx - rx, 0, cx + rx, 0);
  gr.addColorStop(0, '#d9ceb4'); gr.addColorStop(0.35, '#fffaf0'); gr.addColorStop(1, '#cfc2a6');
  c.fillStyle = gr; c.beginPath(); c.moveTo(cx - rx, topY); c.lineTo(cx - rx, topY + hgt); c.ellipse(cx, topY + hgt, rx, ry, 0, Math.PI, 0, true); c.lineTo(cx + rx, topY); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(58,46,28,0.55)'; c.lineWidth = 1.6; c.stroke();
  gr = c.createRadialGradient(cx - 20, topY - 6, 4, cx, topY, rx);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#eadfc6');
  c.fillStyle = gr; c.beginPath(); c.ellipse(cx, topY, rx, ry, 0, 0, TAU); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(240,40,108,0.55)'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, topY, rx - 9, ry - 3, 0, 0, TAU); c.stroke();
  // the tool: spins about its own vertical axis, bobs a little, casts a shadow that breathes with it
  const bob = Math.sin(spinA * 1.5) * 4, cs = Math.cos(spinA);
  c.fillStyle = 'rgba(60,40,20,' + (0.2 - bob * 0.01).toFixed(3) + ')'; c.beginPath(); c.ellipse(cx, topY + 3, 44 * (0.75 + 0.25 * Math.abs(cs)) - bob, 9, 0, 0, TAU); c.fill();
  // 2.5D: the sprite is extruded into a solid. Every row of the sprite becomes a block as wide as the row plus the depth that
  // shows when turned, so there are no gaps at any angle; the lit face sits on the near end and fades in as it turns toward you.
  const v = toolVariants(i), pr = toolProfile(i), T = TOOL_THICK[i] || 40, sc = 0.3;
  const sn = Math.sin(spinA), h = T / 2 * Math.abs(sn), face = clamp(Math.abs(cs) / 0.3, 0, 1);
  c.save(); c.translate(cx, topY - 12 - bob); c.scale(sc, sc);
  for (let y = 0; y < 440; y++) {
    const r = pr[y]; if (!r) continue;
    const a0 = r.l * cs, b0 = r.r * cs, lo = Math.min(a0, b0) - h, hi = Math.max(a0, b0) + h;
    c.fillStyle = 'rgb(' + r.R + ',' + r.G + ',' + r.B + ')'; c.fillRect(lo, y - 400, hi - lo, 2.6);
  }
  const zf = (cs >= 0 ? 1 : -1) * T / 2, sx = Math.abs(cs) < 0.02 ? (cs < 0 ? -0.02 : 0.02) : cs;
  c.translate(zf * sn, 0); c.scale(sx, 1);
  c.drawImage(v.dark, -130, -400, 260, 440);
  c.globalAlpha = face; c.drawImage(cs >= 0 ? v.bright : v.mid, -130, -400, 260, 440);
  c.restore();
}

/* ----- fresh batch (prestige) ----- */
let armed = false, armTimer = 0;
$('collapseBtn').addEventListener('click', () => {
  if (!ECON.collapseReady(state.runEarned) || collapse) return;
  if (!armed) {
    armed = true; $('collapseBtn').textContent = 'Click again to confirm';
    clearTimeout(armTimer); armTimer = setTimeout(() => { armed = false; updateShelf(); }, 3500); return;
  }
  armed = false; clearTimeout(armTimer);
  collapse = { t: 0, dur: 1.9, gain: ECON.collapseGain(state.runEarned) };
  Snd.batch(); toast('Pop everything for a fresh batch!'); updateShelf();
  // a wave of free pops sweeps outward from the middle of the board
  const cx = W / 2, cy = H / 2, far = Math.max(1, Math.hypot(W / 2, H / 2));
  pearls.forEach((p) => {
    if (p.st !== 'live') return;
    const d = Math.hypot(p.cell.x - cx, p.cell.y - cy) / far;
    p.queued = true; queue.push({ p, at: time + 0.1 + d * 1.1, src: 'batch', depth: 0, step: Math.floor(d * 12) });
  });
});
function resetRun() {
  pearls.length = 0; queue.length = 0; ghosts.length = 0; cells.forEach((c) => { c.p = null; });
  fx.parts.length = 0; fx.motes.length = 0; fx.texts.length = 0; fx.blooms.length = 0; fx.pops.length = 0;
  combo = 0; comboT = 99; frenzyT = 0; meter = 0; nextSpawn = 0; autoAcc = 0; $('surge').classList.remove('on');
  recalc(); buildCells(); if (!pearls.length) prefill(); dispSparks = state.sparks;
}
function finishCollapse() {
  const gain = collapse.gain; collapse = null;
  state.echoes += gain; state.collapses += 1; state.sparks = 0; state.runEarned = 0; state.lv = ECON.zeroLevels(); zeroInv(); resetTools();
  resetRun();
  toast('Yum! Flavors +' + gain + '. Everything pays x' + S.echoMult.toFixed(1) + ' now'); updateShelf(); save();
}

/* ----- input ----- */
const ptr = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function pearlAt(x, y) {
  let best = null, bd = 1e9;
  for (const p of pearls) {
    if (p.st !== 'live') continue;
    const d = Math.hypot(p.cell.x - x, p.cell.y - y), lim = Math.max(radiusOf(p) * 1.15, PR * 0.7, 16);
    if (d < lim && d < bd) { bd = d; best = p; }
  }
  return best;
}
function sweepSeg(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
  for (const p of pearls.slice()) {
    if (p.st !== 'live') continue;
    const px = p.cell.x, py = p.cell.y, k = clamp(((px - x0) * dx + (py - y0) * dy) / len2, 0, 1);
    if (Math.hypot(px - (x0 + dx * k), py - (y0 + dy * k)) < S.brush * U * 0.55 + radiusOf(p) && time - p.lastSweep > 0.16 / S.toolSpeed) { // the small circle only has to touch any part of a pearl
      p.lastSweep = time; swing(); // the tool strikes for every pearl the player hits, never for chain or helper pops
      hitPearl(p, Math.max(1, Math.round(S.power * 0.5)), 'sweep');
    }
  }
}
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault(); Snd.resume();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
  const q = ptr(e); pointer.x = q[0]; pointer.y = q[1]; pointer.down = true; pointer.has = true; pointer.touch = e.pointerType === 'touch'; pointer.last = time;
  if (collapse) return;
  swing();
  const p = pearlAt(q[0], q[1]);
  if (p) hitPearl(p, S.power, 'tap');
  else if (S.sweep) sweepSeg(q[0], q[1], q[0], q[1]);
});
cv.addEventListener('pointermove', (e) => {
  const q = ptr(e), ox = pointer.x, oy = pointer.y; pointer.x = q[0]; pointer.y = q[1]; pointer.has = true; pointer.touch = e.pointerType === 'touch'; pointer.last = time;
  if (pointer.down && S.sweep && !collapse) sweepSeg(ox, oy, q[0], q[1]);
  if (!pointer.down) hover = pearlAt(q[0], q[1]);
});
const endPtr = () => { pointer.down = false; };
cv.addEventListener('pointerup', endPtr);
cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('pointerleave', () => { hover = null; if (!pointer.touch) pointer.has = false; });

/* ----- save / load ----- */
const KEY = 'poppit.v1';
function serialize() { return { sparks: state.sparks, runEarned: state.runEarned, lifetime: state.lifetime, lv: state.lv, echoes: state.echoes, collapses: state.collapses, muted: state.muted, musicOn: state.musicOn, musicVol: state.musicVol, autoSell: state.autoSell, owned: state.owned, equip: state.equip, toolUp: state.toolUp, inv: state.inv, invV: state.invV, seen: state.seen, version: 2, pool: state.pool, shinyOn: state.shinyOn, col: state.col, t: Date.now() }; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(serialize())); } catch (e) { /* storage may be unavailable */ } }
function readSave() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function loadState(d) {
  if (!d || typeof d !== 'object') return;
  state.sparks = Math.max(0, +d.sparks || 0); state.runEarned = Math.max(0, +d.runEarned || 0); state.lifetime = Math.max(0, +d.lifetime || 0);
  state.echoes = Math.max(0, d.echoes | 0); state.collapses = Math.max(0, d.collapses | 0); state.muted = !!d.muted; state.musicOn = d.musicOn !== false; state.musicVol = typeof d.musicVol === 'number' ? clamp(d.musicVol, 0, 1) : 0.5;
  state.autoSell = !!d.autoSell;
  const topT = clamp((d.lv && d.lv.tool) | 0, 0, ECON.TOOLS.length - 1);
  state.owned = ECON.TOOLS.map((_, i) => (Array.isArray(d.owned) ? !!d.owned[i] : i <= topT) || i === 0);
  state.equip = Array.isArray(d.owned) && d.equip >= 0 && state.owned[d.equip | 0] ? d.equip | 0 : topT;
  state.toolUp = {};
  ECON.TOOLS.forEach((_, i) => { const u = d.toolUp && d.toolUp[i]; if (u) state.toolUp[i] = { p: clamp(u.p | 0, 0, ECON.TOOL_UP_MAX), s: clamp(u.s | 0, 0, ECON.TOOL_UP_MAX) }; });
  const inv = d.inv && typeof d.inv === 'object' ? d.inv : {}, invV = d.invV && typeof d.invV === 'object' ? d.invV : {}, seen = d.seen && typeof d.seen === 'object' ? d.seen : {};
  for (const k of INV_IDS) { state.inv[k] = Math.max(0, inv[k] | 0); state.invV[k] = Math.max(0, +invV[k] || 0); if (seen[k]) state.seen[k] = true; }
  for (const k in ECON.UPG) state.lv[k] = clamp((d.lv && d.lv[k]) | 0, 0, ECON.UPG[k].max);
  const v2 = (d.version | 0) >= 2;
  if (!v2 && state.lv.lucky < 1) state.lv.lucky = 1; // v1 saves always had blue pearls; blue is now the first unlock
  state.col = blankCol(); state.shinyOn = v2 && typeof d.shinyOn === 'boolean' ? d.shinyOn : true;
  const dc = v2 && d.col && typeof d.col === 'object' ? d.col : {};
  for (const t of ECON.PEARLS) {
    const c = state.col[t.id], o = dc[t.id] && typeof dc[t.id] === 'object' ? dc[t.id] : {};
    c.found = c.found || !!o.found || (!v2 && (ECON.isUnlocked(t.id, state.lv) || !!seen[t.id]));
    c.popped = Math.max(0, o.popped | 0); c.sFound = !!o.sFound; c.sPopped = Math.max(0, o.sPopped | 0);
  }
  const ids = ECON.PEARLS.map((t) => t.id);
  state.pool = v2 && Array.isArray(d.pool) ? ids.filter((k) => d.pool.includes(k) && state.col[k].found) : ids.filter((k) => state.col[k].found); // locked types are ignored by poolChances, so a re-buy after a Fresh Batch spawns them again
  if (!state.pool.length) state.pool = ['pearl'];
  syncTop();
}
function awayBonus(secs) {
  recalc();
  if (S.autoRate <= 0 || secs < 20) return;
  const gain = ECON.idleRate(S) * Math.min(secs, 28800) * 0.5;
  state.sparks += gain; state.runEarned += gain; state.lifetime += gain;
  toast('Welcome back! Your helpers popped ' + fmt(gain) + ' juice while you were away');
}

/* ----- buttons ----- */
function paintMute() { $('muteBtn').textContent = state.muted ? 'Sound off' : 'Sound on'; }
$('muteBtn').addEventListener('click', () => { state.muted = !state.muted; Snd.resume(); Snd.setMuted(state.muted); Music.setMuted(state.muted); Snd.click(); paintMute(); save(); });
// music: on/off + volume; the radio starts on the first tap anywhere (browsers need a gesture) and stays quiet when Sound is off
function paintMusic() {
  $('musicBtn').textContent = state.musicOn ? 'Music on' : 'Music off';
  $('musicVol').value = Math.round(state.musicVol * 100);
  $('musicNote').textContent = Music.hasTracks() ? Music.count() + (Music.count() === 1 ? ' song' : ' songs') + ', shuffled' : 'No songs added yet';
  $('musicBtn').disabled = $('musicVol').disabled = !Music.hasTracks();
}
$('musicBtn').addEventListener('click', () => { state.musicOn = !state.musicOn; Snd.click(); Music.start(); Music.setOn(state.musicOn); paintMusic(); save(); });
$('musicVol').addEventListener('input', (e) => { state.musicVol = e.target.value / 100; Music.setVolume(state.musicVol); });
$('musicVol').addEventListener('change', () => save());
Music.onChange(paintMusic);
window.addEventListener('pointerdown', () => Music.start(), { once: true, capture: true });
let wipeArmed = false, wipeTimer = 0;
$('resetBtn').addEventListener('click', () => {
  const b = $('resetBtn');
  if (!wipeArmed) { wipeArmed = true; b.textContent = 'Click again to erase'; clearTimeout(wipeTimer); wipeTimer = setTimeout(() => { wipeArmed = false; b.textContent = 'Reset save'; }, 3000); return; }
  wipeArmed = false; b.textContent = 'Reset save';
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  Object.assign(state, { sparks: 0, runEarned: 0, lifetime: 0, lv: ECON.zeroLevels(), echoes: 0, collapses: 0, autoSell: false, seen: { pearl: true }, pool: ['pearl'], shinyOn: true, col: blankCol() }); zeroInv(); resetTools(); $('autoSell').checked = false;
  collapse = null; resetRun(); updateShelf(); toast('Save erased');
});

/* ----- main loop ----- */
let last = 0, acc = 0, hudT = 0, saveT = 0, started = false;
const DT = 1 / 60;
// adaptive quality: if the main thread keeps spending too long per frame, thin the particles first, then drop canvas resolution once
let workAvg = 4, slowT = 0, fastT = 0;
function adapt(work, dt) {
  workAvg += (work - workAvg) * 0.08;
  if (workAvg > 11) { slowT += dt; fastT = 0; } else if (workAvg < 5) { fastT += dt; slowT = 0; } else { slowT = fastT = 0; }
  if (slowT > 1.2) {
    slowT = 0;
    if (fxQ > 0.45) fxQ = Math.max(0.4, fxQ - 0.2);
    else if (dprCap > 1) { dprCap = Math.max(1, dprCap - 0.5); layout(); }
  } else if (fastT > 6 && fxQ < 1) { fastT = 0; fxQ = Math.min(1, fxQ + 0.2); }
}
function frame(ts) {
  requestAnimationFrame(frame);
  if (!last) last = ts;
  let dt = (ts - last) / 1000; last = ts;
  if (dt > 3) { awayBonus(dt); dt = 0.05; }
  dt = Math.min(dt, 0.1);
  const w0 = performance.now();
  if (hitStop > 0) hitStop -= dt;
  else { acc += dt; while (acc >= DT) { step(DT); acc -= DT; } }
  hudT += dt; saveT += dt;
  if (hudT > 0.08) { updateHud(hudT); updateShelf(); updatePool(); updateBook(); hudT = 0; }
  if (saveT > 5) { save(); saveT = 0; }
  render();
  if (!$('tools').hidden) drawPedestal(ts);
  adapt(performance.now() - w0, dt);
}
function start(data) {
  if (started) return; started = true;
  loadState(data && data.lv ? data : readSave());
  const away = (data && data.t ? 0 : (readSave() || {}).t);
  recalc(); syncDiscoveries(); buildShelf(); buildPack(); buildToolPanel(); $('autoSell').checked = state.autoSell; layout(); dispSparks = state.sparks;
  if (away) awayBonus((Date.now() - away) / 1000);
  paintMute(); Snd.setMuted(state.muted); Music.setMuted(state.muted); Music.setVolume(state.musicVol); Music.setOn(state.musicOn); Music.load(); paintMusic(); updateShelf();
  if (window.ResizeObserver) new ResizeObserver(layout).observe(stage); else window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  requestAnimationFrame(frame);
}
(function boot() {
  let h = null;
  try { h = window.claude && window.claude.hot; } catch (e) { h = null; }
  try {
    if (h && h.snapshot) h.snapshot(() => serialize());
    if (h && h.ready) h.ready(start); else start(h && h.data);
  } catch (e) { console.error(e); start(); }
})();
