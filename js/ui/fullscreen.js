// Полный экран на телефоне (сборка 38).
// Android и iPad: браузер даёт Fullscreen API — включаем по первому касанию (без касания браузер запрещает).
// iPhone (Safari и браузеры на его движке) такого API для страницы не даёт: строку браузера и шторку
// убирает только запуск с экрана «Домой» — тогда игра открывается отдельным окном на весь экран (manifest: display fullscreen).
// Правки 2 (П40): подсказка на титульном экране — своя для каждого устройства:
//   iPhone — «Поделиться → На экран „Домой“»; Android — игра сама на весь экран по касанию, а чтобы запускать с иконки —
//   кнопка «Установить» (событие beforeinstallprompt, Chrome/Яндекс Браузер/Samsung) или меню ⋮ → «Добавить на главный экран»;
//   ПК — F11 или кнопка «На весь экран». Внутри Яндекс Игр / VK (страница в рамке) подсказки Android и ПК не показываем —
//   там полным экраном управляет сама площадка.
import { isVKPlay } from '../platform/vkplay.js';
const standalone = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
const coarse = () => matchMedia('(pointer: coarse)').matches;
const isFs = () => { try { const y = window.__ysdk && window.__ysdk.screen && window.__ysdk.screen.fullscreen; if (y && y.status) return y.status === 'on'; } catch { } return !!(document.fullscreenElement || document.webkitFullscreenElement); };
const canFs = () => !isVKPlay() && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);   // VK Play: кнопки полного экрана в игре быть не должно (чек-лист «Testing»)
const iPhone = () => /iPhone|iPod/.test(navigator.userAgent);
const android = () => /Android/i.test(navigator.userAgent);
const framed = () => { try { return window.top !== window.self; } catch { return true; } };

// П4-14: iPhone, игра с экрана «Домой» (полоса состояния black-translucent) — iOS отдаёт окну высоту экрана минус полосу
// состояния, и внизу остаётся чёрная полоса. Окно там всегда во весь экран, поэтому высоту берём у экрана; кнопки внизу
// по-прежнему отступают на env(safe-area-inset-bottom). Вызывается из resize рендерера (js/render/renderer.js).
export function appH() {
  const de = document.documentElement; let h = 0;
  // правки 5: снимок с iPhone показал, что окно и правда короче экрана — растянутые до экрана слои обрезались снизу (кнопки, «×1»).
  // Слои больше не растягиваем: всё помещается в окно. Чёрную полосу убирает строка состояния «black» (index.html) — окно начинается под ней и идёт до низа
  de.classList.toggle('ios-pwa', !!h); if (h) de.style.setProperty('--app-h', h + 'px');
  return h;
}
// Яндекс Игры: полный экран — через ysdk.screen.fullscreen (Другие объекты и параметры SDK), а не напрямую
const yfs = () => { try { return window.__ysdk && window.__ysdk.screen && window.__ysdk.screen.fullscreen; } catch { return null; } };
function requestFs() {
  const y = yfs(); if (y && y.request) { try { const r = y.request(); if (r && r.catch) r.catch(() => { }); } catch { } return; }
  const d = document.documentElement, req = d.requestFullscreen || d.webkitRequestFullscreen;
  try { const r = req.call(d, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => { }); } catch (e) { }
}
let yAsked = false;
function goFullscreen() {
  if (yfs()) { if (yAsked || !coarse() || isFs()) return; yAsked = true; requestFs(); return; }   // Яндекс: один раз по первому касанию; вышел сам — не навязываем
  if (standalone() || !coarse() || isFs() || !canFs()) return;
  requestFs();
}

let installEv = null;
function hint(html) {
  const t = document.getElementById('title'); if (!t) return null;
  let h = document.getElementById('fsHint'); if (!h) { h = document.createElement('div'); h.id = 'fsHint'; t.appendChild(h); }
  h.innerHTML = html; return h;
}
function androidHint() {
  if (installEv) {
    const h = hint('Установите игру — она будет запускаться с иконки на весь экран, без строки браузера. ');
    if (!h) return; const b = document.createElement('button'); b.className = 'btn sm gold'; b.textContent = 'Установить';
    b.onclick = async () => { const e = installEv; installEv = null; try { e.prompt(); await e.userChoice; } catch { } h.remove(); };
    h.appendChild(b);
  } else hint('Игра разворачивается на весь экран при касании. Чтобы запускать с иконки: меню браузера <b>⋮</b> → <b>«Добавить на главный экран»</b>.');
}

// правки 3: на ПК кнопка «На весь экран» всегда на виду — рядом с «АВТО» (про F11 на титульном экране забывают, а в полном экране FPS ровнее)
function hudButton() {
  if (coarse() || standalone() || !canFs()) return;
  const menu = document.getElementById('menu'), auto = document.getElementById('btnAuto'); if (!menu || document.getElementById('btnFs')) return;
  const b = document.createElement('button'); b.id = 'btnFs'; b.className = 'mbtn';
  const upd = () => { const on = isFs(); b.textContent = on ? '⛶ Окно' : '⛶ Весь экран'; b.title = on ? 'Выйти из полного экрана (Esc)' : 'На весь экран — игра идёт плавнее (F11)'; b.classList.toggle('on', on); };
  b.onclick = e => { e.stopPropagation(); const y = yfs(); if (y && y.exit && isFs()) { try { const r = y.exit(); if (r && r.then) r.then(upd, upd); } catch { } return; } if (y && y.request) { requestFs(); setTimeout(upd, 400); return; } if (isFs()) { const x = document.exitFullscreen || document.webkitExitFullscreen; try { const r = x.call(document); if (r && r.catch) r.catch(() => { }); } catch { } } else requestFs(); };
  for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, upd);
  upd(); if (auto && auto.nextSibling) menu.insertBefore(b, auto.nextSibling); else menu.appendChild(b);
}
export function initFullscreen() {
  hudButton();
  addEventListener('pointerup', goFullscreen, { passive: true });
  addEventListener('touchend', goFullscreen, { passive: true });
  if (standalone()) return;
  if (framed()) return;   // внутри Яндекс Игр / VK полным экраном управляет площадка: подсказка «На экран „Домой“» там уводила бы из каталога (п. 8.4.4)
  if (iPhone()) { hint('Игра на весь экран, без строки браузера: <b>Поделиться</b> <span class="fs-ic">⬆︎</span> → <b>«На экран „Домой“»</b> и запускать с иконки.'); return; }
  if (android()) {
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; if (document.getElementById('title')) androidHint(); });
    addEventListener('appinstalled', () => { installEv = null; const h = document.getElementById('fsHint'); if (h) h.remove(); });
    androidHint();
  } else if (!coarse() && canFs()) {
    const h = hint('На весь экран: клавиша <b>F11</b> или ');
    if (!h) return; h.classList.add('pc'); const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = '⛶ На весь экран';
    b.onclick = () => { requestFs(); h.remove(); }; h.appendChild(b);
  }
}
