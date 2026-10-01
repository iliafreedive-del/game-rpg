// Dark Ascent · "bone, brass and abyss" — night at the catacomb gate.
// Same budget rules as the cute prototype: no textures, instancing for repeated stuff, one real warm light + one violet light.
import * as THREE from '../../vendor/three.module.min.js';
import { U, toon, outline } from '../toon.js';
import { rng, fbm, noise, part, paint, place, merge, jitter, blobTexture } from '../geo.js';
import { ARENA, heightAt, GRASS_VS, GRASS_FS, bladeGeometry, smoothstep } from '../world.js';

export const PAL = { abyss: 0xb48cff, abyssD: 0x6b3fd0, brass: 0xd6a548, brassD: 0x8a6428, bone: 0xe8dcc0, boneD: 0xa89a7c, fire: 0xff9a3c };
const YAW = Math.PI / 4;                       // the gate faces the camera
export const ARCH = { x: -6.2, z: -6.2, yaw: YAW };
const SY = Math.sin(YAW), CY = Math.cos(YAW);
export const toWorld = (lx, lz) => ({ x: ARCH.x + lx * CY + lz * SY, z: ARCH.z - lx * SY + lz * CY });
const toLocal = (x, z) => { const dx = x - ARCH.x, dz = z - ARCH.z; return { x: dx * CY - dz * SY, z: dx * SY + dz * CY }; };
const pathWob = lz => Math.sin(lz * 0.45) * 0.7;
// 1 on the paved plaza / road, 0 on wild ground
export function pavedMask(x, z) {
  const l = toLocal(x, z), n = (noise(x * 0.5, z * 0.5) - 0.5) * 0.6;
  const plaza = (1 - smoothstep(4.6, 5.6, Math.abs(l.x) + n)) * smoothstep(0.4, 1.0, l.z) * (1 - smoothstep(6.0, 7.0, l.z));
  const road = (1 - smoothstep(1.2, 1.9, Math.abs(l.x - pathWob(l.z)) + n)) * smoothstep(5.0, 6.5, l.z);
  return Math.max(plaza, road);
}

// chunky "hewn" block: low-poly box, jittered, flat-shaded, painted with a cold-bottom → pale-top gradient
function block(w, h, d, seed, base = 0x30364c, top = 0x8089a6) {
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2).toNonIndexed();
  jitter(g, Math.min(w, h, d) * 0.16, rng(seed));
  return paint(place(g, [0, h / 2, 0]), base, { top, y0: 0, y1: h });
}
const BLOCKS = [[1.4, 0.8, 1.2, 11], [1.0, 0.8, 1.2, 12], [0.7, 0.8, 1.2, 13]];   // wall courses
const deg = Math.PI / 180;

// ---- additive glow sprites (billboards for flames/halos, flat discs for floor pools); one draw call each ----
function glowSet(items, flat) {
  const geo = new THREE.PlaneGeometry(2, 2); if (flat) geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uTime; varying vec2 vUv; varying vec3 vC;
      void main(){ vUv = uv; float id = float(gl_InstanceID);
        float fl = 0.84 + 0.1 * sin(uTime * 11.0 + id * 3.7) + 0.06 * sin(uTime * 23.0 + id * 1.3);
        float s = length(instanceMatrix[0].xyz); vC = instanceColor * fl;
        ${flat ? 'gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position * fl, 1.0);'
               : 'vec4 c = viewMatrix * modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); c.xy += position.xy * s * fl; gl_Position = projectionMatrix * c;'} }`,
    fragmentShader: /* glsl */`varying vec2 vUv; varying vec3 vC;
      void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(max(1.0 - d, 0.0), 2.2); gl_FragColor = vec4(vC * a, a); }`,
  });
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  items.forEach((it, i) => { m.compose(new THREE.Vector3(it.x, it.y, it.z), new THREE.Quaternion(), new THREE.Vector3(it.s, it.s, it.s)); im.setMatrixAt(i, m); im.setColorAt(i, c.set(it.c).multiplyScalar(it.k ?? 1)); });
  im.frustumCulled = false; im.renderOrder = 4;
  return im;
}

export function buildWorld(scene) {
  const R = rng(777);
  const colliders = [], shadowSpots = [], outlined = [], fadeMats = [];
  const torches = [];                            // world positions of flames (for the roaming warm light)
  const glows = [], pools = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _e = new THREE.Euler();

  function instanced(geo, mat, items, olMat) {
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => {
      _e.set(it.rx ?? 0, it.rot ?? R() * Math.PI * 2, it.rz ?? 0, 'YXZ'); _q.setFromEuler(_e);
      _m.compose(_p.set(it.x, it.y ?? heightAt(it.x, it.z), it.z), _q, _s.setScalar(it.s ?? 1));
      im.setMatrixAt(i, _m);
      if (it.tint) im.setColorAt(i, it.tint);
    });
    im.computeBoundingSphere(); scene.add(im);
    if (olMat) {
      const ol = new THREE.InstancedMesh(geo, olMat, items.length);
      ol.instanceMatrix = im.instanceMatrix; ol.computeBoundingSphere(); scene.add(ol); outlined.push(ol);
    }
    return im;
  }
  const tintC = (l, h = 0.62, sat = 0.12) => new THREE.Color().setHSL(h, sat, l);

  // ---------- ground ----------
  {
    const g = new THREE.PlaneGeometry(96, 96, 120, 120); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 4);
    const A = new THREE.Color(0x232a3b), B = new THREE.Color(0x2f3a4a), M = new THREE.Color(0x1f3a3a), S = new THREE.Color(0x3a3f55), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z);
      p.setY(i, y);
      c.copy(A).lerp(B, fbm(x * 0.11, z * 0.11));
      c.lerp(M, smoothstep(0.5, 0.75, fbm(x * 0.07 + 20, z * 0.07)) * 0.8);   // mossy patches
      c.lerp(S, pavedMask(x, z) * 0.9);
      col.set([c.r, c.g, c.b, 1], i * 4);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 4)); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, toon(0xffffff, { vc: true, rim: 0 })));
  }

  // ---------- flagstones: plaza + winding road, one instanced draw ----------
  {
    const slab = block(1.0, 0.14, 1.0, 5, 0x2c3248, 0x6a7390);
    const items = [];
    for (let lz = 1.0; lz < 6.5; lz += 1.08) for (let lx = -5.2; lx <= 5.2; lx += 1.08) {
      if (R() < 0.12 || Math.abs(lx) > 4.9 - R() * 0.9) continue;
      const w = toWorld(lx + (R() - .5) * 0.12, lz + (R() - .5) * 0.12);
      items.push({ x: w.x, z: w.z, y: 0.0, rot: YAW + (R() - .5) * 0.1, s: 0.96, tint: tintC(0.38 + R() * 0.22, 0.6, 0.08) });
    }
    for (let lz = 6.8; lz < 24; lz += 1.1) for (const dx of [-0.6, 0.55]) {
      if (R() < 0.18) continue;
      const w = toWorld(pathWob(lz) + dx + (R() - .5) * 0.2, lz + (R() - .5) * 0.2);
      items.push({ x: w.x, z: w.z, y: 0.0, rot: YAW + (R() - .5) * 0.3, s: 0.94 + R() * 0.1, tint: tintC(0.36 + R() * 0.22, 0.6, 0.08) });
    }
    instanced(slab, toon(0xffffff, { vc: true, rim: 0.1 }), items);
  }

  // ---------- gate: pillars, lintel, walls, rubble (all chunky blocks, 5 geometries) ----------
  {
    const mat = toon(0xffffff, { vc: true, rim: 0.32, rimColor: 0xa9b4ff });
    const ol = outline({ width: 0.035, color: 0x07050f });
    const geos = BLOCKS.map(([w, h, d, sd]) => block(w, h, d, sd));
    const pillarG = block(1.35, 0.85, 1.35, 21), capG = block(1.8, 0.45, 1.8, 22, 0x3a4058, 0x959db8), lintelG = block(6.4, 0.9, 1.45, 23, 0x363c54, 0x8a93b0);
    const lists = [[], [], [], [], [], []];            // wall A/B/C, pillar, cap, lintel
    const add = (k, lx, ly, lz, rot = 0, s = 1) => { const w = toWorld(lx, lz); lists[k].push({ x: w.x, z: w.z, y: ly, rot: YAW + rot, s, tint: tintC(0.58 + R() * 0.3, 0.62, 0.1) }); };
    // pillars
    for (const sx of [-1, 1]) {
      for (let j = 0; j < 5; j++) add(3, sx * 2.25, 0.02 + j * 0.85, 0, (R() - .5) * 0.07);
      add(4, sx * 2.25, 4.27, 0, 0);
    }
    add(5, 0, 4.72, 0, 0);
    // walls with courses of random-length blocks; they get lower and more broken towards the ends
    for (const side of [-1, 1]) {
      for (let course = 0; course < 4; course++) {
        let cur = 3.25 + (course % 2) * 0.35;
        while (cur < 11.5) {
          const k = Math.floor(R() * 3), len = BLOCKS[k][0] * 0.98;
          const keep = 1 - smoothstep(0.5, 1, (cur - 3) / 8.5) * 0.9 - course * 0.17 + (R() - 0.5) * 0.35;
          if (keep > 0.2) add(k, side * (cur + len / 2), 0.02 + course * 0.8, (R() - .5) * 0.08, (R() - .5) * 0.05 + (side < 0 ? 0 : 0));
          cur += len + 0.03;
        }
      }
    }
    // fallen blocks in front of the wall
    for (let i = 0; i < 16; i++) {
      const side = R() < 0.5 ? -1 : 1, lx = side * (3.5 + R() * 7), lz = 1.2 + R() * 3.2, k = Math.floor(R() * 3);
      const w = toWorld(lx, lz); lists[k].push({ x: w.x, z: w.z, y: 0.12 + R() * 0.1, rot: R() * 6.28, rx: (R() - .5) * 0.5, rz: (R() - .5) * 0.5, s: 0.7 + R() * 0.4, tint: tintC(0.45 + R() * 0.25, 0.62, 0.1) });
      if (R() < 0.7) colliders.push({ x: w.x, z: w.z, r: 0.5 });
    }
    [geos[0], geos[1], geos[2], pillarG, capG, lintelG].forEach((g, i) => lists[i].length && instanced(g, mat, lists[i], ol));
    // wall + pillar colliders (circles along the wall line); the gap itself is sealed by the abyss
    for (const side of [-1, 1]) for (let lx = 1.6; lx < 11; lx += 0.85) {
      const w = toWorld(side * (lx + 1.2), 0); if (lx > 5) { if (R() < 0.35) continue; }
      colliders.push({ x: w.x, z: w.z, r: 0.75 });
    }
    for (const lx of [-1.0, 0, 1.0]) { const w = toWorld(lx, -0.1); colliders.push({ x: w.x, z: w.z, r: 0.75 }); }

    // brass trim: bands on pillars, lintel plate, brackets (merged, 1 draw)
    const brass = [], bone = [];
    const B = (g, c, top) => paint(g, c, { top });
    for (const sx of [-1, 1]) for (const y of [1.7, 3.4]) brass.push(B(place(new THREE.BoxGeometry(1.5, 0.12, 1.5), [sx * 2.25, y, 0]), PAL.brassD, PAL.brass));
    brass.push(B(place(new THREE.BoxGeometry(2.2, 0.14, 0.12), [0, 4.35, 0.78]), PAL.brassD, PAL.brass));
    brass.push(B(place(new THREE.BoxGeometry(1.0, 0.7, 0.1), [0, 4.72, 0.76], [0, 0, Math.PI / 4], [0.8, 0.8, 1]), PAL.brassD, PAL.brass));
    // keystone rune + horns (the hero's horns are the family crest)
    const eye = (x, y, z, r, rz, sx = 1, sy = 1) => part(new THREE.BoxGeometry(0.07, r, 0.04), PAL.abyss, [x, y, z], [0, 0, rz], [sx, sy, 1], { emit: true });
    const rune = [eye(0.15, 4.72 + 0.15, 0.83, 0.42, -0.9), eye(-0.15, 4.72 + 0.15, 0.83, 0.42, 0.9), eye(0.15, 4.72 - 0.15, 0.83, 0.42, 0.9), eye(-0.15, 4.72 - 0.15, 0.83, 0.42, -0.9),
                  part(new THREE.SphereGeometry(0.07, 8, 6), PAL.abyss, [0, 4.72, 0.84], 0, [1, 1.6, 0.5], { emit: true })];
    for (const sx of [-1, 1]) {
      bone.push(part(new THREE.ConeGeometry(0.28, 1.4, 7), PAL.boneD, [sx * 2.9, 5.65, 0], [0, 0, -sx * 0.45], 1, { top: PAL.bone }));
      bone.push(part(new THREE.SphereGeometry(0.34, 8, 6), PAL.boneD, [sx * 2.55, 5.2, 0], 0, [1, 0.7, 1], { top: PAL.bone }));
    }
    const trim = merge([...brass, ...bone, ...rune].map(g => { const w = g.clone(); w.rotateY(YAW); w.translate(ARCH.x, 0, ARCH.z); return w; }));
    const trimMesh = new THREE.Mesh(trim, toon(0xffffff, { vc: true, rim: 0.25, rimColor: 0xffe2a0 })); scene.add(trimMesh);
    const tol = new THREE.Mesh(trim, ol); scene.add(tol); outlined.push(tol);
  }

  // ---------- abyss behind the gate: swirling violet shader + glow ----------
  const abyssMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = (vUv - vec2(0.5, 0.0)) * vec2(3.0, 4.2);
        float w = n(p * 1.6 + vec2(0.0, -uTime * 0.5)) * 0.6 + n(p * 3.4 + vec2(uTime * 0.3, -uTime * 0.9)) * 0.4;
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) * smoothstep(1.0, 0.7, vUv.y);
        vec3 c = mix(vec3(0.05, 0.02, 0.14), vec3(0.62, 0.38, 1.0), pow(w, 2.2) * 1.3);
        gl_FragColor = vec4(c, edge * 0.97);
      }`,
  });
  {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.6), abyssMat);
    const w = toWorld(0, -0.15); m.position.set(w.x, 0.05, w.z); m.rotation.y = YAW; m.geometry.translate(0, 1.8, 0); m.renderOrder = 2;
    scene.add(m);
    const pw = toWorld(0, 1.4); pools.push({ x: pw.x, y: 0.07, z: pw.z, s: 4.2, c: PAL.abyssD, k: 1.05 });
    const hw = toWorld(0, 0.3); glows.push({ x: hw.x, y: 1.6, z: hw.z, s: 3.0, c: PAL.abyssD, k: 0.8 });
  }

  // ---------- torches (wall brackets on the pillars) and braziers on the plaza ----------
  {
    const parts = [];
    const spots = [];
    for (const sx of [-1, 1]) { const w = toWorld(sx * 2.25, 0.95); spots.push({ x: w.x, z: w.z, y: 2.45, wall: true }); }
    for (const sx of [-1, 1]) { const w = toWorld(sx * 3.7, 3.3); spots.push({ x: w.x, z: w.z, y: 1.05, wall: false }); colliders.push({ x: w.x, z: w.z, r: 0.5 }); }
    for (const s of spots) {
      if (s.wall) {
        parts.push(part(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 6), 0x4a3424, [s.x, s.y - 0.1, s.z], [0.3, 0, 0], 1));
        parts.push(part(new THREE.CylinderGeometry(0.15, 0.09, 0.2, 8), PAL.brassD, [s.x, s.y + 0.28, s.z], 0, 1, { top: PAL.brass }));
        parts.push(part(new THREE.BoxGeometry(0.1, 0.1, 0.5), PAL.brassD, [s.x, s.y - 0.25, s.z - 0.2], 0, 1));
        torches.push(new THREE.Vector3(s.x, s.y + 0.55, s.z));
      } else {
        parts.push(part(new THREE.CylinderGeometry(0.34, 0.2, 0.3, 8), 0x4a5068, [s.x, s.y, s.z], 0, 1, { top: 0x8a92aa }));
        parts.push(part(new THREE.CylinderGeometry(0.07, 0.12, 1.0, 6), PAL.brassD, [s.x, s.y - 0.5, s.z], 0, 1, { top: PAL.brass }));
        parts.push(part(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 8), PAL.brass, [s.x, s.y + 0.14, s.z], 0, 1));
        for (let a = 0; a < 3; a++) parts.push(part(new THREE.CylinderGeometry(0.03, 0.05, 0.9, 4), PAL.brassD, [s.x + Math.cos(a * 2.09) * 0.2, s.y - 0.75, s.z + Math.sin(a * 2.09) * 0.2], [Math.sin(a * 2.09) * 0.22, 0, -Math.cos(a * 2.09) * 0.22]));
        torches.push(new THREE.Vector3(s.x, s.y + 0.4, s.z));
      }
    }
    const fm = new THREE.Mesh(merge(parts), toon(0xffffff, { vc: true, rim: 0.4, rimColor: 0xffd890 })); scene.add(fm);
    const fo = new THREE.Mesh(fm.geometry, outline({ width: 0.02, color: 0x07050f })); scene.add(fo); outlined.push(fo);
    torches.forEach((t, i) => {
      glows.push({ x: t.x, y: t.y + 0.25, z: t.z, s: 1.5, c: PAL.fire, k: 0.75 });
      pools.push({ x: t.x, y: 0.07, z: t.z, s: i < 2 ? 3.0 : 4.2, c: 0xff7a24, k: 0.5 });
    });
  }
  const flameMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uTime; varying vec2 vUv;
      void main(){ vUv = uv; vec3 p = position; float h = uv.y;
        p.x += sin(uTime*9.0 + h*6.0 + float(gl_InstanceID)*2.1) * 0.08 * h; p.z += cos(uTime*7.0 + h*5.0 + float(gl_InstanceID)) * 0.06 * h;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */`varying vec2 vUv; void main(){ float h = vUv.y; vec3 c = mix(vec3(1.0, 0.82, 0.38), vec3(1.0, 0.3, 0.06), h);
        float a = (1.0 - h) * smoothstep(0.0, 0.15, h + 0.1) * 0.95; gl_FragColor = vec4(c * a * 1.5, a); }`,
  });
  const flameGeo = new THREE.ConeGeometry(0.2, 0.75, 7, 4, true); flameGeo.translate(0, 0.37, 0);
  const flames = new THREE.InstancedMesh(flameGeo, flameMat, torches.length * 2);
  torches.forEach((t, i) => [1, 0.62].forEach((k, j) => { _m.compose(_p.set(t.x + j * 0.04, t.y - 0.12, t.z), _q.identity(), _s.setScalar(k * (i < 2 ? 0.9 : 1.25))); flames.setMatrixAt(i * 2 + j, _m); }));
  flames.frustumCulled = false; scene.add(flames);

  // ---------- trees (dead, twisted + dark pines), rocks, columns, graves, rune stones ----------
  const swayO = { base: 0.5, amt: 0.02, flutter: 0.006 };
  const treeMat = toon(0xffffff, { vc: true, rim: 0.4, rimColor: 0xa9b4ff, fade: true, sway: swayO });
  const treeOl = outline({ width: 0.03, color: 0x07050f, fade: true, sway: swayO });
  function deadTree() {
    const L = [part(new THREE.CylinderGeometry(0.1, 0.3, 2.2, 7), 0x2a2230, [0, 1.1, 0], [0, 0, 0.05], 1, { top: 0x4a3f55 }),
               part(new THREE.CylinderGeometry(0.05, 0.1, 1.5, 6), 0x2a2230, [0.12, 2.65, 0], [0, 0, -0.18], 1, { top: 0x4a3f55 }),
               part(new THREE.CylinderGeometry(0.02, 0.05, 1.0, 5), 0x2f2638, [0.0, 3.55, 0], [0, 0, 0.2], 1, { top: 0x5a4d68 })];
    [[1.7, 0.9, 0.9, 1.1], [2.2, -0.9, 3.6, 1.3], [2.7, 0.6, 5.2, 0.9], [1.3, -0.7, 2.4, 0.8], [3.0, -0.5, 1.2, 0.7]].forEach(([y, rz, ry, len]) => {
      const g = place(new THREE.CylinderGeometry(0.015, 0.06, len, 5), [0, len / 2, 0]); g.translate(0, 0, 0);
      g.rotateZ(rz); g.rotateY(ry); g.translate(0, y, 0); L.push(paint(g, 0x2a2230, { top: 0x5a4d68, y0: y, y1: y + len }));
    });
    return merge(L);
  }
  function pine() {
    const L = [part(new THREE.CylinderGeometry(0.1, 0.17, 1.2, 6), 0x2a2030, [0, 0.6, 0])];
    [[0.95, 1.4, 1.2], [0.75, 1.2, 1.95], [0.5, 1.0, 2.65]].forEach(([r, h, y]) => L.push(part(new THREE.ConeGeometry(r, h, 7), 0x16302f, [0, y, 0], 0, 1, { top: 0x3f7a78, y0: 0.7, y1: 3.2 })));
    return merge(L);
  }
  const free = [];
  const spots = (n, a, b, rad) => {
    const out = [];
    for (let i = 0; i < n; i++) for (let k = 0; k < 30; k++) {
      const ang = R() * 6.283, d = a + Math.sqrt(R()) * (b - a), x = Math.cos(ang) * d, z = Math.sin(ang) * d;
      const l = toLocal(x, z);
      if (pavedMask(x, z) > 0.02 || (Math.abs(l.x) < 12 && l.z > -2 && l.z < 8) || Math.hypot(x, z) < 3.5) continue;
      if (l.z < -0.2 && Math.abs(l.x) < 13) continue;                      // behind the wall: leave empty (nothing to see)
      if (free.some(o => Math.hypot(o.x - x, o.z - z) < o.r + rad)) continue;
      free.push({ x, z, r: rad }); out.push({ x, z }); break;
    }
    return out;
  };
  {
    const dead = [], pines = [];
    for (const t of [...spots(16, 6, ARENA - 1, 1.4), ...spots(70, ARENA - 1, 40, 1.5)]) {
      const s = 0.9 + R() * 0.5, tint = tintC(0.85 + R() * 0.3, 0, 0);
      (R() < 0.5 ? dead : pines).push({ ...t, s, tint });
      if (Math.hypot(t.x, t.z) < ARENA) colliders.push({ x: t.x, z: t.z, r: 0.35 * s });
      shadowSpots.push({ x: t.x, z: t.z, r: 1.4 * s });
    }
    instanced(deadTree(), treeMat, dead, treeOl); instanced(pine(), treeMat, pines, treeOl);
    fadeMats.push(treeMat);
  }
  // rocks
  {
    const mk = sd => { const g = new THREE.DodecahedronGeometry(0.5, 0).toNonIndexed(); g.scale(1, 0.62, 0.85); jitter(g, 0.16, rng(sd)); return paint(g, 0x2a3040, { top: 0x7e88a4 }); };
    const items = spots(26, 4, 34, 0.7).map(p => ({ ...p, y: heightAt(p.x, p.z) + 0.08, s: 0.6 + R() * 1.1 }));
    items.forEach(b => { if (Math.hypot(b.x, b.z) < ARENA) colliders.push({ x: b.x, z: b.z, r: 0.42 * b.s }); shadowSpots.push({ x: b.x, z: b.z, r: 0.6 * b.s }); });
    const mat = toon(0xffffff, { vc: true, rim: 0.4, rimColor: 0xa9b4ff }), ol = outline({ width: 0.035, color: 0x07050f });
    instanced(mk(3), mat, items.filter((_, i) => i % 2 === 0), ol); instanced(mk(9), mat, items.filter((_, i) => i % 2 === 1), ol);
  }
  // broken columns (bone-pale, brass ring)
  {
    const col = merge([part(new THREE.CylinderGeometry(0.42, 0.5, 0.35, 8), 0x3a4058, [0, 0.17, 0], 0, 1, { top: 0x6a7390 }),
                       jitter(paint(place(new THREE.CylinderGeometry(0.34, 0.38, 1.9, 8, 3), [0, 1.3, 0]), 0x3c435c, { top: 0x9aa3c0 }), 0.05, rng(8)),
                       part(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 8), PAL.brassD, [0, 1.0, 0], 0, 1, { top: PAL.brass })]);
    const mat = toon(0xffffff, { vc: true, rim: 0.4, rimColor: 0xa9b4ff });
    const ps = [[7.5, -0.5], [4.0, -10.5], [-10.5, 4.5], [-3.5, 9.5], [10.5, -8.0], [-14, -1]].map(([x, z]) => ({ x, z, s: 0.9 + R() * 0.4, rot: R() * 6 }));
    ps.forEach(b => { free.push({ x: b.x, z: b.z, r: 1 }); colliders.push({ x: b.x, z: b.z, r: 0.5 * b.s }); shadowSpots.push({ x: b.x, z: b.z, r: 0.8 }); });
    instanced(col, mat, ps, outline({ width: 0.03, color: 0x07050f }));
  }
  // graves + two rune stones with violet glow
  {
    const grave = merge([part(new THREE.CapsuleGeometry(0.3, 0.45, 2, 6), 0x3a4058, [0, 0.45, 0], 0, [1, 1, 0.32], { top: 0x8a93b0 }),
                         part(new THREE.BoxGeometry(0.34, 0.05, 0.06), 0x1c1830, [0, 0.62, 0.11]), part(new THREE.BoxGeometry(0.05, 0.3, 0.06), 0x1c1830, [0, 0.55, 0.11]),
                         part(new THREE.BoxGeometry(0.75, 0.14, 0.45), 0x2e3448, [0, 0.07, 0], 0, 1, { top: 0x555d78 })]);
    const items = [[-9, 7.0, 0.3], [-10.8, 8.0, -0.2], [-7.6, 8.8, 0.1], [-11.4, 5.6, 0.5], [6.5, 9.5, 2.6], [8.6, 10.2, 3.4]].map(([x, z, rot]) => ({ x, z, rot, s: 0.9 + R() * 0.3, rx: (R() - .5) * 0.1 }));
    items.forEach(b => { free.push({ x: b.x, z: b.z, r: 0.8 }); colliders.push({ x: b.x, z: b.z, r: 0.4 }); shadowSpots.push({ x: b.x, z: b.z, r: 0.6 }); });
    instanced(grave, toon(0xffffff, { vc: true, rim: 0.4, rimColor: 0xa9b4ff }), items, outline({ width: 0.03, color: 0x07050f }));
    const rune = merge([jitter(paint(place(new THREE.CylinderGeometry(0.32, 0.5, 2.3, 6, 3), [0, 1.15, 0]), 0x30364c, { top: 0x8a93b0 }), 0.07, rng(4)),
                        part(new THREE.BoxGeometry(0.09, 0.44, 0.05), PAL.abyss, [0, 1.4, 0.4], 0, 1, { emit: true }), part(new THREE.BoxGeometry(0.3, 0.07, 0.05), PAL.abyss, [0, 1.48, 0.4], 0, 1, { emit: true }),
                        part(new THREE.BoxGeometry(0.07, 0.24, 0.05), PAL.abyss, [0.05, 0.98, 0.42], [0, 0, 0.6], 1, { emit: true })]);
    const rs = [{ x: 4.6, z: -7.4, rot: 0.7 }, { x: -9.6, z: 11.5, rot: 0.4 }, { x: 13.5, z: 4.5, rot: 2.1 }];
    rs.forEach(r => { r.s = 1; free.push({ x: r.x, z: r.z, r: 1 }); colliders.push({ x: r.x, z: r.z, r: 0.5 }); shadowSpots.push({ x: r.x, z: r.z, r: 0.9 });
      const fx = Math.sin(r.rot), fz = Math.cos(r.rot);
      glows.push({ x: r.x + fx * 0.5, y: 1.4, z: r.z + fz * 0.5, s: 1.1, c: PAL.abyssD, k: 0.7 }); pools.push({ x: r.x + fx * 0.7, y: 0.07, z: r.z + fz * 0.7, s: 2.6, c: PAL.abyssD, k: 0.6 }); });
    instanced(rune, toon(0xffffff, { vc: true, rim: 0.4, rimColor: 0xa9b4ff }), rs, outline({ width: 0.035, color: 0x07050f }));
  }

  // contact shadows (one instanced draw)
  {
    const mat = new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0x020108, transparent: true, opacity: 0.55, depthWrite: false });
    const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2);
    const im = new THREE.InstancedMesh(g, mat, shadowSpots.length);
    shadowSpots.forEach((s, i) => { _m.compose(_p.set(s.x, heightAt(s.x, s.z) + 0.03, s.z), _q.identity(), _s.set(s.r, 1, s.r)); im.setMatrixAt(i, _m); });
    im.computeBoundingSphere(); im.renderOrder = 1; scene.add(im);
  }

  // glow sprites last (need the lists filled)
  const glowMesh = glowSet(glows, false), poolMesh = glowSet(pools, true); scene.add(glowMesh, poolMesh);

  // ---------- grass: sparse, teal with violet-dry tips ----------
  const grassU = {
    uTime: U.uTime, uWind: U.uWind, uWindStr: U.uWindStr,
    uBlobs: { value: Array.from({ length: 12 }, () => new THREE.Vector4(999, 999, 0.5, 0)) },
    uBase: { value: new THREE.Color(0x10282c) }, uTip: { value: new THREE.Color(0x4e8f8c) }, uDry: { value: new THREE.Color(0x8c78c8) }, uLight: { value: new THREE.Color(0.8, 0.85, 1) },
  };
  const grassMat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), vertexShader: GRASS_VS, fragmentShader: GRASS_FS, side: THREE.DoubleSide, fog: true });
  Object.assign(grassMat.uniforms, grassU);
  const blade = bladeGeometry();
  const CH = 4, CS = 52 / CH, MAX_PER = 3600, grass = [];
  for (let cx = 0; cx < CH; cx++) for (let cz = 0; cz < CH; cz++) {
    const im = new THREE.InstancedMesh(blade, grassMat, MAX_PER), rnd = new Float32Array(MAX_PER);
    let n = 0, guard = 0;
    while (n < MAX_PER && guard++ < MAX_PER * 8) {
      const x = -26 + (cx + R()) * CS, z = -26 + (cz + R()) * CS, l = toLocal(x, z);
      const dens = (1 - pavedMask(x, z)) * smoothstep(-0.5, 0.8, l.z) * (0.15 + 0.85 * smoothstep(0.35, 0.65, fbm(x * 0.12 + 9, z * 0.12)));
      if (R() > dens) continue;
      const tall = 0.16 + Math.pow(fbm(x * 0.21, z * 0.21), 2) * 0.4;
      _q.setFromAxisAngle(_up, R() * 6.283);
      _m.compose(_p.set(x, heightAt(x, z) - 0.02, z), _q, _s.set(0.7 + R() * 0.5, tall * (0.6 + R() * 0.7), 1));
      im.setMatrixAt(n, _m); rnd[n] = R(); n++;
    }
    im.geometry = blade.clone(); im.geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 1));
    im.userData.max = n; im.count = n; im.computeBoundingSphere(); im.boundingSphere.radius += 1;
    scene.add(im); grass.push(im);
  }

  // ---------- ground mist: three drifting noise layers that thin out around the hero ----------
  const mistU = { uTime: U.uTime, uHero: { value: new THREE.Vector2() } };
  const mist = [];
  [[0.22, 0.34, 0.16, 0.05, 0x4a4f8c], [0.6, 0.26, 0.2, -0.04, 0x3c3a78], [1.05, 0.18, 0.12, 0.03, 0x2c2c66]].forEach(([y, a, sc, sp, col], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.ShaderMaterial({
      uniforms: { ...mistU, uA: { value: a }, uSc: { value: sc }, uSp: { value: sp }, uCol: { value: new THREE.Color(col) }, uSeed: { value: i * 13.7 } }, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vW; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`uniform float uTime, uA, uSc, uSp, uSeed; uniform vec2 uHero; uniform vec3 uCol; varying vec2 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){ vec2 p = vW * uSc + uSeed; float t = uTime * uSp;
          float v = n(p + vec2(t, t * 0.6)) * 0.6 + n(p * 2.3 - vec2(t * 0.8, -t)) * 0.4;
          float a = smoothstep(0.32, 0.82, v) * uA;
          a *= smoothstep(1.2, 4.5, length(vW - uHero)) * (1.0 - smoothstep(16.0, 30.0, length(vW)));
          gl_FragColor = vec4(uCol, a); }`,
    }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 3; m.frustumCulled = false; scene.add(m); mist.push(m);
  });

  // ---------- motes: violet abyss motes rising near the gate, warm embers near fires ----------
  const MOTES = 90, mg = new THREE.BufferGeometry(), ms = new Float32Array(MOTES * 4); for (let i = 0; i < ms.length; i++) ms[i] = R();
  mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3)); mg.setAttribute('aSeed', new THREE.BufferAttribute(ms, 4));
  const moteMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uCenter: { value: new THREE.Vector3() }, uPR: { value: 1 }, uGate: { value: new THREE.Vector3(ARCH.x, 0, ARCH.z) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`attribute vec4 aSeed; uniform float uTime, uPR; uniform vec3 uCenter, uGate; varying vec4 vC;
      void main(){ float cyc = fract(uTime * (0.06 + aSeed.w * 0.07) + aSeed.z);
        bool ember = aSeed.y > 0.55;
        vec3 c;
        if (ember) { c = vec3(aSeed.x * 24.0 - 12.0, cyc * 5.5, aSeed.z * 24.0 - 12.0); c.xz += vec2(sin(uTime * 0.8 + aSeed.w * 30.0), cos(uTime * 0.6 + aSeed.x * 20.0)) * 0.7; c.xz = mod(c.xz - uCenter.xz + 12.0, 24.0) - 12.0 + uCenter.xz; }
        else { c = uGate + vec3((aSeed.x - 0.5) * 9.0, cyc * 4.5, (aSeed.z - 0.5) * 9.0); c.xz += vec2(sin(uTime * 0.7 + aSeed.w * 30.0), cos(uTime * 0.5 + aSeed.x * 20.0)) * 0.6; }
        float f = smoothstep(0.0, 0.15, cyc) * (1.0 - smoothstep(0.7, 1.0, cyc)) * (0.6 + 0.4 * sin(uTime * 3.0 + aSeed.w * 40.0));
        vC = ember ? vec4(1.0, 0.55, 0.2, f * 0.8) : vec4(0.71, 0.55, 1.0, f);
        vec4 mv = viewMatrix * vec4(c, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPR * (ember ? 38.0 : 62.0) / -mv.z; }`,
    fragmentShader: 'varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a *= a * vC.a; gl_FragColor = vec4(vC.rgb * a, a); }',
  });
  const motes = new THREE.Points(mg, moteMat); motes.frustumCulled = false; scene.add(motes);

  const api = {
    colliders, grass, grassU, torches, moteMat, mist, glowMesh, poolMesh, abyssMat, fadeMats,
    setQuality(q) {
      const k = q === 'low' ? 0.3 : q === 'med' ? 0.6 : 1;
      for (const g of grass) g.count = Math.floor(g.userData.max * k);
      for (const o of outlined) o.visible = q !== 'low';
      mist[1].visible = mist[2].visible = q !== 'low';
    },
    setOutlines(on) { for (const o of outlined) o.visible = on; },
    update(t, center, blobs, hero) {
      moteMat.uniforms.uCenter.value.copy(center); mistU.uHero.value.set(hero.x, hero.z);
      for (let i = 0; i < 12; i++) { const b = blobs[i], v = grassU.uBlobs.value[i]; if (b) v.set(b.x, b.z, b.r, b.w ?? 1); else v.set(999, 999, 0.5, 0); }
    },
  };
  return api;
}
