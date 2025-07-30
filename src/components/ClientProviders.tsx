// ============================================================================
// Context for Cursor AI – Shop Manager MVP - ClientProviders for modal context
// ============================================================================
'use client';

import React, { createContext, useState, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { registerServiceWorker } from '@/lib/serviceWorker';
import { cacheEssentialData, hasFreshCachedData } from '@/lib/offlineDataManager';

export const ModalContext = createContext({
  modalOpen: false,
  setModalOpen: (_open: boolean) => {},
});

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <ModalContext.Provider value={{ modalOpen, setModalOpen }}>
      {children}
    </ModalContext.Provider>
  );
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker for offline functionality
    registerServiceWorker();
    
    // Cache essential data for offline use
    const initializeOfflineData = async () => {
      try {
        // Check if we already have fresh cached data
        if (!hasFreshCachedData()) {
          console.log('[Offline] Caching essential data on app load...');
          await cacheEssentialData();
        } else {
          console.log('[Offline] Fresh cached data already available');
        }
      } catch (error) {
        console.error('[Offline] Failed to initialize offline data:', error);
      }
    };

    initializeOfflineData();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <ModalProvider>
        {children}
      </ModalProvider>
    </I18nextProvider>
  );
} 