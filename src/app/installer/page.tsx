'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Smartphone, Share2, PlusSquare, CheckCircle, Sparkles, HelpCircle } from 'lucide-react';
import OfflineBadge from '@/components/OfflineBadge';

export default function InstallerPage() {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Détection si l'application tourne déjà en mode standalone
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandaloneMode) {
      setIsStandalone(true);
      router.push('/dashboard');
      return;
    }

    // Détection iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphoneOrIpad);

    // Écouteur PWA Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [router]);

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      router.push('/dashboard');
    }
  };

  return (
    <main className="min-h-screen bg-brand-black text-white p-4 max-w-lg mx-auto pb-28 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="text-[10px] font-bold text-brand-orange bg-brand-orangeLight px-2.5 py-1 rounded-full uppercase border border-brand-orange/30">
            Installation PWA App
          </span>
          <h1 className="text-2xl font-black text-white mt-1">Installer TAKAM BAR</h1>
        </div>
        <OfflineBadge />
      </div>

      {/* Main Installer Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-brand-card via-[#1A1A1A] to-brand-black border border-brand-border shadow-card text-center mb-6 relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center mx-auto mb-3 shadow-glow">
          <Download className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-black text-white">Application Mobile 100% Hors-Ligne</h2>
        <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">
          Installez TAKAM BAR directement sur l'écran d'accueil de votre téléphone (Android Tecno/Samsung ou iPhone).
        </p>

        {/* GUIDAGE ANDROID */}
        {!isIOS && (
          <div className="mt-5 space-y-4">
            {deferredPrompt ? (
              <button
                onClick={handleInstallAndroid}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-base flex items-center justify-center gap-2 shadow-glow transition-transform active:scale-95"
              >
                <Download className="w-5 h-5" />
                <span>Installer sur mon Android</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-brand-black border border-brand-border text-left space-y-2 text-xs">
                <h3 className="font-bold text-brand-orange flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  Tutoriel Installation Android (Tecno, Samsung, Infinix) :
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-300">
                  <li>Cliquez sur les <strong>3 petits points</strong> en haut à droite du navigateur Chrome.</li>
                  <li>Sélectionnez <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong>.</li>
                  <li>Validez pour retrouver l'icône TAKAM BAR sur votre téléphone !</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* GUIDAGE IPHONE SAFARI */}
        {isIOS && (
          <div className="mt-5 p-4 rounded-2xl bg-brand-black border border-brand-border text-left space-y-3 text-xs">
            <h3 className="font-bold text-brand-orange flex items-center gap-1.5">
              <Share2 className="w-4 h-4" />
              Tutoriel Installation iPhone (Safari) :
            </h3>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-brand-orange/20 border border-brand-orange text-brand-orange font-bold flex items-center justify-center text-xs shrink-0">1</span>
                <span>Appuyez sur le bouton <strong>Partager</strong> en bas de Safari (carré avec flèche vers le haut).</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-brand-orange/20 border border-brand-orange text-brand-orange font-bold flex items-center justify-center text-xs shrink-0">2</span>
                <span>Faites défiler vers le bas et touchez <strong>"Sur l'écran d'accueil"</strong> (<PlusSquare className="w-4 h-4 inline text-amber-400" />).</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-brand-orange/20 border border-brand-orange text-brand-orange font-bold flex items-center justify-center text-xs shrink-0">3</span>
                <span>Appuyez sur <strong>"Ajouter"</strong> en haut à droite.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
