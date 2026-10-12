// Фьорды лагают сильнее леса: цена каждого моба похода — 4 штуки рядом с героем, вызовы/треугольники/время кадра и первый кадр (сборка шейдеров).
// Запуск: node tools/qa/run.mjs tools/qa/scenarios/fjord_mobs.js
const G = window.__G, gm = await import('/js/game/game.js'); const R3 = window.__R3, rm = await import('/js/render3d/renderer3d.js');
const { Enemy } = await import('/js/game/entities.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
G.profile.settings.quality = 'med';
const gl = R3.renderer.getContext(), med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
const frame = () => { const a = performance.now(); rm.render(); gl.finish(); return performance.now() - a; };
for (const [realm, types] of [['forest', ['w_wolf', 'w_boar', 'w_poacher', 'w_leshy', 'w_bear']], ['fjord', ['f_wolf', 'f_draugr', 'f_berserk', 'f_hag', 'f_jotun']]]) {
  await gm.loadZone('wild', { realm, depth: 2 }); for (let k = 0; k < 60 && !G.zoneReady; k++) await sleep(200); await sleep(2500);
  for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
  G.paused = false; G.enemies.length = 0; await step(2); const P = G.player;
  for (let i = 0; i < 4; i++) frame();
  const base = []; for (let i = 0; i < 8; i++) base.push(frame());
  const c0 = R3.renderer.info.render.calls, t0 = R3.renderer.info.render.triangles;
  print(realm, 'пусто: calls', c0, 'tris', Math.round(t0 / 1000) + 'k', 'render med', med(base).toFixed(1));
  for (const t of types) {
    G.enemies.length = 0; for (let i = 0; i < 4; i++) { const e = new Enemy(t, P.x + 2 + i, P.y - 2 + (i % 2), 1); e.aggro = false; G.enemies.push(e); }
    const first = frame(); const r = []; for (let i = 0; i < 8; i++) r.push(frame());
    const c = R3.renderer.info.render.calls, tr = R3.renderer.info.render.triangles;
    let parts = 0; for (const a of R3.actors.values()) a.root.traverseVisible(o => { if (o.isMesh) parts++; });
    print(' ', t, '×4: +calls', c - c0, '+tris', Math.round((tr - t0) / 1000) + 'k', 'render med', med(r).toFixed(1), 'first', first.toFixed(0), 'mesh parts (all actors)', parts);
  }
  G.enemies.length = 0;
}
