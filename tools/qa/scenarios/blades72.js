// Сборка 72: «Танцующие клинки» в Жатве — снимок клинков вокруг героя (до/после). Запуск: TAG=имя node tools/qa/run.mjs tools/qa/scenarios/blades72.js 844 390
// EVO=1 — «Вихрь стали». Снимок: /tmp/claude-0/shots/blades72_<TAG>.jpg
const G = window.__G; const gm = await import('/js/game/game.js'); const P = G.profile; P.level = 5; P.tutorial.prologue = true; P.survIntro = true;
const closeAll = () => { for (let k = 0; k < 6; k++) { const b = document.querySelector('.modal .btn.gold, .modal-bg .btn.gold'); if (b) b.click(); } };
await gm.loadZone('survival', {}); for (let k = 0; k < 150 && !G.zoneReady; k++) await sleep(200); await sleep(4000); closeAll(); G.surv.intro = false; document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
const S = G.surv, evo = /evo/.test(window.__TAG); for (const k of Object.keys(S.w)) S.w[k] = 0; S.w.blades = evo ? 5 : 3; if (evo) S.evo.evo_blades = 1;
const keep = () => { G.player.inv = 1e9; G.player.hp = G.stats.maxHP; S.xp = 0; S.pending = 0; S.swarm.length = 0; };
for (let i = 0; i < 40; i++) { keep(); window.advanceTime(33); if (i % 10 === 0) closeAll(); }
for (let k = 0; k < 40 && !(await import('/js/render/fxsheets.js')).fxReady(evo ? 'sv_evo_blades' : 'sv_orbit_blade'); k++) await sleep(300);
for (let i = 0; i < 6; i++) { keep(); window.advanceTime(33); } await sleep(1500);
keep(); await sleep(300); print('blades', S.bladePts && S.bladePts.length, 'sprites', window.__R3.scene.children.filter(o => o.isSprite && o.visible).length);
await shot('blades72_' + window.__TAG);
