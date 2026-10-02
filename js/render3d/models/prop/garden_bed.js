// Грядка 2 × 1 м: дощатый бортик, тёмная земля, ряды капусты, моркови и лука.
export default { id: 'garden_bed', kind: 'prop', batch: true, outline: false, tint: 0.1,
  build(kit) {
    const { THREE, part, merge, bbox, geo } = kit, L = [], R = geo.rng(29);
    L.push(bbox(1.9, 0.18, 0.95, 0.03, 0x3a2614, [0, 0.09, 0], 0, { top: 0x4a3018 }));
    for (const z of [-0.5, 0.5]) L.push(bbox(2.0, 0.22, 0.06, 0.01, 0x5a3e26, [0, 0.11, z], 0, { top: 0x9a7a4a, tex: 'woodH' }));
    for (const x of [-1.0, 1.0]) L.push(bbox(0.06, 0.22, 1.06, 0.01, 0x5a3e26, [x, 0.11, 0], 0, { top: 0x9a7a4a, tex: 'woodH' }));
    for (let i = 0; i < 5; i++) { const x = -0.75 + i * 0.37; L.push(part(new THREE.IcosahedronGeometry(0.15, 1), 0x4a8a3a, [x, 0.28, -0.22], [R(), R(), 0], [1, 0.75, 1], { top: 0xb8e08a })); }
    for (let i = 0; i < 8; i++) { const x = -0.8 + i * 0.23; L.push(part(new THREE.ConeGeometry(0.06, 0.28, 4), 0x3e7a2c, [x, 0.32, 0.2], [(R() - 0.5) * 0.4, R(), (R() - 0.5) * 0.4], 1, { top: 0x8ac04a })); if (i % 2) L.push(part(new THREE.ConeGeometry(0.035, 0.1, 4), 0xd8762a, [x, 0.2, 0.2], [Math.PI, 0, 0])); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
