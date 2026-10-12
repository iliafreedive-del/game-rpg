// Лаги (12 октября): сколько дорогих вызовов WebGL в обычных кадрах — сборка шейдеров (compileShader/getProgramParameter)
// и заливка текстур (texImage2D) — по зонам, пачками по 30 кадров. В установившемся кадре их должно быть 0.
// Запуск: CLS=1 node tools/qa/run.mjs tools/qa/scenarios/glcalls.js 1298 742
const G = window.__G, gm = await import('/js/game/game.js'); const R3 = window.__R3, rm = await import('/js/render3d/renderer3d.js'), hud = await import('/js/ui/hud.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
G.profile.settings.quality = 'high';
const gl = R3.renderer.getContext(), C = {}, PX = { n: 0 };
for (const f of ['compileShader', 'getProgramParameter', 'texImage2D', 'texSubImage2D', 'linkProgram']) { const o = gl[f].bind(gl); gl[f] = (...a) => { C[f] = (C[f] || 0) + 1; if (f === 'texImage2D') { const s = a[a.length - 1]; if (s && s.width) PX.n += s.width * s.height; } return o(...a); }; }
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
for (const z of (window.__TAG !== 'x' ? window.__TAG : 'town,catacombs,forest,fjord').split(',')) {
  if (z === 'forest' || z === 'fjord' || z === 'temple') await gm.loadZone('wild', { realm: z, depth: 3 }); else await gm.loadZone(z, z === 'catacombs' ? {} : undefined);
  for (let k = 0; k < 100 && !G.zoneReady; k++) await sleep(200); await sleep(3000);
  for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
  G.paused = false;
  for (let batch = 0; batch < 4; batch++) {
    for (const k in C) C[k] = 0; PX.n = 0; const T = [];
    for (let i = 0; i < 30; i++) { const a = performance.now(); gm.update(1 / 60); rm.render(); hud.updateHUD(1 / 60); T.push(performance.now() - a); }
    const I = R3.renderer.info;
    print(z, 'пачка', batch, 'кадр JS med', med(T).toFixed(1), 'max', Math.max(...T).toFixed(0), JSON.stringify(C), 'texPx', PX.n, 'calls', I.render.calls, 'tris', Math.round(I.render.triangles / 1000) + 'k', 'programs', I.programs.length, 'enemies', G.enemies.filter(e => !e.dead).length, 'effects', G.effects.length);
    await sleep(300);
  }
}
