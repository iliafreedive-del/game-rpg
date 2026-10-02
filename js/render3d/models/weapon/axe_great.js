// Двуручная секира стража/палача: длинное древко с латунными кольцами, широкое лезвие-полумесяц с ржавчиной и долом Бездны, шип.
export default {
  id: 'axe_great', kind: 'weapon', slot: 'handR', reach: 1.9,
  build(kit) {
    const { THREE, PAL, MOB, part, merge } = kit;
    const mat = kit.mat({ rim: 0.5 });
    const blade = new THREE.Shape(); blade.moveTo(0, -0.05); blade.quadraticCurveTo(0.42, -0.2, 0.5, -0.38); blade.quadraticCurveTo(0.62, 0.0, 0.5, 0.38); blade.quadraticCurveTo(0.42, 0.2, 0, 0.12); blade.closePath();
    const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 1 }); bg.translate(0, 0, -0.015); bg.rotateY(Math.PI / 2); bg.translate(0, 1.1, 0);
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.035, 0.04, 1.7, 7), 0x3a2418, [0, 0.45, 0], 0, 1, { top: 0x6a4428, tex: 'wood' }),
      ...[-0.1, 0.25, 0.95, 1.25].map(y => part(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 8), PAL.brassD, [0, y, 0])),
      kit.geo.paint(bg, MOB.rust, { top: 0xc4c8d0, tex: 'metal' }),
      part(new THREE.BoxGeometry(0.02, 0.4, 0.02), PAL.abyss, [0, 1.12, -0.28], 0, 1, { emit: true }),
      part(new THREE.ConeGeometry(0.04, 0.25, 4), 0x9aa3bd, [0, 1.42, 0], 0, 1, { top: 0xe0e4ec }),
      part(new THREE.ConeGeometry(0.03, 0.2, 4), 0x9aa3bd, [0, 1.1, 0.13], [Math.PI / 2, 0, 0]),
    ]), mat));
    return { root, materials: [mat] };
  },
};
