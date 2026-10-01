// Колодец: каменное кольцо, два столба, навес из дранки, ворот с верёвкой и ведро.
export default { id: 'well', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox } = kit, S = { top: 0x9a8e74, tex: 'stone' };
    const L = [part(new THREE.CylinderGeometry(0.62, 0.66, 0.7, 14, 1, true), 0x4a463c, [0, 0.35, 0], 0, 1, S), part(new THREE.TorusGeometry(0.62, 0.08, 5, 16), 0x5a564a, [0, 0.7, 0], [Math.PI / 2, 0, 0], 1, S), part(new THREE.CircleGeometry(0.58, 14), 0x0a1418, [0, 0.4, 0], [-Math.PI / 2, 0, 0]),
      ...[-1, 1].map(s => bbox(0.1, 1.7, 0.1, 0.02, 0x3a2416, [s * 0.62, 0.85, 0], 0, { top: 0x6e4a2a, tex: 'wood' })),
      part(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 7), 0x5a3a22, [0, 1.35, 0], [0, 0, Math.PI / 2], 1, { tex: 'wood' }),
      ...[-1, 1].map(s => bbox(1.6, 0.06, 0.7, 0.02, 0x6a2a1e, [0, 1.85, s * 0.25], [s * 0.6, 0, 0], { top: 0xc0603e, tex: 'roof' })),
      part(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), 0x8a7a58, [0.1, 1.05, 0]), part(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 8), 0x5a3a22, [0.1, 0.72, 0], 0, 1, { tex: 'woodH' })];
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
