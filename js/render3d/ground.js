// Земля деревни из карты зоны: цвет вершин (трава, тропа, брусчатка, лес, вода), булыжник instanced-камнями, ветровая трава.
// Без текстур. Шейдеры травы перенесены из lab/three/js/world.js.
import * as THREE from '../vendor/three.module.min.js';
import { U, toon } from './toon.js';
import { rng, fbm, noise, paint, merge } from './geo.js';
import { noiseTex, grassTex, dirtTex, mossTex } from './textures.js';
import { GRASS, GRASS_K, SHADOW } from './style.js';

const GRASS_VS = /* glsl */`
#include <common>
#include <fog_pars_vertex>
attribute float aRand;
uniform float uTime; uniform vec2 uWind; uniform float uWindStr;
uniform vec4 uBlobs[12]; uniform mat4 uShadowMat; uniform sampler2D tNoise;
varying float vH; varying float vRand; varying float vSheen; varying float vShade; varying vec4 vSh; varying float vPatch; varying float vBlade;
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
  wp.xz += off; wp.y -= dot(off, off) * 0.6 * t;
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
uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uDry; uniform vec3 uLight;
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
}`;
// пучок травы: 4 изогнутых травинок веером (у каждой 3 треугольника); uv.x — номер травинки (для оттенка), uv.y — высота
function clumpGeometry() {
  const P = [], UV = [], I = [], R = rng(5);
  for (let b = 0; b < 4; b++) {
    const a = b / 4 * 6.283 + R() * 0.8, lean = 0.12 + R() * 0.22, h = 0.65 + R() * 0.45, w = 0.05 + R() * 0.025, ox = Math.cos(a) * 0.05, oz = Math.sin(a) * 0.05;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, o = P.length / 3, id = b / 5;
    const pt = (t, side) => { const ww = w * (1 - t * 0.85) * side, bend = lean * t * t; P.push(ox + dx * bend * h + px * ww, h * t * (1 - lean * 0.3 * t), oz + dz * bend * h + pz * ww); UV.push(id, t); };
    pt(0, -1); pt(0, 1); pt(0.5, -1); pt(0.5, 1); pt(1, 0);
    I.push(o, o + 1, o + 2, o + 2, o + 1, o + 3, o + 2, o + 3, o + 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I);
  return g;
}

// материал земли: toon (свет, тени, туман) + рисованные текстуры по маскам типов. aKind = веса (трава, тропа, брусчатка, лес);
// край тропы рвёт шум, вдоль края — тёмная кромка (трава нависает над землёй), крупные пятна шума — солнечные и тенистые участки
function groundMaterial() {
  const m = toon(0xffffff, { vc: true, rim: 0.05 });
  const T = { tNoise: { value: noiseTex() }, tGrass: { value: grassTex() }, tDirt: { value: dirtTex() }, tMoss: { value: mossTex() } };
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = sh => {
    prev(sh); Object.assign(sh.uniforms, T);
    sh.vertexShader = 'attribute vec4 aKind; varying vec4 vKind; varying vec2 vGW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvKind = aKind; vGW = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = 'uniform sampler2D tNoise, tGrass, tDirt, tMoss; varying vec4 vKind; varying vec2 vGW;\n' + sh.fragmentShader.replace('#include <color_fragment>', /* glsl */`
#include <color_fragment>
{
  vec2 wp = vGW;
  vec4 nz = texture2D(tNoise, wp * 0.03), nz2 = texture2D(tNoise, wp * 0.13 + 0.37);
  vec3 gr = mix(texture2D(tGrass, wp * 0.21).rgb, texture2D(tGrass, wp * 0.083 + 0.5).rgb, 0.4);
  gr *= mix(vec3(0.62, 0.74, 0.62), vec3(1.32, 1.25, 0.82), smoothstep(0.25, 0.8, nz.r));      // тенистые и солнечные пятна
  vec3 dt = mix(texture2D(tDirt, wp * 0.17).rgb, texture2D(tDirt, wp * 0.061 + 0.21).rgb, 0.3) * (0.85 + nz.g * 0.3);
  vec3 ms = texture2D(tMoss, wp * 0.27).rgb * (0.8 + nz.r * 0.5);
  float pm = smoothstep(0.44, 0.56, vKind.y + vKind.z * 0.8 + (nz2.g - 0.5) * 0.5 + (nz2.b - 0.5) * 0.3);
  float cm = smoothstep(0.3, 0.7, vKind.z + (nz2.b - 0.5) * 0.25);
  vec3 base = mix(gr, ms, smoothstep(0.2, 0.8, vKind.w + (nz.b - 0.5) * 0.4));
  vec3 col = mix(base, dt, pm);
  col = mix(col, dt * vec3(0.42, 0.4, 0.38), cm);                                                 // щели брусчатки
  float edge = smoothstep(0.0, 0.35, pm) * (1.0 - smoothstep(0.35, 0.8, pm));
  col *= 1.0 - 0.35 * edge;                                                                      // кромка тропы
  diffuseColor.rgb = col * diffuseColor.rgb;
}`);
  };
  m.customProgramCacheKey = () => 'ground';
  return m;
}

// вода: тёмная глубина к середине, бирюзовая у берега, рябь из шумовой текстуры, блики солнца, пена у кромки
function waterMaterial(x0, y0, x1, y1) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, tNoise: { value: null }, uBox: { value: new THREE.Vector4(x0, y0, x1, y1) } }]),
    fog: true, transparent: false,
    vertexShader: `#include <common>\n#include <fog_pars_vertex>\nvarying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; vec4 mvPosition = viewMatrix * vec4(vW, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}`,
    fragmentShader: `#include <common>\n#include <fog_pars_fragment>\nuniform float uTime; uniform sampler2D tNoise; uniform vec4 uBox; varying vec3 vW;
      void main(){
        vec2 p = vW.xz;
        float n1 = texture2D(tNoise, p * 0.12 + vec2(uTime * 0.012, uTime * 0.007)).b, n2 = texture2D(tNoise, p * 0.19 - vec2(uTime * 0.009, -uTime * 0.013)).b;
        float rip = n1 + n2 - 1.0;
        vec2 c = (uBox.xy + uBox.zw) * 0.5, h = (uBox.zw - uBox.xy) * 0.5; float d = length((p - c) / h);
        vec3 deep = vec3(0.015, 0.07, 0.09), shallow = vec3(0.08, 0.32, 0.33);
        vec3 col = mix(shallow, deep, smoothstep(0.1, 0.75, 1.0 - d + rip * 0.2));
        float glint = smoothstep(0.32, 0.5, rip) * 0.9; col += vec3(1.0, 0.9, 0.7) * glint * 0.35;
        col += vec3(0.6, 0.8, 0.75) * smoothstep(0.55, 0.0, abs(rip)) * 0.03;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

const kindOf = ch => ch === ',' ? 'p' : ch === '#' ? 'c' : ch === 'x' ? 'f' : ch === '~' ? 'w' : 'g';

export function buildGround(scene, zone) {
  const m = zone.map, W = m.w, H = m.h, MARGIN = 3, STEP = 0.5;
  const tile = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H) ? 'f' : kindOf(m.rows[ty][tx]);
  // вес типа в точке: билинейная интерполяция «one-hot» поля по центрам тайлов
  const weights = (x, y) => {
    const fx = x - 0.5, fy = y - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0, w = { g: 0, p: 0, c: 0, f: 0, w: 0 };
    w[tile(x0, y0)] += (1 - u) * (1 - v); w[tile(x0 + 1, y0)] += u * (1 - v); w[tile(x0, y0 + 1)] += (1 - u) * v; w[tile(x0 + 1, y0 + 1)] += u * v;
    return w;
  };
  const x0 = -MARGIN, nx = Math.round((W + 2 * MARGIN) / STEP), ny = Math.round((H + 2 * MARGIN) / STEP);
  const nv = (nx + 1) * (ny + 1), pos = new Float32Array(nv * 3), col = new Float32Array(nv * 4), kind = new Float32Array(nv * 4), idx = [];
  const bank = new THREE.Color(0x3a4a3a);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * STEP, z = x0 + j * STEP, k = j * (nx + 1) + i, w = weights(x, z), n = fbm(x * 0.5, z * 0.5);
    pos[k * 3] = x; pos[k * 3 + 1] = -0.2 * w.w + (n - 0.5) * 0.08 * (1 - w.c) - 0.04 * w.p; pos[k * 3 + 2] = z;
    const ww = Math.min(1, w.w * 1.6);   // берег темнеет к воде
    col.set([1 + (bank.r - 1) * ww, 1 + (bank.g - 1) * ww, 1 + (bank.b - 1) * ww, 1], k * 4);
    kind.set([w.g, w.p, w.c, w.f], k * 4);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b2 = a + 1, c2 = a + nx + 1, d2 = c2 + 1; idx.push(a, c2, b2, b2, c2, d2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 4));
  geo.setIndex(idx); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, groundMaterial()); ground.userData.noOutline = true; ground.receiveShadow = true; scene.add(ground);
  // подложка до горизонта: тёмный мох, чтобы за краем карты не было пустоты
  const far = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0f2418 })); far.position.set(W / 2, -0.4, H / 2); scene.add(far);

  // вода: плоскость над впадиной; видна только там, где земля провалилась ниже -0.08, поэтому берег получается плавным
  let water = null; const wt = [];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (m.rows[ty][tx] === '~') wt.push([tx, ty]);
  if (wt.length) {
    const x0w = Math.min(...wt.map(t => t[0])) - 1, x1w = Math.max(...wt.map(t => t[0])) + 2, y0w = Math.min(...wt.map(t => t[1])) - 1, y1w = Math.max(...wt.map(t => t[1])) + 2;
    water = new THREE.Mesh(new THREE.PlaneGeometry(x1w - x0w, y1w - y0w).rotateX(-Math.PI / 2).translate((x0w + x1w) / 2, -0.08, (y0w + y1w) / 2), waterMaterial(x0w, y0w, x1w, y1w));
    water.material.uniforms.uTime = U.uTime; water.material.uniforms.tNoise.value = noiseTex();
    water.userData.noOutline = true; scene.add(water);
  }

  // булыжник площади: instanced-камни 0.5 м
  const R = rng(11), stones = [];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (m.rows[ty][tx] === '#') for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) stones.push([tx + 0.25 + a * 0.5 + (R() - 0.5) * 0.06, ty + 0.25 + b * 0.5 + (R() - 0.5) * 0.06]);
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
    tNoise: { value: noiseTex() },
    uBase: { value: new THREE.Color(GRASS.base) }, uTip: { value: new THREE.Color(GRASS.tip) }, uDry: { value: new THREE.Color(GRASS.dry) }, uLight: { value: new THREE.Color(1, 1, 1) },
  };
  const gmat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), vertexShader: GRASS_VS, fragmentShader: GRASS_FS, side: THREE.DoubleSide, fog: true });
  Object.assign(gmat.uniforms, grassU);
  const blade = clumpGeometry(), CS = 8, grass = [], MAXP = 310, RG = rng(23), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let cx = -1; cx * CS < W + CS; cx++) for (let cz = -1; cz * CS < H + CS; cz++) {
    const im = new THREE.InstancedMesh(blade.clone(), gmat, MAXP), rnd = new Float32Array(MAXP);
    let n = 0, guard = 0;
    while (n < MAXP && guard++ < MAXP * 6) {
      const x = (cx + RG()) * CS, z = (cz + RG()) * CS, w = weights(x, z);
      // гуще у краёв троп (трава нависает) и пятнами в поле; на тропе и площади — нет
      const edge = w.g * (w.p + w.c) * 4, patch = Math.min(1, Math.max(0, (fbm(x * 0.12 + 9, z * 0.12) - 0.32) * 3));
      const dens = (w.g * (0.25 + 0.75 * patch) + w.f * 0.45 + edge * 0.8) * (1 - Math.min(1, (w.p + w.c) * 1.6)) * (1 - w.w);
      if (RG() > dens || (m.free && !m.free(x, z, 0.05))) continue;
      const tall = 0.22 + Math.pow(fbm(x * 0.21, z * 0.21), 2) * 0.35 + edge * 0.08, sc = 0.8 + RG() * 0.7;
      mm.compose(p.set(x, -0.02, z), q.setFromAxisAngle(up, RG() * 6.283), s.set(sc, tall * (0.7 + RG() * 0.6), sc)); im.setMatrixAt(n, mm); rnd[n] = RG(); n++;
    }
    if (!n) continue;
    im.geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 1));
    im.userData.max = n; im.count = n; im.userData.c = [(cx + 0.5) * CS, (cz + 0.5) * CS]; im.computeBoundingSphere(); im.boundingSphere.radius += 1;
    scene.add(im); grass.push(im);
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
    dispose() { for (const o of [ground, far, water, cob, ...grass]) if (o) { o.removeFromParent(); o.geometry.dispose(); } },
  };
}
