// 3D graphics on Umbrahold's assets: three.js scene, GLB prop packs, skinned characters with walk clips,
// day/night light, hero torch, a 2D overlay for names, icons and floating text.
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import * as SkeletonUtils from './vendor/SkeletonUtils.js';

export { THREE };
const M = 'assets/models/';
export const V = { renderer: null, scene: null, cam: null, sun: null, hemi: null, torch: null, ov: null, octx: null, W: 0, H: 0, dpr: 1, root: null, low: false };

export function initGfx(canvas, overlay) {
  const low = matchMedia('(pointer:coarse)').matches || innerWidth * innerHeight < 500000;
  V.low = low;
  const r = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance' });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  V.renderer = r; V.scene = new THREE.Scene();
  V.cam = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
  V.hemi = new THREE.HemisphereLight(0xffe9c8, 0x5a4630, 1.2); V.scene.add(V.hemi);
  const s = new THREE.DirectionalLight(0xfff0d8, 2.4); s.castShadow = true;
  const sz = low ? 1024 : 2048; s.shadow.mapSize.set(sz, sz); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.03;
  const c = s.shadow.camera; c.left = -22; c.right = 22; c.top = 22; c.bottom = -22; c.near = 1; c.far = 90;
  V.sun = s; V.scene.add(s); V.scene.add(s.target);
  V.torch = new THREE.PointLight(0xffa050, 0, 14, 1.4); V.scene.add(V.torch);
  V.ov = overlay; V.octx = overlay.getContext('2d');
  resize(); addEventListener('resize', resize);
  if (window.visualViewport) visualViewport.addEventListener('resize', resize);
}
export function resize() {
  V.W = document.documentElement.clientWidth || innerWidth; V.H = document.documentElement.clientHeight || innerHeight;
  V.dpr = Math.min(devicePixelRatio || 1, V.low ? 1.5 : 2);
  V.renderer.setPixelRatio(V.dpr); V.renderer.setSize(V.W, V.H, false);
  V.cam.aspect = V.W / V.H; V.cam.fov = V.W < V.H ? 48 : 36; V.cam.updateProjectionMatrix();
  V.ov.width = Math.round(V.W * V.dpr); V.ov.height = Math.round(V.H * V.dpr);
}

// ---------------------------------------------------------------- moods: day oasis / night ruins
export function setMood(kind) {
  const S = V.scene;
  if (kind === 'day') {
    S.background = new THREE.Color(0xe7c99a); S.fog = new THREE.Fog(0xe7c99a, 34, 80);
    V.hemi.color.set(0xfff0d6); V.hemi.groundColor.set(0x7a5a38); V.hemi.intensity = 1.25;
    V.sun.color.set(0xffe2b8); V.sun.intensity = 2.6; V.renderer.toneMappingExposure = 1.05;
  } else {
    S.background = new THREE.Color(0x0b0a16); S.fog = new THREE.Fog(0x0b0a16, 12, 38);
    V.hemi.color.set(0x5560a0); V.hemi.groundColor.set(0x1a1410); V.hemi.intensity = 0.32;
    V.sun.color.set(0x8fa0ff); V.sun.intensity = 0.35; V.renderer.toneMappingExposure = 1.15;
  }
}

// ---------------------------------------------------------------- ground
function noiseTex(base, spots, size = 512, rep = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (const [col, n, r0, r1, a] of spots) for (let i = 0; i < n; i++) {
    const px = rnd() * size, py = rnd() * size, r = r0 + rnd() * (r1 - r0);
    const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    x.fillStyle = g; for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { x.save(); x.translate(ox, oy); x.fillRect(px - r, py - r, r * 2, r * 2); x.restore(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function ground(w, h, kind) {
  const tex = kind === 'day'
    ? noiseTex('#c9a573', [['rgba(150,110,70,A)', 90, 10, 50, 0.35], ['rgba(230,200,150,A)', 90, 8, 40, 0.35], ['rgba(110,90,50,A)', 300, 1, 3, 0.6], ['rgba(120,130,60,A)', 30, 10, 30, 0.25]], 512, w / 8)
    : noiseTex('#3c3530', [['rgba(20,16,14,A)', 90, 10, 50, 0.45], ['rgba(90,80,70,A)', 80, 8, 30, 0.3], ['rgba(10,8,6,A)', 300, 1, 3, 0.7]], 512, w / 8);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w + 120, h + 120), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
  tex.repeat.set((w + 120) / 8, (h + 120) / 8);
  m.rotation.x = -Math.PI / 2; m.position.set(w / 2, 0, h / 2); m.receiveShadow = true; m.userData.ground = true;
  return m;
}
// a path or plaza painted as a flat decal
export function patch(x, z, rx, rz, color, rot = 0, opacity = 0.55) {
  const g = new THREE.CircleGeometry(1, 40); g.scale(rx, rz, 1);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, 0.02, z); m.receiveShadow = true; return m;
}

// ---------------------------------------------------------------- GLB packs
const gl = new GLTFLoader(); const packs = new Map(); const nodes = new Map();
export const PACKS = ['bones/01_giant_landmarks', 'bones/02_sandstone', 'bones/03_trees', 'bones/04_small_plants', 'bones/05_buildings', 'bones/06_ritual_fences', 'bones/07_camp_props', 'bones/08_ancient_ruins', 'temple/ruins', 'temple/walls', 'portals', 'portals2', 'portals3', 'altar_chronicle', 'altar_power'];
export async function loadPacks(list, onP) {
  let done = 0;
  await Promise.all(list.map(async name => {
    if (packs.has(name)) return;
    const g = await gl.loadAsync(M + name + '.glb'); packs.set(name, g);
    for (const n of g.scene.children) { nodes.set(n.name, n); n.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material.side = THREE.FrontSide; } } }); }
    onP && onP(++done / list.length);
  }));
}
export async function loadAnimal(name) {
  if (packs.has(name)) return packs.get(name);
  const g = await gl.loadAsync(M + name + '.glb'); g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); packs.set(name, g); return g;
}
// place a prop: height h (m) rescales the unit-height packs; returns object3d with bounds
export function prop(name, x, z, o = {}) {
  const src = nodes.get(name); if (!src) { console.warn('no prop', name); return null; }
  const obj = src.clone(true); obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); obj.scale.set(1, 1, 1);
  const wrap = new THREE.Group(); wrap.add(obj);
  const b = new THREE.Box3().setFromObject(obj); const hgt = b.max.y - b.min.y || 1;
  const k = o.h ? o.h / hgt : (o.s || 1);
  obj.scale.setScalar(k); obj.position.set(-(b.min.x + b.max.x) / 2 * k, -b.min.y * k, -(b.min.z + b.max.z) / 2 * k);
  wrap.position.set(x, o.y || 0, z); wrap.rotation.y = o.rot || 0;
  wrap.userData.size = [(b.max.x - b.min.x) * k, hgt * k, (b.max.z - b.min.z) * k];
  if (o.tint) obj.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(o.tint)); } });
  if (o.glow) obj.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.emissive = new THREE.Color(o.glow); m.material.emissiveIntensity = o.glowK || 0.6; } });
  return wrap;
}

// ---------------------------------------------------------------- skinned characters (Umbrahold format)
const skins = new Map(); const texs = new Map(); const tl = new THREE.TextureLoader();
async function loadSkin(name) {
  if (skins.has(name)) return skins.get(name);
  const p = (async () => {
    const meta = await fetch(M + name + '.json').then(r => r.json());
    const buf = await fetch(M + name + '.bin').then(r => r.arrayBuffer());
    const L = meta.layout, A = (T, k) => new T(buf, L[k][0], L[k][1] / T.BYTES_PER_ELEMENT);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(A(Float32Array, 'pos'), 3));
    g.setAttribute('normal', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(A(Int8Array, 'nrm'), 4), 3, 0, true));
    g.setAttribute('uv', new THREE.BufferAttribute(A(Uint16Array, 'uv'), 2, true));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(A(Uint8Array, 'si'), 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(A(Uint8Array, 'sw'), 4, true));
    g.setIndex(new THREE.BufferAttribute(A(Uint16Array, 'idx'), 1)); g.computeBoundingSphere();
    const tn = meta.tex || name;
    if (!texs.has(tn)) texs.set(tn, tl.loadAsync(M + tn + '.webp').then(t => { t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4; return t; }));
    return { meta, geo: g, tex: await texs.get(tn) };
  })();
  skins.set(name, p); return p;
}
export const preloadChars = names => Promise.all(names.map(loadSkin));
export class Char {
  constructor(name, data, o = {}) {
    const { meta, geo, tex } = data; this.name = name; this.meta = meta;
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    const bones = [], by = {}, at = {};
    for (const [n, parent, pos] of meta.bones) {
      const b = new THREE.Bone(); b.name = n; at[n] = pos; by[n] = b; bones.push(b);
      const pp = parent ? at[parent] : [0, 0, 0]; b.position.set(pos[0] - pp[0], pos[1] - pp[1], pos[2] - pp[2]);
      (parent ? by[parent] : this.body).add(b);
    }
    this.bones = bones; this.by = by; this.rest = new Map(bones.map(b => [b, b.position.clone()]));
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.05, color: o.tint || 0xffffff });
    if (o.glow) { mat.emissive = new THREE.Color(o.glow); mat.emissiveIntensity = o.glowK ?? 0.35; }
    const mesh = new THREE.SkinnedMesh(geo, mat); mesh.castShadow = true; mesh.frustumCulled = false;
    this.body.add(mesh); this.body.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones)); this.mesh = mesh; this.mat = mat;
    this.clips = meta.clips || null; this.t = Math.random() * 10; this.phase = 0; this.state = 'idle';
    this.scale = o.scale || 1; this.root.scale.setScalar(this.scale);
    this.height = (meta.height || 1.8) * this.scale;
  }
  // state: idle | walk | talk ; speed m/s for clip-based walk
  update(dt, speed = 0) {
    this.t += dt; const t = this.t, B = this.by;
    for (const b of this.bones) b.quaternion.identity();
    this.bones.forEach(b => b.position.copy(this.rest.get(b)));
    const q = (n, x, y, z) => { const b = B[n]; if (b) b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z))); };
    if (this.state === 'walk' && this.clips && this.clips.walk) {
      const c = this.clips.walk; this.phase = (this.phase + dt * Math.max(0.6, speed / (c.stride || 1.3)) / 1) % 1;
      const n = c.frames.length, f = this.phase * n, i0 = Math.floor(f) % n, i1 = (i0 + 1) % n, k = f - Math.floor(f);
      const A = c.frames[i0], Bf = c.frames[i1], qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
      this.bones.forEach((b, j) => { qa.set(A[j * 4], A[j * 4 + 1], A[j * 4 + 2], A[j * 4 + 3]); qb.set(Bf[j * 4], Bf[j * 4 + 1], Bf[j * 4 + 2], Bf[j * 4 + 3]); if (qa.dot(qb) < 0) qb.set(-qb.x, -qb.y, -qb.z, -qb.w); b.quaternion.copy(qa).slerp(qb, k); });
      if (c.hips && B.hips) { const h0 = c.hips[i0], h1 = c.hips[i1]; const hb = B.hips; hb.position.x += h0[0] + (h1[0] - h0[0]) * k; hb.position.y += h0[1] + (h1[1] - h0[1]) * k; hb.position.z += h0[2] + (h1[2] - h0[2]) * k; }
    } else if (this.state === 'walk') {   // procedural walk for models without clips
      const w = t * 7.5, s = Math.sin(w);
      q('legL', s * 0.55, 0, 0); q('legR', -s * 0.55, 0, 0); q('kneeL', Math.max(0, -Math.cos(w)) * 0.7, 0, 0); q('kneeR', Math.max(0, Math.cos(w)) * 0.7, 0, 0);
      q('armL', -s * 0.4, 0, 0); q('armR', s * 0.4, 0, 0); q('elL', -0.25, 0, 0); q('elR', -0.25, 0, 0);
      if (B.body) B.body.position.y += Math.abs(Math.cos(w)) * 0.04;
    } else {
      const br = Math.sin(t * 1.8);
      q(B.torso ? 'torso' : 'body', br * 0.02, Math.sin(t * 0.5) * 0.04, 0); q('head', Math.sin(t * 0.7) * 0.04, Math.sin(t * 0.37) * 0.25, 0);
      q('armL', 0, 0, -0.06 - br * 0.02); q('armR', 0, 0, 0.06 + br * 0.02);
      if (this.state === 'talk') { q('armR', -0.9 - Math.sin(t * 3) * 0.25, 0, 0.25); q('elR', -0.7, 0, 0); q('head', Math.sin(t * 6) * 0.06, 0, 0); }
      if (this.pose === 'king') { q('armL', -0.3, 0, -0.35); q('armR', -0.3, 0, 0.35); q('head', -0.15, 0, 0); }
    }
  }
}
export async function makeChar(name, o) { return new Char(name, await loadSkin(name), o); }

// animated GLB animals (dog) and simple hopping ones (chickens)
export class Animal {
  constructor(gltf, o = {}) {
    this.root = SkeletonUtils.clone(gltf.scene); this.mixer = null;
    this.root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(this.root, true); const h = b.max.y - b.min.y || 1; const k = (o.h || 0.6) / h;
    this.root.scale.setScalar(k);
    if (gltf.animations && gltf.animations.length) { this.mixer = new THREE.AnimationMixer(this.root); const c0 = gltf.animations[0]; const clip = new THREE.AnimationClip(c0.name, c0.duration, c0.tracks.filter(t => t.name.endsWith('.quaternion'))); this.act = this.mixer.clipAction(clip); this.act.play(); }
    this.hop = !this.mixer; this.t = Math.random() * 5;
  }
  update(dt, moving) { this.t += dt; if (this.mixer) { this.act.timeScale = moving ? 1 : 0.15; this.mixer.update(dt); } else if (this.hop && moving) this.root.children[0].position.y = Math.abs(Math.sin(this.t * 12)) * 0.08; }
}

// ---------------------------------------------------------------- small procedural pieces
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
export function well() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.9, 20, 1, true), std(0x9b8467)); ring.position.y = 0.45; ring.material.side = THREE.DoubleSide;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.14, 8, 24), std(0xb39a78)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.92;
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.95, 20), std(0x2a6d8a, { roughness: 0.15, metalness: 0.3, emissive: 0x0a2733 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.5;
  const postA = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), std(0x6a4a2a)); postA.position.set(-1.05, 1.1, 0);
  const postB = postA.clone(); postB.position.x = 1.05;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.3, 8), std(0x5a3c20)); beam.rotation.z = Math.PI / 2; beam.position.y = 2.0;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.9, 4), std(0x8a5a32)); roof.position.y = 2.6; roof.rotation.y = Math.PI / 4;
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.26, 10), std(0x7a5534)); bucket.position.set(0, 1.4, 0);
  for (const m of [ring, rim, postA, postB, beam, roof, bucket]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
  g.add(water); return g;
}
export function woodpile(n = 7) {
  const g = new THREE.Group(); const mat = std(0x7a5532), cut = std(0xc49a62);
  let k = 0;
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row && k < n; i++, k++) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 9), [mat, cut, cut]); l.rotation.z = Math.PI / 2;
    l.position.set(0, 0.16 + row * 0.28, (i - (3 - row) / 2) * 0.34); l.castShadow = true; g.add(l);
  }
  return g;
}
export function appleTree(src) {
  const g = new THREE.Group(); if (src) g.add(src);
  const red = std(0xc8241c, { roughness: 0.4 }), green = std(0x7ab83a, { roughness: 0.4 }); const geo = new THREE.SphereGeometry(0.11, 8, 6);
  let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, r = 0.6 + rnd() * 1.0; const m = new THREE.Mesh(geo, i % 2 ? red : green); m.position.set(Math.cos(a) * r, 2.3 + rnd() * 0.9, Math.sin(a) * r); g.add(m); }
  return g;
}
export function stall() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.0), std(0x8a5f36)); top.position.y = 0.9;
  for (const [x, z] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), std(0x5a3c20)); l.position.set(x, 0.45, z); g.add(l); }
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 1.4), std(0xb8432c)); cloth.position.set(0, 2.2, 0); cloth.rotation.x = 0.15;
  for (const [x, z] of [[-1.15, -0.6], [1.15, -0.6]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), std(0x5a3c20)); p.position.set(x, 1.15, z); g.add(p); }
  const bread = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), std(0xd29a52)); bread.scale.set(1.4, 0.7, 1); bread.position.set(-0.55, 1.05, 0);
  const bread2 = bread.clone(); bread2.material = std(0x5a3a22); bread2.position.x = -0.05;
  const fish = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 8), std(0x9fb4c0, { metalness: 0.4, roughness: 0.35 })); fish.rotation.z = Math.PI / 2; fish.position.set(0.55, 1.02, 0);
  for (const m of [top, cloth, bread, bread2, fish]) { m.castShadow = true; g.add(m); }
  g.children.forEach(m => { m.castShadow = true; m.receiveShadow = true; });
  return g;
}
export function anvil() {
  const g = new THREE.Group(); const iron = std(0x3a3a40, { metalness: 0.7, roughness: 0.4 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.4), std(0x5a3c20)); base.position.y = 0.25;
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.32), iron); top.position.y = 0.61;
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), iron); horn.rotation.z = -Math.PI / 2; horn.position.set(0.62, 0.62, 0);
  for (const m of [base, top, horn]) { m.castShadow = true; g.add(m); } return g;
}
export function brazier(lit) {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.22, 0.35, 14), std(0x4a3a2c, { metalness: 0.5, roughness: 0.5 })); bowl.position.y = 1.05;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.9, 8), std(0x3a2e24, { metalness: 0.5 })); leg.position.y = 0.45;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.08, 12), std(0x3a2e24)); foot.position.y = 0.04;
  for (const m of [bowl, leg, foot]) { m.castShadow = true; g.add(m); }
  if (lit) g.add(flame(1.25));
  return g;
}
export function flame(y = 0.3, k = 1) {
  const g = new THREE.Group(); g.userData.flame = true;
  const m1 = new THREE.Mesh(new THREE.ConeGeometry(0.22 * k, 0.7 * k, 10), new THREE.MeshBasicMaterial({ color: 0xffa23a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  const m2 = new THREE.Mesh(new THREE.ConeGeometry(0.12 * k, 0.45 * k, 8), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  m1.position.y = y + 0.3 * k; m2.position.y = y + 0.22 * k; g.add(m1, m2);
  return g;
}
export function gravestone(t = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.18), std(0x8d8676)); m.position.y = 0.5; m.rotation.z = (t - 0.5) * 0.12;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 14, 1, false, 0, Math.PI), std(0x8d8676)); top.rotation.x = Math.PI / 2; top.rotation.z = Math.PI / 2; top.position.y = 1.0;
  const g = new THREE.Group(); g.add(m); m.add(top); top.position.set(0, 0.5, 0); m.castShadow = true; top.castShadow = true; return g;
}
export function plaque(color = 0x8a7f6c) {
  const g = new THREE.Group();
  const st = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.25), std(color)); st.position.y = 0.7; st.rotation.x = -0.08;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.9), std(0xd8c9a0, { emissive: 0x3a2a10, emissiveIntensity: 0.4 })); face.position.set(0, 0.78, 0.13); face.rotation.x = -0.08;
  for (const m of [st]) { m.castShadow = true; g.add(m); } g.add(face); return g;
}
export function sarcophagus(open) {
  const g = new THREE.Group(); const s = std(0x7c7465);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 2.1), s); b.position.y = 0.375;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.18, 2.2), std(0x8f8676)); lid.position.y = 0.84;
  if (open) { lid.position.set(0.55, 0.5, 0.2); lid.rotation.z = 0.5; }
  for (const m of [b, lid]) { m.castShadow = true; m.receiveShadow = true; g.add(m); } return g;
}
// soft glowing marker for magic things
export function glowDisc(color, r = 1.2) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.userData.pulse = true; return m;
}

// ---------------------------------------------------------------- camera & projection
const tmp = new THREE.Vector3();
export const CAM = { dist: 15, h: 13.5, yaw: Math.PI / 4, x: 0, z: 0 };
export function placeCamera(x, z, dt, snap) {
  const k = snap ? 1 : 1 - Math.exp(-6 * dt);
  CAM.x += (x - CAM.x) * k; CAM.z += (z - CAM.z) * k;
  const portrait = V.W < V.H; const d = CAM.dist * (portrait ? 1.15 : 1), h = CAM.h * (portrait ? 1.2 : 1);
  V.cam.position.set(CAM.x + Math.sin(CAM.yaw) * d, h, CAM.z + Math.cos(CAM.yaw) * d);
  V.cam.lookAt(CAM.x, 0.9, CAM.z);
  V.sun.position.set(CAM.x + 14, 26, CAM.z + 6); V.sun.target.position.set(CAM.x, 0, CAM.z);
}
export function toScreen(x, y, z) { tmp.set(x, y, z).project(V.cam); return [(tmp.x + 1) / 2 * V.W, (1 - tmp.y) / 2 * V.H, tmp.z]; }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
export function screenToGround(sx, sy) { ndc.set(sx / V.W * 2 - 1, -(sy / V.H) * 2 + 1); ray.setFromCamera(ndc, V.cam); const p = new THREE.Vector3(); return ray.ray.intersectPlane(plane, p) ? [p.x, p.z] : null; }
// keyboard (screen) direction to world (x, z)
export function screenDir(mx, my) {
  const f = [-Math.sin(CAM.yaw), -Math.cos(CAM.yaw)], r = [Math.cos(CAM.yaw), -Math.sin(CAM.yaw)];
  const x = r[0] * mx - f[0] * my, z = r[1] * mx - f[1] * my; const l = Math.hypot(x, z) || 1; return [x / l, z / l];
}
export function render() { V.renderer.render(V.scene, V.cam); }
