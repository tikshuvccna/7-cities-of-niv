'use strict';
/* ---------- procedural music & sfx (WebAudio, no assets) ---------- */
const Snd = (() => {
  let ac = null, master = null, muted = false, mood = 'title', timer = null, nextT = 0, step = 0;
  try { muted = localStorage.getItem('niv7_mute') === '1'; } catch (e) {}
  const SCALE = [0, 1, 4, 5, 7, 8, 10]; // פריגית-דומיננטית — צליל מזרחי
  const MOODS = {
    title: { bpm: 74, root: 50, lead: [0, null, 2, 4, 3, null, 2, 1, 0, null, 2, 4, 5, 4, 3, 2], vol: 1 },
    sea:   { bpm: 84, root: 48, lead: [4, null, 2, null, 0, 2, 4, null, 5, null, 4, 2, 3, null, 1, null], vol: .8 },
    land:  { bpm: 100, root: 52, lead: [0, 2, 4, 2, 5, 4, 2, null, 0, 2, 4, 7, 5, 4, 2, 1], vol: .9, drum: true },
    city:  { bpm: 66, root: 45, lead: [7, null, null, 4, 5, null, 4, null, 2, null, 3, null, 0, null, null, null], vol: .9 },
    danger:{ bpm: 130, root: 47, lead: [0, 1, 0, 1, 4, 3, 1, 0, 0, 1, 0, 1, 5, 4, 3, 1], vol: .8, drum: true },
    win:   { bpm: 92, root: 55, lead: [0, 2, 4, 7, 4, 2, 4, 7, 9, 7, 4, 7, 9, 11, 9, 7], vol: 1, drum: true },
  };
  const mf = (root, deg, oct) => { const m = root + SCALE[((deg % 7) + 7) % 7] + 12 * (oct + Math.floor(deg / 7)); return 440 * Math.pow(2, (m - 69) / 12); };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : .55;
      const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
      nextT = ac.currentTime + .1; timer = setInterval(sched, 90);
    } catch (e) { ac = null; }
  }
  function tone(f, t, dur, type, vol, dest) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + .05);
  }
  function noise(t, dur, vol, hp) {
    const n = ac.sampleRate * dur | 0, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(); s.buffer = b; const g = ac.createGain(); g.gain.value = vol;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  function sched() {
    if (!ac || muted) { if (ac) nextT = Math.max(nextT, ac.currentTime); return; }
    const m = MOODS[mood], dur = 60 / m.bpm / 2;
    while (nextT < ac.currentTime + .3) {
      const s = step % 16, bar = (step / 16) | 0, t = nextT;
      if (s % 8 === 0) { const deg = [0, 3, 4, 0][bar % 4]; tone(mf(m.root, deg, -1), t, dur * 7.5, 'sine', .22 * m.vol); tone(mf(m.root, deg + 4, 0) , t, dur * 7.5, 'triangle', .05 * m.vol); }
      if (s % 4 === 2) tone(mf(m.root, 0, -1) * 1.5, t, dur * .8, 'sine', .09 * m.vol);
      const n = m.lead[s];
      if (n != null) { const sh = bar % 4 === 2 ? 2 : 0; tone(mf(m.root, n + sh, 1), t, dur * 1.6, 'triangle', .13 * m.vol); tone(mf(m.root, n + sh, 2), t, dur * .8, 'sine', .035 * m.vol); }
      if (m.drum) { if (s % 4 === 0) tone(95, t, .18, 'sine', .3); if (s % 8 === 4) noise(t, .12, .12, 1500); if (s % 2 === 1) noise(t, .04, .04, 6000); }
      nextT += dur; step++;
    }
  }
  const SFX = {
    click: [[660, 0, .06, 'square', .08]],
    step: null,
    coin: [[988, 0, .08, 'square', .1], [1319, .07, .22, 'square', .1]],
    gift: [[523, 0, .1, 'triangle', .2], [659, .09, .1, 'triangle', .2], [784, .18, .1, 'triangle', .2], [1047, .27, .35, 'triangle', .2]],
    good: [[523, 0, .12, 'triangle', .2], [784, .1, .3, 'triangle', .2]],
    bad: [[220, 0, .2, 'sawtooth', .13], [165, .15, .35, 'sawtooth', .13]],
    stone: [[392, 0, .15, 'triangle', .22], [494, .12, .15, 'triangle', .22], [587, .24, .15, 'triangle', .22], [784, .36, .15, 'triangle', .22], [988, .48, .8, 'triangle', .25], [1319, .6, 1, 'sine', .2]],
    horn: [[196, 0, .5, 'sawtooth', .12], [262, .45, .8, 'sawtooth', .12]],
    l0: [[392, 0, .35, 'sine', .3]], l1: [[494, 0, .35, 'sine', .3]], l2: [[587, 0, .35, 'sine', .3]], l3: [[784, 0, .35, 'sine', .3]],
    win: [[523, 0, .15, 'triangle', .22], [659, .15, .15, 'triangle', .22], [784, .3, .15, 'triangle', .22], [1047, .45, .5, 'triangle', .25], [784, .8, .15, 'triangle', .22], [1047, .95, .8, 'triangle', .25]],
    thunder: 'thunder', splash: 'splash', wind: 'splash',
  };
  function sfx(name) {
    if (!ac || muted) return; const d = SFX[name]; if (!d) return; const t = ac.currentTime;
    if (d === 'thunder') { noise(t, 1.4, .5, 80); tone(55, t, 1.2, 'sawtooth', .2); return; }
    if (d === 'splash') { noise(t, .35, .12, 1200); return; }
    d.forEach(([f, o, du, ty, v]) => tone(f, t + o, du, ty, v));
  }
  return {
    init, sfx,
    mood(m) { if (MOODS[m] && m !== mood) { mood = m; step = 0; } },
    toggle() { muted = !muted; try { localStorage.setItem('niv7_mute', muted ? '1' : '0'); } catch (e) {} if (master) master.gain.value = muted ? 0 : .55; return !muted; },
    get on() { return !muted; },
  };
})();
