// Проверка всех окон на ~16 распространённых устройствах (macOS, Windows, iOS, Android): размер окна браузера без панелей,
// плотность пикселей, тач, user-agent. На каждом: титул, выбор героя, деревня (HUD), все окна, награда за задание.
// Ищет: текст наезжает на текст, кнопка за краем экрана (и до неё не докрутить), страница прокручивается вбок.
// node tools/qa/devices.mjs [фильтр устройств через запятую]  → снимки $QA_OUT/devices/<устройство>/<экран>.jpg и devices.json
// Только Chromium: Safari (WebKit) здесь не запускается — размеры и UA эмулируются, движок нет.
import { browser, serve, mod, advance, sleep, stopServers, mkdir, OUT } from './lib.mjs';
import fs from 'fs';

const UA = {
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  and: 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  andtab: 'Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
};
// [имя, ширина, высота окна браузера (экран минус панели браузера/системы), плотность, тач, UA]
export const DEVICES = [
  ['MacBook Air 13 (Safari)', 1440, 789, 2, 0, 'mac'],
  ['MacBook Air 13 M2 (Safari)', 1470, 832, 2, 0, 'mac'],
  ['MacBook Pro 14 (Chrome)', 1512, 860, 2, 0, 'mac'],
  ['MacBook, масштаб 125%', 1152, 631, 2.5, 0, 'mac'],
  ['Windows ноутбук 1366x768', 1366, 657, 1, 0, 'win'],
  ['Windows 1920x1080, 125%', 1536, 730, 1.25, 0, 'win'],
  ['Windows 1920x1080', 1920, 947, 1, 0, 'win'],
  ['Windows 2560x1440', 2560, 1305, 1, 0, 'win'],
  ['iPhone SE', 375, 548, 2, 1, 'ios'],
  ['iPhone 13/14/15', 390, 664, 3, 1, 'ios'],
  ['iPhone 15 Pro Max', 430, 740, 3, 1, 'ios'],
  ['iPhone 14 горизонтально', 750, 340, 3, 1, 'ios'],
  ['iPad 10 вертикально', 820, 1106, 2, 1, 'ipad'],
  ['iPad 10 горизонтально', 1180, 746, 2, 1, 'ipad'],
  ['Android Galaxy A54', 360, 680, 3, 1, 'and'],
  ['Android Pixel 7', 412, 780, 2.6, 1, 'and'],
  ['Android горизонтально', 780, 340, 3, 1, 'and'],
  ['Android планшет', 800, 1206, 1.5, 1, 'andtab'],
];
const WINDOWS = ['menu', 'inventory', 'character', 'skills', 'journal', 'map', 'settings', 'help', 'season', 'codex', 'board', 'shrine', 'depths', 'wild:fjord', 'npc_elder', 'npc_smith', 'npc_merchant', 'npc_caravan', 'npc_trainer'];

// проверка видимого интерфейса: текст на тексте, кнопки за краем, прокрутка страницы
const CHECK = () => {
  const W = innerWidth, H = innerHeight, out = [];
  const shown = e => { for (let a = e; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; } return true; };
  const scroller = e => { for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(s.overflowY + s.overflowX)) return a; } return null; };
  const clip = (r, e) => { let L = Math.max(r.left, 0), T = Math.max(r.top, 0), R = Math.min(r.right, W), B = Math.min(r.bottom, H);
    for (let a = scroller(e); a; a = scroller(a)) { const q = a.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); }
    return R - L > 1 && B - T > 1 ? { left: L, top: T, right: R, bottom: B } : null; };
  const name = e => (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') || e.tagName.toLowerCase();
  const txt = e => (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 28);
  // оба текста действительно видны в точке пересечения: между верхним и нижним нет непрозрачного слоя (липкая панель поверх прокрутки — не ошибка)
  const opaque = e => { const cs = getComputedStyle(e), c = cs.backgroundColor.match(/[\d.]+/g); return cs.backgroundImage !== 'none' || (!!c && (c.length < 4 || +c[3] > 0.85)); };
  const bothSeen = (ea, eb, x, y) => { const st = document.elementsFromPoint(x, y), A = st.indexOf(ea), B = st.indexOf(eb);
    if (A < 0 || B < 0) return false; const [hi, lo] = A < B ? [A, B] : [B, A], low = st[lo];
    for (let k = hi; k < lo; k++) { const e = st[k]; if (!e.contains(low) && opaque(e)) return false; } return true; };
  // слои поверх игры: окно, панель NPC, титул, экран гибели, карточка вещи
  const roots = [...document.querySelectorAll('.modal-bg, .npc-panel, #title, #death, .ic-ov')].filter(r => shown(r) && r.getClientRects().length);
  const top = roots.length ? roots : [document.getElementById('ui')].filter(Boolean);
  for (const root of top) {
    // строки текста: прямоугольники собственных текстовых узлов элемента
    const items = [];
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.data.trim() && !n.parentElement.closest('.sc-hint') ? 1 : 2 });   // ▲▼ прокрутки — кнопка поверх текста нарочно
    for (let n; (n = tw.nextNode());) { const e = n.parentElement; if (!e || !shown(e)) continue; const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) { const c = clip(r, e); if (c && r.width > 2 && r.height > 4) items.push({ e, r: c, h: r.height, w: r.width }); } }
    const seen = new Set();
    for (let i = 0; i < items.length && out.length < 40; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j]; if (a.e === b.e) continue;
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ix > 3 && iy > Math.min(a.h, b.h) * 0.35 && bothSeen(a.e, b.e, (Math.max(a.r.left, b.r.left) + Math.min(a.r.right, b.r.right)) / 2, (Math.max(a.r.top, b.r.top) + Math.min(a.r.bottom, b.r.bottom)) / 2)) { const k = name(a.e) + '|' + name(b.e); if (seen.has(k)) continue; seen.add(k); out.push(`текст на тексте: «${txt(a.e)}» × «${txt(b.e)}»`); }
    }
    // кнопки за краем экрана, если до них нельзя докрутить
    for (const e of root.querySelectorAll('button, .btn, input, select')) { if (!shown(e)) continue; const r = e.getBoundingClientRect(); if (r.width < 3) continue;
      if (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2) { let sc = false; for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (a.scrollHeight > a.clientHeight + 2 || a.scrollWidth > a.clientWidth + 2)) { sc = true; break; } } if (!sc) out.push(`за краем экрана: «${txt(e) || name(e)}»`); } }
    // окно шире экрана
    const m = root.querySelector('.modal'); if (m) { const r = m.getBoundingClientRect(); if (r.left < -1 || r.right > W + 1) out.push('окно шире экрана'); }
  }
  if (document.documentElement.scrollWidth > W + 1) out.push('страница прокручивается вбок');
  return [...new Set(out)];
};

const only = process.argv[2] ? process.argv[2].split(',') : null;
const b = await browser(); const base = await serve(); const report = {};
const outDir = mkdir(OUT + '/devices');
for (const [dev, w, h, dpr, touch, ua] of DEVICES) {
  if (only && !only.some(s => dev.includes(s))) continue;
  const dir = mkdir(`${outDir}/${dev.replace(/[^\wа-яё]+/gi, '_')}`); const res = report[dev] = { size: `${w}x${h} @${dpr}x`, screens: {}, errors: [] };
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, /* плотность пикселей на раскладку не влияет (в CSS нет resolution-запросов), а 3D на ×2–3 здесь в разы медленнее */ isMobile: !!touch && !/mac|win/.test(ua), hasTouch: !!touch, userAgent: UA[ua] });
  const p = await ctx.newPage(); p.on('pageerror', e => res.errors.push(e.message.slice(0, 160)));
  const step = async (key, fn) => {
    try { await fn(); await sleep(450); const iss = await p.evaluate(CHECK); res.screens[key] = iss; await p.screenshot({ path: `${dir}/${key}.jpg`, type: 'jpeg', quality: 70, timeout: 90000, animations: 'disabled' }).catch(() => p.screenshot({ path: `${dir}/${key}.jpg`, type: 'jpeg', quality: 70, timeout: 90000 })).catch(e => res.errors.push(key + ': снимок не сделан')); }
    catch (e) { res.screens[key] = ['не открылось: ' + String(e.message || e).slice(0, 120)]; }
  };
  const W_ = (fn, ...a) => mod(p, '/ui/windows.js', fn, ...a);
  try {
    await p.goto(base + '/index.html?shot&nosdk=1'); await p.waitForSelector('#titleBtns button', { timeout: 120000 });
    await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#titleBtns button', { timeout: 120000 }); await sleep(800);
    await step('01_титул', async () => { });
    await step('02_выбор_героя', async () => { await p.click('#titleBtns button'); await p.waitForSelector('.class-card'); });
    await (await p.$$('.class-card'))[1].click();
    await p.waitForFunction(() => window.__G && window.__G.zone && window.__G.player && window.__G.zoneReady, null, { timeout: 120000 });
    await mod(p, '/ui/tutorial.js', 'setHints', false);
    await p.evaluate(() => { const P = window.__G.profile; P.tutorial.prologue = true; P.level = 8; P.gold = 5000; P.shards = 20; });
    await mod(p, '/game/game.js', 'loadZone', 'town', {}); await sleep(1500); await advance(p, 300);
    await p.evaluate(() => { window.__G.cinema = null; document.querySelectorAll('.modal .btn.gold').forEach(x => x.click()); }); await W_('closeModal', true); await advance(p, 400);
    await step('03_деревня_HUD', async () => { });
    for (const [i, win] of WINDOWS.entries()) {
      await step(`${String(i + 4).padStart(2, '0')}_${win.split(':')[0]}`, async () => { await p.evaluate(() => { window.__G.cinema = null; }); await W_('closeModal', true); await p.evaluate(() => document.querySelectorAll('.npc-panel .pn-x, .ic-ov').forEach(x => x.click ? x.click() : x.remove())); await advance(p, 300); await W_('openWindow', ...win.split(':')); await advance(p, 200); });
    }
    await W_('closeModal', true); await p.evaluate(() => document.querySelectorAll('.npc-panel .pn-x').forEach(x => x.click())); await advance(p, 300);
    await step('30_награда_за_задание', async () => {
      await p.evaluate(async () => { const Q = await import('/js/game/quests.js'); const { STORY } = await import('/js/data/quests.js'); Q.grant(STORY[0].reward, STORY[0].title, { sub: 'Задание выполнено' }); });
      for (let i = 0; i < 20 && !await p.$('.modal.reward'); i++) { await W_('pumpRewards'); await advance(p, 400); }
      if (!await p.$('.modal.reward')) throw new Error('окно награды не появилось');
      await advance(p, 600); await sleep(700);
    });
    if (!await p.$('.modal.reward')) res.screens['30_награда_за_задание'].push('окно награды закрылось само до снимка');
  } catch (e) { res.errors.push('ERR ' + String(e.message || e).slice(0, 200)); }
  const bad = Object.entries(res.screens).filter(([, v]) => v.length);
  console.log(`== ${dev} ${res.size}: ${bad.length ? bad.map(([k, v]) => `${k}: ${v.join('; ')}`).join(' | ') : 'ок'}${res.errors.length ? ' || ' + res.errors.slice(0, 2).join(' ; ') : ''}`);
  fs.writeFileSync(`${outDir}/devices${process.env.PART || ''}.json`, JSON.stringify(report, null, 1));
  await ctx.close();
}
await b.close(); stopServers();
