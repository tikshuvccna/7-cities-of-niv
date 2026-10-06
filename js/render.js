'use strict';
/* ---------- canvas rendering: world, title, cinematics ---------- */
const Render = (() => {
  const cv = $('#c'), ctx = cv.getContext('2d');
  let W = 0, H = 0, T = 36, sprites = null;
  const cam = { x: 0, y: 0 };
  const parts = [];
  let miniDirty = true, miniImg = null, shake = 0, lightning = 0;
  const stars = Array.from({ length: 260 }, (_, i) => ({ x: hash2(i, 1, 7), y: hash2(i, 2, 7) * .65, s: .4 + hash2(i, 3, 7) * 1.6, p: hash2(i, 4, 7) * 6 }));
  const clouds = Array.from({ length: 9 }, (_, i) => ({ x: hash2(i, 5, 3) * 100, y: hash2(i, 6, 3) * 70, r: 4 + hash2(i, 7, 3) * 6, v: .25 + hash2(i, 8, 3) * .35 }));

  /* ----- sprites ----- */
  function mk(fn, variant, type) {
    const c = document.createElement('canvas'); c.width = c.height = T; const g = c.getContext('2d');
    const r = mulberry32(type * 977 + variant * 131 + 5); fn(g, r); return c;
  }
  const px = (g, r, n, col, a = 1, big = 1.5) => { g.fillStyle = col; g.globalAlpha = a; for (let i = 0; i < n; i++) g.fillRect(r() * T, r() * T, big * (1 + r()), big * (1 + r())); g.globalAlpha = 1; };
  const PAINT = {
    [T_SAND](g, r) { g.fillStyle = '#e8d196'; g.fillRect(0, 0, T, T); px(g, r, 26, '#f6e6b0', .8); px(g, r, 18, '#c9ae6a', .6); },
    [T_GRASS](g, r) { g.fillStyle = '#69a83f'; g.fillRect(0, 0, T, T); px(g, r, 14, '#7dbd4c', .7, 4); px(g, r, 10, '#4f8c2d', .7, 3);
      g.strokeStyle = '#3f7a24'; g.lineWidth = 1; for (let i = 0; i < 7; i++) { const x = r() * T, y = r() * T; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 1.5, y - 4); g.moveTo(x, y); g.lineTo(x + 1.5, y - 4); g.stroke(); } },
    [T_FOREST](g, r) { PAINT[T_GRASS](g, r); g.fillStyle = '#285a28';
      for (let i = 0; i < 3; i++) { const x = T * (.2 + .3 * i + r() * .1), y = T * (.38 + r() * .45), s = T * (.2 + r() * .08);
        g.fillStyle = '#00000033'; g.beginPath(); g.ellipse(x + 2, y + s * .9, s * .9, s * .35, 0, 0, TAU); g.fill();
        g.fillStyle = '#5a3a1c'; g.fillRect(x - 1.5, y, 3, s * .8);
        g.fillStyle = '#245a2a'; g.beginPath(); g.arc(x, y - s * .1, s, 0, TAU); g.fill();
        g.fillStyle = '#34803a'; g.beginPath(); g.arc(x - s * .25, y - s * .35, s * .65, 0, TAU); g.fill();
        g.fillStyle = '#58b04c'; g.beginPath(); g.arc(x - s * .35, y - s * .5, s * .28, 0, TAU); g.fill(); } },
    [T_HILLS](g, r) { PAINT[T_GRASS](g, r);
      for (let i = 0; i < 2; i++) { const x = T * (.3 + .4 * i + r() * .1), y = T * (.65 + r() * .1), w = T * (.32 + r() * .1);
        g.fillStyle = '#4f7a2e'; g.beginPath(); g.ellipse(x, y, w, w * .75, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#86b857'; g.beginPath(); g.ellipse(x - 2, y - 1, w * .85, w * .62, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#a5d070'; g.beginPath(); g.ellipse(x - w * .3, y - w * .35, w * .3, w * .16, -.4, 0, TAU); g.fill(); } },
    [T_MOUNT](g, r) { g.fillStyle = '#6f7d6a'; g.fillRect(0, 0, T, T); px(g, r, 14, '#8a9686', .7, 3);
      const peaks = [[.28, .78, .28, .55], [.66, .86, .34, .72], [.5, .6, .2, .4]];
      for (const [cx, by, w, hh] of peaks) { const x = cx * T, b = by * T, wd = w * T, ht = hh * T;
        g.fillStyle = '#00000030'; g.beginPath(); g.ellipse(x + 3, b, wd * 1.1, wd * .3, 0, 0, TAU); g.fill();
        g.fillStyle = '#7b7f86'; g.beginPath(); g.moveTo(x - wd, b); g.lineTo(x, b - ht); g.lineTo(x + wd, b); g.fill();
        g.fillStyle = '#565b66'; g.beginPath(); g.moveTo(x, b - ht); g.lineTo(x + wd, b); g.lineTo(x + wd * .1, b); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, b - ht); g.lineTo(x - wd * .32, b - ht * .66); g.lineTo(x - wd * .1, b - ht * .72); g.lineTo(x + wd * .08, b - ht * .62); g.lineTo(x + wd * .3, b - ht * .66); g.fill(); } },
    [T_SWAMP](g, r) { g.fillStyle = '#45705a'; g.fillRect(0, 0, T, T); px(g, r, 14, '#35604c', .8, 4);
      for (let i = 0; i < 3; i++) { g.fillStyle = '#2f6a78'; g.beginPath(); g.ellipse(r() * T, r() * T, T * .17, T * .09, 0, 0, TAU); g.fill(); g.fillStyle = '#ffffff22'; g.fillRect(r() * T, r() * T, 5, 1.5); }
      g.strokeStyle = '#8bb85a'; g.lineWidth = 1.5; for (let i = 0; i < 5; i++) { const x = r() * T, y = T * (.4 + r() * .6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 3, y - T * .22); g.stroke(); g.fillStyle = '#6b4a2a'; g.fillRect(x - 1, y - T * .26, 2.5, 5); } },
    [T_DESERT](g, r) { g.fillStyle = '#e1b96a'; g.fillRect(0, 0, T, T); px(g, r, 20, '#f2d28a', .7, 3);
      g.strokeStyle = '#c99a4c'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { const y = T * (.25 + i * .28 + r() * .06); g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(T * .5, y - T * .14, T, y + 2); g.stroke(); }
      if (r() < .5) { g.fillStyle = '#4e8a3a'; g.fillRect(T * .6, T * .45, 3, T * .28); g.fillRect(T * .6 - 4, T * .55, 4, 2.5); g.fillRect(T * .6 + 3, T * .5, 4, 2.5); } },
  };
  function buildSprites() {
    sprites = {};
    for (let ty = 2; ty <= 8; ty++) { if (!PAINT[ty]) continue; sprites[ty] = []; for (let v = 0; v < 4; v++) sprites[ty].push(mk(PAINT[ty], v, ty)); }
  }
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const nT = clamp(Math.floor(Math.min(W / 20, H / 12.5)), 30, 56);
    if (nT !== T || !sprites) { T = nT; buildSprites(); }
  }

  /* ----- particles (tile units) ----- */
  function spawn(p) { parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, life: 1, max: 1, size: 3, color: '#fff', g: 0, add: false }, p, {})); parts.at(-1).max = parts.at(-1).life; if (parts.length > 900) parts.shift(); }
  function burst(x, y, color, n = 24, spd = 3, size = 3, life = 1) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (.3 + Math.random()); spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, g: 4, life: life * (.5 + Math.random() * .7), size: size * (.5 + Math.random()), color, add: true }); }
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  }
  function drawParts(ox, oy) {
    for (const p of parts) {
      const a = clamp(p.life / p.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = p.color;
      if (p.add) ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.arc(ox + p.x * T, oy + p.y * T, p.size * (p.grow ? 2 - a : 1), 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  /* ----- entities ----- */
  function drawVillage(v, x, y, time) {
    const c = CULTURES[v.culture], r = mulberry32(v.seed);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#00000030'; ctx.beginPath(); ctx.ellipse(T * .5, T * .85, T * .52, T * .16, 0, 0, TAU); ctx.fill();
    const huts = [[.28, .6, .2], [.72, .58, .18], [.5, .42, .22]];
    for (const [hx, hy, s] of huts) {
      const bx = hx * T, by = hy * T, w = s * T;
      ctx.fillStyle = '#7a5530'; ctx.fillRect(bx - w, by - w * .2, w * 2, w * 1.2);
      ctx.fillStyle = c.cloth; ctx.beginPath(); ctx.moveTo(bx - w * 1.25, by - w * .1); ctx.lineTo(bx, by - w * 1.55); ctx.lineTo(bx + w * 1.25, by - w * .1); ctx.fill();
      ctx.fillStyle = '#00000035'; ctx.fillRect(bx - w * .25, by + w * .25, w * .5, w * .75);
    }
    ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(T * .5, T * .8, 3 + Math.sin(time * 9) * .8, 0, TAU); ctx.fill();
    for (let k = 0; k < 4; k++) { const p = ((time * .35 + k / 4) % 1); ctx.fillStyle = `rgba(210,210,220,${.4 * (1 - p)})`; ctx.beginPath(); ctx.arc(T * .5 + Math.sin(p * 6 + k) * 4, T * .72 - p * T * .8, 2 + p * 5, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#4a3016'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(T * .9, T * .85); ctx.lineTo(T * .9, T * .25); ctx.stroke();
    ctx.fillStyle = c.band; ctx.beginPath(); const fw = Math.sin(time * 4 + v.id) * 2; ctx.moveTo(T * .9, T * .25); ctx.lineTo(T * .9 + 9 + fw, T * .32); ctx.lineTo(T * .9, T * .4); ctx.fill();
    ctx.restore();
  }
  function drawCity(cy, x, y, time, locked) {
    const col = cy.color, pulse = .6 + .4 * Math.sin(time * 2 + cy.id);
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(T / 2, T / 2, 2, T / 2, T / 2, T * 1.3);
    g.addColorStop(0, col + (cy.done ? 'cc' : '88')); g.addColorStop(1, col + '00');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.globalAlpha = .5 + .4 * pulse; ctx.beginPath(); ctx.arc(T / 2, T / 2, T * 1.3, 0, TAU); ctx.fill();
    // light beam
    const bg = ctx.createLinearGradient(0, -T * 3, 0, T * .3); bg.addColorStop(0, col + '00'); bg.addColorStop(1, col + 'aa');
    ctx.globalAlpha = .35 + .3 * pulse; ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(T * .35, T * .3); ctx.lineTo(T * .1, -T * 3); ctx.lineTo(T * .9, -T * 3); ctx.lineTo(T * .65, T * .3); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#00000040'; ctx.beginPath(); ctx.ellipse(T * .5, T * .9, T * .62, T * .17, 0, 0, TAU); ctx.fill();
    const tw = [[.14, .35, .17], [.5, .15, .22], [.86, .38, .15]];
    for (const [tx, ty, w] of tw) {
      const bx = tx * T, top = ty * T, ww = w * T;
      ctx.fillStyle = '#d8c9a0'; ctx.fillRect(bx - ww, top, ww * 2, T * .85 - top);
      ctx.fillStyle = '#a89870'; ctx.fillRect(bx, top, ww, T * .85 - top);
      ctx.fillStyle = cy.done ? '#fff' : col; ctx.beginPath(); ctx.moveTo(bx - ww * 1.2, top); ctx.quadraticCurveTo(bx, top - ww * 3, bx + ww * 1.2, top); ctx.fill();
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(bx - 1.5, top + ww, 3, 6);
    }
    ctx.fillStyle = '#6a5a3a'; ctx.beginPath(); ctx.arc(T * .5, T * .85, T * .12, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `${Math.round(T * .5)}px sans-serif`; ctx.textAlign = 'center'; ctx.globalAlpha = .9;
    ctx.fillText(locked ? '🔒' : cy.done ? '✨' : cy.icon, T * .5, -T * .15 + Math.sin(time * 3) * 3);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawShip(x, y, time, dir, moving) {
    ctx.save(); ctx.translate(x + T / 2, y + T / 2 + Math.sin(time * 2.2) * 2); ctx.rotate(Math.sin(time * 1.7) * .05); ctx.scale(dir * T / 40, T / 40);
    ctx.fillStyle = '#00000030'; ctx.beginPath(); ctx.ellipse(0, 14, 20, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6b3f1d'; ctx.beginPath(); ctx.moveTo(-20, 2); ctx.lineTo(20, 2); ctx.quadraticCurveTo(15, 15, 9, 16); ctx.lineTo(-11, 16); ctx.quadraticCurveTo(-18, 12, -20, 2); ctx.fill();
    ctx.fillStyle = '#a56a33'; ctx.fillRect(-19, 1, 38, 4);
    ctx.fillStyle = '#ffcf5a'; ctx.fillRect(-14, 8, 3, 3); ctx.fillRect(-4, 8, 3, 3); ctx.fillRect(6, 8, 3, 3);
    ctx.fillStyle = '#4a2c12'; ctx.fillRect(-1.5, -26, 3, 28);
    const sw = Math.sin(time * 2) * 2;
    ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.moveTo(2, -24); ctx.quadraticCurveTo(18 + sw, -12, 14, 0); ctx.lineTo(2, 0); ctx.fill();
    ctx.fillStyle = '#e8d8b0'; ctx.beginPath(); ctx.moveTo(-2, -22); ctx.quadraticCurveTo(-14 - sw, -12, -12, -2); ctx.lineTo(-2, -2); ctx.fill();
    ctx.fillStyle = '#2f6fe0'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✦', 8, -9);
    ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(10 + sw, -29); ctx.lineTo(0, -32); ctx.fill();
    ctx.restore();
  }
  function drawNiv(x, y, time, moving, dir) {
    const b = moving ? Math.abs(Math.sin(time * 14)) * 3 : Math.sin(time * 2) * 1;
    ctx.save(); ctx.translate(x + T / 2, y + T * .86); ctx.scale(dir * T / 36, T / 36);
    ctx.fillStyle = '#00000040'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 3.5, 0, 0, TAU); ctx.fill();
    const l = moving ? Math.sin(time * 14) * 4 : 0;
    ctx.fillStyle = '#3a2412'; ctx.fillRect(-5 + l, -9, 4, 9); ctx.fillRect(1 - l, -9, 4, 9);
    ctx.translate(0, -b);
    ctx.fillStyle = '#1f4fa8'; ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(-6, -24); ctx.lineTo(6, -24); ctx.lineTo(9, -9); ctx.quadraticCurveTo(0, -5, -8, -9); ctx.fill();
    ctx.fillStyle = '#2c6bd6'; ctx.fillRect(-6, -24, 12, 5);
    ctx.fillStyle = '#d33a3a'; ctx.fillRect(-6, -25, 12, 3);
    ctx.fillStyle = '#e8b78a'; ctx.beginPath(); ctx.arc(0, -31, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(-1, -32, 1.8, 2); ctx.fillRect(2.5, -32, 1.8, 2);
    ctx.fillStyle = '#3a2412'; ctx.beginPath(); ctx.arc(-.5, -33, 6.8, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-9, -35, 18, 3); ctx.fillStyle = '#8a6238'; ctx.fillRect(-5.5, -41, 11, 6);
    ctx.strokeStyle = '#ffcf5a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(8, -16, 3.2, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffcf5a'; ctx.fillRect(7.6, -19.5, 1, 7);
    ctx.restore();
  }

  /* ----- main world renderer ----- */
  function play(G, time, dt) {
    const w = G.world; if (!w) return;
    if (G.actor) { cam.x = lerp(cam.x, G.actor.x, Math.min(1, dt * 6)); cam.y = lerp(cam.y, G.actor.y, Math.min(1, dt * 6)); if (!isFinite(cam.x)) { cam.x = G.actor.x; cam.y = G.actor.y; } }
    let sx = 0, sy = 0; if (shake > 0) { sx = (Math.random() - .5) * shake * 10; sy = (Math.random() - .5) * shake * 10; shake = Math.max(0, shake - dt * 2); }
    const ox = Math.round(W / 2 - (cam.x + .5) * T + sx), oy = Math.round(H / 2 - (cam.y + .5) * T + sy);
    ctx.fillStyle = '#0a1830'; ctx.fillRect(0, 0, W, H);
    const x0 = Math.max(0, Math.floor(-ox / T)), x1 = Math.min(w.W - 1, Math.ceil((W - ox) / T)), y0 = Math.max(0, Math.floor(-oy / T)), y1 = Math.min(w.H - 1, Math.ceil((H - oy) / T));
    const ax = G.actor.x, ay = G.actor.y, R = G.vis;
    // terrain
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * w.W + x, t = w.t[i], X = ox + x * T, Y = oy + y * T;
      if (t <= 1) {
        ctx.fillStyle = t === 0 ? '#14467c' : '#2a85b4'; ctx.fillRect(X, Y, T, T);
        const ph = time * 1.4 + x * .9 + y * .6;
        ctx.strokeStyle = '#d6efff'; ctx.lineWidth = 1.5; ctx.globalAlpha = .18 + .12 * Math.sin(ph);
        const hx = hash2(x, y, 3) * T * .4;
        ctx.beginPath(); ctx.moveTo(X + hx + 3, Y + T * .35 + Math.sin(ph) * 2); ctx.quadraticCurveTo(X + hx + T * .22, Y + T * .35 - 4 + Math.sin(ph) * 2, X + hx + T * .45, Y + T * .35 + Math.sin(ph) * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X + T * .3, Y + T * .75 + Math.sin(ph + 2) * 2); ctx.quadraticCurveTo(X + T * .5, Y + T * .75 - 4, X + T * .72, Y + T * .75 + Math.sin(ph + 2) * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        const m = w.adj[i];
        if (m) { ctx.fillStyle = `rgba(255,255,255,${.35 + .25 * Math.sin(time * 2 + x + y)})`; const e = 3 + Math.sin(time * 2 + x * .5) * 1.5;
          if (m & 1) ctx.fillRect(X + T - e, Y, e, T); if (m & 2) ctx.fillRect(X, Y, e, T); if (m & 4) ctx.fillRect(X, Y + T - e, T, e); if (m & 8) ctx.fillRect(X, Y, T, e); }
      } else ctx.drawImage(sprites[t][(x * 7 + y * 13) & 3], X, Y);
    }
    // entities (depth-ish order by y)
    const known = (xx, yy) => G.seen[yy * w.W + xx] === 1;
    for (const v of w.villages) if ((v.y >= y0 - 1 && v.y <= y1 && v.x >= x0 && v.x <= x1) && (known(v.x, v.y))) drawVillage(v, ox + v.x * T, oy + v.y * T, time);
    for (const c of w.cities) if (c.found && c.y >= y0 - 4 && c.y <= y1 + 1) drawCity(c, ox + c.x * T, oy + c.y * T, time, c.id === 6 && G.stones < 6 && !c.done);
    ctx.font = `${Math.round(T * .55)}px sans-serif`; ctx.textAlign = 'center';
    for (const m of w.mines) if (m.found && m.y >= y0 - 1 && m.y <= y1 && m.x >= x0 && m.x <= x1) ctx.fillText('⛏️', ox + m.x * T + T / 2, oy + m.y * T + T * .72);
    const shipX = ox + (G.mode === 'sea' ? ax : G.ship.x) * T, shipY = oy + (G.mode === 'sea' ? ay : G.ship.y) * T;
    drawShip(shipX, shipY, time, G.shipDir, G.moving && G.mode === 'sea');
    if (G.mode === 'land') drawNiv(ox + ax * T, oy + ay * T, time, G.moving, G.facing);
    // clouds shadow
    ctx.fillStyle = 'rgba(0,10,30,.10)';
    for (const c of clouds) { const cx = ((c.x + time * c.v * .6) % 120) - 10, cy = c.y; ctx.beginPath(); ctx.ellipse(ox + cx * T, oy + cy * T, c.r * T, c.r * T * .45, 0, 0, TAU); ctx.fill(); }
    // fog
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const seen = G.seen[y * w.W + x]; let a;
      if (!seen) a = .94; else { const d = Math.hypot(x - ax, y - ay); a = d < R - 1 ? 0 : lerp(0, .38, clamp(d - (R - 1), 0, 1)); }
      if (a > 0) { ctx.fillStyle = `rgba(6,10,20,${a})`; ctx.fillRect(ox + x * T, oy + y * T, T + 1, T + 1); }
    }
    // beacon markers for novice / hinted
    ctx.font = `${Math.round(T * .45)}px sans-serif`; ctx.textAlign = 'center';
    if (G.diff === 0) for (const v of w.villages) if (!known(v.x, v.y)) { ctx.globalAlpha = .75 + .25 * Math.sin(time * 3); ctx.fillText('🛖', ox + v.x * T + T / 2, oy + v.y * T + T * .7); }
    ctx.globalAlpha = 1;
    // actor-adjacent wake/dust
    drawParts(ox, oy);
    // weather
    if (G.storm > 0) {
      ctx.strokeStyle = 'rgba(200,220,255,.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < 130; i++) { const rx = (hash2(i, 1, 9) * (W + 200) + time * 600) % (W + 200) - 100, ry = (hash2(i, 2, 9) * H + time * 900) % H; ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 16); }
      ctx.stroke(); ctx.fillStyle = 'rgba(10,20,40,.35)'; ctx.fillRect(0, 0, W, H);
    }
    if (lightning > 0) { ctx.fillStyle = `rgba(255,255,255,${lightning})`; ctx.fillRect(0, 0, W, H); lightning = Math.max(0, lightning - dt * 3); }
    // day / night
    const f = G.day % 1, dl = .5 + .5 * Math.sin(f * TAU), warm = 1 - Math.abs(dl - .5) * 2;
    ctx.fillStyle = `rgba(8,14,48,${(1 - dl) * .52})`; ctx.fillRect(0, 0, W, H);
    if (warm > 0) { ctx.fillStyle = `rgba(255,130,50,${warm * .13})`; ctx.fillRect(0, 0, W, H); }
    if (dl < .35) { ctx.globalCompositeOperation = 'lighter'; for (const c of w.cities) if (c.found) { const gx = ox + c.x * T + T / 2, gy = oy + c.y * T + T / 2; const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, T * 3); g.addColorStop(0, c.color + '66'); g.addColorStop(1, c.color + '00'); ctx.fillStyle = g; ctx.fillRect(gx - T * 3, gy - T * 3, T * 6, T * 6); }
      for (let i = 0; i < 18; i++) { const fx = W / 2 + Math.sin(time * .5 + i * 7) * W * .45, fy = H / 2 + Math.cos(time * .4 + i * 3) * H * .4; ctx.fillStyle = `rgba(255,240,140,${.5 + .5 * Math.sin(time * 4 + i)})`; ctx.beginPath(); ctx.arc(fx, fy, 2, 0, TAU); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over'; }
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    stepParts(dt);
    // ambient particles: wake, birds
    if (G.moving && Math.random() < .6) { if (G.mode === 'sea') spawn({ x: ax + .5 - G.shipDir * .4, y: ay + .8, vx: -G.shipDir * .3, vy: .1, life: .8, size: 3, color: 'rgba(255,255,255,.7)' }); else spawn({ x: ax + .5, y: ay + .9, vx: (Math.random() - .5) * .6, vy: -.3, life: .5, size: 2, color: 'rgba(180,150,100,.6)' }); }
    for (const v of w.villages) if (known(v.x, v.y) && Math.random() < dt * .6) spawn({ x: v.x + .5, y: v.y + .3, vx: .1, vy: -.5, life: 2, size: 2, color: 'rgba(200,200,210,.3)', grow: true });
  }

  /* ----- minimap ----- */
  const MC = ['#14467c', '#2a85b4', '#e8d196', '#69a83f', '#2a6a2c', '#86b857', '#9a9ea6', '#45705a', '#e1b96a'];
  function minimap(G) {
    const mc = $('#mini'), g = mc.getContext('2d'), w = G.world, sc = 2;
    if (!miniImg || miniDirty) {
      miniImg = g.createImageData(w.W * sc, w.H * sc);
      for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
        const s = G.seen[y * w.W + x]; const col = s ? MC[w.t[y * w.W + x]] : '#0b1220'; const n = parseInt(col.slice(1), 16);
        for (let dy = 0; dy < sc; dy++) for (let dx = 0; dx < sc; dx++) { const o = ((y * sc + dy) * w.W * sc + x * sc + dx) * 4; miniImg.data[o] = n >> 16; miniImg.data[o + 1] = (n >> 8) & 255; miniImg.data[o + 2] = n & 255; miniImg.data[o + 3] = 255; }
      }
      miniDirty = false;
    }
    g.putImageData(miniImg, 0, 0);
    const blink = (Date.now() / 400) & 1;
    for (const v of w.villages) if (G.seen[v.y * w.W + v.x] || G.diff === 0) { g.fillStyle = v.met ? '#7bd88f' : '#ff9f2e'; g.fillRect(v.x * sc - 1, v.y * sc - 1, 4, 4); }
    for (const c of w.cities) if (c.found) { g.fillStyle = c.done ? '#fff' : c.color; g.fillRect(c.x * sc - 2, c.y * sc - 2, 6, 6); g.strokeStyle = '#000'; g.strokeRect(c.x * sc - 2, c.y * sc - 2, 6, 6); }
    for (const m of w.mines) if (m.found) { g.fillStyle = '#ffd34d'; g.fillRect(m.x * sc - 1, m.y * sc - 1, 4, 4); }
    g.fillStyle = '#fff'; g.fillRect(G.ship.x * sc - 1, G.ship.y * sc - 1, 4, 4);
    if (blink) { g.fillStyle = '#ff3b3b'; g.fillRect(G.pos.x * sc - 2, G.pos.y * sc - 2, 5, 5); }
  }

  /* ----- scenes ----- */
  function skyGrad(top, mid, bot, hz) { const g = ctx.createLinearGradient(0, 0, 0, H * hz); g.addColorStop(0, top); g.addColorStop(.6, mid); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * hz + 1); }
  function starsDraw(time, a = 1) { ctx.fillStyle = '#fff'; for (const s of stars) { ctx.globalAlpha = a * (.4 + .6 * Math.sin(time * 1.5 + s.p) ** 2); ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.s * .8, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
  function seaDraw(time, hz, c1, c2, glowX, glowCol) {
    const g = ctx.createLinearGradient(0, H * hz, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, H * hz, W, H * (1 - hz));
    if (glowX != null) { const gg = ctx.createLinearGradient(0, H * hz, 0, H); gg.addColorStop(0, glowCol); gg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gg; ctx.globalAlpha = .35; ctx.beginPath(); ctx.moveTo(glowX - W * .015, H * hz); ctx.lineTo(glowX + W * .015, H * hz); ctx.lineTo(glowX + W * .09, H); ctx.lineTo(glowX - W * .09, H); ctx.fill(); ctx.globalAlpha = 1; }
    for (let i = 0; i < 26; i++) { const k = i / 26, y = H * hz + (H * (1 - hz)) * k * k + 4; ctx.strokeStyle = `rgba(190,225,255,${.1 + .2 * k})`; ctx.lineWidth = .6 + k * 2; ctx.beginPath();
      for (let x = 0; x <= W; x += 14) { const yy = y + Math.sin(x * .02 * (1 + k) + time * (1 + k) + i * 2) * (2 + k * 6); x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); }
  }
  function shipSil(x, y, s, time, col = '#05080f', lit = '#ffd36a') {
    ctx.save(); ctx.translate(x, y + Math.sin(time * 1.6) * s * .04); ctx.rotate(Math.sin(time * 1.2) * .03); ctx.scale(s, s); ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(60, 0); ctx.quadraticCurveTo(45, 28, 25, 30); ctx.lineTo(-35, 30); ctx.quadraticCurveTo(-55, 24, -60, 0); ctx.fill();
    ctx.fillRect(-3, -90, 5, 90);
    ctx.beginPath(); ctx.moveTo(6, -86); ctx.quadraticCurveTo(52, -50 + Math.sin(time * 2) * 4, 40, -6); ctx.lineTo(6, -6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, -80); ctx.quadraticCurveTo(-42, -48, -36, -8); ctx.lineTo(-6, -8); ctx.fill();
    ctx.fillStyle = lit; ctx.fillRect(-30, 8, 5, 5); ctx.fillRect(-12, 8, 5, 5); ctx.fillRect(6, 8, 5, 5); ctx.fillRect(24, 8, 5, 5);
    ctx.restore();
  }
  function title(time) {
    skyGrad('#050a1e', '#1a2150', '#6a3a6a', .62); starsDraw(time);
    const t2 = time * .3;
    for (let k = 0; k < 3; k++) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, H * .05, 0, H * .45); const hue = [150, 180, 280][k]; g.addColorStop(0, `hsla(${hue},80%,60%,0)`); g.addColorStop(.5, `hsla(${hue},80%,60%,.16)`); g.addColorStop(1, `hsla(${hue},80%,60%,0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H * .3);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * (.2 + k * .06) + Math.sin(x * .004 + t2 * (1 + k * .4) + k) * H * .06); ctx.lineTo(W, H * .5); ctx.lineTo(0, H * .5); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    const mx = W * .78, my = H * .22, mr = Math.min(W, H) * .07;
    const mg = ctx.createRadialGradient(mx, my, mr * .5, mx, my, mr * 4); mg.addColorStop(0, 'rgba(255,240,200,.5)'); mg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8dcb8'; ctx.beginPath(); ctx.arc(mx - mr * .3, my - mr * .2, mr * .25, 0, TAU); ctx.arc(mx + mr * .35, my + mr * .3, mr * .18, 0, TAU); ctx.fill();
    // shooting star
    const ss = (time * .2) % 1; if (ss < .08) { const p = ss / .08; ctx.strokeStyle = `rgba(255,255,255,${1 - p})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W * (.7 - p * .3), H * (.05 + p * .2)); ctx.lineTo(W * (.7 - p * .3 + .08), H * (.05 + p * .2 - .05)); ctx.stroke(); }
    seaDraw(time, .62, '#1c2a5a', '#050a1e', mx, '#fff0c0');
    // seven distant lights
    for (let i = 0; i < 7; i++) { const x = W * (.12 + i * .125), y = H * .62; const c = CITY_DEFS[i].color, p = .6 + .4 * Math.sin(time * 2 + i);
      ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, 40 + 20 * p); g.addColorStop(0, c + 'cc'); g.addColorStop(1, c + '00'); ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140);
      const bg = ctx.createLinearGradient(0, y - H * .3, 0, y); bg.addColorStop(0, c + '00'); bg.addColorStop(1, c + '66'); ctx.fillStyle = bg; ctx.fillRect(x - 3, y - H * .3, 6, H * .3);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
    const sx = W * (1.1 - (time * .012) % 1.3); shipSil(sx, H * .7, Math.min(W, H) / 700, time);
    // foreground cliff + Niv silhouette
    ctx.fillStyle = '#03060f'; ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W, H * .83); ctx.quadraticCurveTo(W * .92, H * .78, W * .86, H * .82); ctx.quadraticCurveTo(W * .8, H * .9, W * .7, H); ctx.fill();
    const nx = W * .9, ny = H * .8, ns = Math.min(W, H) / 330; ctx.save(); ctx.translate(nx, ny); ctx.scale(-ns, ns); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-7, -26); ctx.lineTo(7, -26); ctx.lineTo(10, 0); ctx.fill(); ctx.beginPath(); ctx.arc(0, -32, 7, 0, TAU); ctx.fill(); ctx.fillRect(-10, -37, 20, 3); ctx.fillRect(-6, -44, 12, 8);
    ctx.fillStyle = '#ffd36a'; ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(14, -14, 0, 14, -14, 40); lg.addColorStop(0, '#ffd36acc'); lg.addColorStop(1, '#ffd36a00'); ctx.fillStyle = lg; ctx.fillRect(-30, -60, 90, 90); ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    for (const c of clouds.slice(0, 4)) { ctx.fillStyle = 'rgba(180,190,255,.06)'; ctx.beginPath(); ctx.ellipse(((c.x + time * c.v) % 130) / 130 * W * 1.2 - W * .1, c.y / 70 * H * .4, c.r * 16, c.r * 5, 0, 0, TAU); ctx.fill(); }
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  function parchment(x, y, w, h2) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h2); g.addColorStop(0, '#f2e2b6'); g.addColorStop(.5, '#e6cf98'); g.addColorStop(1, '#d4b878'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h2);
    ctx.strokeStyle = '#7a5518'; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h2);
    const r = mulberry32(5); ctx.fillStyle = 'rgba(120,80,20,.1)'; for (let i = 0; i < 80; i++) ctx.fillRect(x + r() * w, y + r() * h2, 2 + r() * 14, 2 + r() * 4);
  }
  // scene index 0..3, t seconds since scene start
  function cine(i, t, time) {
    ctx.clearRect(0, 0, W, H);
    if (i === 0) { // night harbor with lighthouse
      skyGrad('#030612', '#0e1a3e', '#27325e', .66); starsDraw(time); seaDraw(time, .66, '#12204a', '#030612', W * .3, '#ffe9a0');
      const lx = W * .78, ly = H * .66; ctx.fillStyle = '#10152a'; ctx.beginPath(); ctx.moveTo(lx - 50, H); ctx.lineTo(lx - 28, ly - 30); ctx.lineTo(lx + 28, ly - 30); ctx.lineTo(lx + 60, H); ctx.fill();
      ctx.fillStyle = '#1a2040'; ctx.beginPath(); ctx.moveTo(lx - 22, ly - 30); ctx.lineTo(lx - 12, ly - 250); ctx.lineTo(lx + 12, ly - 250); ctx.lineTo(lx + 22, ly - 30); ctx.fill();
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(lx - 14, ly - 280, 28, 30);
      const ang = time * .9; ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(lx, ly - 265, lx + Math.cos(ang) * W, ly - 265); g.addColorStop(0, 'rgba(255,240,170,.55)'); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx, ly - 265); ctx.lineTo(lx + Math.cos(ang - .09) * W * 1.2, ly - 265 + Math.sin(ang - .09) * 80 - 40); ctx.lineTo(lx + Math.cos(ang + .09) * W * 1.2, ly - 265 + Math.sin(ang + .09) * 80 + 40); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      shipSil(W * .3, H * .74, Math.min(W, H) / 800, time); shipSil(W * .52, H * .7, Math.min(W, H) / 1400, time + 1);
    } else if (i === 1) { // map
      ctx.fillStyle = '#2a1a0a'; ctx.fillRect(0, 0, W, H); const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * .6); g.addColorStop(0, '#6b4a1a'); g.addColorStop(1, '#1a0f05'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const mw = Math.min(W * .82, 900), mh = Math.min(H * .6, 520), mx = (W - mw) / 2, my = H * .1; parchment(mx, my, mw, mh);
      ctx.strokeStyle = '#6a4a1a'; ctx.fillStyle = '#c9ad6a'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let a = 0; a <= TAU + .1; a += .15) { const r = .3 + .08 * Math.sin(a * 3) + .05 * Math.sin(a * 7 + 1); const x = mx + mw * (.62 + r * Math.cos(a) * .75), y = my + mh * (.5 + r * Math.sin(a) * 1.1); a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.fill(); ctx.stroke();
      ctx.setLineDash([8, 8]); ctx.strokeStyle = '#a02020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx + mw * .08, my + mh * .5); const rt = clamp(t / 4, 0, 1);
      for (let k = 0; k <= rt * 60; k++) { const u = k / 60; ctx.lineTo(mx + mw * (.08 + u * .6), my + mh * (.5 + Math.sin(u * 9) * .12 * (1 - u * .3))); } ctx.stroke(); ctx.setLineDash([]);
      for (let k = 0; k < 7; k++) { const sh = clamp((t - .6 - k * .55) * 2, 0, 1); if (sh <= 0) continue; const x = mx + mw * (.5 + (k % 4) * .1 + (k > 3 ? .05 : 0)), y = my + mh * (.25 + Math.floor(k / 4) * .3 + (k % 2) * .1); const c = CITY_DEFS[k].color;
        ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(x, y, 0, x, y, 40 * sh); gg.addColorStop(0, c); gg.addColorStop(1, c + '00'); ctx.fillStyle = gg; ctx.fillRect(x - 50, y - 50, 100, 100); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 5 * sh, 0, TAU); ctx.fill(); ctx.fillStyle = '#3a2208'; ctx.font = '700 15px Heebo,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(k + 1, x, y - 14); }
      ctx.fillStyle = '#7a1c1c'; ctx.font = '40px sans-serif'; ctx.fillText('🧭', mx + 50, my + mh - 20);
    } else if (i === 2) { // dawn harbor
      const rise = clamp(t / 7, 0, 1);
      skyGrad('#1a1a4a', '#c0507a', '#ffb060', .66); starsDraw(time, 1 - rise);
      const sy = H * (.7 - rise * .22), sg = ctx.createRadialGradient(W / 2, sy, 0, W / 2, sy, W * .5); sg.addColorStop(0, 'rgba(255,230,160,.9)'); sg.addColorStop(.3, 'rgba(255,170,90,.4)'); sg.addColorStop(1, 'rgba(255,120,60,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H * .7);
      ctx.fillStyle = '#fff4c8'; ctx.beginPath(); ctx.arc(W / 2, sy, Math.min(W, H) * .07, 0, TAU); ctx.fill();
      seaDraw(time, .66, '#e08a5a', '#1a2a5a', W / 2, '#ffe0a0');
      shipSil(W * .62, H * .72, Math.min(W, H) / 650, time, '#1a0f1a', '#ffe9a0');
      ctx.fillStyle = '#120a14'; ctx.fillRect(0, H * .86, W * .5, H * .14); const ns = Math.min(W, H) / 260;
      for (let k = 0; k < 6; k++) { const x = W * (.05 + k * .07), s = k === 3 ? ns * 1.3 : ns; ctx.save(); ctx.translate(x, H * .86); ctx.scale(s, s); ctx.fillStyle = '#120a14'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-6, -24); ctx.lineTo(6, -24); ctx.lineTo(8, 0); ctx.fill(); ctx.beginPath(); ctx.arc(0, -30, 6, 0, TAU); ctx.fill(); if (k === 3) { ctx.fillRect(-12, -36, 24, 3); ctx.fillRect(-6, -43, 12, 8); } ctx.restore(); }
    } else { // vow & sailing
      const p = clamp(t / 10, 0, 1);
      skyGrad('#2a3a8a', '#ff9a5a', '#ffe0a0', .6); const sg = ctx.createRadialGradient(W * .5, H * .56, 0, W * .5, H * .56, W * .6); sg.addColorStop(0, 'rgba(255,240,180,1)'); sg.addColorStop(.25, 'rgba(255,200,120,.5)'); sg.addColorStop(1, 'rgba(255,160,80,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(W * .5, H * .56, Math.min(W, H) * .09, 0, TAU); ctx.fill();
      seaDraw(time, .6, '#d88a5a', '#1c2f6a', W * .5, '#fff0c0'); ctx.save();
      for (let k = 0; k < 7; k++) { const x = W * (.1 + k * .13), y = H * (.58 - .03 * Math.sin(k)), c = CITY_DEFS[k].color; ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, 30); g.addColorStop(0, c + 'cc'); g.addColorStop(1, c + '00'); ctx.fillStyle = g; ctx.fillRect(x - 40, y - 40, 80, 80); ctx.globalCompositeOperation = 'source-over'; }
      ctx.restore(); shipSil(W * (1.05 - p * .65), H * .72, Math.min(W, H) / 550, time, '#0d0a18', '#ffe9a0');
    }
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function ending(time, win, G) {
    ctx.clearRect(0, 0, W, H);
    if (win) {
      skyGrad('#06102e', '#2a1a5a', '#ff9a5a', .7); starsDraw(time); seaDraw(time, .7, '#2a3a7a', '#06102e', W / 2, '#ffe9a0');
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) { const c = CITY_DEFS[i].color, a = time * .4 + i / 7 * TAU, cx = W / 2 + Math.cos(a) * W * .2, cy = H * .35 + Math.sin(a) * H * .12;
        const bg = ctx.createLinearGradient(cx, cy, cx, H * .7); bg.addColorStop(0, c + 'aa'); bg.addColorStop(1, c + '00'); ctx.fillStyle = bg; ctx.fillRect(cx - 6, cy, 12, H * .7 - cy);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50); g.addColorStop(0, c); g.addColorStop(1, c + '00'); ctx.fillStyle = g; ctx.fillRect(cx - 60, cy - 60, 120, 120); }
      const g = ctx.createRadialGradient(W / 2, H * .35, 0, W / 2, H * .35, H * .5); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      shipSil(W * .5, H * .78, Math.min(W, H) / 600, time, '#0a0818');
      if (Math.random() < .06) { const fx = Math.random() * W * .8 + W * .1, fy = Math.random() * H * .4 + H * .05, col = CITY_DEFS[(Math.random() * 7) | 0].color; for (let k = 0; k < 40; k++) { const a = Math.random() * TAU, s = 60 + Math.random() * 140; fw.push({ x: fx, y: fy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.2, col }); } }
      ctx.globalCompositeOperation = 'lighter'; for (let k = fw.length - 1; k >= 0; k--) { const p = fw[k]; p.life -= .016; if (p.life <= 0) { fw.splice(k, 1); continue; } p.x += p.vx * .016; p.y += p.vy * .016; p.vy += 90 * .016; ctx.globalAlpha = p.life / 1.2; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    } else {
      skyGrad('#0a0a14', '#1a1a2a', '#2a2a3a', .7); starsDraw(time, .6); seaDraw(time, .7, '#1a2030', '#05060a'); shipSil(W * .5, H * .76, Math.min(W, H) / 650, time, '#030308', '#6a5a3a');
    }
  }
  const fw = [];

  /* ----- portrait ----- */
  function portrait(c, v) {
    const g = c.getContext('2d'), cu = CULTURES[v.culture], r = mulberry32(v.seed), w = c.width, hh = c.height;
    const bg = g.createLinearGradient(0, 0, 0, hh); bg.addColorStop(0, '#2a4a7a'); bg.addColorStop(1, '#a8754a'); g.fillStyle = bg; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#2f6a3a'; g.beginPath(); g.moveTo(0, hh * .75); g.quadraticCurveTo(w * .3, hh * .5, w * .6, hh * .72); g.quadraticCurveTo(w * .85, hh * .6, w, hh * .7); g.lineTo(w, hh); g.lineTo(0, hh); g.fill();
    g.fillStyle = cu.cloth; g.beginPath(); g.moveTo(w * .12, hh); g.quadraticCurveTo(w * .15, hh * .68, w * .5, hh * .66); g.quadraticCurveTo(w * .85, hh * .68, w * .88, hh); g.fill();
    g.fillStyle = cu.skin; g.fillRect(w * .43, hh * .55, w * .14, hh * .14);
    g.fillStyle = cu.hair; g.beginPath(); g.ellipse(w * .5, hh * .42, w * .21, hh * .26, 0, 0, TAU); g.fill();
    g.fillStyle = cu.skin; g.beginPath(); g.ellipse(w * .5, hh * .45, w * .17, hh * .22, 0, 0, TAU); g.fill();
    g.fillStyle = cu.hair; g.beginPath(); g.ellipse(w * .5, hh * .3, w * .19, hh * .1, 0, Math.PI, 0); g.fill();
    g.fillStyle = cu.band; g.fillRect(w * .31, hh * .3, w * .38, hh * .045);
    const eye = v.att === 2 ? -.04 : 0;
    g.fillStyle = '#fff'; g.fillRect(w * .39, hh * .43, w * .07, hh * .035); g.fillRect(w * .54, hh * .43, w * .07, hh * .035);
    g.fillStyle = '#1a0f08'; g.fillRect(w * .42, hh * .43, w * .03, hh * .035); g.fillRect(w * .55, hh * .43, w * .03, hh * .035);
    g.strokeStyle = '#1a0f08'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * .38, hh * (.41 + eye)); g.lineTo(w * .47, hh * (.41 - eye)); g.moveTo(w * .53, hh * (.41 - eye)); g.lineTo(w * .62, hh * (.41 + eye)); g.stroke();
    g.beginPath(); g.lineWidth = 2.5; if (v.att === 2 && v.trust < 0) { g.moveTo(w * .43, hh * .58); g.quadraticCurveTo(w * .5, hh * .55, w * .57, hh * .58); } else { g.moveTo(w * .43, hh * .56); g.quadraticCurveTo(w * .5, hh * (v.trust > 2 ? .62 : .58), w * .57, hh * .56); } g.stroke();
    g.fillStyle = cu.band; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(w * (.34 + i * .08), hh * .68, 4, 0, TAU); g.fill(); }
  }

  return { resize, play, title, cine, ending, portrait, minimap, burst, spawn, dirtyMini() { miniDirty = true; }, shake(n) { shake = n; }, lightning() { lightning = .8; }, cam, get T() { return T; }, get W() { return W; }, get H() { return H; } };
})();
