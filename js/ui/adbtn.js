// Rewarded-ad button with a visible cooldown timer (instead of a silent «already used» message).
import { G } from '../game/ctx.js';
import { el } from '../core/util.js';
import { watchRewarded, offerToken } from '../platform/monetize.js';
import { earlyLock } from '../game/progress.js';
const mmss = ms => { const s = Math.ceil(ms / 1000); return s >= 3600 ? `${Math.floor(s / 3600)} ч ${Math.floor(s % 3600 / 60)} мин` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export function adLeft(kind, period) { const P = G.profile; P.adCd = P.adCd || {}; return Math.max(0, (P.adCd[kind] || 0) + period - Date.now()); }
export function adButton(label, kind, period, apply, onDone, cls = 'btn ad') {
  const b = el('button', cls);
  const upd = () => { if (!b.isConnected && b._live) { clearInterval(b._iv); return; } b._live = true; const lock = kind !== 'revive' && earlyLock('extra'), l = adLeft(kind, period); b.disabled = lock || l > 0; b.textContent = lock ? `${label} · после обучения` : l > 0 ? `${label} · через ${mmss(l)}` : label; };   // сборка 47: до конца обучения — неактивна
  b.onclick = async () => {
    if (adLeft(kind, period) > 0) return;
    const ok = await watchRewarded(kind, offerToken(kind, String(Date.now())), () => { G.profile.adCd[kind] = Date.now(); apply(); });
    upd(); if (ok && onDone) onDone();
  };
  upd(); b._iv = setInterval(upd, 1000);
  return b;
}
