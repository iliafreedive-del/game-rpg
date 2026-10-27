// Текстуры экипировки на canvas: швы, молнии, карманы, рисунок доски, деления диска.
// Кэшируются по цветам: студия часто пересоздаёт райдеров.
import { canvasTex, grain, shade } from './kit.js';

const cache = new Map();
const memo = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

function line(x, pts, color, w, dash) {
  x.strokeStyle = color; x.lineWidth = w; x.setLineDash(dash || []);
  x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); x.setLineDash([]);
}
function rrect(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }

// Куртка: развёртка торса. u — по кругу (0 — спина, 0.5 — грудь), y — высота от таза (−0.17…0.65).
export const jacketTex = (c, c2) => memo(`j${c}${c2}`, () => canvasTex(512, 512, (x, W, H) => {
  const Y = (y) => (1 - (y + 0.17) / 0.82) * H, U = (u) => u * W;
  x.fillStyle = c; x.fillRect(0, 0, W, H);
  // кокетка контрастного цвета
  x.fillStyle = c2; x.beginPath(); x.moveTo(0, 0);
  for (let i = 0; i <= 64; i++) { const u = i / 64; x.lineTo(U(u), Y(0.37 + 0.035 * Math.cos((u - 0.5) * Math.PI * 2) - 0.04 * Math.exp(-(((u - 0.5) / 0.06) ** 2)))); }
  x.lineTo(W, 0); x.fill();
  line(x, Array.from({ length: 65 }, (_, i) => { const u = i / 64; return [U(u), Y(0.37 + 0.035 * Math.cos((u - 0.5) * Math.PI * 2) - 0.04 * Math.exp(-(((u - 0.5) / 0.06) ** 2)))]; }), shade(c, 0.45), 2.5);
  // подол и манжета воротника
  x.fillStyle = shade(c, -0.22); x.fillRect(0, Y(-0.125), W, H - Y(-0.125));
  x.fillStyle = shade(c2, -0.15); x.fillRect(0, 0, W, Y(0.585));
  // боковые швы
  for (const u of [0.25, 0.75]) line(x, [[U(u), 0], [U(u), H]], shade(c, -0.18), 1.5);
  // ветрозащитная планка и молния
  x.fillStyle = shade(c, 0.08); x.fillRect(U(0.5) - 9, Y(0.6), 18, Y(-0.17) - Y(0.6));
  line(x, [[U(0.5), 0], [U(0.5), H]], '#1b1d22', 3);
  for (let y = 4; y < H; y += 5) line(x, [[U(0.5) - 2.5, y], [U(0.5) + 2.5, y]], '#5b6068', 1);
  x.fillStyle = '#c9ced6'; rrect(x, U(0.5) - 3, Y(0.56), 6, 13, 2); x.fill();
  // карманы: нагрудный на молнии и два боковых
  line(x, [[U(0.585), Y(0.335)], [U(0.625), Y(0.245)]], '#1b1d22', 3);
  x.fillStyle = '#c9ced6'; x.fillRect(U(0.585) - 2, Y(0.335) - 2, 4, 9);
  for (const s of [-1, 1]) line(x, [[U(0.5 + s * 0.085), Y(0.13)], [U(0.5 + s * 0.12), Y(0.01)]], shade(c, -0.4), 3);
  // логотип на груди
  x.fillStyle = shade(c2, 0.85); rrect(x, U(0.405) - 15, Y(0.3), 30, 14, 3); x.fill();
  x.fillStyle = c; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.fillText('❄', U(0.405), Y(0.3) + 11);
  grain(x, W, H, 9, 3);
}, { aniso: 8 }));

// Рукав: u — по кругу (0.25 — наружная сторона), y от плеча (−0.07) до манжеты (0.55)
export const sleeveTex = (c, c2) => memo(`s${c}${c2}`, () => canvasTex(256, 512, (x, W, H) => {
  const Y = (y) => (1 - (y + 0.075) / 0.64) * H, U = (u) => u * W;
  x.fillStyle = c; x.fillRect(0, 0, W, H);
  x.fillStyle = c2; x.fillRect(0, Y(0.07), W, H - Y(0.07));
  line(x, [[0, Y(0.07)], [W, Y(0.07)]], shade(c, 0.45), 2.5);
  // манжета с липучкой
  x.fillStyle = shade(c, -0.25); x.fillRect(0, 0, W, Y(0.475));
  x.fillStyle = shade(c, -0.4); rrect(x, U(0.22), Y(0.53), U(0.1), Y(0.49) - Y(0.53), 3); x.fill();
  // локтевые вытачки и шов по наружной стороне
  for (const y of [0.25, 0.335]) line(x, Array.from({ length: 17 }, (_, i) => { const u = 0.32 + i * 0.0225; return [U(u), Y(y + 0.012 * Math.sin((u - 0.32) * 8.7))]; }), shade(c, -0.2), 1.5);
  line(x, [[U(0.25), Y(0.08)], [U(0.25), Y(0.47)]], shade(c, 0.35), 2);
  line(x, [[U(0.75), 0], [U(0.75), H]], shade(c, -0.15), 1.2);
  grain(x, W, H, 9, 5);
}, { aniso: 8 }));

// Штаны: u — по кругу (0.75 — наружная сторона передней ноги), y от таза (−0.075) до манжеты (0.93)
export const pantsTex = (c) => memo(`p${c}`, () => canvasTex(512, 512, (x, W, H) => {
  const Y = (y) => (1 - (y + 0.075) / 1.0) * H, U = (u) => u * W;
  x.fillStyle = c; x.fillRect(0, 0, W, H);
  // накладной карман с клапаном на бедре
  x.fillStyle = shade(c, 0.06); rrect(x, U(0.69), Y(0.31), U(0.12), Y(0.12) - Y(0.31), 6); x.fill();
  x.strokeStyle = shade(c, -0.3); x.lineWidth = 1.5; x.setLineDash([3, 3]); rrect(x, U(0.69) + 3, Y(0.31) + 3, U(0.12) - 6, Y(0.12) - Y(0.31) - 6, 5); x.stroke(); x.setLineDash([]);
  x.fillStyle = shade(c, -0.12); rrect(x, U(0.685), Y(0.325), U(0.13), 18, 5); x.fill();
  x.fillStyle = shade(c, 0.5); for (const u of [0.72, 0.78]) { x.beginPath(); x.arc(U(u), Y(0.325) + 12, 2.5, 0, 7); x.fill(); }
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
  x.fillStyle = '#272b32'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#343943';
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

// Топшит: 0…1 по длине (нос справа), 0…1 поперёк
export const topsheetTex = (c) => memo(`t${c}`, () => canvasTex(2048, 256, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, shade(c, -0.45)); g.addColorStop(0.2, c); g.addColorStop(0.5, shade(c, 0.12)); g.addColorStop(0.8, c); g.addColorStop(1, shade(c, -0.45));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // горный силуэт и тонкие линии вдоль доски
  x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 3;
  for (const k of [0, 1]) {
    x.beginPath();
    for (let i = 0; i <= 40; i++) { const px = (i / 40) * W; x.lineTo(px, H * (0.62 + k * 0.12) - (i % 3 === 0 ? 60 : i % 3 === 1 ? 18 : 40) * (1 - k * 0.4)); }
    x.stroke();
  }
  x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(0, H * 0.16, W, 4); x.fillRect(0, H * 0.84 - 4, W, 4);
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, H * 0.16 + 6, W, 2); x.fillRect(0, H * 0.84 - 8, W, 2);
  x.fillStyle = '#ffffff'; x.font = '900 64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('S N O W  ·  S C H O O L', W / 2, H / 2 + 4);
  x.font = '900 70px sans-serif'; x.fillStyle = 'rgba(255,255,255,0.9)';
  x.fillText('❄', W * 0.06, H / 2); x.fillText('❄', W * 0.94, H / 2);
  grain(x, W, H, 6, 21);
}, { aniso: 8 }));

export const baseTex = (c) => memo(`bt${c}`, () => canvasTex(1024, 128, (x, W, H) => {
  x.fillStyle = '#161b24'; x.fillRect(0, 0, W, H);
  x.fillStyle = c; x.beginPath(); x.moveTo(W * 0.3, 0); x.lineTo(W * 0.42, 0); x.lineTo(W * 0.36, H); x.lineTo(W * 0.24, H); x.fill();
  x.beginPath(); x.moveTo(W * 0.58, 0); x.lineTo(W * 0.7, 0); x.lineTo(W * 0.76, H); x.lineTo(W * 0.64, H); x.fill();
  x.fillStyle = '#f8fafc'; x.font = '900 46px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('SNOW SCHOOL', W / 2, H / 2);
}, { aniso: 4 }));
