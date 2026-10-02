// Костяной лук нежити: изогнутые плечи из кости, обмотка рукояти, тетива. Хват в начале координат, плечи вдоль ±Y, изгиб к +Z.
export default {
  id: 'bow_bone', kind: 'weapon', slot: 'handL',
  build(kit) {
    const { THREE, PAL, MOB, part, merge } = kit;
    const mat = kit.mat({ rim: 0.5 }), pts = s => [0, 0.2, 0.4, 0.58, 0.7].map(y => [0, s * y, -0.2 * (y / 0.7) ** 2 + 0.05]);
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      kit.tube(pts(1), 0.03, 0.012, MOB.boneD, { top: MOB.bone }, 5), kit.tube(pts(-1), 0.03, 0.012, MOB.boneD, { top: MOB.bone }, 5),
      part(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 6), 0x3a2418, [0, 0, 0.05], 0, 1, { tex: 'cloth' }),
      part(new THREE.CylinderGeometry(0.004, 0.004, 1.38, 3), 0xd8c8a0, [0, 0, -0.15]),
      part(new THREE.OctahedronGeometry(0.03, 0), PAL.abyss, [0, 0, 0.09], 0, 1, { emit: true }),
    ]), mat));
    return { root, materials: [mat] };
  },
};
