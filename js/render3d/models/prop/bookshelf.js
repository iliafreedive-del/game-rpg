// Книжный шкаф: полки из досок, корешки книг разного цвета и высоты, свиток.
export default { id: 'bookshelf', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox, geo } = kit, R = geo.rng(67), L = [bbox(1.1, 2.0, 0.4, 0.03, 0x3a2416, [0, 1.0, 0], 0, { top: 0x6e4a2a, tex: 'wood' })];
    for (let s = 0; s < 4; s++) { const y = 0.25 + s * 0.48; L.push(part(new THREE.BoxGeometry(1.0, 0.36, 0.05), 0x1a120a, [0, y + 0.18, 0.16])); let x = -0.45; while (x < 0.43) { const w = 0.05 + R() * 0.05, h = 0.22 + R() * 0.12; L.push(part(new THREE.BoxGeometry(w, h, 0.25), [0x6a2020, 0x2a4a6a, 0x4a5a2a, 0x6a5020, 0x3a2a5a][Math.floor(R() * 5)], [x + w / 2, y + h / 2 + 0.02, 0.07], [0, 0, (R() - 0.5) * 0.1], 1, { tex: 'cloth' })); x += w + 0.008; } }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
