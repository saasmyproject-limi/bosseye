'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Plus, CheckCircle, Calendar, RefreshCcw } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Boutique } from '@/types';

export default function AdminAbonnementsPage() {
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setBoutique(offlineDB.getBoutique());
  }, []);

  const handleProlonger = (jours: number) => {
    const updated = offlineDB.prolongerAbonnement(jours);
    setBoutique(updated);
    setMessage(`Abonnement de la boutique "${updated.nom}" prolongé avec succès de +${jours} jours !`);
  };

  if (!boutique) return null;

  const dateFinFormatted = new Date(boutique.abonnement_fin).toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <main className="min-h-screen bg-brand-black text-white p-4 max-w-lg mx-auto pb-28 pt-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="text-[10px] font-bold text-purple-400 bg-purple-950/80 px-2.5 py-1 rounded-full uppercase border border-purple-500/40">
            Espace Super Admin
          </span>
          <h1 className="text-2xl font-black text-white mt-1">Validation Abonnements</h1>
        </div>
      </div>

      {message && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="p-5 rounded-3xl bg-brand-card border border-brand-border space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div>
            <h3 className="font-bold text-base text-white">{boutique.nom}</h3>
            <p className="text-xs text-gray-400">Tél: {boutique.telephone} • {boutique.ville}</p>
          </div>
          <span className="text-xs font-bold text-brand-orange bg-brand-orange/20 px-3 py-1 rounded-full border border-brand-orange/40">
            ID: {boutique.id.substring(0, 8)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-brand-black border border-brand-border flex items-center justify-between">
          <span className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-purple-400" />
            Date d'expiration :
          </span>
          <span className="text-xs font-black text-amber-400">{dateFinFormatted}</span>
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold text-gray-300 block">Actions Admin :</label>
          <button
            onClick={() => handleProlonger(30)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-glow transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Valider Paiement (+30 Jours)
          </button>
        </div>
      </div>
    </main>
  );
}
