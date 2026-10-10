// Общее для tools/qa/suite.mjs: сервер, браузер, вход в игру, хуки advanceTime / render_game_to_text (js/core/qa.js).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs'; import path from 'path'; import net from 'net';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export const OUT = path.resolve(process.env.QA_OUT || path.join(ROOT, 'qa_out'));
export const CHROME = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
export const mkdir = d => (fs.mkdirSync(d, { recursive: true }), d);
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- статический сервер (python3 -m http.server) на свободном порту; один на папку
const servers = new Map();
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
export async function serve(dir = ROOT) {
  if (process.env.BASE && dir === ROOT) return process.env.BASE;
  if (servers.has(dir)) return servers.get(dir).url;
  const port = await freePort();
  const pr = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', dir], { stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}`; servers.set(dir, { pr, url });
  for (let i = 0; i < 50; i++) { try { await fetch(url + '/index.html'); break; } catch { await sleep(100); } }
  return url;
}
export function stopServers() { for (const { pr } of servers.values()) pr.kill(); servers.clear(); }

export async function browser() {
  return chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
}

// Детерминированный Math.random: одинаковая раскладка мобов и эффектов при каждом прогоне (сравнение снимков, баланс по сидам)
// плюс виртуальные часы: пока время крутит advanceTime, performance.now/Date.now идут вместе с игрой, а не с настоящими часами
const SEED_JS = seed => `(() => { const rn = performance.now.bind(performance), rd = Date.now, S = { on: false, b: 0, d: 0, add: 0 };
  performance.now = () => S.on ? S.b + S.add : rn(); Date.now = () => S.on ? S.d + S.add : rd();
  window.__qaClock = { start() { if (!S.on) { S.on = true; S.b = rn(); S.d = rd(); S.add = 0; } }, add(ms) { S.add += ms; }, stop() { S.on = false; } };
  let a = ${seed >>> 0}; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; window.__qaReseed = v => { a = v >>> 0; }; })();`;

// Новая страница с игрой. opt: w,h, mobile, lang, seed, base, cls (0 воин, 1 лучник, 2 маг), tut, save (объект localStorage), cont (нажать «Продолжить»)
export async function open(b, opt = {}) {
  const { w = 844, h = 390, mobile = false, lang, seed, cls = 0 } = opt;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  if (seed != null) await ctx.addInitScript(SEED_JS(seed));
  const p = await ctx.newPage(); p.errors = []; p.logs = [];
  p.on('pageerror', e => p.errors.push('PAGEERR ' + e.message));
  p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_TUNNEL|ERR_PROXY|ERR_NAME_NOT_RESOLVED|favicon|Failed to load resource/.test(t)) p.errors.push(t); if (t.startsWith('>>')) p.logs.push(t); });
  const base = opt.base || await serve();
  await p.goto(base + '/index.html?shot&nosdk=1' + (lang ? '&lang=' + lang : ''));
  await p.waitForSelector('#titleBtns button', { timeout: 90000 });
  await p.evaluate(s => { localStorage.clear(); if (s) for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, opt.save || null);
  await p.reload(); await p.waitForSelector('#titleBtns button', { timeout: 90000 });
  if (opt.titleOnly) return p;
  if (opt.save && opt.cont !== false) await p.click('#titleBtns button.gold');
  else { await p.click('#titleBtns button'); await p.waitForSelector('.class-card'); await (await p.$$('.class-card'))[cls].click(); }
  await p.waitForFunction(() => window.__G && window.__G.zone && window.__G.player && window.__G.zoneReady, null, { timeout: 90000 });
  if (!opt.tut) await mod(p, '/ui/tutorial.js', 'setHints', false);
  await advance(p, 500);
  return p;
}

// вызвать функцию модуля игры с учётом языка (js/ или js_<код>/)
export const mod = (p, file, fn, ...args) => p.evaluate(async ([file, fn, args]) => { const m = await import((window.__LANG && window.__LANG !== 'ru' ? '/js_' + window.__LANG : '/js') + file); return fn ? m[fn](...args) : Object.keys(m); }, [file, fn, args]);
export const advance = (p, ms) => p.evaluate(ms => window.advanceTime(ms), ms);
export const state = async p => JSON.parse(await p.evaluate(() => window.render_game_to_text()));
export const resume = p => p.evaluate(() => { window.qaResume(); window.__qaClock && window.__qaClock.stop(); });
export async function shot(p, file) { await p.evaluate(() => window.advanceTime && window.advanceTime(16)).catch(() => { }); mkdir(path.dirname(file)); await p.screenshot({ path: file, type: file.endsWith('.png') ? 'png' : 'jpeg', ...(file.endsWith('.png') ? {} : { quality: 80 }), timeout: 60000 }); return file; }

// закрыть то, что закрыл бы игрок: выбор дара, экран гибели, окно, карточку подсказки поверх игры
export const closeModals = p => p.evaluate(() => {
  const vis = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const boon = document.querySelector('.boons .boon'); if (vis(boon)) { boon.click(); return 'boon'; }
  const death = document.getElementById('death'); if (death && !death.classList.contains('hidden')) { const b = death.querySelector('.btn.gold') || [...death.querySelectorAll('button')].pop(); if (b) { b.click(); return 'death'; } }
  const m = document.querySelector('.modal'); if (m) { const b = m.querySelector('.btn.gold') || [...m.querySelectorAll('button')].pop(); if (b) { b.click(); return 'modal'; } return 'stuck'; }
  for (const c of document.body.children) {   // карточки подсказок (wildhints и т.п.) — fixed-слой с кнопкой
    if (['ui', 'title', 'death'].includes(c.id) || !vis(c) || getComputedStyle(c).position !== 'fixed') continue;
    const b = [...c.querySelectorAll('button')].find(vis); if (b && +getComputedStyle(c).zIndex >= 20) { b.click(); return 'card'; }
  }
  return null;
});

// загрузить зону, подготовить героя нужного уровня (как tools/qa/scenarios/depths_balance.js)
export const loadZone = (p, id, how = {}) => p.evaluate(async ([id, how]) => { const L = window.__LANG && window.__LANG !== 'ru' ? '/js_' + window.__LANG : '/js'; const gm = await import(L + '/game/game.js'); window.__G.profile.tutorial.prologue = true; if (window.__qaReseed) window.__qaReseed(1234);   // three.js тратит Math.random на uuid при асинхронной загрузке моделей — перед зоной сид заново
  await gm.loadZone(id, how); }, [id, how]);
export const setHero = (p, level, rarity = 2) => p.evaluate(async ([L, rarity]) => {
  const D = window.__LANG && window.__LANG !== 'ru' ? '/js_' + window.__LANG : '/js'; const G = window.__G, P = G.profile;
  const { stats } = await import(D + '/game/stats.js'); const IT = await import(D + '/game/items.js'); const { GROWTH } = await import(D + '/data/items.js');
  const add = L - P.level; P.level = L; if (add > 0) for (const k in GROWTH[P.cls]) P.attrs[k] += GROWTH[P.cls][k] * add;
  for (const sl of ['weapon', 'head', 'chest', 'amulet']) { const it = IT.makeItem({ slot: sl, ilvl: L, rarity, cls: P.cls }); delete it.req; P.gear[sl] = it; }
  P.tutorial.prologue = true; G.stats = stats(P); G.player.hp = G.stats.maxHP; return { dps: Math.round(G.stats.dps), hp: G.stats.maxHP };
}, [level, rarity]);

// --- бот: сам выбирает цель — ближайшего врага, до которого можно дойти (поле BFS, по которому ходят мобы), иначе непосещённую точку входа;
// идёт через настоящий input игры (как джойстик телефона), стоя рядом с врагом держит атаку. Возвращает состояние и выбранную цель.
export async function botTick(p, opt = {}, ms = 250) {
  return p.evaluate(([opt, ms]) => {
    const G = window.__G, pl = G.player, input = window.qaInput, m = G.zone.map, B = window.__bot || (window.__bot = { visited: new Set(), F: {}, skip: [] });
    if (B.zone !== G.zone) { B.zone = G.zone; B.visited.clear(); B.F = {}; B.skip = []; }
    if (opt.skip) B.skip.push({ x: opt.skip.x, y: opt.skip.y, until: G.time + 20 });   // цель, к которой бот дважды не смог пройти, — на 20 с в сторону
    const skipped = o => B.skip.some(k => k.until > G.time && Math.hypot(k.x - o.x, k.y - o.y) < 1.5);
    input.mx = input.my = 0; input.attackHeld = false;
    const reach = (G.stats && G.stats.range || 1.5) + 0.6, path = (x, y) => m.clearPath(pl.x, pl.y, x, y, 0.3) ? [x - pl.x, y - pl.y] : m.fieldDir(B.F, pl.x, pl.y, x, y);
    let t = null;
    if (!pl.dead && !opt.idle) {
      if (opt.rnd) t = { kind: 'wander', x: opt.rnd.x, y: opt.rnd.y, dir: [opt.rnd.x - pl.x, opt.rnd.y - pl.y] };
      const foes = G.enemies.filter(e => !e.dead && Math.hypot(e.x - pl.x, e.y - pl.y) < 40).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y));
      for (const e of foes.filter(e => !skipped(e)).slice(0, 6)) { if (t) break; const d = Math.hypot(e.x - pl.x, e.y - pl.y);
        if (d <= reach + e.r && m.los(pl.x, pl.y, e.x, e.y)) t = { kind: 'attack', name: e.type, x: e.x, y: e.y };
        else { const dir = path(e.x, e.y); if (dir) t = { kind: 'foe', name: e.type, x: e.x, y: e.y, dir }; } }
      if (!t) for (const o of (G.zone.inter || []).filter(o => !o.hidden && !o.done && !B.visited.has(o) && !skipped(o)).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))) {
        if (Math.hypot(o.x - pl.x, o.y - pl.y) < Math.max(1.4, (o.r || 1) + 0.3)) { B.visited.add(o); if (o.type !== 'portal' && o.type !== 'exit') { const b = document.getElementById('btnAct'); if (b && !b.classList.contains('hidden')) b.click(); } continue; }
        const dir = path(o.x, o.y); if (dir) { t = { kind: 'point', name: o.id, x: o.x, y: o.y, dir }; break; } }
      if (t && t.kind === 'attack') input.attackHeld = true;
      else if (t) { const [ax, ay] = G.cam.toScreen(pl.x, pl.y), l0 = Math.hypot(t.dir[0], t.dir[1]) || 1, [bx, by] = G.cam.toScreen(pl.x + t.dir[0] / l0, pl.y + t.dir[1] / l0), dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
        input.mx = dx / l; input.my = dy / l; }   // как джойстик на телефоне: точное направление
    }
    window.advanceTime(ms, { render: false });
    const s = JSON.parse(window.render_game_to_text()); s.bot = t && { kind: t.kind, name: t.name, x: Math.round(t.x), y: Math.round(t.y) };
    s.unreachable = G.enemies.filter(e => !e.dead).length && !t ? G.enemies.filter(e => !e.dead).length : 0;
    return s;
  }, [opt, ms]);
}
export async function releaseKeys(p) { await p.evaluate(() => { const i = window.qaInput; i.keys.clear(); i.mx = i.my = 0; i.attackHeld = false; }); }

export const writeJSON = (f, o) => { mkdir(path.dirname(f)); fs.writeFileSync(f, JSON.stringify(o, null, 1)); };
export const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };

// закрывать окна и карточки, пока появляются новые (следующая подсказка всплывает через 0,3 с настоящего времени)
export async function closeAll(p, tries = 6) { for (let i = 0; i < tries; i++) { const r = await closeModals(p); if (!r) { await sleep(400); if (!(await closeModals(p))) return; } await sleep(150); await advance(p, 50); } }
// дождаться конца смены зоны (шторка «Загрузка…» снята, у неё CSS-переход 0,2 с настоящего времени)
export async function settle(p) { await p.waitForFunction(() => window.__G.zoneReady && !document.querySelector('#zoneVeil.on'), null, { timeout: 30000 }).catch(() => { }); await sleep(350); await advance(p, 100); }
