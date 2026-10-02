// Завал на том конце моста: козлы из заострённых кольев, бревно поперёк, камни и табличка «Проход закрыт» —
// мост ведёт «куда-то», но дальше пути нет. Вдоль локальной X (генератор поворачивает поперёк дороги).
import { sign } from './_sign.js';
export default { id: 'barricade', kind: 'prop', outline: false,
  build(kit) {
    const { THREE, part, merge, bbox, geo } = kit, L = [], T = 0x4a3220, TL = 0x8a6a40;
    for (const x of [-1.15, 1.15]) for (const d of [-1, 1]) { const g = geo.chamferBox(0.14, 1.7, 0.14, 0.03); g.rotateX(d * 0.6); L.push(geo.paint(geo.warp(g.translate(x, 0.6, 0), 0.03, x * 3 + d), T, { top: TL, tex: 'bark' })); L.push(part(new THREE.ConeGeometry(0.08, 0.22, 4), 0x6a4a2c, [x, 1.3, d * 0.62], [d * 0.6, 0, 0], 1, { top: 0xb08a5a, tex: 'wood' })); }
    L.push(geo.paint(geo.warp(new THREE.CylinderGeometry(0.17, 0.2, 3.0, 8).rotateZ(Math.PI / 2).translate(0, 0.72, 0), 0.04, 7), 0x5a3a22, { top: 0x8a6a40, tex: 'bark' }));
    L.push(geo.paint(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 8).rotateZ(Math.PI / 2).translate(1.51, 0.72, 0), 0xc8a070, {}));
    for (const [x, z, r] of [[-0.6, 0.5, 0.28], [0.3, -0.5, 0.22], [1.3, 0.4, 0.3], [-1.4, -0.3, 0.25]]) L.push(part(new THREE.DodecahedronGeometry(r, 0), 0x5e574a, [x, r * 0.5, z], [x, z, 0], [1, 0.7, 1], { top: 0xaa9e82, tex: 'stone' }));
    L.push(bbox(0.1, 1.5, 0.1, 0.02, T, [0.35, 0.75, 0.45], 0, { top: TL, tex: 'wood' }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this)));
    const s = sign(kit, this, ['ПРОХОД ЗАКРЫТ', 'мост за рекой размыло'], 1.3, 0.55, { bg: '#4a2a14' }); s.position.set(0.35, 1.32, 0.52); s.rotation.y = -0.5; root.add(s);
    return { root };
  } };
