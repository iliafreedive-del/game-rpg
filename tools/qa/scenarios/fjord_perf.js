// Фьорды лагают сильнее леса (12 октября): сравнение кадра в лесу и во фьордах — вызовы отрисовки, треугольники, время render().
// Запуск: node tools/qa/run.mjs tools/qa/scenarios/fjord_perf.js   (TAG=shot — снимок фьордов в /tmp/claude-0/shots/fjords66.jpg)
const G = window.__G, gm = await import('/js/game/game.js'); const R3 = window.__R3, rm = await import('/js/render3d/renderer3d.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
G.profile.settings.quality = 'med';
for (const realm of ['forest', 'fjord']) for (const depth of [1, 3]) {
  await gm.loadZone('wild', { realm, depth }); for (let k = 0; k < 60 && !G.zoneReady; k++) await sleep(200); await sleep(1500);
  for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
  G.paused = false; await step(5);
  const M = G.zone.map;
  for (let i = 0; i < 5; i++) rm.render();
  let cpu = 0, upd = 0, calls = 0, tris = 0, N = 0, worst = 0, uw = 0; const P = G.player, gl = R3.renderer.getContext(), rs = [], us = [], prog0 = R3.renderer.info.programs.length; let hitch = 0;
  for (let gy = 1; gy <= 3; gy++) for (let gx = 1; gx <= 3; gx++) {   // 9 точек по карте: камера видит разное (лес, вода, форт)
    let nx = M.w * gx / 4, ny = M.h * gy / 4; for (let k = 0; k < 40 && !M.free(nx, ny, 0.3); k++) { nx += 0.7; ny += 0.3; }
    P.x = nx; P.y = ny; await step(3);
    for (let i = 0; i < 3; i++) { const a = performance.now(); rm.render(); gl.finish(); if (performance.now() - a > 500) hitch++; }
    for (let i = 0; i < 6; i++) { let a = performance.now(); await step(1); const u = performance.now() - a; us.push(u); upd += u; uw = Math.max(uw, u); a = performance.now(); rm.render(); gl.finish(); const d = performance.now() - a; rs.push(d); cpu += d; worst = Math.max(worst, d); calls += R3.renderer.info.render.calls; tris += R3.renderer.info.render.triangles; N++; }
  }
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  print(realm, depth, 'enemies', G.enemies.length, 'update med/max ms', med(us).toFixed(2), uw.toFixed(1), 'render med/max', med(rs).toFixed(0), worst.toFixed(0), 'compile hitches', hitch, 'programs', prog0, '->', R3.renderer.info.programs.length);
  const st = { vis: 0, inst: 0, instN: 0, points: 0, pointsN: 0, transp: 0, shadowCast: 0, lights: 0, shLights: 0 }, big = {};
  R3.scene.traverseVisible(o => {
    if (o.isLight) { st.lights++; if (o.castShadow) st.shLights++; }
    if (o.isPoints) { st.points++; st.pointsN += o.geometry.attributes.position.count; }
    if (o.isMesh) { st.vis++; if (o.isInstancedMesh) { st.inst++; st.instN += o.count; } if (o.material && o.material.transparent) st.transp++; if (o.castShadow) st.shadowCast++;
      const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); const k = (o.name || o.geometry.type) + (o.isInstancedMesh ? '[I]' : ''); big[k] = (big[k] || 0) + n; }
  });
  const top = Object.entries(big).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => k + ':' + Math.round(v / 1000) + 'k');
  print(realm, depth, 'calls', Math.round(calls / N), 'tris', Math.round(tris / N / 1000) + 'k', 'render ms', (cpu / N).toFixed(1), 'map', M.w + 'x' + M.h, 'shadow', R3.lights.moon.castShadow ? R3.lights.moon.shadow.mapSize.x : 0, JSON.stringify(st), top.join(' '));
  if (realm === 'fjord' && depth === 1 && window.__TAG === 'shot') await shot('fjords66');
}
