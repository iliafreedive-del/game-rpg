// Сборка 55: собаки деревни — тёмная (dog_town) и светлая (dog_brown), «села» как первая собака. Запуск: TAG=after node tools/qa/run.mjs tools/qa/scenarios/dogs55.js 932 430
const G = window.__G; const gm = await import('/js/game/game.js'); G.profile.tutorial.prologue = true;
await gm.loadZone('town', {}); await sleep(3000); document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false;
const cz = await import('/js/core/camzoom.js'); cz.setZoom(0.7);
const dogs = window.__R3.world.critters.list.filter(a => a.k === 'dog');
for (const [i, a] of dogs.entries()) for (const st of ['idle', 'sit']) {
  a.r = -20; a.x = a.hx; a.y = a.hy; a.yaw = 0.8; a.st = st; a.t = 999; G.player.x = a.x - 1.5; G.player.y = a.y - 1.5;
  await step(10); a.st = st; a.t = 999; a.sit = st === 'sit' ? 1 : 0; await sleep(2200); await shot((window.__TAG || 'x') + '_dog' + i + '_' + st); print('pos', i, st, G.cam.toScreen(a.x, a.y, 0.3).map(v => v | 0));
}
print('dogs', dogs.map(a => a.m.glb ? a.m.glb.glb : 'proc'));
