// Колонна склепа: квадратная база с фасками, круглый ствол с каннелюрами, капитель, у основания — обломки.
export default { id: 'pillar', kind: 'prop', batch: true, outline: false, texWorld: true,
  build(kit) {
    const { THREE, part, merge, bbox, geo } = kit, ST = 0x3a362e, STL = 0x9a8e74, R = geo.rng(31), S = { top: STL, tex: 'stone' };
    const L = [bbox(0.8, 0.35, 0.8, 0.06, ST, [0, 0.17, 0], 0, S), bbox(0.66, 0.2, 0.66, 0.05, ST, [0, 0.45, 0], 0, S),
      part(new THREE.CylinderGeometry(0.26, 0.3, 2.3, 12), ST, [0, 1.7, 0], 0, 1, S),
      bbox(0.7, 0.22, 0.7, 0.05, ST, [0, 2.95, 0], 0, S), bbox(0.84, 0.18, 0.84, 0.05, 0x302c26, [0, 3.14, 0], 0, S)];
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; L.push(part(new THREE.BoxGeometry(0.04, 2.2, 0.04), 0x2a2620, [Math.cos(a) * 0.28, 1.7, Math.sin(a) * 0.28])); }
    for (let i = 0; i < 3; i++) L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(0.12 + R() * 0.08, 0), 0.04, R).translate((R() - 0.5) * 1.1, 0.06, 0.45 + R() * 0.3), ST, S));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
