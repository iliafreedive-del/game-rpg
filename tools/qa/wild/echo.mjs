// Эхо-силуэты: воин / лучник / маг с ником; скриншоты до подбора.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await pg.goto('http://localhost:8123/index.html?nosdk=1');
await pg.waitForSelector('#titleBtns button'); await pg.click('#titleBtns button'); await pg.waitForSelector('.class-card'); await pg.click('.class-card');
await pg.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 60000 }); await pg.waitForTimeout(1200);
await pg.evaluate(() => { for (const b of document.querySelectorAll('button')) if (b.textContent.includes('опытный')) b.click(); });
const J = f => pg.evaluate(f);
await J(() => { __G.profile.wild = { hints: { enter: 1, nemesis: 1, carry: 1, echo: 1 } }; });
let shot = 0;
for (const [realm, depth] of [['fjord', 1], ['forest', 2], ['fjord', 4], ['forest', 3]]) {
  await pg.evaluate(async ([realm, depth]) => { const G = __G; document.querySelectorAll('.modal-bg').forEach(e => e.remove()); G.modalOpen = false; G.paused = false; G.profile.level = 12; G.profile.tutorial.prologue = true;
    const m = await import('/js/game/game.js'); await m.loadZone('wild', { realm, depth }); }, [realm, depth]);
  await pg.waitForTimeout(1500);
  console.log(realm, depth, JSON.stringify(await J(() => __G.npcs.map(n => [n.id, n.name]))));
  if (shot++ < 3) { await J(() => { const n = __G.npcs[0]; if (n) { __G.player.x = n.x + 2.5; __G.player.y = n.y + 2.5; __G.cam.x = n.x; __G.cam.y = n.y; } }); await pg.waitForTimeout(700); await pg.screenshot({ path: `shots/echo_${shot}.png` }); }
}
console.log('errors', errs); await b.close();
