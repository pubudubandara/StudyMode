// Service Worker for offline support
const CACHE_NAME = 'studymode-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/login',
  '/signup',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension:// and other non-http(s) URLs
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip Next.js HMR and internal requests
  if (url.pathname.includes('/_next/webpack-hmr') || 
      url.pathname.includes('/__nextjs_original-stack-frames') ||
      url.pathname.includes('/_next/static/hmr')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              // Only cache successful responses from our domain
              if (url.origin === location.origin) {
                cache.put(event.request, responseToCache).catch(err => {
                  console.log('Cache put failed:', err);
                });
              }
            });

          return response;
        }).catch(() => {
          // Return offline page or cached response
          return caches.match('/dashboard');
        });
      })
  );
});

// Listen for sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sessions') {
    event.waitUntil(syncSessions());
  }
});

async function syncSessions() {
  // This will be triggered when connection is restored
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_SESSIONS'
    });
  });
}
