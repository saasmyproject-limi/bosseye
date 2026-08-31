'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { offlineDB } from '@/lib/offlineDB';

export default function CreditsRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      const etab = offlineDB.getEtablissement();
      const act = etab?.type_activite || 'snack';
      router.replace(`/${act}/credits`);
    } catch (e) {
      router.replace('/snack/credits');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FBF7EF] flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-serif font-black text-sm text-[#1B4332]">Redirection vers la gestion des crédits...</p>
      </div>
    </div>
  );
}
