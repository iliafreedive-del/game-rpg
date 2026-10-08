// Проверка экранов (сборка 49): игра в разных размерах окна — телефоны, планшеты, ПК/Mac, квадрат и ультраширокий.
// node tools/qa/screens.mjs [фильтр]  → снимки /tmp/claude-0/screens/<устройство>_<экран>.jpg и отчёт: что вылезает за экран и что перекрывается.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const DEV = [
  ['iPhoneSE_P', 375, 667, 1], ['iPhoneSE_L', 667, 375, 1], ['iPhone15_P', 393, 852, 1], ['iPhone15_L', 852, 393, 1],
  ['iPhoneProMax_P', 430, 932, 1], ['iPhoneProMax_L', 932, 430, 1], ['Android360_P', 360, 640, 1], ['Android360_L', 640, 360, 1],
  ['Android412_P', 412, 915, 1], ['Android412_L', 915, 412, 1], ['GalaxyFold_P', 344, 882, 1], ['GalaxyFold_L', 882, 344, 1],
  ['iPadMini_P', 744, 1133, 1], ['iPadMini_L', 1133, 744, 1], ['iPadPro_P', 1024, 1366, 1], ['iPadPro_L', 1366, 1024, 1],
  ['AndroidTab_P', 800, 1280, 1], ['AndroidTab_L', 1280, 800, 1],
  ['PC_1280x720', 1280, 720, 0], ['PC_1366x768', 1366, 768, 0], ['PC_1920x1080', 1920, 1080, 0], ['Mac_1440x900', 1440, 900, 0],
  ['Mac_1512x982', 1512, 982, 0], ['PC_square_900', 900, 900, 0], ['PC_ultrawide_2560x1080', 2560, 1080, 0], ['PC_small_1024x600', 1024, 600, 0], ['PC_2to1_1600x800', 1600, 800, 0], ['Phone_2to1_800x400', 800, 400, 1],
];
const flt = process.argv[2]; const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
const report = [];
for (const [name, w, h, mob] of DEV) {
  if (flt && !name.includes(flt)) continue;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!mob, hasTouch: !!mob });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = async s => { try { await p.screenshot({ path: `/tmp/claude-0/screens/${name}_${s}.jpg`, type: 'jpeg', quality: 70, timeout: 60000 }); } catch (e) { errs.push('shot ' + s); } };
  // проверка: видимые элементы интерфейса за краем экрана и перекрытия кнопок
  const check = async scr => p.evaluate(scr => {
    const W = innerWidth, H = innerHeight, out = [], vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return null; const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 ? r : null; };
    const sel = scr === 'hud' ? '#ui button, #portrait, .bar, #tracker, #minimap, #goldBox, #menu' : '.modal button, .modal .mt, .modal h2, .modal, .menu-tile, #titleBtns button, .class-card';
    const els = [...document.querySelectorAll(sel)].map(e => [e, vis(e)]).filter(x => x[1]);
    for (const [e, r] of els) if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push('за краем: ' + (e.id || e.className || e.tagName).toString().slice(0, 30) + ` [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
    if (scr === 'hud') { const btn = els.filter(([e]) => e.tagName === 'BUTTON' || ['portrait', 'minimap', 'tracker'].includes(e.id));
      for (let i = 0; i < btn.length; i++) for (let j = i + 1; j < btn.length; j++) { const a = btn[i][1], c = btn[j][1]; const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        if (ix > 6 && iy > 6 && !btn[i][0].contains(btn[j][0]) && !btn[j][0].contains(btn[i][0])) out.push('перекрытие: ' + (btn[i][0].id || btn[i][0].className) + ' × ' + (btn[j][0].id || btn[j][0].className)); } }
    const sw = document.documentElement.scrollWidth > W + 1, sh = document.documentElement.scrollHeight > H + 1; if (sw || sh) out.push('прокрутка страницы');
    return out; }, scr);
  const issues = {};
  try {
    await p.goto('http://localhost:8123/index.html?shot&nosdk=1'); await p.waitForSelector('#titleBtns button', { timeout: 60000 });
    await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#titleBtns button'); await p.waitForTimeout(800);
    await shot('1title'); issues.title = await check('title');
    await p.click('#titleBtns button'); await p.waitForSelector('.class-card'); await p.waitForTimeout(400); await shot('2class'); issues.class = await check('class');
    await (await p.$$('.class-card'))[0].click();
    await p.waitForFunction(() => window.__G && window.__G.zone && window.__G.zoneReady, null, { timeout: 90000 });
    await p.evaluate(async () => { const G = window.__G, TU = await import('/js/ui/tutorial.js'); TU.setHints(false); G.profile.tutorial.prologue = true; G.profile.level = 5; const gm = await import('/js/game/game.js'); await gm.loadZone('town', {}); });
    await p.waitForTimeout(2500); await p.evaluate(() => { document.querySelectorAll('.modal .btn.gold').forEach(b => b.click()); }); await p.waitForTimeout(600);
    await p.evaluate(async () => { const H = await import('/js/ui/hud.js'); for (let i = 0; i < 5; i++) H.updateHUD(0.1); });
    await shot('3town'); issues.hud = await check('hud');
    await p.evaluate(async () => { const W = await import('/js/ui/windows.js'); W.openWindow('menu'); }); await p.waitForTimeout(500); await shot('4menu'); issues.menu = await check('menu');
    await p.evaluate(async () => { const W = await import('/js/ui/windows.js'); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' })); W.openWindow('inventory'); }); await p.waitForTimeout(600); await shot('5hero'); issues.hero = await check('hero');
    await p.evaluate(async () => { const W = await import('/js/ui/windows.js'); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' })); W.openWindow('npc_merchant'); }); await p.waitForTimeout(600); await shot('6shop'); issues.shop = await check('shop');
  } catch (e) { errs.push('ERR ' + String(e).slice(0, 200)); }
  const flat = Object.entries(issues).flatMap(([k, v]) => (v || []).map(x => k + ': ' + x));
  console.log(`== ${name} ${w}x${h}: ${flat.length ? flat.join(' | ') : 'ок'}${errs.length ? ' || ОШИБКИ: ' + [...new Set(errs)].slice(0, 3).join(' ; ') : ''}`);
  await ctx.close();
}
await b.close();
