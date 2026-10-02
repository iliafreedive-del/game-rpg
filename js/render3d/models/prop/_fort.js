// Строения укреплённых лагерей походов: стена-звено, башня, ворота, длинный дом, шатёр. Две «руки»: 'ice' — Фьорды (серый камень,
// иней, синее дерево), 'wood' — Старый Лес (брёвна, шкуры, солома). Звено стены — 1 м вдоль X (batch), остальное — одиночные.
const PALS = {
  ice: { stone: 0x5a6578, stoneL: 0xa4b2c6, snow: 0xdce8f4, wood: 0x3a3a48, woodL: 0x7a8aa4, cloth: 0x2a4a6a, clothL: 0x7aa6d0, roof: 0x3a4a62, roofL: 0x8aa4c4, fire: 0x9ae0ff },
  wood: { stone: 0x5a5448, stoneL: 0x9a9078, snow: 0x7a9a4a, wood: 0x4a3220, woodL: 0x9a7040, cloth: 0x4a2a1a, clothL: 0xa0603a, roof: 0x6a5a30, roofL: 0xc0a860, fire: 0xffb060 },
};
export function wallSeg(kit, def, kind) {
  const { THREE, part, merge, bbox, geo } = kit, P = PALS[kind], L = [], R = geo.rng(kind === 'ice' ? 5 : 9);
  if (kind === 'ice') {
    L.push(bbox(1.04, 2.3, 0.95, 0.05, P.stone, [0, 1.15, 0], 0, { top: P.stoneL, tex: 'stone' }));
    L.push(bbox(1.12, 0.14, 1.05, 0.03, P.stone, [0, 2.36, 0], 0, { top: P.stoneL, tex: 'stone' }));
    for (const x of [-0.34, 0, 0.34]) L.push(bbox(0.26, 0.5, 0.5, 0.03, P.stone, [x, 2.68, 0.2], 0, { top: P.stoneL, tex: 'stone' }), part(new THREE.BoxGeometry(0.22, 0.05, 0.46), P.snow, [x, 2.95, 0.2]));
    L.push(bbox(1.02, 0.16, 0.3, 0.03, P.wood, [0, 2.5, -0.3], 0, { top: P.woodL, tex: 'wood' }));   // боевой ход
    for (const x of [-0.4, 0.4]) L.push(part(new THREE.BoxGeometry(0.12, 2.0, 0.06), P.wood, [x, 1.0, 0.5], 0, 1, { top: P.woodL, tex: 'wood' }));
    L.push(part(new THREE.BoxGeometry(1.0, 0.22, 0.6), P.snow, [0, 0.12, 0.38], 0, [1, 1, 1]));          // сугроб у основания
    for (let i = 0; i < 3; i++) L.push(part(new THREE.ConeGeometry(0.05, 0.3 + R() * 0.2, 4), P.fire, [-0.35 + i * 0.35, 2.28, 0.5], [Math.PI, 0, 0], 1, { top: 0xffffff, emit: true }));   // сосульки
  } else {
    for (let i = 0; i < 5; i++) { const x = -0.4 + i * 0.2, h = 2.9 + R() * 0.5; L.push(geo.paint(geo.warp(new THREE.CylinderGeometry(0.105, 0.115, h, 7).translate(x, h / 2, (R() - 0.5) * 0.08), 0.02, R() * 9), P.wood, { top: P.woodL, tex: 'bark' }), part(new THREE.ConeGeometry(0.105, 0.34, 7), P.wood, [x, h + 0.14, 0], 0, 1, { top: P.woodL, tex: 'wood' })); }
    for (const y of [0.7, 1.9]) L.push(bbox(1.06, 0.12, 0.2, 0.03, P.wood, [0, y, 0.15], 0, { top: P.woodL, tex: 'woodH' }));
    L.push(part(new THREE.CylinderGeometry(0.03, 0.03, 1.08, 5), 0xc8b88a, [0, 1.3, 0.26], [0, 0, Math.PI / 2], 1, { top: 0xe8dcb0, tex: 'cloth' }));
    L.push(part(new THREE.SphereGeometry(0.1, 7, 5), 0xe4d8ba, [0.2, 2.5, 0.2], 0, [1, 1.1, 1], { top: 0xfff6e2 }));   // череп-оберег
  }
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
export function tower(kit, def, kind) {
  const { THREE, part, merge, bbox, lathe, tube } = kit, P = PALS[kind], L = [];
  if (kind === 'ice') {
    L.push(lathe([[1.35, 0], [1.28, 2.6], [1.18, 4.0], [1.3, 4.1], [1.3, 4.5]], P.stone, [0, 0, 0], 0, 1, { top: P.stoneL, tex: 'stone' }, 12));
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; L.push(bbox(0.5, 0.5, 0.4, 0.04, P.stone, [Math.cos(a) * 1.3, 4.75, Math.sin(a) * 1.3], [0, -a + Math.PI / 2, 0], { top: P.stoneL, tex: 'stone' }), part(new THREE.BoxGeometry(0.4, 0.05, 0.36), P.snow, [Math.cos(a) * 1.3, 5.03, Math.sin(a) * 1.3], [0, -a + Math.PI / 2, 0])); }
    L.push(lathe([[0.0, 4.5], [0.9, 4.55], [1.0, 4.4], [0.0, 4.4]], P.wood, [0, 0, 0], 0, 1, { top: P.woodL, tex: 'wood' }, 12));
    L.push(lathe([[1.0, 4.9], [0.85, 5.6], [0.4, 6.8], [0.0, 7.6]], P.roof, [0, 0, 0], 0, 1, { top: P.roofL, tex: 'tile' }, 10));
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; L.push(part(new THREE.ConeGeometry(0.06, 0.4, 4), P.fire, [Math.cos(a) * 0.6, 4.6, Math.sin(a) * 0.6], [Math.PI, 0, 0], 1, { top: 0xffffff, emit: true })); }
    L.push(part(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5), P.wood, [0, 8.0, 0]), bbox(0.6, 0.4, 0.04, 0.01, P.cloth, [0.32, 8.2, 0], 0, { top: P.clothL, tex: 'cloth' }));
    for (const [x, z] of [[0.0, 1.3], [1.3, 0]]) L.push(part(new THREE.BoxGeometry(0.2, 0.7, 0.1), 0x0b0a12, [x, 3.0, z], [0, x ? Math.PI / 2 : 0, 0]));
  } else {
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.push(tube([[x, 0, z], [x * 0.92, 3, z * 0.92], [x * 0.85, 5.2, z * 0.85]], 0.17, 0.12, P.wood, { top: P.woodL, tex: 'bark' }, 7));
    for (const y of [1.4, 3.2]) { L.push(bbox(2.1, 0.12, 0.12, 0.02, P.wood, [0, y, -1], 0, { top: P.woodL, tex: 'wood' }), bbox(2.1, 0.12, 0.12, 0.02, P.wood, [0, y, 1]), bbox(0.12, 0.12, 2.1, 0.02, P.wood, [-1, y, 0]), bbox(0.12, 0.12, 2.1, 0.02, P.wood, [1, y, 0])); }
    L.push(bbox(2.5, 0.2, 2.5, 0.04, P.wood, [0, 5.0, 0], 0, { top: P.woodL, tex: 'woodH' }));
    for (const [x, z, r] of [[0, -1.2, 0], [0, 1.2, 0], [-1.2, 0, 1.57], [1.2, 0, 1.57]]) L.push(bbox(2.5, 0.9, 0.1, 0.02, P.wood, [x, 5.55, z], [0, r, 0], { top: P.woodL, tex: 'wood' }));
    L.push(lathe([[1.9, 6.0], [1.2, 6.6], [0.5, 7.4], [0.0, 8.2]], P.roof, [0, 0, 0], 0, [1, 1, 1], { top: P.roofL, tex: 'thatch' }, 8));
    L.push(bbox(0.12, 3.2, 0.12, 0.02, P.wood, [1.3, 1.6, 1.0], [0, 0, 0.2], { top: P.woodL }));   // лестница
    for (let i = 0; i < 9; i++) L.push(bbox(0.5, 0.06, 0.1, 0.01, P.wood, [1.25 - 0.015 * i, 0.3 + i * 0.35, 1.0], 0, { top: P.woodL }));
    L.push(part(new THREE.SphereGeometry(0.16, 7, 5), 0xe4d8ba, [-1.0, 5.75, 1.15], 0, [1, 1.1, 1], { top: 0xfff6e2 }));
  }
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
export function gate(kit, def, kind) {   // арка ворот поперёк X: два столба-башенки, балка с черепами и знамёнами
  const { THREE, part, merge, bbox, lathe } = kit, P = PALS[kind], L = [];
  for (const x of [-1.9, 1.9]) {
    if (kind === 'ice') L.push(lathe([[0.62, 0], [0.56, 3.6], [0.7, 3.7], [0.7, 4.0]], P.stone, [x, 0, 0], 0, 1, { top: P.stoneL, tex: 'stone' }, 10), part(new THREE.ConeGeometry(0.85, 1.4, 8), P.roof, [x, 4.7, 0], 0, 1, { top: P.roofL, tex: 'tile' }));
    else L.push(part(new THREE.CylinderGeometry(0.3, 0.34, 4.2, 8), P.wood, [x, 2.1, 0], 0, 1, { top: P.woodL, tex: 'bark' }), part(new THREE.ConeGeometry(0.34, 0.6, 8), P.wood, [x, 4.5, 0]));
  }
  L.push(bbox(4.5, 0.5, 0.5, 0.05, P.wood, [0, 3.5, 0], 0, { top: P.woodL, tex: 'woodH' }), bbox(3.8, 0.18, 0.18, 0.03, P.wood, [0, 2.9, 0.1], 0, { top: P.woodL, tex: 'wood' }));
  for (const x of [-1.3, -0.45, 0.45, 1.3]) L.push(part(new THREE.SphereGeometry(0.17, 7, 6), 0xe4d8ba, [x, 3.5, 0.3], 0, [1, 1.1, 1], { top: 0xfff6e2 }));
  for (const x of [-1.0, 1.0]) L.push(bbox(0.55, 1.3, 0.04, 0.01, P.cloth, [x, 2.2, 0.28], 0, { top: P.clothL, tex: 'cloth' }));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
export function hall(kit, def, kind) {   // длинный дом: 7×3.6 м, крутая двускатная крыша; у фьордов — драконьи головы на коньке
  const { THREE, part, merge, bbox, geo, tube } = kit, P = PALS[kind], L = [];
  L.push(bbox(7.0, 2.1, 3.4, 0.08, P.wood, [0, 1.05, 0], 0, { top: P.woodL, tex: 'woodH' }), bbox(7.2, 0.5, 3.6, 0.05, P.stone, [0, 0.25, 0], 0, { top: P.stoneL, tex: 'stone' }));
  for (let i = 0; i < 7; i++) L.push(bbox(0.18, 2.1, 0.12, 0.02, P.wood, [-3.0 + i, 1.05, 1.74], 0, { top: P.woodL, tex: 'wood' }));
  const sh = new THREE.Shape(); sh.moveTo(-2.05, 0); sh.lineTo(0, 2.2); sh.lineTo(2.05, 0); sh.closePath();
  const rg = new THREE.ExtrudeGeometry(sh, { depth: 7.6, bevelEnabled: false }).translate(0, 0, -3.8).rotateY(Math.PI / 2).translate(0, 2.05, 0);
  L.push(geo.paint(rg, P.roof, { top: P.roofL, tex: kind === 'ice' ? 'tile' : 'thatch' }));
  if (kind === 'ice') L.push(part(new THREE.BoxGeometry(7.4, 0.12, 0.9), P.snow, [0, 4.15, 0], 0, 1));
  for (const x of [-3.8, 3.8]) L.push(tube([[x, 4.2, 0], [x * 1.04, 4.8, 0], [x * 1.0, 5.2, 0], [x * 0.96, 5.35, 0]], 0.1, 0.03, P.wood, { top: P.woodL, tex: 'wood' }, 6), part(new THREE.SphereGeometry(0.14, 6, 5), 0xe4d8ba, [x * 0.96, 5.4, 0.08], 0, [1, 1, 1.4], { top: 0xfff6e2 }));
  L.push(bbox(1.2, 1.7, 0.1, 0.03, 0x1a1008, [0, 0.9, 1.78], 0, { top: 0x3a2a1a, tex: 'wood' }), part(new THREE.BoxGeometry(0.5, 0.3, 0.05), P.fire, [-2.2, 1.3, 1.78], 0, 1, { top: 0xffffff, emit: true }), part(new THREE.BoxGeometry(0.5, 0.3, 0.05), P.fire, [2.2, 1.3, 1.78], 0, 1, { top: 0xffffff, emit: true }));
  for (const x of [-1.6, 1.6]) L.push(bbox(0.5, 1.2, 0.04, 0.01, P.cloth, [x, 1.4, 1.82], 0, { top: P.clothL, tex: 'cloth' }));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
export function tent(kit, def, kind) {
  const { THREE, part, merge, bbox, lathe, tube } = kit, P = PALS[kind], L = [];
  L.push(lathe([[2.0, 0], [1.9, 0.9], [1.0, 2.2], [0.12, 3.2]], P.cloth, [0, 0, 0], 0, [1.15, 1, 1], { top: P.clothL, tex: 'cloth' }, 8));
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.4; L.push(tube([[Math.cos(a) * 1.9 * 1.15, 0, Math.sin(a) * 1.9], [Math.cos(a) * 1.0 * 1.15, 2.2, Math.sin(a) * 1.0], [0, 3.25, 0]], 0.05, 0.03, P.wood, { top: P.woodL, tex: 'wood' }, 5)); }
  L.push(part(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5), P.wood, [0, 3.6, 0]), bbox(0.5, 0.3, 0.03, 0.01, P.clothL, [0.28, 3.85, 0], 0, { tex: 'cloth' }));
  L.push(part(new THREE.ConeGeometry(0.6, 1.4, 4), 0x0b0a12, [0, 0.7, 1.55], [0, 0.785, 0], [1, 1, 0.3]));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}

export function door(kit, def, kind) {   // створки ворот между столбами арки: доски в железных полосах, засов и кольца; проём ≈ 3 м
  const { THREE, part, merge, bbox } = kit, P = PALS[kind], L = [];
  for (const sx of [-1, 1]) {
    L.push(bbox(1.46, 3.0, 0.22, 0.04, P.wood, [sx * 0.75, 1.5, 0], 0, { top: P.woodL, tex: 'woodH' }));
    for (const y of [0.5, 1.5, 2.5]) L.push(bbox(1.42, 0.16, 0.26, 0.02, 0x2a2a30, [sx * 0.75, y, 0], 0, { top: 0x6a6a74, tex: 'iron' }));
    L.push(part(new THREE.TorusGeometry(0.14, 0.03, 5, 10), 0x3a3a40, [sx * 0.22, 1.5, 0.15], 0, 1, { top: 0x8a8a94 }));
  }
  L.push(bbox(2.9, 0.16, 0.14, 0.02, 0x2a2a30, [0, 1.15, 0.2], 0, { top: 0x6a6a74, tex: 'iron' }));   // засов
  for (const y of [0.9, 2.2]) L.push(part(new THREE.SphereGeometry(0.1, 6, 5), 0xe4d8ba, [0, y, 0.14], 0, [1, 1.1, 1], { top: 0xfff6e2 }));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
