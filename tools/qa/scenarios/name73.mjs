// сборка 73: имя героя после выбора класса — «Назад», «ОК» только с годным именем, фильтр мата. Снимки ПК и телефона (вертикально и горизонтально).
import { browser, serve, sleep, stopServers, OUT, mkdir } from '../lib.mjs';
const b = await browser(); mkdir(OUT);
const url = await serve() + '/index.html?nocine=1&nosdk=1';
for (const [name, w, h, touch] of [['pc', 1280, 720, false], ['phone', 390, 844, true], ['phone_land', 844, 390, true]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch })).newPage();
  p.on('pageerror', e => console.log('ОШИБКА', e.message));
  await p.goto(url); await p.waitForSelector('#titleBtns button', { timeout: 90000 });
  await p.click('#titleBtns button'); await p.waitForSelector('.class-card'); await (await p.$$('.class-card'))[1].click();
  await p.waitForSelector('.name-in'); const st = () => p.evaluate(() => [document.activeElement === document.querySelector('.name-in'), document.querySelector('.name-form .gold').disabled, document.querySelector('.name-err').textContent.trim()]);
  console.log(name, 'пусто', await st());
  await p.fill('.name-in', 'хуйло'); console.log(name, 'мат', await st()); await p.screenshot({ path: OUT + `/name73_${name}_bad.jpg`, quality: 80 });
  await p.click('.name-row .btn:not(.gold)'); await p.waitForSelector('.class-card'); console.log(name, 'назад → классы', !!(await p.$('.class-card')));
  await (await p.$$('.class-card'))[0].click(); await p.waitForSelector('.name-in');
  await p.fill('.name-in', 'Аран'); console.log(name, 'Аран', await st()); await p.screenshot({ path: OUT + `/name73_${name}_ok.jpg`, quality: 80 });
  if (name === 'pc') {
    await p.press('.name-in', 'Enter');
    await p.waitForFunction(() => window.__G && window.__G.profile, null, { timeout: 120000 });
    console.log('профиль', await p.evaluate(() => [window.__G.profile.name, window.__G.profile.cls]));
  }
  await p.context().close();
}
await b.close(); stopServers();
