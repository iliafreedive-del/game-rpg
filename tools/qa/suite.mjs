// Набор автопроверок перед сборкой (навык develop-web-game). Время в игре крутится через window.advanceTime — минута боя за секунды.
//   node tools/qa/suite.mjs <проверка> [ключи]      отчёты и снимки → qa_out/<проверка>/ (QA_OUT — другая папка)
// Проверки:
//   smoke     загрузка, 10 с игры, состояние текстом, ошибок нет
//   bot       бот проходит зоны: деревня, пролог, катакомбы, глубины, Жатва, 4 похода, цитадель — ищет застревания, вечные окна, ошибки
//   visual    снимки с одних и тех же точек и сравнение с эталоном (QA_BASELINE, по умолчанию qa_baseline/); --update — принять текущие
//   soak      долгая сессия по кругу зон (SOAK_MIN игровых минут, по умолчанию 30): память, DOM, частицы, тосты — растёт ли
//   screens   экраны 28 устройств (tools/qa/screens.mjs)
//   langs     10 языков: главные окна, непереведённый текст, текст, вылезающий за кнопку (нужна dist/langs — соберёт сам)
//   saves     сохранения старых сборок (tools/qa/fixtures/saves) загружаются в текущую: уровень, золото, вещи на месте
//   perf      медленный телефон (CPU ×CPU, по умолчанию 4): кадры в тяжёлых местах; сравнение с прошлым прогоном
//   balance   каждый класс один на один со стражем глубин N раз (BAL_N, по умолчанию 10): время, смерти, остаток HP
//   prebuild  smoke + bot + visual + screens (iPhone) — быстрый круг перед каждой сборкой
//   all       всё подряд
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import * as Q from './lib.mjs';
const { OUT, ROOT } = Q;
const [, , which = 'prebuild', ...flags] = process.argv;
const env = (k, d) => (process.env[k] != null ? +process.env[k] : d);
const results = {};
const log = (...a) => console.log(...a);

async function withPage(opt, fn) { const b = await Q.browser(); try { const p = await Q.open(b, opt); return await fn(p, b); } finally { await b.close(); } }

// ---------------------------------------------------------------- smoke
async function smoke() {
  return withPage({ seed: 1 }, async p => {
    const t0 = Date.now(); await Q.advance(p, 10000); const ms = Date.now() - t0; const s = await Q.state(p);
    const ok = s.player && s.zone && p.errors.length === 0;
    log(`smoke: зона ${s.zone}, 10 с игры за ${ms} мс, ошибок ${p.errors.length}`); p.errors.forEach(e => log('  ' + e));
    await Q.shot(p, path.join(OUT, 'smoke', 'state.jpg')); Q.writeJSON(path.join(OUT, 'smoke', 'state.json'), s);
    return { ok, ms10s: ms, zone: s.zone, errors: p.errors };
  });
}

// ---------------------------------------------------------------- bot
const ZONES = [
  { id: 'depths', how: { floor: 0 }, lvl: 1, name: 'пролог' },
  { id: 'town', how: {}, lvl: 5, name: 'деревня' },
  { id: 'catacombs', how: {}, lvl: 5, name: 'катакомбы' },
  { id: 'depths', how: { floor: 3 }, lvl: 8, name: 'глубины 3' },
  { id: 'depths', how: { floor: 5 }, lvl: 10, name: 'глубины 5 (страж)' },
  { id: 'survival', how: {}, lvl: 8, name: 'Жатва' },
  { id: 'wild', how: { realm: 'forest', depth: 1 }, lvl: 6, name: 'лес' },
  { id: 'wild', how: { realm: 'fjord', depth: 1 }, lvl: 8, name: 'фьорды' },
  { id: 'wild', how: { realm: 'bones', depth: 1 }, lvl: 10, name: 'пустоши' },
  { id: 'wild', how: { realm: 'temple', depth: 1 }, lvl: 12, name: 'храм' },
  { id: 'castle', how: {}, lvl: 10, name: 'цитадель' },
];
// один проход бота по зоне: бьёт врагов, потом обходит точки входа. Застревание — бот 4 с игры хочет идти, а сдвинулся < 0,6 м.
// Одиночное застревание — бот упёрся в угол; 2+ раза в одной клетке 2×2 м — повод посмотреть снимок.
async function botZone(p, Z, secs, dir) {
  await Q.loadZone(p, Z.id, Z.how); await Q.setHero(p, Z.lvl); await Q.advance(p, 300);
  const rep = { zone: Z.name, kills: 0, deaths: 0, stuck: [], modalStuck: 0, zoneChanges: [], errors: [], unreachable: 0 };
  let s = await Q.state(p); const zone0 = s.zone, alive0 = s.enemies.alive; let last = { x: s.player.x, y: s.player.y }, wantMove = 0, modalT = 0, unstick = 0, rnd = null, skip = null, modalReal = 0;
  for (let t = 0; t < secs * 4; t++) {
    if (s.mode !== 'play') {
      const r = await Q.closeModals(p); modalT += 0.25;
      if (s.mode === 'dead' && r !== 'death') { await Q.sleep(250); modalT -= 0.2; }   // экран гибели появляется по обычному таймеру (1,3 с настоящего времени)
      if (s.mode === 'dead' && r === 'death') { rep.deaths++; await Q.advance(p, 500); const z = (await Q.state(p)).zone; if (z !== zone0 || Z.id === 'depths') { await Q.loadZone(p, Z.id, Z.how); await Q.setHero(p, Z.lvl); } s = await Q.state(p); modalT = 0; continue; }
      if (!modalReal) modalReal = Date.now();
      // окна идут очередью по таймерам настоящего времени — «не закрылось» только если висит и 12 с игры, и 8 с по часам
      if (modalT > 12 && Date.now() - modalReal > 8000) { rep.modalStuck++; await Q.shot(p, path.join(dir, `${Z.name}_окно_${rep.modalStuck}.jpg`)); modalT = 0; modalReal = 0; await p.evaluate(async () => { const D = window.__LANG && window.__LANG !== 'ru' ? '/js_' + window.__LANG : '/js'; (await import(D + '/ui/windows.js')).closeModal(true); window.__G.paused = false; }); }
      if (s.mode !== 'dead') await Q.sleep(60);
      s = await Q.botTick(p, { idle: true }); continue;
    }
    modalT = 0; modalReal = 0;
    if (s.zone !== zone0) { rep.zoneChanges.push(s.zone); break; }
    const before = s; s = await Q.botTick(p, unstick > 0 ? { rnd, skip } : {}); skip = null; if (unstick > 0) unstick--;
    rep.kills += Math.max(0, before.enemies.alive - s.enemies.alive);
    const moving = s.bot && s.bot.kind !== 'attack';
    if (moving) wantMove += 0.25; else { wantMove = 0; last = { x: s.player.x, y: s.player.y }; }
    if (wantMove >= 4) {
      if (Math.hypot(s.player.x - last.x, s.player.y - last.y) < 0.6) { rep.stuck.push({ x: s.player.x, y: s.player.y, toward: s.bot.name || s.bot.kind }); if (rep.stuck.length <= 3) await Q.shot(p, path.join(dir, `${Z.name}_застрял_${rep.stuck.length}.jpg`)); const a = rep.stuck.length * 2.1; rnd = { x: s.player.x + Math.cos(a) * 5, y: s.player.y + Math.sin(a) * 5 }; unstick = 8;
        const same = rep.stuck.filter(q => q.toward === s.bot.name).length; if (same >= 2) skip = { x: s.bot.x, y: s.bot.y }; }
      wantMove = 0; last = { x: s.player.x, y: s.player.y };
    }
    if (!s.bot && t > 20) { rep.unreachable = s.unreachable; break; }
  }
  await Q.releaseKeys(p);
  rep.cleared = `${alive0 - s.enemies.alive}/${alive0}`; rep.errors = p.errors.splice(0);
  await Q.shot(p, path.join(dir, `${Z.name}_конец.jpg`));
  const spots = {}; for (const q of rep.stuck) { const k = Math.round(q.x / 2) * 2 + ',' + Math.round(q.y / 2) * 2; spots[k] = (spots[k] || 0) + 1; }
  rep.stuckSpots = Object.entries(spots).filter(([, n]) => n >= 2).map(([k, n]) => `${k} ×${n}`);
  rep.ok = rep.errors.length === 0 && rep.modalStuck === 0 && rep.stuckSpots.length === 0;
  return rep;
}
async function bot() {
  fs.rmSync(path.join(OUT, 'bot'), { recursive: true, force: true }); const dir = Q.mkdir(path.join(OUT, 'bot')), secs = env('BOT_SEC', 120), only = process.env.ZONES;
  const out = [];
  for (const cls of (process.env.CLS || '0').split(',').map(Number)) await withPage({ seed: 7, cls }, async p => {
    for (const Z of ZONES) {
      if (only && !only.split(',').some(z => Z.name.includes(z))) continue;
      let r; try { r = await botZone(p, Z, secs, dir); } catch (e) { r = { zone: Z.name, ok: false, errors: [String(e).slice(0, 300)] }; }
      r.cls = cls; out.push(r);
      log(`bot [${['воин', 'лучник', 'маг'][cls]}] ${r.ok ? 'OK  ' : 'FAIL'} ${r.zone}: убито ${r.cleared || '?'}, смертей ${r.deaths ?? '?'}, застреваний ${(r.stuck || []).length}${r.stuckSpots && r.stuckSpots.length ? ' (повторно: ' + r.stuckSpots.join('; ') + ')' : ''}, окно не закрылось ${r.modalStuck || 0}${r.unreachable ? `, не дойти до ${r.unreachable} врагов` : ''}, ошибок ${(r.errors || []).length}`);
      (r.errors || []).slice(0, 3).forEach(e => log('    ' + e.slice(0, 200)));
    }
  });
  Q.writeJSON(path.join(dir, 'report.json'), out);
  return { ok: out.every(r => r.ok), zones: out.length, failed: out.filter(r => !r.ok).map(r => r.zone) };
}

// ---------------------------------------------------------------- visual
// tol — допуск в % пикселей (по умолчанию VIS_TOL=1.5)
const SCENES = [
  { name: 'титул', title: true },
  { name: 'пролог', zone: ['depths', { floor: 0 }], lvl: 1, adv: 1500, keep: true },
  { name: 'деревня', zone: ['town', {}], lvl: 5, adv: 2500 },
  { name: 'катакомбы', zone: ['catacombs', {}], lvl: 5, adv: 300, tol: 25 },
  { name: 'глубины5', zone: ['depths', { floor: 5 }], lvl: 10, adv: 1500, tol: 5 },
  { name: 'жатва', zone: ['survival', {}], lvl: 8, adv: 300, tol: 25 },
  { name: 'лес', zone: ['wild', { realm: 'forest', depth: 1 }], lvl: 6, adv: 1500 },
  { name: 'фьорды', zone: ['wild', { realm: 'fjord', depth: 1 }], lvl: 8, adv: 1500 },
  { name: 'пустоши', zone: ['wild', { realm: 'bones', depth: 1 }], lvl: 10, adv: 1500 },
  { name: 'храм', zone: ['wild', { realm: 'temple', depth: 1 }], lvl: 12, adv: 1500 },
  { name: 'окно_инвентарь', zone: ['town', {}], lvl: 5, adv: 1500, win: 'inventory' },
  { name: 'окно_навыки', zone: ['town', {}], lvl: 5, adv: 1500, win: 'skills' },
];
async function diffImages(p, a, b, outFile) {
  const r = await p.evaluate(async ([A, B]) => {
    const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const [ia, ib] = await Promise.all([load(A), load(B)]); if (ia.width !== ib.width || ia.height !== ib.height) return { size: true };
    const W = ia.width, H = ia.height, c = new OffscreenCanvas(W, H), x = c.getContext('2d');
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, W, H); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, W, H);
    let n = 0; const o = x.createImageData(W, H);
    for (let i = 0; i < da.data.length; i += 4) { const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2])); const g = (db.data[i] + db.data[i + 1] + db.data[i + 2]) / 9;
      if (d > 40) { n++; o.data[i] = 255; o.data[i + 1] = 0; o.data[i + 2] = 0; } else { o.data[i] = o.data[i + 1] = o.data[i + 2] = g; } o.data[i + 3] = 255; }
    x.putImageData(o, 0, 0); const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.8 }); const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode(...buf.subarray(i, i + 32768));
    return { ratio: n / (W * H), jpg: btoa(s) };
  }, [a, b].map(f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')));
  if (r.jpg) fs.writeFileSync(outFile, Buffer.from(r.jpg, 'base64'));
  return r.size ? 1 : r.ratio;
}
async function visual() {
  const base = path.resolve(process.env.QA_BASELINE || path.join(ROOT, 'qa_baseline')), cur = Q.mkdir(path.join(OUT, 'visual')), update = flags.includes('--update');
  const out = []; const b = await Q.browser();
  try {
    for (const S of SCENES) {
      const p = await Q.open(b, { seed: 42, titleOnly: !!S.title });
      await p.addStyleTag({ content: '#zoneVeil{transition:none!important}' });   // шторка гаснет CSS-переходом по настоящим часам — на снимке её быть не должно
      if (!S.title) { if (!S.keep) await Q.loadZone(p, ...S.zone); await Q.setHero(p, S.lvl); await Q.advance(p, S.adv); await Q.closeQuiet(p); await Q.settle(p); if (S.win) for (let i = 0; i < 4; i++) {   // окно проявляется CSS-анимацией настоящего времени; если зона ещё сменялась — открыть заново
        await Q.closeQuiet(p); await Q.settle(p); await Q.mod(p, "/ui/windows.js", "openWindow", S.win); await Q.sleep(800); await Q.advance(p, 100);
        if (await p.evaluate(() => !!document.querySelector('.modal') && !document.querySelector('#zoneVeil.on'))) break; } }
      else await Q.sleep(1500);
      const f = await Q.shot(p, path.join(cur, S.name + '.png')), bf = path.join(base, S.name + '.png');
      let r = { scene: S.name, errors: p.errors.splice(0) };
      if (update || !fs.existsSync(bf)) { Q.mkdir(base); fs.copyFileSync(f, bf); r.baseline = 'записан'; }
      else { r.changed = +(100 * await diffImages(p, bf, f, path.join(cur, S.name + '_разница.jpg'))).toFixed(2); }
      r.ok = r.errors.length === 0 && !(r.changed > (S.tol || env('VIS_TOL', 1.5)));   // tol — сцены с живым огнём: свет мерцает, мобы сразу в бою; там ловим только крупные поломки
      out.push(r); log(`visual ${r.ok ? 'OK  ' : 'DIFF'} ${S.name}: ${r.baseline || 'изменилось ' + r.changed + '% пикселей'}${r.errors.length ? ', ошибок ' + r.errors.length : ''}`);
      await p.context().close();
    }
  } finally { await b.close(); }
  log(`  эталон: ${base}\n  снимки и карты разницы (красное — изменилось): ${cur}`);
  Q.writeJSON(path.join(cur, 'report.json'), out);
  return { ok: out.every(r => r.ok), changed: out.filter(r => !r.ok).map(r => `${r.scene} ${r.changed}%`) };
}

// ---------------------------------------------------------------- soak
async function soak() {
  const mins = env('SOAK_MIN', 30), dir = Q.mkdir(path.join(OUT, 'soak')), rot = ZONES.filter(z => z.id !== 'depths' || z.how.floor);
  return withPage({ seed: 3 }, async p => {
    const cdp = await p.context().newCDPSession(p);
    const sample = async label => { await cdp.send('HeapProfiler.collectGarbage'); const m = await p.evaluate(() => ({ heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), dom: document.getElementsByTagName('*').length, canvases: document.getElementsByTagName('canvas').length, listeners: 0 })); const s = await Q.state(p); return { label, gameMin: +(s.time / 60).toFixed(1), ...m, ...s.counts, enemies: s.enemies.alive, zone: s.zone }; };
    const rows = [await sample('старт')]; let gameSec = 0, i = 0;
    while (gameSec < mins * 60) {
      const Z = rot[i++ % rot.length]; const r = await botZone(p, Z, 90, dir); gameSec += 90;
      if (r.errors.length) log(`  ошибки в ${Z.name}: ${r.errors.slice(0, 2).join(' | ')}`);
      const row = await sample(Z.name); rows.push(row); log(`soak ${Math.round(gameSec / 60)} мин: ${row.zone}, память ${row.heapMB} МБ, DOM ${row.dom}, частиц ${row.particles}, эффектов ${row.effects}, тостов ${row.toasts}`);
    }
    // сравнить одинаковые зоны: первый круг против последнего
    const firstLap = rows.slice(1, rot.length + 1), lastLap = rows.slice(-rot.length);
    const avg = (a, k) => a.reduce((s, r) => s + r[k], 0) / Math.max(1, a.length);
    const growMB = +(avg(lastLap, 'heapMB') - avg(firstLap, 'heapMB')).toFixed(1), growDom = Math.round(avg(lastLap, 'dom') - avg(firstLap, 'dom'));
    Q.writeJSON(path.join(dir, 'report.json'), rows);
    const ok = growMB < env('SOAK_MB', 25) && growDom < 300 && p.errors.length === 0;
    log(`soak итог: прирост памяти между первым и последним кругом ${growMB} МБ, DOM ${growDom} узлов → ${ok ? 'утечки нет' : 'ПОХОЖЕ НА УТЕЧКУ'}`);
    return { ok, growMB, growDom, rows: rows.length };
  });
}

// ---------------------------------------------------------------- screens (готовый tools/qa/screens.mjs)
async function screens(filter = process.env.DEV || '') {
  const base = await Q.serve(); fs.mkdirSync('/tmp/claude-0/screens', { recursive: true });
  let out = ''; try { out = execFileSync('node', [path.join(ROOT, 'tools/qa/screens.mjs'), filter], { env: { ...process.env, BASE: base }, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 3600e3 }); } catch (e) { out = String(e.stdout || '') + String(e.stderr || e); }
  fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true }); fs.writeFileSync(path.join(OUT, 'screens', 'report.txt'), out);
  for (const f of fs.readdirSync('/tmp/claude-0/screens')) fs.copyFileSync(path.join('/tmp/claude-0/screens', f), path.join(OUT, 'screens', f));
  log(out.trim().split('\n').slice(-40).join('\n'));
  const bad = out.split('\n').filter(l => /за краем|перекрытие|прокрутка|ошиб/i.test(l));
  return { ok: bad.length === 0, problems: bad.length };
}

// ---------------------------------------------------------------- langs
const WINDOWS = ['menu', 'inventory', 'character', 'skills', 'journal', 'settings', 'npc_elder', 'npc_smith', 'npc_merchant', 'npc_trainer', 'board', 'depths', 'wild', 'survival', 'codex', 'season'];
const LANG_CHECK = () => {
  const W = innerWidth, H = innerHeight, cyr = new Set(), over = [];
  const vis = e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && e.getClientRects().length; };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) { const t = n.nodeValue.trim(); if (t && /[А-Яа-яЁё]{2,}/.test(t) && n.parentElement && vis(n.parentElement) && !n.parentElement.closest('#title .ru-only')) cyr.add(t.slice(0, 80)); }
  // текст шире своего блока: меряем сами текстовые узлы (значки и бейджи внутри кнопки не в счёт); «за краем» — если нельзя докрутить
  const inScroll = e => { for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (a.scrollHeight > a.clientHeight + 2 || a.scrollWidth > a.clientWidth + 2)) return true; } return false; };
  for (const e of document.querySelectorAll('.modal button, .modal h2, .modal .mt, #ui button, .menu-tile, .tab, .btn, .class-card b, .class-card span')) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect(), name = (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    for (const n of e.childNodes) { if (n.nodeType !== 3 || !n.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); const t = rg.getBoundingClientRect();
      if (t.width && (t.left < r.left - 3 || t.right > r.right + 3)) { over.push(`${name} — текст шире кнопки на ${Math.round(Math.max(r.left - t.left, t.right - r.right))} px`); break; } }
    if ((r.right > W + 1 || r.bottom > H + 1 || r.left < -1) && !inScroll(e)) over.push(name + ' — за краем экрана');
  }
  return { cyr: [...cyr], over };
};
async function langs() {
  const dist = path.join(ROOT, 'dist/langs');
  if (!fs.existsSync(path.join(dist, 'js_en')) || flags.includes('--rebuild')) { log('langs: собираю dist/langs …'); execFileSync('node', [path.join(ROOT, 'tools/i18n/build_langs.mjs'), dist], { stdio: 'inherit' }); }
  const base = await Q.serve(dist), list = (process.env.LANGS || fs.readdirSync(dist).filter(d => /^js_[a-z]{2}$/.test(d)).map(d => d.slice(3)).join(',')).split(',');
  const out = []; const b = await Q.browser();
  try {
    for (const lang of list) for (const [w, h, tag] of [[844, 390, 'L'], [390, 844, 'P']]) {
      const dir = Q.mkdir(path.join(OUT, 'langs', lang)); const rep = { lang, screen: tag, cyr: new Set(), over: new Set(), errors: [] };
      try {
        const p = await Q.open(b, { base, lang, w, h, mobile: true, seed: 5 });
        await Q.loadZone(p, 'town', {}); await Q.setHero(p, 12); await Q.advance(p, 2000); await Q.closeModals(p); await Q.advance(p, 200);
        const add = async (name, shotIt) => { const r = await p.evaluate(LANG_CHECK); r.cyr.forEach(x => rep.cyr.add(x)); r.over.forEach(x => rep.over.add(name + ': ' + x)); if (shotIt || process.env.LANG_SHOTS || (lang !== 'ru' && r.cyr.length) || r.over.length) await Q.shot(p, path.join(dir, `${tag}_${name}.jpg`)); };   // снимок окна — только если с ним что-то не так (LANG_SHOTS=1 — всех)
        await add('hud', true);
        for (const win of WINDOWS) { await Q.mod(p, '/ui/windows.js', 'openWindow', win).catch(() => { }); await Q.advance(p, 150); await add(win, false); await p.evaluate(async () => { const D = '/js_' + window.__LANG; (await import(D + '/ui/windows.js')).closeModal(true); }); await Q.advance(p, 100); }
        rep.errors = p.errors.splice(0); await p.context().close();
      } catch (e) { rep.errors.push(String(e).slice(0, 300)); }
      const r = { lang, screen: tag, untranslated: lang === 'ru' ? [] : [...rep.cyr], overflow: [...rep.over], errors: rep.errors };
      r.ok = !r.untranslated.length && !r.overflow.length && !r.errors.length; out.push(r);
      log(`langs ${r.ok ? 'OK  ' : 'FAIL'} ${lang} ${tag}: без перевода ${r.untranslated.length}, не влезает ${r.overflow.length}, ошибок ${r.errors.length}`);
      r.untranslated.slice(0, 4).forEach(x => log('    рус: ' + x)); r.overflow.slice(0, 4).forEach(x => log('    тесно: ' + x));
    }
  } finally { await b.close(); }
  Q.writeJSON(path.join(OUT, 'langs', 'report.json'), out);
  return { ok: out.every(r => r.ok), failed: out.filter(r => !r.ok).map(r => r.lang + r.screen) };
}

// ---------------------------------------------------------------- saves
async function saves() {
  const dir = path.join(ROOT, 'tools/qa/fixtures/saves'), files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : [];
  if (!files.length) { log('saves: нет сохранений в tools/qa/fixtures/saves — сделайте их: node tools/qa/save_fixtures.mjs'); return { ok: false, files: 0 }; }
  const out = []; const b = await Q.browser();
  try {
    for (const f of files) {
      const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); const r = { from: f, expect: fx.expect };
      try {
        const p = await Q.open(b, { save: fx.storage, seed: 9 });
        await Q.advance(p, 3000); await Q.closeModals(p); await Q.advance(p, 2000);
        const s = await Q.state(p); const gear = await p.evaluate(() => Object.values(window.__G.profile.gear || {}).filter(Boolean).length);
        r.got = { cls: s.player.cls, level: s.player.lvl, gold: s.gold, gear, zone: s.zone };
        const e = fx.expect; r.problems = [];
        if (e.cls && e.cls !== r.got.cls) r.problems.push(`класс ${e.cls} → ${r.got.cls}`);
        if (e.level !== r.got.level) r.problems.push(`уровень ${e.level} → ${r.got.level}`);
        if (r.got.gold < e.gold) r.problems.push(`золото ${e.gold} → ${r.got.gold}`);
        if (e.gear && r.got.gear < e.gear) r.problems.push(`вещей надето ${e.gear} → ${r.got.gear}`);
        r.errors = p.errors.splice(0); await Q.shot(p, path.join(OUT, 'saves', f.replace('.json', '.jpg'))); await p.context().close();
      } catch (e) { r.problems = ['не загрузилось: ' + String(e).slice(0, 200)]; r.errors = []; }
      r.ok = !r.problems.length && !r.errors.length; out.push(r);
      log(`saves ${r.ok ? 'OK  ' : 'FAIL'} ${f}: ${r.ok ? `ур. ${r.got.level}, ${r.got.gold} зол., вещей ${r.got.gear}` : r.problems.concat(r.errors).join('; ')}`);
    }
  } finally { await b.close(); }
  Q.writeJSON(path.join(OUT, 'saves', 'report.json'), out);
  return { ok: out.every(r => r.ok), files: out.length, failed: out.filter(r => !r.ok).map(r => r.from) };
}

// ---------------------------------------------------------------- perf
async function perf() {
  const rate = env('CPU', 4), dir = Q.mkdir(path.join(OUT, 'perf')), prevF = path.join(dir, 'last.json'), prev = fs.existsSync(prevF) ? JSON.parse(fs.readFileSync(prevF, 'utf8')) : null;
  const scenes = [['деревня', 'town', {}, 5, 2000], ['катакомбы', 'catacombs', {}, 5, 1000], ['жатва (рой)', 'survival', {}, 10, 45000], ['храм', 'wild', { realm: 'temple', depth: 1 }, 12, 1000], ['фьорды', 'wild', { realm: 'fjord', depth: 1 }, 8, 1000]];
  const out = [];
  await withPage({ seed: 11, mobile: true }, async p => {
    const cdp = await p.context().newCDPSession(p);
    for (const [name, id, how, lvl, pre] of scenes) {
      await Q.loadZone(p, id, how); await Q.setHero(p, lvl); await p.evaluate(() => { window.__G.player.inv = 1e9; });   // бессмертие только на замер
      await Q.advance(p, pre); await Q.closeModals(p); await Q.resume(p);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      const fr = await p.evaluate(() => new Promise(ok => { const a = []; let l = performance.now(); const t0 = l; const f = n => { a.push(n - l); l = n; if (n - t0 < 6000) requestAnimationFrame(f); else ok(a.slice(5)); }; requestAnimationFrame(f); }));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const r = { scene: name, fpsMed: Math.round(1000 / Q.pct(fr, 0.5)), fps5: Math.round(1000 / Q.pct(fr, 0.95)), long: fr.filter(x => x > 50).length, frames: fr.length };
      const pv = prev && prev.find(x => x.scene === name); if (pv) r.was = pv.fpsMed;
      out.push(r); log(`perf ${name}: медиана ${r.fpsMed} FPS, худшие 5% ${r.fps5} FPS, кадров дольше 50 мс ${r.long}${pv ? ` (в прошлый раз ${pv.fpsMed})` : ''}`);
      await Q.advance(p, 16);
    }
  });
  log(`  процессор замедлен ×${rate}, рисует программный WebGL (SwiftShader): цифры ниже настоящего телефона, сравнивать только между прогонами`);
  Q.writeJSON(prevF, out);
  return { ok: !out.some(r => r.was && r.fpsMed < r.was * 0.8), scenes: out };
}

// ---------------------------------------------------------------- balance
async function balance() {
  const N = env('BAL_N', 10), dir = Q.mkdir(path.join(OUT, 'balance'));
  const fights = (process.env.BAL || '5:8,5:11,5:14,10:14,10:18,15:20,15:24').split(',').map(x => x.split(':').map(Number));   // этаж стража : уровень героя; бой один на один со стражем
  const rows = []; const b = await Q.browser();
  try {
    for (const cls of [0, 1, 2]) for (const [floor, lvl] of fights) {
      const runs = []; const p = await Q.open(b, { seed: 1000, cls });   // одна страница на класс, перед каждым боем — свой сид и свежий герой
      for (let i = 0; i < N; i++) {
        if (i) await Q.sleep(1600);   // экран гибели прошлого боя всплывает по таймеру 1,3 с — дождаться и убрать
        await p.evaluate(i => { const G = window.__G, d = document.getElementById('death'); if (d) d.classList.add('hidden'); G.paused = false; G.player.dead = false; G.player.state = 'idle'; G.revives = 0; G.profile.potions.hp = 3; G.profile.potions.mp = 1; window.__qaReseed(1000 + i); }, i);   // каждый бой — с теми же 3 зельями (раньше бот выпивал их в первом бою, дальше дрался без них)
        await Q.setHero(p, lvl); await Q.closeQuiet(p); await Q.loadZone(p, 'depths', { floor, fullHeal: true, noReseed: true }); await Q.setHero(p, lvl); await Q.closeQuiet(p);
        // бой один на один со стражем этажа: остальных убираем, героя ставим в 6 м от стража в прямой видимости
        await p.evaluate(() => { const G = window.__G, pl = G.player, m = G.zone.map, boss = G.enemies.find(e => e.D.boss) || G.enemies.find(e => e.D.elite); if (!boss) return;
          G.enemies = [boss]; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283, x = boss.x + Math.cos(a) * 6, y = boss.y + Math.sin(a) * 6; if (m.free(x, y, 0.4) && m.los(x, y, boss.x, boss.y)) { pl.x = x; pl.y = y; break; } }
          boss.aggro = true; });
        await Q.advance(p, 100);
        let s = await Q.state(p); const total = s.zone === 'depths' ? s.enemies.alive : 0; let t = 0;
        for (; total && t < 240 * 4 && s.zone === 'depths' && s.enemies.alive > 0 && !s.player.dead; t++) {
          if (s.mode !== 'play') { await Q.closeModals(p); s = await Q.botTick(p, { idle: true }); continue; }
          s = await Q.botTick(p);
        }
        const bossHp = await p.evaluate(() => { const e = window.__G.enemies[0]; return e ? Math.round(100 * Math.max(0, e.hp) / e.maxHP) : 0; });
        runs.push({ zone: s.zone, bossHpLeft: bossHp, win: total > 0 && s.zone === 'depths' && s.enemies.alive === 0 && !s.player.dead, dead: s.player.dead, sec: t / 4, hpLeft: s.player.dead ? 0 : Math.round(100 * s.player.hp / s.player.maxHP), killed: total - s.enemies.alive, total });
      }
      await p.context().close();
      const wins = runs.filter(r => r.win), row = { cls: ['воин', 'лучник', 'маг'][cls], floor, lvl, n: N, winPct: Math.round(100 * wins.length / N), deaths: runs.filter(r => r.dead).length, medSec: Q.pct(wins.map(r => r.sec), 0.5), medHpLeft: Q.pct(wins.map(r => r.hpLeft), 0.5), bossLeft: Q.pct(runs.filter(r => !r.win).map(r => r.bossHpLeft), 0.5) };
      row.runs = runs; rows.push(row); log(`balance ${row.cls} ур.${lvl} этаж ${floor}: побед ${row.winPct}%, смертей ${row.deaths}/${N}, медиана ${row.medSec} с, HP в конце ${row.medHpLeft}%${row.winPct < 100 ? `, у стража в проигранных осталось ${row.bossLeft}%` : ''}`);
    }
  } finally { await b.close(); }
  const md = ['| Класс | Ур. | Этаж | Побед | Смертей | Время, с | HP героя в конце | HP стража, когда проиграл |', '|---|---:|---:|---:|---:|---:|---:|---:|', ...rows.map(r => `| ${r.cls} | ${r.lvl} | ${r.floor} | ${r.winPct}% | ${r.deaths}/${r.n} | ${r.medSec} | ${r.medHpLeft}% | ${r.winPct < 100 ? r.bossLeft + '%' : '—'} |`)].join('\n');
  fs.writeFileSync(path.join(dir, 'balance.md'), md + '\n'); Q.writeJSON(path.join(dir, 'report.json'), rows);
  return { ok: true, rows };
}

const CHECKS = { smoke, bot, visual, soak, screens, langs, saves, perf, balance };
const PLAN = { prebuild: ['smoke', 'bot', 'visual', 'screens'], all: Object.keys(CHECKS) }[which] || which.split(',');
if (which === 'prebuild') { process.env.BOT_SEC ||= '60'; process.env.DEV ||= 'iPhone'; }
const t0 = Date.now();
try {
  for (const c of PLAN) {
    if (!CHECKS[c]) { log('нет проверки ' + c + '; есть: ' + Object.keys(CHECKS).join(', ') + ', prebuild, all'); process.exit(2); }
    log(`\n=== ${c} ===`); const t = Date.now();
    try { results[c] = await CHECKS[c](); } catch (e) { results[c] = { ok: false, crash: String(e.stack || e).slice(0, 600) }; log(results[c].crash); }
    log(`=== ${c}: ${results[c].ok ? 'OK' : 'ЕСТЬ ПРОБЛЕМЫ'} (${Math.round((Date.now() - t) / 1000)} с)`);
  }
} finally { Q.stopServers(); }
Q.writeJSON(path.join(OUT, 'summary.json'), { at: new Date().toISOString(), build: null, secs: Math.round((Date.now() - t0) / 1000), results });
log('\nИтог: ' + Object.entries(results).map(([k, v]) => `${k} ${v.ok ? 'OK' : 'FAIL'}`).join(' · ') + `  → ${OUT}/summary.json`);
process.exit(Object.values(results).every(r => r.ok) ? 0 : 1);
