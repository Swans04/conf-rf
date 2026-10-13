/* ============================================================================
   SERVICE WORKER
   Кэширует все ресурсы приложения — работает оффлайн.
   ============================================================================ */

const CACHE_NAME = 'conf-rf-v1';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './utils.js',
  './db.js',
  './seed.js',
  './navigation.js',
  './render.js',
  './modals.js',
  './notify.js',
  './calendar.js',
  './queries.js',
  './events.js',
  './init.js',
  './admin.js'
];

/* Установка — кэшируем всё сразу */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(() => {
            console.warn('SW: не удалось закэшировать', url);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* Активация — удаляем старые кэши */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Перехват запросов:
   1. Сначала пытаемся отдать из кэша (мгновенно).
   2. Параллельно идёт запрос в сеть — если получилось, обновляем кэш.
   3. Если сети нет — отдаём из кэша. */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

/* Сообщение от клиента — пропустить ожидание нового SW */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});