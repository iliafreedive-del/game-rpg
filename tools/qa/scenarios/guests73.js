// Сборка 73: гости других краёв в Жатве — каждые 5 минут к рою присоединяется случайный край. Запуск:
// REALM=forest node tools/qa/run.mjs tools/qa/scenarios/guests73.js 844 390 — снимок /tmp/claude-0/shots/guests73_<REALM>.jpg
const G = window.__G; const gm = await import('/js/game/game.js'); const P = G.profile; P.level = 20; P.tutorial.prologue = true; P.survIntro = true;
P.story = P.story || {}; P.story.flags = P.story.flags || {}; P.story.flags.bossKilled = true;
const closeAll = () => { for (let k = 0; k < 6; k++) { const b = document.querySelector('.modal .btn.gold, .modal-bg .btn.gold'); if (b) b.click(); } };
await gm.loadZone('survival', {}); for (let k = 0; k < 150 && !G.zoneReady; k++) await sleep(200); await sleep(3000); closeAll(); document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
const S = G.surv, realm = window.__TAG; S.w.blades = 2; S.w.nova = 1;
const keep = () => { G.player.inv = 1e9; G.player.hp = G.stats.maxHP; S.xp = 0; S.pending = 0; G.modalOpen = false; G.paused = false; document.querySelectorAll('.modal-bg').forEach(m => m.remove()); };
const calls = () => { const r = window.__R3 && window.__R3.renderer; return r ? r.info.render.calls : 0; };
// перемотка к 4:50: край выбирается за 25 с до прихода
S.t = 278; S.eliteT = 999; S.bossT = 900; S.invAt = 300;
for (let i = 0; i < 30; i++) { keep(); window.advanceTime(33, { render: false }); }
if (realm && realm !== 'x') S.invNext = realm;
print('realm', S.invNext);
// ждём загрузку моделей края
for (let k = 0; k < 60; k++) { const ok = ['w_wolf','f_wolf','b_hyena','t_hound','bone_wolf'].length; const t = { forest: 'w_bear', fjord: 'f_jotun', bones: 'b_scorpid', temple: 't_golem', crypt: 'mb_grave_weeper' }[S.invNext]; if (!G.mobReady || G.mobReady(t)) break; await sleep(300); }
for (let i = 0; i < 2000 && S.t < 335; i++) { keep(); window.advanceTime(33, { render: i % 30 === 29 }); }
print('dbg', S.over, G.paused, G.modalOpen, S.asking, S.invNext, S.invAt, S.bossT, document.querySelector('.modal-bg') && document.querySelector('.modal-bg').innerText.slice(0,80));
const cnt = {}; S.swarm.filter(e => e.inv).forEach(e => cnt[e.type] = (cnt[e.type] || 0) + 1); print('count', cnt);
print('t', Math.round(S.t), 'inv', S.inv, 'swarm', S.swarm.length, 'guests', S.swarm.filter(e => e.inv).length, 'types', [...new Set(S.swarm.filter(e => e.inv).map(e => e.type))]);
// гостей — поближе к герою, чтобы были видны их приёмы
const gs = S.swarm.filter(e => e.inv); gs.forEach((e, i) => { const a = i / gs.length * 6.283; e.x = G.player.x + Math.cos(a) * (4 + (i % 4)); e.y = G.player.y + Math.sin(a) * (4 + (i % 4)); e.icd = i * 0.15; });
const errs = []; let maxCalls = 0;
for (let i = 0; i < 40; i++) { keep(); window.advanceTime(33); maxCalls = Math.max(maxCalls, calls()); }
await sleep(1500); keep(); window.advanceTime(16); await sleep(300);
print('calls', calls(), 'max', maxCalls, 'guests', S.swarm.filter(e => e.inv).length, 'effects', G.effects.length);
await shot('guests73_' + window.__TAG);
// второй кадр — позже
for (let i = 0; i < 25; i++) { keep(); window.advanceTime(33); } await sleep(800);
await shot('guests73_' + window.__TAG + '_2');
