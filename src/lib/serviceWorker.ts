export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service Worker not supported');
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('[SW] Service Worker registered successfully:', registration);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New content is available; please refresh.');
                // You could show a notification to the user here
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });
  });
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.unregister();
    })
    .catch((error) => {
      console.error('[SW] Service Worker unregistration failed:', error);
    });
}

// Request background sync for offline data
export async function requestBackgroundSync(tag: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if ('sync' in registration) {
      await (registration as any).sync.register(tag);
      console.log('[SW] Background sync requested:', tag);
      return true;
    } else {
      console.log('[SW] Background sync not supported');
      return false;
    }
  } catch (error) {
    console.error('[SW] Background sync request failed:', error);
    return false;
  }
}

// Check if service worker is active
export function isServiceWorkerActive(): boolean {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  return !!navigator.serviceWorker.controller;
} 