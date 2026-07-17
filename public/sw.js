const CACHE_NAME = 'manual-sobrevivencia-pwa-v6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/cover_image.png'
];

// Install Event - Pre-cache the shell of the app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-carregando assets críticos do Bunker...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.error('[Service Worker] Falha ao pré-carregar alguns assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle offline requests with Stale-While-Revalidate and Network-First
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Skip Firebase Auth / Firestore endpoints, chrome extensions, etc.
  if (
    url.hostname.includes('firebase') || 
    url.hostname.includes('googleapis') || 
    url.hostname.includes('identitytoolkit') ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  // The PDF viewer loads the file with Range requests, which the cache can only
  // answer with a full 200 instead of the expected 206. Let them hit the network.
  if (url.pathname.endsWith('.pdf') || event.request.headers.has('range')) {
    return;
  }

  // Network-First for HTML documents and cover_image.png so updates publish immediately while online
  const isHtmlRequest = event.request.headers.get('accept')?.includes('text/html') || url.pathname === '/' || url.pathname.endsWith('/index.html');
  const isCoverImage = url.pathname.includes('cover_image.png');

  if (isHtmlRequest || isCoverImage) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache immediately, but fetch a fresh copy in the background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Ignore offline fetch failures, we already served the cached version
          });
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache the response dynamically
      return fetch(event.request)
        .then((networkResponse) => {
          // If response is invalid or not standard, don't cache
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for navigation requests (render the SPA index.html)
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        });
    })
  );
});
