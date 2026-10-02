// Скамья на площади: толстая доска на двух чурбаках.
export default { id: 'bench', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox } = kit, L = [];
    L.push(bbox(1.6, 0.1, 0.42, 0.03, 0x5a3a22, [0, 0.48, 0], 0, { top: 0xa07a4a, tex: 'woodH' }));
    for (const x of [-0.6, 0.6]) L.push(part(new THREE.CylinderGeometry(0.17, 0.19, 0.44, 8), 0x4a3220, [x, 0.22, 0], 0, 1, { top: 0x8a6a40, tex: 'bark' }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
