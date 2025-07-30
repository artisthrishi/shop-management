'use client';

import { useState, useEffect } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useTranslation } from 'react-i18next';

export default function ConnectionIndicator() {
  const { isOnline, isConnecting } = useConnectionStatus();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on server-side or before mounting
  if (!mounted || (isOnline && !isConnecting)) return null;

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${
        isOnline 
          ? 'bg-green-500' 
          : isConnecting 
            ? 'bg-yellow-500 animate-pulse' 
            : 'bg-red-500'
      }`}></div>
      <span className="text-xs font-medium">
        {isOnline 
          ? t('connection.online', 'Online')
          : isConnecting 
            ? t('connection.connecting', 'Connecting...')
            : t('connection.offline', 'Offline')
        }
      </span>
    </div>
  );
} 