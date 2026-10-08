// Сборка 54: после старосты — первый урок (55 зол.), остаётся ровно 30 на зелье, зелье — до Летописи. Запуск: node tools/qa/run.mjs tools/qa/scenarios/quest54.js
const G = window.__G, P = G.profile, Q = await import('/js/game/quests.js'), EC = await import('/js/game/economy.js'), CH = await import('/js/game/character.js');
const W = await import('/js/ui/windows.js'), gm = await import('/js/game/game.js');
P.tutorial.prologue = true; await gm.loadZone('town', {}); await sleep(1500);
const st = () => (Q.current() || {}).id;
print('start', st(), 'gold', P.gold);
Q.talked('elder'); print('после старосты', st(), 'gold', P.gold);
print('мана-зелье до урока (должно быть нельзя):', EC.buyConsumable('mp'), 'gold', P.gold);
// первый урок — окно Элвина
const m = await import('/js/game/ctx.js'); m.bus.emit('panel', { id: 'trainer' }); await sleep(300);
document.querySelectorAll('.modal-bg').forEach(x => x.remove());
const id = Object.keys((await import('/js/data/skills.js')).SKILLS).find(k => true);
const lessonBtnText = (() => { W; return null; })();
const cost = (await import('/js/game/progress.js')).firstLessonCost(); print('цена урока', cost);
P.gold -= cost; P.tutorial.trainerGift = 'x'; const first = (await import('/js/data/skills.js')).classSkillOrder(P.cls)[0]; CH.grantSkill(first); Q.check();
document.querySelectorAll('.modal-bg').forEach(x => x.remove());
print('после урока', st(), 'gold', P.gold);
print('мана-зелье (нельзя):', EC.buyConsumable('mp'), 'gold', P.gold, 'цена зелья здоровья', EC.potionPrice('hp'));
print('зелье здоровья:', EC.buyConsumable('hp'), 'gold', P.gold); Q.check(); print('шаг', st());
