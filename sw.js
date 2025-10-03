const CACHE_NAME = 'memotag-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache provider API calls
  if (
    request.url.includes('api.openai.com') ||
    request.url.includes('anthropic.com') ||
    request.url.includes('generativelanguage.googleapis.com')
  ) {
    return;
  }

  // Navigation fallback: serve cached index.html when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('./index.html').then((resp) => resp || Response.error())
      )
    );
    return;
  }

  // Cache-first for other requests
  event.respondWith(
    caches.match(request).then(
      (resp) =>
        resp ||
        fetch(request).catch(() => new Response('Offline – keine Verbindung'))
    )
  );
});
