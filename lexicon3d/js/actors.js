// Characters exactly as Umbrahold builds them: procedural rig (render3d/models) + Meshy skin on top (glbskin.js),
// Actor with clip cross-fades, calm "heroic" walk/run from the model's own clips, talk gestures for villagers.
import * as THREE from './vendor/three.module.min.js';
import { makeKit } from './render3d/kit.js';
import { Actor } from './render3d/actor.js';
import { preloadSkin } from './render3d/glbskin.js';
import { U } from './render3d/toon.js';
import { HERO } from './render3d/style.js';
import archer from './render3d/models/hero/archer.js';
import npc_elder from './render3d/models/npc/npc_elder.js';
import npc_merchant from './render3d/models/npc/npc_merchant.js';
import npc_smith from './render3d/models/npc/npc_smith.js';
import npc_trainer from './render3d/models/npc/npc_trainer.js';
import npc_caravan from './render3d/models/npc/npc_caravan.js';
import npc_fortune from './render3d/models/npc/npc_fortune.js';
import elite_guard from './render3d/models/mob/elite_guard.js';
import skel_warrior from './render3d/models/mob/skel_warrior.js';
import { STONE_MOBS } from './render3d/models/mob/_stone.js';

const king = STONE_MOBS.find(d => d.id === 't_mb_hierophant');
// model name used by the story → Umbrahold model definition and the skin file it needs
export const DEFS = {
  archer_raven: [archer, 'archer_raven'],
  npc_elder: [npc_elder, 'npc_elder'], npc_merchant: [npc_merchant, 'npc_merchant'], npc_smith: [npc_smith, 'npc_smith'],
  npc_trainer: [npc_trainer, 'npc_trainer'], npc_caravan: [npc_caravan, 'npc_caravan'], npc_fortune: [npc_fortune, 'npc_fortune'],
  elite_guard_m: [elite_guard, 'elite_guard_m'], skel_warrior_m: [skel_warrior, 'skel_warrior_m'], t_mb_king_m: [king, 't_mb_king_m'],
};
let kit = null;
export function initActors(scene) { kit = makeKit(scene); }
export const preloadActors = () => Promise.all(Object.values(DEFS).map(([, s]) => preloadSkin(s)));
const env = { wind: new THREE.Vector2(0.85, 0.52) };
export function tickShaders(t) { U.uTime.value = t; }

// thin wrapper with the interface the game uses: root, state (idle | walk | talk), face(yaw), update(dt, speed)
export class Char {
  constructor(model, o = {}) {
    const [def] = DEFS[model] || DEFS.npc_elder;
    this.a = new Actor(def, kit, kit.scene);
    this.scale = (o.scale || 1) * HERO.scale;
    this.a.root.scale.setScalar(this.scale);
    this.root = this.a.root; this.shadow = this.a.shadow;
    this.height = (this.a.size || 1.9) * this.scale;
    this.state = 'idle';
    if (o.turnRate) this.a.turnRate = o.turnRate;
    if (o.glow) this.tintGlow(o.glow, o.glowK ?? 0.4);
  }
  tintGlow(color, k) { for (const m of this.a.mats) if (m.emissive) { m.emissive = new THREE.Color(color); m.emissiveIntensity = k; } }
  face(yaw, snap) { this.a.faceAngle(yaw); if (snap) { this.a.yaw = yaw; this.root.rotation.y = yaw; } }
  attach(parent) { parent.add(this.root); parent.add(this.shadow); }
  detach() { this.root.removeFromParent(); this.shadow.removeFromParent(); }
  update(dt, speed = 0) { this.a.update(dt, { clip: this.state, speed }, env); }
}
