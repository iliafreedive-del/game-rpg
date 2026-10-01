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
    addOutlines(this.model.root, this.olMat);
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
