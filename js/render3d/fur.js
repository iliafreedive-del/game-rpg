// Шерсть-«карты» и наклейки морд для зверей. Картинки — от художника (assets/art/, бриф docs/art_brief/04_DECALS_FUR.md):
//  fur_atlas.png — 6 полос прядей 1024×256 друг под другом (корень сверху, кончики вниз), серые, альфа 0/1;
//  decal_<id>.webp — атлас 1024×1024 из четырёх наклеек 512: face | face_side (сверху), back | chest (снизу).
// Пряди — полоски из 2 сегментов (изгиб к телу), развешены черепицей по эллипсоидам тела «по ходу шерсти» (назад и вниз).
// Нормали прядей — нормали тела под ними: мех освещается как объём, а не как плоские листики. Тон — цветом вершин зверя.
// Наклейки — «оболочка» поверх головы/туловища: копия геометрии детали, сдвинутая наружу на 6 мм, текстура проецируется
// из пространства детали (спереди + сбоку для морды, сверху для спины, спереди для груди); где картинка прозрачна — дыра.
import * as THREE from '../vendor/three.module.min.js';
import { toon } from './toon.js';

// переключатель (Настройки → «Шерсть и морды зверей»): false — старые конусы и гладкие морды
export const FUR = { on: false };
export const STRIP = { short: 0, long: 1, shaggy: 2, bristle: 3, frost: 4, collar: 5 };
const NSTRIP = 6;
const BASE = new URL('../../assets/art/', import.meta.url).href;
const HAS_DOM = typeof document !== 'undefined';

function load(name, srgb) {
  if (!HAS_DOM) return null;
  const t = new THREE.TextureLoader().load(BASE + name);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4;
  return t;
}
let furTex = null;
function furAtlas() {
  if (furTex || !HAS_DOM) return furTex;
  furTex = load('fur_atlas.png', true); furTex.wrapS = THREE.RepeatWrapping; furTex.wrapT = THREE.ClampToEdgeWrapping;
  return furTex;
}
const decTex = new Map();
function decalAtlas(id) {
  if (!HAS_DOM) return null;
  if (!decTex.has(id)) { const t = load(`decal_${id}.webp`, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; decTex.set(id, t); }
  return decTex.get(id);
}

// двусторонний материал без переворота нормали у изнанки: обе стороны пряди светятся как поверхность тела под ней
const NO_FLIP = THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '');
export function furMat(o = {}) {
  const m = toon(0xffffff, { vc: true, rim: o.rim ?? 0.55, rimColor: o.rimColor ?? 0xffe2b8, side: THREE.DoubleSide, map: furAtlas(), alphaTest: 0.5, ao: 0.72, aoH: 0.55 });
  const base = m.onBeforeCompile;
  m.onBeforeCompile = sh => { base(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', NO_FLIP); };
  const key = m.customProgramCacheKey; m.customProgramCacheKey = () => key() + '-fur';
  m.userData.noOutline = true;
  return m;
}

// ---------------------------------------------------------------- пряди
const _n = new THREE.Vector3(), _d = new THREE.Vector3(), _s = new THREE.Vector3(), _h = new THREE.Vector3(), _p = new THREE.Vector3(), _g = new THREE.Vector3(), _c = new THREE.Color(), _c2 = new THREE.Color();
// Сборщик прядей одной кости: add(...) копит полоски, geometry() отдаёт одну геометрию (position, normal, color, uv).
export function furBuilder(rnd) {
  const P = [], N = [], C = [], UV = [];
  const api = {
    // p — корень, n — нормаль тела, d — направление роста (касательная), W×L — ширина и длина, strip — тип пряди,
    // col/tip — цвет корня и кончика, lift — насколько прядь отходит от тела (рад), droop — изгиб кончика обратно к телу,
    // tw — метров на всю полосу картинки (сколько клоков на ширине пряди)
    card(p, n, d, W, L, o) {
      _n.copy(n).normalize(); _s.crossVectors(_n, d).normalize(); _d.crossVectors(_s, _n).normalize();
      const lift = o.lift ?? 0.35, droop = o.droop ?? 0.25, tw = o.tw ?? 1.0;
      _h.copy(_d).multiplyScalar(Math.cos(lift)).addScaledVector(_n, Math.sin(lift));
      const si = STRIP[o.strip] ?? 0, v1 = 1 - si / NSTRIP - 0.004, v0 = 1 - (si + 1) / NSTRIP + 0.004;
      const u0 = rnd() * 4, du = W / tw;
      // картинка прядей серая (в среднем ≈55 %): цвет вершин поднимаем, чтобы мех был той же светлоты, что тело зверя
      _c.set(o.col).multiplyScalar(o.gain ?? 1.5); _c2.set(o.tip ?? o.col).multiplyScalar(o.gain ?? 1.5);
      const rows = [0, 0.55, 1], ring = [];
      for (const t of rows) {
        // корень утоплен в тело на 2 см, кончик загибается к телу (droop) — прядь «лежит», а не торчит
        _p.copy(p).addScaledVector(_n, -0.02 + 0.0).addScaledVector(_h, L * t).addScaledVector(_n, -droop * L * t * t);
        const cc = _c.clone().lerp(_c2, t);
        ring.push([[_p.x - _s.x * W / 2, _p.y - _s.y * W / 2, _p.z - _s.z * W / 2, u0, v1 + (v0 - v1) * t, cc], [_p.x + _s.x * W / 2, _p.y + _s.y * W / 2, _p.z + _s.z * W / 2, u0 + du, v1 + (v0 - v1) * t, cc]]);
      }
      const nn = [_n.x * 0.85 + _h.x * 0.15, _n.y * 0.85 + _h.y * 0.15, _n.z * 0.85 + _h.z * 0.15];
      const vtx = ([x, y, z, u, v, cc]) => { P.push(x, y, z); N.push(...nn); C.push(cc.r, cc.g, cc.b, 1); UV.push(u, v); };
      for (let r = 0; r < rows.length - 1; r++) {
        const [a, b] = ring[r], [c, e] = ring[r + 1];
        vtx(a); vtx(c); vtx(b); vtx(b); vtx(c); vtx(e);
      }
    },
    // эллипсоид (центр c, радиусы r): пряди рядами по «широте» сверху вниз, плотность — по площади.
    // flow — общий ход шерсти (по умолчанию назад и вниз), minY — нижняя граница (−1…1: брюхо без шерсти), zMin/zMax — срез по длине
    ellipsoid(c, r, o) {
      const W = o.W, L = o.L, cover = o.cover ?? 1.6;
      const area = 4 * Math.PI * Math.pow((Math.pow(r[0] * r[1], 1.6) + Math.pow(r[0] * r[2], 1.6) + Math.pow(r[1] * r[2], 1.6)) / 3, 1 / 1.6);
      const frac = (1 - (o.minY ?? -1)) / 2, n = Math.max(3, Math.round(area * frac * cover / (W * L * 0.55)));
      const flow = o.flow ?? [0, -0.75, -1];
      const ga = Math.PI * (3 - Math.sqrt(5)), off = rnd() * 6.28;
      for (let i = 0; i < n; i++) {
        // точки Фибоначчи на верхней части сферы: равномерно, без комков и дыр
        const y = 1 - (i + 0.5) / n * (1 - (o.minY ?? -1)), rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * ga + off;
        const ux = Math.cos(a) * rr, uz = Math.sin(a) * rr;
        if (o.zMin != null && uz < o.zMin) continue; if (o.zMax != null && uz > o.zMax) continue;
        const pp = new THREE.Vector3(c[0] + ux * r[0], c[1] + y * r[1], c[2] + uz * r[2]);
        const nn = new THREE.Vector3(ux / r[0], y / r[1], uz / r[2]).normalize();
        _g.set(...flow).normalize();
        let dd = _g.clone().addScaledVector(nn, -_g.dot(nn));
        if (dd.lengthSq() < 1e-3) dd.set(0, -1, 0).addScaledVector(nn, nn.y);
        dd.normalize();
        // лёгкий разброс направления и длины, чтобы ряды не читались «сеткой»
        dd.applyAxisAngle(nn, (rnd() - 0.5) * 0.5);
        const k = 0.8 + rnd() * 0.45, t = (y + 1) / 2;
        api.card(pp, nn, dd, W * (0.85 + rnd() * 0.3), L * k, { ...o, col: o.colFn ? o.colFn(t, uz) : o.col });
      }
    },
    // кольцо прядей вокруг оси (хвост, шея, лапа): центр c, ось-направление шерсти axis, радиус rad
    ring(c, axis, rad, count, o) {
      const ax = new THREE.Vector3(...axis).normalize(), a0 = Math.abs(ax.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const e1 = new THREE.Vector3().crossVectors(ax, a0).normalize(), e2 = new THREE.Vector3().crossVectors(ax, e1);
      const off = rnd() * 6.28;
      for (let i = 0; i < count; i++) {
        const a = off + i / count * 6.283, nn = e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
        if (o.skipDown && nn.y < -0.5) continue;
        const pp = new THREE.Vector3(...c).addScaledVector(nn, rad);
        api.card(pp, nn, ax, (o.W ?? 0.2) * (0.85 + rnd() * 0.3), (o.L ?? 0.3) * (0.85 + rnd() * 0.35), o);
      }
    },
    get count() { return P.length / 18; },
    geometry() {
      if (!P.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(C, 4));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
      g.computeBoundingSphere();
      return g;
    },
  };
  return api;
}

// ---------------------------------------------------------------- наклейки
// Шейдер: проекция из пространства детали. aDec = (x, y, z) в долях «коробки» наклейки (−1…1) + номер набора (0 морда, 1 спина, 2 грудь),
// aDN — нормаль детали в том же пространстве (после «запекания» в SkinnedMesh обычная нормаль уже в пространстве модели).
const DEC_V = 'attribute vec4 aDec; attribute vec3 aDN; varying vec4 vDec; varying vec3 vDN;\n';
const DEC_F = /* glsl */`
{
  vec3 q = vDec.xyz; vec3 dn = normalize(vDN); vec4 dc = vec4(0.0);
  if (vDec.w < 0.5) {
    // морда: спереди (x, y) и сбоку (z, y); у картинки сбоку нос смотрит влево, на обе стороны кладём одну и ту же
    float wf = pow(max(dn.z, 0.0), 1.5) + 0.35 * max(dn.y, 0.0) * step(0.0, q.z);
    float ws = pow(abs(dn.x), 1.5) * uSideW;
    vec4 f = decS(0.0, 0.0, vec2(q.x * 0.5 + 0.5, q.y * 0.5 + 0.5));
    vec4 s = decS(1.0, 0.0, vec2(0.5 - q.z * 0.5, q.y * 0.5 + 0.5));
    dc = (f * wf + s * ws) / max(wf + ws, 1e-3);
  } else if (vDec.w < 1.5) {
    dc = decS(0.0, 1.0, vec2(q.x * 0.5 + 0.5, q.z * 0.5 + 0.5)); dc.a *= smoothstep(0.05, 0.45, dn.y);
  } else {
    dc = decS(1.0, 1.0, vec2(q.x * 0.5 + 0.5, q.y * 0.5 + 0.5)); dc.a *= smoothstep(0.05, 0.45, dn.z);
  }
  if (dc.a < 0.5) discard;
  diffuseColor.rgb = dc.rgb * uDecGain;
}
`;
export function decalMat(id, o = {}) {
  const m = toon(0xffffff, { vc: true, rim: o.rim ?? 0.45, rimColor: o.rimColor ?? 0xffe2b8, ao: 0.72, aoH: 0.55 });
  const tex = decalAtlas(id), base = m.onBeforeCompile;
  m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2;
  m.onBeforeCompile = sh => {
    base(sh);
    Object.assign(sh.uniforms, { tDec: { value: tex }, uDecGain: { value: o.gain ?? 1.15 }, uSideW: { value: o.sideW ?? 1.0 } });
    sh.vertexShader = DEC_V + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvDec = aDec; vDN = aDN;');
    sh.fragmentShader = 'uniform sampler2D tDec; uniform float uDecGain; uniform float uSideW; varying vec4 vDec; varying vec3 vDN;\n' +
      // слот атласа (sx, sy) — картинка 512 в углу 1024; за пределами слота прозрачно (без заступа на соседнюю наклейку)
      'vec4 decS(float sx, float sy, vec2 uv) { if (uv.x < 0.01 || uv.x > 0.99 || uv.y < 0.01 || uv.y > 0.99) return vec4(0.0); return texture2D(tDec, vec2(sx * 0.5 + uv.x * 0.5, (1.0 - sy) * 0.5 + uv.y * 0.5)); }\n' +
      sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + DEC_F);
  };
  const key = m.customProgramCacheKey; m.customProgramCacheKey = () => key() + '-decal';
  m.userData.noOutline = true;
  return m;
}
// оболочка-наклейка: geos — геометрии детали (уже на своих местах в пространстве кости), box = { c:[x,y,z], h:[hx,hy,hz] } — коробка проекции,
// set: 0 морда, 1 спина, 2 грудь; push — насколько сдвинуть наружу (м)
export function decalShell(geos, box, set, push = 0.006) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), D = new Float32Array(n * 4), C = new Float32Array(n * 4).fill(1);
  let o = 0;
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.attributes.normal) g.computeVertexNormals();
    const pa = g.attributes.position, na = g.attributes.normal;
    for (let i = 0; i < pa.count; i++, o++) {
      const nx = na.getX(i), ny = na.getY(i), nz = na.getZ(i), x = pa.getX(i) + nx * push, y = pa.getY(i) + ny * push, z = pa.getZ(i) + nz * push;
      P.set([x, y, z], o * 3); N.set([nx, ny, nz], o * 3);
      D.set([(x - box.c[0]) / box.h[0], (y - box.c[1]) / box.h[1], (z - box.c[2]) / box.h[2], set], o * 4);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.BufferAttribute(C, 4));
  g.setAttribute('aDec', new THREE.BufferAttribute(D, 4));
  g.setAttribute('aDN', new THREE.BufferAttribute(N.slice(), 3));
  g.computeBoundingSphere();
  return g;
}
export const hasDecals = id => ['w_wolf', 'f_wolf', 'w_bear', 'w_boar', 'beast', 'ghoul'].includes(id);

// ---------------------------------------------------------------- окраска по наклейке (на процессоре)
// Спина и грудь под прядями не видны, поэтому их рисунок переносится в цвет вершин прядей и тела: та же проекция, что в шейдере.
// Картинки грузятся заранее (ready) в маленьком размере 256×256 (слот 128 px) — для цвета этого хватает.
const pix = new Map();
export const ready = HAS_DOM ? Promise.all(['w_wolf', 'f_wolf', 'w_bear', 'w_boar', 'beast', 'ghoul'].map(id => new Promise(res => {
  const im = new Image();
  im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 256, 256); pix.set(id, x.getImageData(0, 0, 256, 256).data); res(); };
  im.onerror = () => res();
  im.src = BASE + `decal_${id}.webp`;
}))) : Promise.resolve();
// цвет наклейки: слот (sx, sy), uv 0…1 (v вверх); null — нет картинки или прозрачно
function samp(id, sx, sy, u, v) {
  const d = pix.get(id); if (!d || u < 0.01 || u > 0.99 || v < 0.01 || v > 0.99) return null;
  const X = Math.min(255, Math.floor((sx * 0.5 + u * 0.5) * 256)), Y = Math.min(255, Math.floor((sy * 0.5 + (1 - v) * 0.5) * 256)), k = (Y * 256 + X) * 4;
  return [d[k] / 255, d[k + 1] / 255, d[k + 2] / 255, d[k + 3] / 255];
}
const _lin = new THREE.Color();
// перекрасить вершины geometry по наклейке id: set 1 — спина (сверху), 2 — грудь (спереди), 0 — морда; k — сила (0…1).
// keepTone — сохранить светлоту исходной вершины (наклейка задаёт только оттенок и рисунок пятен)
export function tint(g, id, set, box, k = 0.85, o = {}) {
  if (!g || !pix.has(id)) return g;
  const pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color, cs = ca.itemSize;
  for (let i = 0; i < pa.count; i++) {
    const qx = (pa.getX(i) - box.c[0]) / box.h[0], qy = (pa.getY(i) - box.c[1]) / box.h[1], qz = (pa.getZ(i) - box.c[2]) / box.h[2];
    let s = null, w = 1;
    if (set === 1) { s = samp(id, 0, 1, qx * 0.5 + 0.5, qz * 0.5 + 0.5); w = o.sides ? 1 : Math.min(1, Math.max(0, (na.getY(i) + 0.3) / 0.6)); }
    else if (set === 2) { s = samp(id, 1, 1, qx * 0.5 + 0.5, qy * 0.5 + 0.5); w = Math.min(1, Math.max(0, (na.getZ(i) + 0.1) / 0.5)); }
    else {
      const nz = Math.max(0, na.getZ(i)), nx = Math.abs(na.getX(i));
      s = nz > nx ? samp(id, 0, 0, qx * 0.5 + 0.5, qy * 0.5 + 0.5) : samp(id, 1, 0, 0.5 - qz * 0.5, qy * 0.5 + 0.5);
    }
    if (!s || s[3] < 0.5) continue;
    _lin.setRGB(s[0], s[1], s[2], THREE.SRGBColorSpace);   // цвета вершин — линейные
    const a = k * w * s[3];
    ca.setXYZ(i, ca.getX(i) + (_lin.r * (o.gain ?? 1) - ca.getX(i)) * a, ca.getY(i) + (_lin.g * (o.gain ?? 1) - ca.getY(i)) * a, ca.getZ(i) + (_lin.b * (o.gain ?? 1) - ca.getZ(i)) * a);
  }
  ca.needsUpdate = true; return g;
}
