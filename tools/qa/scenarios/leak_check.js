// С41 (сборка 60): автотест на утечки видеопамяти. Три круга по зонам (деревня → глубины → деревня → лес → деревня → катакомбы)
// плюс волны мобов в глубинах; после разминочного круга число геометрий и текстур (renderer.info.memory) в деревне не должно расти.
// Для каждой зоны печатает вызовы отрисовки и треугольники кадра. Итог — последняя строка: OK или FAIL.
// Запуск: node tools/qa/run.mjs tools/qa/scenarios/leak_check.js
const G = window.__G, gm = await import('/js/game/game.js'), rm = await import('/js/render3d/renderer3d.js'), R3 = window.__R3;
const { Enemy } = await import('/js/game/entities.js');
const OUT = []; const log = (...a) => { const s = a.join(' '); OUT.push(s); print(s); };
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(500); }
const mem = () => ({ ...R3.renderer.info.memory });
const go = async (id, how) => {
  await gm.loadZone(id, how); for (let k = 0; k < 60 && !G.zoneReady; k++) await sleep(200);
  G.paused = false; await step(3); rm.render();   // кадр вручную: в безголовом браузере rAF редкий
  const r = R3.renderer.info.render, m = mem();
  return { id: id + (how ? ' ' + JSON.stringify(how) : ''), calls: r.calls, tris: r.triangles, geo: m.geometries, tex: m.textures };
};
const waves = async () => {   // 3 волны по 10 мобов: появились — исчезли (модели должны браться из пула, не копиться)
  const P = G.player;
  for (let w = 0; w < 3; w++) {
    G.enemies.length = 0;
    for (let i = 0; i < 10; i++) { const e = new Enemy(['skel_warrior', 'ghoul', 'skel_archer'][i % 3], P.x + Math.cos(i) * 3, P.y + Math.sin(i) * 3, 1); e.speed = 0; G.enemies.push(e); }
    rm.render(); G.enemies.length = 0; rm.render();
  }
};
const route = [['town'], ['depths', { floor: 1 }], ['town'], ['wild', { realm: 'forest', depth: 1 }], ['town'], ['catacombs'], ['town']];
const town = [];
for (let cyc = 0; cyc < 3; cyc++) {
  for (const [id, how] of route) {
    const s = await go(id, how);
    if (id === 'depths') await waves();
    if (cyc === 0) log('зона', s.id, 'вызовов', s.calls, 'треугольников', s.tris, 'геометрий', s.geo, 'текстур', s.tex);
  }
  const m = mem(); town.push(m); log('круг', cyc, 'деревня: геометрий', m.geometries, 'текстур', m.textures);
}
// допуск: +4 (кеш предметов деревни может достроиться на втором круге), но не рост от круга к кругу
const dg = town[2].geometries - town[1].geometries, dt = town[2].textures - town[1].textures;
log(dg > 4 || dt > 4 ? `FAIL: память растёт — геометрий ${dg >= 0 ? '+' : ''}${dg}, текстур ${dt >= 0 ? '+' : ''}${dt} за круг` : `OK: память не растёт (геометрий ${dg >= 0 ? '+' : ''}${dg}, текстур ${dt >= 0 ? '+' : ''}${dt} за круг)`);
return OUT.join('\n');
