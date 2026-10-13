'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import Sidebar from './Sidebar';
import { offlineDB } from '@/lib/offlineDB';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const [inspectingEtabName, setInspectingEtabName] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [etabNom, setEtabNom] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isInspecting = localStorage.getItem('oeko_superadmin_inspect_active') === 'true';
      const name = localStorage.getItem('oeko_superadmin_inspect_name');
      if (isInspecting) {
        setInspectingEtabName(name || 'Boutique');
      }

      const currentEtab = offlineDB.getEtablissement();
      if (currentEtab) {
        setEtabNom(currentEtab.nom);
        setIsBlocked(currentEtab.statut_abonnement === 'bloque' && !isInspecting);
      }
    }
  }, []);

  const handleExitInspection = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('oeko_superadmin_inspect_active');
      localStorage.removeItem('oeko_superadmin_inspect_name');
    }
    router.push('/super-admin');
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col font-sans relative">
      {inspectingEtabName && (
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-[#B8442C] text-white px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between sticky top-0 z-50 shadow-lg border-b border-amber-800">
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse">👁️</span>
            <span>
              Mode Inspection Super-Admin actif sur : <strong className="underline decoration-white/70">{inspectingEtabName}</strong>
            </span>
            <span className="hidden sm:inline bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px] uppercase font-black">
              Support / Diagnostic
            </span>
          </div>
          <button
            onClick={handleExitInspection}
            className="bg-white text-[#B8442C] hover:bg-amber-100 px-3 py-1 rounded-xl text-xs font-black shadow transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Quitter l'inspection & Revenir au Super-Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isBlocked ? (
        <div className="flex flex-col lg:flex-row flex-1">
          <Sidebar />
          <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8 flex items-center justify-center min-h-screen">
            <div className="max-w-md w-full bg-white border-2 border-red-300 rounded-3xl p-8 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-700 flex items-center justify-center mx-auto text-3xl shadow-inner">
                <Lock className="w-8 h-8 text-red-700" />
              </div>
              <h2 className="font-serif text-2xl font-black text-[#1B4332]">Commerce Suspendu</h2>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                L'accès à la boutique <strong>« {etabNom} »</strong> a été temporairement bloqué par l'administration œko.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-bold">
                Vos stocks, articles et données restent 100% conservés en toute sécurité.
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/commun/payer"
                  className="w-full py-3 bg-[#1B4332] text-white rounded-xl text-xs font-black shadow hover:bg-[#2D6A4F] transition-all"
                >
                  Régler mon abonnement ➔
                </Link>
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row flex-1">
          <Sidebar />
          <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8 space-y-6 min-h-screen">
            {children}
          </main>
        </div>
      )}
    </div>
  );
}
