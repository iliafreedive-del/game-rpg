// Щит нежити с костяным умбоном. Нормаль лицевой грани — +X.
export default {
  id: 'shield_bone', kind: 'weapon', slot: 'handL',
  build(kit) {
    const { THREE, PAL, MOB, part, merge, ball } = kit;
    const mat = kit.mat({ rim: 0.5 });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 14), 0x3b3144, [0, 0, 0], [0, 0, Math.PI / 2], 1, { top: 0x6a5c78, tex: 'woodH' }),
      part(new THREE.TorusGeometry(0.3, 0.03, 4, 16), PAL.brassD, [0, 0, 0], [0, Math.PI / 2, 0]),
      ball(0.1, MOB.bone, [0.06, 0.02, 0], [0.5, 1, 1]), ball(0.025, MOB.eye, [0.1, 0.04, 0.035], 1, { emit: true }), ball(0.025, MOB.eye, [0.1, 0.04, -0.035], 1, { emit: true }),
    ]), mat));
    return { root, materials: [mat] };
  },
};
