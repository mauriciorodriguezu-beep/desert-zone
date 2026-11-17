/* sw.js — guarda una copia del juego en el teléfono para que funcione sin internet.
   Con internet siempre baja la versión más nueva; sin internet usa la copia guardada.
   Al publicar una versión nueva, cambiar el número de CACHE. */
const CACHE = 'desert-zone-v0.15';
const ARCHIVOS = [
  './', 'index.html', 'datos.js', 'juego.js', 'phaser.min.js', 'manifest.webmanifest',
  'iconos/icono-32.png', 'iconos/icono-180.png', 'iconos/icono-192.png', 'iconos/icono-512.png', 'iconos/icono.ico'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    // 'no-cache' obliga a consultar al servidor: sin esto el navegador puede servir una copia de hasta 10 minutos
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
