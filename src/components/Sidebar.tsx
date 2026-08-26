'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  AlertTriangle
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Utilisateur, Etablissement } from '@/types';
import BarSelectorModal from './BarSelectorModal';
import OfflineBadge from './OfflineBadge';
import PinLoginModal from './PinLoginModal';

export default function Sidebar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = () => {
    setCurrentUser(offlineDB.getCurrentUser());
    setEtablissement(offlineDB.getEtablissement());
    setLowStockCount(offlineDB.getLowStockProducts().length);
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/produits', label: 'Inventaire Stock', icon: Package, badge: lowStockCount > 0 ? lowStockCount : null },
    { href: '/mouvements', label: 'Mouvements', icon: History },
    { href: '/employes', label: 'Employés & PINs', icon: Users },
    { href: '/payer', label: 'Abonnement MoMo', icon: CreditCard },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-brand-black/95 backdrop-blur-md border-b border-brand-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl bg-brand-card border border-brand-border text-white"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-black text-lg text-white">TAKAMBAR</span>
        </div>

        <div className="flex items-center gap-2">
          <OfflineBadge />
          <BarSelectorModal onBoutiqueChanged={loadInfo} />
        </div>
      </header>

      {/* Sidebar Container (Desktop Sidebar + Mobile Drawer) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#0F1115] border-r border-brand-border flex flex-col justify-between p-4 transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand & Logo Header */}
          <div className="flex items-center justify-between pb-6 mb-4 border-b border-brand-border/60">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange shadow-glow">
                <Zap className="w-5 h-5 fill-brand-orange" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-brand-orange bg-brand-orangeLight px-2 py-0.5 rounded-full border border-brand-orange/30">
                  SaaS Stock
                </span>
                <h2 className="text-xl font-black text-white tracking-tight">TAKAMBAR</h2>
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
                      ? 'bg-brand-orange text-white shadow-glow font-black'
                      : 'text-gray-400 hover:text-white hover:bg-brand-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-500/50 text-red-400 text-[10px] font-black animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info & PIN Switcher */}
        <div className="pt-4 border-t border-brand-border/60 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-card border border-brand-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-brand-orange shrink-0">
                {currentUser?.photo_url ? (
                  <img src={currentUser.photo_url} alt={currentUser.nom} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-orange flex items-center justify-center text-white font-bold text-xs">
                    {currentUser?.nom[0] || 'U'}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-xs text-white truncate max-w-[100px]">{currentUser?.nom || 'Utilisateur'}</h4>
                <span className="text-[10px] font-semibold text-brand-orange uppercase">{currentUser?.role || 'Employé'}</span>
              </div>
            </div>

            <button
              onClick={() => setIsPinModalOpen(true)}
              title="Changer d'utilisateur par PIN"
              className="p-2 rounded-xl bg-brand-black border border-brand-border text-gray-300 hover:text-white hover:border-brand-orange transition-colors"
            >
              <Lock className="w-4 h-4 text-brand-orange" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <OfflineBadge />
            <span>v2.0 • Cameroun</span>
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
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
