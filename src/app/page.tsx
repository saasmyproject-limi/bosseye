'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import BarSelectorModal from '@/components/BarSelectorModal';
import PinLoginModal from '@/components/PinLoginModal';
import OfflineBadge from '@/components/OfflineBadge';
import { offlineDB } from '@/lib/offlineDB';

export default function LandingPage() {
  const router = useRouter();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#FAF9F5] text-[#1B4332] font-sans selection:bg-[#E8A33D] selection:text-[#0F291E] flex flex-col items-center justify-between p-6 sm:p-10 relative overflow-hidden">
      {/* Discreet Header with Offline Badge */}
      <header className="w-full max-w-md flex justify-end items-center z-10 min-h-[32px]">
        <OfflineBadge />
      </header>

      {/* Main Centered Content */}
      <section className="my-auto flex flex-col items-center text-center max-w-lg w-full py-6 z-10">
        {/* Abstract Eye Illustration */}
        <div className="relative mb-8 sm:mb-10 flex items-center justify-center cursor-pointer group">
          <div className="absolute inset-0 rounded-full bg-[#10B981]/15 blur-3xl transform scale-125 group-hover:scale-150 transition-transform duration-700" />

          <svg
            viewBox="0 0 240 240"
            className="w-56 h-56 sm:w-64 sm:h-64 drop-shadow-sm transition-transform duration-500 group-hover:scale-[1.03]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Soft Teal/Mint Circle with Fine Green Stroke */}
            <circle
              cx="120"
              cy="120"
              r="108"
              fill="#E2F5EE"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeOpacity="0.7"
            />

            {/* White Eye Contour */}
            <path
              d="M48 120C48 120 78 82 120 82C162 82 192 120 192 120C192 120 162 158 120 158C78 158 48 120 48 120Z"
              fill="#FFFFFF"
            />

            {/* Amber Pupil Outer Ring */}
            <circle
              cx="120"
              cy="120"
              r="22"
              fill="#FFFBEB"
              stroke="#E8A33D"
              strokeWidth="3.2"
            />

            {/* Amber Pupil Center */}
            <circle
              cx="120"
              cy="120"
              r="11"
              fill="#D97706"
            />

            {/* Reflection Highlight */}
            <circle
              cx="116"
              cy="116"
              r="3.5"
              fill="#FFFFFF"
              fillOpacity="0.85"
            />
          </svg>
        </div>

        {/* Name */}
        <h1 className="font-serif font-black text-3xl sm:text-4xl text-[#1B4332] tracking-tight">
          Œko
        </h1>

        {/* Catchphrase */}
        <p className="text-sm sm:text-base font-semibold text-gray-500 mt-1 tracking-wide">
          L'œil du patron
        </p>

        {/* Single Description Line */}
        <p className="text-sm sm:text-base font-medium text-[#1B4332]/90 mt-6 sm:mt-8 max-w-xs sm:max-w-md leading-snug">
          Stock, ventes, crédits clients — depuis votre téléphone
        </p>

        {/* Two Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-sm mt-8 sm:mt-10">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-2xl bg-[#E2F5EE] hover:bg-[#D3EEE4] border-2 border-[#10B981]/60 text-[#1B4332] font-black text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-95 text-center"
          >
            Crée ton compte
          </button>

          <button
            onClick={() => setIsPinModalOpen(true)}
            className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-2xl bg-white hover:bg-gray-50 border-2 border-[#E2D5C3] text-[#1B4332] font-bold text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-95 text-center"
          >
            Connecte-toi
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full text-center py-2 text-[11px] font-semibold text-gray-400 z-10">
        © 2026 Œko
      </footer>

      {/* Account Creation Modal */}
      {isCreateModalOpen && (
        <BarSelectorModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSelectSuccess={(etab) => {
            setIsCreateModalOpen(false);
            router.push(`/${etab.type_activite || 'boutique'}/dashboard`);
          }}
        />
      )}

      {/* PIN Login Modal */}
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
