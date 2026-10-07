// Серия побед (сборка 47): каждая боевая зона (поход, Глубины, катакомбы), из которой герой вышел живым и где убил 5+ врагов,
// даёт +5 % золота, до +50 % (10 подряд). Смерть обнуляет серию. Хранится в профиле; огонёк с числом — у портрета (hud.js).
import { G, bus } from './ctx.js';

const FIGHT = ['wild', 'depths', 'catacombs'], MAX = 10;
let kills = 0;
export const streak = () => (G.profile && G.profile.streak) || 0;
export const streakGoldMul = () => 1 + 0.05 * Math.min(MAX, streak());
// вызывается из loadZone до смены зоны
export function onZoneChange(fromId, how) {
  const P = G.profile; if (!P) return;
  if (FIGHT.includes(fromId) && how.from !== 'death' && kills >= 5) {
    P.streak = streak() + 1;
    const n = Math.min(MAX, P.streak);
    bus.emit('toast', { text: `🔥 Серия побед: ${P.streak}`, sub: `+${n * 5}% золота, пока не погибнете${P.streak < MAX ? '' : ' (максимум)'}`, kind: 'good' });
    bus.emit('save');
  }
  kills = 0;
}
bus.on('kill', () => { kills++; });
bus.on('playerDeath', () => {
  const P = G.profile; if (!P || !streak()) return;
  if (streak() >= 2) bus.emit('toast', { text: 'Серия побед прервана', sub: 'Выходите из боя живым — и огонёк разгорится снова', kind: 'warn' });
  P.streak = 0; bus.emit('save');
});
