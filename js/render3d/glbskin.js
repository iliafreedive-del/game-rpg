// «Шкура» из готовой 3D-модели художника/нейросети (GLB → tools/art/glb_rig.py → assets/models/<имя>.bin/.json/.webp)
// поверх процедурного рига: свой скелет с суставами модели, а движение копируется с костей процедурной модели
// (её анимации не меняются). Копируется не поворот как есть, а отклонение от позы покоя (idle): в покое модель стоит
// ровно так, как её нарисовали, а ходьба, удар, натяжение лука и падение добавляются поверх.
// Процедурные меши прячутся; оружие в руке (лук) — часть модели, поэтому сокеты из model.noEquip не заполняются.
import * as THREE from '../vendor/three.module.min.js';
import { toon, outline } from './toon.js';
import { OUTLINE } from './style.js';

export const SKINS = { on: false };     // переключатель (Настройки → «Новые модели»): false — процедурные модели
const BASE = new URL('../../assets/models/', import.meta.url).href;
const HAS_DOM = typeof document !== 'undefined';
const data = new Map(), wait = new Map();

// загрузить заранее (в начале игры): геометрия и текстура; до загрузки attachSkin оставляет процедурную модель
export function preloadSkin(name) {
  if (!HAS_DOM) return Promise.resolve(null);
  if (wait.has(name)) return wait.get(name);
  const p = (async () => {
    // данные — в .bin рядом; если в .json есть поле b64 (просмотр-артефакт не отдаёт .bin), берутся оттуда
    const meta = await fetch(BASE + name + '.json').then(r => r.json());
    const buf = meta.b64 ? Uint8Array.from(atob(meta.b64), c => c.charCodeAt(0)).buffer : await fetch(BASE + name + '.bin').then(r => r.arrayBuffer());
    const L = meta.layout, n = meta.vertices, V = (T, k) => new T(buf, L[k][0], L[k][1] / T.BYTES_PER_ELEMENT);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(V(Float32Array, 'pos'), 3));
    g.setAttribute('normal', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(V(Int8Array, 'nrm'), 4), 3, 0, true));
    g.setAttribute('uv', new THREE.BufferAttribute(V(Uint16Array, 'uv'), 2, true));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(V(Uint8Array, 'si'), 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(V(Uint8Array, 'sw'), 4, true));
    g.setIndex(new THREE.BufferAttribute(V(Uint16Array, 'idx'), 1));
    g.computeBoundingSphere();
    const tex = await new THREE.TextureLoader().loadAsync(BASE + name + '.webp');
    tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 4;   // UV из GLB — без переворота
    const d = { meta, geo: g, tex, n }; data.set(name, d); return d;
  })().catch(e => { console.warn('skin', name, e); return null; });
  wait.set(name, p); return p;
}
export const skinLoaded = name => data.has(name);

const _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _m = new THREE.Matrix4(), _inv = new THREE.Matrix4();
// повороты костей относительно корня модели
function worldQ(o, root, out) { _inv.copy(root.matrixWorld).invert(); _m.multiplyMatrices(_inv, o.matrixWorld); _m.decompose(_v, out, _s); return out; }
const _v = new THREE.Vector3(), _s = new THREE.Vector3(), _d = new THREE.Vector3(), _u = new THREE.Vector3(), _t = new THREE.Vector3(), _qc = new THREE.Quaternion();

/**
 * Надеть шкуру name на построенную процедурную модель героя (model из heroModel). o: { rim, rimColor, noEquip: ['handL'], legK }
 * Возвращает ту же модель (с подменённым видом) или её же без изменений, если шкура не загружена / выключена.
 */
export function attachSkin(kit, model, name, o = {}) {
  const d = data.get(name); if (!SKINS.on || !d) return model;
  const { meta, geo, tex } = d, B = model.bones, root = model.root;
  // спрятать процедурные меши (и не сливать их в SkinnedMesh актёра)
  root.traverse(m => { if (m.isMesh) { m.visible = false; m.userData.noBake = true; m.userData.noOutline = true; } });
  // скелет модели: кости в суставах шкуры, поворот покоя — нулевой
  const at = {}, bones = [], byName = {};
  for (const [b, p, a] of meta.bones) {
    const bone = new THREE.Bone(); bone.name = b; at[b] = a; byName[b] = bone; bones.push(bone);
    const pa = p ? at[p] : [0, 0, 0]; bone.position.set(a[0] - pa[0], a[1] - pa[1], a[2] - pa[2]);
    (p ? byName[p] : root).add(bone);
  }
  const mat = toon(0xffffff, { map: tex, rim: o.rim ?? 0.6, rimColor: o.rimColor ?? 0xffe0a0, ao: 0.75, aoH: 0.6 });
  const mesh = new THREE.SkinnedMesh(geo, mat); mesh.frustumCulled = false; mesh.castShadow = true; mesh.userData.noBake = true; mesh.userData.noOutline = true;
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  const ol = new THREE.SkinnedMesh(geo, outline({ width: OUTLINE.hero, color: OUTLINE.heroColor })); ol.frustumCulled = false; ol.userData.isOutline = true; ol.userData.noBake = true;
  root.add(ol); ol.bind(mesh.skeleton, mesh.bindMatrix);

  // поза покоя процедурной модели: idle в момент t=0
  const map = bones.map(b => [b, B[{ elL: 'elL', elR: 'elR' }[b.name] || b.name]]).filter(([, p]) => p);
  model.anims.idle({ t: 0, dt: 0, time: 0, speed: 0, move: 0, combo: 0, back: false, env: {} });
  root.updateMatrixWorld(true);
  const idleQ = new Map(), idleP = new Map(), restP = new Map();
  for (const [b, p] of map) { idleQ.set(b, worldQ(p, root, new THREE.Quaternion()).invert()); idleP.set(b, p.position.clone()); restP.set(b, b.position.clone()); }
  const legK = o.legK ?? 1, wq = new Map();
  const bowHand = o.bowHand ? byName[o.bowHand] : null, armDir = new THREE.Vector3(...at.elL).sub(new THREE.Vector3(...at.armL)).normalize();
  // копирование движения: Wнов = Wтек · Wпокоя⁻¹ (в пространстве корня), локальный = Wнов(родитель)⁻¹ · Wнов
  function sync() {
    for (const [b, p] of map) wq.set(b, worldQ(p, root, new THREE.Quaternion()).multiply(idleQ.get(b)));
    // лук в руке: в покое висит вдоль руки; когда рука поднята вперёд (прицел), кисть доворачивает лук вертикально
    // (поперёк руки, как у настоящего лучника), иначе он ложится горизонтально над головой. Вертикаль — в системе оси кувырка.
    if (bowHand) {
      const wa = wq.get(byName.armL), wh = wq.get(bowHand), wsp = wq.get(byName.spin);
      const f = Math.min(1, Math.max(0, (_d.copy(armDir).applyQuaternion(wa).y + 0.6) / 0.6)), ff = f * f * (3 - 2 * f);
      if (ff > 0.001) {
        _u.set(0, 1, 0).applyQuaternion(wh); _t.set(0, 1, 0).applyQuaternion(wsp);
        _qc.setFromUnitVectors(_u, _t); _q.identity().slerp(_qc, ff); wh.premultiply(_q);
      }
    }
    for (const [b, p] of map) {
      const w = wq.get(b), pw = b.parent && wq.get(b.parent);
      b.quaternion.copy(pw ? _qi.copy(pw).invert().multiply(w) : w);
      // сдвиги: ось кувырка, покачивание таза и ног (ноги короче — сдвиг меньше)
      const n = b.name, k = n === 'spin' ? 1 : n === 'hips' || n === 'legL' || n === 'legR' ? legK : 0;
      if (k) b.position.copy(restP.get(b)).addScaledVector(_v.subVectors(p.position, idleP.get(b)), k);
    }
  }
  sync();
  const upd = model.update;
  model.update = (dt, t, env, actor) => { if (upd) upd(dt, t, env, actor); root.updateMatrixWorld(true); sync(); };
  model.materials = [...(model.materials || []), mat];
  model.noEquip = o.noEquip || [];
  model.skin = name;
  return model;
}
