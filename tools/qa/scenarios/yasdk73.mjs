// сборка 73: проверка по документации SDK Яндекс Игр на заглушке /sdk.js (настоящий SDK вне Яндекса не грузится).
// Язык из environment.i18n.lang даже при ?lang=, цена энергии со значком валюты, пауза платформы (реклама) без окна «Пауза»,
// свёрнутая вкладка — с окном «Пауза» и повторным GameplayAPI.stop, предупреждение «Реклама через 2» перед рекламой по таймеру.
import { browser, serve, sleep, stopServers } from '../lib.mjs';
const MOCK = `(() => { const L = window.__yaLog = [], H = {}; const log = (...a) => L.push(a.join(' '));
  const sdk = { environment: { app: { id: '1' }, i18n: { lang: 'ru' } },
    features: { LoadingAPI: { ready: () => log('ready') }, GameplayAPI: { start: () => log('gp start'), stop: () => log('gp stop') } },
    on: (e, f) => { (H[e] = H[e] || []).push(f); }, off() { }, EVENTS: {},
    adv: { showFullscreenAdv: ({ callbacks }) => { log('inter'); H.game_api_pause?.forEach(f => f()); setTimeout(() => { H.game_api_resume?.forEach(f => f()); callbacks.onClose(true); }, 300); },
      showRewardedVideo: ({ callbacks }) => { log('rv'); callbacks.onRewarded(); callbacks.onClose(); }, showBannerAdv: () => Promise.resolve({ stickyAdvIsShowing: false }), hideBannerAdv() { } },
    getPayments: async () => ({ getCatalog: async () => [{ id: 'energy_pack', priceValue: '49', priceCurrencyCode: 'TST', getPriceCurrencyImage: () => 'assets/sprites/icon_64.png' }], getPurchases: async () => [], purchase: async () => { throw 1; }, consumePurchase: async () => { } }),
    getPlayer: async () => ({ getData: async () => ({}), setData: async () => { }, isAuthorized: () => false }),
    getFlags: async () => ({}), shortcut: { canShowPrompt: async () => ({ canShow: false }) }, serverTime: () => Date.now(),
    feedback: { canReview: async () => ({ value: false }) }, screen: { fullscreen: { status: 'off', request: () => { log('fs request'); return Promise.resolve(); }, exit: () => Promise.resolve() } } };
  window.__yaFire = e => H[e]?.forEach(f => f());
  window.YaGames = { init: async () => { log('init'); return sdk; } }; })();`;
const b = await browser(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
await p.route('**/sdk.js', r => r.fulfill({ contentType: 'text/javascript', body: MOCK }));
p.on('pageerror', e => console.log('ОШИБКА', e.message));
const base = await serve();
// 1) ?lang=ru в адресе — SDK всё равно инициализирован и язык прочитан на старте
await p.goto(base + '/index.html?shot&yandex=1&lang=ru'); await p.waitForSelector('#titleBtns button', { timeout: 90000 });
console.log('язык', await p.evaluate(() => window.__LANG), '| вызовы до игры:', await p.evaluate(() => window.__yaLog.join(', ')));
await p.click('#titleBtns button'); await p.waitForSelector('.class-card'); await (await p.$$('.class-card'))[0].click();
await p.waitForFunction(() => window.__G && window.__G.zoneReady, null, { timeout: 120000 }); await sleep(1500);
await p.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); const G = window.__G; G.modalOpen = false; G.paused = false; G.profile.tutorial.prologue = true; window.__yaLog.length = 0; });
// 2) цена энергии
console.log('кнопка энергии:', await p.evaluate(async () => { const { openEnergy } = await import('/js/ui/energy.js'); openEnergy(); await new Promise(r => setTimeout(r, 300)); const b = [...document.querySelectorAll('button')].find(x => /Запас энергии/.test(x.textContent)); const h = b ? b.innerHTML : 'нет кнопки'; document.querySelectorAll('button').forEach(x => { if (x.textContent === 'Закрыть') x.click(); }); return h; }));
// 3) реклама по таймеру: предупреждение, пауза платформы, после — без окна «Пауза»
const r3 = await p.evaluate(async () => { const G = window.__G; G.paused = false; G.profile.stats.playTime = 9999; const m = await import('/js/platform/monetize.js'), { platform } = await import('/js/platform/platform.js'); platform.flags = { inter_gap_min: 0.0001, inter_first_sec: 0 }; await new Promise(r => setTimeout(r, 50));
  const pr = m.maybeInterstitial('return', true); await new Promise(r => setTimeout(r, 500)); const warn = document.querySelector('.pause-ov')?.textContent; await pr; await new Promise(r => setTimeout(r, 400));
  return { warn, pauseAfter: !!document.querySelector('.pause-ov'), paused: G.paused, away: G.awayPause, log: window.__yaLog.join(', ') }; });
console.log('реклама:', JSON.stringify(r3));
// 4) свёрнутая вкладка: game_api_pause + hidden, потом resume — окно «Пауза» и снова stop
const r4 = await p.evaluate(async () => { window.__yaLog.length = 0; const G = window.__G;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); window.__yaFire('game_api_pause');
  await new Promise(r => setTimeout(r, 200)); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); window.__yaFire('game_api_resume');
  await new Promise(r => setTimeout(r, 600)); const ov = !!document.querySelector('.pause-ov'); const log1 = window.__yaLog.join(', ');
  document.querySelector('.pause-ov button')?.click(); await new Promise(r => setTimeout(r, 300));
  return { overlay: ov, log: log1, afterContinue: window.__yaLog.join(', '), paused: G.paused }; });
console.log('вкладка:', JSON.stringify(r4));
await b.close(); stopServers();
