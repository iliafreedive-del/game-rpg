// Horned knight in Torchlight-ish proportions: head : height = 1 : 4 (head 0.5 m of 2.0 m), broad shoulders, huge pauldrons and fists,
// thin waist, long legs. Palette: bone-steel armour, brass trim, abyss-violet cape and glowing visor.
// Same procedural rig as the cute knight (plain Object3D hierarchy) and the same Verlet cape, just bigger.
import * as THREE from '../../vendor/three.module.min.js';
import { U, toon, outline, addOutlines } from '../toon.js';
import { part, merge } from '../geo.js';
import { Cape, blobShadow } from '../hero.js';
import { PAL } from './world.js';

const STEEL = 0x56607e, STEEL_L = 0xaab6d6, STEEL_D = 0x2a3050, DARK = 0x1c2036, BONE = PAL.bone, BONE_D = PAL.boneD, BR = PAL.brass, BR_D = PAL.brassD;
const CAPE = 0x6a3fd0, CAPE_HEM = 0x24134e;

export class DarkHero {
  constructor(scene) {
    this.root = new THREE.Group(); scene.add(this.root);
    this.mat = toon(0xffffff, { vc: true, rim: 0.75, rimColor: 0xb48cff });
    this.olMat = outline({ width: 0.028, color: 0x07050f });
    const M = g => new THREE.Mesh(g, this.mat);

    this.hips = new THREE.Group(); this.hips.position.y = 0.95; this.root.add(this.hips);
    this.torso = M(merge([
      part(new THREE.CylinderGeometry(0.17, 0.2, 0.24, 10), DARK, [0, 0.1, 0]),                                                   // waist
      part(new THREE.SphereGeometry(0.3, 14, 10), STEEL, [0, 0.42, 0], 0, [1.1, 1, 0.78], { top: STEEL_L, y0: 0.15, y1: 0.72 }),       // chest
      part(new THREE.CylinderGeometry(0.235, 0.215, 0.1, 12), BR_D, [0, 0.05, 0], 0, 1, { top: BR }),                              // belt
      part(new THREE.BoxGeometry(0.1, 0.1, 0.04), BR, [0, 0.05, 0.22], [0, 0, Math.PI / 4]),                                       // buckle
      part(new THREE.BoxGeometry(0.34, 0.62, 0.05), 0x35205f, [0, -0.2, 0.2], [0.06, 0, 0], 1, { top: 0x7a4cd8 }),                 // tabard
      part(new THREE.BoxGeometry(0.1, 0.1, 0.02), BR, [0, 0.32, 0.245], [0, 0, Math.PI / 4]),                                      // emblem
      part(new THREE.BoxGeometry(0.03, 0.18, 0.02), PAL.abyss, [0, 0.32, 0.257], 0, 1, { emit: true }),
      part(new THREE.CylinderGeometry(0.15, 0.2, 0.12, 10), STEEL_D, [0, 0.68, 0], 0, 1, { top: STEEL }),                          // gorget
      ...[-1, 1].flatMap(sx => [
        part(new THREE.SphereGeometry(0.235, 14, 10), STEEL, [sx * 0.46, 0.58, 0], 0, [1.05, 0.78, 1.1], { top: STEEL_L }),          // pauldrons
        part(new THREE.TorusGeometry(0.205, 0.028, 5, 14), BR, [sx * 0.46, 0.5, 0], [Math.PI / 2, 0, 0], [1.02, 1.1, 1]),
        part(new THREE.ConeGeometry(0.075, 0.3, 6), BONE, [sx * 0.55, 0.8, 0], [0, 0, -sx * 0.5], 1, { top: 0xffffff }),             // bone spikes
      ]),
    ]));
    this.hips.add(this.torso);

    // head: 0.5 m tall helm, glowing visor, big horns
    this.head = new THREE.Group(); this.head.position.y = 0.7; this.torso.add(this.head);
    this.head.add(M(merge([
      part(new THREE.SphereGeometry(0.255, 18, 14), STEEL, [0, 0.22, 0], 0, [1, 1.0, 1.05], { top: STEEL_L }),
      part(new THREE.CylinderGeometry(0.262, 0.25, 0.06, 18), BR, [0, 0.07, 0]),
      part(new THREE.BoxGeometry(0.04, 0.2, 0.46), BR, [0, 0.45, -0.02], [0.1, 0, 0], 1, { top: 0xf0c868 }),                       // crest
      part(new THREE.BoxGeometry(0.34, 0.09, 0.1), 0x07050f, [0, 0.22, 0.225]),                                                    // visor slit
      part(new THREE.BoxGeometry(0.085, 0.045, 0.02), 0xe9dcff, [0.085, 0.22, 0.275], 0, 1, { emit: true }),                      // glowing eyes
      part(new THREE.BoxGeometry(0.085, 0.045, 0.02), 0xe9dcff, [-0.085, 0.22, 0.275], 0, 1, { emit: true }),
      part(new THREE.BoxGeometry(0.035, 0.15, 0.04), DARK, [0, 0.12, 0.25]),
      ...[-1, 1].flatMap(sx => [
        part(new THREE.ConeGeometry(0.075, 0.34, 8), BONE_D, [sx * 0.3, 0.32, 0], [0, 0, -sx * 1.15], 1, { top: BONE }),
        part(new THREE.ConeGeometry(0.06, 0.34, 8), BONE_D, [sx * 0.48, 0.5, 0], [0, 0, sx * 0.1], 1, { top: 0xffffff }),
      ]),
    ])));

    const arm = side => {
      const g = new THREE.Group(); g.position.set(side * 0.46, 0.52, 0); this.torso.add(g);
      g.add(M(merge([
        part(new THREE.CapsuleGeometry(0.075, 0.38, 3, 8), DARK, [0, -0.3, 0]),
        part(new THREE.CylinderGeometry(0.1, 0.085, 0.2, 8), STEEL, [0, -0.46, 0], 0, 1, { top: STEEL_L }),                         // vambrace
        part(new THREE.CylinderGeometry(0.105, 0.105, 0.04, 8), BR, [0, -0.37, 0]),
        part(new THREE.SphereGeometry(0.125, 10, 8), STEEL, [0, -0.62, 0], 0, [1, 0.95, 1.1], { top: STEEL_L }),                    // big fist
      ])));
      return g;
    };
    this.armR = arm(-1); this.armL = arm(1);

    this.sword = new THREE.Group(); this.sword.position.set(0, -0.62, 0.03); this.armR.add(this.sword);
    this.sword.add(M(merge([
      part(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), 0x2a1c30, [0, 0, 0]),
      part(new THREE.SphereGeometry(0.055, 8, 6), BR, [0, -0.13, 0], 0, 1, { top: 0xf0c868 }),
      part(new THREE.BoxGeometry(0.36, 0.06, 0.09), BR_D, [0, 0.12, 0], 0, 1, { top: BR }),
      part(new THREE.BoxGeometry(0.13, 0.9, 0.035), 0xaab4cc, [0, 0.6, 0], 0, 1, { top: 0xf4f8ff }),
      part(new THREE.ConeGeometry(0.09, 0.2, 4), 0xf4f8ff, [0, 1.14, 0], [0, Math.PI / 4, 0], [1, 1, 0.3]),
      part(new THREE.BoxGeometry(0.03, 0.78, 0.045), PAL.abyss, [0, 0.58, 0], 0, 1, { emit: true }),                                // abyss fuller
    ])));
    this.sword.rotation.x = 1.25;

    this.shield = new THREE.Group(); this.shield.position.set(0.12, -0.46, 0.1); this.armL.add(this.shield);
    this.shield.add(M(merge([
      part(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 18), 0x2c2650, [0, 0, 0], [0, 0, Math.PI / 2], 1, { top: 0x5a46a0 }),
      part(new THREE.TorusGeometry(0.34, 0.04, 5, 20), BR, [0, 0, 0], [0, Math.PI / 2, 0]),
      part(new THREE.SphereGeometry(0.09, 10, 8), BR, [0.05, 0, 0], 0, [0.6, 1, 1], { top: 0xf0c868 }),
      part(new THREE.SphereGeometry(0.045, 8, 6), PAL.abyss, [0.1, 0, 0], 0, [0.5, 1, 1], { emit: true }),
    ])));
    this.shield.rotation.y = -0.5;

    const leg = side => {
      const g = new THREE.Group(); g.position.set(side * 0.15, 0.95, 0); this.root.add(g);
      g.add(M(merge([
        part(new THREE.CapsuleGeometry(0.09, 0.3, 3, 8), DARK, [0, -0.25, 0]),
        part(new THREE.SphereGeometry(0.1, 8, 6), BR_D, [0, -0.46, 0.06], 0, 1, { top: BR }),                                       // knee cop
        part(new THREE.CapsuleGeometry(0.075, 0.3, 3, 8), STEEL, [0, -0.66, 0], 0, 1, { top: STEEL_L }),
        part(new THREE.BoxGeometry(0.18, 0.15, 0.3), STEEL_D, [0, -0.88, 0.05], 0, 1, { top: STEEL }),                              // big boot
      ])));
      return g;
    };
    this.legL = leg(1); this.legR = leg(-1);

    addOutlines(this.root, this.olMat);
    this.shadow = blobShadow(1.5, 0.6); scene.add(this.shadow);
    this.cape = new Cape(scene, CAPE, { len: 1.25, top: 0.78, bottom: 1.15, R: 0.34, back: -0.27, bodyTop: 1.75, backMin: 0.75, hem: CAPE_HEM });
    this.capeAnchor = new THREE.Object3D(); this.capeAnchor.position.set(0, 0.64, -0.26); this.torso.add(this.capeAnchor);

    this.pos = this.root.position; this.vel = new THREE.Vector2(); this.yaw = 0; this.targetYaw = 0;
    this.phase = 0; this.run = 0; this.atk = -1; this.atkHit = false; this.hurt = 0; this.combo = 0;
    this.onHit = null;
  }

  attack(aimYaw) {
    if (this.atk >= 0 && this.atk < 0.75) return false;
    if (aimYaw !== undefined) this.targetYaw = aimYaw;
    this.atk = 0; this.atkHit = false; this.combo ^= 1;
    return true;
  }

  takeHit(dir) {
    this.hurt = 1; this.mat.userData.flashColor.value.set(1, 0.25, 0.2);
    this.vel.x += dir.x * 4; this.vel.y += dir.y * 4;
  }

  update(dt, move, t) {
    const SPEED = 5.0, ATK_T = 0.42;
    const attacking = this.atk >= 0;
    const want = new THREE.Vector2(move.x, move.y).multiplyScalar(attacking ? SPEED * 0.35 : SPEED);
    this.vel.lerp(want, 1 - Math.exp(-14 * dt));
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.y * dt;
    const sp = this.vel.length();
    if (move.lengthSq() > 0.01 && !attacking) this.targetYaw = Math.atan2(move.x, move.y);
    let dy = this.targetYaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * (1 - Math.exp(-16 * dt));
    this.root.rotation.y = this.yaw;

    this.run += ((sp > 0.4 ? 1 : 0) - this.run) * (1 - Math.exp(-10 * dt));
    this.phase += dt * (3.6 + sp * 1.5);
    const s = Math.sin(this.phase), r = this.run, breath = Math.sin(t * 2.0) * (1 - r);
    this.legL.rotation.x = s * 0.85 * r; this.legR.rotation.x = -s * 0.85 * r;
    this.hips.position.y = 0.95 + Math.abs(Math.cos(this.phase)) * 0.07 * r + breath * 0.01;
    this.torso.rotation.x = 0.14 * r + breath * 0.02;
    this.torso.rotation.y = s * 0.12 * r;
    this.head.rotation.x = -0.08 * r + Math.sin(t * 1.3) * 0.03 * (1 - r);
    this.head.rotation.z = Math.sin(t * 0.9) * 0.04 * (1 - r);
    this.armL.rotation.set(-s * 0.55 * r - 0.2, 0, 0.1);
    this.armR.rotation.set(s * 0.65 * r - 0.1, 0, -0.14 + breath * 0.03);
    this.sword.rotation.x = 1.25;

    if (this.atk >= 0) {
      this.atk += dt / ATK_T;
      const a = this.atk, dir = this.combo ? -1 : 1;
      const k1 = Math.min(a / 0.3, 1), k2 = Math.min(Math.max((a - 0.3) / 0.25, 0), 1), k3 = Math.min(Math.max((a - 0.55) / 0.45, 0), 1);
      const e2 = 1 - Math.pow(1 - k2, 3);
      const wind = -2.3 * k1 * (1 - e2), swing = 0.9 * e2 * (1 - k3);
      this.armR.rotation.x = wind + swing - 0.1 * k3;
      this.armR.rotation.z = -0.15 - dir * (0.9 * k1 * (1 - e2) - 0.6 * e2 * (1 - k3));
      this.torso.rotation.y = dir * (0.5 * k1 * (1 - e2) - 0.6 * e2 * (1 - k3));
      this.hips.position.y -= 0.04 * e2 * (1 - k3);
      if (!this.atkHit && a >= 0.38) { this.atkHit = true; this.onHit && this.onHit(this.pos, this.yaw, dir); }
      if (a >= 1) this.atk = -1;
    }

    if (this.hurt > 0) this.hurt = Math.max(0, this.hurt - dt * 5);
    this.mat.userData.flash.value = this.hurt * 0.7;

    this.shadow.position.set(this.pos.x, this.pos.y + 0.03, this.pos.z);
    this.root.updateMatrixWorld(true);
    this.cape.update(dt, this.capeAnchor.matrixWorld, this.root.matrixWorld, U.uWind.value.clone().multiplyScalar(U.uWindStr.value), t);
  }
}
