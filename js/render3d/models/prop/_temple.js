// Разрушенный храм (портал с руками): светлый тёсаный камень, мох на сколах. Стены ставит слой окружения по тайлам 'D'
// (props.js, temple): глыба стены на тайл (вдоль x модели), опоры на стыках, арки над проёмами — объекты генератора (world/templegen.js).
// Это запасные процедурные модели: с «Новыми моделями» их заменяют модели пака «каменная» (templeglb.js).
const ST = 0xa0957c, STL = 0xd8ccae, JN = 0x6a604e, MOSS = 0x5e7034, MOSSL = 0x8aa04a;
const S = { top: STL, tex: 'stone' };

function wallTile(kit, def, H, seed, cornice) {
  const { THREE, part, merge, bbox, geo } = kit, R = geo.rng(seed), L = [];
  L.push(bbox(1.02, 0.22, 0.98, 0.04, JN, [0, 0.11, 0], 0, { top: ST, tex: 'stone' }));   // цоколь
  L.push(bbox(1.02, H - 0.22, 0.84, 0.05, ST, [0, 0.22 + (H - 0.22) / 2, 0], 0, { top: STL, y0: 0.22, y1: H, tex: 'stone' }));
  for (let y = 0.62; y < H - 0.2; y += 0.42) L.push(bbox(1.03, 0.035, 0.86, 0.01, JN, [0, y, 0]));   // швы кладки
  if (cornice) L.push(bbox(1.04, 0.16, 0.98, 0.04, ST, [0, H - 0.08, 0], 0, S));
  // обломанный верх: несколько камней разной высоты, мох на сколах
  for (let i = 0; i < 3; i++) { const w = 0.25 + R() * 0.3, h = 0.12 + R() * 0.32; L.push(bbox(w, h, 0.6 + R() * 0.2, 0.04, ST, [-0.36 + i * 0.36 + (R() - 0.5) * 0.1, H + h / 2 - 0.02, (R() - 0.5) * 0.12], [0, R() * 0.3, (R() - 0.5) * 0.12], S)); }
  for (let i = 0; i < 2; i++) L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(0.14 + R() * 0.08, 0), 0.05, R).scale(1.4, 0.4, 1.1).translate((R() - 0.5) * 0.7, H + 0.02, (R() - 0.5) * 0.4), MOSS, { top: MOSSL }));
  for (let i = 0; i < 2; i++) L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(0.1 + R() * 0.08, 0), 0.04, R).translate((R() - 0.5) * 0.9, 0.06, (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.15)), ST, S));   // осыпь у подножия
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
function pier(kit, def, H, seed, broken) {
  const { THREE, merge, bbox, geo } = kit, R = geo.rng(seed), L = [];
  L.push(bbox(1.08, 0.3, 1.08, 0.05, JN, [0, 0.15, 0], 0, { top: ST, tex: 'stone' }), bbox(0.96, H - 0.3, 0.96, 0.06, ST, [0, 0.3 + (H - 0.3) / 2, 0], 0, { top: STL, y0: 0.3, y1: H, tex: 'stone' }));
  for (let y = 0.75; y < H - 0.2; y += 0.5) L.push(bbox(0.98, 0.04, 0.98, 0.01, JN, [0, y, 0]));
  if (!broken) L.push(bbox(1.12, 0.18, 1.12, 0.05, ST, [0, H + 0.09, 0], 0, S), bbox(1.0, 0.14, 1.0, 0.04, JN, [0, H + 0.25, 0], 0, S));
  else for (let i = 0; i < 3; i++) L.push(bbox(0.3 + R() * 0.25, 0.15 + R() * 0.3, 0.3 + R() * 0.25, 0.04, ST, [(R() - 0.5) * 0.5, H + 0.1, (R() - 0.5) * 0.5], [0, R(), 0], S));
  L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(0.2, 0), 0.06, R).scale(1.6, 0.35, 1.3).translate(0.1, H + (broken ? 0.12 : 0.34), -0.1), MOSS, { top: MOSSL }));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
const base = { kind: 'prop', batch: true, outline: false, texWorld: true, rim: 0.15, ao: 0.55, aoH: 1.0 };
const box = (w, h) => function (kit) { return kit.part(new kit.THREE.BoxGeometry(w, h, 0.84), 0, [0, h / 2, 0]); };
export const tw_wall_a = { ...base, id: 'tw_wall_a', shadowProxy: box(1, 1.6), build(kit) { return wallTile(kit, this, 1.55, 11, false); } };
export const tw_wall_b = { ...base, id: 'tw_wall_b', shadowProxy: box(1, 2.4), build(kit) { return wallTile(kit, this, 2.35, 23, true); } };
export const tw_wall_c = { ...base, id: 'tw_wall_c', shadowProxy: box(1, 1.2), build(kit) { return wallTile(kit, this, 1.1, 37, false); } };
export const tw_wall_lo = { ...base, id: 'tw_wall_lo', build(kit) { return wallTile(kit, this, 0.62, 41, false); } };
export const tw_pier = { ...base, id: 'tw_pier', shadowProxy: box(1, 2.9), build(kit) { return pier(kit, this, 2.75, 5, false); } };
export const tw_pier_b = { ...base, id: 'tw_pier_b', shadowProxy: box(1, 1.9), build(kit) { return pier(kit, this, 1.8, 7, true); } };

// арка над проёмом в 4 м: две опоры на тайлах стены по бокам (±2,5 м) и пологий свод из клинчатых камней с замковым
export const tw_arch = { ...base, id: 'tw_arch', batch: false,
  build(kit) {
    const { THREE, merge, bbox, geo } = kit, R = geo.rng(51), L = [], PH = 2.9, RX = 2.0, RY = 1.15, T = 0.5;
    for (const sx of [-2.5, 2.5]) {
      L.push(bbox(1.1, 0.3, 1.0, 0.05, JN, [sx, 0.15, 0], 0, { top: ST, tex: 'stone' }), bbox(0.98, PH - 0.3, 0.9, 0.06, ST, [sx, 0.3 + (PH - 0.3) / 2, 0], 0, { top: STL, y0: 0.3, y1: PH, tex: 'stone' }));
      L.push(bbox(1.12, 0.2, 1.0, 0.05, ST, [sx, PH + 0.1, 0], 0, S));   // импост
      for (let y = 0.8; y < PH - 0.2; y += 0.55) L.push(bbox(1.0, 0.04, 0.92, 0.01, JN, [sx, y, 0]));
    }
    const N = 11;
    for (let i = 0; i < N; i++) {   // клинчатые камни по эллипсу от импоста до импоста
      const a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N, am = (a0 + a1) / 2;
      const px = -Math.cos(am) * (RX + T / 2), py = PH + 0.2 + Math.sin(am) * (RY + T / 2);
      const len = Math.hypot(Math.cos(a1) * RX - Math.cos(a0) * RX, Math.sin(a1) * RY - Math.sin(a0) * RY) + 0.06;
      const ang = Math.atan2(Math.sin(a1) * RY - Math.sin(a0) * RY, -(Math.cos(a1) * RX - Math.cos(a0) * RX));
      const key = i === Math.floor(N / 2);
      L.push(bbox(len, T + (key ? 0.22 : 0), 0.86 + (key ? 0.08 : 0), 0.04, key ? STL : ST, [px, py + (key ? 0.06 : 0), 0], [0, 0, ang], S));
    }
    L.push(bbox(6.1, 0.32, 0.9, 0.05, ST, [0, PH + 0.2 + RY + T + 0.12, 0], 0, S));   // карниз над сводом
    for (const sx of [-1.6, 1.6]) L.push(bbox(0.9, 0.6, 0.86, 0.04, ST, [sx, PH + 0.2 + RY * 0.55 + 0.35, 0], 0, S));   // кладка над пятами
    for (let i = 0; i < 4; i++) L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(0.18 + R() * 0.1, 0), 0.05, R).scale(1.5, 0.35, 1.2).translate(-2.6 + R() * 5.2, PH + 0.2 + RY + T + 0.3, (R() - 0.5) * 0.4), MOSS, { top: MOSSL }));
    for (let i = 0; i < 3; i++) L.push(geo.paint(geo.taperTube([[-2.9 + i * 0.25, PH + 1.6, 0.46], [-3.0 + i * 0.3, PH + 0.8, 0.5], [-2.95 + i * 0.2, PH - 0.3 - i * 0.4, 0.5]], 0.045, 0.02, 4), MOSS, { top: MOSSL }));   // свисающий плющ
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };

function column(kit, def, broken) {
  const { THREE, part, merge, bbox, geo } = kit, R = geo.rng(broken ? 63 : 61), L = [], H = broken ? 1.35 : 3.1;
  L.push(bbox(0.92, 0.3, 0.92, 0.05, JN, [0, 0.15, 0], 0, { top: ST, tex: 'stone' }), part(new THREE.CylinderGeometry(0.4, 0.42, 0.18, 14), ST, [0, 0.39, 0], 0, 1, S));
  L.push(part(new THREE.CylinderGeometry(0.29, 0.33, H - 0.48, 14), ST, [0, 0.48 + (H - 0.48) / 2, 0], 0, 1, { top: STL, y0: 0.48, y1: H, tex: 'stone' }));
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; L.push(part(new THREE.BoxGeometry(0.035, H - 0.6, 0.035), JN, [Math.cos(a) * 0.305, 0.48 + (H - 0.48) / 2, Math.sin(a) * 0.305])); }
  if (!broken) L.push(part(new THREE.CylinderGeometry(0.42, 0.3, 0.26, 14), ST, [0, H + 0.13, 0], 0, 1, S), bbox(0.96, 0.2, 0.96, 0.05, ST, [0, H + 0.36, 0], 0, S));
  else {   // слом: зубчатый верх, барабан колонны лежит рядом
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + R(); L.push(part(new THREE.ConeGeometry(0.12, 0.25 + R() * 0.2, 4), ST, [Math.cos(a) * 0.17, H + 0.08, Math.sin(a) * 0.17], 0, 1, S)); }
    L.push(part(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 14), ST, [0.75, 0.3, 0.45], [0.2, 0.6, Math.PI / 2], 1, S));
  }
  L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(0.16, 0), 0.05, R).scale(1.6, 0.35, 1.2).translate(0.05, broken ? H + 0.05 : H + 0.48, 0), MOSS, { top: MOSSL }));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
export const tw_column = { ...base, id: 'tw_column', shadowProxy(kit) { return kit.part(new kit.THREE.CylinderGeometry(0.32, 0.32, 3.4, 8), 0, [0, 1.7, 0]); }, build(kit) { return column(kit, this, false); } };
export const tw_column_b = { ...base, id: 'tw_column_b', build(kit) { return column(kit, this, true); } };
// упавший барабан колонны и осколки
export const tw_drum = { ...base, id: 'tw_drum',
  build(kit) {
    const { THREE, part, merge, geo } = kit, R = geo.rng(71), L = [part(new THREE.CylinderGeometry(0.34, 0.34, 1.0, 14), ST, [0, 0.34, 0], [0, 0, Math.PI / 2], 1, S)];
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; L.push(part(new THREE.BoxGeometry(0.98, 0.035, 0.035), JN, [0, 0.34 + Math.sin(a) * 0.335, Math.cos(a) * 0.335])); }
    for (let i = 0; i < 4; i++) { const r = 0.08 + R() * 0.1; L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(r, 0), r * 0.4, R).translate((R() - 0.5) * 1.6, r * 0.6, (R() - 0.5) * 1.2), ST, S)); }
    L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(0.15, 0), 0.05, R).scale(1.8, 0.35, 1.0).translate(0.1, 0.68, 0), MOSS, { top: MOSSL }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
// каменная чаша для омовений с тёмной водой
export const tw_basin = { ...base, id: 'tw_basin',
  build(kit) {
    const { THREE, part, merge, geo } = kit, L = [];
    L.push(geo.paint(geo.lathe([[0.5, 0], [0.55, 0.08], [0.32, 0.18], [0.24, 0.5], [0.3, 0.62], [0.78, 0.72], [0.86, 0.86], [0.8, 0.94], [0.66, 0.9]], 18), ST, S));
    L.push(part(new THREE.CylinderGeometry(0.68, 0.68, 0.02, 18), 0x24343a, [0, 0.86, 0], 0, 1, { top: 0x3a5a60 }));
    L.push(geo.paint(geo.jitter(new THREE.DodecahedronGeometry(0.14, 0), 0.05, geo.rng(77)).scale(1.6, 0.35, 1.2).translate(0.6, 0.93, 0.2), MOSS, { top: MOSSL }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
// пак «каменная»: святилище и обстановка по картинке храма из пака «каменная» (templeglb.js ставит модели пака; это — запасные, пока пак
// не загружен или выключены «Новые модели»): плоский круг с ветром в центре, алтарь, дуги стены кольцом, угол руин, лестница
const mk = (kit, def, L) => { const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(kit.merge(L), kit.propMat(def))); return { root }; };
export const tp_platform = { ...base, id: 'tp_platform', shadow: false,
  build(kit) { const { THREE, part } = kit; return mk(kit, this, [part(new THREE.CylinderGeometry(3.55, 3.6, 0.1, 32), ST, [0, 0.05, 0], 0, 1, S), part(new THREE.CylinderGeometry(2.6, 2.6, 0.03, 32), JN, [0, 0.11, 0], 0, 1, { top: STL })]); } };
export const tp_altar = { ...base, id: 'tp_altar',
  build(kit) { const { bbox } = kit; return mk(kit, this, [bbox(2.3, 0.25, 1.3, 0.05, JN, [0, 0.12, 0], 0, S), bbox(2.0, 0.75, 1.05, 0.05, ST, [0, 0.62, 0], 0, S), bbox(2.2, 0.16, 1.2, 0.04, ST, [0, 1.07, 0], 0, S)]); } };
export const tp_curve = { ...base, id: 'tp_curve',
  build(kit) { const { bbox } = kit, L = []; for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.22; L.push(bbox(0.9, 1.0, 0.45, 0.04, ST, [Math.sin(a) * 4, 0.5, Math.cos(a) * 4 - 3.7], [0, a, 0], S)); } for (const sx of [-1.9, 1.9]) L.push(bbox(0.55, 1.6, 0.55, 0.05, ST, [sx, 0.8, -0.2], 0, S)); return mk(kit, this, L); } };
export const tp_corner = { ...base, id: 'tp_corner',
  build(kit) { const { bbox } = kit; return mk(kit, this, [bbox(3.4, 2.0, 0.5, 0.05, ST, [0, 1.0, -0.85], 0, S), bbox(0.5, 1.6, 2.0, 0.05, ST, [-1.45, 0.8, 0], 0, S)]); } };
export const tp_stairs = { ...base, id: 'tp_stairs',
  build(kit) { const { bbox } = kit, L = []; for (let i = 0; i < 4; i++) L.push(bbox(0.55, 0.3 * (i + 1), 2.0, 0.04, ST, [-0.85 + i * 0.55, 0.15 * (i + 1), 0], 0, S)); return mk(kit, this, L); } };
export const TEMPLE_PROPS = [tw_wall_a, tw_wall_b, tw_wall_c, tw_wall_lo, tw_pier, tw_pier_b, tw_arch, tw_column, tw_column_b, tw_drum, tw_basin, tp_platform, tp_altar, tp_curve, tp_corner, tp_stairs];
