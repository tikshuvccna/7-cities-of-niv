'use strict';
/* ---------- שבע הערים של מושון — game logic ---------- */
const DIFFS = [
  { name: 'מתחיל', icon: '🌅', gold: 360, days: 150, desc: 'כל הכפרים מסומנים על המפה, בני האדם סבלניים, והמסע רגוע.' },
  { name: 'חוקר', icon: '🧭', gold: 300, days: 120, desc: 'הכפרים מתגלים רק כשמגיעים אליהם. יש גם שבטים זהירים.' },
  { name: 'מגלה ארצות', icon: '🗺️', gold: 250, days: 95, desc: 'אתגר אמיתי: יותר חשדנות, פחות זמן, חידות קשות יותר.' },
];
const RANKS = [[0, 'מלח מתלמד'], [500, 'חוקר דרכים'], [900, 'רב־חובל'], [1300, 'שגריר הקשרים'], [1700, 'נגיד הערים'], [2100, 'אגדת האור']];
const PRICE = { men: 25, food: 3, gifts: 6, meds: 12 };

const G = { state: 'title', modal: false, keys: {}, diff: 1, mapMode: 'fixed', raid: false, best: 0 };
try { G.best = +localStorage.getItem('niv7_best') || 0; } catch (e) {}

/* ===== UI helpers ===== */
const screenEl = $('#screen');
function showPanel(el, cls = 'on dim') { screenEl.innerHTML = ''; screenEl.append(el); screenEl.className = cls; G.modal = true; }
function closeModal() { screenEl.className = ''; screenEl.innerHTML = ''; G.modal = false; updateHUD(); updateCtx(); }
function log(msg, kind = '') {
  const l = $('#log'); l.append(h('div', { class: kind }, msg)); while (l.children.length > 4) l.firstChild.remove();
  setTimeout(() => { if (l.children.length) l.firstChild?.remove(); }, 6200);
}
function btn(label, fn, cls = '') { return h('button', { class: 'btn ' + cls, onclick: e => { Snd.init(); Snd.sfx('click'); fn(e); } }, label); }

/* ===== HUD ===== */
let hudPrev = {};
function updateHUD() {
  if (!G.world) return;
  const vals = { day: Math.floor(G.day), food: Math.floor(G.food), gifts: G.gifts, gold: Math.floor(G.gold), men: G.men, meds: G.meds, honor: Math.round(G.honor) };
  for (const k in vals) { const el = $('#s-' + k); el.textContent = vals[k]; if (hudPrev[k] != null && hudPrev[k] !== vals[k] && k !== 'day') { const p = el.parentElement; p.classList.add('pulse'); setTimeout(() => p.classList.remove('pulse'), 350); } hudPrev[k] = vals[k]; }
  $('#s-lim').textContent = '\u200e/' + G.limit;
  const need = (G.men + 1) * .5; $('#s-food').parentElement.classList.toggle('warn', G.food < need * 5);
  $('#stones').innerHTML = ''; CITY_DEFS.forEach((c, i) => $('#stones').append(h('i', { class: G.stoneOn[i] ? 'on' : '', style: `--c:${c.color}`, title: c.name })));
}
function updateCtx() {
  const el = $('#ctx'); if (G.state !== 'play' || G.modal || !G.world) { el.classList.add('hidden'); return; }
  const w = G.world, p = G.pos; let t = '';
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  if (G.mode === 'land') {
    if (w.cities.some(c => cheb(c, p) <= 1)) t = 'רווח — להיכנס לעיר';
    else if (w.villages.some(v => cheb(v, p) <= 1)) t = 'רווח — לשוחח עם הכפר';
    else if (cheb(G.ship, p) <= 1) t = 'רווח — לעלות לספינה';
  } else {
    if (cheb(w.home, p) <= 4) t = 'רווח — נמל הבית (הצטיידות)';
    else if (landNeighbor()) t = 'רווח — לרדת לחוף';
  }
  el.textContent = t; el.classList.toggle('hidden', !t);
}

/* ===== world helpers ===== */
const tileAt = (x, y) => (x < 0 || y < 0 || x >= WW || y >= WH) ? 255 : G.world.t[y * WW + x];
function occupied(x, y) { const w = G.world; return w.cities.some(c => c.x === x && c.y === y) || w.villages.some(v => v.x === x && v.y === y); }
function landNeighbor() {
  const p = G.pos, order = [[G.facing, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (const [dx, dy] of order) { const x = p.x + dx, y = p.y + dy; if (isWalk(tileAt(x, y)) && !occupied(x, y)) return { x, y }; }
  return null;
}
function reveal(cx, cy, r) {
  const w = G.world; let ch = false;
  for (let y = Math.max(0, cy - r | 0); y <= Math.min(WH - 1, cy + r); y++) for (let x = Math.max(0, cx - r | 0); x <= Math.min(WW - 1, cx + r); x++)
    if (Math.hypot(x - cx, y - cy) <= r && !G.seen[y * WW + x]) { G.seen[y * WW + x] = 1; ch = true; }
  if (ch) Render.dirtyMini();
  for (const c of w.cities) if (!c.found && G.seen[c.y * WW + c.x]) { c.found = true; toast(`🌟 גילית את ${c.name}!`, true); Snd.sfx('horn'); log(`${c.name} נגלית באופק!`, 'gold'); }
}
function addHonor(n, why) { G.honor = clamp(G.honor + n, 0, 100); if (why) log((n > 0 ? '🎖️ כבוד +' : '🎖️ כבוד ') + n + ' — ' + why, n > 0 ? 'good' : 'bad'); }

/* ===== new game ===== */
function newGame() {
  const seed = G.mapMode === 'fixed' ? 1492 : (Math.random() * 1e9) | 0;
  const w = genWorld(seed, G.diff); const D = DIFFS[G.diff];
  Object.assign(G, {
    world: w, seen: new Uint8Array(WW * WH), day: 0, limit: D.days, gold: D.gold, food: 0, gifts: 0, men: 0, meds: 0, honor: 50, words: 0,
    stones: 0, stoneOn: Array(7).fill(false), rankIdx: 0, raids: 0, mode: 'sea', pos: { x: w.home.x, y: w.home.y }, prev: { x: w.home.x, y: w.home.y }, ship: { x: w.home.x, y: w.home.y },
    from: { x: w.home.x, y: w.home.y }, actor: { x: w.home.x, y: w.home.y }, moving: false, moveT: 0, moveDur: .2, facing: 1, shipDir: 1, storm: 0, steps: 0, helped: 0, vis: 6, ended: false,
  });
  hudPrev = {}; Render.cam.x = w.home.x; Render.cam.y = w.home.y; reveal(w.home.x, w.home.y, 8);
  G.visited = 0;
}

/* ===== title ===== */
function showTitle() {
  G.state = 'title'; G.modal = false; Snd.mood('title'); closeModal(); $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden'); $('#cine')?.remove();
  $('#title')?.remove();
  const words = ['שבע', 'הערים', 'של', 'מושון']; let n = 0;
  const main = h('div', { class: 't-main' }, words.map((w, wi) => h('div', { class: 'w' + (wi === 3 ? ' niv' : '') }, [...w].map(ch => h('span', { class: 'ch', style: `animation-delay:${(.4 + (n++) * .09).toFixed(2)}s` }, ch)))));
  const t = h('div', { id: 'title' }, h('div', { class: 't-small' }, 'מסע של כבוד · חברות · אור'), main, h('div', { class: 't-sub' }, 'שבע ערים נעלמו בין הים לשמש. איש אחד הגון יצא למצוא אותן.'),
    h('div', { class: 't-menu' },
      btn('⛵ התחל מסע', showSetup), btn('📜 איך משחקים', () => showHow(showTitle), 'alt'),
      btn(Snd.on ? '🔊 צליל: פועל' : '🔇 צליל: כבוי', e => { Snd.toggle(); e.target.textContent = Snd.on ? '🔊 צליל: פועל' : '🔇 צליל: כבוי'; }, 'dark')),
    h('div', { class: 't-credit' }, `בהשראת "שבע ערי הזהב" (דן בונטן, 1984) · שיא אישי: ${G.best}`));
  document.body.append(t);
}
function showHow(back) {
  $('#title')?.remove();
  const p = h('div', { class: 'panel paper' }, h('h2', null, 'איך משחקים'),
    h('p', null, '🎯 ', h('b', null, 'המטרה: '), 'למצוא את שבע הערים, לפתור את הבחינה של כל אחת ולאסוף שבע אבני אור — לפני שנגמרים הימים.'),
    h('p', null, '⌨️ ', h('b', null, 'שליטה: '), 'חצים או W/A/S/D להליכה ולהפלגה · ', h('b', null, 'רווח / Enter'), ' לפעולה (לרדת לחוף, לדבר, להיכנס לעיר, לעלות לספינה) · Esc לתפריט · M לצליל. במכשיר מגע — כפתורי החצים על המסך.'),
    h('p', null, '⛵ ', h('b', null, 'הים: '), 'הפלג עם הספינה מהנמל שבמערב (אור-ים) אל היבשת. עגן ליד החוף, רד לחוף, וצא לחקור. סערות עלולות לגזול זמן ומזון.'),
    h('p', null, '🛖 ', h('b', null, 'כפרים: '), 'כל כפר שונה. ', h('b', null, 'בגרסה השלווה אין תקיפה'), ' — מושון נותן מתנות, משוחח, סוחר ועוזר לנזקקים. בגרסת השוד אפשר גם לשדוד כפרים: מקבלים זהב ומזון מהר, אבל מאבדים כבוד, יוצרים שבטים עוינים ומארבי נקמה, והמועצה מרימה גבה. ככל שהאמון גדל, הכפר מגלה היכן שוכנת עיר, נותן מזון ועוזר לך. שבטים עוינים אפשר להרגיע בסבלנות ובמתנה.'),
    h('p', null, '🍞 ', h('b', null, 'משאבים: '), 'כל איש צוות אוכל מדי יום. מזון נגמר — אנשים עוזבים. חזור לנמל כדי להצטייד שוב (רווח כשהספינה קרובה לנמל).'),
    h('p', null, '🏙️ ', h('b', null, 'שבע ערים, שבע בחינות: '), 'זיכרון פנסים · חידות · מבוך · גשר · מאזניים · כוכבים · ובעיר השביעית — בחינה של כבוד. את העיר השביעית אפשר לפתוח רק עם שש אבנים.'),
    h('p', null, '🎖️ ', h('b', null, 'כבוד: '), 'נדיבות, עזרה והגינות מעלות את הכבוד שלך ואת הדירוג הסופי.'),
    h('div', { class: 'row' }, btn('הבנתי', () => { closeModal(); back(); })));
  showPanel(p);
}

/* ===== setup ===== */
function showSetup() {
  $('#title')?.remove(); G.state = 'setup';
  const dCards = DIFFS.map((d, i) => h('div', { class: 'card' + (i === G.diff ? ' sel' : ''), onclick: e => { G.diff = i; Snd.sfx('click'); dCards.forEach((c, j) => c.classList.toggle('sel', i === j)); } }, h('div', { class: 'big' }, d.icon), h('h3', null, d.name), h('p', null, d.desc), h('p', null, `🪙 ${d.gold} · 📅 ${d.days} ימים`)));
  const mCards = [['fixed', '🌍', 'המפה העתיקה', 'אותה יבשת תמיד — אפשר ללמוד אותה ולשפר שיא.'], ['random', '🎲', 'יבשת חדשה', 'מפה אקראית ייחודית בכל פעם.']].map(([k, ic, n, d]) => h('div', { class: 'card' + (G.mapMode === k ? ' sel' : ''), onclick: () => { G.mapMode = k; Snd.sfx('click'); mCards.forEach((c, j) => c.classList.toggle('sel', c.dataset.k === k)); }, 'data-k': k }, h('div', { class: 'big' }, ic), h('h3', null, n), h('p', null, d)));
  const sCards = [[false, '🕊️', 'גרסה שלווה', 'מתנות, שיחה, סחר ועזרה. אין תקיפה ואין שוד — האמון הוא הדרך.'], [true, '⚔️', 'גרסת השוד (כמו במקור)', 'אפשר גם לשדוד כפרים בכוח — זהב ומזון מהר, אבל בלי כבוד, עם שבטים עוינים ומארבים.']].map(([k, ic, n, d]) => h('div', { class: 'card' + (G.raid === k ? ' sel' : ''), onclick: () => { G.raid = k; Snd.sfx('click'); sCards.forEach(c => c.classList.toggle('sel', (c.dataset.k === 'true') === k)); }, 'data-k': String(k) }, h('div', { class: 'big' }, ic), h('h3', null, n), h('p', null, d)));
  showPanel(h('div', { class: 'panel' }, h('h2', null, 'הכנה למסע'), h('p', null, 'בחר רמת קושי:'), h('div', { class: 'cards' }, dCards), h('p', null, 'בחר עולם:'), h('div', { class: 'cards' }, mCards), h('p', null, 'בחר סגנון משחק:'), h('div', { class: 'cards' }, sCards),
    h('div', { class: 'row' }, btn('⬅ חזרה', () => { closeModal(); showTitle(); }, 'dark'), btn('המשך לסיפור ▶', () => { closeModal(); startCinematic(); }))));
}

/* ===== cinematic ===== */
const CINE = [
  'לילה בנמל הישן. <em>מושון</em>, קברניט ומצייר מפות, יושב מול נר אחרון וממשיך לחפש תשובה לשאלה אחת: איפה נגמר הים?',
  'על מפה ישנה שירש מסבתו — שבע נקודות אור, ושיר אחד בשוליים: <em>"שבע ערים בין הים לשמש; לכל עיר אבן, ולכל אבן שער."</em>',
  'עם עלות השחר מתאספת כל העיר. זקנת הנמל מניחה יד על כתפו: <em>"קח ספינה ואנשים טובים, מושון. ותזכור — השם שלך הולך לפניך. תהיה אדם."</em>',
  'מושון נושא את נדרו: <em>לא לקחת — להבין. לא לכבוש — להכיר. ולא להשאיר אחריו שום פגיעה.</em> באופק כבר מנצנצים שבעה אורות…',
];
const RAID_OATH = 'מושון יוצא למסע בלי הבטחות מראש: <em>אולי בדרך השלום, אולי בדרך החרב — כל כפר יראה את מי שיפגוש.</em> באופק כבר מנצנצים שבעה אורות…';
const cineText = i => (i === 3 && G.raid) ? RAID_OATH : CINE[i];
let cine = null;
function startCinematic() {
  newGame(); G.state = 'cine'; Snd.mood('title'); cine = { i: 0, t: 0, chars: 0, text: '' };
  const el = h('div', { id: 'cine' }, h('div', { class: 'bars' }), h('button', { class: 'btn dark skip', onclick: endCinematic }, 'דלג ⏭'), h('div', { class: 'txt' }), h('div', { class: 'hint' }, 'לחיצה / רווח להמשך'));
  document.body.append(el); setCineText(0);
  el.addEventListener('click', e => { if (e.target.closest('.skip')) return; advanceCine(); });
}
function plain(html) { return html.replace(/<[^>]+>/g, ''); }
function setCineText(i) { cine.i = i; cine.t = 0; cine.chars = 0; cine.full = cineText(i); cine.plainLen = plain(cine.full).length; renderCineText(); }
function renderCineText() {
  const el = $('#cine .txt'); if (!el) return; let n = Math.floor(cine.chars), out = '', inTag = false, count = 0;
  for (const ch of cine.full) { if (ch === '<') inTag = true; if (inTag) out += ch; else if (count < n) { out += ch; count++; } if (ch === '>') inTag = false; }
  el.innerHTML = out;
}
function advanceCine() { Snd.init(); if (cine.chars < cine.plainLen) { cine.chars = cine.plainLen; renderCineText(); return; } if (cine.i < CINE.length - 1) { wipe(); setTimeout(() => setCineText(cine.i + 1), 450); } else endCinematic(); }
function endCinematic() { if (G.state !== 'cine') return; G.state = 'port'; $('#cine')?.remove(); wipe(() => { Snd.mood('sea'); openPort(true); }); }

/* ===== port ===== */
function openPort(first) {
  G.modal = true; $('#hud').classList.toggle('hidden', first); const cart = first ? { men: 5, food: 100, gifts: 6, meds: 1 } : { men: 0, food: 0, gifts: 0, meds: 0 };
  const rows = [['men', '🧑‍🤝‍🧑 אנשי צוות', 'מלחים וסייעים (עד 12)', 1, 25], ['food', '🍞 מזון', 'כל איש אוכל חצי יחידה ליום', 10, 3], ['gifts', '🎁 מתנות', 'כלי עבודה, בדים, חרוזים וכלי נגינה', 1, 6], ['meds', '🧪 תרופות', 'לעזרה לחולים ולצוות', 1, 12]];
  const totalEl = h('div', { class: 'budget' }), ok = btn(first ? '⛵ הפלג!' : '✔ אשר והמשך', apply); const qEls = {};
  const cost = () => cart.men * PRICE.men + Math.ceil(cart.food / 10) * 3 + cart.gifts * PRICE.gifts + cart.meds * PRICE.meds;
  function upd() { const c = cost(); rows.forEach(([k]) => qEls[k].textContent = cart[k]); totalEl.textContent = `🪙 עלות: ${c} · יישאר: ${Math.floor(G.gold) - c}`; ok.disabled = c > G.gold || (first && cart.men < 1) || G.men + cart.men > 12; }
  const grid = h('div', { class: 'shop' }, rows.map(([k, name, sub, st, pr]) => { qEls[k] = h('b'); return [h('div', { class: 'it' }, name, h('small', null, `${sub} · ${k === 'food' ? '10 יחידות' : 'יחידה'} = ${pr} זהב`)),
    h('div', { class: 'qty' }, h('button', { onclick: () => { cart[k] = Math.max(0, cart[k] - st); Snd.sfx('click'); upd(); } }, '−'), qEls[k], h('button', { onclick: () => { cart[k] += st; Snd.sfx('click'); upd(); } }, '+'))]; }));
  function apply() { G.gold -= cost(); G.men += cart.men; G.food += cart.food; G.gifts += cart.gifts; G.meds += cart.meds; Snd.sfx('coin'); closeModal();
    if (first) { G.state = 'play'; $('#hud').classList.remove('hidden'); if (matchMedia('(pointer:coarse)').matches || innerWidth < 900) $('#touch').classList.remove('hidden'); updateHUD(); wipe();
      log(`מושון מפליג עם ${G.men} אנשי צוות. הים פתוח!`, 'gold'); log('הפלג מזרחה עם החצים אל היבשת. רווח — לרדת לחוף.', ''); }
    else { log('הספינה מוכנה. רוח טובה!', 'good'); G.state = 'play'; } }
  const p = h('div', { class: 'panel paper' }, h('h2', null, first ? '⚓ נמל אור־ים' : '⚓ נמל הבית'), h('p', null, first ? 'המועצה העמידה לרשותך ספינה. הצטייד למסע — ואל תשכח: שבטים נפגשים בידיים פתוחות, לא בחרבות.' : `חזרת לנמל. יש לך ${Math.floor(G.gold)} זהב. הצוות כעת: ${G.men}.`), grid, totalEl, h('div', { class: 'row' }, ok, !first && btn('📜 דווח למועצה', openCouncil, 'alt'), !first && btn('ביטול', () => { closeModal(); G.state = 'play'; }, 'dark')));
  showPanel(p); upd();
}


/* ===== council report (קידום בדרגה, כמו שבמקור מקבלים קידום מהמלכה) ===== */
function exploredPct() { const w = G.world; let land = 0, seen = 0; for (let i = 0; i < w.t.length; i++) if (!isWater(w.t[i])) { land++; if (G.seen[i]) seen++; } return Math.round(seen / land * 100); }
function openCouncil() {
  const pct = exploredPct(), st = G.world.villages.filter(v => v.station).length, s = score(), r = rankIdx(s); const promoted = r > (G.rankIdx || 0);
  if (promoted) { G.rankIdx = r; G.gold += 40 * r; Snd.sfx('stone'); flash(); }
  showPanel(h('div', { class: 'panel paper' }, h('h2', null, '📜 דיווח למועצת הנמל'), h('p', null, 'זקנת הנמל קוראת את מחברת המפות של מושון ומהנהנת באיטיות.'),
    h('div', { class: 'end-stats' }, [['מפה שנחקרה', pct + '%'], ['אבני אור', G.stones + ' / 7'], ['בארות ובתי ספר', st], ['כבוד', Math.round(G.honor)], ['ניקוד נוכחי', s]].flatMap(([k, v]) => [h('span', null, k), h('b', null, v)])),
    h('div', { class: 'rank' }, RANKS[r][1]), G.raids > 0 ? h('p', { class: 'say' }, 'המועצה מודה על הזהב, אך אומרת בשקט: "פחות דם, מושון. שמות הולכים לפני האדם — וגם אחריו."') : null, promoted ? h('p', { class: 'say' }, `קידום! המועצה מעניקה לך דרגה חדשה ופרס של ${40 * r} זהב.`) : h('p', null, 'עוד קצת מפה, עוד קצת כבוד — והקידום הבא קרוב.'),
    h('div', { class: 'row' }, btn('חזרה לנמל', () => { closeModal(); openPort(false); }))));
}
function rankIdx(s) { let r = 0; RANKS.forEach(([m], i) => { if (s >= m) r = i; }); return r; }

/* ===== time & survival ===== */
function advanceDay(d) {
  const o = Math.floor(G.day); G.day += d; const n = Math.floor(G.day);
  for (let k = o; k < n; k++) {
    const need = (G.men + 1) * .5; G.food -= need;
    if (G.food < 0) { G.food = 0; if (G.men > 0) { G.men--; log('אין מזון! אחד מאנשי הצוות נאלץ לעזוב…', 'bad'); Snd.sfx('bad'); } else return endGame(false, 'הרעב ניצח את המסע. מושון חוזר לנמל, מותש אך חי, ונשבע לצאת שוב.'); }
    else if (G.food < need * 5 && k % 2 === 0) log('⚠️ המזון אוזל — חפש כפר ידידותי או חזור לנמל.', 'bad');
  }
  if (G.day >= G.limit && !G.ended) return endGame(false, 'הימים תמו. השמש שקעה על המסע — אך מושון למד המון, ואולי בפעם הבאה…');
}

/* ===== movement ===== */
function tryMove(dx, dy) {
  const nx = G.pos.x + dx, ny = G.pos.y + dy, t = tileAt(nx, ny); if (t === 255) return;
  if (G.mode === 'sea') { if (!isWater(t)) return; G.moveDur = G.storm > 0 ? .3 : .2; G.shipDir = dx !== 0 ? Math.sign(dx) : G.shipDir; }
  else { if (!isWalk(t) || occupied(nx, ny)) return; G.moveDur = .13 * Math.max(1, COST[t]); G.facing = dx !== 0 ? Math.sign(dx) : G.facing; }
  G.prev = { x: G.pos.x, y: G.pos.y }; G.from = { x: G.pos.x, y: G.pos.y }; G.pos = { x: nx, y: ny }; G.moveT = 0; G.moving = true; G.stepCost = G.mode === 'sea' ? .2 : .1 * Math.max(1, COST[t]);
  if (G.mode === 'sea') G.ship = { x: nx, y: ny };
}
function afterStep() {
  G.steps++; G.vis = (G.mode === 'sea' ? 6 : 5) - (G.storm > 0 ? 2 : 0); reveal(G.pos.x, G.pos.y, G.vis); advanceDay(G.stepCost); if (G.ended) return;
  if (G.mode === 'sea') seaTick(); else landTick();
  updateHUD(); updateCtx();
}
function seaTick() {
  if (G.storm > 0) { G.storm--; if (G.steps % 5 === 0) { G.food = Math.max(0, G.food - 2); } if (Math.random() < .08) { Render.lightning(); Snd.sfx('thunder'); Render.shake(.6); }
    if (Math.random() < .25) { const d = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); const nx = G.pos.x + d[0], ny = G.pos.y + d[1]; if (isWater(tileAt(nx, ny)) && nx > 0) { G.pos = { x: nx, y: ny }; G.ship = { x: nx, y: ny }; G.actor.x = nx; G.actor.y = ny; } }
    if (G.storm === 0) { log('הסערה שככה. השמיים מתבהרים.', 'good'); Snd.mood('sea'); } }
  else if (G.steps > 12 && Math.random() < .012 && G.pos.x > 8) { G.storm = 16 + rint(0, 8); log('⛈️ סערה! החזק את ההגה — הגלים מטלטלים את הספינה.', 'bad'); Render.lightning(); Snd.sfx('thunder'); Snd.mood('danger'); Render.shake(.8); }
  else if (Math.random() < .004) { log(pick(['דולפינים מלווים את הספינה — סימן טוב.', 'שחפים מעל הראש: היבשה קרובה.', 'מושון מצייר בקו נקי את קו החוף במחברת המפות.', 'הצוות שר שיר ישן על רוח מזרחית.']), ''); }
  if (G.pos.x <= 1 && G.pos.y !== undefined) { /* edge of the western sea */ }
}
function landTick() {
  const w = G.world, p = G.pos, cheb = (a) => Math.max(Math.abs(a.x - p.x), Math.abs(a.y - p.y));
  const c = w.cities.find(c => cheb(c) <= 1 && !c.done && !c.prompted); if (c) { c.prompted = true; enterCity(c); return; }
  const v = w.villages.find(v => cheb(v) <= 1 && !v.met); if (v) { v.met = true; G.visited++; openVillage(v, true); return; }
  if (G.raids > 0 && G.steps % 4 === 0 && Math.random() < Math.min(.08, .02 * G.raids)) { G.modal = true; eventPanel('🏹 מארב נקמה', 'לוחמים משבטים שנפגעו מארבים לך בין העצים — לא רחוק מהמקום ששדדת.', [['להילחם ולסגת', () => { const dead = G.men > 2 && Math.random() < .5 ? 1 : 0; G.men -= dead; G.food = Math.max(0, G.food - 8); log(dead ? 'המארב נדחה, אך אחד מאנשיך נפל.' : 'המארב נדחה במחיר מזון.', 'bad'); }, 'red'], ['לשלם כופר (20 זהב)', () => { if (G.gold >= 20) { G.gold -= 20; Snd.sfx('coin'); } else { G.food = Math.max(0, G.food - 10); log('אין זהב — הם לוקחים מזון.', 'bad'); } }]]); return; }
  if (G.steps % 3 === 0 && Math.random() < .05 && !w.villages.some(v => cheb(v) <= 3)) landEvent();
}

/* ===== interaction ===== */
function interact() {
  if (G.modal || G.state !== 'play' || G.moving) return; const w = G.world, p = G.pos, cheb = o => Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y));
  if (G.mode === 'land') {
    const c = w.cities.find(c => cheb(c) <= 1); if (c) return enterCity(c);
    const v = w.villages.find(v => cheb(v) <= 1); if (v) { if (!v.met) { v.met = true; G.visited++; } return openVillage(v, false); }
    if (cheb(G.ship) <= 1) { G.mode = 'sea'; G.pos = { x: G.ship.x, y: G.ship.y }; G.actor.x = G.ship.x; G.actor.y = G.ship.y; G.vis = 6; reveal(G.pos.x, G.pos.y, 6); Snd.mood(G.storm > 0 ? 'danger' : 'sea'); Snd.sfx('splash'); wipe(); log('מושון עולה לספינה. מפרשים למעלה!', ''); updateCtx(); }
  } else {
    if (cheb(w.home) <= 4) { G.state = 'port'; return openPort(false); }
    const l = landNeighbor(); if (l) { G.mode = 'land'; G.pos = l; G.prev = { x: l.x, y: l.y }; G.actor.x = l.x; G.actor.y = l.y; G.vis = 5; reveal(l.x, l.y, 5); Snd.mood('land'); Snd.sfx('splash'); log('מושון יורד לחוף. כאן מתחיל הגילוי!', 'gold'); updateCtx(); }
    else log('אין חוף קרוב. הפלג אל היבשה.', '');
  }
}

/* ===== villages ===== */
function trustLabel(t) { return t < 0 ? ['עוין', '#ff6b6b'] : t < 2 ? ['זהיר', '#ffcf5a'] : t < 5 ? ['ידידותי', '#9be36a'] : ['חבר', '#7bd88f']; }
function revealHint(v) {
  const w = G.world; let c = w.cities[v.hint]; if (c.found) c = w.cities.find(c => !c.found);
  v.hinted = true; if (!c) return 'הם מספרים על ימים עברו, ועל שבע ערי האור — אך את כולן כבר מצאת.';
  reveal(c.x, c.y, 3); return `הם מצביעים אל האופק ומספרים על ${c.name}! היא נוספה למפה.`;
}
function openVillage(v, first, preSay) {
  G.modal = true; const cu = CULTURES[v.culture]; const cvs = h('canvas', { width: 190, height: 230 }); Render.portrait(cvs, v);
  const body = h('div', { class: 'body' }); let say = preSay || (first ? (v.trust < 0 ? 'לוחמי הכפר חוסמים את דרכך, חניתות מורמות. זה לא המקום לפחד — זה המקום לסבלנות.' : pick(cu.greet)) : '"טוב לראותך שוב."'); let mode = 'main';
  showPanel(h('div', { class: 'panel' }, h('div', { class: 'enc' }, cvs, body)));
  function leave(msg) { if (msg) log(msg); closeModal(); }
  function rewardCheck() {
    if (v.trust >= 5 && !v.rewarded) { v.rewarded = true; const gold = Math.random() < .5; if (gold) { G.gold += 30; say += ' לאות תודה הם מעניקים לך 30 זהב.'; } else { G.food += 25; say += ' לאות תודה הם ממלאים את המחסן ב־25 מזון.'; } Snd.sfx('coin'); }
  }
  function act(fn) { return () => { fn(); updateHUD(); render(); }; }
  const doGift = () => { if (G.gifts <= 0) { say = 'אין לך מתנות. אולי תחזור מהנמל?'; return; } G.gifts--; v.gifts++; v.trust += v.trust < 0 ? 3 : 2; addHonor(1); Snd.sfx('gift'); Render.burst(G.pos.x + .5, G.pos.y + .5, '#ffd36a', 30, 3, 3, 1.2);
    say = v.trust < 0 ? 'חניתות יורדות לאט. הם מביטים במתנה, ואז בך.' : pick(['הם מקבלים את המתנה בחיוך. "אנחנו נזכור אותך."', 'ילדים מתקבצים סביב המתנה בצהלה.', 'זקן הכפר מהנהן: "אדם שנותן — אדם שנשאר."']); rewardCheck(); if (v.trust >= 3 && !v.hinted) say += ' ' + revealHint(v); };
  function retreat(msg) {
    const lose = Math.random() < .3 && G.men > 1; if (lose) { G.men--; log('חנית פוצעת אחד מאנשיך. הוא נאלץ לעזוב את המסע.', 'bad'); } else { G.food = Math.max(0, G.food - 6); log('הם גורשים אתכם וחלק מהמזון הולך לאיבוד.', 'bad'); }
    G.pos = { x: G.prev.x, y: G.prev.y }; G.actor.x = G.pos.x; G.actor.y = G.pos.y; leave(msg);
  }
  const doTalk = () => {
    advanceDay(.3); G.words++;
    if (v.trust < 2) { // מחסום שפה: הגישה אל ראש הכפר היא אתגר זריזות, כמו במשחק המקורי
      Minigames.approach(v, G.diff, G.gifts, (ok, used) => {
        G.gifts -= used; updateHUD();
        if (ok) { v.trust += v.trust < 0 ? 3 : 2; v.talks++; Snd.sfx('good'); addHonor(1); openVillage(v, false, 'מושון מגיע אל ראש הכפר בידיים פתוחות. בלי מילים משותפות — רק חיוך, מחוות, ומתנה קטנה. החניתות יורדות.'); }
        else { Snd.sfx('bad'); if (v.trust < 0) { addHonor(0); retreat('"עוד לא." מושון נסוג בכבוד, ומבטיח לחזור בלב פתוח.'); } else { v.trust -= 1; openVillage(v, false, 'מושון נתקל בכמה מאנשי הכפר, והם נבהלו. אולי בניסיון הבא — לאט יותר.'); } }
      });
      return;
    }
    if (v.talks < 3) { v.talks++; v.trust = Math.min(v.trust + 1, 4); }
    say = pick([`הם מספרים על ${cu.needs}.`, 'מושון לומד מילים חדשות, והם צוחקים על ההגייה שלו.', 'שיחה ארוכה ליד המדורה. מתברר שיש הרבה במשותף.', 'הם מלמדים אותו שיר שמברך על הדרך.']); Snd.sfx('good'); if (v.trust >= 3 && !v.hinted) say += ' ' + revealHint(v); rewardCheck();
  };
  const doRaid = () => {
    const p = clamp(.4 + G.men * .05 + (v.att === 2 ? -.05 : .05), .3, .85); advanceDay(.4); G.raids++; v.plundered = true; v.att = 2; v.trust = -6; addHonor(-10, `שדדת את ${v.name}`); Snd.sfx('bad'); Render.shake(.5);
    for (const o of G.world.villages) if (o !== v && o.culture === v.culture && Math.hypot(o.x - v.x, o.y - v.y) < 18) o.trust = Math.min(o.trust, -2);
    if (Math.random() < p) { const gold = rint(45, 95), food = rint(12, 28), dead = Math.random() < .4 ? rint(1, 2) : 0; G.gold += gold; G.food += food; G.men = Math.max(1, G.men - dead);
      log(`השוד הצליח: +${gold} זהב, +${food} מזון${dead ? `, ואבדו ${dead} מאנשיך` : ''}. כפרים קרובים של ${cu.name} כעת עוינים.`, 'bad'); closeModal(); Snd.sfx('coin'); }
    else { const dead = rint(1, 3); G.men = Math.max(1, G.men - dead); G.food = Math.max(0, G.food - 10); G.pos = { x: G.prev.x, y: G.prev.y }; G.actor.x = G.pos.x; G.actor.y = G.pos.y; log(`השוד נכשל! נפלו ${dead} מאנשיך ואיבדת מזון. השבט נשבע נקמה.`, 'bad'); closeModal(); }
    updateHUD();
  };
  const doStation = () => { if (G.gold < 25) { say = 'בניית באר ובית ספר עולה 25 זהב.'; return; } G.gold -= 25; v.station = true; v.restDay = G.day; addHonor(4, `נבנו באר ובית ספר ב${v.name}`); Snd.sfx('stone'); Render.burst(G.pos.x + .5, G.pos.y + .5, '#58c8ff', 50, 3, 3, 1.4); say = 'מושון והכפר בונים יחד באר ובית ספר קטן. מעכשיו זה מקלט בטוח לכל מי שבא בשלום.'; };
  const doRest = () => { if (G.day - v.restDay < 8) { say = 'הכפר עדיין מתאושש מהאירוח האחרון. נסה בעוד כמה ימים.'; return; } v.restDay = G.day; advanceDay(.5); G.food += 14; Snd.sfx('good'); say = 'אנשי הכפר מכינים ארוחה חמה וממלאים את המחסן ב־14 מזון. "הבאר שלכם — ביתנו."'; };
  const doHelp = () => { if (v.need === 'food') { if (G.food < 15) { say = 'צריך לפחות 15 מזון כדי לעזור.'; return; } G.food -= 15; say = 'מושון מחלק מזון ללא היסוס. אנשי הכפר נושמים לרווחה.'; } else { if (G.meds < 1) { say = 'צריך תרופה כדי לעזור לחולים. חפש בנמל.'; return; } G.meds--; say = 'מושון מטפל בחולה בעצמו. עד הערב — החום יורד.'; }
    v.needDone = true; v.trust += 4; G.helped++; addHonor(5, 'עזרת למי שהיה זקוק לכך'); Snd.sfx('stone'); Render.burst(G.pos.x + .5, G.pos.y + .5, '#9be36a', 40, 3, 3, 1.4); rewardCheck(); if (!v.hinted) say += ' ' + revealHint(v); };
  const trade = (k) => () => { if (k === 'food') { if (G.gold < 6) { say = 'אין לך מספיק זהב.'; return; } G.gold -= 6; G.food += 12; } else if (k === 'meds') { if (G.gold < 10) { say = 'אין לך מספיק זהב.'; return; } G.gold -= 10; G.meds++; } else { if (G.food < 30) { say = 'אין לך עודף מזון.'; return; } G.food -= 10; G.gold += 4; } Snd.sfx('coin'); say = 'עסקה הוגנת. שני הצדדים מרוצים.'; };
  function render() {
    body.innerHTML = ''; const [lbl, col] = trustLabel(v.trust);
    body.append(h('h2', null, v.name), h('div', null, h('span', { class: 'tag' }, `${cu.icon} ${cu.name}`), h('span', { class: 'tag', style: `color:${col}` }, `יחס: ${lbl}`), v.need && !v.needDone ? h('span', { class: 'tag' }, v.need === 'food' ? '🍞 רעבים' : '🤒 חולים') : null),
      h('div', { class: 'meter' }, h('i', { style: `width:${clamp((v.trust + 3) / 10, .03, 1) * 100}%` })), h('p', { class: 'say' }, say));
    const row = h('div', { class: 'row' });
    if (mode === 'main') {
      if (v.plundered) { say = 'הכפר שדוד ומרוסק. אין מי שידבר איתך כאן.'; row.append(btn('🚶 להמשיך בדרך', () => leave(), 'dark')); body.append(row); return; }
      row.append(btn(`🎁 מתנה (${G.gifts})`, act(doGift)), btn('💬 לשוחח', act(doTalk), 'alt'));
      if (G.raid) row.append(btn('⚔️ לשדוד את הכפר', act(doRaid), 'red'));
      if (v.trust >= 4 && !v.station) row.append(btn('🏗️ באר ובית ספר (25 זהב)', act(doStation)));
      if (v.station) row.append(btn('🛌 מקלט: ארוחה ומנוחה', act(doRest), 'alt'));
      if (v.trust >= 1) row.append(btn('🤝 סחר', () => { mode = 'trade'; render(); }, 'alt'));
      if (v.need && !v.needDone && v.trust >= 0) row.append(btn(v.need === 'food' ? '❤️ לעזור (15 מזון)' : '❤️ לעזור (תרופה)', act(doHelp)));
      row.append(btn('🚶 להמשיך בדרך', () => leave(), 'dark'));
    } else {
      row.append(btn('🍞 12 מזון ← 6 זהב', act(trade('food'))), btn('🧪 תרופה ← 10 זהב', act(trade('meds'))), btn('🪙 10 מזון → 4 זהב', act(trade('sell')), 'alt'), btn('⬅ חזרה', () => { mode = 'main'; render(); }, 'dark'));
    }
    body.append(row);
  }
  render();
}

/* ===== cities ===== */
function enterCity(c) {
  G.modal = true; const locked = c.id === 6 && G.stones < 6 && !c.done; Snd.sfx('horn');
  if (c.done) { showPanel(h('div', { class: 'panel paper' }, h('h2', null, c.name), h('p', null, 'אבן האור של העיר כבר בידיך. התושבים מנופפים לשלום.'), h('div', { class: 'row' }, btn('להמשיך', closeModal)))); return; }
  showPanel(h('div', { class: 'panel paper', style: `box-shadow:0 0 60px ${c.color}99,0 20px 60px #000c` }, h('h2', null, `${c.icon} ${c.name}`), h('p', null, c.story),
    locked ? h('p', { class: 'say' }, `שערי עיר האור סגורים. נדרשות 6 אבנים, ובידך ${G.stones}. חזור כשתאסוף את שאר האבנים.`) : h('p', null, 'האם מושון נכנס לבחינה?'),
    h('div', { class: 'row' }, !locked && btn('🚪 להיכנס', () => { wipe(() => { Snd.mood('city'); Minigames.run(c, G.diff, G, () => cityWon(c), () => { closeModal(); Snd.mood('land'); }); }); }), btn(locked ? 'הבנתי' : 'לא עכשיו', () => { closeModal(); }, 'dark'))));
}
function cityWon(c) {
  c.done = true; G.stones++; G.stoneOn[c.id] = true; G.gold += 40; G.food += 25; addHonor(3); advanceDay(1);
  flash(); Snd.sfx('stone'); toast(`✨ אבן האור ה־${G.stones}!`, true); log(`${c.name} העניקה לך אבן אור, 40 זהב ו־25 מזון.`, 'gold');
  closeModal(); Snd.mood('land'); Render.burst(G.pos.x + .5, G.pos.y + .5, c.color, 90, 5, 4, 1.8);
  if (G.stones >= 7) setTimeout(() => endGame(true), 2200);
}

/* ===== land events ===== */
function eventPanel(title, text, buttons) {
  G.modal = true; showPanel(h('div', { class: 'panel paper' }, h('h2', null, title), h('p', null, text), h('div', { class: 'row' }, buttons.map(([l, fn, cls]) => btn(l, () => { closeModal(); fn && fn(); updateHUD(); }, cls)))));
}
function landEvent() {
  const r = Math.random();
  if (r < .22) { const f = rint(8, 16); eventPanel('🫐 פירות יער', `הצוות מוצא שיחי פירות בשלים ומנחל קרוב. מלאו ${f} יחידות מזון.`, [['מצוין', () => { G.food += f; Snd.sfx('good'); }]]); }
  else if (r < .38) { const g = rint(10, 28); eventPanel('🪙 גושי זהב בנחל', `בין האבנים נוצצים גושי זהב. מושון מחלק חלק לצוות כמו שמקובל, ושומר ${g} זהב.`, [['טוב', () => { G.gold += g; Snd.sfx('coin'); }]]); }
  else if (r < .54) { eventPanel('🧳 נוסע אבוד', 'נוסע מותש יושב ליד השביל, בלי מזון ובלי כיוון. הוא מבקש עזרה.', [['לתת 6 מזון ולהראות לו דרך', () => { if (G.food >= 6) { G.food -= 6; addHonor(3, 'עזרת לנוסע אבוד'); const c = G.world.cities.find(c => !c.found); if (c) { reveal(c.x, c.y, 3); log(`בתמורה הוא סיפר לך על ${c.name}.`, 'gold'); } Snd.sfx('good'); } else log('אין לך מספיק מזון לחלוק.', 'bad'); }], ['להמשיך', null, 'dark']]); }
  else if (r < .66) { eventPanel('🐗 חזיר בר', 'חזיר בר פורץ אל המחנה וגורר שק מזון ליער. מושון לא רודף — לא שווה סיכון.', [['לוותר על השק', () => { G.food = Math.max(0, G.food - 7); Snd.sfx('bad'); }]]); }
  else if (r < .78) { eventPanel('🏺 חורבה עתיקה', 'בין השיחים מסתתר מגדל תצפית ישן. מהגג רואים רחוק.', [['לטפס ולצייר מפה', () => { reveal(G.pos.x, G.pos.y, 9); Snd.sfx('good'); advanceDay(.3); }]]); }
  else if (r < .9) { eventPanel('🥶 קדחת', G.meds > 0 ? 'אחד מאנשיך חולה בקדחת. יש לך תרופה.' : 'אחד מאנשיך חולה בקדחת, ואין תרופה. הוא ינוח כמה ימים.', [['לטפל', () => { if (G.meds > 0) { G.meds--; Snd.sfx('good'); } else { advanceDay(2); Snd.sfx('bad'); } }]]); }
  else { eventPanel('🏴‍☠️ שודדי דרכים', 'חבורת שודדי דרכים (לא מבני המקום!) חוסמת את השביל ודורשת דמי מעבר.', [
    ['לשלם 15 זהב', () => { if (G.gold >= 15) { G.gold -= 15; Snd.sfx('coin'); } else { G.food = Math.max(0, G.food - 10); log('אין זהב — הם לוקחים מזון.', 'bad'); } }],
    ['לדבר איתם', () => { if (Math.random() < .5 + G.honor / 300) { addHonor(2, 'דיבור במקום כוח'); log('הם מתבלבלים מהכנות של מושון ומתפזרים.', 'good'); } else { G.food = Math.max(0, G.food - 10); log('הם צוחקים ולוקחים 10 מזון.', 'bad'); } }],
    ['להתגונן', () => { if (G.men >= 2 && Math.random() < .4 + G.men * .06) { G.gold += 20; log('הצוות מגן על המחנה והשודדים נסוגים. מצאתם 20 זהב.', 'good'); if (Math.random() < .3) { G.men--; log('אחד מהצוות נפצע ונאלץ לעזוב.', 'bad'); } } else { G.food = Math.max(0, G.food - 12); G.gold = Math.max(0, G.gold - 10); log('ההתגוננות נכשלה. איבדתם מזון וזהב.', 'bad'); Snd.sfx('bad'); } }, 'red']]); }
}

/* ===== ending ===== */
function score() { const v = G.world.villages.filter(v => v.trust >= 3).length; return exploredPct() * 3 + G.world.villages.filter(v => v.station).length * 30 + G.stones * 150 + v * 25 + Math.round(G.honor) * 6 + Math.floor(G.gold / 4) + (G.stones >= 7 ? Math.max(0, Math.floor(G.limit - G.day)) * 3 : 0) + G.helped * 20; }
function rankOf(s) { let r = RANKS[0][1]; for (const [m, n] of RANKS) if (s >= m) r = n; return r; }
function endGame(win, reason) {
  if (G.ended) return; G.ended = true; G.modal = true; screenEl.className = ''; const s = score(); if (s > G.best) { G.best = s; try { localStorage.setItem('niv7_best', s); } catch (e) {} }
  const finish = () => {
    G.state = 'end'; $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden'); Snd.mood(win ? 'win' : 'city'); if (win) Snd.sfx('win');
    const stats = [['אבני אור', `${G.stones} / 7`], ['מפה שנחקרה', exploredPct() + '%'], ['בארות ובתי ספר', G.world.villages.filter(v => v.station).length], ['כפרים ידידותיים', G.world.villages.filter(v => v.trust >= 3).length], ['עזרה לנזקקים', G.helped], ['כבוד', Math.round(G.honor)], ['ימים שעברו', Math.floor(G.day)], ['ניקוד', s], ['שיא אישי', G.best]];
    showPanel(h('div', { class: 'panel paper' }, h('h2', null, win ? '🌟 האור נשלם' : '⚓ סוף המסע'),
      h('p', null, win && G.raids > 0 ? 'מושון מניח את שבע האבנים זו לצד זו — והן יוצרות מצפן של אור. אבל בדרך נשארו כפרים ששדד, והם יזכרו אותו אחרת ממה שביקשה זקנת הנמל. ההיסטוריה תשפוט; המצפן, בינתיים, מצביע הביתה.' : win ? 'מושון מניח את שבע האבנים זו לצד זו — והן יוצרות מצפן של אור שמצביע חזרה הביתה ואל כל מקום שבו מישהו זקוק לעזרה. את השער האחרון פתחו לא הזהב ולא החרב, אלא ההגינות. הים כולו מתמלא בשירה, ושמו של מושון הולך לפניו — כפי שביקשה זקנת הנמל.' : reason),
      h('div', { class: 'rank' }, rankOf(s)), h('div', { class: 'end-stats' }, stats.flatMap(([k, v]) => [h('span', null, k), h('b', null, v)])),
      h('div', { class: 'row' }, btn('⛵ מסע חדש', () => { closeModal(); showTitle(); }), btn('דף הבית', () => { closeModal(); showTitle(); }, 'dark'))), 'on');
  };
  if (win) { G.state = 'end'; wipe(finish); } else finish();
}

/* ===== pause ===== */
function pause() {
  if (G.state !== 'play' || G.modal) return; Snd.sfx('click');
  showPanel(h('div', { class: 'panel' }, h('h2', null, 'תפריט'), h('div', { class: 'row', style: 'flex-direction:column;align-items:center' },
    btn('▶ להמשיך', closeModal), btn('📜 איך משחקים', () => showHow(pause), 'alt'), btn(Snd.on ? '🔊 כבה צליל' : '🔇 הפעל צליל', e => { Snd.toggle(); closeModal(); pause(); }, 'dark'),
    btn('🏠 ויתור וחזרה לתפריט הראשי', () => { G.ended = true; closeModal(); showTitle(); }, 'red'))));
}

/* ===== input ===== */
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
addEventListener('keydown', e => {
  Snd.init(); const k = e.key;
  if (G.state === 'cine') { if (k === ' ' || k === 'Enter') { e.preventDefault(); advanceCine(); } else if (k === 'Escape') endCinematic(); return; }
  if (k === 'm' || k === 'M' || k === 'צ') { Snd.toggle(); $('#b-sound').textContent = Snd.on ? '🔊' : '🔇'; return; }
  if (G.state !== 'play') return;
  if (DIRS[k]) { e.preventDefault(); if (!G.modal) G.keys[k] = true; }
  else if (k === ' ' || k === 'Enter' || k === 'e' || k === 'E') { e.preventDefault(); interact(); }
  else if (k === 'Escape' || k === 'p') { if (!G.modal) pause(); }
  else if (k === 'h' || k === 'H') { if (!G.modal) showHow(closeModal); }
});
addEventListener('keyup', e => { delete G.keys[e.key]; });
addEventListener('blur', () => { G.keys = {}; });
$('#b-sound').onclick = () => { Snd.init(); Snd.toggle(); $('#b-sound').textContent = Snd.on ? '🔊' : '🔇'; };
$('#b-help').onclick = () => { if (!G.modal && G.state === 'play') showHow(closeModal); };
$('#b-pause').onclick = () => pause();
$('#t-act').addEventListener('pointerdown', e => { e.preventDefault(); Snd.init(); interact(); });
document.querySelectorAll('.dpad button').forEach(b => { const k = b.dataset.k; b.addEventListener('pointerdown', e => { e.preventDefault(); Snd.init(); if (!G.modal) G.keys[k] = true; }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => delete G.keys[k])); });
addEventListener('pointerdown', () => Snd.init(), { once: true });

/* ===== main loop ===== */
let lastT = performance.now(), frameN = 0;
function update(dt) {
  if (G.state === 'cine') { cine.t += dt; if (cine.chars < cine.plainLen) { cine.chars = Math.min(cine.plainLen, cine.chars + dt * 32); renderCineText(); } return; }
  if (G.state !== 'play') return;
  if (G.moving) { G.moveT += dt / G.moveDur; const t = Math.min(1, G.moveT); G.actor.x = lerp(G.from.x, G.pos.x, t); G.actor.y = lerp(G.from.y, G.pos.y, t); if (t >= 1) { G.moving = false; G.actor.x = G.pos.x; G.actor.y = G.pos.y; afterStep(); } }
  if (!G.moving && !G.modal && !G.ended) { for (const k in G.keys) if (DIRS[k]) { tryMove(...DIRS[k]); break; } }
}
function draw(time, dt) {
  if (G.state === 'title' || G.state === 'setup') Render.title(time);
  else if (G.state === 'cine') Render.cine(cine.i, cine.t, time);
  else if (G.state === 'end') Render.ending(time, G.stones >= 7, G);
  else if (G.world && (G.state === 'play' || G.state === 'port')) { Render.play(G, time, dt); if (G.state === 'play' && (frameN++ % 6 === 0)) Render.minimap(G); }
}
function loop(now) { const dt = Math.min(.05, (now - lastT) / 1000); lastT = now; try { update(dt); draw(now / 1000, dt); } catch (e) { console.error(e); } requestAnimationFrame(loop); }
addEventListener('resize', () => Render.resize());
Render.resize(); $('#b-sound').textContent = Snd.on ? '🔊' : '🔇';
showTitle(); requestAnimationFrame(loop);
window.__G = G; window.__test = { newGame, interact, tryMove, enterCity, openVillage, cityWon, endGame, startCinematic, advanceDay };
