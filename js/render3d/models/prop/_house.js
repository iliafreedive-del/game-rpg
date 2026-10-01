// Дом деревни в духе Torchlight: массивный каменный первый этаж с угловыми блоками, нависающий второй этаж в фахверке
// на резных кронштейнах, крутая крыша с большим свесом из толстых рядов дранки, щипец из досок с ветровыми досками
// крест-накрест, высокая арочная дверь под навесом, окна со ставнями и ящиками цветов, массивная труба, фонарь.
// Конёк вдоль X (w ≥ d); камера видит стены +z (фасад с дверью) и +x (щипец). Основание помещается в коллайдер дома,
// второй этаж и крыша свисают над ним. Пропорции под героя ≈ 2,2 м: дверь 1,9 м, этажи 2,0 и 1,6 м.
export function house(kit, o) {
  const { THREE, PAL, part, merge, geo, bbox } = kit;
  const { w, d, wall, wallTop, roof, roofTop, seed = 1 } = o;
  const R = geo.rng(seed), L = [];
  const T = 0x3a2416, TL = 0x74502e, ST = o.stone ?? 0x5a5448, STL = o.stoneTop ?? 0xa89c80;
  const W = Math.max(w, d), D = Math.min(w, d);
  const y0 = 0.28, gf = 2.0, jet = 0.32, uf = 1.6, y1 = y0 + gf, y2 = y1 + 0.2, y3 = y2 + uf;   // уровни: цоколь, 1 этаж, перекрытие, 2 этаж
  const W2 = W + jet * 2, D2 = D + jet * 2;
  const wood = (g, c = T, cl = TL, t = 'wood') => L.push(geo.paint(g, c, { top: cl, tex: t }));
  // ---- цоколь и каменный первый этаж
  L.push(bbox(W + 0.34, y0 + 0.02, D + 0.34, 0.06, 0x4a463c, [0, y0 / 2, 0], 0, { top: STL, tex: 'stone' }));
  L.push(bbox(W, gf, D, 0.05, ST, [0, y0 + gf / 2, 0], 0, { top: STL, tex: 'stone' }));
  for (let k = 0; k < 6; k++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {   // угловые камни, вперевязку
    const long = (k + (sx > 0 ? 1 : 0)) % 2, bw = long ? 0.5 : 0.32, bd = long ? 0.32 : 0.5, j = (R() - 0.5) * 0.04;
    L.push(bbox(bw, 0.31, bd, 0.05, ST, [sx * (W / 2 - bw / 2 + 0.05) + j, y0 + 0.17 + k * 0.32, sz * (D / 2 - bd / 2 + 0.05)], [0, j, 0], { top: STL, tex: 'stone' }));
  }
  // ---- дверь на +z: каменная арка, доски с аркой, петли, кольцо, порог, навес
  const dx = -W * 0.18, dz = D / 2, DH = 1.5, DW = 0.86;
  for (const s of [-1, 1]) L.push(bbox(0.22, DH + 0.1, 0.2, 0.04, ST, [dx + s * (DW / 2 + 0.1), y0 + (DH + 0.1) / 2, dz + 0.04], 0, { top: STL, tex: 'stone' }));
  for (let i = 0; i < 7; i++) { const a = Math.PI * (i + 0.5) / 7, r = DW / 2 + 0.1; L.push(bbox(0.2, 0.15, 0.2, 0.03, ST, [dx + Math.cos(a) * r, y0 + DH + Math.sin(a) * r, dz + 0.05], [0, 0, a - Math.PI / 2], { top: STL, tex: 'stone' })); }
  L.push(bbox(DW, DH, 0.08, 0.015, 0x4a2c18, [dx, y0 + DH / 2, dz + 0.02], 0, { top: 0x7a5232, tex: 'wood' }));
  L.push(part(new THREE.CylinderGeometry(DW / 2, DW / 2, 0.08, 10, 1, false, 0, Math.PI), 0x4a2c18, [dx, y0 + DH, dz + 0.02], [Math.PI / 2, Math.PI / 2, 0], 1, { top: 0x7a5232, tex: 'wood' }));
  for (const y of [0.35, 1.15]) L.push(bbox(DW * 0.7, 0.07, 0.03, 0.01, 0x24242a, [dx - 0.08, y0 + y, dz + 0.075], 0, { top: 0x6a6a74, tex: 'metal' }));
  L.push(part(new THREE.TorusGeometry(0.07, 0.015, 4, 10), PAL.brass, [dx + 0.25, y0 + 0.85, dz + 0.08]));
  L.push(bbox(DW + 0.6, 0.14, 0.5, 0.04, ST, [dx, 0.07, dz + 0.3], 0, { top: STL, tex: 'stone' }));
  // навес над дверью на двух кронштейнах
  const ay = y0 + DH + 0.75;
  L.push(geo.paint(geo.chamferBox(DW + 0.9, 0.08, 0.85, 0.02).rotateX(0.5).translate(dx, ay, dz + 0.42), roof, { top: roofTop, tex: 'roof' }));
  for (const s of [-1, 1]) wood(geo.chamferBox(0.08, 0.7, 0.08, 0.02).rotateX(0.75).translate(dx + s * (DW / 2 + 0.3), ay - 0.32, dz + 0.22));
  // окно первого этажа на +x: маленькое, с решёткой
  const win = (x, z, y, face, WW, WH, flowers, shutter = true) => {
    const at = (u, yy, out) => face ? [x + out, yy, z + u] : [x + u, yy, z + out];
    const sz = (a, b, c) => face ? [c, b, a] : [a, b, c];
    L.push(part(new THREE.BoxGeometry(...sz(WW, WH, 0.06)), 0xffc070, at(0, y, 0.02), 0, 1, { emit: true }));
    L.push(part(new THREE.BoxGeometry(...sz(0.04, WH, 0.03)), T, at(0, y, 0.06)), part(new THREE.BoxGeometry(...sz(WW, 0.04, 0.03)), T, at(0, y, 0.06)));
    for (const s of [-1, 1]) {
      L.push(bbox(...sz(0.08, WH + 0.14, 0.09), 0.02, T, at(s * (WW / 2 + 0.04), y, 0.05), 0, { top: TL, tex: 'wood' }));
      if (shutter) L.push(bbox(...sz(WW * 0.52, WH + 0.04, 0.05), 0.015, o.shutter ?? 0x2f4a5a, at(s * (WW * 0.78 + 0.1), y, 0.08), [0, s * (face ? 0 : 0) , 0], { top: o.shutterL ?? 0x5a8a9a, tex: 'wood' }));
    }
    L.push(bbox(...sz(WW + 0.24, 0.08, 0.16), 0.02, T, at(0, y - WH / 2 - 0.06, 0.08), 0, { top: TL, tex: 'woodH' }));
    L.push(bbox(...sz(WW + 0.2, 0.09, 0.12), 0.02, T, at(0, y + WH / 2 + 0.06, 0.06), 0, { top: TL, tex: 'woodH' }));
    if (flowers) {
      L.push(bbox(...sz(WW + 0.14, 0.18, 0.22), 0.02, 0x5a3a22, at(0, y - WH / 2 - 0.2, 0.18), 0, { top: 0x8a6a40, tex: 'woodH' }));
      for (let i = 0; i < 9; i++) L.push(part(new THREE.IcosahedronGeometry(0.06 + R() * 0.035, 0), [0xd84a5a, 0xf0d070, 0xf4f0e0, 0x3a6a2a, 0x4a7a30, 0x3a6a2a][i % 6], at((i / 8 - 0.5) * WW, y - WH / 2 - 0.08 + R() * 0.06, 0.18 + (R() - 0.5) * 0.1)));
    }
  };
  win(W / 2, D * 0.05, y0 + 1.15, 1, 0.42, 0.5, false, false);
  for (const s of [-1, 1]) L.push(part(new THREE.BoxGeometry(0.03, 0.5, 0.03), 0x24242a, [W / 2 + 0.07, y0 + 1.15, D * 0.05 + s * 0.1]));
  win(W * 0.25, D / 2, y0 + 1.2, 0, 0.5, 0.55, true);
  // ---- перекрытие с выступающими концами балок и кронштейнами под нависающим этажом
  L.push(bbox(W2, 0.2, D2, 0.04, T, [0, y1 + 0.1, 0], 0, { top: TL, tex: 'woodH' }));
  for (let i = 0; i < Math.round(W / 0.55); i++) { const x = -W / 2 + 0.25 + i * 0.55; L.push(bbox(0.14, 0.14, 0.2, 0.03, T, [x, y1 - 0.02, D2 / 2 - 0.02], 0, { top: TL, tex: 'wood' })); }
  for (let i = 0; i < Math.round(D / 0.55); i++) { const z = -D / 2 + 0.25 + i * 0.55; L.push(bbox(0.2, 0.14, 0.14, 0.03, T, [W2 / 2 - 0.02, y1 - 0.02, z], 0, { top: TL, tex: 'wood' })); }
  for (const x of [-W / 2 + 0.2, W / 2 - 0.2, 0.15]) wood(geo.chamferBox(0.1, 0.55, 0.1, 0.02).rotateX(-0.6).translate(x, y1 - 0.25, D / 2 + 0.14));
  for (const z of [-D / 2 + 0.2, D / 2 - 0.2]) wood(geo.chamferBox(0.1, 0.55, 0.1, 0.02).rotateZ(0.6).translate(W / 2 + 0.14, y1 - 0.25, z));
  // ---- второй этаж: штукатурка в фахверке
  L.push(part(new THREE.BoxGeometry(W2 - 0.06, uf, D2 - 0.06), wall, [0, y2 + uf / 2, 0], 0, 1, { top: wallTop, tex: 'plaster' }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push(bbox(0.18, uf + 0.04, 0.18, 0.03, T, [sx * W2 / 2, y2 + uf / 2, sz * D2 / 2], 0, { top: TL, tex: 'wood' }));
  for (const y of [y2 + 0.06, y3 - 0.06]) { L.push(bbox(W2 + 0.04, 0.14, 0.12, 0.025, T, [0, y, D2 / 2 + 0.03], 0, { top: TL, tex: 'woodH' })); L.push(bbox(0.12, 0.14, D2 + 0.04, 0.025, T, [W2 / 2 + 0.03, y, 0], 0, { top: TL, tex: 'woodH' })); }
  const brace = (x, z, face, dir, span) => {
    const hh = uf - 0.2, len = Math.hypot(hh, span), ang = Math.atan2(hh, span) * dir, g = geo.chamferBox(0.1, len, 0.08, 0.02);
    g.rotateZ(Math.PI / 2 - ang); if (face) g.rotateY(Math.PI / 2); wood(g.translate(x, y2 + uf / 2, z));
  };
  brace(-W2 / 2 + 0.38, D2 / 2 + 0.04, 0, 1, 0.55); brace(W2 / 2 - 0.38, D2 / 2 + 0.04, 0, -1, 0.55);
  brace(W2 / 2 + 0.04, -D2 / 2 + 0.38, 1, -1, 0.55); brace(W2 / 2 + 0.04, D2 / 2 - 0.38, 1, 1, 0.55);
  for (const x of [-W2 * 0.12, W2 * 0.12]) L.push(bbox(0.1, uf - 0.1, 0.08, 0.02, T, [x, y2 + uf / 2, D2 / 2 + 0.04], 0, { top: TL, tex: 'wood' }));
  win(-W2 * 0.28, D2 / 2, y2 + uf * 0.55, 0, 0.5, 0.6, true);
  win(W2 * 0.3, D2 / 2, y2 + uf * 0.55, 0, 0.5, 0.6, false);
  win(W2 / 2, 0, y2 + uf * 0.55, 1, 0.5, 0.6, true);
  // ---- крыша: крутая, свес 0.55, толстые ряды дранки внахлёст, лёгкая кривизна
  const pitch = 0.86, half = D2 / 2 + 0.55, slope = half / Math.cos(pitch), rise = Math.tan(pitch) * (D2 / 2), len = W2 + 0.8, rows = 7;
  for (const s of [-1, 1]) for (let i = 0; i < rows; i++) {
    const t0 = i / rows, rw = slope / rows * 1.45, along = slope * (t0 + 0.5 / rows), drop = Math.sin(pitch) * along, out = Math.cos(pitch) * along;
    const g = geo.chamferBox(len + (R() - 0.5) * 0.08, 0.13, rw, 0.035); g.rotateX(s * pitch);
    const c = new THREE.Color(roof).lerp(new THREE.Color(roofTop), 0.15 + R() * 0.5 + (1 - t0) * 0.2);
    L.push(geo.paint(geo.warp(g.translate((R() - 0.5) * 0.06, y3 + rise + 0.18 - drop + 0.06 * (i % 2), s * out), 0.06, seed + i), c.getHex(), { top: new THREE.Color(roofTop).getHex(), tex: 'roof' }));
  }
  L.push(bbox(len + 0.1, 0.2, 0.26, 0.05, T, [0, y3 + rise + 0.28, 0], 0, { top: TL, tex: 'woodH' }));
  // щипцы: треугольники из вертикальных досок, ветровые доски крест-накрест у конька
  const tri = new THREE.Shape([new THREE.Vector2(-D2 / 2, 0), new THREE.Vector2(D2 / 2, 0), new THREE.Vector2(0, rise)]);
  const gab = new THREE.ExtrudeGeometry(tri, { depth: W2 - 0.06, bevelEnabled: false }); gab.translate(0, 0, -(W2 - 0.06) / 2); gab.rotateY(Math.PI / 2);
  L.push(geo.paint(gab.translate(0, y3, 0), 0x6a4a2c, { top: 0x9a7448, tex: 'wood' }));
  for (const s of [-1, 1]) {
    const g = geo.chamferBox(0.09, 0.2, slope + 0.5, 0.02); g.rotateX(s * pitch);
    wood(g.translate(len / 2 + 0.02, y3 + rise + 0.18 - Math.sin(pitch) * slope / 2 + 0.2, s * (Math.cos(pitch) * slope / 2 - 0.15)));
  }
  win(W2 / 2 + 0.01, 0, y3 + rise * 0.38, 1, 0.34, 0.36, false, false);
  // ---- труба: массивная, чуть сужается, с колпаком
  const chx = -W * 0.28, chz = -D2 * 0.18, cy0 = y1, ch = y3 + rise + 1.0 - cy0;
  L.push(bbox(0.62, ch, 0.62, 0.06, ST, [chx, cy0 + ch / 2, chz], 0, { top: STL, tex: 'stone' }));
  L.push(bbox(0.76, 0.14, 0.76, 0.04, 0x3a362e, [chx, cy0 + ch, chz], 0, { top: 0x6a6252, tex: 'stone' }));
  L.push(bbox(0.36, 0.2, 0.36, 0.03, 0x24242a, [chx, cy0 + ch + 0.16, chz], 0, { top: 0x4a4a52, tex: 'metal' }));
  // ---- фонарь на кронштейне у двери
  L.push(bbox(0.5, 0.05, 0.05, 0.01, 0x24242a, [dx + DW / 2 + 0.45, y0 + 1.75, dz + 0.1], [0, Math.PI / 2, 0], { top: 0x5a5a64, tex: 'metal' }));
  L.push(bbox(0.18, 0.26, 0.18, 0.02, 0x24242a, [dx + DW / 2 + 0.45, y0 + 1.55, dz + 0.3], 0, { top: 0x5a5a64, tex: 'metal' }));
  L.push(part(new THREE.BoxGeometry(0.12, 0.17, 0.12), 0xffc070, [dx + DW / 2 + 0.45, y0 + 1.55, dz + 0.3], 0, 1, { emit: true }));
  const root = new THREE.Group(); const m = new THREE.Mesh(merge(L), kit.propMat(o)); if (w < d) m.rotation.y = -Math.PI / 2; root.add(m);
  return { root };
}
