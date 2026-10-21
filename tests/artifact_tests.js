// Artifacts, Keep and save v4 in the real game (run from tests/harness32.js).
module.exports = ({ G, ok, frames, E, store, els }) => {
  const st = G.state, A = require('../src/artifacts.js');
  const fresh = () => { G.resetRun(); G.clearBoard(); G.setMeter(0); };
  const popRose = (src) => { const c = G.cells.find((x) => !x.p); const p = G.spawnAt(c, 'pearl', false); p.born = 1; G.setCombo(0); G.popPearl(p, src); };
  const gain = (src, autoSell) => { st.autoSell = autoSell; const s0 = st.sparks, v0 = st.invV.pearl; popRose(src); return autoSell ? st.sparks - s0 : st.invV.pearl - v0; };
  G.loadState({ version: 4, lv: E.zeroLevels() }); fresh();
  ok('a new game owns no artifacts and keeps nothing', JSON.stringify(st.artifacts) === '{}' && JSON.stringify(st.keep) === '{}' && G.getS().artMult === 1);

  // the payout multiplier: a plain pop into the backpack, an auto-sell pop and a helper pop
  const before = [gain('tap', false), gain('tap', true), gain('auto', true)];
  st.artifacts.pink_duck = true; G.recalc();
  const after = [gain('tap', false), gain('tap', true), gain('auto', true)];
  ok('the Pink Duck pays x1.25 on a backpack pop, an auto-sell pop and a helper pop', after.every((a, i) => Math.abs(a / before[i] - 1.25) < 1e-9), before.map((b, i) => b.toFixed(2) + '->' + after[i].toFixed(2)).join(' '));
  ok('the payout line shows the duck', G.payoutLine() === 'Payouts x1.25 (ducks x1.25)', G.payoutLine());
  st.echoes = 2; G.recalc();
  ok('and the Flavors with it', G.payoutLine() === 'Payouts x1.75 (Flavors 2 x1.4, ducks x1.25)', G.payoutLine());
  st.echoes = 0; delete st.artifacts.pink_duck; G.recalc();
  ok('without a duck the line is back to Flavors only, or hidden', G.payoutLine() === '');

  // Keep
  st.autoSell = true; st.inv.pearl = 0; st.invV.pearl = 0; const s0 = st.sparks;
  G.setKeep('pearl', true); popRose('tap');
  ok('a kept type pops into the backpack with auto-sell on', st.inv.pearl === 1 && st.invV.pearl > 0 && st.sparks === s0 && G.isKept('pearl') && G.isKept('pearl:s') && !G.isKept('blue'));
  st.inv.pearl = 3; st.invV.pearl = 6; st.inv.blue = 5; st.invV.blue = 50; st.inv['pearl:s'] = 1; st.invV['pearl:s'] = 10;
  const s1 = st.sparks; G.setSelling(false); G.updatePack(); G.sellAll(); G.setSelling(false); G.updatePack();
  ok('Sell all skips kept stacks (and their shinies) and sells the rest', st.inv.pearl === 3 && st.inv['pearl:s'] === 1 && st.inv.blue === 0 && Math.abs(st.sparks - s1 - 50) < 1e-9, st.inv.pearl + ' ' + st.inv.blue);
  const s2 = st.sparks; G.sellSome('pearl', 2);
  ok('a kept stack can still be sold by choosing it', st.inv.pearl === 1 && Math.abs(st.sparks - s2 - 4) < 1e-9);
  G.setKeep('blue', true); G.setKeep('blue', false);
  ok('Keep switches off again', !G.isKept('blue') && !('blue' in st.keep));

  // crafting from the panel code
  st.inv.pearl = 9999; st.invV.pearl = 9999;
  ok('the Craft button stays disabled while short', G.artView()[0].items[0].can === false && G.craftArtifact('pink_duck') === false && st.inv.pearl === 9999);
  st.inv.pearl = 10500; st.invV.pearl = 21000;
  const card = G.artView()[0].items[0];
  ok('the card shows the hall, the cost progress and that Rose is kept', G.artView()[0].name === 'Hall of Ducks' && card.cost[0].have === 10500 && card.cost[0].qty === 10000 && card.cost[0].kept && card.cost[0].label === 'Rose Pearls' && card.can);
  ok('crafting spends exactly 10,000 kept Rose Pearls', G.craftArtifact('pink_duck') === true && st.inv.pearl === 500 && Math.abs(st.invV.pearl - 1000) < 1e-9 && st.artifacts.pink_duck === true && G.getS().artMult === 1.25);
  ok('and cannot be crafted twice', G.craftArtifact('pink_duck') === false && st.inv.pearl === 500 && G.artView()[0].items[0].owned);

  // Fresh Batch keeps kept stacks and owned artifacts
  st.inv.pearl = 7000; st.invV.pearl = 7000; st.inv.blue = 4; st.invV.blue = 40; st.inv['pearl:s'] = 2;
  st.runEarned = E.COLLAPSE_MIN_RUN * 1.2; const echo0 = st.echoes; G.updateShelf();
  els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {}); frames(160);
  ok('Fresh Batch keeps the kept Rose stacks and the duck, and wipes the rest', !G.getCollapse() && st.echoes > echo0 && st.inv.pearl === 7000 && st.inv['pearl:s'] === 2 && st.inv.blue === 0 && st.artifacts.pink_duck === true && st.keep.pearl === true && G.getS().artMult === 1.25, 'pearl ' + st.inv.pearl + ', blue ' + st.inv.blue);

  // the dock button
  const pop0 = st.col.pearl.popped, sp0 = st.col.pearl.sPopped;
  st.artifacts = {}; st.col.pearl.popped = 99; st.col.pearl.sPopped = 0; G.syncArtBtn();
  const hid = els.artBtn.hidden;
  st.col.pearl.popped = 100; G.syncArtBtn();
  ok('the Artifacts button shows from 100 Rose Pearls popped', hid === true && els.artBtn.hidden === false && els.stage.classList.contains('arts'));
  st.col.pearl.popped = 0; st.artifacts = { pink_duck: true }; G.syncArtBtn();
  ok('and always once an artifact is owned', els.artBtn.hidden === false);
  st.col.pearl.popped = pop0; st.col.pearl.sPopped = sp0;

  // save v4
  ok('SAVE_VERSION is 4', G.SAVE_VERSION === 4);
  const m = G.migrateSave({ version: 3, sparks: 5, inv: { pearl: 50 } }).save;
  ok('a v3 save migrates with no artifacts and nothing kept', m.version === 4 && JSON.stringify(m.artifacts) === '{}' && JSON.stringify(m.keep) === '{}' && m.inv.pearl === 50);
  ok('and loads that way', G.loadState({ version: 3, inv: { pearl: 50 } }) === 'ok' && JSON.stringify(st.artifacts) === '{}' && JSON.stringify(st.keep) === '{}' && st.inv.pearl === 50);
  ok('a v1 save walks every step to v4', G.migrateSave({ sparks: 1, lv: {} }).save.version === 4);
  ok('loaded artifacts and Keep keep only known ids set to true', G.loadState({ version: 4, artifacts: { pink_duck: true, golden_goose: true, x: 'yes' }, keep: { pearl: true, blue: 1, dragon: true, golden: 'yes', mint: true } }) === 'ok' &&
    JSON.stringify(st.artifacts) === '{"pink_duck":true}' && JSON.stringify(st.keep) === '{"pearl":true,"mint":true}', JSON.stringify([st.artifacts, st.keep]));
  ok('a non-object artifacts or keep loads as empty', G.loadState({ version: 4, artifacts: ['pink_duck'], keep: 'pearl' }) === 'ok' && JSON.stringify(st.artifacts) === '{}' && JSON.stringify(st.keep) === '{}');
  ok('a v5 save is refused', G.loadState({ version: 5, artifacts: {} }) === 'newer');

  // round trip: serialize, save code, import with its backup, restore
  G.loadState({ version: 4, sparks: 77, artifacts: { pink_duck: true }, keep: { pearl: true, coral: true }, inv: { pearl: 1234 } }); G.recalc();
  const ser = G.serialize();
  ok('serialize writes artifacts and keep', ser.version === 4 && ser.artifacts.pink_duck === true && ser.keep.pearl === true && ser.keep.coral === true);
  const code = G.encodeSave(ser);
  G.loadState({ version: 4 });
  ok('a save code carries artifacts and keep', G.loadState(G.decodeSave(code)) === 'ok' && st.artifacts.pink_duck === true && st.keep.coral === true && st.inv.pearl === 1234);
  G.save(); const raw = store['poppit.v1'];
  const other = G.encodeSave(Object.assign(G.serialize(), { artifacts: {}, keep: {}, sparks: 5 }));
  ok('importing another code replaces them and backs up the old save with them', G.checkImport(other) === 'ok' && G.applyImport() === true && JSON.stringify(st.artifacts) === '{}' && store['poppit.backup'] === raw && JSON.parse(raw).artifacts.pink_duck === true);
  ok('restoring the backup brings the duck and the Keep set back', G.restoreBackup() === 'ok' && st.artifacts.pink_duck === true && st.keep.pearl === true && G.getS().artMult === 1.25);
  ok('Reset save forgets artifacts and Keep', (els.resetBtn.fire('click', {}), els.resetBtn.fire('click', {}), JSON.stringify(st.artifacts) === '{}' && JSON.stringify(st.keep) === '{}' && G.getS().artMult === 1));
};
