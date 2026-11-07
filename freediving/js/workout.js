// Тренировка дня — как в фитнес-приложении: программа по уровню, дни на суше и в бассейне, серия дней.
import * as S from './store.js';

// Элементы тренировки. dur — секунды (таймер), reps — подпись, vis — что показывать
export const ITEMS = {
  breathup: { title: 'Раздышка животом', dur: 180, desc: 'Лёжа или сидя. Вдох носом 4 с — живот вперёд, выдох 8 с — живот внутрь. Плечи неподвижны.', vis: { anat: 'breathe', anim: 'float' } },
  fullbreath: { title: 'Полный вдох ×3', dur: 75, desc: 'Выдох — живот — рёбра — грудь. Подержите 5 секунд и мягко выдохните. Плечи не поднимаются.', vis: { anat: 'full', anim: 'float' } },
  side: { title: 'Боковые наклоны', dur: 60, desc: 'Рука над головой, наклон в сторону на выдохе. Растягиваются межрёберные мышцы — рёбрам легче раскрываться на вдохе.', vis: { anim: 'dry', kind: 'side' } },
  twist: { title: 'Скрутки грудного отдела', dur: 60, desc: 'Таз неподвижен, поворачивается грудная клетка. Медленно, на выдохе.', vis: { anim: 'dry', kind: 'twist' } },
  overhead: { title: 'Вытяжение вверх на вдохе', dur: 60, desc: 'Руки вверх в «стрелу», полный вдох, потянитесь макушкой. Выдох — руки вниз.', vis: { anim: 'dry', kind: 'overhead' } },
  neck: { title: 'Мягкая шея', dur: 60, desc: 'Наклоны и повороты головы без рывков. Свободная шея — лёгкая продувка.', vis: { anim: 'dry', kind: 'neck' } },
  diaphragm: { title: 'Растяжка диафрагмы', dur: 90, desc: 'Только на суше. Полный выдох, задержка на выдохе 5–8 с: «втяните» живот под рёбра, как будто делаете вдох с закрытым горлом. Отпустите, вдох. 5 повторов.', vis: { anim: 'dry', kind: 'uddiyana' } },
  frenzel: { title: 'Френзель на суше', dur: 90, desc: 'Зажмите нос, закройте голосовую щель. Кончик языка к зубам, корень языка — вверх-назад, как «к». Почувствуйте мягкий щелчок в ушах. 15–20 повторов, без силы.', vis: { anim: 'dry', kind: 'frenzel', anat: 'frenzel' } },
  relax: { title: 'Сканирование тела', dur: 180, desc: 'Лягте. Пройдите вниманием от лба к стопам, отпуская каждую часть: лоб, челюсть, шея, плечи, руки, живот, ноги. Дыхание спокойное.', vis: { anat: 'reflex', anim: 'static' } },
  recovery: { title: 'Восстановительное дыхание ×5', dur: 60, desc: 'Короткий выдох, быстрый вдох, задержать 1–2 с с лёгким давлением. Отработайте как привычку.', vis: { anat: 'recovery', anim: 'surface', at: 9 } },
  'table:easy': { title: 'Мягкая пирамида', table: 'easy', desc: 'Короткие задержки и полный отдых. Только на суше, лёжа.', vis: { anat: 'contractions', anim: 'static' } },
  'table:co2': { title: 'CO₂-таблица', table: 'co2', desc: 'Задержка одна и та же, отдых сокращается. Позывы — нормально, расслабляйте живот. Только на суше.', vis: { anat: 'contractions', anim: 'static' } },
  'table:o2': { title: 'O₂-таблица', table: 'o2', desc: 'Отдых одинаковый, задержка растёт. Не чаще 1–2 раз в неделю, не в один день с CO₂. Только на суше.', vis: { anat: 'contractions', anim: 'static' } },
};
// Элементы для бассейна — отмечаются галочкой
export const POOL = {
  'p:crawl': { title: 'Разминка кролем 200 м', ex: 'crawl' },
  'p:breast': { title: 'Брас с длинным скольжением 200 м', ex: 'breast' },
  'p:glide': { title: 'Скольжение стрелой × 6', ex: 'glide' },
  'p:duck': { title: 'Дак-дайв без ударов × 8', ex: 'duckdrill' },
  'p:kicks': { title: '25 м на минимум ударов × 4', ex: 'fewkicks' },
  'p:dnf': { title: 'Брас под водой: гребок — скольжение 4 × 25 м', ex: 'dnfdrill' },
  'p:scull': { title: 'Скуллинг 4 × 30 с', ex: 'sculldrill' },
  'p:static': { title: 'Статика у бортика с партнёром × 3', ex: 'static' },
  'p:series': { title: 'Серии 6 × 25 м, отдых 2:00 → 1:15', ex: 'series' },
  'p:ladder': { title: 'Лестница 25-50-75-50-25', ex: 'ladder' },
  'p:protocol': { title: 'Протокол после каждого ныряния', ex: 'protocol' },
};

const DAYS = {
  novice: [
    { title: 'Дыхание и подвижность', place: 'суша', items: ['breathup', 'side', 'twist', 'overhead', 'diaphragm', 'fullbreath', 'relax'] },
    { title: 'Первая пирамида', place: 'суша', items: ['breathup', 'frenzel', 'table:easy', 'recovery'] },
    { title: 'Бассейн: техника', place: 'бассейн', items: ['p:crawl', 'p:glide', 'p:duck', 'p:kicks', 'p:protocol'] },
    { title: 'Лёгкий день', place: 'суша', items: ['neck', 'side', 'relax'] },
    { title: 'CO₂ и уши', place: 'суша', items: ['breathup', 'diaphragm', 'frenzel', 'table:co2', 'relax'] },
    { title: 'Бассейн: DNF и статика', place: 'бассейн', items: ['p:breast', 'p:dnf', 'p:scull', 'p:static', 'p:protocol'] },
    { title: 'Отдых и расслабление', place: 'суша', items: ['relax', 'fullbreath'] },
  ],
  mid: [
    { title: 'CO₂ + подвижность', place: 'суша', items: ['breathup', 'side', 'twist', 'diaphragm', 'table:co2', 'relax'] },
    { title: 'Бассейн: серии', place: 'бассейн', items: ['p:crawl', 'p:duck', 'p:series', 'p:protocol'] },
    { title: 'Френзель и шея', place: 'суша', items: ['neck', 'frenzel', 'fullbreath', 'relax'] },
    { title: 'O₂-таблица', place: 'суша', items: ['breathup', 'overhead', 'table:o2', 'recovery'] },
    { title: 'Бассейн: DNF', place: 'бассейн', items: ['p:breast', 'p:dnf', 'p:scull', 'p:static', 'p:protocol'] },
    { title: 'Отдых', place: 'суша', items: ['relax'] },
  ],
  adv: [
    { title: 'CO₂ длинная', place: 'суша', items: ['breathup', 'diaphragm', 'side', 'table:co2', 'relax'] },
    { title: 'Бассейн: лестница', place: 'бассейн', items: ['p:crawl', 'p:duck', 'p:ladder', 'p:protocol'] },
    { title: 'Подвижность грудной клетки', place: 'суша', items: ['side', 'twist', 'overhead', 'diaphragm', 'frenzel', 'relax'] },
    { title: 'O₂ и восстановление', place: 'суша', items: ['breathup', 'table:o2', 'recovery'] },
    { title: 'Бассейн: серии и DNF', place: 'бассейн', items: ['p:series', 'p:dnf', 'p:static', 'p:protocol'] },
    { title: 'Отдых', place: 'суша', items: ['relax'] },
  ],
};
export const LEVELS = { novice: 'Новичок', mid: 'Любитель', adv: 'Спортсмен' };

export function program(level) { return DAYS[level] || DAYS.novice; }
export function todayWorkout() {
  const s = S.load();
  const p = program(s.level);
  const k = s.workouts.done % p.length;
  return { ...p[k], index: k, of: p.length };
}
export function itemInfo(id) { return ITEMS[id] ? { id, ...ITEMS[id], pool: false } : { id, ...POOL[id], pool: true }; }
export function duration(w) {
  const pb = S.load().pb || 60;
  return w.items.reduce((a, id) => {
    const it = itemInfo(id);
    if (it.pool) return a + 6 * 60;
    if (it.table) return a + (it.table === 'easy' ? 6 * 120 + pb * 2.7 : it.table === 'co2' ? 8 * pb * 0.5 + 540 : 960 + pb * 4.8);
    return a + (it.dur || 60);
  }, 0);
}
export function complete(w) {
  const s = S.load();
  s.workouts.done++;
  S.save();
  S.markDay();
  S.addHistory('workout', w.title, { items: w.items.length });
}
