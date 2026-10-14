// Кадр деревни в нескольких точках: старт героя и у каждого края (там в кадре окраина). Отрисовки, треугольники, время кадра
// (программный рендер — только для сравнения до/после) + снимки <TAG>_точкаN.jpg. node tools/qa/run.mjs tools/qa/scenarios/village_spots.js 1280 720
const G = window.__G, gm = await import('/js/game/game.js'), R3 = window.__R3, rm = await import('/js/render3d/renderer3d.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !G.zoneReady; k++) await sleep(200); }
await gm.loadZone('town', {}); for (let k = 0; k < 100 && !G.zoneReady; k++) await sleep(200); await sleep(2500);
for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
const M = G.zone.map, P = G.player, tag = window.__TAG || 'x', gl = R3.renderer.getContext(), px = new Uint8Array(4);
const spot = (x, y) => { for (let r = 0; r < 12; r += 0.5) for (const [dx, dy] of [[0, 0], [r, 0], [0, r], [-r, 0], [0, -r], [r, r], [-r, -r]]) if (M.free(x + dx, y + dy, 0.4)) return [x + dx, y + dy]; return [x, y]; };
const pts = [[P.x, P.y], spot(6, M.h / 2), spot(M.w / 2, 6), spot(M.w - 7, M.h / 2), spot(M.w / 2, M.h - 7), spot(7, 7)];
let sum = [0, 0, 0];
for (let i = 0; i < pts.length; i++) {
  P.x = pts[i][0]; P.y = pts[i][1]; G.paused = false; await step(40); G.paused = true;
  rm.render(); rm.render(); const info = R3.renderer.info.render, c = info.calls, t = info.triangles;
  const t0 = performance.now(); for (let k = 0; k < 4; k++) { rm.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } const ms = (performance.now() - t0) / 4;
  sum[0] += c; sum[1] += t; sum[2] += ms;
  print('точка', i, pts[i].map(v => v.toFixed(0)).join(','), 'отрисовок', c, 'треуг.', Math.round(t / 1000) + 'k', 'кадр', ms.toFixed(0), 'мс');
  await shot(tag + '_точка' + i);
}
print('СРЕДНЕЕ: отрисовок', Math.round(sum[0] / pts.length), 'треуг.', Math.round(sum[1] / pts.length / 1000) + 'k', 'кадр', (sum[2] / pts.length).toFixed(0), 'мс');
