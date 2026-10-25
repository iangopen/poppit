// The Hall of Ducks and the equip slots in the real game (run from tests/harness32.js). Date.now is pinned.
// It prints one run in plain numbers ("duck run:" lines): a Blue Duck crafted, Blue and Rose payouts before and after,
// and a sixth relic left unequipped.
module.exports = ({ G, ok, frames, E, store, els }) => {
  const st = G.state, A = require('../src/artifacts.js'), F = require('../src/forge.js'), realNow = Date.now, run = [];
  let now = 1.95e12; Date.now = () => now;
  const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
  const fresh = () => { G.resetRun(); G.clearBoard(); G.setMeter(0); };
  // one auto-sold pop of a type at combo 0, no frenzy: what it pays
  const pay = (kind, src, shiny) => {
    st.autoSell = true; const k = st.keep[kind]; delete st.keep[kind];
    const c = G.cells.find((x) => !x.p), p = G.spawnAt(c, kind, !!shiny); p.born = 1; p.hp = 1; G.setCombo(0);
    const s0 = st.sparks; G.popPearl(p, src || 'tap'); if (k) st.keep[kind] = true; return st.sparks - s0;
  };
  const fx = [1, 2, 3].map((i) => ({ id: 'fx_relic' + i, hall: 'relics', name: 'Test Relic ' + i, description: 'test only', cost: [{ kind: 'material', id: 'rosegold', qty: 1 }], repeatFactor: 1, costGrowth: 1, bonus: { type: 'spawn', value: 1.01 } }));
  try {
    G.loadState({ version: 8, lv: E.zeroLevels() }); fresh();
    G.setLv(Object.assign(E.zeroLevels(), { auto: 3, lucky: 2 })); G.recalc();

    // ---- the Hall of Ducks tab lists ten ducks, each with its recipe ----
    const hall = G.artView()[0];
    ok('the Hall of Ducks lists ten ducks, the Pink Duck first, each with its own pearl recipe', hall.items.length === 10 && hall.items[0].id === 'pink_duck' &&
      hall.items.slice(1).every((a, i) => a.name === A.TYPE_DUCKS[i].name && a.cost.length === 1 && a.cost[0].kind === A.TYPE_DUCKS[i].pearl && a.cost[0].qty === A.TYPE_DUCKS[i].qty),
      hall.items.map((a) => a.name + ' ' + a.cost[0].qty).join(', '));
    for (const t of E.PEARLS) st.col[t.id].found = true; G.setArtTab('ducks'); els.arts.hidden = false; G.updateArts();
    const html = G.hallHTML();
    ok('every duck pedestal shows its name and recipe line once its type is found', A.TYPE_DUCKS.every((d) => html.includes('<h5 class="plabel">' + d.name + '</h5>') && html.includes(' of ' + d.qty.toLocaleString('en-US') + ' ' + d.pearls + 's kept')), '');

    // ---- a Blue Duck: Blue pops pay x1.4, Rose pops do not change ----
    const blue0 = pay('blue'), rose0 = pay('pearl'), blueH0 = pay('blue', 'auto'), blueS0 = pay('blue', 'tap', true), away0 = G.awayBonus(3600).gain;
    st.keep.blue = true; st.inv.blue = 1700; st.invV.blue = 1700 * 10;
    const d = G.craftArtifact('blue_duck', () => 0); G.closeReveal && G.closeReveal();
    const blue1 = pay('blue'), rose1 = pay('pearl'), blueH1 = pay('blue', 'auto'), blueS1 = pay('blue', 'tap', true), away1 = G.awayBonus(3600).gain;
    run.push('Blue Pearls kept 1,700 -> ' + st.inv.blue + ' after crafting a Blue Duck (' + d.rarity + ', ' + (d.perks.length ? 'perks' : 'no perks') + ')');
    run.push('Blue pop pays ' + blue0.toFixed(2) + ' -> ' + blue1.toFixed(2) + ' (x' + (blue1 / blue0).toFixed(3) + '); Rose pop pays ' + rose0.toFixed(2) + ' -> ' + rose1.toFixed(2) + ' (unchanged)');
    run.push('Blue helper pop ' + blueH0.toFixed(2) + ' -> ' + blueH1.toFixed(2) + ', shiny Blue ' + blueS0.toFixed(2) + ' -> ' + blueS1.toFixed(2) + ', away 1 h ' + away0.toFixed(0) + ' -> ' + away1.toFixed(0));
    ok('crafting the Blue Duck spends 1,600 kept Blue Pearls and puts it on its pedestal', d && st.inv.blue === 100 && st.artifacts.blue_duck.active === d.id && !st.artEquip.includes('blue_duck'));
    ok('a Blue pop pays x1.4 and a Rose pop is unchanged', near(blue1 / blue0, 1.4) && near(rose1, rose0), (blue1 / blue0) + ' ' + rose1 + ' ' + rose0);
    ok('helper pops and shiny pops of Blue follow', near(blueH1 / blueH0, 1.4) && near(blueS1 / blueS0, 1.4));
    const S = G.getS(), pool = st.pool, h = E.helperIdle(S, pool, st.lv);
    ok('the away bonus follows: it rises by exactly the Blue share of the helper value', away1 > away0 && away1 / away0 < 1.4 && near(away1, E.idleRate(S, pool, st.lv, st.shinyOn) * 3600 * S.awayShare) && h.mix.blue > 0, (away1 / away0).toFixed(4));
    ok('the pedestal line names the Blue payout and the global multiplier stays x1', /Blue Duck \(Common\)\. Together: Blue Pearl payouts x1\.4\.$/.test(G.pedestalLine()) && S.artMult === 1, G.pedestalLine());

    // ---- the stash warning for any pearl type ----
    const bd = F.byId('blue_dust');
    delete st.artifacts.blue_duck; G.recalc();
    st.inv.blue = 1650; const w1 = G.stashWarn(bd);
    st.inv.blue = 1670; const w2 = G.stashWarn(bd);
    st.inv.blue = 60; const w3 = G.stashWarn(bd);
    A.addCopy(st.artifacts, 'blue_duck', 'common', []); G.recalc(); st.inv.blue = 450; const w4 = G.stashWarn(bd);
    st.inv.blue = 900; st.inv.mint = 800; st.keep.mint = true; const w5 = G.stashWarn(bd), w6 = G.stashWarn(F.byId('mint_dust'));
    run.push('Stash warning, Blue Dust (70 Blue): "' + w1 + '"; with a duck owned: "' + w4 + '"');
    ok('a Start that would leave fewer Blue Pearls than the Blue Duck needs says so', w1 === 'Uses 70 of your 1,650 kept Blue Pearls (the Blue Duck needs 1,600)' && w2 === '', w1 + ' | ' + w2);
    ok('it stays silent when the Start is unaffordable, and follows the repeat cost once a duck is owned', w3 === '' && w4 === 'Uses 70 of your 450 kept Blue Pearls (the Blue Duck needs 400)' && w5 === '', w4);
    ok('and covers every type: Mint Dust names the Mint Duck', w6 === 'Uses 45 of your 800 kept Mint Pearls (the Mint Duck needs 760)', w6);
    const rw = G.stashWarn(F.byId('rose_dust'));
    st.inv.pearl = 5000; st.keep.pearl = true; const rw2 = G.stashWarn(F.byId('rose_dust'));
    ok('the Rose warning is unchanged: the Pink Duck', rw === '' && rw2 === 'Uses 100 of your 5,000 kept Rose Pearls (the Pink Duck needs 10,000)', rw2);

    // ---- equip slots: five equipped, the sixth waits ----
    G.ARTS.ARTIFACTS.push(...fx);
    st.forge.stock = { rosegold: 12, azure_steel: 6, mintsilver: 4 };
    const order = ['rose_lantern', 'blue_compass', 'mint_clock', fx[0].id, fx[1].id, fx[2].id];
    for (const id of order) { G.craftArtifact(id, () => 0); G.closeReveal && G.closeReveal(); }
    run.push('Six relics crafted: equipped ' + st.artEquip.join(', ') + '; ' + fx[2].name + ' equipped: ' + st.artEquip.includes(fx[2].id));
    ok('five relics equip themselves as they are crafted; the sixth stays unequipped', st.artEquip.join() === order.slice(0, 5).join() && A.count(st.artifacts, fx[2].id) === 1, st.artEquip.join());
    const sp5 = G.getS().spawnEvery;
    ok('the sixth gives nothing until it has a slot', /Test Relic 3 \(Common, not equipped\)/.test(G.pedestalLine()) && G.equipArt(fx[2].id) === false, G.pedestalLine());
    const cards = G.artView()[1].items;
    ok('relic cards say whether they are equipped', cards.find((a) => a.id === 'mint_clock').slot === 'Equipped (slot 3 of 5)' && cards.find((a) => a.id === fx[2].id).slot === 'Not equipped: it does nothing until it has a slot (all 5 are full)', cards.find((a) => a.id === fx[2].id).slot);
    ok('swap puts the sixth in a slot and the first one out', G.swapArt(fx[0].id, fx[2].id) === true && st.artEquip.join() === ['rose_lantern', 'blue_compass', 'mint_clock', fx[2].id, fx[1].id].join() && near(G.getS().spawnEvery, sp5));
    const meter0 = G.getS().meterMult;
    ok('unequipping the Rose Lantern removes its frenzy meter bonus; equipping brings it back', G.unequipArt('rose_lantern') === true && G.getS().meterMult === 1 && meter0 === 1.25 && G.equipArt('rose_lantern') === true && G.getS().meterMult === 1.25);
    ok('the equip list is saved', JSON.stringify(G.serialize().artEquip) === JSON.stringify(st.artEquip));

    // ---- save, save code, import, backup, Fresh Batch, Reset ----
    const eqJ = JSON.stringify(st.artEquip), artJ = JSON.stringify(st.artifacts);
    G.save(); ok('a save and reload keep the equipped relics', G.loadState(JSON.parse(store['poppit.v1'])) === 'ok' && JSON.stringify(st.artEquip) === eqJ, JSON.stringify(st.artEquip));
    const code = G.encodeSave(G.serialize()); G.loadState({ version: 8 });
    ok('a save code carries them', JSON.stringify(st.artEquip) === '[]' && G.loadState(G.decodeSave(code)) === 'ok' && JSON.stringify(st.artEquip) === eqJ);
    G.save(); const raw = store['poppit.v1'];
    ok('importing another save replaces them and backs up the old one with them', G.checkImport(G.encodeSave({ version: 8, sparks: 1 })) === 'ok' && G.applyImport() === true && JSON.stringify(st.artEquip) === '[]' && store['poppit.backup'] === raw);
    ok('Restore brings them back', G.restoreBackup() === 'ok' && JSON.stringify(st.artEquip) === eqJ && JSON.stringify(st.artifacts) === artJ);
    ok('a loaded list is clamped: unknown, unowned, duplicate and duck ids dropped, five at most',
      G.loadState({ version: 8, artifacts: JSON.parse(artJ), artEquip: ['ghost', 'mint_clock', 'mint_clock', 'blue_duck', fx[0].id, 'rose_lantern', fx[1].id, fx[2].id, 'blue_compass'] }) === 'ok' && st.artEquip.join() === ['mint_clock', fx[0].id, 'rose_lantern', fx[1].id, fx[2].id].join(), st.artEquip.join());
    G.loadState(G.decodeSave(code));
    st.runEarned = E.COLLAPSE_MIN_RUN * 1.2; st.flavorJuice = E.flavorJuiceFor(st.echoes + E.flavorNeed(st.echoes)); G.updateShelf();
    els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {}); frames(160);
    ok('Fresh Batch keeps the equipped relics and the ducks', !G.getCollapse() && JSON.stringify(st.artEquip) === eqJ && JSON.stringify(st.artifacts) === artJ && near(G.getS().typeMult.blue, 1.4));
    G.ARTS.ARTIFACTS.splice(G.ARTS.ARTIFACTS.indexOf(fx[0]), 3);
    els.resetBtn.fire('click', {}); els.resetBtn.fire('click', {});
    ok('Reset save forgets them', JSON.stringify(st.artEquip) === '[]' && JSON.stringify(st.artifacts) === '{}' && JSON.stringify(G.getS().typeMult) === '{}');

    // ---- an old v7 save: its relics equip themselves and play as before ----
    G.loadState({ version: 7, artifacts: { rose_lantern: { active: 1, copies: [{ id: 1, rarity: 'common', perks: [] }] }, mint_clock: { active: 2, copies: [{ id: 2, rarity: 'rare', perks: [{ stat: 'away', value: 0.1 }] }] } } });
    G.recalc();
    ok('a v7 save with two relics loads them equipped, with their effects', st.artEquip.join() === 'rose_lantern,mint_clock' && G.getS().meterMult === 1.25 && near(G.getS().awayShare, E.AWAY_SHARE * 1.3), st.artEquip.join() + ' ' + G.getS().meterMult + ' ' + G.getS().awayShare);
  } finally {
    Date.now = realNow;
    for (const a of fx) { const i = G.ARTS.ARTIFACTS.indexOf(a); if (i >= 0) G.ARTS.ARTIFACTS.splice(i, 1); }
  }
  for (const l of run) console.log('duck run: ' + l);
};
