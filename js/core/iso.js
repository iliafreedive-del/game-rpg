// Isometric projection. World units = metres = tiles. 2:1 dimetric, matching the pre-rendered sprites.
export const TILE_W = 64, TILE_H = 32;        // CSS px at zoom 1
export const PX_PER_M = 45.2548;               // sprite pixels-per-metre at zoom 1 (tile diamond 64px)
export const Z_PX = 0.8660 * PX_PER_M;         // vertical px per metre of height (cos 30°)

export class Camera {
  constructor() { this.x = 0; this.y = 0; this.zoom = 1; this.w = 800; this.h = 450; this.trauma = 0; this.sx = 0; this.sy = 0; this.proj = null; }   // proj: внешняя проекция (3D-рендерер подставляет свою, см. js/render3d)
  // world -> screen (CSS px)
  toScreen(x, y, z = 0) {
    if (this.proj) return this.proj.toScreen(x, y, z);
    const s = this.zoom;
    return [((x - y) - (this.x - this.y)) * 32 * s + this.w / 2 + this.sx,
            ((x + y) - (this.x + this.y)) * 16 * s + this.h / 2 - z * Z_PX * s + this.sy];
  }
  toWorld(sx, sy) {
    if (this.proj) return this.proj.toWorld(sx, sy);
    const s = this.zoom;
    const a = (sx - this.w / 2 - this.sx) / (32 * s), b = (sy - this.h / 2 - this.sy) / (16 * s);
    const cx = this.x - this.y, cy = this.x + this.y;
    const X = a + cx, Y = b + cy;   // X = x - y, Y = x + y
    return [(X + Y) / 2, (Y - X) / 2];
  }
  // С23: тряска — «травма» 0..1. Удары складываются (с потолком), а не перезаписывают друг друга; смещение = травма² × плавный шум
  // (сумма синусов, не случайный скачок каждый кадр — тот «дребезжал»). Старые вызовы `cam.shake = x` и `Math.max(cam.shake, x)`
  // тоже добавляют травму (сеттер). Ступени: мелкий удар 0.12–0.2, тяжёлый 0.3–0.45, событие 0.5–0.7. off — настройка «Тряска камеры: выкл»
  get shake() { return this.trauma || 0; }
  set shake(v) { this.kick(v); }
  kick(v) { const t = this.trauma || 0; if (v > 0) this.trauma = Math.min(1, t + v * (1 - t * 0.5)); }
  follow(tx, ty, dt, k = 8) {
    const t = 1 - Math.exp(-k * dt);
    this.x += (tx - this.x) * t; this.y += (ty - this.y) * t;
    const tr = this.trauma || 0;
    if (tr > 0 && !this.off) {
      this.trauma = Math.max(0, tr - dt * 1.6); this.nt = (this.nt || 0) + dt * 32;
      const m = 14 * tr * tr, n = this.nt;
      this.sx = m * (Math.sin(n * 1.7) * 0.6 + Math.sin(n * 3.1 + 1.3) * 0.4); this.sy = m * 0.7 * (Math.sin(n * 2.3 + 0.7) * 0.6 + Math.sin(n * 3.7) * 0.4);
    } else { this.trauma = 0; this.sx = this.sy = 0; }
  }
}
// screen-space direction -> world direction (for joystick / keyboard)
export function screenDirToWorld(dx, dy) {
  // screen right = (x - y), screen down = (x + y)/2  → invert with y scaled 2x for 2:1
  const X = dx, Y = dy * 2;
  const wx = (X + Y) / 2, wy = (Y - X) / 2;
  const l = Math.hypot(wx, wy) || 1; return [wx / l, wy / l];
}
// 8 directions in world angle steps of 45°, dir 0 = +x
export const dirOf = (vx, vy) => ((Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) % 8) + 8) % 8;
export const dirVec = d => [Math.cos(d * Math.PI / 4), Math.sin(d * Math.PI / 4)];
