// Кусты и камни Фьордов: снимок у кромки с кустами. → /tmp/claude-0/shots/fjbush_<TAG>.jpg
const G = window.__G, gm = await import('/js/game/game.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
G.profile.settings.quality = 'med';
await gm.loadZone('wild', { realm: 'fjord', depth: 1 }); for (let k = 0; k < 100 && !G.zoneReady; k++) await sleep(200); await sleep(2500);
for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
const P = G.player, M = G.zone.map; for (const e of G.enemies) { e.x = -99; e.y = -99; }
const deco = G.zone.statics.filter(d => d.spr === 'bush' || d.spr === 'fern' || d.spr === 'rocks');
const score = d => deco.filter(o => Math.hypot(o.x - d.x, o.y - d.y) < 4).length;
const best = deco.slice().sort((a, b) => score(b) - score(a));
const pts = [best[0], best.find(d => Math.hypot(d.x - best[0].x, d.y - best[0].y) > 10)];
let i = 0; for (const s of pts) { let nx = s.x - 1, ny = s.y - 1.5; for (let k = 0; k < 30 && !M.free(nx, ny, 0.3); k++) { nx += 0.4; ny -= 0.2; } P.x = nx; P.y = ny; await step(4); await sleep(1500); await shot('fjbush_' + window.__TAG + '_' + (i++)); }
