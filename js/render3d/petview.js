// Окошко питомца (лавка Кофи, П61 «страница питомца»): модель из Meshy крупно, сама медленно поворачивается, пальцем/мышью — крутить.
// Тот же WebGL-контекст, что у Летописи (hwstage sharedRenderer): лишний контекст iOS отбирает у основной игры.
// Процедурная модель не показывается никогда: шкура не догрузилась (или «Новые модели» выключены) — null, окно оставляет портрет.
// Им же рисуются портреты для списка (tools/art/pet_portraits.mjs) — вид в окне и на картинке один.
import * as THREE from '../vendor/three.module.min.js';
import { makeKit } from './kit.js';
import { Actor } from './actor.js';
import { U } from './toon.js';
import { PET_MODELS } from './models/pet/pets.js';
import { preloadSkin, skinLoaded, SKINS } from './glbskin.js';
import { petFx } from './models/pet/petfx.js';

export const PET_YAW = -0.55;
const ZOOM = { crow: 1.7, bat: 0.8 };   // ворон: у крыльев прозрачные перья (кадр по ним — птичка крошечная); мышь машет выше своих габаритов   // три четверти: мордой к зрителю и чуть влево
export async function petView(id, renderer) {
  if (!PET_MODELS[id] || !SKINS.on) return null;
  await Promise.race([preloadSkin('pet_' + id), new Promise(r => setTimeout(r, 8000))]).catch(() => {});
  if (!skinLoaded('pet_' + id)) return null;
  const R = renderer || (await import('./hwstage.js')).sharedRenderer();
  const scene = new THREE.Scene(), kit = makeKit(scene), env = { wind: new THREE.Vector2(0.25, 0) };
  scene.add(new THREE.HemisphereLight(0xc8d4ff, 0x4a3a30, 1.5));
  const key = new THREE.DirectionalLight(0xffe2b0, 2.6); key.position.set(-4, 7, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb060, 1.6); rim.position.set(5, 3, -6); scene.add(rim);   // тёплый контур сзади — как свечение питомца в игре
  const a = new Actor(PET_MODELS[id], kit, scene); a.yaw = a.targetYaw = PET_YAW; a.shadow.material.opacity *= 0.8;
  for (let i = 0; i < 30; i++) a.update(1 / 30, { clip: 'idle' }, env);   // поза покоя устоялась (крылья сложены, подъём набран) — по ней и кадр
  // кадр по габаритам модели в позе (летуны висят выше — подъём в кадре, их тень внизу не нужна)
  const box = new THREE.Box3(), fly = !!PET_MODELS[id].fly; if (fly) a.shadow.visible = false;
  a.root.traverse(o => { if (!o.isMesh || o.userData.isOutline || !o.geometry || o.isSprite) return;
    if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)); }
    else { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
  if (!fly) box.min.y = Math.min(box.min.y, 0);
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(28, 1, 0.05, 50), el = fly ? 0.62 : 0.3, need = Math.max(sz.y, sz.x, sz.z) * 0.5 / (ZOOM[id] || 1);
  let t = 0, yaw = PET_YAW, w = 0, h = 0;
  const frame = () => { const d = need / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) / Math.min(1, cam.aspect) * 1.18;
    cam.position.set(c.x, c.y + Math.sin(el) * d, c.z + Math.cos(el) * d); cam.lookAt(c.x, c.y, c.z); cam.updateMatrixWorld(true); };
  frame();
  return {
    renderer: R, canvas: R.domElement, get yaw() { return yaw; }, set yaw(v) { yaw = v; },
    resize(W, H, dpr = Math.min(2, devicePixelRatio || 1)) { if (W === w && H === h) return; w = W; h = H; R.setPixelRatio(dpr); R.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); frame(); },
    draw(dt) {
      t += dt; a.yaw = a.targetYaw = yaw;
      // общие юниформы игры (toon.js): на время своего кадра — без тумана и растворения «заслонов», потом как было
      const sv = [U.uCam.value.clone(), U.uFocus.value.clone(), U.uFoc.value.map(v => v.w), U.uHFog.value];
      U.uCam.value.copy(cam.position); U.uFocus.value.set(0, -50, 0); for (const v of U.uFoc.value) v.w = 0; U.uHFog.value = 0;
      a.update(dt, { clip: 'idle' }, env); petFx(a, scene, dt, t); R.render(scene, cam);
      U.uCam.value.copy(sv[0]); U.uFocus.value.copy(sv[1]); U.uFoc.value.forEach((v, i) => { v.w = sv[2][i]; }); U.uHFog.value = sv[3];
    },
    dispose() { if (a.fxMotes) a.fxMotes.dispose(); a.dispose(); R.renderLists.dispose(); R.clear(); },
  };
}
