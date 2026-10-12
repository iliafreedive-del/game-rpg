// Лаги нарастают со временем и проходят после смены вкладки / полного экрана (12 октября). Ищем, что копится:
// незакрытый путь 2D-холста (фигуры без beginPath — каждый fill/stroke перерисовывает всё накопленное), save без restore,
// память three.js, число объектов сцены, эффекты. Бой в походе, ~300 кадров с рисованием.
// Запуск: CLS=1 node tools/qa/run.mjs tools/qa/scenarios/leak66.js   (TAG=fjord|forest|temple|town|catacombs)
const G = window.__G, gm = await import('/js/game/game.js'); const R3 = window.__R3, rm = await import('/js/render3d/renderer3d.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
const P2 = CanvasRenderingContext2D.prototype, st = new Map();   // холст → {open: фигур с последнего beginPath, maxOpen, save-restore}
const S = c => { let s = st.get(c); if (!s) st.set(c, s = { open: 0, maxOpen: 0, depth: 0, fills: 0, w: c.canvas.width + 'x' + c.canvas.height, id: c.canvas.id || c.canvas.className || '?' }); return s; };
for (const f of ['arc', 'ellipse', 'rect', 'lineTo', 'moveTo', 'quadraticCurveTo', 'bezierCurveTo', 'arcTo', 'roundRect']) { const o = P2[f]; if (o) P2[f] = function (...a) { const s = S(this); s.open++; if (s.open > s.maxOpen) s.maxOpen = s.open; return o.apply(this, a); }; }
{ const o = P2.beginPath; P2.beginPath = function () { S(this).open = 0; return o.call(this); }; }
for (const f of ['fill', 'stroke']) { const o = P2[f]; P2[f] = function (...a) { S(this).fills++; return o.apply(this, a); }; }
{ const o = P2.save; P2.save = function () { S(this).depth++; return o.call(this); }; const r = P2.restore; P2.restore = function () { S(this).depth--; return r.call(this); }; }
const z = window.__TAG !== 'x' ? window.__TAG : 'temple';
if (['forest', 'fjord', 'temple', 'bones'].includes(z)) await gm.loadZone('wild', { realm: z, depth: 3 }); else await gm.loadZone(z, z === 'catacombs' ? {} : undefined);
for (let k = 0; k < 100 && !G.zoneReady; k++) await sleep(200); await sleep(3000);
for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
G.paused = false; const P = G.player; if (window.qaInput) window.qaInput.attackHeld = true; let FT = [];
const cnt = () => { let n = 0; R3.scene.traverse(() => n++); return n; };
const snap = t => { const I = R3.renderer.info, L = []; for (const s of st.values()) L.push(s.id + ' ' + s.w + ' open ' + s.open + ' maxOpen ' + s.maxOpen + ' depth ' + s.depth + ' fills ' + s.fills);
  const ft = FT.sort((a, b) => a - b)[FT.length >> 1] || 0; FT = [];
  print('t', t, 'frame med ms', ft.toFixed(1), 'heap MB', performance.memory ? (performance.memory.usedJSHeapSize / 1e6).toFixed(0) : '-', 'G.particles', (G.particles || []).length, 'texts', (G.texts || []).length, 'geo', I.memory.geometries, 'tex', I.memory.textures, 'prog', I.programs.length, 'scene', cnt(), 'effects', G.effects.length, 'enemies', G.enemies.length, 'pr', R3.renderer.getPixelRatio(), '|', L.join(' ; ')); };
snap(0);
for (let i = 1; i <= (+window.__N || 600); i++) {
  // бой: герой бессмертен, враги рядом бьют и колдуют
  P.hp = G.stats.maxHP; G.auto = true; const near = G.enemies.filter(e => !e.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
  if (near && Math.hypot(near.x - P.x, near.y - P.y) > 6) { P.x = near.x + 2; P.y = near.y + 1; }
  for (const e of G.enemies) e.aggro = true; if (G.enemies.filter(e => !e.dead).length < 6) for (let k = 0; k < 4; k++) rm.spawnEnemies(['f_jotun', 'f_hag', 'f_draugr'], 4);
  window.advanceTime(150, { render: false }); const a0 = performance.now(); window.advanceTime(16); FT.push(performance.now() - a0);
  if (i % 75 === 0) snap(i);
}
