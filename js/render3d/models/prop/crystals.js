// Кластер бирюзово-фиолетовых кристаллов (свет — из zone.lights).
export default { id: 'crystals', kind: 'prop', batch: true, outline: 'small', rim: 0.6, rimColor: 0xbfffee,
  build(kit) {
    const { THREE, part, merge } = kit;
    const L = []; [[0, 0, 1.2, 0.2, 0], [0.3, 0.1, 0.8, 0.14, 0.4], [-0.28, 0.05, 0.7, 0.13, -0.45], [0.05, -0.28, 0.55, 0.1, 0.15], [-0.1, 0.3, 0.5, 0.1, -0.2]].forEach(([x, z, h, r, tilt], i) =>
      L.push(part(new THREE.ConeGeometry(r, h, 5), i % 2 ? 0x2a8aa0 : 0x6a3fd0, [x, h / 2, z], [tilt * 0.4, 0, -tilt], 1, { top: i % 2 ? 0x8afff0 : 0xc9a8ff, emit: i === 0 })));
    L.push(part(new THREE.CylinderGeometry(0.36, 0.45, 0.14, 7), 0x2e2c28, [0, 0.06, 0], 0, 1, { top: 0x6a6450 }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
