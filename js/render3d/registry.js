// Реестр моделей: единственное место, где модель подключается к игре. Добавили файл в models/ — добавьте строку сюда.
// Ключи совпадают с идентификаторами игры: класс героя (js/data/items.js CLASSES), тип врага (js/data/enemies.js ENEMIES),
// model у NPC (assets/maps/*.json), wt оружия, имя спрайта (spr) у предмета окружения (js/world/zone.js PROP).
import warrior from './models/hero/warrior.js';
import archer from './models/hero/archer.js';
import mage from './models/hero/mage.js';
import bow_hunter from './models/weapon/bow_hunter.js';
import staff_mage from './models/weapon/staff_mage.js';
import skel_warrior from './models/mob/skel_warrior.js';
import ghoul from './models/mob/ghoul.js';
import skel_archer from './models/mob/skel_archer.js';
import skel_mage from './models/mob/skel_mage.js';
import beast from './models/mob/beast.js';
import elite_guard from './models/mob/elite_guard.js';
import elite_warlord from './models/mob/elite_warlord.js';
import bone_wolf from './models/mob/bone_wolf.js';
import boss from './models/mob/boss.js';
import f_draugr from './models/mob/f_draugr.js';
import f_berserk from './models/mob/f_berserk.js';
import f_hag from './models/mob/f_hag.js';
import f_jotun from './models/mob/f_jotun.js';
import f_jarl from './models/mob/f_jarl.js';
import w_poacher from './models/mob/w_poacher.js';
import w_leshy from './models/mob/w_leshy.js';
import w_ataman from './models/mob/w_ataman.js';
import f_wolf from './models/mob/f_wolf.js';
import w_wolf from './models/mob/w_wolf.js';
import w_boar from './models/mob/w_boar.js';
import w_bear from './models/mob/w_bear.js';
import f_boss from './models/mob/f_boss.js';
import w_boss from './models/mob/w_boss.js';
import b_raider from './models/mob/b_raider.js';
import b_thrower from './models/mob/b_thrower.js';
import b_hyena from './models/mob/b_hyena.js';
import b_boar from './models/mob/b_boar.js';
import b_shaman from './models/mob/b_shaman.js';
import b_scorpid from './models/mob/b_scorpid.js';
import b_chief from './models/mob/b_chief.js';
import b_boss from './models/mob/b_boss.js';
import axe_hand from './models/weapon/axe_hand.js';
import club_giant from './models/weapon/club_giant.js';
import staff_ice from './models/weapon/staff_ice.js';
import staff_root from './models/weapon/staff_root.js';
import fort_wall from './models/prop/fort_wall.js';
import palisade from './models/prop/palisade.js';
import fort_tower from './models/prop/fort_tower.js';
import watchtower from './models/prop/watchtower.js';
import fort_gate_i from './models/prop/fort_gate_i.js';
import fort_gate_w from './models/prop/fort_gate_w.js';
import fort_door_i from './models/prop/fort_door_i.js';
import fort_door_w from './models/prop/fort_door_w.js';
import fort_hall_i from './models/prop/fort_hall_i.js';
import fort_hall_w from './models/prop/fort_hall_w.js';
import tent_i from './models/prop/tent_i.js';
import tent_w from './models/prop/tent_w.js';
import chronicle from './models/prop/chronicle.js';
import npc_fortune from './models/npc/npc_fortune.js';
import npc_elder from './models/npc/npc_elder.js';
import npc_smith from './models/npc/npc_smith.js';
import npc_merchant from './models/npc/npc_merchant.js';
import npc_trainer from './models/npc/npc_trainer.js';
import npc_caravan from './models/npc/npc_caravan.js';
import caravan_wagon from './models/prop/caravan_wagon.js';
import sword_iron from './models/weapon/sword_iron.js';
import shield_round from './models/weapon/shield_round.js';
import sword_rust from './models/weapon/sword_rust.js';
import shield_bone from './models/weapon/shield_bone.js';
import bow_bone from './models/weapon/bow_bone.js';
import staff_bone from './models/weapon/staff_bone.js';
import axe_great from './models/weapon/axe_great.js';
import tree_0 from './models/prop/tree_0.js';
import tree_1 from './models/prop/tree_1.js';
import tree_birch from './models/prop/tree_birch.js';
import tree_autumn from './models/prop/tree_autumn.js';
import tree_elm from './models/prop/tree_elm.js';
import tree_pine_tall from './models/prop/tree_pine_tall.js';
import tree_fir_blue from './models/prop/tree_fir_blue.js';
import deadtree from './models/prop/deadtree.js';
import house_0 from './models/prop/house_0.js';
import house_1 from './models/prop/house_1.js';
import house_2 from './models/prop/house_2.js';
import rocks from './models/prop/rocks.js';
import grave from './models/prop/grave.js';
import fence_x from './models/prop/fence_x.js';
import fence_y from './models/prop/fence_y.js';
import barrel from './models/prop/barrel.js';
import crate from './models/prop/crate.js';
import hay from './models/prop/hay.js';
import lamp from './models/prop/lamp.js';
import runebed from './models/prop/runebed.js';
import forge from './models/prop/forge.js';
import stall from './models/prop/stall.js';
import board from './models/prop/board.js';
import altar from './models/prop/altar.js';
import banner from './models/prop/banner.js';
import statue from './models/prop/statue.js';
import weapon_rack from './models/prop/weapon_rack.js';
import crystals from './models/prop/crystals.js';
import portal from './models/prop/portal.js';
import fern from './models/prop/fern.js';
import flowers from './models/prop/flowers.js';
import pebbles from './models/prop/pebbles.js';
import mushrooms from './models/prop/mushrooms.js';
import bush from './models/prop/bush.js';
import dwall_hi from './models/prop/dwall_hi.js';
import dwall_lo from './models/prop/dwall_lo.js';
import dwall_buttress from './models/prop/dwall_buttress.js';
import dwall_niche from './models/prop/dwall_niche.js';
import wall_block from './models/prop/wall_block.js';
import torch_sconce from './models/prop/torch_sconce.js';
import pillar from './models/prop/pillar.js';
import brazier from './models/prop/brazier.js';
import bones from './models/prop/bones.js';
import skulls from './models/prop/skulls.js';
import rubble from './models/prop/rubble.js';
import candles from './models/prop/candles.js';
import chest from './models/prop/chest.js';
import chest_open from './models/prop/chest_open.js';
import chest_rich from './models/prop/chest_rich.js';
import chest_rich_open from './models/prop/chest_rich_open.js';
import sarcophagus from './models/prop/sarcophagus.js';
import sarcophagus_open from './models/prop/sarcophagus_open.js';
import door from './models/prop/door.js';
import door_open from './models/prop/door_open.js';
import door_arch from './models/prop/door_arch.js';
import door_arch_open from './models/prop/door_arch_open.js';
import gate_sealed from './models/prop/gate_sealed.js';
import door_square from './models/prop/door_square.js';
import door_square_open from './models/prop/door_square_open.js';
import altar_medallion from './models/prop/altar_medallion.js';
import stalagmite from './models/prop/stalagmite.js';
import lavarock from './models/prop/lavarock.js';
import puddle from './models/prop/puddle.js';
import rug from './models/prop/rug.js';
import bookshelf from './models/prop/bookshelf.js';
import throne from './models/prop/throne.js';
import well from './models/prop/well.js';
import sacks from './models/prop/sacks.js';
import logpile from './models/prop/logpile.js';
import stump from './models/prop/stump.js';
import tree_poplar from './models/prop/tree_poplar.js';
import tree_oakwide from './models/prop/tree_oakwide.js';
import tree_sapling from './models/prop/tree_sapling.js';
import { DEAD_VARIANTS, ROCK_VARIANTS } from './models/prop/_variants.js';
import { PORTAL_VARIANTS } from './models/prop/_portals.js';
import market_tent from './models/prop/market_tent.js';
import goddess_altar from './models/prop/goddess_altar.js';
// Костяные пустоши: биом полупустыни, скелеты великанов, лагерь дикарей
import { STEPPE_PROPS } from './models/prop/_steppe.js';
import { TEMPLE_PROPS } from './models/prop/_temple.js';
import { GIANT_PROPS } from './models/prop/_giants.js';
import { CAMP_PROPS } from './models/prop/_camp.js';
// деревня по правилам (js/world/villagegen.js)
import church from './models/prop/church.js';
import tavern from './models/prop/tavern.js';
import shop from './models/prop/shop.js';
import smithy from './models/prop/smithy.js';
import cottage_a from './models/prop/cottage_a.js';
import cottage_b from './models/prop/cottage_b.js';
import cottage_c from './models/prop/cottage_c.js';
import bridge from './models/prop/bridge.js';
import barricade from './models/prop/barricade.js';
import vine_row from './models/prop/vine_row.js';
import garden_bed from './models/prop/garden_bed.js';
import scarecrow from './models/prop/scarecrow.js';
import dummy from './models/prop/dummy.js';
import target from './models/prop/target.js';
import bench from './models/prop/bench.js';
import table from './models/prop/table.js';
import reeds from './models/prop/reeds.js';
import fortune_tent from './models/prop/fortune_tent.js';
import mill_ruin from './models/prop/mill_ruin.js';
import cart from './models/prop/cart.js';
import cart_load from './models/prop/cart_load.js';
import signpost from './models/prop/signpost.js';
import barrel_stack from './models/prop/barrel_stack.js';
import log_stack from './models/prop/log_stack.js';
import plank_pile from './models/prop/plank_pile.js';
import clothesline from './models/prop/clothesline.js';
import pumpkins from './models/prop/pumpkins.js';
import tool_stand from './models/prop/tool_stand.js';
import anvil from './models/prop/anvil.js';

const by = (...l) => Object.fromEntries(l.map(m => [m.id, m]));
export const HEROES = by(warrior, archer, mage);                       // ключ — класс героя
export const MOBS = by(skel_warrior, ghoul, skel_archer, skel_mage, beast, elite_guard, elite_warlord, bone_wolf, boss, f_draugr, f_berserk, f_hag, f_jotun, f_jarl, w_poacher, w_leshy, w_ataman, f_wolf, w_wolf, w_boar, w_bear, f_boss, w_boss, b_raider, b_thrower, b_hyena, b_boar, b_shaman, b_scorpid, b_chief, b_boss);             // ключ — тип врага (ENEMIES)
export const NPCS = by(npc_fortune, npc_elder, npc_smith, npc_merchant, npc_trainer, npc_caravan);
export const WEAPONS = by(bow_hunter, staff_mage, axe_hand, club_giant, staff_ice, staff_root, sword_iron, shield_round, sword_rust, shield_bone, bow_bone, staff_bone, axe_great);
export const PROPS = by(fort_door_i, fort_door_w, chronicle, fort_wall, palisade, fort_tower, watchtower, fort_gate_i, fort_gate_w, fort_hall_i, fort_hall_w, tent_i, tent_w, tree_0, tree_1, tree_birch, tree_autumn, tree_elm, tree_pine_tall, tree_fir_blue, deadtree, house_0, house_1, house_2, rocks, grave, fence_x, fence_y, barrel, crate, hay, lamp, runebed, forge, stall, board, altar, banner, statue, weapon_rack, crystals, portal,
  fern, flowers, pebbles, mushrooms, bush, sacks, logpile, stump, tree_poplar, tree_oakwide, tree_sapling, ...DEAD_VARIANTS, ...ROCK_VARIANTS, ...PORTAL_VARIANTS, market_tent, goddess_altar, ...STEPPE_PROPS, ...GIANT_PROPS, ...CAMP_PROPS, ...TEMPLE_PROPS,
  church, tavern, shop, smithy, cottage_a, cottage_b, cottage_c, bridge, barricade, vine_row, garden_bed, scarecrow, dummy, target, bench, table, reeds, fortune_tent, mill_ruin, cart, cart_load, signpost, barrel_stack, log_stack, plank_pile, clothesline, pumpkins, tool_stand, anvil, caravan_wagon,
  dwall_hi, dwall_lo, dwall_buttress, dwall_niche, wall_block, torch_sconce, pillar, brazier, bones, skulls, rubble, candles, chest, chest_open, chest_rich, chest_rich_open, sarcophagus, sarcophagus_open, door, door_open, door_arch, door_arch_open, door_square, door_square_open, gate_sealed, altar_medallion, stalagmite, lavarock, puddle, rug, bookshelf, throne, well);   // подземелье (стены dwall_* ставит dungeon.js по тайлам)   // последние восемь — декор земли и хлам у домов (js/render3d/props.js, scatterDecor), в картах не стоят

// какая модель оружия соответствует типу оружия игры (wt); недостающие пока подменяются мечом
export const WEAPON_MODEL = { sword: 'sword_iron', greatsword: 'sword_iron', axe: 'sword_iron', bow: 'bow_hunter', staff: 'staff_mage' };
export const OFFHAND_MODEL = { warrior: 'shield_round' };

// породы деревьев: tree_0/tree_1 в карте — «лиственное»/«хвойное», а какая именно порода — решает слой окружения по позиции.
// Для леса за краем карты у каждой породы есть облегчённая копия «_far» (реже листва).
// варианты «голых» предметов: мёртвое дерево и камни разных форм (js/render3d/models/prop/_variants.js)
export const DEAD_KINDS = [['deadtree', 2], ...DEAD_VARIANTS.map(d => [d.id, 2])];
export const ROCK_KINDS = [['rocks', 2], ...ROCK_VARIANTS.map(d => [d.id, 1.5])];
export const TREE_KINDS = {
  tree_0: [['tree_0', 3], ['tree_elm', 3], ['tree_birch', 2.5], ['tree_autumn', 1.4], ['tree_oakwide', 2], ['tree_poplar', 1.6], ['tree_sapling', 1.6], ['tree_1', 1]],
  tree_1: [['tree_1', 3], ['tree_pine_tall', 2.5], ['tree_fir_blue', 1.5], ['tree_elm', 1.2], ['tree_birch', 0.8], ['tree_poplar', 0.8], ['tree_sapling', 0.8], ['tree_autumn', 0.7]],
};
for (const id of [...TREE_KINDS.tree_0, ...TREE_KINDS.tree_1].map(k => k[0]).concat(['tree_acacia', 'tree_acacia_b', 'tree_acacia_c'])) {
  const d = PROPS[id]; PROPS[id + '_far'] = { ...d, id: id + '_far', density: d.leaf === 'pine' ? 0.6 : Math.max(5, Math.round(d.density * 0.3)) };
}
