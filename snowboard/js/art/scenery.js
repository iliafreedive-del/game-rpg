// Окружение: небо, горные хребты с лесом у подножия, ели под снегом, рельеф по краям трассы,
// снег (вельвет на трассе, пухляк вне её) и фон студии.
import * as THREE from 'three';
import { loft, merge, paint, canvasTex, grain, rng, noise2, fbm, smooth, lerp, clamp, TAU, V3 } from './kit.js';

// Солнечный день как в POLYGON Snow Kit: тёплая дымка у горизонта, глубокое синее небо, сиреневые тени
export const HORIZON = '#e4e3ef';
// Солнце сбоку и чуть со стороны долины: склон светлый, у гор и сугробов — грани и синие тени
export const SUN_DIR = V3(20, 24, -6).normalize();
const SUN_XZ = new THREE.Vector2(SUN_DIR.x, SUN_DIR.z).normalize();
const PISTE = 22;
export const LIFT_U = -32; // линия кресельного подъёмника слева от трассы

// ---------------------------------------------------------------- рельеф
// Высота над плоскостью склона: трасса ровная (|u| ≤ 22), дальше — бровка, бугры и стены долины.
export function terrainH(u, s) {
  const a = Math.abs(u), off = Math.max(0, a - PISTE);
  if (off === 0) return 0;
  const k = Math.min(1, off / 8);
  const bumps = (Math.sin(u * 0.35) * Math.cos(s * 0.27) * 0.35 + Math.sin(s * 0.05 + u * 0.1) * 0.6) * k;
  const berm = 0.38 * smooth(0, 1.4, off) * (1 - smooth(1.8, 4.5, off));
  const wall = off * 0.06 + Math.max(0, off - 26) ** 2 * 0.0034 + fbm(u * 0.018, s * 0.018, 3) * Math.min(1, off / 30) * 7;
  return bumps + berm + wall;
}

// ---------------------------------------------------------------- снег
// Оттенок снега (множитель к текстуре): полосы ратрака на трассе, крупные пятна, синева в ложбинах
// и у бровки, светлые вершины бугров. Тени в снегу — синие, как на солнечном склоне.
export function snowTint(u, s, out) {
  const a = Math.abs(u);
  let k, blue;
  if (a <= PISTE) {
    const lane = Math.floor((u + PISTE) / 4.4) % 2 ? 1 : 0;
    k = 1 - 0.06 * lane - 0.08 * (0.5 + 0.5 * fbm(u * 0.05 + 7, s * 0.018, 3)) - 0.07 * smooth(PISTE - 3.5, PISTE, a);
    blue = 0.3 + 0.7 * smooth(PISTE - 3, PISTE, a);
  } else {
    const h = terrainH(u, s), e = 1.6;
    const curv = h - (terrainH(u + e, s) + terrainH(u - e, s) + terrainH(u, s + e) + terrainH(u, s - e)) / 4;
    k = clamp(0.96 + curv * 1.4 + 0.04 * fbm(u * 0.08, s * 0.08, 2), 0.78, 1.03);
    blue = clamp(1 - (k - 0.78) / 0.24, 0, 1);
  }
  return out.setRGB(k * (1 - 0.045 * blue), k * (1 - 0.06 * blue), Math.min(1, k * (1 + 0.03 * blue))); // тени в снегу — сиреневые
}

// Старые следы других райдеров на трассе: плавные дуги, светло-синие, полупрозрачные
export function oldTracks(frame, S0, S1, seed = 5) {
  const r = rng(seed), pos = [], col = [];
  for (let k = 0; k < 26; k++) {
    let u = (r() - 0.5) * 36, s = S0 + r() * (S1 - S0);
    const amp = 2 + r() * 6, per = 14 + r() * 22, ph = r() * TAU, len = 60 + r() * 160, w = 0.07 + r() * 0.1, skid = r() < 0.3;
    const c = skid ? [0.72, 0.79, 0.9] : [0.5, 0.62, 0.8], width = skid ? 0.6 + r() * 0.6 : w;
    let prev = null;
    for (let d = 0; d <= len; d += 1.5) {
      const ss = s + d, uu = clamp(u + amp * Math.sin(ss / per * TAU + ph), -PISTE + 1, PISTE - 1);
      const du = amp * Math.cos(ss / per * TAU + ph) * TAU / per, n = Math.hypot(du, 1);
      const L = frame.p(uu - width / 2 / n, ss + du * width / 2 / n, 0.012), R = frame.p(uu + width / 2 / n, ss - du * width / 2 / n, 0.012);
      if (prev) for (const v of [prev[0], prev[1], R, prev[0], R, L]) { pos.push(v.x, v.y, v.z); col.push(...c); }
      prev = [L, R];
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  m.frustumCulled = false;
  return m;
}

export function snowTextures() {
  // вельвет после ратрака, полоса ратрака ~4 м, лёгкая неровность
  const piste = canvasTex(512, 512, (x, W, H) => {
    x.fillStyle = '#f2f6fa'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W; i += 4) { x.fillStyle = i % 8 ? '#e6edf5' : '#f8fbfd'; x.fillRect(i, 0, 2, H); }
    x.fillStyle = 'rgba(160,180,205,0.18)'; x.fillRect(W * 0.66, 0, 3, H);
    grain(x, W, H, 14, 31);
  }, { repeat: true, aniso: 8 });
  const bump = canvasTex(256, 256, (x, W, H) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W; i += 2) { x.fillStyle = i % 4 ? '#5a5a5a' : '#a8a8a8'; x.fillRect(i, 0, 1, H); }
    grain(x, W, H, 30, 33);
  }, { repeat: true, srgb: false, aniso: 8 });
  const powder = canvasTex(256, 256, (x, W, H) => {
    x.fillStyle = '#f4f7fb'; x.fillRect(0, 0, W, H);
    const r = rng(41);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(150,170,200,${0.03 + r() * 0.05})`; x.beginPath(); x.ellipse(r() * W, r() * H, 4 + r() * 18, 2 + r() * 6, r() * 3, 0, 7); x.fill(); }
    grain(x, W, H, 10, 43);
  }, { repeat: true, aniso: 8 });
  return { piste, bump, powder };
}

// ---------------------------------------------------------------- деревья
// Ель высотой 1: вложенные конусы-ярусы с рваным краем. На каждом ярусе снег лежит полосой
// над тёмно-зелёной бахромой лап — так лес читается издалека. Снизу — тёмная изнанка.
function spruceGeo(seed, { tiers = 8, seg = 9, under = true, trunk = true, snow = 0.7 } = {}) {
  const r = rng(seed), parts = [];
  const dark = new THREE.Color('#183323'), green = new THREE.Color('#21412d'), tipC = new THREE.Color('#2c5236');
  const white = new THREE.Color('#f1f5f9'), blue = new THREE.Color('#bccddf'), deep = new THREE.Color('#10231a');
  if (trunk) {
    const t = new THREE.CylinderGeometry(0.016, 0.028, 0.3, 6, 1, true); t.translate(0, 0.15, 0);
    parts.push(paint(t, '#3f3128'));
  }
  for (let k = 0; k < tiers; k++) {
    const t = k / (tiers - 1);
    const y0 = 0.09 + t * 0.76, R = (0.38 * (1 - t) ** 1.05 + 0.035) * (0.9 + r() * 0.2);
    const h = k === tiers - 1 ? 1 - y0 : Math.min(0.34, R * 1.25 + 0.04);
    const rot = r() * TAU, sn = clamp(snow * (0.6 + r() * 0.6), 0, 1);
    const pos = [], col = [], idx = [];
    const add = (p, c) => { pos.push(p[0], p[1], p[2]); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
    const apex = add([0, y0 + h, 0], dark);
    const A = [], B = [], rim = [], und = [];
    for (let j = 0; j < seg; j++) {
      const a = rot + ((j + (r() - 0.5) * 0.3) / seg) * TAU, c = Math.cos(a), s = Math.sin(a);
      const tip = j % 2 === 0, rr = R * (tip ? 1 + r() * 0.12 : 0.74 + r() * 0.08);
      const droop = (tip ? 0.05 + r() * 0.04 : 0.012) * (R / 0.38) + 0.006;
      const lump = r() < sn ? 1 : 0.25;
      A.push(add([c * rr * 0.5, y0 + h * 0.48 + 0.015, s * rr * 0.5], green));
      B.push(add([c * rr * 0.8, y0 + h * 0.17 + 0.006, s * rr * 0.8], green.clone().lerp(white, sn * lump).lerp(blue, 0.2 * sn)));
      rim.push(add([c * rr, y0 - droop, s * rr], tipC.clone().lerp(white, tip ? 0.08 * sn : 0.3 * sn * lump)));
      if (under) und.push(add([c * rr * 0.96, y0 - droop - 0.008, s * rr * 0.96], deep));
    }
    for (let j = 0; j < seg; j++) {
      const n = (j + 1) % seg;
      idx.push(apex, A[n], A[j], A[j], A[n], B[j], A[n], B[n], B[j], B[j], B[n], rim[j], B[n], rim[n], rim[j]);
    }
    if (under) {
      const c0 = add([0, y0 + 0.04, 0], deep);
      for (let j = 0; j < seg; j++) idx.push(c0, und[j], und[(j + 1) % seg]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    parts.push(g);
  }
  const out = merge(parts.map((g) => { g.deleteAttribute('normal'); g.deleteAttribute('uv'); return g; }));
  out.computeVertexNormals();
  return out;
}

// Камень; flat — крупная скала с гранями (low-poly) и снегом на полках
function rockGeo(seed, flat = false) {
  const g = new THREE.IcosahedronGeometry(1, flat ? 1 : 2), p = g.attributes.position, c = [], r = rng(seed);
  const o = r() * 100;
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i));
    const k = 1 + 0.28 * noise2(v.x * 1.7 + o, v.y * 1.7 + v.z * 1.3) + 0.12 * noise2(v.x * 4 + o, v.z * 4);
    v.multiplyScalar(k); v.y = v.y > 0 ? v.y * (flat ? 1.1 : 0.75) : v.y * 0.4;
    if (flat) { v.x *= 1 + 0.25 * noise2(v.y * 3 + o, 1); v.z *= 1 + 0.25 * noise2(v.y * 3 - o, 2); }
    p.setXYZ(i, v.x, v.y, v.z);
    const snowy = smooth(0.15, 0.45, v.y + 0.1 * noise2(v.x * 3, v.z * 3));
    const rock = new THREE.Color('#6a7380').lerp(new THREE.Color('#4a525d'), 0.5 + 0.5 * noise2(v.x * 5, v.z * 5));
    const col = rock.lerp(new THREE.Color('#f1f5f9'), snowy);
    c.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  if (!flat) { g.computeVertexNormals(); return g; }
  // грани: снег только на пологих полках, крутые стенки — камень
  const f = g.index ? g.toNonIndexed() : g, fp = f.attributes.position, fc = f.attributes.color, a = V3(), b = V3(), d = V3(), n = V3();
  for (let i = 0; i < fp.count; i += 3) {
    a.fromBufferAttribute(fp, i); b.fromBufferAttribute(fp, i + 1); d.fromBufferAttribute(fp, i + 2);
    n.crossVectors(b.clone().sub(a), d.clone().sub(a)).normalize();
    const rock = new THREE.Color('#5d6573').lerp(new THREE.Color('#3f4652'), 0.5 + 0.5 * noise2(a.x * 3, a.z * 3));
    const col = rock.lerp(new THREE.Color('#f1f5f9'), smooth(0.55, 0.75, n.y) * smooth(-0.2, 0.2, a.y));
    for (let k = 0; k < 3; k++) fc.setXYZ(i + k, col.r, col.g, col.b);
  }
  f.computeVertexNormals();
  return f;
}

let TREES = null;
function treeKit() {
  if (TREES) return TREES;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  TREES = {
    mat,
    near: [spruceGeo(11, { tiers: 9, seg: 10, snow: 0.5 }), spruceGeo(23, { tiers: 8, seg: 10, snow: 0.3 }), spruceGeo(37, { tiers: 9, seg: 10, snow: 0.7 })],
    far: spruceGeo(51, { tiers: 5, seg: 8, under: false, trunk: false, snow: 0.45 }),
    rock: rockGeo(5),
    cliff: rockGeo(9, true),
  };
  return TREES;
}

// Расставляет деревья по кольцам/полосам. place(i) → { p: Vector3, h, r } или null.
function instances(geo, mat, list, { shadow = false, color = true, seed = 1 } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), col = new THREE.Color(), r = rng(seed);
  list.forEach((t, i) => {
    e.set((r() - 0.5) * 0.06, r() * TAU, (r() - 0.5) * 0.06); q.setFromEuler(e);
    m.setMatrixAt(i, M.compose(t.p, q, sc.set(t.r, t.h, t.r)));
    if (color) { const f = 0.82 + r() * 0.3; m.setColorAt(i, col.setRGB(f * (0.94 + r() * 0.1), f, f * (0.94 + r() * 0.1))); }
  });
  m.count = list.length;
  m.castShadow = shadow; m.receiveShadow = false;
  return m;
}

// Лес вдоль трассы кусками по 100 м (дальние куски скрываются в World.follow).
// Каждый кусок — LOD: вблизи подробные ели с тенями, дальше — простые.
export function buildForest(frame, S0, S1) {
  const K = treeKit(), chunks = [], r = rng(77), CH = 100;
  const dens = (u, s) => 0.25 + 0.75 * smooth(-0.35, 0.35, noise2(u * 0.045 + 3, s * 0.045)); // поляны и чащи
  for (let c0 = S0; c0 < S1; c0 += CH) {
    const near = [[], [], []], far = [], rocks = [], small = [];
    for (let i = 0; i < 190; i++) {
      const side = i % 2 ? 1 : -1, u = side * (PISTE + 2.6 + (r() ** 1.3) * 36), s = c0 + r() * CH;
      if (r() > dens(u, s) || Math.abs(u - LIFT_U) < 5.5) continue;
      const off = Math.abs(u) - PISTE, young = off < 6 ? 0.55 : 1;
      const h = (6 + r() * 11 + Math.min(5, off * 0.12)) * young;
      near[Math.floor(r() * 3)].push({ p: frame.p(u, s, terrainH(u, s) - 0.25), h, r: h * (0.82 + r() * 0.3) });
    }
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? 1 : -1, u = side * (PISTE + 1.6 + r() * 4), s = c0 + r() * CH, h = 1.2 + r() * 2.2;
      if (Math.abs(u - LIFT_U) < 4) continue;
      small.push({ p: frame.p(u, s, terrainH(u, s) - 0.15), h, r: h * (0.9 + r() * 0.3) });
    }
    for (let i = 0; i < 260; i++) {
      const side = i % 2 ? 1 : -1, u = side * (60 + r() * 165), s = c0 + r() * CH;
      if (r() > dens(u, s) + 0.15) continue;
      const h = 9 + r() * 12;
      far.push({ p: frame.p(u, s, terrainH(u, s) - 0.5), h, r: h * (0.8 + r() * 0.3) });
    }
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1, u = side * (PISTE + 3 + r() * 30), s = c0 + r() * CH, k = 0.4 + r() * 1.3;
      if (Math.abs(u - LIFT_U) < 4) continue;
      rocks.push({ p: frame.p(u, s, terrainH(u, s) - 0.2 * k), h: k * (0.8 + r() * 0.5), r: k * (1 + r() * 0.6) });
    }
    // скальные выходы на склонах долины
    const cliffs = [];
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1, u = side * (PISTE + 26 + r() * 80), s = c0 + r() * CH, k = 3 + r() * 7;
      cliffs.push({ p: frame.p(u, s, terrainH(u, s) - 0.35 * k), h: k * (0.9 + r() * 0.7), r: k * (1.1 + r() * 0.8) });
    }
    const center = frame.p(0, c0 + CH / 2);
    const level = (list) => { const g = new THREE.Group(); g.position.copy(center).negate(); list.forEach((m) => g.add(m)); return g; };
    const lod = new THREE.LOD();
    lod.position.copy(center);
    lod.addLevel(level([
      ...near.map((l, k) => instances(K.near[k], K.mat, l, { shadow: true, seed: c0 + k })),
      instances(K.near[2], K.mat, small, { shadow: true, seed: c0 + 9 }),
      instances(K.rock, K.mat, rocks, { color: false, shadow: true, seed: c0 + 7 }),
      instances(K.cliff, K.mat, cliffs, { color: false, seed: c0 + 8 }),
      instances(K.far, K.mat, far, { seed: c0 + 5 }),
    ]), 0);
    lod.addLevel(level([instances(K.far, K.mat, near.flat(), { seed: c0 + 3 }), instances(K.far, K.mat, far, { seed: c0 + 5 }), instances(K.cliff, K.mat, cliffs, { color: false, seed: c0 + 8 })]), 170);
    lod.userData.s = c0 + CH / 2; lod.userData.cull = 440;
    chunks.push(lod);
  }
  return chunks;
}

// ---------------------------------------------------------------- курорт: подъёмник и сетки
const tint = (g, color) => paint(g, color);
function chairGeo(people) {
  const parts = [];
  const box = (w, h, d, x, y, z, color, rx = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (rx) b.rotateX(rx); b.translate(x, y, z); parts.push(tint(b, color)); };
  const bar = new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6); bar.translate(0, -1.2, 0); parts.push(tint(bar, '#3b424c'));
  box(0.08, 0.08, 0.7, 0, -2.4, 0.1, '#3b424c');
  box(1.5, 0.1, 0.5, 0, -2.45, 0.35, '#2f6fb5');
  box(1.5, 0.5, 0.08, 0, -2.15, 0.1, '#2f6fb5', -0.15);
  box(1.5, 0.05, 0.05, 0, -2.0, 0.85, '#3b424c');
  if (people) for (const x of people) {
    const c = ['#ef4444', '#f59e0b', '#22c55e', '#a855f7', '#0ea5e9', '#f43f5e'][Math.floor(Math.abs(x * 7.3 + people.length * 3)) % 6];
    box(0.36, 0.5, 0.28, x, -2.1, 0.3, c);
    const h = new THREE.SphereGeometry(0.14, 10, 8); h.translate(x, -1.74, 0.32); parts.push(tint(h, '#f3f5f7'));
    box(0.32, 0.16, 0.5, x, -2.38, 0.6, '#3b4250');
    box(0.3, 0.45, 0.14, x, -2.62, 0.82, '#3b4250');
    if (people.indexOf(x) === 0) box(1.3, 0.03, 0.3, 0, -2.9, 0.9, '#1f6feb', 0.25);
  }
  return merge(parts.map((g) => { if (g.attributes.uv) g.deleteAttribute('uv'); return g; }));
}
function netTexture() {
  const t = canvasTex(64, 64, (x, W, H) => {
    x.clearRect(0, 0, W, H);
    x.strokeStyle = '#ff6a13'; x.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16, H); x.stroke(); x.beginPath(); x.moveTo(0, i * 16); x.lineTo(W, i * 16); x.stroke(); }
    x.fillStyle = '#ff6a13'; x.fillRect(0, 0, W, 6);
  }, { repeat: true, aniso: 4 });
  return t;
}

// Кресельный подъёмник вдоль трассы (опоры, тросы, движущиеся кресла с людьми)
// и оранжевые защитные сетки по краям трассы участками. update(t) двигает кресла.
export function resortProps(frame, S0, S1) {
  const g = new THREE.Group(), r = rng(808), H = 9.5, SPAN = 46, W = 1.7;
  const steel = new THREE.MeshStandardMaterial({ color: '#7d8794', roughness: 0.5, metalness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2d333b', roughness: 0.6 });
  const towerG = new THREE.CylinderGeometry(0.22, 0.32, 1, 8); towerG.translate(0, 0.5, 0);
  const armG = new THREE.BoxGeometry(2 * W + 0.8, 0.28, 0.32);
  const sheaveG = new THREE.BoxGeometry(0.25, 0.3, 1.4);
  const towers = [];
  for (let s = S0 + 20; s < S1; s += SPAN) towers.push(s);
  const tw = new THREE.InstancedMesh(towerG, steel, towers.length), arm = new THREE.InstancedMesh(armG, steel, towers.length), sh = new THREE.InstancedMesh(sheaveG, dark, towers.length * 2);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), one = V3(1, 1, 1);
  towers.forEach((s, i) => {
    const base = frame.p(LIFT_U, s, terrainH(LIFT_U, s) - 0.3), top = frame.p(LIFT_U, s, H);
    tw.setMatrixAt(i, M.compose(base, q, V3(1, top.y - base.y + 0.3, 1)));
    arm.setMatrixAt(i, M.compose(top.clone().add(V3(0, 0.25, 0)), q, one));
    for (const k of [0, 1]) sh.setMatrixAt(i * 2 + k, M.compose(frame.p(LIFT_U + (k ? W : -W), s, H), q, one));
  });
  [tw, arm, sh].forEach((m) => { m.castShadow = true; g.add(m); });
  // тросы — прямые, параллельно склону
  for (const k of [-1, 1]) {
    const a = frame.p(LIFT_U + k * W, S0 + 20, H - 0.15), b = frame.p(LIFT_U + k * W, S1, H - 0.15);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, a.distanceTo(b), 4), dark);
    c.position.copy(a).lerp(b, 0.5); c.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(c);
  }
  // кресла: вверх едут по правой нитке (к трассе), вниз — по левой
  const L = S1 - S0 - 20, STEP = 19, n = Math.floor(L / STEP);
  const kinds = [chairGeo(null), chairGeo([-0.38]), chairGeo([-0.38, 0.38])];
  const lists = kinds.map(() => []);
  for (let i = 0; i < n * 2; i++) {
    const up = i < n, kind = up ? (r() < 0.35 ? 0 : r() < 0.5 ? 1 : 2) : (r() < 0.85 ? 0 : 1);
    lists[kind].push({ off: (i % n) * STEP + r() * 2, up });
  }
  const chairMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const meshes = kinds.map((geo, k) => { const m = new THREE.InstancedMesh(geo, chairMat, Math.max(1, lists[k].length)); m.castShadow = true; m.frustumCulled = false; g.add(m); return m; });
  const yaw = new THREE.Quaternion(), down = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI);
  const update = (t) => {
    meshes.forEach((m, k) => lists[k].forEach((c, i) => {
      const d = (c.off + t * 2.6) % L, s = c.up ? S1 - d : S0 + 20 + d;
      const p = frame.p(LIFT_U + (c.up ? W : -W), s, H - 0.15);
      // кресло смотрит по ходу: вверх — к +Z, вниз — развёрнуто
      yaw.copy(c.up ? q : down);
      m.setMatrixAt(i, M.compose(p, yaw, one));
    }));
    meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  };
  update(0);
  // защитные сетки: участки по 30–60 м по краям трассы
  const tex = netTexture();
  const netMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  const postMat = new THREE.MeshLambertMaterial({ color: '#1e2329' });
  const postG = new THREE.CylinderGeometry(0.035, 0.035, 1.7, 5); postG.translate(0, 0.85, 0);
  const posts = [];
  for (let s = S0 + 60; s < S1; s += 120 + r() * 120) for (const side of [-1, 1]) {
    if (r() < 0.35) continue;
    const len = 30 + r() * 30, u = side * (PISTE - 0.4), pos = [], uv = [];
    for (let d = 0; d <= len; d += 2) {
      const lo = frame.p(u, s + d, 0.15), hi = frame.p(u, s + d, 1.55);
      pos.push(lo.x, lo.y, lo.z, hi.x, hi.y, hi.z); uv.push(d / 1.2, 0, d / 1.2, 1.2);
      if (d % 4 === 0) posts.push(frame.p(u, s + d, 0));
    }
    const idx = [];
    for (let k = 0; k < pos.length / 6 - 1; k++) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ng.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ng.setIndex(idx);
    ng.computeVertexNormals();
    g.add(new THREE.Mesh(ng, netMat));
  }
  const pm = new THREE.InstancedMesh(postG, postMat, Math.max(1, posts.length));
  posts.forEach((p, i) => pm.setMatrixAt(i, M.compose(p, q, one)));
  g.add(pm);
  return { group: g, update };
}

// ---------------------------------------------------------------- курорт: снежные пушки и снеговик (как в POLYGON Snow Kit)
// Пушка-вентилятор на колёсах у края трассы: ствол смотрит через склон и чуть вверх (локально — к +X).
function fanGunGeo() {
  const parts = [];
  const box = (w, h, d, x, y, z, color) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); parts.push(tint(b, color)); };
  const tilt = 0.42, c = V3(0, 1.75, 0), ax = V3(Math.cos(tilt), Math.sin(tilt), 0);
  const ring = (r, len, at, color, seg = 20) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(-Math.PI / 2 + tilt); const p = c.clone().addScaledVector(ax, at); g.translate(p.x, p.y, p.z); parts.push(tint(g, color)); };
  box(1.6, 0.2, 0.9, 0, 0.42, 0, '#3b424c');
  for (const x of [-0.55, 0.55]) for (const z of [-0.5, 0.5]) { const w = new THREE.CylinderGeometry(0.3, 0.3, 0.16, 12); w.rotateX(Math.PI / 2); w.translate(x, 0.3, z); parts.push(tint(w, '#1f2329')); }
  box(0.2, 1.15, 0.2, -0.1, 1.05, 0.38, '#64748b'); box(0.2, 1.15, 0.2, -0.1, 1.05, -0.38, '#64748b');
  box(0.5, 0.5, 0.5, -0.55, 0.78, 0, '#e5e7eb'); // насос
  ring(0.64, 1.6, 0, '#f1f5f9');
  ring(0.66, 0.2, 0.1, '#dc2626');
  ring(0.6, 0.06, 0.82, '#1f2937');   // решётка спереди
  ring(0.67, 0.08, -0.8, '#facc15');  // жёлтое кольцо сзади
  ring(0.1, 0.12, -0.86, '#334155', 8);
  return merge(parts.map((g) => { if (g.attributes.uv) g.deleteAttribute('uv'); return g; }));
}
function snowmanGeo() {
  const parts = [];
  const ball = (r, y, color = '#fbfdff', x = 0, z = 0) => { const g = new THREE.SphereGeometry(r, 18, 14); g.translate(x, y, z); parts.push(tint(g, color)); };
  ball(0.62, 0.5); ball(0.46, 1.3); ball(0.33, 1.92);
  for (const x of [-0.11, 0.11]) ball(0.04, 2.0, '#111827', x, 0.29);
  for (const y of [1.18, 1.36, 1.54]) ball(0.045, y, '#111827', 0, 0.45);
  const nose = new THREE.ConeGeometry(0.06, 0.32, 10); nose.rotateX(Math.PI / 2); nose.translate(0, 1.93, 0.46); parts.push(tint(nose, '#f97316'));
  const scarf = new THREE.TorusGeometry(0.3, 0.07, 8, 20); scarf.rotateX(Math.PI / 2); scarf.translate(0, 1.66, 0); parts.push(tint(scarf, '#dc2626'));
  const tail = new THREE.BoxGeometry(0.14, 0.36, 0.06); tail.rotateZ(0.2); tail.translate(0.2, 1.48, 0.3); parts.push(tint(tail, '#dc2626'));
  const hat = new THREE.CylinderGeometry(0.2, 0.24, 0.3, 14); hat.translate(0, 2.3, 0); parts.push(tint(hat, '#1e3a8a'));
  const brim = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16); brim.translate(0, 2.16, 0); parts.push(tint(brim, '#1e3a8a'));
  for (const k of [-1, 1]) { const arm = new THREE.CylinderGeometry(0.025, 0.03, 0.9, 5); arm.rotateZ(k * 1.05); arm.translate(k * 0.75, 1.55, 0); parts.push(tint(arm, '#5b3a1e')); }
  return merge(parts.map((g) => { if (g.attributes.uv) g.deleteAttribute('uv'); return g; }));
}
// Снегоход курортной службы (как в POLYGON Snow Kit): нос к локальному +X
function snowmobileGeo() {
  const parts = [];
  const box = (w, h, d, x, y, z, color, rz = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (rz) b.rotateZ(rz); b.translate(x, y, z); parts.push(tint(b, color)); };
  box(2.0, 0.42, 0.56, -0.45, 0.3, 0, '#1f2329');            // гусеница в туннеле
  box(1.15, 0.5, 0.95, 0.75, 0.55, 0, '#dc2626');            // капот
  box(1.17, 0.08, 0.97, 0.75, 0.64, 0, '#f8fafc');           // белая полоса
  box(0.7, 0.3, 0.9, 1.05, 0.9, 0, '#b91c1c', -0.35);        // нос капота
  box(0.06, 0.38, 0.78, 0.38, 1.06, 0, '#475569', 0.45);     // ветровое стекло
  box(1.15, 0.2, 0.5, -0.55, 0.62, 0, '#111827');            // сиденье
  box(0.6, 0.12, 0.62, -1.1, 0.56, 0, '#dc2626');            // задний багажник
  box(0.07, 0.05, 0.25, 1.42, 0.68, 0, '#fde047');           // фара
  const bar = new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6); bar.rotateX(Math.PI / 2); bar.translate(0.2, 1.02, 0); parts.push(tint(bar, '#111827'));
  for (const z of [-0.45, 0.45]) {
    box(1.35, 0.05, 0.16, 0.95, 0.03, z, '#111827');         // лыжи
    box(0.32, 0.05, 0.16, 1.68, 0.12, z, '#111827', 0.6);
    box(0.08, 0.36, 0.08, 0.9, 0.22, z, '#334155');
  }
  return merge(parts.map((g) => { if (g.attributes.uv) g.deleteAttribute('uv'); return g; }));
}
// ---------------------------------------------------------------- люди у края трассы (низкополигональные, как в POLYGON Snow Kit)
// Двухцветная куртка, прямые серые штаны, шлем с маской. Локально: стоит на y=0, лицом к +Z.
// pose: stand — доска воткнута рядом; point — инструктор показывает рукой; sit — сидит, доска на ногах поперёк.
const JACKETS = [['#1ba7e3', '#22306a'], ['#f97316', '#1f2937'], ['#a855f7', '#312e81'], ['#22c55e', '#14532d'], ['#f43f5e', '#4c0519'], ['#facc15', '#334155'], ['#14b8a6', '#134e4a']];
function personGeo({ jacket, jacket2, pants = '#686d75', helmet = '#f3f5f7', board = '#1f6feb', pose = 'stand' }) {
  const parts = [], up = V3(0, 1, 0), P = (x, y, z) => V3(x, y, z);
  const box = (w, h, d, p, color, rx = 0, rz = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (rx) b.rotateX(rx); if (rz) b.rotateZ(rz); b.translate(p.x, p.y, p.z); parts.push(tint(b, color)); };
  // брусок от точки a до точки b
  const limb = (a, b, w, d, color) => {
    const dir = b.clone().sub(a), g = new THREE.BoxGeometry(w, dir.length(), d);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()));
    const m = a.clone().lerp(b, 0.5); g.translate(m.x, m.y, m.z); parts.push(tint(g, color));
  };
  const ball = (r, p, color) => { const g = new THREE.IcosahedronGeometry(r, 1); g.translate(p.x, p.y, p.z); parts.push(tint(g, color)); };
  const sit = pose === 'sit';
  // таз, корпус и голова: сидя — ниже и с наклоном назад
  const hip = sit ? P(0, 0.2, -0.05) : P(0, 0.92, 0), lean = sit ? -0.35 : 0;
  const chest = hip.clone().add(P(0, 0.62 * Math.cos(lean), 0.62 * Math.sin(lean)));
  limb(hip, hip.clone().lerp(chest, 0.62), 0.47, 0.31, jacket);
  limb(hip.clone().lerp(chest, 0.6), chest, 0.5, 0.33, jacket2);
  limb(chest, chest.clone().add(P(0, 0.1, 0)), 0.2, 0.2, '#2f3e4f');
  const head = chest.clone().add(P(0, 0.22, 0.02));
  ball(0.135, head, helmet);
  box(0.23, 0.075, 0.07, head.clone().add(P(0, -0.01, 0.11)), '#ffb100');
  box(0.15, 0.07, 0.05, head.clone().add(P(0, -0.1, 0.09)), '#e9b48f');
  // ноги и ботинки
  for (const k of [-1, 1]) {
    const h = hip.clone().add(P(0.11 * k, -0.04, 0));
    if (sit) {
      const knee = P(0.14 * k, 0.48, 0.38), foot = P(0.17 * k, 0.12, 0.62);
      limb(h, knee, 0.17, 0.2, pants); limb(knee, foot, 0.16, 0.18, pants);
      box(0.15, 0.13, 0.3, foot.clone().add(P(0, -0.02, 0.05)), '#2c3139', -0.5);
    } else {
      limb(h, P(0.12 * k, 0.14, 0), 0.19, 0.23, pants);
      box(0.15, 0.13, 0.3, P(0.12 * k, 0.065, 0.04), '#2c3139');
    }
  }
  // руки
  for (const k of [-1, 1]) {
    const sh = chest.clone().add(P(0.29 * k, -0.07, 0));
    let hand;
    if (sit) hand = P(0.36 * k, 0.05, -0.38);                                 // упёрся руками в снег сзади
    else if (pose === 'point' && k > 0) hand = sh.clone().add(P(0.42, 0.22, 0.36)); // показывает на склон
    else hand = sh.clone().add(P(0.06 * k, -0.52, 0.06));
    const elbow = sh.clone().lerp(hand, 0.5).add(P(0.04 * k, 0, -0.04));
    limb(sh, elbow, 0.15, 0.16, jacket); limb(elbow, hand, 0.14, 0.15, jacket);
    ball(0.065, hand, '#1d1f24');
  }
  // доска: сидя — на ногах поперёк, стоя — воткнута в снег хвостом рядом
  if (sit) {
    box(1.5, 0.03, 0.27, P(0, 0.04, 0.67), board);
    for (const k of [-1, 1]) box(0.2, 0.1, 0.24, P(0.17 * k, 0.09, 0.67), '#16181c');
  } else {
    box(0.27, 1.5, 0.03, P(0.55, 0.68, -0.12), board, 0, -0.08);
    box(0.24, 0.2, 0.08, P(0.56, 0.58, -0.08), '#16181c', 0, -0.08);
  }
  return merge(parts);
}
// Группы людей у края трассы: инструктор с детьми у старта, отдыхающие, друзья с досками.
// [u, s, поворот, поза, номер куртки, масштаб]
const PEOPLE = [
  [-21.2, 24, 0.35, 'point', -1, 1], [-20.5, 21.2, Math.PI + 0.25, 'stand', 4, 0.62], [-21.6, 21.8, Math.PI - 0.1, 'stand', 6, 0.6],
  [20.8, 46, Math.PI + 0.2, 'sit', 1, 1],
  [21.3, 150, -Math.PI / 2 - 0.6, 'stand', 2, 1], [21.1, 151.6, -Math.PI / 2 + 0.5, 'stand', 3, 0.95],
  [-20.9, 262, Math.PI - 0.3, 'sit', 0, 1],
  [-21.2, 384, Math.PI / 2 - 0.4, 'stand', 5, 1],
  [20.7, 523, -0.25, 'point', -1, 1], [21.2, 520.5, Math.PI + 0.2, 'stand', 0, 1],
  [-20.8, 700, Math.PI - 0.3, 'sit', 2, 1], [21.0, 880, -Math.PI / 2, 'stand', 6, 1],
];
export function slopePeople(frame) {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, flatShading: true });
  const geos = new Map();
  for (const [u, s, yaw, pose, j, k] of PEOPLE) {
    // инструктор — в форме школы: красная куртка с белым верхом
    const [jacket, jacket2] = j < 0 ? ['#dc2626', '#f8fafc'] : JACKETS[j];
    const key = `${pose}${j}`;
    if (!geos.has(key)) geos.set(key, personGeo({ jacket, jacket2, pose, helmet: j < 0 ? '#111827' : '#f3f5f7', board: j < 0 ? '#e11d48' : ['#1f6feb', '#7c3aed', '#0d9488', '#e11d48'][(j + 4) % 4] }));
    const m = new THREE.Mesh(geos.get(key), mat);
    m.position.copy(frame.p(u, s, terrainH(u, s) - 0.04)); m.rotation.y = yaw; m.scale.setScalar(k);
    m.castShadow = true; g.add(m);
  }
  return g;
}
// Снежные пушки вдоль трассы через одну сторону, снегоход и снеговики у старта — курорт живой, а не пустой склон
export function resortExtras(frame, S0, S1) {
  const g = new THREE.Group(), r = rng(919), M = new THREE.Matrix4(), q = new THREE.Quaternion(), one = V3(1, 1, 1), Y = V3(0, 1, 0);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });
  const guns = [];
  let side = 1;
  for (let s = S0 + 90; s < S1; s += 110 + r() * 60, side = -side) guns.push([side * (PISTE + 2.4 + r() * 0.8), s, side]);
  const gm = new THREE.InstancedMesh(fanGunGeo(), mat, guns.length);
  guns.forEach(([u, s, sd], i) => {
    // ствол к середине трассы и чуть вниз по склону
    q.setFromAxisAngle(Y, sd > 0 ? Math.PI - 0.35 : 0.35);
    gm.setMatrixAt(i, M.compose(frame.p(u, s, terrainH(u, s) - 0.05), q, one));
  });
  gm.castShadow = true; g.add(gm);
  g.userData.guns = guns;
  const men = [[-23.8, 26, 0.5], [24.5, 230, -0.6], [-24.5, 520, 0.4]];
  const sm = new THREE.InstancedMesh(snowmanGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), men.length);
  men.forEach(([u, s, yaw], i) => { q.setFromAxisAngle(Y, yaw); sm.setMatrixAt(i, M.compose(frame.p(u, s, terrainH(u, s) - 0.15), q, one)); });
  sm.castShadow = true; g.add(sm);
  const sled = new THREE.Mesh(snowmobileGeo(), mat);
  sled.position.copy(frame.p(25, 36, terrainH(25, 36) - 0.05)); sled.rotation.y = 2.1; sled.castShadow = true;
  g.add(sled, slopePeople(frame));
  return g;
}
// Табличка трассы у старта: цвет сложности, уровень и название — как указатели на настоящем курорте
export function trailSign(level, name, color, text = '#ffffff') {
  return canvasTex(512, 320, (x, W, H) => {
    x.fillStyle = '#f8fafc'; x.fillRect(0, 0, W, H);
    x.fillStyle = color; x.fillRect(12, 12, W - 24, H - 24);
    x.fillStyle = text; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 84px sans-serif'; x.fillText(level.toUpperCase(), W / 2, H * 0.33);
    x.font = 'bold 72px sans-serif'; x.fillText(name, W / 2, H * 0.71, W - 48);
  }, { aniso: 4 });
}

// ---------------------------------------------------------------- небо и горы
function skyDome(R) {
  const g = new THREE.SphereGeometry(R, 48, 24), p = g.attributes.position, c = [];
  const zen = new THREE.Color('#3576d0'), mid = new THREE.Color('#80b4ec'), hor = new THREE.Color(HORIZON), low = new THREE.Color('#ece8f1'), warm = new THREE.Color('#ffdcb8'), rose = new THREE.Color('#f0d7e4');
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    let col = v.y < 0 ? hor.clone().lerp(low, smooth(0, 0.2, -v.y)) : v.y < 0.13 ? hor.clone().lerp(mid, smooth(0, 0.13, v.y)) : mid.clone().lerp(zen, smooth(0.13, 0.8, v.y));
    const toward = v.x * SUN_XZ.x + v.z * SUN_XZ.y, low2 = (1 - Math.abs(v.y)) ** 3;
    col.lerp(warm, Math.max(0, toward) ** 3 * (1 - Math.abs(v.y)) * 0.5);
    col.lerp(rose, Math.max(0, -toward) * low2 * 0.35); // напротив солнца горизонт розовеет
    c.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, depthTest: false }));
  m.renderOrder = -3000;
  return m;
}

// Горный массив кольцом R0…R1 вокруг зрителя: рельеф с гранями (low-poly), свет и дымка запечены
// в цвет граней. Рисуется без буфера глубины, ряды — от дальних к ближним, так ближние хребты
// закрывают дальние. peak(θ) → [мин., макс.] высота вершин в градусах над горизонтом;
// base(θ) — подошва в градусах (вниз по склону долина ниже, вверх — выше).
const SUN3 = SUN_DIR;
function massif({ R0, R1, rows, cols, seed, peak, base, haze, order, forest = 0.35, hazeC = '#c6cbe6' }) {
  const r = rng(seed), tg = (d) => Math.tan(d * Math.PI / 180);
  const jt = Array.from({ length: (rows + 1) * cols }, () => [(r() - 0.5) * 0.5, (r() - 0.5) * 0.45]);
  const ridged = (x, z) => {
    let sum = 0, amp = 0.55, f = 1 / 240, norm = 0;
    for (let o = 0; o < 4; o++) { const v = 1 - Math.abs(noise2(x * f + seed * 13.1 + o * 7.3, z * f - seed * 5.7 - o * 3.1)); sum += amp * v * v; norm += amp; amp *= 0.5; f *= 2.15; }
    return clamp((sum / norm - 0.28) / 0.6, 0, 1);
  };
  const vtx = (i, j) => {
    const [dj, di] = jt[j * cols + (i % cols)];
    const t = clamp((j + (j > 0 && j < rows ? dj : 0)) / rows, 0, 1), rad = lerp(R0, R1, t);
    const th = ((i + di) / cols) * TAU, x = Math.cos(th) * rad, z = Math.sin(th) * rad;
    const [e0, e1] = peak(th), b = base(th);
    const env = Math.sin(Math.PI * t) ** 0.65;
    const full = rad * (tg(lerp(e0, e1, ridged(x * 0.6, z * 0.6))) - tg(b));
    const hgt = full * env * (0.35 + 0.65 * ridged(x, z));
    return { p: V3(x, rad * tg(b) + hgt, z), rel: hgt / Math.max(1, rad * (tg(e1) - tg(b))), t };
  };
  const grid = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) grid.push(vtx(i, j));
  const at = (i, j) => grid[j * (cols + 1) + i];
  const cSnowL = new THREE.Color('#fffcf6'), cSnowS = new THREE.Color('#8a8ec6'), cRockL = new THREE.Color('#857f8c'), cRockS = new THREE.Color('#383a56');
  const cForL = new THREE.Color('#36513f'), cForS = new THREE.Color('#16261e'), hz = new THREE.Color(hazeC);
  const pos = [], col = [], n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), c = new THREE.Color();
  const tri = (A, B, C) => {
    e1.subVectors(B.p, A.p); e2.subVectors(C.p, A.p); n.crossVectors(e1, e2).normalize();
    if (n.y < 0) { [B, C] = [C, B]; n.negate(); }
    const cx = (A.p.x + B.p.x + C.p.x) / 3, cz = (A.p.z + B.p.z + C.p.z) / 3, rel = (A.rel + B.rel + C.rel) / 3, t = (A.t + B.t + C.t) / 3;
    const lit = clamp(n.dot(SUN3) * 1.15, 0, 1) ** 0.8;
    const rock = 1 - smooth(0.36, 0.5, n.y + 0.1 * noise2(cx * 0.02, cz * 0.02));
    c.copy(cSnowS).lerp(cSnowL, lit).lerp(c.clone().copy(cRockS).lerp(cRockL, lit), rock);
    const fo = (1 - smooth(forest - 0.06, forest + 0.03, rel + 0.08 * noise2(cx * 0.013, cz * 0.013))) * smooth(0.6, 0.75, n.y);
    if (fo > 0) c.lerp(cForS.clone().lerp(cForL, lit).lerp(cSnowL, 0.18 + 0.12 * noise2(cx * 0.2, cz * 0.2)), fo);
    c.lerp(hz, clamp(haze + 0.12 * t, 0, 1));
    for (const v of [A, B, C]) { pos.push(v.p.x, v.p.y, v.p.z); col.push(c.r, c.g, c.b); }
  };
  // ряды от дальнего к ближнему
  for (let j = rows - 1; j >= 0; j--) for (let i = 0; i < cols; i++) {
    const a = at(i, j), b = at(i + 1, j), cc = at(i, j + 1), d = at(i + 1, j + 1);
    if ((i + j) % 2) { tri(a, b, d); tri(a, d, cc); } else { tri(a, b, cc); tri(b, d, cc); }
  }
  // «юбка» по ближнему краю, чтобы под подошвой не просвечивало небо
  const skirt = hz;
  for (let i = 0; i < cols; i++) {
    const a = at(i, 0).p, b = at(i + 1, 0).p, a2 = V3(a.x, -R0 * 0.6, a.z), b2 = V3(b.x, -R0 * 0.6, b.z);
    for (const v of [a, a2, b, b, a2, b2]) { pos.push(v.x, v.y, v.z); col.push(skirt.r, skirt.g, skirt.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
  m.renderOrder = order;
  return m;
}

// Сектор вокруг направления: 1 — прямо по dir, 0 — в стороне (ширина w, рад)
const sector = (th, dir, w) => Math.exp(-((Math.atan2(Math.sin(th - dir), Math.cos(th - dir)) / w) ** 2));
const DOWN = -Math.PI / 2, UPHILL = Math.PI / 2; // вниз по склону — к −Z

// Фон: небо, дальние хребты в дымке, средний пояс и ближний массив. Подошва гор лежит на
// продолжении склона (deg): вверх по склону вершины поднимаются над трассой, вниз — открыта долина.
export function makeBackdrop(scale = 1, deg = 0) {
  const g = new THREE.Group(), S = scale;
  g.add(skyDome(1500 * S));
  const up = (th) => sector(th, UPHILL, 1.0), dn = (th) => sector(th, DOWN, 0.9);
  const foot = (k, kd) => (th) => deg * k * up(th) - deg * kd * dn(th) - 1;
  const layer = (o, foot, [a0, a1]) => g.add(massif({ ...o, base: foot, peak: (th) => { const b = foot(th); return [b + a0(th), b + a1(th)]; } }));
  // дальний хребет за долиной, средний пояс встаёт из долины (её дно скрыто склоном), ближний — только по бокам и вверх
  layer({ R0: 1250 * S, R1: 1480 * S, rows: 6, cols: 280, seed: 1, order: -2900, haze: 0.34, forest: 0.25 }, foot(0.8, 0.6),
    [() => 2, (th) => 7 + 5 * up(th) + (0.6 * deg + 1) * dn(th)]);
  layer({ R0: 950 * S, R1: 1230 * S, rows: 8, cols: 300, seed: 2, order: -2800, haze: 0.17, forest: 0.4 }, foot(0.9, 0.95),
    [(th) => 3 + 4 * up(th), (th) => 10 + 8 * up(th) + (0.95 * deg - 6) * dn(th)]);
  layer({ R0: 640 * S, R1: 920 * S, rows: 10, cols: 300, seed: 3, order: -2700, haze: 0.12, forest: 0.45 }, (th) => foot(0.95, 1.4)(th) - 6 * dn(th),
    [(th) => (1 - dn(th)) * (6 + 6 * up(th)), (th) => (1 - dn(th)) * (14 + 12 * up(th))]);
  g.traverse((o) => { o.frustumCulled = false; });
  return g;
}

// ---------------------------------------------------------------- студия
// Поляна в лесу: снежные холмы, кольцо елей, горы и небо.
export function decorateStudio(scene, snow) {
  scene.background = new THREE.Color(HORIZON);
  scene.fog = new THREE.Fog(HORIZON, 30, 150);
  scene.add(makeBackdrop(0.12));
  const g = loft(14, 96, (i, u) => {
    const r = lerp(30, 175, (i / 13) ** 1.6), a = u * TAU;
    const h = Math.max(0, r - 34) * 0.06 + Math.max(0, r - 60) ** 1.6 * 0.004 + fbm(Math.cos(a) * r * 0.03, Math.sin(a) * r * 0.03, 3) * Math.min(1, (r - 30) / 20) * 3;
    return [Math.cos(a) * r, h - 0.02, Math.sin(a) * r];
  }, { flip: true });
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 6, p.getZ(i) / 6);
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: snow.powder, roughness: 0.95 }));
  ground.receiveShadow = true;
  scene.add(ground);
  const K = treeKit(), r = rng(901), lists = [[], [], []], rocks = [];
  const hAt = (x, z) => { const rr = Math.hypot(x, z); return Math.max(0, rr - 34) * 0.06 + Math.max(0, rr - 60) ** 1.6 * 0.004; };
  for (let i = 0; i < 700 && lists.flat().length < 210; i++) {
    const a = r() * TAU, rr = 22 + r() ** 1.2 * 110, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (r() > 0.3 + 0.7 * smooth(-0.3, 0.3, noise2(x * 0.06, z * 0.06))) continue;
    const h = (rr < 30 ? 3 : 6) + r() * 9;
    lists[Math.floor(r() * 3)].push({ p: V3(x, hAt(x, z) - 0.2, z), h, r: h * (0.8 + r() * 0.3) });
  }
  for (let i = 0; i < 14; i++) { const a = r() * TAU, rr = 15 + r() * 25, k = 0.4 + r(); rocks.push({ p: V3(Math.cos(a) * rr, -0.15 * k, Math.sin(a) * rr), h: k, r: k * (1 + r() * 0.5) }); }
  lists.forEach((l, k) => scene.add(instances(K.near[k], K.mat, l, { seed: 300 + k })));
  scene.add(instances(K.rock, K.mat, rocks, { color: false, seed: 333 }));
}

// Снежная пыль: мягкое круглое пятно вместо квадратной точки
export function sprayTexture() {
  return canvasTex(64, 64, (x, W) => {
    const g = x.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(250,252,255,0.75)'); g.addColorStop(1, 'rgba(240,246,252,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, W);
  }, { aniso: 1 });
}

// ---------------------------------------------------------------- трассы: звезда, свечение, финиш
export function starGeo() {
  const sh = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 0.15 : 0.34;
    if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  g.translate(0, 0, -0.035);
  return g;
}
export function glowTexture() {
  return canvasTex(64, 64, (x, W) => {
    const g = x.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(0.35, 'rgba(255,210,90,0.45)'); g.addColorStop(1, 'rgba(255,200,80,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, W);
  }, { aniso: 1 });
}
export function finishBanner() {
  return canvasTex(1024, 64, (x, W, H) => {
    x.fillStyle = '#e11d48'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W / 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#111827' : '#ffffff'; x.fillRect(i * 16, j * 8, 16, 8); x.fillRect(i * 16, H - 16 + j * 8, 16, 8); }
    x.fillStyle = '#ffffff'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const u of [0.2, 0.5, 0.8]) x.fillText('ФИНИШ', u * W, H / 2 + 1);
  }, { aniso: 4 });
}
