// World: zones (static decor + story objects), collision grid, hero movement, tap-to-walk, labels overlay.
import { GridMap } from './engine/map.js';
import * as X from './gfx.js';
import { Char } from './actors.js';
import { pollMove } from './input.js';
const { THREE, V } = X;

export const G = { zone: null, time: 0, player: null, path: null, target: null, lock: 0, fx: [], near: null, torch: false, chars: new Map() };

// ---------------------------------------------------------------- characters cache (one Char per id)
export function charFor(id, model, o = {}) {
  let c = G.chars.get(id);
  if (!c) { c = new Char(model, o); G.chars.set(id, c); }
  return c;
}

// ---------------------------------------------------------------- zone
const statics = new Map();   // zone id -> {group, colliders, rows}
export class Zone {
  constructor(id, def, objs) {
    this.id = id; this.def = def; this.dark = def.mood === 'night';
    let st = statics.get(id);
    if (!st) { st = def.build(); statics.set(id, st); }
    this.st = st;
    const rows = st.rows || borderRows(def.w, def.h);
    this.map = new GridMap({ w: def.w, h: def.h, rows });
    for (const c of st.circles || []) this.map.circles.push(c);
    for (const r of st.rects || []) this.map.rects.push(r);
    this.group = new THREE.Group(); this.inter = []; this.actors = []; this.flames = [];
    for (const o of objs) this.place(o);
    st.group.traverse(o => { if (o.userData.flame) this.flames.push(o); });
    this.group.traverse(o => { if (o.userData.flame) this.flames.push(o); });
  }
  place(o) {
    let obj = null;
    if (o.mk) { obj = o.mk(); if (obj) { obj.position.x = o.x; obj.position.z = o.y; if (o.rot != null) obj.rotation.y = o.rot; this.group.add(obj); } }
    if (o.r) this.map.circles.push({ x: o.x, y: o.y, r: o.r });
    if (o.box) this.map.rects.push({ x0: o.x - o.box[0], y0: o.y - o.box[1], x1: o.x + o.box[0], y1: o.y + o.box[1] });
    if (o.tiles) for (const [x, y] of o.tiles) this.map.setSolid(x, y, o.solid ? 1 : 0);
    if (o.actor) {
      const a = o.actor; const c = charFor(o.id, a.model, a);
      if (c) {
        c.root.position.set(o.x, 0, o.y); c.shadow.position.set(o.x, 0.03, o.y); c.home = a.dir || 0; c.face(c.home, true); c.state = 'idle';
        c.label = a.name; c.marker = a.marker; c.plateH = a.plateH || c.height + 0.45;
        c.attach(this.group); this.actors.push(c); o.actorRef = c;
        if (!a.ghost) this.map.circles.push({ x: o.x, y: o.y, r: 0.4 });
      }
    }
    if (o.use) this.inter.push({ ...o, obj, r: o.ir || 1.9 });
  }
  attach() { V.scene.add(this.st.group); V.scene.add(this.group); }
  detach() { V.scene.remove(this.st.group); V.scene.remove(this.group); for (const a of this.actors) if (a.root.parent === this.group) a.detach(); }
}
function borderRows(w, h) {
  const rows = [];
  for (let y = 0; y < h; y++) { let r = ''; for (let x = 0; x < w; x++) r += (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) ? 'x' : '.'; rows.push(r); }
  return rows;
}

// ---------------------------------------------------------------- hero
export function makePlayer(x, y) {
  const c = charFor('hero', 'archer_raven', { turnRate: 34 });
  return { x, y, r: 0.32, char: c, moving: false, face: 0, speed: 0 };
}
export function updatePlayer(dt) {
  const P = G.player, Z = G.zone; if (!P || !Z) return;
  const inp = pollMove();
  let vx = 0, vy = 0, mag = 0;
  if (!G.lock && inp.mag) { vx = inp.wx; vy = inp.wy; mag = inp.mag; G.path = null; G.target = null; }
  else if (G.path && !G.lock) {
    const wp = G.path[0];
    if (wp) { const dx = wp[0] - P.x, dy = wp[1] - P.y, d = Math.hypot(dx, dy); if (d < 0.2) G.path.shift(); else { vx = dx / d; vy = dy / d; mag = 0.8; } }
    if (!G.path.length) G.path = null;
  }
  if (mag) {
    // Umbrahold (game/entities.js): past 55 % of the stick — run 5.4 m/s, otherwise walk 3.2 m/s with a soft start at the dead zone
    const sp = mag > 0.55 ? 5.4 : 3.2 * Math.min(1, 0.35 + (mag - 0.12) * 3.6);
    const [nx, ny] = Z.map.move(P.x, P.y, vx * sp * dt, vy * sp * dt, P.r);
    const moved = Math.hypot(nx - P.x, ny - P.y);
    if (moved < 0.002 * sp && G.path) { G.stuck = (G.stuck || 0) + dt; if (G.stuck > 0.5) { G.path = null; G.stuck = 0; } } else G.stuck = 0;
    P.x = nx; P.y = ny; P.face = Math.atan2(vx, vy);
  }
  // speed from the actual displacement with walk/stand hysteresis, like renderer3d measure()
  const raw = Math.hypot(P.x - (P.px ?? P.x), P.y - (P.py ?? P.y)) / Math.max(dt, 1e-3); P.px = P.x; P.py = P.y;
  P.speed += (Math.min(raw, 12) - P.speed) * Math.min(1, dt * 12); P.moving = P.speed > (P.moving ? 0.35 : 0.8);
  const c = P.char; if (c) { c.state = P.moving ? 'walk' : 'idle'; c.root.position.set(P.x, 0, P.y); c.face(P.face); c.update(dt, P.moving ? P.speed : 0); }
}
export function updateActors(dt) {
  for (const a of G.zone.actors) { if (a.wander) wander(a, dt); a.update(dt, a.wspeed || 0); }
  for (const an of G.zone.st.animals || []) wanderAnimal(an, dt);
  // flames flicker; nearest ones get the shared point lights
  for (const f of G.zone.flames) { const k = 1 + Math.sin(G.time * 13 + f.id) * 0.06 + Math.sin(G.time * 7.7 + f.id * 2) * 0.05; f.scale.set(1, k, 1); }
}
function wanderAnimal(an, dt) {
  const r = an.obj.root;
  if (!an.goal || an.wait > 0) { an.wait = (an.wait || 0) - dt; if (an.wait <= 0 && !an.goal) { const a = Math.random() * 6.28, d = 1 + Math.random() * an.range; an.goal = [an.home[0] + Math.cos(a) * d, an.home[1] + Math.sin(a) * d]; } an.obj.update(dt, false); return; }
  const dx = an.goal[0] - r.position.x, dz = an.goal[1] - r.position.z, d = Math.hypot(dx, dz);
  if (d < 0.15 || !G.zone.map.free(r.position.x + dx / d * 0.3, r.position.z + dz / d * 0.3, 0.2)) { an.goal = null; an.wait = 1 + Math.random() * 4; an.obj.update(dt, false); return; }
  const sp = an.speed * dt; r.position.x += dx / d * sp; r.position.z += dz / d * sp; r.rotation.y = Math.atan2(dx, dz) + (an.yaw || 0);
  an.obj.update(dt, true);
}
function wander(a, dt) {
  const r = a.root, w = a.wander;
  if (!w.goal) { w.wait -= dt; a.state = 'idle'; a.wspeed = 0; if (w.wait <= 0) { const ang = Math.random() * 6.28, d = Math.random() * w.range; w.goal = [w.home[0] + Math.cos(ang) * d, w.home[1] + Math.sin(ang) * d]; } return; }
  const dx = w.goal[0] - r.position.x, dz = w.goal[1] - r.position.z, d = Math.hypot(dx, dz);
  if (d < 0.2) { w.goal = null; w.wait = 2 + Math.random() * 5; return; }
  const sp = 1.2 * dt; r.position.x += dx / d * sp; r.position.z += dz / d * sp; a.face(Math.atan2(dx, dz)); a.state = 'walk'; a.wspeed = 1.2;
}

// ---------------------------------------------------------------- A* pathfinding (tiles), smoothing
export function findPath(tx, ty) {
  const m = G.zone.map, P = G.player;
  const W = m.w, H = m.h, sx = Math.floor(P.x), sy = Math.floor(P.y);
  let gx = Math.floor(tx), gy = Math.floor(ty);
  const bad = (x, y) => m.gblocked(x, y);
  if (bad(gx, gy)) {
    let best = null, bd = 1e9;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = gx + dx, y = gy + dy; if (x < 0 || y < 0 || x >= W || y >= H || bad(x, y)) continue; const d = Math.hypot(dx, dy) + Math.hypot(x - sx, y - sy) * 0.02; if (d < bd) { bd = d; best = [x, y]; } }
    if (!best) return null; [gx, gy] = best;
  }
  const prev = new Int32Array(W * H).fill(-1), dist = new Float32Array(W * H).fill(1e9);
  const open = [[0, sx, sy]]; dist[sy * W + sx] = 0; prev[sy * W + sx] = sy * W + sx;
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
  let found = false, it = 0;
  while (open.length && it++ < 9000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, x, y] = open.splice(bi, 1)[0];
    if (x === gx && y === gy) { found = true; break; }
    for (let k = 0; k < 8; k++) {
      const nx = x + DX[k], ny = y + DY[k]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const st = x === sx && y === sy, B = st ? (a, b) => m.blocked(a, b) : bad;
      if (B(nx, ny)) continue;
      if (k >= 4 && (B(x + DX[k], y) || B(x, y + DY[k]))) continue;
      const nd = dist[y * W + x] + (k >= 4 ? 1.414 : 1);
      if (nd < dist[ny * W + nx]) { dist[ny * W + nx] = nd; prev[ny * W + nx] = y * W + x; open.push([nd + Math.hypot(gx - nx, gy - ny), nx, ny]); }
    }
  }
  if (!found) return null;
  const pts = []; let c = gy * W + gx;
  while (c !== sy * W + sx) { pts.push([(c % W) + 0.5, Math.floor(c / W) + 0.5]); c = prev[c]; if (c < 0) return null; }
  pts.reverse();
  if (pts.length && m.free(tx, ty, P.r) && Math.floor(tx) === gx && Math.floor(ty) === gy) pts[pts.length - 1] = [tx, ty];
  const out = []; let from = [P.x, P.y], i = 0;
  while (i < pts.length) { let j = pts.length - 1; for (; j > i; j--) if (clear(m, from, pts[j])) break; out.push(pts[j]); from = pts[j]; i = j + 1; }
  return out;
}
function clear(m, a, b) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.2);
  for (let i = 1; i <= n; i++) { const t = i / n; if (!m.free(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.36)) return false; }
  return true;
}

// ---------------------------------------------------------------- shared point lights for flames (fixed count = no shader recompiles)
let pool = null;
export function updateLights() {
  if (!pool) { pool = []; for (let i = 0; i < 5; i++) { const L = new THREE.PointLight(0xff9a40, 0, 10, 1.5); V.scene.add(L); pool.push(L); } }
  const P = G.player, wp = new THREE.Vector3();
  const list = G.zone.flames.map(f => { f.getWorldPosition(wp); return { f, x: wp.x, y: wp.y, z: wp.z, d: Math.hypot(wp.x - P.x, wp.z - P.y) }; }).sort((a, b) => a.d - b.d);
  pool.forEach((L, i) => { const it = list[i]; if (it && it.d < 22) { L.position.set(it.x, it.y + 0.7, it.z); L.intensity = (G.zone.dark ? 9 : 4) * (1 + Math.sin(G.time * 11 + i) * 0.08); L.distance = G.zone.dark ? 11 : 8; } else L.intensity = 0; });
  V.torch.position.set(P.x, 2.2, P.y + 0.2); V.torch.intensity = G.torch ? 14 + Math.sin(G.time * 13) * 1.2 : (G.zone.dark ? 3 : 0); V.torch.distance = G.torch ? 15 : 6;
}

// ---------------------------------------------------------------- overlay: names, markers, icons, floating text, path ring
export function drawOverlay() {
  const c = V.octx, k = V.dpr; c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, V.W, V.H);
  const P = G.player, Z = G.zone; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const a of Z.actors) {
    if (!a.label) continue; const p = a.root.position; const d = Math.hypot(p.x - P.x, p.z - P.y); if (d > 18) continue;
    const [x, y] = X.toScreen(p.x, a.plateH, p.z);
    c.font = '600 13px Georgia, serif'; const tw = c.measureText(a.label).width + 12;
    c.globalAlpha = Math.max(0.3, 1 - d / 18); c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(x - tw / 2, y - 9, tw, 18); c.fillStyle = '#f3dfae'; c.fillText(a.label, x, y + 1);
    if (a.marker) { const b = Math.sin(G.time * 4) * 4; c.font = 'bold 26px Georgia, serif'; c.lineWidth = 3; c.strokeStyle = '#000'; c.fillStyle = '#ffd24a'; c.strokeText(a.marker, x, y - 24 + b); c.fillText(a.marker, x, y - 24 + b); }
    c.globalAlpha = 1;
  }
  for (const o of Z.inter) {
    if (!o.icon || o.hidden) continue; const near = G.near === o; const d = Math.hypot(o.x - P.x, o.y - P.y); if (d > 11 && !near) continue;
    const [x, y] = X.toScreen(o.x, (o.iconH || 1.6) + Math.sin(G.time * 3 + o.x) * 0.08, o.y);
    c.globalAlpha = near ? 1 : Math.max(0.35, 1 - d / 11);
    c.fillStyle = near ? 'rgba(255,215,120,0.32)' : 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(x, y, near ? 19 : 14, 0, 7); c.fill();
    c.font = `${near ? 22 : 17}px serif`; c.fillStyle = '#fff'; c.fillText(o.icon, x, y + 1); c.globalAlpha = 1;
  }
  if (G.path && G.path.length) { const [px, py] = G.path[G.path.length - 1]; const [x, y] = X.toScreen(px, 0.02, py); c.strokeStyle = 'rgba(255,220,140,0.75)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 12 + Math.sin(G.time * 8) * 2, 6, 0, 0, 7); c.stroke(); }
  for (const f of G.fx) {
    f.t += 1 / 60; const kk = f.t / f.dur; if (kk > 1) continue;
    const [x, y] = X.toScreen(f.x, 2.3 + kk * 1.2, f.y); c.globalAlpha = 1 - kk; c.font = 'bold 17px Georgia, serif';
    c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeText(f.text, x, y); c.fillStyle = f.color || '#ffd66a'; c.fillText(f.text, x, y); c.globalAlpha = 1;
  }
  G.fx = G.fx.filter(f => f.t < f.dur);
}
export function pickScreen(sx, sy) {
  let best = null, bd = 1e9;
  for (const o of G.zone.inter) {
    if (o.hidden) continue; const h = o.actorRef ? o.actorRef.height * 0.55 : (o.iconH || 1.6) * 0.6;
    const [x, y] = X.toScreen(o.x, h, o.y); const [x2, y2] = X.toScreen(o.x, 0, o.y);
    const lim = Math.max(36, Math.abs(y2 - y) * 0.9); const d = Math.hypot(sx - x, (sy - y) * 0.7);
    if (d < lim && d < bd) { bd = d; best = o; }
  }
  return best;
}

// ---------------------------------------------------------------- fade props that stand between the camera and the hero
function fadeTo(o, a) {
  const u = o.userData;
  if (!u.fadeMats) { if (a >= 0.999) return; u.fadeMats = []; o.traverse(m => { if (m.isMesh && m.material) { m.material = m.material.clone(); m.material.transparent = true; u.fadeMats.push(m.material); } }); u.alpha = 1; }
  if (Math.abs(u.alpha - a) < 0.01) return; u.alpha = a;
  for (const m of u.fadeMats) { m.opacity = a; m.depthWrite = a > 0.95; }
}
export function updateOcclusion(dt) {
  const P = G.player, c = V.cam.position; if (!P) return;
  const ex = c.x - P.x, ez = c.z - P.y, L2 = ex * ex + ez * ez;
  for (const g of [G.zone.st.group, G.zone.group]) for (const o of g.children) {
    const s = o.userData.size; if (!s) continue;
    const px = o.position.x - P.x, pz = o.position.z - P.y; const t = (px * ex + pz * ez) / L2;
    let want = 1;
    if (t > 0.02 && t < 0.9) {
      const dx = px - ex * t, dz = pz - ez * t, d = Math.hypot(dx, dz), rad = Math.max(s[0], s[2]) * 0.5 * Math.abs(o.scale.x || 1);
      const lineH = 1.0 + (c.y - 1.0) * t;   // height of the sight line above that spot
      if (d < rad + 0.9 && s[1] * (o.scale.y || 1) > lineH * 0.55) want = 0.22;
    }
    const cur = o.userData.alpha ?? 1; const nx = cur + (want - cur) * Math.min(1, dt * 8);
    fadeTo(o, nx);
  }
}
