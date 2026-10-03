// Нагрузка Костяных пустошей: число экземпляров и треугольников по моделям (instanced-батчи), треугольники кадра на глубинах 1–6
const G = window.__G, gm = await import('/js/game/game.js');
for (const D of [1, 3, 5, 6]) {
  await gm.loadZone('wild', { realm: 'bones', depth: D }); await sleep(1200); await step(5); await sleep(400); await step(2); await sleep(300);
  const R3 = window.__R3, by = {};
  R3.scene.traverse(o => { if (o.isInstancedMesh && o.visible) { const n = o.name || (o.geometry.userData && o.geometry.userData.id) || o.userData.id || '?'; const t = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; by[n] = by[n] || [0, 0]; by[n][0] += o.count; by[n][1] += o.count * t; } });
  const top = Object.entries(by).sort((a, b) => b[1][1] - a[1][1]).slice(0, 12).map(([k, v]) => `${k}:${v[0]}×=${Math.round(v[1] / 1000)}k`).join(' ');
  print('D', D, 'tris', R3.renderer.info.render.triangles, 'calls', R3.renderer.info.render.calls, '|', top);
}
