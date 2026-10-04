// Skill tree: 5 branches, talent grid like WoW. Node kinds: passive | active.
// Every value here is read by the combat code (see game/combat.js, game/stats.js).
export const BRANCHES = [
  { id: 'sword', name: 'Меч', color: '#d9b77a', icon: 'sword' },
  { id: 'bow', name: 'Лук', color: '#9bd06c', icon: 'bow' },
  { id: 'fire', name: 'Огонь', color: '#ff8a3c', icon: 'fire' },
  { id: 'ice', name: 'Лёд', color: '#7cd3ff', icon: 'ice' },
  { id: 'light', name: 'Молния', color: '#b9a4ff', icon: 'light' },
];

export const SKILLS = {
  // ---- Меч
  blade_mastery: { b: 'sword', name: 'Мастерство клинка', max: 5, kind: 'passive',
    desc: r => `+${r * 8}% к урону ближнего боя, +${r * 3}% к скорости атаки в ближнем бою.` },
  whirlwind: { b: 'sword', name: 'Вихрь', max: 5, kind: 'active', mana: 12, cd: 4, weapon: 'melee',
    desc: r => `Круговой удар: ${140 + r * 20}% урона оружия всем врагам в радиусе 2,2 м и отбрасывание. Мана 12, перезарядка 4 с.` },
  cleave: { b: 'sword', name: 'Рассекающий удар', max: 3, kind: 'passive',
    desc: r => `Обычные удары задевают соседних врагов в дуге на ${30 + r * 20}% урона.` },
  bloodletting: { b: 'sword', name: 'Кровопускание', max: 3, kind: 'passive',
    desc: r => `Критические удары в ближнем бою вызывают кровотечение: ${r * 30}% урона удара за 3 с.` },
  crush: { b: 'sword', name: 'Сокрушение', max: 1, kind: 'passive',
    desc: () => `Каждый 4-й удар в ближнем бою — сокрушительный: 250% урона, ударная волна 2 м и оглушение на 1 с.` },
  leap: { b: 'sword', name: 'Сокрушающий прыжок', max: 5, kind: 'active', mana: 14, cd: 7, weapon: 'melee',
    desc: r => `Прыжок к врагу и удар о землю: ${180 + r * 30}% урона оружия в радиусе 2,6 м, оглушение 1 с. Мана 14, перезарядка 7 с.` },
  warcry: { b: 'sword', name: 'Боевой клич', max: 5, kind: 'active', mana: 10, cd: 14, weapon: 'any',
    desc: r => `+${25 + r * 5}% ко всему урону на 8 с, враги вокруг замедлены. Мана 10, перезарядка 14 с.` },
  // ---- Лук
  marksman: { b: 'bow', name: 'Меткость', max: 5, kind: 'passive',
    desc: r => `+${r * 8}% к урону луком, +${r * 2}% к шансу критического удара с луком.` },
  volley: { b: 'bow', name: 'Залп', max: 5, kind: 'active', mana: 10, cd: 3, weapon: 'bow',
    desc: r => `Веер из ${5 + (r >> 1)} стрел, каждая наносит ${60 + r * 10}% урона. Мана 10, перезарядка 3 с. Нужен лук.` },
  pierce: { b: 'bow', name: 'Пронзающие стрелы', max: 3, kind: 'passive',
    desc: r => `Стрелы пробивают ${r} ${r === 1 ? 'врага' : 'врагов'} и летят дальше.` },
  quickstring: { b: 'bow', name: 'Быстрая тетива', max: 3, kind: 'passive',
    desc: r => `+${r * 10}% к скорости атаки луком.` },
  explosive: { b: 'bow', name: 'Разрывная стрела', max: 1, kind: 'passive',
    desc: () => `25% шанс, что стрела взорвётся: 70% урона всем в радиусе 1,8 м.` },
  pierce_shot: { b: 'bow', name: 'Пронзающий выстрел', max: 5, kind: 'active', mana: 10, cd: 3, weapon: 'bow',
    desc: r => `Сияющая стрела пробивает всех врагов на линии: ${220 + r * 30}% урона. Мана 10, перезарядка 3 с.` },
  arrow_rain: { b: 'bow', name: 'Дождь стрел', max: 5, kind: 'active', mana: 18, cd: 6, weapon: 'bow',
    desc: r => `Стрелы 1,5 с падают на область 3 м: 10 залпов по ${40 + r * 8}% урона. Мана 18, перезарядка 6 с.` },
  // ---- Огонь
  heat: { b: 'fire', name: 'Жар', max: 5, kind: 'passive',
    desc: r => `+${r * 10}% к урону огнём.` },
  fireball: { b: 'fire', name: 'Огненный шар', max: 5, kind: 'active', mana: 12, cd: 1.4, weapon: 'any', elem: 'fire',
    desc: r => `Шар огня: ${7 + r * 4} урона (× сила заклинаний) и взрыв 1,4 м. Поджигает: ещё 40% урона за 3 с. Мана 12, перезарядка 1,4 с.` },
  ignite_plus: { b: 'fire', name: 'Усиленный поджог', max: 3, kind: 'passive',
    desc: r => `Урон поджога +${r * 50}%, длительность +${r} с.` },
  fire_spread: { b: 'fire', name: 'Распространение огня', max: 3, kind: 'passive',
    desc: r => `Горящие враги каждую секунду с шансом ${r * 25}% поджигают соседей в радиусе 2 м.` },
  burn_explode: { b: 'fire', name: 'Взрыв горящих', max: 1, kind: 'passive',
    desc: () => `Горящий враг при смерти взрывается: 80% урона огненного шара в радиусе 2 м и поджог.` },
  meteor: { b: 'fire', name: 'Метеор', max: 5, kind: 'active', mana: 22, cd: 5, weapon: 'any', elem: 'fire',
    desc: r => `С неба падает метеор: ${22 + r * 10} урона в 2,3 м и горящая земля на 3 с. Мана 22, перезарядка 5 с.` },
  // ---- Лёд
  cold: { b: 'ice', name: 'Холод', max: 5, kind: 'passive',
    desc: r => `+${r * 10}% к урону льдом.` },
  ice_shard: { b: 'ice', name: 'Ледяной снаряд', max: 5, kind: 'active', mana: 9, cd: 1.0, weapon: 'any', elem: 'cold',
    desc: r => `Осколок льда: ${6 + r * 3} урона, замедление 30% и 1 заряд холода. 3 заряда — заморозка на 1,5 с. Мана 9, перезарядка 1 с.` },
  deep_cold: { b: 'ice', name: 'Глубокий холод', max: 3, kind: 'passive',
    desc: r => `Замедление +${r * 10}%, заряды холода держатся на ${r} с дольше, заморозка +${r * 0.3} с.` },
  ice_armor: { b: 'ice', name: 'Ледяная броня', max: 3, kind: 'passive',
    desc: r => `+${r * 12} к защите. Враги, бьющие вас вблизи, получают заряд холода.` },
  shatter: { b: 'ice', name: 'Раскалывание', max: 1, kind: 'passive',
    desc: () => `Замороженные враги получают +50% урона; убитый замороженный враг разлетается 4 осколками.` },
  frost_nova: { b: 'ice', name: 'Ледяная нова', max: 5, kind: 'active', mana: 16, cd: 6, weapon: 'any', elem: 'cold',
    desc: r => `Взрыв холода вокруг: ${8 + r * 4} урона в 3,6 м и 2 заряда холода (почти заморозка). Мана 16, перезарядка 6 с.` },
  // ---- Молния
  static: { b: 'light', name: 'Статика', max: 5, kind: 'passive',
    desc: r => `+${r * 10}% к урону молнией.` },
  chain: { b: 'light', name: 'Цепная молния', max: 5, kind: 'active', mana: 16, cd: 2.5, weapon: 'any', elem: 'light',
    desc: r => `Разряд: ${8 + r * 4} урона, перескакивает на ${2 + (r >> 1)} ближайших врагов (−25% за прыжок). Мана 16, перезарядка 2,5 с.` },
  conduct: { b: 'light', name: 'Проводимость', max: 3, kind: 'passive',
    desc: r => `Молния оставляет «шок»: враг получает +${r * 8}% урона от всего в течение 3 с.` },
  overload: { b: 'light', name: 'Перегрузка', max: 3, kind: 'passive',
    desc: r => `${r * 10}% шанс при любом ударе выпустить искру в ближайшего врага (50% урона молнией).` },
  thunder: { b: 'light', name: 'Грозовой разряд', max: 1, kind: 'active', mana: 25, cd: 8, weapon: 'any', elem: 'light',
    desc: () => `Через 0,4 с молнии бьют всех врагов в радиусе 5 м: 200% урона цепной молнии. Мана 25, перезарядка 8 с.` },
};
// ---- Talent grid (как в WoW). В каждой ветке сверху — активное умение; от него открываются пассивные;
// вложив в них очки, открываешь следующее активное умение, и так до самого низа ветки.
//   [ряд, колонка (0–2), уровень героя для 1-го ранга, требования [[навык, ранг], …]]
// Каждый следующий ранг требует на 1 уровень героя больше: 1-й ранг — lvl, 2-й — lvl+1 …
const TREE = {
  // Меч: Вихрь → Мастерство клинка + Рассекающий удар → Сокрушающий прыжок → Кровопускание → Боевой клич → Сокрушение
  whirlwind: [0, 1, 1], blade_mastery: [1, 0, 2, [['whirlwind', 1]]], cleave: [1, 2, 3, [['whirlwind', 1]]],
  leap: [2, 1, 5, [['blade_mastery', 2], ['cleave', 1]]], bloodletting: [3, 1, 7, [['leap', 1]]],
  warcry: [4, 1, 9, [['bloodletting', 1]]], crush: [5, 1, 12, [['warcry', 1]]],
  // Лук: Залп → Меткость + Быстрая тетива → Пронзающий выстрел → Пронзающие стрелы → Дождь стрел → Разрывная стрела
  volley: [0, 1, 1], marksman: [1, 0, 2, [['volley', 1]]], quickstring: [1, 2, 3, [['volley', 1]]],
  pierce_shot: [2, 1, 5, [['marksman', 2], ['quickstring', 1]]], pierce: [3, 1, 7, [['pierce_shot', 1]]],
  arrow_rain: [4, 1, 9, [['pierce', 1]]], explosive: [5, 1, 12, [['arrow_rain', 1]]],
  // Огонь: Огненный шар → Жар + Усиленный поджог → Метеор → Распространение огня + Взрыв горящих
  fireball: [0, 1, 1], heat: [1, 0, 2, [['fireball', 1]]], ignite_plus: [1, 2, 3, [['fireball', 1]]],
  meteor: [2, 1, 5, [['heat', 2], ['ignite_plus', 1]]], fire_spread: [3, 0, 7, [['meteor', 1]]], burn_explode: [3, 2, 9, [['meteor', 1]]],
  // Лёд: Ледяной снаряд → Холод + Глубокий холод → Ледяная нова → Ледяная броня + Раскалывание
  ice_shard: [0, 1, 1], cold: [1, 0, 2, [['ice_shard', 1]]], deep_cold: [1, 2, 3, [['ice_shard', 1]]],
  frost_nova: [2, 1, 5, [['cold', 2], ['deep_cold', 1]]], ice_armor: [3, 0, 7, [['frost_nova', 1]]], shatter: [3, 2, 9, [['frost_nova', 1]]],
  // Молния: Цепная молния → Статика + Проводимость → Грозовой разряд → Перегрузка
  chain: [0, 1, 1], static: [1, 0, 2, [['chain', 1]]], conduct: [1, 2, 3, [['chain', 1]]],
  thunder: [2, 1, 6, [['static', 2], ['conduct', 1]]], overload: [3, 1, 8, [['thunder', 1]]],
};
for (const [id, [row, col, lvl, req]] of Object.entries(TREE)) Object.assign(SKILLS[id], { row, col, lvl, req: req || [] });
export const TREE_ROWS = 6;
// hero level needed for the next rank (rank — current rank, 0 = not learned)
export const rankLevel = (id, rank) => SKILLS[id].lvl + rank;
export const SKILL_IDS = Object.keys(SKILLS);
export const ACTIVE_IDS = SKILL_IDS.filter(k => SKILLS[k].kind === 'active');
export const branchOf = id => SKILLS[id].b;
