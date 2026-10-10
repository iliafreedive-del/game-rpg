// Сборка 47: массивная двустворчатая дубовая дверь на весь проход — к Хранителю амулета и к боссу (арка полукругом),
// в Цитадели — та же дверь с прямым верхом (square). Кованые железные полосы с заклёпками и завитками, железные кольца-ручки на накладках.
// Ширина — по числу клеток прохода (opts.span, по умолчанию 2). Открытая — створки распахиваются на петлях внутрь (~0,9 с).
// Плоскость двери вдоль X, лицом к +Z (как _door.js); поворот поперёк коридора задаёт слой окружения по флагу flip.
export function doorArch(kit, def, { open = false, span = 2, square = false } = {}) {
  const { THREE, part, merge, bbox } = kit, ST = 0x3a362e, STL = 0x9a8e74, S = { top: STL, tex: 'stone', texWorld: true };
  const HW = span / 2 - 0.02, RV = square ? 0 : Math.min(HW, 1.0), TOP = square ? 2.75 : 2.75 * 1.4, SPR = TOP - RV;   // полуширина проёма; полуось арки по высоте; пята арки (сборка 57: арка к Хранителю и боссу на 40 % выше — «мелковата дверь», выше стены 3 м)
  const IRON = { top: 0x5a5a64, tex: 'iron' }, IRONC = 0x1e1e24, WOOD = 0x4e2c16, WOODL = 0x86562e, mat = kit.propMat(def);
  // каменный портал: столбы и арка из клиньев (или прямая перемычка в Цитадели)
  const F = [];
  for (const s of [-1, 1]) F.push(bbox(0.36, SPR + 0.1, 1.1, 0.05, ST, [s * (HW + 0.18), (SPR + 0.1) / 2, 0], 0, S), bbox(0.46, 0.22, 1.16, 0.04, 0x302c26, [s * (HW + 0.18), 0.11, 0], 0, S));
  if (square) { F.push(bbox(HW * 2 + 0.8, 0.42, 1.16, 0.05, ST, [0, TOP + 0.2, 0], 0, S), bbox(0.5, 0.48, 1.2, 0.05, 0x4a443a, [0, TOP + 0.22, 0], 0, S)); }
  else {
    const N = 11;
    for (let i = 0; i < N; i++) { const a = Math.PI * (i + 0.5) / N, x = Math.cos(a) * (HW + 0.18), y = SPR + Math.sin(a) * (RV + 0.18), t = Math.atan2(Math.cos(a) * (RV + 0.18), -Math.sin(a) * (HW + 0.18));
      F.push(bbox(0.36 * Math.max(1, HW / RV * 0.8), 0.32, 1.1, 0.04, i === (N >> 1) ? 0x4a443a : ST, [x, y, 0], [0, 0, t], S)); }
    F.push(bbox(0.44, 0.38, 1.16, 0.05, 0x4a443a, [0, SPR + RV + 0.2, 0], 0, S));   // замковый камень
  }
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(F), mat));
  const topAt = x => square ? TOP - 0.02 : SPR + RV * Math.sqrt(Math.max(0, 1 - (x / HW) ** 2)) - 0.02;   // верх створки над x
  // створка: толстые доски, кованые полосы с заклёпками и завитком у петли, железное кольцо на накладке; s = −1 левая, +1 правая
  const leaf = s => {
    const sh = new THREE.Shape(), xh = s * HW;   // xh — петля, 0 — стык створок
    sh.moveTo(xh, 0); sh.lineTo(0, 0); sh.lineTo(0, topAt(0));
    for (let i = 1; i <= 14; i++) { const x = s * HW * i / 14; sh.lineTo(x, topAt(x)); }
    sh.lineTo(xh, 0);
    const L = [part(new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: false, curveSegments: 4 }), WOOD, [0, 0, -0.08], 0, 1, { top: WOODL, tex: 'wood' })];
    const nb = Math.max(3, Math.round(HW / 0.24));
    for (let k = 1; k < nb; k++) { const x = s * HW * k / nb, top = topAt(x) - 0.06; L.push(bbox(0.03, top, 0.02, 0.005, 0x241408, [x, top / 2, 0.085], 0, {})); }   // щели между досками
    const bands = square ? [0.32, 1.25, 2.2] : [0.32, 1.55, 2.75];
    for (const y of bands) {
      L.push(bbox(HW - 0.02, 0.15, 0.04, 0.012, IRONC, [s * HW / 2, y, 0.1], 0, IRON));   // кованая полоса
      for (let k = 0; k < 5; k++) L.push(part(new THREE.SphereGeometry(0.034, 6, 4), 0x8a8a94, [s * (0.08 + k * (HW - 0.16) / 4), y, 0.13], 0, 1, IRON));
      L.push(part(new THREE.TorusGeometry(0.1, 0.025, 4, 10, Math.PI * 1.3), IRONC, [s * 0.18, y, 0.11], [0, 0, s > 0 ? 0.4 : Math.PI - 0.4], 1, IRON));   // завиток у стыка
      L.push(part(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 8), IRONC, [xh - s * 0.07, y, 0.1], [Math.PI / 2, 0, 0], 1, IRON));   // петля
    }
    if (!square) L.push(bbox(0.06, topAt(s * HW * 0.5) - 0.3, 0.04, 0.01, IRONC, [s * HW * 0.5, (topAt(s * HW * 0.5) - 0.3) / 2 + 0.15, 0.1], 0, IRON));   // вертикальная полоса
    // кольцо-ручка на квадратной накладке, с обеих сторон створки
    for (const z of [1, -1]) L.push(bbox(0.22, 0.22, 0.03, 0.01, IRONC, [s * 0.2, 1.3, z * 0.1], 0, IRON), part(new THREE.SphereGeometry(0.05, 6, 4), 0x6a6a74, [s * 0.2, 1.33, z * 0.13], 0, 1, IRON), part(new THREE.TorusGeometry(0.13, 0.026, 6, 14), IRONC, [s * 0.2, 1.2, z * 0.14], 0, 1, IRON));
    for (const g of L) g.translate(-xh, 0, 0);   // точка вращения — петля
    const piv = new THREE.Group(); piv.position.set(xh, 0, 0); piv.add(new THREE.Mesh(merge(L), mat)); root.add(piv);
    return piv;
  };
  const leaves = [leaf(-1), leaf(1)], OPEN = 1.2;   // правки 2 (П50): створки открываются на 80 % (было 1,5 рад — почти настежь)
  if (!open) return { root };
  // открытая: распахивается при появлении (дверь только что отперли); при повторном заходе в зону — та же короткая анимация
  let t0 = null;
  const set = k => { leaves[0].rotation.y = -OPEN * k; leaves[1].rotation.y = OPEN * k; };
  set(0);
  return { root, update(t) { if (t0 === null) t0 = t; const k = Math.min(1, (t - t0) / 0.9); set(1 - (1 - k) * (1 - k) * (1 - k)); } };
}
