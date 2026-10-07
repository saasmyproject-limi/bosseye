'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import GoogleAuthModal from '@/components/GoogleAuthModal';
import PinLoginModal from '@/components/PinLoginModal';
import OfflineBadge from '@/components/OfflineBadge';
import { offlineDB } from '@/lib/offlineDB';
import { Lock, UserPlus, LogIn, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#FAF9F5] text-[#1B4332] font-sans selection:bg-[#E8A33D] selection:text-[#0F291E] flex flex-col items-center justify-between p-6 sm:p-10 relative overflow-hidden">
      {/* Header */}
      <header className="w-full max-w-md flex justify-end items-center z-10 min-h-[32px]" />

      {/* Main Centered Content */}
      <section className="my-auto flex flex-col items-center text-center max-w-lg w-full py-6 z-10">
        {/* Abstract Eye Logo */}
        <div className="relative mb-8 sm:mb-10 flex items-center justify-center cursor-pointer group">
          <div className="absolute inset-0 rounded-full bg-[#10B981]/15 blur-3xl transform scale-125 group-hover:scale-150 transition-transform duration-700" />

          <svg
            viewBox="0 0 240 240"
            className="w-56 h-56 sm:w-64 sm:h-64 drop-shadow-sm transition-transform duration-500 group-hover:scale-[1.03]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="120"
              cy="120"
              r="108"
              fill="#E2F5EE"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeOpacity="0.7"
            />
            <path
              d="M48 120C48 120 78 82 120 82C162 82 192 120 192 120C192 120 162 158 120 158C78 158 48 120 48 120Z"
              fill="#FFFFFF"
            />
            <circle
              cx="120"
              cy="120"
              r="22"
              fill="#FFFBEB"
              stroke="#E8A33D"
              strokeWidth="3.2"
            />
            <circle
              cx="120"
              cy="120"
              r="11"
              fill="#D97706"
            />
            <circle
              cx="116"
              cy="116"
              r="3.5"
              fill="#FFFFFF"
              fillOpacity="0.85"
            />
          </svg>
        </div>

        {/* Brand Name & Slogan */}
        <h1 className="font-serif font-black text-3xl sm:text-4xl text-[#1B4332] tracking-tight">
          œko
        </h1>
        <p className="text-sm sm:text-base font-semibold text-gray-500 mt-1 tracking-wide">
          L'œil du patron
        </p>

        <p className="text-sm sm:text-base font-medium text-[#1B4332]/90 mt-6 sm:mt-8 max-w-xs sm:max-w-md leading-snug">
          Gestion de stock, ventes, dettes & créances clients — tout en un
        </p>

        {/* Level 1 Account Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-sm mt-8 sm:mt-10">
          <button
            onClick={() => {
              setAuthMode('register');
              setIsAuthModalOpen(true);
            }}
            className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-2xl bg-[#1B4332] hover:bg-[#143326] text-white font-black text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95 text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#E8A33D]" />
            <span>Crée ton compte</span>
          </button>

          <button
            onClick={() => {
              setAuthMode('login');
              setIsAuthModalOpen(true);
            }}
            className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-2xl bg-white hover:bg-gray-50 border-2 border-[#E2D5C3] text-[#1B4332] font-bold text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-95 text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-[#1B4332]" />
            <span>Connecte-toi</span>
          </button>
        </div>
      </section>

      <footer className="w-full text-center py-2 text-[11px] font-semibold text-gray-400 z-10">
        © 2026 œko — L'œil du patron
      </footer>

      {/* Level 1 Google / Gmail Account Creation Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          router.push('/activites');
        }}
      />

      {/* Tablet PIN Login Modal */}
      {isPinModalOpen && (
        <PinLoginModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={(u) => {
            setIsPinModalOpen(false);
            const etab = offlineDB.getEtablissement();
            const act = etab?.type_activite || 'boutique';
            if (u?.role === 'Serveuse' || u?.role === 'Employé' || u?.role === 'Caissière') {
              router.push(`/${act}/ventes`);
            } else {
              router.push(`/${act}/dashboard`);
            }
          }}
        />
      )}
    </main>
  );
}
