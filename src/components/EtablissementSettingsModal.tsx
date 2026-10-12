'use client';

import React, { useState, useEffect } from 'react';
import { Building2, X, Check, Sparkles, Store, MapPin, Tag, ArrowLeft } from 'lucide-react';
import { offlineDB, cleanCodeSegment } from '@/lib/offlineDB';
import { Etablissement } from '@/types';
import { saveActiviteToCloud } from '@/lib/activitesSyncService';
import DiagnosticPanel from './DiagnosticPanel';

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
  const [abrevBoutique, setAbrevBoutique] = useState('');
  const [ville, setVille] = useState('Douala');
  const [adresse, setAdresse] = useState('');
  const [secteurBoutique, setSecteurBoutique] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setNom(etab.nom || '');
      setAbrevBoutique(etab.abrev_boutique || cleanCodeSegment(etab.nom || 'OEKO', 3));
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

    const updated = offlineDB.updateEtablissement(etablissement.id, {
      nom: nom.trim(),
      abrev_boutique: abrevBoutique.trim().toUpperCase() || cleanCodeSegment(nom.trim(), 3),
      ville,
      adresse: adresse.trim(),
      secteur_boutique: etablissement.type_activite === 'boutique' ? secteurBoutique.trim() : undefined,
    });

    if (updated) {
      saveActiviteToCloud(updated);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 1000);
  };

  const isBoutique = etablissement.type_activite === 'boutique';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl w-full max-w-xl shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* En-tête fixe avec bouton retour et fermeture */}
        <div className="p-4 sm:p-5 border-b border-[#E2D5C3] bg-[#EFE6D8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#1B4332] font-bold text-xs flex items-center gap-1.5 border border-[#E2D5C3] shadow-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#1B4332]" />
              <span>Retour</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <div>
                <h2 className="font-serif font-black text-base sm:text-lg text-[#1B4332] leading-tight">
                  Paramètres du Commerce
                </h2>
                <p className="text-[11px] text-gray-600 font-bold hidden sm:block">
                  Profil, codes-barres & diagnostic
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-black p-2 rounded-xl bg-white/80 hover:bg-white border border-[#E2D5C3] shadow-sm transition-all cursor-pointer"
            title="Fermer la fenêtre (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>Paramètres enregistrés avec succès !</span>
          </div>
        )}

        <form id="etablissement-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Commerce *</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => {
                  setNom(e.target.value);
                  if (!etablissement?.abrev_boutique) {
                    setAbrevBoutique(cleanCodeSegment(e.target.value, 3));
                  }
                }}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Abréviation (Code)</label>
              <input
                type="text"
                maxLength={5}
                placeholder="ex: PEP"
                value={abrevBoutique}
                onChange={(e) => setAbrevBoutique(e.target.value.toUpperCase())}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-mono font-black text-[#B8442C] uppercase"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-medium">
            Format des codes générés : <strong className="font-mono text-[#1B4332]">{abrevBoutique || 'PEP'}-ROB-ROU-001</strong>
          </p>

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

          {/* Écran / Panneau de Diagnostic Supabase (Phase 1) */}
          <div className="pt-2 border-t border-[#E2D5C3]">
            <DiagnosticPanel />
          </div>
        </form>

        {/* Pied de page fixe avec boutons Annuler et Enregistrer toujours visibles */}
        <div className="p-3 sm:p-4 border-t border-[#E2D5C3] bg-[#EFE6D8] flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs border border-[#E2D5C3] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Fermer / Retour</span>
          </button>
          <button
            type="submit"
            form="etablissement-form"
            className="flex-1 py-3 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 text-white" />
            <span>Enregistrer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
