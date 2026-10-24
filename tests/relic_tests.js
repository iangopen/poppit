// Artifact copies, the pedestal, rolls and perks, alloys and the Hall of Relics in the real game (run from tests/harness32.js).
// Date.now is pinned. It prints one full run in plain numbers ("run:" lines) besides its PASS/FAIL checks.
module.exports = ({ G, ok, frames, E, store, els }) => {
  const st = G.state, A = require('../src/artifacts.js'), F = require('../src/forge.js'), realNow = Date.now, run = [];
  let now = 1.9e12; Date.now = () => now;
  const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
  const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
  const fresh = () => { G.resetRun(); G.clearBoard(); G.setMeter(0); };
  // one auto-sold Rose pop at combo 0, no frenzy: what it pays
  const rosePay = (src) => { st.autoSell = true; const k = st.keep.pearl; delete st.keep.pearl; const c = G.cells.find((x) => !x.p), p = G.spawnAt(c, 'pearl', false); p.born = 1; G.setCombo(0); const s0 = st.sparks; G.popPearl(p, src || 'tap'); if (k) st.keep.pearl = true; return st.sparks - s0; };
  const perkTxt = (c) => (c.perks.length ? c.perks.map((p) => p.stat + ' +' + +(p.value * 100).toFixed(1) + '%').join(', ') : 'no perks');
  const stockTxt = () => F.ALL.filter((m) => st.forge.stock[m.id]).map((m) => m.name + ' ' + st.forge.stock[m.id]).join(', ') || 'empty';
  try {
    G.loadState({ version: 6, lv: E.zeroLevels() }); fresh();
    st.keep.pearl = true;

    // ---- the Pink Duck: craft, roll, craft again, swap ----
    const pay0 = rosePay(), help0 = rosePay('auto'); // a tap pop (combo 1) and a helper pop (combo 0)
    st.inv.pearl = 20500; st.invV.pearl = 41000;
    run.push('Rose pop pays ' + pay0.toFixed(2) + ' with no duck; Rose Pearls kept: ' + st.inv.pearl);
    const d1 = G.craftArtifact('pink_duck', () => 0); // rng 0: Common
    const pay1 = rosePay();
    run.push('Craft 1: Rose Pearls 20,500 -> ' + st.inv.pearl + ', rolled ' + d1.rarity + ' (' + perkTxt(d1) + '), on the pedestal; Rose pop pays ' + pay1.toFixed(2));
    ok('the first duck is Common, active, and pays x1.4', d1.rarity === 'common' && st.artifacts.pink_duck.active === d1.id && near(pay1 / pay0, 1.4) && st.inv.pearl === 10500);
    const d2 = G.craftArtifact('pink_duck', seq(0.995, 0, 0.5, 0, 0.5, 0, 0.5)); // 0.995: Mythic; then payout, shiny, frenzy at mid values
    const pay2 = rosePay();
    run.push('Craft 2 (a repeat, x0.25): Rose Pearls 10,500 -> ' + st.inv.pearl + ', rolled ' + d2.rarity + ' (' + perkTxt(d2) + '), waits off the pedestal; Rose pop still pays ' + pay2.toFixed(2));
    ok('a second craft of an owned duck spends 2,500 (repeatFactor 0.25) and rolls Mythic with 3 distinct perks', d2.rarity === 'mythic' && d2.perks.length === 3 && new Set(d2.perks.map((p) => p.stat)).size === 3 && st.inv.pearl === 8000 && A.count(st.artifacts, 'pink_duck') === 2);
    ok('the new copy does not replace the active one', st.artifacts.pink_duck.active === d1.id && near(pay2, pay1));
    const pv = d2.perks.find((p) => p.stat === 'payout').value;
    ok('setActive swaps to the Mythic copy', G.setActiveCopy('pink_duck', d2.id) === true && st.artifacts.pink_duck.active === d2.id);
    const pay3 = rosePay(), sh = G.poolView().shiny;
    run.push('Swap to copy ' + d2.id + ': Rose pop pays ' + pay1.toFixed(2) + ' -> ' + pay3.toFixed(2) + ' (x' + (pay3 / pay1).toFixed(3) + '), shiny chance ' + (E.shinyChance(st.lv) * 100).toFixed(3) + '% -> ' + (sh * 100).toFixed(3) + '%');
    ok('after the swap a pop pays x1.4 x (1 + payout perk), and the shiny perk shows in the pool', near(pay3 / pay0, 1.4 * (1 + pv)) && near(sh, E.shinyChance(st.lv) * (1 + d2.perks.find((p) => p.stat === 'shiny').value)));
    G.startFrenzy(); const fr = G.getFrenzy(); fresh();
    ok('the frenzy length perk lengthens a frenzy', near(fr, E.FRENZY_SECS * (1 + d2.perks.find((p) => p.stat === 'frenzy').value)), fr.toFixed(3) + ' s');
    const hp = rosePay('auto');
    ok('a helper pop pays the active payout perk too', near(hp / help0, 1.4 * (1 + pv)), (hp / help0).toFixed(4));
    G.setActiveCopy('pink_duck', d1.id); const pay4 = rosePay();
    run.push('Swap back to copy ' + d1.id + ': Rose pop pays ' + pay4.toFixed(2));
    ok('and swapping back restores the Common payout', near(pay4, pay1) && G.setActiveCopy('pink_duck', 999) === false);

    // ---- alloys and a relic ----
    st.forge.stock = { rose_dust: 12, blue_dust: 3, mint_dust: 1 }; st.col.blue.found = true; // Blue Dust comes from found Blue Pearls
    const pearls0 = JSON.stringify(st.inv);
    const rg = G.forgeView().recipes.find((r) => r.id === 'rosegold');
    ok('the forge lists Rosegold with its dust cost', rg && rg.alloy && rg.cost === '6 Rose Dust + 2 Blue Dust' && rg.time === '2m' && rg.can, rg && JSON.stringify(rg));
    run.push('Forge stock before: ' + stockTxt());
    G.forgeStartUI('rosegold'); now += 120000; G.forgeTick();
    st.forge.stock.blue_dust = (st.forge.stock.blue_dust || 0); // 1 left
    const why = G.startReason(F.byId('rosegold'));
    ok('a short alloy names the missing dust', why === 'Need 1 more Blue Dust: make it in the forge', why);
    st.forge.stock.blue_dust += 1; G.forgeStartUI('rosegold'); now += 120000; G.forgeTick();
    run.push('Two Rosegold jobs (2 min each): stock ' + stockTxt() + '; backpack pearls unchanged: ' + (JSON.stringify(st.inv) === pearls0));
    ok('two alloy jobs used exactly 12 Rose Dust and 4 Blue Dust and no pearls', st.forge.stock.rosegold === 2 && !st.forge.stock.rose_dust && !st.forge.stock.blue_dust && st.forge.stock.mint_dust === 1 && JSON.stringify(st.inv) === pearls0, stockTxt());
    const meter0 = G.getMeter();
    const lan = G.craftArtifact('rose_lantern', seq(0.95, 0.99, 0.5, 0.5, 0)); // 0.95: Epic
    run.push('Rose Lantern crafted: stock ' + stockTxt() + ', rolled ' + lan.rarity + ' (' + perkTxt(lan) + ')');
    ok('the Rose Lantern spends the 2 Rosegold and leaves the rest of the stock', lan && lan.rarity === 'epic' && lan.perks.length === 2 && !st.forge.stock.rosegold && st.forge.stock.mint_dust === 1);
    rosePay(); const dm = G.getMeter() - meter0;
    ok('and the frenzy meter now fills 25% faster', near(dm, 1.25), dm);
    const relicHall = G.artView()[1];
    ok('the Artifacts panel shows the Hall of Relics with alloy cost lines', relicHall.name === 'Hall of Artifacts' && relicHall.items.map((a) => a.id).join() === 'rose_lantern,blue_compass,mint_clock' &&
      relicHall.items[1].cost.map((c) => c.text).join(' / ') === '0 of 2 Azure Steel / 0 of 1 Rosegold' && relicHall.items[0].owned, relicHall.items[1].cost.map((c) => c.text).join(' / '));

    // ---- the Blue Compass speeds the forge and re-times a running job ----
    st.inv.pearl = 300; G.forgeStartUI('rose_dust'); const end0 = st.forge.slots[0].end - now;
    st.forge.stock.azure_steel = 2; st.forge.stock.rosegold = 1;
    G.craftArtifact('blue_compass', () => 0); frames(1);
    const end1 = st.forge.slots[0].end - now;
    run.push('Blue Compass crafted: Rose Dust job ' + end0 / 1000 + ' s left -> ' + (end1 / 1000).toFixed(2) + ' s; ' + G.forgeView().speed);
    ok('the Blue Compass makes the forge x1.3 and re-times the running job', near(st.forge.rate, 1.3) && near(end1, end0 / 1.3) && /^Forge speed x1\.3: level 0/.test(G.forgeView().speed), G.forgeView().speed);
    now += 30000; G.forgeTick();

    // ---- the away bonus with an away perk ----
    G.setLv(Object.assign(E.zeroLevels(), { auto: 3, lucky: 2 })); st.autoSell = true;
    const a0 = G.awayBonus(3600).gain;
    A.addCopy(st.artifacts, 'mint_clock', 'rare', [{ stat: 'away', value: 0.1 }]); G.equipArt('mint_clock');
    const a1 = G.awayBonus(3600).gain;
    run.push('Away 1 h: ' + a0.toFixed(0) + ' juice -> ' + a1.toFixed(0) + ' with a Mint Clock (x1.2) and its +10% away perk');
    ok('the away bonus pays the Mint Clock and its away perk: x1.3', near(a1 / a0, 1.3), (a1 / a0).toFixed(4));

    // ---- save, export, import, backup, Fresh Batch, Reset ----
    const artJson = JSON.stringify(st.artifacts), ser = G.serialize();
    ok('serialize writes the copies, rolls and pedestals', JSON.stringify(ser.artifacts) === artJson && ser.version === G.SAVE_VERSION);
    const code = G.encodeSave(ser); G.loadState({ version: 6 });
    ok('a save code brings back every copy with its roll, never re-rolled', G.loadState(G.decodeSave(code)) === 'ok' && JSON.stringify(st.artifacts) === artJson && near(G.getS().artMult, 1.4));
    G.save(); const raw = store['poppit.v1'];
    ok('importing another code replaces them and backs up the old save with them', G.checkImport(G.encodeSave({ version: 6, sparks: 1 })) === 'ok' && G.applyImport() === true && JSON.stringify(st.artifacts) === '{}' && store['poppit.backup'] === raw);
    ok('Restore brings the copies back', G.restoreBackup() === 'ok' && JSON.stringify(st.artifacts) === artJson);
    st.forge.stock = { rose_dust: 4, rosegold: 1, azure_steel: 2, mintsilver: 3 }; const stockJ = JSON.stringify(st.forge.stock); // stock order: dusts, then alloys
    G.save(); ok('alloys survive a save and reload', G.loadState(JSON.parse(store['poppit.v1'])) === 'ok' && JSON.stringify(st.forge.stock) === stockJ, JSON.stringify(st.forge.stock) + ' ' + store['poppit.v1'].slice(0, 0));
    const code2 = G.encodeSave(G.serialize()); G.loadState({ version: 6 });
    ok('and a save code', G.loadState(G.decodeSave(code2)) === 'ok' && JSON.stringify(st.forge.stock) === stockJ);
    st.runEarned = E.COLLAPSE_MIN_RUN * 1.2; G.updateShelf();
    els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {}); frames(160);
    ok('Fresh Batch keeps every copy, the pedestals and the alloys', !G.getCollapse() && JSON.stringify(st.artifacts) === artJson && JSON.stringify(st.forge.stock) === stockJ && near(G.getS().artMult, 1.4));
    els.resetBtn.fire('click', {}); els.resetBtn.fire('click', {});
    ok('Reset save forgets them', JSON.stringify(st.artifacts) === '{}' && JSON.stringify(st.forge.stock) === '{}' && G.getS().artMult === 1 && G.getS().forgeBonus === 0);

    // ---- an old v5 duck plays exactly as before ----
    fresh(); const base = rosePay();
    G.loadState({ version: 5, artifacts: { pink_duck: true } }); fresh();
    const old = rosePay();
    ok('a v5 save with the duck loads one Common copy on the pedestal, paying x1.4 as before', JSON.stringify(st.artifacts) === '{"pink_duck":{"copies":[{"id":1,"art":"pink_duck","rarity":"common","perks":[],"paid":[{"kind":"pearl","qty":10000}],"locked":false}],"active":1}}' && near(old / base, 1.4), JSON.stringify(st.artifacts));
  } finally { Date.now = realNow; }
  for (const l of run) console.log('run: ' + l);
};
