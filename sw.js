const CACHE_NAME = 'scenicone-v2';
const STATIC_CACHE = 'scenicone-static-v2';
const IMAGE_CACHE = 'scenicone-images-v2';
const FONT_CACHE = 'scenicone-fonts-v2';
const ENQUIRY_DB = 'scenicone-sync-db';
const ENQUIRY_STORE = 'enquiries';
const ENQUIRY_SYNC_TAG = 'scenicone-enquiry-sync';
const IMAGE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/about.html',
  '/products.html',
  '/enquiry.html',
  '/contact.html',
  '/css/global.css',
  '/css/home.css',
  '/css/pages.css',
  '/css/products.css',
  '/js/global.js',
  '/js/home.js',
  '/js/products.js',
  '/js/enquiry.js',
  '/assets/images/placeholder.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const validCaches = [CACHE_NAME, STATIC_CACHE, IMAGE_CACHE, FONT_CACHE];
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (!validCaches.includes(key)) {
        return caches.delete(key);
      }
      return Promise.resolve();
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'POST' && url.origin === self.location.origin && url.pathname.includes('enquiry')) {
    event.respondWith(handleEnquiryPost(request));
    return;
  }

  if (isExternalRequest(url)) {
    event.respondWith(fetch(request).catch(() => new Response('', { status: 204 })));
    return;
  }

  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstHTML(request));
    return;
  }

  if (isFontRequest(url)) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  if (isStyleOrScript(request)) {
    event.respondWith(cacheFirstSWR(request, STATIC_CACHE, event));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(imageCacheWithExpiry(request));
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

self.addEventListener('sync', (event) => {
  if (event.tag === ENQUIRY_SYNC_TAG) {
    event.waitUntil(flushQueuedEnquiries());
  }
});

self.addEventListener('push', () => {
  // reserved for future push payload handling
});

self.addEventListener('notificationclick', (event) => {
  event.notification?.close();
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (allClients.length) {
      allClients[0].focus();
      return;
    }
    await clients.openWindow('/');
  })());
});

function isExternalRequest(url) {
  return url.origin !== self.location.origin && !isFontRequest(url);
}

function isFontRequest(url) {
  const host = (url.hostname || '').toLowerCase();
  return host === 'fonts.googleapis.com'
    || host.endsWith('.fonts.googleapis.com')
    || host === 'fonts.gstatic.com'
    || host.endsWith('.fonts.gstatic.com');
}

function isStyleOrScript(request) {
  return request.destination === 'style' || request.destination === 'script';
}

async function networkFirstHTML(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match('/index.html') || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

async function cacheFirstSWR(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkUpdate = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  event.waitUntil(networkUpdate);

  if (cached) return cached;
  return networkUpdate.then((response) => response || new Response('', { status: 504 }));
}

async function imageCacheWithExpiry(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached && !isExpired(cached)) {
    return cached;
  }

  try {
    const response = await fetch(request);
    const stamped = await stampResponse(response);
    await cache.put(request, stamped.clone());
    return stamped;
  } catch {
    if (cached) return cached;
    return caches.match('/assets/images/placeholder.jpg') || new Response('', { status: 404 });
  }
}

function isExpired(response) {
  const cachedAt = Number(response.headers.get('sw-cache-time') || 0);
  if (!cachedAt) return true;
  return Date.now() - cachedAt > IMAGE_MAX_AGE;
}

async function stampResponse(response) {
  const blob = await response.blob();
  const headers = new Headers(response.headers);
  headers.set('sw-cache-time', String(Date.now()));
  return new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function handleEnquiryPost(request) {
  try {
    return await fetch(request.clone());
  } catch {
    const payload = await serializeRequest(request);
    await enqueueEnquiry(payload);
    await registerEnquirySync();
    return new Response(JSON.stringify({ queued: true, offline: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function serializeRequest(request) {
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  let bodyText = '';
  try {
    bodyText = await request.clone().text();
  } catch {
    bodyText = '';
  }
  return {
    url: request.url,
    method: request.method,
    headers,
    bodyText,
    timestamp: Date.now()
  };
}

async function registerEnquirySync() {
  if ('sync' in self.registration) {
    try {
      await self.registration.sync.register(ENQUIRY_SYNC_TAG);
    } catch {
      await flushQueuedEnquiries();
    }
  } else {
    await flushQueuedEnquiries();
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ENQUIRY_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ENQUIRY_STORE)) {
        db.createObjectStore(ENQUIRY_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueEnquiry(data) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(ENQUIRY_STORE, 'readwrite');
    tx.objectStore(ENQUIRY_STORE).add(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function readAllEnquiries() {
  const db = await openDb();
  const records = await new Promise((resolve, reject) => {
    const tx = db.transaction(ENQUIRY_STORE, 'readonly');
    const req = tx.objectStore(ENQUIRY_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return records;
}

async function deleteEnquiry(id) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(ENQUIRY_STORE, 'readwrite');
    tx.objectStore(ENQUIRY_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function flushQueuedEnquiries() {
  const entries = await readAllEnquiries();
  for (const entry of entries) {
    try {
      await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.bodyText
      });
      await deleteEnquiry(entry.id);
    } catch {
      // keep queued for next sync attempt
    }
  }
}
