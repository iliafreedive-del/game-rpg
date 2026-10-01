// Фонарный столб: кованый столб с завитком, фонарь-клетка со стеклом (самосвечение), латунный колпак. Свет задаёт зона.
export default { id: 'lamp', kind: 'prop', batch: true, outline: 'small',
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit;
    const IRON = 0x24242a, IRON_L = 0x5a5a64, L = [];
    L.push(bbox(0.34, 0.16, 0.34, 0.04, 0x4e4a40, [0, 0.08, 0], 0, { top: 0x9a9078, tex: 'stone' }));
    L.push(part(new THREE.CylinderGeometry(0.06, 0.09, 2.0, 8), IRON, [0, 1.1, 0], 0, 1, { top: IRON_L, tex: 'metal' }));
    for (const y of [0.3, 1.0, 1.85]) L.push(part(new THREE.TorusGeometry(0.085, 0.02, 4, 8), PAL.brassD, [0, y, 0], [Math.PI / 2, 0, 0]));
    L.push(part(new THREE.TorusGeometry(0.16, 0.022, 4, 10, Math.PI * 1.2), IRON, [0.12, 1.8, 0], [0, 0, -0.4]));
    L.push(part(new THREE.CylinderGeometry(0.2, 0.13, 0.08, 6), PAL.brassD, [0, 2.06, 0], 0, 1, { top: PAL.brass, tex: 'metal' }));
    L.push(part(new THREE.CylinderGeometry(0.15, 0.13, 0.34, 6), 0xffc070, [0, 2.27, 0], 0, 1, { emit: true }));
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.26; L.push(part(new THREE.BoxGeometry(0.025, 0.36, 0.025), IRON, [Math.cos(a) * 0.155, 2.27, Math.sin(a) * 0.155])); }
    L.push(part(new THREE.ConeGeometry(0.24, 0.22, 6), IRON, [0, 2.55, 0], 0, 1, { top: IRON_L, tex: 'metal' }));
    L.push(part(new THREE.SphereGeometry(0.05, 6, 5), PAL.brass, [0, 2.7, 0]));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
