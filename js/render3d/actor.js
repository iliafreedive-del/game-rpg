// Actor — обёртка над моделью (см. docs/MODEL_SPEC.md): клипы, кроссфейд, поворот, вспышка, оружие в сокетах, тень.
// Игровая логика (js/game) знает только имена клипов и прогресс; как они выглядят — решает модель.
import * as THREE from '../vendor/three.module.min.js';
import { outline, addOutlines } from './toon.js';
export { addOutlines };
import { blobShadow } from './cape.js';
import { OUTLINE } from './style.js';

// если у модели нет клипа, берём ближайший (так можно отдавать модель с минимумом клипов)
export const CLIP_FALLBACK = { run: 'walk', dodge: 'walk', talk: 'idle', attack2: 'attack', slam: 'attack', roar: 'cast', special: 'cast', stun: 'hit', spawn: 'idle' };
export const REQUIRED_CLIPS = ['idle', 'walk', 'attack', 'hit', 'death', 'cast'];

const olCache = new Map();
// fade: контур предметов окружения растворяется между камерой и героем вместе с самим предметом (персонажам и оружию это не нужно)
export function outlineMat(kind, fade = false) {
  const key = kind + (fade ? '+fade' : '');
  if (!olCache.has(key)) olCache.set(key, outline({ width: OUTLINE[kind] ?? OUTLINE.mob, color: kind === 'hero' || kind === 'mob' ? OUTLINE.heroColor : 0x1c0f08, fade }));
  return olCache.get(key);
}
export const setOutlinesVisible = on => { for (const m of olCache.values()) m.visible = on; };

// «Жёсткий скининг»: все меши модели с одним материалом сливаются в один SkinnedMesh, где каждая вершина привязана
// к своему исходному мешу как к кости (вес 1). Кости остаются теми же Object3D, анимации модели не меняются,
// а персонаж рисуется 1 вызовом (+1 обводка, +1 в тень) вместо ≈ 28. Исходные меши выключаются через layers.
const _inv = new THREE.Matrix4();
export function bakeRigid(modelRoot, holder) {
  modelRoot.updateMatrixWorld(true);
  _inv.copy(modelRoot.matrixWorld).invert();
  const groups = new Map();
  modelRoot.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !o.userData.isOutline && !o.userData.noBake) { if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(o); } });
  const out = [];
  for (const [mat, list] of groups) {
    if (list.length < 2) continue;
    let n = 0; for (const m of list) n += m.geometry.attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 4), SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
    const inv = [], bones = [], v = new THREE.Vector3(), nm = new THREE.Matrix3(), rel = new THREE.Matrix4();
    let o = 0;
    list.forEach((m, bi) => {
      const g = m.geometry, pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color, c = pa.count;
      rel.multiplyMatrices(_inv, m.matrixWorld); nm.getNormalMatrix(rel);
      for (let i = 0; i < c; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(rel); P.set([v.x, v.y, v.z], (o + i) * 3);
        if (na) { v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); N.set([v.x, v.y, v.z], (o + i) * 3); }
        if (ca) C.set([ca.getX(i), ca.getY(i), ca.getZ(i), ca.itemSize > 3 ? ca.getW(i) : 1], (o + i) * 4); else C.fill(1, (o + i) * 4, (o + i) * 4 + 4);
        SI[(o + i) * 4] = bi; SW[(o + i) * 4] = 1;
      }
      o += c; bones.push(m); inv.push(rel.clone().invert());
      m.layers.disableAll(); m.userData.noOutline = true;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(C, 4)); geo.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    const sk = new THREE.SkinnedMesh(geo, mat);
    // кости — исходные меши; SkinnedMesh стоит в корне актёра (attached: bindMatrixInverse = обратная его matrixWorld),
    // а обратные матрицы костей переводят из пространства корня модели, поэтому корень актёра и модели должны совпадать
    sk.frustumCulled = false; sk.castShadow = true;
    holder.add(sk);
    sk.bind(new THREE.Skeleton(bones, inv), new THREE.Matrix4());
    out.push(sk);
  }
  return out;
}

const clamp01 = x => Math.min(1, Math.max(0, x));
// перенос момента удара: игра бьёт на progress=impact, модель — на clips[clip].hit; всё остальное растягивается линейно
function warp(k, impact, hit) {
  if (impact == null || hit == null || impact <= 0 || impact >= 1) return k;
  return k < impact ? k / impact * hit : hit + (k - impact) / (1 - impact) * (1 - hit);
}

export class Actor {
  constructor(def, kit, scene, o = {}) {
    this.def = def; this.kit = kit;
    this.model = def.build(kit);
    this.root = new THREE.Group(); this.root.add(this.model.root); scene.add(this.root);
    this.scene = scene;
    this.mats = this.model.materials || [];
    this.olMat = outlineMat(def.outline || (def.kind === 'hero' ? 'hero' : def.kind === 'prop' ? 'prop' : 'mob'));
    this.skinned = o.bake === false ? [] : bakeRigid(this.model.root, this.root);
    for (const sk of this.skinned) {
      const ol = new THREE.SkinnedMesh(sk.geometry, this.olMat); ol.frustumCulled = false; ol.userData.isOutline = true;
      ol.bind(sk.skeleton, sk.bindMatrix); this.root.add(ol);
    }
    addOutlines(this.model.root, this.olMat);
    this.model.root.traverse(m => { if (m.isMesh && !m.userData.isOutline) m.castShadow = true; });
    this.shadow = blobShadow(this.model.shadow ?? 1.2, 0.5); scene.add(this.shadow);
    this.bones = Object.values(this.model.bones || {});
    this.snap = new Map();
    this.clip = 'idle'; this.time = 0; this.t = Math.random() * 10; this.blend = 1; this.blendDur = 0.12;
    this.yaw = o.yaw ?? 0; this.targetYaw = this.yaw;
    this.flashV = 0; this.weapons = {};
    this.size = this.model.height || 1.8;
  }
  get sockets() { return this.model.sockets || {}; }
  // надеть оружие (модель kind:'weapon') в сокет: 'handR' | 'handL' | 'back' | 'head'
  equip(slot, weaponDef) {
    const sock = this.sockets[slot]; if (!sock) return false;
    this.unequip(slot);
    if (!weaponDef) return true;
    const w = weaponDef.build(this.kit);
    addOutlines(w.root, outlineMat('small'));
    sock.add(w.root); this.weapons[slot] = { def: weaponDef, w };
    if (w.materials) this.mats = this.mats.concat(w.materials);
    return true;
  }
  unequip(slot) {
    const e = this.weapons[slot]; if (!e) return;
    e.w.root.removeFromParent(); if (e.w.materials) this.mats = this.mats.filter(m => !e.w.materials.includes(m)); delete this.weapons[slot];
  }
  resolve(name) { const an = this.model.anims; let n = name, g = 4; while (!an[n] && CLIP_FALLBACK[n] && g--) n = CLIP_FALLBACK[n]; return an[n] ? n : 'idle'; }
  faceAngle(a) { this.targetYaw = a; }
  place(x, y, z = 0) { this.root.position.set(x, z, y); this.shadow.position.set(x, 0.03, y); }
  flash(v, color) {
    this.flashV = v;
    for (const m of this.mats) { if (!m.userData.flash) continue; m.userData.flash.value = v; if (color) m.userData.flashColor.value.set(color); }
  }
  // drive = { clip, k?, speed?, impact?, combo?, loop? }; k — прогресс разового клипа 0..1 от игровой логики
  update(dt, drive, env) {
    this.t += dt;
    const name = this.resolve(drive.clip);
    if (name !== this.clip) {
      this.snap.clear(); for (const b of this.bones) this.snap.set(b, [b.position.clone(), b.quaternion.clone(), b.scale.clone()]);
      this.clip = name; this.time = 0; this.blend = 0; this.blendDur = name === 'hit' || name === 'attack' || name === 'cast' ? 0.06 : 0.14;
    } else this.time += dt;
    const spec = (this.model.clips || {})[name] || {};
    const k = drive.k == null ? undefined : clamp01(warp(drive.k, drive.impact, spec.hit ?? spec.fire));
    this.model.anims[name]({ t: this.t, dt, time: this.time, k, speed: drive.speed || 0, move: clamp01((drive.speed || 0) / 3.7), combo: drive.combo || 0, env });
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / this.blendDur); const w = this.blend * this.blend * (3 - 2 * this.blend);
      for (const [b, [p, q, s]] of this.snap) { b.position.lerpVectors(p, b.position, w); b.quaternion.slerpQuaternions(q, b.quaternion, w); b.scale.lerpVectors(s, b.scale, w); }
    }
    // поворот: плавно к целевому углу по кратчайшей дуге
    let d = this.targetYaw - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * (1 - Math.exp(-14 * dt)); this.root.rotation.y = this.yaw;
    this.root.updateMatrixWorld(true);
    if (this.model.update) this.model.update(dt, this.t, env, this);
    this.shadow.position.x = this.root.position.x; this.shadow.position.z = this.root.position.z;
  }
  setVisible(v) { this.root.visible = this.shadow.visible = v; }
  dispose() {
    this.root.removeFromParent(); this.shadow.removeFromParent();
    if (this.model.dispose) this.model.dispose();
  }
}
