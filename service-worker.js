const CACHE_NAME = 'kouki-memo-v1';
const urlsToCache = [
  '/kokimemo/',
  '/kokimemo/index.html',
  '/kokimemo/style.css',
  '/kokimemo/script.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
