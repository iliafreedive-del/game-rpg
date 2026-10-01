// Кузня: каменный горн с тёплым зевом, наковальня и мех.
export default { id: 'forge', kind: 'prop', batch: true, outline: 'stone',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      part(new THREE.BoxGeometry(1.5, 1.0, 1.1), 0x3a3630, [0, 0.5, 0], 0, 1, { top: 0x8a8068 }),
      part(new THREE.BoxGeometry(0.9, 0.5, 0.3), 0xff9a3c, [0, 0.55, 0.52], 0, 1, { emit: true }),
      part(new THREE.BoxGeometry(0.7, 1.6, 0.7), 0x3a3630, [0.2, 1.8, -0.1], 0, 1, { top: 0x7a7058 }),
      part(new THREE.BoxGeometry(0.5, 0.25, 0.35), 0x2a2a34, [-1.1, 0.5, 0.2], 0, 1, { top: 0x6a6a7a }),
      part(new THREE.BoxGeometry(0.28, 0.5, 0.28), 0x2a2a34, [-1.1, 0.25, 0.2]),
      part(new THREE.BoxGeometry(0.5, 0.3, 0.7), 0x5a3a22, [1.0, 0.3, 0.3], [0, 0.3, 0], 1, { top: 0x8a5a38 }),
    ]), kit.propMat(this))); return { root };
  } };
