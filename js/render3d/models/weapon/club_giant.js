// Дубина великана: ствол молодого дерева с корой, обломанными сучьями и костяными шипами у навершия, обмотка из шкур.
export default {
  id: 'club_giant', kind: 'weapon', slot: 'handR', reach: 1.8,
  build(kit) {
    const { THREE, PAL, MOB, part, merge } = kit;
    const mat = kit.mat({ rim: 0.5 });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      kit.tube([[0, -0.3, 0], [0.02, 0.3, 0], [0, 0.9, 0.01], [-0.02, 1.35, 0]], 0.05, 0.16, 0x3a2a1c, { top: 0x7a5a38, tex: 'bark' }, 8),
      part(new THREE.SphereGeometry(0.17, 9, 7), 0x4a3524, [-0.02, 1.4, 0], 0, [1, 0.9, 1], { top: 0x8a6a44, tex: 'bark' }),
      part(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 8), 0x2a1a10, [0, 0.0, 0], 0, 1, { top: 0x5a3a20, tex: 'leather' }),
      ...[0, 1, 2, 3, 4, 5].map(i => { const a = i * 1.05; return part(new THREE.ConeGeometry(0.04, 0.2, 4), MOB.boneD, [Math.cos(a) * 0.17, 1.2 + (i % 3) * 0.12, Math.sin(a) * 0.17], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2], 1, { top: MOB.bone }); }),
      kit.tube([[0.04, 0.6, 0], [0.18, 0.7, 0.04], [0.26, 0.82, 0.04]], 0.03, 0.01, 0x3a2a1c, { top: 0x7a5a38, tex: 'bark' }, 5),
    ]), mat));
    return { root, materials: [mat] };
  },
};
