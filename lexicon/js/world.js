// World: zones built from the baked maps, actors, the hero, movement and tap-to-walk pathfinding.
import { GridMap } from './engine/map.js';
import { Camera, screenDirToWorld, dirOf } from './engine/iso.js';
import { loadJSON, getAtlas } from './engine/assets.js';

export const G = { zone: null, cam: new Camera(), time: 0, player: null, actors: [], inter: [], fx: [], path: null, target: null, lock: 0 };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return h; };

// decor props from the original packs (sprite, collider, light)
export const PROP = {
  brazier: { spr: 'brazier', r: 0.3, light: { r: 5, c: [255, 150, 60], flicker: 1 } },
  bones: { spr: 'bones' }, skulls: { spr: 'skulls', r: 0.25 }, rubble: { spr: 'rubble', r: 0.3 },
  candles: { spr: 'candles', light: { r: 2.5, c: [255, 190, 110], flicker: 1 } },
  rocks: { spr: 'rocks', r: 0.35 }, barrel: { spr: 'barrel', r: 0.3 }, crate: { spr: 'crate', r: 0.35 },
  pillar: { spr: 'pillar', r: 0.38, tall: 1 }, puddle: { spr: 'puddle', flat: 1 },
  mushrooms: { spr: 'mushrooms', light: { r: 2.5, c: [90, 230, 220], flicker: 0.2 } },
  stalagmite: { spr: 'stalagmite', r: 0.3, tall: 1 }, crystals: { spr: 'crystals', r: 0.3, light: { r: 3.2, c: [190, 120, 255], flicker: 0.3 } },
  banner: { spr: 'banner', r: 0.15, tall: 1 }, bookshelf: { spr: 'bookshelf', box: [0.55, 0.2] }, statue: { spr: 'statue', r: 0.42, tall: 1 },
  deadroot: { spr: 'deadtree', r: 0.25, tall: 1 }, deadtree: { spr: 'deadtree', r: 0.25, tall: 1 },
  well: { spr: 'well', r: 0.62 }, forge: { spr: 'forge', box: [0.75, 0.6], light: { r: 4, c: [255, 120, 40], flicker: 1, dy: 0.2 } },
  stall: { spr: 'stall', box: [0.95, 0.45] }, lamp: { spr: 'lamp', r: 0.12, tall: 1, light: { r: 5.5, c: [255, 190, 110], flicker: 0.5, z: 1.9 } },
  tree_0: { spr: 'tree_0', r: 0.3, tall: 1 }, tree_1: { spr: 'tree_1', r: 0.3, tall: 1 },
  hay: { spr: 'hay', r: 0.45 }, grave: { spr: 'grave', r: 0.2 }, fence_x: { spr: 'fence_x', box: [0.5, 0.08] }, fence_y: { spr: 'fence_y', box: [0.08, 0.5] },
  house_0: { spr: 'house_0', box: [1.66, 1.36], tall: 1 }, house_1: { spr: 'house_1', box: [1.96, 1.46], tall: 1 }, house_2: { spr: 'house_2', box: [1.46, 1.46], tall: 1 },
  shrine: { spr: 'altar', r: 0.45, light: { r: 3, c: [190, 140, 255], flicker: 0.3 } }, altar: { spr: 'altar', r: 0.5 },
  runebed: { spr: 'runebed', r: 1.1, light: { r: 5, c: [110, 230, 255], flicker: 0.25, z: 0.8 } },
};
// json objects the story places itself (with puzzles) — skipped by the decor pass
const STORY_TYPES = new Set(['portal', 'portal_return', 'door', 'gate', 'secretwall', 'sarcophagus', 'chest', 'altar_medallion', 'board', 'board_dungeon', 'shrine', 'well', 'forge', 'stall', 'brazier']);
const JSONS = {};
export async function loadMaps() { JSONS.village = await loadJSON('maps/village.json'); JSONS.deep = await loadJSON('maps/catacombs.json'); }
export const mapJSON = id => JSONS[id];

export class Zone {
  constructor(id, objs) {
    const J = JSONS[id]; this.id = id; this.json = J;
    if (id === 'village') J.walkableHash = true;
    this.map = new GridMap(J); this.floor = J.floor; this.dark = id !== 'village';
    this.statics = []; this.lights = []; this.inter = []; this.actors = [];
    if (id === 'village') this.buildTown(J); else this.buildDungeon(J);
    for (const o of objs) this.place(o);
  }
  addLight(x, y, o) { const L = { x: x + (o.dx || 0), y: y + (o.dy || 0), z: o.z || 1, r: o.r, c: o.c, flicker: o.flicker || 0, on: true, seed: (hash(x * 10 | 0, y * 10 | 0) % 100) / 10 }; this.lights.push(L); return L; }
  add(d) { this.statics.push(d); return d; }
  prop(o) {
    const P = PROP[o.t]; if (!P) return null;
    const d = this.add({ x: o.x, y: o.y, spr: P.spr, tall: P.tall, flat: P.flat, flip: o.flip });
    if (P.r) this.map.circles.push({ x: o.x, y: o.y, r: P.r });
    if (P.box) this.map.rects.push({ x0: o.x - P.box[0], y0: o.y - P.box[1], x1: o.x + P.box[0], y1: o.y + P.box[1] });
    if (P.light && o.light !== false) this.addLight(o.x, o.y, P.light);
    return d;
  }
  // story object: {id, x, y, t?(prop) | spr, r, solid tile, light, actor, use, label, plate, mark}
  place(o) {
    let d = null;
    if (o.t) { d = this.prop(o); if (d && o.anim) d.anim = o.anim; }
    else if (o.spr) {
      d = this.add({ x: o.x, y: o.y, spr: o.spr, wall: o.wall, tall: o.tall, flip: o.flip, anim: o.anim });
      if (o.r) this.map.circles.push({ x: o.x, y: o.y, r: o.r });
      if (o.box) this.map.rects.push({ x0: o.x - o.box[0], y0: o.y - o.box[1], x1: o.x + o.box[0], y1: o.y + o.box[1] });
    }
    if (o.tile) this.map.setSolid(o.tile[0], o.tile[1], o.solid ? 1 : 0);
    if (o.tiles) for (const [x, y] of o.tiles) this.map.setSolid(x, y, o.solid ? 1 : 0);
    if (o.light) this.addLight(o.x, o.y, o.light);
    if (o.actor) {
      const a = { ...o.actor, x: o.x, y: o.y, dir: o.actor.dir ?? 1, t: (hash(o.x | 0, o.y | 0) % 100) / 30 };
      this.actors.push(a); this.map.circles.push({ x: o.x, y: o.y, r: 0.35 }); o.actorRef = a;
    }
    if (o.use) this.inter.push({ ...o, draw: d, r: o.ir || 1.8 });
  }
  buildDungeon(J) {
    const m = this.map, torch = new Set((J.torches || []).map(([x, y]) => x + ',' + y));
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.ch(x, y) !== '#') continue;
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) { const n = m.ch(x + dx, y + dy); if (n !== '#' && !(x + dx < 0 || y + dy < 0 || x + dx >= m.w || y + dy >= m.h)) { edge = true; break; } }
      if (!edge) continue;
      const isT = torch.has(x + ',' + y);
      this.add({ x: x + 0.5, y: y + 0.5, spr: isT ? 'wall_torch' : 'wall_' + (hash(x, y) % 4), wall: true });
      if (isT) {
        let fx = 0, fy = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (m.ch(x + dx, y + dy) !== '#') { fx = dx; fy = dy; break; }
        this.addLight(x + 0.5 + fx * 0.7, y + 0.5 + fy * 0.7, { r: 4.5, c: [255, 150, 70], flicker: 1, z: 1.2 });
      }
    }
    for (const o of J.objects) if (!STORY_TYPES.has(o.t)) this.prop(o);
    // D / G / S tiles are opened by the story
  }
  buildTown(J) {
    const m = this.map;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.ch(x, y) !== 'x') continue;
      const inner = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < m.w && Y < m.h && m.ch(X, Y) !== 'x'; });
      const h = hash(x, y);
      if (inner && h % 3 !== 0) this.add({ x: x + 0.3 + (h % 5) / 10, y: y + 0.3 + ((h >> 3) % 5) / 10, spr: h % 2 ? 'tree_0' : 'tree_1', tall: 1 });
      else if (!inner && h % 4 === 0) this.add({ x: x + 0.5, y: y + 0.5, spr: h % 2 ? 'tree_1' : 'tree_0', tall: 1 });
    }
    for (const o of J.objects) if (!STORY_TYPES.has(o.t)) this.prop(o);
  }
}

// ---------------------------------------------------------------- hero
const NF = { idle: 4, walk: 8, run: 8 };
export function makePlayer(x, y) { return { x, y, r: 0.3, dir: 1, clip: 'idle', t: 0, moving: false }; }
export function heroFrame(P) { const nf = NF[P.clip] || 4; const fps = P.clip === 'idle' ? 5 : 10.5; return `${P.clip}_${P.dir}_${Math.floor(P.t * fps) % nf}`; }

export const keys = new Set();
export function updatePlayer(dt) {
  const P = G.player, Z = G.zone; if (!P || !Z) return;
  P.t += dt; let mx = 0, my = 0;
  if (!G.lock) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  }
  let vx = 0, vy = 0;
  if (mx || my) { [vx, vy] = screenDirToWorld(mx, my); G.path = null; G.target = null; }
  else if (G.path && !G.lock) {
    const wp = G.path[0];
    if (wp) { const dx = wp[0] - P.x, dy = wp[1] - P.y, d = Math.hypot(dx, dy); if (d < 0.18) { G.path.shift(); } else { vx = dx / d; vy = dy / d; } }
    if (!G.path.length) G.path = null;
  }
  const sp = 3.6;
  if (vx || vy) {
    const [nx, ny] = Z.map.move(P.x, P.y, vx * sp * dt, vy * sp * dt, P.r);
    if (Math.hypot(nx - P.x, ny - P.y) < 0.002 * sp && G.path) { G.stuck = (G.stuck || 0) + dt; if (G.stuck > 0.5) { G.path = null; G.stuck = 0; } } else G.stuck = 0;
    P.x = nx; P.y = ny; P.dir = dirOf(vx, vy);
    if (P.clip !== 'walk') { P.clip = 'walk'; P.t = 0; } P.moving = true;
  } else { if (P.clip !== 'idle') { P.clip = 'idle'; P.t = 0; } P.moving = false; }
}
// A* over tiles that avoids walls and prop colliders; returns world waypoints
export function findPath(tx, ty) {
  const Z = G.zone, m = Z.map, P = G.player;
  const W = m.w, H = m.h, sx = Math.floor(P.x), sy = Math.floor(P.y);
  let gx = Math.floor(tx), gy = Math.floor(ty);
  const bad = (x, y) => m.gblocked(x, y);
  if (bad(gx, gy)) { // nearest free tile to the goal
    let best = null, bd = 1e9;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = gx + dx, y = gy + dy; if (x < 0 || y < 0 || x >= W || y >= H || bad(x, y)) continue; const d = Math.hypot(dx, dy) + Math.hypot(x - sx, y - sy) * 0.02; if (d < bd) { bd = d; best = [x, y]; } }
    if (!best) return null; [gx, gy] = best;
  }
  const prev = new Int32Array(W * H).fill(-1), dist = new Float32Array(W * H).fill(1e9);
  const open = [[0, sx, sy]]; dist[sy * W + sx] = 0; prev[sy * W + sx] = sy * W + sx;
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
  let found = false, it = 0;
  while (open.length && it++ < 6000) {
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
  // final point: the exact tapped spot if it is free
  if (pts.length && m.free(tx, ty, P.r) && Math.floor(tx) === gx && Math.floor(ty) === gy) pts[pts.length - 1] = [tx, ty];
  return smooth(pts);
}
function smooth(pts) {   // drop waypoints with clear line of walk
  const m = G.zone.map, P = G.player, out = []; let from = [P.x, P.y], i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    for (; j > i; j--) if (clear(m, from, pts[j])) break;
    out.push(pts[j]); from = pts[j]; i = j + 1;
  }
  return out;
}
function clear(m, a, b) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.2);
  for (let i = 1; i <= n; i++) { const t = i / n; const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; if (!m.free(x, y, 0.34)) return false; }
  return true;
}
export const ready = () => !!getAtlas('hero_body');
