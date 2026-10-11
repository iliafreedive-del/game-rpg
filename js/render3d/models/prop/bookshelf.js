// Книжный шкаф: полки из досок, корешки книг разного цвета и высоты, свиток.
export default { id: 'bookshelf', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox, geo } = kit, R = geo.rng(67), WD = 0x3a2416, WDL = 0x6e4a2a;
    // правки 3: каркас полый (задник, бока, крыша, полки) — раньше сплошной ящик закрывал книги, и шкаф выглядел глухой коробкой
    const L = [bbox(1.1, 2.0, 0.05, 0.01, 0x1a120a, [0, 1.0, -0.175], 0, { top: 0x2a1a0e }), bbox(1.16, 0.07, 0.42, 0.02, WD, [0, 2.0, 0], 0, { top: WDL, tex: 'woodH' }), bbox(1.12, 0.1, 0.4, 0.02, WD, [0, 0.05, 0], 0, { top: WDL, tex: 'woodH' })];
    for (const sx of [-1, 1]) L.push(bbox(0.06, 2.0, 0.4, 0.015, WD, [sx * 0.53, 1.0, 0], 0, { top: WDL, tex: 'wood' }));
    for (let s = 1; s < 4; s++) L.push(bbox(1.0, 0.04, 0.38, 0.01, WD, [0, 0.23 + s * 0.48, 0], 0, { top: WDL, tex: 'woodH' }));
    for (let s = 0; s < 4; s++) { const y = 0.25 + s * 0.48; let x = -0.45; while (x < 0.43) { const w = 0.05 + R() * 0.05, h = 0.22 + R() * 0.12; L.push(part(new THREE.BoxGeometry(w, h, 0.25), [0x6a2020, 0x2a4a6a, 0x4a5a2a, 0x6a5020, 0x3a2a5a][Math.floor(R() * 5)], [x + w / 2, y + h / 2 + 0.02, 0.07], [0, 0, (R() - 0.5) * 0.1], 1, { tex: 'cloth' })); x += w + 0.008; } }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
