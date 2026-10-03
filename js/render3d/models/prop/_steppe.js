// Полустепь-полупустыня (Костяные пустоши): красный песчаник слоями, акации с плоской кроной, сухие колючие кусты, агавы, перекати-поле.
// Все — batch (их на поле десятки и сотни). Цвета — охра и красная глина, фактура «камень»/«кора».
import { foliage, leafProxy } from './_foliage.js';

const SAND = [[0x7a3418, 0xb8603a], [0x8a4422, 0xd08a52], [0x6a2c16, 0xa85030], [0x9a5a30, 0xe0a468]];   // слои песчаника: тёмный низ → светлый верх

// столб/останец из слоёв песчаника: layers — [[радиус низа, радиус верха, высота], …] снизу вверх
function strata(kit, seed, layers, o = {}) {
  const { THREE, geo } = kit, R = geo.rng(seed), L = []; let y = 0, ox = 0, oz = 0;
  layers.forEach(([r0, r1, h], i) => {
    const g = new THREE.CylinderGeometry(r1, r0, h, o.seg || 7, 2); geo.jitter(g, Math.min(r0, r1) * 0.12, geo.rng(seed + i * 7));
    g.scale(1, 1, o.flat || 0.85); g.translate(ox, y + h / 2, oz);
    const [c0, c1] = SAND[(i + seed) % SAND.length]; L.push(geo.paint(g, c0, { top: c1, tex: 'rock' }));
    y += h * 0.96; ox += (R() - 0.5) * r1 * 0.25; oz += (R() - 0.5) * r1 * 0.2;
  });
  if (o.cap) { const g = new THREE.DodecahedronGeometry(o.cap, 0); g.scale(1.3, 0.45, 1.1); geo.jitter(g, o.cap * 0.15, R); g.translate(ox, y + o.cap * 0.1, oz); L.push(geo.paint(g, 0x9a5a30, { top: 0xe8b07a, tex: 'rock' })); }
  for (let k = 0; k < (o.rubble ?? 4); k++) { const a = R() * 6.28, r = (layers[0][0] + 0.3) * (0.9 + R() * 0.4), s = 0.15 + R() * 0.25, g = new THREE.DodecahedronGeometry(s, 0); geo.jitter(g, s * 0.3, R); g.translate(Math.cos(a) * r, s * 0.5, Math.sin(a) * r); L.push(geo.paint(g, 0x6a2c16, { top: 0xc07a48, tex: 'rock' })); }
  return L;
}
function rockDef(id, seed, layers, o = {}) {
  return { id, kind: 'prop', batch: true, outline: false, tint: 0.1, ao: 0.7, aoH: 0.9,
    build(kit) { const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(kit.merge(strata(kit, seed, layers, o)), kit.propMat(this))); return { root }; } };
}
// валуны красного камня (замена серых rocks в пустошах)
function boulderDef(id, seed) {
  return { id, kind: 'prop', batch: true, outline: false, tint: 0.12,
    build(kit) {
      const { THREE, geo } = kit, R = geo.rng(seed), L = [];
      for (let i = 0; i < 3; i++) { const r = [0.55, 0.35, 0.25][i], g = new THREE.DodecahedronGeometry(r, 0); g.scale(1.1, 0.75, 0.9); geo.jitter(g, r * 0.3, R); g.translate(i ? (R() - 0.3) * 0.9 : 0, r * 0.45, i ? (R() - 0.3) * 0.7 : 0); const [c0, c1] = SAND[(i + seed) % 4]; L.push(geo.paint(g, c0, { top: c1, tex: 'rock' })); }
      const root = new THREE.Group(); root.add(new THREE.Mesh(kit.merge(L), kit.propMat(this))); return { root };
    } };
}

// акация: кривой наклонный ствол, развилка, плоская «зонтичная» крона из нескольких сплюснутых долей
const acaciaBase = { kind: 'prop', batch: true, sway: { base: 1.6, amt: 0.02, flutter: 0.03 }, rimColor: 0xfff0b0, rim: 0.12, side: 'double', outline: false, leaf: 'leaf', receive: false, tint: 0.16 };
function acaciaDef(id, seed, H, spread, o = {}) {
  const lobes = []; const R = mul(seed);
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + R() * 0.5, r = i === 0 ? 0 : spread * (0.55 + R() * 0.35); lobes.push([Math.cos(a) * r + (o.lean || 0) * 0.6, H + (R() - 0.5) * 0.25, Math.sin(a) * r, 0.55 + R() * 0.2]); }
  return { ...acaciaBase, id, lobes, trunkH: H - 0.4, density: 16,
    shadowProxy(kit) { return leafProxy(kit, this.lobes, this.trunkH); },
    build(kit) {
      const { THREE } = kit, F = foliage(kit, seed, { bark: 0x3a2418, barkL: 0x7a5236, leafHue: 0.2, leafTipHue: 0.15, light: -0.03, sat: 0.75, ...o.opts });
      const leaves = F.leafTree(this.lobes.map(([x, y, z, r]) => [x, y, z, r]), this.trunkH, o.lean || 0.18, this.density);
      const P = leaves.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > this.trunkH) P.setY(i, H + (y - H) * 0.42); }   // крона-зонтик: доли сплющены по высоте
      leaves.computeBoundingSphere();
      const root = new THREE.Group(); root.add(new THREE.Mesh(leaves, kit.propMat(this))); root.scale.set(1, 0.92, 1); return { root };
    } };
}
function mul(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// сухой колючий куст: веер тонких веток, на концах — сухие листочки-конусы
const bushDry = { id: 'bush_dry', kind: 'prop', batch: true, outline: false, shadow: false, tint: 0.2, sway: { base: 0.1, amt: 0.03, flutter: 0.02 },
  build(kit) {
    const { THREE, geo, part, tube } = kit, R = geo.rng(77), L = [];
    for (let i = 0; i < 9; i++) { const a = R() * 6.283, l = 0.35 + R() * 0.45, up = 0.3 + R() * 0.6, e = [Math.cos(a) * l, l * up + 0.05, Math.sin(a) * l];
      L.push(tube([[0, 0, 0], [e[0] * 0.5, e[1] * 0.6, e[2] * 0.5], e], 0.022, 0.006, 0x4a3020, { top: 0x8a6a48 }, 3));
      if (R() < 0.7) L.push(part(new THREE.ConeGeometry(0.06, 0.14, 4), 0x8a7a3a, e, [R(), R(), R()], 1, { top: 0xc8b060 })); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(kit.merge(L), kit.propMat(this))); return { root };
  } };
// агава/юкка: розетка длинных узких листьев, у старой — цветонос
const agave = { id: 'agave', kind: 'prop', batch: true, outline: false, tint: 0.18, sway: { base: 0.3, amt: 0.01, flutter: 0.01 },
  build(kit) {
    const { THREE, geo, part } = kit, R = geo.rng(91), L = [];
    for (let i = 0; i < 13; i++) { const a = i / 13 * 6.283 + R() * 0.3, tilt = 0.35 + (i % 3) * 0.25 + R() * 0.15, len = 0.55 + R() * 0.25;
      L.push(part(new THREE.ConeGeometry(0.06, len, 3), 0x3a5a3a, [Math.cos(a) * Math.sin(tilt) * len * 0.5, Math.cos(tilt) * len * 0.5, Math.sin(a) * Math.sin(tilt) * len * 0.5], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt], [1, 1, 0.35], { top: 0xa8b870 })); }
    L.push(part(new THREE.CylinderGeometry(0.02, 0.03, 1.3, 4), 0x6a5a3a, [0.05, 0.65, 0], 0, 1, { top: 0xb89a5a }), part(new THREE.SphereGeometry(0.09, 5, 4), 0xc8a040, [0.05, 1.32, 0], 0, [1, 1.6, 1], { top: 0xf0d070 }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(kit.merge(L), kit.propMat(this))); return { root };
  } };
// перекати-поле: шар из сухих веток
const tumbleweed = { id: 'tumbleweed', kind: 'prop', batch: true, outline: false, shadow: false, tint: 0.2,
  build(kit) {
    const { geo, tube } = kit, R = geo.rng(5), L = [];
    for (let i = 0; i < 16; i++) { const a = R() * 6.283, b = (R() - 0.5) * 3.1, d = [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)], c = 0.32;
      L.push(tube([[d[0] * -c, c + d[1] * -c, d[2] * -c], [d[1] * c * 0.4, c + d[2] * c * 0.4, d[0] * c * 0.4], [d[0] * c, c + d[1] * c, d[2] * c]], 0.012, 0.006, 0x7a5a38, { top: 0xc8a870 }, 3)); }
    const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(kit.merge(L), kit.propMat(this))); return { root };
  } };

export const STEPPE_PROPS = [
  rockDef('rock_spire', 3, [[1.0, 0.85, 1.1], [0.85, 0.8, 0.9], [0.8, 0.62, 1.2], [0.62, 0.5, 0.8], [0.52, 0.3, 0.7]], { rubble: 5 }),
  rockDef('rock_spire_b', 8, [[0.9, 0.8, 0.8], [0.8, 0.85, 1.0], [0.85, 0.55, 0.9], [0.58, 0.62, 0.7]], { cap: 0.75, rubble: 4 }),   // «гриб»: шапка шире ножки
  rockDef('rock_mesa', 5, [[1.9, 1.75, 0.8], [1.75, 1.65, 0.7], [1.65, 1.5, 0.6]], { seg: 8, flat: 0.75, rubble: 6, cap: 1.2 }),
  rockDef('rock_tooth', 13, [[0.6, 0.45, 1.0], [0.45, 0.25, 1.3], [0.25, 0.06, 0.9]], { seg: 6, rubble: 3 }),
  boulderDef('rock_red', 4), boulderDef('rock_red_b', 9),
  acaciaDef('tree_acacia', 31, 3.0, 1.15), acaciaDef('tree_acacia_b', 47, 2.5, 1.0, { lean: 0.4, opts: { leafHue: 0.17, sat: 0.65 } }), acaciaDef('tree_acacia_c', 59, 3.4, 1.35, { lean: -0.1, opts: { leafHue: 0.23, sat: 0.7, light: -0.05 } }),
  bushDry, agave, tumbleweed,
];
// для поля: порода по позиции
export const STEPPE_ROCKS = [['rock_red', 2], ['rock_red_b', 2], ['rock_tooth', 1]];
export const STEPPE_SPIRES = [['rock_spire', 2], ['rock_spire_b', 1.5], ['rock_tooth', 1.5], ['rock_mesa', 1]];
export const STEPPE_TREES = [['tree_acacia', 2], ['tree_acacia_b', 1.5], ['tree_acacia_c', 1.5]];
