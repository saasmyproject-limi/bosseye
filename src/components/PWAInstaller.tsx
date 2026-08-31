'use client';

import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, X, Share, CheckCircle2, Sparkles, RefreshCcw } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncToast, setSyncToast] = useState<{ open: boolean; count: number }>({ open: false, count: 0 });

  useEffect(() => {
    // 1. Enregistrement du Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] ServiceWorker enregistré avec succès:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Échec enregistrement ServiceWorker:', err);
        });
    }

    // 2. Détection du mode Plein Écran / Standalone
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    // 3. Détection iOS (Safari)
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // 4. Capture de l'événement beforeinstallprompt (Android / Chrome / Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Gestion statut Réseau & Synchronisation Automatique
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Synchronisation automatique silencieuse
      try {
        const synced = offlineDB.syncOfflineQueue();
        if (synced > 0) {
          setSyncToast({ open: true, count: synced });
          setTimeout(() => setSyncToast({ open: false, count: 0 }), 5000);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[PWA] L\'utilisateur a accepté l\'installation');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <>
      {/* Toast de Synchronisation Automatique quand le Réseau revient */}
      {syncToast.open && (
        <div className="fixed top-4 right-4 z-50 bg-[#1B4332] text-white p-4 rounded-2xl shadow-2xl border border-[#E8A33D] flex items-center gap-3 animate-slide-in">
          <div className="w-10 h-10 rounded-xl bg-[#E8A33D] text-[#0F291E] flex items-center justify-center font-bold">
            <RefreshCcw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="font-serif font-black text-sm text-[#E8A33D]">Connexion Rétablie !</h4>
            <p className="text-xs font-medium text-gray-200">
              {syncToast.count} opération(s) synchronisée(s) avec le serveur.
            </p>
          </div>
          <button onClick={() => setSyncToast({ open: false, count: 0 })} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner Hors-ligne quand la connexion est coupée */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-4 h-4 text-amber-200 animate-pulse" />
          <span>Mode Hors-Ligne Actif — Vos données sont sauvegardées localement avec le statut "En attente de synchronisation".</span>
        </div>
      )}

      {/* Bannière d'Installation Chrome / Android / Desktop (si non encore installée) */}
      {isInstallable && !isStandalone && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md bg-[#1B4332] text-white p-4 rounded-3xl shadow-2xl border border-[#E8A33D]/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FBF7EF] text-2xl flex items-center justify-center shadow-md">
              👁️
            </div>
            <div>
              <h4 className="font-serif font-black text-sm text-white flex items-center gap-1.5">
                <span>Installer Œko</span>
                <span className="text-[10px] bg-[#E8A33D] text-[#0F291E] font-black px-1.5 py-0.2 rounded-full uppercase">App PWA</span>
              </h4>
              <p className="text-[11px] text-gray-300 font-medium">Utilisez l'app en plein écran sans barre d'adresse et 100% hors-ligne.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="py-2.5 px-4 rounded-xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-transform"
            >
              <Download className="w-4 h-4" />
              <span>Installer</span>
            </button>
            <button
              onClick={() => setIsInstallable(false)}
              className="p-2 text-gray-400 hover:text-white rounded-lg"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bouton/Instructions d'Installation iOS Safari */}
      {isIOS && !isStandalone && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto bg-[#1B4332] text-white p-4 rounded-3xl shadow-2xl border border-[#E8A33D]/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FBF7EF] text-xl flex items-center justify-center">
                👁️
              </div>
              <div>
                <h4 className="font-serif font-black text-xs text-white">Installer Œko sur votre iPhone / iPad</h4>
                <p className="text-[10px] text-gray-300 font-medium">Accès rapide depuis votre écran d'accueil</p>
              </div>
            </div>
            <button onClick={() => setShowIOSInstructions(!showIOSInstructions)} className="text-xs font-bold text-[#E8A33D] underline">
              {showIOSInstructions ? 'Masquer' : 'Comment ?'}
            </button>
          </div>

          {showIOSInstructions && (
            <div className="p-3 bg-[#0F291E] rounded-2xl border border-[#2D6A4F] text-xs text-gray-200 space-y-2">
              <p className="flex items-center gap-2 font-bold text-[#E8A33D]">
                <Share className="w-4 h-4" /> 1. Appuyez sur le bouton "Partager" dans Safari
              </p>
              <p className="flex items-center gap-2 font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 2. Choisissez "Sur l'écran d'accueil" ➕
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
