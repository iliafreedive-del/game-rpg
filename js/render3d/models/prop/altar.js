// Алтарь / святилище благословений: ступенчатое каменное основание и чаша с огнём Бездны.
export default { id: 'altar', kind: 'prop', batch: true, outline: 'stone',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.7, 0.8, 0.25, 8), 0x3a362c, [0, 0.12, 0], 0, 1, { top: 0x8a8068 }),
      part(new THREE.CylinderGeometry(0.4, 0.5, 0.7, 8), 0x4a463a, [0, 0.6, 0], 0, 1, { top: 0xa89a74 }),
      part(new THREE.CylinderGeometry(0.5, 0.3, 0.2, 8), PAL.brassD, [0, 1.05, 0], 0, 1, { top: PAL.brass }),
      part(new THREE.ConeGeometry(0.2, 0.5, 6), PAL.abyss, [0, 1.4, 0], 0, 1, { emit: true }),
    ]), kit.propMat(this))); return { root };
  } };
