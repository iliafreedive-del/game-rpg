// «Шкура» из готовой 3D-модели художника/нейросети (GLB → tools/art/glb_rig.py → assets/models/<имя>.bin/.json/.webp)
// поверх процедурного рига: свой скелет с суставами модели, а движение копируется с костей процедурной модели
// (её анимации не меняются). Копируется не поворот как есть, а отклонение от позы покоя (idle): в покое модель стоит
// ровно так, как её нарисовали, а ходьба, удар, натяжение лука и падение добавляются поверх.
// Процедурные меши прячутся; оружие в руке (лук) — часть модели, поэтому сокеты из model.noEquip не заполняются.
import * as THREE from '../vendor/three.module.min.js';
import { toon, outline } from './toon.js';
import { OUTLINE } from './style.js';
import { fixZeroNormals } from './geo.js';

export const SKINS = { on: true };     // переключатель (Настройки → «Новые модели»): false — процедурные модели
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
    fixZeroNormals(g); g.computeBoundingSphere();
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
  const map = bones.map(b => [b, B[b.name]]).filter(([, p]) => p);   // nock (середина тетивы) — своя кость, без пары в риге
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
  // ---- выстрел из лука: руки ставятся заново по длинам рук самой модели (копия позы старого рига уводила правую руку
  // в грудь и наклоняла лук). Стойка как у настоящего лучника: корпус боком к цели, левая рука с луком прямо на цель
  // на высоте плеча, лук вертикально и поперёк руки, правая рука с высоким локтем тянет тетиву к щеке, середина тетивы
  // (кость nock) идёт за правой кистью. Цель — вперёд по +Z модели. model.bowAim / bowPull — из позы старого рига (_hero.js).
  const nock = byName.nock, nockRest = nock ? nock.position.clone() : null;
  const bowBindInv = new THREE.Matrix4();
  if (meta.bow) { const u = new THREE.Vector3(...meta.bow.up).normalize(), b = new THREE.Vector3(...meta.bow.belly); b.addScaledVector(u, -b.dot(u)).normalize(); bowBindInv.makeBasis(b, u, new THREE.Vector3().crossVectors(b, u)).invert(); }
  // стрела на тетиве: от середины тетивы через рукоять лука вперёд; видна, пока лучник целится, до спуска (дальше летит снаряд игры)
  let arrow = null;
  if (o.arrow && nock) {
    const { part, merge } = kit, F = o.arrow.fletch ?? 0x6b3fd0;
    const g = merge([
      part(new THREE.CylinderGeometry(0.011, 0.011, 0.86, 5), 0x6a4426, [0, 0, 0.43], [Math.PI / 2, 0, 0], 1, { top: 0xa87444 }),
      part(new THREE.ConeGeometry(0.028, 0.11, 4), 0x9a9aa8, [0, 0, 0.9], [Math.PI / 2, 0, 0], 1, { top: 0xe0e0ea }),
      ...[0, 1, 2].map(i => part(new THREE.BoxGeometry(0.004, 0.05, 0.13), F, [0, 0, 0.09], [0, 0, i * 2.094], [1, 1, 1], { top: 0xb48cff })).map((gg, i) => { gg.translate(Math.sin(i * 2.094) * 0.025, Math.cos(i * 2.094) * 0.025, 0); return gg; }),
    ]);
    if (o.arrow.scale) g.scale(o.arrow.scale, o.arrow.scale, o.arrow.scale);
    arrow = new THREE.Mesh(g, kit.mat({ rim: 0.4 })); arrow.userData.noBake = true; arrow.userData.noOutline = true; arrow.visible = false; root.add(arrow);
    model.materials = [...(model.materials || []), arrow.material];
  }
  const UP = new THREE.Vector3(0, 1, 0), AIM = new THREE.Vector3(0, 0, 1), _rinv = new THREE.Matrix4(), _mm = new THREE.Matrix4(), _mb = new THREE.Matrix4();
  const V = Array.from({ length: 12 }, () => new THREE.Vector3()), Q = Array.from({ length: 6 }, () => new THREE.Quaternion());
  const rsM = o3 => _mm.multiplyMatrices(_rinv, o3.matrixWorld);
  const rsPos = (o3, out) => out.setFromMatrixPosition(rsM(o3));
  const rsQuat = (o3, out) => { rsM(o3).decompose(_v, out, _s); return out; };
  const refresh = () => { root.updateMatrixWorld(true); _rinv.copy(root.matrixWorld).invert(); };
  const setWorldQ = (b, q) => { const pq = b.parent === root ? Q[5].identity() : rsQuat(b.parent, Q[5]); b.quaternion.copy(pq.invert().multiply(q)); };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  // двухзвенная IK руки: плечо → локоть → кисть в точку T, локоть смотрит в сторону pole; w — сила (0…1)
  function ik(arm, el, hand, T, pole, w) {
    refresh();
    const S = rsPos(arm, V[0]), E0 = rsPos(el, V[1]), H0 = rsPos(hand, V[2]);
    const L1 = S.distanceTo(E0), L2 = E0.distanceTo(H0), d = V[3].subVectors(T, S), D = clamp(d.length(), Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.005); d.normalize();
    const p = V[4].copy(pole).addScaledVector(d, -pole.dot(d)).normalize(), cA = clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1), sA = Math.sqrt(1 - cA * cA);
    const E = V[5].copy(S).addScaledVector(d, L1 * cA).addScaledVector(p, L1 * sA), H = V[6].copy(S).addScaledVector(d, D);
    const qa = rsQuat(arm, Q[0]), qe = rsQuat(el, Q[1]);
    const qU = Q[2].setFromUnitVectors(V[7].subVectors(E0, S).normalize(), V[8].subVectors(E, S).normalize()); qU.copy(Q[4].identity().slerp(qU, w));
    const na = Q[3].copy(qU).multiply(qa);
    const fd = V[9].subVectors(H0, E0).normalize().applyQuaternion(qU), qF = Q[4].setFromUnitVectors(fd, V[10].subVectors(H, E).normalize());
    qF.copy(new THREE.Quaternion().slerp(qF, w));
    const ne = qF.multiply(qU).multiply(qe);
    setWorldQ(arm, na); el.quaternion.copy(na.clone().invert().multiply(ne));
  }
  function bowShot() {
    if (nock) nock.position.copy(nockRest);
    if (arrow) arrow.visible = false;
    const aim = model.bowAim || 0; if (!bowHand || aim < 0.001) return;
    const pull = model.bowPull || 0, T = byName.torso, Hd = byName.head;
    // корпус ещё сильнее боком (левым плечом к цели), голова поворачивается обратно — смотрит на цель
    T.quaternion.premultiply(Q[0].setFromAxisAngle(UP, -0.5 * aim)); Hd.quaternion.premultiply(Q[0].setFromAxisAngle(UP, 0.5 * aim));
    refresh();
    // линия стрелы: на высоте плеча, сбоку от лица (со стороны груди) на «радиус» головы — иначе правая рука у щеки
    // оказывается внутри капюшона и груди. Левая рука с луком — на этой линии впереди, правая — на ней же у щеки.
    const SL = rsPos(byName.armL, new THREE.Vector3()), head = rsPos(Hd, new THREE.Vector3()), tc = rsPos(T, new THREE.Vector3());
    const chest = V[1].set(0, 0, 1).applyQuaternion(rsQuat(T, Q[1])).setY(0).normalize();   // куда смотрит грудь
    const line = head.clone().addScaledVector(chest, o.cheek ?? 0.27); line.y = SL.y + 0.04;
    const reach = SL.distanceTo(rsPos(byName.elL, V[11])) + V[11].distanceTo(rsPos(bowHand, V[0]));
    const fwd = Math.sqrt(Math.max(0.01, reach * reach * 0.9 - (line.x - SL.x) ** 2 - (line.y - SL.y) ** 2));   // рука почти прямая
    const TL = new THREE.Vector3(line.x, line.y, SL.z + fwd);
    ik(byName.armL, byName.elL, bowHand, TL, new THREE.Vector3(1, -0.6, 0), aim);
    // лук вертикально, «пузом» к цели: ось лука (Y в покое) — вверх, выпуклость (+X в покое) — на цель
    refresh();
    // плоскость лука в модели — наискось (meta.bow из glb_rig.py: ось и «пузо»); поворот, который ставит ось вверх, а пузо — на цель
    _mb.makeBasis(AIM, UP, V[0].crossVectors(AIM, UP)).multiply(bowBindInv);
    const qh = rsQuat(bowHand, Q[1]).slerp(Q[2].setFromRotationMatrix(_mb), aim); setWorldQ(bowHand, qh.clone());
    // правая рука: от тетивы у лука к щеке по линии стрелы; локоть высоко, назад и наружу
    refresh();
    const hand = rsPos(bowHand, new THREE.Vector3()), SR = rsPos(byName.armR, new THREE.Vector3());
    const cheek = new THREE.Vector3(line.x, line.y, head.z + 0.02);
    const nockAt = new THREE.Vector3(line.x, line.y, hand.z - 0.22);
    const TR = nockAt.lerp(cheek, pull);
    const pole = SR.clone().sub(tc).setY(0).normalize().addScaledVector(UP, 0.9).addScaledVector(AIM, -0.6);
    ik(byName.armR, byName.elR, byName.handR, TR, pole, aim);
    // середина тетивы — к правой кисти
    if (nock && pull > 0.001) {
      refresh();
      const hm = rsM(bowHand).clone(), rest = nockRest.clone().applyMatrix4(hm), to = rsPos(byName.handR, V[1]);
      nock.position.copy(rest.lerp(to, pull).applyMatrix4(hm.invert()));
    }
    // стрела: хвост — в середине тетивы, наконечник — через рукоять лука
    if (arrow && aim > 0.3 && (model.bowRel || 0) < 0.05) {
      refresh();
      const tail = rsPos(nock, V[2]), grip = rsPos(bowHand, V[3]).addScaledVector(UP, 0.04);
      arrow.position.copy(tail); arrow.quaternion.setFromUnitVectors(V[4].set(0, 0, 1), V[5].subVectors(grip, tail).normalize()); arrow.visible = true;
    }
  }
  sync(); bowShot();
  // след клинка (o.trail = { bone, from, to, color }): лента по точкам от гарды до острия за последние доли секунды удара —
  // точки берутся с кости кисти каждый кадр, поэтому след повторяет путь самого меча
  let trail = null;
  if (o.trail && byName[o.trail.bone] && kit.scene) {
    const tb = byName[o.trail.bone], inv = new THREE.Matrix4().copy(tb.matrixWorld).invert().multiply(root.matrixWorld);
    const lf = new THREE.Vector3(...o.trail.from).applyMatrix4(inv), lt = new THREE.Vector3(...o.trail.to).applyMatrix4(inv);
    const N = 16, LIFE = 0.22, pos = new Float32Array(N * 2 * 3), col = new Float32Array(N * 2 * 4), idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 4)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.frustumCulled = false; m.renderOrder = 5; m.userData.noOutline = true; m.visible = false; kit.scene.add(m);
    const c = new THREE.Color(o.trail.color ?? 0xffffff), S = [], _a = new THREE.Vector3(), _b = new THREE.Vector3();
    trail = (dt, actor) => {
      for (const p of S) p.age += dt;
      while (S.length && S[0].age > LIFE) S.shift();
      if (actor && actor.clip === 'attack') { tb.updateMatrixWorld(true); S.push({ a: _a.copy(lf).applyMatrix4(tb.matrixWorld).clone(), b: _b.copy(lt).applyMatrix4(tb.matrixWorld).clone(), age: 0 }); if (S.length > N) S.shift(); }
      m.visible = S.length > 1; if (!m.visible) return;
      for (let i = 0; i < N; i++) {
        const p = S[Math.min(i, S.length - 1)], w = i < S.length ? Math.max(0, 1 - p.age / LIFE) * (i / (S.length - 1 || 1)) : 0;
        pos.set([p.a.x, p.a.y, p.a.z, p.b.x, p.b.y, p.b.z], i * 6);
        col.set([c.r, c.g, c.b, w * 0.1, c.r, c.g, c.b, w * 0.7], i * 8);
      }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    };
    const dsp = model.dispose; model.dispose = () => { if (dsp) dsp(); m.removeFromParent(); g.dispose(); m.material.dispose(); };
  }
  const upd = model.update;
  model.update = (dt, t, env, actor) => { if (upd) upd(dt, t, env, actor); root.updateMatrixWorld(true); sync(); bowShot(); if (trail) trail(dt, actor); };
  model.materials = [...(model.materials || []), mat];
  model.noEquip = o.noEquip || [];
  model.skin = name;
  return model;
}
