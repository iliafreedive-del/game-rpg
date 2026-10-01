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

const _c = new THREE.Color();
// paint a geometry with a flat colour (or a bottom→top gradient); returns a non-indexed copy
export function paint(geo, color, { top = null, y0 = null, y1 = null, emit = false } = {}) {
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
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 4);
  let o = 0;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const c = g.attributes.position.count;
    P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) C.set(g.attributes.color.array, o * 4); else C.fill(1, o * 4, (o + c) * 4);
    o += c;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(P, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  m.setAttribute('color', new THREE.BufferAttribute(C, 4));
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
