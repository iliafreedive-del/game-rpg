// The Abyss Executioner's undead (see js/data/enemies.js): skeleton warrior, ghoul, bone mage.
// Real-size, tall-and-lean proportions so they read as a family with the 1:4 hero. Shared toon shader, merged vertex-coloured parts.
import * as THREE from '../../vendor/three.module.min.js';
import { toon, outline, addOutlines } from '../toon.js';
import { part, merge } from '../geo.js';
import { blobShadow } from '../hero.js';
import { ARENA, heightAt } from '../world.js';
import { PAL, toWorld } from './world.js';

const BONE = 0xe4d8ba, BONE_D = 0x9a8c70, RUST = 0x8a5a3c, IRON = 0x59627a, DARKS = 0x0d0a16, EYE = 0xc9a8ff;
const SKIN = 0x6d7b72, SKIN_L = 0xaebca6, ROBE = 0x2c1f5c, ROBE_L = 0x5b44b0;
const cache = {}; const G = (k, f) => cache[k] || (cache[k] = f());
const ball = (r, c, p, s, o) => part(new THREE.SphereGeometry(r, 10, 8), c, p, 0, s, o);

// ---------- skeleton warrior ----------
const sk = {
  body: () => G('sb', () => merge([
    part(new THREE.BoxGeometry(0.32, 0.14, 0.2), BONE_D, [0, 0, 0], 0, 1, { top: BONE }),
    part(new THREE.CylinderGeometry(0.04, 0.045, 0.55, 6), BONE_D, [0, 0.3, -0.04]),
    ...[0.22, 0.32, 0.42, 0.52].map((y, i) => part(new THREE.TorusGeometry(0.2 - i * 0.012, 0.03, 5, 12, Math.PI * 1.55), BONE, [0, y, 0], [Math.PI / 2, 0, Math.PI * 0.725], [1, 0.85, 1])),
    part(new THREE.BoxGeometry(0.54, 0.07, 0.12), BONE_D, [0, 0.64, 0], 0, 1, { top: BONE }),
    part(new THREE.SphereGeometry(0.17, 10, 8), IRON, [0.34, 0.64, 0], 0, [1.1, 0.8, 1.1], { top: 0x9aa3bd }),             // iron pauldron
    part(new THREE.TorusGeometry(0.16, 0.025, 4, 12), PAL.brassD, [0.34, 0.58, 0], [Math.PI / 2, 0, 0]),
    ball(0.1, BONE, [-0.34, 0.64, 0], [1, 0.9, 1]), part(new THREE.ConeGeometry(0.04, 0.2, 5), BONE, [-0.4, 0.74, 0], [0, 0, 0.5]),
    part(new THREE.BoxGeometry(0.3, 0.38, 0.05), 0x2a1d44, [0, -0.17, 0.08], 0, 1, { top: 0x4a3578 }),                      // tattered loincloth
  ])),
  head: () => G('sh', () => merge([
    ball(0.21, BONE, [0, 0.2, 0], [1, 1, 1.05], { top: 0xfff6e2 }),
    part(new THREE.BoxGeometry(0.22, 0.08, 0.16), BONE_D, [0, 0.03, 0.06], 0, 1, { top: BONE }),
    ball(0.065, DARKS, [0.085, 0.19, 0.17], [1, 1.15, 0.6]), ball(0.065, DARKS, [-0.085, 0.19, 0.17], [1, 1.15, 0.6]),
    ball(0.032, EYE, [0.085, 0.19, 0.205], 1, { emit: true }), ball(0.032, EYE, [-0.085, 0.19, 0.205], 1, { emit: true }),
    part(new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), RUST, [0, 0.24, 0], 0, [1, 0.95, 1.05], { top: 0x8f6a52 }),   // kettle helm
    part(new THREE.TorusGeometry(0.235, 0.025, 4, 14), PAL.brassD, [0, 0.24, 0], [Math.PI / 2, 0, 0]),
    part(new THREE.BoxGeometry(0.04, 0.14, 0.26), PAL.brass, [0, 0.46, 0]),
  ])),
  arm: () => G('sa', () => merge([part(new THREE.CapsuleGeometry(0.04, 0.5, 2, 6), BONE, [0, -0.3, 0]), ball(0.075, BONE, [0, -0.6, 0])])),
  blade: () => G('sbl', () => merge([
    part(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 5), 0x3a2418, [0, 0, 0]),
    part(new THREE.BoxGeometry(0.3, 0.05, 0.07), RUST, [0, 0.11, 0]),
    part(new THREE.BoxGeometry(0.11, 0.8, 0.03), 0x7e848f, [0, 0.54, 0], 0, 1, { top: 0xc4c8d0 }),
    part(new THREE.ConeGeometry(0.075, 0.16, 4), 0xc4c8d0, [0, 1.02, 0], [0, Math.PI / 4, 0], [1, 1, 0.3]),
    part(new THREE.BoxGeometry(0.018, 0.6, 0.04), PAL.abyss, [0, 0.52, 0], 0, 1, { emit: true }),
  ])),
  shield: () => G('ss', () => merge([
    part(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 14), 0x3b3144, [0, 0, 0], [0, 0, Math.PI / 2], 1, { top: 0x6a5c78 }),
    part(new THREE.TorusGeometry(0.3, 0.03, 4, 16), PAL.brassD, [0, 0, 0], [0, Math.PI / 2, 0]),
    ball(0.1, BONE, [0.06, 0.02, 0], [0.5, 1, 1]), ball(0.025, EYE, [0.1, 0.04, 0.035], 1, { emit: true }), ball(0.025, EYE, [0.1, 0.04, -0.035], 1, { emit: true }),
  ])),
  leg: () => G('sl', () => merge([
    part(new THREE.CapsuleGeometry(0.045, 0.34, 2, 6), BONE, [0, -0.25, 0]), ball(0.06, BONE_D, [0, -0.45, 0.02]),
    part(new THREE.CapsuleGeometry(0.04, 0.3, 2, 6), BONE, [0, -0.64, 0]), part(new THREE.BoxGeometry(0.1, 0.07, 0.2), BONE_D, [0, -0.82, 0.05]),
  ])),
};

// ---------- ghoul: hunched, long arms, wide mouth ----------
const gh = {
  body: () => G('gb', () => merge([
    ball(0.27, SKIN, [0, 0.3, 0], [1.05, 1.25, 0.8], { top: SKIN_L }),
    ball(0.18, SKIN, [0, 0.0, 0.02], [1.1, 0.8, 0.9]),
    ...[0, 1, 2, 3, 4].map(i => part(new THREE.ConeGeometry(0.045, 0.16 - i * 0.012, 5), BONE, [0, 0.55 - i * 0.12, -0.2 - i * 0.012], [-0.6, 0, 0])),           // spine ridge
    ...[0.3, 0.45].map(y => part(new THREE.TorusGeometry(0.2, 0.02, 4, 10, Math.PI), BONE_D, [0, y, 0.12], [0, 0, Math.PI], [1, 0.8, 0.6])),                  // ribs showing
    part(new THREE.BoxGeometry(0.34, 0.3, 0.05), 0x3a2a3a, [0, -0.15, 0.1], 0, 1, { top: 0x5a4458 }),
  ])),
  head: () => G('gh', () => merge([
    ball(0.17, SKIN, [0, 0.14, 0], [0.95, 1.25, 1.05], { top: SKIN_L }),
    part(new THREE.BoxGeometry(0.24, 0.1, 0.14), DARKS, [0, 0.03, 0.12]),
    ...[-0.08, -0.03, 0.03, 0.08].map(x => part(new THREE.ConeGeometry(0.014, 0.05, 4), BONE, [x, 0.065, 0.19], [Math.PI, 0, 0])),
    ...[-0.07, 0, 0.07].map(x => part(new THREE.ConeGeometry(0.012, 0.04, 4), BONE, [x, -0.01, 0.19])),
    ball(0.045, 0xffd45a, [0.075, 0.2, 0.15], [1, 1, 0.6], { emit: true }), ball(0.045, 0xffd45a, [-0.075, 0.2, 0.15], [1, 1, 0.6], { emit: true }),
    ball(0.02, DARKS, [0.075, 0.2, 0.185], [1, 2, 1]), ball(0.02, DARKS, [-0.075, 0.2, 0.185], [1, 2, 1]),
    part(new THREE.ConeGeometry(0.05, 0.08, 4), SKIN, [0, 0.17, 0.17], [Math.PI / 2, 0, 0], 1, { top: SKIN_L }),
  ])),
  arm: () => G('ga', () => merge([
    part(new THREE.CapsuleGeometry(0.055, 0.7, 3, 6), SKIN, [0, -0.4, 0], 0, 1, { top: SKIN_L }), ball(0.08, SKIN, [0, -0.8, 0.02]),
    ...[-0.04, 0, 0.04].map(x => part(new THREE.ConeGeometry(0.018, 0.17, 4), BONE, [x, -0.9, 0.04], [Math.PI + 0.25, 0, x * 3])),
  ])),
  leg: () => G('gl', () => merge([
    part(new THREE.CapsuleGeometry(0.075, 0.26, 3, 6), SKIN, [0, -0.2, 0]), part(new THREE.CapsuleGeometry(0.055, 0.28, 3, 6), SKIN, [0, -0.5, 0.04], [0.3, 0, 0]),
    part(new THREE.BoxGeometry(0.12, 0.06, 0.22), SKIN_L, [0, -0.7, 0.1]),
  ])),
};

// ---------- bone mage: floating robe, antlered skull, staff with an abyss orb ----------
const mg = {
  robe: () => G('mr', () => merge([
    part(new THREE.CylinderGeometry(0.2, 0.44, 1.3, 10, 3), ROBE, [0, 0.65, 0], 0, 1, { top: ROBE_L }),
    part(new THREE.TorusGeometry(0.43, 0.035, 4, 16), PAL.brass, [0, 0.05, 0], [Math.PI / 2, 0, 0]),
    part(new THREE.CylinderGeometry(0.22, 0.2, 0.08, 10), PAL.brassD, [0, 0.72, 0], 0, 1, { top: PAL.brass }),
    ...[0.95, 1.07, 1.19].map((y, i) => part(new THREE.TorusGeometry(0.19 - i * 0.01, 0.022, 4, 10, Math.PI * 1.5), BONE, [0, y, 0.0], [Math.PI / 2, 0, Math.PI * 0.75], [1, 0.8, 1])),
    part(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), 0x3a2a78, [0, 1.22, -0.02], 0, [1.1, 0.8, 0.9], { top: 0x7a5ad0 }),         // mantle
    ...[-1, 1].map(sx => part(new THREE.ConeGeometry(0.05, 0.3, 5), BONE, [sx * 0.32, 1.5, 0], [0, 0, -sx * 0.5], 1, { top: 0xffffff })),
  ])),
  head: () => G('mh', () => merge([
    ball(0.19, BONE, [0, 0.2, 0], [1, 1, 1.08], { top: 0xfff6e2 }), part(new THREE.BoxGeometry(0.2, 0.07, 0.14), BONE_D, [0, 0.03, 0.06]),
    ball(0.06, DARKS, [0.075, 0.2, 0.16], [1, 1.2, 0.6]), ball(0.06, DARKS, [-0.075, 0.2, 0.16], [1, 1.2, 0.6]),
    ball(0.034, EYE, [0.075, 0.2, 0.195], 1, { emit: true }), ball(0.034, EYE, [-0.075, 0.2, 0.195], 1, { emit: true }),
    ...[-1, 1].flatMap(sx => [
      part(new THREE.ConeGeometry(0.035, 0.3, 5), BONE_D, [sx * 0.15, 0.42, 0], [0, 0, -sx * 0.5], 1, { top: BONE }),
      part(new THREE.ConeGeometry(0.025, 0.22, 5), BONE_D, [sx * 0.3, 0.6, 0], [0, 0, sx * 0.25], 1, { top: BONE }),
      part(new THREE.ConeGeometry(0.02, 0.15, 5), BONE_D, [sx * 0.24, 0.5, 0], [0, 0, -sx * 1.0], 1, { top: BONE }),
    ]),
  ])),
  arm: () => G('ma', () => merge([part(new THREE.CapsuleGeometry(0.06, 0.4, 3, 6), ROBE, [0, -0.25, 0], 0, 1, { top: ROBE_L }), ball(0.07, BONE, [0, -0.55, 0])])),
  staff: () => G('mst', () => merge([
    part(new THREE.CylinderGeometry(0.025, 0.03, 2.0, 6), PAL.brassD, [0, 0.4, 0], 0, 1, { top: PAL.brass }),
    ...[0, 1, 2].map(i => part(new THREE.ConeGeometry(0.03, 0.34, 4), BONE, [Math.cos(i * 2.09) * 0.1, 1.5, Math.sin(i * 2.09) * 0.1], [Math.sin(i * 2.09) * 0.4, 0, -Math.cos(i * 2.09) * 0.4])),
  ])),
  orb: () => G('mo', () => ball(0.12, 0x9a62ff, [0, 0, 0], 1, { emit: true })),
};

const TYPES = {
  skel: { hp: 4, speed: 2.0, reach: 1.7, r: 0.5, shadow: 1.2, wind: 0.55, lungeV: 6.5, name: 'skel' },
  ghoul: { hp: 2, speed: 4.3, reach: 1.35, r: 0.42, shadow: 1.0, wind: 0.3, lungeV: 10, name: 'ghoul' },
  mage: { hp: 2, speed: 1.9, reach: 9, r: 0.45, shadow: 1.1, wind: 0.95, name: 'mage' },
};
const DEATH = { skel: [0xe8dcc0, PAL.abyss], ghoul: [0xa6d070, 0x6b3fd0], mage: [PAL.abyss, 0xffffff] };
const HIT = { skel: 0xf2e8d0, ghoul: 0xc6e890, mage: PAL.abyss };

class Mob {
  constructor(scene, type, olMat, tele) {
    this.type = type; this.cfg = TYPES[type];
    this.root = new THREE.Group(); scene.add(this.root);
    this.mat = toon(0xffffff, { vc: true, rim: 0.7, rimColor: type === 'ghoul' ? 0xd8ffb0 : type === 'mage' ? 0xc9aaff : 0xffe2b8 });
    const M = g => new THREE.Mesh(g, this.mat), grp = (p, par) => { const g = new THREE.Group(); g.position.set(...p); par.add(g); return g; };
    this.rig = grp([0, 0, 0], this.root);
    if (type === 'skel') {
      this.body = grp([0, 0.85, 0], this.rig); this.body.add(M(sk.body()));
      this.head = grp([0, 0.68, 0], this.body); this.head.add(M(sk.head()));
      this.armR = grp([-0.36, 0.62, 0], this.body); this.armR.add(M(sk.arm()));
      this.armL = grp([0.36, 0.62, 0], this.body); this.armL.add(M(sk.arm()));
      const bl = grp([0, -0.6, 0.03], this.armR); bl.rotation.x = 1.3; bl.add(M(sk.blade()));
      const sh = grp([0.1, -0.45, 0.1], this.armL); sh.rotation.y = -0.4; sh.add(M(sk.shield()));
      this.legL = grp([0.12, 0.85, 0], this.rig); this.legL.add(M(sk.leg())); this.legR = grp([-0.12, 0.85, 0], this.rig); this.legR.add(M(sk.leg()));
    } else if (type === 'ghoul') {
      this.body = grp([0, 0.78, 0], this.rig); this.body.add(M(gh.body()));
      this.head = grp([0, 0.52, 0.12], this.body); this.head.add(M(gh.head()));
      this.armR = grp([-0.3, 0.45, 0.05], this.body); this.armR.add(M(gh.arm()));
      this.armL = grp([0.3, 0.45, 0.05], this.body); this.armL.add(M(gh.arm()));
      this.legL = grp([0.13, 0.78, 0], this.rig); this.legL.add(M(gh.leg())); this.legR = grp([-0.13, 0.78, 0], this.rig); this.legR.add(M(gh.leg()));
    } else {
      this.body = grp([0, 0.55, 0], this.rig); this.body.add(M(mg.robe()));
      this.head = grp([0, 1.38, 0], this.body); this.head.add(M(mg.head()));
      this.armL = grp([0.3, 1.25, 0], this.body); this.armL.add(M(mg.arm()));
      this.armR = grp([-0.3, 1.25, 0], this.body); this.armR.add(M(mg.arm()));
      this.staff = grp([0, -0.5, 0.05], this.armR); this.staff.add(M(mg.staff()));
      this.orb = grp([0, 1.5, 0], this.staff); const om = M(mg.orb()); om.userData.noOutline = true; this.orb.add(om);
    }
    addOutlines(this.root, olMat);
    this.shadow = blobShadow(this.cfg.shadow * 1.4, 0.55); scene.add(this.shadow);
    this.tele = tele; scene.add(tele.m);
    this.pos = this.root.position; this.vel = new THREE.Vector2(); this.yaw = 0;
    this.t = Math.random() * 10; this.flash = 0; this.squash = 0; this.dead = 0;
  }

  spawn(x, z, idle) {
    this.pos.set(x, heightAt(x, z), z);
    this.hp = this.cfg.hp; this.dead = 0; this.spawnT = 0; this.state = 'idle'; this.stateT = Math.random() * 2;
    this.target = new THREE.Vector2(x, z); this.atkT = 0; this.cool = 1.2 + Math.random(); this.aggro = !idle;
    this.root.visible = this.shadow.visible = true; this.root.scale.setScalar(0.01);
  }

  hit(dir, fx) {
    if (this.dead || this.spawnT < 1) return false;
    this.hp--; this.flash = 1; this.squash = 1; this.aggro = true;
    const k = this.type === 'mage' ? 5 : this.type === 'skel' ? 6 : 8;
    this.vel.set(dir.x * k, dir.y * k);
    if (this.state === 'windup' || this.state === 'cast') this.state = 'chase';
    this.atkT = 0; this.tele.m.visible = false;
    if (this.hp <= 0) {
      this.dead = 0.001; const [a, b] = DEATH[this.type];
      fx.puff(this.pos, 5, this.type === 'ghoul' ? 0x2a2138 : 0xcfc8e6, 0.6); fx.burst({ x: this.pos.x, y: this.pos.y + 0.4, z: this.pos.z }, a, 22, 5.5, 1.2, 1.2);
      fx.burst({ x: this.pos.x, y: this.pos.y + 0.2, z: this.pos.z }, b, 16, 2.2, 1.5, 2.2);                 // soul wisps rise
      fx.burst(this.pos, PAL.brass, 7, 3.5, 1.1, 1.4); fx.ring(this.pos, b, 1.7);
    }
    return true;
  }

  update(dt, hero, mobs, colliders, fx, bolts) {
    this.t += dt;
    const cfg = this.cfg;
    if (this.dead) {
      this.dead += dt;
      const k = Math.min(this.dead / 0.4, 1);
      this.root.scale.set(1 + k * 0.5, Math.max(0.01, 1 - k), 1 + k * 0.5);
      this.mat.userData.flashColor.value.set(1, 1, 1); this.mat.userData.flash.value = 1 - k * 0.4;
      this.tele.m.visible = false;
      if (k >= 1) this.root.visible = this.shadow.visible = false;
      if (this.dead > 3.2) { this.respawn(hero, fx); }
      return;
    }
    if (this.spawnT < 1) { this.spawnT = Math.min(1, this.spawnT + dt * 1.8); const s = this.spawnT; this.root.scale.setScalar(s < 0.7 ? s / 0.7 * 1.12 : 1.12 - (s - 0.7) / 0.3 * 0.12); }

    // --- AI ---
    const hx = hero.pos.x - this.pos.x, hz = hero.pos.z - this.pos.z, hd = Math.hypot(hx, hz), nx = hx / (hd || 1), nz = hz / (hd || 1);
    let mx = 0, mz = 0, speed = cfg.speed;
    this.stateT -= dt; this.cool -= dt;
    if (hd < 9.5) this.aggro = true;
    const ranged = this.type === 'mage';
    if (this.state === 'windup' || this.state === 'cast') {
      this.atkT += dt;
      if (this.atkT > cfg.wind) {
        if (ranged) { bolts.fire(this, hero, fx); this.state = 'chase'; this.cool = 2.2 + Math.random() * 1.2; }
        else { this.state = 'lunge'; this.atkT = 0; this.vel.set(nx * cfg.lungeV, nz * cfg.lungeV); }
        if (ranged) this.atkT = 0;
      }
    } else if (this.state === 'lunge') {
      this.atkT += dt;
      if (this.atkT > 0.08 && this.atkT - dt <= 0.08 && hd < cfg.reach + 0.4) hero.takeHit(new THREE.Vector2(nx, nz));
      if (this.atkT > 0.35) { this.state = 'chase'; this.cool = (this.type === 'ghoul' ? 0.7 : 1.4) + Math.random() * 0.8; }
    } else if (this.aggro) {
      this.state = 'chase';
      if (ranged) {
        if (hd < 4.5) { mx = -nx; mz = -nz; speed *= 1.25; } else if (hd > 7.5) { mx = nx; mz = nz; } else { mx = -nz * 0.4; mz = nx * 0.4; }
        if (this.cool <= 0 && hd < 9) { this.state = 'cast'; this.atkT = 0; }
      } else if (hd < cfg.reach + 0.2 && this.cool <= 0) { this.state = 'windup'; this.atkT = 0; }
      else if (hd > cfg.reach * 0.75) { mx = nx; mz = nz; }
    } else {
      this.state = 'idle';
      if (this.stateT <= 0) { const a = Math.random() * 6.283, d = 1.5 + Math.random() * 3; this.target.set(this.pos.x + Math.cos(a) * d, this.pos.z + Math.sin(a) * d); this.stateT = 2 + Math.random() * 3; }
      const tx = this.target.x - this.pos.x, tz = this.target.y - this.pos.z, td = Math.hypot(tx, tz);
      if (td > 0.3) { mx = tx / td * 0.4; mz = tz / td * 0.4; }
    }
    const casting = this.state === 'cast';
    const want = new THREE.Vector2(mx * speed, mz * speed).multiplyScalar(casting ? 0.2 : 1);
    if (this.state !== 'lunge') this.vel.lerp(want, 1 - Math.exp(-8 * dt)); else this.vel.multiplyScalar(Math.exp(-6 * dt));
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.y * dt;

    for (const o of mobs) if (o !== this && !o.dead) {
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, d = Math.hypot(dx, dz), m = cfg.r + o.cfg.r;
      if (d < m && d > 1e-4) { const p = (m - d) * 0.5; this.pos.x += dx / d * p; this.pos.z += dz / d * p; }
    }
    if (hd < cfg.r + 0.4 && hd > 1e-4) { const p = cfg.r + 0.4 - hd; this.pos.x -= nx * p; this.pos.z -= nz * p; }
    for (const c of colliders) { const dx = this.pos.x - c.x, dz = this.pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + cfg.r; if (d < m && d > 1e-4) { this.pos.x += dx / d * (m - d); this.pos.z += dz / d * (m - d); } }
    const rr = Math.hypot(this.pos.x, this.pos.z); if (rr > ARENA) { this.pos.x *= ARENA / rr; this.pos.z *= ARENA / rr; }

    const face = this.state === 'idle' ? Math.atan2(this.vel.x, this.vel.y) : Math.atan2(hx, hz);
    if (this.vel.lengthSq() > 0.05 || this.state !== 'idle') { let d = face - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * (1 - Math.exp(-10 * dt)); }
    this.root.rotation.y = this.yaw;
    this.pos.y = heightAt(this.pos.x, this.pos.z);

    // --- animation ---
    const sp = this.vel.length(), t = this.t, w = Math.min(sp / 1.6, 1);
    const wu = (this.state === 'windup' || this.state === 'cast') ? Math.min(this.atkT / cfg.wind, 1) : 0, lu = this.state === 'lunge' ? 1 - Math.min(this.atkT / 0.35, 1) : 0;
    this.squash = Math.max(0, this.squash - dt * 4);
    const sq = Math.sin(this.squash * Math.PI) * 0.18;
    if (this.type === 'skel') {
      const ph = t * (4.5 + sp * 1.8), s = Math.sin(ph);
      this.legL.rotation.x = s * 0.75 * w; this.legR.rotation.x = -s * 0.75 * w;
      this.body.position.y = 0.85 + Math.abs(Math.cos(ph)) * 0.04 * w + Math.sin(t * 3) * 0.01;
      this.body.rotation.z = Math.sin(ph) * 0.07 * w; this.body.rotation.x = 0.08 * w - wu * 0.3 + lu * 0.4;
      this.head.rotation.z = Math.sin(t * 2.1) * 0.1; this.head.rotation.x = -wu * 0.25;
      this.armL.rotation.x = -s * 0.5 * w - 0.2 - wu * 0.4; this.armL.rotation.z = 0.15;
      this.armR.rotation.x = s * 0.5 * w - 0.2 - wu * 2.5 + lu * 2.7; this.armR.rotation.z = -0.2;
      this.rig.scale.set(1 + sq, 1 - sq, 1 + sq);
    } else if (this.type === 'ghoul') {
      const ph = t * (7 + sp * 1.6), s = Math.sin(ph);
      this.legL.rotation.x = s * 0.9 * w; this.legR.rotation.x = -s * 0.9 * w;
      this.body.rotation.x = 0.6 + 0.08 * w + wu * 0.4 - lu * 0.5; this.body.position.y = 0.78 + Math.abs(Math.cos(ph)) * 0.06 * w - wu * 0.15;
      this.body.rotation.z = Math.sin(ph) * 0.1 * w;
      this.head.rotation.x = -0.45 - wu * 0.2; this.head.rotation.z = Math.sin(t * 2.4) * 0.08;
      this.armL.rotation.x = -s * 0.9 * w - 0.5 - wu * 1.3 + lu * 1.8; this.armR.rotation.x = s * 0.9 * w - 0.5 - wu * 1.3 + lu * 1.8;
      this.armL.rotation.z = 0.2 + wu * 0.2; this.armR.rotation.z = -0.2 - wu * 0.2;
      this.rig.scale.set(1 + sq, 1 - sq, 1 + sq);
    } else {
      const c = this.casting = casting ? wu : Math.max(0, (this.casting || 0) - dt * 4);
      this.rig.position.y = 0.35 + Math.sin(t * 2.1) * 0.08 + c * 0.2;
      this.body.rotation.x = 0.06 + w * 0.08 - c * 0.2; this.body.rotation.z = Math.sin(t * 1.3) * 0.04;
      this.head.rotation.x = -c * 0.15; this.head.rotation.z = Math.sin(t * 1.7) * 0.06;
      this.armR.rotation.set(-0.25 - c * 1.3, 0, -0.2); this.armL.rotation.set(-0.3 - c * 1.0, 0, 0.3 + c * 0.4);
      this.staff.rotation.x = 0.1;
      this.orb.scale.setScalar(1 + c * 1.6 + Math.sin(t * 6) * 0.08);
      this.rig.scale.set(1 + sq, 1 - sq, 1 + sq);
    }

    // telegraph: ground decal + pulsing flash on wind-up, white flash on hit
    this.flash = Math.max(0, this.flash - dt * 6);
    const T = this.tele;
    if (wu > 0) {
      T.m.visible = true; T.m.position.set(this.pos.x, this.pos.y + 0.06, this.pos.z);
      const rad = ranged ? 1.1 + wu * 1.2 : cfg.reach + 0.35; T.m.scale.set(rad, 1, rad);
      T.mat.opacity = 0.25 + wu * 0.45; T.mat.color.set(ranged ? PAL.abyss : 0xff3a2a);
      if (!ranged) T.m.rotation.y = this.yaw;
    } else T.m.visible = false;
    if (this.flash > 0) { this.mat.userData.flashColor.value.set(1, 1, 1); this.mat.userData.flash.value = this.flash; }
    else if (wu > 0) { this.mat.userData.flashColor.value.set(ranged ? 0.7 : 1, ranged ? 0.4 : 0.15, ranged ? 1 : 0.1); this.mat.userData.flash.value = 0.25 + Math.sin(wu * 22) * 0.15; }
    else this.mat.userData.flash.value = 0;

    const lift = ranged ? this.rig.position.y : 0;
    this.shadow.position.set(this.pos.x, this.pos.y + 0.03, this.pos.z);
    this.shadow.scale.setScalar(this.root.scale.x * (1 - Math.min(lift, 1) * 0.3));
  }

  // the dead climb back out of the gate
  respawn(hero, fx) {
    for (let k = 0; k < 12; k++) {
      const w = toWorld((Math.random() - 0.5) * 3, 1.3 + Math.random() * 0.8);
      if (Math.hypot(w.x - hero.pos.x, w.z - hero.pos.z) < 4) continue;
      this.spawn(w.x, w.z, false); fx.puff(this.pos, 5, 0x6b3fd0, 0.3); fx.ring(this.pos, PAL.abyss, 1.4); fx.burst(this.pos, PAL.abyss, 14, 3, 1.2, 1.6); return;
    }
    this.dead = 2.8;
  }
}

// abyss bolts fired by the mage (pooled)
class Bolts {
  constructor(scene) {
    this.list = [];
    const g = new THREE.SphereGeometry(0.2, 10, 8);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xd9c4ff }));
      const halo = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: PAL.abyssD, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(2.1); m.add(halo); m.visible = false; scene.add(m);
      this.list.push({ m, v: new THREE.Vector3(), life: 0 });
    }
  }
  fire(mob, hero, fx) {
    const b = this.list.find(x => x.life <= 0); if (!b) return;
    const o = new THREE.Vector3(mob.pos.x, mob.pos.y + 1.9, mob.pos.z).addScaledVector(new THREE.Vector3(Math.sin(mob.yaw), 0, Math.cos(mob.yaw)), 0.45);
    b.m.position.copy(o); b.m.visible = true; b.life = 2.6;
    b.v.set(hero.pos.x - o.x, hero.pos.y + 1.2 - o.y, hero.pos.z - o.z).normalize().multiplyScalar(7.5);
    fx.burst(o, PAL.abyss, 8, 3, 1.1); fx.ring({ x: o.x, y: mob.pos.y, z: o.z }, PAL.abyss, 1.3);
  }
  update(dt, hero, fx) {
    for (const b of this.list) {
      if (b.life <= 0) continue;
      b.life -= dt; b.m.position.addScaledVector(b.v, dt); b.m.scale.setScalar(1 + Math.sin(b.life * 30) * 0.12);
      fx.burst(b.m.position, PAL.abyss, 1, 0.6, 0.8, 0.2);
      const dx = b.m.position.x - hero.pos.x, dz = b.m.position.z - hero.pos.z, dy = b.m.position.y - hero.pos.y;
      if (Math.hypot(dx, dz) < 0.65 && dy > 0 && dy < 2.2) {
        hero.takeHit(new THREE.Vector2(b.v.x, b.v.z).normalize()); fx.burst(b.m.position, 0xd9c4ff, 14, 4, 1.2); fx.ring({ x: hero.pos.x, y: hero.pos.y + 0.8, z: hero.pos.z }, PAL.abyss, 1.4); b.life = 0;
      }
      if (b.life <= 0) b.m.visible = false;
    }
  }
}

export class Mobs {
  constructor(scene, fx) {
    this.fx = fx; this.bolts = new Bolts(scene);
    this.olMat = outline({ width: 0.026, color: 0x07050f });
    this.list = [];
    const telGeo = new THREE.CircleGeometry(1, 28); telGeo.rotateX(-Math.PI / 2);
    const plan = [['skel', -2.4, 2.0], ['ghoul', 2.8, 2.6], ['mage', 0.2, 1.2], ['skel', -7, 4.2], ['ghoul', 7.2, 5.5], ['mage', 5.6, 2.2]];
    plan.forEach(([type, lx, lz], i) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
      const m = new THREE.Mesh(telGeo, mat); m.visible = false; m.renderOrder = 2; m.userData.noOutline = true;
      const mob = new Mob(scene, type, this.olMat, { m, mat }), w = toWorld(lx, lz);
      mob.spawn(w.x, w.z, i >= 3); this.list.push(mob);
    });
  }
  nearest(p, maxD) {
    let best = null, bd = maxD;
    for (const m of this.list) if (!m.dead && m.spawnT >= 1) { const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  slash(p, yaw, range = 2.5, arc = 1.25) {
    let n = 0;
    for (const m of this.list) {
      if (m.dead) continue;
      const dx = m.pos.x - p.x, dz = m.pos.z - p.z, d = Math.hypot(dx, dz);
      if (d > range + m.cfg.r) continue;
      let da = Math.atan2(dx, dz) - yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > arc && d > 0.9) continue;
      if (m.hit(new THREE.Vector2(dx / (d || 1), dz / (d || 1)), this.fx)) {
        n++; const c = HIT[m.type]; this.fx.burst({ x: m.pos.x, y: m.pos.y + 0.8, z: m.pos.z }, c, 12, 5, 1); this.fx.burst({ x: m.pos.x, y: m.pos.y + 0.8, z: m.pos.z }, 0xffffff, 5, 2.4, 1.7);
        this.fx.burst({ x: m.pos.x, y: m.pos.y + 0.8, z: m.pos.z }, PAL.brass, 3, 3, 1);
      }
    }
    return n;
  }
  update(dt, hero, colliders) { for (const m of this.list) m.update(dt, hero, this.list, colliders, this.fx, this.bolts); this.bolts.update(dt, hero, this.fx); }
  blobs() { return this.list.filter(m => !m.dead).map(m => ({ x: m.pos.x, z: m.pos.z, r: m.cfg.r * 1.4, w: 1 })); }
  setOutlines(on) { this.olMat.visible = on; }
}
