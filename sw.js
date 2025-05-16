// sw.js

const CACHE_NAME = 'sensor-viewer-cache-v1';
const urlsToCache = [
  './', // index.html をキャッシュ (start_urlが'./'の場合)
  './index.html',
  './manifest.json',
  // CSSファイルや主要なJSファイル、アイコンなどもここに追加
  // './style.css',
  // './app.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://unpkg.com/@material/web/all.js?module', // CDNもキャッシュ可能だが、更新に注意
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
];

self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[ServiceWorker] Cache.addAll failed:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  // 古いキャッシュを削除する処理などをここに追加することが多い
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  console.log('[ServiceWorker] Fetch', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあればそれを返す (Cache First戦略)
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});