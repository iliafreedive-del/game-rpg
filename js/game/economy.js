// Economy: merchant (consumables, rotating stock, buy-back by selling), smith (upgrade/reforge), trainer (respec, spell lesson).
import { G, bus } from './ctx.js';
import { makeItem, sellValue, upgradeCost, reforgeCost, MAX_UPG, rollAffix, mergeItems, itemPower, mergeCapFor, mergeCapLevel } from './items.js';
import { AFFIXES, AFFIX_GROUP, CLASSES } from '../data/items.js';
import { stats } from './stats.js';
import { autoEquip } from './character.js';
import { rint, weighted } from '../core/util.js';
import { potionReserve, POTION_RESERVE } from './progress.js';
import { STORY } from '../data/quests.js';

// сборка 47: зелье здоровья — 300 зол. (+10 за уровень); первое, по шагу обучения у Миры, — за 30
// сборка 54: первое зелье — 30 (на шаге «Купить зелье у Миры» не дороже, чем есть золота: шаг не застрянет и у старых сохранений)
const firstPotion = () => { const s = G.profile.story, st = s.stage; return st < STORY.length && STORY[st].id === 'meet_merchant' ? Math.min(POTION_RESERVE, G.profile.gold | 0) : POTION_RESERVE; };
export const potionPrice = k => k === 'hp' ? (G.profile.story.flags.potBought ? 300 + 10 * (G.profile.level - 1) : firstPotion()) : k === 'mp' ? 12 + 2 * G.profile.level : 45 + 5 * G.profile.level;
export const stockRefreshPrice = () => 40 * G.profile.level;
export const respecSkillPrice = () => 100 * G.profile.level;
export const respecAttrPrice = () => 80 * G.profile.level;
export const buyPrice = it => Math.round((sellValue(it) * 4 + 20) * Math.pow(1.1, it.ilvl - 1));   // сборка 20: +10% за уровень вещи

function pay(n, potion = false) { const P = G.profile; if (!potion && potionReserve(n)) return false; if (P.gold < n) { bus.emit('toast', { text: 'Недостаточно золота', kind: 'warn' }); bus.emit('sfx', 'deny'); return false; } P.gold -= n; bus.emit('sfx', 'coin'); bus.emit('hud'); return true; }
const recalc = () => { G.stats = stats(G.profile); bus.emit('statsChanged'); bus.emit('hud'); bus.emit('save'); };

export function ensureStock(force) {
  const P = G.profile, S = P.shop;
  if (!force && S.stock.length && S.refreshedAtLevel === P.level) return;
  S.stock = []; S.refreshedAtLevel = P.level;
  const slots = ['weapon', 'head', 'chest', 'amulet'];
  for (const slot of slots) S.stock.push(makeItem({ slot, cls: P.cls || 'warrior', ilvl: P.level + rint(0, 1), rarity: weighted([[0, 70], [1, 27], [2, 3]]) /* сборка 47: было 40/50/10 */ }));
  for (const it of S.stock) delete it.req;
}
export function refreshStock(free) { if (!free && !pay(stockRefreshPrice())) return false; ensureStock(true); bus.emit('save'); return true; }
export function buyConsumable(k) {
  const P = G.profile; if (!pay(potionPrice(k), k === 'hp')) return false;
  if (k === 'scroll') P.scrolls++; else P.potions[k]++; if (k === 'hp') P.story.flags.potBought = true; bus.emit('save'); return true;   // флаг — шаг обучения «Купить зелье у Миры»
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

// ---- слияние у кузнеца (сборка 20): три вещи одного слота и редкости из сумки → одна следующей редкости
// Надетые и закреплённые (🔒) вещи не участвуют. Основа — самая сильная из трёх.
const MERGE_SLOTS = ['weapon', 'head', 'chest', 'amulet'];
export const mergeCost = r => Math.round([40, 200, 900, 4000][r] * Math.pow(1.1, Math.max(0, G.profile.level - 1)));
export function mergeGroups() {
  const P = G.profile, out = [];
  for (const slot of MERGE_SLOTS) for (let r = 0; r < 4; r++) {
    const list = P.bag.filter(it => it.slot === slot && it.rarity === r && !it.locked && (slot !== 'weapon' || !it.wt || CLASSES[P.cls || 'warrior'].weapons.includes(it.wt)));
    const capped = r + 1 > mergeCapFor(P.level);   // сборка 47: редкость слиянием — по уровню героя
    out.push({ slot, rarity: r, n: list.length, can: capped ? 0 : Math.floor(list.length / 3), capLvl: capped ? mergeCapLevel(r + 1) : 0, list: list.sort((a, b) => itemPower(b) - itemPower(a)) });
  }
  return out;
}
export function mergeOnce(slot, rarity, quiet) {
  const P = G.profile, g = mergeGroups().find(x => x.slot === slot && x.rarity === rarity);
  if (g && g.capLvl && g.n >= 3 && !quiet) { bus.emit('toast', { text: `Такое слияние — с ${g.capLvl} уровня`, kind: 'warn' }); bus.emit('sfx', 'deny'); }
  if (!g || g.can < 1) return null;
  const cost = mergeCost(rarity); if (cost && potionReserve(cost)) return null; if (P.gold < cost) { if (!quiet) { bus.emit('toast', { text: `Слияние стоит ${cost} зол.`, kind: 'warn' }); bus.emit('sfx', 'deny'); } return null; }
  const three = g.list.slice(0, 3), it = mergeItems(three, P.cls); if (!it) return null;
  it.from = { who: 'Слияние у кузнеца Горана', t: Date.now() };   // сборка 49: история вещи
  P.gold -= cost; P.bag = P.bag.filter(x => !three.includes(x)); P.bag.push(it);
  P.stats.merges = (P.stats.merges || 0) + 1; bus.emit('merged', it);
  if (!quiet) { bus.emit('sfx', rarity >= 2 ? 'epicDrop' : 'rareDrop'); bus.emit('toast', { text: 'Слияние: ' + it.name, sub: 'Новая вещь в сумке', kind: 'item' }); }
  bus.emit('save'); return it;
}
export function mergeAll() {   // снизу вверх: серые → зелёные → синие → золотые, пока хватает вещей и золота
  const made = [];
  for (let r = 0; r < 4; r++) for (const slot of MERGE_SLOTS) { let it; while ((it = mergeOnce(slot, r, true))) made.push(it); }
  if (made.length) { bus.emit('sfx', made.some(i => i.rarity >= 3) ? 'epicDrop' : 'rareDrop'); bus.emit('toast', { text: `Слияний: ${made.length}`, sub: made.slice(-3).map(i => i.name).join(', '), kind: 'item' }); }
  return made;
}
