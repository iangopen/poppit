// The Artifacts panel (halls as tabs, owned cards, the shelf, Craft another), the roll reveal and the forge's duck stash warning,
// in the real game (run from tests/harness32.js). Rolls are forced with a scripted rng, never in game code.
module.exports = ({ G, ok, frames, E, els }) => {
  const st = G.state, A = G.ARTS;
  const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
  const FORCE = { common: [0], rare: [0.7, 0, 0.5], epic: [0.9, 0, 0.5, 0, 0.5], mythic: [0.99, 0, 0.5, 0, 0.5, 0, 0.5] }; // weights 55 / 30 / 12 / 3
  const duck = () => G.artView()[0].items.find((a) => a.id === 'pink_duck');
  const tap = (el, attr, value, extra) => el.fire('click', { target: { closest: (sel) => (attr && sel === '[' + attr + ']' ? { dataset: Object.assign({ [attr.slice(5)]: value }, extra || {}), disabled: false } : null) } });
  const key = (k) => els.reveal.fire('keydown', { key: k, stopPropagation() {}, preventDefault() {} });
  const reset = () => { G.loadState({ version: 6, lv: E.zeroLevels() }); G.resetRun(); G.closeReveal(); els.arts.hidden = false; G.setArtTab('ducks'); };

  // ---- the first copy places itself; the reveal says so and offers no Place ----
  reset(); st.autoSell = false; st.inv.pearl = 30000;
  const c1 = G.craftArtifact('pink_duck', seq(...FORCE.common));
  let v = G.revealView();
  ok('the first copy auto-places: on the pedestal, and the reveal shows no Place button', st.artifacts.pink_duck.active === c1.id && v.first && els.rvPlace.hidden === true && els.rvKeep.textContent === 'Nice!' &&
    v.compare === 'Placed on your pedestal: ' + A.byId('pink_duck').description && els.reveal.hidden === false, v.compare);
  tap(els.reveal); // a Common copy has nothing to animate, so the first tap closes
  ok('a tap closes a finished reveal', els.reveal.hidden === true && G.getRv() === null);

  // ---- Craft another: the repeat factor, the reason, the odds ----
  G.updateArts();
  const d = duck();
  ok('Craft another costs base x repeatFactor: 2,500 Rose Pearls', d.owned && d.cost[0].qty === 2500 && /2,500 of 2,500 Rose Pearls kept/.test(els.artHalls.innerHTML) && /data-craft="pink_duck">Craft another</.test(els.artHalls.innerHTML), d.cost[0].qty);
  st.inv.pearl = 1000; G.updateArts();
  ok('short: the button is disabled and the reason names what is missing', G.craftReason('pink_duck') === 'Need 1,500 more Rose Pearls in your backpack' &&
    /data-craft="pink_duck" disabled title="Need 1,500 more Rose Pearls in your backpack">Craft another/.test(els.artHalls.innerHTML), G.craftReason('pink_duck'));
  st.autoSell = true;
  ok('with auto-sell on and Roses not kept, the reason says to keep them', G.craftReason('pink_duck') === 'Need 1,500 more Rose Pearls: turn on Keep for them in your backpack', G.craftReason('pink_duck'));
  st.forge.stock = { rosegold: 1 };
  ok('a relic names the missing alloy', G.craftReason('rose_lantern') === 'Need 1 more Rosegold: make it in the forge' && G.craftReason('blue_compass') === 'Need 2 more Azure Steel: make it in the forge', G.craftReason('blue_compass'));
  st.autoSell = false;
  const tot = A.RARITIES.reduce((n, r) => n + r.weight, 0), want = 'Each craft rolls ' + A.RARITIES.map((r) => r.name + ' ' + +(r.weight / tot * 100).toFixed(1) + '%').join(', ');
  ok('the odds hint is built from the rarity table: ' + G.oddsText(), G.oddsText() === want && want === 'Each craft rolls Common 55%, Rare 30%, Epic 12%, Mythic 3%' && d.odds === want);
  const w0 = A.RARITIES[3].weight; A.RARITIES[3].weight = 13;
  const changed = G.oddsText(); A.RARITIES[3].weight = w0;
  ok('and follows the table when it changes (never hard-coded)', changed === 'Each craft rolls Common 50%, Rare 27.3%, Epic 10.9%, Mythic 11.8%', changed);

  // ---- the reveal for each rarity: perks one by one, tap skips, a second tap or Escape closes ----
  st.inv.pearl = 50000; const got = {};
  for (const r of ['common', 'rare', 'epic', 'mythic']) {
    const c = G.craftArtifact('pink_duck', seq(...FORCE[r])), n = A.rarityById(r).perks;
    const v0 = G.revealView(); G.revealTick(0.75); const v1 = G.revealView(); G.revealTick(10); const v2 = G.revealView();
    const timed = n === 0 ? v0.done : v0.shown === 0 && !v0.done && v1.shown === 1 && v2.shown === n && v2.done;
    ok('the reveal opens for ' + r + ': name, colour class and ' + n + ' perks one by one', c.rarity === r && els.reveal.hidden === false && els.reveal.classList.contains('r-' + r) &&
      els.rvRar.textContent === A.rarityById(r).name && timed && els.rvPlace.hidden === false && st.artifacts.pink_duck.active === c1.id, r + ' ' + v0.shown + '/' + v1.shown + '/' + v2.shown);
    got[r] = c; G.closeReveal();
  }
  // a tap mid-animation skips to the end; the next tap closes; Escape closes at any point; neither changes the pedestal
  G.craftArtifact('pink_duck', seq(...FORCE.mythic));
  tap(els.reveal); const sk = G.revealView();
  ok('a tap skips the animation: every perk and the compare line show at once', sk.done && sk.shown === 3 && els.reveal.hidden === false && /vs your current x1\.4/.test(els.rvCmp.textContent), els.rvCmp.textContent);
  tap(els.reveal);
  ok('a second tap closes it and the copy waits on the shelf', els.reveal.hidden === true && st.artifacts.pink_duck.active === c1.id);
  G.craftArtifact('pink_duck', seq(...FORCE.epic)); key('Tab'); const stillOpen = els.reveal.hidden === false; key('Escape');
  ok('Escape closes it mid-animation (Tab does not)', stillOpen && els.reveal.hidden === true && G.getRv() === null && st.artifacts.pink_duck.active === c1.id);
  const m = got.mythic, pv = m.perks.find((p) => p.stat === 'payout').value;
  G.craftArtifact('pink_duck', seq(...FORCE.mythic)); G.revealTick(10);
  const cmp = G.revealView().compare;
  ok('the compare line reads against the current pedestal copy', cmp.startsWith('Payouts x' + +(1.4 * (1 + pv)).toFixed(3) + ' vs your current x1.4; Shiny chance +'), cmp);
  const newest = G.getRv().c; tap(els.reveal, 'data-rv', 'place');
  ok('Place on pedestal from the reveal swaps the active copy', st.artifacts.pink_duck.active === newest.id && els.reveal.hidden === true && G.getS().artMult > 1.4);

  // ---- the shelf: Place swaps the active copy and updates the stat line ----
  G.setActiveCopy('pink_duck', c1.id); G.updateArts();
  const line0 = els.artSum.textContent, shelf = duck().shelf, mOnShelf = shelf.find((c) => c.id === m.id);
  ok('the owned card shows the active copy on its pedestal and the others on a shelf, best first', /On pedestal/.test(els.artHalls.innerHTML) && /Common copy/.test(els.artHalls.innerHTML) &&
    shelf.length === A.count(st.artifacts, 'pink_duck') - 1 && shelf[0].rarity === 'mythic' && shelf[shelf.length - 1].rarity === 'common', shelf.map((c) => c.rarity).join());
  ok('each shelf copy says which stats change when placed', mOnShelf.change.startsWith('Placing it: Payouts x1.4 → x' + +(1.4 * (1 + pv)).toFixed(3) + ', Shiny chance +0% → +') && shelf.find((c) => c.rarity === 'common').change === 'Placing it changes no stats', mOnShelf.change);
  ok('the top line sums the pedestals', line0 === 'On your pedestals: Pink Duck (Common). Together: Payouts x1.4.', line0);
  tap(els.artHalls, 'data-sact', 'place', { art: 'pink_duck', copy: String(m.id) });
  const line1 = els.artSum.textContent;
  ok('Place swaps the active copy and the stat line follows', st.artifacts.pink_duck.active === m.id && line1.startsWith('On your pedestals: Pink Duck (Mythic). Together: Payouts x' + +(1.4 * (1 + pv)).toFixed(3) + ', Shiny chance +') &&
    /Mythic copy/.test(els.artHalls.innerHTML), line1);
  A.addCopy(st.artifacts, 'rose_lantern', 'rare', [{ stat: 'away', value: 0.1 }]); G.equipArt('rose_lantern'); G.updateArts();
  ok('relics join the top line with their own effects', /Rose Lantern \(Rare\)\. Together: .*Away bonus \+10%, Frenzy meter speed \+25%\.$/.test(els.artSum.textContent), els.artSum.textContent);

  // ---- the Hall of Relics tab ----
  tap(els.artTabs, 'data-tab', 'relics');
  const h = els.artHalls.innerHTML;
  ok('the Hall of Relics tab shows the three relics with icons and alloy cost lines, not the duck', G.getArtTab() === 'relics' && /Rose Lantern/.test(h) && /Blue Compass/.test(h) && /Mint Clock/.test(h) && !/Pink Duck/.test(h) &&
    (h.match(/<svg viewBox="0 0 64 64"/g) || []).length === 3 && /0 of 2 Azure Steel/.test(h) && /aria-selected="true" data-tab="relics"/.test(els.artTabs.innerHTML));
  G.setArtTab('ducks');

  // ---- the duck stash warning on the forge's Rose Dust Start ----
  reset(); st.autoSell = true; st.keep.pearl = true; st.col.pearl.popped = 200;
  const warn = () => G.forgeView().recipes.find((r) => r.id === 'rose_dust').stash;
  st.inv.pearl = 4200;
  ok('no duck yet: Start warns how many of the kept Roses it uses', warn() === 'Uses 100 of your 4,200 kept Rose Pearls (the Pink Duck needs 10,000)', warn());
  st.inv.pearl = 60;
  ok('with too few Roses to start, the reason shows instead', warn() === '' && /^Need 40 more/.test(G.forgeView().recipes.find((r) => r.id === 'rose_dust').reason));
  st.inv.pearl = 10150;
  ok('with the duck affordable and enough to spare, no warning', warn() === '');
  st.inv.pearl = 10050;
  ok('but a Start that would drop below the duck warns', warn() === 'Uses 100 of your 10,050 kept Rose Pearls (the Pink Duck needs 10,000)', warn());
  G.craftArtifact('pink_duck', seq(...FORCE.common)); G.closeReveal();
  ok('after the duck, the warning names the next copy\'s cost', st.inv.pearl === 50 && warn() === '' && (st.inv.pearl = 2550, warn() === 'Uses 100 of your 2,550 kept Rose Pearls (the Pink Duck needs 2,500)'), warn());
  st.inv.pearl = 2600;
  ok('and disappears again once a Start leaves enough', warn() === '');
  st.inv.pearl = 2550; G.forgeStartUI('rose_dust');
  ok('the warning never blocks: Start still takes the Roses', st.inv.pearl === 2450 && st.forge.slots[0] && st.forge.slots[0].mat === 'rose_dust');
  reset(); els.arts.hidden = true;
};
