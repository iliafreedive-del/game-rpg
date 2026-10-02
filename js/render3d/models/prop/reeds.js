// Камыш у берега: пучок тонких листьев и рогоз с коричневыми початками.
export default { id: 'reeds', kind: 'prop', batch: true, outline: false, sway: { base: 0.1, amt: 0.06, flutter: 0.04 }, tint: 0.15,
  build(kit) {
    const { THREE, part, merge, geo } = kit, L = [], R = geo.rng(33);
    for (let i = 0; i < 12; i++) { const a = R() * 6.283, r = R() * 0.35, h = 0.8 + R() * 0.7; L.push(part(new THREE.ConeGeometry(0.03, h, 3), 0x3e6a2a, [Math.cos(a) * r, h / 2, Math.sin(a) * r], [(R() - 0.5) * 0.4, R(), (R() - 0.5) * 0.4], 1, { top: 0x9ac05a })); }
    for (let i = 0; i < 4; i++) { const a = R() * 6.283, r = R() * 0.25, h = 1.1 + R() * 0.4; L.push(part(new THREE.CylinderGeometry(0.012, 0.012, h, 3), 0x4a6a2a, [Math.cos(a) * r, h / 2, Math.sin(a) * r])); L.push(part(new THREE.CapsuleGeometry(0.04, 0.14, 2, 5), 0x5a3218, [Math.cos(a) * r, h - 0.05, Math.sin(a) * r], 0, 1, { top: 0x8a5a30 })); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
