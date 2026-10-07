// Окно «Энергия ⚡» (сборка 47): одна энергия на Летопись битв, Глубины и Жатву. Открывается с кнопки ⚡ в верхней панели и из Летописи.
// Своё окно поверх всего (не modal()), чтобы не снимать паузу у Летописи битв.
import { G, bus } from '../game/ctx.js';
import { el } from '../core/util.js';
import * as CS from '../game/castle.js';
import { watchRewarded, offerToken, buy } from '../platform/monetize.js';
import { platform, PRODUCTS } from '../platform/platform.js';

const hm = ms => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m} мин`; };
let ov = null;
export function openEnergy(onDone) {
  if (ov) ov.remove();
  ov = el('div', 'demo-ad en-ov'); const box = el('div', 'demo-ad-box'); ov.appendChild(box); document.body.appendChild(ov);
  const close = () => { clearInterval(iv); if (ov) ov.remove(); ov = null; bus.emit('hud'); if (onDone) onDone(); };
  ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
  const draw = () => {
    const t = CS.torches(), next = CS.nextIn(t, CS.TORCH_MS), left = CS.enAdsLeft(), reset = CS.enAdsReset();
    box.innerHTML = '';
    box.appendChild(el('div', 'demo-ad-tag', 'ЭНЕРГИЯ'));
    box.appendChild(el('div', 'en-big', `⚡ ${t.n} / ${CS.TORCH_MAX}`));
    box.appendChild(el('p', 'muted', `Тратится на бои Летописи битв (1 ⚡), повтор пройденных этажей Глубин и поражение там (1 ⚡), забег в Жатве (3 ⚡). ${next ? `Ниже ${CS.TORCH_MAX}: +1 через ${hm(next)}.` : 'Запас полон — сверх него копится только из рекламы и покупки.'}`));
    const ad = el('button', 'btn ad', left > 0 ? `+${CS.EN_AD} ⚡ за рекламу · осталось ${left} из ${CS.EN_AD_MAX}` : `Реклама обновится через ${hm(reset)}`);
    ad.disabled = left <= 0;
    ad.onclick = async () => { const ok = await watchRewarded('energy', offerToken('energy', String(Date.now())), () => CS.enAdGrant()); if (ok) bus.emit('toast', { text: `+${CS.EN_AD} ⚡`, kind: 'good' }); draw(); };
    box.appendChild(ad);
    if (left > 0 && left < CS.EN_AD_MAX) box.appendChild(el('p', 'muted', `Окно рекламы обновится через ${hm(reset)}`));
    if (platform.p && platform.p.hasProduct('energy_pack')) {
      const pr = PRODUCTS.energy_pack, b = el('button', 'btn gold', `${pr.title} · ${platform.p.catalogPrice('energy_pack') || pr.price}`);
      b.onclick = async () => { const was = G.paused; await buy('energy_pack'); G.paused = was; draw(); };
      box.appendChild(b);
    }
    const x = el('button', 'btn', 'Закрыть'); x.onclick = close; box.appendChild(x);
  };
  draw(); const iv = setInterval(() => { if (ov) draw(); }, 30000);
}
bus.on('openEnergy', cb => openEnergy(typeof cb === 'function' ? cb : null));
window.__openEnergy = () => openEnergy();
