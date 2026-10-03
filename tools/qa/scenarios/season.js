// Сборка 21: путь сезона (очки, награда), коллекция, испытание недели (вход, правило, итог), строка цели, меню
const G = window.__G, gm = await import('/js/game/game.js'), { bus } = await import('/js/game/ctx.js'), SE = await import('/js/game/season.js'), I = await import('/js/game/items.js'), C = await import('/js/game/combat.js');
G.profile.tutorial.prologue = true; G.profile.level = 8; if (G.zoneId !== 'town') { await gm.loadZone('town'); await sleep(1200); }
const st = document.createElement('style'); st.textContent = '#toasts{display:none!important}'; document.head.appendChild(st);
const P = G.profile; SE.addSeason(700); print('season', JSON.stringify(SE.seasonLevel()), 'claimable', SE.seasonClaimable());
const g0 = P.gold; SE.claimSeason(1); SE.claimSeason(2); print('claimed 1-2 gold +', P.gold - g0);
P.bag.push(I.makeItem({ slot: 'head', cls: P.cls, ilvl: 6, rarity: 2 }), I.makeItem({ slot: 'head', cls: P.cls, ilvl: 6, rarity: 1 }), I.makeItem({ slot: 'chest', cls: P.cls, ilvl: 6, rarity: 0 }), I.makeItem({ slot: 'chest', cls: P.cls, ilvl: 6, rarity: 0 }));
const dmg0 = G.stats.dmgMax; print('codex added', SE.codexScan(), 'count', SE.codexCount(P)); const { stats } = await import('/js/game/stats.js'); G.stats = stats(P); print('dmgMax', dmg0, '->', G.stats.dmgMax, 'codex', G.stats.codex);
print('goal', SE.nextGoalLine()); bus.emit('hud'); await step(3); await sleep(300); await shot('season_hud');
const { openWindow } = await import('/js/ui/windows.js'); openWindow('season'); await sleep(1600); await shot('season_window');
document.querySelectorAll('.modal-bg button').forEach(b => { if (b.textContent.trim() === '✕') b.click(); }); await sleep(300);
openWindow('codex'); await sleep(1600); await shot('codex_window'); document.querySelectorAll('.modal-bg button').forEach(b => { if (b.textContent.trim() === '✕') b.click(); }); await sleep(300);
P.depths = { best: 6, stars: {} }; P.story.flags.bossKilled = true; bus.emit('openDepths'); await sleep(1600); await shot('depths_weekly');
const R = SE.weeklyRule(); print('rule', R.name, 'floor', SE.weeklyFloor(P.level));
document.querySelectorAll('.modal-bg button').forEach(b => { if (b.textContent.trim() === '✕') b.click(); }); await sleep(300);
await gm.loadZone('depths', { floor: SE.weeklyFloor(P.level), weekly: true }); await sleep(1200);
document.querySelectorAll('button').forEach(b => { if (/Вперёд|Понятно/.test(b.textContent)) b.click(); });
print('weekly zone', G.zone.name, 'run.weekly', G.run.weekly && G.run.weekly.id, 'enemies', G.enemies.length, 'hp', G.enemies[0] && G.enemies[0].maxHP);
for (const e of G.enemies.filter(e => !e.dead)) C.killEnemy(e, {}); await step(5);
const best0 = P.depths.best; gm.finishFloor(); await sleep(1200); await shot('weekly_result');
print('weekly', JSON.stringify(P.weekly), 'depths best unchanged', P.depths.best === best0);
