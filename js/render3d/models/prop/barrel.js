export default { id: 'barrel', kind: 'prop', batch: true, outline: 'small',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.3, 0.26, 0.85, 10), 0x5a3a22, [0, 0.42, 0], 0, [1.08, 1, 1.08], { top: 0xa07a48 }),
      ...[0.15, 0.7].map(y => part(new THREE.TorusGeometry(0.29, 0.025, 4, 12), PAL.brassD, [0, y, 0], [Math.PI / 2, 0, 0])),
      part(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 10), 0x7a5a38, [0, 0.86, 0]),
    ]), kit.propMat(this))); return { root };
  } };
