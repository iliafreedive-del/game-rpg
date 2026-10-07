// Алтари деревни из Meshy (tools/art/prop_pack.mjs, высота 1, основание y = 0):
//   altar_power — источник силы (каменный алтарь с огненными рунами), altar_chronicle — Летопись битв (сборка 46).
// Грузятся вместе с порталами деревни (renderer3d.js); пока не загрузились или «Новые модели» выключены — прежние процедурные
// модели (goddess_altar.js, chronicle.js), после загрузки слой предметов деревни пересобирается.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { toon } from './toon.js';
import { SKINS } from './glbskin.js';

// red — высота (доля), ниже которой основание тёмно-красное, чтобы не сливалось с брусчаткой; glow — яркость оранжевых рун
// wheel — колесо, которое крутится на опорах: оно отделяется по связным кускам сетки, целиком лежащим в box [x0,y0,z0, x1,y1,z1]; ось — X через axis [y, z]
const ALTARS = { altar_power: { red: 0.16, redBoxes: [[-0.43, 0.41, 0.0, -0.15, 0.63, 0.3], [0.15, 0.41, 0.0, 0.43, 0.63, 0.3]], glow: 3.2 },   // redBoxes — перчатки с наручами в цвет постамента (сборка 47)
  altar_chronicle: { red: 0, glow: 3.2, wheel: { box: [-0.345, 0.3, -0.16, 0.345, 1.01, 0.0], axis: [0.655, -0.08] } } };

// куски сетки (склейка по треугольникам и совпадающим вершинам) → номера треугольников колеса
function wheelTris(geo, W) {
  const P = geo.attributes.position, I = geo.index.array, nv = P.count, par = Int32Array.from({ length: nv }, (_, i) => i);
  const f = x => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; }, un = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
  const seen = new Map();
  for (let v = 0; v < nv; v++) { const k = P.getX(v).toFixed(4) + ',' + P.getY(v).toFixed(4) + ',' + P.getZ(v).toFixed(4); if (seen.has(k)) un(v, seen.get(k)); else seen.set(k, v); }
  for (let t = 0; t < I.length; t += 3) { un(I[t], I[t + 1]); un(I[t], I[t + 2]); }
  const B = W.box, out = new Map();
  for (let v = 0; v < nv; v++) { const r = f(v), x = P.getX(v), y = P.getY(v), z = P.getZ(v); if (x < B[0] || y < B[1] || z < B[2] || x > B[3] || y > B[4] || z > B[5]) out.set(r, true); }
  const wheel = new Uint8Array(I.length / 3);
  for (let t = 0; t < I.length; t += 3) wheel[t / 3] = out.has(f(I[t])) ? 0 : 1;
  return wheel;
}
function subGeo(geo, I, keep, dy, dz) {
  const g = new THREE.BufferGeometry(), idx = [];
  for (let t = 0; t < keep.length; t++) if (keep[t]) idx.push(I[t * 3], I[t * 3 + 1], I[t * 3 + 2]);
  for (const k in geo.attributes) g.setAttribute(k, geo.attributes[k]);
  g.setIndex(idx);
  if (dy || dz) { g.setAttribute('position', geo.attributes.position.clone()); g.translate(0, -dy, -dz); }
  return g;
}
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
        for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), inBox = (A.redBoxes || []).some(b => x >= b[0] && y >= b[1] && z >= b[2] && x <= b[3] && y <= b[4] && z <= b[5]); const k = inBox ? 1 : 1 - THREE.MathUtils.smoothstep(y, A.red - 0.03, A.red + 0.03); C.set([1 + 1.8 * k, 1 - 0.55 * k, 1 - 0.6 * k], i * 3); }
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
      const O = { geometry: o.geometry, mat };
      if (A.wheel) {
        const w = wheelTris(o.geometry, A.wheel), I = o.geometry.index.array, [ay, az] = A.wheel.axis;
        O.geometry = subGeo(o.geometry, I, w.map(x => 1 - x)); O.wheel = subGeo(o.geometry, I, w, ay, az); O.axis = A.wheel.axis;
      }
      OBJ.set(name, O);
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

/** алтарь Meshy (по умолчанию — источник силы) высотой h или null (не загружен / выключены новые модели);
 *  у алтаря с колесом m.userData.wheel — группа колеса, её крутят по rotation.x */
export function altarMesh(h, name = 'altar_power') {
  const O = SKINS.on && OBJ.get(name);
  if (!O) return null;
  const m = new THREE.Mesh(O.geometry, O.mat); m.scale.setScalar(h); m.castShadow = true; m.userData.noOutline = true;
  if (O.wheel) {
    const piv = new THREE.Group(), w = new THREE.Mesh(O.wheel, O.mat); w.castShadow = true; w.userData.noOutline = true;
    piv.position.set(0, O.axis[0], O.axis[1]); piv.add(w); m.add(piv); m.userData.wheel = piv;
  }
  return m;
}
