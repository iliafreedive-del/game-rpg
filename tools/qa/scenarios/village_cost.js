// Что весит в кадре деревни: по очереди прячет части сцены и смотрит, сколько треугольников и отрисовок уходит.
// node tools/qa/run.mjs tools/qa/scenarios/village_cost.js 1280 720   (место героя — /qa_pos.json «деревня», иначе старт)
const G = window.__G, gm = await import('/js/game/game.js'), R3 = window.__R3, rm = await import('/js/render3d/renderer3d.js');
{ const sk = document.querySelector('.cine-skip'); if (sk) sk.click(); for (let k = 0; k < 60 && !G.zoneReady; k++) await sleep(200); }
await gm.loadZone('town', {}); (await import('/js/core/camzoom.js')).setZoom(1.3); for (let k = 0; k < 100 && !G.zoneReady; k++) await sleep(200); await sleep(2500);
try { const s = (await (await fetch('/qa_pos.json')).json())['деревня']; if (s) { G.player.x = s[0]; G.player.y = s[1]; } } catch (e) {}
G.paused = false; await step(40); G.paused = true;
const r = R3.renderer, info = r.info.render, scene = R3.scene || r.scene;
const meas = () => { rm.render(); return [info.calls, info.triangles]; };
meas(); const [c0, t0] = meas();
print('всего: отрисовок', c0, 'треуг.', Math.round(t0 / 1000) + 'k');
r.shadowMap.enabled = false; r.shadowMap.needsUpdate = true; { const [c, t] = meas(); print('без теней: −', c0 - c, 'отрисовок, −', Math.round((t0 - t) / 1000) + 'k'); } r.shadowMap.enabled = true; r.shadowMap.needsUpdate = true;
print('частей сцены', R3.scene.children.length);
// предметы — группами (каждый замер — полный кадр; по одному — слишком долго)
const groups = {};
for (const b of R3.world.props.batches) for (const p of b.parts) { const im = p.im; if (!im.visible || !im.count) continue;
  const n = im.name || '', k = /^fo:|tree|fir|pine|oak|birch|spruce|deadtree/.test(n) ? 'деревья' : /bush|fern|flower|mushroom|pebble|grass|stump|rock/.test(n) ? 'кусты и мелочь' : 'прочее';
  (groups[k] ||= []).push(im); }
for (const [k, list] of Object.entries(groups)) { for (const im of list) im.visible = false; const [c, t] = meas(); for (const im of list) im.visible = true; print('предметы:', k, list.length, 'партий: −' + (c0 - c), 'отр., −' + Math.round((t0 - t) / 1000) + 'k'); }
// окраина по спискам предметов: экземпляров и треугольников (одна копия, без теней) вне клеток карты и в краевых рядах «x»
const M = G.zone.map, out = (x, y) => x < 1 || y < 1 || x >= M.w - 1 || y >= M.h - 1 || M.ch(Math.floor(x), Math.floor(y)) === 'x';
const tri = {}; for (const b of R3.world.props.batches) for (const p of b.parts) { const g = p.im.geometry; tri[p.im.name] = (tri[p.im.name] || 0) + (g.index ? g.index.count : g.attributes.position.count) / 3; }
const S = { in: [0, 0], out: [0, 0] }, byId = {};
for (const [id, l] of R3.world.props._lists) for (const it of l) { const w = out(it.x, it.y) ? 'out' : 'in'; S[w][0]++; S[w][1] += tri[id] || 0; if (w === 'out') { byId[id] = byId[id] || [0, 0]; byId[id][0]++; byId[id][1] += tri[id] || 0; } }
print('внутри: предметов', S.in[0], 'треуг.', Math.round(S.in[1] / 1000) + 'k; окраина: предметов', S.out[0], 'треуг.', Math.round(S.out[1] / 1000) + 'k');
print('окраина по видам:', Object.entries(byId).sort((a, b) => b[1][1] - a[1][1]).slice(0, 14).map(([k, v]) => k + ' ' + v[0] + '/' + Math.round(v[1] / 1000) + 'k').join(', '));
