// Офлайн-кэш для установки как приложения. Сеть первична: свежая версия с GitHub Pages всегда в приоритете,
// кэш — только когда сети нет. Версию менять не нужно: кэш обновляется при каждом успешном запросе.
// no-cache: браузер сверяет файл с сайтом каждый раз, иначе свою копию держит до 10 минут (так отдаёт GitHub Pages).
const CACHE = 'snowschool-v1';
const CORE = ['./', './index.html', './style.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './vendor/three.module.min.js', './js/lectures.js', './js/lessons.js', './js/main.js', './js/mistakes.js', './js/pauses.js', './js/rider.js', './js/sfx.js', './js/sim.js', './js/slopecards.js', './js/tracks.js', './js/world.js', './js/art/body.js', './js/art/gear.js', './js/art/kit.js', './js/art/scenery.js', './js/art/textures.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
