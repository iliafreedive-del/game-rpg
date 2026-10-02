// Свечи: семь свечей разной высоты на натёках воска, огоньки — самосвечение. Свет — от зоны.
export default { id: 'candles', kind: 'prop', batch: true, outline: false, shadow: false,
  build(kit) {
    const { THREE, PAL, part, merge, geo } = kit, R = geo.rng(43), L = [part(new THREE.CylinderGeometry(0.3, 0.36, 0.05, 10), 0xc8b890, [0, 0.025, 0], 0, [1, 1, 0.8], { top: 0xf0e4c0 })];
    for (let i = 0; i < 7; i++) { const x = (R() - 0.5) * 0.45, z = (R() - 0.5) * 0.35, h = 0.12 + R() * 0.3;
      L.push(part(new THREE.CylinderGeometry(0.035, 0.04, h, 6), 0xd8ccaa, [x, h / 2, z], 0, 1, { top: 0xf8f0d8 }), part(new THREE.ConeGeometry(0.025, 0.07, 5), 0xffc070, [x, h + 0.04, z], 0, 1, { emit: true })); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
