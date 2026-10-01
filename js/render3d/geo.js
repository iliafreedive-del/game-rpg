// Geometry helpers: everything is procedural, vertex-coloured and merged into as few meshes as possible.
// Colour attribute is RGBA: alpha = 1 → normal lit surface, alpha = 0 → self-lit (glowing eyes, runes, highlights).
import * as THREE from '../vendor/three.module.min.js';

export function rng(seed = 1) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cheap smooth value noise + fbm (for ground colour, grass patches, hills)
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, y) => noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.15;

// id рисованной фактуры (js/render3d/textures.js MATS) → атрибут вершины aTex; 0 — без фактуры
export const TEX_ID = { none: 0, wood: 1, woodH: 2, stone: 3, roof: 4, plaster: 5, metal: 6, cloth: 7, bark: 8 };
const _c = new THREE.Color();
// paint a geometry with a flat colour (or a bottom→top gradient); returns a non-indexed copy
export function paint(geo, color, { top = null, y0 = null, y1 = null, emit = false, tex = null } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 4);
  const cb = new THREE.Color(color), ct = top !== null ? new THREE.Color(top) : cb;
  if (y0 === null) { g.computeBoundingBox(); y0 = g.boundingBox.min.y; y1 = g.boundingBox.max.y; }
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / ((y1 - y0) || 1)));
    _c.copy(cb).lerp(ct, t);
    col[i * 4] = _c.r; col[i * 4 + 1] = _c.g; col[i * 4 + 2] = _c.b; col[i * 4 + 3] = emit ? 0 : 1;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  if (tex) g.setAttribute('aTex', new THREE.BufferAttribute(new Float32Array(n).fill(TEX_ID[tex] || 0), 1));
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export function place(geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  if (typeof r === 'number') r = [r, r, r];
  if (typeof s === 'number') s = [s, s, s];
  _m.compose(_v.set(...p), _q.setFromEuler(_e.set(...r)), _s.set(...s));
  geo.applyMatrix4(_m);
  return geo;
}

// shorthand: build, place and paint a primitive in one go
export const part = (geo, color, p, r, s, o) => paint(place(geo, p, r, s), color, o);

export function merge(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 4), T = new Float32Array(n);
  let o = 0, anyTex = false;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const c = g.attributes.position.count;
    P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) C.set(g.attributes.color.array, o * 4); else C.fill(1, o * 4, (o + c) * 4);
    if (g.attributes.aTex) { T.set(g.attributes.aTex.array, o); anyTex = true; }
    o += c;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(P, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  m.setAttribute('color', new THREE.BufferAttribute(C, 4));
  if (anyTex) m.setAttribute('aTex', new THREE.BufferAttribute(T, 1));
  m.computeBoundingSphere();
  return m;
}

// bend normals towards a common centre → the whole crown/blob shades like one soft ball (Ghibli-style foliage)
export function spherify(geo, center, k = 0.75) {
  const p = geo.attributes.position, nr = geo.attributes.normal, a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    a.set(p.getX(i), p.getY(i), p.getZ(i)).sub(center).normalize();
    b.set(nr.getX(i), nr.getY(i), nr.getZ(i)).lerp(a, k).normalize();
    nr.setXYZ(i, b.x, b.y, b.z);
  }
  return geo;
}

// random vertex displacement for rocks / organic blobs (keeps shared vertices welded)
export function jitter(geo, amt, rand) {
  const p = geo.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let d = seen.get(key);
    if (!d) { d = [(rand() - .5) * amt, (rand() - .5) * amt, (rand() - .5) * amt]; seen.set(key, d); }
    p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

// soft round texture for blob shadows / particles
let _blob = null;
export function blobTexture() {
  if (_blob) return _blob;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  _blob = new THREE.CanvasTexture(c);
  return _blob;
}

// Бокс с фасками b (рубленые формы с бликом на рёбрах): 6 граней, 12 скосов рёбер, 8 угловых треугольников. Плоское затенение.
export function chamferBox(w, h, d, b = 0.04) {
  const hx = w / 2, hy = h / 2, hz = d / 2; b = Math.min(b, hx * 0.9, hy * 0.9, hz * 0.9);
  // точка грани axis (0 x, 1 y, 2 z) у угла (sx, sy, sz)
  const fp = (ax, sx, sy, sz) => [ax === 0 ? sx * hx : sx * (hx - b), ax === 1 ? sy * hy : sy * (hy - b), ax === 2 ? sz * hz : sz * (hz - b)];
  const P = [], tri = (a, c, e) => {
    const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2], vx = e[0] - a[0], vy = e[1] - a[1], vz = e[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, cx = a[0] + c[0] + e[0], cy = a[1] + c[1] + e[1], cz = a[2] + c[2] + e[2];
    if (nx * cx + ny * cy + nz * cz < 0) P.push(...a, ...e, ...c); else P.push(...a, ...c, ...e);
  };
  const quad = (a, c, e, f) => { tri(a, c, e); tri(a, e, f); };
  const S = [-1, 1];
  for (const s of S) {   // грани
    quad(fp(0, s, -1, -1), fp(0, s, 1, -1), fp(0, s, 1, 1), fp(0, s, -1, 1));
    quad(fp(1, -1, s, -1), fp(1, 1, s, -1), fp(1, 1, s, 1), fp(1, -1, s, 1));
    quad(fp(2, -1, -1, s), fp(2, 1, -1, s), fp(2, 1, 1, s), fp(2, -1, 1, s));
  }
  for (const a of S) for (const c of S) {   // скосы рёбер
    quad(fp(0, a, c, -1), fp(1, a, c, -1), fp(1, a, c, 1), fp(0, a, c, 1));          // ребро вдоль z
    quad(fp(0, a, -1, c), fp(2, a, -1, c), fp(2, a, 1, c), fp(0, a, 1, c));          // вдоль y
    quad(fp(1, -1, a, c), fp(2, -1, a, c), fp(2, 1, a, c), fp(1, 1, a, c));          // вдоль x
  }
  for (const sx of S) for (const sy of S) for (const sz of S) tri(fp(0, sx, sy, sz), fp(1, sx, sy, sz), fp(2, sx, sy, sz));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  return g;
}
// лёгкая кривизна «ручной работы»: сдвиг вершин по гладкому шуму (форма гнётся, а не рвётся)
export function warp(geo, amt, seed = 1) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, x + (noise(y * 1.3 + seed, z * 1.3) - 0.5) * amt, y + (noise(x * 1.3, z * 1.3 + seed) - 0.5) * amt * 0.5, z + (noise(x * 1.3 + seed, y * 1.3) - 0.5) * amt);
  }
  geo.computeVertexNormals(); return geo;
}
