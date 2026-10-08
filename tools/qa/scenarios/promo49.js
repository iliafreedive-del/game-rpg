// Сборка 49: скриншоты для страницы Яндекс Игр и пресс-кита — в режиме съёмки (без интерфейса).
// Запуск: DSF=2.667 CLS=2 node tools/qa/run.mjs tools/qa/scenarios/promo49.js 405 720  (портрет 1080×1920; 720 405 — альбом)
const G = window.__G; const gm = await import('/js/game/game.js'); const W = await import('/js/ui/windows.js'); const C = await import('/js/game/combat.js');
const tag = localStorage.getItem('PROMO_TAG') || (innerWidth < innerHeight ? 'P' : 'L');
const closeAll = () => { for (let k = 0; k < 6; k++) { const b = document.querySelector('.modal .btn.gold, .modal-bg .btn.gold'); if (b) b.click(); } document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' })); };
const P = G.profile; P.level = 12; P.tutorial.prologue = true; G.stats = (await import('/js/game/stats.js')).stats(P);
W.photoMode(true); G.player.inv = 1e9; document.querySelector('.photo-exit').style.display = 'none';   // на снимках кнопки выхода нет
const fight = async (n) => { G.auto = true; for (let i = 0; i < n; i++) { G.player.inv = 1e9; G.player.hp = G.stats.maxHP; G.player.mp = G.stats.maxMP; await step(2); await sleep(15); } };
// 1. деревня
await gm.loadZone('town', {}); await sleep(1500); closeAll(); await step(20); await sleep(800); await shot(`promo_${tag}_1_village`);
// 2. катакомбы — бой с толпой
await gm.loadZone('catacombs', {}); await sleep(1500); closeAll();
{ const pl = G.player, es = G.enemies.filter(e => !e.dead).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y)).slice(0, 7);
  const t = es[0]; if (t) { pl.x = t.x - 1.5; pl.y = t.y; for (const e of es) { e.x = pl.x + (Math.random() * 4 - 1); e.y = pl.y + (Math.random() * 3 - 1.5); e.aggro = true; } } }
await fight(25); await sleep(500); await shot(`promo_${tag}_2_catacombs`);
// 3. Глубины, этаж с боссом
P.depths = { best: 9, stars: {} }; await gm.loadZone('depths', { floor: 10 }); await sleep(1500); closeAll();
{ const pl = G.player, b = G.enemies.find(e => e.D && e.D.boss) || G.enemies.find(e => e.story); if (b) { pl.x = b.x - 2.6; pl.y = b.y + 0.4; b.aggro = true; } }
await fight(35); await sleep(500); await shot(`promo_${tag}_3_boss`);
// 4. Жатва Бездны — толпа
await gm.loadZone('survival', {}); await sleep(1500); closeAll();
for (let i = 0; i < 700; i++) { G.player.inv = 1e9; G.player.hp = G.stats.maxHP; await step(3); if (i % 20 === 0) closeAll(); await sleep(5); }
closeAll(); await sleep(400); await shot(`promo_${tag}_4_harvest`);
// 5. Старый Лес
await gm.loadZone('wild', { realm: 'forest', depth: 1 }); await sleep(1500); closeAll(); await fight(15); await sleep(500); await shot(`promo_${tag}_5_forest`).catch(() => print('лес не снят'));
print('ok', tag);
