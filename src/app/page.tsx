'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Receipt,
  Eye,
  ShoppingBag
} from 'lucide-react';
import OfflineBadge from '@/components/OfflineBadge';
import BarSelectorModal from '@/components/BarSelectorModal';
import PinLoginModal from '@/components/PinLoginModal';
import { offlineDB } from '@/lib/offlineDB';

export default function LandingPage() {
  const router = useRouter();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] font-sans selection:bg-[#E8A33D] selection:text-[#0F291E]">
      {/* 1. NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-[#FBF7EF]/90 backdrop-blur-md border-b border-[#E2D5C3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              👁️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-serif font-black text-2xl text-[#1B4332] tracking-tight">œko</h1>
                <span className="text-[10px] font-black uppercase tracking-widest bg-[#E8A33D]/20 text-[#1B4332] px-2 py-0.5 rounded-full border border-[#E8A33D]/40">
                  L'œil du patron
                </span>
              </div>
              <p className="text-[11px] font-bold text-gray-500 hidden sm:block">SaaS de gestion pour petits commerces au Cameroun</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-[#1B4332]/80">
            <a href="#categories" className="hover:text-[#B8442C] transition-colors">Nos 3 Métiers</a>
            <a href="#fonctionnalites" className="hover:text-[#B8442C] transition-colors">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-[#B8442C] transition-colors">Tarifs & 7j Essai</a>
            <a href="#faq" className="hover:text-[#B8442C] transition-colors">FAQ</a>
          </nav>

          {/* Action CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-[#F3ECE0] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
            >
              <Lock className="w-4 h-4 text-[#B8442C]" />
              <span>Connexion PIN</span>
            </button>

            <Link
              href="/ventes"
              className="py-2.5 px-5 rounded-xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-bold text-xs shadow-glow-brique flex items-center gap-1.5 transition-all active:scale-95"
            >
              <span>Essai Gratuit 7j</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="md:hidden p-2 rounded-xl bg-[#F3ECE0] border border-[#E2D5C3] text-[#1B4332]"
          >
            {isMobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileNavOpen && (
          <div className="md:hidden bg-[#FBF7EF] border-b border-[#E2D5C3] px-4 py-4 space-y-3">
            <a href="#categories" onClick={() => setIsMobileNavOpen(false)} className="block py-2 text-xs font-bold">Nos 3 Métiers</a>
            <a href="#tarifs" onClick={() => setIsMobileNavOpen(false)} className="block py-2 text-xs font-bold">Tarifs (5k / 10k FCFA)</a>
            <div className="pt-2 border-t border-[#E2D5C3] space-y-2">
              <button
                onClick={() => { setIsMobileNavOpen(false); setIsPinModalOpen(true); }}
                className="w-full py-3 rounded-xl bg-[#F3ECE0] text-[#1B4332] font-bold text-xs text-center block"
              >
                Connexion PIN Employé
              </button>
              <Link
                href="/ventes"
                onClick={() => setIsMobileNavOpen(false)}
                className="w-full py-3 rounded-xl bg-[#B8442C] text-white font-bold text-xs text-center block shadow-md"
              >
                Essai Gratuit 7j sans paiement
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B4332]/10 border border-[#1B4332]/20 text-[#1B4332] font-bold text-xs">
                <Sparkles className="w-4 h-4 text-[#E8A33D]" />
                <span>Le SaaS sur-mesure pour petits commerces au Cameroun</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-[#1B4332] tracking-tight leading-[1.1]">
                œko : L'œil du patron sur son commerce, <span className="italic text-[#B8442C]">en temps réel.</span>
              </h1>

              <p className="text-sm sm:text-base text-[#1B4332]/80 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Que vous gériez une <strong>Boutique de vêtements</strong>, un <strong>Bar</strong> ou un <strong>Snack-bar</strong> à Douala ou Yaoundé, œko s'adapte automatiquement à votre métier. Suivez vos ventes, vos stocks, vos crédits clients et vos caisses en 1 clic.
              </p>

              {/* CTAs & Badges */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/ventes"
                  className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-sm shadow-glow-brique flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <span>Créer mon Compte (7j Offerts)</span>
                  <ArrowRight className="w-5 h-5 text-white" />
                </Link>

                <button
                  onClick={() => setIsPinModalOpen(true)}
                  className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-[#F3ECE0] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Lock className="w-4 h-4 text-[#B8442C]" />
                  <span>Accès Démo PIN</span>
                </button>
              </div>

              {/* Highlights List */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#E2D5C3]/80 text-left">
                <div>
                  <h4 className="font-serif font-black text-xl text-[#1B4332]">7 Jours</h4>
                  <p className="text-[11px] font-bold text-gray-500">Essai gratuit sans carte</p>
                </div>
                <div>
                  <h4 className="font-serif font-black text-xl text-[#1B4332]">5 000 F</h4>
                  <p className="text-[11px] font-bold text-gray-500">/mois (Boutique & Bar)</p>
                </div>
                <div>
                  <h4 className="font-serif font-black text-xl text-[#1B4332]">Orange / MTN</h4>
                  <p className="text-[11px] font-bold text-gray-500">MoMo direct Cameroun</p>
                </div>
              </div>
            </div>

            {/* Right Card / Visual */}
            <div className="lg:col-span-5 relative">
              <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-2xl space-y-4 relative z-10">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2D5C3]">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#B8442C]" />
                    <span className="font-serif font-black text-base text-[#1B4332]">Aperçu œko Dashboard</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Actif • Hors-ligne OK
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500">Boutique Éléganza</span>
                      <h4 className="font-serif font-black text-sm text-[#1B4332]">Ventes du Jour</h4>
                    </div>
                    <span className="font-serif font-black text-lg text-[#1B4332]">145 000 FCFA</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500">Crédits Clients</span>
                      <h4 className="font-serif font-black text-sm text-[#B8442C]">Argent à Récupérer</h4>
                    </div>
                    <span className="font-serif font-black text-lg text-[#B8442C]">35 000 FCFA</span>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-[11px] font-bold text-gray-600">Imprimante Bluetooth & Relance WhatsApp incluses</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LES 3 CATÉGORIES / MÉTIERS DE OEKO */}
      <section id="categories" className="py-16 bg-[#F3ECE0]/60 border-y border-[#E2D5C3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-3 py-1 rounded-full border border-[#B8442C]/30">
              1 Application • 3 Métiers Sur-Mesure
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-[#1B4332]">
              L'application s'adapte automatiquement à votre activité
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Boutique */}
            <div className="bg-[#FBF7EF] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm hover:border-[#1B4332] transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center text-2xl font-bold">
                  👗
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-black text-xl text-[#1B4332]">Boutique</h3>
                  <span className="text-xs font-black text-[#B8442C]">5 000 FCFA/mois</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  Vente de vêtements, sacs et chaussures. Stock avec déclinaisons (Taille S/M/L, Couleur, Pointure). Stock unifié en temps réel entre boutique physique et ventes en ligne avec suivi de livraison.
                </p>
                <ul className="space-y-1.5 text-xs text-[#1B4332] font-bold">
                  <li>✓ Rôles : Patronne & Employé (sans accès aux marges)</li>
                  <li>✓ Commandes en Ligne & Livraisons</li>
                  <li>✓ Crédits clients & Relances WhatsApp</li>
                </ul>
              </div>
            </div>

            {/* 2. Bar */}
            <div className="bg-[#FBF7EF] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm hover:border-[#1B4332] transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center text-2xl font-bold">
                  🍺
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-black text-xl text-[#1B4332]">Bar / Lounge</h3>
                  <span className="text-xs font-black text-[#B8442C]">5 000 FCFA/mois</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  Gestion de consommations par table ouverte. Addition divisible par personne ou note unique. Déstockage immédiat au service et distinction stricte stock sorti vs argent encaissé.
                </p>
                <ul className="space-y-1.5 text-xs text-[#1B4332] font-bold">
                  <li>✓ Rôles : Patronne & Serveuse</li>
                  <li>✓ Factures divisibles (Split note)</li>
                  <li>✓ Alertes ruptures de casiers & vrac</li>
                </ul>
              </div>
            </div>

            {/* 3. Snack */}
            <div className="bg-[#FBF7EF] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm hover:border-[#1B4332] transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center text-2xl font-bold">
                  🍟
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-black text-xl text-[#1B4332]">Snack-Bar</h3>
                  <span className="text-xs font-black text-[#B8442C]">10 000 FCFA/mois</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  Flux sécurisé 2 étapes (Serveuse prend commande/cash → Caissière encaisse et valide le déstockage). Multi-caisses actives simultanément avec traçabilité complète.
                </p>
                <ul className="space-y-1.5 text-xs text-[#1B4332] font-bold">
                  <li>✓ Rôles : Patron (à distance), Directeur, Caissière, Serveuse</li>
                  <li>✓ Tables normales & Carrés VIP</li>
                  <li>✓ Traçabilité totale par caisse & serveuse</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TARIFS ET PAIEMENT MOBILE MONEY */}
      <section id="tarifs" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-center">
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="font-serif text-3xl font-black text-[#1B4332]">
              Tarifs Transparents & Paiement MoMo
            </h2>
            <p className="text-xs text-gray-600 font-medium">
              Commencez gratuitement pendant 7 jours sans carte. Réglez ensuite simplement via Orange Money ou MTN MoMo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 space-y-4 text-left">
              <h3 className="font-serif font-black text-xl text-[#1B4332]">Boutique / Bar</h3>
              <div className="flex items-baseline gap-1">
                <span className="font-serif font-black text-3xl text-[#B8442C]">5 000 FCFA</span>
                <span className="text-xs font-bold text-gray-500">/ mois</span>
              </div>
              <p className="text-xs text-gray-600 font-medium">Idéal pour les boutiques de mode et les bars/maquis à gestion simplifiée.</p>
              <Link href="/ventes" className="w-full py-3 rounded-xl bg-[#1B4332] text-white font-bold text-xs text-center block">
                Démarrer l'essai 7j
              </Link>
            </div>

            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 space-y-4 text-left">
              <h3 className="font-serif font-black text-xl text-[#1B4332]">Snack-Bar (Multi-Caisses)</h3>
              <div className="flex items-baseline gap-1">
                <span className="font-serif font-black text-3xl text-[#B8442C]">10 000 FCFA</span>
                <span className="text-xs font-bold text-gray-500">/ mois</span>
              </div>
              <p className="text-xs text-gray-600 font-medium">Gestion multi-caisses, carrés VIP, traçabilité serveuses & caissières et contrôle patron à distance.</p>
              <Link href="/ventes" className="w-full py-3 rounded-xl bg-[#B8442C] text-white font-bold text-xs text-center block shadow-md">
                Démarrer l'essai 7j
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0F291E] text-white py-10 border-t border-[#2D6A4F]">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">👁️</span>
            <span className="font-serif font-black text-xl">œko</span>
            <span className="text-xs text-[#E8A33D] font-bold">— L'œil du patron</span>
          </div>
          <p className="text-xs text-gray-400 max-w-md mx-auto font-medium">
            Le logiciel SaaS de gestion ultime pour boutiques, bars et snack-bars au Cameroun.
          </p>
          <div className="text-[11px] text-gray-500 pt-4">
            © 2026 œko SaaS • Tous droits réservés • Douala / Yaoundé
          </div>
        </div>
      </footer>

      {/* PIN Login Modal */}
      {isPinModalOpen && (
        <PinLoginModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={(u) => {
            setIsPinModalOpen(false);
            const etab = offlineDB.getEtablissement();
            const act = etab?.type_activite || 'snack';
            if (u?.role === 'Serveuse' || u?.role === 'Employé' || u?.role === 'Caissière') {
              router.push(`/${act}/ventes`);
            } else {
              router.push(`/${act}/dashboard`);
            }
          }}
        />
      )}
    </div>
  );
}
