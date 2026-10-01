// Доска заданий: два столба, щит из досок под двускатным козырьком, пергаменты на гвоздях, латунная табличка.
export default { id: 'board', kind: 'prop', batch: true, outline: 'small',
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit;
    const L = [bbox(1.5, 1.0, 0.1, 0.02, 0x4a3220, [0, 1.35, 0], 0, { top: 0x8a6a40, tex: 'woodH' })];
    for (const sx of [-1, 1]) { L.push(bbox(0.14, 2.1, 0.14, 0.03, 0x3a2416, [sx * 0.72, 1.05, -0.02], 0, { top: 0x6a4a2a, tex: 'wood' })); L.push(bbox(0.95, 0.06, 0.4, 0.02, 0x5a2a20, [sx * 0.42, 2.12, 0.05], [0, 0, -sx * 0.4], { top: 0xa0503a, tex: 'roof' })); }
    L.push(bbox(0.5, 0.12, 0.03, 0.01, PAL.brassD, [0, 1.95, 0.07], 0, { top: PAL.brass, tex: 'metal' }));
    [[-0.4, 1.5, 0.35, 0.45], [0.1, 1.6, 0.4, 0.5], [0.5, 1.3, 0.3, 0.4], [-0.1, 1.2, 0.35, 0.3]].forEach(([x, y, w, h], i) => {
      L.push(part(new THREE.BoxGeometry(w, h, 0.02), i % 2 ? 0xe8dcc0 : 0xd8c8a0, [x, y, 0.07], [0, 0, (i - 1.5) * 0.08], 1, { top: 0xfff4d8, tex: 'plaster' }));
      L.push(part(new THREE.SphereGeometry(0.02, 4, 3), 0x2a2a30, [x, y + h / 2 - 0.04, 0.09]));
    });
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
