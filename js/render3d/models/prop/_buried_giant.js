// Великан, почти ушедший в землю (картинка пользователя 13 октября, скил img2threejs): череп лицом вперёд с трещинами,
// грудная клетка дугами над холмом, бедренная кость в траве, пара валунов. Декор Старого Леса (wildgen.js, по одному на поле).
// Всё гладкое: каждая кость — своя сетка с общими вершинами (нормали сглажены), только потом красится и сливается
// в один batch-меш. Земля — пологий холм-наст, который закрывает основания костей. Модель смотрит в +Z, длина ~11 м.

// сетка с общими вершинами → покраска по функции точки (цвет, фактура) → копия без индексов для merge
function colorize(kit, g, fn, tex = 'bone') {
  const { THREE, geo } = kit;
  if (!g.attributes.normal) g.computeVertexNormals();
  const o = g.index ? g.toNonIndexed() : g; o.deleteAttribute('uv');
  const P = o.attributes.position, n = P.count, col = new Float32Array(n * 4), T = new Float32Array(n), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const r = fn(P.getX(i), P.getY(i), P.getZ(i)); c.set(r.c);
    col[i * 4] = c.r; col[i * 4 + 1] = c.g; col[i * 4 + 2] = c.b; col[i * 4 + 3] = 1;
    T[i] = geo.TEX_ID[r.t ?? tex] || 0;
  }
  o.setAttribute('color', new THREE.BufferAttribute(col, 4));
  o.setAttribute('aTex', new THREE.BufferAttribute(T, 1));
  return o;
}
const BONE = 0xe4ddca, BONE_D = 0xb3a993, BONE_S = 0x6e6250, HOLE = 0x1c140e, CRACK = 0x3a2e22, DIRT = 0x4a3a28;
const mix = (a, b, t, kit) => new kit.THREE.Color(a).lerp(new kit.THREE.Color(b), Math.max(0, Math.min(1, t))).getHex();
const gauss = (d, r) => Math.exp(-(d * d) / (r * r));
// кость у земли грязнее: снизу — землистая, выше — светлая
const boneCol = (kit, y, k = 0) => mix(mix(BONE_S, BONE_D, (y + 0.1) / 0.5, kit), BONE, (y - 0.4) / 1.4 - k, kit);

// гладкая трубка по сплайну: радиус r(t) и сплющивание flat (ребро — овал в сечении), концы скруглены
function boneTube(kit, pts, r, { radial = 10, segs = 24, flat = 1, cap = true } = {}) {
  const { THREE } = kit, curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const fr = curve.computeFrenetFrames(segs, false), P = [], I = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, c = curve.getPointAt(t), rr = r(t), N = fr.normals[i], B = fr.binormals[i];
    for (let k = 0; k < radial; k++) { const a = k / radial * Math.PI * 2; P.push(c.x + (N.x * Math.cos(a) * flat + B.x * Math.sin(a)) * rr, c.y + (N.y * Math.cos(a) * flat + B.y * Math.sin(a)) * rr, c.z + (N.z * Math.cos(a) * flat + B.z * Math.sin(a)) * rr); }
  }
  for (let i = 0; i < segs; i++) for (let k = 0; k < radial; k++) { const a = i * radial + k, b = i * radial + (k + 1) % radial, c = a + radial, d = b + radial; I.push(a, b, c, b, d, c); }
  if (cap) for (const [i, s] of [[0, -1], [segs, 1]]) {   // скруглённый торец: вершина-купол чуть дальше конца
    const t = i / segs, c = curve.getPointAt(t), d = curve.getTangentAt(t).multiplyScalar(s * r(t) * 0.7), tip = P.length / 3;
    P.push(c.x + d.x, c.y + d.y, c.z + d.z);
    for (let k = 0; k < radial; k++) { const a = i * radial + k, b = i * radial + (k + 1) % radial; s > 0 ? I.push(a, b, tip) : I.push(b, a, tip); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  return g;
}

// ---------- череп: деформированная сфера (глазницы, нос, скулы, надбровье, морда), трещины по своду ----------
function skull(kit, L) {
  const { THREE } = kit, g = new THREE.SphereGeometry(1, 40, 28), p = g.attributes.position, v = new THREE.Vector3();
  const EYES = [[-0.38, 0.04, 0.84], [0.38, 0.04, 0.84]], NOSE = [0, -0.32, 0.93];
  // трещины по своду: ломаные на единичной сфере (направления), ширина ~0.035
  const CR = [[[-0.1, 0.99, 0.1], [-0.25, 0.9, 0.36], [-0.2, 0.75, 0.62], [-0.32, 0.55, 0.77]], [[-0.25, 0.9, 0.36], [-0.55, 0.78, 0.3], [-0.78, 0.55, 0.3]], [[0.2, 0.95, -0.25], [0.45, 0.8, -0.4], [0.5, 0.55, -0.66]]]
    .map(l => l.map(q => new THREE.Vector3(...q).normalize()));
  const segD = (u, a, b) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, u.clone().sub(a).dot(ab) / ab.lengthSq())); return u.distanceTo(a.clone().addScaledVector(ab, t)); };
  const crackD = u => Math.min(...CR.flatMap(l => l.slice(1).map((b, i) => segD(u, l[i], b))));
  const dark = new Float32Array(p.count), crk = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const u = v.clone();
    let x = v.x * 0.84, y = v.y * 0.8, z = v.z * 1.02;
    if (z > 0.15 && y < 0.1) { const k = Math.min(1, (z - 0.15) / 0.7) * Math.min(1, (0.1 - y) / 0.6); x *= 1 - 0.3 * k; z += 0.1 * k; }   // морда уже и вперёд
    let push = 0;
    for (const e of EYES) { const d = Math.hypot(u.x - e[0], (u.y - e[1]) * 1.1, u.z - e[2]); push += 0.55 * gauss(d, 0.27) - 0.05 * gauss(d - 0.33, 0.07); dark[i] = Math.max(dark[i], gauss(d, 0.24)); }   // глазницы с ободом
    { const d = Math.hypot((u.x - NOSE[0]) * (1.6 + Math.max(0, u.y - NOSE[1]) * 4), u.y - NOSE[1], u.z - NOSE[2]); push += 0.26 * gauss(d, 0.17); dark[i] = Math.max(dark[i], gauss(d, 0.15)); }   // носовая впадина
    push -= 0.07 * gauss(Math.hypot(Math.abs(u.x) - 0.38, u.y - 0.28, u.z - 0.86), 0.2);   // надбровье
    push -= 0.08 * gauss(Math.hypot(Math.abs(u.x) - 0.62, u.y + 0.28, u.z - 0.62), 0.2);   // скулы
    push += 0.06 * gauss(Math.hypot(Math.abs(u.x) - 0.9, u.y + 0.05, u.z - 0.05), 0.3);   // височные ямки
    const cd = crackD(u); crk[i] = gauss(cd, 0.045); push += 0.025 * crk[i];
    const s = 1 - push; p.setXYZ(i, x * s, y * s, z * s);
  }
  g.computeVertexNormals();
  // в мире: размер, наклон (повёрнут к камере и чуть набок), посадка — нижняя треть в земле
  g.scale(2.0, 2.0, 2.0); g.rotateX(-0.12); g.rotateZ(-0.1); g.rotateY(0.4); g.translate(-4.0, 1.12, 0.3);
  const idx = g.index.array;
  // покраска по вершине (через индекс): глазницы и нос — тёмные, трещины — тёмные линии
  const flat = g.toNonIndexed(); flat.deleteAttribute('uv');
  const FP = flat.attributes.position, col = new Float32Array(FP.count * 4), T = new Float32Array(FP.count).fill(kit.geo.TEX_ID.bone), c = new THREE.Color();
  for (let f = 0; f < idx.length; f++) {
    const dk = dark[idx[f]], cr = crk[idx[f]], y = FP.getY(f);
    c.set(boneCol(kit, y, 0.1)); c.lerp(new THREE.Color(HOLE), Math.min(1, dk * 1.8)); c.lerp(new THREE.Color(CRACK), Math.min(1, cr * 1.2));
    col[f * 4] = c.r; col[f * 4 + 1] = c.g; col[f * 4 + 2] = c.b; col[f * 4 + 3] = 1;
  }
  flat.setAttribute('color', new THREE.BufferAttribute(col, 4)); flat.setAttribute('aTex', new THREE.BufferAttribute(T, 1));
  L.push(flat);
  // зубы верхней челюсти — ряд скруглённых клыков у самой земли (нижняя челюсть ушла в землю)
  const tg = [];
  for (let k = 0; k < 9; k++) {
    const a = (k - 4) * 0.16, t = new THREE.SphereGeometry(0.13, 10, 8);
    t.scale(0.75, 1.7, 0.75); t.translate(Math.sin(a) * 0.95, -1.12 + Math.abs(k - 4) * 0.03, Math.cos(a) * 0.95 + 0.82);
    t.rotateX(-0.12); t.rotateZ(-0.1); t.rotateY(0.4); t.translate(-4.0, 1.12, 0.3); tg.push(colorize(kit, t, (x, y) => ({ c: boneCol(kit, y + 0.3, 0.2) })));
  }
  L.push(...tg);
}

// ---------- грудная клетка: хребет в земле, рёбра дугами над холмом (кончики уходят в землю с другой стороны) ----------
function ribcage(kit, L) {
  const N = 10, R = kit.geo.rng(77);
  for (let i = 0; i < N; i++) {
    const x = -1.85 + i * 0.58 + (R() - 0.5) * 0.1, k = Math.sin((i + 0.6) / (N + 0.2) * Math.PI), h = (1.1 + 2.0 * k) * (0.88 + R() * 0.2), w = 1.4 + 0.7 * k, lean = 0.25 + i * 0.06 + (R() - 0.5) * 0.15;
    const pts = [[x - 0.1, -0.3, -1.5], [x, 0.5 * h, -1.45 - 0.05 * w], [x + 0.12, 0.92 * h, -0.55], [x + 0.22, h, 0.25], [x + 0.32, 0.82 * h, 0.95], [x + 0.4 + lean * 0.3, 0.45 * h, 1.35 + 0.15 * w], [x + 0.45 + lean * 0.4, -0.25, 1.55 + 0.1 * w]];
    const broken = i === 3 || i === 8;   // два ребра обломаны: кончик висит над травой, торец скруглён
    const use = broken ? pts.slice(0, i === 3 ? 5 : 4) : pts;
    const g = boneTube(kit, use, t => (0.2 - 0.07 * t + 0.03 * Math.sin(t * Math.PI)) * (broken ? 1 - 0.25 * t : 1), { radial: 8, segs: broken ? 14 : 18, flat: 1.45 });
    L.push(colorize(kit, g, (px, py) => ({ c: boneCol(kit, py, 0.15 - 0.1 * (i % 2)) })));
  }
  // обломок ребра в траве перед клеткой
  L.push(colorize(kit, boneTube(kit, [[0.3, 0.05, 2.1], [1.0, 0.18, 2.35], [1.7, 0.12, 2.3]], t => 0.16 - 0.04 * t, { radial: 8, segs: 10, flat: 1.4 }), (px, py) => ({ c: boneCol(kit, py + 0.3) })));
  // хребет: гладкий валик и скруглённые остистые отростки, торчащие из земли
  L.push(colorize(kit, boneTube(kit, [[-2.4, 0.0, -1.55], [-0.5, 0.18, -1.6], [1.5, 0.15, -1.55], [3.6, -0.05, -1.5]], () => 0.32, { radial: 10, segs: 20 }), (px, py) => ({ c: boneCol(kit, py) })));
  for (let i = 0; i < 9; i++) { const x = -2.1 + i * 0.68; L.push(colorize(kit, boneTube(kit, [[x, 0.1, -1.7], [x - 0.08, 0.5, -1.82], [x - 0.15, 0.75, -1.9]], t => 0.13 - 0.06 * t, { radial: 8, segs: 6 }), (px, py) => ({ c: boneCol(kit, py) }))); }
}

// ---------- бедренная кость: ствол, головка на шейке с одной стороны, два мыщелка с другой ----------
function femur(kit, L) {
  const { THREE } = kit, parts = [];
  parts.push(boneTube(kit, [[0, 0.32, 0], [1.4, 0.4, 0.05], [2.8, 0.38, -0.05], [4.0, 0.3, 0]], t => 0.4 + 0.14 * Math.pow(Math.abs(t - 0.5) * 2, 3), { radial: 12, segs: 20 }));
  parts.push(boneTube(kit, [[0.25, 0.36, 0], [-0.25, 0.52, 0.35], [-0.5, 0.62, 0.55]], t => 0.3 + 0.05 * t, { radial: 10, segs: 8, cap: false }));   // шейка
  const head = new THREE.SphereGeometry(0.52, 18, 14); head.translate(-0.62, 0.7, 0.65); parts.push(head);
  for (const s of [-1, 1]) { const c = new THREE.SphereGeometry(0.52, 18, 14); c.scale(1.15, 1, 0.9); c.translate(4.3, 0.4, s * 0.36); parts.push(c); }   // мыщелки
  for (const g of parts) { g.rotateY(0.18); g.translate(0.2, 0.05, 3.25); L.push(colorize(kit, g, (px, py) => ({ c: boneCol(kit, py, 0.1) }))); }
}

// ---------- земля: пологий наст, насыпанный на основания костей (трава сверху, голая земля у костей) ----------
function earth(kit, L, R) {
  const { THREE } = kit, W = 13.6, D = 9.6, NX = 34, NZ = 24, P = [], I = [];
  const bump = (x, z, gx, gz) => {
    let h = 1.0 * gauss(Math.hypot((x + 4.2) / 1.2, (z + 0.6) / 0.9), 1.9) + 0.32 * gauss(Math.hypot((x + 3.3) / 1.5, (z - 2.0) / 0.8), 1.0);   // вал за черепом и по бокам, спереди — земля у челюсти
    h += 0.55 * gauss(Math.hypot((x - 0.9) / 3.0, (z + 1.55) / 1.0), 1.0);   // хребет засыпан
    h += 0.3 * gauss(Math.hypot((x - 1.2) / 3.0, (z - 1.6) / 0.7), 1.0);   // кончики рёбер
    h += 0.24 * gauss(Math.hypot((x - 2.2) / 2.6, (z - 3.15) / 0.8), 1.0);   // у бедра
    h += 0.08 * Math.sin(x * 1.3 + z * 0.7) * Math.sin(z * 1.7 - x * 0.4);   // неровность
    const e = Math.max(Math.abs(gx) / (W / 2), Math.abs(gz) / (D / 2)); return h * Math.max(0, 1 - Math.pow(e, 3)) - 0.03;   // к краю — в ноль
  };
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const x = (i / NX - 0.5) * W + (R() - 0.5) * 0.12, z = (j / NZ - 0.5) * D + (R() - 0.5) * 0.12, h = bump(x - 0.4, z + 0.6, x, z);
    P.push(x - 0.4, h, z + 0.6);
  }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; I.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  // край — в цвет травы поля, наверху — тёмная земля там, где склон крут или холм высок (насыпь у костей)
  L.push(colorize(kit, g, (x, y, z) => {
    const bare = Math.min(1, Math.max(0, (y - 0.32) / 0.4)) * 0.85;
    return { c: mix(mix(0x9aa456, 0xa8ad62, 0.5 + 0.5 * Math.sin(x * 0.9 + z * 1.3), kit), DIRT, bare, kit), t: 'none' };
  }));
}

// валуны: гладкие округлые камни, вросшие в наст
function boulders(kit, L, R) {
  const { THREE } = kit;
  for (const [x, z, s] of [[-5.9, 2.0, 0.55], [-2.2, 2.5, 0.4], [5.0, -1.2, 0.6], [5.2, 2.1, 0.35], [-5.2, -2.6, 0.45]]) {
    const g = new THREE.IcosahedronGeometry(s, 2), p = g.attributes.position;
    const off = new Map();
    for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!off.has(key)) off.set(key, 0.85 + R() * 0.25); const k = off.get(key); p.setXYZ(i, p.getX(i) * k * 1.3, p.getY(i) * k * 0.75, p.getZ(i) * k); }
    const w = mergeVerts(kit, g); w.translate(x, s * 0.25, z);
    L.push(colorize(kit, w, (px, py) => ({ c: mix(0x5a5650, 0x8c877c, (py - 0.0) / (s * 0.8), kit), t: 'rock' })));
  }
}
// IcosahedronGeometry — без индексов: сшиваем совпадающие вершины, чтобы нормали были гладкими
function mergeVerts(kit, g) {
  const { THREE } = kit, p = g.attributes.position, map = new Map(), P = [], I = [];
  for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; let k = map.get(key); if (k === undefined) { k = P.length / 3; map.set(key, k); P.push(p.getX(i), p.getY(i), p.getZ(i)); } I.push(k); }
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); o.setIndex(I); o.computeVertexNormals(); return o;
}

const buriedGiant = { id: 'giant_buried', kind: 'prop', batch: true, outline: false, ao: 0.9, aoH: 0.5,
  build(kit) {
    const L = [], R = kit.geo.rng(4242);
    earth(kit, L, R); skull(kit, L); ribcage(kit, L); femur(kit, L); boulders(kit, L, R);
    const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(kit.merge(L), kit.propMat(this))); return { root };
  } };
export const BURIED_GIANT_PROPS = [buriedGiant];
