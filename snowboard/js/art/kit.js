// Набор для процедурной графики: шум, поверхности из колец («лофт»), толстые оболочки,
// скиннинг по костям и текстуры на canvas. Без DOM работают только функции геометрии.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Детерминированный генератор (mulberry32): одинаковый лес при каждом запуске.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// Плавный шум −1…1
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}
export function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise2(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}

// Гладкая кривая по ключам [x, ...значения] (Катмулл-Ром). Возвращает массив значений в точке x.
export function curve(keys) {
  return (x) => {
    let i = 0;
    while (i < keys.length - 2 && x > keys[i + 1][0]) i++;
    const k1 = keys[i], k2 = keys[i + 1], k0 = keys[Math.max(0, i - 1)], k3 = keys[Math.min(keys.length - 1, i + 2)];
    const t = clamp((x - k1[0]) / (k2[0] - k1[0] || 1), 0, 1), t2 = t * t, t3 = t2 * t;
    const out = [];
    for (let j = 1; j < k1.length; j++) {
      const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j];
      out.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
    }
    return out;
  };
}

// Точка суперэллипса: φ от +X к +Z; хорошо описывает сечения тела, ботинка, доски.
export function superPt(phi, ax, bzPos, bzNeg, p = 2) {
  const c = Math.cos(phi), s = Math.sin(phi), e = 2 / p;
  return [ax * Math.sign(c) * Math.abs(c) ** e, (s >= 0 ? bzPos : bzNeg) * Math.sign(s) * Math.abs(s) ** e];
}

// Поверхность из колец. ring(i, u) → [x, y, z] для колец i = 0…nr−1, u ∈ [0, 1] (u = 0 и 1 — шов).
// Нормали наружу, если кольца идут вдоль +Y, а φ растёт от +X к +Z; иначе flip.
export function loft(nr, nseg, ring, { v = (i) => i / (nr - 1), flip = false } = {}) {
  const cols = nseg + 1;
  const pos = new Float32Array(nr * cols * 3), uv = new Float32Array(nr * cols * 2);
  for (let i = 0; i < nr; i++) {
    const vi = v(i);
    for (let j = 0; j < cols; j++) {
      const k = i * cols + j, p = ring(i, j / nseg);
      pos[k * 3] = p[0]; pos[k * 3 + 1] = p[1]; pos[k * 3 + 2] = p[2];
      uv[k * 2] = j / nseg; uv[k * 2 + 1] = vi;
    }
  }
  const idx = [];
  for (let i = 0; i < nr - 1; i++) for (let j = 0; j < nseg; j++) {
    const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
    if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // шов и полюса: усредняем нормали совпадающих вершин
  const n = g.attributes.normal, t = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i < nr; i++) {
    const a = i * cols, b = a + nseg;
    let pole = true;
    for (let j = 1; j < cols && pole; j++) if (Math.abs(pos[(a + j) * 3] - pos[a * 3]) + Math.abs(pos[(a + j) * 3 + 1] - pos[a * 3 + 1]) + Math.abs(pos[(a + j) * 3 + 2] - pos[a * 3 + 2]) > 1e-7) pole = false;
    if (pole) {
      t.set(0, 0, 0);
      for (let j = 0; j < cols; j++) t.add(q.fromBufferAttribute(n, a + j));
      t.normalize();
      for (let j = 0; j < cols; j++) n.setXYZ(a + j, t.x, t.y, t.z);
    } else {
      t.fromBufferAttribute(n, a).add(q.fromBufferAttribute(n, b)).normalize();
      n.setXYZ(a, t.x, t.y, t.z); n.setXYZ(b, t.x, t.y, t.z);
    }
  }
  return g;
}

// Толстая пластина по средней поверхности f(s, t) → Vector3; thick(s, t) — толщина.
// Лицевая сторона смотрит по ∂f/∂s × ∂f/∂t.
export function shell(f, ns, nt, thick, { flip = false } = {}) {
  const th = typeof thick === 'function' ? thick : () => thick;
  const P = [], N = [], e = 1e-3;
  for (let i = 0; i <= ns; i++) for (let j = 0; j <= nt; j++) {
    const s = i / ns, t = j / nt;
    const p = f(s, t);
    const ds = f(Math.min(1, s + e), t).sub(f(Math.max(0, s - e), t));
    const dt = f(s, Math.min(1, t + e)).sub(f(s, Math.max(0, t - e)));
    const n = ds.cross(dt).normalize();
    if (flip) n.negate();
    P.push(p); N.push(n);
  }
  const at = (i, j) => i * (nt + 1) + j;
  const pos = [], uv = [], idx = [];
  const put = (p, u, v) => { pos.push(p.x, p.y, p.z); uv.push(u, v); return pos.length / 3 - 1; };
  const off = (i, j, k) => P[at(i, j)].clone().addScaledVector(N[at(i, j)], k * th(i / ns, j / nt) / 2);
  // лицо и изнанка
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= ns; i++) for (let j = 0; j <= nt; j++) put(off(i, j, side), i / ns, j / nt);
    for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
      const a = base + at(i, j), b = base + at(i + 1, j), c = base + at(i, j + 1), d = base + at(i + 1, j + 1);
      if ((side > 0) !== flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
  }
  // торцы: обходим край против часовой стрелки в (s, t)
  const loop = [];
  for (let i = 0; i < ns; i++) loop.push([i, 0]);
  for (let j = 0; j < nt; j++) loop.push([ns, j]);
  for (let i = ns; i > 0; i--) loop.push([i, nt]);
  for (let j = nt; j > 0; j--) loop.push([0, j]);
  const edgeBase = pos.length / 3;
  loop.forEach(([i, j], k) => { put(off(i, j, 1), k / loop.length, 1); put(off(i, j, -1), k / loop.length, 0); });
  for (let k = 0; k < loop.length; k++) {
    const a = edgeBase + k * 2, b = edgeBase + ((k + 1) % loop.length) * 2;
    if (!flip) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Меш с костями: weight(v) → [[кость, вес], ...]. rest — матрицы костей в позе, в которой построена геометрия.
// Кости — потомки того же родителя, что и меш; их положение задаётся прямо в его системе.
export function skinned(geo, mat, bones, rest, weight) {
  if (!geo.attributes.skinIndex) {
    const p = geo.attributes.position, n = p.count, v = new THREE.Vector3();
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const w = weight(v.fromBufferAttribute(p, i)).filter((x) => x[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const sum = w.reduce((a, x) => a + x[1], 0) || 1;
      w.forEach(([b, x], k) => { si[i * 4 + k] = b; sw[i * 4 + k] = x / sum; });
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  }
  const m = new THREE.SkinnedMesh(geo, mat);
  m.bind(new THREE.Skeleton(bones, rest.map((r) => r.clone().invert())), new THREE.Matrix4());
  m.frustumCulled = false;
  return m;
}

const _m = new THREE.Matrix4();
// Кость по базису: Y — вдоль сегмента, Z — «перед» сегмента, X = Y × Z.
export function setBasis(obj, pos, X, Y, Z) {
  _m.makeBasis(X, Y, Z);
  obj.quaternion.setFromRotationMatrix(_m);
  obj.position.copy(pos);
}
export function frameYZ(Y, pole, X = new THREE.Vector3(), Z = new THREE.Vector3()) {
  Z.copy(pole).addScaledVector(Y, -pole.dot(Y));
  if (Z.lengthSq() < 1e-8) Z.set(0, 0, 1).addScaledVector(Y, -Y.z);
  Z.normalize();
  X.crossVectors(Y, Z).normalize();
  return { X, Z };
}

// Склейка геометрий с одинаковым набором атрибутов (индексированных или нет).
export function merge(list) {
  const names = Object.keys(list[0].attributes);
  const out = new THREE.BufferGeometry(), idx = [];
  let base = 0;
  const arrays = Object.fromEntries(names.map((n) => [n, []]));
  for (const g0 of list) {
    const g = g0.index ? g0 : g0.toNonIndexed();
    for (const n of names) arrays[n].push(...g.attributes[n].array);
    const cnt = g.attributes.position.count;
    if (g.index) for (const i of g.index.array) idx.push(base + i);
    else for (let i = 0; i < cnt; i++) idx.push(base + i);
    base += cnt;
  }
  for (const n of names) out.setAttribute(n, new THREE.Float32BufferAttribute(arrays[n], list[0].attributes[n].itemSize));
  out.setIndex(idx);
  return out;
}

// Перекрасить вершины одной краской (для склейки разноцветных частей в один меш).
export function paint(g, color) {
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

// ---------------------------------------------------------------- текстуры (только в браузере)
export function canvasTex(w, h, draw, { repeat = false, srgb = true, aniso = 4 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}
// Лёгкий шум ткани поверх уже нарисованного
export function grain(x, w, h, amt = 10, seed = 1) {
  const r = rng(seed), img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(img, 0, 0);
}
export function shade(hex, k) {
  const c = new THREE.Color(hex);
  if (k < 0) c.lerp(new THREE.Color('#000'), -k); else c.lerp(new THREE.Color('#fff'), k);
  return '#' + c.getHexString();
}

// Карта неба для отражений на маске, шлеме и доске (эквиректангулярная).
let ENV = null;
export function envMap() {
  if (ENV) return ENV;
  ENV = canvasTex(256, 128, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3f7fc4'); g.addColorStop(0.42, '#a9d0f0'); g.addColorStop(0.5, '#e8f1f8');
    g.addColorStop(0.52, '#f4f7fa'); g.addColorStop(1, '#c9d6e2');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // горы и лес на горизонте
    x.fillStyle = '#7d95ad';
    x.beginPath(); x.moveTo(0, h * 0.5);
    for (let i = 0; i <= 64; i++) x.lineTo((i / 64) * w, h * (0.5 - 0.06 - 0.05 * Math.abs(Math.sin(i * 1.7) + Math.sin(i * 0.53))));
    x.lineTo(w, h * 0.5); x.fill();
    x.fillStyle = '#2d4a3c'; x.fillRect(0, h * 0.495, w, h * 0.02);
    const s = x.createRadialGradient(w * 0.17, h * 0.22, 0, w * 0.17, h * 0.22, 26);
    s.addColorStop(0, '#fffef6'); s.addColorStop(1, 'rgba(255,250,230,0)');
    x.fillStyle = s; x.fillRect(0, 0, w, h);
  }, { aniso: 1 });
  ENV.mapping = THREE.EquirectangularReflectionMapping;
  return ENV;
}
