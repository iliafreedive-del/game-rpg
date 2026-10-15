// Лист деревьев Meshy (одна сетка ~94 тыс. треугольников, деревья — кучки несвязных кусков: ствол, клочья листвы) → лёгкий пак.
//   node tools/art/tree_pack.mjs <лист.glb> <выход.glb> [имя=номер:треугольников[:snow[:допуск]] …]   (snow — «snow» или пусто)
// Без пар «имя=…» печатает деревья листа (номер, треугольники, рамка).
// Атлас Meshy нарезан на тысячи крошечных островков UV — с ними сетку почти не урезать (каждый шов заперт). Поэтому цвет атласа
// запекается в цвет вершин (RGBA, как у процедурных предметов — js/render3d/geo.js), вершины в одной точке склеиваются, и
// meshoptimizer урезает сетку до заданного числа треугольников. Текстуры в паке нет: дерево рисуется материалом предметов
// (kit.propMat: ветер, растворение перед героем, затенение у земли). Основание y = 0, центр ствола по X/Z, высота = 1
// (рост в игре задаёт js/render3d/forestglb.js). «:snow» — грани, смотрящие вверх, белеют (ели Фьордов в снегу).
// Нужен meshoptimizer: npm i --no-save meshoptimizer@0.21.0 (или NODE_PATH на папку, где он стоит); ImageMagick convert.
import fs from 'fs';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { MeshoptSimplifier: S } = require('meshoptimizer');

const [src, dst, ...pairs] = process.argv.slice(2);
if (!dst) { console.log('node tools/art/tree_pack.mjs <лист.glb> <выход.glb> [имя=номер:треугольников[:snow] …]'); process.exit(1); }
const d = fs.readFileSync(src), L = d.readUInt32LE(12), j = JSON.parse(d.subarray(20, 20 + L).toString()), bin = d.subarray(28 + L);
const acc = i => {
  const a = j.accessors[i], n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type], C = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[a.componentType];
  const bv = j.bufferViews[a.bufferView], off = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0);
  return new C(bin.buffer.slice(off, off + a.count * n * C.BYTES_PER_ELEMENT));
};
const pr = j.meshes[0].primitives[0], P = acc(pr.attributes.POSITION), N = acc(pr.attributes.NORMAL), UV = acc(pr.attributes.TEXCOORD_0), I = Uint32Array.from(acc(pr.indices));
const nv = P.length / 3, nt = I.length / 3;
// склейка вершин в одной точке (у Meshy на швах UV они раздвоены): W[v] — номер склеенной вершины
const W = new Int32Array(nv), first = [], seen = new Map();
for (let v = 0; v < nv; v++) { const k = Math.round(P[v * 3] * 2e4) + ',' + Math.round(P[v * 3 + 1] * 2e4) + ',' + Math.round(P[v * 3 + 2] * 2e4); let o = seen.get(k); if (o === undefined) { seen.set(k, o = first.length); first.push(v); } W[v] = o; }
const nw = first.length;
// связные куски
const par = new Int32Array(nw).map((_, i) => i), f = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
const un = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
for (let t = 0; t < nt; t++) { un(W[I[t * 3]], W[I[t * 3 + 1]]); un(W[I[t * 3]], W[I[t * 3 + 2]]); }
const cm = new Map();
for (let t = 0; t < nt; t++) { const r = f(W[I[t * 3]]); let c = cm.get(r); if (!c) cm.set(r, c = { tris: [], lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9] }); c.tris.push(t); for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) { const x = P[I[t * 3 + k] * 3 + a]; if (x < c.lo[a]) c.lo[a] = x; if (x > c.hi[a]) c.hi[a] = x; } }
// дерево = крупный кусок (ствол с ветвями, ≥ 2500 тр.; env SEED — другой порог) + мелкие клочья листвы: клочок идёт к самому тесному дереву, в рамке
// которого лежит его центр (рамки деревьев на листе пересекаются — крона дуба нависает над соседями), иначе — к ближайшей рамке
const all = [...cm.values()].sort((a, b) => b.tris.length - a.tris.length), mid = c => [0, 1, 2].map(k => (c.lo[k] + c.hi[k]) / 2);
const inBox = (p, c, e = 0) => [0, 1, 2].every(k => p[k] > c.lo[k] - e && p[k] < c.hi[k] + e), vol = c => (c.hi[0] - c.lo[0]) * (c.hi[1] - c.lo[1]) * (c.hi[2] - c.lo[2]);
const boxD = (p, c) => Math.hypot(...[0, 1, 2].map(k => Math.max(c.lo[k] - p[k], 0, p[k] - c.hi[k])));
let cl = [];
for (const c of all) {
  const m = mid(c);
  if (c.tris.length >= (+process.env.SEED || 2500) && !cl.some(t => inBox(m, t))) { cl.push({ tris: [...c.tris], lo: [...c.lo], hi: [...c.hi], seed: { lo: c.lo, hi: c.hi } }); continue; }
  const hit = cl.filter(t => inBox(m, t.seed, 0.01)).sort((a, b) => vol(a.seed) - vol(b.seed))[0] || cl.slice().sort((a, b) => boxD(m, a.seed) - boxD(m, b.seed))[0];
  hit.tris.push(...c.tris); for (let k = 0; k < 3; k++) { hit.lo[k] = Math.min(hit.lo[k], c.lo[k]); hit.hi[k] = Math.max(hit.hi[k], c.hi[k]); }
}
cl.sort((a, b) => (Math.round(b.hi[1] * 2) - Math.round(a.hi[1] * 2)) || (a.lo[0] - b.lo[0]));   // рядами: верхний ряд листа, потом нижний; слева направо
cl.forEach((c, i) => console.log(i, 'треугольников', c.tris.length, 'рамка', c.lo.map(v => v.toFixed(3)).join(' '), '…', c.hi.map(v => v.toFixed(3)).join(' ')));
if (!pairs.length) process.exit(0);

// цвет склеенной вершины = среднее атласа (512 px, чуть размыт — без мелкого шума островков) по всем её копиям, в линейном цвете
const mat = j.materials[pr.material || 0], img = j.images[j.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source], ibv = j.bufferViews[img.bufferView];
const T = 512, rgb = execFileSync('convert', ['-', '-resize', `${T}x${T}!`, '-blur', '0x0.6', '-depth', '8', 'rgb:-'], { input: bin.subarray(ibv.byteOffset || 0, (ibv.byteOffset || 0) + ibv.byteLength), maxBuffer: 1 << 28 });
// env FACE=1 — цвет по граням (сборка 73): каждая грань урезанной сетки берёт цвет ближайшей грани исходника, снятый с атласа в полном
// размере (2048, без размытия) — грани чёткие, как у лоупольной модели Meshy, а не «мыло» усреднённого цвета вершин
const TF = 2048, rgbF = process.env.FACE ? execFileSync('convert', ['-', '-resize', `${TF}x${TF}!`, '-depth', '8', 'rgb:-'], { input: bin.subarray(ibv.byteOffset || 0, (ibv.byteOffset || 0) + ibv.byteLength), maxBuffer: 1 << 28 }) : null;
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const COL = new Float32Array(nw * 3), CN = new Float32Array(nw), NW = new Float32Array(nw * 3);
for (let v = 0; v < nv; v++) {
  const x = Math.min(T - 1, Math.max(0, Math.floor(UV[v * 2] * T))), y = Math.min(T - 1, Math.max(0, Math.floor(UV[v * 2 + 1] * T))), o = (y * T + x) * 3, w = W[v];
  for (let k = 0; k < 3; k++) { COL[w * 3 + k] += lin(rgb[o + k]); NW[w * 3 + k] += N[v * 3 + k]; } CN[w]++;
}
const PW = new Float32Array(nw * 3);
// env GAIN — яркость атласа (у первого листа Meshy с запечённой тенью был нужен ×1,3; у листа Low Poly — 1)
for (let w = 0; w < nw; w++) { for (let k = 0; k < 3; k++) COL[w * 3 + k] = Math.min(1, COL[w * 3 + k] / CN[w] * (+process.env.GAIN || 1)); PW.set(P.subarray(first[w] * 3, first[w] * 3 + 3), w * 3); const l = Math.hypot(NW[w * 3], NW[w * 3 + 1], NW[w * 3 + 2]) || 1; for (let k = 0; k < 3; k++) NW[w * 3 + k] /= l; }
await S.ready; S.useExperimentalFeatures = true;   // simplifyWithAttributes в 0.21 — «экспериментальная»
const nz = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };

const chunks = [], bvs = [], accs = [], meshes = [], nodes = []; let off = 0;
const put = (buf, target) => { const pad = (-off) & 3; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength); bvs.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}) }); chunks.push(b); off += b.length; return bvs.length - 1; };
for (const pair of pairs) {
  const [name, rest] = pair.split('='), [ci, tgt, snow, er] = rest.split(':'), c = cl[+ci], whole = er || process.env.WHOLE;
  const map = new Map(), idx = []; let n = 0;
  for (const t of c.tris) {
    const q = [W[I[t * 3]], W[I[t * 3 + 1]], W[I[t * 3 + 2]]]; if (q[0] === q[1] || q[1] === q[2] || q[0] === q[2]) continue;
    for (const w of q) { let m = map.get(w); if (m === undefined) map.set(w, m = n++); idx.push(m); }
  }
  let pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (const [w, m] of map) { pos.set(PW.subarray(w * 3, w * 3 + 3), m * 3); nrm.set(NW.subarray(w * 3, w * 3 + 3), m * 3); col.set(COL.subarray(w * 3, w * 3 + 3), m * 3); }
  // урезка по кускам: общая урезка «съедает» мелкие клочья листвы целиком (берёза оставалась голой) — каждый кусок урезается
  // в одной доле, но не меньше чем до 4 треугольников, так что клочок остаётся на месте и своего размера
  const pp = new Int32Array(n).map((_, i) => i), g = x => { while (pp[x] !== x) { pp[x] = pp[pp[x]]; x = pp[x]; } return x; };
  for (let k = 0; k < idx.length; k += 3) { const a = g(idx[k]); pp[g(idx[k + 1])] = a; pp[g(idx[k + 2])] = a; }
  const parts = new Map(); for (let k = 0; k < idx.length; k += 3) { const r = g(idx[k]); if (!parts.has(r)) parts.set(r, []); parts.get(r).push(idx[k], idx[k + 1], idx[k + 2]); }
  let ratio = +tgt * 3 / idx.length, sim;
  // «:допуск» в паре (или env WHOLE) — урезка всей сетки разом до допуска ошибки (доля размера): крупные «лоупольные» клочья листвы
  // держат форму (лист Low Poly); треугольников — сколько выйдет при допуске (число в паре — нижняя граница, 0 — без неё)
  if (whole) [sim] = S.simplifyWithAttributes(Uint32Array.from(idx), pos, 3, col, 3, [0.6, 0.6, 0.6], null, Math.min(+tgt * 3, idx.length), +whole, []);
  else for (let it = 0; it < 6; it++) {   // доля подбирается, чтобы в сумме выйти на заданное число
    const out = [];
    for (const l of parts.values()) {
      const want = Math.max(12, Math.round(l.length * ratio / 3) * 3);
      if (want >= l.length) { out.push(...l); continue; }
      let [r] = S.simplifyWithAttributes(Uint32Array.from(l), pos, 3, col, 3, [0.6, 0.6, 0.6], null, want, 0.05, []);
      if (r.length > want * 1.2) [r] = S.simplifyWithAttributes(Uint32Array.from(l), pos, 3, col, 3, [0.6, 0.6, 0.6], null, want, 1, []);
      out.push(...r);
    }
    sim = Uint32Array.from(out);
    if (Math.abs(sim.length - +tgt * 3) < +tgt * 0.15) break;
    ratio *= +tgt * 3 / sim.length;
  }
  let FC = null;   // цвет каждой грани sim (FACE)
  if (rgbF) {
    const cen = new Float32Array(c.tris.length * 3), fcol = new Float32Array(c.tris.length * 3), cell = 0.01, grid = new Map(), key = (x, y, z) => Math.floor(x / cell) + ',' + Math.floor(y / cell) + ',' + Math.floor(z / cell);
    c.tris.forEach((t, i) => {
      for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) cen[i * 3 + a] += P[I[t * 3 + k] * 3 + a] / 3;
      const sm = (u, v) => { const x = Math.min(TF - 1, Math.max(0, Math.floor(u * TF))), y = Math.min(TF - 1, Math.max(0, Math.floor(v * TF))), o = (y * TF + x) * 3; return [lin(rgbF[o]), lin(rgbF[o + 1]), lin(rgbF[o + 2])]; };
      const uv = [0, 1, 2].map(k => [UV[I[t * 3 + k] * 2], UV[I[t * 3 + k] * 2 + 1]]), us = (uv[0][0] + uv[1][0] + uv[2][0]) / 3, vs = (uv[0][1] + uv[1][1] + uv[2][1]) / 3;
      const pts = [[us, vs], ...uv.map(([u, v]) => [(u * 2 + us) / 3, (v * 2 + vs) / 3])];
      for (const [u, v] of pts) { const q = sm(u, v); for (let a = 0; a < 3; a++) fcol[i * 3 + a] += q[a] / pts.length; }
      const k0 = key(cen[i * 3], cen[i * 3 + 1], cen[i * 3 + 2]); if (!grid.has(k0)) grid.set(k0, []); grid.get(k0).push(i);
    });
    FC = new Float32Array(sim.length);
    for (let f = 0; f < sim.length / 3; f++) {
      const x = (pos[sim[f * 3] * 3] + pos[sim[f * 3 + 1] * 3] + pos[sim[f * 3 + 2] * 3]) / 3, y = (pos[sim[f * 3] * 3 + 1] + pos[sim[f * 3 + 1] * 3 + 1] + pos[sim[f * 3 + 2] * 3 + 1]) / 3, z = (pos[sim[f * 3] * 3 + 2] + pos[sim[f * 3 + 1] * 3 + 2] + pos[sim[f * 3 + 2] * 3 + 2]) / 3;
      let best = -1, bd = 1e9;
      for (let r = 0; r < 6 && best < 0; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        const L = grid.get(Math.floor(x / cell + dx) + ',' + Math.floor(y / cell + dy) + ',' + Math.floor(z / cell + dz)); if (!L) continue;
        for (const i of L) { const d = (cen[i * 3] - x) ** 2 + (cen[i * 3 + 1] - y) ** 2 + (cen[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i; } }
      }
      if (best < 0) best = 0;
      FC.set(fcol.subarray(best * 3, best * 3 + 3), f * 3);
    }
    // грани — отдельные вершины: sim раскрывается, у каждой грани свой цвет
    const pos2 = new Float32Array(sim.length * 3), col2 = new Float32Array(sim.length * 3), nrm2 = new Float32Array(sim.length * 3), sim2 = new Uint32Array(sim.length);
    for (let k = 0; k < sim.length; k++) { pos2.set(pos.subarray(sim[k] * 3, sim[k] * 3 + 3), k * 3); nrm2.set(nrm.subarray(sim[k] * 3, sim[k] * 3 + 3), k * 3); col2.set(FC.subarray(Math.floor(k / 3) * 3, Math.floor(k / 3) * 3 + 3), k * 3); sim2[k] = k; }
    pos = pos2; col = col2; nrm = nrm2; sim = sim2; n = sim.length;
  }
  const rem = new Int32Array(n).fill(-1); let cnt = 0; for (const v of sim) if (rem[v] < 0) rem[v] = cnt++;
  let P2 = new Float32Array(cnt * 3), N2 = new Float32Array(cnt * 3), C2 = new Uint8Array(cnt * 4), I2 = new Uint16Array(sim.length);
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let v = 0; v < n; v++) if (rem[v] >= 0) { P2.set(pos.subarray(v * 3, v * 3 + 3), rem[v] * 3); N2.set(nrm.subarray(v * 3, v * 3 + 3), rem[v] * 3); for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], pos[v * 3 + a]); hi[a] = Math.max(hi[a], pos[v * 3 + a]); } }
  for (let k = 0; k < sim.length; k++) I2[k] = rem[sim[k]];
  // снег на ели: чем больше грань смотрит вверх и чем выше — тем белее; пятнами; у земли ствол без снега
  for (let v = 0; v < n; v++) {
    const m = rem[v]; if (m < 0) continue;
    let r = col[v * 3], g = col[v * 3 + 1], b = col[v * 3 + 2];
    if (snow === 'snow') {
      const hy = (pos[v * 3 + 1] - lo[1]) / (hi[1] - lo[1]), up = nrm[v * 3 + 1];
      let k = Math.min(1, Math.max(0, (up - 0.15) / 0.6)) * (0.5 + 0.5 * hy) * (0.7 + 0.6 * nz(pos[v * 3] * 40, pos[v * 3 + 1] * 40, pos[v * 3 + 2] * 40));
      if (hy < 0.1) k *= hy / 0.1; k = Math.min(0.8, k);
      r += (0.82 - r) * k; g += (0.88 - g) * k; b += (0.95 - b) * k;
    }
    C2[m * 4] = Math.round(Math.min(1, r) * 255); C2[m * 4 + 1] = Math.round(Math.min(1, g) * 255); C2[m * 4 + 2] = Math.round(Math.min(1, b) * 255); C2[m * 4 + 3] = 255;
  }
  // основание y = 0, центр ствола по X/Z (по 3 % самых низких вершин — крона бывает кривой), высота = 1
  const H = hi[1] - lo[1], low = []; for (let v = 0; v < cnt; v++) if (P2[v * 3 + 1] < lo[1] + H * 0.03) low.push(v);
  const bx = low.reduce((s, v) => s + P2[v * 3], 0) / low.length, bz = low.reduce((s, v) => s + P2[v * 3 + 2], 0) / low.length;
  for (let v = 0; v < cnt; v++) { P2[v * 3] = (P2[v * 3] - bx) / H; P2[v * 3 + 1] = (P2[v * 3 + 1] - lo[1]) / H; P2[v * 3 + 2] = (P2[v * 3 + 2] - bz) / H; }
  // «:x» — у сухой ели Meshy сучья только в две стороны (плоская): к ней добавляются две копии, повёрнутые вокруг ствола и пониже
  // (ствол копии уже и короче — прячется в исходном), сучья расходятся во все стороны на разной высоте
  if (snow === 'x') {
    const K = [[0, 1, 1], [1.45, 0.93, 0.84], [2.65, 0.88, 0.68]], P3 = new Float32Array(cnt * 9), N3 = new Float32Array(cnt * 9), C3 = new Uint8Array(cnt * 12), I3 = new Uint16Array(I2.length * 3);
    K.forEach(([a, s, h], k) => { const c = Math.cos(a), sn = Math.sin(a);
      for (let v = 0; v < cnt; v++) { const x = P2[v * 3], z = P2[v * 3 + 2], nx = N2[v * 3], nz = N2[v * 3 + 2], o = (k * cnt + v) * 3;
        P3[o] = (x * c - z * sn) * s; P3[o + 1] = P2[v * 3 + 1] * h; P3[o + 2] = (x * sn + z * c) * s;
        N3[o] = nx * c - nz * sn; N3[o + 1] = N2[v * 3 + 1]; N3[o + 2] = nx * sn + nz * c; }
      C3.set(C2, k * cnt * 4); for (let i = 0; i < I2.length; i++) I3[k * I2.length + i] = I2[i] + k * cnt; });
    P2 = P3; N2 = N3; C2 = C3; I2 = I3; cnt *= 3;
  }
  const mn = [1e9, 0, 1e9], mx = [-1e9, 1, -1e9];
  for (let v = 0; v < cnt; v++) for (const a of [0, 2]) { mn[a] = Math.min(mn[a], P2[v * 3 + a]); mx[a] = Math.max(mx[a], P2[v * 3 + a]); }
  const a0 = accs.length;
  accs.push({ bufferView: put(P2, 34962), componentType: 5126, count: cnt, type: 'VEC3', min: mn, max: mx }, { bufferView: put(N2, 34962), componentType: 5126, count: cnt, type: 'VEC3' },
    { bufferView: put(C2, 34962), componentType: 5121, normalized: true, count: cnt, type: 'VEC4' }, { bufferView: put(I2, 34963), componentType: 5123, count: I2.length, type: 'SCALAR' });
  meshes.push({ name, primitives: [{ attributes: { POSITION: a0, NORMAL: a0 + 1, COLOR_0: a0 + 2 }, indices: a0 + 3, material: 0 }] });
  nodes.push({ name, mesh: meshes.length - 1 });
  console.log(`  ${name}: ${c.tris.length} → ${I2.length / 3} тр., ширина ${(mx[0] - mn[0]).toFixed(2)} × ${(mx[2] - mn[2]).toFixed(2)} при высоте 1`);
}
{ const pad = (-off) & 3; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } }
const J = { asset: { version: '2.0', generator: 'tree_pack.mjs' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, accessors: accs, bufferViews: bvs, buffers: [{ byteLength: off }],
  materials: [{ name: 'trees', pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 1 }, doubleSided: true }] };
let js = Buffer.from(JSON.stringify(J)); js = Buffer.concat([js, Buffer.alloc((-js.length) & 3, 0x20)]);
const body = Buffer.concat(chunks), hdr = Buffer.alloc(12); hdr.writeUInt32LE(0x46546C67, 0); hdr.writeUInt32LE(2, 4); hdr.writeUInt32LE(12 + 8 + js.length + 8 + body.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.write(type, 4, 'ascii'); return b; };
fs.writeFileSync(dst, Buffer.concat([hdr, ch(js.length, 'JSON'), js, ch(body.length, 'BIN\0'), body]));
console.log(`${dst}: ${(fs.statSync(dst).size / 1024) | 0} КБ`);
