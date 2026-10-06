'use client';

import React from 'react';
import { Sparkles, CheckCircle2, Clock, ShieldCheck, Building2, Store, Beer, Utensils, X, ArrowRight } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Etablissement } from '@/types';

interface ActivityWelcomeModalProps {
  etablissement: Etablissement | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityWelcomeModal({ etablissement, isOpen, onClose }: ActivityWelcomeModalProps) {
  if (!isOpen || !etablissement) return null;

  const isBoutique = etablissement.type_activite === 'boutique';
  const isBar = etablissement.type_activite === 'bar';
  const typeLabel = isBoutique ? 'Boutique' : isBar ? 'Bar / Lounge' : 'Snack / Restaurant';

  const handleStart = () => {
    offlineDB.dismissWelcomeModal(etablissement.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl relative space-y-6 animate-in fade-in zoom-in duration-200">
        <button
          onClick={handleStart}
          className="absolute top-4 right-4 text-gray-500 hover:text-black p-2 rounded-full bg-[#FBF7EF] border border-[#E2D5C3]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-2xl font-black shadow-lg shrink-0">
            {isBoutique ? '👗' : isBar ? '🍺' : '🍟'}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8A33D]/20 text-[#1B4332] font-bold text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#E8A33D]" />
              Nouvelle Activité Créée !
            </div>
            <h2 className="font-serif text-2xl font-black text-[#1B4332]">
              Bienvenue dans <span className="text-[#B8442C]">{etablissement.nom}</span> !
            </h2>
          </div>
        </div>

        {/* Body Cards */}
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-[#E2D5C3] flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
              🎁
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1B4332]">Essai Gratuit de 7 Jours Démarre</h4>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Profitez de toutes les fonctionnalités premium sans engagement pendant 7 jours. Votre palier tarifaire (Essentiel, Standard ou Pro) sera automatiquement ajusté selon votre usage réel.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2D5C3] flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
              🔒
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1B4332]">Données & Stock Dédiés à {etablissement.nom}</h4>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Le stock, les ventes, les clients et les codes PIN d'employés de cette activité sont totalement isolés de vos autres commerces.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2D5C3] flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
              📱
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1B4332]">Liaison Tablette & Multi-Caisses</h4>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Si vous installez œko sur une tablette de caisse dédiée, celle-ci restera verrouillée sur <strong>{etablissement.nom}</strong> via son code PIN rapide.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#1B4332] text-white hover:bg-[#143326] font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <span>Accéder au Dashboard de {etablissement.nom}</span>
          <ArrowRight className="w-4 h-4 text-[#E8A33D]" />
        </button>
      </div>
    </div>
  );
}
