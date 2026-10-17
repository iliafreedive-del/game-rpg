// Тренировка лёгких деревьев и кустов (15 октября): три способа одного и того же дерева рядом, под камерой игры.
//  a — «меш»: облака-капли с вершинным цветом, без текстуры (самый лёгкий);
//  c — «листва-карточки»: та же форма, но крона из квадратиков с чёткой картинкой листьев + тёмное ядро (пушистый край, как на референсе);
//  b — «картинка»: дерево c, один раз снятое под углом камеры игры, на 2 треугольниках (импостор).
// Всё строится кодом: файлов моделей нет, текстура листвы рисуется на canvas (512 × 256).
import * as THREE from '../js/vendor/three.module.min.js';
import { mergeGeometries } from '../js/vendor/BufferGeometryUtils.js';
import { toon, U } from '../js/render3d/toon.js';
import { LIGHT, CAMERA, SHADOW } from '../js/render3d/style.js';

const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const C = h => new THREE.Color(h);

// ---------- текстура листвы: слева кучка листьев, справа хвойная лапа; серая (цвет даёт вершина), альфа чёткая ----------
let LEAF = null;
export function leafTex(px = 256) {
  if (LEAF) return LEAF;
  const cv = document.createElement('canvas'); cv.width = px * 2; cv.height = px; const g = cv.getContext('2d'), r = rng(7), S = px / 256;
  // кучка листьев: плотное ядро + листья по краю (край неровный — силуэт «пушистый»)
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * 112 * S, x = 128 * S + Math.cos(a) * d, y = 128 * S + Math.sin(a) * d * 0.92;
    const v = 150 + 105 * (1 - y / (256 * S)) * (0.6 + 0.4 * r()), L = (15 + r() * 9) * S, W = L * 0.7;
    g.save(); g.translate(x, y); g.rotate(a + (r() - 0.5) * 1.2 + Math.PI / 2);
    g.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; g.beginPath(); g.moveTo(0, -L); g.quadraticCurveTo(W, 0, 0, L * 0.6); g.quadraticCurveTo(-W, 0, 0, -L); g.fill();
    g.restore();
  }
  // хвойная лапа: стебель снизу вверх, иглы в стороны, к концу короче
  const ox = px;
  for (let k = 0; k < 3; k++) {
    const sx = ox + (42.7 + k * 85.3) * S, top = (14 + r() * 20) * S, bot = 250 * S;
    for (let y = bot; y > top; y -= 3.2 * S) {
      const t = (bot - y) / (bot - top), len = (38 - 26 * t) * S * (0.8 + 0.4 * r()), v = 140 + 110 * t * (0.7 + 0.3 * r());
      g.strokeStyle = `rgb(${v | 0},${v | 0},${v | 0})`; g.lineWidth = 2.6 * S; g.lineCap = 'round';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(sx, y); g.lineTo(sx + s * len, y - len * 0.55); g.stroke(); }
    }
    g.strokeStyle = 'rgb(110,110,110)'; g.lineWidth = 3.5 * S; g.beginPath(); g.moveTo(sx, bot); g.lineTo(sx, top); g.stroke();
  }
  // альфа — порог (без полупрозрачной каймы: она и даёт «мыло» при alphaTest)
  const im = g.getImageData(0, 0, cv.width, cv.height), D = im.data;
  for (let i = 3; i < D.length; i += 4) D[i] = D[i] > 110 ? 255 : 0;
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return (LEAF = t);
}

// ---------- помощники геометрии ----------
function paint(g, fn) {   // вершинный цвет: fn(x, y, z, out Color)
  const P = g.attributes.position, col = new Float32Array(P.count * 3), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) { fn(P.getX(i), P.getY(i), P.getZ(i), c, i); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
const strip = g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2).fill(0.002), 2)); return g.index ? g.toNonIndexed() : g; };
// ствол / ветка: сужающийся цилиндр от a до b
function limb(a, b, r0, r1, col, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length(), g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, true);
  g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  const c0 = C(col), c1 = c0.clone().multiplyScalar(0.62);
  return paint(g, (x, y, z, c) => c.copy(c1).lerp(c0, Math.min(1, y / 1.2)));
}
// нормали «как у облака»: от центра кроны (свет ложится на всю крону как на один шар, без мелкой ряби граней)
function cloudNormals(g, ctr, k = 0.75) {
  const P = g.attributes.position, N = g.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).sub(ctr).normalize(); n.fromBufferAttribute(N, i); n.lerp(v, k).normalize(); N.setXYZ(i, n.x, n.y, n.z); }
}
// раскраска кроны: снизу и внутри темно, сверху и снаружи светло, у каждой капли свой оттенок
function crownColor(pal, ctr, R, y0, y1, bc, br) {
  const dk = C(pal[0]), md = C(pal[1]), lt = C(pal[2]);
  return (x, y, z, c, jit) => {
    const h = Math.min(1, Math.max(0, (y - y0) / (y1 - y0))), out = Math.min(1, Math.hypot(x - ctr.x, (y - ctr.y) * 0.8, z - ctr.z) / R);
    // своя светотень у каждой «шапки» листвы: верх светлый, низ тёмный — крона читается кучками, как на референсе
    const loc = bc ? Math.min(1, Math.max(0, ((y - bc.y) / br + 0.7) / 1.5)) : h;
    const k = Math.min(1, Math.max(0, loc * 0.75 + h * 0.25 + out * 0.25 - 0.05 + (x + z) * 0.02));
    if (k < 0.5) c.copy(dk).lerp(md, k * 2); else c.copy(md).lerp(lt, (k - 0.5) * 2);
    c.offsetHSL(jit.h, jit.s, jit.l);
  };
}

// ---------- формы (общие для всех способов) ----------
// лиственное: ствол с 3–4 ветками, крона из капель
function broadPlan(r, o) {
  const H = o.h, blobs = [], trunkTop = new THREE.Vector3(0, H * 0.42, 0), limbs = [[new THREE.Vector3(0, 0, 0), trunkTop, H * 0.07, H * 0.045]];
  const nb = 4;
  for (let i = 0; i < nb; i++) {
    const a = i / nb * Math.PI * 2 + r() * 0.8, up = H * (0.25 + r() * 0.2), out = H * (0.14 + r() * 0.1);
    const s = new THREE.Vector3(0, H * (0.3 + r() * 0.12), 0), e = new THREE.Vector3(Math.cos(a) * out, s.y + up, Math.sin(a) * out); limbs.push([s, e, H * 0.035, H * 0.018]);
  }
  const ctr = new THREE.Vector3(0, H * 0.68, 0), R = H * o.w;
  blobs.push([ctr.clone().add(new THREE.Vector3(0, H * 0.12, 0)), R * 0.62]);
  for (let i = 0; i < o.blobs; i++) {
    const a = r() * Math.PI * 2, el = (r() - 0.35) * 1.2, d = R * (0.45 + r() * 0.25);
    blobs.push([new THREE.Vector3(Math.cos(a) * Math.cos(el) * d, ctr.y + Math.sin(el) * d * 0.75, Math.sin(a) * Math.cos(el) * d), R * (0.38 + r() * 0.2)]);
  }
  return { limbs, blobs, ctr, R, y0: H * 0.35, y1: H * 1.05 };
}
// куст: капли у земли
function bushPlan(r, o) {
  const blobs = [], ctr = new THREE.Vector3(0, o.h * 0.45, 0), R = o.h * o.w;
  for (let i = 0; i < o.blobs; i++) { const a = i / o.blobs * Math.PI * 2 + r(), d = R * (0.3 + r() * 0.35); blobs.push([new THREE.Vector3(Math.cos(a) * d, o.h * (0.35 + r() * 0.25), Math.sin(a) * d), R * (0.45 + r() * 0.2)]); }
  blobs.push([ctr.clone().add(new THREE.Vector3(0, o.h * 0.15, 0)), R * 0.55]);
  return { limbs: [], blobs, ctr, R, y0: 0, y1: o.h * 1.1 };
}

// ---------- способ a: капли-меши ----------
function blobMesh(c, rad, r, det = 1) {
  const g = new THREE.IcosahedronGeometry(1, det), P = g.attributes.position;
  const seed = r() * 100, hj = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < P.count; i++) { const k = 1 + (hj(+P.getX(i).toFixed(3), +P.getY(i).toFixed(3), +P.getZ(i).toFixed(3)) - 0.5) * 0.3; P.setXYZ(i, P.getX(i) * rad * k + c.x, P.getY(i) * rad * k * 0.85 + c.y, P.getZ(i) * rad * k + c.z); }
  g.computeVertexNormals(); return g;
}
function crownA(plan, pal, r, det = 1) {
  const parts = [];
  for (const [c, rad] of plan.blobs) {
    const g = strip(blobMesh(c, rad, r, det)); g.computeVertexNormals(); cloudNormals(g, plan.ctr, 0.8);
    const jit = { h: (r() - 0.5) * 0.03, s: (r() - 0.5) * 0.1, l: (r() - 0.5) * 0.06 };
    const f = crownColor(pal, plan.ctr, plan.R, plan.y0, plan.y1, c, rad); parts.push(paint(g, (x, y, z, cc) => f(x, y, z, cc, jit)));
  }
  return parts;
}
// ---------- способ c: листва-карточки ----------
function crownC(plan, pal, r, o = {}) {
  const parts = [], q = new THREE.Vector3(), n = new THREE.Vector3(), tmpU = new THREE.Vector3(), tmpV = new THREE.Vector3();
  // тёмное ядро (не просвечивает насквозь), мельче листвы
  for (const [c, rad] of plan.blobs) {
    const g = strip(blobMesh(c, rad * 0.72, r, 0)); g.computeVertexNormals(); cloudNormals(g, plan.ctr, 0.8);
    const jit = { h: 0, s: 0, l: -0.08 }, f = crownColor(pal, plan.ctr, plan.R, plan.y0, plan.y1, c, rad); parts.push(paint(g, (x, y, z, cc) => f(x, y, z, cc, jit)));
  }
  const per = o.cards || 16;
  for (const [c, rad] of plan.blobs) {
    const jit = { h: (r() - 0.5) * 0.035, s: (r() - 0.5) * 0.1, l: (r() - 0.5) * 0.05 }, pos = [], nor = [], uv = [], col = [];
    const paintF = crownColor(pal, plan.ctr, plan.R, plan.y0, plan.y1, c, rad), cc = new THREE.Color();
    for (let i = 0; i < per; i++) {
      // точка на поверхности капли (чаще сверху и снаружи)
      const a = r() * Math.PI * 2, el = Math.asin(r() * 1.6 - 0.6), p = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el) * 0.85, Math.sin(a) * Math.cos(el)).multiplyScalar(rad * 0.88).add(c);
      n.copy(p).sub(plan.ctr).normalize();
      const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.9).add(n).normalize();   // плоскость карточки — примерно поперёк нормали
      tmpU.set(0, 1, 0).cross(dir); if (tmpU.lengthSq() < 1e-4) tmpU.set(1, 0, 0); tmpU.normalize(); tmpV.copy(dir).cross(tmpU).normalize();
      const rot = r() * Math.PI * 2, cs = Math.cos(rot), sn = Math.sin(rot), s = rad * (0.6 + r() * 0.3);
      const U_ = tmpU.clone().multiplyScalar(cs).addScaledVector(tmpV, sn).multiplyScalar(s), V_ = tmpV.clone().multiplyScalar(cs).addScaledVector(tmpU, -sn).multiplyScalar(s);
      const corners = [[-1, -1, 0, 0], [1, -1, 0.5, 0], [1, 1, 0.5, 1], [-1, 1, 0, 1]];
      const vs = corners.map(([x, y, u, v]) => [q.copy(p).addScaledVector(U_, x).addScaledVector(V_, y).toArray(), u, v]);
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [P3, u, v] = vs[k]; pos.push(...P3); uv.push(u * 0.98 + 0.005, v);
        q.fromArray(P3).sub(plan.ctr).normalize(); nor.push(q.x, q.y, q.z);
        paintF(P3[0], P3[1], P3[2], cc, jit); col.push(cc.r, cc.g, cc.b);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); parts.push(g);
  }
  return parts;
}

// ---------- ель: ярусы-«юбки» (a — гранёные, c — + хвойные лапы-карточки) ----------
function fir(r, o, cards) {
  const H = o.h, parts = [strip(limb(new THREE.Vector3(), new THREE.Vector3(0, H * 0.5, 0), H * 0.05, H * 0.03, 0x5a3d26))];
  const dk = C(o.pal[0]), md = C(o.pal[1]), lt = C(o.pal[2]);
  for (let t = 0; t < o.tiers; t++) {
    const k = t / (o.tiers - 1), y = H * (0.16 + 0.7 * k), R = H * o.w * (1 - k * 0.8) * (0.92 + r() * 0.16), h = H * 0.32 * (1 - k * 0.35), n = 11, rot = r() * 6;
    const pos = [], col = [], apex = [0, y + h, 0], ring = [], mid = [], under = [];
    for (let i = 0; i < n; i++) {
      const a = rot + i / n * Math.PI * 2, tip = i % 2 === 0, rr = R * (tip ? 1 : 0.74) * (0.9 + r() * 0.2);
      ring.push([Math.cos(a) * rr, y - (tip ? R * 0.16 : 0.02), Math.sin(a) * rr]);
      mid.push([Math.cos(a) * rr * 0.55, y + h * 0.45 + (r() - 0.5) * h * 0.1, Math.sin(a) * rr * 0.55]);
      under.push([Math.cos(a) * R * 0.3, y + h * 0.18, Math.sin(a) * R * 0.3]);
    }
    const sh = (p, base) => { const v = base.clone(); const lift = (p[1] - y) / (h + 0.01); v.offsetHSL(0, 0, (p[0] + p[2]) * 0.01 + lift * 0.02); return v; };
    const tri = (a, b, c, ca, cb, cc) => { pos.push(...a, ...b, ...c); for (const x of [ca, cb, cc]) col.push(x.r, x.g, x.b); };
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tri(apex, mid[j], mid[i], sh(apex, md), sh(mid[j], md), sh(mid[i], md));
      tri(mid[i], mid[j], ring[j], sh(mid[i], md), sh(mid[j], md), sh(ring[j], i % 2 ? lt : lt.clone().lerp(md, 0.3)));
      tri(mid[i], ring[j], ring[i], sh(mid[i], md), sh(ring[j], lt), sh(ring[i], lt));
      tri(ring[i], ring[j], under[j], dk, dk, dk); tri(ring[i], under[j], under[i], dk, dk, dk);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals(); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.length / 3 * 2).fill(0.002), 2));
    if (cards) cloudNormals(g, new THREE.Vector3(0, y - h, 0), 0.35);
    parts.push(g);
    if (cards) {   // хвойные лапы по краю яруса: от ствола наружу и вниз, нормаль «вверх-наружу»
      const P = [], N = [], UV = [], CO = [], m = 13 + (t < 3 ? 4 : 0);
      for (let i = 0; i < m; i++) {
        // лапа лежит на склоне яруса и торчит за его край: силуэт зубчатый, но тело ели — сплошной конус (без дыр)
        const a = rot + (i + r() * 0.5) / m * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), wdt = R * (0.28 + r() * 0.06);
        const base = new THREE.Vector3(ca * R * 0.4, y + h * 0.3, sa * R * 0.4), tip = new THREE.Vector3(ca * R * (1.1 + r() * 0.12), y - R * (0.1 + r() * 0.08), sa * R * (1.1 + r() * 0.12));
        const side = new THREE.Vector3(-sa, 0, ca), slot = (r() * 3) | 0, u0 = 0.5 + slot / 6 + 0.012, u1 = 0.5 + (slot + 1) / 6 - 0.012;
        const nn = new THREE.Vector3(ca * 0.8, 1, sa * 0.8).normalize(), tc = lt.clone().offsetHSL(0, 0, (r() - 0.5) * 0.05), bc2 = md.clone().lerp(dk, 0.25);
        const vs = [[base.clone().addScaledVector(side, -wdt * 0.6), u0, 0, bc2], [base.clone().addScaledVector(side, wdt * 0.6), u1, 0, bc2], [tip.clone().addScaledVector(side, wdt), u1, 1, tc], [tip.clone().addScaledVector(side, -wdt), u0, 1, tc]];
        for (const k of [0, 1, 2, 0, 2, 3]) { const [p, u, v, cc] = vs[k]; P.push(p.x, p.y, p.z); N.push(nn.x, nn.y, nn.z); UV.push(u, v); CO.push(cc.r, cc.g, cc.b); }
      }
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g2.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      g2.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g2.setAttribute('color', new THREE.Float32BufferAttribute(CO, 3)); parts.push(g2);
    }
  }
  return parts;
}

// ---------- набор пород ----------
export const KINDS = {
  fir: { name: 'Ель', h: 5.2, w: 0.31, tiers: 8, pal: [0x10261a, 0x24583a, 0x6aa850], seed: 11 },
  broad: { name: 'Лиственное', h: 4.6, w: 0.36, blobs: 9, pal: [0x1a3814, 0x46862a, 0xbce060], bark: 0x6a4a30, seed: 5 },
  autumn: { name: 'Осеннее', h: 4.2, w: 0.38, blobs: 9, pal: [0x7a3414, 0xd0702a, 0xffc860], bark: 0x5a3e2c, seed: 21 },
  bush: { name: 'Куст', h: 1.1, w: 0.62, blobs: 6, pal: [0x24481c, 0x4f8c30, 0xa8d450], seed: 3, flowers: 0xf4f0ff },
};
export function buildGeo(kind, method) {
  const o = KINDS[kind], r = rng(o.seed), cards = method !== 'a';
  let parts;
  if (kind === 'fir') parts = fir(r, o, cards);
  else {
    const plan = kind === 'bush' ? bushPlan(r, o) : broadPlan(r, o);
    parts = plan.limbs.map(([a, b, r0, r1]) => strip(limb(a, b, r0, r1, o.bark || 0x5a3d26)));
    parts.push(...(cards ? crownC(plan, o.pal, r, { cards: kind === 'bush' ? 14 : 20 }) : crownA(plan, o.pal, r)));
    if (o.flowers) {   // цветы: мелкие светлые капли поверх
      for (let i = 0; i < 9; i++) { const [c, rad] = plan.blobs[i % plan.blobs.length], a = r() * 6.3, e = 0.2 + r() * 1.1, p = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).multiplyScalar(rad * 0.98).add(c);
        const g = strip(new THREE.IcosahedronGeometry(0.06, 0)); g.translate(p.x, p.y, p.z); parts.push(paint(g, (x, y, z, cc) => cc.set(o.flowers))); }
    }
  }
  const g = mergeGeometries(parts.map(p => { const q = p.index ? p.toNonIndexed() : p; if (!q.attributes.normal) q.computeVertexNormals(); return q; }));
  return g;
}
export function mat(method) { return toon(0xffffff, { vc: true, rim: 0.12, rimColor: 0xe8ffb0, side: THREE.DoubleSide, ao: SHADOW.groundAO, aoH: 0.9, map: method === 'a' ? null : leafTex(), alphaTest: method === 'a' ? 0 : 0.5 }); }
export const bytesOf = g => Object.values(g.attributes).reduce((s, a) => s + a.array.byteLength, 0) + (g.index ? g.index.array.byteLength : 0);

// ---------- способ b: снимок под углом камеры игры (как карточки окраины деревни, forestglb.js) ----------
export function bakeCard(R, scene, obj, px) {
  const dir = new THREE.Vector3(Math.sin(CAMERA.yaw) * Math.cos(0.64), Math.sin(0.64), Math.cos(CAMERA.yaw) * Math.cos(0.64)), right = new THREE.Vector3(0, 1, 0).cross(dir).normalize(), up = dir.clone().cross(right).normalize();
  obj.updateMatrixWorld(true);
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; const v = new THREE.Vector3();
  obj.traverse(m => { if (!m.isMesh) return; const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); const a = v.dot(right), b = v.dot(up); u0 = Math.min(u0, a); u1 = Math.max(u1, a); v0 = Math.min(v0, b); v1 = Math.max(v1, b); } });
  const half = Math.max(u1 - u0, v1 - v0) / 2 * 1.04, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, -50, 50); cam.position.copy(dir).multiplyScalar(20).addScaledVector(right, cu).addScaledVector(up, cv); cam.up.copy(up); cam.lookAt(cam.position.clone().sub(dir));
  const rt = new THREE.WebGLRenderTarget(px, px, { samples: 4, colorSpace: THREE.SRGBColorSpace, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const sc = new THREE.Scene(); for (const l of scene.children) if (l.isLight) { const c = l.clone(); sc.add(c); if (c.target) { sc.add(c.target); c.target.position.copy(l.target.position); } }
  sc.add(obj); const pc = R.getClearColor(new THREE.Color()), pa = R.getClearAlpha(), sh = R.shadowMap.enabled;
  R.shadowMap.enabled = false; R.setRenderTarget(rt); R.setClearColor(0, 0); R.clear(); R.render(sc, cam); R.setRenderTarget(null); R.setClearColor(pc, pa); R.shadowMap.enabled = sh; sc.remove(obj);
  // прямоугольник поперёк взгляда, высота растянута на 1/cos(наклона) — на экране как 3D; низ картинки — на земле
  const sp = Math.sin(0.64), cp = Math.cos(0.64), D = Math.max(0, -(cv - half)) / sp, pos = [];
  for (const [a, b] of [[cu - half, cv - half], [cu + half, cv - half], [cu + half, cv + half], [cu - half, cv + half]]) { const p = right.clone().multiplyScalar(a); pos.push(p.x + Math.sin(CAMERA.yaw) * D, (b + D * sp) / cp, p.z + Math.cos(CAMERA.yaw) * D); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: rt.texture, alphaTest: 0.45, side: THREE.DoubleSide }));
  return { mesh: m, vram: px * px * 4 * 4 / 3 };
}
export { THREE, U, LIGHT, CAMERA };
