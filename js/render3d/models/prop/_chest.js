// Сундук: доски с фасками, железные полосы с заклёпками, замок. open — крышка откинута, внутри темно, блестят монеты (правки 4).
// rich — сундук Ордена: тёмно-фиолетовый, латунные полосы, самоцвет Бездны.
export function chest(kit, def, { open = false, rich = false } = {}) {
  const { THREE, PAL, part, merge, bbox, geo } = kit, L = [];
  const WD = rich ? 0x3a2a7a : 0x9a5a26, WDL = rich ? 0x8a6ae0 : 0xe8aa58, BAND = rich ? 0xc8921c : 0xc8921c, BANDL = rich ? 0xffe070 : 0xffd860, W = rich ? 0.95 : 0.85, D = rich ? 0.6 : 0.55;
  // правки 4 (П4-13): открытый — полый: стенки, а внутри темнота, по дну блестят монеты и самоцветы (раньше сверху была сплошная
  // крышка короба с текстурой досок — «нарисованные кирпичи»)
  const T = 0.06;
  if (!open) L.push(bbox(W, 0.45, D, 0.03, WD, [0, 0.225, 0], 0, { top: WDL, tex: 'woodH' }));
  else {
    for (const z of [-1, 1]) L.push(bbox(W, 0.45, T, 0.015, WD, [0, 0.225, z * (D - T) / 2], 0, { top: WDL, tex: 'woodH' }));
    for (const x of [-1, 1]) L.push(bbox(T, 0.45, D, 0.015, WD, [x * (W - T) / 2, 0.225, 0], 0, { top: WDL, tex: 'woodH' }));
    L.push(...chestInside(THREE, part, { w: W - 2 * T, d: D - 2 * T, y0: 0.2, y1: 0.43, rich, gem: PAL.abyss }));
  }
  for (const x of [-W * 0.32, W * 0.32]) {
    if (!open) L.push(bbox(0.08, 0.47, D + 0.02, 0.01, BAND, [x, 0.235, 0], 0, { top: BANDL, tex: 'gold' }));
    else for (const z of [-1, 1]) L.push(bbox(0.08, 0.47, T + 0.02, 0.01, BAND, [x, 0.235, z * (D - T) / 2], 0, { top: BANDL, tex: 'gold' }));   // полосы не перекрывают проём
  }
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) L.push(bbox(0.08, 0.47, 0.08, 0.015, BAND, [x, 0.235, z], 0, { top: BANDL, tex: 'gold' }));
  // крышка-полуцилиндр на петлях вдоль задней кромки
  const lid = [part(new THREE.CylinderGeometry(D / 2, D / 2, W, 12, 1, false, 0, Math.PI), WD, [0, 0, 0], [0, 0, Math.PI / 2], 1, { top: WDL, tex: 'woodH' }),
    ...[-W * 0.32, W * 0.32].map(x => part(new THREE.CylinderGeometry(D / 2 + 0.01, D / 2 + 0.01, 0.08, 12, 1, false, 0, Math.PI), BAND, [x, 0, 0], [0, 0, Math.PI / 2], 1, { top: BANDL, tex: 'gold' }))];
  lid.push(part(new THREE.BoxGeometry(W - 0.02, 0.03, D - 0.02), rich ? 0x1e1640 : 0x3a2412, [0, 0.015, 0], 0, 1, { top: rich ? 0x2a2050 : 0x4a2e16 }));   // днище крышки: открытый сундук не «прозрачный»; правки 3 — гладкое тёмное, без досок
  const LID = [];
  for (const g of lid) { g.translate(0, 0, D / 2); if (open) g.rotateX(-1.9); g.translate(0, 0.45, -D / 2); LID.push(g); }
  if (!open) L.push(bbox(0.16, 0.18, 0.05, 0.01, 0xd8a020, [0, 0.4, D / 2 + 0.02], 0, { top: 0xffe890, emit: true }), part(new THREE.SphereGeometry(0.025, 5, 4), 0x0c0a08, [0, 0.38, D / 2 + 0.05]));
  if (rich) L.push(part(new THREE.OctahedronGeometry(0.07, 0), PAL.abyss, [0, 0.3, D / 2 + 0.03], 0, [1, 1.3, 0.5], { emit: true }));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def)), new THREE.Mesh(merge(LID), kit.propMat({ ...def, side: 'double' }))); root.scale.setScalar(1.3); return { root };   // крышка двусторонняя — изнутри тоже видна
}

// Внутренность открытого сундука (правки 4, П4-13): тёмная полость — стенки и дно почти чёрные, на дне горка добра,
// на ней блестят монеты (светятся сами), два самоцвета и кубок, по кромке — золотая кайма. w × d — проём, y0 — дно, y1 — кромка.
// Общая для процедурных сундуков и сундуков-моделей пустошей и храма (bonesglb.js, templeglb.js). ~250 треугольников.
export function chestInside(THREE, part, { w, d, y0, y1, rich = false, gem = 0x9a4aff, trim = true, shell = null }) {
  const IN = rich ? 0x0c0818 : 0x0e0905, GOLD = 0xffc838, h = y1 - y0, L = [], c = Math.min(w, d * 1.4);
  // shell — цвет наружной стороны полости (у сундука-модели стенки в щелях между шкурами — снаружи не должно быть чёрного ящика)
  for (const [k, c2, e] of shell != null ? [[0, IN, 0], [1, shell, 0.012]] : [[0, IN, 0]]) {
    for (const z of [-1, 1]) L.push(part(new THREE.BoxGeometry(w + 2 * e, h, 0.01), c2, [0, y0 + h / 2, z * (d / 2 - 0.005 + e)], 0, 1, k ? {} : { top: IN + 0x0a0806 }));
    for (const x of [-1, 1]) L.push(part(new THREE.BoxGeometry(0.01, h, d + 2 * e), c2, [x * (w / 2 - 0.005 + e), y0 + h / 2, 0], 0, 1, k ? {} : { top: IN + 0x0a0806 }));
    L.push(part(new THREE.BoxGeometry(w + 2 * e, 0.01, d + 2 * e), c2, [0, y0 + 0.005 - e, 0]));   // дно
  }
  const hh = Math.min(h * 0.4, c * 0.2), top = y0 + hh;   // горка добра
  L.push(part(new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), rich ? 0x1a1030 : 0x1c120a, [0, y0, 0], 0, [w * 0.92, hh * 2, d * 0.9]));
  const r = c * 0.07, coins = [[-0.6, 0.3, 0.3], [-0.28, -0.25, -0.2], [0.05, 0.15, 0.5], [0.42, -0.2, -0.4], [0.7, 0.35, 0.2], [-0.1, 0.55, 0.1], [0.28, 0.5, -0.3]];
  for (const [x, z, t] of coins) L.push(part(new THREE.CylinderGeometry(r, r, r * 0.3, 7), GOLD, [x * w / 2, y0 + hh * Math.sqrt(Math.max(0, 1 - (x / 0.92) ** 2 - (z / 0.9) ** 2)) + r * 0.1, z * d / 2], [t, 0, t * 0.7], 1, { top: 0xfff0a0, emit: true }));
  L.push(part(new THREE.OctahedronGeometry(r * 1.15, 0), rich ? gem : 0xe0303a, [-0.4 * w / 2, top, -0.05 * d], [0.4, 0.3, 0], [1, 1.3, 1], { emit: true }),
    part(new THREE.OctahedronGeometry(r * 0.9, 0), rich ? 0x60e0a0 : 0x40a0ff, [0.55 * w / 2, top - hh * 0.3, 0.05 * d], [0.2, 0.8, 0.3], 1, { emit: true }),
    part(new THREE.CylinderGeometry(r * 0.9, r * 0.6, r * 2.3, 7), GOLD, [0.05 * w / 2, top + r * 0.9, -0.2 * d / 2], [0.25, 0, -0.2], 1, { top: 0xfff0a0 }));   // кубок
  if (trim) for (const z of [-1, 1]) L.push(part(new THREE.BoxGeometry(w, h * 0.06, 0.012), 0xc8921c, [0, y1 - h * 0.06, z * (d / 2 - 0.012)], 0, 1, { top: 0xffe070, tex: 'gold' }));   // узорная кайма по кромке изнутри
  return L;
}
