// «Глубины катакомб»: procedural floors for short 5–8 minute runs.
// Раскладка своя при каждом заходе (сид — generateFloor(floor, seed)); одинаковая — только у недельного испытания (С34).
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

import { biomeOf } from '../data/biomes.js';
export const isBossFloor = f => f % 5 === 0;
export const floorLevel = f => 1 + Math.round(f * 0.85 + Math.max(0, f - 8) * 0.4);   // после 8-го этажа уровень растёт быстрее (+1,25 за этаж)
export const parTime = (f, total) => 70 + total * 7;   // seconds for the ★★★ "fast" star

function prologue() {
  const W = 26, H = 16, g = Array.from({ length: H }, () => Array(W).fill('#'));
  const carve = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[y][x] = '.'; };
  carve(2, 4, 6, 7); carve(8, 6, 6, 2); carve(14, 3, 9, 9);
  const rows = g.map(r => r.join(''));
  return { name: 'Пролог · Склеп пробуждения', floorN: 0, prologue: true, dungeon: true, w: W, h: H, rows,
    objects: [{ t: 'floor_exit', x: 21, y: 7.5, hidden: true }, { t: 'candles', x: 3.5, y: 5 }, { t: 'bones', x: 6, y: 9.5 }, { t: 'sarcophagus', id: 'p_sarc', x: 4.5, y: 9.2, loot: 'gold' }, { t: 'brazier', x: 18.5, y: 3.8 }, { t: 'pillar', x: 15.5, y: 4.5 }, { t: 'pillar', x: 15.5, y: 10.5 }, { t: 'skulls', x: 20, y: 10.5 }],
    torches: [[5, 3], [18, 2]], spawns: [['skel_warrior', 17.5, 7.5, 3, 1.5, 1]], total: 3,
    rooms: { r0: [2, 4, 6, 7], r1: [14, 3, 9, 9] }, start: [4.5, 7.5], boss: false, level: 1, story: [] };
}
// Комнаты-шаблоны (правки 2, П30): у каждой своя начинка — стены внутри, обстановка, кого в ней встретить.
// Внутренние стены ставятся только с отступом в клетку от краёв (обход по периметру цел) и каждая проверяется на связность.
const FIGHT_KINDS = ['plain', 'colonnade', 'cross', 'ring', 'cave', 'crypt', 'library', 'ossuary', 'barracks', 'split', 'collapsed', 'flooded', 'gallery'];
const REST_KINDS = ['shrine', 'library', 'crypt'];   // передышка: без врагов, свечи, сундук или саркофаги (С37)
const KIND_MOBS = { crypt: ['ghoul', 'skel_warrior'], library: ['skel_mage', 'skel_archer'], barracks: ['skel_warrior', 'skel_archer'], cave: ['beast', 'bone_wolf'], ossuary: ['bone_wolf', 'ghoul'] };
/** floor — номер этажа; seed — сид раскладки: не задан — новый при каждом заходе (С34), недельное испытание передаёт свой (одинаковый всю неделю). */
export function generateFloor(floor, seed) {
  if (floor === 0) return prologue();
  if (seed == null) seed = (Math.random() * 4294967296) >>> 0;
  const R = rng((9173 + floor * 7919) ^ Math.imul(seed >>> 0, 2654435761));
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pickOf = a => a[Math.floor(R() * a.length)];
  const boss = isBossFloor(floor); const B = biomeOf(floor);
  // Линейный спуск: комнаты идут одна за другой (без беготни туда-обратно); над и под ними — тупики-сокровищницы
  const nRooms = Math.min(7, 4 + Math.floor(floor / 3));
  // ритм (С37): старт → бой … → передышка → кульминация. Перед боссом передышка всегда, на длинных этажах — посередине
  const role = i => i === 0 ? 'start' : i === nRooms - 1 ? (boss ? 'boss' : 'exit') : (boss && i === nRooms - 2) || (!boss && nRooms >= 6 && i === Math.floor(nRooms / 2)) ? 'rest' : 'fight';
  const H = 38, MID0 = 11, MID1 = 27, rooms = []; let cursor = 2, lastKind = '';
  for (let i = 0; i < nRooms; i++) {
    const ro = role(i), big = ro === 'boss';
    let kind = ro === 'fight' ? pickOf(FIGHT_KINDS.filter(k => k !== lastKind)) : ro === 'rest' ? pickOf(REST_KINDS) : 'plain';
    lastKind = kind;
    const w = big ? ri(11, 13) : ri(7, 10), h = big ? ri(11, 13) : ri(7, 10);
    const y = Math.max(MID0, Math.min(MID1 - h, Math.floor((MID0 + MID1) / 2 - h / 2) + ri(-3, 3)));
    rooms.push({ x: cursor, y, w, h, cx: cursor + w / 2, cy: y + h / 2, role: ro, kind }); cursor += w + ri(3, 5);
  }
  // боковые комнаты: до двух тупиков над/под боевыми комнатами — награда за крюк (сундук, саркофаги, иногда стража)
  const side = [];
  for (let i = 1; i < nRooms - 1 && side.length < 2; i++) {
    if (R() > 0.45) continue;
    const m = rooms[i], up = R() < 0.5, w = ri(5, Math.min(7, m.w)), h = ri(5, 6), x = m.x + ri(0, m.w - w);
    const y = up ? Math.max(2, MID0 - 3 - h - ri(0, 2)) : Math.min(H - 2 - h, MID1 + 2 + ri(0, 2));
    side.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2, role: 'side', kind: 'vault', of: m, up });
  }
  const W = cursor + 1;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const carve = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) g[y][x] = '.'; };
  for (const r of [...rooms, ...side]) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y);
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    let x = a.x + a.w - 1, y = Math.floor(Math.max(a.y + 1, Math.min(a.y + a.h - 2, b.cy)));
    const tx = b.x, ty = Math.floor(Math.max(b.y + 1, Math.min(b.y + b.h - 2, y)));
    const mid = Math.floor((x + tx) / 2);
    while (x < mid) { carve(x, y); carve(x, y + 1); x++; }
    while (y !== ty) { carve(x, y); carve(x + 1, y); y += Math.sign(ty - y); }
    while (x <= tx) { carve(x, y); carve(x, y + 1); x++; }
  }
  for (const s of side) {   // вертикальный проход в 2 клетки от боевой комнаты к тупику
    const m = s.of, x = Math.floor(s.x + s.w / 2) - 1;
    if (s.up) for (let y = s.y + s.h; y <= m.y; y++) { carve(x, y); carve(x + 1, y); }
    else for (let y = m.y + m.h - 1; y <= s.y; y++) { carve(x, y); carve(x + 1, y); }
  }
  const objects = [], spawns = [], torches = [];
  const all = [...rooms, ...side], first = rooms[0], last = rooms[rooms.length - 1];
  const start = [Math.floor(first.cx) + 0.5, Math.floor(first.cy) + 0.5];
  // связность: все комнаты и проходы достижимы со старта
  const connected = () => {
    const seen = new Uint8Array(W * H), q = [Math.floor(start[1]) * W + Math.floor(start[0])]; seen[q[0]] = 1; let n = 1;
    for (let k = 0; k < q.length; k++) { const c = q[k], x = c % W, y = (c / W) | 0; for (const d of [1, -1, W, -W]) { const j = c + d, X = j % W; if (j < 0 || j >= W * H || Math.abs(X - x) > 1 || seen[j] || g[(j / W) | 0][X] !== '.') continue; seen[j] = 1; n++; q.push(j); } }
    let tot = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '.') tot++;
    return n === tot;
  };
  // внутренняя стена: клетки внутри комнаты с отступом в 1 от края; откатывается, если что-то стало недостижимым
  const wall = (r, cells) => {
    const ok = cells.filter(([x, y]) => x > r.x && y > r.y && x < r.x + r.w - 1 && y < r.y + r.h - 1 && g[y][x] === '.');
    if (!ok.length) return false;
    for (const [x, y] of ok) g[y][x] = '#';
    if (connected()) return true;
    for (const [x, y] of ok) g[y][x] = '.'; return false;
  };
  const rect = (x0, y0, w, h) => { const c = []; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) c.push([x, y]); return c; };
  const put = (t, x, y, o) => objects.push({ t, x, y, ...o });
  const lvl = floorLevel(floor);
  const pool = ['skel_warrior', 'skel_warrior', 'skel_archer'];
  if (floor >= 2) pool.push('ghoul', 'bone_wolf');   // сборка 57: костяной волк
  if (floor >= 3) pool.push('skel_mage');
  if (floor >= 4) pool.push('beast');
  let total = 0;
  const free = (x, y) => g[Math.floor(y)] && g[Math.floor(y)][Math.floor(x)] === '.';
  const dc = { R, ri, put, wall, rect, g, top: MID0 - 3, ns: 0, S: rng(seed ^ 0x2c1b3c6d), st: 0 }, dress = (r, i) => dressRoom(r, i, dc);
  all.forEach((r, i) => {
    dress(r, i);
    if (r.kind !== 'shrine' && R() < 0.6) put('brazier', r.x + r.w / 2 + 0.5, r.y + 1.2);
    for (let k = 0; k < 2; k++) if (R() < 0.6) put(B.props[ri(0, 4)], r.x + 1 + R() * (r.w - 2), r.y + 1 + R() * (r.h - 2));
    // torch on the upper wall
    const tx = r.x + ri(1, r.w - 2); if (g[r.y - 1] && g[r.y - 1][tx] === '#') torches.push([tx, r.y - 1]);
    // центр для спавна — ближайшая к центру свободная клетка (в кольцевом зале центр — стена)
    let sx = r.cx, sy = r.cy; if (!free(sx, sy)) { let bd = 1e9; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (g[y][x] === '.') { const d = Math.hypot(x + 0.5 - r.cx, y + 0.5 - r.cy); if (d < bd) { bd = d; sx = x + 0.5; sy = y + 0.5; } } }
    if (r.role === 'start') return;
    if (r.role === 'boss' || r.role === 'exit') {
      if (r.role === 'boss') { spawns.push([floor % 10 === 0 ? 'boss' : 'elite_guard', sx, sy, 1, 0, lvl + 1, 'floorboss']); total++; }
      put('floor_exit', r.x + r.w - 1.6, r.cy, { hidden: true });
      return;
    }
    if (r.role === 'rest') { put('chest', r.x + 1.5, r.y + r.h - 1.5, { id: 'fc' + i }); return; }   // передышка: врагов нет, сундук
    if (r.role === 'side') {   // тупик: сундук у дальней стены, иногда пара стражей
      put('chest', r.cx, r.up ? r.y + 1.4 : r.y + r.h - 1.4, { id: 'fc' + i, rich: false });
      if (R() < 0.5) { spawns.push([pool[ri(0, pool.length - 1)], sx, sy, 2, Math.min(r.w, r.h) / 2 - 1, lvl]); total += 2; }
      return;
    }
    const n = Math.min(7, 3 + Math.floor(floor / 3) + ri(0, 2));
    const pref = (KIND_MOBS[r.kind] || []).filter(t => pool.includes(t));
    const type = pref.length && R() < 0.7 ? pickOf(pref) : pool[ri(0, pool.length - 1)];
    const alt = pool[ri(0, pool.length - 1)];
    const na = Math.ceil(n * 0.6);
    spawns.push([type, sx, sy, na, Math.min(r.w, r.h) / 2 - 1, lvl]); spawns.push([alt, sx, sy, n - na, Math.min(r.w, r.h) / 2 - 1, lvl]);
    total += n;
    if (R() < 0.35) put('chest', r.x + 1.5, r.y + 1.5, { id: 'fc' + i });
  });
  const rows = g.map(r => r.join(''));
  // входы в комнаты (клетки прохода у края комнаты) не загораживаем ничем
  const inRoom = (x, y) => all.some(r => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h), entries = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && !inRoom(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy][x + dx] === '.' && inRoom(x + dx, y + dy))) entries.push([x + 0.5, y + 0.5]);
  // objects must stand on floor and never block the start, the exit or the guardian
  const keep = [start, [last.cx, last.cy], [last.x + last.w - 1.6, last.cy]];
  const objs = objects.filter(o => free(o.x, o.y) && (o.t === 'floor_exit' || entries.every(([ex, ey]) => Math.hypot(o.x - ex, o.y - ey) > 1.6)) && (o.t === 'floor_exit' || o.t === 'chest' || keep.every(([kx, ky]) => Math.hypot(o.x - kx, o.y - ky) > 2.4)));
  for (let i = objs.length - 1; i >= 0; i--) if (objs[i].t === 'stash' && objs.some(p => p !== objs[i] && Math.hypot(p.x - objs[i].x, p.y - objs[i].y) < 1.2)) objs.splice(i, 1);   // тайник не впритык к сундуку и т. п.
  // пустые ряды стены сверху и снизу срезаем (карта не больше, чем нужно)
  let y0 = 0, y1 = H - 1; while (y0 < H && !rows[y0].includes('.')) y0++; while (y1 > 0 && !rows[y1].includes('.')) y1--;
  const dy = Math.max(0, y0 - 2), H2 = Math.min(H, y1 + 3) - dy;
  for (const o of objs) o.y -= dy; for (const s of spawns) s[2] -= dy; for (const t of torches) t[1] -= dy; start[1] -= dy;
  return {
    name: `${B.name} · этаж ${floor}`, floorN: floor, biome: B.id, dungeon: true, w: W, h: H2, rows: rows.slice(dy, dy + H2), objects: objs, torches, spawns, total, seed,
    rooms: Object.fromEntries([...rooms.map((r, i) => ['r' + i, [r.x, r.y - dy, r.w, r.h]]), ...side.map((r, i) => ['s' + i, [r.x, r.y - dy, r.w, r.h]])]), roomKinds: all.map(r => r.kind), start, boss, level: lvl, story: [],
  };
}

// начинка комнаты по шаблону: стены внутри и обстановка (общая для Глубин и катакомб Ордена)
function dressRoom(r, i, c) {
  const { R, ri, wall, rect, g } = c, here = [], put = (t, x, y, o) => { here.push([x, y]); c.put(t, x, y, o); };
  const X0 = r.x, Y0 = r.y, w = r.w, h = r.h, cx = X0 + w / 2, cy = Y0 + h / 2;
  dressKind(r, i, c, { R, ri, put, wall, rect, g, X0, Y0, w, h, cx, cy });
  // тайники, как в походе: бочка или ящик в углу комнаты (не у прохода — проходы чистит фильтр обстановки); свой ГСЧ, раскладка не меняется
  const S = c.S; if (!S || ['arena', 'altar', 'secret', 'cross'].includes(r.kind) || S() > 0.4) return;
  const cs = [[X0 + 0.9, Y0 + 0.9], [X0 + w - 0.9, Y0 + 0.9], [X0 + 0.9, Y0 + h - 0.9], [X0 + w - 0.9, Y0 + h - 0.9]].sort(() => S() - 0.5);
  for (let n = S() < 0.2 ? 2 : 1; n > 0 && cs.length;) { const [x, y] = cs.pop(); if (g[Math.floor(y)][Math.floor(x)] !== '.' || here.some(([a, b]) => Math.hypot(a - x, b - y) < 1.4)) continue; put('stash', x, y, { id: 'st' + c.st++, kind: S() < 0.5 ? 'crate' : 'barrel' }); n--; }
}
function dressKind(r, i, c, { R, ri, put, wall, rect, g, X0, Y0, w, h, cx, cy }) {
  switch (r.kind) {
    case 'plain':
      if (w >= 7 && h >= 7) for (const [dx, dy] of [[1.5, 1.5], [w - 1.5, 1.5], [1.5, h - 1.5], [w - 1.5, h - 1.5]]) if (R() < 0.7) put('pillar', X0 + dx, Y0 + dy);
      break;
    case 'colonnade':   // два ряда колонн вдоль зала
      for (let x = X0 + 2; x < X0 + w - 1.5; x += 2) for (const yy of [Y0 + 2, Y0 + h - 2]) put('pillar', x + 0.5, yy + 0.5);
      put('rug', cx, cy); break;
    case 'cross': {   // крестовый зал: углы заложены
      const a = Math.max(1, Math.floor(Math.min(w, h) / 3) - 1);
      for (const [ox, oy] of [[1, 1], [w - 1 - a, 1], [1, h - 1 - a], [w - 1 - a, h - 1 - a]]) wall(r, rect(X0 + ox, Y0 + oy, a, a));
      put('brazier', cx, cy); break;
    }
    case 'ring': {   // кольцевой зал: глухой столб в центре, бой по кругу
      const a = Math.min(3, w - 5), b = Math.min(3, h - 5);
      if (a >= 1 && b >= 1 && wall(r, rect(Math.floor(cx - a / 2), Math.floor(cy - b / 2), a, b))) for (const [dx, dy] of [[-a / 2 - 0.7, -b / 2 - 0.7], [a / 2 + 0.7, b / 2 + 0.7]]) put('candles', cx + dx, cy + dy);
      break;
    }
    case 'cave':   // обвалившийся грот: неровные стены, сталагмиты
      for (let k = 0; k < 7; k++) { const side = ri(0, 3), t = side < 2 ? ri(X0 + 1, X0 + w - 2) : ri(Y0 + 1, Y0 + h - 2); wall(r, [side === 0 ? [t, Y0 + 1] : side === 1 ? [t, Y0 + h - 2] : side === 2 ? [X0 + 1, t] : [X0 + w - 2, t]]); }
      for (let k = 0; k < 3; k++) put('stalagmite', X0 + 2 + R() * (w - 4), Y0 + 2 + R() * (h - 4));
      put('mushrooms', X0 + 2 + R() * (w - 4), Y0 + h - 2); break;
    case 'crypt': {   // ряды саркофагов (открываются, золото; при новом заходе снова закрыты — П46)
      const n = Math.min(4, Math.floor((h - 2) / 2.6));
      for (let k = 0; k < n; k++) for (const sx of [X0 + 1.9, X0 + w - 1.9]) { if (R() < 0.75 && c.ns < 6) { put('sarcophagus', sx, Y0 + 2.2 + k * 2.6, { id: `fs${i}_${c.ns++}`, loot: 'gold' }); } }
      put('candles', cx, Y0 + 1.3); break;
    }
    case 'library':   // книжные шкафы вдоль верхней стены, свечи
      for (let x = X0 + 1.6; x < X0 + w - 1.2; x += 1.6) if (R() < 0.8) put('bookshelf', x, Y0 + 0.75);
      put('candles', X0 + 1.4, Y0 + h - 1.4); put('candles', X0 + w - 1.4, Y0 + h - 1.4); put('rug', cx, cy + 0.5); break;
    case 'ossuary':   // костница: ниши в верхней стене, кости и черепа грудами
      for (let x = X0 + 1; x < X0 + w - 1; x += 2) if (Y0 - 1 > c.top && g[Y0 - 1][x] === '#' && g[Y0 - 2][x] === '#' && R() < 0.6) { g[Y0 - 1][x] = '.'; put('skulls', x + 0.5, Y0 - 0.4); }
      for (let k = 0; k < 5; k++) put(R() < 0.5 ? 'bones' : 'skulls', X0 + 1.5 + R() * (w - 3), Y0 + 1.5 + R() * (h - 3));
      put('candles', cx, cy); break;
    case 'barracks':   // казарма мёртвых: стойки с оружием, ящики, знамя
      for (let x = X0 + 1.8; x < X0 + w - 1.5; x += 2.2) put('weapon_rack', x, Y0 + 0.7);
      put('crate', X0 + 1.3, Y0 + h - 1.3); put('barrel', X0 + 2.3, Y0 + h - 1.3); put('banner', X0 + w - 1.4, Y0 + 1.2); break;
    case 'split': {   // зал перегорожен стеной с двумя проломами
      const vx = Math.floor(cx), cells = []; const g1 = ri(Y0 + 1, Y0 + Math.floor(h / 2) - 2), g2 = ri(Y0 + Math.floor(h / 2) + 1, Y0 + h - 3);
      for (let y = Y0 + 1; y < Y0 + h - 1; y++) if (y !== g1 && y !== g1 + 1 && y !== g2 && y !== g2 + 1) cells.push([vx, y]);
      if (w >= 8) wall(r, cells);
      put('rubble', vx + 0.5, g1 + 1); break;
    }
    case 'collapsed':   // свод обвалился: глыбы и щебень
      for (let k = 0; k < 4; k++) { const x = ri(X0 + 2, X0 + w - 3), y = ri(Y0 + 2, Y0 + h - 3); wall(r, R() < 0.5 ? [[x, y]] : [[x, y], [x + 1, y]]); }
      for (let k = 0; k < 3; k++) put('rubble', X0 + 1.5 + R() * (w - 3), Y0 + 1.5 + R() * (h - 3)); break;
    case 'flooded':   // подтопленный склеп: лужи и светящиеся грибы
      for (let k = 0; k < 5; k++) put('puddle', X0 + 1.5 + R() * (w - 3), Y0 + 1.5 + R() * (h - 3));
      put('mushrooms', X0 + 1.4, Y0 + 1.4); put('mushrooms', X0 + w - 1.4, Y0 + h - 1.4); break;
    case 'gallery':   // галерея статуй по бокам и дорожка посередине
      for (let x = X0 + 2; x < X0 + w - 1.5; x += 2.5) { put('statue', x, Y0 + 1.1); if (h >= 8) put('statue', x, Y0 + h - 1.1); }
      put('rug', cx, cy); break;
    case 'shrine':   // молельня — передышка: статуя, свечи, жаровни
      put('statue', cx, Y0 + 1.3); put('candles', cx - 1.6, Y0 + 1.6); put('candles', cx + 1.6, Y0 + 1.6); put('rug', cx, cy + 0.5);
      put('brazier', X0 + 1.4, Y0 + h - 1.4); put('brazier', X0 + w - 1.4, Y0 + h - 1.4); break;
    case 'vault':   // сокровищница-тупик: свечи, пара саркофагов у стен
      put('candles', X0 + 1.3, r.up ? Y0 + 1.3 : Y0 + h - 1.3); put('candles', X0 + w - 1.3, r.up ? Y0 + 1.3 : Y0 + h - 1.3);
      if (w >= 6 && R() < 0.6) for (const sx of [X0 + 1.2, X0 + w - 1.2]) put('sarcophagus', sx, cy, { id: `fs${i}_${c.ns++}`, loot: 'gold' });
      break;
  }
}

// П30: катакомбы Ордена со второго захода — каждый раз новая раскладка (первый заход — ручная карта обучения).
// Сетка 6×4 (или 4×6) ячеек по 13 клеток: арена Палача занимает 2×2, остальные 20 — сюжетные залы с прежними именами
// (entry, ossuary, gallery, cave, cross, crypt, hall, altar, secret, guard — по ним живут охоты, уровни мобов, арена) и 10 новых
// комнат, по одной каждого вида из CATA_EXTRA. Сюжет держится на порядке: Алтарь — тупик к востоку от Зала (дверь door_altar),
// арена — к востоку от Зала стражи (печать gate), тайник — тупик; ключ (sarc3) в оссуарии, до него нет ни дверей, ни печатей.
const CATA_EXTRA = ['ring', 'library', 'barracks', 'split', 'collapsed', 'flooded', 'colonnade', 'shrine', 'vault', 'plain'];
const CATA_POOL = ['skel_warrior', 'skel_warrior', 'skel_archer', 'skel_mage', 'bone_wolf', 'ghoul'];
const CATA_MOBS = { entry: [3, ['skel_warrior']], ossuary: [5, ['skel_warrior', 'skel_archer']], guard: [5, ['skel_warrior', 'skel_archer']], altar: [3, ['skel_warrior', 'skel_mage']], secret: [2, ['ghoul']], arena: [0], shrine: [0] };
export function generateCatacombs(seed = (Math.random() * 4294967296) >>> 0) {
  const R = rng(seed ^ 0x5bd1e995), ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pickOf = a => a[Math.floor(R() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const S = 13, [C, Rw] = R() < 0.5 ? [6, 4] : [4, 6], W = C * S + 2, H = Rw * S + 2, id = (c, r) => r * C + c;
  const nb = k => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [k % C + dx, ((k / C) | 0) + dy]).filter(([c, r]) => c >= 0 && r >= 0 && c < C && r < Rw).map(([c, r]) => id(c, r));
  let plan = null;
  for (let tries = 0; !plan && tries < 200; tries++) {
    // арена 2×2 у края карты, но не у западного (с запада к ней примыкает Зал стражи)
    const c0 = ri(1, C - 2), r0 = ri(0, Rw - 2); if (!(r0 === 0 || r0 === Rw - 2 || c0 === C - 2)) continue;
    const arena = [id(c0, r0), id(c0 + 1, r0), id(c0, r0 + 1), id(c0 + 1, r0 + 1)], guard = id(c0 - 1, r0 + ri(0, 1));
    const free = [...Array(C * Rw).keys()].filter(k => !arena.includes(k));
    const dist = (from, set) => { const d = new Map([[from, 0]]), q = [from]; for (let h = 0; h < q.length; h++) for (const n of nb(q[h])) if (set.includes(n) && !d.has(n)) { d.set(n, d.get(q[h]) + 1); q.push(n); } return d; };
    const dg = dist(guard, free), far = [...dg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3), entry = pickOf(far)[0];
    // Алтарь — тупик, вход только с запада (из Зала); тайник — тупик с любой стороны
    const altar = pickOf(free.filter(k => k % C > 0 && ![entry, guard].includes(k) && ![entry, guard].includes(k - 1) && free.includes(k - 1))); if (altar == null) continue;
    const hall = altar - 1, secret = pickOf(free.filter(k => ![entry, guard, altar, hall].includes(k)));
    const rest = free.filter(k => k !== altar && k !== secret);
    if (dist(entry, rest).size !== rest.length) continue;   // без алтаря и тайника остальное должно быть связным
    const sNb = nb(secret).filter(k => rest.includes(k)); if (!sNb.length) continue;
    // случайное остовное дерево (Прим) от входа + две-три петли, чтобы не было одной кишки
    const inT = new Set([entry]), edges = [];
    while (inT.size < rest.length) { const cand = []; for (const a of inT) for (const b of nb(a)) if (rest.includes(b) && !inT.has(b)) cand.push([a, b]); const e = pickOf(cand); edges.push(e); inT.add(e[1]); }
    const has = (a, b) => edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    for (let k = 0, n = ri(2, 3); k < 30 && n > 0; k++) { const a = pickOf(rest), b = pickOf(nb(a)); if (rest.includes(b) && !has(a, b)) { edges.push([a, b]); n--; } }
    edges.push([pickOf(sNb), secret], [hall, altar, 'D'], [guard, guard + 1, 'G']);
    const depth = dist(entry, rest), byDepth = rest.filter(k => ![entry, guard, hall].includes(k)).sort((a, b) => depth.get(a) - depth.get(b));
    const ossuary = byDepth.splice(ri(0, 2), 1)[0], named = shuffle(byDepth.slice());
    const role = new Map([[entry, 'entry'], [guard, 'guard'], [hall, 'hall'], [altar, 'altar'], [secret, 'secret'], [ossuary, 'ossuary']]);
    ['gallery', 'cave', 'cross', 'crypt'].forEach((n, i) => role.set(named[i], n));
    const kinds = shuffle(CATA_EXTRA.slice()); named.slice(4).forEach((k, i) => role.set(k, 'x' + i + ':' + kinds[i]));
    // ключ (правки 2): в одной из средних комнат пути — не у входа и не рядом с Залом, Стражей, алтарём и ареной; без подсказок
    const maxD = Math.max(...depth.values()), refD = Math.max(depth.get(guard), depth.get(hall)), late = new Set(edges.filter(([a, b]) => [guard, hall].includes(a) || [guard, hall].includes(b)).flat());
    const mid = rest.filter(k => ![entry, guard, hall].includes(k) && !late.has(k) && depth.get(k) >= Math.max(1, Math.ceil(refD * 0.3)) && depth.get(k) <= Math.floor(refD * 0.7));
    if (!mid.length) continue;
    plan = { arena, c0, r0, edges, role, depth, maxD, keySlot: pickOf(mid) };
  }
  if (!plan) return null;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  // комнаты: каждая накрывает середину своей ячейки (клетки 4..8) — так прямой коридор к соседу всегда попадает в обе
  const rooms = {}, kindOf = {}, slotRoom = new Map(), roomLevel = {};
  const box = (k, w, h) => { const sx = 1 + (k % C) * S, sy = 1 + ((k / C) | 0) * S, x = sx + ri(Math.max(1, 9 - w), Math.min(4, 12 - w)), y = sy + ri(Math.max(1, 9 - h), Math.min(4, 12 - h)); return { x, y, w, h }; };
  for (const [k, ro] of plan.role) {
    const [name, kind] = ro.split(':'), big = ['ossuary', 'altar', 'entry', 'guard'].includes(name);
    const r = box(k, big ? ri(9, 10) : ri(7, 10), big ? ri(9, 10) : ri(7, 10)); r.name = name; r.kind = kind || name;
    rooms[name] = r; slotRoom.set(k, r);
    if (kind) roomLevel[name] = Math.max(2, Math.min(5, 2 + Math.round(plan.depth.get(k) / Math.max(1, plan.maxD) * 3)));
  }
  { const bx = 1 + plan.c0 * S, by = 1 + plan.r0 * S, w = ri(18, 20), h = ri(18, 20);   // арена накрывает середины всех четырёх ячеек
    const r = { x: bx + ri(Math.max(1, 22 - w), Math.min(4, 25 - w)), y: by + ri(Math.max(1, 22 - h), Math.min(4, 25 - h)), w, h, name: 'arena', kind: 'arena' };
    rooms.arena = r; for (const k of plan.arena) slotRoom.set(k, r); }
  const all = Object.values(rooms);
  for (const r of all) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = '.';
  // коридоры в 3 клетки, прямые; дверь и печать — поперёк коридора на всю ширину
  const mouths = new Map(), doors = [];
  for (const [a, b, gate] of plan.edges) {
    const A = slotRoom.get(a), B = slotRoom.get(b), horiz = (a % C) !== (b % C);
    const [P, Q] = horiz ? (A.x < B.x ? [A, B] : [B, A]) : (A.y < B.y ? [A, B] : [B, A]);
    const lo = horiz ? Math.max(P.y, Q.y) : Math.max(P.x, Q.x), hi = horiz ? Math.min(P.y + P.h, Q.y + Q.h) : Math.min(P.x + P.w, Q.x + Q.w), t0 = ri(lo, hi - 3);
    const s0 = horiz ? P.x + P.w : P.y + P.h, s1 = horiz ? Q.x - 1 : Q.y - 1, mid = (s0 + s1) >> 1, cells = [];
    for (let s = s0; s <= s1; s++) for (let t = t0; t < t0 + 3; t++) { const [x, y] = horiz ? [s, t] : [t, s]; g[y][x] = gate && s === mid ? gate : '.'; if (gate && s === mid) cells.push([x, y]); }
    for (const [R0, side] of [[P, horiz ? 'e' : 's'], [Q, horiz ? 'w' : 'n']]) { if (!mouths.has(R0)) mouths.set(R0, []); mouths.get(R0).push({ side, t: t0 + 1.5 }); }
    if (gate) doors.push({ t: gate === 'D' ? 'door' : 'gate', cells });
  }
  const pass = c => c === '.' || c === 'D' || c === 'G';
  const start = [rooms.entry.x + rooms.entry.w / 2, rooms.entry.y + rooms.entry.h / 2].map(v => Math.floor(v) + 0.5);
  const connected = () => {
    const seen = new Uint8Array(W * H), q = [Math.floor(start[1]) * W + Math.floor(start[0])]; seen[q[0]] = 1; let n = 1, tot = 0;
    for (let k = 0; k < q.length; k++) { const c = q[k], x = c % W; for (const d of [1, -1, W, -W]) { const j = c + d, X = j % W; if (j < 0 || j >= W * H || Math.abs(X - x) > 1 || seen[j] || !pass(g[(j / W) | 0][X])) continue; seen[j] = 1; n++; q.push(j); } }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (pass(g[y][x])) tot++;
    return n === tot;
  };
  const wall = (r, cells) => {
    const ok = cells.filter(([x, y]) => x > r.x && y > r.y && x < r.x + r.w - 1 && y < r.y + r.h - 1 && g[y][x] === '.');
    if (!ok.length) return false;
    for (const [x, y] of ok) g[y][x] = '#';
    if (connected()) return true;
    for (const [x, y] of ok) g[y][x] = '.'; return false;
  };
  const rect = (x0, y0, w, h) => { const c = []; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) c.push([x, y]); return c; };
  const decor = [], key = [], put = (t, x, y, o) => decor.push({ t, x, y, ...o });
  const dc = { R, ri, put, wall, rect, g, top: 1, ns: 0, S: rng(seed ^ 0x2c1b3c6d), st: 0 };
  all.forEach((r, i) => dressRoom(r, i, dc));
  // точка в комнате: ближайшая к желаемой клетка пола, вокруг которой пол, вдали от проходов и других сюжетных вещей
  const mouthPts = r => (mouths.get(r) || []).map(({ side, t }) => side === 'e' ? [r.x + r.w, t] : side === 'w' ? [r.x, t] : side === 's' ? [t, r.y + r.h] : [t, r.y]);
  const spot = (r, fx, fy, gap = 2.4) => {
    const M = mouthPts(r); let best = null, bd = 1e9;
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
      let ok = true; for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (g[y + dy][x + dx] !== '.') { ok = false; break; }
      const px = x + 0.5, py = y + 0.5; if (!ok || M.some(([mx, my]) => Math.hypot(mx - px, my - py) < gap) || key.some(o => Math.hypot(o.x - px, o.y - py) < 2)) continue;
      const d = Math.hypot(px - fx, py - fy); if (d < bd) { bd = d; best = [px, py]; }
    }
    return best || [r.x + r.w / 2, r.y + r.h / 2];
  };
  const place = (t, r, fx, fy, o) => { const [x, y] = spot(r, fx, fy); const ob = { t, x, y, ...o }; key.push(ob); return ob; };
  const far = r => { const s = new Set((mouths.get(r) || []).map(m => m.side)), cx = r.x + r.w / 2, cy = r.y + r.h / 2;   // сторона без проходов
    const side = ['n', 's', 'w', 'e'].find(d => !s.has(d)) || 'n'; return { n: [cx, r.y + 1.5], s: [cx, r.y + r.h - 1.5], w: [r.x + 1.5, cy], e: [r.x + r.w - 1.5, cy] }[side]; };
  const corner = (r, k) => [[r.x + 1.5, r.y + 1.5], [r.x + r.w - 1.5, r.y + 1.5], [r.x + 1.5, r.y + r.h - 1.5], [r.x + r.w - 1.5, r.y + r.h - 1.5]][k & 3];
  const E = rooms.entry, O = rooms.ossuary, A = rooms.altar, Ar = rooms.arena;
  place('portal', E, ...far(E), { to: 'town' });
  place('chest', E, ...corner(E, ri(0, 3)), { id: 'c_entry' });
  shuffle([[O.x + 2, O.y + 2.5], [O.x + 2, O.y + O.h - 2.5], [O.x + O.w - 2, O.y + 2.5], [O.x + O.w - 2, O.y + O.h - 2.5]]).slice(0, 3).forEach((p, i) => place('sarcophagus', O, ...p, { id: 'sarc' + i, loot: 'gold' }));
  // саркофаги по всем катакомбам: в одном — ключ (средняя комната пути), в остальных — золото, иногда зелье или вещь
  const sarcAt = r => { const [x, y] = spot(r, r.x + 1.5 + R() * (r.w - 3), r.y + 1.5 + R() * (r.h - 3)); return [x, y]; };
  { const K = slotRoom.get(plan.keySlot); place('sarcophagus', K, ...sarcAt(K), { id: 'sarc3', loot: 'key' }); }
  shuffle(all.filter(r => !['arena', 'altar', 'ossuary', 'crypt'].includes(r.name) && r !== slotRoom.get(plan.keySlot))).slice(0, ri(3, 5)).forEach((r, i) => place('sarcophagus', r, ...sarcAt(r), { id: 'sx' + i, loot: 'gold' }));
  place('chest', O, O.x + O.w / 2, O.y + O.h - 1.5, { id: 'c_oss' });
  place('altar_medallion', A, ...far(A), { id: 'medallion' });
  place('chest', A, ...corner(A, ri(0, 3)), { id: 'c_alt', rich: 1 });
  place('chest', rooms.gallery, ...corner(rooms.gallery, ri(0, 3)), { id: 'c_gal', rich: 1 });
  place('chest', rooms.cave, ...corner(rooms.cave, ri(0, 3)), { id: 'c_cave' });
  place('chest', rooms.secret, rooms.secret.x + rooms.secret.w / 2, rooms.secret.y + rooms.secret.h / 2, { id: 'c_secret', rich: 1 });
  place('chest', rooms.guard, ...corner(rooms.guard, ri(0, 3)), { id: 'c_guard' });
  place('chest', rooms.hall, ...corner(rooms.hall, ri(0, 3)), { id: 'c_hall' });
  place('sarcophagus', rooms.crypt, rooms.crypt.x + rooms.crypt.w / 2, rooms.crypt.y + rooms.crypt.h - 2, { id: 'sarc4', loot: 'gold' });
  const pr = far(Ar); place('portal_return', Ar, pr[0], pr[1], { to: 'town', hidden: 1 });
  for (let k = 0; k < 4; k++) place('brazier', Ar, ...corner(Ar, k).map((v, j) => v + (j ? (k < 2 ? 2 : -2) : (k % 2 ? -2 : 2))));
  all.filter(r => r.kind === 'shrine').forEach((r, i) => place('chest', r, r.x + 1.5, r.y + r.h - 1.5, { id: 'cx' + i }));
  for (const d of doors) { const m = d.cells.reduce((s, [x, y]) => [s[0] + x, s[1] + y], [0, 0]).map(v => Math.floor(v / d.cells.length)); key.push(d.t === 'door' ? { t: 'door', x: m[0] + 0.5, y: m[1] + 0.5, id: 'door_altar', key: 'key', tiles: d.cells } : { t: 'gate', x: m[0] + 0.5, y: m[1] + 0.5, id: 'gate', tiles: d.cells }); }
  for (const r of [E, rooms.hall, rooms.guard]) { put('brazier', r.x + 1.4, r.y + 1.4); put('brazier', r.x + r.w - 1.4, r.y + 1.4); }
  put('candles', A.x + 1.4, A.y + 1.4); put('candles', A.x + A.w - 1.4, A.y + A.h - 1.4); put('banner', rooms.guard.x + rooms.guard.w / 2, rooms.guard.y + 1.1);
  // мобы и факелы
  const spawns = [], torches = [];
  for (const r of all) {
    for (let k = 0; k < (r.w > 12 ? 4 : 2); k++) { const tx = r.x + ri(1, r.w - 2); if (g[r.y - 1][tx] === '#' && !torches.some(t => Math.abs(t[0] - tx) < 2 && t[1] === r.y - 1)) torches.push([tx, r.y - 1]); }
    const [n0, types] = CATA_MOBS[r.name] || CATA_MOBS[r.kind] || [ri(2, 4)]; if (!n0) continue;
    const pref = types || (KIND_MOBS[r.kind] || []).concat(r.kind === 'cave' ? ['beast'] : []), [sx, sy] = spot(r, r.x + r.w / 2, r.y + r.h / 2, 1.5), sp = Math.min(r.w, r.h) / 2 - 1.5;
    const main = pref.length ? pickOf(pref) : pickOf(CATA_POOL), na = Math.ceil(n0 * 0.6);
    spawns.push([main, sx, sy, na, sp]); if (n0 - na) spawns.push([types ? pickOf(types) : pickOf(CATA_POOL), sx, sy, n0 - na, sp]);
  }
  const elite = spot(A, A.x + A.w / 2, A.y + A.h / 2, 1.5), boss = [Ar.x + Ar.w / 2, Ar.y + Ar.h / 2];
  // обстановка не стоит в проходах, у сюжетных вещей и на старте
  const allM = all.flatMap(mouthPts), free = (x, y) => g[Math.floor(y)] && g[Math.floor(y)][Math.floor(x)] === '.';
  const objs = decor.filter(o => free(o.x, o.y) && allM.every(([mx, my]) => Math.hypot(o.x - mx, o.y - my) > 1.8) && [...key, { x: start[0], y: start[1] }, { x: elite[0], y: elite[1] }, { x: boss[0], y: boss[1] }].every(k => Math.hypot(o.x - k.x, o.y - k.y) > 1.6));
  for (let i = objs.length - 1; i >= 0; i--) if (objs[i].t === 'stash' && objs.some(p => p !== objs[i] && Math.hypot(p.x - objs[i].x, p.y - objs[i].y) < 1.2)) objs.splice(i, 1);   // тайник не впритык к жаровне и т. п.
  { let n = key.filter(o => o.t === 'sarcophagus').length; for (let i = objs.length - 1; i >= 0; i--) if (objs[i].t === 'sarcophagus' && ++n > 12) objs.splice(i, 1); }   // не больше 12 саркофагов
  return {
    name: 'Катакомбы Ордена', gen: true, floorN: 1, seed, w: W, h: H, rows: g.map(r => r.join('')), objects: [...key, ...objs], torches, spawns, start,
    story: [['elite', elite[0], elite[1], 'elite_guard'], ['boss', boss[0], boss[1], 'boss']],
    rooms: Object.fromEntries(all.map(r => [r.name, [r.x, r.y, r.w, r.h]])), roomKinds: all.map(r => r.kind), roomLevel,
  };
}
