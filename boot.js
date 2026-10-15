// Выбор языка (сборка 54) — до загрузки игры. Русский код лежит в js/, переводы — в js_<код>/ (tools/i18n/build_langs.mjs).
// Яндекс: язык из SDK (ysdk.environment.i18n.lang), сам SDK инициализируется здесь один раз и передаётся игре (window.__ysdk).
// Вне Яндекса — язык браузера. Принудительно: ?lang=en. be, kk, uk, uz → русский (так советует Яндекс); незнакомый язык → английский.
const LANGS = window.__LANGS || ['ru'];   // список подставляет сборка
const q = new URLSearchParams(location.search);
// ветка VK: сборка под одну площадку задаёт window.__PLATFORM (tools/build_zip.sh, PLATFORM=yandex|vk|vkplay), иначе — по адресу
const PF = window.__PLATFORM || q.get('platform') || '';
const onYandex = PF ? PF === 'yandex' : /yandex\.|playhop|games\.s3\.yandex/.test(location.hostname) || q.has('yandex');
const onVK = PF ? PF === 'vk' : q.has('vk_app_id') || q.has('vk_platform') || q.has('vk');
async function detect() {
  // требование 2.14: на Яндексе язык всегда берётся из SDK на старте, даже если в адресе есть ?lang= (тогда ?lang= лишь уточняет его)
  if (onYandex && !q.has('nosdk')) {
    try {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/sdk.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      window.__ysdk = await window.YaGames.init();
      const l = window.__ysdk.environment.i18n.lang;
      return q.get('lang') || l;
    } catch (e) { console.warn('sdk', e); return q.get('lang') || 'ru'; }
  }
  if (q.get('lang')) return q.get('lang');
  if (onVK) return q.get('vk_language') || 'ru';   // язык интерфейса VK из параметров запуска (ru, uk, be, en, …)
  return (navigator.language || 'ru').slice(0, 2).toLowerCase();
}
function pick(l) { l = String(l || 'ru').slice(0, 2).toLowerCase(); if (['be', 'kk', 'kz', 'uk', 'ua', 'uz', 'ru'].includes(l)) return 'ru'; return LANGS.includes(l) ? l : (LANGS.includes('en') ? 'en' : 'ru'); }   // kz, ua — коды vk_language
(async () => {
  const lang = pick(await detect()); window.__LANG = lang; document.documentElement.lang = lang; if (window.__bootStep) window.__bootStep();
  if (lang !== 'ru') {
    try {   // тексты index.html (титульный экран, подсказки кнопок)
      const D = await fetch(`js_${lang}/html.json`).then(r => r.json());
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const k = n.textContent.trim(); if (D[k]) n.textContent = n.textContent.replace(k, D[k]); }
      for (const e of document.querySelectorAll('[title]')) if (D[e.title]) e.title = D[e.title];
      if (D[document.title]) document.title = D[document.title];
    } catch (e) { console.warn('html i18n', e); }
  }
  { // сборка 64: все модули игры — параллельно (список кладёт сборка, tools/i18n/build_langs.mjs); vendor общий для всех языков
    const base = lang === 'ru' ? 'js/' : `js_${lang}/`;
    const mods = (window.__MODS || []).slice().sort((a, b) => b.startsWith('vendor/') - a.startsWith('vendor/'));   // самые большие (three.js) — первыми
    for (const m of mods) { const l = document.createElement('link'); l.rel = 'modulepreload'; l.href = (m.startsWith('vendor/') ? 'js/' : base) + m; document.head.appendChild(l); }
  }
  await import(lang === 'ru' ? './js/main.js' : `./js_${lang}/main.js`);
})();
