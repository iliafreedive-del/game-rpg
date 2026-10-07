// Сборка 47: дверь к Хранителю амулета — двустворчатая дубовая дверь с полукруглой аркой, железными полосами и заклёпками,
// в каменном портале на весь проход (2 клетки). Открытая — створки распахиваются на петлях внутрь (анимация ~0,9 с).
// Плоскость двери вдоль X, лицом к +Z (как _door.js); поворот поперёк коридора задаёт слой окружения по флагу flip.
export function doorArch(kit, def, { open = false } = {}) {
  const { THREE, PAL, part, merge, bbox } = kit, ST = 0x3a362e, STL = 0x9a8e74, S = { top: STL, tex: 'stone', texWorld: true };
  const HW = 0.98, SPR = 1.7, R = HW;   // верх арки ≈2,7 м — ниже стены подземелья (3 м)   // полуширина проёма, высота пяты арки, радиус арки
  const IRON = { top: 0x6a6a74, tex: 'iron' }, WOOD = 0x5a341a, WOODL = 0x8a5a34, mat = kit.propMat(def);
  // каменный портал: столбы, арка из клиньев, замковый камень
  const F = [];
  for (const s of [-1, 1]) F.push(bbox(0.34, SPR + 0.1, 1.1, 0.05, ST, [s * (HW + 0.17), (SPR + 0.1) / 2, 0], 0, S), bbox(0.44, 0.22, 1.16, 0.04, 0x302c26, [s * (HW + 0.17), 0.11, 0], 0, S));
  const N = 9;
  for (let i = 0; i < N; i++) { const a = Math.PI * (i + 0.5) / N; F.push(bbox(0.36, 0.3, 1.1, 0.04, i === (N >> 1) ? 0x4a443a : ST, [Math.cos(a) * (R + 0.17), SPR + Math.sin(a) * (R + 0.17), 0], [0, 0, a - Math.PI / 2], S)); }
  F.push(bbox(0.42, 0.36, 1.16, 0.05, 0x4a443a, [0, SPR + R + 0.2, 0], 0, S));   // замковый камень
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(F), mat));
  // створка: доски, полукруглый верх, три железные полосы с заклёпками, кольцо; s = −1 левая, +1 правая; петля — у столба
  const leaf = s => {
    const sh = new THREE.Shape(), xh = s * HW;   // xh — петля, 0 — стык створок
    sh.moveTo(xh, 0); sh.lineTo(0, 0); sh.lineTo(0, SPR + R - 0.02);
    for (let i = 1; i <= 12; i++) { const a = Math.PI / 2 - (Math.PI / 2) * i / 12; sh.lineTo(s * Math.cos(a) * (R - 0.02), SPR + Math.sin(a) * (R - 0.02)); }
    sh.lineTo(xh, 0);
    const L = [part(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false, curveSegments: 4 }), WOOD, [0, 0, -0.06], 0, 1, { top: WOODL, tex: 'wood' })];
    for (let k = 1; k < 4; k++) { const x = s * HW * k / 4, top = SPR + Math.sqrt(Math.max(0, R * R - x * x)) - 0.08; L.push(bbox(0.025, top, 0.02, 0.005, 0x2a180c, [x, top / 2, 0.065], 0, {})); }   // щели между досками
    for (const y of [0.35, 1.05, 1.75]) {
      L.push(bbox(HW - 0.04, 0.11, 0.035, 0.01, 0x24242a, [s * HW / 2, y, 0.075], 0, IRON));
      for (let k = 0; k < 4; k++) L.push(part(new THREE.SphereGeometry(0.028, 6, 4), 0x8a8a94, [s * (0.1 + k * (HW - 0.2) / 3), y, 0.1], 0, 1, IRON));
      L.push(part(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 8), 0x24242a, [xh - s * 0.06, y, 0.08], [Math.PI / 2, 0, 0], 1, IRON));   // петля
    }
    L.push(part(new THREE.TorusGeometry(0.09, 0.018, 4, 12), PAL.brass, [s * 0.16, 1.05, 0.11]), part(new THREE.SphereGeometry(0.04, 6, 4), PAL.brass, [s * 0.16, 1.15, 0.1]));
    for (const g of L) g.translate(-xh, 0, 0);   // точка вращения — петля
    const piv = new THREE.Group(); piv.position.set(xh, 0, 0); piv.add(new THREE.Mesh(merge(L), mat)); root.add(piv);
    return piv;
  };
  const leaves = [leaf(-1), leaf(1)], OPEN = 1.5;
  if (!open) return { root };
  // открытая: распахивается при появлении (дверь только что отперли); при повторном заходе в зону — та же короткая анимация
  let t0 = null;
  const set = k => { leaves[0].rotation.y = -OPEN * k; leaves[1].rotation.y = OPEN * k; };
  set(0);
  return { root, update(t) { if (t0 === null) t0 = t; const k = Math.min(1, (t - t0) / 0.9); set(1 - (1 - k) * (1 - k) * (1 - k)); } };
}
