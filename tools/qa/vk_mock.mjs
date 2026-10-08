// Проверка адаптера VK (сборка 52) без VK: мост подменяется заглушкой с памятью в sessionStorage. node tools/qa/vk_mock.mjs [BASE]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const base = process.argv[2] || 'http://localhost:8123';
const MOCK = `window.vkBridge = (() => { const st = JSON.parse(sessionStorage.getItem('vkst') || '{}'); const subs = []; window.__vkLog = [];
  const save = () => sessionStorage.setItem('vkst', JSON.stringify(st));
  return { subscribe: f => subs.push(f), supports: () => true, _emit: t => subs.forEach(f => f({ detail: { type: t, data: {} } })),
    send: async (m, p = {}) => { window.__vkLog.push(m + (p.ad_format ? ':' + p.ad_format : '') + (p.key ? ':' + p.key : ''));
      if (m === 'VKWebAppStorageSet') { if (new TextEncoder().encode(p.value).length > 4096) throw new Error('too long ' + p.key); st[p.key] = p.value; save(); return { result: true }; }
      if (m === 'VKWebAppStorageGet') return { keys: p.keys.map(k => ({ key: k, value: st[k] || '' })) };
      if (m === 'VKWebAppCheckNativeAds' || m === 'VKWebAppShowNativeAds') return { result: true };
      return { result: true }; } }; })();`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' && /vk/.test(m.text())) errs.push(m.text()); });
await p.route('**/vk-bridge.min.js', r => r.fulfill({ contentType: 'text/javascript', body: MOCK }));
await p.goto(base + '/index.html?vk_app_id=1&vk_platform=desktop_web');
await p.waitForSelector('#titleBtns button', { timeout: 60000 });
console.log('platform', await p.evaluate(async () => (await import('/js/platform/platform.js')).platform.name));
await p.click('#titleBtns button'); await p.waitForSelector('.class-card'); await (await p.$$('.class-card'))[0].click();
await p.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 90000 });
const r = await p.evaluate(async () => { const G = window.__G; const gm = await import('/js/game/game.js'); const M = await import('/js/platform/monetize.js');
  G.profile.gold = 12345; G.profile.level = 7; gm.saveNow(true); await new Promise(r => setTimeout(r, 1500));
  window.vkBridge._emit('VKWebAppViewHide'); const hid = G.paused; window.vkBridge._emit('VKWebAppViewRestore'); const back = G.paused;
  const ad = await (await import('/js/platform/platform.js')).platform.p.showRewarded();
  return { hid, back, ad, log: window.__vkLog.slice(0, 30), keys: Object.keys(JSON.parse(sessionStorage.getItem('vkst'))) };
});
console.log(JSON.stringify(r));
// перезагрузка: сохранение из VK Storage (локальное стёрто)
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#titleBtns button', { timeout: 60000 });
console.log('после перезагрузки без localStorage:', await p.evaluate(() => document.getElementById('titleBtns').innerText.replace(/\n+/g, ' | ')));
console.log('errs', errs.slice(0, 8));
await b.close();
