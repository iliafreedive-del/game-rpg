// Ладдер (12 октября): Доска славы стоит в деревне, до неё можно дойти, окно открывается без вылезания за край;
// очередь рекордов шлёт только новое и не чаще раза в 1,2 с. Запуск: node tools/qa/run.mjs tools/qa/scenarios/ladder66.js 390 844
const R = window.__LANG && window.__LANG !== 'ru' ? '/js_' + window.__LANG : '/js';   // Q=lang=en — проверка перевода
const G = window.__G, gm = await import(R + '/game/game.js'), Q = await import(R + '/game/quests.js'), { bus } = await import(R + '/game/ctx.js');
const { platform } = await import(R + '/platform/platform.js'), LD = await import(R + '/game/ladder.js');
const OUT = [], say = (...a) => OUT.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));   // итог — в ответе сценария: журнал консоли обрезается на 40 строках
const tag = window.innerWidth + 'x' + window.innerHeight;
const P = G.profile; P.tutorial.prologue = true; P.story.flags.bossKilled = true;
while (Q.current() && Q.current().id === 'talk_elder') P.story.stage++;
await gm.loadZone('town', { from: 'catacombs' }); await sleep(1500);
const it = G.zone.inter.find(i => i.id === 'ladder'); if (!it) return 'FAIL: нет Доски славы';
say('board at', it.x.toFixed(1), it.y.toFixed(1), 'r', it.r);
// дойти: свободная клетка в радиусе взаимодействия, связная со стартом (как town_reach)
const m = G.zone.map; let near = m.free(it.x - 1.4, it.y - 1.4, 0.42) ? [it.x - 1.4, it.y - 1.4] : null; for (let a = 0; a < 16 && !near; a++) { const x = it.x + Math.cos(a / 16 * 6.283) * 1.4, y = it.y + Math.sin(a / 16 * 6.283) * 1.4; if (m.free(x, y, 0.42)) near = [x, y]; }
say('free spot near board', !!near);
G.player.x = near[0]; G.player.y = near[1]; await step(20); await sleep(1200);
await shot('ladder66_village_' + tag);
// окно без платформы (демо): свои рекорды и заметка
P.depths = P.depths || { best: 0, stars: {} }; P.depths.best = 14; P.surv = P.surv || { best: 0, ach: {}, runs: 0 }; P.surv.best = 725.4; P.circleBest = 3;
gm.interact(it); await sleep(300);
const fit = () => { const md = document.querySelector('.modal'); if (!md) return 'нет окна'; const r = md.getBoundingClientRect(), bad = [];
  if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) bad.push('окно за краем ' + JSON.stringify([r.left, r.top, r.right, r.bottom].map(Math.round)));
  if (md.querySelector('.mb').scrollWidth > md.querySelector('.mb').clientWidth + 1) bad.push('прокрутка вбок');
  for (const t of md.querySelectorAll('.q-tab, .lad-mine, .lad-row')) { const rg = document.createRange(); rg.selectNodeContents(t); const a = rg.getBoundingClientRect(), c = t.getBoundingClientRect(); if (a.left < c.left - 1 || a.right > c.right + 1) bad.push('текст шире: ' + t.textContent); }   // scrollWidth врёт из-за ::after (зона нажатия)
  return bad.length ? bad.join('; ') : 'ok'; };
say('title', document.querySelector('.modal h2') && document.querySelector('.modal h2').textContent, 'demo note', !!document.querySelector('.lad-note'), 'fit', fit());
const tabs = [...document.querySelectorAll('.lad-tabs .q-tab')]; say('tabs', tabs.map(t => t.textContent).join(' | '));
for (let i = 0; i < tabs.length; i++) { document.querySelectorAll('.lad-tabs .q-tab')[i].click(); await sleep(80); say('tab', i, document.querySelector('.lad-mine b').textContent, fit()); }
document.querySelectorAll('.lad-tabs .q-tab')[0].click(); await sleep(100);
await shot('ladder66_demo_' + tag);
window.__G && bus.emit('closeModal');
// как в Яндекс Играх: подменяем провайдера — таблица, своя строка подсвечена; очередь отправки
const p = platform.p, saved = { name: p.name, get: p.getLeaderboard, set: p.setLeaderboardScore }; const calls = [];
p.name = 'yandex';
p.getLeaderboard = async name => { calls.push(['get', name]); await new Promise(r => setTimeout(r, 150)); return [['Ярослава', 41], ['DarkLord_1987_очень_длинное_имя', 33], ['Миша', 27], ['Олег', 20], ['Anna', 18], ['Илья', 14, 1], ['Kai', 13]].map(([n, s, me], i) => ({ rank: i < 5 ? i + 1 : i + 120, name: n, score: name === 'harvestBest' ? s * 60 : name === 'weeklyDepths' ? s * 9000 : s, me: !!me })); };
p.setLeaderboardScore = async (name, score) => { calls.push(['set', name, score, Math.round(performance.now())]); return true; };
try { localStorage.removeItem('da_ladder_sent'); } catch { }
gm.interact(it); await sleep(400);
say('rows', document.querySelectorAll('.lad-row').length, 'me', !!document.querySelector('.lad-row.me'), 'fit', fit());
say('modal before shot', !!document.querySelector('.modal')); await shot('ladder66_yandex_' + tag); say('modal after shot', !!document.querySelector('.modal'));
document.querySelectorAll('.lad-tabs .q-tab')[1].click(); await sleep(400); say('harvest row1', document.querySelector('.lad-row b') && document.querySelector('.lad-row b').textContent, fit());
document.querySelectorAll('.lad-tabs .q-tab')[0].click(); await sleep(50); document.querySelectorAll('.lad-tabs .q-tab')[1].click(); await sleep(50);
say('gets (кэш: depths и harvest по одному разу)', calls.filter(c => c[0] === 'get').map(c => c[1]).join(','));
bus.emit('closeModal');
// отправка: уровень, затем тот же уровень ещё раз (не слать), рекорд Жатвы
const L0 = P.level; bus.emit('levelUp', L0); bus.emit('survEnd', { record: true, t: 725, kills: 0, lvl: 1, gold: 0, shards: 0, newAch: [] });   // окно итога Жатвы тоже откроется — закрываем ниже bus.emit('levelUp', L0);
await sleep(3000); bus.emit('closeModal');
bus.emit('levelUp', L0); await sleep(1500);   // уже отправлено — повтора нет
const sets = calls.filter(c => c[0] === 'set'); say('sets', JSON.stringify(sets.map(c => c.slice(1))));
const gaps = sets.slice(1).map((c, i) => c[3] - sets[i][3]); say('min gap ms', gaps.length ? Math.min(...gaps) : '-', 'sets', sets.length);
Object.assign(p, { name: saved.name, getLeaderboard: saved.get, setLeaderboardScore: saved.set });
return OUT.join('\n') + '\ndone ' + tag;
