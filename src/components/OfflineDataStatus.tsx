'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getOfflineDataStatus, cacheEssentialData, clearCachedData } from '@/lib/offlineDataManager';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

export default function OfflineDataStatus() {
  const { t } = useTranslation();
  const { isOnline } = useConnectionStatus();
  const [status, setStatus] = useState<any>(null);
  const [isCaching, setIsCaching] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const dataStatus = getOfflineDataStatus();
      setStatus(dataStatus);
    };

    updateStatus();
    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCacheData = async () => {
    if (!isOnline) {
      alert(t('offline.cannotCacheOffline', 'Cannot cache data while offline'));
      return;
    }

    setIsCaching(true);
    try {
      await cacheEssentialData();
      const newStatus = getOfflineDataStatus();
      setStatus(newStatus);
      console.log('[Offline] Data cached successfully');
    } catch (error) {
      console.error('[Offline] Failed to cache data:', error);
      alert(t('offline.cacheFailed', 'Failed to cache data. Please try again.'));
    } finally {
      setIsCaching(false);
    }
  };

  const handleClearCache = () => {
    if (confirm(t('offline.confirmClearCache', 'Are you sure you want to clear all cached data?'))) {
      clearCachedData();
      const newStatus = getOfflineDataStatus();
      setStatus(newStatus);
      console.log('[Offline] Cache cleared');
    }
  };

  if (!status) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-blue-900">
            {t('offline.dataStatus', 'Offline Data Status')}
          </h3>
          <div className="mt-2 space-y-1 text-xs text-blue-700">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${
                status.products.cached ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span>
                {t('offline.products', 'Products')}: {status.products.cached ? 
                  `${status.products.count} cached` : 
                  t('offline.notCached', 'Not cached')
                }
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${
                status.units.cached ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span>
                {t('offline.units', 'Units')}: {status.units.cached ? 
                  `${status.units.count} cached` : 
                  t('offline.notCached', 'Not cached')
                }
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${
                status.shopSettings.cached ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span>
                {t('offline.shopSettings', 'Shop Settings')}: {status.shopSettings.cached ? 
                  t('offline.cached', 'Cached') : 
                  t('offline.notCached', 'Not cached')
                }
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleCacheData}
            disabled={!isOnline || isCaching}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCaching ? t('offline.caching', 'Caching...') : t('offline.cacheNow', 'Cache Now')}
          </button>
          <button
            onClick={handleClearCache}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            {t('offline.clearCache', 'Clear')}
          </button>
        </div>
      </div>
    </div>
  );
} 