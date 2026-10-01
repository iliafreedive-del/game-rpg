// Кузня: горн из каменных блоков с раскалённым зевом, дымоход, наковальня на чурбаке, мех из кожи, бочка с водой, инструменты.
export default { id: 'forge', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit;
    const ST = 0x3e3a32, STL = 0x8a8068, IR = 0x24242c, IRL = 0x6a6a7a;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      bbox(1.5, 1.0, 1.1, 0.07, ST, [0, 0.5, 0], 0, { top: STL, tex: 'stone' }),
      bbox(1.6, 0.12, 1.2, 0.04, 0x2e2a24, [0, 1.02, 0], 0, { top: 0x6a6252, tex: 'stone' }),
      part(new THREE.BoxGeometry(0.9, 0.45, 0.3), 0xff8a2c, [0, 0.55, 0.45], 0, 1, { emit: true }),
      part(new THREE.BoxGeometry(0.7, 0.12, 0.6), 0xffc060, [0, 1.06, 0.1], 0, 1, { emit: true }),
      bbox(0.75, 1.7, 0.75, 0.06, ST, [0.2, 1.9, -0.15], 0, { top: STL, tex: 'stone' }),
      bbox(0.85, 0.12, 0.85, 0.03, 0x2e2a24, [0.2, 2.78, -0.15], 0, { top: 0x6a6252, tex: 'stone' }),
      part(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 8), 0x5a3a22, [-1.1, 0.25, 0.2], 0, 1, { top: 0x9a7a4a, tex: 'bark' }),
      bbox(0.55, 0.14, 0.24, 0.03, IR, [-1.1, 0.58, 0.2], 0, { top: IRL, tex: 'metal' }),
      part(new THREE.ConeGeometry(0.09, 0.26, 4), IR, [-1.43, 0.6, 0.2], [0, 0, Math.PI / 2], 1, { top: IRL, tex: 'metal' }),
      bbox(0.3, 0.12, 0.2, 0.02, IR, [-1.1, 0.46, 0.2], 0, { top: IRL, tex: 'metal' }),
      part(new THREE.CylinderGeometry(0.3, 0.28, 0.55, 10), 0x5a3a22, [1.05, 0.28, 0.35], 0, 1, { top: 0xa07a48, tex: 'wood' }),
      part(new THREE.CylinderGeometry(0.27, 0.27, 0.02, 10), 0x1a3a40, [1.05, 0.54, 0.35]),
      bbox(0.5, 0.25, 0.6, 0.04, 0x5a3020, [0.95, 0.75, -0.3], [0, 0.3, 0.2], { top: 0x8a5a38, tex: 'cloth' }),
      part(new THREE.BoxGeometry(0.04, 0.5, 0.04), 0x4a3220, [-0.75, 1.3, 0.45], [0, 0, 0.5]), part(new THREE.BoxGeometry(0.16, 0.08, 0.06), IR, [-0.62, 1.52, 0.45], [0, 0, 0.5]),
    ]), kit.propMat(this))); return { root };
  } };
