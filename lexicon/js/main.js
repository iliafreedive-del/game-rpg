// Boot, zone switching, input (tap to walk / tap to talk, WASD + E) and the main loop.
import { setBase, loadGroup } from './engine/assets.js';
import { G, Zone, loadMaps, makePlayer, updatePlayer, findPath, keys } from './world.js';
import { initRenderer, render, loadFloor, pickScreen } from './render.js';
import { S, load, save, reset, setOnLevel, has } from './state.js';
import { ui, hud, endDialog, openJournal, openEcho, openSettings, closeOver, toast, refreshTokens } from './ui.js';
import { objects, marker, START, onEnter, intro } from './story.js';
import { sfx } from './speech.js';

setBase('assets/');
const $ = id => document.getElementById(id);
const ATLASES = ['props', 'hero_body', 'npc_elder', 'npc_merchant', 'npc_smith', 'npc_trainer', 'elite', 'boss', 'skel_warrior'];

async function enterZone(id, pos) {
  S.zone = id; const Z = new Zone(id, objects(id)); await loadFloor(Z);
  G.zone = Z; const p = pos || START[id];
  const [x, y] = Z.map.nearestFree(p[0], p[1], 0.3);
  if (!G.player) G.player = makePlayer(x, y); else { G.player.x = x; G.player.y = y; }
  G.cam.x = x; G.cam.y = y; G.path = null; G.target = null; G.torch = id !== 'village' && has('fire');
  S.pos = [x, y]; save();
}
function rebuild() {   // world changed (door opened, guard moved…): rebuild objects, keep the hero where he is
  const Z = new Zone(S.zone, objects(S.zone)); Z.floorImgs = G.zone.floorImgs; G.zone = Z; G.torch = S.zone !== 'village' && has('fire');
}
ui.onChange = () => { if (G.zone) for (const a of G.zone.actors) { const o = G.zone.inter.find(o => o.actorRef === a); if (o && o.id) a.marker = marker(o.id); } G.torch = S.zone !== 'village' && has('fire'); };

let using = false;
async function interact(o) {
  if (using || ui.busy || ui.over) return; using = true; G.path = null; G.target = null;
  if (o.actorRef) { const P = G.player, a = o.actorRef; a.dir = faceDir(P.x - a.x, P.y - a.y, a.kind); a.clip = a.kind === 'npc' ? 'talk' : 'idle'; }
  let r;
  try { r = await o.use(); } catch (e) { console.error(e); }
  endDialog();
  if (o.actorRef) o.actorRef.clip = 'idle';
  if (typeof r === 'string' && r.startsWith('go:')) {
    const to = r.slice(3); await fade(async () => { await enterZone(to, to === 'village' ? (S.flags.king_done ? [9.6, 9.4] : [9.6, 9.4]) : null); });
    using = false; await runScript(() => onEnter(to)); return;
  }
  if (r === 'tp:entry') await fade(async () => { rebuild(); G.player.x = START.entry[0]; G.player.y = START.entry[1]; G.cam.x = G.player.x; G.cam.y = G.player.y; });
  else rebuild();
  save(); hud(); using = false;
}
async function runScript(fn) { using = true; try { await fn(); } catch (e) { console.error(e); } endDialog(); rebuild(); hud(); using = false; }
function faceDir(dx, dy, kind) { const a = Math.atan2(dy, dx); const d = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; return d; }
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
function onTap(e) {
  if (ui.busy || ui.over || using) return;
  const o = pickScreen(e.clientX, e.clientY);
  if (o) { const P = G.player; if (Math.hypot(o.x - P.x, o.y - P.y) < o.r) return interact(o); G.target = o; G.path = findPath(o.x, o.y); if (!G.path) G.target = null; return; }
  const [wx, wy] = G.cam.toWorld(e.clientX, e.clientY); G.target = null; G.path = findPath(wx, wy);
}
function initInput() {
  const cv = $('game'); let down = null;
  cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  cv.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 18) onTap(e); down = null; });
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    keys.add(e.code);
    if (ui.busy) return;
    if (e.code === 'Escape' && ui.over) closeOver();
    if (ui.over) return;
    if ((e.code === 'KeyE' || e.code === 'Space') && !e.repeat) { const o = nearest(); if (o) { e.preventDefault(); interact(o); } }
    if (e.code === 'KeyJ') openJournal(); if (e.code === 'KeyR' && S.flags.echo) openEcho();
  });
  addEventListener('keyup', e => keys.delete(e.code)); addEventListener('blur', () => keys.clear());
  $('bJournal').onclick = () => { sfx('tap'); openJournal(); };
  $('bEcho').onclick = () => { sfx('tap'); openEcho(); };
  $('bSet').onclick = () => { sfx('tap'); openSettings(() => { reset(); location.reload(); }); };
  $('act').onclick = () => { const o = nearest(); if (o) interact(o); };
}

// ---------------------------------------------------------------- loop
let last = performance.now(), saveT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; G.time += dt;
  G.lock = ui.busy || ui.over || using ? 1 : 0;
  updatePlayer(dt);
  const P = G.player;
  if (P && G.zone) {
    G.cam.follow(P.x, P.y, dt, 6);
    if (G.target && !using && Math.hypot(G.target.x - P.x, G.target.y - P.y) < G.target.r) { const o = G.target; G.target = null; G.path = null; interact(o); }
    if (G.target && !G.path && !P.moving) G.target = null;
    const n = !G.lock ? nearest() : null; G.near = n;
    const a = $('act'); if (n) { a.classList.remove('hidden'); a.textContent = n.btn || n.icon || '✋'; } else a.classList.add('hidden');
    if (G.scare) { /* skeleton rising over the opened tomb */ }
    saveT += dt; if (saveT > 4) { saveT = 0; S.pos = [P.x, P.y]; save(); }
    render();
  }
  requestAnimationFrame(frame);
}

async function boot() {
  const had = load();
  initRenderer($('game'));
  const bar = $('loadBar');
  await loadMaps();
  await loadGroup(ATLASES, p => { bar.style.width = Math.round(p * 90) + '%'; });
  setOnLevel(l => { sfx('level'); toast(`⭐ Новый ранг: ${['', 'Чужак', 'Слушатель', 'Ученик', 'Подмастерье слов', 'Толмач', 'Знаток', 'Мудрец', 'Хранитель слов', 'Голос Стиллфорда'][Math.min(9, l)]} · 🕯️ +1 свеча`, 'page'); });
  await enterZone(S.zone || 'village', S.pos);
  bar.style.width = '100%';
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
window.LEX = { G, S, interact, enterZone, rebuild };
boot().catch(e => { console.error(e); $('loadMsg').textContent = 'Не удалось загрузить игру: ' + e.message; });
