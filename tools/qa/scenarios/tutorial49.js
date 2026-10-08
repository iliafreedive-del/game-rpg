// Сборка 49: обучение без окна-вопроса, скелет-учитель для рывка, «Справка», первое древо, режим съёмки, показ портала при открытии.
// Запуск: TUT=1 node tools/qa/run.mjs tools/qa/scenarios/tutorial49.js
const G = window.__G; const gm = await import('/js/game/game.js'); const C = await import('/js/game/combat.js'); const W = await import('/js/ui/windows.js'); const H = await import('/js/ui/hud.js');
const tick = async (n, ms = 10) => { for (let i = 0; i < n; i++) { await step(1); H.updateHUD(1 / 30); await sleep(ms); } };   // в headless rAF стоит — HUD обновляем сами
const T = G.profile.tutorial;
print('старт', G.zoneId, 'floor', G.run && G.run.floor, 'on', T.on, 'вопрос', !!document.querySelector('.tut-ask'), 'кнопка рывка', getComputedStyle(document.getElementById('btnDodge')).display);
await sleep(1500); print('подсказка', document.querySelector('.hint-line')?.textContent);
const pl = G.player; pl.inv = 9;
const e0 = G.enemies.find(e => !e.dead); C.damageEnemy(e0, 99999); for (let i = 0; i < 30; i++) { await step(1); await sleep(10); }
const tch = G.enemies.find(e => e.teacher && !e.dead); print('учитель', !!tch, 'шаг', G.tut && G.tut.step);
for (const e of G.enemies) if (!e.dead && e !== tch) { e.x = 23; e.y = 11; e.aggro = false; e.frozen = 99; }
pl.x = tch.x - 1; pl.y = tch.y; pl.inv = 0; const hp0 = pl.hp; let tele = null;
for (let i = 0; i < 200 && !T.un.dodge; i++) { tch.aggro = true; await step(1); H.updateHUD(1 / 30); if (tch.teleg) tele = { ...tch.teleg }; await sleep(10); }
for (let i = 0; i < 10; i++) { H.updateHUD(1 / 30); await sleep(60); }
print('замах учителя', tele && tele.mult, 'рывок открыт', !!T.un.dodge, 'подсказка', document.querySelector('.hint-line')?.textContent);
await shot('t49_teacher');
await tick(60, 5);
print('здоровье', Math.round(hp0), '→', Math.round(pl.hp));
for (const e of G.enemies) if (!e.dead) C.damageEnemy(e, 99999);
for (let i = 0; i < 30; i++) { await step(1); await sleep(10); }
gm.finishFloor(); await sleep(2500);
print('деревня', G.zoneId, 'видели порталы', JSON.stringify(T.pseen), 'метки', JSON.stringify(T.ms));
W.openWindow('help'); await sleep(400); await shot('t49_help'); print('справка', document.querySelector('.modal')?.innerText.replace(/\n+/g, ' | ').slice(0, 500));
document.querySelector('.modal-bg')?.click(); W.openWindow('menu'); await sleep(200); print('меню', [...document.querySelectorAll('.menu-tile b')].map(b => b.textContent).join(', ')); 
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' })); await sleep(200);
G.profile.skillPts = 1; W.openWindow('skills'); await sleep(500); await shot('t49_skills'); print('первое древо', !!document.querySelector('.tal-first'), 'видно узлов', [...document.querySelectorAll('.tal')].filter(n => getComputedStyle(n).visibility !== 'hidden').length, 'из', document.querySelectorAll('.tal').length);
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' })); await sleep(200);
// портал открылся: уровень 3 → Цитадель (reqLevel 3)
G.profile.level = 3; await gm.loadZone('town', { from: 'catacombs' }); await sleep(1500); print('кинокадры', G.cinema ? G.cinema.shots.map(s => s.text).join(' / ') : 'нет', 'видели', JSON.stringify(T.pseen));
await sleep(5000);
W.photoMode(true); await sleep(300); await shot('t49_photo'); print('съёмка', document.body.classList.contains('photo'), 'кнопка', !!document.querySelector('.photo-exit')); W.photoMode(false);
