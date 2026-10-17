// VK Play, браузерная игра (documentation.vkplay.ru → Free-to-play → Browser Games). Игра открывается в iframe страницы
// vkplay.ru/app/<GMRID>; в адрес iframe площадка добавляет sign, uid, appid, currency, lang (ru_RU, en_US, …).
// Есть: JS API (mailru.core.js → iframeApi) — статус входа и uid игрока; сохранения — на устройстве (проверка VK Play это допускает).
// Нет: рекламы — у JS API её нет, а сторонняя реклама запрещена (чек-лист «Testing»); покупки — окно paymentFrame в рублях,
// но выдачу подтверждает уведомление на сервер игры (Callback URL) — пока сервера нет, лавка за рубли скрыта.
// Включается сборкой PLATFORM=vkplay, с ?platform=vkplay или по параметрам запуска VK Play.

const Q = new URLSearchParams(location.search);
export function onVKPlay() {
  return (Q.has('appid') && Q.has('sign') && Q.has('uid')) || /(^|\.)vkplay\.(ru|com)\//.test(document.referrer.replace(/^https?:\/\//, '')) || Q.has('vkplay');
}
// сборка под VK Play или её параметры запуска — для мест, что работают до выбора площадки (полный экран, вторая вкладка)
export const isVKPlay = () => (window.__PLATFORM || Q.get('platform')) === 'vkplay' || (!window.__PLATFORM && !Q.get('platform') && onVKPlay());

export class VKPlayProvider {
  constructor() { this.name = 'vkplay'; this.api = null; this.login = null; this.uid = Q.get('uid') || null; }
  async init() {
    const id = Q.get('appid');
    if (id && /^\d+$/.test(id)) {   // вне VK Play (нет appid) — без JS API, игра работает как есть
      try {
        await new Promise((res, rej) => { const s = document.createElement('script'); s.src = `https://vkplay.ru/app/${id}/static/mailru.core.js`; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        const cb = { appid: +id, getLoginStatusCallback: st => { this.login = st && st.status === 'ok' ? +st.loginStatus : 0; }, userInfoCallback: i => { if (i && i.uid) this.uid = String(i.uid); } };
        this.api = await Promise.race([window.iframeApi(cb), new Promise((_, rej) => setTimeout(() => rej(new Error('iframeApi timeout')), 5000))]);
        this.api.getLoginStatus();
      } catch (e) { console.warn('vkplay api', e); this.api = null; }
    }
    return true;
  }
  ready() { } gameplayStart() { } gameplayStop() { }
  lang() { return (Q.get('lang') || navigator.language || 'ru').slice(0, 2).toLowerCase(); }
  async showRewarded() { return false; }
  async showInterstitial() { return false; }
  async purchase() { return { ok: false }; }
  async consume() { return true; }
  async getPurchases() { return []; }
  catalogPrice() { return null; }
  hasProduct() { return false; }
  async requestReview() { return false; }
  async setLeaderboardScore() { return false; } async getLeaderboard() { return null; }
  async flags() { return {}; } async canShortcut() { return false; } async shortcut() { return false; }
  async cloudLoad() { return null; } async cloudSave() { return false; }
}

// чек-лист VK Play: игра не запускается одновременно в нескольких вкладках. Вторая вкладка показывает надпись и не грузит игру
export function vkplaySingleTab() {
  if (!isVKPlay() || !navigator.locks) return Promise.resolve(true);
  return new Promise(res => {
    navigator.locks.request('umbrahold-tab', { ifAvailable: true }, lock => {
      if (!lock) { res(false); return; }
      res(true); return new Promise(() => { });   // держим замок, пока вкладка открыта
    }).catch(() => res(true));
  });
}
