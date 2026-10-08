// Универсальный запуск сценария в игре: node tools/qa/run.mjs <сценарий.js> [CLS=0|1|2] — сценарий исполняется внутри страницы (async, есть window.__G).
// Внутри можно вызывать shot('имя') — снимок в /tmp/claude-0/shots/имя.jpg (хост-функция), print(...) и sleep(мс). Вывод и ошибки консоли печатаются.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [, , file, w = '844', h = '390'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DSF || 1) });
const logs = []; p.on('console', m => { if (['error', 'warning'].includes(m.type()) || m.text().startsWith('>>')) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => logs.push('PAGEERR: ' + e.message));
await p.exposeFunction('shot', async name => { const c = process.env.CLIP && process.env.CLIP.split(',').map(Number); await p.screenshot({ path: `/tmp/claude-0/shots/${name}.jpg`, type: 'jpeg', quality: 82, clip: c ? { x: c[0], y: c[1], width: c[2], height: c[3] } : undefined }); });
await p.exposeFunction('hclick', async sel => { try { await p.click(sel, { timeout: 3000, force: true }); return true; } catch (e) { return String(e).slice(0, 900); } });
await p.goto((process.env.BASE || 'http://localhost:8123') + '/index.html?shot&nosdk=1' + (process.env.Q ? '&' + process.env.Q : ''));   // Q=lang=ru — доп. параметры; BASE — проверить распакованный архив
await p.waitForSelector('#titleBtns button', { timeout: 20000 });
await p.evaluate(() => { localStorage.clear(); });
await p.reload(); await p.waitForSelector('#titleBtns button');
await p.click('#titleBtns button');
await p.waitForSelector('.class-card'); await (await p.$$('.class-card'))[+(process.env.CLS || 0)].click();
await p.waitForFunction(() => window.__G && window.__G.zone && window.__G.player && window.__G.zoneReady, null, { timeout: 60000 });
// сборка 49: вопроса «Показать подсказки?» нет — для сценариев подсказки выключаем (как раньше «Я опытный игрок»); TUT=1 — оставить обучение
if (!process.env.TUT) await p.evaluate(async () => { const m = await import((window.__LANG && window.__LANG !== 'ru' ? '/js_' + window.__LANG : '/js') + '/ui/tutorial.js'); m.setHints(false); });
await p.waitForTimeout(500);
await p.evaluate(t => { window.__TAG = t; }, process.env.TAG || 'x');
const src = fs.readFileSync(file, 'utf8');
const out = await p.evaluate(async s => { const print = (...a) => console.log('>> ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); const sleep = ms => new Promise(r => setTimeout(r, ms));
  const step = async n => { const m = await import((window.__LANG && window.__LANG !== 'ru' ? '/js_' + window.__LANG : '/js') + '/game/game.js'); for (let i = 0; i < n; i++) m.update(1 / 30); };
  try { const f = new Function('print', 'sleep', 'step', 'shot', 'hclick', 'return (async()=>{' + s + '})()'); return await f(print, sleep, step, window.shot, window.hclick); } catch (e) { return 'ERR ' + e.stack; } }, src);
console.log(out === undefined ? '' : out); console.log(logs.slice(0, 40).join('\n'));
await b.close();
