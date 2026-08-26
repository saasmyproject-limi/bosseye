'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';

export default function OfflineBadge() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setQueueCount(offlineDB.getSyncQueueCount());
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Wifi className="w-3.5 h-3.5" />
          En Ligne
        </span>
      ) : (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-400 text-xs font-semibold animate-bounce">
          <WifiOff className="w-3.5 h-3.5" />
          Mode Hors-ligne
        </span>
      )}

      {queueCount > 0 && (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-xs font-bold">
          <RefreshCw className="w-3 h-3 animate-spin" />
          {queueCount} en attente
        </span>
      )}
    </div>
  );
}
