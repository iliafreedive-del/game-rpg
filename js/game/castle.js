// Citadel systems: Abyss shards, torches (energy for the Depths), gold altar (offline income),
// trial seals (boss fights without the dungeon), treasury chests, trophies, room unlocking.
import { G, bus } from './ctx.js';
import { ROOMS, DECOR } from '../data/upgrades.js';
import { makeItem } from './items.js';
import { autoEquip } from './character.js';
import { pickEpic } from './loot.js';
import { stats } from './stats.js';
import { rand, rint } from '../core/util.js';

const H = 3600e3;
export function C() {
  const P = G.profile;
  P.castle = P.castle || { altar: 0, trial: 0, treasury: 0, trophy: 0, altarAt: Date.now() };
  P.shards = P.shards || 0;
  P.torch = P.torch || { n: 10, at: Date.now() };
  P.seals = P.seals || { n: 3, at: Date.now() };
  P.upg = P.upg || {};
  P.world.opened.castle = P.castle;
  return P.castle;
}
// ---- regenerating counters (work offline)
function regen(obj, max, periodMs) {
  const now = Date.now(); if (obj.n >= max) { obj.at = now; return obj; }
  const k = Math.floor((now - obj.at) / periodMs);
  if (k > 0) { obj.n = Math.min(max, obj.n + k); obj.at = obj.n >= max ? now : obj.at + k * periodMs; }
  return obj;
}
export const TORCH_MAX = 10, TORCH_MS = 20 * 60e3, SEAL_MAX = 3, SEAL_MS = 3 * H;
export function torches() { C(); return regen(G.profile.torch, TORCH_MAX, TORCH_MS); }
export function seals() { C(); return regen(G.profile.seals, SEAL_MAX, SEAL_MS); }
export function nextIn(obj, ms) { return obj.n >= (ms === TORCH_MS ? TORCH_MAX : SEAL_MAX) ? 0 : Math.max(0, obj.at + ms - Date.now()); }
export function spendTorch() { const t = torches(); if (t.n <= 0) return false; if (t.n >= TORCH_MAX) t.at = Date.now(); t.n--; bus.emit('hud'); bus.emit('save'); return true; }
export function addTorches(n) { const t = torches(); t.n = Math.min(TORCH_MAX + 10, t.n + n); bus.emit('hud'); bus.emit('save'); }

// ---- shards: random drops (the «рандомчик» the citadel is built on)
export function addShards(n, x, y) {
  C(); G.profile.shards += n; bus.emit('hud');
  if (x != null) bus.emit('float', { x, y, text: `+${n} осколк${n === 1 ? '' : n < 5 ? 'а' : 'ов'} Бездны`, color: '#d49bff', z: 2.6 });
  bus.emit('sfx', 'rareDrop');
}
bus.on('kill', e => {
  if (!G.profile) return;
  const ch = e.D.boss ? 1 : e.D.elite ? 1 : e.champion ? 0.35 : e.story === 'floorboss' ? 1 : 0.015;
  if (rand() < ch) addShards(e.D.boss ? rint(4, 7) : e.D.elite ? rint(2, 4) : 1, e.x, e.y);
});
bus.on('chest', () => { if (rand() < 0.25) addShards(1, G.player.x, G.player.y); });

// ---- rooms
export function canUnlock(id) {
  const R = ROOMS[id], P = G.profile; C();
  if (P.castle[id]) return { ok: false, why: 'Открыто' };
  if (P.level < R.lvl) return { ok: false, why: `Нужен уровень ${R.lvl}` };
  if (P.gold < R.gold) return { ok: false, why: `Нужно ${R.gold} золота` };
  if (P.shards < R.shards) return { ok: false, why: `Нужно ${R.shards} осколков` };
  return { ok: true };
}
export function unlock(id) {
  const c = canUnlock(id); if (!c.ok) { bus.emit('toast', { text: c.why, kind: 'warn' }); bus.emit('sfx', 'deny'); return false; }
  const R = ROOMS[id], P = G.profile; P.gold -= R.gold; P.shards -= R.shards; P.castle[id] = 1;
  if (id === 'altar') P.castle.altarAt = Date.now();
  P.world.opened.castle = P.castle;
  bus.emit('roomUnlocked', id); bus.emit('sfx', 'door'); bus.emit('toast', { text: 'Открыто: ' + R.name, sub: R.desc, kind: 'quest' }); bus.emit('save'); return true;
}
// ---- gold altar
export const altarRate = () => { const P = G.profile, l = P.castle.altar || 0; return l ? Math.round((35 + 25 * l) * (1 + P.level * 0.08)) : 0; };   // gold per hour
export const altarUpgCost = () => { const l = G.profile.castle.altar; return { gold: Math.round(250 * Math.pow(1.6, l)), shards: 2 * l }; };
export function altarStored() { const P = G.profile; C(); if (!P.castle.altar) return 0; const h = Math.min(8, (Date.now() - P.castle.altarAt) / H); return Math.floor(altarRate() * h); }
export function altarCollect(mult = 1) { const g = altarStored(); if (!g) return 0; const P = G.profile; P.gold += g * mult; P.castle.altarAt = Date.now(); bus.emit('sfx', 'coin'); bus.emit('toast', { text: `Алтарь: +${g * mult} золота`, kind: 'good' }); bus.emit('hud'); bus.emit('save'); return g; }
export function altarUpgrade() {
  const P = G.profile, c = altarUpgCost(); if (P.castle.altar >= 10) return false;
  if (P.gold < c.gold || P.shards < c.shards) { bus.emit('toast', { text: `Нужно ${c.gold} золота и ${c.shards} осколков`, kind: 'warn' }); bus.emit('sfx', 'deny'); return false; }
  altarCollect(); P.gold -= c.gold; P.shards -= c.shards; P.castle.altar++; bus.emit('sfx', 'anvil'); bus.emit('save'); bus.emit('hud'); return true;
}
// ---- trophies: permanent +3% damage, +5% gold per level
export const trophyCost = () => { const l = G.profile.castle.trophy || 0; return { gold: Math.round(400 * Math.pow(1.5, l)), shards: 4 + 3 * l }; };
export function trophyUpgrade() {
  const P = G.profile, c = trophyCost(); if ((P.castle.trophy || 0) >= 15) return false;
  if (P.gold < c.gold || P.shards < c.shards) { bus.emit('toast', { text: `Нужно ${c.gold} золота и ${c.shards} осколков`, kind: 'warn' }); bus.emit('sfx', 'deny'); return false; }
  P.gold -= c.gold; P.shards -= c.shards; P.castle.trophy = (P.castle.trophy || 0) + 1; G.stats = stats(P); bus.emit('statsChanged'); bus.emit('sfx', 'anvil'); bus.emit('save'); bus.emit('hud'); return true;
}
// ---- treasury chest (shard sink with a jackpot chance)
export const CHEST_SHARDS = 8;
export function openTreasury() {
  const P = G.profile; if (P.shards < CHEST_SHARDS) { bus.emit('toast', { text: `Нужно ${CHEST_SHARDS} осколков`, kind: 'warn' }); bus.emit('sfx', 'deny'); return false; }
  P.shards -= CHEST_SHARDS;
  const roll = rand(); const it = roll < 0.07 ? makeItem({ epic: pickEpic(P.cls), ilvl: P.level + 1, cls: P.cls }) : makeItem({ slot: ['weapon', 'head', 'chest', 'amulet'][rint(0, 3)], ilvl: P.level + 1, rarity: roll < 0.45 ? 2 : 1, cls: P.cls });
  delete it.req; const e = autoEquip(it, it.rarity >= 3); const gold = 30 * P.level; P.gold += gold;
  bus.emit('reward', { title: 'Сундук Бездны', sub: roll < 0.07 ? 'ДЖЕКПОТ!' : 'Сокровищница', gold, xp: 0, potions: 0, scrolls: 0, skillPts: 0, items: [e] });
  bus.emit('sfx', 'chest'); bus.emit('save'); return true;
}
// ---- trial hall: fight a guardian right in the citadel (auto-battle friendly)
export const TRIALS = [
  { id: 't1', name: 'Страж Медальона', type: 'elite_guard', lvl: 0, req: 5 },
  { id: 't2', name: 'Палач Бездны', type: 'boss', lvl: 1, req: 8 },
  { id: 't3', name: 'Палач Бездны · Кошмар', type: 'boss', lvl: 4, req: 12 },
];
export function trialReward(t) {
  const P = G.profile; const gold = Math.round(80 * P.level * (1 + t.lvl * 0.3)); P.gold += gold;
  const shards = rint(2, 4) + t.lvl; P.shards += shards;
  const items = [];
  if (rand() < 0.35 + t.lvl * 0.08) { const slot = ['weapon', 'head', 'chest', 'amulet'][rint(0, 3)]; const it = rand() < 0.05 + t.lvl * 0.02 ? makeItem({ epic: pickEpic(P.cls), ilvl: P.level + 1, cls: P.cls }) : makeItem({ slot, ilvl: P.level + 1, rarity: rand() < 0.4 ? 2 : 1, cls: P.cls }); delete it.req; items.push(autoEquip(it, it.rarity >= 3)); }
  bus.emit('reward', { title: 'Испытание пройдено: ' + t.name, sub: `+${shards} осколков Бездны`, gold, xp: 0, potions: 0, scrolls: 0, skillPts: 0, items });
  bus.emit('save');
}

// ---- decor sockets
export function placeDecor(sid, id) {
  const P = G.profile, D = DECOR[id]; C(); P.castle.decor = P.castle.decor || {};
  if (P.gold < D.gold || (P.shards || 0) < D.shards) { bus.emit('toast', { text: `Нужно ${D.gold} золота${D.shards ? ` и ${D.shards} осколков` : ''}`, kind: 'warn' }); bus.emit('sfx', 'deny'); return false; }
  const old = P.castle.decor[sid]; if (old) { P.gold += Math.round(DECOR[old].gold * 0.5); }
  P.gold -= D.gold; P.shards -= D.shards; P.castle.decor[sid] = id;
  G.stats = stats(P); bus.emit('statsChanged'); bus.emit('decorPlaced', { sid, id }); bus.emit('sfx', 'equip'); bus.emit('toast', { text: 'Украшение: ' + D.name, sub: D.txt, kind: 'good' }); bus.emit('save'); return true;
}
