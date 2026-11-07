// Renderer (adapted from Dark Ascent): baked floor, depth-sorted sprites with cutaway, lighting, plates.
import { G, heroFrame } from './world.js';
import { getAtlas, drawFrame, loadImage } from './engine/assets.js';
import { PX_PER_M } from './engine/iso.js';

let cv, ctx, lightCv, lctx, W = 0, H = 0, DPR = 1;
export function initRenderer(canvas) {
  cv = canvas; ctx = cv.getContext('2d', { alpha: false });
  lightCv = document.createElement('canvas'); lctx = lightCv.getContext('2d');
  resize();
  addEventListener('resize', resize);
  if (window.visualViewport) visualViewport.addEventListener('resize', resize);
  addEventListener('orientationchange', () => { for (const t of [80, 300, 800]) setTimeout(resize, t); });
}
export function resize() {
  DPR = Math.min(devicePixelRatio || 1, innerWidth * innerHeight > 1.3e6 ? 1.25 : 2);
  W = document.documentElement.clientWidth || innerWidth; H = document.documentElement.clientHeight || innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  lightCv.width = Math.ceil(W / 2); lightCv.height = Math.ceil(H / 2);
  const cam = G.cam; cam.w = W; cam.h = H;
  cam.zoom = Math.max(0.8, Math.min(1.6, Math.min(W, H) / 480));
}
const floorCache = new Map();
export async function loadFloor(zone) {
  if (floorCache.has(zone.id)) { zone.floorImgs = floorCache.get(zone.id); return; }
  const f = zone.floor, list = [];
  await Promise.all(f.chunks.map(async c => { const im = await loadImage('maps/' + c[0]); list.push({ im, cx: c[1], cy: c[2], w: c[3], h: c[4] }); }));
  floorCache.set(zone.id, list); zone.floorImgs = list;
}
const sc = A => G.cam.zoom * PX_PER_M / A.ppm;
const MON_DIR = { 0: [0, 0], 1: [1, 0], 2: [0, 1], 3: [3, 0], 4: [4, 0], 5: [5, 0], 6: [4, 1], 7: [3, 1] };
function monDir(A, d) { if (!A.mirror) return [d, 0]; if (A.dirs.includes(d)) return [d, 0]; const m = MON_DIR[d]; if (A.dirs.includes(m[0])) return m; return [A.dirs[0], 0]; }
const NPC_DIR = d => d === 0 ? [0, 0] : d === 1 ? [1, 0] : d === 2 ? [0, 1] : d === 7 || d === 6 ? [0, 0] : [1, 0];

export function render() {
  const cam = G.cam, Z = G.zone; if (!Z || !ctx) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = Z.dark ? '#050406' : '#1d2414'; ctx.fillRect(0, 0, W, H);
  const [ox, oy] = cam.toScreen(0, 0); const fs = cam.zoom / Z.floor.scale;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  for (const c of Z.floorImgs || []) {
    const x = ox + (c.cx - Z.floor.ox) * fs, y = oy + c.cy * fs, w = c.w * fs, h = c.h * fs;
    if (x > W || y > H || x + w < 0 || y + h < 0) continue;
    ctx.drawImage(c.im, x, y, w + 0.5, h + 0.5);
  }
  const props = getAtlas('props');
  if (props) for (const d of Z.statics) { if (!d.flat || d.hidden) continue; const [fx, fy] = cam.toScreen(d.x, d.y); drawFrame(ctx, props, d.spr, fx, fy, sc(props)); }
  drawPathMark();
  const P = G.player, list = [];
  const pa = cam.toScreen(P.x, P.y), pdepth = P.x + P.y, margin = 260 * cam.zoom;
  for (const d of Z.statics) {
    if (d.hidden || d.flat) continue;
    const [x, y] = cam.toScreen(d.x, d.y);
    if (x < -margin || x > W + margin || y < -margin * 0.6 || y > H + margin * 1.8) continue;
    list.push({ k: d.x + d.y + 0.01, t: 0, d, x, y });
  }
  for (const a of Z.actors) { if (a.hidden) continue; const [x, y] = cam.toScreen(a.x, a.y); list.push({ k: a.x + a.y + 0.05, t: 2, a, x, y }); }
  list.push({ k: pdepth + 0.06, t: 3, x: pa[0], y: pa[1] });
  list.sort((a, b) => a.k - b.k);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (const it of list) if (it.t) { const r = 0.34 * cam.zoom * 34; ctx.beginPath(); ctx.ellipse(it.x, it.y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const it of list) {
    if (it.t === 0) {
      if (!props) continue; const d = it.d; let a = d.alpha ?? 1;
      if ((d.wall || d.tall) && d.x + d.y > pdepth + 0.3) {
        const dx = it.x - pa[0], dy = it.y - pa[1], r = (d.wall ? 160 : 150) * cam.zoom;
        if (Math.abs(dx) < r && dy > -60 * cam.zoom && dy < r * 1.5) a = d.wall ? 0.22 : 0.4;
      }
      if (d.fade == null) d.fade = a; d.fade += (a - d.fade) * 0.25;
      drawFrame(ctx, props, d.spr, it.x, it.y, sc(props), !!d.flip, d.fade);
      if (d.anim === 'portal') portalFx(it.x, it.y);
      if (d.anim === 'lit') flameFx(it.x, it.y);
    } else if (it.t === 2) drawActor(it.a, it.x, it.y);
    else drawHero(P, it.x, it.y);
  }
  ctx.globalAlpha = 0.18; drawHero(P, pa[0], pa[1]); ctx.globalAlpha = 1;
  if (Z.dark) darkness(); else dusk();
  drawPlates(); drawFx();
}
function drawHero(P, x, y) { const A = getAtlas('hero_body'); if (A) drawFrame(ctx, A, heroFrame(P), x, y, sc(A)); }
function drawActor(a, x, y) {
  const A = getAtlas(a.atlas); if (!A) return;
  a.t += 1 / 60;
  const clip = a.clip || 'idle'; const nf = (A.clips[clip] || [4])[0];
  const [d, fl] = a.kind === 'npc' ? NPC_DIR(a.dir) : monDir(A, a.dir);
  const s = sc(A) * (a.scale || 1);
  if (a.alpha != null) ctx.globalAlpha = a.alpha;
  if (a.glow) { ctx.shadowColor = a.glow; ctx.shadowBlur = 16; }
  const f = a.once ? Math.min(nf - 1, Math.floor(a.t * 9)) : Math.floor(a.t * 6) % nf;
  drawFrame(ctx, A, `${clip}_${d}_${f}`, x, y, s, !!fl);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  const z = Math.min(1.2, G.cam.zoom);
  if (a.name) {
    ctx.font = `600 ${Math.round(12 * z)}px Georgia, serif`; ctx.textAlign = 'center';
    const ty = y - (a.plateY || 118) * G.cam.zoom * (a.scale || 1);
    const tw = ctx.measureText(a.name).width + 12; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - tw / 2, ty - 13, tw, 17);
    ctx.fillStyle = '#f0dca8'; ctx.fillText(a.name, x, ty);
    if (a.marker) { ctx.font = `bold ${Math.round(26 * G.cam.zoom)}px Georgia, serif`; const b = Math.sin(G.time * 4) * 4; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.fillStyle = a.marker === '!' ? '#ffd24a' : '#bfe3ff'; ctx.strokeText(a.marker, x, ty - 18 + b); ctx.fillText(a.marker, x, ty - 18 + b); }
  }
}
function portalFx(x, y) {
  const z = G.cam.zoom, t = G.time;
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - 55 * z, 4, x, y - 55 * z, 46 * z);
  g.addColorStop(0, `rgba(190,150,255,${0.55 + Math.sin(t * 3) * 0.15})`); g.addColorStop(1, 'rgba(90,40,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 55 * z, 30 * z, 50 * z, 0, 0, 7); ctx.fill();
  for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * 1.05; ctx.fillStyle = 'rgba(210,180,255,0.7)'; ctx.fillRect(x + Math.cos(a) * 22 * z - 1.5, y - 55 * z + Math.sin(a) * 40 * z - 1.5, 3, 3); }
  ctx.globalCompositeOperation = 'source-over';
}
function flameFx(x, y) {
  const z = G.cam.zoom, t = G.time; ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) { const h = (34 + i * 6 + Math.sin(t * 9 + i) * 4) * z; const g = ctx.createRadialGradient(x, y - h, 1, x, y - h, 14 * z); g.addColorStop(0, 'rgba(255,200,90,0.8)'); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - h, 14 * z, 0, 7); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
}
function darkness() {
  const cam = G.cam, lw = lightCv.width, lh = lightCv.height, P = G.player;
  lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, lw, lh);
  lctx.fillStyle = 'rgba(4,3,8,0.86)'; lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = 'destination-out';
  const hole = (wx, wy, r, a, z = 0) => {
    const [x, y] = cam.toScreen(wx, wy, z); const R = r * 32 * cam.zoom;
    if (x + R < 0 || x - R > W || y + R < 0 || y - R > H) return;
    const g = lctx.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, R / 2);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.beginPath(); lctx.ellipse(x / 2, y / 2, R / 2, R / 4, 0, 0, 7); lctx.fill();
  };
  const torch = G.torch ? 10 + Math.sin(G.time * 11) * 0.3 : 3.6;
  hole(P.x, P.y, torch, 0.98);
  const lights = [];
  for (const L of G.zone.lights) { if (!L.on) continue; const fl = L.flicker ? 1 - L.flicker * 0.08 * (Math.sin(G.time * 13 + L.seed) + Math.sin(G.time * 7.3 + L.seed * 2)) : 1; hole(L.x, L.y, L.r * fl, 0.9); lights.push([L, fl]); }
  ctx.drawImage(lightCv, 0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  if (G.torch) lights.push([{ x: P.x, y: P.y, z: 1.4, r: 4, c: [255, 160, 70] }, 1]);
  for (const [L, fl] of lights) {
    const [x, y] = cam.toScreen(L.x, L.y, L.z * 0.5); const R = L.r * 22 * cam.zoom * fl;
    if (x + R < 0 || x - R > W || y + R < 0 || y - R > H) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(${L.c[0]},${L.c[1]},${L.c[2]},0.3)`); g.addColorStop(0.5, `rgba(${L.c[0]},${L.c[1]},${L.c[2]},0.09)`); g.addColorStop(1, `rgba(${L.c[0]},${L.c[1]},${L.c[2]},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  vignette(0.55);
}
function dusk() {
  const cam = G.cam;
  ctx.fillStyle = G.night ? 'rgba(10,10,40,0.35)' : 'rgba(30,20,60,0.14)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const L of G.zone.lights) {
    if (!L.on) continue;
    const [x, y] = cam.toScreen(L.x, L.y, L.z * 0.6); const R = L.r * 20 * cam.zoom;
    if (x + R < 0 || x - R > W || y + R < 0 || y - R > H) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(${L.c[0]},${L.c[1]},${L.c[2]},0.25)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  vignette(0.4);
}
let vg = null, vgKey = '';
function vignette(a) {
  const k = W + 'x' + H + a; if (k !== vgKey) { vgKey = k; vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${a})`); }
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
// floating icons over interactables (📜 inscription, ✋ use) and the one in reach highlighted
function drawPlates() {
  const cam = G.cam, P = G.player, z = Math.min(1.25, cam.zoom);
  for (const o of G.zone.inter) {
    if (o.hidden || !o.icon) continue;
    const near = G.near === o; const d = Math.hypot(o.x - P.x, o.y - P.y);
    if (d > 9 && !near) continue;
    const [x, y0] = cam.toScreen(o.x, o.y); const y = y0 - (o.iconY || 70) * cam.zoom + Math.sin(G.time * 3 + o.x) * 3;
    ctx.globalAlpha = near ? 1 : Math.max(0.35, 1 - d / 9);
    ctx.font = `${Math.round((near ? 24 : 18) * z)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = near ? 'rgba(255,215,120,0.28)' : 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(x, y, (near ? 19 : 14) * z, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(o.icon, x, y + 1);
    ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
  }
}
function drawPathMark() {
  if (!G.path || !G.path.length) return; const [x, y] = G.cam.toScreen(...G.path[G.path.length - 1]); const z = G.cam.zoom;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.strokeStyle = 'rgba(255,220,140,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, (10 + Math.sin(G.time * 8) * 2) * z, 0, 7); ctx.stroke(); ctx.restore();
}
function drawFx() {
  for (const f of G.fx) {
    f.t += 1 / 60; const k = f.t / f.dur; if (k > 1) continue;
    const [x, y] = G.cam.toScreen(f.x, f.y, 1.6 + k * 1.2);
    ctx.globalAlpha = 1 - k; ctx.font = `bold ${Math.round(16 * G.cam.zoom)}px Georgia, serif`; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(f.text, x, y); ctx.fillStyle = f.color || '#ffd66a'; ctx.fillText(f.text, x, y); ctx.globalAlpha = 1;
  }
  G.fx = G.fx.filter(f => f.t < f.dur);
}
export const pickScreen = (sx, sy) => {   // interactable under a tap (by its sprite/icon)
  let best = null, bd = 1e9;
  for (const o of G.zone.inter) {
    if (o.hidden) continue; const [x, y] = G.cam.toScreen(o.x, o.y);
    const top = (o.iconY || 70) * G.cam.zoom;
    const dx = sx - x, dy = sy - (y - top * 0.55);
    const d = Math.hypot(dx, dy * 0.8); const lim = Math.max(34, top * 0.62);
    if (d < lim && d < bd) { bd = d; best = o; }
  }
  return best;
};
