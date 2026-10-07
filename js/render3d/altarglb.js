// Алтари деревни из Meshy (tools/art/prop_pack.mjs, высота 1, основание y = 0):
//   altar_power — источник силы (каменный алтарь с огненными рунами), altar_chronicle — Летопись битв (сборка 46).
// Грузятся вместе с порталами деревни (renderer3d.js); пока не загрузились или «Новые модели» выключены — прежние процедурные
// модели (goddess_altar.js, chronicle.js), после загрузки слой предметов деревни пересобирается.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { toon } from './toon.js';
import { SKINS } from './glbskin.js';

// red — высота (доля), ниже которой основание тёмно-красное, чтобы не сливалось с брусчаткой; glow — яркость оранжевых рун
const ALTARS = { altar_power: { red: 0.16, glow: 3.2 }, altar_chronicle: { red: 0, glow: 3.2 } };
const OBJ = new Map();
let wait = null;

function load(name) {
  return new GLTFLoader().loadAsync(new URL(`../../assets/models/${name}.glb`, import.meta.url).href).then(g => {
    const A = ALTARS[name];
    g.scene.traverse(o => {
      if (!o.isMesh || OBJ.has(name)) return;
      const mat = toon(0xffffff, { vc: !!A.red, rim: 0.3, rimColor: 0xffb070, side: THREE.DoubleSide, ao: 0.7, aoH: 1.2 });
      mat.map = o.material.map; if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; }
      if (A.red) {
        const P = o.geometry.attributes.position, C = new Float32Array(P.count * 3);
        for (let i = 0; i < P.count; i++) { const k = 1 - THREE.MathUtils.smoothstep(P.getY(i), A.red - 0.03, A.red + 0.03); C.set([1 + 1.8 * k, 1 - 0.55 * k, 1 - 0.6 * k], i * 3); }
        o.geometry.setAttribute('color', new THREE.BufferAttribute(C, 3));
      }
      // свечение оранжевых рун: из текстуры остаются только оранжевые точки — карта свечения
      if (mat.map && mat.map.image) {
        const img = mat.map.image, w = img.width, h = img.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0); const D = cx.getImageData(0, 0, w, h), d = D.data;
        for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], on = r > 110 && r > g * 1.35 && b < r * 0.5; if (!on) d[i] = d[i + 1] = d[i + 2] = 0; }
        cx.putImageData(D, 0, 0); mat.emissiveMap = new THREE.CanvasTexture(cv); mat.emissiveMap.colorSpace = THREE.SRGBColorSpace; mat.emissiveMap.flipY = mat.map.flipY;
        mat.emissive.setRGB(1, 0.72, 0.45); mat.emissiveIntensity = A.glow;
      }
      OBJ.set(name, { geometry: o.geometry, mat });
    });
    return OBJ.has(name);
  }).catch(e => { console.warn(name + '.glb', e); return false; });
}

export function preloadAltar() {
  if (wait) return wait;
  if (typeof document === 'undefined') return (wait = Promise.resolve(false));
  return (wait = Promise.all(Object.keys(ALTARS).map(load)).then(r => r.some(Boolean)));
}
export const altarReady = () => OBJ.size > 0 && SKINS.on;

/** алтарь Meshy (по умолчанию — источник силы) высотой h или null (не загружен / выключены новые модели) */
export function altarMesh(h, name = 'altar_power') {
  const O = SKINS.on && OBJ.get(name);
  if (!O) return null;
  const m = new THREE.Mesh(O.geometry, O.mat); m.scale.setScalar(h); m.castShadow = true; m.userData.noOutline = true;
  return m;
}
