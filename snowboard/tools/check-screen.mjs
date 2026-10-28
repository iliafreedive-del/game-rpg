// Автопроверки в браузере (нужен playwright: npm i -g playwright или PLAYWRIGHT=/путь/к/playwright):
// райдер в кадре и не за субтитрами в демонстрациях, камера жива после конца урока и падения,
// замедление без рывков. Запуск: node tools/check-screen.mjs http://localhost:8000/index.html [desktop|phone|land]
const pw = await import(process.env.PLAYWRIGHT || 'playwright');
const chromium = (pw.default || pw).chromium;
const base = process.argv[2] || 'http://localhost:8000/index.html';
const which = process.argv[3] || 'desktop';
const sizes = { desktop: { width: 1280, height: 720 }, phone: { width: 390, height: 780, isMobile: true, hasTouch: true }, land: { width: 844, height: 390, isMobile: true, hasTouch: true } };
const sz = sizes[which];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: sz.width, height: sz.height }, isMobile: !!sz.isMobile, hasTouch: !!sz.hasTouch });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(base + (base.includes('?') ? '&' : '?') + 'shots=1', { waitUntil: 'load' });
await page.waitForFunction('window.__app && window.__app.rider', null, { timeout: 60000 });
await page.waitForTimeout(800);

const ff = (sec) => `(() => { const A = window.__app; const n = Math.round(${sec} * 60); for (let i = 0; i < n; i++) A.updateRide(1 / 60); })()`;
// где райдер на экране: NDC центра и низа доски, верх баннера демо в долях экрана
const probe = `(() => { const A = window.__app, T = A.THREE; A.updateRide(1 / 60);
  const c = A.camera; c.updateMatrixWorld(); const r = A.rider.root;
  const pr = (v) => { const p = v.clone().project(c); return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(3) }; };
  const head = pr(r.localToWorld(new T.Vector3(0, 1.55, 0)));
  const board = pr(r.position);
  const b = document.getElementById('demoBanner'), H = innerHeight;
  const bannerTopNdc = b && !b.classList.contains('hidden') ? 1 - 2 * (b.getBoundingClientRect().top / H) : -1;
  const fin = [c.position.x, c.position.y, c.position.z].every(Number.isFinite);
  return { head, board, bannerTopNdc: +bannerTopNdc.toFixed(2), fin, mode: A.rig.mode, pause: !!A.app.pause, fallen: !!A.sim.fallen }; })()`;

let bad = 0;
const report = (tag, r) => {
  const inFrame = r.fin && r.board.z < 1 && Math.abs(r.board.x) < 0.9 && r.board.y > -1 && r.head.y < 1;
  const overBanner = r.bannerTopNdc > -1 && r.board.y < r.bannerTopNdc + 0.04; // низ доски ниже верха баннера
  const ok = inFrame && !overBanner;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${tag.padEnd(26)} cam=${r.mode.padEnd(7)} board=(${r.board.x},${r.board.y}) head.y=${r.head.y} bannerTop=${r.bannerTopNdc}${overBanner ? ' · ЗА СУБТИТРАМИ' : ''}${!inFrame ? ' · НЕ В КАДРЕ' : ''}${r.pause ? ' · пауза' : ''}${r.fallen ? ' · упал' : ''}`);
};

for (const id of ['heel_slip', 'toe_slip', 'leaf', 'jturn', 'garland', 'turns', 'carve', 'free', 'track:green']) {
  await page.evaluate(`window.__app.startRide(${JSON.stringify(id)}, true)`); await page.waitForTimeout(400);
  let t = 0;
  for (const dt of [1, 3, 4, 4, 5]) { t += dt; await page.evaluate(ff(dt)); await page.waitForTimeout(350); report(`demo ${id} t=${t}`, await page.evaluate(probe)); }
}
for (const id of ['heel_slip', 'turns', 'track:green']) {
  await page.evaluate(`window.__app.startRide(${JSON.stringify(id)}, false); window.__app.app.autoplay = true;`); await page.waitForTimeout(400);
  let t = 0;
  for (const dt of [2, 4, 6]) { t += dt; await page.evaluate(ff(dt)); await page.waitForTimeout(350); report(`practice ${id} t=${t}`, await page.evaluate(probe)); }
}
// камера после конца урока и после падения → новый урок (раньше смотрела в небо)
await page.evaluate(`window.__app.startRide('turns', false); window.__app.app.autoplay = true;`);
await page.evaluate(ff(40)); await page.waitForTimeout(900);
const ended = await page.evaluate('({ ended: window.__app.app.ended, modal: !document.getElementById("modal").classList.contains("hidden") })');
console.log('after turns practice:', JSON.stringify(ended));
await page.evaluate(`document.getElementById('modal').classList.add('hidden'); window.__app.startRide('heel_slip', true)`); await page.waitForTimeout(400);
await page.evaluate(ff(2)); await page.waitForTimeout(350); report('after end → heel demo', await page.evaluate(probe));
await page.evaluate(`window.__app.startRide('heel_slip', false); window.__app.app.autoplay = true;`);
await page.evaluate(ff(24)); await page.waitForTimeout(300);
console.log('fallen:', await page.evaluate('window.__app.sim.fallen && window.__app.sim.fallen.type'));
await page.evaluate(`document.getElementById('modal').classList.add('hidden'); window.__app.startRide('leaf', true)`); await page.waitForTimeout(400);
await page.evaluate(ff(2)); await page.waitForTimeout(350); report('after fall → leaf demo', await page.evaluate(probe));
// плавность замедления: шаг райдера между кадрами при ×0.35 должен быть ровным
await page.evaluate(`window.__app.startRide('turns', true)`); await page.evaluate(ff(4));
const jitter = await page.evaluate(`(() => { const A = window.__app; A.app.slow = 0.35; const d = []; let prev = A.rider.root.position.clone();
  for (let i = 0; i < 90; i++) { A.updateRide(1 / 60); const p = A.rider.root.position.clone(); d.push(p.distanceTo(prev)); prev = p; }
  const m = d.reduce((a, b) => a + b, 0) / d.length, sd = Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / d.length);
  A.app.slow = 1; return { mean: +m.toFixed(4), sd: +sd.toFixed(4), zeros: d.filter((x) => x < 1e-6).length }; })()`);
console.log('slow-mo step per frame:', JSON.stringify(jitter), jitter.zeros > 10 || jitter.sd > jitter.mean * 0.6 ? 'FAIL рывки' : 'ok плавно');
if (jitter.zeros > 10 || jitter.sd > jitter.mean * 0.6) bad++;
console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 10).join('\n') : 'no page errors');
console.log(bad ? `FAILED: ${bad}` : 'ALL OK');
await browser.close();
process.exit(bad ? 1 : 0);
