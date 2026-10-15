// Внешние эффекты-облики (косметика, в духе PoE): следы шагов, ауры, крылья, нимб и сферы.
// Всё процедурное — ни одного файла не качается; объект создаётся только когда облик надет (cosmetics.js),
// и снимается вместе с ним. Цена в кадре: след — 2 отрисовки (пул наклеек + пул частиц), аура — 2, крылья — 1–2, нимб/сферы — 1.
// Частицы считаются на процессоре, их мало (≤ 64 на эффект), без света и теней.
import * as THREE from '../vendor/three.module.min.js';
import { U } from './toon.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

const NOISE = /* glsl */`
float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
`;
const C3 = c => new THREE.Color(c);
let _dot = null;
function dotTex() {
  if (_dot) return _dot;
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32); _dot = new THREE.CanvasTexture(c); return _dot;
}

// ---------------------------------------------------------------- частицы (общий маленький пул на эффект)
export class Motes {
  constructor(scene, n, o) {
    this.n = n; this.o = o; this.i = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mat = new THREE.PointsMaterial({ size: o.size ?? 0.16, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: o.dark ? THREE.NormalBlending : THREE.AdditiveBlending, fog: false });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 6; scene.add(this.pts);
    this.cA = C3(o.colA); this.cB = C3(o.colB ?? o.colA);
  }
  emit(x, y, z, vx, vy, vz, life) {
    const i = this.i, j = i * 3; this.i = (i + 1) % this.n;
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz; this.life[i] = this.max[i] = life;
  }
  update(dt) {
    const P = this.pos, V = this.vel, C = this.col, g = this.o.grav ?? 0, dr = this.o.drag ?? 0.5, wob = this.o.wobble ?? 0, t = U.uTime.value;
    for (let i = 0; i < this.n; i++) {
      const j = i * 3; if (this.life[i] <= 0) { C[j] = C[j + 1] = C[j + 2] = 0; if (this.o.dark) P[j + 1] = -50; continue; }
      this.life[i] -= dt; V[j + 1] -= g * dt; V[j] *= 1 - dr * dt; V[j + 2] *= 1 - dr * dt;
      P[j] += (V[j] + (wob ? Math.sin(t * 3 + i) * wob : 0)) * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += (V[j + 2] + (wob ? Math.cos(t * 2.6 + i * 1.7) * wob : 0)) * dt;
      const k = Math.max(0, this.life[i] / this.max[i]), f = this.o.dark ? 1 : Math.min(1, k * 2.2) * (this.o.k ?? 1.6);
      if (this.o.dark && k <= 0.02) P[j + 1] = -50;   // тёмные частицы (обычное смешивание) просто прячутся под землю
      C[j] = (this.cB.r + (this.cA.r - this.cB.r) * k) * f; C[j + 1] = (this.cB.g + (this.cA.g - this.cB.g) * k) * f; C[j + 2] = (this.cB.b + (this.cA.b - this.cB.b) * k) * f;
    }
    this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true;
  }
  dispose() { this.pts.removeFromParent(); this.pts.geometry.dispose(); this.mat.dispose(); }
}

// ---------------------------------------------------------------- следы шагов
// kind: fire — горящие следы и искры; ice — иней-снежинки и пар; blood — кровавые брызги; shadow — дымные тёмные следы; gold — золотые звёзды
export const TRAILS = {
  fire:   { shape: 0, colA: 0xff5a10, colB: 0xffd060, add: true, life: 2.2, motes: { colA: 0xffc040, colB: 0xff3000, grav: -2.2, size: 0.14, k: 2.2 } },
  ice:    { shape: 1, colA: 0x5ab8ff, colB: 0xe8fbff, add: true, life: 2.2, motes: { colA: 0xe0f6ff, colB: 0x60b0ff, grav: 0.3, size: 0.1, wobble: 0.4, k: 1.4 } },
  blood:  { shape: 2, colA: 0x4a0006, colB: 0x9a0a12, add: false, life: 3.0, motes: { colA: 0xff2a2a, colB: 0x600000, grav: 6, size: 0.08, k: 1.2 } },
  shadow: { shape: 3, colA: 0x0c0614, colB: 0x6a2aa8, add: false, life: 2.6, motes: { colA: 0xb070ff, colB: 0x401070, grav: -1.4, size: 0.18, wobble: 0.5, k: 1.3 } },
  gold:   { shape: 4, colA: 0xffb020, colB: 0xfff4c0, add: true, life: 2.2, motes: { colA: 0xfff0b0, colB: 0xffa020, grav: -1.2, size: 0.11, k: 2.0 } },
};
const TRAIL_FS = /* glsl */`
uniform float uTime; uniform float uLife; uniform float uShape; uniform vec3 uColA; uniform vec3 uColB; uniform float uAdd;
varying vec2 vUv; varying float vBorn; varying float vSeed;
${NOISE}
void main() {
  float age = (uTime - vBorn) / uLife; if (age < 0.0 || age > 1.0) discard;
  vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x), A = 0.0; vec3 col;
  if (uShape < 0.5) {            // огонь: пятно-след с языками, гаснет от жёлтого к красному
    vec2 q = p * vec2(1.0, 0.7); float n = vn(q * 3.0 + vec2(vSeed * 7.0, -uTime * 3.0));
    A = smoothstep(0.95, 0.2, length(q) + n * 0.45 - 0.15) * (1.0 - age);
    col = mix(uColA, uColB, smoothstep(0.2, 0.9, A + 0.3 * (1.0 - age))) * 2.2;
  } else if (uShape < 1.5) {     // лёд: шестилучевая снежинка-иней
    float star = 0.25 + 0.7 * pow(abs(cos(a * 3.0 + vSeed * 6.0)), 18.0);
    float ring = smoothstep(0.08, 0.0, abs(r - 0.42)) * 0.5;
    A = max(smoothstep(star, star - 0.12, r), ring) * smoothstep(1.0, 0.6, age) * (0.7 + 0.3 * vn(p * 6.0 + vSeed));
    col = mix(uColA, uColB, smoothstep(0.0, 0.5, A)) * 1.6;
  } else if (uShape < 2.5) {     // кровь: клякса с брызгами, медленно сохнет
    float lob = 0.55 + 0.25 * vn(vec2(a * 2.0, vSeed * 13.0));
    float drops = smoothstep(0.12, 0.0, length(fract(p * 2.2 + vSeed * 3.0) - 0.5)) * step(0.7, hh(floor(p * 2.2 + vSeed * 3.0)));
    A = max(smoothstep(lob, lob - 0.1, r), drops) * smoothstep(1.0, 0.55, age) * 0.92;
    col = mix(uColB, uColA, smoothstep(0.0, 0.8, r + age * 0.6));
  } else if (uShape < 3.5) {     // тень: тёмное дымное пятно с фиолетовой каймой
    float n = vn(p * 2.5 + vec2(uTime * 0.6, vSeed * 9.0));
    float d = r + n * 0.5 - 0.2; A = smoothstep(0.95, 0.35, d) * (1.0 - age) * 0.9;
    col = mix(uColA, uColB, smoothstep(0.55, 0.85, d) * 1.2);
  } else {                       // золото: четырёхлучевая звезда-отпечаток
    float st = 0.15 + 0.85 * pow(abs(cos(a * 2.0)), 30.0);
    A = (smoothstep(st, st - 0.15, r) + smoothstep(0.5, 0.0, r) * 0.5) * (1.0 - age);
    col = mix(uColA, uColB, smoothstep(0.0, 0.6, A)) * 2.0;
  }
  if (A < 0.01) discard;
  gl_FragColor = uAdd > 0.5 ? vec4(col * A, A) : vec4(col, A);
}`;
export class Trail {
  constructor(scene, kind) {
    const K = this.K = TRAILS[kind] || TRAILS.fire, N = this.N = 26;
    const geo = new THREE.PlaneGeometry(0.55, 0.55); geo.rotateX(-Math.PI / 2);
    this.born = new Float32Array(N).fill(-99); this.seed = new Float32Array(N).map(() => Math.random());
    geo.setAttribute('aBorn', new THREE.InstancedBufferAttribute(this.born, 1)); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(this.seed, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uLife: { value: K.life }, uShape: { value: K.shape }, uColA: { value: C3(K.colA) }, uColB: { value: C3(K.colB) }, uAdd: { value: K.add ? 1 : 0 } },
      vertexShader: 'attribute float aBorn; attribute float aSeed; varying vec2 vUv; varying float vBorn; varying float vSeed; void main(){ vUv = uv; vBorn = aBorn; vSeed = aSeed; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }',
      fragmentShader: TRAIL_FS, transparent: true, depthWrite: false, blending: K.add ? THREE.AdditiveBlending : THREE.NormalBlending,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this.im = new THREE.InstancedMesh(geo, this.mat, N); this.im.frustumCulled = false; this.im.renderOrder = 3; this.im.userData.noOutline = true;
    const m = new THREE.Matrix4().makeTranslation(0, -50, 0); for (let i = 0; i < N; i++) this.im.setMatrixAt(i, m);
    scene.add(this.im);
    this.motes = new Motes(scene, 56, { ...K.motes, dark: !!K.motes.dark });
    this.i = 0; this.dist = 0; this.foot = 1; this.lx = null; this.ly = 0; this.mt = 0; this.iv = 1; this.lt = -99;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1); this._ax = new THREE.Vector3(0, 1, 0);
  }
  // x, y — позиция героя на карте (мировые x, z), yaw — куда смотрит
  update(dt, x, y, yaw) {
    const t = U.uTime.value;
    if (this.lx == null) { this.lx = x; this.ly = y; }
    const d = Math.hypot(x - this.lx, y - this.ly); this.lx = x; this.ly = y;
    const moving = d > 0.002 && d < 2; this.dist += moving ? d : 0;
    if (this.dist > 0.42) {
      this.dist = 0; this.foot = -this.foot;
      // быстрый бег: следов N штук, старый след занимают раньше, чем он догорит. Укорачиваем жизнь шлейфа под темп шагов, чтобы последний гас сам, а не исчезал рывком
      this.iv += (Math.min(1, t - this.lt) - this.iv) * 0.3; this.lt = t;
      this.mat.uniforms.uLife.value = Math.min(this.K.life, Math.max(0.5, this.N * this.iv * 0.8));
      const i = this.i; this.i = (i + 1) % this.N; const sx = Math.cos(yaw) * 0.16 * this.foot, sz = -Math.sin(yaw) * 0.16 * this.foot;
      const s = 0.8 + Math.random() * 0.4; this._s.set(s, 1, s * 1.25);
      this._m.compose(this._v.set(x + sx, 0.12 + i * 0.0004, y + sz), this._q.setFromAxisAngle(this._ax, yaw), this._s); this.im.setMatrixAt(i, this._m); this.im.instanceMatrix.needsUpdate = true;
      this.born[i] = t; this.im.geometry.attributes.aBorn.needsUpdate = true;
      for (let k = 0, n = Math.max(2, Math.min(6, Math.round(this.iv * 30))); k < n; k++) this.motes.emit(x + sx + (Math.random() - 0.5) * 0.3, 0.1, y + sz + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.7);
    }
    // стоя — изредка искра/снежинка у ног, чтобы облик было видно и в покое
    if (!moving && (this.mt += dt) > 0.22) { this.mt = 0; const a = Math.random() * 6.28, r = 0.2 + Math.random() * 0.25; this.motes.emit(x + Math.cos(a) * r, 0.08, y + Math.sin(a) * r, 0, 0.5 + Math.random() * 0.6, 0, 0.9); }
    this.motes.update(dt);
  }
  dispose() { this.im.removeFromParent(); this.im.geometry.dispose(); this.mat.dispose(); this.motes.dispose(); }
}

// ---------------------------------------------------------------- ауры (круг на земле + частицы)
export const AURAS = {
  fire:  { colA: 0xff4a08, colB: 0xffc040, runes: 1, motes: { colA: 0xffd060, colB: 0xff2000, grav: -1.6, size: 0.15, k: 2.2 } },
  frost: { colA: 0x2a7aff, colB: 0xc8f4ff, runes: 1, motes: { colA: 0xf0fbff, colB: 0x4a9aff, grav: -0.5, size: 0.11, wobble: 0.5, k: 1.5 } },
  blood: { colA: 0x8a0008, colB: 0xff3a2a, runes: 0, motes: { colA: 0xff3030, colB: 0x500000, grav: -1.0, size: 0.13, k: 1.6 } },
  void:  { colA: 0x5a10c0, colB: 0xd890ff, runes: 1, motes: { colA: 0xe0a0ff, colB: 0x3a0090, grav: -1.2, size: 0.16, wobble: 0.6, k: 1.8 } },
  holy:  { colA: 0xffb020, colB: 0xfff8d0, runes: 2, motes: { colA: 0xfff6d0, colB: 0xffb030, grav: -2.0, size: 0.12, k: 2.0 } },
  poison:{ colA: 0x30a010, colB: 0xc8ff60, runes: 0, motes: { colA: 0xd0ff80, colB: 0x206000, grav: -0.9, size: 0.17, wobble: 0.4, k: 1.6 } },
};
const AURA_FS = /* glsl */`
uniform float uTime; uniform vec3 uColA; uniform vec3 uColB; uniform float uRunes; varying vec2 vUv;
${NOISE}
void main() {
  vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x); if (r > 1.0) discard;
  float n = vn(vec2(a * 3.0 + uTime * 0.7, r * 4.0 - uTime * 1.4));
  float ring = smoothstep(0.07, 0.0, abs(r - 0.82)) ;
  float ring2 = smoothstep(0.035, 0.0, abs(r - 0.66)) * 0.7;
  float ticks = 0.0;
  if (uRunes > 0.5) {
    float seg = fract((a + uTime * 0.25) / 6.2831 * 24.0);
    ticks = step(0.7, seg) * smoothstep(0.1, 0.0, abs(r - 0.74)) * (uRunes > 1.5 ? 1.0 : step(0.4, hh(vec2(floor((a + uTime * 0.25) / 6.2831 * 24.0), 3.0))));
  }
  float fill = smoothstep(1.0, 0.0, r) * (0.18 + 0.32 * n);
  float flame = smoothstep(1.0, 0.75, r) * smoothstep(0.55, 0.8, r) * n * 0.9;
  float pu = 0.85 + 0.15 * sin(uTime * 2.4);
  float A = clamp((ring + ring2 + ticks + fill + flame) * pu, 0.0, 1.0);
  vec3 col = mix(uColA, uColB, clamp(ring + ticks * 0.8 + n * 0.3, 0.0, 1.0)) * 1.8;
  gl_FragColor = vec4(col * A, A);
}`;
export class Aura {
  constructor(scene, kind) {
    const K = AURAS[kind] || AURAS.fire;
    this.mat = new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime, uColA: { value: C3(K.colA) }, uColB: { value: C3(K.colB) }, uRunes: { value: K.runes } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: AURA_FS, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const g = new THREE.PlaneGeometry(2.6, 2.6); g.rotateX(-Math.PI / 2);
    this.disc = new THREE.Mesh(g, this.mat); this.disc.renderOrder = 3; this.disc.userData.noOutline = true; this.disc.frustumCulled = false; scene.add(this.disc);
    this.motes = new Motes(scene, 48, K.motes); this.et = 0;
  }
  update(dt, x, y) {
    this.disc.position.set(x, 0.05, y);
    if ((this.et += dt) > 0.07) { this.et = 0; const a = Math.random() * 6.28, r = 0.6 + Math.random() * 0.5; this.motes.emit(x + Math.cos(a) * r, 0.1, y + Math.sin(a) * r, 0, 0.4 + Math.random() * 0.6, 0, 1 + Math.random() * 0.8); }
    this.motes.update(dt);
  }
  dispose() { this.disc.removeFromParent(); this.disc.geometry.dispose(); this.mat.dispose(); this.motes.dispose(); }
}

// ---------------------------------------------------------------- крылья
// demon — перепончатые кожистые с костями и тлеющими прожилками; angel — белые перья с золотыми кончиками;
// frost — ледяные кристаллы; flame — крылья из пламени (энергия); void — фиолетовая бездна (энергия)
export const WINGS = {
  demon: { type: 'membrane', col: 0x2a0a10, top: 0x7a1a20, glow: 0xff4020 },
  angel: { type: 'feather', col: 0xf4f0e8, top: 0xffffff, tip: 0xf0c050 },
  frost: { type: 'crystal', colA: 0x3a9aff, colB: 0xe0faff },
  flame: { type: 'energy', colA: 0xff3a00, colB: 0xffd860 },
  void:  { type: 'energy', colA: 0x4a00b0, colB: 0xe0a0ff },
};
const ENERGY_FS = /* glsl */`
uniform float uTime; uniform vec3 uColA; uniform vec3 uColB; varying vec2 vUv; varying float vK;
${NOISE}
void main() {
  float n = vn(vec2(vUv.x * 5.0 - uTime * 0.6, vUv.y * 3.0 - uTime * 2.2)) * 0.65 + vn(vUv * 11.0 + uTime) * 0.35;
  float edge = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.55, vUv.y + n * 0.35);
  float A = edge * (0.45 + 0.75 * n) * (1.0 - vUv.x * 0.55);
  if (A < 0.02) discard;
  gl_FragColor = vec4(mix(uColA, uColB, n * edge) * 2.2 * A, A);
}`;
// перо/кристалл/палец крыла — вытянутый ромб; u — вдоль крыла (0 у плеча), v — поперёк
function blade(len, w, color, tip, out = []) {
  const g = new THREE.BufferGeometry(), P = [0, 0, 0, len * 0.3, w * 0.5, 0, len, 0, 0, len * 0.3, -w * 0.5, 0];
  const c0 = new THREE.Color(color), c1 = new THREE.Color(tip ?? color);
  const C = [c0.r, c0.g, c0.b, 1, c0.r, c0.g, c0.b, 1, c1.r, c1.g, c1.b, 1, c0.r, c0.g, c0.b, 1];
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 4));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0.5, 0.3, 1, 1, 0.5, 0.3, 0], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); out.push(g); return g;
}
function wingHalf(W, s) {
  const parts = [], R = new THREE.Matrix4(), T = new THREE.Matrix4();
  const put = (g, ang, x, y, z = 0) => { g.applyMatrix4(R.makeRotationZ(ang)); g.applyMatrix4(T.makeTranslation(x, y, z)); return g; };
  if (W.type === 'membrane') {
    // перепонка: веер из 4 «пальцев», между ними натянутая кожа (треугольники), по краю — зубцы
    const fingers = [[1.05, 1.0], [1.3, 0.55], [1.15, 0.05], [0.85, -0.4]];
    const P = [0, 0, 0], C = [], c0 = new THREE.Color(W.col), c1 = new THREE.Color(W.top), idx = [];
    fingers.forEach(([Lf, a], i) => {
      P.push(Math.cos(a) * Lf, Math.sin(a) * Lf, 0);
      if (i < fingers.length - 1) { const [L2, a2] = fingers[i + 1], am = (a + a2) / 2, lm = (Lf + L2) / 2 * 0.62; P.push(Math.cos(am) * lm, Math.sin(am) * lm, 0); }   // вырез перепонки между пальцами
    });
    for (let i = 1; i < P.length / 3 - 1; i++) idx.push(0, i, i + 1);
    for (let i = 0; i < P.length / 3; i++) { const c = i === 0 ? c1 : c0; C.push(c.r, c.g, c.b, 1); }
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); m.setAttribute('color', new THREE.Float32BufferAttribute(C, 4)); m.setIndex(idx); m.computeVertexNormals();
    m.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(P.length / 3 * 2).fill(0), 2)); parts.push(m);
    fingers.forEach(([Lf, a]) => parts.push(put(blade(Lf * 1.06, 0.07, 0x1a0608, W.glow), a, 0, 0, 0.01)));
  } else if (W.type === 'feather' || W.type === 'crystal') {
    // крыло птицы: «плечевая кость» дугой вверх-наружу, с неё свисают перья (у кончика — длинные маховые), второй ряд — короткие кроющие
    const cr = W.type === 'crystal', n = cr ? 9 : 13, arm = k => [Math.sin(k * 1.3) * 0.95, 0.05 + Math.sin(k * 2.2) * 0.8];   // дуга: вверх-наружу, кончик чуть опущен
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), [x, y] = arm(k), a = -1.85 + k * 1.3, L = (cr ? 0.55 : 0.6) + k * (cr ? 0.6 : 0.75);
      parts.push(put(blade(L, cr ? 0.2 : 0.26, W.col ?? W.colA, W.tip ?? W.colB), a, x, y, -i * 0.006));
    }
    if (!cr) for (let i = 0; i < 10; i++) { const k = i / 9, [x, y] = arm(k * 0.92), a = -1.6 + k * 1.1; parts.push(put(blade(0.3 + k * 0.15, 0.22, W.top, W.col), a, x, y + 0.02, 0.02)); }
  } else {
    // энергия: один большой веер-лоскут, u — от плеча к краю, v — поперёк (шейдер рисует языки)
    const seg = 10, P = [], UV = [], idx = [];
    for (let i = 0; i <= seg; i++) { const a = 1.3 - i / seg * 1.9; for (let j = 0; j <= 4; j++) { const r = j / 4 * (0.9 + Math.sin(i / seg * Math.PI) * 0.6); P.push(Math.cos(a) * r, Math.sin(a) * r, 0); UV.push(i / seg, j / 4); } }
    for (let i = 0; i < seg; i++) for (let j = 0; j < 4; j++) { const a = i * 5 + j, b = a + 5; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(idx); g.computeVertexNormals(); parts.push(g);
  }
  const g = parts.length > 1 ? mergeGeometries(parts, false) : parts[0];
  if (s < 0) { g.scale(-1, 1, 1); const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
  return g;
}
export class Wings {
  // bone — кость корпуса (Object3D), к ней крепятся крылья; s — масштаб героя
  constructor(kind, bone, o = {}) {
    const W = WINGS[kind] || WINGS.angel; this.W = W;
    if (W.type === 'energy') this.mat = new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime, uColA: { value: C3(W.colA) }, uColB: { value: C3(W.colB) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, vertexShader: 'varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = 0.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: ENERGY_FS });
    else if (W.type === 'crystal') this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    else this.mat = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.root = new THREE.Group(); this.root.position.set(0, o.y ?? 0.25, o.z ?? -0.2); this.root.scale.setScalar(o.scale ?? 0.85);
    this.halves = [-1, 1].map(s => { const pv = new THREE.Group(); pv.position.x = s * 0.1; const m = new THREE.Mesh(wingHalf(W, s), this.mat); m.userData.noOutline = true; m.userData.noBake = true; m.castShadow = W.type !== 'energy' && W.type !== 'crystal'; pv.add(m); this.root.add(pv); pv.s = s; return pv; });
    bone.add(this.root);
  }
  update(dt, moving) {
    const t = U.uTime.value, f = moving ? 3.2 : 1.6, amp = moving ? 0.22 : 0.12;
    for (const h of this.halves) { h.rotation.y = h.s * (-0.3 + Math.sin(t * f) * amp); h.rotation.z = h.s * 0.12 * Math.sin(t * f + 0.6); }
  }
  dispose() { this.root.removeFromParent(); for (const h of this.halves) h.children[0].geometry.dispose(); this.mat.dispose(); }
}

// ---------------------------------------------------------------- нимб и сферы
export const EXTRAS = {
  halo: { col: 0xffd060 }, halo_void: { col: 0xb060ff }, orbs: { col: 0x60d0ff, n: 3 }, orbs_fire: { col: 0xff7020, n: 3 }, crown: { col: 0xff5a10 },
};
export class Extra {
  constructor(kind, scene, headBone, o = {}) {
    const E = EXTRAS[kind] || EXTRAS.halo; this.kind = kind; this.E = E; this.scene = scene;
    const col = C3(E.col).multiplyScalar(2.2);
    this.mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    if (kind.startsWith('halo')) {
      this.root = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 32), this.mat); this.root.rotation.x = Math.PI / 2; this.root.position.set(0, o.y ?? 0.42, o.z ?? -0.02); this.y0 = this.root.position.y;
      headBone.add(this.root);
    } else if (kind === 'crown') {
      // корона из языков пламени над головой
      const g = mergeGeometries(Array.from({ length: 7 }, (_, i) => { const c = new THREE.ConeGeometry(0.035, 0.16 + (i % 2) * 0.07, 4); const a = i / 7 * Math.PI * 2; c.translate(Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15); return c; }));
      this.root = new THREE.Mesh(g, this.mat); this.root.position.set(0, o.y ?? 0.34, o.z ?? 0); this.y0 = this.root.position.y; if (o.scale) this.root.scale.setScalar(o.scale); this.s0 = this.root.scale.x; headBone.add(this.root);
    } else {
      this.root = new THREE.Group(); this.orbs = [];
      for (let i = 0; i < (E.n || 3); i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), this.mat); this.root.add(m); this.orbs.push(m); }
      scene.add(this.root);
      this.motes = new Motes(scene, 40, { colA: E.col, colB: E.col, grav: 0, drag: 2, size: 0.09, k: 1.4 });
    }
    this.root.userData.noOutline = true;
  }
  update(dt, x, y) {
    const t = U.uTime.value;
    if (this.orbs) {
      this.orbs.forEach((m, i) => { const a = t * 1.8 + i * Math.PI * 2 / this.orbs.length; m.position.set(x + Math.cos(a) * 0.75, 1.2 + Math.sin(t * 2.3 + i * 2) * 0.18, y + Math.sin(a) * 0.75); if (Math.random() < 0.5) this.motes.emit(m.position.x, m.position.y, m.position.z, 0, 0, 0, 0.45); });
      this.motes.update(dt);
    } else if (this.kind.startsWith('halo')) { this.root.rotation.z = t * 0.6; this.root.position.y += (this.y0 + Math.sin(t * 2) * 0.02 - this.root.position.y) * 0.5; }
    else { this.root.rotation.y = t * 0.8; this.root.scale.y = this.s0 * (1 + Math.sin(t * 9) * 0.12); this.root.position.y = this.y0 + Math.sin(t * 2) * 0.025; }   // корона парит над головой, как нимб
  }
  dispose() { this.root.removeFromParent(); this.root.traverse(o => o.geometry && o.geometry.dispose()); this.mat.dispose(); if (this.motes) this.motes.dispose(); }
}

// искры питомца (PET_MOTES в models/pet/pets.js): точка at в системе питомца, поворот — yaw актёра, масштаб — модели
export function petMotes(scene, M) { const m = new Motes(scene, 40, M); m.acc = 0; return m; }
export function emitPet(m, M, dt, x, y, yaw, scale = 1) {
  m.acc += dt * M.rate;
  const c = Math.cos(yaw), s = Math.sin(yaw), [ax, ay, az] = M.at;
  while (m.acc >= 1) {
    m.acc--; const wx = x + (ax * c + az * s) * scale, wz = y + (-ax * s + az * c) * scale, r = M.sp;
    m.emit(wx + (Math.random() - 0.5) * r, ay * scale + (Math.random() - 0.5) * r, wz + (Math.random() - 0.5) * r, (Math.random() - 0.5) * 0.3, M.up + Math.random() * 0.4, (Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.6);
  }
  m.update(dt);
}

// ---------------------------------------------------------------- оружие героя (облик, в духе PoE)
// Оружие — часть модели героя (glbskin.js), поэтому точки клинка/посоха/лука берутся из самой сетки: вершины, привязанные к кости кисти
// дальше кулака. Частицы летят из случайных точек оружия, вдоль него — 3 светящихся пятна на кости. Цена: 1 Points + 3 спрайта.
// rate — частиц в секунду (в ударе вдвое больше), v — скорость вверх, sp — разброс скорости, life — жизнь частицы, glow — свет пятен
export const WEAPON_FX = {
  fire:   { colA: 0xffd070, colB: 0xff2a00, grav: -2.2, drag: 1, size: 0.13, k: 2.2, rate: 45, v: 0.5, sp: 0.25, life: 0.6, glow: 0xff5a10, gk: 1.1 },
  blood:  { colA: 0xff2a30, colB: 0x500008, grav: 4, drag: 0.5, size: 0.08, k: 2.0, rate: 22, v: -0.1, sp: 0.1, life: 0.7, glow: 0xb00010, gk: 0.8 },
  frost:  { colA: 0xe8faff, colB: 0x2a70ff, grav: -0.3, drag: 1.5, size: 0.11, k: 1.8, rate: 28, v: 0.1, sp: 0.2, life: 0.9, glow: 0x60c8ff, gk: 0.9 },
  storm:  { colA: 0xf0f6ff, colB: 0x4050ff, grav: 0, drag: 6, size: 0.09, k: 2.6, rate: 60, v: 0, sp: 2.2, life: 0.16, glow: 0x90a8ff, gk: 1.2, flicker: true },
  void:   { colA: 0xd890ff, colB: 0x22003a, grav: -0.6, drag: 1, size: 0.15, k: 1.7, rate: 26, v: 0.15, sp: 0.15, life: 1.0, glow: 0x9030ff, gk: 0.9, wobble: 0.35 },
  holy:   { colA: 0xfff4c0, colB: 0xffa020, grav: -0.5, drag: 1, size: 0.08, k: 2.2, rate: 32, v: 0.2, sp: 0.3, life: 0.8, glow: 0xffd060, gk: 1.3 },
  poison: { colA: 0xc8ff70, colB: 0x1c6000, grav: 1.2, drag: 1, size: 0.1, k: 1.8, rate: 24, v: 0.1, sp: 0.12, life: 0.8, glow: 0x60ff30, gk: 0.8 },
};
const _w = new THREE.Vector3(), _m4 = new THREE.Matrix4();
export class WeaponFx {
  constructor(kind, scene, root, boneName) {
    const K = WEAPON_FX[kind] || WEAPON_FX.fire; this.K = K; this.kind = kind; this.acc = 0;
    let mesh = null; root.traverse(o => { if (!mesh && o.isSkinnedMesh && !o.userData.isOutline) mesh = o; });
    const bi = mesh ? mesh.skeleton.bones.findIndex(b => b.name === boneName) : -1;
    this.bone = bi >= 0 ? mesh.skeleton.bones[bi] : null; this.pts = []; this.glows = [];
    if (this.bone) {
      // вершины оружия в системе кости: boneInverse × bindMatrix × вершина; берём дальше кулака
      const g = mesh.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
      _m4.multiplyMatrices(mesh.skeleton.boneInverses[bi], mesh.bindMatrix);
      const all = []; let far = 0;
      for (let i = 0; i < P.count; i++) {
        let w = 0; for (let c = 0; c < 4; c++) if (SI.getComponent(i, c) === bi) w += SW.getComponent(i, c);
        if (w < 0.6) continue;
        const v = new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(_m4); all.push(v); far = Math.max(far, v.length());
      }
      const r0 = Math.max(0.12, far * 0.25), step = Math.max(1, Math.floor(all.length / 300));
      for (let i = 0; i < all.length; i += step) if (all[i].length() > r0) this.pts.push(all[i]);
      // светящиеся пятна: вдоль оружия от одного конца до другого (меч — от гарды к острию, посох и лук — оба конца)
      const tip = this.pts.reduce((a, b) => b.length() > a.length() ? b : a, new THREE.Vector3(0, 0.01, 0)), dir = tip.clone().normalize();
      const lo = this.pts.reduce((a, b) => b.dot(dir) < a.dot(dir) ? b : a, tip);
      for (const f of [0.15, 0.5, 0.85]) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: C3(K.glow).multiplyScalar(K.gk), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false }));
        s.position.lerpVectors(lo, tip, f); s.scale.setScalar(0.4); s.userData.noOutline = true; s.renderOrder = 5; this.bone.add(s); this.glows.push(s);
      }
    }
    this.motes = new Motes(scene, 96, { ...K, size: K.size * 1.4 });
  }
  update(dt, attack) {
    if (!this.bone || !this.pts.length) return;
    const K = this.K, t = U.uTime.value; this.bone.updateWorldMatrix(true, false);
    this.acc += dt * K.rate * (attack ? 2 : 1);
    while (this.acc >= 1) {
      this.acc--; _w.copy(this.pts[(Math.random() * this.pts.length) | 0]).applyMatrix4(this.bone.matrixWorld);
      const s = K.sp; this.motes.emit(_w.x, _w.y, _w.z, (Math.random() - 0.5) * s, K.v + (Math.random() - 0.5) * s, (Math.random() - 0.5) * s, K.life * (0.6 + Math.random() * 0.6));
    }
    this.motes.update(dt);
    for (let i = 0; i < this.glows.length; i++) this.glows[i].material.opacity = K.flicker ? (Math.random() < 0.3 ? 1 : 0.35) : 0.75 + 0.25 * Math.sin(t * 6 + i * 2);
  }
  dispose() { for (const s of this.glows) { s.removeFromParent(); s.material.dispose(); } this.motes.dispose(); }
}
