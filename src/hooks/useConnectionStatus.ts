import { useState, useEffect } from 'react';

export interface ConnectionStatus {
  isOnline: boolean;
  isConnecting: boolean;
  lastOnline: Date | null;
}

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: true, // Default to online for SSR
    isConnecting: false,
    lastOnline: new Date(),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial status based on navigator.onLine
    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      lastOnline: navigator.onLine ? new Date() : null,
    }));

    const handleOnline = () => {
      setStatus(prev => ({
        isOnline: true,
        isConnecting: false,
        lastOnline: new Date(),
      }));
    };

    const handleOffline = () => {
      setStatus(prev => ({
        isOnline: false,
        isConnecting: false,
        lastOnline: prev.lastOnline,
      }));
    };

    // Listen for connection changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
} 