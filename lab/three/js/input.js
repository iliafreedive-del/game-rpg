// Floating joystick (left half of the screen) + attack button + WASD/arrows/Space.
export class Input {
  constructor(joyBase, joyKnob, atkBtn) {
    this.move = { x: 0, y: 0 };   // screen space, y down
    this.attackHeld = false; this.keys = new Set();
    this.joy = null; this.base = joyBase; this.knob = joyKnob;
    addEventListener('keydown', e => { this.keys.add(e.code); if (e.code === 'Space') { this.attackHeld = true; e.preventDefault(); } });
    addEventListener('keyup', e => { this.keys.delete(e.code); if (e.code === 'Space') this.attackHeld = false; });
    addEventListener('blur', () => { this.keys.clear(); this.attackHeld = false; });
    const zone = document.getElementById('joyZone');
    zone.addEventListener('pointerdown', e => {
      if (this.joy) return;
      this.joy = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
      zone.setPointerCapture(e.pointerId);
      this.base.style.left = e.clientX + 'px'; this.base.style.top = e.clientY + 'px'; this.base.classList.add('on');
      this.knob.style.transform = 'translate(-50%,-50%)';
    });
    zone.addEventListener('pointermove', e => {
      if (!this.joy || e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.x, dy = e.clientY - this.joy.y; const l = Math.hypot(dx, dy), R = 56;
      if (l > R) { dx *= R / l; dy *= R / l; }
      this.joy.dx = dx / R; this.joy.dy = dy / R;
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const end = e => { if (this.joy && e.pointerId === this.joy.id) { this.joy = null; this.base.classList.remove('on'); } };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    atkBtn.addEventListener('pointerdown', e => { this.attackHeld = true; atkBtn.setPointerCapture(e.pointerId); atkBtn.classList.add('on'); });
    const up = () => { this.attackHeld = false; atkBtn.classList.remove('on'); };
    atkBtn.addEventListener('pointerup', up); atkBtn.addEventListener('pointercancel', up);
  }
  read() {
    let x = 0, y = 0; const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (this.joy) { x += this.joy.dx; y += this.joy.dy; }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    if (l < 0.12) { x = 0; y = 0; }
    this.move.x = x; this.move.y = y;
    return this.move;
  }
}
