const CACHE_NAME = 'manual-sobrevivencia-pwa-v8';
// Assets are content-hashed and never negotiated, so a Vary header (e.g. "Vary: Origin" on
// module scripts) must not stop a cached copy from being served offline
const MATCH_OPTIONS = { ignoreVary: true };

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/capa-manual-5p.jpg'
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

// Message Event - The page lists assets it loaded before this worker controlled it
// (see src/lib/precacheAssets.ts); cache the ones still missing so the app opens offline
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'CACHE_URLS' || !Array.isArray(event.data.urls)) {
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        event.data.urls.map((url) => {
          const target = new URL(url, self.location.origin);
          if (target.origin !== self.location.origin) {
            return undefined;
          }
          return cache.match(target.href, MATCH_OPTIONS).then((hit) => hit || cache.add(target.href).catch(() => {}));
        })
      )
    )
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

  // Network-First for HTML documents and the cover image so updates publish immediately while online
  const isHtmlRequest = event.request.headers.get('accept')?.includes('text/html') || url.pathname === '/' || url.pathname.endsWith('/index.html');
  const isCoverImage = url.pathname.includes('capa-manual-5p');

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
        .catch(() =>
          caches.match(event.request, MATCH_OPTIONS).then((cached) => {
            // SPA routes such as /workbook all render index.html: when this exact URL was
            // never cached, fall back to the cached app shell so it still opens offline
            if (cached || !isHtmlRequest) return cached;
            return caches.match('/', MATCH_OPTIONS);
          })
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, MATCH_OPTIONS).then((cachedResponse) => {
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
            return caches.match('/', MATCH_OPTIONS);
          }
        });
    })
  );
});
