/* ---------- Achievements: milestones that each add a small permanent payout bonus. Pure, no DOM. ---------- */
// The earned set is a pure function of the state (view(st) reads the counters the game already keeps), so a save can always be
// re-derived: the game grants every id that earned() returns and keeps the granted list (state.achieved) for good.
// Every achievement adds its reward to one global payout multiplier, 1 + the sum, never above 1 + ACH_CAP (ECON.stats: achMult).
// ACH_CAP equals the table's total reward, so every achievement keeps paying; tests/achievements.test.js fails if the total ever passes it.
const ACH = (() => {
  const EC = typeof ECON !== 'undefined' ? ECON : require('./econ.js'); // the page concatenates econ.js and artifacts.js first
  const AR = typeof ARTS !== 'undefined' ? ARTS : require('./artifacts.js');
  const FG = typeof FORGE !== 'undefined' ? FORGE : require('./forge.js');
  const ACH_REWARD = 0.005; // what an achievement adds to every payout (+0.5%)
  const ACH_REWARD_TOP = 0.01; // the hardest tier of each ladder adds this instead (+1%)
  const ACH_CAP = 0.375; // the achievements' payout bonus never goes above +37.5%: the whole table. Raise it with any reward that is added
  const CATEGORIES = [
    { id: 'popping', name: 'Popping' },
    { id: 'collecting', name: 'Collecting' },
    { id: 'economy', name: 'Economy' },
    { id: 'batch', name: 'Fresh Batch' },
    { id: 'crafting', name: 'Crafting' },
  ];
  // 1,000 / 25K / 1M / 1B: short, the way the game writes juice
  const num = (n) => { for (const [v, s] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M']]) if (n >= v) return +(n / v).toFixed(1) + s; return n.toLocaleString('en-US'); };
  const mins = (s) => s / 60 + ' minutes';
  // Pops per pearl type: about an hour of that type's normal pops, by the duck-cost method ("node tools/sim32.js --achievements":
  // the geometric mean of six checkpoint pop rates x ACH_TYPE_MIN, two significant figures, at least 5, falling with rarity).
  // Untuned starting points, like the duck costs.
  const TYPE_POPS = { pearl: 8800, blue: 1200, mint: 520, golden: 290, violet: 230, coral: 84, marble: 39, opal: 28, ruby: 17, black: 15 };
  const TYPE_NAMES = { pearl: 'Rose Garden', blue: 'Feeling Blue', mint: 'Fresh Mint', golden: 'Golden Touch', violet: 'Ultra Violet', coral: 'Coral Reef', marble: 'Lost Marbles', opal: 'Opal Eyes', ruby: 'Ruby Red', black: 'Black Pearl' };
  // ladders: each tier is one achievement. stat names a number in view(); a tier is earned at view[stat] >= need, or with lower,
  // at 0 < view[stat] < need (a best time). A tier may name its own stat, id and description. Every threshold here is data.
  const LADDERS = [
    { id: 'pops', cat: 'popping', name: 'Pearls popped', stat: 'pops', desc: (n) => 'Pop ' + num(n) + ' pearls.',
      tiers: [[100, 'Popper'], [1000, 'Pop Star'], [10000, 'Pop Art'], [100000, 'Pop Culture'], [1000000, 'Pop Legend'], [10000000, 'Popocalypse']] },
    { id: 'taps', cat: 'popping', name: 'Taps', stat: 'taps', desc: (n) => 'Tap the board ' + num(n) + ' times.',
      tiers: [[500, 'Tapper'], [5000, 'Busy Fingers'], [50000, 'Iron Thumb'], [500000, 'Tap Master']] },
    { id: 'combo', cat: 'popping', name: 'Highest combo', stat: 'combo', desc: (n) => 'Reach a ' + n + ' combo.',
      tiers: [[10, 'Combo'], [30, 'Combo Streak'], [60, 'Combo King']] },
    { id: 'bestpop', cat: 'popping', name: 'Best single pop', stat: 'bestPop', desc: (n) => 'Get ' + num(n) + ' juice from one pop.',
      tiers: [[1e6, 'Gusher'], [1e9, 'Juice Flood']] },
    { id: 'found', cat: 'collecting', name: 'Pearl types found', stat: 'found', desc: (n) => (n >= EC.PEARLS.length ? 'Discover every pearl type.' : 'Discover ' + n + ' pearl types.'),
      tiers: [[3, 'Collector'], [5, 'Curator'], [7, 'Archivist'], [EC.PEARLS.length, 'Full Set']] },
    { id: 'shiny', cat: 'collecting', name: 'Shiny types found', stat: 'shinies', desc: (n) => (n === 1 ? 'Discover a shiny pearl.' : n >= EC.PEARLS.length ? 'Discover the shiny of every pearl type.' : 'Discover ' + n + ' shiny types.'),
      tiers: [[1, 'Shiny!'], [5, 'Sparkle Hunter'], [EC.PEARLS.length, 'All That Glitters']] },
    { id: 'type', cat: 'collecting', name: 'Pearl by pearl', stat: null, desc: null,
      tiers: EC.PEARLS.map((t) => ({ id: 'type_' + t.id, need: TYPE_POPS[t.id], name: TYPE_NAMES[t.id], stat: 'pop_' + t.id, desc: 'Pop ' + num(TYPE_POPS[t.id]) + ' ' + t.name + 's.' })) },
    { id: 'life', cat: 'economy', name: 'Juice earned', stat: 'lifetime', desc: (n) => 'Earn ' + num(n) + ' juice in all.',
      tiers: [[1e6, 'Juice Box'], [1e9, 'Juice Bar'], [1e12, 'Juice Empire']] },
    { id: 'maxed', cat: 'economy', name: 'Upgrades at max', stat: 'maxed', desc: (n) => (n === 1 ? 'Have an upgrade at its max level.' : 'Have ' + n + ' upgrades at their max level at once.'),
      tiers: [[1, 'Maxed Out'], [10, 'Fully Loaded']] },
    { id: 'batches', cat: 'batch', name: 'Fresh Batches taken', stat: 'batches', desc: (n) => (n === 1 ? 'Take a Fresh Batch.' : 'Take ' + n + ' Fresh Batches.'),
      tiers: [[1, 'Fresh Start'], [10, 'Batch Cook'], [50, 'Head Chef']] },
    { id: 'flavors', cat: 'batch', name: 'Flavors held', stat: 'flavors', desc: (n) => 'Hold ' + num(n) + ' Flavors.',
      tiers: [[10, 'Flavorful'], [100, 'Flavor Town'], [1000, 'Flavor Legend']] },
    { id: 'fastest', cat: 'batch', name: 'Fastest run', stat: 'fastest', lower: true, desc: (s) => 'Take a Fresh Batch less than ' + mins(s) + ' into a run.',
      tiers: [[600, 'Quick Batch'], [300, 'Speed Batch'], [180, 'Flash Batch']] },
    { id: 'crafts', cat: 'crafting', name: 'Copies crafted', stat: 'crafts', desc: (n) => (n === 1 ? 'Craft an artifact.' : 'Craft ' + n + ' artifact copies.'),
      tiers: [[1, 'First Craft'], [25, 'Workshop']] },
    { id: 'rarity', cat: 'crafting', name: 'Rarest copy', stat: 'rarity', desc: (n) => 'Own ' + (/^[AEIOU]/.test(AR.RARITIES[n].name) ? 'an ' : 'a ') + AR.RARITIES[n].name + ' copy.',
      tiers: [{ id: 'rarity_rare', need: 1, name: 'Rare Find' }, { id: 'rarity_epic', need: 2, name: 'Epic Find' }, { id: 'rarity_mythic', need: 3, name: 'Mythic Find' }] },
    { id: 'ducks', cat: 'crafting', name: 'Ducks owned', stat: 'ducks', desc: (n) => (n === 1 ? 'Own a duck.' : 'Own ' + n + ' different ducks.'),
      tiers: [[1, 'Lucky Duck'], [10, 'Duck Pond']] },
    { id: 'relics', cat: 'crafting', name: 'Relics equipped', stat: 'relics', desc: (n) => 'Have ' + n + ' relics equipped at once.', tiers: [[3, 'Relic Keeper']] },
    { id: 'forged', cat: 'crafting', name: 'Forge jobs finished', stat: 'forged', desc: (n) => 'Finish ' + n + ' forge jobs.', tiers: [[25, 'Smith']] },
    { id: 'mats', cat: 'crafting', name: 'Forge materials', stat: null, desc: null,
      tiers: [{ id: 'mats_dust', need: 1, name: 'Dusty', stat: 'dust', desc: 'Make your first dust in the forge.' }, { id: 'mats_alloy', need: 1, name: 'Alloyed', stat: 'alloy', desc: 'Make your first alloy in the forge.' }] },
  ];
  // one entry per tier, ids stable: '<ladder><tier number>' unless the tier names its own
  const ACHIEVEMENTS = [];
  for (const L of LADDERS) L.tiers.forEach((t, i) => {
    const o = Array.isArray(t) ? { need: t[0], name: t[1] } : t, stat = o.stat || L.stat, need = o.need, lower = !!L.lower;
    const have = (v) => v[stat] || 0, last = i === L.tiers.length - 1;
    ACHIEVEMENTS.push({
      id: o.id || L.id + (i + 1), name: o.name, description: o.desc || L.desc(need), category: L.cat, ladder: L.id, tier: i + 1, need, stat, lower,
      reward: last ? ACH_REWARD_TOP : ACH_REWARD,
      test: lower ? (v) => have(v) > 0 && have(v) < need : (v) => have(v) >= need,
      // { have, need } for the progress bar; a best time counts as need / time (1 = there)
      progress: lower ? (v) => ({ have: have(v) > 0 ? Math.min(1, need / have(v)) : 0, need: 1, best: have(v) }) : (v) => ({ have: Math.min(need, have(v)), need }),
    });
  });
  const BY_ID = {}; for (const a of ACHIEVEMENTS) BY_ID[a.id] = a;
  const byId = (id) => BY_ID[id] || null;
  const ladderOf = (id) => LADDERS.find((L) => L.id === id) || null;
  // the numbers every test reads, from the game state (state shape as in src/world.js; a missing part counts as nothing)
  function view(st) {
    st = st || {};
    const col = st.col || {}, sx = st.stats || {}, arts = st.artifacts || {}, stock = (st.forge && st.forge.stock) || {}, lv = st.lv || {};
    const v = { pops: 0, found: 0, shinies: 0 };
    for (const t of EC.PEARLS) {
      const c = col[t.id] || {}, n = (c.popped || 0) + (c.sPopped || 0);
      v['pop_' + t.id] = n; v.pops += n; if (c.found) v.found++; if (c.sFound) v.shinies++;
    }
    v.taps = sx.taps || 0; v.combo = sx.bestCombo || 0; v.bestPop = sx.bestPop || 0; v.fastest = sx.fastest || 0;
    v.lifetime = st.lifetime || 0;
    v.maxed = Object.keys(EC.UPG).filter((k) => (lv[k] || 0) >= EC.UPG[k].max).length;
    v.batches = st.collapses || 0; v.flavors = st.echoes || 0;
    let copies = 0, rar = 0, relicOwned = false;
    for (const a of AR.ARTIFACTS) {
      const e = arts[a.id]; if (!e || !Array.isArray(e.copies)) continue;
      copies += e.copies.length; if (e.copies.length && AR.usesSlot(a.id)) relicOwned = true;
      for (const c of e.copies) rar = Math.max(rar, AR.RARITIES.findIndex((r) => r.id === c.rarity));
    }
    // copies on hand are a floor for the crafts counter (a save from before it, or one that never scrapped)
    v.crafts = Math.max(sx.crafts || 0, copies); v.rarity = rar;
    v.ducks = AR.ARTIFACTS.filter((a) => a.hall === 'ducks' && AR.count(arts, a.id) > 0).length;
    v.relics = AR.ARTIFACTS.filter((a) => AR.usesSlot(a.id) && AR.applies(a, arts, st.artEquip)).length;
    // the forge: stock on hand is a floor for jobs finished (each unit is one job), and an alloy or a relic means a dust was made
    const held = Object.keys(stock).filter((k) => stock[k] > 0 && FG.byId(k)), dustStock = held.filter((k) => !FG.isAlloy(k)), alloyStock = held.filter(FG.isAlloy);
    const units = held.reduce((n, k) => n + stock[k], 0);
    v.forged = Math.max(sx.forged || 0, units);
    v.alloy = (sx.alloys || 0) > 0 || alloyStock.length > 0 || relicOwned ? 1 : 0;
    v.dust = (sx.forged || 0) - (sx.alloys || 0) > 0 || dustStock.length > 0 || v.alloy ? 1 : 0;
    return v;
  }
  // every id the state satisfies now, in table order
  const earned = (st) => { const v = view(st); return ACHIEVEMENTS.filter((a) => a.test(v)).map((a) => a.id); };
  // the payout bonus of a granted list: each known id once, summed, never above ACH_CAP (rounded so +0.5% steps stay exact)
  function bonus(ids) {
    const seen = new Set(); let s = 0;
    for (const id of Array.isArray(ids) ? ids : []) { const a = BY_ID[id]; if (a && !seen.has(id)) { seen.add(id); s += a.reward; } }
    return Math.min(ACH_CAP, Math.round(s * 1e6) / 1e6);
  }
  const mult = (ids) => 1 + bonus(ids);
  // the sum of a list's rewards (the whole table by default), rounded like bonus(); the cap test compares it with ACH_CAP
  const total = (list) => Math.round((list || ACHIEVEMENTS).reduce((s, a) => s + a.reward, 0) * 1e6) / 1e6;
  // untrusted input (a save) -> known ids, each once, in saved order
  function fromSave(d) { const out = []; for (const id of Array.isArray(d) ? d : []) if (typeof id === 'string' && BY_ID[id] && !out.includes(id)) out.push(id); return out; }
  return { ACH_REWARD, ACH_REWARD_TOP, ACH_CAP, CATEGORIES, LADDERS, TYPE_POPS, ACHIEVEMENTS, byId, ladderOf, view, earned, bonus, mult, total, fromSave };
})();
if (typeof module !== 'undefined') module.exports = ACH;
