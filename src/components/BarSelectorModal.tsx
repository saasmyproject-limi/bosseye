'use client';

import React, { useState, useEffect } from 'react';
import { Store, Plus, Check, X, Building2, Phone, MapPin } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Boutique } from '@/types';

interface BarSelectorModalProps {
  onBoutiqueChanged?: () => void;
}

export default function BarSelectorModal({ onBoutiqueChanged }: BarSelectorModalProps) {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [activeBoutique, setActiveBoutique] = useState<Boutique | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Formulaire d'inscription de bar
  const [nomBar, setNomBar] = useState('');
  const [telephone, setTelephone] = useState('');
  const [ville, setVille] = useState('Douala');
  const [adresse, setAdresse] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setBoutiques(offlineDB.getBoutiques());
    setActiveBoutique(offlineDB.getBoutique());
  };

  const handleSelectBar = (id: string) => {
    offlineDB.switchBoutique(id);
    loadData();
    setIsOpen(false);
    if (onBoutiqueChanged) onBoutiqueChanged();
    window.location.reload();
  };

  const handleCreateBar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomBar.trim() || !telephone.trim()) return;

    const newBar = offlineDB.createBoutique({
      nom: nomBar.trim(),
      telephone: telephone.trim(),
      ville: ville.trim() || 'Cameroun',
      adresse: adresse.trim() || 'Centre-ville',
    });

    setNomBar('');
    setTelephone('');
    setAdresse('');
    setIsCreating(false);
    setIsOpened(false);
    loadData();
    if (onBoutiqueChanged) onBoutiqueChanged();
    window.location.reload();
  };

  return (
    <>
      {/* Bouton En-tête pour changer / voir le bar actif */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-card hover:bg-brand-hover border border-brand-border text-white text-xs font-bold transition-all shadow-card"
      >
        <Store className="w-4 h-4 text-brand-orange" />
        <span className="truncate max-w-[110px]">{activeBoutique?.nom || 'Mon Bar'}</span>
        <span className="text-[10px] text-gray-500">▾</span>
      </button>

      {/* Modal Multi-Bar & Inscription */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 w-full max-w-md shadow-glow relative">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsCreating(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-brand-black"
            >
              <X className="w-5 h-5" />
            </button>

            {!isCreating ? (
              <div>
                <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-orange" />
                  Vos Bars & Lounges
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  Chaque bar dispose de son propre compte, de son personnel et de son stock.
                </p>

                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
                  {boutiques.map((b) => {
                    const isSelected = b.id === activeBoutique?.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBar(b.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand-orange/20 border-brand-orange shadow-glow text-white'
                            : 'bg-brand-black border-brand-border text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-sm text-white">{b.nom}</h4>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {b.ville} • Tél: {b.telephone}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-xs">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-glow transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>🏢 Créer un Nouveau Bar (Compte SaaS)</span>
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-brand-orange" />
                  Créer mon Bar / Mon Compte
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  Formulaire d'inscription rapide (7 jours d'essai offerts).
                </p>

                <form onSubmit={handleCreateBar} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Nom de votre Bar / Snack / Lounge *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: BAR LA CITADELLE"
                      value={nomBar}
                      onChange={(e) => setNomBar(e.target.value)}
                      className="w-full bg-brand-black border border-brand-border rounded-2xl p-3.5 text-white font-bold text-base focus:outline-none focus:border-brand-orange"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      Téléphone du Gérant / Patronne *
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: 699001122"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      className="w-full bg-brand-black border border-brand-border rounded-2xl p-3.5 text-white font-bold text-base focus:outline-none focus:border-brand-orange"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-300 block mb-1">Ville</label>
                      <input
                        type="text"
                        placeholder="Ex: Douala, Yaoundé..."
                        value={ville}
                        onChange={(e) => setVille(e.target.value)}
                        className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-300 block mb-1">Quartier / Adresse</label>
                      <input
                        type="text"
                        placeholder="Ex: Akwa, Bastos..."
                        value={adresse}
                        onChange={(e) => setAdresse(e.target.value)}
                        className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="py-3.5 px-4 rounded-2xl bg-brand-black border border-brand-border text-gray-400 font-bold text-xs"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 text-white font-black text-sm shadow-glow transition-transform active:scale-95"
                    >
                      🚀 Créer et Accéder à mon Bar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
