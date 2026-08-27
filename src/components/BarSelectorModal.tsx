'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Check,
  MapPin,
  Sparkles,
  ShoppingBag,
  Beer,
  Utensils,
  X,
  Lock,
  Eye
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { TypeActivite, Etablissement, TARIFS_ABONNEMENT } from '@/types';

interface BarSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSuccess?: (etab: Etablissement) => void;
}

export default function BarSelectorModal({
  isOpen,
  onClose,
  onSelectSuccess,
}: BarSelectorModalProps) {
  const router = useRouter();
  const etablissements = offlineDB.getEtablissements();
  const currentEtab = offlineDB.getEtablissement();

  const [mode, setMode] = useState<'list' | 'create'>('list');

  // Form State pour création d'un nouveau commerce œko
  const [typeActivite, setTypeActivite] = useState<TypeActivite>('boutique');
  const [nomCommerce, setNomCommerce] = useState('');
  const [ville, setVille] = useState('Douala');
  const [adresse, setAdresse] = useState('');
  const [patronNom, setPatronNom] = useState('');
  const [patronPin, setPatronPin] = useState('1234');

  if (!isOpen) return null;

  const handleSelectEtab = (id: string) => {
    offlineDB.switchEtablissement(id);
    const etab = offlineDB.getEtablissement();
    if (onSelectSuccess) onSelectSuccess(etab);
    onClose();
    router.refresh();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomCommerce.trim() || !adresse.trim() || !patronNom.trim()) return;

    const newEtab = offlineDB.createEtablissement({
      nom: nomCommerce.trim(),
      type_activite: typeActivite,
      ville,
      adresse: adresse.trim(),
      patronNom: patronNom.trim(),
      patronPin: patronPin.trim() || '1234',
    });

    if (onSelectSuccess) onSelectSuccess(newEtab);
    onClose();
    router.push('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-black p-1 rounded-xl bg-[#FBF7EF]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-xl font-black shadow-md">
            👁️
          </div>
          <div>
            <h2 className="font-serif font-black text-xl text-[#1B4332]">œko — L'œil du patron</h2>
            <p className="text-xs text-gray-600 font-bold">Sélection ou création de compte commerce</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-2 bg-[#FBF7EF] p-1.5 rounded-2xl border border-[#E2D5C3]">
          <button
            onClick={() => setMode('list')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'list' ? 'bg-[#1B4332] text-white shadow-md' : 'text-[#1B4332]'
            }`}
          >
            Mes Commerces Existant ({etablissements.length})
          </button>

          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'create' ? 'bg-[#B8442C] text-white shadow-md' : 'text-[#1B4332]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Créer un Compte (Essai 7j)</span>
          </button>
        </div>

        {/* MODE 1: LISTE DES COMMERCES EXISTANTS */}
        {mode === 'list' && (
          <div className="space-y-3">
            {etablissements.map((etab) => {
              const isSelected = etab.id === currentEtab?.id;
              const isBoutique = etab.type_activite === 'boutique';
              const isBar = etab.type_activite === 'bar';

              return (
                <div
                  key={etab.id}
                  onClick={() => handleSelectEtab(etab.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                      : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3] hover:border-[#1B4332]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E8A33D] text-[#0F291E] flex items-center justify-center text-xl font-bold">
                      {isBoutique ? '👗' : isBar ? '🍺' : '🍟'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-black text-base">{etab.nom}</h4>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-[#E8A33D]/20 px-2 py-0.5 rounded-full border">
                          {etab.type_activite || 'Snack'}
                        </span>
                      </div>
                      <p className="text-xs opacity-80">{etab.ville} - {etab.adresse}</p>
                    </div>
                  </div>

                  {isSelected && <Check className="w-6 h-6 text-[#E8A33D]" />}
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 2: ONBOARDING & CRÉATION DE COMPTE (3 SÉLECTIONS DE CARTES) */}
        {mode === 'create' && (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Essai gratuit de 7 jours activé automatiquement, sans carte ni paiement immédiat !</span>
            </div>

            {/* 3 Cartes Métier œko */}
            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-2">
                1. Choisissez la Catégorie de votre Activité *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Card 1: Boutique */}
                <div
                  onClick={() => setTypeActivite('boutique')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all text-left space-y-2 ${
                    typeActivite === 'boutique'
                      ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                      : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                  }`}
                >
                  <span className="text-2xl">👗</span>
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-black text-sm">Boutique</h4>
                    <span className="text-[10px] font-black text-[#E8A33D]">5 000 F/m</span>
                  </div>
                  <p className="text-[11px] opacity-80 leading-snug font-medium">
                    Vêtements & chaussures. Variantes tailles/couleurs, livraisons en ligne.
                  </p>
                </div>

                {/* Card 2: Bar */}
                <div
                  onClick={() => setTypeActivite('bar')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all text-left space-y-2 ${
                    typeActivite === 'bar'
                      ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                      : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                  }`}
                >
                  <span className="text-2xl">🍺</span>
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-black text-sm">Bar / Lounge</h4>
                    <span className="text-[10px] font-black text-[#E8A33D]">5 000 F/m</span>
                  </div>
                  <p className="text-[11px] opacity-80 leading-snug font-medium">
                    Tables ouvertes, note divisible par personne, déstockage au service.
                  </p>
                </div>

                {/* Card 3: Snack */}
                <div
                  onClick={() => setTypeActivite('snack')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all text-left space-y-2 ${
                    typeActivite === 'snack'
                      ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                      : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                  }`}
                >
                  <span className="text-2xl">🍟</span>
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-black text-sm">Snack-Bar</h4>
                    <span className="text-[10px] font-black text-[#E8A33D]">10 000 F/m</span>
                  </div>
                  <p className="text-[11px] opacity-80 leading-snug font-medium">
                    Flux 2 étapes, multi-caisses, carrés VIP et patron à distance.
                  </p>
                </div>
              </div>
            </div>

            {/* Informations du commerce */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Commerce *</label>
                <input
                  type="text"
                  placeholder="Ex: Boutique Éléganza"
                  value={nomCommerce}
                  onChange={(e) => setNomCommerce(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Ville *</label>
                <select
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                >
                  <option value="Douala">Douala</option>
                  <option value="Yaoundé">Yaoundé</option>
                  <option value="Bafoussam">Bafoussam</option>
                  <option value="Garoua">Garoua</option>
                  <option value="Kribi">Kribi</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Quartier & Adresse *</label>
              <input
                type="text"
                placeholder="Ex: Rue Joffre - Akwa"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2D5C3]">
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Patron / Patronne *</label>
                <input
                  type="text"
                  placeholder="Ex: Mme EBOLE"
                  value={patronNom}
                  onChange={(e) => setPatronNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Code PIN à 4 Chiffres *</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="1234"
                  value={patronPin}
                  onChange={(e) => setPatronPin(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332] text-center tracking-widest"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-sm flex items-center justify-center gap-2 shadow-glow-brique transition-transform active:scale-95"
            >
              <Sparkles className="w-5 h-5 text-white" />
              <span>Créer mon Compte œko (Essai 7j Offert)</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
