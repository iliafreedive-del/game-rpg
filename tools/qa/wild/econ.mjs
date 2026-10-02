// Баланс: сколько золота лежит в поле (мобы+сундуки+тайники) против вместимости ноши; сколько стоит схрон.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('http://localhost:8123/index.html?nosdk=1');
await pg.waitForSelector('#titleBtns button'); await pg.click('#titleBtns button'); await pg.waitForSelector('.class-card'); await pg.click('.class-card');
await pg.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 60000 }); await pg.waitForTimeout(1200);
await pg.evaluate(() => { for (const b of document.querySelectorAll('button')) if (b.textContent.includes('опытный')) b.click(); });
for (const [realm, depth] of [['forest', 1], ['fjord', 1], ['fjord', 3], ['forest', 5], ['fjord', 5]]) {
  const r = await pg.evaluate(async ([realm, depth]) => { const G = __G; document.querySelectorAll('.modal-bg').forEach(e => e.remove()); G.profile.level = 12; G.profile.tutorial.prologue = true;
    const m = await import('/js/game/game.js'), C = await import('/js/game/combat.js'), L = await import('/js/game/loot.js'), N = await import('/js/game/nemesis.js');
    await m.loadZone('wild', { realm, depth }); G.stats = (await import('/js/game/stats.js')).stats(G.profile);
    const mobs = G.enemies.length; for (const e of [...G.enemies]) if (!e.dead) C.killEnemy(e, {});
    for (const it of G.zone.inter) if (it.type === 'chest') L.chestLoot(it.x, it.y, it.rich, G.zone.json.level + (it.rich ? 1 : 0), it.id);
    const chests = G.zone.inter.filter(i => i.type === 'chest').length, stashes = G.zone.inter.filter(i => i.type === 'stash').length;
    for (const it of G.zone.inter) if (it.type === 'stash') for (let i = 0; i < 2; i++) L.dropGold(it.x, it.y, 3.5 * (1 + .15 * (G.zone.json.level - 1)));
    const gold = G.pickups.filter(p => p.kind === 'gold').reduce((a, p) => a + p.amount, 0);
    return { realm, depth, lvl: G.zone.json.level, mobs, chests, stashes, gold, cap: N.carryCap(), fee15: Math.round(gold * .15), caches: G.zone.inter.filter(i => i.type === 'cache').length }; }, [realm, depth]);
  console.log(JSON.stringify(r));
}
console.log('errors', errs); await b.close();
