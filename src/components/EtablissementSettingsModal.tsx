'use client';

import React, { useState, useEffect } from 'react';
import { Building2, X, Check, Sparkles, Store, MapPin, Tag } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Etablissement } from '@/types';

interface EtablissementSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EtablissementSettingsModal({
  isOpen,
  onClose,
  onSuccess,
}: EtablissementSettingsModalProps) {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [nom, setNom] = useState('');
  const [ville, setVille] = useState('Douala');
  const [adresse, setAdresse] = useState('');
  const [secteurBoutique, setSecteurBoutique] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setNom(etab.nom || '');
      setVille(etab.ville || 'Douala');
      setAdresse(etab.adresse || '');
      setSecteurBoutique(etab.secteur_boutique || 'Vêtements & Mode');
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !etablissement) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    offlineDB.updateEtablissement(etablissement.id, {
      nom: nom.trim(),
      ville,
      adresse: adresse.trim(),
      secteur_boutique: etablissement.type_activite === 'boutique' ? secteurBoutique.trim() : undefined,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 1000);
  };

  const isBoutique = etablissement.type_activite === 'boutique';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-black p-1 rounded-xl bg-[#FBF7EF]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-xl font-black shadow-md">
            ⚙️
          </div>
          <div>
            <h2 className="font-serif font-black text-xl text-[#1B4332]">Paramètres du Commerce</h2>
            <p className="text-xs text-gray-600 font-bold">
              Profil du commerce et secteur d'activité IA
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>Paramètres enregistrés avec succès !</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Commerce *</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Type d'activité</label>
              <input
                type="text"
                value={etablissement.type_activite.toUpperCase()}
                disabled
                className="w-full bg-gray-200 border border-gray-300 rounded-2xl p-3 text-xs font-black text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#1B4332] block mb-1">Quartier & Adresse *</label>
            <input
              type="text"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
              required
            />
          </div>

          {/* Adaptation Secteur si Boutique */}
          {isBoutique && (
            <div className="p-3.5 bg-[#FBF7EF] rounded-2xl border border-[#E2D5C3] space-y-2">
              <label className="text-xs font-bold text-[#1B4332] block">
                Que vendez-vous dans votre boutique ? (Secteur IA)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Vêtements & Mode',
                  'Téléphones & Électronique',
                  'Pharmacie & Médicaments',
                  'Électroménager',
                  'Alimentation générale',
                  'Chaussures & Maroquinerie',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSecteurBoutique(s)}
                    className={`py-1 px-2.5 rounded-xl text-[11px] font-bold transition-all ${
                      secteurBoutique === s
                        ? 'bg-[#1B4332] text-white shadow-sm'
                        : 'bg-white text-[#1B4332] border border-[#E2D5C3]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Ou texte libre (ex: Vêtements traditionnels)..."
                value={secteurBoutique}
                onChange={(e) => setSecteurBoutique(e.target.value)}
                className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3.5 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-white" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
