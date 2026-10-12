// Сборка 60: питомцы из Meshy на своих скелетах. Для каждого: стоит (idle) и бежит за героем (walk), камера вблизи.
// TAG=x node tools/qa/run.mjs tools/qa/scenarios/pets60.js 844 600   (TAG=x:fennec,crow — только эти)
const G = window.__G; const gm = await import('/js/game/game.js'); const P = G.profile; P.level = 12; P.tutorial.prologue = true; P.shards = 400;
await gm.loadZone('town', {}); await sleep(2500);
document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false;
const [tag, onlyS] = (window.__TAG || 'x').split(':'); const kv = G.zone.json.npcs.find(n => n.id === 'caravan');
const PT = await import('/js/game/pets.js'); const { PETS } = await import('/js/data/pets.js');
PT.meetCaravan(); for (const id of Object.keys(PETS)) PT.buyPet(id);
document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false;
G.zoomMul = 3.2;   // камера втрое ближе — видно лапы
const only = (onlyS || '').split(',').filter(Boolean);
const at = n => { const p = G.pet, [sx, sy] = G.cam.proj.toScreen(p.x, p.y, 0.4); print('crop', n, Math.round(sx), Math.round(sy)); };
for (const id of Object.keys(PETS)) {
  if (only.length && !only.includes(id)) continue;
  P.pets.active = id; PT.spawnPet(true); const X = kv.x + 4, Y = kv.y + 4; G.player.x = X; G.player.y = Y; G.pet.x = X + 1.0; G.pet.y = Y + 0.6; await step(3); await sleep(2500);   // шкура качается
  G.player.x = X + 3.5; G.player.y = Y - 1.5; await sleep(300); at(tag + '_' + id + '_walk'); await shot(tag + '_' + id + '_walk');
  await sleep(120); at(tag + '_' + id + '_walk2'); await shot(tag + '_' + id + '_walk2');
  await sleep(2500); at(tag + '_' + id + '_idle'); await shot(tag + '_' + id + '_idle');
}
return 'ok';
