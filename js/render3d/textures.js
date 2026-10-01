// Рисованные текстуры, которые генерируются на canvas при загрузке (без внешних файлов: Яндекс Игры, вес сборки).
// Все тайлятся (мазки у края повторяются с другой стороны). Размер маленький: 256–512 px, суммарно ≈ 3 МБ видеопамяти.
// Цвета — из палитры ART_BIBLE (трава, земля, мох), числа — TEX в style.js.
import * as THREE from '../vendor/three.module.min.js';
import { rng } from './geo.js';

const cache = new Map();
function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
// нарисовать фигуру так, чтобы она бесшовно повторялась
function wrap(size, x, y, r, draw) {
  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
    const X = x + ox, Y = y + oy;
    if (X + r < 0 || Y + r < 0 || X - r > size || Y - r > size) continue;
    draw(X, Y);
  }
}
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function stroke(x, X, Y, len, w, ang, col) {
  x.save(); x.translate(X, Y); x.rotate(ang); x.fillStyle = col;
  x.beginPath(); x.ellipse(0, 0, len, w, 0, 0, Math.PI * 2); x.fill(); x.restore();
}

// значение-шум с периодом p (тайлится): R — крупные пятна, G — средние, B — мелкие, A — 1
export function noiseTex() {
  if (cache.has('noise')) return cache.get('noise');
  const S = 256, c = canvas(S), x = c.getContext('2d'), img = x.createImageData(S, S), R = rng(7);
  const lattice = p => { const a = new Float32Array(p * p); for (let i = 0; i < a.length; i++) a[i] = R(); return a; };
  const oct = [[4, lattice(4)], [8, lattice(8)], [16, lattice(16)], [32, lattice(32)], [64, lattice(64)]];
  const val = (p, L, u, v) => {
    const fx = u * p, fy = v * p, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const g = (i, j) => L[((iy + j) % p) * p + ((ix + i) % p)];
    return (g(0, 0) * (1 - sx) + g(1, 0) * sx) * (1 - sy) + (g(0, 1) * (1 - sx) + g(1, 1) * sx) * sy;
  };
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S, v = j / S, k = (j * S + i) * 4;
    const a = val(4, oct[0][1], u, v) * 0.6 + val(8, oct[1][1], u, v) * 0.4;
    const b = val(16, oct[2][1], u, v) * 0.6 + val(8, oct[1][1], u, v) * 0.4;
    const f = val(64, oct[4][1], u, v) * 0.6 + val(32, oct[3][1], u, v) * 0.4;
    img.data[k] = a * 255; img.data[k + 1] = b * 255; img.data[k + 2] = f * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = tex(c, false); cache.set('noise', t); return t;
}

// трава: густые короткие мазки нескольких зелёных, светлые травинки сверху (как кисть по земле)
export function grassTex() {
  if (cache.has('grass')) return cache.get('grass');
  const S = 512, c = canvas(S), x = c.getContext('2d'), R = rng(21);
  x.fillStyle = hsl(96, 48, 26); x.fillRect(0, 0, S, S);
  // крупные пятна тона
  for (let i = 0; i < 70; i++) { const X = R() * S, Y = R() * S, r = 30 + R() * 70, c0 = hsl(80 + R() * 30, 50, 22 + R() * 14, 0.45); wrap(S, X, Y, r, (a, b) => { const g = x.createRadialGradient(a, b, 0, a, b, r); g.addColorStop(0, c0); g.addColorStop(1, hsl(90, 50, 25, 0)); x.fillStyle = g; x.fillRect(a - r, b - r, r * 2, r * 2); }); }
  // мазки-травинки: тёмные снизу, светлые сверху
  for (let pass = 0; pass < 3; pass++) {
    const n = [2600, 2200, 900][pass];
    for (let i = 0; i < n; i++) {
      const X = R() * S, Y = R() * S, len = [7, 6, 4][pass] + R() * 6, w = 1.2 + R() * 1.4, ang = -Math.PI / 2 + (R() - 0.5) * 1.1;
      const col = pass === 0 ? hsl(110 + R() * 20, 50, 13 + R() * 8, 0.8) : pass === 1 ? hsl(88 + R() * 22, 55, 30 + R() * 12, 0.75) : hsl(70 + R() * 20, 65, 46 + R() * 14, 0.7);
      wrap(S, X, Y, len, (a, b) => stroke(x, a, b, len, w, ang, col));
    }
  }
  const t = tex(c); cache.set('grass', t); return t;
}

// земля тропы: тёплая утоптанная глина, пятна, камешки с тенью, трещины
export function dirtTex() {
  if (cache.has('dirt')) return cache.get('dirt');
  const S = 512, c = canvas(S), x = c.getContext('2d'), R = rng(33);
  x.fillStyle = hsl(30, 34, 33); x.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) { const X = R() * S, Y = R() * S, r = 20 + R() * 60, c0 = hsl(24 + R() * 16, 30 + R() * 10, 24 + R() * 18, 0.5); wrap(S, X, Y, r, (a, b) => { const g = x.createRadialGradient(a, b, 0, a, b, r); g.addColorStop(0, c0); g.addColorStop(1, hsl(30, 30, 30, 0)); x.fillStyle = g; x.fillRect(a - r, b - r, r * 2, r * 2); }); }
  // горизонтальные мазки (утоптано)
  for (let i = 0; i < 1400; i++) { const X = R() * S, Y = R() * S, len = 6 + R() * 14, w = 1.5 + R() * 2, an = (R() - 0.5) * 0.6, col = hsl(28 + R() * 12, 30, 26 + R() * 22, 0.35); wrap(S, X, Y, len, (a, b) => stroke(x, a, b, len, w, an, col)); }
  // трещины
  x.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    let X = R() * S, Y = R() * S, a = R() * 6.28; x.strokeStyle = hsl(22, 35, 16, 0.55); x.lineWidth = 1 + R() * 1.4;
    for (let k = 0; k < 6; k++) { const nx = X + Math.cos(a) * (6 + R() * 10), ny = Y + Math.sin(a) * (6 + R() * 10); wrap(S, X, Y, 20, (p, q) => { x.beginPath(); x.moveTo(p, q); x.lineTo(p + nx - X, q + ny - Y); x.stroke(); }); X = nx; Y = ny; a += (R() - 0.5) * 1.2; }
  }
  // камешки
  for (let i = 0; i < 260; i++) {
    const X = R() * S, Y = R() * S, r = 1.6 + R() * R() * 6, l = 40 + R() * 22, h = 32 + R() * 14, sat = 14 + R() * 12, rot = R();
    wrap(S, X, Y, r + 2, (a, b) => {
      x.fillStyle = hsl(25, 30, 12, 0.6); x.beginPath(); x.ellipse(a + r * 0.25, b + r * 0.35, r * 1.05, r * 0.8, 0, 0, 6.28); x.fill();
      x.fillStyle = hsl(h, sat, l); x.beginPath(); x.ellipse(a, b, r, r * 0.75, rot, 0, 6.28); x.fill();
      x.fillStyle = hsl(40, 20, l + 18, 0.7); x.beginPath(); x.ellipse(a - r * 0.3, b - r * 0.3, r * 0.4, r * 0.25, 0, 0, 6.28); x.fill();
    });
  }
  const t = tex(c); cache.set('dirt', t); return t;
}

// лесная подстилка: тёмный мох, хвоя, листья
export function mossTex() {
  if (cache.has('moss')) return cache.get('moss');
  const S = 256, c = canvas(S), x = c.getContext('2d'), R = rng(45);
  x.fillStyle = hsl(110, 36, 13); x.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { const X = R() * S, Y = R() * S, len = 3 + R() * 6, w = 1 + R() * 1.6, an = R() * 6.28, col = R() < 0.25 ? hsl(30 + R() * 15, 40, 18 + R() * 12, 0.7) : hsl(95 + R() * 30, 45, 12 + R() * 14, 0.7); wrap(S, X, Y, len, (a, b) => stroke(x, a, b, len, w, an, col)); }
  const t = tex(c); cache.set('moss', t); return t;
}
