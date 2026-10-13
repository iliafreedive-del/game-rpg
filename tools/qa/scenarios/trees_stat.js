// Деревья Meshy (сборка 71): отрисовки и треугольники в деревне, лесу и Фьордах + снимки. node tools/qa/run.mjs tools/qa/scenarios/trees_stat.js 1280 720
// TAG (env) — приставка имён снимков (/tmp/claude-0/shots/<TAG>_деревня.jpg …)
const G = window.__G, gm = await import('/js/game/game.js'), R3 = window.__R3, rm = await import('/js/render3d/renderer3d.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
const tag = (window.__TAG || 'x').split(':')[0];
const ONLY = window.__TAG && window.__TAG.split(':')[1];   // TAG=after:фьорды — одна зона
for (const [name, id, how] of [['деревня', 'town', {}], ['лес', 'wild', { realm: 'forest', depth: 1 }], ['фьорды', 'wild', { realm: 'fjord', depth: 1 }]]) {
  if (ONLY && name !== ONLY) continue;
  // раскладка походов случайна — для сравнения до/после одна и та же (Math.random с зерном на время загрузки); камера — дальше (зум 1,3)
  { let q = 12345; const R0 = Math.random; Math.random = () => ((q = (q * 1103515245 + 12345) >>> 0) / 4294967296); try { await gm.loadZone(id, how); } finally { Math.random = R0; } }
  (await import('/js/core/camzoom.js')).setZoom(1.3); for (let k = 0; k < 100 && !G.zoneReady; k++) await sleep(200); await sleep(2500);
  for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
  // герой — у самой густой группы деревьев карты (на свободной клетке рядом), чтобы деревья были в кадре
  const T = G.zone.statics.filter(d => /^tree|deadtree/.test(d.spr)), M = G.zone.map, P = G.player;
  // ближайшая к герою группа (≥ 4 дерева в 7 м), у которой есть свободная клетка в 3,5–6 м
  const near = T.map(t => [t, (t.x - P.x) ** 2 + (t.y - P.y) ** 2]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
  found: for (const t of near) { if (T.filter(u => (u.x - t.x) ** 2 + (u.y - t.y) ** 2 < 49).length < (how.realm === 'fjord' ? 2 : 4)) continue;   // во Фьордах ели реже
    for (let r = 3.5; r <= 6; r += 0.5) for (const [dx, dy] of [[r, r], [r, 0], [0, r], [-r, r], [r, -r], [-r, 0], [0, -r]]) if (M.free(t.x + dx, t.y + dy, 0.3)) { P.x = t.x + dx; P.y = t.y + dy; break found; } }
  G.paused = false; await step(40); G.paused = true;
  for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
  rm.render(); await sleep(300); rm.render();
  const r = R3.renderer.info.render, PL = R3.world.props; let trees = 0, ttris = 0, tcalls = 0, all = 0;
  for (const b of PL.batches) for (const p of b.parts) { const id = p.im.name || ''; if (!/tree|fir|oak|pine|birch|apple|spruce|log|^fo:|bush/.test(id)) continue; const n = p.im.count, t = (p.im.geometry.index ? p.im.geometry.index.count : p.im.geometry.attributes.position.count) / 3; if (n) { tcalls++; trees += n; ttris += n * t; } }
  print(name, 'кадр: отрисовок', r.calls, 'треугольников', Math.round(r.triangles / 1000) + 'k', '| деревья: видно', trees, 'мешей-партий', tcalls, 'треуг.', Math.round(ttris / 1000) + 'k');
  await shot(tag + '_' + name);
}
