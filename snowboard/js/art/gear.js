// Снаряжение: доска с боковым вырезом и подъёмом носа, ботинок со сгибом в голеностопе,
// крепление (диск с делениями, база, хилкап, хайбэк, стрепы с трещотками).
// Система ноги: X — к носу доски (с поворотом крепления), Y — вверх, Z — к носкам.
import * as THREE from 'three';
import { loft, shell, skinned, curve, superPt, smooth, lerp, clamp, V3 } from './kit.js';

// ---------------------------------------------------------------- доска
const BL = 0.775, BE = 0.6, BW = 0.125, BWAIST = 0.1175, BT = 0.013, RISE = 0.068;
const halfW = (x) => {
  const a = Math.abs(x);
  if (a <= BE) return BWAIST + (BW - BWAIST) * (a / BE) ** 2;
  const q = Math.min(1, (a - BE) / (BL - BE));
  return BW * Math.max(0, 1 - q ** 3.2) ** (1 / 3.2);
};
const riseY = (x) => { const a = Math.abs(x), k0 = BE - 0.07; return a < k0 ? 0 : RISE * ((a - k0) / (BL - k0)) ** 2.1; };
export const BOARD_TOP = BT;

let BOARD = null;
// Группы: 0 — топшит, 1 — скользяк, 2 — боковина, 3 — стальной кант
export function boardGeo() {
  if (BOARD) return BOARD;
  const xs = [], tipN = 24;
  for (let i = 0; i <= tipN; i++) xs.push(-BL + (BL - BE) * (1 - Math.cos((i / tipN) * Math.PI / 2)));
  for (let x = -BE + 0.025; x < BE - 0.001; x += 0.025) xs.push(x);
  for (let i = tipN; i >= 0; i--) xs.push(BL - (BL - BE) * (1 - Math.cos((i / tipN) * Math.PI / 2)));
  const NZ = 10, nx = xs.length, pos = [], uv = [];
  const put = (x, y, z, u, v) => { pos.push(x, y, z); uv.push(u, v); return pos.length / 3 - 1; };
  const grid = (top) => {
    const base = pos.length / 3, out = [];
    for (const x of xs) {
      const h = halfW(x) * (top ? 0.97 : 0.996), y = riseY(x) + (top ? BT : 0);
      for (let j = 0; j <= NZ; j++) { const z = h * (2 * j / NZ - 1); put(x, y, z, (x + BL) / (2 * BL), (z / BW + 1) / 2); }
    }
    for (let i = 0; i < nx - 1; i++) for (let j = 0; j < NZ; j++) {
      const a = base + i * (NZ + 1) + j, b = a + NZ + 1, c = a + 1, d = b + 1;
      if (top) out.push(a, c, b, c, d, b); else out.push(a, b, c, c, b, d);
    }
    return out;
  };
  const topIdx = grid(true), baseIdx = grid(false);
  // боковина по контуру: фаска → боковина → кант
  const loop = [];
  for (let i = 0; i < nx; i++) loop.push([xs[i], 1]);
  for (let i = nx - 1; i >= 0; i--) loop.push([xs[i], -1]);
  const sideBase = pos.length / 3, L = loop.length;
  loop.forEach(([x, sg], k) => {
    const h = halfW(x), y = riseY(x), u = k / L;
    put(x, y + BT, sg * h * 0.97, u, 0); put(x, y + BT - 0.0035, sg * h, u, 0.33);
    put(x, y + 0.0028, sg * h, u, 0.66); put(x, y, sg * h * 0.996, u, 1);
  });
  const sideIdx = [], edgeIdx = [];
  for (let k = 0; k < L; k++) for (let p = 0; p < 3; p++) {
    const a = sideBase + k * 4 + p, b = sideBase + ((k + 1) % L) * 4 + p;
    (p < 2 ? sideIdx : edgeIdx).push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const all = [...topIdx, ...baseIdx, ...sideIdx, ...edgeIdx];
  g.setIndex(all);
  let o = 0;
  [topIdx, baseIdx, sideIdx, edgeIdx].forEach((a, i) => { g.addGroup(o, a.length, i); o += a.length; });
  g.computeVertexNormals();
  BOARD = g;
  return g;
}

// ---------------------------------------------------------------- ботинок
// Профиль по высоте: [y, перед z, зад z, полуширина]
const BOOT = curve([
  [0.026, 0.150, -0.131, 0.0595],
  [0.034, 0.151, -0.132, 0.0615],
  [0.046, 0.152, -0.134, 0.0640],
  [0.060, 0.148, -0.135, 0.0645],
  [0.074, 0.136, -0.134, 0.0635],
  [0.088, 0.114, -0.131, 0.0615],
  [0.102, 0.090, -0.125, 0.0600],
  [0.118, 0.070, -0.116, 0.0600],
  [0.136, 0.058, -0.107, 0.0620],
  [0.160, 0.053, -0.101, 0.0645],
  [0.210, 0.055, -0.099, 0.0670],
  [0.255, 0.060, -0.101, 0.0700],
  [0.272, 0.060, -0.100, 0.0700],
]);
export const ANKLE_Y = 0.112;
export const BOOT_TOP = 0.288;
// Точка на поверхности ботинка: φ от +X к +Z (π/2 — носок, −π/2 — пятка)
export function bootPt(phi, y, push = 0) {
  const [zf, zb, sw] = BOOT(Math.min(y, 0.272));
  const [x, z] = superPt(phi, sw + push, (zf - zb) / 2 + push, (zf - zb) / 2 + push, 2.6);
  return V3(x, y, (zf + zb) / 2 + z);
}
// Точка, сдвинутая по нормали поверхности ботинка (для стрепов и хайбэка)
export function bootSurf(phi, y, off) {
  const p = bootPt(phi, y), e = 1e-3;
  const dp = bootPt(phi + e, y).sub(bootPt(phi - e, y));
  const dy = bootPt(phi, y + e).sub(bootPt(phi, y - e));
  return p.addScaledVector(dy.cross(dp).normalize(), off);
}

let BOOT_GEO = null;
export function bootGeo() {
  if (BOOT_GEO) return BOOT_GEO;
  const ys = [0.026];
  for (let y = 0.032; y < 0.27; y += 0.0075) ys.push(y);
  const top = [[0.272, 1], [0.279, 0.97], [0.284, 0.9], [0.287, 0.72], [0.288, 0]];
  const rings = [...ys.map((y) => [y, 1]), ...top];
  const g = loft(rings.length, 40, (i, u) => {
    const [y, k] = rings[i];
    const phi = u * Math.PI * 2 - Math.PI / 2;
    const p = bootPt(phi, Math.min(y, 0.272));
    const c = bootPt(0, Math.min(y, 0.272)).add(bootPt(Math.PI, Math.min(y, 0.272))).multiplyScalar(0.5);
    return [c.x + (p.x - c.x) * k, y, c.z + (p.z - c.z) * k];
  }, { v: (i) => rings[i][0] / BOOT_TOP });
  BOOT_GEO = g;
  return g;
}

function soleGeo(push, y0, y1) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 64; i++) {
    const p = bootPt((i / 64) * Math.PI * 2, 0.034, push);
    if (i === 0) s.moveTo(p.x, -p.z); else s.lineTo(p.x, -p.z);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0 - 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0 + 0.003, 0);
  return g;
}

let BIND = null;
function bindingGeos() {
  if (BIND) return BIND;
  // база: суперэллипс с окном под диск
  const base = new THREE.Shape();
  for (let i = 0; i <= 64; i++) {
    const [x, z] = superPt((i / 64) * Math.PI * 2, 0.074, 0.128, 0.142, 3);
    if (i === 0) base.moveTo(x, -(z - 0.006)); else base.lineTo(x, -(z - 0.006));
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.046, 0, Math.PI * 2, true); base.holes.push(hole);
  const baseG = new THREE.ExtrudeGeometry(base, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 24 });
  baseG.rotateX(-Math.PI / 2); baseG.translate(0, 0.002, 0);
  // хилкап — стенка вокруг пятки
  const SPAN = 1.65;
  const heel = shell((s, t) => {
    const a = (s * 2 - 1) * SPAN, phi = -Math.PI / 2 + a;
    const h = 0.05 + 0.042 * Math.cos((a / SPAN) * Math.PI / 2) ** 0.7;
    return bootPt(phi, lerp(0.008, h, t), 0.009);
  }, 28, 3, 0.0065);
  // хайбэк: изогнутая пластина за икрой; наклоняется вместе с голенищем (кости ботинка)
  const hb = shell((s, t) => {
    const span = lerp(1.32, 0.92, t), a = (s * 2 - 1) * span;
    const yTop = 0.292 - 0.055 * Math.abs(a / span) ** 3.5;
    const y = lerp(0.04, yTop, t);
    return bootPt(-Math.PI / 2 + a, y, 0.013 + 0.008 * t ** 3);
  }, 24, 12, 0.007);
  // стрепы по поверхности ботинка: центр линии φ(s), высота y(φ), ширина в «развёртке»
  const strap = (phi0, span, yLow, yHigh, pw, width, thick) => shell((s, t) => {
    const at = (ss) => { const a = (ss * 2 - 1) * span; return [phi0 + a, yLow + (yHigh - yLow) * Math.cos((a / span) * Math.PI / 2) ** pw]; };
    const [p0, y0] = at(s), [p1, y1] = at(Math.min(1, s + 0.01)), [pm, ym] = at(Math.max(0, s - 0.01));
    const tx = (p1 - pm) * 0.075, ty = y1 - ym, l = Math.hypot(tx, ty) || 1;
    const w = (t - 0.5) * width;
    return bootSurf(p0 + (-ty / l) * w / 0.075, y0 + (tx / l) * w, thick / 2 + 0.0025);
  }, 36, 4, (s, t) => thick * (0.55 + 0.45 * Math.sin(Math.PI * t)));
  const ankle = strap(Math.PI / 2, 1.74, 0.042, 0.116, 0.5, 0.042, 0.013);
  const toe = strap(Math.PI / 2, 1.0, 0.046, 0.066, 0.9, 0.022, 0.008);
  BIND = { baseG, heel, hb, ankle, toe, strapAt: (phi0, span, yLow, yHigh, pw, s) => {
    const a = (s * 2 - 1) * span, phi = phi0 + a, y = yLow + (yHigh - yLow) * Math.cos((a / span) * Math.PI / 2) ** pw;
    return { p: bootSurf(phi, y, 0.018), n: bootSurf(phi, y, 1).sub(bootPt(phi, y)).normalize(), phi };
  } };
  return BIND;
}

// Нога целиком: ботинок (2 кости: стопа и голенище), подошва, крепление.
// side = +1 для передней ноги (наружу — к носу доски), −1 для задней.
export class Foot {
  constructor(group, mats, { side = 1, ghost = false } = {}) {
    this.group = group; this.side = side;
    const add = (m, parent = group) => { m.castShadow = !ghost; m.receiveShadow = !ghost; parent.add(m); return m; };
    // ботинок
    this.footBone = new THREE.Bone(); this.shaftBone = new THREE.Bone();
    this.shaftBone.position.set(0, ANKLE_Y, 0);
    group.add(this.footBone, this.shaftBone);
    const g = bootGeo();
    const rest = [new THREE.Matrix4(), new THREE.Matrix4().makeTranslation(0, ANKLE_Y, 0)];
    const ankleW = (v) => { const w = smooth(0.112, 0.17, v.y); return [[0, 1 - w], [1, w]]; };
    add(skinned(g, mats.boot, [this.footBone, this.shaftBone], rest, ankleW));
    Foot.soleG ||= [soleGeo(0.006, 0.0, 0.016), soleGeo(0.0045, 0.014, 0.036)];
    add(new THREE.Mesh(Foot.soleG[0], mats.sole)); add(new THREE.Mesh(Foot.soleG[1], mats.midsole));
    const B = bindingGeos();
    // диск с делениями — неподвижен относительно доски
    this.disc = new THREE.Group(); group.add(this.disc);
    Foot.discG ||= new THREE.CylinderGeometry(0.05, 0.05, 0.007, 40);
    const disc = add(new THREE.Mesh(Foot.discG, mats.disc), this.disc); disc.position.y = -0.0005;
    add(new THREE.Mesh(B.baseG, mats.binding));
    add(new THREE.Mesh(B.heel, mats.binding));
    // хайбэк прилегает к голенищу: так икра и штанина не проходят сквозь него
    add(skinned(B.hb, mats.highback, [this.footBone, this.shaftBone], rest, ankleW));
    add(skinned(B.ankle, mats.strap, [this.footBone, this.shaftBone], rest, ankleW));
    add(new THREE.Mesh(B.toe, mats.strap));
    if (!ghost) {
      Foot.screwG ||= new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 10);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4, s = new THREE.Mesh(Foot.screwG, mats.metal);
        s.position.set(Math.cos(a) * 0.027, 0.004, Math.sin(a) * 0.027); this.disc.add(s);
      }
      // трещотки — с внутренней стороны стопы
      Foot.ratchetG ||= [new THREE.BoxGeometry(0.036, 0.011, 0.024), new THREE.BoxGeometry(0.03, 0.006, 0.012)];
      const inner = side > 0 ? 0.83 : 0.17;
      for (const [args, w] of [[[Math.PI / 2, 1.74, 0.042, 0.116, 0.5], 0.022], [[Math.PI / 2, 1.0, 0.046, 0.066, 0.9], 0.016]]) {
        const { p, n } = B.strapAt(...args, inner);
        const t = B.strapAt(...args, inner + 0.01).p.sub(p).normalize();
        const r = new THREE.Group();
        r.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, n, t.clone().cross(n)));
        r.position.copy(p);
        const box = new THREE.Mesh(Foot.ratchetG[0], mats.ratchet); box.scale.z = w / 0.024; r.add(box);
        const lever = new THREE.Mesh(Foot.ratchetG[1], mats.metal); lever.position.y = 0.007; lever.rotation.z = 0.12; r.add(lever);
        add(r);
      }
      // колёсико BOA на внешней стороне голенища
      Foot.boaG ||= [new THREE.CylinderGeometry(0.019, 0.02, 0.011, 24), new THREE.TorusGeometry(0.0185, 0.0025, 6, 24)];
      const phi = side > 0 ? 0.25 : Math.PI - 0.25, y = 0.19;
      const p = bootSurf(phi, y, 0.004), n = bootSurf(phi, y, 1).sub(bootPt(phi, y)).normalize();
      const boa = new THREE.Group();
      boa.add(new THREE.Mesh(Foot.boaG[0], mats.sole));
      const ring = new THREE.Mesh(Foot.boaG[1], mats.accent); ring.rotation.x = Math.PI / 2; ring.position.y = 0.004; boa.add(ring);
      boa.quaternion.setFromUnitVectors(V3(0, 1, 0), n);
      boa.position.copy(p).sub(V3(0, ANKLE_Y, 0));
      add(boa, this.shaftBone);
    }
  }

  // shin — направление голени (от лодыжки к колену) в системе ноги; angle — поворот крепления
  update(shin, angle) {
    const fwd = clamp(Math.atan2(shin.z, shin.y), 0.05, 0.8);
    const sideT = clamp(Math.atan2(shin.x, shin.y) * 0.9, -0.28, 0.28);
    const d = V3(Math.tan(sideT), 1, Math.tan(fwd)).normalize();
    this.shaftBone.quaternion.setFromUnitVectors(V3(0, 1, 0), d);
    this.disc.rotation.y = -angle;
  }
}
