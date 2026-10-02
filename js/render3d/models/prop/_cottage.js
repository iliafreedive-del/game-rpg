// Одноэтажный деревенский дом (как на референсе Фальдероха): каменный цоколь, стены в фахверке (штукатурка + тёмные балки)
// или из камня, толстая соломенная крыша с валиками по конькам и свесам, щипцы в фахверке, труба у торца, окна со ставнями.
// Фасад с дверью — +z, конёк вдоль X (w ≥ d). Детализированы все четыре стороны: генератор деревни поворачивает дома к улице
// (0°, 45°, 90°), и камера видит то фасад и торец, то оба торца. Масштаб: стены 2,6 м, конёк ≈ 5,3 м (герой ≈ 2,2 м).
export function cottageParts(kit, o) {
  const { THREE, PAL, part, geo, bbox } = kit;
  const W = o.w, D = o.d, R = geo.rng(o.seed || 1), L = [];
  const T = o.timber ?? 0x3a2416, TL = o.timberL ?? 0x6e4a2a, ST = o.stone ?? 0x5e574a, STL = o.stoneTop ?? 0xaa9e82;
  const y0 = 0.35, H = o.h ?? 2.6, yT = y0 + H, stoneWalls = o.walls === 'stone';
  const wood = (g, c = T, cl = TL, t = 'wood') => L.push(geo.paint(g, c, { top: cl, tex: t }));
  // цоколь и стены
  L.push(bbox(W + 0.32, y0 + 0.02, D + 0.32, 0.07, 0x4a463c, [0, y0 / 2, 0], 0, { top: STL, tex: 'stone' }));
  if (stoneWalls) {
    L.push(bbox(W, H, D, 0.06, ST, [0, y0 + H / 2, 0], 0, { top: STL, tex: 'stone' }));
    for (let k = 0; k < Math.floor(H / 0.34); k++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {   // угловые камни вперевязку
      const long = (k + (sx > 0 ? 1 : 0)) % 2, bw = long ? 0.56 : 0.34, bd = long ? 0.34 : 0.56;
      L.push(bbox(bw, 0.32, bd, 0.05, ST, [sx * (W / 2 - bw / 2 + 0.05), y0 + 0.18 + k * 0.34, sz * (D / 2 - bd / 2 + 0.05)], [0, (R() - 0.5) * 0.04, 0], { top: STL, tex: 'stone' }));
    }
  } else L.push(part(new THREE.BoxGeometry(W, H, D), o.wall, [0, y0 + H / 2, 0], 0, 1, { top: o.wallTop, tex: 'plaster' }));
  // стороны дома: a — поворот наружной нормали (0: +z фасад, π/2: +x, π: −z, −π/2: −x), half — полуширина стены
  const faces = [{ a: 0, half: W / 2, n: D / 2 }, { a: Math.PI / 2, half: D / 2, n: W / 2 }, { a: Math.PI, half: W / 2, n: D / 2 }, { a: -Math.PI / 2, half: D / 2, n: W / 2 }];
  const put = (g, f, u, y, out = 0) => { const ca = Math.cos(f.a), sa = Math.sin(f.a); g.rotateY(f.a); g.translate(ca * u + sa * (f.n + out), y, -sa * u + ca * (f.n + out)); return g; };
  // окно: светящееся стекло с переплётом, наличник, ставни, подоконник, иногда ящик с цветами
  const win = (f, u, y, ww = 0.72, wh = 0.8, flowers = false) => {
    const add = (g, c, cl, t, out = 0) => L.push(geo.paint(put(g, f, u, y, out), c, { top: cl, tex: t }));
    L.push(geo.paint(put(new THREE.BoxGeometry(ww, wh, 0.05), f, u, y, 0.01), 0xffc070, { emit: true }));
    add(new THREE.BoxGeometry(0.05, wh, 0.04), T, T, null, 0.05); add(new THREE.BoxGeometry(ww, 0.05, 0.04), T, T, null, 0.05);
    for (const s of [-1, 1]) {
      add(geo.chamferBox(0.09, wh + 0.16, 0.08, 0.02).translate(s * (ww / 2 + 0.045), 0, 0), T, TL, 'wood', 0.04);
      add(geo.chamferBox(ww * 0.5, wh + 0.04, 0.05, 0.015).translate(s * (ww * 0.75 + 0.1), 0, 0), o.shutter ?? 0x3a5a3a, o.shutterL ?? 0x6a9a5a, 'wood', 0.06);
    }
    add(geo.chamferBox(ww + 0.3, 0.08, 0.16, 0.02).translate(0, -wh / 2 - 0.06, 0), T, TL, 'woodH', 0.08);
    add(geo.chamferBox(ww + 0.24, 0.1, 0.12, 0.02).translate(0, wh / 2 + 0.07, 0), T, TL, 'woodH', 0.06);
    if (flowers) {
      add(geo.chamferBox(ww + 0.12, 0.18, 0.22, 0.02).translate(0, -wh / 2 - 0.2, 0), 0x5a3a22, 0x8a6a40, 'woodH', 0.16);
      for (let i = 0; i < 8; i++) L.push(geo.paint(put(new THREE.IcosahedronGeometry(0.065 + R() * 0.035, 0).translate((i / 7 - 0.5) * ww, -wh / 2 - 0.07 + R() * 0.05, (R() - 0.5) * 0.08), f, u, y, 0.16), [0xd84a5a, 0xf0d070, 0xf4f0e0, 0x3a6a2a, 0x4a7a30, 0xe07ab0][i % 6], {}));
    }
    return { u, w: ww + 0.5 };
  };
  // проёмы по сторонам: фасад — дверь и 1–2 окна, торцы — по окну, задняя — окно
  const doorU = o.doorU ?? -W * 0.18, DW = 1.05, DH = 1.95;
  const open = [[], [], [], []];
  open[0].push({ u: doorU, w: DW + 0.4 });
  open[0].push(win(faces[0], W * 0.27, y0 + 1.45, 0.78, 0.82, true));
  if (W > 4.8) open[0].push(win(faces[0], doorU - 1.35, y0 + 1.45, 0.6, 0.78, false));
  open[1].push(win(faces[1], 0, y0 + 1.45, 0.66, 0.8, R() < 0.5));
  open[3].push(win(faces[3], 0, y0 + 1.45, 0.66, 0.8, false));
  open[2].push(win(faces[2], W * 0.15, y0 + 1.45, 0.6, 0.72, false));
  // дверь: доски, косяки, петли, кольцо, порог и маленький козырёк
  {
    const f = faces[0], add = (g, c, cl, t, out) => L.push(geo.paint(put(g, f, doorU, 0, out), c, { top: cl, tex: t }));
    add(geo.chamferBox(DW, DH, 0.08, 0.015).translate(0, y0 + DH / 2, 0), 0x4a2c18, 0x7a5232, 'wood', 0.01);
    for (const s of [-1, 1]) add(geo.chamferBox(0.14, DH + 0.12, 0.12, 0.02).translate(s * (DW / 2 + 0.07), y0 + DH / 2 + 0.05, 0), T, TL, 'wood', 0.04);
    add(geo.chamferBox(DW + 0.42, 0.16, 0.14, 0.02).translate(0, y0 + DH + 0.1, 0), T, TL, 'woodH', 0.05);
    for (const y of [0.4, 1.4]) add(new THREE.BoxGeometry(DW * 0.7, 0.06, 0.03).translate(-0.08, y0 + y, 0), 0x24242a, 0x6a6a74, 'iron', 0.07);
    add(new THREE.TorusGeometry(0.06, 0.014, 4, 8).translate(0.3, y0 + 0.95, 0), PAL.brassD, PAL.brass, null, 0.08);
    add(geo.chamferBox(DW + 0.5, 0.16, 0.5, 0.04).translate(0, 0.08, 0.2), ST, STL, 'stone', 0.1);
    add(geo.chamferBox(DW + 0.7, 0.07, 0.8, 0.02).rotateX(0.45).translate(0, y0 + DH + 0.5, 0.36), o.roof, o.roofTop, o.roofTex || 'thatch', 0);
    for (const s of [-1, 1]) add(geo.chamferBox(0.08, 0.6, 0.08, 0.02).rotateX(0.8).translate(s * (DW / 2 + 0.2), y0 + DH + 0.25, 0.22), T, TL, 'wood', 0);
  }
  // фахверк: угловые стойки, пороги/обвязка, стойки между проёмами, раскосы у углов, ригель на высоте подоконника
  if (!stoneWalls) faces.forEach((f, fi) => {
    const hf = f.half, beam = (g, out = 0.03) => wood(put(g, f, 0, 0, out));
    beam(geo.chamferBox(hf * 2 + 0.06, 0.16, 0.1, 0.02).translate(0, y0 + 0.08, 0));
    beam(geo.chamferBox(hf * 2 + 0.06, 0.16, 0.1, 0.02).translate(0, yT - 0.08, 0));
    const free = u => open[fi].every(p => Math.abs(u - p.u) > p.w / 2 + 0.08);
    const n = Math.max(2, Math.round(hf * 2 / 1.25));
    for (let i = 1; i < n; i++) { const u = -hf + hf * 2 * i / n; if (free(u)) beam(geo.chamferBox(0.12, H - 0.2, 0.09, 0.02).translate(u, y0 + H / 2, 0)); }
    for (let i = 0; i < n; i++) {   // ригель по сегментам, где нет проёма
      const ua = -hf + hf * 2 * i / n, ub = ua + hf * 2 / n, um = (ua + ub) / 2;
      if (free(um) && free(ua + 0.2) && free(ub - 0.2)) beam(geo.chamferBox(ub - ua, 0.11, 0.08, 0.02).translate(um, y0 + 0.95, 0), 0.025);
    }
    for (const s of [-1, 1]) { const u0 = s * (hf - 0.1), u1 = s * (hf - 1.0); if (free(u1) && free((u0 + u1) / 2)) { const len = Math.hypot(H - 0.4, u1 - u0), g = geo.chamferBox(0.11, len, 0.08, 0.02); g.rotateZ(Math.atan2(u1 - u0, H - 0.4) * -1); beam(g.translate((u0 + u1) / 2, y0 + H / 2, 0), 0.028); } }
  });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) if (!stoneWalls) L.push(bbox(0.2, H + 0.04, 0.2, 0.03, T, [sx * W / 2, y0 + H / 2, sz * D / 2], 0, { top: TL, tex: 'wood' }));
  // ---- крыша: соломенная, толстая, с валиками; щипцы в фахверке
  const pitch = o.pitch ?? 0.82, ev = 0.55, gv = 0.38, half = D / 2 + ev, slope = half / Math.cos(pitch), rise = Math.tan(pitch) * (D / 2), ridgeY = yT + rise + 0.12, len = W + gv * 2;
  const tri = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, rise)]);
  const gab = new THREE.ExtrudeGeometry(tri, { depth: W - 0.04, bevelEnabled: false }); gab.translate(0, 0, -(W - 0.04) / 2); gab.rotateY(Math.PI / 2);
  L.push(geo.paint(gab.translate(0, yT, 0), stoneWalls ? ST : o.wall, { top: stoneWalls ? STL : o.wallTop, tex: stoneWalls ? 'stone' : 'plaster' }));
  if (!stoneWalls) for (const sx of [-1, 1]) {   // фахверк щипца: стойка-бабка и две затяжки
    const x = sx * (W / 2 + 0.03);
    L.push(bbox(0.08, rise - 0.15, 0.12, 0.02, T, [x, yT + (rise - 0.15) / 2, 0], 0, { top: TL, tex: 'wood' }));
    L.push(bbox(0.08, 0.12, D * 0.62, 0.02, T, [x, yT + rise * 0.38, 0], 0, { top: TL, tex: 'woodH' }));
    L.push(bbox(0.08, 0.14, D + 0.08, 0.02, T, [x, yT + 0.07, 0], 0, { top: TL, tex: 'woodH' }));
    L.push(geo.paint(new THREE.BoxGeometry(0.06, 0.42, 0.36).translate(x + sx * 0.01, yT + rise * 0.62, 0), 0xffc070, { emit: true }));
  }
  const c0 = new THREE.Color(o.roof), c1 = new THREE.Color(o.roofTop), MOSS = new THREE.Color(0x5a6a2a), rows = 4;
  for (const s of [-1, 1]) {
    // ряды соломы внахлёст, нижние темнее; толщина 0,36 м, чуть волнистые
    for (let i = 0; i < rows; i++) {
      const t0 = i / rows, rl = slope / rows * 1.35, along = slope * (i + 0.5) / rows, n = 2 + (R() < 0.5 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const seg = len / n + 0.1, cx = -len / 2 + (k + 0.5) * len / n;
        const g = geo.chamferBox(seg, 0.34, rl, 0.12); g.rotateX(s * pitch);
        const c = c0.clone().lerp(c1, 0.1 + (1 - t0) * 0.4 + R() * 0.3); if (R() < 0.22) c.lerp(MOSS, 0.25 + R() * 0.2);
        g.translate(cx, ridgeY - Math.sin(pitch) * along + 0.12 * Math.cos(pitch) + 0.05 * (i % 2), s * (Math.cos(pitch) * along + 0.12 * Math.sin(pitch)));
        L.push(geo.paint(geo.warp(g, 0.05, (o.seed || 1) * 13 + i * 7 + k + (s > 0 ? 50 : 0)), c.getHex(), { top: c1.getHex(), tex: o.roofTex || 'thatch' }));
      }
    }
    // валик по свесу и по краям щипцов
    const eY = ridgeY - Math.sin(pitch) * slope + 0.05, eZ = s * Math.cos(pitch) * slope;
    L.push(part(new THREE.CylinderGeometry(0.2, 0.2, len + 0.1, 8), o.roof, [0, eY, eZ], [0, 0, Math.PI / 2], [1, 1, 0.8], { top: o.roofTop, tex: o.roofTex || 'thatch' }));
    for (const sx of [-1, 1]) { const g = new THREE.CylinderGeometry(0.17, 0.2, slope + 0.2, 7); g.rotateX(-s * (Math.PI / 2 - pitch)); L.push(geo.paint(g.translate(sx * (len / 2 - 0.05), ridgeY - Math.sin(pitch) * slope / 2 + 0.12, s * Math.cos(pitch) * slope / 2), o.roof, { top: o.roofTop, tex: o.roofTex || 'thatch' })); }
  }
  // конёк: толстый валик с «седлом» и колышками
  L.push(part(new THREE.CylinderGeometry(0.3, 0.3, len + 0.2, 10), c0.clone().lerp(c1, 0.5).getHex(), [0, ridgeY + 0.22, 0], [0, 0, Math.PI / 2], [1, 0.75, 1], { top: o.roofTop, tex: o.roofTex || 'thatch' }));
  for (let i = 0; i < Math.round(len / 0.7); i++) { const x = -len / 2 + 0.35 + i * 0.7; for (const s of [-1, 1]) L.push(bbox(0.05, 0.05, 0.42, 0.01, T, [x, ridgeY + 0.3, s * 0.12], [s * 0.6, 0, 0], { top: TL, tex: 'wood' })); }
  // труба у торца
  if (o.chimney !== 0) {
    const cx = (o.chimney ?? 1) * (W / 2 - 0.55), cz = -D * 0.12, ch = ridgeY + 0.9 - y0;
    L.push(bbox(0.7, ch, 0.7, 0.07, ST, [cx, y0 + ch / 2, cz], 0, { top: STL, tex: 'stone' }));
    L.push(bbox(0.86, 0.14, 0.86, 0.04, 0x3a362e, [cx, y0 + ch, cz], 0, { top: 0x6a6252, tex: 'stone' }));
    L.push(bbox(0.36, 0.2, 0.36, 0.03, 0x24242a, [cx, y0 + ch + 0.14, cz], 0, { top: 0x4a4a52, tex: 'iron' }));
  }
  // скамья у фасада и фонарь у двери
  if (o.bench !== false) { const bx = W * 0.27; L.push(bbox(1.3, 0.08, 0.36, 0.02, 0x5a3a22, [bx, 0.5, D / 2 + 0.32], 0, { top: 0x9a7448, tex: 'woodH' })); for (const s of [-1, 1]) L.push(bbox(0.08, 0.46, 0.3, 0.02, T, [bx + s * 0.5, 0.23, D / 2 + 0.32], 0, { top: TL, tex: 'wood' })); }
  L.push(bbox(0.16, 0.24, 0.16, 0.02, 0x24242a, [doorU + DW / 2 + 0.38, y0 + 1.85, D / 2 + 0.22], 0, { top: 0x5a5a64, tex: 'iron' }));
  L.push(part(new THREE.BoxGeometry(0.1, 0.15, 0.1), 0xffc070, [doorU + DW / 2 + 0.38, y0 + 1.85, D / 2 + 0.22], 0, 1, { emit: true }));
  L.push(bbox(0.05, 0.05, 0.3, 0.01, 0x24242a, [doorU + DW / 2 + 0.38, y0 + 2.0, D / 2 + 0.1], 0, { top: 0x5a5a64, tex: 'iron' }));
  return { L, ridgeY, yT };
}
export function cottage(kit, def, o) {
  const { THREE, merge } = kit, root = new THREE.Group();
  root.add(new THREE.Mesh(merge(cottageParts(kit, o).L), kit.propMat(def)));
  return { root };
}
// тень — коробка стен и призма крыши
export function cottageProxy(kit, o, dx = 0) {
  const { THREE, merge, part } = kit, H = o.h ?? 2.6, yT = 0.35 + H, D = o.d, W = o.w, rise = Math.tan(o.pitch ?? 0.82) * (D / 2 + 0.55);
  const tri = new THREE.Shape([new THREE.Vector2(-D / 2 - 0.55, 0), new THREE.Vector2(D / 2 + 0.55, 0), new THREE.Vector2(0, rise + 0.4)]);
  const roof = new THREE.ExtrudeGeometry(tri, { depth: W + 0.8, bevelEnabled: false }); roof.translate(0, yT - 0.5, -(W + 0.8) / 2); roof.rotateY(Math.PI / 2);
  const L = [part(new THREE.BoxGeometry(W, yT, D), 0, [0, yT / 2, 0]), part(roof, 0)];
  const g = merge(L); if (dx) g.translate(dx, 0, 0); return g;
}
