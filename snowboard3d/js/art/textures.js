// Текстуры экипировки на canvas: швы, молнии, карманы, рисунок доски, деления диска.
// Кэшируются по цветам: студия часто пересоздаёт райдеров.
import { canvasTex, grain, shade, curve, rng } from './kit.js';

const cache = new Map();
const memo = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

function line(x, pts, color, w, dash) {
  x.strokeStyle = color; x.lineWidth = w; x.setLineDash(dash || []);
  x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); x.setLineDash([]);
}
function rrect(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
// Надпись на развёртке тела: u растёт справа налево, если смотреть снаружи, поэтому пишем зеркально
function label(x, text, a, b) { x.save(); x.translate(a, b); x.scale(-1, 1); x.fillText(text, 0, 0); x.restore(); }

// Куртка: развёртка торса. u — по кругу (0 — спина, 0.25 — сторона носа доски, 0.5 — грудь),
// y — высота от таза (−0.25…0.65); полоса y < −0.21 — подкладка. Цвета как у референса:
// c — яркий низ и рукава, c2 — тёмная кокетка, плечи, воротник и капюшон.
export const JACKET_V = (y) => (y + 0.25) / 0.9;
// Низ подола: сзади длиннее, чем спереди
export const jacketHem = (u) => -0.142 - 0.034 * ((1 + Math.cos(u * Math.PI * 2)) / 2) ** 2;
// Граница цветов: по груди наискось (выше со стороны носа), по спине — дугой
const YOKE = curve([[-0.25, 0.17], [0, 0.29], [0.25, 0.335], [0.5, 0.255], [0.75, 0.17], [1, 0.29], [1.25, 0.335]]);
export const jacketTex = (c, c2) => memo(`j${c}${c2}`, () => canvasTex(512, 512, (x, W, H) => {
  const Y = (y) => (1 - JACKET_V(y)) * H, U = (u) => u * W;
  const yoke = (u) => YOKE(u)[0], N = 96, us = Array.from({ length: N + 1 }, (_, i) => i / N);
  x.fillStyle = c; x.fillRect(0, 0, W, H);
  // резинка подола — темнее, вдоль косого низа
  x.fillStyle = shade(c, -0.2); x.beginPath(); x.moveTo(0, H);
  us.forEach((u) => x.lineTo(U(u), Y(jacketHem(u) + 0.03))); x.lineTo(W, H); x.fill();
  line(x, us.map((u) => [U(u), Y(jacketHem(u) + 0.03)]), shade(c, -0.32), 1.5);
  // тёмная кокетка с кантом
  x.fillStyle = c2; x.beginPath(); x.moveTo(0, 0);
  us.forEach((u) => x.lineTo(U(u), Y(yoke(u)))); x.lineTo(W, 0); x.fill();
  line(x, us.map((u) => [U(u), Y(yoke(u)) + 1.5]), shade(c, 0.35), 2.5);
  // воротник-стойка: верхний кант и внутренняя сторона
  x.fillStyle = shade(c2, -0.18); x.fillRect(0, 0, W, Y(0.6));
  line(x, [[0, Y(0.6)], [W, Y(0.6)]], shade(c, 0.1), 2);
  // боковые швы
  for (const u of [0.25, 0.75]) line(x, [[U(u), Y(0.42)], [U(u), Y(-0.12)]], 'rgba(0,0,0,0.18)', 1.5);
  // ветрозащитная планка (строчка по краям) и молния
  for (const s of [-1, 1]) line(x, [[U(0.5) + s * 9, Y(0.6)], [U(0.5) + s * 9, Y(-0.2)]], 'rgba(0,0,0,0.2)', 1.2);
  line(x, [[U(0.5), 0], [U(0.5), H]], '#15181f', 3);
  for (let y = 4; y < Y(-0.22); y += 5) line(x, [[U(0.5) - 2.5, y], [U(0.5) + 2.5, y]], '#4d535c', 1);
  x.fillStyle = '#d5dae1'; rrect(x, U(0.5) - 3, Y(0.6) + 2, 6, 14, 2); x.fill();
  // нагрудный карман на молнии и логотип на тёмной кокетке (грудь со стороны носа)
  line(x, [[U(0.585), Y(0.43)], [U(0.6), Y(0.34)]], '#15181f', 3);
  x.fillStyle = c; rrect(x, U(0.585) - 2, Y(0.43) - 2, 4, 10, 2); x.fill();
  x.fillStyle = c; x.font = 'bold 12px sans-serif'; x.textAlign = 'center';
  label(x, 'SNOW', U(0.415), Y(0.41)); x.font = '9px sans-serif'; label(x, 'SCHOOL', U(0.415), Y(0.41) + 11);
  // боковые карманы: косые молнии
  for (const s of [-1, 1]) {
    line(x, [[U(0.5 + s * 0.07), Y(0.15)], [U(0.5 + s * 0.105), Y(0.02)]], shade(c, -0.42), 3);
    x.fillStyle = shade(c, -0.55); rrect(x, U(0.5 + s * 0.07) - 2, Y(0.15) - 2, 4, 9, 2); x.fill();
  }
  // логотип на спине
  x.fillStyle = shade(c, 0.6); x.font = 'bold 13px sans-serif'; label(x, 'SNOW SCHOOL', U(0), Y(0.36)); label(x, 'SNOW SCHOOL', U(1), Y(0.36));
  // подкладка
  x.fillStyle = shade(c2, -0.45); x.fillRect(0, Y(-0.21), W, H - Y(-0.21));
  grain(x, W, H, 8, 3);
}, { aniso: 8 }));

// Рукав: u — по кругу (0.25 — наружная сторона), y от плеча (−0.075) до манжеты (0.55).
// Плечо тёмное (продолжает кокетку), остальное — яркое; манжета с липучкой накрывает перчатку.
export const sleeveTex = (c, c2) => memo(`s${c}${c2}`, () => canvasTex(256, 512, (x, W, H) => {
  const Y = (y) => (1 - (y + 0.075) / 0.64) * H, U = (u) => u * W;
  const cap = (u) => 0.075 + 0.055 * Math.cos((u - 0.25) * Math.PI * 2), N = 48, us = Array.from({ length: N + 1 }, (_, i) => i / N);
  x.fillStyle = c; x.fillRect(0, 0, W, H);
  x.fillStyle = c2; x.beginPath(); x.moveTo(0, H);
  us.forEach((u) => x.lineTo(U(u), Y(cap(u)))); x.lineTo(W, H); x.fill();
  line(x, us.map((u) => [U(u), Y(cap(u)) - 1.5]), shade(c, 0.35), 2.5);
  // манжета с липучкой
  x.fillStyle = shade(c, -0.2); x.fillRect(0, 0, W, Y(0.49));
  line(x, [[0, Y(0.49)], [W, Y(0.49)]], shade(c, -0.32), 1.5);
  x.fillStyle = shade(c, -0.42); rrect(x, U(0.2), Y(0.548), U(0.1), Y(0.5) - Y(0.548), 3); x.fill();
  // локтевые вытачки и швы
  for (const y of [0.25, 0.335]) line(x, Array.from({ length: 17 }, (_, i) => { const u = 0.32 + i * 0.0225; return [U(u), Y(y + 0.012 * Math.sin((u - 0.32) * 8.7))]; }), shade(c, -0.2), 1.5);
  line(x, [[U(0.75), Y(0.05)], [U(0.75), H]], 'rgba(0,0,0,0.16)', 1.2);
  grain(x, W, H, 8, 5);
}, { aniso: 8 }));

// Капюшон: u — по кругу валика, v — вдоль (концы у ключиц); кант по краю
export const hoodTex = (c2, c) => memo(`hd${c2}${c}`, () => canvasTex(128, 128, (x, W, H) => {
  x.fillStyle = c2; x.fillRect(0, 0, W, H);
  x.fillStyle = shade(c2, -0.25); x.fillRect(W * 0.18, 0, W * 0.16, H);
  line(x, [[W * 0.18, 0], [W * 0.18, H]], shade(c, 0.1), 2);
  grain(x, W, H, 8, 13);
}, { aniso: 4 }));

// Штаны: u — по кругу (0.75 — наружная сторона передней ноги), y от таза (−0.075) до манжеты (0.93)
export const pantsTex = (c) => memo(`p${c}`, () => canvasTex(512, 512, (x, W, H) => {
  const Y = (y) => (1 - (y + 0.075) / 1.0) * H, U = (u) => u * W;
  x.fillStyle = c; x.fillRect(0, 0, W, H);
  // накладной карман с клапаном на бедре
  x.fillStyle = shade(c, 0.06); rrect(x, U(0.66), Y(0.47), U(0.12), Y(0.31) - Y(0.47), 6); x.fill();
  x.strokeStyle = shade(c, -0.3); x.lineWidth = 1.5; x.setLineDash([3, 3]); rrect(x, U(0.66) + 3, Y(0.47) + 3, U(0.12) - 6, Y(0.31) - Y(0.47) - 6, 5); x.stroke(); x.setLineDash([]);
  x.fillStyle = shade(c, -0.12); rrect(x, U(0.655), Y(0.48), U(0.13), 18, 5); x.fill();
  x.fillStyle = shade(c, 0.5); for (const u of [0.69, 0.75]) { x.beginPath(); x.arc(U(u), Y(0.48) + 12, 2.5, 0, 7); x.fill(); }
  // длинная косая молния вентиляции по наружной стороне бедра — яркая, как на референсе
  line(x, [[U(0.775), Y(0.14)], [U(0.72), Y(0.29)]], shade(c, -0.25), 7);
  line(x, [[U(0.775), Y(0.14)], [U(0.72), Y(0.29)]], '#d4dc2c', 3.5);
  x.fillStyle = '#d4dc2c'; rrect(x, U(0.775) - 3, Y(0.14) - 2, 6, 12, 2); x.fill();
  // швы: боковой, шаговый, коленные вытачки
  line(x, [[U(0.75), 0], [U(0.75), H]], shade(c, -0.25), 1.6);
  line(x, [[U(0.25), Y(0.02)], [U(0.25), H]], shade(c, -0.25), 1.6);
  for (const y of [0.395, 0.505]) line(x, Array.from({ length: 21 }, (_, i) => { const u = 0.36 + i * 0.014; return [U(u), Y(y + 0.018 * Math.cos((u - 0.5) * 10))]; }), shade(c, -0.3), 1.6);
  // манжета и усиленная вставка изнутри (от ударов кантом)
  x.fillStyle = shade(c, -0.3); x.fillRect(0, Y(0.84), W, H - Y(0.84));
  x.fillStyle = shade(c, -0.45); rrect(x, U(0.16), Y(0.93), U(0.18), Y(0.76) - Y(0.93), 8); x.fill();
  line(x, [[0, Y(0.84)], [W, Y(0.84)]], 'rgba(220,228,238,0.55)', 3);
  grain(x, W, H, 10, 7);
}, { aniso: 8 }));

// Шлем: u — по кругу (0.5 — лоб), v — от макушки (0) к краю (1)
export const helmetTex = (c, accent) => memo(`h${c}${accent}`, () => canvasTex(256, 256, (x, W, H) => {
  x.fillStyle = c; x.fillRect(0, 0, W, H);
  x.fillStyle = accent;
  for (const u of [0, 0.5, 1]) x.fillRect(u * W - 9, 0, 18, H);
  x.fillStyle = shade(c, -0.08);
  for (const u of [0, 0.5, 1]) { x.fillRect(u * W - 14, 0, 3, H); x.fillRect(u * W + 11, 0, 3, H); }
  x.fillStyle = shade(c, -0.55); x.font = 'bold 15px sans-serif'; x.textAlign = 'center';
  for (const u of [0.25, 0.75]) x.fillText('SNOW', u * W, H * 0.72);
  x.fillStyle = shade(c, -0.18); x.fillRect(0, H * 0.94, W, H * 0.06);
  grain(x, W, H, 4, 9);
}, { aniso: 4 }));

export const lensTex = (tint) => memo(`l${tint}`, () => canvasTex(128, 64, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, shade(tint, -0.45)); g.addColorStop(0.45, tint); g.addColorStop(1, '#8a3cf0');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,0.35)';
  x.beginPath(); x.moveTo(W * 0.12, 0); x.lineTo(W * 0.3, 0); x.lineTo(W * 0.16, H); x.lineTo(W * 0.02, H); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.18)';
  x.beginPath(); x.moveTo(W * 0.36, 0); x.lineTo(W * 0.42, 0); x.lineTo(W * 0.3, H); x.lineTo(W * 0.24, H); x.fill();
}, { aniso: 1 }));

export const gStrapTex = (accent) => memo(`gs${accent}`, () => canvasTex(512, 32, (x, W, H) => {
  x.fillStyle = '#16181c'; x.fillRect(0, 0, W, H);
  x.fillStyle = accent; x.fillRect(0, 2, W, 3); x.fillRect(0, H - 5, W, 3);
  x.fillStyle = '#f1f5f9'; x.font = 'bold 15px sans-serif'; x.textAlign = 'center';
  for (let i = 0; i < 3; i++) x.fillText('SNOW SCHOOL', (i + 0.5) * W / 3, H * 0.72);
}, { aniso: 4 }));

export const gaiterTex = (c) => memo(`g${c}`, () => canvasTex(256, 128, (x, W, H) => {
  x.fillStyle = c; x.fillRect(0, 0, W, H);
  x.strokeStyle = shade(c, 0.35); x.lineWidth = 2;
  for (let r = 0; r < 4; r++) {
    x.beginPath();
    for (let i = 0; i <= 16; i++) x.lineTo((i / 16) * W, 18 + r * 30 + (i % 2 ? -8 : 8));
    x.stroke();
  }
  grain(x, W, H, 12, 11);
}, { aniso: 4 }));

// Ботинок: u — по кругу (0 — пятка, 0.5 — носок), v — высота (0…0.288 м)
export const bootTex = (c, accent) => memo(`b${c}${accent}`, () => canvasTex(256, 256, (x, W, H) => {
  const Y = (y) => (1 - y / 0.288) * H, U = (u) => u * W;
  x.fillStyle = c; x.fillRect(0, 0, W, H);
  // носок и задник плотнее
  x.fillStyle = shade(c, -0.3);
  x.beginPath(); x.ellipse(U(0.5), Y(0.03), U(0.2), Y(0.03) - Y(0.095), 0, 0, Math.PI * 2); x.fill();
  x.fillRect(0, Y(0.15), U(0.11), H); x.fillRect(U(0.89), Y(0.15), U(0.11), H);
  // язык и шнуровка
  x.fillStyle = shade(c, 0.22); rrect(x, U(0.415), Y(0.29), U(0.17), Y(0.085) - Y(0.29), 10); x.fill();
  x.strokeStyle = '#e5e7eb'; x.lineWidth = 1.6;
  for (let y = 0.1; y < 0.27; y += 0.022) { x.beginPath(); x.moveTo(U(0.43), Y(y)); x.lineTo(U(0.57), Y(y + 0.016)); x.moveTo(U(0.57), Y(y)); x.lineTo(U(0.43), Y(y + 0.016)); x.stroke(); }
  // петля на заднике и манжета
  x.fillStyle = accent; x.fillRect(0, 0, U(0.03), Y(0.24)); x.fillRect(U(0.97), 0, U(0.03), Y(0.24));
  x.fillStyle = shade(c, -0.45); x.fillRect(0, 0, W, Y(0.262));
  // строчка
  x.strokeStyle = shade(c, 0.4); x.setLineDash([3, 3]); x.lineWidth = 1;
  x.beginPath(); x.moveTo(0, Y(0.155)); x.lineTo(W, Y(0.155)); x.stroke(); x.setLineDash([]);
  x.fillStyle = shade(c, 0.6); x.font = 'bold 13px sans-serif'; x.textAlign = 'center';
  x.fillText('SNOW', U(0.25), Y(0.06)); x.fillText('SNOW', U(0.75), Y(0.06));
  grain(x, W, H, 8, 13);
}, { aniso: 4 }));

export const highbackTex = (accent) => memo(`hb${accent}`, () => canvasTex(128, 256, (x, W, H) => {
  x.fillStyle = '#cfd4db'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#b9c0c9';
  for (let i = 0; i < 7; i++) rrect(x, 10 + i * 16, H * 0.12, 7, H * 0.66, 4), x.fill();
  x.fillStyle = accent; rrect(x, W * 0.3, H * 0.84, W * 0.4, 8, 4); x.fill();
  grain(x, W, H, 6, 17);
}, { aniso: 4 }));

export const bStrapTex = (accent) => memo(`bs${accent}`, () => canvasTex(256, 64, (x, W, H) => {
  x.fillStyle = accent; x.fillRect(0, 0, W, H);
  x.fillStyle = shade(accent, -0.25);
  for (let i = 0; i < 9; i++) rrect(x, 8 + i * 28, H * 0.28, 20, H * 0.44, 6), x.fill();
  x.strokeStyle = shade(accent, 0.45); x.lineWidth = 1.2; x.setLineDash([4, 3]);
  x.beginPath(); x.moveTo(0, 6); x.lineTo(W, 6); x.moveTo(0, H - 6); x.lineTo(W, H - 6); x.stroke(); x.setLineDash([]);
}, { aniso: 4 }));

// Диск крепления: деления через 3°, длинные — через 15°
export const discTex = () => memo('disc', () => canvasTex(256, 256, (x, W, H) => {
  x.fillStyle = '#2b3038'; x.fillRect(0, 0, W, H);
  x.translate(W / 2, H / 2);
  for (let a = 0; a < 360; a += 3) {
    const long = a % 15 === 0, r0 = long ? 92 : 104;
    x.strokeStyle = long ? '#f8fafc' : '#9aa3ad'; x.lineWidth = long ? 3 : 1.6;
    const s = Math.sin(a * Math.PI / 180), cc = Math.cos(a * Math.PI / 180);
    x.beginPath(); x.moveTo(cc * r0, s * r0); x.lineTo(cc * 122, s * 122); x.stroke();
  }
  x.fillStyle = '#1d2127'; x.beginPath(); x.arc(0, 0, 70, 0, 7); x.fill();
}, { aniso: 4 }));

// Топшит: 0…1 по длине (нос справа), 0…1 поперёк. Принт как у досок из POLYGON Snow Kit:
// ночное небо от фиолетового к бирюзе, северное сияние, три гряды гор со снежными шапками.
export const topsheetTex = (c) => memo(`t${c}`, () => canvasTex(2048, 256, (x, W, H) => {
  const r = rng(7);
  // развёртка верха доски зеркальна поперёк: рисуем вверх ногами, чтобы горы стояли, а надпись читалась
  x.translate(0, H); x.scale(1, -1);
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#1a1442'); g.addColorStop(0.3, shade(c, -0.3)); g.addColorStop(0.62, c); g.addColorStop(1, '#0e7a73');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // северное сияние: мягкие волны, широкий слабый мазок под узким ярким
  x.lineCap = 'round';
  for (const [col, y0, amp, ph] of [['45,212,191', 0.36, 0.09, 0], ['192,132,252', 0.27, 0.07, 2.1]]) {
    for (const [w, a] of [[46, 0.12], [24, 0.22], [9, 0.4]]) {
      x.strokeStyle = `rgba(${col},${a})`; x.lineWidth = w; x.beginPath();
      for (let i = 0; i <= 90; i++) x.lineTo((i / 90) * W, H * (y0 + amp * Math.sin(i * 0.21 + ph) + 0.03 * Math.sin(i * 0.7)));
      x.stroke();
    }
  }
  // звёзды
  for (let i = 0; i < 70; i++) {
    x.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.5})`;
    x.beginPath(); x.arc(r() * W, H * (0.2 + r() * 0.3), 1 + r() * 2.2, 0, 7); x.fill();
  }
  // горы: дальняя гряда светлее, ближняя темнее; у высоких вершин — снег
  for (const [k, top, col] of [[0, 0.34, '#6d6fb4'], [1, 0.46, '#3f3d86'], [2, 0.6, '#231f55']]) {
    const pts = []; let px = -40;
    while (px < W + 80) { pts.push([px, H * (top + r() * 0.16)]); px += 70 + r() * 110; pts.push([px, H * (top + 0.14 + r() * 0.1)]); px += 50 + r() * 90; }
    x.fillStyle = col; x.beginPath(); x.moveTo(-40, H);
    pts.forEach(([a, b]) => x.lineTo(a, b)); x.lineTo(W + 80, H); x.fill();
    x.fillStyle = k === 2 ? 'rgba(236,240,255,0.92)' : 'rgba(236,240,255,0.75)';
    for (let i = 0; i < pts.length - 2; i += 2) {
      const [ax, ay] = pts[i], [lx, ly] = i ? pts[i - 1] : [ax - 80, ay + 40], [rx, ry] = pts[i + 1], f = 0.3;
      if (ay > H * (top + 0.09)) continue;
      x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + (rx - ax) * f, ay + (ry - ay) * f);
      x.lineTo(ax + (rx - ax) * f * 0.5, ay + (ry - ay) * f * 0.75); x.lineTo(ax - (ax - lx) * f * 0.4, ay + (ly - ay) * f * 0.85);
      x.lineTo(ax - (ax - lx) * f, ay + (ly - ay) * f); x.fill();
    }
  }
  // полосы вдоль кантов
  x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(0, H * 0.12, W, 4); x.fillRect(0, H * 0.88 - 4, W, 4);
  x.fillStyle = '#2dd4bf'; x.fillRect(0, H * 0.12 + 7, W, 3); x.fillRect(0, H * 0.88 - 10, W, 3);
  // надпись на ближней гряде
  x.font = '900 60px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillText('S N O W  ·  S C H O O L', W / 2 + 3, H * 0.74 + 3);
  x.fillStyle = '#ffffff'; x.fillText('S N O W  ·  S C H O O L', W / 2, H * 0.74);
  x.font = '900 64px sans-serif'; x.fillStyle = 'rgba(255,255,255,0.9)';
  x.fillText('❄', W * 0.06, H * 0.5); x.fillText('❄', W * 0.94, H * 0.5);
  grain(x, W, H, 6, 21);
}, { aniso: 8 }));

export const baseTex = (c) => memo(`bt${c}`, () => canvasTex(1024, 128, (x, W, H) => {
  x.fillStyle = '#161b24'; x.fillRect(0, 0, W, H);
  x.fillStyle = c; x.beginPath(); x.moveTo(W * 0.3, 0); x.lineTo(W * 0.42, 0); x.lineTo(W * 0.36, H); x.lineTo(W * 0.24, H); x.fill();
  x.beginPath(); x.moveTo(W * 0.58, 0); x.lineTo(W * 0.7, 0); x.lineTo(W * 0.76, H); x.lineTo(W * 0.64, H); x.fill();
  x.fillStyle = '#f8fafc'; x.font = '900 46px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('SNOW SCHOOL', W / 2, H / 2);
}, { aniso: 4 }));
