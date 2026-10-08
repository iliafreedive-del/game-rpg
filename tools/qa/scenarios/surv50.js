// Сборка 50: Жатва — светлее, зум, бесконечное поле, стрелки. Запуск: node tools/qa/run.mjs tools/qa/scenarios/surv50.js 430 932
const G = window.__G; const gm = await import('/js/game/game.js'); const P = G.profile; P.level = 5; P.tutorial.prologue = true; P.survIntro = true;
const closeAll = () => { for (let k = 0; k < 6; k++) { const b = document.querySelector('.modal .btn.gold, .modal-bg .btn.gold'); if (b) b.click(); } };
await gm.loadZone('survival', {}); await sleep(1500); closeAll(); G.surv.t = 130; G.surv.intro = false; document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
let shifts = 0; window.__G.bus && 0; (await import('/js/game/ctx.js')).bus.on('worldShift', () => shifts++);
for (let i = 0; i < 240; i++) { G.player.inv = 1e9; G.player.hp = G.stats.maxHP; G.surv.xp = 0; G.surv.pending = 0; await step(3); if (i % 20 === 0) closeAll(); }
closeAll(); await sleep(400); await shot('surv50_a_' + innerWidth);
for (let i = 0; i < 260; i++) { G.player.inv = 1e9; G.player.hp = G.stats.maxHP; G.player.x -= 0.12; await step(1); if (i % 20 === 0) closeAll(); }
closeAll(); await sleep(400); await shot('surv50_b_' + innerWidth);
const S = G.surv; print('swarm', S.swarm.length, 'shooters', S.swarm.filter(e => e.shoot).length, 'eprojs', S.eprojs.length, 'pos', G.player.x.toFixed(1), G.player.y.toFixed(1), 'shifts', shifts, 'hp', G.player.hp);
print('ok');
