// Platform SDK layer. The game talks only to `platform`; providers adapt Yandex Games / demo / future stores.
// Yandex SDK is loaded lazily and only when running on a Yandex domain (or ?yandex=1), so other hosts stay clean.

import { bus } from '../game/ctx.js';

class DemoProvider {
  constructor() { this.name = 'demo'; }
  async init() { return true; }
  ready() { } gameplayStart() { } gameplayStop() { }
  lang() { return (navigator.language || 'ru').slice(0, 2); }
  // Simulated rewarded video: a 3-second overlay with explicit close → only a completed view grants the reward.
  showRewarded() { return demoAd(true); }
  showInterstitial() { return demoAd(false); }
  async purchase(productId) {
    const ok = await demoConfirm(`Демо-покупка «${PRODUCTS[productId]?.title || productId}» за ${PRODUCTS[productId]?.price || '?'}. В демо-режиме деньги не списываются.`);
    return ok ? { ok: true, token: 'demo_' + productId + '_' + Date.now() + '_' + Math.random().toString(36).slice(2) } : { ok: false };
  }
  async consume() { return true; }
  async getPurchases() { return []; }
  async cloudLoad() { return null; } async cloudSave() { return false; }
  async requestReview() { return false; }
  catalogPrice(id) { return PRODUCTS[id]?.price; }
  async setLeaderboardScore() { return false; } async getLeaderboard() { return null; }   // демо: таблиц рекордов нет
}

class YandexProvider {
  constructor() { this.name = 'yandex'; this.ysdk = null; this.payments = null; this.player = null; }
  // таблицы рекордов (сборка 21): новая (ysdk.leaderboards) и старая (getLeaderboards) версии SDK. Таблицу создать в консоли Яндекс Игр.
  async setLeaderboardScore(name, score) { try { if (this.ysdk.leaderboards && this.ysdk.leaderboards.setScore) { await this.ysdk.leaderboards.setScore(name, score); return true; } const lb = await this.ysdk.getLeaderboards(); await lb.setLeaderboardScore(name, score); return true; } catch (e) { console.warn('leaderboard', e); return false; } }
  async getLeaderboard(name) { try { const lb = this.ysdk.leaderboards && this.ysdk.leaderboards.getEntries ? this.ysdk.leaderboards : await this.ysdk.getLeaderboards(); const r = await (lb.getEntries ? lb.getEntries(name, { quantityTop: 5, includeUser: true, quantityAround: 1 }) : lb.getLeaderboardEntries(name, { quantityTop: 5, includeUser: true, quantityAround: 1 })); return r.entries.map(e => ({ rank: e.rank, name: (e.player && e.player.publicName) || 'Игрок', score: e.score })); } catch { return null; } }
  async init() {
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/sdk.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    this.ysdk = await window.YaGames.init();
    try { this.payments = await this.ysdk.getPayments({ signed: false }); this.catalog = await this.payments.getCatalog(); } catch (e) { console.warn('payments unavailable', e); }
    try { this.player = await this.ysdk.getPlayer({ scopes: false }); } catch { }
    // требование модерации: игра ставится на паузу и глушит звук по событиям платформы (реклама, сворачивание, оверлей)
    try { this.ysdk.on('game_api_pause', () => bus.emit('platformPause', true)); this.ysdk.on('game_api_resume', () => bus.emit('platformPause', false)); } catch { }
    return true;
  }
  ready() { try { this.ysdk.features.LoadingAPI?.ready(); } catch { } }
  gameplayStart() { try { this.ysdk.features.GameplayAPI?.start(); } catch { } }
  gameplayStop() { try { this.ysdk.features.GameplayAPI?.stop(); } catch { } }
  lang() { try { return this.ysdk.environment.i18n.lang; } catch { return 'ru'; } }
  showRewarded() {
    return new Promise(res => {
      let rewarded = false;
      this.ysdk.adv.showRewardedVideo({ callbacks: {
        onRewarded: () => { rewarded = true; }, onClose: () => res(rewarded), onError: () => res(false),
      } });
    });
  }
  showInterstitial() { return new Promise(res => this.ysdk.adv.showFullscreenAdv({ callbacks: { onClose: w => res(!!w), onError: () => res(false) } })); }
  async purchase(productId) {
    if (!this.payments) return { ok: false };
    try { const p = await this.payments.purchase({ id: productId }); return { ok: true, token: p.purchaseToken }; } catch { return { ok: false }; }
  }
  async consume(token) { try { await this.payments.consumePurchase(token); return true; } catch { return false; } }
  async getPurchases() { try { return (await this.payments.getPurchases()).map(p => ({ productId: p.productID, token: p.purchaseToken })); } catch { return []; } }
  async cloudLoad() { try { const d = await this.player.getData(['save']); return d.save ? JSON.parse(d.save) : null; } catch { return null; } }
  async cloudSave(p) { try { await this.player.setData({ save: JSON.stringify(p) }, false); return true; } catch { return false; } }
  async requestReview() {
    try { const { value } = await this.ysdk.feedback.canReview(); if (!value) return false; const r = await this.ysdk.feedback.requestReview(); return !!(r && r.feedbackSent); } catch { return false; }
  }
  catalogPrice(id) { const c = (this.catalog || []).find(x => x.id === id); return c ? c.price : PRODUCTS[id]?.price; }
}

// In-app products (IDs must match the Yandex console catalog).
export const PRODUCTS = {
  starter_pack: { title: 'Набор искателя', price: '29 ₽', desc: '1000 золота, 10 зелий здоровья, 5 зелий маны и магический предмет.', consumable: true, once: true },
  potion_pack: { title: 'Сундук зелий', price: '49 ₽', desc: '15 зелий здоровья и 10 зелий маны.', consumable: true },
  gold_perk: { title: 'Кошель Ордена', price: '79 ₽', desc: 'Навсегда +25% к находимому золоту.', consumable: false },
  no_ads: { title: 'Без обязательной рекламы', price: '99 ₽', desc: 'Отключает межуровневую рекламу. Бонусы за просмотр остаются по желанию.', consumable: false },
  gold_small: { title: 'Мешочек золота', price: '19 ₽', desc: '600 золота.', consumable: true },
  bag_big: { title: 'Большая сумка', price: '300 ₽', desc: 'Навсегда +20 мест в сумке.', consumable: false },
};

function onYandex() {
  const h = location.hostname; return /yandex\.|playhop|games\.s3\.yandex/.test(h) || new URLSearchParams(location.search).has('yandex');
}
export const platform = { p: null, name: 'demo' };
export async function initPlatform() {
  let prov = onYandex() ? new YandexProvider() : new DemoProvider();
  try { await prov.init(); } catch (e) { console.warn('platform init failed, fallback to demo', e); prov = new DemoProvider(); await prov.init(); }
  platform.p = prov; platform.name = prov.name; return prov;
}

// ---- demo overlays (DOM)
function demoAd(rewarded) {
  return new Promise(res => {
    const o = document.createElement('div'); o.className = 'demo-ad';
    o.innerHTML = `<div class="demo-ad-box"><div class="demo-ad-tag">ДЕМО-РЕКЛАМА</div><div class="demo-ad-t">${rewarded ? 'Видео с наградой' : 'Реклама'}</div><div class="demo-ad-bar"><i></i></div><button class="btn" disabled>Подождите…</button></div>`;
    document.body.appendChild(o);
    const btn = o.querySelector('button'), bar = o.querySelector('i'); let t = 0; const T = rewarded ? 3 : 1.5;
    const iv = setInterval(() => { t += 0.1; bar.style.width = Math.min(100, t / T * 100) + '%'; if (t >= T) { clearInterval(iv); btn.disabled = false; btn.textContent = rewarded ? 'Получить награду' : 'Закрыть'; } }, 100);
    btn.onclick = () => { o.remove(); res(true); };
    const skip = document.createElement('button'); skip.className = 'demo-ad-x'; skip.textContent = '✕'; skip.title = 'Закрыть без награды';
    skip.onclick = () => { clearInterval(iv); o.remove(); res(t >= T && !rewarded ? true : false); }; o.querySelector('.demo-ad-box').appendChild(skip);
  });
}
function demoConfirm(text) {
  return new Promise(res => {
    const o = document.createElement('div'); o.className = 'demo-ad';
    o.innerHTML = `<div class="demo-ad-box"><div class="demo-ad-tag">ДЕМО-ПОКУПКА</div><p>${text}</p><div class="row"><button class="btn gold" data-a="1">Купить</button><button class="btn" data-a="0">Отмена</button></div></div>`;
    document.body.appendChild(o); o.onclick = e => { const a = e.target.dataset.a; if (a != null) { o.remove(); res(a === '1'); } };
  });
}
