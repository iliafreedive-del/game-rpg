// Готовые ригнутые модели (Meshy: «Применить риг» + анимации → tools/art/glb_pack.py → assets/models/<имя>.glb) в формате моделей игры
// (docs/MODEL_SPEC.md): клипы idle/walk/attack/hit/cast/death. Ходьба и бег — из анимаций файла (клип /run/ — если есть; иначе бег
// собирается из ходьбы: быстрее, шире шаг, корпус подпрыгивает); атака, рёв, удар и смерть — движения корпуса и головы поверх клипа.
// Скелет у каждого экземпляра свой (SkeletonUtils.clone), материал — тон игры с текстурой модели, обводка — своя (тоже со скинингом).
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { clone as cloneSkinned } from '../vendor/SkeletonUtils.js';
import { toon, outline } from './toon.js';
import { OUTLINE } from './style.js';
import { clamp, smooth, lerp } from './rig.js';

const BASE = new URL('../../assets/models/', import.meta.url).href;
const HAS_DOM = typeof document !== 'undefined';
const data = new Map(), wait = new Map();

export function preloadMob(name) {
  if (!HAS_DOM) return Promise.resolve(null);
  if (wait.has(name)) return wait.get(name);
  // .glb; если сервер его не отдаёт (просмотр-артефакт) — тот же файл в base64 внутри <имя>.glb.json
  const p = fetch(BASE + name + '.glb').then(r => r.ok ? r.arrayBuffer() : fetch(BASE + name + '.glb.json').then(r2 => r2.json()).then(j => Uint8Array.from(atob(j.b64), c => c.charCodeAt(0)).buffer))
    .then(buf => new GLTFLoader().parseAsync(buf, BASE)).then(g => {
    g.scene.updateMatrixWorld(true);
    let geoH = 0; g.scene.traverse(o => { if (o.isSkinnedMesh) { o.geometry.computeBoundingBox(); geoH = Math.max(geoH, o.geometry.boundingBox.max.y - o.geometry.boundingBox.min.y); } });
    const box = new THREE.Box3().setFromObject(g.scene);
    const d = { gltf: g, box, geoH, walk: g.animations.find(c => /walk/i.test(c.name)) || g.animations.find(c => !/run|idle|attack|death/i.test(c.name)) || g.animations[0], run: g.animations.find(c => /run|gallop/i.test(c.name)) || null };
    data.set(name, d); return d;
  }).catch(e => { console.warn('mob', name, e); return null; });
  wait.set(name, p); return p;
}
export const mobLoaded = name => data.has(name);

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _ax = new THREE.Vector3(), _m = new THREE.Matrix4(), _pq = new THREE.Quaternion();
// повернуть кость вокруг оси, заданной в пространстве модели (кости Meshy повёрнуты как угодно — так не нужно знать их оси)
function turn(bone, root, axis, ang) {
  if (!bone || !ang) return;
  _m.copy(root.matrixWorld).invert().multiply(bone.parent.matrixWorld); _m.decompose(_ax, _pq, _ax);
  _q.setFromAxisAngle(axis, ang); _q2.copy(_pq).invert().multiply(_q).multiply(_pq); bone.quaternion.premultiply(_q2);
}
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

/**
 * Модель из ригнутого GLB. o: { height — рост с ушами (м), rim, rimColor, tint — цвет-множитель текстуры, speed0 — скорость,
 * при которой ходьба идёт «как в файле» (м/с), run — с какой скорости бег (м/с) }
 */
export function buildMob(kit, name, o = {}) {
  const D = data.get(name); if (!D) return null;
  const H = o.height ?? 1.2, k = H / (D.box.max.y - D.box.min.y);
  const root = new THREE.Group(), spin = new THREE.Group(), body = new THREE.Group();
  root.add(spin); spin.position.y = H * 0.45; spin.add(body); body.position.y = -H * 0.45;
  const norm = new THREE.Group(); norm.scale.setScalar(k); norm.position.set(-(D.box.min.x + D.box.max.x) / 2 * k, -D.box.min.y * k, -(D.box.min.z + D.box.max.z) / 2 * k); body.add(norm);
  const sc = cloneSkinned(D.gltf.scene); norm.add(sc);
  const mat = toon(o.tint ?? 0xffffff, { rim: o.rim ?? 0.55, rimColor: o.rimColor ?? 0xffe2b8, side: THREE.DoubleSide, ao: 0.75, aoH: 0.5 });
  const B = {}; let mesh = null;
  sc.traverse(n => {
    if (n.isBone) B[n.name] = n;
    if (n.isSkinnedMesh) {
      if (!mat.map && n.material.map) { mat.map = n.material.map; mat.map.colorSpace = THREE.SRGBColorSpace; mat.needsUpdate = true; }
      n.material = mat; n.castShadow = true; n.frustumCulled = false; n.userData.noBake = true; n.userData.noOutline = true; mesh = n;
    }
  });
  // обводка: копия со своим материалом, той же костью; ширина — в единицах геометрии (модель сильно масштабирована)
  if (mesh) {
    const eff = H / (D.geoH || 1);
    const ol = new THREE.SkinnedMesh(mesh.geometry, outline({ width: (o.outline ?? OUTLINE.mob) / eff, color: OUTLINE.heroColor }));
    ol.userData.isOutline = true; ol.userData.noBake = true; ol.frustumCulled = false; mesh.parent.add(ol); ol.bind(mesh.skeleton, mesh.bindMatrix);
  }
  const mixer = new THREE.AnimationMixer(sc), walk = mixer.clipAction(D.walk), run = D.run ? mixer.clipAction(D.run) : null;
  walk.play(); if (run) { run.play(); run.weight = 0; }
  const durW = D.walk.duration || 1, durR = run ? D.run.duration : durW;
  const legs = Object.keys(B).filter(n => /leg/i.test(n)).map(n => B[n]), tail = Object.keys(B).filter(n => /tail/i.test(n)).map(n => B[n]);
  const head = B.head || B.Head, chest = B.chest || B.Chest || B.spine, hips = B.Hips || B.hips;
  const rest = new Map(); for (const b of Object.values(B)) rest.set(b, b.quaternion.clone());
  const touched = [...new Set([...legs, ...tail, head, chest].filter(Boolean))], clean = new Map(touched.map(b => [b, b.quaternion.clone()]));
  const speed0 = o.speed0 ?? H * 1.1, runAt = o.run ?? H * 2.2;
  let ph = Math.random(), lastSp = 0;

  // поза: ph — фаза шага; amp — сила шага (0 — стоит, 1 — ходьба, >1 — бег шире); extra — движения корпуса и головы
  function pose(a, sp, lunge = 0, rear = 0, roar = 0, hurt = 0) {
    const runK = clamp((sp - runAt * 0.75) / (runAt * 0.5));
    if (sp > 0.2) ph = ((ph + a.dt * sp / (speed0 * (1 + runK * 0.6)) / durW * (run ? lerp(1, durW / durR, runK) : 1)) % 1 + 1) % 1;
    const mv = clamp(sp / (speed0 * 0.5));
    // микшер three.js пишет кость, только если значение клипа изменилось: на месте (атака, рёв, удар) он молчит, и наши добавки
    // копились бы каждый кадр (голова уходила под живот). Поэтому сначала возвращаем кости к чистому кадру клипа
    for (const [b, q] of clean) b.quaternion.copy(q);
    walk.time = ph * durW; walk.weight = run ? 1 - runK : 1; if (run) { run.time = ph * durR; run.weight = runK; }
    mixer.update(0);
    for (const b of touched) clean.get(b).copy(b.quaternion);
    // стоит — ноги из первого кадра ходьбы, смешанные с позой покоя; бег без клипа — шаг шире (экстраполяция от покоя)
    const amp = mv * (run ? 1 : 1 + runK * 0.45);
    if (amp !== 1) for (const l of legs) l.quaternion.copy(_q.copy(rest.get(l)).slerp(l.quaternion, amp));
    // корпус: дыхание, подскок на бегу, атака (рывок вперёд), рёв (встаёт на дыбы), удар (отдача)
    const br = Math.sin(a.t * 1.7), bounce = Math.abs(Math.sin(ph * Math.PI * 2)) * 0.07 * H * runK * (run ? 0 : 1);
    body.position.set(0, -H * 0.45 + br * 0.006 + bounce + rear * 0.18 * H - lunge * 0.06 * H, lunge * 0.42 * H - hurt * 0.12 * H);
    body.rotation.set(-rear * 0.42 + lunge * 0.16 - hurt * 0.18 + runK * 0.05 * Math.sin(ph * Math.PI * 4), 0, 0);
    root.updateMatrixWorld(true);
    turn(head, root, X, -roar * 0.55 + lunge * 0.25 - rear * 0.15 + Math.sin(a.t * 1.1) * 0.04 * (1 - mv));
    turn(head, root, Y, Math.sin(a.t * 0.7) * 0.12 * (1 - mv));
    turn(chest, root, X, br * 0.015 - roar * 0.1);
    for (const [i, t] of tail.entries()) turn(t, root, Y, Math.sin(a.t * 2.2 + i * 0.6) * (0.1 + 0.12 * mv) * (1 - rear));
    spin.rotation.set(0, 0, 0); spin.position.y = H * 0.45;
    lastSp = sp;
  }
  const anims = {
    idle: a => pose(a, 0),
    walk: a => pose(a, a.speed),
    // атака хищника: присесть и отпрянуть назад (замах), рывок вперёд с опущенной головой (укус), возврат
    attack: a => { const q = a.k ?? 0, w = smooth(q / 0.4) * (1 - smooth((q - 0.42) / 0.08)), l = smooth((q - 0.42) / 0.12) * (1 - smooth((q - 0.6) / 0.4)); pose(a, 0, l - w * 0.35, 0, -l * 0.12 + w * 0.15); },
    hit: a => pose(a, 0, 0, 0, 0, 1 - (a.k ?? 1)),
    // рёв/вой: голова вверх, корпус чуть назад, лапы на земле (на дыбы — передние лапы торчат вперёд, волку не идёт)
    cast: a => { const q = a.k ?? 0, h = smooth(q / 0.35) * (1 - smooth((q - 0.8) / 0.2)); pose(a, 0, -0.12 * h, 0, h * 1.6); },
    death: a => { const e = smooth(Math.min(1, (a.k ?? 1) / 0.7)); pose(a, 0, 0, 0, 0, 0.3); spin.rotation.z = Math.PI / 2 * 0.95 * e; spin.position.y = lerp(H * 0.45, H * 0.2, e); turn(head, root, X, 0.4 * e); },
  };
  return {
    root, height: H, radius: o.radius ?? 0.34, shadow: o.shadow ?? H * 1.4, materials: [mat],
    sockets: {}, bones: { spin, body, ...B },
    clips: { idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.8, hit: 0.5 }, hit: { dur: 0.3 }, death: { dur: 1.0 }, cast: { dur: 1.0, fire: 0.4 } },
    anims, glb: name,
  };
}
