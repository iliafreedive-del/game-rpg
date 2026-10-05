// Выбор отрисовки. По умолчанию — 3D (js/render3d), где он уже умеет; остальное рисует прежний 2D-рендерер.
// Принудительно старая отрисовка: ?render=2d. Принудительно 3D с логом причин отката: ?render=3d.
// Пока перенос не закончен, 3D покрывает деревню и героя-воина; катакомбы, цитадель, глубины, лучник и маг идут в 2D.
import * as R2 from './renderer.js';
import { G, bus } from '../game/ctx.js';

export const loadFloor = R2.loadFloor, buildFloorCanvas = R2.buildFloorCanvas;
let saved = null; try { saved = localStorage.getItem('da_render'); } catch { }
const mode = new URLSearchParams(location.search).get('render') || saved;   // ?render=2d|3d, иначе выбор в настройках
let R3 = null, on3 = false;

export async function initRenderer(canvas) {
  const want3 = mode !== '2d';
  if (want3) {
    try { const m = await import('../render3d/renderer3d.js'); if (m.webglAvailable()) { R3 = m; } else console.warn('[render] WebGL недоступен — 2D'); }
    catch (e) { console.error('[render] 3D не загрузился, остаёмся на 2D', e); }
  }
  R2.initRenderer(canvas, { overlay: !!R3 });
  if (R3) { R3.init(); G.render3d = true; }
  // поворот экрана/изменение окна: 2D-рендерер сам слушает resize, но 3D-холст надо пересобрать тоже — иначе картинка растягивается
  const again = () => { if (R3 && G.cam) R3.resize(G.cam.w, G.cam.h); };
  addEventListener('resize', () => { again(); setTimeout(again, 120); });
  if (window.visualViewport) visualViewport.addEventListener('resize', again);
  addEventListener('orientationchange', () => { for (const t of [80, 300, 700, 1300]) setTimeout(again, t); });
}
// сборка 46: шторка «Загрузка…» на время смены зоны (появляется с задержкой — быстрые переходы её не показывают)
let veil = null;
bus.on('zoneLoading', () => { if (!G.zone) return; if (!veil) { veil = document.createElement('div'); veil.id = 'zoneVeil'; veil.innerHTML = '<span>Загрузка…</span>'; document.body.appendChild(veil); } veil.classList.add('on'); });
bus.on('zoneEntered', () => { if (veil) veil.classList.remove('on'); });
bus.on('camZoom', () => { if (!on3) R2.resize(); });   // 2D: масштаб пересчитывается при зуме игрока (3D сам плавно следует)
export function resize() {
  R2.resize();
  if (R3) R3.resize(G.cam.w, G.cam.h);
}
// сборка 46: собрать 3D-мир новой зоны и скомпилировать его шейдеры до показа (loadZone ждёт этого перед стартом зоны)
export function prepareRender() {
  const z = G.zone; if (!(R3 && z && G.player && R3.supports(z, G.profile))) return Promise.resolve();
  if (!on3) { on3 = true; R3.show(true); R2.clearOverlay(); R2.resize(); R3.resize(G.cam.w, G.cam.h); }
  return R3.prepare();
}
export function render() {
  const z = G.zone, use3 = !!(R3 && z && G.player && R3.supports(z, G.profile));
  if (use3 !== on3) {   // переключение 3D ⇄ 2D при смене зоны
    on3 = use3; R3.show(use3); if (!use3) R2.clearOverlay(); R2.resize();
    if (use3) R3.resize(G.cam.w, G.cam.h);
    if (mode === '3d') console.info('[render] ' + (use3 ? '3D' : '2D (зона/класс пока без 3D)') + ': ' + (z && z.id));
  }
  if (use3) { R3.render(); R2.renderOverlay(); } else R2.render();
}
