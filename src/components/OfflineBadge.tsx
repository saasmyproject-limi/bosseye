import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { pullShopFromCloud, syncShopToCloud } from '@/lib/supabaseSync';

export default function OfflineBadge() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Démarrage différé non-bloquant de la synchro initiale
    const initialTimer = setTimeout(() => {
      setQueueCount(offlineDB.getOfflineQueueCount());
      if (navigator.onLine) {
        triggerAutoSync();
      }
    }, 3000);

    // Auto-sync périodique toutes les 12s si en ligne (synchro tablette + téléphone patron)
    const interval = setInterval(() => {
      setQueueCount(offlineDB.getOfflineQueueCount());
      if (navigator.onLine) {
        triggerAutoSync();
      }
    }, 12000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const triggerAutoSync = async () => {
    try {
      const etab = offlineDB.getEtablissement();
      if (etab && etab.id) {
        await pullShopFromCloud(etab.id);
      }
    } catch (e) {
      console.warn('Auto-sync notice:', e);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const etab = offlineDB.getEtablissement();
      if (etab && etab.id) {
        // Exécution en parallèle (Push & Pull simultanés)
        await Promise.all([syncShopToCloud(etab.id), pullShopFromCloud(etab.id)]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isOnline ? (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Wifi className="w-3.5 h-3.5" />
          En Ligne
        </span>
      ) : (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-400 text-xs font-semibold animate-bounce">
          <WifiOff className="w-3.5 h-3.5" />
          Hors-ligne
        </span>
      )}

      <button
        onClick={handleManualSync}
        disabled={isSyncing}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2D6A4F] hover:bg-[#3E8E68] text-[#E8A33D] text-[11px] font-bold border border-[#E8A33D]/30 transition-all active:scale-95"
        title="Synchroniser avec le Nuage"
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{isSyncing ? 'Synchro...' : 'Synchro Nuage'}</span>
      </button>

      {queueCount > 0 && (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-600/20 border border-amber-500/40 text-amber-400 text-xs font-bold">
          <RefreshCw className="w-3 h-3 animate-spin" />
          {queueCount} en attente
        </span>
      )}
    </div>
  );
}
