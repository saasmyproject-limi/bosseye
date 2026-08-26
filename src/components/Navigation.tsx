'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Users, AlertTriangle, LayoutDashboard, CreditCard, Download } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/caisse', label: 'Caisse', icon: ShoppingBag },
    { href: '/employes', label: 'Employés', icon: Users },
    { href: '/casses_pertes', label: 'Casses', icon: AlertTriangle },
    { href: '/dashboard', label: 'Bilan', icon: LayoutDashboard },
    { href: '/payer', label: 'Abonnement', icon: CreditCard },
    { href: '/installer', label: 'PWA App', icon: Download },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-brand-card/95 backdrop-blur-xl border-t border-brand-border px-3 py-2 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-brand-orange bg-brand-orange/15 font-bold scale-105 shadow-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
