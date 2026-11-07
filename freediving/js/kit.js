// Общие функции: математика, кривые по ключам, «лофт» — поверхность из колец-сечений.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Гладкая кривая по ключам [x, ...значения] (Катмулл-Ром).
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

// Точка суперэллипса: φ от +X к +Z. Спереди и сзади своя глубина — так получаются грудь, ягодицы, икры.
export function superPt(phi, ax, bzPos, bzNeg, p = 2.2) {
  const c = Math.cos(phi), s = Math.sin(phi), e = 2 / p;
  return [ax * Math.sign(c) * Math.abs(c) ** e, (s >= 0 ? bzPos : bzNeg) * Math.sign(s) * Math.abs(s) ** e];
}

// Лофт вдоль оси Y: кольца с профилем prof(y) → [rx, zFront, zBack, zOffset, xOffset].
// opts.weights(x,y,z) → [[кость, вес], ...] для скиннинга; opts.color(x,y,z,phi) → [r,g,b].
export function loftY({ y0, y1, rings = 40, seg = 28, prof, p = 2.2, capTop = true, capBot = true, weights, color, domeTop = 0, domeBot = 0 }) {
  const pos = [], col = [], si = [], sw = [], idx = [];
  const ys = [];
  // купола на концах — несколько колец, сходящихся к оси (плечо, пятка, макушка)
  for (let k = 0; k < domeTop; k++) ys.push({ y: y1, k: Math.sin(((k + 0.5) / domeTop) * Math.PI / 2), dome: 1 });
  for (let i = 0; i <= rings; i++) ys.push({ y: lerp(y1, y0, i / rings), k: 1 });
  for (let k = domeBot - 1; k >= 0; k--) ys.push({ y: y0, k: Math.sin(((k + 0.5) / domeBot) * Math.PI / 2), dome: -1 });
  const pushV = (x, y, z, phi) => {
    pos.push(x, y, z);
    const c = color ? color(x, y, z, phi) : [1, 1, 1];
    col.push(c[0], c[1], c[2]);
    if (weights) {
      const w = weights(x, y, z);
      for (let j = 0; j < 4; j++) { si.push(w[j] ? w[j][0] : 0); sw.push(w[j] ? w[j][1] : 0); }
    }
  };
  for (const r of ys) {
    const [rx, zf, zb, zo = 0, xo = 0] = prof(clamp(r.y, y0, y1));
    let y = r.y;
    if (r.dome === 1) y = y1 + Math.cos(Math.asin(r.k)) * Math.min(rx, zf) * 0.9;
    if (r.dome === -1) y = y0 - Math.cos(Math.asin(r.k)) * Math.min(rx, zf) * 0.9;
    for (let s = 0; s <= seg; s++) {
      const phi = (s / seg) * TAU;
      const [px, pz] = superPt(phi, rx * r.k, zf * r.k, zb * r.k, p);
      pushV(px + xo, y, pz + zo, phi);
    }
  }
  const W = seg + 1;
  for (let i = 0; i < ys.length - 1; i++) for (let s = 0; s < seg; s++) {
    const a = i * W + s, b = a + 1, c = a + W, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const cap = (ringI, y, up) => {
    const [, , , zo = 0, xo = 0] = prof(clamp(y, y0, y1));
    const ci = pos.length / 3;
    pushV(xo, y, zo, 0);
    for (let s = 0; s < seg; s++) {
      const a = ringI * W + s, b = a + 1;
      if (up) idx.push(ci, b, a); else idx.push(ci, a, b);
    }
  };
  if (capTop) cap(0, ys[0].y, true);
  if (capBot) cap(ys.length - 1, ys[ys.length - 1].y, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (weights) {
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  }
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Плавный переход веса между соседними костями цепочки. segs: [{bone, to}] сверху вниз, to — y нижней границы.
export function chainWeights(segs, blend = 0.05) {
  return (y) => {
    let pos = 0;
    for (let i = 0; i < segs.length - 1; i++) pos += smooth(segs[i].to + blend, segs[i].to - blend, y);
    const k = Math.min(Math.floor(pos), segs.length - 1), f = pos - k;
    if (f < 0.001 || k >= segs.length - 1) return [[segs[k].bone, 1]];
    return [[segs[k].bone, 1 - f], [segs[k + 1].bone, f]];
  };
}

export function hexRGB(h) { const c = new THREE.Color(h); return [c.r, c.g, c.b]; }
export function mixRGB(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
