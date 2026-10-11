// П21: спрайт-листы эффектов от GPT. assets/art/fx/fx_mobs.json — атаки врагов (общие mob_* и по краям: ct_ катакомбы,
// dp_ глубины, fr_ лес, tm_ храм, fj_ фьорды, bn_ пустоши), assets/art/fx/fx.json — удары, снаряды и навыки героя.
// Рисуются на 2D-оверлее поверх 3D (как остальные эффекты). Пока лист не загрузился — draw* возвращают false,
// и рендерер рисует прежний эффект (fxReady — то же для игровой логики).
// Память (сборка 61): листы грузятся не все сразу, а только нужные: свой край + общие + удары героя; при смене зоны
// листы чужого края отпускаются. На ПК кадр 192 px, на телефоне — копии с кадром 128 px из assets/art/fx/m/ (1 МБ памяти на лист 4×4 вместо 4).
import { G, bus } from '../game/ctx.js';
import { loadJSON } from '../core/assets.js';

const PHONE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const META = {}, sheets = new Map(), pending = new Map();   // id -> мета; id -> { ...meta, img, C }; id -> Image (грузится)
let started = false, keep = null;
const BASE = 'assets/';
export function preloadFxSheets() {
  if (started) return; started = true;
  const add = J => { for (const [id, m] of Object.entries(J)) META[id] = m; if (keep) scope(keep); };
  loadJSON('art/fx/fx_mobs.json').then(add, () => console.warn('[fx] missing fx_mobs.json'));
  loadJSON('art/fx/fx.json').then(add, () => console.warn('[fx] missing fx.json'));
}
const real = id => (META[id] && META[id].same) || id;   // sk_cleave -> hit_slash_heavy
function want(id) {
  id = real(id); const m = META[id]; if (!m || sheets.has(id) || pending.has(id)) return;
  const im = new Image(); im.decoding = 'async'; pending.set(id, im);
  im.onload = () => { if (pending.get(id) !== im) return; pending.delete(id); sheets.set(id, { ...m, img: im, C: m.cols ? im.naturalWidth / m.cols : 0 }); };   // кадр — по картинке: ПК 192, телефон 128
  im.onerror = () => { pending.delete(id); console.warn('[fx] missing sheet', id); };
  im.src = BASE + (PHONE ? m.file.replace(/^assets\/art\/fx\//, 'art/fx/m/') : m.file.replace(/^assets\//, ''));
}
// лист готов к рисованию? (если нет — заказать загрузку; вызывающий рисует прежний эффект)
export const fxMeta = id => META[real(id)];
export function fxReady(id) { id = real(id); if (sheets.has(id)) return true; want(id); return false; }

// край зоны -> приставка листов; общие листы держим всегда
const REALM_PFX = { forest: 'fr_', temple: 'tm_', fjord: 'fj_', bones: 'bn_' };
export function zoneRealm() { const z = G.zone, w = z && z.json && z.json.wild; return w ? w.realm : null; }
// листы героя — только своего класса (остальные, например навык, взятый позже, догрузятся при первом применении)
const HERO = {
  warrior: ['hit_slash_sword', 'hit_slash_heavy', 'hit_spark', 'sk_whirlwind', 'sk_crush_wave', 'sk_leap_', 'sk_warcry_ring', 'st_warcry_buff', 'st_bleed'],
  archer: ['proj_arrow', 'hit_arrow', 'sk_volley_flash', 'proj_pierce_shot', 'hit_pierce_shot', 'sk_arrow_rain_', 'sk_explosive_arrow'],
  mage: ['proj_star_bolt', 'hit_star_bolt', 'proj_fireball', 'hit_fire_explosion'],
};
const COMMON = ['mob_', 'hit_crit', 'hit_block', 'st_stun'];
function scope(pfxs) {
  keep = pfxs; const mine = COMMON.concat(HERO[(G.profile && G.profile.cls) || 'warrior'] || [], pfxs);
  const ok = id => mine.some(p => id.startsWith(p));
  for (const id of [...sheets.keys()]) if (!ok(id)) sheets.delete(id);   // отпустить листы чужого края (картинка уйдёт из памяти)
  for (const [id, im] of [...pending]) if (!ok(id)) { pending.delete(id); im.src = ''; }
  // телефон: листы края заранее не грузим — только приёмы мобов, которые есть на этой карте (combat.js preloadMobFx) и узор телеграфа
  const pre = id => !PHONE || !pfxs.some(p => id.startsWith(p)) || id.endsWith('_tele_pattern');
  for (const id of Object.keys(META)) if (ok(id) && !META[id].same && pre(id)) want(id);
}
bus.on('zoneEntered', id => {
  tinted.clear(); patterns.clear();
  const r = zoneRealm(); scope(r ? (r === 'forest' ? ['fr_', 'st_rooted'] : [REALM_PFX[r]]) : id === 'town' ? [] : id === 'depths' ? ['ct_', 'dp_'] : ['ct_']);   // деревня — листы по первому удару
});

// подкраска общих листов зверей под край (промт: «игра подкрашивает под локацию»); катакомбы — как нарисовано
const TINT = { forest: '#dcf0c0', temple: '#ffe6b4', fjord: '#b4dcff', bones: '#ffc8a0' };
const tinted = new Map();
function imgOf(S, id, realm) {
  const t = id.startsWith('mob_') && TINT[realm]; if (!t) return S.img;
  const key = id + realm; let c = tinted.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = S.img.width; c.height = S.img.height; const x = c.getContext('2d');
  x.drawImage(S.img, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = t; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(S.img, 0, 0);
  tinted.set(key, c); return c;
}
const cellOf = (S, k) => { const n = S.loop ? Math.floor(k * S.frames) % S.frames : Math.min(S.frames - 1, Math.floor(k * S.frames)); return [(n % S.cols) * S.C, Math.floor(n / S.cols) * S.C]; };
// Лист «на полу»: локальные оси — x вдоль угла a, y поперёк; проекция берётся у камеры (работает и в 2D-изометрии, и в 3D)
function groundBasis(ctx, cam, x, y, a) {
  const c = Math.cos(a), s = Math.sin(a), [ox, oy] = cam.toScreen(x, y), [ux, uy] = cam.toScreen(x + c, y + s), [vx, vy] = cam.toScreen(x - s, y + c);
  ctx.transform(ux - ox, uy - oy, vx - ox, vy - oy, ox, oy);
}
const ppmAt = (cam, x, y, z) => { const [gx, gy] = cam.toScreen(x, y, z), [hx, hy] = cam.toScreen(x, y, z + 1); return [gx, gy, Math.hypot(hx - gx, hy - gy) / 0.866]; };
// разовый/циклический эффект-лист. fx: { id, x, y, a, t, dur, realm, size (м), z, ex, ey (откуда удар — для разворота) }
export function drawFxSheet(ctx, cam, fx, alpha = 1) {
  const id = real(fx.id), S = sheets.get(id); if (!S) return false;
  const k = fx.t / fx.dur, [sx, sy] = cellOf(S, k), img = imgOf(S, id, fx.realm), m = fx.size || S.meters, C = S.C;
  ctx.save(); ctx.globalAlpha = alpha;   // листы с чёрным фоном переведены в альфу (blend 'add' в json): обычное наложение — сложение на светлой траве выцветало до белого
  if (S.view === 'ground') { groundBasis(ctx, cam, fx.x, fx.y, fx.a || 0); ctx.drawImage(img, sx, sy, C, C, -m * S.anchor[0], -m * S.anchor[1], m, m); }
  else {   // «объём»: стоит вертикально, повёрнут к герою лицом; нарисован «вправо» — разворачиваем, если удар идёт справа налево
    const [gx, gy, ppm] = ppmAt(cam, fx.x, fx.y, fx.z || 0), w = m * ppm;
    ctx.translate(gx, gy); if (fx.ex != null && cam.toScreen(fx.ex, fx.ey)[0] > cam.toScreen(fx.x, fx.y)[0]) ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, C, C, -w * S.anchor[0], -w * S.anchor[1], w, w);
  }
  ctx.restore(); return true;
}
// снаряд: лист «вправо», поворачивается по полёту (ang — экранный угол), t — время полёта для цикла кадров
export function drawProjSheet(ctx, cam, id, x, y, z, ang, t, size) {
  const S = sheets.get(real(id)); if (!S) return false;
  const [sx, sy] = cellOf(S, (t / S.dur) % 1), [gx, gy, ppm] = ppmAt(cam, x, y, z), w = (size || S.meters) * ppm, C = S.C;
  ctx.save(); ctx.translate(gx, gy); ctx.rotate(ang); ctx.drawImage(S.img, sx, sy, C, C, -w * S.anchor[0], -w * S.anchor[1], w, w); ctx.restore(); return true;
}
// состояние на существе (оглушение над головой, кровь, корни, ярость): цикл по времени игры
export function drawStatusSheet(ctx, cam, id, x, y, z, size, alpha = 1) {
  const S = sheets.get(real(id)); if (!S) return false;
  const [sx, sy] = cellOf(S, (G.time / S.dur) % 1), [gx, gy, ppm] = ppmAt(cam, x, y, z), w = (size || S.meters) * ppm, C = S.C;
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(S.img, sx, sy, C, C, gx - w * S.anchor[0], gy - w * S.anchor[1], w, w); ctx.restore(); return true;
}
// узор подсветки опасной зоны края (бесшовный тайл): заливка кругов/конусов телеграфа. 1 метр тайла = 4 м мира (meters в json)
const TELE = { forest: 'fr_tele_pattern', temple: 'tm_tele_pattern', fjord: 'fj_tele_pattern', bones: 'bn_tele_pattern' };
const patterns = new Map();
export function telePattern(ctx, realm) {
  const id = TELE[realm] || 'ct_tele_pattern', S = sheets.get(id); if (!S) { want(id); return null; }
  let p = patterns.get(id); if (!p) { p = ctx.createPattern(S.img, 'repeat'); patterns.set(id, p); }
  return { p, px: S.img.width, m: S.meters || 4 };
}
// полоса разбега вместо красного прямоугольника: от врага на длину tg.r, ширина tg.w; ярко — уже пройденная заполнением часть
export function drawChargeTele(ctx, cam, tg, p, realm) {
  const S = sheets.get('mob_charge_tele'); if (!S) return false;
  const [sx, sy] = cellOf(S, (G.time / S.dur) % 1), img = imgOf(S, 'mob_charge_tele', realm), C = S.C, bh = C * 0.32, w = tg.w * 1.5;
  ctx.save(); groundBasis(ctx, cam, tg.x, tg.y, tg.a);
  ctx.globalAlpha = 0.45; ctx.drawImage(img, sx, sy + (C - bh) / 2, C, bh, 0, -w / 2, tg.r, w);
  ctx.globalAlpha = 1; ctx.beginPath(); ctx.rect(0, -w, tg.r * p, w * 2); ctx.clip(); ctx.drawImage(img, sx, sy + (C - bh) / 2, C, bh, 0, -w / 2, tg.r, w);
  ctx.restore(); return true;
}
