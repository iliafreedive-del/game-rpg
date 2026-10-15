// 15 октября: первый питомец (фенек Кофи) — сразу моделью Meshy, без процедурного лиса; жители, герой, мобы — тоже без процедурных подмен.
// node tools/qa/run.mjs tools/qa/scenarios/pet_meshy73.mjs 844 390
const G = window.__G, P = G.profile, gm = await import('/js/game/game.js'), pets = await import('/js/game/pets.js'), sk = await import('/js/render3d/glbskin.js');
P.tutorial.prologue = true; await gm.loadZone('town', {}); for (let i = 0; i < 60 && !G.zoneReady; i++) await sleep(250); await sleep(1500);
document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
print('фенек загружен до подарка:', sk.skinLoaded('pet_fennec'));
const R = window.__R3, proc = new Set();
const watch = () => { for (const [k, a] of R.actors) if (!a.model.skin && !a.isSwarm) proc.add((a.def && a.def.id) || '?'); };
const iv = setInterval(watch, 16);
pets.meetCaravan(); print('питомец', G.pet && G.pet.id);
G.zoomMul = 3; G.pet.x = G.player.x + 1; G.pet.y = G.player.y + 0.6;
await sleep(5000); clearInterval(iv); watch();
const pa = [...R.actors.values()].find(a => a.isPet); print('актёров', R.actors.size, 'G.pet', !!G.pet, 'paused', G.paused); print('модель питомца Meshy:', !!(pa && pa.model.skin), '| процедурные актёры за всё время:', [...proc].join(', ') || 'нет');
await shot('pet73_fennec');
return 'ok';
