// П41/П53/П54 (сборка 60): деревья появлялись с опозданием. Герой идёт вправо по экрану (x+, y−) — после каждого шага
// число видимых деревьев должно совпадать с честным пересчётом отсечения (раньше слой не пересчитывался: ключ x + z не менялся).
// Запуск: node tools/qa/run.mjs tools/qa/scenarios/forest_cull.js
const G = window.__G, gm = await import('/js/game/game.js'); const R3 = window.__R3, rm = await import('/js/render3d/renderer3d.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
await gm.loadZone('wild', { realm: 'forest', depth: 1 }); for (let k = 0; k < 40 && !G.zoneReady; k++) await sleep(200); await sleep(800);
for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();   // окна-подсказки при входе
G.paused = false; await step(5);
const cnt = () => { let n = 0; for (const b of R3.world.props.batches) n += b.parts[0].im.count; return n; };
const P = G.player, M = G.zone.map; let bad = 0; const sx = M.w * 0.3, sy = M.h * 0.7;
for (let i = 0; i < 10; i++) {
  let nx = sx + i * 1.2, ny = sy - i * 1.2; for (let k = 0; k < 20 && !M.free(nx, ny, 0.3); k++) { nx += 0.5; ny += 0.5; }
  P.x = nx; P.y = ny; await step(20); rm.render();   // кадр вручную: в безголовом браузере rAF идёт ~1 раз в секунду
  const a = cnt(); R3.world.props.cull(R3.camera, true); const b = cnt();
  print('шаг', i, 'камера', R3.camera.position.x.toFixed(1), R3.camera.position.z.toFixed(1), 'видно', a, 'после пересчёта', b); if (Math.abs(a - b) > 2) bad++;
}
print(bad ? 'FAIL: отсечение отстаёт на ' + bad + ' шагах из 10' : 'OK: деревья пересчитываются на ходу');
