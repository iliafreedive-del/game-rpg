// Костяные пустоши: поле глубины D (localStorage BD, по умолчанию 1) — снимок с обычной камеры у старта, у скелета великана и обзор сверху
const G = window.__G, gm = await import('/js/game/game.js'), D = +(localStorage.getItem('BD') || 6);
G.profile.level = 6;
await gm.loadZone('wild', { realm: 'bones', depth: D }); await sleep(1500);
const close = () => document.querySelectorAll('.modal-bg button, .wild-hint button, button').forEach(b => { if (/Понятно|Закрыть|Ясно/.test(b.textContent)) b.click(); });
close(); await step(10); close();
print('zone', G.zone.name, 'enemies', G.enemies.length, 'types', [...new Set(G.enemies.map(e => e.type))].join(','));
const R3 = window.__R3; print('tris', R3 && R3.renderer && R3.renderer.info.render.triangles);
G.enemies.forEach(e => { e.hp = 1e9; e.aggro = false; });
for (const e of G.enemies) { e.x = -99; e.y = -99; }
await step(30); await sleep(600); close(); await step(2); await shot('bones_d' + D + '_start');
const giant = G.zone.statics.find(s => /^giant_|^tusk_arch/.test(s.spr || '')); if (giant) { G.player.x = giant.x - 4; G.player.y = giant.y - 4.5; await step(30); await sleep(600); close(); await step(2); await shot('bones_d' + D + '_giant'); print('giant', giant.spr); }
const hut = G.zone.statics.find(s => s.model === 'bone_hut' || s.spr === 'bone_hut'); if (hut) { G.player.x = hut.x + 2.5; G.player.y = hut.y + 3.5; await step(30); await sleep(600); close(); await step(2); await shot('bones_d' + D + '_camp'); }
G.zoomMul = 0.34; if (R3 && R3.scene.fog) { R3.scene.fog.near = 200; R3.scene.fog.far = 400; } G.player.x = 32; G.player.y = 32; await step(10); await sleep(800); close(); await step(2); await shot('bones_d' + D + '_top');
