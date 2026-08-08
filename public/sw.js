/*
 * Service worker Fixtura — résilience hors-ligne de l'écran public (issue #40).
 *
 * Objectif : que l'écran public (souvent projeté / consulté sur mobile avec un
 * réseau instable au bord des terrains) reste affichable même en cas de coupure,
 * SANS repli polling (cf. CLAUDE.md §13). Le SSE se reconnecte tout seul quand le
 * réseau revient ; le service worker ne fait que servir la dernière version connue.
 *
 * Stratégies :
 *  - navigations (HTML) : réseau d'abord, repli sur la dernière page en cache ;
 *  - assets hashés Vite (`/assets/…`) : cache d'abord (immuables) ;
 *  - polices / icônes / manifeste : stale-while-revalidate ;
 *  - flux SSE (`/__transmit/…`) : jamais intercepté ;
 *  - reste (XHR Inertia, etc.) : laissé au réseau (pas de cache, pas de staleness).
 */
const VERSION = 'v1'
const CACHE = `fixtura-${VERSION}`
const PRECACHE = ['/manifest.webmanifest', '/icons/icon.svg', '/fonts/inter-latin-wght-normal.woff2']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function putInCache(request, response) {
  const copy = response.clone()
  caches.open(CACHE).then((cache) => cache.put(request, copy))
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Ne jamais toucher au flux temps réel.
  if (url.pathname.startsWith('/__transmit')) return

  // Navigations : réseau d'abord (données fraîches), repli cache hors-ligne.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => putInCache(request, response))
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // Assets hashés (immuables) : cache d'abord.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches
        .match(request)
        .then((cached) => cached || fetch(request).then((response) => putInCache(request, response)))
    )
    return
  }

  // Polices / icônes / manifeste : stale-while-revalidate.
  if (
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => putInCache(request, response))
          .catch(() => cached)
        return cached || network
      })
    )
  }
})
