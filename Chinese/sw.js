// Офлайн-кэш китайского курса. Движок берётся из ../English/js, поэтому кэшируем и его.
const CACHE = 'chinese-v1';
const FILES = ['./', 'index.html', 'css/zh.css', 'js/lang.js', 'js/data.js', 'js/drills.js', 'js/check.js', 'js/explain.js',
  'js/gloss.js', 'js/py.js', 'js/rules.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  '../English/css/style.css', '../English/js/app.js', '../English/js/store.js', '../English/js/speech.js', '../English/js/exercises.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE)
  .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k.startsWith('chinese-')).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Сначала сеть в обход HTTP-кэша браузера (чтобы обновления приходили сразу), без сети — кэш.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
    const copy = r.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
