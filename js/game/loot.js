// Loot & progression: drops on the ground, proximity pickup (single credit), XP/levels, chest contents.
import { G, bus } from './ctx.js';
import { makeItem, sellValue, makeSetItem, pickSet } from './items.js';
import { EPICS } from '../data/items.js';
import { ENEMIES, scaleXP } from '../data/enemies.js';
import { xpToNext, stats } from './stats.js';
import { rand, rint, weighted, pick, uid } from '../core/util.js';
import { float, particles } from './combat.js';

const goldMul = () => (G.run && G.run.boons && G.run.boons.includes('greed') ? 1.6 : 1) * (1 + G.stats.goldFind / 100) * (G.profile.boosts.goldUntil > Date.now() || G.profile.boosts.blessUntil > Date.now() ? 1.5 : 1) * (G.profile.iap.goldPerk ? 1.25 : 1);
export const xpMul = () => (G.profile.boosts.xpUntil > Date.now() || G.profile.boosts.blessUntil > Date.now() ? 1.5 : 1) * (1 + ((G.stats && G.stats.decor && G.stats.decor.xp) || 0) / 100);

export function dropGold(x, y, amount) {
  amount = Math.max(1, Math.round(amount * goldMul()));
  const a = rand() * Math.PI * 2, r = 0.3 + rand() * 0.7;
  G.pickups.push({ id: uid('g'), kind: 'gold', amount, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, t: 0, taken: false });
}
export function dropItem(x, y, item) {
  const a = rand() * Math.PI * 2, r = 0.4 + rand() * 0.8;
  let px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
  if (!G.zone.map.free(px, py, 0.1)) { px = x; py = y; }
  G.pickups.push({ id: uid('d'), kind: 'item', item, x: px, y: py, t: 0, taken: false });
  if (item.rarity >= 2) bus.emit('sfx', item.rarity === 3 ? 'epicDrop' : 'rareDrop');
}
export function dropPotion(x, y, kind = 'hp') { G.pickups.push({ id: uid('p'), kind: 'potion', potion: kind, x: x + rand() - 0.5, y: y + rand() - 0.5, t: 0, taken: false }); }

const rollRarity = table => weighted(table.map((w, i) => [i, w]));
export function enemyLoot(e) {
  // Items come only from quests, contracts and the shop (design decision: fewer, meaningful rewards).
  const D = e.D, L = e.lvl;
  const piles = D.boss ? 6 : D.elite ? 4 : e.champion ? 2 : (rand() < 0.6 ? 1 : 0);
  for (let i = 0; i < piles; i++) dropGold(e.x, e.y, rint(D.gold[0], D.gold[1]) * (1 + 0.12 * (L - 1)) / (D.boss || D.elite ? piles / 2 : 1));
  if (rand() < (D.boss ? 1 : D.elite ? 0.7 : e.champion ? 0.5 : 0.06)) dropPotion(e.x, e.y, rand() < 0.7 ? 'hp' : 'mp');
  // вещи: редкие и заметные. Рядовой враг почти никогда, чемпион — иногда, страж и босс — всегда
  const ch = (D.boss ? 1 : D.elite ? 0.8 : e.champion ? 0.25 : G.zoneId === 'wild' ? 0.08 : 0.06)   // сборка 20: серого больше — сырьё для слияния у кузнеца / (e.respawned ? 3 : 1) * (G.profile.boosts.blessUntil > Date.now() ? 1.25 : 1);   // благословение богини — +25% вещей   // возрождённые (respawn.js) — втрое реже
  // таблицы: серый / зелёный / синий / золотой. Рядовые враги почти всегда дают серое
  if (rand() < ch) dropItem(e.x, e.y, rollDrop(L + (D.boss || D.elite ? 1 : 0), D.boss ? [8, 47, 38, 7] : D.elite ? [30, 50, 19, 1] : e.champion ? [55, 38, 7, 0] : [93, 6, 1, 0]));
}
export function rollDrop(ilvl, table) {
  const P = G.profile, r = rollRarity(table);
  if (r >= 3) return makeItem({ epic: pickEpic(P.cls), ilvl, cls: P.cls });
  if (r === 2 && P.level >= 6 && rand() < 0.3) return makeSetItem(pickSet(P.cls), null, ilvl, P.cls);   // часть синих — части сетов (с 6 уровня)
  return makeItem({ ilvl, rarity: r, cls: P.cls });
}
export function pickEpic(cls) {
  cls = cls || G.profile.cls || 'warrior';
  const bases = { warrior: ['knight_sword', 'war_axe'], archer: ['long_bow'], mage: ['rune_staff'] }[cls];
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
  if (rich || rand() < 0.5) dropPotion(x, y, rand() < 0.75 ? 'hp' : 'mp');
  if (rich && rand() < 0.5) dropPotion(x, y, 'hp');
  if (rand() < (rich ? 0.6 : 0.15)) dropItem(x, y + 0.2, rollDrop(lvl, rich ? [30, 50, 19, 1] : [85, 14, 1, 0]));
  if (rich && G.profile.level >= 6 && rand() < 0.2) dropItem(x + 0.3, y + 0.4, makeSetItem(pickSet(G.profile.cls), null, lvl, G.profile.cls));   // сундук Ордена — шанс части сета
}

// pickups: gold automatically, items/potions automatically when room in bag
export function updatePickups(dt) {
  const P = G.player; if (!P || P.dead) return;
  const prof = G.profile;
  for (const p of G.pickups) {
    if (p.taken) continue; p.t += dt;
    if (p.t < 0.35) continue;  // let the drop settle
    const d = Math.hypot(p.x - P.x, p.y - P.y);
    const reach = p.kind === 'gold' ? 1.6 : 1.1;
    // магнит: золото и зелья подлетают сами; всё, что выпало из сундука (p.fly), — тоже, чтобы не бегать вокруг
    if (p.fly || (p.kind !== 'item' && d < 3.2)) { const k = Math.min(1, dt * (p.fly ? 9 : 8) / Math.max(0.3, d)); p.x += (P.x - p.x) * k; p.y += (P.y - p.y) * k; }
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
      if (prof.bag.length >= prof.bagSize) {   // сумка полна: серое продаётся само (с пола или самое дешёвое из сумки), иначе — напоминание
        if (p.item.rarity === 0) { const g = sellValue(p.item); prof.gold += g; p.taken = true; bus.emit('sfx', 'gold'); float(P.x, P.y, '+' + g + ' зол.', '#ffd76a'); bus.emit('toast', { text: `Сумка полна — серая вещь продана: +${g} зол.`, kind: 'info' }); bus.emit('hud'); continue; }
        const gi = prof.bag.reduce((bi, it, i) => it.rarity === 0 && !it.locked && (bi < 0 || sellValue(it) < sellValue(prof.bag[bi])) ? i : bi, -1);
        if (gi >= 0) { const [old] = prof.bag.splice(gi, 1); const g = sellValue(old); prof.gold += g; bus.emit('toast', { text: `Сумка полна — продано «${old.name}»: +${g} зол.`, sub: 'Совет: у кузнеца три одинаковые по редкости вещи сливаются в одну лучше', kind: 'info' }); }
        else { if (!p.warnT || G.time - p.warnT > 6) { p.warnT = G.time; bus.emit('toast', { text: 'Сумка полна — вещь не помещается', sub: 'Продайте лишнее у торговки или в окне «Герой»', kind: 'warn' }); } continue; }
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
export function killXP(e) { return Math.round(e.D.xp * scaleXP(e.lvl) * (e.champion ? 2.5 : 1) * Math.max(0.3, 1 - Math.max(0, G.profile.level - e.lvl - 2) * 0.15)); }
