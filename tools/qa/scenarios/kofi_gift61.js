// Правки к сборке 60: «Навыки» у Элвина не мигают без выполненных требований; подарок Кофи — только на шаге старосты, крупная кнопка,
// поздравление на весь экран; питомец со светящимся силуэтом. node tools/qa/run.mjs tools/qa/scenarios/kofi_gift61.js 844 390
const G = window.__G, P = G.profile, gm = await import('/js/game/game.js'), { bus } = await import('/js/game/ctx.js');
const Q = await import('/js/game/quests.js'), { STORY } = await import('/js/data/quests.js'), CH = await import('/js/game/character.js');
P.tutorial.prologue = true; await gm.loadZone('town', {}); await sleep(2000);
const clean = () => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false; };
clean();
const go = id => { P.story.stage = STORY.findIndex(q => q.id === id); P.story.cur = id; };
// 1) Элвин: первое умение есть, очко навыка есть, но следующий узел требует уровня
go('hw_elvin'); const first = (await import('/js/data/skills.js')).classSkillOrder(P.cls)[0];
P.skills = { [first]: 1 }; P.skillPts = 1; P.gold = 0; P.level = 1;
const tr = G.npcs.find(n => n.id === 'trainer'); G.player.x = tr.x + 1; G.player.y = tr.y + 1;
bus.emit('panel', tr); await sleep(400);
print('Элвин, ур.1, золота 0: canLearnNow', CH.canLearnNow(), 'вкладка hot', document.getElementById('tBtnSkills').classList.contains('hot'));
await shot('k61_elvin_nohot');
P.gold = 500; P.level = 2; bus.emit('panel', null); bus.emit('panel', tr); await sleep(400);
print('Элвин, ур.2, 500 зол.: canLearnNow', CH.canLearnNow(), 'вкладка hot', document.getElementById('tBtnSkills').classList.contains('hot'));
bus.emit('panel', null); clean();
// 2) Кофи до шага старосты — подарка нет
go('surv_elvin'); const kv = G.npcs.find(n => n.id === 'caravan'); G.player.x = kv.x + 1.2; G.player.y = kv.y + 1.2;
bus.emit('panel', kv); await sleep(400);
print('Кофи до шага: кнопка подарка', !!document.querySelector('.pet-gift'), 'met', !!(P.pets && P.pets.met));
await shot('k61_kofi_locked');
bus.emit('panel', null);
// 3) Шаг «Заглянуть к Кофи» — крупная кнопка, поздравление
go('meet_kofi'); bus.emit('panel', kv); await sleep(400);
const g = document.querySelector('.pet-gift'); print('Кофи на шаге: кнопка подарка', !!g, g && g.textContent);
await shot('k61_kofi_button');
g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await sleep(2600);
print('после нажатия: met', P.pets.met, 'питомец', G.pet && G.pet.id, 'окно на весь экран', !!document.querySelector('.modal.pet-full'));
await shot('k61_pet_full');
Q.check(); print('шаг теперь', (Q.current() || {}).id);
clean(); await sleep(300);
// 4) Светящийся силуэт
G.zoomMul = 3.2; G.player.x = kv.x + 4; G.player.y = kv.y + 4; G.pet.x = G.player.x + 1; G.pet.y = G.player.y + 0.6; await sleep(2500);
await shot('k61_pet_glow');
return 'ok';
