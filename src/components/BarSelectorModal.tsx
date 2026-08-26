'use client';

import React, { useState, useEffect } from 'react';
import { Store, Plus, Check, X, Building2, Phone, MapPin } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Etablissement } from '@/types';

interface BarSelectorModalProps {
  onBoutiqueChanged?: () => void;
}

export default function BarSelectorModal({ onBoutiqueChanged }: BarSelectorModalProps) {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [activeEtablissement, setActiveEtablissement] = useState<Etablissement | null>(null);
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
    try {
      setEtablissements(offlineDB.getEtablissements());
      setActiveEtablissement(offlineDB.getEtablissement());
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectBar = (id: string) => {
    offlineDB.switchEtablissement(id);
    loadData();
    setIsOpen(false);
    if (onBoutiqueChanged) onBoutiqueChanged();
    window.location.reload();
  };

  const handleCreateBar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomBar.trim() || !telephone.trim()) return;

    offlineDB.createEtablissement({
      nom: nomBar.trim(),
      type: 'bar',
      ville: ville.trim() || 'Douala',
      adresse: adresse.trim() || 'Centre-ville',
      patronNom: 'Patron',
      patronPin: '1234',
    });

    setNomBar('');
    setTelephone('');
    setAdresse('');
    setIsCreating(false);
    setIsOpen(false);
    loadData();
    if (onBoutiqueChanged) onBoutiqueChanged();
    window.location.reload();
  };

  return (
    <>
      {/* Bouton En-tête pour changer / voir le bar actif */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F3ECE0] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] text-xs font-bold transition-all shadow-sm"
      >
        <Store className="w-4 h-4 text-[#B8442C]" />
        <span className="truncate max-w-[120px] font-black">{activeEtablissement?.nom || 'Mon Bar'}</span>
        <span className="text-[10px] text-gray-500">▾</span>
      </button>

      {/* Modal Multi-Bar & Inscription */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsCreating(false);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-black p-1.5 rounded-full bg-[#FBF7EF]"
            >
              <X className="w-5 h-5" />
            </button>

            {!isCreating ? (
              <div>
                <h2 className="font-serif text-xl font-black text-[#1B4332] mb-1 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#B8442C]" />
                  Vos Bars & Lounges
                </h2>
                <p className="text-xs text-[#1B4332]/80 mb-4 font-medium">
                  Chaque bar dispose de son propre compte, de ses serveuses et de son stock.
                </p>

                <div className="space-y-2 mb-5 max-h-60 overflow-y-auto pr-1">
                  {etablissements.map((b) => {
                    const isSelected = b.id === activeEtablissement?.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBar(b.id)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#FBF7EF] border-[#1B4332] shadow-sm text-[#1B4332]'
                            : 'bg-[#FBF7EF]/60 border-[#E2D5C3] text-[#1B4332] hover:border-gray-400'
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-sm text-[#1B4332]">{b.nom}</h4>
                          <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                            {b.ville} {b.adresse ? `• ${b.adresse}` : ''}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-xs">
                            <Check className="w-4 h-4 text-[#E8A33D]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs flex items-center justify-center gap-2 shadow-glow-brique transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>🏢 Créer un Nouveau Bar (Compte SaaS)</span>
                </button>
              </div>
            ) : (
              <div>
                <h2 className="font-serif text-xl font-black text-[#1B4332] mb-1 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#B8442C]" />
                  Créer mon Bar / Mon Compte
                </h2>
                <p className="text-xs text-[#1B4332]/80 mb-4 font-medium">
                  Formulaire d'inscription rapide (14 jours d'essai offerts).
                </p>

                <form onSubmit={handleCreateBar} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">
                      Nom de votre Bar / Snack / Lounge *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: BAR LA CITADELLE"
                      value={nomBar}
                      onChange={(e) => setNomBar(e.target.value)}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">
                      Téléphone du Gérant / Patronne *
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: 699001122"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-[#1B4332] block mb-1">Ville</label>
                      <input
                        type="text"
                        placeholder="Ex: Douala, Yaoundé..."
                        value={ville}
                        onChange={(e) => setVille(e.target.value)}
                        className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-[#1B4332] font-bold text-xs focus:outline-none focus:border-[#1B4332]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#1B4332] block mb-1">Quartier / Adresse</label>
                      <input
                        type="text"
                        placeholder="Ex: Akwa, Bastos..."
                        value={adresse}
                        onChange={(e) => setAdresse(e.target.value)}
                        className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-[#1B4332] font-bold text-xs focus:outline-none focus:border-[#1B4332]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="py-3.5 px-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md transition-transform active:scale-95"
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
