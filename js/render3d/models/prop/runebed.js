// Колодец-рунный круг (в деревне «колодец» заменён рунным кругом): каменное кольцо с бирюзовыми рунами.
export default { id: 'runebed', kind: 'prop', batch: true, outline: 'stone',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const L = [part(new THREE.CylinderGeometry(1.1, 1.2, 0.18, 14), 0x3a362c, [0, 0.09, 0], 0, 1, { top: 0x8a8068, tex: 'stone' }), part(new THREE.CylinderGeometry(0.85, 0.85, 0.2, 14), 0x1c2c30, [0, 0.12, 0], 0, 1, { top: 0x2a4a50 })];
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; L.push(part(new THREE.BoxGeometry(0.2, 0.4 + (i % 2) * 0.25, 0.2), 0x4a463a, [Math.cos(a) * 1.0, 0.3, Math.sin(a) * 1.0], [0, -a, 0], 1, { top: 0xa89a74, tex: 'stone' }), part(new THREE.BoxGeometry(0.05, 0.2, 0.02), PAL.teal, [Math.cos(a) * 0.9, 0.34, Math.sin(a) * 0.9], [0, -a, 0], 1, { emit: true })); }
    L.push(part(new THREE.TorusGeometry(0.62, 0.025, 4, 24), PAL.teal, [0, 0.235, 0], [Math.PI / 2, 0, 0], 1, { emit: true }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
