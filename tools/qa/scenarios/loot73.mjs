// 15 октября: добыча на земле — нарисованные вещи и зелья (не значки старого атласа). node tools/qa/run.mjs tools/qa/scenarios/loot73.mjs 844 390
const G = window.__G, I = await import('/js/game/items.js');
await sleep(2500); document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
G.profile.bagSize = G.profile.bag.length; const p = G.player, mk = (o, dx, dy) => G.pickups.push({ id: 'q' + dx + dy, kind: 'item', item: I.makeItem(o), x: p.x + dx, y: p.y + dy, t: 1, taken: false, wait: true, fly: false });
mk({ slot: 'weapon', rarity: 3, noClamp: true }, 1.8, 0); mk({ slot: 'head', rarity: 2, noClamp: true }, 1.8, 1.2); mk({ slot: 'chest', rarity: 1, noClamp: true }, -1.6, 0.5); mk({ slot: 'amulet', rarity: 4, noClamp: true }, -1.6, -0.8);
G.pickups.push({ id: 'ph', kind: 'potion', potion: 'hp', x: p.x + 4, y: p.y + 1.8, t: 0, taken: false }, { id: 'pm', kind: 'potion', potion: 'mp', x: p.x + 4.5, y: p.y + 1.8, t: 0, taken: false });
await sleep(250); await shot('loot73_' + (window.__TAG || 'x'));
return 'ok';
