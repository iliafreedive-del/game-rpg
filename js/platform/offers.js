// Лестница платных предметов (сборка 45): предложение показывается один раз у очередной «стены»,
// где игрок застревает, и больше не всплывает — товар остаётся в лавке Ордена.
// Стена — это место, где честные пути (прокачка, кузнец, Летопись) уже нужны, а покупка их ускоряет.
// Никаких окон в бою: предложение ждёт спокойного момента (деревня, экран смерти закрыт, окон нет).
import { G, bus } from '../game/ctx.js';
import { PRODUCTS, platform } from './platform.js';
import { earlyLock } from '../game/progress.js';

// id товара → когда показывать. Первое условие, которое сработало, и показывается.
const WALLS = [
  { id: 'starter_pack', when: P => (P.stats.deaths || 0) >= 1 || P.level >= 2, why: P => (P.stats.deaths || 0) >= 1 ? 'Первая смерть — самое время усилиться' : 'Начало пути — самое время усилиться' },   // сборка 59: про смерть — только тем, кто погибал
  { id: 'guard_armor', when: P => P.level >= 6 && !P.story.flags.bossKilled, why: 'Печать к Палачу Бездны не поддаётся: нужен 7 уровень и крепкие вещи' },
  { id: 'seal_blade', when: P => gearOpen(P, 'seal_blade') && ((P.depths && P.depths.best >= 8) || forts(P, 'forest') >= 1), why: 'Дальше 8-го этажа Глубин и в фортах враги растут быстрее' },
  { id: 'magister_plate', when: P => gearOpen(P, 'magister_plate') && (forts(P, 'fjord') >= 1 || P.level >= 16), why: 'Костяные пустоши — четвёртая печать, и враги там на 12 уровне' },
  { id: 'order_weapon', when: P => gearOpen(P, 'order_weapon'), why: 'Морвен в Цитадели сильнее всего, что было до него' },
  { id: 'abyss_set', when: P => !!P.storyDone, why: 'Круги Бездны: каждый круг — враги крепче в полтора раза' },
];
// П67 (правки 2): золото и мифика в лавке — не раньше, чем их можно добыть в игре (items.js: золотые слиянием с 15 ур., выпадают с 18-го;
// мифические — слиянием с 22-го). До этого лавка предлагает синий сет. Редкость товара → минимальный уровень героя:
const GEAR_LVL = { guard_armor: 1, seal_blade: 15, magister_plate: 15, order_weapon: 22, abyss_set: 22 };
export const gearOpen = (P, id) => P.level >= (GEAR_LVL[id] || 1) && (id !== 'abyss_set' || !!P.storyDone);
// Снаряжение лавки меняется каждый день: из открытых по уровню и ещё не купленных — два товара дня (синий сет, пока он не куплен, — всегда)
export function shopGearToday(P = G.profile) {
  const day = Math.floor(Date.now() / 864e5), list = Object.keys(GEAR_LVL).filter(id => platform.p.hasProduct(id) && gearOpen(P, id) && !owned(P, id));
  const rest = list.filter(id => id !== 'guard_armor'), pick = [];
  for (let i = 0; i < rest.length && pick.length < 2; i++) pick.push(rest[(day + i) % rest.length]);
  return list.includes('guard_armor') ? ['guard_armor', ...pick.slice(0, 1)] : pick;
}
const forts = (P, realm) => { const S = P.wild && P.wild[realm]; return (S && S.stat && S.stat.forts) || 0; };
const owned = (P, id) => !!(P.iap.tx['once_' + id] || P.iap[id]);

export function wallOffer() {
  const P = G.profile; if (!P || earlyLock('extra')) return null;
  P.iap.shown = P.iap.shown || {};
  for (const w of WALLS) {
    if (P.iap.shown[w.id] || owned(P, w.id)) continue;
    if (!platform.p.hasProduct(w.id)) continue;
    if (!w.when(P)) continue;
    return { ...w, why: typeof w.why === 'function' ? w.why(P) : w.why, product: PRODUCTS[w.id] };
  }
  // сборка 47: акция каждые два уровня (с 4-го) — ближайший ещё не купленный товар лестницы, один раз на уровень
  if (P.level >= 4 && P.level % 2 === 0 && P.iap.promoLvl !== P.level) {
    const w = WALLS.find(x => x.id !== 'starter_pack' && !owned(P, x.id) && platform.p.hasProduct(x.id) && gearOpen(P, x.id));   // П67: акция не предлагает золото раньше 15 ур.
    if (w) return { ...w, promo: P.level, why: `Акция ${P.level} уровня: вещь сильнее надетой — сразу на героя`, product: PRODUCTS[w.id] };
  }
  return null;
}
export function markShown(id, promo) { const P = G.profile; P.iap.shown = P.iap.shown || {}; if (promo) P.iap.promoLvl = promo; else P.iap.shown[id] = 1; bus.emit('save'); }

// Помощь после трёх поражений подряд в одном месте: временный бонус бесплатно или за рекламу,
// чтобы новичок не бросил игру на стене (требование Яндекса 4.5: без рекламы игра проходится).
export function streakHelp(where) {
  const P = G.profile; P.help = P.help || {};
  const H = P.help; if (H.where !== where) { H.where = where; H.n = 0; }
  H.n = (H.n || 0) + 1; bus.emit('save');
  return H.n >= 3 && !(H.given === where);
}
export function helpGiven(where) { const P = G.profile; P.help = P.help || {}; P.help.given = where; P.help.n = 0; bus.emit('save'); }
