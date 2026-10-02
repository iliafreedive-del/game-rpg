// Кости на полу: рассыпанные трубчатые кости, обломок грудной клетки, череп.
export default { id: 'bones', kind: 'prop', batch: true, outline: false, shadow: false,
  build(kit) {
    const { THREE, PAL, part, merge, geo } = kit, R = geo.rng(37), L = [], B = { top: PAL.bone };
    for (let i = 0; i < 6; i++) { const a = R() * 6.28, x = (R() - 0.5) * 0.9, z = (R() - 0.5) * 0.9, l = 0.25 + R() * 0.25; L.push(kit.tube([[x, 0.03, z], [x + Math.cos(a) * l, 0.03, z + Math.sin(a) * l]], 0.025, 0.02, PAL.boneD, B, 5), part(new THREE.SphereGeometry(0.04, 5, 4), PAL.bone, [x, 0.03, z])); }
    for (let i = 0; i < 4; i++) L.push(kit.tube([[0.25, 0.04, -0.1 + i * 0.07], [0.38, 0.14, -0.1 + i * 0.07], [0.5, 0.05, -0.1 + i * 0.07]], 0.018, 0.012, PAL.boneD, B, 4));
    L.push(part(new THREE.SphereGeometry(0.1, 8, 6), PAL.boneD, [-0.25, 0.08, 0.2], 0, [1, 0.9, 1.1], B), part(new THREE.BoxGeometry(0.04, 0.035, 0.02), 0x0c0a08, [-0.28, 0.09, 0.3]), part(new THREE.BoxGeometry(0.04, 0.035, 0.02), 0x0c0a08, [-0.22, 0.09, 0.3]));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
