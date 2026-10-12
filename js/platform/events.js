// События (сборка 66, D1 отчёта «как больше зарабатывать»): повод вернуться в игру на выходных. Включаются флагом в консоли Яндекса без новой сборки.
import { now, flagStr, flagNum, platform } from './platform.js';
import { G, bus } from '../game/ctx.js';

// По умолчанию в субботу и воскресенье (по времени сервера) ×1,5 золота и осколков.
// Флаг event в консоли: off — выключить; gold2 / shards2 / xp2 — своё событие на любые дни; weekend — как по умолчанию
const EVENTS = {
  weekend: { name: 'Выходные Ордена', sub: '×1,5 золота и осколков Бездны', gold: 1.5, shards: 1.5, xp: 1 },
  gold2: { name: 'Золотая лихорадка', sub: '×2 золота', gold: 2, shards: 1, xp: 1 },
  shards2: { name: 'Дождь осколков', sub: '×2 осколков Бездны', gold: 1, shards: 2, xp: 1 },
  xp2: { name: 'Ночь опыта', sub: '×2 опыта', gold: 1, shards: 1, xp: 2 },
};
export function eventNow() {
  const f = flagStr('event', 'weekend'); if (f === 'off') return null;
  if (f !== 'weekend' && EVENTS[f]) return { id: f, ...EVENTS[f] };
  const d = new Date(now()).getDay(); return d === 0 || d === 6 ? { id: 'weekend', ...EVENTS.weekend } : null;
}
export const eventMul = k => { const e = eventNow(); return e ? e[k] || 1 : 1; };

// ---- sticky-баннер (сборка 66, B1/F8): только в деревне, вне боя; в остальных местах спрятан. Флаг banner=off выключает.
// Пока баннер на экране, нижние кнопки поднимаются на его высоту (флаг banner_h, по умолчанию 56 px).
let shown = false;
async function setBanner(on) {
  const p = platform.p; if (!p || !p.showBanner) return;
  if (on === shown) return; shown = on;
  if (on) { const ok = await p.showBanner(); if (!ok) { shown = false; return; } document.documentElement.style.setProperty('--banner-h', flagNum('banner_h', 56) + 'px'); document.body.classList.add('ad-banner'); }
  else { p.hideBanner(); document.body.classList.remove('ad-banner'); }
}
let wired = false;
export function wireEvents() {
  if (wired) return; wired = true;
  bus.on('zoneEntered', z => {
    setBanner(z === 'town' && flagStr('banner', 'town') !== 'off' && !(G.profile && G.profile.iap && G.profile.iap.noAds));
    const e = eventNow(); if (z === 'town' && e && !G.evToast) { G.evToast = 1; setTimeout(() => bus.emit('toast', { text: '✷ ' + e.name, sub: e.sub + ' — сегодня во всех локациях', kind: 'quest' }), 6500); }
  });
}
