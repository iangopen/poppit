// Artifacts, Keep and the artifact saves in the real game (run from tests/harness32.js).
module.exports = ({ G, ok, frames, E, store, els }) => {
  const st = G.state, A = require('../src/artifacts.js');
  const ducks = () => A.count(st.artifacts, 'pink_duck'), oneDuck = () => ({ pink_duck: { copies: [{ id: 1, art: 'pink_duck', rarity: 'common', perks: [] }], active: 1 } }),
    oneDuckV7 = () => ({ pink_duck: { copies: [{ id: 1, art: 'pink_duck', rarity: 'common', perks: [], paid: [{ kind: 'pearl', qty: 10000 }], locked: false }], active: 1 } }); // after the v6 -> v7 step
  const fresh = () => { G.resetRun(); G.clearBoard(); G.setMeter(0); };
  const popRose = (src) => { const c = G.cells.find((x) => !x.p); const p = G.spawnAt(c, 'pearl', false); p.born = 1; G.setCombo(0); G.popPearl(p, src); };
  const gain = (src, autoSell) => { st.autoSell = autoSell; const s0 = st.sparks, v0 = st.invV.pearl; popRose(src); return autoSell ? st.sparks - s0 : st.invV.pearl - v0; };
  G.loadState({ version: 4, lv: E.zeroLevels() }); fresh();
  ok('a new game owns no artifacts and keeps nothing', JSON.stringify(st.artifacts) === '{}' && JSON.stringify(st.keep) === '{}' && G.getS().artMult === 1);

  // the payout multiplier: a plain pop into the backpack, an auto-sell pop and a helper pop
  const before = [gain('tap', false), gain('tap', true), gain('auto', true)];
  A.addCopy(st.artifacts, 'pink_duck', 'common', []); G.recalc();
  const after = [gain('tap', false), gain('tap', true), gain('auto', true)];
  ok('the Pink Duck pays x1.4 on a backpack pop, an auto-sell pop and a helper pop', after.every((a, i) => Math.abs(a / before[i] - A.PINK_DUCK_PAYOUT) < 1e-9) && A.PINK_DUCK_PAYOUT === 1.4, before.map((b, i) => b.toFixed(2) + '->' + after[i].toFixed(2)).join(' '));
  ok('the payout line shows the duck', G.payoutLine() === 'Payouts x1.4 (artifacts x1.4)', G.payoutLine());
  st.echoes = 2; G.recalc();
  ok('and the Flavors with it', G.payoutLine() === 'Payouts x1.68 (Flavors 2 x1.2, artifacts x1.4)', G.payoutLine());
  st.echoes = 0; st.artifacts = {}; G.recalc();
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
  ok('the Craft button stays disabled while short', G.artView()[0].items[0].can === false && G.craftArtifact('pink_duck') === null && st.inv.pearl === 9999);
  st.inv.pearl = 10500; st.invV.pearl = 21000;
  const card = G.artView()[0].items[0];
  ok('the card shows the hall, the cost progress and that Rose is kept', G.artView()[0].name === 'Hall of Ducks' && card.cost[0].have === 10500 && card.cost[0].qty === 10000 && card.cost[0].kept && card.cost[0].label === 'Rose Pearls' && card.can);
  const c1 = G.craftArtifact('pink_duck', () => 0); // rng 0 rolls Common
  ok('crafting spends exactly 10,000 kept Rose Pearls and puts a Common copy on the pedestal', c1 && c1.rarity === 'common' && st.inv.pearl === 500 && Math.abs(st.invV.pearl - 1000) < 1e-9 && ducks() === 1 && st.artifacts.pink_duck.active === c1.id && G.getS().artMult === A.PINK_DUCK_PAYOUT);
  ok('a second craft is refused while short and spends nothing', G.craftArtifact('pink_duck') === null && st.inv.pearl === 500 && G.artView()[0].items[0].owned);

  // Fresh Batch keeps kept stacks and owned artifacts
  st.inv.pearl = 7000; st.invV.pearl = 7000; st.inv.blue = 4; st.invV.blue = 40; st.inv['pearl:s'] = 2;
  st.runEarned = E.COLLAPSE_MIN_RUN * 1.2; const echo0 = st.echoes; G.updateShelf();
  els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {}); frames(160);
  ok('Fresh Batch keeps the kept Rose stacks and the duck, and wipes the rest', !G.getCollapse() && st.echoes > echo0 && st.inv.pearl === 7000 && st.inv['pearl:s'] === 2 && st.inv.blue === 0 && ducks() === 1 && st.keep.pearl === true && G.getS().artMult === A.PINK_DUCK_PAYOUT, 'pearl ' + st.inv.pearl + ', blue ' + st.inv.blue);

  // the dock button
  const pop0 = st.col.pearl.popped, sp0 = st.col.pearl.sPopped;
  st.artifacts = {}; st.col.pearl.popped = 99; st.col.pearl.sPopped = 0; G.syncArtBtn();
  const hid = els.artBtn.hidden;
  st.col.pearl.popped = 100; G.syncArtBtn();
  ok('the Artifacts button shows from 100 Rose Pearls popped', hid === true && els.artBtn.hidden === false && els.stage.classList.contains('arts'));
  st.col.pearl.popped = 0; st.artifacts = oneDuck(); G.syncArtBtn();
  ok('and always once an artifact is owned', els.artBtn.hidden === false);
  st.col.pearl.popped = pop0; st.col.pearl.sPopped = sp0;

  // save v4 (artifacts and Keep); v6 turned owned artifacts into copies
  ok('SAVE_VERSION is 8 (equip slots came after paid costs and locks)', G.SAVE_VERSION === 8);
  const m = G.migrateSave({ version: 3, sparks: 5, inv: { pearl: 50 } }).save;
  ok('a v3 save migrates with no artifacts and nothing kept', m.version === G.SAVE_VERSION && JSON.stringify(m.artifacts) === '{}' && JSON.stringify(m.keep) === '{}' && m.inv.pearl === 50);
  ok('and loads that way', G.loadState({ version: 3, inv: { pearl: 50 } }) === 'ok' && JSON.stringify(st.artifacts) === '{}' && JSON.stringify(st.keep) === '{}' && st.inv.pearl === 50);
  ok('a v1 save walks every step to the current version', G.migrateSave({ sparks: 1, lv: {} }).save.version === G.SAVE_VERSION);
  ok('a v4 save keeps only known artifacts set to true (as one Common copy each), and Keep only known ids', G.loadState({ version: 4, artifacts: { pink_duck: true, golden_goose: true, x: 'yes' }, keep: { pearl: true, blue: 1, dragon: true, golden: 'yes', mint: true } }) === 'ok' &&
    JSON.stringify(st.artifacts) === JSON.stringify(oneDuckV7()) && JSON.stringify(st.keep) === '{"pearl":true,"mint":true}', JSON.stringify([st.artifacts, st.keep]));
  ok('a non-object artifacts or keep loads as empty', G.loadState({ version: 4, artifacts: ['pink_duck'], keep: 'pearl' }) === 'ok' && JSON.stringify(st.artifacts) === '{}' && JSON.stringify(st.keep) === '{}');
  ok('a save newer than SAVE_VERSION is refused', G.loadState({ version: G.SAVE_VERSION + 1, artifacts: {} }) === 'newer');

  // round trip: serialize, save code, import with its backup, restore
  G.loadState({ version: 6, sparks: 77, artifacts: oneDuck(), keep: { pearl: true, coral: true }, inv: { pearl: 1234 } }); G.recalc();
  const ser = G.serialize();
  ok('serialize writes artifacts and keep', ser.version === G.SAVE_VERSION && JSON.stringify(ser.artifacts) === JSON.stringify(oneDuckV7()) && ser.keep.pearl === true && ser.keep.coral === true);
  const code = G.encodeSave(ser);
  G.loadState({ version: 4 });
  ok('a save code carries artifacts and keep', G.loadState(G.decodeSave(code)) === 'ok' && ducks() === 1 && st.keep.coral === true && st.inv.pearl === 1234);
  G.save(); const raw = store['poppit.v1'];
  const other = G.encodeSave(Object.assign(G.serialize(), { artifacts: {}, keep: {}, sparks: 5 }));
  ok('importing another code replaces them and backs up the old save with them', G.checkImport(other) === 'ok' && G.applyImport() === true && JSON.stringify(st.artifacts) === '{}' && store['poppit.backup'] === raw && JSON.parse(raw).artifacts.pink_duck.copies.length === 1);
  ok('restoring the backup brings the duck and the Keep set back', G.restoreBackup() === 'ok' && ducks() === 1 && st.keep.pearl === true && G.getS().artMult === A.PINK_DUCK_PAYOUT);
  ok('Reset save forgets artifacts and Keep', (els.resetBtn.fire('click', {}), els.resetBtn.fire('click', {}), JSON.stringify(st.artifacts) === '{}' && JSON.stringify(st.keep) === '{}' && G.getS().artMult === 1));
};
