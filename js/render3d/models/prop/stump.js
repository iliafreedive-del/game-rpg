// Пень с корнями, мхом и топором; или поваленное бревно (variant). Кромка леса.
export default { id: 'stump', kind: 'prop', batch: true, outline: false, ao: 0.55, aoH: 0.5,
  build(kit) {
    const { THREE, part, merge, geo } = kit, L = [];
    L.push(part(new THREE.CylinderGeometry(0.3, 0.38, 0.45, 9), 0x3a2618, [0, 0.22, 0], 0, 1, { top: 0x6a4a30, tex: 'bark' }));
    L.push(part(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 9), 0xb08858, [0, 0.455, 0], 0, 1, { top: 0xd8b07a, tex: 'woodH' }));
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + 0.4, g = new THREE.CylinderGeometry(0.03, 0.1, 0.6, 5); g.translate(0, 0.3, 0); g.rotateZ(1.25); g.rotateY(-a); g.translate(Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2); L.push(geo.paint(g, 0x3a2618, { top: 0x5a4028, tex: 'bark' })); }
    L.push(part(new THREE.SphereGeometry(0.2, 7, 5), 0x3a6a2a, [-0.15, 0.3, 0.2], 0, [1, 0.45, 1], { top: 0x6a9a3a }));
    // поваленное бревно рядом
    L.push(part(new THREE.CylinderGeometry(0.18, 0.2, 1.6, 9), 0x3a2618, [0.9, 0.17, -0.3], [Math.PI / 2, 0.7, 0], 1, { top: 0x6a4a30, tex: 'bark' }));
    L.push(part(new THREE.SphereGeometry(0.22, 7, 5), 0x3a6a2a, [0.9, 0.3, -0.3], 0, [2.2, 0.35, 0.9], { top: 0x7aaa3a }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
