const G = window.__G; const gm = await import('/js/game/game.js'); const S = await import('/js/game/stats.js'); const IT = await import('/js/game/items.js'); const SE = await import('/js/game/season.js'); const C = await import('/js/game/combat.js'); const ctx = await import('/js/game/ctx.js');
const P = G.profile; P.level = 8; G.stats = S.stats(P);
print('circleRew 1..5', [1, 2, 3, 4, 5].map(k => SE.circleRew(k).toFixed(2)).join(' '));
const w = IT.makeItem({ slot: 'weapon', ilvl: 9, rarity: 2, cls: P.cls }); delete w.req;
print('compare', JSON.stringify(S.compare(P, w, 'weapon').map(r => [r.label, r.before, r.after, r.delta])));
P.depths = { best: 5, stars: {} }; P.depthsMod = 'champs';
ctx.bus.emit('openDepths'); await sleep(500); print('depths modal', document.querySelector('.mod-card') && document.querySelector('.mod-card').innerText.replace(/\n+/g, ' | ')); await shot('depths_mods');
document.querySelector('.modal-bg .mx, .modal-bg .x') ; document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.paused = false;
await gm.loadZone('depths', { floor: 4 }); await sleep(1200); document.querySelectorAll('.modal-bg button').forEach((b, i) => { if (i === 0) b.click(); }); await sleep(300);
print('mod', G.run.modId, 'champions', G.enemies.filter(e => e.champion).length, '/', G.enemies.length, 'rm gold', SE.rm('gold'), 'buffs', document.getElementById('buffs').innerText);
P.depthsMod = 'dry'; await gm.loadZone('depths', { floor: 4 }); await sleep(1000); document.querySelectorAll('.modal-bg button').forEach((b, i) => { if (i === 0) b.click(); }); const p0 = P.potions.hp; gm.usePotion('hp'); print('dry potion', p0, '->', P.potions.hp);
// origin + death
const L = await import('/js/game/loot.js'); const e = G.enemies.find(x => !x.dead); P.luck = { dry: 69, grey: 0, big: 0 }; const n0 = G.pickups.length; L.enemyLoot(e); const it = G.pickups.slice(n0).find(p => p.kind === 'item'); print('origin', JSON.stringify(it && it.item.from));
G.player.inv = 0; G.player.hp = 3; e.dmgMul = 50; C.enemyHitsPlayer(e, 1, 'phys'); for (let i = 0; i < 120; i++) { await step(1); await sleep(15); }
print('fallen', JSON.stringify(P.fallen), '|', document.getElementById('death').innerText.replace(/\n+/g, ' | ').slice(0, 200));
