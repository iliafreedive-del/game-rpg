// Item generation and helpers (Inventory/Equipment domain logic, no DOM).
import { G } from './ctx.js';
import { BASES, BASE, WEAPONS, AFFIXES, AFFIX_GROUP, RARITY, EPICS, CLASSES, SLOTS } from '../data/items.js';
import { BRANCHES } from '../data/skills.js';
import { rand, rint, weighted, pick, uid } from '../core/util.js';

const slotOf = s => (s === 'ring1' || s === 'ring2') ? 'ring' : s;

export function basesFor(slot, ilvl, wt) {
  const s = slotOf(slot);
  return BASES.filter(b => b.slot === s && b.lvl <= Math.max(1, ilvl) && (!wt || b.wt === wt));
}

const ELEM = { fire: 'fire', cold: 'ice', light: 'light' };
const USELESS = { warrior: ['int'], archer: ['str', 'int'], mage: ['str', 'dex', 'ias'] };
function rollAffixes(item, count, cls) {
  const g = AFFIX_GROUP(item.slot);
  const C = cls && CLASSES[cls];
  const pool = Object.entries(AFFIXES).filter(([k, a]) => a.g.includes(g) && !item.affixes.some(x => x.k === k)
    && (!C || ((!ELEM[k] || C.branches.includes(ELEM[k])) && !USELESS[cls].includes(k))));
  for (let i = 0; i < count && pool.length; i++) {
    const k = weighted(pool.map(([k, a]) => [k, a.w]));
    const idx = pool.findIndex(p => p[0] === k); pool.splice(idx, 1);
    item.affixes.push(rollAffix(k, item.ilvl, cls));
  }
}
export function rollAffix(k, ilvl, cls) {
  const a = AFFIXES[k]; const [lo, hi] = a.r(ilvl);
  const af = { k, v: rint(lo, hi) };
  if (a.branch) af.b = cls ? pick(CLASSES[cls].branches) : pick(BRANCHES).id;
  return af;
}

// opts: {slot, ilvl, rarity, base, wt, epic}
// Редкость растёт вместе с героем: серые и зелёные вещи в начале, синие с 6-го уровня, золотые (эпики) с 12-го — не в первые 10 минут
export const maxRarityFor = lvl => lvl >= 12 ? 3 : lvl >= 6 ? 2 : 1;
export function makeItem(opts = {}) {
  const lvlNow = G && G.profile ? G.profile.level : 99;
  if (opts.epic && maxRarityFor(lvlNow) < 3) { opts = { ...opts }; delete opts.epic; opts.rarity = 2; }
  if (opts.rarity !== undefined && opts.rarity > maxRarityFor(lvlNow)) opts = { ...opts, rarity: maxRarityFor(lvlNow) };
  const ilvl = Math.max(1, opts.ilvl || 1);
  let base;
  if (opts.epic) base = BASE[opts.epic.base];
  else if (opts.base) base = BASE[opts.base];
  else {
    let slot = opts.slot;
    if (!slot || !SLOTS.includes(slot)) slot = weighted([['weapon', 40], ['head', 20], ['chest', 25], ['amulet', 15]]);
    let cands = basesFor(slot, ilvl, opts.wt);
    if (slot === 'weapon' && opts.cls) cands = cands.filter(b => CLASSES[opts.cls].weapons.includes(b.wt));
    if (!cands.length) cands = basesFor(slot, 99, opts.wt).filter(b => !opts.cls || slot !== 'weapon' || CLASSES[opts.cls].weapons.includes(b.wt)).sort((a, b) => a.lvl - b.lvl).slice(0, 1);
    // prefer the highest tiers available but keep variety
    base = weighted(cands.map(b => [b, 1 + b.lvl]));
  }
  const rarity = opts.epic ? 3 : (opts.rarity ?? 0);
  const it = { id: uid('i'), base: base.k, slot: base.slot, ilvl, rarity, upg: 0, affixes: [] };
  if (base.wt) {
    const W = WEAPONS[base.wt];
    const lm = 1 + (ilvl - 1) * 0.12;
    it.wt = base.wt;
    it.dmg = [Math.max(1, Math.round(W.dmg[0] * base.mult * lm * (0.9 + rand() * 0.2))), 0];
    it.dmg[1] = Math.max(it.dmg[0] + 1, Math.round(W.dmg[1] * base.mult * lm * (0.9 + rand() * 0.2)));
  }
  if (base.armor) it.armor = Math.round(base.armor * (1 + (ilvl - 1) * 0.1) * (0.9 + rand() * 0.25));
  if (base.block) it.block = base.block;
  if (base.req) it.req = { ...base.req };
  if (opts.epic) {
    it.epic = opts.epic.id; it.name = opts.epic.name; it.effect = opts.epic.effect;
    for (const [k, v] of Object.entries(opts.epic.fixed)) it.affixes.push({ k, v });
    rollAffixes(it, 2, opts.cls);
    if (it.dmg) { it.dmg[0] = Math.round(it.dmg[0] * 1.25); it.dmg[1] = Math.round(it.dmg[1] * 1.25); }
  } else {
    const [a, b] = RARITY[rarity].affixes; rollAffixes(it, rint(a, b), opts.cls);
  }
  it.name = it.name || itemName(it, base);
  return it;
}

const PREFIX = { dmgPct: 'Жестокий', ias: 'Быстрый', crit: 'Точный', armor: 'Крепкий', hp: 'Живучий', fire: 'Пылающий', cold: 'Ледяной', light: 'Грозовой', str: 'Могучий', dex: 'Ловкий', int: 'Мудрый', goldFind: 'Счастливый' };
const RARE_A = ['Мрачный', 'Кровавый', 'Древний', 'Проклятый', 'Сумрачный', 'Костяной', 'Железный', 'Вечный'];
const RARE_B = ['Страж', 'Клятва', 'Шёпот', 'Рок', 'Коготь', 'Приговор', 'Завет', 'Оплот'];
function itemName(it, base) {
  if (it.rarity === 1 && it.affixes[0]) { const p = PREFIX[it.affixes[0].k]; return p ? `${agree(p, base.name)} ${lower(base.name)}` : base.name; }
  if (it.rarity >= 2) return `${pick(RARE_A)} ${pick(RARE_B).toLowerCase()} · ${base.name}`;
  return base.name;
}
const lower = s => s.charAt(0).toLowerCase() + s.slice(1);
// crude adjective agreement for feminine/neuter/plural base names
function agree(adj, noun) {
  const n = noun.split(' ').pop();
  const stem = adj.slice(0, -2);
  const soft = adj.endsWith('ий') && !/[кгхжшщч]ий$/.test(adj);
  if (/(и|ы)$/.test(n)) return stem + (soft ? 'ие' : 'ые');
  if (/(а|я)$/.test(n)) return stem + (soft ? 'яя' : 'ая');
  if (/(о|е)$/.test(n)) return stem + (soft ? 'ее' : 'ое');
  return adj;
}

export function makeStarterGear(cls = 'warrior') {
  const base = { warrior: 'short_sword', archer: 'short_bow', mage: 'oak_staff' }[cls];
  const w = makeItem({ base, ilvl: 1, rarity: 0 });
  w.name = { warrior: 'Ржавый меч', archer: 'Старый лук', mage: 'Посох ученика' }[cls];
  if (cls === 'warrior') w.dmg = [4, 7];
  const c = makeItem({ base: 'jerkin', ilvl: 1, rarity: 0 }); c.armor = 4; c.name = { warrior: 'Стёганая куртка', archer: 'Кожаная куртка', mage: 'Дорожная мантия' }[cls];
  delete w.req; delete c.req;
  return { weapon: w, chest: c };
}

export const baseOf = it => BASE[it.base];
export const iconOf = it => it.wt ? WEAPONS[it.wt].icon : (BASE[it.base].icon || it.slot);
export const rarityColor = it => RARITY[it.rarity].color;
export const upgMult = it => 1 + (it.upg || 0) * 0.1;
export function affixText(a) { const A = AFFIXES[a.k]; if (!A) return ''; return A.branch ? A.name(a.v, (BRANCHES.find(b => b.id === a.b) || {}).name) : A.name(a.v); }
export function epicOf(it) { return it.epic ? EPICS.find(e => e.id === it.epic) : null; }

// Sell value & smith costs (gold sinks scale with level so they stay relevant)
export function sellValue(it) { return Math.round((4 + it.ilvl * 3) * [1, 2.5, 6, 15][it.rarity] * (1 + (it.upg || 0) * 0.3)); }
export function upgradeCost(it) { const u = it.upg || 0; return Math.round((30 + it.ilvl * 12) * Math.pow(1.55, u) * [1, 1.3, 1.7, 2.5][it.rarity]); }
export function reforgeCost(it) { return Math.round((50 + it.ilvl * 20) * [1, 1.2, 1.6, 2.4][it.rarity]); }
export const MAX_UPG = 10;
