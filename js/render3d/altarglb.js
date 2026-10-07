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
      const mat = toon(0xffffff, { vc: true, rim: 0.3, rimColor: 0xffb070, side: THREE.DoubleSide, ao: 0.7, aoH: 1.2 });
      mat.map = o.material.map; if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; }
      // основание (ступени, нижние ~16 % высоты) — тёмно-красное, чтобы не сливалось с брусчаткой площади (сборка 46)
      const P = o.geometry.attributes.position, C = new Float32Array(P.count * 3);
      for (let i = 0; i < P.count; i++) { const k = 1 - THREE.MathUtils.smoothstep(P.getY(i), 0.13, 0.19); C.set([1 + 1.8 * k, 1 - 0.55 * k, 1 - 0.6 * k], i * 3); }
      o.geometry.setAttribute('color', new THREE.BufferAttribute(C, 3));
      // свечение оранжевых рун: из текстуры остаются только оранжевые точки — карта свечения
      if (mat.map && mat.map.image) {
        const img = mat.map.image, w = img.width, h = img.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0); const D = cx.getImageData(0, 0, w, h), d = D.data;
        for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], on = r > 150 && r > g * 1.35 && b < r * 0.45; if (!on) d[i] = d[i + 1] = d[i + 2] = 0; }
        cx.putImageData(D, 0, 0); mat.emissiveMap = new THREE.CanvasTexture(cv); mat.emissiveMap.colorSpace = THREE.SRGBColorSpace; mat.emissiveMap.flipY = mat.map.flipY;
        mat.emissive.setRGB(1, 0.75, 0.5); mat.emissiveIntensity = 1.6;
      }
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
