// Подвижность (сборка 19): герой отступает от трёх волков, зажав «A» 4 с, и бьёт их на ходу. Скорость не должна проседать от ударов.
const G = window.__G, gm = await import('/js/game/game.js'), { Enemy } = await import('/js/game/entities.js');
G.profile.level = 6; await gm.loadZone('wild', { realm: 'forest', depth: 1 }); await sleep(1200);
document.querySelectorAll('button').forEach(b => { if (/Понятно/.test(b.textContent)) b.click(); }); G.paused = false;
const pl = G.player; [pl.x, pl.y] = G.zone.map.nearestFree(40, 32, 0.5); G.enemies.length = 0;
for (let i = 0; i < 3; i++) { const e = new Enemy('w_wolf', pl.x - 2 - i * 0.7, pl.y + (i - 1) * 0.8, 2); e.aggro = true; G.enemies.push(e); }
let x0 = pl.x, att = 0, slow = 0, last = pl.x, hp0 = G.enemies.reduce((a, e) => a + e.hp, 0), php0 = pl.hp;
dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
for (let i = 0; i < 120; i++) { await step(1); if (pl.state === 'attack' || pl.state === 'cast') att++; if (i > 10 && pl.x - last < 4.0 / 30) slow++; last = pl.x; }
dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', key: 'd' }));
print('cls', G.profile.cls, 'ушёл на', (pl.x - x0).toFixed(1), 'м за 4 с; кадров с ударом', att, '; кадров медленнее 4 м/с', slow, '; урон по волкам', Math.round(hp0 - G.enemies.reduce((a, e) => a + Math.max(0, e.hp), 0)), '; потерял HP', Math.round(php0 - pl.hp));
// пробег мимо: враги по ходу движения в 2–3 м сбоку; герой не должен останавливаться, но должен бить
[pl.x, pl.y] = G.zone.map.nearestFree(20, 32, 0.5); G.enemies.length = 0; G.player.hp = G.stats.maxHP;
const [dx, dy] = [0.707, -0.707];
for (let i = 0; i < 3; i++) { const e = new Enemy('skel_warrior', pl.x + dx * (3 + i * 3) + 1.2 * 0.707, pl.y + dy * (3 + i * 3) + 1.2 * 0.707, 1); e.aggro = true; e.speed = 0.01; G.enemies.push(e); }
const sx = pl.x, sy = pl.y, h1 = G.enemies.reduce((a, e) => a + e.hp, 0); att = 0;
dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
for (let i = 0; i < 90; i++) { await step(1); if (pl.state === 'attack' || pl.state === 'cast') att++; }
dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', key: 'd' }));
print('мимо врагов: прошёл', Math.hypot(pl.x - sx, pl.y - sy).toFixed(1), 'м за 3 с (', (Math.hypot(pl.x - sx, pl.y - sy) / 3).toFixed(2), 'м/с); кадров с ударом', att, '; урон', Math.round(h1 - G.enemies.reduce((a, e) => a + Math.max(0, e.hp), 0)));
