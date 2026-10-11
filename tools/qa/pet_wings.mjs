// Кадры взмаха крыльев ворона и мыши (правки к сборке 60): силуэт спереди и сбоку по фазам — сравнить с видео владельца.
//   node tools/qa/pet_wings.mjs [id ...] > /tmp/w.json; потом нарисовать треугольники (x,y спереди; z,y сбоку)
// (остальное — как в pet_stretch.mjs)
//   node tools/qa/pet_stretch.mjs [id ...]
// Каждого питомца ставит в крайние кадры ходьбы (медленно и бегом), покоя, удара — той же походкой, что в игре (gaits.js) —
// и меряет у каждого треугольника, во сколько раз вытянулось самое длинное ребро относительно покоя (порог 1.6).
// Ещё проверяет, что ни одна вершина не держится за две несоседние кости (лапа + бок через щель).
import * as THREE from '../../js/vendor/three.module.min.js';
import { posePet } from '../../js/render3d/models/pet/gaits.js';
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = new URL('../../assets/models/', import.meta.url);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['crow', 'bat'];
const LIM = 1.6;
let fail = 0; const out = {};
for (const id of ids) {
  const name = 'pet_' + id, meta = JSON.parse(readFileSync(new URL(name + '.json', DIR))), buf = readFileSync(new URL(name + '.bin', DIR));
  const L = meta.layout, ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), V = (T, k) => new T(ab, L[k][0], L[k][1] / T.BYTES_PER_ELEMENT);
  const pos = V(Float32Array, 'pos'), si = V(Uint8Array, 'si'), sw = V(Uint8Array, 'sw'), idx = V(Uint16Array, 'idx'), n = meta.vertices;
  const root = new THREE.Group(), B = {}, bones = [], par = {};
  for (const [bn, p, at] of meta.bones) {
    const b = new THREE.Bone(); b.name = bn; const pa = p ? meta.bones.find(x => x[0] === p)[2] : [0, 0, 0];
    b.position.set(at[0] - pa[0], at[1] - pa[1], at[2] - pa[2]); b.userData.rest = b.position.clone(); (p ? B[p] : root).add(b); B[bn] = b; bones.push(b); par[bn] = p;
  }
  root.updateMatrixWorld(true); const inv = bones.map(b => b.matrixWorld.clone().invert());
  // несоседние кости у одной вершины (вес > 5 %)
  // соседние части: кость и её родитель/дети, или две кости у одного сустава (через одну), но не две разные лапы/крыла
  const chain = b => { while (par[b] && /[LR]$/.test(par[b])) b = par[b]; return /[LR]$/.test(b) ? b : null; };
  const near = (a, b) => a === b || par[a] === b || par[b] === a || par[a] === par[b] || par[par[a]] === b || par[par[b]] === a;
  const adj = (a, b) => near(a, b) && !(chain(a) && chain(b) && chain(a) !== chain(b));
  let nonAdj = 0;
  for (let i = 0; i < n; i++) { const ks = []; for (let j = 0; j < 4; j++) if (sw[i * 4 + j] > 12) ks.push(bones[si[i * 4 + j]].name); for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) if (!adj(ks[a], ks[b])) nonAdj++; }
  const skin = () => {
    root.updateMatrixWorld(true); const M = bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, inv[i]).elements), out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]; let X = 0, Y = 0, Z = 0;
      for (let j = 0; j < 4; j++) { const w = sw[i * 4 + j] / 255; if (!w) continue; const e = M[si[i * 4 + j]]; X += w * (e[0] * x + e[4] * y + e[8] * z + e[12]); Y += w * (e[1] * x + e[5] * y + e[9] * z + e[13]); Z += w * (e[2] * x + e[6] * y + e[10] * z + e[14]); }
      out[i * 3] = X; out[i * 3 + 1] = Y; out[i * 3 + 2] = Z;
    }
    return out;
  };
  const r0 = meta.bones[0], o = { root: r0[0], rootY: r0[2][1], lift: meta.lift || 0, stride: meta.stride || 0.5, trot: meta.trot ?? 2.5, swing: meta.swing };
  const st = {}, N = 12, f0 = meta.gait === 'bat' ? 3.6 : 2.4, frames = [];
  for (let f = 0; f < N; f++) { posePet(B, meta.gait, { t: 0.1, dt: f ? 1 / (N * f0) : 0, mode: 'idle' }, st, o); frames.push(Array.from(skin(), v => +v.toFixed(3))); }
  out[id] = { idx: Array.from(idx), frames };
}
console.log(JSON.stringify(out));
