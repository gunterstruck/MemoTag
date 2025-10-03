const CACHE_NAME = 'sprach-tagebuch-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './sw.js',
  './icon-192.png',
  './icon-512.png',
  './screenshots/shot1.png',
  './screenshots/shot2.png'
];

// Installation - Cache erstellen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Aktivierung - Alte Caches löschen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

// Optional: sofortige Aktivierung auf Message
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Fetch - Navigationsfreundliche Strategie
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API-Calls nicht cachen
  if (url.hostname.includes('api.anthropic.com') ||
      url.hostname.includes('api.openai.com') ||
      url.hostname.includes('generativelanguage.googleapis.com')) {
    return; // passthrough
  }

  // Navigations-Anfragen: Network-first, Fallback auf Cache, dann offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request);
        // Optional: im Hintergrund cachen
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(event.request);
        return cached || caches.match('./offline.html');
      }
    })());
    return;
  }

  // Sonstige GETs: Cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
      if (!resp || resp.status !== 200 || resp.type === 'error') return resp;
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return resp;
    })).catch(() => new Response('Offline - keine Verbindung', { status: 503, headers: { 'Content-Type': 'text/plain' } }))
  );
});
