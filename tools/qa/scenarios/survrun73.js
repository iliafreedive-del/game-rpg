// Сборка 73: герой бежит «вверх» по экрану без остановок — враги должны выходить и спереди. node tools/qa/run.mjs tools/qa/scenarios/survrun73.js 1600 900
const G = window.__G; const gm = await import('/js/game/game.js'); const P = G.profile; P.level = 20; P.tutorial.prologue = true; P.survIntro = true;
P.story = P.story || {}; P.story.flags = P.story.flags || {}; P.story.flags.bossKilled = true; P.settings.survZoom = +(window.__TAG !== 'x' ? window.__TAG : 1.75);
await gm.loadZone('survival', {}); for (let k = 0; k < 150 && !G.zoneReady; k++) await sleep(200); await sleep(3000);
document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
const S = G.surv; S.eliteT = 999; S.bossT = 900; S.invAt = 900; S.t = 240;
const pl = G.player, c = G.cam;
// направление «вверх по экрану» в мире
let best = 0, ba = 0; for (let a = 0; a < 6.283; a += 0.05) { const [, y0] = c.toScreen(pl.x, pl.y, 0), [, y1] = c.toScreen(pl.x + Math.cos(a), pl.y + Math.sin(a), 0); if (y0 - y1 > best) { best = y0 - y1; ba = a; } }
const ux = Math.cos(ba), uy = Math.sin(ba);
const seen = new Set(S.swarm); let ahead = 0, side = 0, behind = 0, onScr = 0, walls = 0;
const keep = () => { pl.hp = G.stats.maxHP; pl.inv = 1e9; S.xp = 0; S.pending = 0; G.modalOpen = false; G.paused = false; document.querySelectorAll('.modal-bg').forEach(m => m.remove()); };
for (let i = 0; i < 900; i++) {   // 30 с бега со скоростью 5 м/с
  keep(); pl.x += ux * 5 / 30; pl.y += uy * 5 / 30; window.advanceTime(33, { render: i % 60 === 59 });
  for (const e of S.swarm) if (!seen.has(e)) { seen.add(e); const dx = e.x - pl.x, dy = e.y - pl.y, d = Math.hypot(dx, dy), k = (dx * ux + dy * uy) / d; if (k > 0.5) ahead++; else if (k < -0.5) behind++; else side++; const [sx, sy] = c.toScreen(e.x, e.y, 0.5); if (sx > 0 && sx < c.w && sy > 0 && sy < c.h) onScr++; }
}
await sleep(500); await shot('survrun_' + window.__TAG);
const n = ahead + side + behind; print('zoom', P.settings.survZoom, 'spawned', n, 'ahead', ahead, 'side', side, 'behind', behind, 'onscreen', onScr, 'swarm', S.swarm.length);
