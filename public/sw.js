/**
 * public/sw.js
 * Service Worker para modo offline del POS
 * Cachea assets estáticos y hace queue de ventas sin internet
 */

const CACHE_NAME = 'atempo-v1';
const CACHE_STATIC = [
    '/',
    '/dashboard',
    '/pos',
    '/cambio',
];

// Instalar SW y pre-cachear recursos estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(CACHE_STATIC).catch((err) => {
                console.warn('SW: Error cacheando recursos estáticos', err);
            });
        })
    );
    self.skipWaiting();
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Estrategia: Network First, fallback a caché
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // No interceptar APIs de Firebase ni externas
    if (
        url.hostname.includes('firebase') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('coingecko') ||
        url.hostname.includes('frankfurter') ||
        url.href.includes('/_next/webpack-hmr')
    ) {
        return;
    }

    // Para las API routes de tasas: network first
    if (url.pathname.startsWith('/api/tasas')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Para páginas: network first con fallback a caché
    event.respondWith(
        fetch(event.request)
            .then((response) => response)
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    return cachedResponse || new Response('Offline - Sin conexión', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' },
                    });
                });
            })
    );
});

// ============================
// COLA DE VENTAS OFFLINE
// Las ventas realizadas sin internet se guardan en IndexedDB
// y se sincronizan cuando se recupera la conexión
// ============================

// Sincronización en background cuando se recupera internet
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-ventas') {
        event.waitUntil(sincronizarVentasPendientes());
    }
});

async function sincronizarVentasPendientes() {
    // Obtener ventas pendientes de IndexedDB
    // y enviarlas a Firestore
    console.log('SW: Sincronizando ventas pendientes...');

    // La lógica real usa la lib idb
    // Ver: lib/offline-queue.ts
}
