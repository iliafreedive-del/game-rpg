// Великан в земле (Старый Лес): найти его на поле, встать рядом, снимки в игровой камере и с отдалением. TAG=depth
const G = window.__G, gm = await import('/js/game/game.js'), D = +(window.__TAG || 1) || 1;
G.profile.level = 30;
let o = null;
for (let k = 0; k < 6 && !o; k++) { await gm.loadZone('wild', { realm: 'forest', depth: D }); await sleep(1200); o = G.zone.json.objects.find(q => q.t === 'giant_buried'); }
print('giant', o ? [o.x.toFixed(1), o.y.toFixed(1), o.rot] : 'none');
const close = () => document.querySelectorAll('.modal-bg button, .wild-hint button, button').forEach(b => { if (/Понятно|Закрыть|Ясно/.test(b.textContent)) b.click(); });
close(); await step(10); close();
G.enemies.forEach(e => { e.hp = 1e9; e.aggro = false; e.x = -99; e.y = -99; });
if (o) {
  const R3 = window.__R3;
  [G.player.x, G.player.y] = G.zone.map.nearestFree(o.x + 1, o.y + 5.5, 0.5);
  await step(30); await sleep(900); close(); await step(2); await shot('giant_near'); print('tris', R3.renderer.info.render.triangles, 'calls', R3.renderer.info.render.calls);
  G.zoomMul = 0.55; await step(10); await sleep(800); await step(2); await shot('giant_wide');
  G.zoomMul = 1; [G.player.x, G.player.y] = G.zone.map.nearestFree(o.x - 4, o.y + 4, 0.5); await step(30); await sleep(800); await step(2); await shot('giant_skull');
}
