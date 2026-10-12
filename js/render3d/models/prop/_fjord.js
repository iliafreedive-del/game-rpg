// Фьорды (правки 5): «совсем там мало всего, убери круглые камни, скалы по краям, лодки викингов с полосатыми парусами, полуразвалившиеся».
// Камни и утёсы — без нарисованной фактуры (правки 5: «не надо как в клеточку подземелья»), только цвет граней и снег
// Угловатые сине-серые скалы со снежными шапками (вместо круглых валунов rocks), высокие утёсы для кромки над бездной,
// рунные камни, разбитые драккары с рваным полосатым парусом и перевёрнутые лодки. Всё batch и низкополигональное.
const SNOW = 0xeef4fa;

// пик как на референсе пользователя: тёмно-серый гранёный конус, снег только на макушке (резкая граница), снежная «юбка» у подножия
const DARK = [0x3a3f48, 0x434852, 0x353a42];
function peak(kit, L, seed, r, h, x = 0, z = 0, skirt = true) {
  const { THREE, geo } = kit, R = geo.rng(seed), g = new THREE.ConeGeometry(r, h, 7, 3);
  geo.jitter(g, r * 0.2, R); g.rotateY(R() * 6.28); g.translate(x, h / 2 - 0.05, z);
  const s0 = h * (0.52 + R() * 0.12); L.push(geo.paint(g, DARK[seed % 3], { top: SNOW, y0: s0, y1: s0 + h * 0.05 }));
  if (skirt) { const k = new THREE.CylinderGeometry(r * 1.15, r * 1.4, 0.14, 8, 1); geo.jitter(k, r * 0.12, R); k.translate(x, 0.03, z); L.push(geo.paint(k, 0xdfe8f2, { top: SNOW })); }
}
// утёс: главный пик и 1–3 пика поменьше вокруг
function crag(kit, L, seed, peaks) { peaks.forEach(([r, h, x, z], i) => peak(kit, L, seed + i * 13, r, h, x, z, i === 0)); }
const def = (id, fn, extra = {}) => ({ id, kind: 'prop', batch: true, outline: false, tint: 0.12, ao: 0.7, aoH: 1.1, ...extra,
  build(kit) { const L = []; fn(kit, L); const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(kit.merge(L), kit.propMat(this))); return { root }; } });

// камни поля (замена круглых rocks): невысокие гранёные пики, макушка в снегу
const slab = (id, seed, peaks) => def(id, (kit, L) => crag(kit, L, seed, peaks));

// рунный камень: плоская плита с высеченной светящейся руной и шапкой снега
const runestone = def('fj_runestone', (kit, L) => {
  const { THREE, geo, part } = kit, R = geo.rng(91);
  const g = new THREE.BoxGeometry(0.9, 1.9, 0.32, 1, 3, 1); geo.jitter(g, 0.07, R); g.translate(0, 0.9, 0); g.rotateZ(0.06);
  L.push(geo.paint(g, 0x303844, { top: 0x7a8696 }));
  L.push(part(new THREE.BoxGeometry(0.95, 0.12, 0.38), SNOW, [0.05, 1.86, 0], [0, 0, 0.08]));
  for (const [x, y, w, h, a] of [[0, 1.25, 0.05, 0.55, 0], [0, 1.38, 0.05, 0.26, 0.8], [0, 1.38, 0.05, 0.26, -0.8], [0, 0.78, 0.05, 0.3, 0.5], [0, 0.78, 0.05, 0.3, -0.5]])
    L.push(part(new THREE.BoxGeometry(w, h, 0.02), 0x8ad8ff, [x + 0.05, y, 0.17], [0, 0, a], 1, { emit: true }));
  L.push(part(new THREE.CylinderGeometry(0.5, 0.65, 0.18, 6), 0x2c3440, [0, 0.05, 0], 0, 1, { top: SNOW }));
}, { tint: 0.08 });

// корпус драккара: кольца-шпангоуты вдоль длины (X), борта сходятся к носу и корме, концы задраны вверх.
// skip(i, j) — выломанные доски (пробоина)
function hull(kit, len, wid, dep, skip = () => false) {
  const { THREE } = kit, N = 18, M = 6, P = [], I = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N * 2 - 1, w = wid * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 1.8)), 0.55) + 0.03, d = dep * (1 - 0.35 * t * t), sh = 0.55 * Math.pow(t, 4);
    for (let j = 0; j <= M; j++) { const a = (j / M - 0.5) * Math.PI; P.push(t * len / 2, dep - Math.cos(a) * d + sh + (1 - Math.cos(a)) * sh * 0.4, Math.sin(a) * w); }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { if (skip(i, j)) continue; const a = i * (M + 1) + j, b = a + 1, c = a + M + 1, d = c + 1; I.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g;
}
const SHIELD = [0xb8282a, 0xe8dcc0, 0x2a4a8a, 0xd6a548];

// разбитый драккар: корпус накренился и ушёл в снег, в борту пробоина, мачта сломана и завалилась, рваный полосатый парус,
// щиты по борту (часть сорвана), нос с завитком, рядом оторванные доски. Длинная ось — X (≈7,2 м)
const longship = def('fj_longship', (kit, L) => {
  const { THREE, geo, part, tube } = kit, R = geo.rng(77), LEN = 7.2, WID = 1.15, DEP = 0.95;
  const H = [];
  H.push(geo.paint(hull(kit, LEN, WID, DEP, (i, j) => i >= 10 && i <= 12 && j >= 4), 0x4a3020, { top: 0x7a5434, tex: 'woodH' }));
  for (let i = 1; i < 18; i += 2) { const t = i / 18 * 2 - 1, x = t * LEN / 2, w = WID * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 1.8)), 0.55); if (i === 11) continue; H.push(part(new THREE.BoxGeometry(0.09, 0.07, w * 2), 0x5a3a24, [x, DEP + 0.5 * Math.pow(t, 4) - 0.1, 0], 0, 1, { tex: 'wood' })); }   // скамьи гребцов
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) {   // щиты по борту; у пробоины сорваны
    const t = -0.62 + k * 0.2; if (s > 0 && (k === 4 || k === 5)) continue; if (R() < 0.15) continue;
    const x = t * LEN / 2, w = WID * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 1.8)), 0.55) + 0.05, c = SHIELD[(k + (s > 0 ? 1 : 0)) % 4];
    H.push(part(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 10), c, [x, DEP + 0.5 * Math.pow(t, 4) - 0.08, s * w], [Math.PI / 2 + s * 0.15, 0, (R() - 0.5) * 0.4], 1, { tex: 'wood' }));
    H.push(part(new THREE.SphereGeometry(0.07, 6, 4), 0x8a8a90, [x, DEP + 0.5 * Math.pow(t, 4) - 0.08, s * (w + 0.03)], 0, [1, 1, 0.5], { tex: 'iron' }));
  }
  // нос — завиток (голова змея), корма — простой завиток
  H.push(tube([[LEN / 2 - 0.05, DEP + 0.5, 0], [LEN / 2 + 0.25, DEP + 1.1, 0], [LEN / 2 + 0.15, DEP + 1.6, 0], [LEN / 2 - 0.15, DEP + 1.7, 0]], 0.12, 0.07, 0x4a3020, { top: 0x7a5434, tex: 'wood' }, 6));
  H.push(part(new THREE.ConeGeometry(0.11, 0.35, 5), 0x6a4a2a, [LEN / 2 - 0.3, DEP + 1.66, 0], [0, 0, Math.PI / 2 + 0.3], 1, { tex: 'wood' }));
  H.push(tube([[-LEN / 2 + 0.05, DEP + 0.5, 0], [-LEN / 2 - 0.2, DEP + 1.0, 0], [-LEN / 2 - 0.05, DEP + 1.35, 0]], 0.11, 0.05, 0x4a3020, { top: 0x7a5434, tex: 'wood' }, 6));
  // сломанная мачта: обломок торчит, верх с реем и парусом завалился за борт
  H.push(part(new THREE.CylinderGeometry(0.1, 0.12, 1.5, 7), 0x4a3424, [0.3, DEP + 0.6, 0], 0, 1, { top: 0x8a6a48, tex: 'wood' }));
  const mast = [], sail = [];
  mast.push(part(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 7), 0x4a3424, [0, 1.6, 0], 0, 1, { tex: 'wood' }));
  mast.push(part(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), 0x4a3424, [0, 3.0, 0], [0, 0, Math.PI / 2], 1, { tex: 'wood' }));   // рей
  // парус: вертикальные полосы красный/белый, нижний край рваный, полотнище провисает
  const SW = 3.2, SH = 2.3, NS = 8;
  for (let k = 0; k < NS; k++) {
    const x0 = -SW / 2 + k * SW / NS, x1 = x0 + SW / NS, torn = 0.35 + R() * (k % 3 === 1 ? 1.1 : 0.5), g = new THREE.PlaneGeometry(SW / NS, SH - torn, 1, 3);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i), v = (yy + (SH - torn) / 2) / (SH - torn); p.setZ(i, Math.sin((1 - v) * Math.PI * 0.8) * 0.35 + (R() - 0.5) * 0.05); if (v < 0.01) p.setY(i, yy + (R() - 0.5) * 0.25); }
    g.translate(x0 + SW / NS / 2, 2.95 - (SH - torn) / 2, 0.05);
    sail.push(geo.paint(g, k % 2 ? 0xe8dcc8 : 0x9a1e1e, { tex: 'cloth' }));
  }
  const top = kit.merge([...mast, ...sail]);
  top.rotateX(1.25); top.rotateY(0.35); top.translate(0.3, DEP + 1.1, 0.25);   // верх мачты рухнул поперёк борта
  H.push(top);
  // корпус накренён и ушёл в снег по скулу
  for (const g of H) { g.rotateX(0.2); g.rotateZ(0.04); g.translate(0, -0.35, 0); L.push(g); }
  // оторванные доски и бочонок рядом, сугроб у борта
  for (let k = 0; k < 4; k++) L.push(part(new THREE.BoxGeometry(1.1 + R() * 0.6, 0.05, 0.2), 0x5a3a24, [-1.5 + k * 1.1 + R() * 0.3, 0.04, 1.6 + R() * 0.5], [0, R() * 1.5, (R() - 0.5) * 0.2], 1, { top: 0x7a5434, tex: 'woodH' }));
  L.push(part(new THREE.SphereGeometry(1, 9, 5, 0, 6.283, 0, Math.PI / 2), 0xd8e4f0, [0.6, -0.05, -1.05], 0, [2.6, 0.45, 0.7], { top: SNOW }));
  L.push(part(new THREE.CylinderGeometry(0.26, 0.26, 0.6, 8), 0x5a3a24, [2.3, 0.26, 1.5], [Math.PI / 2, 0.6, 0], 1, { tex: 'wood' }));
}, { side: 'double', tint: 0.05, aoH: 1.6 });

// перевёрнутая лодка: днище кверху, в нём дыра, рядом весло
const boat = def('fj_boat', (kit, L) => {
  const { THREE, geo, part } = kit, R = geo.rng(19);
  const g = geo.paint(hull(kit, 3.2, 0.62, 0.5, (i, j) => i >= 6 && i <= 7 && j === 3), 0x4a3020, { top: 0x6a4a2c, tex: 'woodH' });
  g.rotateX(Math.PI); g.translate(0, 0.62, 0); g.rotateZ(0.08); L.push(g);
  L.push(part(new THREE.BoxGeometry(2.0, 0.04, 0.1), 0x6a4a2c, [0.4, 0.04, 0.95], [0, 0.4, 0], 1, { tex: 'wood' }), part(new THREE.BoxGeometry(0.4, 0.03, 0.18), 0x6a4a2c, [1.35, 0.04, 1.35], [0, 0.4, 0], 1, { tex: 'wood' }));
  L.push(part(new THREE.SphereGeometry(1, 8, 4, 0, 6.283, 0, Math.PI / 2), 0xd8e4f0, [-0.3, 0.05, -0.1], 0, [1.6, 0.3, 0.9], { top: SNOW }));
  for (let k = 0; k < 2; k++) L.push(part(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 10), SHIELD[k * 2], [-1.6 - k * 0.4, 0.03, 0.6 + k * 0.3], [0, 0, 0], 1, { tex: 'wood' }));
  void R;
}, { side: 'double', tint: 0.06 });

// второй референс пользователя: серые слоистые камни разной формы (плиты, уступы, осколки-шпили, глыбы), снег лежит на верхних гранях.
// Снег — цвет вершин по нормали грани (вверх смотрит — белая), без текстур
function snowy(kit, g, rock, seed, k = 0.55) {
  const { THREE, geo } = kit, R = geo.rng(seed), n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); n.computeVertexNormals();
  const p = n.attributes.position, col = new Float32Array(p.count * 4), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), cr = new THREE.Color(), cs = new THREE.Color(0xe4f0fa);
  for (let f = 0; f < p.count; f += 3) {
    a.fromBufferAttribute(p, f); b.fromBufferAttribute(p, f + 1); c.fromBufferAttribute(p, f + 2); const ny = b.sub(a).cross(c.sub(a)).normalize().y;
    const v = 0.85 + R() * 0.3, snow = ny > k - R() * 0.15; cr.set(rock).multiplyScalar(v); const C = snow ? cs : cr;
    for (let j = 0; j < 3; j++) col.set([C.r, C.g, C.b, 1], (f + j) * 4);
  }
  n.setAttribute('color', new THREE.BufferAttribute(col, 4)); return n;
}
const STONE = [0x5a5650, 0x4e4c48, 0x625c54];
const box = (THREE, w, h, d, x, y, z, ry = 0, rz = 0) => new THREE.BoxGeometry(w, h, d, 2, 2, 2).rotateZ(rz).rotateY(ry).translate(x, y, z);
const stone = (id, seed, fn) => def(id, (kit, L) => { const { THREE, geo } = kit, R = geo.rng(seed); fn(THREE, R).forEach((g, i) => { geo.jitter(g, 0.12, geo.rng(seed + i)); L.push(snowy(kit, g, STONE[(seed + i) % 3], seed + i * 3)); }); }, { tint: 0.1 });
const STONES = [
  stone('fj_stone_ledge', 31, (T, R) => [box(T, 1.6, 0.35, 1.1, 0, 0.17, 0, 0.2), box(T, 1.2, 0.3, 0.8, 0.15, 0.48, -0.05, 0.5), box(T, 0.7, 0.28, 0.5, -0.1, 0.76, 0.05, 0.1)]),   // слоистый уступ
  stone('fj_stone_slab', 37, (T, R) => [box(T, 1.5, 0.4, 0.9, 0, 0.2, 0, 0.3, 0.12), box(T, 0.6, 0.3, 0.5, 0.5, 0.45, 0.1, 0.9, -0.1)]),   // наклонная плита
  stone('fj_stone_shard', 43, (T, R) => [box(T, 0.55, 2.2, 0.5, 0, 1.1, 0, 0.3, 0.06), box(T, 0.4, 1.6, 0.4, 0.38, 0.8, 0.15, 0.8, -0.1), box(T, 0.35, 1.2, 0.35, -0.3, 0.6, 0.2, 1.3, 0.12), box(T, 0.3, 0.9, 0.3, 0.1, 0.45, -0.35, 0.4, 0)]),   // шпиль из осколков
  stone('fj_stone_chunk', 53, (T, R) => [box(T, 0.9, 0.8, 0.8, 0, 0.4, 0, 0.4, 0.08), box(T, 0.6, 0.5, 0.55, 0.45, 0.25, 0.3, 1.1)]),   // глыба
  stone('fj_stone_block', 61, (T, R) => [box(T, 0.7, 1.5, 0.6, 0, 0.75, 0, 0.2, 0.05), box(T, 0.5, 0.6, 0.5, 0.35, 0.3, 0.25, 0.7)]),   // столб
];

export const FJORD_PROPS = [
  slab('fj_rock_a', 3, [[0.55, 1.0, 0, 0], [0.3, 0.55, 0.55, 0.25]]), slab('fj_rock_b', 8, [[0.45, 1.3, 0, 0]]), slab('fj_rock_c', 14, [[0.5, 0.8, 0, 0], [0.32, 0.6, -0.45, 0.3], [0.22, 0.35, 0.3, -0.4]]),
  def('fj_crag', (kit, L) => crag(kit, L, 5, [[1.3, 3.6, 0, 0], [0.7, 1.8, 1.0, 0.5]])),
  def('fj_crag_b', (kit, L) => crag(kit, L, 9, [[1.1, 4.2, 0, 0], [0.8, 2.6, -0.9, 0.6], [0.5, 1.4, 0.8, -0.7]])),
  def('fj_crag_c', (kit, L) => crag(kit, L, 17, [[1.5, 3.0, 0, 0], [1.0, 2.3, 1.3, -0.2], [0.9, 2.0, -1.2, 0.3], [0.6, 1.2, 0.2, 1.0]])),   // гряда-стена
  runestone, longship, boat, ...STONES,
];
export const FJ_ROCKS = [['fj_rock_a', 1], ['fj_rock_b', 1], ['fj_rock_c', 1], ['fj_stone_ledge', 1], ['fj_stone_slab', 1], ['fj_stone_shard', 0.8], ['fj_stone_chunk', 1], ['fj_stone_block', 0.8]];
export const FJ_CRAGS = [['fj_crag', 1], ['fj_crag_b', 1], ['fj_crag_c', 1.2], ['fj_stone_shard', 0.6]];
