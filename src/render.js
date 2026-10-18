/* ---------- Rendering: glossy glass pearls in a machined board. Sprites and the board are drawn once per layout. ---------- */
const hsla = (h, s, l, a) => 'hsla(' + h.toFixed(0) + ',' + s.toFixed(0) + '%,' + l.toFixed(0) + '%,' + (a === undefined ? 1 : Math.max(0, Math.min(1, a)).toFixed(3)) + ')';
const easeOutBack = (k) => { const c = 2.2; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const spr = { pearl: {}, tools: [], sn: 0, ps: 0, Rs: 0 };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.ceil(w)); c.height = Math.max(2, Math.ceil(h)); return c; };
const circ = (x, r) => { x.beginPath(); x.arc(0, 0, r, 0, TAU); };

function drawStar(x, y, r, rot) {
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + (i * Math.PI) / 4, rr = i % 2 ? r * 0.28 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}


/* ----- tinted sprite cache: effects are stamped from small pre-rendered canvases instead of rebuilding gradients, paths and color strings every frame ----- */
const tintCache = new Map();
const q = (v, st) => Math.round(v / st) * st;
function tinted(kind, h, s, l, make) {
  h = q(((h % 360) + 360) % 360, 6); s = q(clamp(s, 0, 100), 5); l = q(clamp(l, 0, 100), 4);
  const key = kind + h + ',' + s + ',' + l;
  let c = tintCache.get(key);
  if (!c) { if (tintCache.size > 600) tintCache.clear(); c = make(h, s, l); tintCache.set(key, c); }
  return c;
}
const glowSpr = (h, s, l, soft) => tinted(soft ? 'G' : 'g', h, s, l, (h, s, l) => {
  const c = mk(96, 96), x = c.getContext('2d'), gr = x.createRadialGradient(48, 48, 0, 48, 48, 48);
  gr.addColorStop(0, hsla(h, s, l + (soft ? 6 : 8), 1)); if (!soft) gr.addColorStop(0.5, hsla(h, s, l, 0.5)); gr.addColorStop(1, hsla(h, s, l + (soft ? 6 : 0), 0));
  x.fillStyle = gr; x.fillRect(0, 0, 96, 96); return c;
});
const discSpr = (h, s, l) => tinted('d', h, s, l, (h, s, l) => {
  const c = mk(48, 48), x = c.getContext('2d'); x.fillStyle = hsla(h, s, l - 4, 1); x.beginPath(); x.arc(24, 24, 22, 0, TAU); x.fill(); return c;
});
const dropSpr = (h, s, l) => tinted('p', h, s, l, (h, s, l) => {
  const c = mk(32, 32), x = c.getContext('2d'); x.fillStyle = hsla(h, s, l, 1); x.beginPath(); x.arc(16, 16, 14, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.arc(16 - 4.2, 16 - 4.2, 4.2, 0, TAU); x.fill(); return c;
});
const shardSpr = (h, s, l) => tinted('s', h, s, l, (h, s, l) => {
  const c = mk(40, 40), x = c.getContext('2d'), u = 12; x.translate(20, 20);
  x.fillStyle = hsla(h, s, l, 1); x.beginPath(); x.moveTo(u * 1.3, 0); x.lineTo(-u * 0.7, u * 0.8); x.lineTo(-u * 0.5, -u * 0.9); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.moveTo(u * 0.9, 0); x.lineTo(-u * 0.2, u * 0.3); x.lineTo(-u * 0.1, -u * 0.35); x.closePath(); x.fill(); return c;
});
const starSpr = (h, s, l) => tinted('t', h, s, l, (h, s, l) => {
  const c = mk(36, 36), x = c.getContext('2d'); x.fillStyle = hsla(h, s, l, 1); x.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? 4.5 : 16; x.lineTo(18 + Math.cos(a) * rr, 18 + Math.sin(a) * rr); }
  x.closePath(); x.fill(); return c;
});
const moteSpr = (h) => tinted('m', h, 95, 64, (h) => {
  const c = mk(24, 24), x = c.getContext('2d');
  x.fillStyle = hsla(h, 95, 62, 0.3); x.beginPath(); x.arc(12, 12, 8, 0, TAU); x.fill();
  x.fillStyle = hsla(h, 95, 66, 1); x.beginPath(); x.arc(12, 12, 4, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(11, 11, 1, 0, TAU); x.fill(); return c;
});
const textCache = new Map();
function textSpr(str, col, size) {
  const key = str + '|' + col + '|' + size;
  let t = textCache.get(key);
  if (!t) {
    if (textCache.size > 160) textCache.clear();
    const B = Math.min(3, DPR * 1.25), px = Math.round(size * 1.25) * B, font = '400 ' + px + 'px "Caveat Brush", "Segoe Print", cursive';
    const m = mk(8, 8).getContext('2d'); m.font = font;
    const w = Math.ceil(m.measureText(str).width + 12 * B), h = Math.ceil(px * 1.5 + 8 * B), c = mk(w, h), x = c.getContext('2d');
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 4 * B; x.strokeStyle = 'rgba(255,255,255,0.92)';
    x.strokeText(str, w / 2, h / 2); x.fillStyle = col; x.fillText(str, w / 2, h / 2);
    t = { c, w, h, B }; textCache.set(key, t);
  }
  return t;
}
let shX = 0, shY = 0;
function baseT() { g.setTransform(DPR, 0, 0, DPR, shX * DPR, shY * DPR); }

/* ----- sprites ----- */
function paintPearl(x, R, h, s, l, kind) {
  // halo of colored light spilling onto the board
  x.save(); x.translate(R * 0.16, R * 0.34); x.scale(1, 0.92);
  const hl = x.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.35);
  hl.addColorStop(0, hsla(h, s, l - 8, 0.36)); hl.addColorStop(0.6, hsla(h, s, l - 8, 0.16)); hl.addColorStop(1, hsla(h, s, l - 8, 0));
  x.fillStyle = hl; circ(x, R * 1.35); x.fill(); x.restore();
  // glass body: deep saturated core, brighter where light passes through at the lower right
  const b = x.createRadialGradient(-R * 0.22, -R * 0.28, R * 0.04, 0, 0, R * 1.02);
  b.addColorStop(0, hsla(h, s * 0.8, l + 22)); b.addColorStop(0.45, hsla(h, s, l + 2)); b.addColorStop(0.85, hsla(h, Math.min(100, s + 4), l - 14)); b.addColorStop(1, hsla(h, Math.min(100, s + 6), l - 26));
  x.fillStyle = b; circ(x, R); x.fill();
  x.save(); circ(x, R); x.clip();
  if (kind === 'opal') { // soft iridescent bands
    [[300, 0.1, 0.1], [180, -0.2, 0.25], [60, 0.25, -0.2]].forEach((c, i) => { x.strokeStyle = hsla(c[0], 80, 78, 0.5); x.lineWidth = R * 0.26; x.beginPath(); x.arc(R * c[1], R * c[2], R * (0.42 + i * 0.14), i * 1.3, i * 1.3 + 2.4); x.stroke(); });
  }
  if (kind === 'marble') {
    x.lineCap = 'round';
    [[190, 0.15, 0.1], [290, -0.25, 0.3], [335, 0.3, -0.2], [48, -0.05, -0.35]].forEach((c, i) => {
      x.strokeStyle = hsla(c[0], 90, 62, 0.6); x.lineWidth = R * 0.2;
      x.beginPath(); x.arc(R * c[1], R * c[2], R * (0.38 + i * 0.1), i, i + 2.2); x.stroke();
    });
  }
  const cg = x.createRadialGradient(R * 0.32, R * 0.46, 0, R * 0.32, R * 0.46, R * 0.62);
  cg.addColorStop(0, hsla(h, s * 0.7, l + 34, 0.9)); cg.addColorStop(1, hsla(h, s * 0.7, l + 34, 0));
  x.fillStyle = cg; x.fillRect(-R, -R, R * 2, R * 2);
  // bright edge where the glass catches light all the way round
  const rim = x.createRadialGradient(0, 0, R * 0.78, 0, 0, R);
  rim.addColorStop(0, hsla(h, s, l + 30, 0)); rim.addColorStop(1, hsla(h, s * 0.8, l + 30, 0.45));
  x.fillStyle = rim; x.fillRect(-R, -R, R * 2, R * 2);
  x.restore();
  // softbox reflection and crisp specular
  x.save(); circ(x, R * 0.97); x.clip();
  const sb = x.createLinearGradient(0, -R, 0, R * 0.1);
  sb.addColorStop(0, 'rgba(255,255,255,0.5)'); sb.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = sb; x.beginPath(); x.ellipse(-R * 0.05, -R * 0.52, R * 0.7, R * 0.4, -0.15, 0, TAU); x.fill();
  x.restore();
  x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.ellipse(-R * 0.38, -R * 0.44, R * 0.25, R * 0.11, -0.7, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.arc(R * 0.5, R * 0.52, R * 0.045, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = R * 0.035; x.lineCap = 'round'; x.beginPath(); x.arc(0, 0, R * 0.92, 0.35, 1.15); x.stroke();
}
// prismatic sheen and bright glints over a pearl, drawn around the current origin
function paintShiny(x, Rs) {
    x.save(); x.beginPath(); x.arc(0, 0, Rs, 0, TAU); x.clip();
    const sh = x.createLinearGradient(-Rs, -Rs, Rs, Rs);
    ['rgba(255,120,200,0.0)', 'rgba(255,230,120,0.42)', 'rgba(120,255,230,0.38)', 'rgba(150,140,255,0.42)', 'rgba(255,120,200,0.0)'].forEach((col, i) => sh.addColorStop(i / 4, col));
    x.fillStyle = sh; x.fillRect(-Rs, -Rs, Rs * 2, Rs * 2); x.restore();
    x.fillStyle = '#fff';
    [[-0.5, -0.55, 0.2], [0.58, 0.3, 0.14]].forEach((g) => { const gx = g[0] * Rs, gy = g[1] * Rs, gr = g[2] * Rs; x.beginPath(); x.moveTo(gx, gy - gr * 2); x.quadraticCurveTo(gx, gy, gx + gr * 2, gy); x.quadraticCurveTo(gx, gy, gx, gy + gr * 2); x.quadraticCurveTo(gx, gy, gx - gr * 2, gy); x.quadraticCurveTo(gx, gy, gx, gy - gr * 2); x.fill(); });
}
// large, crisp copy of a pearl for the book, pool and backpack icons; painted once on demand
const bigCache = {};
function bigSprite(key) {
  if (bigCache[key]) return bigCache[key];
  const shiny = key.endsWith(':s'), id = shiny ? key.slice(0, -2) : key, col = id === 'pearl' ? PAL[0] : PALETTE[id];
  const ps = 340, Rs = ps / 2.9, c = mk(ps, ps), x = c.getContext('2d'); x.translate(ps / 2, ps / 2);
  paintPearl(x, Rs, col[0], col[1], col[2], id); if (shiny) paintShiny(x, Rs);
  return (bigCache[key] = c);
}
function buildSprites() {
  const q = DPR, Rs = PR * 0.74, ps = Rs * 2.9;
  spr.ps = ps; spr.Rs = Rs; spr.sn = SP;
  const defs = Object.assign({ pearl: PAL[0] }, PALETTE);
  for (const k in defs) {
    const c = mk(ps * q, ps * q), x = c.getContext('2d'); x.scale(q, q); x.translate(ps / 2, ps / 2);
    paintPearl(x, Rs, defs[k][0], defs[k][1], defs[k][2], k); spr.pearl[k] = c;
    // shiny twin: same pearl with a prismatic sheen and bright glints
    const c2 = mk(ps * q, ps * q), x2 = c2.getContext('2d'); x2.drawImage(c, 0, 0); x2.scale(q, q); x2.translate(ps / 2, ps / 2);
    paintShiny(x2, Rs);
    spr.pearl[k + ':s'] = c2;
  }
}
const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
function paintTool(i) {
  const c = mk(260, 440), x = c.getContext('2d'); x.translate(130, 400); // strike point at the origin, tool points down
  const lin = (x0, x1, stops) => { const gr = x.createLinearGradient(x0, 0, x1, 0); stops.forEach((s, n) => gr.addColorStop(n / (stops.length - 1), s)); return gr; };
  const steel = ['#59616e', '#f1f4f8', '#7b8493', '#3d434e'], dark = ['#14161b', '#3a3f4a', '#14161b'];
  if (i === 0) { // steel pin
    x.fillStyle = lin(-12, 12, steel); x.beginPath(); x.moveTo(-12, -420); x.lineTo(12, -420); x.lineTo(2, -30); x.lineTo(0, 0); x.lineTo(-2, -30); x.closePath(); x.fill();
    x.fillStyle = lin(-30, 30, steel); rr(x, -30, -440, 60, 40, 14); x.fill();
  } else if (i === 1) { // awl
    x.fillStyle = lin(-9, 9, steel); x.beginPath(); x.moveTo(-9, -170); x.lineTo(9, -170); x.lineTo(0, 0); x.closePath(); x.fill();
    x.fillStyle = lin(-30, 30, ['#2a1c14', '#6b4630', '#2a1c14']); rr(x, -26, -430, 52, 270, 24); x.fill();
    x.fillStyle = lin(-24, 24, steel); rr(x, -24, -190, 48, 26, 6); x.fill();
  } else if (i === 2) { // brass mallet
    x.fillStyle = lin(-12, 12, ['#1c140f', '#5a3b26', '#1c140f']); rr(x, -12, -430, 24, 340, 8); x.fill();
    x.fillStyle = lin(-84, 84, ['#7a5a1c', '#f0d27a', '#a0792a', '#6a4c14']); rr(x, -84, -118, 168, 118, 18); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.3)'; rr(x, -84, -36, 168, 36, 14); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.35)'; rr(x, -70, -108, 140, 8, 4); x.fill();
  } else if (i === 3) { // steel hammer
    x.fillStyle = lin(-14, 14, dark); rr(x, -14, -430, 28, 350, 8); x.fill();
    x.fillStyle = lin(-92, 92, steel); rr(x, -92, -100, 184, 100, 12); x.fill();
    x.fillStyle = 'rgba(15,18,24,0.45)'; rr(x, -92, -26, 184, 26, 10); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.4)'; rr(x, -78, -92, 156, 7, 3); x.fill();
  } else if (i === 4) { // sledgehammer
    x.fillStyle = lin(-18, 18, dark); rr(x, -18, -432, 36, 360, 10); x.fill();
    x.fillStyle = lin(-116, 116, ['#0c0d11', '#3a3f4a', '#16181d']); rr(x, -116, -132, 232, 132, 14); x.fill();
    x.fillStyle = '#ff3d86'; rr(x, -116, -90, 232, 7, 3); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.22)'; rr(x, -100, -122, 200, 6, 3); x.fill();
  } else { // diamond hammer
    x.fillStyle = lin(-14, 14, ['#8a93a3', '#f6f8fb', '#8a93a3']); rr(x, -14, -432, 28, 350, 8); x.fill();
    const fac = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach((p, n) => (n ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); x.fill(); };
    fac([[-100, -60], [-70, -128], [70, -128], [100, -60], [60, 0], [-60, 0]], '#7fd6ff');
    fac([[-70, -128], [0, -128], [-20, -60], [-100, -60]], '#e9fbff');
    fac([[0, -128], [70, -128], [100, -60], [20, -60]], '#a9e6ff');
    fac([[-100, -60], [-20, -60], [0, 0], [-60, 0]], '#4fb5ec');
    fac([[20, -60], [100, -60], [60, 0], [0, 0]], '#2f93d6');
    x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-20, -60); x.lineTo(20, -60); x.stroke();
  }
  spr.tools[i] = c;
}
const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
const lerp = (a, b, t) => a + (b - a) * t;
// hammers lie sideways, handle pointing right: rest high above the cursor, cock the head up, then bring the end face down onto it
const H_REST = { a: 1.95, x: 0.4, y: -0.65 }, H_WIND = { a: 2.3, x: 0.5, y: -0.8 }, H_HIT = { a: 1.66, x: 0, y: 0 }; // handle hangs below the head, and the swing sweeps through a wide arc
const HEAD = { 2: [84, -59], 3: [92, -50], 4: [116, -66], 5: [100, -64] }; // end face of each head (sprite coords), the part that lands on the cursor
function hammerPose(k) {
  const mix = (A, B, t) => ({ ang: lerp(A.a, B.a, t), ox: lerp(A.x, B.x, t), oy: lerp(A.y, B.y, t), lift: 0 });
  const HIT = H_HIT;
  if (k >= 1) return mix(H_REST, H_REST, 0);
  if (k < 0.3) return mix(H_REST, H_WIND, ease(k / 0.3));
  if (k < 0.5) return mix(H_WIND, HIT, Math.pow((k - 0.3) / 0.2, 2.2));
  if (k < 0.58) return mix(HIT, { a: 1.5, x: 0, y: 0.1 }, ease((k - 0.5) / 0.08)); // follow through a little past the cursor
  return mix({ a: 1.5, x: 0, y: 0.1 }, H_REST, ease((k - 0.58) / 0.42));
}
// pin and awl pierce: a quick wind-up, a straight stab into the pearl, a beat of hold, then pull out
function toolPose(i, k) {
  if (i > 1) return hammerPose(k);
  if (k >= 1) return { ang: 1.36, lift: 90 };
  if (k < 0.3) { const e = ease(k / 0.3); return { ang: 1.36 + 0.05 * e, lift: 90 + 90 * e }; }
  if (k < 0.5) { const u = Math.pow((k - 0.3) / 0.2, 2); return { ang: 1.41 - 0.07 * u, lift: 180 - 230 * u }; }
  if (k < 0.64) return { ang: 1.34, lift: -50 };
  const v = ease((k - 0.64) / 0.36); return { ang: 1.34 + 0.02 * v, lift: -50 + 140 * v };
}
function drawTool(i, px, py, k, alpha) {
  if (!spr.tools[i]) paintTool(i);
  const ps = toolPose(i, k), sc = (SP * 2.7 / 440) * (1 + 0.05 * i);
  g.save(); g.globalAlpha = alpha; g.translate(px + (ps.ox || 0) * SP, py + (ps.oy || 0) * SP); g.rotate(ps.ang); g.scale(sc, sc); if (i > 1) g.translate(-HEAD[i][0], -HEAD[i][1]); else g.translate(0, -ps.lift);
  g.drawImage(spr.tools[i], -130, -400, 260, 440); g.restore();
}

/* ----- scene ----- */
function drawBoard() {
  for (const c of cells) {
    if (!c.glow || c.p) continue;
    const a = 0.3 * Math.pow(1 - c.glow.t / 1.5, 2), R = spr.sn * 0.5;
    g.globalAlpha = a; g.drawImage(glowSpr(c.glow.h, c.glow.s, c.glow.l, true), c.x - R, c.y - R, R * 2, R * 2);
  }
  for (const s of stains) {
    const k = s.t / s.life, a = 0.26 * Math.pow(1 - k, 0.9);
    if (a < 0.01) continue;
    g.globalAlpha = a; g.drawImage(discSpr(s.h, s.s, s.l), s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
  }
  g.globalAlpha = 1;
  if (frenzyT > 0) { g.fillStyle = 'rgba(255,60,120,' + (0.05 + 0.03 * Math.sin(time * 8)).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
}

function drawCracks(p, r) {
  const n = Math.ceil((p.dmg / p.hpMax) * p.cr.length);
  g.save(); g.beginPath(); g.arc(0, 0, r * 0.97, 0, TAU); g.clip(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (let pass = 0; pass < 3; pass++) {
    g.strokeStyle = pass === 0 ? hsla(p.h, 90, 80, 0.45) : pass === 1 ? 'rgba(20,6,16,0.7)' : 'rgba(255,255,255,0.95)';
    g.lineWidth = Math.max(1, r * (pass === 0 ? 0.11 : pass === 1 ? 0.055 : 0.026));
    g.beginPath();
    for (let i = 0; i < n; i++) { const pts = p.cr[i]; g.moveTo(pts[0][0] * r, pts[0][1] * r); for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0] * r, pts[k][1] * r); }
    g.stroke();
  }
  g.restore();
}
function drawPearl(p) {
  const sc = easeOutBack(clamp(p.born / 0.38, 0, 1));
  let r = radiusOf(p) * Math.max(0.01, sc) * (1 + 0.01 * Math.sin(time * 2 + p.seed));
  if (hover === p && !collapse) r *= 1.05;
  const j = clamp(p.jx, -0.6, 0.6), sx = 1 + 0.2 * j + 0.1 * p.press, sy = 1 - 0.2 * j - 0.16 * p.press;
  const x = p.cell.x, y = p.cell.y, k = r / spr.Rs;
  g.save(); g.translate(x, y); g.scale(sx, sy);
  const d = spr.ps * k;
  g.drawImage(spr.pearl[p.kind + (p.shiny ? ':s' : '')] || spr.pearl.pearl, -d / 2, -d / 2, d, d);
  if (p.dmg > 0 && p.cr) drawCracks(p, r);
  g.restore();
  if (isBig(p.kind) || p.shiny) {
    g.fillStyle = 'rgba(255,255,255,0.95)';
    for (let i = 0; i < 3; i++) {
      const tw = Math.max(0, Math.sin(time * 4 + i * 2.1 + p.seed));
      if (tw > 0.15) { const a = p.seed + i * 2.1 + time * 0.6; drawStar(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3, r * 0.26 * tw, time); }
    }
  }
}

function drawGhosts() {
  for (const gh of ghosts) {
    const k = clamp(gh.t / gh.dur, 0, 1);
    drawTool(S.toolIdx, gh.p.cell.x, gh.p.cell.y, k * 0.5, 0.5 + 0.4 * k);
  }
}

function drawFx() {
  for (const b of fx.blooms) {
    const k = b.t / b.dur, e = 1 - Math.pow(1 - k, 2), R = b.r * (0.55 + 0.6 * e), a = 0.34 * Math.pow(1 - k, 1.6);
    g.globalAlpha = a; g.drawImage(glowSpr(b.h, b.s, b.l, false), b.x - R, b.y - R, R * 2, R * 2);
  }
  // the pearl's skin tearing open: the shell swells and fades in a blink
  for (const q of fx.pops) {
    const k = q.t / q.dur, e = 1 - Math.pow(1 - k, 3), sc = (q.r / spr.Rs) * (1 + 0.5 * e), d = spr.ps * sc, sx = 1 + 0.12 * e, sy = 1 - 0.1 * e;
    g.globalAlpha = Math.pow(1 - k, 1.4) * 0.9; g.setTransform(DPR * sx, 0, 0, DPR * sy, (q.x * DPR + shX * DPR), (q.y * DPR + shY * DPR));
    g.drawImage(spr.pearl[q.kind] || spr.pearl.pearl, -d / 2, -d / 2, d, d);
  }
  // droplets, shards and stars are stamped from tinted sprites with one setTransform each (no save/restore, no path building, no color strings)
  const ox = shX * DPR, oy = shY * DPR;
  for (const p of fx.parts) {
    const k = p.t / p.life, a = 1 - k * k * k;
    if (a < 0.02) continue;
    g.globalAlpha = a;
    if (p.star) {
      const r = p.r * (1 - k * 0.4) / 16, rot = p.t * 6, cs = Math.cos(rot) * r * DPR, sn = Math.sin(rot) * r * DPR;
      g.setTransform(cs, sn, -sn, cs, p.x * DPR + ox, p.y * DPR + oy); g.drawImage(starSpr(p.h, p.s, p.l), -18, -18); continue;
    }
    if (p.shard) {
      const rot = p.rot + p.spin * p.t, r = p.r / 12, cs = Math.cos(rot) * r * DPR, sn = Math.sin(rot) * r * DPR;
      g.setTransform(cs, sn, -sn, cs, p.x * DPR + ox, p.y * DPR + oy); g.drawImage(shardSpr(p.h, p.s, p.l), -20, -20); continue;
    }
    const v = Math.hypot(p.vx, p.vy), len = p.r * (1 + Math.min(2.2, v / 420)), ang = Math.atan2(p.vy, p.vx), ca = Math.cos(ang), sa = Math.sin(ang), sx = len / 14 * DPR, sy = p.r / 14 * DPR;
    g.setTransform(ca * sx, sa * sx, -sa * sy, ca * sy, p.x * DPR + ox, p.y * DPR + oy); g.drawImage(dropSpr(p.h, p.s, p.l), -16, -16);
  }
  baseT(); g.globalAlpha = 1;
  for (const m of fx.motes) {
    if (m.t < 0) continue;
    g.drawImage(moteSpr(m.h), m.x - 12, m.y - 12);
  }
  for (const t of fx.texts) {
    const k = t.t / t.dur, a = k < 0.12 ? k / 0.12 : 1 - Math.pow((k - 0.12) / 0.88, 2.2);
    const pop = k < 0.12 ? 0.6 + 0.65 * (k / 0.12) : 1.25 - 0.25 * Math.min(1, (k - 0.12) / 0.2);
    const ts = textSpr(t.str, t.col, t.size), z = pop / ts.B;
    g.globalAlpha = clamp(a, 0, 1); g.drawImage(ts.c, t.x - ts.w * z / 2, t.y - ts.h * z / 2, ts.w * z, ts.h * z);
  }
  g.globalAlpha = 1;
}

function drawBrush() {
  if (!S.sweep || !pointer.down || collapse) return;
  g.strokeStyle = 'rgba(40,50,80,0.35)'; g.lineWidth = 1.5; g.setLineDash([4, 6]);
  g.beginPath(); g.arc(pointer.x, pointer.y, S.brush * U * 0.55, 0, TAU); g.stroke(); g.setLineDash([]);
}
function drawCursorTool() {
  if (!pointer.has || collapse) return;
  const fade = pointer.touch ? clamp(1.4 - (time - pointer.last), 0, 1) : 1;
  if (fade <= 0) return;
  drawTool(S.toolIdx, pointer.x, pointer.y, tool.sw / (S.toolIdx <= 1 ? 0.18 : 0.3), 0.97 * fade);
}

let curMix = 0, curInv = [0, 0, 0];
function invertedRgb(h, sat, l) { // the pearl's color as rgb, then flipped
  h = ((h % 360) + 360) % 360; sat /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * sat, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [255 - (r + m) * 255, 255 - (g + m) * 255, 255 - (b + m) * 255];
}
function drawCursorDot() { // a tiny black ring split into four perforated arcs, nothing sticking out
  if (!pointer.has || collapse) return;
  const fade = pointer.touch ? clamp(1.4 - (time - pointer.last), 0, 1) : 1;
  if (fade <= 0) return;
  // black by default; over a live pearl it eases to that pearl's inverted color
  const over = hover && hover.st === 'live' && !collapse ? hover : null;
  if (over) curInv = invertedRgb(over.h, over.s, over.l);
  curMix += ((over ? 1 : 0) - curMix) * 0.3; if (curMix < 0.01) curMix = 0;
  const col = 'rgb(' + curInv.map((v) => Math.round(v * curMix)).join(',') + ')';
  const x = pointer.x, y = pointer.y, r = 2.3, gap = 0.45;
  g.save(); g.globalAlpha = fade; g.lineCap = 'round'; g.strokeStyle = curMix > 0 ? col : '#000'; g.lineWidth = 1.1;
  for (let i = 0; i < 4; i++) { const a0 = i * Math.PI / 2; g.beginPath(); g.arc(x, y, r, a0 + gap, a0 + Math.PI / 2 - gap); g.stroke(); }
  g.restore();
}

function render() {
  if (!spr.pearl.pearl) return;
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
  g.save();
  shX = shake > 0 ? rnd(-1, 1) * shake : 0; shY = shake > 0 ? rnd(-1, 1) * shake : 0; baseT();
  drawBoard();
  for (const p of pearls) if (p.st === 'live') drawPearl(p);
  drawFx(); drawBrush(); drawGhosts(); drawCursorTool(); drawCursorDot();
  if (flashT > 0) { g.fillStyle = 'rgba(255,255,255,' + (flashT / 0.32 * 0.5).toFixed(3) + ')'; g.fillRect(-20, -20, W + 40, H + 40); }
  if (collapse) {
    const k = clamp((collapse.t - collapse.dur * 0.55) / (collapse.dur * 0.45), 0, 1);
    if (k > 0) { g.fillStyle = 'rgba(255,255,255,' + (Math.pow(k, 2) * 0.85).toFixed(3) + ')'; g.fillRect(-20, -20, W + 40, H + 40); }
  }
  g.restore();
}
