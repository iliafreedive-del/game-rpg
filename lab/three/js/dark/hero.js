// Horned knight in Torchlight-ish proportions: head : height = 1 : 4 (head 0.5 m of 2.0 m), broad shoulders, huge pauldrons and fists,
// thin waist, long legs. Palette: bone-steel armour, brass trim, abyss-violet cape and glowing visor.
// Same procedural rig as the cute knight (plain Object3D hierarchy) and the same Verlet cape, just bigger.
import * as THREE from '../../vendor/three.module.min.js';
import { U, toon, outline, addOutlines } from '../toon.js';
import { part, merge } from '../geo.js';
import { Cape, blobShadow } from '../hero.js';
import { PAL } from './world.js';
import { clamp, smooth, easeOut, lerp, footTarget, legIK } from './rig.js';

const STEEL = 0x56607e, STEEL_L = 0xaab6d6, STEEL_D = 0x2a3050, DARK = 0x1c2036, BONE = PAL.bone, BONE_D = PAL.boneD, BR = PAL.brass, BR_D = PAL.brassD;
const CAPE = 0x6a3fd0, CAPE_HEM = 0x24134e;

export class DarkHero {
  constructor(scene) {
    this.root = new THREE.Group(); scene.add(this.root);
    this.mat = toon(0xffffff, { vc: true, rim: 0.75, rimColor: 0xb48cff });
    this.olMat = outline({ width: 0.028, color: 0x07050f });
    const M = g => new THREE.Mesh(g, this.mat);

    this.hips = new THREE.Group(); this.hips.position.y = 0.97; this.root.add(this.hips);
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

    // arms: shoulder → upper arm → elbow → forearm + big fist
    const arm = side => {
      const g = new THREE.Group(); g.position.set(side * 0.46, 0.52, 0); this.torso.add(g);
      g.add(M(merge([part(new THREE.CapsuleGeometry(0.08, 0.2, 3, 8), DARK, [0, -0.17, 0]), part(new THREE.SphereGeometry(0.09, 8, 6), STEEL_D, [0, -0.35, 0])])));
      const el = new THREE.Group(); el.position.y = -0.35; g.add(el);
      el.add(M(merge([
        part(new THREE.CapsuleGeometry(0.07, 0.2, 3, 8), DARK, [0, -0.15, 0]),
        part(new THREE.CylinderGeometry(0.1, 0.085, 0.22, 8), STEEL, [0, -0.19, 0], 0, 1, { top: STEEL_L }),                         // vambrace
        part(new THREE.CylinderGeometry(0.105, 0.105, 0.04, 8), BR, [0, -0.09, 0]),
        part(new THREE.SphereGeometry(0.125, 10, 8), STEEL, [0, -0.36, 0], 0, [1, 0.95, 1.1], { top: STEEL_L }),                    // big fist
      ])));
      g.elbow = el;
      return g;
    };
    this.armR = arm(-1); this.armL = arm(1);

    this.sword = new THREE.Group(); this.sword.position.set(0, -0.36, 0.03); this.armR.elbow.add(this.sword);
    this.sword.add(M(merge([
      part(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), 0x2a1c30, [0, 0, 0]),
      part(new THREE.SphereGeometry(0.055, 8, 6), BR, [0, -0.13, 0], 0, 1, { top: 0xf0c868 }),
      part(new THREE.BoxGeometry(0.36, 0.06, 0.09), BR_D, [0, 0.12, 0], 0, 1, { top: BR }),
      part(new THREE.BoxGeometry(0.13, 0.9, 0.035), 0xaab4cc, [0, 0.6, 0], 0, 1, { top: 0xf4f8ff }),
      part(new THREE.ConeGeometry(0.09, 0.2, 4), 0xf4f8ff, [0, 1.14, 0], [0, Math.PI / 4, 0], [1, 1, 0.3]),
      part(new THREE.BoxGeometry(0.03, 0.78, 0.045), PAL.abyss, [0, 0.58, 0], 0, 1, { emit: true }),                                // abyss fuller
    ])));
    this.sword.rotation.x = 1.25;

    this.shield = new THREE.Group(); this.shield.position.set(0.12, -0.3, 0.1); this.armL.elbow.add(this.shield);
    this.shield.add(M(merge([
      part(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 18), 0x2c2650, [0, 0, 0], [0, 0, Math.PI / 2], 1, { top: 0x5a46a0 }),
      part(new THREE.TorusGeometry(0.34, 0.04, 5, 20), BR, [0, 0, 0], [0, Math.PI / 2, 0]),
      part(new THREE.SphereGeometry(0.09, 10, 8), BR, [0.05, 0, 0], 0, [0.6, 1, 1], { top: 0xf0c868 }),
      part(new THREE.SphereGeometry(0.045, 8, 6), PAL.abyss, [0.1, 0, 0], 0, [0.5, 1, 1], { emit: true }),
    ])));
    this.shield.rotation.y = -0.5;

    // legs: hip → thigh → knee → shin → ankle/boot, driven by 2-bone IK so the feet stay planted and the knees really bend
    this.L1 = 0.44; this.L2 = 0.43; this.ANKLE = 0.115;
    const leg = side => {
      const g = new THREE.Group(); g.position.set(side * 0.15, 0.97, 0); this.root.add(g);
      g.add(M(merge([part(new THREE.CapsuleGeometry(0.095, 0.26, 3, 8), DARK, [0, -0.2, 0]), part(new THREE.SphereGeometry(0.11, 8, 6), STEEL_D, [0, -0.02, 0.0])])));
      const k = new THREE.Group(); k.position.y = -this.L1; g.add(k);
      k.add(M(merge([
        part(new THREE.SphereGeometry(0.105, 8, 6), BR_D, [0, 0, 0.06], 0, 1, { top: BR }),                                         // knee cop
        part(new THREE.CapsuleGeometry(0.078, 0.26, 3, 8), STEEL, [0, -0.2, 0], 0, 1, { top: STEEL_L }),
      ])));
      const f = new THREE.Group(); f.position.y = -this.L2; k.add(f);
      f.add(M(merge([part(new THREE.BoxGeometry(0.18, 0.15, 0.32), STEEL_D, [0, -0.045, 0.07], 0, 1, { top: STEEL })])));       // big boot
      g.knee = k; g.foot = f;
      return g;
    };
    this.legL = leg(1); this.legR = leg(-1);

    addOutlines(this.root, this.olMat);
    this.shadow = blobShadow(1.5, 0.6); scene.add(this.shadow);
    this.cape = new Cape(scene, CAPE, { len: 1.25, top: 0.78, bottom: 1.15, R: 0.34, back: -0.27, bodyTop: 1.75, backMin: 0.75, hem: CAPE_HEM });
    this.capeAnchor = new THREE.Object3D(); this.capeAnchor.position.set(0, 0.64, -0.26); this.torso.add(this.capeAnchor);

    this.pos = this.root.position; this.vel = new THREE.Vector2(); this.yaw = 0; this.targetYaw = 0;
    this.phase = 0; this.run = 0; this.aw = 0; this.bank = 0; this.atk = -1; this.atkHit = false; this.hurt = 0; this.combo = 0;
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
    const SPEED = 4.2, ATK_T = 0.5, ST = 0.42;
    const attacking = this.atk >= 0;
    const want = new THREE.Vector2(move.x, move.y).multiplyScalar(attacking ? SPEED * 0.3 : SPEED);
    this.vel.lerp(want, 1 - Math.exp(-14 * dt));
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.y * dt;
    const sp = this.vel.length();
    if (move.lengthSq() > 0.01 && !attacking) this.targetYaw = Math.atan2(move.x, move.y);
    let dy = this.targetYaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const turn = dy * (1 - Math.exp(-14 * dt));
    this.yaw += turn;
    this.root.rotation.y = this.yaw;
    this.bank = lerp(this.bank || 0, clamp(turn / Math.max(dt, 1e-3) * 0.05, -0.25, 0.25), 1 - Math.exp(-10 * dt));   // lean into turns

    // ---- gait: phase advances with ground speed so feet never skate ----
    this.run += ((sp > 0.4 ? 1 : 0) - this.run) * (1 - Math.exp(-10 * dt));
    const r = this.run, spN = clamp(sp / SPEED);
    const stride = clamp(0.3 + 0.15 * sp, 0.3, 0.9);          // long strides, slow cadence: foot travel per stance = stride, so no skating
    if (sp > 0.25) this.phase = (this.phase + dt * sp * ST / stride) % 1;
    const th = this.phase * Math.PI * 2, breath = Math.sin(t * 2.0) * (1 - r);
    this.aw += ((attacking ? 1 : 0) - this.aw) * (1 - Math.exp(-16 * dt));
    const aw = this.aw;

    // ---- attack timeline: anticipation (0–.32) → strike (.32–.55) → follow-through/recover ----
    let k1 = 0, k2 = 0, k3 = 0, dir = this.combo ? -1 : 1;
    if (this.atk >= 0) {
      this.atk += dt / ATK_T;
      const a = this.atk;
      k1 = smooth(a / 0.32); k2 = easeOut((a - 0.32) / 0.23); k3 = smooth((a - 0.58) / 0.42);
      if (!this.atkHit && a >= 0.42) { this.atkHit = true; this.onHit && this.onHit(this.pos, this.yaw, dir); }
      if (a >= 1) this.atk = -1;
    }
    const wind = k1 * (1 - k2), hitK = k2 * (1 - k3), crouchA = 0.1 * (k1 * (1 - k2) + 0.7 * k2 * (1 - k3));

    // ---- pelvis + legs (IK) ----
    const hipY = 0.97 - 0.14 * r + 0.03 * r * Math.abs(Math.cos(th - 1.885)) - crouchA * aw + breath * 0.008;
    const legs = [[this.legR, 0], [this.legL, 0.5]];
    legs.forEach(([lg, off], i) => {
      const ft = footTarget(this.phase + off, stride, 0.08 + 0.16 * spN, ST);
      let dz = ft.z * r + (i ? -0.03 : 0.03) * (1 - r), lift = ft.y * r, toe = ft.pitch * r;
      // attack stance: sword-side foot steps forward, the other braces behind
      const front = (dir > 0) === (i === 0);
      const stanceZ = front ? 0.08 + 0.26 * k1 + 0.06 * k2 : -0.3 + 0.06 * k2, stanceW = aw;
      dz = lerp(dz, stanceZ, stanceW); lift = lerp(lift, 0, stanceW); toe = lerp(toe, 0, stanceW);
      lg.position.x = (i ? 0.15 : -0.15) + Math.sin(th) * 0.02 * r; lg.position.y = hipY;
      legIK(lg, lg.knee, lg.foot, this.L1, this.L2, hipY - this.ANKLE, dz, lift, toe);
    });
    this.hips.position.set(Math.sin(th) * 0.025 * r, hipY, 0);
    this.hips.rotation.y = Math.sin(th) * 0.13 * r + dir * (0.32 * wind - 0.4 * hitK) * aw;           // pelvis twist (opposite the shoulders)
    this.hips.rotation.z = Math.sin(th + 0.5) * 0.035 * r;                                           // pelvis tilt

    // ---- torso, head, arms ----
    this.torso.rotation.x = (0.1 + 0.14 * spN) * r + breath * 0.02 + 0.12 * wind - 0.06 * hitK - 0.28 * this.hurt;
    this.torso.rotation.y = -Math.sin(th) * 0.2 * r + dir * (0.5 * wind - 0.55 * hitK + 0.15 * k3 * 0) * aw;
    this.torso.rotation.z = this.bank * r + Math.sin(t * 0.8) * 0.01 * (1 - r);
    this.head.rotation.x = -0.1 * r - this.torso.rotation.x * 0.4 + Math.sin(t * 1.3) * 0.03 * (1 - r);
    this.head.rotation.y = -this.torso.rotation.y * 0.7 - this.hips.rotation.y * 0.3;
    this.head.rotation.z = Math.sin(t * 0.9) * 0.04 * (1 - r);

    const swing = Math.cos(th) * 0.6 * r;
    // shield arm: guard up in front, pulls back on the strike
    this.armL.rotation.set(lerp(-swing - 0.2, -0.85 + 0.45 * hitK, aw), 0, 0.14);
    this.armL.elbow.rotation.x = lerp(-0.55 - 0.45 * r, -1.25, aw) + breath * 0.02;
    // sword arm: loose swing when running, big overhead wind-up → diagonal cut → follow-through when attacking
    const run = [swing - 0.1, 0, -0.14 + breath * 0.03], runEl = -0.7 - 0.5 * r;
    const sx = lerp(-2.55, -0.25, k2) + 0.35 * k3, sz = -0.15 - dir * lerp(0.95, -0.75, k2) * (1 - k3 * 0.6), sel = lerp(-1.55, -0.2, k2) - 0.5 * k3;
    const atkPose = k1 > 0 || k2 > 0 ? [lerp(run[0], sx, Math.max(k1, k2)), 0, lerp(run[2], sz, Math.max(k1, k2))] : run;
    this.armR.rotation.set(lerp(run[0], atkPose[0], aw), 0, lerp(run[2], atkPose[2], aw));
    this.armR.elbow.rotation.x = lerp(runEl, lerp(-0.7, sel, Math.max(k1, k2)), aw);
    this.sword.rotation.x = lerp(1.25, 1.0 + 0.4 * wind - 0.3 * hitK, aw);

    if (this.hurt > 0) this.hurt = Math.max(0, this.hurt - dt * 5);
    this.mat.userData.flash.value = this.hurt * 0.7;

    this.shadow.position.set(this.pos.x, this.pos.y + 0.03, this.pos.z);
    this.root.updateMatrixWorld(true);
    this.cape.update(dt, this.capeAnchor.matrixWorld, this.root.matrixWorld, U.uWind.value.clone().multiplyScalar(U.uWindStr.value), t);
  }
}
