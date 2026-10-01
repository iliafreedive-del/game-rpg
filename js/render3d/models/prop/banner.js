// Знамя Ордена на высоком древке.
export default { id: 'banner', kind: 'prop', batch: true, outline: 'small', sway: { base: 1.2, amt: 0.04, flutter: 0.03 },
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.04, 0.05, 2.9, 6), 0x3a2416, [0, 1.45, 0], 0, 1, { top: 0x6a4a2a }),
      part(new THREE.BoxGeometry(0.9, 0.1, 0.1), PAL.brassD, [0, 2.75, 0], 0, 1, { top: PAL.brass }),
      part(new THREE.BoxGeometry(0.8, 1.4, 0.03), 0x35205f, [0, 2.0, 0.05], 0, 1, { top: 0x7a4cd8 }),
      part(new THREE.ConeGeometry(0.4, 0.3, 3), 0x35205f, [0, 1.15, 0.05], [Math.PI, 0, 0], [1, 1, 0.1], { top: 0x35205f }),
      part(new THREE.BoxGeometry(0.1, 0.5, 0.02), PAL.abyss, [0, 2.1, 0.075], 0, 1, { emit: true }),
    ]), kit.propMat(this))); return { root };
  } };
