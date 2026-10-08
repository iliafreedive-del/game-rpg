// Сборка 55: площадь, лавочка у церкви, сухое дерево у катакомб, собаки, поля. Запуск: TAG=after node tools/qa/run.mjs tools/qa/scenarios/village54.js 430 932
const G = window.__G; const gm = await import('/js/game/game.js'); const P = G.profile; P.level = 5; P.tutorial.prologue = true;
await gm.loadZone('town', {}); await sleep(2500);
const tag = window.__TAG || 'x', J = G.zone.json, ob = t => J.objects.filter(o => o.t === t), npc = id => J.npcs.find(n => n.id === id);
document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false;
const go = async (x, y, name, w = 1500) => { G.player.x = x; G.player.y = y; await step(30); await sleep(w); await shot(tag + '_' + name); };
const el = npc('elder'); print('elder', el.x, el.y, 'bench', JSON.stringify(ob('bench')), 'shrine', JSON.stringify(ob('shrine')), 'board', JSON.stringify(ob('board')), 'hw', JSON.stringify(ob('herospath').concat(ob('hwarch'))));
print('types', [...new Set(J.objects.map(o => o.t))].join(','));
await go(el.x + 2, el.y + 2.5, 'church');
const sh = ob('shrine')[0]; if (sh) await go(sh.x + 1.5, sh.y + 3, 'square');
const dt = ob('deadtree')[0]; if (dt) await go(dt.x + 2, dt.y + 2.5, 'deadtree');
const dogs = window.__R3.world.critters.list.filter(a => a.k === 'dog');
for (const [i, a] of dogs.entries()) { G.player.x = a.x + 6; G.player.y = a.y + 6; await step(20); await sleep(1000); a.st = 'sit'; a.t = 999; a.x = a.hx; a.y = a.hy; a.yaw = 0.8; const cz = await import('/js/core/camzoom.js'); cz.setZoom(0.7); G.player.x = a.x + 3.7; G.player.y = a.y + 4.2; await step(30); a.st = 'sit'; a.t = 999; await sleep(2500); await shot(tag + '_dog' + i); }
const p0 = window.__R3.world.critters; print('dogs', dogs.map(a => a.m.glb ? a.m.glb.glb || 'glb' : 'proc'));
