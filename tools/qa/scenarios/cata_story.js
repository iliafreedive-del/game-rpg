// П30 + правки 2: сюжет обучения через сгенерированные катакомбы (запуск с TUT=1): вход → 20 скелетов → ключ (без стрелки) → дверь →
// Хранитель → амулет → врата → печать → Палач → портал домой. На каждом шаге: задание, цель стрелки (G.guide), строка трекера, подсказка обучения.
const G = window.__G, P = G.profile, gm = await import('/js/game/game.js'), C = await import('/js/game/combat.js'), Q = await import('/js/game/quests.js'), CH = await import('/js/game/character.js');
const { STORY } = await import('/js/data/quests.js'), SK = await import('/js/data/skills.js');
const close = () => { document.querySelectorAll('.modal-bg button').forEach(b => { if (/Понятно|Закрыть|Ясно|Вперёд|Забрать|Продолжить|Отлично|Ок/.test(b.textContent)) b.click(); }); document.querySelectorAll('.modal-bg').forEach(x => x.remove()); G.modalOpen = false; G.paused = false; G.cinema = null; };
const go = async (it, to) => { gm.interact(it); for (let i = 0; i < 100 && !(G.zoneId === to && G.zoneReady); i++) { await sleep(100); close(); } await sleep(500); close(); for (let i = 0; i < 6; i++) { await step(1); await sleep(30); } close(); };
const jump = id => { const s = P.story, i = STORY.findIndex(q => q.id === id); s.done = STORY.slice(0, i).map(q => q.id); s.stage = i; s.cur = id; delete s.ready; };
const H = await import('/js/ui/hud.js'); const tick = async n => { for (let i = 0; i < Math.max(n, 12); i++) { await step(1); H.updateHUD(1 / 30); await sleep(20); } close(); };
const desc = t => !t ? '—' : (t.id || t.story || t.type) + (G.zone.roomAt ? '@' + (G.zone.roomAt(t.x, t.y) || '?') : '');
const st = label => print(label.padEnd(16), 'q=' + ((Q.current() || {}).id) + (Q.isReady() ? '(ready)' : ''), 'zone=' + G.zoneId + (G.zone.json.gen ? '/gen' : ''), 'arrow→', desc(G.guide), '| трекер:', (document.querySelector('#tracker .d') || {}).textContent?.slice(0, 80), '| подсказка:', (document.querySelector('.hint-line') || {}).textContent || '');
P.tutorial.prologue = true; P.level = 4; CH.grantSkill(SK.classSkillOrder(P.cls)[0]); jump('enter');
await gm.loadZone('town', {}); await sleep(800); close(); await tick(4); st('town');
await go(G.zone.inter.find(i => i.id === 'portal_town'), 'catacombs'); await tick(10); st('enter→kill20');
const keyS = G.zone.inter.find(i => i.loot === 'key'), L1 = G.zone.json.rows.join('');
for (const e of G.enemies.filter(e => e.D.skeleton && !e.story).slice(0, 20)) { G.player.x = e.x + 1; G.player.y = e.y; C.killEnemy(e, {}); await tick(1); }
await tick(6); st('20 skeletons');
await go(G.zone.inter.find(i => i.id === 'portal_dungeon'), 'town'); Q.talked('elder'); await tick(6); close(); st('kill20 сдано');
await go(G.zone.inter.find(i => i.id === 'portal_town'), 'catacombs'); await tick(30); st('medallion: ключ');
print('  layout changed', G.zone.json.rows.join('') !== L1, '| arrow on key?', G.guide && G.guide.loot === 'key', '| key light?', !!G.zone.inter.find(i => i.loot === 'key').light, '| sarcs', G.zone.inter.filter(i => i.type === 'sarc').length, '| key room', G.zone.roomAt(...(k => [k.x, k.y])(G.zone.inter.find(i => i.loot === 'key'))));
G.paused = true; await sleep(500); await shot('cata_story_key'); G.paused = false;
// открыть несколько саркофагов без ключа — награда
const g0 = G.pickups.length; for (const s of G.zone.inter.filter(i => i.type === 'sarc' && i.loot !== 'key').slice(0, 3)) { G.player.x = s.x + 1.2; G.player.y = s.y; gm.interact(s); } print('  3 sarcs → pickups', G.pickups.length - g0, G.pickups.slice(g0).map(p => p.kind).join(','));
for (const e of G.enemies) if (!e.story) e.dead = true;   // не мешают дальше
const ks = G.zone.inter.find(i => i.loot === 'key'); G.player.x = ks.x + 1.2; G.player.y = ks.y; await tick(3); gm.interact(ks); await tick(3); st('ключ взят');
const door = G.zone.inter.find(i => i.type === 'door'); G.player.x = door.x - 1.5; G.player.y = door.y; gm.interact(door); await tick(3); st('дверь открыта');
const el = G.enemies.find(e => e.story === 'elite'); G.player.x = el.x - 1.5; G.player.y = el.y; C.killEnemy(el, {}); await tick(4); st('Хранитель убит');
const md = G.zone.inter.find(i => i.id === 'medallion'); G.player.x = md.x; G.player.y = md.y + 1.2; gm.interact(md); await tick(3); st('амулет взят');
await go(G.zone.inter.find(i => i.id === 'portal_dungeon'), 'town'); Q.talked('elder'); await tick(6); close(); st('амулет сдан');
jump('reach_gate'); P.level = 6;
await go(G.zone.inter.find(i => i.id === 'portal_town'), 'catacombs'); await tick(8); st('reach_gate');
const gt = G.zone.inter.find(i => i.type === 'gate'); G.player.x = gt.x - 2; G.player.y = gt.y; [G.player.x, G.player.y] = G.zone.map.nearestFree(G.player.x, G.player.y, 0.45); await tick(4); Q.check(); await tick(2); st('у врат (6 ур.)');
gm.interact(gt); await tick(2); print('  печать на 6 ур. открылась?', gt.done);
P.level = 7; gm.interact(gt); await tick(6); st('печать сломана');
const bo = G.enemies.find(e => e.story === 'boss'); G.player.x = bo.x - 2; G.player.y = bo.y; bo.aggro = true; await tick(4); print('  арена запечатана', !!gt.sealed);
G.paused = true; await sleep(400); await shot('cata_story_boss'); G.paused = false;
C.killEnemy(bo, {}); await tick(90); st('Палач убит');
const pr = G.zone.inter.find(i => i.id === 'portal_return'); print('  портал домой виден', !pr.hidden, 'стрелка на него', G.guide === pr, 'двери арены открыты', !gt.sealed);
await go(pr, 'town'); await tick(10); st('вернулся');
