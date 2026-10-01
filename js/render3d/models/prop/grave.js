// Могила: надгробие с крестом-руной и холмик.
export default { id: 'grave', kind: 'prop', batch: true, outline: 'stone',
  build(kit) {
    const { THREE, part, merge } = kit;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      part(new THREE.SphereGeometry(0.4, 8, 5), 0x2a2418, [0, 0, 0.35], 0, [1, 0.3, 1.4], { top: 0x3a4a2a }),
      part(new THREE.BoxGeometry(0.46, 0.7, 0.12), 0x4a4a52, [0, 0.35, -0.1], [0, 0, 0.04], 1, { top: 0xaeb0b8, tex: 'stone' }),
      part(new THREE.CylinderGeometry(0.23, 0.23, 0.12, 8, 1, false, 0, Math.PI), 0x6a6a72, [0, 0.7, -0.1], [Math.PI / 2, 0, 0], 1, { top: 0xaeb0b8, tex: 'stone' }),
      part(new THREE.BoxGeometry(0.05, 0.22, 0.02), kit.PAL.abyss, [0, 0.5, -0.03], 0, 1, { emit: true }),
    ]), kit.propMat(this))); return { root };
  } };
