import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, realm='fjord', depth='1', out='a', extra=''] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(async () => chromium.launch({ args: ['--no-sandbox'] }));
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
await pg.goto('http://localhost:8123/index.html?nosdk=1');
await pg.waitForSelector('#titleBtns button', { timeout: 30000 });
await pg.click('#titleBtns button');
await pg.waitForSelector('.class-card'); await pg.click('.class-card');
await pg.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 60000 });
await pg.waitForTimeout(1500);
await pg.evaluate(() => { for (const b of document.querySelectorAll('button')) if (b.textContent.includes('опытный')) b.click(); });
await pg.evaluate(async ([realm, depth, extra]) => {
  const G = window.__G; document.querySelectorAll('.modal-bg').forEach(e => e.remove()); G.modalOpen = false; G.paused = false;
  G.profile.level = 8; G.profile.tutorial.prologue = true;
  const m = await import('/js/game/game.js');
  await m.loadZone(extra === 'town' ? 'town' : 'wild', { realm, depth: +depth });
  G.stats = (await import('/js/game/stats.js')).stats(G.profile); G.player.hp = G.stats.maxHP; 
  const J = G.zone.json, pl = G.player;
  const tp = (x, y) => { [pl.x, pl.y] = G.zone.map.nearestFree(x, y, 0.4); G.cam.x = pl.x; G.cam.y = pl.y; };
  if (extra === 'fort') tp(J.wild.gate.x + 0.5, J.wild.gate.y + 3.5);
  else if (extra === 'inside') { tp(J.wild.fort.x + 7, J.wild.fort.y + 8); }
  else if (extra.startsWith('mob:')) { const e = G.enemies.find(e => e.type === extra.slice(4)); if (e) { tp(e.x - 3.5, e.y + 3.5); } }
  else if (extra.startsWith('spawn:')) {
    const { Enemy } = await import('/js/game/entities.js'); const types = extra.slice(6).split(',');
    tp(J.start[0] + 8, J.start[1] - 8); G.enemies.length = 0;
    types.forEach((t, i) => { const e = new Enemy(t, pl.x + 3 + i * 1.8 - types.length * 0.9, pl.y - 2 - i * 0.2, J.level); e.aggro = false; G.enemies.push(e); });
  }
  else if (extra === 'exit') { tp(J.start[0] + 8, J.start[1] - 6); }

}, [realm, depth, extra]);
await pg.waitForTimeout(1500);
await pg.screenshot({ path: `shots/${out}.png` });
console.log('errors:', errs.slice(0, 12));
const info = await pg.evaluate(() => ({ zone: __G.zoneId, enemies: __G.enemies.length, types: [...new Set(__G.enemies.map(e => e.type))], inter: __G.zone.inter.length }));
console.log(JSON.stringify(info));
await b.close();
