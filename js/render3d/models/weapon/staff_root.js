// Посох лешего: узловатый корень с мхом и грибами, навершие — клубок корней вокруг зелёного огонька.
export default {
  id: 'staff_root', kind: 'weapon', slot: 'handR', reach: 1.6,
  build(kit) {
    const { THREE, PAL, MOB, part, merge } = kit;
    const mat = kit.mat({ rim: 0.6, rimColor: 0xc8ffa0 });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      kit.tube([[0, -0.6, 0], [0.05, 0, 0.02], [-0.05, 0.6, 0.0], [0, 1.1, 0]], 0.04, 0.03, 0x3a2a1c, { top: 0x7a5a38, tex: 'bark' }, 6),
      ...[0, 1, 2, 3].map(i => kit.tube([[Math.cos(i * 1.57) * 0.04, 1.08, Math.sin(i * 1.57) * 0.04], [Math.cos(i * 1.57) * 0.16, 1.24, Math.sin(i * 1.57) * 0.16], [Math.cos(i * 1.57 + 0.6) * 0.08, 1.46, Math.sin(i * 1.57 + 0.6) * 0.08]], 0.035, 0.01, 0x3a2a1c, { top: 0x7a5a38, tex: 'bark' }, 5)),
      part(new THREE.IcosahedronGeometry(0.075, 1), 0x9aff6a, [0, 1.28, 0], 0, 1, { top: 0xffffff, emit: true }),
      part(new THREE.SphereGeometry(0.09, 7, 5), 0x3a6a2a, [0.02, 0.5, 0.04], 0, [1.3, 0.7, 1.2], { top: 0x8ac46a, tex: 'cloth' }),
      part(new THREE.SphereGeometry(0.05, 6, 5), 0xd8c0a0, [0.07, 0.32, 0.07], 0, [1, 0.7, 1], { top: 0xff9a6a }),
    ]), mat));
    return { root, materials: [mat] };
  },
};
