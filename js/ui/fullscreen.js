// Полный экран на телефоне (сборка 38).
// Android и iPad: браузер даёт Fullscreen API — включаем по первому касанию (без касания браузер запрещает).
// iPhone (Safari и браузеры на его движке) такого API для страницы не даёт: строку браузера и шторку
// убирает только запуск с экрана «Домой» — тогда игра открывается отдельным окном на весь экран (manifest: display fullscreen).
// На титульном экране iPhone один раз показываем, как это сделать.
const standalone = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
const coarse = () => matchMedia('(pointer: coarse)').matches;
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const canFs = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const iPhone = () => /iPhone|iPod/.test(navigator.userAgent);

function goFullscreen() {
  if (standalone() || !coarse() || isFs() || !canFs()) return;
  const d = document.documentElement, req = d.requestFullscreen || d.webkitRequestFullscreen;
  try { const r = req.call(d, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => { }); } catch (e) { }
}

export function initFullscreen() {
  addEventListener('pointerup', goFullscreen, { passive: true });
  addEventListener('touchend', goFullscreen, { passive: true });
  if (iPhone() && !standalone()) {
    const t = document.getElementById('title'); if (!t) return;
    const h = document.createElement('div'); h.id = 'fsHint';
    h.innerHTML = 'Игра на весь экран, без строки браузера: <b>Поделиться</b> <span class="fs-ic">⬆︎</span> → <b>«На экран „Домой“»</b> и запускать с иконки.';
    t.appendChild(h);
  }
}
