// Дом деревни в духе Torchlight: массивный каменный первый этаж с угловыми блоками, нависающий второй этаж в фахверке
// на резных кронштейнах, крутая крыша с большим свесом из толстых рядов дранки, щипец из досок с ветровыми досками
// крест-накрест, высокая арочная дверь под навесом, окна со ставнями и ящиками цветов, массивная труба, фонарь.
// Конёк вдоль X (w ≥ d); камера видит стены +z (фасад с дверью) и +x (щипец). Основание помещается в коллайдер дома,
// верхние этажи и крыша свисают над ним. Масштаб — «чтобы герой мог войти» (герой ≈ 2,2 м): дверь 2,3 м, первый этаж 2,8 м,
// верхние по 2,3 м; floors: 2 → дом ≈ 8 м (3,6 роста героя), 3 → ≈ 11 м (5 ростов).
export function house(kit, o) {
  const { THREE, PAL, part, merge, geo, bbox } = kit;
  const { w, d, wall, wallTop, roof, roofTop, seed = 1, floors = 2, roofTex = 'roof' } = o;
  const R = geo.rng(seed), L = [];
  const T = 0x3a2416, TL = 0x74502e, ST = o.stone ?? 0x5a5448, STL = o.stoneTop ?? 0xa89c80;
  const W = Math.max(w, d), D = Math.min(w, d);
  const y0 = 0.3, gf = o.gf ?? 2.8, jet = 0.4, uf = 2.3, y1 = y0 + gf, y2 = y1 + 0.24, y3 = y2 + uf * (floors - 1) + 0.24 * (floors - 2);   // цоколь, 1 этаж, перекрытие, верхние этажи
  const W2 = W + jet * 2, D2 = D + jet * 2;
  const wood = (g, c = T, cl = TL, t = 'wood') => L.push(geo.paint(g, c, { top: cl, tex: t }));
  // ---- цоколь и каменный первый этаж
  L.push(bbox(W + 0.34, y0 + 0.02, D + 0.34, 0.06, 0x4a463c, [0, y0 / 2, 0], 0, { top: STL, tex: 'stone' }));
  L.push(bbox(W, gf, D, 0.05, ST, [0, y0 + gf / 2, 0], 0, { top: STL, tex: 'stone' }));
  for (let k = 0; k < Math.floor(gf / 0.32); k++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {   // угловые камни, вперевязку
    const long = (k + (sx > 0 ? 1 : 0)) % 2, bw = long ? 0.6 : 0.36, bd = long ? 0.36 : 0.6, j = (R() - 0.5) * 0.04;
    L.push(bbox(bw, 0.31, bd, 0.05, ST, [sx * (W / 2 - bw / 2 + 0.05) + j, y0 + 0.17 + k * 0.32, sz * (D / 2 - bd / 2 + 0.05)], [0, j, 0], { top: STL, tex: 'stone' }));
  }
  // ---- дверь на +z: каменная арка, доски с аркой, петли, кольцо, порог, навес
  const dx = -W * 0.2, dz = D / 2, DH = 1.75, DW = 1.2;
  for (const s of [-1, 1]) L.push(bbox(0.22, DH + 0.1, 0.2, 0.04, ST, [dx + s * (DW / 2 + 0.1), y0 + (DH + 0.1) / 2, dz + 0.04], 0, { top: STL, tex: 'stone' }));
  for (let i = 0; i < 7; i++) { const a = Math.PI * (i + 0.5) / 7, r = DW / 2 + 0.1; L.push(bbox(0.2, 0.15, 0.2, 0.03, ST, [dx + Math.cos(a) * r, y0 + DH + Math.sin(a) * r, dz + 0.05], [0, 0, a - Math.PI / 2], { top: STL, tex: 'stone' })); }
  L.push(bbox(DW, DH, 0.08, 0.015, 0x4a2c18, [dx, y0 + DH / 2, dz + 0.02], 0, { top: 0x7a5232, tex: 'wood' }));
  L.push(part(new THREE.CylinderGeometry(DW / 2, DW / 2, 0.08, 10, 1, false, 0, Math.PI), 0x4a2c18, [dx, y0 + DH, dz + 0.02], [Math.PI / 2, Math.PI / 2, 0], 1, { top: 0x7a5232, tex: 'wood' }));
  for (const y of [0.35, 1.15]) L.push(bbox(DW * 0.7, 0.07, 0.03, 0.01, 0x24242a, [dx - 0.08, y0 + y, dz + 0.075], 0, { top: 0x6a6a74, tex: 'iron' }));
  L.push(part(new THREE.TorusGeometry(0.07, 0.015, 4, 10), PAL.brass, [dx + 0.25, y0 + 0.85, dz + 0.08]));
  L.push(bbox(DW + 0.6, 0.14, 0.5, 0.04, ST, [dx, 0.07, dz + 0.3], 0, { top: STL, tex: 'stone' }));
  // навес над дверью на двух кронштейнах
  const ay = y0 + DH + 0.95;
  if (!o.noCanopy) L.push(geo.paint(geo.chamferBox(DW + 1.0, 0.1, 1.1, 0.02).rotateX(0.5).translate(dx, ay, dz + 0.55), roof, { top: roofTop, tex: roofTex }));
  if (!o.noCanopy) for (const s of [-1, 1]) wood(geo.chamferBox(0.1, 0.9, 0.1, 0.02).rotateX(0.75).translate(dx + s * (DW / 2 + 0.35), ay - 0.4, dz + 0.3));
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
  win(W / 2, D * 0.05, y0 + 1.5, 1, 0.6, 0.7, false, false);
  for (const s of [-1, 1]) L.push(part(new THREE.BoxGeometry(0.03, 0.7, 0.03), 0x24242a, [W / 2 + 0.07, y0 + 1.5, D * 0.05 + s * 0.14]));
  win(W * 0.22, D / 2, y0 + 1.55, 0, 0.75, 0.8, true);
  // ---- перекрытие с выступающими концами балок и кронштейнами под нависающим этажом
  L.push(bbox(W2, 0.2, D2, 0.04, T, [0, y1 + 0.1, 0], 0, { top: TL, tex: 'woodH' }));
  for (let i = 0; i < Math.round(W / 0.55); i++) { const x = -W / 2 + 0.25 + i * 0.55; L.push(bbox(0.14, 0.14, 0.2, 0.03, T, [x, y1 - 0.02, D2 / 2 - 0.02], 0, { top: TL, tex: 'wood' })); }
  for (let i = 0; i < Math.round(D / 0.55); i++) { const z = -D / 2 + 0.25 + i * 0.55; L.push(bbox(0.2, 0.14, 0.14, 0.03, T, [W2 / 2 - 0.02, y1 - 0.02, z], 0, { top: TL, tex: 'wood' })); }
  for (const x of [-W / 2 + 0.2, W / 2 - 0.2, 0.15]) wood(geo.chamferBox(0.1, 0.55, 0.1, 0.02).rotateX(-0.6).translate(x, y1 - 0.25, D / 2 + 0.14));
  for (const z of [-D / 2 + 0.2, D / 2 - 0.2]) wood(geo.chamferBox(0.1, 0.55, 0.1, 0.02).rotateZ(0.6).translate(W / 2 + 0.14, y1 - 0.25, z));
  // ---- верхние этажи: штукатурка в фахверке, между этажами — пояс из балки
  const UH = y3 - y2;
  L.push(part(new THREE.BoxGeometry(W2 - 0.06, UH, D2 - 0.06), wall, [0, y2 + UH / 2, 0], 0, 1, { top: wallTop, tex: 'plaster' }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push(bbox(0.2, UH + 0.04, 0.2, 0.03, T, [sx * W2 / 2, y2 + UH / 2, sz * D2 / 2], 0, { top: TL, tex: 'wood' }));
  const brace = (x, z, face, dir, span, yb) => {
    const hh = uf - 0.24, len = Math.hypot(hh, span), ang = Math.atan2(hh, span) * dir, g = geo.chamferBox(0.11, len, 0.08, 0.02);
    g.rotateZ(Math.PI / 2 - ang); if (face) g.rotateY(Math.PI / 2); wood(g.translate(x, yb + uf / 2, z));
  };
  for (let f = 0; f < floors - 1; f++) {
    const yb = y2 + f * (uf + 0.24);
    for (const y of [yb + 0.07, yb + uf - 0.07]) { L.push(bbox(W2 + 0.04, 0.16, 0.13, 0.025, T, [0, y, D2 / 2 + 0.03], 0, { top: TL, tex: 'woodH' })); L.push(bbox(0.13, 0.16, D2 + 0.04, 0.025, T, [W2 / 2 + 0.03, y, 0], 0, { top: TL, tex: 'woodH' })); }
    if (f > 0) { L.push(bbox(W2 + 0.12, 0.24, 0.2, 0.03, T, [0, yb - 0.12, D2 / 2 + 0.05], 0, { top: TL, tex: 'woodH' })); L.push(bbox(0.2, 0.24, D2 + 0.12, 0.03, T, [W2 / 2 + 0.05, yb - 0.12, 0], 0, { top: TL, tex: 'woodH' })); }
    brace(-W2 / 2 + 0.45, D2 / 2 + 0.04, 0, 1, 0.65, yb); brace(W2 / 2 - 0.45, D2 / 2 + 0.04, 0, -1, 0.65, yb);
    brace(W2 / 2 + 0.04, -D2 / 2 + 0.45, 1, -1, 0.65, yb); brace(W2 / 2 + 0.04, D2 / 2 - 0.45, 1, 1, 0.65, yb);
    const nw = Math.max(2, Math.round(W2 / 1.7));
    for (let i = 0; i < nw; i++) {
      const x = -W2 / 2 + W2 * (i + 0.5) / nw;
      if (i > 0) L.push(bbox(0.11, uf - 0.1, 0.08, 0.02, T, [-W2 / 2 + W2 * i / nw, yb + uf / 2, D2 / 2 + 0.04], 0, { top: TL, tex: 'wood' }));
      win(x, D2 / 2, yb + uf * 0.52, 0, 0.7, 0.85, (i + f) % 2 === 0);
    }
    win(W2 / 2, -D2 * 0.18, yb + uf * 0.52, 1, 0.7, 0.85, f % 2 === 1); win(W2 / 2, D2 * 0.22, yb + uf * 0.52, 1, 0.6, 0.85, f % 2 === 0);
  }
  // ---- крыша: крутая, свес 0.55, толстые ряды дранки внахлёст, лёгкая кривизна
  const pitch = 0.86, half = D2 / 2 + 0.7, slope = half / Math.cos(pitch), rise = Math.tan(pitch) * (D2 / 2), len = W2 + 1.0, rows = 8;
  const MOSS = new THREE.Color(0x5a7a34), rc0 = new THREE.Color(roof), rc1 = new THREE.Color(roofTop);
  // ряд дранки — 3–4 куска разного тона, часть тронута мхом (живая, «рисованная» крыша)
  const roofRow = (s, i, rows, slope, len, y, pitch, along, axis = 'x') => {
    const t0 = i / rows, rw = slope / rows * 1.45, drop = Math.sin(pitch) * along, out = Math.cos(pitch) * along, n = 3 + (R() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const seg = len / n + 0.12, cx = -len / 2 + (k + 0.5) * len / n + (R() - 0.5) * 0.08;
      const g = geo.chamferBox(seg, 0.16, rw, 0.04); g.rotateX(s * pitch); g.translate(cx, 0, 0);
      if (axis === 'z') g.rotateY(Math.PI / 2);
      const c = rc0.clone().lerp(rc1, 0.15 + R() * 0.5 + (1 - t0) * 0.2); if (R() < 0.18 + t0 * 0.12) c.lerp(MOSS, 0.35 + R() * 0.35);
      const off = axis === 'z' ? [s * out, 0, 0] : [0, 0, s * out];
      L.push(geo.paint(geo.warp(g.translate(off[0] + (R() - 0.5) * 0.04, y - drop + 0.06 * (i % 2), off[2]), 0.05, seed + i * 7 + k), c.getHex(), { top: rc1.getHex(), tex: roofTex }));
    }
  };
  for (const s of [-1, 1]) for (let i = 0; i < rows; i++) roofRow(s, i, rows, slope, len, y3 + rise + 0.18, pitch, slope * (i + 0.5) / rows);
  L.push(bbox(len + 0.1, 0.2, 0.26, 0.05, T, [0, y3 + rise + 0.28, 0], 0, { top: TL, tex: 'woodH' }));
  // щипцы: треугольники из вертикальных досок, ветровые доски крест-накрест у конька
  const tri = new THREE.Shape([new THREE.Vector2(-D2 / 2, 0), new THREE.Vector2(D2 / 2, 0), new THREE.Vector2(0, rise)]);
  const gab = new THREE.ExtrudeGeometry(tri, { depth: W2 - 0.06, bevelEnabled: false }); gab.translate(0, 0, -(W2 - 0.06) / 2); gab.rotateY(Math.PI / 2);
  L.push(geo.paint(gab.translate(0, y3, 0), 0x6a4a2c, { top: 0x9a7448, tex: 'wood' }));
  for (const s of [-1, 1]) {
    const g = geo.chamferBox(0.09, 0.2, slope + 0.5, 0.02); g.rotateX(s * pitch);
    wood(g.translate(len / 2 + 0.02, y3 + rise + 0.18 - Math.sin(pitch) * slope / 2 + 0.2, s * (Math.cos(pitch) * slope / 2 - 0.15)));
  }
  win(W2 / 2 + 0.01, 0, y3 + rise * 0.36, 1, 0.55, 0.6, false, false);
  // ---- труба: массивная, чуть сужается, с колпаком
  const chx = -W * 0.28, chz = -D2 * 0.18, cy0 = y1, ch = y3 + rise + 1.0 - cy0;
  L.push(bbox(0.8, ch, 0.8, 0.07, ST, [chx, cy0 + ch / 2, chz], 0, { top: STL, tex: 'stone' }));
  L.push(bbox(0.96, 0.16, 0.96, 0.04, 0x3a362e, [chx, cy0 + ch, chz], 0, { top: 0x6a6252, tex: 'stone' }));
  L.push(bbox(0.46, 0.24, 0.46, 0.03, 0x24242a, [chx, cy0 + ch + 0.16, chz], 0, { top: 0x4a4a52, tex: 'iron' }));
  // ---- особенности дома (o.cross, o.dormers, o.tower, o.balcony, o.stairs, o.sign, o.ivy)
  if (o.cross) {   // поперечный фронтон: выступ верхних этажей на фасаде с собственной двускатной крышей коньком к камере
    const CW = 2.6, cx = W * 0.16, cz0 = D2 / 2, CD = 0.7, r2 = Math.tan(pitch) * (CW / 2);
    L.push(part(new THREE.BoxGeometry(CW, UH, CD), wall, [cx, y2 + UH / 2, cz0 + CD / 2 - 0.03], 0, 1, { top: wallTop, tex: 'plaster' }));
    for (const sx of [-1, 1]) L.push(bbox(0.18, UH + 0.04, 0.18, 0.03, T, [cx + sx * CW / 2, y2 + UH / 2, cz0 + CD], 0, { top: TL, tex: 'wood' }));
    for (const y of [y2 + 0.07, y3 - 0.07]) L.push(bbox(CW + 0.04, 0.16, 0.13, 0.025, T, [cx, y, cz0 + CD + 0.03], 0, { top: TL, tex: 'woodH' }));
    for (let f = 0; f < floors - 1; f++) win(cx, cz0 + CD, y2 + f * (uf + 0.24) + uf * 0.52, 0, 1.1, 1.0, true);
    const tri2 = new THREE.Shape([new THREE.Vector2(-CW / 2, 0), new THREE.Vector2(CW / 2, 0), new THREE.Vector2(0, r2)]);
    const g2 = new THREE.ExtrudeGeometry(tri2, { depth: CD + D2 / 2, bevelEnabled: false }); g2.translate(cx, y3, cz0 + CD - (CD + D2 / 2));
    L.push(geo.paint(g2, 0x6a4a2c, { top: 0x9a7448, tex: 'wood' }));
    const sl2 = (CW / 2 + 0.5) / Math.cos(pitch), rows2 = 5;
    for (const s2 of [-1, 1]) for (let i = 0; i < rows2; i++) {
      const tmp = L.length; roofRow(s2, i, rows2, sl2, CD + D2 / 2 + 0.6, y3 + r2 + 0.18, pitch, sl2 * (i + 0.5) / rows2, 'z');
      for (let j = tmp; j < L.length; j++) L[j].translate(cx, 0, cz0 + CD + 0.3 - (CD + D2 / 2 + 0.6) / 2);
    }
    L.push(bbox(0.2, 0.2, CD + D2 / 2 + 0.7, 0.05, T, [cx, y3 + r2 + 0.28, cz0 + CD + 0.35 - (CD + D2 / 2 + 0.7) / 2], 0, { top: TL, tex: 'woodH' }));
    for (const s2 of [-1, 1]) { const g = geo.chamferBox(0.09, 0.2, sl2 + 0.2, 0.02); g.rotateX(pitch); g.rotateY(Math.PI / 2 * s2); wood(g.translate(cx + s2 * (Math.cos(pitch) * sl2 / 2 - 0.15), y3 + r2 + 0.2 - Math.sin(pitch) * sl2 / 2, cz0 + CD + 0.32)); }
  }
  for (let k = 0; k < (o.dormers || 0); k++) {   // мансардные окна на переднем скате
    const dxk = -W2 / 2 + W2 * (k + 0.5) / (o.dormers + (o.cross ? 1 : 0)) - (o.cross ? 0.4 : 0), out = D2 / 2 - 0.55, ry = y3 + rise + 0.18 - Math.tan(pitch) * out;
    L.push(part(new THREE.BoxGeometry(1.0, 1.15, 1.2), wall, [dxk, ry + 0.35, out + 0.1], 0, 1, { top: wallTop, tex: 'plaster' }));
    win(dxk, out + 0.7, ry + 0.4, 0, 0.55, 0.6, false, false);
    for (const s2 of [-1, 1]) L.push(geo.paint(geo.chamferBox(0.8, 0.1, 1.5, 0.02).rotateZ(-s2 * 0.75).translate(dxk + s2 * 0.3, ry + 1.15, out + 0.15), rc0.getHex(), { top: rc1.getHex(), tex: roofTex }));
  }
  if (o.tower) {   // угловая круглая башня: камень внизу, штукатурка в фахверке выше, коническая крыша с латунным навершием
    const tx = W / 2 - 0.45, tz = D / 2 - 0.45, TR = 1.2, th = y3 + rise * 0.55;
    L.push(part(new THREE.CylinderGeometry(TR + 0.08, TR + 0.15, y1 + 0.1, 16), ST, [tx, (y1 + 0.1) / 2, tz], 0, 1, { top: STL, tex: 'stone' }));
    L.push(part(new THREE.CylinderGeometry(TR + 0.2, TR + 0.2, 0.2, 16), T, [tx, y1 + 0.1, tz], 0, 1, { top: TL, tex: 'woodH' }));
    L.push(part(new THREE.CylinderGeometry(TR + 0.12, TR + 0.12, th - y1 - 0.2, 16), wall, [tx, y1 + 0.2 + (th - y1 - 0.2) / 2, tz], 0, 1, { top: wallTop, tex: 'plaster' }));
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; L.push(bbox(0.12, th - y1 - 0.2, 0.12, 0.02, T, [tx + Math.cos(a) * (TR + 0.14), y1 + 0.2 + (th - y1 - 0.2) / 2, tz + Math.sin(a) * (TR + 0.14)], [0, -a, 0], { top: TL, tex: 'wood' })); }
    for (let f = 0; f < floors - 1; f++) for (const a of [0.35, 1.2]) {
      const wx = tx + Math.sin(a) * (TR + 0.16), wz = tz + Math.cos(a) * (TR + 0.16), yy = y2 + f * (uf + 0.24) + uf * 0.52;
      L.push(part(new THREE.BoxGeometry(0.55, 0.75, 0.08), 0xffc070, [wx, yy, wz], [0, a, 0], 1, { emit: true }));
      L.push(bbox(0.7, 0.9, 0.06, 0.015, T, [wx - Math.sin(a) * 0.02, yy, wz - Math.cos(a) * 0.02], [0, a, 0], { top: TL, tex: 'wood' }));
    }
    const cr = TR + 0.55, ch2 = 3.2;
    for (let i = 0; i < 6; i++) {   // конус из шести колец дранки
      const t0 = i / 6, r0 = cr * (1 - t0), r1 = cr * (1 - t0 - 1 / 6) + 0.05;
      const c = rc0.clone().lerp(rc1, 0.2 + t0 * 0.6 + R() * 0.15); if (R() < 0.25) c.lerp(MOSS, 0.4);
      L.push(part(new THREE.CylinderGeometry(Math.max(0.05, r1), r0, ch2 / 6 + 0.12, 16, 1, true), c.getHex(), [tx, th + ch2 * (t0 + 0.5 / 6), tz], 0, 1, { top: rc1.getHex(), tex: roofTex }));
    }
    L.push(part(new THREE.CylinderGeometry(cr, cr + 0.05, 0.12, 16), T, [tx, th + 0.05, tz], 0, 1, { top: TL, tex: 'woodH' }));
    L.push(part(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), PAL.brassD, [tx, th + ch2 + 0.4, tz]), part(new THREE.SphereGeometry(0.12, 8, 6), PAL.brass, [tx, th + ch2 + 0.15, tz]));
    L.push(part(new THREE.BoxGeometry(0.5, 0.3, 0.02), 0x35205f, [tx + 0.27, th + ch2 + 0.7, tz], 0, 1, { top: 0x7a4cd8, tex: 'cloth' }));
  }
  if (o.balcony) {   // балкон второго этажа на фасаде: настил, перила с балясинами, дверь
    const bx = -W2 * 0.12, bw = 2.6, bz = D2 / 2 + 0.5, by = y2;
    L.push(bbox(bw, 0.14, 1.0, 0.03, T, [bx, by, bz], 0, { top: TL, tex: 'woodH' }));
    for (const s2 of [-1, 1]) wood(geo.chamferBox(0.12, 1.0, 0.12, 0.02).rotateX(0.7).translate(bx + s2 * (bw / 2 - 0.2), by - 0.45, D2 / 2 + 0.2));
    L.push(bbox(bw, 0.08, 0.1, 0.02, T, [bx, by + 0.95, bz + 0.45], 0, { top: TL, tex: 'woodH' }));
    for (const s2 of [-1, 1]) L.push(bbox(0.1, 0.08, 1.0, 0.02, T, [bx + s2 * bw / 2, by + 0.95, bz], 0, { top: TL, tex: 'woodH' }));
    for (let i = 0; i <= 10; i++) L.push(part(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 5), T, [bx - bw / 2 + bw * i / 10, by + 0.5, bz + 0.45], 0, 1, { top: TL, tex: 'wood' }));
    L.push(bbox(0.9, 1.7, 0.08, 0.015, 0x4a2c18, [bx, by + 0.95, D2 / 2 + 0.02], 0, { top: 0x7a5232, tex: 'wood' }));
  }
  if (o.stairs) {   // наружная лестница на второй этаж вдоль стены +x
    const n = 11, sx0 = W / 2 + 0.55;
    for (let i = 0; i < n; i++) L.push(bbox(0.9, 0.12, 0.42, 0.02, T, [sx0, y0 + (i + 1) * (gf / n), D / 2 - 0.3 - i * 0.36], 0, { top: TL, tex: 'woodH' }));
    L.push(bbox(0.9, 0.12, 1.0, 0.02, T, [sx0, y1 + 0.1, -D / 2 + 0.4], 0, { top: TL, tex: 'woodH' }));
    for (const z of [D / 2 - 0.3, 0, -D / 2 + 0.4]) wood(geo.chamferBox(0.12, y1 + 0.1 - (z > 0.2 ? gf * 0.4 : 0), 0.12, 0.02).translate(sx0 + 0.4, (y1 + 0.1 - (z > 0.2 ? gf * 0.4 : 0)) / 2, z));
    const rl = Math.hypot(gf, n * 0.36), g = geo.chamferBox(0.08, 0.08, rl, 0.02); g.rotateX(Math.atan2(gf, n * 0.36)); wood(g.translate(sx0 + 0.42, y0 + gf / 2 + 0.9, D / 2 - 0.3 - n * 0.18));
  }
  if (o.sign) {   // вывеска таверны на кованом кронштейне: кружка Ордена
    const sx = W / 2 + 0.1, sz = D / 2 + 0.2, sy = y1 - 0.25;
    L.push(bbox(1.2, 0.07, 0.07, 0.01, 0x24242a, [sx + 0.55, sy + 0.6, sz], 0, { top: 0x5a5a64, tex: 'iron' }));
    L.push(bbox(0.9, 0.7, 0.07, 0.02, 0x5a3a22, [sx + 0.75, sy, sz], 0, { top: 0x9a7448, tex: 'woodH' }));
    L.push(bbox(0.95, 0.75, 0.05, 0.02, PAL.brassD, [sx + 0.75, sy, sz - 0.01], 0, { top: PAL.brass }));
    L.push(part(new THREE.CylinderGeometry(0.15, 0.13, 0.32, 10), PAL.brass, [sx + 0.72, sy - 0.02, sz + 0.05], 0, 1, { top: 0xffe08a }), part(new THREE.TorusGeometry(0.09, 0.025, 4, 8, Math.PI), PAL.brass, [sx + 0.88, sy, sz + 0.05], [0, 0, -Math.PI / 2]));
    for (const s2 of [-1, 1]) L.push(part(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 3), 0x24242a, [sx + 0.75 + s2 * 0.35, sy + 0.45, sz]));
  }
  if (o.ivy) {   // плющ на каменной стене у угла (+x,+z): листва кустиками снизу вверх
    for (let i = 0; i < 26; i++) { const t = R(), up = t * (gf + 0.6), side = R() < 0.6, x = side ? W / 2 + 0.05 : W / 2 - 0.2 - R() * 1.2, z = side ? D / 2 - 0.2 - R() * 1.4 * (1 - t) : D / 2 + 0.05;
      L.push(part(new THREE.IcosahedronGeometry(0.16 + R() * 0.14 * (1 - t), 0), R() < 0.3 ? 0x2e5a22 : 0x3e7a2c, [x, y0 + up, z], 0, [1, 0.8, 1], { top: 0x6aa83a })); }
  }
  // ---- фонарь на кронштейне у двери
  L.push(bbox(0.5, 0.05, 0.05, 0.01, 0x24242a, [dx + DW / 2 + 0.55, y0 + 2.15, dz + 0.1], [0, Math.PI / 2, 0], { top: 0x5a5a64, tex: 'iron' }));
  L.push(bbox(0.18, 0.26, 0.18, 0.02, 0x24242a, [dx + DW / 2 + 0.55, y0 + 1.95, dz + 0.3], 0, { top: 0x5a5a64, tex: 'iron' }));
  L.push(part(new THREE.BoxGeometry(0.12, 0.17, 0.12), 0xffc070, [dx + DW / 2 + 0.55, y0 + 1.95, dz + 0.3], 0, 1, { emit: true }));
  const root = new THREE.Group(); const m = new THREE.Mesh(merge(L), kit.propMat(o)); if (w < d) m.rotation.y = -Math.PI / 2; root.add(m);
  return { root };
}
// тень дома — от коробки этажей, призмы крыши и трубы (десятки треугольников вместо ≈ 10 тыс.)
export function houseProxy(kit, o) {
  const { THREE, merge, part } = kit, floors = o.floors ?? 2, gf = o.gf ?? 2.8;
  const W = Math.max(o.w, o.d), D = Math.min(o.w, o.d), W2 = W + 0.8, D2 = D + 0.8, y3 = 0.3 + gf + 0.24 + 2.3 * (floors - 1) + 0.24 * (floors - 2);
  const rise = Math.tan(0.86) * (D2 / 2), tri = new THREE.Shape([new THREE.Vector2(-D2 / 2 - 0.7, 0), new THREE.Vector2(D2 / 2 + 0.7, 0), new THREE.Vector2(0, rise + 0.8)]);
  const roof = new THREE.ExtrudeGeometry(tri, { depth: W2 + 1.0, bevelEnabled: false }); roof.translate(0, y3 - 0.6, -(W2 + 1.0) / 2); roof.rotateY(Math.PI / 2);
  const L = [part(new THREE.BoxGeometry(W, y3, D), 0, [0, y3 / 2, 0]), part(new THREE.BoxGeometry(W2, y3 - gf, D2), 0, [0, gf + (y3 - gf) / 2 + 0.3, 0]), part(roof, 0), part(new THREE.BoxGeometry(0.8, 2.5, 0.8), 0, [-W * 0.28, y3 + rise, -D2 * 0.18])];
  if (o.tower) L.push(part(new THREE.CylinderGeometry(1.3, 1.3, y3 + rise * 0.55, 8), 0, [W / 2 - 0.45, (y3 + rise * 0.55) / 2, D / 2 - 0.45]), part(new THREE.ConeGeometry(1.75, 3.2, 8), 0, [W / 2 - 0.45, y3 + rise * 0.55 + 1.6, D / 2 - 0.45]));
  return merge(L);
}
