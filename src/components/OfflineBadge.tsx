'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { syncEngine, SyncEngineStatus } from '@/lib/supabaseSyncEngine';

export default function OfflineBadge() {
  const [status, setStatus] = useState<SyncEngineStatus>(syncEngine.getStatus());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    await syncEngine.processQueue();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      {/* Badge En Ligne / Hors Ligne */}
      {status.isOnline ? (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-semibold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Wifi className="w-3.5 h-3.5" />
          <span>En ligne</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-300 font-semibold shadow-sm">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Hors ligne</span>
        </span>
      )}

      {/* Badge File d'attente d'envoi */}
      {status.pendingCount > 0 ? (
        <button
          onClick={handleManualSync}
          disabled={status.isSyncing || !status.isOnline}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold hover:bg-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
          title="Cliquez pour forcer l'envoi vers Supabase Cloud"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status.isSyncing ? 'animate-spin' : ''}`} />
          <span>{status.pendingCount} élément{status.pendingCount > 1 ? 's' : ''} en attente d'envoi</span>
        </button>
      ) : status.lastSyncAt ? (
        <span className="text-[11px] text-emerald-400/80 font-medium hidden sm:inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Synchro à jour ({status.lastSyncAt})</span>
        </span>
      ) : null}

      {/* Bouton de synchro manuelle */}
      <button
        onClick={handleManualSync}
        disabled={status.isSyncing}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1B4332] hover:bg-[#2D6A4F] text-[#E8A33D] font-bold border border-[#E8A33D]/30 transition-all cursor-pointer disabled:opacity-50"
        title="Synchroniser avec Supabase Cloud"
      >
        <RefreshCw className={`w-3 h-3 ${status.isSyncing ? 'animate-spin' : ''}`} />
        <span>{status.isSyncing ? 'Envoi...' : 'Synchro'}</span>
      </button>
    </div>
  );
}
