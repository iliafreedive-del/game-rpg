// Полуразрушенная водяная мельница на том берегу (атмосфера, туда не пройти): каменный низ во мху, щипец из досок,
// крыша из дранки с провалом и голыми стропилами, заколоченные окна, плющ и папоротники. Колесо — в ручье у западной стены,
// южнее дома (камера с +x,+z видит его), часть лопастей выбита, оно медленно скрипит под струёй из обломанного жёлоба.
// opts (от генератора деревни): mw — ширина дома поперёк ручья (X), md — длина вдоль ручья (Z), wx, wz — центр колеса.
export default { id: 'mill_ruin', kind: 'prop', outline: false,
  build(kit, opts = {}) {
    const { THREE, part, merge, bbox, geo } = kit, L = [], R = geo.rng(41);
    const mw = opts.mw || 4.4, md = opts.md || 5.4, wx = opts.wx ?? -3.3, wz = opts.wz ?? 3.8;
    const ST = 0x4e4a3e, STL = 0x948a70, MOSS = 0x3e5a24, MOSSL = 0x7aa03a, T = 0x3a2a1a, TL = 0x6e5a3e;
    const moss = (x, y, z, s = 1) => L.push(part(new THREE.IcosahedronGeometry(0.22 * s, 0), MOSS, [x, y, z], [R(), R(), R()], [1.4, 0.45, 1.2], { top: MOSSL }));
    // ---- каменный низ (2,8 м) из неровных блоков, угловые камни, мох
    const y0 = 0.3, GH = 2.8;
    L.push(bbox(mw + 0.3, y0, md + 0.3, 0.08, 0x3e3a30, [0, y0 / 2, 0], 0, { top: STL, tex: 'stone' }));
    L.push(bbox(mw, GH, md, 0.07, ST, [0, y0 + GH / 2, 0], 0, { top: STL, tex: 'stone' }));
    for (let k = 0; k < 8; k++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const long = (k + (sx > 0 ? 1 : 0)) % 2, bw = long ? 0.62 : 0.38, bd = long ? 0.38 : 0.62; L.push(bbox(bw, 0.34, bd, 0.06, 0x5a5444, [sx * (mw / 2 - bw / 2 + 0.06), y0 + 0.18 + k * 0.35, sz * (md / 2 - bd / 2 + 0.06)], [0, (R() - 0.5) * 0.08, 0], { top: 0xa89c7e, tex: 'stone' })); }
    for (let i = 0; i < 26; i++) { const f = R() < 0.5, u = (R() - 0.5), y = y0 + R() * GH * 0.9; moss(f ? mw / 2 + 0.06 : u * mw, y, f ? u * md : md / 2 + 0.06, 0.8 + R() * 0.8); }
    // заколоченная дверь на +x и окна без света (доски крест-накрест)
    L.push(bbox(0.08, 1.9, 1.1, 0.02, 0x2a2016, [mw / 2 + 0.02, y0 + 0.95, -0.6], 0, { top: 0x4a3a28, tex: 'wood' }));
    for (const [y, a] of [[1.2, 0.5], [1.0, -0.45], [1.7, 0.1]]) L.push(bbox(0.06, 0.14, 1.35, 0.02, 0x5a4630, [mw / 2 + 0.07, y0 + y, -0.6], [a, 0, 0], { top: 0x8a7050, tex: 'woodH' }));
    for (const [face, u] of [['x', 1.4], ['z', -0.8], ['z', 1.0]]) {
      const px = face === 'x' ? mw / 2 + 0.03 : u, pz = face === 'x' ? u : md / 2 + 0.03, sz = face === 'x' ? [0.06, 0.7, 0.62] : [0.62, 0.7, 0.06];
      L.push(part(new THREE.BoxGeometry(...sz), 0x0e0c0a, [px, y0 + 1.6, pz]));
      L.push(bbox(face === 'x' ? 0.08 : 0.8, 0.1, face === 'x' ? 0.8 : 0.08, 0.02, T, [px, y0 + 1.2, pz], 0, { top: TL, tex: 'woodH' }));
      for (const a of [0.7, -0.7]) L.push(bbox(face === 'x' ? 0.05 : 0.85, 0.09, face === 'x' ? 0.85 : 0.05, 0.02, 0x5a4630, [px + (face === 'x' ? 0.04 : 0), y0 + 1.6, pz + (face === 'x' ? 0 : 0.04)], face === 'x' ? [a, 0, 0] : [0, 0, a], { top: 0x8a7050, tex: 'woodH' }));
    }
    // ---- верх: дощатый щипец (конёк вдоль Z), часть досок выпала
    const yT = y0 + GH, pitch = 0.82, rise = Math.tan(pitch) * (mw / 2), ridge = yT + rise;
    L.push(bbox(mw + 0.1, 0.18, md + 0.1, 0.03, T, [0, yT + 0.09, 0], 0, { top: TL, tex: 'woodH' }));
    for (const sz of [-1, 1]) for (let i = 0; i < 9; i++) {   // вертикальные доски щипца
      const x = -mw / 2 + (i + 0.5) * mw / 9, h = rise * (1 - Math.abs(x) / (mw / 2)) - 0.05; if (h < 0.15 || (sz > 0 && (i === 6 || i === 3))) continue;
      L.push(bbox(mw / 9 - 0.03, h, 0.06, 0.01, (i % 3) ? 0x4a3a28 : 0x5a4632, [x, yT + 0.18 + h / 2, sz * (md / 2 - 0.02)], [0, 0, (R() - 0.5) * 0.04], { top: 0x7a6448, tex: 'wood' }));
    }
    // ---- крыша: ряды дранки во мху, на восточном скате (к камере) — провал, видны стропила
    const ev = 0.45, half = mw / 2 + ev, slope = half / Math.cos(pitch), len = md + 0.7, rows = 7;
    for (const s of [-1, 1]) {
      for (let i = 0; i < rows; i++) {
        const along = slope * (i + 0.5) / rows, rw = slope / rows * 1.35, n = 5;
        for (let k = 0; k < n; k++) {
          const zc = -len / 2 + (k + 0.5) * len / n;
          if (s > 0 && i >= 1 && i <= 4 && k >= 1 && k <= 2) continue;                    // провал
          if (s > 0 && i === 5 && k === 2 && R() < 0.9) continue;
          const g = geo.chamferBox(rw, 0.11, len / n + 0.08, 0.03); g.rotateZ(-s * pitch);
          const c = new THREE.Color(0x3a3026).lerp(new THREE.Color(0x6e5e44), R() * 0.6); if (R() < 0.45) c.lerp(new THREE.Color(MOSS), 0.5 + R() * 0.3);
          L.push(geo.paint(geo.warp(g.translate(s * Math.cos(pitch) * along, ridge + 0.1 - Math.sin(pitch) * along + 0.04 * (i % 2), zc + (R() - 0.5) * 0.05), 0.04, i * 9 + k + (s > 0 ? 3 : 0)), c.getHex(), { top: 0x8a9a5a, tex: 'roof' }));
          if (R() < 0.3) moss(s * Math.cos(pitch) * along * 1.02, ridge + 0.2 - Math.sin(pitch) * along, zc, 0.9);
        }
      }
      for (let k = 0; k < 6; k++) {   // стропила (видны в провале)
        const z = -md / 2 + 0.3 + k * (md - 0.6) / 5, g = geo.chamferBox(0.12, 0.14, slope, 0.02); g.rotateX(Math.PI / 2); g.rotateY(Math.PI / 2); g.rotateZ(-s * pitch);
        L.push(geo.paint(g.translate(s * Math.cos(pitch) * slope / 2, ridge - Math.sin(pitch) * slope / 2 + 0.02, z), T, { top: TL, tex: 'wood' }));
      }
    }
    L.push(bbox(0.2, 0.18, len * 0.55, 0.03, T, [0, ridge + 0.14, -len * 0.2], [0.06, 0, 0], { top: TL, tex: 'woodH' }));   // конёк обломан
    L.push(bbox(0.16, 0.16, 1.6, 0.03, T, [0.3, ridge - 0.4, len * 0.28], [0.5, 0.2, 0.3], { top: TL, tex: 'woodH' }));       // упавшая балка
    // ---- опора колеса: каменная стенка-бык от юго-западного угла и деревянные козлы в воде
    const WR = 1.9, ay = 0.2 + WR, ww = 0.75;
    L.push(bbox(0.6, ay + 0.2, 4.0, 0.07, ST, [wx + ww / 2 + 0.55, (ay + 0.2) / 2 - 0.2, wz - 0.6], 0, { top: STL, tex: 'stone' }));
    for (let i = 0; i < 8; i++) moss(wx + ww / 2 + 0.86, R() * ay, wz - 2.4 + R() * 3.6, 0.9);
    for (const d of [-1, 1]) { const g = geo.chamferBox(0.16, ay + 0.9, 0.16, 0.03); g.rotateX(d * 0.32); L.push(geo.paint(g.translate(wx - ww / 2 - 0.35, (ay + 0.9) / 2 - 0.5, wz + d * 0.45), T, { top: TL, tex: 'wood' })); }
    L.push(bbox(0.2, 0.2, 1.4, 0.03, T, [wx - ww / 2 - 0.35, ay + 0.1, wz], 0, { top: TL, tex: 'woodH' }));
    L.push(part(new THREE.CylinderGeometry(0.13, 0.13, ww + 1.4, 8), 0x2a2420, [wx + 0.15, ay, wz], [0, 0, Math.PI / 2], 1, { top: 0x5a5048, tex: 'iron' }));   // ось
    // ---- жёлоб на столбах вдоль берега с севера, обломан над колесом; струя воды
    const fy = ay + WR + 0.35;
    for (let k = 0; k < 4; k++) { const z = wz - 1.4 - k * 2.0; if (k === 1) continue; L.push(bbox(0.14, fy + 0.4, 0.14, 0.03, T, [wx + (R() - 0.5) * 0.1, (fy + 0.4) / 2 - 0.4, z], [0, 0, (R() - 0.5) * 0.08], { top: TL, tex: 'wood' })); }
    for (const [z0, z1, tilt] of [[wz - 7.2, wz - 3.2, 0], [wz - 3.2, wz - 0.9, -0.18]]) {
      const lz = z1 - z0, zc = (z0 + z1) / 2, yc = fy + (tilt ? -0.25 : 0);
      L.push(bbox(0.7, 0.08, lz, 0.02, 0x4a3a28, [wx, yc, zc], [tilt, 0, 0], { top: 0x7a6448, tex: 'woodH' }));
      for (const sx of [-1, 1]) L.push(bbox(0.06, 0.32, lz, 0.02, 0x4a3a28, [wx + sx * 0.33, yc + 0.15, zc], [tilt, 0, 0], { top: 0x7a6448, tex: 'woodH' }));
    }
    for (let i = 0; i < 3; i++) L.push(part(new THREE.BoxGeometry(0.42 - i * 0.1, 0.9 + i * 0.3, 0.06), 0x9ad8e8, [wx + (i - 1) * 0.12, fy - 0.9 - i * 0.2, wz - 0.75 + i * 0.05], [0.1, 0, 0], 1, { emit: true }));
    // ---- папоротники и камни у стен
    for (let i = 0; i < 14; i++) { const a = R() * 6.283, x = Math.cos(a) * (mw / 2 + 0.3), z = Math.sin(a) * (md / 2 + 0.3); L.push(part(new THREE.ConeGeometry(0.22, 0.7, 4), 0x2e5a22, [x, 0.3, z], [(R() - 0.5) * 0.8, R(), (R() - 0.5) * 0.8], [1.6, 1, 0.5], { top: 0x7ab04a })); }
    for (let i = 0; i < 6; i++) L.push(part(new THREE.DodecahedronGeometry(0.3 + R() * 0.25, 0), 0x5a5444, [mw / 2 + 0.4 + R() * 0.8, 0.1, (R() - 0.5) * md], [R(), R(), 0], [1, 0.6, 1], { top: MOSSL, tex: 'stone' }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this)));
    // ---- колесо: два обода, спицы, лопасти (часть выбита), медленно вращается
    const W2 = [], spin = new THREE.Group(); spin.position.set(wx, ay, wz); spin.rotation.z = 0.05;
    for (const sx of [-1, 1]) {
      W2.push(part(new THREE.TorusGeometry(WR, 0.09, 5, 20), 0x3a2e22, [sx * ww / 2, 0, 0], [0, Math.PI / 2, 0], 1, { top: 0x6e5a3e, tex: 'wood' }));
      W2.push(part(new THREE.TorusGeometry(WR * 0.62, 0.06, 4, 16), 0x3a2e22, [sx * ww / 2, 0, 0], [0, Math.PI / 2, 0], 1, { top: 0x6e5a3e, tex: 'wood' }));
      for (let k = 0; k < 8; k++) { if (sx > 0 && k === 3) continue; const a = k / 8 * 6.283; W2.push(part(new THREE.BoxGeometry(0.08, WR * 2, 0.1), 0x3a2e22, [sx * ww / 2, 0, 0], [a, 0, 0], 1, { top: 0x6e5a3e, tex: 'wood' })); }
    }
    for (let k = 0; k < 16; k++) { if (k === 2 || k === 3 || k === 9 || k === 13) continue; const a = k / 16 * 6.283, mossy = R() < 0.4; W2.push(part(new THREE.BoxGeometry(ww + 0.08, 0.06, 0.5), mossy ? 0x3a4a22 : 0x4a3a28, [0, Math.cos(a) * (WR - 0.22), Math.sin(a) * (WR - 0.22)], [a, 0, 0], 1, { top: mossy ? 0x7a9a3a : 0x7a6448, tex: 'woodH' })); }
    spin.add(new THREE.Mesh(merge(W2), kit.propMat(this))); root.add(spin);
    return { root, update(t) { spin.rotation.x = -t * 0.35; } };
  } };
