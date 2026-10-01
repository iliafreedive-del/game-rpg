// The stylised meadow: ground, instanced wind-grass, swaying trees, rocks, flowers, campfire, falling leaves, fireflies.
// Budget target (High): ~60 draw calls and ~250k triangles for the whole world, no textures except one 64px blob.
import * as THREE from '../vendor/three.module.min.js';
import { U, toon, outline } from './toon.js';
import { rng, fbm, noise, part, paint, place, merge, spherify, jitter, blobTexture } from './geo.js';

export const ARENA = 21;                 // radius the hero can walk in
const SIZE = 96;

// ---------- terrain ----------
export const pathZ = x => Math.sin(x * 0.13) * 4 + 1.5;
export function pathMask(x, z) {
  const d = Math.abs(z - pathZ(x)) + (noise(x * 0.4, z * 0.4) - 0.5) * 0.8;
  return 1 - smoothstep(0.9, 1.7, d);
}
const CAMP = { x: 7, z: -6 };
export function heightAt(x, z) {
  const r = Math.hypot(x, z), k = smoothstep(ARENA - 1, ARENA + 9, r);
  return k * (fbm(x * 0.06 + 3, z * 0.06) * 5.5 + 0.6);
}
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// ---------- grass shader ----------
const GRASS_VS = /* glsl */`
#include <common>
#include <fog_pars_vertex>
attribute float aRand;
uniform float uTime; uniform vec2 uWind; uniform float uWindStr;
uniform vec4 uBlobs[12];
varying float vH; varying float vRand; varying float vSheen; varying float vShade;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 root = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float t = uv.y, bend = t * t;
  // two layers: slow rolling gust waves + quick per-blade flicker
  float gust = sin(dot(root.xz, uWind) * 0.35 - uTime * 1.9) * 0.5 + 0.5;
  gust = gust * gust;
  float flick = sin(uTime * 4.0 + aRand * 40.0 + root.x * 0.7) * 0.12;
  vec2 off = uWind * (0.12 + gust * 0.55 + flick) * uWindStr * bend * 0.6;
  vShade = 0.0;
  // characters push the grass aside and darken it under them (fake contact shadow)
  for (int i = 0; i < 12; i++) {
    vec4 b = uBlobs[i];
    vec2 d = root.xz - b.xy;
    float dist = length(d);
    float push = 1.0 - smoothstep(0.0, b.z * 1.6, dist);
    off += (d / (dist + 0.001)) * push * 0.55 * bend * b.w;
    vShade = max(vShade, (1.0 - smoothstep(b.z * 0.3, b.z, dist)) * b.w);
  }
  wp.xz += off;
  wp.y -= dot(off, off) * 0.6 * t;
  vH = t; vRand = aRand; vSheen = gust * uWindStr;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const GRASS_FS = /* glsl */`
#include <common>
#include <fog_pars_fragment>
uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uDry; uniform vec3 uLight;
varying float vH; varying float vRand; varying float vSheen; varying float vShade;
void main() {
  vec3 tip = mix(uTip, uDry, smoothstep(0.8, 1.0, vRand) * 0.6) * (0.93 + vRand * 0.14);
  vec3 c = mix(uBase, tip, smoothstep(0.0, 1.0, vH));
  c += vSheen * vH * vH * 0.10;
  c *= (0.82 + 0.18 * smoothstep(0.0, 0.6, vH)) * (1.0 - vShade * 0.45);
  gl_FragColor = vec4(c * uLight, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

function bladeGeometry() {
  // 5 verts, 3 tris, slight forward curl; uv.y = 0 at root, 1 at tip
  const h = 1, w = 0.07;
  const P = [-w, 0, 0, w, 0, 0, -w * 0.62, h * 0.5, 0.04, w * 0.62, h * 0.5, 0.04, 0, h, 0.14];
  const UV = [0, 0, 1, 0, 0, 0.5, 1, 0.5, 0.5, 1];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  return g;
}

// ---------- world ----------
export function buildWorld(scene) {
  const R = rng(1337);
  const colliders = [];
  const shadowSpots = [];
  const swayMats = [];
  const outlined = [];

  // --- ground ---
  const gGeo = new THREE.PlaneGeometry(SIZE, SIZE, 96, 96); gGeo.rotateX(-Math.PI / 2);
  {
    const p = gGeo.attributes.position, col = new Float32Array(p.count * 4);
    const A = new THREE.Color(0x46762c), B = new THREE.Color(0x5e8c34), D = new THREE.Color(0x9a7a4e), Dd = new THREE.Color(0x7a5c3a), H = new THREE.Color(0x4f7a3a), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z);
      p.setY(i, y);
      c.copy(A).lerp(B, fbm(x * 0.09, z * 0.09));
      c.lerp(H, Math.min(1, y / 4));
      const pm = pathMask(x, z);
      if (pm > 0) c.lerp(new THREE.Color().copy(Dd).lerp(D, noise(x * 1.3, z * 1.3)), pm);
      const cd = Math.hypot(x - CAMP.x, z - CAMP.z);
      if (cd < 2.6) c.lerp(Dd, (1 - cd / 2.6) * 0.8);
      col.set([c.r, c.g, c.b, 1], i * 4);
    }
    gGeo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    gGeo.computeVertexNormals();
  }
  const ground = new THREE.Mesh(gGeo, toon(0xffffff, { vc: true, rim: 0 }));
  scene.add(ground);

  // --- props helpers ---
  const occupied = [];
  const free = (x, z, r) => {
    if (pathMask(x, z) > 0.05) return false;
    if (Math.hypot(x - CAMP.x, z - CAMP.z) < 3 + r) return false;
    if (Math.hypot(x, z) < 3) return false;
    for (const o of occupied) if (Math.hypot(o.x - x, o.z - z) < o.r + r) return false;
    return true;
  };
  function scatter(n, rMin, rMax, rad, tries = 30) {
    const out = [];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < tries; k++) {
        const a = R() * Math.PI * 2, d = rMin + Math.sqrt(R()) * (rMax - rMin);
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (Math.abs(x) > SIZE / 2 - 3 || Math.abs(z) > SIZE / 2 - 3) continue;
        if (!free(x, z, rad)) continue;
        occupied.push({ x, z, r: rad }); out.push({ x, z }); break;
      }
    }
    return out;
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  function instanced(geo, mat, items, olMat) {
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => {
      _q.setFromAxisAngle(_up, it.rot ?? R() * Math.PI * 2);
      _m.compose(_p.set(it.x, it.y ?? heightAt(it.x, it.z), it.z), _q, _s.setScalar(it.s ?? 1));
      im.setMatrixAt(i, _m);
      if (it.tint) im.setColorAt(i, it.tint);
    });
    im.computeBoundingSphere();
    scene.add(im);
    if (olMat) {
      const ol = new THREE.InstancedMesh(geo, olMat, items.length);
      ol.instanceMatrix = im.instanceMatrix; ol.computeBoundingSphere();
      scene.add(ol); outlined.push(ol);
    }
    return im;
  }

  // --- trees: round broadleaf + pine; one instanced draw call each (+ outline) ---
  function broadleaf() {
    const parts = [part(new THREE.CylinderGeometry(0.13, 0.24, 1.6, 7), 0x5b3a26, [0, 0.8, 0], 0, 1, { top: 0x7a5236 }),
                   part(new THREE.CylinderGeometry(0.05, 0.09, 0.7, 5), 0x5b3a26, [0.28, 1.35, 0], [0, 0, -0.8])];
    const crown = [];
    const blobs = [[0, 2.35, 0, 0.95], [0.62, 2.05, 0.2, 0.68], [-0.55, 2.1, -0.15, 0.72], [0.1, 2.0, 0.6, 0.62], [-0.15, 2.95, 0.05, 0.62], [0.2, 2.15, -0.55, 0.6]];
    for (const [x, y, z, r] of blobs) crown.push(part(new THREE.IcosahedronGeometry(r, 2), 0x3f7f2c, [x, y, z], 0, 1, { top: 0x9ed05a, y0: 1.5, y1: 3.4 }));
    const cg = merge(crown); spherify(cg, new THREE.Vector3(0, 2.3, 0), 0.7);
    return merge([...parts, cg]);
  }
  function pine() {
    const parts = [part(new THREE.CylinderGeometry(0.1, 0.18, 1.2, 6), 0x4e3222, [0, 0.6, 0])];
    const tiers = [[0.95, 1.3, 1.15], [0.75, 1.1, 1.85], [0.5, 0.9, 2.5]];
    for (const [r, h, y] of tiers) parts.push(part(new THREE.ConeGeometry(r, h, 8), 0x2b5a3a, [0, y, 0], 0, 1, { top: 0x6fae5e, y0: 0.6, y1: 3.0 }));
    return merge(parts);
  }
  const treeMat = toon(0xffffff, { vc: true, rim: 0.28, fade: true, sway: { base: 0.6, amt: 0.022, flutter: 0.012 } });
  const treeOl = outline({ width: 0.024, fade: true, sway: { base: 0.6, amt: 0.022, flutter: 0.012 } });
  swayMats.push(treeMat, treeOl);
  const treeSpots = [...scatter(28, 5, ARENA - 1, 1.3), ...scatter(80, ARENA - 1, 40, 1.5)];
  const round = [], pines = [];
  for (const t of treeSpots) {
    const s = 0.85 + R() * 0.55, inside = Math.hypot(t.x, t.z) < ARENA;
    const hue = new THREE.Color().setHSL(0.0, 0, 0.88 + R() * 0.24);
    if (R() < 0.62) round.push({ ...t, s, tint: hue }); else pines.push({ ...t, s: s * 1.1, tint: hue });
    if (inside) colliders.push({ x: t.x, z: t.z, r: 0.35 * s });
    shadowSpots.push({ x: t.x, z: t.z, r: 1.6 * s });
  }
  instanced(broadleaf(), treeMat, round, treeOl);
  instanced(pine(), treeMat, pines, treeOl);

  // --- bushes (light sway) ---
  {
    const g = []; for (const [x, y, z, r] of [[0, 0.32, 0, 0.42], [0.36, 0.25, 0.1, 0.32], [-0.34, 0.24, -0.06, 0.34], [0.05, 0.22, 0.34, 0.28]])
      g.push(part(new THREE.IcosahedronGeometry(r, 1), 0x3a742c, [x, y, z], 0, 1, { top: 0x8cc256, y0: 0, y1: 0.7 }));
    const geo = merge(g); spherify(geo, new THREE.Vector3(0, 0.1, 0), 0.6);
    const mat = toon(0xffffff, { vc: true, rim: 0.3, fade: true, sway: { base: 0.1, amt: 0.25, flutter: 0.01 } });
    const ol = outline({ width: 0.025, fade: true, sway: { base: 0.1, amt: 0.25, flutter: 0.01 } });
    const items = scatter(45, 4, 34, 0.6).map(p => ({ ...p, s: 0.8 + R() * 0.7 }));
    items.forEach(b => shadowSpots.push({ x: b.x, z: b.z, r: 0.75 * b.s }));
    instanced(geo, mat, items, ol);
  }

  // --- rocks (faceted, no sway) ---
  {
    const mk = seed => { const r = rng(seed); const g = new THREE.DodecahedronGeometry(0.5, 0); g.scale(1, 0.62, 0.85); jitter(g, 0.18, r); return paint(g, 0x6f7177, { top: 0xa9adb0 }); };
    const mat = toon(0xffffff, { vc: true, rim: 0.25 }), ol = outline({ width: 0.03 });
    const items = scatter(34, 3, 38, 0.7).map(p => ({ ...p, y: heightAt(p.x, p.z) + 0.1, s: 0.6 + R() * 1.1 }));
    items.forEach(b => { if (Math.hypot(b.x, b.z) < ARENA) colliders.push({ x: b.x, z: b.z, r: 0.42 * b.s }); shadowSpots.push({ x: b.x, z: b.z, r: 0.6 * b.s }); });
    // two shapes, half each
    instanced(mk(3), mat, items.filter((_, i) => i % 2 === 0), ol);
    instanced(mk(9), mat, items.filter((_, i) => i % 2 === 1), ol);
  }

  // --- flowers & mushrooms (sway with the grass) ---
  {
    const fm = toon(0xffffff, { vc: true, rim: 0.2, sway: { base: 0, amt: 0.9, flutter: 0 } });
    const flower = c => merge([part(new THREE.CylinderGeometry(0.012, 0.018, 0.38, 3), 0x4c8a30, [0, 0.19, 0]),
                               part(new THREE.IcosahedronGeometry(0.075, 0), c, [0, 0.4, 0], 0, [1, 0.55, 1]),
                               part(new THREE.IcosahedronGeometry(0.035, 0), 0xffe070, [0, 0.43, 0])]);
    for (const c of [0xff8fb4, 0xfff1a8, 0x9fb8ff, 0xffffff]) {
      const items = [];
      for (let i = 0; i < 70; i++) {
        const cx = (R() - 0.5) * 60, cz = (R() - 0.5) * 60;   // clusters
        for (let k = 0; k < 4; k++) { const x = cx + (R() - .5) * 1.6, z = cz + (R() - .5) * 1.6; if (pathMask(x, z) < 0.1) items.push({ x, z, s: 0.7 + R() * 0.6 }); }
      }
      instanced(flower(c), fm, items);
    }
    const mush = merge([part(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 6), 0xf2e6cf, [0, 0.1, 0]),
                        part(new THREE.SphereGeometry(0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xd8452e, [0, 0.18, 0], 0, [1, 0.8, 1], { top: 0xff7a55 }),
                        part(new THREE.IcosahedronGeometry(0.025, 0), 0xffffff, [0.06, 0.27, 0.03]), part(new THREE.IcosahedronGeometry(0.02, 0), 0xffffff, [-0.05, 0.26, -0.05])]);
    const items = scatter(26, 5, 30, 0.3).map(p => ({ ...p, s: 0.8 + R() * 0.8 }));
    instanced(mush, toon(0xffffff, { vc: true, rim: 0.3 }), items, outline({ width: 0.012 }));
  }

  // --- graves & rune stone (dark-fantasy accent, glowing runes are self-lit vertex colour) ---
  {
    const grave = merge([part(new THREE.CapsuleGeometry(0.3, 0.45, 2, 8), 0x7c8088, [0, 0.45, 0], 0, [1, 1, 0.32], { top: 0xa4a8ae }),
                         part(new THREE.BoxGeometry(0.34, 0.05, 0.06), 0x3a3550, [0, 0.62, 0.11]), part(new THREE.BoxGeometry(0.05, 0.3, 0.06), 0x3a3550, [0, 0.55, 0.11]),
                         part(new THREE.BoxGeometry(0.75, 0.14, 0.45), 0x5f6168, [0, 0.07, 0])]);
    const items = [[-9, 6.5, 0.3], [-10.6, 7.6, -0.2], [-7.6, 8.3, 0.1], [-11.2, 5.6, 0.5]].map(([x, z, rot]) => ({ x, z, rot, s: 0.9 + R() * 0.3 }));
    items.forEach(b => { occupied.push({ x: b.x, z: b.z, r: 0.6 }); colliders.push({ x: b.x, z: b.z, r: 0.4 }); shadowSpots.push({ x: b.x, z: b.z, r: 0.6 }); });
    const mat = toon(0xffffff, { vc: true, rim: 0.3 });
    instanced(grave, mat, items, outline({ width: 0.025 }));
    const rune = merge([jitter(paint(place(new THREE.CylinderGeometry(0.32, 0.46, 2.2, 6), [0, 1.1, 0]), 0x5d6070, { top: 0x8a8ea0 }), 0.06, rng(4)),
                        part(new THREE.BoxGeometry(0.08, 0.4, 0.05), 0xb48cff, [0, 1.35, 0.36], 0, 1, { emit: true }),
                        part(new THREE.BoxGeometry(0.26, 0.06, 0.05), 0xb48cff, [0, 1.42, 0.36], 0, 1, { emit: true }),
                        part(new THREE.BoxGeometry(0.06, 0.2, 0.05), 0xb48cff, [0, 0.95, 0.38], [0, 0, 0.6], 1, { emit: true })]);
    instanced(rune, mat, [{ x: -9.4, z: 9.6, rot: 0.4, s: 1 }], outline({ width: 0.03 }));
    colliders.push({ x: -9.4, z: 9.6, r: 0.5 }); occupied.push({ x: -9.4, z: 9.6, r: 1 });
    shadowSpots.push({ x: -9.4, z: 9.6, r: 0.9 });
  }

  // --- campfire with flickering light ---
  const camp = new THREE.Group(); camp.position.set(CAMP.x, 0, CAMP.z); scene.add(camp);
  {
    const stones = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; stones.push(jitter(paint(place(new THREE.DodecahedronGeometry(0.17, 0), [Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62], [0, a, 0], [1, 0.7, 1]), 0x777a80, { top: 0xa0a3a8 }), 0.05, rng(i + 20))); }
    const logs = [0, 1.1, 2.2].map(a => part(new THREE.CylinderGeometry(0.07, 0.08, 0.85, 6), 0x5a3a24, [0, 0.12, 0], [Math.PI / 2 - 0.25, a, 0]));
    const base = new THREE.Mesh(merge([...stones, ...logs]), toon(0xffffff, { vc: true, rim: 0.2 }));
    camp.add(base);
    colliders.push({ x: CAMP.x, z: CAMP.z, r: 0.8 });
  }
  const flameMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uTime; varying vec2 vUv; varying float vSeed;
      void main(){ vUv = uv; vec3 p = position; float h = uv.y;
        p.x += sin(uTime*9.0 + h*6.0 + float(gl_InstanceID)*2.1) * 0.08 * h;
        p.z += cos(uTime*7.0 + h*5.0 + float(gl_InstanceID)) * 0.06 * h;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p,1.0); }`,
    fragmentShader: /* glsl */`uniform float uTime; varying vec2 vUv;
      void main(){ float h = vUv.y; vec3 c = mix(vec3(1.0,0.85,0.35), vec3(1.0,0.28,0.05), h);
        float a = (1.0 - h) * smoothstep(0.0,0.15,h+0.1) * 0.9; gl_FragColor = vec4(c*a*1.4, a); }`,
  });
  const flame = new THREE.InstancedMesh(new THREE.ConeGeometry(0.28, 0.9, 7, 4, true), flameMat, 3);
  flame.geometry.translate(0, 0.45, 0);
  [[0, 0, 0, 1], [0.12, 0, 0.08, 0.7], [-0.1, 0, -0.07, 0.75]].forEach(([x, y, z, s], i) => { _m.compose(_p.set(x, 0.1 + y, z), _q.identity(), _s.set(s, s, s)); flame.setMatrixAt(i, _m); });
  camp.add(flame);
  const fireLight = new THREE.PointLight(0xff9a4a, 6, 9, 1.6); fireLight.position.set(0, 1, 0); camp.add(fireLight);

  // --- tree/rock contact shadows: one instanced draw ---
  {
    const mat = new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0x10200a, transparent: true, opacity: 0.32, depthWrite: false });
    const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2);
    const im = new THREE.InstancedMesh(g, mat, shadowSpots.length);
    shadowSpots.forEach((s, i) => { _m.compose(_p.set(s.x, heightAt(s.x, s.z) + 0.02, s.z), _q.identity(), _s.set(s.r, 1, s.r)); im.setMatrixAt(i, _m); });
    im.computeBoundingSphere(); im.renderOrder = 1; scene.add(im);
  }

  // --- grass: 16 chunks so off-screen ones are frustum-culled; count per chunk follows quality ---
  const grassU = {
    uTime: U.uTime, uWind: U.uWind, uWindStr: U.uWindStr,
    uBlobs: { value: Array.from({ length: 12 }, () => new THREE.Vector4(999, 999, 0.5, 0)) },
    uBase: { value: new THREE.Color(0x2c5a1c) }, uTip: { value: new THREE.Color(0xa6d65c) }, uDry: { value: new THREE.Color(0xd9d27a) },
    uLight: { value: new THREE.Color(1, 1, 1) },
  };
  const grassMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), vertexShader: GRASS_VS, fragmentShader: GRASS_FS,
    side: THREE.DoubleSide, fog: true,
  });
  Object.assign(grassMat.uniforms, grassU);
  const blade = bladeGeometry();
  const CH = 4, CS = 52 / CH, MAX_PER = 5000;
  const grass = [];
  for (let cx = 0; cx < CH; cx++) for (let cz = 0; cz < CH; cz++) {
    const im = new THREE.InstancedMesh(blade, grassMat, MAX_PER);
    const rnd = new Float32Array(MAX_PER);
    let n = 0, guard = 0;
    while (n < MAX_PER && guard++ < MAX_PER * 6) {
      const x = -26 + (cx + R()) * CS, z = -26 + (cz + R()) * CS;
      const dens = (1 - pathMask(x, z)) * (Math.hypot(x - CAMP.x, z - CAMP.z) < 1.8 ? 0 : 1) * (0.35 + 0.65 * fbm(x * 0.15 + 9, z * 0.15));
      if (R() > dens) continue;
      const tall = 0.16 + Math.pow(fbm(x * 0.21, z * 0.21), 2) * 0.42;
      _q.setFromAxisAngle(_up, R() * Math.PI * 2);
      _m.compose(_p.set(x, heightAt(x, z) - 0.02, z), _q, _s.set(0.7 + R() * 0.5, tall * (0.6 + R() * 0.7), 1));
      im.setMatrixAt(n, _m); rnd[n] = R(); n++;
    }
    im.geometry = blade.clone(); im.geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 1));
    im.userData.max = n; im.count = n;
    im.computeBoundingSphere(); im.boundingSphere.radius += 1;
    scene.add(im); grass.push(im);
  }

  // --- falling leaves (all animated in the vertex shader around the camera target) ---
  const LEAVES = 90;
  const leafGeo = new THREE.PlaneGeometry(0.16, 0.1);
  const leafSeed = new Float32Array(LEAVES * 4);
  for (let i = 0; i < LEAVES * 4; i++) leafSeed[i] = R();
  leafGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(leafSeed, 4));
  const leafMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uCenter: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) } }]),
    fog: true, side: THREE.DoubleSide,
    vertexShader: /* glsl */`#include <common>
      #include <fog_pars_vertex>
      attribute vec4 aSeed; uniform float uTime; uniform vec2 uWind; uniform float uWindStr; uniform vec3 uCenter; varying vec3 vCol; varying vec2 vUv;
      void main(){ vUv = uv;
        float cyc = fract(uTime * (0.05 + aSeed.w * 0.05) + aSeed.z);
        vec3 c = vec3(aSeed.x * 24.0 - 12.0, 7.0 - cyc * 7.5, aSeed.y * 24.0 - 12.0);
        c.xz += uWind * cyc * 5.0 * uWindStr + vec2(sin(uTime * 1.3 + aSeed.z * 20.0), cos(uTime * 1.1 + aSeed.w * 20.0)) * 0.6;
        c.xz = mod(c.xz - uCenter.xz + 12.0, 24.0) - 12.0 + uCenter.xz;
        float a = uTime * (2.0 + aSeed.w * 3.0) + aSeed.x * 10.0;
        vec3 p = position; p.xy *= smoothstep(0.0, 0.08, cyc) * (1.0 - smoothstep(0.9, 1.0, cyc));
        p = vec3(p.x * cos(a) - p.z * sin(a), p.y, p.x * sin(a) + p.z * cos(a));
        float b = a * 0.7; p = vec3(p.x, p.y * cos(b) - p.z * sin(b), p.y * sin(b) + p.z * cos(b));
        vCol = mix(vec3(0.95, 0.55, 0.15), vec3(0.6, 0.8, 0.25), step(0.6, aSeed.y));
        vec4 mvPosition = viewMatrix * vec4(c + p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`#include <common>
      #include <fog_pars_fragment>
      uniform vec3 uLight; varying vec3 vCol; varying vec2 vUv;
      void main(){ vec2 d = vUv - 0.5; if (dot(d * vec2(1.0, 1.6), d * vec2(1.0, 1.6)) > 0.25) discard;
        gl_FragColor = vec4(vCol * uLight, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  Object.assign(leafMat.uniforms, { uTime: U.uTime, uWind: U.uWind, uWindStr: U.uWindStr });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, LEAVES);
  leaves.frustumCulled = false; scene.add(leaves);

  // --- fireflies / dust motes ---
  const FLIES = 70;
  const fGeo = new THREE.BufferGeometry();
  const fs = new Float32Array(FLIES * 4); for (let i = 0; i < fs.length; i++) fs[i] = R();
  fGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLIES * 3), 3));
  fGeo.setAttribute('aSeed', new THREE.BufferAttribute(fs, 4));
  const flyMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uCenter: leafMat.uniforms.uCenter, uGlow: { value: 1 }, uColor: { value: new THREE.Color(0xd8ff7a) }, uPR: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`attribute vec4 aSeed; uniform float uTime; uniform vec3 uCenter; uniform float uPR; varying float vA;
      void main(){ vec3 c = vec3(aSeed.x * 22.0 - 11.0, 0.4 + aSeed.z * 2.2, aSeed.y * 22.0 - 11.0);
        c += vec3(sin(uTime * 0.4 + aSeed.w * 30.0), sin(uTime * 0.7 + aSeed.x * 20.0) * 0.3, cos(uTime * 0.35 + aSeed.y * 30.0)) * 1.2;
        c.xz = mod(c.xz - uCenter.xz + 11.0, 22.0) - 11.0 + uCenter.xz;
        vA = pow(0.5 + 0.5 * sin(uTime * (1.5 + aSeed.z * 2.0) + aSeed.w * 40.0), 3.0);
        vec4 mv = viewMatrix * vec4(c, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPR * 70.0 / -mv.z; }`,
    fragmentShader: /* glsl */`uniform float uGlow; uniform vec3 uColor; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a = a * a * vA * uGlow; gl_FragColor = vec4(uColor * a, a); }`,
  });
  const flies = new THREE.Points(fGeo, flyMat); flies.frustumCulled = false; scene.add(flies);

  // ---------- runtime ----------
  const api = {
    colliders, ground, grass, grassU, flyMat, leafMat, fireLight, camp,
    setQuality(q) {
      const k = q === 'low' ? 0.28 : q === 'med' ? 0.55 : 1;
      for (const g of grass) g.count = Math.floor(g.userData.max * k);
      for (const o of outlined) o.visible = q !== 'low';
      leaves.count = q === 'low' ? 30 : LEAVES;
      fireLight.visible = q !== 'low';
    },
    setPreset(p) {
      grassU.uBase.value.set(p.grassBase); grassU.uTip.value.set(p.grassTip); grassU.uDry.value.set(p.grassDry);
      grassU.uLight.value.setRGB(p.grassLight, p.grassLight, p.grassLight);
      leafMat.uniforms.uLight.value.copy(grassU.uLight.value);
      flyMat.uniforms.uGlow.value = p.flies; flyMat.uniforms.uColor.value.set(p.fliesColor);
      fireLight.intensity = p.fire; api.fireBase = p.fire;
    },
    setOutlines(on) { for (const o of outlined) o.visible = on; },
    fireBase: 6,
    update(t, center, blobs) {
      leafMat.uniforms.uCenter.value.copy(center);
      for (let i = 0; i < 12; i++) {
        const b = blobs[i], v = grassU.uBlobs.value[i];
        if (b) v.set(b.x, b.z, b.r, b.w ?? 1); else v.set(999, 999, 0.5, 0);
      }
      const f = 0.82 + Math.sin(t * 13) * 0.08 + Math.sin(t * 23.7) * 0.06 + Math.sin(t * 5.1) * 0.06;
      fireLight.intensity = api.fireBase * f;
      flame.scale.setScalar(0.92 + f * 0.1);
    },
  };
  return api;
}
