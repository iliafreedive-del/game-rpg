// Boot, zone switching, input (tap to walk / tap to talk, WASD + E) and the main loop — 3D edition.
import * as X from './gfx.js';
import { G, Zone, makePlayer, updatePlayer, updateActors, updateLights, updateOcclusion, drawOverlay, findPath, pickScreen, keys } from './world.js';
import { VILLAGE, RUINS, villageAnimals, loadRuinRows } from './zones.js';
import { S, load, save, reset, setOnLevel, has } from './state.js';
import { ui, hud, endDialog, openJournal, openEcho, openSettings, closeOver, toast, refreshTokens } from './ui.js';
import { objects, marker, START, onEnter, intro } from './story.js';
import { sfx } from './speech.js';

const $ = id => document.getElementById(id);
const DEFS = { village: VILLAGE, deep: RUINS };
const MODELS = ['archer_raven', 'npc_elder', 'npc_merchant', 'npc_smith', 'npc_trainer', 'npc_caravan', 'npc_fortune', 'elite_guard_m', 't_mb_king_m', 'skel_warrior_m'];
const torchOn = () => S.zone !== 'village' && has('fire');

function setZone(Z) { if (G.zone) G.zone.detach(); G.zone = Z; Z.attach(); }
function enterZone(id, pos) {
  S.zone = id; const def = DEFS[id];
  X.setMood(def.mood);
  setZone(new Zone(id, def, objects(id)));
  const p = pos || START[id];
  const [x, y] = G.zone.map.nearestFree(p[0], p[1], 0.3);
  if (!G.player) G.player = makePlayer(x, y); else { G.player.x = x; G.player.y = y; }
  G.player.char.root.position.set(x, 0, y);
  if (G.player.char.root.parent !== X.V.scene) X.V.scene.add(G.player.char.root);
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
  if (a) { a.root.rotation.y = Math.atan2(P.x - o.x, P.y - o.y); a.state = 'talk'; P.face = Math.atan2(o.x - P.x, o.y - P.y); }
  let r;
  try { r = await o.use(); } catch (e) { console.error(e); }
  endDialog();
  if (a) a.state = 'idle';
  if (typeof r === 'string' && r.startsWith('go:')) {
    const to = r.slice(3); await fade(async () => { enterZone(to, to === 'village' ? START.fromDeep : null); });
    using = false; await runScript(() => onEnter(to)); return;
  }
  if (r === 'tp:entry') await fade(async () => { rebuild(); P.x = START.entry[0]; P.y = START.entry[1]; X.placeCamera(P.x, P.y, 0, true); });
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
function onTap(e) {
  if (ui.busy || ui.over || using) return;
  const o = pickScreen(e.clientX, e.clientY);
  if (o) { const P = G.player; if (Math.hypot(o.x - P.x, o.y - P.y) < o.r) return interact(o); G.target = o; G.path = findPath(o.x, o.y); if (!G.path) G.target = null; return; }
  const w = X.screenToGround(e.clientX, e.clientY); if (!w) return; G.target = null; G.path = findPath(w[0], w[1]);
}
function initInput() {
  const cv = $('game'); let down = null;
  cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
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
let last = performance.now(), saveT = 0, fpsT = 0, fpsN = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; G.time += dt;
  G.lock = ui.busy || ui.over || using ? 1 : 0;
  const P = G.player;
  if (P && G.zone) {
    updatePlayer(dt); updateActors(dt); updateLights();
    X.placeCamera(P.x, P.y, dt); updateOcclusion(dt);
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
  const data = await X.preloadChars(MODELS); MODELS.forEach((m, i) => G.skinsReady.set(m, data[i]));
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
