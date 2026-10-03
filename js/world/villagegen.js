// Генератор деревни по правилам (вместо ручной раскладки assets/maps/village_big.json).
// Задаётся только «замысел» (PLAN): где площадь, куда ведут дороги, где течёт ручей и стоят порталы.
// Всё остальное раскладывается правилами, детерминированно по seed:
//   1) скелет: лесная кромка, ручей с мостом, мощёная площадь, дороги к порталам;
//   2) участки вдоль дорог: здание ставится только на «дальней» от камеры стороне дороги (камера смотрит с +x,+z),
//      фасадом к дороге — фасады видны, а дома не загораживают улицы, NPC и порталы; ближняя сторона — низкая
//      (огороды, плетни, поля, стога);
//   3) роли зданий по смыслу: церковь на площади, таверна у перекрёстка ближе к площади, лавка с прилавком — у площади
//      на главной улице, кузница — у моста, остальное — жилые дома; у каждого двора свой хлам по роли;
//   4) поля пакуются в свободные большие прямоугольники по краям (пшеница, виноградник, огороды), вокруг — заборы;
//   5) деревья рощами в остатках земли, фонари вдоль улиц;
//   6) зазоры: между любыми двумя препятствиями либо вплотную (одно препятствие), либо ≥ 1,3 м — любой предмет можно обойти;
//      мелочь, которая встала теснее, убирается;
//   7) атмосфера за рекой: полуразрушенная мельница выше по течению и завал деревьев за мостом (туда не пройти), куры и собаки;
//   8) проверка: от старта можно дойти до всех NPC и порталов, здания не закрывают их от камеры.
// Тайлы: '.' трава, ',' дорога, '#' брусчатка (в деревне проходима), 'x' лес, '~' вода, 'b' мост (проходим),
// 'F' пшеница, 'V' виноградник, 'K' огород, 'n' луг за ручьём и ';' дорога за ручьём (непроходимы — туда нельзя).
const W = 74, H = 70, K = 70 / 64;   // замысел записан в координатах 64×64 и растягивается в 70/64 раза; карта на 4 м шире к востоку — за рекой место под мельницу

// растянуть замысел под размер карты; главные улицы на 0,5 м шире, переулки — на 0,3 м
function scalePlan(p) {
  const sp = ([x, y]) => [+(x * K).toFixed(2), +(y * K).toFixed(2)];
  return { ...p, center: sp(p.center), square: { hw: p.square.hw * K, hh: p.square.hh * K, r: p.square.r * K }, stream: { ...p.stream, pts: p.stream.pts.map(sp), millY: p.stream.millY * K },
    portals: Object.fromEntries(Object.entries(p.portals).map(([k, v]) => [k, sp(v)])), roads: p.roads.map(r => ({ ...r, w: r.w + (r.main ? 0.5 : 0.3), pts: r.pts.map(sp) })), start: sp(p.start), altar: sp(p.altar) };
}
// коллайдеры мелочи (как в js/world/zone.js PROP): число — радиус, пара — полуоси коробки
const COL = { cart: [1.0, 0.55], cart_load: [1.0, 0.55], signpost: 0.15, barrel_stack: [0.9, 0.55], log_stack: [1.35, 0.6], plank_pile: [1.3, 0.35], pumpkins: 0.45, tool_stand: [0.6, 0.25], barrel: 0.3, crate: 0.35, sacks: 0.3, lamp: 0.12, well: 0.62, board: 0.3, banner: 0.15, table: 0.6, dummy: 0.3, target: 0.35, hay: 0.45, tree_0: 0.3, tree_1: 0.3, grave: 0.2, deadtree: 0.25, shrine: 1.3, crystals: 0.3, rocks: 0.35, logpile: [0.7, 0.4], bench: [0.75, 0.22], weapon_rack: [0.6, 0.18], forge: [0.75, 0.6], fortune_tent: [1.5, 1.3] };
const KEEP = new Set(['well', 'board', 'banner', 'shrine', 'forge', 'fortune_tent', 'portal']);   // то, что не убирается ради зазора
const GAP = 1.8;   // свободный проход между препятствиями (герой ≈ 0,85 м в ширину + запас); сборка 18: шире — просторнее

export const PLAN = {
  seed: 11,
  center: [31.5, 29.5],
  square: { hw: 6.5, hh: 4.6, r: 2.4 },
  stream: { pts: [[51.5, -3], [54.5, 9], [58.2, 20], [57.6, 31], [59.4, 43], [57.6, 67]], w: [4.0, 5.0], millY: 13.5, millW: 3.2 },   // millY — где у мельницы река разливается шире (на millW м)
  portals: { catacombs: [34.5, 5.6], fjord: [46.5, 5.6], depths: [9.0, 7.5], castle: [5.4, 29.5], bones: [4.4, 17.6], forest: [7.2, 56.4], survival: [31.5, 59.6] },
  roads: [
    { id: 'west', w: 2.7, main: 1, pts: [[25.5, 29.5], [19, 30.1], [12, 29.3], [5.4, 29.5]] },
    { id: 'east', w: 2.7, main: 1, pts: [[37.5, 29.5], [44, 29.1], [50, 29.8], [56, 30.2], [64.5, 30.6]] },
    { id: 'north', w: 2.2, pts: [[36.4, 25.2], [37.2, 18], [36.4, 11.5], [34.5, 5.6]] },
    { id: 'fjordway', w: 1.7, pts: [[36.6, 11.2], [41, 8.2], [46.5, 5.6]] },
    { id: 'depthway', w: 1.7, pts: [[11.6, 29.3], [10.6, 19], [9.0, 7.5]] },
    { id: 'boneway', w: 1.6, pts: [[10.7, 19.6], [7.6, 18.2], [4.4, 17.6]] },   // к костяному порталу (Костяные пустоши)
    { id: 'south', w: 2.5, main: 1, pts: [[31.5, 34.2], [31.0, 42], [32.0, 51], [31.5, 59.6]] },
    { id: 'swlane', w: 2.0, pts: [[26.2, 33.4], [20.5, 39.5], [13.5, 47.5], [7.2, 56.4]] },
    { id: 'eastlane', w: 1.9, pts: [[31.8, 46.5], [39, 47.6], [47, 46.6], [52.5, 47.4]] },
  ],
  start: [31.4, 44.5],
  altar: [35.4, 32.4],   // алтарь богини (сборка 19): на площади, у выхода с южной дороги — видно сразу со старта
};

// ---- утилиты
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hh = (x, y, s = 0) => { let h = (Math.round(x * 97) * 374761393 + Math.round(y * 89) * 668265263 + s * 2654435761) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y, s = 0) { const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, f = t => t * t * (3 - 2 * t); const a = hh(xi, yi, s), b = hh(xi + 1, yi, s), c = hh(xi, yi + 1, s), d = hh(xi + 1, yi + 1, s); return (a + (b - a) * f(u)) * (1 - f(v)) + (c + (d - c) * f(u)) * f(v); }
// Catmull-Rom по точкам: плотная выборка {x,y,tx,ty}
function spline(pts, step = 0.25) {
  const out = [], P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]], len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const cr = j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push({ x: cr(0), y: cr(1) });
    }
  }
  out.push({ x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] });
  for (let i = 0; i < out.length; i++) { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.y - a.y) || 1; out[i].tx = (b.x - a.x) / l; out[i].ty = (b.y - a.y) / l; }
  let s = 0; for (let i = 0; i < out.length; i++) { if (i) s += Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y); out[i].s = s; }
  return out;
}

// ---- здания: размеры фундамента (w — поперёк фасада, d — вглубь), высота для проверки «не загораживает», коллайдер чуть меньше
export const BUILDINGS = {
  church: { w: 7.0, d: 12.4, h: 17, col: [3.3, 6.0] },
  tavern: { w: 7.6, d: 5.2, h: 9, col: [3.9, 2.7] },
  shop: { w: 6.2, d: 4.4, h: 8, col: [3.2, 2.3], front: 1.6 },
  smithy: { w: 7.8, d: 4.6, h: 6, col: [2.4, 2.4], colOff: [-1.5, 0] },   // каменная мастерская 4,8 м + открытый навес с горном 3 м справа (+x)
  house_0: { w: 5.4, d: 4.0, h: 8.5, col: [2.85, 2.2] },
  house_2: { w: 4.6, d: 4.0, h: 8, col: [2.45, 2.2] },
  cottage_a: { w: 5.0, d: 3.8, h: 5.5, col: [2.6, 2.0] },
  cottage_b: { w: 4.4, d: 3.6, h: 5.2, col: [2.3, 1.9] },
  cottage_c: { w: 5.6, d: 4.0, h: 5.8, col: [2.9, 2.1] },
};
const HOUSES = ['cottage_a', 'house_0', 'cottage_b', 'house_2', 'cottage_c', 'cottage_a', 'house_0', 'cottage_b'];

export function generateVillage(plan0 = PLAN) {
  const plan = scalePlan(plan0), R = mulberry(plan.seed), [CX, CY] = plan.center;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const use = new Uint8Array(W * H);   // занятость при планировке: 1 дорога/площадь, 2 вода, 3 лес, 4 здание, 5 двор, 6 поле, 7 резерв (порталы, NPC)
  const objects = [], npcs = [], warn = [];
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 'x' : g[y][x];
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const U = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 3 : use[y * W + x];
  const setU = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) use[y * W + x] = v; };
  const put = (t, x, y, o = {}) => { const ob = { t, x: +x.toFixed(2), y: +y.toFixed(2), ...o }; objects.push(ob); return ob; };
  const portals = Object.entries(plan.portals).map(([id, [x, y]]) => ({ id, x, y }));
  const nearPortal = (x, y, r = 6.2) => portals.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < r * r);

  // 1. лесная кромка: 3 тайла по краю + «волна» до 5 тайлов, у порталов и концов дорог — опушки
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.min(x, y, W - 1 - x, H - 1 - y), depth = 3 + Math.floor(vnoise(x * 0.18, y * 0.18, 3) * 3.2);
    if (d < 3 || (d < depth && !nearPortal(x + 0.5, y + 0.5, 7.5))) { set(x, y, 'x'); setU(x, y, 3); }
  }
  // 2. ручей: сплайн с переменной шириной; дальний берег — луг, куда пройти нельзя
  const ST = plan.stream, stream = spline(ST.pts, 0.2), sw = (s, y = -99) => ST.w[0] + (ST.w[1] - ST.w[0]) * vnoise(s * 0.08, 1.7, 5) + (ST.millW || 0) * Math.exp(-(((y - ST.millY) / 6) ** 2));
  const streamX = new Float32Array(H).fill(-1), streamHW = new Float32Array(H);
  for (const p of stream) {
    const r = sw(p.s, p.y) / 2;
    for (let y = Math.floor(p.y - r - 1); y <= p.y + r + 1; y++) for (let x = Math.floor(p.x - r - 1); x <= p.x + r + 1; x++) {
      if ((x + 0.5 - p.x) ** 2 + (y + 0.5 - p.y) ** 2 < r * r) { set(x, y, '~'); setU(x, y, 2); }
    }
    const yi = Math.round(p.y); if (yi >= 0 && yi < H && streamX[yi] < 0) { streamX[yi] = p.x; streamHW[yi] = r; }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (streamX[y] > 0 && x + 0.5 > streamX[y] + streamHW[y] && at(x, y) === '.') { set(x, y, 'n'); setU(x, y, 3); }
  // 3. площадь: скруглённый прямоугольник брусчатки
  const SQ = plan.square;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = Math.max(0, Math.abs(x + 0.5 - CX) - (SQ.hw - SQ.r)), dy = Math.max(0, Math.abs(y + 0.5 - CY) - (SQ.hh - SQ.r));
    if (Math.hypot(dx, dy) < SQ.r + (vnoise(x * 0.5, y * 0.5, 9) - 0.5) * 0.5) { set(x, y, '#'); setU(x, y, 1); }
  }
  // 4. дороги: ширина + неровный край; над водой — мост, за ручьём — непроходимая дорога в лес
  const roads = plan.roads.map(r => ({ ...r, line: spline(r.pts, 0.25) }));
  const bridges = [];
  for (const r of roads) for (const p of r.line) {
    const hw = r.w / 2 + (vnoise(p.s * 0.3, r.w, 13) - 0.5) * 0.45;
    for (let y = Math.floor(p.y - hw - 1); y <= p.y + hw + 1; y++) for (let x = Math.floor(p.x - hw - 1); x <= p.x + hw + 1; x++) {
      if ((x + 0.5 - p.x) ** 2 + (y + 0.5 - p.y) ** 2 >= hw * hw) continue;
      const c = at(x, y);
      if (c === '~' || c === 'b') { set(x, y, 'b'); setU(x, y, 1); if (!bridges.some(b => b.x === x && b.y === y)) bridges.push({ x, y }); }
      else if (c === 'n' || (c === 'x' && x > W / 2 && streamX[y] > 0 && x > streamX[y])) { set(x, y, ';'); }
      else if (c === '.' || (c === 'x' && x >= 2 && y >= 2 && x < W - 2 && y < H - 2)) { if (c !== '#') { set(x, y, ','); setU(x, y, 1); } }
    }
  }
  // мост — ровная полоса: строки, общие для всех столбцов моста (дорога чуть изгибается — иначе край «гуляет» и за перила можно выйти)
  if (bridges.length) {
    const cols = {}; for (const b of bridges) (cols[b.x] ||= []).push(b.y);
    const y0 = Math.max(...Object.values(cols).map(c => Math.min(...c))), y1 = Math.min(...Object.values(cols).map(c => Math.max(...c)));
    for (const b of bridges) set(b.x, b.y, '~');
    bridges.length = 0;
    for (const x of Object.keys(cols).map(Number)) for (let y = y0; y <= y1; y++) { set(x, y, 'b'); setU(x, y, 1); bridges.push({ x, y }); }
  }
  // 5. порталы: расчищенная опушка; резерв, чтобы рядом ничего не строилось
  for (const p of portals) for (let y = Math.floor(p.y - 3); y <= p.y + 3; y++) for (let x = Math.floor(p.x - 3); x <= p.x + 3; x++) {
    if ((x + 0.5 - p.x) ** 2 + (y + 0.5 - p.y) ** 2 < 6.5 && at(x, y) === 'x' && x > 0 && y > 0 && x < W - 1 && y < H - 1) set(x, y, '.');
    if (U(x, y) === 0 || U(x, y) === 3) setU(x, y, at(x, y) === 'x' ? 3 : 7);
  }

  // ---- геометрия зданий: прямоугольник w×d, повёрнутый на rot (фасад — локальная +z → мировое (sin rot, cos rot))
  const corners = (b, m = 0) => { const s = Math.sin(b.rot), c = Math.cos(b.rot), hw = b.w / 2 + m, hd = b.d / 2 + m; return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => [b.x + u * c + v * s, b.y - u * s + v * c]); };
  const inside = (b, x, y, m = 0) => { const s = Math.sin(b.rot), c = Math.cos(b.rot), dx = x - b.x, dy = y - b.y, u = dx * c - dy * s, v = dx * s + dy * c; return Math.abs(u) <= b.w / 2 + m && Math.abs(v) <= b.d / 2 + m; };
  const tilesOf = (b, m) => { const cs = corners(b, m), xs = cs.map(c => c[0]), ys = cs.map(c => c[1]), out = []; for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) if (inside(b, x + 0.5, y + 0.5, m)) out.push([x, y]); return out; };
  // строго: фундамент + 0,5 м — только свободная трава; мягко: до m — не ближе к другим зданиям, полям, воде, резерву
  const fits = (b, m = 0.5) => tilesOf(b, 0.5).every(([x, y]) => at(x, y) === '.' && U(x, y) === 0) && tilesOf(b, m).every(([x, y]) => { const u = U(x, y), c = at(x, y); return u !== 4 && u !== 7 && u !== 6 && c !== '~' && c !== 'x'; });
  // «загораживает»: точка лежит в тени здания на экране (позади него по направлению взгляда, в пределах его ширины)
  const targets = portals.map(p => ({ x: p.x, y: p.y }));
  const occludes = (b, p) => {
    const dx = p.x - b.x, dy = p.y - b.y, lat = (dx - dy) / Math.SQRT2, behind = -(dx + dy) / Math.SQRT2, half = (b.w + b.d) / (2 * Math.SQRT2);
    return Math.abs(lat) < half + 0.6 && behind > 0 && behind < b.h / 0.75 * 0.85 + half;
  };
  const buildings = [];
  const place = (kind, x, y, rot, extra = {}) => {
    const B = BUILDINGS[kind], b = { kind, x, y, rot, w: B.w, d: B.d, h: B.h, ...extra };
    buildings.push(b);
    for (const [tx, ty] of tilesOf(b, 0.4)) setU(tx, ty, 4);
    // коллайдер: по прямоугольнику фундамента (для поворота 45° — ступенчатый набор полос)
    const cw = B.col[0], cd = B.col[1], off = B.colOff || [0, 0], s = Math.sin(rot), c = Math.cos(rot), cxo = x + off[0] * c + off[1] * s, cyo = y - off[0] * s + off[1] * c, cb = { x: cxo, y: cyo, rot, w: cw * 2, d: cd * 2 };
    const boxes = [];
    if (Math.abs(Math.sin(2 * rot)) < 0.01) { const sw2 = Math.abs(c) > 0.5 ? cw : cd, sh = Math.abs(c) > 0.5 ? cd : cw; boxes.push([cxo - sw2, cyo - sh, cxo + sw2, cyo + sh]); }
    else { const cs = corners(cb), ys = cs.map(q => q[1]); for (let yy = Math.min(...ys); yy < Math.max(...ys); yy += 0.5) { let x0 = 1e9, x1 = -1e9; for (let xx = cxo - 8; xx <= cxo + 8; xx += 0.1) if (inside(cb, xx, yy + 0.25)) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); } if (x1 > x0) boxes.push([+x0.toFixed(2), +yy.toFixed(2), +x1.toFixed(2), +(yy + 0.5).toFixed(2)]); } }
    b.obj = put(kind, x, y, { rot: +rot.toFixed(4), boxes });
    return b;
  };
  const front = (b, k) => [b.x + Math.sin(b.rot) * (b.d / 2 + k), b.y + Math.cos(b.rot) * (b.d / 2 + k)];
  const side = (b, u, v) => { const s = Math.sin(b.rot), c = Math.cos(b.rot); return [b.x + u * c + v * s, b.y - u * s + v * c]; };   // локальные (u вдоль фасада, v к фасаду)

  // ---- церковь: на северной стороне площади, фасадом (с башней) к площади
  const church = place('church', CX - 1.0, CY - SQ.hh - BUILDINGS.church.d / 2 - 1.3, 0);
  { const [x0, y0] = side(church, -1.6, BUILDINGS.church.col[1]), [x1, y1] = side(church, 1.6, BUILDINGS.church.d / 2 + 1.3); church.obj.boxes.push([+Math.min(x0, x1).toFixed(2), +Math.min(y0, y1).toFixed(2), +Math.max(x0, x1).toFixed(2), +Math.max(y0, y1).toFixed(2)]); }   // ступени и портал — сплошные: в них не застрять
  // ---- кандидаты участков: точки вдоль дорог на дальней стороне
  const cands = [];
  for (const r of roads) for (let i = 0; i < r.line.length; i += 2) {
    const p = r.line[i];
    for (const sg of [1, -1]) {
      const nx = -p.ty * sg, ny = p.tx * sg;           // нормаль от дороги в сторону участка
      if (nx + ny > -0.35) continue;                   // ближняя к камере сторона — без зданий
      let rot = Math.atan2(-nx, -ny);                  // фасад к дороге
      const snaps = r.id === 'swlane' ? [Math.PI / 4] : [0, Math.PI / 2], best = snaps.reduce((a, q) => Math.abs(q - rot) < Math.abs(a - rot) ? q : a, snaps[0]);
      if (Math.abs(best - rot) > 0.6) continue;
      cands.push({ road: r.id, main: !!r.main, p, nx, ny, rot: best, hw: r.w / 2, dSq: Math.hypot(p.x - CX, p.y - CY) });
    }
  }
  const tryPlace = (kind, list, score, extra) => {
    const B = BUILDINGS[kind];
    const opts = list.map(c => { const k = c.hw + 2.0 + (B.front || 0) + B.d / 2, x = c.p.x + c.nx * k, y = c.p.y + c.ny * k; return { c, x, y }; })
      .filter(o => { const b = { x: o.x, y: o.y, rot: o.c.rot, w: B.w, d: B.d, h: B.h }; return fits(b, 2.2) && !targets.some(t => occludes(b, t)); })
      .sort((a, b) => score(a) - score(b));
    if (!opts.length) { warn.push('нет места: ' + kind); return null; }
    const o = opts[0]; return place(kind, o.x, o.y, o.c.rot, { road: o.c.road, ...extra });
  };
  const roadEnd = id => { const l = roads.find(r => r.id === id).line; return l[l.length - 1]; };
  const bridgeC = bridges.length ? { x: bridges.reduce((a, b) => a + b.x, 0) / bridges.length + 0.5, y: bridges.reduce((a, b) => a + b.y, 0) / bridges.length + 0.5 } : roadEnd('east');
  // таверна — у площади на западной улице; лавка — у площади на восточной; кузница — ближе всех к мосту
  const tavern = tryPlace('tavern', cands.filter(c => c.road === 'west'), o => o.c.dSq);
  const smithy = tryPlace('smithy', cands.filter(c => c.road === 'east'), o => Math.hypot(o.x - bridgeC.x, o.y - bridgeC.y));
  const shop = tryPlace('shop', cands.filter(c => c.road === 'east'), o => o.c.dSq);
  // ---- NPC и их места
  const npc = (id, name, x, y, extra = {}) => { const n = { id, name, x: +x.toFixed(2), y: +y.toFixed(2), model: 'npc_' + id, ...extra }; npcs.push(n); targets.push({ x, y }); return n; };
  // староста — у ступеней церкви слева, доска заданий рядом
  { const [fx, fy] = front(church, 3.4); npc('elder', 'Староста Эдрик', fx - 3.8, fy + 0.2); put('board', fx + 4.0, fy + 0.3); }
  if (shop) {
    const [mx, my] = front(shop, 0.55); npc('merchant', 'Торговка Мира', mx, my, { reach: 3.2 });
    const cs = [[-1.75, 3.0], [1.75, 3.0], [-1.75, 3.7], [1.75, 3.7]].map(([u, v]) => side(shop, u, v)), xs = cs.map(c => c[0]), ys = cs.map(c => c[1]);
    shop.obj.boxes.push([+Math.min(...xs).toFixed(2), +Math.min(...ys).toFixed(2), +Math.max(...xs).toFixed(2), +Math.max(...ys).toFixed(2)]);   // прилавок — сквозь него не пройти
  }
  if (smithy) { const [sx, sy] = side(smithy, 2.4, smithy.d / 2 + 0.9); npc('smith', 'Кузнец Горан', sx, sy); const [fx, fy] = side(smithy, 1.72, 0.1); put('forge', fx, fy, { rot: smithy.rot }); }   // горн вплотную к стене мастерской
  // площадь: колодец, летопись, фонари по углам, лавки и бочки
  put('well', CX + 1.5, CY + 0.3);
  put('shrine', plan.altar[0], plan.altar[1], { s: 1.35 });   // алтарь богини — на площади (сборка 19)
  const hwsign = [CX - SQ.hw + 4.3, CY + SQ.hh - 1.0];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put('lamp', CX + sx * (SQ.hw - 0.6), CY + sy * (SQ.hh - 0.5));
  put('bench', CX + 4.6, CY - 2.6, { rot: 0 }); put('bench', CX - 1.4, CY + 3.6, { rot: 0 });
  // наставник: тренировочный двор на ближней стороне восточной улицы (низкий: чучела, стойка, плетень)
  {
    const ty0 = CY + SQ.hh + 0.4, tx0 = CX + SQ.hw + 2.6;
    npc('trainer', 'Наставник Элвин', tx0 + 1.5, ty0 + 1.8);
    put('dummy', tx0 + 3.6, ty0 + 1.8, { rot: 0.5 }); put('dummy', tx0 + 6.0, ty0 + 3.6, { rot: -0.3 }); put('weapon_rack', tx0 + 2.8, ty0 + 4.9, { rot: 0 });
    put('target', tx0 + 7.4, ty0 + 0.9, { rot: -0.9 });
    for (let i = 0; i < 8; i++) put('fence_x', tx0 + 0.5 + i, ty0 + 6.2, { nocol: 1 });
    for (let i = 0; i < 5; i++) put('fence_y', tx0 + 8.6, ty0 + 1.2 + i, { nocol: 1 });
    markRect(tx0 - 0.5, ty0 - 0.5, tx0 + 9.0, ty0 + 6.6, 5);
  }
  // гадалка: шатёр у южного края площади, на ближней стороне (низкий — ничего не заслоняет)
  {
    const fx = CX - 3.6, fy = CY + SQ.hh + 3.6;
    npc('fortune', 'Гадалка Фортуна', fx + 3.2, fy - 0.6);
    put('fortune_tent', fx, fy, { rot: 0 }); put('crystals', fx + 3.4, fy + 1.0); put('candles', fx + 3.0, fy - 0.4);
    markRect(fx - 3.4, fy - 3.2, fx + 4.4, fy + 3.4, 5);
  }
  function markRect(x0, y0, x1, y1, v) { for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) if (U(x, y) === 0) setU(x, y, v); }
  // кладбище за церковью и святилище у её бока
  {
    const gx0 = church.x - 4.2, gy0 = church.y - church.d / 2 - 4.6;
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) if (hh(k, r, 4) < 0.85) put('grave', gx0 + 0.8 + k * 1.75, gy0 + 0.9 + r * 1.8, { rot: (hh(k, r) - 0.5) * 0.3 });
    put('deadtree', gx0 + 8.6, gy0 + 0.6);
    markRect(gx0 - 0.5, gy0, gx0 + 9, gy0 + 4, 5);
  }

  // жилые дома: по всем дорогам, ближе к площади — раньше; типы по очереди
  let hi = 0;
  const order = cands.slice().sort((a, b) => a.dSq - b.dSq);
  for (const c of order) {
    if (c.dSq > 38 * K) continue;
    const kind = HOUSES[hi % HOUSES.length], B = BUILDINGS[kind], k = c.hw + 2.1 + B.d / 2, x = c.p.x + c.nx * k, y = c.p.y + c.ny * k;
    const b = { x, y, rot: c.rot, w: B.w, d: B.d, h: B.h };
    if (!fits(b, 2.4) || targets.some(t => occludes(b, t)) || nearPortal(x, y, 8)) continue;
    place(kind, x, y, c.rot, { road: c.road, house: true }); hi++;
  }

  // ---- дворы и хлам по роли здания
  const junk = (b, list) => { for (const [id, u, v, rot] of list) { const [x, y] = side(b, u, v); if (at(Math.floor(x), Math.floor(y)) === '.' || at(Math.floor(x), Math.floor(y)) === ',') put(id, x, y, rot !== undefined ? { rot: b.rot + rot } : {}); } };
  if (tavern) {
    // хлам — вплотную к стене (одно препятствие со стеной), столы — с проходом ≥ 1,3 м вокруг
    junk(tavern, [['barrel_stack', tavern.w / 2 + 0.6, tavern.d / 2 - 1.1, Math.PI / 2], ['crate', -tavern.w / 2 - 0.42, tavern.d / 2 - 0.5]]);
    junk(tavern, [['table', 2.0, tavern.d / 2 + 2.6, 0], ['table', -2.4, tavern.d / 2 + 2.6, 0]]);
    put('lamp', ...side(tavern, tavern.w / 2 + 1.8, tavern.d / 2 + 0.8));
  }
  if (shop) { junk(shop, [['crate', shop.w / 2 + 0.3, -0.4], ['sacks', shop.w / 2 + 0.25, -1.1], ['cart_load', -shop.w / 2 - 0.62, 0.0, Math.PI / 2], ['pumpkins', shop.w / 2 + 0.5, shop.d / 2 + 0.9]]); }
  if (smithy) { junk(smithy, [['log_stack', -smithy.w / 2 - 0.62, 0, Math.PI / 2], ['plank_pile', 0.2, -smithy.d / 2 - 0.4, 0], ['barrel', smithy.w / 2 + 0.3, -smithy.d / 2 + 0.5], ['crate', smithy.w / 2 + 0.35, -1.15]]); put('lamp', ...side(smithy, -smithy.w / 2 + 0.4, smithy.d / 2 + 1.7)); }
  for (const b of buildings.filter(b => b.house)) {
    const s = hh(b.x, b.y, 7), pick = (a, k) => a[Math.floor(hh(b.x, b.y, k) * a.length)];
    junk(b, [[pick(['barrel', 'crate', 'sacks'], 1), b.w / 2 + 0.3, b.d / 2 - 0.5], [pick(['logpile', 'barrel', 'crate'], 2), -b.w / 2 - 0.42, -0.2, Math.PI / 2]]);
    // огородик сбоку от дома: грядка и плетень вдоль улицы, если есть место (с проходом между домом и огородом)
    const sgn = s < 0.5 ? 1 : -1, gu = sgn * (b.w / 2 + 2.6), [gx, gy] = side(b, gu, 0.2);
    const yard = { x: gx, y: gy, rot: b.rot, w: 2.6, d: b.d * 0.9 };
    if (fits(yard, 0.6)) {
      if (hh(b.x, b.y, 3) < 0.45) put('clothesline', gx, gy, { rot: b.rot + Math.PI / 2, nocol: 1 });   // бельё на верёвке
      else { put('garden_bed', gx, gy, { rot: b.rot + Math.PI / 2 }); const [px, py] = side(b, gu, -b.d / 2 + 0.2); put('pumpkins', px, py); }
      for (let i = 0; i < 3; i++) { const [fx, fy] = side(b, gu + (i - 1) * 1.0, b.d / 2 + 0.3); put(Math.abs(Math.sin(b.rot)) > 0.7 ? 'fence_y' : 'fence_x', fx, fy, { rot: b.rot, nocol: 1 }); }
      for (const [tx, ty] of tilesOf(yard, 0.3)) setU(tx, ty, 5);
    }
  }

  // ---- поля: самые большие свободные прямоугольники вдали от центра
  const freeF = (x, y) => {
    if (at(x, y) !== '.' || U(x, y) !== 0) return false;
    if (Math.hypot(x + 0.5 - CX, y + 0.5 - CY) < 12 * K) return false;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const u = U(x + dx, y + dy), c = at(x + dx, y + dy); if (u === 1 || u === 4 || u === 2 || c === '~') return false; }
    return !nearPortal(x + 0.5, y + 0.5, 5.8);
  };
  const fields = [];
  for (let guard = 0; guard < 14; guard++) {
    let best = null;
    const hgt = new Int16Array(W);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) hgt[x] = freeF(x, y) ? hgt[x] + 1 : 0;
      for (let x = 0; x < W; x++) { let mh = 1e9; for (let x2 = x; x2 < W && hgt[x2] > 0; x2++) { mh = Math.min(mh, hgt[x2]); const w = x2 - x + 1, hgt2 = Math.min(mh, 10), area = w * hgt2; if (w >= 4 && hgt2 >= 4 && w <= 12 && area > (best ? best.a : 0)) best = { x0: x, y0: y - hgt2 + 1, w, h: hgt2, a: area }; } }
    }
    if (!best || best.a < 28) break;
    const fcx = best.x0 + best.w / 2, fcy = best.y0 + best.h / 2;
    // северо-восток — виноградник; юго-восток — огороды (небольшие) и пшеница; остальное — пшеница
    const nK = fields.filter(f => f.type === 'K').length;
    const type = fcx > CX + 4 && fcy < CY - 2 ? 'V' : fcx > CX + 2 && fcy > CY + 4 && nK < 2 && best.a <= 80 ? 'K' : 'F';
    fields.push({ ...best, type });
    for (let y = best.y0 - 1; y <= best.y0 + best.h; y++) for (let x = best.x0 - 1; x <= best.x0 + best.w; x++) { const inF = x >= best.x0 && y >= best.y0 && x < best.x0 + best.w && y < best.y0 + best.h; if (inF) { set(x, y, type); setU(x, y, 6); } else if (U(x, y) === 0) setU(x, y, 5); }
  }
  for (const f of fields) {
    const x0 = f.x0, y0 = f.y0, x1 = f.x0 + f.w, y1 = f.y0 + f.h;
    // забор по периметру (тайлы поля и так непроходимы — забор без коллайдера), со стороны леса — без забора
    const gate = Math.floor(f.w / 2);
    for (let x = x0; x < x1; x++) { if (at(x, y0 - 1) !== 'x' && at(x, y0 - 1) !== '~') put('fence_x', x + 0.5, y0, { nocol: 1 }); if (at(x, y1) !== 'x' && x - x0 !== gate) put('fence_x', x + 0.5, y1, { nocol: 1 }); }
    for (let y = y0; y < y1; y++) { if (at(x0 - 1, y) !== 'x') put('fence_y', x0, y + 0.5, { nocol: 1 }); if (at(x1, y) !== 'x' && at(x1, y) !== '~') put('fence_y', x1, y + 0.5, { nocol: 1 }); }
    if (f.type === 'V') for (let y = y0 + 1; y < y1 - 0.5; y += 1.6) for (let x = x0 + 1.2; x < x1 - 0.9; x += 2.0) put('vine_row', x + 0.4, y + 0.2, { nocol: 1 });
    if (f.type === 'K') for (let y = y0 + 1; y < y1 - 0.8; y += 1.5) for (let x = x0 + 1.4; x < x1 - 1.2; x += 2.4) put('garden_bed', x + 0.4, y + 0.3, { nocol: 1, rot: 0 });
    if (f.type === 'F') { put('scarecrow', x0 + f.w * (0.3 + hh(x0, y0) * 0.4), y0 + f.h * 0.45, { nocol: 1, rot: 0.6 }); }
    // у ворот поля — стог и телега
    const gx = x0 + gate + 0.5, gy = y1 + 1.0;
    if (at(Math.floor(gx + 1.8), Math.floor(gy)) === '.' && U(Math.floor(gx + 1.8), Math.floor(gy)) !== 1) put(f.type === 'F' ? 'hay' : f.type === 'K' ? 'pumpkins' : 'barrel_stack', gx + 1.8, gy);
    if (at(Math.floor(gx - 2.2), Math.floor(gy + 0.4)) === '.' && U(Math.floor(gx - 2.2), Math.floor(gy + 0.4)) !== 1) put(f.type === 'F' ? 'cart' : 'tool_stand', gx - 2.2, gy + 0.4, { rot: f.type === 'F' ? 0.4 : 0 });   // у ворот: телега или стойка с вилами и косой
  }

  // ---- указатели на развилках: у начала каждого ответвления, на обочине
  for (const r of roads.filter(r => !r.main && r.id !== 'north')) {
    const p = r.line[Math.min(r.line.length - 1, 10)], sx = p.x + p.ty * (r.w / 2 + 0.9), sy = p.y - p.tx * (r.w / 2 + 0.9), sx2 = p.x - p.ty * (r.w / 2 + 0.9), sy2 = p.y + p.tx * (r.w / 2 + 0.9);
    const [x, y] = sx + sy > sx2 + sy2 ? [sx, sy] : [sx2, sy2];   // ближняя к камере обочина — указатель виден
    if (at(Math.floor(x), Math.floor(y)) === '.' && U(Math.floor(x), Math.floor(y)) !== 4) put('signpost', x, y, { rot: Math.atan2(p.tx, p.ty) });
  }
  // ---- лампы вдоль главных улиц (на ближней стороне), каждые ~10 м
  for (const r of roads.filter(r => r.main)) {
    let last = -99;
    for (const p of r.line) {
      if (p.s - last < 10 || Math.hypot(p.x - CX, p.y - CY) < 9) continue;
      const nx = p.ty, ny = -p.tx, sg = nx + ny > 0 ? 1 : -1, k = r.w / 2 + 0.7, x = p.x + nx * sg * k, y = p.y + ny * sg * k;
      if (at(Math.floor(x), Math.floor(y)) !== '.' || U(Math.floor(x), Math.floor(y)) > 1 || nearPortal(x, y, 3)) continue;
      put('lamp', x, y); last = p.s;
    }
  }
  // ---- мост: настил над тайлами 'b', на том берегу — завал из брёвен и табличка: дальше дороги нет
  if (bridges.length) {
    const xs = bridges.map(b => b.x), ys = bridges.map(b => b.y), bx0 = Math.min(...xs), bx1 = Math.max(...xs) + 1, by = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
    // ширина моста = проходимая полоса тайлов 'b': перила стоят ровно по её краю — за них не выйти
    const bw = Math.max(...ys) - Math.min(...ys) + 1;
    put('bridge', (bx0 + bx1) / 2, by, { len: bx1 - bx0 + 1.2, nocol: 1, opts: { w: bw } });
    put('barricade', bx1 + 0.35, by, { rot: Math.PI / 2 });
    for (let y = Math.floor(by - 2); y <= by + 2; y++) if (at(bx1, y) === ';' || at(bx1, y) === 'n' || at(bx1, y) === 'x') set(bx1, y, 'n');
    // лес у дальнего конца моста — реже (луг вместо чащи), иначе кроны на переднем плане закрывают завал
    for (let y = Math.floor(by - 5); y <= by + 5; y++) for (let x = bx1; x < W; x++) if (at(x, y) === 'x' && Math.hypot(x - bx1, y - by) < 5.5) set(x, y, 'n');
  }
  // ---- берега: камни и камыш (не на мосту)
  for (const p of stream) if (hh(p.x, p.y, 21) < 0.08 && !bridges.some(b => Math.hypot(b.x + 0.5 - p.x, b.y + 0.5 - p.y) < 5)) { const sgn = hh(p.y, p.x) < 0.5 ? 1 : -1, r = sw(p.s, p.y) / 2 + 0.3, x = p.x + sgn * r, y = p.y; const c = at(Math.floor(x), Math.floor(y)); if ((c === '.' || c === 'n') && U(Math.floor(x), Math.floor(y)) !== 1) put(hh(x, y) < 0.5 ? 'rocks' : 'reeds', x, y, { nocol: 1 }); }

  // ---- за рекой (туда не пройти — для атмосферы): завал деревьев за табличкой и полуразрушенная водяная мельница выше по течению.
  // Камера смотрит с +x,+z: всё, что правее и ниже мельницы, её заслоняет, поэтому в «конусе взгляда» лес прореживается (viewClear).
  const mills = [], viewClear = [];
  const inClear = (x, y) => viewClear.some(c => { const dx = x - c.x, dy = y - c.y, al = (dx + dy) / Math.SQRT2, lat = Math.abs(dx - dy) / Math.SQRT2; return al > -2.5 && al < c.len && lat < c.lat; });
  if (bridges.length) {
    const xs = bridges.map(b => b.x), ys = bridges.map(b => b.y), bx1 = Math.max(...xs) + 1, by = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
    // завал за табличкой: штабель брёвен поперёк дороги, брошенная телега, бочки и доски
    put('log_stack', bx1 + 2.6, by, { rot: Math.PI / 2, nocol: 1 }); put('cart', bx1 + 3.4, by + 2.4, { rot: 2.5, nocol: 1 });
    put('barrel_stack', bx1 + 2.4, by - 2.3, { rot: 0.3, nocol: 1 }); put('plank_pile', bx1 + 4.4, by - 0.6, { rot: 1.2, nocol: 1 });
    viewClear.push({ x: bx1 + 3.4, y: by + 0.2, len: 12, lat: 4.5 });   // завал видно с моста: лес перед ним (ближе к камере) прореживается
    const ym = Math.round(ST.millY);
    if (ym > 4 && streamX[ym] > 0) {
      const sx = streamX[ym], shw = streamHW[ym], mw = 4.4, md = 5.4, mx = sx + shw + 0.4 + mw / 2, my = ym - 1.4;   // дом вдоль ручья; колесо — в воде у берега, южнее дома (его видно камере)
      const opts = { mw, md, wx: +(sx + shw - 1.25 - mx).toFixed(2), wz: +(md / 2 + 0.7).toFixed(2) };   // колесо целиком в воде у дальнего берега
      put('mill_ruin', mx, my, { rot: 0, nocol: 1, opts });
      mills.push({ x: mx, y: my });
      for (let y = Math.floor(my - md / 2 - 1.5); y <= my + md / 2 + 1.5; y++) for (let x = Math.floor(mx - mw / 2 - 0.5); x <= mx + mw / 2 + 1.5; x++) if (at(x, y) !== '~') { set(x, y, 'n'); setU(x, y, 4); }
      viewClear.push({ x: mx, y: my + 1, len: 17, lat: 5.5 });
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === 'x' && inClear(x + 0.5, y + 0.5)) set(x, y, 'n');
  }

  // ---- деревья: рощи в остатках земли (шум задаёт пятна), не ближе 2,4 м друг к другу, не загораживают NPC и порталы
  const trees = [];
  for (let i = 0; i < 4000 && trees.length < 90; i++) {
    const x = 3 + R() * (W - 6), y = 3 + R() * (H - 6), tx = Math.floor(x), ty = Math.floor(y), c = at(tx, ty), u = U(tx, ty);
    if (!(c === '.' || c === 'n') || (u !== 0 && u !== 3) || nearPortal(x, y, 6.2)) continue;
    const grove = vnoise(x * 0.14, y * 0.14, 31), far = c === 'n' ? 0.55 : 0;
    if (grove + far < 0.58) continue;
    let ok = true; for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3; dx++) { const uu = U(tx + dx, ty + dy); if (uu === 1 || uu === 4 || uu === 6 || at(tx + dx, ty + dy) === '~' || at(tx + dx, ty + dy) === 'b') { ok = false; break; } }
    if (!ok || trees.some(t => (t.x - x) ** 2 + (t.y - y) ** 2 < 3.4 * 3.4) || inClear(x, y) || mills.some(m => Math.hypot(m.x - x, m.y - y) < 5.5)) continue;
    if (c === 'n' && bridges.some(b => Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y) < 7.5)) continue;   // у моста на том берегу — опушка: видно завал и уходящую дорогу
    { let road = false; for (let dy = -2; dy <= 2 && !road; dy++) for (let dx = -2; dx <= 2; dx++) if (at(tx + dx, ty + dy) === ';') { road = true; break; } if (road) continue; }
    const tb = { x, y, w: 2.6, d: 2.6, h: 6 };
    if (targets.some(t => occludes(tb, t))) continue;
    trees.push({ x, y }); put(hh(x, y, 2) < 0.62 ? 'tree_0' : 'tree_1', x, y, c === 'n' ? { nocol: 1 } : {});
  }
  // одинокие деревья позади домов (обрамление силуэта, за домом их не видно камере — не мешают)
  for (const b of buildings.filter(b => b.house || b.kind === 'tavern')) {
    for (const u of [-b.w / 2 - 0.6, b.w / 2 + 0.8]) { const [x, y] = side(b, u, -b.d / 2 - 1.8); const tx = Math.floor(x), ty = Math.floor(y); if (at(tx, ty) === '.' && (U(tx, ty) === 0 || U(tx, ty) === 5) && hh(x, y, 5) < 0.7 && !trees.some(t => (t.x - x) ** 2 + (t.y - y) ** 2 < 11)) { trees.push({ x, y }); put('tree_0', x, y); } }
  }

  const P0 = plan.portals;
  // ---- проверка: связность от старта до NPC и порталов (тайлы + коллайдеры зданий), закрытость камерой
  const solid = c => c === 'x' || c === '~' || c === 'F' || c === 'V' || c === 'K' || c === 'n' || c === ';';
  // ---- зазоры: два препятствия либо вплотную, либо с проходом ≥ GAP; иначе убираем менее важное (мелочь раньше деревьев)
  {
    const shapeOf = o => { if (o.nocol) return null; if (o.boxes) return o.boxes.map(b => ({ b })); const c = COL[o.t]; if (c === undefined) return null; if (typeof c === 'number') return [{ c: [o.x, o.y, c] }]; const sw2 = o.rot && Math.abs(Math.sin(o.rot)) > 0.7, [hx, hy] = sw2 ? [c[1], c[0]] : c; return [{ b: [o.x - hx, o.y - hy, o.x + hx, o.y + hy] }]; };
    const prio = I => ({ pumpkins: 0, plank_pile: 0, tool_stand: 1, cart: 1, cart_load: 2, barrel_stack: 1, log_stack: 1, signpost: 2, barrel: 0, crate: 0, sacks: 0, logpile: 0, hay: 0, rocks: 0, crystals: 1, tree_0: 1, tree_1: 1, grave: 1, deadtree: 1, bench: 2, table: 2, dummy: 3, target: 3, weapon_rack: 3 })[I.o.t] ?? 2;
    const items = objects.map(o => ({ o, sh: shapeOf(o), keep: KEEP.has(o.t) || !!o.boxes })).filter(i => i.sh);
    for (const n of npcs) items.push({ o: n, sh: [{ c: [n.x, n.y, 0.35] }], keep: true });
    for (const dx of [-1.7, 1.7]) items.push({ o: { t: 'hwsign' }, sh: [{ c: [hwsign[0] + dx, hwsign[1], 0.45] }], keep: true });
    for (const p of portals) items.push({ o: p, sh: [{ c: [p.x, p.y, 0.3] }], keep: true });
    for (const I of items) { const bb = I.sh.map(q => q.c ? [q.c[0] - q.c[2], q.c[1] - q.c[2], q.c[0] + q.c[2], q.c[1] + q.c[2]] : q.b); I.bb = [Math.min(...bb.map(b => b[0])), Math.min(...bb.map(b => b[1])), Math.max(...bb.map(b => b[2])), Math.max(...bb.map(b => b[3]))]; }
    const dPB = (c, b) => Math.hypot(Math.max(b[0] - c[0], 0, c[0] - b[2]), Math.max(b[1] - c[1], 0, c[1] - b[3]));
    const gapSS = (a, b) => {
      if (a.c && b.c) return Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]) - a.c[2] - b.c[2];
      if (a.c) return dPB(a.c, b.b) - a.c[2]; if (b.c) return dPB(b.c, a.b) - b.c[2];
      const gx = Math.max(b.b[0] - a.b[2], a.b[0] - b.b[2]), gy = Math.max(b.b[1] - a.b[3], a.b[1] - b.b[3]);
      return gx > 0 && gy > 0 ? Math.hypot(gx, gy) : Math.max(gx, gy);
    };
    const near = (A, B) => !(B.bb[0] > A.bb[2] + GAP || A.bb[0] > B.bb[2] + GAP || B.bb[1] > A.bb[3] + GAP || A.bb[1] > B.bb[3] + GAP);
    const gapI = (A, B) => { let g = 9; for (const a of A.sh) for (const b of B.sh) g = Math.min(g, gapSS(a, b)); return g; };
    const gapTiles = I => { let g = 9; for (const q of I.sh) { const [cx, cy] = q.c ? q.c : [(q.b[0] + q.b[2]) / 2, (q.b[1] + q.b[3]) / 2]; for (let y = Math.floor(cy) - 3; y <= cy + 3; y++) for (let x = Math.floor(cx) - 3; x <= cx + 3; x++) if (solid(at(x, y))) g = Math.min(g, gapSS(q, { b: [x, y, x + 1, y + 1] })); } return g; };
    const bad = g => g > 0.12 && g < GAP;
    let removed = 0;
    for (let pass = 0; pass < 5; pass++) {
      let changed = false;
      for (let i = 0; i < items.length; i++) {
        const A = items[i]; if (A.dead) continue;
        if (!A.keep && bad(gapTiles(A))) { A.dead = true; changed = true; removed++; continue; }
        for (let j = i + 1; j < items.length; j++) {
          const B = items[j]; if (B.dead || (A.keep && B.keep) || !near(A, B)) continue;
          if (!bad(gapI(A, B))) continue;
          const v = A.keep ? B : B.keep ? A : prio(A) <= prio(B) ? A : B; v.dead = true; changed = true; removed++; if (v === A) break;
        }
      }
      if (!changed) break;
    }
    const dead = new Set(items.filter(i => i.dead).map(i => i.o));
    for (let i = objects.length - 1; i >= 0; i--) if (dead.has(objects[i])) objects.splice(i, 1);
    // остаток: пары «ключевых» предметов (NPC у своих построек, порталы), между которыми не пройти (< 1,3 м), — в предупреждения
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const A = items[i], B = items[j]; if (A.dead || B.dead || !near(A, B)) continue; const gg = gapI(A, B); if (gg > 0.12 && gg < 1.3 && A.o !== B.o) warn.push(`тесно: ${A.o.t || A.o.id}–${B.o.t || B.o.id} ${gg.toFixed(2)} м`); }
    var gapRemoved = removed;
  }
  // ---- куры и собаки: стайки у домов ближе к площади и у таверны, собака у кузницы и собака на площади
  const critters = [];
  for (const b of buildings.filter(b => b.house).sort((a, b) => Math.hypot(a.x - CX, a.y - CY) - Math.hypot(b.x - CX, b.y - CY)).slice(0, 3)) { const [x, y] = front(b, 1.4); for (let i = 0; i < 3; i++) critters.push({ k: 'chicken', x: +(x + (i - 1) * 0.7).toFixed(2), y: +(y + (i % 2) * 0.5).toFixed(2), r: 3 }); }
  if (tavern) { const [x, y] = side(tavern, -tavern.w / 2 - 1.8, tavern.d / 2 + 1.4); for (let i = 0; i < 4; i++) critters.push({ k: 'chicken', x: +(x + (i % 2) * 0.7).toFixed(2), y: +(y + (i >> 1) * 0.6).toFixed(2), r: 3.2 }); }
  if (smithy) { const [x, y] = side(smithy, -smithy.w / 2 + 0.6, smithy.d / 2 + 2.2); critters.push({ k: 'dog', x: +x.toFixed(2), y: +y.toFixed(2), r: 4, coat: 0 }); }
  critters.push({ k: 'dog', x: +(CX + 2.5).toFixed(2), y: +(CY + SQ.hh + 1.6).toFixed(2), r: 6, coat: 1 });
  const blk = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) blk[y * W + x] = solid(g[y][x]) ? 1 : 0;
  for (const o of objects) if (o.boxes) for (const [x0, y0, x1, y1] of o.boxes) for (let y = Math.floor(y0 + 0.3); y < y1 - 0.3; y++) for (let x = Math.floor(x0 + 0.3); x < x1 - 0.3; x++) if (x >= 0 && y >= 0 && x < W && y < H) blk[y * W + x] = 1;
  const dist = new Int16Array(W * H).fill(-1), q = [];
  const s0 = Math.floor(plan.start[1]) * W + Math.floor(plan.start[0]); dist[s0] = 0; q.push(s0);
  while (q.length) { const i = q.shift(), x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (blk[j] || dist[j] >= 0) continue; dist[j] = dist[i] + 1; q.push(j); } }
  const reach = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = Math.floor(x) + dx, Y = Math.floor(y) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && dist[Y * W + X] >= 0) return true; } return false; };
  for (const n of npcs) if (!reach(n.x, n.y)) warn.push('не дойти до ' + n.id);
  for (const p of portals) if (!reach(p.x, p.y)) warn.push('не дойти до портала ' + p.id);
  for (const b of buildings) for (const t of [...npcs, ...portals]) if (occludes(b, t) && b.kind !== 'church') warn.push(b.kind + ' закрывает ' + (t.id || '?'));
  if (warn.length && typeof console !== 'undefined') console.warn('[деревня] ' + warn.join('; '));

  // портал катакомб есть всегда; остальные добавляет игра по прогрессу (здесь только координаты)
  put('portal', P0.catacombs[0], P0.catacombs[1]);
  const P = plan.portals;
  return {
    w: W, h: H, name: 'Деревня Ордена', floor: { w: 0, h: 0, scale: 1, ox: 0, chunks: [] }, village: true,
    rows: g.map(r => r.join('')), objects, npcs, start: plan.start, critters, viewClear, center: [CX, CY],
    big: { castle: P.castle, survportal: P.survival, depths: P.depths, fjord: P.fjord, bones: P.bones, forest: P.forest, hwsign, catacombs: P.catacombs },
    gen: { buildings: buildings.map(b => ({ kind: b.kind, x: +b.x.toFixed(1), y: +b.y.toFixed(1), rot: +b.rot.toFixed(2) })), fields: fields.map(f => ({ ...f })), gapRemoved, warn },
  };
}
