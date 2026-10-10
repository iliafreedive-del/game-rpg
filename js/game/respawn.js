// Возрождение мобов (сборка 18): обычный враг через ~2 минуты встаёт на своём месте (там, где появился впервые).
// Не на глазах: если герой ближе RESPAWN_NEAR — ждёт, пока отойдёт. Боссы, стражи, командиры, сюжетные и вызванные — не возрождаются.
// Возрождённые (e.respawned) не считаются в зачистке этажа, воротах форта и звёздах; вещи с них падают втрое реже (loot.js).
// Очередь живёт в самой зоне (zone.respawnQ), поэтому катакомбы из кэша помнят, кто ждёт возрождения.
import { G, bus } from './ctx.js';
import { Enemy } from './entities.js';
import { rrange } from '../core/util.js';

export const RESPAWN_T = 120, RESPAWN_NEAR = 10;
const ZONES = new Set(['catacombs', 'depths', 'wild']);

bus.on('kill', e => {
  const z = G.zone; if (!z || !ZONES.has(G.zoneId) || e.summoned || e.story || e.D.boss || e.D.elite) return;
  if (G.zoneId === 'depths' && !(G.run && G.run.floor > 0)) return;   // пролог-обучение — без возрождения
  (z.respawnQ = z.respawnQ || []).push({ type: e.type, x: e.hx, y: e.hy, lvl: e.lvl, room: e.room, at: G.time + RESPAWN_T + rrange(-15, 15) });
});

export function respawnTick() {
  bossTimerTick();
  const z = G.zone, Q = z && z.respawnQ, P = G.player; if (!Q || !Q.length || !P) return;
  for (let i = Q.length - 1; i >= 0; i--) {
    const q = Q[i]; if (G.time < q.at) continue;
    if ((q.x - P.x) ** 2 + (q.y - P.y) ** 2 < RESPAWN_NEAR * RESPAWN_NEAR) { q.at = G.time + 5; continue; }
    const [x, y] = z.map.nearestFree(q.x, q.y, (G.zoneId === 'wild' ? 0.5 : 0.4));
    const e = new Enemy(q.type, x, y, q.lvl, { room: q.room }); e.respawned = true; G.enemies.push(e); Q.splice(i, 1);
  }
}

// П45 (правки 2): главные враги катакомб — Хранитель амулета и Палач Бездны — после победы возвращаются через 30 минут на то же место.
// На месте гибели — табличка с таймером. Повторная победа: награда меньше сюжетной (золото и опыт ×0,5, вещь реже), зато наверняка
// осколки Бездны: Хранитель 5, Палач 8 (castle.js). Время — в P.world.bossCD = { elite|boss: { at, x, y } } (переживает выход из игры).
export const BOSS_RESPAWN_MS = 30 * 60e3;
export const BOSS_NAMES = { elite: 'Хранитель амулета', boss: 'Палач Бездны' };
const bossCD = () => (G.profile.world.bossCD = G.profile.world.bossCD || {});
export function bossReady(key) {
  const r = bossCD()[key]; if (!r) return true;
  if (r.at > Date.now() + BOSS_RESPAWN_MS) r.at = Date.now() + BOSS_RESPAWN_MS;   // часы телефона переведены назад
  return Date.now() >= r.at;
}
export function bossTimer(key) {
  const r = bossCD()[key], z = G.zone; if (!r || !z || bossReady(key)) return;
  if (!z.inter.some(i => i.id === 'bosstimer_' + key)) z.inter.push({ id: 'bosstimer_' + key, type: 'bosstimer', key, x: r.x, y: r.y, r: 0, plate: BOSS_NAMES[key] });
}
bus.on('kill', e => {
  if (G.zoneId !== 'catacombs' || !BOSS_NAMES[e.story] || !G.profile) return;
  bossCD()[e.story] = { at: Date.now() + BOSS_RESPAWN_MS, x: e.x, y: e.y }; bossTimer(e.story); bus.emit('save');
  if (e.repeat) setTimeout(() => bus.emit('toast', { text: `${BOSS_NAMES[e.story]} вернётся через 30 минут`, sub: 'На месте его гибели — таймер. Повторная победа: осколки Бездны и добыча', kind: 'info' }), 2600);
});
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function bossTimerTick() {
  const z = G.zone, P = G.player; if (!z || G.zoneId !== 'catacombs' || !P) return;
  for (let i = z.inter.length - 1; i >= 0; i--) {
    const it = z.inter[i]; if (it.type !== 'bosstimer') continue;
    const r = bossCD()[it.key], left = r ? r.at - Date.now() : 0;
    if (left > 0) { it.plate = `${BOSS_NAMES[it.key]} вернётся через ${mmss(left)}`; continue; }
    if ((it.x - P.x) ** 2 + (it.y - P.y) ** 2 < RESPAWN_NEAR * RESPAWN_NEAR) { it.plate = `${BOSS_NAMES[it.key]} пробуждается…`; continue; }   // не на глазах
    z.inter.splice(i, 1); bus.emit('bossRespawn', it.key);
  }
}
