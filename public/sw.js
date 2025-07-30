const CACHE_NAME = 'shop-manager-v1';
const STATIC_CACHE = 'shop-manager-static-v1';
const DYNAMIC_CACHE = 'shop-manager-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/static/css/',
  '/static/js/',
  '/_next/static/',
  '/api/'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.log('[SW] Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Clone the response for caching
    const responseClone = networkResponse.clone();
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No internet connection. Please check your connection and try again.' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for static request:', request.url);
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // Return a simple offline message for other requests
    return new Response('Offline', { status: 503 });
  }
}

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncOfflineSales());
  }
});

// Sync offline sales when connection is restored
async function syncOfflineSales() {
  try {
    console.log('[SW] Syncing offline sales...');
    
    // Get offline sales from IndexedDB
    const offlineSales = await getOfflineSales();
    
    if (offlineSales.length === 0) {
      console.log('[SW] No offline sales to sync');
      return;
    }
    
    // Sync each sale
    for (const sale of offlineSales) {
      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale)
        });
        
        if (response.ok) {
          // Remove from offline storage
          await removeOfflineSale(sale.id);
          console.log('[SW] Synced sale:', sale.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync sale:', sale.id, error);
      }
    }
    
    console.log('[SW] Sync complete');
  } catch (error) {
    console.log('[SW] Sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getOfflineSales() {
  // This would be implemented with IndexedDB
  // For now, return empty array
  return [];
}

async function removeOfflineSale(saleId) {
  // This would be implemented with IndexedDB
  // For now, just log
  console.log('[SW] Removing offline sale:', saleId);
}
