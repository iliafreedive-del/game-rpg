// Сборка 54: враги не возникают на виду, когда герой долго бежит в одну сторону. Запуск: node tools/qa/run.mjs tools/qa/scenarios/surv54_pop.js 430 932
const G = window.__G; const gm = await import('/js/game/game.js'); const P = G.profile; P.level = 5; P.tutorial.prologue = true; P.survIntro = true;
const closeAll = () => { for (let k = 0; k < 6; k++) { const b = document.querySelector('.modal .btn.gold, .modal-bg .btn.gold'); if (b) b.click(); } };
await gm.loadZone('survival', {}); await sleep(1500); closeAll(); G.surv.t = 130; G.surv.intro = false; document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
(await import('/js/game/ctx.js')).bus.on('worldShift', ({ dx, dy }) => { for (const e of G.surv.swarm) if (e.px != null) { e.px += dx; e.py += dy; } });
const cam = G.cam, inside = (e, m) => { const [x, y] = cam.toScreen(e.x, e.y, 0.5); return x > -m && x < cam.w + m && y > -m && y < cam.h + m; };
let pops = 0, prev = new Map(); const log = []; const det = (k, e) => { if (log.length < 14) { const [x, y] = cam.toScreen(e.x, e.y, 0.5); log.push([k, Math.hypot(e.x - G.player.x, e.y - G.player.y).toFixed(1), x | 0, y | 0, e.px != null ? Math.hypot(e.x - e.px, e.y - e.py).toFixed(1) : '-']); } }; const keep = () => { G.player.inv = 1e9; G.player.hp = G.stats.maxHP; G.surv.xp = 0; G.surv.pending = 0; };
for (let i = 0; i < 40; i++) { keep(); await sleep(100); if (i % 10 === 0) closeAll(); }
let fr = 0; for (const [dx, dy] of [[-0.25, 0], [0, 0.25]]) for (let i = 0; i < 300; i++) {
  keep(); G.player.x += dx; G.player.y += dy; await new Promise(r => requestAnimationFrame(r)); fr++; if (i % 30 === 0) closeAll();
  const now = new Map(); for (const e of G.surv.swarm) { now.set(e, inside(e, 0)); if (now.get(e) && prev.has(e) && !inside({ x: e.px, y: e.py }, 40)) { pops++; det('jump', e); } e.px = e.x; e.py = e.y; }
  for (const e of G.surv.swarm) if (now.get(e) && !prev.has(e)) { pops++; det('new', e); }   // новый враг сразу на виду
  prev = now;
}
print(JSON.stringify(log), 'cam', cam.w, cam.h); print('pops', pops, 'frames', fr, 'pos', G.player.x.toFixed(1), 'swarm', G.surv.swarm.length);
