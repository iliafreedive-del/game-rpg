// Лагерь дикарей Костяных пустошей (в духе орочьих стоянок, но своё): хижина из шкур на рёбрах с бивнями у входа,
// тотем с черепами, костёр, рама со шкурой, боевое знамя, частокол из клыков. Вход хижины смотрит в +Z.
import { skull, tusk, BONE_COL } from './_bones.js';
const { BONE, BONED, OLD } = BONE_COL;
const HIDE = [[0x6a4228, 0xa8784a], [0x7a5232, 0xc89a68], [0x5a2e1c, 0x9a5a3a], [0x8a6a44, 0xd8b884]];   // шкуры: бурая, светлая, рыжая, песочная
const WOOD = [0x3a2414, 0x7a5232];

const def = (id, o, fn) => ({ id, kind: 'prop', batch: true, outline: false, ...o,
  build(kit) { const L = []; fn(kit, L); const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(kit.merge(L), kit.propMat(this))); return { root }; } });

function hut(kit, L, big) {
  const { THREE, part, bbox, tube } = kit, V = (x, y) => new THREE.Vector2(x, y), K = big ? 1.25 : 1;
  const prof = [V(1.55, 0), V(1.5, 0.55), V(1.32, 1.25), V(0.95, 1.9), V(0.45, 2.35), V(0.18, 2.5)].map(v => V(v.x * K, v.y * K));
  L.push(part(new THREE.LatheGeometry(prof, 12), HIDE[0][0], [0, 0, 0], 0, 1, { top: HIDE[0][1], tex: 'leather' }));
  // заплаты из разных шкур поверх купола (чуть больше радиус)
  [[0.3, 1.2, 1], [2.1, 1.0, 2], [3.6, 1.3, 3], [5.0, 0.9, 1]].forEach(([a0, len, c]) => L.push(part(new THREE.LatheGeometry(prof.slice(0, 5).map(v => V(v.x * 1.025, v.y * 1.0)), 4, a0, len), HIDE[c][0], [0, 0.02, 0], 0, 1, { top: HIDE[c][1], tex: 'leather' })));
  L.push(part(new THREE.TorusGeometry(1.42 * K, 0.035, 4, 20), 0x3a2416, [0, 0.75 * K, 0], [Math.PI / 2, 0, 0], 1, { tex: 'leather' }), part(new THREE.TorusGeometry(1.05 * K, 0.03, 4, 16), 0x3a2416, [0, 1.72 * K, 0], [Math.PI / 2, 0, 0], 1, { tex: 'leather' }));   // ремни
  // рёбра-каркас, перекрещены над дымоходом
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.4, c = Math.cos(a), s = Math.sin(a);
    L.push(tube([[c * 1.62 * K, 0, s * 1.62 * K], [c * 1.58 * K, 1.0 * K, s * 1.58 * K], [c * 1.1 * K, 2.05 * K, s * 1.1 * K], [c * 0.3 * K, 2.75 * K, s * 0.3 * K], [-c * 0.3 * K, 3.15 * K, -s * 0.3 * K]], 0.1 * K, 0.035, BONED, { top: BONE, tex: 'bone' }, 6)); }
  for (let k = 0; k < 4; k++) L.push(part(new THREE.CylinderGeometry(0.035, 0.04, 1.0, 4), WOOD[0], [Math.cos(k * 1.6) * 0.15, 2.65 * K, Math.sin(k * 1.6) * 0.15], [Math.cos(k * 1.6) * 0.3, 0, Math.sin(k * 1.6) * 0.3], 1, { top: WOOD[1], tex: 'wood' }));   // жерди дымохода
  // вход: тёмный проём, откинутый полог, бивни по бокам, череп над входом
  const z = 1.38 * K;
  L.push(part(new THREE.CircleGeometry(0.5, 10, 0, Math.PI), 0x140c08, [0, 0.02, z + 0.06], 0, [1.1, 2.2, 1]));
  L.push(bbox(0.7, 1.15, 0.05, 0.02, HIDE[2][0], [0.62, 0.62, z + 0.04], [0, 0.35, -0.08], { top: HIDE[2][1], tex: 'leather' }));
  for (const s of [-1, 1]) tusk(kit, L, [s * 0.68, 0, z + 0.2], 1.7 * K, 0.13, s * 0.5, 0.95);
  skull(kit, L, [0, 1.45 * K, z + 0.1], 2.2, { horns: true, ry: 0 });
  for (const s of [-1, 1]) L.push(part(new THREE.ConeGeometry(0.05, 0.36, 4), 0x2a1a10, [s * 0.32, 1.12 * K, z + 0.22], [Math.PI, 0, 0], [1, 1, 0.3], { top: 0xe0d0a8 }));   // перья
}
const boneHut = def('bone_hut', { ao: 0.62, aoH: 1.4, shadowProxy(kit) { const g = new kit.THREE.CylinderGeometry(0.4, 1.5, 2.6, 8); g.translate(0, 1.3, 0); return g; } }, (kit, L) => hut(kit, L, false));
const boneHall = def('bone_hall', { ao: 0.62, aoH: 1.6 }, (kit, L) => {   // длинный дом вождя: два купола и навес из шкур между ними
  const { THREE, part } = kit, A = [], B = [];
  hut(kit, A, true); hut(kit, B, true);
  const ga = kit.merge(A); ga.translate(-1.9, 0, 0); const gb = kit.merge(B); gb.translate(1.9, 0, 0); L.push(ga, gb);
  L.push(part(new THREE.CylinderGeometry(1.6, 1.6, 3.8, 10, 1, true, -Math.PI / 2, Math.PI), HIDE[1][0], [0, 1.0, 0], [0, 0, Math.PI / 2], [1, 1, 0.9], { top: HIDE[1][1], tex: 'leather' }));
});

const totem = def('bone_totem', { ao: 0.7 }, (kit, L) => {
  const { THREE, part, bbox } = kit;
  L.push(part(new THREE.CylinderGeometry(0.11, 0.15, 3.2, 6), WOOD[0], [0, 1.6, 0], 0, 1, { top: WOOD[1], tex: 'wood' }));
  for (const y of [0.7, 1.5, 2.3]) L.push(part(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 6), 0x7a1a12, [0, y, 0], 0, 1, { top: 0xc83a22, tex: 'cloth' }));   // красные повязки
  skull(kit, L, [0, 1.05, 0.12], 2.0, { ry: 0 }); skull(kit, L, [0, 1.85, 0.12], 2.3, { ry: 0.2 });
  skull(kit, L, [0, 3.25, 0.02], 3.0, { horns: true });
  L.push(bbox(1.3, 0.1, 0.1, 0.02, WOOD[0], [0, 2.75, 0], 0, { top: WOOD[1], tex: 'wood' }));
  for (const s of [-1, 1]) { for (let k = 0; k < 3; k++) L.push(bbox(0.08, 0.5, 0.02, 0.005, HIDE[k][0], [s * (0.35 + k * 0.12), 2.45, 0.05], [0, 0, s * 0.1], { top: HIDE[k][1], tex: 'leather' })); L.push(part(new THREE.ConeGeometry(0.06, 0.45, 4), 0x2a1a10, [s * 0.62, 2.45, 0.04], [Math.PI, 0, 0], [1, 1, 0.3], { top: 0xd8c8a0 })); }
  for (let k = 0; k < 5; k++) { const a = k * 1.3; L.push(part(new THREE.DodecahedronGeometry(0.16, 0), 0x5a2a16, [Math.cos(a) * 0.3, 0.08, Math.sin(a) * 0.3], 0, 1, { top: 0xa8603a, tex: 'rock' })); }
});

const bonfire = def('bonfire', { shadow: false }, (kit, L) => {
  const { THREE, part } = kit;
  for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; L.push(part(new THREE.DodecahedronGeometry(0.15, 0), 0x3a2a22, [Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55], [a, a, 0], [1, 0.7, 1], { top: 0x8a6a5a, tex: 'stone' })); }
  for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; L.push(kit.tube([[Math.cos(a) * 0.42, 0.02, Math.sin(a) * 0.42], [Math.cos(a) * 0.05, 0.62, Math.sin(a) * 0.05]], 0.06, 0.04, 0x2a1a10, { top: 0x5a3a20, tex: 'bark' }, 5)); }
  L.push(part(new THREE.ConeGeometry(0.3, 0.75, 6), 0xff6a1a, [0, 0.38, 0], 0, 1, { top: 0xffd06a, emit: true }), part(new THREE.ConeGeometry(0.16, 0.5, 5), 0xffb03a, [0.12, 0.45, 0.08], [0.2, 0, -0.2], 1, { top: 0xfff0a0, emit: true }), part(new THREE.ConeGeometry(0.14, 0.42, 5), 0xffa03a, [-0.12, 0.4, -0.06], [-0.2, 0, 0.2], 1, { top: 0xfff0a0, emit: true }));
  L.push(part(new THREE.CircleGeometry(0.45, 10), 0x1a0e08, [0, 0.015, 0], [-Math.PI / 2, 0, 0]));
});

const hideRack = def('hide_rack', { ao: 0.7 }, (kit, L) => {
  const { THREE, part, bbox } = kit;
  for (const s of [-1, 1]) L.push(part(new THREE.CylinderGeometry(0.05, 0.06, 2.0, 5), WOOD[0], [s * 0.85, 1.0, 0], [0, 0, s * 0.06], 1, { top: WOOD[1], tex: 'wood' }));
  L.push(bbox(2.0, 0.08, 0.08, 0.02, WOOD[0], [0, 1.9, 0], 0, { top: WOOD[1], tex: 'wood' }), bbox(1.8, 0.07, 0.07, 0.02, WOOD[0], [0, 0.45, 0], 0, { top: WOOD[1], tex: 'wood' }));
  L.push(bbox(1.35, 1.25, 0.04, 0.02, HIDE[3][0], [0, 1.15, 0.02], 0, { top: HIDE[3][1], tex: 'leather' }));   // растянутая шкура
  for (const [x, y] of [[-0.3, 1.4], [0.25, 0.95], [0.4, 1.5]]) L.push(part(new THREE.CircleGeometry(0.1, 6), 0x4a2a18, [x, y, 0.05], 0, [1, 0.8, 1]));
  for (const s of [-1, 1]) for (const y of [0.55, 1.75]) L.push(kit.tube([[s * 0.68, y, 0.03], [s * 0.82, y + 0.05, 0.03]], 0.015, 0.015, 0x2a1a10, {}, 3));
});

const warBanner = def('war_banner', { sway: { base: 1.0, amt: 0.04, flutter: 0.05 } }, (kit, L) => {
  const { THREE, part, bbox } = kit;
  L.push(part(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 5), WOOD[0], [0, 1.7, 0], 0, 1, { top: WOOD[1], tex: 'wood' }));
  L.push(bbox(0.9, 0.06, 0.06, 0.02, WOOD[0], [0.38, 3.0, 0], 0, { top: WOOD[1], tex: 'wood' }));
  L.push(bbox(0.8, 1.5, 0.03, 0.01, 0x6a140e, [0.4, 2.2, 0], 0, { top: 0xb02a18, tex: 'cloth' }));
  for (let k = 0; k < 3; k++) L.push(part(new THREE.ConeGeometry(0.13, 0.3, 3), 0x6a140e, [0.15 + k * 0.25, 1.35, 0], [Math.PI, 0, 0], [1, 1, 0.15], { tex: 'cloth' }));   // рваный край
  L.push(part(new THREE.SphereGeometry(0.14, 8, 6), 0x1a0e0a, [0.4, 2.35, 0.03], 0, [1, 1, 0.2]), part(new THREE.BoxGeometry(0.34, 0.06, 0.02), 0x1a0e0a, [0.4, 2.12, 0.03]));   // знак черепа
  tusk(kit, L, [0, 3.4, 0], 0.55, 0.06, 1.57, 0.6); tusk(kit, L, [0, 3.4, 0], 0.55, 0.06, -1.57, 0.6);
});

// частокол из кольев и клыков (сегмент 1 м), лицом наружу (+Z)
const tuskFence = def('tusk_fence', { ao: 0.7 }, (kit, L) => {
  const { THREE, part, bbox } = kit;
  for (const x of [-0.36, 0, 0.36]) L.push(part(new THREE.CylinderGeometry(0.07, 0.09, 1.6 + (x === 0 ? 0.3 : 0), 5), WOOD[0], [x, 0.8, 0], [0.12, 0, 0], 1, { top: WOOD[1], tex: 'wood' }), part(new THREE.ConeGeometry(0.075, 0.3, 5), WOOD[1], [x, 1.72 + (x === 0 ? 0.15 : 0), 0.1], [0.12, 0, 0], 1, { tex: 'wood' }));
  L.push(bbox(1.05, 0.08, 0.08, 0.02, WOOD[0], [0, 0.55, 0.12], 0, { top: WOOD[1], tex: 'wood' }), bbox(1.05, 0.08, 0.08, 0.02, WOOD[0], [0, 1.25, 0.03], 0, { top: WOOD[1], tex: 'wood' }));
  tusk(kit, L, [-0.2, 0.6, 0.15], 0.75, 0.07, 0, 0.5); tusk(kit, L, [0.22, 1.0, 0.12], 0.6, 0.06, 0.2, 0.55);
});
export const CAMP_PROPS = [boneHut, boneHall, totem, bonfire, hideRack, warBanner, tuskFence];
