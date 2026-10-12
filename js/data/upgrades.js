// Gold upgrades bought from NPCs (endless gold sink, «Разрыв»-style small visible steps).
// сборка 47: дороже (герой к 8-му уровню успевал взять +17 силы удара), Меткость (крит) — только за осколки Бездны ◆
export const UPGRADES = {
  dmg:  { name: 'Сила удара', icon: '⚔', step: 4, step2: 2, unit: '%', cap0: 40, max: 100, base: 60, mul: 1.168, fmt: l => `+${upgVal('dmg', l)}% урона (оружия и заклинаний)` },
  hp:   { name: 'Крепость', icon: '♥', step: 12, step2: 30, unit: '', cap0: 40, max: 100, base: 45, mul: 1.154, fmt: l => `+${upgVal('hp', l)} здоровья` },
  crit: { name: 'Меткость', icon: '✷', step: 0.6, step2: 0.3, unit: '%', cap0: 25, max: 75, shards: true, fmt: l => `+${upgVal('crit', l).toFixed(1)}% шанса крита` },
  mp:   { name: 'Запас маны', icon: '✦', step: 10, step2: 10, unit: '', cap0: 30, max: 100, base: 50, mul: 1.147, fmt: l => `+${upgVal('mp', l)} маны и +${(upgVal('mp', l) / 100).toFixed(1)} маны/с` },   // П27: мана за золото, растёт по уровням
  aps:  { name: 'Проворство', icon: '⚡', step: 2, step2: 1, unit: '%', cap0: 20, max: 50, base: 150, mul: 1.182, fmt: l => `+${upgVal('aps', l)}% скорости атаки` },
};
// сборка 66: усиления растут до 100-го уровня. До cap0 — как было; дальше потолок = уровень героя (не выше max),
// ступень вдвое слабее (step2), цена растёт линейно: +5% от цены последней «старой» ступени за каждую следующую
export const upgVal = (id, l) => { const U = UPGRADES[id]; return +(U.step * Math.min(l, U.cap0) + U.step2 * Math.max(0, l - U.cap0)).toFixed(1); };
export const upgMax = (id, P) => { const U = UPGRADES[id]; return Math.min(U.max, Math.max(U.cap0, (P && P.level) || 1)); };
// после правок 3 (тред «перед релизом»): рост цены за ступень на 30% ниже (×1,24 → ×1,168 и т. д.) — «Сила удара» до 40 стоит ≈180 тыс. вместо 1,36 млн
// цена уровня: золото, у Меткости — осколки Бездны (2, 3, 4… за уровень)
export const upgCost = (id, l) => { const U = UPGRADES[id]; if (U.shards) return 2 + l; const k = Math.min(l, U.cap0); return Math.round(U.base * Math.pow(U.mul, k) * (1 + 0.05 * Math.max(0, l - U.cap0))); };
export const upgHave = (P, id) => UPGRADES[id].shards ? (P.shards || 0) : P.gold;

// Citadel rooms: unlock with gold + Abyss shards (shards drop randomly from elites, bosses, chests).
export const ROOMS = {
  altar:    { name: 'Алтарь золота', lvl: 3, gold: 300, shards: 0, desc: 'Копит золото, пока вас нет (до 8 часов). Чем выше уровень алтаря — тем больше.' },
  trial:    { name: 'Зал испытаний', lvl: 5, gold: 800, shards: 5, desc: 'Бои со стражами без спуска в подземелье. Печати испытаний восстанавливаются сами.' },
  treasury: { name: 'Сокровищница Бездны', lvl: 7, gold: 1500, shards: 10, desc: 'Сундуки за осколки: редкие и эпические вещи вашего класса.' },
  trophy:   { name: 'Зал трофеев', lvl: 9, gold: 2500, shards: 20, desc: 'Трофеи дают постоянный бонус к урону и золоту.' },
};

// Citadel decor (Sims-lite): buy an item for a glowing socket; every piece gives a small permanent bonus.
export const DECOR = {
  rug:         { name: 'Ковёр Ордена', spr: 'rug', gold: 120, shards: 0, bonus: { hp: 10 }, txt: '+10 здоровья' },
  banner:      { name: 'Знамя Ордена', spr: 'banner', gold: 200, shards: 0, bonus: { dmg: 2 }, txt: '+2% урона' },
  bookshelf:   { name: 'Книжный шкаф', spr: 'bookshelf', gold: 350, shards: 2, bonus: { xp: 4 }, txt: '+4% опыта' },
  weapon_rack: { name: 'Стойка оружия', spr: 'weapon_rack', gold: 450, shards: 3, bonus: { critDmg: 6 }, txt: '+6% крит. урона' },
  crystals:    { name: 'Кристаллы Бездны', spr: 'crystals', gold: 600, shards: 6, bonus: { regen: 1 }, txt: '+1 маны/с' },
  statue:      { name: 'Статуя героя', spr: 'statue', gold: 900, shards: 5, bonus: { hp: 40 }, txt: '+40 здоровья' },
  throne:      { name: 'Трон владыки', spr: 'throne', gold: 1600, shards: 10, bonus: { gold: 6 }, txt: '+6% золота' },
};
export const SOCKETS = [
  { id: 'h1', room: 'hall', x: 13.2, y: 22.5 }, { id: 'h2', room: 'hall', x: 20.8, y: 22.5 }, { id: 'h3', room: 'hall', x: 13.2, y: 24.8 }, { id: 'h4', room: 'hall', x: 20.8, y: 24.8 },
  { id: 'a1', room: 'altar', x: 3.2, y: 19.4 }, { id: 'a2', room: 'altar', x: 8.4, y: 25.6 },
  { id: 't1', room: 'trial', x: 30.5, y: 15.8 }, { id: 't2', room: 'trial', x: 30.5, y: 28.2 },
  { id: 'r1', room: 'treasury', x: 4.2, y: 8.8 }, { id: 'r2', room: 'treasury', x: 11.8, y: 8.8 },
  { id: 'p1', room: 'trophy', x: 22.2, y: 8.8 }, { id: 'p2', room: 'trophy', x: 29.8, y: 8.8 },
];
