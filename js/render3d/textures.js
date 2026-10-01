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

// ---------------------------------------------------------------- фактуры материалов (серые «множители» вокруг 0,5: цвет даёт вершина)
// накладываются triplanar в пространстве модели (js/render3d/toon.js), id материала — атрибут вершины aTex (geo.js, TEX_ID)
const gray = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;
function base(S, v) { const c = canvas(S), x = c.getContext('2d'); x.fillStyle = gray(v); x.fillRect(0, 0, S, S); return [c, x]; }

// доски: волокна вдоль U, тёмные щели между досками (4 доски на тайл), сучки, потёртые светлые края
function woodTex() {
  const S = 512, [c, x] = base(S, 128), R = rng(51), PL = 4, ph = S / PL;
  for (let p = 0; p < PL; p++) {
    const y0 = p * ph, tone = 108 + R() * 40;
    x.fillStyle = gray(tone); x.fillRect(0, y0, S, ph);
    for (let i = 0; i < 46; i++) {   // волокна: длинные волнистые линии
      const yy = y0 + R() * ph, amp = 1 + R() * 3, fr = 0.01 + R() * 0.02, ph0 = R() * 6, v = tone + (R() - 0.55) * 60;
      x.strokeStyle = gray(Math.max(30, v), 0.5); x.lineWidth = 0.8 + R() * 1.8; x.beginPath();
      for (let X = 0; X <= S; X += 8) { const Y = yy + Math.sin(X * fr + ph0) * amp; X ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke();
    }
    for (let k = 0; k < 2; k++) if (R() < 0.7) {   // сучок
      const X = R() * S, Y = y0 + ph * (0.3 + R() * 0.4), r = 5 + R() * 7;
      for (let j = 4; j > 0; j--) { x.strokeStyle = gray(60 + j * 10, 0.6); x.lineWidth = 1.4; x.beginPath(); x.ellipse(X, Y, r * j * 0.6 + 4, r * j * 0.3 + 2, 0, 0, 6.28); x.stroke(); }
      x.fillStyle = gray(45); x.beginPath(); x.ellipse(X, Y, r * 0.5, r * 0.35, 0, 0, 6.28); x.fill();
    }
    const g = x.createLinearGradient(0, y0, 0, y0 + ph); g.addColorStop(0, gray(200, 0.35)); g.addColorStop(0.12, gray(128, 0)); g.addColorStop(0.85, gray(128, 0)); g.addColorStop(1, gray(20, 0.5));
    x.fillStyle = g; x.fillRect(0, y0, S, ph);
    x.fillStyle = gray(18); x.fillRect(0, y0 + ph - 3, S, 3);
    for (let i = 0; i < 3; i++) { const X = R() * S; x.fillStyle = gray(25); x.fillRect(X, y0, 3, ph); }   // торцы досок
  }
  return c;
}
// кладка: неровные блоки, тёмные швы, светлый верхний край блока, трещины и сколы
function stoneTex() {
  const S = 512, [c, x] = base(S, 50), R = rng(61), rows = 6, rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let X = -R() * 60;
    while (X < S) {
      const w = 60 + R() * 70, y0 = r * rh, tone = 105 + R() * 55, j = () => (R() - 0.5) * 6;
      const poly = [[X + 4 + j(), y0 + 4 + j()], [X + w - 4 + j(), y0 + 4 + j()], [X + w - 3 + j(), y0 + rh - 4 + j()], [X + 3 + j(), y0 + rh - 4 + j()]];
      for (const ox of [0, S]) {
        x.save(); x.translate(ox ? (X + w > S ? -S : 0) : 0, 0);
        x.fillStyle = gray(tone); x.beginPath(); poly.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill();
        x.clip();
        for (let k = 0; k < 14; k++) { x.fillStyle = gray(tone + (R() - 0.5) * 50, 0.25); x.beginPath(); x.ellipse(X + R() * w, y0 + R() * rh, 6 + R() * 16, 4 + R() * 10, R() * 3, 0, 6.28); x.fill(); }
        const g = x.createLinearGradient(0, y0, 0, y0 + rh); g.addColorStop(0, gray(230, 0.45)); g.addColorStop(0.25, gray(128, 0)); g.addColorStop(0.75, gray(128, 0)); g.addColorStop(1, gray(10, 0.45));
        x.fillStyle = g; x.fillRect(X, y0, w, rh);
        if (R() < 0.35) { x.strokeStyle = gray(30, 0.8); x.lineWidth = 1.2; x.beginPath(); let a = X + R() * w, b = y0 + 5; x.moveTo(a, b); for (let k = 0; k < 4; k++) { a += (R() - 0.5) * 18; b += rh / 5; x.lineTo(a, b); } x.stroke(); }
        x.restore();
      }
      X += w;
    }
  }
  return c;
}
// черепица/дранка: ряды с тёмной нижней кромкой, у каждой дощечки свой тон
function roofTex() {
  const S = 512, [c, x] = base(S, 40), R = rng(71), rows = 8, rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let X = (r % 2) * 30 - 30;
    while (X < S) {
      const w = 40 + R() * 26, y0 = r * rh, tone = 100 + R() * 70;
      const g = x.createLinearGradient(0, y0, 0, y0 + rh); g.addColorStop(0, gray(tone * 0.7)); g.addColorStop(0.75, gray(tone)); g.addColorStop(0.92, gray(tone * 1.15)); g.addColorStop(1, gray(25));
      x.fillStyle = g; x.beginPath(); x.moveTo(X + 2, y0); x.lineTo(X + w - 2, y0); x.lineTo(X + w - 3, y0 + rh - 2); x.quadraticCurveTo(X + w / 2, y0 + rh + 3, X + 3, y0 + rh - 2); x.closePath(); x.fill();
      for (let k = 0; k < 6; k++) { x.strokeStyle = gray(tone * 0.6, 0.4); x.lineWidth = 1; const a = X + 5 + R() * (w - 10); x.beginPath(); x.moveTo(a, y0 + 3); x.lineTo(a + (R() - 0.5) * 4, y0 + rh - 6); x.stroke(); }
      X += w;
    }
  }
  return c;
}
// штукатурка: мягкие пятна, подтёки снизу, сетка мелких трещин
function plasterTex() {
  const S = 256, [c, x] = base(S, 140), R = rng(81);
  for (let i = 0; i < 160; i++) { const X = R() * S, Y = R() * S, r = 6 + R() * 26, v = 140 + (R() - 0.5) * 70; wrap(S, X, Y, r, (a, b) => { x.fillStyle = gray(v, 0.18); x.beginPath(); x.ellipse(a, b, r, r * 0.7, 0, 0, 6.28); x.fill(); }); }
  for (let i = 0; i < 10; i++) { let a = R() * S, b = R() * S; x.strokeStyle = gray(70, 0.55); x.lineWidth = 0.8; x.beginPath(); x.moveTo(a, b); for (let k = 0; k < 5; k++) { a += (R() - 0.5) * 22; b += (R() - 0.5) * 22; x.lineTo(a, b); } x.stroke(); }
  return c;
}
// металл: продольная шлифовка, царапины, вмятины
function metalTex() {
  const S = 256, [c, x] = base(S, 132), R = rng(91);
  for (let i = 0; i < 400; i++) { const Y = R() * S; x.fillStyle = gray(132 + (R() - 0.5) * 60, 0.25); x.fillRect(0, Y, S, 1); }
  for (let i = 0; i < 70; i++) { const X = R() * S, Y = R() * S, L = 6 + R() * 26, a = R() * 6.28, v = R() < 0.5 ? 220 : 50; wrap(S, X, Y, L, (p, q) => { x.strokeStyle = gray(v, 0.5); x.lineWidth = 0.7; x.beginPath(); x.moveTo(p, q); x.lineTo(p + Math.cos(a) * L, q + Math.sin(a) * L); x.stroke(); }); }
  for (let i = 0; i < 14; i++) { const X = R() * S, Y = R() * S, r = 4 + R() * 10; wrap(S, X, Y, r, (a, b) => { const g = x.createRadialGradient(a - r * 0.3, b - r * 0.3, 0, a, b, r); g.addColorStop(0, gray(200, 0.35)); g.addColorStop(1, gray(60, 0)); x.fillStyle = g; x.fillRect(a - r, b - r, r * 2, r * 2); }); }
  return c;
}
// ткань: плетение, складки, стёжка по краю
function clothTex() {
  const S = 256, [c, x] = base(S, 128), R = rng(101);
  for (let y = 0; y < S; y += 3) { x.fillStyle = gray(118 + (y % 6 ? 10 : -10), 0.6); x.fillRect(0, y, S, 1.5); }
  for (let X = 0; X < S; X += 3) { x.fillStyle = gray(128 + (X % 6 ? 8 : -12), 0.4); x.fillRect(X, 0, 1.5, S); }
  for (let i = 0; i < 9; i++) { const X = R() * S, w = 10 + R() * 26; const g = x.createLinearGradient(X - w, 0, X + w, 0); g.addColorStop(0, gray(128, 0)); g.addColorStop(0.5, gray(R() < 0.5 ? 60 : 200, 0.35)); g.addColorStop(1, gray(128, 0)); x.fillStyle = g; for (const o of [-S, 0, S]) x.fillRect(X - w + o, 0, w * 2, S); }
  x.strokeStyle = gray(60, 0.7); x.setLineDash([5, 4]); x.lineWidth = 1.2; for (const Y of [20, S - 20]) { x.beginPath(); x.moveTo(0, Y); x.lineTo(S, Y); x.stroke(); }
  return c;
}
// кора: вертикальные борозды
function barkTex() {
  const S = 256, [c, x] = base(S, 110), R = rng(111);
  for (let i = 0; i < 70; i++) { const X = R() * S, w = 2 + R() * 6, v = R() < 0.5 ? 40 + R() * 30 : 160 + R() * 50; x.strokeStyle = gray(v, 0.6); x.lineWidth = w; x.beginPath(); let a = X; x.moveTo(a, 0); for (let Y = 0; Y <= S; Y += 16) { a = X + Math.sin(Y * 0.05 + i) * 4; x.lineTo(a, Y); } x.stroke(); }
  return c;
}
// id → [функция, масштаб (повторов на метр), поворот волокон: 1 — вдоль Y]
export const MATS = { wood: [woodTex, 1.1, 1], woodH: [woodTex, 1.1, 0], stone: [stoneTex, 0.7, 0], roof: [roofTex, 0.9, 0], plaster: [plasterTex, 0.8, 0], metal: [metalTex, 1.6, 0], cloth: [clothTex, 1.8, 0], bark: [barkTex, 1.3, 1] };
export function matTex(name) {
  const k = 'm:' + (name === 'woodH' ? 'wood' : name);
  if (!cache.has(k)) cache.set(k, tex(MATS[name][0](), false));
  return cache.get(k);
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
