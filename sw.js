// Offline support: the page and lesson data come from the network when possible (so updates show up at once)
// and from the cache when offline; hashed build assets never change, so they are served from the cache.
const CACHE = 'murphy-v1';
const SCOPE = new URL(self.registration.scope);

const isAsset = (url) => url.pathname.startsWith(`${SCOPE.pathname}assets/`) || url.pathname.startsWith(`${SCOPE.pathname}icons/`);

async function cacheAppShell() {
  const cache = await caches.open(CACHE);
  const res = await fetch(SCOPE, { cache: 'no-cache' });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put(SCOPE, res);
  const assets = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => new URL(m[1], SCOPE).href);
  await cache.addAll([...assets, new URL('manifest.webmanifest', SCOPE).href]);
  for (const req of await cache.keys()) {
    const url = new URL(req.url);
    if (url.pathname.startsWith(`${SCOPE.pathname}assets/`) && !assets.includes(req.url)) await cache.delete(req);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, key) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request, { cache: 'no-cache' });
    if (res.ok) await cache.put(key, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(key);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SCOPE.href));
  } else if (isAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request, request));
  }
});
