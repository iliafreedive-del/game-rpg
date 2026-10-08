// Разрушенный храм из пака «каменная» (Meshy, листы объектов): assets/models/temple/{walls,ruins}.glb, объект = узел по имени,
// у каждого основание y = 0, центр по X/Z, высота 1 (размер задаёт таблица ниже). Листы разрезаны и выровнены
// скриптами tools/art/sheet_split.py и sheet_pack.py (резка по связным кускам, поворот «изометрии» листа к осям).
// Действует ТОЛЬКО в храме (PropLayer при realm === 'temple') и только при «Новых моделях» (SKINS.on): процедурные tw_* — запасные.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { toon } from './toon.js';
import { SKINS, preloadSkin } from './glbskin.js';
import { preloadMob } from './glbmob.js';
import { STONE_GLB, STONE_SKINS } from './models/mob/_stone.js';

const BASE = new URL('../../assets/models/temple/', import.meta.url).href;
const PACKS = ['walls', 'ruins'];
const OBJ = new Map();   // имя → { geometry, mat, w, d } (w, d — ширина и глубина при высоте 1)
let wait = null, ready = false;

export function preloadTemple() {
  if (wait) return wait;
  if (typeof document === 'undefined') return (wait = Promise.resolve(false));
  // fade: стены и колонны между камерой и героем растворяются (как процедурные стены храма)
  // каменные стражи храма (звери — GLB, воины — шкуры) грузятся вместе с паком: только при входе в храм, не с титульного экрана
  const mobs = Promise.all([...STONE_GLB.map(preloadMob), ...STONE_SKINS.map(preloadSkin)]);
  wait = Promise.all([mobs, ...PACKS.map(p => new GLTFLoader().loadAsync(BASE + p + '.glb').then(g => {
    let m = null;
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      if (!m) { m = toon(0xffffff, { rim: 0.22, rimColor: 0xfff0c8, side: THREE.DoubleSide, ao: 0.72, aoH: 1.1, fade: true }); m.map = o.material.map; if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 4; } }
      o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox;
      OBJ.set(o.name, { geometry: o.geometry, mat: m, w: b.max.x - b.min.x, d: b.max.z - b.min.z });
    });
  }))]).then(() => (ready = true)).catch(e => { console.warn('temple packs', e); return false; });
  return wait;
}
export const templeReady = () => ready && SKINS.on;

// предмет храма → объект пака и масштаб [x, y, z] (у объекта высота 1); spin — случайный поворот по месту
const MAP = {
  tw_column: { o: 'pillar', k: [2.1, 2.7, 2.1] }, tw_column_b: { o: 'pillar', k: [2.1, 1.9, 2.1] },
  tw_drum: { o: 'column_fallen', k: 0.75, spin: true }, tw_basin: { o: 'altar', k: 0.95 },
  // арка над проёмом 4 м: опоры — на соседних тайлах стены (их центры в 5 м друг от друга), высота ~3,6 м
  tw_arch: { o: 'arch', k: [6.1, 3.6, 3.2] },
  tp_platform: { o: 'platform', k: [0.95, 0.12, 0.95] }, tp_altar: { o: 'altar', k: 1.05 }, tp_curve: { o: 'wall_curved', k: 1.6 },
  tp_corner: { o: 'ruin_corner', k: 2.2 }, tp_stairs: { o: 'stairs', k: 1.25 },
};
const hash = (x, y) => { let h = (Math.round(x * 17) * 374761393 + Math.round(y * 23) * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const DEFS = new Map();
function defOf(name, k) {
  const sc = Array.isArray(k) ? k : [k, k, k], key = 'tpl:' + name + ':' + sc.map(v => v.toFixed(2)).join(',');
  if (DEFS.has(key)) return DEFS.get(key);
  const O = OBJ.get(name);
  const def = { id: key, kind: 'prop', batch: true, outline: false,
    build() { const root = new THREE.Group(), m = new THREE.Mesh(O.geometry, O.mat); m.scale.set(...sc); root.add(m); return { root }; } };
  DEFS.set(key, def); return def;
}

/** стены храма по тайлам 'D' из пака: прямые куски стены — по пролётам между опорами (2–3 модуля на пролёт 8 м, растянуты
 *  по длине пролёта), на стыках сетки залов — квадратные колонны. Наружная стена у дальнего края выше, у ближнего — ниже (не закрывает героя).
 *  m — карта зоны, skip — тайлы, где стоит опора арки; push(id, x, y, rot, s) — как в PropLayer; возвращает описания моделей (id → def) */
export function walls(m, skip, push) {
  const extra = {}, put = (name, k, x, y, rot) => { const d = defOf(name, k); extra[d.id] = d; push(d.id, x, y, rot, 1); };
  const isD = (x, y) => m.ch(x, y) === 'D' && !skip.has(x + ',' + y), junc = (x, y) => (x - 5) % 9 === 0 && (y - 5) % 9 === 0;
  const hOf = (x, y) => (y === 5 || x === 5 ? 2.3 : y === 59 || x === 59 ? 0.95 : 1.45);   // высота стены, м
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) if (isD(tx, ty) && junc(tx, ty)) {
    const h = hOf(tx, ty) + 0.5, v = hash(tx * 1.3 + 2, ty * 0.7 - 1);
    put('pillar', [2.05, h, 2.05], tx + 0.5, ty + 0.5, Math.floor(v * 4) * Math.PI / 2);
  }
  for (const hz of [true, false]) {
    const A = hz ? m.h : m.w, B = hz ? m.w : m.h;
    for (let a = 5; a < A; a += 9) {   // стены — только по линиям сетки залов
      for (let b = 0; b < B;) {
        const at = t => (hz ? isD(t, a) && !junc(t, a) : isD(a, t) && !junc(a, t));
        if (!at(b)) { b++; continue; }
        let e = b; while (e + 1 < B && at(e + 1)) e++;
        const n = e - b + 1, cnt = Math.max(1, Math.round(n / 2.7)), seg = n / cnt;
        for (let i = 0; i < cnt; i++) {
          const c = b + seg * (i + 0.5), x = hz ? c : a + 0.5, y = hz ? a + 0.5 : c, v = hash(x * 2.1 + 7, y * 1.7 - 3);
          const name = v < 0.5 ? 'wall_a' : 'wall_b', O = OBJ.get(name), h = hOf(hz ? Math.round(c) : a, hz ? a : Math.round(c));
          put(name, [seg / O.w * 1.04, h, 0.72 / O.d], x, y, (hz ? 0 : Math.PI / 2) + (v < 0.25 || (v > 0.5 && v < 0.75) ? Math.PI : 0));
        }
        b = e + 1;
      }
    }
  }
  return extra;
}

/** подмена списков PropLayer (колонны, арки, обломки, алтарь, кольцо святилища): lists — Map(id → [предметы]); возвращает доп. описания */
export function swap(lists) {
  const extra = {};
  if (!templeReady()) return extra;
  for (const [id, list] of [...lists]) {
    const M = MAP[id]; if (!M || !OBJ.has(M.o)) continue;
    lists.delete(id);
    const def = defOf(M.o, M.k); extra[def.id] = def;
    if (!lists.has(def.id)) lists.set(def.id, []);
    for (const it of list) { if (M.spin) it.rot = hash(it.y + 3.7, it.x - 1.3) * 6.283; it.s = 1; lists.get(def.id).push(it); }
  }
  return extra;
}

// сундуки с добычей — каменные сундуки пака (закрытый и открытый — отдельные модели), богатый крупнее
const CHESTS = { chest: ['chest', 0.8], chest_open: ['chest_open', 0.8], chest_rich: ['chest', 1.0], chest_rich_open: ['chest_open', 1.0] };
const LIVE = new Map();
export function liveDef(want) {
  const c = CHESTS[want]; if (!c || !templeReady() || !OBJ.has(c[0])) return null;
  if (LIVE.has(want)) return LIVE.get(want);
  const O = OBJ.get(c[0]);
  const def = { id: 'tpl:' + want, kind: 'prop', outline: false,
    build() { const root = new THREE.Group(), m = new THREE.Mesh(O.geometry, O.mat); m.scale.setScalar(c[1]); root.add(m); return { root }; } };
  LIVE.set(want, def); return def;
}
