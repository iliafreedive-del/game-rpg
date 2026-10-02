// Посох мага: резное древко из тёмного дерева, латунное навершие-оправа и парящий кристалл Бездны, лёгкое свечение.
export default {
  id: 'staff_mage', kind: 'weapon', slot: 'handR', reach: 1.7,
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const mat = kit.mat({ rim: 0.6, rimColor: 0xcfa8ff });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      kit.tube([[0, -0.6, 0], [0.02, 0, 0], [-0.02, 0.7, 0.01], [0, 1.2, 0]], 0.032, 0.028, 0x3a2418, { top: 0x7a5232, tex: 'wood' }, 7),
      ...[-0.1, 0.4, 1.12].map(y => part(new THREE.TorusGeometry(0.04, 0.012, 4, 8), PAL.brass, [0, y, 0], [Math.PI / 2, 0, 0], 1, { top: 0xf0c868 })),
      ...[0, 1, 2, 3].map(i => kit.tube([[Math.cos(i * 1.57) * 0.04, 1.2, Math.sin(i * 1.57) * 0.04], [Math.cos(i * 1.57) * 0.13, 1.32, Math.sin(i * 1.57) * 0.13], [Math.cos(i * 1.57) * 0.07, 1.5, Math.sin(i * 1.57) * 0.07]], 0.03, 0.01, PAL.brassD, { top: PAL.brass }, 5)),
      part(new THREE.OctahedronGeometry(0.1, 0), PAL.abyss, [0, 1.36, 0], 0, [0.8, 1.5, 0.8], { top: 0xe9dcff, emit: true }),
    ]), mat));
    return { root, materials: [mat] };
  },
};
