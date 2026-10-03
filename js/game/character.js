// Character management: equipment, attribute points, skill tree learning & slots.
import { G, bus } from './ctx.js';
import { WEAPONS, CLASSES, SLOTS } from '../data/items.js';
import { SKILLS, BRANCHES, unlockLevel } from '../data/skills.js';
import { stats, meetsReq, usefulness, compare } from './stats.js';
import { sellValue } from './items.js';

const recalc = () => { const P = G.profile; const old = G.stats; G.stats = stats(P); if (G.player && old) { G.player.hp = Math.min(G.stats.maxHP, G.player.hp * G.stats.maxHP / old.maxHP); G.player.mp = Math.min(G.stats.maxMP, G.player.mp); } bus.emit('statsChanged'); bus.emit('hud'); bus.emit('save'); };

export function slotFor(it) {
  const g = G.profile.gear;
  return it.slot;
}
export function canEquip(it) {
  const C = CLASSES[G.profile.cls || 'warrior'];
  if (!SLOTS.includes(it.slot)) return { ok: false, why: 'Этот предмет не используется' };
  if (it.wt && !C.weapons.includes(it.wt)) return { ok: false, why: `${C.name} не владеет этим оружием` };
  if (!meetsReq(G.profile, it, G.stats)) { const r = Object.entries(it.req).map(([k, v]) => `${ATTR_NAMES[k]} ${v}`).join(', '); return { ok: false, why: `Требуется: ${r}` }; }
  return { ok: true };
}
export const ATTR_NAMES = { str: 'Сила', dex: 'Ловкость', int: 'Интеллект', vit: 'Живучесть' };
export function equip(id, slotOverride) {
  const P = G.profile; const i = P.bag.findIndex(x => x.id === id); if (i < 0) return false;
  const it = P.bag[i]; const c = canEquip(it); if (!c.ok) { bus.emit('toast', { text: c.why, kind: 'warn' }); bus.emit('sfx', 'deny'); return false; }
  const slot = slotOverride || slotFor(it);
  P.bag.splice(i, 1); it.isNew = false;
  const back = [];
  if (P.gear[slot]) back.push(P.gear[slot]);
  P.gear[slot] = it;
  for (const b of back) P.bag.splice(Math.min(i, P.bag.length), 0, b);
  bus.emit('sfx', 'equip'); bus.emit('equipChanged', slot); recalc(); return true;
}
export function unequip(slot) {
  const P = G.profile; const it = P.gear[slot]; if (!it) return false;
  if (P.bag.length >= P.bagSize) { bus.emit('toast', { text: 'Сумка полна', kind: 'warn' }); return false; }
  P.gear[slot] = null; P.bag.push(it); bus.emit('sfx', 'equip'); bus.emit('equipChanged', slot); recalc(); return true;
}
export const attrCost = () => 5 + 5 * G.profile.level;
// сборка 20: первый навык бесплатно, каждый следующий новый — вдвое дороже (25, 50, 100, 200…; 10-й ≈ 13 тыс.);
// ранг уже изученного навыка — в 1,5 раза дороже предыдущего ранга, база растёт на 10% за уровень героя
export const skillCost = id => {
  const P = G.profile, n = Object.values(P.skills).filter(Boolean).length, r = P.skills[id] || 0;
  if (!r) return n === 0 ? 0 : Math.round(25 * Math.pow(2, n - 1));
  return Math.round(30 * Math.pow(1.5, r) * Math.pow(1.1, P.level - 1));
};
export function addAttr(k, n = 1, pay = false) {
  const P = G.profile; n = Math.min(n, P.attrPts); if (n <= 0) return false;
  if (pay) { const c = attrCost() * n; if (P.gold < c) { bus.emit('toast', { text: `Нужно ${c} золота`, sub: 'Соберите золото в катакомбах', kind: 'warn' }); bus.emit('sfx', 'deny'); return false; } P.gold -= c; bus.emit('sfx', 'coin'); }
  P.attrs[k] += n; P.attrPts -= n; recalc(); return true;
}
// ---- skills
export const branchPoints = b => Object.entries(G.profile.skills).filter(([k]) => SKILLS[k].b === b).reduce((a, [, v]) => a + v, 0);
export function canLearn(id) {
  const P = G.profile, s = SKILLS[id], r = P.skills[id] || 0;
  if (!CLASSES[P.cls || 'warrior'].branches.includes(s.b)) return { ok: false, why: 'Недоступно вашему классу' };
  if (r >= s.max) return { ok: false, why: 'Максимальный уровень' };
  if (P.skillPts <= 0) return { ok: false, why: 'Нет очков навыков' };
  if (s.req && (P.skills[s.req[0]] || 0) < s.req[1]) return { ok: false, why: `Нужно: «${SKILLS[s.req[0]].name}» ${s.req[1]}+` };
  if (s.branchPts && branchPoints(s.b) < s.branchPts) return { ok: false, why: `Нужно ${s.branchPts} очков в ветке` };
  const lvReq = unlockLevel(P.cls || 'warrior', id) + r;   // сборка 20: свой уровень открытия у каждого навыка (data/skills.js), +1 за каждый ранг
  if (P.level < lvReq) return { ok: false, why: `Нужен уровень ${lvReq}` };
  return { ok: true };
}
export function learn(id, pay = false, first = false) {
  const c = first ? (G.profile.skillPts > 0 ? { ok: true } : { ok: false, why: 'Нет очков навыков' }) : canLearn(id); if (!c.ok) { bus.emit('toast', { text: c.why, kind: 'warn' }); bus.emit('sfx', 'deny'); return false; }
  const P = G.profile;
  if (pay) { const cost = skillCost(id); if (P.gold < cost) { bus.emit('toast', { text: `Урок стоит ${cost} золота`, sub: 'Соберите золото в катакомбах', kind: 'warn' }); bus.emit('sfx', 'deny'); return false; } P.gold -= cost; } P.skills[id] = (P.skills[id] || 0) + 1; P.skillPts--;
  if (SKILLS[id].kind === 'active' && !P.slots.includes(id)) { const e = P.slots.indexOf(null); if (e >= 0) { P.slots[e] = id; setTimeout(() => bus.emit('skillSlotted', { id, i: e }), 0); } }
  bus.emit('sfx', 'learn'); recalc(); bus.emit('skillsChanged'); return true;
}
export function grantSkill(id) {   // free lesson from the trainer: bypasses prerequisites
  const P = G.profile; P.skills[id] = Math.max(1, P.skills[id] || 0);
  if (SKILLS[id].kind === 'active' && !P.slots.includes(id)) { const e = P.slots.indexOf(null); if (e >= 0) { P.slots[e] = id; setTimeout(() => bus.emit('skillSlotted', { id, i: e }), 0); } }
  bus.emit('sfx', 'learn'); recalc(); bus.emit('skillsChanged');
}
export function setSlot(i, id) { const P = G.profile; const j = P.slots.indexOf(id); if (j >= 0) P.slots[j] = P.slots[i]; P.slots[i] = id; bus.emit('skillsChanged'); bus.emit('save'); }
export { BRANCHES };

// One-step gear flow for a browser game: new item goes straight onto the hero if it's better;
// the replaced (or worse) piece is sold automatically. No inventory juggling.
// Награда не продаётся и не надевается молча: пустой слот — надеваем, иначе вещь идёт в сумку, а окно награды предлагает «Надеть» / «В сумку» с сравнением
export function autoEquip(it, force) {
  const P = G.profile, slot = it.slot, old = P.gear[slot]; const e = { item: it };
  const ok = canEquip(it).ok;
  if (ok && (!old || force)) { P.gear[slot] = it; e.equipped = true; if (old) { old.isNew = true; if (P.bag.length < P.bagSize) P.bag.push(old); else P.gold += sellValue(old); } recalc(); bus.emit('equipChanged', slot); }
  else { it.isNew = true; if (P.bag.length < P.bagSize) { P.bag.push(it); e.bagged = true; } else { const v = sellValue(it); P.gold += v; e.sold = v; e.soldNew = true; } bus.emit('hud'); }
  if (old && !e.equipped) { e.old = old; e.cmp = compare(P, it, slot).slice(0, 4); }
  return e;
}
// надеть вещь из сумки: прежняя уходит в сумку
export function equipFromBag(it) {
  const P = G.profile, i = P.bag.indexOf(it); if (i < 0) return false; const old = P.gear[it.slot];
  P.gear[it.slot] = it; P.bag.splice(i, 1); if (old) { old.isNew = true; P.bag.push(old); }
  it.isNew = false; recalc(); bus.emit('equipChanged', it.slot); bus.emit('sfx', 'equip'); bus.emit('hud'); return true;
}
