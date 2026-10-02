import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('console', m => { if (['error'].includes(m.type())) errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await pg.goto('http://localhost:8123/index.html?nosdk=1');
await pg.waitForSelector('#titleBtns button'); await pg.click('#titleBtns button'); await pg.waitForSelector('.class-card'); await pg.click('.class-card');
await pg.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 60000 }); await pg.waitForTimeout(1200);
await pg.evaluate(() => { for (const b of document.querySelectorAll('button')) if (b.textContent.includes('опытный')) b.click(); });
for (const [realm, depth, tag, hpf] of [['fjord', 5, 'wildboss', 0.9], ['fjord', 5, 'wildboss', 0.5], ['fjord', 5, 'wildboss', 0.2], ['forest', 5, 'wildboss', 0.5], ['forest', 3, 'wildkeep', 1], ['fjord', 4, 'wildkeep', 1]]) {
  await pg.evaluate(async ([realm, depth, tag, hpf]) => {
    const G = window.__G; document.querySelectorAll('.modal-bg').forEach(e => e.remove()); G.modalOpen = false; G.paused = false;
    G.profile.level = 12; G.profile.tutorial.prologue = true;
    const m = await import('/js/game/game.js'); await m.loadZone('wild', { realm, depth });
    G.stats = (await import('/js/game/stats.js')).stats(G.profile); G.stats.maxHP = 1e7; G.player.hp = 1e7;
    const k = G.enemies.find(e => e.story === tag); k.hp = k.maxHP * hpf; G.player.x = k.x; G.player.y = k.y + 3.5;
    window.__log = { atk: {}, hits: 0, summons: 0, phases: [], lunges: 0 };
    const { bus } = await import('/js/game/ctx.js');
    bus.on('hurt', h => { window.__log.hits++; window.__log.atk[h.src] = (window.__log.atk[h.src] || 0) + 1; });
    bus.on('wildSummon', () => window.__log.summons++); bus.on('bossPhase', p => window.__log.phases.push(p.ph));
    for (const e of G.enemies) if (e.story === 'fortguard') { e.aggro = true; }
  }, [realm, depth, tag, hpf]);
  await pg.waitForTimeout(16000);
  const r = await pg.evaluate(async () => { const G = window.__G; return { log: window.__log, alive: G.enemies.filter(e => !e.dead).length, minions: G.enemies.filter(e => e.summoned && !e.dead).length, php: Math.round(G.player.hp) }; });
  console.log(realm, depth, hpf, JSON.stringify(r));
  await pg.screenshot({ path: `shots/sim_${realm}_${depth}_${hpf}.png` });
}
console.log('errors', errs.slice(0, 10));
await b.close();
