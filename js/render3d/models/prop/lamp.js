// Фонарный столб. Свет задаёт зона (zone.lights), здесь только самосвечение огня в фонаре.
export default { id: 'lamp', kind: 'prop', batch: true, outline: 'small',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.07, 0.1, 2.0, 6), 0x2a2a30, [0, 1.0, 0], 0, 1, { top: 0x5a5a64 }),
      part(new THREE.CylinderGeometry(0.16, 0.12, 0.08, 6), PAL.brassD, [0, 1.98, 0]),
      part(new THREE.CylinderGeometry(0.14, 0.12, 0.34, 6), 0xffc070, [0, 2.2, 0], 0, 1, { emit: true }),
      part(new THREE.ConeGeometry(0.2, 0.18, 6), 0x2a2a30, [0, 2.46, 0], 0, 1, { top: 0x5a5a64 }),
      part(new THREE.SphereGeometry(0.05, 6, 5), PAL.brass, [0, 2.6, 0]),
    ]), kit.propMat(this))); return { root };
  } };
