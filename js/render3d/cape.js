// Плащ на Verlet-физике (6×9 точек, CPU) и блоб-тень. Перенесено из lab/three/js/hero.js без изменений поведения.
import * as THREE from '../vendor/three.module.min.js';
import { toon } from './toon.js';
import { blobTexture } from './geo.js';

export function blobShadow(size = 1, opacity = 0.42) {
  const g = new THREE.PlaneGeometry(size, size); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0x000000, transparent: true, opacity, depthWrite: false }));
  m.renderOrder = 2; m.userData.noOutline = true;
  return m;
}

export class Cape {
  // o: optional size/collision overrides (the dark demo has a taller hero); defaults reproduce the chibi cape
  constructor(scene, color, o = {}) {
    this.W = 6; this.H = 9; this.len = o.len ?? 0.88;
    this.top = o.top ?? 0.36; this.bottom = o.bottom ?? 0.68;      // width at shoulders → flared hem
    this.R = o.R ?? 0.27; this.back = o.back ?? -0.12; this.bodyTop = o.bodyTop ?? 1.05; this.backMin = o.backMin ?? 0.45;
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
          const cy = Math.min(Math.max(l.y, 0.25), 0.95), dx = l.x, dz = l.z + 0.02, rr = Math.hypot(dx, dz), R = this.R;
          if (rr < R && l.y < this.bodyTop) { l.x = dx / (rr || 1) * R; l.z = dz / (rr || 1) * R - 0.02; moved = true; }
          if (l.z > this.back && l.y > this.backMin) { l.z = this.back; moved = true; }
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

