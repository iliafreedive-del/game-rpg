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
  // герой — у деревьев-акцентов («fo:…» в списках PropLayer): там, где их больше всего в 8 м; место пишется в лог (POS …).
  // TAG=before — место берётся из /qa_pos.json ({зона: [x, y]}), чтобы «до» снять с той же точки
  const M = G.zone.map, P = G.player, L = R3.world.props._lists, acc = [];
  for (const [k, l] of L) if (k.startsWith('fo:')) acc.push(...l);
  let spot = null;
  if (tag === 'before') try { spot = (await (await fetch('/qa_pos.json')).json())[name]; } catch (e) { print('нет /qa_pos.json'); }
  else if (acc.length) {
    const order = acc.map(a => [a, acc.filter(b => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < 64).length]).sort((a, b) => b[1] - a[1]).map(a => a[0]);
    found: for (const best of order) for (let r = 2.5; r <= 7; r += 0.5) for (const [dx, dy] of [[r, r], [r, 0], [0, r], [-r, r], [r, -r], [-r, 0], [0, -r], [-r, -r]]) if (M.free(best.x + dx, best.y + dy, 0.3)) { spot = [best.x + dx, best.y + dy]; break found; }
  }
  if (spot) { P.x = spot[0]; P.y = spot[1]; }
  print('POS', name, JSON.stringify(spot), 'акцентов', acc.length, 'карта', M.w, M.h, acc.map(a => a.x.toFixed(0) + ',' + a.y.toFixed(0)).join(' '));
  G.paused = false; await step(40); G.paused = true;
  for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
  rm.render(); await sleep(300); rm.render();
  const r = R3.renderer.info.render, PL = R3.world.props; let trees = 0, ttris = 0, tcalls = 0, all = 0;
  for (const b of PL.batches) for (const p of b.parts) { const id = p.im.name || ''; if (!/tree|fir|oak|pine|birch|apple|spruce|log|^fo:|bush/.test(id)) continue; const n = p.im.count, t = (p.im.geometry.index ? p.im.geometry.index.count : p.im.geometry.attributes.position.count) / 3; if (n) { tcalls++; trees += n; ttris += n * t; } }
  print(name, 'кадр: отрисовок', r.calls, 'треугольников', Math.round(r.triangles / 1000) + 'k', '| деревья: видно', trees, 'мешей-партий', tcalls, 'треуг.', Math.round(ttris / 1000) + 'k');
  await shot(tag + '_' + name);
}
