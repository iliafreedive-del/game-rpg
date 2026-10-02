// Камешки у троп: четыре гранёных камня, верх тронут мхом. Декор земли.
export default { id: 'pebbles', kind: 'prop', batch: true, outline: false, shadow: false, ao: 0.6, aoH: 0.25,
  build(kit) {
    const { THREE, geo, merge } = kit, R = geo.rng(41);
    const mk = (r, x, z, sy, moss) => { const g = new THREE.DodecahedronGeometry(r, 0); g.scale(1, sy, 0.8 + R() * 0.3); geo.jitter(g, r * 0.35, R); g.rotateY(R() * 6); g.translate(x, r * sy * 0.35, z); return geo.paint(g, 0x4a4438, { top: moss ? 0x6a8a3a : 0xb0a488 }); };
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([mk(0.2, 0, 0, 0.7, true), mk(0.13, 0.28, 0.12, 0.8, false), mk(0.09, -0.2, 0.2, 0.9, false), mk(0.07, 0.1, -0.24, 1, true)]), kit.propMat(this))); return { root };
  } };
