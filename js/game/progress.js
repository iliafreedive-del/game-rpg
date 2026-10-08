// Сквозная последовательность игры: что открыто и что делать дальше. Единственное место с правилами «замков».
// 1) выбрать первый навык → 2) катакомбы → 3) Старый Лес (уровень 3) → 4) Палач Бездны (уровень 6) →
// 5) Глубины / Выживание / Фьорды (после босса) → 6) Костяные пустоши (после форта Фьордов, Глава III) →
// 7) Цитадель и Морвен (Глава IV). «Летопись битв» открывается по главам вместе с этим.
import { G, bus } from './ctx.js';
import { STORY } from '../data/quests.js';

export const BOSS_LEVEL = 7;
// сборка 47: уровни зон «как в Diablo». У каждой локации свой коридор уровней врагов [от, до]: внутри коридора враг
// всегда на 1 уровень выше героя (≈ +20–30% к здоровью и урону), ниже «от» не опускается (слабым героем рано не пройти),
// выше «до» не растёт — перекачанный герой получает всё меньше опыта (killXP в loot.js) и уходит дальше.
// Катакомбы до первого прохождения — 1–7 (комната задаёт «от»), Хранитель 6–8, Палач 7–10; Глубины и походы — от уровня этажа/поля до него +3.
export const CATA_MAX = 7;
export const bandLevel = (min, max) => Math.max(min, Math.min(max, ((G.profile && G.profile.level) || 1) + 1));
const F = () => G.profile.story.flags;
export const hasSkill = () => G.profile.slots.some(Boolean) || Object.keys(G.profile.skills).length > 0;
const forts = realm => { const S = G.profile.wild && G.profile.wild[realm]; return S && S.stat ? S.stat.forts || 0 : 0; };

// сборка 47: первые шаги без «ускорителей». Пока герой не прошёл Летопись и не вернулся с золотом к Элвину,
// усиления у Элвина закрыты ('upg'); пока не купил первое зелье у Миры — закрыты Источник силы, Хозяйка Колеса,
// реклама за награды и покупки за рубли ('extra'), Мира — до своего шага ('shop'). Иначе игрок сразу всё вкачивает и ломает баланс.
const stIdx = id => STORY.findIndex(q => q.id === id);
export function earlyLock(kind) {
  const s = G.profile && G.profile.story; if (!s) return false;
  const need = kind === 'upg' ? 'hw_elvin' : kind === 'shop' ? 'meet_merchant' : 'elder_task';
  return s.stage < stIdx(need);
}
// сборка 55: первый урок у Элвина платный (55 зол.): после него остаётся ровно на первое зелье здоровья у Миры (30).
// Пока зелье не куплено, другие покупки, после которых на зелье не хватит, не проходят — шаг обучения не застрянет.
export const POTION_RESERVE = 30;
export const firstLessonCost = () => !G.profile || Object.values(G.profile.skills || {}).some(Boolean) ? 0 : Math.max(0, Math.min(55, (G.profile.gold | 0) - POTION_RESERVE));
export function potionReserve(cost) {   // true — покупка запрещена (и показана подсказка)
  const s = G.profile && G.profile.story, q = s && STORY[s.stage]; if (!q || (q.id !== 'learn_skill' && q.id !== 'meet_merchant')) return false;
  if (q.id === 'meet_merchant' && (G.profile.gold | 0) - cost >= POTION_RESERVE) return false;
  bus.emit('toast', q.id === 'learn_skill' ? { text: 'Сначала первый урок у Элвина', sub: 'Золото — на урок и на зелье здоровья', kind: 'warn' } : { text: 'Сначала зелье здоровья у Миры', sub: 'Это золото — на зелье', kind: 'warn' });
  bus.emit('sfx', 'deny'); return true;
}
let lockT = 0;
export function lockToast(kind) {
  if (Date.now() - lockT < 2000) return; lockT = Date.now();
  bus.emit('toast', { text: kind === 'upg' ? 'Усиления откроются после Летописи битв' : 'Откроется чуть позже', sub: 'Сначала пройдите обучение — идите по стрелке', kind: 'warn' }); bus.emit('sfx', 'deny');
}
// null — можно, иначе { text, sub }
export function gate(name, extra) {
  const P = G.profile;
  switch (name) {
    case 'catacombs': return hasSkill() ? null : { text: 'Сначала выберите навык', sub: 'Поговорите с наставником в деревне (у него значок «+») и выучите первое умение' };
    case 'temple': return null;   // Разрушенный храм (портал с руками): открыт сразу со 2 уровня (уровень проверяет портал)
    case 'forest': return !hasSkill() ? { text: 'Сначала выберите навык', sub: 'Наставник в деревне учит первым умениям' } : !F().medallion && !P.world.hasMedallion ? { text: 'Лес пока закрыт', sub: 'Принесите старосте Амулет хранителя из катакомб — он откроет тропу в лес' } : null;
    case 'bones': return !F().bossKilled ? { text: 'Пустоши закрыты', sub: 'Сначала победите Палача Бездны в катакомбах' } : forts('fjord') < 1 ? { text: 'Костяные пустоши закрыты', sub: 'Сначала отбейте форт ярла во Фьордах — умирающий ётун расскажет, где четвёртая печать' } : null;
    case 'fjord': return !F().bossKilled ? { text: 'Фьорды закрыты', sub: 'Сначала победите Палача Бездны в катакомбах' } : forts('forest') < 1 ? { text: 'Фьорды закрыты', sub: 'Сначала отбейте разбойничий острог в Старом Лесу' } : null;
    case 'depths': return F().bossKilled ? null : { text: 'Пока закрыто', sub: 'Сначала победите Палача Бездны в катакомбах' };
    case 'survival': return F().bossKilled || !P.survIntro ? null : { text: 'Староста: «Портал Жатвы не удержать дольше трёх минут»', sub: 'Он откроется снова после победы над Палачом Бездны в катакомбах' };   // сборка 47: один забег-знакомство до Палача
    case 'bossgate': return P.level >= BOSS_LEVEL ? null : { text: `Печать не поддаётся: нужен ${BOSS_LEVEL} уровень`, sub: `У вас ${P.level}. Наберите силу в катакомбах и Старом Лесу, улучшите вещи у кузнеца` };
    case 'hw': { const s = extra | 0;
      if (!hasSkill()) return { text: 'Сначала выберите навык у наставника' };
      if (s > 10 && !F().bossKilled) return { text: 'Этап закрыт', sub: 'Этапы с 11-го — после победы над Палачом Бездны в катакомбах' };   // сборка 44: 6–10 открыты сразу (было — с 6-го)
      if (s > 30 && forts('forest') < 1) return { text: 'Глава «Старый Лес» закрыта', sub: 'Отбейте острог в Старом Лесу' };
      if (s > 60 && forts('fjord') < 1) return { text: 'Глава «Фьорды» закрыта', sub: 'Отбейте форт во Фьордах' };
      if (s > 90 && !(P.depths && P.depths.best >= 5)) return { text: 'Глава «Пепельные скалы» закрыта', sub: 'Дойдите до 5 этажа Глубин' };
      return null; }
  }
  return null;
}
// Текст «что делать дальше» для подсказок
export function nextStep() {
  const P = G.profile;
  if (!hasSkill()) return 'Выберите первый навык у наставника';
  if (!F().medallion && !P.world.hasMedallion) return 'Катакомбы: ключ → дверь → победить Хранителя → амулет старосте';
  if (!F().bossKilled) return P.level < BOSS_LEVEL ? `Прокачайтесь до ${BOSS_LEVEL} уровня (катакомбы, Старый Лес)` : 'Победите Палача Бездны';
  if (forts('forest') < 1) return 'Отбейте острог в Старом Лесу';
  if (forts('fjord') < 1) return 'Отбейте форт во Фьордах';
  if (forts('bones') < 1) return 'Костяные пустоши: дойдите до руин и победите вождя';
  return 'Идите глубже: Глубины, Жатва Бездны, Цитадель';
}
