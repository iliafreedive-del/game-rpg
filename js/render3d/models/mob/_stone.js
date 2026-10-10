// Каменные стражи Разрушенного храма (пак «каменная»): листы «Девять каменных врагов» и «Пять каменных боссов»
// разрезаны на фигуры. Звери — на скелете серого волка (tools/art/rig_transfer.mjs → assets/models/t_*.glb) или на риге
// процедурного зверя (кабан и бык: glbrig.js beastGlb), воины — шкуры поверх процедурного скелета (tools/art/glb_mob.py, А-поза,
// оружия у них нет — бьют каменными кулаками). Атлас у фигур одного листа общий (temple_mobs.webp, temple_bosses.webp).
// Пока модели не загружены или «Новые модели» выключены — процедурные запасные в каменной палитре.
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
import { beastModel } from './_beast.js';
import { bossModel } from './_boss.js';
import { beastGlb } from '../../glbrig.js';

const STONE = { bone: 0xd8ccae, boneD: 0x8a7f66, boneL: 0xf2e8cc, iron: 0x8a6a3a, ironL: 0xd0a860, rust: 0x5e7034, rustL: 0x9ab050, eye: 0xffc860 };
// сборка 59: мобы сливались с храмом — их атлас того же бежевого камня, что стены и пол, и тот же тёплый ободок, что у построек.
// Теперь камень мобов холоднее и темнее (сине-серый «базальт»), ободок — яркий голубой, как свет Бездны: фигура читается на любом фоне
const RIM = 0x7fd4ff, TINT = 0x8e9ab4, RIM_K = 0.95;
const beastFb = (kit, o) => beastModel(kit, { anat: 'wolf', strip: 'short', tw: 0.9, furLen: 0.03, furDens: 0.2, seed: 5, fur: 0x9a8f78, furL: 0xd8ccae, skin: 0x8a7f66, eye: 0xffc860, plates: true, horns: false, ears: 'point', bushy: false, ...o });
// зверь на скелете волка (ригнутая GLB); h — рост в игре
// ready(kit) — модель уже загружена; если моб был собран раньше (запасной процедурный), renderer3d пересобирает его, как только модель
// догрузится (правки 2, П17–18: на медленной сети пак не успевал за 8 с, и мобы храма оставались скелетами до конца уровня)
const wolfRig = (id, glb, h, fb) => ({ id, kind: 'mob', outline: 'mob', ready: kit => !!(kit.mob && kit.mob.mobLoaded(glb)), build(kit) {
  if (kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded(glb)) { const m = kit.mob.buildMob(kit, glb, { height: h, radius: 0.3 * h, shadow: 1.3 * h, rimColor: RIM, rim: RIM_K, tint: TINT }); if (m) return m; }
  return beastFb(kit, { id, ...fb });
} });
// зверь на риге процедурного зверя (статичная GLB, кости ставятся по сетке)
const beastRig = (id, glb, h, fb) => ({ id, kind: 'mob', outline: 'mob', ready: kit => !!(kit.mob && kit.mob.mobLoaded(glb)), build(kit) {
  if (kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded(glb)) { const m = beastGlb(kit, glb, { height: h, rimColor: RIM, rim: RIM_K, tint: TINT }); if (m) return m; }
  return beastFb(kit, { id, anat: 'boar', tusks: true, ears: 'round', ...fb });
} });
// воин: шкура <skin> поверх процедурного скелета
const warrior = (id, skin, o = {}) => ({ id, kind: 'mob', outline: 'mob', ready: kit => kit.skin.skinLoaded(skin), build(kit) {
  return mobSkin(kit, skeleton(kit, { head: 'great', pal: STONE, cloth: 0x6a6a52, clothL: 0xa8a482, rimColor: RIM, weapons: {}, ...o }), skin, { rimColor: RIM, rim: RIM_K, tint: TINT });
} });

export const STONE_MOBS = [
  // id — тип врага (js/data/wild.js), второе — имя модели
  wolfRig('t_hound', 't_hound', 1.26, { scale: 0.96 }),   // сборка 59: +20 %
  beastRig('t_boar', 't_boar', 1.25, { scale: 0.85 }),
  wolfRig('t_lion', 't_lion', 1.35, { scale: 0.95 }),
  wolfRig('t_stag', 't_stag', 2.66, { scale: 1.26, horns: true }),   // сборка 59: +40 %
  warrior('t_warden', 't_warden_m'),
  warrior('t_golem', 't_golem_m', { heavy: true, scale: 1.25 }),
  warrior('t_priest', 't_priest_m', { hover: true, cast: 'staff', pauldron: false, scale: 1.05 }),
  warrior('t_ghoul', 't_knight_m', { heavy: true, scale: 1.1 }),   // каменный латник
  warrior('t_archer', 't_thrower_m', { cast: 'staff', pauldron: false, scale: 0.95 }),   // валунник: бросает каменные осколки
  // мини-боссы святилищ по номеру лабиринта; полководец святилища-«форта» и большой босс — те же фигуры крупнее
  warrior('t_mb_gate', 't_mb_colossus_m', { heavy: true, scale: 1.4 }),
  wolfRig('t_mb_relic', 't_mb_lion', 2.3, { scale: 1.5 }),
  beastRig('t_mb_paladin', 't_mb_bull', 2.5, { scale: 1.4, horns: true }),
  warrior('t_mb_hierophant', 't_mb_king_m', { heavy: true, head: 'crown', scale: 1.45 }),
  warrior('t_mb_sentinel', 't_mb_lancer_m', { scale: 1.4 }),
  warrior('t_lord', 't_mb_king_m', { heavy: true, head: 'crown', scale: 1.6 }),
  { id: 't_boss', kind: 'mob', outline: 'mob', ready: kit => kit.skin.skinLoaded('t_boss_m'), build(kit) { return mobSkin(kit, bossModel(kit, { SK: 0x8a7f66, SKL: 0xd8ccae, HOOD: 0x5e7034, HOODL: 0x9ab050, IR: 0x8a6a3a, IRL: 0xd0a860, LE: 0x6a604e, LEL: 0xa0957c, rim: RIM, core: 0xffc860, scale: 1.0, weapons: {} }), 't_boss_m', { rimColor: RIM, rim: RIM_K, tint: TINT }); } },
];
// модели, которые грузятся при входе в храм (не с титульного экрана): звери — GLB, воины — шкуры
export const STONE_GLB = ['t_hound', 't_boar', 't_lion', 't_stag', 't_mb_lion', 't_mb_bull'];
export const STONE_SKINS = ['t_warden_m', 't_golem_m', 't_priest_m', 't_knight_m', 't_thrower_m', 't_mb_king_m', 't_mb_lancer_m', 't_mb_colossus_m', 't_boss_m'];
