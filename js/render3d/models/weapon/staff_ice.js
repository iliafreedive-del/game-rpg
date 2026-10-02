// Посох снежной ведьмы: витое древко из мёрзлого дерева, навершие — кристалл льда в когтях из кости, самосвечение.
export default {
  id: 'staff_ice', kind: 'weapon', slot: 'handR', reach: 1.6,
  build(kit) {
    const { THREE, PAL, MOB, part, merge } = kit;
    const mat = kit.mat({ rim: 0.6, rimColor: 0xcfeaff });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      kit.tube([[0, -0.6, 0], [0.03, 0, 0], [-0.03, 0.6, 0.01], [0, 1.1, 0]], 0.03, 0.025, 0x4a4a58, { top: 0xb8c8d8, tex: 'bark' }, 6),
      ...[0, 1, 2].map(i => kit.tube([[Math.cos(i * 2.1) * 0.04, 1.1, Math.sin(i * 2.1) * 0.04], [Math.cos(i * 2.1) * 0.13, 1.26, Math.sin(i * 2.1) * 0.13], [Math.cos(i * 2.1) * 0.07, 1.42, Math.sin(i * 2.1) * 0.07]], 0.03, 0.01, MOB.boneD, { top: 0xffffff }, 5)),
      part(new THREE.OctahedronGeometry(0.13, 0), 0x7acbff, [0, 1.28, 0], 0, [0.8, 1.7, 0.8], { top: 0xeaf8ff, emit: true }),
      part(new THREE.OctahedronGeometry(0.06, 0), 0xaee4ff, [0.1, 1.12, 0.04], [0, 0, 0.5], [0.8, 1.6, 0.8], { top: 0xffffff, emit: true }),
    ]), mat));
    return { root, materials: [mat] };
  },
};
