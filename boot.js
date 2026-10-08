// Выбор языка (сборка 54) — до загрузки игры. Русский код лежит в js/, переводы — в js_<код>/ (tools/i18n/build_langs.mjs).
// Яндекс: язык из SDK (ysdk.environment.i18n.lang), сам SDK инициализируется здесь один раз и передаётся игре (window.__ysdk).
// Вне Яндекса — язык браузера. Принудительно: ?lang=en. be, kk, uk, uz → русский (так советует Яндекс); незнакомый язык → английский.
const LANGS = window.__LANGS || ['ru'];   // список подставляет сборка
const q = new URLSearchParams(location.search);
const onYandex = /yandex\.|playhop|games\.s3\.yandex/.test(location.hostname) || q.has('yandex');
const onVK = q.has('vk_app_id') || q.has('vk_platform') || q.has('vk');
async function detect() {
  if (q.get('lang')) return q.get('lang');
  if (onVK) return 'ru';
  if (onYandex && !q.has('nosdk')) {
    try {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/sdk.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      window.__ysdk = await window.YaGames.init();
      return window.__ysdk.environment.i18n.lang;
    } catch (e) { console.warn('sdk', e); return 'ru'; }
  }
  return (navigator.language || 'ru').slice(0, 2).toLowerCase();
}
function pick(l) { l = String(l || 'ru').slice(0, 2).toLowerCase(); if (['be', 'kk', 'uk', 'uz', 'ru'].includes(l)) return 'ru'; return LANGS.includes(l) ? l : (LANGS.includes('en') ? 'en' : 'ru'); }
(async () => {
  const lang = pick(await detect()); window.__LANG = lang; document.documentElement.lang = lang;
  if (lang !== 'ru') {
    try {   // тексты index.html (титульный экран, подсказки кнопок)
      const D = await fetch(`js_${lang}/html.json`).then(r => r.json());
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const k = n.textContent.trim(); if (D[k]) n.textContent = n.textContent.replace(k, D[k]); }
      for (const e of document.querySelectorAll('[title]')) if (D[e.title]) e.title = D[e.title];
      if (D[document.title]) document.title = D[document.title];
    } catch (e) { console.warn('html i18n', e); }
  }
  await import(lang === 'ru' ? './js/main.js' : `./js_${lang}/main.js`);
})();
