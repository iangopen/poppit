const E = require('../src/econ.js');
const CELLS = [120, 252, 440];
function run(minutes, tapsPerSec, skill) {
  const st = { lv: E.zeroLevels(), echoes: 0, owned: [true,false,false,false,false,false], equip: -1, toolUp: {} };
  let sparks = 0, runEarned = 0, t = 0, spawnT = 0, pearls = [], combo = 0, comboT = 99, meter = 0, frenzy = 0, tapAcc = 0, autoAcc = 0, lastMark = 0, earnedWin = 0, collapsed = null;
  const log = [], bought = [], marks = [60, 120, 300, 600, 900, 1200];
  const fill = () => CELLS[st.lv.board];
  const bestOwned = () => { let b = 0; st.owned.forEach((o, i) => { if (o) b = i; }); return b; };
  const up = (i) => st.toolUp[i] || (st.toolUp[i] = { p: 0, s: 0 });
  while (t < minutes * 60) {
    const dt = 0.1; t += dt; comboT += dt; frenzy = Math.max(0, frenzy - dt);
    st.lv.tool = bestOwned(); st.equip = st.lv.tool;
    const S = E.stats(st);
    spawnT += dt; const every = S.spawnEvery / (frenzy > 0 ? 4 : 1);
    while (spawnT >= every) {
      spawnT -= every;
      if (pearls.length < fill()) {
        const ch = E.poolChances(E.PEARLS.map((t) => t.id), st.lv, frenzy > 0); let kind = 'pearl', r = Math.random();
        for (const id in ch) { r -= ch[id]; if (r < 0) { kind = id; break; } }
        pearls.push({ kind, dmg: 0, hp: E.KIND[kind].hp, sh: Math.random() < E.shinyChance(st.lv) });
      }
    }
    let gain = 0;
    const hit = (p, dmg, manual, depth) => {
      const i = pearls.indexOf(p); if (i < 0) return;
      p.dmg += dmg; if (p.dmg < p.hp) return;
      pearls.splice(i, 1);
      gain += E.popValue(S, manual ? combo : 0, frenzy > 0, p.kind) * (p.sh ? E.SHINY_MULT : 1);
      if (manual) meter += 1;
      if (S.chain > 0 && depth < 5) {
        const nb = Math.min(pearls.length, Math.round(3 * Math.min(1, pearls.length / (fill() * 0.55))));
        for (let k = 0; k < nb; k++) if (Math.random() < S.chain * Math.pow(0.78, depth) && pearls.length) hit(pearls[Math.floor(Math.random() * pearls.length)], S.power, false, depth + 1);
      }
    };
    tapAcc += dt * tapsPerSec * S.toolSpeed * (S.sweep ? 2 : 1);
    while (tapAcc >= 1 && pearls.length) {
      tapAcc -= 1; let pick;
      if (Math.random() < skill) { pick = pearls[0]; let bs = -1; for (const p of pearls) { const s = E.KIND[p.kind].mult / Math.ceil((p.hp - p.dmg) / S.power); if (s > bs) { bs = s; pick = p; } } }
      else pick = pearls[Math.floor(Math.random() * pearls.length)];
      combo = comboT < S.comboWindow ? combo + 1 : 1; comboT = 0;
      hit(pick, S.power, true, 0);
    }
    autoAcc += dt * S.autoRate;
    while (autoAcc >= 1 && pearls.length) { autoAcc -= 1; const c = pearls.filter((p) => p.hp <= S.power * 3); if (c.length) hit(c[Math.floor(Math.random() * c.length)], S.power, false, 0); }
    if (meter >= S.frenzyNeed && frenzy <= 0) { meter = 0; frenzy = 7; }
    sparks += gain; runEarned += gain; earnedWin += gain;
    // candidates: upgrades, next tool, upgrades on the equipped tool
    const cands = [];
    for (const id of E.ORDER) { const u = E.UPG[id], l = st.lv[id]; if (l >= u.max || (u.req && !u.req(st.lv))) continue; cands.push({ n: id, c: E.cost(id, l), s: E.cost(id, l) * (u.group === 'verb' && l === 0 ? 0.5 : 1), f: () => st.lv[id]++ }); }
    const nx = bestOwned() + 1;
    if (nx < E.TOOLS.length) cands.push({ n: 'buy:' + E.TOOLS[nx].name, c: E.toolPrice(nx), s: E.toolPrice(nx) * 0.8, f: () => { st.owned[nx] = true; } });
    const e = bestOwned(), U = up(e);
    if (U.p < E.TOOL_UP_MAX) cands.push({ n: 'pow' + e, c: E.toolUpCost(e, 'power', U.p), s: E.toolUpCost(e, 'power', U.p), f: () => U.p++ });
    if (U.s < E.TOOL_UP_MAX) cands.push({ n: 'spd' + e, c: E.toolUpCost(e, 'speed', U.s), s: E.toolUpCost(e, 'speed', U.s), f: () => U.s++ });
    let best = null; for (const c of cands) if (c.c <= sparks && (!best || c.s < best.s)) best = c;
    if (best) { sparks -= best.c; best.f(); if (best.n.startsWith('buy')) bought.push(best.n.slice(4) + '@' + Math.round(t)); }
    while (marks.length && t >= marks[0]) { const m = marks.shift(); log.push('t=' + m + 's earned=' + Math.round(runEarned) + ' avg/s=' + Math.round(earnedWin / (m - lastMark)) + ' tool=' + E.TOOLS[bestOwned()].name + ' power=' + S.power + ' ups=' + JSON.stringify(st.toolUp[bestOwned()] || {}) + ' lv=' + st.lv.sweep + '/' + st.lv.chain + '/' + st.lv.auto); earnedWin = 0; lastMark = m; }
    if (!collapsed && E.collapseReady(runEarned)) collapsed = Math.round(t);
  }
  return { log, bought, collapsed };
}
for (const [label, taps, skill] of [['casual', 1.5, 0.3], ['engaged', 2.5, 0.7]]) {
  const r = run(25, taps, skill);
  console.log('\n== ' + label); console.log('tools:', r.bought.join(', ')); r.log.forEach((l) => console.log(l));
  console.log('fresh batch ready at', r.collapsed, 's (' + (r.collapsed / 60).toFixed(1) + ' min)');
}
