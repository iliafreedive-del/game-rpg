// Проходимость с учётом предметов (правки 2): сетка 0,5 м, круг героя r. Генераторы проверяют клетки, а сюда попадают
// ещё и коллайдеры (повозки, хижины, камни) — то, что после расстановки оказалось за ними, переносится к доступному месту.
export function reachGrid(map, sx, sy, r = 0.42) {
  const S = 0.5, nx = Math.ceil(map.w / S), ny = Math.ceil(map.h / S), ok = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {   // клетки (как GridMap.free, без предметов)
    const x = i * S + 0.25, y = j * S + 0.25; let f = 1;
    for (let ty = Math.floor(y - r); ty <= Math.floor(y + r) && f; ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) { if (!map.blocked(tx, ty)) continue; const cx = Math.max(tx, Math.min(x, tx + 1)), cy = Math.max(ty, Math.min(y, ty + 1)); if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) { f = 0; break; } }
    ok[j * nx + i] = f;
  }
  const stamp = (x0, y0, x1, y1, test) => { for (let j = Math.max(0, Math.floor((y0 - r) / S)); j <= Math.min(ny - 1, Math.floor((y1 + r) / S)); j++) for (let i = Math.max(0, Math.floor((x0 - r) / S)); i <= Math.min(nx - 1, Math.floor((x1 + r) / S)); i++) if (test(i * S + 0.25, j * S + 0.25)) ok[j * nx + i] = 0; };
  for (const c of map.circles) stamp(c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r, (x, y) => (x - c.x) ** 2 + (y - c.y) ** 2 < (r + c.r) ** 2);
  for (const b of map.rects) stamp(b.x0, b.y0, b.x1, b.y1, (x, y) => { const cx = Math.max(b.x0, Math.min(x, b.x1)), cy = Math.max(b.y0, Math.min(y, b.y1)); return (x - cx) ** 2 + (y - cy) ** 2 < r * r; });
  const seen = new Uint8Array(nx * ny), q = []; const s0 = Math.floor(sy / S) * nx + Math.floor(sx / S);
  if (s0 >= 0 && s0 < nx * ny) { seen[s0] = 1; q.push(s0); }
  for (let h = 0; h < q.length; h++) { const k = q[h], i = k % nx; for (const d of [1, -1, nx, -nx]) { const kk = k + d; if (kk < 0 || kk >= nx * ny || (d === 1 && i === nx - 1) || (d === -1 && i === 0) || !ok[kk] || seen[kk]) continue; seen[kk] = 1; q.push(kk); } }
  // ближайшая доступная точка в пределах maxR (null — нет)
  const nearest = (x, y, maxR = 6) => { let best = null, bd = maxR; const i0 = Math.floor(x / S), j0 = Math.floor(y / S), R = Math.ceil(maxR / S);
    for (let j = j0 - R; j <= j0 + R; j++) for (let i = i0 - R; i <= i0 + R; i++) { if (i < 0 || j < 0 || i >= nx || j >= ny || !seen[j * nx + i]) continue; const d = Math.hypot(i * S + 0.25 - x, j * S + 0.25 - y); if (d < bd) { bd = d; best = [i * S + 0.25, j * S + 0.25, d]; } } return best; };
  return { nearest };
}
// Сундуки, тайники, схроны и мобы, до которых не дойти, переносятся к ближайшему доступному месту (или убираются).
export function repairReach(zone, enemies, sx, sy) {
  const G0 = reachGrid(zone.map, sx, sy); let moved = 0;
  for (const it of zone.inter) {
    if (!['chest', 'stash', 'cache', 'wildnext', 'portal', 'sarc'].includes(it.type)) continue;
    const p = G0.nearest(it.x, it.y, 8); if (!p || p[2] <= (it.r || 1.4) * 0.8) continue;
    const ang = Math.atan2(p[1] - it.y, p[0] - it.x), k = p[2] - (it.r || 1.4) * 0.6;   // ближе к доступному месту, чтобы дотянуться
    it.x += Math.cos(ang) * k; it.y += Math.sin(ang) * k; if (it.draw) { it.draw.x = it.x; it.draw.y = it.y; } if (it.light) { it.light.x = it.x; it.light.y = it.y; } moved++;
  }
  for (const e of enemies) { const p = G0.nearest(e.x, e.y, 30); if (p && p[2] > 0.6) { e.x = e.hx = p[0]; e.y = e.hy = p[1]; moved++; } }
  return moved;
}
