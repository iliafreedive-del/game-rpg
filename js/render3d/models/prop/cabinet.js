// Шкаф (правки 3): высокий шкаф с двумя дверцами, латунные ручки и петли, на крыше — горшок и свиток. Ставится в библиотеке между книжными шкафами.
export default { id: 'cabinet', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit, T = 0x3a2416, TL = 0x6e4a2a;
    const L = [bbox(1.0, 1.8, 0.45, 0.03, T, [0, 0.95, 0], 0, { top: TL, tex: 'wood' }), bbox(1.08, 0.08, 0.5, 0.02, 0x2a1a0e, [0, 1.88, 0], 0, { top: TL, tex: 'woodH' }), bbox(1.04, 0.1, 0.48, 0.02, 0x2a1a0e, [0, 0.05, 0], 0, { top: TL })];
    for (const sx of [-1, 1]) L.push(bbox(0.44, 1.5, 0.04, 0.015, 0x5a3820, [sx * 0.24, 1.0, 0.23], 0, { top: 0x8a5a30, tex: 'woodH' }), bbox(0.3, 0.5, 0.02, 0.01, 0x4a2c18, [sx * 0.24, 1.35, 0.255], 0, { top: 0x7a4a28 }), bbox(0.3, 0.5, 0.02, 0.01, 0x4a2c18, [sx * 0.24, 0.65, 0.255], 0, { top: 0x7a4a28 }),
      part(new THREE.SphereGeometry(0.035, 6, 4), PAL.brass, [sx * 0.05, 1.0, 0.27]), bbox(0.1, 0.04, 0.02, 0.005, PAL.brassD, [sx * 0.44, 1.55, 0.26], 0, { top: PAL.brass }), bbox(0.1, 0.04, 0.02, 0.005, PAL.brassD, [sx * 0.44, 0.45, 0.26], 0, { top: PAL.brass }));
    L.push(part(new THREE.CylinderGeometry(0.1, 0.08, 0.18, 8), 0x7a4a3a, [-0.28, 2.01, 0], 0, 1, { top: 0xa86a4a }), part(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), 0xe8dcc0, [0.22, 1.96, 0.02], [0, 0.3, Math.PI / 2]));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
