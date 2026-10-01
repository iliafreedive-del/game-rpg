// Chibi knight (big head, short limbs — the Archero / Brawl Stars proportion that reads well on a phone screen).
// Rig = plain Object3D hierarchy, animated procedurally; no skinning, no animation files.
// Cape = 6×9 Verlet cloth simulated on the CPU (~54 points, <0.05 ms/frame) — reacts to running, turning and wind.
import * as THREE from '../vendor/three.module.min.js';
import { U, toon, outline, addOutlines } from './toon.js';
import { part, merge, blobTexture } from './geo.js';

const STEEL = 0x8f9bb0, STEEL_L = 0xd6deea, DARK = 0x2b2f3d, GOLD = 0xe2b04a, RED = 0xb8323a, LEATHER = 0x5a3b2a, BONE = 0xefe3c4;

export function blobShadow(size = 1, opacity = 0.42) {
  const g = new THREE.PlaneGeometry(size, size); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0x000000, transparent: true, opacity, depthWrite: false }));
  m.renderOrder = 2; m.userData.noOutline = true;
  return m;
}

class Cape {
  constructor(scene, color) {
    this.W = 6; this.H = 9; this.len = 0.88;
    this.top = 0.36; this.bottom = 0.68;      // width at shoulders → flared hem
    const n = this.W * this.H;
    this.p = new Float32Array(n * 3); this.o = new Float32Array(n * 3);
    this.geo = new THREE.PlaneGeometry(1, 1, this.W - 1, this.H - 1);
    // two-tone cape: outer colour fading darker to the hem, inner lining via back-face in the shader
    const col = new Float32Array(n * 4), c = new THREE.Color(color), d = new THREE.Color(color).multiplyScalar(0.55);
    for (let j = 0; j < this.H; j++) for (let i = 0; i < this.W; i++) {
      const k = j * this.W + i, cc = c.clone().lerp(d, j / (this.H - 1));
      col.set([cc.r, cc.g, cc.b, 1], k * 4);
    }
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    this.mat = toon(0xffffff, { vc: true, side: THREE.DoubleSide, rim: 0.3 });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false; this.mesh.userData.noOutline = true;
    scene.add(this.mesh);
    this.ready = false; this.acc = 0;
    this._a = new THREE.Vector3(); this._l = new THREE.Vector3();
  }
  anchor(i, out, m) {   // i-th shoulder point in hero space → world
    const u = i / (this.W - 1) - 0.5;
    return out.set(u * this.top, 0, 0).applyMatrix4(m);
  }
  reset(m) {
    for (let j = 0; j < this.H; j++) for (let i = 0; i < this.W; i++) {
      this.anchor(i, this._a, m); const k = (j * this.W + i) * 3;
      this.p[k] = this.o[k] = this._a.x; this.p[k + 1] = this.o[k + 1] = this._a.y - j * this.len / (this.H - 1); this.p[k + 2] = this.o[k + 2] = this._a.z;
    }
    this.ready = true;
  }
  // m = cape attachment matrix (world); body = world matrix of the hero root (for collision); vel = hero velocity
  update(dt, m, body, wind, t) {
    this.anchor(0, this._a, m);
    if (!this.ready || Math.hypot(this._a.x - this.p[0], this._a.y - this.p[1], this._a.z - this.p[2]) > 1) this.reset(m);
    const STEP = 1 / 60;
    this.acc = Math.min(this.acc + dt, 0.1);
    const inv = new THREE.Matrix4().copy(body).invert(), W = this.W, H = this.H, P = this.p, O = this.o;
    const dy = this.len / (H - 1);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      for (let j = 1; j < H; j++) for (let i = 0; i < W; i++) {
        const k = (j * W + i) * 3;
        const flut = (Math.sin(t * 7.3 + j * 0.9 + i * 0.7) * 0.5 + Math.sin(t * 3.1 + j * 0.4) * 0.5);
        const ax = wind.x * (1.6 + flut * 1.2), az = wind.y * (1.6 + flut * 1.2), ay = -9.8 + flut * 0.6;
        for (let a = 0; a < 3; a++) {
          const v = (P[k + a] - O[k + a]) * 0.985; O[k + a] = P[k + a];
          P[k + a] += v + (a === 0 ? ax : a === 1 ? ay : az) * STEP * STEP;
        }
      }
      for (let it = 0; it < 4; it++) {
        for (let i = 0; i < W; i++) { this.anchor(i, this._a, m); const k = i * 3; P[k] = this._a.x; P[k + 1] = this._a.y; P[k + 2] = this._a.z; }
        for (let j = 0; j < H; j++) {
          const rest = (this.top + (this.bottom - this.top) * (j / (H - 1))) / (W - 1);
          for (let i = 0; i < W; i++) {
            if (i < W - 1) this.link(j * W + i, j * W + i + 1, rest, j === 0);
            if (j < H - 1) this.link(j * W + i, (j + 1) * W + i, dy, j === 0);
          }
        }
        // keep the cloth behind the back and outside the body capsule (hero local space: +z = forward)
        for (let j = 1; j < H; j++) for (let i = 0; i < W; i++) {
          const k = (j * W + i) * 3;
          const l = this._l.set(P[k], P[k + 1], P[k + 2]).applyMatrix4(inv);
          let moved = false;
          const cy = Math.min(Math.max(l.y, 0.25), 0.95), dx = l.x, dz = l.z + 0.02, rr = Math.hypot(dx, dz), R = 0.27;
          if (rr < R && l.y < 1.05) { l.x = dx / (rr || 1) * R; l.z = dz / (rr || 1) * R - 0.02; moved = true; }
          if (l.z > -0.12 && l.y > 0.45) { l.z = -0.12; moved = true; }
          if (l.y < 0.03) { l.y = 0.03; moved = true; }
          if (moved) { l.applyMatrix4(body); P[k] = l.x; P[k + 1] = l.y; P[k + 2] = l.z; }
          void cy;
        }
      }
    }
    const pos = this.geo.attributes.position;
    for (let k = 0; k < W * H; k++) pos.setXYZ(k, P[k * 3], P[k * 3 + 1], P[k * 3 + 2]);
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
  link(a, b, rest, pinA) {
    const P = this.p, ka = a * 3, kb = b * 3;
    const dx = P[kb] - P[ka], dy = P[kb + 1] - P[ka + 1], dz = P[kb + 2] - P[ka + 2];
    const d = Math.hypot(dx, dy, dz) || 1e-6, diff = (d - rest) / d;
    if (pinA) { P[kb] -= dx * diff; P[kb + 1] -= dy * diff; P[kb + 2] -= dz * diff; return; }
    const h = diff * 0.5;
    P[ka] += dx * h; P[ka + 1] += dy * h; P[ka + 2] += dz * h;
    P[kb] -= dx * h; P[kb + 1] -= dy * h; P[kb + 2] -= dz * h;
  }
}

export class Hero {
  constructor(scene) {
    this.root = new THREE.Group(); scene.add(this.root);
    this.mat = toon(0xffffff, { vc: true, rim: 0.55, rimColor: 0xffe7c0 });
    this.olMat = outline({ width: 0.022, color: 0x151020 });
    const M = g => { const m = new THREE.Mesh(g, this.mat); return m; };

    // hips pivot
    this.hips = new THREE.Group(); this.hips.position.y = 0.4; this.root.add(this.hips);
    this.torso = M(merge([
      part(new THREE.CapsuleGeometry(0.2, 0.16, 4, 10), STEEL, [0, 0.22, 0], 0, [1, 1, 0.85], { top: STEEL_L }),
      part(new THREE.BoxGeometry(0.3, 0.34, 0.06), RED, [0, 0.13, 0.155], 0, 1, { top: 0xd8454b }),            // tabard
      part(new THREE.BoxGeometry(0.1, 0.1, 0.02), GOLD, [0, 0.2, 0.19], [0, 0, Math.PI / 4]),                  // emblem
      part(new THREE.CylinderGeometry(0.215, 0.225, 0.07, 12), LEATHER, [0, 0.03, 0]),                          // belt
      part(new THREE.BoxGeometry(0.07, 0.06, 0.03), GOLD, [0, 0.03, 0.21]),
      part(new THREE.SphereGeometry(0.13, 12, 8), STEEL, [0.24, 0.39, 0], 0, [1, 0.72, 1.05], { top: STEEL_L }),  // pauldrons
      part(new THREE.SphereGeometry(0.13, 12, 8), STEEL, [-0.24, 0.39, 0], 0, [1, 0.72, 1.05], { top: STEEL_L }),
      part(new THREE.TorusGeometry(0.11, 0.018, 4, 12), GOLD, [0.24, 0.38, 0], [Math.PI / 2, 0, 0], [1, 1, 1]),
      part(new THREE.TorusGeometry(0.11, 0.018, 4, 12), GOLD, [-0.24, 0.38, 0], [Math.PI / 2, 0, 0], [1, 1, 1]),
    ]));
    this.hips.add(this.torso);

    // head: oversized horned helm with glowing visor
    this.head = new THREE.Group(); this.head.position.y = 0.47; this.torso.add(this.head);
    this.head.add(M(merge([
      part(new THREE.SphereGeometry(0.31, 18, 14), STEEL, [0, 0.25, 0], 0, [1, 0.96, 1], { top: STEEL_L }),
      part(new THREE.CylinderGeometry(0.32, 0.3, 0.06, 18), GOLD, [0, 0.12, 0]),                                    // rim band
      part(new THREE.BoxGeometry(0.05, 0.28, 0.5), GOLD, [0, 0.43, -0.02], [0.15, 0, 0], [1, 1, 0.9]),              // crest
      part(new THREE.BoxGeometry(0.4, 0.075, 0.12), DARK, [0, 0.25, 0.25]),                                         // visor slit
      part(new THREE.BoxGeometry(0.08, 0.035, 0.02), 0x8fe9ff, [0.085, 0.25, 0.31], 0, 1, { emit: true }),         // eyes
      part(new THREE.BoxGeometry(0.08, 0.035, 0.02), 0x8fe9ff, [-0.085, 0.25, 0.31], 0, 1, { emit: true }),
      part(new THREE.BoxGeometry(0.04, 0.16, 0.05), DARK, [0, 0.13, 0.29]),                                         // nose guard
      part(new THREE.ConeGeometry(0.075, 0.32, 8), BONE, [0.31, 0.43, 0], [0, 0, -0.75], 1, { top: 0xffffff }),     // horns
      part(new THREE.ConeGeometry(0.075, 0.32, 8), BONE, [-0.31, 0.43, 0], [0, 0, 0.75], 1, { top: 0xffffff }),
    ])));

    const arm = side => {
      const g = new THREE.Group(); g.position.set(side * 0.27, 0.34, 0); this.torso.add(g);
      g.add(M(merge([
        part(new THREE.CapsuleGeometry(0.065, 0.14, 3, 8), DARK, [0, -0.11, 0]),
        part(new THREE.SphereGeometry(0.085, 10, 8), STEEL, [0, -0.25, 0], 0, 1, { top: STEEL_L }),
      ])));
      return g;
    };
    this.armR = arm(-1); this.armL = arm(1);   // hero faces +z → his right hand is at -x

    // sword in right hand: blade points forward/up
    this.sword = new THREE.Group(); this.sword.position.set(0, -0.26, 0.02); this.armR.add(this.sword);
    this.sword.add(M(merge([
      part(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), LEATHER, [0, 0, 0]),
      part(new THREE.SphereGeometry(0.04, 8, 6), GOLD, [0, -0.1, 0]),
      part(new THREE.BoxGeometry(0.26, 0.045, 0.06), GOLD, [0, 0.09, 0]),
      part(new THREE.BoxGeometry(0.085, 0.6, 0.025), 0xb9c6d8, [0, 0.41, 0], 0, 1, { top: 0xf4f8ff }),
      part(new THREE.ConeGeometry(0.06, 0.12, 4), 0xf4f8ff, [0, 0.77, 0], [0, Math.PI / 4, 0], [1, 1, 0.3]),
      part(new THREE.BoxGeometry(0.018, 0.5, 0.03), 0x9ee8ff, [0, 0.4, 0], 0, 1, { emit: true }),                 // glowing fuller
    ])));
    this.sword.rotation.x = 1.25;

    // shield on left arm
    this.shield = new THREE.Group(); this.shield.position.set(0.08, -0.2, 0.06); this.armL.add(this.shield);
    this.shield.add(M(merge([
      part(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), 0x2f4f8a, [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], { top: 0x4a76c0 }),
      part(new THREE.TorusGeometry(0.22, 0.025, 4, 18), GOLD, [0, 0, 0], [0, Math.PI / 2, 0]),
      part(new THREE.SphereGeometry(0.06, 10, 6), GOLD, [0.03, 0, 0], 0, [0.6, 1, 1]),
    ])));
    this.shield.rotation.y = -0.5;

    const leg = side => {
      const g = new THREE.Group(); g.position.set(side * 0.11, 0.4, 0); this.root.add(g);
      g.add(M(merge([
        part(new THREE.CapsuleGeometry(0.075, 0.14, 3, 8), DARK, [0, -0.15, 0]),
        part(new THREE.BoxGeometry(0.15, 0.12, 0.22), STEEL, [0, -0.33, 0.03], 0, 1, { top: STEEL_L }),
      ])));
      return g;
    };
    this.legL = leg(1); this.legR = leg(-1);

    addOutlines(this.root, this.olMat);
    this.shadow = blobShadow(1.0, 0.45); scene.add(this.shadow);
    this.cape = new Cape(scene, RED);
    this.capeAnchor = new THREE.Object3D(); this.capeAnchor.position.set(0, 0.42, -0.17); this.torso.add(this.capeAnchor);

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
    const SPEED = 4.6, ATK_T = 0.42;
    // movement with snappy acceleration
    const attacking = this.atk >= 0;
    const want = new THREE.Vector2(move.x, move.y).multiplyScalar(attacking ? SPEED * 0.35 : SPEED);
    this.vel.lerp(want, 1 - Math.exp(-14 * dt));
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.y * dt;
    const sp = this.vel.length();
    if (move.lengthSq() > 0.01 && !attacking) this.targetYaw = Math.atan2(move.x, move.y);
    let dy = this.targetYaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * (1 - Math.exp(-16 * dt));
    this.root.rotation.y = this.yaw;

    // locomotion
    this.run += ((sp > 0.4 ? 1 : 0) - this.run) * (1 - Math.exp(-10 * dt));
    this.phase += dt * (4 + sp * 2.3);
    const s = Math.sin(this.phase), r = this.run, breath = Math.sin(t * 2.2) * (1 - r);
    this.legL.rotation.x = s * 0.9 * r; this.legR.rotation.x = -s * 0.9 * r;
    this.hips.position.y = 0.4 + Math.abs(Math.cos(this.phase)) * 0.06 * r + breath * 0.008;
    this.torso.rotation.x = 0.16 * r + breath * 0.02;
    this.torso.rotation.y = s * 0.12 * r;
    this.head.rotation.x = -0.1 * r + Math.sin(t * 1.3) * 0.03 * (1 - r);
    this.head.rotation.z = Math.sin(t * 0.9) * 0.04 * (1 - r);
    this.armL.rotation.set(-s * 0.5 * r - 0.25, 0, 0.12);
    this.armR.rotation.set(s * 0.6 * r - 0.1, 0, -0.15 + breath * 0.03);
    this.sword.rotation.x = 1.25;

    // attack: wind-up → fast slash (alternating forehand/backhand) → recover
    if (this.atk >= 0) {
      this.atk += dt / ATK_T;
      const a = this.atk, dir = this.combo ? -1 : 1;
      const k1 = Math.min(a / 0.3, 1), k2 = Math.min(Math.max((a - 0.3) / 0.25, 0), 1), k3 = Math.min(Math.max((a - 0.55) / 0.45, 0), 1);
      const e2 = 1 - Math.pow(1 - k2, 3);
      const wind = -2.3 * k1 * (1 - e2), swing = 0.9 * e2 * (1 - k3);
      this.armR.rotation.x = wind + swing - 0.1 * k3;
      this.armR.rotation.z = -0.15 - dir * (0.9 * k1 * (1 - e2) - 0.6 * e2 * (1 - k3));
      this.torso.rotation.y = dir * (0.5 * k1 * (1 - e2) - 0.6 * e2 * (1 - k3));
      this.hips.position.y -= 0.03 * e2 * (1 - k3);
      if (!this.atkHit && a >= 0.38) { this.atkHit = true; this.onHit && this.onHit(this.pos, this.yaw, dir); }
      if (a >= 1) this.atk = -1;
    }

    // hit flash
    if (this.hurt > 0) { this.hurt = Math.max(0, this.hurt - dt * 5); }
    this.mat.userData.flash.value = this.hurt * 0.7;

    this.shadow.position.set(this.pos.x, this.pos.y + 0.03, this.pos.z);
    this.root.updateMatrixWorld(true);
    this.cape.update(dt, this.capeAnchor.matrixWorld, this.root.matrixWorld, U.uWind.value.clone().multiplyScalar(U.uWindStr.value), t);
  }
}
