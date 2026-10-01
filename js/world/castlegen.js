// «Цитадель Ордена» — the player's own castle: a hall with a portal and four rooms behind gates.
import { SOCKETS } from '../data/upgrades.js';
export function generateCastle(opened) {
  const W = 40, H = 32, g = Array.from({ length: H }, () => Array(W).fill('#'));
  const carve = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[y][x] = '.'; };
  carve(12, 18, 10, 10);            // hall
  carve(16, 14, 2, 4);              // corridor north
  carve(5, 14, 24, 2);              // gallery
  carve(2, 18, 8, 9);               // west: altar
  carve(24, 18, 8, 9);              // east: trial
  carve(3, 4, 10, 9);               // north-west: treasury
  carve(21, 4, 10, 9);              // north-east: trophy
  const gates = { altar: [10, 22], trial: [23, 22], treasury: [8, 13], trophy: [25, 13] };
  for (const [id, [x, y]] of Object.entries(gates)) { g[y][x] = opened[id] ? '.' : 'D'; if (id === 'altar' || id === 'trial') { g[y][x - (id === 'altar' ? 0 : 0)] = opened[id] ? '.' : 'D'; g[y][id === 'altar' ? 11 : 22] = '.'; } }
  const rows = g.map(r => r.join(''));
  const o = [];
  o.push({ t: 'castle_portal', x: 17, y: 26 }, { t: 'castle_guide', x: 17, y: 20.6 });
  for (const [x, y] of [[13.5, 19.5], [20.5, 19.5], [13.5, 26.5], [20.5, 26.5]]) o.push({ t: 'pillar', x, y });
  o.push({ t: 'brazier', x: 15, y: 19 }, { t: 'brazier', x: 19, y: 19 });
  for (const [id, [x, y]] of Object.entries(gates)) o.push({ t: 'roomgate', id, x: x + 0.5, y: y + 0.5 });
  // room furniture
  o.push({ t: 'castle_altar', x: 5.5, y: 22.5 }, { t: 'candles', x: 3.5, y: 19.5 }, { t: 'candles', x: 8, y: 25.5 }, { t: 'brazier', x: 3, y: 25 });
  o.push({ t: 'castle_trial', x: 36.3, y: 22.5 }, { t: 'pillar', x: 25.5, y: 16.5 }, { t: 'pillar', x: 36.5, y: 16.5 }, { t: 'pillar', x: 25.5, y: 27.5 }, { t: 'pillar', x: 36.5, y: 27.5 }, { t: 'skulls', x: 34, y: 17.5 }, { t: 'brazier', x: 31, y: 16 }, { t: 'brazier', x: 31, y: 28 });
  o.push({ t: 'castle_treasury', x: 8, y: 7.5 }, { t: 'chest_rich_d', x: 5, y: 5.5 }, { t: 'chest_rich_d', x: 11, y: 5.5 }, { t: 'barrel', x: 4.2, y: 11 }, { t: 'crate', x: 11.5, y: 11 });
  o.push({ t: 'castle_trophy', x: 26, y: 7.5 }, { t: 'sarcophagus_d', x: 23, y: 6 }, { t: 'sarcophagus_d', x: 29, y: 6 }, { t: 'brazier', x: 22.5, y: 11 }, { t: 'brazier', x: 29.5, y: 11 });
  // permanent decor of the hall + sockets for the player's own furnishing
  o.push({ t: 'banner', x: 12.6, y: 18.6 }, { t: 'banner', x: 21.4, y: 18.6 }, { t: 'statue', x: 13.5, y: 16.8 }, { t: 'statue', x: 20.5, y: 16.8 });
  for (const s of SOCKETS) o.push({ t: 'socket', id: s.id, room: s.room, x: s.x, y: s.y });
  return { name: 'Цитадель Ордена', floorN: 777, dungeon: true, castle: true, w: W, h: H, rows, objects: o,
    torches: [[14, 17], [19, 17], [5, 17], [28, 14], [34, 14], [4, 3], [28, 3], [1, 21], [38, 21]], spawns: [], total: 0,
    rooms: { hall: [12, 18, 10, 10], altar: [2, 18, 8, 9], trial: [24, 15, 14, 14], treasury: [3, 4, 10, 9], trophy: [21, 4, 10, 9] },
    start: [17, 24], level: 1, story: [], gates };
}
