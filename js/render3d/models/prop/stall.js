// Торговый прилавок: стол из досок на козлах, полосатый навес-ткань с бахромой, товары (горшки, тыквы, свёртки, ящики).
export default { id: 'stall', kind: 'prop', batch: true, outline: 'small',
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit;
    const T = 0x3a2416, TL = 0x6e4a2a, L = [];
    L.push(bbox(1.9, 0.1, 0.8, 0.025, 0x6a4a2a, [0, 0.82, 0.15], 0, { top: 0xb08a54, tex: 'woodH' }));
    L.push(bbox(1.8, 0.6, 0.06, 0.02, 0x5a3a22, [0, 0.47, 0.52], 0, { top: 0x9a7a4a, tex: 'woodH' }));
    for (const sx of [-1, 1]) { L.push(bbox(0.1, 2.2, 0.1, 0.02, T, [sx * 0.9, 1.1, -0.2], 0, { top: TL, tex: 'wood' })); L.push(bbox(0.1, 0.8, 0.1, 0.02, T, [sx * 0.85, 0.4, 0.45], 0, { top: TL, tex: 'wood' })); }
    for (let i = 0; i < 6; i++) {
      L.push(part(new THREE.BoxGeometry(0.32, 0.04, 1.15), i % 2 ? 0xe8dcc0 : 0x2a8a80, [-0.8 + i * 0.32, 2.1, -0.05], [0.25, 0, 0], 1, { tex: 'cloth' }));
      L.push(part(new THREE.ConeGeometry(0.1, 0.16, 3), i % 2 ? 0xe8dcc0 : 0x2a8a80, [-0.8 + i * 0.32, 1.88, 0.5], [Math.PI, 0, 0], [1.4, 1, 0.3], { tex: 'cloth' }));
    }
    L.push(part(new THREE.SphereGeometry(0.13, 8, 6), 0xd07a20, [0.35, 0.98, 0.25], 0, [1, 0.8, 1], { top: 0xf0a040 }), part(new THREE.SphereGeometry(0.1, 8, 6), 0xd07a20, [0.55, 0.95, 0.1], 0, [1, 0.8, 1], { top: 0xf0a040 }));
    L.push(part(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 8), 0x8a4a30, [-0.4, 0.98, 0.25], 0, 1, { top: 0xc87a50 }), part(new THREE.CylinderGeometry(0.07, 0.1, 0.3, 8), 0x2a6a60, [-0.62, 1.02, 0.1], 0, 1, { top: 0x4aa090 }));
    L.push(bbox(0.3, 0.2, 0.25, 0.02, 0x6a4a2a, [-0.05, 0.97, 0.05], [0, 0.3, 0], { top: 0xb08a54, tex: 'woodH' }), part(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), 0xd8c8a0, [0.1, 0.94, 0.4], [0, 0, Math.PI / 2], 1, { tex: 'cloth' }));
    L.push(part(new THREE.SphereGeometry(0.12, 7, 5), PAL.brass, [0.8, 0.95, 0.2], 0, 1, { top: 0xf0c868 }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
