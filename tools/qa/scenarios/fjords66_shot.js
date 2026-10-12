// Снимок Фьордов с ледяными шипами (12 октября, лаги): node tools/qa/run.mjs tools/qa/scenarios/fjords66_shot.js → /tmp/claude-0/shots/fjords66.jpg
const G = window.__G, gm = await import('/js/game/game.js'), C = await import('/js/game/combat.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
G.profile.settings.quality = 'med';
await gm.loadZone('wild', { realm: 'fjord', depth: 1 }); for (let k = 0; k < 100 && !G.zoneReady; k++) await sleep(200); await sleep(3000);
for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
const P = G.player; G.paused = true;
for (let k = 0; k < 30 && !C.sheet('fj_ice_spikes', P.x + 1.6, P.y - 0.4, { dur: 30 }); k++) await sleep(300);
await sleep(4000); await shot('fjords66');
