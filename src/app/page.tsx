'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  WifiOff,
  Package,
  Zap,
  Lock,
  Building2,
  TrendingDown,
  AlertTriangle,
  Play,
  CheckCircle2,
  PhoneCall
} from 'lucide-react';
import OfflineBadge from '@/components/OfflineBadge';
import BarSelectorModal from '@/components/BarSelectorModal';
import PinLoginModal from '@/components/PinLoginModal';

export default function HomePage() {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-white selection:bg-brand-orange selection:text-white font-sans">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#0B0C0E]/90 backdrop-blur-xl border-b border-brand-border/60 px-4 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange shadow-glow">
              <Zap className="w-5 h-5 fill-brand-orange" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-orange bg-brand-orangeLight px-2 py-0.5 rounded-full border border-brand-orange/30">
                SaaS Cameroun
              </span>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                TAKAMBAR
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <BarSelectorModal />
            <OfflineBadge />
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="py-2 px-4 rounded-xl bg-brand-orange hover:bg-brand-orangeHover text-white font-bold text-xs shadow-glow transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Connexion PIN</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION (STYLE MERIDIAL) */}
      <section className="relative px-4 pt-12 pb-20 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />

        {/* LEFT COLUMN: HEADLINE & CTAS */}
        <div className="lg:col-span-7 text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-orange/15 border border-brand-orange/30 text-brand-orange text-xs font-extrabold shadow-glow">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>SUIVI DE STOCK EN TEMPS RÉEL AU CAMEROUN</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
            La clarté totale sur votre stock de boisson,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange via-amber-400 to-amber-500">
              sans feuille Excel.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 max-w-xl leading-relaxed">
            Suivez vos entrées, sorties et casses de stock en temps réel depuis votre téléphone. Vos serveuses se connectent par{' '}
            <strong className="text-brand-orange font-bold">PIN à 4 chiffres</strong> et saisissent les mouvements même{' '}
            <strong className="text-amber-400 font-bold">sans connexion internet</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-glow transition-transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Accéder au Dashboard Patron</span>
            </Link>

            <button
              onClick={() => setIsPinModalOpen(true)}
              className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-brand-card hover:bg-brand-hover border border-brand-border text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Lock className="w-4 h-4 text-brand-orange" />
              <span>Connexion PIN (1234 / 5678)</span>
            </button>
          </div>

          <div className="flex items-center gap-6 pt-4 text-xs text-gray-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              14 jours d'essai gratuit
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Paiement Mobile Money
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              100% Hors-Ligne
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: MERIDIAL-STYLE VERTICAL MOCKUP CARD */}
        <div className="lg:col-span-5 relative">
          <div className="relative rounded-3xl p-6 bg-gradient-to-b from-[#14161C] to-[#0B0C0E] border border-brand-border shadow-card overflow-hidden group">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                  ⚠️
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Détection Stock Bas</h3>
                  <span className="text-[10px] text-amber-400 font-semibold">Calcul automatique en casiers</span>
                </div>
              </div>
              <span className="text-xs font-black text-red-400 bg-red-950/80 px-2.5 py-1 rounded-xl border border-red-500/40 animate-pulse">
                ALERTE ACTICE
              </span>
            </div>

            {/* Mouvement Live Card Feed */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-brand-black/80 border border-red-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                    -12
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Guinness Foreign Extra</h4>
                    <span className="text-[10px] text-gray-400">Sortie par Chantal (Serveuse)</span>
                  </div>
                </div>
                <span className="text-xs font-black text-red-400">27 Bouteilles restantes</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-black/80 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    +120
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Beaufort Lager</h4>
                    <span className="text-[10px] text-gray-400">Entrée par Jean-Paul (Gérant)</span>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-400">12c + 5b (293b)</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-black/80 border border-brand-border flex items-center justify-between opacity-80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    -2
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Casse Bouteille</h4>
                    <span className="text-[10px] text-gray-400">Motif: Cassée au service</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-400">Synchronisé</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-brand-border text-center">
              <span className="text-xs text-gray-400">
                Chaque mouvement est sauvegardé en <strong className="text-brand-orange">mode hors-ligne</strong> et synchronisé dès le retour du réseau.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. GRILLE DES FONCTIONNALITÉS (SASTRIFY STYLE) */}
      <section className="px-4 py-16 max-w-6xl mx-auto border-t border-brand-border/60">
        <div className="text-center mb-12">
          <span className="text-[10px] font-bold text-brand-orange uppercase tracking-widest bg-brand-orangeLight px-3 py-1 rounded-full border border-brand-orange/30">
            Plateforme Complète
          </span>
          <h2 className="text-3xl font-black text-white mt-2">Construit pour les contraintes du Cameroun</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-brand-card border border-brand-border hover:border-brand-orange/50 transition-all shadow-card">
            <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange text-brand-orange flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2">🔑 Connexion par PIN à 4 Chiffres</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Vos serveuses et caissières saisissent simplement un code à 4 chiffres (ex: 1234 / 0000). Pas d'email ni de mot de passe à retenir sur téléphone portable.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-brand-card border border-brand-border hover:border-brand-orange/50 transition-all shadow-card">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500 text-amber-400 flex items-center justify-center mb-4">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2">📶 Mode 100% Hors-Ligne (Offline)</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Coupure de réseau à Douala ou Yaoundé ? Continuez à enregistrer vos entrées et sorties. La file d'attente se synchronise automatiquement au retour de la connexion.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-brand-card border border-brand-border hover:border-brand-orange/50 transition-all shadow-card">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2">💳 Paiement Mobile Money</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Payez votre abonnement mensuel directement par Orange Money ou MTN MoMo (5 000 FCFA / mois) avec déblocage instantané.
            </p>
          </div>
        </div>
      </section>

      {/* 4. TARIFICATION & ESSAI GRATUIT */}
      <section className="px-4 py-16 max-w-xl mx-auto text-center border-t border-brand-border/60">
        <div className="p-8 rounded-3xl bg-gradient-to-br from-brand-card via-[#181A20] to-[#0B0C0E] border border-brand-orange/40 shadow-glow relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold mb-4">
            <CheckCircle2 className="w-4 h-4" /> 14 Jours d'Essai Gratuit Inclus
          </div>

          <h2 className="text-4xl font-black text-white">5 000 FCFA <span className="text-sm text-gray-400 font-medium">/ mois</span></h2>
          <p className="text-xs text-gray-300 mt-2 mb-6">
            Accès complet illimité pour votre snack, bar, maquis ou lounge au Cameroun.
          </p>

          <Link
            href="/dashboard"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-base flex items-center justify-center gap-2 shadow-glow transition-transform active:scale-95"
          >
            <span>Démarrer l'Essai Gratuit de 14 Jours</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="px-4 py-8 text-center border-t border-brand-border text-xs text-gray-500">
        <p className="font-bold text-gray-400">TAKAMBAR © 2026 • SaaS Multi-Tenant Gestion de Stock Cameroun</p>
        <p className="mt-1 text-[10px]">Développé spécialement pour les contraintes réseau et Mobile Money en Afrique.</p>
      </footer>

      {/* PIN Login Modal */}
      {isPinModalOpen && (
        <PinLoginModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={() => {
            setIsPinModalOpen(false);
            window.location.href = '/dashboard';
          }}
        />
      )}
    </div>
  );
}
