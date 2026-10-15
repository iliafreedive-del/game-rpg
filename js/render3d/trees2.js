// Новые деревья деревни (15 октября, тред «Тренировка лёгких деревьев»; проба 2 из lab/trees_train2.js). Крона — много мелких «кучек» листвы (у каждой светлый верх и тёмный низ, между ними
// тень), ель — много мелких лап-веточек по спирали вокруг тёмного конуса. Текстура: кучка листьев с объёмом и хвойная лапа (1024 × 512).
// В игре дерево не рисуется мешем: forestglb.js один раз снимает его в атлас карточек под углом камеры — на карте 2 треугольника.
import * as THREE from '../vendor/three.module.min.js';
import { toon } from './toon.js';
import { SHADOW } from './style.js';

const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const C = h => new THREE.Color(h), V = (x, y, z) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- текстура: [0] кучка листьев, [1] хвойная лапа. Серая (оттенок даёт вершина), светотень уже внутри картинки ----------
let TEX = null;
export function tex2(P = 512) {
  if (TEX) return TEX;
  const cv = document.createElement('canvas'); cv.width = P * 2; cv.height = P; const g = cv.getContext('2d'), r = rng(17), k = P / 512;
  // кучка: 6 под-шапок, листья рисуются от тёмных к светлым — светлые верхушки ложатся поверх тёмных щелей
  const subs = []; for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = i ? (60 + r() * 90) * k : 0; subs.push([256 * k + Math.cos(a) * d, 270 * k + Math.sin(a) * d * 0.8, (95 + r() * 55) * k]); }
  const leaves = [];
  for (let i = 0; i < 700; i++) {
    const [sx, sy, sr] = subs[(r() * subs.length) | 0], a = r() * 6.28, d = Math.sqrt(r()) * sr, x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d * 0.85;
    if (Math.hypot(x - 256 * k, y - 256 * k) > 245 * k) continue;
    const up = (sy - y) / sr, sh = Math.min(1, Math.max(0, 0.5 + 0.55 * up + 0.25 * (sx - x) / sr * -0.3 + (r() - 0.5) * 0.35 - 0.35 * (d / sr) * (up < 0 ? 1 : 0)));
    leaves.push([x, y, sh, a]);
  }
  leaves.sort((p, q) => p[2] - q[2]);
  for (const [x, y, sh, a] of leaves) {
    const L = (17 + r() * 10) * k, W = L * 0.7, v = 60 + 195 * sh;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = `rgb(${v * 0.92 | 0},${v | 0},${v * 0.85 | 0})`; g.beginPath(); g.moveTo(0, -L); g.quadraticCurveTo(W, -L * 0.1, 0, L * 0.7); g.quadraticCurveTo(-W, -L * 0.1, 0, -L); g.fill();
    g.fillStyle = `rgba(255,255,255,${0.25 * sh})`; g.beginPath(); g.ellipse(-W * 0.2, -L * 0.3, W * 0.25, L * 0.35, 0, 0, 6.28); g.fill();   // блик на листе
    g.restore();
  }
  // хвойная лапа: стебель снизу вверх, боковые веточки «ёлочкой», у каждой иглы; к концу светлее
  const ox = P, cx = ox + 256 * k;
  const branch = (x0, y0, ang, len, w, t0, depth) => {
    const dx = Math.sin(ang), dy = -Math.cos(ang), steps = Math.max(6, len / (5 * k) | 0);
    for (let s = 0; s < steps; s++) {
      const t = s / steps, x = x0 + dx * len * t, y = y0 + dy * len * t, nl = (depth ? 22 : 30) * k * (1 - t * 0.55), v = 70 + 170 * Math.min(1, t0 + t * 0.6) * (0.85 + r() * 0.15);
      g.strokeStyle = `rgb(${v * 0.9 | 0},${v | 0},${v * 0.8 | 0})`; g.lineWidth = 3.2 * k; g.lineCap = 'round';
      for (const sd of [-1, 1]) { const na = ang + sd * (0.9 + r() * 0.2); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(na) * nl, y - Math.cos(na) * nl); g.stroke(); }
    }
    g.strokeStyle = 'rgb(70,60,50)'; g.lineWidth = (depth ? 2.5 : 4) * k; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + dx * len, y0 + dy * len); g.stroke();
  };
  for (let i = 0; i < 9; i++) {   // боковые веточки: длиннее в середине лапы
    const t = 0.12 + i * 0.095, y = 500 * k - t * 470 * k, len = Math.sin(Math.PI * Math.min(1, t * 1.1)) * 150 * k + 30 * k;
    for (const sd of [-1, 1]) branch(cx, y, sd * (0.75 + r() * 0.15), len, 3, t * 0.7, 1);
  }
  branch(cx, 505 * k, 0, 480 * k, 4, 0.1, 0);
  g.fillStyle = '#fff'; g.fillRect(P, 0, 12 * k, 12 * k);   // сплошное белое пятно: ствол и ядра берут цвет только из вершин
  const im = g.getImageData(0, 0, cv.width, cv.height), D = im.data;
  for (let i = 3; i < D.length; i += 4) D[i] = D[i] > 120 ? 255 : 0;
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.minFilter = THREE.LinearMipmapLinearFilter;
  return (TEX = t);
}

// ---------- сборка геометрии из списков (pos, nor, uv, col) ----------
function Acc() { const a = { p: [], n: [], u: [], c: [] };
  a.tri = (vs) => { for (const v of vs) { a.p.push(v.p.x, v.p.y, v.p.z); a.n.push(v.n.x, v.n.y, v.n.z); a.u.push(v.u[0], v.u[1]); a.c.push(v.c.r, v.c.g, v.c.b); } };
  a.geo = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(a.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(a.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(a.c, 3)); return g; };
  return a; }
const NOUV = [0.5 + 5 / 1024, 1 - 5 / 512];   // белое пятно в углу текстуры: ядра и ствол без дыр, цвет из вершин
function quad(A, p, U_, V_, nrm, cols, cell) {   // cols: [низ, верх]
  const u0 = cell * 0.5 + 0.02, u1 = cell * 0.5 + 0.48, vs = [[-1, -1, u0, 0, 0], [1, -1, u1, 0, 0], [1, 1, u1, 0.96, 1], [-1, 1, u0, 0.96, 1]].map(([x, y, u, v, ci]) => ({ p: p.clone().addScaledVector(U_, x).addScaledVector(V_, y), n: nrm(p.clone().addScaledVector(U_, x).addScaledVector(V_, y)), u: [u, v], c: cols[ci] }));
  A.tri([vs[0], vs[1], vs[2], vs[0], vs[2], vs[3]]);
}
// ствол/ветка — сужающийся цилиндр (цвет коры с затемнением книзу)
function limb(A, a, b, r0, r1, col, seg = 6) {
  const d = b.clone().sub(a), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()), c0 = C(col), c1 = c0.clone().multiplyScalar(0.6);
  const ring = (t, r) => Array.from({ length: seg }, (_, i) => { const an = i / seg * 6.283, n = V(Math.cos(an), 0, Math.sin(an)).applyQuaternion(q); return { p: a.clone().addScaledVector(d, t).addScaledVector(n, r), n, u: NOUV, c: c1.clone().lerp(c0, Math.min(1, (a.y + d.y * t) / 1.5)) }; });
  const R0 = ring(0, r0), R1 = ring(1, r1);
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; A.tri([R0[i], R1[j], R0[j], R0[i], R1[i], R1[j]]); }
}
// ядро кучки — грубая капля (20 треугольников), чтобы сквозь листву не просвечивало
const ICO = new THREE.IcosahedronGeometry(1, 0).toNonIndexed().attributes.position;
function core(A, c, rad, colOf, nrm) {
  for (let i = 0; i < ICO.count; i += 3) { const vs = [0, 1, 2].map(k => { const p = V(ICO.getX(i + k), ICO.getY(i + k) * 0.8, ICO.getZ(i + k)).multiplyScalar(rad).add(c); return { p, n: nrm(p), u: NOUV, c: colOf(p) }; }); A.tri(vs); }
}

// ---------- лиственное: ствол с ветками, крона из лопастей, каждая из мелких кучек ----------
function broad(o, r) {
  const A = Acc(), H = o.h, Rw = H * o.w, ctr = V(0, H * 0.66, 0), y0 = H * 0.38, y1 = H * 1.02;
  limb(A, V(0, 0, 0), V(0, H * 0.4, 0), H * 0.06, H * 0.04, o.bark, 7);
  const lobes = [[ctr.clone().add(V(0, H * 0.1, 0)), Rw * 0.62]];
  for (let i = 0; i < o.lobes; i++) { const a = i / o.lobes * 6.28 + r() * 0.7, d = Rw * (0.35 + r() * 0.15); lobes.push([V(Math.cos(a) * d, ctr.y + (r() - 0.45) * H * 0.22, Math.sin(a) * d), Rw * (0.42 + r() * 0.15)]); }
  for (const [c] of lobes.slice(1)) { const s = V(0, H * (0.3 + r() * 0.1), 0); limb(A, s, s.clone().lerp(c, 0.85), H * 0.03, H * 0.012, o.bark, 5); }
  const dk = C(o.pal[0]), md = C(o.pal[1]), lt = C(o.pal[2]), hi = C(o.pal[3] ?? o.pal[2]);
  const clumps = [];
  for (const [lc, lr] of lobes) for (let i = 0; i < o.clumps; i++) {
    const a = r() * 6.28, el = Math.asin(r() * 1.7 - 0.7), dd = lr * (0.5 + r() * 0.4);
    clumps.push([V(Math.cos(a) * Math.cos(el), Math.sin(el) * 0.85, Math.sin(a) * Math.cos(el)).multiplyScalar(dd).add(lc), Rw * o.cr * (0.8 + r() * 0.4)]);
  }
  for (const [c, cr] of clumps) {
    const jit = { h: (r() - 0.5) * o.jh, s: (r() - 0.5) * 0.12, l: (r() - 0.5) * 0.07 }, out = Math.min(1, c.clone().sub(ctr).length() / Rw);
    const colOf = (p, lift = 0) => { const loc = sm(-0.9, 1, (p.y - c.y) / cr), g = sm(y0, y1, p.y); const kk = Math.min(1, loc * 0.5 + g * 0.3 + out * 0.3 + lift - 0.08 + (p.x + p.z) * 0.015);
      const cc = kk < 0.4 ? dk.clone().lerp(md, kk / 0.4) : kk < 0.8 ? md.clone().lerp(lt, (kk - 0.4) / 0.4) : lt.clone().lerp(hi, (kk - 0.8) / 0.2); return cc.offsetHSL(jit.h, jit.s, jit.l); };
    const nrm = p => p.clone().sub(c).normalize().multiplyScalar(0.6).add(p.clone().sub(ctr).normalize().multiplyScalar(0.55)).normalize();
    core(A, c, cr * 0.5, p => colOf(p, -0.25).lerp(dk, 0.35).lerp(md.clone().lerp(dk, 0.4), 0.6), nrm);
    const n0 = c.clone().sub(ctr).normalize();
    for (let i = 0; i < o.cards; i++) {
      const dir = n0.clone().add(V(r() - 0.5, r() - 0.3, r() - 0.5).multiplyScalar(1.1)).normalize(), U_ = V(0, 1, 0).cross(dir); if (U_.lengthSq() < 1e-3) U_.set(1, 0, 0); U_.normalize(); const V_ = dir.clone().cross(U_).normalize();
      const rot = (r() - 0.5) * 0.8, s = cr * (1.1 + r() * 0.3), Uu = U_.clone().multiplyScalar(Math.cos(rot)).addScaledVector(V_, Math.sin(rot)).multiplyScalar(s), Vv = V_.clone().multiplyScalar(Math.cos(rot)).addScaledVector(U_, -Math.sin(rot)).multiplyScalar(s);
      const p = c.clone().addScaledVector(dir, cr * 0.25);
      quad(A, p, Uu, Vv, nrm, [colOf(p.clone().sub(Vv)), colOf(p.clone().add(Vv))], 0);
    }
  }
  return A.geo();
}
// ---------- ель: тёмный конус + много лап по спирали; лапы смотрят вверх-наружу (сверху видна светлая хвоя) ----------
function fir(o, r) {
  const A = Acc(), H = o.h, W = H * o.w, yb = H * 0.07, dk = C(o.pal[0]), md = C(o.pal[1]), lt = C(o.pal[2]), hi = C(o.pal[3] ?? o.pal[2]);
  const Rof = y => W * Math.pow(Math.max(0, 1 - (y - yb) / (H - yb)), o.shape ?? 0.9) + 0.05;
  limb(A, V(0, 0, 0), V(0, H * 0.35, 0), H * 0.035, H * 0.025, 0x4a3424, 6);
  // конус-ядро
  const seg = 12, rings = 8;
  for (let k = 0; k < rings; k++) for (let i = 0; i < seg; i++) {
    const P = (kk, ii) => { const y = yb + (H * 0.86 - yb) * kk / rings, a = ii / seg * 6.283, rr = Rof(y) * 0.55; const p = V(Math.cos(a) * rr, y, Math.sin(a) * rr); return { p, n: V(Math.cos(a), 0.5, Math.sin(a)).normalize(), u: NOUV, c: dk.clone().lerp(md, 0.25 + 0.2 * kk / rings) }; };
    A.tri([P(k, i), P(k + 1, i + 1), P(k, i + 1), P(k, i), P(k + 1, i), P(k + 1, i + 1)]);
  }
  // лапы мутовками (ярусами): между ярусами видна тёмная щель — ель читается «полками», как на референсе
  const tiers = o.tiers, list = [];
  for (let w = 0; w < tiers; w++) { const tw = w / (tiers - 1), m = Math.round(o.boughs / tiers * (1.5 - tw)); for (let j = 0; j < m; j++) list.push([tw, (j + r() * 0.6) / m * 6.283 + w * 1.3]); }
  // кончик — пучок мелких лап
  for (let j = 0; j < 5; j++) list.push([1.04, j / 5 * 6.283 + r()]);
  for (const [tw, an] of list) {
    const t = Math.min(1, tw), y = yb + 0.2 + Math.pow(t, 0.95) * (H * 0.96 - yb - 0.2) + (r() - 0.5) * 0.12 - (tw > 1 ? 0.25 : 0), R = Math.max(0.22, Rof(y - 0.1)), a = an, ca = Math.cos(a), sa = Math.sin(a);
    const L = tw > 1 ? 0.32 : R * (0.95 + r() * 0.25), droop = tw > 1 ? 2.2 : -(0.32 + r() * 0.18) * (1 - t * 0.4), dir = V(ca, droop, sa).normalize(), side = V(-sa, 0, ca);
    const base = V(ca * R * 0.05, y, sa * R * 0.05), mid = base.clone().addScaledVector(dir, L * 0.5);
    const wv = side.clone().multiplyScalar(L * 0.5).applyAxisAngle(dir, (r() - 0.5) * 0.9);
    const up = V(ca * 0.55, 1, sa * 0.55).normalize(), lv = Math.min(1, 0.3 + t * 0.3 + (ca + sa) * 0.12 + r() * 0.2);
    const jit = (r() - 0.5) * 0.06, cBase = dk.clone().lerp(md, 0.35).offsetHSL(0, 0, jit), cTip = (lv > 0.55 ? lt.clone().lerp(hi, (lv - 0.55) * 2) : md.clone().lerp(lt, lv / 0.55)).offsetHSL(0, 0, jit);
    // лапа: длина вдоль dir (v картинки), ширина поперёк
    const Vv = dir.clone().multiplyScalar(L * 0.5);
    quad(A, mid, wv, Vv, () => up, [cBase, cTip], 1);
  }
  return A.geo();
}
// ---------- куст: полусфера из кучек, с цветами ----------
function bush(o, r) {
  const A = Acc(), H = o.h, Rw = H * o.w, ctr = V(0, H * 0.35, 0), dk = C(o.pal[0]), md = C(o.pal[1]), lt = C(o.pal[2]), hi = C(o.pal[3] ?? o.pal[2]);
  for (let i = 0; i < o.clumps; i++) {
    const a = r() * 6.28, el = Math.asin(r() * 0.95), d = Rw * (0.55 + r() * 0.4), c = V(Math.cos(a) * Math.cos(el) * d, H * 0.25 + Math.sin(el) * d * 0.8, Math.sin(a) * Math.cos(el) * d), cr = Rw * o.cr * (0.8 + r() * 0.4);
    const jit = (r() - 0.5) * 0.07, colOf = (p, lift = 0) => { const kk = Math.min(1, sm(-0.9, 1, (p.y - c.y) / cr) * 0.55 + sm(0, H, p.y) * 0.35 + lift + (p.x + p.z) * 0.03); return (kk < 0.5 ? dk.clone().lerp(md, kk * 2) : md.clone().lerp(lt, (kk - 0.5) * 2)).offsetHSL(0, 0, jit); };
    const nrm = p => p.clone().sub(c).normalize().multiplyScalar(0.6).add(p.clone().sub(ctr).normalize().multiplyScalar(0.5)).normalize();
    core(A, c, cr * 0.6, p => colOf(p, -0.15), nrm);
    const n0 = c.clone().sub(ctr).normalize();
    for (let k = 0; k < o.cards; k++) {
      const dir = n0.clone().add(V(r() - 0.5, r() - 0.3, r() - 0.5)).normalize(), U_ = V(0, 1, 0).cross(dir).normalize(), V_ = dir.clone().cross(U_).normalize(), s = cr * (0.95 + r() * 0.3);
      const p = c.clone().addScaledVector(dir, cr * 0.25); quad(A, p, U_.multiplyScalar(s), V_.multiplyScalar(s), nrm, [colOf(p.clone().addScaledVector(V_, -1)), colOf(p.clone().addScaledVector(V_, 1))], 0);
    }
    if (o.flowers && r() < 0.6) for (let f = 0; f < 3; f++) { const fp = c.clone().add(V(r() - 0.5, 0.6, r() - 0.5).normalize().multiplyScalar(cr * 0.95)), fc = C(o.flowers).offsetHSL(0, 0, (r() - 0.5) * 0.1);
      core(A, fp, 0.045, () => fc, () => V(0, 1, 0)); }
  }
  return A.geo();
}

export const KINDS = {
  fir: { name: 'Ель', type: 'fir', h: 5.4, w: 0.24, boughs: 240, tiers: 12, pal: [0x0e2414, 0x2a5a26, 0x7cb848, 0xc8e890], seed: 11 },
  firb: { name: 'Ель тёмная', type: 'fir', h: 4.6, w: 0.25, boughs: 210, tiers: 10, pal: [0x0a1c18, 0x1c4436, 0x4c8466, 0x9cc4a8], seed: 31, shape: 0.85 },
  broad: { name: 'Лиственное', type: 'broad', h: 4.8, w: 0.36, lobes: 5, clumps: 9, cr: 0.27, cards: 5, jh: 0.03, pal: [0x1c3a10, 0x4a8a28, 0x9cd048, 0xe4f8a0], bark: 0x5a4030, seed: 5 },
  autumn: { name: 'Осеннее', type: 'broad', h: 4.4, w: 0.37, lobes: 6, clumps: 11, cr: 0.27, cards: 5, jh: 0.04, pal: [0x5a200a, 0xb85a1c, 0xf0a040, 0xffe0a0], bark: 0x4a3426, seed: 21 },
  bush: { name: 'Куст', type: 'bush', h: 1.2, w: 0.75, clumps: 18, cr: 0.32, cards: 4, pal: [0x1c3a10, 0x4a8a28, 0xa8d850], flowers: 0xfff6ff, seed: 3 },
};
export function buildGeo(kind) { const o = KINDS[kind], r = rng(o.seed); return o.type === 'fir' ? fir(o, r) : o.type === 'bush' ? bush(o, r) : broad(o, r); }
let MAT = null;
export function mat() { return MAT || (MAT = toon(0xffffff, { vc: true, rim: 0.12, rimColor: 0xe8ffb0, side: THREE.DoubleSide, ao: SHADOW.groundAO, aoH: 0.9, map: tex2(), alphaTest: 0.5 })); }
// тень карточки — от простой формы (только камера тени её видит): конус ели, шар кроны со стволом, полушарие куста
export function shadowGeo(kind) {
  const o = KINDS[kind], H = o.h, parts = [];
  if (o.type === 'fir') { const g = new THREE.ConeGeometry(H * o.w * 0.95, H * 0.92, 8, 1); g.translate(0, H * 0.07 + H * 0.46, 0); parts.push(g); }
  else if (o.type === 'bush') { const g = new THREE.SphereGeometry(H * o.w * 0.9, 8, 5); g.scale(1, 0.7, 1); g.translate(0, H * 0.35, 0); parts.push(g); }
  else { const c = new THREE.SphereGeometry(H * o.w * 0.95, 10, 6); c.scale(1, 0.8, 1); c.translate(0, H * 0.7, 0); const t = new THREE.CylinderGeometry(H * 0.04, H * 0.06, H * 0.45, 6); t.translate(0, H * 0.22, 0); parts.push(c, t); }
  const pos = []; for (const g of parts) { const n = g.index ? g.toNonIndexed() : g; pos.push(...n.attributes.position.array); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
}
/** дерево целиком (меш) — для снимка в атлас */
export function makeTree(kind) { const m = new THREE.Mesh(buildGeo(kind), mat()); const g = new THREE.Group(); g.add(m); return g; }
