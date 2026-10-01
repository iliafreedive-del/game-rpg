// Круглый щит с латунным умбоном. Щит: нормаль лицевой грани — +X, центр в начале координат.
export default {
  id: 'shield_round', kind: 'weapon', slot: 'handL',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const mat = kit.mat({ rim: 0.5 });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 18), 0x2c2650, [0, 0, 0], [0, 0, Math.PI / 2], 1, { top: 0x5a46a0 }),
      part(new THREE.TorusGeometry(0.34, 0.04, 5, 20), PAL.brass, [0, 0, 0], [0, Math.PI / 2, 0]),
      part(new THREE.SphereGeometry(0.09, 10, 8), PAL.brass, [0.05, 0, 0], 0, [0.6, 1, 1], { top: 0xf0c868 }),
      part(new THREE.SphereGeometry(0.045, 8, 6), PAL.abyss, [0.1, 0, 0], 0, [0.5, 1, 1], { emit: true }),
    ]), mat));
    return { root, materials: [mat] };
  },
};
