// Одноручный меч (клинок с фиолетовым долом Бездны). Оружие: хват в начале координат, клинок вдоль +Y, плоскость клинка перпендикулярна X.
export default {
  id: 'sword_iron', kind: 'weapon', slot: 'handR', reach: 1.35,
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const mat = kit.mat({ rim: 0.5 });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), 0x2a1c30, [0, 0, 0]),
      part(new THREE.SphereGeometry(0.055, 8, 6), PAL.brass, [0, -0.13, 0], 0, 1, { top: 0xf0c868 }),
      part(new THREE.BoxGeometry(0.36, 0.06, 0.09), PAL.brassD, [0, 0.12, 0], 0, 1, { top: PAL.brass }),
      part(new THREE.BoxGeometry(0.13, 0.9, 0.035), 0xaab4cc, [0, 0.6, 0], 0, 1, { top: 0xf4f8ff }),
      part(new THREE.ConeGeometry(0.09, 0.2, 4), 0xf4f8ff, [0, 1.14, 0], [0, Math.PI / 4, 0], [1, 1, 0.3]),
      part(new THREE.BoxGeometry(0.03, 0.78, 0.045), PAL.abyss, [0, 0.58, 0], 0, 1, { emit: true }),
    ]), mat));
    return { root, materials: [mat] };
  },
};
