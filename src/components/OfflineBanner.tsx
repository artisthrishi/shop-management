'use client';

import { useState, useEffect } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useTranslation } from 'react-i18next';

export default function OfflineBanner() {
  const { isOnline } = useConnectionStatus();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on server-side or before mounting
  if (!mounted || isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <div>
            <p className="font-medium text-sm">
              {t('offline.youAreOffline', 'You are offline')}
            </p>
            <p className="text-xs opacity-90">
              {t('offline.capabilities', 'You can still search products and manage cart. Sales will be saved locally and synced when online.')}
            </p>
          </div>
        </div>
        <div className="text-xs opacity-75">
          {t('offline.autoSync', 'Auto-sync when online')}
        </div>
      </div>
    </div>
  );
} 