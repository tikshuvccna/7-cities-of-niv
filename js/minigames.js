'use strict';
/* ---------- the seven city trials ---------- */
const Minigames = (() => {
  const RIDDLES = [
    { q: 'יש לי ערים אבל אין בתים, יש לי הרים אבל אין עצים, יש לי מים אבל אין דגים. מה אני?', a: 'מפה', w: ['חלום', 'ספר', 'צל'] },
    { q: 'מה עולה ויורד בלי לזוז ממקומו?', a: 'המדרגות', w: ['הענן', 'הגל', 'השמש'] },
    { q: 'יש לו מפתחות אבל אין לו מנעולים. יש לו מרווחים אבל אין לו חדרים. מה זה?', a: 'פסנתר', w: ['שער', 'קופסה', 'ספינה'] },
    { q: 'ככל שלוקחים ממנו יותר, הוא נעשה גדול יותר. מה זה?', a: 'בור', w: ['כיס', 'נהר', 'ענן'] },
    { q: 'מה שייך לך, אבל אחרים משתמשים בו יותר ממך?', a: 'השם שלך', w: ['הכובע', 'הספינה', 'הכסף'] },
    { q: 'יש לו ראש ויש לו זנב, אבל אין לו גוף. מה זה?', a: 'מטבע', w: ['נחש', 'כוכב', 'כדור'] },
    { q: 'אני גבוה כשאני צעיר, ונמוך כשאני זקן. מה אני?', a: 'נר', w: ['עץ', 'הר', 'ילד'] },
    { q: 'מה נעשה רטוב בזמן שהוא מייבש?', a: 'מגבת', w: ['אבן', 'עץ', 'זכוכית'] },
  ];
  const DILEMMAS = [
    { q: 'שומר השער מציע לך להיכנס בלי תור, אם תבטיח לו חלק מהמטמון של העיר.',
      o: [['לקבל — חבל על הזמן', 0], ['לסרב בנימוס ולחכות בתור כמו כולם', 1], ['לאיים עליו שיפתח', 0]], why: 'כבוד אמיתי לא נקנה בשוחד ולא נלקח בכוח.' },
    { q: 'נפלה בידיך מפה שמובילה לכפר סודי של שבט שמעדיף שלא ימצאו אותו.',
      o: [['לפרסם אותה ברבים — זה ידע חשוב', 0], ['להחזיר אותה לשבט ולבקש רשות לפני כל צעד', 1], ['לשמור אותה לעצמי', 0]], why: 'ידע שייך קודם כל למי שהוא נוגע בו.' },
    { q: 'חבר מהצוות טעה וגרם נזק בשוק העיר. כולם חושדים בזר שעבר שם.',
      o: [['לשתוק — זה לא אני', 0], ['לקחת אחריות, לתקן את הנזק וללמד את חברי', 1], ['להאשים את הזר', 0]], why: 'מנהיג נושא באחריות — ואינו מטיל אותה על חף מפשע.' },
    { q: 'מצאת ארגז זהב נטוש ליד ביתו של זקן העיר. אף אחד לא ראה.',
      o: [['לקחת חלק קטן — ממילא נטוש', 0], ['להחזיר לזקן ולספר איפה מצאת', 1], ['להשאיר ולהמשיך הלאה', 0]], why: 'יושרה היא מה שאתה עושה כשאף אחד לא רואה.' },
  ];

  function frame(title, story, body, onExit) {
    const p = h('div', { class: 'panel mg' }, h('h2', null, title), story ? h('p', null, story) : null, body,
      h('div', { class: 'row' }, h('button', { class: 'btn dark', onclick: () => { Snd.sfx('click'); onExit(); } }, 'לצאת מהעיר')));
    return p;
  }
  const lanterns = (city, diff, win, exit) => {
    const cols = ['#ff5a5a', '#ffd34d', '#4dc4ff', '#8dff7a']; const len = [4, 5, 6][diff] + 0; let seq = [], inp = [], busy = true; const btns = [];
    const info = h('p', { class: 'info' }, 'הסתכל…');
    const lan = h('div', { class: 'lan' }, cols.map((c, i) => { const b = h('button', { style: `background:linear-gradient(${c},${c}aa);--c:${c}`, onclick: () => press(i) }, i + 1); btns.push(b); return b; }));
    const flashL = async i => { btns[i].classList.add('lit'); Snd.sfx('l' + i); await sleep(420); btns[i].classList.remove('lit'); await sleep(160); };
    async function start() { busy = true; seq = Array.from({ length: len }, () => rint(0, 3)); inp = []; info.textContent = 'הסתכל בלהבות…'; await sleep(700); for (const i of seq) await flashL(i); info.textContent = 'עכשיו אתה! חזור על הסדר (או לחץ 1–4)'; busy = false; }
    async function press(i) { if (busy) return; flashL(i); if (seq[inp.length] !== i) { busy = true; Snd.sfx('bad'); info.textContent = 'לא בדיוק… נתחיל מחדש'; await sleep(1200); return start(); } inp.push(i); if (inp.length === seq.length) { busy = true; info.textContent = 'כל הלהבות נדלקו! השער נפתח'; await sleep(900); win(); } }
    const keyH = e => { const k = +e.key; if (k >= 1 && k <= 4) press(k - 1); };
    document.addEventListener('keydown', keyH);
    setTimeout(start, 500);
    return { el: frame(city.name, city.story, h('div', null, info, lan), exit), cleanup: () => document.removeEventListener('keydown', keyH) };
  };
  const riddles = (city, diff, win, exit) => {
    const qs = shuffle(RIDDLES.slice(), Math.random).slice(0, 3); let qi = 0, good = 0;
    const box = h('div'); const info = h('div', { class: 'pips' });
    function render() {
      box.innerHTML = ''; info.innerHTML = ''; qs.forEach((_, i) => info.append(h('i', { class: i < qi ? 'on' : '' })));
      const q = qs[qi]; const opts = shuffle([q.a, ...q.w], Math.random);
      box.append(h('p', { style: 'font-size:21px;font-weight:700' }, q.q), h('div', { class: 'opts' }, opts.map(o => h('button', { class: 'btn alt', onclick: async e => {
        const ok = o === q.a; e.target.classList.add(ok ? 'ok' : 'no'); Snd.sfx(ok ? 'good' : 'bad'); if (ok) good++; box.querySelectorAll('button').forEach(b => b.disabled = true); await sleep(900); qi++;
        if (qi < 3) return render();
        if (good >= 2) { box.innerHTML = '<p>הזקנים מהנהנים: "אתה מבין. היכנס בשלום."</p>'; await sleep(1200); win(); } else { box.innerHTML = '<p>"עוד לא. נסה שוב עם חידות אחרות."</p>'; await sleep(1500); qs.splice(0, 3, ...shuffle(RIDDLES.slice(), Math.random).slice(0, 3)); qi = 0; good = 0; render(); } } }, o))));
    }
    render(); return { el: frame(city.name, city.story, h('div', null, info, box), exit) };
  };
  const maze = (city, diff, win, exit) => {
    const cw = [11, 14, 17][diff], ch = [8, 10, 12][diff]; const cell = Math.min(34, Math.floor((innerWidth * .8) / (cw * 2 + 1)));
    const gw = cw * 2 + 1, gh = ch * 2 + 1, g = Array.from({ length: gh }, () => new Uint8Array(gw).fill(1)); const st = [[1, 1]]; g[1][1] = 0;
    while (st.length) { const [x, y] = st.at(-1); const nb = shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]], Math.random).filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx > 0 && ny > 0 && nx < gw - 1 && ny < gh - 1 && g[ny][nx]; });
      if (!nb.length) { st.pop(); continue; } const [dx, dy] = nb[0]; g[y + dy / 2][x + dx / 2] = 0; g[y + dy][x + dx] = 0; st.push([x + dx, y + dy]); }
    const c = h('canvas', { width: gw * cell, height: gh * cell }), x = c.getContext('2d'); let px = 1, py = 1, t = 0; const ex = gw - 2, ey = gh - 2; let alive = true, raf;
    function draw() { if (!alive) return; t += .03; x.fillStyle = '#05070f'; x.fillRect(0, 0, c.width, c.height);
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const d = Math.hypot(i - px, j - py), a = clamp(1 - d / (5.5 + Math.sin(t * 5) * .3), 0, 1); if (a <= 0) continue; x.globalAlpha = a; x.fillStyle = g[j][i] ? '#8c7a5a' : '#2a2230'; x.fillRect(i * cell, j * cell, cell, cell); if (g[j][i]) { x.fillStyle = '#b8a47a'; x.fillRect(i * cell, j * cell, cell, 3); } }
      x.globalAlpha = 1; x.globalCompositeOperation = 'lighter'; const gg = x.createRadialGradient((ex + .5) * cell, (ey + .5) * cell, 0, (ex + .5) * cell, (ey + .5) * cell, cell * 2.5); gg.addColorStop(0, '#ffe08a'); gg.addColorStop(1, '#ffe08a00'); x.fillStyle = gg; x.globalAlpha = clamp(1 - Math.hypot(ex - px, ey - py) / 9, .15, 1); x.fillRect((ex - 2) * cell, (ey - 2) * cell, cell * 5, cell * 5);
      const pg = x.createRadialGradient((px + .5) * cell, (py + .5) * cell, 0, (px + .5) * cell, (py + .5) * cell, cell * 1.8); pg.addColorStop(0, '#fff6c0'); pg.addColorStop(1, '#ff9f2e00'); x.globalAlpha = 1; x.fillStyle = pg; x.fillRect((px - 2) * cell, (py - 2) * cell, cell * 5, cell * 5); x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#2c6bd6'; x.beginPath(); x.arc((px + .5) * cell, (py + .5) * cell, cell * .32, 0, TAU); x.fill(); x.fillStyle = '#e8b78a'; x.beginPath(); x.arc((px + .5) * cell, (py + .5) * cell - cell * .12, cell * .2, 0, TAU); x.fill();
      raf = requestAnimationFrame(draw); }
    function mv(dx, dy) { if (!alive) return; const nx = px + dx, ny = py + dy; if (g[ny]?.[nx] === 0) { px = nx; py = ny; Snd.sfx('click'); if (px === ex && py === ey) { alive = false; setTimeout(win, 500); } } }
    const keyH = e => { const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[e.key]; if (m) { e.preventDefault(); mv(...m); } };
    document.addEventListener('keydown', keyH); draw();
    let tx = 0, ty = 0; c.addEventListener('pointerdown', e => { tx = e.clientX; ty = e.clientY; }); c.addEventListener('pointerup', e => { const dx = e.clientX - tx, dy = e.clientY - ty; if (Math.abs(dx) > Math.abs(dy)) mv(Math.sign(dx) * (Math.abs(dx) > 12), 0); else if (Math.abs(dy) > 12) mv(0, Math.sign(dy)); });
    return { el: frame(city.name, city.story + ' (חצים / החלקה)', c, exit), cleanup: () => { alive = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', keyH); } };
  };
  const bridge = (city, diff, win, exit) => {
    let hits = 0, pos = 0, dir = 1, alive = true, raf, last = performance.now(); const need = 3; const spd = [.9, 1.25, 1.6][diff];
    const zoneW = [.22, .17, .13][diff]; let zc = .5; const bar = h('div', { class: 'bar' }), z = h('div', { class: 'z' }), m = h('div', { class: 'm' }); bar.append(z, m);
    const pips = h('div', { class: 'pips' }, [0, 1, 2].map(() => h('i'))); const info = h('p', null, 'לחץ "עצור" (או רווח) כשהסמן בתוך האזור הירוק — שלוש פעמים ברצף');
    function newZone() { zc = .15 + Math.random() * .7; z.style.left = (zc - zoneW / 2) * 100 + '%'; z.style.width = zoneW * 100 + '%'; }
    newZone();
    function tick(now) { if (!alive) return; const dt = (now - last) / 1000; last = now; pos += dir * spd * dt * (1 + hits * .18); if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } m.style.left = `calc(${pos * 100}% - 4px)`; raf = requestAnimationFrame(tick); }
    function stop() { if (!alive) return; if (Math.abs(pos - zc) <= zoneW / 2) { hits++; Snd.sfx('good'); info.textContent = 'מצוין! הגשר מתייצב…'; } else { hits = 0; Snd.sfx('bad'); info.textContent = 'הגשר מתנדנד — מתחילים מחדש'; }
      pips.querySelectorAll('i').forEach((i, k) => i.classList.toggle('on', k < hits)); if (hits >= need) { alive = false; info.textContent = 'הגשר יציב. עברת!'; setTimeout(win, 800); } else newZone(); }
    const keyH = e => { if (e.code === 'Space') { e.preventDefault(); stop(); } };
    document.addEventListener('keydown', keyH); raf = requestAnimationFrame(tick);
    return { el: frame(city.name, city.story, h('div', null, info, bar, pips, h('div', { class: 'row' }, h('button', { class: 'btn', onclick: stop }, 'עצור!'))), exit), cleanup: () => { alive = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', keyH); } };
  };
  const scales = (city, diff, win, exit) => {
    let round = 0; const need = 2; const box = h('div'); const total = h('p', { style: 'font-size:22px;font-weight:900' });
    function newRound() {
      const ws = shuffle([1, 2, 3, 4, 5, 7, 8, 9, 12, 15].slice(), Math.random).slice(0, 6 + diff); const sub = ws.filter(() => Math.random() < .5); if (sub.length < 2) sub.push(ws[0], ws[1]);
      const target = [...new Set(sub)].reduce((a, b) => a + b, 0); const sel = new Set(); box.innerHTML = '';
      const upd = () => { const s = [...sel].reduce((a, b) => a + b, 0); total.textContent = `על המאזניים: ${s} / ${target}`; return s; };
      const wb = ws.map(w => h('button', { onclick: e => { sel.has(w) ? sel.delete(w) : sel.add(w); e.currentTarget.classList.toggle('on'); Snd.sfx('click'); upd(); } }, w));
      box.append(h('p', null, `הסוחר מניח משקל של ${target} אבנים. בחר משקולות שיאזנו אותו בדיוק (סיבוב ${round + 1} מתוך ${need}).`), h('div', { class: 'wts' }, wb), total,
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: async () => { if (upd() === target) { Snd.sfx('good'); round++; total.textContent = 'מאוזן!'; await sleep(800); if (round >= need) win(); else newRound(); } else { Snd.sfx('bad'); total.textContent += ' — עוד לא מאוזן'; } } }, 'אזן!')));
      upd();
    }
    newRound(); return { el: frame(city.name, city.story, box, exit) };
  };
  const stars = (city, diff, win, exit) => {
    const n = 7, len = [4, 5, 6][diff]; const c = h('canvas', { width: 520, height: 360 }), x = c.getContext('2d'); let pts, seq, inp = [], phase = 'show', t0 = performance.now(), alive = true, raf, msg = 'זכור את הקבוצה…';
    function setup() { pts = Array.from({ length: n }, () => ({ x: 50 + Math.random() * 420, y: 40 + Math.random() * 280 })); for (let tries = 0; tries < 40; tries++) { let ok = true; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < 70) { pts[j] = { x: 50 + Math.random() * 420, y: 40 + Math.random() * 280 }; ok = false; } if (ok) break; }
      seq = shuffle([...Array(n).keys()], Math.random).slice(0, len); inp = []; phase = 'show'; t0 = performance.now(); msg = 'זכור את הקבוצה…'; }
    setup();
    function draw(now) { if (!alive) return; const t = (now - t0) / 1000; x.fillStyle = '#070d24'; x.fillRect(0, 0, 520, 360); for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${.2 + .2 * Math.sin(now / 500 + i)})`; x.fillRect(hash2(i, 1, 5) * 520, hash2(i, 2, 5) * 360, 1.5, 1.5); }
      const shown = phase === 'show' ? Math.min(len, Math.floor(t / .7)) : inp.length;
      x.strokeStyle = '#c7a8ff'; x.lineWidth = 2.5; x.shadowColor = '#c7a8ff'; x.shadowBlur = 12; x.beginPath(); for (let k = 0; k < shown; k++) { const p = pts[phase === 'show' ? seq[k] : inp[k]]; k ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); } x.stroke(); x.shadowBlur = 0;
      pts.forEach((p, i) => { const lit = (phase === 'show' ? seq.slice(0, shown) : inp).includes(i); x.fillStyle = lit ? '#fff' : '#9a8ad8'; x.shadowColor = '#c7a8ff'; x.shadowBlur = lit ? 26 : 8; x.beginPath(); x.arc(p.x, p.y, lit ? 9 : 6, 0, TAU); x.fill(); x.shadowBlur = 0; });
      if (phase === 'show' && t > len * .7 + 1.4) { phase = 'play'; msg = 'עכשיו חבר את הכוכבים באותו סדר'; }
      x.fillStyle = '#ffe9a8'; x.font = '18px Heebo,sans-serif'; x.textAlign = 'center'; x.fillText(msg, 260, 345); raf = requestAnimationFrame(draw); }
    c.addEventListener('pointerdown', e => { if (phase !== 'play') return; const r = c.getBoundingClientRect(), mx = (e.clientX - r.left) * 520 / r.width, my = (e.clientY - r.top) * 360 / r.height; const i = pts.findIndex(p => Math.hypot(p.x - mx, p.y - my) < 22); if (i < 0) return;
      if (seq[inp.length] === i) { inp.push(i); Snd.sfx('l' + (inp.length % 4)); if (inp.length === len) { phase = 'done'; msg = 'הקבוצה שוחזרה!'; setTimeout(() => alive && win(), 900); } } else { Snd.sfx('bad'); msg = 'לא נכון — הכוכבים מתחדשים'; phase = 'wait'; setTimeout(() => alive && setup(), 1100); } });
    raf = requestAnimationFrame(draw);
    return { el: frame(city.name, city.story, c, exit), cleanup: () => { alive = false; cancelAnimationFrame(raf); } };
  };
  const honor = (city, diff, win, exit, G) => {
    const ds = shuffle(DILEMMAS.slice(), Math.random).slice(0, 3); let i = 0; const box = h('div');
    function render() { box.innerHTML = ''; const d = ds[i]; box.append(h('p', { style: 'font-size:20px;font-weight:700' }, `מבחן ${i + 1} מתוך 3: ${d.q}`), h('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:10px' },
      shuffle(d.o.slice(), Math.random).map(([t, ok]) => h('button', { class: 'btn alt', style: 'font-size:17px', onclick: async e => { if (ok) { e.target.classList.add('ok'); Snd.sfx('good'); box.append(h('p', { class: 'say' }, d.why)); box.querySelectorAll('button').forEach(b => b.disabled = true); await sleep(2200); i++; if (i >= 3) win(); else render(); } else { e.target.classList.add('no'); e.target.disabled = true; Snd.sfx('bad'); box.append(h('p', { class: 'say' }, 'ניב עוצר ושוקל שוב… זו לא הדרך שלו.')); } } }, t)))); }
    render(); return { el: frame(city.name, city.story, box, exit), cleanup: () => {} };
  };

  /* אתגר הגישה אל ראש הכפר — מחסום שפה, כמו במשחק המקורי: מתחמקים מהכפריים ומגיעים אליו בלי להתנגש */
  function approach(v, diff, gifts, cb) {
    const Wd = 520, Hd = 300, cu = CULTURES[v.culture]; let giftsLeft = gifts, used = 0, bumps = 0, freeze = 0, alive = true, raf, last = performance.now(), msg = 'הגע אל ראש הכפר בלי להיתקל באנשים. רווח = מתנה שמסיחה את דעתם.';
    const me = { x: 24, y: Hd / 2 }, chief = { x: Wd - 40, y: Hd / 2 }, keys = {}, tgt = { on: false, x: 0, y: 0 };
    const folks = Array.from({ length: 4 + diff * 2 }, (_, i) => ({ x: 90 + (i + .5) * (Wd - 190) / (4 + diff * 2), y: 30 + Math.random() * (Hd - 60), vy: (Math.random() < .5 ? -1 : 1) * (55 + Math.random() * 55 + diff * 18) }));
    const c = h('canvas', { width: Wd, height: Hd }), x = c.getContext('2d'); const info = h('p', null, msg); const gbtn = h('button', { class: 'btn', onclick: gift }, '');
    function gift() { if (giftsLeft <= 0 || freeze > 0) return; giftsLeft--; used++; freeze = 3.2; Snd.sfx('gift'); info.textContent = 'מתנה! כולם מתעניינים בה ונעצרים לרגע…'; upd(); }
    function upd() { gbtn.textContent = `🎁 מתנה מסיחה (${giftsLeft})`; gbtn.disabled = giftsLeft <= 0; }
    upd();
    function end(ok) { if (!alive) return; alive = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); setTimeout(() => cb(ok, used), 650); }
    const kd = e => { if (e.code === 'Space') { e.preventDefault(); gift(); } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) { e.preventDefault(); keys[e.key] = true; } }, ku = e => { delete keys[e.key]; };
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    const pt = e => { const r = c.getBoundingClientRect(); tgt.x = (e.clientX - r.left) * Wd / r.width; tgt.y = (e.clientY - r.top) * Hd / r.height; };
    c.addEventListener('pointerdown', e => { tgt.on = true; pt(e); }); c.addEventListener('pointermove', e => { if (tgt.on) pt(e); }); ['pointerup', 'pointerleave'].forEach(ev => c.addEventListener(ev, () => tgt.on = false));
    function frame(now) {
      if (!alive) return; const dt = Math.min(.05, (now - last) / 1000); last = now; freeze = Math.max(0, freeze - dt);
      let dx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), dy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
      if (tgt.on) { const ax = tgt.x - me.x, ay = tgt.y - me.y, d = Math.hypot(ax, ay); if (d > 6) { dx = ax / d; dy = ay / d; } }
      const l = Math.hypot(dx, dy) || 1; me.x = clamp(me.x + dx / l * 130 * dt * (dx || dy ? 1 : 0), 10, Wd - 10); me.y = clamp(me.y + dy / l * 130 * dt * (dx || dy ? 1 : 0), 10, Hd - 10);
      for (const f of folks) { if (!freeze) { f.y += f.vy * dt; if (f.y < 20 || f.y > Hd - 20) f.vy *= -1; } if (Math.hypot(f.x - me.x, f.y - me.y) < 19 && !freeze) { bumps++; Snd.sfx('bad'); me.x = 24; me.y = Hd / 2; info.textContent = bumps >= 3 ? 'הכפריים נבהלו מדי…' : `התנגשת! (${bumps}/3) ניב מתנצל ומתחיל מחדש.`; if (bumps >= 3) return end(false); } }
      if (Math.hypot(chief.x - me.x, chief.y - me.y) < 26) { info.textContent = 'הגעת אל ראש הכפר!'; Snd.sfx('good'); return end(true); }
      x.fillStyle = cu.cloth + ''; const g = x.createLinearGradient(0, 0, 0, Hd); g.addColorStop(0, '#6aa83c'); g.addColorStop(1, '#4a8a2c'); x.fillStyle = g; x.fillRect(0, 0, Wd, Hd);
      x.fillStyle = '#00000018'; for (let i = 0; i < 30; i++) x.fillRect(hash2(i, 1, 2) * Wd, hash2(i, 2, 2) * Hd, 14, 3);
      const person = (px, py, col, band, big) => { x.fillStyle = '#00000040'; x.beginPath(); x.ellipse(px, py + 11, 10, 4, 0, 0, TAU); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(px, py, big ? 13 : 10, 0, TAU); x.fill(); x.fillStyle = cu.skin; x.beginPath(); x.arc(px, py - 9, big ? 8 : 6.5, 0, TAU); x.fill(); x.fillStyle = band; x.fillRect(px - 7, py - 15, 14, 3); };
      for (const f of folks) person(f.x, f.y, cu.cloth, cu.band);
      x.fillStyle = '#ffd36a'; x.globalAlpha = .35 + .2 * Math.sin(now / 200); x.beginPath(); x.arc(chief.x, chief.y, 30, 0, TAU); x.fill(); x.globalAlpha = 1; person(chief.x, chief.y, '#a0302a', '#ffd36a', true);
      person(me.x, me.y, '#2c6bd6', '#d33a3a');
      if (freeze > 0) { x.fillStyle = '#ffffff22'; x.fillRect(0, 0, Wd, Hd); x.font = '28px sans-serif'; x.textAlign = 'center'; for (const f of folks) x.fillText('🎁', f.x, f.y - 24); }
      x.fillStyle = '#fff'; x.font = '700 14px Heebo,sans-serif'; x.textAlign = 'right'; x.fillText(`התנגשויות: ${bumps}/3`, Wd - 10, 20);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    const panel = h('div', { class: 'panel mg' }, h('h2', null, `גישה אל ראש ${v.name}`), info, c, h('div', { class: 'row' }, gbtn, h('button', { class: 'btn dark', onclick: () => end(false) }, 'לסגת')));
    const screen = $('#screen'); screen.innerHTML = ''; screen.append(panel); screen.className = 'on dim';
  }
  const GAMES = { lanterns, riddles, maze, bridge, scales, stars, honor };
  function run(city, diff, G, onWin, onExit) {
    let cur = null; const screen = $('#screen');
    const finish = fn => { if (cur?.cleanup) cur.cleanup(); fn(); };
    cur = GAMES[city.game](city, diff, () => finish(onWin), () => finish(onExit), G);
    screen.innerHTML = ''; screen.append(cur.el); screen.className = 'on dim';
  }
  return { run, approach };
})();
