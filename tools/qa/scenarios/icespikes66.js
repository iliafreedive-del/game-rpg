// Лаг, когда моб Фьордов бьёт ледяными шипами (12 октября): сколько заливок текстур (texImage2D, пикселей) и сборок шейдеров
// дают умения мобов-«щиты» (fj_ice_spikes и др.) в кадрах после первого показа. До правки: каждый новый щит заново заливал весь лист.
// Запуск: node tools/qa/run.mjs tools/qa/scenarios/icespikes66.js   (TAG=shot — снимок шипов в /tmp/claude-0/shots/icespikes66.jpg)
const G = window.__G, gm = await import('/js/game/game.js'), C = await import('/js/game/combat.js'); const R3 = window.__R3;
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
await gm.loadZone('wild', { realm: 'fjord', depth: 3 }); for (let k = 0; k < 100 && !G.zoneReady; k++) await sleep(200); await sleep(3000);
for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
G.paused = false; G.enemies.length = 0; const P = G.player;
const gl = R3.renderer.getContext(), N = { up: 0, px: 0, comp: 0, floor: 0 };   // floor — холст эффектов на полу (decals.js), он и должен обновляться, пока эффект живёт
for (const f of ['texImage2D', 'texSubImage2D']) { const o = gl[f].bind(gl); gl[f] = (...a) => { const s = a[a.length - 1]; if (s instanceof HTMLCanvasElement) N.floor++; else if (s && s.width > 64) { N.up++; N.px += s.width * s.height; } return o(...a); }; }
{ const o = gl.compileShader.bind(gl); gl.compileShader = (...a) => { N.comp++; return o(...a); }; }
const IDS = ['fj_ice_spikes', 'fj_icicle_hit', 'fj_glacier_slam', 'fj_frost_roar', 'hit_spark'];
for (let k = 0; k < 40 && !IDS.every(id => C.sheet(id, P.x, P.y + 99)); k++) await sleep(300);   // листы догрузились
G.effects.length = 0;
const wave = () => { for (let i = 0; i < 6; i++) C.sheet(IDS[i % IDS.length], P.x + 1.5 + (i % 3), P.y - 1 + (i >> 1) * 0.7); };
wave(); for (let i = 0; i < 3; i++) window.advanceTime(16); print('первый показ: заливок', N.up, 'пикселей', N.px, 'шейдеров', N.comp, 'щиты в 3D', !!R3.scene.children.find(o => o.isSprite && o.visible));   // первый показ: листы заливаются один раз (это нормально)
let tot = { up: 0, px: 0, comp: 0 };
for (let w = 0; w < 6; w++) {   // шесть волн умений: эффекты меняются местами в пуле щитов
  N.up = N.px = N.comp = N.floor = 0; G.effects.length = 0; wave(); if (w % 2) G.effects.reverse();
  for (let i = 0; i < 8; i++) window.advanceTime(33);
  print('волна', w, 'заливок', N.up, 'пикселей', N.px, 'сборок шейдеров', N.comp, 'холст пола', N.floor); tot.up += N.up; tot.px += N.px; tot.comp += N.comp;
}
print('итого после первого показа: заливок', tot.up, 'Мпикс', (tot.px / 1e6).toFixed(1), 'шейдеров', tot.comp, tot.up === 0 ? 'OK' : 'FAIL: лист заливается снова при каждой смене');
if (window.__TAG === 'shot') { G.effects.length = 0; C.sheet('fj_ice_spikes', P.x + 1.2, P.y - 0.3); window.advanceTime(150); await sleep(1500); await shot('icespikes66'); }
