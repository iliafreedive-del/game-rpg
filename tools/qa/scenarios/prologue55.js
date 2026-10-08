// Сборка 55: портал выхода из склепа пробуждения — катакомбный из черепов. Запуск: TAG=after node tools/qa/run.mjs tools/qa/scenarios/prologue54.js 932 430
const G = window.__G, gm = await import('/js/game/game.js'); await gm.loadZone('depths', { floor: 0 }); await sleep(2500);
document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
for (const e of G.enemies) { e.dead = true; e.hp = 0; }
const ex = G.zone.inter.find(i => i.id === 'floor_exit'); ex.hidden = false; ex.draw.hidden = false; ex.light.on = true;
G.player.x = ex.x - 2.2; G.player.y = ex.y + 2.2; await step(20); await sleep(3000); await shot((window.__TAG || 'x') + '_prologue_portal'); print('ok', ex.draw.spr);
