// «Простор» (сборка 18): катакомбы, Глубины (этаж 3) и Цитадель после растяжения в 1,5 раза — снимки у старта и сверху
const G = window.__G, gm = await import('/js/game/game.js'); G.profile.level = 8; G.profile.tutorial.prologue = true;
const close = () => document.querySelectorAll('.modal-bg button').forEach(b => { if (/Понятно|Закрыть|Ясно|Начать|▶|Спуститься|Вперёд/.test(b.textContent)) b.click(); });
for (const [id, how] of [['depths', { floor: 3 }], ['castle', {}]]) {
  await gm.loadZone(id, how); await sleep(1500); close(); await step(10); close();
  G.enemies.forEach(e => { e.aggro = false; });
  print(id, G.zone.json.w + '×' + G.zone.json.h, 'widened', G.zone.json.widened, 'enemies', G.enemies.length, 'stuck', G.enemies.filter(e => !G.zone.map.free(e.x, e.y, 0.2)).length);
  await step(20); await sleep(500); await shot('roomy_' + id);
  const R3 = window.__R3; G.zoomMul = 0.4; if (R3.scene.fog) { R3.scene.fog.near = 200; R3.scene.fog.far = 400; } await step(5); await sleep(700); await shot('roomy_' + id + '_top'); G.zoomMul = 0.8;
}
