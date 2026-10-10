// a2 (правки 2): проходимость новых раскладок — каждый портал, сундук, схрон, тайник, саркофаг и моб достижимы со старта
// (сетка 0,5 м, радиус героя 0,42 — как town_reach.js). Ворота форта перед проверкой открываются. TAG=список зон через запятую (по умолчанию — всё).
const G = window.__G, gm = await import('/js/game/game.js'); G.profile.level = 30; G.profile.tutorial.prologue = true;
const close = () => document.querySelectorAll('.modal-bg button, button').forEach(b => { if (/Понятно|Закрыть|Ясно/.test(b.textContent)) b.click(); });
const ALL = ['wild:forest:1', 'wild:forest:3', 'wild:forest:6', 'wild:fjord:2', 'wild:fjord:12', 'wild:bones:4', 'wild:bones:6', 'wild:temple:1', 'wild:temple:6', 'depths:1', 'depths:5', 'depths:8', 'depths:10', 'catacombs'];
const list = window.__TAG && window.__TAG !== 'x' ? window.__TAG.split(',') : ALL; let bad = 0;
for (const z of list) {
  const [id, a, b] = z.split(':'); const how = id === 'wild' ? { realm: a, depth: +b } : id === 'depths' ? { floor: +a } : {};
  const t0 = performance.now(); await gm.loadZone(id, how); const ms = Math.round(performance.now() - t0); await sleep(300); close();
  const m = G.zone.map, gt = G.zone.wildGate; if (gt) for (const [tx, ty] of gt.tiles) m.setSolid(tx, ty, 0);
  if (id !== 'wild') for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if ('DG'.includes(m.ch(x, y))) m.setSolid(x, y, 0);   // двери и печати катакомб считаем открытыми
  const r = 0.42, s2 = 0.5, nx = Math.ceil(m.w / s2), ny = Math.ceil(m.h / s2), ok = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) ok[j * nx + i] = m.free(i * s2 + 0.25, j * s2 + 0.25, r) ? 1 : 0;
  const dist = new Int32Array(nx * ny).fill(-1), q = []; const st = [Math.floor(G.player.x / s2), Math.floor(G.player.y / s2)]; dist[st[1] * nx + st[0]] = 0; q.push(st[1] * nx + st[0]);
  for (let h = 0; h < q.length; h++) { const k = q[h], i = k % nx, j = (k / nx) | 0; for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const I = i + da, J = j + db; if (I < 0 || J < 0 || I >= nx || J >= ny) continue; const kk = J * nx + I; if (!ok[kk] || dist[kk] >= 0) continue; dist[kk] = dist[k] + 1; q.push(kk); } }
  const near = (x, y) => { let best = 1e9; const i0 = Math.floor(x / s2), j0 = Math.floor(y / s2); for (let j = j0 - 8; j <= j0 + 8; j++) for (let i = i0 - 8; i <= i0 + 8; i++) { if (i < 0 || j < 0 || i >= nx || j >= ny || dist[j * nx + i] < 0) continue; best = Math.min(best, Math.hypot(i * s2 + 0.25 - x, j * s2 + 0.25 - y)); } return best; };
  const fails = [];
  for (const it of G.zone.inter) { if (it.type === 'npc' || it.type === 'echo') continue; const d = near(it.x, it.y); if (d > (it.r || 1.4)) fails.push(it.id + ' ' + d.toFixed(1)); }
  for (const e of G.enemies) { const d = near(e.x, e.y); if (d > 1.2) fails.push('mob ' + e.type + (e.story ? '/' + e.story : '') + ' ' + d.toFixed(1)); }
  const ex = G.zone.inter.find(i => i.id === 'wild_next' || i.id === 'floor_exit'); let steps = -1;
  if (ex) { let bd = 1e9; for (let j = Math.floor(ex.y / s2) - 4; j <= ex.y / s2 + 4; j++) for (let i = Math.floor(ex.x / s2) - 4; i <= ex.x / s2 + 4; i++) { const k = j * nx + i; if (dist[k] >= 0 && dist[k] < bd) bd = dist[k]; } steps = bd * s2; }
  bad += fails.length;
  print(z, G.zone.json.w + 'x' + G.zone.json.h, 'load', ms + 'ms', 'inter', G.zone.inter.length, 'mobs', G.enemies.length, 'path→exit', steps + 'м', fails.length ? 'FAIL ' + fails.join(' | ') : 'ok', ex && ex.sealed ? 'sealed' : '', G.zone.json.roomKinds ? G.zone.json.roomKinds.join('/') : '');
}
print('TOTAL FAILS', bad);
