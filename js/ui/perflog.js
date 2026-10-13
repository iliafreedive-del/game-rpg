// Журнал скорости (сборка 68): всё время игры раз в 2 с пишет строку — FPS, худший кадр, рывки, отрисовки, шейдеры, память —
// и отмечает события (смена зоны, «Авто» снизил качество, новые шейдеры, вкладка скрыта, размер окна). Настройки → «Скопировать журнал
// скорости»: текст уходит в буфер обмена, его вставляют в чат — по нему видно, когда и после чего упал FPS. Последние ~13 минут
import { G, bus } from '../game/ctx.js';

const MAX = 400, lines = [], t0 = performance.now();
let dts = [], last = 0, lastProg = 0, started = false;
const clock = () => { const s = Math.round((performance.now() - t0) / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const push = s => { lines.push(clock() + ' ' + s); if (lines.length > MAX) lines.shift(); };
export const perfNote = s => push('· ' + s);
const R = () => window.__R3 && window.__R3.renderer;

function sample() {
  if (!dts.length) return;
  const n = dts.length, tot = dts.reduce((a, b) => a + b, 0), worst = Math.max(...dts), long = dts.filter(d => d > 50).length; dts = [];
  const r = R(), i = r && r.info, prog = i && i.programs ? i.programs.length : 0;
  if (lastProg && prog > lastProg) push(`· новые шейдеры +${prog - lastProg}`);
  lastProg = prog || lastProg;
  const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'МБ' : '—';
  const zone = (G.zone && G.zone.json && G.zone.json.name) || G.zoneId || '—';
  push(`${zone} fps ${Math.round(1000 * n / tot)} худш ${Math.round(worst)}мс рывков ${long}` + (i ? ` отр ${i.render.calls} тр ${Math.round(i.render.triangles / 1000)}к шейд ${prog} геом ${i.memory.geometries} текст ${i.memory.textures}` : '') + ` dpr ${r ? r.getPixelRatio().toFixed(2) : '—'} js ${mem} враги ${G.enemies ? G.enemies.length : 0} эффекты ${(G.effects || []).length} частицы ${(G.particles || []).length} снаряды ${(G.projectiles || []).length}`);
}
export function startPerfLog() {
  if (started) return; started = true;
  const f = t => { if (last && !document.hidden) dts.push(t - last); last = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  setInterval(sample, 2000);
  bus.on('zoneEntered', id => perfNote('зона ' + ((G.zone && G.zone.json && G.zone.json.name) || id)));
  document.addEventListener('visibilitychange', () => { perfNote(document.hidden ? 'вкладка скрыта' : 'вкладка снова видна'); last = 0; });
  addEventListener('resize', () => perfNote(`размер окна ${innerWidth}×${innerHeight}`));
  document.addEventListener('fullscreenchange', () => perfNote(document.fullscreenElement ? 'весь экран' : 'не весь экран'));
}
function header() {
  let gpu = '—';
  try { const gl = R() && R().getContext(), ext = gl && gl.getExtension('WEBGL_debug_renderer_info'); if (ext) gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL); } catch { }
  const q = (G.profile && G.profile.settings && G.profile.settings.quality) || 'auto';
  return `Umbrahold ${window.__BUILD || ''} · качество ${q} · экран ${innerWidth}×${innerHeight} ×${devicePixelRatio} · ядер ${navigator.hardwareConcurrency || '?'}\nвидеокарта: ${gpu}\n${navigator.userAgent}\n`;
}
export const perfText = () => header() + lines.join('\n');
export async function copyPerfLog() {
  sample(); const txt = perfText();
  try { await navigator.clipboard.writeText(txt); bus.emit('toast', { text: 'Журнал скорости скопирован', sub: 'Вставьте его в чат', kind: 'good' }); return; } catch { }
  const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0'; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { } ta.remove();
  bus.emit('toast', ok ? { text: 'Журнал скорости скопирован', sub: 'Вставьте его в чат', kind: 'good' } : { text: 'Не получилось скопировать', kind: 'warn' });
}
