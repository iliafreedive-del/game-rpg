// Возрождение (сборка 18): убить моба → через 2 мин он встаёт на месте; рядом с героем ждёт; выход с этажа Глубин открывается без возрождённых
const G = window.__G, gm = await import('/js/game/game.js'), C = await import('/js/game/combat.js'); G.profile.level = 8; G.profile.tutorial.prologue = true;
const close = () => document.querySelectorAll('button').forEach(b => { if (/Понятно|Вперёд|Закрыть/.test(b.textContent)) b.click(); });
for (const [id, how] of [['wild', { realm: 'forest', depth: 1 }], ['catacombs', {}], ['depths', { floor: 2 }]]) {
  await gm.loadZone(id, how); await sleep(1200); close(); await step(3); close();
  const e = G.enemies.find(x => !x.story && !x.D.boss && !x.D.elite), n0 = G.enemies.filter(x => !x.dead).length;
  G.player.x = e.hx + 2; G.player.y = e.hy + 2; C.killEnemy(e, {}); close(); await step(1); close(); await step(1);
  G.time += 130; close(); await step(1); close(); await step(1); const nearAlive = G.enemies.filter(x => !x.dead).length;
  G.player.x = e.hx + 20 < G.zone.map.w ? e.hx + 15 : e.hx - 15; G.player.y = e.hy; [G.player.x, G.player.y] = G.zone.map.nearestFree(G.player.x, G.player.y, 0.4);
  G.time += 6; close(); await step(1); close(); await step(1); print('paused', G.paused, G.modalOpen, [...document.querySelectorAll('.modal-bg')].map(m => m.innerText.slice(0, 60)).join('|'), 'Q', JSON.stringify(G.zone.respawnQ), 'pl', G.player.x.toFixed(1), G.player.y.toFixed(1)); const r = G.enemies.filter(x => x.respawned);
  print(id, 'alive before', n0, 'after 130s hero near', nearAlive, 'after hero left', G.enemies.filter(x => !x.dead).length, 'respawned', r.length, r[0] && [r[0].type === e.type, Math.hypot(r[0].x - e.hx, r[0].y - e.hy).toFixed(2)]);
  if (id === 'depths') {
    for (const x of G.enemies.filter(x => !x.dead && !x.respawned)) C.killEnemy(x, {}); await step(3);
    const ex = G.zone.inter.find(i => i.id === 'floor_exit'); print('depths exit open', ex && !ex.hidden, 'respawned alive', G.enemies.filter(x => !x.dead && x.respawned).length, 'kills', G.run.kills, '/', G.run.total);
  }
}
