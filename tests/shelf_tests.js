// The shelf: paid costs, scrap and refunds, locks, Common stacks, sort, the bulk action and the in-page confirmation
// (run from tests/harness32.js). Rolls are forced with a scripted rng, never in game code.
module.exports = ({ G, ok, E, store, els }) => {
  const st = G.state, A = G.ARTS;
  const FORCE = { common: () => 0, rare: () => 0.7, epic: () => 0.9, mythic: () => 0.99 };
  const tap = (el, attr, value, extra) => el.fire('click', { target: { closest: (sel) => (attr && sel === '[' + attr + ']' ? { dataset: Object.assign({ [attr.slice(5)]: value }, extra || {}), disabled: false } : null) } });
  const act = (a, copy) => tap(els.artHalls, 'data-sact', a, { art: 'pink_duck', copy: String(copy) });
  const key = (k) => els.confirm.fire('keydown', { key: k, stopPropagation() {}, preventDefault() {} });
  const shelf = () => G.artView()[0].items.find((x) => x.id === 'pink_duck').shelf;
  const ducks = () => st.artifacts.pink_duck.copies;
  G.loadState({ version: G.SAVE_VERSION, lv: E.zeroLevels() }); G.resetRun(); G.closeReveal(); els.arts.hidden = false; G.setArtTab('ducks');
  st.autoSell = true; st.keep.pearl = true; st.inv.pearl = 40000; st.invV.pearl = 80000;

  // paid cost at craft, and locks on new copies
  const c1 = G.craftArtifact('pink_duck', FORCE.common); G.closeReveal();
  const made = ['common', 'common', 'common', 'rare', 'epic', 'mythic'].map((r) => { const c = G.craftArtifact('pink_duck', FORCE[r]); G.closeReveal(); return c; });
  ok('each copy records what it cost: 10,000 for the first, 2,500 for each repeat', c1.paid[0].qty === 10000 && made.every((c) => c.paid[0].qty === 2500) && st.inv.pearl === 40000 - 10000 - 6 * 2500, made.map((c) => c.paid[0].qty).join());
  ok('new Epic and Mythic copies start locked; Common and Rare do not', made.map((c) => c.rarity + ':' + c.locked).join() === 'common:false,common:false,common:false,rare:false,epic:true,mythic:true');

  // Commons stack into one row; the rest are rows of their own; sort
  G.updateArts(); const rows = shelf();
  ok('the three shelf Commons stack into one row "Common x3"; Rare, Epic and Mythic each have a row (best first)', rows.map((r) => r.rarity + (r.stack ? ' x' + r.count : '')).join() === 'mythic,epic,rare,common x3' && /Common x3/.test(G.hallHTML()), rows.map((r) => r.rarity).join());
  tap(els.artHalls, 'data-sort', 'new');
  ok('Newest first puts the latest craft on top', G.getShelfSort() === 'new' && shelf().map((r) => r.rarity).join() === 'mythic,epic,rare,common' && /data-sort="new" aria-pressed="true"/.test(G.hallHTML()));
  tap(els.artHalls, 'data-sort', 'best');
  ok('every row has Place, Lock and Scrap; locked rows show Scrap disabled; the stack has Scrap all', (G.hallHTML().match(/data-sact="place"/g) || []).length === 4 && (G.hallHTML().match(/data-sact="lock"/g) || []).length === 4 &&
    new RegExp('data-copy="' + made[5].id + '" disabled>Scrap<').test(G.hallHTML()) && /data-sact="scrapall" data-art="pink_duck" data-copy="stack">Scrap all 3</.test(G.hallHTML()));

  // scrap: one Common at a time from the stack, into the backpack even with auto-sell on
  const r0 = st.inv.pearl, s0 = st.sparks; act('scrap', 'stack');
  ok('Scrap on the stack scraps one Common: +1,000 Rose Pearls (40% of 2,500), straight into the backpack', st.inv.pearl === r0 + 1000 && st.sparks === s0 && shelf().find((r) => r.stack).count === 2 && els.toast.textContent === 'Scrapped 1 Pink Duck copy: +1,000 Rose Pearls', els.toast.textContent);
  G.sellAll(); G.setSelling(false);
  ok('the refund is kept stock: Sell all and auto-sell leave it', st.inv.pearl === r0 + 1000);
  ok('the pedestal copy can never be scrapped', G.shelfAction('scrap', 'pink_duck', String(c1.id)) === false && A.count(st.artifacts, 'pink_duck') === 6);
  // a Rare scraps at once; a locked Mythic cannot; unlocked, it asks first
  const r1 = st.inv.pearl; act('scrap', made[3].id);
  ok('a Rare scraps without a question', st.inv.pearl === r1 + 1000 && !ducks().some((c) => c.id === made[3].id) && G.getCf() === null);
  ok('a locked Mythic cannot be scrapped', G.shelfAction('scrap', 'pink_duck', String(made[5].id)) === false && ducks().some((c) => c.id === made[5].id));
  act('lock', made[5].id);
  ok('Lock toggles at any time', made[5].locked === false && /Lock Mythic/.test(G.hallHTML()));
  const r2 = st.inv.pearl; act('scrap', made[5].id);
  ok('an unlocked Mythic asks first, in the page', G.getCf() !== null && els.confirm.hidden === false && els.cfTitle.textContent === 'Scrap this Mythic Pink Duck?' && /You get \+1,000 Rose Pearls back/.test(els.cfText.textContent) && st.inv.pearl === r2, els.cfText.textContent);
  key('Escape');
  ok('Escape cancels: nothing is scrapped', els.confirm.hidden === true && G.getCf() === null && ducks().some((c) => c.id === made[5].id) && st.inv.pearl === r2);
  act('scrap', made[5].id); tap(els.confirm); // a tap on the backdrop
  ok('a tap outside the box cancels too', els.confirm.hidden === true && ducks().some((c) => c.id === made[5].id));
  act('scrap', made[5].id); tap(els.confirm, 'data-cf', 'ok');
  ok('Confirm scraps it and toasts the refund', !ducks().some((c) => c.id === made[5].id) && st.inv.pearl === r2 + 1000 && els.toast.textContent === 'Scrapped 1 Pink Duck copy: +1,000 Rose Pearls');

  // the bulk action: everything unlocked below the pedestal's rarity
  const more = ['common', 'common', 'rare', 'rare'].map((r) => { const c = G.craftArtifact('pink_duck', FORCE[r]); G.closeReveal(); return c; });
  act('lock', more[3].id); // one Rare locked
  G.setActiveCopy('pink_duck', made[4].id); // the Epic on the pedestal; the first duck (paid 10,000) goes to the shelf
  G.updateArts(); const it = G.artView()[0].items[0];
  ok('the bulk button counts the unlocked copies below Epic: 5 Commons (the first duck paid 10,000) and 1 Rare', it.bulk.n === 6 && it.bulk.refund === '+9,000 Rose Pearls' && /Scrap all unlocked below Epic \(6\)/.test(G.hallHTML()), JSON.stringify(it.bulk));
  const r3 = st.inv.pearl; tap(els.artHalls, 'data-bulk', 'pink_duck');
  ok('it asks first, naming the count and the total refund', els.cfTitle.textContent === 'Scrap 6 copies below Epic?' && els.cfText.textContent.startsWith('6 unlocked Pink Duck copies go for +9,000 Rose Pearls.') && st.inv.pearl === r3, els.cfText.textContent);
  tap(els.confirm, 'data-cf', 'ok');
  ok('then scraps exactly those: the pedestal Epic and the locked Rare stay', st.inv.pearl === r3 + 9000 && ducks().map((c) => c.rarity + (c.locked ? '*' : '')).sort().join() === 'epic*,rare*' && els.toast.textContent === 'Scrapped 6 Pink Duck copies: +9,000 Rose Pearls', ducks().map((c) => c.rarity).join());
  ok('with nothing left below, the bulk button is gone', G.artView()[0].items[0].bulk.n === 0 && !/data-bulk/.test(G.hallHTML()));

  // Scrap all on a Common stack asks first; locked Commons stay
  const cs = [0, 1, 2].map(() => { const c = G.craftArtifact('pink_duck', FORCE.common); G.closeReveal(); return c; });
  A.setLocked(st.artifacts, 'pink_duck', cs[0].id, true); G.updateArts();
  const r4 = st.inv.pearl; act('scrapall', 'stack');
  ok('Scrap all on the stack asks first and leaves locked Commons', els.cfTitle.textContent === 'Scrap 2 Common Pink Duck copies?' && (tap(els.confirm, 'data-cf', 'ok'), st.inv.pearl === r4 + 2000) && ducks().filter((c) => c.rarity === 'common').length === 1, els.cfTitle.textContent);

  // alloys come back into the material stock
  A.addCopy(st.artifacts, 'blue_compass', 'common', [], [{ kind: 'material', id: 'azure_steel', qty: 5 }, { kind: 'material', id: 'rosegold', qty: 3 }]);
  const spare = A.addCopy(st.artifacts, 'blue_compass', 'rare', []); G.setActiveCopy('blue_compass', spare.id); st.forge.stock = {};
  const back = G.shelfAction('scrap', 'blue_compass', String(st.artifacts.blue_compass.copies[0].id));
  ok('a relic refunds floor(40%) of its alloys into the stock', back === true && st.forge.stock.azure_steel === 2 && st.forge.stock.rosegold === 1, JSON.stringify(st.forge.stock));

  // locks and paid costs survive save, save code, import and backup
  const j0 = JSON.stringify(st.artifacts); G.save(); const raw = store['poppit.v1'];
  ok('serialize writes paid and locked', JSON.stringify(G.serialize().artifacts) === j0 && /"locked":true/.test(j0) && /"paid"/.test(j0));
  const code = G.encodeSave(G.serialize()); G.loadState({ version: G.SAVE_VERSION });
  ok('a save code brings every lock and paid cost back', G.loadState(G.decodeSave(code)) === 'ok' && JSON.stringify(st.artifacts) === j0);
  ok('an import backs the old save up with them, and Restore brings them back', G.checkImport(G.encodeSave({ version: G.SAVE_VERSION, sparks: 1 })) === 'ok' && G.applyImport() === true && JSON.stringify(st.artifacts) === '{}' &&
    store['poppit.backup'] === raw && G.restoreBackup() === 'ok' && JSON.stringify(st.artifacts) === j0);
  G.loadState({ version: G.SAVE_VERSION, lv: E.zeroLevels() }); els.arts.hidden = true;
};
