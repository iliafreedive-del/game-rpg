// сборка 58: нарисованный арт (assets/art/gpt, комплект GPT по промту) — иконки навыков, даров, Жатвы, зелий, фоны окон и арен.
// Картинки грузятся только когда нужны экрану; если файла нет или он не загрузился — остаётся прежний процедурный значок/фон.
const BASE = 'assets/art/gpt/';
export const ART = {
  skill: id => `${BASE}skills/${id}.png`,
  branch: id => `${BASE}skills/branch_${id}.png`,
  boon: id => `${BASE}boons/${id}.png`,
  perk: id => `${BASE}harvest/perk_${id}.png`,
  evo: id => `${BASE}harvest/${id}.png`,   // id уже вида evo_blades
  item: id => `${BASE}items/${id}.png`,
  zone: (id, port) => `${BASE}zones/${id}_${port ? 'port' : 'land'}.jpg`,
  arena: (ch, v, port) => `${BASE}hw/ch${ch}_${v}_${port ? 'port' : 'land'}.jpg`,
  banner: ch => `${BASE}hw/banner_ch${ch}.jpg`,
  hwResult: win => `${BASE}hw/${win ? 'victory' : 'defeat'}.png`,
  harvest: k => `${BASE}harvest/${k}.jpg`,   // intro | victory | defeat
};
// расходники: имя значка в атласе icons → отдельная картинка
export const ITEM_ART = { potion_hp: 'potion_hp', potion_mp: 'potion_mp', scroll: 'scroll' };

const imgs = new Map();
// одна картинка на путь; ok — загрузилась, bad — ошибка (больше не пробуем, без бесконечного onerror)
export function artImg(src) {
  let r = imgs.get(src); if (r) return r;
  const im = new Image(); im.decoding = 'async';
  r = { im, ok: false, bad: false, wait: [] }; imgs.set(src, r);
  im.onload = () => { r.ok = true; for (const f of r.wait.splice(0)) f(im); };
  im.onerror = () => { r.bad = true; r.wait.length = 0; };
  im.src = src; return r;
}
// вызвать f(img), когда картинка готова (сразу, если уже в кеше)
export function withArt(src, f) { const r = artImg(src); if (r.ok) f(r.im); else if (!r.bad) r.wait.push(f); }
// <img> для карточки; при ошибке — прежний символ
export const artTag = (src, fallback, cls = 'art-ic') => `<img class="${cls}" src="${src}" alt="" draggable="false" onerror="this.outerHTML=this.dataset.fb" data-fb="${String(fallback).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}">`;
// шапка-картинка окна: горизонтальная картинка зоны/режима
export function artHead(src, cls = '') { const d = document.createElement('div'); d.className = 'art-head ' + cls; const im = new Image(); im.alt = ''; im.onerror = () => d.remove(); im.src = src; d.appendChild(im); return d; }
