// Деревья Meshy (сборка 71): пак assets/models/trees/trees.glb (tools/art/tree_pack.mjs) — дуб, сосна, ель, берёза, молодая берёза,
// рябина, сухая ель, бревно и ель в снегу, почти в полном качестве (грани плоские — как на листе Meshy); «_lo» — только для тени.
// Это акценты: старый процедурный лес остаётся, моделями заменяется не больше LIMIT деревьев внутри карты (в деревне — новые
// деревья у дорог и площадей, villagegen.js; в лесу и Фьордах — часть деревьев на полянах), лес у края и за краем карты — прежний. Действует в деревне, Старом лесу и Фьордах
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
  // у ближних моделей грани плоские (нормаль на грань): гладкие нормали размывали листву в «желе»; «_lo» (тень) — как есть
  const flat = g => { const n = g.toNonIndexed(); n.computeVertexNormals(); g.dispose(); return n; };
  wait = new GLTFLoader().loadAsync(URL_).then(g => { g.scene.traverse(o => { if (o.isMesh) GEO.set(o.name, shared(o.name.endsWith('_lo') ? o.geometry : flat(o.geometry))); }); return (ready = true); })
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
function defOf(name, hk, wk, far, base) {
  const geo = (far && GEO.get(name + '_lo')) || GEO.get(name), t = T[name], key = 'fo:' + name + (far && GEO.has(name + '_lo') ? '_lo' : '') + ':' + hk + ':' + wk + ':' + (base.tint || 0);
  if (DEFS.has(key)) return DEFS.get(key);
  const H = t.h * hk, def = { id: key, kind: 'prop', batch: true, outline: false, tint: base.tint, shadow: far ? false : base.shadow,   // лес за краем — без тени (треугольники вдвое)
    receive: false, side: 'double', rim: 0.12, rimColor: 0xe8ffb0, sway: t.sway,
    build(kit) { const root = new THREE.Group(), m = new THREE.Mesh(geo, kit.propMat(this)); m.scale.set(H * wk, H, H * wk); root.add(m); return { root }; } };
  // тень ближнего дерева — от облегчённой «_lo» (только камера тени её видит, props.js shadowProxy): треугольников в проходе тени втрое меньше
  if (!far && GEO.has(name + '_lo')) def.shadowProxy = () => GEO.get(name + '_lo').clone().scale(H * wk, H, H * wk);
  DEFS.set(key, def); return def;
}

/** Подмена списков PropLayer: lists — Map(id → [предметы]); where — 'town' | 'forest' | 'fjord'; m — карта зоны (w, h);
 *  statics — предметы зоны (метка акцента); возвращает доп. описания (id → def). Заменяются только деревья внутри карты (не ближе EDGE клеток к краю), не больше LIMIT —
 *  разбросанные по карте (порядок по хешу позиции); остальные остаются процедурными */
const LIMIT = { town: 24, forest: 22, fjord: 24 }, EDGE = 3.5;
export function swap(lists, PROPS, where, m, statics = []) {
  const extra = {}, M = MAP[where];
  if (!forestReady() || !M || !m) return extra;
  // в деревне — деревья, которые генератор поставил акцентами у дорог (villagegen.js, opts.accent), и одинокие деревья в глубине
  // деревни (дальше 6 клеток от края); лес у края — прежний
  const acc = where === 'town' && statics.filter(d => d.opts && d.opts.accent),
    isAcc = it => !acc || (it.x > 6 && it.y > 6 && it.x < m.w - 6 && it.y < m.h - 6) || acc.some(d => Math.abs(d.x - it.x) < 0.05 && Math.abs(d.y - it.y) < 0.05);
  const cand = [];
  for (const [id, list] of lists) {
    const V = M[id];
    if (id.endsWith('_far') || !V || !V.every(v => v === null || GEO.has(Array.isArray(v) ? v[0] : v))) continue;
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
    const V = M[id];
    if (!V || id.endsWith('_far')) continue;
    const keep = [];
    for (const it of list) {
      const v = take.has(it) ? V[Math.floor(hash(it.x, it.y) * V.length) % V.length] : null;
      if (v === null) { keep.push(it); continue; }
      const [name, hk, wk] = Array.isArray(v) ? v : [v, 1, 1], def = defOf(name, hk, wk, false, PROPS[id] || {});
      if (T[name].sway) it.s = 0.8 + (it.s - 0.75) * 0.4;   // разброс роста процедурных (1–1,75) — у новых уже в породе: ±15 %, без великанов
      extra[def.id] = def;
      if (!lists.has(def.id)) lists.set(def.id, []);
      lists.get(def.id).push(it);
    }
    if (keep.length) lists.set(id, keep); else lists.delete(id);
  }
  return extra;
}
