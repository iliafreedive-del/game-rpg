// «Набор художника»: всё, что нужно файлу модели. Модель получает его аргументом build(kit) и ничего не импортирует сама.
// Формат моделей описан в docs/MODEL_SPEC.md.
import * as THREE from '../vendor/three.module.min.js';
import { toon } from './toon.js';
import { leafTex, pineTex } from './textures.js';
import * as geo from './geo.js';
import * as rig from './rig.js';
import { Cape, blobShadow } from './cape.js';
import * as fur from './fur.js';
import * as skin from './glbskin.js';
import * as mob from './glbmob.js';
import { PAL, HERO, MOB, OUTLINE, RIM, FOLIAGE, LOOKS, SHADOW } from './style.js';

// сборка 51: модели героев и зверей качаются после титульного экрана, а не вместе с ним — на медленной сети они отнимали канал
// у загрузки и Game Ready наступал через ~50 с. Сборка 66: качаются не все сразу (≈14 МБ), а только нужные зоне: на титуле —
// герой последнего сохранения и жители деревни; перед сборкой зоны prepare() ждёт (zoneModels) героя, жителей деревни и модели
// мобов, которые стоят на карте; остальное — фоном по одному файлу после входа в зону (bgModels), с паузой на время смены зоны.
const HERO_SKIN = { warrior: 'warrior_knight', archer: 'archer_raven', mage: 'mage_staff' };
const NPC_SKIN = ['npc_trainer', 'npc_elder', 'npc_smith', 'npc_merchant', 'npc_fortune', 'npc_caravan'];   // жители деревни — шкуры Meshy (сборка 56)
const MOB_SKIN = ['skel_warrior_m', 'skel_archer_m', 'skel_mage_m', 'ghoul_m', 'elite_guard_m', 'elite_warlord_m', 'boss_m', 'b_raider_m', 'b_thrower_m', 'b_shaman_m', 'b_chief_m', 'b_boss_m', 'w_poacher_m', 'w_leshy_m', 'w_ataman_m', 'w_boss_m', 'f_hag_m', 'f_berserk_m', 'f_draugr_m', 'f_jarl_m', 'f_boss_m'];   // сборка 57: нежить подземелий, клыкачи пустошей, Старый Лес, Фьорды
const MOBS = ['wolf_grey', 'dog_brown', 'dog_town', 'wolf_ice', 'beast', 'chicken_white', 'chicken_red', 'hyena', 'w_boar', 'b_boar', 'w_bear', 'b_scorpid', 'bone_wolf'];
// питомцы (Meshy, models/pet/petrig.js): все восемь — общий лист текстуры и ≈1,5 МБ сеток, поэтому качаются фоном сразу после героев,
// а первый (фенек Кофи) и выбранный — до показа деревни. Процедурный питомец не показывается никогда (15 октября: на секунду мелькал старый лис)
export const PET_SKIN = ['fennec', 'crow', 'scorpid', 'wisp', 'skull', 'basilisk', 'bat', 'golem'].map(p => 'pet_' + p);
const SKIN_SET = new Set([...Object.values(HERO_SKIN), ...NPC_SKIN, ...MOB_SKIN, ...PET_SKIN]);
// модель врага (id из registry MOBS) → файлы, из которых она собирается (models/mob/*.js); каменные мобы храма — templeglb.js
const MOB_GLB = { w_wolf: 'wolf_grey', f_wolf: 'wolf_ice', beast: 'beast', b_hyena: 'hyena', w_boar: 'w_boar', b_boar: 'b_boar', w_bear: 'w_bear', b_scorpid: 'b_scorpid', bone_wolf: 'bone_wolf' };
const MOB_SKIN_OF = { mb_grave_weeper: 'skel_mage_m', f_jotun: 'f_boss_m', surv_guard: 'elite_guard_m', surv_brute: 'elite_warlord_m' };
export function mobAssets(id) {
  if (MOB_GLB[id]) return [MOB_GLB[id]];
  const s = MOB_SKIN_OF[id] || id + '_m'; return MOB_SKIN.includes(s) ? [s] : [];
}
const loadOne = n => n === 'decals' ? fur.loadDecals() : SKIN_SET.has(n) ? skin.preloadSkin(n) : mob.preloadMob(n);
export const assetLoaded = n => SKIN_SET.has(n) ? skin.skinLoaded(n) : mob.mobLoaded(n);
export const wantAssets = names => { for (const n of names) loadOne(n); };
// модели врагов (не героев, не жителей, не питомцев): их Жатва держит только нужные рою и пришедшим гостям (renderer3d survTrim)
export const MOB_ASSETS = new Set([...MOB_SKIN, ...MOBS]);
export const loadedMobAssets = () => [...MOB_ASSETS].filter(assetLoaded);
export const unloadAsset = n => SKIN_SET.has(n) ? skin.unloadSkin(n) : mob.unloadMob(n);
export const bgSkip = { fn: null };   // фоновая догрузка пропускает (но не забывает) эти файлы — в Жатве модели врагов
// бой Летописи (hwstage.js): модели бойцов — до сборки сцены, не дольше ms
export const mobsReady = (ids, ms) => Promise.race([Promise.all(ids.flatMap(mobAssets).map(loadOne)), new Promise(r => setTimeout(r, ms))]);
// титульный экран: герой последнего сохранения (первым) и жители деревни — первая зона почти всегда деревня
export function preloadModels(cls) {
  if (cls && HERO_SKIN[cls]) skin.preloadSkin(HERO_SKIN[cls]);
  const p = Promise.all(NPC_SKIN.map(n => skin.preloadSkin(n)));
  // сборка 75: лис Кофи, собаки и куры деревни — тоже на титуле: вход в деревню ждёт и их (zoneModels), раньше они начинали качаться только после выбора героя
  p.then(() => ['pet_fennec', 'dog_town', 'dog_brown', 'chicken_white', 'chicken_red'].forEach(n => loadOne(n)));
  return p;
}
// что ждать перед показом зоны: герой; в деревне — жители; где есть враги — наклейки морд зверей и модели мобов на карте
// (и их приспешников). Собаки и куры деревни, моб, пришедший позже, — догружаются и подменяются на месте (critters.js, renderer3d syncEnemies)
export function zoneModels(cls, Z, enemies, defOf, pet) {
  const need = new Set([HERO_SKIN[cls] || HERO_SKIN.warrior]);
  if (pet && PET_SKIN.includes('pet_' + pet)) need.add('pet_' + pet);
  if (Z.id === 'town') need.add('pet_fennec');   // подарок Кофи — готов до первой встречи
  if (Z.id === 'town') NPC_SKIN.forEach(n => need.add(n));
  if (Z.id === 'town' && Z.json.village) ['dog_town', 'dog_brown', 'chicken_white', 'chicken_red'].forEach(n => need.add(n));   // сборка 73: собаки и куры деревни — до показа зоны (раньше догружались фоном и подменялись посреди облёта камеры: новые шейдеры и текстуры — рывок)
  if (Z.id === 'survival') ['skel_warrior', 'ghoul', 'skel_archer', 'skel_mage', 'beast', 'boss', 'surv_guard', 'surv_brute', 'decals'].forEach(id => (id === 'decals' ? [id] : mobAssets(id)).forEach(n => need.add(n)));   // рой Жатвы приходит волнами (survival.js), его модели — из пула
  for (const e of enemies || []) {
    need.add('decals');
    const d = defOf(e); if (d) mobAssets(d.id).forEach(n => need.add(n));
    const sm = e.D && e.D.abil && e.D.abil.summon; if (sm) mobAssets(sm.type).forEach(n => need.add(n));
  }
  return Promise.all([...need].map(loadOne));
}
// фон: остальные модели по одному файлу (герои — первыми: призраки павших героев, смена класса)
let bgQ = null, bgOn = false, bgBusy = 0;
export function bgModels(on) {
  bgOn = on; if (!on) return;
  if (!bgQ) bgQ = [...Object.values(HERO_SKIN), ...NPC_SKIN, ...PET_SKIN, 'decals', ...MOB_SKIN, ...MOBS];
  const pump = () => {
    while (bgOn && bgBusy < 2 && bgQ.length) {
      const i = bgSkip.fn ? bgQ.findIndex(n => !bgSkip.fn(n)) : 0; if (i < 0) break;
      const n = bgQ.splice(i, 1)[0]; if (n !== 'decals' && assetLoaded(n)) continue;
      bgBusy++; loadOne(n).finally(() => { bgBusy--; pump(); });
    }
  };
  pump();
}
export function makeKit(scene) {
  const { part, merge } = geo;
  return {
    THREE, scene, geo, rig, PAL, HERO, MOB, OUTLINE, RIM, FOLIAGE, Cape, blobShadow,
    part, merge,
    // шерсть-пряди и наклейки морд (fur.js); fur.FUR.on — переключатель «было / стало»
    fur,
    // готовые модели художника/нейросети поверх процедурного рига (glbskin.js); грузятся заранее
    skin,
    // ригнутые модели из Meshy со своими анимациями (glbmob.js): звери
    mob,
    // бокс с фасками: размеры, фаска, цвет, позиция, поворот, опции покраски ({ top, tex, emit })
    bbox: (w, h, d, b, c, p, r, o) => part(geo.chamferBox(w, h, d, b), c, p, r, 1, o),
    // сужающаяся трубка по точкам (рога, рёбра, когти) и тело вращения по профилю [[r, y], …]
    tube: (pts, r0, r1, c, o, radial) => geo.paint(geo.taperTube(pts, r0, r1, radial), c, o || {}),
    lathe: (prof, c, p, r, s, o, segs) => part(geo.lathe(prof, segs), c, p, r, s, o),
    // шар: радиус, цвет, позиция, масштаб, опции покраски ({ top, emit })
    ball: (r, c, p, s, o) => part(new THREE.SphereGeometry(r, 10, 8), c, p, 0, s, o),
    // Group в позиции p внутри parent
    group(p = [0, 0, 0], parent = null) { const g = new THREE.Group(); g.position.set(...p); if (parent) parent.add(g); return g; },
    // ось падения/кувырка: root → spin (на высоте y) → body (сдвинут обратно), так что в покое всё стоит на земле; возвращает { spin, body }
    pivot(root, y) { const spin = new THREE.Group(); spin.position.y = y; root.add(spin); const body = new THREE.Group(); body.position.y = -y; spin.add(body); return { spin, body }; },
    // Mesh из объединённой геометрии с общим toon-материалом
    mesh: (geometry, material) => new THREE.Mesh(geometry, material),
    // материал персонажа: тон-рамп, rim-свет, самосвечение по альфе цвета вершины, вспышка при ударе
    // материал предмета окружения: ветер (def.sway), растворение между камерой и героем (fade), rim-свет
    propMat: (def = {}) => toon(0xffffff, { vc: true, rim: def.rim ?? RIM.prop, rimColor: def.rimColor ?? LOOKS.torch.rim, fade: true, sway: def.sway, side: def.side === 'double' ? THREE.DoubleSide : undefined, ao: def.ao ?? SHADOW.groundAO, aoH: def.aoH ?? 0.9, tex: true, texWorld: !!def.texWorld, map: typeof document === 'undefined' || !def.leaf ? null : def.leaf === 'pine' ? pineTex() : leafTex(), alphaTest: def.leaf ? 0.5 : 0 }),
    mat: (o = {}) => toon(0xffffff, { vc: true, rim: o.rim ?? 0.7, rimColor: o.rimColor ?? 0xffe2b8, side: o.side, ao: 0.72, aoH: 0.55, tex: true }),
  };
}
