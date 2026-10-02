// Одноручный топор воина-викинга: короткое древко с кожаной оплёткой, широкое лезвие-полумесяц, бородка и шип на обухе.
export default {
  id: 'axe_hand', kind: 'weapon', slot: 'handR', reach: 1.2,
  build(kit) {
    const { THREE, PAL, MOB, part, merge } = kit;
    const mat = kit.mat({ rim: 0.5 });
    const blade = new THREE.Shape(); blade.moveTo(0, -0.04); blade.quadraticCurveTo(0.26, -0.12, 0.3, -0.26); blade.quadraticCurveTo(0.38, 0.0, 0.3, 0.26); blade.quadraticCurveTo(0.26, 0.12, 0, 0.1); blade.closePath();
    const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.015, bevelSegments: 1 }); bg.translate(0, 0, -0.012); bg.rotateY(-Math.PI / 2); bg.translate(0, 0.7, 0);
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.028, 0.032, 1.0, 7), 0x3a2418, [0, 0.3, 0], 0, 1, { top: 0x6a4428, tex: 'wood' }),
      part(new THREE.CylinderGeometry(0.036, 0.036, 0.22, 7), 0x2a1a10, [0, 0.0, 0], 0, 1, { top: 0x5a3a20, tex: 'leather' }),
      part(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), PAL.brassD, [0, 0.62, 0]),
      kit.geo.paint(bg, 0x6a6e7c, { top: 0xd0d6e2, tex: 'metal' }),
      part(new THREE.ConeGeometry(0.03, 0.16, 4), 0x9aa3bd, [0, 0.86, 0], 0, 1, { top: 0xe0e4ec }),
      part(new THREE.ConeGeometry(0.025, 0.12, 4), 0x9aa3bd, [0, 0.7, -0.1], [-Math.PI / 2, 0, 0]),
    ]), mat));
    return { root, materials: [mat] };
  },
};
