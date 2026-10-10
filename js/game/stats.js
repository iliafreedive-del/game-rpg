// Derived character stats from attributes, gear and skills. Pure: stats(profile) → object.
import { SETS } from '../data/sets.js';
import { WEAPONS, CLASSES, AFFIXES, BR_CAP } from '../data/items.js';
import { SKILLS, PASSIVE_K as K } from '../data/skills.js';
import { upgMult } from './items.js';
import { G, bus } from './ctx.js';
import { DECOR } from '../data/upgrades.js';
import { ENEMIES, scaleHP } from '../data/enemies.js';
export const hasBoon = id => !!(G.run && G.run.boons && G.run.boons.includes(id));

export const xpToNext = l => Math.round(75 * Math.pow(l, 1.75) * Math.pow(1.1, l - 1) * (l > 1 ? 2 : 1))   // сборка 47: со 2-го уровня опыта нужно вдвое больше (6 ур. за полчаса — слишком быстро)   // сборка 20: ×1,1 за уровень (как цены) — топ — это долгий фарм;   // чуть круче прежнего: до босса (ур. 6) приходится заглянуть в лес и перепройти катакомбы;
export const rank = (p, id) => p.skills[id] || 0;

export function branchBonus(p, branch) {
  let n = 0;
  for (const it of Object.values(p.gear)) if (it) for (const a of it.affixes) if (a.k === 'skill' && a.b === branch) n += a.v;
  for (const [id, c] of Object.entries(setCounts(p.gear))) { const S = SETS[id]; if (S.branch !== branch) continue; if (c >= 2) n += S.b2.skills || 0; if (c >= 3) n += S.b3.skills || 0; }   // сеты навыков
  return n;
}
// сколько частей каждого сета надето
export function setCounts(gear) { const c = {}; for (const it of Object.values(gear)) if (it && it.set && SETS[it.set]) c[it.set] = (c[it.set] || 0) + 1; return c; }
// effective rank = learned rank + item bonus (only if learned)
export function effRank(p, id) { const r = rank(p, id); return r ? r + branchBonus(p, SKILLS[id].b) : 0; }

export function stats(p, gearOverride) {
  const gear = gearOverride || p.gear;
  const s = { str: p.attrs.str, dex: p.attrs.dex, int: p.attrs.int, vit: p.attrs.vit,
    dmgPct: 0, dmgFlat: 0, ias: 0, crit: 0, critDmg: 0, armor: 0, hp: 0, mp: 0, fire: 0, cold: 0, light: 0,
    resFire: 0, resCold: 0, resLight: 0, regen: 0, leech: 0, goldFind: 0, block: 0, effects: {}, br: { brDmg: {}, brCd: {}, brMana: {} } };
  let armorItems = 0;
  for (const [slot, it] of Object.entries(gear)) {
    if (!it) continue;
    let arm = (it.armor || 0) * upgMult(it), armPct = 0;
    for (const a of it.affixes) {
      if (a.k === 'armorPct') armPct += a.v;
      else if (a.k === 'resAll' || a.k === 'resFire' || a.k === 'resCold' || a.k === 'resLight') { }   // сопротивления убраны
      else if (a.k === 'skill') { }
      else if (AFFIXES[a.k] && AFFIXES[a.k].branch && a.b) { const B = s.br[a.k]; B[a.b] = Math.min(BR_CAP[a.k], (B[a.b] || 0) + a.v); }   // С35: свойства ветви навыков
      else if (a.k in s && AFFIXES[a.k]) s[a.k] += a.v;   // сборка 47: только нынешние свойства вещей
    }
    armorItems += arm * (1 + armPct / 100);
    if (it.block) s.block += it.block;
    if (it.effect) s.effects[it.effect] = true;
  }
  // бонусы сетов (кроме «+к навыкам» — те в branchBonus)
  for (const [id, c] of Object.entries(setCounts(gear))) for (const [need, b] of [[2, SETS[id].b2], [3, SETS[id].b3]]) if (c >= need) for (const [k, v] of Object.entries(b)) if (k === 'armorPct') armorItems *= 1 + v / 100; else if (k !== 'skills' && k in s) s[k] += v;
  const w = gear.weapon; const W = w ? WEAPONS[w.wt] : WEAPONS.sword;
  s.weaponType = w ? w.wt : 'fist';
  s.ranged = !!W.projectile;
  s.melee = !W.projectile;
  // skills
  const sr = id => effRank({ ...p, gear }, id);
  const mastery = s.melee ? sr('blade_mastery') : 0;
  const marks = s.weaponType === 'bow' ? sr('marksman') : 0;
  s.armor = Math.round(armorItems + s.armor + s.dex * 0.5 + sr('ice_armor') * 12 * K);
  s.level = p.level;
  s.maxHP = Math.round(40 + s.vit * 5 + p.level * 6 + s.hp);
  s.maxMP = Math.round(20 + s.int * 3 + p.level * 2 + s.mp);
  s.hpRegen = 0.4 + s.vit * 0.03;
  s.mpRegen = 0.8 + s.int * 0.04 + s.regen;
  // weapon damage
  const base = w ? w.dmg : [1, 3];
  const um = w ? upgMult(w) : 1;
  const attr = W.scale === 'str' ? s.str : W.scale === 'dex' ? s.dex : s.int;
  const attrMult = 1 + attr * (W.scale === 'int' ? 0.018 : 0.02);   // сборка 47: маг 0,025 → 0,018
  const help = (p.boosts && p.boosts.helpUntil > Date.now()) ? (p.boosts.helpK || 1.15) : 1;   // П22: за рекламу ×1,3   // подмога Ордена после трёх поражений подряд (js/platform/offers.js)
  const mult = attrMult * (1 + s.dmgPct / 100) * (1 + (mastery * 0.08 + marks * 0.08) * K) * help;
  s.dmgMin = Math.max(1, Math.round((base[0] * um + s.dmgFlat) * mult));
  s.dmgMax = Math.max(s.dmgMin, Math.round((base[1] * um + s.dmgFlat) * mult));
  s.aps = +(W.aps * (1 + s.ias / 100 + (mastery * 0.03 + (s.weaponType === 'bow' ? sr('quickstring') * 0.10 : 0)) * K)).toFixed(2);
  s.range = W.range;
  s.critChance = Math.min(0.6, 0.05 + s.dex * 0.0015 + s.crit / 100 + marks * 0.02 * K);
  s.critMult = 1.5 + s.critDmg / 100;
  s.spellPower = (1 + s.int * 0.01) * (1 + (W.spell || 0));   // сборка 47: было 0,015
  s.elem = { fire: 1 + s.fire / 100 + sr('heat') * 0.10 * K, cold: 1 + s.cold / 100 + sr('cold') * 0.10 * K, light: 1 + s.light / 100 + sr('static') * 0.10 * K };
  s.res = { fire: Math.min(75, s.resFire), cold: Math.min(75, s.resCold), light: Math.min(75, s.resLight) };
  const C = CLASSES[p.cls || 'warrior']; if (C.block && w && WEAPONS[w.wt].hands === 1) s.block += C.block;
  // gold upgrades from NPCs + citadel trophies
  const U = p.upg || {}; const tr = (p.castle && p.castle.trophy) || 0;
  const DB = { hp: 0, dmg: 0, xp: 0, critDmg: 0, regen: 0, gold: 0 };
  if (p.castle && p.castle.decor) for (const id of Object.values(p.castle.decor)) { const D = DECOR[id]; if (D) for (const k in D.bonus) DB[k] += D.bonus[k]; }
  if (p.nemesis) for (const t of p.nemesis.trophies) { const b = Math.min(3.5, t.bonus); DB.dmg += b; DB.gold += b; }   // С19: старые трофеи сверх 5-го ранга — тоже до +3,5%   // трофеи немезисов
  const codex = Object.keys(p.codex || {}).length; DB.dmg += codex * 0.5;   // коллекция вещей (сборка 21): +0,5% урона и здоровья за запись
  s.decor = DB; s.maxHP = Math.round((s.maxHP + DB.hp) * (1 + codex * 0.005)); s.codex = codex; s.critMult += DB.critDmg / 100; s.mpRegen += DB.regen; s.goldFind += DB.gold;
  { const m = 1 + (U.dmg || 0) * 0.04 + tr * 0.03 + DB.dmg / 100; s.dmgMin = Math.round(s.dmgMin * m); s.dmgMax = Math.round(s.dmgMax * m); s.spellPower *= m; }
  s.maxHP += (U.hp || 0) * 12; s.maxMP += (U.mp || 0) * 10; s.mpRegen += (U.mp || 0) * 0.1; s.hpRegen += (U.regen || 0) * 0.4;
  s.critChance = Math.min(0.75, s.critChance + (U.crit || 0) * 0.006); s.critMult += (U.critDmg || 0) * 0.06;
  s.aps = +(s.aps * (1 + (U.aps || 0) * 0.02)).toFixed(2); s.moveMul = 1 + (U.move || 0) * 0.02; s.goldFind += tr * 5;
  if (G.run && G.run.boons) {   // run-only boons from «Дары Бездны»
    if (hasBoon('giant')) { s.dmgMin = Math.round(s.dmgMin * 1.15); s.dmgMax = Math.round(s.dmgMax * 1.15); s.spellPower *= 1.15; }   // сборка 47: дары скромнее
    if (hasBoon('frenzy')) s.aps = +(s.aps * 1.12).toFixed(2);
    if (hasBoon('eagle')) { s.critChance = Math.min(0.75, s.critChance + 0.05); s.critMult += 0.2; }
    if (hasBoon('vitality')) s.maxHP = Math.round(s.maxHP * 1.15);
    if (hasBoon('glass')) { s.dmgMin = Math.round(s.dmgMin * 1.4); s.dmgMax = Math.round(s.dmgMax * 1.4); s.spellPower *= 1.4; s.maxHP = Math.round(s.maxHP * 0.7); }   // проклятый дар: урон ценой здоровья
    if (hasBoon('bloodpact')) { s.aps = +(s.aps * 1.25).toFixed(2); s.hpRegen = 0; }   // проклятый дар: скорость ценой лечения
  }
  s.block = Math.min(0.5, s.block); s.helpOn = help > 1;
  // сборка 49: «запас прочности» (EHP = здоровье / (1 − снижение урона)) — броня и здоровье в одних единицах; враги на 1 уровень выше героя
  s.ehp = Math.round(s.maxHP / (1 - damageReduction(s.armor, (p.level || 1) + 1)));
  // "DPS" summary used by compare panel
  const avg = (s.dmgMin + s.dmgMax) / 2;
  s.dps = +(avg * s.aps * (1 + s.critChance * (s.critMult - 1))).toFixed(1);
  // spell effectiveness estimate (fireball rank 1 baseline) — for compare deltas
  s.spellDps = +(16 * s.spellPower * ((s.elem.fire + s.elem.cold + s.elem.light) / 3)).toFixed(1);
  return s;
}
// сборка 49, «TTK идёт ступеньками»: сколько ударов оружием нужно на скелета-воина уровнем выше героя (бой длится целое число ударов —
// прибавка к урону заметна, только если убирает удар). Броню врага и крит учитываем в среднем.
export function hitsToKill(s, p) {
  const l = (p.level || 1) + 1, D = ENEMIES.skel_warrior;
  const hp = Math.max(D.hp * scaleHP(l) * 1.2, l >= 3 ? 88 + 12 * l : 0), arm = (D.armor || 0) * (1 + 0.15 * (l - 1));   // как в entities.js
  const hit = (s.dmgMin + s.dmgMax) / 2 * (1 + s.critChance * (s.critMult - 1)) * (1 - 0.9 * arm / (arm + 50 + 10 * (p.level || 1)));
  return Math.max(1, Math.ceil(hp / Math.max(1, hit)));
}
// С36: временное усиление (подмога Ордена) кончается ровно по таймеру — раньше держалось до следующего пересчёта характеристик
{ const t = setInterval(() => { const P = G.profile; if (!P || !G.stats || !P.attrs) return; if (!!G.stats.helpOn !== !!(P.boosts && P.boosts.helpUntil > Date.now())) { G.stats = stats(P); bus.emit('statsChanged'); } }, 1000); if (t.unref) t.unref(); }
export const damageReduction = (armor, enemyLvl) => armor / (armor + 50 + 10 * enemyLvl);

export function meetsReq(p, it, st) {
  if (!it.req) return true; st = st || stats(p);
  for (const k in it.req) if ((p.attrs[k] + (st[k] - p.attrs[k])) < it.req[k]) return false;
  return true;
}
// Stat comparison: equip candidate in given slot, return list of [label, before, after, better?]
export function compare(p, item, slot) {
  const a = stats(p);
  const g = { ...p.gear, [slot]: item };
  const b = stats(p, g);
  const rows = [
    ['Урон в секунду', a.dps, b.dps], ['Урон', `${a.dmgMin}–${a.dmgMax}`, `${b.dmgMin}–${b.dmgMax}`, (b.dmgMin + b.dmgMax) - (a.dmgMin + a.dmgMax)],
    ['Скорость атаки', a.aps, b.aps], ['Шанс крита', Math.round(a.critChance * 100), Math.round(b.critChance * 100), null, '%'],
    ['Защита', a.armor, b.armor], ['Здоровье', a.maxHP, b.maxHP], ['Запас прочности', a.ehp, b.ehp],
    ['Ударов на скелета', hitsToKill(a, p), hitsToKill(b, p), hitsToKill(a, p) - hitsToKill(b, p), '', true], ['Мана', a.maxMP, b.maxMP],
    ['Сила заклинаний', Math.round(a.spellPower * 100), Math.round(b.spellPower * 100), null, '%'],
    ['Сила', a.str, b.str], ['Ловкость', a.dex, b.dex], ['Интеллект', a.int, b.int], ['Живучесть', a.vit, b.vit],
    ['Находка золота', a.goldFind, b.goldFind, null, '%'],
  ];
  return rows.map(([l, x, y, d, suf, inv]) => ({ label: l, before: x, after: y, delta: d != null ? d : (typeof x === 'number' ? +(y - x).toFixed(2) : 0), suf: suf || '', inv: !!inv }))
    .filter(r => r.delta !== 0 || r.label === 'Урон в секунду' || r.label === 'Защита');
}
// "Usefulness" score for sorting & upgrade arrows
export function usefulness(p, item) {
  // стрелка «лучше/хуже» считается по тому же, что видит игрок: урон в секунду (для мага — ещё и сила заклинаний), защита, здоровье
  const slot = item.slot;
  const a = stats(p); const g = { ...p.gear, [slot]: item };
  const b = stats(p, g);
  const dpsK = (b.dps / Math.max(1, a.dps) - 1) * 100;
  // П33: у мага посох почти не меняет силу заклинаний, и max(урон, заклинания) давал 0 у любого посоха хуже надетого — стрелки не было.
  // Теперь урон и заклинания складываются поровну: хуже посох — ▼, лучше — ▲
  const main = p.cls === 'mage' ? (dpsK + (b.spellDps / Math.max(1, a.spellDps) - 1) * 100) / 2 : dpsK;
  if (slot === 'weapon') return main;
  return main + (b.ehp / Math.max(1, a.ehp) - 1) * 100 + (b.maxMP - a.maxMP) * 0.1;   // сборка 49: броня и здоровье — через запас прочности, в % как и урон
}
