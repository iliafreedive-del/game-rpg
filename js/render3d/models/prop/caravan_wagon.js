// Повозка каравана Кофи (сборка 58): четырёхколёсный фургон с полосатым тентом на дугах, сбоку клетки со зверьками
// (светятся глаза), фонарь, свёрнутые ковры и сундук на крыше. Длинная ось — локальная X (дышло в +X), как у телеги _cart.js.
export default { id: 'caravan_wagon', kind: 'prop', batch: true, outline: false, build(kit) {
  const { THREE, part, merge, bbox, ball } = kit, L = [], g = x => L.push(x), W = 0x6a4a2e, WL = 0xa8804e, D = 0x3a2818, IR = 0x34343a;
  const WR = 0.5, LEN = 2.8, WID = 1.4, Y = 0.82;
  // кузов
  g(bbox(LEN, 0.14, WID, 0.03, D, [0, Y, 0], 0, { top: WL, tex: 'woodH' }));
  for (const s of [-1, 1]) { g(bbox(LEN, 0.42, 0.07, 0.02, W, [0, Y + 0.27, s * WID / 2], 0, { top: WL, tex: 'woodH' })); g(bbox(LEN * 0.96, 0.06, 0.04, 0.01, 0xd6a548, [0, Y + 0.42, s * (WID / 2 + 0.04)], 0, { top: 0xf0c868 })); }
  for (const x of [-1, 1]) g(bbox(0.07, 0.42, WID, 0.02, W, [x * LEN / 2, Y + 0.27, 0], 0, { top: WL, tex: 'woodH' }));
  // тент: полосы по дугам (сине-песочно-красные), поверх — дуги-рёбра
  const COLS = [0xe8d4a8, 0x2a5aa0, 0xe8d4a8, 0xb03a2a, 0xe8d4a8, 0x2a5aa0, 0xe8d4a8], n = COLS.length, R = WID / 2 + 0.06;
  COLS.forEach((c, i) => g(part(new THREE.CylinderGeometry(R, R, LEN / n * 1.02, 14, 1, true, 0, Math.PI), c, [-LEN / 2 + (i + 0.5) * LEN / n, Y + 0.5, 0], [0, 0, Math.PI / 2], [1.1, 1, 1], { top: c === 0xe8d4a8 ? 0xfff0d0 : c, tex: 'cloth' })));
  for (const s of [-1, 1]) g(part(new THREE.CircleGeometry(R, 14, 0, Math.PI), 0xd8c49a, [s * LEN / 2, Y + 0.5, 0], [0, s * Math.PI / 2, 0], [1, 1.1, 1], { tex: 'cloth' }));
  for (let i = 0; i <= 3; i++) g(part(new THREE.TorusGeometry(R + 0.02, 0.025, 4, 14, Math.PI), D, [-LEN / 2 + i * LEN / 3, Y + 0.5, 0], [0, Math.PI / 2, 0], [1, 1.1, 1]));
  // колёса и оси
  for (const x of [-0.9, 0.95]) {
    g(part(new THREE.CylinderGeometry(0.05, 0.05, WID + 0.3, 6), IR, [x, WR, 0], [Math.PI / 2, 0, 0]));
    for (const s of [-1, 1]) {
      g(part(new THREE.CylinderGeometry(WR, WR, 0.09, 16), W, [x, WR, s * (WID / 2 + 0.12)], [Math.PI / 2, 0, 0], 1, { top: WL, tex: 'woodH' }));
      g(part(new THREE.TorusGeometry(WR, 0.04, 4, 16), IR, [x, WR, s * (WID / 2 + 0.12)], 0, 1, { top: 0x6a6a74, tex: 'iron' }));
      g(part(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 8), 0xd6a548, [x, WR, s * (WID / 2 + 0.14)], [Math.PI / 2, 0, 0], 1, { top: 0xf0c868 }));
    }
  }
  // дышло на земле
  g(bbox(1.5, 0.08, 0.08, 0.02, D, [LEN / 2 + 0.7, 0.45, 0], [0, 0, -0.32], { top: W, tex: 'wood' })); g(bbox(0.08, 0.07, 0.7, 0.02, D, [LEN / 2 + 1.35, 0.16, 0], 0, { top: W, tex: 'wood' }));
  // клетки со зверьками у ближнего борта (+Z): прутья, внутри — светящиеся глаза
  for (const [x, eye] of [[-0.75, 0xffd040], [0.05, 0x7af0a0], [0.8, 0xff60d0]]) {
    const cx = x, cy = Y + 0.12, cz = WID / 2 + 0.33;
    g(bbox(0.42, 0.04, 0.38, 0.01, D, [cx, cy - 0.2, cz], 0, { top: W })); g(bbox(0.42, 0.04, 0.38, 0.01, D, [cx, cy + 0.2, cz], 0, { top: W }));
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) g(part(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 4), IR, [cx - 0.18 + k * 0.12, cy, cz + s * 0.17], 0, 1, { top: 0x7a7a84 }));
    g(ball(0.09, 0x1a1418, [cx, cy - 0.08, cz], [1, 0.8, 1])); for (const s of [-1, 1]) g(ball(0.022, eye, [cx + s * 0.035, cy - 0.04, cz + 0.08], 1, { emit: true }));
  }
  // крыша: свёрнутые ковры и сундук
  g(part(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 10), 0xa02a3a, [-0.4, Y + 1.18, 0.15], [Math.PI / 2, 0, 0.1], 1, { top: 0xe0a040, tex: 'cloth' }));
  g(part(new THREE.CylinderGeometry(0.11, 0.11, 1.0, 10), 0x2a7a8a, [-0.1, Y + 1.2, -0.15], [Math.PI / 2, 0, -0.1], 1, { top: 0xf0d080, tex: 'cloth' }));
  g(bbox(0.5, 0.32, 0.36, 0.03, 0x5a2a1a, [0.6, Y + 1.12, 0], 0, { top: 0x8a4a2a, tex: 'woodH' })); g(bbox(0.52, 0.06, 0.38, 0.01, 0xd6a548, [0.6, Y + 1.2, 0], 0, { top: 0xf0c868 }));
  // фонарь на крюке у передка и мешки на дышле
  g(part(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), D, [LEN / 2 + 0.05, Y + 0.9, WID / 2 - 0.1], [0, 0, -0.5]));
  g(bbox(0.16, 0.22, 0.16, 0.02, 0x24242a, [LEN / 2 + 0.2, Y + 0.75, WID / 2 - 0.1], 0, { top: 0x5a5a64, tex: 'iron' })); g(part(new THREE.BoxGeometry(0.1, 0.14, 0.1), 0xffc070, [LEN / 2 + 0.2, Y + 0.75, WID / 2 - 0.1], 0, 1, { emit: true }));
  for (const [x, z] of [[-LEN / 2 - 0.35, 0.3], [-LEN / 2 - 0.3, -0.25]]) { g(part(new THREE.CylinderGeometry(0.2, 0.25, 0.45, 8), 0xb89a68, [x, 0.22, z], 0, 1, { top: 0xd8c090, tex: 'cloth' })); g(part(new THREE.SphereGeometry(0.16, 7, 5), 0xb89a68, [x, 0.47, z], 0, [1, 0.5, 1], { top: 0xd8c090, tex: 'cloth' })); }
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
} };
