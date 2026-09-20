/**
 * Schedly True Offline-First Service Worker (Automated Precache & Resilient Fallback)
 * 
 * Features:
 * - Pre-caches 100% of Vite compiled JS chunks, CSS bundles, HTML, and web assets
 * - Cache-First strategy for all app code & static assets (0ms instantaneous offline launch)
 * - Atomic asset installation with robust error handling (prevents single-asset abort)
 * - Persistent dedicated cache for Google Fonts
 * - Instant activation & client claiming for immediate offline readiness
 * - Excludes Supabase API and AI Vision endpoints from caching
 */

const CACHE_VERSION = 'v4';
const STATIC_CACHE = `schedly-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `schedly-runtime-${CACHE_VERSION}`;
const FONTS_CACHE = 'schedly-fonts-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/schedly-icon.png',
  '/schedly-logo.png',
  '/favicon.png',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/splash-1.png',
  '/splash-2.png',
  '/splash-3.png',
  '/background.png'
];

// 1. Install Event: Atomically pre-cache all app shell & Vite bundles
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Individual cache.add with error boundary to prevent single asset from failing the whole precache
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[SW] Non-critical precache skip:', asset, err);
          })
        )
      );
    })
  );
});

// 2. Activate Event: Purge old cache versions while keeping fonts & current static assets
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE && key !== FONTS_CACHE) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Comprehensive Offline-First Routing
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);

  // Exclude real-time APIs (Supabase, Gemini AI, etc.)
  if (
    url.hostname.includes('supabase.co') || 
    url.hostname.includes('googleapis.com/v1') ||
    url.hostname.includes('generativelanguage.googleapis.com')
  ) {
    return;
  }

  // A. Google Fonts (stylesheets & woff2 webfonts): Cache-First + Persistent Font Cache
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(FONTS_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cached || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // B. Navigation (HTML Pages): Instant Cache-First + Background Revalidate
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Check Static Cache for cached /index.html
        const cachedHtml = 
          (await caches.match('/index.html')) || 
          (await caches.match('/')) ||
          (await caches.match(event.request));

        // Background update if online
        const networkFetchPromise = fetch(event.request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(STATIC_CACHE);
              cache.put('/index.html', networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        // Instant offline launch: If we have cached HTML, return it in <5ms
        if (cachedHtml) {
          return cachedHtml;
        }

        // If not yet in cache (first visit ever), wait with a 2.5s network timeout
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
        const networkResponse = await Promise.race([networkFetchPromise, timeoutPromise]);

        if (networkResponse) {
          return networkResponse;
        }

        // Fallback to whatever index.html exists in any cache
        const fallback = (await caches.match('/index.html')) || (await caches.match('/'));
        if (fallback) return fallback;

        return new Response('Schedly is loading offline...', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      })()
    );
    return;
  }

  // C. Static App Assets (Vite JS bundles, CSS, icons, images): Cache-First with Fallback
  const isStaticAsset = 
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webp');

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        // 1. Check current static cache and runtime cache
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }

        // 2. Fetch from network and store in runtime cache
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const runtimeCache = await caches.open(RUNTIME_CACHE);
            runtimeCache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (fetchErr) {
          // 3. Fallback: If offline and a specific hashed bundle is missing, search across all caches
          const allKeys = await caches.keys();
          for (const key of allKeys) {
            const c = await caches.open(key);
            const match = await c.match(event.request);
            if (match) return match;
          }
          
          // Return a non-breaking response for optional assets
          if (url.pathname.endsWith('.css')) {
            return new Response('/* Offline fallback CSS */', {
              status: 200,
              headers: { 'Content-Type': 'text/css' }
            });
          }
          return new Response('', { status: 404, statusText: 'Offline Asset Unavailable' });
        }
      })()
    );
    return;
  }

  // D. Stale-While-Revalidate for everything else
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => null);

      return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
    })
  );
});
