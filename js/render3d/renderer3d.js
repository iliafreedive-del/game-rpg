// 3D-отрисовка игры (Three.js, стиль torch.html). Читает состояние из G (герой, враги, NPC, зона) и ничего в нём не меняет:
// логика, ИИ, бой и DOM-интерфейс остаются прежними. Поверх WebGL-холста рисуется прозрачный 2D-холст игры
// (полоски жизни, цифры урона, эффекты, телеграфы) — для него камера отдаёт проекцию через G.cam.proj.
import * as THREE from '../vendor/three.module.min.js';
import { G } from '../game/ctx.js';
import { PX_PER_M } from '../core/iso.js';
import { U } from './toon.js';
import { makeKit } from './kit.js';
import { Actor, setOutlinesVisible } from './actor.js';
import { PropLayer } from './props.js';
import { buildGround } from './ground.js';
import { glowSet } from './glow.js';
import { HEROES, MOBS, NPCS, WEAPONS, WEAPON_MODEL, OFFHAND_MODEL } from './registry.js';
import { LIGHT, CAMERA, QUALITY, SHADOW } from './style.js';
import { Post } from './post.js';

const params = new URLSearchParams(location.search);
const SQ = Math.SQRT1_2;
let canvas, renderer, scene, camera, kit, W = 800, H = 450, DPR = 1;
let zone = null, world = null, lights = null, quality = '', post = null;
const LV = LIGHT.village3;
const actors = new Map();            // сущность игры → Actor
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
export function supports(z, profile) { return !!z && z.id === 'town' && !!HEROES[(profile && profile.cls) || 'warrior']; }

export function init() {
  canvas = document.createElement('canvas'); canvas.id = 'game3d';
  document.body.insertBefore(canvas, document.getElementById('game'));
  renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  kit = makeKit(scene);
  renderer.info.autoReset = false;                      // считаем все проходы кадра (тень, сцена, постобработка) вместе
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  post = new Post(renderer);
  const L = LV;
  renderer.setClearColor(L.clear); scene.fog = new THREE.Fog(L.fog.color, L.fog.near, L.fog.far);
  lights = {
    hemi: new THREE.HemisphereLight(L.hemi.sky, L.hemi.ground, L.hemi.i), moon: new THREE.DirectionalLight(L.key.color, L.key.i),
    warm: new THREE.PointLight(L.warm.color, L.warm.i, L.warm.dist, L.warm.decay), accent: new THREE.PointLight(L.violet.color, L.violet.i, L.violet.dist, L.violet.decay),
  };
  scene.add(lights.hemi, lights.moon, lights.moon.target, lights.warm, lights.accent);
  const sc = lights.moon.shadow.camera; sc.left = sc.bottom = -SHADOW.half; sc.right = sc.top = SHADOW.half; sc.near = 1; sc.far = 90;
  lights.moon.shadow.bias = SHADOW.bias; lights.moon.shadow.normalBias = SHADOW.normalBias; lights.moon.shadow.radius = SHADOW.radius; lights.moon.shadow.intensity = SHADOW.intensity; sc.updateProjectionMatrix();
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
function qualityNow() {
  const q = G.profile && G.profile.settings ? G.profile.settings.quality : 'auto';
  return q === 'low' || q === 'high' ? q : (matchMedia('(pointer: coarse)').matches ? 'med' : 'high');
}
function applyQuality(force) {
  const q = qualityNow(); if (q === quality && !force) return; quality = q;
  const Q = QUALITY[q];
  DPR = Math.min(window.devicePixelRatio || 1, Q.pr); renderer.setPixelRatio(DPR);
  setOutlinesVisible(q !== 'low'); if (world) { world.ground.setQuality(q); world.props.setQuality(q); }
  const sm = Q.shadow;
  lights.hemi.intensity = LV.hemi.i * (Q.light ?? 1); lights.moon.intensity = LV.key.i * (Q.light ?? 1);
  if (lights.moon.castShadow !== !!sm || lights.moon.shadow.mapSize.x !== sm) {
    lights.moon.castShadow = !!sm;
    if (sm) { lights.moon.shadow.mapSize.set(sm, sm); if (lights.moon.shadow.map) { lights.moon.shadow.map.dispose(); lights.moon.shadow.map = null; } }
    scene.traverse(o => { if (o.material && o.material.isMaterial) o.material.needsUpdate = true; });
  }
  post.setup(Math.round(W * DPR), Math.round(H * DPR), { enabled: Q.post, samples: DPR < 1.5 ? Q.msaa : 0, levels: Q.bloom });
}

// ---------------------------------------------------------------- мир зоны
function disposeWorld() {
  for (const a of actors.values()) a.dispose(); actors.clear();
  if (!world) return;
  world.ground.dispose(); world.props.dispose(); world.glow.removeFromParent(); world.pool.removeFromParent(); world = null;
}
const hex = c => (c[0] << 16) | (c[1] << 8) | c[2];
function setZone(z) {
  disposeWorld(); zone = z;
  const ground = buildGround(scene, z), props = new PropLayer(scene, kit, z);
  const on = z.lights.filter(l => l.on);
  const glow = glowSet(on.map(l => ({ x: l.x, y: l.z || 1, z: l.y, s: 0.35 + l.r * 0.2, c: hex(l.c), k: 0.9 })), false);
  const pool = glowSet(on.map(l => ({ x: l.x, y: 0.05, z: l.y, s: l.r * 0.55, c: hex(l.c), k: 0.35 })), true);
  scene.add(glow, pool); world = { ground, props, glow, pool };
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
  const cls = (G.profile && G.profile.cls) || 'warrior', a = getActor(P, HEROES[cls]);
  const wt = P.weaponType(), key = wt + cls;
  if (a.gear !== key) { a.gear = key; a.equip('handR', WEAPONS[WEAPON_MODEL[wt] || 'sword_iron']); a.equip('handL', OFFHAND_MODEL[cls] ? WEAPONS[OFFHAND_MODEL[cls]] : null); }
  const c = measure(a, P, dt), an = P.anim; let clip = 'idle', k, impact, speed = 0;
  if (P.dead) { clip = 'death'; k = an.prog; }
  else if (P.state === 'dodge') { clip = 'dodge'; k = an.prog; speed = 6; }
  else if (P.state === 'attack' || P.state === 'cast') { clip = (P.state === 'cast' || wt === 'staff') ? 'cast' : 'attack'; k = an.prog; impact = P.act ? P.act.impact : undefined; }
  else if (P.state === 'hit') { clip = 'hit'; k = an.prog; }
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
    else if (e.state === 'attack') { clip = e.D.proj ? 'cast' : 'attack'; k = an.prog; impact = e.atk ? e.atk.impact : undefined; }
    else if (e.hitStun > 0) { clip = 'hit'; k = an.prog; }
    else if (c.moving) { clip = 'walk'; speed = c.v; }
    a.place(e.x, e.y); a.faceAngle(yawOfDir(e.dir));
    a.update(dt, { clip, k, impact, speed }, env); a.flash(flashOf(e), 0xffffff);
  }
}
function syncNpcs(dt) {
  for (const n of G.npcs || []) {
    const def = NPCS[n.model] || NPCS.npc_elder, a = getActor(n, def);
    a.place(n.x, n.y); a.faceAngle(yawOfDir(n.dir));
    a.update(dt, { clip: n.talkT > 0 ? 'talk' : 'idle' }, env);
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
function updateLights(t) {
  const P = G.player, Lw = LV, f = 0.82 + Math.sin(t * 13) * 0.08 + Math.sin(t * 23.7) * 0.06 + Math.sin(t * 5.1) * 0.06;
  const near = zone.lights.filter(l => l.on).map(l => ({ l, d: Math.hypot(l.x - P.x, l.y - P.y) })).sort((a, b) => a.d - b.d);
  for (const [lt, base, idx] of [[lights.warm, Lw.warm, 0], [lights.accent, Lw.violet, 1]]) {
    const n = near[idx]; lt.visible = !!n; if (!n) continue;
    const L = n.l; _c.setRGB(L.c[0] / 255, L.c[1] / 255, L.c[2] / 255);
    lt.color.lerp(_c, 0.08); lt.position.lerp(_off.set(L.x, L.z || 1.4, L.y), 0.08);
    lt.distance = Math.max(8, L.r * 2.6); lt.intensity = base.i * (idx ? 0.85 + Math.sin(t * 2.1) * 0.15 : f) * Math.min(1, 1.6 - n.d / 22);
  }
}

// ---------------------------------------------------------------- кадр
export function render() {
  const Z = G.zone; if (!Z || !G.player) return;
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; tAll += dt; U.uTime.value = tAll;
  if (Z !== zone) setZone(Z);
  applyQuality();
  updateCamera(); updateLights(tAll);
  syncPlayer(dt); syncEnemies(dt); syncNpcs(dt);
  world.props.cull(camera); world.props.update(tAll);
  world.ground.update([{ x: G.player.x, z: G.player.y, r: 0.7, w: 1 }, ...G.enemies.filter(e => !e.dead).slice(0, 10).map(e => ({ x: e.x, z: e.y, r: e.r * 1.6, w: 1 }))]);
  devSpawn();
  world.ground.shadow(lights.moon);
  renderer.info.reset();
  post.render(scene, camera, tAll);
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
