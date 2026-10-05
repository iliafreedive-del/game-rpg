// Земля деревни из карты зоны: цвет вершин (трава, тропа, брусчатка, лес, вода), булыжник instanced-камнями, ветровая трава.
// Без текстур. Шейдеры травы перенесены из lab/three/js/world.js.
import * as THREE from '../vendor/three.module.min.js';
import { U, toon, HFOG_F, hfogTex } from './toon.js';
import { rng, fbm, noise, paint, merge } from './geo.js';
import { noiseTex, grassTex, dirtTex, mossTex, flagTex } from './textures.js';
import { GRASS, GRASS_K, SHADOW } from './style.js';

const GRASS_VS = /* glsl */`
#include <common>
#include <fog_pars_vertex>
attribute float aRand;
uniform float uTime; uniform vec2 uWind; uniform float uWindStr;
uniform vec4 uBlobs[12]; uniform mat4 uShadowMat; uniform sampler2D tNoise;
varying float vH; varying float vRand; varying float vSheen; varying float vShade; varying vec4 vSh; varying float vPatch; varying float vBlade; varying vec3 hfWv;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 root = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float t = uv.y, bend = t * t;
  float gust = sin(dot(root.xz, uWind) * 0.35 - uTime * 1.9) * 0.5 + 0.5; gust = gust * gust;
  float flick = sin(uTime * 4.0 + aRand * 40.0 + root.x * 0.7) * 0.12;
  vec2 off = uWind * (0.12 + gust * 0.55 + flick) * uWindStr * bend * 0.6;
  vShade = 0.0;
  for (int i = 0; i < 12; i++) {
    vec4 b = uBlobs[i]; vec2 d = root.xz - b.xy; float dist = length(d);
    float push = 1.0 - smoothstep(0.0, b.z * 1.6, dist);
    off += (d / (dist + 0.001)) * push * 0.55 * bend * b.w;
    vShade = max(vShade, (1.0 - smoothstep(b.z * 0.3, b.z, dist)) * b.w);
  }
  wp.xz += off; wp.y -= dot(off, off) * 0.6 * t; hfWv = wp.xyz;
  vSh = uShadowMat * vec4(root.x, 0.05 + t * 0.15, root.z, 1.0);
  vH = t; vRand = aRand; vSheen = gust * uWindStr; vBlade = uv.x;
  vPatch = texture2D(tNoise, root.xz * 0.03).r;
  vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const GRASS_FS = /* glsl */`
#include <common>
#include <fog_pars_fragment>
#include <packing>
uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uDry; uniform vec3 uLight; varying vec3 hfWv;
uniform float uHFog; uniform vec3 uHFogCol; uniform sampler2D tHNoise; uniform float uHTime; uniform vec3 uHFogC;
uniform sampler2D uShadowMap; uniform float uShadowOn; uniform float uShadowDark; uniform vec2 uShadowTexel;
varying float vH; varying float vRand; varying float vSheen; varying float vShade; varying vec4 vSh; varying float vPatch; varying float vBlade;
float shadowLit() {
  if (uShadowOn < 0.5) return 1.0;
  vec3 c = vSh.xyz / vSh.w;
  if (c.x < 0.0 || c.y < 0.0 || c.x > 1.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
  float s = 0.0, z = c.z - 0.002;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += step(z, unpackRGBAToDepth(texture2D(uShadowMap, c.xy + vec2(float(i), float(j)) * uShadowTexel * 1.5)));
  return s / 9.0;
}
void main() {
  float rb = fract(vRand * 7.31 + vBlade * 3.17);
  vec3 tip = mix(uTip, uDry, smoothstep(0.82, 1.0, rb) * 0.7) * (0.85 + rb * 0.3);
  vec3 c = mix(uBase, tip, smoothstep(0.05, 1.0, vH));
  c *= mix(vec3(0.62, 0.74, 0.62), vec3(1.32, 1.25, 0.82), smoothstep(0.25, 0.8, vPatch));   // те же пятна, что на земле
  c += vSheen * vH * vH * 0.08;
  c *= (1.0 - vShade * 0.4);
  c *= mix(uShadowDark, 1.0, shadowLit());
  gl_FragColor = vec4(c * uLight, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
  { vec3 hfW = hfWv;
  HFOG_F_HERE }
}`.replace('HFOG_F_HERE', HFOG_F);
// пучок травы: 4 изогнутых травинок веером (у каждой 3 треугольника); uv.x — номер травинки (для оттенка), uv.y — высота
// колос (ear > 0): травинки толще, верхушка — вытянутый колос шириной ear
function clumpGeometry(nb = 4, ear = 0) {
  const P = [], UV = [], I = [], R = rng(5);
  for (let b = 0; b < nb; b++) {
    const a = b / nb * 6.283 + R() * 0.8, lean = (ear ? 0.06 : 0.12) + R() * 0.22, h = 0.65 + R() * 0.45, w = ear ? 0.03 + R() * 0.012 : 0.05 + R() * 0.025, ox = Math.cos(a) * 0.05, oz = Math.sin(a) * 0.05;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, o = P.length / 3, id = b / 5;
    const pt = (t, side) => { const ww = (ear && t > 0.6 ? ear * (1 - Math.abs(t - 0.8) * 3) : w * (1 - t * 0.85)) * side, bend = lean * t * t; P.push(ox + dx * bend * h + px * ww, h * t * (1 - lean * 0.3 * t), oz + dz * bend * h + pz * ww); UV.push(id, t); };
    pt(0, -1); pt(0, 1); pt(0.5, -1); pt(0.5, 1); pt(1, 0);
    I.push(o, o + 1, o + 2, o + 2, o + 1, o + 3, o + 2, o + 3, o + 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I);
  return g;
}

// материал земли: toon (свет, тени, туман) + рисованные текстуры по маскам типов. aKind = веса (трава, тропа, брусчатка, лес);
// край тропы рвёт шум, вдоль края — тёмная кромка (трава нависает над землёй), крупные пятна шума — солнечные и тенистые участки
function groundMaterial(snow = false, forest = false, puddles = 1, steppe = false) {
  const m = toon(0xffffff, { vc: true, rim: 0.05 });
  const T = { tNoise: { value: noiseTex() }, tGrass: { value: grassTex() }, tDirt: { value: dirtTex() }, tMoss: { value: mossTex() }, tFlag: { value: flagTex() }, uSnow: { value: snow ? 1 : 0 }, uForest: { value: forest ? 1 : 0 }, uSteppe: { value: steppe ? 1 : 0 }, uPud: { value: puddles } };
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = sh => {
    prev(sh); Object.assign(sh.uniforms, T);
    sh.vertexShader = 'attribute vec4 aKind; attribute float aPath; varying vec4 vKind; varying float vPath; varying vec2 vGW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvKind = aKind; vPath = aPath; vGW = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = 'uniform sampler2D tNoise, tGrass, tDirt, tMoss, tFlag; uniform float uSnow, uForest, uSteppe, uPud; varying vec4 vKind; varying float vPath; varying vec2 vGW;\n' + sh.fragmentShader.replace('#include <color_fragment>', /* glsl */`
#include <color_fragment>
{
  vec2 wp = vGW;
  vec4 nz = texture2D(tNoise, wp * 0.03), nz2 = texture2D(tNoise, wp * 0.13 + 0.37);
  vec3 gr = mix(texture2D(tGrass, wp * 0.21).rgb, texture2D(tGrass, wp * 0.083 + 0.5).rgb, 0.4);
  gr *= mix(vec3(0.62, 0.74, 0.62), vec3(1.32, 1.25, 0.82), smoothstep(0.25, 0.8, nz.r));      // тенистые и солнечные пятна
  vec3 dt = mix(texture2D(tDirt, wp * 0.17).rgb, texture2D(tDirt, wp * 0.061 + 0.21).rgb, 0.3) * (0.85 + nz.g * 0.3);
  vec3 ms = texture2D(tMoss, wp * 0.27).rgb * (0.8 + nz.r * 0.5);
  if (uSnow > 0.5) {   // Фьорды: снег с голубыми тенями, камень и наст под соснами, утоптанная снежная каша на тропах
    float sn = texture2D(tNoise, wp * 0.09).g;
    gr = mix(vec3(0.82, 0.88, 0.95), vec3(0.98, 1.0, 1.0), smoothstep(0.3, 0.75, nz.r)) * (0.92 + sn * 0.1);
    gr = mix(gr, vec3(0.6, 0.72, 0.86), smoothstep(0.55, 0.8, nz2.g) * 0.55);
    ms = mix(vec3(0.3, 0.34, 0.42) * (0.8 + nz.r * 0.5), gr * 0.9, step(0.56, nz2.r) * 0.85);
    dt = mix(vec3(0.46, 0.42, 0.4), vec3(0.74, 0.74, 0.76), nz.g) * (0.85 + nz2.r * 0.3);
  }
  if (uForest > 0.5) {   // Старый Лес: светлый жёлто-зелёный луг, бурая подстилка под деревьями и тёплые коричневые тропы — земля не сливается с кронами
    gr = mix(vec3(0.46, 0.6, 0.22), vec3(0.7, 0.76, 0.32), smoothstep(0.3, 0.75, nz.r)) * (0.9 + texture2D(tGrass, wp * 0.21).g * 0.3);
    gr = mix(gr, vec3(0.5, 0.58, 0.2), smoothstep(0.55, 0.8, nz2.g) * 0.4);
    ms = vec3(0.34, 0.23, 0.12) * (0.8 + nz.r * 0.6) + vec3(0.05, 0.04, 0.0) * step(0.6, nz2.r);
    dt = mix(vec3(0.5, 0.34, 0.19), vec3(0.68, 0.5, 0.28), nz.g) * (0.85 + nz2.r * 0.3);
  }
  if (uSteppe > 0.5) {   // Костяные пустоши: красная глина в трещинах, песчаные наносы, пятна сухой травы; тропы — пыльный песок, под скалами — щебень
    float drift = smoothstep(0.56, 0.74, texture2D(tNoise, wp * 0.045 + 0.7).g + (nz2.r - 0.5) * 0.2);
    vec3 clay = mix(vec3(0.46, 0.17, 0.08), vec3(0.68, 0.31, 0.15), smoothstep(0.25, 0.75, nz.r));
    vec3 sand = mix(vec3(0.76, 0.5, 0.3), vec3(0.88, 0.66, 0.42), nz2.g);
    float c1 = abs(texture2D(tNoise, wp * 0.31 + 0.13).r - 0.5), c2 = abs(texture2D(tNoise, wp * 0.67 + 0.51).g - 0.5);
    float crack = (1.0 - smoothstep(0.0, 0.025, c1)) + (1.0 - smoothstep(0.0, 0.018, c2)) * 0.6;
    gr = mix(clay, sand, drift);
    gr *= 1.0 - min(1.0, crack) * 0.42 * (1.0 - drift);
    gr = mix(gr, vec3(0.62, 0.5, 0.2) * (0.85 + nz.g * 0.3), smoothstep(0.52, 0.74, nz2.g) * 0.55 * (1.0 - drift));   // пятна сухой травы
    ms = mix(vec3(0.36, 0.17, 0.1), vec3(0.58, 0.3, 0.18), nz.g) * (0.85 + nz2.r * 0.3);
    dt = mix(vec3(0.76, 0.56, 0.36), vec3(0.9, 0.72, 0.5), nz.g) * (0.88 + nz2.r * 0.2);
  }
  float pm = smoothstep(0.44, 0.56, vKind.y + vKind.z * 0.8 + (nz2.g - 0.5) * 0.5 + (nz2.b - 0.5) * 0.3);
  float cm = smoothstep(0.3, 0.7, vKind.z + (nz2.b - 0.5) * 0.25);
  vec3 base = mix(gr, ms, smoothstep(0.2, 0.8, vKind.w + (nz.b - 0.5) * 0.4));
  // крупные пятна: выгоревшая трава и тёмные сырые участки (низкая частота, 90 м)
  float big = texture2D(tNoise, wp * 0.011 + 0.2).r;
  base *= mix(vec3(0.86, 0.95, 0.9), vec3(1.14, 1.08, 0.86), smoothstep(0.3, 0.7, big));
  vec3 col = mix(base, dt, pm);
  // колеи: две тёмные полосы вдоль тропы (контур размытого поля тропы), рядом — светлые валики
  float rutL = 1.0 - smoothstep(0.0, 0.05, abs(vPath - 0.74 + (nz2.b - 0.5) * 0.06));
  col *= 1.0 - 0.38 * rutL * pm; col *= 1.0 + 0.1 * (1.0 - smoothstep(0.0, 0.05, abs(vPath - 0.62))) * pm;
  // плитка площади: каменные плиты вместо земли, щели тёмные
  vec3 fl = texture2D(tFlag, wp * 0.33).rgb * vec3(1.3, 1.24, 1.08) * (0.8 + nz.g * 0.4);
  col = mix(col, fl, cm * 0.8);
  col = mix(col, col * vec3(0.5, 0.48, 0.44), cm * 0.25);                                          // щели брусчатки
  // лужи на тропе: тёмная вода с бликом неба, мокрая кромка
  float pn = texture2D(tNoise, wp * 0.07 + 0.6).g * 0.6 + nz2.g * 0.4;
  float pud = smoothstep(0.64 + (1.0 - uPud) * 0.1, 0.7 + (1.0 - uPud) * 0.1, pn) * smoothstep(0.4, 0.8, pm) * (1.0 - cm) * (1.0 - max(max(uSnow, uForest), uSteppe));
  vec3 wet = mix(vec3(0.09, 0.12, 0.15), vec3(0.4, 0.48, 0.54), smoothstep(0.35, 0.8, nz.b + nz2.r * 0.4 - 0.2));
  col = mix(col, col * 0.62, smoothstep(0.58 + (1.0 - uPud) * 0.1, 0.64 + (1.0 - uPud) * 0.1, pn) * (1.0 - pud) * pm);
  col = mix(col, wet, pud);
  // опавшие листья: в лесу густо, на траве и тропе редкие пятна; у каждого свой поворот и цвет
  vec2 cp = wp * 3.4, ci = floor(cp), cf = fract(cp) - 0.5;
  float h1 = fract(sin(dot(ci, vec2(12.9898, 78.233))) * 43758.5453), h2 = fract(h1 * 37.7 + 0.31);
  vec2 dl = cf - (vec2(h1, h2) - 0.5) * 0.45; float ca = h1 * 6.283;
  dl = vec2(cos(ca) * dl.x + sin(ca) * dl.y, -sin(ca) * dl.x + cos(ca) * dl.y);
  float leaf = 1.0 - smoothstep(0.7, 1.0, length(dl / vec2(0.16, 0.075)));
  float lm = (1.0 - uSnow) * (1.0 - uSteppe) * step(0.45, h2) * clamp(smoothstep(0.3, 0.8, vKind.w + (nz2.r - 0.5) * 0.3) + smoothstep(0.62, 0.8, nz.g) * 0.55, 0.0, 1.0) * (1.0 - pud) * (1.0 - cm);
  col = mix(col, mix(vec3(0.5, 0.2, 0.07), vec3(0.8, 0.58, 0.14), fract(h1 * 7.0)) * (0.65 + h2 * 0.6), leaf * lm * 0.92);
  float soil = clamp(-vPath, 0.0, 1.0);                                                         // пашня: борозды и тёмная влажная земля
  col *= 1.0 - soil * (0.22 + 0.2 * smoothstep(0.2, 0.9, sin(wp.x * 7.0 + nz.r * 2.0)));
  float edge = smoothstep(0.0, 0.35, pm) * (1.0 - smoothstep(0.35, 0.8, pm)) * (1.0 - soil);
  col *= 1.0 - 0.35 * edge;                                                                      // кромка тропы
  diffuseColor.rgb = col * diffuseColor.rgb;
}`);
  };
  m.customProgramCacheKey = () => 'ground';
  return m;
}

// вода: тёмная глубина к середине, бирюзовая у берега, рябь из шумовой текстуры, блики солнца, пена у кромки
function waterMaterial(x0, y0, x1, y1, ice = false) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, tNoise: { value: null }, uBox: { value: new THREE.Vector4(x0, y0, x1, y1) }, uIce: { value: ice ? 1 : 0 }, tDist: { value: null }, uDist: { value: 0 }, uSize: { value: new THREE.Vector2(1, 1) } }]),
    fog: true, transparent: false,
    vertexShader: `#include <common>\n#include <fog_pars_vertex>\nvarying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; vec4 mvPosition = viewMatrix * vec4(vW, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}`,
    fragmentShader: `#include <common>\n#include <fog_pars_fragment>\nuniform float uTime; uniform sampler2D tNoise; uniform vec4 uBox; uniform float uIce; uniform sampler2D tDist; uniform float uDist; uniform vec2 uSize; varying vec3 vW;
      uniform float uHFog; uniform vec3 uHFogCol; uniform sampler2D tHNoise; uniform float uHTime; uniform vec3 uHFogC;
      void main(){
        vec2 p = vW.xz, fl = vec2(0.0, uTime * 0.25 * uDist);   // ручей: рябь сносит течением
        float n1 = texture2D(tNoise, (p - fl) * 0.12 + vec2(uTime * 0.012, uTime * 0.007)).b, n2 = texture2D(tNoise, (p - fl * 1.4) * 0.19 - vec2(uTime * 0.009, -uTime * 0.013)).b;
        float rip = n1 + n2 - 1.0;
        vec2 c = (uBox.xy + uBox.zw) * 0.5, h = (uBox.zw - uBox.xy) * 0.5; float d = length((p - c) / h);
        if (uDist > 0.5) d = 1.0 - texture2D(tDist, p / uSize).r;   // глубина по расстоянию до берега
        vec3 deep = vec3(0.015, 0.07, 0.09), shallow = vec3(0.08, 0.32, 0.33);
        vec3 col = mix(shallow, deep, smoothstep(0.1, 0.75, 1.0 - d + rip * 0.2));
        float glint = smoothstep(0.32, 0.5, rip) * 0.9; col += vec3(1.0, 0.9, 0.7) * glint * 0.35;
        col += vec3(0.6, 0.8, 0.75) * smoothstep(0.55, 0.0, abs(rip)) * 0.03;
        if (uIce > 0.5) { vec3 si = vec3(0.7, 0.86, 0.95), di = vec3(0.34, 0.55, 0.74); col = mix(si, di, smoothstep(0.1, 0.8, 1.0 - d + rip * 0.3)); float cr = 1.0 - smoothstep(0.0, 0.025, abs(n1 - 0.5)); cr = max(cr, 1.0 - smoothstep(0.0, 0.02, abs(n2 - 0.52))); col = mix(col, vec3(0.95, 0.99, 1.0), cr * 0.75); col += vec3(1.0) * glint * 0.15; }
        if (uDist > 0.5) col += vec3(0.75, 0.85, 0.8) * smoothstep(0.7, 0.98, d) * smoothstep(0.1, 0.4, n2) * 0.35;   // пена у берега
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
        { vec3 hfW = vW;
` + HFOG_F + `}
      }`,
  });
}

// ';' — дорога за ручьём, 'b' — мост (под ним вода), 'F'/'V'/'K' — пашня полей деревни, 'n' — луг за ручьём
const kindOf = ch => ch === ',' || ch === ';' ? 'p' : ch === '#' ? 'c' : ch === 'x' ? 'f' : ch === '~' || ch === 'b' ? 'w' : ch === 'F' || ch === 'V' || ch === 'K' ? 's' : 'g';

export function buildGround(scene, zone, opts = {}) {
  hfogTex(); const m = zone.map, W = m.w, H = m.h, MARGIN = opts.margin ?? 3, STEP = 0.5, kOf = opts.kindOf || kindOf, snow = !!opts.snow, steppe = !!opts.steppe;
  // за краем карты: обычно лесная подстилка; в деревне — продолжение крайнего тайла (луг за рекой не обрывается тёмной полосой)
  const vil = !!zone.json.village, tile = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H) ? (vil ? kOf(m.rows[Math.max(0, Math.min(H - 1, ty))][Math.max(0, Math.min(W - 1, tx))]) : 'f') : kOf(m.rows[ty][tx]);
  // вес типа в точке: билинейная интерполяция «one-hot» поля по центрам тайлов
  const weights = (x, y) => {
    const fx = x - 0.5, fy = y - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0, w = { g: 0, p: 0, c: 0, f: 0, w: 0, s: 0 };
    w[tile(x0, y0)] += (1 - u) * (1 - v); w[tile(x0 + 1, y0)] += u * (1 - v); w[tile(x0, y0 + 1)] += (1 - u) * v; w[tile(x0 + 1, y0 + 1)] += u * v;
    if (vil) { w.g += w.f * 0.6; w.f *= 0.4; }   // деревня: подстилка в лесу по краям — травянистая, без чёрных провалов между деревьями
    return w;
  };
  const x0 = -MARGIN, nx = Math.round((W + 2 * MARGIN) / STEP), ny = Math.round((H + 2 * MARGIN) / STEP);
  const nv = (nx + 1) * (ny + 1), pos = new Float32Array(nv * 3), col = new Float32Array(nv * 4), kind = new Float32Array(nv * 4), pathF = new Float32Array(nv), idx = [];
  const bank = new THREE.Color(0x3a4a3a);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * STEP, z = x0 + j * STEP, k = j * (nx + 1) + i, w = weights(x, z), n = fbm(x * 0.5, z * 0.5);
    pos[k * 3] = x; pos[k * 3 + 1] = -0.2 * w.w + (n - 0.5) * 0.08 * (1 - w.c) - 0.04 * w.p; pos[k * 3 + 2] = z;
    const ww = Math.min(1, w.w * 1.6);   // берег темнеет к воде
    col.set([1 + (bank.r - 1) * ww, 1 + (bank.g - 1) * ww, 1 + (bank.b - 1) * ww, 1], k * 4);
    kind.set([w.g, w.p + w.s * 0.85, w.c, w.f], k * 4);
    let pf = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) pf += weights(x + a * 0.8, z + b * 0.8).p; pathF[k] = pf / 9 - w.s * 2;   // размытое поле тропы: контуры дают колеи; пашня — отрицательная (борозды)
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b2 = a + 1, c2 = a + nx + 1, d2 = c2 + 1; idx.push(a, c2, b2, b2, c2, d2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 4)); geo.setAttribute('aPath', new THREE.BufferAttribute(pathF, 1));
  geo.setIndex(idx); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, groundMaterial(snow, !!opts.forest, zone.json.village ? 0 : 1, steppe)); ground.userData.noOutline = true; ground.receiveShadow = true; scene.add(ground);
  // подложка до горизонта: тёмный мох, чтобы за краем карты не было пустоты
  // походы (сборка 45): вместо плоской подложки — остров над звёздной бездной (см. abyss ниже)
  const far = opts.abyss ? abyss(W, H, MARGIN, opts.abyss) : new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: opts.farColor ?? 0x0f2418 }));
  if (!opts.abyss) far.position.set(W / 2, -0.4, H / 2); scene.add(far);

  // вода: плоскость над впадиной; видна только там, где земля провалилась ниже -0.08, поэтому берег получается плавным
  let water = null; const wt = [];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (m.rows[ty][tx] === '~') wt.push([tx, ty]);
  if (wt.length) {
    let x0w = Math.min(...wt.map(t => t[0])) - 1, x1w = Math.max(...wt.map(t => t[0])) + 2, y0w = Math.min(...wt.map(t => t[1])) - 1, y1w = Math.max(...wt.map(t => t[1])) + 2;
    if (vil) { if (y0w < 0) y0w = -MARGIN; if (y1w > H) y1w = H + MARGIN; if (x0w < 0) x0w = -MARGIN; if (x1w > W) x1w = W + MARGIN; }   // деревня: ручей уходит за край карты, а не обрывается
    water = new THREE.Mesh(new THREE.PlaneGeometry(x1w - x0w, y1w - y0w).rotateX(-Math.PI / 2).translate((x0w + x1w) / 2, -0.08, (y0w + y1w) / 2), waterMaterial(x0w, y0w, x1w, y1w, snow));
    water.material.uniforms.uTime = U.uTime; water.material.uniforms.tNoise.value = noiseTex(); Object.assign(water.material.uniforms, { uHFog: U.uHFog, uHFogCol: U.uHFogCol, tHNoise: U.tHNoise, uHTime: U.uTime, uHFogC: U.uHFogC }); hfogTex();
    if (zone.json.village) {   // ручей деревни: глубина — по расстоянию до берега (текстура W×H), а не по эллипсу вокруг центра
      const d = new Float32Array(W * H).fill(0), isW = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? (m.rows[Math.max(0, Math.min(H - 1, y))][Math.max(0, Math.min(W - 1, x))] === '~') : m.rows[y][x] === '~' || m.rows[y][x] === 'b';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isW(x, y)) { let r = 9; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (!isW(x + dx, y + dy)) r = Math.min(r, Math.hypot(dx, dy)); d[y * W + x] = Math.min(1, (r - 0.5) / 1.6); }
      const px = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) { px[i * 4] = d[i] * 255; px[i * 4 + 3] = 255; }
      const tx = new THREE.DataTexture(px, W, H); tx.magFilter = tx.minFilter = THREE.LinearFilter; tx.needsUpdate = true;
      Object.assign(water.material.uniforms, { tDist: { value: tx }, uDist: { value: 1 }, uSize: { value: new THREE.Vector2(W, H) } });
    }
    water.userData.noOutline = true; scene.add(water);
  }

  // булыжник площади: instanced-камни 0.5 м
  const R = rng(11), stones = [];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if ((opts.stoneCh || '#').includes(m.rows[ty][tx])) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) stones.push([tx + 0.25 + a * 0.5 + (R() - 0.5) * 0.06, ty + 0.25 + b * 0.5 + (R() - 0.5) * 0.06]);
  let cob = null;
  if (stones.length) {
    const g = new THREE.DodecahedronGeometry(0.27, 0); g.scale(1, 0.26, 1);
    cob = new THREE.InstancedMesh(paint(g, 0x4a453a, { top: 0x9a917a }), toon(0xffffff, { vc: true, rim: 0.12 }), stones.length);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    stones.forEach(([x, z], i) => { mm.compose(p.set(x, 0.02, z), q.setFromEuler(e.set(0, R() * 6.28, 0)), s.set(0.85 + R() * 0.3, 0.7 + R() * 0.6, 0.85 + R() * 0.3)); cob.setMatrixAt(i, mm); cob.setColorAt(i, c.setScalar(0.75 + R() * 0.4)); });
    cob.userData.noOutline = true; cob.receiveShadow = true; scene.add(cob);
  }

  // трава: чанки 8×8 м (frustum culling по чанкам), плотность по весу типа «трава» и пятнам
  const grassU = {
    uTime: U.uTime, uWind: U.uWind, uWindStr: U.uWindStr,
    uBlobs: { value: Array.from({ length: 12 }, () => new THREE.Vector4(999, 999, 0.5, 0)) },
    uShadowMat: { value: new THREE.Matrix4() }, uShadowMap: { value: null }, uShadowOn: { value: 0 }, uShadowDark: { value: SHADOW.grassDark }, uShadowTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
    tNoise: { value: noiseTex() }, uHFog: U.uHFog, uHFogCol: U.uHFogCol, tHNoise: U.tHNoise, uHTime: U.uTime, uHFogC: U.uHFogC,
    uBase: { value: new THREE.Color(snow ? 0x8a9aa8 : steppe ? 0x6a4a1c : opts.forest ? 0x6a7a1c : GRASS.base) }, uTip: { value: new THREE.Color(snow ? 0xe8f2f8 : steppe ? 0xe8c878 : opts.forest ? 0xd8e060 : GRASS.tip) }, uDry: { value: new THREE.Color(snow ? 0xc8c0a8 : steppe ? 0xd89a4a : opts.forest ? 0xe0c070 : GRASS.dry) }, uLight: { value: new THREE.Color(1, 1, 1) },
  };
  const gmat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), vertexShader: GRASS_VS, fragmentShader: GRASS_FS, side: THREE.DoubleSide, fog: true });
  Object.assign(gmat.uniforms, grassU);
  const blade = clumpGeometry(), CS = 8, grass = [], MAXP = 270, RG = rng(23), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let cx = -1; cx * CS < W + CS; cx++) for (let cz = -1; cz * CS < H + CS; cz++) {
    const im = new THREE.InstancedMesh(blade.clone(), gmat, MAXP), rnd = new Float32Array(MAXP);
    let n = 0, guard = 0;
    while (n < MAXP && guard++ < MAXP * 6) {
      const x = (cx + RG()) * CS, z = (cz + RG()) * CS, w = weights(x, z);
      // гуще у краёв троп (трава нависает) и пятнами в поле; на тропе и площади — нет
      const edge = w.g * (w.p + w.c) * 4, patch = Math.min(1, Math.max(0, (fbm(x * 0.12 + 9, z * 0.12) - 0.32) * 3));
      const dens = (w.g * (0.25 + 0.75 * patch) + w.f * 0.45 + edge * 0.8) * (1 - Math.min(1, (w.p + w.c + w.s) * 1.6)) * (1 - w.w);
      if (RG() > dens * (snow ? 0.3 : 1) * (opts.grassK ?? 1) || (m.free && !m.free(x, z, 0.05))) continue;
      const tall = 0.22 + Math.pow(fbm(x * 0.21, z * 0.21), 2) * 0.35 + edge * 0.08, sc = 0.8 + RG() * 0.7;
      mm.compose(p.set(x, -0.02, z), q.setFromAxisAngle(up, RG() * 6.283), s.set(sc, tall * (0.7 + RG() * 0.6), sc)); im.setMatrixAt(n, mm); rnd[n] = RG(); n++;
    }
    if (!n) continue;
    im.geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 1));
    im.userData.max = n; im.count = n; im.userData.c = [(cx + 0.5) * CS, (cz + 0.5) * CS]; im.computeBoundingSphere(); im.boundingSphere.radius += 1;
    scene.add(im); grass.push(im);
  }
  // пшеница деревни: та же трава (ветер, тени), но золотые колосья по пояс на тайлах 'F', своими чанками
  const wheatTiles = []; for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (m.rows[ty][tx] === 'F') wheatTiles.push([tx, ty]);
  if (wheatTiles.length) {
    const wmat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), vertexShader: GRASS_VS, fragmentShader: GRASS_FS, side: THREE.DoubleSide, fog: true });
    Object.assign(wmat.uniforms, grassU, { uBase: { value: new THREE.Color(0x6a5a1c) }, uTip: { value: new THREE.Color(0xf2d27a) }, uDry: { value: new THREE.Color(0xd89a3a) } });
    const ear = clumpGeometry(6, 0.055), byChunk = new Map(), RW = rng(41);
    for (const [tx, ty] of wheatTiles) for (let k = 0; k < 9; k++) { const x = tx + RW(), z = ty + RW(), key = Math.floor(x / CS) + ',' + Math.floor(z / CS); if (!byChunk.has(key)) byChunk.set(key, []); byChunk.get(key).push([x, z]); }
    for (const [key, pts] of byChunk) {
      const im = new THREE.InstancedMesh(ear.clone(), wmat, pts.length), rnd = new Float32Array(pts.length), [cx, cz] = key.split(',').map(Number);
      pts.forEach(([x, z], i) => { const sc = 0.9 + RW() * 0.5, edge = Math.min(x % 1, 1 - x % 1, z % 1, 1 - z % 1); mm.compose(p.set(x, -0.02, z), q.setFromAxisAngle(up, RW() * 6.283), s.set(sc, 1.05 + RW() * 0.35 + fbm(x * 0.3, z * 0.3) * 0.3, sc)); im.setMatrixAt(i, mm); rnd[i] = RW(); });
      im.geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 1));
      im.userData.max = pts.length; im.count = pts.length; im.userData.c = [(cx + 0.5) * CS, (cz + 0.5) * CS]; im.computeBoundingSphere(); im.boundingSphere.radius += 1.5;
      scene.add(im); grass.push(im);
    }
  }
  let gk = 1;
  return {
    grassU,
    setQuality(q) { gk = GRASS_K[q] ?? 1; for (const g of grass) g.count = Math.floor(g.userData.max * gk); },
    // LOD: дальние чанки (верх кадра) реже — экземпляры перемешаны, поэтому обрезка счётчика прореживает равномерно
    lod(x, z) { for (const g of grass) { const [cx, cz] = g.userData.c, d = Math.hypot(cx - x, cz - z), f = 1 - 0.6 * Math.min(1, Math.max(0, (d - 10) / 16)); g.count = Math.floor(g.userData.max * gk * f); } },
    // трава — свой шейдер, поэтому тень направленного света она читает из shadow map сама
    shadow(light) {
      const sm = light.shadow, on = light.castShadow && !!sm.map;
      grassU.uShadowOn.value = on ? 1 : 0;
      if (on) { grassU.uShadowMap.value = sm.map.texture; grassU.uShadowMat.value.copy(sm.matrix); grassU.uShadowTexel.value.set(1 / sm.mapSize.x, 1 / sm.mapSize.y); }
    },
    update(blobs) { for (let i = 0; i < 12; i++) { const b = blobs[i], v = grassU.uBlobs.value[i]; if (b) v.set(b.x, b.z, b.r, b.w ?? 1); else v.set(999, 999, 0.5, 0); } },
    dispose() { if (far.userData.parts) for (const o of far.userData.parts) { o.geometry.dispose(); o.material.dispose(); } for (const o of [ground, far, water, cob, ...grass]) if (o) { o.removeFromParent(); o.geometry.dispose(); } },
  };
}

// ---------------------------------------------------------------- бездна за краем похода (сборка 45)
// Карта — парящий остров: от края земли вниз уходит скальный обрыв, под ним — тёмное небо со звёздами и туманностью.
// Дёшево: две плоские сетки (дно бездны 400×400 и лента обрыва по периметру), шейдеры без текстур, кроме общего noiseTex.
// Туман на них не действует — иначе бездна стала бы цветом тумана, а не космосом.
const ABYSS = {
  forest: { sky: 0x050c14, neb: 0x1d5a58, neb2: 0x3a2a6a, rock: 0x3b2c20, rim: 0x5a4a2a },
  fjord: { sky: 0x060c22, neb: 0x3a6ac0, neb2: 0x2aa088, rock: 0x7a8ca4, rim: 0xc8d8e8 },
  bones: { sky: 0x12060c, neb: 0x8a3020, neb2: 0x5a2a6a, rock: 0x7a3a22, rim: 0xb0703a },
};
function abyss(W, H, M, realm) {
  const P = ABYSS[realm] || ABYSS.forest, col = c => new THREE.Color(c), grp = new THREE.Group();
  const tn = noiseTex(); tn.wrapS = tn.wrapT = THREE.RepeatWrapping;
  // дно: звёзды по сетке 2,5 м (одна на клетку, если повезёт) + туманность из двух выборок шума
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(420, 420).rotateX(-Math.PI / 2).translate(W / 2, -38, H / 2), new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, tNoise: { value: tn }, uSky: { value: col(P.sky) }, uNeb: { value: col(P.neb) }, uNeb2: { value: col(P.neb2) } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform sampler2D tNoise; uniform vec3 uSky, uNeb, uNeb2; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float n1 = texture2D(tNoise, vP * 0.006 + vec2(uTime * 0.0015, 0.0)).r, n2 = texture2D(tNoise, vP * 0.011 + 0.37).g;
        vec3 c = uSky + uNeb * smoothstep(0.45, 0.85, n1) * 0.55 + uNeb2 * smoothstep(0.55, 0.9, n2) * 0.45;
        vec2 cell = floor(vP / 2.5), f = fract(vP / 2.5); float r = h(cell);
        if (r > 0.82) { vec2 sp = vec2(h(cell + 7.1), h(cell + 3.3)) * 0.7 + 0.15; float d = length(f - sp) * 2.5;
          float tw = 0.65 + 0.35 * sin(uTime * (1.5 + r * 3.0) + r * 40.0);
          c += mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.6), h(cell + 1.7)) * smoothstep(0.22 + (r - 0.82) * 1.2, 0.0, d) * tw * 1.3; }
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthWrite: false,
  }));
  sky.renderOrder = -10; sky.frustumCulled = false;
  // обрыв: лента по периметру земли, низ рваный и чуть уходит под остров; цвет — от породы к бездне, с полосами пластов
  const x0 = -M, z0 = -M, x1 = W + M, z1 = H + M, pts = [], STEP = 1;
  const edge = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / STEP); for (let i = 0; i < n; i++) pts.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]); };
  edge(x0, z0, x1, z0); edge(x1, z0, x1, z1); edge(x1, z1, x0, z1); edge(x0, z1, x0, z0); pts.push(pts[0]);
  const cx = W / 2, cz = H / 2, pos = [], uv = [], idx = [];
  pts.forEach(([x, z], i) => {
    const d = 7 + fbm(x * 0.21, z * 0.21) * 9 + (i % 3 === 0 ? 2.5 : 0), dx = cx - x, dz = cz - z, l = Math.hypot(dx, dz) || 1, t = 0.08 * d;   // почти отвесно: камера смотрит круто сверху, при сильном сужении обрыв прятался под островом
    pos.push(x, 0.02, z, x + dx / l * t, -d, z + dz / l * t); uv.push(i * STEP, 0, i * STEP, 1);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const cliff = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: { tNoise: { value: tn }, uRock: { value: col(P.rock) }, uRim: { value: col(P.rim) }, uSky: { value: col(P.sky) } },
    vertexShader: `varying vec2 vUv; varying float vY; void main(){ vUv = uv; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tNoise; uniform vec3 uRock, uRim, uSky; varying vec2 vUv; varying float vY;
      void main(){
        float n = texture2D(tNoise, vec2(vUv.x * 0.05, vY * 0.06)).b, m = texture2D(tNoise, vec2(vUv.x * 0.013, 0.5)).r, s = 0.7 + 0.3 * sin(vY * 2.2 + n * 10.0 + m * 6.0);
        vec3 c = uRock * s * (0.9 + 0.9 * n) * (1.0 + 0.6 * smoothstep(-3.0, 0.0, vY));   // пласты породы; ближе к кромке светлее
        c = mix(uRim, c, smoothstep(0.0, -0.5, vY));          // светлая кромка у самой земли
        c = mix(c, uSky, smoothstep(0.15, 1.0, vUv.y));        // книзу растворяется в бездне
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.DoubleSide,
  }));
  grp.add(sky, cliff); grp.userData.parts = [sky, cliff]; grp.userData.noOutline = true; sky.userData.noOutline = cliff.userData.noOutline = true;
  grp.geometry = { dispose() { } };   // общий dispose() земли ждёт у каждого объекта geometry
  return grp;
}
