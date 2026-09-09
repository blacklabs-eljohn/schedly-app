/**
 * Schedly True Offline-First Service Worker
 * 
 * Features:
 * - Pre-caches essential app shell assets on install
 * - Cache-First strategy for static JS/CSS bundles, fonts, and images (instant <20ms loads)
 * - Stale-While-Revalidate for navigation/HTML requests with instant offline fallback
 * - Excludes Supabase API and AI Vision endpoints from caching
 * - Instant activation & client claiming for seamless updates
 */

const CACHE_VERSION = 'v4';
const STATIC_CACHE = `schedly-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `schedly-runtime-${CACHE_VERSION}`;

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
  '/splash-3.png'
];

// Install Event: Pre-cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated cache versions immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First for assets, Instant Cache-First with Background Revalidate for Navigation
self.addEventListener('fetch', (event) => {
  // Only handle GET requests with HTTP/HTTPS
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);

  // Never cache Supabase, Gemini AI, or external API endpoints
  if (
    url.hostname.includes('supabase.co') || 
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('generativelanguage.googleapis.com')
  ) {
    return;
  }

  // 1. Navigation (HTML Pages): Cache-First for 0ms instant launch + background revalidation (fixes weak Wi-Fi / Lie-Fi hang)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Fast-path: Check local cache first for instant opening
        const cachedIndex = (await caches.match('/index.html')) || (await caches.match('/'));

        // Background fetch to silently keep the app shell up to date
        const networkUpdatePromise = fetch(event.request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(STATIC_CACHE);
              cache.put('/index.html', networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        // If we already have index.html cached, return it instantly (0-5ms load time)
        if (cachedIndex) {
          return cachedIndex;
        }

        // Otherwise (first-time load before cache is primed), await network with a 3-second safety timeout
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
        const networkResponse = await Promise.race([networkUpdatePromise, timeoutPromise]);

        if (networkResponse) {
          return networkResponse;
        }

        // Fallback if network timed out or offline
        const fallback = (await caches.match('/index.html')) || (await caches.match('/'));
        if (fallback) return fallback;

        return new Response('Schedly Offline', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      })()
    );
    return;
  }

  // 2. Static Assets (JS chunks, CSS, Images, Fonts): Cache-First Strategy
  const isStaticAsset = 
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.webp') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          return cached;
        }

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Check static cache as fallback
          const staticMatch = await caches.match(event.request);
          if (staticMatch) return staticMatch;
          throw err;
        }
      })
    );
    return;
  }

  // 3. All other requests: Stale-While-Revalidate
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
