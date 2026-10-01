// Торговый прилавок под полосатым навесом (латунь и бирюзовый шёлк).
export default { id: 'stall', kind: 'prop', batch: true, outline: 'small',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const L = [part(new THREE.BoxGeometry(1.9, 0.8, 0.8), 0x5a3a22, [0, 0.4, 0.15], 0, 1, { top: 0xa07a48 })];
    for (const sx of [-1, 1]) L.push(part(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), 0x3a2416, [sx * 0.9, 1.05, -0.2]));
    for (let i = 0; i < 6; i++) L.push(part(new THREE.BoxGeometry(0.32, 0.05, 1.1), i % 2 ? 0xe8dcc0 : 0x2a8a80, [-0.8 + i * 0.32, 2.12 - 0.04, -0.05], [0.25, 0, 0]));
    L.push(part(new THREE.SphereGeometry(0.12, 7, 5), PAL.brass, [0.3, 0.88, 0.2], 0, 1, { top: 0xf0c868 }), part(new THREE.BoxGeometry(0.22, 0.2, 0.22), 0x8a3a30, [-0.4, 0.9, 0.2]), part(new THREE.BoxGeometry(0.2, 0.3, 0.2), 0x2a8a80, [-0.7, 0.95, 0.15]));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
