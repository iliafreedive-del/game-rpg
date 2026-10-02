// Isometric projection. World units = metres = tiles. 2:1 dimetric, matching the pre-rendered sprites.
export const TILE_W = 64, TILE_H = 32;        // CSS px at zoom 1
export const PX_PER_M = 45.2548;               // sprite pixels-per-metre at zoom 1 (tile diamond 64px)
export const Z_PX = 0.8660 * PX_PER_M;         // vertical px per metre of height (cos 30°)

export class Camera {
  constructor() { this.x = 0; this.y = 0; this.zoom = 1; this.w = 800; this.h = 450; this.shake = 0; this.sx = 0; this.sy = 0; this.proj = null; }   // proj: внешняя проекция (3D-рендерер подставляет свою, см. js/render3d)
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
  follow(tx, ty, dt, k = 8) {
    const t = 1 - Math.exp(-k * dt);
    this.x += (tx - this.x) * t; this.y += (ty - this.y) * t;
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt * 3); const m = this.shake * 8; this.sx = (Math.random() - .5) * m; this.sy = (Math.random() - .5) * m; }
    else { this.sx = this.sy = 0; }
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
