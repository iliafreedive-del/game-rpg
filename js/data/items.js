// Item definitions: base types, affix pool, rarities, unique (epic) effects.
// Browser-friendly gear: only 4 slots — weapon, helm, armour, amulet.
export const SLOTS = ['weapon', 'head', 'chest', 'amulet'];
// Hero classes: allowed weapons, skill branches, starting attributes.
export const CLASSES = {
  warrior: { name: 'Рыцарь Ордена', desc: 'Меч и щит. Крепкий, бьёт вблизи, поджигает врагов огнём.', weapons: ['sword'], main: 'sword', branches: ['sword', 'fire'], attrs: { str: 16, dex: 10, int: 7, vit: 14 }, block: 0.12, gift: 'whirlwind', icon: 'sword' },
  archer: { name: 'Вороний страж', desc: 'Лучник в маске ворона. Бьёт издалека, замедляет льдом.', weapons: ['bow'], main: 'bow', branches: ['bow', 'ice'], attrs: { str: 9, dex: 17, int: 10, vit: 11 }, block: 0, gift: 'volley', icon: 'bow' },
  mage: { name: 'Звездочтец', desc: 'Маг Бездны в фарфоровой маске: огонь, лёд и молния.', weapons: ['staff'], main: 'staff', branches: ['fire', 'ice', 'light'], attrs: { str: 7, dex: 10, int: 18, vit: 11 }, block: 0, gift: null, icon: 'staff' },
};
// Рост характеристик за уровень (5 очков) — автоматический, по классу.
export const GROWTH = { warrior: { str: 2, vit: 2, dex: 1, int: 0 }, archer: { dex: 3, vit: 1, str: 1, int: 0 }, mage: { int: 3, vit: 1, dex: 1, str: 0 } };
export const SLOT_NAMES = { weapon: 'Оружие', head: 'Шлем', chest: 'Доспех', amulet: 'Амулет' };
export const RARITY = [
  { id: 'white', name: 'Обычный', color: '#b9b4a6', affixes: [0, 0] },
  { id: 'green', name: 'Необычный', color: '#5fd16a', affixes: [1, 1] },
  { id: 'blue', name: 'Редкий', color: '#6ea8ff', affixes: [2, 3] },
  { id: 'purple', name: 'Эпический', color: '#f2cf4a', affixes: [4, 5] },
  { id: 'red', name: 'Мифический', color: '#ff5a4a', affixes: [5, 5] },   // сборка 20: только слиянием трёх золотых
];
// Слияние у кузнеца (сборка 20): три вещи одного слота и одной редкости → одна следующей редкости.
// Редкость теперь прямо усиливает вещь: урон оружия и защита × RMUL (вместе с закалкой).
export const RMUL = [1, 1.1, 1.25, 1.45, 1.8];
export const RARITY_SHORT = ['серое', 'зелёное', 'синее', 'золотое', 'мифическое'];
// «Свойство вида»: у каждого вида вещи своё, открывается на синем и растёт с редкостью (×1 синее, ×2 золотое, ×3 мифическое)
export const KIND_PERK = {
  // сборка 47: только усиления, как у наставника Элвина (сила удара, здоровье, проворство, защита, мана); крита, ловкости и прочего на вещах нет
  sword: { k: 'ias', v: 5, txt: 'Меч: быстрее удары' }, greatsword: { k: 'ias', v: 5, txt: 'Быстрее удары' }, axe: { k: 'ias', v: 5, txt: 'Быстрее удары' },
  bow: { k: 'ias', v: 5, txt: 'Лук: быстрее выстрелы' }, staff: { k: 'mp', v: 15, txt: 'Посох: больше маны' },
  head: { k: 'hp', v: 20, txt: 'Шлем: больше здоровья' }, chest: { k: 'armor', v: 8, txt: 'Доспех: больше защиты' }, amulet: { k: 'dmgPct', v: 4, txt: 'Амулет: сильнее удар' },
};

// Weapon profiles — differ in speed, range, animation and ability, not only damage.
export const WEAPONS = {
  sword: { name: 'Одноручный меч', icon: 'sword', dmg: [5, 10], aps: 1.5, range: 1.35, arc: 100, hands: 1, clips: ['slash1', 'slash2'], impact: 0.5, scale: 'str', note: 'Быстрые удары, комбо из двух взмахов; можно носить щит.' },
  greatsword: { name: 'Двуручный меч', icon: 'greatsword', dmg: [13, 23], aps: 0.9, range: 1.75, arc: 150, hands: 2, clips: ['chop2', 'sweep2'], impact: 0.58, scale: 'str', cleave: 1, note: 'Медленно, но бьёт всех врагов в широкой дуге.' },
  axe: { name: 'Топор', icon: 'axe', dmg: [7, 13], aps: 1.2, range: 1.3, arc: 90, hands: 1, clips: ['slash1', 'slash2'], impact: 0.5, scale: 'str', pierce: 0.35, bleed: 0.25, note: 'Игнорирует 35% брони и вызывает кровотечение.' },
  bow: { name: 'Лук', icon: 'bow', dmg: [5, 11], aps: 1.1, range: 9, hands: 2, clips: ['bowdraw', 'bowrel'], impact: 0, scale: 'dex', projectile: 'arrow', note: 'Стрелы летят на 9 м. Урон растёт от ловкости.' },
  staff: { name: 'Посох', icon: 'staff', dmg: [3, 7], aps: 1.0, range: 7, hands: 2, clips: ['cast'], impact: 0.5, scale: 'int', projectile: 'bolt', spell: 0.25, note: 'Магический заряд; +25% к урону заклинаний.' },
};

// Base items: [key, slot, weaponType|null, name, minLevel, armor/dmgMult, reqs]
export const BASES = [
  // weapons
  { k: 'short_sword', slot: 'weapon', wt: 'sword', name: 'Короткий меч', lvl: 1, mult: 1.0 },
  { k: 'long_sword', slot: 'weapon', wt: 'sword', name: 'Длинный меч', lvl: 3, mult: 1.3, req: { str: 14 } },
  { k: 'knight_sword', slot: 'weapon', wt: 'sword', name: 'Рыцарский клинок', lvl: 6, mult: 1.65, req: { str: 20 } },
  { k: 'claymore', slot: 'weapon', wt: 'greatsword', name: 'Клеймор', lvl: 2, mult: 1.0, req: { str: 16 } },
  { k: 'zweihander', slot: 'weapon', wt: 'greatsword', name: 'Цвайхендер', lvl: 5, mult: 1.35, req: { str: 22 } },
  { k: 'hand_axe', slot: 'weapon', wt: 'axe', name: 'Ручной топор', lvl: 1, mult: 1.0 },
  { k: 'war_axe', slot: 'weapon', wt: 'axe', name: 'Боевой топор', lvl: 4, mult: 1.35, req: { str: 17 } },
  { k: 'short_bow', slot: 'weapon', wt: 'bow', name: 'Короткий лук', lvl: 1, mult: 1.0 },
  { k: 'hunter_bow', slot: 'weapon', wt: 'bow', name: 'Охотничий лук', lvl: 3, mult: 1.3, req: { dex: 15 } },
  { k: 'long_bow', slot: 'weapon', wt: 'bow', name: 'Длинный лук', lvl: 5, mult: 1.6, req: { dex: 21 } },
  { k: 'oak_staff', slot: 'weapon', wt: 'staff', name: 'Дубовый посох', lvl: 1, mult: 1.0 },
  { k: 'rune_staff', slot: 'weapon', wt: 'staff', name: 'Рунный посох', lvl: 4, mult: 1.4, req: { int: 17 } },
  // offhand
  { k: 'buckler', slot: 'offhand', name: 'Баклер', icon: 'shield', lvl: 1, armor: 6, block: 0.10 },
  { k: 'kite_shield', slot: 'offhand', name: 'Каплевидный щит', icon: 'shield', lvl: 4, armor: 12, block: 0.15, req: { str: 16 } },
  // armor
  { k: 'cap', slot: 'head', name: 'Кожаный шлем', icon: 'head', lvl: 1, armor: 3 },
  { k: 'helm', slot: 'head', name: 'Рогатый шлем', icon: 'head', lvl: 4, armor: 7, req: { str: 14 } },
  { k: 'pads', slot: 'shoulders', name: 'Наплечники', icon: 'shoulders', lvl: 1, armor: 2 },
  { k: 'pauldrons', slot: 'shoulders', name: 'Стальные наплечники', icon: 'shoulders', lvl: 4, armor: 6 },
  { k: 'jerkin', slot: 'chest', name: 'Стёганая куртка', icon: 'chest', lvl: 1, armor: 5 },
  { k: 'mail', slot: 'chest', name: 'Кольчуга', icon: 'chest', lvl: 3, armor: 10, req: { str: 13 } },
  { k: 'plate', slot: 'chest', name: 'Латный доспех', icon: 'chest', lvl: 6, armor: 17, req: { str: 20 } },
  { k: 'gloves', slot: 'hands', name: 'Перчатки', icon: 'hands', lvl: 1, armor: 2 },
  { k: 'gauntlets', slot: 'hands', name: 'Латные рукавицы', icon: 'hands', lvl: 4, armor: 5 },
  { k: 'trousers', slot: 'legs', name: 'Штаны', icon: 'legs', lvl: 1, armor: 3 },
  { k: 'greaves', slot: 'legs', name: 'Поножи', icon: 'legs', lvl: 4, armor: 7 },
  { k: 'boots', slot: 'feet', name: 'Сапоги', icon: 'feet', lvl: 1, armor: 2 },
  { k: 'sabatons', slot: 'feet', name: 'Сабатоны', icon: 'feet', lvl: 4, armor: 5 },
  // jewellery
  { k: 'amulet', slot: 'amulet', name: 'Амулет', icon: 'amulet', lvl: 1 },
  { k: 'ring', slot: 'ring', name: 'Кольцо', icon: 'ring', lvl: 1 },
];
export const BASE = Object.fromEntries(BASES.map(b => [b.k, b]));

// Affixes. v(ilvl) → rolled value range. kinds: allowed slot groups.
// groups: W weapon, A armor(any), O offhand, J jewellery
// сборка 47: на вещах только те же усиления, что продаёт наставник Элвин — сила удара, здоровье, проворство, защита, мана.
// Крит, ловкость, сила, стихии, вампиризм и т. п. с вещей убраны (крит качается только у Элвина за осколки Бездны).
export const AFFIXES = {
  dmgPct:   { name: v => `+${v}% к силе удара`, g: 'WJ', r: l => [3 + (l >> 1), 6 + l], w: 10 },
  hp:       { name: v => `+${v} к здоровью`, g: 'AOJ', r: l => [6 + l * 2, 12 + l * 4], w: 10 },
  ias:      { name: v => `+${v}% к скорости атаки`, g: 'WJ', r: l => [3, 5 + (l >> 2)], w: 7 },
  armor:    { name: v => `+${v} к защите`, g: 'AO', r: l => [2 + l, 5 + l * 2], w: 10 },
  mp:       { name: v => `+${v} к мане`, g: 'AJW', r: l => [5 + l * 2, 12 + l * 4], w: 6 },
  // С35 (правки 2): свойства «под билд» — для одной ветви навыков героя (b), только с синей редкости (minR). Ветвь выбирается из веток класса
  brDmg:    { name: (v, bn) => `+${v}% к урону навыков «${bn}»`, g: 'WJ', r: l => [6 + (l >> 1), 10 + l], w: 4, branch: true, minR: 2 },
  brCd:     { name: (v, bn) => `−${v}% к перезарядке навыков «${bn}»`, g: 'AJ', r: l => [6, 12 + (l >> 2)], w: 3, branch: true, minR: 2 },
  brMana:   { name: (v, bn) => `−${v}% маны на навыки «${bn}»`, g: 'AOJ', r: l => [8, 15 + (l >> 2)], w: 3, branch: true, minR: 2 },
};
export const BR_CAP = { brDmg: 60, brCd: 40, brMana: 50 };   // предел суммы по ветви, %
// ключи старых свойств — вычищаются из сохранений (save.js, v6→v7) и не учитываются в характеристиках
export const OLD_AFFIXES = ['dmgFlat', 'crit', 'critDmg', 'armorPct', 'str', 'dex', 'int', 'vit', 'fire', 'cold', 'light', 'regen', 'leech', 'goldFind', 'skill'];
export const AFFIX_GROUP = slot => slot === 'weapon' ? 'W' : slot === 'offhand' ? 'O' : (slot === 'amulet' || slot === 'ring') ? 'J' : 'A';

// Epic (purple) items — boss only. Each has a unique mechanic that the combat code checks.
export const EPICS = [
  { id: 'e_bow', base: 'long_bow', name: 'Шёпот Бездны', effect: 'splitArrow', desc: 'Каждая стрела раскалывается на 3 в полёте.', fixed: { dmgPct: 10, ias: 6 } },
  { id: 'e_sword', base: 'knight_sword', name: 'Клятва Палача', effect: 'execute', desc: 'Удары по врагам ниже 30% здоровья наносят двойной урон.', fixed: { dmgPct: 12, hp: 30 } },
  { id: 'e_staff', base: 'rune_staff', name: 'Посох Угасшей Звезды', effect: 'echo', desc: '25% шанс повторить заклинание бесплатно.', fixed: { dmgPct: 10, mp: 30 } },
  { id: 'e_axe', base: 'war_axe', name: 'Цепной Секач', effect: 'chainHit', desc: 'Удары перескакивают на ближайшего врага (50% урона).', fixed: { dmgPct: 10, ias: 6 } },
  { id: 'e_amulet', base: 'amulet', name: 'Сердце Палача', effect: 'bloodShield', desc: 'Убийство врага даёт щит на 10% макс. здоровья.', fixed: { hp: 40, mp: 20 } },
  { id: 'e_chest', base: 'plate', name: 'Доспех Бездны', effect: 'thorns', desc: 'Атакующие вблизи получают 30% отражённого урона.', fixed: { armor: 20, hp: 30 } },
];

export const CONSUMABLES = {
  potion_hp: { name: 'Зелье здоровья', icon: 'potion_hp', desc: 'Восстанавливает 45% здоровья за 1 сек.' },
  potion_mp: { name: 'Зелье маны', icon: 'potion_mp', desc: 'Восстанавливает 50% маны за 1 сек.' },
  scroll: { name: 'Свиток возврата', icon: 'scroll', desc: 'Открывает портал в деревню из подземелья.' },
};
