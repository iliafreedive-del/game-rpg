// Обломки кладки: груда битых камней разного размера.
export default { id: 'rubble', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, merge, geo } = kit, R = geo.rng(41), L = [];
    for (let i = 0; i < 9; i++) { const r = 0.08 + R() * 0.16; L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(r, 0), r * 0.4, R).translate((R() - 0.5) * 0.9, r * 0.6 + (i > 6 ? 0.15 : 0), (R() - 0.5) * 0.9), 0x3a362e, { top: 0x9a8e74, tex: 'stone' })); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
