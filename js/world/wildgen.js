// Генератор «похода»: острова-поляны над бездной с лагерями мобов, сундуками, захваченным фортом и порталом вглубь.
// Раскладка своя при каждом заходе (сид — третий аргумент generateWild).
// Символы: '.' земля · ',' двор форта · 'x' чаща/скалы · '~' вода · 'D' стена форта · 'v' пропасть · 'h' мост над пропастью · 'b' мост над водой.
import { generateTemple } from './templegen.js';
import { REALMS, WILD_MOBS, moodOf, wildLevel, isWildBoss, isWildFort, fieldVariant, locationName } from '../data/wild.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const WILD_SIZE = 96;   // П55: поле больше (было 64), но это острова над бездной — суши примерно вдвое меньше площади карты
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

export function generateWild(realm, depth, seed) {
  if (seed == null) seed = (Math.random() * 4294967296) >>> 0;   // С34, П37: каждый заход — своя раскладка
  if (realm === 'temple') return generateTemple(depth, seed);   // Разрушенный храм — свой генератор-лабиринт (world/templegen.js)
  const RL = REALMS[realm], mood = moodOf(realm, depth), boss = isWildBoss(depth);   // boss: форт с боссом поля
  for (let attempt = 0; attempt < 12; attempt++) {
    const J = build(RL, mood, depth, boss, seed, attempt);
    if (J) return J;
  }
  return build(RL, mood, depth, boss, seed, 99, true);
}

// П55/П56: поле — не квадрат, а острова над бездной: 4×4 «поляны» на решётке (часть выпадает), между ними —
// перешейки, мосты над пропастью и ручьи с мостиком. Старт на краю, «Вглубь» — в самой дальней поляне по дороге,
// тупики-ответвления с сундуками. Символы: 'v' — пропасть (бездна, непроходима), 'h' — мост над пропастью, 'b' — мост над водой.
const N = 4, CELL = 22, BASE = 15;
function layout(R, ri, W, H, isFort) {
  const g = Array.from({ length: H }, () => Array(W).fill('v'));
  const set = (x, y, c) => { if (x >= 2 && y >= 2 && x < W - 2 && y < H - 2) g[y][x] = c; };
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 'v' : g[y][x];
  const cells = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cells.push({ i, j, x: BASE + CELL * i + (R() - 0.5) * 6, y: BASE + CELL * j + (R() - 0.5) * 6 });
  const cell = (i, j) => i < 0 || j < 0 || i >= N || j >= N ? null : cells[j * N + i];
  const ring = cells.filter(c => c.i === 0 || c.j === 0 || c.i === N - 1 || c.j === N - 1);
  const sc = ring[ri(0, ring.length - 1)];
  // вершины графа: поляна = клетка решётки; у форта — блок 2×2 клеток
  const V = [], vOf = new Map(), key = c => c.j * N + c.i;
  let F = null;
  if (isFort) {
    const blocks = []; for (let bj = 0; bj < N - 1; bj++) for (let bi = 0; bi < N - 1; bi++) { if (sc.i >= bi && sc.i <= bi + 1 && sc.j >= bj && sc.j <= bj + 1) continue; blocks.push({ bi, bj, d: Math.abs(bi + 0.5 - sc.i) + Math.abs(bj + 0.5 - sc.j) }); }
    blocks.sort((a, b) => b.d - a.d); const B = blocks[ri(0, Math.min(2, blocks.length - 1))];
    const cs = [cell(B.bi, B.bj), cell(B.bi + 1, B.bj), cell(B.bi, B.bj + 1), cell(B.bi + 1, B.bj + 1)];
    F = { fort: true, cells: cs, x: cs.reduce((a, c) => a + c.x, 0) / 4, y: cs.reduce((a, c) => a + c.y, 0) / 4 }; V.push(F); for (const c of cs) vOf.set(key(c), F);
  }
  for (const c of cells) if (!vOf.has(key(c))) { const v = { cells: [c], i: c.i, j: c.j, x: c.x, y: c.y, rx: 7.4 + R() * 2.6, ry: 7.4 + R() * 2.6, ph: [R() * 6.3, R() * 6.3, R() * 6.3] }; V.push(v); vOf.set(key(c), v); }
  const S = vOf.get(key(sc));
  const nbs = v => { const out = new Set(); for (const c of v.cells) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = cell(c.i + a, c.j + b); if (!n) continue; const u = vOf.get(key(n)); if (u && u !== v && !u.off) out.add(u); } return [...out]; };
  const connected = (skip) => { const seen = new Set([S]), q = [S]; for (let k = 0; k < q.length; k++) for (const u of nbs(q[k])) if (u !== skip && !seen.has(u)) { seen.add(u); q.push(u); } return seen.size === V.filter(v => !v.off && v !== skip).length; };
  // часть полян выпадает — остаются ветви и тупики
  const drop = ri(2, 4); for (let k = 0, n = 0; k < 30 && n < drop; k++) { const v = V[ri(0, V.length - 1)]; if (v === S || v.fort || v.off) continue; v.off = true; if (connected()) n++; else v.off = false; }
  const live = V.filter(v => !v.off);
  const dist = (from, adj) => { const d = new Map([[from, 0]]), q = [from]; for (let k = 0; k < q.length; k++) for (const u of adj(q[k])) if (!d.has(u)) { d.set(u, d.get(q[k]) + 1); q.push(u); } return d; };
  // выход: у форта — соседняя с фортом поляна, дальняя от старта (и она висит только на форте); на поле — дальний лист дерева
  let E = null;
  if (F) { const d0 = dist(S, nbs); const c = nbs(F).filter(u => u !== S && connected(u)).sort((a, b) => (d0.get(b) || 0) - (d0.get(a) || 0)); E = c[0] || null; if (!E) return null; }
  // остовное дерево (обход в глубину со случайным порядком) + одна петля
  const edges = [], inTree = new Set([S]), stack = [S];
  while (stack.length) {
    const v = stack[stack.length - 1], c = nbs(v).filter(u => !inTree.has(u) && u !== E);
    if (!c.length) { stack.pop(); continue; }
    const u = c[ri(0, c.length - 1)]; inTree.add(u); edges.push([v, u]); stack.push(u);
  }
  if (F) { if (!inTree.has(F)) return null; edges.push([F, E]); }
  const adjE = v => edges.filter(e => e[0] === v || e[1] === v).map(e => e[0] === v ? e[1] : e[0]);
  if (!E) { const d = dist(S, adjE); E = live.filter(v => adjE(v).length === 1 && v !== S).sort((a, b) => d.get(b) - d.get(a))[0]; if (!E) return null; }
  { const d1 = dist(S, adjE).get(E), cand = []; for (const v of live) for (const u of nbs(v)) if (v !== E && u !== E && !v.fort && !u.fort && v.cells[0].j * N + v.cells[0].i < u.cells[0].j * N + u.cells[0].i && !edges.some(e => (e[0] === v && e[1] === u) || (e[0] === u && e[1] === v))) cand.push([v, u]);
    const e = cand[ri(0, Math.max(0, cand.length - 1))]; if (e && R() < 0.7) { edges.push(e); if (dist(S, adjE).get(E) < d1 * 0.75) edges.pop(); } }
  const dS = dist(S, adjE), par = new Map(); { const q = [S]; par.set(S, null); for (let k = 0; k < q.length; k++) for (const u of adjE(q[k])) if (!par.has(u)) { par.set(u, q[k]); q.push(u); } }
  const path = []; for (let v = E; v; v = par.get(v)) path.unshift(v);

  // --- поляны: неровные эллипсы
  const blob = v => {
    const { x: cx, y: cy, rx, ry, ph } = v;
    for (let y = Math.floor(cy - ry - 3); y <= cy + ry + 3; y++) for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, th = Math.atan2(dy, dx), rr = 1 + 0.16 * Math.sin(3 * th + ph[0]) + 0.1 * Math.sin(5 * th + ph[1]) + 0.06 * Math.sin(7 * th + ph[2]);
      if (dx * dx + dy * dy < rr * rr) set(x, y, '.');
    }
  };
  const FW = 26, FH = 20; let fort = null, plat = null;
  for (const v of live) if (!v.fort) blob(v);
  if (F) {
    const fx0 = Math.round(F.x - FW / 2), fy0 = Math.round(F.y - FH / 2) - 1;
    fort = { x: fx0, y: fy0, w: FW, h: FH }; plat = { x0: fx0 - 5, y0: fy0 - 4, x1: fx0 + FW + 5, y1: fy0 + FH + 7 };
    for (let y = plat.y0 - 1; y <= plat.y1 + 1; y++) for (let x = plat.x0 - 1; x <= plat.x1 + 1; x++) { const edge = x < plat.x0 || y < plat.y0 || x > plat.x1 || y > plat.y1; if (!edge || R() < 0.5) set(x, y, '.'); }
  }
  // --- связи между полянами
  const prot = new Uint8Array(W * H), protect = (x, y, r = 0) => { for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) { const X = x + a, Y = y + b; if (X >= 0 && Y >= 0 && X < W && Y < H) prot[Y * W + X] = 1; } };
  const anchor = (v, o) => v.fort ? [Math.max(plat.x0 + 1, Math.min(plat.x1 - 1, o.x)), Math.max(plat.y0 + 1, Math.min(plat.y1 - 1, o.y))] : [v.x, v.y];
  const bridges = [];
  const neck = (a, b, wid) => {   // перешеек по плавной дуге
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, off = (R() - 0.5) * 7, cx = mx - (b[1] - a[1]) / L * off, cy = my + (b[0] - a[0]) / L * off;
    const n = Math.ceil(L * 2); for (let k = 0; k <= n; k++) { const t = k / n, x = (1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * cx + t * t * b[0], y = (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * cy + t * t * b[1], r = wid / 2 + Math.sin(t * 9 + off) * 0.4;
      for (let dy = -Math.ceil(r); dy <= r; dy++) for (let dx = -Math.ceil(r); dx <= r; dx++) if (dx * dx + dy * dy <= r * r) { const X = Math.floor(x + dx), Y = Math.floor(y + dy); if (at(X, Y) === 'v') set(X, Y, '.'); protect(X, Y); } }
  };
  const types = [];
  for (const [A, B] of edges) {
    const pa = anchor(A, B), pb = anchor(B, A), horiz = Math.abs(pb[0] - pa[0]) >= Math.abs(pb[1] - pa[1]);
    const t = A.fort || B.fort ? 'land' : R() < 0.38 ? 'land' : R() < 0.6 ? 'bridge' : 'river'; types.push(t);
    if (t === 'land') { neck(pa, pb, 4.6); continue; }
    // мост над пропастью или ручей: полоса по оси между полянами
    const [u0, u1] = horiz ? [Math.min(pa[0], pb[0]), Math.max(pa[0], pb[0])] : [Math.min(pa[1], pb[1]), Math.max(pa[1], pb[1])];
    const c0 = Math.round((horiz ? pa[1] + pb[1] : pa[0] + pb[0]) / 2) - 1;   // 3 ряда: c0..c0+2
    const T = (u, w) => horiz ? [u, c0 + w] : [c0 + w, u];
    if (t === 'river') {   // широкий перешеек, поперёк — ручей от края до края, посередине — мостик
      const half = 4; for (let u = Math.floor(u0); u <= u1; u++) for (let w = -half + 1; w <= 2 + half; w++) { const [x, y] = T(u, w); if (at(x, y) === 'v') set(x, y, '.'); }
      const mid = Math.round((u0 + u1) / 2), rw = R() < 0.5 ? 2 : 3;
      for (let w = -half - 3; w <= 2 + half + 3; w++) { const wob = w >= -1 && w <= 3 ? 0 : Math.round(Math.sin(w * 0.35 + mid) * 1.2); for (let k = 0; k < rw; k++) { const [x, y] = T(mid + wob + k, w); if (at(x, y) === '.') set(x, y, '~'); } }
      for (let k = -1; k <= rw; k++) for (let w = 0; w <= 2; w++) { const [x, y] = T(mid + k, w); const c = at(x, y); if (c === '~') set(x, y, 'b'); }
      for (let w = 0; w <= 2; w++) for (let u = Math.floor(u0); u <= u1; u++) { const [x, y] = T(u, w); protect(x, y, 1); }
      const [bx, by] = T(mid + (rw - 1) / 2 + 0.5, 1.5); bridges.push({ t: 'bridge', x: horiz ? bx : bx, y: horiz ? by : by, len: rw + 1.6, rot: horiz ? 0 : Math.PI / 2, nocol: 1, opts: { w: 3 } });
      continue;
    }
    // мост: найти разрыв (пропасть во всех трёх рядах), рваные края засыпать землёй
    for (let u = Math.floor(u0); u <= u1; u++) for (let w = -1; w <= 3; w++) { const [x, y] = T(u, w); protect(x, y); }
    const voidAll = u => [0, 1, 2].every(w => at(...T(u, w)) === 'v');
    let s0 = -1, s1 = -1; for (let u = Math.floor(u0); u <= u1; u++) if (voidAll(u)) { if (s0 < 0) s0 = u; s1 = u; }
    if (s0 < 0 || s1 - s0 < 1) { neck(pa, pb, 4.6); types[types.length - 1] = 'land'; continue; }
    for (let u = Math.floor(u0); u <= u1; u++) for (let w = 0; w <= 2; w++) { const [x, y] = T(u, w); if (u < s0 || u > s1) { if (at(x, y) === 'v') set(x, y, '.'); } else set(x, y, 'h'); }
    for (let u = s0; u <= s1; u++) for (const w of [-1, 3]) { const [x, y] = T(u, w); if (at(x, y) !== 'h') set(x, y, 'v'); }   // по бокам моста — пропасть (перила)
    for (const [u, w0] of [[s0 - 1, 0], [s1 + 1, 0]]) for (let w = -1; w <= 3; w++) { const [x, y] = T(u, w0 + w); if (at(x, y) === 'v') set(x, y, '.'); }   // устои моста
    const [bx, by] = T((s0 + s1 + 1) / 2, 1.5); bridges.push({ t: 'bridge', x: bx, y: by, len: s1 - s0 + 2.2, rot: horiz ? 0 : Math.PI / 2, nocol: 1, opts: { w: 3 } });
  }
  return { g, set, at, S, E, F, path, live, edges, adjE, dS, fort, plat, prot, bridges, types };
}

function build(RL, mood, depth, boss, seed, attempt, force) {
  const W = WILD_SIZE, H = WILD_SIZE, realm = RL.id, isFort = isWildFort(depth), variant = fieldVariant(depth);
  const bn = realm === 'bones', R = rng(((realm === 'fjord' ? 7001 : bn ? 5005 : 3003) + depth * 7919 + attempt * 104729) ^ Math.imul(seed >>> 0, 2654435761));
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const L = layout(R, ri, W, H, isFort); if (!L) return null;
  const { g, set, at, S, E, path, live, adjE, prot } = L;
  const start = [Math.floor(S.x) + 0.5, Math.floor(S.y) + 0.5], exit = [Math.floor(E.x) + 0.5, Math.floor(E.y) + 0.5];
  const fort = L.fort || { x: -99, y: -99, w: 0, h: 0 };   // на открытых полях форта нет
  const gate = { x: fort.x + Math.floor(fort.w / 2), y: fort.y + fort.h - 1 };   // центр проёма (3 клетки) в южной стене
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const inFort = (x, y, m = 0) => x >= fort.x - m && x < fort.x + fort.w + m && y >= fort.y - m && y < fort.y + fort.h + m;
  const reserved = (x, y, m = 0) => dist(x, y, start[0], start[1]) < 7 + m || dist(x, y, exit[0], exit[1]) < 4.5 + m || inFort(x, y, 3 + m) || prot[Math.floor(y) * W + Math.floor(x)] === 1;
  const nearVoid = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (at(x + dx, y + dy) === 'v') return true; return false; };
  // роли полян (С37, П20): старт → бой … → передышка → кульминация (вожак поля) → «Вглубь»; у форта передышка — перед фортом
  const role = new Map(); for (const v of live) role.set(v, 'fight'); role.set(S, 'start'); role.set(E, 'exit');
  if (isFort) { role.set(L.F, 'fort'); const pre = path[path.length - 3]; if (pre && pre !== S) role.set(pre, 'rest'); }
  else { const mini = path[path.length - 2]; if (mini && mini !== S) role.set(mini, 'mini'); const mid = path[Math.floor(path.length / 2) - (path.length >= 6 ? 1 : 0)]; if (path.length >= 4 && mid !== S && role.get(mid) === 'fight') role.set(mid, 'rest'); }
  for (const v of live) if (role.get(v) === 'fight' && adjE(v).length === 1) role.set(v, 'leaf');   // тупик-ответвление: сундук за крюк

  // провалы внутри больших полян (сквозь них видно бездну)
  const nHoles = ri(0, 2);
  for (let k = 0; k < nHoles; k++) {
    const v = live.filter(u => !u.fort && role.get(u) === 'fight')[ri(0, 9)]; if (!v) continue;
    const r = 1.5 + R() * 1.1, cx = v.x + (R() - 0.5) * v.rx * 0.7, cy = v.y + (R() - 0.5) * v.ry * 0.7; const cells = [];
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) if (dist(x + 0.5, y + 0.5, cx, cy) < r * (0.8 + R() * 0.3) && at(x, y) === '.' && !reserved(x, y, 1)) { cells.push([x, y]); set(x, y, 'v'); }
    v.hole = cells.length ? [cx, cy] : null;
  }
  // озёра (не у края пропасти: вода не должна висеть над бездной)
  const LK = [0.7, 0.4, 2.2, 0.3, 0.6][variant] ?? 1;
  const nLakes = bn ? (R() < 0.3 ? 1 : 0) : Math.round((0.6 + mood.lake * 7 + R() * 1.4) * LK);
  for (let k = 0; k < nLakes; k++) {
    const v = live.filter(u => !u.fort && role.get(u) !== 'start' && role.get(u) !== 'exit')[ri(0, 11)]; if (!v) continue;
    const r = (bn ? 1.6 : 1.8) + R() * (realm === 'fjord' ? 2.4 : 1.6), cx = v.x + (R() - 0.5) * v.rx * 0.6, cy = v.y + (R() - 0.5) * v.ry * 0.6;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r * 1.3 - 1); x <= cx + r * 1.3 + 1; x++) {
      const dx = (x - cx) / 1.3, dy = y - cy; if (dx * dx + dy * dy < r * r * (0.75 + R() * 0.4) && at(x, y) === '.' && !reserved(x, y) && !nearVoid(x, y, 2)) set(x, y, '~');
    }
  }
  // заросли и скалы внутри полян
  const nBlobs = Math.round((ri(10, 15) + Math.floor(depth / 2)) * [0.8, 1.2, 0.9, 1.7, 1.1, 1][variant] * 0.5);
  for (let k = 0; k < nBlobs; k++) {
    const v = live[ri(0, live.length - 1)]; if (v.fort) continue;
    const r = 1 + R() * 1.6, cx = v.x + (R() - 0.5) * v.rx * 1.4, cy = v.y + (R() - 0.5) * v.ry * 1.4;
    if (reserved(cx, cy, r)) continue;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) if (dist(x, y, cx, cy) < r * (0.7 + R() * 0.5) && at(x, y) === '.' && !reserved(x, y)) set(x, y, 'x');
  }
  // кромка над бездной: дальняя от камеры (обрыв на север/запад) — опушка из деревьев и скал; ближняя — низкая (не закрывает героя)
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (at(x, y) !== '.' || reserved(x, y, -2) || inFort(x, y, 3)) continue;
    const back = at(x - 1, y) === 'v' || at(x, y - 1) === 'v';
    if (back && R() < 0.55) set(x, y, 'x');
  }
  // форт: стены 'D', двор ',', ворота на юге
  for (let y = fort.y; y < fort.y + fort.h; y++) for (let x = fort.x; x < fort.x + fort.w; x++) {
    const wall = x === fort.x || y === fort.y || x === fort.x + fort.w - 1 || y === fort.y + fort.h - 1;
    const isGate = y === fort.y + fort.h - 1 && Math.abs(x - gate.x) <= 1;
    set(x, y, isGate ? ',' : wall ? 'D' : ',');
  }
  for (let y = fort.y + fort.h; y < fort.y + fort.h + 3; y++) for (let x = gate.x - 1; x <= gate.x + 1; x++) set(x, y, ',');   // тропа у ворот
  // стартовая поляна и портал вглубь расчищены
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if ((dist(x + 0.5, y + 0.5, start[0], start[1]) < 5.5 || dist(x + 0.5, y + 0.5, exit[0], exit[1]) < 4.5) && at(x, y) === 'x') set(x, y, '.');

  // связность: старт → все поляны, ворота форта и портал вглубь
  const walk = c => c === '.' || c === ',' || c === 'h' || c === 'b';
  const reach = () => { const seen = new Uint8Array(W * H), q = [[Math.floor(start[0]), Math.floor(start[1])]]; seen[q[0][1] * W + q[0][0]] = 1; for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (!walk(at(X, Y)) || seen[Y * W + X]) continue; seen[Y * W + X] = 1; q.push([X, Y]); } } return seen; };
  const carve = (ax, ay, bx, by) => { const n = Math.ceil(dist(ax, ay, bx, by) * 2); for (let i = 0; i <= n; i++) { const x = Math.floor(ax + (bx - ax) * i / n), y = Math.floor(ay + (by - ay) * i / n); for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) { const c = at(x + dx, y + dy); if (c === 'x') set(x + dx, y + dy, '.'); } } };
  let seen = reach();
  const tgts = [...live.filter(v => !v.fort).map(v => [Math.floor(v.x), Math.floor(v.y)]), ...(isFort ? [[gate.x, gate.y + 2]] : []), [Math.floor(exit[0]), Math.floor(exit[1])]];
  for (const [tx, ty] of tgts) if (!seen[ty * W + tx] && at(tx, ty) !== 'v') { carve(start[0], start[1], tx + 0.5, ty + 0.5); seen = reach(); }
  if (!force && tgts.some(([tx, ty]) => !seen[ty * W + tx])) return null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === '.' && !seen[y * W + x]) g[y][x] = 'x';   // глухие карманы — чаща
  const free = (x, y, m = 0) => { for (let dy = -m; dy <= m; dy++) for (let dx = -m; dx <= m; dx++) { const c = at(Math.floor(x) + dx, Math.floor(y) + dy); if (c !== '.' && !(c === ',' && inFort(x, y))) return false; } return seen[Math.floor(y) * W + Math.floor(x)] === 1; };
  const vOfPt = (x, y) => { let best = null, bd = 1e9; for (const v of live) { if (v.fort) { if (x >= L.plat.x0 && x <= L.plat.x1 && y >= L.plat.y0 && y <= L.plat.y1) return v; continue; } const d = Math.hypot((x - v.x) / v.rx, (y - v.y) / v.ry); if (d < bd) { bd = d; best = v; } } return bd < 1.3 ? best : null; };
  const rows = g.map(r => r.join(''));
  const objects = [], spawns = [], lvl = wildLevel(realm, depth);
  const placed = [];   // занятые точки декора/камп
  const near = (x, y, r) => placed.some(p => dist(p[0], p[1], x, y) < r);
  const land = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (seen[y * W + x] && at(x, y) === '.') land.push(y * W + x);
  const pick = (test, tries = 60) => { for (let i = 0; i < tries; i++) { const c = land[Math.floor(R() * land.length)], x = c % W + 0.15 + R() * 0.7, y = Math.floor(c / W) + 0.15 + R() * 0.7; if (test(x, y)) return [x, y]; } return null; };
  const pickIn = (v, test, tries = 60, k = 0.75) => { for (let i = 0; i < tries; i++) { const a = R() * 6.283, r = Math.sqrt(R()) * k, x = v.x + Math.cos(a) * v.rx * r, y = v.y + Math.sin(a) * v.ry * r; if (test(x, y)) return [x, y]; } return null; };

  // --- порталы. П20: на открытом поле «Вглубь» запечатан, пока жив вожак поля; у форта — пока форт не пал
  objects.push({ t: 'wild_home', x: start[0] - 1.5, y: start[1] + 0.5 });
  objects.push({ t: 'wild_next', x: exit[0], y: exit[1], hidden: isFort, sealed: !isFort });
  objects.push(...L.bridges);

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
    const boxFree = b => { for (let ty = Math.floor(b[1]) - 1; ty <= Math.floor(b[3]) + 1; ty++) for (let tx = Math.floor(b[0]) - 1; tx <= Math.floor(b[2]) + 1; tx++) { if (at(tx, ty) !== '.' || inFort(tx, ty, 2) || prot[ty * W + tx]) return false; } return true; };
    for (let k = 0, got = 0; k < 80 && got < nG; k++) {
      const t = list[(got + k) % list.length], F = GIANT_FOOT[t], rot = R() < 0.5 ? 0 : Math.PI / 2;
      const p = pick((x, y) => dist(x, y, start[0], start[1]) > 9 + F.r && dist(x, y, exit[0], exit[1]) > 5 + F.r && !near(x, y, F.r + 3) && free(x, y, 1));
      if (!p) continue; const boxes = boxesAt(t, p[0], p[1], rot); if (!boxes.every(boxFree)) continue;
      got++; placed.push([p[0], p[1], F.r + 1]); objects.push({ t, x: p[0], y: p[1], rot, boxes });
      for (let j = 0; j < 4; j++) { const a = R() * 6.28, d = F.r + 0.6 + R() * 1.5; objects.push({ t: j % 2 ? 'skulls' : 'bones', x: p[0] + Math.cos(a) * d, y: p[1] + Math.sin(a) * d, deco: 1 }); }   // кости вокруг
    }
  }

  // --- лагеря мобов: по поляне на лагерь (старт, передышка, вожак и выход — без лагерей), лишние — во второй раз по большим
  const nCamps = isFort ? Math.min(8, 4 + Math.floor((depth + 1) / 3)) : Math.min(11, 6 + Math.floor((depth + 1) / 3));
  const bigPool = RL.pool.filter(([, d]) => d <= depth).map(([t]) => t);
  let camps = 0; const campPts = [];
  const campV = live.filter(v => role.get(v) === 'fight' || role.get(v) === 'leaf').sort(() => R() - 0.5);
  const campAt = (v, wide) => {
    const p = pickIn(v, (x, y) => !inFort(x, y, 4) && dist(x, y, start[0], start[1]) > 11 && dist(x, y, exit[0], exit[1]) > 7 && !near(x, y, wide ? 8 : 6.5) && free(x, y, 1), 80);
    if (!p) return false; camps++; placed.push([p[0], p[1], wide ? 8 : 6.5]); campPts.push(p);
    const t = bigPool[ri(0, bigPool.length - 1)], MT = WILD_MOBS[t];
    const n = MT.ai === 'giant' ? 1 : Math.min(4, ri(isFort ? 1 : 2, isFort ? 2 : 3) + (depth >= 6 ? 1 : 0));
    spawns.push([t, p[0], p[1], n, 2.2, lvl]);
    if (MT.ai !== 'giant' && depth >= 4 && R() < 0.3) { const t2 = bigPool[ri(0, bigPool.length - 1)]; if (WILD_MOBS[t2].ai !== 'giant') spawns.push([t2, p[0], p[1], 1, 2.5, lvl]); }
    // лагерная обстановка и сундук
    objects.push({ t: realm === 'fjord' ? 'brazier' : bn ? 'bonfire' : 'rocks', x: p[0] + 1.6, y: p[1] - 1.2 });
    if (bn) {   // стоянка дикарей: хижина из шкур на рёбрах, тотем или знамя, рама со шкурой
      // хижина в HUT раз больше прежней (сборка 42: «чтобы туда попадал человек»), поэтому стоит на краю стоянки, а не в ней
      const HUT = 2.0, ha = R() * 6.283, hx = p[0] + Math.cos(ha) * (3 + 2.4 * HUT), hy = p[1] + Math.sin(ha) * (3 + 2.4 * HUT);
      if (free(hx, hy, 2) && !near(hx, hy, 2.6 * HUT) && dist(hx, hy, start[0], start[1]) > 12 && !reserved(hx, hy, 2)) { objects.push({ t: 'bone_hut', x: hx, y: hy, rot: R() < 0.5 ? 0 : Math.PI / 2, s: 1.2 * HUT, r: 1.6 * HUT }); placed.push([hx, hy, 2.4 * HUT]); }
      objects.push({ t: R() < 0.55 ? 'bone_totem' : 'war_banner', x: p[0] + 2.6, y: p[1] + 0.4 });
      if (R() < 0.6) objects.push({ t: 'hide_rack', x: p[0] - 0.6, y: p[1] + 2.6, rot: R() < 0.5 ? 0 : Math.PI / 2 });
    }
    for (let k = 0; k < 2; k++) objects.push({ t: (bn ? ['bones', 'skulls', 'skulls', 'crate'] : ['bones', 'skulls', 'crate', 'barrel'])[ri(0, 3)], x: p[0] - 1.5 + R() * 3, y: p[1] + 1.5 + R() * 1.5 });
    if (realm === 'forest') { const t3 = ['cart_load', 'barrel_stack', 'log_stack', 'plank_pile', 'cart'][ri(0, 4)]; objects.push({ t: t3, x: p[0] + 2.4, y: p[1] + 1.8, rot: R() * 6.28 }); }   // лагерь разбойников: награбленное (набор POLYGON Adventure)
    if (R() < 0.35) objects.push({ t: 'wchest', id: 'wc' + camps, x: p[0] - 2.2, y: p[1] - 0.6 });
    return true;
  };
  for (const v of campV) if (camps < nCamps) campAt(v, isFort);
  for (let k = 0; k < 40 && camps < nCamps; k++) { const v = campV[ri(0, campV.length - 1)]; if (v && v.rx + v.ry > 15) campAt(v, isFort); }
  if (!force && camps < Math.min(4, nCamps)) return null;
  // П20: вожак поля — у последней поляны перед выходом (кульминация); не возрождается, пока жив — «Вглубь» запечатан
  const miniV = live.find(v => role.get(v) === 'mini');
  let miniAt = null;
  if (!isFort) {
    const strong = bigPool.filter(t => WILD_MOBS[t].ai === 'giant'), melee = bigPool.filter(t => ['charge', 'melee'].includes(WILD_MOBS[t].ai)), mt = strong.length && depth >= 3 ? strong[ri(0, strong.length - 1)] : melee.length ? melee[ri(0, melee.length - 1)] : bigPool[bigPool.length - 1];
    const v = miniV || E, p = pickIn(v, (x, y) => free(x, y, 1) && dist(x, y, exit[0], exit[1]) > 5 && dist(x, y, start[0], start[1]) > 10 && !near(x, y, 3), 120, 0.55) || pick((x, y) => free(x, y, 1) && dist(x, y, start[0], start[1]) > 14);
    if (p) {
      miniAt = p; placed.push([p[0], p[1], 6]);
      spawns.push([mt, p[0], p[1], 1, 0, lvl + 1, 'wildmini']);
      const gd = bigPool.filter(t => WILD_MOBS[t].ai !== 'giant'); if (gd.length) spawns.push([gd[ri(0, gd.length - 1)], p[0], p[1], depth >= 4 ? 3 : 2, 2.4, lvl]);
      objects.push({ t: bn ? 'war_banner' : 'banner', x: p[0] + 2.2, y: p[1] - 1.6 }, { t: bn ? 'bonfire' : 'brazier', x: p[0] - 2.2, y: p[1] - 1.4 });
    }
  }
  // С37: передышка — тихая поляна без лагерей: схрон, костёр, указатель
  const restV = live.find(v => role.get(v) === 'rest');
  if (restV) {
    const p = pickIn(restV, (x, y) => free(x, y, 1) && !near(x, y, 3), 100, 0.4);
    if (p) { placed.push([p[0], p[1], 4]); objects.push({ t: 'cache', id: 'cc0', x: p[0], y: p[1] }, { t: bn ? 'bonfire' : 'brazier', x: p[0] + 1.8, y: p[1] + 1.2 }); }
  }
  // тупики-ответвления: сундук в дальнем конце (награда за крюк)
  let nLeaf = 0;
  for (const v of live.filter(u => role.get(u) === 'leaf')) {
    const nb = adjE(v)[0], ax = v.x - nb.x, ay = v.y - nb.y, l = Math.hypot(ax, ay) || 1;
    const p = [[0.5, 0], [0.35, 0.2], [0.35, -0.2], [0.2, 0]].map(([k, s2]) => [v.x + ax / l * v.rx * k - ay / l * v.rx * s2, v.y + ay / l * v.ry * k + ax / l * v.ry * s2]).find(([x, y]) => free(x, y, 1) && !near(x, y, 2));
    if (p) { placed.push([p[0], p[1], 2.5]); objects.push({ t: 'wchest', id: 'wl' + nLeaf++, rich: depth >= 3 && R() < 0.35, x: p[0], y: p[1] }); }
  }
  // отдельные сундуки и тайники в стороне от боёв
  const nChest = 2 + Math.floor(depth / 3);
  for (let i = 0; i < nChest; i++) { const p = pick((x, y) => !inFort(x, y, 2) && dist(x, y, start[0], start[1]) > 6 && free(x, y, 1) && !near(x, y, 2.5) && !reserved(x, y, -4)); if (p) { placed.push([p[0], p[1], 2.5]); objects.push({ t: 'wchest', id: 'ws' + i, x: p[0], y: p[1] }); } }
  for (let i = 0; i < 11; i++) { const p = pick((x, y) => !inFort(x, y, 1) && dist(x, y, start[0], start[1]) > 4 && free(x, y, 0) && !near(x, y, 1.6) && !prot[Math.floor(y) * W + Math.floor(x)]); if (p) { placed.push([p[0], p[1], 1.6]); objects.push({ t: 'stash', id: 'wt' + i, x: p[0], y: p[1], kind: i % 2 ? 'crate' : 'barrel' }); } }
  // второй схрон (с глубины 3) — подальше от старта
  if (depth >= 3 || !restV) {
    const p = pick((x, y) => !inFort(x, y, 3) && dist(x, y, start[0], start[1]) > 24 && free(x, y, 1) && !near(x, y, 3.5) && !reserved(x, y, -4), 200) || pick((x, y) => !inFort(x, y, 2) && dist(x, y, start[0], start[1]) > 8 && free(x, y, 1) && !near(x, y, 2), 200);
    if (p) { placed.push([p[0], p[1], 3.5]); objects.push({ t: 'cache', id: 'cc1', x: p[0], y: p[1] }); }
  }

  // --- природа: деревья/скалы/кристаллы (с коллайдерами), без разметки на пути
  // по вариантам поля — своя растительность: роща, ручьи и камни, бор, бурелом (деревья и камни стоят не ближе ~2,4 м друг к другу)
  const flora = {
    forest: [['tree_0', 'tree_0', 'tree_1', 'tree_0', 'rocks', 'tree_1'], ['tree_0', 'tree_0', 'tree_0', 'tree_1', 'tree_0', 'rocks'], ['rocks', 'tree_0', 'rocks', 'tree_1', 'rocks', 'tree_0'], ['tree_1', 'tree_1', 'tree_0', 'tree_1', 'tree_1', 'deadtree'], ['deadtree', 'tree_0', 'deadtree', 'rocks', 'tree_1', 'deadtree'], mood.dark ? ['tree_0', 'tree_1', 'deadtree', 'mushrooms', 'rocks', 'tree_0'] : ['tree_0', 'tree_1', 'tree_0', 'tree_1', 'rocks', 'deadtree']],
    bones: [['tree_acacia', 'rocks', 'tree_acacia_b', 'sand_spire', 'rocks', 'agave'], ['rocks', 'sand_spire', 'tree_acacia', 'sand_tooth', 'rocks', 'tree_acacia_c'], ['tree_acacia', 'tree_acacia_b', 'tree_acacia_c', 'rocks', 'agave', 'deadtree'], ['sand_spire', 'rocks', 'sand_tooth', 'rocks', 'sand_mesa', 'tree_acacia', 'agave'], ['rocks', 'deadtree', 'sand_tooth', 'tree_acacia_b', 'rocks', 'agave'], ['rocks', 'sand_spire', 'tree_acacia', 'deadtree', 'sand_tooth']],
    fjord: [['tree_1', 'tree_1', 'rocks', 'tree_0', 'tree_1', 'rocks'], ['rocks', 'stalagmite', 'rocks', 'tree_1', 'rocks', 'crystals'], ['rocks', 'tree_1', 'stalagmite', 'rocks', 'rocks', 'deadtree'], ['tree_1', 'rocks', 'tree_1', 'rocks', 'tree_0', 'tree_1'], ['stalagmite', 'rocks', 'rocks', 'crystals', 'deadtree', 'stalagmite'], depth >= 5 ? ['rocks', 'stalagmite', 'crystals', 'tree_0'] : ['tree_1', 'stalagmite', 'tree_0', 'deadtree', 'tree_1', 'rocks']],
  }[realm][variant];
  const landK = Math.min(1.5, land.length / 3364);   // площадь суши против прежнего поля 58×58
  const nFlora = Math.round((0.5 * (realm === 'forest' ? 125 : bn ? 66 : 110) * [0.8, 1.1, 1, 1.5, 0.9, 1][variant] + Math.floor(depth * 4)) * landK);
  // деревья не заслоняют порталы: у портала пусто, а со стороны камеры (+x, +y) — ещё шире
  const portalView = (x, y) => [start, exit].some(([px, py]) => { const d = dist(x, y, px, py); return d < 4 || (d < 10 && (x - px) + (y - py) > -1); });
  let nF = 0; const CAMP_CLEAR = 5;   // вокруг лагеря — пусто: мобов видно, есть где драться
  for (let i = 0; i < nFlora * 2; i++) {
    const p = pick((x, y) => !inFort(x, y, 1) && !portalView(x, y) && free(x, y, 0) && !near(x, y, 3.5) && !prot[Math.floor(y) * W + Math.floor(x)] && !campPts.some(c => dist(x, y, c[0], c[1]) < CAMP_CLEAR) && !(miniAt && dist(x, y, miniAt[0], miniAt[1]) < CAMP_CLEAR));
    if (p) { const t = flora[ri(0, flora.length - 1)]; if (t === 'sand_mesa' && !free(p[0], p[1], 2)) continue; placed.push([p[0], p[1], t === 'sand_mesa' ? 3.6 : 3.5]); objects.push({ t, x: p[0], y: p[1] }); if (++nF >= nFlora) break; }
  }
  for (let i = 0; i < (bn ? 16 : 8); i++) { const p = pick((x, y) => free(x, y, 0)); if (p) objects.push({ t: realm === 'fjord' ? 'skulls' : bn && i % 3 === 0 ? 'skulls' : 'bones', x: p[0], y: p[1], deco: 1 }); }
  // П55: кромка над бездной не лысая — у ближнего к камере обрыва низкий декор без коллайдера (кусты, папоротник, камешки)
  const RIM = realm === 'forest' ? ['bush', 'fern', 'bush', 'rocks'] : bn ? ['bush_dry', 'agave', 'bush_dry', 'tumbleweed'] : ['rocks', 'bush', 'rocks', 'fern'];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (at(x, y) !== '.' || !(at(x + 1, y) === 'v' || at(x, y + 1) === 'v') || prot[y * W + x] || R() > 0.42) continue;
    const t = RIM[ri(0, RIM.length - 1)], px = x + 0.25 + R() * 0.5, py = y + 0.25 + R() * 0.5; if (portalView(px, py) && dist(px, py, start[0], start[1]) < 4) continue;
    objects.push({ t, x: px, y: py, s: t === 'rocks' ? 0.5 + R() * 0.4 : 0.8 + R() * 0.6, nocol: 1, deco: 1 });
  }
  // ориентиры (П56): руины древних на одной из дальних полян, у провалов — светящиеся кристаллы
  const lm = live.filter(v => (role.get(v) === 'fight' || role.get(v) === 'leaf') && !v.fort && L.dS.get(v) >= 2)[0];
  if (lm && !bn) {
    const p = pickIn(lm, (x, y) => free(x, y, 2) && !near(x, y, 4) && !reserved(x, y), 80, 0.5);
    if (p) { placed.push([p[0], p[1], 4]); objects.push({ t: 'statue', x: p[0], y: p[1] }); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.6, q = [p[0] + Math.cos(a) * 2.6, p[1] + Math.sin(a) * 2.6]; if (free(q[0], q[1], 0)) objects.push({ t: k % 2 ? 'rubble' : 'pillar', x: q[0], y: q[1] }); } }
  }
  for (const v of live) if (v.hole) for (let k = 0; k < 2; k++) { const a = R() * 6.283, q = [v.hole[0] + Math.cos(a) * 3.4, v.hole[1] + Math.sin(a) * 3.4]; if (free(q[0], q[1], 0) && !near(q[0], q[1], 1.5)) objects.push({ t: realm === 'forest' ? 'mushrooms' : bn ? 'rocks' : 'crystals', x: q[0], y: q[1] }); }
  // указатель у входа и брошенный скарб по полю (в Старом Лесу — телеги, поленницы, бочки)
  objects.push(bn ? { t: 'war_banner', x: start[0] + 2.6, y: start[1] + 1.2 } : { t: 'signpost', x: start[0] + 2.6, y: start[1] + 1.2, rot: R() * 6.28 });
  if (realm === 'forest') for (let i = 0; i < 3; i++) { const p = pick((x, y) => !inFort(x, y, 2) && dist(x, y, start[0], start[1]) > 8 && free(x, y, 1) && !near(x, y, 3) && !prot[Math.floor(y) * W + Math.floor(x)]); if (p) { placed.push([p[0], p[1], 3]); objects.push({ t: ['cart', 'log_stack', 'barrel_stack'][i], x: p[0], y: p[1], rot: R() * 6.28 }); } }
  // жаровни у выхода и старта
  objects.push({ t: bn ? 'bonfire' : 'brazier', x: start[0] + 1.5, y: start[1] - 1.5 }, { t: bn ? 'bonfire' : 'brazier', x: exit[0] - 2.2, y: exit[1] - 1.6 });

  // перешейки, мосты и подходы к ним ничем не загорожены (обстановка лагерей разлетается на пару метров)
  const KEEPO = new Set(['wild_home', 'wild_next', 'bridge', 'wchest', 'cache', 'stash', 'fort_tower', 'fort_gate', 'fort_door', 'fort_hall', 'tent', 'banner', 'statue', 'brazier']);
  const onPath = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = Math.floor(x) + dx, Y = Math.floor(y) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && prot[Y * W + X] && Math.hypot(X + 0.5 - x, Y + 0.5 - y) < 1.9) return true; } return false; };
  for (let i = objects.length - 1; i >= 0; i--) { const o = objects[i]; if (!KEEPO.has(o.t) && !o.nocol && !o.deco && !inFort(o.x, o.y, 1) && onPath(o.x, o.y)) objects.splice(i, 1); }
  const total = spawns.reduce((a, s) => a + s[3], 0);
  return {
    name: `${RL.name} · ${locationName(realm, depth)} · глубина ${depth}`, floorN: (realm === 'fjord' ? 1200 : bn ? 1300 : 1100) + depth, seed,
    wild: { camps: campPts.map(p => [p[0], p[1]]), realm, depth, mood: moodOf(realm, depth), boss, fort: isFort ? fort : null, gate: isFort ? gate : null, kind: isFort ? 'fort' : 'field', variant, locName: locationName(realm, depth), islands: true, mini: miniAt },
    w: W, h: H, rows, objects, torches: [], spawns, total, rooms: {}, start, boss, level: lvl, story: [],
  };
}
