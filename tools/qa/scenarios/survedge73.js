// Сборка 73: край арены Жатвы не должен быть виден ни при каком положении героя (сдвиг мира WRAP/TILE) и зуме.
// node tools/qa/run.mjs tools/qa/scenarios/survedge73.js 1600 900 — снимки /tmp/claude-0/shots/survedge_*.jpg
const G = window.__G; const gm = await import('/js/game/game.js'); const P = G.profile; P.level = 20; P.tutorial.prologue = true; P.survIntro = true;
P.story = P.story || {}; P.story.flags = P.story.flags || {}; P.story.flags.bossKilled = true; P.settings.survZoom = 1.75;
await gm.loadZone('survival', {}); for (let k = 0; k < 150 && !G.zoneReady; k++) await sleep(200); await sleep(3000);
document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
const S = G.surv; S.eliteT = 999; S.bossT = 900; S.invAt = 900;
const r = () => window.__R3 && window.__R3.renderer.info.render;
// крайние положения героя до сдвига: 80..120 по каждой оси (ARENA_C ± WRAP)
for (const [x, y, n] of [[80.2, 80.2, "nw"], [119.8, 119.8, "se"], [80.2, 119.8, "sw"], [119.8, 80.2, "ne"]]) {
  S.swarm.length = 0; G.player.x = x; G.player.y = y; G.cam.x = x; G.cam.y = y; G.player.hp = G.stats.maxHP;
  for (let i = 0; i < 20; i++) { G.player.x = x; G.player.y = y; window.advanceTime(33); } await sleep(800);
  print(n, 'calls', r() && r().calls, 'tris', r() && r().triangles); await shot('survedge_' + n);
}
