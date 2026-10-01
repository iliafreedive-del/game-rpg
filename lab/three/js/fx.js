// Combat juice: sword slash arcs, hit sparks, death puffs, shock rings. All pooled, no allocations per frame.
import * as THREE from '../vendor/three.module.min.js';

const SLASH_VS = /* glsl */`varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SLASH_FS = /* glsl */`uniform float uProg; uniform float uFade; uniform float uStart; uniform float uLen; uniform vec3 uColor; varying vec2 vP;
void main(){
  float a = (atan(vP.y, vP.x) - uStart) / uLen;          // 0..1 along the arc
  float r = (length(vP) - 0.55) / (1.85 - 0.55);          // 0..1 across
  float head = uProg;
  float trail = smoothstep(head - 0.75, head, a) * step(a, head);
  float band = smoothstep(0.0, 0.35, r) * (1.0 - smoothstep(0.75, 1.0, r));
  float core = smoothstep(0.55, 0.95, r) * (1.0 - smoothstep(0.95, 1.0, r));
  float al = trail * band * uFade;
  vec3 c = mix(uColor, vec3(1.0), core * 0.8);
  gl_FragColor = vec4(c * al, al);
}`;

export class FX {
  constructor(scene) {
    this.scene = scene;
    // slash arcs
    this.slashes = [];
    for (let i = 0; i < 4; i++) {
      const start = -1.15, len = 2.3;
      const g = new THREE.RingGeometry(0.55, 1.85, 28, 1, start, len);
      const m = new THREE.ShaderMaterial({
        uniforms: { uProg: { value: 0 }, uFade: { value: 1 }, uStart: { value: start }, uLen: { value: len }, uColor: { value: new THREE.Color(0x9ee8ff) } },
        vertexShader: SLASH_VS, fragmentShader: SLASH_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(g, m); mesh.visible = false; mesh.renderOrder = 5;
      const holder = new THREE.Group(); holder.add(mesh); scene.add(holder);
      this.slashes.push({ holder, mesh, t: 1 });
    }
    // sparks (points)
    this.N = 220;
    const g = new THREE.BufferGeometry();
    this.sp = new Float32Array(this.N * 3); this.sv = new Float32Array(this.N * 3); this.sl = new Float32Array(this.N); this.sc = new Float32Array(this.N * 3); this.ss = new Float32Array(this.N);
    g.setAttribute('position', new THREE.BufferAttribute(this.sp, 3));
    g.setAttribute('aLife', new THREE.BufferAttribute(this.sl, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.sc, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.ss, 1));
    this.sparkMat = new THREE.ShaderMaterial({
      uniforms: { uPR: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`attribute float aLife; attribute vec3 aColor; attribute float aSize; uniform float uPR; varying float vL; varying vec3 vC;
        void main(){ vL = aLife; vC = aColor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aLife > 0.0 ? uPR * aSize * (0.4 + aLife) * 60.0 / -mv.z : 0.0; }`,
      fragmentShader: /* glsl */`varying float vL; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * min(vL * 2.0, 1.0); gl_FragColor = vec4(mix(vC, vec3(1.0), smoothstep(0.25,0.0,d)*0.7) * a, a); }`,
    });
    this.points = new THREE.Points(g, this.sparkMat); this.points.frustumCulled = false; scene.add(this.points);
    this.si = 0;
    // puffs
    this.puffs = [];
    const pg = new THREE.IcosahedronGeometry(0.14, 1);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
      m.visible = false; scene.add(m); this.puffs.push({ m, t: 1, v: new THREE.Vector3(), life: 0.6 });
    }
    this.pi = 0;
    // rings
    this.rings = [];
    const rg = new THREE.RingGeometry(0.8, 1, 32); rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.visible = false; scene.add(m); this.rings.push({ m, t: 1 });
    }
    this.ri = 0;
  }

  slash(p, yaw, dir) {
    const s = this.slashes.find(x => x.t >= 1) || this.slashes[0];
    s.t = 0; s.mesh.visible = true;
    s.holder.position.set(p.x, p.y + 0.55, p.z);
    s.holder.rotation.set(0, yaw, 0);
    // ring lies in XY; tilt it into a slightly diagonal plane in front of the hero, mirrored for backhand swings
    s.mesh.rotation.set(-Math.PI / 2 + 0.25 * dir, 0, -Math.PI / 2);
    s.mesh.scale.set(1, dir, 1);
  }

  burst(p, color, n, speed = 4, size = 1, up = 0.6) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const k = this.si = (this.si + 1) % this.N, a = Math.random() * Math.PI * 2, e = Math.random() * up + 0.1, v = speed * (0.4 + Math.random() * 0.8);
      this.sp.set([p.x, p.y + 0.5, p.z], k * 3);
      this.sv.set([Math.cos(a) * v * Math.cos(e), Math.sin(e) * v + 1.5, Math.sin(a) * v * Math.cos(e)], k * 3);
      this.sl[k] = 0.35 + Math.random() * 0.35; this.ss[k] = size * (0.6 + Math.random() * 0.8);
      this.sc.set([c.r, c.g, c.b], k * 3);
    }
  }

  puff(p, n, color = 0xffffff, y = 0.35) {
    for (let i = 0; i < n; i++) {
      const q = this.puffs[this.pi = (this.pi + 1) % this.puffs.length];
      q.t = 0; q.life = 0.45 + Math.random() * 0.35; q.m.visible = true; q.m.material.color.set(color);
      q.m.position.set(p.x + (Math.random() - .5) * 0.5, p.y + y + Math.random() * 0.3, p.z + (Math.random() - .5) * 0.5);
      q.v.set((Math.random() - .5) * 2.2, 0.8 + Math.random() * 1.2, (Math.random() - .5) * 2.2);
      q.s = 0.6 + Math.random() * 0.8;
    }
  }

  ring(p, color = 0xffffff, size = 1.5) {
    const r = this.rings[this.ri = (this.ri + 1) % this.rings.length];
    r.t = 0; r.size = size; r.m.visible = true; r.m.material.color.set(color); r.m.position.set(p.x, p.y + 0.06, p.z);
  }

  hit(p, type, y) {
    const col = type === 'slime' ? 0xb6ff8a : type === 'bat' ? 0xd2a8ff : 0xffe2a8;
    this.burst({ x: p.x, y: p.y + y - 0.5, z: p.z }, col, 10, 4.5, 1);
    this.burst({ x: p.x, y: p.y + y - 0.5, z: p.z }, 0xffffff, 4, 2, 1.6);
  }

  death(p, type) {
    const col = type === 'slime' ? 0x8dff7a : type === 'bat' ? 0xb48cff : 0xf0e6d0;
    this.puff(p, 6, type === 'slime' ? 0xc8ffb0 : 0xe8e2f2);
    this.burst(p, col, 22, 5, 1.2, 1.2);
    this.burst(p, 0xffd25a, 8, 3, 1.2, 1.4);   // "gold coins"
    this.ring(p, col, 1.1);
  }

  update(dt) {
    for (const s of this.slashes) {
      if (s.t >= 1) continue;
      s.t = Math.min(1, s.t + dt / 0.22);
      const u = s.mesh.material.uniforms;
      u.uProg.value = Math.min(1.25, s.t * 1.8);
      u.uFade.value = 1 - Math.max(0, (s.t - 0.5) / 0.5);
      if (s.t >= 1) s.mesh.visible = false;
    }
    for (let k = 0; k < this.N; k++) {
      if (this.sl[k] <= 0) continue;
      this.sl[k] -= dt;
      this.sv[k * 3 + 1] -= 9 * dt;
      for (let a = 0; a < 3; a++) this.sp[k * 3 + a] += this.sv[k * 3 + a] * dt;
      if (this.sp[k * 3 + 1] < 0.05) { this.sp[k * 3 + 1] = 0.05; this.sv[k * 3 + 1] *= -0.3; this.sv[k * 3] *= 0.6; this.sv[k * 3 + 2] *= 0.6; }
    }
    const ga = this.points.geometry.attributes;
    ga.position.needsUpdate = ga.aLife.needsUpdate = ga.aColor.needsUpdate = ga.aSize.needsUpdate = true;
    for (const q of this.puffs) {
      if (q.t >= 1) continue;
      q.t = Math.min(1, q.t + dt / q.life);
      q.m.position.addScaledVector(q.v, dt); q.v.multiplyScalar(Math.exp(-3 * dt));
      q.m.scale.setScalar(q.s * (0.5 + q.t * 1.1));
      q.m.material.opacity = 0.7 * (1 - q.t);
      if (q.t >= 1) q.m.visible = false;
    }
    for (const r of this.rings) {
      if (r.t >= 1) continue;
      r.t = Math.min(1, r.t + dt / 0.4);
      r.m.scale.setScalar(0.2 + r.t * r.size); r.m.material.opacity = 1 - r.t;
      if (r.t >= 1) r.m.visible = false;
    }
  }
}
