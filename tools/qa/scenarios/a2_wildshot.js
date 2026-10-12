// a2 (правки 2, П55/П56): поле похода — снимок у старта (обычная камера), у края и обзор сверху. TAG=realm:depth[:name]
const G = window.__G, gm = await import('/js/game/game.js'); const [RL, D0, NM] = (window.__TAG || 'forest:1').split(':'); const D = +D0 || 1;
G.profile.level = 30;
await gm.loadZone('wild', { realm: RL, depth: D }); await sleep(1500);
const close = () => document.querySelectorAll('.modal-bg button, .wild-hint button, button').forEach(b => { if (/Понятно|Закрыть|Ясно/.test(b.textContent)) b.click(); });
close(); await step(10); close();
const J = G.zone.json; print('zone', J.name, J.w + 'x' + J.h, 'enemies', G.enemies.length, 'objects', J.objects.length);
const R3 = window.__R3;
G.enemies.forEach(e => { e.hp = 1e9; e.aggro = false; e.x = -99; e.y = -99; });
const nm = 'a2_' + (NM || (RL + D));
await step(30); await sleep(700); close(); await step(2); await shot(nm + '_start'); print('tris', R3.renderer.info.render.triangles, 'calls', R3.renderer.info.render.calls);
const ex = G.zone.inter.find(i => i.id === 'wild_next'); if (ex) { G.player.x = ex.x + 3; G.player.y = ex.y + 3; [G.player.x, G.player.y] = G.zone.map.nearestFree(G.player.x, G.player.y, 0.5); await step(30); await sleep(700); close(); await step(2); await shot(nm + '_exit'); }
G.zoomMul = 0.45; await step(10); await sleep(800); close(); await step(2); await shot(nm + '_zoomout');
G.zoomMul = 0.2; if (R3.scene.fog) { R3.scene.fog.near = 300; R3.scene.fog.far = 600; } G.player.x = J.w / 2; G.player.y = J.h / 2; G.cam.x = G.player.x; G.cam.y = G.player.y; await step(10); await sleep(900); close(); await step(2); await shot(nm + '_top');
