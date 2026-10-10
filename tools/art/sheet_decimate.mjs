// Тяжёлый лист Meshy (одна сетка ~1–2 млн треугольников, фигуры — отдельные связные куски) → лёгкие GLB по фигурам.
//   node tools/art/sheet_decimate.mjs <лист.glb> <папка> [текстура=2048] [имя=номер:треугольников …]
// Без пар «имя=…» печатает куски (номер, треугольники, рамка) — номера идут рядами: сверху вниз, слева направо.
// Каждая фигура: свой кусок сетки, упрощён meshoptimizer (сохраняет швы UV) до заданного числа треугольников; стопы на y = 0, центр
// по X/Z; формат — как у sheet_split.py (одна сетка, POSITION/NORMAL/TEXCOORD_0, общий атлас листа JPEG). Дальше — glb_mob.py
// (воины), rig_transfer.mjs (звери на скелете волка) или sheet_pack.py (звери на риге beastGlb).
// Нужен пакет meshoptimizer: npm i --no-save meshoptimizer@0.21.0 (или NODE_PATH на папку, где он стоит).
import fs from 'fs';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { MeshoptSimplifier: S } = require('meshoptimizer');

const [src, outDir, texArg = '2048', ...pairs] = process.argv.slice(2);
if (!outDir) { console.log('node tools/art/sheet_decimate.mjs <лист.glb> <папка> [текстура] [имя=номер:треугольников …]'); process.exit(1); }
const d = fs.readFileSync(src), L = d.readUInt32LE(12), j = JSON.parse(d.subarray(20, 20 + L).toString()), bin = d.subarray(28 + L);
const acc = i => {
  const a = j.accessors[i], n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type], C = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[a.componentType];
  const bv = j.bufferViews[a.bufferView], off = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0);
  return new C(bin.buffer.slice(off, off + a.count * n * C.BYTES_PER_ELEMENT));
};
const pr = j.meshes[0].primitives[0], P = acc(pr.attributes.POSITION), N = acc(pr.attributes.NORMAL), UV = acc(pr.attributes.TEXCOORD_0), I = Uint32Array.from(acc(pr.indices));
const nv = P.length / 3, nt = I.length / 3;
// связные куски: вершины в одной точке склеены (у Meshy на швах UV вершины раздвоены)
const par = new Int32Array(nv).map((_, i) => i), f = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
const un = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
const seen = new Map();
for (let v = 0; v < nv; v++) { const k = Math.round(P[v * 3] * 2e4) + ',' + Math.round(P[v * 3 + 1] * 2e4) + ',' + Math.round(P[v * 3 + 2] * 2e4); const o = seen.get(k); if (o === undefined) seen.set(k, v); else un(v, o); }
for (let t = 0; t < nt; t++) { un(I[t * 3], I[t * 3 + 1]); un(I[t * 3], I[t * 3 + 2]); }
const comps = new Map();
for (let t = 0; t < nt; t++) { const r = f(I[t * 3]); let c = comps.get(r); if (!c) comps.set(r, c = { tris: [], lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9] }); c.tris.push(t); for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) { const x = P[I[t * 3 + k] * 3 + a]; if (x < c.lo[a]) c.lo[a] = x; if (x > c.hi[a]) c.hi[a] = x; } }
const list = [...comps.values()].filter(c => c.tris.length > 200).sort((a, b) => (Math.round(b.hi[1] * 4) - Math.round(a.hi[1] * 4)) || (a.lo[0] - b.lo[0]));
list.forEach((c, i) => console.log(i, 'треугольников', c.tris.length, 'рамка', c.lo.map(v => v.toFixed(3)).join(' '), '…', c.hi.map(v => v.toFixed(3)).join(' ')));
if (!pairs.length) process.exit(0);
fs.mkdirSync(outDir, { recursive: true });
const mat = j.materials[pr.material || 0], img = j.images[j.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source], ibv = j.bufferViews[img.bufferView];
const jpg = execFileSync('convert', ['-', '-resize', `${texArg}x${texArg}>`, '-quality', '86', 'jpeg:-'], { input: bin.subarray(ibv.byteOffset || 0, (ibv.byteOffset || 0) + ibv.byteLength), maxBuffer: 1 << 28 });
await S.ready;
for (const pair of pairs) {
  const [name, rest] = pair.split('='), [ci, tgt, yawArg] = rest.split(':'), c = list[+ci];
  // подсетка куска с уплотнёнными вершинами
  const map = new Map(), idx = new Uint32Array(c.tris.length * 3); let n = 0;
  c.tris.forEach((t, k) => { for (let a = 0; a < 3; a++) { const v = I[t * 3 + a]; let m = map.get(v); if (m === undefined) map.set(v, m = n++); idx[k * 3 + a] = m; } });
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (const [v, m] of map) { pos.set(P.subarray(v * 3, v * 3 + 3), m * 3); nrm.set(N.subarray(v * 3, v * 3 + 3), m * 3); uv.set(UV.subarray(v * 2, v * 2 + 2), m * 2); }
  const [sim, err] = S.simplify(idx, pos, 3, +tgt * 3, 1, []);
  const [rem, cnt] = S.compactMesh(sim.slice());
  // rem: старый индекс вершины → новый; rem короче n (вершины после последней использованной в нём отсутствуют)
  const P2 = new Float32Array(cnt * 3), N2 = new Float32Array(cnt * 3), U2 = new Float32Array(cnt * 2), I2 = new Uint16Array(sim.length);
  for (let v = 0; v < n; v++) { const m = rem[v]; if (m === undefined || m >= cnt) continue; P2.set(pos.subarray(v * 3, v * 3 + 3), m * 3); N2.set(nrm.subarray(v * 3, v * 3 + 3), m * 3); U2.set(uv.subarray(v * 2, v * 2 + 2), m * 2); }
  for (let k = 0; k < sim.length; k++) I2[k] = rem[sim[k]];
  // a — фигура стоит на листе чуть повёрнутой (у короля ~25°): плечи разворачиваются вдоль X (лицом к +Z, поворот меньше 45°);
  // главная ось верхней части тела в плане → X. Для воинов (glb_mob.py ищет суставы спереди); звери поворачиваются своими скриптами
  if (yawArg === 'a') {
    let y0 = 1e9, y1 = -1e9; for (let v = 0; v < cnt; v++) { y0 = Math.min(y0, P2[v * 3 + 1]); y1 = Math.max(y1, P2[v * 3 + 1]); }
    let mx = 0, mz = 0, k = 0; const up = v => P2[v * 3 + 1] > y0 + 0.6 * (y1 - y0) && P2[v * 3 + 1] < y0 + 0.85 * (y1 - y0);
    for (let v = 0; v < cnt; v++) if (up(v)) { mx += P2[v * 3]; mz += P2[v * 3 + 2]; k++; }
    mx /= k; mz /= k; let sxx = 0, szz = 0, sxz = 0;
    for (let v = 0; v < cnt; v++) if (up(v)) { const x = P2[v * 3] - mx, z = P2[v * 3 + 2] - mz; sxx += x * x; szz += z * z; sxz += x * z; }
    const a = 0.5 * Math.atan2(2 * sxz, sxx - szz), cs = Math.cos(-a), sn = Math.sin(-a);   // повернуть на −a: главная ось → X
    for (const A of [P2, N2]) for (let v = 0; v < cnt; v++) { const x = A[v * 3], z = A[v * 3 + 2]; A[v * 3] = x * cs - z * sn; A[v * 3 + 2] = x * sn + z * cs; }
    console.log(name, ': поворот плеч к оси X', (a * 180 / Math.PI).toFixed(1) + '°');
  }
  // стопы на y = 0, центр по X/Z
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let v = 0; v < cnt; v++) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], P2[v * 3 + a]); hi[a] = Math.max(hi[a], P2[v * 3 + a]); }
  for (let v = 0; v < cnt; v++) { P2[v * 3] -= (lo[0] + hi[0]) / 2; P2[v * 3 + 1] -= lo[1]; P2[v * 3 + 2] -= (lo[2] + hi[2]) / 2; }
  const mn = [(lo[0] - hi[0]) / 2, 0, (lo[2] - hi[2]) / 2], mx = [(hi[0] - lo[0]) / 2, hi[1] - lo[1], (hi[2] - lo[2]) / 2];
  // GLB
  const chunks = [], bvs = []; let off = 0;
  const put = (buf, target) => { const pad = (-off) & 3; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength); bvs.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}) }); chunks.push(b); off += b.length; return bvs.length - 1; };
  const accs = [{ bufferView: put(P2, 34962), componentType: 5126, count: cnt, type: 'VEC3', min: mn, max: mx }, { bufferView: put(N2, 34962), componentType: 5126, count: cnt, type: 'VEC3' },
    { bufferView: put(U2, 34962), componentType: 5126, count: cnt, type: 'VEC2' }, { bufferView: put(I2, 34963), componentType: 5123, count: I2.length, type: 'SCALAR' }];
  const im = put(new Uint8Array(jpg)); const pad = (-off) & 3; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  const J = { asset: { version: '2.0', generator: 'sheet_decimate' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }], accessors: accs, bufferViews: bvs, buffers: [{ byteLength: off }],
    images: [{ bufferView: im, mimeType: 'image/jpeg' }], samplers: [{ magFilter: 9729, minFilter: 9987 }], textures: [{ source: 0, sampler: 0 }],
    materials: [{ name: 'm', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 1 } }] };
  let js = Buffer.from(JSON.stringify(J)); js = Buffer.concat([js, Buffer.alloc((-js.length) & 3, 0x20)]);
  const body = Buffer.concat(chunks), hdr = Buffer.alloc(12); hdr.writeUInt32LE(0x46546C67, 0); hdr.writeUInt32LE(2, 4); hdr.writeUInt32LE(12 + 8 + js.length + 8 + body.length, 8);
  const h = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
  fs.writeFileSync(`${outDir}/${name}.glb`, Buffer.concat([hdr, h(js.length, 0x4E4F534A), js, h(body.length, 0x004E4942), body]));
  console.log(name, ': кусок', ci, c.tris.length, '→', I2.length / 3, 'треугольников,', cnt, 'вершин, ошибка', err.toFixed(4), 'рост', mx[1].toFixed(3));
}
