// Kana Dojo — service worker : garde une copie de l'appli sur le téléphone pour qu'elle
// s'ouvre sans réseau. Stratégie « réseau d'abord » (3 s max) : en ligne on a toujours la
// dernière version, hors ligne (ou réseau trop lent) on sert la copie locale.
// La progression n'est PAS ici : elle vit dans le localStorage, jamais touché par ce fichier.
const CACHE = 'kana-dojo-v6';
const FILES = [
  './', 'index.html', 'styles.css', 'kana-dojo.js', 'manifest.webmanifest',
  'content/words.json',
  'fonts/nunito_semibold.ttf', 'fonts/nunito_extrabold.ttf', 'fonts/nunito_black.ttf',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    try {
      return await Promise.race([network, timeout(3000)]);
    } catch (e) {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      return network; // ni copie ni réseau rapide : on attend quand même le réseau
    }
  })());
});
