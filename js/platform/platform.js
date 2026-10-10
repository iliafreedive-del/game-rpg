// Platform SDK layer. The game talks only to `platform`; providers adapt Yandex Games / demo / future stores.
// Yandex SDK is loaded lazily and only when running on a Yandex domain (or ?yandex=1), so other hosts stay clean.

import { bus } from '../game/ctx.js';
import { VKProvider, onVK } from './vk.js';

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
  hasProduct() { return true; }
  async setLeaderboardScore() { return false; } async getLeaderboard() { return null; }   // демо: таблиц рекордов нет
  async flags() { return {}; } async canShortcut() { return false; } async shortcut() { return false; }
}

class YandexProvider {
  constructor() { this.name = 'yandex'; this.ysdk = null; this.payments = null; this.player = null; }
  // таблицы рекордов (сборка 21): новая (ysdk.leaderboards) и старая (getLeaderboards) версии SDK. Таблицу создать в консоли Яндекс Игр.
  async setLeaderboardScore(name, score) { try { if (this.ysdk.leaderboards && this.ysdk.leaderboards.setScore) { await this.ysdk.leaderboards.setScore(name, score); return true; } const lb = await this.ysdk.getLeaderboards(); await lb.setLeaderboardScore(name, score); return true; } catch (e) { console.warn('leaderboard', e); return false; } }
  async getLeaderboard(name) { try { const lb = this.ysdk.leaderboards && this.ysdk.leaderboards.getEntries ? this.ysdk.leaderboards : await this.ysdk.getLeaderboards(); const r = await (lb.getEntries ? lb.getEntries(name, { quantityTop: 5, includeUser: true, quantityAround: 1 }) : lb.getLeaderboardEntries(name, { quantityTop: 5, includeUser: true, quantityAround: 1 })); return r.entries.map(e => ({ rank: e.rank, name: (e.player && e.player.publicName) || 'Игрок', score: e.score })); } catch { return null; } }
  async init() {
    // сборка 54: boot.js уже инициализировал SDK, чтобы выбрать язык до загрузки игры
    if (window.__ysdk) this.ysdk = window.__ysdk;
    else { await new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/sdk.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); this.ysdk = await window.YaGames.init(); }
    try { this.payments = await this.ysdk.getPayments({ signed: false }); this.catalog = await this.payments.getCatalog(); } catch (e) { console.warn('payments unavailable', e); }
    try { this.player = await this.ysdk.getPlayer({ scopes: false }); } catch { }
    // требование модерации: игра ставится на паузу и глушит звук по событиям платформы (реклама, сворачивание, оверлей)
    try { this.ysdk.on('game_api_pause', () => bus.emit('platformPause', true)); this.ysdk.on('game_api_resume', () => bus.emit('platformPause', false)); } catch { }
    return true;
  }
  // сборка 54: удалённые флаги (консоль → Удалённая конфигурация) и ярлык на рабочий стол
  async flags() { try { return await this.ysdk.getFlags({ defaultFlags: {} }); } catch { return {}; } }
  async canShortcut() { try { return !!(await this.ysdk.shortcut.canShowPrompt()).canShow; } catch { return false; } }
  async shortcut() { try { const r = await this.ysdk.shortcut.showPrompt(); return r && r.outcome === 'accepted'; } catch { return false; } }
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
  // правки по скилам (С11): «облака нет» (null) и «облако не ответило» ({ error }) — разные ответы: при сбое игра не пишет в облако, пока не прочитает его
  async cloudLoad() { let d; try { d = await this.player.getData(['save']); } catch (e) { console.warn('cloud load', e); return { error: 1 }; } try { return d && d.save ? JSON.parse(d.save) : null; } catch { return null; } }
  async cloudSave(p, flush) { try { await this.player.setData({ save: JSON.stringify(p) }, !!flush); return true; } catch { return false; } }   // flush — сразу на сервер (сворачивание, «Начать заново»)
  async requestReview() {
    try { const { value } = await this.ysdk.feedback.canReview(); if (!value) return false; const r = await this.ysdk.feedback.requestReview(); return !!(r && r.feedbackSent); } catch { return false; }
  }
  // требование 1.13.2: цена и валюта портала — только из каталога SDK (число + значок валюты), без зашитых рублей
  catalogPrice(id) {
    const c = (this.catalog || []).find(x => x.id === id); if (!c) return null;
    let img = ''; try { img = c.getPriceCurrencyImage('small'); } catch { }
    return { value: c.priceValue, code: c.priceCurrencyCode, img };
  }
  // 1.13.6: в игре — только товары, что есть в каталоге консоли
  hasProduct(id) { return !!(this.catalog || []).find(x => x.id === id); }
}

// Товары (id должны совпадать с каталогом в консоли Яндекс Игр; цены в игре берутся из каталога SDK, строка price — только для демо).
// Лестница снаряжения (сборка 45): каждый следующий набор на одну редкость выше того, что игрок добывает сам,
// и уровня «герой + 3». Показывается один раз у очередной «стены» (js/platform/offers.js), потом лежит в лавке.
export const PRODUCTS = {
  starter_pack: { title: 'Набор искателя', price: '29 ₽', desc: '1000 золота, 10 зелий здоровья, 5 зелий маны и магический предмет.', consumable: true, once: true, icon: '★' },
  guard_armor: { title: 'Доспех Стража', price: '99 ₽', desc: 'Синий сет: шлем, доспех и амулет вашего класса с бонусом сета. Уровень героя + 3.', consumable: true, once: true, icon: '🛡', gear: { kind: 'set', rarity: 2 } },
  seal_blade: { title: 'Клинок печати', price: '199 ₽', desc: 'Золотое оружие вашего класса с особым эффектом. Уровень героя + 3.', consumable: true, once: true, icon: '⚔', gear: { kind: 'epic', slot: 'weapon' } },
  magister_plate: { title: 'Латы Магистра', price: '349 ₽', desc: 'Золотой сет из трёх вещей: шлем, доспех, амулет. Уровень героя + 3.', consumable: true, once: true, icon: '✦', gear: { kind: 'set', rarity: 3 } },
  order_weapon: { title: 'Оружие Ордена', price: '599 ₽', desc: 'Мифическое оружие — редкость, которую иначе получают только слиянием. Уровень героя + 3.', consumable: true, once: true, icon: '❖', gear: { kind: 'mythic', slot: 'weapon' } },
  abyss_set: { title: 'Сет Бездны', price: '990 ₽', desc: 'Мифический сет из трёх вещей для Кругов Бездны. Уровень героя + 3.', consumable: true, once: true, icon: '◉', gear: { kind: 'set', rarity: 4 } },
  season_pass: { title: 'Знамя сезона', price: '199 ₽', desc: 'Вторая дорожка пути сезона на этот месяц: по награде на каждой ступени.', consumable: true, icon: '⚑' },
  potion_pack: { title: 'Сундук зелий', price: '49 ₽', desc: '15 зелий здоровья и 10 зелий маны.', consumable: true, icon: '✚' },
  gold_perk: { title: 'Кошель Ордена', price: '79 ₽', desc: 'Навсегда +25% к находимому золоту.', consumable: false, icon: '⛁' },
  no_ads: { title: 'Без обязательной рекламы', price: '99 ₽', desc: 'Отключает межуровневую рекламу. Бонусы за просмотр остаются по желанию.', consumable: false, icon: '⊘' },
  gold_small: { title: 'Мешочек золота', price: '19 ₽', desc: '600 золота.', consumable: true, icon: '⛁' },
  energy_pack: { title: 'Запас энергии', price: '49 ₽', desc: '+50 ⚡ энергии для Летописи битв, Глубин и Жатвы.', consumable: true, icon: '⚡' },
  bag_big: { title: 'Большая сумка', price: '149 ₽', desc: 'Навсегда +20 мест в сумке.', consumable: false, icon: '▤' },
};

function onYandex() {
  const h = location.hostname; return /yandex\.|playhop|games\.s3\.yandex/.test(h) || new URLSearchParams(location.search).has('yandex');
}
export const platform = { p: null, name: 'demo', flags: {} };
// GameplayAPI (требование 1.19.3): идёт ли игровой процесс. main.js сверяет каждый кадр (окна, пауза, смерть),
// реклама и сворачивание выключают сразу; Яндексу уходит только смена состояния
let gpOn = false;
export function gameplay(on) { if (!platform.p || on === gpOn) return; gpOn = on; if (on) platform.p.gameplayStart(); else platform.p.gameplayStop(); }
export async function initPlatform() {
  let prov = onYandex() ? new YandexProvider() : onVK() ? new VKProvider() : new DemoProvider();   // сборка 52: VK Игры
  try { await prov.init(); } catch (e) { console.warn('platform init failed, fallback to demo', e); prov = new DemoProvider(); await prov.init(); }
  platform.p = prov; platform.name = prov.name;
  // флаги — один раз на старте, не дольше 1,5 с (без них — значения по умолчанию)
  try { platform.flags = (await Promise.race([prov.flags ? prov.flags() : {}, new Promise(r => setTimeout(() => r({}), 1500))])) || {}; } catch { platform.flags = {}; }
  return prov;
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
