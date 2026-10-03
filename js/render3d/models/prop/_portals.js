// Порталы деревни: у каждого свой силуэт и цвет, чтобы их отличать издали.
//  portal       — каменная арка (катакомбы, фиолетовый)        portal_ring  — кольцо из рунных камней (Глубины, голубой)
//  portal_spire — ледяные шпили-готика (Фьорды, ледяной)       portal_gate  — бревенчатые врата с лианами (Старый Лес, зелёный)
//  portal_crown — золотые колонны с фронтоном (Цитадель)        portal_maw   — железный обруч с шипами и черепом (Жатва Бездны, красный)
//  portal_bone  — арка из рёбер великана, череп с огнём в глазницах, груды черепов (Костяные пустоши, оранжевый)
import { skull, rib, tusk, vertebra, BONE_COL } from './_bones.js';
// Вихрь внутри — общий шейдер (цвет берётся из света у портала), форма диска меняется масштабом.
function vortex(kit, col, sx, sy, y) {
  const { THREE } = kit;
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uCol: { value: col } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
      void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
        float sw = 0.5 + 0.5 * sin(a * 3.0 + r * 9.0 - uTime * 2.4); float core = smoothstep(1.0, 0.2, r);
        float edge = smoothstep(1.0, 0.85, r); vec3 c = uCol * (0.35 + 0.9 * sw * core) + vec3(1.0) * pow(core, 4.0) * 0.5;
        gl_FragColor = vec4(c * edge, edge * (0.55 + 0.4 * core)); }` });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 28), mat); disc.position.set(0, y, 0); disc.scale.set(sx, sy, 1); disc.userData.noOutline = true; disc.renderOrder = 3;
  return { disc, mat };
}
const FRAMES = {
  bone(kit) {
    const { THREE, part, bbox } = kit, L = [], { BONE, BONED, OLD } = BONE_COL;
    // основание: плиты песчаника и песчаный холм
    L.push(part(new THREE.CylinderGeometry(2.1, 2.4, 0.22, 9), 0x7a3e22, [0, 0.11, 0], 0, [1, 1, 0.62], { top: 0xc07a48, tex: 'rock' }));
    for (const [x, z, w] of [[-0.9, 0.55, 1.0], [0.3, 0.75, 1.1], [1.1, 0.3, 0.8]]) L.push(bbox(w, 0.12, 0.6, 0.04, 0x8a5a3a, [x, 0.26, z], [0, x * 0.3, 0], { top: 0xd8a070, tex: 'stone' }));
    // два огромных ребра — арка; сходятся под черепом
    for (const s of [-1, 1]) {
      L.push(kit.tube([[s * 1.45, 0.1, 0], [s * 1.75, 1.2, 0.05], [s * 1.55, 2.4, 0], [s * 0.95, 3.25, -0.05], [s * 0.35, 3.55, 0]], 0.26, 0.12, BONED, { top: BONE, tex: 'bone' }, 8));
      for (let k = 0; k < 3; k++) rib(kit, L, [s * 0.55, 3.2 - k * 0.35, -0.35 - k * 0.12], s, 1.5 - k * 0.2, 0.075, { dir: [0, 0, -1], flare: 0.75 });   // малые рёбра позади арки
      tusk(kit, L, [s * 1.6, 0.25, 0.35], 1.4, 0.16, s * 0.9 + 0.4, 0.55);   // бивни у подножия
      for (let k = 0; k < 4; k++) skull(kit, L, [s * (1.85 + (k % 2) * 0.35), 0.32 + Math.floor(k / 2) * 0.22, 0.35 - k * 0.22], 1.4, { ry: s * 0.6 + k * 0.4, jaw: k % 2 === 0 });   // груды черепов
      vertebra(kit, L, [s * 0.75, 0.34, 0.95], 0.9, s * 0.4);
    }
    // череп-навершие: глазницы горят
    skull(kit, L, [0, 3.55, 0.12], 4.4, { eye: 0xff8a2a, horns: true });
    for (const s of [-1, 1]) L.push(part(new THREE.ConeGeometry(0.12, 0.42, 5), 0xffb04a, [s * 0.2, 3.62, 0.62], [0.2, 0, 0], 1, { emit: true }));   // пламя из глазниц
    // перья и ремни на арке
    for (const s of [-1, 1]) { L.push(bbox(0.06, 0.6, 0.02, 0.005, 0x6a1a12, [s * 1.62, 1.6, 0.28], [0, 0, s * 0.1], { top: 0xb83a22, tex: 'cloth' })); L.push(part(new THREE.ConeGeometry(0.06, 0.4, 4), 0x2a1a10, [s * 1.62, 1.12, 0.3], [Math.PI, 0, 0], [1, 1, 0.3], { top: 0xd8c8a0 })); }
    L.push(part(new THREE.SphereGeometry(0.12, 7, 6), 0xff9a3a, [0, 0.42, 0.9], 0, 1, { emit: true }));
    return { L, sx: 1.05, sy: 1.25, y: 1.6 };
  },
  ring(kit) {
    const { THREE, PAL, part, bbox } = kit, L = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, x = Math.cos(a) * 1.25, y = 1.45 + Math.sin(a) * 1.25;
      L.push(part(new THREE.BoxGeometry(0.46, 0.56, 0.5), 0x2c3446, [x, y, 0], [0, 0, a + Math.PI / 2], 1, { top: 0x7a88a8, tex: 'stone' }), part(new THREE.BoxGeometry(0.08, 0.2, 0.06), 0x9ad8ff, [x, y, 0.27], [0, 0, a + Math.PI / 2], 1, { emit: true })); }
    L.push(bbox(2.8, 0.22, 1.1, 0.04, 0x3a3e4c, [0, 0.11, 0], 0, { top: 0x8a90a8, tex: 'stone' }), bbox(0.5, 0.4, 0.5, 0.04, 0x2c3446, [-1.0, 0.4, 0], 0, { top: 0x7a88a8, tex: 'stone' }), bbox(0.5, 0.4, 0.5, 0.04, 0x2c3446, [1.0, 0.4, 0], 0, { top: 0x7a88a8, tex: 'stone' }));
    return { L, sx: 1.1, sy: 1.1, y: 1.45 };
  },
  spire(kit) {
    const { THREE, part, bbox, tube } = kit, L = [];
    for (const s of [-1, 1]) {
      L.push(tube([[s * 1.25, 0, 0], [s * 1.35, 1.4, 0], [s * 1.0, 2.6, 0], [s * 0.18, 3.5, 0]], 0.34, 0.07, 0x8ab4d6, { top: 0xe8f6ff, tex: 'crystal' }, 5));
      for (let k = 0; k < 4; k++) L.push(part(new THREE.ConeGeometry(0.1, 0.5 + k * 0.1, 4), 0x9ad8ff, [s * (1.5 - k * 0.1), 0.6 + k * 0.7, 0.18], [0, 0, -s * 0.9], 1, { top: 0xffffff, emit: true }));
      L.push(part(new THREE.ConeGeometry(0.28, 1.2, 5), 0x7aa6cc, [s * 1.7, 0.6, 0.3], [0, 0, -s * 0.25], 1, { top: 0xdff1ff, tex: 'crystal' }));
    }
    L.push(part(new THREE.SphereGeometry(0.3, 8, 6), 0xf4fbff, [0, 0.1, 0.3], 0, [3.2, 0.5, 1.4]));   // сугроб
    return { L, sx: 0.85, sy: 1.35, y: 1.65 };
  },
  gate(kit) {
    const { THREE, part, bbox, tube } = kit, L = [];
    for (const s of [-1, 1]) {
      L.push(tube([[s * 1.15, 0, 0], [s * 1.2, 1.2, 0.05], [s * 1.1, 2.4, 0]], 0.36, 0.2, 0x3a2818, { top: 0x7a5a38, tex: 'bark' }, 7));
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + s; L.push(tube([[s * 1.15 + Math.cos(a) * 0.2, 0.15, Math.sin(a) * 0.2], [s * 1.15 + Math.cos(a) * 0.6, 0.05, Math.sin(a) * 0.6]], 0.1, 0.03, 0x3a2818, { top: 0x6a4a2c, tex: 'bark' }, 5)); }
      L.push(part(new THREE.IcosahedronGeometry(0.42, 0), 0x2a5a2a, [s * 1.1, 2.55, 0.1], 0, [1, 0.8, 1], { top: 0x5ab04a }));
    }
    L.push(tube([[-1.2, 2.45, 0], [-0.4, 3.0, 0.05], [0.4, 3.0, -0.05], [1.2, 2.45, 0]], 0.2, 0.2, 0x4a3420, { top: 0x8a6a44, tex: 'bark' }, 6));
    for (const x of [-0.9, -0.3, 0.35, 0.9]) L.push(tube([[x, 2.8, 0.12], [x + 0.05, 2.1, 0.15], [x - 0.04, 1.4 + Math.abs(x) * 0.4, 0.14]], 0.03, 0.01, 0x2a6a2a, { top: 0x6ac05a }, 4));   // лианы
    for (const [x, z] of [[-1.5, 0.4], [1.55, 0.5], [-1.0, 0.7]]) L.push(part(new THREE.SphereGeometry(0.12, 6, 5), 0xd04a3a, [x, 0.12, z], 0, [1, 0.7, 1], { top: 0xff8a6a }), part(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 5), 0xe8dcc0, [x, 0.06, z]));
    L.push(part(new THREE.SphereGeometry(0.1, 7, 6), 0xffe06a, [0, 3.0, 0.2], 0, 1, { emit: true }));
    return { L, sx: 1.0, sy: 1.15, y: 1.35 };
  },
  crown(kit) {
    const { THREE, PAL, part, bbox, lathe } = kit, L = [];
    for (const s of [-1, 1]) { L.push(lathe([[0.36, 0], [0.3, 0.2], [0.24, 0.4], [0.22, 2.4], [0.3, 2.5], [0.34, 2.7]], 0xd8d0b8, [s * 1.15, 0, 0], 0, 1, { top: 0xfff4d8, tex: 'stone' }, 10)); L.push(bbox(0.8, 0.22, 0.8, 0.04, PAL.brassD, [s * 1.15, 2.82, 0], 0, { top: PAL.brass, tex: 'gold' })); L.push(part(new THREE.SphereGeometry(0.1, 6, 5), 0xffe08a, [s * 1.15, 3.05, 0], 0, 1, { emit: true })); }
    L.push(bbox(3.1, 0.34, 0.8, 0.05, 0xc8c0a8, [0, 3.1, 0], 0, { top: 0xfff4d8, tex: 'stone' }));
    L.push(part(new THREE.ConeGeometry(1.7, 0.85, 3), PAL.brassD, [0, 3.7, 0], [0, 0, 0], [1.0, 1, 0.4], { top: PAL.brass, tex: 'gold' }));
    for (let i = 0; i < 3; i++) L.push(bbox(3.4 - i * 0.3, 0.16, 1.4 - i * 0.2, 0.03, 0xb8b09a, [0, 0.08 + i * 0.16, 0.5 + (2 - i) * 0.0], 0, { top: 0xf4ecd4, tex: 'stone' }));
    for (const s of [-1, 1]) L.push(bbox(0.5, 1.5, 0.04, 0.01, 0x6a1a1a, [s * 0.75, 2.2, 0.5], 0, { top: 0xc83a3a, tex: 'cloth' }));
    return { L, sx: 0.95, sy: 1.05, y: 1.4 };
  },
  maw(kit) {
    const { THREE, PAL, part, bbox } = kit, L = [];
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, x = Math.cos(a) * 1.2, y = 1.4 + Math.sin(a) * 1.2;
      L.push(part(new THREE.BoxGeometry(0.2, 0.26, 0.3), 0x24242c, [x, y, 0], [0, 0, a + Math.PI / 2], 1, { top: 0x6a6a76, tex: 'iron' }), part(new THREE.ConeGeometry(0.09, 0.5 + (i % 3) * 0.12, 4), 0x3a3a44, [x * 1.22, y + (y - 1.4) * 0.22, 0], [0, 0, a - Math.PI / 2], 1, { top: 0xaaaab4, tex: 'iron' })); }
    L.push(part(new THREE.SphereGeometry(0.26, 8, 6), 0xe4d8ba, [0, 2.95, 0.1], 0, [1, 1.1, 1], { top: 0xfff6e2 }), part(new THREE.SphereGeometry(0.05, 5, 4), 0xff3a2a, [-0.09, 2.98, 0.32], 0, 1, { emit: true }), part(new THREE.SphereGeometry(0.05, 5, 4), 0xff3a2a, [0.09, 2.98, 0.32], 0, 1, { emit: true }));
    for (const s of [-1, 1]) L.push(bbox(0.34, 0.7, 0.34, 0.04, 0x24242c, [s * 0.9, 0.35, 0], 0, { top: 0x6a6a76, tex: 'iron' }), part(new THREE.ConeGeometry(0.16, 0.5, 4), 0x3a3a44, [s * 0.9, 0.95, 0], 0, 1, { top: 0xaaaab4 }));
    L.push(bbox(3.0, 0.2, 1.0, 0.04, 0x1c1c22, [0, 0.1, 0], 0, { top: 0x4a4a54, tex: 'iron' }));
    return { L, sx: 1.0, sy: 1.0, y: 1.4 };
  },
};
export function portalDef(id, kind) {
  return { id, kind: 'prop', outline: false,
    build(kit, opts = {}) {
      const { THREE, PAL, merge } = kit, col = new THREE.Color(opts.color ?? PAL.abyss);
      const F = FRAMES[kind](kit), root = new THREE.Group(); root.add(new THREE.Mesh(merge(F.L), kit.propMat(this)));
      const v = vortex(kit, col, F.sx, F.sy, F.y); root.add(v.disc); root.rotation.y = Math.PI / 4;
      return { root, update(t) { v.mat.uniforms.uTime.value = t; } };
    } };
}
export const PORTAL_VARIANTS = [portalDef('portal_ring', 'ring'), portalDef('portal_spire', 'spire'), portalDef('portal_gate', 'gate'), portalDef('portal_crown', 'crown'), portalDef('portal_maw', 'maw'), portalDef('portal_bone', 'bone')];
