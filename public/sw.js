const CACHE_NAME = 'oeko-pwa-v3';
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
      // Intégration robuste avec Promise.allSettled pour ne pas bloquer si 1 asset échoue
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[ServiceWorker] Échec pré-cache pour:', url, err);
          })
        )
      );
    })
  );
  // Passer l'attente pour activer immédiatement la nouvelle version
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

// Fetch : Stratégies adaptées pour mises à jour automatiques et mode hors-ligne
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorer les requêtes hors origine (ex: Supabase, APIs externes)
  if (url.origin !== self.location.origin) return;

  // Stratégie 1: Navigation HTML -> Network-First (avec Fallback Cache Hors-Ligne)
  // Garantit d'obtenir la toute dernière version de la page si en ligne, ou le cache si hors-ligne
  if (event.request.mode === 'navigate') {
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
          // Si le réseau échoue (hors-ligne), servir le cache de la page ou la racine '/'
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }

  // Stratégie 2: Ressources statiques (JS, CSS, images, icônes) -> Stale-While-Revalidate
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
        .catch(() => cachedResponse);

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

