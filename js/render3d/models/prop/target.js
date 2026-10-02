// Мишень лучника: соломенный щит с кругами на треноге, торчат две стрелы.
export default { id: 'target', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox, geo } = kit, L = [];
    for (const [x, r] of [[-0.4, 0.25], [0.4, -0.25]]) L.push(bbox(0.08, 1.6, 0.08, 0.02, 0x4a3220, [x, 0.75, -0.15], [0.25, 0, r], { top: 0x8a6a40, tex: 'wood' }));
    L.push(bbox(0.08, 1.5, 0.08, 0.02, 0x4a3220, [0, 0.7, -0.5], [-0.35, 0, 0], { top: 0x8a6a40, tex: 'wood' }));
    const z = 0.0, y = 1.15, rings = [[0.55, 0xc8a850], [0.44, 0xe8e0c8], [0.33, 0x8a2a1a], [0.22, 0xe8e0c8], [0.11, 0xc83a2a]];
    rings.forEach(([r, c], i) => L.push(part(new THREE.CylinderGeometry(r, r, 0.14 + i * 0.012, 16), c, [0, y, z + i * 0.006], [Math.PI / 2 - 0.15, 0, 0], 1, i ? {} : { tex: 'thatch' })));
    for (const [x, yy] of [[0.12, 0.08], [-0.2, -0.15]]) { L.push(part(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 4), 0x6a4a2c, [x, y + yy, 0.3], [Math.PI / 2 - 0.3, 0, 0])); L.push(part(new THREE.ConeGeometry(0.05, 0.12, 3), 0xe8e0c8, [x, y + yy + 0.08, 0.58], [Math.PI / 2 - 0.3, 0, 0])); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
