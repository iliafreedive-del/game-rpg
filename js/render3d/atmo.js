// Атмосфера деревни: полупрозрачный дым из труб — клубы с размытым краем и шумом, повёрнутые к камере, их сносит ветром.
// Туман у земли — не здесь: он считается в шейдерах (toon.js HFOG_F), плавно, без резкой границы на предметах.
import * as THREE from '../vendor/three.module.min.js';
import { U } from './toon.js';
import { noiseTex } from './textures.js';

const VS = /* glsl */`
#include <common>
#include <fog_pars_vertex>
attribute vec3 iPos; attribute float iSize; attribute float iAlpha; attribute float iSeed; attribute vec3 iCol;
uniform float uFlat;
varying vec2 vUv; varying float vAlpha; varying float vSeed; varying vec3 vCol;
void main() {
  vUv = uv; vAlpha = iAlpha; vSeed = iSeed; vCol = iCol;
  float a = iSeed * 6.283, c = cos(a), s = sin(a);
  vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y) * iSize;
  vec4 mvPosition;
  if (uFlat > 0.5) mvPosition = viewMatrix * vec4(iPos + vec3(q.x, 0.0, q.y), 1.0);
  else { mvPosition = viewMatrix * vec4(iPos, 1.0); mvPosition.xy += q; }
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FS = /* glsl */`
#include <common>
#include <fog_pars_fragment>
uniform sampler2D tNoise; uniform float uTime; uniform vec3 uLight;
varying vec2 vUv; varying float vAlpha; varying float vSeed; varying vec3 vCol;
void main() {
  vec2 p = vUv - 0.5; float r = length(p) * 2.0;
  float n = texture2D(tNoise, vUv * 0.55 + vec2(vSeed * 7.3, vSeed * 3.1) + uTime * 0.008).r * 0.65 + texture2D(tNoise, vUv * 1.3 - vec2(vSeed * 2.1, uTime * 0.012)).g * 0.35;
  float a = smoothstep(1.0, 0.25, r + (n - 0.5) * 0.7) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol * uLight * (0.86 + n * 0.28), a);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

function makeLayer(n, flat) {
  const g = new THREE.InstancedBufferGeometry(); const base = new THREE.PlaneGeometry(1, 1);
  g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
  const A = { iPos: new Float32Array(n * 3), iSize: new Float32Array(n), iAlpha: new Float32Array(n), iSeed: new Float32Array(n), iCol: new Float32Array(n * 3) };
  for (const [k, v] of Object.entries(A)) g.setAttribute(k, new THREE.InstancedBufferAttribute(v, k === 'iPos' || k === 'iCol' ? 3 : 1).setUsage(THREE.DynamicDrawUsage));
  g.instanceCount = n;
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tNoise: { value: null }, uTime: { value: 0 }, uFlat: { value: flat ? 1 : 0 }, uLight: { value: new THREE.Color(1, 1, 1) } }]) });
  m.uniforms.tNoise.value = noiseTex(); m.uniforms.uTime = U.uTime;
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 5; mesh.userData.noOutline = true;
  return { mesh, A, g, n };
}
const fract = x => x - Math.floor(x);
const h1 = i => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);

export class Atmo {
  constructor(scene, zone, smoke = []) {
    this.scene = scene; this.zone = zone; this.k = 1;
    // дым: по 14 клубов на трубу, цикл ~7 с; дымоход горна темнее и гуще
    this.pipes = smoke.map((s, i) => ({ p: s.p, dark: s.dark, ph: h1(i + 3) }));
    this.PER = 14;
    this.smoke = this.pipes.length ? makeLayer(this.pipes.length * this.PER, false) : null;
    if (this.smoke) scene.add(this.smoke.mesh);
  }
  setQuality(q) { this.k = q === 'low' ? 0.5 : q === 'med' ? 0.8 : 1; }
  update(dt, t, cx, cz, px, pz) {
    const wind = U.uWind ? U.uWind.value : { x: 1, y: 0 }, ws = U.uWindStr ? U.uWindStr.value : 1;
    if (this.smoke) {
      const { A, g } = this.smoke, P = this.PER;
      this.pipes.forEach((pp, j) => {
        for (let i = 0; i < P; i++) {
          const k = j * P + i, age = fract(t / 7 + i / P + pp.ph), e = age * age;
          const sway = Math.sin(t * 0.7 + i * 1.7 + j) * 0.25 * age;
          A.iPos[k * 3] = pp.p.x + (wind.x * ws * 0.9 + 0.35) * e * 3.2 + sway;
          A.iPos[k * 3 + 1] = pp.p.y + age * 4.2;
          A.iPos[k * 3 + 2] = pp.p.z + (wind.y * ws * 0.9 - 0.2) * e * 3.2 + sway * 0.6;
          A.iSize[k] = 0.45 + age * 2.3;
          A.iAlpha[k] = Math.min(1, age * 9) * (1 - age) * (pp.dark ? 0.42 : 0.3) * this.k;
          A.iSeed[k] = h1(k) + age * 0.15;
          const c = pp.dark ? 0.55 : 0.86 - age * 0.06; A.iCol.set([c, c * 0.98, c * 0.95], k * 3);
        }
      });
      for (const n of ['iPos', 'iSize', 'iAlpha', 'iSeed', 'iCol']) g.attributes[n].needsUpdate = true;
    }
  }
  dispose() { for (const L of [this.smoke]) if (L) { L.mesh.removeFromParent(); L.g.dispose(); } }   // материал не освобождаем: иначе его шейдер компилируется заново при каждом возвращении в деревню (сборка 46)
}
