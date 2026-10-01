// Ящик: доски с фасками, рамка по рёбрам, диагональная планка, гвозди. Чуть повёрнут.
export default { id: 'crate', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox, geo } = kit;
    const S = 0.68, L = [bbox(S - 0.04, S - 0.04, S - 0.04, 0.02, 0x6a4a2a, [0, S / 2, 0], 0, { top: 0xb08a54, tex: 'woodH' })];
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      L.push(bbox(0.08, S, 0.08, 0.02, 0x4a3220, [a * (S / 2 - 0.03), S / 2, b * (S / 2 - 0.03)], 0, { top: 0x8a6a40, tex: 'wood' }));
      L.push(bbox(S, 0.08, 0.08, 0.02, 0x4a3220, [0, S / 2 + a * (S / 2 - 0.04), b * (S / 2 - 0.03)], 0, { top: 0x8a6a40, tex: 'woodH' }));
      L.push(bbox(0.08, 0.08, S, 0.02, 0x4a3220, [a * (S / 2 - 0.03), S / 2 + b * (S / 2 - 0.04), 0], 0, { top: 0x8a6a40, tex: 'woodH' }));
    }
    for (const f of [0, 1]) { const g = geo.chamferBox(0.07, S * 1.2, 0.03, 0.01); g.rotateZ(0.78); if (f) g.rotateY(Math.PI / 2); g.translate(f ? S / 2 + 0.005 : 0, S / 2, f ? 0 : S / 2 + 0.005); L.push(geo.paint(g, 0x4a3220, { top: 0x8a6a40, tex: 'wood' })); }
    const root = new THREE.Group(); const m = new THREE.Mesh(merge(L), kit.propMat(this)); m.rotation.y = 0.3; root.add(m); return { root };
  } };
