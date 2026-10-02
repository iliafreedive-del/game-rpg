// Лавовый камень: тёмная глыба с раскалёнными трещинами (самосвечение). Свет — от зоны.
export default { id: 'lavarock', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, merge, geo } = kit, R = geo.rng(59), L = [geo.paint(geo.jitter(new THREE.DodecahedronGeometry(0.45, 1), 0.12, R).translate(0, 0.28, 0), 0x1a1612, { top: 0x4a4038, tex: 'stone' })];
    for (let i = 0; i < 4; i++) { const a = i * 1.6; L.push(geo.paint(geo.taperTube([[Math.cos(a) * 0.2, 0.1, Math.sin(a) * 0.2], [Math.cos(a) * 0.38, 0.35, Math.sin(a) * 0.36], [Math.cos(a) * 0.3, 0.6, Math.sin(a) * 0.25]], 0.04, 0.015, 4), 0xff6a20, { emit: true })); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
