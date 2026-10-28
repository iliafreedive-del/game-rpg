// Склон, лес, ворота, след доски, снежная пыль и камера.
import * as THREE from 'three';
import { HORIZON, SUN_DIR, terrainH, snowTint, oldTracks, resortProps, snowTextures, buildForest, makeBackdrop, sprayTexture, starGeo, glowTexture, finishBanner } from './art/scenery.js';

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
    const sky = new THREE.Color(HORIZON);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky, 50, 480);
    this.frame = new SlopeFrame(12);

    const hemi = new THREE.HemisphereLight('#d6e8ff', '#7f93b3', 1.15);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff1dc', 2.35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
    this.sun = sun; this.scene.add(sun, sun.target);

    this.slopeGroup = new THREE.Group();
    this.scene.add(this.slopeGroup);
    this.snow = snowTextures();
    this.snowTex = this.snow.piste;
    this.backdrop = makeBackdrop();
    this.scene.add(this.backdrop);
    this.gatesGroup = new THREE.Group();
    this.markGroup = new THREE.Group();
    this.slopeGroup.add(this.gatesGroup, this.markGroup);
    this.starGroup = new THREE.Group(); this.finishGroup = new THREE.Group();
    this.scene.add(this.starGroup, this.finishGroup);
    this.trail = new Trail(this);
    this.spray = new Spray(this);
    this.scene.add(this.trail.mesh, this.spray.points);
  }

  build(deg) {
    this.trail.clear(); this.spray.clear();
    if (this.builtDeg === deg) return;
    this.builtDeg = deg;
    this.frame.set(deg);
    // горы фона стоят на продолжении склона — пересобираем под его крутизну
    this.scene.remove(this.backdrop);
    this.backdrop.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    this.backdrop = makeBackdrop(1, deg);
    this.scene.add(this.backdrop);
    this.slopeGroup.traverse((o) => { if (o.isInstancedMesh) o.dispose(); else if (o.isMesh && o.parent !== this.gatesGroup) o.geometry.dispose(); });
    const f = this.frame;
    for (const ch of [...this.slopeGroup.children]) if (ch !== this.gatesGroup && ch !== this.markGroup) this.slopeGroup.remove(ch);
    // поверхность: ровная трасса в вельвете и целина по краям (бровка, бугры, стены долины)
    const S0 = -420, S1 = 1400, ns = 420;
    const strip = (us, mat) => {
      const g = new THREE.PlaneGeometry(1, 1, us.length - 1, ns);
      const pos = g.attributes.position, uv = g.attributes.uv, v = new THREE.Vector3(), c = new THREE.Color();
      const col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const j = i % us.length, u = us[j], s = S1 - (Math.floor(i / us.length) / ns) * (S1 - S0);
        f.p(u, s, terrainH(u, s), v); pos.setXYZ(i, v.x, v.y, v.z);
        uv.setXY(i, u / 6, s / 6);
        snowTint(u, s, c).toArray(col, i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true;
      this.slopeGroup.add(m);
    };
    const offU = [22];
    for (let u = 22.5; u < 230; u += u < 27 ? 0.5 : u < 40 ? 1.3 : u < 90 ? 4 : 10) offU.push(u);
    const powder = new THREE.MeshStandardMaterial({ map: this.snow.powder, roughness: 0.96, color: '#f6f9fd', vertexColors: true });
    const pisteU = [];
    for (let u = -22; u <= 22.001; u += 0.55) pisteU.push(u);
    strip(pisteU, new THREE.MeshStandardMaterial({ map: this.snow.piste, bumpMap: this.snow.bump, bumpScale: 0.6, roughness: 0.9, vertexColors: true }));
    this.slopeGroup.add(oldTracks(f, S0 + 100, S1));
    strip(offU, powder);
    strip(offU.map((u) => -u).reverse(), powder);

    // лес — кусками по 100 м, дальние куски скрываются (иначе в тумане они «светятся» на фоне гор)
    this.chunks = buildForest(f, S0, S1);
    for (const c of this.chunks) this.slopeGroup.add(c);
    // подъёмник и защитные сетки
    this.props = resortProps(f, S0, S1);
    this.slopeGroup.add(this.props.group);
    const m = new THREE.Matrix4(), sc = new THREE.Vector3();

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
  // Звёзды трассы: крутятся и покачиваются над снегом; собранная — вспыхивает и исчезает
  setStars(list) {
    for (const ch of [...this.starGroup.children]) this.starGroup.remove(ch);
    this.stars = [];
    if (!list) return;
    this.starMat ||= new THREE.MeshStandardMaterial({ color: '#ffcf3a', emissive: '#ff9f00', emissiveIntensity: 0.45, metalness: 0.35, roughness: 0.3 });
    this.glowMat ||= new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffd76a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    this.starG ||= starGeo();
    const f = this.frame;
    this.stars = list.map((p, i) => {
      const g = new THREE.Group();
      g.position.copy(f.p(p.u, p.s, 0)).add(new THREE.Vector3(0, 1.05, 0));
      const m = new THREE.Mesh(this.starG, this.starMat); m.castShadow = true;
      const glow = new THREE.Sprite(this.glowMat); glow.scale.setScalar(1.5);
      g.add(glow, m);
      g.userData = { base: g.position.y, ph: i * 0.7, got: null };
      this.starGroup.add(g);
      return g;
    });
  }
  collectStar(i, t) { const g = this.stars?.[i]; if (g && g.userData.got == null) g.userData.got = t; }
  updateStars(t) {
    for (const g of this.stars || []) {
      const d = g.userData, m = g.children[1];
      if (d.got != null) {
        const k = (t - d.got) / 0.4;
        g.visible = k < 1;
        g.scale.setScalar(1 + k * 0.9); g.position.y = d.base + k * 0.8; m.rotation.y += 0.4;
        continue;
      }
      m.rotation.y = t * 2.2 + d.ph; g.position.y = d.base + Math.sin(t * 2.4 + d.ph) * 0.12;
    }
  }
  // Финишная арка поперёк трассы
  setFinish(s) {
    for (const ch of [...this.finishGroup.children]) this.finishGroup.remove(ch);
    if (s == null) return;
    const f = this.frame, g = new THREE.Group();
    const post = new THREE.CylinderGeometry(0.16, 0.2, 4.2, 10); post.translate(0, 2.1, 0);
    const pm = new THREE.MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.5 });
    for (const u of [-11, 11]) { const m = new THREE.Mesh(post, pm); m.position.copy(f.p(u, s)); m.castShadow = true; g.add(m); }
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(22, 1.4), new THREE.MeshStandardMaterial({ map: finishBanner(), side: THREE.DoubleSide, roughness: 0.6 }));
    ban.position.copy(f.p(0, s)).add(new THREE.Vector3(0, 3.7, 0));
    g.add(ban);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(22, 0.5), new THREE.MeshBasicMaterial({ color: '#111827', transparent: true, opacity: 0.55, depthWrite: false }));
    line.position.copy(f.p(0, s, 0.02)); line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.N);
    g.add(line);
    this.finishGroup.add(g);
  }
  highlightTarget(i) {
    (this.targetMeshes || []).forEach((g, k) => { g.visible = k >= i; g.traverse((o) => { if (o.material) o.material.color?.set(k === i ? '#f59e0b' : '#94a3b8'); }); });
  }

  follow(target, s = null, t = 0) {
    if (this.props) this.props.update(t);
    if (s != null && this.chunks) for (const c of this.chunks) c.visible = Math.abs(c.userData.s - s) < (c.userData.cull || 330);
    this.sun.position.copy(target).addScaledVector(SUN_DIR, 36);
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
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', map: sprayTexture(), size: 0.13, transparent: true, opacity: 0.9, depthWrite: false }));
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
export const CAM_NAMES = { follow: 'Сзади', side: 'Сбоку (носки)', front: 'Спереди', top: 'Сверху', profile: 'Профиль', front3: 'Спереди-сбоку' };

const finite = (v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

export class CameraRig {
  constructor(camera) { this.cam = camera; this.mode = 'follow'; this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.init = false; this.orbit = 0; }
  update(dt, target, travel, toeDir, N, opts = {}) {
    const up = new THREE.Vector3(0, 1, 0);
    if (!finite(travel) || travel.lengthSq() < 1e-6) travel = N.clone().cross(up).cross(N).normalize().negate();
    // узкий экран телефона — отходим дальше, чтобы райдер влез; в демонстрации — ближе, чтобы было видно колени и кант
    const z = (this.cam.aspect < 1 ? 1.5 : 1) * (opts.zoom || 1);
    const t = target.clone().addScaledVector(up, 0.9);
    let p, l = t.clone();
    const mode = opts.mode || this.mode;
    if (mode === 'follow') { p = t.clone().addScaledVector(travel, -6.2 * z).addScaledVector(up, 2.2); l.addScaledVector(travel, (opts.lookAhead ?? 3) * z); }
    else if (mode === 'side') { p = t.clone().addScaledVector(toeDir, 5.2 * z).addScaledVector(up, 0.6).addScaledVector(travel, 1 * z); }
    else if (mode === 'profile' || mode === 'front3') {
      // всегда с одной стороны от траектории, чтобы камера не перепрыгивала при смене канта
      const perp = new THREE.Vector3().crossVectors(up, travel).normalize();
      p = mode === 'profile'
        ? t.clone().addScaledVector(perp, 5.5 * z).addScaledVector(up, 0.5).addScaledVector(travel, 0.8 * z)
        : t.clone().addScaledVector(travel, 4.6 * z).addScaledVector(perp, 3.2 * z).addScaledVector(up, 1.3);
      l.addScaledVector(up, -0.1); // смотрим чуть ниже пояса — доска и колени ближе к центру кадра
    }
    else if (mode === 'front') { p = t.clone().addScaledVector(travel, 6 * z).addScaledVector(up, 1.2); }
    else if (mode === 'top') { p = t.clone().addScaledVector(N, 16).addScaledVector(travel, -3 * z); l = target.clone().addScaledVector(travel, 2 * z); }
    else if (mode === 'orbit') {
      this.orbit += dt * 0.5;
      const d = new THREE.Vector3(Math.cos(this.orbit), 0, Math.sin(this.orbit));
      p = t.clone().addScaledVector(d, 4.5).addScaledVector(up, 1.6); l = target.clone().addScaledVector(up, 0.4);
    }
    if (!finite(p) || !finite(l)) return; // испорченная цель — не трогаем камеру
    const k = this.init ? 1 - Math.exp(-Math.max(0, dt) * (mode === 'top' ? 3 : 5)) : 1;
    const kl = this.init ? 1 - Math.exp(-Math.max(0, dt) * (mode === 'top' ? 3 : 14)) : 1; // точка взгляда догоняет быстрее, иначе на скорости райдер уезжает к краю кадра
    // lerp не вылечит NaN в самой камере (NaN + x = NaN) — тогда просто ставим камеру на место
    if (!this.init || !finite(this.pos) || !finite(this.look)) { this.pos.copy(p); this.look.copy(l); }
    else { this.pos.lerp(p, k); this.look.lerp(l, kl); }
    this.init = true;
    this.cam.position.copy(this.pos);
    this.cam.up.set(0, 1, 0);
    this.cam.lookAt(this.look);
  }
}
