'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { getPendingSyncCount, getOfflineSalesSummary, syncOfflineSales } from '@/lib/offlineSalesManager';

export default function PendingSyncIndicator() {
  const { t } = useTranslation();
  const { isOnline } = useConnectionStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const count = await getPendingSyncCount();
        const salesSummary = await getOfflineSalesSummary();
        
        setPendingCount(count);
        setSummary(salesSummary);
      } catch (error) {
        console.error('[Offline] Failed to update sync status:', error);
      }
    };

    updateStatus();
    // Update every 10 seconds
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      alert(t('offline.cannotSyncOffline', 'Cannot sync while offline'));
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncOfflineSales();
      console.log('[Offline] Manual sync result:', result);
      
      // Update status after sync
      const newCount = await getPendingSyncCount();
      const newSummary = await getOfflineSalesSummary();
      setPendingCount(newCount);
      setSummary(newSummary);
      
      if (result.success > 0) {
        alert(t('offline.syncSuccess', `Successfully synced ${result.success} sales`));
      } else if (result.failed > 0) {
        alert(t('offline.syncPartial', `Synced ${result.success} sales, ${result.failed} failed`));
      }
    } catch (error) {
      console.error('[Offline] Manual sync failed:', error);
      alert(t('offline.syncFailed', 'Sync failed. Please try again.'));
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
          <div>
            <p className="text-sm font-medium text-yellow-900">
              {t('offline.pendingSync', 'Pending Sync')}
            </p>
            <p className="text-xs text-yellow-700">
              {t('offline.salesPending', '{{count}} sales pending sync', { count: pendingCount })}
              {summary && (
                <span className="ml-2">
                  • {t('offline.totalAmount', '₹{{amount}}', { amount: summary.totalAmount.toFixed(2) })}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing}
            className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? t('offline.syncing', 'Syncing...') : t('offline.syncNow', 'Sync Now')}
          </button>
        </div>
      </div>
    </div>
  );
} 