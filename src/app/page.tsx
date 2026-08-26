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
  PhoneCall,
  Wine,
  Flame,
  CreditCard,
  Users,
  Check,
  ChevronRight,
  Menu,
  X,
  RefreshCw,
  BarChart3,
  Receipt
} from 'lucide-react';
import OfflineBadge from '@/components/OfflineBadge';
import BarSelectorModal from '@/components/BarSelectorModal';
import PinLoginModal from '@/components/PinLoginModal';

export default function LandingPage() {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] font-sans selection:bg-[#E8A33D] selection:text-[#0F291E]">
      {/* 1. NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-[#FBF7EF]/90 backdrop-blur-md border-b border-[#E2D5C3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              🍺
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-black text-2xl tracking-tight text-[#1B4332]">
                  Stockia
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2 py-0.5 rounded-full border border-[#B8442C]/20">
                  Cameroun
                </span>
              </div>
              <p className="text-[11px] text-[#2D6A4F] font-semibold">
                par TAKAMBAR SaaS
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-[#1B4332]/80">
            <a href="#comment-ca-marche" className="hover:text-[#B8442C] transition-colors">
              Comment ça marche
            </a>
            <a href="#fonctionnalites" className="hover:text-[#B8442C] transition-colors">
              Fonctionnalités
            </a>
            <a href="#tarifs" className="hover:text-[#B8442C] transition-colors">
              Tarifs
            </a>
            <a href="#temoignages" className="hover:text-[#B8442C] transition-colors">
              Avis Patrons
            </a>
          </nav>

          {/* Right Header CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <BarSelectorModal />
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="py-2.5 px-4 rounded-xl border-2 border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 text-[#E8A33D]" />
              <span>Connexion PIN</span>
            </button>

            <Link
              href="/dashboard"
              className="py-2.5 px-5 rounded-xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-bold text-xs shadow-glow-brique flex items-center gap-1.5 transition-all active:scale-95"
            >
              <span>Essai Gratuit 14j</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="md:hidden p-2.5 rounded-xl bg-[#F3ECE0] text-[#1B4332] border border-[#E2D5C3]"
          >
            {isMobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileNavOpen && (
          <div className="md:hidden bg-[#FBF7EF] border-b border-[#E2D5C3] px-4 py-5 space-y-4 animate-in slide-in-from-top duration-200">
            <nav className="flex flex-col space-y-3 font-bold text-sm text-[#1B4332]">
              <a
                href="#comment-ca-marche"
                onClick={() => setIsMobileNavOpen(false)}
                className="py-2 border-b border-[#E2D5C3]"
              >
                Comment ça marche
              </a>
              <a
                href="#fonctionnalites"
                onClick={() => setIsMobileNavOpen(false)}
                className="py-2 border-b border-[#E2D5C3]"
              >
                Fonctionnalités
              </a>
              <a
                href="#tarifs"
                onClick={() => setIsMobileNavOpen(false)}
                className="py-2 border-b border-[#E2D5C3]"
              >
                Tarifs
              </a>
            </nav>

            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setIsPinModalOpen(true);
                }}
                className="w-full py-3 rounded-xl border-2 border-[#1B4332] text-[#1B4332] font-bold text-xs flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-[#E8A33D]" />
                <span>Connexion PIN (Serveuse / Gérant)</span>
              </button>

              <Link
                href="/dashboard"
                onClick={() => setIsMobileNavOpen(false)}
                className="w-full py-3.5 rounded-xl bg-[#B8442C] text-white font-black text-sm text-center shadow-md flex items-center justify-center gap-2"
              >
                <span>Démarrer l'Essai Gratuit de 14 Jours</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#E8A33D]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1B4332]/10 border border-[#1B4332]/20 text-[#1B4332] text-xs font-extrabold shadow-sm">
                <Sparkles className="w-4 h-4 text-[#E8A33D]" />
                <span>LE LOGICIEL N°1 DE SUIVI DE STOCK AU CAMEROUN</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-[#1B4332] leading-[1.12] tracking-tight">
                La clarté totale sur vos casiers et vos boissons,{' '}
                <span className="italic text-[#B8442C] underline decoration-[#E8A33D] decoration-wavy decoration-2">
                  sans fuites ni cahiers.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#1B4332]/80 max-w-2xl font-medium leading-relaxed">
                Suivez en direct les entrées, sorties et casses de stock dans votre snack ou bar. Vos serveuses enregistrent les bouteilles par <strong className="text-[#1B4332] font-black underline decoration-[#E8A33D]">PIN à 4 chiffres</strong>, même en pleine coupure réseau à Douala ou Yaoundé.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  href="/dashboard"
                  className="py-4 px-8 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-base flex items-center justify-center gap-3 shadow-glow-brique transition-transform active:scale-95 text-center"
                >
                  <span>Démarrer l'essai gratuit (14 jours)</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <button
                  onClick={() => setIsPinModalOpen(true)}
                  className="py-4 px-6 rounded-2xl bg-[#F3ECE0] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Lock className="w-4 h-4 text-[#B8442C]" />
                  <span>Tester la Démo PIN (1234)</span>
                </button>
              </div>

              {/* Trust Badges under CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#E2D5C3]/80 text-xs font-bold text-[#1B4332]/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                  <span>14 jours d'essai gratuit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                  <span>Payant Orange Money & MoMo</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                  <span>100% Mode Hors-Ligne</span>
                </div>
              </div>
            </div>

            {/* Right Visual Signature Element (Mini Dashboard Card) */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl p-6 bg-[#0F291E] text-white border-2 border-[#E8A33D]/40 shadow-2xl overflow-hidden">
                {/* Header Mockup */}
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#2D6A4F]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#E8A33D]/20 border border-[#E8A33D] text-[#E8A33D] flex items-center justify-center font-black text-lg">
                      🍺
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-base text-white">Bar La Citadelle</h3>
                      <p className="text-[11px] text-[#E8A33D] font-medium">Akwa, Douala • En Direct</p>
                    </div>
                  </div>
                  <OfflineBadge />
                </div>

                {/* KPI Chips */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="p-3.5 rounded-2xl bg-[#1B4332] border border-[#2D6A4F]">
                    <span className="text-[10px] text-gray-300 font-bold uppercase block">Stock Bouteilles</span>
                    <span className="text-xl font-black text-[#E8A33D]">412 <span className="text-xs font-normal text-gray-300">bouteilles</span></span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#1B4332] border border-red-500/40">
                    <span className="text-[10px] text-red-300 font-bold uppercase block">Alertes Stock Bas</span>
                    <span className="text-xl font-black text-red-400">2 <span className="text-xs font-normal text-gray-300">produits</span></span>
                  </div>
                </div>

                {/* Stock Live Feed Rows */}
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-[#091A13] border border-[#2D6A4F] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        +24
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-white">Castel Beer 65cl</h4>
                        <span className="text-[10px] text-gray-400">Entrée par Jean-Paul (Gérant)</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-400">12c + 4b (292b)</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#091A13] border border-red-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                        -6
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-white">Guinness Smooth</h4>
                        <span className="text-[10px] text-gray-400">Sortie par Chantal (Serveuse)</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-red-400">⚠️ 18b (Stock bas)</span>
                  </div>
                </div>

                {/* Offline Guarantee Footer inside Card */}
                <div className="mt-5 pt-3 border-t border-[#2D6A4F] text-center flex items-center justify-center gap-2 text-[11px] text-[#E8A33D] font-bold">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>File d'attente hors-ligne : 0 mouvement en attente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SOCIAL PROOF / BANDE DE CONFIANCE */}
      <section className="py-10 bg-[#F3ECE0] border-y border-[#E2D5C3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-[#1B4332]/70 mb-6">
            Rassuré par plus de 45 gérants et patrons de snacks et bars au Cameroun
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-90">
            {[
              { name: 'Snack-Bar Le Privilège', city: 'Bastos, Yaoundé' },
              { name: 'Le Palmier Beach Lounge', city: 'Kribi' },
              { name: 'Bar La Citadelle', city: 'Akwa, Douala' },
              { name: 'VIP Oasis Snack', city: 'Bafoussam' },
              { name: 'Maquis Le Jet Set', city: 'Bonapriso, Douala' },
            ].map((client, idx) => (
              <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] shadow-sm">
                <span className="text-base">🏢</span>
                <div className="text-left">
                  <h4 className="font-bold text-xs text-[#1B4332]">{client.name}</h4>
                  <span className="text-[10px] text-[#2D6A4F] font-semibold">{client.city}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SECTION COMMENT ÇA MARCHE (FLUX SNACK-BAR VS FLUX BAR) */}
      <section id="comment-ca-marche" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-3 py-1 rounded-full border border-[#B8442C]/20">
            Adapté à vos habitudes
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-black text-[#1B4332] mt-3">
            Deux modes de fonctionnement selon votre établissement
          </h2>
          <p className="text-sm sm:text-base text-[#1B4332]/80 mt-2 font-medium">
            Que vous gériez un snack-bar rapide ou un lounge avec service en salle, Stockia s'adapte sans imposer de contraintes inutiles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Flux Snack-Bar */}
          <div className="p-8 rounded-3xl bg-[#F3ECE0] border-2 border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-card flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center font-bold text-xl mb-6">
                🍟
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-[#B8442C]">Mode 1 • Snack-Bar & Restauration</span>
              <h3 className="font-serif text-2xl font-black text-[#1B4332] mt-1 mb-4">
                Flux Snack-Bar (Serveuse → Caissière → Cuisine/Comptoir)
              </h3>
              <p className="text-xs sm:text-sm text-[#1B4332]/80 leading-relaxed mb-6 font-medium">
                Idéal pour les snacks avec caisse centrale. La serveuse saisit la commande sur son téléphone par PIN, la caissière valide l'encaissement et déstocke automatiquement les bouteilles.
              </p>

              <ol className="space-y-3 text-xs font-semibold text-[#1B4332]">
                <li className="flex items-center gap-3 p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                  <span className="w-6 h-6 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                  <span>Serveuse saisit la commande avec son PIN 4 chiffres</span>
                </li>
                <li className="flex items-center gap-3 p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                  <span className="w-6 h-6 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                  <span>Validation caisse instantanée et décompte des bouteilles</span>
                </li>
                <li className="flex items-center gap-3 p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                  <span className="w-6 h-6 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                  <span>Contrôle en direct des encaissements Mobile Money & Espèces</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Card 2: Flux Bar & Maquis */}
          <div className="p-8 rounded-3xl bg-[#0F291E] text-white border-2 border-[#E8A33D]/50 shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#E8A33D] text-[#0F291E] flex items-center justify-center font-bold text-xl mb-6">
                🍻
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-[#E8A33D]">Mode 2 • Bar, Maquis & Lounge</span>
              <h3 className="font-serif text-2xl font-black text-white mt-1 mb-4">
                Flux Bar (Serveuse autonome & Table ouverte)
              </h3>
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-6 font-medium">
                Pour les bars traditionnels et maquis. La serveuse sert la table, enregistre les sorties au fur et à mesure et ferme la note au départ du client sans risque d'oubli.
              </p>

              <ol className="space-y-3 text-xs font-semibold text-gray-200">
                <li className="flex items-center gap-3 p-3 rounded-2xl bg-[#1B4332] border border-[#2D6A4F]">
                  <span className="w-6 h-6 rounded-full bg-[#E8A33D] text-[#0F291E] flex items-center justify-center font-bold text-xs shrink-0">1</span>
                  <span>Ouverture de table et service direct en bouteilles vrac ou casiers</span>
                </li>
                <li className="flex items-center gap-3 p-3 rounded-2xl bg-[#1B4332] border border-[#2D6A4F]">
                  <span className="w-6 h-6 rounded-full bg-[#E8A33D] text-[#0F291E] flex items-center justify-center font-bold text-xs shrink-0">2</span>
                  <span>Clôture de soirée avec inventaire casiers pleins vs vidanges</span>
                </li>
                <li className="flex items-center gap-3 p-3 rounded-2xl bg-[#1B4332] border border-[#2D6A4F]">
                  <span className="w-6 h-6 rounded-full bg-[#E8A33D] text-[#0F291E] flex items-center justify-center font-bold text-xs shrink-0">3</span>
                  <span>Zéro manque à gagner sur les bouteilles manquantes</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION FONCTIONNALITÉS (GRILLE DE 6 FONCTIONNALITÉS KÉES) */}
      <section id="fonctionnalites" className="py-20 bg-[#F3ECE0] border-t border-[#E2D5C3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#1B4332] bg-[#1B4332]/10 px-3 py-1 rounded-full border border-[#1B4332]/20">
              Fonctionnalités Essentielles
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-[#1B4332] mt-3">
              Pensé exclusivement pour les défis du terrain au Cameroun
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-[#FBF7EF] border border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#1B4332]/10 border border-[#1B4332]/20 text-[#1B4332] flex items-center justify-center text-xl mb-4">
                📦
              </div>
              <h3 className="font-serif font-black text-lg text-[#1B4332] mb-2">Stock Casiers & Bouteilles Vrac</h3>
              <p className="text-xs text-[#1B4332]/80 leading-relaxed font-medium">
                Gestion intelligente en casiers (12 ou 24 bouteilles) et bouteilles au verre. Conversion automatique sans calcul manuel.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-[#FBF7EF] border border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#B8442C]/10 border border-[#B8442C]/20 text-[#B8442C] flex items-center justify-center text-xl mb-4">
                ⚠️
              </div>
              <h3 className="font-serif font-black text-lg text-[#1B4332] mb-2">Alertes Réapprovisionnement</h3>
              <p className="text-xs text-[#1B4332]/80 leading-relaxed font-medium">
                Soyez prévenu dès qu'une boisson (Guinness, Castel, Beaufort...) passe sous le seuil critique pour commander à temps aux brasseries.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-[#FBF7EF] border border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#E8A33D]/20 border border-[#E8A33D]/40 text-[#1B4332] flex items-center justify-center text-xl mb-4">
                📶
              </div>
              <h3 className="font-serif font-black text-lg text-[#1B4332] mb-2">Mode 100% Hors-Ligne (Offline)</h3>
              <p className="text-xs text-[#1B4332]/80 leading-relaxed font-medium">
                Pas d'internet ? Pas de problème. Vos serveuses continuent de travailler sans coupure. Synchro automatique dès le retour du réseau.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-[#FBF7EF] border border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#1B4332]/10 border border-[#1B4332]/20 text-[#1B4332] flex items-center justify-center text-xl mb-4">
                🔑
              </div>
              <h3 className="font-serif font-black text-lg text-[#1B4332] mb-2">Comptes PIN à 4 Chiffres</h3>
              <p className="text-xs text-[#1B4332]/80 leading-relaxed font-medium">
                Pas besoin d'adresse email ou de mot de passe compliqué pour le personnel. Un simple code PIN à 4 chiffres (ex: 1234) suffit.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-[#FBF7EF] border border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#B8442C]/10 border border-[#B8442C]/20 text-[#B8442C] flex items-center justify-center text-xl mb-4">
                💳
              </div>
              <h3 className="font-serif font-black text-lg text-[#1B4332] mb-2">Paiement Mobile Money</h3>
              <p className="text-xs text-[#1B4332]/80 leading-relaxed font-medium">
                Payez votre abonnement mensuel directement par Orange Money ou MTN MoMo avec déblocage immédiat de votre compte.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-[#FBF7EF] border border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#E8A33D]/20 border border-[#E8A33D]/40 text-[#1B4332] flex items-center justify-center text-xl mb-4">
                🏢
              </div>
              <h3 className="font-serif font-black text-lg text-[#1B4332] mb-2">Gestion Multi-Établissements</h3>
              <p className="text-xs text-[#1B4332]/80 leading-relaxed font-medium">
                Vous possédez 2 ou 3 bars/lounges ? Supervisez l'ensemble de vos affaires et basculez d'un bar à un autre en 1 clic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION TARIFS (2 PLANS + ESSAI GRATUIT) */}
      <section id="tarifs" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-3 py-1 rounded-full border border-[#B8442C]/20">
            Tarification Claire & Transparente
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-black text-[#1B4332] mt-3">
            Choisissez la formule adaptée à la taille de votre bar
          </h2>
          <p className="text-sm sm:text-base text-[#1B4332]/80 mt-2 font-medium">
            Tous les plans incluent <strong>14 jours d'essai gratuit</strong>. Aucun paiement ni carte bancaire requis au démarrage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plan 1: Basique */}
          <div className="p-8 rounded-3xl bg-[#F3ECE0] border-2 border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-card flex flex-col justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#2D6A4F]">Plan Essentiel</span>
              <h3 className="font-serif text-2xl font-black text-[#1B4332] mt-1 mb-2">Snack / Bar Solo</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-[#1B4332]">5 000 FCFA</span>
                <span className="text-xs text-[#1B4332]/70 font-semibold">/ mois</span>
              </div>

              <ul className="space-y-3 text-xs font-semibold text-[#1B4332] mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                  <span>1 Établissement (Snack ou Bar)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                  <span>Jusqu'à 5 employés (codes PIN)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                  <span>Suivi en casiers et bouteilles vrac</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                  <span>Mode 100% hors-ligne illimité</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                  <span>Support WhatsApp 7j/7</span>
                </li>
              </ul>
            </div>

            <Link
              href="/dashboard"
              className="w-full py-4 rounded-2xl border-2 border-[#1B4332] hover:bg-[#1B4332] hover:text-white text-[#1B4332] font-black text-sm text-center transition-colors"
            >
              Essayer gratuitement (14 jours)
            </Link>
          </div>

          {/* Plan 2: Premium */}
          <div className="p-8 rounded-3xl bg-[#0F291E] text-white border-2 border-[#E8A33D] shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-[#E8A33D] text-[#0F291E] text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              POPULAIRE
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#E8A33D]">Plan Recommandé</span>
              <h3 className="font-serif text-2xl font-black text-white mt-1 mb-2">Grand Bar / Multi-Établissements</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-[#E8A33D]">10 000 FCFA</span>
                <span className="text-xs text-gray-300 font-semibold">/ mois</span>
              </div>

              <ul className="space-y-3 text-xs font-semibold text-gray-200 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#E8A33D] shrink-0" />
                  <span>Établissements illimités (Bars & Lounges)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#E8A33D] shrink-0" />
                  <span>Employés et serveuses illimités (PINs)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#E8A33D] shrink-0" />
                  <span>Alertes automatiques WhatsApp / SMS stock bas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#E8A33D] shrink-0" />
                  <span>Rapports PDF d'inventaire téléchargeables</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#E8A33D] shrink-0" />
                  <span>Synchronisation Cloud Realtime Supabase</span>
                </li>
              </ul>
            </div>

            <Link
              href="/dashboard"
              className="w-full py-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-sm text-center shadow-glow-brique transition-transform active:scale-95"
            >
              Démarrer l'essai Premium 14j
            </Link>
          </div>
        </div>
      </section>

      {/* 7. CTA FINAL (BLOC DE CONVERSION CONTRASTÉ) */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-4xl bg-gradient-to-br from-[#0F291E] via-[#1B4332] to-[#091A13] text-white border-2 border-[#E8A33D]/40 shadow-2xl relative overflow-hidden text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <span className="text-xs font-black uppercase tracking-widest text-[#E8A33D] bg-[#E8A33D]/20 px-3 py-1 rounded-full border border-[#E8A33D]/40">
              PRÊT À SUPPRIMER LES PERTES DE STOCK ?
            </span>

            <h2 className="font-serif text-3xl sm:text-5xl font-black leading-tight text-white">
              Reprenez le contrôle total sur votre bar dès aujourd'hui.
            </h2>

            <p className="text-sm sm:text-base text-gray-200 font-medium">
              Rejoignez les patrons de bar qui ont éliminé les doutes et les erreurs de décompte de casiers au Cameroun. 14 jours d'essai gratuit, configuration en 2 minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-base flex items-center justify-center gap-2 shadow-glow-brique transition-transform active:scale-95"
              >
                <span>Commencer mon Essai Gratuit</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <button
                onClick={() => setIsPinModalOpen(true)}
                className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] border border-[#E8A33D]/50 text-[#E8A33D] font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Lock className="w-4 h-4" />
                <span>Tester la Démo PIN (1234)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-[#0F291E] text-white py-12 border-t border-[#2D6A4F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#2D6A4F]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8A33D] text-[#0F291E] flex items-center justify-center font-black text-lg">
                🍺
              </div>
              <div>
                <span className="font-serif font-black text-xl text-white">Stockia</span>
                <p className="text-[11px] text-[#E8A33D] font-semibold">par TAKAMBAR SaaS Cameroun</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-bold text-gray-300">
              <a href="#comment-ca-marche" className="hover:text-[#E8A33D] transition-colors">Comment ça marche</a>
              <a href="#fonctionnalites" className="hover:text-[#E8A33D] transition-colors">Fonctionnalités</a>
              <a href="#tarifs" className="hover:text-[#E8A33D] transition-colors">Tarifs</a>
              <Link href="/dashboard" className="hover:text-[#E8A33D] transition-colors">Dashboard Patron</Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 font-medium gap-4">
            <p>© 2026 Stockia (TAKAMBAR SaaS). Tous droits réservés.</p>
            <p className="text-[11px] text-gray-400">
              Développé avec soin pour les snacks, lounges et bars au Cameroun (Orange Money & MTN MoMo).
            </p>
          </div>
        </div>
      </footer>

      {/* PIN LOGIN MODAL INTEGRATION */}
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
