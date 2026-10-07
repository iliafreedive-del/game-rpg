// Зум камеры игроком (сборка 45): щипок двумя пальцами по свободной части экрана (телефон, планшет),
// колесо мыши или щипок на тачпаде (ПК, Mac). Выбор хранится в сохранении: settings.camZoom — множитель дистанции.
// Стартовый масштаб каждой локации (G.zoomMul, CAMERA.zoomIn) не меняется, зум — поправка поверх него.
import { G, bus } from '../game/ctx.js';
import { clamp } from './util.js';
import { tapAim, joyPointer, releaseJoy } from './input.js';

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
  // щипок двумя пальцами (сборка 47): пальцы считаются и на картинке, и на зоне джойстика — в портрете она закрывает
  // почти всю левую часть экрана, и раньше палец, попавший на неё, включал джойстик, а щипок не работал.
  // Щипок начинается, когда расстояние между пальцами изменилось на 28+ px и хотя бы один палец, кроме джойстика, сдвинулся:
  // так бег джойстиком + касание экрана для удара в точку не превращаются в зум. С началом щипка джойстик отпускается.
  const pts = new Map(); let base = 0, z0 = 1, on = false;
  const gap = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const ours = t => t && t.closest && t.closest('#game, #game3d, #joyZone');
  const joyId = () => joyPointer();
  addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || !ours(e.target)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    if (pts.size === 2) { base = gap(); z0 = zoomNow(); on = false; }
  }, true);
  addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY;
    if (pts.size !== 2 || base < 30 || G.modalOpen) return;
    const g = gap();
    if (!on) {
      const moved = [...pts.entries()].some(([id, q]) => id !== joyId() && Math.hypot(q.x - q.sx, q.y - q.sy) > 12);
      if (!moved || Math.abs(g - base) < 28) return;
      on = true; base = g; z0 = zoomNow(); releaseJoy();
    }
    tapAim.held = null;
    setZoom(z0 * base / Math.max(1, g));   // пальцы разводятся — камера ближе
  }, true);
  for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => { pts.delete(e.pointerId); if (pts.size < 2) { base = 0; on = false; } }, true);
}
