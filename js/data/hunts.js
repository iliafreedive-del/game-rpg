// «Охота» — тревожные слухи. Раз в 15 минут (реального времени) появляется новое задание:
// где-то объявилось чудовище — мини-босс, который водится ТОЛЬКО в охотах.
// Пока текущая охота не завершена (или не отменена), новая не появится — таймер стоит.
// Логика — game/hunts.js, таймер и карточка — ui/hud.js и окно «Задания» → «Охота».
// Как добавить новую охоту за 3 шага — docs/HUNTS.md.

export const HUNT_EVERY = 15 * 60e3;   // пауза между охотами (после завершения/отказа)
export const HUNT_FIRST = 2 * 60e3;    // первая охота — через 2 минуты после открытия системы

// ---- Места, где могут объявиться чудовища.
// zone: в какой зоне игры спавнится; at — точка в деревне; room — зал катакомб; depths — этаж Глубин.
export const PLACES = {
  forest: { name: 'Опушка Чёрного леса', zone: 'town', at: [34.5, 5.5], steps: ['Выйдите на северо-восточную окраину деревни — к опушке Чёрного леса.', 'Красные стрелки на земле приведут к чудовищу.'] },
  graveyard: { name: 'Старое кладбище', zone: 'town', at: [31.5, 35.5], steps: ['Идите на юго-восток деревни, к старому кладбищу за оградой.', 'Красные стрелки на земле приведут к чудовищу.'] },
  catacombs: { name: 'Катакомбы', zone: 'catacombs', steps: ['Спуститесь в катакомбы через портал Ордена (северо-запад деревни).', 'Чудовище ждёт в зале «{room}» — идите за красными стрелками.'] },
  depths: { name: 'Глубины катакомб', zone: 'depths', steps: ['Синий портал Глубин на площади → выберите этаж {floor} (помечен ⚠).', 'Чудовище бродит в середине этажа — идите за красными стрелками.'] },
};
export const ROOM_NAMES = { entry: 'Преддверие', ossuary: 'Оссуарий', gallery: 'Галерея', cave: 'Пещера', cross: 'Перекрёсток' };

// ---- Мини-боссы. Это обычные записи врагов (как в data/enemies.js) + поля охоты:
//  mini: true      — мини-босс охоты (полоса здоровья как у босса, красный круг под ногами)
//  atlas           — чей спрайт берём (пока схематично: перекрашенные существующие модели)
//  tint, scale     — CSS-фильтр цвета и размер, чтобы отличался от обычного монстра
//  base            — базовое поведение (melee/fast/archer/caster/beast/elite)
//  abil            — особые умения:
//     enrage: true                          — ярость на 50% здоровья (быстрее, бьёт чаще)
//     summon: { type, n, cd }               — призывает приспешников каждые cd секунд
//     nova:   { r, cd, elem, mult, c }      — круговой удар вокруг себя (с красным предупреждением)
//     volley: { n, spread, cd }             — веер снарядов (для стрелков и колдунов)
export const MINIBOSSES = {
  mb_forest_horror: {
    name: 'Лесной Ужас', atlas: 'beast', tint: 'brightness(0.55) sepia(1) hue-rotate(60deg) saturate(2.2)', scale: 1.5,
    base: 'beast', hp: 260, dmg: [9, 14], speed: 3.0, range: 1.5, cd: 2.4, impact: 0.5, xp: 140, gold: [50, 80], armor: 12, radius: 0.62,
    abil: { enrage: true, nova: { r: 3.2, cd: 9, mult: 1.3, c: [120, 255, 90] } },
    desc: 'Огромный зверь в мшистой шкуре. Прыгает издалека (уходите вбок от красной полосы) и топчет землю вокруг себя.',
  },
  mb_grave_weeper: {
    name: 'Плакальщица Кладбища', atlas: 'skel_mage', tint: 'grayscale(1) brightness(1.5) sepia(0.4) hue-rotate(170deg) saturate(2.5)', scale: 1.35,
    base: 'caster', hp: 200, dmg: [7, 11], elem: 'cold', speed: 2.2, range: 7.5, keep: 5, cd: 2.2, impact: 0.55, xp: 140, gold: [50, 80], armor: 6, radius: 0.45, proj: 'darkbolt',
    abil: { summon: { type: 'skel_warrior', n: 2, cd: 12 }, volley: { n: 3, spread: 0.35, cd: 7 } },
    desc: 'Призрачная колдунья. Телепортируется, бросает веер ледяных сгустков и поднимает скелетов из могил. Убейте её — свита рассыплется.',
  },
  mb_bone_reaper: {
    name: 'Костяной Жнец', atlas: 'elite', tint: 'sepia(1) hue-rotate(-40deg) saturate(3) brightness(0.8)', scale: 1.15,
    base: 'elite', hp: 320, dmg: [10, 15], speed: 2.7, range: 1.8, cd: 1.8, impact: 0.6, xp: 200, gold: [70, 110], armor: 18, radius: 0.55,
    abil: { enrage: true, nova: { r: 3.6, cd: 10, mult: 1.5, c: [255, 60, 40] } },
    desc: 'Страж, собранный из сотни костей. Рубит конусом, крутится кругом и раз в 10 секунд взрывается кровавой волной.',
  },
  mb_ghoul_mother: {
    name: 'Упырья Матка', atlas: 'ghoul', tint: 'sepia(1) hue-rotate(50deg) saturate(3) brightness(0.75)', scale: 1.7,
    base: 'fast', hp: 230, dmg: [6, 10], speed: 3.6, range: 1.3, cd: 1.1, impact: 0.5, xp: 160, gold: [60, 90], armor: 8, radius: 0.55,
    abil: { enrage: true, summon: { type: 'ghoul', n: 3, cd: 11 } },
    desc: 'Раздувшийся упырь, который рожает выводок. Быстрая, петляет. Не стойте на месте и сначала бейте Матку.',
  },
  mb_plague_archer: {
    name: 'Чумной Стрелок', atlas: 'skel_archer', tint: 'sepia(1) hue-rotate(40deg) saturate(4) brightness(0.9)', scale: 1.35,
    base: 'archer', hp: 210, dmg: [6, 10], speed: 2.5, range: 9, keep: 6, cd: 1.7, impact: 0.66, xp: 170, gold: [60, 90], armor: 6, radius: 0.45, proj: 'arrow',
    abil: { volley: { n: 5, spread: 0.22, cd: 6 }, summon: { type: 'skel_archer', n: 2, cd: 16 } },
    desc: 'Держит дистанцию и выпускает веер из 5 стрел — уклоняйтесь рывком в сторону. Сокращайте дистанцию.',
  },
  mb_eyeless_stalker: {
    name: 'Безглазый Охотник', atlas: 'beast', tint: 'sepia(1) hue-rotate(220deg) saturate(3) brightness(0.8)', scale: 1.35,
    base: 'beast', hp: 280, dmg: [10, 15], speed: 3.4, range: 1.4, cd: 1.6, impact: 0.5, xp: 190, gold: [70, 100], armor: 12, radius: 0.55,
    abil: { enrage: true, nova: { r: 2.8, cd: 7, mult: 1.2, elem: 'light', c: [190, 110, 255] } },
    desc: 'Слепой зверь из Глубин: прыгает чаще обычного и бьёт молнией вокруг себя.',
  },
  mb_ash_lich: {
    name: 'Пепельный Лич', atlas: 'skel_mage', tint: 'sepia(1) hue-rotate(-20deg) saturate(5) brightness(1.1)', scale: 1.45,
    base: 'caster', hp: 240, dmg: [8, 12], elem: 'fire', speed: 2.0, range: 8, keep: 5.5, cd: 2.4, impact: 0.55, xp: 220, gold: [80, 120], armor: 6, radius: 0.48, proj: 'darkbolt',
    abil: { enrage: true, nova: { r: 3.0, cd: 9, mult: 1.4, elem: 'fire', c: [255, 140, 40] }, summon: { type: 'skel_mage', n: 1, cd: 14 } },
    desc: 'Огненный колдун. Огненное кольцо вокруг себя, призывает костяных колдунов. Не стойте рядом, когда под ним загорится круг.',
  },
};
// общие поля мини-боссов (их не нужно повторять в каждой записи)
for (const D of Object.values(MINIBOSSES)) Object.assign(D, { mini: true, elite: true, ai: 'mini', fps: { walk: 10, attack: 10 } });

// ---- Сами охоты (задания). Одна запись = одно возможное задание.
//  title    — заголовок тревоги
//  rumor    — слух, который игрок видит в карточке (атмосфера + подсказка)
//  boss     — ключ из MINIBOSSES
//  place    — ключ из PLACES; rooms — залы катакомб (для place: 'catacombs')
//  minLevel — с какого уровня героя может выпасть
//  trophy   — именная вещь-трофей (slot: weapon/head/chest/amulet), выдаётся вместе с золотом и опытом;
//             для оружия name можно задать по классам: { warrior, archer, mage }
export const HUNTS = [
  { id: 'forest_horror', title: 'В лесу появился страшный зверь', place: 'forest', boss: 'mb_forest_horror', minLevel: 2,
    rumor: 'Лесорубы не вернулись с опушки. Охотник Ян видел следы размером с тележное колесо… никто не знает, что это за тварь.',
    trophy: { slot: 'amulet', name: 'Клык Лесного Ужаса' } },
  { id: 'grave_weeper', title: 'Плач на старом кладбище', place: 'graveyard', boss: 'mb_grave_weeper', minLevel: 3,
    rumor: 'Каждую ночь с кладбища доносится женский плач, а наутро разрыты две-три могилы. Сторож больше туда не ходит.',
    trophy: { slot: 'head', name: 'Вуаль Плакальщицы' } },
  { id: 'bone_reaper', title: 'Жнец в катакомбах', place: 'catacombs', rooms: ['ossuary', 'gallery', 'cross'], boss: 'mb_bone_reaper', minLevel: 3,
    rumor: 'Из катакомб слышен скрежет — будто кто-то точит косу о кости. Скелеты бегут оттуда сами.',
    trophy: { slot: 'weapon', name: { warrior: 'Коса Жнеца', archer: 'Костяной лук Жнеца', mage: 'Посох Жнеца' } } },
  { id: 'ghoul_mother', title: 'Гнездо в пещере', place: 'catacombs', rooms: ['cave', 'entry'], boss: 'mb_ghoul_mother', minLevel: 3,
    rumor: 'Упырей в катакомбах стало вдвое больше. Значит, где-то в пещере завелась Матка.',
    trophy: { slot: 'chest', name: 'Шкура Матки' } },
  { id: 'plague_archer', title: 'Чумной стрелок в Глубинах', place: 'depths', boss: 'mb_plague_archer', minLevel: 6,
    rumor: 'Разведчики Ордена вернулись с отравленными стрелами в щитах. Стрелок засел на одном из этажей Глубин.',
    trophy: { slot: 'weapon', name: { warrior: 'Чумной клинок', archer: 'Чумная тетива', mage: 'Чумной посох' } } },
  { id: 'eyeless_stalker', title: 'Слепая тварь на этаже', place: 'depths', boss: 'mb_eyeless_stalker', minLevel: 6,
    rumor: 'В Глубинах кто-то охотится на нежить. Он не видит — но слышит каждый шаг.',
    trophy: { slot: 'amulet', name: 'Глаз-жемчужина' } },
  { id: 'ash_lich', title: 'Пепельный Лич пробудился', place: 'depths', boss: 'mb_ash_lich', minLevel: 8,
    rumor: 'Свечи в святилище гаснут сами, а из Глубин тянет гарью. Старый Лич вернулся.',
    trophy: { slot: 'head', name: 'Корона из пепла' } },
];

// Награда за охоту (масштабируется уровнем чудовища)
export const huntReward = lvl => ({ gold: 60 + lvl * 25, xp: 80 + lvl * 30, shards: 1 + Math.floor(lvl / 6), potions: 1 });
