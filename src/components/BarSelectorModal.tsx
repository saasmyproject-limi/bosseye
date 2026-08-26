'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Plus, Check, X, Building2, Phone, MapPin, Beer, Utensils, ShoppingBag } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Etablissement, TypeActivite } from '@/types';

interface BarSelectorModalProps {
  onBoutiqueChanged?: () => void;
}

export default function BarSelectorModal({ onBoutiqueChanged }: BarSelectorModalProps) {
  const router = useRouter();
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [activeEtablissement, setActiveEtablissement] = useState<Etablissement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Formulaire d'inscription d'établissement
  const [nomBar, setNomBar] = useState('');
  const [telephone, setTelephone] = useState('');
  const [typeActivite, setTypeActivite] = useState<TypeActivite>('boutique');
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
    router.refresh();
  };

  const handleCreateBar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomBar.trim() || !telephone.trim()) return;

    offlineDB.createEtablissement({
      nom: nomBar.trim(),
      type_activite: typeActivite,
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
    router.refresh();
  };

  return (
    <>
      {/* Bouton En-tête pour changer / voir le bar actif */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F3ECE0] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] text-xs font-bold transition-all shadow-sm"
      >
        <Store className="w-4 h-4 text-[#B8442C]" />
        <span className="truncate max-w-[130px] font-black">{activeEtablissement?.nom || 'Mon Établissement'}</span>
        <span className="text-[10px] text-gray-500">▾</span>
      </button>

      {/* Modal Multi-Établissement & Inscription */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
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
                  Vos Établissements & Boutiques
                </h2>
                <p className="text-xs text-[#1B4332]/80 mb-4 font-medium">
                  Basculez d'un compte à un autre en 1 clic (Bar, Snack ou Boutique).
                </p>

                <div className="space-y-2.5 mb-5 max-h-64 overflow-y-auto pr-1">
                  {etablissements.map((b) => {
                    const isSelected = b.id === activeEtablissement?.id;
                    const typeAct = b.type_activite || 'snack';
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
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#E8A33D]/20 text-[#1B4332] flex items-center justify-center font-bold text-base">
                            {typeAct === 'boutique' ? '👗' : typeAct === 'bar' ? '🍺' : '🍟'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-[#1B4332]">{b.nom}</h4>
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332]">
                                {typeAct === 'boutique' ? 'Boutique' : typeAct === 'bar' ? 'Bar / Lounge' : 'Snack-Bar'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                              {b.ville} {b.adresse ? `• ${b.adresse}` : ''}
                            </p>
                          </div>
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
                  <span>🏬 Inscrire un Nouvel Établissement ou Boutique</span>
                </button>
              </div>
            ) : (
              <div>
                <h2 className="font-serif text-xl font-black text-[#1B4332] mb-1 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#B8442C]" />
                  Créer un Nouvel Établissement
                </h2>
                <p className="text-xs text-[#1B4332]/80 mb-4 font-medium">
                  Choisissez le type d'activité pour adapter automatiquement le flux de vente.
                </p>

                <form onSubmit={handleCreateBar} className="space-y-4">
                  {/* Sélection visuelle 3 Cartes Activité */}
                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-2">
                      Type d'activité * (Définit le flux de vente)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Carte 1: Bar */}
                      <div
                        onClick={() => setTypeActivite('bar')}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                          typeActivite === 'bar'
                            ? 'bg-[#1B4332] border-[#1B4332] text-white shadow-md'
                            : 'bg-[#FBF7EF] border-[#E2D5C3] text-[#1B4332] hover:border-[#1B4332]'
                        }`}
                      >
                        <div className="text-2xl mb-1">🍺</div>
                        <h4 className="font-bold text-xs">Bar / Lounge</h4>
                        <p className={`text-[10px] mt-1 leading-tight ${typeActivite === 'bar' ? 'text-gray-200' : 'text-gray-500'}`}>
                          Tables ouvertes, consommations cumulées & addition.
                        </p>
                      </div>

                      {/* Carte 2: Snack-bar */}
                      <div
                        onClick={() => setTypeActivite('snack')}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                          typeActivite === 'snack'
                            ? 'bg-[#1B4332] border-[#1B4332] text-white shadow-md'
                            : 'bg-[#FBF7EF] border-[#E2D5C3] text-[#1B4332] hover:border-[#1B4332]'
                        }`}
                      >
                        <div className="text-2xl mb-1">🍟</div>
                        <h4 className="font-bold text-xs">Snack-Bar</h4>
                        <p className={`text-[10px] mt-1 leading-tight ${typeActivite === 'snack' ? 'text-gray-200' : 'text-gray-500'}`}>
                          Rôles séparés : Serveuse transmet en caisse.
                        </p>
                      </div>

                      {/* Carte 3: Boutique */}
                      <div
                        onClick={() => setTypeActivite('boutique')}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                          typeActivite === 'boutique'
                            ? 'bg-[#1B4332] border-[#1B4332] text-white shadow-md'
                            : 'bg-[#FBF7EF] border-[#E2D5C3] text-[#1B4332] hover:border-[#1B4332]'
                        }`}
                      >
                        <div className="text-2xl mb-1">👗</div>
                        <h4 className="font-bold text-xs">Boutique</h4>
                        <p className={`text-[10px] mt-1 leading-tight ${typeActivite === 'boutique' ? 'text-gray-200' : 'text-gray-500'}`}>
                          Vente comptoir directe, gestion des tailles & couleurs.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">
                      Nom de votre Établissement / Boutique *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: BOUTIQUE ELEGANCE AKWA"
                      value={nomBar}
                      onChange={(e) => setNomBar(e.target.value)}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">
                      Téléphone du Responsable *
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
                      <label className="text-xs font-bold text-[#1B4332] block mb-1">Quartier / Rue</label>
                      <input
                        type="text"
                        placeholder="Ex: Akwa, Rue Joffre..."
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
                      🚀 Valider & Accéder à mon Compte
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
