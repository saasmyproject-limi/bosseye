'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
      <div className="w-16 h-16 rounded-3xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-3xl font-black shadow-lg">
        👁️
      </div>
      <h2 className="font-serif font-black text-2xl text-[#1B4332]">Page non trouvée (404)</h2>
      <p className="text-xs text-gray-600 font-medium max-w-sm">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link
        href="/boutique/dashboard"
        className="px-6 py-3 rounded-2xl bg-[#1B4332] text-white font-bold text-xs hover:bg-[#143326] transition-all shadow-md"
      >
        ← Retour à l'accueil Boutique
      </Link>
    </div>
  );
}
