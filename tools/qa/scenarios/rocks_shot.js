// Камни леса и Фьордов (13 октября): снимки у скопления камней и у кромки с утёсами. TAG=forest|fjord, DEPTH=1
// node tools/qa/run.mjs tools/qa/scenarios/rocks_shot.js → /tmp/claude-0/shots/rocks_<TAG>_<n>.jpg
const G = window.__G, gm = await import('/js/game/game.js'), R3 = window.__R3, rm = await import('/js/render3d/renderer3d.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !(G.zone.id === 'depths' && G.zoneReady); k++) await sleep(200); await sleep(800); }
G.profile.settings.quality = 'med';
const realm = window.__TAG.split('_')[0], depth = +(window.__TAG.split('_')[1] || 1);
await gm.loadZone('wild', { realm, depth }); for (let k = 0; k < 100 && !G.zoneReady; k++) await sleep(200); await sleep(2500);
for (const b of document.querySelectorAll('button')) if (/Вперёд|Понятно|Закрыть|В путь/.test(b.textContent)) b.click();
const P = G.player, M = G.zone.map; for (const e of G.enemies) { e.x = -99; e.y = -99; }
const rocks = G.zone.statics.filter(d => d.spr === 'rocks');
const score = d => rocks.filter(o => Math.hypot(o.x - d.x, o.y - d.y) < 5).length;
const spots = rocks.slice().sort((a, b) => score(b) - score(a)).filter((d, i, A) => A.slice(0, i).every(o => Math.hypot(o.x - d.x, o.y - d.y) > 8)).slice(0, 2);
// кромка: свободная клетка рядом с 'x' у края карты (утёсы)
let edge = null; for (let y = 3; y < M.h - 3 && !edge; y++) for (let x = 3; x < 8 && !edge; x++) if (M.free(x + 0.5, y + 0.5, 0.3) && M.ch(x - 2, y) === 'x') edge = { x: x + 1.5, y: y + 0.5 };
const pts = [...spots.map(d => ({ x: d.x + 1.2, y: d.y + 1.2 })), edge].filter(Boolean);
let i = 0; for (const s of pts) { let nx = s.x, ny = s.y; for (let k = 0; k < 30 && !M.free(nx, ny, 0.3); k++) { nx += 0.4; ny += 0.2; } P.x = nx; P.y = ny; await step(4); for (let k = 0; k < 3; k++) rm.render(); await sleep(1500); await shot('rocks_' + window.__TAG + '_' + (i++)); }
let rt = 0; R3.scene.traverse(o => { if (o.isInstancedMesh && /rock|crag|stone|stalag/.test(o.name || '')) rt += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * o.count; });
print('rocks', rocks.length, 'rock tris (all instances)', Math.round(rt / 1000) + 'k', 'frame tris', Math.round(R3.renderer.info.render.triangles / 1000) + 'k', 'calls', R3.renderer.info.render.calls);
const cnt = {}; for (const d of G.zone.statics) cnt[d.spr] = (cnt[d.spr] || 0) + 1; print(JSON.stringify(cnt));
