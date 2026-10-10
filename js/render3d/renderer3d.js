// 3D-отрисовка игры (Three.js, стиль torch.html). Читает состояние из G (герой, враги, NPC, зона) и ничего в нём не меняет:
// логика, ИИ, бой и DOM-интерфейс остаются прежними. Поверх WebGL-холста рисуется прозрачный 2D-холст игры
// (полоски жизни, цифры урона, эффекты, телеграфы) — для него камера отдаёт проекцию через G.cam.proj.
import * as THREE from '../vendor/three.module.min.js';
import { G, bus } from '../game/ctx.js';
import { PX_PER_M } from '../core/iso.js';
import { U, setSmoothFade } from './toon.js';
import { makeKit, preloadModels } from './kit.js';
import { Actor, setOutlinesVisible } from './actor.js';
import { preloadBones, bonesReady, preloadBoneTrees } from './bonesglb.js';
import { preloadPortals, portalsReady } from './portalglb.js';
import { preloadAltar, altarReady } from './altarglb.js';
import { preloadTemple, templeReady } from './templeglb.js';
import { PropLayer } from './props.js';
import { buildGround } from './ground.js';
import { Atmo } from './atmo.js';
import { Critters } from './critters.js';
import { buildDungeonFloor } from './dungeon.js';
import { glowSet } from './glow.js';
import { HEROES, MOBS, NPCS, WEAPONS, WEAPON_MODEL, OFFHAND_MODEL } from './registry.js';
import { PET_MODELS } from './models/pet/pets.js';
import { LIGHT, CAMERA, QUALITY, SHADOW, HERO } from './style.js';
import { zoomNow } from '../core/camzoom.js';
import { SKINS, skinLoaded } from './glbskin.js';
import { Post } from './post.js';
import { Sparks } from './sparks.js';
import { FORGE_HIT } from './models/npc/npc_smith.js';
import { sfx } from '../core/audio.js';
import { disposeObject } from './dispose.js';

const params = new URLSearchParams(location.search);
const SQ = Math.SQRT1_2;
let canvas, renderer, scene, camera, kit, W = 800, H = 450, DPR = 1;
let zone = null, world = null, lights = null, quality = '', post = null;
let LV = LIGHT.village3;                 // пресет света текущей зоны (presetFor)
const slots = [];                        // пул точечных огней: { lt, L, k } — ближайшие огни зоны, плавно появляются и гаснут
const actors = new Map();            // сущность игры → Actor
const swarmPool = new Map();         // «Жатва»: освободившиеся модели врагов по типам (чтобы не собирать геометрию заново для каждого)
const enemyPool = new Map();         // сборка 60 (С39): то же для врагов подземелий и походов — модель погибшего моба ждёт следующего того же вида
let frameNo = 0;                     // метка кадра: кого из врагов уже нет (вместо new Set каждый кадр)
const camTarget = new THREE.Vector3();
let camDist = CAMERA.village.dist, userZoom = 1, shadowHalf = SHADOW.half, last = performance.now(), tAll = 0, spawned = false;

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

// сборка 51: всё тяжёлое (модели героев и зверей, арки порталов, алтарь) — после титульного экрана; арки деревни качаются, пока герой в склепе
export function startPreload(cls) { preloadModels(cls); setTimeout(() => { preloadPortals(); preloadAltar(); }, 1500); }
export function init() {
  canvas = document.createElement('canvas'); canvas.id = 'game3d';
  document.body.insertBefore(canvas, document.getElementById('game'));
  renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
  // потеря контекста WebGL (нехватка видеопамяти/драйвер): сохраняем игру и ждём, когда браузер вернёт контекст, — тогда зона
  // собирается заново (С42, сборка 60). Не вернул за 6 с — как раньше, перезагрузка страницы
  let lostT = 0;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); try { import('../game/game.js').then(m => m.saveNow()); } catch { } clearTimeout(lostT); lostT = setTimeout(() => location.reload(), 6000); });
  canvas.addEventListener('webglcontextrestored', () => { clearTimeout(lostT); rebuildAfterRestore(); });
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  kit = makeKit(scene);
  // сборка 46: без проверки ошибок шейдеров браузер компилирует их параллельно, а не ждёт каждый (на Android переход стоял до 20 с); ?debug — проверка включена
  renderer.debug.checkShaderErrors = params.has('debug');
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
  lights.moon.shadow.bias = SHADOW.bias; lights.moon.shadow.normalBias = SHADOW.normalBias; lights.moon.shadow.intensity = SHADOW.intensity; sc.updateProjectionMatrix(); sc.layers.enable(1);   // слой 1 — заменители теней крон
  U.uWindStr.value = 1;
  window.__R3 = { scene, camera, renderer, actors, post, lights, get zone() { return zone; }, get world() { return world; } };
}
// three.js сам пересоздаёт свои буферы и текстуры при следующем кадре; мир зоны, цели постобработки и карту тени собираем заново
function rebuildAfterRestore() {
  if (lights.moon.shadow.map) { lights.moon.shadow.map.dispose(); lights.moon.shadow.map = null; }
  postKey = ''; zone = null; prepare();
}
export function show(on) { if (canvas) canvas.style.display = on ? 'block' : 'none'; G.cam.proj = on ? proj : null; }

export function resize(w, h) {
  W = w; H = h; if (!renderer) return;
  applyQuality(true);
  renderer.setSize(W, H, false); camera.aspect = W / H;
  // вертикально: дистанция растёт, чтобы ширина обзора не падала. Телефон горизонтально (низкий экран): тот же масштаб,
  // что у этого же телефона вертикально (пикселей на метр поровну) — персонаж и подписи не мельчают, обзор растёт только по бокам
  const portraitDist = (w, h) => CAMERA.village.dist * Math.min(CAMERA.portrait.maxScale, 1 / (w / h) * CAMERA.portrait.refAspect);
  // телефон (сборка 38): пикселей на метр — от короткой стороны самого экрана (не окна), поэтому герой одного размера
  // и вертикально, и горизонтально, и когда браузер прячет/показывает свои панели; меняется только обзор
  const S = Math.min(screen.width || 0, screen.height || 0), phone = S > 0 && S < 600 && matchMedia('(pointer: coarse)').matches;
  camDist = phone ? CAMERA.village.dist * CAMERA.portrait.refAspect * H / S
    : W / H < 1 ? portraitDist(W, H) : H < 600 ? portraitDist(H, W) * H / W : CAMERA.village.dist;
  camDist /= CAMERA.zoomIn;   // приближение (сборка 24: +5 %)
  camera.updateProjectionMatrix();
}
// «Авто»: стартуем по типу устройства, а регулятор ниже сам опускает качество, если кадры затягиваются
let autoPts = 0, postKey = '', govLevel = null, govSlow = 0, govAcc = 0, govN = 0, govScale = 1;   // govScale — доля разрешения (сборка 46)
function qualityNow() {
  const q = G.profile && G.profile.settings ? G.profile.settings.quality : 'auto';
  if (q === 'low' || q === 'high' || q === 'med') return q;
  return govLevel || (matchMedia('(pointer: coarse)').matches ? 'med' : 'high');
}
function governor(dt) {
  const q = G.profile && G.profile.settings ? G.profile.settings.quality : 'auto';
  if (q !== 'auto' || quality === 'low' || quality === 'lite' || document.hidden || G.paused) { govAcc = 0; govN = 0; return; }
  govAcc += Math.min(dt, 0.2); govN++;
  if (govAcc < 3) return;
  const ms = govAcc / govN * 1000; govAcc = 0; govN = 0;
  // сборка 46: медленнее ~52 к/с два окна подряд — сначала чуть ниже разрешение (на глаз почти незаметно, нагрузка на видеокарту −28…−48 %),
  // и только если и это не помогло — ступенька качества ниже (раньше ждали падения ниже 38 к/с — в деревне рывки успевали стать заметны)
  govSlow = ms > 19 ? govSlow + 1 : 0;
  if (govSlow >= 2) { govSlow = 0;
    if (govScale > 0.75 && DPR * 0.85 >= 1) { govScale = govScale > 0.9 ? 0.85 : 0.72; applyQuality(true); }
    else { govLevel = quality === 'high' ? 'med' : 'lite'; govScale = 1; applyQuality(); } }   // сборка 55: не ниже «экономного» — вид не меняется
}
function applyQuality(force) {
  const q = qualityNow(); if (q === quality && !force) return; quality = q;
  const Q = QUALITY[q];
  // потолок по числу пикселей (≈3,2 Мпикс): на больших мониторах с HiDPI цели постобработки с MSAA съедали видеопамять — после смены зоны кадр мог стать чёрным
  const base = Math.max(0.6, Math.min(window.devicePixelRatio || 1, Q.pr, Math.sqrt(3.2e6 / Math.max(1, W * H))));
  DPR = Math.max(Math.min(1, base), base * govScale); renderer.setPixelRatio(DPR);
  setOutlinesVisible(q !== 'low'); if (world) { world.ground.setQuality(q); world.props.setQuality(q); if (world.atmo) world.atmo.setQuality(q); }
  const sm = Q.shadow;
  lights.hemi.intensity = LV.hemi.i * (Q.light ?? 1); lights.moon.intensity = LV.key.i * (Q.light ?? 1);
  // сборка 55: в «Авто» число огней не меняется при смене ступени — иначе пересборка всех шейдеров и рывок прямо во время лага
  const auto = !(G.profile && G.profile.settings) || G.profile.settings.quality === 'auto' || !G.profile.settings.quality;
  if (auto) autoPts = autoPts || Q.points; setPointCount(auto ? autoPts : Q.points);   // сборка 46: число огней одно во всех зонах — иначе при каждом переходе пересобирались все шейдеры (в деревне и походах горят только 2 ближних)
  if (lights.moon.castShadow !== !!sm || lights.moon.shadow.mapSize.x !== sm) {
    const toggled = lights.moon.castShadow !== !!sm; lights.moon.castShadow = !!sm;
    if (sm) { lights.moon.shadow.mapSize.set(sm, sm); if (lights.moon.shadow.map) { lights.moon.shadow.map.dispose(); lights.moon.shadow.map = null; } }
    if (toggled) scene.traverse(o => { if (o.material && o.material.isMaterial) o.material.needsUpdate = true; });   // сборка 55: шейдеры — только когда тени включаются/выключаются, не при смене размера карты
  }
  const msaa = base < 1.5 ? Q.msaa : 0, pk = [Math.round(W * DPR), Math.round(H * DPR), Q.post, msaa, Q.bloom].join();
  if (pk !== postKey) { postKey = pk; post.setup(Math.round(W * DPR), Math.round(H * DPR), { enabled: Q.post, samples: msaa, levels: Q.bloom }); }   // цели постобработки пересоздаём только при смене размера/качества
  setSmoothFade(Q.post && msaa > 0);
}

// ---------------------------------------------------------------- мир зоны
function disposeWorld() {
  for (const a of actors.values()) a.dispose(); actors.clear();
  for (const P of [swarmPool, enemyPool]) { for (const l of P.values()) for (const a of l) a.dispose(); P.clear(); }
  if (!world) return;
  world.ground.dispose(); world.props.dispose(); disposeObject(world.glow); disposeObject(world.pool); if (world.atmo) world.atmo.dispose(); if (world.critters) world.critters.dispose(); world = null;
}
const hex = c => (c[0] << 16) | (c[1] << 8) | c[2];
// пресет света по зоне: деревня, подземелье (с биомом глубин), цитадель/арена
function presetFor(z) {
  U.uBiome.value = ({ flooded: 1, ash: 2, abyss: 3 })[z.json && z.json.biome] || 0;
  if (z.id === 'town') return { ...LIGHT.village3, look: null };
  if (z.id === 'wild') { const fj = z.json.wild.realm === 'fjord', d = z.json.wild.mood && z.json.wild.mood.dark, B = fj ? LIGHT.wildFjord : z.json.wild.realm === 'temple' ? LIGHT.wildTemple : z.json.wild.realm === 'bones' ? (d ? LIGHT.wildSteppeDusk : LIGHT.wildSteppe) : LIGHT.wildForest;
    return { ...B, hemi: d ? { ...B.hemi, i: B.hemi.i * 0.8 } : B.hemi, key: d ? { ...B.key, i: B.key.i * 0.85 } : B.key, look: null }; }
  if (z.id === 'survival') { const L = LIGHT.castle; return { ...L, hemi: { ...L.hemi, sky: 0xc8c0e8, i: 2.3 }, key: { ...L.key, i: 2.8 }, fog: { color: 0x3a3352, near: 48, far: 130 }, clear: 0x2a2440, look: { floor: 0x9a90b8, grime: 0x4a4064, moss: 0x7a5aaa } }; }   // арена Бездны: сборка 50 — заметно светлее (было темно, врагов не разглядеть), туман дальше
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
  const town = z.id === 'town', wild = z.id === 'wild', open = town || wild, fj = wild && z.json.wild.realm === 'fjord', bn = wild && z.json.wild.realm === 'bones';
  const ground = wild ? buildGround(scene, z, { abyss: z.json.wild.realm || 'forest', snow: fj, steppe: bn, forest: !fj && !bn, kindOf: wildKind, stoneCh: '\u0000', grassK: bn ? 0.24 : 0.15, farColor: fj ? 0xb4c6d8 : bn ? 0x6a3420 : 0x0f2418, margin: 6 }) : town ? buildGround(scene, z, { margin: z.json.big ? 14 : 3, farColor: z.json.village ? 0x22341c : undefined }) : buildDungeonFloor(scene, z, LV.look), props = new PropLayer(scene, kit, z, open);
  // деревня: дым из труб, стелющийся туман, куры и собаки
  U.uHFog.value = town && z.json.village ? 0.24 : 0;   // туман у земли — только в деревне
  if (z.json.center) U.uHFogC.value.set(z.json.center[0], z.json.center[1], 17); else U.uHFogC.value.set(0, 0, 0);   // в центре деревни тумана почти нет
  const atmo = town && z.json.village ? new Atmo(scene, z, props.smoke) : null, critters = town && z.json.village ? new Critters(scene, kit, z) : null;
  world = { ground, props, atmo, critters, ...lightSets(z) };
  props.cull(camera, true); applyQuality(true); ground.setQuality(quality); spawned = false;
  // Костяные пустоши: паки окружения Meshy грузятся при первом входе; пока грузятся — прежние предметы, потом слой пересобирается
  // порталы деревни из Meshy (сборка 44): пак грузится при первом входе в деревню, до загрузки — прежние арки
  if (town && z.json.village && kit.skin.SKINS.on && !(portalsReady() && altarReady())) Promise.all([preloadPortals(), preloadAltar(), preloadBoneTrees()]).then(([ok, ok2, ok3]) => {
    ok = ok || ok2 || ok3;
    if (!ok || !world || zone !== z) return;
    world.props.dispose(); world.props = new PropLayer(scene, kit, z, open); world.props.cull(camera, true); applyQuality(true);
  });
  if (wild && z.json.wild.realm === 'temple' && kit.skin.SKINS.on && !templeReady()) preloadTemple().then(ok => {   // Разрушенный храм: пак «каменная»
    if (!ok || !world || zone !== z) return;
    world.props.dispose(); world.props = new PropLayer(scene, kit, z, open); world.props.cull(camera, true); applyQuality(true);
  });
  if (bn && kit.skin.SKINS.on && !bonesReady()) preloadBones().then(ok => {
    if (!ok || !world || zone !== z) return;
    world.props.dispose(); world.props = new PropLayer(scene, kit, z, open); world.props.cull(camera, true); applyQuality(true);
  });
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

const HERO_SKIN = { archer: 'archer_raven', warrior: 'warrior_knight', mage: 'mage_staff' };   // класс → модель из assets/models (tools/art/glb_rig.py)
function syncPlayer(dt) {
  const P = G.player; if (!P) return;
  const cls = (G.profile && G.profile.cls) || 'warrior';
  // «Новые модели» (Настройки): готовая модель художника поверх рига (glbskin.js). Переключили или модель догрузилась — пересобрать героя
  SKINS.on = !(G.profile && G.profile.settings && G.profile.settings.skins === false);
  let a = getActor(P, HEROES[cls], { scale: HERO.scale });
  const sk = HERO_SKIN[cls];
  if (sk && !!a.model.skin !== SKINS.on && (!SKINS.on || skinLoaded(sk))) { a.dispose(); actors.delete(P); a = getActor(P, HEROES[cls], { scale: HERO.scale }); }
  const wt = P.weaponType(), key = wt + cls;
  if (a.gear !== key) { a.gear = key; const wm = WEAPONS[WEAPON_MODEL[wt] || 'sword_iron'], off = OFFHAND_MODEL[cls] ? WEAPONS[OFFHAND_MODEL[cls]] : null; if (wt === 'bow') { a.equip('handL', wm); a.equip('handR', null); } else { a.equip('handR', wm); a.equip('handL', off); } }
  const c = measure(a, P, dt), an = P.anim; let clip = 'idle', k, impact, speed = 0;
  if (P.dead) { clip = 'death'; k = an.prog; }
  else if (P.state === 'dodge') { clip = 'dodge'; k = an.prog; speed = 6; }
  else if (P.state === 'cast' && P.act && P.act.dash && P.act.t < P.act.dash.T) { const D = P.act.dash; clip = 'walk'; speed = Math.hypot(D.fx - D.sx, D.fy - D.sy) / D.T; }   // Сокрушающий прыжок: быстрый бег к цели
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
  a.turnRate = 34;   // герой разворачивается почти мгновенно (как в Archero)
  a.place(P.x, P.y); a.faceAngle(yawOfDir(P.dir));
  a.update(dt, { clip, k, impact, speed, combo: (P.combo - 1) & 1 }, env); a.flash(flashOf(P), 0xffffff);
}
// модель из пула: тот же вид, поза покоя без перехода из позы смерти
function enemyActor(e, def, scale) {
  let a = actors.get(e); if (a) return a;
  const pool = enemyPool.get(def);
  if (!pool || !pool.length) { a = getActor(e, def, { scale }); a.isEnemy = true; a.def = def; return a; }
  a = pool.pop(); actors.set(e, a); a.ctl = null; a.root.scale.setScalar(scale); a.setVisible(true); a.yaw = a.targetYaw = yawOfDir(e.dir);
  a.update(0, { clip: 'idle' }, env); a.blend = 1; a.snap.clear(); a.flash(0, 0xffffff);
  return a;
}
function syncEnemies(dt) {
  const fn = ++frameNo;
  for (const e of G.enemies) {
    let def = MOBS[e.model || e.type] || MOBS[e.D && e.D.model3d];   // e.model — свой вид при том же типе (Страж глубин, сборка 57); model3d — чужая модель на время (мобы храма)
    if (!def) { if (!warned.has(e.type)) { warned.add(e.type); console.warn('[3D] нет модели моба «' + e.type + '» — показан скелет-воин'); } def = MOBS.skel_warrior; }
    const a = enemyActor(e, def, (e.champion ? 1.25 : 1) * (def === MOBS[e.model || e.type] || (e.D && def === MOBS[e.D.model3d]) ? 1 : e.r / 0.34)); a.seen = fn;
    const c = measure(a, e, dt), an = e.anim; let clip = 'idle', k, impact, speed = 0;
    if (e.dead) { clip = 'death'; k = an.prog; }
    else if (e.state === 'attack') { clip = e.D.proj ? 'cast' : (e.atk && e.atk.kind) || 'attack';   /* у босса: attack2, slam, roar */ k = an.prog; impact = e.atk ? e.atk.impact : undefined; }
    else if (e.hitStun > 0) { clip = 'hit'; k = an.prog; }
    else if (c.moving) { clip = 'walk'; speed = c.v; }
    a.place(e.x, e.y); a.faceAngle(yawOfDir(e.dir));
    a.update(dt, { clip, k, impact, speed }, env); a.flash(flashOf(e), 0xffffff);
  }
  for (const [k, a] of actors) if (a.isEnemy && a.seen !== fn) {   // враг исчез — модель в пул (не больше 12 одного вида), остальное освобождаем
    actors.delete(k); let pool = enemyPool.get(a.def); if (!pool) enemyPool.set(a.def, pool = []);
    if (pool.length < 12) { a.setVisible(false); pool.push(a); } else a.dispose();
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
    a.place(n.x, n.y);
    // наставник с мечом (новая модель) бьёт чучело: удар 0.7 с, пауза 0.9 с; герой рядом или разговор — поворачивается к нему
    const P = G.player, near = P && Math.hypot(P.x - n.x, P.y - n.y) < 3.5;
    if (n.train && a.model.skin && !near && !(n.talkT > 0)) {
      const ph = (tAll + n.x) % 1.6, k = ph / 0.7;
      a.faceAngle(Math.atan2(n.train[0] - n.x, n.train[1] - n.y));
      a.update(dt, k < 1 ? { clip: 'attack', k, combo: Math.floor((tAll + n.x) / 1.6) % 3 } : { clip: 'idle' }, env);
      continue;
    }
    // кузнец (сборка 56) бьёт молотом по наковальне: цикл 1,05 с, каждый 4-й удар — лёгкий; в миг удара — искры и звон
    // (громкость — по расстоянию до героя); герой рядом или разговор — опускает молот и поворачивается к нему
    if (n.forge && a.model.skin && !near && !(n.talkT > 0)) {
      const ph = (tAll + n.x * 0.37) / 1.05, yaw = Math.atan2(n.forge[0] - n.x, n.forge[1] - n.y), hi = Math.floor(ph - FORGE_HIT);
      a.faceAngle(yaw); a.update(dt, { clip: 'forge', k: ph % 1, combo: Math.floor(ph) }, env);
      if (a.forgeHit !== undefined && hi !== a.forgeHit && a.root.visible) {
        const light = ((hi % 4) + 4) % 4 === 3, d = P ? Math.hypot(P.x - n.x, P.y - n.y) : 99;
        (sparks ||= new Sparks(scene)).burst(n.forge[0] - Math.sin(yaw) * 0.1, n.forge[1] - Math.cos(yaw) * 0.1, 0.99, light ? 10 : 26, yaw);
        if (d < 16) sfx('forge', (light ? 0.45 : 1) * Math.min(1, 1.25 - d / 16));
      }
      a.forgeHit = hi; continue;
    }
    a.forgeHit = undefined;
    a.faceAngle(yawOfDir(n.dir));
    a.update(dt, { clip: n.talkT > 0 ? 'talk' : 'idle' }, env);
  }
  if (sparks) sparks.update(dt);
}
// питомец героя (сборка 58, js/game/pets.js): новая модель — когда сменили зверька (G.pet — новый объект)
function syncPet(dt) {
  const p = G.pet;
  for (const [k, a] of actors) if (a.isPet && k !== p) { a.dispose(); actors.delete(k); }
  if (!p || !PET_MODELS[p.id]) return;
  const a = getActor(p, PET_MODELS[p.id]); a.isPet = true; a.turnRate = 12;
  a.place(p.x, p.y); a.faceAngle(Math.PI / 2 - p.ang);
  a.update(dt, p.act ? { clip: 'attack', k: Math.min(1, p.act.t / p.act.dur) } : p.speed > 0.4 ? { clip: 'walk', speed: p.speed } : { clip: 'idle' }, env);
}
let sparks = null;   // искры кузни (sparks.js) — создаются при первом ударе
// «Жатва Бездны»: рой — настоящие 3D-модели (по типу врага), берутся из пула и возвращаются в него после гибели
function syncSwarm(dt) {
  const S = G.surv, fn = frameNo;
  if (S) for (const e of S.swarm) { const a = actors.get(e); if (a) a.seen = fn; }
  for (const [k, a] of actors) if (a.isSwarm && a.seen !== fn) { actors.delete(k); a.setVisible(false); a.root.visible = false; if (!swarmPool.has(a.swType)) swarmPool.set(a.swType, []); swarmPool.get(a.swType).push(a); }
  if (!S) return;
  for (const e of S.swarm) {
    let a = actors.get(e);
    if (!a) {
      const def = MOBS[e.type] || MOBS.skel_warrior, pool = swarmPool.get(e.type);
      a = pool && pool.length ? pool.pop() : new Actor(def, kit, scene); a.isSwarm = true; a.seen = fn; a.swType = e.type; a.root.visible = true;
      a.root.scale.setScalar(e.boss ? 1.4 : e.elite ? 1.2 : 1); actors.set(e, a);
    }
    const c = measure(a, e, dt);
    a.place(e.x, e.y); a.faceAngle(yawOfDir(e.dir));
    const hitting = e.hitCd > 0.6; a.update(dt, hitting ? { clip: 'attack', k: (0.9 - e.hitCd) / 0.3 } : { clip: 'walk', speed: Math.max(1.2, c.v) }, env); a.flash(e.flash > 0 ? Math.min(1, e.flash * 8) : 0, 0xffffff);
  }
}
const env = { wind: new THREE.Vector2() };
// «Жатва» (сборка 50): мир сдвинулся на плитку — пол подставляет тот же рисунок, у моделей не бывает рывка скорости
bus.on('worldShift', ({ dx, dy }) => { if (U.uWShift) { U.uWShift.value.x -= dx; U.uWShift.value.y -= dy; } for (const a of actors.values()) if (a.ctl) { a.ctl.px += dx; a.ctl.py += dy; } });

// ---------------------------------------------------------------- камера и свет
function updateCamera(dt) {
  // зум игрока (щипок / колесо, js/core/camzoom.js): плавно к выбранному; туман и тень отодвигаются вместе с камерой,
  // чтобы вокруг героя картинка была та же, что и при стартовом масштабе
  const zt = zoomNow(); userZoom = Math.abs(zt - userZoom) < 1e-3 ? zt : userZoom + (zt - userZoom) * Math.min(1, dt * 12);
  const cam = G.cam, C = CAMERA.village, aim = C.aim, dist0 = camDist / (G.zoomMul || 1), dist = dist0 * userZoom * (G.cineZoom || 1);   // облёт камеры (js/ui/cinema.js) отодвигает камеру
  scene.fog.near = LV.fog.near + dist - dist0; scene.fog.far = LV.fog.far + dist - dist0;
  const sh = SHADOW.half * Math.sqrt(Math.max(1, userZoom));   // сборка 47: область тени растёт медленнее зума (при +30 % — +14 %): на краю кадра тени и так почти не видно, а проход тени дорогой
  if (sh !== shadowHalf) { shadowHalf = sh; const sc = lights.moon.shadow.camera; sc.left = sc.bottom = -sh; sc.right = sc.top = sh; sc.updateProjectionMatrix(); }
  camTarget.set(cam.x - SQ * aim, CAMERA.follow.targetY, cam.y - SQ * aim);
  camera.position.set(Math.sin(CAMERA.yaw) * Math.cos(C.pitch), Math.sin(C.pitch), Math.cos(CAMERA.yaw) * Math.cos(C.pitch)).multiplyScalar(dist).add(camTarget);
  camera.lookAt(camTarget);
  const ppm = H / (2 * dist * Math.tan(CAMERA.fov * Math.PI / 360));   // пикселей на метр у цели → масштаб 2D-эффектов
  cam.zoom = ppm / PX_PER_M;
  if (cam.sx || cam.sy) { camera.position.addScaledVector(_right.set(Math.cos(CAMERA.yaw), 0, -Math.sin(CAMERA.yaw)), -cam.sx / ppm); camera.position.y += cam.sy / ppm; }
  camera.updateMatrixWorld(true);
  const P = G.player; if (P) { U.uCam.value.copy(camera.position); U.uFocus.value.set(P.x, 1.0, P.y);
    const near = nearest(G.enemies || [], P, 3, e => !e.dead, 144, _near);
    U.uFoc.value.forEach((v, i) => { const e = near[i]; if (e) v.set(e.x, 0.9, e.y, 1); else v.w = 0; }); }   // три ближайших врага в 12 м: деревья и скалы перед ними растворяются
  // тень: центр ортокамеры чуть вглубь кадра, привязка к текселю карты, чтобы края теней не дрожали при движении
  const sm = lights.moon.shadow, tex = (2 * shadowHalf) / (sm.mapSize.x || 1024);
  _sc.set(camTarget.x - SQ * SHADOW.ahead, 0, camTarget.z - SQ * SHADOW.ahead);
  _ld.set(...LV.key.offset).normalize();
  _basis.lookAt(_ld, _zero, _up); _inv.copy(_basis).invert();
  _sc.applyMatrix4(_inv); _sc.x = Math.round(_sc.x / tex) * tex; _sc.y = Math.round(_sc.y / tex) * tex; _sc.applyMatrix4(_basis);
  lights.moon.target.position.copy(_sc); lights.moon.position.copy(_sc).addScaledVector(_ld, 45);
}
// k ближайших к P (по x, y) из list, прошедших ok, ближе sqrt(r2): вставкой в готовый массив out — без выделений памяти в кадре (С39)
const _near = [], _nd = [], _want = [];
function nearest(list, P, k, ok, r2, out) {
  out.length = 0;
  for (const e of list) {
    if (!ok(e)) continue; const d = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (d >= r2) continue;
    let i = out.length; if (i === k && d >= _nd[k - 1]) continue; if (i === k) i--;
    while (i > 0 && _nd[i - 1] > d) { out[i] = out[i - 1]; _nd[i] = _nd[i - 1]; i--; }
    out[i] = e; _nd[i] = d;
  }
  return out;
}
const isOn = l => l.on;
const _right = new THREE.Vector3(), _off = new THREE.Vector3(), _c = new THREE.Color();
const _sc = new THREE.Vector3(), _ld = new THREE.Vector3(), _zero = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _basis = new THREE.Matrix4(), _inv = new THREE.Matrix4();
function updateLights(t, dt) {
  const P = G.player, f = 0.82 + Math.sin(t * 13) * 0.08 + Math.sin(t * 23.7) * 0.06 + Math.sin(t * 5.1) * 0.06;
  let onN = 0; for (const l of zone.lights) if (l.on) onN++;
  if (onN !== world.onKey) { disposeObject(world.glow); disposeObject(world.pool); Object.assign(world, lightSets(zone)); }   // портал проявился, алтарь погас
  const open = zone.id === 'town' || zone.id === 'wild';
  const want = nearest(zone.lights, P, open ? Math.min(2, slots.length) : slots.length, isOn, Infinity, _want);
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
// сборка 46: новая зона собирается и её шейдеры компилируются, пока ещё не показана (loadZone ждёт), — без замершего кадра
let warming = null;
const settle = (p, ms) => Promise.race([p.catch(() => false), new Promise(r => setTimeout(r, ms))]);
export function prepare() {
  const Z = G.zone; if (!Z || !G.player || !renderer) return Promise.resolve();
  const t0 = performance.now();
  warming = (async () => {
    // паки Meshy (порталы деревни, пустоши) — до сборки мира, чтобы слой предметов не пересобирался уже на глазах
    SKINS.on = !(G.profile && G.profile.settings && G.profile.settings.skins === false);
    const packs = [];
    if (SKINS.on && !portalsReady()) packs.push(preloadPortals());   // сборка 47: арки Meshy стоят и выходами из катакомб, походов, Цитадели
    if (SKINS.on && Z.id === 'town' && Z.json.village && !altarReady()) packs.push(preloadAltar());
    if (SKINS.on && Z.id === 'town' && Z.json.village) packs.push(preloadBoneTrees());   // сухое дерево пустошей у входа в катакомбы   // источник силы из Meshy
    if (SKINS.on && Z.id === 'wild' && Z.json.wild.realm === 'bones' && !bonesReady()) packs.push(preloadBones());
    if (SKINS.on && Z.id === 'wild' && Z.json.wild.realm === 'temple' && !templeReady()) packs.push(preloadTemple());
    if (SKINS.on) packs.push(preloadModels(G.profile && G.profile.cls));   // сборка 51: модели героев и зверей (качаются с титульного экрана)
    if (packs.length) await settle(Promise.all(packs), 8000);
    if (G.zone !== Z) return;
    if (Z !== zone) setZone(Z);
    applyQuality(); updateCamera(0); syncPlayer(0); syncEnemies(0); syncNpcs(0);   // герой, враги и жители — сразу, чтобы их шейдеры тоже собрались заранее
    await settle(renderer.compileAsync(scene, camera), 6000);
    // сборка 47: текстуры и буферы зоны — в видеопамять тоже под шторкой (compileAsync собирает только шейдеры; лес на телефоне
    // первые секунды стоял «лысым», пока деревья и земля догружались на глазах)
    if (G.zone !== Z) return;
    const seen = new Set(); scene.traverse(o => { const ms = o.material ? [].concat(o.material) : []; for (const m of ms) for (const k of ['map', 'normalMap', 'alphaMap', 'emissiveMap']) { const t = m[k]; if (t && t.isTexture && !seen.has(t)) { seen.add(t); try { renderer.initTexture(t); } catch { } } } });
    world.props.cull(camera, true); renderer.render(scene, camera);
  })().finally(() => { warming = null; if (params.has('debug')) console.info('[3d] зона готова', Z.id, Math.round(performance.now() - t0) + ' мс'); });
  return warming;
}
const _blobs = Array.from({ length: 11 }, () => ({ x: 0, z: 0, r: 0, w: 1 })), put = (b, x, z, r, w) => { b.x = x; b.z = z; b.r = r; b.w = w; };
export function render() {
  const Z = G.zone; if (!Z || !G.player || warming) return;
  if (Z !== zone && !G.zoneReady) return;   // новая зона ещё грузится: её мир соберёт prepare(), до этого — прежний кадр под шторкой
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000), rawDt = (now - last) / 1000; last = now; tAll += dt; U.uTime.value = tAll; governor(rawDt);
  if (Z !== zone) setZone(Z);
  applyQuality();
  updateCamera(dt); updateLights(tAll, dt);
  syncPlayer(dt); syncEnemies(dt); syncSwarm(dt); syncNpcs(dt); syncPet(dt); cullActors();
  world.props.cull(camera); world.props.update(tAll);
  if (world.atmo) world.atmo.update(dt, tAll, G.cam.x, G.cam.y, G.player.x, G.player.y);
  if (world.critters) world.critters.update(dt, tAll, G.player, G.cam.x, G.cam.y);
  // примятая трава: герой и до 10 живых врагов — в готовые объекты (без выделений в кадре)
  const bl = _blobs; let nb = 0;
  put(bl[nb++], G.player.x, G.player.y, 0.7, 1);
  for (const e of G.enemies) { if (nb > 10) break; if (!e.dead) put(bl[nb++], e.x, e.y, e.r * 1.6, 1); }
  while (nb < bl.length) put(bl[nb++], 999, 999, 0.5, 0);
  world.ground.update(bl);
  devSpawn();
  world.ground.shadow(lights.moon); world.ground.lod(camTarget.x + SQ * 2, camTarget.z + SQ * 2, userZoom);
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
