/**
 * FloodGuard AI — Service Worker (PWA Offline Support & Cache)
 */
const CACHE_NAME = 'floodguard-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/map',
  '/static/manifest.json',
  '/static/css/styles.css',
  '/static/js/api.js',
  '/static/js/map_dashboard.js',
  '/static/js/historico_defesa_civil.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições de API ou métodos não-GET para garantir dados sempre atualizados
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
