// Облики (косметика): перекраска героев и питомцев, внешние эффекты, особые питомцы. Силу не дают — только вид.
// Как получить (get): { shards: N } — осколки Бездны у Кофи; { rub: 'product_id' } — покупка (цена из каталога площадки);
// { ads: N, days: 7 } — альтернатива покупке: N просмотров рекламы за вознаграждение, прогресс копится неделю, потом сгорает.
// Вид облика героя — три «краски» текстуры (glbskin + toon.applyLook): a — ткань и камни (была фиолетовая), b — кайма (золото),
// c — броня (сталь); glow — свечение ткани. model — другая модель того же класса (качается только когда надета).

// краски для «собери сам»: каждая часть меняется отдельно
export const DYES = {
  a: { violet: ['Фиолет', null], crimson: ['Багрянец', 0x8a0a18], emerald: ['Изумруд', 0x0c6a34], azure: ['Лазурь', 0x1450c8], black: ['Сажа', 0x141018], white: ['Снег', 0xd8d4cc], ember: ['Пламя', 0xd84a08] },
  b: { gold: ['Золото', null], silver: ['Серебро', 0xd0d6e0], dark: ['Чернь', 0x26262c], copper: ['Медь', 0xb05a2a], bone: ['Кость', 0xd8ceb0] },
  c: { steel: ['Сталь', null], black: ['Вороная', 0x1e1e26], white: ['Белая', 0xd8d8d4], bronze: ['Бронза', 0x7a4a20], ice: ['Ледяная', 0x8ac8f0] },
};
// готовые облики героя (по классам одинаковые наборы красок; модель — своя у класса)
export const HERO_LOOKS = {
  base:    { name: 'Как есть', look: null, get: null },
  blood:   { name: 'Кровавый страж', look: { a: 0x8a0a18, b: 0x26262c, c: 0x2a1e22, glow: 0xff2010, glowK: 0.35 }, get: { shards: 40 } },
  frost:   { name: 'Ледяной паладин', look: { a: 0x1450c8, b: 0xd0d6e0, c: 0x9ad0f0, glow: 0x60c0ff, glowK: 0.3 }, get: { rub: 'look_frost' } },
  ember:   { name: 'Пепельное пламя', look: { a: 0x1a0604, b: 0xb05a2a, c: 0x2a2422, glow: 0xff5a10, glowK: 0.35, pulse: 0.8 }, get: { rub: 'look_ember', ads: 150, days: 7 } },
  holy:    { name: 'Светоносный', look: { a: 0xd8d4cc, b: 0xffc840, c: 0xe8e8e4, glow: 0xffe090, glowK: 0.25 }, get: { shards: 60 } },
  emerald: { name: 'Изумрудный лес', look: { a: 0x0c6a34, b: 0xd8ceb0, c: 0x7a4a20 }, get: { shards: 30 } },
  void:    { name: 'Дитя Бездны', look: { a: 0x2a0a4a, b: 0x26262c, c: 0x1e1e26, glow: 0xb050ff, glowK: 0.5, pulse: 0.4 }, get: { rub: 'look_void', ads: 200, days: 7 } },
};
// другая модель того же класса (уже лежат в assets/models, в сборку попадали и раньше)
export const HERO_MODELS = {
  warrior: { warrior_knight: 'Рыцарь Ордена', warrior_vanguard: 'Фиолетовый авангард' },
  mage: { mage_staff: 'Маг посоха', mage_archmage: 'Звёздный архимаг' },
  archer: { archer_raven: 'Вороний лучник' },
};
// облики питомцев: для процедурных моделей — сдвиг оттенка, насыщенность, яркость, тонировка, свечение
export const PET_SKINS = {
  fennec:   { snow: ['Снежный', { tint: 0xe8f4ff, tintK: 0.75, glow: 0x60c0ff, glowK: 0.05 }], shadow: ['Теневой', { val: 0.35, sat: 0.6, glow: 0xa050ff, glowK: 0.25, glowAll: true, hue: 0.62 }], gold: ['Золотой', { tint: 0xffc840, tintK: 0.8 }] },
  crow:     { white: ['Белый ворон', { val: 6, sat: 0.2 }], ember: ['Угольный', { glow: 0xff5010, glowK: 0.25, glowAll: true }], ghost: ['Призрачный', { tint: 0x80e0ff, tintK: 0.8 }] },
  scorpid:  { azure: ['Лазурный', { hue: 0.55 }], obsidian: ['Обсидиан', { val: 0.3, sat: 0.3, glow: 0xff3010, glowK: 0.06, glowAll: true }], gold: ['Золотой', { tint: 0xffc840, tintK: 0.8 }] },
  wisp:     { fire: ['Огненный', { hue: 0.68 }], void: ['Бездны', { hue: 0.4 }], blood: ['Кровавый', { hue: 0.62, sat: 1.4 }] },
  skull:    { gold: ['Золотой', { tint: 0xffc840, tintK: 0.85 }], frost: ['Ледяной', { hue: 0.27 }], blood: ['Кровавый', { hue: 0.67, tint: 0xa01010, tintK: 0.4 }] },
  basilisk: { ruby: ['Рубиновый', { hue: 0.68 }], azure: ['Лазурный', { hue: 0.33 }], gold: ['Золотой', { tint: 0xffc840, tintK: 0.8 }] },
  bat:      { blood: ['Кровавая', { hue: 0.2, sat: 1.3 }], frost: ['Ледяная', { hue: 0.85 }], gold: ['Золотая', { tint: 0xffc840, tintK: 0.8 }] },
  golem:    { obsidian: ['Обсидиан', { val: 0.3, sat: 0.4, glow: 0xff5010, glowK: 0.05, glowAll: true }], frost: ['Ледяной', { hue: 0.5, sat: 0.7 }], jade: ['Нефритовый', { hue: 0.33 }] },
  dragon:   { fire: ['Огненный', { tint: 0xff4a10, tintK: 0.65 }], frost: ['Ледяной', { tint: 0x8ad8ff, tintK: 0.7 }], gold: ['Золотой', { tint: 0xffc840, tintK: 0.8 }] },
  phoenix:  { frost: ['Ледяной', { hue: 0.55 }], void: ['Бездны', { hue: 0.75 }], soul: ['Душ', { hue: 0.4 }] },
  spiritwolf: { ember: ['Пламенный', { tint: 0xff6a20, tintK: 0.7, glow: 0xff5010, glowK: 0.35, glowAll: true }], void: ['Бездны', { tint: 0x9a50ff, tintK: 0.7, glow: 0x9040ff, glowK: 0.4, glowAll: true }], blood: ['Кровавый', { tint: 0xc01818, tintK: 0.7, glow: 0xff2020, glowK: 0.3, glowAll: true }] },
};
// особые питомцы: за рубли или за рекламу (прогресс недели)
export const PREMIUM_PETS = {
  dragon:     { name: 'Дракончик Бездны', icon: '🐉', get: { rub: 'pet_dragon', ads: 200, days: 7 } },
  spiritwolf: { name: 'Призрачный волчонок', icon: '🐺', get: { rub: 'pet_spiritwolf', ads: 150, days: 7 }, look: { glow: 0x60d0ff, glowK: 0.4, glowAll: true } },
  phoenix:    { name: 'Феникс', icon: '🔥', get: { rub: 'pet_phoenix', ads: 200, days: 7 } },
};
// внешние эффекты (render3d/cosfx.js), слоты: trail — следы, aura — аура, wings — крылья, extra — нимб/сферы/корона
export const EFFECTS = {
  trail: { fire: 'Огненные следы', ice: 'Иней', blood: 'Кровавые следы', shadow: 'Тень', gold: 'Золотые звёзды' },
  aura: { fire: 'Аура огня', frost: 'Аура холода', blood: 'Аура крови', void: 'Аура Бездны', holy: 'Свет', poison: 'Яд' },
  wings: { demon: 'Крылья демона', angel: 'Крылья ангела', frost: 'Ледяные крылья', flame: 'Крылья пламени', void: 'Крылья Бездны' },
  extra: { halo: 'Нимб', halo_void: 'Тёмный нимб', orbs: 'Сферы душ', orbs_fire: 'Огненные сферы', crown: 'Корона пламени' },
};
