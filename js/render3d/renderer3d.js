// 3D-отрисовка игры (Three.js, стиль torch.html). Читает состояние из G (герой, враги, NPC, зона) и ничего в нём не меняет:
// логика, ИИ, бой и DOM-интерфейс остаются прежними. Поверх WebGL-холста рисуется прозрачный 2D-холст игры
// (полоски жизни, цифры урона, эффекты, телеграфы) — для него камера отдаёт проекцию через G.cam.proj.
import * as THREE from '../vendor/three.module.min.js';
import { G } from '../game/ctx.js';
import { PX_PER_M } from '../core/iso.js';
import { U, setSmoothFade } from './toon.js';
import { makeKit } from './kit.js';
import { Actor, setOutlinesVisible } from './actor.js';
import { PropLayer } from './props.js';
import { buildGround } from './ground.js';
import { Atmo } from './atmo.js';
import { Critters } from './critters.js';
import { buildDungeonFloor } from './dungeon.js';
import { glowSet } from './glow.js';
import { HEROES, MOBS, NPCS, WEAPONS, WEAPON_MODEL, OFFHAND_MODEL } from './registry.js';
import { LIGHT, CAMERA, QUALITY, SHADOW, HERO } from './style.js';
import { Post } from './post.js';

const params = new URLSearchParams(location.search);
const SQ = Math.SQRT1_2;
let canvas, renderer, scene, camera, kit, W = 800, H = 450, DPR = 1;
let zone = null, world = null, lights = null, quality = '', post = null;
let LV = LIGHT.village3;                 // пресет света текущей зоны (presetFor)
const slots = [];                        // пул точечных огней: { lt, L, k } — ближайшие огни зоны, плавно появляются и гаснут
const actors = new Map();            // сущность игры → Actor
const swarmPool = new Map();         // «Жатва»: освободившиеся модели врагов по типам (чтобы не собирать геометрию заново для каждого)
const camTarget = new THREE.Vector3();
let camDist = CAMERA.village.dist, last = performance.now(), tAll = 0, spawned = false;

// ---------------------------------------------------------------- проекция для G.cam (2D-эффекты поверх 3D)
const _v = new THREE.Vector3();
export const proj = {
  toScreen(x, y, z = 0) { _v.set(x, z, y).project(camera); return [(_v.x * 0.5 + 0.5) * G.cam.w, (-_v.y * 0.5 + 0.5) * G.cam.h]; },
  toWorld(sx, sy) {
    _v.set(sx / G.cam.w * 2 - 1, -(sy / G.cam.h * 2 - 1), 0.5).unproject(camera);
    const p = camera.position, dx = _v.x - p.x, dy = _v.y - p.y, dz = _v.z - p.z, t = -p.y / (dy || -1e-6);
    return [p.x + dx * t, p.z + dz * t];
  },
};

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
// что умеет 3D-срез прямо сейчас: деревня и герой-воин (остальное рисует 2D-рендерер)
// что умеет 3D: деревня и все подземелья (катакомбы, глубины, цитадель, арена) для героя-воина; лучник и маг пока идут в 2D
// «Кровавую жатву» (рой мобов и кристаллы) пока рисует 2D; походы (wild) — 3D: снег/трава, чаща, вода, стены и башни форта
export function supports(z, profile) { return !!z && !!HEROES[(profile && profile.cls) || 'warrior']; }

export function init() {
  canvas = document.createElement('canvas'); canvas.id = 'game3d';
  document.body.insertBefore(canvas, document.getElementById('game'));
  renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
  // потеря контекста WebGL (нехватка видеопамяти/драйвер): экран чернеет, а кнопки «не работают» — сохраняем игру и перезагружаем страницу
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); try { import('../game/game.js').then(m => m.saveNow()); } catch { } setTimeout(() => location.reload(), 900); });
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  kit = makeKit(scene);
  renderer.info.autoReset = false;                      // считаем все проходы кадра (тень, сцена, постобработка) вместе
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  post = new Post(renderer);
  const L = LV;
  renderer.setClearColor(L.clear); scene.fog = new THREE.Fog(L.fog.color, L.fog.near, L.fog.far);
  lights = {
    hemi: new THREE.HemisphereLight(L.hemi.sky, L.hemi.ground, L.hemi.i), moon: new THREE.DirectionalLight(L.key.color, L.key.i),
  };
  lights.hero = new THREE.PointLight(0xffe2b8, 0, 10, 1.5);   // свет вокруг героя в подземельях (в деревне погашен)
  scene.add(lights.hemi, lights.moon, lights.moon.target, lights.hero);
  const sc = lights.moon.shadow.camera; sc.left = sc.bottom = -SHADOW.half; sc.right = sc.top = SHADOW.half; sc.near = 1; sc.far = 90;
  lights.moon.shadow.bias = SHADOW.bias; lights.moon.shadow.normalBias = SHADOW.normalBias; lights.moon.shadow.radius = SHADOW.radius; lights.moon.shadow.intensity = SHADOW.intensity; sc.updateProjectionMatrix(); sc.layers.enable(1);   // слой 1 — заменители теней крон
  U.uWindStr.value = 1;
  window.__R3 = { scene, camera, renderer, actors, post, lights, get zone() { return zone; }, get world() { return world; } };
}
export function show(on) { if (canvas) canvas.style.display = on ? 'block' : 'none'; G.cam.proj = on ? proj : null; }

export function resize(w, h) {
  W = w; H = h; if (!renderer) return;
  applyQuality(true);
  renderer.setSize(W, H, false); camera.aspect = W / H;
  camDist = W / H < 1 ? CAMERA.village.dist * Math.min(CAMERA.portrait.maxScale, 1 / (W / H) * CAMERA.portrait.refAspect) : CAMERA.village.dist;
  camera.updateProjectionMatrix();
}
// «Авто»: стартуем по типу устройства, а регулятор ниже сам опускает качество, если кадры затягиваются
let postKey = '', govLevel = null, govSlow = 0, govAcc = 0, govN = 0;
function qualityNow() {
  const q = G.profile && G.profile.settings ? G.profile.settings.quality : 'auto';
  if (q === 'low' || q === 'high' || q === 'med') return q;
  return govLevel || (matchMedia('(pointer: coarse)').matches ? 'med' : 'high');
}
function governor(dt) {
  const q = G.profile && G.profile.settings ? G.profile.settings.quality : 'auto';
  if (q !== 'auto' || quality === 'low' || document.hidden || G.paused) { govAcc = 0; govN = 0; return; }
  govAcc += Math.min(dt, 0.2); govN++;
  if (govAcc < 3) return;
  const ms = govAcc / govN * 1000; govAcc = 0; govN = 0;
  govSlow = ms > 26 ? govSlow + 1 : 0;      // медленнее ~38 к/с три окна подряд → ступенькой ниже
  if (govSlow >= 2) { govSlow = 0; govLevel = quality === 'high' ? 'med' : 'low'; applyQuality(); }
}
function applyQuality(force) {
  const q = qualityNow(); if (q === quality && !force) return; quality = q;
  const Q = QUALITY[q];
  // потолок по числу пикселей (≈3,2 Мпикс): на больших мониторах с HiDPI цели постобработки с MSAA съедали видеопамять — после смены зоны кадр мог стать чёрным
  DPR = Math.max(0.6, Math.min(window.devicePixelRatio || 1, Q.pr, Math.sqrt(3.2e6 / Math.max(1, W * H)))); renderer.setPixelRatio(DPR);
  setOutlinesVisible(q !== 'low'); if (world) { world.ground.setQuality(q); world.props.setQuality(q); if (world.atmo) world.atmo.setQuality(q); }
  const sm = Q.shadow;
  lights.hemi.intensity = LV.hemi.i * (Q.light ?? 1); lights.moon.intensity = LV.key.i * (Q.light ?? 1);
  setPointCount(zone && (zone.id === 'town' || zone.id === 'wild') ? 2 : Q.points);
  if (lights.moon.castShadow !== !!sm || lights.moon.shadow.mapSize.x !== sm) {
    lights.moon.castShadow = !!sm;
    if (sm) { lights.moon.shadow.mapSize.set(sm, sm); if (lights.moon.shadow.map) { lights.moon.shadow.map.dispose(); lights.moon.shadow.map = null; } }
    scene.traverse(o => { if (o.material && o.material.isMaterial) o.material.needsUpdate = true; });
  }
  const msaa = DPR < 1.5 ? Q.msaa : 0, pk = [Math.round(W * DPR), Math.round(H * DPR), Q.post, msaa, Q.bloom].join();
  if (pk !== postKey) { postKey = pk; post.setup(Math.round(W * DPR), Math.round(H * DPR), { enabled: Q.post, samples: msaa, levels: Q.bloom }); }   // цели постобработки пересоздаём только при смене размера/качества
  setSmoothFade(Q.post && msaa > 0);
}

// ---------------------------------------------------------------- мир зоны
function disposeWorld() {
  for (const a of actors.values()) a.dispose(); actors.clear();
  for (const l of swarmPool.values()) for (const a of l) a.dispose(); swarmPool.clear();
  if (!world) return;
  world.ground.dispose(); world.props.dispose(); world.glow.removeFromParent(); world.pool.removeFromParent(); if (world.atmo) world.atmo.dispose(); if (world.critters) world.critters.dispose(); world = null;
}
const hex = c => (c[0] << 16) | (c[1] << 8) | c[2];
// пресет света по зоне: деревня, подземелье (с биомом глубин), цитадель/арена
function presetFor(z) {
  U.uBiome.value = ({ flooded: 1, ash: 2, abyss: 3 })[z.json && z.json.biome] || 0;
  if (z.id === 'town') return { ...LIGHT.village3, look: null };
  if (z.id === 'wild') { const fj = z.json.wild.realm === 'fjord', d = z.json.wild.mood && z.json.wild.mood.dark, B = fj ? LIGHT.wildFjord : LIGHT.wildForest;
    return { ...B, hemi: d ? { ...B.hemi, i: B.hemi.i * 0.8 } : B.hemi, key: d ? { ...B.key, i: B.key.i * 0.85 } : B.key, look: null }; }
  if (z.id === 'survival') return { ...LIGHT.castle, look: { floor: 0x7a6e96, grime: 0x2a2040, moss: 0x5a3a8a } };   // арена Бездны: светло, но фиолетово
  if (z.id === 'castle') return { ...LIGHT.castle, look: { floor: 0x9a8e7a, grime: 0x4a4034, moss: 0x5a6a3a } };
  const C = LIGHT.crypt, b = C.biome[z.json && z.json.biome];
  const look = { floor: 0x7a7266, grime: 0x3a3028, moss: 0x3a5a3a };
  if (z.json && z.json.biome === 'flooded') Object.assign(look, { floor: 0x6a7a80, moss: 0x2a6a6a });
  if (z.json && z.json.biome === 'ash') Object.assign(look, { floor: 0x5a4a40, grime: 0x2a1a12, moss: 0x6a3a1a });
  if (z.json && z.json.biome === 'abyss') Object.assign(look, { floor: 0x5a5470, moss: 0x5a3a8a });
  return { ...C, look, hemi: b ? { ...C.hemi, sky: b.sky } : C.hemi, fog: b ? { ...C.fog, color: b.fog } : C.fog, clear: b ? b.fog : C.clear };
}
const wildKind = ch => ch === ',' ? 'c' : ch === 'D' ? 'p' : ch === 'x' ? 'f' : ch === '~' ? 'w' : 'g';   // земля похода: двор и тракт — плиты, под стеной — тропа
function setPointCount(n) {
  if (slots.length === n) return;
  while (slots.length > n) slots.pop().lt.removeFromParent();
  while (slots.length < n) { const lt = new THREE.PointLight(0xff9a4a, 0, 10, 1.6); scene.add(lt); slots.push({ lt, L: null, k: 0 }); }
  scene.traverse(o => { if (o.material && o.material.isMaterial) o.material.needsUpdate = true; });
}
function lightSets(z) {
  const on = z.lights.filter(l => l.on);
  const glow = glowSet(on.map(l => ({ x: l.x, y: l.z || 1, z: l.y, s: 0.3 + l.r * 0.09, c: hex(l.c), k: 0.7 })), false);   // ореол небольшой: не «засвечивает» тех, кто рядом
  const pool = glowSet(on.map(l => ({ x: l.x, y: 0.05, z: l.y, s: l.r * 0.55, c: hex(l.c), k: z.id === 'town' || z.id === 'wild' ? 0.35 : 0.5 })), true);
  scene.add(glow, pool); return { glow, pool, onKey: on.length };
}
function setZone(z) {
  disposeWorld(); zone = z; LV = presetFor(z);
  renderer.setClearColor(LV.clear); scene.fog.color.setHex(LV.fog.color); scene.fog.near = LV.fog.near; scene.fog.far = LV.fog.far;
  lights.hemi.color.setHex(LV.hemi.sky); lights.hemi.groundColor.setHex(LV.hemi.ground); lights.moon.color.setHex(LV.key.color);
  for (const s of slots) { s.L = null; s.k = 0; s.lt.intensity = 0; }
  const town = z.id === 'town', wild = z.id === 'wild', open = town || wild, fj = wild && z.json.wild.realm === 'fjord';
  const ground = wild ? buildGround(scene, z, { snow: fj, forest: !fj, kindOf: wildKind, stoneCh: '\u0000', grassK: 0.15, farColor: fj ? 0xb4c6d8 : 0x0f2418, margin: 6 }) : town ? buildGround(scene, z, { margin: z.json.big ? 14 : 3 }) : buildDungeonFloor(scene, z, LV.look), props = new PropLayer(scene, kit, z, open);
  // деревня: дым из труб, стелющийся туман, куры и собаки
  U.uHFog.value = town && z.json.village ? 0.24 : 0;   // туман у земли — только в деревне
  const atmo = town && z.json.village ? new Atmo(scene, z, props.smoke) : null, critters = town && z.json.village ? new Critters(scene, kit, z) : null;
  world = { ground, props, atmo, critters, ...lightSets(z) };
  props.cull(camera, true); applyQuality(true); ground.setQuality(quality); spawned = false;
}

// ---------------------------------------------------------------- персонажи
const yawOfDir = d => Math.PI / 2 - d * Math.PI / 4;     // направление игры (0 = +x, шаг 45°) → поворот модели вокруг Y (+Z — «вперёд»)
const ctl = a => a.ctl || (a.ctl = { px: NaN, py: NaN, v: 0, moving: false });
function measure(a, e, dt) {   // скорость по смещению, с гистерезисом ходьбы/стоянки
  const c = ctl(a); if (Number.isNaN(c.px)) { c.px = e.x; c.py = e.y; }
  const raw = Math.hypot(e.x - c.px, e.y - c.py) / Math.max(dt, 1e-3); c.px = e.x; c.py = e.y;
  c.v += (Math.min(raw, 12) - c.v) * Math.min(1, dt * 12); c.moving = c.v > (c.moving ? 0.35 : 0.8); return c;
}
const warned = new Set();
function getActor(key, def, o = {}) {
  let a = actors.get(key); if (a) return a;
  a = new Actor(def, kit, scene); actors.set(key, a);
  for (const [slot, id] of Object.entries(a.model.defaultWeapons || {})) a.equip(slot, WEAPONS[id]);
  if (o.scale) a.root.scale.setScalar(o.scale);
  return a;
}
function flashOf(e) { return e.flash > 0 ? Math.min(1, e.flash * 8) : 0; }

function syncPlayer(dt) {
  const P = G.player; if (!P) return;
  const cls = (G.profile && G.profile.cls) || 'warrior', a = getActor(P, HEROES[cls], { scale: HERO.scale });
  const wt = P.weaponType(), key = wt + cls;
  if (a.gear !== key) { a.gear = key; const wm = WEAPONS[WEAPON_MODEL[wt] || 'sword_iron'], off = OFFHAND_MODEL[cls] ? WEAPONS[OFFHAND_MODEL[cls]] : null; if (wt === 'bow') { a.equip('handL', wm); a.equip('handR', null); } else { a.equip('handR', wm); a.equip('handL', off); } }
  const c = measure(a, P, dt), an = P.anim; let clip = 'idle', k, impact, speed = 0;
  if (P.dead) { clip = 'death'; k = an.prog; }
  else if (P.state === 'dodge') { clip = 'dodge'; k = an.prog; speed = 6; }
  else if (P.state === 'attack' || P.state === 'cast') {
    clip = (P.state === 'cast' || wt === 'staff' || wt === 'bow') ? 'cast' : 'attack'; k = an.prog; impact = P.act ? P.act.impact : undefined;
    if (wt === 'bow' && P.act) {   // у лука игра ведёт два клипа подряд (натяжение, потом спуск): склеиваем в одну шкалу 0..1 для позы лучника
      impact = undefined;
      if (P.act.kind === 'bow') k = P.act.phase === 'draw' ? an.prog * 0.62 : 0.62 + an.prog * 0.38;
      else k = 0.42 + an.prog * 0.58;   // навыки лучника: короткий рывок тетивы
    }
  }
  else if (P.state === 'hit') { clip = 'hit'; k = an.prog; }
  else if (G.surv && G.surv.fireT > 0 && !c.moving) { clip = (wt === 'sword' || wt === 'axe' || wt === 'greatsword') ? 'attack' : 'cast'; k = 1 - G.surv.fireT / 0.4; if (wt === 'bow') k = 0.62 + 0.38 * k; }
  else if (c.moving) { clip = 'walk'; speed = c.v; }
  a.place(P.x, P.y); a.faceAngle(yawOfDir(P.dir));
  a.update(dt, { clip, k, impact, speed, combo: (P.combo - 1) & 1 }, env); a.flash(flashOf(P), 0xffffff);
}
function syncEnemies(dt) {
  const live = new Set(G.enemies);
  for (const [k, a] of actors) if (a.isEnemy && !live.has(k)) { a.dispose(); actors.delete(k); }
  for (const e of G.enemies) {
    let def = MOBS[e.type];
    if (!def) { if (!warned.has(e.type)) { warned.add(e.type); console.warn('[3D] нет модели моба «' + e.type + '» — показан скелет-воин'); } def = MOBS.skel_warrior; }
    const a = getActor(e, def, { scale: (e.champion ? 1.25 : 1) * (def === MOBS[e.type] ? 1 : e.r / 0.34) }); a.isEnemy = true;
    const c = measure(a, e, dt), an = e.anim; let clip = 'idle', k, impact, speed = 0;
    if (e.dead) { clip = 'death'; k = an.prog; }
    else if (e.state === 'attack') { clip = e.D.proj ? 'cast' : (e.atk && e.atk.kind) || 'attack';   /* у босса: attack2, slam, roar */ k = an.prog; impact = e.atk ? e.atk.impact : undefined; }
    else if (e.hitStun > 0) { clip = 'hit'; k = an.prog; }
    else if (c.moving) { clip = 'walk'; speed = c.v; }
    a.place(e.x, e.y); a.faceAngle(yawOfDir(e.dir));
    a.update(dt, { clip, k, impact, speed }, env); a.flash(flashOf(e), 0xffffff);
  }
}
function syncNpcs(dt) {
  for (const n of G.npcs || []) {
    if (n.echoFor) {   // Эхо павшего героя: полупрозрачный призрак (модель класса, без обводки и плаща), растворяется после слов
      const cls = n.echoFor.cls || 'warrior', a = getActor(n, HEROES[cls] || HEROES.warrior, { scale: HERO.scale });
      if (!a.ghosted) { a.ghosted = true; a.model.update = null; a.shadow.visible = false; a.root.traverse(o => { if (o.userData && o.userData.isOutline) o.visible = false; }); }
      const al = (n.alpha ?? 1) * (0.34 + Math.sin(tAll * 2 + n.x) * 0.06); for (const m of a.mats) { m.transparent = true; m.opacity = al; m.depthWrite = false; }
      a.place(n.x, n.y); a.faceAngle(yawOfDir(n.dir)); a.update(dt, { clip: 'idle' }, env); continue;
    }
    const def = NPCS[n.model] || NPCS.npc_elder, a = getActor(n, def);
    a.place(n.x, n.y); a.faceAngle(yawOfDir(n.dir));
    a.update(dt, { clip: n.talkT > 0 ? 'talk' : 'idle' }, env);
  }
}
// «Жатва Бездны»: рой — настоящие 3D-модели (по типу врага), берутся из пула и возвращаются в него после гибели
function syncSwarm(dt) {
  const S = G.surv, live = new Set(S ? S.swarm : []);
  for (const [k, a] of actors) if (a.isSwarm && !live.has(k)) { actors.delete(k); a.setVisible(false); a.root.visible = false; if (!swarmPool.has(a.swType)) swarmPool.set(a.swType, []); swarmPool.get(a.swType).push(a); }
  if (!S) return;
  for (const e of S.swarm) {
    let a = actors.get(e);
    if (!a) {
      const def = MOBS[e.type] || MOBS.skel_warrior, pool = swarmPool.get(e.type);
      a = pool && pool.length ? pool.pop() : new Actor(def, kit, scene); a.isSwarm = true; a.swType = e.type; a.root.visible = true;
      a.root.scale.setScalar(e.boss ? 1.4 : e.elite ? 1.2 : 1); actors.set(e, a);
    }
    const c = measure(a, e, dt);
    a.place(e.x, e.y); a.faceAngle(yawOfDir(e.dir));
    const hitting = e.hitCd > 0.6; a.update(dt, hitting ? { clip: 'attack', k: (0.9 - e.hitCd) / 0.3 } : { clip: 'walk', speed: Math.max(1.2, c.v) }, env); a.flash(e.flash > 0 ? Math.min(1, e.flash * 8) : 0, 0xffffff);
  }
}
const env = { wind: new THREE.Vector2() };

// ---------------------------------------------------------------- камера и свет
function updateCamera() {
  const cam = G.cam, C = CAMERA.village, aim = C.aim, dist = camDist / (G.zoomMul || 1);
  camTarget.set(cam.x - SQ * aim, CAMERA.follow.targetY, cam.y - SQ * aim);
  camera.position.set(Math.sin(CAMERA.yaw) * Math.cos(C.pitch), Math.sin(C.pitch), Math.cos(CAMERA.yaw) * Math.cos(C.pitch)).multiplyScalar(dist).add(camTarget);
  camera.lookAt(camTarget);
  const ppm = H / (2 * dist * Math.tan(CAMERA.fov * Math.PI / 360));   // пикселей на метр у цели → масштаб 2D-эффектов
  cam.zoom = ppm / PX_PER_M;
  if (cam.sx || cam.sy) { camera.position.addScaledVector(_right.set(Math.cos(CAMERA.yaw), 0, -Math.sin(CAMERA.yaw)), -cam.sx / ppm); camera.position.y += cam.sy / ppm; }
  camera.updateMatrixWorld(true);
  const P = G.player; if (P) { U.uCam.value.copy(camera.position); U.uFocus.value.set(P.x, 1.0, P.y); }
  // тень: центр ортокамеры чуть вглубь кадра, привязка к текселю карты, чтобы края теней не дрожали при движении
  const sm = lights.moon.shadow, tex = (2 * SHADOW.half) / (sm.mapSize.x || 1024);
  _sc.set(camTarget.x - SQ * SHADOW.ahead, 0, camTarget.z - SQ * SHADOW.ahead);
  _ld.set(...LV.key.offset).normalize();
  _basis.lookAt(_ld, _zero, _up); _inv.copy(_basis).invert();
  _sc.applyMatrix4(_inv); _sc.x = Math.round(_sc.x / tex) * tex; _sc.y = Math.round(_sc.y / tex) * tex; _sc.applyMatrix4(_basis);
  lights.moon.target.position.copy(_sc); lights.moon.position.copy(_sc).addScaledVector(_ld, 45);
}
const _right = new THREE.Vector3(), _off = new THREE.Vector3(), _c = new THREE.Color();
const _sc = new THREE.Vector3(), _ld = new THREE.Vector3(), _zero = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _basis = new THREE.Matrix4(), _inv = new THREE.Matrix4();
function updateLights(t, dt) {
  const P = G.player, f = 0.82 + Math.sin(t * 13) * 0.08 + Math.sin(t * 23.7) * 0.06 + Math.sin(t * 5.1) * 0.06;
  const on = zone.lights.filter(l => l.on);
  if (on.length !== world.onKey) { world.glow.removeFromParent(); world.pool.removeFromParent(); Object.assign(world, lightSets(zone)); }   // портал проявился, алтарь погас
  const want = on.map(l => ({ l, d: Math.hypot(l.x - P.x, l.y - P.y) })).sort((a, b) => a.d - b.d).slice(0, slots.length).map(n => n.l);
  // огонь, выпавший из ближних, плавно гаснет; освободившийся слот плавно зажигает новый — без «прыжков» света
  for (const s of slots) if (s.L && !want.includes(s.L)) { s.k -= dt * 3; if (s.k <= 0) { s.L = null; s.k = 0; } }
  for (const L of want) if (!slots.some(s => s.L === L)) { const s = slots.find(s => !s.L); if (s) { s.L = L; s.k = 0; } }
  const town = zone.id === 'town' || zone.id === 'wild', base = town ? LV.warm : LV.point;
  { const H = LV.hero, hl = lights.hero; if (H && P) { hl.color.setHex(H.color); hl.distance = H.dist; hl.decay = H.decay; hl.position.set(P.x, H.y, P.y); hl.intensity = H.i * (0.96 + Math.sin(t * 3.1) * 0.04); } else hl.intensity = 0; }
  for (const s of slots) {
    const L = s.L; if (!L) { s.lt.intensity = 0; continue; }
    if (want.includes(L)) s.k = Math.min(1, s.k + dt * 3);
    s.lt.color.setRGB(L.c[0] / 255, L.c[1] / 255, L.c[2] / 255); s.lt.position.set(L.x, Math.max(L.z || 1.4, 2.0), L.y);   // не ниже 2 м: стоящие вплотную не «выгорают»
    const fl = L.flicker > 0.6 ? f : 0.92 + Math.sin(t * 2.1 + L.seed) * 0.08 * (L.flicker || 0.3);
    s.lt.distance = Math.max(town ? 8 : 6, L.r * (town ? 2.6 : 2.0)); s.lt.decay = base.decay;
    s.lt.intensity = base.i * fl * s.k * (town ? Math.min(1, 1.6 - Math.hypot(L.x - P.x, L.y - P.y) / 22) : 1);
  }
}

// персонажи вне кадра не рисуются (их SkinnedMesh без авто-отсечения): сфера по росту вокруг каждого
const _fr = new THREE.Frustum(), _pv = new THREE.Matrix4(), _sph = new THREE.Sphere();
function cullActors() {
  _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pv);
  for (const a of actors.values()) {
    _sph.center.set(a.root.position.x, a.size * 0.5, a.root.position.z); _sph.radius = a.size * 0.9 + 1.5;   // запас: тень и оружие
    a.setVisible(_fr.intersectsSphere(_sph));
  }
}

// ---------------------------------------------------------------- кадр
export function render() {
  const Z = G.zone; if (!Z || !G.player) return;
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000), rawDt = (now - last) / 1000; last = now; tAll += dt; U.uTime.value = tAll; governor(rawDt);
  if (Z !== zone) setZone(Z);
  applyQuality();
  updateCamera(); updateLights(tAll, dt);
  syncPlayer(dt); syncEnemies(dt); syncSwarm(dt); syncNpcs(dt); cullActors();
  world.props.cull(camera); world.props.update(tAll);
  if (world.atmo) world.atmo.update(dt, tAll, G.cam.x, G.cam.y, G.player.x, G.player.y);
  if (world.critters) world.critters.update(dt, tAll, G.player, G.cam.x, G.cam.y);
  world.ground.update([{ x: G.player.x, z: G.player.y, r: 0.7, w: 1 }, ...G.enemies.filter(e => !e.dead).slice(0, 10).map(e => ({ x: e.x, z: e.y, r: e.r * 1.6, w: 1 }))]);
  devSpawn();
  world.ground.shadow(lights.moon); world.ground.lod(camTarget.x + SQ * 2, camTarget.z + SQ * 2);
  renderer.info.reset();
  post.render(scene, camera, tAll, LV.exposure ?? 1);
}

// ---------------------------------------------------------------- отладка: ?spawn=skel_warrior,ghoul — враги рядом с героем (в деревне врагов нет)
export function spawnEnemies(types, ring = 5.5) {
  import('../game/entities.js').then(({ Enemy }) => {
    const P = G.player; types.forEach((t, i) => {
      const a = (i + 0.5) / types.length * Math.PI - Math.PI * 0.9, x = P.x + Math.cos(a) * ring, y = P.y + Math.sin(a) * ring;
      if (G.zone.map.free(x, y, 0.4)) { const e = new Enemy(t, x, y, 1); e.aggro = !params.has('idle'); G.enemies.push(e); }
    });
  });
}
function devSpawn() { const s = params.get('spawn'); if (s && !spawned) { spawned = true; spawnEnemies(s.split(',')); } }
