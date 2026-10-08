// Сборка 58: стоянка Кофи, панель зверей, все 10 питомцев у героя. TAG=x node tools/qa/run.mjs tools/qa/scenarios/caravan58.js 430 932
const G = window.__G; const gm = await import('/js/game/game.js'); const P = G.profile; P.level = 12; P.tutorial.prologue = true; P.shards = 400;
await gm.loadZone('town', {}); await sleep(2500);
document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false;
const tag = window.__TAG || 'x', kv = G.zone.json.npcs.find(n => n.id === 'caravan');
print('caravan', kv.x, kv.y);
G.player.x = kv.x + 3.5; G.player.y = kv.y + 3.5; await step(30); await sleep(1800); await shot(tag + '_camp');
G.player.x = kv.x + 1.2; G.player.y = kv.y + 1.2; await step(20); await sleep(1200); await shot(tag + '_panel');
const PT = await import('/js/game/pets.js'); const { PETS } = await import('/js/data/pets.js');
PT.meetCaravan(); for (const id of Object.keys(PETS)) PT.buyPet(id);
print('own', JSON.stringify(P.pets), 'shards', P.shards);
await step(5); await sleep(800); await shot(tag + '_panel2');
const cz = await import('/js/core/camzoom.js'); cz.setZoom(0.6);
document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false;
for (const id of Object.keys(PETS)) { P.pets.active = id; PT.spawnPet(true); G.player.x = 31; G.player.y = 40; G.pet.x = 32.2; G.pet.y = 40.6; await step(3); await sleep(700); await shot(tag + '_pet_' + id); }
return 'ok';
