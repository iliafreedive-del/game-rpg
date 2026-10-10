// Полный экран на телефоне (сборка 38).
// Android и iPad: браузер даёт Fullscreen API — включаем по первому касанию (без касания браузер запрещает).
// iPhone (Safari и браузеры на его движке) такого API для страницы не даёт: строку браузера и шторку
// убирает только запуск с экрана «Домой» — тогда игра открывается отдельным окном на весь экран (manifest: display fullscreen).
// Правки 2 (П40): подсказка на титульном экране — своя для каждого устройства:
//   iPhone — «Поделиться → На экран „Домой“»; Android — игра сама на весь экран по касанию, а чтобы запускать с иконки —
//   кнопка «Установить» (событие beforeinstallprompt, Chrome/Яндекс Браузер/Samsung) или меню ⋮ → «Добавить на главный экран»;
//   ПК — F11 или кнопка «На весь экран». Внутри Яндекс Игр / VK (страница в рамке) подсказки Android и ПК не показываем —
//   там полным экраном управляет сама площадка.
const standalone = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
const coarse = () => matchMedia('(pointer: coarse)').matches;
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const canFs = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const iPhone = () => /iPhone|iPod/.test(navigator.userAgent);
const android = () => /Android/i.test(navigator.userAgent);
const framed = () => { try { return window.top !== window.self; } catch { return true; } };

function requestFs() {
  const d = document.documentElement, req = d.requestFullscreen || d.webkitRequestFullscreen;
  try { const r = req.call(d, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => { }); } catch (e) { }
}
function goFullscreen() {
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

export function initFullscreen() {
  addEventListener('pointerup', goFullscreen, { passive: true });
  addEventListener('touchend', goFullscreen, { passive: true });
  if (standalone()) return;
  if (iPhone()) { hint('Игра на весь экран, без строки браузера: <b>Поделиться</b> <span class="fs-ic">⬆︎</span> → <b>«На экран „Домой“»</b> и запускать с иконки.'); return; }
  if (framed()) return;
  if (android()) {
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; if (document.getElementById('title')) androidHint(); });
    addEventListener('appinstalled', () => { installEv = null; const h = document.getElementById('fsHint'); if (h) h.remove(); });
    androidHint();
  } else if (!coarse() && canFs()) {
    const h = hint('На весь экран: клавиша <b>F11</b> или ');
    if (!h) return; const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = '⛶ На весь экран';
    b.onclick = () => { requestFs(); h.remove(); }; h.appendChild(b);
  }
}
