// Валуны: три граненых камня разного размера.
export default { id: 'rocks', kind: 'prop', batch: true, outline: 'stone',
  build(kit) {
    const { THREE, geo, merge } = kit, mk = (sd, r, x, z, sy) => { const g = new THREE.DodecahedronGeometry(r, 0); g.scale(1, sy, 0.85); geo.jitter(g, r * 0.3, geo.rng(sd)); g.translate(x, r * sy * 0.55, z); return geo.paint(g, 0x2e2c28, { top: 0x9a9078, tex: 'stone' }); };
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([mk(1, 0.5, 0, 0, 0.7), mk(2, 0.3, 0.55, 0.2, 0.8), mk(3, 0.22, -0.4, 0.35, 0.9)]), kit.propMat(this))); return { root };
  } };
