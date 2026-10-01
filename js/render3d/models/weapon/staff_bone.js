// Посох колдуна: кривое древко из кости, навершие-череп в латунной оправе с когтями, орба Бездны (самосвечение). Хват в начале, древко вдоль +Y.
export default {
  id: 'staff_bone', kind: 'weapon', slot: 'handR', reach: 1.6,
  build(kit) {
    const { THREE, PAL, MOB, part, merge } = kit;
    const mat = kit.mat({ rim: 0.5 });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      kit.tube([[0, -0.6, 0], [0.02, 0, 0], [-0.02, 0.6, 0.01], [0, 1.1, 0]], 0.03, 0.025, 0x4a3a30, { top: MOB.boneD, tex: 'bark' }, 6),
      part(new THREE.SphereGeometry(0.09, 8, 6), MOB.bone, [0, 1.18, 0], 0, [1, 0.95, 1.1], { top: 0xffffff }),
      ...[0, 1, 2, 3].map(i => kit.tube([[Math.cos(i * 1.57) * 0.05, 1.22, Math.sin(i * 1.57) * 0.05], [Math.cos(i * 1.57) * 0.12, 1.34, Math.sin(i * 1.57) * 0.12], [Math.cos(i * 1.57) * 0.06, 1.46, Math.sin(i * 1.57) * 0.06]], 0.018, 0.006, PAL.brassD, { top: PAL.brass }, 4)),
      part(new THREE.IcosahedronGeometry(0.08, 1), PAL.abyss, [0, 1.36, 0], 0, 1, { emit: true }),
    ]), mat));
    return { root, materials: [mat] };
  },
};
