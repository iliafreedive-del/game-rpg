// a2: время загрузки поля похода и этажа Глубин (3 захода, медиана) и треугольники/вызовы кадра у старта
const G = window.__G, gm = await import('/js/game/game.js'); G.profile.level = 30; G.profile.tutorial.prologue = true;
for (const [id, how] of [['wild', { realm: 'forest', depth: 2 }], ['wild', { realm: 'fjord', depth: 3 }], ['depths', { floor: 6 }]]) {
  const t = [];
  for (let k = 0; k < 3; k++) { const t0 = performance.now(); await gm.loadZone(id, how); t.push(performance.now() - t0); await sleep(200); }
  t.sort((a, b) => a - b); await step(3); await sleep(300); const R3 = window.__R3;
  print(id, JSON.stringify(how), 'load ms median', Math.round(t[1]), 'all', t.map(Math.round).join('/'), 'tris', R3.renderer.info.render.triangles, 'calls', R3.renderer.info.render.calls, 'map', G.zone.json.w + 'x' + G.zone.json.h);
}
