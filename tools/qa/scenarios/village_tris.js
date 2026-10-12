// Деревня: кто даёт треугольники, вызовы отрисовки и тени (12 октября, лаги). Запуск: node tools/qa/run.mjs tools/qa/scenarios/village_tris.js 1298 742
const G = window.__G, gm = await import('/js/game/game.js'); const R3 = window.__R3, rm = await import('/js/render3d/renderer3d.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
G.profile.settings.quality = 'high';
await gm.loadZone('town'); for (let k = 0; k < 100 && !G.zoneReady; k++) await sleep(200); await sleep(4000);
for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
rm.render(); rm.render();
const I = R3.renderer.info.render; print('town calls', I.calls, 'tris', Math.round(I.triangles / 1000) + 'k');
const tri = o => (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
const by = {}; R3.scene.traverseVisible(o => { if (!o.isMesh) return; let r = o; while (r.parent && r.parent !== R3.scene) r = r.parent; const k = (r.name || r.type) + '/' + (o.name || o.type) + (o.isInstancedMesh ? '[I' + o.count + ']' : '') + (o.castShadow ? ' S' : '') + (o.userData.outline || o.name === 'outline' ? ' OL' : '');
  const b = by[k] || (by[k] = { n: 0, t: 0 }); b.n++; b.t += tri(o); });
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].t - a[1].t).slice(0, 25)) print(' ', k, 'meshes', v.n, 'tris', Math.round(v.t / 1000) + 'k');
