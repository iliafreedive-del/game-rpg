// Церковь Святой Марии на площади: каменный неф с контрфорсами и стрельчатыми витражами, крутая шиферная крыша,
// квадратная башня у фасада (портал с арочной дверью, розетка, часы, звонница с жалюзи) и восьмигранный шпиль с крестом.
// Фасад с дверью — +z (к площади), неф уходит в −z. Фундамент 7,0 × 12,4 м, высота ≈ 18 м.
export default { id: 'church', kind: 'prop', outline: false,
  shadowProxy(kit) {
    const { THREE, merge, part } = kit;
    return merge([part(new THREE.BoxGeometry(6.4, 6, 9.2), 0, [0, 3, -1.6]), part(new THREE.ConeGeometry(4.6, 5, 4), 0, [0, 8.4, -1.6], [0, Math.PI / 4, 0], [1, 1, 1.6]), part(new THREE.BoxGeometry(3.6, 12, 3.6), 0, [0, 6, 4.4]), part(new THREE.ConeGeometry(2.3, 6.4, 8), 0, [0, 15.2, 4.4])]);
  },
  build(kit) {
    const { THREE, PAL, part, merge, geo, bbox } = kit;
    const L = [], R = geo.rng(31);
    const ST = 0x6e6656, STL = 0xbcb092, TR = 0x847a66, TRL = 0xd8ccae, SL = 0x2c3240, SLL = 0x66728c, T = 0x3a2416, TL = 0x74502e;
    const stone = (w, h, d, p, r = 0, b = 0.06) => L.push(bbox(w, h, d, b, ST, p, r, { top: STL, tex: 'stone' }));
    const trim = (w, h, d, p, r = 0) => L.push(bbox(w, h, d, 0.04, TR, p, r, { top: TRL, tex: 'stone' }));
    const glass = (w, h, p, face, cols) => {   // витраж: цветные стёкла (самосвечение) решёткой 2×3 + стрельчатый верх
      const nx = face === 'x', g = (gw, gh, px, py, c) => L.push(part(new THREE.BoxGeometry(nx ? 0.05 : gw, gh, nx ? gw : 0.05), c, [p[0] + (nx ? 0 : px), py, p[2] + (nx ? px : 0)], 0, 1, { emit: true }));
      for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) g(w / 2 - 0.04, h / 3 - 0.04, (i - 0.5) * w / 2, p[1] - h / 2 + (j + 0.5) * h / 3, cols[(i + j) % cols.length]);
      const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, w * 0.7)]);
      const tg = new THREE.ShapeGeometry(tri); if (nx) tg.rotateY(Math.PI / 2);
      L.push(geo.paint(tg.translate(p[0] + (nx ? 0.03 : 0), p[1] + h / 2, p[2] + (nx ? 0 : 0.03)), cols[1], { emit: true }));
    };
    const COLS = [0x5a8ad8, 0xd85a4a, 0xf0c860, 0x6ac08a];
    // ---- неф
    const NW = 6.4, NZ0 = -6.2, NZ1 = 2.9, NH = 5.6, y0 = 0.4, nzc = (NZ0 + NZ1) / 2, nl = NZ1 - NZ0;
    L.push(bbox(NW + 0.5, y0, nl + 0.5, 0.08, 0x4a463c, [0, y0 / 2, nzc], 0, { top: STL, tex: 'stone' }));
    stone(NW, NH, nl, [0, y0 + NH / 2, nzc]);
    trim(NW + 0.16, 0.22, nl + 0.16, [0, y0 + NH - 0.11, nzc]);   // карниз
    trim(NW + 0.12, 0.18, nl + 0.12, [0, y0 + 0.6, nzc]);         // цокольный пояс
    for (const sx of [-1, 1]) {
      for (const z of [-5.0, -2.0, 1.0]) {   // контрфорсы: ступенчатые, с наклонным верхом
        stone(0.6, NH - 0.6, 0.7, [sx * (NW / 2 + 0.3), y0 + (NH - 0.6) / 2, z]);
        stone(0.4, 1.0, 0.6, [sx * (NW / 2 + 0.2), y0 + NH - 0.6 + 0.3, z], [0, 0, sx * 0.45]);
      }
      for (const z of [-3.5, -0.5]) {        // стрельчатые окна между контрфорсами
        const x = sx * (NW / 2 + 0.02);
        L.push(bbox(0.16, 3.1, 1.25, 0.03, TR, [x, y0 + 2.9, z], 0, { top: TRL, tex: 'stone' }));
        glass(0.9, 2.2, [x + sx * 0.07, y0 + 2.7, z], 'x', COLS);
        L.push(bbox(0.18, 0.12, 1.4, 0.03, TR, [x + sx * 0.03, y0 + 1.5, z], 0, { top: TRL, tex: 'stone' }));
      }
    }
    // задний щипец с круглым окном
    L.push(part(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 14), TR, [0, y0 + NH + 1.3, NZ0 - 0.02], [Math.PI / 2, 0, 0], 1, { top: TRL, tex: 'stone' }));
    L.push(part(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 14), COLS[0], [0, y0 + NH + 1.3, NZ0 - 0.08], [Math.PI / 2, 0, 0], 1, { emit: true }));
    // ---- крыша нефа: шифер рядами, конёк, щипец
    const pitch = 0.98, ev = 0.45, half = NW / 2 + ev, slope = half / Math.cos(pitch), rise = Math.tan(pitch) * (NW / 2), yT = y0 + NH, ridgeY = yT + rise + 0.12, rl = nl + 0.6, rows = 9;
    const tri = new THREE.Shape([new THREE.Vector2(-NW / 2, 0), new THREE.Vector2(NW / 2, 0), new THREE.Vector2(0, rise)]);
    const gab = new THREE.ExtrudeGeometry(tri, { depth: nl, bevelEnabled: false }); gab.translate(0, yT, NZ0);
    L.push(geo.paint(gab, ST, { top: STL, tex: 'stone' }));
    const c0 = new THREE.Color(SL), c1 = new THREE.Color(SLL), MOSS = new THREE.Color(0x4a5a34);
    for (const s of [-1, 1]) for (let i = 0; i < rows; i++) {
      const along = slope * (i + 0.5) / rows, rw = slope / rows * 1.4, n = 4;
      for (let k = 0; k < n; k++) {
        const seg = rl / n + 0.1, cz = NZ0 - 0.3 + (k + 0.5) * rl / n;
        const g = geo.chamferBox(rw, 0.13, seg, 0.03); g.rotateZ(-s * pitch);
        const c = c0.clone().lerp(c1, 0.2 + R() * 0.5 + (1 - i / rows) * 0.2); if (R() < 0.12) c.lerp(MOSS, 0.35);
        L.push(geo.paint(g.translate(s * Math.cos(pitch) * along, ridgeY - Math.sin(pitch) * along + 0.05 * (i % 2), cz), c.getHex(), { top: SLL, tex: 'tile' }));
      }
    }
    L.push(bbox(0.3, 0.22, rl + 0.1, 0.05, 0x24242a, [0, ridgeY + 0.12, nzc - 0.05], 0, { top: 0x5a5a64, tex: 'iron' }));
    L.push(part(new THREE.BoxGeometry(0.08, 1.1, 0.08), PAL.brassD, [0, ridgeY + 0.7, NZ0 - 0.2], 0, 1, { top: PAL.brass }), part(new THREE.BoxGeometry(0.5, 0.08, 0.08), PAL.brassD, [0, ridgeY + 0.95, NZ0 - 0.2], 0, 1, { top: PAL.brass }));
    // ---- башня у фасада
    const TW = 3.6, TZ = 4.4, TH = 11.6;
    L.push(bbox(TW + 0.6, y0 + 0.1, TW + 0.6, 0.08, 0x4a463c, [0, (y0 + 0.1) / 2, TZ], 0, { top: STL, tex: 'stone' }));
    stone(TW, TH, TW, [0, y0 + TH / 2, TZ]);
    for (const y of [0.6, 4.6, 8.4]) trim(TW + 0.2, 0.24, TW + 0.2, [0, y0 + y, TZ]);
    for (let k = 0; k < Math.floor(TH / 0.5); k++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {   // угловые камни
      const long = (k + (sx > 0 ? 1 : 0)) % 2, bw = long ? 0.7 : 0.42, bd = long ? 0.42 : 0.7;
      L.push(bbox(bw, 0.46, bd, 0.05, TR, [sx * (TW / 2 - bw / 2 + 0.06), y0 + 0.25 + k * 0.5, TZ + sz * (TW / 2 - bd / 2 + 0.06)], [0, (R() - 0.5) * 0.04, 0], { top: TRL, tex: 'stone' }));
    }
    // портал: ступени, ниша с арками, двустворчатая дверь, петли
    const fz = TZ + TW / 2;
    for (let i = 0; i < 3; i++) L.push(bbox(3.0 - i * 0.3, 0.16, 0.5 + (2 - i) * 0.4, 0.04, TR, [0, 0.08 + i * 0.16, fz + 0.25 + (2 - i) * 0.2], 0, { top: TRL, tex: 'stone' }));
    const DW = 1.7, DH = 2.6;
    for (let a = 0; a < 2; a++) {   // две арки-архивольта
      const r = DW / 2 + 0.18 + a * 0.22, zz = fz + 0.05 + a * 0.08;
      for (const s of [-1, 1]) L.push(bbox(0.24, DH, 0.24, 0.04, TR, [s * r, y0 + DH / 2, zz], 0, { top: TRL, tex: 'stone' }));
      for (let i = 0; i < 9; i++) { const an = Math.PI * (i + 0.5) / 9; L.push(bbox(0.24, 0.2, 0.24, 0.03, TR, [Math.cos(an) * r, y0 + DH + Math.sin(an) * r * 0.9, zz], [0, 0, an - Math.PI / 2], { top: TRL, tex: 'stone' })); }
    }
    L.push(bbox(DW, DH, 0.1, 0.02, 0x4a2a16, [0, y0 + DH / 2, fz + 0.02], 0, { top: 0x7a4a28, tex: 'wood' }));
    L.push(part(new THREE.CylinderGeometry(DW / 2, DW / 2, 0.1, 12, 1, false, 0, Math.PI), 0x4a2a16, [0, y0 + DH, fz + 0.02], [Math.PI / 2, Math.PI / 2, 0], [1, 1, 0.9], { top: 0x7a4a28, tex: 'wood' }));
    L.push(bbox(0.06, DH + 0.6, 0.04, 0.01, 0x2a1a10, [0, y0 + DH / 2 + 0.2, fz + 0.08]));
    for (const y of [0.5, 1.4, 2.2]) for (const s of [-1, 1]) L.push(bbox(0.6, 0.07, 0.03, 0.01, 0x24242a, [s * 0.42, y0 + y, fz + 0.09], 0, { top: 0x6a6a74, tex: 'iron' }));
    for (const s of [-1, 1]) L.push(part(new THREE.TorusGeometry(0.08, 0.018, 4, 10), PAL.brass, [s * 0.15, y0 + 1.25, fz + 0.1]));
    // розетка над порталом, узкое окно, часы, звонница
    L.push(part(new THREE.CylinderGeometry(0.62, 0.62, 0.14, 16), TR, [0, y0 + 5.6, fz + 0.03], [Math.PI / 2, 0, 0], 1, { top: TRL, tex: 'stone' }));
    for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283; L.push(part(new THREE.BoxGeometry(0.28, 0.2, 0.04), COLS[i % 4], [Math.cos(an) * 0.28, y0 + 5.6 + Math.sin(an) * 0.28, fz + 0.1], [0, 0, an], 1, { emit: true })); }
    L.push(part(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 10), COLS[2], [0, y0 + 5.6, fz + 0.11], [Math.PI / 2, 0, 0], 1, { emit: true }));
    for (const [face, x, z] of [['x', TW / 2 + 0.01, TZ]]) { L.push(bbox(0.12, 1.3, 0.5, 0.02, TR, [x, y0 + 6.4, z], 0, { top: TRL, tex: 'stone' })); L.push(part(new THREE.BoxGeometry(0.05, 1.0, 0.24), 0xffc070, [x + 0.05, y0 + 6.4, z], 0, 1, { emit: true })); }
    L.push(part(new THREE.CylinderGeometry(0.72, 0.72, 0.14, 20), PAL.brassD, [0, y0 + 7.5, fz + 0.04], [Math.PI / 2, 0, 0], 1, { top: PAL.brass }));
    L.push(part(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 20), 0xf0e6c8, [0, y0 + 7.5, fz + 0.1], [Math.PI / 2, 0, 0]));
    L.push(part(new THREE.BoxGeometry(0.06, 0.48, 0.03), 0x24242a, [0.0, y0 + 7.68, fz + 0.15], [0, 0, 0.0]), part(new THREE.BoxGeometry(0.06, 0.34, 0.03), 0x24242a, [0.12, y0 + 7.48, fz + 0.15], [0, 0, -1.2]));
    for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283; L.push(part(new THREE.BoxGeometry(0.05, 0.1, 0.02), 0x24242a, [Math.cos(an) * 0.52, y0 + 7.5 + Math.sin(an) * 0.52, fz + 0.14], [0, 0, an])); }
    const by = y0 + 9.9;
    for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {   // проёмы звонницы с жалюзи
      const px = nx * (TW / 2 + 0.01), pz = TZ + nz * (TW / 2 + 0.01), along = nx ? [0, 0, 1] : [1, 0, 0];
      for (const s of [-0.62, 0.62]) {
        L.push(part(new THREE.BoxGeometry(nx ? 0.05 : 0.8, 2.0, nx ? 0.8 : 0.05), 0x14100c, [px + along[0] * s, by, pz + along[2] * s]));
        for (let k = 0; k < 6; k++) L.push(part(new THREE.BoxGeometry(nx ? 0.18 : 0.78, 0.06, nx ? 0.78 : 0.18), 0x4a3220, [px + along[0] * s + nx * 0.06, by - 0.8 + k * 0.3, pz + along[2] * s + nz * 0.06], [nx ? 0 : -0.5 * nz, 0, nx ? 0.5 * nx : 0], 1, { top: 0x7a5a38, tex: 'wood' }));
        const tri2 = new THREE.Shape([new THREE.Vector2(-0.45, 0), new THREE.Vector2(0.45, 0), new THREE.Vector2(0, 0.5)]), g2 = new THREE.ExtrudeGeometry(tri2, { depth: 0.14, bevelEnabled: false });
        if (nx) g2.rotateY(Math.PI / 2); L.push(geo.paint(g2.translate(px + along[0] * s - (nx ? 0.07 * nx : 0), by + 1.0, pz + along[2] * s - (nz ? 0.07 : 0)), TR, { top: TRL, tex: 'stone' }));
      }
    }
    trim(TW + 0.36, 0.3, TW + 0.36, [0, y0 + TH, TZ]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {   // угловые башенки-пинакли
      L.push(bbox(0.42, 0.7, 0.42, 0.04, TR, [sx * (TW / 2 - 0.05), y0 + TH + 0.5, TZ + sz * (TW / 2 - 0.05)], 0, { top: TRL, tex: 'stone' }));
      L.push(part(new THREE.ConeGeometry(0.3, 0.9, 4), SL, [sx * (TW / 2 - 0.05), y0 + TH + 1.3, TZ + sz * (TW / 2 - 0.05)], [0, Math.PI / 4, 0], 1, { top: SLL, tex: 'tile' }));
    }
    // шпиль: восьмигранник рядами шифера, слуховые окошки, крест и петушок
    const sy = y0 + TH + 0.15, SH = 6.4, SR = 2.2;
    for (let i = 0; i < 6; i++) {
      const t0 = i / 6, r0 = SR * (1 - t0) + 0.05, r1 = SR * (1 - t0 - 1 / 6) + 0.02;
      const c = c0.clone().lerp(c1, 0.25 + t0 * 0.5 + R() * 0.15);
      L.push(part(new THREE.CylinderGeometry(Math.max(0.04, r1), r0, SH / 6 + 0.1, 8, 1, true), c.getHex(), [0, sy + SH * (t0 + 0.5 / 6), TZ], [0, Math.PI / 8, 0], 1, { top: SLL, tex: 'tile' }));
    }
    for (const [nx, nz] of [[0, 1], [1, 0]]) { L.push(bbox(nx ? 0.6 : 0.5, 0.7, nx ? 0.5 : 0.6, 0.03, SL, [nx * 1.5, sy + 1.0, TZ + nz * 1.5], 0, { top: SLL, tex: 'tile' })); L.push(part(new THREE.BoxGeometry(nx ? 0.04 : 0.24, 0.32, nx ? 0.24 : 0.04), 0xffc070, [nx * 1.78, sy + 0.95, TZ + nz * 1.78], 0, 1, { emit: true })); }
    L.push(part(new THREE.SphereGeometry(0.14, 8, 6), PAL.brass, [0, sy + SH + 0.05, TZ]));
    L.push(part(new THREE.BoxGeometry(0.1, 1.3, 0.1), PAL.brassD, [0, sy + SH + 0.7, TZ], 0, 1, { top: PAL.brass }), part(new THREE.BoxGeometry(0.7, 0.1, 0.1), PAL.brassD, [0, sy + SH + 0.95, TZ], 0, 1, { top: PAL.brass }));
    // у входа: два фонаря на кронштейнах
    for (const s of [-1, 1]) { const x = s * 1.35; L.push(bbox(0.2, 0.3, 0.2, 0.02, 0x24242a, [x, y0 + 2.4, fz + 0.32], 0, { top: 0x5a5a64, tex: 'iron' })); L.push(part(new THREE.BoxGeometry(0.13, 0.2, 0.13), 0xffc070, [x, y0 + 2.4, fz + 0.32], 0, 1, { emit: true })); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this)));
    return { root };
  } };
