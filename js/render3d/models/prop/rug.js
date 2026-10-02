// Ковёр: тёмно-красное полотно с латунной каймой и знаком Ордена.
export default { id: 'rug', kind: 'prop', batch: true, outline: false, shadow: false,
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([part(new THREE.BoxGeometry(1.6, 0.02, 2.4), 0x5a1a1a, [0, 0.01, 0], 0, 1, { top: 0x8a2a2a, tex: 'cloth' }), part(new THREE.BoxGeometry(1.4, 0.022, 2.2), PAL.brassD, [0, 0.012, 0]), part(new THREE.BoxGeometry(1.3, 0.024, 2.1), 0x6a2020, [0, 0.014, 0], 0, 1, { tex: 'cloth' }), part(new THREE.CylinderGeometry(0.3, 0.3, 0.026, 6), 0x2c1f5c, [0, 0.015, 0], 0, 1, { tex: 'cloth' })]), kit.propMat(this))); return { root };
  } };
