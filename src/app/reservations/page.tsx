'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReservationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/boutique/reservations');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FBF7EF] flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-serif font-black text-sm text-[#1B4332]">Redirection vers la gestion des réservations boutique...</p>
      </div>
    </div>
  );
}
