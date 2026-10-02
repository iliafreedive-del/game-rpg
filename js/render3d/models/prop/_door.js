// Дверь в проёме стены (1 тайл, плоскость двери вдоль X, лицом к +Z): каменный портал-арка, створка из досок с железными
// полосами и заклёпками, кольцо. open — створка распахнута на петлях. gate — запечатанная решётка Ордена с рунами Бездны.
export function door(kit, def, { open = false, gate = false } = {}) {
  const { THREE, PAL, part, merge, bbox } = kit, ST = 0x3a362e, STL = 0x9a8e74, S = { top: STL, tex: 'stone', texWorld: true }, L = [];
  for (const s of [-1, 1]) L.push(bbox(0.2, 2.7, 1.04, 0.04, ST, [s * 0.52, 1.35, 0], 0, S));
  L.push(bbox(1.24, 0.4, 1.04, 0.05, ST, [0, 2.9, 0], 0, S), bbox(1.06, 0.12, 1.06, 0.03, 0x14120f, [0, 3.06, 0], 0, { top: 0x2a2620 }));
  for (let i = 0; i < 5; i++) { const a = Math.PI * (i + 0.5) / 5; L.push(bbox(0.18, 0.16, 0.2, 0.03, 0x302c26, [Math.cos(a) * 0.5, 2.25 + Math.sin(a) * 0.45, 0.48], [0, 0, a - Math.PI / 2], { top: STL, tex: 'stone' })); }
  if (gate) {
    for (let i = 0; i < 7; i++) L.push(part(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6), 0x24242a, [-0.39 + i * 0.13, 1.25, 0], 0, 1, { top: 0x6a6a74, tex: 'iron' }));
    for (const y of [0.4, 1.3, 2.2]) L.push(bbox(0.9, 0.06, 0.06, 0.01, 0x24242a, [0, y, 0], 0, { top: 0x6a6a74, tex: 'iron' }));
    L.push(part(new THREE.TorusGeometry(0.22, 0.03, 4, 16), PAL.abyss, [0, 1.4, 0.05], 0, 1, { emit: true }), part(new THREE.OctahedronGeometry(0.1, 0), PAL.abyss, [0, 1.4, 0.06], 0, 1, { emit: true }));
  } else {
    const leaf = [bbox(0.84, 2.3, 0.1, 0.02, 0x4a2c18, [0.42, 1.15, 0], 0, { top: 0x7a5232, tex: 'wood' }),
      ...[0.4, 1.15, 1.9].map(y => bbox(0.86, 0.08, 0.03, 0.01, 0x24242a, [0.42, y, 0.065], 0, { top: 0x6a6a74, tex: 'iron' })),
      part(new THREE.TorusGeometry(0.07, 0.015, 4, 10), PAL.brass, [0.72, 1.1, 0.08])];
    for (const g of leaf) { g.translate(-0.42, 0, 0); if (open) g.rotateY(-1.45); g.translate(-0.42 + 0.0, 0, open ? 0.05 : 0); L.push(g); }
  }
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
