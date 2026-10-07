// Одиночный предмет из Meshy → лёгкий GLB для игры (одна сетка, одна текстура JPEG, без карт нормалей/металла).
//   node tools/art/prop_pack.mjs <Meshy_AI_*.glb> <assets/models/<имя>.glb> [текстура = 1024]
// Сетка: центр по X/Z, основание y = 0, высота = 1 (размер в игре задаёт код предмета). Текстура → JPEG (ImageMagick convert).
import fs from 'fs';
import { execFileSync } from 'child_process';

const [src, dst, texSize = '1024'] = process.argv.slice(2);
if (!dst) { console.log('node tools/art/prop_pack.mjs <вход.glb> <выход.glb> [текстура]'); process.exit(1); }
const d = fs.readFileSync(src), L = d.readUInt32LE(12), j = JSON.parse(d.subarray(20, 20 + L).toString()), bin = d.subarray(28 + L);
const acc = i => {
  const a = j.accessors[i], n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type], C = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[a.componentType];
  const bv = j.bufferViews[a.bufferView], off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  return new C(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * C.BYTES_PER_ELEMENT));
};
const pr = j.meshes[0].primitives[0], P = acc(pr.attributes.POSITION), N = acc(pr.attributes.NORMAL), UV = acc(pr.attributes.TEXCOORD_0), I = acc(pr.indices), nv = P.length / 3;
const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
for (let v = 0; v < nv; v++) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], P[v * 3 + c]); mx[c] = Math.max(mx[c], P[v * 3 + c]); }
const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2, s = 1 / (mx[1] - mn[1]);
for (let v = 0; v < nv; v++) { P[v * 3] = (P[v * 3] - cx) * s; P[v * 3 + 1] = (P[v * 3 + 1] - mn[1]) * s; P[v * 3 + 2] = (P[v * 3 + 2] - cz) * s; }
const Ix = nv < 65536 ? Uint16Array.from(I) : Uint32Array.from(I);
console.log(`  ${I.length / 3} тр., ширина ${((mx[0] - mn[0]) * s).toFixed(2)}, глубина ${((mx[2] - mn[2]) * s).toFixed(2)} (при высоте 1)`);

const base = j.materials[pr.material || 0].pbrMetallicRoughness.baseColorTexture.index, bvImg = j.bufferViews[j.images[j.textures[base].source].bufferView];
const jpeg = execFileSync('convert', ['-', '-resize', `${texSize}x${texSize}>`, '-quality', '86', 'jpeg:-'], { input: bin.subarray(bvImg.byteOffset || 0, (bvImg.byteOffset || 0) + bvImg.byteLength), maxBuffer: 64 << 20 });

const chunks = [], bvs = []; let off = 0;
const put = (arr, target) => { const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } bvs.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}) }); chunks.push(b); off += b.length; return bvs.length - 1; };
const pmn = [-0.5 * (mx[0] - mn[0]) * s, 0, -0.5 * (mx[2] - mn[2]) * s], pmx = [0.5 * (mx[0] - mn[0]) * s, 1, 0.5 * (mx[2] - mn[2]) * s];
const accs = [
  { bufferView: put(P, 34962), componentType: 5126, count: nv, type: 'VEC3', min: pmn, max: pmx },
  { bufferView: put(N, 34962), componentType: 5126, count: nv, type: 'VEC3' },
  { bufferView: put(UV, 34962), componentType: 5126, count: nv, type: 'VEC2' },
  { bufferView: put(Ix, 34963), componentType: Ix instanceof Uint16Array ? 5123 : 5125, count: Ix.length, type: 'SCALAR' },
];
const img = put(new Uint8Array(jpeg));
const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
const name = dst.split('/').pop().replace(/\.glb$/, '');
const J = { asset: { version: '2.0', generator: 'prop_pack.mjs' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name, mesh: 0 }],
  meshes: [{ name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }], accessors: accs, bufferViews: bvs,
  buffers: [{ byteLength: off }], images: [{ bufferView: img, mimeType: 'image/jpeg' }], samplers: [{ magFilter: 9729, minFilter: 9987 }], textures: [{ source: 0, sampler: 0 }],
  materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 1 }, doubleSided: true }] };
let js = Buffer.from(JSON.stringify(J)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const B = Buffer.concat(chunks), head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + B.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.write(type, 4, 'ascii'); return b; };
fs.writeFileSync(dst, Buffer.concat([head, ch(js.length, 'JSON'), js, ch(B.length, 'BIN\0'), B]));
console.log(`${dst}: ${(fs.statSync(dst).size / 1024) | 0} КБ`);
