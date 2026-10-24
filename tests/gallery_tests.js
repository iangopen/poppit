// The halls as galleries (run from tests/harness32.js): moving by arrows, keys and swipes, the ends, the announcement, the pedestal
// states (occupied, empty with recipe and Keep, not found), the equip row (Equip, the swap chooser, Unequip) and the payout line.
module.exports = ({ G, ok, E, els }) => {
  const st = G.state, A = G.ARTS;
  const tap = (el, attr, value, extra) => el.fire('click', { target: { closest: (sel) => (attr && sel === '[' + attr + ']' ? { dataset: Object.assign({ [attr.slice(5)]: value }, extra || {}), disabled: false } : null) } });
  const ptr = (g, type, x, y, id) => els[g + 'View'].fire(type, { pointerId: id || 1, clientX: x, clientY: y, button: 0, pointerType: 'touch' });
  const swipe = (g, dx, dy) => { ptr(g, 'pointerdown', 200, 400); ptr(g, 'pointermove', 200 + dx / 2, 400 + (dy || 0) / 2); ptr(g, 'pointermove', 200 + dx, 400 + (dy || 0)); ptr(g, 'pointerup', 200 + dx, 400 + (dy || 0)); };
  const key = (k) => G.galleryKey({ key: k, preventDefault() {} });
  const fx = [1, 2, 3].map((i) => ({ id: 'gx_relic' + i, hall: 'relics', name: 'Test Relic ' + i, description: 'test only', cost: [{ kind: 'material', id: 'rosegold', qty: 1 }], repeatFactor: 1, costGrowth: 1, bonus: { type: 'spawn', value: 1.01 } }));
  try {
    G.loadState({ version: 8, lv: E.zeroLevels() }); G.resetRun(); G.closeReveal();
    st.col.pearl.popped = 200; G.updateHud(0.016); // opens the Artifacts dock gate
    els.arts.hidden = false; G.setArtTab('ducks');
    const g = G.gallery('ducks'), live = () => els['gal-ducksLive'].textContent, tf = () => els['gal-ducksTrack'].style.transform;
    ok('the Hall of Ducks gallery has one pedestal per duck in roster order, starting on the Pink Duck', g.keys.join() === A.ARTIFACTS.filter((a) => a.hall === 'ducks').map((a) => a.id).join() && g.index === 0 && els['gal-ducksPrev'].disabled === true && els['gal-ducksNext'].disabled === false);

    // ---- arrows, keys, swipes, ends ----
    els['gal-ducksNext'].fire('click', {});
    ok('the Next arrow moves one pedestal and announces it', g.index === 1 && live() === 'Blue Duck, 2 of 10' && /translateX\(calc\(7% - 1 \* \(86% \+ 10px\) \+ 0px\)\)/.test(tf()), live() + ' ' + tf());
    els['gal-ducksPrev'].fire('click', {});
    ok('the Previous arrow moves back', g.index === 0 && live() === 'Pink Duck, 1 of 10');
    key('ArrowRight'); key('ArrowRight');
    ok('the Right key moves forward', g.index === 2 && live() === 'Mint Duck, 3 of 10', live());
    key('ArrowLeft');
    ok('the Left key moves back', g.index === 1);
    ptr('gal-ducks', 'pointerdown', 200, 400); ptr('gal-ducks', 'pointermove', 170, 402);
    const mid = tf();
    ptr('gal-ducks', 'pointermove', 140, 404); ptr('gal-ducks', 'pointerup', 140, 404);
    ok('a swipe left drags the track with the finger, then moves one pedestal', /\+ -30px\)\)$/.test(mid) && g.index === 2 && live() === 'Mint Duck, 3 of 10', mid);
    swipe('gal-ducks', 70);
    ok('a swipe right moves back one pedestal', g.index === 1);
    swipe('gal-ducks', -25);
    ok('a short drag snaps back to the same pedestal', g.index === 1 && / \+ 0px\)\)$/.test(tf()));
    swipe('gal-ducks', -80, 120);
    ok('a mostly vertical drag is left to the page scroll and moves nothing', g.index === 1);
    for (let i = 0; i < 15; i++) key('ArrowRight');
    const last = g.index; swipe('gal-ducks', -200); els['gal-ducksNext'].fire('click', {});
    ok('the last pedestal is an end: keys, swipes and Next stop there', last === 9 && g.index === 9 && els['gal-ducksNext'].disabled === true && live() === 'Black Duck, 10 of 10');
    for (let i = 0; i < 15; i++) key('ArrowLeft');
    swipe('gal-ducks', 300);
    ok('the first pedestal is an end too, with no wrap', g.index === 0 && els['gal-ducksPrev'].disabled === true);
    els.arts.hidden = true;
    ok('the arrow keys do nothing while the panel is closed', key('ArrowRight') === false && g.index === 0);
    els.arts.hidden = false;
    ok('only the pedestal on show is reachable: the others are inert', g.slides[0].inert === false && g.slides[1].inert === true && g.slides[0].classList.contains('on'));

    // ---- pedestal states ----
    for (const t of ['blue', 'mint']) st.col[t].found = t === 'blue';
    st.autoSell = true; delete st.keep.blue; st.inv.blue = 820; G.updateArts();
    const blue = () => g.html[1], mint = () => g.html[2];
    ok('an empty pedestal shows the silhouette, its label, the recipe with progress, and Craft with its reason', /pstage">.*class="aicon sil" style="--sc:hsl\(205 95% 52%\)"/.test(blue()) && /<h5 class="plabel">Blue Duck<\/h5><span class="pempty">Empty pedestal/.test(blue()) &&
      /820 of 1,600 Blue Pearls kept/.test(blue()) && /scaleX\(0\.512\)/.test(blue()) && /data-craft="blue_duck" disabled title="Need 780 more Blue Pearls: turn on Keep for them in your backpack">Craft</.test(blue()), '');
    ok('and the Keep toggle for Blue Pearls, off', /data-akeep="blue" aria-pressed="false"><svg[^]*<span>Keep Blue Pearls<\/span>/.test(blue()));
    tap(els.artHalls, 'data-akeep', 'blue');
    ok('the pedestal Keep toggle turns on the backpack Keep for Blue Pearls, and the reason follows', st.keep.blue === true && /Keeping Blue Pearls/.test(blue()) && /title="Need 780 more Blue Pearls in your backpack"/.test(blue()));
    tap(els.artHalls, 'data-akeep', 'blue');
    ok('and off again', !st.keep.blue && /aria-pressed="false"/.test(blue()));
    ok('a type not found yet: dimmed, labeled, "Not found yet", no recipe and no Craft', /pstage dim/.test(mint()) && /<h5 class="plabel">Mint Duck<\/h5>/.test(mint()) && /Not found yet/.test(mint()) && !/data-craft/.test(mint()) && !/Mint Pearls kept/.test(mint()));
    st.keep.blue = true; st.inv.blue = 1600; G.updateArts(); g.go(1);
    G.craftArtifact('blue_duck', () => 0.99); G.closeReveal(); // Mythic
    ok('an occupied pedestal shows the active copy in its rarity frame with perks, Craft another and the odds', /pstage own r-mythic/.test(blue()) && /On pedestal/.test(blue()) && /Mythic copy/.test(blue()) && /Craft another/.test(blue()) && /Each craft rolls/.test(blue()) && g.index === 1);
    st.inv.blue = 400; G.craftArtifact('blue_duck', () => 0); G.closeReveal();
    ok('a second copy waits on the shelf below, with Place, Lock and Scrap, on the same pedestal', /On the shelf \(1\)/.test(blue()) && /data-sact="place" data-art="blue_duck"/.test(blue()) && /data-sact="lock" data-art="blue_duck"/.test(blue()) && /data-sact="scrap" data-art="blue_duck"/.test(blue()));

    // ---- each hall remembers its pedestal ----
    g.go(4); G.setArtTab('relics'); const r = G.gallery('relics'); r.go(2); G.setArtTab('ducks');
    ok('switching tabs keeps each hall on its own pedestal', g.index === 4 && r.index === 2 && els['hall-ducks'].hidden === false && els['hall-relics'].hidden === true);
    G.setArtTab('relics');
    ok('the Hall of Artifacts tab shows its gallery and the equip row', els['hall-relics'].hidden === false && r.index === 2 && /Equipped 0 of 5/.test(G.hallHTML()) && (G.hallHTML().match(/>Empty</g) || []).length === 5);

    // ---- Equip, Unequip, the chooser ----
    A.ARTIFACTS.push(...fx);
    const relics = ['rose_lantern', 'blue_compass', 'mint_clock'].concat(fx.map((a) => a.id));
    for (const id of relics) A.addCopy(st.artifacts, id, 'common', []); // owned, none equipped
    G.updateArts();
    ok('an owned relic that is not equipped says it has no effect, with an Equip button', /Not equipped: it has no effect until you equip it\./.test(r.html[0]) && /data-equip="rose_lantern">Equip</.test(r.html[0]));
    tap(els.artHalls, 'data-equip', 'blue_compass'); tap(els.artHalls, 'data-equip', 'rose_lantern');
    ok('Equip fills the first free slot', st.artEquip.join() === 'blue_compass,rose_lantern' && /Equipped in slot 2 of 5/.test(r.html[0]) && /data-eslot="blue_compass"[^>]*>[^]*Blue Compass<\/span>/.test(G.hallHTML()) && (G.hallHTML().match(/>Empty</g) || []).length === 3);
    tap(els.artHalls, 'data-eslot', 'blue_compass');
    ok('tapping a filled slot offers Unequip in the in-page dialog', els.confirm.hidden === false && els.cfTitle.textContent === 'Unequip Blue Compass?' && els.cfOk.textContent === 'Unequip');
    els.confirm.fire('click', { target: { closest: (sel) => (sel === '[data-cf]' ? { dataset: { cf: 'ok' } } : null) } });
    ok('Unequip empties it, and the rest move up', els.confirm.hidden === true && st.artEquip.join() === 'rose_lantern' && /Not equipped/.test(r.html[1]));
    for (const id of ['mint_clock', fx[0].id, fx[1].id, fx[2].id]) tap(els.artHalls, 'data-equip', id);
    ok('five relics fill the row', st.artEquip.length === 5 && !/>Empty</.test(G.hallHTML()) && /data-equip="blue_compass">Equip \(swap one out\)</.test(r.html[1]));
    tap(els.artHalls, 'data-equip', 'blue_compass');
    const opts = els.chList.innerHTML;
    ok('Equip with all five full opens the chooser listing the five equipped relics', els.chooser.hidden === false && G.getChooser() && (opts.match(/data-ch="pick"/g) || []).length === 5 && /data-id="mint_clock"><svg[^]*<b>Mint Clock<\/b><small>Slot 2<\/small>/.test(opts) && els.chTitle.textContent === 'All 5 slots are full', els.chTitle.textContent);
    els.chooser.fire('keydown', { key: 'Escape', stopPropagation() {}, preventDefault() {} });
    ok('Escape cancels it and changes nothing', els.chooser.hidden === true && !G.getChooser() && st.artEquip.join() === ['rose_lantern', 'mint_clock', fx[0].id, fx[1].id, fx[2].id].join());
    tap(els.artHalls, 'data-equip', 'blue_compass');
    ok('the arrow keys leave the gallery alone while the chooser is open', key('ArrowRight') === false);
    els.chooser.fire('click', { target: { closest: (sel) => (sel === '[data-ch]' ? { dataset: { ch: 'pick', id: 'mint_clock' } } : null) } });
    ok('choosing one swaps: the new relic takes that slot and the chosen one is out', els.chooser.hidden === true && st.artEquip.join() === ['rose_lantern', 'blue_compass', fx[0].id, fx[1].id, fx[2].id].join() && /Not equipped/.test(r.html[2]));
    tap(els.artHalls, 'data-equip', 'pink_duck');
    ok('a duck never opens the chooser or takes a slot', els.chooser.hidden === true && st.artEquip.length === 5);
    els.chooser.fire('click', { target: { closest: () => null } });

    // ---- the payout line ----
    G.loadState({ version: 8, lv: E.zeroLevels(), echoes: 2 }); G.recalc(); st.col.pearl.popped = 200;
    const flav = G.payoutLine();
    A.addCopy(st.artifacts, 'pink_duck', 'common', []); G.recalc(); const pink = G.payoutLine();
    for (const id of ['blue_duck', 'mint_duck', 'golden_duck']) A.addCopy(st.artifacts, id, 'common', []); G.recalc(); const three = G.payoutLine();
    G.loadState({ version: 8, lv: E.zeroLevels(), artifacts: { blue_duck: { active: 1, copies: [{ id: 1, rarity: 'common', perks: [] }] } } }); G.recalc(); const one = G.payoutLine();
    ok('the payout line without type ducks is as before', flav === 'Flavors 2 (payouts x1.2)' && pink === 'Payouts x1.68 (Flavors 2 x1.2, artifacts x1.4)', flav + ' | ' + pink);
    ok('with type ducks it says how many', three === 'Payouts x1.68 (Flavors 2 x1.2, artifacts x1.4) + 3 type ducks' && one === 'Payouts x1 + 1 type duck', three + ' | ' + one);
    st.col.pearl.popped = 200; G.updateHud(0.016); els.arts.hidden = true; G.setArtTab('relics');
    els.echoes.fire('click', {});
    ok('the payout line is a button that opens the Hall of Ducks', els.echoes.textContent === one && els.echoes.disabled === false && /Open the Hall of Ducks: type ducks pay more on their own pearl type/.test(els.echoes['attr:aria-label']) && els.arts.hidden === false && G.getArtTab() === 'ducks');
  } finally {
    for (const a of fx) { const i = A.ARTIFACTS.indexOf(a); if (i >= 0) A.ARTIFACTS.splice(i, 1); }
    G.loadState({ version: 8, lv: E.zeroLevels() }); els.arts.hidden = true;
  }
};
