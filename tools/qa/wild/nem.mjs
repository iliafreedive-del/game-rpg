import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await pg.goto('http://localhost:8123/index.html?nosdk=1');
await pg.waitForSelector('#titleBtns button'); await pg.click('#titleBtns button'); await pg.waitForSelector('.class-card'); await pg.click('.class-card');
await pg.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 60000 }); await pg.waitForTimeout(1200);
await pg.evaluate(() => { for (const b of document.querySelectorAll('button')) if (b.textContent.includes('опытный')) b.click(); });
const J = f => pg.evaluate(f);
const enter = () => pg.evaluate(async () => { const G = __G; document.querySelectorAll('.modal-bg').forEach(e => e.remove()); G.modalOpen = false; G.paused = false; G.profile.level = 8; G.profile.tutorial.prologue = true;
  const m = await import('/js/game/game.js'); await m.loadZone('wild', { realm: 'fjord', depth: 1 }); G.stats = (await import('/js/game/stats.js')).stats(G.profile); G.player.hp = G.stats.maxHP; });
const state = () => pg.evaluate(() => { const G = __G, k = G.enemies.find(e => e.story === 'wildkeep'); return { gold: G.profile.gold, carry: G.wild.carry, slow: +G.wild.slow.toFixed(2), noise: +G.wild.noise.toFixed(2), nem: k && { name: k.name, hp: k.maxHP, rank: k.nem.rank, traits: k.nem.traits, weak: k.nem.weak }, trophies: (G.profile.nemesis||{}).trophies?.length, dmgMax: G.stats.dmgMax }; });
await enter(); console.log('RUN1 start', JSON.stringify(await state()));
// собрать ношу: бросить золото под ноги
await J(() => { const L = __G; return import('/js/game/loot.js').then(m => { for (let i = 0; i < 12; i++) m.dropGold(__G.player.x, __G.player.y, 20); }); });
await pg.waitForTimeout(1500); console.log('carry', JSON.stringify(await state()));
await pg.screenshot({ path: 'shots/nem_carry.png' });
// встреча с немезисом и смерть
await J(() => { const G = __G, k = G.enemies.find(e => e.story === 'wildkeep'); G.player.x = k.x; G.player.y = k.y + 2.5; k.aggro = true; k.nemMet = false; G.player.inv = 0; G.player.hp = 0.0; });
await pg.waitForTimeout(300); await J(async () => { const C = await import('/js/game/combat.js'); C.hurtPlayer(__G.enemies.find(e => e.story === 'wildkeep'), 1e6, 'phys'); });
await pg.waitForTimeout(2500); await pg.screenshot({ path: 'shots/nem_dead.png' });
console.log('after death', JSON.stringify(await J(() => ({ nem: __G.profile.nemesis.list.map(n => ({ n: n.name, rank: n.rank, title: n.title, stash: n.stash })), gold: __G.profile.gold, carry: __G.wild.carry }))));
await J(async () => { (await import('/js/game/game.js')).revive(false); document.getElementById('death').classList.add('hidden'); __G.paused = false; }); await pg.waitForTimeout(1500);
await enter(); console.log('RUN2 start', JSON.stringify(await state()));
await pg.waitForTimeout(300); await J(() => { const G = __G, k = G.enemies.find(e => e.story === 'wildkeep'); G.player.x = k.x; G.player.y = k.y + 3; k.aggro = true; }); await pg.waitForTimeout(1200); await pg.screenshot({ path: 'shots/nem_run2.png' });
// убить
const before = await state();
await J(async () => { const C = await import('/js/game/combat.js'); const k = __G.enemies.find(e => e.story === 'wildkeep'); C.damageEnemy(k, 1e9, { src: 'test', canCrit: false }); });
await pg.waitForTimeout(1200);
console.log('after kill', JSON.stringify(await J(() => ({ gold: __G.profile.gold, trophies: __G.profile.nemesis.trophies, dmgMax: __G.stats.dmgMax, carry: __G.wild.carry, pickups: __G.pickups.length }))), 'before dmgMax', before.dmgMax);
await pg.screenshot({ path: 'shots/nem_kill.png' });
await J(async () => { const { bus } = await import('/js/game/ctx.js'); bus.emit('openWild', 'fjord'); }); await pg.waitForTimeout(400); await pg.screenshot({ path: 'shots/nem_window.png' });
console.log('errors', errs); await b.close();
