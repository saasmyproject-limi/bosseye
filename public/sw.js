const CACHE_NAME = 'oeko-pwa-v4';
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

// Installation : Mise en cache robuste et silencieuse du squelette applicatif
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installation de la nouvelle version PWA...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[ServiceWorker] Échec pré-cache pour:', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activation : Nettoyage automatique des anciens caches & prise de contrôle immédiate
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activation de la nouvelle version PWA...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Suppression de l\'ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch : Stratégies ultra-rapides (Stale-While-Revalidate) pour chargement instantané 0ms
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorer les requêtes hors origine (ex: Supabase, APIs externes)
  if (url.origin !== self.location.origin) return;

  // Stratégie Stale-While-Revalidate pour la navigation HTML et ressources statiques
  // Renvoie immédiatement la version en cache (0ms) et met à jour silencieusement en arrière-plan
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('[ServiceWorker] Erreur réseau fetch, fallback cache.', err);
          return cachedResponse || caches.match('/');
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Écoute de messages pour synchronisation & forçage silencieux si nécessaire
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    self.registration.update();
  }
});

