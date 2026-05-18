const CACHE_NAME = 'fleetpro-admin-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API requests (always go to network)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api')) {
    return;
  }

  // For navigation requests (HTML pages), network-first with fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback: serve cached index.html
          // The slug-recovery script in index.html will restore ?company= from localStorage
          return caches.match('/index.html');
        })
    );
    return;
  }

  // For static assets, cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── App Badge: update badge count from push messages ─────────────────────────
// When a push arrives with { badgeCount: N }, update the app badge.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }

  const count = payload.badgeCount ?? 0;
  const title = payload.title || 'FleetPro Alert';
  const body  = payload.body  || 'You have new alerts.';

  const badgePromise = 'setAppBadge' in self.navigator
    ? (count > 0
        ? self.navigator.setAppBadge(count)
        : self.navigator.clearAppBadge())
    : Promise.resolve();

  const notifPromise = self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    tag: 'fleetpro-alert',
    renotify: true,
    data: { url: payload.url || '/' },
  });

  event.waitUntil(Promise.all([badgePromise, notifPromise]));
});

// Open app when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(target) && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    })
  );
});
