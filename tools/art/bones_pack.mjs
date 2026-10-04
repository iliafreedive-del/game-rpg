// Паки окружения Костяных пустошей из Meshy (по объекту на узел, один атлас на пак) → лёгкие паки для игры:
//   node tools/art/bones_pack.mjs <папка с bones_pack_*_clean.glb> <assets/models/bones> [размер текстуры = 1024]
// Каждый объект: сетка в своих координатах (основание y = 0, центр по X/Z — так их отдаёт пак), число треугольников
// урезается до LIMIT (мелочь, которой на поле сотни, — сильнее), атлас пака → JPEG <размер> px (ImageMagick convert).
// Выход — GLB с теми же именами узлов, материал без PBR-лишнего; игра берёт объект по имени (js/render3d/bonesglb.js).
// Урезка — meshoptimizer (npm i meshoptimizer; путь к пакету — env MESHOPT, по умолчанию ./node_modules/meshoptimizer).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const [src, dst, texSize = '1024'] = process.argv.slice(2);
if (!dst) { console.log('node tools/art/bones_pack.mjs <папка паков> <выход> [текстура]'); process.exit(1); }
const { MeshoptSimplifier: MS } = await import(process.env.MESHOPT ? path.resolve(process.env.MESHOPT, 'index.js') : 'meshoptimizer');
await MS.ready;

// сколько треугольников оставить (по умолчанию — 1600): мелочь, которой на поле сотни, — меньше всего
const LIMIT = {
  agave_a: 160, agave_b: 220, bush_thorn_a: 200, bush_thorn_b: 200, tumbleweed: 150, grass_dry_a: 140, grass_dry_b: 140,
  flowers_desert_a: 160, flowers_desert_b: 160, flowers_desert_c: 160, sand_rock_a: 320, sand_rock_b: 320, sand_rock_c: 320,
  bones_scatter_a: 250, bones_scatter_b: 250, skull_pile: 1000, clay_pots: 600, chest_hide: 800, campfire: 400, war_drum: 900,
  tree_acacia_a: 800, tree_acacia_b: 800, tree_acacia_c: 800, tree_dead_desert_a: 500, tree_dead_desert_b: 500,
  sand_spire_a: 800, sand_spire_b: 800, sand_spire_c: 700, sand_mesa: 900, tusk_fence: 700, hide_rack: 800, war_banner: 700,
  bone_totem_a: 1400, bone_totem_b: 1400, bone_hut_a: 2000, bone_hut_b: 1800, bone_hall: 3000,
  giant_skull: 2200, giant_ribs: 2700, giant_spine: 770, tusk_arch: 2000, giant_fallen: 3200, bone_portal: 2600,
  ruin_column_a: 750, ruin_column_b: 1100, ruin_arch: 1400, ruin_wall_a: 1000, ruin_wall_stairs_altar_ensemble: 3500, ruin_statue: 2000,
};

function readGlb(p) {
  const d = fs.readFileSync(p), L = d.readUInt32LE(12), j = JSON.parse(d.subarray(20, 20 + L).toString()), BL = d.readUInt32LE(20 + L), bin = d.subarray(28 + L, 28 + L + BL);
  const acc = i => {
    const a = j.accessors[i], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const C = { 5126: Float32Array, 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array }[a.componentType];
    const bv = j.bufferViews[a.bufferView], off = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || n * C.BYTES_PER_ELEMENT;
    const out = new C(a.count * n);
    for (let k = 0; k < a.count; k++) { const s = bin.subarray(off + k * stride, off + k * stride + n * C.BYTES_PER_ELEMENT); out.set(new C(s.buffer.slice(s.byteOffset, s.byteOffset + s.byteLength)), k * n); }
    return out;
  };
  const view = i => { const bv = j.bufferViews[i]; return bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength); };
  return { j, acc, view };
}

function writeGlb(p, objs, jpeg) {
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
    const idx = n > 65535 ? o.I : Uint16Array.from(o.I);
    accs.push({ bufferView: put(idx, 34963), componentType: idx instanceof Uint16Array ? 5123 : 5125, count: idx.length, type: 'SCALAR' });
    meshes.push({ name: o.name, primitives: [{ attributes: { POSITION: a0, NORMAL: a0 + 1, TEXCOORD_0: a0 + 2 }, indices: a0 + 3, material: 0 }] });
    nodes.push({ name: o.name, mesh: meshes.length - 1 });
  }
  const img = put(new Uint8Array(jpeg));
  const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
  const j = { asset: { version: '2.0', generator: 'bones_pack.mjs' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, accessors: accs, bufferViews: bvs,
    buffers: [{ byteLength: off }], images: [{ bufferView: img, mimeType: 'image/jpeg' }], samplers: [{ magFilter: 9729, minFilter: 9987 }], textures: [{ source: 0, sampler: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 1 } }] };
  let js = Buffer.from(JSON.stringify(j)); const jp = (4 - (js.length % 4)) % 4; js = Buffer.concat([js, Buffer.alloc(jp, 0x20)]);
  const bin = Buffer.concat(chunks), head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.write(type, 4, 'ascii'); return b; };
  fs.writeFileSync(p, Buffer.concat([head, ch(js.length, 'JSON'), js, ch(bin.length, 'BIN\0'), bin]));
}

fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src).filter(f => /^bones_pack_.*\.glb$/.test(f)).sort()) {
  const G = readGlb(path.join(src, f)), j = G.j, objs = [];
  for (const node of j.nodes) {
    if (node.mesh == null) continue;
    const pr = j.meshes[node.mesh].primitives[0], at = pr.attributes;
    const P = Float32Array.from(G.acc(at.POSITION)), N = Float32Array.from(G.acc(at.NORMAL)), UV = Float32Array.from(G.acc(at.TEXCOORD_0)), I0 = Uint32Array.from(G.acc(pr.indices));
    const lim = (LIMIT[node.name] ?? 1600) * 3;
    let I = I0;
    if (I0.length > lim) {
      const attr = new Float32Array(P.length / 3 * 2); attr.set(UV);
      [I] = MS.simplifyWithAttributes(I0, P, 3, attr, 2, [0.5, 0.5], null, lim, 0.15, []);
      if (I.length > lim * 1.6) [I] = MS.simplifySloppy(I0, P, 3, null, lim, 0.2);
    }
    // выбросить неиспользуемые вершины
    const map = new Int32Array(P.length / 3).fill(-1); let n = 0; for (const v of I) if (map[v] < 0) map[v] = n++;
    const o = { name: node.name, P: new Float32Array(n * 3), N: new Float32Array(n * 3), UV: new Float32Array(n * 2), I: new Uint32Array(I.length) };
    for (let v = 0; v < map.length; v++) if (map[v] >= 0) { o.P.set(P.subarray(v * 3, v * 3 + 3), map[v] * 3); o.N.set(N.subarray(v * 3, v * 3 + 3), map[v] * 3); o.UV.set(UV.subarray(v * 2, v * 2 + 2), map[v] * 2); }
    for (let k = 0; k < I.length; k++) o.I[k] = map[I[k]];
    objs.push(o); console.log(`  ${node.name}: ${I0.length / 3} → ${I.length / 3} тр.`);
  }
  const im = j.images[0], raw = G.view(im.bufferView);
  const jpeg = execFileSync('convert', ['-', '-resize', `${texSize}x${texSize}>`, '-quality', '86', 'jpeg:-'], { input: raw, maxBuffer: 64 << 20 });
  const out = path.join(dst, f.replace(/_clean\.glb$/, '.glb').replace(/^bones_pack_/, ''));
  writeGlb(out, objs, jpeg);
  console.log(`${f} → ${out}: ${(fs.statSync(out).size / 1024) | 0} КБ`);
}
