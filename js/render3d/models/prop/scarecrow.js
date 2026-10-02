// Пугало в поле: крестовина, мешок-голова со шляпой, рваный кафтан, пучки соломы из рукавов.
export default { id: 'scarecrow', kind: 'prop', batch: true, outline: false, sway: { base: 0.8, amt: 0.03, flutter: 0.02 },
  build(kit) {
    const { THREE, part, merge, bbox } = kit, L = [];
    L.push(bbox(0.1, 2.1, 0.1, 0.02, 0x4a3220, [0, 1.05, 0], 0, { top: 0x8a6a40, tex: 'wood' }), bbox(1.5, 0.08, 0.08, 0.02, 0x4a3220, [0, 1.55, 0], 0, { top: 0x8a6a40, tex: 'wood' }));
    L.push(part(new THREE.CylinderGeometry(0.32, 0.42, 0.85, 7), 0x6a3a2a, [0, 1.3, 0], 0, 1, { top: 0x9a5a3a, tex: 'cloth' }));
    for (const s of [-1, 1]) { L.push(part(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 6), 0x6a3a2a, [s * 0.5, 1.55, 0], [0, 0, Math.PI / 2], 1, { top: 0x9a5a3a, tex: 'cloth' })); L.push(part(new THREE.ConeGeometry(0.12, 0.28, 5), 0xc8a850, [s * 0.88, 1.52, 0], [0, 0, s * Math.PI / 2], 1, { top: 0xf0d878, tex: 'thatch' })); }
    L.push(part(new THREE.SphereGeometry(0.22, 8, 6), 0xb89a68, [0, 1.95, 0], 0, [1, 1.1, 1], { top: 0xd8c090, tex: 'cloth' }));
    for (const s of [-1, 1]) L.push(part(new THREE.SphereGeometry(0.03, 5, 4), 0x1a1410, [s * 0.08, 1.98, 0.2]));
    L.push(part(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 10), 0x3a2a1a, [0, 2.12, 0], [0.1, 0, 0.08], 1, { top: 0x5a4430 }), part(new THREE.ConeGeometry(0.22, 0.38, 8), 0x3a2a1a, [0, 2.3, 0], [0.1, 0, 0.08], 1, { top: 0x5a4430 }));
    L.push(part(new THREE.ConeGeometry(0.3, 0.3, 7), 0xc8a850, [0, 0.8, 0], [Math.PI, 0, 0], 1, { top: 0xe0c060, tex: 'thatch' }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
