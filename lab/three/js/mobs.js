// Readable, "cute-creepy" mobs: big heads and eyes, clear silhouettes, squash & stretch, white hit-flash.
// Each mob = a handful of merged vertex-coloured meshes (+ outline twins) sharing one shader program.
import * as THREE from '../vendor/three.module.min.js';
import { toon, outline, addOutlines } from './toon.js';
import { part, merge } from './geo.js';
import { blobShadow } from './hero.js';
import { ARENA, heightAt } from './world.js';

const BONE = 0xeadfc4, BONE_D = 0xb9a888, RUST = 0x8a5a3c, DARKS = 0x1c1418, EYE = 0xffb347;
const cache = {};
const G = (k, f) => cache[k] || (cache[k] = f());

// ---------- geometry builders ----------
const skelGeo = {
  body: () => G('sb', () => merge([
    part(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 6), BONE_D, [0, 0.18, -0.02]),
    ...[0.27, 0.19, 0.11].map((y, i) => part(new THREE.TorusGeometry(0.13 - i * 0.015, 0.028, 5, 12, Math.PI * 1.6), BONE, [0, y, 0], [Math.PI / 2, 0, Math.PI * 0.7], [1, 0.85, 1])),
    part(new THREE.SphereGeometry(0.11, 8, 6), BONE, [0, 0.0, 0], 0, [1.25, 0.6, 0.9], { top: BONE_D }),
    part(new THREE.BoxGeometry(0.26, 0.1, 0.18), 0x4a3f5c, [0, -0.02, 0], 0, 1, { top: 0x5f5278 }),       // tattered loincloth
  ])),
  head: () => G('sh', () => merge([
    part(new THREE.SphereGeometry(0.27, 16, 12), BONE, [0, 0.2, 0], 0, [1, 0.94, 1.02], { top: 0xfff6e2 }),
    part(new THREE.BoxGeometry(0.26, 0.09, 0.2), BONE_D, [0, 0.0, 0.07], 0, 1, { top: BONE }),          // jaw
    part(new THREE.SphereGeometry(0.075, 10, 8), DARKS, [0.1, 0.2, 0.2], 0, [1, 1.1, 0.6]),                // sockets
    part(new THREE.SphereGeometry(0.075, 10, 8), DARKS, [-0.1, 0.2, 0.2], 0, [1, 1.1, 0.6]),
    part(new THREE.SphereGeometry(0.035, 8, 6), EYE, [0.1, 0.2, 0.245], 0, 1, { emit: true }),
    part(new THREE.SphereGeometry(0.035, 8, 6), EYE, [-0.1, 0.2, 0.245], 0, 1, { emit: true }),
    part(new THREE.ConeGeometry(0.03, 0.06, 3), DARKS, [0, 0.11, 0.255], [Math.PI, 0, 0]),
    ...[-0.08, -0.027, 0.027, 0.08].map(x => part(new THREE.BoxGeometry(0.035, 0.04, 0.02), 0xfffbef, [x, 0.06, 0.255])),
    part(new THREE.BoxGeometry(0.015, 0.12, 0.02), 0x6b5a48, [0.08, 0.38, 0.17], [0.5, 0, 0.5]),                       // crack
  ])),
  arm: () => G('sa', () => merge([
    part(new THREE.CapsuleGeometry(0.035, 0.18, 2, 6), BONE, [0, -0.12, 0]),
    part(new THREE.SphereGeometry(0.05, 8, 6), BONE, [0, -0.25, 0]),
  ])),
  blade: () => G('sbl', () => merge([
    part(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 5), 0x4a2e1e, [0, 0, 0]),
    part(new THREE.BoxGeometry(0.16, 0.035, 0.04), RUST, [0, 0.06, 0]),
    part(new THREE.BoxGeometry(0.075, 0.42, 0.02), 0x8e8a86, [0, 0.29, 0], 0, 1, { top: 0xbab3a8 }),
  ])),
  leg: () => G('sl', () => merge([
    part(new THREE.CapsuleGeometry(0.04, 0.16, 2, 6), BONE, [0, -0.12, 0]),
    part(new THREE.BoxGeometry(0.09, 0.05, 0.14), BONE_D, [0, -0.25, 0.03]),
  ])),
};

const SLIME_COLORS = [[0x3fbf5a, 0xa8ff8a], [0x3c8de8, 0x9fdcff], [0x9b55e0, 0xe3b0ff]];
function slimeGeo(v) {
  return G('slime' + v, () => {
    const [c0, c1] = SLIME_COLORS[v];
    const body = new THREE.SphereGeometry(0.42, 22, 16);
    const p = body.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y < 0 ? y * 0.55 : y * 1.02); }
    body.computeVertexNormals(); body.translate(0, 0.24, 0);
    return merge([
      part(body, c0, [0, 0, 0], 0, 1, { top: c1 }),
      part(new THREE.SphereGeometry(0.1, 12, 10), 0xffffff, [0.14, 0.34, 0.33], 0, [1, 1.15, 0.6]),
      part(new THREE.SphereGeometry(0.1, 12, 10), 0xffffff, [-0.14, 0.34, 0.33], 0, [1, 1.15, 0.6]),
      part(new THREE.SphereGeometry(0.062, 10, 8), 0x161220, [0.14, 0.33, 0.39], 0, [1, 1.15, 0.6]),
      part(new THREE.SphereGeometry(0.062, 10, 8), 0x161220, [-0.14, 0.33, 0.39], 0, [1, 1.15, 0.6]),
      part(new THREE.SphereGeometry(0.022, 6, 4), 0xffffff, [0.165, 0.37, 0.425], 0, 1, { emit: true }),
      part(new THREE.SphereGeometry(0.022, 6, 4), 0xffffff, [-0.115, 0.37, 0.425], 0, 1, { emit: true }),
      part(new THREE.SphereGeometry(0.05, 8, 6), 0x2a1020, [0, 0.21, 0.4], 0, [1.1, 0.55, 0.5]),           // mouth
      part(new THREE.SphereGeometry(0.05, 8, 6), 0xff8fa8, [0.25, 0.24, 0.31], 0, [1, 0.6, 0.4]),           // blush
      part(new THREE.SphereGeometry(0.05, 8, 6), 0xff8fa8, [-0.25, 0.24, 0.31], 0, [1, 0.6, 0.4]),
      part(new THREE.SphereGeometry(0.09, 10, 8), 0xffffff, [-0.17, 0.5, 0.18], [0, 0, 0.6], [1, 0.5, 0.6], { emit: true }), // gloss
    ]);
  });
}

const batGeo = {
  body: () => G('bb', () => merge([
    part(new THREE.SphereGeometry(0.25, 16, 12), 0x2e2147, [0, 0, 0], 0, [1, 0.95, 0.95], { top: 0x5e4690 }),
    part(new THREE.ConeGeometry(0.08, 0.2, 5), 0x3c2c5c, [0.12, 0.25, 0], [0, 0, -0.35]),
    part(new THREE.ConeGeometry(0.08, 0.2, 5), 0x3c2c5c, [-0.12, 0.25, 0], [0, 0, 0.35]),
    part(new THREE.SphereGeometry(0.085, 10, 8), 0xffe26a, [0.09, 0.04, 0.2], 0, [1, 1.1, 0.5], { emit: true }),
    part(new THREE.SphereGeometry(0.085, 10, 8), 0xffe26a, [-0.09, 0.04, 0.2], 0, [1, 1.1, 0.5], { emit: true }),
    part(new THREE.SphereGeometry(0.04, 8, 6), 0x150c1e, [0.09, 0.04, 0.245], 0, [0.6, 1.3, 0.4]),
    part(new THREE.SphereGeometry(0.04, 8, 6), 0x150c1e, [-0.09, 0.04, 0.245], 0, [0.6, 1.3, 0.4]),
    part(new THREE.ConeGeometry(0.018, 0.05, 3), 0xffffff, [0.04, -0.09, 0.21], [Math.PI, 0, 0]),
    part(new THREE.ConeGeometry(0.018, 0.05, 3), 0xffffff, [-0.04, -0.09, 0.21], [Math.PI, 0, 0]),
  ])),
  wing: () => G('bw', () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.06); s.lineTo(0.22, 0.2); s.lineTo(0.52, 0.16); s.quadraticCurveTo(0.44, 0.02, 0.5, -0.1);
    s.quadraticCurveTo(0.38, -0.04, 0.32, -0.14); s.quadraticCurveTo(0.22, -0.04, 0.12, -0.12); s.quadraticCurveTo(0.08, -0.02, 0, -0.06);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -0.01); g.rotateX(-Math.PI / 2);
    return part(g, 0x251a3a, [0, 0, 0], 0, 1, { top: 0x6a4c9a });
  }),
};

// ---------- mob ----------
const TYPES = {
  skel: { hp: 3, speed: 1.9, reach: 1.3, r: 0.45, shadow: 0.9, S: 1.35 },
  slime: { hp: 2, speed: 2.6, reach: 1.1, r: 0.5, shadow: 1.0, S: 1.2 },
  bat: { hp: 2, speed: 3.0, reach: 1.35, r: 0.42, shadow: 0.75, S: 1.45 },
};

class Mob {
  constructor(scene, type, olMat, variant = 0) {
    this.type = type; this.cfg = TYPES[type];
    this.root = new THREE.Group(); scene.add(this.root);
    this.mat = toon(0xffffff, { vc: true, rim: 0.45, rimColor: type === 'skel' ? 0xffd9a0 : 0xffffff });
    const M = g => new THREE.Mesh(g, this.mat);
    this.rig = new THREE.Group(); this.root.add(this.rig);
    if (type === 'skel') {
      this.body = new THREE.Group(); this.body.position.y = 0.36; this.rig.add(this.body); this.body.add(M(skelGeo.body()));
      this.head = new THREE.Group(); this.head.position.y = 0.33; this.body.add(this.head); this.head.add(M(skelGeo.head()));
      this.armR = new THREE.Group(); this.armR.position.set(-0.17, 0.27, 0); this.body.add(this.armR); this.armR.add(M(skelGeo.arm()));
      this.armL = new THREE.Group(); this.armL.position.set(0.17, 0.27, 0); this.body.add(this.armL); this.armL.add(M(skelGeo.arm()));
      const bl = new THREE.Group(); bl.position.set(0, -0.26, 0.02); bl.rotation.x = 1.3; this.armR.add(bl); bl.add(M(skelGeo.blade()));
      this.legL = new THREE.Group(); this.legL.position.set(0.08, 0.32, 0); this.rig.add(this.legL); this.legL.add(M(skelGeo.leg()));
      this.legR = new THREE.Group(); this.legR.position.set(-0.08, 0.32, 0); this.rig.add(this.legR); this.legR.add(M(skelGeo.leg()));
    } else if (type === 'slime') {
      this.body = M(slimeGeo(variant)); this.rig.add(this.body);
    } else {
      this.body = new THREE.Group(); this.rig.add(this.body); this.body.add(M(batGeo.body()));
      this.wingL = new THREE.Group(); this.wingL.position.set(0.17, 0.03, -0.02); this.body.add(this.wingL);
      const wl = M(batGeo.wing()); wl.userData.noOutline = true; this.wingL.add(wl);
      this.wingR = new THREE.Group(); this.wingR.position.set(-0.17, 0.03, -0.02); this.wingR.scale.x = -1; this.body.add(this.wingR);
      const wr = M(batGeo.wing()); wr.userData.noOutline = true; this.wingR.add(wr);
      this.mat.side = THREE.DoubleSide;
    }
    addOutlines(this.root, olMat);
    this.shadow = blobShadow(this.cfg.shadow, 0.4); scene.add(this.shadow);
    this.pos = this.root.position; this.vel = new THREE.Vector2(); this.yaw = 0;
    this.t = Math.random() * 10; this.flash = 0; this.squash = 0;
    this.spawn();
  }

  spawn(x, z) {
    if (x === undefined) { const a = Math.random() * Math.PI * 2, d = 7 + Math.random() * (ARENA - 9); x = Math.cos(a) * d; z = Math.sin(a) * d; }
    this.pos.set(x, heightAt(x, z), z);
    this.hp = this.cfg.hp; this.dead = 0; this.spawnT = 0; this.state = 'idle'; this.stateT = Math.random() * 2;
    this.target = new THREE.Vector2(x, z); this.atkT = 0; this.cool = 1 + Math.random();
    this.root.visible = this.shadow.visible = true; this.root.scale.setScalar(0.01);
  }

  hit(dir, fx) {
    if (this.dead || this.spawnT < 1) return false;
    this.hp--; this.flash = 1; this.squash = 1;
    this.vel.set(dir.x * 7, dir.y * 7);
    this.state = 'chase'; this.atkT = 0;
    if (this.hp <= 0) { this.dead = 0.001; fx.death(this.pos, this.type); }
    return true;
  }

  update(dt, hero, mobs, colliders, fx) {
    this.t += dt;
    if (this.dead) {
      this.dead += dt;
      const k = Math.min(this.dead / 0.35, 1);
      this.root.scale.set(1 + k * 0.6, Math.max(0.01, 1 - k), 1 + k * 0.6).multiplyScalar(this.cfg.S);
      this.mat.userData.flash.value = 1 - k * 0.5;
      if (k >= 1) { this.root.visible = this.shadow.visible = false; }
      if (this.dead > 2.6) { this.spawn(); fx.puff(this.pos, 6, 0xd8d0e8); }
      return;
    }
    if (this.spawnT < 1) { this.spawnT = Math.min(1, this.spawnT + dt * 1.8); const s = this.spawnT; this.root.scale.setScalar((s < 0.7 ? s / 0.7 * 1.15 : 1.15 - (s - 0.7) / 0.3 * 0.15) * this.cfg.S); }

    // --- AI ---
    const hx = hero.pos.x - this.pos.x, hz = hero.pos.z - this.pos.z, hd = Math.hypot(hx, hz);
    let mx = 0, mz = 0, speed = this.cfg.speed;
    this.stateT -= dt; this.cool -= dt;
    if (this.state === 'windup') {
      this.atkT += dt;
      if (this.atkT > 0.45) { this.state = 'lunge'; this.atkT = 0; this.vel.set(hx / (hd || 1) * 6.5, hz / (hd || 1) * 6.5); }
    } else if (this.state === 'lunge') {
      this.atkT += dt;
      if (this.atkT > 0.08 && this.atkT - dt <= 0.08 && hd < this.cfg.reach + 0.35) hero.takeHit(new THREE.Vector2(hx / (hd || 1), hz / (hd || 1)));
      if (this.atkT > 0.35) { this.state = 'chase'; this.cool = 1.2 + Math.random() * 0.8; }
    } else if (hd < 8) {
      this.state = 'chase';
      if (hd < this.cfg.reach + 0.25 && this.cool <= 0) { this.state = 'windup'; this.atkT = 0; }
      else if (hd > this.cfg.reach * 0.8) { mx = hx / hd; mz = hz / hd; }
    } else {
      this.state = 'idle';
      if (this.stateT <= 0) { const a = Math.random() * Math.PI * 2, d = 2 + Math.random() * 4; this.target.set(this.pos.x + Math.cos(a) * d, this.pos.z + Math.sin(a) * d); this.stateT = 2 + Math.random() * 3; }
      const tx = this.target.x - this.pos.x, tz = this.target.y - this.pos.z, td = Math.hypot(tx, tz);
      if (td > 0.3) { mx = tx / td * 0.45; mz = tz / td * 0.45; }
    }
    // slimes only move while airborne
    let hop = 0;
    if (this.type === 'slime') { const c = (this.t * 1.9) % 1; hop = c < 0.55 ? Math.sin(c / 0.55 * Math.PI) : 0; if (hop === 0) { mx *= 0.05; mz *= 0.05; } else speed *= 1.6; this.hopC = c; }
    const want = new THREE.Vector2(mx * speed, mz * speed);
    if (this.state !== 'lunge') this.vel.lerp(want, 1 - Math.exp(-8 * dt));
    else this.vel.multiplyScalar(Math.exp(-6 * dt));
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.y * dt;

    // separation from other mobs, hero and obstacles
    for (const o of mobs) if (o !== this && !o.dead) {
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, d = Math.hypot(dx, dz), m = this.cfg.r + o.cfg.r;
      if (d < m && d > 1e-4) { const p = (m - d) * 0.5; this.pos.x += dx / d * p; this.pos.z += dz / d * p; }
    }
    if (hd < this.cfg.r + 0.3 && hd > 1e-4) { const p = this.cfg.r + 0.3 - hd; this.pos.x -= hx / hd * p; this.pos.z -= hz / hd * p; }
    for (const c of colliders) { const dx = this.pos.x - c.x, dz = this.pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + this.cfg.r; if (d < m && d > 1e-4) { this.pos.x += dx / d * (m - d); this.pos.z += dz / d * (m - d); } }
    const rr = Math.hypot(this.pos.x, this.pos.z); if (rr > ARENA) { this.pos.x *= ARENA / rr; this.pos.z *= ARENA / rr; }

    // facing
    const face = this.state === 'idle' ? Math.atan2(this.vel.x, this.vel.y) : Math.atan2(hx, hz);
    if (this.vel.lengthSq() > 0.05 || this.state !== 'idle') { let d = face - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * (1 - Math.exp(-10 * dt)); }
    this.root.rotation.y = this.yaw;
    this.pos.y = heightAt(this.pos.x, this.pos.z);

    // --- animation ---
    const sp = this.vel.length(), t = this.t, wu = this.state === 'windup' ? Math.min(this.atkT / 0.45, 1) : 0, lu = this.state === 'lunge' ? 1 - Math.min(this.atkT / 0.35, 1) : 0;
    this.squash = Math.max(0, this.squash - dt * 4);
    const sq = Math.sin(this.squash * Math.PI) * 0.25;
    if (this.type === 'skel') {
      const ph = t * (5 + sp * 2), s = Math.sin(ph), w = Math.min(sp / 1.5, 1);
      this.legL.rotation.x = s * 0.8 * w; this.legR.rotation.x = -s * 0.8 * w;
      this.body.position.y = 0.36 + Math.abs(Math.cos(ph)) * 0.04 * w + Math.sin(t * 3) * 0.01;
      this.body.rotation.z = Math.sin(ph) * 0.08 * w;
      this.body.rotation.x = 0.1 * w - wu * 0.35 + lu * 0.4;
      this.head.rotation.z = Math.sin(t * 2.1) * 0.12;                // the classic bony head-wobble
      this.head.rotation.x = -wu * 0.2;
      this.armL.rotation.x = -s * 0.6 * w - 0.2; this.armL.rotation.z = 0.2;
      this.armR.rotation.x = s * 0.6 * w - 0.2 - wu * 2.2 + lu * 2.6; this.armR.rotation.z = -0.2;
      this.rig.scale.set(1 + sq, 1 - sq, 1 + sq);
    } else if (this.type === 'slime') {
      const c = this.hopC ?? 0, land = c > 0.55 ? Math.max(0, 1 - (c - 0.55) / 0.2) : 0, pre = c > 0.85 ? (c - 0.85) / 0.15 : 0;
      const air = this.hopC < 0.55 ? Math.sin(this.hopC / 0.55 * Math.PI) : 0;
      const st = air * 0.18 - land * 0.22 - pre * 0.15 - wu * 0.25 + lu * 0.3 - sq;
      this.rig.position.y = air * 0.55;
      this.rig.scale.set(1 - st * 0.6, 1 + st, 1 - st * 0.6);
      this.body.rotation.x = -wu * 0.2 + lu * 0.3;
    } else {
      const flap = Math.sin(t * 16) * 0.9;
      this.wingL.rotation.z = flap * 0.9 - 0.1; this.wingR.rotation.z = -flap * 0.9 + 0.1;
      this.rig.position.y = 1.0 + Math.sin(t * 3) * 0.12 - Math.sin(t * 16) * 0.03 - lu * 0.4;
      this.body.rotation.x = 0.15 + wu * -0.5 + lu * 0.6;
      this.body.rotation.z = Math.sin(t * 2.3) * 0.15;
      this.rig.scale.set(1 + sq, 1 - sq, 1 + sq);
    }
    // telegraph: pulse red during wind-up, white on hit
    this.flash = Math.max(0, this.flash - dt * 6);
    if (this.flash > 0) { this.mat.userData.flashColor.value.set(1, 1, 1); this.mat.userData.flash.value = this.flash; }
    else if (wu > 0) { this.mat.userData.flashColor.value.set(1, 0.15, 0.1); this.mat.userData.flash.value = 0.25 + Math.sin(wu * 20) * 0.15; }
    else this.mat.userData.flash.value = 0;

    const lift = this.type === 'bat' ? this.rig.position.y : this.type === 'slime' ? this.rig.position.y : 0;
    this.shadow.position.set(this.pos.x, this.pos.y + 0.03, this.pos.z);
    this.shadow.scale.setScalar(this.root.scale.x * (1 - Math.min(lift, 1.2) * 0.35));
  }
}

export class Mobs {
  constructor(scene, fx) {
    this.fx = fx;
    this.olMat = outline({ width: 0.02, color: 0x150e1c });
    this.list = [];
    const plan = ['skel', 'skel', 'skel', 'slime', 'slime', 'slime', 'bat', 'bat'];
    plan.forEach((t, i) => this.list.push(new Mob(scene, t, this.olMat, i % 3)));
  }
  nearest(p, maxD) {
    let best = null, bd = maxD;
    for (const m of this.list) if (!m.dead && m.spawnT >= 1) { const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  // melee arc from the hero
  slash(p, yaw, range = 1.9, arc = 1.25) {
    let n = 0;
    for (const m of this.list) {
      if (m.dead) continue;
      const dx = m.pos.x - p.x, dz = m.pos.z - p.z, d = Math.hypot(dx, dz);
      if (d > range + m.cfg.r) continue;
      let da = Math.atan2(dx, dz) - yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > arc && d > 0.7) continue;
      if (m.hit(new THREE.Vector2(dx / (d || 1), dz / (d || 1)), this.fx)) { n++; this.fx.hit(m.pos, m.type, m.type === 'bat' ? 1.0 : 0.45); }
    }
    return n;
  }
  update(dt, hero, colliders) { for (const m of this.list) m.update(dt, hero, this.list, colliders, this.fx); }
  blobs() { return this.list.filter(m => !m.dead && m.type !== 'bat').map(m => ({ x: m.pos.x, z: m.pos.z, r: m.cfg.r * 1.3, w: 1 })); }
  setOutlines(on) { this.olMat.visible = on; }
}
