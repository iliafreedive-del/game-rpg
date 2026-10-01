export default { id: 'hay', kind: 'prop', batch: true, outline: 'small',
  build(kit) {
    const { THREE, part, merge } = kit;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.42, 0.45, 0.8, 10), 0xa88a3a, [0, 0.4, 0], 0, 1, { top: 0xe0c868 }),
      part(new THREE.SphereGeometry(0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xc8aa50, [0, 0.8, 0], 0, [1, 0.5, 1], { top: 0xf0d878 }),
      part(new THREE.TorusGeometry(0.44, 0.02, 4, 14), 0x5a4220, [0, 0.4, 0], [Math.PI / 2, 0, 0]),
    ]), kit.propMat(this))); return { root };
  } };
