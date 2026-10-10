// «Разрушенный храм» (портал с руками): каменный лабиринт 6×6 залов, на каждой глубине — новый (сид по глубине).
// Залы 8×8 м, стены в 1 тайл ('D'), проходы — арки и проломы шириной 4 м и больше, лишних ступенек нет: пол ровный.
// Центр — святилище 2×2 зала: мини-босс (поля 1–5), Осквернитель (6-я локация), Падший бог (каждая 12-я).
// Символы: ',' плиты храма · '.' трава заросшего двора · 'x' кусты (только в углах залов и за стенами) · 'D' стена.
// Что дальше рисует 3D: стены — props.js (temple: глыбы, обломанные куски, опоры), арки и колонны — объекты tw_*.
import { REALMS, WILD_MOBS, moodOf, wildLevel, isWildBoss, isWildFort, fieldVariant, locationName } from '../data/wild.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const W = 64, H = 64, CS = 9, NX = 6, NY = 6, X0 = 5, Y0 = 5;   // стены на X0 + i·CS: 5, 14, … 59
const SANCT = [2, 3];   // святилище — залы (2..3, 2..3)
// старт и выход по номеру лабиринта: каждый раз из другого угла
const ROUTES = [[[0, 5], [5, 0]], [[5, 5], [0, 0]], [[0, 0], [5, 5]], [[5, 0], [0, 5]], [[0, 3], [5, 2]], [[0, 5], null]];

export function generateTemple(depth, salt = 0) {
  const RL = REALMS.temple, mood = moodOf('temple', depth), boss = isWildBoss(depth), isFort = isWildFort(depth), variant = fieldVariant(depth);
  const R = rng(6007 + depth * 7919 + salt * 104729), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const g = Array.from({ length: H }, () => Array(W).fill('x'));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 'x' : g[y][x];
  const inSan = (i, j) => SANCT.includes(i) && SANCT.includes(j);
  const cx0 = i => X0 + i * CS + 1, cy0 = j => Y0 + j * CS + 1;   // первый тайл пола зала
  const ccx = i => X0 + i * CS + 5, ccy = j => Y0 + j * CS + 5;   // центр зала (мир)

  // --- лабиринт: остовное дерево (обход в глубину), святилище — один узел
  const id = (i, j) => inSan(i, j) ? -1 : j * NX + i;
  const open = new Set();   // ключи стен между залами: 'v,i,j' — между (i,j) и (i+1,j); 'h,i,j' — между (i,j) и (i,j+1)
  const wkey = (a, b) => a[0] !== b[0] ? `v,${Math.min(a[0], b[0])},${a[1]}` : `h,${a[0]},${Math.min(a[1], b[1])}`;
  for (const i of SANCT) for (const j of SANCT) { if (i === SANCT[0]) open.add(wkey([i, j], [i + 1, j])); if (j === SANCT[0]) open.add(wkey([i, j], [i, j + 1])); }
  const seen = new Set(), stack = [ROUTES[variant][0]]; seen.add(id(...stack[0]));
  const nb = (i, j) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < NX && b < NY);
  const tree = new Set();
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cand = (inSan(...cur) ? SANCT.flatMap(i => SANCT.map(j => [i, j])).flatMap(c => nb(...c)) : nb(...cur)).filter(c => !seen.has(id(...c)));
    if (!cand.length) { stack.pop(); continue; }
    const nx = cand[Math.floor(R() * cand.length)];
    const from = inSan(...cur) ? SANCT.flatMap(i => SANCT.map(j => [i, j])).find(c => Math.abs(c[0] - nx[0]) + Math.abs(c[1] - nx[1]) === 1) : cur;
    tree.add(wkey(from, nx)); seen.add(id(...nx)); stack.push(nx);
  }
  // петли: часть остальных стен тоже обрушена, чтобы не бегать тупиками туда-обратно
  const walls = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { if (i < NX - 1) walls.push(`v,${i},${j}`); if (j < NY - 1) walls.push(`h,${i},${j}`); }
  for (const k of walls) if (!open.has(k) && (tree.has(k) || R() < 0.14)) open.add(k);

  // --- раскладка тайлов
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) set(x, y, '.');   // двор вокруг храма — трава
  for (let x = X0; x <= X0 + NX * CS; x++) { set(x, Y0, 'D'); set(x, Y0 + NY * CS, 'D'); }
  for (let y = Y0; y <= Y0 + NY * CS; y++) { set(X0, y, 'D'); set(X0 + NX * CS, y, 'D'); }
  // за наружной стеной — заросли: кусты стеной, храм виден как остров в зелени
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (x < X0 || y < Y0 || x > X0 + NX * CS || y > Y0 + NY * CS) set(x, y, 'x');
  const style = [];   // вид зала: hall — плиты и колонны, garden — травяной клуатр с кустами по углам, ruin — плиты в обломках
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const s = inSan(i, j) ? 'sanct' : R() < 0.34 ? 'garden' : R() < 0.5 ? 'ruin' : 'hall'; style[j * NX + i] = s;
    for (let y = cy0(j); y < cy0(j) + 8; y++) for (let x = cx0(i); x < cx0(i) + 8; x++) set(x, y, s === 'garden' ? '.' : ',');
  }
  const archs = [], archPiers = [], rubble = [];
  // внутренние стены: по сетке; у открытых — арка, пролом или обвал целиком
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) set(X0 + i * CS, Y0 + j * CS, 'D');   // опоры на стыках
  for (const k of walls) {
    const [o, i, j] = k.split(','), v = o === 'v', I = +i, J = +j;
    const line = []; for (let t = 0; t < 8; t++) line.push(v ? [X0 + (I + 1) * CS, cy0(J) + t] : [cx0(I) + t, Y0 + (J + 1) * CS]);
    for (const [x, y] of line) set(x, y, 'D');
    if (!open.has(k)) continue;
    const sanIn = inSan(I, J) && inSan(v ? I + 1 : I, v ? J : J + 1);
    if (sanIn) { for (const [x, y] of line) set(x, y, ','); continue; }   // внутри святилища стен нет
    const r = R(), kind = r < 0.5 ? 'arch' : r < 0.85 ? 'gap' : 'fallen';
    if (kind === 'arch') {   // арка: проём 4 м посередине, опоры арки — на соседних тайлах стены
      for (let t = 2; t <= 5; t++) set(...line[t], ',');
      const m = [(line[3][0] + line[4][0]) / 2 + 0.5, (line[3][1] + line[4][1]) / 2 + 0.5];
      archs.push({ t: 'tw_arch', x: m[0], y: m[1], rot: v ? Math.PI / 2 : 0 }); archPiers.push(line[1].join(','), line[6].join(','));
    } else if (kind === 'gap') {   // пролом 4–5 м, по краям — осыпь
      const a = ri(1, 3), n = ri(4, 5); for (let t = a; t < Math.min(8, a + n); t++) set(...line[t], ',');
      rubble.push([line[a][0] + 0.5, line[a][1] + 0.5], [line[Math.min(7, a + n - 1)][0] + 0.5, line[Math.min(7, a + n - 1)][1] + 0.5]);
    } else {   // стена рухнула целиком — остался обломок у опоры
      for (let t = 1; t < 8; t++) set(...line[t], ',');
      for (let t = 2; t < 7; t += 2) rubble.push([line[t][0] + 0.5 + (v ? (R() - 0.5) * 2 : 0), line[t][1] + 0.5 + (v ? 0 : (R() - 0.5) * 2)]);
    }
  }
  set(X0 + 3 * CS, Y0 + 3 * CS, ',');   // в центре святилища опоры нет
  // кусты в углах травяных залов (2×2 тайла, проходы не задевают — проёмы посередине стен)
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (style[j * NX + i] === 'garden') {
    for (const [ox, oy] of [[0, 0], [6, 0], [0, 6], [6, 6]]) if (R() < 0.7) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) set(cx0(i) + ox + dx, cy0(j) + oy + dy, 'x');
  }

  // --- проходимость (BFS по тайлам) — карта гарантированно связна, но проверяем для расстановки
  const [si, sj] = ROUTES[variant][0], start = [ccx(si) - 0.5, ccy(sj) - 0.5];
  const reach = (() => { const s = new Uint8Array(W * H), q = [[Math.floor(start[0]), Math.floor(start[1])]]; s[q[0][1] * W + q[0][0]] = 1;
    for (let k = 0; k < q.length; k++) { const [x, y] = q[k]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, c = at(X, Y); if (c === 'x' || c === 'D' || s[Y * W + X]) continue; s[Y * W + X] = 1; q.push([X, Y]); } } return s; })();
  const placed = [];
  const near = (x, y, r) => placed.some(p => Math.hypot(p[0] - x, p[1] - y) < r);
  const free = (x, y, m = 0) => { for (let dy = -m; dy <= m; dy++) for (let dx = -m; dx <= m; dx++) { const c = at(Math.floor(x) + dx, Math.floor(y) + dy); if (c !== ',' && c !== '.') return false; } return reach[Math.floor(y) * W + Math.floor(x)] === 1; };

  const objects = [], spawns = [], lvl = wildLevel('temple', depth);
  const exitCell = ROUTES[variant][1], exit = exitCell ? [ccx(exitCell[0]) - 0.5, ccy(exitCell[1]) - 0.5] : [X0 + 3 * CS + 0.5, Y0 + 3 * CS + 3.9];   // святилище: выход проявится у ног поверженного босса
  objects.push({ t: 'wild_home', x: start[0] - 1.5, y: start[1] + 0.5 });
  objects.push({ t: 'wild_next', x: exit[0], y: exit[1], hidden: isFort });   // в святилище-«форте» выход появляется после босса
  placed.push([start[0], start[1], 4.5], [exit[0], exit[1], 3.5]);
  objects.push(...archs);
  for (const [x, y] of rubble) if (free(x, y)) objects.push({ t: 'rubble', x, y, nocol: 1 });

  // --- святилище (по картинке храма из пака): круг с ветром в центре, кольцо — дуги стены по диагоналям и колонны с боков,
  // с севера и юга кольцо открыто; алтарь у северной стороны, страж на круге
  const SX = X0 + 3 * CS + 0.5, SY = Y0 + 3 * CS + 0.5, RR = 5.8;
  objects.push({ t: 'tp_platform', x: SX, y: SY, nocol: 1 });
  for (let k = 0; k < 8; k++) {
    if (k === 2 || k === 6) continue;
    const a = k * Math.PI / 4, x = SX + Math.cos(a) * RR, y = SY + Math.sin(a) * RR;
    if (k % 2) {   // дуга вогнутой стороной к центру; коллайдер — три круга по дуге (концы ближе к центру, середина дальше)
      const circles = [-0.3, 0, 0.3].map(da => { const r = da ? RR - 0.45 : RR + 0.35; return [SX + Math.cos(a + da) * r, SY + Math.sin(a + da) * r, 0.55]; });
      objects.push({ t: 'tp_curve', x, y, rot: Math.PI / 2 - a, circles }); placed.push([x, y, 2.4]);
    } else { objects.push({ t: 'tw_column', x, y }); placed.push([x, y, 1.2]); }
  }
  for (const dy of [-1, 1]) for (const dx of [-1.9, 1.9]) { const x = SX + dx, y = SY + dy * (RR + 0.2); objects.push({ t: 'tw_column_b', x, y }); placed.push([x, y, 1.2]); }   // обломки колонн у входов в кольцо
  objects.push({ t: 'tp_altar', x: SX, y: SY - 7.2 }); placed.push([SX, SY - 7.2, 1.8]);
  for (const dx of [-2.4, 2.4]) objects.push({ t: 'brazier', x: SX + dx, y: SY - 7.0 });
  placed.push([SX, SY, 4]);
  if (isFort) spawns.push([boss ? RL.boss : RL.commander, SX, SY, 1, 0, lvl + (boss ? 2 : 1), boss ? 'wildboss' : 'wildkeep']);
  else spawns.push([RL.minis[variant % RL.minis.length], SX, SY, 1, 0, lvl + 1, 'minib']);
  if (isFort) { const a = RL.pool.filter(([, d]) => d <= depth).map(([t]) => t).filter(t => WILD_MOBS[t].ai !== 'giant'); for (const [dx, dy] of [[-3.5, 3], [3.5, 3]]) spawns.push([a[ri(0, a.length - 1)], SX + dx, SY + dy, 2, 1.2, lvl, 'fortguard']); }
  objects.push({ t: 'wchest', id: 'wt_sanct', rich: true, x: SX, y: SY - 4.6 }); placed.push([SX, SY - 4.6, 2]);

  // --- залы: обстановка, лагеря мобов, сундуки в тупиках
  const doors = (i, j) => nb(i, j).filter(c => open.has(wkey([i, j], c))).length;
  const pool = RL.pool.filter(([, d]) => d <= depth).map(([t]) => t);
  const cells = []; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (!inSan(i, j)) cells.push([i, j]);
  let nChest = 0, nCamp = 0; const campPts = [], maxCamp = Math.min(13, 8 + Math.floor(depth / 2));
  for (const [i, j] of cells.sort(() => R() - 0.5)) {
    const st = style[j * NX + i], x0 = cx0(i), y0 = cy0(j), cx = ccx(i), cy = ccy(j);
    const isStart = i === si && j === sj, isExit = exitCell && i === exitCell[0] && j === exitCell[1];
    if (st === 'hall') for (const [ox, oy] of [[1.6, 1.6], [6.4, 1.6], [1.6, 6.4], [6.4, 6.4]]) { if (R() < 0.75) { const x = x0 + ox, y = y0 + oy; if (free(x, y) && !near(x, y, 2.2)) { objects.push({ t: R() < 0.3 ? 'tw_column_b' : 'tw_column', x, y }); placed.push([x, y, 1.2]); } } }
    if (st === 'ruin' && !isStart && !isExit && R() < 0.7) {   // угол руин в дальнем (северо-западном) углу зала — только если обе стены за ним целы
      let ok = true; for (let t = -1; t < 5; t++) if (at(x0 + t, y0 - 1) !== 'D') ok = false; for (let t = -1; t < 4; t++) if (at(x0 - 1, y0 + t) !== 'D') ok = false;
      if (ok && !near(x0 + 2, y0 + 1.5, 2.5)) { objects.push({ t: 'tp_corner', x: x0 + 1.9, y: y0 + 1.3, rot: 0, boxes: [[x0, y0, x0 + 3.7, y0 + 0.75], [x0, y0, x0 + 0.75, y0 + 2.5]] }); placed.push([x0 + 1.6, y0 + 1.4, 2.4]); }
      else {   // или в северо-восточном: стены за ним — северная и восточная (модель повёрнута на −90°)
        ok = true; for (let t = 3; t < 9; t++) if (at(x0 + t, y0 - 1) !== 'D') ok = false; for (let t = -1; t < 5; t++) if (at(x0 + 8, y0 + t) !== 'D') ok = false;
        if (ok && !near(x0 + 6, y0 + 1.5, 2.5)) { objects.push({ t: 'tp_corner', x: x0 + 6.7, y: y0 + 1.9, rot: -Math.PI / 2, boxes: [[x0 + 7.25, y0, x0 + 8, y0 + 3.7], [x0 + 5.5, y0, x0 + 8, y0 + 0.75]] }); placed.push([x0 + 6.4, y0 + 1.6, 2.4]); }
      }
    }
    if (st === 'ruin') { for (let k = 0; k < 3; k++) { const x = x0 + 1 + R() * 6, y = y0 + 1 + R() * 6; if (free(x, y) && !near(x, y, 2.4)) { objects.push({ t: R() < 0.5 ? 'tw_drum' : 'rubble', x, y, rot: R() * 6.28 }); placed.push([x, y, 1.4]); } } }
    if (st === 'garden' && R() < 0.5 && !isStart && !isExit) { if (free(cx, cy, 1) && !near(cx, cy, 2.5)) { objects.push({ t: R() < 0.5 ? 'statue' : 'tw_basin', x: cx, y: cy }); placed.push([cx, cy, 2.2]); } }
    if (isStart || isExit) continue;
    if (doors(i, j) === 1 && nChest < 4 + Math.floor(depth / 3)) {   // тупик — награда за крюк
      const x = cx, y = y0 + 1.6; if (free(x, y) && !near(x, y, 1.8)) { objects.push({ t: 'wchest', id: 'wt' + nChest, x, y }); placed.push([x, y, 1.8]); nChest++; }
    }
    if (nCamp < maxCamp && R() < 0.75) {
      const t = pool[ri(0, pool.length - 1)], MT = WILD_MOBS[t], n = MT.ai === 'giant' ? 1 : Math.min(4, ri(2, 3) + (depth >= 6 ? 1 : 0));
      spawns.push([t, cx, cy, n, 2.2, lvl]); campPts.push([cx, cy]); nCamp++;
      if (MT.ai !== 'giant' && depth >= 3 && R() < 0.3) { const t2 = pool[ri(0, pool.length - 1)]; if (WILD_MOBS[t2].ai !== 'giant') spawns.push([t2, cx, cy, 1, 2.5, lvl]); }
    } else if (R() < 0.6) { const x = x0 + 1.2 + R() * 5.6, y = y0 + 1.2 + R() * 5.6; if (free(x, y) && !near(x, y, 1.6)) { objects.push({ t: 'stash', id: 'wts' + i + '_' + j, x, y, kind: R() < 0.5 ? 'crate' : 'barrel' }); placed.push([x, y, 1.6]); } }
  }
  // схрон для ноши — в одном из дальних залов
  { const far = cells.filter(([i, j]) => Math.abs(i - si) + Math.abs(j - sj) >= 4); const c = far[ri(0, far.length - 1)]; if (c) { const x = ccx(c[0]) - 0.5, y = ccy(c[1]) + 1.8; if (free(x, y)) objects.push({ t: 'cache', id: 'tc0', x, y }); } }
  // кусты: декоративные (без коллайдера — о них не спотыкаются ни герой, ни мобы) вдоль стен, в травяных залах гуще
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const st = style[j * NX + i], x0 = cx0(i), y0 = cy0(j), n = st === 'garden' ? 7 : st === 'sanct' ? 2 : 3;
    for (let k = 0; k < n; k++) {
      const side = ri(0, 3), t = 0.6 + R() * 6.8, x = side === 0 ? x0 + t : side === 1 ? x0 + t : side === 2 ? x0 + 0.45 : x0 + 7.55, y = side === 0 ? y0 + 0.45 : side === 1 ? y0 + 7.55 : y0 + t;
      if (at(Math.floor(x), Math.floor(y)) === 'x' || near(x, y, 1.0)) continue;
      objects.push({ t: R() < 0.25 ? 'fern' : 'bush', x, y, s: 0.8 + R() * 0.7, nocol: 1, deco: 1 });
    }
  }
  objects.push({ t: 'brazier', x: start[0] + 1.5, y: start[1] - 1.5 }, { t: 'brazier', x: exit[0] - 2.2, y: exit[1] + 1.6 });

  const rows = g.map(r => r.join('')), total = spawns.reduce((a, s) => a + s[3], 0);
  return {
    name: `${RL.name} · ${locationName('temple', depth)} · глубина ${depth}`, floorN: 1400 + depth,
    wild: { camps: campPts, realm: 'temple', depth, mood, boss, fort: null, gate: null, kind: isFort ? 'fort' : 'field', variant, locName: locationName('temple', depth), archPiers, temple: true },
    w: W, h: H, rows, objects, torches: [], spawns, total, rooms: {}, start, boss, level: lvl, story: [],
  };
}
