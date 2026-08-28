'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  History,
  Users,
  CreditCard,
  Bookmark,
  Building2,
  Lock,
  LogOut,
  Zap,
  Menu,
  X,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  ShoppingBag,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { offlineDB, getTerminology } from '@/lib/offlineDB';
import { Utilisateur, Etablissement } from '@/types';
import BarSelectorModal from './BarSelectorModal';
import OfflineBadge from './OfflineBadge';
import PinLoginModal from './PinLoginModal';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [pendingCreditsCount, setPendingCreditsCount] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setCurrentUser(offlineDB.getCurrentUser());
      setLowStockCount(offlineDB.getLowStockProducts().length);
      const factures = offlineDB.getFactures();
      const activeCredits = factures.filter((f) => f && f.statut === 'credit_encours' && (f.montant_restant || 0) > 0);
      setPendingCreditsCount(activeCredits.length);
    } catch (e) {
      console.error(e);
    }
  };

  const term = getTerminology(etablissement?.type_activite);

  const daysLeftTrial = etablissement ? offlineDB.getTrialDaysRemaining(etablissement) : 7;
  const isTrialExpired = etablissement ? offlineDB.isTrialExpired(etablissement) : false;

  const isEmployeBoutique = currentUser?.role === 'Employé';
  const isServeuseOrNonPatron = ['Serveuse', 'Caissière', 'Employé'].includes(currentUser?.role || '');

  const handleClearDatabase = () => {
    offlineDB.clearAllDataToZero();
    setShowClearConfirm(false);
    setIsSelectorModalOpen(true);
  };

  const handleRestoreDemoData = () => {
    offlineDB.restoreDemoSeedData();
    setShowClearConfirm(false);
    loadInfo();
    router.refresh();
  };

  const navItems = [
    {
      name: 'Tableau de Bord',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: term.salesScreenTitle,
      href: '/ventes',
      icon: etablissement?.type_activite === 'boutique' ? ShoppingBag : LayoutDashboard,
    },
    {
      name: term.stockLabel,
      href: '/produits',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} bas` : null,
      badgeColor: 'bg-amber-600',
    },
    {
      name: 'Argent à Récupérer',
      href: '/credits',
      icon: CreditCard,
      badge: pendingCreditsCount > 0 ? `${pendingCreditsCount}` : null,
      badgeColor: 'bg-[#B8442C]',
    },
    ...(etablissement?.type_activite === 'boutique'
      ? [
          {
            name: 'Réservations / Mise de Côté',
            href: '/reservations',
            icon: Bookmark,
          },
        ]
      : []),
    ...(!isEmployeBoutique
      ? [
          {
            name: 'Comptabilité & Marge CMP',
            href: '/comptabilite',
            icon: BarChart3,
          },
        ]
      : []),
    {
      name: 'Mouvements & Historique',
      href: '/mouvements',
      icon: History,
    },
    {
      name: term.sellerLabel,
      href: '/employes',
      icon: Users,
    },
    ...(!isServeuseOrNonPatron
      ? [
          {
            name: 'Statut & Abonnement',
            href: '/payer',
            icon: Zap,
            badge: isTrialExpired ? 'Expiré' : `${daysLeftTrial}j`,
            badgeColor: isTrialExpired ? 'bg-red-600' : 'bg-emerald-700',
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Bouton Mobile Open */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 p-3.5 bg-[#1B4332] text-white rounded-2xl shadow-xl flex items-center gap-2 border border-[#E8A33D]"
      >
        <Menu className="w-6 h-6" />
        <span className="font-bold text-xs">Menu œko</span>
      </button>

      {/* Backdrop Mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#1B4332] text-white flex flex-col justify-between transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header & Brand */}
        <div className="p-5 space-y-4 border-b border-[#2D6A4F]">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8A33D] text-[#0F291E] flex items-center justify-center text-xl font-black shadow-md">
                👁️
              </div>
              <div>
                <h1 className="font-serif font-black text-xl text-white tracking-tight">œko</h1>
                <p className="text-[10px] font-bold text-[#E8A33D] uppercase tracking-widest">L'œil du patron</p>
              </div>
            </Link>

            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden text-white opacity-70 hover:opacity-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Commerce Actif & Switcher */}
          <div
            onClick={() => setIsSelectorModalOpen(true)}
            className="p-3 rounded-2xl bg-[#0F291E] border border-[#2D6A4F] text-xs cursor-pointer hover:border-[#E8A33D] transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Commerce Actif</span>
              <span className="text-[9px] font-black uppercase bg-[#E8A33D] text-[#0F291E] px-2 py-0.5 rounded-full">
                {etablissement?.type_activite || 'Snack'}
              </span>
            </div>
            <p className="font-serif font-black text-sm text-white truncate">{etablissement?.nom}</p>
            <p className="text-[10px] text-[#E8A33D] font-bold underline mt-1">Changer ou Créer un commerce ➔</p>
          </div>

          <OfflineBadge />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-[#E8A33D] text-[#0F291E] shadow-md font-black'
                    : 'text-gray-200 hover:bg-[#2D6A4F] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer & Reset Actions */}
        <div className="p-4 border-t border-[#2D6A4F] space-y-2 bg-[#0F291E]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2D6A4F] text-[#E8A33D] flex items-center justify-center font-black text-sm">
              {currentUser?.nom?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="font-bold text-xs text-white truncate">{currentUser?.nom}</p>
              <p className="text-[10px] text-[#E8A33D] font-bold uppercase">{currentUser?.role}</p>
            </div>
          </div>

          <button
            onClick={() => setIsPinModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-[#2D6A4F] hover:bg-[#3E8E68] text-white font-bold text-[11px] flex items-center justify-center gap-2 transition-all"
          >
            <Lock className="w-3.5 h-3.5 text-[#E8A33D]" />
            <span>Changer PIN</span>
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Vider la Base (Test à Zéro)</span>
          </button>
        </div>
      </aside>

      {/* MODAL CONFIRMATION REMISE À ZÉRO */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto text-2xl font-bold">
              🗑️
            </div>
            <h3 className="font-serif font-black text-xl text-[#1B4332]">
              Vider la Base de Données à Zéro ?
            </h3>
            <p className="text-xs text-gray-600 font-bold leading-relaxed">
              Cette action va supprimer tous les commerces, produits et factures actuels afin que vous puissiez tester la création d'un commerce de zéro.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleClearDatabase}
                className="w-full py-3.5 rounded-2xl bg-[#B8442C] text-white font-black text-xs shadow-md"
              >
                Tout Vider & Démarrer de Zéro ➔
              </button>

              <button
                onClick={handleRestoreDemoData}
                className="w-full py-3.5 rounded-2xl bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4 text-[#E8A33D]" />
                <span>Recharger les Données Démo</span>
              </button>

              <button
                onClick={() => setShowClearConfirm(false)}
                className="w-full py-2.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Login Modal */}
      {isPinModalOpen && (
        <PinLoginModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={() => {
            setIsPinModalOpen(false);
            loadInfo();
            router.refresh();
          }}
        />
      )}

      {/* Bar / Commerce Selector Modal */}
      {isSelectorModalOpen && (
        <BarSelectorModal
          isOpen={isSelectorModalOpen}
          onClose={() => setIsSelectorModalOpen(false)}
          onSelectSuccess={() => {
            loadInfo();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
