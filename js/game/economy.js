// Economy: merchant (consumables, rotating stock, buy-back by selling), smith (upgrade/reforge), trainer (respec, spell lesson).
import { G, bus } from './ctx.js';
import { makeItem, sellValue, upgradeCost, reforgeCost, MAX_UPG, rollAffix } from './items.js';
import { AFFIXES, AFFIX_GROUP, CLASSES } from '../data/items.js';
import { stats } from './stats.js';
import { autoEquip } from './character.js';
import { rint, weighted } from '../core/util.js';

export const potionPrice = k => k === 'hp' ? 15 + 3 * G.profile.level : k === 'mp' ? 12 + 2 * G.profile.level : 45 + 5 * G.profile.level;
export const stockRefreshPrice = () => 40 * G.profile.level;
export const respecSkillPrice = () => 100 * G.profile.level;
export const respecAttrPrice = () => 80 * G.profile.level;
export const buyPrice = it => sellValue(it) * 4 + 20;

function pay(n) { const P = G.profile; if (P.gold < n) { bus.emit('toast', { text: 'Недостаточно золота', kind: 'warn' }); bus.emit('sfx', 'deny'); return false; } P.gold -= n; bus.emit('sfx', 'coin'); bus.emit('hud'); return true; }
const recalc = () => { G.stats = stats(G.profile); bus.emit('statsChanged'); bus.emit('hud'); bus.emit('save'); };

export function ensureStock(force) {
  const P = G.profile, S = P.shop;
  if (!force && S.stock.length && S.refreshedAtLevel === P.level) return;
  S.stock = []; S.refreshedAtLevel = P.level;
  const slots = ['weapon', 'head', 'chest', 'amulet'];
  for (const slot of slots) S.stock.push(makeItem({ slot, cls: P.cls || 'warrior', ilvl: P.level + rint(0, 1), rarity: weighted([[1, 65], [2, 35]]) }));
  for (const it of S.stock) delete it.req;
}
export function refreshStock(free) { if (!free && !pay(stockRefreshPrice())) return false; ensureStock(true); bus.emit('save'); return true; }
export function buyConsumable(k) {
  const P = G.profile; if (!pay(potionPrice(k))) return false;
  if (k === 'scroll') P.scrolls++; else P.potions[k]++; bus.emit('save'); return true;
}
export function buyItem(idx) {
  const P = G.profile, it = P.shop.stock[idx]; if (!it) return false;
  if (!pay(buyPrice(it))) return false;
  P.shop.stock.splice(idx, 1); const had = P.gear[it.slot], r = autoEquip(it, true);
  bus.emit('toast', { text: 'Надето: ' + it.name, sub: had ? 'Прежняя вещь лежит в сумке' : '', kind: 'good' }); bus.emit('save'); return true;
}
export function sellItem(id) {
  const P = G.profile, i = P.bag.findIndex(x => x.id === id); if (i < 0) return false;
  const it = P.bag[i]; P.bag.splice(i, 1); const v = sellValue(it); P.gold += v;
  bus.emit('sfx', 'coin'); bus.emit('toast', { text: `Продано: ${it.name}`, sub: `+${v} зол.`, kind: 'info' }); bus.emit('hud'); bus.emit('save'); return true;
}
export function sellAllCommon() {
  const P = G.profile; let sum = 0, n = 0;
  P.bag = P.bag.filter(it => { if (it.rarity === 0 && !it.locked) { sum += sellValue(it); n++; return false; } return true; });
  P.gold += sum; if (n) { bus.emit('sfx', 'coin'); bus.emit('toast', { text: `Продано обычных вещей: ${n}`, sub: `+${sum} зол.`, kind: 'info' }); }
  bus.emit('hud'); bus.emit('save'); return n;
}
// ---- smith
export function findItem(id) { const P = G.profile; for (const [s, it] of Object.entries(P.gear)) if (it && it.id === id) return it; return P.bag.find(x => x.id === id); }
export function upgrade(id) {
  const it = findItem(id); if (!it) return false; const P = G.profile;
  if ((it.upg || 0) >= MAX_UPG) { bus.emit('toast', { text: 'Предмет закалён до предела', kind: 'warn' }); return false; }
  if (!pay(upgradeCost(it))) return false;
  it.upg = (it.upg || 0) + 1; P.stats.upgrades = (P.stats.upgrades || 0) + 1; bus.emit('sfx', 'anvil');
  bus.emit('toast', { text: `Закалка +${it.upg}`, sub: it.name + (it.dmg ? ' · урон +10%' : ' · защита +10%'), kind: 'good' });
  recalc(); return true;
}
export function reforge(id, idx) {
  const it = findItem(id); if (!it || !it.affixes[idx]) return false;
  if (it.epic && idx < 2) { bus.emit('toast', { text: 'Уникальные свойства эпика нельзя перековать', kind: 'warn' }); return false; }
  if (!pay(reforgeCost(it))) return false;
  const g = AFFIX_GROUP(it.slot);
  const br = CLASSES[G.profile.cls || 'warrior'].branches, EL = { fire: 'fire', cold: 'ice', light: 'light' };
  const pool = Object.entries(AFFIXES).filter(([k, a]) => a.g.includes(g) && !it.affixes.some((x, j) => j !== idx && x.k === k) && (!EL[k] || br.includes(EL[k])));
  const k = weighted(pool.map(([k, a]) => [k, a.w]));
  it.affixes[idx] = rollAffix(k, it.ilvl, G.profile.cls); bus.emit('sfx', 'anvil');
  recalc(); return true;
}
// ---- trainer
export function respecSkills(free) {
  const P = G.profile; if (!free && !pay(respecSkillPrice())) return false;
  let pts = 0; for (const k in P.skills) pts += P.skills[k]; P.skills = {}; P.slots = [null, null, null, null]; P.skillPts += pts;
  bus.emit('toast', { text: 'Навыки сброшены', sub: `Возвращено очков: ${pts}`, kind: 'info' }); recalc(); return true;
}
export function respecAttrs() {
  const P = G.profile; if (!pay(respecAttrPrice())) return false;
  let pts = 0; for (const k in P.attrs) { pts += P.attrs[k] - 10; P.attrs[k] = 10; } P.attrPts += pts;
  bus.emit('toast', { text: 'Характеристики сброшены', sub: `Возвращено очков: ${pts}`, kind: 'info' }); recalc(); return true;
}
