
/* ---------- Shelf (upgrades), HUD, fresh batch, input, save, main loop ---------- */
// shop text for a pearl type: its live chance within the current pool, or what it unlocks
function typeDesc(id, locked) {
  const t = ECON.PEARLS.find((q) => q.id === id);
  if (!ECON.isUnlocked(id, state.lv)) return locked;
  const c = ECON.poolChances(state.pool, state.lv)[id];
  return (c ? (c * 100).toFixed(1) + '% of pearls' : 'Not in your pool') + ', x' + fmtX(t.mult) + ' payout, ' + t.hp + ' hits';
}
const blurb = (id, lead) => { const t = ECON.PEARLS.find((x) => x.id === id); return lead + ': x' + fmtX(t.mult) + ' payout, ' + t.hp + ' hits.'; };
const META = {
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
  shiny:  { name: 'Shiny Hunter', desc: () => 'Shiny chance ' + (ECON.shinyChance(state.lv, S.shinyBonus) * 100).toFixed(2) + '% per pearl, shinies pay ' + ECON.SHINY_MULT + 'x' },
};
const rows = {};
let toastTimer = 0, toastAt = -1e15, toastParts = [];
const TOAST_BATCH_MS = 1000, TOAST_MAX = 3; // a message within a second of the last joins the toast on show (at most 3 lines, newest kept)
function toast(msg) {
  const el = $('toast'), now = Date.now();
  if (el.classList.contains('on') && now - toastAt < TOAST_BATCH_MS) { if (!toastParts.includes(msg)) toastParts = toastParts.concat([msg]).slice(-TOAST_MAX); }
  else toastParts = [msg];
  toastAt = now; el.textContent = toastParts.join('\n'); el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.classList.remove('on'); toastParts = []; }, 3400);
}
function buildShelf() {
  ECON.ORDER.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'up'; b.dataset.id = id; b.dataset.g = ECON.UPG[id].group;
    b.innerHTML = '<span class="top"><span class="nm"></span><span class="lv"></span></span><span class="ds"></span><span class="cs"></span>';
    b.addEventListener('click', () => { seeRow(id); buy(id); });
    ({ verb: $('listVerbs'), marble: $('listMarble') }[ECON.UPG[id].group] || $('listTune')).appendChild(b);
    rows[id] = { el: b, nm: b.querySelector('.nm'), lv: b.querySelector('.lv'), ds: b.querySelector('.ds'), cs: b.querySelector('.cs'), cache: {}, shown: false, can: false, inView: false };
    rows[id].nm.textContent = META[id].name;
    if (rowObserver) rowObserver.observe(b);
  });
}
/* ----- "new" and "affordable" cues on the shop groups: a dot on a group's heading while a row in it is new (just revealed) or newly
   affordable and the player has not seen it. A row counts as seen once at least half of it is on screen (IntersectionObserver)
   or it is tapped. The price-progress strip under each row stays the one progress display. ----- */
const SHOP_GROUPS = { verb: 'hVerbs', marble: 'hMarble', tune: 'hTune' };
const rowSeen = {}; // per row: { shown, can } as the player last saw it
const rowObserver = window.IntersectionObserver ? new IntersectionObserver((es) => { for (const e of es) { const id = e.target.dataset.id; if (rows[id]) { rows[id].inView = e.intersectionRatio >= 0.5; if (rows[id].inView) seeRow(id); } } syncShopDots(); }, { threshold: [0, 0.5, 1] }) : null;
function seeRow(id) { const r = rows[id]; if (r) rowSeen[id] = { shown: rowSeen[id] && rowSeen[id].shown || r.shown, can: r.can }; }
const rowNew = (id) => { const r = rows[id], v = rowSeen[id] || { shown: false, can: false }; return (r.shown && !v.shown) || (r.can && !v.can); };
function syncShopDots() {
  for (const g in SHOP_GROUPS) {
    let dot = false;
    for (const id of ECON.ORDER) { if (ECON.UPG[id].group !== g) continue; if (rows[id].inView) seeRow(id); if (rowNew(id)) dot = true; }
    $(SHOP_GROUPS[g]).classList.toggle('ndot', dot && !$(SHOP_GROUPS[g]).hidden);
  }
}
// boot, a load or a Reset save: what is on show now counts as seen, so nothing lights up just for loading
function seeShop() { for (const id of ECON.ORDER) seeRow(id); syncShopDots(); }
function setText(r, key, el, val) { if (r.cache[key] !== val) { r.cache[key] = val; el.textContent = val; } }
function updateShelf() {
  ECON.ORDER.forEach((id) => {
    const u = ECON.UPG[id], r = rows[id], lvl = state.lv[id];
    const reqOk = !u.req || u.req(state.lv), maxed = lvl >= u.max, c = ECON.cost(id, lvl);
    const shown = reqOk && (lvl > 0 || state.runEarned >= c * 0.4 || state.sparks >= c * 0.4);
    r.el.hidden = !shown; r.shown = shown; r.can = false;
    if (!shown) return;
    const can = !maxed && state.sparks >= c; r.can = can;
    r.el.classList.toggle('can', can); r.el.classList.toggle('max', maxed);
    r.el.style.setProperty('--p', maxed ? '0%' : (clamp(state.sparks / c, 0, 1) * 100).toFixed(0) + '%');
    setText(r, 'lv', r.lv, u.max <= 2 ? (lvl ? 'Lv ' + lvl + '/' + u.max : '') : 'Lv ' + lvl);
    setText(r, 'ds', r.ds, META[id].desc());
    setText(r, 'cs', r.cs, maxed ? 'Max' : fmt(c));
  });
  if (!$('tools').hidden) updateToolPanel();
  for (const g in SHOP_GROUPS) $(SHOP_GROUPS[g]).hidden = !ECON.ORDER.some((id) => ECON.UPG[id].group === g && !rows[id].el.hidden); // no empty headings
  $('shopEmpty').hidden = Object.values(SHOP_GROUPS).some((h) => !$(h).hidden); // an empty shop says why
  syncShopDots();
  const v = batchView(), btn = $('collapseBtn');
  $('collapseBox').hidden = !(REVEAL.collapse() || v.ready);
  btn.disabled = !v.ready || !!collapse; btn.classList.toggle('ready', v.ready && !collapse);
  if (!armed) btn.textContent = v.ready ? 'Fresh Batch for +' + fmt(v.gain) + ' Flavors' : 'Fresh Batch';
  setLbl('collapseNow', v.now); setLbl('collapseText', v.text);
  const bar = $('collapseBar'), pct = Math.floor(v.progress * 100 + 1e-9);
  bar.firstElementChild.style.transform = 'scaleX(' + v.progress.toFixed(3) + ')';
  if (lblCache.collapsePct !== pct) { lblCache.collapsePct = pct; bar.setAttribute('aria-valuenow', pct); }
}
// The Fresh Batch box, rule C: the gain is the Flavors owed for all the juice so far minus the Flavors held, and it is ready at the
// run floor once that gain is at least half the Flavors held (at least 2). It says what the player would get now and what is missing.
function batchView() {
  const run = state.runEarned, e = state.echoes, life = state.flavorJuice;
  const ready = ECON.collapseReady(run, e, life), gain = ECON.collapseGain(run, e, life), need = ECON.flavorNeed(e);
  const now = 'Now: +' + fmt(gain) + ' Flavor' + (gain === 1 ? '' : 's') + '. Ready at +' + fmt(need) + (e > 0 && need > ECON.FLAVOR_MIN_GAIN ? ' (half your ' + fmt(e) + ')' : '') + '.';
  // run juice counts toward both gates, so name the one that is further away
  const more = Math.max(0, ECON.flavorJuiceFor(e + need) - life), runLeft = Math.max(0, ECON.COLLAPSE_MIN_RUN - run);
  const text = ready ? 'Pops the whole board and restarts. Each Flavor adds ' + Math.round(ECON.FLAVOR_BONUS * 100) + '% to every payout, permanently.'
    : more > runLeft ? 'Earn ' + fmt(Math.ceil(more)) + ' more juice to reach +' + fmt(need) + '.'
    : 'Earn ' + fmt(ECON.COLLAPSE_MIN_RUN) + ' juice in this run to unlock it (' + fmt(run) + ' so far).';
  return { ready, gain, need, more, progress: ECON.collapseProgress(run, e, life), now, text };
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
    const msg = { tool: 'New tool! The ' + S.toolName + ' hits with power ' + S.power, marble: 'Glass marbles can show up now. They are tough!', auto: 'Little helpers will poke pearls for you!', golden: 'Golden pearls can show up now!' }[id];
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
  const pl = payoutLine(); setLbl('echoes', pl); ec.hidden = !pl;
  syncDock();
  const link = !$('artBtn').hidden, tip = link ? pl + '. Open the Hall of Ducks' + (typeDuckCount() ? ': type ducks pay more on their own pearl type' : '') : pl;
  if (lblCache.echoesTip !== tip) { lblCache.echoesTip = tip; ec.disabled = !link; ec.setAttribute('aria-label', tip); ec.setAttribute('title', tip); }
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
  mt.firstElementChild.style.transform = 'scaleX(' + (fr ? frenzyT / S.frenzySecs : clamp(meter / S.frenzyNeed, 0, 1)).toFixed(3) + ')';
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
    b.innerHTML = '<canvas width="128" height="128"></canvas><span class="cnt"></span><span class="lk" hidden>' + LOCK_SVG + '</span>';
    const slot = { el: b, cv: b.querySelector('canvas'), cnt: b.querySelector('.cnt'), lk: b.querySelector('.lk'), kind: null, art: 0, shown: -1 };
    b.addEventListener('click', () => { if (slot.kind) { Snd.click(); pickSlot(slot.kind); } });
    $('slots').appendChild(b); slotEls.push(slot);
  }
  $('qMinus').addEventListener('click', () => { Snd.click(); setQty(selQty - 1); });
  $('qPlus').addEventListener('click', () => { Snd.click(); setQty(selQty + 1); });
  $('qMax').addEventListener('click', () => { Snd.click(); setQty(1e9); });
  $('qIn').addEventListener('input', (e) => setQty(parseInt(e.target.value, 10) || 1));
  $('sellSel').addEventListener('click', () => { Snd.resume(); sellSome(selKind, selQty); });
  // Keep rows: one per pearl type, shown once the type is discovered, even with nothing held
  ECON.PEARLS.forEach((t) => {
    const r = document.createElement('div'); r.className = 'krow'; r.hidden = true;
    r.innerHTML = '<canvas width="64" height="64"></canvas><span class="kn">' + t.name + '</span><span class="kc"></span><button type="button" class="chip keepT" data-keep="' + t.id + '" aria-pressed="false">' + LOCK_SVG + '<span>Keep</span></button>';
    $('keepList').appendChild(r);
    keepRows[t.id] = { el: r, cv: r.querySelector('canvas'), kc: r.querySelector('.kc'), btn: r.querySelector('.keepT'), art: 0, sig: '' };
  });
  $('keepList').addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-keep]'); if (b) { Snd.click(); setKeep(b.dataset.keep, !state.keep[b.dataset.keep]); } });
}
// a small hand-drawn padlock, shown on kept stacks and on an active Keep toggle
const LOCK_SVG = '<svg class="lock" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.2 7.3 C4.9 3.9 5.9 2.3 8.1 2.3 C10.3 2.3 11.2 3.8 10.9 7.2"/><path d="M3.3 7.6 C6.4 7 9.7 7.1 12.8 7.5 L12.5 13.5 C9.6 14 6.3 14 3.6 13.4 Z" fill="currentColor" fill-opacity="0.18"/><path d="M8 9.9 L8 11.4"/></svg>';
const keepRows = {};
function setKeep(id, on) {
  if (!ECON.PEARLS.some((t) => t.id === id)) return false;
  if (on) state.keep[id] = true; else delete state.keep[id];
  toast(on ? 'Keeping ' + ECON.PEARLS.find((t) => t.id === id).name + 's: their pops go to your backpack, and Sell all skips them' : 'Stopped keeping ' + ECON.PEARLS.find((t) => t.id === id).name + 's');
  updatePack(); updateArts(); updateForge(); save(); return true;
}
function updateKeep() {
  if ($('pack').hidden) return;
  for (const t of ECON.PEARLS) {
    const k = keepRows[t.id], on = state.keep[t.id] === true, held = (state.inv[t.id] || 0) + (state.inv[t.id + ':s'] || 0);
    k.el.hidden = !state.col[t.id].found;
    if (k.el.hidden) continue;
    if (k.art !== spr.ps && spr.pearl[t.id]) { const x = k.cv.getContext('2d'); x.clearRect(0, 0, 64, 64); x.drawImage(bigSprite(t.id), -5, -5, 74, 74); k.art = spr.ps; }
    const sig = on + ':' + held;
    if (k.sig === sig) continue; k.sig = sig;
    k.kc.textContent = held > 0 ? fmt(held) : '';
    k.el.classList.toggle('on', on); k.btn.classList.toggle('on', on); k.btn.setAttribute('aria-pressed', String(on));
    k.btn.lastElementChild.textContent = on ? 'Kept' : 'Keep';
  }
}
const packCount = () => KINDS.reduce((a, k) => a + (state.inv[k[0]] || 0), 0);
// what Sell all sells: every stack except kept types
const sellable = () => KINDS.filter((k) => !isKept(k[0]));
const sellCount = () => sellable().reduce((a, k) => a + (state.inv[k[0]] || 0), 0);
const packValue = () => sellable().reduce((a, k) => a + (state.invV[k[0]] || 0), 0);
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
  updateKeep();
  if (packBump > 0) { packBump = 0; const b = $('packBtn'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  if (selling || $('pack').hidden) return;
  if (selKind && !(state.inv[selKind] > 0)) selKind = null;
  setLbl('packNote', state.autoSell ? 'Auto-sell is on, so pops turn into juice right away. Kept types still land here.' : 'Pops land here. Sell them for juice, or switch auto-sell on.');
  const owned = KINDS.filter((k) => (state.inv[k[0]] || 0) > 0);
  slotEls.forEach((s, i) => {
    const kind = owned[i] ? owned[i][0] : null;
    if (s.kind !== kind) { s.kind = kind; s.art = 0; s.shown = -1; }
    const q = kind ? state.inv[kind] : 0;
    s.el.hidden = !kind;
    if (q > 0) drawIcon(s);
    s.el.classList.toggle('empty', q === 0); s.el.classList.toggle('sel', s.kind === selKind && q > 0); s.lk.hidden = !(q > 0 && isKept(s.kind));
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
  $('sellBtn').disabled = sellCount() === 0;
}
// pay for items, shared by "sell all" and "sell some"
function cashIn(total) {
  state.sparks += total; state.runEarned += total; state.lifetime += total; state.flavorJuice += total; incomeLog.push([time, total]);
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
  const n = sellCount(), total = packValue();
  if (n === 0 || collapse) return;
  const rect = $('sellBtn').getBoundingClientRect(), sr = stage.getBoundingClientRect();
  sellable().forEach(([id]) => { state.inv[id] = 0; state.invV[id] = 0; });
  cashIn(total); selKind = null;
  // the big sell: every stack squishes, the button squishes, the panel jolts, juice flies to the score
  selling = true; clearTimeout(sellTimer);
  slotEls.forEach((s, i) => { if (s.kind && !isKept(s.kind) && !s.el.classList.contains('empty')) { s.el.style.animationDelay = (i * 45) + 'ms'; s.el.classList.add('sold'); } });
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
const PANEL_BTN = { pack: 'packBtn', settings: 'setBtn', tools: 'toolBtn', pool: 'poolBtn', book: 'bookBtn', arts: 'artBtn', forge: 'forgeBtn', stats: 'setBtn' }; // Stats opens from Settings
function openPanel(id) {
  Snd.click();
  Object.keys(PANEL_BTN).forEach((p) => {
    const show = p === id && $(p).hidden;
    $(p).hidden = !show; $(PANEL_BTN[p]).setAttribute('aria-expanded', String(show));
  });
  syncDots();
  updatePack(); updatePool(); artSig = ''; updateArts(); updateStats(); if (id === 'forge' && !$('forge').hidden) { setForgeDot(false); forgeSig = ''; updateForge(); } if (id === 'book' && !$('book').hidden) openBook(); if (id === 'tools' && !$('tools').hidden) { toolView = state.equip >= 0 ? state.equip : state.lv.tool; updateToolPanel(); }
}
$('packBtn').addEventListener('click', () => openPanel('pack'));
$('setBtn').addEventListener('click', () => openPanel('settings'));
$('toolBtn').addEventListener('click', () => openPanel('tools'));
$('poolBtn').addEventListener('click', () => openPanel('pool'));
$('bookBtn').addEventListener('click', () => openPanel('book'));
$('artBtn').addEventListener('click', () => openPanel('arts'));
$('forgeBtn').addEventListener('click', () => openPanel('forge'));

/* ----- artifacts: permanent items crafted from kept pearls, one section per hall ----- */
const forgeUsed = () => state.forge.slots.some(Boolean) || Object.keys(state.forge.stock).length > 0 || state.forge.lv.speed > 0 || state.forge.lv.slot > 0;
/* ----- Reveal rules: a control appears once the player has earned what it belongs to. Every rule reads the state, never a stored
   flag, so an old save shows what it has earned and Reset save starts over. A save that has taken a Fresh Batch passes them all.
   Settings and the paste box (to bring a save to a new device) are there from the start. ----- */
const foundCount = () => ECON.PEARLS.filter((t) => state.col[t.id].found).length;
const anyShiny = () => ECON.PEARLS.some((t) => state.col[t.id].sFound);
const hasPearls = () => INV_IDS.some((k) => state.inv[k] > 0);
const ownsArtifact = () => ARTS.ARTIFACTS.some((a) => ARTS.count(state.artifacts, a.id) > 0);
const veteran = () => state.collapses > 0 || state.echoes > 0;
// any artifact or forge state: owned copies, forge jobs, stock or upgrades, or pearls marked Keep (what a duck or the forge needs).
// A save with any of it keeps both the Artifacts and Forge buttons, whatever its juice.
const artsUsed = () => ownsArtifact() || forgeUsed() || Object.keys(state.keep).length > 0;
const toolsAt = () => 0.4 * Math.min(ECON.toolPrice(1), ECON.uniqueCost(0, 0)); // 40% of the cheapest thing in the Tools panel, like a shop row
const COLLAPSE_SHOW = 0.1; // the Fresh Batch box shows once lifetime juice reaches this share of a Fresh Batch's run juice
const REVEAL = {
  collapse: () => veteran() || state.lifetime >= COLLAPSE_SHOW * ECON.COLLAPSE_MIN_RUN,
  progress: () => veteran() || state.lifetime > 0 || hasPearls() || ownsArtifact(), // Reset save, Copy save code, Download save file
};
// dock and top-right buttons behind a gate, keyed by their PANEL_BTN panel id
const DOCK_GATES = {
  pack: () => veteran() || state.lifetime > 0 || hasPearls() || Object.keys(state.keep).length > 0 || !state.autoSell, // the first pop
  tools: () => veteran() || state.lifetime >= toolsAt() || state.owned.some((o, i) => o && i > 0) || Object.keys(state.toolUp).length > 0,
  book: () => veteran() || foundCount() >= 2 || anyShiny() || state.achieved.length > 0, // a second pearl type, a shiny, or the first achievement (its toast points here)
  pool: () => veteran() || foundCount() >= 3 || anyShiny() || !state.shinyOn || ECON.PEARLS.some((t) => state.col[t.id].found && !state.pool.includes(t.id)), // a third type, a shiny, or a pool already changed
  arts: () => REVEAL.collapse() || artsUsed(), // with the Fresh Batch box (500K lifetime juice), or once used
  forge: () => REVEAL.collapse() || artsUsed(),
};
const STAGE_CLASS = { arts: true, forge: true }; // the stage gets these panel ids as classes while their buttons show (the bottom bar moves right)
// the dock, left to right, and how far each button moves the next one along; a hidden button leaves no gap (all shown = the CSS lefts)
const DOCK_ORDER = [['pack', 70], ['tools', 70], ['book', 56], ['arts', 56], ['forge', 56]], DOCK_LEFT = 6;
function syncDock() {
  let moved = false;
  for (const id in DOCK_GATES) {
    const b = $(PANEL_BTN[id]), show = DOCK_GATES[id]();
    if (b.hidden === show) { b.hidden = !show; moved = true; if (STAGE_CLASS[id]) $('stage').classList.toggle(id, show); }
  }
  if (moved) {
    let x = DOCK_LEFT; for (const [id, step] of DOCK_ORDER) { const b = $(PANEL_BTN[id]); if (b.hidden) continue; b.style.left = x + 'px'; x += step; }
    if (!$('packBtn').hidden) aimPack();
  }
  for (const [row, on] of [['resetRow', REVEAL.progress()], ['copyRow', REVEAL.progress()], ['dlRow', REVEAL.progress()], ['statsRow', REVEAL.progress()]]) if ($(row).hidden === on) $(row).hidden = !on;
  syncDots(); updateGoal();
}
/* ----- dots on dock buttons: something unseen or newly affordable inside, cleared when the panel opens. Each panel lists keys for
   what it offers; a key the player has not had on show while the panel was open lights the dot. (The Forge has its own dot.) ----- */
const DOTS = {
  tools: () => { // things in the Tools panel the player can afford now: the next tool, and each owned tool's next upgrade levels
    const k = [], nx = state.owned.lastIndexOf(true) + 1;
    if (nx < ECON.TOOLS.length && state.sparks >= ECON.toolPrice(nx)) k.push('buy' + nx);
    state.owned.forEach((o, i) => { if (!o) return; const u = state.toolUp[i] || { p: 0, s: 0, u: 0 };
      for (const kind of ['p', 's', 'u']) { const c = toolUpgrade(i, kind, u[kind] | 0); if (c && (u[kind] | 0) < c.max && state.sparks >= c.cost) k.push(kind + i + ':' + (u[kind] | 0)); } });
    return k;
  },
  book: () => ECON.PEARLS.flatMap((t) => [state.col[t.id].found ? t.id : null, state.col[t.id].sFound ? t.id + ':s' : null]).filter(Boolean).concat(state.achieved.map((id) => 'a:' + id)), // discoveries and achievements
  arts: () => ARTS.ARTIFACTS.filter((a) => ARTS.canCraft(a.id, state.inv, state.artifacts, state.forge.stock)).map((a) => a.id + ':' + ARTS.count(state.artifacts, a.id)), // crafts within reach
};
const dotSeen = {}; // per panel: every key the player has had on show while that panel was open
function syncDots() {
  for (const id in DOTS) {
    const keys = DOTS[id](), seen = dotSeen[id] || (dotSeen[id] = new Set());
    if (!$(id).hidden) for (const k of keys) seen.add(k);
    const on = !$(PANEL_BTN[id]).hidden && keys.some((k) => !seen.has(k));
    if ($(id + 'Dot').hidden === on) $(id + 'Dot').hidden = !on;
  }
}
// boot, a load or a Reset save: what the panels offer now counts as seen
function seeDots() { for (const id in DOTS) dotSeen[id] = new Set(DOTS[id]()); syncDots(); }
/* ----- the next goal: one short line under the juice counter, the first goal in GOALS whose test is not yet passed (goals with a
   'when' count only once it holds). It never blocks play. Its close button hides that goal for good on this device; the next goal
   still shows when it comes. Tests read the state, never a flag, so an old save starts at the goal it has reached. ----- */
const GOALS_KEY = 'poppit.goalsOff'; // the goals this device has hidden (a list of ids); Reset save clears it
const firstPrice = () => Math.min(...ECON.ORDER.filter((id) => !ECON.UPG[id].req).map((id) => ECON.cost(id, 0)));
const anyBought = () => Object.values(state.lv).some((v) => v > 0) || state.owned.some((o, i) => o && i > 0) || veteran();
const GOALS = [
  { id: 'juice', text: () => 'Pop pearls to earn ' + fmt(firstPrice()) + ' juice for your first upgrade.', done: () => state.lifetime >= firstPrice() || anyBought() },
  { id: 'buy', text: () => 'Buy your first upgrade in the shop.', done: anyBought },
  { id: 'blue', text: () => 'Unlock Blue Pearls in the shop. Each pays x' + fmtX(ECON.KIND.blue.mult) + '.', done: () => state.col.blue.found || veteran() },
  { id: 'tool', text: () => 'Open Tools (the hammer) and buy the ' + ECON.TOOLS[1].name + ': power ' + ECON.TOOLS[1].power + '.', done: () => state.owned.some((o, i) => o && i > 0) || veteran() },
  { id: 'helpers', text: () => 'Unlock Coral Pearls, then hire Helpers to pop for you.', done: () => state.lv.auto > 0 || veteran() },
  { id: 'fresh', text: () => 'Earn ' + fmt(ECON.COLLAPSE_MIN_RUN) + ' juice in one run, then take a Fresh Batch for +' + ECON.FLAVOR_MIN_GAIN + ' Flavors.', done: veteran },
  { id: 'duck', when: () => DOCK_GATES.arts(), text: () => 'Keep Rose Pearls in your backpack and craft the Pink Duck in Artifacts.', done: ownsArtifact },
  { id: 'forge', when: () => DOCK_GATES.forge(), text: () => 'Start a job in the Forge: it turns kept pearls into dust.', done: forgeUsed },
];
let goalsOff = (() => { try { const v = JSON.parse(localStorage.getItem(GOALS_KEY)); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch (e) { return []; } })();
const currentGoal = () => GOALS.find((g) => (!g.when || g.when()) && !g.done()) || null;
function updateGoal() {
  const g = currentGoal(), show = !!g && !goalsOff.includes(g.id);
  if ($('goal').hidden === show) $('goal').hidden = !show;
  if (show) setLbl('goalText', g.text());
  return show ? g.id : null;
}
function dismissGoal() {
  const g = currentGoal(); if (!g || goalsOff.includes(g.id)) return false;
  goalsOff = goalsOff.concat([g.id]); try { localStorage.setItem(GOALS_KEY, JSON.stringify(goalsOff)); } catch (e) { /* storage may be unavailable */ }
  updateGoal(); return true;
}
function resetGoals() { goalsOff = []; try { localStorage.removeItem(GOALS_KEY); } catch (e) { /* ignore */ } }
$('goalX').addEventListener('click', () => { Snd.click(); dismissGoal(); });
const syncArtBtn = syncDock; // the older name, kept for the tests
const pearlName = (kind) => (ECON.PEARLS.find((t) => t.id === kind) || { name: kind }).name;
const DUCK_SVG = '<svg viewBox="0 0 64 64" fill="none" stroke="#3a2e1c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M6 50 C16 47.5 26 52 34 49.5 C42 47 50 51.5 58 49" stroke="#8fc7e8" stroke-width="2.4"/>' +
  '<path d="M9 33 C8.5 28.5 10.5 26 13.5 27.5 C17 30 22 31.5 27 31 C29 30.5 30 29 29 26.5 C26 21.5 27.5 13 35.5 11.5 C43 10.5 47 16.5 45.5 22.5 C45 25 43.5 27 42.5 28.5 C49 29 54.5 32 54 38.5 C53.5 45.5 46 49.5 33 49.5 C20 49.5 9.5 44 9 33 Z" fill="#ff9ec4"/>' +
  '<path d="M45 18.5 C49.5 17.5 54.5 18.5 55.5 21 C55 23.5 50 24.5 45.5 23.5" fill="#f5b020"/>' +
  '<path d="M21 38.5 C26 35 34 35.5 38.5 40.5"/><circle cx="39.5" cy="17.5" r="1.7" fill="#3a2e1c" stroke="none"/>' +
  '<path d="M33 15.5 q2 -2.5 4.5 -2.5" stroke="#fff" stroke-width="2" opacity="0.85"/></svg>';
// the relics' card icons: simple inked drawings in the duck's style
const LANTERN_SVG = '<svg viewBox="0 0 64 64" fill="none" stroke="#3a2e1c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M26 13 C25 6.5 39 6.5 38 13"/><path d="M21.5 13.5 L42.5 13.5 L40.5 19.5 L23.5 19.5 Z" fill="#c9737f"/>' +
  '<path d="M24 19.5 C19.5 28 19.5 41 24 49.5 L40 49.5 C44.5 41 44.5 28 40 19.5 Z" fill="#ffe0ea"/>' +
  '<path d="M32 26 C26.5 32 27.5 41 32 43 C36.5 41 37.5 32 32 26 Z" fill="#ff8a3d"/><path d="M32 33 C30.5 36 31 39.5 32 40.5 C33 39.5 33.5 36 32 33 Z" fill="#f5b020" stroke-width="1.6"/>' +
  '<path d="M26.5 24 C25 31 25 39 26.5 45" stroke="#fff" stroke-width="2" opacity="0.85"/><path d="M20.5 49.5 L43.5 49.5 L46 56 L18 56 Z" fill="#c9737f"/></svg>';
const COMPASS_SVG = '<svg viewBox="0 0 64 64" fill="none" stroke="#3a2e1c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M28 12.5 L28 8.5 C28 6 36 6 36 8.5 L36 12.5" fill="#9aa2b1"/><circle cx="32" cy="35" r="22" fill="#8fc7e8"/><circle cx="32" cy="35" r="16" fill="#fffdf6"/>' +
  '<path d="M32 20.5 L32 23 M46.5 35 L44 35 M32 49.5 L32 47 M17.5 35 L20 35" stroke-width="2.2"/>' +
  '<path d="M32 22.5 L36.5 35 L27.5 35 Z" fill="#f0286c"/><path d="M32 47.5 L36.5 35 L27.5 35 Z" fill="#9aa2b1"/><circle cx="32" cy="35" r="2" fill="#3a2e1c" stroke="none"/>' +
  '<path d="M17 27 C19 21.5 23.5 17.5 29 16.5" stroke="#fff" stroke-width="2" opacity="0.85"/></svg>';
const CLOCK_SVG = '<svg viewBox="0 0 64 64" fill="none" stroke="#3a2e1c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12.5 21 C11 13.5 18.5 9 24.5 13.5 Z" fill="#9aa2b1"/><path d="M51.5 21 C53 13.5 45.5 9 39.5 13.5 Z" fill="#9aa2b1"/>' +
  '<path d="M21 52 L17 58 M43 52 L47 58"/><circle cx="32" cy="35" r="20" fill="#9fe3c4"/><circle cx="32" cy="35" r="14.5" fill="#fffdf6"/>' +
  '<path d="M32 35 L32 25.5 M32 35 L39 39"/><circle cx="32" cy="35" r="1.8" fill="#3a2e1c" stroke="none"/>' +
  '<path d="M32 22.5 L32 24 M44.5 35 L43 35 M32 47.5 L32 46 M19.5 35 L21 35" stroke-width="2"/><path d="M18 29 C19.5 24.5 23 21.5 27 20.5" stroke="#fff" stroke-width="2" opacity="0.85"/></svg>';
// a type duck is the Pink Duck's drawing in its pearl's colour (PALETTE in src/world.js), lightened so the ink still reads on Black
const pearlColor = (kind) => { const c = kind === 'pearl' ? PAL[0] : PALETTE[kind]; return 'hsl(' + c[0] + ' ' + c[1] + '% ' + Math.max(36, c[2]) + '%)'; };
const duckSvg = (kind) => DUCK_SVG.replace('#ff9ec4', pearlColor(kind));
const RELIC_SIL = '#a89a7c'; // an unowned relic's silhouette
const ART_ICON = { pink_duck: DUCK_SVG, rose_lantern: LANTERN_SVG, blue_compass: COMPASS_SVG, mint_clock: CLOCK_SVG };
for (const d of ARTS.TYPE_DUCKS) ART_ICON[d.pearl + '_duck'] = duckSvg(d.pearl);
// the small plinth an active copy stands on
const PEDESTAL_SVG = '<svg class="ped" viewBox="0 0 120 26" fill="none" stroke="#3a2e1c" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M22 3 L98 3 L93 9.5 L27 9.5 Z" fill="#fff4d6"/><path d="M31 9.5 L89 9.5 L89 17 L31 17 Z" fill="#f2e4c2"/><path d="M18 17 L102 17 L105 23.5 L15 23.5 Z" fill="#e2cf9f"/></svg>';
// plain words for stats: a perk's name from the data, and the one base-only stat
// a: the artifact, so a type duck's payout reads "Blue Pearl payouts" (its bonus and payout perks pay on that type only)
const statName = (s, a) => (s === 'payout' && a && a.bonus.scope ? pearlName(a.bonus.scope) + ' payouts' : (ARTS.perkById(s) || { name: s === 'meter' ? 'Frenzy meter speed' : s }).name);
const pctTxt = (v) => +(v * 100).toFixed(1) + '%';
const statTxt = (s, v) => (s === 'payout' ? 'x' + +v.toFixed(3) : '+' + pctTxt(v));
const perkText = (p, a) => statName(p.stat, a) + ' +' + pctTxt(p.value);
// what one copy of an artifact gives: payout as a multiplier (base x every payout perk), other stats as added fractions
function copyStats(a, c) {
  const o = {}; if (!c) return o;
  if (a.bonus.type === 'payout') o.payout = a.bonus.value; else o[a.bonus.type] = a.bonus.value - 1;
  for (const p of c.perks) { if (p.stat === 'payout') o.payout = (o.payout || 1) * (1 + p.value); else o[p.stat] = (o[p.stat] || 0) + p.value; }
  return o;
}
const zeroOf = (s) => (s === 'payout' ? 1 : 0);
// the stats that differ between two copies of one artifact, in ARTS.STATS order: [{ stat, from, to }]
function statDiff(a, from, to) {
  const f = copyStats(a, from), t = copyStats(a, to);
  return ARTS.STATS.filter((s) => s in f || s in t).map((s) => ({ stat: s, from: s in f ? f[s] : zeroOf(s), to: s in t ? t[s] : zeroOf(s) })).filter((d) => Math.abs(d.from - d.to) > 1e-9);
}
// "Placing it: Payouts x1.4 → x1.49, Shiny chance +16% → +0%"
const placeText = (a, from, to) => { const d = statDiff(a, from, to); return d.length ? 'Placing it: ' + d.map((x) => statName(x.stat, a) + ' ' + statTxt(x.stat, x.from) + ' → ' + statTxt(x.stat, x.to)).join(', ') : 'Placing it changes no stats'; };
// the odds line, built from the rarity table
function oddsText() { const tot = ARTS.RARITIES.reduce((n, r) => n + r.weight, 0); return 'Each craft rolls ' + ARTS.RARITIES.map((r) => r.name + ' ' + pctTxt(r.weight / tot)).join(', '); }
// why the next craft cannot happen, naming the first missing item ('' = it can)
function craftReason(id) {
  if (collapse) return 'Wait for the Fresh Batch to finish';
  const miss = ARTS.craftCost(id, state.artifacts).find((c) => ARTS.have(c, state.inv, state.forge.stock) < c.qty);
  if (!miss) return '';
  const short = whole2(miss.qty - ARTS.have(miss, state.inv, state.forge.stock));
  if (ARTS.isMat(miss)) return 'Need ' + short + ' more ' + matName(miss.id) + ': make it in the forge';
  const nm = pearlName(miss.kind) + 's';
  if (state.autoSell && !isKept(miss.kind)) return 'Need ' + short + ' more ' + nm + ': turn on Keep for them in your backpack';
  return 'Need ' + short + ' more ' + nm + ' in your backpack';
}
const copyView = (c) => ({ id: c.id, rarity: c.rarity, rarityName: ARTS.rarityById(c.rarity).name, perks: c.perks.map((p) => perkText(p, ARTS.byId(c.art))) });
// rarity rank: 0 for the first (Common) up to the last (Mythic)
const rarityRank = (id) => Math.max(0, ARTS.RARITIES.findIndex((r) => r.id === id));
// the top line: every active pedestal and what they do together
function pedestalLine() {
  const on = ARTS.ARTIFACTS.map((a) => ({ a, c: ARTS.activeCopy(state.artifacts, a.id) })).filter((x) => x.c);
  if (!on.length) return 'Nothing on a pedestal yet. Craft an artifact and it goes on one by itself.';
  const b = ARTS.activeBonuses(state.artifacts, state.artEquip);
  const fx = ARTS.STATS.filter((s) => (s === 'payout' ? Math.abs(b.payout - 1) > 1e-9 : b[s] > 1e-9)).map((s) => statName(s) + ' ' + statTxt(s, b[s]));
  for (const t of ECON.PEARLS) if (b.typePay[t.id]) fx.push(t.name + ' payouts ' + statTxt('payout', b.typePay[t.id]));
  const off = (a) => (ARTS.usesSlot(a.id) && !ARTS.isEquipped(state.artEquip, a.id) ? ', not equipped' : '');
  return 'On your pedestals: ' + on.map((x) => x.a.name + ' (' + ARTS.rarityById(x.c.rarity).name + off(x.a) + ')').join(', ') + '. Together: ' + (fx.join(', ') || 'nothing yet') + '.';
}
let artSig = '', artTab = ARTS.HALLS[0].id, shelfSort = 'best'; // shelfSort: 'best' (rarity, then oldest) or 'new' (newest first)
// "+1,000 Rose Pearls" or "+1 Azure Steel, +1 Rosegold"; lines that refund 0 are left out ('' = nothing back)
function refundText(lines) {
  const sum = {}; for (const x of lines) { const k = ARTS.isMat(x) ? 'm:' + x.id : x.kind; sum[k] = (sum[k] || 0) + x.qty; }
  return Object.keys(sum).filter((k) => sum[k] > 0).map((k) => '+' + whole2(sum[k]) + ' ' + (k.startsWith('m:') ? matName(k.slice(2)) : pearlName(k) + 's')).join(', ');
}
const refundLines = (copies) => [].concat(...copies.map((c) => ARTS.refundOf(c)));
// shelf copies that "Scrap all unlocked below the pedestal's rarity" takes: unlocked, off the pedestal, of a lower rarity
function bulkTargets(id) {
  const act = ARTS.activeCopy(state.artifacts, id); if (!act) return [];
  return state.artifacts[id].copies.filter((c) => c !== act && !c.locked && rarityRank(c.rarity) < rarityRank(act.rarity));
}
// the shelf rows of one artifact: every Common off the pedestal in one stack (they have no perks), every other copy alone
function shelfView(a, act) {
  const off = ARTS.count(state.artifacts, a.id) ? state.artifacts[a.id].copies.filter((c) => c !== act) : [];
  const commons = off.filter((c) => c.rarity === ARTS.RARITIES[0].id).sort((x, y) => y.id - x.id), rows = [];
  if (commons.length) {
    const open = commons.filter((c) => !c.locked);
    rows.push({ stack: true, key: 'stack', rarity: commons[0].rarity, rarityName: ARTS.rarityById(commons[0].rarity).name, count: commons.length, newest: commons[0].id, ids: commons.map((c) => c.id),
      locked: !open.length, open: open.length, perks: [], change: placeText(a, act, commons[0]),
      refund: open.length ? refundText(ARTS.refundOf(open[0])) : '', refundAll: refundText(refundLines(open)) });
  }
  for (const c of off) if (c.rarity !== ARTS.RARITIES[0].id) rows.push(Object.assign(copyView(c), { key: String(c.id), newest: c.id, locked: !!c.locked, change: placeText(a, act, c), refund: refundText(ARTS.refundOf(c)) }));
  return rows.sort(shelfSort === 'new' ? (x, y) => y.newest - x.newest : (x, y) => rarityRank(y.rarity) - rarityRank(x.rarity) || (x.stack ? -1 : y.stack ? 1 : x.id - y.id));
}
// a relic's slot line: "Equipped (slot 2 of 5)", or why it is not working
function slotText(id) {
  if (!ARTS.usesSlot(id)) return '';
  const i = state.artEquip.indexOf(id);
  return i >= 0 ? 'Equipped (slot ' + (i + 1) + ' of ' + ARTS.EQUIP_SLOTS + ')' : 'Not equipped: it does nothing until it has a slot' + (state.artEquip.length >= ARTS.EQUIP_SLOTS ? ' (all ' + ARTS.EQUIP_SLOTS + ' are full)' : '');
}
function artView() {
  return ARTS.HALLS.map((h) => ({ id: h.id, name: h.name, blurb: h.blurb, items: ARTS.ARTIFACTS.filter((a) => a.hall === h.id).map((a) => {
    const n = ARTS.count(state.artifacts, a.id), act = ARTS.activeCopy(state.artifacts, a.id), reason = craftReason(a.id);
    const pk = a.hall === 'ducks' ? a.bonus.scope || a.cost[0].kind : null, kind = pk && ECON.KIND[pk] ? pk : null, found = !kind || !!(state.col[kind] && state.col[kind].found); // the pearl a duck is made from
    return {
      id: a.id, name: a.name, desc: a.description, owned: n > 0, count: n, can: !reason, reason, odds: oddsText(), slot: n > 0 ? slotText(a.id) : '',
      kind, found, keep: !!kind && isKept(kind), keepName: kind ? pearlName(kind) + 's' : '', color: kind ? pearlColor(kind) : RELIC_SIL,
      slots: ARTS.usesSlot(a.id), equipped: state.artEquip.indexOf(a.id), full: state.artEquip.length >= ARTS.EQUIP_SLOTS,
      cost: ARTS.craftCost(a.id, state.artifacts).map((c) => (ARTS.isMat(c) ? { kind: c.id, mat: true, qty: c.qty, have: ARTS.have(c, state.inv, state.forge.stock), kept: true, text: FORGE.costText(ARTS.have(c, state.inv, state.forge.stock), c.qty, c.id) }
        : { kind: c.kind, qty: c.qty, have: state.inv[c.kind] || 0, kept: isKept(c.kind), label: pearlName(c.kind) + 's', unit: 'kept' })),
      active: act ? copyView(act) : null,
      shelf: shelfView(a, act), shelfCount: Math.max(0, n - 1),
      bulk: (() => { const t = bulkTargets(a.id); return { n: t.length, refund: refundText(refundLines(t)), below: act ? ARTS.rarityById(act.rarity).name : '' }; })(),
    };
  }) }));
}
const whole2 = (n) => Math.floor(n).toLocaleString('en-US');
// one pedestal: the artifact on its plinth (or a silhouette in its colour), the label under it, then everything about it.
// Occupied: the active copy in its rarity frame, perks, the next copy's cost, Craft another and the shelf.
// Empty: the recipe with bars, the Keep toggle for a duck's pearl type, the odds, the reason and Craft. Not found: dimmed, "Not found yet".
function pedestalHTML(a) {
  const r = a.active;
  const stage = '<div class="pstage' + (a.owned ? ' own r-' + r.rarity : '') + (a.found ? '' : ' dim') + '"><div class="aicon' + (a.owned ? '' : ' sil') + '"' + (a.owned ? '' : ' style="--sc:' + a.color + '"') + '>' + (ART_ICON[a.id] || '') + '</div>' +
    PEDESTAL_SVG + '<h5 class="plabel">' + a.name + '</h5>' + (a.owned ? '<span class="abadge">On pedestal</span>' : a.found ? '<span class="pempty">Empty pedestal</span>' : '') + '</div>';
  if (!a.found) return stage + '<p class="pnf">Not found yet</p>';
  const keep = a.kind ? '<button type="button" class="chip keepT pkeep' + (a.keep ? ' on' : '') + '" data-akeep="' + a.kind + '" aria-pressed="' + a.keep + '">' + LOCK_SVG + '<span>' + (a.keep ? 'Keeping ' : 'Keep ') + a.keepName + '</span></button>' : '';
  return stage +
    (a.owned ? '<p class="arar">' + r.rarityName + ' copy</p>' + equipHTML(a) : '') + '<p class="ad">' + (a.owned ? 'Base: ' : '') + a.desc + '</p>' +
    (a.owned ? (r.perks.length ? '<ul class="aperks">' + r.perks.map((t) => '<li>' + t + '</li>').join('') + '</ul>' : '<p class="anone">No perks</p>') : '') +
    (a.owned ? '<p class="anext">Next copy costs</p>' : '') +
    a.cost.map((c) => '<div class="acost"><span>' + (c.mat ? c.text : whole2(Math.min(c.have, c.qty)) + ' of ' + whole2(c.qty) + ' ' + c.label + ' ' + c.unit) + '</span><span class="abar"><i style="transform:scaleX(' + Math.min(1, c.have / c.qty).toFixed(3) + ')"></i></span></div>').join('') +
    keep + '<small class="aodds">' + a.odds + '</small>' + (a.reason ? '<small class="areason">' + a.reason + '</small>' : '') +
    '<button type="button" class="chip hot craft" data-craft="' + a.id + '"' + (a.can ? '' : ' disabled') + (a.reason ? ' title="' + a.reason + '"' : '') + '>' + (a.owned ? 'Craft another' : 'Craft') + '</button>' +
    (a.shelf.length ? shelfHTML(a) : '');
}
// an owned relic's slot line, and Equip while it is not equipped
function equipHTML(a) {
  if (!a.slots) return '';
  if (a.equipped >= 0) return '<p class="aslot">Equipped in slot ' + (a.equipped + 1) + ' of ' + ARTS.EQUIP_SLOTS + '</p>';
  return '<p class="aslot off">Not equipped: it has no effect until you equip it.</p><button type="button" class="chip hot pequip" data-equip="' + a.id + '">' + (a.full ? 'Equip (swap one out)' : 'Equip') + '</button>';
}
// the five slots: a filled slot shows the relic and offers Unequip; an empty one reads "Empty"
function equipRowHTML() {
  const eq = state.artEquip, cells = [];
  for (let i = 0; i < ARTS.EQUIP_SLOTS; i++) {
    const id = eq[i], a = id && ARTS.byId(id);
    cells.push(a ? '<button type="button" class="eslot" data-eslot="' + id + '" aria-label="Slot ' + (i + 1) + ': ' + a.name + '. Unequip">' + (ART_ICON[id] || '') + '<span>' + a.name + '</span></button>'
      : '<div class="eslot" role="img" aria-label="Slot ' + (i + 1) + ': empty"><span>Empty</span></div>');
  }
  return '<p class="ehead">Equipped ' + eq.length + ' of ' + ARTS.EQUIP_SLOTS + '</p><div class="erow">' + cells.join('') + '</div>';
}
const lockBtn = (on, art, key, label) => '<button type="button" class="chip slock' + (on ? ' on' : '') + '" data-sact="lock" data-art="' + art + '" data-copy="' + key + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Unlock ' : 'Lock ') + label + '">' + LOCK_SVG + '<span>' + (on ? 'Locked' : 'Lock') + '</span></button>';
function shelfHTML(a) {
  const sortBtn = (k, t) => '<button type="button" class="chip ssort' + (shelfSort === k ? ' on' : '') + '" data-sort="' + k + '" aria-pressed="' + (shelfSort === k) + '">' + t + '</button>';
  return '<div class="shelf"><div class="shead"><h6>On the shelf (' + a.shelfCount + ')</h6><div class="ssorts" role="group" aria-label="Sort the shelf">' + sortBtn('best', 'Best first') + sortBtn('new', 'Newest first') + '</div></div>' +
    (a.bulk.n ? '<button type="button" class="chip sbulk" data-bulk="' + a.id + '">Scrap all unlocked below ' + a.bulk.below + ' (' + a.bulk.n + ')</button>' : '') +
    '<div class="srows">' + a.shelf.map((c) => {
      const what = c.stack ? c.rarityName + ' x' + c.count : c.rarityName, back = c.refund ? 'Scrap: ' + c.refund : 'Scrap: no refund';
      return '<div class="scopy r-' + c.rarity + (c.locked ? ' locked' : '') + '"><div class="sct"><span class="srar">' + what + '</span><span class="sperk">' + (c.perks.length ? c.perks.join(', ') : 'No perks') + '</span></div>' +
        '<small class="schg">' + c.change + '</small><small class="sref">' + (c.locked ? 'Locked: unlock it to scrap' : back + (c.stack && c.open > 1 ? ' each' : '')) + '</small>' +
        '<div class="sbtns"><button type="button" class="chip splace" data-sact="place" data-art="' + a.id + '" data-copy="' + c.key + '">Place</button>' +
        lockBtn(c.locked, a.id, c.key, what) +
        '<button type="button" class="chip sscrap" data-sact="scrap" data-art="' + a.id + '" data-copy="' + c.key + '"' + (c.locked ? ' disabled' : '') + '>Scrap</button>' +
        (c.stack && c.open > 1 ? '<button type="button" class="chip sscrap" data-sact="scrapall" data-art="' + a.id + '" data-copy="stack">Scrap all ' + c.open + '</button>' : '') + '</div></div>';
    }).join('') + '</div></div>';
}
const htmlCache = {};
function setHTML(id, v) { if (htmlCache[id] !== v) { htmlCache[id] = v; $(id).innerHTML = v; } }
function updateArts() {
  if ($('arts').hidden) return;
  const v = artView(), sig = JSON.stringify(v) + materialLine() + artTab + shelfSort;
  if (sig === artSig) return; artSig = sig;
  $('artMats').textContent = materialLine();
  $('artSum').textContent = pedestalLine();
  setHTML('artTabs', v.map((h) => '<button type="button" class="chip atab' + (h.id === artTab ? ' on' : '') + '" role="tab" aria-selected="' + (h.id === artTab) + '" aria-controls="hall-' + h.id + '" data-tab="' + h.id + '">' + h.name + '</button>').join(''));
  for (const h of v) {
    $('hall-' + h.id).hidden = h.id !== artTab;
    if (h.id !== artTab) continue; // only the hall on show is drawn; the other keeps its gallery and pedestal
    setHTML('hallBlurb-' + h.id, h.blurb);
    if (ARTS.HALLS.find((x) => x.id === h.id).slots) setHTML('equipRow', equipRowHTML());
    const g = gallery(h.id);
    g.setItems(h.items.map((a) => a.id), h.items.map((a) => a.name));
    h.items.forEach((a, k) => g.fill(k, pedestalHTML(a)));
  }
}
function setArtTab(id) { if (!ARTS.HALLS.some((h) => h.id === id)) return false; artTab = id; artSig = ''; updateArts(); return true; }
// the drawn hall as one string (tests): the equip row, then every pedestal
const hallHTML = () => (ARTS.HALLS.find((x) => x.id === artTab).slots ? htmlCache.equipRow || '' : '') + gallery(artTab).html.join('');
/* ----- Gallery: one pedestal at a time with a sliver of each neighbour, moved by a touch or mouse swipe, the arrow buttons, or the
   Left and Right keys (galleryKey). Stops at both ends. The index is the model: the track sits at translateX in % of the view, so no
   layout is read, and the harness can drive it with plain pointer events. Markup: #<id> with <id>Prev, Next, Dots, View, Track, Live. ----- */
const GAL_W = 86, GAL_GAP = 10, GAL_SWIPE = 40; // slide width (% of the view), gap (px), drag (px) that moves one pedestal
const GALS = {}; // one per hall, made on first use; each remembers its pedestal for the session
const gallery = (hallId) => GALS[hallId] || (GALS[hallId] = makeGallery('gal-' + hallId));
function makeGallery(id) {
  const root = $(id), view = $(id + 'View'), track = $(id + 'Track'), prev = $(id + 'Prev'), next = $(id + 'Next'), dots = $(id + 'Dots'), live = $(id + 'Live');
  const g = { id, index: 0, keys: [], names: [], slides: [], html: [], drag: null, swallow: false };
  const place = (dx) => { track.style.transform = 'translateX(calc(' + (100 - GAL_W) / 2 + '% - ' + g.index + ' * (' + GAL_W + '% + ' + GAL_GAP + 'px) + ' + (dx || 0) + 'px))'; };
  g.label = () => (g.keys.length ? g.names[g.index] + ', ' + (g.index + 1) + ' of ' + g.keys.length : '');
  function show(announce) {
    const n = g.keys.length; place(0);
    g.slides.forEach((sl, i) => { const on = i === g.index; sl.classList.toggle('on', on); sl.inert = !on; sl.setAttribute('aria-hidden', String(!on)); });
    prev.disabled = g.index <= 0; next.disabled = g.index >= n - 1;
    dots.innerHTML = g.keys.map((_, i) => (i === g.index ? '<i class="on"></i>' : '<i></i>')).join('');
    if (announce) live.textContent = g.label();
  }
  // moves to pedestal i, clamped to the ends; true if it moved. Focus inside the old pedestal moves to the gallery, never lost.
  g.go = (i) => {
    const j = Math.max(0, Math.min(g.keys.length - 1, i | 0)), old = g.slides[g.index], a = document.activeElement;
    if (j === g.index) { show(false); return false; }
    const had = !!(a && old && old.contains && old.contains(a));
    g.index = j; show(true); if (had && root.focus) root.focus();
    return true;
  };
  g.step = (d) => g.go(g.index + d);
  // the pedestals, by key; rebuilt only when the list changes (the index is kept, clamped)
  g.setItems = (keys, names) => {
    g.names = names;
    if (keys.join() === g.keys.join()) { g.slides.forEach((sl, i) => sl.setAttribute('aria-label', names[i] + ', ' + (i + 1) + ' of ' + keys.length)); return false; }
    g.keys = keys.slice(); g.html = []; track.innerHTML = '';
    g.slides = keys.map((k, i) => { const sl = document.createElement('div'); sl.className = 'galSlide acard'; sl.setAttribute('role', 'group'); sl.setAttribute('aria-roledescription', 'pedestal'); sl.setAttribute('aria-label', names[i] + ', ' + (i + 1) + ' of ' + keys.length); track.appendChild(sl); return sl; });
    g.index = Math.max(0, Math.min(keys.length - 1, g.index)); show(false); return true;
  };
  // a pedestal's content, replaced only when it changed; a focused button inside comes back focused
  g.fill = (i, html) => {
    if (g.html[i] === html) return false;
    const sl = g.slides[i], a = document.activeElement, key = a && sl.contains && sl.contains(a) ? focusKey(a) : null;
    g.html[i] = html; sl.innerHTML = html;
    if (key && sl.querySelector) { const t = sl.querySelector(key); if (t && t.focus) t.focus(); }
    return true;
  };
  prev.addEventListener('click', () => { Snd.click(); g.step(-1); });
  next.addEventListener('click', () => { Snd.click(); g.step(1); });
  // swipes: a horizontal drag past 10 px takes over (vertical ones are left to the page), past GAL_SWIPE it moves one pedestal;
  // past an end it only stretches a little. The click that ends a drag never presses a button.
  view.addEventListener('pointerdown', (e) => { if (e.button > 0 || g.drag) return; g.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, on: false }; });
  view.addEventListener('pointermove', (e) => {
    const d = g.drag; if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { g.drag = null; return; }
      if (Math.abs(dx) < 10) return;
      d.on = true; root.classList.add('dragging'); try { if (view.setPointerCapture) view.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
    }
    const atEnd = (dx > 0 && g.index === 0) || (dx < 0 && g.index === g.keys.length - 1);
    d.dx = atEnd ? dx * 0.25 : dx; place(d.dx);
  });
  const end = (e, cancel) => {
    const d = g.drag; if (!d || e.pointerId !== d.id) return;
    g.drag = null; if (!d.on) return;
    root.classList.remove('dragging'); g.swallow = true; setTimeout(() => { g.swallow = false; }, 0);
    if (cancel || Math.abs(d.dx) < GAL_SWIPE || !g.step(d.dx < 0 ? 1 : -1)) show(false);
  };
  view.addEventListener('pointerup', (e) => end(e, false));
  view.addEventListener('pointercancel', (e) => end(e, true));
  view.addEventListener('click', (e) => {
    if (g.swallow) { g.swallow = false; if (e.stopPropagation) e.stopPropagation(); if (e.preventDefault) e.preventDefault(); return; }
    // a tap on a neighbour's sliver (outside the pedestal on show) moves to that side
    const cur = g.slides[g.index]; if (!cur || !e.target || (cur.contains && cur.contains(e.target)) || !view.getBoundingClientRect) return;
    const r = view.getBoundingClientRect(); g.step(e.clientX < r.left + r.width / 2 ? -1 : 1);
  }, true);
  return g;
}
// a selector for the same button after a redraw: its data attributes
const focusKey = (el) => { const d = el.dataset || {}, ks = Object.keys(d); return ks.length ? ks.map((k) => '[data-' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()) + '="' + d[k] + '"]').join('') : null; };
// Left and Right move the hall on show while the Artifacts panel is open, no dialog is up and no text field has focus
function galleryKey(e) {
  if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || $('arts').hidden || cf || rv || ch) return false;
  const a = document.activeElement, tag = a && a.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (a && a.isContentEditable)) return false;
  if (e.preventDefault) e.preventDefault();
  gallery(artTab).step(e.key === 'ArrowRight' ? 1 : -1); return true;
}
document.addEventListener('keydown', galleryKey);
// crafts a copy (rng is for tests; the game rolls with Math.random), shows the reveal and returns the copy, or null
function craftArtifact(id, rng) {
  const prev = ARTS.activeCopy(state.artifacts, id);
  const c = collapse ? null : ARTS.craft(id, state.inv, state.artifacts, state.invV, state.forge.stock, rng);
  if (!c) return null;
  state.stats.crafts++;
  ARTS.equip(state.artEquip, state.artifacts, id); // a relic takes a free slot by itself; with all slots full it waits unequipped
  recalc(); Snd.chime(rarityRank(c.rarity)); addShake(1 + rarityRank(c.rarity) * 0.6);
  openReveal(id, c, prev);
  artSig = ''; forgeSig = ''; updateArts(); updateForge(); updatePack(); checkAch(); updateHud(0.016); save(); return c;
}
// equip slots (relics): each changes state.artEquip through ARTS and returns whether it did; the gallery's equip row will call them
function equipChanged(ok) { if (ok) { recalc(); artSig = ''; forgeSig = ''; updateArts(); updateForge(); updateHud(0.016); save(); } return ok; }
const equipArt = (id) => equipChanged(ARTS.equip(state.artEquip, state.artifacts, id));
const unequipArt = (id) => equipChanged(ARTS.unequip(state.artEquip, id));
const swapArt = (outId, inId) => equipChanged(ARTS.swap(state.artEquip, state.artifacts, outId, inId));
// Equip on a relic's pedestal: the first free slot, or with every slot full a chooser of the equipped relics to swap out
function equipFromHall(id) {
  const a = ARTS.byId(id);
  if (!a || !ARTS.usesSlot(id) || !ARTS.activeCopy(state.artifacts, id) || ARTS.isEquipped(state.artEquip, id)) return false;
  if (state.artEquip.length < ARTS.EQUIP_SLOTS) { if (!equipArt(id)) return false; toast(a.name + ' equipped in slot ' + (state.artEquip.indexOf(id) + 1)); return true; }
  return openChooser('All ' + ARTS.EQUIP_SLOTS + ' slots are full', 'Choose a relic to take out. ' + a.name + ' takes its slot, and the one you take out has no effect until you equip it again.',
    state.artEquip.map((x, i) => ({ id: x, label: ARTS.byId(x).name, sub: 'Slot ' + (i + 1), icon: ART_ICON[x] || '' })),
    (out) => { const k = state.artEquip.indexOf(out); if (!swapArt(out, id)) return false; toast(a.name + ' equipped in slot ' + (k + 1) + ', ' + ARTS.byId(out).name + ' taken out'); return true; });
}
// a tap on a filled slot offers Unequip
function slotTap(id) {
  const a = ARTS.byId(id), i = state.artEquip.indexOf(id); if (!a || i < 0) return false;
  return openConfirm('Unequip ' + a.name + '?', 'It leaves slot ' + (i + 1) + ' and has no effect until you equip it again.', 'Unequip', () => { if (!unequipArt(id)) return false; toast(a.name + ' unequipped'); return true; });
}
// puts an owned copy on its artifact's pedestal (the swap is free)
function setActiveCopy(id, copyId) {
  if (!ARTS.setActive(state.artifacts, id, copyId)) return false;
  recalc(); artSig = ''; forgeSig = ''; updateArts(); updateForge(); updateHud(0.016); save(); return true;
}
// scraps shelf copies of one artifact and refunds floor(REFUND_SHARE x what each cost): Rose Pearls back into the backpack, where
// auto-sell never reaches them (it only sells new pops), alloys back into the forge stock. Returns the refund lines, or null.
function scrapCopies(id, copyIds) {
  const got = []; let n = 0;
  for (const cid of copyIds) {
    const before = Object.assign({}, state.inv), back = ARTS.scrap(state.artifacts, id, cid, state.inv, state.forge.stock);
    if (!back) continue;
    n++; got.push(...back);
    for (const x of back) if (!ARTS.isMat(x) && x.qty > 0) { // refunded pearls carry the stack's average value, or a fresh pop's value
      const h = before[x.kind] || 0; state.invV[x.kind] = (state.invV[x.kind] || 0) + x.qty * (h > 0 ? (state.invV[x.kind] || 0) / h : ECON.popValue(S, 0, false, x.kind));
    }
  }
  if (!n) return null;
  const t = refundText(got);
  toast('Scrapped ' + n + ' ' + ARTS.byId(id).name + (n === 1 ? ' copy' : ' copies') + (t ? ': ' + t : ' (no refund)'));
  Snd.sell(n); artSig = ''; forgeSig = ''; recalc(); updateArts(); updateForge(); updatePack(); save(); return got;
}
function setCopyLock(id, copyIds, on) { let k = 0; for (const c of copyIds) if (ARTS.setLocked(state.artifacts, id, c, on)) k++; if (k) { artSig = ''; updateArts(); save(); } return k > 0; }
const copyOf = (id, cid) => (state.artifacts[id] ? state.artifacts[id].copies.find((c) => c.id === cid) : null);
const stackIds = (id) => { const act = ARTS.activeCopy(state.artifacts, id); return state.artifacts[id].copies.filter((c) => c !== act && c.rarity === ARTS.RARITIES[0].id).sort((x, y) => y.id - x.id); };
// one shelf action: place, lock, scrap or scrapall, on a copy id or the Common stack ('stack'); Epic and up, and every multi-copy scrap, ask first
function shelfAction(act, id, key) {
  if (!state.artifacts[id]) return false;
  const a = ARTS.byId(id), stack = key === 'stack', c = stack ? null : copyOf(id, +key);
  if (!stack && !c) return false;
  const commons = stack ? stackIds(id) : [], open = commons.filter((x) => !x.locked);
  if (act === 'place') { const t = stack ? commons[0] : c; if (!t || !setActiveCopy(id, t.id)) return false; toast(a.name + ' (' + ARTS.rarityById(t.rarity).name + ') is on your pedestal'); return true; }
  if (act === 'lock') return stack ? setCopyLock(id, commons.map((x) => x.id), open.length > 0) : setCopyLock(id, [c.id], !c.locked);
  if (act === 'scrap' && stack) return open.length ? !!scrapCopies(id, [open[0].id]) : false;
  if (act === 'scrap') {
    if (ARTS.scrapBlock(state.artifacts, id, c.id)) return false;
    if (rarityRank(c.rarity) < 2) return !!scrapCopies(id, [c.id]);
    const back = refundText(ARTS.refundOf(c));
    openConfirm('Scrap this ' + ARTS.rarityById(c.rarity).name + ' ' + a.name + '?', 'It has ' + (c.perks.length ? c.perks.map((x) => perkText(x, a)).join(', ') : 'no perks') + '. You get ' + (back || 'nothing') + ' back. This cannot be undone.', 'Scrap it', () => scrapCopies(id, [c.id]));
    return true;
  }
  if (act === 'scrapall' && stack && open.length) {
    const back = refundText(refundLines(open));
    openConfirm('Scrap ' + open.length + ' Common ' + a.name + ' copies?', 'You get ' + (back || 'nothing') + ' back. Locked copies stay. This cannot be undone.', 'Scrap ' + open.length, () => scrapCopies(id, open.map((x) => x.id)));
    return true;
  }
  return false;
}
// the bulk action: every unlocked shelf copy below the pedestal copy's rarity, after a confirmation that names the count and the refund
function bulkScrap(id) {
  const t = bulkTargets(id); if (!t.length) return false;
  const act = ARTS.activeCopy(state.artifacts, id), back = refundText(refundLines(t));
  openConfirm('Scrap ' + t.length + (t.length === 1 ? ' copy' : ' copies') + ' below ' + ARTS.rarityById(act.rarity).name + '?',
    t.length + ' unlocked ' + ARTS.byId(id).name + (t.length === 1 ? ' copy goes' : ' copies go') + ' for ' + (back || 'no refund') + '. Locked copies and the one on the pedestal stay. This cannot be undone.', 'Scrap ' + t.length, () => scrapCopies(id, t.map((c) => c.id)));
  return true;
}
$('artHalls').addEventListener('click', (e) => {
  const at = (sel) => e.target.closest && e.target.closest(sel);
  const so = at('[data-sort]'); if (so) { Snd.click(); shelfSort = so.dataset.sort; artSig = ''; updateArts(); return; }
  const bk = at('[data-bulk]'); if (bk) { Snd.click(); bulkScrap(bk.dataset.bulk); return; }
  const sa = at('[data-sact]'); if (sa) { if (sa.disabled) return; Snd.click(); shelfAction(sa.dataset.sact, sa.dataset.art, sa.dataset.copy); return; }
  const k = at('[data-akeep]'); if (k) { Snd.click(); setKeep(k.dataset.akeep, !state.keep[k.dataset.akeep]); return; }
  const q = at('[data-equip]'); if (q) { Snd.click(); equipFromHall(q.dataset.equip); return; }
  const sl = at('[data-eslot]'); if (sl) { Snd.click(); slotTap(sl.dataset.eslot); return; }
  const b = at('[data-craft]'); if (b && !b.disabled) { Snd.resume(); craftArtifact(b.dataset.craft); }
});
/* ----- in-page chooser (never a browser dialog): a list of options and Cancel; focus starts on Cancel and stays inside;
   Escape or a tap outside cancels; focus returns where it was, or to the gallery if that button was redrawn ----- */
let ch = null;
function openChooser(title, text, opts, onPick) {
  ch = { onPick, back: document.activeElement || null, ids: opts.map((o) => o.id) };
  $('chTitle').textContent = title; $('chText').textContent = text;
  $('chList').innerHTML = opts.map((o) => '<button type="button" class="chip chOpt" data-ch="pick" data-id="' + o.id + '">' + o.icon + '<span><b>' + o.label + '</b><small>' + o.sub + '</small></span></button>').join('');
  $('chooser').hidden = false; if ($('chCancel').focus) $('chCancel').focus(); return true;
}
function closeChooser(pick) {
  if (!ch) return null;
  const c = ch; ch = null; $('chooser').hidden = true;
  const r = pick != null && c.ids.includes(pick) ? c.onPick(pick) : null;
  const back = c.back && c.back.focus && c.back.isConnected !== false ? c.back : $('gal-' + artTab);
  if (back && back.focus) back.focus(); return r;
}
$('chooser').addEventListener('click', (e) => {
  const b = e.target && e.target.closest && e.target.closest('[data-ch]');
  if (b) { Snd.click(); closeChooser(b.dataset.ch === 'pick' ? b.dataset.id : null); return; }
  if (!(e.target && e.target.closest && e.target.closest('.cfBox'))) closeChooser(null); // a tap on the backdrop cancels
});
$('chooser').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (e.stopPropagation) e.stopPropagation(); if (e.preventDefault) e.preventDefault(); closeChooser(null); return; }
  if (e.key !== 'Tab') return;
  const list = ($('chList').querySelectorAll ? [...$('chList').querySelectorAll('button')] : []).concat([$('chCancel')]), n = list.length, i = list.indexOf(document.activeElement);
  if (e.preventDefault) e.preventDefault();
  const nx = list[((i < 0 ? (e.shiftKey ? 0 : -1) : i) + (e.shiftKey ? -1 : 1) + n) % n]; if (nx && nx.focus) nx.focus();
});
/* ----- in-page confirmation (never a browser dialog): focus starts on Cancel and stays inside; Escape or a tap outside cancels ----- */
let cf = null;
function openConfirm(title, text, okText, onOk) {
  cf = { onOk, back: document.activeElement || null };
  $('cfTitle').textContent = title; $('cfText').textContent = text; $('cfOk').textContent = okText;
  $('confirm').hidden = false; if ($('cfCancel').focus) $('cfCancel').focus(); return true;
}
function closeConfirm(ok) {
  if (!cf) return null;
  const c = cf; cf = null; $('confirm').hidden = true;
  const r = ok ? c.onOk() : null;
  if (c.back && c.back.focus && c.back.isConnected !== false) c.back.focus(); return r;
}
$('confirm').addEventListener('click', (e) => {
  const b = e.target && e.target.closest && e.target.closest('[data-cf]');
  if (b) { Snd.click(); closeConfirm(b.dataset.cf === 'ok'); return; }
  if (!(e.target && e.target.closest && e.target.closest('.cfBox'))) closeConfirm(false); // a tap on the backdrop cancels
});
$('confirm').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (e.stopPropagation) e.stopPropagation(); if (e.preventDefault) e.preventDefault(); closeConfirm(false); return; }
  if (e.key !== 'Tab') return;
  const list = [$('cfCancel'), $('cfOk')], i = list.indexOf(document.activeElement);
  if (e.preventDefault) e.preventDefault();
  const next = list[((i < 0 ? (e.shiftKey ? 0 : -1) : i) + (e.shiftKey ? -1 : 1) + 2) % 2]; if (next && next.focus) next.focus();
});
$('artTabs').addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-tab]'); if (b) { Snd.click(); setArtTab(b.dataset.tab); } });

/* ----- the roll reveal: a full-screen card after every craft; perks appear one by one, a tap skips, Escape keeps it on the shelf ----- */
const REVEAL_PARTS = [8, 16, 28, 44]; // particles by rarity rank (Common .. Mythic); calm (reduced motion) shows none
const REVEAL_FIRST = 0.7, REVEAL_GAP = 0.55; // seconds to the first perk, then between perks
let rv = null, rvFocus = null;
function revealView() {
  if (!rv) return null;
  const a = ARTS.byId(rv.id), c = rv.c, diff = statDiff(a, rv.prev, c);
  return {
    art: a.name, rarity: c.rarity, rarityName: ARTS.rarityById(c.rarity).name, first: rv.first, done: rv.done,
    perks: c.perks.map((p) => perkText(p, a)), shown: rv.shown,
    compare: rv.first ? 'Placed on your pedestal: ' + a.description
      : diff.length ? diff.map((d) => statName(d.stat, a) + ' ' + statTxt(d.stat, d.to) + ' vs your current ' + statTxt(d.stat, d.from)).join('; ') : 'The same stats as the copy on your pedestal',
  };
}
function paintReveal() {
  const v = revealView(), el = $('reveal'); if (!v) return;
  ARTS.RARITIES.forEach((r) => el.classList.toggle('r-' + r.id, r.id === v.rarity));
  el.classList.toggle('done', v.done);
  $('rvPerks').innerHTML = v.perks.length ? v.perks.slice(0, v.shown).map((t) => '<li>' + t + '</li>').join('') : '<li class="none">No perks</li>';
  $('rvCmp').textContent = v.done ? v.compare : '';
  $('rvSkip').hidden = v.done;
}
function openReveal(id, c, prev) {
  const first = ARTS.count(state.artifacts, id) === 1, a = ARTS.byId(id), n = c.perks.length;
  rv = { id, c, prev, first, t: 0, shown: calm ? n : 0, done: calm || n === 0 };
  const el = $('reveal'), k = rarityRank(c.rarity), parts = fxOff() ? 0 : REVEAL_PARTS[Math.min(k, REVEAL_PARTS.length - 1)];
  $('rvIcon').innerHTML = ART_ICON[id] || '';
  $('rvName').textContent = a.name;
  $('rvRar').textContent = ARTS.rarityById(c.rarity).name;
  // particles on fixed angles (no Math.random, so a seeded roll in a test stays the only draw); at most 145 px out, inside the card
  $('rvParts').innerHTML = Array.from({ length: parts }, (_, i) => '<i style="--a:' + Math.round(i * 137.5) % 360 + 'deg;--d:' + (50 + (i * 37) % 60 + k * 12) + 'px;--t:' + (i * 23) % 400 + 'ms"></i>').join('');
  $('rvPlace').hidden = first; $('rvKeep').textContent = first ? 'Nice!' : 'Keep on shelf';
  if (el.hidden) rvFocus = document.activeElement || null;
  el.hidden = false; paintReveal();
  const f = first ? $('rvKeep') : $('rvPlace'); if (f.focus) f.focus();
}
// the main loop advances the perks one by one
function revealTick(dt) {
  if (!rv || rv.done) return;
  rv.t += dt;
  const n = rv.c.perks.length, shown = Math.min(n, rv.t < REVEAL_FIRST ? 0 : 1 + Math.floor((rv.t - REVEAL_FIRST) / REVEAL_GAP));
  if (shown === rv.shown) return;
  rv.shown = shown; rv.done = shown >= n; Snd.tick(); paintReveal(); // repaint only on a change, so each perk animates in once
}
function skipReveal() { if (!rv || rv.done) return false; rv.shown = rv.c.perks.length; rv.done = true; $('reveal').classList.add('skip'); paintReveal(); return true; }
function closeReveal() {
  if (!rv) return false;
  rv = null; const el = $('reveal'); el.hidden = true; el.classList.remove('skip'); $('rvParts').innerHTML = '';
  if (rvFocus && rvFocus.focus) rvFocus.focus(); rvFocus = null; return true;
}
function placeFromReveal() {
  if (!rv) return false;
  const id = rv.id, c = rv.c; closeReveal();
  if (!setActiveCopy(id, c.id)) return false;
  toast(ARTS.byId(id).name + ' (' + ARTS.rarityById(c.rarity).name + ') is on your pedestal'); return true;
}
$('reveal').addEventListener('click', (e) => {
  const b = e.target && e.target.closest && e.target.closest('[data-rv]');
  if (b) { Snd.click(); if (b.dataset.rv === 'place') placeFromReveal(); else closeReveal(); return; }
  if (!skipReveal()) closeReveal(); // a tap skips the animation, the next one closes (the copy stays on the shelf)
});
// focus stays inside the reveal; Escape closes it and nothing behind it
$('reveal').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (e.stopPropagation) e.stopPropagation(); if (e.preventDefault) e.preventDefault(); closeReveal(); return; }
  if (e.key !== 'Tab') return;
  const list = [$('rvPlace'), $('rvKeep')].filter((b) => !b.hidden);
  const i = list.indexOf(document.activeElement), n = list.length;
  if (e.preventDefault) e.preventDefault();
  const next = list[((i < 0 ? (e.shiftKey ? 0 : -1) : i) + (e.shiftKey ? -1 : 1) + n) % n]; if (next && next.focus) next.focus();
});
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { Snd.click(); $(b.dataset.close).hidden = true; $(PANEL_BTN[b.dataset.close]).setAttribute('aria-expanded', 'false'); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ch) { closeChooser(null); return; } if (e.key === 'Escape' && cf) { closeConfirm(false); return; } if (e.key === 'Escape' && rv) { closeReveal(); return; } if (e.key === 'Escape') Object.keys(PANEL_BTN).forEach((p) => { $(p).hidden = true; $(PANEL_BTN[p]).setAttribute('aria-expanded', 'false'); }); });
const resetTools = () => { state.owned = [true, false, false, false, false, false]; state.equip = -1; state.toolUp = {}; toolView = 0; };
const zeroInv = () => { INV_IDS.forEach((id) => { state.inv[id] = 0; state.invV[id] = 0; }); };
const clearUnkept = () => { INV_IDS.forEach((id) => { if (!isKept(id)) { state.inv[id] = 0; state.invV[id] = 0; } }); }; // Fresh Batch
const multTxt = (m) => 'x' + +m.toFixed(2);
// how many type ducks pay right now (each on its own pearl type only)
const typeDuckCount = () => ARTS.ARTIFACTS.filter((a) => a.bonus.scope && ARTS.applies(a, state.artifacts, state.artEquip)).length;
// the payout multiplier line under the juice counter: Flavors and global artifacts, then "+ 3 type ducks" (they pay on one type each,
// so pop values differ by type). It is a button that opens the Hall of Ducks.
// Achievements add one more global part ("achievements x1.12").
const achTxt = (m) => 'x' + +m.toFixed(3); // +0.5% steps: x1.005, x1.065
function payoutLine() {
  const e = state.echoes, a = S.artMult, c = S.achMult || 1, n = typeDuckCount(), more = n ? ' + ' + n + ' type duck' + (n === 1 ? '' : 's') : '';
  if (c > 1) return 'Payouts ' + achTxt(S.echoMult * a * c) + ' (' + (e > 0 ? ['Flavors ' + e + ' ' + multTxt(S.echoMult)] : []).concat(a > 1 ? ['artifacts ' + multTxt(a)] : [], ['achievements ' + achTxt(c)]).join(', ') + ')' + more;
  if (a <= 1) return e > 0 ? 'Flavors ' + e + ' (payouts ' + multTxt(S.echoMult) + ')' + more : n ? 'Payouts ' + multTxt(1) + more : '';
  return 'Payouts ' + multTxt(S.echoMult * a) + ' (' + (e > 0 ? 'Flavors ' + e + ' ' + multTxt(S.echoMult) + ', ' : '') + 'artifacts ' + multTxt(a) + ')' + more;
}
function openDucksFromPayout() { if ($('artBtn').hidden) return false; if ($('arts').hidden) openPanel('arts'); setArtTab('ducks'); return true; }
$('echoes').addEventListener('click', openDucksFromPayout);


/* ----- pool menu: choose which discovered pearl types spawn, with the resulting chances shown live ----- */
const pctText = (p) => (p >= 0.995 ? '100%' : p <= 0 ? '0%' : p < 0.001 ? '<0.1%' : (p * 100).toFixed(1) + '%');
function poolView() {
  const ch = ECON.poolChances(state.pool, state.lv), eff = ECON.effectivePool(state.pool, state.lv);
  return {
    rows: ECON.PEARLS.filter((t) => state.col[t.id].found).map((t) => {
      const i = ECON.PEARLS.indexOf(t), nx = ECON.PEARLS[i + 1], locked = !ECON.canToggleOff(t.id, state.lv);
      return { id: t.id, name: t.name, unlocked: ECON.isUnlocked(t.id, state.lv), inPool: eff.includes(t.id), locked, need: locked ? META[ECON.unlockUpg(nx.id)].name : '', p: ch[t.id] || 0, pay: 'x' + fmtX(t.mult) + ' payout' };
    }),
    shinyOn: state.shinyOn, shiny: ECON.shinyChance(state.lv, S.shinyBonus),
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
    '<div class="prow' + (r.inPool ? '' : ' off') + (r.locked ? ' lk' : '') + '"><canvas width="128" height="128" data-art="' + r.id + '"></canvas><span class="nm">' + r.name + '</span><small class="pay">' + r.pay + '</small>' +
    '<b class="pc">' + (r.p > 0 ? pctText(r.p) : '&nbsp;') + '</b>' +
    '<button type="button" class="chip tgl" data-id="' + r.id + '">' + (r.locked ? 'Locked in' : r.inPool ? 'In pool' : 'Add') + '</button>' +
    '<small class="why">' + (r.locked ? 'Max out ' + r.need + ' to switch off' : !r.unlocked ? 'Buy its unlock again to spawn it' : '&nbsp;') + '</small></div>').join('');
  document.querySelectorAll('#poolList canvas').forEach((cv) => { cv.getContext('2d').drawImage(bigSprite(cv.dataset.art), -10, -10, 148, 148); });
  setLbl('shinyBtn', v.shinyOn ? 'On' : 'Off'); $('shinyBtn').classList.toggle('on', v.shinyOn); setLbl('shinyPct', pctText(v.shiny) + ' per pearl, pays ' + ECON.SHINY_MULT + 'x');
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
    (e.found ? '<p>Hits to pop: <b>' + e.hp + '</b></p><p>Payout: <b>x' + fmtX(e.mult) + '</b></p><p>Popped: <b>' + fmt(e.popped) + '</b></p>' : '<p class="dim">Not discovered yet</p>') + '</div>';
}
function updateBook() {
  if ($('book').hidden) return;
  if (bookTab === 'ach') { updateAch(); return; }
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
  const b = $('bk'); b.classList.remove('open'); bookSig = ''; paintBookTab();
  setTimeout(() => b.classList.add('open'), 60); // the cover swings open
}
$('bkPrev').addEventListener('click', () => turnBook(-1));
$('bkNext').addEventListener('click', () => turnBook(1));
document.addEventListener('keydown', (e) => { if (!$('book').hidden && bookTab === 'pearls') { if (e.key === 'ArrowLeft') turnBook(-1); else if (e.key === 'ArrowRight') turnBook(1); } });

/* ----- achievements (src/achievements.js): granted once a second and after a Fresh Batch, a craft or a forge job, announced in the
   toast with a short chime; on load, what the save already earns is granted silently with one toast. The earned list only grows. ----- */
const ACH_CHECK_SECS = 1;
const achPct = () => '+' + +(ACH.bonus(state.achieved) * 100).toFixed(1) + '%';
// grants every achievement the state earns that is not granted yet; returns the new ids. silent: no toast and no chime
function checkAch(silent) {
  const have = new Set(state.achieved), fresh = ACH.earned(state).filter((id) => !have.has(id));
  if (!fresh.length) return fresh;
  const first = !state.achieved.length;
  state.achieved = state.achieved.concat(fresh); recalc(); syncDock(); // the book shows before the toast that points at it
  if (silent) return fresh;
  Snd.achieve(fxOff());
  if (fresh.length <= 2) fresh.forEach((id) => toast('Achievement: ' + ACH.byId(id).name + '! Payouts ' + achPct() + ' from achievements'));
  else toast(fresh.length + ' achievements: ' + fresh.slice(0, 2).map((id) => ACH.byId(id).name).join(', ') + ' and more. Payouts ' + achPct() + ' from achievements');
  if (first) toast('Your achievements are in the Collection book');
  return fresh;
}
// after a load: what the player's history already earns, granted at once, with one toast
function grantHistory() {
  const n = checkAch(true).length;
  if (n) toast((n === 1 ? '1 achievement' : n + ' achievements') + ' from your history: payouts ' + achPct() + '. See the Collection book.');
  return n;
}
let bookTab = 'pearls', achCat = ACH.CATEGORIES[0].id; // the book's tab and the achievement category on show, for the page session
function setBookTab(t) { if (t !== 'pearls' && t !== 'ach') return false; bookTab = t; paintBookTab(); return true; }
function setAchCat(id) { if (!ACH.CATEGORIES.some((c) => c.id === id)) return false; achCat = id; updateAch(); return true; }
function paintBookTab() {
  const ach = bookTab === 'ach';
  $('bkWrap').hidden = ach; $('achView').hidden = !ach; $('book').classList.toggle('ach', ach);
  for (const [id, on] of [['bkTabPearls', !ach], ['bkTabAch', ach]]) { $(id).classList.toggle('on', on); $(id).setAttribute('aria-selected', String(on)); }
  if (ach) updateAch(); else { bookSig = ''; updateBook(); }
}
// the Achievements tab: the summary, the categories with their counts, and each ladder of the category on show: every granted tier,
// then only the next one (with its progress), then "???" for the rest
function achBookView() {
  const got = new Set(state.achieved), v = ACH.view(state), list = ACH.ACHIEVEMENTS;
  const cats = ACH.CATEGORIES.map((c) => { const xs = list.filter((a) => a.category === c.id); return { id: c.id, name: c.name, have: xs.filter((a) => got.has(a.id)).length, total: xs.length }; });
  const ladders = ACH.LADDERS.filter((L) => L.cat === achCat).map((L) => {
    let next = false; const xs = list.filter((a) => a.ladder === L.id);
    const tiers = xs.map((a) => {
      if (got.has(a.id)) return { id: a.id, state: 'done', name: a.name, desc: a.description, reward: a.reward };
      if (next) return { id: a.id, state: 'hidden' };
      next = true; const p = a.progress(v);
      return { id: a.id, state: 'next', name: a.name, desc: a.description, reward: a.reward, have: p.have, need: p.need, frac: p.need > 0 ? Math.min(1, p.have / p.need) : 0, lower: a.lower, best: p.best };
    });
    return { id: L.id, name: L.name, have: xs.filter((a) => got.has(a.id)).length, total: xs.length, tiers };
  });
  const have = list.filter((a) => got.has(a.id)).length, bonus = ACH.bonus(state.achieved);
  return { have, total: list.length, bonus, cat: achCat, cats, ladders };
}
const rewardTxt = (r) => '+' + +(r * 100).toFixed(1) + '%';
function achTierHTML(t) {
  if (t.state === 'hidden') return '<div class="achT hid"><span class="ic" aria-hidden="true">?</span><b>???</b></div>';
  const head = '<span class="ic" aria-hidden="true">' + (t.state === 'done' ? '✓' : '○') + '</span><b>' + t.name + (t.state === 'done' ? '<span class="vh"> (achieved)</span>' : '') + '</b><span class="rw">' + rewardTxt(t.reward) + '</span><span class="ds">' + t.desc + '</span>';
  if (t.state === 'done') return '<div class="achT done">' + head + '</div>';
  const pct = Math.floor(t.frac * 100 + 1e-9), txt = t.lower ? (t.best ? 'Best run ' + durTxt(Math.floor(t.best)) : 'No timed run yet') : fmt(t.have) + ' / ' + fmt(t.need);
  return '<div class="achT next">' + head + '<div class="achBar" role="progressbar" aria-label="' + t.name + ' progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="transform:scaleX(' + t.frac.toFixed(3) + ')"></i></div><small class="pg2">' + txt + '</small></div>';
}
function updateAch() {
  if ($('book').hidden || bookTab !== 'ach') return;
  const v = achBookView();
  setLbl('achSum', v.have + ' of ' + v.total + ' · payouts ' + rewardTxt(v.bonus));
  setHTML('achCats', v.cats.map((c) => '<button type="button" class="chip atab' + (c.id === v.cat ? ' on' : '') + '" aria-pressed="' + (c.id === v.cat) + '" data-acat="' + c.id + '">' + c.name + ' <small>' + c.have + '/' + c.total + '</small></button>').join(''));
  setHTML('achList', v.ladders.map((L) => '<div class="achLad"><h4>' + L.name + '<small>' + L.have + ' of ' + L.total + '</small></h4>' + L.tiers.map(achTierHTML).join('') + '</div>').join(''));
}
$('achCats').addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-acat]'); if (b) { Snd.click(); setAchCat(b.dataset.acat); } });
document.querySelectorAll('[data-btab]').forEach((b) => b.addEventListener('click', () => { Snd.click(); setBookTab(b.dataset.btab); }));

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
  $('uUp').addEventListener('click', () => upTool('u'));
  $('tAct').addEventListener('click', () => { Snd.resume(); const i = toolView; if (state.owned[i]) equipTool(i); else buyTool(i); });
  document.addEventListener('keydown', (e) => { if ($('tools').hidden) return; if (e.key === 'ArrowLeft') stepTool(-1); else if (e.key === 'ArrowRight') stepTool(1); });
}
function stepTool(dir) {
  const n = ECON.TOOLS.length; toolView = (toolView + dir + n) % n; spinKick = 9; Snd.click(); updateToolPanel();
}
const toolUp = (i) => state.toolUp[i] || (state.toolUp[i] = { p: 0, s: 0, u: 0 });
// price and cap of one tool upgrade: power and speed share TOOL_UP_MAX, the unique one is priced by the tool's own definition
function toolUpgrade(i, kind, lvl) {
  if (kind === 'u') { const un = ECON.TOOLS[i].unique; return un ? { max: un.max, cost: ECON.uniqueCost(i, lvl) } : null; }
  return { max: ECON.TOOL_UP_MAX, cost: ECON.toolUpCost(i, kind === 'p' ? 'power' : 'speed', lvl) };
}
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
  const i = toolView, u = toolUp(i), lvl = u[kind] | 0, up = toolUpgrade(i, kind, lvl);
  if (collapse || !up || !state.owned[i] || lvl >= up.max || state.sparks < up.cost) return;
  state.sparks -= up.cost; u[kind] = lvl + 1; recalc(); Snd.buy(u[kind] + 1);
  if (kind === 'u' && lvl === 0) toast(ECON.TOOLS[i].unique.name + '! ' + ECON.TOOLS[i].unique.desc + (state.equip >= 0 && state.equip !== i ? ' (with the ' + ECON.TOOLS[i].name + ' in hand)' : ''));
  updateShelf(); updateToolPanel(); save();
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
  // the tool's own upgrade, read from its definition; tools without one show a muted line
  const un = t.unique; $('uRow').hidden = !un; $('uNone').hidden = !!un;
  if (un) {
    const lvl = u.u | 0, max = lvl >= un.max, c = ECON.uniqueCost(i, Math.min(lvl, un.max - 1));
    setLbl('uName', un.name); setLbl('uDesc', un.desc); setLbl('uLv', 'Level ' + lvl + '/' + un.max);
    setLbl('uUp', !owned ? 'Buy tool first' : max ? 'Maxed' : 'Upgrade ' + fmt(c));
    $('uUp').classList.toggle('can', owned && !max && state.sparks >= c);
  }
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
  if (!ECON.collapseReady(state.runEarned, state.echoes, state.flavorJuice) || collapse) return;
  if (!armed) {
    armed = true; $('collapseBtn').textContent = 'Click again to confirm';
    clearTimeout(armTimer); armTimer = setTimeout(() => { armed = false; updateShelf(); }, 3500); return;
  }
  armed = false; clearTimeout(armTimer);
  collapse = { t: 0, dur: 1.9, gain: ECON.collapseGain(state.runEarned, state.echoes, state.flavorJuice) };
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
  const gain = collapse.gain, sx = state.stats; collapse = null;
  if (gain > sx.bestGain) sx.bestGain = gain;
  if (sx.runSecs > 0 && (!sx.fastest || sx.runSecs < sx.fastest)) sx.fastest = sx.runSecs;
  sx.runSecs = 0; // the next run is timed from the start
  state.echoes += gain; state.collapses += 1; state.sparks = 0; state.runEarned = 0; state.lv = ECON.zeroLevels(); clearUnkept(); resetTools(); // kept stacks and artifacts survive
  resetRun();
  toast('Yum! Flavors +' + gain + '. Everything pays ' + multTxt(S.echoMult * S.artMult * S.achMult) + ' now'); updateShelf(); forgeSig = ''; updateForge(); checkAch(); save();
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
      p.lastSweep = time; swing(); // the tool strikes for every pearl the player hits, never for helper pops
      hitPearl(p, Math.max(1, Math.round(S.power * 0.5)), 'sweep');
    }
  }
}
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault(); Snd.resume();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
  const q = ptr(e); pointer.x = q[0]; pointer.y = q[1]; pointer.down = true; pointer.has = true; pointer.touch = e.pointerType === 'touch'; pointer.last = time;
  if (collapse) return;
  state.stats.taps++;
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
const KEY = 'poppit.v1'; // never rename: every existing save lives under this key; the format version is inside the JSON
const BACKUP_KEY = 'poppit.backup'; // the save that the last import replaced, or a stored save that could not be read, for Restore previous save
const UNREADABLE_KEY = 'poppit.unreadable'; // an unreadable stored save, when BACKUP_KEY already holds a good one
let saveBlocked = false; // the stored save is from a newer Poppit: it was not loaded, so it must not be overwritten
function serialize() { return { sparks: state.sparks, runEarned: state.runEarned, lifetime: state.lifetime, flavorJuice: state.flavorJuice, achieved: state.achieved, lv: state.lv, echoes: state.echoes, collapses: state.collapses, muted: state.muted, musicOn: state.musicOn, musicVol: state.musicVol, autoSell: state.autoSell, owned: state.owned, equip: state.equip, toolUp: state.toolUp, inv: state.inv, invV: state.invV, seen: state.seen, version: SAVE_VERSION, pool: state.pool, shinyOn: state.shinyOn, col: state.col, artifacts: state.artifacts, artEquip: state.artEquip, keep: state.keep, stats: state.stats, reduceFx: state.reduceFx, forge: FORGE.toSave(state.forge, Date.now()), t: Date.now() }; }
function save() { if (saveBlocked) return; try { localStorage.setItem(KEY, JSON.stringify(serialize())); } catch (e) { /* storage may be unavailable */ } }
function readSaveRaw() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
function readSave() { const s = readSaveRaw(); if (!s) return null; try { return JSON.parse(s); } catch (e) { return null; } }
const parsesToObject = (text) => { try { return isObj(JSON.parse(text)); } catch (e) { return false; } };
// Boot: load the stored save. One that is not JSON, or not a save, is still the player's data: keep its raw text for
// Restore before the fresh game's first autosave replaces it, without pushing out a good backup.
function loadStored() {
  const raw = readSaveRaw(); if (!raw) return 'ok';
  const d = readSave(), res = d ? loadState(d) : 'invalid';
  if (res === 'invalid') {
    const b = backupRaw();
    try { localStorage.setItem(b && b !== raw && parsesToObject(b) ? UNREADABLE_KEY : BACKUP_KEY, raw); } catch (e) { /* storage may be unavailable */ }
    toast('Your save could not be read, so a new game started. The old one is kept in Settings.');
  }
  return res;
}
// saves come from storage, pasted codes and hand edits, so every field is untrusted: finite, in range, the right shape
const fin = (x) => { const n = +x; return Number.isFinite(n) && n > 0 ? n : 0; };
const whole = (x, max) => Math.min(max, Math.floor(fin(x)));
const objOf = (o) => (isObj(o) ? o : {});
const BIG = Number.MAX_SAFE_INTEGER;
// the stats object from a save: whole counts and finite seconds, never below 0; runSecs may be -1 (not timed)
function statsFromSave(o) {
  o = objOf(o); const b = blankStats();
  return { taps: whole(o.taps, BIG), secs: Math.min(fin(o.secs), 1e10), runSecs: o.runSecs === -1 ? -1 : Math.min(fin(o.runSecs), 1e10), bestPop: fin(o.bestPop), bestCombo: whole(o.bestCombo, BIG), bestGain: whole(o.bestGain, BIG), fastest: Math.min(fin(o.fastest), 1e10) || b.fastest, crafts: whole(o.crafts, BIG), forged: whole(o.forged, BIG), alloys: whole(o.alloys, BIG) };
}
// Returns 'ok', or 'invalid' / 'newer' and leaves the state exactly as it was. Unknown keys are ignored.
function loadState(raw) {
  const m = migrateSave(raw); if (!m.save) return m.error;
  const d = m.save, lv = objOf(d.lv), toolUp = objOf(d.toolUp), inv = objOf(d.inv), invV = objOf(d.invV), seen = objOf(d.seen), dc = objOf(d.col);
  state.sparks = fin(d.sparks); state.runEarned = fin(d.runEarned); state.lifetime = fin(d.lifetime); state.flavorJuice = fin(d.flavorJuice); // the juice behind the Flavors owed (rule C)
  state.echoes = whole(d.echoes, BIG); state.collapses = whole(d.collapses, BIG);
  state.reduceFx = typeof d.reduceFx === 'boolean' ? d.reduceFx : calm; // no saved choice: the browser's reduced-motion setting
  state.stats = statsFromSave(d.stats);
  state.achieved = ACH.fromSave(d.achieved); // known ids, each once; what the state already earns is granted after the load (grantHistory)
  state.muted = d.muted === true; state.musicOn = d.musicOn !== false; state.musicVol = Number.isFinite(d.musicVol) ? clamp(d.musicVol, 0, 1) : 0.5;
  state.autoSell = typeof d.autoSell === 'boolean' ? d.autoSell : true; // on unless the save says off
  for (const k in ECON.UPG) state.lv[k] = whole(lv[k], ECON.UPG[k].max);
  const topT = state.lv.tool, owned = Array.isArray(d.owned) ? d.owned : null;
  state.owned = ECON.TOOLS.map((_, i) => (owned ? owned[i] === true : i <= topT) || i === 0);
  state.equip = d.equip === -1 ? -1 : owned && Number.isInteger(d.equip) && d.equip >= 0 && state.owned[d.equip] ? d.equip : topT; // -1 = always hold the best tool
  state.toolUp = {};
  ECON.TOOLS.forEach((_, i) => { const u = toolUp[i]; if (isObj(u)) state.toolUp[i] = { p: whole(u.p, ECON.TOOL_UP_MAX), s: whole(u.s, ECON.TOOL_UP_MAX), u: ECON.uniqueLevel(i, { u: whole(u.u, 99) }) }; });
  state.seen = { pearl: true };
  for (const k of INV_IDS) { state.inv[k] = whole(inv[k], BIG); state.invV[k] = fin(invV[k]); if (seen[k]) state.seen[k] = true; }
  state.col = blankCol(); state.shinyOn = typeof d.shinyOn === 'boolean' ? d.shinyOn : true;
  for (const t of ECON.PEARLS) {
    const c = state.col[t.id], o = objOf(dc[t.id]);
    c.found = c.found || o.found === true; c.popped = whole(o.popped, BIG); c.sFound = o.sFound === true; c.sPopped = whole(o.sPopped, BIG);
  }
  const ids = ECON.PEARLS.map((t) => t.id), ok = (k) => ids.includes(k) && state.col[k].found;
  state.pool = Array.isArray(d.pool) ? [...new Set(d.pool)].filter(ok) : ids.filter(ok); // locked types are ignored by poolChances, so a re-buy after a Fresh Batch spawns them again
  if (!state.pool.length) state.pool = ['pearl'];
  const dk = objOf(d.keep); // only known ids set to true; anything else is dropped
  state.artifacts = ARTS.fromSave(d.artifacts); // copies and pedestals, clamped: rarities, perks, active copy, known ids
  state.artEquip = ARTS.equippedFromSave(d.artEquip, state.artifacts); // unique, owned relics, at most EQUIP_SLOTS
  state.keep = {}; for (const t of ECON.PEARLS) if (dk[t.id] === true) state.keep[t.id] = true;
  state.forge = FORGE.fromSave(d.forge, ARTS.activeBonuses(state.artifacts, state.artEquip).forge); // jobs, stock and forge upgrades, clamped; finished jobs are collected by awayBonus or the next frame
  syncTop();
  return 'ok';
}
// back from away (boot, or a tab that was hidden): forge jobs whose end time has passed finish, helpers pay half their idle rate
function awayBonus(secs) {
  recalc();
  const jobs = forgeCatchUp(), helped = S.autoRate > 0 && secs >= 20; // secs >= 20 also refuses NaN from a broken save time
  const gain = helped ? ECON.idleRate(S, state.pool, state.lv, state.shinyOn) * Math.min(secs, 28800) * S.awayShare : 0; // what helpers alone would earn, halved (more with an away bonus artifact)
  if (gain > 0) { state.sparks += gain; state.runEarned += gain; state.lifetime += gain; state.flavorJuice += gain; }
  const done = jobs + (jobs === 1 ? ' forge job' : ' forge jobs') + ' finished';
  if (gain > 0) toast('Welcome back! Your helpers popped ' + fmt(gain) + ' juice' + (jobs ? ' and ' + done : '') + ' while you were away');
  else if (jobs) toast('Welcome back! ' + done[0].toUpperCase() + done.slice(1) + ' while you were away');
  return { gain, jobs };
}
/* ----- forge engine hooks (the forge panel comes later): timers run on wall-clock time ----- */
// finish every job whose end time has passed; returns how many
function forgeCatchUp() { const n = collectForge(Date.now()); if (n) { forgeDone(); } return n; }
// FORGE.collect, counting each finished job (and the alloys) in the stats for the achievements
function collectForge(now) { let n = 0; for (let i = 0; i < state.forge.slots.length; i++) { const m = FORGE.finish(state.forge, i, now); if (m) { n++; state.stats.forged++; if (FORGE.isAlloy(m)) state.stats.alloys++; } } return n; }
// frenzy speeds the forge only while the page is open and visible
function forgeTick() { const now = Date.now(); FORGE.setFrenzy(state.forge, frenzyT > 0 && !document.hidden, now); if (collectForge(now)) forgeDone(); }
function forgeStart(slot, mat) { if (!FORGE.start(state.forge, slot, mat, state.inv, Date.now(), state.invV)) return false; updatePack(); updateForge(); save(); return true; }
function forgeStrike(slot) { return FORGE.strike(state.forge, Date.now(), slot); }
function forgeBuy(id) { const c = FORGE.buy(state.forge, id, state.sparks, Date.now()); if (!c) return false; state.sparks -= c; updateForge(); save(); return true; }
// a job finished: save the stock, and mark the dock button if the panel is not open to show it
function forgeDone() { if ($('forge').hidden) setForgeDot(true); forgeSig = ''; updateForge(); updateArts(); checkAch(); save(); }
let forgeDot = false;
function setForgeDot(on) { forgeDot = !!on; $('forgeDot').hidden = !forgeDot; }

/* ----- forge panel: slots with Strike, recipes with Start and Keep, material stock, forge upgrades ----- */
const durTxt = (s) => { s = Math.max(0, Math.ceil(s)); if (s < 60) return s + 's'; if (s < 3600) return Math.floor(s / 60) + 'm' + (s % 60 ? ' ' + (s % 60) + 's' : ''); return Math.floor(s / 3600) + 'h' + (Math.floor(s % 3600 / 60) ? ' ' + Math.floor(s % 3600 / 60) + 'm' : ''); };
const freeSlot = () => state.forge.slots.findIndex((j) => !j);
const matName = (id) => (FORGE.byId(id) || { name: id }).name;
// a dust recipe's pearl type (null for alloys, which are made from dusts)
const recipePearl = (m) => { const p = m.recipe.inputs.find((i) => i.kind === 'pearl'); return p ? p.id : null; };
const inputText = (i) => i.qty + ' ' + (i.kind === 'pearl' ? pearlName(i.id) + 's' : matName(i.id));
// an alloy row shows once every pearl type behind its dusts has been found
const alloyShown = (m) => m.recipe.inputs.every((i) => { const d = FORGE.byId(i.id), k = d && recipePearl(d); return k && state.col[k] && state.col[k].found; });
// the real reason a recipe cannot start, in plain words ('' = it can); it names the first missing item
function startReason(m) {
  if (freeSlot() < 0) return state.forge.slots.length > 1 ? 'All forge slots are busy' : 'The forge slot is busy';
  const miss = FORGE.missing(state.forge, m.id, state.inv);
  if (!miss) return '';
  if (miss.kind === 'material') return 'Need ' + whole2(miss.short) + ' more ' + miss.name + ': make it in the forge';
  const nm = pearlName(miss.id) + 's';
  if (state.autoSell && !isKept(miss.id)) return 'Turn on Keep for ' + nm + ', or turn off auto-sell';
  const spawning = (ECON.poolChances(state.pool, state.lv)[miss.id] || 0) > 0;
  if (!spawning) return nm + ' are not spawning right now: unlock them in the shop or add them to your pool';
  return 'Need ' + whole2(miss.short) + ' more ' + nm + ' in your backpack';
}
// the duck stash warning, for any pearl type: a Start that would leave fewer pearls of its type than the cheapest next craft
// (first or repeat) of an artifact made from that type needs says so. It informs and never blocks.
function stashWarn(m) {
  const p = m.recipe.inputs.find((i) => i.kind === 'pearl'); if (!p) return '';
  const have = state.inv[p.id] || 0; if (have < p.qty) return '';
  let need = null;
  for (const a of ARTS.ARTIFACTS) {
    const line = ARTS.craftCost(a.id, state.artifacts).find((c) => !ARTS.isMat(c) && c.kind === p.id);
    if (line && (!need || line.qty < need.qty)) need = { a, qty: line.qty };
  }
  if (!need || have - p.qty >= need.qty) return '';
  return 'Uses ' + whole2(p.qty) + ' of your ' + whole2(have) + (isKept(p.id) ? ' kept ' : ' ') + pearlName(p.id) + 's (the ' + need.a.name + ' needs ' + whole2(need.qty) + ')';
}
const forgeSpeedText = () => { const f = state.forge; return 'Forge speed x' + +f.rate.toFixed(2) + ': level ' + f.lv.speed + (f.frenzy ? ', frenzy x' + FORGE.FRENZY_FACTOR : ''); };
const FORGE_UPG_DESC = {
  speed: (f) => '+' + Math.round(FORGE.SPEED_PER_LEVEL * 100) + '% forge speed per level (now x' + +FORGE.speedFactor(f.lv.speed, false).toFixed(2) + ')',
  slot: (f) => 'One more job at once (now ' + FORGE.slotCount(f) + (FORGE.slotCount(f) === 1 ? ' slot)' : ' slots)'),
};
function forgeView() {
  const f = state.forge, now = Date.now();
  return {
    speed: forgeSpeedText(),
    slots: f.slots.map((j, i) => (j ? { i, mat: j.mat, name: matName(j.mat), progress: FORGE.progress(f, i, now), left: durTxt(FORGE.secsLeft(f, i, now)) } : { i, empty: true })),
    recipes: FORGE.MATERIALS.filter((m) => state.col[recipePearl(m)] && state.col[recipePearl(m)].found).concat(FORGE.ALLOYS.filter(alloyShown)).map((m) => {
      const reason = startReason(m), kind = recipePearl(m);
      const have = m.recipe.inputs.map((i) => (i.kind === 'pearl' ? whole2(state.inv[i.id] || 0) : whole2(f.stock[i.id] || 0) + ' ' + matName(i.id))).join(', ');
      return { id: m.id, name: m.name, kind, alloy: !kind, stash: stashWarn(m), cost: m.recipe.inputs.map(inputText).join(' + '), time: durTxt(m.recipe.secs / f.rate), have, stock: f.stock[m.id] || 0, kept: !!kind && isKept(kind), can: !reason, reason };
    }),
    stock: FORGE.ALL.filter((m) => f.stock[m.id] > 0).map((m) => ({ id: m.id, name: m.name, n: f.stock[m.id] })),
    upg: Object.keys(FORGE.UPG).map((id) => { const u = FORGE.UPG[id], lvl = f.lv[id], maxed = lvl >= u.max, cost = maxed ? 0 : FORGE.upgCost(id, lvl);
      return { id, name: u.name, lvl, max: u.max, maxed, cost, can: !maxed && state.sparks >= cost, desc: FORGE_UPG_DESC[id](f) }; }),
  };
}
const materialLine = () => { const s = FORGE.ALL.filter((m) => state.forge.stock[m.id] > 0); return s.length ? 'Your materials: ' + s.map((m) => m.name + ' ' + whole2(state.forge.stock[m.id])).join(', ') : 'No materials yet. The Forge makes them from pearls.'; };
let forgeSig = '';
const fRows = { slots: [], recipes: [], upg: {} };
function buildForgeUpg() {
  for (const id of Object.keys(FORGE.UPG)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'up'; b.dataset.fup = id;
    b.innerHTML = '<span class="top"><span class="nm"></span><span class="lv"></span></span><span class="ds"></span><span class="cs"></span>';
    $('fUpg').appendChild(b);
    fRows.upg[id] = { el: b, nm: b.querySelector('.nm'), lv: b.querySelector('.lv'), ds: b.querySelector('.ds'), cs: b.querySelector('.cs'), cache: {} };
    fRows.upg[id].nm.textContent = FORGE.UPG[id].name;
  }
}
function updateForge() {
  if ($('forge').hidden) return;
  const v = forgeView(), sig = v.slots.map((s) => (s.empty ? '-' : s.mat)).join() + '|' + v.recipes.map((r) => r.id).join();
  if (sig !== forgeSig) { // structure changed: rebuild the slot and recipe rows
    forgeSig = sig;
    $('fSlots').innerHTML = ''; fRows.slots = v.slots.map((s) => {
      const r = document.createElement('div'); r.className = 'fslot' + (s.empty ? ' empty' : '');
      r.innerHTML = s.empty ? '<span class="fsn">Slot ' + (s.i + 1) + '</span><span class="fse">Empty: start a recipe below</span>'
        : '<span class="fsn">Slot ' + (s.i + 1) + '</span><span class="fsm">' + s.name + '</span><span class="fbar"><i></i></span><span class="fleft"></span>' +
          '<button type="button" class="strike" data-strike="' + s.i + '" aria-label="Strike: take 1 second off ' + s.name + '">Strike</button>';
      $('fSlots').appendChild(r);
      return { el: r, bar: r.querySelector('.fbar i'), left: r.querySelector('.fleft'), cache: {} };
    });
    $('fRecipes').innerHTML = ''; fRows.recipes = v.recipes.map((m) => {
      const r = document.createElement('div'); r.className = 'frec';
      r.innerHTML = '<div class="frh"><canvas width="64" height="64"' + (m.alloy ? ' hidden' : ' data-art="' + m.kind + '"') + '></canvas><span class="frn">' + m.name + '</span><span class="frs"></span></div>' +
        '<div class="frc"></div><small class="frw"></small><small class="frd"></small><div class="fra"><button type="button" class="chip keepT" data-fkeep="' + m.kind + '" aria-pressed="false"' + (m.alloy ? ' hidden' : '') + '>' + LOCK_SVG + '<span>Keep</span></button>' +
        '<button type="button" class="chip hot fstart" data-fstart="' + m.id + '">Start</button></div>';
      $('fRecipes').appendChild(r);
      const cv = r.querySelector('canvas'); if (!m.alloy && cv.getContext && spr.pearl[m.kind]) { const x = cv.getContext('2d'); x.drawImage(bigSprite(m.kind), -5, -5, 74, 74); }
      return { el: r, s: r.querySelector('.frs'), c: r.querySelector('.frc'), w: r.querySelector('.frw'), k: r.querySelector('.keepT'), b: r.querySelector('.fstart'), d: r.querySelector('.frd'), cache: {} };
    });
  }
  setLbl('fSpeed', v.speed);
  v.slots.forEach((s, i) => { const r = fRows.slots[i]; if (!r || s.empty) return; r.bar.style.transform = 'scaleX(' + s.progress.toFixed(3) + ')'; setText(r, 'left', r.left, s.left + ' left'); });
  v.recipes.forEach((m, i) => {
    const r = fRows.recipes[i]; if (!r) return;
    setText(r, 's', r.s, m.stock ? m.stock + ' in stock' : '');
    setText(r, 'c', r.c, m.cost + ' · ' + m.time + ' · you have ' + m.have);
    setText(r, 'w', r.w, m.reason); setText(r, 'd', r.d, m.stash);
    r.b.disabled = !m.can; r.b.title = m.reason || 'Start ' + m.name;
    r.k.classList.toggle('on', m.kept); r.k.setAttribute('aria-pressed', String(m.kept)); setText(r, 'k', r.k.lastElementChild, m.kept ? 'Kept' : 'Keep');
  });
  setLbl('fStock', v.stock.length ? v.stock.map((s) => s.name + ' ' + whole2(s.n)).join(', ') : 'No materials yet');
  v.upg.forEach((u) => {
    const r = fRows.upg[u.id]; if (!r) return;
    r.el.classList.toggle('can', u.can); r.el.classList.toggle('max', u.maxed);
    r.el.style.setProperty('--p', u.maxed ? '0%' : (clamp(state.sparks / u.cost, 0, 1) * 100).toFixed(0) + '%');
    setText(r, 'lv', r.lv, 'Lv ' + u.lvl + '/' + u.max); setText(r, 'ds', r.ds, u.desc); setText(r, 'cs', r.cs, u.maxed ? 'Max' : fmt(u.cost));
  });
}
function forgeStartUI(mat) {
  const i = freeSlot(); if (i < 0) return false;
  if (!forgeStart(i, mat)) return false;
  Snd.buy(1); toast('The forge is making ' + matName(mat)); forgeSig = ''; updateForge(); return true;
}
function forgeBuyUI(id) {
  if (!forgeBuy(id)) return false;
  Snd.buy(state.forge.lv[id]); const r = fRows.upg[id]; if (r) { r.el.classList.remove('flash'); void r.el.offsetWidth; r.el.classList.add('flash'); }
  forgeSig = ''; updateForge(); return true;
}
// Strike: pointerdown so touch and mouse both answer at once; a keyboard press arrives as a click with no pointer
function strikeUI(btn) {
  const i = +btn.dataset.strike;
  if (!forgeStrike(i)) { btn.classList.remove('capped'); void btn.offsetWidth; btn.classList.add('capped'); return false; }
  Snd.hit('pearl', 0.6, false); btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
  const m = document.createElement('span'); m.className = 'minus1'; m.textContent = '-' + FORGE.STRIKE_SECS + 's';
  btn.parentNode.appendChild(m); setTimeout(() => { if (m.parentNode) m.parentNode.removeChild(m); }, 700);
  updateForge(); return true;
}
$('fSlots').addEventListener('pointerdown', (e) => { const b = e.target.closest && e.target.closest('[data-strike]'); if (b) { e.preventDefault(); Snd.resume(); strikeUI(b); } });
$('fSlots').addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-strike]'); if (b && e.detail === 0) strikeUI(b); });
$('fRecipes').addEventListener('click', (e) => {
  const k = e.target.closest && e.target.closest('[data-fkeep]'); if (k) { Snd.click(); setKeep(k.dataset.fkeep, !isKept(k.dataset.fkeep)); return; }
  const b = e.target.closest && e.target.closest('[data-fstart]'); if (b && !b.disabled) { Snd.resume(); forgeStartUI(b.dataset.fstart); }
});
$('fUpg').addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-fup]'); if (b) { Snd.resume(); forgeBuyUI(b.dataset.fup); } });

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
// Reduce effects: saved with the settings; it also stops the reveal's particles and glow animation (the fxoff class)
function paintFx() {
  const on = !!state.reduceFx; $('fxBtn').textContent = on ? 'On' : 'Off'; $('fxBtn').setAttribute('aria-pressed', String(on));
  document.documentElement.classList.toggle('fxoff', on);
}
$('fxBtn').addEventListener('click', () => { state.reduceFx = !state.reduceFx; Snd.click(); paintFx(); save(); });
$('statsBtn').addEventListener('click', () => { openPanel('stats'); });
/* ----- Stats: lifetime numbers from the collection counters and the stats object, written with fmt and durTxt ----- */
const stRow = (k, v) => '<div class="stRow"><span>' + k + '</span><b>' + v + '</b></div>';
function statsHTML() {
  const x = state.stats, cols = ECON.PEARLS.filter((t) => state.col[t.id].found || state.col[t.id].sFound);
  const pops = ECON.PEARLS.reduce((n, t) => n + state.col[t.id].popped + state.col[t.id].sPopped, 0), shiny = ECON.PEARLS.reduce((n, t) => n + state.col[t.id].sPopped, 0);
  return '<h4 class="setHd">Totals</h4>' + stRow('Juice earned', fmt(state.lifetime)) + stRow('Pearls popped', fmt(pops)) + stRow('Shiny pops', fmt(shiny)) + stRow('Taps', fmt(x.taps)) + stRow('Time played', durTxt(Math.floor(x.secs))) +
    '<h4 class="setHd">Fresh Batches</h4>' + stRow('Fresh Batches taken', fmt(state.collapses)) + stRow('Flavors', fmt(state.echoes)) + stRow('Fastest run', x.fastest ? durTxt(Math.floor(x.fastest)) : 'None yet') + stRow('Biggest Fresh Batch', x.bestGain ? '+' + fmt(x.bestGain) + ' Flavors' : 'None yet') +
    '<h4 class="setHd">Best moments</h4>' + stRow('Best single pop', x.bestPop ? fmtV(x.bestPop) + ' juice' : 'None yet') + stRow('Highest combo', x.bestCombo ? fmt(x.bestCombo) : 'None yet') +
    '<h4 class="setHd">Pops by pearl</h4>' + cols.map((t) => stRow(t.name, fmt(state.col[t.id].popped) + (state.col[t.id].sPopped ? ' <small>+ ' + fmt(state.col[t.id].sPopped) + ' shiny</small>' : ''))).join('');
}
function updateStats() { if ($('stats').hidden) return; setHTML('statsBody', statsHTML()); }
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
  saveBlocked = false;
  Object.assign(state, { sparks: 0, runEarned: 0, lifetime: 0, flavorJuice: 0, achieved: [], lv: ECON.zeroLevels(), echoes: 0, collapses: 0, autoSell: true, seen: { pearl: true }, pool: ['pearl'], shinyOn: true, col: blankCol(), artifacts: {}, artEquip: [], keep: {}, forge: FORGE.blank(), stats: blankStats() }); zeroInv(); resetTools(); $('autoSell').checked = true;
  collapse = null; resetRun(); resetGoals(); recalc(); updateShelf(); seeShop(); seeDots(); syncDock(); toast('Save erased');
});

/* ----- save codes: copy or download one, paste or open one, then Load and Confirm. The replaced save goes to BACKUP_KEY. ----- */
const saveMsg = (msg) => { $('saveMsg').textContent = msg; };
function exportCode() { save(); return encodeSave(serialize()); }
function copyText(text) { // resolves true when the text reached the clipboard
  const viaCommand = () => {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta); return ok;
  };
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => viaCommand());
  return Promise.resolve(viaCommand());
}
$('copySave').addEventListener('click', () => {
  Snd.click(); const code = exportCode(), out = $('saveOut');
  copyText(code).then((ok) => {
    if (ok) { out.hidden = true; saveMsg('Save code copied. Keep it somewhere safe.'); return; }
    out.value = code; out.hidden = false; out.focus(); out.select(); saveMsg('Could not copy it for you. The code is selected below, copy it by hand.');
  });
});
$('dlSave').addEventListener('click', () => {
  Snd.click();
  const url = URL.createObjectURL(new Blob([exportCode()], { type: 'text/plain' })), a = document.createElement('a');
  a.href = url; a.download = 'poppit-save.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 2000);
  saveMsg('Downloaded poppit-save.txt.');
});
$('saveFile').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0]; e.target.value = '';
  if (!file) return;
  if (file.size > 1e6) { saveMsg('That file is too big to be a Poppit save.'); return; }
  file.text().then((t) => { cancelImport(); $('saveText').value = t.trim(); saveMsg('File opened. Press Load to check it.'); }, () => saveMsg('Could not read that file.'));
});
let pendingImport = null;
const REFUSED = { invalid: 'That is not a whole Poppit save code. Check that nothing was cut off.', newer: 'That save is from a newer version of Poppit. Reload the game to update, then load it.' };
// Load: check the code and show what it holds; nothing changes until Confirm
function checkImport(text) {
  cancelImport();
  const d = decodeSave(text), m = d ? migrateSave(d) : { error: 'invalid' };
  if (!m.save) { saveMsg(REFUSED[m.error]); toast(REFUSED[m.error]); return m.error; }
  pendingImport = d;
  $('saveSum').textContent = 'Load ' + fmt(fin(m.save.sparks)) + ' juice and ' + whole(m.save.echoes, BIG) + ' Flavors? This replaces your progress (it is kept as a backup).';
  $('saveConfirm').hidden = false; saveMsg('');
  return 'ok';
}
function cancelImport() { pendingImport = null; $('saveConfirm').hidden = true; }
// Confirm: keep the current save as the backup, then load the new one
function applyImport() {
  const d = pendingImport; cancelImport(); if (!d) return false;
  let cur = null; try { cur = localStorage.getItem(KEY); } catch (e) { cur = null; }
  try { localStorage.setItem(BACKUP_KEY, cur || JSON.stringify(serialize())); } catch (e) { if (cur) { saveMsg('Could not keep a backup of your current save, so nothing was loaded.'); return false; } }
  if (loadState(d) !== 'ok') return false;
  saveBlocked = false; afterLoad(); save();
  $('saveText').value = ''; saveMsg('Save loaded.'); toast('Save loaded'); return true;
}
function backupRaw() { try { return localStorage.getItem(BACKUP_KEY); } catch (e) { return null; } }
function paintRestore() {
  const b = backupRaw(); $('restoreRow').hidden = !b;
  if (b) $('restoreNote').textContent = parsesToObject(b) ? 'The progress you had before your last load' : 'Your last save could not be read';
}
function restoreBackup() {
  const raw = backupRaw(); let d = null; try { d = JSON.parse(raw); } catch (e) { d = null; }
  const res = loadState(d);
  if (res === 'newer') { saveMsg(REFUSED.newer); return res; }
  if (res !== 'ok') { // damaged: the game cannot load it, so hand the text back to the player and keep the backup
    const out = $('saveOut'); out.value = raw || ''; out.hidden = false; out.focus(); out.select();
    saveMsg('That save is damaged and cannot be loaded. Its text is selected above, copy it somewhere safe.'); return res;
  }
  saveBlocked = false; afterLoad(); save();
  try { localStorage.removeItem(BACKUP_KEY); } catch (e) { /* ignore */ }
  paintRestore(); saveMsg('Previous save restored.'); toast('Previous save restored'); return 'ok';
}
// everything outside state that has to follow a newly loaded save
function afterLoad() {
  collapse = null; armed = false; clearTimeout(armTimer); toolView = state.equip >= 0 ? state.equip : state.lv.tool;
  resetRun(); syncDiscoveries(); grantHistory(); $('autoSell').checked = state.autoSell;
  paintMute(); paintFx(); Snd.setMuted(state.muted); Music.setMuted(state.muted); Music.setVolume(state.musicVol); Music.setOn(state.musicOn); paintMusic();
  updateShelf(); updatePack(); updatePool(); paintRestore(); artSig = ''; updateArts(); forgeSig = ''; setForgeDot(false); updateForge(); // no stale numbers from the old save
}
$('loadSave').addEventListener('click', () => { Snd.click(); checkImport($('saveText').value); });
$('confirmLoad').addEventListener('click', () => { Snd.click(); applyImport(); });
$('cancelLoad').addEventListener('click', () => { Snd.click(); cancelImport(); saveMsg(''); });
$('saveText').addEventListener('input', () => cancelImport());
let restoreArmed = false, restoreTimer = 0;
$('restoreBtn').addEventListener('click', () => {
  const b = $('restoreBtn'); Snd.click();
  if (!restoreArmed) { restoreArmed = true; b.textContent = 'Click again to restore'; clearTimeout(restoreTimer); restoreTimer = setTimeout(() => { restoreArmed = false; b.textContent = 'Restore'; }, 3500); return; }
  restoreArmed = false; clearTimeout(restoreTimer); b.textContent = 'Restore'; restoreBackup();
});

/* ----- main loop ----- */
let last = 0, acc = 0, hudT = 0, saveT = 0, achT = 0, started = false;
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
  state.stats.secs += dt; if (state.stats.runSecs >= 0) state.stats.runSecs += dt; // time played: only while the page runs (an away gap counts 0.05 s)
  const w0 = performance.now();
  if (hitStop > 0) hitStop -= dt;
  else { acc += dt; while (acc >= DT) { step(DT); acc -= DT; } }
  hudT += dt; saveT += dt; achT += dt;
  if (achT >= ACH_CHECK_SECS) { achT = 0; checkAch(); }
  revealTick(dt);
  forgeTick(); // before the HUD, so the speed line and slots show this frame's frenzy and finished jobs
  if (hudT > 0.08) { updateHud(hudT); updateShelf(); updatePool(); updateBook(); updateArts(); updateForge(); updateStats(); hudT = 0; }
  if (saveT > 5) { save(); saveT = 0; }
  render();
  if (!$('tools').hidden) drawPedestal(ts);
  adapt(performance.now() - w0, dt);
}
function start(data) {
  if (started) return; started = true;
  const loaded = data && data.lv ? loadState(data) : loadStored();
  if (loaded === 'newer') { saveBlocked = true; toast('Your save is from a newer version of Poppit, so it was not loaded or changed. Reload to update.'); }
  const away = loaded !== 'ok' || (data && data.t) ? 0 : +(readSave() || {}).t;
  recalc(); syncDiscoveries(); grantHistory(); buildShelf(); buildPack(); buildToolPanel(); buildForgeUpg(); $('autoSell').checked = state.autoSell; layout(); dispSparks = state.sparks;
  awayBonus(Number.isFinite(away) && away > 0 ? (Date.now() - away) / 1000 : 0); // also finishes forge jobs that ended while the game was closed
  paintMute(); paintFx(); Snd.setMuted(state.muted); Music.setMuted(state.muted); Music.setVolume(state.musicVol); Music.setOn(state.musicOn); Music.load(); paintMusic(); updateShelf(); paintRestore();
  seeShop(); seeDots(); syncDock();
  if (window.ResizeObserver) new ResizeObserver(layout).observe(stage); else window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { FORGE.setFrenzy(state.forge, false, Date.now()); save(); } }); // no frenzy speed while hidden
  window.addEventListener('pagehide', () => { FORGE.setFrenzy(state.forge, false, Date.now()); save(); }); // iOS Safari does not reliably fire visibilitychange when a tab is closed
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
