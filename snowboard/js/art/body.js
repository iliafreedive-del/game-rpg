// Тело райдера из гладких поверхностей с костями. Суставы считает Rider.update() (его IK) —
// здесь только внешний вид: штанины и рукава гнутся в коленях и локтях, куртка — в пояснице,
// баф на шее связывает грудь с головой, голенища ботинков — с голенью.
import * as THREE from 'three';
import { loft, shell, skinned, setBasis, frameYZ, curve, superPt, smooth, lerp, clamp, TAU, V3, envMap, shade } from './kit.js';
import { boardGeo, Foot } from './gear.js';
import * as T from './textures.js';

const I4 = () => new THREE.Matrix4();
const DOWN = V3(0, -1, 0), _v = new THREE.Vector3();
const Tr = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const HEAD_YAW = 1.15; // голова в покое повёрнута к носу доски — так баф почти не скручивается
const CHEST_AT = 0.27, MID_AT = 0.14;

// ---------------------------------------------------------------- геометрия (общая для всех райдеров)
// Штанина: y от тазобедренного сустава (0) до лодыжки (THIGH + SHIN). Z — к колену.
// Прямой свободный крой: почти одна ширина от бедра до низа, внизу чуть шире — накрывает ботинок.
const LEG = curve([
  [0.00, 0.104, 0.108, 0.116, -0.004],
  [0.10, 0.104, 0.108, 0.112, -0.002],
  [0.25, 0.101, 0.105, 0.104, 0],
  [0.38, 0.098, 0.103, 0.099, 0.002],
  [0.45, 0.097, 0.108, 0.097, 0.004],
  [0.52, 0.097, 0.103, 0.098, 0],
  [0.65, 0.099, 0.102, 0.104, -0.004],
  [0.78, 0.102, 0.104, 0.111, -0.010],
  [0.86, 0.106, 0.108, 0.117, -0.014],
  [0.94, 0.108, 0.110, 0.120, -0.016],
]);
// Рукав: y от плеча (0) до запястья. Z — к локтю. Свободный: манжета накрывает перчатку.
const ARM = curve([
  [0.00, 0.071, 0.073, 0.071, 0],
  [0.05, 0.075, 0.077, 0.075, 0],
  [0.12, 0.073, 0.075, 0.072, 0],
  [0.21, 0.069, 0.072, 0.068, 0],
  [0.29, 0.067, 0.074, 0.066, 0.003],
  [0.36, 0.066, 0.068, 0.064, 0],
  [0.45, 0.065, 0.066, 0.064, 0],
  [0.51, 0.066, 0.067, 0.066, 0],
  [0.56, 0.064, 0.065, 0.064, 0],
]);
// Куртка: y от таза; полуширина, глубина спереди и сзади, сдвиг центра. Свободный крой:
// бока прямые от подмышек до подола (без талии), плечо спущено на рукав, высокий воротник-стойка.
const JACKET = curve([
  [-0.18, 0.214, 0.152, 0.166, -0.006],
  [-0.12, 0.219, 0.156, 0.168, -0.006],
  [-0.05, 0.217, 0.155, 0.165, -0.005],
  [0.05, 0.211, 0.152, 0.158, -0.003],
  [0.15, 0.207, 0.152, 0.150, 0.000],
  [0.25, 0.209, 0.156, 0.143, 0.002],
  [0.33, 0.213, 0.159, 0.139, 0.002],
  [0.40, 0.216, 0.152, 0.135, -0.002],
  [0.45, 0.212, 0.139, 0.129, -0.008],
  [0.485, 0.196, 0.126, 0.122, -0.012],
  [0.51, 0.165, 0.116, 0.115, -0.014],
  [0.53, 0.132, 0.112, 0.110, -0.014],
  [0.55, 0.115, 0.112, 0.108, -0.013],
  [0.59, 0.111, 0.113, 0.106, -0.010],
  [0.635, 0.114, 0.116, 0.108, -0.008],
]);
const COLLAR_TOP = 0.635;

// Труба вдоль +Y с куполом сверху, косым низом и подворотом; prof(y) → [rx, rz+, rz−, сдвиг z]
function tube({ prof, top, yA, bottom, folds, ringsTo, step = 0.0125, nseg = 28, p = 2.15, maxY }) {
  const rings = [];
  for (const k of [0, 0.25, 0.45, 0.62, 0.77, 0.89, 0.97]) rings.push({ dome: k });
  for (let y = step; y < yA; y += step) rings.push({ y });
  for (let i = 0; i <= ringsTo; i++) rings.push({ f: i / ringsTo });
  rings.push({ f: 1, hem: true });
  const g = loft(rings.length, nseg, (i, u) => {
    const r = rings[i], phi = u * TAU - Math.PI / 2;
    let y = r.dome != null ? 0 : r.y != null ? r.y : lerp(yA, bottom(phi), r.f);
    const [rx, rp, rn, zo] = prof(clamp(y, 0, maxY));
    const [px, pz] = superPt(phi, rx, rp, rn, p);
    const d = folds ? folds(y, phi) : 0;
    let k = 1;
    if (r.dome != null) { const a = r.dome * Math.PI / 2; k = Math.sin(a); y = -top * Math.cos(a); }
    if (r.hem) { k = 0.93; y -= 0.014; }
    return [(px + Math.cos(phi) * d) * k, y, zo + (pz + Math.sin(phi) * d) * k];
  });
  return g;
}
// v по высоте, u — зеркально для второй стороны тела
function remapUV(g, v0, v1, mirror) {
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, mirror ? 1 - uv.getX(i) : uv.getX(i), (p.getY(i) - v0) / (v1 - v0));
  return g;
}

function legGeo(L, mirror) {
  const g = tube({
    prof: LEG, top: 0.075, yA: 0.78, maxY: 0.94, ringsTo: 12,
    bottom: (phi) => lerp(L - 0.066, L - 0.03, (1 + Math.sin(phi)) / 2),
    folds: (y, phi) => {
      const back = Math.max(0, -Math.sin(phi));
      return 0.0055 * smooth(0.36, 0.42, y) * (1 - smooth(0.5, 0.56, y)) * back * Math.sin(y * 210 + phi * 1.3)
        + 0.0045 * smooth(0.72, 0.8, y) * (1 - smooth(L - 0.06, L - 0.03, y)) * Math.sin(y * 170 + 1.8 * Math.sin(2 * phi + 0.6) + Math.sin(3 * phi))
        + 0.003 * (1 - smooth(0.04, 0.16, y)) * Math.max(0, Math.sin(phi)) * Math.sin(y * 150 + phi * 2);
    },
  });
  return remapUV(g, -0.075, 0.925, mirror);
}
function armGeo(L, mirror) {
  const g = tube({
    prof: ARM, top: 0.042, yA: 0.47, maxY: 0.56, ringsTo: 6, step: 0.011, nseg: 28,
    bottom: () => L - 0.012,
    folds: (y, phi) => {
      const inner = Math.max(0, -Math.sin(phi));
      return 0.006 * smooth(0.21, 0.26, y) * (1 - smooth(0.33, 0.38, y)) * (0.35 + inner) * Math.sin(y * 210 + phi)
        + 0.0045 * smooth(0.42, 0.47, y) * Math.sin(y * 170 + 1.6 * Math.sin(2 * phi + 0.5))
        + 0.0025 * smooth(0.04, 0.1, y) * (1 - smooth(0.17, 0.22, y)) * Math.sin(phi * 5 + y * 30);
    },
  });
  return remapUV(g, -0.075, 0.565, mirror);
}
// Куртка: подол (чуть длиннее сзади) с подворотом и тёмной подкладкой изнутри, напуск над резинкой,
// мягкие складки на талии и спине; сверху — воротник-стойка с подворотом.
function jacketGeo() {
  const YA = -0.1, step = 0.0175;
  const rings = [{ lin: 0.05, k: 0.89 }, { lin: 0.012, k: 0.905 }, { f: 0, k: 0.955, dy: -0.005 }, { f: 0, k: 0.988 }];
  for (let i = 1; i <= 5; i++) rings.push({ f: i / 5 });
  for (let y = YA + step; y < COLLAR_TOP - 0.004; y += step) rings.push({ y });
  rings.push({ y: COLLAR_TOP }, { y: COLLAR_TOP - 0.004, k: 0.93 }, { y: COLLAR_TOP - 0.035, k: 0.9 });
  const nseg = 48;
  const g = loft(rings.length, nseg, (i, u) => {
    const r = rings[i], phi = u * TAU - Math.PI / 2, hem = T.jacketHem(u);
    let y = r.lin != null ? hem + r.lin : r.f != null ? lerp(hem, YA, r.f) + (r.dy || 0) : r.y;
    const [a, bf, bb, zo] = JACKET(clamp(y, -0.18, COLLAR_TOP));
    const [px, pz] = superPt(phi, a, bf, bb, lerp(2.6, 2.2, smooth(0.3, 0.5, y)));
    const dh = y - hem, side = Math.abs(Math.cos(phi)), back = Math.max(0, -Math.sin(phi)), front = Math.max(0, Math.sin(phi));
    // резинка подола и напуск ткани над ней
    let k = (r.k || 1) * (1 - 0.022 * (1 - smooth(0.01, 0.035, dh)) + 0.012 * smooth(0.03, 0.06, dh) * (1 - smooth(0.08, 0.14, dh)));
    const d = 0.0045 * smooth(-0.07, -0.02, y) * (1 - smooth(0.1, 0.16, y)) * (0.45 + 0.55 * side) * Math.sin(y * 95 + 1.6 * Math.sin(2 * phi + 0.4))
      + 0.004 * (1 - smooth(-0.04, 0.08, y)) * back * Math.sin(phi * 9 + 0.7)
      + 0.003 * (1 - smooth(-0.07, 0.05, y)) * front * Math.sin(phi * 11 + 1.3)
      + 0.0028 * smooth(0.22, 0.27, y) * (1 - smooth(0.36, 0.42, y)) * side * Math.sin(y * 80 + phi * 4);
    return [(px + Math.cos(phi) * d) * k, y, zo + (pz + Math.sin(phi) * d) * k];
  });
  // v — по высоте; подкладке — отдельная тёмная полоса развёртки
  const p = g.attributes.position, uv = g.attributes.uv, cols = nseg + 1;
  for (let i = 0; i < p.count; i++) {
    const ring = rings[Math.floor(i / cols)];
    uv.setY(i, ring.lin != null ? T.JACKET_V(-0.235) : T.JACKET_V(p.getY(i)));
  }
  return g;
}

// Капюшон, сложенный на спине: валик вокруг воротника (концы уходят вперёд к ключицам),
// посередине свисает ниже. Строится в системе торса (y от таза).
function hoodGeo() {
  const nr = 26, A = 1.45;
  return loft(nr, 20, (i, u) => {
    const s = (i / (nr - 1)) * 2 - 1, al = s * A, w = Math.cos(s * Math.PI / 2) ** 0.6;
    const R = 0.118 + 0.012 * w, cy = 0.548 - 0.05 * s * s - 0.02 * w;
    const th = u * TAU, ry = (0.022 + 0.034 * w) * lerp(1, 1.5, Math.max(0, -Math.sin(th)) * w), rr = 0.012 + 0.03 * w;
    const rad = R + rr * Math.cos(th) - 0.01 * w, y = cy + ry * Math.sin(th);
    return [rad * Math.sin(al), y, -rad * Math.cos(al) - 0.012];
  }, { flip: true });
}

// Варежка в системе предплечья (0 — запястье, +Y — к пальцам, Z — к локтю), ладонь — внутрь (−outer·X)
function mittenGeo(outer) {
  const n = 18;
  const hand = loft(n, 20, (i, u) => {
    const t = i / (n - 1), phi = u * TAU - Math.PI / 2;
    let w = 0.044 * lerp(0.82, 1, smooth(0, 0.2, t)), h = 0.025 * lerp(0.9, 1, smooth(0, 0.3, t));
    const tip = t > 0.72 ? Math.sqrt(Math.max(0, 1 - ((t - 0.72) / 0.28) ** 2)) : 1;
    const cx = -outer * 0.03 * smooth(0.3, 1, t) ** 1.5;
    const [x, z] = superPt(phi, h * tip, w * tip, w * tip, 2.4);
    return [cx + x, t * 0.12, z - 0.004];
  });
  const cuff = loft(9, 20, (i, u) => {
    const t = i / 8, phi = u * TAU - Math.PI / 2;
    const r = i === 8 ? 0.05 : lerp(0.061, 0.052, t), k = i === 0 ? 0.9 : 1;
    const [x, z] = superPt(phi, r * k, (r + 0.004) * k, (r + 0.004) * k, 2.2);
    return [x, i === 0 ? -0.075 : lerp(-0.088, 0.012, t), z];
  });
  return { hand, cuff };
}

function helmetParts() {
  const HC = V3(0, 0.02, -0.012), HR = V3(0.127, 0.124, 0.143);
  const amax = (phi) => {
    const psi = Math.acos(clamp(Math.sin(phi), -1, 1));
    return 1.25 + 0.68 * smooth(0.72, 1.06, psi) - 0.04 * smooth(2.2, 3.0, psi);
  };
  const at = (phi, a, k = 1) => [HC.x + HR.x * k * Math.sin(a) * Math.cos(phi), HC.y + HR.y * k * Math.cos(a), HC.z + HR.z * k * Math.sin(a) * Math.sin(phi)];
  const nr = 22;
  const helmet = loft(nr, 64, (i, u) => { const phi = u * TAU - Math.PI / 2; return at(phi, amax(phi) * (i / (nr - 1)) ** 0.9); }, { flip: true });
  const rimPts = [];
  for (let i = 0; i < 96; i++) { const phi = (i / 96) * TAU; rimPts.push(V3(...at(phi, amax(phi) - 0.012, 1.01))); }
  const rim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 80, 0.0068, 6, true);
  // вентиляционные прорези
  const vents = [[0.42, Math.PI / 2, 0.05], [0.4, -Math.PI / 2, 0.05], [0.62, Math.PI / 2 + 0.42, 0.04], [0.62, Math.PI / 2 - 0.42, 0.04], [0.66, -Math.PI / 2 + 0.4, 0.04], [0.66, -Math.PI / 2 - 0.4, 0.04]].map(([a, phi, len]) => {
    const p = V3(...at(phi, a, 0.997));
    const n = V3(...at(phi, a, 1.1)).sub(p).normalize();
    const m = V3(...at(phi, a + 0.01)).sub(V3(...at(phi, a - 0.01))).normalize();
    const side = new THREE.Vector3().crossVectors(m, n).normalize();
    return { p, q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, m, n)), len };
  });
  // маска: рамка и линза изогнуты по цилиндру вокруг лица
  const GY = 0.012, R0 = 0.112;
  const shape = (w, h, r, nw, nh) => {
    const s = new THREE.Shape(), x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
    s.moveTo(x0 + r, y0); s.lineTo(-nw / 2, y0);
    s.quadraticCurveTo(-nw * 0.3, y0 + nh, 0, y0 + nh); s.quadraticCurveTo(nw * 0.3, y0 + nh, nw / 2, y0);
    s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r * 0.8);
    s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
    s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r);
    s.lineTo(x0, y0 + r * 0.8); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    return s;
  };
  const bend = (g, R) => {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = x / R0, rr = R + z;
      p.setXYZ(i, rr * Math.sin(a), y + GY, rr * Math.cos(a));
      if (n) { const nx = n.getX(i), nz = n.getZ(i); n.setXYZ(i, nx * Math.cos(a) + nz * Math.sin(a), n.getY(i), -nx * Math.sin(a) + nz * Math.cos(a)); }
    }
    return g;
  };
  const outer = shape(0.198, 0.09, 0.03, 0.052, 0.022), hole = shape(0.172, 0.067, 0.022, 0.042, 0.017);
  outer.holes.push(hole);
  const frame = bend(new THREE.ExtrudeGeometry(outer, { depth: 0.013, bevelEnabled: true, bevelThickness: 0.0035, bevelSize: 0.003, bevelSegments: 2, curveSegments: 10 }), R0);
  // линза — сетка, обрезанная по контуру (чтобы гнулась гладко)
  const lensOutline = shape(0.178, 0.072, 0.024, 0.044, 0.018).getPoints(12);
  const inside = (x, y) => { let c = false; for (let i = 0, j = lensOutline.length - 1; i < lensOutline.length; j = i++) { const a = lensOutline[i], b = lensOutline[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
  const NX = 32, NY = 10, W = 0.18, H = 0.074, lp = [], luv = [], li = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const x = (i / NX - 0.5) * W, y = (j / NY - 0.5) * H; lp.push(x, y, 0); luv.push(i / NX, j / NY); }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
    const cx = ((i + 0.5) / NX - 0.5) * W, cy = ((j + 0.5) / NY - 0.5) * H;
    if (inside(cx, cy)) li.push(a, b, c, b, d, c);
  }
  const lens = new THREE.BufferGeometry();
  lens.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lens.setAttribute('uv', new THREE.Float32BufferAttribute(luv, 2));
  lens.setAttribute('normal', new THREE.Float32BufferAttribute(lp.map((_, k) => (k % 3 === 2 ? 1 : 0)), 3));
  lens.setIndex(li);
  bend(lens, R0 + 0.011);
  // резинка маски поверх шлема
  const strap = shell((s, t) => {
    const psi = lerp(0.84, TAU - 0.84, s), y = GY + (t - 0.5) * 0.036;
    const a = Math.acos(clamp((y - HC.y) / HR.y, -1, 1)), k = 1.035;
    return V3(HR.x * Math.sin(a) * k * Math.sin(psi), y, HC.z + HR.z * Math.sin(a) * k * Math.cos(psi));
  }, 48, 2, 0.004);
  return { helmet, rim, vents, frame, lens, strap };
}

// Баф: строится в системе головы, лежит в «покойной» позе относительно груди
function gaiterGeo(headRest, neckY) {
  const n = 24;
  const g = loft(n + 1, 36, (i, u) => {
    const phi = u * TAU - Math.PI / 2, psi = Math.acos(clamp(Math.sin(phi), -1, 1));
    const hem = i === n, t = Math.min(1, i / (n - 1));
    const yTop = lerp(-0.067, -0.022, smooth(0.2, 2.6, psi));
    let y = lerp(-0.26, yTop, t);
    const j = smooth(-0.16, -0.085, y);
    const rx = lerp(0.063, 0.085, j), rf = lerp(0.07, 0.104, j), rb = lerp(0.066, 0.082, j), zc = lerp(0, 0.004, j);
    const [x, z] = superPt(phi, rx, rf, rb, 2.1);
    const d = 0.003 * smooth(-0.2, -0.15, y) * (1 - smooth(-0.11, -0.08, y)) * Math.sin(y * 260 + phi * 2);
    let k = 1;
    if (hem) { k = 0.94; y -= 0.008; }
    return [(x + Math.cos(phi) * d) * k, y, zc + (z + Math.sin(phi) * d) * k];
  }, { v: (i) => i / n });
  g.applyMatrix4(headRest);
  return g;
}

let GEO = null;
function geometries(d) {
  if (GEO) return GEO;
  const legL = d.THIGH + d.SHIN, armL = d.UARM + d.FARM;
  const headRest = Tr(0, d.TORSO - CHEST_AT + d.NECK, 0).multiply(new THREE.Matrix4().makeRotationY(HEAD_YAW));
  GEO = {
    legF: legGeo(legL, false), legR: legGeo(legL, true),
    armF: armGeo(armL, false), armR: armGeo(armL, true),
    torso: jacketGeo(),
    mitF: mittenGeo(1), mitR: mittenGeo(-1),
    thumb: new THREE.CapsuleGeometry(0.0135, 0.036, 4, 10),
    head: helmetParts(),
    headRest,
    gaiter: gaiterGeo(headRest),
    sphere: new THREE.SphereGeometry(1, 22, 14),
    hood: hoodGeo(),
    vent: new THREE.CapsuleGeometry(0.0062, 1, 3, 10),
  };
  return GEO;
}

// ---------------------------------------------------------------- материалы (кэш по палитре)
const MATS = new Map();
function materials(pal, ghost, ghostColor) {
  const key = ghost ? 'ghost' + ghostColor : JSON.stringify(pal);
  if (MATS.has(key)) return MATS.get(key);
  let M;
  if (ghost) {
    const g = new THREE.MeshBasicMaterial({ color: ghostColor, transparent: true, opacity: 0.28, depthWrite: false });
    M = new Proxy({}, { get: (_, k) => (k === 'board' ? g : g) });
  } else {
    const env = envMap();
    const S = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, ...o });
    const c2 = pal.jacket2 || shade(pal.jacket, -0.55);
    M = {
      jacket: S({ map: T.jacketTex(pal.jacket, c2), roughness: 0.66 }),
      sleeve: S({ map: T.sleeveTex(pal.jacket, c2), roughness: 0.66 }),
      hood: S({ map: T.hoodTex(c2, pal.jacket), roughness: 0.7 }),
      pants: S({ map: T.pantsTex(pal.pants), roughness: 0.82 }),
      pantsPlain: S({ color: shade(pal.pants, -0.05), roughness: 0.85 }),
      gloves: S({ color: pal.gloves, roughness: 0.58 }),
      glovesCuff: S({ color: shade(pal.gloves, 0.12), roughness: 0.7 }),
      accent: S({ color: pal.accent, roughness: 0.5 }),
      helmet: S({ map: T.helmetTex(pal.helmet, pal.accent), roughness: 0.3, envMap: env, envMapIntensity: 0.55 }),
      trim: S({ color: '#1c1f24', roughness: 0.55 }),
      frame: S({ color: pal.frame, roughness: 0.35, envMap: env, envMapIntensity: 0.3 }),
      lens: S({ map: T.lensTex(pal.goggles), metalness: 0.85, roughness: 0.07, envMap: env, envMapIntensity: 1.6, emissive: new THREE.Color(pal.goggles).multiplyScalar(0.12) }),
      gstrap: S({ map: T.gStrapTex(pal.accent), roughness: 0.8 }),
      skin: S({ color: pal.skin, roughness: 0.55 }),
      gaiter: S({ map: T.gaiterTex(pal.gaiter), roughness: 0.92 }),
      boot: S({ map: T.bootTex(pal.boots, pal.accent), roughness: 0.68 }),
      sole: S({ color: '#17191c', roughness: 0.9 }),
      midsole: S({ color: '#cfd4da', roughness: 0.75 }),
      binding: S({ color: '#c3c9d1', roughness: 0.45 }),
      highback: S({ map: T.highbackTex(pal.accent), roughness: 0.42 }),
      strap: S({ map: T.bStrapTex(pal.accent), roughness: 0.65 }),
      ratchet: S({ color: '#30353d', roughness: 0.4, metalness: 0.3 }),
      metal: S({ color: '#c7ced6', roughness: 0.28, metalness: 0.9, envMap: env }),
      disc: S({ map: T.discTex(), roughness: 0.5 }),
      board: [
        S({ map: T.topsheetTex(pal.board), roughness: 0.28, envMap: env, envMapIntensity: 0.45 }),
        S({ map: T.baseTex(pal.board), roughness: 0.5 }),
        S({ color: '#2a2f36', roughness: 0.4 }),
        S({ color: '#aeb6bf', roughness: 0.3, metalness: 0.95, envMap: env }),
      ],
    };
  }
  MATS.set(key, M);
  return M;
}

// ---------------------------------------------------------------- модель
export class RiderModel {
  constructor({ root, stance, ghost = false, pal, ghostColor = '#4ade80', dims }) {
    this.d = dims;
    const G = geometries(dims), M = materials(pal, ghost, ghostColor);
    const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = !ghost; m.receiveShadow = !ghost; } }); return o; };
    const bone = () => { const b = new THREE.Bone(); stance.add(b); return b; };

    this.board = shadow(new THREE.Mesh(boardGeo(), M.board));
    root.add(this.board);

    // ноги: ботинки и крепления живут в группах стоп, их ставит Rider.update()
    this.feet = [0, 1].map(() => { const g = new THREE.Group(); stance.add(g); return g; });
    this.footRig = this.feet.map((g, i) => new Foot(g, M, { side: i ? -1 : 1, ghost }));

    const limbW = (l1, band) => (v) => {
      const t = clamp((v.y - l1) / band, -1, 1), h = 1 - smooth(0, 1, Math.abs(t));
      return [[0, t < 0 ? 1 - h : 0], [1, h], [2, t > 0 ? 1 - h : 0]];
    };
    const limbRest = (l1) => [I4(), Tr(0, l1, 0), Tr(0, l1, 0)];
    const limb = (geo, mat, l1, band) => {
      const b = [bone(), bone(), bone()];
      stance.add(shadow(skinned(geo, mat, b, limbRest(l1), limbW(l1, band))));
      return b;
    };
    this.legs = [limb(G.legF, M.pants, dims.THIGH, 0.08), limb(G.legR, M.pants, dims.THIGH, 0.08)];
    this.arms = [limb(G.armF, M.sleeve, dims.UARM, 0.065), limb(G.armR, M.sleeve, dims.UARM, 0.065)];

    // куртка: таз → середина → грудь; низ куртки ещё и на «подольных» костях в тазобедренных суставах —
    // перед ложится на согнутые бёдра, спина висит и только расходится вместе с ногами (см. pose)
    this.pelvis = bone(); this.mid = bone(); this.chest = bone();
    this.hem = [bone(), bone(), bone(), bone()];
    const hipX = [0.1, 0.1, -0.1, -0.1];
    stance.add(shadow(skinned(G.torso, M.jacket, [this.pelvis, this.mid, this.chest, ...this.hem], [I4(), Tr(0, MID_AT, 0), Tr(0, CHEST_AT, 0), ...hipX.map((x) => Tr(x, 0, 0))], (v) => {
      const wp = 1 - smooth(0.02, 0.17, v.y), wc = smooth(0.13, 0.31, v.y);
      const fr = smooth(-0.08, 0.04, v.z), h = 0.95 * smooth(lerp(0.07, 0.12, fr), -0.11, v.y), sF = smooth(-0.07, 0.07, v.x);
      return [[0, wp * (1 - h)], [1, Math.max(0, 1 - wp - wc) * (1 - h)], [2, wc * (1 - h)],
        [3, h * sF * fr], [4, h * sF * (1 - fr)], [5, h * (1 - sF) * fr], [6, h * (1 - sF) * (1 - fr)]];
    })));
    const seat = new THREE.Mesh(G.sphere, M.pantsPlain);
    seat.scale.set(0.155, 0.08, 0.1); seat.position.set(0, -0.09, -0.016);
    this.pelvis.add(shadow(seat));
    if (!ghost) {
      const hood = new THREE.Mesh(G.hood, M.hood);
      hood.position.y = -CHEST_AT;
      this.chest.add(shadow(hood));
    }

    // варежки на концах предплечий
    this.arms.forEach((b, i) => {
      const g = new THREE.Group(); g.position.y = dims.FARM;
      const m = i ? G.mitR : G.mitF, outer = i ? -1 : 1;
      g.add(new THREE.Mesh(m.hand, M.gloves), new THREE.Mesh(m.cuff, M.glovesCuff));
      const th = new THREE.Mesh(G.thumb, M.gloves);
      th.position.set(-outer * 0.012, 0.035, -0.042);
      th.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(-outer * 0.35, 0.75, -0.55).normalize());
      g.add(th);
      b[2].add(shadow(g));
    });

    // голова: шлем, маска, лицо; баф связывает её с грудью
    this.head = new THREE.Group(); stance.add(this.head);
    const H = G.head;
    const face = new THREE.Mesh(G.sphere, M.skin); face.scale.set(0.078, 0.092, 0.09); face.position.set(0, -0.045, 0.01);
    this.head.add(face, new THREE.Mesh(H.helmet, M.helmet), new THREE.Mesh(H.frame, M.frame), new THREE.Mesh(H.lens, M.lens));
    if (!ghost) {
      const nose = new THREE.Mesh(G.sphere, M.skin); nose.scale.set(0.0135, 0.021, 0.017); nose.position.set(0, -0.041, 0.102); nose.rotation.x = -0.25;
      this.head.add(nose, new THREE.Mesh(H.rim, M.trim), new THREE.Mesh(H.strap, M.gstrap));
      for (const v of H.vents) { const m = new THREE.Mesh(G.vent, M.trim); m.position.copy(v.p); m.quaternion.copy(v.q); m.scale.set(0.85, v.len, 0.42); this.head.add(m); }
    }
    shadow(this.head);
    this.neck = bone();
    this.headRest = G.headRest;
    this.headRestQ = new THREE.Quaternion().setFromRotationMatrix(G.headRest);
    stance.add(shadow(skinned(G.gaiter, M.gaiter, [this.chest, this.neck, this.head], [I4(), I4(), G.headRest], (v) => {
      const y = v.y - (dims.TORSO - CHEST_AT + dims.NECK);
      const wc = 1 - smooth(-0.25, -0.18, y), wh = smooth(-0.17, -0.1, y);
      return [[0, wc], [1, Math.max(0, 1 - wc - wh)], [2, wh]];
    })));
  }

  // Две кости сегмента и «полусустав» между ними (держит объём в колене и локте)
  limb(b, a, m, e, pole) {
    const Y1 = m.clone().sub(a).normalize(), Y2 = e.clone().sub(m).normalize();
    const f1 = frameYZ(Y1, pole), f2 = frameYZ(Y2, pole);
    setBasis(b[0], a, f1.X, Y1, f1.Z);
    setBasis(b[2], m, f2.X, Y2, f2.Z);
    b[1].position.copy(m); b[1].quaternion.copy(b[0].quaternion).slerp(b[2].quaternion, 0.5);
  }

  pose(J) {
    this.limb(this.legs[0], J.hipF, J.kneeF, J.ankF, J.legPoleF);
    this.limb(this.legs[1], J.hipR, J.kneeR, J.ankR, J.legPoleR);
    this.limb(this.arms[0], J.shF, J.elF, J.wrF, J.armPoleF);
    this.limb(this.arms[1], J.shR, J.elR, J.wrR, J.armPoleR);
    // таз и грудь
    const Xp = J.side0, Yp = J.pelvisUp.clone().addScaledVector(Xp, -J.pelvisUp.dot(Xp)).normalize();
    setBasis(this.pelvis, J.pelvis, Xp, Yp, new THREE.Vector3().crossVectors(Xp, Yp));
    const cpos = J.pelvis.clone().addScaledVector(J.spine, CHEST_AT);
    setBasis(this.chest, cpos, J.shAxis, J.spine, new THREE.Vector3().crossVectors(J.shAxis, J.spine));
    this.mid.quaternion.copy(this.pelvis.quaternion).slerp(this.chest.quaternion, 0.5);
    // подол: перед следует за сгибом бедра вперёд, спина — только за разгибом; обе части — за разведением ног
    const qi = this.pelvis.quaternion.clone().invert();
    [[J.hipF, J.kneeF, 1], [J.hipR, J.kneeR, -1]].forEach(([h, k, sg], i) => {
      const d = k.clone().sub(h).normalize().applyQuaternion(qi);
      const abd = sg * clamp(Math.asin(clamp(d.x * sg, -1, 1)), -0.25, 0.75), flex = Math.atan2(d.z, -d.y);
      [clamp(flex, 0, 1.25), clamp(flex, -0.6, 0)].forEach((fl, j) => {
        const b = this.hem[i * 2 + j];
        b.quaternion.setFromUnitVectors(DOWN, _v.set(Math.sin(abd), -Math.cos(abd) * Math.cos(fl), Math.cos(abd) * Math.sin(fl))).premultiply(this.pelvis.quaternion);
        b.position.copy(h);
      });
    });
    this.mid.position.copy(J.pelvis).addScaledVector(Yp, MID_AT).add(cpos.clone().addScaledVector(J.spine, MID_AT - CHEST_AT)).multiplyScalar(0.5);
    // голова и шея: «полусустав» между грудью и головой
    this.head.position.copy(J.headC); this.head.quaternion.copy(J.headQ);
    const P = V3(0, (this.d.TORSO - CHEST_AT) * 0.55, 0);
    const Mc = new THREE.Matrix4().compose(this.chest.position, this.chest.quaternion, V3(1, 1, 1));
    const Mh = new THREE.Matrix4().compose(this.head.position, this.head.quaternion, V3(1, 1, 1)).multiply(this.headRest.clone().invert());
    const qh = this.head.quaternion.clone().multiply(this.headRestQ.clone().invert());
    const qm = this.chest.quaternion.clone().slerp(qh, 0.5);
    const avg = P.clone().applyMatrix4(Mc).add(P.clone().applyMatrix4(Mh)).multiplyScalar(0.5);
    this.neck.quaternion.copy(qm);
    this.neck.position.copy(avg).sub(P.clone().applyQuaternion(qm));
    // голенища за голенью
    [[J.kneeF, J.ankF, J.angF], [J.kneeR, J.ankR, J.angR]].forEach(([k, a, ang], i) => {
      const f = this.footRig[i];
      f.update(k.clone().sub(a).normalize().applyQuaternion(f.group.quaternion.clone().invert()), ang);
    });
  }
}
