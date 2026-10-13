// Удержание (сборка 21): путь сезона, коллекция вещей, испытание недели, «до цели».
// Путь сезона — бесплатный, на календарный месяц: 30 ступеней, очки за любую игру. Новый месяц — новый сезон (награды не сгорают:
// забранное остаётся, незабранное прошлого сезона пропадает). Коллекция — каждая впервые найденная вещь (вид × редкость от зелёной) даёт
// +0,5% к урону и здоровью навсегда. Испытание недели — особый этаж Глубин со своим правилом, рекорд времени — в таблицу Яндекса.
import { G, bus } from './ctx.js';
import { makeItem, maxRarityFor, applyKindPerk } from './items.js';
import { autoEquip } from './character.js';
import { mergeGroups, mergeCost } from './economy.js';
import { BASES, CLASSES, RARITY } from '../data/items.js';
import { floorForLevel } from '../world/floorgen.js';
import { submitScore } from './ladder.js';
import { torches } from './castle.js';

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
// сборка 68: пропуск сезона в три дорожки (как в других играх): бесплатная, «Знамя сезона» и «Знамя Магистра».
// На каждой ступени у каждой дорожки своя награда, у платных — по 3–4 вещи сразу. Магистр открывает и дорожку Знамени.
// Покупка — на текущий календарный месяц: P.seasonPass['ГГГГ-М'] = 1 (Знамя) или 2 (Магистр).
export const TRACKS = ['free', 'mid', 'ult'];
const CLAIM_KEY = { free: 'claimed', mid: 'claimedM', ult: 'claimedU' };
export const PASS_PRODUCT = { mid: 'season_pass', ult: 'season_ultra' };
const passKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1); };
export const passTier = () => { const P = G.profile; return (P && P.seasonPass && P.seasonPass[passKey()]) || 0; };
export function grantPass(tier) { const P = G.profile; P.seasonPass = P.seasonPass || {}; P.seasonPass[passKey()] = Math.max(P.seasonPass[passKey()] || 0, tier); bus.emit('hud'); }
export const trackOpen = t => t === 'free' || passTier() >= (t === 'ult' ? 2 : 1);
export const seasonDaysLeft = () => { const d = new Date(), end = new Date(d.getFullYear(), d.getMonth() + 1, 1); return Math.max(1, Math.ceil((end - d) / 864e5)); };
// награда ступени l на дорожке t: список { k, n } (k: gold — множитель на уровень героя, shards, energy, hp, mp, scroll, item — n = редкость)
export function seasonReward(l, t = 'free') {
  const big = l % 10 === 0, mid = l % 5 === 0, out = [];
  if (t === 'free') {
    if (big) out.push({ k: 'item', n: l === 10 ? 2 : 3 }, { k: 'shards', n: 5 }, { k: 'gold', n: 300 }, { k: 'hp', n: 3 });
    else if (mid) out.push({ k: 'shards', n: 3 }, { k: 'gold', n: 150 }, { k: 'scroll', n: 1 }, { k: 'energy', n: 10 });
    else if (l % 2) out.push({ k: 'gold', n: 60 }, { k: 'shards', n: 1 });
    else out.push({ k: 'gold', n: 60 }, { k: 'energy', n: 5 }, { k: 'hp', n: 1 });
  } else if (t === 'mid') {
    if (big) out.push({ k: 'item', n: 3 }, { k: 'shards', n: 15 }, { k: 'gold', n: 300 }, { k: 'energy', n: 20 });
    else if (mid) out.push({ k: 'item', n: 2 }, { k: 'shards', n: 6 }, { k: 'gold', n: 150 }, { k: 'scroll', n: 2 });
    else { out.push({ k: 'shards', n: 3 }, { k: 'gold', n: 80 }, { k: 'energy', n: 10 }); if (l % 3 === 0) out.push({ k: 'scroll', n: 1 }); else if (l % 2) out.push({ k: 'hp', n: 3 }); else out.push({ k: 'mp', n: 3 }); }
  } else {
    if (big) out.push({ k: 'item', n: l === 30 ? 4 : 3 }, { k: 'shards', n: l === 30 ? 40 : 25 }, { k: 'gold', n: 600 }, { k: 'energy', n: 40 });
    else if (mid) out.push({ k: 'item', n: 3 }, { k: 'shards', n: 12 }, { k: 'gold', n: 300 }, { k: 'energy', n: 25 });
    else { out.push({ k: 'shards', n: 6 }, { k: 'gold', n: 150 }, { k: 'energy', n: 15 }); out.push(l % 3 === 0 ? { k: 'scroll', n: 2 } : l % 2 ? { k: 'hp', n: 5 } : { k: 'mp', n: 5 }); }
  }
  return { list: out, big, mid: mid && !big, label: rewardLabel(out[0]) };
}
const RAR = ['Серая вещь', 'Зелёная вещь', 'Синяя вещь', 'Золотая вещь', 'Мифическая вещь'];
export function rewardLabel(r) {
  const P = G.profile;
  switch (r.k) {
    case 'gold': return `${r.n * ((P && P.level) || 1)} золота`; case 'shards': return `${r.n} ◆`; case 'energy': return `${r.n} ⚡`;
    case 'hp': return `Зелья здоровья ×${r.n}`; case 'mp': return `Зелья маны ×${r.n}`; case 'scroll': return `Свитки ×${r.n}`;
    case 'item': return RAR[r.n];
  }
  return '';
}
export function addSeason(n, why) {
  if (!G.profile || !(n > 0)) return; const before = seasonLevel().lvl; season().pts += n; const after = seasonLevel().lvl;
  if (after > before) { bus.emit('toast', { text: `Путь сезона: ступень ${after}!`, sub: `Награда ждёт: ${seasonReward(after).label} (меню → Путь сезона)`, kind: 'quest' }); bus.emit('sfx', 'levelup'); bus.emit('hud'); }
}
const claimedOf = t => { const S = season(); return S[CLAIM_KEY[t]] || (S[CLAIM_KEY[t]] = {}); };
export const isClaimed = (l, t) => !!claimedOf(t)[l];
export const canClaim = (l, t) => trackOpen(t) && seasonLevel().lvl >= l && !isClaimed(l, t);
export const seasonClaimable = () => { const L = seasonLevel().lvl; let n = 0; for (const t of TRACKS) if (trackOpen(t)) for (let l = 1; l <= L; l++) if (!isClaimed(l, t)) n++; return n; };
function giveReward(r, paid) {
  const P = G.profile;
  switch (r.k) {
    case 'gold': P.gold += r.n * P.level; break;
    case 'shards': P.shards = (P.shards || 0) + r.n; break;
    case 'energy': torches().n += r.n; break;   // как покупка энергии — можно сверх запаса
    case 'hp': P.potions.hp += r.n; break; case 'mp': P.potions.mp += r.n; break;
    case 'scroll': P.scrolls += r.n; break;
    case 'item': {   // бесплатная — по силам героя (не ниже синей), платные — как вещи лавки, без ограничения уровня
      const it = paid ? makeItem({ ilvl: P.level, rarity: r.n, cls: P.cls, noClamp: true }) : makeItem({ ilvl: P.level, rarity: Math.min(r.n, Math.max(2, maxRarityFor(P.level))), cls: P.cls });
      if (paid && it.rarity !== r.n) { it.rarity = r.n; applyKindPerk(it); } delete it.req; autoEquip(it);
    }
  }
}
function claimOne(l, t) {
  if (!canClaim(l, t)) return false;
  claimedOf(t)[l] = Date.now();
  for (const r of seasonReward(l, t).list) giveReward(r, t !== 'free');
  return true;
}
// забрать одну клетку (l, t) или всё доступное (l не задан)
export function claimSeason(l, t = 'free') {
  const L = seasonLevel().lvl; let n = 0;
  if (l) n = +claimOne(l, t); else for (const tr of TRACKS) for (let i = 1; i <= L; i++) n += +claimOne(i, tr);
  if (!n) return false;
  bus.emit('toast', { text: l ? `Сезон: награда ступени ${l}` : `Сезон: забрано наград — ${n}`, sub: l ? seasonReward(l, t).list.map(rewardLabel).join(', ') : '', kind: 'good' });
  bus.emit('sfx', 'quest'); bus.emit('hud'); bus.emit('save'); return true;
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
export const weeklyFloor = lvl => floorForLevel(lvl);   // этаж, уровень врагов которого ≈ уровню героя
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
  if (rec) submitScore('weeklyDepths', Math.round(time * 1000), true, 'weeklyDepths' + weekNo());   // ладдер: очередь с лимитом Яндекса (js/game/ladder.js)
  return { first, rec };
}

// ---------------------------------------------------------------- «до цели»: одна ближайшая цель на главном экране
export function nextGoalLine() {
  const P = G.profile; if (!P) return '';
  // П52: напоминание по тем же правилам, что у кузнеца (класс, 🔒, уровень героя для следующей редкости, золото) — раньше звало, когда слить было нельзя
  const groups = mergeGroups().filter(g => !g.capLvl);
  if (groups.some(g => g.can && P.gold >= mergeCost(g.rarity))) return '⚒ Кузнец: можно слить 3 вещи в 1 лучше';
  const two = groups.find(g => g.n % 3 === 2);
  if (two) return `⚒ Ещё 1 ${['серая', 'зелёная', 'синяя', 'золотая'][two.rarity]} вещь (${{ weapon: 'оружие', head: 'шлем', chest: 'доспех', amulet: 'амулет' }[two.slot]}) — и слияние`;
  const s = seasonLevel(); if (s.lvl < SEASON_LEVELS) return `🏆 Сезон: ${s.into}/${s.need} до ступени ${s.lvl + 1} (${seasonReward(s.lvl + 1).label})`;
  return '';
}
