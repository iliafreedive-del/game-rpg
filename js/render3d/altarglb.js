// Источник силы из Meshy (assets/models/altar_power.glb, tools/art/prop_pack.mjs): каменный алтарь с рунами, высота 1, основание y = 0.
// Грузится вместе с порталами деревни (renderer3d.js); пока не загрузился или «Новые модели» выключены — прежняя процедурная рука
// (js/render3d/models/prop/goddess_altar.js), после загрузки слой предметов деревни пересобирается.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { toon } from './toon.js';
import { SKINS } from './glbskin.js';

const URL_ = new URL('../../assets/models/altar_power.glb', import.meta.url).href;
let O = null, wait = null;

export function preloadAltar() {
  if (wait) return wait;
  if (typeof document === 'undefined') return (wait = Promise.resolve(false));
  wait = new GLTFLoader().loadAsync(URL_).then(g => {
    g.scene.traverse(o => {
      if (!o.isMesh || O) return;
      const mat = toon(0xffffff, { rim: 0.3, rimColor: 0xffb070, side: THREE.DoubleSide, ao: 0.7, aoH: 1.2 });
      mat.map = o.material.map; if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; }
      O = { geometry: o.geometry, mat };
    });
    return !!O;
  }).catch(e => { console.warn('altar_power.glb', e); return false; });
  return wait;
}
export const altarReady = () => !!O && SKINS.on;

/** алтарь Meshy высотой h или null (не загружен / выключены новые модели) */
export function altarMesh(h) {
  if (!altarReady()) return null;
  const m = new THREE.Mesh(O.geometry, O.mat); m.scale.setScalar(h); m.castShadow = true; m.userData.noOutline = true;
  return m;
}
