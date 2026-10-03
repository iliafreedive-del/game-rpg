// Верёвка с бельём между двумя столбами (3 м вдоль X): простыня, рубаха, красная и бежевая тряпки, колышутся на ветру.
export default { id: 'clothesline', kind: 'prop', batch: true, outline: false, sway: { base: 1.2, amt: 0.05, flutter: 0.02 }, side: 'double',
  build(kit) {
    const { THREE, part, merge, bbox } = kit, L = [], H = 1.95;
    for (const x of [-1.5, 1.5]) { L.push(bbox(0.1, H + 0.1, 0.1, 0.02, 0x5a4028, [x, (H + 0.1) / 2, 0], 0, { top: 0x9a7448, tex: 'wood' })); L.push(bbox(0.08, 0.06, 0.4, 0.01, 0x5a4028, [x, H - 0.05, 0], 0, { top: 0x9a7448, tex: 'wood' })); }
    for (const [x0, x1] of [[-1.5, 0], [0, 1.5]]) { const len = Math.hypot(x1 - x0, 0.12), a = Math.atan2(0.12, x1 - x0) * (x0 < 0 ? -1 : 1); L.push(part(new THREE.CylinderGeometry(0.01, 0.01, len, 3), 0xe0d8c0, [(x0 + x1) / 2, H - 0.12 - 0.06, 0], [0, 0, Math.PI / 2 + a])); }
    const cloth = (x, w, h, c, cl) => { const sag = 0.18 * (1 - (x / 1.5) ** 2); L.push(bbox(w, h, 0.02, 0.005, c, [x, H - 0.12 - sag - h / 2, 0], [0, 0, (x * 0.05)], { top: cl, tex: 'cloth' })); };
    cloth(-0.9, 0.8, 0.95, 0xd8d4c8, 0xf4f0e8); cloth(-0.1, 0.42, 0.5, 0xa83a2a, 0xd0604a); cloth(0.45, 0.48, 0.62, 0xd8c8a0, 0xf0e4c4); cloth(1.05, 0.34, 0.4, 0x7a6a50, 0xa8946c);
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
