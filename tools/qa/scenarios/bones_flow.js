// Путь игрока: герой 2 ур. в деревне → костяной портал → окно мира → вход на поле 1 → автобой → снимки
const G = window.__G, gm = await import('/js/game/game.js'), { bus } = await import('/js/game/ctx.js');
if (G.zoneId !== 'town') { await gm.loadZone('town'); await sleep(1500); }
G.profile.level = 2; G.profile.tutorial.prologue = true;
const it = G.zone.inter.find(i => i.id === 'portal_bones');
G.player.x = it.x + 1.4; G.player.y = it.y + 2.2; await step(20); await sleep(500); await shot('flow_portal');
bus.emit('openWild', 'bones'); await sleep(700); await shot('flow_window');
print('window', (document.querySelector('.modal-bg') || {}).innerText?.slice(0, 400));
const btn = [...document.querySelectorAll('.modal-bg button')].find(b => /▶/.test(b.textContent)); print('btn', btn && btn.textContent);
if (btn) btn.click(); await sleep(2000);
document.querySelectorAll('button').forEach(b => { if (/Понятно/.test(b.textContent)) b.click(); });
print('zone', G.zoneId, G.zone.name, 'lvl', G.zone.json.level);
G.auto = true; let k0 = G.enemies.filter(e => e.dead).length;
for (let t = 0; t < 40; t++) { await step(30); document.querySelectorAll('button').forEach(b => { if (/Понятно/.test(b.textContent)) b.click(); }); if (t === 12) await shot('flow_fight'); if (G.player.dead) break; }
print('killed', G.enemies.filter(e => e.dead).length - k0, 'of', G.enemies.length, 'hp', Math.round(G.player.hp), 'dead', G.player.dead, 'xp', G.profile.xp, 'lvl', G.profile.level);
