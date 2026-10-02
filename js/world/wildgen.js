// Генератор «похода»: открытое поле 52×52 с лагерями мобов, сундуками, захваченным фортом и порталом вглубь.
// Детерминирован по (мир, глубина): одно и то же поле при повторном заходе.
// Символы: '.' земля · ',' двор форта · 'x' чаща/скалы · '~' вода · 'D' стена форта.
import { REALMS, WILD_MOBS, moodOf, wildLevel, isWildBoss } from '../data/wild.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const WILD_SIZE = 64;
const FORT = { w: 26, h: 20 };   // масштабный лагерь: стены, башни, ворота, длинный дом, шатры

export function generateWild(realm, depth) {
  const RL = REALMS[realm], mood = moodOf(realm, depth), boss = isWildBoss(depth);
  for (let attempt = 0; attempt < 6; attempt++) {
    const J = build(RL, mood, depth, boss, attempt);
    if (J) return J;
  }
  return build(RL, mood, depth, boss, 99, true);
}

function build(RL, mood, depth, boss, attempt, force) {
  const W = WILD_SIZE, H = WILD_SIZE, realm = RL.id;
  const R = rng((realm === 'fjord' ? 7001 : 3003) + depth * 7919 + attempt * 104729);
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) ? 'x' : '.'));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 'x' : g[y][x];
  // рваный край
  for (let i = 0; i < 160; i++) { const side = ri(0, 3), d = ri(0, 2), t = ri(3, W - 4); if (side === 0) set(t, 3 + d, 'x'); else if (side === 1) set(t, H - 4 - d, 'x'); else if (side === 2) set(3 + d, t, 'x'); else set(W - 4 - d, t, 'x'); }

  const start = [7.5, H - 9.5], exit = [W - 9.5, 8.5];
  const fx0 = Math.floor(W / 2 - FORT.w / 2) + ri(-2, 3), fy0 = 10 + ri(-1, 2);
  const fort = { x: fx0, y: fy0, w: FORT.w, h: FORT.h };
  const gate = { x: fx0 + Math.floor(FORT.w / 2), y: fy0 + FORT.h - 1 };   // центр проёма (3 клетки) в южной стене
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const inFort = (x, y, m = 0) => x >= fort.x - m && x < fort.x + fort.w + m && y >= fort.y - m && y < fort.y + fort.h + m;
  const reserved = (x, y, m = 0) => dist(x, y, start[0], start[1]) < 7 + m || dist(x, y, exit[0], exit[1]) < 4.5 + m || inFort(x, y, 3 + m);

  // озёра / заливы
  const nLakes = Math.round(0.6 + mood.lake * 7 + R() * 1.4);   // водоёмов мало: обходить их по всему полю — мучение
  for (let k = 0; k < nLakes; k++) {
    const r = 2 + R() * (realm === 'fjord' ? 4 : 2.2), cx = ri(6, W - 7), cy = ri(6, H - 7);
    if (reserved(cx, cy, r)) continue;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r * 1.3 - 1); x <= cx + r * 1.3 + 1; x++) {
      const dx = (x - cx) / 1.3, dy = y - cy; if (dx * dx + dy * dy < r * r * (0.75 + R() * 0.4) && at(x, y) === '.' && !reserved(x, y)) set(x, y, '~');
    }
  }
  // заросли и скалы
  const nBlobs = ri(10, 15) + Math.floor(depth / 2);
  for (let k = 0; k < nBlobs; k++) {
    const r = 1 + R() * 2, cx = ri(5, W - 6), cy = ri(5, H - 6);
    if (reserved(cx, cy, r)) continue;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      if (dist(x, y, cx, cy) < r * (0.7 + R() * 0.5) && at(x, y) === '.' && !reserved(x, y)) set(x, y, 'x');
    }
  }
  // форт: стены 'D', двор ',', ворота на юге
  for (let y = fort.y; y < fort.y + fort.h; y++) for (let x = fort.x; x < fort.x + fort.w; x++) {
    const wall = x === fort.x || y === fort.y || x === fort.x + fort.w - 1 || y === fort.y + fort.h - 1;
    const isGate = y === fort.y + fort.h - 1 && Math.abs(x - gate.x) <= 1;
    set(x, y, isGate ? ',' : wall ? 'D' : ',');
  }
  for (let y = fort.y + fort.h; y < fort.y + fort.h + 3; y++) for (let x = gate.x - 1; x <= gate.x + 1; x++) set(x, y, ',');   // тропа у ворот
  // стартовая поляна и портал вглубь расчищены
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (dist(x + 0.5, y + 0.5, start[0], start[1]) < 4.5 || dist(x + 0.5, y + 0.5, exit[0], exit[1]) < 3.5) set(x, y, '.');

  // связность: старт → ворота форта и портал вглубь; иначе прорубаем просеку
  const reach = () => { const seen = new Uint8Array(W * H), q = [[Math.floor(start[0]), Math.floor(start[1])]]; seen[q[0][1] * W + q[0][0]] = 1; for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, c = at(X, Y); if (c === 'x' || c === '~' || c === 'D' || seen[Y * W + X]) continue; seen[Y * W + X] = 1; q.push([X, Y]); } } return seen; };
  const carve = (ax, ay, bx, by) => { const n = Math.ceil(dist(ax, ay, bx, by) * 2); for (let i = 0; i <= n; i++) { const x = Math.floor(ax + (bx - ax) * i / n), y = Math.floor(ay + (by - ay) * i / n); for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) { const c = at(x + dx, y + dy); if ((c === 'x' && x + dx > 2 && y + dy > 2 && x + dx < W - 3 && y + dy < H - 3) || c === '~') set(x + dx, y + dy, '.'); } } };
  let seen = reach(); const tgts = [[gate.x, gate.y + 2], [Math.floor(exit[0]), Math.floor(exit[1])]];
  for (const [tx, ty] of tgts) if (!seen[ty * W + tx]) { carve(start[0], start[1], tx + 0.5, ty + 0.5); seen = reach(); }
  if (!force && tgts.some(([tx, ty]) => !seen[ty * W + tx])) return null;
  const free = (x, y, m = 0) => { for (let dy = -m; dy <= m; dy++) for (let dx = -m; dx <= m; dx++) { const c = at(Math.floor(x) + dx, Math.floor(y) + dy); if (c !== '.' && !(c === ',' && inFort(x, y))) return false; } return seen[Math.floor(y) * W + Math.floor(x)] === 1; };

  const rows = g.map(r => r.join(''));
  const objects = [], spawns = [], lvl = wildLevel(realm, depth);
  const placed = [];   // занятые точки декора/камп
  const near = (x, y, r) => placed.some(p => dist(p[0], p[1], x, y) < r);
  const pick = (test, tries = 60) => { for (let i = 0; i < tries; i++) { const x = 4 + R() * (W - 8), y = 4 + R() * (H - 8); if (test(x, y)) return [x, y]; } return null; };

  // --- порталы
  objects.push({ t: 'wild_home', x: start[0] - 1.5, y: start[1] + 0.5 });
  objects.push({ t: 'wild_next', x: exit[0], y: exit[1], hidden: true });

  // --- форт: башни, знамёна, жаровни, добыча
  for (const [x, y] of [[fort.x + 0.5, fort.y + 0.5], [fort.x + fort.w - 0.5, fort.y + 0.5], [fort.x + 0.5, fort.y + fort.h - 0.5], [fort.x + fort.w - 0.5, fort.y + fort.h - 0.5], [fort.x + fort.w / 2 + 0.5, fort.y + 0.5], [fort.x + 0.5, fort.y + fort.h / 2], [fort.x + fort.w - 0.5, fort.y + fort.h / 2]]) objects.push({ t: 'fort_tower', x, y });
  objects.push({ t: 'fort_gate', x: gate.x + 0.5, y: fort.y + fort.h - 0.5, rot: 0 });
  for (const dx of [-3, 3]) objects.push({ t: 'banner', x: gate.x + 0.5 + dx, y: fort.y + fort.h - 0.8 });
  const cxF = fort.x + fort.w / 2, cyF = fort.y + fort.h / 2;
  // длинный дом вождя у северной стены, шатры и склады по сторонам, костры
  objects.push({ t: 'fort_hall', x: cxF, y: fort.y + 5.2 });
  for (const [dx, dy] of [[-8, 4.5], [8, 4.5], [-8, 11.5], [8, 11.5]]) objects.push({ t: 'tent', x: cxF + dx, y: fort.y + dy, rot: R() * 6.28 });
  for (const [x, y] of [[fort.x + 2.5, fort.y + 2.5], [fort.x + fort.w - 2.5, fort.y + 2.5], [cxF - 4, fort.y + 9.5], [cxF + 4, fort.y + 9.5], [cxF, fort.y + fort.h - 3.5], [cxF - 6, fort.y + fort.h - 3.5], [cxF + 6, fort.y + fort.h - 3.5]]) objects.push({ t: 'brazier', x, y });
  const dec = realm === 'fjord' ? ['barrel', 'crate', 'weapon_rack', 'bones', 'skulls'] : ['hay', 'crate', 'barrel', 'weapon_rack', 'bones'];
  for (let i = 0; i < 14; i++) objects.push({ t: dec[i % dec.length], x: fort.x + 2 + R() * (fort.w - 4), y: fort.y + 8 + R() * (fort.h - 12) });
  objects.push({ t: 'wchest', id: 'wfort_rich', rich: true, x: cxF, y: fort.y + 7.7 });
  objects.push({ t: 'wchest', id: 'wfort_2', x: fort.x + 3, y: fort.y + fort.h - 3 });
  objects.push({ t: 'wchest', id: 'wfort_3', x: fort.x + fort.w - 3, y: fort.y + fort.h - 3 });
  if (boss) objects.push({ t: 'statue', x: cxF - 5, y: fort.y + 8 }, { t: 'statue', x: cxF + 5, y: fort.y + 8 });
  // стража и командир
  const avail = RL.pool.filter(([, d]) => d <= depth).map(([t]) => t).filter(t => WILD_MOBS[t].ai !== 'giant');
  const nGuards = Math.min(12, 6 + Math.floor(depth / 3)) + (boss ? 2 : 0);   // ~10 в форте, а не толпа
  const gA = avail[ri(0, avail.length - 1)], gB = avail[ri(0, avail.length - 1)];
  spawns.push([gA, cxF, cyF + 3, Math.ceil(nGuards * 0.6), 5, lvl, 'fortguard']);
  spawns.push([gB, cxF, cyF + 3, Math.floor(nGuards * 0.4), 5, lvl, 'fortguard']);
  spawns.push([boss ? RL.boss : RL.commander, cxF, fort.y + 8.9, 1, 0, lvl + (boss ? 2 : 1), boss ? 'wildboss' : 'wildkeep']);
  placed.push([cxF, cyF, 16]);

  // --- лагеря мобов
  const nCamps = Math.min(8, 3 + Math.floor((depth + 1) / 2));   // на всё поле ~8–10 мобов: бой по одному-двое
  const bigPool = RL.pool.filter(([, d]) => d <= depth).map(([t]) => t);
  let camps = 0;
  for (let i = 0; i < nCamps * 4 && camps < nCamps; i++) {
    const p = pick((x, y) => !inFort(x, y, 4) && dist(x, y, start[0], start[1]) > 11 && dist(x, y, exit[0], exit[1]) > 5 && !near(x, y, 8) && free(x, y, 1));
    if (!p) continue; camps++; placed.push([p[0], p[1], 8]);
    const t = bigPool[ri(0, bigPool.length - 1)], MT = WILD_MOBS[t];
    const n = MT.ai === 'giant' ? 1 : Math.min(3, ri(1, 2) + (depth >= 6 ? 1 : 0));
    spawns.push([t, p[0], p[1], n, 2.2, lvl]);
    if (MT.ai !== 'giant' && depth >= 4 && R() < 0.3) { const t2 = bigPool[ri(0, bigPool.length - 1)]; if (WILD_MOBS[t2].ai !== 'giant') spawns.push([t2, p[0], p[1], 1, 2.5, lvl]); }
    // лагерная обстановка и сундук
    objects.push({ t: realm === 'fjord' ? 'brazier' : 'rocks', x: p[0] + 1.6, y: p[1] - 1.2 });
    for (let k = 0; k < 2; k++) objects.push({ t: ['bones', 'skulls', 'crate', 'barrel'][ri(0, 3)], x: p[0] - 1.5 + R() * 3, y: p[1] + 1.5 + R() * 1.5 });
    if (R() < 0.35) objects.push({ t: 'wchest', id: 'wc' + camps, x: p[0] - 2.2, y: p[1] - 0.6 });
  }
  // отдельные сундуки и тайники в стороне от боёв
  const nChest = 3 + Math.floor(depth / 3);
  for (let i = 0; i < nChest; i++) { const p = pick((x, y) => !inFort(x, y, 2) && dist(x, y, start[0], start[1]) > 6 && free(x, y, 1) && !near(x, y, 2.5)); if (p) { placed.push([p[0], p[1], 2.5]); objects.push({ t: 'wchest', id: 'ws' + i, x: p[0], y: p[1] }); } }
  for (let i = 0; i < 9; i++) { const p = pick((x, y) => !inFort(x, y, 1) && dist(x, y, start[0], start[1]) > 4 && free(x, y, 0) && !near(x, y, 1.6)); if (p) { placed.push([p[0], p[1], 1.6]); objects.push({ t: 'stash', id: 'wt' + i, x: p[0], y: p[1], kind: i % 2 ? 'crate' : 'barrel' }); } }

  // схроны: безопасный вынос ноши посреди поля (1, с глубины 3 — два)
  for (let i = 0; i < (depth >= 3 ? 2 : 1); i++) {
    const lo = i ? 24 : 12, hi = i ? 46 : 26;
    const p = pick((x, y) => !inFort(x, y, 3) && dist(x, y, start[0], start[1]) > lo && dist(x, y, start[0], start[1]) < hi && free(x, y, 1) && !near(x, y, 3.5), 120) || pick((x, y) => !inFort(x, y, 2) && dist(x, y, start[0], start[1]) > 8 && free(x, y, 1) && !near(x, y, 2), 200);
    if (p) { placed.push([p[0], p[1], 3.5]); objects.push({ t: 'cache', id: 'cc' + i, x: p[0], y: p[1] }); }
  }

  // --- природа: деревья/скалы/кристаллы (с коллайдерами), без разметки на пути
  const flora = realm === 'fjord'
    ? (depth >= 5 ? ['rocks', 'stalagmite', 'crystals', 'tree_0'] : ['tree_1', 'stalagmite', 'tree_0', 'deadtree', 'tree_1', 'rocks'])
    : (mood.dark ? ['tree_0', 'tree_1', 'deadtree', 'mushrooms', 'rocks', 'tree_0'] : ['tree_0', 'tree_1', 'tree_0', 'tree_1', 'rocks', 'deadtree']);
  const nFlora = 110 + Math.floor(depth * 8) + (realm === 'forest' ? 40 : 0);
  for (let i = 0; i < nFlora; i++) { const p = pick((x, y) => !inFort(x, y, 1) && dist(x, y, start[0], start[1]) > 3 && dist(x, y, exit[0], exit[1]) > 3 && free(x, y, 0) && !near(x, y, 1.1)); if (p) { placed.push([p[0], p[1], 1.1]); objects.push({ t: flora[ri(0, flora.length - 1)], x: p[0], y: p[1] }); } }
  for (let i = 0; i < 8; i++) { const p = pick((x, y) => free(x, y, 0)); if (p) objects.push({ t: realm === 'fjord' ? 'skulls' : 'bones', x: p[0], y: p[1], deco: 1 }); }
  // жаровни у выхода и старта
  objects.push({ t: 'brazier', x: start[0] + 1.5, y: start[1] - 1.5 }, { t: 'brazier', x: exit[0] - 2.2, y: exit[1] + 1.6 });

  const total = spawns.reduce((a, s) => a + s[3], 0);
  return {
    name: `${RL.name} · глубина ${depth} · ${mood.name}`, floorN: (realm === 'fjord' ? 1200 : 1100) + depth, wild: { realm, depth, mood: moodOf(realm, depth), boss, fort, gate },
    w: W, h: H, rows, objects, torches: [], spawns, total, rooms: {}, start, boss, level: lvl, story: [],
  };
}
