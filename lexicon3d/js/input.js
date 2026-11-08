// Input as in Umbrahold (core/input.js): a floating joystick that appears where the finger lands and follows it
// (anywhere on the screen), a short tap = "go to what's under the finger", WASD / arrows, mouse: hold the left
// button = run toward the cursor, click = go to the object under the cursor. Dead zone 12 %, past 55 % — run.
import { screenDir } from './gfx.js';

export const input = { mx: 0, my: 0, mag: 0, wx: 0, wy: 0, keys: new Set(), anchor: null, onTap: null, onKey: null, lock: () => false };
const J = { id: null, bx: 0, by: 0, x: 0, y: 0, R: 60 };
const TP = { id: null, x: 0, y: 0, t: 0 };
const Ms = { down: false, run: false, x: 0, y: 0, sx: 0, sy: 0, t: 0 };
const touches = new Set();
let base, knob;

export function initInput(cv, joyBase, joyKnob) {
  base = joyBase; knob = joyKnob;
  const joyAt = (e, x, y) => { J.id = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) { } J.bx = x; J.by = y; J.x = e.clientX; J.y = e.clientY; place(); base.classList.add('active'); TP.id = null; };
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') { if (e.button !== 0) return; Ms.down = true; Ms.run = false; Ms.x = Ms.sx = e.clientX; Ms.y = Ms.sy = e.clientY; Ms.t = performance.now(); return; }
    touches.add(e.pointerId); if (touches.size > 1) { TP.id = null; return; }   // second finger — pinch zoom (camzoom)
    if (J.id !== null) return;
    TP.id = e.pointerId; TP.x = e.clientX; TP.y = e.clientY; TP.t = performance.now();
  });
  addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { Ms.x = e.clientX; Ms.y = e.clientY; if (Ms.down && !Ms.run && (Math.hypot(Ms.x - Ms.sx, Ms.y - Ms.sy) > 10 || performance.now() - Ms.t > 260)) Ms.run = true; return; }
    if (e.pointerId === TP.id && touches.size < 2 && Math.hypot(e.clientX - TP.x, e.clientY - TP.y) > 14) joyAt(e, TP.x, TP.y);
    else if (e.pointerId === J.id) { J.x = e.clientX; J.y = e.clientY; place(); }
  });
  for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => {
    if (e.pointerType === 'mouse') { if (Ms.down && !Ms.run && ev === 'pointerup' && e.target === cv && input.onTap) input.onTap(e.clientX, e.clientY); Ms.down = Ms.run = false; return; }
    touches.delete(e.pointerId);
    if (e.pointerId === TP.id) { if (ev === 'pointerup' && performance.now() - TP.t < 450 && input.onTap) input.onTap(TP.x, TP.y); TP.id = null; }
    if (e.pointerId === J.id) release();
  });
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    input.keys.add(e.code); if (input.onKey && !e.repeat) input.onKey(e.code, e);
  });
  addEventListener('keyup', e => input.keys.delete(e.code));
  addEventListener('blur', releaseInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseInput(); });
}
function place() {
  const R = J.R; let dx = J.x - J.bx, dy = J.y - J.by; const l = Math.hypot(dx, dy);
  if (l > R) { dx = dx / l * R; dy = dy / l * R; }
  base.style.transform = `translate(${J.bx - 70}px, ${J.by - 70}px)`; knob.style.transform = `translate(${dx}px, ${dy}px)`;
  input.mx = dx / R; input.my = dy / R;
}
export const joyPointer = () => J.id;
export function releaseJoy() { TP.id = null; if (J.id !== null) release(); }
function release() { J.id = null; input.mx = input.my = 0; base.classList.remove('active'); }
export function releaseInput() { input.keys.clear(); Ms.down = Ms.run = false; TP.id = null; touches.clear(); releaseJoy(); }

export function pollMove() {
  let x = input.mx, y = input.my;
  if (Ms.run && input.anchor) {
    const [ax, ay] = input.anchor(); const dx = Ms.x - ax, dy = Ms.y - ay, d = Math.hypot(dx, dy);
    if (d > 18) { const m = Math.min(1, Math.max(0.35, d / 170)); x = dx / d * m; y = dy / d * m; } else x = y = 0;
  }
  const k = input.keys;
  const kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  const ky = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
  if (kx || ky) { const l = Math.hypot(kx, ky); x = kx / l; y = ky / l; }
  const mag = Math.min(1, Math.hypot(x, y));
  input.mag = mag < 0.12 ? 0 : mag;
  if (input.mag) { const [wx, wy] = screenDir(x, y); input.wx = wx; input.wy = wy; } else input.wx = input.wy = 0;
  return input;
}
