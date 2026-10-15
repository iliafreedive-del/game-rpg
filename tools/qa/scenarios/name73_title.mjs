// сборка 73: герой с именем — на титуле «Продолжить: Аран (Рыцарь Ордена)», в окне «Персонаж» — имя
import { browser, serve, stopServers, sleep, OUT } from '../lib.mjs';
const b = await browser(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const url = await serve() + '/index.html?nocine=1&nosdk=1';
await p.goto(url); await p.waitForSelector('#titleBtns button', { timeout: 90000 });
await p.click('#titleBtns button'); await p.waitForSelector('.class-card'); await (await p.$$('.class-card'))[0].click();
await p.fill('.name-in', 'Аран'); await p.press('.name-in', 'Enter');
await p.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 120000 }); await sleep(1500);
await p.evaluate(async () => { (await import('/js/game/game.js')).saveNow(true); });
await p.goto(url); await p.waitForSelector('#titleBtns button', { timeout: 90000 });
console.log('титул:', await p.$eval('#titleBtns button', e => e.textContent));
await p.click('#titleBtns button'); await p.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 120000 }); await sleep(1000);
console.log('имя в профиле:', await p.evaluate(() => window.__G.profile.name));
await b.close(); stopServers();
