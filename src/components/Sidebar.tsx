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
  Building2,
  Lock,
  LogOut,
  Zap,
  Menu,
  X,
  AlertTriangle,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [pendingCreditsCount, setPendingCreditsCount] = useState(0);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = () => {
    try {
      setCurrentUser(offlineDB.getCurrentUser());
      setEtablissement(offlineDB.getEtablissement());
      setLowStockCount(offlineDB.getLowStockProducts().length);
      const factures = offlineDB.getFactures();
      const activeCredits = factures.filter((f) => f && f.statut === 'credit_encours' && (f.montant_restant || 0) > 0);
      setPendingCreditsCount(activeCredits.length);
    } catch (e) { console.error(e); }
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard Patron', icon: LayoutDashboard },
    { href: '/produits', label: 'Inventaire Stock', icon: Package, badge: lowStockCount > 0 ? lowStockCount : null },
    { href: '/comptabilite', label: 'Comptabilité & Marges', icon: BarChart3 },
    { href: '/credits', label: 'Crédits & Relances WA', icon: MessageSquare, badge: pendingCreditsCount > 0 ? pendingCreditsCount : null },
    { href: '/mouvements', label: 'Mouvements', icon: History },
    { href: '/employes', label: 'Employés & PINs', icon: Users },
    { href: '/payer', label: 'Abonnement MoMo', icon: CreditCard },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#0F291E] border-b border-[#2D6A4F] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl bg-[#1B4332] border border-[#2D6A4F] text-white"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-serif font-black text-lg text-white">Stockia</span>
        </div>

        <div className="flex items-center gap-2">
          <OfflineBadge />
          <BarSelectorModal onBoutiqueChanged={loadInfo} />
        </div>
      </header>

      {/* Sidebar Container (Desktop Sidebar + Mobile Drawer) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#0F291E] text-white border-r border-[#2D6A4F] flex flex-col justify-between p-4 transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand & Logo Header */}
          <div className="flex items-center justify-between pb-6 mb-4 border-b border-[#2D6A4F]">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-[#E8A33D] text-[#0F291E] flex items-center justify-center font-black text-lg shadow-md group-hover:scale-105 transition-transform">
                🍺
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#E8A33D] bg-[#E8A33D]/20 px-2 py-0.5 rounded-full border border-[#E8A33D]/40">
                  SaaS Stock
                </span>
                <h2 className="font-serif font-black text-xl text-white tracking-tight">Stockia</h2>
              </div>
            </Link>

            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bar / Establishment Switcher */}
          <div className="mb-6">
            <BarSelectorModal onBoutiqueChanged={loadInfo} />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all ${
                    isActive
                      ? 'bg-[#E8A33D] text-[#0F291E] shadow-md font-black'
                      : 'text-gray-300 hover:text-white hover:bg-[#1B4332]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0F291E]' : 'text-[#E8A33D]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-[#B8442C] text-white text-[10px] font-black animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info & PIN Switcher */}
        <div className="pt-4 border-t border-[#2D6A4F] space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#1B4332] border border-[#2D6A4F]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#E8A33D] bg-[#E8A33D] text-[#0F291E] flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser?.photo_url ? (
                  <img src={currentUser.photo_url} alt={currentUser.nom} className="w-full h-full object-cover" />
                ) : (
                  <span>{(currentUser?.nom || 'U')[0]}</span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-xs text-white truncate max-w-[100px]">{currentUser?.nom || 'Utilisateur'}</h4>
                <span className="text-[10px] font-bold text-[#E8A33D] uppercase">{currentUser?.role || 'Employé'}</span>
              </div>
            </div>

            <button
              onClick={() => setIsPinModalOpen(true)}
              title="Changer d'utilisateur par PIN"
              className="p-2 rounded-xl bg-[#0F291E] border border-[#2D6A4F] text-gray-300 hover:text-white hover:border-[#E8A33D] transition-colors"
            >
              <Lock className="w-4 h-4 text-[#E8A33D]" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <OfflineBadge />
            <span>v2.0 CM</span>
          </div>
        </div>
      </aside>

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
    </>
  );
}
