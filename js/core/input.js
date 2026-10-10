// Input: keyboard (PC), floating virtual joystick (touch), buttons are DOM (ui/hud.js).
import { screenDirToWorld } from './iso.js';

export const input = { mx: 0, my: 0, mag: 0, wx: 0, wy: 0, attackHeld: false, keys: new Set(), touch: false, onKey: null };
const J = { id: null, bx: 0, by: 0, x: 0, y: 0, R: 60 };
const Ms = { down: false, aim: false, x: 0, y: 0, t: 0 };   // mouse: LMB = attack toward cursor, RMB = run toward cursor
export const mouse = Ms;
let base, knob, zone;

export const tapAim = { t: 0, x: 0, y: 0 };
// правки мамы (М27): одной рукой в горизонтальном виде. Палец на любом месте экрана (не только слева):
// короткое касание — бежать в эту точку (или выбрать врага, если ткнули в него; game.js), повёл палец — джойстик с центром там, где коснулись.
// Пока джойстик уже держит другой палец, касание экрана, как раньше, — прицел/удар в точку (tapAim)
export const tapMove = { t: 0, x: 0, y: 0 };
const TP = { id: null, x: 0, y: 0, t: 0 }; const cvTouches = new Set();
export function initInput(joyZone, joyBase, joyKnob) {
  zone = joyZone; base = joyBase; knob = joyKnob;
  const cv = document.getElementById('game');
  const cvJoy = e => { J.id = e.pointerId; input.touch = true; try { cv.setPointerCapture(e.pointerId); } catch (er) { }
    J.bx = TP.x; J.by = TP.y; J.x = e.clientX; J.y = e.clientY; place(); base.classList.add('active'); TP.id = null; };
  cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; cvTouches.add(e.pointerId);
    if (cvTouches.size > 1) { TP.id = null; return; }   // второй палец — щипок (camzoom.js), не шаг
    if (J.id !== null) { tapAim.t = performance.now(); tapAim.x = e.clientX; tapAim.y = e.clientY; tapAim.held = e.pointerId; return; }
    TP.id = e.pointerId; TP.x = e.clientX; TP.y = e.clientY; TP.t = performance.now(); });
  cv.addEventListener('pointermove', e => {
    if (e.pointerId === tapAim.held) { tapAim.x = e.clientX; tapAim.y = e.clientY; return; }
    if (e.pointerId === TP.id && cvTouches.size < 2 && Math.hypot(e.clientX - TP.x, e.clientY - TP.y) > 14) cvJoy(e);
    else if (e.pointerId === J.id) { J.x = e.clientX; J.y = e.clientY; place(); }
  });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, e => { cvTouches.delete(e.pointerId);
    if (e.pointerId === tapAim.held) tapAim.held = null;
    if (e.pointerId === TP.id) { if (ev === 'pointerup' && performance.now() - TP.t < 450) { tapMove.t = performance.now(); tapMove.x = TP.x; tapMove.y = TP.y; } TP.id = null; }
    if (e.pointerId === J.id) release(); });
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    input.keys.add(e.code);
    if (e.code === 'Space') { input.attackHeld = true; e.preventDefault(); }
    if (input.onKey && !e.repeat) input.onKey(e.code, e);
  });
  addEventListener('keyup', e => { input.keys.delete(e.code); if (e.code === 'Space') input.attackHeld = false; });
  addEventListener('blur', releaseInput);
  const pd = e => {
    if (e.pointerType === 'mouse') { Ms.x = e.clientX; Ms.y = e.clientY; Ms.t = performance.now(); if (e.button === 2) Ms.down = true; else if (e.button === 0) Ms.aim = true; e.preventDefault(); return; }
    if (J.id !== null) return; input.touch = e.pointerType !== 'mouse' || input.touch;
    J.id = e.pointerId; zone.setPointerCapture(e.pointerId);
    const r = zone.getBoundingClientRect();
    J.bx = Math.min(Math.max(e.clientX, r.left + J.R + 8), r.right - J.R - 8); J.by = Math.min(Math.max(e.clientY, r.top + J.R + 8), r.bottom - J.R - 8);
    J.x = e.clientX; J.y = e.clientY; place(); base.classList.add('active'); e.preventDefault();
  };
  const pm = e => { if (e.pointerId !== J.id) return; J.x = e.clientX; J.y = e.clientY; place(); e.preventDefault(); };
  const pu = e => { if (e.pointerId !== J.id) return; release(); };
  zone.addEventListener('pointerdown', pd); zone.addEventListener('pointermove', pm);
  zone.addEventListener('pointerup', pu); zone.addEventListener('pointercancel', pu); zone.addEventListener('lostpointercapture', pu);
  requestAnimationFrame(resetBase);
}
export function resetBase() {
  const r = zone.getBoundingClientRect();
  J.bx = r.left + Math.min(110, r.width / 2); J.by = r.bottom - Math.min(110, r.height / 2); place(true);
}
function place(idle) {
  const R = J.R; let dx = J.x - J.bx, dy = J.y - J.by; const l = Math.hypot(dx, dy);
  if (idle) dx = dy = 0; else if (l > R) { dx = dx / l * R; dy = dy / l * R; }
  const zr = zone.getBoundingClientRect();
  base.style.transform = `translate(${J.bx - zr.left - 70}px, ${J.by - zr.top - 70}px)`;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  input.mx = dx / R; input.my = dy / R;
}
export const joyPointer = () => J.id;
export function releaseJoy() { TP.id = null; if (J.id === null) return; try { zone.releasePointerCapture(J.id); } catch (e) { } release(); }   // щипок двумя пальцами забирает палец у джойстика
// правки по скилам (С33): ушли со страницы (blur, скрытая вкладка, pagehide) — отпустить всё зажатое, иначе герой бежит/бьёт сам по возвращении
export function releaseInput() { input.keys.clear(); input.attackHeld = false; Ms.down = Ms.aim = false; tapAim.held = null; TP.id = null; cvTouches.clear(); if (J.id !== null) releaseJoy(); else if (zone) release(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseInput(); });
function release() { J.id = null; input.mx = input.my = 0; base.classList.remove('active'); resetBase(); }
addEventListener('resize', () => { if (zone && J.id === null) resetBase(); });

export function initMouse(canvas) {
  canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; Ms.x = e.clientX; Ms.y = e.clientY; Ms.t = performance.now(); if (e.button === 2) Ms.down = true; else if (e.button === 0) Ms.aim = true; });
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { Ms.x = e.clientX; Ms.y = e.clientY; Ms.t = performance.now(); } });
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse') { if (e.button === 2) Ms.down = false; if (e.button === 0) Ms.aim = false; } });
  addEventListener('blur', () => { Ms.down = false; Ms.aim = false; });
}
export function pollMove() {
  let x = input.mx, y = input.my;
  if (Ms.down && input.anchor) {
    const [ax, ay] = input.anchor(); const dx = Ms.x - ax, dy = Ms.y - (ay - 30), d = Math.hypot(dx, dy);
    if (d > 18) { const m = Math.min(1, Math.max(0.35, d / 170)); x = dx / d * m; y = dy / d * m; }
  }
  const k = input.keys;
  const kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  const ky = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
  if (kx || ky) { const l = Math.hypot(kx, ky); x = kx / l; y = ky / l; }
  const mag = Math.min(1, Math.hypot(x, y));
  input.mag = mag < 0.12 ? 0 : mag;   // мёртвая зона 12 %; плавный разгон шага у её края — в entities.js (С33)
  if (input.mag) { const [wx, wy] = screenDirToWorld(x, y); input.wx = wx; input.wy = wy; } else { input.wx = input.wy = 0; }
  return input;
}
