// П21: спрайт-листы атак врагов от GPT (assets/art/fx/fx_mobs.json): укус, когти, клыки, полоса и удар разбега.
// Рисуются на 2D-оверлее поверх 3D (как остальные эффекты). Одна картинка на лист; подкраска под край — один холст на лист и край,
// кэш сбрасывается при смене зоны. Пока лист не загрузился — draw* возвращают false, и рендерер рисует прежний эффект.
import { G, bus } from '../game/ctx.js';
import { loadImage, loadJSON } from '../core/assets.js';

const META = 'art/fx/fx_mobs.json';   // от assets/ (core/assets.js)
const sheets = new Map();   // id -> { ...meta, img }
let started = false;
export function preloadFxSheets() {
  if (started) return; started = true;
  loadJSON(META).then(J => { for (const [id, m] of Object.entries(J)) loadImage(m.file.replace(/^assets\//, '')).then(img => sheets.set(id, { ...m, img }), () => console.warn('[fx] нет листа', id)); }, () => console.warn('[fx] нет', META));
}
// подкраска общих листов зверей под край (промт: «игра подкрашивает под локацию»); катакомбы — как нарисовано
const TINT = { forest: '#dcf0c0', temple: '#ffe6b4', fjord: '#b4dcff', bones: '#ffc8a0' };
const tinted = new Map();
bus.on('zoneEntered', () => tinted.clear());
function imgOf(S, id, realm) {
  const t = TINT[realm]; if (!t) return S.img;
  const key = id + realm; let c = tinted.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = S.img.width; c.height = S.img.height; const x = c.getContext('2d');
  x.drawImage(S.img, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = t; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(S.img, 0, 0);
  tinted.set(key, c); return c;
}
const cellOf = (S, k) => { const n = S.loop ? Math.floor(k * S.frames) % S.frames : Math.min(S.frames - 1, Math.floor(k * S.frames)); return [(n % S.cols) * S.cell, Math.floor(n / S.cols) * S.cell]; };
// Лист «на полу»: локальные оси — x вдоль угла a, y поперёк; проекция берётся у камеры (работает и в 2D-изометрии, и в 3D)
function groundBasis(ctx, cam, x, y, a) {
  const c = Math.cos(a), s = Math.sin(a), [ox, oy] = cam.toScreen(x, y), [ux, uy] = cam.toScreen(x + c, y + s), [vx, vy] = cam.toScreen(x - s, y + c);
  ctx.transform(ux - ox, uy - oy, vx - ox, vy - oy, ox, oy);
}
// разовый/циклический эффект-лист. fx: { id, x, y, a, t, dur, realm, size (м), z, ex, ey (откуда удар — для разворота) }
export function drawFxSheet(ctx, cam, fx, alpha = 1) {
  const S = sheets.get(fx.id); if (!S) return false;
  const k = fx.t / fx.dur, [sx, sy] = cellOf(S, k), img = imgOf(S, fx.id, fx.realm), m = fx.size || S.meters, C = S.cell;
  ctx.save(); ctx.globalAlpha = alpha;   // листы с чёрным фоном переведены в альфу (blend 'add' в json): обычное наложение — сложение на светлой траве выцветало до белого
  if (S.view === 'ground') { groundBasis(ctx, cam, fx.x, fx.y, fx.a || 0); ctx.drawImage(img, sx, sy, C, C, -m * S.anchor[0], -m * S.anchor[1], m, m); }
  else {   // «объём»: стоит вертикально, повёрнут к герою лицом; нарисован «вправо» — разворачиваем, если удар идёт справа налево
    const [gx, gy] = cam.toScreen(fx.x, fx.y, fx.z || 0), [hx, hy] = cam.toScreen(fx.x, fx.y, (fx.z || 0) + 1), ppm = Math.hypot(hx - gx, hy - gy) / 0.866, w = m * ppm;
    ctx.translate(gx, gy); if (fx.ex != null && cam.toScreen(fx.ex, fx.ey)[0] > cam.toScreen(fx.x, fx.y)[0]) ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, C, C, -w * S.anchor[0], -w * S.anchor[1], w, w);
  }
  ctx.restore(); return true;
}
// полоса разбега вместо красного прямоугольника: от врага на длину tg.r, ширина tg.w; ярко — уже пройденная заполнением часть
export function drawChargeTele(ctx, cam, tg, p, realm) {
  const S = sheets.get('mob_charge_tele'); if (!S) return false;
  const [sx, sy] = cellOf(S, (G.time / S.dur) % 1), img = imgOf(S, 'mob_charge_tele', realm), C = S.cell, bh = C * 0.32, w = tg.w * 1.5;
  ctx.save(); groundBasis(ctx, cam, tg.x, tg.y, tg.a);
  ctx.globalAlpha = 0.45; ctx.drawImage(img, sx, sy + (C - bh) / 2, C, bh, 0, -w / 2, tg.r, w);
  ctx.globalAlpha = 1; ctx.beginPath(); ctx.rect(0, -w, tg.r * p, w * 2); ctx.clip(); ctx.drawImage(img, sx, sy + (C - bh) / 2, C, bh, 0, -w / 2, tg.r, w);
  ctx.restore(); return true;
}
