importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  console.log(`Workbox berhasil dimuat 🎉`);
} else {
  console.log(`Workbox gagal dimuat 😬`);
}

// Lewati fase waiting dan langsung aktif
self.skipWaiting();
workbox.core.clientsClaim();

// Precache semua file yang di-generate oleh Webpack
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// Caching file eksternal dari CDN (JS/WASM) dengan CacheFirst
workbox.routing.registerRoute(
  ({ url }) => url.href.startsWith('https://unpkg.com/') || url.href.startsWith('https://cdn.jsdelivr.net/'),
  new workbox.strategies.CacheFirst({
    cacheName: 'cdn-scripts-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Hari
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Caching file model TF lokal (.json, .bin) dengan CacheFirst
workbox.routing.registerRoute(
  ({ url }) => url.pathname.includes('/model/'),
  new workbox.strategies.CacheFirst({
    cacheName: 'tf-model-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Hari
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Caching Google Fonts dengan StaleWhileRevalidate
workbox.routing.registerRoute(
  ({ url }) => url.href.startsWith('https://fonts.'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'fonts-cache',
  })
);

// Mendaftarkan fallback untuk navigasi (SPA offline support)
workbox.routing.registerRoute(
  new workbox.routing.NavigationRoute(
    workbox.precaching.createHandlerBoundToURL('/index.html')
  )
);
