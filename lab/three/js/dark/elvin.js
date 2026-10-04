// Elvin: a textured static T-pose model (assets/elvin.glb, sword standing next to him) driven by the DarkHero procedural rig.
// The rig's pivots become skeleton bones; skin weights are computed here from the measured joint positions, so the GLB needs
// no skeleton of its own. The sword is cut out of the same mesh and put into the right hand (DarkHero.sword pivot).
import * as THREE from '../../vendor/three.module.min.js';
import { toon, outline } from '../toon.js';
import { DarkHero } from './hero.js';
import { HERO, OUTLINE } from '../style.js';
import { smooth } from './rig.js';

// Joints measured on the GLB, in model units (model faces +z, T-pose, feet on y = FLOOR). dx = distance from the body axis.
const S = 2.7;                                            // model units → metres: Elvin stands ≈ 2.0 m, like the knight
const CX = -0.0965, CZ = 0, FLOOR = -0.365;
const J = { hip: -0.09, knee: -0.205, ankle: -0.31, waist: 0, neck: 0.245, armY: 0.165, armZ: 0.02, shoulder: 0.146, elbow: 0.232, grip: 0.35, legX: 0.08, legR: 0.06 };
const SWORD = { minX: 0.34, x: 0.43, y: -0.29, z: 0.037 };   // everything right of minX is the sword; (x, y, z) = middle of the grip
const band = (x, a, b) => smooth((x - a) / (b - a));      // 0 → 1 as x goes a → b (a > b flips it)

export class ElvinHero extends DarkHero {
  constructor(scene, glb) {
    super(scene);
    // drop the knight's procedural meshes and Verlet cape (Elvin's cape is modelled), keep the pivots as bones
    const old = []; this.root.traverse(o => { if (o.isMesh) old.push(o); });
    old.forEach(o => { if (o === this.torso) o.geometry = new THREE.BufferGeometry(); else o.removeFromParent(); });   // the torso mesh is also a pivot
    scene.remove(this.cape.mesh); this.cape = null; this.shield.visible = false;

    // re-seat the pivots on Elvin's joints (metres, rig space)
    const m = v => v * S;
    this.HIP = m(J.hip - FLOOR); this.L1 = m(J.hip - J.knee); this.L2 = m(J.knee - J.ankle); this.ANKLE = m(J.ankle - FLOOR);
    this.LEG_X = m(J.legX); this.legK = (this.L1 + this.L2) / 0.87;
    this.hips.position.y = this.HIP;
    this.torso.position.y = m(J.waist - J.hip);           // bend at the waist, not at the hip joint
    this.head.position.y = m(J.neck - J.waist);
    for (const [arm, sd] of [[this.armR, -1], [this.armL, 1]]) {
      arm.position.set(sd * m(J.shoulder), m(J.armY - J.waist), m(J.armZ - CZ));
      arm.elbow.position.y = -m(J.elbow - J.shoulder);
    }
    for (const [lg, sd] of [[this.legR, -1], [this.legL, 1]]) {
      lg.position.set(sd * this.LEG_X, this.HIP, 0); lg.knee.position.y = -this.L1; lg.foot.position.y = -this.L2;
    }
    this.sword.position.set(0.03, -m(J.grip - J.elbow), 0);

    // materials: same toon ramp + rim + hit flash as the knight, coloured by the model's texture
    this.mat = toon(0xffffff, { rim: HERO.rim * 0.6, rimColor: HERO.rimColor }); this.mat.map = glb.map;   // softer rim: the red cape turns pink under the full one

    // split the triangle list: body vs sword
    const src = glb.geometry.index ? glb.geometry.toNonIndexed() : glb.geometry;
    const P = src.attributes.position.array, N = src.attributes.normal.array, UV = src.attributes.uv.array, nv = P.length / 3;
    const body = { p: [], n: [], uv: [] }, blade = { p: [], n: [], uv: [] };
    for (let t = 0; t < nv; t += 3) {
      const sw = P[t * 3] > SWORD.minX && P[t * 3 + 3] > SWORD.minX && P[t * 3 + 6] > SWORD.minX, dst = sw ? blade : body;
      for (let v = t; v < t + 3; v++) {
        const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
        if (sw) dst.p.push((x - SWORD.x) * S, (y - SWORD.y) * S, (z - SWORD.z) * S);   // grip at the origin, blade along +y
        else dst.p.push((x - CX) * S, (y - FLOOR) * S, (z - CZ) * S);
        dst.n.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]); dst.uv.push(UV[v * 2], UV[v * 2 + 1]);
      }
    }
    const geo = d => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
      return g;
    };
    const bodyGeo = geo(body), swordGeo = geo(blade);
    this.skin(bodyGeo);

    // bind pose = the model's T-pose: arms straight out sideways, everything else at rest
    this.armR.rotation.set(0, 0, -Math.PI / 2); this.armL.rotation.set(0, 0, Math.PI / 2);
    this.root.updateMatrixWorld(true);
    const bones = [this.hips, this.torso, this.head, this.armR, this.armR.elbow, this.armL, this.armL.elbow,
      this.legR, this.legR.knee, this.legR.foot, this.legL, this.legL.knee, this.legL.foot];
    this.skeleton = new THREE.Skeleton(bones);
    this.body = new THREE.SkinnedMesh(bodyGeo, this.mat);
    this.bodyOl = new THREE.SkinnedMesh(smoothNormals(bodyGeo), this.olMat);   // welded normals: no cracks in the inverted hull
    for (const o of [this.body, this.bodyOl]) { o.frustumCulled = false; this.root.add(o); o.bind(this.skeleton); }
    this.bodyOl.userData.isOutline = true;

    const sword = new THREE.Mesh(swordGeo, this.mat), swordOl = new THREE.Mesh(smoothNormals(swordGeo), this.olMat);
    swordOl.userData.isOutline = true; sword.add(swordOl); this.sword.add(sword);
    this.olMat.userData.width.value = OUTLINE.hero * 0.8;
  }

  // skin weights from position: arms (shoulder → elbow → hand), head, chest, pelvis (with cape tail and coat flaps), legs (thigh → shin → boot)
  skin(g) {
    const P = g.attributes.position.array, n = P.length / 3;
    const idx = new Uint16Array(n * 4), wgt = new Float32Array(n * 4);
    const yM = y => y / S + FLOOR;                              // back to model units for the thresholds
    for (let v = 0; v < n; v++) {
      const x = P[v * 3] / S, y = yM(P[v * 3 + 1]), z = P[v * 3 + 2] / S, ax = Math.abs(x), side = x < 0 ? 0 : 1;
      const w = new Float32Array(13);
      const arm = band(ax, J.shoulder - 0.02, J.shoulder + 0.015) * band(y, 0.07, 0.1), fore = band(ax, J.elbow - 0.012, J.elbow + 0.012);
      w[3 + side * 2] = arm * (1 - fore); w[4 + side * 2] = arm * fore;
      const rest = 1 - arm;
      // legs: only what is close to a leg's axis (the coat and the cape around them follow the pelvis)
      const lx = J.legX + 0.012 * band(y, J.hip, J.ankle), d = Math.hypot(ax - lx, z - 0.005);
      const leg = band(y, J.hip + 0.02, J.hip - 0.03) * (1 - band(d, J.legR - 0.01, J.legR + 0.012)) * rest;
      const knee = band(y, J.knee + 0.015, J.knee - 0.015), foot = band(y, J.ankle + 0.012, J.ankle - 0.012);
      const L = 7 + side * 3;
      w[L] = leg * (1 - knee); w[L + 1] = leg * knee * (1 - foot); w[L + 2] = leg * foot;
      const up = rest - leg, head = band(y, J.neck - 0.012, J.neck + 0.015), chest = band(y, J.waist - 0.025, J.waist + 0.045);
      w[2] = up * head; w[1] = up * (1 - head) * chest; w[0] = up * (1 - head) * (1 - chest);
      // keep the 4 strongest influences
      const order = [...w.keys()].sort((a, b) => w[b] - w[a]).slice(0, 4);
      let sum = 0; for (const i of order) sum += w[i];
      order.forEach((i, k) => { idx[v * 4 + k] = i; wgt[v * 4 + k] = w[i] / (sum || 1); });
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wgt, 4));
  }
}

// copy of g whose normals are averaged over coincident positions (the GLB is a UV-split triangle soup)
function smoothNormals(g) {
  const c = g.clone(), P = c.attributes.position.array, N = c.attributes.normal.array, acc = new Map(), key = i => `${Math.round(P[i * 3] * 2e3)},${Math.round(P[i * 3 + 1] * 2e3)},${Math.round(P[i * 3 + 2] * 2e3)}`;
  for (let i = 0; i < P.length / 3; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += N[i * 3]; a[1] += N[i * 3 + 1]; a[2] += N[i * 3 + 2]; acc.set(k, a); }
  const out = new Float32Array(N.length);
  for (let i = 0; i < P.length / 3; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; out.set([a[0] / l, a[1] / l, a[2] / l], i * 3); }
  c.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  return c;
}
