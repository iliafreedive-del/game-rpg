// Ряд виноградника (2 м вдоль X): столбики, проволока, плотная листва шпалерой, свисающие тёмные грозди.
export default { id: 'vine_row', kind: 'prop', batch: true, outline: false, tint: 0.12, sway: { base: 0.6, amt: 0.03, flutter: 0.02 },
  build(kit) {
    const { THREE, part, merge, bbox, geo } = kit, L = [], R = geo.rng(17);
    for (const x of [-0.95, 0.95]) L.push(bbox(0.08, 1.35, 0.08, 0.02, 0x4a3220, [x, 0.67, 0], 0, { top: 0x8a6a40, tex: 'wood' }));
    for (const y of [0.6, 1.05]) L.push(part(new THREE.CylinderGeometry(0.008, 0.008, 1.9, 3), 0x6a6a6a, [0, y, 0], [0, 0, Math.PI / 2]));
    for (let i = 0; i < 16; i++) { const x = -0.85 + (i / 15) * 1.7 + (R() - 0.5) * 0.1, y = 0.65 + R() * 0.55; L.push(part(new THREE.IcosahedronGeometry(0.2 + R() * 0.08, 0), R() < 0.4 ? 0x2e5a22 : 0x3e7a2c, [x, y, (R() - 0.5) * 0.18], [R(), R(), R()], [1, 0.8, 0.7], { top: 0x8ac04a })); }
    for (let i = 0; i < 6; i++) { const x = -0.7 + i * 0.28 + (R() - 0.5) * 0.1, z = (R() < 0.5 ? -1 : 1) * 0.16; L.push(part(new THREE.ConeGeometry(0.08, 0.2, 5), 0x3a1a4a, [x, 0.5 + R() * 0.15, z], [Math.PI, 0, 0], 1, { top: 0x7a4a9a })); }
    L.push(part(new THREE.CylinderGeometry(0.035, 0.05, 0.6, 5), 0x4a3220, [0, 0.3, 0], 0, 1, { top: 0x6a4a2c, tex: 'bark' }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
