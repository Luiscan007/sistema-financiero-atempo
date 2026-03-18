/**
 * public/sw.js
 * Service Worker ATEMPO — modo offline real
 * - Cachea assets estáticos y páginas principales
 * - Intercepta ventas offline y las sincroniza al reconectar
 */

const CACHE_NAME = 'atempo-v2';
const CACHE_STATIC = ['/', '/dashboard', '/pos', '/cambio', '/estudio'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(CACHE_STATIC).catch(err =>
        console.warn('SW: Error cacheando recursos', err)
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // No interceptar Firebase, APIs externas ni HMR
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('coingecko') ||
    url.hostname.includes('frankfurter') ||
    url.hostname.includes('twilio') ||
    url.hostname.includes('groq') ||
    url.href.includes('/_next/webpack-hmr')
  ) return;

  // API de tasas: Network First con cache fallback
  if (url.pathname.startsWith('/api/tasas')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Todo lo demás: Network First, fallback a caché
  event.respondWith(
    fetch(event.request)
      .then(res => res)
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || new Response('Sin conexión — abre el POS para ventas offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          })
        )
      )
  );
});

// Background Sync — sincronizar ventas al reconectar
self.addEventListener('sync', event => {
  if (event.tag === 'sync-ventas') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client =>
          client.postMessage({ type: 'SYNC_VENTAS' })
        );
      })
    );
  }
});

// Recibir mensaje de la app para forzar sync
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
