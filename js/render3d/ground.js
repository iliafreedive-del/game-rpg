// Земля деревни из карты зоны: цвет вершин (трава, тропа, брусчатка, лес, вода), булыжник instanced-камнями, ветровая трава.
// Без текстур. Шейдеры травы перенесены из lab/three/js/world.js.
import * as THREE from '../vendor/three.module.min.js';
import { U, toon } from './toon.js';
import { rng, fbm, noise, paint, merge } from './geo.js';
import { LOOKS, GRASS_K, SHADOW } from './style.js';

const GRASS_VS = /* glsl */`
#include <common>
#include <fog_pars_vertex>
attribute float aRand;
uniform float uTime; uniform vec2 uWind; uniform float uWindStr;
uniform vec4 uBlobs[12]; uniform mat4 uShadowMat;
varying float vH; varying float vRand; varying float vSheen; varying float vShade; varying vec4 vSh;
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
  vH = t; vRand = aRand; vSheen = gust * uWindStr;
  vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const GRASS_FS = /* glsl */`
#include <common>
#include <fog_pars_fragment>
#include <packing>
uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uDry; uniform vec3 uLight;
uniform sampler2D uShadowMap; uniform float uShadowOn; uniform float uShadowDark; uniform vec2 uShadowTexel;
varying float vH; varying float vRand; varying float vSheen; varying float vShade; varying vec4 vSh;
float shadowLit() {
  if (uShadowOn < 0.5) return 1.0;
  vec3 c = vSh.xyz / vSh.w;
  if (c.x < 0.0 || c.y < 0.0 || c.x > 1.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
  float s = 0.0, z = c.z - 0.002;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += step(z, unpackRGBAToDepth(texture2D(uShadowMap, c.xy + vec2(float(i), float(j)) * uShadowTexel * 1.5)));
  return s / 9.0;
}
void main() {
  vec3 tip = mix(uTip, uDry, smoothstep(0.8, 1.0, vRand) * 0.6) * (0.93 + vRand * 0.14);
  vec3 c = mix(uBase, tip, smoothstep(0.0, 1.0, vH));
  c += vSheen * vH * vH * 0.10;
  c *= (0.82 + 0.18 * smoothstep(0.0, 0.6, vH)) * (1.0 - vShade * 0.45);
  c *= mix(uShadowDark, 1.0, shadowLit());
  gl_FragColor = vec4(c * uLight, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
function bladeGeometry() {
  const h = 1, w = 0.07;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.62, h * 0.5, 0.04, w * 0.62, h * 0.5, 0.04, 0, h, 0.14], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 0.5, 1, 0.5, 0.5, 1], 2));
  g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  return g;
}

// палитра тайлов деревни: [низ, верх] — градиент не нужен, а вот шум яркости нужен
const C = {
  g: [0x2b5230, 0x4a8040], p: [0x5c4a30, 0x8a7048], c: [0x5a5448, 0x8a826c], f: [0x14301c, 0x24502c], w: [0x1c4a54, 0x2f7c86],
};
const KINDS = ['g', 'p', 'c', 'f', 'w'];
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
  const pos = new Float32Array((nx + 1) * (ny + 1) * 3), col = new Float32Array((nx + 1) * (ny + 1) * 4), idx = [];
  const cc = new THREE.Color(), ca = new THREE.Color(), cb = new THREE.Color();
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * STEP, z = x0 + j * STEP, k = j * (nx + 1) + i, w = weights(x, z), n = fbm(x * 0.5, z * 0.5), n2 = noise(x * 2.3, z * 2.3);
    let r = 0, g = 0, b = 0;
    for (const t of KINDS) { if (!w[t]) continue; ca.setHex(C[t][0]); cb.setHex(C[t][1]); cc.copy(ca).lerp(cb, Math.min(1, Math.max(0, n * 1.25 + (n2 - 0.5) * 0.35))); r += cc.r * w[t]; g += cc.g * w[t]; b += cc.b * w[t]; }
    pos[k * 3] = x; pos[k * 3 + 1] = -0.2 * w.w + (n - 0.5) * 0.06 * (1 - w.c); pos[k * 3 + 2] = z;
    col.set([r, g, b, 1], k * 4);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b2 = a + 1, c2 = a + nx + 1, d2 = c2 + 1; idx.push(a, c2, b2, b2, c2, d2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, toon(0xffffff, { vc: true, rim: 0.08 })); ground.userData.noOutline = true; ground.receiveShadow = true; scene.add(ground);
  // подложка до горизонта: тёмный мох, чтобы за краем карты не было пустоты
  const far = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0f2418 })); far.position.set(W / 2, -0.4, H / 2); scene.add(far);

  // вода: плоскость над впадиной; видна только там, где земля провалилась ниже -0.08, поэтому берег получается плавным
  let water = null; const wt = [];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (m.rows[ty][tx] === '~') wt.push([tx, ty]);
  if (wt.length) {
    const x0w = Math.min(...wt.map(t => t[0])) - 1, x1w = Math.max(...wt.map(t => t[0])) + 2, y0w = Math.min(...wt.map(t => t[1])) - 1, y1w = Math.max(...wt.map(t => t[1])) + 2;
    water = new THREE.Mesh(new THREE.PlaneGeometry(x1w - x0w, y1w - y0w).rotateX(-Math.PI / 2).translate((x0w + x1w) / 2, -0.08, (y0w + y1w) / 2), new THREE.MeshBasicMaterial({ color: 0x3a8c96, fog: true }));
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
  const ST = LOOKS.torch, grassU = {
    uTime: U.uTime, uWind: U.uWind, uWindStr: U.uWindStr,
    uBlobs: { value: Array.from({ length: 12 }, () => new THREE.Vector4(999, 999, 0.5, 0)) },
    uShadowMat: { value: new THREE.Matrix4() }, uShadowMap: { value: null }, uShadowOn: { value: 0 }, uShadowDark: { value: SHADOW.grassDark }, uShadowTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
    uBase: { value: new THREE.Color(ST.grass[0]) }, uTip: { value: new THREE.Color(ST.grass[1]) }, uDry: { value: new THREE.Color(ST.grass[2]) }, uLight: { value: new THREE.Color(...ST.grass[3]) },
  };
  const gmat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), vertexShader: GRASS_VS, fragmentShader: GRASS_FS, side: THREE.DoubleSide, fog: true });
  Object.assign(gmat.uniforms, grassU);
  const blade = bladeGeometry(), CS = 8, grass = [], MAXP = 1100, RG = rng(23), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let cx = -1; cx * CS < W + CS; cx++) for (let cz = -1; cz * CS < H + CS; cz++) {
    const im = new THREE.InstancedMesh(blade.clone(), gmat, MAXP), rnd = new Float32Array(MAXP);
    let n = 0, guard = 0;
    while (n < MAXP && guard++ < MAXP * 6) {
      const x = (cx + RG()) * CS, z = (cz + RG()) * CS, w = weights(x, z), dens = w.g * (0.35 + 0.65 * Math.min(1, Math.max(0, (fbm(x * 0.12 + 9, z * 0.12) - 0.3) * 3.5))) + w.f * 0.5;
      if (RG() > dens) continue;
      const tall = 0.2 + Math.pow(fbm(x * 0.21, z * 0.21), 2) * 0.45;
      mm.compose(p.set(x, -0.02, z), q.setFromAxisAngle(up, RG() * 6.283), s.set(0.8 + RG() * 0.6, tall * (0.6 + RG() * 0.8), 1)); im.setMatrixAt(n, mm); rnd[n] = RG(); n++;
    }
    if (!n) continue;
    im.geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 1));
    im.userData.max = n; im.count = n; im.computeBoundingSphere(); im.boundingSphere.radius += 1;
    scene.add(im); grass.push(im);
  }
  return {
    grassU,
    setQuality(q) { const k = GRASS_K[q] ?? 1; for (const g of grass) g.count = Math.floor(g.userData.max * k); },
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
