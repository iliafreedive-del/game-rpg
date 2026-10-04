// Окружение Костяных пустошей из Meshy: 8 паков (assets/models/bones/*.glb, tools/art/bones_pack.mjs), объект = узел по имени.
// Действует ТОЛЬКО в пустошах (PropLayer зовёт swap при realm === 'bones') и только при «Новых моделях» (SKINS.on):
// процедурные предметы пустошей подменяются моделями Meshy по таблице MAP; варианты (a/b/c) — по позиции предмета.
// Паки грузятся при первом входе в пустоши (renderer3d.js), до загрузки — прежние процедурные, потом слой пересобирается.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { toon } from './toon.js';
import { SKINS } from './glbskin.js';

const BASE = new URL('../../assets/models/bones/', import.meta.url).href;
const PACKS = ['01_giant_landmarks', '02_sandstone', '03_trees', '04_small_plants', '05_buildings', '06_ritual_fences', '07_camp_props', '08_ancient_ruins'];
const OBJ = new Map();   // имя объекта → { geometry, mat }
let wait = null, ready = false;

export function preloadBones() {
  if (wait) return wait;
  if (typeof document === 'undefined') return (wait = Promise.resolve(false));
  wait = Promise.all(PACKS.map(p => new GLTFLoader().loadAsync(BASE + p + '.glb').then(g => {
    let mat = null;
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      if (!mat) { mat = toon(0xffffff, { rim: 0.25, rimColor: 0xffd8a8, side: THREE.DoubleSide, ao: 0.7, aoH: 1.2 }); mat.map = o.material.map; if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; } }
      OBJ.set(o.name, { geometry: o.geometry, mat });
    });
  }))).then(() => (ready = true)).catch(e => { console.warn('bones packs', e); return false; });
  return wait;
}
export const bonesReady = () => ready && SKINS.on;

// предмет игры → объекты Meshy (варианты) и подгонка: k — масштаб (число или [x, y, z]), ry — доворот, extra — добавка (огонь костра)
const MAP = {
  giant_skull: { o: ['giant_skull'], k: 1.1 }, giant_ribs: { o: ['giant_ribs'], k: 1.3 }, giant_spine: { o: ['giant_spine'], k: 1.4 },
  tusk_arch: { o: ['tusk_arch'], k: 1 }, giant_fallen: { o: ['giant_fallen'], k: 1.1 },
  sand_spire: { o: ['sand_spire_a'], k: 1.05 }, sand_spire_b: { o: ['sand_spire_b'], k: 0.68 }, sand_tooth: { o: ['sand_spire_c'], k: 0.65 }, sand_mesa: { o: ['sand_mesa'], k: 0.85 },
  sand_rock: { o: ['sand_rock_a', 'sand_rock_c'], k: 1 }, sand_rock_b: { o: ['sand_rock_b', 'sand_rock_c'], k: 1 },
  tree_acacia: { o: ['tree_acacia_a'], k: 0.95 }, tree_acacia_b: { o: ['tree_acacia_b'], k: 0.85 }, tree_acacia_c: { o: ['tree_acacia_c'], k: 0.6 },
  tree_acacia_far: { o: ['tree_acacia_a'], k: 0.95 }, tree_acacia_b_far: { o: ['tree_acacia_b'], k: 0.85 }, tree_acacia_c_far: { o: ['tree_acacia_c'], k: 0.6 },
  deadtree: { o: ['tree_dead_desert_a', 'tree_dead_desert_b'], k: 0.8 }, deadtree_b: { o: ['tree_dead_desert_b'], k: 0.8 }, deadtree_c: { o: ['tree_dead_desert_a'], k: 0.8 },
  deadtree_d: { o: ['tree_dead_desert_b'], k: 0.8 }, deadtree_e: { o: ['tree_dead_desert_a'], k: 0.8 },
  bush_dry: { o: ['bush_thorn_a', 'bush_thorn_b'], k: 0.9, tint: 0.2 }, agave: { o: ['agave_a', 'agave_b'], k: 1, tint: 0.18 },
  // перекати-поле в декоре пустошей — вперемешку с сухой травой и пустынными цветами
  tumbleweed: { o: ['tumbleweed', 'grass_dry_a', 'grass_dry_b', 'grass_dry_a', 'flowers_desert_a', 'flowers_desert_b', 'flowers_desert_c'], k: 1.1, tint: 0.2 },
  bones: { o: ['bones_scatter_a', 'bones_scatter_b'], k: 0.75 }, skulls: { o: ['skull_pile'], k: 0.75 },
  bone_hut: { o: ['bone_hut_a', 'bone_hut_b'], k: [1, 0.75] }, bone_hall: { o: ['bone_hall'], k: 0.7 },
  bone_totem: { o: ['bone_totem_a', 'bone_totem_b'], k: 1.2 }, hide_rack: { o: ['hide_rack'], k: 1 }, war_banner: { o: ['war_banner'], k: 1.08 },
  tusk_fence: { o: ['tusk_fence'], k: [[0.36, 0.95, 0.6]] },   // сегмент частокола на клетку 1 м: модель Meshy — пролёт 3,2 м, сжат по ширине
  bonfire: { o: ['campfire'], k: 1.9, fire: true }, crate: { o: ['chest_hide'], k: 0.85 }, barrel: { o: ['clay_pots'], k: 0.9 },
};
const hash = (x, y) => { let h = (Math.round(x * 17) * 374761393 + Math.round(y * 23) * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const DEFS = new Map();
function defOf(id, name, k, base, kit, fire) {
  const key = 'bn:' + name + ':' + id;
  if (DEFS.has(key)) return DEFS.get(key);
  const O = OBJ.get(name), sc = Array.isArray(k) ? k : [k, k, k];
  const def = { id: key, kind: 'prop', batch: true, outline: false, tint: base && base.tint, shadow: base ? base.shadow : undefined,
    build() {
      const root = new THREE.Group(), m = new THREE.Mesh(O.geometry, O.mat); m.scale.set(...sc); root.add(m);
      if (fire) {   // костёр Meshy без огня — пламя как у прежнего (светится)
        const L = [kit.part(new THREE.ConeGeometry(0.16, 0.42, 6), 0xff6a1a, [0, 0.3, 0], 0, 1, { top: 0xffd06a, emit: true }), kit.part(new THREE.ConeGeometry(0.09, 0.28, 5), 0xffb03a, [0.07, 0.32, 0.05], [0.2, 0, -0.2], 1, { top: 0xfff0a0, emit: true })];
        root.add(new THREE.Mesh(kit.merge(L), kit.propMat({})));
      }
      return { root };
    } };
  DEFS.set(key, def); return def;
}

/** Подмена списков PropLayer: lists — Map(id → [предметы]); PROPS — реестр; возвращает доп. описания моделей (id → def) */
export function swap(lists, PROPS, kit) {
  const extra = {};
  if (!bonesReady()) return extra;
  for (const [id, list] of [...lists]) {
    const M = MAP[id]; if (!M || !M.o.every(n => OBJ.has(n))) continue;
    lists.delete(id);
    const ks = Array.isArray(M.k) ? M.k : [M.k];
    for (const it of list) {
      const v = Math.floor(hash(it.x, it.y) * M.o.length) % M.o.length, def = defOf(id, M.o[v], ks[v % ks.length], { ...PROPS[id], tint: M.tint ?? (PROPS[id] && PROPS[id].tint) }, kit, M.fire);
      extra[def.id] = def;
      if (!lists.has(def.id)) lists.set(def.id, []);
      lists.get(def.id).push(it);
    }
  }
  return extra;
}
