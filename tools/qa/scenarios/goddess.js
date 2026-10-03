// Алтарь богини (сборка 19): модель на площади, окно, календарь, благословение за рекламу (демо), таймер в HUD
const G = window.__G, gm = await import('/js/game/game.js'), { bus } = await import('/js/game/ctx.js'), M = await import('/js/platform/monetize.js');
G.profile.tutorial.prologue = true; G.profile.level = 5;
if (G.zoneId !== 'town') { await gm.loadZone('town'); await sleep(1500); }
const it = G.zone.inter.find(i => i.id === 'shrine'); print('altar', it && [it.x.toFixed(1), it.y.toFixed(1)], 'plate', it && it.plate);
G.player.x = it.x + 3.5; G.player.y = it.y + 4.2; await step(20); await sleep(700); await shot('goddess_altar');
G.player.x = G.zone.start[0]; G.player.y = G.zone.start[1]; G.zoomMul = 0.7; await step(20); await sleep(700); await shot('goddess_from_start'); G.zoomMul = 1;
G.profile.daily = { last: 0, streak: 5 };
bus.emit('openShrine'); await sleep(600); await shot('goddess_window');
const gold0 = G.profile.gold; M.claimDaily(false); print('claimed day 6, gold +', G.profile.gold - gold0, 'scrolls', G.profile.scrolls, M.dailyStatus());
const adClick = setInterval(() => { const b = document.querySelector('.demo-ad button:not(.demo-ad-x)'); if (b && !b.disabled) b.click(); }, 200);
const ok = await M.blessing(); print('bless ok', ok, 'left min', (M.blessLeft() / 60000).toFixed(1));
await M.blessing(); await M.blessing(); const r4 = await M.blessing(); print('after 3 more: left', (M.blessLeft() / 60000).toFixed(1), '4th ok', r4);
document.querySelectorAll('.modal-bg button').forEach(b => { if (b.textContent.trim() === '×' || /Закрыть/.test(b.textContent)) b.click(); }); bus.emit('hud'); await step(5); await sleep(400);
bus.emit('openShrine'); await sleep(500); await shot('goddess_window2');
