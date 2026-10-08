const G = window.__G; const gm = await import('/js/game/game.js'); const L = await import('/js/game/loot.js'); const { stats } = await import('/js/game/stats.js'); const { Enemy } = await import('/js/game/entities.js').catch(() => ({}));
const P = G.profile; P.level = 12; G.stats = stats(P);
// rarity pity
P.luck = { dry: 0, grey: 0, big: 0 }; const rs = []; for (let i = 0; i < 200; i++) rs.push(L.rollDrop(5, [100, 0, 0, 0]).rarity);
print('grey-only table: greens', rs.filter(r => r === 1).length, 'of 200 (expect 20)');
P.luck = { dry: 0, grey: 0, big: 0 }; const bs = []; for (let i = 0; i < 40; i++) bs.push(L.rollDrop(5, [60, 40, 0, 0], true).rarity);
print('elite table no blue: blues', bs.filter(r => r === 2).length, 'of 40 (expect 10)');
P.depths = { best: 9, stars: {} };
await gm.loadZone('depths', { floor: 10 }); await sleep(1500); document.querySelectorAll('.modal-bg button').forEach((b, i) => { if (i === 0) b.click(); }); await sleep(300);
// item pity: kill 150 regular non-boss enemies' loot rolls
const e0 = G.enemies.find(e => !e.D.boss && !e.D.elite && !e.champion); P.luck.dry = 0; const n0 = G.pickups.filter(p => p.kind === 'item').length; let drops = 0;
for (let i = 0; i < 140; i++) { const before = G.pickups.filter(p => p.kind === 'item').length; L.enemyLoot(e0); if (G.pickups.filter(p => p.kind === 'item').length > before) drops++; }
print('140 plain kills -> item drops', drops, 'dry now', P.luck.dry);
// boons
G.run.boons = []; G.stats = stats(P); const hp0 = G.stats.maxHP, d0 = G.stats.dmgMax, a0 = G.stats.aps;
G.run.boons = ['glass']; G.stats = stats(P); print('glass hp', hp0, '->', G.stats.maxHP, 'dmg', d0, '->', G.stats.dmgMax);
G.run.boons = ['bloodpact']; G.stats = stats(P); print('bloodpact aps', a0, '->', G.stats.aps, 'regen', G.stats.hpRegen);
G.run.boons = []; G.stats = stats(P); G.player.hp = G.stats.maxHP;

const C = await import('/js/game/ctx.js'); C.bus.emit('boonChoice'); await sleep(600);
print('modal', document.querySelector('.modal-bg') && document.querySelector('.modal-bg').innerText.replace(/\n+/g, ' | ').slice(0, 400));
const bl = document.querySelector('.btn.blood'); bl.click(); await sleep(100); print('tags', [...document.querySelectorAll('.boon .lv')].map(x => x.textContent).join(','));
await shot('boon_blood');
const hpb = G.player.hp; document.querySelector('.boons .boon').click(); await sleep(300); print('hp', Math.round(hpb), '->', Math.round(G.player.hp), 'boons', G.run.boons);
// champion telegraph
const ch = G.enemies.find(e => !e.dead && !e.D.boss && !e.D.elite && !e.D.proj); if (ch) { ch.champion = true; ch.startAttack('attack', G.player); print('champion teleg', JSON.stringify(ch.teleg)); }
// rest after boss floor
G.player.hp = 5; await gm.loadZone('depths', { floor: 11, keepBoons: true, fullHeal: true }); await sleep(800); print('after boss rest hp', Math.round(G.player.hp), '/', G.stats.maxHP);
