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
  let total = 0, nSarc = 0;
  const free = (x, y) => g[Math.floor(y)] && g[Math.floor(y)][Math.floor(x)] === '.';
  // начинка комнаты по шаблону: стены внутри и обстановка
  const dress = (r, i) => {
    const X0 = r.x, Y0 = r.y, w = r.w, h = r.h, cx = X0 + w / 2, cy = Y0 + h / 2;
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
        for (let k = 0; k < n; k++) for (const sx of [X0 + 1.9, X0 + w - 1.9]) { if (R() < 0.75 && nSarc < 6) { put('sarcophagus', sx, Y0 + 2.2 + k * 2.6, { id: `fs${i}_${nSarc++}`, loot: 'gold' }); } }
        put('candles', cx, Y0 + 1.3); break;
      }
      case 'library':   // книжные шкафы вдоль верхней стены, свечи
        for (let x = X0 + 1.6; x < X0 + w - 1.2; x += 1.6) if (R() < 0.8) put('bookshelf', x, Y0 + 0.75);
        put('candles', X0 + 1.4, Y0 + h - 1.4); put('candles', X0 + w - 1.4, Y0 + h - 1.4); put('rug', cx, cy + 0.5); break;
      case 'ossuary':   // костница: ниши в верхней стене, кости и черепа грудами
        for (let x = X0 + 1; x < X0 + w - 1; x += 2) if (Y0 - 1 > MID0 - 3 && g[Y0 - 1][x] === '#' && g[Y0 - 2][x] === '#' && R() < 0.6) { g[Y0 - 1][x] = '.'; put('skulls', x + 0.5, Y0 - 0.4); }
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
        if (w >= 6 && R() < 0.6) for (const sx of [X0 + 1.2, X0 + w - 1.2]) put('sarcophagus', sx, cy, { id: `fs${i}_${nSarc++}`, loot: 'gold' });
        break;
    }
  };
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
  // пустые ряды стены сверху и снизу срезаем (карта не больше, чем нужно)
  let y0 = 0, y1 = H - 1; while (y0 < H && !rows[y0].includes('.')) y0++; while (y1 > 0 && !rows[y1].includes('.')) y1--;
  const dy = Math.max(0, y0 - 2), H2 = Math.min(H, y1 + 3) - dy;
  for (const o of objs) o.y -= dy; for (const s of spawns) s[2] -= dy; for (const t of torches) t[1] -= dy; start[1] -= dy;
  return {
    name: `${B.name} · этаж ${floor}`, floorN: floor, biome: B.id, dungeon: true, w: W, h: H2, rows: rows.slice(dy, dy + H2), objects: objs, torches, spawns, total, seed,
    rooms: Object.fromEntries([...rooms.map((r, i) => ['r' + i, [r.x, r.y - dy, r.w, r.h]]), ...side.map((r, i) => ['s' + i, [r.x, r.y - dy, r.w, r.h]])]), roomKinds: all.map(r => r.kind), start, boss, level: lvl, story: [],
  };
}
