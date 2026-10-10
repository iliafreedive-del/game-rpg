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
  if (G.zoneId === 'wild' && z.json.wild && z.json.wild.kind === 'fort') return;   // П59: на уровне с фортом мобы не появляются заново (путаница, некуда отступить)
  (z.respawnQ = z.respawnQ || []).push({ type: e.type, x: e.hx, y: e.hy, lvl: e.lvl, room: e.room, at: G.time + RESPAWN_T + rrange(-15, 15) });
});

export function respawnTick() {
  const z = G.zone, Q = z && z.respawnQ, P = G.player; if (!Q || !Q.length || !P) return;
  for (let i = Q.length - 1; i >= 0; i--) {
    const q = Q[i]; if (G.time < q.at) continue;
    if ((q.x - P.x) ** 2 + (q.y - P.y) ** 2 < RESPAWN_NEAR * RESPAWN_NEAR) { q.at = G.time + 5; continue; }
    const [x, y] = z.map.nearestFree(q.x, q.y, (G.zoneId === 'wild' ? 0.5 : 0.4));
    const e = new Enemy(q.type, x, y, q.lvl, { room: q.room }); e.respawned = true; G.enemies.push(e); Q.splice(i, 1);
  }
}
