/* ----- radio: plays the songs in music/tracks.json at random, one after another, with a short crossfade ----- */
const Music = (() => {
  const XF = 3;                       // crossfade seconds
  let tracks = [], bag = [], last = -1, on = true, vol = 0.5, muted = false, started = false, loaded = false;
  let cur = null, nxt = null, fadeTimer = 0, listeners = [];
  // shuffle bag: every song plays once per round, and a round never opens with the song that just ended
  function nextIndex() {
    if (!tracks.length) return -1;
    if (!bag.length) {
      bag = tracks.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag.length > 1 && bag[bag.length - 1] === last) { const k = Math.floor(Math.random() * (bag.length - 1)); [bag[bag.length - 1], bag[k]] = [bag[k], bag[bag.length - 1]]; }
    }
    last = bag.pop(); return last;
  }
  const level = () => (on && !muted ? vol : 0);
  const emit = () => listeners.forEach((f) => f());
  function make(i) {
    if (typeof Audio === 'undefined') return null;
    const a = new Audio(tracks[i].src); a.preload = 'auto'; a.volume = 0; a._i = i; return a;
  }
  function play(a) { const r = a.play(); if (r && r.catch) r.catch(() => { started = false; }); }
  // fades every playing element towards its target each 100 ms: the current song to full level, the one leaving to silence
  function tick() {
    const lv = level();
    if (cur && !cur.paused) {
      const left = (cur.duration || 0) - cur.currentTime;
      if (!nxt && cur.duration && left <= XF) { const i = nextIndex(); nxt = make(i); if (nxt) { nxt._fade = 0; play(nxt); } }
      cur.volume = Math.max(0, Math.min(1, lv * (nxt ? Math.max(0, left / XF) : 1)));
    }
    if (nxt) {
      nxt._fade = Math.min(1, (nxt._fade || 0) + 0.1 / XF); nxt.volume = Math.max(0, Math.min(1, lv * nxt._fade));
      if (cur && (cur.ended || cur.currentTime >= (cur.duration || 1e9) - 0.05)) { cur.pause(); cur = nxt; nxt = null; }
    } else if (cur && cur.ended) { const i = nextIndex(); cur = make(i); if (cur) { cur.volume = lv; play(cur); } }
  }
  function run() { if (!fadeTimer && typeof setInterval !== 'undefined') fadeTimer = setInterval(tick, 100); }
  function stop() { if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = 0; } }
  function load() {
    if (loaded || typeof fetch === 'undefined') return Promise.resolve();
    loaded = true;
    return fetch('music/tracks.json').then((r) => (r.ok ? r.json() : [])).then((j) => {
      tracks = (Array.isArray(j) ? j : j.tracks || []).map((t) => (typeof t === 'string' ? { src: 'music/' + t, title: t } : { src: t.src.indexOf('/') < 0 ? 'music/' + t.src : t.src, title: t.title || t.src })).filter((t) => t.src);
      emit(); if (started) begin();
    }).catch(() => { tracks = []; emit(); });
  }
  function begin() {
    if (cur || !on || !tracks.length) return;
    const i = nextIndex(); cur = make(i); if (!cur) return;
    cur.volume = level(); play(cur); run();
  }
  // call from a user gesture: browsers only allow audio after one
  function start() { if (started) return; started = true; load().then(begin); }
  function setOn(b) {
    on = !!b;
    if (!on) { if (cur) cur.pause(); if (nxt) { nxt.pause(); nxt = null; } }
    else if (started) { if (cur) { if (typeof document === 'undefined' || !document.hidden) play(cur); } else begin(); }
    emit();
  }
  function setVolume(v) { vol = Math.max(0, Math.min(1, +v || 0)); if (cur && !cur.paused) cur.volume = level(); }
  function setMuted(m) { muted = !!m; if (cur && !cur.paused) cur.volume = level(); }
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', () => {
    if (!cur) return;
    if (document.hidden) { cur.pause(); if (nxt) nxt.pause(); } else if (on) { play(cur); if (nxt) play(nxt); }
  });
  return { start, setOn, setVolume, setMuted, hasTracks: () => tracks.length > 0, count: () => tracks.length, isOn: () => on, onChange: (f) => listeners.push(f), load, _next: nextIndex, _set: (t) => { tracks = t; bag = []; last = -1; }, stop };
})();
