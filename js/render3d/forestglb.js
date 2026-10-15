// Деревья Meshy (сборка 71–72): пак assets/models/trees/trees.glb (tools/art/tree_pack.mjs) — ель и ель в снегу (лист «Low Poly Forest
// Trees»), грани плоские, три уровня качества (полное, «_mid», «_lo»). Сборка 72: новыми остались только ели — прежние tree_1 и
// tree_fir_blue в деревне и Старом лесу, ели в снегу во Фьордах; остальные породы прежние. В деревне глубина краевого леса и лес за
// краем — карточки (картинка дерева под углом камеры на 2 треугольниках). Только при «Новых моделях» (SKINS.on). Цвет запечён в
// вершины — материал тот же, что у процедурных предметов (kit.propMat). Пак грузится до сборки мира (renderer3d.js).
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { SKINS } from './glbskin.js';
import { shared } from './dispose.js';
import { U } from './toon.js';

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
// процедурная порода → модели (варианты вперемешку по позиции). Сборка 72: новыми остались только ели (tree_1, tree_fir_blue), остальные
// породы — прежние. town — деревня, forest — Старый лес, fjord — Фьорды
const MAP = {
  town: { tree_1: ['spruce'], tree_fir_blue: ['spruce'] },
  forest: { tree_1: ['spruce'], tree_fir_blue: ['spruce'] },
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
// наклон 0,64 — style.js CAMERA), на плоском прямоугольнике поперёк взгляда камеры. 2 треугольника вместо сотен, без тени и ветра.
// Атлас 2048² (8 × 8 ячеек по 256) заполняется по мере надобности: по две картинки (повороты 0° и 130°) на породу — и прежние
// процедурные деревья (их облик из PROPS), и ели Meshy. Свет запечён.
// Сборка 73: картинка рисуется теми же материалами, что и 3D-дерево в игре, при свете этой зоны (копия солнца и неба сцены), ячейка
// 512 px — карточка неотличима от дерева, кроме ветра и тени. Атлас 2048 × 4096 (4 × 8 ячеек).
const CAM_YAW = Math.PI / 4, CAM_PITCH = 0.64, CELL = 512, GX = 4, GY = 8;
let ATLAS = null;
function atlas() {
  if (ATLAS !== null) return ATLAS;
  const R = typeof window !== 'undefined' && window.__R3 && window.__R3.renderer;
  if (!R) return (ATLAS = false);
  // вылет в Жатве на телефоне (15 октября): атлас был целью со сглаживанием 4× и буфером глубины — 2048 × 4096 × 4 выборки цвета
  // и столько же глубины ≈ 270 МБ видеопамяти, которые держались всю игру (и в Жатве, и в подземельях). Теперь атлас — простая
  // текстура без глубины (≈ 45 МБ с мип-уровнями), а сглаженная картинка рисуется в маленькую цель на одну ячейку и переносится в атлас
  const rt = new THREE.WebGLRenderTarget(CELL * GX, CELL * GY, { samples: 0, depthBuffer: false, colorSpace: THREE.SRGBColorSpace, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }), sc = new THREE.Scene();
  const dir = new THREE.Vector3(Math.sin(CAM_YAW) * Math.cos(CAM_PITCH), Math.sin(CAM_PITCH), Math.cos(CAM_YAW) * Math.cos(CAM_PITCH)),
    right = new THREE.Vector3(0, 1, 0).cross(dir).normalize(), up = dir.clone().cross(right).normalize();
  const mat = new THREE.MeshBasicMaterial({ map: rt.texture, alphaTest: 0.45, side: THREE.DoubleSide, fog: true });
  return (ATLAS = { R, rt, sc, dir, right, up, mat, cells: new Map(), next: 0, tmp: null, tmpT: 0 });
}
// цель одной ячейки со сглаживанием 4× (≈ 8 МБ) и копия из неё в атлас; через 3 с после последней ячейки цель освобождается
const blit = { sc: null, cam: null, mat: null };
function cellTarget(A) {
  clearTimeout(A.tmpT); A.tmpT = setTimeout(() => { if (A.tmp) { A.tmp.dispose(); A.tmp = null; } }, 3000);
  if (!A.tmp) A.tmp = new THREE.WebGLRenderTarget(CELL, CELL, { samples: 4, colorSpace: THREE.SRGBColorSpace });
  if (!blit.sc) { blit.mat = new THREE.MeshBasicMaterial({ blending: THREE.NoBlending, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
    blit.sc = new THREE.Scene(); blit.sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blit.mat)); blit.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1); }
  blit.mat.map = A.tmp.texture; return A.tmp;
}
// свет для запекания — копия неба, заполняющего и солнца игровой сцены (без точечных: факелы и свет героя)
function bakeLights(sc) {
  for (const l of [...sc.children]) if (l.isLight) sc.remove(l);
  const S = window.__R3 && window.__R3.scene; if (!S) return;
  S.traverse(l => {
    if (!l.isLight || l.isPointLight || l.isSpotLight || !(l.intensity > 0) || !l.visible) return;
    const c = l.isHemisphereLight ? new THREE.HemisphereLight(l.color, l.groundColor, l.intensity) : l.isAmbientLight ? new THREE.AmbientLight(l.color, l.intensity) : l.isDirectionalLight ? new THREE.DirectionalLight(l.color, l.intensity) : null;
    if (!c) return;
    if (l.isDirectionalLight) { l.updateMatrixWorld(); l.target.updateMatrixWorld(); c.position.setFromMatrixPosition(l.matrixWorld).sub(new THREE.Vector3().setFromMatrixPosition(l.target.matrixWorld)); }
    sc.add(c);
  });
}
/** ячейка атласа с картинкой предмета: make() — Object3D (как стоит в мире при масштабе 1), turn — поворот вокруг оси */
function cell(key, make, turn) {
  const A = atlas(); if (!A) return null;
  if (A.cells.has(key)) return A.cells.get(key);
  if (A.next >= GX * GY) return null;
  const src = make(), obj = new THREE.Group(), tmp = [];
  src.rotation.y = turn; src.updateMatrixWorld(true);
  src.traverse(o => { if (!o.isMesh || o.userData.isOutline || o.layers.mask === 2) return; const mm = new THREE.Mesh(o.geometry, o.material); o.matrixWorld.decompose(mm.position, mm.quaternion, mm.scale); obj.add(mm); tmp.push(mm); });
  obj.updateMatrixWorld(true);
  const v = new THREE.Vector3(); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const mm of tmp) { const P = mm.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(mm.matrixWorld); const u = v.dot(A.right), w = v.dot(A.up); if (u < u0) u0 = u; if (u > u1) u1 = u; if (w < v0) v0 = w; if (w > v1) v1 = w; } }
  if (!tmp.length) return null;
  const half = Math.max(u1 - u0, v1 - v0) / 2 * 1.04, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, -50, 50);
  cam.position.copy(A.dir).multiplyScalar(20).addScaledVector(A.right, cu).addScaledVector(A.up, cv); cam.up.copy(A.up); cam.lookAt(cam.position.clone().sub(A.dir));
  const k = A.next++, cx = k % GX, cy = Math.floor(k / GX), R = A.R;
  const prev = { rt: R.getRenderTarget(), auto: R.autoClear, col: R.getClearColor(new THREE.Color()), a: R.getClearAlpha(), sh: R.shadowMap.enabled, vp: R.getViewport(new THREE.Vector4()), sc: R.getScissor(new THREE.Vector4()), st: R.getScissorTest() };
  const pr = R.getPixelRatio(), c0 = CELL / pr;   // setViewport/setScissor умножают на pixelRatio экрана — в цель рисуем в её пикселях
  const tgt = cellTarget(A);
  R.setRenderTarget(tgt); R.autoClear = false; R.shadowMap.enabled = false; R.setClearColor(0x000000, 0);
  R.setScissorTest(false); R.setViewport(0, 0, c0, c0); R.clear();
  // общие uniform-ы игры на время снимка: без ветра, тумана у земли и растворения у героя/врагов
  const sv = { w: U.uWindStr.value, f: U.uHFog.value, c: U.uCam.value.clone(), h: U.uFocus.value.clone(), e: U.uFoc.value.map(q => q.clone()) };
  U.uWindStr.value = 0; U.uHFog.value = 0; U.uCam.value.set(0, -900, 0); U.uFocus.value.set(0, -1000, 0); for (const q of U.uFoc.value) q.set(0, -50, 0, 0);
  bakeLights(A.sc); A.sc.add(obj); R.render(A.sc, cam); A.sc.remove(obj);
  R.setRenderTarget(A.rt); R.setViewport(cx * c0, cy * c0, c0, c0); R.setScissor(cx * c0, cy * c0, c0, c0); R.setScissorTest(true); R.render(blit.sc, blit.cam);
  U.uWindStr.value = sv.w; U.uHFog.value = sv.f; U.uCam.value.copy(sv.c); U.uFocus.value.copy(sv.h); U.uFoc.value.forEach((q, i) => q.copy(sv.e[i]));
  R.setScissorTest(prev.st); R.setViewport(prev.vp); R.setScissor(prev.sc); R.setRenderTarget(prev.rt); R.autoClear = prev.auto; R.setClearColor(prev.col, prev.a); R.shadowMap.enabled = prev.sh;
  const c = { cx, cy, u0: cu - half, u1: cu + half, v0: cv - half, v1: cv + half }; A.cells.set(key, c); return c;
}
// прямоугольник карточки: вертикальный, поперёк взгляда камеры; высота растянута на 1 / cos(наклона) — на экране как в 3D. Крона спереди
// на экране ниже основания ствола (она ближе к камере) — прямоугольник выдвинут к камере на D, чтобы низ картинки лёг на землю
function cardGeo(c) {
  const A = ATLAS, q = [[c.u0, c.v0], [c.u1, c.v0], [c.u1, c.v1], [c.u0, c.v1]], pos = [], uv = [], sp = Math.sin(CAM_PITCH), cp = Math.cos(CAM_PITCH),
    D = Math.max(0, -c.v0) / sp, hx = Math.sin(CAM_YAW), hz = Math.cos(CAM_YAW);
  for (const [u, w] of q) { const p = A.right.clone().multiplyScalar(u); pos.push(p.x + hx * D, (w + D * sp) / cp, p.z + hz * D); }
  for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) uv.push((c.cx + a) / GX, (c.cy + b) / GY);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
const CARDS = new Map();
/** карточка: src — id прежнего дерева (PROPS) или имя модели Meshy (T); variant 0/1 — поворот дерева на картинке */
function cardOf(src, variant, base, PROPS, hk = 1, wk = 1) {
  const key = 'fc:' + src + ':' + variant + ':' + hk + ':' + wk + ':' + (base.tint || 0);
  if (CARDS.has(key)) return CARDS.get(key);
  const def = { id: key, kind: 'prop', batch: true, outline: false, tint: base.tint, shadow: false, receive: false,
    build(kit) {
      const root = new THREE.Group();
      const make = T[src] ? () => defOf(src, hk, wk, '_mid', base, false).build(kit).root : () => PROPS[src].build(kit).root;
      const c = cell(src + ':' + variant + ':' + hk + ':' + wk, make, variant ? 2.27 : 0);
      if (c) root.add(new THREE.Mesh(cardGeo(c), ATLAS.mat));
      return { root };
    } };
  CARDS.set(key, def); return def;
}

/** Подмена списков PropLayer: lists — Map(id → [предметы]); where — 'town' | 'forest' | 'fjord'; m — карта зоны (w, h);
 *  возвращает доп. описания (id → def). Ели (прежние tree_1 и tree_fir_blue; во Фьордах — ели в снегу) — модели Meshy: на карте «_mid»,
 *  за краем — «_lo». Остальные породы — прежние. В деревне глубина краевого леса (клетки «x» не у проходимой земли) и лес за краем —
 *  карточки (и ели, и прежние деревья) */
const outskirt = (m, x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h || m.ch(Math.floor(x), Math.floor(y)) === 'x';
const nearWalk = (m, x, y, r = 1) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const c = m.ch(Math.floor(x) + dx, Math.floor(y) + dy); if (c && c !== 'x' && c !== ' ') return true; } return false; };
export function swap(lists, PROPS, where, m) {
  const extra = {}, M = MAP[where];
  if (!forestReady() || !M || !m) return extra;
  const ok = V => V && V.every(v => v === null || GEO.has((Array.isArray(v) ? v[0] : v) + '_mid')), town = where === 'town';
  for (const [id, list] of [...lists]) {
    const far = id.endsWith('_far'), src = far ? id.slice(0, -4) : id, V = ok(M[src]) ? M[src] : null, oldTree = /^tree_/.test(src) && PROPS[src] && PROPS[src].build;
    if (!V && !(town && oldTree)) continue;
    const keep = [];
    for (const it of list) {
      const v = V && V[Math.floor(hash(it.x, it.y) * V.length) % V.length], edge = town && outskirt(m, it.x, it.y),
        near = edge && (nearWalk(m, it.x, it.y) || (hash(it.x + 7, it.y) < 0.5 && nearWalk(m, it.x, it.y, 2))),   // сборка 73: первый ряд у проходимой земли и половина второго — объёмные
        deep = town && (far || (edge && !near));
      let def = null;
      if (near && !v && oldTree && hash(it.y - 3, it.x + 11) < 0.3) {   // сборка 73: у края деревни треть прежних деревьев — валуны: дешевле листвы, край не однообразный
        it.s = (it.s || 1) * (1.5 + hash(it.x, it.y + 5) * 0.9); it.rot = hash(it.x + 1, it.y) * 6.283;
        if (!lists.has('rocks')) lists.set('rocks', []);
        lists.get('rocks').push(it); continue;
      }
      if (deep) {   // глубина окраины деревни — карточка
        const vr = Math.floor(hash(it.y, it.x) * 2);
        if (v) { const [name, hk, wk] = Array.isArray(v) ? v : [v, 1, 1]; def = cardOf(name, vr, PROPS[id] || {}, PROPS, hk, wk); if (T[name].sway) it.s = 0.8 + (it.s - 0.75) * 0.4; }
        else if (oldTree) def = cardOf(src, vr, PROPS[id] || {}, PROPS);
        if (def) it.rot = 0;   // карточка смотрит в камеру: без поворота предмета
      } else if (v) {
        const [name, hk, wk] = Array.isArray(v) ? v : [v, 1, 1];
        def = defOf(name, hk, wk, far ? '_lo' : '_mid', PROPS[id] || {}, !far);   // у тропы — та же ель, что согласована («_mid»)
        if (T[name].sway) it.s = 0.8 + (it.s - 0.75) * 0.4;   // разброс роста процедурных (1–1,75) — у новых уже в породе: ±15 %, без великанов
      }
      if (!def) { keep.push(it); continue; }
      extra[def.id] = def;
      if (!lists.has(def.id)) lists.set(def.id, []);
      lists.get(def.id).push(it);
    }
    if (keep.length) lists.set(id, keep); else lists.delete(id);
  }
  return extra;
}
