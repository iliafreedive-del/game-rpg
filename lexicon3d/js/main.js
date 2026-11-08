// Boot, zone switching, input (tap to walk / tap to talk, WASD + E) and the main loop — 3D edition.
import * as X from './gfx.js';
import { G, Zone, makePlayer, updatePlayer, updateActors, updateLights, updateOcclusion, drawOverlay, findPath, pickScreen } from './world.js';
import { initActors, preloadActors, tickShaders } from './actors.js';
import { input, initInput as initJoy, releaseJoy, releaseInput } from './input.js';
import { VILLAGE, RUINS, villageAnimals, loadRuinRows } from './zones.js';
import { S, load, save, reset, setOnLevel, has } from './state.js';
import { ui, hud, endDialog, openJournal, openEcho, openSettings, closeOver, toast, refreshTokens } from './ui.js';
import { objects, marker, START, onEnter, intro } from './story.js';
import { sfx } from './speech.js';

const $ = id => document.getElementById(id);
const DEFS = { village: VILLAGE, deep: RUINS };
const torchOn = () => S.zone !== 'village' && has('fire');

function setZone(Z) { if (G.zone) G.zone.detach(); G.zone = Z; Z.attach(); }
function enterZone(id, pos) {
  S.zone = id; const def = DEFS[id];
  X.setMood(def.mood);
  setZone(new Zone(id, def, objects(id)));
  const p = pos || START[id];
  const [x, y] = G.zone.map.nearestFree(p[0], p[1], 0.3);
  if (!G.player) G.player = makePlayer(x, y); else { G.player.x = x; G.player.y = y; }
  G.player.char.root.position.set(x, 0, y); G.player.px = x; G.player.py = y; G.camL = [0, 0];
  if (G.player.char.root.parent !== X.V.scene) G.player.char.attach(X.V.scene);
  G.near = null; G.panelDismissed = null;
  X.placeCamera(x, y, 0, true); G.path = null; G.target = null; G.torch = torchOn();
  S.pos = [x, y]; save();
}
function rebuild() {   // world changed (door opened, guard moved…): rebuild story objects, keep the hero where he is
  setZone(new Zone(S.zone, DEFS[S.zone], objects(S.zone))); G.torch = torchOn();
}
ui.onChange = () => { if (G.zone) for (const a of G.zone.actors) { const o = G.zone.inter.find(o => o.actorRef === a); if (o && o.id) a.marker = marker(o.id); } G.torch = torchOn(); };

let using = false;
async function interact(o) {
  if (using || ui.busy || ui.over) return; using = true; G.path = null; G.target = null;
  const P = G.player, a = o.actorRef;
  if (a) { a.face(Math.atan2(P.x - o.x, P.y - o.y)); a.state = 'talk'; P.face = Math.atan2(o.x - P.x, o.y - P.y); }
  releaseJoy();
  let r;
  try { r = await o.use(); } catch (e) { console.error(e); }
  endDialog();
  if (a) { a.state = 'idle'; a.face(a.home ?? 0); G.panelDismissed = o; }
  if (typeof r === 'string' && r.startsWith('go:')) {
    const to = r.slice(3); await fade(async () => { enterZone(to, to === 'village' ? START.fromDeep : null); });
    using = false; await runScript(() => onEnter(to)); return;
  }
  if (r === 'tp:entry') await fade(async () => { rebuild(); P.x = P.px = START.entry[0]; P.y = P.py = START.entry[1]; G.camL = [0, 0]; G.panelDismissed = null; X.placeCamera(P.x, P.y, 0, true); });
  else rebuild();
  save(); hud(); using = false;
}
async function runScript(fn) { using = true; try { await fn(); } catch (e) { console.error(e); } endDialog(); rebuild(); hud(); using = false; }
function fade(fn) {
  const f = $('fade'); f.classList.add('on');
  return new Promise(res => setTimeout(async () => { await fn(); setTimeout(() => { f.classList.remove('on'); res(); }, 120); }, 380));
}

// ---------------------------------------------------------------- input
function nearest() {
  const P = G.player; let best = null, bd = 1e9;
  for (const o of G.zone.inter) { if (o.hidden) continue; const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < o.r && d < bd) { bd = d; best = o; } }
  return best;
}
function onTap(sx, sy) {
  if (ui.busy || ui.over || using) return;
  // Umbrahold: a short tap on something — run to it and use it; a tap on empty ground does nothing (the joystick moves)
  const o = pickScreen(sx, sy); if (!o) return;
  const P = G.player; if (Math.hypot(o.x - P.x, o.y - P.y) < o.r) return interact(o);
  G.target = o; G.path = findPath(o.x, o.y); if (!G.path) G.target = null;
}
// zoom like Umbrahold core/camzoom.js: mouse wheel / trackpad pinch, two-finger pinch; saved per device
const ZK = 'lexicon3d-zoom';
function setZoom(z) { X.CAM.zoom = Math.min(X.ZOOM.max, Math.max(X.ZOOM.min, z)); try { localStorage.setItem(ZK, X.CAM.zoom); } catch (e) { } }
function initZoom() {
  try { const z = +localStorage.getItem(ZK); if (z) X.CAM.zoom = X.CAM.uz = Math.min(X.ZOOM.max, Math.max(X.ZOOM.min, z)); } catch (e) { }
  addEventListener('wheel', e => {
    if (ui.over || ui.busy || (e.target.closest && e.target.closest('.dlg, #over, #card'))) return;
    e.preventDefault(); const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    setZoom(X.CAM.zoom * Math.exp(Math.max(-120, Math.min(120, d)) * (e.ctrlKey ? 0.01 : 0.0006)));
  }, { passive: false });
  const pts = new Map(); let base = 0, z0 = 1, on = false, pair = false;
  const gap = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const cv = $('game');
  cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: e.timeStamp });
    if (pts.size === 2) { base = gap(); z0 = X.CAM.zoom; on = false; const [a, b] = [...pts.values()]; pair = Math.abs(a.t - b.t) < 250; } }, true);
  addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY;
    if (pts.size !== 2 || !pair || base < 30) return; const g = gap();
    if (!on) { const moved = [...pts.values()].some(q => Math.hypot(q.x - q.sx, q.y - q.sy) > 12); if (!moved || Math.abs(g - base) < 28) return; on = true; base = g; z0 = X.CAM.zoom; releaseJoy(); }
    setZoom(z0 * base / Math.max(1, g)); }, true);
  for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => { pts.delete(e.pointerId); if (pts.size < 2) { base = 0; on = false; } }, true);
}
function initInput() {
  initJoy($('game'), $('joyBase'), $('joyKnob'));
  input.onTap = onTap;
  input.anchor = () => { const P = G.player; const [x, y] = X.toScreen(P.x, 1.0, P.y); return [x, y]; };
  input.onKey = (code, e) => {
    if (ui.busy) return;
    if (code === 'Escape' && ui.over) closeOver();
    if (ui.over) return;
    if (code === 'KeyE' || code === 'Space') { const o = nearest(); if (o) { e.preventDefault(); interact(o); } }
    if (code === 'KeyJ') openJournal(); if (code === 'KeyR' && S.flags.echo) openEcho();
  };
  initZoom();
  $('bJournal').onclick = () => { sfx('tap'); releaseInput(); openJournal(); };
  $('bEcho').onclick = () => { sfx('tap'); releaseInput(); openEcho(); };
  $('bSet').onclick = () => { sfx('tap'); releaseInput(); openSettings(() => { reset(); location.reload(); }); };
  $('act').onclick = () => { const o = nearest(); if (o) interact(o); };
}
// Umbrahold game.js: walking up to a villager opens the talk by itself (panel); after it closes it does not reopen
// until the hero has stepped away. Objects (well, chests, doors) keep the action button and tap.
function approach() {
  if (G.noApproach) return;
  const P = G.player; let pt = null, pd = 1e9;
  for (const o of G.zone.inter) { if (!o.actorRef || o.hidden) continue; const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < o.r + 0.3 && d < pd) { pd = d; pt = o; } }
  const away = G.panelDismissed && Math.hypot(G.panelDismissed.x - P.x, G.panelDismissed.y - P.y) > G.panelDismissed.r + 0.4;
  if (away || (G.panelDismissed && G.panelDismissed.id && !G.zone.inter.some(o => o.id === G.panelDismissed.id))) G.panelDismissed = null;
  if (pt && G.panelDismissed && (pt === G.panelDismissed || pt.id === G.panelDismissed.id)) pt = null;
  if (pt && !using && !ui.busy && !ui.over && $('hud') && !$('hud').classList.contains('hidden')) interact(pt);
}

// ---------------------------------------------------------------- loop
let last = performance.now(), saveT = 0, fpsT = 0, fpsN = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; G.time += dt;
  G.lock = ui.busy || ui.over || using ? 1 : 0;
  const P = G.player;
  if (P && G.zone) {
    tickShaders(G.time); updatePlayer(dt); updateActors(dt); updateLights();
    // camera a little ahead of the hero along the run (Umbrahold CAMERA.follow.lead 0.25 s)
    { const k = 1 - Math.exp(-3 * dt), vx = (P.x - (G.cpx ?? P.x)) / Math.max(dt, 1e-3), vy = (P.y - (G.cpy ?? P.y)) / Math.max(dt, 1e-3), sp = Math.hypot(vx, vy), lim = sp > 9 ? 9 / sp : 1;
      G.camL[0] += (vx * lim * 0.25 - G.camL[0]) * k; G.camL[1] += (vy * lim * 0.25 - G.camL[1]) * k; G.cpx = P.x; G.cpy = P.y; }
    X.placeCamera(P.x + G.camL[0], P.y + G.camL[1], dt); updateOcclusion(dt);
    if (!G.lock) approach();
    if (G.target && !using && Math.hypot(G.target.x - P.x, G.target.y - P.y) < G.target.r) { const o = G.target; G.target = null; G.path = null; interact(o); }
    if (G.target && !G.path && !P.moving) G.target = null;
    const n = !G.lock ? nearest() : null; G.near = n;
    const a = $('act'); if (n) { a.classList.remove('hidden'); a.textContent = n.btn || n.icon || '✋'; } else a.classList.add('hidden');
    saveT += dt; if (saveT > 4) { saveT = 0; S.pos = [P.x, P.y]; save(); }
    X.render(); drawOverlay();
    // adaptive quality: drop pixel ratio if the device struggles
    fpsT += dt; fpsN++; if (fpsT > 3) { const fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if (fps < 28 && X.V.dpr > 1) { X.V.low = true; X.resize(); } }
  }
  requestAnimationFrame(frame);
}

async function boot() {
  const had = load();
  X.initGfx($('game'), $('ov'));
  const bar = $('loadBar'), msg = $('loadMsg');
  const step = (k, t) => { bar.style.width = Math.round(k * 100) + '%'; if (t) msg.textContent = t; };
  step(0.02, 'Загрузка мира…');
  await X.loadPacks(X.PACKS, p => step(0.05 + p * 0.55));
  step(0.62, 'Загрузка жителей…');
  initActors(X.V.scene); await preloadActors();
  step(0.82, 'Строим оазис…');
  await loadRuinRows();
  // build the village kit now and add its animals
  const vz = new Zone('village', VILLAGE, []); await villageAnimals(vz.st);
  setOnLevel(l => { sfx('level'); toast(`⭐ Новый ранг: ${['', 'Чужак', 'Слушатель', 'Ученик', 'Подмастерье слов', 'Толмач', 'Знаток', 'Мудрец', 'Хранитель слов', 'Голос Стиллфорда'][Math.min(9, l)]} · 🕯️ +1 свеча`, 'page'); });
  enterZone(S.zone || 'village', S.pos);
  X.render(); step(1);
  initInput(); hud();
  $('loading').classList.add('hidden');
  const start = $('start'); start.classList.remove('hidden');
  $('stTitle').textContent = had && S.flags.met_bram ? 'Продолжить' : 'Начать путь';
  $('stBtn').onclick = async () => {
    start.classList.add('hidden'); $('hud').classList.remove('hidden'); sfx('ok');
    if (!S.flags.intro) { S.flags.intro = 1; await runScript(intro); }
    refreshTokens();
  };
  requestAnimationFrame(frame);
}
window.LEX = { G, S, X, interact, enterZone, rebuild, nearest };
boot().catch(e => { console.error(e); $('loadMsg').textContent = 'Не удалось загрузить игру: ' + e.message; });
