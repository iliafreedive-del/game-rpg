// «Летопись битв» в 3D: те же модели и материалы, что в основной игре. Сборка 44: широкая арена с глубиной — ортографическая камера
// сверху-сбоку (≈32°), герой слева, отряд из 2–4 врагов справа в две линии. Фон рисует 2D-слой под этим холстом (hwscenes.js),
// поверх — полосы здоровья, имена, цифры и снаряды (herospath.js); здесь только бойцы и их тени.
import * as THREE from '../vendor/three.module.min.js';
import { makeKit, mobsReady } from './kit.js';
import { Actor } from './actor.js';
import { HEROES, MOBS, WEAPONS, WEAPON_MODEL, OFFHAND_MODEL } from './registry.js';
import { U } from './toon.js';
import { HERO } from './style.js';
import { arenaView } from '../game/hwbattle.js';
import { PET_MODELS } from './models/pet/pets.js';
import { applyLook } from './toon.js';
import { skinLoaded, preloadSkin } from './glbskin.js';
import { Extra, Aura, WeaponFx } from './cosfx.js';
import { make as makeWarrior } from './models/hero/warrior.js';
import { make as makeMage } from './models/hero/mage.js';
import { heroLook, heroModel, petLook, heroCrown, heroFxOf } from '../game/cosmetics.js';

// освещение по главе: подземелье — холодное с тёплым факелом, лес — солнечное, снега — холодный день, скалы — закат
const LIGHTS = [
  { sky: 0x8a96d8, ground: 0x3a2c30, hi: 1.5, key: 0xffc890, ki: 2.6 },
  { sky: 0xb8e0c8, ground: 0x7a6a40, hi: 1.7, key: 0xfff0c0, ki: 3.0 },
  { sky: 0xd0e4f6, ground: 0xdde8f2, hi: 1.7, key: 0xfff4e4, ki: 2.8 },
  { sky: 0xe8b8a0, ground: 0x6a4a3c, hi: 1.5, key: 0xffb070, ki: 3.0 },
];
const ALT = {};   // другие модели класса (облик)
const CROWN_Y = { warrior: 0.72, archer: 0.85, mage: 1.0 }, HALO_Y = { warrior: 0.5, archer: 0.55, mage: 1.0 };   // как в renderer3d.js
// Один WebGL-контекст Летописи на всю игру. Раньше каждый бой создавал два новых (проверочный и свой рендерер); iOS Safari держит
// ограниченное число контекстов и при превышении отбирает самый старый — контекст основной игры: игра перезагружалась на выбор героя
let shared = null;
export const webglOK = () => { if (window.__R3 && window.__R3.renderer) return true; try { return !!sharedRenderer(); } catch { return false; } };
function sharedRenderer() {
  if (shared) return shared;
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: (window.devicePixelRatio || 1) < 2 });
  r.setClearColor(0x000000, 0);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); if (shared === r) shared = null; });
  return (shared = r);
}

// сборка 66: модели мобов качаются по зонам — бойцов Летописи дождаться (до 3 с), иначе бой начнётся с запасными моделями
// облик: питомец из Meshy и другая модель героя — тоже до боя (до 3 с), иначе питомец выйдет прежней процедурной моделью (у фенека с горящим хвостом)
export const stageModels = (foes, pet) => Promise.all([mobsReady(foes.map(f => MOBS[f.type] ? f.type : 'skel_warrior'), 3000),
  Promise.race([Promise.all([pet && PET_MODELS[pet] && preloadSkin('pet_' + pet), heroModel() && preloadSkin(heroModel())]).catch(() => {}), new Promise(r => setTimeout(r, 3000))])]);
export function createStage({ cls, wt, foes, ci, pet }) {
  const renderer = sharedRenderer(), canvas = renderer.domElement;
  const scene = new THREE.Scene(), kit = makeKit(scene), L = LIGHTS[ci] || LIGHTS[0];
  scene.add(new THREE.HemisphereLight(L.sky, L.ground, L.hi * 0.8));
  const key = new THREE.DirectionalLight(L.key, L.ki * 0.8); key.position.set(-6, 9, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb8c8ff, 0.9); rim.position.set(6, 4, -8); scene.add(rim);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
  const env = { wind: new THREE.Vector2(0.25, 0) };
  const mk = (def, scale) => { const a = new Actor(def, kit, scene); if (scale) a.root.scale.setScalar(scale); a.shadow.visible = false; return { a, scale: scale || 1, lastX: null, lastZ: null }; };
  // облик (js/game/cosmetics.js), как в основной игре (renderer3d syncPlayer): другая модель класса, краски, призрак, корона, нимб, аура, оружие
  const alt = heroModel(), altOk = alt && skinLoaded(alt);
  const H = mk(altOk ? (ALT[alt] || (ALT[alt] = cls === 'mage' ? makeMage(alt) : makeWarrior(alt))) : HEROES[cls] || HEROES.warrior, HERO.scale);
  const fx = [];
  { const L = heroLook(), B = H.a.model.skinBones || H.a.model.bones;
    if (H.a.model.skinMat) applyLook(H.a.model.skinMat, L);
    if (L && L.ghost) H.a.root.traverse(o => { if (o.userData.isOutline) o.visible = false; });
    if (heroCrown() && B.head) fx.push(new Extra('crown', scene, B.head, { y: CROWN_Y[cls] || 0.7 }));
    const ex = heroFxOf('extra'), au = heroFxOf('aura'), wf = heroFxOf('weapon');
    if (ex && B.head) fx.push(new Extra(ex, scene, B.head, { y: HALO_Y[cls] || 0.5, z: 0.04 }));
    if (au) fx.push(new Aura(scene, au));
    if (wf && H.a.model.skin) { const w = new WeaponFx(wf, scene, H.a.root, cls === 'archer' ? 'handL' : 'handR'); w.weapon = true; fx.push(w); } }
  { const wm = WEAPONS[WEAPON_MODEL[wt] || 'sword_iron'], off = OFFHAND_MODEL[cls] ? WEAPONS[OFFHAND_MODEL[cls]] : null;
    if (wt === 'bow') { H.a.equip('handL', wm); } else { H.a.equip('handR', wm); H.a.equip('handL', off); } }
  const F = foes.map(f => { const S = mk(MOBS[f.type] || MOBS.skel_warrior, 1.15 * (f.type === 'boss' ? 0.72 : f.type === 'elite_guard' && !f.boss ? 0.85 : 1)); for (const [slot, id] of Object.entries(S.a.model.defaultWeapons || {})) S.a.equip(slot, WEAPONS[id]); return S; });   // правки 5: мобы на 15% крупнее
  const PT = pet && PET_MODELS[pet] ? mk(PET_MODELS[pet], 1.2) : null;   // П4-3: питомец рядом с героем (тот же масштаб, что в деревне)
  if (PT) { const L = petLook(pet); if (L) { for (const m of PT.a.mats) applyLook(m, L); if (L.ghost) PT.a.root.traverse(o => { if (o.userData.isOutline) o.visible = false; }); } }
  let W = 0, Hh = 0, view = null, t = 0;
  function resize(w, h) {
    W = w; Hh = h; renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(w, h, false);
    view = arenaView(w, h);
    cam.left = -view.halfW; cam.right = view.halfW; cam.top = view.halfH; cam.bottom = -view.halfH; cam.updateProjectionMatrix();
    cam.position.set(0, view.ty + 30 * Math.sin(view.theta), 30 * Math.cos(view.theta)); cam.lookAt(0, view.ty, 0); cam.updateMatrixWorld(true);
  }
  // d: { x, z, hop, yaw, clip, k, impact, combo, flash, alpha }
  function drive(S, d, dt) {
    const v = S.lastX == null ? 0 : Math.hypot(d.x - S.lastX, d.z - S.lastZ) / Math.max(dt, 1e-3); S.lastX = d.x; S.lastZ = d.z;
    S.a.place(d.x, d.z, d.hop || 0); S.a.faceAngle(d.yaw);
    const clip = d.clip || (v > 0.9 ? 'walk' : 'idle');
    S.a.update(dt, { clip, k: d.k, impact: d.impact, combo: d.combo, speed: d.clip ? 0 : Math.min(6, v), back: !!d.back }, env);
    S.a.flash(d.flash || 0, 0xffffff);
    S.a.shadow.visible = false;   // тени рисует 2D-слой под холстом
  }
  return {
    resize, get view() { return view; },
    height: i => (i < 0 ? H : F[i]).a.size * (i < 0 ? H : F[i]).scale,
    draw(dt, hero, foeStates, petState) {
      t += dt; U.uTime.value = t; U.uCam.value.copy(cam.position); U.uFocus.value.set(0, -50, 0); for (const v of U.uFoc.value) v.w = 0;
      drive(H, hero, dt); for (const f of fx) { if (f.weapon) f.update(dt, hero.clip === 'attack'); else f.update(dt, hero.x, hero.z); }
      foeStates.forEach((d, i) => drive(F[i], d, dt)); if (PT && petState) drive(PT, petState, dt); renderer.render(scene, cam);
    },
    canvas,
    dispose() { for (const f of fx) f.dispose(); H.a.dispose(); if (PT) PT.a.dispose(); for (const S of F) S.a.dispose(); renderer.renderLists.dispose(); renderer.clear(); },   // контекст остаётся для следующего боя
  };
}
