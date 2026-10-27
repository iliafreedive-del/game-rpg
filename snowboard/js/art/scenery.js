// Окружение: небо, горные хребты с лесом у подножия, ели под снегом, рельеф по краям трассы,
// снег (вельвет на трассе, пухляк вне её) и фон студии.
import * as THREE from 'three';
import { loft, merge, paint, canvasTex, grain, rng, noise2, fbm, smooth, lerp, clamp, TAU, V3 } from './kit.js';

export const HORIZON = '#d9e6f0';
const SUN_XZ = new THREE.Vector2(18, 10).normalize();
const PISTE = 22;

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

function rockGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, c = [], r = rng(seed);
  const o = r() * 100;
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i));
    const k = 1 + 0.28 * noise2(v.x * 1.7 + o, v.y * 1.7 + v.z * 1.3) + 0.12 * noise2(v.x * 4 + o, v.z * 4);
    v.multiplyScalar(k); v.y = v.y > 0 ? v.y * 0.75 : v.y * 0.4;
    p.setXYZ(i, v.x, v.y, v.z);
    const snowy = smooth(0.15, 0.45, v.y + 0.1 * noise2(v.x * 3, v.z * 3));
    const rock = new THREE.Color('#6a7380').lerp(new THREE.Color('#4a525d'), 0.5 + 0.5 * noise2(v.x * 5, v.z * 5));
    const col = rock.lerp(new THREE.Color('#f1f5f9'), snowy);
    c.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
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
      if (r() > dens(u, s)) continue;
      const off = Math.abs(u) - PISTE, young = off < 6 ? 0.55 : 1;
      const h = (6 + r() * 11 + Math.min(5, off * 0.12)) * young;
      near[Math.floor(r() * 3)].push({ p: frame.p(u, s, terrainH(u, s) - 0.25), h, r: h * (0.82 + r() * 0.3) });
    }
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? 1 : -1, u = side * (PISTE + 1.6 + r() * 4), s = c0 + r() * CH, h = 1.2 + r() * 2.2;
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
      rocks.push({ p: frame.p(u, s, terrainH(u, s) - 0.2 * k), h: k * (0.8 + r() * 0.5), r: k * (1 + r() * 0.6) });
    }
    const center = frame.p(0, c0 + CH / 2);
    const level = (list) => { const g = new THREE.Group(); g.position.copy(center).negate(); list.forEach((m) => g.add(m)); return g; };
    const lod = new THREE.LOD();
    lod.position.copy(center);
    lod.addLevel(level([
      ...near.map((l, k) => instances(K.near[k], K.mat, l, { shadow: true, seed: c0 + k })),
      instances(K.near[2], K.mat, small, { shadow: true, seed: c0 + 9 }),
      instances(K.rock, K.mat, rocks, { color: false, shadow: true, seed: c0 + 7 }),
      instances(K.far, K.mat, far, { seed: c0 + 5 }),
    ]), 0);
    lod.addLevel(level([instances(K.far, K.mat, near.flat(), { seed: c0 + 3 }), instances(K.far, K.mat, far, { seed: c0 + 5 })]), 170);
    lod.userData.s = c0 + CH / 2; lod.userData.cull = 440;
    chunks.push(lod);
  }
  return chunks;
}

// ---------------------------------------------------------------- небо и горы
function skyDome(R) {
  const g = new THREE.SphereGeometry(R, 48, 24), p = g.attributes.position, c = [];
  const zen = new THREE.Color('#4f8fd0'), mid = new THREE.Color('#9cc6ea'), hor = new THREE.Color(HORIZON), low = new THREE.Color('#e6edf3'), warm = new THREE.Color('#fff3dc');
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    let col = v.y < 0 ? hor.clone().lerp(low, smooth(0, 0.2, -v.y)) : v.y < 0.18 ? hor.clone().lerp(mid, smooth(0, 0.18, v.y)) : mid.clone().lerp(zen, smooth(0.18, 0.85, v.y));
    const sun = Math.max(0, v.x * SUN_XZ.x + v.z * SUN_XZ.y) * (1 - Math.abs(v.y));
    col.lerp(warm, sun ** 3 * 0.35);
    c.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, depthTest: false }));
  m.renderOrder = -3000;
  return m;
}

// Кольцо хребта: высота в градусах над горизонтом, цвет — снег/скалы/лес, свет от солнца, дымка.
function ridge({ R, n, eMin, eMax, seed, snow, forest = 0, haze, order, rows = 12 }) {
  const top = (th) => {
    const c = Math.cos(th), s = Math.sin(th);
    const a = 1 - Math.abs(noise2(c * 2.2 + seed * 7, s * 2.2 - seed));
    const b = 1 - Math.abs(noise2(c * 5.5 - seed * 3, s * 5.5 + seed * 5));
    const v = 0.65 * a ** 2.2 + 0.35 * b ** 2 + 0.05 * noise2(c * 20 + seed, s * 20);
    return R * Math.tan((eMin + (eMax - eMin) * clamp(v, 0, 1)) * Math.PI / 180);
  };
  const yb = -R * 0.5, hz = new THREE.Color(HORIZON);
  const cSnowL = new THREE.Color('#f6f9fc'), cSnowS = new THREE.Color('#b3c4d8'), cRockL = new THREE.Color('#6d7b8c'), cRockS = new THREE.Color('#465264');
  const cForL = new THREE.Color('#2b4636'), cForS = new THREE.Color('#192c23');
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * TAU, yt = top(th), d = 0.004;
    const g = (top(th + d) - top(th - d)) / (2 * d * R);
    const rad = new THREE.Vector2(Math.cos(th), Math.sin(th)), tan = new THREE.Vector2(-Math.sin(th), Math.cos(th));
    const nrm = rad.clone().multiplyScalar(-1).addScaledVector(tan, -g * 2.2).normalize();
    const light = clamp(nrm.dot(SUN_XZ) * 0.5 + 0.5, 0, 1);
    const sl = snow + 0.12 * noise2(th * 9 + seed, 3.3);
    for (let j = 0; j <= rows; j++) {
      const rel = 1 - (1 - j / rows) ** 1.6, y = lerp(yb, yt, rel);
      const relH = (y - Math.min(0, yt * 0.2)) / Math.max(1, yt - Math.min(0, yt * 0.2));
      const streak = noise2(th * 80 + seed * 11, relH * 3) * 0.16 + noise2(th * 23, relH * 6 + seed) * 0.08;
      const lit = clamp(light + 0.15 * noise2(th * 40 + seed, relH * 4), 0, 1);
      const isSnow = smooth(sl - 0.04, sl + 0.04, relH + streak);
      let c = cRockS.clone().lerp(cRockL, lit).lerp(cSnowS.clone().lerp(cSnowL, lit), isSnow);
      if (forest) {
        const fl = forest + 0.08 * noise2(th * 15 + seed, 1.7);
        const isFor = 1 - smooth(fl - 0.05, fl + 0.02, relH + streak * 0.4);
        const speck = 0.5 + 0.5 * noise2(th * 160 + seed, relH * 30);
        c.lerp(cForS.clone().lerp(cForL, lit).lerp(cSnowL, speck * 0.22), isFor);
      }
      c.lerp(hz, haze * (1 - relH * 0.4));
      pos.push(Math.cos(th) * R, y, Math.sin(th) * R);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
    const a = i * (rows + 1) + j, b = a + rows + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
  m.renderOrder = order;
  return m;
}

// Фон: рисуется первым и без буфера глубины (на таком расстоянии точности глубины не хватает)
export function makeBackdrop(scale = 1) {
  const g = new THREE.Group();
  g.add(skyDome(1500 * scale));
  g.add(ridge({ R: 1350 * scale, n: 420, eMin: 2.5, eMax: 13, seed: 1, snow: 0.3, haze: 0.36, order: -2900 }));
  g.add(ridge({ R: 1100 * scale, n: 360, eMin: 0.3, eMax: 7.5, seed: 2, snow: 0.55, forest: 0.38, haze: 0.22, order: -2800 }));
  g.add(ridge({ R: 850 * scale, n: 300, eMin: -9, eMax: 0.6, seed: 3, snow: 2, forest: 1.2, haze: 0.14, order: -2700, rows: 8 }));
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
