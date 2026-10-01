// Input: keyboard (PC), floating virtual joystick (touch), buttons are DOM (ui/hud.js).
import { screenDirToWorld } from './iso.js';

export const input = { mx: 0, my: 0, mag: 0, wx: 0, wy: 0, attackHeld: false, keys: new Set(), touch: false, onKey: null };
const J = { id: null, bx: 0, by: 0, x: 0, y: 0, R: 60 };
const Ms = { down: false, aim: false, x: 0, y: 0, t: 0 };   // mouse: LMB = attack toward cursor, RMB = run toward cursor
export const mouse = Ms;
let base, knob, zone;

export const tapAim = { t: 0, x: 0, y: 0 };
export function initInput(joyZone, joyBase, joyKnob) {
  zone = joyZone; base = joyBase; knob = joyKnob;
  // touches outside the joystick zone (and not on buttons) → strike / shoot toward the touch point
  const cv = document.getElementById('game');
  cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; tapAim.t = performance.now(); tapAim.x = e.clientX; tapAim.y = e.clientY; tapAim.held = e.pointerId; });
  cv.addEventListener('pointermove', e => { if (e.pointerId === tapAim.held) { tapAim.x = e.clientX; tapAim.y = e.clientY; } });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, e => { if (e.pointerId === tapAim.held) tapAim.held = null; });
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    input.keys.add(e.code);
    if (e.code === 'Space') { input.attackHeld = true; e.preventDefault(); }
    if (input.onKey && !e.repeat) input.onKey(e.code, e);
  });
  addEventListener('keyup', e => { input.keys.delete(e.code); if (e.code === 'Space') input.attackHeld = false; });
  addEventListener('blur', () => { input.keys.clear(); input.attackHeld = false; release(); });
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
  input.mag = mag < 0.12 ? 0 : mag;
  if (input.mag) { const [wx, wy] = screenDirToWorld(x, y); input.wx = wx; input.wy = wy; } else { input.wx = input.wy = 0; }
  return input;
}
