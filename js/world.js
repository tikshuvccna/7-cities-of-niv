'use strict';
/* ---------- world data & generation ---------- */
const WW = 80, WH = 52;
const T_DEEP = 0, T_SHAL = 1, T_SAND = 2, T_GRASS = 3, T_FOREST = 4, T_HILLS = 5, T_MOUNT = 6, T_SWAMP = 7, T_DESERT = 8;
const COST = [0, 0, 1, 1, 1.5, 1.6, 0, 2.6, 1.7];
const isWater = t => t <= 1;
const isWalk = t => t >= 2 && t !== 6;

const CULTURES = [
  { name: 'בני היער', icon: '🌲', skin: '#a8714a', hair: '#1c120a', band: '#3f8a3a', cloth: '#5b7f3a', needs: 'ציידים וליקטים החיים בין העצים',
    greet: ['"שלום, זר. העצים אמרו שתבוא."', '"אתה הולך בשקט. זה טוב."'] },
  { name: 'בני השדה', icon: '🌾', skin: '#c08a5a', hair: '#3a2210', band: '#e0b23a', cloth: '#d9a441', needs: 'חקלאים שגידולי החיטה והכרם שלהם מפורסמים',
    greet: ['"הקציר טוב השנה. שב איתנו."', '"מי אתה, ומה מביא אותך לשדותינו?"'] },
  { name: 'בני הנחל', icon: '🐟', skin: '#8d5b3a', hair: '#0f0a06', band: '#2f8fc7', cloth: '#2f6f9a', needs: 'דייגים ובוני סירות שחיים לצד המים',
    greet: ['"המים הביאו אותך אלינו."', '"יש לך ספינה? ספר לנו על הים."'] },
  { name: 'בני האבן', icon: '🗿', skin: '#b4805a', hair: '#2a1a10', band: '#c0504d', cloth: '#8c6a4a', needs: 'בנאים וסתתים שחוצבים בהרים',
    greet: ['"האבן זוכרת כל רגל. מה שמך?"', '"אנחנו בונים לדורות. ואתה?"'] },
];

const CITY_DEFS = [
  { key: 'dawn', name: 'עיר השחר', game: 'lanterns', color: '#ffb347', icon: '🏮',
    story: 'שערי העיר מוארים בפנסים עתיקים. שומרת השער אומרת: "רק מי שזוכר את האור הראשון יעבור — חזור על סדר הלהבות."' },
  { key: 'springs', name: 'עיר המעיינות', game: 'riddles', color: '#58c8ff', icon: '⛲',
    story: 'מים זורמים בכל רחוב. זקני העיר מציבים חידות: "מי שמבין שאלה — מבין גם תשובה. שלוש חידות, ושתיים נכונות."' },
  { key: 'stone', name: 'עיר האבן', game: 'maze', color: '#c9a37a', icon: '🏛️',
    story: 'העיר חצובה בתוך הר, ודרכיה מפותלות כמבוך. "רק מי שמוצא את דרכו בחושך יגיע ללב ההר."' },
  { key: 'bridges', name: 'עיר הגשרים', game: 'bridge', color: '#9be36a', icon: '🌉',
    story: 'גשרי חבלים תלויים מעל התהום. "הגשר מחזיק את מי שמכיר את הקצב. עצור בדיוק ברגע הנכון."' },
  { key: 'market', name: 'עיר השוק', game: 'scales', color: '#ff8fb1', icon: '⚖️',
    story: 'שוק ענק שבו כל דבר נשקל בצדק. "אין כאן הונאה. סדר את המשקולות כך שהמאזניים יתאזנו בדיוק."' },
  { key: 'stars', name: 'עיר הכוכבים', game: 'stars', color: '#c7a8ff', icon: '🔭',
    story: 'מצפה כוכבים ענק מתחת לשמיים צלולים. "זכור את הקבוצה — ושחזר אותה כוכב אחר כוכב."' },
  { key: 'light', name: 'עיר האור', game: 'honor', color: '#ffffff', icon: '👑',
    story: 'העיר השביעית זוהרת כמו שחר שלא נגמר. "כאן לא בוחנים כוח או מהירות. כאן בוחנים מי אתה."' },
];

const NAME_A = ['נחל', 'אור', 'שדה', 'כרם', 'מעיין', 'הר', 'גבעת', 'עין', 'צל', 'ענן', 'ברק', 'דשא', 'חוף', 'מגדל'];
const NAME_B = ['־אלון', '־זית', '־דרור', '־שחר', '־רימון', '־ארז', '־קדם', '־אביב', '־נץ', '־תמר', '־שקד', '־יער'];

function genWorld(seed, diff) {
  const W = WW, H = WH, rnd = mulberry32(seed ^ 0x9e3779b9);
  const t = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = x / W, ny = y / H;
    const mask = sm(.18, .44, nx), edge = Math.min(ny, 1 - ny, 1 - nx), ef = sm(.03, .2, edge);
    const e = fbm(x * .085, y * .085, seed) * .52 + mask * ef * .36;
    const m = fbm(x * .1 + 50, y * .1 + 50, seed + 9);
    let v;
    if (e < .33) v = T_DEEP; else if (e < .40) v = T_SHAL; else if (e < .43) v = T_SAND;
    else if (e >= .70) v = T_MOUNT; else if (e >= .635) v = T_HILLS;
    else if (m > .64 && e < .53) v = T_SWAMP; else if (m < .36) v = T_DESERT; else if (m > .5) v = T_FOREST; else v = T_GRASS;
    if (x < 5) v = e < .2 ? T_DEEP : T_DEEP;
    t[y * W + x] = v;
  }
  const home = { x: 2, y: H >> 1 };
  const idx = (x, y) => y * W + x;
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // connected land components
  const comp = new Int16Array(W * H).fill(-1); const sizes = [];
  for (let i = 0; i < W * H; i++) {
    if (comp[i] >= 0 || !isWalk(t[i])) continue;
    const id = sizes.length; let n = 0; const st = [i]; comp[i] = id;
    while (st.length) {
      const c = st.pop(); n++; const cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of N4) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = idx(nx, ny); if (comp[j] < 0 && isWalk(t[j])) { comp[j] = id; st.push(j); }
      }
    }
    sizes.push(n);
  }
  let best = 0; sizes.forEach((s, i) => { if (s > sizes[best]) best = i; });

  // distance to water
  const dist = new Int16Array(W * H).fill(999); let q = [];
  for (let i = 0; i < W * H; i++) if (isWater(t[i])) { dist[i] = 0; q.push(i); }
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi], cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of N4) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = idx(nx, ny); if (dist[j] > dist[c] + 1) { dist[j] = dist[c] + 1; q.push(j); }
    }
  }

  // cities
  const cand = []; for (let i = 0; i < W * H; i++) if (comp[i] === best && t[i] !== T_SWAMP) cand.push(i);
  shuffle(cand, rnd);
  let chosen = [];
  for (let minD = 6; minD >= 1 && chosen.length < 7; minD--) for (let sp = 11; sp >= 4 && chosen.length < 7; sp--) {
    chosen = [];
    for (const c of cand) {
      if (dist[c] < minD) continue; const cx = c % W, cy = (c / W) | 0;
      if (chosen.every(o => Math.max(Math.abs(o % W - cx), Math.abs(((o / W) | 0) - cy)) >= sp)) chosen.push(c);
      if (chosen.length === 7) break;
    }
  }
  chosen.sort((a, b) => dist[b] - dist[a]);
  const finalC = chosen.shift(); const rest = shuffle(chosen, rnd); rest.push(finalC);
  const cities = rest.map((c, i) => ({ id: i, x: c % W, y: (c / W) | 0, ...CITY_DEFS[i], found: false, done: false }));

  // villages
  const villages = []; const vc = cand.slice(); shuffle(vc, rnd);
  const used = new Set(); const nameOf = () => { for (;;) { const n = NAME_A[(rnd() * NAME_A.length) | 0] + NAME_B[(rnd() * NAME_B.length) | 0]; if (!used.has(n)) { used.add(n); return n; } } };
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  const hostileP = [.08, .2, .34][diff], waryP = .3;
  for (const c of vc) {
    if (villages.length >= 24) break;
    const x = c % W, y = (c / W) | 0;
    if (dist[c] < 1 || t[c] === T_SAND && rnd() < .6) continue;
    if (cities.some(o => cheb(o.x, o.y, x, y) < 3)) continue;
    if (villages.some(o => cheb(o.x, o.y, x, y) < 4)) continue;
    if (cheb(x, y, home.x, home.y) < 5) continue;
    const r = rnd(); const att = r < hostileP ? 2 : r < hostileP + waryP ? 1 : 0;
    const culture = t[c] === T_FOREST ? 0 : (dist[c] <= 2 ? 2 : (t[c] === T_HILLS ? 3 : (rnd() * 4) | 0));
    villages.push({
      id: villages.length, x, y, name: nameOf(), culture, att, trust: att === 0 ? 2 : att === 1 ? 0 : -3,
      met: false, hint: villages.length % 7, hinted: false, need: rnd() < .38 ? (rnd() < .6 ? 'food' : 'meds') : null, needDone: false,
      rewarded: false, talks: 0, gifts: 0, seed: (rnd() * 1e9) | 0,
    });
  }
  // landAdj bitmask: bit 0..3 = land at E,W,S,N
  const adj = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = 0; N4.forEach(([dx, dy], k) => { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && !isWater(t[idx(nx, ny)])) m |= 1 << k; });
    adj[idx(x, y)] = m;
  }
  return { W, H, t, comp, best, dist, villages, cities, home, adj, seed };
}
