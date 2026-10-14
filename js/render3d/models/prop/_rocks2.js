// Камни леса и Фьордов по референсу пользователя (13 октября): «больше граней и разных форм» — плиты, столбы, валуны, группы.
// Каждый камень вытесан из шара плоскостями (грани-сколы), рёбра чуть скруглены — мягкое затенение, как на рисованном листе камней.
// Лес: светло-серые, зелёный мох на верхних гранях и у подножия, пучки травы у основания.
// Фьорды: сине-серые, снег на верхних гранях (≈¾ поверхности, пятнами) и чуть на подветренном боку; часть камней без снега.
// Утёсы кромки Фьордов — крупные столбы и уступы с плоскими верхами (вместо острых пиков). Всё batch: один инстанс-меш на вид камня.
import { mergeVertices, toCreasedNormals } from '../../../vendor/BufferGeometryUtils.js';
import BUSH from './bush.js';

const FOREST = { lo: 0x8c909e, hi: 0xd0d3dc, moss: [0x5e9628, 0xa6d044], grass: [0x3a7a22, 0xa8dc48] };
const FJORD = { lo: 0x323a4a, hi: 0x5e687c, snow: 0xeef4fb, snowSide: 0xd6e2ee };

// камень: шар, стёсанный плоскостями. o: s — размеры [x, y, z] (полуоси), cuts — число боковых сколов, el — разброс наклона сколов,
// top — наклон верхней грани, td — глубина верхнего скола (меньше — шире плоский верх), side — глубина боковых сколов, det — детализация шара
function chisel(THREE, R, o) {
  let g = new THREE.IcosahedronGeometry(1, o.det ?? (Math.max(...o.s) < 0.4 ? 2 : 3));   // мелкие камни — проще
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
  { const q = g.attributes.position, e = o.box ?? 3.2;   // шар → скруглённый куб: камни коренастые, с плоскими боками
    for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), z = q.getZ(i), k = Math.pow(Math.abs(x) ** e + Math.abs(y) ** e + Math.abs(z) ** e, 1 / e); q.setXYZ(i, x / k, y / k, z / k); } }
  const [sx, sy, sz] = o.s; g.scale(sx, sy, sz);
  // скол — плоскость с нормалью n на доле d от опорного расстояния эллипсоида в этом направлении (так грани режут одинаково при любых пропорциях)
  const P = [], cut = (n, d) => { n.normalize(); P.push([n, d * Math.hypot(sx * n.x, sy * n.y, sz * n.z)]); };
  cut(new THREE.Vector3((R() - 0.5) * (o.top ?? 0.3), 1, (R() - 0.5) * (o.top ?? 0.3)), o.td ?? 0.86);
  cut(new THREE.Vector3(0, -1, 0), 0.55);
  const n = o.cuts ?? 9, a0 = R() * 6.283;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i + (R() - 0.5) * 0.7) / n * 6.283, el = (R() - 0.55) * (o.el ?? 0.9);
    cut(new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), (o.side ?? 0.82) + (R() - 0.5) * 0.12);
  }
  for (let k = 0; k < (o.extra ?? 5); k++) {   // сколы на рёбрах верха — больше граней
    const a = R() * 6.283, el = 0.6 + R() * 0.45;
    cut(new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), 0.8 + R() * 0.08);
  }
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    for (const [nn, d] of P) { const s = v.dot(nn) - d; if (s > 0) v.addScaledVector(nn, -s); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  // лёгкое сглаживание по соседям — рёбра сколов становятся мягкой фаской
  const idx = g.index.array, nb = Array.from({ length: p.count }, () => new Set());
  for (let i = 0; i < idx.length; i += 3) for (let j = 0; j < 3; j++) { const a = idx[i + j], b = idx[i + (j + 1) % 3]; nb[a].add(b); nb[b].add(a); }
  const src = Float32Array.from(p.array), lam = o.soft ?? 0.18;
  for (let i = 0; i < p.count; i++) {
    let x = 0, y = 0, z = 0; for (const j of nb[i]) { x += src[j * 3]; y += src[j * 3 + 1]; z += src[j * 3 + 2]; } const k = nb[i].size;
    p.setXYZ(i, src[i * 3] + (x / k - src[i * 3]) * lam, src[i * 3 + 1] + (y / k - src[i * 3 + 1]) * lam, src[i * 3 + 2] + (z / k - src[i * 3 + 2]) * lam);
  }
  if (o.lean) g.rotateZ(o.lean);
  g.rotateY(o.ry ?? R() * 6.283);
  g.computeBoundingBox(); g.translate(o.x || 0, -g.boundingBox.min.y - 0.04 * sy + (o.y || 0), o.z || 0);
  return g;
}

const n3 = (kit, x, y, z, f, sd) => (kit.geo.noise(x * f + sd, z * f - sd * 0.7) + kit.geo.noise(y * f + sd * 1.3, (x + z) * f * 0.8)) * 0.5;

// покраска по граням: цвет камня (низ темнее), мох или снег на гранях, смотрящих вверх, по пятнам шума
function colorize(kit, g, H, look, seed, snow) {
  const { THREE } = kit, s = toCreasedNormals(g, 0.38), p = s.attributes.position, col = new Float32Array(p.count * 4);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nrm = new THREE.Vector3(), C = new THREE.Color(), lo = new THREE.Color(look.lo), hi = new THREE.Color(look.hi);
  const wind = new THREE.Vector3(Math.cos(seed), 0, Math.sin(seed));
  const sm = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const M0 = look.moss && new THREE.Color(look.moss[0]), M1 = look.moss && new THREE.Color(look.moss[1]), SN = look.snow && new THREE.Color(look.snow), SS = look.snow && new THREE.Color(look.snowSide), T = new THREE.Color();
  for (let f = 0; f < p.count; f += 3) {
    a.fromBufferAttribute(p, f); b.fromBufferAttribute(p, f + 1); c.fromBufferAttribute(p, f + 2);
    nrm.subVectors(b, a).cross(c.clone().sub(a)).normalize();
    for (let j = 0; j < 3; j++) {   // грань решает, может ли тут лежать мох/снег; пятно по шуму в вершинах — край пятна мягкий
      const q = j === 0 ? a : j === 1 ? b : c, t = Math.min(1, Math.max(0, q.y / H)), nz = n3(kit, q.x, q.y, q.z, 2.2, seed);
      C.copy(lo).lerp(hi, 0.35 + t * 0.65).multiplyScalar(0.95 + nz * 0.1);
      if (look.moss) {
        const top = sm(0.45, 0.7, nrm.y) * sm(0.46, 0.5, nz), base = sm(0.24, 0.1, q.y) * sm(-0.5, -0.2, nrm.y) * sm(0.38, 0.5, n3(kit, q.x, q.y, q.z, 3.1, seed + 5));
        if (top > 0) C.lerp(T.copy(M1).lerp(M0, Math.max(0, 0.8 - nrm.y) * 1.2), top);
        if (base > 0) C.lerp(M0, base);
      } else if (snow) {
        const top = sm(0.38, 0.55, nrm.y) * sm(0.33, 0.36, nz);   // ≈¾ верхних граней
        const side = sm(0.35, 0.55, nrm.dot(wind)) * sm(-0.2, 0, nrm.y) * sm(0.4, 0.6, t) * sm(0.5, 0.53, n3(kit, q.x, q.y, q.z, 3.3, seed + 9));   // намёт на боку
        if (top > 0) C.lerp(SN, top); else if (side > 0) C.lerp(SS, side);
      }
      col.set([C.r, C.g, C.b, 1], (f + j) * 4);
    }
  }
  s.setAttribute('color', new THREE.BufferAttribute(col, 4)); return s;
}

// пучок травы у подножия: узкие листья веером, низ тёмный, кончики светлые
function tuft(kit, R, x, z, n = 9, h = 0.42) {
  const { THREE, geo } = kit, L = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283 + R() * 0.8, hh = h * (0.6 + R() * 0.6), g = new THREE.ConeGeometry(0.07, hh, 3, 1).scale(1, 1, 0.3);
    g.translate(0, hh / 2, 0); g.rotateZ(0.25 + R() * 0.45); g.rotateY(a); g.translate(x + Math.cos(a) * 0.03, -0.02, z - Math.sin(a) * 0.03);
    L.push(geo.paint(g, FOREST.grass[0], { top: FOREST.grass[1] }));
  }
  return L;
}

// набор камня: pieces — [s, x, z, extra] (extra — опции chisel), tufts — [x, z, n, h]
function build(kit, def, look, snow) {
  const { THREE, geo } = kit, R = geo.rng(def.seed), L = [];
  def.pieces.forEach(([s, x, z, o = {}], i) => {
    const g = chisel(THREE, R, { s, x, z, ...o }); g.computeBoundingBox();
    L.push(colorize(kit, g, g.boundingBox.max.y, look, def.seed * 3.7 + i * 1.9, snow && !(o.bare)));
  });
  if (look.moss) for (const [x, z, n, h] of def.tufts || []) L.push(...tuft(kit, R, x, z, n, h));
  return L;
}
const mk = (id, def, look, snow = true, extra = {}) => ({ id, kind: 'prop', batch: true, outline: false, tint: 0.1, ao: 0.75, aoH: 1.0, ...extra,
  build(kit) { const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(kit.merge(build(kit, def, look, snow)), kit.propMat(this))); return { root }; } });

// формы с референса: высокая плита, пара стоячих камней, валун, «барабан»-столб, низкая плита, группа, наклонный камень
const SHAPES = {
  menhir: { seed: 11, pieces: [[[0.5, 1.45, 0.36], 0, 0, { top: 0.25 }], [[0.28, 0.24, 0.26], 0.52, 0.22]], tufts: [[0.32, 0.3, 11, 0.49], [-0.38, 0.12, 9, 0.38], [0.1, -0.34, 8, 0.3]] },
  twin: { seed: 23, pieces: [[[0.42, 1.15, 0.36], -0.22, 0, { top: 0.2 }], [[0.34, 0.75, 0.3], 0.36, 0.14, { top: 0.25 }], [[0.18, 0.15, 0.18], 0.1, 0.5]], tufts: [[0.05, 0.38, 10, 0.46], [-0.6, 0.15, 9, 0.41], [0.7, -0.1, 8, 0.32]] },
  boulder: { seed: 37, pieces: [[[0.85, 0.55, 0.7], 0, 0, { cuts: 8, td: 0.7, top: 0.15 }]], tufts: [[0.7, 0.35, 11, 0.43], [-0.75, -0.2, 9, 0.35]] },
  drum: { seed: 41, pieces: [[[0.5, 0.78, 0.5], 0, 0, { cuts: 9, el: 0.15, side: 0.86, td: 0.8, top: 0.08, extra: 2 }], [[0.2, 0.17, 0.2], 0.55, 0.25]], tufts: [[-0.45, 0.3, 11, 0.54], [0.35, -0.4, 9, 0.41]] },
  slab: { seed: 53, pieces: [[[1.0, 0.3, 0.72], 0, 0, { cuts: 7, td: 0.62, top: 0.1, el: 0.5 }], [[0.3, 0.22, 0.28], 0.45, -0.1, { y: 0.24 }]], tufts: [[-0.9, 0.3, 10, 0.41], [0.85, 0.45, 9, 0.35]] },
  group: { seed: 67, pieces: [[[0.5, 0.48, 0.45], 0, 0], [[0.3, 0.3, 0.28], 0.62, 0.2], [[0.22, 0.2, 0.2], -0.55, 0.32], [[0.16, 0.13, 0.15], 0.15, -0.55]], tufts: [[0.3, 0.55, 10, 0.43], [-0.3, -0.4, 9, 0.38], [0.95, -0.15, 8, 0.3]] },
  leaner: { seed: 79, pieces: [[[0.38, 1.1, 0.32], 0.1, 0, { lean: -0.28, top: 0.2 }], [[0.55, 0.45, 0.5], -0.42, 0.05, { ry: 0.4 }]], tufts: [[0.45, 0.3, 10, 0.46], [-0.2, 0.5, 9, 0.35]] },
};
// утёсы кромки Фьордов: крупные столбы и уступы, верх плоский (в снегу), без острых пиков
const CRAGS = {
  cliff: { seed: 91, pieces: [[[0.85, 2.5, 0.75], 0, 0, { cuts: 8, el: 0.25, top: 0.3, td: 0.82 }], [[0.7, 1.8, 0.62], 1.05, 0.35, { cuts: 8, el: 0.25, top: 0.3 }], [[0.6, 1.25, 0.55], -0.95, 0.45, { cuts: 7, el: 0.3 }], [[0.4, 0.35, 0.38], 0.5, 1.0]] },
  stack: { seed: 97, pieces: [[[1.6, 0.9, 1.3], 0, 0, { cuts: 9, el: 0.3, td: 0.7, top: 0.1 }], [[1.05, 0.75, 0.9], 0.25, -0.15, { y: 0.78, td: 0.72, top: 0.15 }], [[0.55, 0.55, 0.5], -0.1, -0.2, { y: 1.42, top: 0.25 }]] },
  wall: { seed: 103, pieces: [[[0.7, 1.6, 0.65], -1.3, 0, { el: 0.25 }], [[0.75, 2.2, 0.7], -0.25, 0.1, { el: 0.25, top: 0.35 }], [[0.65, 1.3, 0.6], 0.8, -0.05, { el: 0.25 }], [[0.55, 0.9, 0.55], 1.65, 0.15], [[0.35, 0.3, 0.32], 0.3, 0.75]] },
};

const FO = Object.entries(SHAPES).map(([k, d]) => mk('fo_rock2_' + k, d, FOREST));
// во Фьордах снег не на всех: «барабан» и «пара» — голые
const FJ = Object.entries(SHAPES).map(([k, d]) => mk('fj_rock2_' + k, d, FJORD, k !== 'drum' && k !== 'twin'));
const FJC = Object.entries(CRAGS).map(([k, d]) => mk('fj_crag2_' + k, d, FJORD, true, { aoH: 2.2 }));
// куст Фьордов (13 октября: «почему левый куст и правый такие разные?» — во Фьордах стояли и пышный куст bush, и плоский папоротник fern).
// Теперь там один вид: тот же пышный куст, листва чуть холоднее, верх в снегу
const bushSnow = { ...BUSH, id: 'bush_snow', rimColor: 0xe8f4ff,
  build(kit) {
    const { root } = BUSH.build.call(this, kit), g = root.children[0].geometry, p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    g.computeBoundingBox(); const y0 = g.boundingBox.min.y, H = g.boundingBox.max.y - y0, S = [0.93, 0.96, 1.0];
    for (let i = 0; i < c.count; i++) {
      const t = (p.getY(i) - y0) / H, k = Math.min(1, Math.max(0, (n.getY(i) - 0.15) * 2.2)) * Math.min(1, Math.max(0, (t - 0.45) * 3)) * 0.9;
      const r = c.getX(i) * 0.85, gg = c.getY(i) * 0.9, b = c.getZ(i) * 1.05;   // хвойно-холодный оттенок
      c.setXYZ(i, r + (S[0] - r) * k, gg + (S[1] - gg) * k, b + (S[2] - b) * k);
    }
    c.needsUpdate = true; return { root };
  } };
export const ROCKS2_PROPS = [...FO, ...FJ, ...FJC, bushSnow];

export const FO_ROCKS2 = [['fo_rock2_menhir', 1], ['fo_rock2_twin', 0.8], ['fo_rock2_boulder', 1.2], ['fo_rock2_drum', 0.7], ['fo_rock2_slab', 1], ['fo_rock2_group', 1.1], ['fo_rock2_leaner', 0.7]];
export const FJ_ROCKS2 = [['fj_rock2_menhir', 1], ['fj_rock2_twin', 0.8], ['fj_rock2_boulder', 1.2], ['fj_rock2_drum', 0.7], ['fj_rock2_slab', 1], ['fj_rock2_group', 1.1], ['fj_rock2_leaner', 0.7]];
export const FJ_CRAGS2 = [['fj_crag2_cliff', 1], ['fj_crag2_stack', 1], ['fj_crag2_wall', 1]];
