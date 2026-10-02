// Daily quests (3 per day) and «Дозор Ордена» — progress while the player is away.
import { G, bus } from './ctx.js';
import { xpToNext } from './stats.js';
import { gainXP } from './loot.js';
import { makeItem } from './items.js';
import { autoEquip } from './character.js';

const POOL = [
  { id: 'kill', stat: 'kills', n: [30, 60], t: n => `Уничтожить ${n} врагов` },
  { id: 'floors', stat: 'floors', n: [1, 3], t: n => `Пройти ${n} ${n === 1 ? 'этаж' : 'этажа'} Глубин` },
  { id: 'gold', stat: 'gold', n: [150, 400], t: n => `Собрать ${n} золота` },
  { id: 'upg', stat: 'upgrades', n: [1, 2], t: n => n === 1 ? 'Закалить вещь у кузнеца' : `Закалить вещи у кузнеца ${n} раза` },
  { id: 'chest', stat: 'chests', n: [2, 4], t: n => `Открыть ${n} сундука` },
  { id: 'elite', stat: 'elites', n: [1, 3], t: n => `Победить ${n} элитных врагов` },
  { id: 'stars', stat: 'stars3', n: [1, 1], t: () => 'Пройти этаж на ★★★' },
];
const dayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function dailyQuests() {
  const P = G.profile, today = dayKey();
  if (!P.dq || P.dq.day !== today) {
    const R = seeded(today % 2147483646 + 1); const picks = [...POOL].sort(() => R() - 0.5);
    const list = picks.filter(q => q.id !== 'floors' || (P.depths && P.depths.best > 0)).slice(0, 3);
    P.dq = { day: today, bonus: false, list: list.map(q => { const n = q.n[0] + Math.floor(R() * (q.n[1] - q.n[0] + 1)); return { id: q.id, stat: q.stat, n, base: P.stats[q.stat] || 0, claimed: false }; }) };
    bus.emit('save');
  }
  return P.dq.list.map(q => { const def = POOL.find(p => p.id === q.id); const cur = Math.min(q.n, Math.floor((G.profile.stats[q.stat] || 0) - q.base)); return { ...q, title: def.t(q.n), cur, done: cur >= q.n }; });
}
export const dqReward = () => ({ gold: 40 + G.profile.level * 20, potions: 1 });
export function claimDaily(id) {
  const P = G.profile; const list = dailyQuests(); const q = list.find(x => x.id === id); if (!q || !q.done || q.claimed) return false;
  P.dq.list.find(x => x.id === id).claimed = true;
  const r = dqReward(); P.gold += r.gold; P.potions.hp += r.potions;
  bus.emit('toast', { text: 'Ежедневное задание выполнено', sub: `+${r.gold} зол. · +${r.potions} зелье`, kind: 'good' }); bus.emit('sfx', 'quest');
  if (P.dq.list.every(x => x.claimed) && !P.dq.bonus) {
    P.dq.bonus = true; const it = makeItem({ ilvl: P.level + 1, rarity: 1, cls: P.cls }); delete it.req;
    const e = autoEquip(it); P.gold += 100 * P.level;
    bus.emit('reward', { title: 'Сундук дня', sub: 'Все ежедневные задания выполнены', gold: 100 * P.level, xp: 0, potions: 0, scrolls: 0, skillPts: 0, items: [e] });
  }
  bus.emit('hud'); bus.emit('save'); return true;
}
export const dailyReady = () => G.profile && dailyQuests().some(q => q.done && !q.claimed);

// ---- Dozor: the Order keeps patrolling the depths while you're away (max 8 h)
export const DOZOR_CAP = 8 * 3600e3;
export function dozorPending() {
  const P = G.profile; if (!P.depths || !P.depths.best) return null;
  const last = P.dozorAt || P.saved || Date.now(); const ms = Math.min(DOZOR_CAP, Date.now() - last);
  if (ms < 10 * 60e3) return null;
  const h = ms / 3600e3;
  return { ms, gold: Math.round((30 + 15 * P.depths.best + 10 * P.level) * h), xp: Math.round(xpToNext(P.level) * 0.05 * h) };
}
export function claimDozor(mult = 1) {
  const P = G.profile; const d = dozorPending(); if (!d) return null;
  P.dozorAt = Date.now(); P.gold += d.gold * mult; gainXP(d.xp * mult);
  bus.emit('hud'); bus.emit('save'); return d;
}
export function initDozor() { const P = G.profile; if (!P.dozorAt) P.dozorAt = Date.now(); }

// ---- weekly quests (bigger goals, bigger rewards incl. Abyss shards)
const WPOOL = [
  { id: 'wkill', stat: 'kills', n: 400, t: n => `Уничтожить ${n} врагов` },
  { id: 'wfloor', stat: 'floors', n: 8, t: n => `Пройти ${n} этажей Глубин` },
  { id: 'welite', stat: 'elites', n: 10, t: n => `Победить ${n} элитных врагов` },
  { id: 'wgold', stat: 'gold', n: 3000, t: n => `Собрать ${n} золота` },
  { id: 'wupg', stat: 'upgrades', n: 5, t: n => `Закалить вещи ${n} раз` },
  { id: 'wchest', stat: 'chests', n: 15, t: n => `Открыть ${n} сундуков` },
];
const weekKey = () => { const d = new Date(); const j = new Date(d.getFullYear(), 0, 1); return d.getFullYear() * 100 + Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7); };
export const wqReward = () => ({ gold: 150 + G.profile.level * 60, shards: 3 });
export function weeklyQuests() {
  const P = G.profile, wk = weekKey();
  if (!P.wq || P.wq.week !== wk) { const R = seeded(wk); const picks = [...WPOOL].sort(() => R() - 0.5).slice(0, 3); P.wq = { week: wk, list: picks.map(q => ({ id: q.id, stat: q.stat, n: q.n, base: P.stats[q.stat] || 0, claimed: false })) }; }
  return P.wq.list.map(q => { const def = WPOOL.find(p => p.id === q.id); const cur = Math.min(q.n, Math.floor((P.stats[q.stat] || 0) - q.base)); return { ...q, title: def.t(q.n), cur, done: cur >= q.n }; });
}
export function claimWeekly(id) {
  const P = G.profile, q = weeklyQuests().find(x => x.id === id); if (!q || !q.done || q.claimed) return false;
  P.wq.list.find(x => x.id === id).claimed = true; const r = wqReward(); P.gold += r.gold; P.shards = (P.shards || 0) + r.shards;
  bus.emit('toast', { text: 'Недельное задание выполнено', sub: `+${r.gold} зол. · +${r.shards}◆`, kind: 'good' }); bus.emit('sfx', 'quest'); bus.emit('hud'); bus.emit('save'); return true;
}
