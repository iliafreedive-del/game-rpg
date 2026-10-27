// Склон, лес, ворота, след доски, снежная пыль и камера.
import * as THREE from 'three';

const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

function snowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#f4f8fc'; x.fillRect(0, 0, 256, 256);
  // «вельвет» после ратрака
  for (let i = 0; i < 256; i += 4) { x.fillStyle = i % 8 ? '#eaf0f7' : '#f7fafd'; x.fillRect(i, 0, 2, 256); }
  const img = x.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 14; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export class SlopeFrame {
  constructor(deg) { this.set(deg); }
  set(deg) {
    const a = deg * Math.PI / 180; this.alpha = a;
    this.U = new THREE.Vector3(1, 0, 0);
    this.D = new THREE.Vector3(0, -Math.sin(a), -Math.cos(a));
    this.N = new THREE.Vector3(0, Math.cos(a), -Math.sin(a));
  }
  p(u, s, h = 0, out = new THREE.Vector3()) { return out.set(0, 0, 0).addScaledVector(this.U, u).addScaledVector(this.D, s).addScaledVector(this.N, h); }
  dir(du, ds, out = new THREE.Vector3()) { return out.set(0, 0, 0).addScaledVector(this.U, du).addScaledVector(this.D, ds); }
}

export class World {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    const sky = new THREE.Color('#a9d3f5');
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky, 60, 360);
    this.frame = new SlopeFrame(12);

    const hemi = new THREE.HemisphereLight('#dceeff', '#8aa0b8', 1.35);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff4e0', 2.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
    this.sun = sun; this.scene.add(sun, sun.target);

    this.slopeGroup = new THREE.Group();
    this.scene.add(this.slopeGroup);
    this.snowTex = snowTexture();
    this.backdrop = this.makeBackdrop();
    this.scene.add(this.backdrop);
    this.gatesGroup = new THREE.Group();
    this.markGroup = new THREE.Group();
    this.slopeGroup.add(this.gatesGroup, this.markGroup);
    this.trail = new Trail(this);
    this.spray = new Spray(this);
    this.scene.add(this.trail.mesh, this.spray.points);
  }

  build(deg) {
    this.trail.clear(); this.spray.clear();
    if (this.builtDeg === deg) return;
    this.builtDeg = deg;
    this.frame.set(deg);
    this.slopeGroup.traverse((o) => { if (o.isMesh && o.parent !== this.gatesGroup) o.geometry.dispose(); });
    const f = this.frame;
    for (const ch of [...this.slopeGroup.children]) if (ch !== this.gatesGroup && ch !== this.markGroup) this.slopeGroup.remove(ch);
    // поверхность
    const W = 160, S0 = -60, S1 = 1400, nu = 40, ns = 300;
    const g = new THREE.PlaneGeometry(1, 1, nu, ns);
    const pos = g.attributes.position, uv = g.attributes.uv;
    const col = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) * W, s = S0 + (pos.getY(i) + 0.5) * (S1 - S0);
      const off = Math.max(0, Math.abs(u) - 22);
      const h = off > 0 ? (Math.sin(u * 0.35) * Math.cos(s * 0.27) * 0.35 + Math.sin(s * 0.05 + u * 0.1) * 0.6) * Math.min(1, off / 8) + off * 0.06 : 0;
      f.p(u, s, h, v); pos.setXYZ(i, v.x, v.y, v.z);
      uv.setXY(i, u / 6, s / 6);
      const piste = off > 0 ? 0.93 : 1;
      col[i * 3] = piste * 0.98; col[i * 3 + 1] = piste; col[i * 3 + 2] = 1;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: this.snowTex, vertexColors: true, roughness: 0.92 }));
    ground.receiveShadow = true;
    this.slopeGroup.add(ground);

    // лес — кусками по 100 м, чтобы дальние куски можно было скрыть (иначе в тумане они «светятся» на фоне гор)
    const coneG = new THREE.ConeGeometry(1, 1, 7); coneG.translate(0, 0.5, 0);
    const trunkG = new THREE.CylinderGeometry(0.12, 0.16, 1, 6); trunkG.translate(0, 0.5, 0);
    const folM = new THREE.MeshStandardMaterial({ color: '#2f5d46', roughness: 1, flatShading: true });
    const capM = new THREE.MeshStandardMaterial({ color: '#f2f6fa', roughness: 1, flatShading: true });
    const trunkM = new THREE.MeshStandardMaterial({ color: '#5b4636' });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    this.chunks = [];
    const CH = 100, per = 60;
    for (let c0 = S0; c0 < S1; c0 += CH) {
      const fol = new THREE.InstancedMesh(coneG, folM, per * 2);
      const snowCap = new THREE.InstancedMesh(coneG, capM, per);
      const trunks = new THREE.InstancedMesh(trunkG, trunkM, per);
      fol.castShadow = true;
      for (let i = 0; i < per; i++) {
        const side = i % 2 ? 1 : -1;
        const u = side * (24 + Math.pow(rnd(), 0.7) * 55), s = c0 + rnd() * CH;
        const off = Math.abs(u) - 22;
        const h0 = (Math.sin(u * 0.35) * Math.cos(s * 0.27) * 0.35 + Math.sin(s * 0.05 + u * 0.1) * 0.6) + off * 0.06;
        const base = f.p(u, s, h0 - 0.2);
        const H = 4 + rnd() * 7, R = H * 0.28;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6);
        trunks.setMatrixAt(i, m.compose(base, q, sc.set(1, H * 0.3, 1)));
        fol.setMatrixAt(i * 2, m.compose(base.clone().add(new THREE.Vector3(0, H * 0.2, 0)), q, sc.set(R, H * 0.6, R)));
        fol.setMatrixAt(i * 2 + 1, m.compose(base.clone().add(new THREE.Vector3(0, H * 0.5, 0)), q, sc.set(R * 0.72, H * 0.5, R * 0.72)));
        snowCap.setMatrixAt(i, m.compose(base.clone().add(new THREE.Vector3(0, H * 0.72, 0)), q, sc.set(R * 0.35, H * 0.3, R * 0.35)));
      }
      const g = new THREE.Group(); g.add(fol, snowCap, trunks); g.userData.s = c0 + CH / 2;
      this.chunks.push(g); this.slopeGroup.add(g);
    }

    // вешки границы трассы
    const poleG = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6); poleG.translate(0, 0.8, 0);
    const np = Math.floor((S1 - S0) / 20) * 2;
    const poles = new THREE.InstancedMesh(poleG, new THREE.MeshStandardMaterial({ color: '#f97316' }), np);
    let k = 0;
    for (let s = S0; s < S1 && k < np; s += 20) for (const u of [-20, 20]) { poles.setMatrixAt(k++, m.compose(f.p(u, s), new THREE.Quaternion(), sc.set(1, 1, 1))); }
    this.slopeGroup.add(poles);

    // стартовая линия
    const startG = new THREE.PlaneGeometry(40, 0.12); startG.rotateX(-Math.PI / 2);
    const start = new THREE.Mesh(startG, new THREE.MeshBasicMaterial({ color: '#dc2626', transparent: true, opacity: 0.35 }));
    start.position.copy(f.p(0, 0, 0.02)); start.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.N);
    this.slopeGroup.add(start);

    this.trail.clear(); this.spray.clear();
  }

  makeBackdrop() {
    // Горы рисуются первыми и без буфера глубины: на таком расстоянии точности глубины не хватает (мерцание).
    const g = new THREE.Group();
    const opts = { fog: false, depthWrite: false, depthTest: false };
    const mat = new THREE.MeshBasicMaterial({ color: '#8aa5c0', ...opts });
    const cap = new THREE.MeshBasicMaterial({ color: '#eef4fb', ...opts });
    const list = [];
    for (let i = 0; i < 26; i++) list.push({ a: (i / 26) * Math.PI * 2 + rnd() * 0.2, r: 900 + rnd() * 200, H: 160 + rnd() * 260, rot: rnd() * 3 });
    list.sort((x, y) => y.r - x.r);
    list.forEach(({ a, r, H, rot }, i) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(H * 1.1, H, 5), mat);
      m.position.set(Math.cos(a) * r, H / 2 - 260, Math.sin(a) * r);
      m.rotation.y = rot; m.renderOrder = -1000 + i * 2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(H * 0.38, H * 0.35, 5), cap);
      c.position.y = H * 0.33; c.renderOrder = m.renderOrder + 1; m.add(c);
      g.add(m);
    });
    return g;
  }

  setGates(gates) {
    for (const ch of [...this.gatesGroup.children]) this.gatesGroup.remove(ch);
    if (!gates) return;
    const f = this.frame;
    gates.forEach((gt, i) => {
      const color = i % 2 ? '#2563eb' : '#dc2626';
      for (const sgn of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6), new THREE.MeshStandardMaterial({ color }));
        const p = f.p(gt.u + sgn * gt.w / 2, gt.s);
        pole.position.copy(p).add(new THREE.Vector3(0, 0.9, 0)); pole.castShadow = true;
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }));
        flag.position.copy(p).add(new THREE.Vector3(-sgn * 0.38, 1.45, 0));
        this.gatesGroup.add(pole, flag);
      }
      gt.mesh = null;
    });
  }

  // Цели «падающего листа»: полосы поперёк склона по u
  setTargets(list) {
    for (const ch of [...this.markGroup.children]) this.markGroup.remove(ch);
    if (!list) return;
    const f = this.frame;
    this.targetMeshes = list.map((u) => {
      const g = new THREE.Group();
      const color = '#f59e0b';
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 60), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }));
      line.rotation.x = -Math.PI / 2;
      const holder = new THREE.Group(); holder.add(line);
      holder.position.copy(f.p(u, 30, 0.03)); holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.N);
      // флажки вдоль линии
      for (let s = 0; s <= 60; s += 6) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), new THREE.MeshStandardMaterial({ color }));
        pole.position.copy(f.p(u, s)).add(new THREE.Vector3(0, 0.7, 0));
        g.add(pole);
      }
      g.add(holder);
      this.markGroup.add(g);
      return g;
    });
  }
  highlightTarget(i) {
    (this.targetMeshes || []).forEach((g, k) => { g.visible = k >= i; g.traverse((o) => { if (o.material) o.material.color?.set(k === i ? '#f59e0b' : '#94a3b8'); }); });
  }

  follow(target, s = null) {
    if (s != null && this.chunks) for (const c of this.chunks) c.visible = Math.abs(c.userData.s - s) < 330;
    this.sun.position.copy(target).add(new THREE.Vector3(18, 30, 10));
    this.sun.target.position.copy(target);
    this.backdrop.position.set(target.x, target.y, target.z);
  }
}

// След: лента из четырёхугольников. Широкая и серая — юз, тонкая — карвинг.
class Trail {
  constructor(world) {
    this.world = world; this.N = 4000; this.i = 0; this.last = null;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.N * 18); this.col = new Float32Array(this.N * 18);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.mesh.frustumCulled = false;
  }
  clear() { this.pos.fill(0); this.i = 0; this.last = null; this.mesh.geometry.attributes.position.needsUpdate = true; }
  add(u, s, theta, width, skid) {
    const f = this.world.frame;
    const cur = { u, s, theta, width, skid };
    if (this.last && Math.hypot(u - this.last.u, s - this.last.s) < 0.25) return;
    if (this.last && Math.hypot(u - this.last.u, s - this.last.s) < 3) {
      const a = this.last, b = cur;
      const side = (p) => ({ x: Math.cos(p.theta), y: -Math.sin(p.theta) });
      const sa = side(a), sb = side(b);
      const P = (p, sd, k) => f.p(p.u + sd.x * p.width * k, p.s + sd.y * p.width * k, 0.015);
      const quad = [P(a, sa, -0.5), P(a, sa, 0.5), P(b, sb, 0.5), P(a, sa, -0.5), P(b, sb, 0.5), P(b, sb, -0.5)];
      const o = (this.i % this.N) * 18;
      const c = skid > 0.5 ? [0.66, 0.71, 0.78] : [0.3, 0.42, 0.62];
      quad.forEach((v, k) => { this.pos.set([v.x, v.y, v.z], o + k * 3); this.col.set(c, o + k * 3); });
      this.i++;
      const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    }
    this.last = cur;
  }
}

class Spray {
  constructor(world) {
    this.world = world; this.N = 600; this.k = 0;
    this.p = new Float32Array(this.N * 3); this.v = new Float32Array(this.N * 3); this.life = new Float32Array(this.N);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.09, transparent: true, opacity: 0.9, depthWrite: false }));
    this.points.frustumCulled = false;
  }
  clear() { this.life.fill(0); this.p.fill(0); }
  emit(pos, vel, n) {
    for (let j = 0; j < n; j++) {
      const i = this.k++ % this.N;
      this.p[i * 3] = pos.x + (Math.random() - 0.5) * 0.6; this.p[i * 3 + 1] = pos.y + 0.05; this.p[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.6;
      this.v[i * 3] = vel.x * (0.5 + Math.random()) + (Math.random() - 0.5); this.v[i * 3 + 1] = 1 + Math.random() * 2; this.v[i * 3 + 2] = vel.z * (0.5 + Math.random()) + (Math.random() - 0.5);
      this.life[i] = 0.6 + Math.random() * 0.5;
    }
  }
  update(dt) {
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) { this.p[i * 3 + 1] = -9999; continue; }
      this.life[i] -= dt;
      this.v[i * 3 + 1] -= 6 * dt;
      for (let a = 0; a < 3; a++) this.p[i * 3 + a] += this.v[i * 3 + a] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

// Камера: «сзади», «сбоку», «спереди», «сверху».
export const CAM_MODES = ['follow', 'side', 'front', 'top'];
export const CAM_NAMES = { follow: 'Сзади', side: 'Сбоку', front: 'Спереди', top: 'Сверху' };

export class CameraRig {
  constructor(camera) { this.cam = camera; this.mode = 'follow'; this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.init = false; this.orbit = 0; }
  update(dt, target, travel, toeDir, N, opts = {}) {
    const up = new THREE.Vector3(0, 1, 0);
    const t = target.clone().addScaledVector(up, 0.9);
    let p, l = t.clone();
    const mode = opts.mode || this.mode;
    if (mode === 'follow') { p = t.clone().addScaledVector(travel, -6.2).addScaledVector(up, 2.2); l.addScaledVector(travel, 3); }
    else if (mode === 'side') { p = t.clone().addScaledVector(toeDir, 5.2).addScaledVector(up, 0.6).addScaledVector(travel, 1); }
    else if (mode === 'front') { p = t.clone().addScaledVector(travel, 6).addScaledVector(up, 1.2); }
    else if (mode === 'top') { p = t.clone().addScaledVector(N, 16).addScaledVector(travel, -3); l = target.clone().addScaledVector(travel, 2); }
    else if (mode === 'orbit') {
      this.orbit += dt * 0.5;
      const d = new THREE.Vector3(Math.cos(this.orbit), 0, Math.sin(this.orbit));
      p = t.clone().addScaledVector(d, 4.5).addScaledVector(up, 1.6); l = target.clone().addScaledVector(up, 0.4);
    }
    const k = this.init ? 1 - Math.exp(-dt * (mode === 'top' ? 3 : 5)) : 1;
    this.pos.lerp(p, k); this.look.lerp(l, k); this.init = true;
    this.cam.position.copy(this.pos);
    this.cam.up.set(0, 1, 0);
    this.cam.lookAt(this.look);
  }
}
