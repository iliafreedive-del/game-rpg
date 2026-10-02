// Скриншоты 3D: node tools/shot3d.mjs "<url>" out.jpg <ждать_мс> <w> <h> "действия через @@" ; действия: eval:<js> | wait:<мс> | click:<текст кнопки> | step:<кадров игры по 1/30 с> | down:<клавиша> | up:<клавиша>; env CLIP=x,y,w,h DSF=2
// Рендер без GPU очень медленный (≈1–2 кадра/с), поэтому время игры двигаем через step:N, а не ожиданием.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [,, url, out, wait = '2500', w = '1280', h = '720', actions = ''] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DSF || 1) });
const logs = []; p.on('console', m => { if (['error', 'warning', 'info', 'log'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => logs.push('PAGEERR: ' + e.message));
await p.goto(url);
await p.waitForSelector('#titleBtns button', { timeout: 20000 });
await p.evaluate(() => { localStorage.clear(); });
await p.reload(); await p.waitForSelector('#titleBtns button');
await p.click('#titleBtns button');
await p.waitForSelector('.class-card'); await (await p.$$('.class-card'))[+(process.env.CLS || 0)].click();   // CLS=0 воин, 1 лучник, 2 маг
await p.waitForFunction(() => window.__G && window.__G.zone && window.__G.player, null, { timeout: 30000 });
await p.waitForTimeout(+wait);
// пропустить обучение, если спросит

for (const a of actions.split('@@').filter(Boolean)) {
  const i = a.indexOf(':'), k = a.slice(0, i), v = a.slice(i + 1);
  if (k === 'key') { const [kk, ms] = v.split(','); await p.keyboard.down(kk); await p.waitForTimeout(+(ms || 600)); await p.keyboard.up(kk); }
  if (k === 'click') await p.evaluate(t => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t))?.click(), v);
  if (k === 'step') await p.evaluate(async n => { const m = await import('/js/game/game.js'); for (let i = 0; i < n; i++) m.update(1 / 30); }, +v);
  if (k === 'down') await p.keyboard.down(v);
  if (k === 'up') await p.keyboard.up(v);
  if (k === 'wait') await p.waitForTimeout(+v);
  if (k === 'eval') await p.evaluate(v);
}
await p.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('опытный'))?.click());
await p.waitForTimeout(300);
await p.screenshot({ path: out, type: out.endsWith('.jpg') ? 'jpeg' : 'png', quality: 84, clip: process.env.CLIP ? Object.fromEntries(['x','y','width','height'].map((k, i) => [k, +process.env.CLIP.split(',')[i]])) : undefined });
console.log(logs.slice(0, 25).join('\n'));
console.log(await p.evaluate(() => JSON.stringify({ calls: window.__R3 ? window.__R3.renderer.info.render.calls : null, tris: window.__R3 ? window.__R3.renderer.info.render.triangles : null, zone: window.__G.zoneId })));
await b.close();
