// Перенос рига готового зверя (скелет, веса, анимации) на статичную модель из Meshy Image to 3D:
//   node tools/art/rig_transfer.mjs <ригнутый донор.glb> <статичная.glb> <выход.glb> [--yaw градусы] [--flip]
// Пример: node tools/art/rig_transfer.mjs assets/models/wolf_grey.glb art_meshy/raw/dog_town.glb assets/models/dog_town.glb
// Как работает (скинning glTF считается в мировых координатах, узел меша не влияет):
//  1. статичная модель ставится как донор: вверх +Y, длина тела — по оси донора (голова туда же, куда у донора),
//     рост — как у донора, лапы на его земле. Поворот угадывается (длинная ось по горизонтали, голова — выше хвоста);
//     не угадал — --yaw (доп. поворот) / --flip (развернуть на 180°);
//  2. рамка донора растягивается по осям на рамку модели: кости переезжают в те же «доли» тела (плечи, бёдра, голова),
//     повороты костей не меняются — анимации донора подходят как есть (сдвиги ключей пересчитаны);
//  3. веса: каждая вершина модели → в пространство донора → 6 ближайших вершин донора, взвешено по расстоянию; потом
//     два прохода сглаживания по рёбрам сетки (чтобы на стыках не было ступенек).
// Выход — донор с заменённой сеткой, текстурой, позициями костей и матрицами привязки; дальше игра грузит его glbmob.js.
import * as T from '../../js/vendor/three.module.min.js';
import fs from 'fs';

const args = process.argv.slice(2), flag = k => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const flip = args.includes('--flip'); if (flip) args.splice(args.indexOf('--flip'), 1);
const yawExtra = +(flag('--yaw') || 0) * Math.PI / 180;
const [donorPath, targetPath, outPath] = args;
if (!outPath) { console.log('node tools/art/rig_transfer.mjs <донор.glb> <статичная.glb> <выход.glb> [--yaw град] [--flip]'); process.exit(1); }

// ---- чтение GLB
function readGlb(p) {
  const d = fs.readFileSync(p), L = d.readUInt32LE(12), j = JSON.parse(d.subarray(20, 20 + L).toString()), BL = d.readUInt32LE(20 + L);
  const bin = d.subarray(28 + L, 28 + L + BL);
  const view = i => { const bv = j.bufferViews[i]; return bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength); };
  const acc = i => {
    const a = j.accessors[i], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
    const C = { 5126: Float32Array, 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array }[a.componentType];
    const bv = j.bufferViews[a.bufferView], stride = bv.byteStride, off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const out = new C(a.count * n);
    if (!stride || stride === n * C.BYTES_PER_ELEMENT) { const src = bin.subarray(off, off + a.count * n * C.BYTES_PER_ELEMENT); out.set(new C(src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength))); }
    else for (let k = 0; k < a.count; k++) { const s = bin.subarray(off + k * stride, off + k * stride + n * C.BYTES_PER_ELEMENT); out.set(new C(s.buffer.slice(s.byteOffset, s.byteOffset + s.byteLength)), k * n); }
    if (a.normalized && C !== Float32Array) { const f = new Float32Array(out.length), mx = C === Uint8Array ? 255 : 65535; for (let k = 0; k < out.length; k++) f[k] = out[k] / mx; return f; }
    return out;
  };
  const par = {}; (j.nodes || []).forEach((n, i) => (n.children || []).forEach(c => par[c] = i));
  const local = i => { const n = j.nodes[i]; if (n.matrix) return new T.Matrix4().fromArray(n.matrix); return new T.Matrix4().compose(new T.Vector3(...(n.translation || [0, 0, 0])), new T.Quaternion(...(n.rotation || [0, 0, 0, 1])), new T.Vector3(...(n.scale || [1, 1, 1]))); };
  const world = i => par[i] != null ? world(par[i]).multiply(local(i)) : local(i);
  return { j, view, acc, par, local, world };
}

// ---- донор
const D = readGlb(donorPath), dj = D.j, skin = dj.skins[0];
const dMeshNode = dj.nodes.findIndex(n => n.skin != null), dPrim = dj.meshes[dj.nodes[dMeshNode].mesh].primitives[0];
const dPos = D.acc(dPrim.attributes.POSITION), dJ = D.acc(dPrim.attributes.JOINTS_0), dW = D.acc(dPrim.attributes.WEIGHTS_0), dN = dPos.length / 3;
const joints = skin.joints, jWorld = joints.map(i => D.world(i)), jPos = jWorld.map(m => new T.Vector3().setFromMatrixPosition(m));
const dBox = new T.Box3(); for (let i = 0; i < dN; i++) dBox.expandByPoint(new T.Vector3(dPos[i * 3], dPos[i * 3 + 1], dPos[i * 3 + 2]));
const byName = n => joints.findIndex(i => dj.nodes[i].name === n);
const hJ = byName('head'), tJ = byName('Hips');
// ось длины донора и куда смотрит голова
const dLong = (dBox.max.z - dBox.min.z) >= (dBox.max.x - dBox.min.x) ? 'z' : 'x';
const dHeadSign = hJ >= 0 && tJ >= 0 ? Math.sign(jPos[hJ][dLong] - jPos[tJ][dLong]) || 1 : 1;

// ---- статичная модель: все треугольные сетки сцены в мировых координатах (с узлами), одна текстура
const S = readGlb(targetPath), sj = S.j;
const P = [], N = [], UV = [], IDX = []; let material = null;
(sj.nodes || []).forEach((n, ni) => {
  if (n.mesh == null) return;
  const W = S.world(ni), Nm = new T.Matrix3().getNormalMatrix(W);
  for (const pr of sj.meshes[n.mesh].primitives) {
    if (pr.mode != null && pr.mode !== 4) continue;
    const base = P.length / 3, p = S.acc(pr.attributes.POSITION), nr = pr.attributes.NORMAL != null ? S.acc(pr.attributes.NORMAL) : null, uv = pr.attributes.TEXCOORD_0 != null ? S.acc(pr.attributes.TEXCOORD_0) : null;
    const v = new T.Vector3();
    for (let k = 0; k < p.length / 3; k++) {
      v.set(p[k * 3], p[k * 3 + 1], p[k * 3 + 2]).applyMatrix4(W); P.push(v.x, v.y, v.z);
      if (nr) { v.set(nr[k * 3], nr[k * 3 + 1], nr[k * 3 + 2]).applyMatrix3(Nm).normalize(); N.push(v.x, v.y, v.z); } else N.push(0, 1, 0);
      UV.push(uv ? uv[k * 2] : 0, uv ? uv[k * 2 + 1] : 0);
    }
    const ix = pr.indices != null ? S.acc(pr.indices) : Array.from({ length: p.length / 3 }, (_, k) => k);
    for (const k of ix) IDX.push(base + k);
    if (material == null) material = pr.material;
  }
});
const sN = P.length / 3;
if (!sN) { console.error('в статичной модели нет сеток'); process.exit(1); }

// ---- поставить модель как донор: длинная горизонтальная ось → ось донора, голова — в ту же сторону
let cx = 0, cz = 0; for (let i = 0; i < sN; i++) { cx += P[i * 3]; cz += P[i * 3 + 2]; } cx /= sN; cz /= sN;
let sxx = 0, szz = 0, sxz = 0; for (let i = 0; i < sN; i++) { const x = P[i * 3] - cx, z = P[i * 3 + 2] - cz; sxx += x * x; szz += z * z; sxz += x * z; }
const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz);   // направление главной оси (от +X к +Z)
const along = (x, z) => (x - cx) * Math.cos(ang) + (z - cz) * Math.sin(ang);
// голова — тот конец, у которого в крайней четверти длины точки выше (у зверей голова над хвостом)
let lo = Infinity, hi = -Infinity; for (let i = 0; i < sN; i++) { const a = along(P[i * 3], P[i * 3 + 2]); lo = Math.min(lo, a); hi = Math.max(hi, a); }
let yHi = -Infinity, yLo = -Infinity; for (let i = 0; i < sN; i++) { const a = along(P[i * 3], P[i * 3 + 2]); if (a > hi - (hi - lo) * 0.25) yHi = Math.max(yHi, P[i * 3 + 1]); if (a < lo + (hi - lo) * 0.25) yLo = Math.max(yLo, P[i * 3 + 1]); }
let headAng = yHi >= yLo ? ang : ang + Math.PI;   // направление «к голове» в плоскости XZ
if (flip) headAng += Math.PI; headAng += yawExtra;
const wantAng = dLong === 'z' ? (dHeadSign > 0 ? Math.PI / 2 : -Math.PI / 2) : (dHeadSign > 0 ? 0 : Math.PI);
const rotY = new T.Matrix4().makeRotationY(-(wantAng - headAng));   // поворот вокруг Y: угол от +X к +Z — это −rotY
{ const v = new T.Vector3(), nm = new T.Matrix3().setFromMatrix4(rotY);
  for (let i = 0; i < sN; i++) { v.set(P[i * 3] - cx, P[i * 3 + 1], P[i * 3 + 2] - cz).applyMatrix4(rotY); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z; v.set(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]).applyMatrix3(nm); N[i * 3] = v.x; N[i * 3 + 1] = v.y; N[i * 3 + 2] = v.z; } }
// рост как у донора, низ на его земле, по центру его рамки
const sBox0 = new T.Box3(); for (let i = 0; i < sN; i++) sBox0.expandByPoint(new T.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
const k = (dBox.max.y - dBox.min.y) / (sBox0.max.y - sBox0.min.y), dC = dBox.getCenter(new T.Vector3()), sC = sBox0.getCenter(new T.Vector3());
for (let i = 0; i < sN; i++) { P[i * 3] = (P[i * 3] - sC.x) * k + dC.x; P[i * 3 + 1] = (P[i * 3 + 1] - sBox0.min.y) * k + dBox.min.y; P[i * 3 + 2] = (P[i * 3 + 2] - sC.z) * k + dC.z; }
const sBox = new T.Box3(); for (let i = 0; i < sN; i++) sBox.expandByPoint(new T.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
// рамка донора → рамка модели по осям
const dS = dBox.getSize(new T.Vector3()), sS = sBox.getSize(new T.Vector3());
const toS = v => new T.Vector3((v.x - dBox.min.x) / dS.x * sS.x + sBox.min.x, (v.y - dBox.min.y) / dS.y * sS.y + sBox.min.y, (v.z - dBox.min.z) / dS.z * sS.z + sBox.min.z);
const toD = (x, y, z) => [(x - sBox.min.x) / sS.x * dS.x + dBox.min.x, (y - sBox.min.y) / sS.y * dS.y + dBox.min.y, (z - sBox.min.z) / sS.z * dS.z + dBox.min.z];

// ---- веса: 6 ближайших вершин донора (сетка-решётка для поиска), 1/d² , потом сглаживание по рёбрам
const cell = Math.max(dS.x, dS.y, dS.z) / 40, grid = new Map(), key = (a, b, c) => a + ',' + b + ',' + c;
for (let i = 0; i < dN; i++) { const g = key(Math.floor(dPos[i * 3] / cell), Math.floor(dPos[i * 3 + 1] / cell), Math.floor(dPos[i * 3 + 2] / cell)); (grid.get(g) || grid.set(g, []).get(g)).push(i); }
const nJ = joints.length, WT = new Float32Array(sN * nJ);
for (let i = 0; i < sN; i++) {
  const [x, y, z] = toD(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]), gx = Math.floor(x / cell), gy = Math.floor(y / cell), gz = Math.floor(z / cell);
  let best = [];
  for (let r = 1; r < 40 && best.length < 6; r++) {
    best = [];
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) for (const q of grid.get(key(gx + a, gy + b, gz + c)) || []) best.push([(dPos[q * 3] - x) ** 2 + (dPos[q * 3 + 1] - y) ** 2 + (dPos[q * 3 + 2] - z) ** 2, q]);
  }
  best.sort((a, b) => a[0] - b[0]); best = best.slice(0, 6);
  for (const [d2, q] of best) { const w = 1 / (d2 + cell * cell * 1e-4); for (let t = 0; t < 4; t++) if (dW[q * 4 + t]) WT[i * nJ + dJ[q * 4 + t]] += w * dW[q * 4 + t]; }
}
const nb = Array.from({ length: sN }, () => new Set());
for (let t = 0; t < IDX.length; t += 3) { const [a, b, c] = [IDX[t], IDX[t + 1], IDX[t + 2]]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
// совпадающие по месту вершины (швы текстуры) тоже соседи — иначе шов рвётся
{ const m = new Map(); for (let i = 0; i < sN; i++) { const g = key(Math.round(P[i * 3] / cell * 50), Math.round(P[i * 3 + 1] / cell * 50), Math.round(P[i * 3 + 2] / cell * 50)); if (m.has(g)) { nb[i].add(m.get(g)); nb[m.get(g)].add(i); } else m.set(g, i); } }
const norm = (A, i) => { let s = 0; for (let q = 0; q < nJ; q++) s += A[i * nJ + q]; if (s) for (let q = 0; q < nJ; q++) A[i * nJ + q] /= s; };
for (let i = 0; i < sN; i++) norm(WT, i);
let cur = WT;
for (let pass = 0; pass < 2; pass++) {
  const nx = new Float32Array(cur.length);
  for (let i = 0; i < sN; i++) { const n = nb[i].size; for (let q = 0; q < nJ; q++) { let s = cur[i * nJ + q] * 2; for (const o of nb[i]) s += cur[o * nJ + q]; nx[i * nJ + q] = s / (2 + n); } }
  cur = nx;
}
const JO = new Uint8Array(sN * 4), WO = new Float32Array(sN * 4);
for (let i = 0; i < sN; i++) {
  const top = Array.from({ length: nJ }, (_, q) => [cur[i * nJ + q], q]).sort((a, b) => b[0] - a[0]).slice(0, 4);
  const s = top.reduce((a, b) => a + b[0], 0) || 1; top.forEach(([w, q], t) => { JO[i * 4 + t] = q; WO[i * 4 + t] = w / s; });
}

// ---- кости: новые мировые позиции (по рамке), повороты те же; локальные сдвиги и сдвиги в ключах анимации — заново
const newWorld = new Map(), oldT = new Map(), newT = new Map();
const worldNew = i => {
  if (newWorld.has(i)) return newWorld.get(i);
  const ji = joints.indexOf(i), w = D.world(i).clone();
  if (ji >= 0) { const p = toS(jPos[ji]); w.setPosition(p); }
  newWorld.set(i, w); return w;
};
for (const i of joints) {
  const n = dj.nodes[i], pw = D.par[i] != null ? worldNew(D.par[i]) : new T.Matrix4(), w = worldNew(i);
  const loc = pw.clone().invert().multiply(w), t = new T.Vector3().setFromMatrixPosition(loc);
  oldT.set(i, n.translation || [0, 0, 0]); newT.set(i, t.toArray()); n.translation = t.toArray();
}
const IBM = new Float32Array(joints.length * 16); joints.forEach((i, q) => IBM.set(worldNew(i).clone().invert().elements, q * 16));

// ---- собрать выход: JSON донора, буфер заново (как glb_pack.py)
const views = dj.bufferViews.map((_, i) => D.view(i)), newViews = new Map();
const setAcc = (ai, arr, extra = {}) => { const a = dj.accessors[ai]; newViews.set(a.bufferView, Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)); a.byteOffset = 0; a.count = extra.count ?? a.count; delete a.min; delete a.max; Object.assign(a, extra); delete dj.bufferViews[a.bufferView].byteStride; };
const bpos = new T.Box3(); for (let i = 0; i < sN; i++) bpos.expandByPoint(new T.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
setAcc(dPrim.attributes.POSITION, new Float32Array(P), { count: sN, min: bpos.min.toArray(), max: bpos.max.toArray() });
setAcc(dPrim.attributes.NORMAL, new Float32Array(N), { count: sN });
setAcc(dPrim.attributes.TEXCOORD_0, new Float32Array(UV), { count: sN });
setAcc(dPrim.attributes.JOINTS_0, JO, { count: sN, componentType: 5121 });
setAcc(dPrim.attributes.WEIGHTS_0, WO, { count: sN });
const I32 = sN > 65535 ? new Uint32Array(IDX) : new Uint16Array(IDX);
setAcc(dPrim.indices, I32, { count: IDX.length, componentType: sN > 65535 ? 5125 : 5123 });
setAcc(skin.inverseBindMatrices, IBM);
// ключи сдвигов: тот же сдвиг относительно покоя (бёдра двигаются, как у донора), остальные — на новое место кости
for (const an of dj.animations || []) for (const ch of an.channels) {
  if (ch.target.path !== 'translation' || !newT.has(ch.target.node)) continue;
  const smp = an.samplers[ch.sampler], src = D.acc(smp.output), o = oldT.get(ch.target.node), nw = newT.get(ch.target.node), out = new Float32Array(src.length);
  for (let q = 0; q < src.length; q += 3) for (let c = 0; c < 3; c++) out[q + c] = src[q + c] + nw[c] - o[c];
  if (newViews.has(dj.accessors[smp.output].bufferView)) { // общий bufferView у нескольких выходов — дать свой
    dj.bufferViews.push({ buffer: 0, byteLength: 0 }); views.push(Buffer.alloc(0)); dj.accessors[smp.output].bufferView = dj.bufferViews.length - 1;
  }
  setAcc(smp.output, out);
}
// текстура модели вместо текстуры донора
const tMat = material != null ? sj.materials[material] : null, tTex = tMat?.pbrMetallicRoughness?.baseColorTexture;
const dMat = dj.materials[dPrim.material], dTex = dMat?.pbrMetallicRoughness?.baseColorTexture;
if (tTex && dTex) {
  const sImg = sj.images[sj.textures[tTex.index].source], dImg = dj.images[dj.textures[dTex.index].source];
  newViews.set(dImg.bufferView, S.view(sImg.bufferView)); dImg.mimeType = sImg.mimeType;
  if (tMat.pbrMetallicRoughness.baseColorFactor) dMat.pbrMetallicRoughness.baseColorFactor = tMat.pbrMetallicRoughness.baseColorFactor;
}
let nb2 = Buffer.alloc(0); const parts = [];
dj.bufferViews.forEach((bv, i) => { const c = newViews.get(i) || views[i]; let off = parts.reduce((a, b) => a + b.length, 0); const pad = (4 - off % 4) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; } bv.byteOffset = off; bv.byteLength = c.length; bv.buffer = 0; parts.push(Buffer.from(c)); });
nb2 = Buffer.concat(parts); if (nb2.length % 4) nb2 = Buffer.concat([nb2, Buffer.alloc(4 - nb2.length % 4)]);
dj.buffers = [{ byteLength: nb2.length }];
let js = Buffer.from(JSON.stringify(dj)); if (js.length % 4) js = Buffer.concat([js, Buffer.alloc(4 - js.length % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + nb2.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.write(type, 4, 'latin1'); return b; };
fs.writeFileSync(outPath, Buffer.concat([head, ch(js.length, 'JSON'), js, ch(nb2.length, 'BIN\0'), nb2]));
console.log(`${targetPath} + риг ${donorPath} → ${outPath}: ${sN} вершин, ${IDX.length / 3} треугольников, ${nJ} костей, ` +
  `пропорции к донору (Ш×В×Д): ${(sS.x / dS.x).toFixed(2)} × ${(sS.y / dS.y).toFixed(2)} × ${(sS.z / dS.z).toFixed(2)}, ${(fs.statSync(outPath).size / 1024) | 0} КБ`);
