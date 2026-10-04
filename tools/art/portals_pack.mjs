// Пак порталов деревни из Meshy: один GLB с пятью арками (одна сетка, один атлас) → assets/models/portals.glb.
//   node tools/art/portals_pack.mjs <Meshy_AI_Fantasy_Portal_Arches_*.glb> <assets/models/portals.glb> [текстура = 1024]
// Сетка режется на связные куски (их ровно пять — по арке), каждый кусок: центр по X/Z, основание y = 0, высота = 1
// (размер в игре задаёт js/render3d/portalglb.js). Арки в паке стоят лицом к +Z. Атлас → JPEG (ImageMagick convert).
// Имя узла — по месту арки в исходнике (верхний ряд слева направо, потом нижний) → NAMES.
import fs from 'fs';
import { execFileSync } from 'child_process';

const [src, dst, texSize = '1024'] = process.argv.slice(2);
if (!dst) { console.log('node tools/art/portals_pack.mjs <вход.glb> <выход.glb> [текстура]'); process.exit(1); }
// верх-лево (ледяная), верх-середина (кости), низ-лево (камень с черепами), низ-середина (мечи), низ-право (солнце)
const NAMES = ['portal_white', 'portal_bones', 'portal_skulls', 'portal_swords', 'portal_sun'];

const d = fs.readFileSync(src), L = d.readUInt32LE(12), j = JSON.parse(d.subarray(20, 20 + L).toString()), bin = d.subarray(28 + L);
const acc = i => {
  const a = j.accessors[i], n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type], C = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[a.componentType];
  const bv = j.bufferViews[a.bufferView], off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  return new C(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * C.BYTES_PER_ELEMENT));
};
const pr = j.meshes[0].primitives[0], P = acc(pr.attributes.POSITION), N = acc(pr.attributes.NORMAL), UV = acc(pr.attributes.TEXCOORD_0), I = acc(pr.indices);
const nv = P.length / 3;

// связные куски: вершины склеиваются по треугольникам и по совпадающим координатам (швы UV)
const par = Int32Array.from({ length: nv }, (_, i) => i), f = x => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; }, un = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
const seen = new Map();
for (let v = 0; v < nv; v++) { const k = [0, 1, 2].map(c => P[v * 3 + c].toFixed(5)).join(','); if (seen.has(k)) un(v, seen.get(k)); else seen.set(k, v); }
for (let t = 0; t < I.length; t += 3) { un(I[t], I[t + 1]); un(I[t], I[t + 2]); }
const groups = new Map();
for (let t = 0; t < I.length; t += 3) { const r = f(I[t]); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(I[t], I[t + 1], I[t + 2]); }
const parts = [...groups.values()].filter(g => g.length > 300).map(g => {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const v of g) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], P[v * 3 + c]); mx[c] = Math.max(mx[c], P[v * 3 + c]); }
  return { g, mn, mx };
});
if (parts.length !== 5) throw new Error('ожидалось 5 арок, найдено ' + parts.length);
parts.sort((a, b) => (b.mn[1] > -0.1) - (a.mn[1] > -0.1) || a.mn[0] - b.mn[0]);   // верхний ряд, затем слева направо

const objs = parts.map(({ g, mn, mx }, k) => {
  const map = new Int32Array(nv).fill(-1); let n = 0; for (const v of g) if (map[v] < 0) map[v] = n++;
  const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2, s = 1 / (mx[1] - mn[1]);
  const o = { name: NAMES[k], P: new Float32Array(n * 3), N: new Float32Array(n * 3), UV: new Float32Array(n * 2), I: Uint16Array.from(g, v => map[v]) };
  for (let v = 0; v < nv; v++) if (map[v] >= 0) {
    const m = map[v];
    o.P.set([(P[v * 3] - cx) * s, (P[v * 3 + 1] - mn[1]) * s, (P[v * 3 + 2] - cz) * s], m * 3);
    o.N.set(N.subarray(v * 3, v * 3 + 3), m * 3); o.UV.set(UV.subarray(v * 2, v * 2 + 2), m * 2);
  }
  console.log(`  ${o.name}: ${g.length / 3} тр., ширина ${((mx[0] - mn[0]) * s).toFixed(2)}, глубина ${((mx[2] - mn[2]) * s).toFixed(2)} (при высоте 1)`);
  return o;
});

const base = j.materials[0].pbrMetallicRoughness.baseColorTexture.index, bvImg = j.bufferViews[j.images[j.textures[base].source].bufferView];
const jpeg = execFileSync('convert', ['-', '-resize', `${texSize}x${texSize}>`, '-quality', '86', 'jpeg:-'], { input: bin.subarray(bvImg.byteOffset || 0, (bvImg.byteOffset || 0) + bvImg.byteLength), maxBuffer: 64 << 20 });

// запись GLB: по узлу на арку, общий материал с атласом
const chunks = [], bvs = [], accs = [], meshes = [], nodes = [];
let off = 0;
const put = (arr, target) => { const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } bvs.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}) }); chunks.push(b); off += b.length; return bvs.length - 1; };
for (const o of objs) {
  const n = o.P.length / 3, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], o.P[i * 3 + k]); mx[k] = Math.max(mx[k], o.P[i * 3 + k]); }
  const a0 = accs.length;
  accs.push({ bufferView: put(o.P, 34962), componentType: 5126, count: n, type: 'VEC3', min: mn, max: mx });
  accs.push({ bufferView: put(o.N, 34962), componentType: 5126, count: n, type: 'VEC3' });
  accs.push({ bufferView: put(o.UV, 34962), componentType: 5126, count: n, type: 'VEC2' });
  accs.push({ bufferView: put(o.I, 34963), componentType: 5123, count: o.I.length, type: 'SCALAR' });
  meshes.push({ name: o.name, primitives: [{ attributes: { POSITION: a0, NORMAL: a0 + 1, TEXCOORD_0: a0 + 2 }, indices: a0 + 3, material: 0 }] });
  nodes.push({ name: o.name, mesh: meshes.length - 1 });
}
const img = put(new Uint8Array(jpeg));
const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
const J = { asset: { version: '2.0', generator: 'portals_pack.mjs' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, accessors: accs, bufferViews: bvs,
  buffers: [{ byteLength: off }], images: [{ bufferView: img, mimeType: 'image/jpeg' }], samplers: [{ magFilter: 9729, minFilter: 9987 }], textures: [{ source: 0, sampler: 0 }],
  materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 1 }, doubleSided: true }] };
let js = Buffer.from(JSON.stringify(J)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const B = Buffer.concat(chunks), head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + B.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.write(type, 4, 'ascii'); return b; };
fs.writeFileSync(dst, Buffer.concat([head, ch(js.length, 'JSON'), js, ch(B.length, 'BIN\0'), B]));
console.log(`${dst}: ${(fs.statSync(dst).size / 1024) | 0} КБ`);
