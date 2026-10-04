// Сквозная последовательность игры: что открыто и что делать дальше. Единственное место с правилами «замков».
// 1) выбрать первый навык → 2) катакомбы → 3) Старый Лес (уровень 3) → 4) Палач Бездны (уровень 6) →
// 5) Глубины / Выживание / Фьорды (после босса) → 6) «Летопись битв» открывается по главам вместе с этим.
import { G } from './ctx.js';

export const BOSS_LEVEL = 7;
const F = () => G.profile.story.flags;
export const hasSkill = () => G.profile.slots.some(Boolean) || Object.keys(G.profile.skills).length > 0;
const forts = realm => { const S = G.profile.wild && G.profile.wild[realm]; return S && S.stat ? S.stat.forts || 0 : 0; };

// null — можно, иначе { text, sub }
export function gate(name, extra) {
  const P = G.profile;
  switch (name) {
    case 'catacombs': return hasSkill() ? null : { text: 'Сначала выберите навык', sub: 'Поговорите с наставником в деревне (у него значок «+») и выучите первое умение' };
    case 'forest': return !hasSkill() ? { text: 'Сначала выберите навык', sub: 'Наставник в деревне учит первым умениям' } : !F().medallion && !P.world.hasMedallion ? { text: 'Лес пока закрыт', sub: 'Принесите старосте Амулет хранителя из катакомб — он откроет тропу в лес' } : null;
    case 'fjord': return !F().bossKilled ? { text: 'Фьорды закрыты', sub: 'Сначала победите Палача Бездны в катакомбах' } : forts('forest') < 1 ? { text: 'Фьорды закрыты', sub: 'Сначала отбейте разбойничий острог в Старом Лесу' } : null;
    case 'depths': case 'survival': return F().bossKilled ? null : { text: 'Пока закрыто', sub: 'Сначала победите Палача Бездны в катакомбах' };
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
  return 'Идите глубже: Глубины, Жатва Бездны, Цитадель';
}
