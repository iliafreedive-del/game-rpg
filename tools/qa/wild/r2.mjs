// Раунд 2: схрон, Эхо, «Поле помнит», стена врагов в Цитадели.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await pg.goto('http://localhost:8123/index.html?nosdk=1');
await pg.waitForSelector('#titleBtns button'); await pg.click('#titleBtns button'); await pg.waitForSelector('.class-card'); await pg.click('.class-card');
await pg.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 60000 }); await pg.waitForTimeout(1200);
await pg.evaluate(() => { for (const b of document.querySelectorAll('button')) if (b.textContent.includes('опытный')) b.click(); });
const J = f => pg.evaluate(f);
const enter = (realm = 'fjord', depth = 1) => pg.evaluate(async ([realm, depth]) => { const G = __G; document.querySelectorAll('.modal-bg').forEach(e => e.remove()); G.modalOpen = false; G.paused = false; G.profile.level = 12; G.profile.tutorial.prologue = true;
  const m = await import('/js/game/game.js'); await m.loadZone('wild', { realm, depth }); G.stats = (await import('/js/game/stats.js')).stats(G.profile); G.player.hp = G.stats.maxHP; }, [realm, depth]);
await enter(); await pg.waitForTimeout(800);
console.log('caches', JSON.stringify(await J(() => __G.zone.inter.filter(i => i.type === 'cache' || i.type === 'echo').map(i => [i.type, i.id, Math.round(i.x), Math.round(i.y)]))));
// схрон: набрать ношу, подойти, вынести
await J(async () => { const m = await import('/js/game/loot.js'); for (let i = 0; i < 14; i++) m.dropGold(__G.player.x, __G.player.y, 25); });
await pg.waitForTimeout(1500);
console.log('carry', JSON.stringify(await J(() => ({ carry: __G.wild.carry, greed: __G.wild.greed, gold: __G.profile.gold, goal: document.body.innerText.match(/🎯[^\n]*/)?.[0] }))));
await pg.screenshot({ path: 'shots/r2_hint_cache.png' });
const gold0 = await J(() => __G.profile.gold);
await J(async () => { const c = __G.zone.inter.find(i => i.type === 'cache'); __G.player.x = c.x; __G.player.y = c.y + 1.2; });
await pg.waitForTimeout(400); await pg.screenshot({ path: 'shots/r2_cache_near.png' });
await J(async () => { const m = await import('/js/game/wildmem.js'); m.useCache(__G.zone.inter.find(i => i.type === 'cache')); });
await pg.waitForTimeout(500);
console.log('after cache', JSON.stringify(await J(() => ({ carry: __G.wild.carry, gold: __G.profile.gold }))), 'gold0', gold0);
await pg.screenshot({ path: 'shots/r2_cache_used.png' });
// Эхо странника
await J(async () => { const e = __G.zone.inter.find(i => i.type === 'echo'); if (e) { __G.player.x = e.x; __G.player.y = e.y + 1; const m = await import('/js/game/wildmem.js'); m.useEcho(e); } });
await pg.waitForTimeout(600); await pg.screenshot({ path: 'shots/r2_echo.png' });
await J(() => { const e = __G.zone.inter.find(i => i.type === 'echo'); __G.player.x = e.x + 2.2; __G.player.y = e.y + 2.2; __G.cam.x = e.x; __G.cam.y = e.y; }); await pg.waitForTimeout(900); await pg.screenshot({ path: 'shots/r2_echo_ghost.png' });
console.log('npcs', JSON.stringify(await J(() => __G.npcs.map(n => [n.id, n.name]))));
// смерть → своё Эхо; поле помнит смерти
for (let i = 0; i < 2; i++) {
  await enter(); await J(async () => { const C = await import('/js/game/combat.js'); const k = __G.enemies.find(e => e.story === 'wildkeep'); __G.player.inv = 0; k.aggro = true; __G.wild.carry = 100; C.hurtPlayer(k, 1e6, 'phys'); });
  await pg.waitForTimeout(1500);
  await J(async () => { (await import('/js/game/game.js')).revive(false); document.getElementById('death').classList.add('hidden'); __G.paused = false; }); await pg.waitForTimeout(800);
}
await J(() => { __G.profile.wild.fjord.mem.deaths = 2; });
console.log('mem', JSON.stringify(await J(() => __G.profile.wild.fjord.mem)), JSON.stringify(await J(() => __G.profile.wild.fjord.echo)));
await enter(); await pg.waitForTimeout(4200);
console.log('traits', JSON.stringify(await J(() => __G.wild.mem.map(t => t.id))), 'echo', JSON.stringify(await J(() => __G.zone.inter.filter(i => i.type === 'echo').map(i => [i.mine, Math.round(i.x), Math.round(i.y)]))));
await pg.screenshot({ path: 'shots/r2_memory.png' });
// стиль: 12 дальних убийств
await J(async () => { const C = await import('/js/game/combat.js'); const G = __G; for (let i = 0; i < 12; i++) { const e = G.enemies.find(e => !e.dead && !e.story); if (!e) break; e.lastSrc = 'weapon'; C.killEnemy(e, {}); } G.profile.wild.fjord.mem.deaths = 0; });
await enter(); await pg.waitForTimeout(4200); console.log('traits2', JSON.stringify(await J(() => __G.wild.mem.map(t => t.id))));
// Цитадель: стена врагов
await J(async () => { const P = __G.profile; P.nemesis = P.nemesis || { seq: 0, list: [], trophies: [] }; P.nemesis.trophies.push({ id: 91, name: 'Хрольф Костолом, Грозный', realm: 'fjord', rank: 3, bonus: 2.5 }, { id: 92, name: 'Прохор Душегуб', realm: 'forest', rank: 1, bonus: 1.5 }); const m = await import('/js/game/game.js'); await m.loadZone('castle', {}); });
await pg.waitForTimeout(800); await J(() => document.querySelectorAll('.modal-bg').forEach(e => e.remove())); await J(() => { __G.modalOpen = false; __G.paused = false; const w = __G.zone.inter.find(i => i.type === 'nemwall'); __G.player.x = w.x; __G.player.y = w.y + 1.4; __G.cam.x = w.x; __G.cam.y = w.y; }); await pg.waitForTimeout(900);
await pg.screenshot({ path: 'shots/r2_wall.png' });
await J(() => { __G.player.x = 26; __G.player.y = 9; __G.cam.x = 26; __G.cam.y = 9; }); await pg.waitForTimeout(500); await pg.screenshot({ path: 'shots/r2_trophyroom.png' });
console.log('errors', errs); await b.close();
