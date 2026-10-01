// Реестр моделей: единственное место, где модель подключается к игре. Добавили файл в models/ — добавьте строку сюда.
// Ключи совпадают с идентификаторами игры: класс героя (js/data/items.js CLASSES), тип врага (js/data/enemies.js ENEMIES),
// model у NPC (assets/maps/*.json), wt оружия, имя спрайта (spr) у предмета окружения (js/world/zone.js PROP).
import warrior from './models/hero/warrior.js';
import skel_warrior from './models/mob/skel_warrior.js';
import ghoul from './models/mob/ghoul.js';
import npc_elder from './models/npc/npc_elder.js';
import npc_smith from './models/npc/npc_smith.js';
import npc_merchant from './models/npc/npc_merchant.js';
import npc_trainer from './models/npc/npc_trainer.js';
import sword_iron from './models/weapon/sword_iron.js';
import shield_round from './models/weapon/shield_round.js';
import sword_rust from './models/weapon/sword_rust.js';
import shield_bone from './models/weapon/shield_bone.js';
import tree_0 from './models/prop/tree_0.js';
import tree_1 from './models/prop/tree_1.js';
import tree_0_far from './models/prop/tree_0_far.js';
import tree_1_far from './models/prop/tree_1_far.js';
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
import sacks from './models/prop/sacks.js';
import logpile from './models/prop/logpile.js';
import stump from './models/prop/stump.js';

const by = (...l) => Object.fromEntries(l.map(m => [m.id, m]));
export const HEROES = by(warrior);                       // ключ — класс героя
export const MOBS = by(skel_warrior, ghoul);             // ключ — тип врага (ENEMIES)
export const NPCS = by(npc_elder, npc_smith, npc_merchant, npc_trainer);
export const WEAPONS = by(sword_iron, shield_round, sword_rust, shield_bone);
export const PROPS = by(tree_0, tree_1, tree_0_far, tree_1_far, deadtree, house_0, house_1, house_2, rocks, grave, fence_x, fence_y, barrel, crate, hay, lamp, runebed, forge, stall, board, altar, banner, statue, weapon_rack, crystals, portal,
  fern, flowers, pebbles, mushrooms, bush, sacks, logpile, stump);   // последние восемь — декор земли и хлам у домов (js/render3d/props.js, scatterDecor), в картах не стоят

// какая модель оружия соответствует типу оружия игры (wt); недостающие пока подменяются мечом
export const WEAPON_MODEL = { sword: 'sword_iron', greatsword: 'sword_iron', axe: 'sword_iron' };
export const OFFHAND_MODEL = { warrior: 'shield_round' };
