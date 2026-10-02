// Стена подземелья на один тайл (1×1 м): кладка с фасками, тёмная «крышка» сверху (за стеной — пустота), цоколь и карниз
// на лицевой стороне (+z — к полу), выступающие камни. Фактура в мировых координатах (texWorld) — кладка не повторяется.
// kind: 'hi' — дальняя стена в полный рост, 'lo' — ближняя, обрезанная (не закрывает пол), 'buttress' — с пилястрой,
// 'niche' — с нишей-оссуарием (черепа и свеча), 'secret' — секретная стена (светлее, с трещиной).
export function dwall(kit, def, kind = 'hi') {
  const { THREE, PAL, part, merge, bbox, geo } = kit;
  const R = geo.rng(kind.length * 7 + 3), L = [];
  const ST = 0x3a362e, STL = 0x8e8268, DK = 0x14120f, H = kind === 'lo' ? 0.75 : 3.0;
  const S = (c = ST, t = STL) => ({ top: t, tex: 'stone' });
  L.push(bbox(1.02, H, 1.02, 0.05, ST, [0, H / 2, 0], 0, { top: kind === 'secret' ? 0xa89c80 : STL, y0: 0, y1: H, tex: 'stone' }));
  L.push(bbox(1.04, 0.12, 1.04, 0.03, DK, [0, H + 0.06, 0], 0, { top: 0x2a2620 }));
  L.push(bbox(1.04, 0.3, 0.16, 0.04, 0x302c26, [0, 0.15, 0.5], 0, S(0x302c26, 0x6a6050)));
  if (kind !== 'lo') {
    L.push(bbox(1.04, 0.14, 0.18, 0.04, 0x302c26, [0, H - 0.45, 0.5], 0, S()));
    for (let i = 0; i < 3; i++) L.push(bbox(0.25 + R() * 0.2, 0.18 + R() * 0.1, 0.1, 0.03, ST, [(R() - 0.5) * 0.7, 0.6 + R() * (H - 1.4), 0.53], 0, S()));
  } else {
    for (let i = 0; i < 4; i++) L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(0.16 + R() * 0.1, 0), 0.05, R).translate((R() - 0.5) * 0.8, H + 0.05, (R() - 0.5) * 0.6), ST, S()));
  }
  if (kind === 'buttress') {
    L.push(bbox(0.4, H, 0.3, 0.05, ST, [0, H / 2, 0.62], 0, S()));
    L.push(bbox(0.52, 0.22, 0.42, 0.05, 0x302c26, [0, H - 0.3, 0.64], 0, S()), bbox(0.52, 0.3, 0.42, 0.05, 0x302c26, [0, 0.15, 0.64], 0, S()));
  }
  if (kind === 'niche') {
    L.push(bbox(0.56, 0.9, 0.06, 0.02, 0x0c0a08, [0, 1.35, 0.5]));
    L.push(bbox(0.68, 0.12, 0.2, 0.03, 0x302c26, [0, 0.85, 0.55], 0, S()), bbox(0.68, 0.12, 0.2, 0.03, 0x302c26, [0, 1.86, 0.55], 0, S()));
    for (const x of [-0.15, 0.12]) L.push(part(new THREE.SphereGeometry(0.1, 8, 6), PAL.boneD, [x, 1.0, 0.52], 0, [1, 0.9, 1.05], { top: PAL.bone }), part(new THREE.BoxGeometry(0.03, 0.03, 0.02), 0x0c0a08, [x - 0.03, 1.0, 0.62]), part(new THREE.BoxGeometry(0.03, 0.03, 0.02), 0x0c0a08, [x + 0.03, 1.0, 0.62]));
    L.push(part(new THREE.CylinderGeometry(0.03, 0.035, 0.18, 6), 0xe8dcc0, [0.0, 1.47, 0.53]), part(new THREE.ConeGeometry(0.025, 0.07, 5), 0xffc070, [0.0, 1.6, 0.53], 0, 1, { emit: true }));
  }
  if (kind === 'secret') L.push(geo.paint(geo.taperTube([[-0.3, 0.3, 0.52], [-0.1, 0.9, 0.53], [0.15, 1.4, 0.52], [0.05, 2.1, 0.53]], 0.025, 0.012, 4), 0x0c0a08, {}));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
