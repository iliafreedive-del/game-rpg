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

// ---------------------------------------------------------------- фактуры материалов (цветные «множители» вокруг 0,5: цвет даёт вершина)
// Все слои рисуются 512 px, потом сжимаются и собираются в ОДИН массив текстур (sampler2DArray): 15 слоёв, один сэмплер на шейдер.
// Накладываются triplanar в пространстве модели (js/render3d/toon.js), id материала — атрибут вершины aTex (geo.js, TEX_ID).
// Оттенок в слое — относительный (тёплый/холодный/зелёный мох/ржавчина): итог = цвет вершины × слой.
const gray = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;
const col = (v, t, a = 1) => `rgba(${Math.min(255, v * t[0]) | 0},${Math.min(255, v * t[1]) | 0},${Math.min(255, v * t[2]) | 0},${a})`;
const WARM = [1.1, 1, 0.84], COOL = [0.9, 0.98, 1.08], MOSS = [0.74, 1.08, 0.66], RUST = [1.5, 0.82, 0.5], SOOT = [0.9, 0.86, 0.82], SAND = [1.08, 1.02, 0.86], BRICK = [1.25, 0.8, 0.66];
function base(S, v, t = [1, 1, 1]) { const c = canvas(S), x = c.getContext('2d'); x.fillStyle = col(v, t); x.fillRect(0, 0, S, S); return [c, x]; }
const pick = (R, a) => a[(R() * a.length) | 0];

// доски: тёплые и холодные, волокна вдоль U, тёмные щели, сучки, светлые потёртые края, серые выцветшие пятна, потёки грязи
function woodTex() {
  const S = 512, [c, x] = base(S, 128), R = rng(51), PL = 4, ph = S / PL;
  for (let p = 0; p < PL; p++) {
    const y0 = p * ph, tone = 108 + R() * 40, tint = pick(R, [WARM, WARM, COOL, SAND, [1, 1, 1]]);
    x.fillStyle = col(tone, tint); x.fillRect(0, y0, S, ph);
    for (let i = 0; i < 50; i++) {   // волокна: длинные волнистые линии
      const yy = y0 + R() * ph, amp = 1 + R() * 3, fr = 0.01 + R() * 0.02, ph0 = R() * 6, v = tone + (R() - 0.55) * 64;
      x.strokeStyle = col(Math.max(30, v), tint, 0.5); x.lineWidth = 0.8 + R() * 1.8; x.beginPath();
      for (let X = 0; X <= S; X += 8) { const Y = yy + Math.sin(X * fr + ph0) * amp; X ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke();
    }
    for (let i = 0; i < 4; i++) { const X = R() * S, r = 30 + R() * 70; wrap(S, X, y0 + R() * ph, r, (a, b) => { x.fillStyle = col(150, [0.95, 1, 1.05], 0.16); x.beginPath(); x.ellipse(a, b, r, ph * 0.3, 0, 0, 6.28); x.fill(); }); }   // выцветшие серые пятна
    for (let k = 0; k < 2; k++) if (R() < 0.7) {   // сучок
      const X = R() * S, Y = y0 + ph * (0.3 + R() * 0.4), r = 5 + R() * 7;
      for (let j = 4; j > 0; j--) { x.strokeStyle = col(60 + j * 10, tint, 0.6); x.lineWidth = 1.4; x.beginPath(); x.ellipse(X, Y, r * j * 0.6 + 4, r * j * 0.3 + 2, 0, 0, 6.28); x.stroke(); }
      x.fillStyle = gray(42); x.beginPath(); x.ellipse(X, Y, r * 0.5, r * 0.35, 0, 0, 6.28); x.fill();
    }
    const g = x.createLinearGradient(0, y0, 0, y0 + ph); g.addColorStop(0, gray(205, 0.4)); g.addColorStop(0.12, gray(128, 0)); g.addColorStop(0.8, gray(128, 0)); g.addColorStop(1, col(25, SOOT, 0.55));
    x.fillStyle = g; x.fillRect(0, y0, S, ph);
    x.fillStyle = gray(16); x.fillRect(0, y0 + ph - 3, S, 3);
    for (let i = 0; i < 3; i++) { const X = R() * S; x.fillStyle = gray(24); x.fillRect(X, y0, 3, ph); }   // торцы досок
    for (let i = 0; i < 5; i++) { const X = R() * S, L = 20 + R() * 60; const gg = x.createLinearGradient(0, y0, 0, y0 + L); gg.addColorStop(0, col(60, SOOT, 0.4)); gg.addColorStop(1, col(60, SOOT, 0)); x.fillStyle = gg; x.fillRect(X, y0, 2 + R() * 3, L); }   // потёки сверху
  }
  return c;
}
// кладка: блоки разных оттенков, тёмные швы со мхом, потёки, светлый верх блока, трещины и сколы
function stoneTex() {
  const S = 512, [c, x] = base(S, 46), R = rng(61), rows = 6, rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let X = -R() * 60;
    while (X < S) {
      const w = 60 + R() * 70, y0 = r * rh, tone = 105 + R() * 55, tint = pick(R, [WARM, COOL, COOL, [1, 1, 1], SAND]), j = () => (R() - 0.5) * 6;
      const poly = [[X + 4 + j(), y0 + 4 + j()], [X + w - 4 + j(), y0 + 4 + j()], [X + w - 3 + j(), y0 + rh - 4 + j()], [X + 3 + j(), y0 + rh - 4 + j()]];
      const moss = R() < 0.35, mx = R() * w;
      for (const ox of [0, -S]) {
        if (ox && X + w <= S) continue;
        x.save(); x.translate(ox, 0);
        // мох во шве снизу блока
        if (moss) { for (let k = 0; k < 7; k++) { x.fillStyle = col(95 + R() * 40, MOSS, 0.55); x.beginPath(); x.ellipse(X + mx + (R() - 0.5) * 36, y0 + rh - 2 + (R() - 0.5) * 4, 6 + R() * 9, 3 + R() * 4, 0, 0, 6.28); x.fill(); } }
        x.fillStyle = col(tone, tint); x.beginPath(); poly.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill();
        x.save(); x.clip();
        for (let k = 0; k < 16; k++) { x.fillStyle = col(tone + (R() - 0.5) * 56, tint, 0.25); x.beginPath(); x.ellipse(X + R() * w, y0 + R() * rh, 6 + R() * 16, 4 + R() * 10, R() * 3, 0, 6.28); x.fill(); }
        if (moss) for (let k = 0; k < 4; k++) { x.fillStyle = col(110, MOSS, 0.4); x.beginPath(); x.ellipse(X + mx + (R() - 0.5) * 30, y0 + rh - 4 + (R() - 0.5) * 8, 8 + R() * 10, 4 + R() * 5, 0, 0, 6.28); x.fill(); }
        for (let k = 0; k < 2; k++) { const dx = X + R() * w, L = 18 + R() * 40, gg = x.createLinearGradient(0, y0, 0, y0 + L); gg.addColorStop(0, col(40, SOOT, 0.45)); gg.addColorStop(1, col(40, SOOT, 0)); x.fillStyle = gg; x.fillRect(dx, y0, 2 + R() * 3, L); }   // потёки
        const g = x.createLinearGradient(0, y0, 0, y0 + rh); g.addColorStop(0, gray(235, 0.5)); g.addColorStop(0.22, gray(128, 0)); g.addColorStop(0.75, gray(128, 0)); g.addColorStop(1, gray(10, 0.5));
        x.fillStyle = g; x.fillRect(X, y0, w, rh);
        x.strokeStyle = gray(225, 0.35); x.lineWidth = 1.4; x.beginPath(); x.moveTo(X + 5, y0 + rh - 6); x.lineTo(X + 5, y0 + 5); x.lineTo(X + w - 5, y0 + 5); x.stroke();   // «рисованная» подсветка граней
        if (R() < 0.35) { x.strokeStyle = gray(28, 0.85); x.lineWidth = 1.2; x.beginPath(); let a = X + R() * w, b = y0 + 5; x.moveTo(a, b); for (let k = 0; k < 4; k++) { a += (R() - 0.5) * 18; b += rh / 5; x.lineTo(a, b); } x.stroke(); }
        x.restore(); x.restore();
      }
      X += w;
    }
  }
  return c;
}
// дранка: ряды дощечек со своим тоном, выгоревшие светлые кромки, мох, тёмные щели
function roofTex() {
  const S = 512, [c, x] = base(S, 30), R = rng(71), rows = 8, rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let X = (r % 2) * 30 - 30;
    while (X < S) {
      const w = 40 + R() * 26, y0 = r * rh, tone = 100 + R() * 70, tint = pick(R, [WARM, WARM, SAND, COOL, SOOT]);
      const g = x.createLinearGradient(0, y0, 0, y0 + rh); g.addColorStop(0, col(tone * 0.62, tint)); g.addColorStop(0.7, col(tone, tint)); g.addColorStop(0.9, col(tone * 1.32, SAND)); g.addColorStop(1, gray(22));
      x.fillStyle = g; x.beginPath(); x.moveTo(X + 2, y0); x.lineTo(X + w - 2, y0); x.lineTo(X + w - 3, y0 + rh - 2); x.quadraticCurveTo(X + w / 2, y0 + rh + 3, X + 3, y0 + rh - 2); x.closePath(); x.fill();
      for (let k = 0; k < 6; k++) { x.strokeStyle = col(tone * 0.55, tint, 0.4); x.lineWidth = 1; const a = X + 5 + R() * (w - 10); x.beginPath(); x.moveTo(a, y0 + 3); x.lineTo(a + (R() - 0.5) * 4, y0 + rh - 6); x.stroke(); }
      if (R() < 0.18) { x.fillStyle = col(100, MOSS, 0.55); for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(X + R() * w, y0 + rh * (0.5 + R() * 0.45), 4 + R() * 6, 2.5 + R() * 3, 0, 0, 6.28); x.fill(); } }
      X += w;
    }
  }
  return c;
}
// штукатурка: пятна, подтёки, трещины и отбитые куски, под которыми видна кирпичная кладка
function plasterTex() {
  const S = 512, R = rng(81), c = canvas(S), x = c.getContext('2d');
  // слой кладки
  const bh = 24, bw = 56;
  x.fillStyle = col(70, BRICK); x.fillRect(0, 0, S, S);
  for (let r = 0; r * bh < S; r++) for (let X = -(r % 2) * bw / 2; X < S; X += bw) { x.fillStyle = col(96 + R() * 56, pick(R, [BRICK, BRICK, WARM, [1.1, 0.9, 0.8]])); x.fillRect(X + 2, r * bh + 2, bw - 4, bh - 4); x.fillStyle = gray(235, 0.25); x.fillRect(X + 2, r * bh + 2, bw - 4, 3); }
  // слой штукатурки
  const p = canvas(S), px = p.getContext('2d');
  px.fillStyle = gray(142); px.fillRect(0, 0, S, S);
  for (let i = 0; i < 300; i++) { const X = R() * S, Y = R() * S, r = 8 + R() * 36, v = 142 + (R() - 0.5) * 66; wrap(S, X, Y, r, (a, b) => { px.fillStyle = col(v, R() < 0.5 ? WARM : SAND, 0.2); px.beginPath(); px.ellipse(a, b, r, r * 0.7, R() * 3, 0, 6.28); px.fill(); }); }
  for (let i = 0; i < 90; i++) { const X = R() * S, Y = R() * S, r = 1 + R() * 2.5; wrap(S, X, Y, r, (a, b) => { px.fillStyle = gray(R() < 0.5 ? 210 : 90, 0.45); px.beginPath(); px.arc(a, b, r, 0, 6.28); px.fill(); }); }   // крупинки
  for (let i = 0; i < 14; i++) { let a = R() * S, b = R() * S; px.strokeStyle = gray(70, 0.55); px.lineWidth = 0.8 + R(); px.beginPath(); px.moveTo(a, b); for (let k = 0; k < 6; k++) { a += (R() - 0.5) * 26; b += (R() - 0.5) * 26 + 4; px.lineTo(a, b); } px.stroke(); }
  for (let i = 0; i < 7; i++) { const X = R() * S, L = 40 + R() * 90, g = px.createLinearGradient(0, 0, 0, L); g.addColorStop(0, col(70, SOOT, 0.35)); g.addColorStop(1, col(70, SOOT, 0)); px.save(); px.translate(X, R() * S * 0.5); px.fillStyle = g; px.fillRect(0, 0, 3 + R() * 6, L); px.restore(); }
  // отбитые куски: неровные дыры (с тенью по краю), через них — кладка
  const chips = [];
  for (let i = 0; i < 5; i++) {
    const X = R() * S, Y = R() * S, r = 18 + R() * 30, pts = Array.from({ length: 9 }, (_, k) => [Math.cos(k / 9 * 6.283) * r * (0.6 + R() * 0.6), Math.sin(k / 9 * 6.283) * r * (0.5 + R() * 0.5)]);
    wrap(S, X, Y, r * 1.3, (a, b) => chips.push([a, b, pts]));
  }
  px.globalCompositeOperation = 'destination-out';
  for (const [a, b, pts] of chips) { px.fillStyle = '#000'; px.beginPath(); pts.forEach(([u, v], i) => i ? px.lineTo(a + u, b + v) : px.moveTo(a + u, b + v)); px.closePath(); px.fill(); }
  x.drawImage(p, 0, 0);
  x.strokeStyle = gray(25, 0.65); x.lineWidth = 2.2; x.lineJoin = 'round';
  for (const [a, b, pts] of chips) { x.beginPath(); pts.forEach(([u, v], i) => i ? x.lineTo(a + u, b + v) : x.moveTo(a + u, b + v)); x.closePath(); x.stroke(); }
  return c;
}
// металл: шлифовка, царапины, вмятины, ржавчина пятнами и по краям тайла
function metalTex() {
  const S = 512, [c, x] = base(S, 132), R = rng(91);
  for (let i = 0; i < 700; i++) { const Y = R() * S; x.fillStyle = gray(132 + (R() - 0.5) * 60, 0.25); x.fillRect(0, Y, S, 1); }
  for (let i = 0; i < 120; i++) { const X = R() * S, Y = R() * S, L = 10 + R() * 50, a = R() * 6.28, v = R() < 0.5 ? 225 : 50; wrap(S, X, Y, L, (p, q) => { x.strokeStyle = gray(v, 0.5); x.lineWidth = 0.8; x.beginPath(); x.moveTo(p, q); x.lineTo(p + Math.cos(a) * L, q + Math.sin(a) * L); x.stroke(); }); }
  for (let i = 0; i < 22; i++) { const X = R() * S, Y = R() * S, r = 8 + R() * 20; wrap(S, X, Y, r, (a, b) => { const g = x.createRadialGradient(a - r * 0.3, b - r * 0.3, 0, a, b, r); g.addColorStop(0, gray(205, 0.35)); g.addColorStop(1, gray(60, 0)); x.fillStyle = g; x.fillRect(a - r, b - r, r * 2, r * 2); }); }
  for (let i = 0; i < 26; i++) { const X = R() * S, Y = R() * S, r = 10 + R() * 28; wrap(S, X, Y, r, (a, b) => { const g = x.createRadialGradient(a, b, 0, a, b, r); g.addColorStop(0, col(105 + R() * 40, RUST, 0.8)); g.addColorStop(0.6, col(95, RUST, 0.4)); g.addColorStop(1, col(95, RUST, 0)); x.fillStyle = g; x.fillRect(a - r, b - r, r * 2, r * 2); }); }   // ржавчина
  for (const [X, Y, W, H] of [[0, 0, S, 14], [0, S - 14, S, 14], [0, 0, 14, S], [S - 14, 0, 14, S]]) { const g = x.createLinearGradient(X, Y, X + (W < H ? W : 0), Y + (H < W ? H : 0)); const edge = X === 0 && Y === 0 ? [0, 1] : [1, 0]; g.addColorStop(edge[0], col(110, RUST, 0.45)); g.addColorStop(edge[1], col(110, RUST, 0)); x.fillStyle = g; x.fillRect(X, Y, W, H); }
  return c;
}
// ткань: плетение, складки, вышитая кайма (ромбы и зигзаг светлее основы), стёжка, заплатки, лёгкая выцветшая вытертость
function clothTex() {
  const S = 512, [c, x] = base(S, 128), R = rng(101);
  for (let y = 0; y < S; y += 4) { x.fillStyle = gray(116 + (y % 8 ? 12 : -10), 0.6); x.fillRect(0, y, S, 2); }
  for (let X = 0; X < S; X += 4) { x.fillStyle = gray(128 + (X % 8 ? 8 : -14), 0.4); x.fillRect(X, 0, 2, S); }
  for (let i = 0; i < 12; i++) { const X = R() * S, w = 14 + R() * 36; const g = x.createLinearGradient(X - w, 0, X + w, 0); g.addColorStop(0, gray(128, 0)); g.addColorStop(0.5, gray(R() < 0.5 ? 62 : 200, 0.35)); g.addColorStop(1, gray(128, 0)); x.fillStyle = g; for (const o of [-S, 0, S]) x.fillRect(X - w + o, 0, w * 2, S); }
  for (let i = 0; i < 40; i++) { const X = R() * S, Y = R() * S, r = 14 + R() * 30; wrap(S, X, Y, r, (a, b) => { x.fillStyle = col(165, WARM, 0.14); x.beginPath(); x.ellipse(a, b, r, r * 0.8, 0, 0, 6.28); x.fill(); }); }   // вытертость
  // вышивка: полоса ромбов, полоса зигзага (светлая нить), по краям — двойная строчка
  const Y1 = 64;
  x.fillStyle = gray(90, 0.5); x.fillRect(0, Y1 - 22, S, 44);
  for (let X = 0; X < S; X += 32) { x.fillStyle = col(215, WARM); x.beginPath(); x.moveTo(X + 16, Y1 - 14); x.lineTo(X + 28, Y1); x.lineTo(X + 16, Y1 + 14); x.lineTo(X + 4, Y1); x.closePath(); x.fill(); x.fillStyle = gray(70); x.beginPath(); x.arc(X + 16, Y1, 3, 0, 6.28); x.fill(); }
  x.strokeStyle = col(205, WARM); x.lineWidth = 2.6; x.beginPath(); for (let X = 0; X <= S; X += 16) { const Y = 300 + (X / 16 % 2 ? 9 : -9); X ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke();
  x.strokeStyle = gray(55, 0.75); x.setLineDash([6, 4]); x.lineWidth = 1.4; for (const Y of [Y1 - 26, Y1 + 26, 282, 318, 440, 470]) { x.beginPath(); x.moveTo(0, Y); x.lineTo(S, Y); x.stroke(); }
  x.setLineDash([]); for (let i = 0; i < 2; i++) { const X = 60 + R() * 380, Y = 340 + R() * 70; x.fillStyle = col(110 + R() * 30, pick(R, [COOL, MOSS, WARM])); x.fillRect(X, Y, 44, 40); x.strokeStyle = gray(45, 0.8); x.setLineDash([4, 3]); x.strokeRect(X + 3, Y + 3, 38, 34); x.setLineDash([]); }   // заплатка
  return c;
}
// кора: вертикальные борозды, зелёные пятна лишайника
function barkTex() {
  const S = 512, [c, x] = base(S, 110, WARM), R = rng(111);
  for (let i = 0; i < 130; i++) { const X = R() * S, w = 2 + R() * 8, v = R() < 0.5 ? 40 + R() * 30 : 160 + R() * 50; x.strokeStyle = col(v, WARM, 0.6); x.lineWidth = w; x.beginPath(); let a = X; x.moveTo(a, 0); for (let Y = 0; Y <= S; Y += 16) { a = X + Math.sin(Y * 0.05 + i) * 5; x.lineTo(a, Y); } x.stroke(); }
  for (let i = 0; i < 18; i++) { const X = R() * S, Y = R() * S, r = 10 + R() * 26; wrap(S, X, Y, r, (a, b) => { x.fillStyle = col(130, MOSS, 0.4); x.beginPath(); x.ellipse(a, b, r * 0.6, r, 0, 0, 6.28); x.fill(); }); }
  return c;
}
// полукруглая черепица: столбики-«желобки» с закруглённым нижним краем, освещённая середина, тёмные стыки, мох
function tileTex() {
  const S = 512, [c, x] = base(S, 40), R = rng(121), cols = 8, tw = S / cols, rows = 8, rh = S / rows;
  for (let r = rows; r >= -1; r--) for (let k = 0; k < cols; k++) {
    const X = k * tw + (r % 2 ? tw / 2 : 0), y0 = r * rh, tone = 100 + R() * 70, tint = pick(R, [BRICK, BRICK, WARM, [1.2, 0.9, 0.78]]);
    wrap(S, X + tw / 2, y0 + rh / 2, tw, (a, b) => {
      const x0 = a - tw / 2, g = x.createLinearGradient(x0, 0, x0 + tw, 0);
      g.addColorStop(0, col(tone * 0.5, tint)); g.addColorStop(0.25, col(tone * 1.05, tint)); g.addColorStop(0.5, col(tone * 1.3, tint)); g.addColorStop(0.8, col(tone * 0.85, tint)); g.addColorStop(1, col(tone * 0.45, tint));
      x.fillStyle = g; x.beginPath(); x.moveTo(x0 + 1, b - rh * 0.5 - rh * 0.6); x.lineTo(x0 + tw - 1, b - rh * 0.5 - rh * 0.6); x.lineTo(x0 + tw - 1, b + rh * 0.1); x.arc(a, b + rh * 0.1, tw / 2 - 1, 0, Math.PI); x.closePath(); x.fill();
      x.strokeStyle = gray(18, 0.8); x.lineWidth = 2; x.stroke();
      const sg = x.createLinearGradient(0, b - rh * 0.3, 0, b + rh * 0.5); sg.addColorStop(0, gray(0, 0)); sg.addColorStop(1, gray(0, 0.35)); x.fillStyle = sg; x.fillRect(x0, b - rh * 0.3, tw, rh * 0.8);
      if (R() < 0.12) { x.fillStyle = col(100, MOSS, 0.55); for (let q = 0; q < 4; q++) { x.beginPath(); x.ellipse(a + (R() - 0.5) * 20, b + rh * 0.3 + R() * 8, 5 + R() * 6, 3 + R() * 3, 0, 0, 6.28); x.fill(); } }
    });
  }
  return c;
}
// солома: плотные штрихи по направлению ската, полосы пучков, верёвочные обвязки
function thatchTex() {
  const S = 512, [c, x] = base(S, 130, SAND), R = rng(131);
  for (let i = 0; i < 2600; i++) { const X = R() * S, Y = R() * S, L = 14 + R() * 26, a = Math.PI / 2 + (R() - 0.5) * 0.28, v = 70 + R() * 150; wrap(S, X, Y, L, (p, q) => { x.strokeStyle = col(v, pick(R, [SAND, WARM, [1.1, 1.04, 0.7]]), 0.65); x.lineWidth = 1 + R() * 1.5; x.beginPath(); x.moveTo(p, q); x.lineTo(p + Math.cos(a) * L, q + Math.sin(a) * L); x.stroke(); }); }
  for (let r = 0; r < 4; r++) { const Y = r * 128 + 100, g = x.createLinearGradient(0, Y - 18, 0, Y + 14); g.addColorStop(0, gray(20, 0)); g.addColorStop(0.5, gray(20, 0.5)); g.addColorStop(1, gray(20, 0)); x.fillStyle = g; x.fillRect(0, Y - 18, S, 32); }   // тень под пучком
  x.strokeStyle = col(70, WARM, 0.8); x.lineWidth = 3; for (let r = 0; r < 4; r++) { const Y = r * 128 + 40; x.beginPath(); for (let X = 0; X <= S; X += 16) { const q = Y + Math.sin(X * 0.2) * 1.6; X ? x.lineTo(X, q) : x.moveTo(X, q); } x.stroke(); }
  for (let i = 0; i < 24; i++) { const X = R() * S, Y = R() * S, r = 14 + R() * 24; wrap(S, X, Y, r, (a, b) => { x.fillStyle = col(115, MOSS, 0.28); x.beginPath(); x.ellipse(a, b, r, r * 0.7, 0, 0, 6.28); x.fill(); }); }
  return c;
}
// брусчатка: округлые камни разного тона, тёмные щели, трава и мох в щелях
function cobbleTex() {
  const S = 512, [c, x] = base(S, 60, MOSS), R = rng(141), N = 8, cs = S / N;
  for (let i = 0; i < 800; i++) { const X = R() * S, Y = R() * S; wrap(S, X, Y, 6, (a, b) => { x.strokeStyle = col(70 + R() * 70, MOSS, 0.8); x.lineWidth = 1.2; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (R() - 0.5) * 8, b - 6 - R() * 8); x.stroke(); }); }   // трава в щелях
  for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) {
    const cx = (k + 0.5 + (r % 2 ? 0.5 : 0) + (R() - 0.5) * 0.18) * cs, cy = (r + 0.5 + (R() - 0.5) * 0.18) * cs, w = cs * (0.4 + R() * 0.06), h = cs * (0.36 + R() * 0.07), tone = 105 + R() * 60, tint = pick(R, [WARM, COOL, [1, 1, 1], SAND]);
    wrap(S, cx, cy, w + 4, (a, b) => {
      x.fillStyle = gray(20, 0.7); x.beginPath(); x.ellipse(a + 1.5, b + 2.5, w, h, 0, 0, 6.28); x.fill();
      const g = x.createRadialGradient(a - w * 0.25, b - h * 0.35, 2, a, b, w); g.addColorStop(0, col(tone * 1.25, tint)); g.addColorStop(0.7, col(tone, tint)); g.addColorStop(1, col(tone * 0.6, tint));
      x.fillStyle = g; x.beginPath(); x.ellipse(a, b, w, h, (R() - 0.5) * 0.3, 0, 6.28); x.fill();
      for (let q = 0; q < 5; q++) { x.fillStyle = col(tone + (R() - 0.5) * 60, tint, 0.3); x.beginPath(); x.ellipse(a + (R() - 0.5) * w, b + (R() - 0.5) * h, 3 + R() * 8, 2 + R() * 5, 0, 0, 6.28); x.fill(); }
      if (R() < 0.25) { x.fillStyle = col(110, MOSS, 0.5); x.beginPath(); x.ellipse(a + (R() - 0.5) * w * 0.6, b + h * 0.6, 8 + R() * 8, 4, 0, 0, 6.28); x.fill(); }
    });
  }
  return c;
}
// кованое железо: тёмное, следы молота, цвета побежалости, клёпки, окалина
function ironTex() {
  const S = 512, [c, x] = base(S, 100), R = rng(151);
  for (let i = 0; i < 70; i++) { const X = R() * S, Y = R() * S, r = 20 + R() * 50, t = pick(R, [[0.92, 0.95, 1.12], [1.1, 0.98, 0.85], [0.85, 0.9, 1.15], [1, 1, 1]]); wrap(S, X, Y, r, (a, b) => { x.fillStyle = col(100 + R() * 40, t, 0.25); x.beginPath(); x.ellipse(a, b, r, r * 0.75, R() * 3, 0, 6.28); x.fill(); }); }
  for (let i = 0; i < 260; i++) { const X = R() * S, Y = R() * S, r = 3 + R() * 6; wrap(S, X, Y, r, (a, b) => { const g = x.createRadialGradient(a - r * 0.3, b - r * 0.3, 0, a, b, r); g.addColorStop(0, gray(70, 0.55)); g.addColorStop(0.7, gray(160, 0.25)); g.addColorStop(1, gray(200, 0.4)); x.fillStyle = g; x.beginPath(); x.arc(a, b, r, 0, 6.28); x.fill(); }); }   // вмятины от молота
  for (let i = 0; i < 90; i++) { const X = R() * S, Y = R() * S, L = 8 + R() * 28, a = R() * 3.14; wrap(S, X, Y, L, (p, q) => { x.strokeStyle = gray(R() < 0.5 ? 210 : 30, 0.4); x.lineWidth = 0.8; x.beginPath(); x.moveTo(p, q); x.lineTo(p + Math.cos(a) * L, q + Math.sin(a) * L); x.stroke(); }); }
  for (let i = 0; i < 8; i++) { const X = 32 + i * 64; for (const Y of [24, 488]) { const g = x.createRadialGradient(X - 2, Y - 2, 0, X, Y, 8); g.addColorStop(0, gray(220)); g.addColorStop(0.5, gray(120)); g.addColorStop(1, gray(25)); x.fillStyle = g; x.beginPath(); x.arc(X, Y, 8, 0, 6.28); x.fill(); } }   // клёпки
  for (let i = 0; i < 10; i++) { const X = R() * S, Y = R() * S, r = 8 + R() * 18; wrap(S, X, Y, r, (a, b) => { x.fillStyle = col(90, RUST, 0.45); x.beginPath(); x.ellipse(a, b, r, r * 0.6, 0, 0, 6.28); x.fill(); }); }
  return c;
}
// кожа: зернистая шагрень, складки-морщины, строчка швом, потёртые светлые края и царапины
function leatherTex() {
  const S = 512, [c, x] = base(S, 118, WARM), R = rng(161);
  for (let i = 0; i < 4200; i++) { const X = R() * S, Y = R() * S, r = 1 + R() * 2; wrap(S, X, Y, r, (a, b) => { x.fillStyle = gray(R() < 0.5 ? 70 : 180, 0.28); x.beginPath(); x.ellipse(a, b, r, r * 0.7, R() * 3, 0, 6.28); x.fill(); }); }
  for (let i = 0; i < 16; i++) { let X = R() * S, Y = R() * S, a = R() * 6.28; x.strokeStyle = gray(45, 0.4); x.lineWidth = 1.6; x.beginPath(); x.moveTo(X, Y); for (let k = 0; k < 7; k++) { X += Math.cos(a) * 14; Y += Math.sin(a) * 14; a += (R() - 0.5) * 0.9; x.lineTo(X, Y); } x.stroke(); }
  for (let i = 0; i < 40; i++) { const X = R() * S, Y = R() * S, r = 14 + R() * 30; wrap(S, X, Y, r, (a, b) => { x.fillStyle = col(175, SAND, 0.18); x.beginPath(); x.ellipse(a, b, r, r * 0.7, R() * 3, 0, 6.28); x.fill(); }); }
  x.strokeStyle = col(200, SAND, 0.85); x.lineWidth = 2.6; x.setLineDash([9, 6]); for (const Y of [40, 472]) { x.beginPath(); x.moveTo(0, Y); x.lineTo(S, Y); x.stroke(); }
  x.setLineDash([]); x.fillStyle = gray(22, 0.55); for (const Y of [34, 466]) x.fillRect(0, Y, S, 3);
  return c;
}
// золото и латунь: широкие диагональные блики (ярче 1.0 → пересвет), тёмная гравировка, мелкие царапины
function goldTex() {
  const S = 512, [c, x] = base(S, 130, [1.1, 1, 0.8]), R = rng(171);
  for (let i = 0; i < 7; i++) { const X = R() * S, w = 20 + R() * 60, v = R() < 0.6 ? 235 : 55; const g = x.createLinearGradient(X - w, 0, X + w, 0); g.addColorStop(0, gray(v, 0)); g.addColorStop(0.5, col(v, [1.05, 1, 0.9], 0.75)); g.addColorStop(1, gray(v, 0)); x.save(); x.translate(S / 2, S / 2); x.rotate(0.6); x.translate(-S / 2, -S / 2); x.fillStyle = g; for (const o of [-S, 0, S]) x.fillRect(X - w + o, -S, w * 2, S * 3); x.restore(); }
  for (let i = 0; i < 140; i++) { const X = R() * S, Y = R() * S, L = 6 + R() * 22, a = R() * 6.28; wrap(S, X, Y, L, (p, q) => { x.strokeStyle = gray(R() < 0.5 ? 245 : 40, 0.45); x.lineWidth = 0.8; x.beginPath(); x.moveTo(p, q); x.lineTo(p + Math.cos(a) * L, q + Math.sin(a) * L); x.stroke(); }); }
  x.strokeStyle = gray(40, 0.7); x.lineWidth = 2; for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) { const X = k * 128 + 64, Y = j * 128 + 64; x.beginPath(); x.arc(X, Y, 26, 0, 6.28); x.moveTo(X - 14, Y); x.lineTo(X + 14, Y); x.moveTo(X, Y - 14); x.lineTo(X, Y + 14); x.stroke(); }   // гравировка
  return c;
}
// кость: слоновая, пятна старости, трещины, поры, волокна вдоль
function boneTex() {
  const S = 512, [c, x] = base(S, 150, [1.06, 1.02, 0.86]), R = rng(181);
  for (let i = 0; i < 90; i++) { const X = R() * S, Y = R() * S, r = 14 + R() * 40, t = R() < 0.5 ? [1, 0.88, 0.62] : [0.92, 0.95, 0.98]; wrap(S, X, Y, r, (a, b) => { x.fillStyle = col(120 + R() * 70, t, 0.22); x.beginPath(); x.ellipse(a, b, r, r * 0.55, R() * 0.4, 0, 6.28); x.fill(); }); }
  for (let i = 0; i < 90; i++) { const X = R() * S, Y = R() * S, L = 20 + R() * 50; wrap(S, X, Y, L, (a, b) => { x.strokeStyle = gray(100 + R() * 90, 0.35); x.lineWidth = 1; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (R() - 0.5) * 10, b + L); x.stroke(); }); }
  for (let i = 0; i < 160; i++) { const X = R() * S, Y = R() * S, r = 1 + R() * 3; wrap(S, X, Y, r, (a, b) => { x.fillStyle = col(70, WARM, 0.55); x.beginPath(); x.arc(a, b, r, 0, 6.28); x.fill(); }); }
  for (let i = 0; i < 16; i++) { let X = R() * S, Y = R() * S, a = R() * 6.28; x.strokeStyle = col(35, SOOT, 0.85); x.lineWidth = 1.2 + R(); x.beginPath(); x.moveTo(X, Y); for (let k = 0; k < 8; k++) { X += Math.cos(a) * 11; Y += Math.sin(a) * 11; a += (R() - 0.5) * 1.1; x.lineTo(X, Y); } x.stroke(); }
  return c;
}
// кристалл/руны: грани разной яркости, светлые рёбра, внутренние искры, по тайлу — светящиеся руны (пересвет)
function crystalTex() {
  const S = 512, [c, x] = base(S, 110, [0.9, 1, 1.1]), R = rng(191), n = 5, cs = S / n;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
    const cx = (k + 0.5 + (R() - 0.5) * 0.4) * cs, cy = (r + 0.5 + (R() - 0.5) * 0.4) * cs, pts = Array.from({ length: 6 }, (_, q) => { const an = q / 6 * 6.283 + R() * 0.4, rr = cs * (0.5 + R() * 0.25); return [Math.cos(an) * rr, Math.sin(an) * rr]; });
    wrap(S, cx, cy, cs, (a, b) => pts.forEach((p, i) => { const q = pts[(i + 1) % 6], v = 70 + R() * 150; x.fillStyle = col(v, COOL); x.beginPath(); x.moveTo(a, b); x.lineTo(a + p[0], b + p[1]); x.lineTo(a + q[0], b + q[1]); x.closePath(); x.fill(); x.strokeStyle = gray(240, 0.4); x.lineWidth = 1.2; x.stroke(); }));
  }
  for (let i = 0; i < 50; i++) { const X = R() * S, Y = R() * S, r = 2 + R() * 4; wrap(S, X, Y, r * 3, (a, b) => { const g = x.createRadialGradient(a, b, 0, a, b, r * 3); g.addColorStop(0, gray(255, 0.9)); g.addColorStop(1, gray(255, 0)); x.fillStyle = g; x.fillRect(a - r * 3, b - r * 3, r * 6, r * 6); }); }
  x.strokeStyle = gray(255, 0.95); x.lineWidth = 3; x.lineCap = 'round';   // руны
  for (let i = 0; i < 6; i++) { const X = (i % 3 + 0.5) * (S / 3), Y = (i < 3 ? 0.27 : 0.77) * S; x.beginPath(); x.moveTo(X - 22, Y + 28); x.lineTo(X, Y - 28); x.lineTo(X + 22, Y + 28); x.moveTo(X - 14, Y + 4 * (i % 3)); x.lineTo(X + 14, Y + 4 * (i % 3) - 6); x.stroke(); }
  return c;
}
// id → слой массива; масштаб (повторов на метр) и «сила» фактуры — в шейдере (toon.js, MAT_SCALE / MAT_AMP)
export const MAT_LAYERS = [woodTex, stoneTex, roofTex, plasterTex, metalTex, clothTex, barkTex, tileTex, thatchTex, cobbleTex, ironTex, leatherTex, goldTex, boneTex, crystalTex];
export const MAT_SCALE = [1.1, 0.7, 0.9, 0.8, 1.4, 1.8, 1.3, 0.75, 0.8, 0.9, 1.5, 1.8, 1.8, 1.6, 1.0];
export const MAT_AMP = [3.2, 3.2, 3.2, 2.6, 1.5, 2.2, 3.2, 3.2, 2.6, 3.0, 1.8, 2.4, 2.0, 2.4, 2.0];
// все слои в одном DataArrayTexture (sampler2DArray): N = 384 на ПК, 256 на телефоне (вдвое меньше памяти и времени)
let matArr = null;
export function matArray() {
  if (matArr) return matArr;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches, N = coarse ? 256 : 384, L = MAT_LAYERS.length;
  const d = new Uint8Array(N * N * 4 * L), small = canvas(N), sx = small.getContext('2d', { willReadFrequently: true });
  sx.imageSmoothingQuality = 'high';
  MAT_LAYERS.forEach((fn, i) => { const src = fn(); sx.clearRect(0, 0, N, N); sx.drawImage(src, 0, 0, N, N); d.set(sx.getImageData(0, 0, N, N).data, i * N * N * 4); });
  const t = new THREE.DataArrayTexture(d, N, N, L);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  matArr = t; return t;
}

// ---------------------------------------------------------------- листва (альфа-вырез): кроны и ёлки — «карточки» с этой текстурой
// Рисуется светло-серо-зелёным: оттенок даёт цвет вершины (низ кроны темнее, верх и сторона к солнцу — тёплый жёлто-зелёный).
// в правом верхнем углу — сплошной квадрат 40 px: туда смотрят UV ствола и веток (та же текстура, один материал на всё дерево)
// рисунок кисти занимает левый нижний квадрат 212 px (UV карточек 0…0.828), сплошной квадрат — правый верхний угол
export const LEAF_UV = 212 / 256;
function leafCanvas(S, seed, draw) {
  const c = canvas(S), x = c.getContext('2d'), sub = canvas(212); draw(sub.getContext('2d'), rng(seed), 212);
  x.clearRect(0, 0, S, S); x.drawImage(sub, 0, S - 212); x.fillStyle = 'hsl(90,10%,72%)'; x.fillRect(S - 40, 0, 40, 40); return c;
}
function leafAlpha(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; return t; }
// кисть листвы: ~90 заострённых листиков веером из центра, кромка неровная, к низу темнее
export function leafTex() {
  if (cache.has('leaf')) return cache.get('leaf');
  const c = leafCanvas(256, 131, (x, R, S) => {
    const C = S / 2;
    const leaf = (X, Y, len, w, ang, l) => {
      x.save(); x.translate(X, Y); x.rotate(ang);
      x.beginPath(); x.moveTo(-len * 0.5, 0); x.quadraticCurveTo(0, -w, len * 0.5, 0); x.quadraticCurveTo(0, w, -len * 0.5, 0); x.closePath();
      const g = x.createLinearGradient(0, -w, 0, w); g.addColorStop(0, `hsl(85,35%,${Math.min(96, l + 14)}%)`); g.addColorStop(1, `hsl(95,35%,${l - 10}%)`);
      x.fillStyle = g; x.fill(); x.strokeStyle = `hsla(110,40%,${l - 30}%,0.55)`; x.lineWidth = 1.2; x.stroke();
      x.strokeStyle = `hsla(100,30%,${l - 22}%,0.5)`; x.lineWidth = 0.8; x.beginPath(); x.moveTo(-len * 0.45, 0); x.lineTo(len * 0.4, 0); x.stroke();
      x.restore();
    };
    // слои от тёмных (внутри) к светлым (снаружи сверху)
    for (let pass = 0; pass < 3; pass++) {
      const n = [34, 40, 28][pass];
      for (let i = 0; i < n; i++) {
        const a = R() * 6.283, rr = Math.sqrt(R()) * C * [0.55, 0.72, 0.78][pass], X = C + Math.cos(a) * rr, Y = C + Math.sin(a) * rr * 0.9;
        const shade = 1 - (Y / S) * 0.45;   // низ кисти темнее
        const l = ([46, 62, 78][pass] + R() * 12) * shade;
        leaf(X, Y, 26 + R() * 18, 8 + R() * 5, a + (R() - 0.5) * 0.9, l);
      }
    }
  });
  const t = leafAlpha(c); cache.set('leaf', t); return t;
}
// лапа ели: центральная ветка и хвоинки-штрихи, свисающие вниз-наружу; треугольный силуэт
export function pineTex() {
  if (cache.has('pine')) return cache.get('pine');
  const c = leafCanvas(256, 137, (x, R, S) => {
    x.lineCap = 'round';
    // силуэт лапы: треугольник, расширяющийся книзу, с рваным краем из хвоинок
    for (let b = 0; b < 5; b++) {
      const bx = S * (0.2 + b * 0.15), top = S * 0.06, len = S * (0.86 - Math.abs(b - 2) * 0.08);
      for (let i = 0; i < 120; i++) {
        const t = Math.sqrt(R()), px = S / 2 + (bx - S / 2) * t, py = top + len * t, side = R() < 0.5 ? -1 : 1, nl = (8 + 20 * t) * (0.6 + R() * 0.5);
        const l = 34 + R() * 26 + (1 - t) * 22 - (b === 2 ? 0 : 6);
        x.strokeStyle = `hsl(${95 + R() * 25},32%,${l}%)`; x.lineWidth = 2.5 + R() * 2;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + side * nl, py + nl * 0.55); x.stroke();
      }
    }
  });
  const t = leafAlpha(c); cache.set('pine', t); return t;
}

// плиты пола подземелья: ряды каменных плит разной длины, швы, стёртые края, трещины, сколы (серый множитель; цвет — в шейдере)
export function flagTex() {
  if (cache.has('flag')) return cache.get('flag');
  const S = 512, c = canvas(S), x = c.getContext('2d'), R = rng(151), rows = 5, rh = S / rows;
  x.fillStyle = gray(38); x.fillRect(0, 0, S, S);
  for (let r = 0; r < rows; r++) {
    let X = -R() * 80;
    while (X < S) {
      const w = 70 + R() * 90, y0 = r * rh, tone = 110 + R() * 60, j = () => (R() - 0.5) * 5;
      const poly = [[X + 3 + j(), y0 + 3 + j()], [X + w - 3 + j(), y0 + 3 + j()], [X + w - 3 + j(), y0 + rh - 3 + j()], [X + 3 + j(), y0 + rh - 3 + j()]];
      const blobs = Array.from({ length: 10 }, () => [R(), R(), 8 + R() * 22, tone + (R() - 0.5) * 40]);
      const crack = R() < 0.3 ? Array.from({ length: 5 }, () => [(R() - 0.5) * 24, rh / 5]) : null, cx0 = R();
      for (const ox of [0, -S]) {
        if (ox && X + w <= S) continue;
        x.save(); x.translate(ox, 0);
        x.fillStyle = gray(tone); x.beginPath(); poly.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); x.clip();
        for (const [u, v, rr, t] of blobs) { x.fillStyle = gray(t, 0.25); x.beginPath(); x.ellipse(X + u * w, y0 + v * rh, rr, rr * 0.7, 0, 0, 6.28); x.fill(); }
        // стёртые края: светлая верхняя кромка, тёмная нижняя
        const g = x.createLinearGradient(0, y0, 0, y0 + rh); g.addColorStop(0, gray(215, 0.35)); g.addColorStop(0.15, gray(128, 0)); g.addColorStop(0.85, gray(128, 0)); g.addColorStop(1, gray(20, 0.4));
        x.fillStyle = g; x.fillRect(X, y0, w, rh);
        if (crack) { x.strokeStyle = gray(28, 0.85); x.lineWidth = 1.3; x.beginPath(); let a = X + cx0 * w, b = y0 + 4; x.moveTo(a, b); for (const [dx, dy] of crack) { a += dx; b += dy; x.lineTo(a, b); } x.stroke(); }
        x.restore();
      }
      X += w;
    }
  }
  const t = tex(c, false); cache.set('flag', t); return t;
}
