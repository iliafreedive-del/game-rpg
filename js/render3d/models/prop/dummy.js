// Тренировочное чучело наставника: столб, соломенное туловище в мешковине, «руки»-перекладина, мешок-голова, следы ударов.
export default { id: 'dummy', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox } = kit, L = [];
    L.push(bbox(0.5, 0.12, 0.5, 0.03, 0x4a3220, [0, 0.06, 0], 0, { top: 0x8a6a40, tex: 'woodH' }), bbox(0.12, 1.9, 0.12, 0.02, 0x4a3220, [0, 0.95, 0], 0, { top: 0x8a6a40, tex: 'wood' }));
    L.push(part(new THREE.CylinderGeometry(0.28, 0.25, 0.85, 8), 0xa88a5a, [0, 1.25, 0], 0, 1, { top: 0xd8c090, tex: 'cloth' }));
    for (const y of [1.0, 1.5]) L.push(part(new THREE.TorusGeometry(0.28, 0.03, 4, 10), 0x5a3a22, [0, y, 0], [Math.PI / 2, 0, 0]));
    L.push(bbox(1.2, 0.09, 0.09, 0.02, 0x5a3a22, [0, 1.55, 0], 0, { top: 0x8a6a40, tex: 'wood' }));
    for (const s of [-1, 1]) L.push(part(new THREE.ConeGeometry(0.1, 0.25, 5), 0xc8a850, [s * 0.66, 1.55, 0], [0, 0, s * Math.PI / 2], 1, { top: 0xf0d878, tex: 'thatch' }));
    L.push(part(new THREE.SphereGeometry(0.2, 8, 6), 0xb89a68, [0, 1.88, 0], 0, [1, 1.1, 1], { top: 0xd8c090, tex: 'cloth' }));
    L.push(part(new THREE.BoxGeometry(0.2, 0.04, 0.02), 0x8a2a1a, [0.05, 1.3, 0.27], [0, 0, 0.6]), part(new THREE.BoxGeometry(0.2, 0.04, 0.02), 0x8a2a1a, [0.05, 1.3, 0.27], [0, 0, -0.6]));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
