// сборка 73: у Элвина вместо прочерка — «Нужен ур. N», когда усиление упёрлось в предел по уровню героя. Снимки ПК и телефона.
import { browser, serve, sleep, stopServers, OUT, mkdir } from '../lib.mjs';
const b = await browser(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await p.goto(await serve() + '/index.html?shot&nosdk=1'); await p.waitForSelector('#titleBtns button', { timeout: 90000 });
await p.click('#titleBtns button'); await p.waitForSelector('.class-card'); await (await p.$$('.class-card'))[0].click();
await p.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 120000 });
const openElvin = () => p.evaluate(async () => {
  const G = window.__G, P = G.profile, gm = await import('/js/game/game.js'), { bus } = await import('/js/game/ctx.js'), { STORY } = await import('/js/data/quests.js');
  if (G.zoneId !== 'town') { P.tutorial.prologue = true; await gm.loadZone('town', {}); await new Promise(r => setTimeout(r, 2500)); }
  document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
  P.story.stage = STORY.findIndex(q => q.id === 'c3_depths15'); P.level = 2; P.gold = 5000; P.shards = 50; P.upg = { dmg: 2, hp: 1, crit: 2, aps: 1 };
  const tr = G.npcs.find(n => n.id === 'trainer'); G.player.x = tr.x + 1; G.player.y = tr.y + 1;
  bus.emit('panel', null); bus.emit('panel', tr); await new Promise(r => setTimeout(r, 500));
  return [...document.querySelectorAll('.pn-btn.need, .pn-btn')].map(b => b.innerText.replace(/\s+/g, ' ')).join(' | ');
});
mkdir(OUT);
for (const [name, w, h] of [['pc', 1280, 720], ['phone', 390, 844]]) {
  await p.setViewportSize({ width: w, height: h }); await sleep(500);
  console.log(name, await openElvin()); await p.screenshot({ path: OUT + `/elvin_need73_${name}.jpg`, quality: 80, timeout: 150000 });
}
await b.close(); stopServers();
