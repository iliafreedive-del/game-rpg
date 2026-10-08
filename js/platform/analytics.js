// Аналитика первых минут (сборка 51): цели Яндекс Метрики, чтобы после релиза видеть, где игроки бросают игру.
// Счётчик: создать на metrika.yandex.ru (сайт — адрес игры в Яндекс Играх), номер вписать в METRIKA_ID
// или проверить без правки кода: ?ym=12345678. Пока номер 0 — Метрика не грузится, события пишутся только в window.__AN.
// Все цели — в отчёте «Конверсии»; воронка «старт → склеп → задание → катакомбы → босс» строится из целей ms_*.
import { G, bus } from '../game/ctx.js';

export const METRIKA_ID = 0;
const T0 = performance.now();
const qs = new URLSearchParams(location.search);
const ID = +(qs.get('ym') || METRIKA_ID) || 0;
const DEBUG = qs.has('an');
const log = (window.__AN = []);   // для QA и отладки: последние события
let ready = false;
const queue = [];

function send(goal, params) {
  if (!ID) return;
  if (!ready) { queue.push([goal, params]); return; }
  try { window.ym(ID, 'reachGoal', goal, params); } catch { }
}

// goal — латиница и _, params — плоский объект (Метрика показывает их в «Параметрах визитов»)
export function track(goal, params = {}) {
  const P = G.profile;
  const p = Object.assign({ build: window.__BUILD || '' }, P ? { cls: P.cls, lvl: P.level, min: Math.round((P.stats.playTime || 0) / 60) } : {}, params);
  log.push([goal, p]); if (log.length > 200) log.shift();
  if (DEBUG) console.log('[an]', goal, p);
  send(goal, p);
}
// один раз на героя (profile.an) — для воронки новичка; повторные входы не засоряют отчёт
export function once(goal, params) {
  const P = G.profile; if (!P) return track(goal, params);
  const a = (P.an = P.an || {}); if (a[goal]) return; a[goal] = 1; track(goal, params);
}

// счётчик грузится после LoadingAPI.ready(), чтобы не замедлять Game Ready
export function initAnalytics() {
  track('game_ready', { sec: Math.round((performance.now() - T0) / 100) / 10 });
  if (!ID) return;
  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); }; window.ym.l = +new Date();
  const s = document.createElement('script'); s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js';
  s.onload = () => { ready = true; for (const [g, p] of queue.splice(0)) send(g, p); };
  document.head.appendChild(s);
  window.ym(ID, 'init', { clickmap: false, trackLinks: false, accurateTrackBounce: true, webvisor: false });
}

// подписки на события игры (вызывается один раз, когда профиль загружен)
let wired = false;
export function wireAnalytics() {
  if (wired) return; wired = true;
  const seen = new Set();
  bus.on('zoneEntered', z => { if (!seen.has(z)) { seen.add(z); track('zone_' + z); } once('first_zone_' + z); });
  bus.on('levelUp', l => { if (l <= 10 || l % 5 === 0) once('lvl_' + l); });
  bus.on('playerDeath', () => track('death', { zone: G.zoneId || '' }));
  bus.on('questComplete', q => track('quest_done', { q: q && q.id || '' }));
  bus.on('survEnd', r => track('surv_end', { win: r.win ? 1 : 0, t: Math.round(r.t), kills: r.kills }));
  bus.on('floorResult', r => track('floor_result', { floor: (r && r.floor) || 0 }));
  // минуты сессии: где игроки закрывают вкладку
  let mins = 0; setInterval(() => { if (document.hidden || !G.profile) return; mins++; if ([1, 3, 5, 10, 15, 20, 30, 45, 60].includes(mins)) track('session_' + mins + 'm'); }, 60000);
}
