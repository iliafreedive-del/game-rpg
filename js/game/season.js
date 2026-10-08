// Удержание (сборка 21): путь сезона, коллекция вещей, испытание недели, «до цели».
// Путь сезона — бесплатный, на календарный месяц: 30 ступеней, очки за любую игру. Новый месяц — новый сезон (награды не сгорают:
// забранное остаётся, незабранное прошлого сезона пропадает). Коллекция — каждая впервые найденная вещь (вид × редкость от зелёной) даёт
// +0,5% к урону и здоровью навсегда. Испытание недели — особый этаж Глубин со своим правилом, рекорд времени — в таблицу Яндекса.
import { G, bus } from './ctx.js';
import { makeItem, maxRarityFor } from './items.js';
import { autoEquip } from './character.js';
import { BASES, CLASSES, RARITY } from '../data/items.js';
import { platform } from '../platform/platform.js';

// ---------------------------------------------------------------- путь сезона
export const SEASON_LEVELS = 30;
export const seasonNeed = l => 150 + 5 * l;   // очков на ступень l (1…30): весь путь ≈ 6 800 очков ≈ 70% заданий дня за ~22 дня
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const seasonId = () => { const d = new Date(); return d.getFullYear() * 100 + d.getMonth() + 1; };
export const seasonName = () => MONTHS[new Date().getMonth()];
export function season() {
  const P = G.profile, id = seasonId();
  if (!P.season || P.season.id !== id) P.season = { id, pts: 0, claimed: {} };
  return P.season;
}
export function seasonLevel() { const S = season(); let l = 0, left = S.pts; while (l < SEASON_LEVELS && left >= seasonNeed(l + 1)) { left -= seasonNeed(l + 1); l++; } return { lvl: l, into: left, need: l < SEASON_LEVELS ? seasonNeed(l + 1) : 0 }; }
export function seasonReward(l) {
  if (l % 10 === 0) return { gold: 300, potions: 5, scrolls: 2, item: l === 30 ? 3 : l === 20 ? 3 : 2, label: l === 10 ? 'Синяя вещь' : 'Золотая вещь', big: true };
  if (l % 5 === 0) return { gold: 120, potions: 3, scrolls: 1, fodder: 3, label: '3 вещи для слияния и свиток', mid: true };
  return { gold: 50, potions: l % 2 ? 1 : 0, label: 'Золото' + (l % 2 ? ' и зелье' : '') };
}
export function addSeason(n, why) {
  if (!G.profile || !(n > 0)) return; const before = seasonLevel().lvl; season().pts += n; const after = seasonLevel().lvl;
  if (after > before) { bus.emit('toast', { text: `Путь сезона: ступень ${after}!`, sub: `Награда ждёт: ${seasonReward(after).label} (меню → Путь сезона)`, kind: 'quest' }); bus.emit('sfx', 'levelup'); bus.emit('hud'); }
}
export const seasonClaimable = () => { const S = season(), L = seasonLevel().lvl; let n = 0; for (let l = 1; l <= L; l++) if (!S.claimed[l]) n++; return n; };
export function claimSeason(l) {
  const P = G.profile, S = season(); if (S.claimed[l] || seasonLevel().lvl < l) return false;
  const r = seasonReward(l); S.claimed[l] = Date.now();
  P.gold += r.gold * P.level; P.potions.hp += r.potions || 0; P.scrolls += r.scrolls || 0;
  for (let i = 0; i < (r.fodder || 0); i++) P.bag.push(makeItem({ ilvl: P.level, rarity: 0, cls: P.cls, slot: ['weapon', 'head', 'chest'][i % 3] }));
  if (r.item) { const it = makeItem({ ilvl: P.level, rarity: Math.min(r.item, Math.max(2, maxRarityFor(P.level))), cls: P.cls }); delete it.req; autoEquip(it); }
  bus.emit('toast', { text: `Сезон: награда ступени ${l}`, sub: r.label, kind: 'good' }); bus.emit('sfx', 'quest'); bus.emit('hud'); bus.emit('save'); return true;
}
// сборка 47: очки — только за задания (раньше за каждого врага: путь на месяц проходился за вечер).
// Задание дня 100, все три за день +50, вход в игру 10, недельное задание 150. При 70% заданий путь (≈6800 очков) — около 22 дней
export const SEASON_PTS = { daily: 100, dailyAll: 50, login: 10, weekly: 150 };
bus.on('dailyClaimed', () => addSeason(SEASON_PTS.daily));
bus.on('dailyAllDone', () => addSeason(SEASON_PTS.dailyAll));
bus.on('weeklyClaimed', () => addSeason(SEASON_PTS.weekly));
bus.on('loginClaimed', () => addSeason(SEASON_PTS.login));

// ---------------------------------------------------------------- коллекция
export const CODEX_PCT = 0.5;
export const codexKey = it => `${it.base}:${it.rarity}`;
export function codexBases(cls) { const C = CLASSES[cls || 'warrior']; return BASES.filter(b => ['weapon', 'head', 'chest', 'amulet'].includes(b.slot) && (!b.wt || C.weapons.includes(b.wt))); }
export function codexScan() {
  const P = G.profile; if (!P) return 0; P.codex = P.codex || {}; let added = 0;
  for (const it of [...Object.values(P.gear), ...P.bag]) if (it && it.rarity >= 1 && !P.codex[codexKey(it)]) { P.codex[codexKey(it)] = Date.now(); added++;
    bus.emit('toast', { text: `Коллекция: ${it.name}`, sub: `Новая запись (${RARITY[it.rarity].name.toLowerCase()}) — +${CODEX_PCT}% к урону и здоровью навсегда`, kind: 'item', color: RARITY[it.rarity].color }); }
  if (added) bus.emit('codexChanged');
  return added;
}
export const codexCount = P => Object.keys(P.codex || {}).length;
bus.on('itemPicked', () => setTimeout(codexScan, 0)); bus.on('merged', () => setTimeout(codexScan, 0)); bus.on('equipChanged', () => setTimeout(codexScan, 0));

// ---------------------------------------------------------------- испытание недели (Глубины)
export const WEEKLY_RULES = [
  { id: 'swift', name: 'Быстрые тени', txt: 'Враги быстрее на 30% · золото ×2', spd: 1.3, gold: 2 },
  { id: 'iron', name: 'Железная стража', txt: 'У врагов +60% здоровья · опыт ×2', hp: 1.6, xp: 2 },
  { id: 'horde', name: 'Орда', txt: 'Врагов вдвое больше · вещи падают вдвое чаще', count: 2, items: 2 },
  { id: 'fury', name: 'Ярость', txt: 'Враги бьют на 40% больнее · золото и опыт ×1,5', dmg: 1.4, gold: 1.5, xp: 1.5 },
];
export const weekNo = () => Math.floor((Date.now() / 864e5 + 3) / 7);   // неделя с понедельника
export const weeklyRule = () => WEEKLY_RULES[weekNo() % WEEKLY_RULES.length];
export function weeklyState() { const P = G.profile, w = weekNo(); if (!P.weekly || P.weekly.week !== w) P.weekly = { week: w, best: 0, done: false }; return P.weekly; }
export const weeklyFloor = lvl => Math.max(2, Math.round((lvl - 1) / 0.85));   // этаж, уровень врагов которого ≈ уровню героя
// Круги Бездны (сборка 45, после Главы IV): выбранный круг делает Глубины злее и богаче.
// Круг 0 — как раньше. Множители на круг k: HP ×1,45^k, урон ×1,28^k, золото и опыт ×(1 + 0,55k), +5k% к шансу вещи.
export const CIRCLE_MAX = 10;
export const circlesOpen = () => !!(G.profile && G.profile.storyDone);
export const circle = () => (circlesOpen() && (G.profile.circle | 0)) || 0;
export const circleHP = k => Math.pow(1.45, k), circleDmg = k => Math.pow(1.28, k), circleRew = k => 1 + 0.55 * k + 0.2 * k * k;   // сборка 49: награда догоняет риск (было линейно: на 3 круге враги ×6,4, награда ×2,65 → теперь ×4,5)
export function setCircle(k) { const P = G.profile; P.circle = Math.max(0, Math.min(CIRCLE_MAX, k | 0)); bus.emit('save'); bus.emit('hud'); }
export const rm = k => ((G.run && G.run.weekly && G.run.weekly[k]) || 1) * ((G.run && G.run.mod && G.run.mod[k]) || 1);   // + модификатор этажа (сборка 49)   // множитель правила недели в текущем забеге
export function finishWeekly(time) {
  const P = G.profile, W = weeklyState(), first = !W.done, rec = !W.best || time < W.best;
  W.done = true; if (rec) W.best = time;
  if (first) { P.gold += 200 * P.level; const it = makeItem({ ilvl: P.level + 1, rarity: Math.max(2, Math.min(3, maxRarityFor(P.level))), cls: P.cls }); delete it.req; autoEquip(it); }
  try { platform.p.setLeaderboardScore && platform.p.setLeaderboardScore('weeklyDepths', Math.round(time * 1000)); } catch { }
  return { first, rec };
}

// ---------------------------------------------------------------- «до цели»: одна ближайшая цель на главном экране
export function nextGoalLine() {
  const P = G.profile; if (!P) return '';
  const groups = (P.bag || []).reduce((m, it) => { if (!it.locked && it.rarity < 4) { const k = it.slot + ':' + it.rarity; m[k] = (m[k] || 0) + 1; } return m; }, {});
  const two = Object.entries(groups).find(([, n]) => n % 3 === 2);
  if (Object.values(groups).some(n => n >= 3)) return '⚒ Кузнец: можно слить 3 вещи в 1 лучше';
  if (two) { const [slot, r] = two[0].split(':'); return `⚒ Ещё 1 ${['серая', 'зелёная', 'синяя', 'золотая'][r]} вещь (${{ weapon: 'оружие', head: 'шлем', chest: 'доспех', amulet: 'амулет' }[slot]}) — и слияние`; }
  const s = seasonLevel(); if (s.lvl < SEASON_LEVELS) return `🏆 Сезон: ${s.into}/${s.need} до ступени ${s.lvl + 1} (${seasonReward(s.lvl + 1).label})`;
  return '';
}
