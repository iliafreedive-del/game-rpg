// «Летопись битв» в 3D: те же модели и материалы, что в основной игре. Сборка 44: широкая арена с глубиной — ортографическая камера
// сверху-сбоку (≈32°), герой слева, отряд из 2–4 врагов справа в две линии. Фон рисует 2D-слой под этим холстом (hwscenes.js),
// поверх — полосы здоровья, имена, цифры и снаряды (herospath.js); здесь только бойцы и их тени.
import * as THREE from '../vendor/three.module.min.js';
import { makeKit } from './kit.js';
import { Actor } from './actor.js';
import { HEROES, MOBS, WEAPONS, WEAPON_MODEL, OFFHAND_MODEL } from './registry.js';
import { U } from './toon.js';
import { HERO } from './style.js';
import { arenaView } from '../game/hwbattle.js';

// освещение по главе: подземелье — холодное с тёплым факелом, лес — солнечное, снега — холодный день, скалы — закат
const LIGHTS = [
  { sky: 0x8a96d8, ground: 0x3a2c30, hi: 1.5, key: 0xffc890, ki: 2.6 },
  { sky: 0xb8e0c8, ground: 0x7a6a40, hi: 1.7, key: 0xfff0c0, ki: 3.0 },
  { sky: 0xd0e4f6, ground: 0xdde8f2, hi: 1.7, key: 0xfff4e4, ki: 2.8 },
  { sky: 0xe8b8a0, ground: 0x6a4a3c, hi: 1.5, key: 0xffb070, ki: 3.0 },
];
export const webglOK = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

export function createStage(canvas, { cls, wt, foes, ci }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), kit = makeKit(scene), L = LIGHTS[ci] || LIGHTS[0];
  scene.add(new THREE.HemisphereLight(L.sky, L.ground, L.hi * 0.8));
  const key = new THREE.DirectionalLight(L.key, L.ki * 0.8); key.position.set(-6, 9, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb8c8ff, 0.9); rim.position.set(6, 4, -8); scene.add(rim);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
  const env = { wind: new THREE.Vector2(0.25, 0) };
  const mk = (def, scale) => { const a = new Actor(def, kit, scene); if (scale) a.root.scale.setScalar(scale); a.shadow.visible = false; return { a, scale: scale || 1, lastX: null, lastZ: null }; };
  const H = mk(HEROES[cls] || HEROES.warrior, HERO.scale);
  { const wm = WEAPONS[WEAPON_MODEL[wt] || 'sword_iron'], off = OFFHAND_MODEL[cls] ? WEAPONS[OFFHAND_MODEL[cls]] : null;
    if (wt === 'bow') { H.a.equip('handL', wm); } else { H.a.equip('handR', wm); H.a.equip('handL', off); } }
  const F = foes.map(f => { const S = mk(MOBS[f.type] || MOBS.skel_warrior, f.type === 'boss' ? 0.72 : f.type === 'elite_guard' && !f.boss ? 0.85 : 1); for (const [slot, id] of Object.entries(S.a.model.defaultWeapons || {})) S.a.equip(slot, WEAPONS[id]); return S; });
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
    draw(dt, hero, foeStates) {
      t += dt; U.uTime.value = t; U.uCam.value.copy(cam.position); U.uFocus.value.set(0, -50, 0); for (const v of U.uFoc.value) v.w = 0;
      drive(H, hero, dt); foeStates.forEach((d, i) => drive(F[i], d, dt)); renderer.render(scene, cam);
    },
    dispose() { H.a.dispose(); for (const S of F) S.a.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch { } },
  };
}
