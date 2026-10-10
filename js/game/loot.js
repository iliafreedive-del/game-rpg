// Loot & progression: drops on the ground, proximity pickup (single credit), XP/levels, chest contents.
import { streakGoldMul } from './streak.js';
import { rm, circleRew } from './season.js';
import { G, bus } from './ctx.js';
import { makeItem, sellValue, makeSetItem, pickSet } from './items.js';
import { EPICS } from '../data/items.js';
import { ENEMIES, scaleXP } from '../data/enemies.js';
import { xpToNext, stats } from './stats.js';
import { rand, rint, weighted, pick, uid } from '../core/util.js';
import { float, particles } from './combat.js';

// Сила источника за рекламу (сборка 47 — урезано по просьбе пользователя): было +50% золота и опыта, +25% вещей
const BLESS_MUL = 1.25, BLESS_ITEMS = 1.15;
const goldMul = () => rm('gold') * (G.run && G.run.boons && G.run.boons.includes('greed') ? 1.25 : 1) * (1 + G.stats.goldFind / 100) * (G.profile.boosts.goldUntil > Date.now() ? 1.5 : G.profile.boosts.blessUntil > Date.now() ? BLESS_MUL : 1) * (G.profile.iap.goldPerk ? 1.25 : 1) * streakGoldMul();
export const xpMul = () => rm('xp') * (G.profile.boosts.xpUntil > Date.now() ? 1.5 : G.profile.boosts.blessUntil > Date.now() ? BLESS_MUL : 1) * (1 + ((G.stats && G.stats.decor && G.stats.decor.xp) || 0) / 100);

export function dropGold(x, y, amount) {
  amount = Math.max(1, Math.round(amount * goldMul()));
  const a = rand() * Math.PI * 2, r = 0.3 + rand() * 0.7;
  G.pickups.push({ id: uid('g'), kind: 'gold', amount, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, t: 0, taken: false, fly: true });
}
// сборка 49: история вещи — где и с кого добыта (показывается в карточке вещи)
const PLACE = { catacombs: 'Катакомбы', castle: 'Цитадель', survival: 'Жатва Бездны', town: 'Тихий Брод' };
export const placeName = () => G.zoneId === 'depths' && G.run ? (G.run.floor ? `Глубины, этаж ${G.run.floor}` : 'Глубины') : G.zoneId === 'wild' && G.wild ? `Поход, глубина ${G.wild.depth || 1}` : PLACE[G.zoneId] || '';
export const stamp = (item, who, extra) => { if (item && !item.from) item.from = { who, where: placeName(), t: Date.now(), ...extra }; return item; };
export function dropItem(x, y, item) {
  const a = rand() * Math.PI * 2, r = 0.4 + rand() * 0.8;
  let px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
  if (!G.zone.map.free(px, py, 0.1)) { px = x; py = y; }
  G.pickups.push({ id: uid('d'), kind: 'item', item, x: px, y: py, t: 0, taken: false, fly: true });
  if (item.rarity >= 2) bus.emit('sfx', item.rarity === 3 ? 'epicDrop' : 'rareDrop');
}
export function dropPotion(x, y, kind = 'hp') { G.pickups.push({ id: uid('p'), kind: 'potion', potion: kind, x: x + rand() - 0.5, y: y + rand() - 0.5, t: 0, taken: false, fly: true }); }

const rollRarity = table => weighted(table.map((w, i) => [i, w]));
export function enemyLoot(e) {
  // Items come only from quests, contracts and the shop (design decision: fewer, meaningful rewards).
  const D = e.D, L = e.lvl;
  const piles = D.boss ? 6 : D.elite ? 4 : e.champion ? 2 : (rand() < 0.6 ? 1 : 0);
  for (let i = 0; i < piles; i++) dropGold(e.x, e.y, rint(D.gold[0], D.gold[1]) * (1 + 0.12 * (L - 1)) * 0.75 / (D.boss || D.elite ? piles / 2 : 1));   // сборка 47: золота −25%
  if (rand() < (D.boss ? 1 : D.elite ? 0.35 : e.champion ? 0.2 : 0.015)) dropPotion(e.x, e.y, rand() < 0.7 ? 'hp' : 'mp');
  // вещи: редкие и заметные. Рядовой враг почти никогда, чемпион — иногда, страж и босс — всегда
  const ch = (D.boss ? 1 : D.elite ? 0.5 : e.champion ? 0.12 : G.zoneId === 'wild' ? 0.03 : 0.025) / (e.respawned ? 3 : 1) * (G.profile.boosts.blessUntil > Date.now() ? BLESS_ITEMS : 1) * rm('items') * (1 + 0.05 * ((G.run && G.run.circle) || 0));
  // сборка 20: серого больше — сырьё для слияния у кузнеца. Благословение — +15% вещей; «Орда» недели — ×2; возрождённые (respawn.js) — втрое реже; круг Бездны — +5% за круг
  // таблицы: серый / зелёный / синий / золотой. Сборка 47: вещей втрое меньше, зелёные — редкость (жалоба «шмота как грязи»)
  // сборка 49, защита от неудач: без вещи 70 убийств подряд — следующий враг роняет вещь наверняка (возрождённые не в счёт)
  const lk = luck(); if (!e.respawned) lk.dry++;
  if (rand() < ch || lk.dry >= DRY_PITY) { lk.dry = 0; dropItem(e.x, e.y, stamp(rollDrop(L + (D.boss || D.elite ? 1 : 0), D.boss ? [30, 55, 13, 2] : D.elite ? [60, 36, 4, 0] : e.champion ? [85, 15, 0, 0] : [97, 3, 0, 0], D.boss || D.elite), e.name)); }   // сборка 47: зелёное и синее реже, цвет поднимается слиянием у кузнеца
}
// Защита от неудач (сборка 49, скрытая): 20 серых вещей подряд — следующая зелёная (10 давало зелёных почти вчетверо больше); 4 добычи стража/босса без синей — следующая синяя
const DRY_PITY = 70, GREY_PITY = 20, BIG_PITY = 4;
const luck = () => G.profile.luck || (G.profile.luck = { dry: 0, grey: 0, big: 0 });
export function rollDrop(ilvl, table, big) {
  const P = G.profile, lk = luck(); let r = rollRarity(table);
  if (r === 0 && lk.grey + 1 >= GREY_PITY) r = 1;
  if (big && r < 2 && lk.big + 1 >= BIG_PITY) r = 2;
  lk.grey = r === 0 ? lk.grey + 1 : 0; if (big) lk.big = r < 2 ? lk.big + 1 : 0;
  if (r >= 3) return makeItem({ epic: pickEpic(P.cls), ilvl, cls: P.cls });
  if (r === 2 && P.level >= 10 && rand() < 0.3) return makeSetItem(pickSet(P.cls), null, ilvl, P.cls);   // часть синих — части сетов (с 6 уровня)
  return makeItem({ ilvl, rarity: r, cls: P.cls });
}
export function pickEpic(cls) {
  cls = cls || G.profile.cls || 'warrior';
  const bases = { warrior: ['knight_sword'], archer: ['long_bow'], mage: ['rune_staff'] }[cls];
  const pool = EPICS.filter(e => bases.includes(e.base));
  return pick(pool);
}
export function chestLoot(x, y, rich, lvl, id) {
  const n0 = G.pickups.length;
  chestLoot0(x, y, rich, lvl, id);
  for (let i = n0; i < G.pickups.length; i++) G.pickups[i].fly = true;
}
function chestLoot0(x, y, rich, lvl, id) {
  for (let i = 0; i < (rich ? 5 : 3); i++) dropGold(x, y, rint(3, 7) * (1 + 0.15 * (lvl - 1)));
  if (rand() < (rich ? 0.6 : 0.15)) dropPotion(x, y, rand() < 0.75 ? 'hp' : 'mp');
  if (rand() < (rich ? 0.35 : 0.06)) dropItem(x, y + 0.2, stamp(rollDrop(lvl, rich ? [60, 36, 4, 0] : [95, 5, 0, 0]), rich ? 'Сундук Ордена' : 'Сундук'));
  if (rich && G.profile.level >= 10 && rand() < 0.1) dropItem(x + 0.3, y + 0.4, makeSetItem(pickSet(G.profile.cls), null, lvl, G.profile.cls));   // сундук Ордена — шанс части сета
}

// pickups (сборка 38): всё, что выпало с мобов и из сундуков, само летит в сумку; сумка полна — вещь лежит на земле и красное уведомление
export function updatePickups(dt) {
  const P = G.player; if (!P || P.dead) return;
  const prof = G.profile, room = prof.bag.length < prof.bagSize;
  for (const p of G.pickups) {
    if (p.taken) continue; p.t += dt;
    if (p.t < 0.35) continue;  // let the drop settle
    if (p.kind === 'item' && p.wait) { if (!room) continue; p.wait = false; p.fly = true; }   // место освободилось — вещь снова летит к герою
    const d = Math.hypot(p.x - P.x, p.y - P.y);
    const reach = p.kind === 'gold' ? 1.6 : 1.1;
    if (p.fly || d < 3.2) { const k = Math.min(1, dt * 9 / Math.max(0.3, d)); p.x += (P.x - p.x) * k; p.y += (P.y - p.y) * k; }
    if (d > reach) continue;
    if (p.kind === 'gold' && G.zoneId === 'wild' && G.wild && !G.wild.done) {   // поход: золото идёт в ношу (см. nemesis.js)
      p.taken = true; G.wild.carry = (G.wild.carry || 0) + p.amount; G.wild.refresh && G.wild.refresh();
      float(P.x, P.y, '+' + p.amount + ' в ноше', '#ffb85a', { z: 2.3, life: 0.8 }); bus.emit('sfx', 'coin');
    } else if (p.kind === 'gold') {
      p.taken = true; prof.gold += p.amount; prof.stats.gold += p.amount;
      bus.emit('gold', p.amount); float(P.x, P.y, '+' + p.amount + ' зол.', '#ffd45a', { z: 2.3, life: 0.8 }); bus.emit('sfx', 'coin');
    } else if (p.kind === 'potion') {
      p.taken = true; prof.potions[p.potion]++; float(P.x, P.y, p.potion === 'hp' ? '+ Зелье здоровья' : '+ Зелье маны', '#ff8f8f', { z: 2.3 }); bus.emit('sfx', 'potionPick'); bus.emit('hud');
    } else if (p.kind === 'item') {
      if (prof.bag.length >= prof.bagSize) {   // сумка полна: вещь остаётся на земле, пока не освободится место
        p.fly = false; p.wait = true;
        if (!G.bagWarnT || G.time - G.bagWarnT > 4) { G.bagWarnT = G.time; bus.emit('bagFull'); bus.emit('sfx', 'deny'); }
        continue;
      }
      p.taken = true; p.item.isNew = true; prof.bag.push(p.item); bus.emit('itemPicked', p.item); bus.emit('sfx', 'pickup');
    }
  }
  for (let i = G.pickups.length - 1; i >= 0; i--) if (G.pickups[i].taken) G.pickups.splice(i, 1);
}

// ------------------------------------------------------------------ XP & levels
import { GROWTH } from '../data/items.js';
export function autoGrow(P, n = 1) { const g = GROWTH[P.cls || 'warrior']; for (const k in g) P.attrs[k] += g[k] * n; }
export function gainXP(n, x, y) {
  const P = G.profile; n = Math.round(n * xpMul()); if (n <= 0) return;
  P.xp += n; if (x != null) float(x, y, '+' + n + ' опыта', '#b8e3ff', { z: 2.6, life: 0.8 });
  let up = 0;
  while (P.xp >= xpToNext(P.level) && P.level < 50) { P.xp -= xpToNext(P.level); P.level++; autoGrow(P); P.skillPts += 1; up++; }
  if (up) {
    G.stats = stats(P); G.player.hp = G.stats.maxHP; G.player.mp = G.stats.maxMP;
    particles(G.player.x, G.player.y, 30, { c: [255, 220, 120], z: 0.2, sp: 1.2, vz: 4, g: 1, size: 4, life: 1.2 });
    bus.emit('levelUp', P.level); bus.emit('sfx', 'levelup');
  }
  bus.emit('hud');
}
// сборка 47 (как в Diablo II): герой выше врага — опыта меньше: на 1 ур. ×0,8, на 2 ×0,55, на 3 ×0,3, на 4 ×0,15, дальше ×0,05.
// Враги идут на уровень выше героя, пока не упрутся в потолок зоны (progress.js bandLevel) — перекачавшись, герой здесь почти не растёт
const OVER = [1, 0.8, 0.55, 0.3, 0.15, 0.05];
export const overPenalty = (hero, mob) => OVER[Math.min(OVER.length - 1, Math.max(0, hero - mob))];
// П57: опыт за врагов ×0,8 — «прокачка слишком быстрая»
export const KILL_XP_K = 0.8;
export function killXP(e) { return Math.round(e.D.xp * scaleXP(e.lvl) * (e.champion ? 2.5 : 1) * overPenalty(G.profile.level, e.lvl) * KILL_XP_K * (e.repeat ? 0.5 : 1)); }
