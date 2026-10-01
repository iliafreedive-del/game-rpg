// Дом деревни: каменный цоколь из блоков, оштукатуренные стены в фахверке (столбы, балки, раскосы), двускатная крыша
// из дранки с толщиной и свесом, щипцы, конёк, каменная труба, дверь из досок на петлях с порогом, окна с рамами,
// ставнями и тёплым самосвечением, ящик с цветами. Рисованные фактуры: stone / plaster / wood / roof / metal.
export function house(kit, o) {
  const { THREE, PAL, part, merge, geo, bbox } = kit;
  const { w, d, h = 1.9, wall, wallTop, roof, roofTop, seed = 1 } = o;
  const R = geo.rng(seed), L = [];
  const TIMBER = 0x3a2416, TIMBER_L = 0x6e4a2a, STONE = 0x4e4a40, STONE_L = 0x9a9078;
  const y0 = 0.5, yt = y0 + h;                       // низ и верх стен
  // цоколь: крупные блоки по периметру, чуть разного размера
  L.push(bbox(w + 0.28, 0.52, d + 0.28, 0.06, STONE, [0, 0.26, 0], 0, { top: STONE_L, tex: 'stone' }));
  for (let i = 0; i < 10; i++) { const sx = R() < 0.5 ? -1 : 1, along = R() < 0.5; const bw = 0.3 + R() * 0.3; L.push(bbox(along ? bw : 0.18, 0.22 + R() * 0.12, along ? 0.18 : bw, 0.05, STONE, along ? [(R() - 0.5) * w, 0.12, sx * (d / 2 + 0.15)] : [sx * (w / 2 + 0.15), 0.12, (R() - 0.5) * d], [0, (R() - 0.5) * 0.3, 0], { top: STONE_L, tex: 'stone' })); }
  // стены
  L.push(part(new THREE.BoxGeometry(w, h, d), wall, [0, y0 + h / 2, 0], 0, 1, { top: wallTop, tex: 'plaster' }));
  // фахверк: угловые столбы, нижняя и верхняя обвязка, средняя балка, раскосы и стойки на двух видимых стенах (+z, +x)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push(bbox(0.18, h + 0.06, 0.18, 0.03, TIMBER, [sx * w / 2, y0 + h / 2, sz * d / 2], 0, { top: TIMBER_L, tex: 'wood' }));
  for (const y of [y0 + 0.06, yt - 0.06, y0 + h * 0.5]) {
    L.push(bbox(w + 0.06, 0.13, 0.12, 0.025, TIMBER, [0, y, d / 2 + 0.03], 0, { top: TIMBER_L, tex: 'woodH' }));
    L.push(bbox(0.12, 0.13, d + 0.06, 0.025, TIMBER, [w / 2 + 0.03, y, 0], 0, { top: TIMBER_L, tex: 'woodH' }));
  }
  const brace = (x, z, face, dir) => {   // раскос в нижней половине стены
    const len = Math.hypot(h * 0.46, w * 0.22), ang = Math.atan2(h * 0.46, w * 0.22) * dir;
    const g = geo.chamferBox(0.1, len, 0.08, 0.02);
    g.rotateZ(Math.PI / 2 - ang); if (face) g.rotateY(Math.PI / 2);
    L.push(geo.paint(g.translate(x, y0 + h * 0.27, z), TIMBER, { top: TIMBER_L, tex: 'wood' }));
  };
  brace(w * 0.36, d / 2 + 0.04, 0, 1); brace(w / 2 + 0.04, -d * 0.3, 1, -1);
  // крыша: конёк вдоль длинной стороны
  const along = w >= d, span = along ? d : w, len = (along ? w : d) + 0.75, pitch = 0.68, half = span / 2 + 0.42;
  const slope = half / Math.cos(pitch), rh = Math.tan(pitch) * (span / 2), th = 0.14;
  for (const s of [-1, 1]) {
    const g = geo.chamferBox(along ? len : slope, th, along ? slope : len, 0.04);
    if (along) g.rotateX(s * pitch); else g.rotateZ(-s * pitch);
    const cx = along ? 0 : s * (half / 2 - 0.06), cz = along ? s * (half / 2 - 0.06) : 0;
    L.push(geo.paint(g.translate(cx, yt + rh - Math.tan(pitch) * (half / 2) + 0.12, cz), roof, { top: roofTop, tex: 'roof' }));
  }
  // щипцы: треугольная призма под крышей
  const tri = new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(0, rh)]);
  const gab = new THREE.ExtrudeGeometry(tri, { depth: along ? w : d, bevelEnabled: false });
  gab.translate(0, 0, -(along ? w : d) / 2); if (along) gab.rotateY(Math.PI / 2);
  L.push(geo.paint(gab.translate(0, yt, 0), wall, { top: wallTop, tex: 'plaster' }));
  // конёк и ветровые доски на щипце, обращённом к камере
  L.push(bbox(along ? len + 0.05 : 0.16, 0.16, along ? 0.16 : len + 0.05, 0.03, TIMBER, [0, yt + rh + 0.16, 0], 0, { top: TIMBER_L, tex: 'woodH' }));
  const gx = along ? w / 2 + 0.12 : 0, gz = along ? 0 : d / 2 + 0.12;
  for (const s of [-1, 1]) {
    const g = geo.chamferBox(0.08, 0.14, slope, 0.02); g.rotateX(s * pitch); if (!along) g.rotateY(Math.PI / 2);
    const off = s * (half / 2 - 0.06), yb = yt + rh - Math.tan(pitch) * (half / 2) + 0.16;
    L.push(geo.paint(g.translate(along ? gx + 0.25 : off, yb, along ? off : gz + 0.25), TIMBER, { top: TIMBER_L, tex: 'wood' }));
  }
  // труба
  const chx = along ? w * 0.28 : span * 0.22, chz = along ? -span * 0.22 : -d * 0.25;
  L.push(bbox(0.42, 1.0 + rh, 0.42, 0.05, STONE, [chx, yt + (1.0 + rh) / 2 - 0.2, chz], 0, { top: STONE_L, tex: 'stone' }));
  L.push(bbox(0.52, 0.1, 0.52, 0.03, 0x3a362e, [chx, yt + rh + 0.85, chz], 0, { top: 0x6a6252, tex: 'stone' }));
  // дверь на +z: рама, доски, петли, ручка, порог
  const dx = -w * 0.2, dz = d / 2;
  L.push(bbox(0.72, 1.18, 0.12, 0.03, TIMBER, [dx, y0 + 0.59, dz + 0.02], 0, { top: TIMBER_L, tex: 'wood' }));
  L.push(bbox(0.56, 1.06, 0.08, 0.015, 0x4a2c18, [dx, y0 + 0.53, dz + 0.07], 0, { top: 0x7a5232, tex: 'wood' }));
  for (const y of [0.25, 0.8]) L.push(bbox(0.42, 0.06, 0.03, 0.01, 0x2a2a30, [dx - 0.05, y0 + y, dz + 0.12], 0, { top: 0x6a6a74, tex: 'metal' }));
  L.push(part(new THREE.SphereGeometry(0.04, 6, 5), PAL.brass, [dx + 0.18, y0 + 0.55, dz + 0.13]));
  L.push(bbox(0.9, 0.12, 0.42, 0.04, STONE, [dx, 0.47, dz + 0.3], 0, { top: STONE_L, tex: 'stone' }));
  // окна: рама, светящееся стекло с переплётом, ставни, подоконник; на первом — ящик с цветами
  const win = (x, z, face, flowers) => {
    const W = 0.46, H2 = 0.5, yy = y0 + h * 0.62, n = face ? [1, 0] : [0, 1], t = (a, b) => face ? [b, a] : [a, b];
    const at = (u, y, out) => { const [px, pz] = t(u, out); return [x + px, y, z + pz]; };
    L.push(part(new THREE.BoxGeometry(...(face ? [0.06, H2, W] : [W, H2, 0.06])), 0xffc070, at(0, yy, 0.02), 0, 1, { emit: true }));
    L.push(part(new THREE.BoxGeometry(...(face ? [0.03, H2, 0.04] : [0.04, H2, 0.03])), TIMBER, at(0, yy, 0.06)));
    L.push(part(new THREE.BoxGeometry(...(face ? [0.03, 0.04, W] : [W, 0.04, 0.03])), TIMBER, at(0, yy, 0.06)));
    for (const s of [-1, 1]) {
      L.push(bbox(...(face ? [0.08, H2 + 0.12, 0.08] : [0.08, H2 + 0.12, 0.08]), 0.02, TIMBER, at(s * (W / 2 + 0.04), yy, 0.05), 0, { top: TIMBER_L, tex: 'wood' }));
      L.push(bbox(...(face ? [0.05, H2 + 0.04, W * 0.5] : [W * 0.5, H2 + 0.04, 0.05]), 0.015, o.shutter ?? 0x2f4a5a, at(s * (W * 0.78 + 0.08), yy, 0.07), 0, { top: o.shutterL ?? 0x5a8a9a, tex: 'wood' }));
    }
    L.push(bbox(...(face ? [0.16, 0.07, W + 0.2] : [W + 0.2, 0.07, 0.16]), 0.02, TIMBER, at(0, yy - H2 / 2 - 0.05, 0.08), 0, { top: TIMBER_L, tex: 'woodH' }));
    L.push(bbox(...(face ? [0.12, 0.08, W + 0.2] : [W + 0.2, 0.08, 0.12]), 0.02, TIMBER, at(0, yy + H2 / 2 + 0.05, 0.06), 0, { top: TIMBER_L, tex: 'woodH' }));
    if (flowers) {
      L.push(bbox(...(face ? [0.2, 0.16, W + 0.1] : [W + 0.1, 0.16, 0.2]), 0.02, 0x5a3a22, at(0, yy - H2 / 2 - 0.16, 0.16), 0, { top: 0x8a6a40, tex: 'woodH' }));
      for (let i = 0; i < 7; i++) L.push(part(new THREE.IcosahedronGeometry(0.06 + R() * 0.03, 0), [0xd84a5a, 0xf0d070, 0xf4f0e0, 0x3a6a2a, 0x4a7a30][i % 5], at((i / 6 - 0.5) * W, yy - H2 / 2 - 0.05 + R() * 0.05, 0.16 + (R() - 0.5) * 0.08)));
    }
  };
  win(w * 0.2, d / 2, 0, true); win(w / 2, -d * 0.12, 1, false); if (w > 3) win(w / 2, d * 0.3, 1, true);
  // фонарь у двери (самосвечение; настоящий свет даёт зона)
  L.push(bbox(0.16, 0.22, 0.16, 0.02, 0x2a2a30, [dx + 0.48, y0 + 1.25, dz + 0.14], 0, { top: 0x5a5a64, tex: 'metal' }));
  L.push(part(new THREE.BoxGeometry(0.1, 0.14, 0.1), 0xffc070, [dx + 0.48, y0 + 1.25, dz + 0.2], 0, 1, { emit: true }));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(o)));
  return { root };
}
