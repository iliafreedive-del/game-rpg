// Костяной портал в деревне: герой рядом, снимок с обычной камеры и сверху
const gm = await import('/js/game/game.js'); if (window.__G.zoneId !== 'town') { await gm.loadZone('town'); await sleep(1500); }
const G = window.__G; const it = G.zone.inter.find(i => i.id === 'portal_bones'); print('portal', it && [it.x.toFixed(1), it.y.toFixed(1)], it && it.reqLevel);
G.player.x = it.x + 2.2; G.player.y = it.y + 2.2; await step(20); await sleep(800); await shot('bones_portal');
G.zoomMul = 0.5; await step(5); await sleep(600); await shot('bones_portal_far');
