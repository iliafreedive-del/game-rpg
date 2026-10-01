// Постобработка 3D: сцена рисуется в HDR-цель (MSAA на высоком качестве), затем bloom (яркие места → цепочка уменьшений
// и размытий «dual filter»), затем итоговый проход: экспозиция, мягкая кривая тонов, цветокоррекция (холодные тени,
// тёплые света), насыщенность, контраст, виньетка, лёгкая дымка по глубине. Все числа — POST в style.js.
// На низком качестве постобработка выключена: сцена рисуется прямо на экран.
import * as THREE from '../vendor/three.module.min.js';
import { POST } from './style.js';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

// яркие места с мягким порогом
const BRIGHT = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThr; uniform float uKnee; varying vec2 vUv;
void main(){
  vec3 c = vec3(0.0);
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb; c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb;  c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float s = clamp(l - uThr + uKnee, 0.0, 2.0 * uKnee); s = s * s / (4.0 * uKnee + 1e-4);
  float w = max(s, l - uThr) / max(l, 1e-4);
  gl_FragColor = vec4(min(c * w, vec3(8.0)), 1.0);
}`;
// уменьшение «dual filter» (Kawase): 5 выборок
const DOWN = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb; c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb;  c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c / 8.0, 1.0);
}`;
// увеличение: 8 выборок + слой этого уровня
const UP = /* glsl */`
uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec2 h = uTexel;
  vec3 c = texture2D(tSrc, vUv + vec2(-h.x * 2.0, 0.0)).rgb + texture2D(tSrc, vUv + vec2(h.x * 2.0, 0.0)).rgb
         + texture2D(tSrc, vUv + vec2(0.0, -h.y * 2.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, h.y * 2.0)).rgb;
  c += (texture2D(tSrc, vUv + vec2(-h.x, h.y)).rgb + texture2D(tSrc, vUv + vec2(h.x, h.y)).rgb
      + texture2D(tSrc, vUv + vec2(-h.x, -h.y)).rgb + texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb) * 2.0;
  gl_FragColor = vec4(c / 12.0 + texture2D(tAdd, vUv).rgb, 1.0);
}`;
const FINAL = /* glsl */`
uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uBloom; uniform float uExposure; uniform float uContrast; uniform float uSat;
uniform vec3 uShadowTint; uniform vec3 uHighTint; uniform float uVignette; uniform vec2 uRes; uniform float uGrain; uniform float uTime;
varying vec2 vUv;
vec3 curve(vec3 x){ // мягкая плёночная кривая (Хейбл-подобная), белая точка ≈ 4
  const float A = 0.22, B = 0.30, C = 0.10, D = 0.20, E = 0.01, F = 0.30;
  vec3 y = ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
  float w = 4.0; float wy = ((w * (A * w + C * B) + D * E) / (w * (A * w + B) + D * F)) - E / F;
  return y / wy;
}
void main(){
  vec3 c = texture2D(tScene, vUv).rgb;
  c += texture2D(tBloom, vUv).rgb * uBloom;
  c = curve(c * uExposure);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // раздельное тонирование: холодная бирюза в тенях, тёплое золото в светах
  c *= mix(uShadowTint, vec3(1.0), smoothstep(0.0, 0.45, l));
  c = mix(c, c * uHighTint, smoothstep(0.35, 0.95, l));
  l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c = clamp((c - 0.5) * uContrast + 0.5 + (c - c * c) * 0.0, 0.0, 1.0);
  vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y * 0.75;
  c *= 1.0 - uVignette * smoothstep(0.35, 0.95, length(q));
  float n = fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  c += n * uGrain;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export class Post {
  constructor(renderer) {
    this.r = renderer; this.on = false; this.w = 1; this.h = 1; this.samples = 0;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad);
    const sm = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
    this.mBright = sm(BRIGHT, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: POST.bloom.threshold }, uKnee: { value: POST.bloom.knee } });
    this.mDown = sm(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mUp = sm(UP, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mFinal = sm(FINAL, {
      tScene: { value: null }, tBloom: { value: null }, uBloom: { value: POST.bloom.strength }, uExposure: { value: POST.exposure },
      uContrast: { value: POST.contrast }, uSat: { value: POST.saturation }, uShadowTint: { value: new THREE.Color(POST.shadowTint) },
      uHighTint: { value: new THREE.Color(POST.highTint) }, uVignette: { value: POST.vignette }, uRes: { value: new THREE.Vector2(1, 1) },
      uGrain: { value: POST.grain }, uTime: { value: 0 },
    });
    this.rt = null; this.mips = [];
  }
  // levels — сколько ступеней bloom (0 — без bloom), samples — MSAA
  setup(w, h, { enabled, samples = 0, levels = 4 }) {
    this.on = enabled; this.w = w; this.h = h;
    for (const t of [this.rt, ...this.mips.flat()]) if (t) t.dispose();
    this.rt = null; this.mips = []; if (!enabled) return;
    const type = THREE.HalfFloatType;
    this.rt = new THREE.WebGLRenderTarget(w, h, { type, samples, depthBuffer: true });
    this.levels = levels;
    let mw = w, mh = h;
    for (let i = 0; i < levels; i++) {
      mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1);
      const o = { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
      this.mips.push([new THREE.WebGLRenderTarget(mw, mh, o), new THREE.WebGLRenderTarget(mw, mh, o)]);
    }
    this.mFinal.uniforms.uRes.value.set(w, h);
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.scene, this.cam); }
  render(scene, camera, t) {
    const r = this.r;
    if (!this.on) { r.setRenderTarget(null); r.render(scene, camera); return; }
    r.setRenderTarget(this.rt); r.render(scene, camera);
    let bloomTex = null;
    if (this.levels) {
      const M = this.mips;
      this.mBright.uniforms.tSrc.value = this.rt.texture; this.mBright.uniforms.uTexel.value.set(0.5 / this.w, 0.5 / this.h);
      this.pass(this.mBright, M[0][0]);
      for (let i = 1; i < M.length; i++) {
        const src = M[i - 1][0]; this.mDown.uniforms.tSrc.value = src.texture; this.mDown.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
        this.pass(this.mDown, M[i][0]);
      }
      // вверх: на каждом уровне добавляем размытый нижний
      let cur = M[M.length - 1][0];
      for (let i = M.length - 2; i >= 0; i--) {
        this.mUp.uniforms.tSrc.value = cur.texture; this.mUp.uniforms.tAdd.value = M[i][0].texture; this.mUp.uniforms.uTexel.value.set(0.5 / cur.width, 0.5 / cur.height);
        this.pass(this.mUp, M[i][1]); cur = M[i][1];
      }
      bloomTex = cur.texture;
    }
    const F = this.mFinal.uniforms;
    F.tScene.value = this.rt.texture; F.tBloom.value = bloomTex || this.rt.texture; F.uBloom.value = bloomTex ? POST.bloom.strength : 0; F.uTime.value = t % 100;
    this.pass(this.mFinal, null);
  }
  dispose() { this.setup(1, 1, { enabled: false }); }
}
