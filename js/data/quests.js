// Chapter I «Пробуждение под катакомбами». Objectives are checked by game/quests.js
// against real counters/flags — nothing is credited for actions the player did not perform.
export const CHAPTER = 'Глава I. Пробуждение под катакомбами';
export const STORY = [
  { id: 'talk_elder', title: 'Поговорить со старостой', text: 'Староста Эдрик ждёт на площади у колодца.', obj: { talk: 'elder' }, reward: { xp: 20, gold: 60, potions: 2, items: [{ slot: 'weapon', tier: 1, rarity: 1, names: { warrior: 'Клинок ополченца', archer: 'Лук егеря', mage: 'Посох травника' } }] }, where: 'town', target: 'elder' },
  { id: 'find_portal', title: 'Найти портал', text: 'Старый портал Ордена стоит на северо-западе деревни.', obj: { near: 'portal_town' }, reward: { xp: 20, skillPts: 1 }, where: 'town', target: 'portal_town' },
  { id: 'enter', title: 'Войти в катакомбы', text: 'Шагните в портал, чтобы спуститься в катакомбы.', obj: { enter: 'catacombs' }, reward: { xp: 30, scrolls: 2, gold: 20 }, where: 'town', target: 'portal_town' },
  { id: 'kill20', title: 'Уничтожить 20 скелетов', text: 'Нежить ползёт из оссуария. Упокойте 20 скелетов.', obj: { count: 'skeletons', n: 20 }, reward: { xp: 150, gold: 40, items: [{ slot: 'chest', tier: 2, rarity: 2, names: { warrior: 'Кольчуга Ордена', archer: 'Доспех следопыта', mage: 'Мантия заклинателя' } }] }, where: 'catacombs' },
  { id: 'gold100', title: 'Собрать 100 золота', text: 'Кузнецу нужны деньги на серебро против нежити. Соберите 100 золота в катакомбах.', obj: { count: 'gold', n: 100 }, reward: { xp: 80, potions: 2, items: [{ slot: 'head', tier: 2, rarity: 1, names: { warrior: 'Рогатый шлем', archer: 'Капюшон охотника', mage: 'Венец мудреца' } }] }, where: 'catacombs' },
  { id: 'medallion', title: 'Найти потерянный медальон', text: 'Медальон лежит на алтаре за запертой дверью (восток). Ключ от двери — в светящемся саркофаге оссуария.', obj: { flag: 'medallion' }, reward: { xp: 200, skillPts: 1, items: [{ slot: 'amulet', tier: 1, rarity: 2, names: { warrior: 'Амулет хранителя', archer: 'Амулет хранителя', mage: 'Амулет хранителя' } }] }, where: 'catacombs', target: 'medallion' },
  { id: 'elite', title: 'Победить элитного стража', text: 'Кража медальона пробудила Стража в Зале стражи на юге.', obj: { flag: 'eliteKilled' }, reward: { xp: 150, gold: 80, items: [{ slot: 'weapon', tier: 2, rarity: 2, names: { warrior: 'Цвайхендер стража', archer: 'Длинный лук стража', mage: 'Рунный посох стража' } }] }, where: 'catacombs', target: 'elite' },
  { id: 'reach_gate', title: 'Добраться до запечатанной двери', text: 'Запечатанные врата к востоку от Зала стражи ведут к логову Палача.', obj: { near: 'gate' }, reward: { xp: 60, potions: 3 }, where: 'catacombs', target: 'gate' },
  { id: 'open_gate', title: 'Открыть проход к боссу', text: 'Приложите медальон к печати врат.', obj: { flag: 'gateOpen' }, reward: { xp: 60, skillPts: 1 }, where: 'catacombs', target: 'gate' },
  { id: 'boss', title: 'Победить Палача Бездны', text: 'Палач Бездны ждёт на арене. Следите за его замахами — от ударов можно уклониться.', obj: { flag: 'bossKilled' }, reward: { xp: 300, gold: 150, items: [{ slot: 'weapon', epic: true }] }, where: 'catacombs', target: 'boss' },
  { id: 'return', title: 'Вернуться в деревню', text: 'После гибели Палача открылся портал домой.', obj: { enter: 'town' }, reward: { xp: 50, gold: 50 }, where: 'catacombs', target: 'portal_return' },
  { id: 'finish', title: 'Получить награду у старосты', text: 'Расскажите Эдрику о победе.', obj: { talk: 'elder' }, reward: { xp: 250, gold: 300, items: [{ slot: 'chest', tier: 3, rarity: 2, names: { warrior: 'Латы Тихого Брода', archer: 'Плащ Тихого Брода', mage: 'Облачение Тихого Брода' } }] }, where: 'town', target: 'elder' },
];

// Repeatable contracts from the village board. Progress counts only after acceptance.
export const REPEATABLE = [
  { id: 'r_kill100', title: 'Уничтожить 100 монстров', stat: 'kills', n: 100, reward: { gold: 250, xp: 300 } },
  { id: 'r_walk1000', title: 'Пройти 1000 метров', stat: 'meters', n: 1000, reward: { gold: 120, potions: 3 } },
  { id: 'r_gold1000', title: 'Собрать 1000 золота', stat: 'gold', n: 1000, reward: { gold: 200, xp: 200 } },
  { id: 'r_elite5', title: 'Убить 5 элитных противников', stat: 'elites', n: 5, reward: { gold: 300, items: [{ slot: 'weapon', tier: 2, rarity: 2 }] } },
  { id: 'r_chest10', title: 'Открыть 10 сундуков', stat: 'chests', n: 10, reward: { gold: 150, potions: 3 } },
  { id: 'r_boss', title: 'Победить босса без смерти', stat: 'bossNoDeath', n: 1, reward: { gold: 400, xp: 400, items: [{ slot: 'weapon', epic: true }] } },
];

export const DIALOG = {
  elder: {
    0: ['Путник! Хвала свету, что ты пришёл. Я — Эдрик, староста Тихого Брода.',
        'Каждую ночь из старых катакомб Ордена выходят мертвецы. Они уже забрали троих наших.',
        'Портал Ордена стоит на северо-западе, за мельницей. Спустись туда и узнай, что пробудило нежить.'],
    mid: ['Катакомбы глубоки. Если станет тяжко — возвращайся. Кузнец Горан усилит твоё оружие, а Мира продаст зелья.'],
    after_medallion: ['Медальон Ордена! Значит, печать ещё можно открыть… Но за ней — то, что Орден запер века назад.'],
    finish: ['Ты вернулся… и тьма под деревней стихла. Палач Бездны пал!',
             'Прими награду Тихого Брода. Но в глубине катакомб ещё бродит нежить — наши люди будут рады твоей помощи.',
             'Доска объявлений у площади всегда найдёт тебе работу.'],
    done: ['Тихий Брод в долгу перед тобой. Доска объявлений ждёт героев.'],
  },
  smith: { hello: ['Горан, кузнец. Нежить крепка — а сталь должна быть крепче.', 'Принеси оружие или доспех — я сделаю его лучше. Цена растёт с каждым уровнем закалки.'] },
  merchant: { hello: ['Мира, к вашим услугам! Зелья, свитки и честная цена за ваши трофеи.'] },
  trainer: { hello: ['Я Элвин, наставник Ордена. Огонь, лёд и молния подчиняются тем, кто учится.', 'Могу обучить основам магии и за плату помочь переосмыслить выбранный путь.'] },
};
