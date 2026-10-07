// Зум камеры игроком (сборка 45): щипок двумя пальцами по свободной части экрана (телефон, планшет),
// колесо мыши или щипок на тачпаде (ПК, Mac). Выбор хранится в сохранении: settings.camZoom — множитель дистанции.
// Стартовый масштаб каждой локации (G.zoomMul, CAMERA.zoomIn) не меняется, зум — поправка поверх него.
import { G, bus } from '../game/ctx.js';
import { clamp } from './util.js';
import { tapAim } from './input.js';

// 0,7 — на 30 % ближе (сборка 45: было 0,8 — пользователь попросил ещё на 10 %; снизу экрана телефона остаётся ≈5,3 м);
// 1,3 — на 30 % дальше
export const ZOOM = { min: 0.7, max: 1.3 };
export const zoomNow = () => { const s = G.profile && G.profile.settings; const z = s ? +s.camZoom : 1; return z ? clamp(z, ZOOM.min, ZOOM.max) : 1; };

let saveT = 0;
export function setZoom(z) {
  const s = G.profile && G.profile.settings; if (!s) return;
  z = Math.round(clamp(z, ZOOM.min, ZOOM.max) * 1000) / 1000; if (z === zoomNow()) return;
  s.camZoom = z; bus.emit('camZoom', z);
  clearTimeout(saveT); saveT = setTimeout(() => bus.emit('save'), 700);
}

export function initCamZoom(canvas) {
  // колесо мыши; щипок на тачпаде Mac приходит как колесо с ctrlKey
  // сборка 47: слушаем всё окно, а не только холст — левую нижнюю половину экрана закрывает зона джойстика (#joyZone),
  // и над ней колесо раньше не работало («то работает, то нет»). Над окнами и панелями с прокруткой колесо их и прокручивает
  addEventListener('wheel', e => {
    if (G.modalOpen || !G.player || !G.zoneReady) return;
    if (e.target.closest && e.target.closest('.npc-panel, .modal, .win, .tut, input, select, textarea')) return;
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    setZoom(zoomNow() * Math.exp(clamp(d, -120, 120) * (e.ctrlKey ? 0.01 : 0.0006)));
  }, { passive: false });
  // щипок: только два пальца, оба на самой картинке. Джойстик и кнопки — отдельные элементы поверх неё, их касания сюда не попадают
  const pts = new Map(); let base = 0, z0 = 1;
  const gap = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { base = gap(); z0 = zoomNow(); tapAim.held = null; }   // второй палец: это щипок, а не удар в точку касания
  });
  canvas.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY;
    if (pts.size !== 2 || base < 30 || G.modalOpen) return;
    tapAim.held = null;
    setZoom(z0 * base / Math.max(1, gap()));   // пальцы разводятся — камера ближе
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(ev, e => { pts.delete(e.pointerId); if (pts.size < 2) base = 0; });
}
