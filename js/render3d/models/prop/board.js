// Доска заданий: два столба, щит с пергаментами и латунным навершием.
export default { id: 'board', kind: 'prop', batch: true, outline: 'small',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const L = [part(new THREE.BoxGeometry(1.5, 1.0, 0.1), 0x4a3220, [0, 1.35, 0], 0, 1, { top: 0x8a6a40 }), part(new THREE.BoxGeometry(1.7, 0.1, 0.18), PAL.brassD, [0, 1.9, 0], 0, 1, { top: PAL.brass })];
    for (const sx of [-1, 1]) L.push(part(new THREE.BoxGeometry(0.12, 1.9, 0.12), 0x3a2416, [sx * 0.7, 0.95, -0.02], 0, 1, { top: 0x6a4a2a }));
    [[-0.4, 1.5, 0.35, 0.45], [0.1, 1.6, 0.4, 0.5], [0.5, 1.3, 0.3, 0.4], [-0.1, 1.2, 0.35, 0.3]].forEach(([x, y, w, h], i) => L.push(part(new THREE.BoxGeometry(w, h, 0.02), i % 2 ? 0xe8dcc0 : 0xd8c8a0, [x, y, 0.07], [0, 0, (i - 1.5) * 0.08], 1, { top: 0xfff4d8 })));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
