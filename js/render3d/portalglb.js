// Порталы деревни из Meshy (assets/models/portals.glb, tools/art/portals_pack.mjs): пять арок, узел = арка, высота 1, лицом к +Z.
// Грузятся при запуске 3D (renderer3d.js); пока не загрузились или «Новые модели» выключены — прежние процедурные арки
// (js/render3d/models/prop/_portals.js), после загрузки слой предметов деревни пересобирается.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { toon } from './toon.js';
import { SKINS } from './glbskin.js';

const URL_ = new URL('../../assets/models/portals.glb', import.meta.url).href;
const OBJ = new Map();   // имя арки → { geometry, mat }
let wait = null, ready = false;

// сборка 46: второй пак — череп (Жатва Бездны) и руки (новый портал в верхнем углу деревни), своя текстура
const PACKS = [URL_, new URL('../../assets/models/portals2.glb', import.meta.url).href];
export function preloadPortals() {
  if (wait) return wait;
  if (typeof document === 'undefined') return (wait = Promise.resolve(false));
  wait = Promise.all(PACKS.map(u => new GLTFLoader().loadAsync(u).then(g => {
    let mat = null;
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      if (!mat) { mat = toon(0xffffff, { rim: 0.25, rimColor: 0xd8d0ff, side: THREE.DoubleSide, ao: 0.7, aoH: 1.2 }); mat.map = o.material.map; if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; } }
      OBJ.set(o.name, { geometry: o.geometry, mat });
    });
  }))).then(() => (ready = true)).catch(e => { console.warn('portals.glb', e); return false; });
  return wait;
}
export const portalsReady = () => ready && SKINS.on;

// h — высота арки в игре (м); вихрь: y — центр, sx/sy — полуоси по размеру проёма (в долях высоты)
export const PORTAL_GLB = {
  portal_skulls: { h: 4.0, y: 0.36, sx: 0.24, sy: 0.32 },   // каменная готика с черепами — катакомбы
  portal_white: { h: 3.9, y: 0.36, sx: 0.22, sy: 0.33 },    // ледяная с рунами — фьорды
  portal_bones: { h: 4.2, y: 0.38, sx: 0.25, sy: 0.34 },    // из костей с черепом — пустоши
  portal_sun: { h: 4.0, y: 0.38, sx: 0.25, sy: 0.35 },      // каменная с солнцем — лес
  portal_swords: { h: 4.2, y: 0.36, sx: 0.24, sy: 0.33 },   // с мечами — новый, пока никуда не ведёт
  portal_skull: { h: 4.3, y: 0.3, sx: 0.13, sy: 0.23 },     // раскрытая пасть черепа — Жатва Бездны (сборка 46)
  portal_hands: { h: 4.2, y: 0.36, sx: 0.17, sy: 0.34 },    // каменные руки — верхний угол деревни, пока никуда не ведёт (сборка 46)
};

/** арка Meshy или null (не загружена / выключены новые модели) */
export function portalMesh(name) {
  const O = portalsReady() && OBJ.get(name), S = PORTAL_GLB[name];
  if (!O || !S) return null;
  const m = new THREE.Mesh(O.geometry, O.mat); m.scale.setScalar(S.h); m.userData.noOutline = true;
  return m;
}
