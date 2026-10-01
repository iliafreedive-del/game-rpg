// «Глубины катакомб»: procedural floors for short 5–8 minute runs.
// Deterministic per floor number so replays (for stars) look the same.
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

import { biomeOf } from '../data/biomes.js';
export const isBossFloor = f => f % 5 === 0;
export const floorLevel = f => 1 + Math.round(f * 0.85);
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
export function generateFloor(floor) {
  if (floor === 0) return prologue();
  const R = rng(9173 + floor * 7919);
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const boss = isBossFloor(floor); const B = biomeOf(floor);
  // Linear descent: rooms follow one after another (no running back and forth)
  const nRooms = Math.min(7, 4 + Math.floor(floor / 3));
  const H = 26, rooms = []; let cursor = 2;
  for (let i = 0; i < nRooms; i++) {
    const last = i === nRooms - 1;
    const w = last && boss ? ri(11, 13) : ri(6, 9), h = last && boss ? ri(11, 13) : ri(6, 10);
    const y = Math.max(2, Math.min(H - h - 2, Math.floor(H / 2 - h / 2) + ri(-4, 4)));
    rooms.push({ x: cursor, y, w, h, cx: cursor + w / 2, cy: y + h / 2 }); cursor += w + ri(3, 5);
  }
  const W = cursor + 1;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const carve = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) g[y][x] = '.'; };
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y);
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    let x = a.x + a.w - 1, y = Math.floor(Math.max(a.y + 1, Math.min(a.y + a.h - 2, b.cy)));
    const tx = b.x, ty = Math.floor(Math.max(b.y + 1, Math.min(b.y + b.h - 2, y)));
    const mid = Math.floor((x + tx) / 2);
    while (x < mid) { carve(x, y); carve(x, y + 1); x++; }
    while (y !== ty) { carve(x, y); carve(x + 1, y); y += Math.sign(ty - y); }
    while (x <= tx) { carve(x, y); carve(x, y + 1); x++; }
  }
  const rows = g.map(r => r.join(''));
  const objects = [], spawns = [], torches = [];
  const first = rooms[0], last = rooms[rooms.length - 1];
  const start = [Math.floor(first.cx) + 0.5, Math.floor(first.cy) + 0.5];
  const lvl = floorLevel(floor);
  const pool = ['skel_warrior', 'skel_warrior', 'skel_archer'];
  if (floor >= 2) pool.push('ghoul');
  if (floor >= 3) pool.push('skel_mage');
  if (floor >= 4) pool.push('beast');
  let total = 0;
  const free = (x, y) => rows[Math.floor(y)] && rows[Math.floor(y)][Math.floor(x)] === '.';
  rooms.forEach((r, i) => {
    // decoration
    if (r.w >= 7 && r.h >= 7) for (const [dx, dy] of [[1.5, 1.5], [r.w - 1.5, 1.5], [1.5, r.h - 1.5], [r.w - 1.5, r.h - 1.5]]) if (R() < 0.7) objects.push({ t: 'pillar', x: r.x + dx, y: r.y + dy });
    if (R() < 0.6) objects.push({ t: 'brazier', x: r.x + r.w / 2 + 0.5, y: r.y + 1.2 });
    for (let k = 0; k < 2; k++) if (R() < 0.6) objects.push({ t: B.props[ri(0, 4)], x: r.x + 1 + R() * (r.w - 2), y: r.y + 1 + R() * (r.h - 2) });
    // torch on the upper wall
    const tx = r.x + ri(1, r.w - 2); if (rows[r.y - 1] && rows[r.y - 1][tx] === '#') torches.push([tx, r.y - 1]);
    if (i === 0) return;
    if (i === rooms.length - 1) {
      if (boss) { spawns.push([floor % 10 === 0 ? 'boss' : 'elite_guard', r.cx, r.cy, 1, 0, lvl + 1, 'floorboss']); total++; }
      objects.push({ t: 'floor_exit', x: r.x + r.w - 1.6, y: r.cy, hidden: true });
      return;
    }
    const n = Math.min(7, 3 + Math.floor(floor / 3) + ri(0, 2));
    const type = pool[ri(0, pool.length - 1)];
    const alt = pool[ri(0, pool.length - 1)];
    const na = Math.ceil(n * 0.6);
    spawns.push([type, r.cx, r.cy, na, Math.min(r.w, r.h) / 2 - 1, lvl]); spawns.push([alt, r.cx, r.cy, n - na, Math.min(r.w, r.h) / 2 - 1, lvl]);
    total += n;
    if (R() < 0.35) objects.push({ t: 'chest', id: 'fc' + i, x: r.x + 1.5, y: r.y + 1.5 });
  });
  // objects must stand on floor and never block the start, the exit or the guardian
  const keep = [start, [last.cx, last.cy], [last.x + last.w - 1.6, last.cy]];
  const objs = objects.filter(o => free(o.x, o.y) && (o.t === 'floor_exit' || o.t === 'chest' || keep.every(([kx, ky]) => Math.hypot(o.x - kx, o.y - ky) > 2.4)));
  return {
    name: `${B.name} · этаж ${floor}`, floorN: floor, biome: B.id, dungeon: true, w: W, h: H, rows, objects: objs, torches, spawns, total,
    rooms: Object.fromEntries(rooms.map((r, i) => ['r' + i, [r.x, r.y, r.w, r.h]])), start, boss, level: lvl, story: [],
  };
}
