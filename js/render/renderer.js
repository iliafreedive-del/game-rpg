// Renderer: baked floor chunks, depth-sorted sprites with wall cutaway, dynamic lighting, VFX, floating text.
import { G } from '../game/ctx.js';
import { getAtlas, drawFrame, loadImage, loadJSON } from '../core/assets.js';
import { PX_PER_M, Z_PX } from '../core/iso.js';
import { RARITY } from '../data/items.js';
import { iconOf } from '../game/items.js';
import { BIOMES } from '../data/biomes.js';
import * as SV from '../game/survival.js';

let cv, ctx, lightCv, lctx, W = 0, H = 0, DPR = 1;
const floorImgs = new Map();
export function initRenderer(canvas) {
  cv = canvas; ctx = cv.getContext('2d', { alpha: false });
  lightCv = document.createElement('canvas'); lctx = lightCv.getContext('2d');
  resize();
  const later = () => { resize(); window.scrollTo(0, 0); };
  addEventListener('resize', later);
  if (window.visualViewport) visualViewport.addEventListener('resize', later);
  addEventListener('orientationchange', () => { for (const t of [50, 250, 600, 1200]) setTimeout(later, t); });
}
export function resize() {
  const q = G.profile ? G.profile.settings.quality : 'auto';
  const maxDpr = q === 'low' ? 1 : q === 'high' ? 2 : Math.min(2, (innerWidth * innerHeight > 1.3e6 ? 1.25 : 2));
  DPR = Math.min(devicePixelRatio || 1, maxDpr);
  W = document.documentElement.clientWidth || innerWidth; H = document.documentElement.clientHeight || innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  lightCv.width = Math.ceil(W / 2); lightCv.height = Math.ceil(H / 2);
  const cam = G.cam; cam.w = W; cam.h = H; G.zoomMul = G.zoomMul || 1;
  // zoom: characters readable on phones, not huge on desktops
  const short = Math.min(W, H);
  cam.zoom = Math.max(0.78, Math.min(1.7, short / 470)) * (G.zoomMul || 1);
}
export async function loadFloor(zone) {
  const f = zone.floor; zone.floorImgs = [];
  await Promise.all(f.chunks.map(async c => { const im = await loadImage('maps/' + c[0]); zone.floorImgs.push({ im, cx: c[1], cy: c[2], w: c[3], h: c[4] }); }));
}

// Procedural floors: paint each floor tile with a stone diamond sampled from the baked catacombs floor.
let tileSrc = null;
async function sourceTiles() {
  if (tileSrc) return tileSrc;
  const J = await loadJSON('maps/catacombs.json'); const f = J.floor;
  const chunks = await Promise.all(f.chunks.map(async c => ({ im: await loadImage('maps/' + c[0]), cx: c[1], cy: c[2], w: c[3], h: c[4] })));
  const list = [];
  for (let j = 1; j < J.h - 1; j++) for (let i = 1; i < J.w - 1; i++) {
    if (J.rows[j][i] !== '.' || J.rows[j][i + 1] !== '.' || J.rows[j + 1][i] !== '.' || J.rows[j - 1][i] !== '.' || J.rows[j][i - 1] !== '.') continue;
    const X = f.ox + (i - j) * 32, Y = (i + j) * 16;
    const c = chunks.find(c => X - 34 >= c.cx && X + 34 <= c.cx + c.w && Y - 1 >= c.cy && Y + 34 <= c.cy + c.h);
    if (c) list.push({ c, sx: X - 33 - c.cx, sy: Y - 1 - c.cy });
  }
  return tileSrc = list;
}
export async function buildFloorCanvas(zone) {
  const J = zone.json, src = await sourceTiles();
  const W = (J.w + J.h) * 32, H = (J.w + J.h) * 16 + 34, ox = J.h * 32;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  let s = J.floorN * 131 + 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const P = (u, v) => [ox + (u - v) * 32, (u + v) * 16];
  const diamond = (i, j, grow = 0.6) => { const [X, Y] = P(i, j); x.beginPath(); x.moveTo(X, Y - grow); x.lineTo(X + 32 + grow, Y + 16); x.lineTo(X, Y + 32 + grow); x.lineTo(X - 32 - grow, Y + 16); x.closePath(); };
  if (J.castle) {   // warm wooden floor with plank lines + carpets
    for (let j = 0; j < J.h; j++) for (let i = 0; i < J.w; i++) {
      if (J.rows[j][i] === '#') continue;
      const shade = 0.85 + rnd() * 0.3; x.fillStyle = `rgb(${Math.round(92 * shade)},${Math.round(60 * shade)},${Math.round(36 * shade)})`; diamond(i, j); x.fill();
      x.strokeStyle = 'rgba(30,18,10,0.55)'; x.lineWidth = 1.2;
      for (let k = 0; k <= 3; k++) { const [a, b] = P(i, j + k / 3), [c, d] = P(i + 1, j + k / 3); x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); }
      const off = ((i * 7 + j * 3) % 3) / 3; const [a, b] = P(i + off, j), [c, d] = P(i + off, j + 1 / 3); x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke();
    }
    const carpet = (x0, y0, w, h) => {
      for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) { const edge = i === x0 || j === y0 || i === x0 + w - 1 || j === y0 + h - 1; x.fillStyle = edge ? '#b8862e' : ((i + j) % 2 ? '#7a1a1a' : '#6c1616'); diamond(i, j); x.fill(); }
    };
    carpet(15, 14, 4, 13); carpet(3, 20, 6, 5); carpet(25, 20, 6, 5); carpet(4, 6, 8, 5); carpet(22, 6, 8, 5);
  } else for (let j = 0; j < J.h; j++) for (let i = 0; i < J.w; i++) {
    const ch = J.rows[j][i]; if (ch === '#') continue;
    const t = src[Math.floor(rnd() * src.length)]; const X = ox + (i - j) * 32, Y = (i + j) * 16;
    x.save(); x.beginPath(); x.moveTo(X, Y - 0.6); x.lineTo(X + 32.8, Y + 16); x.lineTo(X, Y + 32.6); x.lineTo(X - 32.8, Y + 16); x.closePath(); x.clip();
    x.drawImage(t.c.im, t.sx, t.sy, 66, 35, X - 33, Y - 1, 66, 35); x.restore();
  }
  // biome overlay: tint + details
  const B = J.biome && BIOMES.find(b => b.id === J.biome);
  if (B && B.tint) {
    x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = B.tint; x.fillRect(0, 0, W, H);
    for (let k = 0; k < J.w * J.h / 10; k++) {
      const i = Math.floor(rnd() * J.w), j = Math.floor(rnd() * J.h); if (J.rows[j][i] === '#') continue; const [X, Y] = P(i + rnd(), j + rnd());
      if (B.id === 'flooded') { x.fillStyle = 'rgba(120,190,230,0.18)'; x.beginPath(); x.ellipse(X, Y, 18 + rnd() * 30, 7 + rnd() * 10, 0, 0, 7); x.fill(); }
      else if (B.id === 'ash') { x.strokeStyle = 'rgba(255,120,30,0.55)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(X, Y); for (let s = 0; s < 4; s++) x.lineTo(X + (rnd() - 0.5) * 40, Y + (rnd() - 0.5) * 20); x.stroke(); }
      else if (B.id === 'abyss') { x.strokeStyle = 'rgba(200,120,255,0.45)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X + (rnd() - 0.5) * 50, Y + (rnd() - 0.5) * 25, X + (rnd() - 0.5) * 70, Y + (rnd() - 0.5) * 35); x.stroke(); }
    }
    x.restore();
  }
  zone.floor = { w: W, h: H, scale: 1, ox };
  zone.floorImgs = [{ im: c, cx: 0, cy: 0, w: W, h: H }];
  if (B && B.light) for (const L of zone.lights) { if (L.c[0] > 200 && L.c[1] < 200) L.c = B.light; }   // torches & braziers take the biome colour
  zone.fog = B ? B.fog : null; zone.biome = B || null;
}
const sc = A => G.cam.zoom * PX_PER_M / A.ppm;
const MON_DIR = { 0: [0, 0], 1: [1, 0], 2: [0, 1], 3: [3, 0], 4: [4, 0], 5: [5, 0], 6: [4, 1], 7: [3, 1] };
function monDir(A, d) { if (!A.mirror) return [d, 0]; if (A.dirs.includes(d)) return [d, 0]; const m = MON_DIR[d]; if (A.dirs.includes(m[0])) return m; return [A.dirs[0], 0]; }
const NPC_DIR = d => d === 0 ? [0, 0] : d === 1 ? [1, 0] : d === 2 ? [0, 1] : d === 7 || d === 6 ? [0, 0] : [1, 0];

export function render() {
  const cam = G.cam, Z = G.zone; if (!Z) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = Z.dark ? '#050406' : '#1d2414'; ctx.fillRect(0, 0, W, H);
  // ---- floor
  const [ox, oy] = cam.toScreen(0, 0); const fs = cam.zoom / Z.floor.scale;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  for (const c of Z.floorImgs || []) {
    const x = ox + (c.cx - Z.floor.ox) * fs, y = oy + c.cy * fs, w = c.w * fs, h = c.h * fs;
    if (x > W || y > H || x + w < 0 || y + h < 0) continue;
    ctx.drawImage(c.im, x, y, w + 0.5, h + 0.5);
  }
  const pr0 = getAtlas('props'); if (pr0) for (const d of Z.statics) { if (!d.flat || d.hidden) continue; const [fx, fy] = cam.toScreen(d.x, d.y); if (fx < -200 || fx > W + 200 || fy < -150 || fy > H + 150) continue; drawFrame(ctx, pr0, d.spr, fx, fy, sc(pr0)); }
  drawGroundFx();
  drawTelegraphs();
  drawGuide();
  drawPickupsGround();
  // ---- collect drawables
  const P = G.player, list = [];
  const pa = cam.toScreen(P.x, P.y); const pdepth = P.x + P.y;
  const margin = 260 * cam.zoom;
  for (const d of Z.statics) {
    if (d.hidden || d.flat) continue;
    const [x, y] = cam.toScreen(d.x, d.y);
    if (x < -margin || x > W + margin || y < -margin * 0.6 || y > H + margin * 1.8) continue;
    list.push({ k: d.x + d.y + (d.wall ? 0 : 0.01), t: 0, d, x, y });
  }
  for (const e of G.enemies) { const [x, y] = cam.toScreen(e.x, e.y); if (x < -200 || x > W + 200 || y < -300 || y > H + 200) continue; list.push({ k: e.x + e.y + (e.dead ? -0.6 : 0.05), t: 1, e, x, y }); }
  for (const n of G.npcs) { const [x, y] = cam.toScreen(n.x, n.y); list.push({ k: n.x + n.y + 0.05, t: 2, n, x, y }); }
  list.push({ k: pdepth + 0.06, t: 3, x: pa[0], y: pa[1] });
  if (G.surv) SV.survivalDrawables(list, cam, W, H);
  list.sort((a, b) => a.k - b.k);
  // shadows first (under everything standing)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (const it of list) if (it.t && it.t !== 5) { const r = (it.t === 1 ? it.e.r : 0.32) * cam.zoom * 34; ctx.beginPath(); ctx.ellipse(it.x, it.y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
  const props = getAtlas('props');
  for (const it of list) {
    if (it.t === 0) {
      if (!props) continue; const d = it.d; let a = 1;
      if ((d.wall || d.tall) && d.x + d.y > pdepth + 0.3) {   // cutaway: walls/tall props in front of the hero
        const dx = it.x - pa[0], dy = it.y - pa[1];
        const r = (d.wall ? 160 : 150) * cam.zoom;
        if (Math.abs(dx) < r && dy > -60 * cam.zoom && dy < r * 1.5) a = d.wall ? 0.22 : 0.4;
      }
      if (d.fade == null) d.fade = a; d.fade += (a - d.fade) * 0.25;
      drawFrame(ctx, props, d.spr, it.x, it.y, sc(props), !!d.flip, d.fade);
      if (d.anim === 'portal') portalFx(it.x, it.y);
    } else if (it.t === 1) drawEnemy(it.e, it.x, it.y);
    else if (it.t === 2) drawNPC(it.n, it.x, it.y);
    else if (it.t === 5) SV.drawSwarmUnit(ctx, it, cam.zoom);
    else drawHero(P, it.x, it.y);
  }
  // hero silhouette when occluded
  if (!P.dead) { ctx.globalAlpha = 0.18; drawHero(P, pa[0], pa[1], true); ctx.globalAlpha = 1; }
  drawProjectiles(false);
  if (G.surv) SV.drawSurvivalFx(ctx, cam);
  // ---- lighting
  if (Z.dark) darkness(); else dusk();
  drawProjectiles(true);
  drawEffects(); drawParticles(); drawBlades();
  drawBars(); drawPickupLabels(); drawPlates(); drawTexts(); drawInteractMarker();
}

// ---------------------------------------------------------------- characters
function heroLayers(P) {
  const wt = G.profile.gear.weapon ? G.profile.gear.weapon.wt : null;
  const cls = G.profile.cls || 'warrior';
  if (cls !== 'warrior' && getAtlas(`hero_${cls}_body`)) return [`hero_${cls}_body`, `hero_${cls}_${cls === 'archer' ? 'bow' : 'staff'}`];
  const L = ['hero_body']; if (wt) L.push('hero_' + wt);
  if ((G.profile.cls || 'warrior') === 'warrior' && (wt === 'sword' || wt === 'axe')) L.push('hero_shield');
  return L;
}
function drawTrail(P) {   // afterimages of the dodge roll
  if (!P.trail || !P.trail.length) return;
  for (const t of P.trail) t.t += 0.016;
  P.trail = P.trail.filter(t => t.t < 0.28);
  const L = heroLayers(P); const A = getAtlas(L[0]); if (!A) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const t of P.trail) { const [x, y] = G.cam.toScreen(t.x, t.y); ctx.globalAlpha = 0.35 * (1 - t.t / 0.28); ctx.filter = 'brightness(0.9) sepia(1) hue-rotate(170deg) saturate(2.5)'; drawFrame(ctx, A, t.f, x, y, sc(A)); }
  ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawHero(P, x, y, ghost) {
  if (!ghost) drawTrail(P);
  if (!ghost && G.surv) { const z = G.cam.zoom; ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.strokeStyle = 'rgba(255,215,90,0.9)'; ctx.lineWidth = 3; ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, 0, 30 * z, 0, 7); ctx.stroke(); ctx.restore(); }
  const f = `${P.anim.clip}_${P.dir}_${P.anim.frame}`;
  for (const n of heroLayers(P)) {
    const A = getAtlas(n); if (!A) continue;
    drawFrame(ctx, A, f, x, y, sc(A));
  }
  if (!ghost && P.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = P.flash * 3; const A = getAtlas(heroLayers(P)[0]); drawFrame(ctx, A, f, x, y, sc(A)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  if (!ghost && P.shield > 0) { ctx.strokeStyle = 'rgba(255,90,90,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 40 * G.cam.zoom, 26 * G.cam.zoom, 48 * G.cam.zoom, 0, 0, 7); ctx.stroke(); }
}
function drawEnemy(e, x, y) {
  const A = getAtlas(e.D.atlas); if (!A) return;
  const [d, fl] = monDir(A, e.dir);
  const f = `${e.anim.clip}_${d}_${e.anim.frame}`;
  const s = sc(A) * (e.champion ? 1.12 : 1) * (e.D.scale || 1);
  if (e.dead && e.corpseT > 5) ctx.globalAlpha = Math.max(0, 1 - (e.corpseT - 5) / 3);
  if (e.D.mini && !e.dead) {   // hunt mini-boss: pulsing blood-red ring under its feet
    const z = G.cam.zoom; ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.strokeStyle = `rgba(255,40,30,${0.55 + Math.sin(G.time * 4) * 0.25})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 70 * z, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(255,30,20,0.12)'; ctx.fill(); ctx.restore();
    ctx.shadowColor = 'rgba(255,50,30,0.9)'; ctx.shadowBlur = 14;
  }
  if (e.champion && !e.dead) { ctx.shadowColor = 'rgba(120,180,255,0.9)'; ctx.shadowBlur = 12; }
  if (e.D.tint) ctx.filter = e.D.tint;
  drawFrame(ctx, A, f, x, y, s, !!fl);
  ctx.filter = 'none'; ctx.shadowBlur = 0;
  const st = e.st;
  if (!e.dead && (e.flash > 0 || st.frozen > 0 || st.burn > 0 || st.slowT > 0)) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = e.flash > 0 ? 0.7 : st.frozen > 0 ? 0.55 : 0.25;
    ctx.filter = st.frozen > 0 || (st.slowT > 0 && e.flash <= 0 && st.burn <= 0) ? 'sepia(1) hue-rotate(160deg) saturate(3)' : st.burn > 0 && e.flash <= 0 ? 'sepia(1) saturate(4)' : 'none';
    drawFrame(ctx, A, f, x, y, s, !!fl);
    ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}
function drawNPC(n, x, y) {
  const A = getAtlas('npc_' + n.id); if (!A) return;
  const [d, fl] = NPC_DIR(n.dir);
  drawFrame(ctx, A, `${n.anim.clip}_${d}_${n.anim.frame}`, x, y, sc(A), !!fl);
  // name plate + quest marker
  ctx.font = `600 ${Math.round(12 * Math.min(1.2, G.cam.zoom))}px Georgia, serif`; ctx.textAlign = 'center';
  const ty = y - 118 * G.cam.zoom;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; const tw = ctx.measureText(n.name).width + 12; ctx.fillRect(x - tw / 2, ty - 13, tw, 17);
  ctx.fillStyle = '#f0dca8'; ctx.fillText(n.name, x, ty);
  if (n.marker) { ctx.font = `bold ${Math.round(26 * G.cam.zoom)}px Georgia, serif`; ctx.fillStyle = n.marker === '?' ? '#ffd24a' : '#ffd24a'; const b = Math.sin(G.time * 4) * 4; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(n.marker, x, ty - 18 + b); ctx.fillText(n.marker, x, ty - 18 + b); }
}
function portalFx(x, y) {
  const z = G.cam.zoom; const t = G.time;
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - 55 * z, 4, x, y - 55 * z, 46 * z);
  g.addColorStop(0, `rgba(190,150,255,${0.55 + Math.sin(t * 3) * 0.15})`); g.addColorStop(1, 'rgba(90,40,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 55 * z, 30 * z, 50 * z, 0, 0, 7); ctx.fill();
  for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * 1.05; ctx.fillStyle = 'rgba(210,180,255,0.7)'; ctx.fillRect(x + Math.cos(a) * 22 * z - 1.5, y - 55 * z + Math.sin(a) * 40 * z - 1.5, 3, 3); }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- lighting
function darkness() {
  const cam = G.cam, lw = lightCv.width, lh = lightCv.height, P = G.player;
  lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, lw, lh);
  const fg = G.zone.fog || [4, 3, 8]; lctx.fillStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},0.8)`; lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = 'destination-out';
  const hole = (wx, wy, r, a, z = 0) => {
    const [x, y] = cam.toScreen(wx, wy, z); const R = r * 32 * cam.zoom;
    if (x + R < 0 || x - R > W || y + R < 0 || y - R > H) return;
    const g = lctx.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, R / 2);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.beginPath(); lctx.ellipse(x / 2, y / 2, R / 2, R / 4, 0, 0, 7); lctx.fill();
  };
  hole(P.x, P.y, 11, 0.98);
  const lights = [];
  for (const L of G.zone.lights) { if (!L.on) continue; const fl = L.flicker ? 1 - L.flicker * 0.08 * (Math.sin(G.time * 13 + L.seed) + Math.sin(G.time * 7.3 + L.seed * 2)) : 1; hole(L.x, L.y, L.r * fl, 0.9); lights.push([L, fl]); }
  for (const p of G.projectiles) if (p.kind === 'fireball' || p.kind === 'darkbolt' || p.kind === 'bolt') hole(p.x, p.y, 3, 0.8, 1);
  for (const e of G.effects) if (e.kind === 'burst' || e.kind === 'bolt') hole(e.x ?? e.x2, e.y ?? e.y2, 5 * (1 - e.t / e.dur), 0.9);
  ctx.drawImage(lightCv, 0, 0, W, H);
  // warm additive glow
  ctx.globalCompositeOperation = 'lighter';
  for (const [L, fl] of lights) {
    const [x, y] = cam.toScreen(L.x, L.y, L.z * 0.5); const R = L.r * 22 * cam.zoom * fl;
    if (x + R < 0 || x - R > W || y + R < 0 || y - R > H) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(${L.c[0]},${L.c[1]},${L.c[2]},0.34)`); g.addColorStop(0.5, `rgba(${L.c[0]},${L.c[1]},${L.c[2]},0.1)`); g.addColorStop(1, `rgba(${L.c[0]},${L.c[1]},${L.c[2]},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  vignette(0.55);
}
function dusk() {
  const cam = G.cam;
  ctx.fillStyle = G.zone.json.castle ? 'rgba(40,20,10,0.12)' : 'rgba(30,20,60,0.16)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const L of G.zone.lights) {
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

// ---------------------------------------------------------------- VFX
function drawTelegraphs() {
  const cam = G.cam, z = cam.zoom;
  for (const e of G.enemies) {
    const tg = e.teleg; if (!tg || e.dead) continue;
    const p = Math.min(1, e.anim.prog / (e.atk ? e.atk.impact : 1));
    ctx.save(); const [x, y] = cam.toScreen(tg.x, tg.y);
    ctx.translate(x, y); ctx.scale(1, 0.5);
    const R = tg.r * 32 * z * Math.SQRT2;   // world metre → screen along iso diagonal
    ctx.fillStyle = tg.rift ? 'rgba(170,70,255,0.18)' : 'rgba(255,60,30,0.16)'; ctx.strokeStyle = tg.rift ? 'rgba(200,120,255,0.8)' : 'rgba(255,90,50,0.85)'; ctx.lineWidth = 2.5;
    const isoA = a => Math.atan2(Math.sin(a) + Math.cos(a), Math.cos(a) - Math.sin(a)); // world angle → screen angle (pre-scale)
    ctx.beginPath();
    if (tg.shape === 'circle') { ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R * p, 0, 7); ctx.fillStyle = tg.rift ? 'rgba(170,70,255,0.3)' : 'rgba(255,60,30,0.3)'; ctx.fill(); }
    else if (tg.shape === 'cone') { const a = isoA(tg.a), h = tg.arc / 2 * Math.PI / 180; ctx.moveTo(0, 0); ctx.arc(0, 0, R, a - h, a + h); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R * p, a - h, a + h); ctx.closePath(); ctx.fillStyle = 'rgba(255,60,30,0.3)'; ctx.fill(); }
    else if (tg.shape === 'line') { const a = isoA(tg.a); ctx.rotate(a); ctx.fillRect(0, -tg.w * 16 * z, R * p, tg.w * 32 * z); ctx.strokeRect(0, -tg.w * 16 * z, R, tg.w * 32 * z); }
    ctx.restore();
  }
}
function drawProjectiles(emissive) {
  const cam = G.cam, z = cam.zoom, T = G.time;
  for (const p of G.projectiles) {
    const [x, y] = cam.toScreen(p.x, p.y, 1.0);
    const [x2, y2] = cam.toScreen(p.x - p.vx * 0.035, p.y - p.vy * 0.035, 1.0);
    const ang = Math.atan2(y - y2, x - x2);
    if (p.kind === 'arrow') {
      if (emissive) { if (p.owner === 'p') { ctx.globalCompositeOperation = 'lighter'; const [tx, ty] = cam.toScreen(p.x - p.vx * 0.09, p.y - p.vy * 0.09, 1.0); const g = ctx.createLinearGradient(tx, ty, x, y); g.addColorStop(0, 'rgba(255,200,90,0)'); g.addColorStop(1, 'rgba(255,220,130,0.8)'); ctx.strokeStyle = g; ctx.lineWidth = 5 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; } continue; }
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2.2 * z; ctx.beginPath(); ctx.moveTo(-22 * z, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.fillStyle = '#cfd6de'; ctx.beginPath(); ctx.moveTo(4 * z, 0); ctx.lineTo(-3 * z, -3 * z); ctx.lineTo(-3 * z, 3 * z); ctx.fill();
      ctx.fillStyle = p.owner === 'e' ? '#7ac06a' : '#e05050'; ctx.fillRect(-22 * z, -3 * z, 6 * z, 6 * z);
      ctx.restore(); continue;
    }
    if (!emissive) continue;
    ctx.globalCompositeOperation = 'lighter';
    if (p.kind === 'fireball' || p.kind === 'meteor') {
      const R = (p.kind === 'meteor' ? 26 : 15) * z;
      for (let k = 0; k < 4; k++) { const f = 1 - k * 0.2, [tx, ty] = cam.toScreen(p.x - p.vx * 0.03 * k, p.y - p.vy * 0.03 * k, 1.0); const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 2 * f); g.addColorStop(0, `rgba(255,${200 - k * 30},${90 - k * 20},${0.8 * f})`); g.addColorStop(0.35, `rgba(255,${110 - k * 20},20,${0.5 * f})`); g.addColorStop(1, 'rgba(255,40,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, R * 2 * f, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.arc(x, y, R * 0.35 * (1 + Math.sin(T * 40) * 0.1), 0, 7); ctx.fill();
    } else if (p.kind === 'shard') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 24 * z); g.addColorStop(0, 'rgba(180,240,255,0.7)'); g.addColorStop(1, 'rgba(80,160,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 24 * z, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(220,250,255,0.95)'; ctx.strokeStyle = 'rgba(120,200,255,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(14 * z, 0); ctx.lineTo(0, -5 * z); ctx.lineTo(-12 * z, 0); ctx.lineTo(0, 5 * z); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,220,255,0.5)'; ctx.lineWidth = 4 * z; ctx.beginPath(); ctx.moveTo(-12 * z, 0); ctx.lineTo(-40 * z, 0); ctx.stroke();
      ctx.restore();
    } else if (p.kind === 'pierce') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      const g = ctx.createLinearGradient(-70 * z, 0, 10 * z, 0); g.addColorStop(0, 'rgba(120,255,160,0)'); g.addColorStop(1, 'rgba(200,255,200,0.95)'); ctx.strokeStyle = g; ctx.lineWidth = 7 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-70 * z, 0); ctx.lineTo(8 * z, 0); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(14 * z, 0); ctx.lineTo(0, -5 * z); ctx.lineTo(0, 5 * z); ctx.fill(); ctx.restore();
    } else {
      const col = p.kind === 'darkbolt' ? [190, 100, 255] : [120, 180, 255], r = 10 * z;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, `rgba(${col},0.85)`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(${col},0.8)`; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const a = T * 20 + k * 2.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 1.8, y + Math.sin(a) * r * 1.8); ctx.stroke(); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
function drawGroundFx() {   // scorch marks, burning ground, frost — drawn on the floor under everyone
  const cam = G.cam, z = cam.zoom;
  for (const e of G.effects) {
    if (e.kind !== 'scorch' && e.kind !== 'firepool' && e.kind !== 'frost' && e.kind !== 'rain') continue;
    const k = e.t / e.dur, [x, y] = cam.toScreen(e.x, e.y); const R = e.r * 32 * z * Math.SQRT2;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5);
    if (e.kind === 'scorch') { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, `rgba(20,10,5,${0.55 * (1 - k)})`); g.addColorStop(0.7, `rgba(40,15,5,${0.35 * (1 - k)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,110,30,${0.35 * (1 - k) * (0.6 + 0.4 * Math.sin(G.time * 9 + e.x))})`; for (let i = 0; i < 6; i++) { const a = i * 1.05 + e.x; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, 3 * z, 0, 7); ctx.fill(); } }
    else if (e.kind === 'firepool') { ctx.globalCompositeOperation = 'lighter'; const f = Math.min(1, (1 - k) * 3); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, `rgba(255,180,60,${0.55 * f})`); g.addColorStop(0.6, `rgba(255,80,20,${0.35 * f})`); g.addColorStop(1, 'rgba(255,40,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * (0.95 + Math.sin(G.time * 12) * 0.05), 0, 7); ctx.fill(); }
    else if (e.kind === 'frost') { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, `rgba(190,240,255,${0.45 * (1 - k)})`); g.addColorStop(1, 'rgba(120,200,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); }
    else if (e.kind === 'rain') { ctx.strokeStyle = `rgba(255,220,140,${0.6 * (1 - k)})`; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -G.time * 30; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke(); }
    ctx.restore(); ctx.globalCompositeOperation = 'source-over';
  }
}
function drawEffects() {
  const cam = G.cam, z = cam.zoom;
  for (const e of G.effects) {
    const k = e.t / e.dur;
    if (e.kind === 'slash') {
      const [x, y] = cam.toScreen(e.x, e.y, 0.9); ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.55);
      const a = Math.atan2(Math.sin(e.a) + Math.cos(e.a), Math.cos(e.a) - Math.sin(e.a)); const h = (e.arc / 2) * Math.PI / 180;
      const R = e.r * 32 * z * 1.35, prog = Math.min(1, k * 2.5);
      const s0 = e.second ? a + h : a - h, s1 = e.second ? a + h - 2 * h * prog : a - h + 2 * h * prog;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const [w, al, col] of [[26, 0.18, e.enemy ? '255,70,40' : '255,200,120'], [12, 0.45, e.enemy ? '255,110,70' : '255,235,190'], [4, 0.95, '255,255,255']]) {
        ctx.strokeStyle = `rgba(${col},${al * (1 - k)})`; ctx.lineWidth = w * z * (1 - k * 0.4); ctx.beginPath(); ctx.arc(0, 0, R * 0.9, Math.min(s0, s1), Math.max(s0, s1)); ctx.stroke();
      }
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    } else if (e.kind === 'ring' || e.kind === 'wave' || e.kind === 'burst') {
      const [x, y] = cam.toScreen(e.x, e.y, 0.05); const R = e.r * 32 * z * Math.SQRT2 * (e.kind === 'burst' ? 0.5 + Math.sqrt(k) * 0.6 : Math.sqrt(k));
      ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter';
      if (e.kind === 'burst') {   // fireball-like explosion: bright core, rolling flame, shock ring
        ctx.save(); ctx.scale(1, 0.6); const g = ctx.createRadialGradient(0, -8 * z, 0, 0, -8 * z, R); g.addColorStop(0, `rgba(255,255,230,${0.95 * (1 - k)})`); g.addColorStop(0.25, `rgba(${e.c},${0.8 * (1 - k)})`); g.addColorStop(0.7, `rgba(${e.c},${0.25 * (1 - k)})`); g.addColorStop(1, `rgba(${e.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -8 * z, R, 0, 7); ctx.fill(); ctx.restore();
        const g2 = ctx.createRadialGradient(0, -30 * z * k, 0, 0, -30 * z * k, R * 0.6); g2.addColorStop(0, `rgba(255,220,150,${0.6 * (1 - k)})`); g2.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, -30 * z * k, R * 0.6, 0, 7); ctx.fill();
      }
      ctx.scale(1, 0.5);
      ctx.strokeStyle = `rgba(${e.c},${0.9 * (1 - k)})`; ctx.lineWidth = (e.kind === 'wave' ? 16 : 6) * z; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    } else if (e.kind === 'shatter') {   // ice crystals bursting out of the ground
      const [x, y] = cam.toScreen(e.x, e.y); ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter';
      const grow = Math.min(1, k * 5), fade = 1 - Math.max(0, (k - 0.5) * 2);
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + e.seed, L = (18 + ((i * 37) % 5) * 7) * z * e.r * grow, w = 5 * z;
        const tx = Math.cos(a) * L, ty = Math.sin(a) * L * 0.5 - L * 0.9;
        ctx.fillStyle = `rgba(200,245,255,${0.85 * fade})`; ctx.strokeStyle = `rgba(110,200,255,${0.9 * fade})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a + 1.57) * w, Math.sin(a + 1.57) * w * 0.5); ctx.lineTo(tx, ty); ctx.lineTo(Math.cos(a - 1.57) * w, Math.sin(a - 1.57) * w * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      const g = ctx.createRadialGradient(0, -10 * z, 0, 0, -10 * z, 50 * z * e.r); g.addColorStop(0, `rgba(200,240,255,${0.6 * fade})`); g.addColorStop(1, 'rgba(100,180,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -10 * z, 50 * z * e.r, 0, 7); ctx.fill();
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    } else if (e.kind === 'meteor') {   // falling rock of fire
      const p = Math.min(1, k); const [x, y] = cam.toScreen(e.x, e.y, (1 - p) * 9); const [gx, gy] = cam.toScreen(e.x, e.y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.save(); ctx.translate(gx, gy); ctx.scale(1, 0.5); ctx.strokeStyle = `rgba(255,120,40,${0.4 + p * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, e.r * 45 * z * (1.2 - p * 0.2), 0, 7); ctx.stroke(); ctx.restore();
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40 * z); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.3, 'rgba(255,150,40,0.9)'); g.addColorStop(1, 'rgba(255,50,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 40 * z, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,140,50,0.6)'; ctx.lineWidth = 14 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 60 * z, y - 120 * z); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (e.kind === 'aura') {   // war cry
      const pl = G.player; const [x, y] = cam.toScreen(pl.x, pl.y); ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const kk = (k * 3 + i / 3) % 1; ctx.strokeStyle = `rgba(255,200,80,${0.7 * (1 - kk)})`; ctx.lineWidth = 5 * z; ctx.beginPath(); ctx.arc(0, 0, 20 * z + kk * 110 * z, 0, 7); ctx.stroke(); }
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
    } else if (e.kind === 'bolt') {
      const [x1, y1] = cam.toScreen(e.x1, e.y1, 1.1), [x2, y2] = cam.toScreen(e.x2, e.y2, 1.0);
      ctx.globalCompositeOperation = 'lighter';
      const pts = [[x1, y1]]; let s = e.seed; const n = 9;
      for (let i = 1; i < n; i++) { s = (s * 9301 + 49297) % 233280; const t = i / n; const j = (s / 233280 - 0.5) * 34 * z; pts.push([x1 + (x2 - x1) * t + j, y1 + (y2 - y1) * t + j * 0.6]); }
      pts.push([x2, y2]);
      for (const [w, a, c] of [[16 * z, 0.18, '150,140,255'], [7 * z, 0.45, '190,180,255'], [2.5 * z, 1, '255,255,255']]) { ctx.strokeStyle = `rgba(${c},${a * (1 - k)})`; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const [px, py] of pts) ctx.lineTo(px, py); ctx.stroke(); }
      // side forks
      ctx.strokeStyle = `rgba(200,190,255,${0.7 * (1 - k)})`; ctx.lineWidth = 1.5 * z;
      for (let i = 2; i < n - 1; i += 3) { const [px, py] = pts[i]; s = (s * 9301 + 49297) % 233280; const a = s / 233280 * 6.28; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 22 * z, py + Math.sin(a) * 14 * z); ctx.lineTo(px + Math.cos(a + 0.6) * 36 * z, py + Math.sin(a + 0.6) * 22 * z); ctx.stroke(); }
      const g = ctx.createRadialGradient(x2, y2, 0, x2, y2, 34 * z); g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - k)})`); g.addColorStop(1, 'rgba(150,140,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x2, y2, 34 * z, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
function drawParticles() {
  const cam = G.cam, z = cam.zoom;
  for (const p of G.particles) {
    const [x, y] = cam.toScreen(p.x, p.y, p.z); const a = 1 - p.t / p.life;
    if (p.add) ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${a})`; const s = p.size * z * (p.add ? a * 0.7 + 0.3 : 1);
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
    if (p.add) ctx.globalCompositeOperation = 'source-over';
  }
}
function drawBars() {
  const cam = G.cam, z = cam.zoom;
  for (const e of G.enemies) {
    if (e.dead || e.D.boss) continue;
    const show = e.hp < e.maxHP || e.D.elite || e.champion; if (!show) continue;
    const [x, y] = cam.toScreen(e.x, e.y, e.D.mini ? 1.9 * (e.D.scale || 1) + 0.3 : e.D.elite ? 2.6 : 2.05); const w = (e.D.elite || e.champion ? 60 : 38) * Math.min(1.2, z);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = e.D.mini ? '#e0302a' : e.D.elite ? '#e8a42a' : e.champion ? '#5aa0ff' : '#c8302a'; ctx.fillRect(x - w / 2, y, w * e.hp / e.maxHP, 4);
    if (e.D.elite || e.champion) { ctx.font = `600 ${Math.round(11 * Math.min(1.2, z))}px Georgia, serif`; ctx.textAlign = 'center'; ctx.fillStyle = e.D.mini ? '#ff8a70' : e.D.elite ? '#f0c060' : '#9cc4ff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(e.name, x, y - 5); ctx.fillText(e.name, x, y - 5); }
    let sx = x - w / 2; const st = e.st; ctx.font = `${Math.round(10 * z)}px sans-serif`; ctx.textAlign = 'left';
    for (const [on, c] of [[st.burn > 0, '#ff8a3c'], [st.frozen > 0 || st.slowT > 0, '#8fdcff'], [st.shock > 0, '#c8b4ff'], [st.bleed > 0, '#d02020'], [st.stun > 0, '#ffe070']]) if (on) { ctx.fillStyle = c; ctx.fillRect(sx, y + 6, 6, 3); sx += 8; }
  }
}
function drawPickupsGround() {
  const cam = G.cam, z = cam.zoom, icons = getAtlas('icons');
  for (const p of G.pickups) {
    const bob = Math.min(1, p.t / 0.35); const hop = Math.sin(bob * Math.PI) * 0.6;
    const [x, y] = cam.toScreen(p.x, p.y, hop);
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
    if (p.kind === 'item') {
      const col = RARITY[p.item.rarity].color;
      if (p.item.rarity >= 1) { // loot beam
        ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(x, y - 90 * z, x, y); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col + '88'); ctx.fillStyle = g; ctx.fillRect(x - 5 * z, y - 90 * z, 10 * z, 90 * z); ctx.globalCompositeOperation = 'source-over';
      }
      if (icons) drawFrame(ctx, icons, iconOf(p.item), x - 16 * z, y - 26 * z, 32 * z / 96 * 1.0);
    } else if (icons) {
      const n = p.kind === 'gold' ? 'gold' : p.potion === 'hp' ? 'potion_hp' : 'potion_mp';
      const s = (p.kind === 'gold' ? Math.min(30, 16 + p.amount * 0.3) : 26) * z;
      drawFrame(ctx, icons, n, x - s / 2, y - s * 0.8, s / 96);
    }
  }
}
function drawPickupLabels() {
  const cam = G.cam, z = cam.zoom; ctx.textAlign = 'center'; ctx.font = `600 ${Math.round(11 * Math.min(1.25, z))}px Georgia, serif`;
  for (const p of G.pickups) {
    if (p.kind !== 'item') continue;
    const [x, y] = cam.toScreen(p.x, p.y, 0.9); const t = p.item.name; const w = ctx.measureText(t).width + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(x - w / 2, y - 13, w, 16); ctx.fillStyle = RARITY[p.item.rarity].color; ctx.fillText(t, x, y);
  }
}
function drawTexts() {
  const cam = G.cam, z = Math.min(1.3, cam.zoom);
  ctx.textAlign = 'center';
  for (const t of G.texts) {
    const k = t.t / t.life; const [x, y] = cam.toScreen(t.x + t.dx, t.y, t.z + k * 0.9);
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    const size = (t.big ? 20 : 14) * z * (k < 0.12 ? 1 + (0.12 - k) * 3 : 1);
    ctx.font = `bold ${Math.round(size)}px Georgia, serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(t.text, x, y); ctx.fillStyle = t.color; ctx.fillText(t.text, x, y);
  }
  ctx.globalAlpha = 1;
}
function drawInteractMarker() {
  const it = G.focus; if (!it) return;
  const [x, y] = G.cam.toScreen(it.x, it.y); const z = G.cam.zoom; const p = 1 + Math.sin(G.time * 5) * 0.08;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.strokeStyle = 'rgba(255,215,120,0.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -G.time * 20;
  ctx.beginPath(); ctx.arc(0, 0, 34 * z * p, 0, 7); ctx.stroke(); ctx.restore();
}

// quest guide: a golden arrow on the ground pointing toward the current objective
function drawGuide() { drawArrow(G.guide, 'gv', '255,210,90'); if (G.huntGuide && G.huntGuide !== G.guide) drawArrow(G.huntGuide, 'hgv', '255,70,50', 0.27); }
function drawArrow(t, key, rgb, off = 0) {
  const P = G.player; if (!t || P.dead) return;
  const dx = t.x - P.x, dy = t.y - P.y, d = Math.hypot(dx, dy); if (d < 4) return;
  let vx = dx / d, vy = dy / d;
  if (G.zone.dark) { const g = G.zone.map.guideDir(P.x, P.y, t.x, t.y); if (g) { vx = g[0]; vy = g[1]; } }
  const gv = G[key] || (G[key] = [vx, vy]); gv[0] += (vx - gv[0]) * 0.12; gv[1] += (vy - gv[1]) * 0.12; const gl = Math.hypot(gv[0], gv[1]) || 1; vx = gv[0] / gl; vy = gv[1] / gl;
  const cam = G.cam, z = cam.zoom; const pulse = (G.time * 1.5) % 1;
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const k = 1.1 + off + i * 0.55 + pulse * 0.55;
    const [x, y] = cam.toScreen(P.x + vx * k, P.y + vy * k); const [x2, y2] = cam.toScreen(P.x + vx * (k + 0.3), P.y + vy * (k + 0.3));
    const a = Math.atan2(y2 - y, x2 - x); const al = (i === 0 ? pulse : i === 2 ? 1 - pulse : 1) * 0.85;
    ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = `rgba(${rgb},${al})`;
    ctx.beginPath(); ctx.moveTo(9 * z, 0); ctx.lineTo(-5 * z, -7 * z); ctx.lineTo(-2 * z, 0); ctx.lineTo(-5 * z, 7 * z); ctx.closePath(); ctx.fill();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  ctx.restore();
}

// name plates + pulsing marker for important village objects (notice board)
function drawPlates() {
  const cam = G.cam, z = cam.zoom;
  for (const it of G.zone.inter) {
    if (it.glow && !it.hidden) { const [sx, sy] = cam.toScreen(it.x, it.y); ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.5); ctx.globalCompositeOperation = 'lighter'; const p = 0.45 + Math.sin(G.time * 3 + it.x) * 0.2; ctx.strokeStyle = `rgba(120,230,255,${p})`; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(0, 0, 26 * z, 0, 7); ctx.stroke(); ctx.fillStyle = `rgba(120,230,255,${p * 0.25})`; ctx.fill(); ctx.restore(); ctx.font = `bold ${Math.round(16 * z)}px Georgia`; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(160,240,255,${p + 0.2})`; ctx.fillText('+', sx, sy + 5 * z); }
    if (!it.plate) continue;
    const [x, y] = cam.toScreen(it.x, it.y);
    // glowing ground ring
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.globalCompositeOperation = 'lighter';
    const p = 0.5 + Math.sin(G.time * 3) * 0.2;
    ctx.strokeStyle = `rgba(255,205,90,${p})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 46 * z, 0, 7); ctx.stroke(); ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    const locked = it.reqLevel && G.profile.level < it.reqLevel;
    const label = it.plate + (it.reqLevel ? ` · ур. ${it.reqLevel}+` : '');
    const ty = y - 105 * z; ctx.font = `600 ${Math.round(13 * Math.min(1.2, z))}px Georgia, serif`; ctx.textAlign = 'center';
    const tw = ctx.measureText(label).width + 14;
    ctx.fillStyle = locked ? 'rgba(50,10,10,0.88)' : 'rgba(40,26,8,0.85)'; ctx.fillRect(x - tw / 2, ty - 14, tw, 19); ctx.strokeStyle = locked ? '#c0463c' : '#c99a3c'; ctx.lineWidth = 1; ctx.strokeRect(x - tw / 2, ty - 14, tw, 19);
    ctx.fillStyle = locked ? '#ff8a7a' : '#ffd98a'; ctx.fillText((locked ? '🔒 ' : '') + label, x, ty);
    if (it.marker) { const b = Math.sin(G.time * 4) * 4; ctx.font = `bold ${Math.round(28 * z)}px Georgia, serif`; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(it.marker, x, ty - 20 + b); ctx.fillStyle = '#ffd24a'; ctx.fillText(it.marker, x, ty - 20 + b); }
  }
}

function drawBlades() {
  const b = G.run && G.run.blades; if (!b || !(G.run.boons || []).includes('blades')) return;
  const z = G.cam.zoom; ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, a] of b) {
    const [sx, sy] = G.cam.toScreen(x, y, 1.0);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a * 3);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22 * z); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.4, 'rgba(200,190,255,0.5)'); g.addColorStop(1, 'rgba(120,90,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 22 * z, 6 * z, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
}
