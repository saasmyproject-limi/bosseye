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
  X,
  Lock,
  Phone,
  User,
  ArrowRight
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { TypeActivite, Etablissement } from '@/types';
import { syncShopToCloud } from '@/lib/supabaseSync';

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

  // Form State pour création d'un nouveau commerce œko (Boutique)
  const [selectedPalierCode, setSelectedPalierCode] = useState<'essentiel' | 'standard' | 'pro'>('standard');
  const [nomCommerce, setNomCommerce] = useState('');
  const [secteurBoutique, setSecteurBoutique] = useState('Vêtements & Mode');
  const [ville, setVille] = useState('Douala');
  const [adresse, setAdresse] = useState('');
  const [patronNom, setPatronNom] = useState('');
  const [patronTelephone, setPatronTelephone] = useState('');
  const [patronPin, setPatronPin] = useState('1234');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomCommerce.trim() || !adresse.trim() || !patronNom.trim()) return;

    const tarifMap: Record<string, number> = { essentiel: 3000, standard: 5000, pro: 10000 };
    const selectedTarif = tarifMap[selectedPalierCode] || 5000;

    setIsSubmitting(true);

    const newEtab = offlineDB.createEtablissement({
      nom: nomCommerce.trim(),
      type_activite: 'boutique',
      secteur_boutique: secteurBoutique.trim() || 'Commerce général',
      ville,
      adresse: adresse.trim(),
      patronNom: patronNom.trim(),
      telephone: patronTelephone.trim() || undefined,
      patronPin: patronPin.trim() || '1234',
      tarif_mensuel: selectedTarif,
    });

    // Sauvegarder sur le cloud en arrière-plan
    syncShopToCloud(newEtab.id);

    if (onSelectSuccess) onSelectSuccess(newEtab);
    setIsSubmitting(false);
    onClose();
    router.push('/boutique/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FAF9F5] border-2 border-[#E2D5C3] rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200/60 transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-2xl font-black shadow-md">
            👗
          </div>
          <div>
            <h2 className="font-serif font-black text-xl sm:text-2xl text-[#1B4332]">
              Création d'une nouvelle activité Boutique
            </h2>
            <p className="text-xs text-gray-600 font-semibold">
              Configurez votre commerce. Essai gratuit de 7 jours inclus sans engagement.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Choix des 3 Paliers Tarifaires */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1B4332] block">
              1. Choisissez le Palier Tarifaire de votre Boutique *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Palier 1: Essentiel */}
              <div
                onClick={() => setSelectedPalierCode('essentiel')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-1.5 ${
                  selectedPalierCode === 'essentiel'
                    ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                    : 'bg-white text-[#1B4332] border-[#E2D5C3] hover:border-[#1B4332]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-black text-xs">Essentiel</span>
                  <span className="text-[10px] font-black text-[#E8A33D]">3 000 F/m</span>
                </div>
                <p className="text-[10px] opacity-85 leading-snug">
                  Patron solo (1 personne), 100 articles max.
                </p>
              </div>

              {/* Palier 2: Standard */}
              <div
                onClick={() => setSelectedPalierCode('standard')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-1.5 relative ${
                  selectedPalierCode === 'standard'
                    ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                    : 'bg-white text-[#1B4332] border-[#E2D5C3] hover:border-[#1B4332]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-black text-xs">Standard</span>
                  <span className="text-[10px] font-black text-[#E8A33D]">5 000 F/m</span>
                </div>
                <p className="text-[10px] opacity-85 leading-snug">
                  2-3 employés, 400 articles max. (Recommandé)
                </p>
              </div>

              {/* Palier 3: Pro */}
              <div
                onClick={() => setSelectedPalierCode('pro')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-1.5 ${
                  selectedPalierCode === 'pro'
                    ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                    : 'bg-white text-[#1B4332] border-[#E2D5C3] hover:border-[#1B4332]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-black text-xs">Pro</span>
                  <span className="text-[10px] font-black text-[#E8A33D]">10 000 F/m</span>
                </div>
                <p className="text-[10px] opacity-85 leading-snug">
                  Multi-employés illimités, WhatsApp, Crédit client.
                </p>
              </div>
            </div>
          </div>

          {/* Produits vendus */}
          <div className="p-4 bg-white rounded-2xl border border-[#E2D5C3] space-y-2.5">
            <label className="text-xs font-bold text-[#1B4332] block">
              2. Que vendez-vous principalement dans votre Boutique ? *
            </label>

            <div className="flex flex-wrap gap-2">
              {[
                '👗 Vêtements & Mode',
                '📱 Téléphones & Électronique',
                '🔌 Électroménager',
                '🛒 Alimentation générale',
                '👞 Chaussures & Maroquinerie',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSecteurBoutique(chip)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    secteurBoutique === chip
                      ? 'bg-[#1B4332] text-white shadow-md'
                      : 'bg-gray-50 text-[#1B4332] border border-[#E2D5C3] hover:bg-gray-100'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Ex: Vêtements, Chaussures, Accessoires de mode..."
              value={secteurBoutique}
              onChange={(e) => setSecteurBoutique(e.target.value)}
              className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
              required
            />
          </div>

          {/* Informations du commerce */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Commerce *</label>
              <input
                type="text"
                placeholder="Ex: Boutique Élégance Akwa"
                value={nomCommerce}
                onChange={(e) => setNomCommerce(e.target.value)}
                className="w-full bg-white border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Ville *</label>
              <select
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                className="w-full bg-white border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
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
              className="w-full bg-white border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E2D5C3]">
            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Patron / Gérant *</label>
              <input
                type="text"
                placeholder="Ex: Mme EBOLE"
                value={patronNom}
                onChange={(e) => setPatronNom(e.target.value)}
                className="w-full bg-white border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Téléphone / WhatsApp *</label>
              <input
                type="tel"
                placeholder="Ex: 699 00 00 00"
                value={patronTelephone}
                onChange={(e) => setPatronTelephone(e.target.value)}
                className="w-full bg-white border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
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
                className="w-full bg-white border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332] text-center tracking-widest focus:outline-none focus:border-[#1B4332]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer mt-2"
          >
            <Sparkles className="w-5 h-5 text-[#E8A33D]" />
            <span>Valider & Créer mon activité Boutique (Essai 7j offert)</span>
            <ArrowRight className="w-4 h-4 text-[#E8A33D]" />
          </button>
        </form>
      </div>
    </div>
  );
}
