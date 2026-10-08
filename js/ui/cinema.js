// Облёт камеры (сборка 45): красивый показ мира без управления — деревня перед прологом, порталы после склепа.
// Камера плавно летит от точки к точке (G.cam.x/y + G.cineZoom — отдаление), снизу подпись. Нажатие — пропустить.
// Пока идёт облёт, game.update зовёт cineTick и больше ничего не делает (мир не живёт, герой стоит).
import { G, bus } from '../game/ctx.js';
import { $, el, esc } from '../core/util.js';
import { gate } from '../game/progress.js';

const ease = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
// shots: [{ x, y, zoom = 1.6, move = 1.6, hold = 2.2, text, sub }]
const SKIP = (() => { try { const q = new URLSearchParams(location.search); return q.has('shot') || q.has('nocine'); } catch { return false; } })();   // автотесты и ?nocine=1 — без облёта
export function cinema(shots) {
  return new Promise(res => {
    if (!shots.length || (SKIP && !G.forceCine)) return res(false);   // G.forceCine — чтобы автотест мог проверить облёт
    const box = el('div', 'cine', `<div class="cine-bar top"></div><div class="cine-bar bot"></div><div class="cine-cap"><div class="cc-t"></div><div class="cc-s"></div></div><button class="cine-skip">Пропустить ›</button>`);
    document.body.appendChild(box); document.body.classList.add('cine-on');
    const C = G.cinema = { shots, i: 0, t: 0, x0: G.cam.x, y0: G.cam.y, z0: G.cineZoom || 1, box, res };
    box.querySelector('.cine-skip').onclick = e => { e.stopPropagation(); finish(true); };
    caption(C);
  });
}
function caption(C) {
  const s = C.shots[C.i], cap = C.box.querySelector('.cine-cap');
  cap.classList.remove('show'); void cap.offsetWidth;
  cap.querySelector('.cc-t').textContent = s.text || ''; cap.querySelector('.cc-s').textContent = s.sub || '';
  if (s.text) setTimeout(() => cap.classList.add('show'), (s.move ?? 1.6) * 500);
}
function finish(skipped) {
  const C = G.cinema; if (!C) return;
  G.cinema = null; G.cineZoom = 1; C.box.remove(); document.body.classList.remove('cine-on');
  if (G.player) { G.cam.x = G.player.x; G.cam.y = G.player.y; }
  bus.emit('cinemaDone'); C.res(!skipped);
}
export function cineTick(dt) {
  const C = G.cinema; if (!C) return;
  const s = C.shots[C.i], mv = s.move ?? 1.6, hold = s.hold ?? 2.2, z = s.zoom ?? 1.6;
  C.t += dt;
  const k = ease(Math.min(1, C.t / mv));
  G.cam.x = C.x0 + (s.x - C.x0) * k; G.cam.y = C.y0 + (s.y - C.y0) * k; G.cineZoom = C.z0 + (z - C.z0) * k;
  if (C.t >= mv + hold) {
    C.x0 = s.x; C.y0 = s.y; C.z0 = z; C.t = 0; C.i++;
    if (C.i >= C.shots.length) finish(false); else caption(C);
  }
}
export const inCinema = () => !!G.cinema;

// Вступление (новая игра): облёт Тихого Брода, потом камера «ныряет» к катакомбам — и герой просыпается в склепе.
export function introShots() {
  // сборка 49 («сначала игра»): один кадр ~5 с вместо трёх (~14 с) — до первого удара быстрее
  const Z = G.zone, O = Z.json.objects || [], find = t => O.find(o => o.t === t);
  const well = find('well') || find('shrine') || { x: G.player.x, y: G.player.y }, cat = Z.inter.find(i => i.id === 'portal_town') || well;
  return [{ x: (well.x + cat.x) / 2, y: (well.y + cat.y) / 2, zoom: 2.1, move: 1.4, hold: 3.6, text: 'Сто лет назад Орден запер под Тихим Бродом Бездну', sub: 'Этой ночью первая печать треснула…' }];
}
// порталы деревни: открыт ли сейчас (те же замки, что при входе)
const PORTALS = ['portal_town', 'portal_forest', 'portal_fjord', 'portal_bones', 'portal_depths', 'portal_castle', 'portal_survival'];
function portalOpen(it) {
  const P = G.profile; if (it.reqLevel && P.level < it.reqLevel) return false;
  const g = it.id === 'portal_town' ? 'catacombs' : it.id === 'portal_survival' ? 'survival' : it.id === 'portal_depths' ? 'depths' : it.type === 'wildportal' ? it.realm : '';
  return !gate(g);
}
const seen = () => { const t = G.profile.tutorial; return (t.pseen = t.pseen || {}); };
// После склепа (сборка 49): катакомбы, один закрытый портал, староста — ~8 с вместо облёта всех 8 порталов (~26 с).
// Остальные порталы камера покажет в тот момент, когда они откроются (newPortalShots).
export function portalShots() {
  const Z = G.zone, shots = [], S = seen();
  for (const id of PORTALS) { const it = Z.inter.find(i => i.id === id); if (it && portalOpen(it)) S[id] = 1; }
  const cat = Z.inter.find(i => i.id === 'portal_town');
  if (cat) shots.push({ x: cat.x, y: cat.y, zoom: 1.35, move: 1.3, hold: 1.6, text: 'Катакомбы', sub: 'Открыто' });
  const lock = Z.inter.find(i => i.id === 'portal_forest') || Z.inter.find(i => PORTALS.includes(i.id) && !S[i.id]);
  if (lock) shots.push({ x: lock.x, y: lock.y, zoom: 1.35, move: 1.3, hold: 1.6, text: lock.plate || lock.label, sub: '🔒 И ещё шесть порталов откроются по ходу истории' });
  const eld = Z.inter.find(i => i.id === 'elder');
  if (eld) shots.push({ x: eld.x, y: eld.y, zoom: 1.0, move: 1.4, hold: 1.6, text: 'Староста Эдрик ждёт тебя', sub: 'Иди за золотыми стрелками' });
  return shots;
}
// Портал только что открылся — показать его камерой один раз (объяснять, когда понадобится)
export function newPortalShots() {
  const Z = G.zone, first = !G.profile.tutorial.pseen, S = seen(), shots = [];
  if (first) { for (const id of PORTALS) { const it = Z.inter.find(i => i.id === id); if (it && portalOpen(it)) S[id] = 1; } bus.emit('save'); return shots; }   // старое сохранение: открытое уже видели
  for (const id of PORTALS) {
    const it = Z.inter.find(i => i.id === id); if (!it || S[id] || !portalOpen(it)) continue;
    S[id] = 1; shots.push({ x: it.x, y: it.y, zoom: 1.35, move: 1.4, hold: 2.2, text: 'Открыт портал: ' + (it.plate || it.label), sub: it.label !== it.plate ? it.label : '' });
  }
  if (shots.length) bus.emit('save');
  return shots;
}
