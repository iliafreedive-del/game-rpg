// Сборка 50: обзор на портал Жатвы и размер порталов. Запуск: node tools/qa/run.mjs tools/qa/scenarios/portal50.js 430 932
const G = window.__G; const gm = await import('/js/game/game.js'); const P = G.profile; P.level = 5; P.tutorial.prologue = true;
await gm.loadZone('town', {}); await sleep(1500);
for (const id of ['portal_survival', 'portal_town']) { const p = G.zone.inter.find(i => i.id === id); if (!p) { print('нет', id); continue; }
  G.player.x = p.x + 1.4; G.player.y = p.y + 1.4; await step(20); await sleep(1200); await shot('portal50_' + id + '_' + innerWidth); }
print('ok');
