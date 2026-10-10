'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur globale œko:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
      <div className="w-16 h-16 rounded-3xl bg-[#B8442C] text-white flex items-center justify-center text-3xl font-black shadow-lg">
        ⚠️
      </div>
      <h2 className="font-serif font-black text-2xl text-[#1B4332]">Une erreur est survenue</h2>
      <p className="text-xs text-gray-600 font-medium max-w-sm">
        L'application a rencontré un problème inattendu.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-5 py-3 rounded-2xl bg-[#1B4332] text-white font-bold text-xs hover:bg-[#143326] transition-all shadow-md cursor-pointer"
        >
          Réessayer
        </button>
        <Link
          href="/boutique/dashboard"
          className="px-5 py-3 rounded-2xl bg-white border border-[#E2D5C3] text-[#1B4332] font-bold text-xs shadow-sm"
        >
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}
