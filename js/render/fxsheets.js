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
let started = false, keep = null, extra = [];   // extra — листы выученных навыков (combat.js preloadSkillFx)
const BASE = 'assets/';
export function preloadFxSheets() {
  if (started) return; started = true;
  const add = J => { for (const [id, m] of Object.entries(J)) META[id] = m; if (keep) scope(keep); };
  loadJSON('art/fx/fx_mobs.json').then(add, () => console.warn('[fx] missing fx_mobs.json'));
  loadJSON('art/fx/fx.json').then(add, () => console.warn('[fx] missing fx.json'));
}
// правки 3: эти листы героя GPT нарисовал сеткой 4×4 (16 кадров), а в fx.json записано 3×3 — в кадр попадали куски
// четырёх соседних картинок («экран с повторяющимися картинками» в квадратной рамке). Сетка — здесь, json пересобирает fx_pack.py
const GRID4 = new Set(['hit_slash_sword', 'hit_slash_heavy', 'hit_spark', 'hit_crit', 'hit_arrow', 'hit_star_bolt', 'hit_block', 'sk_leap_launch', 'sk_leap_flash', 'sk_volley_flash', 'hit_pierce_shot', 'hw_slash_hero', 'hw_slash_foe', 'hw_volley']);   // сборка 66: и три листа Летописи из полного комплекта
const real = id => (META[id] && META[id].same) || id;   // sk_cleave -> hit_slash_heavy
function want(id) {
  id = real(id); let m = META[id]; if (!m || sheets.has(id) || pending.has(id)) return;
  if (GRID4.has(id)) m = { ...m, cols: 4, rows: 4, frames: 16 };
  const im = new Image(); im.decoding = 'async'; pending.set(id, im);
  im.onload = () => { if (pending.get(id) !== im) return; pending.delete(id); const C = m.cols ? im.naturalWidth / m.cols : 0; sheets.set(id, { ...m, img: C ? softCells(im, { ...m, id }, C, ROUND.has(id)) : im, C }); };   // кадр — по картинке: ПК 192, телефон 128
  im.onerror = () => { pending.delete(id); console.warn('[fx] missing sheet', id); };
  // правки 5: стоячие листы (корни лешего, оплетание героя, вихрь, шипы, состояния) на телефоне с кадром 128 px растянуты — «пиксельные». Им — полный кадр
  // (+3 МБ памяти на лист; грузятся только листы своего края и выученных навыков)
  const lo = PHONE && m.view !== 'upright';
  im.src = BASE + (lo ? m.file.replace(/^assets\/art\/fx\//, 'art/fx/m/') : m.file.replace(/^assets\//, ''));
}
// правки 3: у многих листов GPT рисунок доходит до края кадра (вспышки, удары, вихрь) — в игре и Летописи был виден
// жёсткий квадрат. Один раз при загрузке каждый кадр гасится к краям: мягкая рамка ~12 % кадра у всех листов,
// у круглых листов «на полу» (вихрь воина) — ещё и круг (до 0.3 кадра как нарисовано, к 0.49 — в ноль)
const ROUND = new Set(['sk_whirlwind', 'sv_main_warrior', 'fj_blizzard_nova', 'sk_leap_flash', 'sk_leap_impact', 'fj_jarl_stomp', 'gr_scorch', 'gr_frost', 'gr_burning_ground']);   // список здесь, а не в fx.json: json пересобирает tools/art/fx_pack.py
const SEAM = new Set(['hit_spark', 'hit_crit', 'hit_arrow', 'hit_star_bolt', 'hit_block', 'hit_pierce_shot']);
function softCells(im, m, C, round) {
  const W = im.naturalWidth, H = im.naturalHeight, n = Math.max(1, Math.round(C)), e = n * 0.12;
  const cm = document.createElement('canvas'); cm.width = cm.height = n; const y = cm.getContext('2d'); y.fillStyle = '#000'; y.fillRect(0, 0, n, n);
  y.globalCompositeOperation = 'destination-out';
  for (const [x0, y0, x1, y1] of [[0, 0, e, 0], [n, 0, n - e, 0], [0, 0, 0, e], [0, n, 0, n - e]]) { const g = y.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); y.fillStyle = g; y.fillRect(0, 0, n, n); }
  if (round) { const cx = (m.anchor ? m.anchor[0] : 0.5) * n, cy = (m.anchor ? m.anchor[1] : 0.5) * n, g = y.createRadialGradient(cx, cy, 0, cx, cy, n * 0.49);
    g.addColorStop(0, '#000'); g.addColorStop(0.3 / 0.49, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); y.globalCompositeOperation = 'destination-in'; y.fillStyle = g; y.fillRect(0, 0, n, n); }
  // правки 5: у стоячего листа низ рисунка — ровная полоса земли («обрубленный плоский низ»); гасим её плавно от точки привязки вниз
  if (m.view === 'upright' && m.anchor) { y.globalCompositeOperation = 'destination-out'; const a = m.anchor[1] * n, g = y.createLinearGradient(0, a - n * 0.16, 0, Math.min(n, a + n * 0.08));
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); y.fillStyle = g; y.fillRect(0, a - n * 0.16, n, n); }
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  for (let r = 0; r * C < H - 1; r++) for (let k = 0; k * C < W - 1; k++) x.drawImage(cm, k * C, r * C, C, C);
  if (SEAM.has(m.id)) { x.globalCompositeOperation = 'destination-out'; const h = H * 0.035;   // склейка GPT на 1/3 и 2/3 высоты: жёсткий срез рисунка — гасим полосой
    for (const yy of [H / 3, H * 2 / 3]) { const g = x.createLinearGradient(0, yy - h, 0, yy + h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, yy - h, W, h * 2); }
    x.globalCompositeOperation = 'source-over'; }
  x.globalCompositeOperation = 'source-in'; x.drawImage(im, 0, 0); return c;
}
// сборка 66: в 3D листы «на полу» рисует плоскость у земли (render3d/decals.js) — на 2D-холсте поверх они закрывали героя и мобов
export const fxGround = { on: false };
// и «объёмные» листы на земле (без высоты z) — щитами в 3D (decals.js FxBillboards); fxBillboard отдаёт кадр для щита
export const isUprightFx = e => e.kind === 'sheet' && fxGround.on && !(e.z > 0.3) && (META[real(e.id)] || {}).view === 'upright';
export function fxBillboard(fx, alpha, cam) {
  const S = sheets.get(real(fx.id)); if (!S) return null;
  const k = fx.cyc ? fx.t / fx.cyc : fx.t / fx.dur, [sx, sy] = cellOf(S, k);
  const flip = fx.ex != null && cam.toScreen(fx.ex, fx.ey)[0] > cam.toScreen(fx.x, fx.y)[0];
  return { S: { img: imgOf(S, real(fx.id), fx.realm), C: S.C, anchor: S.anchor }, sx, sy, x: fx.x, y: fx.y, z: fx.z, size: fx.size || S.meters, alpha, flip, add: fx.add, back: BLAST_FX.has(real(fx.id)) && k > 0.18 };   // взрыв: после вспышки уходит за цель — моб виден в огне, а не за «шторкой»
}
export function statusBillboard(id, x, y, z, size, alpha = 1, k) {
  const S = sheets.get(real(id)); if (!S) return null; const [sx, sy] = cellOf(S, k ?? (G.time / S.dur) % 1);
  return { S: { img: S.img, C: S.C, anchor: S.anchor }, sx, sy, x, y, z, size: size || S.meters, alpha, flip: false, add: false };
}
export const isGroundFx = e => e.kind === 'sheet' && fxGround.on && (META[real(e.id)] || {}).view === 'ground';
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
  mage: ['proj_star_bolt', 'hit_star_bolt', 'proj_fireball', 'hit_fire_explosion', 'gr_scorch'],   // сборка 66: листы остальных навыков мага — по навыкам, что выучены (combat.js preloadSkillFx)
};
const COMMON = ['mob_', 'hit_crit', 'hit_block', 'st_stun'];
function scope(pfxs) {
  keep = pfxs; const mine = COMMON.concat(HERO[(G.profile && G.profile.cls) || 'warrior'] || [], extra, pfxs);
  const ok = id => mine.some(p => id.startsWith(p));
  for (const id of [...sheets.keys()]) if (!ok(id)) sheets.delete(id);   // отпустить листы чужого края (картинка уйдёт из памяти)
  for (const [id, im] of [...pending]) if (!ok(id)) { pending.delete(id); im.src = ''; }
  // телефон: листы края заранее не грузим — только приёмы мобов, которые есть на этой карте (combat.js preloadMobFx) и узор телеграфа
  const pre = id => !PHONE || !pfxs.some(p => id.startsWith(p)) || id.endsWith('_tele_pattern');
  for (const id of Object.keys(META)) if (ok(id) && !META[id].same && pre(id)) want(id);
}
// сборка 66: листы навыков, что у героя выучены (лёд, огонь, молния, метеор) — держать и заранее грузить, остальные — по первому применению
export function fxKeep(ids) { extra = ids; if (keep) scope(keep); }
bus.on('zoneEntered', id => {
  tinted.clear(); patterns.clear();
  const r = zoneRealm(); scope(r ? (r === 'forest' ? ['fr_', 'st_rooted'] : [REALM_PFX[r]]) : id === 'town' ? ['hw_'] : id === 'survival' ? ['sv_', 'proj_', 'hit_', 'beam_', 'gr_', 'sk_meteor_impact', 'sk_meteor_target', 'sk_thunder_strike', 'sk_whirlwind', 'sk_arrow_rain_', 'ct_abyss_nova', 'fj_blizzard_nova'] : id === 'depths' ? ['ct_', 'dp_'] : ['ct_']);   // деревня — листы по первому удару (и листы Летописи hw_, когда будут); правки 3: Жатва — листы своего оружия (sv_ из промта) и запасные
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
  const k = fx.cyc ? fx.t / fx.cyc : fx.t / fx.dur, [sx, sy] = cellOf(S, k), img = imgOf(S, id, fx.realm), m = fx.size || S.meters, C = S.C;
  ctx.save(); ctx.globalAlpha = alpha; if (fx.add) ctx.globalCompositeOperation = 'lighter';   // правки 3: add — сложением цветов (Жатва: ярко на тёмной арене)   // листы с чёрным фоном переведены в альфу (blend 'add' в json): обычное наложение — сложение на светлой траве выцветало до белого
  if (S.view === 'ground') { groundBasis(ctx, cam, fx.x, fx.y, fx.a || 0); ctx.drawImage(img, sx, sy, C, C, -m * S.anchor[0], -m * S.anchor[1], m, m); }
  else {   // «объём»: стоит вертикально, повёрнут к герою лицом; нарисован «вправо» — разворачиваем, если удар идёт справа налево
    const [gx, gy, ppm] = ppmAt(cam, fx.x, fx.y, fx.z || 0), w = m * ppm;
    ctx.translate(gx, gy); if (fx.ex != null && cam.toScreen(fx.ex, fx.ey)[0] > cam.toScreen(fx.x, fx.y)[0]) ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, C, C, -w * S.anchor[0], -w * S.anchor[1], w, w);
  }
  ctx.restore(); return true;
}
// сборка 66: взрыв (объёмный лист) ещё и «расплёскан» по земле — отсвет у ног, чтобы вспышка не выглядела плоской картинкой
export const BLAST_FX = new Set(['sk_meteor_impact', 'sv_evo_sky_wrath', 'sk_burn_explode', 'hit_fire_explosion']);
export function drawFxFlat(ctx, cam, fx, alpha = 1) {
  const id = real(fx.id), S = sheets.get(id); if (!S) return false;
  const k = fx.t / fx.dur, [sx, sy] = cellOf(S, k), m = (fx.size || S.meters) * 0.95, C = S.C;
  ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'lighter'; groundBasis(ctx, cam, fx.x, fx.y, 0);
  ctx.drawImage(imgOf(S, id, fx.realm), sx, sy, C, C, -m * 0.5, -m * 0.62, m, m); ctx.restore(); return true;
}
// пятно жара на полу (круг радиуса r м, мягкий край) — подложка под огонь, чтобы середина светилась
export function drawGroundGlow(ctx, cam, x, y, r, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'lighter'; groundBasis(ctx, cam, x, y, 0);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, 'rgba(255,170,60,0.55)'); g.addColorStop(0.6, 'rgba(255,90,20,0.35)'); g.addColorStop(1, 'rgba(255,40,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.restore();
}
// снаряд: лист «вправо», поворачивается по полёту (ang — экранный угол), t — время полёта для цикла кадров
export function drawProjSheet(ctx, cam, id, x, y, z, ang, t, size) {
  const S = sheets.get(real(id)); if (!S) return false;
  const [sx, sy] = cellOf(S, S.still != null ? (S.still + 0.5) / S.frames : (t / S.dur) % 1), [gx, gy, ppm] = ppmAt(cam, x, y, z), w = (size || S.meters) * ppm, C = S.C;   // правки 5: still — один кадр без анимации (копьё метателя: лист «крутил» копьё, оно гнулось и пропадало)
  ctx.save(); ctx.translate(gx, gy); ctx.rotate(ang + (S.rot || 0)); if (S.sy) ctx.scale(1, S.sy); ctx.drawImage(S.img, sx, sy, C, C, -w * S.anchor[0], -w * S.anchor[1], w, w); ctx.restore(); return true;   // правки 5: rot — стрела на листе нарисована под углом (у стрелы браконьера ≈ −15°), разворачиваем по полёту; sy — сплющить по толщине (стрела героя: оперение выглядело комично)
}
// правки 3: лист в экранных координатах (Летопись битв — свой холст и своя камера сбоку). ids — по порядку предпочтения:
// рисуется первый уже загруженный (остальные заказываются), k — доля анимации 0..1 (у цикла — любое число), w — ширина кадра в px,
// o.ang — поворот (снаряды), o.flip — отразить по горизонтали. Возвращает id нарисованного листа или null (тогда рисуется прежний эффект)
export function drawSheetAt(ctx, ids, k, x, y, w, o = {}) {
  let S = null; for (const i of ids) { if (fxReady(i)) { S = sheets.get(real(i)); break; } }
  if (!S) return null;
  const [sx, sy] = cellOf(S, S.still != null ? (S.still + 0.5) / S.frames : S.loop ? ((k % 1) + 1) % 1 : Math.max(0, Math.min(0.999, k))), C = S.C;
  ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.translate(x, y); if (o.ang) ctx.rotate(o.ang); if (o.flip) ctx.scale(-1, 1);
  if (S.view === 'ground') ctx.scale(1, 0.45);   // лист «на полу» сбоку — сплющенный эллипс
  const an = (S.view === 'side' || o.force) && o.anchor ? o.anchor : S.anchor;   // снаряд сбоку (hw_*) — точка привязки в голове снаряда, а не на полу
  const h = o.h || w; ctx.drawImage(S.img, sx, sy, C, C, -w * an[0], -h * an[1], w, h); ctx.restore(); return true;   // o.h — высота кадра (луч молнии: длина × толщина)
}
// состояние на существе (оглушение над головой, кровь, корни, ярость): цикл по времени игры; k — доля разового листа (лёд вокруг замороженного)
export function drawStatusSheet(ctx, cam, id, x, y, z, size, alpha = 1, k) {
  const S = sheets.get(real(id)); if (!S) return false;
  const [sx, sy] = cellOf(S, k ?? (G.time / S.dur) % 1), [gx, gy, ppm] = ppmAt(cam, x, y, z), w = (size || S.meters) * ppm, C = S.C;
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(S.img, sx, sy, C, C, gx - w * S.anchor[0], gy - w * S.anchor[1], w, w); ctx.restore(); return true;
}
// сборка 66: лист-луч (цепная молния) растянут между двумя точками: ячейка рисует разряд от середины левого края до середины правого
export function drawBeamSheet(ctx, cam, id, x1, y1, z1, x2, y2, z2, k, h = 1.2) {
  const S = sheets.get(real(id)); if (!S) return false;
  const [ax, ay] = cam.toScreen(x1, y1, z1), [bx, by] = cam.toScreen(x2, y2, z2), [, , ppm] = ppmAt(cam, x1, y1, z1), L = Math.hypot(bx - ax, by - ay), [sx, sy] = cellOf(S, k), C = S.C;
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(by - ay, bx - ax)); ctx.drawImage(S.img, sx, sy, C, C, 0, -h * ppm / 2, L, h * ppm); ctx.restore(); return true;
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
