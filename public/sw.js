const CACHE_NAME = 'oeko-pwa-v2';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/icons/icon.svg',
  '/boutique/dashboard',
  '/boutique/ventes',
  '/boutique/produits',
  '/boutique/credits',
  '/boutique/reservations',
  '/bar/dashboard',
  '/bar/ventes',
  '/bar/produits',
  '/bar/credits',
  '/snack/dashboard',
  '/snack/ventes',
  '/snack/produits',
  '/snack/credits',
  '/commun/employes',
  '/commun/mouvements',
  '/commun/comptabilite',
  '/commun/payer'
];

// Installation : Mise en cache du squelette applicatif
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline app shell');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache partial fail:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch : Stratégie Stale-While-Revalidate avec fallback Hors-ligne
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorer les requêtes externes hors-origine si nécessaire
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Si le réseau échoue et pas de réponse en cache pour une page HTML navigation, servir la racine '/'
          if (event.request.mode === 'navigate') {
            return caches.match('/') || cachedResponse;
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Ecoute de messages pour synchronisation forcée
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
