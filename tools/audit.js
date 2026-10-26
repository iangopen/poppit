// Onboarding audit: a fresh profile in headless Chrome at WxH (default 390x844, mobile, touch). At four moments (0 s, after the
// first pop, after the first purchase, about 3 minutes of play) it saves a screenshot and lists every visible interactive control.
//   node tools/audit.js <label> [width] [height]     writes docs/audit/<label>-<moment>.png and docs/audit/<label>.json
//   node tools/audit.js batch                         the Fresh Batch box at 390x844: new player, 300 Flavors not ready, ready
//   node tools/audit.js ach [1280 800]                the book sheet at 390x844 (or a desktop size): both tabs, achieved, next and hidden tiers
// Play is a small in-page bot: about 2.5 hits a second on the best live pearl (as tools/sim32.js picks), and the cheapest affordable
// shop row bought by a real tap. The first pop is a real touch on a pearl. Needs Chrome; no npm dependencies (Node 22+ WebSocket).
const { spawn } = require('child_process'), http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'docs', 'audit');
const [label = 'run', W = '390', H = '844'] = process.argv.slice(2), PLAY_MS = +(process.env.AUDIT_PLAY_MS || 180000);
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
const PORT = 8400 + Math.floor(Math.random() * 400), DBG = PORT + 500;
fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' }); r.end(b); }); }).listen(PORT);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'poppit-audit-'));
const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + DBG, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0; const pend = {}, errors = [];
const send = (method, params) => new Promise((res, rej) => { const id = ++seq; pend[id] = { res, rej }; ws.send(JSON.stringify({ id, method, params: params || {} })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(expr.slice(0, 60) + ': ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description)); return r.result.value; };
const DESKTOP = +W > 820; // wider than the phone layout: a desktop window, mouse instead of touch (node tools/audit.js ach 1280 800)
const click = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
const touch = async (x, y) => { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(40); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
// every visible interactive control: rendered (not display none, not in a hidden panel), with a box, not aria-hidden
const CONTROLS = `(() => {
  const sel = 'button, input, select, textarea, [role="tab"], label.chip, a[href]';
  return [...document.querySelectorAll(sel)].filter((e) => {
    if (e.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (!r.width || !r.height || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    if (e.type === 'file' && e.classList.contains('vh')) return false;
    return true;
  }).map((e) => { const r = e.getBoundingClientRect(); const on = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    let name = (e.getAttribute('aria-label') || e.textContent || e.id || e.type || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
    if (e.classList.contains('up')) name = 'shop: ' + (e.querySelector('.nm') || {}).textContent;
    return { id: e.id || '', name, onScreen: on };
  });
})()`;
const BOT = `(() => { if (window.__bot) return; window.__bot = setInterval(() => {
  const live = pearls.filter((p) => p.st === 'live'); if (!live.length) return;
  let best = live[0], bs = -1; for (const p of live) { const s = ECON.KIND[p.kind].mult / Math.ceil((p.hpMax - p.dmg) / S.power); if (s > bs) { bs = s; best = p; } }
  hitPearl(best, S.power, 'tap');
}, 400); })()`;
const BUY = `(() => { const c = [...document.querySelectorAll('#lists .up.can')].filter((b) => !b.hidden && b.offsetParent); if (!c.length) return null;
  c.sort((a, b) => ECON.cost(a.dataset.id, state.lv[a.dataset.id]) - ECON.cost(b.dataset.id, state.lv[b.dataset.id])); const b = c[0]; b.scrollIntoView({ block: 'nearest' });
  const r = b.getBoundingClientRect(); return { id: b.dataset.id, x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`;

// node tools/audit.js layout: at 360, 390 and 430 px wide, the start hint, the next goal, the toast (three batched lines, the most it
// holds) and the bottom bar must not overlap, nothing may scroll sideways, and every visible button must sit inside the page.
// Two states per width: a fresh start (hint, goal, toast) and a mid-game save (payout line, goal, toast; the hint is gone).
const BOXES = `(() => {
  const vis = (e) => { if (!e || e.closest('[hidden]')) return false; const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs.display !== 'none' && +cs.opacity > 0.05; };
  const box = (id) => { const e = document.getElementById(id); if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { id, l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; };
  const list = ['echoes', 'goal', 'toast', 'hint', 'bottom'].map(box).filter(Boolean), hits = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i], b = list[j]; if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) hits.push(a.id + '/' + b.id); }
  const d = document.documentElement, out = [...document.querySelectorAll('button')].filter(vis).filter((e) => { const r = e.getBoundingClientRect(); return r.left < -0.5 || r.right > innerWidth + 0.5; }).map((e) => e.id || e.className);
  return { boxes: list, overlaps: hits, page: d.scrollWidth + '/' + d.clientWidth, outside: out };
})()`;
async function layoutChecks() {
  const out = [], mid = { version: 8, sparks: 900, runEarned: 800000, lifetime: 800000, echoes: 3, lv: { sharp: 12, lucky: 4, spawn: 6, combo: 5, mint: 2, golden: 1 }, owned: [true, true, true, false, false, false], equip: -1, toolUp: {}, col: Object.fromEntries(['pearl', 'blue', 'mint', 'golden', 'violet', 'coral', 'marble', 'opal', 'ruby', 'black'].map((k, i) => [k, { found: i < 4, popped: i < 4 ? 500 : 0, sFound: false, sPopped: 0 }])), pool: ['pearl', 'blue', 'mint', 'golden'], artifacts: { pink_duck: { active: 1, copies: [{ id: 1, rarity: 'common', perks: [] }] }, blue_duck: { active: 2, copies: [{ id: 2, rarity: 'common', perks: [] }] } }, autoSell: true, t: Date.now() };
  const TOAST3 = 'toast("New pearl: Mint Pearl (added to your pool)"); toast("New tool! The Awl hits with power 2"); toast("Little helpers will poke pearls for you!"); true';
  for (const w of [360, 390, 430]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 844, deviceScaleFactor: 2, mobile: true });
    for (const [name, save] of [['start', null], ['midgame', mid]]) {
      // seed storage from a page without the game, or the game's own pagehide autosave would overwrite it
      await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/package.json' }); await sleep(500);
      await ev('localStorage.clear(); ' + (save ? 'localStorage.setItem("poppit.v1", ' + JSON.stringify(JSON.stringify(save)) + '); ' : '') + 'true');
      await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' }); await sleep(1800);
      await ev(TOAST3); await sleep(400);
      const m = await ev(BOXES), file = 'layout-' + w + '-' + name + '.png';
      fs.writeFileSync(path.join(OUT, file), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
      out.push(Object.assign({ width: w, state: name, file }, m));
      console.log(w + ' px, ' + name + ': page ' + m.page + ', overlaps: ' + (m.overlaps.join(' ') || 'none') + ', buttons outside: ' + (m.outside.join(' ') || 'none') + ' | ' + m.boxes.map((b) => b.id + ' ' + b.l + '..' + b.r + ' x ' + b.t + '..' + b.b).join('; ') + ' -> ' + file);
    }
  }
  return out;
}
// node tools/audit.js settings: Settings (with Reduce effects) and the Stats screen on a mid-game save; screenshots and widths
async function settingsChecks() {
  const out = [], save = { version: 9, sparks: 4200, runEarned: 900000, lifetime: 2.4e6, echoes: 4, collapses: 2, lv: { sharp: 12, lucky: 5 }, col: Object.fromEntries(['pearl', 'blue', 'mint', 'golden', 'violet', 'coral', 'marble', 'opal', 'ruby', 'black'].map((k, i) => [k, { found: i < 6, popped: i < 6 ? Math.round(48000 / (i + 1) ** 2) : 0, sFound: i < 3, sPopped: i < 3 ? 40 - 10 * i : 0 }])), pool: ['pearl', 'blue', 'mint', 'golden', 'violet', 'coral'], stats: { taps: 18342, secs: 7395, runSecs: 410, bestPop: 98765, bestCombo: 61, bestGain: 3, fastest: 742 }, t: Date.now() };
  await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/package.json' }); await sleep(500);
  await ev('localStorage.clear(); localStorage.setItem("poppit.v1", ' + JSON.stringify(JSON.stringify(save)) + '); true');
  await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' }); await sleep(1800);
  const widths = (panel) => ev(`(() => { const d = document.documentElement, p = document.getElementById(${JSON.stringify(panel)}), r = p.getBoundingClientRect();
    const wide = [...p.querySelectorAll('*')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 0.5 || b.left < r.left - 0.5); }).map((e) => e.id || e.className);
    return { page: d.scrollWidth + '/' + d.clientWidth, panel: p.scrollWidth + '/' + p.clientWidth, past: wide }; })()`);
  await ev('document.getElementById("setBtn").click(); true'); await sleep(400);
  await ev('document.getElementById("fxBtn").scrollIntoView({ block: "center" }); true'); await sleep(200);
  let w = await widths('settings'), file = 'settings-390.png';
  fs.writeFileSync(path.join(OUT, file), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const fx = await ev('document.getElementById("fxBtn").textContent + " (reduceFx " + state.reduceFx + ")"');
  out.push(Object.assign({ screen: 'settings', file, fx }, w)); console.log('settings: Reduce effects ' + fx + ', page ' + w.page + ', panel ' + w.panel + ', past the panel: ' + (w.past.join(' ') || 'none') + ' -> ' + file);
  await ev('document.getElementById("statsBtn").click(); true'); await sleep(400);
  w = await widths('stats'); file = 'stats-390.png';
  fs.writeFileSync(path.join(OUT, file), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const text = await ev('document.getElementById("statsBody").innerText.replace(/\\n+/g, " | ")');
  out.push(Object.assign({ screen: 'stats', file, text }, w)); console.log('stats: page ' + w.page + ', panel ' + w.panel + ', past the panel: ' + (w.past.join(' ') || 'none') + ' -> ' + file + '\n  ' + text);
  await ev('document.getElementById("stats").scrollTop = 9999; true'); await sleep(200);
  fs.writeFileSync(path.join(OUT, 'stats-390-end.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  return out;
}
// node tools/audit.js batch: the Fresh Batch box (rule C) on three saves at 390x844: a new player at 3M juice, 300 Flavors 40% of
// the way to the gate (not ready) and 300 Flavors past it (ready). Screenshots, the box's text and widths.
async function batchChecks() {
  const out = [], col = Object.fromEntries(['pearl', 'blue', 'mint', 'golden', 'violet', 'coral', 'marble', 'opal', 'ruby', 'black'].map((k, i) => [k, { found: i < 6, popped: i < 6 ? 400 : 0, sFound: false, sPopped: 0 }]));
  const base = { version: 10, lv: { sharp: 20, lucky: 6, mint: 3, golden: 2, violet: 1, coral: 1, spawn: 8, combo: 6 }, col, pool: ['pearl', 'blue', 'mint', 'golden', 'violet', 'coral'], autoSell: true };
  const from = 1.25e6 * 300 * 300, to = 1.25e6 * 450 * 450;
  const saves = [['new', { version: 10, sparks: 3e6, runEarned: 3e6, lifetime: 3e6, flavorJuice: 3e6, lv: { sharp: 20, lucky: 6, mint: 3 }, col, pool: ['pearl', 'blue', 'mint'] }],
    ['notready', Object.assign({}, base, { sparks: 8e6, runEarned: 8e6, lifetime: 3e10, flavorJuice: from + 0.4 * (to - from), echoes: 300, collapses: 6 })],
    ['ready', Object.assign({}, base, { sparks: 8e6, runEarned: 8e6, lifetime: 3e10, flavorJuice: to * 1.03, echoes: 300, collapses: 6 })]];
  for (const [name, save] of saves) {
    await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/package.json' }); await sleep(500);
    await ev('localStorage.clear(); localStorage.setItem("poppit.v1", ' + JSON.stringify(JSON.stringify(Object.assign({ t: Date.now() }, save))) + '); true');
    await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' }); await sleep(1800);
    await ev('document.getElementById("collapseBox").scrollIntoView({ block: "center" }); true'); await sleep(300);
    const m = await ev(`(() => { const d = document.documentElement, b = document.getElementById('collapseBox'), r = b.getBoundingClientRect();
      const past = [...b.querySelectorAll('*')].filter((e) => { const q = e.getBoundingClientRect(); return q.width && (q.right > r.right + 0.5 || q.left < r.left - 0.5); }).map((e) => e.id || e.tagName);
      const ids = ['collapseNow', 'collapseBar', 'collapseText', 'collapseBtn'], w = ids.map((id) => { const e = document.getElementById(id); return id + ' ' + e.scrollWidth + '/' + e.clientWidth; });
      return { page: d.scrollWidth + '/' + d.clientWidth, box: b.scrollWidth + '/' + b.clientWidth, parts: w, past, hidden: b.hidden, box_px: Math.round(r.width) + 'x' + Math.round(r.height),
        text: ids.filter((id) => id !== 'collapseBar').map((id) => document.getElementById(id).textContent), bar: document.getElementById('collapseBar').getAttribute('aria-valuenow'), disabled: document.getElementById('collapseBtn').disabled }; })()`);
    const file = 'batch-390-' + name + '.png';
    fs.writeFileSync(path.join(OUT, file), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    out.push(Object.assign({ state: name, file }, m));
    console.log(name + ': page ' + m.page + ', box ' + m.box + ' (' + m.box_px + '), ' + m.parts.join(', ') + ', past the box: ' + (m.past.join(' ') || 'none') + ', bar ' + m.bar + '%, button disabled ' + m.disabled + ' -> ' + file + '\n  ' + m.text.join(' | '));
  }
  return out;
}
// node tools/audit.js ach: a mid-game save (achievements granted on load, so achieved, next and ??? tiers mix), the book opened by
// a real tap, the Achievements tab tapped, then the Popping and Collecting categories. Screenshots, and every part's widths.
async function achChecks() {
  const out = [], col = Object.fromEntries(['pearl', 'blue', 'mint', 'golden', 'violet', 'coral', 'marble', 'opal', 'ruby', 'black'].map((k, i) => [k, { found: i < 6, popped: [12000, 1300, 600, 120, 60, 20][i] || 0, sFound: i < 2, sPopped: i < 2 ? 3 : 0 }]));
  const save = { version: 10, sparks: 5e5, runEarned: 2e6, lifetime: 4e7, flavorJuice: 4e7, echoes: 4, collapses: 2, lv: { sharp: 20, lucky: 6, mint: 3, golden: 2, violet: 1, coral: 1, spawn: 8, combo: 6, board: 2 }, col,
    pool: ['pearl', 'blue', 'mint', 'golden', 'violet', 'coral'], autoSell: true, stats: { taps: 7000, secs: 4000, runSecs: 100, bestPop: 3e6, bestCombo: 35, bestGain: 2, fastest: 420 } };
  await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/package.json' }); await sleep(500);
  await ev('localStorage.clear(); localStorage.setItem("poppit.v1", ' + JSON.stringify(JSON.stringify(Object.assign({ t: Date.now() }, save))) + '); true');
  await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' }); await sleep(1800);
  const tap = async (sel) => { const r = await ev('(() => { const e = document.querySelector(' + JSON.stringify(sel) + '); if (!e) return null; const q = e.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; })()'); if (!r) throw new Error('no ' + sel); await (DESKTOP ? click : touch)(r[0], r[1]); await sleep(500); };
  const toast = await ev('document.getElementById("toast").textContent');
  await tap('#bookBtn'); await sleep(900); await tap('#bkTabAch');
  for (const cat of ['popping', 'collecting']) {
    if (cat !== 'popping') await tap('[data-acat="' + cat + '"]');
    // scroll the list so the first "next" tier sits near its top: an achieved tier above it, ??? tiers below
    await ev('(() => { const l = document.getElementById("achList"), n = l.querySelector(".achT.next"); if (n) l.scrollTop = n.offsetTop - l.offsetTop - 70; return true; })()'); await sleep(200);
    const m = await ev(`(() => { const d = document.documentElement, v = document.getElementById('achView'), r = v.getBoundingClientRect();
      const past = [...v.querySelectorAll('*')].filter((e) => { const q = e.getBoundingClientRect(); return q.width && (q.right > r.right + 0.5 || q.left < r.left - 0.5); }).map((e) => e.className || e.tagName);
      const w = (e) => e.scrollWidth + '/' + e.clientWidth, wide = [...v.querySelectorAll('.achT, .achLad, .achCats, .atab')].filter((e) => e.scrollWidth > e.clientWidth).length;
      const st = (c) => v.querySelectorAll('.achT.' + c).length;
      return { page: w(d), book: w(document.getElementById('book')), card: w(v), list: w(document.getElementById('achList')), cats: w(document.getElementById('achCats')), overflowing: wide, past,
        card_px: Math.round(r.width) + 'x' + Math.round(r.height), tiers: { done: st('done'), next: st('next'), hidden: st('hid') }, sum: document.getElementById('achSum').textContent,
        tabs: [...document.querySelectorAll('#achCats .atab')].map((b) => Math.round(b.getBoundingClientRect().height)).join(',') }; })()`);
    const file = 'ach-' + W + '-' + cat + '.png';
    fs.writeFileSync(path.join(OUT, file), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    out.push(Object.assign({ category: cat, file }, m));
    console.log(cat + ': page ' + m.page + ', book ' + m.book + ', card ' + m.card + ' (' + m.card_px + '), list ' + m.list + ', categories ' + m.cats + ' (tab heights ' + m.tabs + '), rows wider than themselves ' + m.overflowing + ', past the card: ' + (m.past.join(' ') || 'none') + ', tiers ' + JSON.stringify(m.tiers) + ' -> ' + file + '\n  ' + m.sum);
  }
  await tap('#bkTabPearls'); await sleep(1200);
  const pm = await ev(`(() => { const d = document.documentElement, b = document.getElementById('book'), k = document.getElementById('bkWrap').getBoundingClientRect(), t = document.querySelector('.bkTabs').getBoundingClientRect();
    return { page: d.scrollWidth + '/' + d.clientWidth, book: b.scrollWidth + '/' + b.clientWidth, spread: Math.round(k.width) + 'x' + Math.round(k.height) + ' at y ' + Math.round(k.top), tabs_bottom: Math.round(t.bottom) }; })()`);
  fs.writeFileSync(path.join(OUT, 'ach-' + W + '-pearls.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  out.push(Object.assign({ category: 'pearls tab', file: 'ach-' + W + '-pearls.png' }, pm));
  console.log('pearls tab: page ' + pm.page + ', book ' + pm.book + ', spread ' + pm.spread + ', tabs end at y ' + pm.tabs_bottom + ' -> ach-' + W + '-pearls.png');
  console.log('load toast: ' + JSON.stringify(toast));
  return out;
}
(async () => {
  const result = { label, width: +W, height: +H, moments: [] };
  try {
    let tgt; for (let i = 0; i < 60 && !tgt; i++) { await sleep(200); try { tgt = await new Promise((res, rej) => http.get('http://127.0.0.1:' + DBG + '/json/list', (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res(JSON.parse(b).find((t) => t.type === 'page'))); }).on('error', rej)); } catch (e) { /* not up yet */ } }
    ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
    ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { (d.error ? pend[d.id].rej(new Error(JSON.stringify(d.error))) : pend[d.id].res(d.result)); delete pend[d.id]; } if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception.description); });
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: DESKTOP ? 1 : 2, mobile: !DESKTOP });
    if (!DESKTOP) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' }); await sleep(2000);
    if (label === 'layout') { result.layout = await layoutChecks(); return; }
    if (label === 'settings') { result.settings = await settingsChecks(); return; }
    if (label === 'batch') { result.batch = await batchChecks(); return; }
    if (label === 'ach') { result.ach = await achChecks(); return; }
    const t0 = Date.now();
    const moment = async (name) => {
      await sleep(400);
      const shot = await send('Page.captureScreenshot', { format: 'png' }), file = label + '-' + name + '.png';
      fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
      const ctl = await ev(CONTROLS), juice = await ev('Math.floor(state.runEarned)'), goal = await ev('(document.getElementById("goal") && !document.getElementById("goal").hidden) ? document.getElementById("goalText").textContent : ""');
      result.moments.push({ name, at: Math.round((Date.now() - t0) / 1000), juice, file, total: ctl.length, onScreen: ctl.filter((c) => c.onScreen).length, goal, controls: ctl });
      console.log(name + ' (' + Math.round((Date.now() - t0) / 1000) + ' s, run juice ' + juice + '): ' + ctl.length + ' controls, ' + ctl.filter((c) => c.onScreen).length + ' on screen' + (goal ? ', goal "' + goal + '"' : '') + ' -> ' + file);
    };
    await moment('0s');
    // the first pop: a real touch on a Rose pearl
    const p = await ev('(() => { const r = cv.getBoundingClientRect(), p = pearls.find((q) => q.st === "live" && q.kind === "pearl"); return [r.left + p.cell.x, r.top + p.cell.y]; })()');
    await touch(p[0], p[1]); await sleep(300);
    await moment('first-pop');
    await ev(BOT);
    let bought = null; for (let i = 0; i < 600 && !bought; i++) { await sleep(250); const b = await ev(BUY); if (b) { await touch(b.x, b.y); await sleep(200); if (await ev('Object.values(state.lv).some((v) => v > 0)')) bought = b.id; } }
    result.firstBuy = bought;
    await moment('first-purchase');
    while (Date.now() - t0 < PLAY_MS) { await sleep(1500); const b = await ev(BUY); if (b) await touch(b.x, b.y); }
    await moment('3min');
    result.levels = await ev('JSON.stringify(Object.fromEntries(Object.entries(state.lv).filter((e) => e[1] > 0)))');
    result.errors = errors;
  } catch (e) { console.log('ERROR ' + e.stack); result.error = String(e); }
  finally {
    fs.writeFileSync(path.join(OUT, (label === 'ach' ? 'ach-' + W : label) + '.json'), JSON.stringify(result, null, 1));
    console.log('levels at the end: ' + result.levels + '; console errors: ' + (errors.length ? errors.join(' | ') : 'none'));
    try { ws.close(); } catch (e) {} ch.kill(); srv.close(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(0); }, 500);
  }
})();
