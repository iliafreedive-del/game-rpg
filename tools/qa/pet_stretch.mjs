// Проверка ригов питомцев из Meshy (сборка 60): «прилипшие полигоны» и разрывы.
//   node tools/qa/pet_stretch.mjs [id ...]
// Каждого питомца ставит в крайние кадры ходьбы (медленно и бегом), покоя, удара — той же походкой, что в игре (gaits.js) —
// и меряет у каждого треугольника, во сколько раз вытянулось самое длинное ребро относительно покоя (порог 1.6).
// Ещё проверяет, что ни одна вершина не держится за две несоседние кости (лапа + бок через щель).
import * as THREE from '../../js/vendor/three.module.min.js';
import { posePet } from '../../js/render3d/models/pet/gaits.js';
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = new URL('../../assets/models/', import.meta.url);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['fennec', 'crow', 'scorpid', 'wisp', 'skull', 'basilisk', 'bat', 'golem'];
const LIM = 1.6;
let fail = 0;
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
  const len = (P, a, b) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
  const r0 = meta.bones[0], o = { root: r0[0], rootY: r0[2][1], lift: meta.lift || 0, stride: meta.stride || 0.5, trot: meta.trot ?? 2.5, swing: meta.swing };
  let worst = { r: 0 }, over = 0, frames = 0, dumpNext = false; const pairs = new Map();
  const shots = [['idle', 0], ['walk', 2.4], ['walk', 7], ['attack', 0]];
  for (const [mode, speed] of shots) {
    const st = {}; const N = mode === 'idle' ? 24 : 16;
    for (let f = 0; f < N; f++) {
      const t = f * (mode === 'idle' ? 0.37 : 0.05), a = { t, dt: mode === 'walk' ? 1 / (N * Math.min(3.2, speed / o.stride)) : 0.05, speed, k: f / (N - 1), mode };
      posePet(B, meta.gait, a, st, o); const Pp = skin(); frames++; const bad = [];
      for (let k = 0; k < idx.length; k += 3) {
        const [a0, b0, c0] = [idx[k], idx[k + 1], idx[k + 2]];
        let r = 0; for (const [u, v] of [[a0, b0], [b0, c0], [c0, a0]]) { const l0 = len(pos, u, v); if (l0 > 0.003) r = Math.max(r, len(Pp, u, v) / l0); }
        if (r > LIM) { over++; bad.push(k / 3); const key = [...new Set([a0, b0, c0].map(v => bones[si[v * 4]].name))].sort().join('+') + ' ' + mode + speed; pairs.set(key, (pairs.get(key) || 0) + 1); }
        if (r > worst.r && process.env.DUMP) dumpNext = true;
        if (r > worst.r) { const bb = [a0, b0, c0].map(v => bones[si[v * 4]].name); worst = { r, mode, speed, f, bones: [...new Set(bb)].join('+') }; }
      }
      if (dumpNext) { writeFileSync(process.env.DUMP + '/' + id + '.json', JSON.stringify({ mode, speed, f, P: Array.from(Pp), bad })); dumpNext = false; }
    }
  }
  const ok = worst.r <= LIM && nonAdj === 0; if (!ok) fail++;
  if (process.env.DEBUG && nonAdj) { const m = new Map(); for (let i = 0; i < n; i++) { const ks = []; for (let j = 0; j < 4; j++) if (sw[i * 4 + j] > 12) ks.push(bones[si[i * 4 + j]].name); for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) if (!adj(ks[a], ks[b])) { const k = ks[a] + '+' + ks[b]; m.set(k, (m.get(k) || 0) + 1); } } console.log('    несоседние:', [...m].join(' ')); }
  if (process.env.DEBUG) console.log('   ', [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => k + ':' + v).join('  '));
  console.log(`${id.padEnd(9)} ${ok ? 'OK  ' : 'FAIL'} max stretch ${worst.r.toFixed(2)} (${worst.mode} ${worst.speed} кадр ${worst.f}, ${worst.bones}); треугольников >${LIM}: ${over} за ${frames} кадров; несоседних пар: ${nonAdj}`);
}
process.exit(fail ? 1 : 0);
