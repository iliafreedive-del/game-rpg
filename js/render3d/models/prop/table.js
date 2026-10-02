// Стол у таверны: круглая столешница на бочке, две табуретки, кружки и миска.
export default { id: 'table', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit, L = [];
    L.push(part(new THREE.CylinderGeometry(0.3, 0.34, 0.75, 10), 0x5a3a22, [0, 0.375, 0], 0, 1, { top: 0x9a7448, tex: 'wood' }));
    for (const y of [0.15, 0.6]) L.push(part(new THREE.TorusGeometry(0.33, 0.02, 4, 12), 0x24242a, [0, y, 0], [Math.PI / 2, 0, 0]));
    L.push(part(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 14), 0x6a4a2a, [0, 0.79, 0], 0, 1, { top: 0xb08a54, tex: 'woodH' }));
    for (const [x, z] of [[0.75, 0.35], [-0.6, -0.55]]) L.push(part(new THREE.CylinderGeometry(0.2, 0.22, 0.45, 8), 0x4a3220, [x, 0.225, z], 0, 1, { top: 0x8a6a40, tex: 'wood' }));
    for (const [x, z] of [[0.2, 0.15], [-0.25, 0.05]]) { L.push(part(new THREE.CylinderGeometry(0.07, 0.065, 0.16, 8), 0x8a6a40, [x, 0.91, z], 0, 1, { top: 0xf0e0b0, tex: 'wood' })); L.push(part(new THREE.TorusGeometry(0.045, 0.012, 4, 6, Math.PI), 0x8a6a40, [x + 0.08, 0.91, z], [0, 0, -Math.PI / 2])); }
    L.push(part(new THREE.CylinderGeometry(0.14, 0.08, 0.07, 10), PAL.brassD, [0.05, 0.86, -0.25], 0, 1, { top: PAL.brass }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
