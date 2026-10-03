// Генератор «похода»: открытое поле 52×52 с лагерями мобов, сундуками, захваченным фортом и порталом вглубь.
// Детерминирован по (мир, глубина): одно и то же поле при повторном заходе.
// Символы: '.' земля · ',' двор форта · 'x' чаща/скалы · '~' вода · 'D' стена форта.
import { REALMS, WILD_MOBS, moodOf, wildLevel, isWildBoss, isWildFort, fieldVariant, locationName } from '../data/wild.js';
// старт и выход по вариантам поля (0–4 — открытые поля, 5 — форт): каждое поле идёт в другую сторону
const ROUTES = [{ s: [7.5, 54.5], e: [54.5, 9.5] }, { s: [32.5, 56.5], e: [32.5, 8.0] }, { s: [7.5, 33.0], e: [56.0, 31.0] }, { s: [8.5, 8.5], e: [55.0, 55.0] }, { s: [56.0, 30.0], e: [8.0, 33.0] }, { s: [7.5, 54.5], e: [54.5, 8.5] }];

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const WILD_SIZE = 64;
const FORT = { w: 26, h: 20 };
// Костяные пустоши: скелеты великанов — «следы» коллайдеров [x0, y0, x1, y1] в осях модели (без поворота) и радиус, который они занимают
const GIANT_FOOT = {
  giant_skull: { r: 3.4, boxes: [[-2.0, -1.8, 2.0, 1.9]] },
  giant_ribs: { r: 5.0, boxes: [[-4.3, -2.0, 4.3, 2.0]] },
  giant_spine: { r: 4.6, boxes: [[-4.0, -0.7, 4.0, 0.7]] },
  tusk_arch: { r: 3.4, boxes: [[-2.6, -0.5, -1.6, 0.5], [1.6, -0.5, 2.6, 0.5]] },
  giant_fallen: { r: 4.4, boxes: [[-3.2, -1.4, 1.2, 1.2], [1.2, -0.3, 3.0, 2.0]] },
};
// какие скелеты чаще на каком поле (варианты 0–5): степь, долина черепов, балки, хребет великана, курганы, руины
const GIANTS_BY_VARIANT = [['giant_skull', 'tusk_arch', 'giant_ribs'], ['giant_skull', 'giant_skull', 'giant_fallen'], ['tusk_arch', 'giant_spine', 'giant_skull'], ['giant_ribs', 'giant_spine', 'giant_fallen'], ['giant_fallen', 'giant_skull', 'giant_ribs'], ['giant_ribs', 'giant_skull']];   // масштабный лагерь: стены, башни, ворота, длинный дом, шатры

export function generateWild(realm, depth) {
  const RL = REALMS[realm], mood = moodOf(realm, depth), boss = isWildBoss(depth);   // boss: форт с боссом поля
  for (let attempt = 0; attempt < 6; attempt++) {
    const J = build(RL, mood, depth, boss, attempt);
    if (J) return J;
  }
  return build(RL, mood, depth, boss, 99, true);
}

function build(RL, mood, depth, boss, attempt, force) {
  const W = WILD_SIZE, H = WILD_SIZE, realm = RL.id, isFort = isWildFort(depth), variant = fieldVariant(depth);
  const bn = realm === 'bones', R = rng((realm === 'fjord' ? 7001 : bn ? 5005 : 3003) + depth * 7919 + attempt * 104729);
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) ? 'x' : '.'));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 'x' : g[y][x];
  // рваный край
  for (let i = 0; i < 160; i++) { const side = ri(0, 3), d = ri(0, 2), t = ri(3, W - 4); if (side === 0) set(t, 3 + d, 'x'); else if (side === 1) set(t, H - 4 - d, 'x'); else if (side === 2) set(3 + d, t, 'x'); else set(W - 4 - d, t, 'x'); }

  const start = ROUTES[variant].s, exit = ROUTES[variant].e;
  const fx0 = Math.floor(W / 2 - FORT.w / 2) + ri(-2, 3), fy0 = 10 + ri(-1, 2);
  const fort = isFort ? { x: fx0, y: fy0, w: FORT.w, h: FORT.h } : { x: -99, y: -99, w: 0, h: 0 };   // на открытых полях форта нет
  const gate = { x: fx0 + Math.floor(FORT.w / 2), y: fy0 + FORT.h - 1 };   // центр проёма (3 клетки) в южной стене
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const inFort = (x, y, m = 0) => x >= fort.x - m && x < fort.x + fort.w + m && y >= fort.y - m && y < fort.y + fort.h + m;
  const reserved = (x, y, m = 0) => dist(x, y, start[0], start[1]) < 7 + m || dist(x, y, exit[0], exit[1]) < 4.5 + m || inFort(x, y, 3 + m);

  // озёра / заливы
  const LK = [0.7, 0.4, 2.2, 0.3, 0.6][variant] ?? 1;   // водоёмов по вариантам: ручьи — больше, бор — почти нет
  const nLakes = bn ? (R() < 0.3 ? 1 : 0) : Math.round((0.6 + mood.lake * 7 + R() * 1.4) * LK);   // в пустошах — редкий оазис   // водоёмов мало: обходить их по всему полю — мучение
  for (let k = 0; k < nLakes; k++) {
    const r = (bn ? 1.6 : 2) + R() * (realm === 'fjord' ? 4 : bn ? 1.2 : 2.2), cx = ri(6, W - 7), cy = ri(6, H - 7);
    if (reserved(cx, cy, r)) continue;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r * 1.3 - 1); x <= cx + r * 1.3 + 1; x++) {
      const dx = (x - cx) / 1.3, dy = y - cy; if (dx * dx + dy * dy < r * r * (0.75 + R() * 0.4) && at(x, y) === '.' && !reserved(x, y)) set(x, y, '~');
    }
  }
  // заросли и скалы
  const nBlobs = Math.round((ri(10, 15) + Math.floor(depth / 2)) * [0.8, 1.2, 0.9, 1.7, 1.1, 1][variant]);
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
  let seen = reach(); const tgts = isFort ? [[gate.x, gate.y + 2], [Math.floor(exit[0]), Math.floor(exit[1])]] : [[Math.floor(exit[0]), Math.floor(exit[1])]];
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
  objects.push({ t: 'wild_next', x: exit[0], y: exit[1], hidden: isFort });   // на открытых полях портал «Вглубь» виден сразу, у форта — после его падения

  let cxF = 0, cyF = 0;
  if (isFort) {
    // --- форт: башни, знамёна, жаровни, добыча
    for (const [x, y] of [[fort.x + 0.5, fort.y + 0.5], [fort.x + fort.w - 0.5, fort.y + 0.5], [fort.x + 0.5, fort.y + fort.h - 0.5], [fort.x + fort.w - 0.5, fort.y + fort.h - 0.5], [fort.x + fort.w / 2 + 0.5, fort.y + 0.5], [fort.x + 0.5, fort.y + fort.h / 2], [fort.x + fort.w - 0.5, fort.y + fort.h / 2]]) objects.push({ t: 'fort_tower', x, y });
    objects.push({ t: 'fort_gate', x: gate.x + 0.5, y: fort.y + fort.h - 0.5, rot: 0 }, { t: 'fort_door', x: gate.x + 0.5, y: fort.y + fort.h - 0.5 });
    for (const dx of [-3, 3]) objects.push({ t: 'banner', x: gate.x + 0.5 + dx, y: fort.y + fort.h - 0.8 });
    cxF = fort.x + fort.w / 2; cyF = fort.y + fort.h / 2;
    // длинный дом вождя у северной стены, шатры и склады по сторонам, костры
    objects.push({ t: 'fort_hall', x: cxF, y: fort.y + 5.2 });
    for (const [dx, dy] of [[-8, 4.5], [8, 4.5], [-8, 11.5], [8, 11.5]]) objects.push({ t: 'tent', x: cxF + dx, y: fort.y + dy, rot: R() * 6.28 });
    for (const [x, y] of [[fort.x + 2.5, fort.y + 2.5], [fort.x + fort.w - 2.5, fort.y + 2.5], [cxF - 4, fort.y + 9.5], [cxF + 4, fort.y + 9.5], [cxF, fort.y + fort.h - 3.5], [cxF - 6, fort.y + fort.h - 3.5], [cxF + 6, fort.y + fort.h - 3.5]]) objects.push({ t: 'brazier', x, y });
    const dec = realm === 'fjord' ? ['barrel', 'crate', 'weapon_rack', 'bones', 'skulls'] : bn ? ['hide_rack', 'skulls', 'crate', 'weapon_rack', 'bones'] : ['hay', 'crate', 'barrel', 'weapon_rack', 'bones'];
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

  }

  // --- Костяные пустоши: скелеты великанов-ориентиры (1–3 на поле), коллайдеры по следу модели с учётом поворота
  if (bn) {
    const list = GIANTS_BY_VARIANT[variant], nG = isFort ? 1 : 2 + (R() < 0.5 ? 1 : 0);
    const boxesAt = (t, x, y, rot) => GIANT_FOOT[t].boxes.map(([x0, y0, x1, y1]) => { const c = Math.cos(rot), s = Math.sin(rot), P = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([lx, lz]) => [x + lx * c + lz * s, y - lx * s + lz * c]); return [Math.min(...P.map(p => p[0])), Math.min(...P.map(p => p[1])), Math.max(...P.map(p => p[0])), Math.max(...P.map(p => p[1]))]; });
    const boxFree = b => { for (let ty = Math.floor(b[1]) - 1; ty <= Math.floor(b[3]) + 1; ty++) for (let tx = Math.floor(b[0]) - 1; tx <= Math.floor(b[2]) + 1; tx++) { if (at(tx, ty) !== '.' || inFort(tx, ty, 2)) return false; } return true; };
    for (let k = 0, got = 0; k < 80 && got < nG; k++) {
      const t = list[(got + k) % list.length], F = GIANT_FOOT[t], rot = R() < 0.5 ? 0 : Math.PI / 2;
      const p = pick((x, y) => dist(x, y, start[0], start[1]) > 9 + F.r && dist(x, y, exit[0], exit[1]) > 5 + F.r && !near(x, y, F.r + 3) && free(x, y, 1));
      if (!p) continue; const boxes = boxesAt(t, p[0], p[1], rot); if (!boxes.every(boxFree)) continue;
      got++; placed.push([p[0], p[1], F.r + 1]); objects.push({ t, x: p[0], y: p[1], rot, boxes });
      for (let j = 0; j < 4; j++) { const a = R() * 6.28, d = F.r + 0.6 + R() * 1.5; objects.push({ t: j % 2 ? 'skulls' : 'bones', x: p[0] + Math.cos(a) * d, y: p[1] + Math.sin(a) * d, deco: 1 }); }   // кости вокруг
    }
  }

  // --- лагеря мобов
  const nCamps = isFort ? Math.min(8, 4 + Math.floor((depth + 1) / 3)) : Math.min(11, 6 + Math.floor((depth + 1) / 3));   // у форта — лагеря вокруг (их надо перебить, чтобы открылись ворота); на открытых полях — главное содержание   // на всё поле ~8–10 мобов: бой по одному-двое
  const bigPool = RL.pool.filter(([, d]) => d <= depth).map(([t]) => t);
  let camps = 0;
  for (let i = 0; i < nCamps * 8 && camps < nCamps; i++) {
    const p = pick((x, y) => !inFort(x, y, 4) && dist(x, y, start[0], start[1]) > 11 && dist(x, y, exit[0], exit[1]) > 5 && !near(x, y, isFort ? 8 : 6.5) && free(x, y, 1));
    if (!p) continue; camps++; placed.push([p[0], p[1], isFort ? 8 : 6.5]);
    const t = bigPool[ri(0, bigPool.length - 1)], MT = WILD_MOBS[t];
    const n = MT.ai === 'giant' ? 1 : Math.min(4, ri(isFort ? 1 : 2, isFort ? 2 : 3) + (depth >= 6 ? 1 : 0));
    spawns.push([t, p[0], p[1], n, 2.2, lvl]);
    if (MT.ai !== 'giant' && depth >= 4 && R() < 0.3) { const t2 = bigPool[ri(0, bigPool.length - 1)]; if (WILD_MOBS[t2].ai !== 'giant') spawns.push([t2, p[0], p[1], 1, 2.5, lvl]); }
    // лагерная обстановка и сундук
    objects.push({ t: realm === 'fjord' ? 'brazier' : bn ? 'bonfire' : 'rocks', x: p[0] + 1.6, y: p[1] - 1.2 });
    if (bn) {   // стоянка дикарей: хижина из шкур на рёбрах, тотем или знамя, рама со шкурой
      const hx = p[0] - 3.2 + R() * 1.2, hy = p[1] - 2.6 + R() * 0.8; if (free(hx, hy, 2) && !near(hx, hy, 2.5)) { objects.push({ t: 'bone_hut', x: hx, y: hy, rot: R() < 0.5 ? 0 : Math.PI / 2, s: 1.2 }); placed.push([hx, hy, 2.6]); }
      objects.push({ t: R() < 0.55 ? 'bone_totem' : 'war_banner', x: p[0] + 2.6, y: p[1] + 0.4 });
      if (R() < 0.6) objects.push({ t: 'hide_rack', x: p[0] - 0.6, y: p[1] + 2.6, rot: R() < 0.5 ? 0 : Math.PI / 2 });
    }
    for (let k = 0; k < 2; k++) objects.push({ t: (bn ? ['bones', 'skulls', 'skulls', 'crate'] : ['bones', 'skulls', 'crate', 'barrel'])[ri(0, 3)], x: p[0] - 1.5 + R() * 3, y: p[1] + 1.5 + R() * 1.5 });
    if (realm === 'forest') { const t3 = ['cart_load', 'barrel_stack', 'log_stack', 'plank_pile', 'cart'][ri(0, 4)]; objects.push({ t: t3, x: p[0] + 2.4, y: p[1] + 1.8, rot: R() * 6.28 }); }   // лагерь разбойников: награбленное (набор POLYGON Adventure)
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
  // по вариантам поля — своя растительность: роща, ручьи и камни, бор, бурелом (деревья и камни стоят не ближе ~2,4 м друг к другу)
  const flora = {
    forest: [['tree_0', 'tree_0', 'tree_1', 'tree_0', 'rocks', 'tree_1'], ['tree_0', 'tree_0', 'tree_0', 'tree_1', 'tree_0', 'rocks'], ['rocks', 'tree_0', 'rocks', 'tree_1', 'rocks', 'tree_0'], ['tree_1', 'tree_1', 'tree_0', 'tree_1', 'tree_1', 'deadtree'], ['deadtree', 'tree_0', 'deadtree', 'rocks', 'tree_1', 'deadtree'], mood.dark ? ['tree_0', 'tree_1', 'deadtree', 'mushrooms', 'rocks', 'tree_0'] : ['tree_0', 'tree_1', 'tree_0', 'tree_1', 'rocks', 'deadtree']],
    bones: [['tree_acacia', 'rocks', 'tree_acacia_b', 'rock_spire', 'rocks', 'agave'], ['rocks', 'rock_spire', 'tree_acacia', 'rock_tooth', 'rocks', 'tree_acacia_c'], ['tree_acacia', 'tree_acacia_b', 'tree_acacia_c', 'rocks', 'agave', 'deadtree'], ['rock_spire', 'rock_spire_b', 'rock_tooth', 'rocks', 'rock_mesa', 'tree_acacia'], ['rocks', 'deadtree', 'rock_tooth', 'tree_acacia_b', 'rocks', 'agave'], ['rocks', 'rock_spire', 'tree_acacia', 'deadtree', 'rock_tooth']],
    fjord: [['tree_1', 'tree_1', 'rocks', 'tree_0', 'tree_1', 'rocks'], ['rocks', 'stalagmite', 'rocks', 'tree_1', 'rocks', 'crystals'], ['rocks', 'tree_1', 'stalagmite', 'rocks', 'rocks', 'deadtree'], ['tree_1', 'rocks', 'tree_1', 'rocks', 'tree_0', 'tree_1'], ['stalagmite', 'rocks', 'rocks', 'crystals', 'deadtree', 'stalagmite'], depth >= 5 ? ['rocks', 'stalagmite', 'crystals', 'tree_0'] : ['tree_1', 'stalagmite', 'tree_0', 'deadtree', 'tree_1', 'rocks']],
  }[realm][variant];
  const nFlora = Math.round((realm === 'forest' ? 125 : bn ? 66 : 110) * [0.8, 1.1, 1, 1.5, 0.9, 1][variant]) + Math.floor(depth * 4);
  let nF = 0;
  for (let i = 0; i < nFlora * 2; i++) {
    const p = pick((x, y) => !inFort(x, y, 1) && dist(x, y, start[0], start[1]) > 3 && dist(x, y, exit[0], exit[1]) > 3 && free(x, y, 0) && !near(x, y, 2.4));
    if (p) { const t = flora[ri(0, flora.length - 1)]; if (t === 'rock_mesa' && !free(p[0], p[1], 2)) continue; placed.push([p[0], p[1], t === 'rock_mesa' ? 3.6 : 2.4]); objects.push({ t, x: p[0], y: p[1] }); if (++nF >= nFlora) break; }
  }
  for (let i = 0; i < (bn ? 16 : 8); i++) { const p = pick((x, y) => free(x, y, 0)); if (p) objects.push({ t: realm === 'fjord' ? 'skulls' : bn && i % 3 === 0 ? 'skulls' : 'bones', x: p[0], y: p[1], deco: 1 }); }
  // указатель у входа и брошенный скарб по полю (в Старом Лесу — телеги, поленницы, бочки)
  objects.push(bn ? { t: 'war_banner', x: start[0] + 2.6, y: start[1] + 1.2 } : { t: 'signpost', x: start[0] + 2.6, y: start[1] + 1.2, rot: R() * 6.28 });
  if (realm === 'forest') for (let i = 0; i < 3; i++) { const p = pick((x, y) => !inFort(x, y, 2) && dist(x, y, start[0], start[1]) > 8 && free(x, y, 1) && !near(x, y, 3)); if (p) { placed.push([p[0], p[1], 3]); objects.push({ t: ['cart', 'log_stack', 'barrel_stack'][i], x: p[0], y: p[1], rot: R() * 6.28 }); } }
  // жаровни у выхода и старта
  objects.push({ t: bn ? 'bonfire' : 'brazier', x: start[0] + 1.5, y: start[1] - 1.5 }, { t: bn ? 'bonfire' : 'brazier', x: exit[0] - 2.2, y: exit[1] + 1.6 });

  const total = spawns.reduce((a, s) => a + s[3], 0);
  return {
    name: `${RL.name} · ${locationName(realm, depth)} · глубина ${depth}`, floorN: (realm === 'fjord' ? 1200 : bn ? 1300 : 1100) + depth, wild: { realm, depth, mood: moodOf(realm, depth), boss, fort: isFort ? fort : null, gate: isFort ? gate : null, kind: isFort ? 'fort' : 'field', variant, locName: locationName(realm, depth) },
    w: W, h: H, rows, objects, torches: [], spawns, total, rooms: {}, start, boss, level: lvl, story: [],
  };
}
