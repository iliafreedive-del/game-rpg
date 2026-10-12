// Доска славы (ладдер, 12 октября): каменная стела на ступени, тёмная плита в золотой раме, три золотые таблички
// (первая крупнее) и корона наверху — издали отличается от деревянной доски заданий.
export default { id: 'fame_board', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit;
    const ST = 0x5a5650, STT = 0x9a9488, G = PAL.brassD, GT = PAL.brass;
    const L = [
      bbox(1.5, 0.28, 0.7, 0.04, 0x3a362c, [0, 0.14, 0], 0, { top: 0x8a8068, tex: 'stone' }),   // ступень
      bbox(1.25, 2.0, 0.28, 0.04, ST, [0, 1.28, 0], 0, { top: STT, tex: 'stone' }),            // стела
      bbox(1.02, 1.5, 0.04, 0.01, 0x1c1a22, [0, 1.25, 0.15], 0, { top: 0x34303c, tex: 'stone' }), // тёмная плита
    ];
    for (const sx of [-1, 1]) L.push(bbox(0.07, 1.6, 0.06, 0.01, G, [sx * 0.53, 1.25, 0.16], 0, { top: GT, tex: 'gold' }));   // рама
    for (const y of [0.47, 2.03]) L.push(bbox(1.12, 0.07, 0.06, 0.01, G, [0, y, 0.16], 0, { top: GT, tex: 'gold' }));
    [[1.72, 0.7, 0.2], [1.38, 0.6, 0.16], [1.08, 0.6, 0.16], [0.8, 0.6, 0.14]].forEach(([y, w, h], i) =>   // таблички: первое место крупнее
      L.push(bbox(w, h, 0.03, 0.01, i ? G : 0xb8862a, [0, y, 0.18], 0, { top: i ? GT : 0xffd86a, tex: 'gold' })));
    L.push(part(new THREE.CylinderGeometry(0.2, 0.26, 0.14, 8), G, [0, 2.36, 0], 0, 1, { top: GT, tex: 'gold' }));   // корона
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; L.push(part(new THREE.ConeGeometry(0.05, 0.18, 4), G, [Math.sin(a) * 0.2, 2.5, Math.cos(a) * 0.2], 0, 1, { top: GT, tex: 'gold' })); }
    L.push(part(new THREE.SphereGeometry(0.06, 6, 4), PAL.teal, [0, 2.42, 0.22], 0, 1, { emit: true }));   // самоцвет короны
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
