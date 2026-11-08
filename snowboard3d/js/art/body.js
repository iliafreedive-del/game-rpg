// Райдер из Blender: одна сетка с костями (models/rider.glb, собирается tools/blender/build_rider.py).
// Суставы по-прежнему считает Rider.update() (его IK) — здесь каждая кость ставится по суставам:
// поворот кости = (текущая рамка сегмента) · (рамка в позе покоя)⁻¹ · поворот покоя из glTF.
// Доска и крепления — тоже из Blender (models/gear.glb, tools/blender/build_gear.py).
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from '../../vendor/addons/utils/SkeletonUtils.js';
import { frameYZ, envMap, shade, V3 } from './kit.js';
import * as T from './textures.js';

const MODELS = new URL('../../models/', import.meta.url);
const loader = new GLTFLoader();
const [RIDER, GEAR, RIG] = await Promise.all([
  loader.loadAsync(new URL('rider.glb', MODELS).href),
  loader.loadAsync(new URL('gear.glb', MODELS).href),
  fetch(new URL('rider_rig.json', MODELS)).then((r) => r.json()),
]);
document.documentElement.classList.add('models-ready');

const CHEST_AT = 0.27;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3();
const vec = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// Рамки сегментов по суставам — одна функция и для позы покоя, и для игры
function frames(J, out = {}) {
  const put = (name, pos, q) => { const f = out[name] || (out[name] = { pos: new THREE.Vector3(), q: new THREE.Quaternion() }); f.pos.copy(pos); f.q.copy(q); return f; };
  const basis = (X, Y, Z) => _q.setFromRotationMatrix(_m.makeBasis(X, Y, Z));
  const limb = (a, m, e, pole, n0, n1, n2) => {
    const Y1 = m.clone().sub(a).normalize(), Y2 = e.clone().sub(m).normalize();
    const f1 = frameYZ(Y1, pole), f2 = frameYZ(Y2, pole);
    const q1 = put(n0, a, basis(f1.X, Y1, f1.Z)).q;
    const q2 = put(n2, m, basis(f2.X, Y2, f2.Z)).q;
    put(n1, m, q1.clone().slerp(q2, 0.5));
  };
  limb(J.hipF, J.kneeF, J.ankF, J.legPoleF, 'thigh_F', 'knee_F', 'shin_F');
  limb(J.hipR, J.kneeR, J.ankR, J.legPoleR, 'thigh_R', 'knee_R', 'shin_R');
  limb(J.shF, J.elF, J.wrF, J.armPoleF, 'uarm_F', 'elbow_F', 'farm_F');
  limb(J.shR, J.elR, J.wrR, J.armPoleR, 'uarm_R', 'elbow_R', 'farm_R');
  const Xp = J.side0, Yp = J.pelvisUp.clone().addScaledVector(Xp, -J.pelvisUp.dot(Xp)).normalize();
  const pel = put('pelvis', J.pelvis, basis(Xp, Yp, new THREE.Vector3().crossVectors(Xp, Yp)));
  const cpos = J.pelvis.clone().addScaledVector(J.spine, CHEST_AT);
  const ch = put('chest', cpos, basis(J.shAxis, J.spine, new THREE.Vector3().crossVectors(J.shAxis, J.spine)));
  put('spine', J.pelvis.clone().lerp(cpos, 0.52), pel.q.clone().slerp(ch.q, 0.5));
  const hd = put('head', J.headC, J.headQ);
  put('neck', J.headC.clone().addScaledVector(J.spine, -RIG.dims.NECK), ch.q.clone().slerp(hd.q, 0.5));
  put('foot_F', J.footF.position, J.footF.quaternion);
  put('foot_R', J.footR.position, J.footR.quaternion);
  return out;
}

function restJoints() {
  const R = RIG.rest, J = {};
  for (const k in R) J[k] = vec(R[k]);
  Object.assign(J, {
    legPoleF: V3(0, 0.2, 1), legPoleR: V3(0, 0.2, 1),
    armPoleF: V3(0.1, -0.6, -0.6), armPoleR: V3(-0.1, -0.6, -0.6),
    side0: V3(1, 0, 0), pelvisUp: V3(0, 1, 0), spine: V3(0, 1, 0), shAxis: V3(1, 0, 0),
    headQ: new THREE.Quaternion(),
    footF: { position: J.footF, quaternion: new THREE.Quaternion() }, footR: { position: J.footR, quaternion: new THREE.Quaternion() },
  });
  return J;
}
const REST_FRAMES = frames(restJoints());

// ---------------------------------------------------------------- материалы по именам из Blender
const MATS = new Map();
function materials(pal, ghost, ghostColor) {
  const key = ghost ? 'ghost' + ghostColor : JSON.stringify(pal);
  if (MATS.has(key)) return MATS.get(key);
  let get;
  if (ghost) {
    const g = new THREE.MeshBasicMaterial({ color: ghostColor, transparent: true, opacity: 0.28, depthWrite: false });
    get = () => g;
  } else {
    const env = envMap();
    const S = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, vertexColors: true, ...o });
    const c2 = pal.jacket2 || shade(pal.jacket, -0.55);
    const M = {
      jacket: S({ color: pal.jacket, roughness: 0.6, side: THREE.DoubleSide }),
      jacket2: S({ color: c2, roughness: 0.66, side: THREE.DoubleSide }),
      piping: S({ color: '#e8edf3', roughness: 0.5 }),
      trim: S({ color: '#1c1f24', roughness: 0.45 }),
      pants: S({ color: pal.pants, roughness: 0.85, side: THREE.DoubleSide }),
      boots: S({ color: pal.boots, roughness: 0.6 }),
      sole: S({ color: '#17191c', roughness: 0.9 }),
      midsole: S({ color: '#cfd4da', roughness: 0.75 }),
      accent: S({ color: pal.accent, roughness: 0.45 }),
      gloves: S({ color: pal.gloves, roughness: 0.55 }),
      gcuff: S({ color: shade(pal.gloves, 0.14), roughness: 0.7 }),
      helmet: S({ color: pal.helmet, roughness: 0.3, envMap: env, envMapIntensity: 0.5 }),
      frame: S({ color: pal.frame, roughness: 0.35, envMap: env, envMapIntensity: 0.3 }),
      lens: S({ color: pal.goggles, metalness: 0.85, roughness: 0.08, envMap: env, envMapIntensity: 1.6, emissive: new THREE.Color(pal.goggles).multiplyScalar(0.14), vertexColors: false }),
      strap: S({ color: '#2a2f38', roughness: 0.7 }),
      skin: S({ color: pal.skin, roughness: 0.55 }),
      gaiter: S({ color: pal.gaiter, roughness: 0.92 }),
      // доска и крепления
      topsheet: S({ map: T.topsheetTex(pal.board), roughness: 0.28, envMap: env, envMapIntensity: 0.45, vertexColors: false }),
      base: S({ map: T.baseTex(pal.board), roughness: 0.5, vertexColors: false }),
      sidewall: S({ color: '#2a2f36', roughness: 0.4, vertexColors: false }),
      steel: S({ color: '#aeb6bf', roughness: 0.3, metalness: 0.95, envMap: env, vertexColors: false }),
      binding: S({ color: '#d5dae0', roughness: 0.45, vertexColors: false }),
      highback: S({ color: '#eef1f4', roughness: 0.4, vertexColors: false }),
      bstrap: S({ color: '#2b3038', roughness: 0.65, vertexColors: false }),
      bpad: S({ color: pal.accent, roughness: 0.6, vertexColors: false }),
      metal: S({ color: '#c7ced6', roughness: 0.28, metalness: 0.9, envMap: env, vertexColors: false }),
      disc: S({ color: '#30353d', roughness: 0.5, vertexColors: false }),
    };
    get = (name, src) => M[name] || src;
  }
  MATS.set(key, get);
  return get;
}

function dress(root, get, ghost) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map((m) => get(m.name, m)) : get(o.material.name, o.material);
    o.castShadow = !ghost; o.receiveShadow = !ghost;
    o.frustumCulled = false;
  });
  return root;
}

// ---------------------------------------------------------------- модель
export class RiderModel {
  constructor({ root, stance, ghost = false, pal, ghostColor = '#4ade80', dims }) {
    this.d = dims;
    const get = materials(pal, ghost, ghostColor);

    // доска (из Blender) — в системе доски
    const gear = GEAR.scene;
    this.board = dress(gear.getObjectByName('Board').clone(), get, ghost);
    this.board.position.set(0, 0, 0);
    root.add(this.board);

    // крепления: база и стрепы неподвижны в группе стопы, хайбэк гнётся за голенью
    this.feet = [0, 1].map((i) => {
      const g = new THREE.Group(); stance.add(g);
      const b = dress(gear.getObjectByName('Binding').clone(), get, ghost);
      b.position.set(0, 0, 0);
      if (i) b.scale.x = -1; // задняя нога: трещотки снова с внутренней стороны
      g.add(b);
      g.userData.hb = b.getObjectByName('Highback');
      g.userData.disc = b.getObjectByName('Disc');
      return g;
    });

    // тело: копия сетки с собственным скелетом
    this.body = dress(cloneSkinned(RIDER.scene), get, ghost);
    stance.add(this.body);
    this.body.updateMatrixWorld(true);
    this.bones = {};
    this.body.traverse((o) => { if (o.isBone && REST_FRAMES[o.name]) this.bones[o.name] = o; });
    // поза покоя каждой кости в системе стойки
    const inv = new THREE.Matrix4().copy(stance.matrixWorld).invert();
    this.rest = {};
    for (const [n, b] of Object.entries(this.bones)) {
      const m = inv.clone().multiply(b.matrixWorld), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      m.decompose(p, q, s);
      const P = b.parent;
      const toParent = new THREE.Matrix4().copy(inv).multiply(P.matrixWorld).invert();
      this.rest[n] = { p, q, toParent, rq0: REST_FRAMES[n].q.clone().invert(), rp0: REST_FRAMES[n].pos.clone() };
    }
    this.cur = {};
    this.head = new THREE.Group(); stance.add(this.head); // для камеры и подписей: следует за головой
  }

  pose(J) {
    J.footF = this.feet[0]; J.footR = this.feet[1];
    const F = frames(J, this.cur);
    for (const [n, b] of Object.entries(this.bones)) {
      const r = this.rest[n], f = F[n];
      _q.copy(f.q).multiply(r.rq0);
      const wq = _q.clone().multiply(r.q);
      const wp = _v.copy(r.p).sub(r.rp0).applyQuaternion(_q).add(f.pos);
      // в локальные координаты родителя (арматура из glTF)
      _m.compose(wp, wq, V3(1, 1, 1)).premultiply(r.toParent);
      _m.decompose(b.position, b.quaternion, b.scale);
    }
    this.head.position.copy(J.headC); this.head.quaternion.copy(J.headQ);
    // хайбэк и диск: хайбэк наклоняется вперёд вместе с голенью (forward lean)
    [[J.kneeF, J.ankF, J.angF, 0], [J.kneeR, J.ankR, J.angR, 1]].forEach(([k, a, ang, i]) => {
      const g = this.feet[i], hb = g.userData.hb, disc = g.userData.disc;
      const shin = k.clone().sub(a).normalize().applyQuaternion(g.quaternion.clone().invert());
      if (hb) hb.rotation.x = Math.min(0.55, Math.max(0.05, Math.atan2(shin.z, shin.y))) - 0.21;
      if (disc) disc.rotation.y = -ang;
    });
  }
}
