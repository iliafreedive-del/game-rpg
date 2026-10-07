// Тест скорости (сборка 47): Настройки → «Тест скорости». 8 с при текущем зуме и 8 с при максимальном отдалении;
// итог — средний и худший FPS, число отрисовок и треугольников. Скриншот итога — чтобы чинить тормоза по цифрам с устройства.
import { G, bus } from '../game/ctx.js';
import { zoomNow, setZoom, ZOOM } from '../core/camzoom.js';

const frames = ms => new Promise(res => {
  const dt = []; let last = performance.now(); const end = last + ms;
  const f = t => { dt.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else res(dt.slice(2)); };
  requestAnimationFrame(f);
});
const sum = dt => {
  if (!dt.length) return { avg: 0, low: 0 };
  const s = [...dt].sort((a, b) => b - a), worst = s.slice(0, Math.max(1, Math.round(s.length * 0.05)));
  return { avg: Math.round(1000 * dt.length / dt.reduce((a, b) => a + b, 0)), low: Math.round(1000 / (worst.reduce((a, b) => a + b, 0) / worst.length)) };
};
const info = () => { const r = window.__R3 && window.__R3.renderer; return r ? { calls: r.info.render.calls, tris: Math.round(r.info.render.triangles / 1000) } : null; };

let running = false;
export async function runFpsTest(show) {
  if (running || !G.player) return; running = true;
  const z0 = zoomNow(), where = (G.zone && G.zone.json && G.zone.json.name) || G.zoneId;
  bus.emit('toast', { text: 'Тест скорости: 16 секунд', sub: 'Не трогайте экран', kind: 'info' });
  setZoom(1); await frames(600); const a = sum(await frames(8000)), ia = info();
  setZoom(ZOOM.max); await frames(600); const b = sum(await frames(8000)), ib = info();
  setZoom(z0); running = false;
  const q = (G.profile.settings && G.profile.settings.quality) || 'auto';
  const row = (n, s, i) => `<tr><td>${n}</td><td><b>${s.avg}</b></td><td>${s.low}</td><td>${i ? i.calls : '—'}</td><td>${i ? i.tris + ' тыс.' : '—'}</td></tr>`;
  show(`<p>Место: <b>${where}</b> · качество: ${q} · экран ${innerWidth}×${innerHeight} ×${devicePixelRatio}</p>
<table class="fps-t"><tr><th>Камера</th><th>FPS</th><th>худший</th><th>отрисовок</th><th>треугольн.</th></tr>${row('обычная', a, ia)}${row('макс. отдаление', b, ib)}</table>
<p class="muted"><small>Сделайте скриншот этого окна и пришлите — по нему видно, что тормозит.</small></p>`);
}
