// Achievements in the real game (run from tests/harness32.js): granting once a second and after a craft, a forge job and a Fresh
// Batch, the toast and the chime, the multiplier on taps, helpers, shinies, frenzy and the away bonus, the cap, the retroactive grant
// on load with its one toast, the book's reveal and its Achievements tab, the v10 -> v11 step, save round trips, Fresh Batch and Reset.
// It prints a few "ach run:" lines.
module.exports = ({ G, ok, frames, E, store, els }) => {
  const st = G.state, ACH = G.ACH, realNow = Date.now, run = [];
  let now = 2.1e12; Date.now = () => now;
  const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
  const col = (o) => Object.fromEntries(E.PEARLS.map((t) => [t.id, Object.assign({ found: t.id === 'pearl', popped: 0, sFound: false, sPopped: 0 }, o[t.id] || {})]));
  const refresh = () => { G.recalc(); G.updateShelf(); G.syncDock(); };
  const fresh = () => { G.resetRun(); G.clearBoard(); G.setMeter(0); };
  const reset = () => { els.resetBtn.fire('click', {}); els.resetBtn.fire('click', {}); refresh(); };
  const lines = () => els.toast.textContent.split('\n');
  const newToast = () => { now += 5000; }; // past the 1 s batching window, so the next toast starts fresh
  // one auto-sold pop at combo 0: what it pays (src 'tap' or 'auto', frenzy on or off)
  const pay = (kind, src, shiny, frenzy) => {
    st.autoSell = true; const c = G.cells.find((x) => !x.p), p = G.spawnAt(c, kind, !!shiny); p.born = 1; p.hp = 1; G.setCombo(0);
    if (frenzy) G.startFrenzy(); const s0 = st.sparks; G.popPearl(p, src || 'tap'); const v = st.sparks - s0; if (frenzy) fresh(); return v;
  };
  const chimes = []; const ach0 = G.Snd.achieve; G.Snd.achieve = (soft) => { chimes.push(soft ? 'soft' : 'full'); return ach0.call(G.Snd, soft); };
  try {
    // ---- the book shows with the first achievement, before its toast ----
    reset(); newToast();
    st.lifetime = 50; st.col.pearl.popped = 99; refresh();
    ok('a Rose-only player at 99 pops has no book yet', els.bookBtn.hidden && st.achieved.length === 0);
    st.col.pearl.popped = 100; frames(70); // the once-a-second check
    ok('at 100 pops the per-second check grants Popper', st.achieved.join() === 'pops1', st.achieved.join());
    ok('and the book shows in the same step, so the toast never points at something hidden', !els.bookBtn.hidden);
    ok('the toast names it and the bonus, then points at the Collection book', lines().join(' | ') === 'Achievement: Popper! Payouts +0.5% from achievements | Your achievements are in the Collection book', lines().join(' | '));
    ok('a chime plays (full with Reduce effects off)', chimes.join() === 'full');
    ok('a new achievement lights the book dot', !els.bookDot.hidden);
    G.openPanel('book'); G.openPanel('book');
    ok('opening the book clears it', els.bookDot.hidden);
    st.reduceFx = true; newToast(); st.col.pearl.popped = 1000; frames(70);
    ok('with Reduce effects on the chime is the soft one; the toast is the same', chimes.join() === 'full,soft' && G.lastToast() === 'Achievement: Pop Star! Payouts +1% from achievements', G.lastToast());
    st.reduceFx = false;
    ok('nothing is granted twice: the next checks find nothing new', G.checkAch().length === 0 && G.checkAch().length === 0 && st.achieved.join() === 'pops1,pops2');
    newToast(); st.stats.taps = 600; st.stats.bestCombo = 12; st.lifetime = 2e6; const three = G.checkAch();
    ok('three at once share one toast line', three.join() === 'taps1,combo1,life1' && lines().length === 1 && lines()[0] === '3 achievements: Tapper, Combo and more. Payouts +2.5% from achievements', lines().join(' | '));

    // ---- the multiplier reaches taps, helpers, shinies, frenzy and the away bonus ----
    reset(); fresh(); G.setLv(Object.assign(E.zeroLevels(), { auto: 3, lucky: 2, mint: 1 })); st.col.blue.found = true; st.col.mint.found = true; st.pool = ['pearl', 'blue', 'mint']; G.recalc();
    const base = { tap: pay('pearl'), helper: pay('blue', 'auto'), shiny: pay('mint', 'tap', true), frenzy: pay('blue', 'tap', false, true), away: G.awayBonus(3600).gain };
    st.achieved = ['pops1', 'pops2', 'taps1', 'combo3']; G.recalc(); const m = G.getS().achMult;
    const got = { tap: pay('pearl'), helper: pay('blue', 'auto'), shiny: pay('mint', 'tap', true), frenzy: pay('blue', 'tap', false, true), away: G.awayBonus(3600).gain };
    ok('four achievements (+0.5% x3, +1%) give x1.025', m === 1.025, m);
    for (const k of ['tap', 'helper', 'shiny', 'frenzy', 'away']) ok('the achievement multiplier reaches ' + (k === 'away' ? 'the away bonus' : k + ' pops'), base[k] > 0 && near(got[k] / base[k], m), (got[k] / base[k]).toFixed(6));
    run.push('ach run: x' + m + ': Rose tap ' + base.tap.toFixed(3) + ' -> ' + got.tap.toFixed(3) + ', Blue helper ' + base.helper.toFixed(2) + ' -> ' + got.helper.toFixed(2) + ', away 1 h ' + base.away.toFixed(0) + ' -> ' + got.away.toFixed(0));
    ok('the payout line names it', G.payoutLine() === 'Payouts x1.025 (achievements x1.025)', G.payoutLine());
    st.echoes = 2; G.recalc();
    ok('with Flavors and artifacts too, every part shows and the total multiplies', G.payoutLine() === 'Payouts x1.23 (Flavors 2 x1.2, achievements x1.025)', G.payoutLine());
    G.ARTS.addCopy(st.artifacts, 'pink_duck', 'common', []); G.recalc();
    ok('... including the Pink Duck', G.payoutLine() === 'Payouts x1.722 (Flavors 2 x1.2, artifacts x1.4, achievements x1.025)', G.payoutLine());
    st.achieved = ACH.ACHIEVEMENTS.map((a) => a.id); G.recalc();
    ok('every achievement at once stops at the cap: x' + (1 + ACH.ACH_CAP), G.getS().achMult === 1 + ACH.ACH_CAP && near(pay('pearl') / base.tap, 1.2 * 1.4 * 1.25), G.getS().achMult);

    // ---- the retroactive grant on load: silent, one toast, nothing lost or counted twice ----
    const VET = { version: 10, sparks: 10, lifetime: 2e9, flavorJuice: 2e9, runEarned: 0, echoes: 120, collapses: 10, lv: {},
      col: col({ pearl: { popped: 12000 }, blue: { found: true, popped: 1300, sFound: true, sPopped: 1 } }), pool: ['pearl', 'blue'],
      stats: { taps: 6000, secs: 9000, runSecs: 10, bestPop: 2e6, bestCombo: 61, bestGain: 30, fastest: 250 } };
    const want = ACH.earned(G.migrateSave(JSON.parse(JSON.stringify(VET))).save);
    reset(); newToast(); chimes.length = 0;
    ok('a v10 save migrates with an empty earned set', JSON.stringify(G.migrateSave(JSON.parse(JSON.stringify(VET))).save.achieved) === '[]' && G.migrateSave({ version: 10 }).save.version === G.SAVE_VERSION);
    ok('an import of it checks and loads', G.checkImport(G.encodeSave(VET)) === 'ok' && G.applyImport() === true);
    ok('every achievement the history earns is granted at once (' + want.length + ')', want.length === 20 && st.achieved.join() === want.join(), st.achieved.length);
    const hist = lines().filter((l) => /from your history/.test(l));
    ok('with one toast that says how many, and no per-achievement toasts or chimes', hist.length === 1 && hist[0] === '20 achievements from your history: payouts +10.5%. See the Collection book.' && !lines().some((l) => /^Achievement:|achievements: /.test(l)) && chimes.length === 0, lines().join(' | '));
    ok('the payout follows at once', G.getS().achMult === 1 + ACH.bonus(want) && ACH.bonus(want) === 0.105, G.getS().achMult);
    newToast(); const again = G.encodeSave(G.serialize());
    ok('a second load of the same save grants nothing more and says nothing about history', G.checkAch().length === 0 && G.checkImport(again) === 'ok' && G.applyImport() && st.achieved.join() === want.join() && lines().join() === 'Save loaded', lines().join(' | '));
    // granted ids the state no longer shows (an upgrade at max, before a Fresh Batch wiped it) stay; repeats and unknown ids do not count
    const kept = Object.assign({}, VET, { version: 11, achieved: ['maxed1', 'pops1', 'pops1', 'nonsense', 42] });
    reset(); newToast(); G.checkImport(G.encodeSave(kept)); G.applyImport();
    ok('a saved id the state no longer earns is kept; repeats and unknown ids are dropped', st.achieved[0] === 'maxed1' && st.achieved[1] === 'pops1' && st.achieved.filter((x) => x === 'pops1').length === 1 && !st.achieved.includes('nonsense') && st.achieved.length === 21, st.achieved.slice(0, 3).join());
    ok('so the bonus counts each once: 21 achievements, +11%, and the toast counts only the 19 new ones', G.getS().achMult === 1.11 && lines().filter((l) => /from your history/.test(l)).length === 1 && /^19 achievements from your history/.test(lines().find((l) => /history/.test(l))), lines().join(' | '));

    // ---- save, save code, import, backup, Restore ----
    const ids = st.achieved.join();
    G.save(); ok('a save and reload keep them', G.loadState(JSON.parse(store['poppit.v1'])) === 'ok' && st.achieved.join() === ids);
    const code = G.encodeSave(G.serialize()); G.loadState({ version: 11 });
    ok('a save code carries them', st.achieved.length === 0 && G.loadState(G.decodeSave(code)) === 'ok' && st.achieved.join() === ids);
    G.save(); const raw = store['poppit.v1'];
    ok('an import replaces them and backs up the old ones', G.checkImport(G.encodeSave({ version: 11, sparks: 1, achieved: ['taps1'] })) === 'ok' && G.applyImport() === true && st.achieved.join() === 'taps1' && store['poppit.backup'] === raw);
    ok('Restore brings them back', G.restoreBackup() === 'ok' && st.achieved.join() === ids);
    ok('a loaded list is clamped: known ids only, each once', G.loadState({ version: 11, achieved: ['pops1', 'pops1', 'x', null, 'taps2'] }) === 'ok' && st.achieved.join() === 'pops1,taps2' && G.loadState({ version: 11, achieved: 'pops1' }) === 'ok' && st.achieved.length === 0);

    // ---- counters behind the crafting ladders: crafts, forge jobs and alloys ----
    reset(); fresh(); newToast();
    st.inv.pearl = 10000; st.keep.pearl = true; G.craftArtifact('pink_duck', () => 0); G.closeReveal();
    ok('a craft counts, and the craft itself grants First Craft and Lucky Duck (no wait for the next second)', st.stats.crafts === 1 && st.achieved.includes('crafts1') && st.achieved.includes('ducks1'), st.achieved.join());
    st.inv.pearl = 300; st.col.pearl.found = true; G.forgeStart(0, 'rose_dust'); now += 31000; G.forgeTick();
    ok('a finished forge job counts and grants Dusty at once', st.stats.forged === 1 && st.stats.alloys === 0 && st.achieved.includes('mats_dust'), JSON.stringify(st.stats));
    st.forge.stock.rose_dust = 6; st.forge.stock.blue_dust = 2; G.forgeStart(0, 'rosegold'); now += 3e5; G.forgeCatchUp();
    ok('an alloy counts as a job and an alloy, and grants Alloyed', st.stats.forged === 2 && st.stats.alloys === 1 && st.achieved.includes('mats_alloy'), JSON.stringify(st.stats));

    // ---- Fresh Batch keeps them and grants its own; Reset save forgets them ----
    fresh(); const before = st.achieved.slice(); st.runEarned = E.COLLAPSE_MIN_RUN * 1.2; st.flavorJuice = E.flavorJuiceFor(st.echoes + E.flavorNeed(st.echoes)); G.updateShelf();
    els.collapseBtn.fire('click', {}); els.collapseBtn.fire('click', {}); frames(160);
    ok('Fresh Batch keeps every achievement and grants Fresh Start on the spot', !G.getCollapse() && before.every((id) => st.achieved.includes(id)) && st.achieved.includes('batches1'), st.achieved.join());
    reset();
    ok('Reset save forgets them, and the payout is back to x1', st.achieved.length === 0 && G.getS().achMult === 1 && els.bookBtn.hidden);

    // ---- a save past every threshold shows the same controls as before, except the book rule ----
    const CTL = ['packBtn', 'toolBtn', 'bookBtn', 'poolBtn', 'setBtn', 'artBtn', 'forgeBtn'];
    const shown = () => CTL.filter((id) => !els[id].hidden).join(' ');
    const mid = { version: 10, sparks: 900, runEarned: 800000, lifetime: 800000, lv: { sharp: 12, lucky: 4, spawn: 6, combo: 5, fuel: 2, mint: 2, golden: 1, shiny: 1 }, owned: [true, true, true, false, false, false], col: col({ blue: { found: true, popped: 900 }, mint: { found: true, popped: 900 }, golden: { found: true, popped: 900 }, pearl: { popped: 900 } }), pool: ['pearl', 'blue', 'mint', 'golden'] };
    G.loadState(JSON.parse(JSON.stringify(mid))); G.syncDiscoveries(); refresh(); const without = shown();
    G.grantHistory(); refresh();
    ok('a mid-game save shows the same dock with its achievements granted', without === shown() && without === 'packBtn toolBtn bookBtn poolBtn setBtn artBtn forgeBtn' && st.achieved.length > 0, shown());
    const early = { version: 10, lifetime: 3000, runEarned: 3000, sparks: 40, lv: { sharp: 2 }, col: col({ pearl: { popped: 150 } }) };
    G.loadState(JSON.parse(JSON.stringify(early))); G.syncDiscoveries(); refresh(); const e0 = shown();
    G.grantHistory(); refresh();
    ok('an early Rose-only save past 100 pops: the one difference is the book, shown for its achievement', e0 === 'packBtn toolBtn setBtn' && shown() === 'packBtn toolBtn bookBtn setBtn' && st.achieved.join() === 'pops1', e0 + ' -> ' + shown());

    // ---- the Achievements tab in the Collection book ----
    reset(); newToast();
    G.loadState({ version: 11, lifetime: 2e6, col: col({ pearl: { popped: 1500 }, blue: { found: true, popped: 40 } }), stats: { taps: 700, bestCombo: 12 } }); G.syncDiscoveries(); G.grantHistory(); refresh();
    G.setBookTab('pearls'); G.openPanel('book');
    ok('the book opens on its Pearls tab', !els.book.hidden && els.achView.hidden && !els.bkWrap.hidden && els.bkTabPearls['attr:aria-selected'] === 'true');
    G.setBookTab('ach');
    ok('the Achievements tab swaps the spread for the list', els.bkWrap.hidden && !els.achView.hidden && els.bkTabAch['attr:aria-selected'] === 'true' && els.book.classList.contains('ach') && G.getBookTab() === 'ach');
    const v = G.achBookView(), n = st.achieved.length;
    ok('the summary line counts them and names the bonus', els.achSum.textContent === n + ' of ' + ACH.ACHIEVEMENTS.length + ' · payouts +' + +(ACH.bonus(st.achieved) * 100).toFixed(1) + '%' && n === 5, els.achSum.textContent);
    ok('five categories with their counts', v.cats.map((c) => c.name + ' ' + c.have + '/' + c.total).join(', ') === 'Popping 4/15, Collecting 0/17, Economy 1/5, Fresh Batch 0/9, Crafting 0/11' && /data-acat="batch"/.test(els.achCats.innerHTML), v.cats.map((c) => c.have + '/' + c.total).join());
    const pops = v.ladders.find((L) => L.id === 'pops');
    ok('a ladder shows its achieved tiers, only the next one, and ??? for the rest', pops.tiers.map((t) => t.state).join() === 'done,done,next,hidden,hidden,hidden' && pops.tiers[2].have === 1540 && pops.tiers[2].need === 10000);
    const html = els.achList.innerHTML;
    ok('the drawn list: Popper and Pop Star achieved, Pop Art with its bar at 15%, three ???', /Popper<span class="vh"> \(achieved\)/.test(html) && /<b>Pop Art<\/b>/.test(html) && /aria-valuenow="15"/.test(html) && /1,540 \/ 10\.0K/.test(html) && (html.match(/<b>\?\?\?<\/b>/g) || []).length >= 3 && !/Pop Culture/.test(html), html.slice(0, 160));
    G.setAchCat('batch'); const fb = G.achBookView().ladders.find((L) => L.id === 'fastest');
    ok('the category switcher changes the list; a best time with no run says so', G.achBookView().cat === 'batch' && /No timed run yet/.test(els.achList.innerHTML) && fb.tiers[0].state === 'next' && fb.tiers[0].frac === 0 && G.setAchCat('nope') === false);
    st.stats.fastest = 720; G.updateAch();
    ok('a run of 12 minutes shows as the best and fills the bar to 83%', /Best run 12m/.test(els.achList.innerHTML) && /aria-valuenow="83"/.test(els.achList.innerHTML), '');
    G.setAchCat('popping'); G.openPanel('book');
    run.push('ach run: ' + els.achSum.textContent);
  } finally { Date.now = realNow; G.Snd.achieve = ach0; G.setBookTab('pearls'); reset(); st.reduceFx = false; G.paintFx && G.paintFx(); }
  run.forEach((l) => console.log(l));
};
