// Деревья Meshy (сборка 71): пак assets/models/trees/trees.glb (tools/art/tree_pack.mjs) — дуб, сосна, ель, берёза, молодая берёза,
// рябина, сухая ель, бревно и ель в снегу, грани плоские — как на листе Meshy; три уровня качества (полное, «_mid», «_lo»).
// Заменяется весь лес: акценты (до LIMIT деревьев внутри карты; в деревне — новые деревья у дорог и площадей, villagegen.js) — в
// полном качестве, остальные деревья карты — «_mid», лес за краем карты — «_lo». Действует в деревне, Старом лесу и Фьордах
// (PropLayer зовёт swap) и только при «Новых моделях» (SKINS.on); порода — по таблице MAP, вариант — по позиции. Цвет запечён в
// вершины, текстуры нет — материал тот же, что у процедурных предметов (kit.propMat: ветер, растворение перед героем, затенение у
// земли). Пак грузится до сборки мира (renderer3d.js).
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { SKINS } from './glbskin.js';
import { shared } from './dispose.js';

const URL_ = new URL('../../assets/models/trees/trees.glb', import.meta.url).href;
const GEO = new Map();   // имя дерева → геометрия (высота 1, основание y = 0)
let wait = null, ready = false;
export function preloadForest() {
  if (wait) return wait;
  if (typeof document === 'undefined') return (wait = Promise.resolve(false));
  // грани плоские (нормаль на грань): гладкие нормали размывали листву в «желе»; «_lo» для тени — как есть, на показ — плоская копия «_lo_f»
  const flat = g => { const n = g.toNonIndexed(); n.computeVertexNormals(); g.dispose(); return n; };
  wait = new GLTFLoader().loadAsync(URL_).then(g => { g.scene.traverse(o => { if (!o.isMesh) return; if (o.name.endsWith('_lo')) { GEO.set(o.name, shared(o.geometry)); GEO.set(o.name + '_f', shared(flat(o.geometry.clone()))); } else GEO.set(o.name, shared(flat(o.geometry))); }); return (ready = true); })
    .catch(e => { console.warn('trees pack', e); return false; });
  return wait;
}
export const forestReady = () => ready && SKINS.on;

// рост модели (м при масштабе предмета 1 — у деревьев карты он 1–1,75) и ветер: у каждой породы свой рост и обхват (дуб низкий и
// широкий, сосна и ель высокие, рябина и молодая берёза ниже, куст и бревно у земли); ширину модель держит сама
const T = {
  oak: { h: 4.2, sway: { base: 1.6, amt: 0.02, flutter: 0.03 } }, rowan: { h: 3.4, sway: { base: 1.2, amt: 0.022, flutter: 0.03 } },
  birch: { h: 5.4, sway: { base: 1.6, amt: 0.026, flutter: 0.035 } }, birch_small: { h: 3.0, sway: { base: 1.0, amt: 0.03, flutter: 0.035 } },
  pine: { h: 6.4, sway: { base: 2.5, amt: 0.016, flutter: 0.015 } }, spruce: { h: 5.2, sway: { base: 1.4, amt: 0.018, flutter: 0.02 } },
  deadfir: { h: 4.4, sway: { base: 1.6, amt: 0.012, flutter: 0 } }, log: { h: 0.5 }, bush: { h: 1.0, sway: { base: 0.2, amt: 0.02, flutter: 0.03 } },
  spruce_snow: { h: 4.4, sway: { base: 1.4, amt: 0.015, flutter: 0.015 } },
};
// процедурная порода → модели (варианты вперемешку по позиции, у соседей разные). town — деревня, forest — Старый лес, fjord — Фьорды
const DECID = { tree_0: ['oak', 'birch', 'birch_small'], tree_elm: ['oak', 'birch'], tree_oakwide: ['oak'], tree_autumn: ['birch', 'oak'], tree_poplar: ['birch', 'pine'], tree_birch: ['birch', 'birch_small'], tree_sapling: ['birch_small', 'spruce'] };
const CONIF = { tree_1: ['spruce', 'pine'], tree_pine_tall: ['pine', 'spruce'], tree_fir_blue: ['spruce'] };
const MAP = {
  town: { ...DECID, ...CONIF, tree_0: ['oak', 'rowan', 'birch', 'birch_small'], tree_autumn: ['rowan', 'birch'] },   // в деревне — и рябины
  forest: { ...DECID, ...CONIF, tree_0: ['oak', 'spruce', 'birch'], tree_autumn: ['oak', 'pine'], deadtree: ['deadfir'], deadtree_b: ['deadfir'], deadtree_c: ['deadfir'], deadtree_d: ['deadfir'], deadtree_e: ['deadfir'], stump: ['log', null] },   // null — прежний предмет
  fjord: { tree_fir_snow: ['spruce_snow'], tree_fir_snow_tall: [['spruce_snow', 1.25, 0.85]], tree_fir_snow_small: [['spruce_snow', 0.7, 1]] },   // [модель, рост, ширина]
};
const hash = (x, y) => { let h = (Math.round(x * 17) * 374761393 + Math.round(y * 23) * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const DEFS = new Map();
// lod: '' — полное качество (акценты), '_mid' — остальной лес на карте, '_lo' — лёгкие; cast — отбрасывает ли тень (лес за краем
// карты и глубина окраины деревни — нет: под кронами тени не видно, а проход тени — вторая отрисовка)
function defOf(name, hk, wk, lod, base, cast) {
  const nm = GEO.has(name + lod) ? name + lod : name, geo = GEO.get(lod === '_lo' && GEO.has(nm + '_f') ? nm + '_f' : nm), t = T[name], key = 'fo:' + nm + ':' + hk + ':' + wk + ':' + (base.tint || 0) + (cast ? '' : ':ns');
  if (DEFS.has(key)) return DEFS.get(key);
  const H = t.h * hk, def = { id: key, kind: 'prop', batch: true, outline: false, tint: base.tint, shadow: cast ? base.shadow : false,
    receive: false, side: 'double', rim: 0.12, rimColor: 0xe8ffb0, sway: t.sway,
    build(kit) { const root = new THREE.Group(), m = new THREE.Mesh(geo, kit.propMat(this)); m.scale.set(H * wk, H, H * wk); root.add(m); return { root }; } };
  // тень — от облегчённой «_lo» (только камера тени её видит, props.js shadowProxy): треугольников в проходе тени втрое меньше
  if (cast && base.shadow !== false && GEO.has(name + '_lo')) def.shadowProxy = () => GEO.get(name + '_lo').clone().scale(H * wk, H, H * wk);
  DEFS.set(key, def); return def;
}

// Окраина деревни — «карточки»: дерево, отрисованное один раз в картинку под углом игровой камеры (она не вращается: поворот 45°,
// наклон 0,64 — style.js CAMERA), на плоском прямоугольнике, повёрнутом к камере. 2 треугольника вместо 400–600, без тени.
// Атлас 1024² (4 × 4 ячейки по 256): по две картинки на породу (повороты дерева 0° и 130°), свет запечён.
const CAM_YAW = Math.PI / 4, CAM_PITCH = 0.64, CELL = 256, CARD_SPECIES = ['oak', 'birch', 'birch_small', 'rowan', 'pine', 'spruce', 'deadfir', 'spruce_snow'];
let ATLAS = null;
function bakeCards() {
  if (ATLAS !== null) return ATLAS;
  const R = typeof window !== 'undefined' && window.__R3 && window.__R3.renderer;
  if (!R) return (ATLAS = false);
  const rt = new THREE.WebGLRenderTarget(CELL * 4, CELL * 4, { samples: 4, colorSpace: THREE.SRGBColorSpace, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }), sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xf2f6ff, 0x5a6a3a, 1.9));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4); sun.position.set(-0.4, 1, 0.9); sc.add(sun);
  const dir = new THREE.Vector3(Math.sin(CAM_YAW) * Math.cos(CAM_PITCH), Math.sin(CAM_PITCH), Math.cos(CAM_YAW) * Math.cos(CAM_PITCH)),
    right = new THREE.Vector3(0, 1, 0).cross(dir).normalize(), up = dir.clone().cross(right).normalize();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), cells = {};
  const prev = { rt: R.getRenderTarget(), auto: R.autoClear, col: R.getClearColor(new THREE.Color()), a: R.getClearAlpha(), sh: R.shadowMap.enabled, vp: R.getViewport(new THREE.Vector4()), sc: R.getScissor(new THREE.Vector4()) };
  R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.autoClear = false; R.shadowMap.enabled = false;
  let k = 0;
  for (const name of CARD_SPECIES) for (const turn of [0, 2.27]) {
    const g = GEO.get(name + '_mid') || GEO.get(name); if (!g) continue;
    const m = new THREE.Mesh(g, mat); m.rotation.y = turn; m.updateMatrixWorld(true); sc.add(m);
    // рамка дерева в плоскости камеры
    const P = g.attributes.position, v = new THREE.Vector3(); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); const u = v.dot(right), w = v.dot(up); if (u < u0) u0 = u; if (u > u1) u1 = u; if (w < v0) v0 = w; if (w > v1) v1 = w; }
    const half = Math.max(u1 - u0, v1 - v0) / 2 * 1.04, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    const cam = new THREE.OrthographicCamera(-half, half, half, -half, -10, 10);
    cam.position.copy(dir).multiplyScalar(5).addScaledVector(right, cu).addScaledVector(up, cv); cam.up.copy(up); cam.lookAt(cam.position.clone().sub(dir));
    const cx = k % 4, cy = Math.floor(k / 4);
    const pr = R.getPixelRatio(), c0 = CELL / pr;   // setViewport/setScissor умножают на pixelRatio экрана — в цель рисуем в её пикселях
    R.setViewport(cx * c0, cy * c0, c0, c0); R.setScissor(cx * c0, cy * c0, c0, c0); R.setScissorTest(true);
    R.render(sc, cam); sc.remove(m);
    (cells[name] ||= []).push({ cx, cy, u0: cu - half, u1: cu + half, v0: cv - half, v1: cv + half });
    k++;
  }
  R.setScissorTest(false); R.setViewport(prev.vp); R.setScissor(prev.sc); R.setRenderTarget(prev.rt); R.autoClear = prev.auto; R.setClearColor(prev.col, prev.a); R.shadowMap.enabled = prev.sh;
  const tex = rt.texture;
  const cardMat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, fog: true });
  return (ATLAS = { cells, mat: cardMat, dir, right, up });
}
const CARDS = new Map();
function cardOf(name, variant, hk, wk, base) {
  const key = 'fc:' + name + ':' + variant + ':' + hk + ':' + wk + ':' + (base.tint || 0);
  if (CARDS.has(key)) return CARDS.get(key);
  const t = T[name], H = t.h * hk, def = { id: key, kind: 'prop', batch: true, outline: false, tint: base.tint, shadow: false, receive: false,
    build() {
      const A = bakeCards(), c = A && A.cells[name] && A.cells[name][variant % A.cells[name].length];
      const root = new THREE.Group(); if (!c) return { root };
      // вертикальный прямоугольник поперёк взгляда камеры (её поворот не меняется): высота на экране = высота × cos(наклона), поэтому
      // картинка растянута по высоте на 1 / cos — на экране дерево как в 3D
      // крона спереди на экране ниже основания ствола (она ближе к камере) — прямоугольник выдвинут к камере на D, чтобы низ картинки
      // лёг на землю, а не ушёл под неё: на экране точка та же (луч камеры), меняется только глубина
      const q = [[c.u0, c.v0], [c.u1, c.v0], [c.u1, c.v1], [c.u0, c.v1]], pos = [], uv = [], sp = Math.sin(CAM_PITCH), cp = Math.cos(CAM_PITCH),
        D = Math.max(0, -c.v0) / sp, hx = Math.sin(CAM_YAW), hz = Math.cos(CAM_YAW);
      for (const [u, w] of q) { const p = A.right.clone().multiplyScalar(u); pos.push((p.x + hx * D) * H * wk, (w + D * sp) / cp * H, (p.z + hz * D) * H * wk); }
      for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) uv.push((c.cx + a) / 4, (c.cy + b) / 4);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
      root.add(new THREE.Mesh(g, A.mat)); return { root };
    } };
  CARDS.set(key, def); return def;
}

/** Подмена списков PropLayer: lists — Map(id → [предметы]); where — 'town' | 'forest' | 'fjord'; m — карта зоны (w, h);
 *  statics — предметы зоны (метка акцента); возвращает доп. описания (id → def). Заменяется весь лес: до LIMIT деревьев внутри карты
 *  (не ближе EDGE клеток к краю; в деревне — акценты у дорог, villagegen.js) — в полном качестве, остальные на карте — «_mid»,
 *  лес за краем карты («_far») и в деревне все деревья, кроме акцентов, — «_lo» (акценты деревни — «_mid») */
const LIMIT = { town: 24, forest: 22, fjord: 24 }, EDGE = 3.5;
const outskirt = (m, x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h || m.ch(Math.floor(x), Math.floor(y)) === 'x';
const nearWalk = (m, x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = m.ch(Math.floor(x) + dx, Math.floor(y) + dy); if (c && c !== 'x' && c !== ' ') return true; } return false; };
export function swap(lists, PROPS, where, m, statics = []) {
  const extra = {}, M = MAP[where];
  if (!forestReady() || !M || !m) return extra;
  // в деревне — деревья, которые генератор поставил акцентами у дорог (villagegen.js, opts.accent), и одинокие деревья в глубине
  // деревни (дальше 6 клеток от края)
  const acc = where === 'town' && statics.filter(d => d.opts && d.opts.accent),
    isAcc = it => !acc || (it.x > 6 && it.y > 6 && it.x < m.w - 6 && it.y < m.h - 6) || acc.some(d => Math.abs(d.x - it.x) < 0.05 && Math.abs(d.y - it.y) < 0.05);
  const ok = V => V && V.every(v => v === null || GEO.has(Array.isArray(v) ? v[0] : v)), cand = [];
  for (const [id, list] of lists) {
    if (id.endsWith('_far') || !ok(M[id])) continue;
    for (const it of list) if (it.x > EDGE && it.y > EDGE && it.x < m.w - EDGE && it.y < m.h - EDGE && isAcc(it)) cand.push([id, it, hash(it.x * 1.7 + 5, it.y * 0.9 - 3)]);
  }
  cand.sort((a, b) => a[2] - b[2]);
  const take = new Set(), picked = [];
  for (const c of cand) {   // не ближе 4 м друг к другу — акценты по всей карте, а не кучей
    if (picked.length >= LIMIT[where]) break;
    if (picked.some(p => Math.hypot(p.x - c[1].x, p.y - c[1].y) < 4)) continue;
    picked.push(c[1]); take.add(c[1]);
  }
  for (const [id, list] of [...lists]) {
    const far = id.endsWith('_far'), V = M[far ? id.slice(0, -4) : id];
    if (!ok(V)) continue;
    const keep = [];
    for (const it of list) {
      const v = V[Math.floor(hash(it.x, it.y) * V.length) % V.length];
      if (v === null) { keep.push(it); continue; }
      // деревня — первые минуты игры: акценты — полное качество, остальные — «_lo»; окраина (клетки леса «x» и за краем, куда герой не
      // ходит) — без тени, кроме первого ряда у проходимой земли
      const [name, hk, wk] = Array.isArray(v) ? v : [v, 1, 1], town = where === 'town',
        cast = !far && !(town && outskirt(m, it.x, it.y) && !nearWalk(m, it.x, it.y)),
        card = town && !take.has(it) && T[name].sway && (far || (outskirt(m, it.x, it.y) && !nearWalk(m, it.x, it.y))),   // глубина окраины деревни — карточки
        def = card ? cardOf(name, Math.floor(hash(it.y, it.x) * 2), hk, wk, PROPS[id] || {}) : defOf(name, hk, wk, take.has(it) ? '' : far || town ? '_lo' : '_mid', PROPS[id] || {}, cast);
      if (card) it.rot = 0;   // карточка смотрит в камеру: без поворота предмета
      if (T[name].sway) it.s = 0.8 + (it.s - 0.75) * 0.4;   // разброс роста процедурных (1–1,75) — у новых уже в породе: ±15 %, без великанов
      extra[def.id] = def;
      if (!lists.has(def.id)) lists.set(def.id, []);
      lists.get(def.id).push(it);
    }
    if (keep.length) lists.set(id, keep); else lists.delete(id);
  }
  return extra;
}
