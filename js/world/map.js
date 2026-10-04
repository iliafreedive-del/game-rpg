// World grid: walkability, circle colliders, line of sight, BFS flow field toward the hero.
export class GridMap {
  constructor(json) {
    this.w = json.w; this.h = json.h; this.rows = json.rows;
    this.solid = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.rows[y][x];
      this.solid[y * this.w + x] = (c === '#' && !json.walkableHash) || c === 'x' || c === '~' || c === 'D' || c === 'S' || c === 'G' || (json.village && (c === 'F' || c === 'V' || c === 'K' || c === 'n' || c === ';')) ? 1 : 0;   // деревня: поля, луг и дорога за ручьём — непроходимы, мост 'b' — проходим
    }
    this.circles = [];           // static circle colliders {x,y,r}
    this.rects = [];             // static box colliders {x0,y0,x1,y1}
    this.flow = new Int16Array(this.w * this.h); this.flowAt = -1e9;
  }
  ch(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? '#' : this.rows[y][x]; }
  blocked(tx, ty) { return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h || this.solid[ty * this.w + tx] === 1; }
  setSolid(tx, ty, v) { this.solid[ty * this.w + tx] = v ? 1 : 0; this.flowAt = -1e9; this.ver = (this.ver || 0) + 1; }
  // Can a circle of radius r stand at (x,y)?
  free(x, y, r) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!this.blocked(tx, ty)) continue;
      const cx = Math.max(tx, Math.min(x, tx + 1)), cy = Math.max(ty, Math.min(y, ty + 1));
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return false;
    }
    for (const c of this.circles) if ((x - c.x) ** 2 + (y - c.y) ** 2 < (r + c.r) ** 2) return false;
    for (const b of this.rects) {
      const cx = Math.max(b.x0, Math.min(x, b.x1)), cy = Math.max(b.y0, Math.min(y, b.y1));
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return false;
    }
    return true;
  }
  // Move with axis sliding. Returns actual [x,y].
  move(x, y, dx, dy, r) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.2));
    const sx = dx / steps, sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (this.free(x + sx, y + sy, r)) { x += sx; y += sy; continue; }
      if (sx && this.free(x + sx, y, r)) x += sx;
      else if (sy && this.free(x, y + sy, r)) y += sy;
      else {  // push out of circle colliders along tangent
        let moved = false;
        for (const c of this.circles) {
          const d = Math.hypot(x - c.x, y - c.y);
          if (d < r + c.r + 0.25) { const nx = (x - c.x) / d, ny = (y - c.y) / d; const t = sx * -ny + sy * nx; const tx = -ny * t, ty = nx * t; if (this.free(x + tx, y + ty, r)) { x += tx; y += ty; moved = true; } break; }
        }
        if (!moved) break;
      }
    }
    return [x, y];
  }
  los(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 0.25);
    for (let i = 1; i < n; i++) { const t = i / n; if (this.blocked(Math.floor(ax + (bx - ax) * t), Math.floor(ay + (by - ay) * t))) return false; }
    return true;
  }
  // BFS distance field from target tile (limited radius). Enemies descend it.
  buildFlow(tx, ty, now) {
    if (now - this.flowAt < 0.25 && this.flowT === tx + ty * this.w) return;
    this.flowAt = now; this.flowT = tx + ty * this.w;
    const f = this.flow; f.fill(-1);
    if (this.blocked(tx, ty)) return;
    const q = new Int32Array(this.w * this.h); let h = 0, t = 0;
    q[t++] = ty * this.w + tx; f[ty * this.w + tx] = 0;
    while (h < t) {
      const i = q[h++]; const x = i % this.w, y = (i / this.w) | 0, d = f[i];
      if (d > 90) continue;
      for (let k = 0; k < 8; k++) {
        const nx = x + DX[k], ny = y + DY[k];
        if (this.blocked(nx, ny)) continue;
        if (k >= 4 && (this.blocked(x + DX[k], y) || this.blocked(x, y + DY[k]))) continue;
        const j = ny * this.w + nx; if (f[j] !== -1) continue;
        f[j] = d + 1; q[t++] = j;
      }
    }
  }
  flowDir(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y), f = this.flow, d0 = f[ty * this.w + tx];
    if (d0 < 0) return null;
    let best = d0, bx = 0, by = 0;
    for (let k = 0; k < 8; k++) {
      const nx = tx + DX[k], ny = ty + DY[k]; if (this.blocked(nx, ny)) continue;
      if (k >= 4 && (this.blocked(tx + DX[k], ty) || this.blocked(tx, ty + DY[k]))) continue;
      const d = f[ny * this.w + nx]; if (d >= 0 && d < best) { best = d; bx = nx + 0.5; by = ny + 0.5; }
    }
    if (best === d0) return null;
    const vx = bx - x, vy = by - y, l = Math.hypot(vx, vy) || 1; return [vx / l, vy / l];
  }
  // tiles covered by props (pillars, crates, sarcophagi…) — used by the auto-pilot path so it walks around them
  obstacle(tx, ty) {
    if (!this.obs || this.obsVer !== this.circles.length + this.rects.length * 1000) {
      this.obsVer = this.circles.length + this.rects.length * 1000; this.obs = new Uint8Array(this.w * this.h);
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const cx = x + 0.5, cy = y + 0.5;
        if (this.circles.some(c => (cx - c.x) ** 2 + (cy - c.y) ** 2 < (c.r + 0.3) ** 2) || this.rects.some(b => cx > b.x0 - 0.3 && cx < b.x1 + 0.3 && cy > b.y0 - 0.3 && cy < b.y1 + 0.3)) this.obs[y * this.w + x] = 1;
      }
    }
    return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h || this.obs[ty * this.w + tx] === 1;
  }
  gblocked(x, y) { return this.blocked(x, y) || this.obstacle(x, y); }
  // Separate BFS field from a guide target (quest arrow follows corridors, not straight lines)
  guideDir(x, y, gx, gy) { return this.fieldDir(this.gS || (this.gS = {}), x, y, gx, gy); }
  // поле для мобов: обходит пропсы (сундуки, саркофаги, деревья, камни), а не только стены; своё, чтобы не мешать стрелке квеста
  chaseDir(x, y, gx, gy) { return this.fieldDir(this.cS || (this.cS = {}), x, y, gx, gy); }
  fieldDir(S, x, y, gx, gy) {
    const tx = Math.floor(gx), ty = Math.floor(gy), key = tx + ty * this.w;
    if (!S.f) S.f = new Int16Array(this.w * this.h);
    if (S.key !== key || S.ver !== this.ver || S.obsVer !== this.obsVer) {
      this.obstacle(0, 0); S.key = key; S.ver = this.ver; S.obsVer = this.obsVer; const f = S.f; f.fill(-1);
      const q = new Int32Array(this.w * this.h); let h = 0, t = 0;
      // seed: target tile and its free neighbours (targets often stand on blocked tiles like doors)
      for (let k = -1; k < 8; k++) { const nx = k < 0 ? tx : tx + DX[k], ny = k < 0 ? ty : ty + DY[k]; if (!this.gblocked(nx, ny) && f[ny * this.w + nx] < 0) { f[ny * this.w + nx] = 0; q[t++] = ny * this.w + nx; } }
      while (h < t) { const i = q[h++]; const X = i % this.w, Y = (i / this.w) | 0, d = f[i];
        for (let k = 0; k < 8; k++) { const nx = X + DX[k], ny = Y + DY[k]; if (this.gblocked(nx, ny)) continue; if (k >= 4 && (this.gblocked(X + DX[k], Y) || this.gblocked(X, Y + DY[k]))) continue; const j = ny * this.w + nx; if (f[j] !== -1) continue; f[j] = d + 1; q[t++] = j; } }
    }
    const f = S.f, cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return null; let d0 = f[cy * this.w + cx];
    if (d0 === 0) return null;
    if (d0 < 0) {   // standing next to a prop (tile marked as obstacle): step toward the nearest reachable tile
      let bd = 1e9, bx = 0, by = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const d = f[ny * this.w + nx]; if (d >= 0 && d + Math.hypot(dx, dy) < bd && !this.blocked(nx, ny)) { bd = d + Math.hypot(dx, dy); bx = nx + 0.5; by = ny + 0.5; } }
      if (bd === 1e9) return null; const vx = bx - x, vy = by - y, l = Math.hypot(vx, vy) || 1; return [vx / l, vy / l];
    }
    let best = d0, bx = 0, by = 0;
    for (let k = 0; k < 8; k++) { const nx = cx + DX[k], ny = cy + DY[k]; if (this.gblocked(nx, ny)) continue; if (k >= 4 && (this.gblocked(cx + DX[k], cy) || this.gblocked(cx, cy + DY[k]))) continue; const d = f[ny * this.w + nx]; if (d >= 0 && d < best) { best = d; bx = nx + 0.5; by = ny + 0.5; } }
    if (best === d0) return null; const vx = bx - x, vy = by - y, l = Math.hypot(vx, vy) || 1; return [vx / l, vy / l];
  }
  // свободен ли прямой путь для круга радиуса r (стены и пропсы), шаг 0,3
  clearPath(ax, ay, bx, by, r) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 0.3);
    for (let i = 1; i < n; i++) { const t = i / n; if (!this.free(ax + (bx - ax) * t, ay + (by - ay) * t, r)) return false; }
    return true;
  }
  nearestFree(x, y, r) {
    if (this.free(x, y, r)) return [x, y];
    for (let rad = 0.25; rad < 7; rad += 0.25) for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (this.free(px, py, r)) return [px, py]; }
    return [x, y];
  }
  dist(x, y) { const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return -1; return this.flow[ty * this.w + tx]; }
}
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
