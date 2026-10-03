// Указатель на развилке: столб и три стрелки разного цвета (белая, красная, синяя), повёрнутые в разные стороны.
export default { id: 'signpost', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox } = kit, L = [];
    L.push(bbox(0.14, 2.1, 0.14, 0.03, 0x5a4028, [0, 1.05, 0], 0, { top: 0x9a7448, tex: 'wood' }), part(new THREE.ConeGeometry(0.11, 0.14, 4), 0x5a4028, [0, 2.17, 0], [0, Math.PI / 4, 0]));
    L.push(part(new THREE.CylinderGeometry(0.22, 0.26, 0.2, 7), 0x6a6252, [0, 0.1, 0], 0, 1, { top: 0xa49880, tex: 'stone' }));
    const arrow = (y, yaw, c, cl) => {
      const sh = new THREE.Shape([new THREE.Vector2(-0.05, -0.11), new THREE.Vector2(0.62, -0.11), new THREE.Vector2(0.78, 0), new THREE.Vector2(0.62, 0.11), new THREE.Vector2(-0.05, 0.11)]);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false }); g.translate(0.07, 0, -0.025); g.rotateY(yaw); g.translate(0, y, 0);
      L.push(kit.geo.paint(g, c, { top: cl, tex: 'woodH' }));
    };
    arrow(1.85, 0.3, 0xd8d4c8, 0xf4f0e8); arrow(1.55, 2.6, 0xa83a2a, 0xd8604a); arrow(1.27, -1.2, 0x3a5a8a, 0x6a8ac0);
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
