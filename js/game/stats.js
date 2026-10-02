// Derived character stats from attributes, gear and skills. Pure: stats(profile) → object.
import { WEAPONS, CLASSES } from '../data/items.js';
import { SKILLS } from '../data/skills.js';
import { upgMult } from './items.js';
import { G } from './ctx.js';
import { DECOR } from '../data/upgrades.js';
export const hasBoon = id => !!(G.run && G.run.boons && G.run.boons.includes(id));

export const xpToNext = l => Math.round(60 * Math.pow(l, 1.6));
export const rank = (p, id) => p.skills[id] || 0;

export function branchBonus(p, branch) {
  let n = 0;
  for (const it of Object.values(p.gear)) if (it) for (const a of it.affixes) if (a.k === 'skill' && a.b === branch) n += a.v;
  return n;
}
// effective rank = learned rank + item bonus (only if learned)
export function effRank(p, id) { const r = rank(p, id); return r ? r + branchBonus(p, SKILLS[id].b) : 0; }

export function stats(p, gearOverride) {
  const gear = gearOverride || p.gear;
  const s = { str: p.attrs.str, dex: p.attrs.dex, int: p.attrs.int, vit: p.attrs.vit,
    dmgPct: 0, dmgFlat: 0, ias: 0, crit: 0, critDmg: 0, armor: 0, hp: 0, mp: 0, fire: 0, cold: 0, light: 0,
    resFire: 0, resCold: 0, resLight: 0, regen: 0, leech: 0, goldFind: 0, block: 0, effects: {} };
  let armorItems = 0;
  for (const [slot, it] of Object.entries(gear)) {
    if (!it) continue;
    let arm = (it.armor || 0) * upgMult(it), armPct = 0;
    for (const a of it.affixes) {
      if (a.k === 'armorPct') armPct += a.v;
      else if (a.k === 'resAll') { s.resFire += a.v; s.resCold += a.v; s.resLight += a.v; }
      else if (a.k === 'skill') { }
      else if (a.k in s) s[a.k] += a.v;
    }
    armorItems += arm * (1 + armPct / 100);
    if (it.block) s.block += it.block;
    if (it.effect) s.effects[it.effect] = true;
  }
  const w = gear.weapon; const W = w ? WEAPONS[w.wt] : WEAPONS.sword;
  s.weaponType = w ? w.wt : 'fist';
  s.ranged = !!W.projectile;
  s.melee = !W.projectile;
  // skills
  const sr = id => effRank({ ...p, gear }, id);
  const mastery = s.melee ? sr('blade_mastery') : 0;
  const marks = s.weaponType === 'bow' ? sr('marksman') : 0;
  s.armor = Math.round(armorItems + s.armor + s.dex * 0.5 + sr('ice_armor') * 12);
  s.level = p.level;
  s.maxHP = Math.round(40 + s.vit * 5 + p.level * 6 + s.hp);
  s.maxMP = Math.round(20 + s.int * 3 + p.level * 2 + s.mp);
  s.hpRegen = 0.4 + s.vit * 0.03;
  s.mpRegen = 0.8 + s.int * 0.04 + s.regen;
  // weapon damage
  const base = w ? w.dmg : [1, 3];
  const um = w ? upgMult(w) : 1;
  const attr = W.scale === 'str' ? s.str : W.scale === 'dex' ? s.dex : s.int;
  const attrMult = 1 + attr * (W.scale === 'int' ? 0.025 : 0.02);
  const mult = attrMult * (1 + s.dmgPct / 100) * (1 + mastery * 0.08 + marks * 0.08);
  s.dmgMin = Math.max(1, Math.round((base[0] * um + s.dmgFlat) * mult));
  s.dmgMax = Math.max(s.dmgMin, Math.round((base[1] * um + s.dmgFlat) * mult));
  s.aps = +(W.aps * (1 + s.ias / 100 + mastery * 0.03 + (s.weaponType === 'bow' ? sr('quickstring') * 0.10 : 0))).toFixed(2);
  s.range = W.range;
  s.critChance = Math.min(0.6, 0.05 + s.dex * 0.0015 + s.crit / 100 + marks * 0.02);
  s.critMult = 1.5 + s.critDmg / 100;
  s.spellPower = (1 + s.int * 0.015) * (1 + (W.spell || 0));
  s.elem = { fire: 1 + s.fire / 100 + sr('heat') * 0.10, cold: 1 + s.cold / 100 + sr('cold') * 0.10, light: 1 + s.light / 100 + sr('static') * 0.10 };
  s.res = { fire: Math.min(75, s.resFire), cold: Math.min(75, s.resCold), light: Math.min(75, s.resLight) };
  const C = CLASSES[p.cls || 'warrior']; if (C.block && w && WEAPONS[w.wt].hands === 1) s.block += C.block;
  // gold upgrades from NPCs + citadel trophies
  const U = p.upg || {}; const tr = (p.castle && p.castle.trophy) || 0;
  const DB = { hp: 0, dmg: 0, xp: 0, critDmg: 0, regen: 0, gold: 0 };
  if (p.castle && p.castle.decor) for (const id of Object.values(p.castle.decor)) { const D = DECOR[id]; if (D) for (const k in D.bonus) DB[k] += D.bonus[k]; }
  if (p.nemesis) for (const t of p.nemesis.trophies) { DB.dmg += t.bonus; DB.gold += t.bonus; }   // трофеи немезисов
  s.decor = DB; s.maxHP += DB.hp; s.critMult += DB.critDmg / 100; s.mpRegen += DB.regen; s.goldFind += DB.gold;
  { const m = 1 + (U.dmg || 0) * 0.04 + tr * 0.03 + DB.dmg / 100; s.dmgMin = Math.round(s.dmgMin * m); s.dmgMax = Math.round(s.dmgMax * m); s.spellPower *= m; }
  s.maxHP += (U.hp || 0) * 12; s.maxMP += (U.mp || 0) * 8; s.hpRegen += (U.regen || 0) * 0.4;
  s.critChance = Math.min(0.75, s.critChance + (U.crit || 0) * 0.006); s.critMult += (U.critDmg || 0) * 0.06;
  s.aps = +(s.aps * (1 + (U.aps || 0) * 0.02)).toFixed(2); s.moveMul = 1 + (U.move || 0) * 0.02; s.goldFind += tr * 5;
  if (G.run && G.run.boons) {   // run-only boons from «Дары Бездны»
    if (hasBoon('giant')) { s.dmgMin = Math.round(s.dmgMin * 1.4); s.dmgMax = Math.round(s.dmgMax * 1.4); s.spellPower *= 1.4; }
    if (hasBoon('frenzy')) s.aps = +(s.aps * 1.35).toFixed(2);
    if (hasBoon('eagle')) { s.critChance = Math.min(0.75, s.critChance + 0.15); s.critMult += 0.5; }
    if (hasBoon('vitality')) s.maxHP = Math.round(s.maxHP * 1.3);
  }
  s.block = Math.min(0.5, s.block);
  // "DPS" summary used by compare panel
  const avg = (s.dmgMin + s.dmgMax) / 2;
  s.dps = +(avg * s.aps * (1 + s.critChance * (s.critMult - 1))).toFixed(1);
  // spell effectiveness estimate (fireball rank 1 baseline) — for compare deltas
  s.spellDps = +(16 * s.spellPower * ((s.elem.fire + s.elem.cold + s.elem.light) / 3)).toFixed(1);
  return s;
}
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
    ['Защита', a.armor, b.armor], ['Здоровье', a.maxHP, b.maxHP], ['Мана', a.maxMP, b.maxMP],
    ['Сила заклинаний', Math.round(a.spellPower * 100), Math.round(b.spellPower * 100), null, '%'],
    ['Сила', a.str, b.str], ['Ловкость', a.dex, b.dex], ['Интеллект', a.int, b.int], ['Живучесть', a.vit, b.vit],
    ['Сопр. огню', a.res.fire, b.res.fire], ['Сопр. холоду', a.res.cold, b.res.cold], ['Сопр. молнии', a.res.light, b.res.light],
    ['Находка золота', a.goldFind, b.goldFind, null, '%'],
  ];
  return rows.map(([l, x, y, d, suf]) => ({ label: l, before: x, after: y, delta: d != null ? d : (typeof x === 'number' ? +(y - x).toFixed(2) : 0), suf: suf || '' }))
    .filter(r => r.delta !== 0 || r.label === 'Урон в секунду' || r.label === 'Защита');
}
// "Usefulness" score for sorting & upgrade arrows
export function usefulness(p, item) {
  const slot = item.slot;
  const a = stats(p); const g = { ...p.gear, [slot]: item };
  const b = stats(p, g);
  const main = Math.max(b.dps / Math.max(1, a.dps), b.spellDps / Math.max(1, a.spellDps));
  return (main - 1) * 100 + (b.armor - a.armor) * 0.6 + (b.maxHP - a.maxHP) * 0.25 + (b.maxMP - a.maxMP) * 0.1;
}
