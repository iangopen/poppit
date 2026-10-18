
/* ---------- Audio: procedural Web Audio. Combos climb a bright major pentatonic ladder. ---------- */
const Snd = (() => {
  let ctx = null, master = null, send = null, muted = false, lastNoise = 0;
  const recent = [], buffers = {};
  let loading = false;
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];
  const hz = (step) => 262 * Math.pow(2, SCALE[Math.max(0, Math.min(step, SCALE.length - 1))] / 12);

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 6;
      master.connect(comp); comp.connect(ctx.destination);
      send = ctx.createGain(); send.gain.value = 0.3;
      const dl = ctx.createDelay(1.0); dl.delayTime.value = 0.22;
      const fb = ctx.createGain(); fb.gain.value = 0.3;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      send.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master);
    } catch (e) { ctx = null; }
    if (ctx) loadSamples(ctx);
    return ctx;
  }
  // decode the embedded clips once the context exists; until a clip is ready its old synth version plays
  function loadSamples(c) {
    if (loading) return; loading = true;
    for (const k in SAMPLES) {
      try {
        const bin = atob(SAMPLES[k]), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        c.decodeAudioData(u.buffer, (b) => { buffers[k] = b; }, () => { /* a clip that fails to decode just stays silent */ });
      } catch (e) { /* ignore */ }
    }
  }
  function sample(name, o) {
    o = o || {};
    const c = ensure(), b = buffers[name]; if (!c || muted || !b) return false;
    const src = c.createBufferSource(); src.buffer = b;
    src.playbackRate.value = (o.rate || 1) * (1 + (Math.random() - 0.5) * (o.jit === undefined ? 0.06 : o.jit));
    const g = c.createGain(); g.gain.value = (o.gain === undefined ? 1 : o.gain) * (1 + (Math.random() - 0.5) * 0.14);
    src.connect(g); g.connect(master);
    if (o.echo) { const s = c.createGain(); s.gain.value = o.echo; g.connect(s); s.connect(send); }
    src.start(c.currentTime + (o.at || 0)); return true;
  }
  // the harder pearls ring with a recorded metal hit (blue lightest, marble heaviest); the plain pink pearl only gets its bubble pop
  const HARD_SND = { blue: { s: 'thud', r: 1, g: 0.8 }, mint: { s: 'thud', r: 0.9, g: 0.85 }, golden: { s: 'hit92', r: 1, g: 0.85 }, violet: { s: 'hit92', r: 0.92, g: 0.9 }, coral: { s: 'hit92', r: 0.85, g: 0.95 }, marble: { s: 'hit18', r: 0.95, g: 0.95 }, opal: { s: 'hit18', r: 0.9, g: 1 }, ruby: { s: 'hit18', r: 0.8, g: 1 }, black: { s: 'hit18', r: 0.7, g: 1 } };
  let lastHit = 0;
  function resume() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }
  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
  // cascades can fire dozens of pops at once, so cap how many voices start per 120ms
  function allow(cost) {
    const c = ensure(); if (!c || muted) return false;
    const now = c.currentTime;
    while (recent.length && now - recent[0] > 0.12) recent.shift();
    if (recent.length > 14) return false;
    for (let i = 0; i < cost; i++) recent.push(now);
    return true;
  }
  function tone(o) {
    const c = ensure(); if (!c || muted) return;
    const t = c.currentTime + (o.at || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.from || o.f, t);
    if (o.from) osc.frequency.exponentialRampToValueAtTime(o.f, t + (o.glide || 0.04));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(master);
    if (o.echo) { const s = c.createGain(); s.gain.value = o.echo; g.connect(s); s.connect(send); }
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  function squish(gain, freq) {
    const c = ensure(); if (!c || muted) return;
    const now = c.currentTime; if (now - lastNoise < 0.018) return; lastNoise = now;
    const len = Math.floor(c.sampleRate * 0.035), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 0.9;
    const g = c.createGain(); g.gain.value = gain;
    src.connect(bp); bp.connect(g); g.connect(master); src.start(now);
  }

  return {
    resume, setMuted, hz,
    // a wet "pok" at the combo note: pitched blip, low thump, squish of juice
    pop(step, full, soft, rateMul) {
      if (!allow(soft ? 1 : 2)) return;
      if (buffers.pop) { sample('pop', { rate: (rateMul || 1) * 0.85 * Math.pow(2, SCALE[Math.min(step, 9)] / 24), gain: soft ? 0.45 : 0.8, echo: 0.12 }); return; }
      const f = hz(step), v = soft ? 0.55 : 1;
      tone({ f, from: f * 0.78, glide: 0.03, dur: 0.17, gain: 0.26 * v, echo: 0.3 });
      tone({ f: 80, from: 210, glide: 0.07, dur: 0.12, gain: 0.3 * v });
      squish(0.1 * v, 2200 + step * 80);
      tone({ f: f * 3, dur: 0.28, gain: 0.05 * v, echo: 0.8 });
      if (full) tone({ f: f * 2, type: 'triangle', dur: 0.34, gain: 0.09 * v, echo: 0.7 });
    },
    // a hit that cracks a hard pearl: dull knock plus a dry crackle, higher as it nears breaking
    crack(frac) {
      if (!allow(1)) return;
      tone({ f: 110 + frac * 70, from: 270, glide: 0.05, dur: 0.1, gain: 0.3 });
      squish(0.32, 2600 + frac * 2200);
      tone({ f: hz(2 + Math.round(frac * 6)), type: 'triangle', dur: 0.12, gain: 0.05 + 0.06 * frac, echo: 0.3 });
    },
    // a hit on a hard pearl: one recorded impact per hit, a little higher as the pearl nears breaking; helpers and chains play it softer
    hit(kind, frac, soft) {
      const t = HARD_SND[kind]; if (!t) return;
      const c = ensure(); if (!c || muted) return;
      if (c.currentTime - lastHit < 0.025) return; lastHit = c.currentTime;
      if (!allow(1)) return;
      if (!sample(t.s, { rate: t.r * (1 + 0.12 * (frac || 0)) * (soft ? 1.1 : 1), gain: t.g * (soft ? 0.5 : 1) })) this.crack(frac || 0);
    },
    shatter() { if (!sample('shatter', { gain: 0.9, echo: 0.2 })) this.marbleSynth(); },
    equip() { if (!sample('equip', { gain: 0.9, jit: 0.04 })) this.buy(3); },
    click() { sample('click', { gain: 0.7, jit: 0.04 }); },
    thud(v) { tone({ f: 55, from: 150, glide: 0.09, dur: 0.22, gain: 0.45 * v }); },
    marble() { this.shatter(); },
    golden() { this.shatter(); },
    shimmer() { if (!allow(1)) return; [16, 19, 24, 28, 31, 36].forEach((s, i) => tone({ f: hz(s), type: 'triangle', dur: 0.45, gain: 0.07, at: i * 0.045, echo: 0.9 })); },
    marbleSynth() {
      tone({ f: 45, from: 210, glide: 0.25, dur: 0.55, gain: 0.55 });
      squish(0.45, 4500);
      for (let i = 0; i < 9; i++) tone({ f: 1200 + Math.random() * 2800, type: 'triangle', dur: 0.25 + Math.random() * 0.3, gain: 0.06, at: Math.random() * 0.14, echo: 0.8 });
      [12, 16, 19, 24].forEach((s, i) => tone({ f: hz(s), dur: 0.7, gain: 0.1, at: 0.12 + i * 0.07, echo: 0.9 }));
    },
    goldenSynth() {
      [7, 9, 12, 14, 16].forEach((s, i) => tone({ f: hz(s), type: 'triangle', dur: 0.55, gain: 0.14, at: i * 0.055, echo: 0.8 }));
      tone({ f: 60, from: 180, glide: 0.12, dur: 0.3, gain: 0.5 });
    },
    buy(n) {
      if (sample('coin', { gain: 0.8, rate: 1 + 0.015 * (n % 6), echo: 0.15 })) return;
      const b = 4 + (n % 4);
      tone({ f: hz(b), type: 'triangle', dur: 0.22, gain: 0.14, echo: 0.4 });
      tone({ f: hz(b + 2), type: 'triangle', dur: 0.32, gain: 0.14, at: 0.07, echo: 0.6 });
    },
    // a big wet squish that releases a shower of coins
    sell(n) {
      tone({ f: 70, from: 340, glide: 0.18, dur: 0.3, gain: 0.5 });
      squish(0.4, 700); squish(0.3, 1800);
      const k = Math.min(10, 4 + Math.round(n / 4));
      for (let i = 0; i < k; i++) tone({ f: hz(7 + (i * 2) % 9), type: 'triangle', dur: 0.3, gain: 0.1, at: 0.14 + i * 0.045, echo: 0.7 });
    },
    tick() { tone({ f: hz(9), type: 'triangle', dur: 0.12, gain: 0.05, echo: 0.3 }); },
    frenzy() { [3, 5, 7, 9, 12, 14].forEach((s, i) => tone({ f: hz(s), type: 'triangle', dur: 0.4, gain: 0.12, at: i * 0.05, echo: 0.7 })); },
    batch() {
      [0, 4, 7, 12].forEach((s, i) => tone({ f: hz(s), dur: 1.2, gain: 0.11, at: i * 0.04, echo: 0.9 }));
      tone({ f: 70, from: 300, glide: 0.4, dur: 0.6, gain: 0.4 });
    },
  };
})();
