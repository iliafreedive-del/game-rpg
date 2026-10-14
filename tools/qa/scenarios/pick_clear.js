// правки 72: сундук, тайник, схрон не стоит внутри скалы, дерева, корабля — по настоящим размерам 3D-моделей. node tools/qa/run.mjs tools/qa/scenarios/pick_clear.js (TAG=зоны через запятую, __REP — раскладок на зону)
const G = window.__G, gm = await import('/js/game/game.js'); G.profile.level = 60; G.profile.tutorial.prologue = true;
const THREE = await import('/js/vendor/three.module.min.js'); const { PROPS } = await import('/js/render3d/registry.js');
const close = () => document.querySelectorAll('.modal-bg button, button').forEach(b => { if (/Понятно|Закрыть|Ясно/.test(b.textContent)) b.click(); });
const ALL = ['town','wild:forest:1','wild:forest:3','wild:forest:6','wild:fjord:1','wild:fjord:2','wild:fjord:5','wild:fjord:8','wild:fjord:12','wild:bones:1','wild:bones:4','wild:bones:6','wild:temple:1','wild:temple:6','depths:1','depths:5','depths:8','depths:10','catacombs'];
const list = window.__TAG && window.__TAG !== 'x' ? window.__TAG.split(',') : ALL; const REP = +(window.__REP || 2); let bad = 0; const RC = new Map();
const rad = (kit, id) => { if (RC.has(id)) return RC.get(id); let r = 0; try { const def = PROPS[id]; if (def) { const root = def.build(kit, {}).root; root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(root); r = Math.min(b.max.x - b.min.x, b.max.z - b.min.z) / 2; } } catch (e) { r = 0; } RC.set(id, r); return r; };
const SKIP = /^(grass|flower|pebble|decal|rug|moss|leaf|leaves|bush|fern|puddle|tuft|reeds|mushroom|candles|bones|skulls|torch|banner|shadow)/;
for (const z of list) for (let rep = 0; rep < REP; rep++) {
  const [id, a, b] = z.split(':'); const how = id === 'wild' ? { realm: a, depth: +b } : id === 'depths' ? { floor: +a } : {};
  await gm.loadZone(id, how); await sleep(400); close();
  await sleep(600); const W = window.__R3.world; if (!W) { print(z, 'no world'); continue; } const P = W.props, kit = P.kit, picks = G.zone.inter.filter(i => ['chest', 'stash', 'cache', 'sarc'].includes(i.type));
  const fails = [];
  for (const [pid, L] of P._lists) { if (SKIP.test(pid)) continue; const r0 = rad(kit, pid); if (r0 < 0.25) continue;
    for (const t of L) { const r = r0 * (t.s || 1) * 0.8; for (const c of picks) { const d = Math.hypot(t.x - c.x, t.y - c.y); if (d > 0.05 && d < r + 0.35) fails.push(`${c.type}:${c.id}@${c.x.toFixed(1)},${c.y.toFixed(1)} в ${pid}(r${r.toFixed(2)}) d${d.toFixed(2)}`); } } }
  bad += fails.length; print(z + "#" + rep, "picks", picks.length, "hit", P.pickHit, fails.length ? 'FAIL ' + fails.join(' | ') : 'ok');
}
print('TOTAL', bad);
