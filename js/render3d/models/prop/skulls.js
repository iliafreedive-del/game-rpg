// Груда черепов: пять черепов с глазницами и челюстями, один сверху.
export default { id: 'skulls', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit, L = [], B = { top: PAL.bone };
    for (const [x, y, z, ry] of [[0, 0.1, 0, 0], [0.22, 0.1, 0.05, 0.5], [-0.2, 0.1, 0.08, -0.4], [0.05, 0.1, -0.2, 2.5], [0.05, 0.28, 0.02, 0.2]]) {
      const sk = [part(new THREE.SphereGeometry(0.12, 9, 7), PAL.boneD, [0, 0.02, 0], 0, [1, 0.95, 1.1], B), bbox(0.14, 0.06, 0.1, 0.02, PAL.boneD, [0, -0.07, 0.05], 0, B),
        part(new THREE.SphereGeometry(0.035, 5, 4), 0x0c0a08, [0.045, 0.01, 0.11]), part(new THREE.SphereGeometry(0.035, 5, 4), 0x0c0a08, [-0.045, 0.01, 0.11])];
      for (const g of sk) { g.rotateY(ry); g.translate(x, y, z); L.push(g); }
    }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
