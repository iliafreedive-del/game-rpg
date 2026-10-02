// Деревянный мост через ручей: настил из досок поперёк, две продольные балки, сваи в воду, перила с раскосами.
// Длина — opts.len (вдоль X, задаёт генератор деревни по ширине ручья), ширина 2,8 м. Настил почти вровень с землёй.
export default { id: 'bridge', kind: 'prop', outline: false,
  build(kit, opts = {}) {
    const { THREE, part, merge, bbox, geo } = kit, L = [], R = geo.rng(5), len = opts.len || 5, BW = 2.8, T = 0x4a3220, TL = 0x9a7448;
    const n = Math.round(len / 0.32);
    for (let i = 0; i < n; i++) { const x = -len / 2 + (i + 0.5) * len / n, t = (x + len / 2) / len, y = 0.1 + Math.sin(Math.PI * t) * 0.1; L.push(bbox(len / n - 0.03, 0.09, BW - (R() < 0.15 ? 0.25 : 0) + (R() - 0.5) * 0.12, 0.015, R() < 0.5 ? 0x5a3e26 : 0x6a4a2c, [x, y, (R() - 0.5) * 0.06], [0, (R() - 0.5) * 0.03, 0], { top: R() < 0.3 ? 0xa88458 : TL, tex: 'woodH' })); }
    for (const z of [-1.0, 1.0]) L.push(bbox(len + 0.3, 0.24, 0.24, 0.03, 0x3a2614, [0, -0.08, z], 0, { top: 0x6a4a2c, tex: 'wood' }));
    const posts = [-len / 2 + 0.15, -len / 6, len / 6, len / 2 - 0.15];
    for (const x of posts) for (const s of [-1, 1]) {
      L.push(bbox(0.2, 1.75, 0.2, 0.03, T, [x, 0.2, s * (BW / 2 + 0.05)], 0, { top: TL, tex: 'wood' }));
      L.push(part(new THREE.ConeGeometry(0.15, 0.2, 4), T, [x, 1.15, s * (BW / 2 + 0.05)], [0, Math.PI / 4, 0], 1, { top: TL, tex: 'wood' }));
    }
    for (const s of [-1, 1]) {
      L.push(geo.paint(geo.warp(geo.chamferBox(len + 0.1, 0.12, 0.12, 0.03).translate(0, 0.98, s * (BW / 2 + 0.05)), 0.03, 3 + s), 0x5a3e26, { top: 0xa88458, tex: 'woodH' }));
      for (let k = 0; k < posts.length - 1; k++) {   // раскосы крест-накрест между сваями
        const xa = posts[k], xb = posts[k + 1], l2 = Math.hypot(xb - xa, 0.7);
        for (const d of [-1, 1]) { const g = geo.chamferBox(l2, 0.08, 0.07, 0.02); g.rotateZ(d * Math.atan2(0.7, xb - xa)); L.push(geo.paint(g.translate((xa + xb) / 2, 0.55, s * (BW / 2 + 0.08)), 0x4a3220, { top: 0x8a6a40, tex: 'woodH' })); }
      }
    }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
