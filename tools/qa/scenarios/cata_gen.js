// П30: катакомбы — новая раскладка при каждом заходе. Четыре захода: всё достижимо (двери открыты), сюжет проходится:
// ключ → дверь → Хранитель → амулет → печать (7+ ур.) → Палач → портал домой. Снимки: cata_gen_<n>.jpg (вид), cata_gen_map.jpg (вся карта)
const G = window.__G, gm = await import('/js/game/game.js'), C = await import('/js/game/combat.js'), Q = await import('/js/game/quests.js'), WN = await import('/js/ui/windows.js'), HUD = await import('/js/ui/hud.js');
const P = G.profile; P.tutorial.prologue = true; P.level = 8;
const close = () => { document.querySelectorAll('.modal-bg button, button').forEach(b => { if (/Понятно|Закрыть|Ясно|Вперёд/.test(b.textContent)) b.click(); }); document.querySelectorAll('.modal-bg').forEach(x => x.remove()); G.modalOpen = false; G.paused = false; };
const h0 = performance.now(); await gm.loadZone('catacombs', {}); const hms = Math.round(performance.now() - h0); await sleep(300); close();
print('first visit load', hms + 'ms', 'gen', !!G.zone.json.gen, G.zone.json.w + 'x' + G.zone.json.h, 'floor painted', !!(G.zone.floorImgs && G.zone.floorImgs.length > 1));
const sigs = new Set();
for (let n = 1; n <= 3; n++) {
  P.world = { ...P.world, opened: {}, hasKey: false, hasMedallion: false, gateOpen: false, bossPortal: false }; P.story.flags = {}; P.bossCD = {};
  const t0 = performance.now(); await gm.loadZone('catacombs', {}); const ms = Math.round(performance.now() - t0); await sleep(400); close();
  const Z = G.zone, m = Z.map, J = Z.json; sigs.add(J.rows.join(''));
  // проходимость с открытыми дверьми (как a2_reach)
  const lockT = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if ('DG'.includes(m.ch(x, y)) && m.blocked(x, y)) { lockT.push([x, y]); m.setSolid(x, y, 0); }
  const r = 0.42, s2 = 0.5, nx = Math.ceil(m.w / s2), ny = Math.ceil(m.h / s2), ok = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) ok[j * nx + i] = m.free(i * s2 + 0.25, j * s2 + 0.25, r) ? 1 : 0;
  const dist = new Int32Array(nx * ny).fill(-1), q = [], st = [Math.floor(G.player.x / s2), Math.floor(G.player.y / s2)]; dist[st[1] * nx + st[0]] = 0; q.push(st[1] * nx + st[0]);
  for (let h = 0; h < q.length; h++) { const k = q[h], i = k % nx, j = (k / nx) | 0; for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const I = i + da, Jj = j + db; if (I < 0 || Jj < 0 || I >= nx || Jj >= ny) continue; const kk = Jj * nx + I; if (!ok[kk] || dist[kk] >= 0) continue; dist[kk] = dist[k] + 1; q.push(kk); } }
  const near = (x, y) => { let best = 1e9; const i0 = Math.floor(x / s2), j0 = Math.floor(y / s2); for (let j = j0 - 8; j <= j0 + 8; j++) for (let i = i0 - 8; i <= i0 + 8; i++) { if (i < 0 || j < 0 || i >= nx || j >= ny || dist[j * nx + i] < 0) continue; best = Math.min(best, Math.hypot(i * s2 + 0.25 - x, j * s2 + 0.25 - y)); } return best; };
  const fails = [];
  for (const it of Z.inter) { const d = near(it.x, it.y); if (d > (it.r || 1.4)) fails.push(it.id + ' ' + d.toFixed(1)); }
  for (const e of G.enemies) { const d = near(e.x, e.y); if (d > 1.2) fails.push('mob ' + e.type + (e.story ? '/' + e.story : '') + ' ' + d.toFixed(1)); }
  for (const [x, y] of lockT) m.setSolid(x, y, 1);
  const roomsOf = new Set(G.enemies.map(e => Z.roomAt(e.x, e.y)));
  print('visit', n + 1, 'gen', !!J.gen, J.w + 'x' + J.h, 'load', ms + 'ms', 'rooms', Object.keys(Z.rooms).length, 'inter', Z.inter.length, 'mobs', G.enemies.length, 'lv', [...new Set(G.enemies.filter(e => !e.story).map(e => e.lvl))].sort((a, b) => a - b).join(','), 'reach', fails.length ? 'FAIL ' + fails.join(' | ') : 'ok', 'floor painted', !!(Z.floorImgs && Z.floorImgs.length > 1), J.roomKinds.slice(10).join('/'));
  // кадр: герой в одной из новых комнат
  const xr = Z.rooms[Object.keys(Z.rooms).find(k => /^x/.test(k) && J.roomKinds[Object.keys(Z.rooms).indexOf(k)] !== 'shrine')];
  [G.player.x, G.player.y] = m.nearestFree(xr[0] + xr[2] / 2, xr[1] + xr[3] / 2, 0.45); G.cam.x = G.player.x; G.cam.y = G.player.y; for (const e of G.enemies) e.aggro = false;
  G.paused = true; await sleep(700); await shot('cata_gen_' + n); G.paused = false;
  // сюжет
  [G.player.x, G.player.y] = Z.start; Q.check?.();
  const guide0 = G.guide && (G.guide.id || G.guide.story);
  const ks = Z.inter.find(i => i.loot === 'key'); gm.interact(ks); close();
  const door = Z.inter.find(i => i.type === 'door'); gm.interact(door); close();
  const doorOpen = (door.tiles || [door.tile]).every(([x, y]) => !m.blocked(x, y));
  const el = G.enemies.find(e => e.story === 'elite'); const elRoom = Z.roomAt(el.x, el.y); C.killEnemy(el, {}); close(); await step(2); close();
  gm.interact(Z.inter.find(i => i.id === 'medallion')); close();
  const gate = Z.inter.find(i => i.type === 'gate'); P.level = 10; gm.interact(gate); close();
  const boss = G.enemies.find(e => e.story === 'boss'); const bRoom = boss && Z.roomAt(boss.x, boss.y);
  if (boss) { [G.player.x, G.player.y] = m.nearestFree(boss.x + 2, boss.y, 0.45); boss.aggro = true; await step(3); }
  const sealed = gate.sealed; if (boss) { C.killEnemy(boss, {}); close(); await step(3); close(); }
  const pr = Z.inter.find(i => i.id === 'portal_return');
  print('  story: guide→', guide0, 'key', P.world.hasKey, 'door open', doorOpen, 'elite in', elRoom, 'medallion', !!P.world.hasMedallion, 'gate', !!P.world.gateOpen, 'boss in', bRoom, 'arena sealed', !!sealed, 'unsealed after', !gate.sealed, 'return portal', pr && !pr.hidden);
  { const J0 = Z.json, k = Math.min(370 / J0.w, 560 / J0.h), c = document.createElement('canvas'); c.width = J0.w * k * 2; c.height = J0.h * k * 2 + 40;   // вся раскладка сверху
    c.style.cssText = `position:fixed;left:${(390 - J0.w * k) / 2}px;top:120px;width:${J0.w * k}px;z-index:99999;background:#0c0a09;border:1px solid #864`; document.body.appendChild(c);
    const x = c.getContext('2d'), u = k * 2; for (let y = 0; y < J0.h; y++) for (let X = 0; X < J0.w; X++) { const ch = J0.rows[y][X]; if (ch === '#') continue; x.fillStyle = ch === 'D' ? '#e0a020' : ch === 'G' ? '#b050ff' : '#7a6e60'; x.fillRect(X * u, y * u, u + 0.5, u + 0.5); }
    x.font = `${Math.round(u * 2.4)}px sans-serif`; x.textAlign = 'center'; const RU = { entry: 'Вход', ossuary: 'Оссуарий', gallery: 'Галерея', cave: 'Пещера', cross: 'Перекрёсток', crypt: 'Склеп', hall: 'Зал', altar: 'Алтарь', secret: 'Тайник', guard: 'Стража', arena: 'Арена' };
    Object.entries(J0.rooms).forEach(([n, r], i) => { x.fillStyle = /^x/.test(n) ? '#cfe' : '#ffd24a'; x.fillText(RU[n] || J0.roomKinds[i], (r[0] + r[2] / 2) * u, (r[1] + r[3] / 2) * u); });
    for (const it of Z.inter) { x.fillStyle = it.type === 'portal' ? '#c090ff' : it.loot === 'key' ? '#ff4040' : it.type === 'medallion' ? '#40ff80' : '#ffcc40'; x.beginPath(); x.arc(it.x * u, it.y * u, u * 0.9, 0, 7); x.fill(); }
    x.fillStyle = '#ddd'; x.textAlign = 'left'; x.fillText(`Раскладка ${n}: ${J0.w}×${J0.h}, 21 комната`, 8, J0.h * u + 30);
    await sleep(200); await shot('cata_gen_map' + n); c.remove(); }
}
print('distinct layouts', sigs.size);
