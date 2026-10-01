// Skill tree: 5 branches × 5 nodes. Node kinds: passive | active.
// Every value here is read by the combat code (see game/combat.js, game/stats.js).
export const BRANCHES = [
  { id: 'sword', name: 'Меч', color: '#d9b77a', icon: 'sword' },
  { id: 'bow', name: 'Лук', color: '#9bd06c', icon: 'bow' },
  { id: 'fire', name: 'Огонь', color: '#ff8a3c', icon: 'fire' },
  { id: 'ice', name: 'Лёд', color: '#7cd3ff', icon: 'ice' },
  { id: 'light', name: 'Молния', color: '#b9a4ff', icon: 'light' },
];

// req: [nodeId, rank]; branchPts: min points spent in branch
export const SKILLS = {
  // ---- Меч
  blade_mastery: { b: 'sword', row: 0, name: 'Мастерство клинка', max: 5, kind: 'passive',
    desc: r => `+${r * 8}% к урону ближнего боя, +${r * 3}% к скорости атаки в ближнем бою.` },
  whirlwind: { b: 'sword', row: 1, name: 'Вихрь', max: 5, kind: 'active', req: ['blade_mastery', 0], mana: 12, cd: 4, weapon: 'melee',
    desc: r => `Круговой удар: ${140 + r * 20}% урона оружия всем врагам в радиусе 2,2 м и отбрасывание. Мана 12, перезарядка 4 с.` },
  cleave: { b: 'sword', row: 2, name: 'Рассекающий удар', max: 3, kind: 'passive', req: ['whirlwind', 1],
    desc: r => `Обычные удары задевают соседних врагов в дуге на ${30 + r * 20}% урона.` },
  bloodletting: { b: 'sword', row: 2, name: 'Кровопускание', max: 3, kind: 'passive', req: ['whirlwind', 1],
    desc: r => `Критические удары в ближнем бою вызывают кровотечение: ${r * 30}% урона удара за 3 с.` },
  crush: { b: 'sword', row: 3, name: 'Сокрушение', max: 1, kind: 'passive', branchPts: 7,
    desc: () => `Каждый 4-й удар в ближнем бою — сокрушительный: 250% урона, ударная волна 2 м и оглушение на 1 с.` },
  leap: { b: 'sword', row: 1, name: 'Сокрушающий прыжок', max: 5, kind: 'active', req: ['blade_mastery', 1], mana: 14, cd: 7, weapon: 'melee',
    desc: r => `Прыжок к врагу и удар о землю: ${180 + r * 30}% урона оружия в радиусе 2,6 м, оглушение 1 с. Мана 14, перезарядка 7 с.` },
  warcry: { b: 'sword', row: 2, name: 'Боевой клич', max: 5, kind: 'active', req: ['whirlwind', 1], mana: 10, cd: 14, weapon: 'any',
    desc: r => `+${25 + r * 5}% ко всему урону на 8 с, враги вокруг замедлены. Мана 10, перезарядка 14 с.` },
  // ---- Лук
  marksman: { b: 'bow', row: 0, name: 'Меткость', max: 5, kind: 'passive',
    desc: r => `+${r * 8}% к урону луком, +${r * 2}% к шансу критического удара с луком.` },
  volley: { b: 'bow', row: 1, name: 'Залп', max: 5, kind: 'active', req: ['marksman', 0], mana: 10, cd: 3, weapon: 'bow',
    desc: r => `Веер из ${5 + (r >> 1)} стрел, каждая наносит ${60 + r * 10}% урона. Мана 10, перезарядка 3 с. Нужен лук.` },
  pierce: { b: 'bow', row: 2, name: 'Пронзающие стрелы', max: 3, kind: 'passive', req: ['volley', 1],
    desc: r => `Стрелы пробивают ${r} ${r === 1 ? 'врага' : 'врагов'} и летят дальше.` },
  quickstring: { b: 'bow', row: 2, name: 'Быстрая тетива', max: 3, kind: 'passive', req: ['volley', 1],
    desc: r => `+${r * 10}% к скорости атаки луком.` },
  explosive: { b: 'bow', row: 3, name: 'Разрывная стрела', max: 1, kind: 'passive', branchPts: 7,
    desc: () => `25% шанс, что стрела взорвётся: 70% урона всем в радиусе 1,8 м.` },
  pierce_shot: { b: 'bow', row: 1, name: 'Пронзающий выстрел', max: 5, kind: 'active', req: ['marksman', 1], mana: 10, cd: 3, weapon: 'bow',
    desc: r => `Сияющая стрела пробивает всех врагов на линии: ${220 + r * 30}% урона. Мана 10, перезарядка 3 с.` },
  arrow_rain: { b: 'bow', row: 2, name: 'Дождь стрел', max: 5, kind: 'active', req: ['volley', 1], mana: 18, cd: 6, weapon: 'bow',
    desc: r => `Стрелы 1,5 с падают на область 3 м: 10 залпов по ${40 + r * 8}% урона. Мана 18, перезарядка 6 с.` },
  // ---- Огонь
  heat: { b: 'fire', row: 0, name: 'Жар', max: 5, kind: 'passive',
    desc: r => `+${r * 10}% к урону огнём.` },
  fireball: { b: 'fire', row: 1, name: 'Огненный шар', max: 5, kind: 'active', req: ['heat', 0], mana: 12, cd: 1.4, weapon: 'any', elem: 'fire',
    desc: r => `Шар огня: ${7 + r * 4} урона (× сила заклинаний) и взрыв 1,4 м. Поджигает: ещё 40% урона за 3 с. Мана 12, перезарядка 1,4 с.` },
  ignite_plus: { b: 'fire', row: 2, name: 'Усиленный поджог', max: 3, kind: 'passive', req: ['fireball', 1],
    desc: r => `Урон поджога +${r * 50}%, длительность +${r} с.` },
  fire_spread: { b: 'fire', row: 2, name: 'Распространение огня', max: 3, kind: 'passive', req: ['fireball', 1],
    desc: r => `Горящие враги каждую секунду с шансом ${r * 25}% поджигают соседей в радиусе 2 м.` },
  burn_explode: { b: 'fire', row: 3, name: 'Взрыв горящих', max: 1, kind: 'passive', branchPts: 7,
    desc: () => `Горящий враг при смерти взрывается: 80% урона огненного шара в радиусе 2 м и поджог.` },
  meteor: { b: 'fire', row: 2, name: 'Метеор', max: 5, kind: 'active', req: ['fireball', 1], mana: 22, cd: 5, weapon: 'any', elem: 'fire',
    desc: r => `С неба падает метеор: ${22 + r * 10} урона в 2,3 м и горящая земля на 3 с. Мана 22, перезарядка 5 с.` },
  // ---- Лёд
  cold: { b: 'ice', row: 0, name: 'Холод', max: 5, kind: 'passive',
    desc: r => `+${r * 10}% к урону льдом.` },
  ice_shard: { b: 'ice', row: 1, name: 'Ледяной снаряд', max: 5, kind: 'active', req: ['cold', 0], mana: 9, cd: 1.0, weapon: 'any', elem: 'cold',
    desc: r => `Осколок льда: ${6 + r * 3} урона, замедление 30% и 1 заряд холода. 3 заряда — заморозка на 1,5 с. Мана 9, перезарядка 1 с.` },
  deep_cold: { b: 'ice', row: 2, name: 'Глубокий холод', max: 3, kind: 'passive', req: ['ice_shard', 1],
    desc: r => `Замедление +${r * 10}%, заряды холода держатся на ${r} с дольше, заморозка +${r * 0.3} с.` },
  ice_armor: { b: 'ice', row: 2, name: 'Ледяная броня', max: 3, kind: 'passive', req: ['ice_shard', 1],
    desc: r => `+${r * 12} к защите. Враги, бьющие вас вблизи, получают заряд холода.` },
  shatter: { b: 'ice', row: 3, name: 'Раскалывание', max: 1, kind: 'passive', branchPts: 7,
    desc: () => `Замороженные враги получают +50% урона; убитый замороженный враг разлетается 4 осколками.` },
  frost_nova: { b: 'ice', row: 2, name: 'Ледяная нова', max: 5, kind: 'active', req: ['ice_shard', 1], mana: 16, cd: 6, weapon: 'any', elem: 'cold',
    desc: r => `Взрыв холода вокруг: ${8 + r * 4} урона в 3,6 м и 2 заряда холода (почти заморозка). Мана 16, перезарядка 6 с.` },
  // ---- Молния
  static: { b: 'light', row: 0, name: 'Статика', max: 5, kind: 'passive',
    desc: r => `+${r * 10}% к урону молнией.` },
  chain: { b: 'light', row: 1, name: 'Цепная молния', max: 5, kind: 'active', req: ['static', 0], mana: 16, cd: 2.5, weapon: 'any', elem: 'light',
    desc: r => `Разряд: ${8 + r * 4} урона, перескакивает на ${2 + (r >> 1)} ближайших врагов (−25% за прыжок). Мана 16, перезарядка 2,5 с.` },
  conduct: { b: 'light', row: 2, name: 'Проводимость', max: 3, kind: 'passive', req: ['chain', 1],
    desc: r => `Молния оставляет «шок»: враг получает +${r * 8}% урона от всего в течение 3 с.` },
  overload: { b: 'light', row: 2, name: 'Перегрузка', max: 3, kind: 'passive', req: ['chain', 1],
    desc: r => `${r * 10}% шанс при любом ударе выпустить искру в ближайшего врага (50% урона молнией).` },
  thunder: { b: 'light', row: 3, name: 'Грозовой разряд', max: 1, kind: 'active', branchPts: 7, mana: 25, cd: 8, weapon: 'any', elem: 'light',
    desc: () => `Через 0,4 с молнии бьют всех врагов в радиусе 5 м: 200% урона цепной молнии. Мана 25, перезарядка 8 с.` },
};
export const SKILL_IDS = Object.keys(SKILLS);
export const ACTIVE_IDS = SKILL_IDS.filter(k => SKILLS[k].kind === 'active');
export const branchOf = id => SKILLS[id].b;
