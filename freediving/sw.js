// Офлайн-кэш: сеть первична (свежая версия с GitHub Pages), кэш — когда сети нет (таймер у бассейна).
const CACHE = 'freedive-v1';
const CORE = ['./', './index.html', './style.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './vendor/three.module.min.js',
  './js/main.js', './js/scene.js', './js/diver.js', './js/anims.js', './js/anatomy.js', './js/content.js', './js/kit.js', './js/store.js', './js/tables.js', './js/workout.js', './js/sfx.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
