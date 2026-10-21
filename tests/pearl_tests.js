// Pearl collection tests. Called from harness32.js with the live game handles.
const maxed = (E) => { const lv = E.zeroLevels(); for (const id of ['lucky', 'golden', 'mint', 'violet', 'coral', 'marble', 'opal', 'ruby', 'black']) lv[id] = E.UPG[id].max; return lv; };
module.exports = ({ G, ok, frames, live, E, store, els }) => {
  const st = G.state;
  const v1 = (extra) => Object.assign({ sparks: 500, runEarned: 800, lifetime: 800, lv: Object.assign(E.zeroLevels(), { golden: 2, lucky: 3, tool: 1 }),
    echoes: 0, collapses: 0, inv: { pearl: 4, golden: 1 }, invV: { pearl: 16, golden: 40 }, seen: { pearl: true, blue: true }, t: Date.now() }, extra);

  /* ---- Task 2: save v2 and migration ---- */
  G.loadState(v1());
  ok('migrate v1 keeps progress', st.sparks === 500 && st.inv.pearl === 4 && st.inv.golden === 1 && st.lv.golden === 2, st.sparks + '/' + st.inv.pearl);
  ok('migrate v1 pools unlocked types and marks them found', ['pearl', 'blue', 'golden'].every((k) => st.pool.includes(k) && st.col[k].found) && !st.pool.includes('marble'), st.pool.join());
  G.loadState(v1({ lv: Object.assign(E.zeroLevels(), { golden: 1 }), seen: { pearl: true } }));
  ok('migrate v1 grants the blue unlock and pools blue', st.lv.lucky >= 1 && st.pool.includes('blue') && st.col.blue.found, 'lucky ' + st.lv.lucky);
  let threw = false;
  try { G.loadState({ version: 2, lv: E.zeroLevels(), pool: 'x', col: 5, shinyOn: 'y', inv: 7 }); } catch (e) { threw = e; }
  ok('corrupt v2 save does not throw and falls back to the base pearl pool', !threw && st.pool.length === 1 && st.pool[0] === 'pearl', String(threw));
  G.loadState(v1()); st.pool = ['pearl', 'golden']; st.shinyOn = false; st.col.golden.popped = 7; st.col.golden.sFound = true; st.col.golden.sPopped = 2;
  const snap = JSON.parse(JSON.stringify(G.serialize()));
  G.loadState({ version: 2, lv: E.zeroLevels() });
  G.loadState(snap);
  ok('v2 round trip keeps pool, toggle and collection counts', snap.version === G.SAVE_VERSION && st.pool.join() === 'pearl,golden' && st.shinyOn === false && st.col.golden.popped === 7 && st.col.golden.sFound && st.col.golden.sPopped === 2, st.pool.join());
  G.loadState({ version: 2, lv: E.zeroLevels() });
  const first = G.discover('mint', false), again = G.discover('mint', false);
  ok('first discovery auto-adds to the pool, once', first === true && again === false && st.pool.includes('mint'), st.pool.join());
  st.pool = st.pool.filter((k) => k !== 'mint'); G.discover('mint', false);
  ok('removing a type from the pool is not undone by later pops', !st.pool.includes('mint'));
  ok('shiny discovery is a separate entry and does not pool', G.discover('mint', true) === true && st.col.mint.sFound && !st.pool.includes('mint'));
};

module.exports.task3 = ({ G, ok, frames, live, E }) => {
  const st = G.state;
  const lv = maxed(E);
  G.setLv(lv); st.pool = ['pearl', 'mint']; G.clearBoard();
  const counts = {}; let n = 0;
  for (let i = 0; i < 3000; i++) { G.trySpawn(); const p = G.pearls[G.pearls.length - 1]; if (!p) continue; counts[p.kind] = (counts[p.kind] || 0) + 1; n++; p.cell.p = null; G.pearls.pop(); }
  const want = E.poolChances(st.pool, lv).mint;
  ok('spawns only pooled types', Object.keys(counts).every((k) => st.pool.includes(k)), JSON.stringify(counts));
  ok('spawn share matches the pool chance', Math.abs((counts.mint || 0) / n - want) < 0.02, ((counts.mint || 0) / n).toFixed(3) + ' vs ' + want.toFixed(3));
  st.pool = ['mint']; G.clearBoard();
  for (let i = 0; i < 60; i++) G.trySpawn();
  ok('per-type caps are honored', G.pearls.filter((p) => p.kind === 'mint').length <= 6 && G.pearls.length > 6, G.pearls.filter((p) => p.kind === 'mint').length + ' mint of ' + G.pearls.length);
  G.clearBoard(); st.pool = ['pearl', 'mint', 'golden'];
  for (const id of ['mint', 'violet', 'coral', 'opal', 'ruby', 'black', 'blue', 'golden', 'marble']) {
    const cell = G.cells.find((c) => !c.p); const p = G.spawnAt(cell, id);
    st.col[id].popped = 0; G.popPearl(p, 'tap');
    if (st.col[id].popped !== 1 || !st.col[id].found) ok('popping ' + id + ' counts it in the collection', false, JSON.stringify(st.col[id]));
  }
  ok('every type pops and is counted', ['mint', 'violet', 'black', 'marble'].every((k) => st.col[k].popped === 1 && st.col[k].found));
  G.syncDiscoveries(); st.col.ruby.found = false; st.lv.ruby = 1; G.syncDiscoveries();
  ok('unlocking a type via the shop discovers it and pools it', st.col.ruby.found && st.pool.includes('ruby'));
  ok('every type has a sprite', E.PEARLS.every((t) => G.spr().pearl[t.id]), Object.keys(G.spr().pearl).join());
  frames(3);
};

module.exports.task4 = ({ G, ok, frames, E }) => {
  const st = G.state;
  ok('every shop entry has a name and a description', E.ORDER.every((id) => G.META[id] && G.META[id].name && String(G.META[id].desc()).length > 0), E.ORDER.filter((id) => !G.META[id]).join());
  G.setLv(E.zeroLevels()); st.autoSell = false; st.sparks = 0;
  let sum = 0; const kinds = E.PEARLS.flatMap((t) => [t.id, t.id + ':s']);
  kinds.forEach((k, i) => { st.inv[k] = 1; st.invV[k] = 10 + i; sum += 10 + i; });
  G.sellAll(true);
  ok('sell all covers every type and shiny stack', Math.abs(st.sparks - sum) < 1e-9 && kinds.every((k) => st.inv[k] === 0 && st.invV[k] === 0), st.sparks + ' of ' + sum);
  kinds.forEach((k) => { st.inv[k] = 0; });
  G.setSelling(false); G.els.pack.hidden = false; st.inv.golden = 1; st.invV.golden = 12; st.inv.pearl = 3; st.invV.pearl = 6; st.inv['pearl:s'] = 2; st.invV['pearl:s'] = 20;
  G.updatePack();
  const kinds3 = G.slotEls.slice(0, 4).map((x) => x.kind);
  ok('backpack packs owned stacks together from the first slot, in roster order', G.slotEls.length === 20 && kinds3.join() === 'pearl,golden,pearl:s,' , kinds3.join());
  ok('empty backpack slots are hidden, not drawn as boxes', G.slotEls.slice(0, 3).every((x) => !x.el.hidden) && G.slotEls.slice(3).every((x) => x.el.hidden), G.slotEls.map((x) => (x.el.hidden ? 0 : 1)).join(''));
  kinds.forEach((k) => { st.inv[k] = 0; st.invV[k] = 0; }); G.els.pack.hidden = true;
  frames(2);
};

module.exports.task5 = ({ G, ok, frames, E }) => {
  const st = G.state;
  G.setLv(E.zeroLevels()); st.pool = ['pearl']; st.autoSell = false; G.clearBoard();
  const roll = (n) => { let sh = 0; for (let i = 0; i < n; i++) { G.trySpawn(); const p = G.pearls[G.pearls.length - 1]; if (p && p.shiny) sh++; if (p) { p.cell.p = null; G.pearls.pop(); } } return sh / n; };
  st.shinyOn = true; const r = roll(40000);
  ok('shiny spawn rate is about 0.5% at base', r > 0.0035 && r < 0.0065, (r * 100).toFixed(3) + '%');
  const lv = E.zeroLevels(); lv.shiny = 4; G.setLv(lv); const r4 = roll(20000);
  ok('Shiny Hunter raises the rate', r4 > r * 1.5, (r4 * 100).toFixed(2) + '%');
  G.setLv(E.zeroLevels()); st.shinyOn = false;
  ok('shiny toggle off stops shiny spawns', roll(20000) === 0);
  G.clearBoard();
  const a = G.cells.find((c) => !c.p), pn = G.spawnAt(a, 'pearl', false), b = G.cells.find((c) => !c.p), ps = G.spawnAt(b, 'pearl', true);
  ok('toggling shinies off leaves an existing shiny pearl alone', ps.shiny === true && pn.shiny === false);
  st.inv['pearl'] = 0; st.invV['pearl'] = 0; st.inv['pearl:s'] = 0; st.invV['pearl:s'] = 0; st.col.pearl.popped = 0; st.col.pearl.sPopped = 0; st.col.pearl.sFound = false;
  G.setCombo(0); G.popPearl(pn, 'tap'); G.setCombo(0); G.popPearl(ps, 'tap');
  ok('a shiny pays exactly 5x', Math.abs(st.invV['pearl:s'] / st.invV['pearl'] - 5) < 1e-9, st.invV['pearl:s'] + ' vs ' + st.invV['pearl']);
  ok('shinies land in their own stack and collection entry', st.inv['pearl:s'] === 1 && st.inv['pearl'] === 1 && st.col.pearl.popped === 1 && st.col.pearl.sPopped === 1 && st.col.pearl.sFound);
  frames(3);
};

module.exports.task6 = ({ G, ok, frames, E }) => {
  const st = G.state;
  const sum = (v) => v.rows.reduce((a, r) => a + (r.inPool ? r.p : 0), 0);
  // everything unlocked and maxed: any type may be switched off
  const lv = maxed(E); G.loadState({ version: 2, lv }); G.recalc(); ['blue', 'mint', 'golden'].forEach((k) => { st.col[k].found = true; }); st.pool = ['pearl', 'blue'];
  const before = G.poolView();
  ok('pool view lists only discovered types', before.rows.map((r) => r.id).join() === 'pearl,blue,mint,golden' && !before.rows.find((r) => r.id === 'ruby'), before.rows.map((r) => r.id).join());
  ok('pool chances add to 100%', Math.abs(sum(before) - 1) < 1e-9);
  const blueBefore = before.rows.find((r) => r.id === 'blue').p;
  G.togglePool('golden');
  const after = G.poolView();
  ok('adding a type shifts the live chances', after.rows.find((r) => r.id === 'golden').inPool && after.rows.find((r) => r.id === 'blue').p < blueBefore && Math.abs(sum(after) - 1) < 1e-9, 'blue ' + blueBefore.toFixed(3) + ' -> ' + after.rows.find((r) => r.id === 'blue').p.toFixed(3));
  G.togglePool('pearl');
  ok('with the next type maxed, a type can be switched off and the rest rescale to 100%', !G.poolView().rows.find((r) => r.id === 'pearl').inPool && Math.abs(sum(G.poolView()) - 1) < 1e-9);
  G.togglePool('blue'); G.togglePool('golden');
  ok('the pool is never left empty', st.pool.length >= 1 && E.poolChances(st.pool, st.lv)[st.pool[0]] > 0, st.pool.join());
  // now an early game: blue just unlocked, not maxed, so the base pearl is locked in
  const early = E.zeroLevels(); early.lucky = 3; G.loadState({ version: 2, lv: early }); G.recalc(); st.col.blue.found = true; st.pool = ['pearl', 'blue'];
  const row = G.poolView().rows.find((r) => r.id === 'pearl');
  ok('the base pearl is locked on until Blue Pearls are maxed', row.locked === true && row.inPool === true && /Blue Pearls/.test(row.need), JSON.stringify(row));
  const pBefore = JSON.stringify(G.poolView().rows.map((r) => r.p));
  ok('a locked type refuses to switch off and changes nothing', G.togglePool('pearl') === false && st.pool.includes('pearl') && JSON.stringify(G.poolView().rows.map((r) => r.p)) === pBefore);
  G.togglePool('ruby');
  ok('an undiscovered type cannot be added', !st.pool.includes('ruby'));
  st.shinyOn = true; G.setShiny(false);
  ok('shiny toggle flips state', st.shinyOn === false && G.poolView().shinyOn === false);
  G.setShiny(true);
};

module.exports.task7 = ({ G, ok, frames, E }) => {
  const st = G.state;
  G.loadState({ version: 2, lv: E.zeroLevels() }); G.recalc();
  const ruby = E.PEARLS.findIndex((t) => t.id === 'ruby'), rose = 0;
  let v = G.bookView(ruby);
  ok('an undiscovered page shows no name or stats', v.left.found === false && v.left.name === '???' && v.left.hp === null && v.right.found === false && v.right.name === '???', JSON.stringify(v.left));
  v = G.bookView(rose);
  ok('the first page shows the base pearl', v.left.found && v.left.name === 'Rose Pearl' && v.left.hp === 1 && v.left.mult === 1 && v.right.found === false && v.right.shiny === true);
  ok('collection counts start at 1 of 20', JSON.stringify(G.bookCount()) === JSON.stringify({ found: 1, total: 20 }), JSON.stringify(G.bookCount()));
  G.discover('ruby', false);
  v = G.bookView(ruby);
  ok('discovering a type reveals its page', v.left.found && v.left.name === 'Ruby Pearl' && v.left.hp === 200 && v.left.mult === 51000);
  G.discover('ruby', true); v = G.bookView(ruby);
  ok('shiny entry counts separately and shows 5x payout', v.right.found && v.right.mult === 255000 && G.bookCount().found === 3, JSON.stringify(G.bookCount()));
  ok('a book page exists for every type', E.PEARLS.every((t, i) => G.bookView(i).left.id === t.id && G.bookView(i).right.id === t.id));
  ok('out-of-range pages are clamped', G.bookView(-4).left.id === 'pearl' && G.bookView(99).left.id === 'black');
};

module.exports.final = ({ G, ok, E }) => {
  const st = G.state;
  G.loadState({ sparks: 10, lv: Object.assign(E.zeroLevels(), { tool: 1 }), inv: {}, invV: {}, seen: { pearl: true, blue: true, golden: true, marble: true }, t: 0 });
  ok('v1 save after a Fresh Batch pools every seen type so a re-buy spawns it', st.pool.includes('golden') && st.pool.includes('marble'), st.pool.join());
  const lv = E.zeroLevels(); lv.golden = 1; G.setLv(lv);
  ok('re-bought golden is live in the chances', (E.poolChances(st.pool, st.lv).golden || 0) > 0);
  G.loadState({ version: 2, lv: E.zeroLevels() }); G.recalc(); st.col.blue.found = st.col.golden.found = true; st.pool = ['blue', 'golden'];
  const v = G.poolView();
  // the largest payouts: Black Pearl in the book (shiny 950K) and on its pool card (190K)
  E.PEARLS.forEach((t) => { st.col[t.id].found = true; st.col[t.id].sFound = true; });
  const bk = G.bookView(9), pay = (html) => (html.match(/Payout: <b>([^<]*)<\/b>/) || [])[1];
  ok('book shows the largest payouts short: x190K and x950K', pay(G.bookEntryHTML(bk.left)) === 'x190K' && pay(G.bookEntryHTML(bk.right)) === 'x950K', pay(G.bookEntryHTML(bk.right)));
  const blackRow = G.poolView().rows.find((r) => r.id === 'black');
  ok('pool card shows the black payout as x190K', blackRow && blackRow.pay === 'x190K payout', blackRow && blackRow.pay);
  ok('every pool and book payout fits in 13 / 6 characters', G.poolView().rows.every((r) => r.pay.length <= 13) && E.PEARLS.every((t, i) => pay(G.bookEntryHTML(G.bookView(i).right)).length <= 6),
    G.poolView().rows.map((r) => r.pay).join(' | '));
  ok('shop text formats the payout', /: x190K payout, 320 hits/.test(G.META.black.desc()), G.META.black.desc());
  // away bonus: idle rate x half, at the pool's expected payout per pop
  const lvA = Object.assign(E.zeroLevels(), { auto: 4, sharp: 3, lucky: 3, mint: 2, golden: 1 }); G.setLv(lvA); st.pool = ['pearl', 'blue', 'mint', 'golden'];
  const away = () => { const b = st.sparks; G.awayBonus(3600); return st.sparks - b; };
  const g1 = away(), want = E.idleRate(G.getS(), st.pool, st.lv) * 1800;
  ok('away bonus for 1 h = idle rate at pool EV x 50%', Math.abs(g1 - want) < 1e-6 * want && g1 > E.stats(st).autoRate * E.stats(st).popBase * 1800, g1.toFixed(0));
  lvA.golden = 5; G.setLv(lvA); const g2 = away();
  ok('away bonus grows with the golden chance', g2 > g1, g1.toFixed(0) + ' -> ' + g2.toFixed(0));
  const g8 = away.call(null), cap = (() => { const b = st.sparks; G.awayBonus(86400); return st.sparks - b; })();
  ok('away bonus still caps at 8 h', Math.abs(cap - g8 * 8) < 1e-6 * cap, (cap / g8).toFixed(2));
  G.loadState({ version: 2, lv: E.zeroLevels() }); G.recalc(); st.col.blue.found = st.col.golden.found = true; st.pool = ['blue', 'golden'];
  const v2 = G.poolView();
  ok('rose cannot be dropped from an early pool, so it still fills the board', v2.rows.find((r) => r.id === 'pearl').inPool && v2.rows.find((r) => r.id === 'pearl').p === 1, JSON.stringify(v2.rows.map((r) => [r.id, r.p])));
};
