export default { id: 'crate', kind: 'prop', batch: true, outline: 'small',
  build(kit) {
    const { THREE, part, merge } = kit;
    const L = [part(new THREE.BoxGeometry(0.7, 0.7, 0.7), 0x6a4a2a, [0, 0.35, 0], [0, 0.3, 0], 1, { top: 0xb08a54 })];
    for (const sx of [-1, 1]) L.push(part(new THREE.BoxGeometry(0.08, 0.72, 0.72), 0x4a3220, [sx * 0.31, 0.35, 0], [0, 0.3, 0], 1, { top: 0x8a6a40 }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
