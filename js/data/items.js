// Item definitions: base types, affix pool, rarities, unique (epic) effects.
// Browser-friendly gear: only 4 slots — weapon, helm, armour, amulet.
export const SLOTS = ['weapon', 'head', 'chest', 'amulet'];
// Hero classes: allowed weapons, skill branches, starting attributes.
export const CLASSES = {
  warrior: { name: 'Рыцарь Ордена', desc: 'Меч и щит. Крепкий, бьёт вблизи, поджигает врагов огнём.', weapons: ['sword', 'greatsword', 'axe'], main: 'sword', branches: ['sword', 'fire'], attrs: { str: 16, dex: 10, int: 7, vit: 14 }, block: 0.12, gift: 'whirlwind', icon: 'sword' },
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
];

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
export const AFFIXES = {
  dmgPct:   { name: v => `+${v}% к урону оружия`, g: 'W', r: l => [10 + l * 2, 25 + l * 4], w: 10 },
  dmgFlat:  { name: v => `+${v} к урону`, g: 'WJ', r: l => [1 + (l >> 1), 3 + l], w: 8 },
  ias:      { name: v => `+${v}% к скорости атаки`, g: 'WJ', r: l => [5, 10 + (l >> 1)], w: 6 },
  crit:     { name: v => `+${v}% к шансу крит. удара`, g: 'WJA', r: l => [2, 4 + (l >> 2)], w: 6 },
  critDmg:  { name: v => `+${v}% к крит. урону`, g: 'WJ', r: l => [10, 20 + l * 2], w: 5 },
  armor:    { name: v => `+${v} к защите`, g: 'AO', r: l => [2 + l, 6 + l * 2], w: 10 },
  armorPct: { name: v => `+${v}% к защите предмета`, g: 'AO', r: l => [15, 35 + l * 3], w: 6 },
  hp:       { name: v => `+${v} к здоровью`, g: 'AOJ', r: l => [8 + l * 3, 18 + l * 6], w: 10 },
  mp:       { name: v => `+${v} к мане`, g: 'AJW', r: l => [5 + l * 2, 12 + l * 4], w: 7 },
  str:      { name: v => `+${v} к силе`, g: 'WAJO', r: l => [1 + (l >> 1), 3 + l], w: 7 },
  dex:      { name: v => `+${v} к ловкости`, g: 'WAJ', r: l => [1 + (l >> 1), 3 + l], w: 7 },
  int:      { name: v => `+${v} к интеллекту`, g: 'WAJ', r: l => [1 + (l >> 1), 3 + l], w: 7 },
  vit:      { name: v => `+${v} к живучести`, g: 'AJO', r: l => [1 + (l >> 1), 3 + l], w: 7 },
  fire:     { name: v => `+${v}% к урону огнём`, g: 'WJ', r: l => [8, 15 + l * 2], w: 5 },
  cold:     { name: v => `+${v}% к урону льдом`, g: 'WJ', r: l => [8, 15 + l * 2], w: 5 },
  light:    { name: v => `+${v}% к урону молнией`, g: 'WJ', r: l => [8, 15 + l * 2], w: 5 },
  regen:    { name: v => `+${v} маны в секунду`, g: 'JAW', r: l => [1, 2 + (l >> 2)], w: 4 },
  leech:    { name: v => `+${v} здоровья за удар`, g: 'WJ', r: l => [1, 2 + (l >> 1)], w: 4 },
  goldFind: { name: v => `+${v}% к находимому золоту`, g: 'AJ', r: l => [10, 25 + l * 2], w: 4 },
  skill:    { name: (v, b) => `+${v} к уровню ветки «${b}»`, g: 'WJ', r: () => [1, 1], w: 2, branch: true },
};
export const AFFIX_GROUP = slot => slot === 'weapon' ? 'W' : slot === 'offhand' ? 'O' : (slot === 'amulet' || slot === 'ring') ? 'J' : 'A';

// Epic (purple) items — boss only. Each has a unique mechanic that the combat code checks.
export const EPICS = [
  { id: 'e_bow', base: 'long_bow', name: 'Шёпот Бездны', effect: 'splitArrow', desc: 'Каждая стрела раскалывается на 3 в полёте.', fixed: { dex: 8, crit: 5 } },
  { id: 'e_sword', base: 'knight_sword', name: 'Клятва Палача', effect: 'execute', desc: 'Удары по врагам ниже 30% здоровья наносят двойной урон.', fixed: { str: 8, dmgPct: 30 } },
  { id: 'e_staff', base: 'rune_staff', name: 'Посох Угасшей Звезды', effect: 'echo', desc: '25% шанс повторить заклинание бесплатно.', fixed: { int: 10, mp: 30 } },
  { id: 'e_axe', base: 'war_axe', name: 'Цепной Секач', effect: 'chainHit', desc: 'Удары перескакивают на ближайшего врага (50% урона).', fixed: { str: 6, ias: 10 } },
  { id: 'e_amulet', base: 'amulet', name: 'Сердце Палача', effect: 'bloodShield', desc: 'Убийство врага даёт щит на 10% макс. здоровья.', fixed: { vit: 10, hp: 40 } },
  { id: 'e_chest', base: 'plate', name: 'Доспех Бездны', effect: 'thorns', desc: 'Атакующие вблизи получают 30% отражённого урона.', fixed: { vit: 8, armorPct: 40 } },
];

export const CONSUMABLES = {
  potion_hp: { name: 'Зелье здоровья', icon: 'potion_hp', desc: 'Восстанавливает 45% здоровья за 1 сек.' },
  potion_mp: { name: 'Зелье маны', icon: 'potion_mp', desc: 'Восстанавливает 50% маны за 1 сек.' },
  scroll: { name: 'Свиток возврата', icon: 'scroll', desc: 'Открывает портал в деревню из подземелья.' },
};
