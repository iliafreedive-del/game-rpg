// «Летопись битв» в 3D: те же модели и материалы, что в основной игре, но вид сбоку плоской ортографической камерой («3D, но плоское»).
// Фон рисует 2D-слой под этим холстом (hwscenes.js), поверх — полосы здоровья, цифры и дуги ударов; здесь только бойцы.
import * as THREE from '../vendor/three.module.min.js';
import { makeKit } from './kit.js';
import { Actor } from './actor.js';
import { HEROES, MOBS, WEAPONS, WEAPON_MODEL, OFFHAND_MODEL } from './registry.js';
import { U } from './toon.js';
import { HERO } from './style.js';

// освещение по главе: подземелье — холодное с тёплым факелом, лес — солнечное, снега — холодный день, скалы — закат
const LIGHTS = [
  { sky: 0x8a96d8, ground: 0x3a2c30, hi: 1.5, key: 0xffc890, ki: 2.6 },
  { sky: 0xb8e0c8, ground: 0x7a6a40, hi: 1.7, key: 0xfff0c0, ki: 3.0 },
  { sky: 0xd0e4f6, ground: 0xdde8f2, hi: 1.7, key: 0xfff4e4, ki: 2.8 },
  { sky: 0xe8b8a0, ground: 0x6a4a3c, hi: 1.5, key: 0xffb070, ki: 3.0 },
];
export const webglOK = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

export function createStage(canvas, { cls, wt, enemyType, boss, ci }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), kit = makeKit(scene), L = LIGHTS[ci] || LIGHTS[0];
  scene.add(new THREE.HemisphereLight(L.sky, L.ground, L.hi * 0.8));
  const key = new THREE.DirectionalLight(L.key, L.ki * 0.8); key.position.set(-6, 9, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb8c8ff, 0.9); rim.position.set(6, 4, -8); scene.add(rim);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
  const env = { wind: new THREE.Vector2(0.25, 0) };
  const mk = (def, scale) => { const a = new Actor(def, kit, scene); a.shadow.visible = false; if (scale) a.root.scale.setScalar(scale); const g = new THREE.Group(); scene.add(g); scene.remove(a.root); g.add(a.root); return { a, g, scale: scale || 1 }; };
  const heroDef = HEROES[cls] || HEROES.warrior, foeDef = MOBS[enemyType] || MOBS.skel_warrior;
  const H = mk(heroDef, HERO.scale), F = mk(foeDef, boss ? 0.72 : 1);
  { const wm = WEAPONS[WEAPON_MODEL[wt] || 'sword_iron'], off = OFFHAND_MODEL[cls] ? WEAPONS[OFFHAND_MODEL[cls]] : null;
    if (wt === 'bow') { H.a.equip('handL', wm); } else { H.a.equip('handR', wm); H.a.equip('handL', off); }
    for (const [slot, id] of Object.entries(F.a.model.defaultWeapons || {})) F.a.equip(slot, WEAPONS[id]); }
  let W = 0, Hh = 0, halfW = 3.4, halfH = 3, px = [0, 0], last = { H: null, F: null }, t = 0;
  function resize(w, h) {
    W = w; Hh = h; renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(w, h, false);
    halfW = w / h > 1.2 ? 5.4 : 4.4; halfH = halfW * h / w;
    cam.left = -halfW; cam.right = halfW; cam.top = halfH; cam.bottom = -halfH; cam.updateProjectionMatrix();
    const cy = 0.6 * halfH;   // земля (y = 0) — на 80 % высоты кадра (центр кадра выше земли)
    cam.position.set(0, cy + 2.2, 20); cam.lookAt(0, cy, 0);
  }
  const pxPerM = () => Hh / (2 * halfH);
  const worldX = f => (f - 0.5) * 2 * halfW;
  // d: { x (доли ширины), hop (м), rot, sx, lean (+1/−1: куда «вперёд»), face (+1 вправо), clip, k, impact, combo, speed, flash }
  function drive(S, d, dt) {
    const prev = last[S === H ? 'H' : 'F'], x = worldX(d.x), v = prev == null ? 0 : Math.abs(x - prev) / Math.max(dt, 1e-3); last[S === H ? 'H' : 'F'] = x;
    S.g.position.set(x, d.hop || 0, 0); S.g.rotation.z = -(d.rot || 0) * (d.lean || 1); S.g.scale.set(d.sx || 1, 1 / Math.sqrt(d.sx || 1), 1);
    S.a.faceAngle(d.face > 0 ? Math.PI / 2 : -Math.PI / 2);
    S.a.update(dt, { clip: d.clip || (v > 0.9 ? 'walk' : 'idle'), k: d.k, impact: d.impact, combo: d.combo, speed: d.clip ? 0 : Math.min(4, v) }, env);
    S.a.flash(d.flash || 0, 0xffffff);
  }
  return {
    resize, worldX, pxPerM, get halfW() { return halfW; },
    draw(dt, hero, foe) {
      t += dt; U.uTime.value = t; U.uCam.value.copy(cam.position); U.uFocus.value.set(0, -50, 0);
      drive(H, hero, dt); drive(F, foe, dt); renderer.render(scene, cam);
    },
    dispose() { H.a.dispose(); F.a.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch { } },
  };
}
