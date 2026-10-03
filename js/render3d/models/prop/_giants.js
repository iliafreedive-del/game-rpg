// Скелеты великанов — ориентиры Костяных пустошей (референсы docs/reference/bones_1…5.webp).
// Кости вросли в землю: у основания — песчаный нанос и камни. Коллайдеры ставит генератор поля (wildgen.js, GIANT_FOOT → o.boxes).
import { skull, vertebra, BONE_COL } from './_bones.js';
const { BONE, BONED, OLD } = BONE_COL;

function mound(kit, L, x, z, rx, rz, h = 0.35) {   // песчаный нанос у кости
  const { THREE, part } = kit;
  L.push(part(new THREE.SphereGeometry(1, 10, 6, 0, 6.283, 0, Math.PI / 2), 0x8a4a28, [x, -0.05, z], 0, [rx, h, rz], { top: 0xc88a58, tex: 'rock' }));
}
function pebbles(kit, L, seed, n, rx, rz) {
  const { THREE, geo } = kit, R = geo.rng(seed);
  for (let i = 0; i < n; i++) { const s = 0.12 + R() * 0.28, g = new THREE.DodecahedronGeometry(s, 0); geo.jitter(g, s * 0.3, R); g.translate((R() - 0.5) * rx * 2, s * 0.4, (R() - 0.5) * rz * 2); L.push(geo.paint(g, 0x5a2a16, { top: 0xa8603a, tex: 'rock' })); }
}
const def = (id, fn) => ({ id, kind: 'prop', batch: true, outline: false, ao: 0.62, aoH: 1.2,
  build(kit) { const L = []; fn(kit, L); const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(kit.merge(L), kit.propMat(this))); return { root }; } });

// огромный череп, наполовину в земле, с трещиной; повёрнут лицом к камере (на 45°)
const giantSkull = def('giant_skull', (kit, L) => {
  const { THREE, part, bbox } = kit, S = [], B = { top: 0xe8d8b0, tex: 'bone' }, C = 0x8a7656, HOLE = 0x120a06;
  S.push(part(new THREE.SphereGeometry(1.9, 22, 16), C, [0, 1.35, -0.35], 0, [1, 0.86, 1.12], B));   // свод
  S.push(part(new THREE.SphereGeometry(1.35, 18, 12), C, [0, 0.95, 0.85], 0, [1.12, 0.85, 0.9], B));   // лицевая часть
  for (const k of [-1, 1]) {
    S.push(part(new THREE.SphereGeometry(0.5, 12, 9), HOLE, [k * 0.62, 1.32, 1.62], 0, [1, 0.9, 0.55]));   // глазница
    S.push(part(new THREE.TorusGeometry(0.5, 0.13, 6, 14), C, [k * 0.62, 1.32, 1.66], [0.1, k * 0.25, 0], [1, 0.9, 1], B));   // обод глазницы
    S.push(part(new THREE.SphereGeometry(0.34, 9, 7), C, [k * 1.18, 0.82, 1.2], 0, [1.2, 0.7, 1], B));   // скула
    S.push(part(new THREE.SphereGeometry(0.42, 9, 7), 0x5a4a34, [k * 1.55, 1.15, 0.2], 0, [0.4, 0.8, 1], B));   // висок
  }
  S.push(part(new THREE.CylinderGeometry(0.1, 0.12, 2.1, 7), C, [0, 1.86, 1.42], [0, 0, Math.PI / 2], 1, B));   // надбровье
  S.push(part(new THREE.ConeGeometry(0.28, 0.6, 3), HOLE, [0, 0.72, 1.88], [Math.PI, 0, 0], [1, 1, 0.5]));   // носовая впадина
  S.push(bbox(1.8, 0.28, 0.7, 0.08, C, [0, 0.38, 1.55], 0, B));   // верхняя челюсть
  for (let i = 0; i < 10; i++) { const x = -0.8 + i * 0.178, z = 1.86 - Math.abs(i - 4.5) * 0.045; S.push(part(new THREE.ConeGeometry(0.075, 0.34, 5), 0xd8c8a0, [x, 0.12, z], [Math.PI, 0, 0], [1, 1, 0.8], { top: 0xf4ead0, tex: 'bone' })); }   // зубы
  S.push(part(new THREE.BoxGeometry(0.07, 1.6, 0.1), 0x2a1a10, [-0.75, 2.2, 0.9], [0.55, 0.2, 0.35]), part(new THREE.BoxGeometry(0.06, 0.9, 0.08), 0x2a1a10, [-1.05, 2.55, 0.45], [0.6, 0.2, -0.5]));   // трещина
  const g = kit.merge(S); g.rotateY(Math.PI / 4); g.rotateZ(0.08); L.push(g);
  mound(kit, L, 0, 0, 2.6, 2.3, 0.45);
  pebbles(kit, L, 7, 8, 2.6, 2.2);
});
// грудная клетка великана «на спине»: хребет в песке, рёбра дугами вверх (как на референсе с холмами)
const giantRibs = def('giant_ribs', (kit, L) => {
  mound(kit, L, 0, 0, 4.6, 1.6, 0.4);
  for (let i = 0; i < 9; i++) { const x = -3.8 + i * 0.95, k = 1 - Math.abs(i - 4) / 6; vertebra(kit, L, [x, 0.35, 0], 2.2, Math.PI / 2);
    for (const s of [-1, 1]) L.push(kit.tube([[x, 0.4, s * 0.3], [x + 0.05, 1.6 * k + 0.6, s * 1.3], [x + 0.1, 2.9 * k + 0.6, s * 1.55], [x + 0.12, 3.6 * k + 0.6, s * 1.05], [x + 0.1, 3.75 * k + 0.6, s * 0.55]], 0.2, 0.08, i % 3 ? BONED : OLD, { top: BONE, tex: 'bone' }, 6)); }
  pebbles(kit, L, 11, 10, 4.4, 1.8);
});
// хребет: цепочка огромных позвонков, уходящая в песок
const giantSpine = def('giant_spine', (kit, L) => {
  mound(kit, L, 0, 0, 4.4, 1.0, 0.3);
  for (let i = 0; i < 8; i++) { const x = -3.6 + i * 1.02, sc = 3.2 - Math.abs(i - 2) * 0.25; vertebra(kit, L, [x, 0.25 + sc * 0.1 - i * 0.03, Math.sin(i * 0.7) * 0.25], sc, Math.PI / 2 + Math.sin(i) * 0.15); }
  pebbles(kit, L, 13, 8, 4.2, 1.0);
});
// арка из двух бивней (мамонтовых), сходящихся над тропой — можно пройти между основаниями
const tuskArch = def('tusk_arch', (kit, L) => {
  for (const s of [-1, 1]) { mound(kit, L, s * 2.1, 0, 0.9, 0.9, 0.35); L.push(kit.tube([[s * 2.1, 0, 0], [s * 2.35, 1.6, 0.1], [s * 2.0, 3.3, 0.15], [s * 1.1, 4.5, 0.1], [s * 0.15, 4.8, 0]], 0.42, 0.06, BONED, { top: BONE, tex: 'bone' }, 9)); }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) L.push(kit.tube([[s * 1.95, 1.0 + k * 0.5, 0.35], [s * 2.25, 0.85 + k * 0.5, 0.42]], 0.05, 0.05, 0x5a2a16, { top: 0x9a5a2a, tex: 'leather' }, 5));   // ремни
  pebbles(kit, L, 17, 6, 2.6, 0.9);
});
// павший великан: череп на камнях, грудь, рука и огромный меч, воткнутый в землю (референсы 1 и 5)
const giantFallen = def('giant_fallen', (kit, L) => {
  const { THREE, part, bbox } = kit;
  mound(kit, L, -0.3, 0, 3.4, 2.4, 0.5);
  skull(kit, L, [-2.1, 0.75, 0.2], 9.5, { ry: 0.6 });
  for (let i = 0; i < 5; i++) { const x = -0.9 + i * 0.6; vertebra(kit, L, [x, 0.4, -0.3], 1.6, Math.PI / 2); }
  for (let i = 0; i < 6; i++) { const x = -1.0 + i * 0.55, k = 1 - Math.abs(i - 2.5) / 4; for (const s of [-1, 1]) L.push(kit.tube([[x, 0.45, -0.3 + s * 0.2], [x + 0.05, 1.3 * k + 0.4, -0.3 + s * 1.1], [x + 0.1, 2.0 * k + 0.4, -0.3 + s * 0.9], [x + 0.12, 2.2 * k + 0.4, -0.3 + s * 0.35]], 0.12, 0.05, BONED, { top: BONE, tex: 'bone' }, 6)); }
  L.push(kit.tube([[1.6, 0.3, 0.9], [2.3, 0.4, 1.4], [2.9, 0.3, 1.8]], 0.2, 0.15, BONED, { top: BONE, tex: 'bone' }, 7), part(new THREE.SphereGeometry(0.26, 8, 6), BONED, [1.6, 0.3, 0.9], 0, 1, { top: BONE, tex: 'bone' }));   // плечевая кость
  // меч: клинок наискось в земле, гарда, рукоять
  const sw = new THREE.Group(), SL = [];
  SL.push(bbox(0.42, 4.2, 0.1, 0.03, 0x4a4a52, [0, 2.1, 0], 0, { top: 0xa8a8b0, tex: 'metal' }), part(new THREE.ConeGeometry(0.21, 0.5, 4), 0x4a4a52, [0, -0.1, 0], [Math.PI, Math.PI / 4, 0], [1, 1, 0.25], { tex: 'metal' }));
  SL.push(bbox(1.5, 0.22, 0.22, 0.04, 0x5a3a1a, [0, 4.3, 0], 0, { top: 0x9a6a3a, tex: 'iron' }), part(new THREE.CylinderGeometry(0.09, 0.1, 1.0, 6), 0x3a2414, [0, 4.9, 0], 0, 1, { top: 0x6a4428, tex: 'leather' }), part(new THREE.SphereGeometry(0.16, 7, 5), 0x6a5a3a, [0, 5.45, 0], 0, 1, { top: 0xc8a860, tex: 'gold' }));
  const g = kit.merge(SL); g.rotateZ(-0.38); g.rotateY(0.3); g.translate(2.2, -0.25, -0.9); L.push(g);
  pebbles(kit, L, 23, 10, 3.2, 2.2);
});
export const GIANT_PROPS = [giantSkull, giantRibs, giantSpine, tuskArch, giantFallen];
