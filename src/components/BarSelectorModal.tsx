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
  Eye,
  CloudDownload,
  CloudUpload,
  RefreshCw,
  Search
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { TypeActivite, Etablissement, TARIFS_ABONNEMENT } from '@/types';
import { syncShopToCloud, downloadShopFromCloud } from '@/lib/supabaseSync';

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

  const [mode, setMode] = useState<'list' | 'create' | 'cloud'>('list');

  // Form State pour création d'un nouveau commerce œko
  const [typeActivite, setTypeActivite] = useState<TypeActivite>('boutique');
  const [nomCommerce, setNomCommerce] = useState('');
  const [secteurBoutique, setSecteurBoutique] = useState('Vêtements & Mode');
  const [ville, setVille] = useState('Douala');
  const [adresse, setAdresse] = useState('');
  const [patronNom, setPatronNom] = useState('');
  const [patronPin, setPatronPin] = useState('1234');

  // Form State pour téléchargement cloud
  const [cloudSearchCode, setCloudSearchCode] = useState('');
  const [cloudSyncStatus, setCloudSyncStatus] = useState<{ loading: boolean; message: string; success?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSelectEtab = (id: string) => {
    offlineDB.switchEtablissement(id);
    const etab = offlineDB.getEtablissement();
    if (onSelectSuccess) onSelectSuccess(etab);
    onClose();
    router.refresh();
  };

  const handleSyncToCloud = async (etabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCloudSyncStatus({ loading: true, message: 'Sauvegarde sur le cloud en cours...' });
    const res = await syncShopToCloud(etabId);
    setCloudSyncStatus({ loading: false, message: res.message, success: res.success });
  };

  const handleDownloadFromCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudSearchCode.trim()) return;

    setCloudSyncStatus({ loading: true, message: 'Recherche et téléchargement de la boutique...' });
    const res = await downloadShopFromCloud(cloudSearchCode.trim());
    setCloudSyncStatus({ loading: false, message: res.message, success: res.success });

    if (res.success && res.etab) {
      if (onSelectSuccess) onSelectSuccess(res.etab);
      setTimeout(() => {
        onClose();
        router.refresh();
      }, 1500);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomCommerce.trim() || !adresse.trim() || !patronNom.trim()) return;
    if (typeActivite === 'boutique' && !secteurBoutique.trim()) return;

    const newEtab = offlineDB.createEtablissement({
      nom: nomCommerce.trim(),
      type_activite: typeActivite,
      secteur_boutique: typeActivite === 'boutique' ? (secteurBoutique || 'Vêtements & Mode') : undefined,
      ville,
      adresse: adresse.trim(),
      patronNom: patronNom.trim(),
      patronPin: patronPin.trim() || '1234',
    });

    // Sauvegarder immédiatement sur le cloud
    syncShopToCloud(newEtab.id);

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
            <p className="text-xs text-gray-600 font-bold">Sélection, création ou synchronisation multi-appareils</p>
          </div>
        </div>

        {/* Status Alert Banner */}
        {cloudSyncStatus && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              cloudSyncStatus.loading
                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                : cloudSyncStatus.success
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-red-100 text-red-900 border border-red-300'
            }`}
          >
            {cloudSyncStatus.loading && <RefreshCw className="w-4 h-4 animate-spin text-blue-700" />}
            <span>{cloudSyncStatus.message}</span>
          </div>
        )}

        {/* Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#FBF7EF] p-1.5 rounded-2xl border border-[#E2D5C3]">
          <button
            onClick={() => setMode('list')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              mode === 'list' ? 'bg-[#1B4332] text-white shadow-md' : 'text-[#1B4332]'
            }`}
          >
            Mes Commerces ({etablissements.length})
          </button>

          <button
            onClick={() => setMode('cloud')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'cloud' ? 'bg-[#1E3A8A] text-white shadow-md' : 'text-[#1B4332]'
            }`}
          >
            <CloudDownload className="w-4 h-4 text-[#E8A33D]" />
            <span>Rejoindre sur 2è Appareil (Cloud)</span>
          </button>

          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'create' ? 'bg-[#B8442C] text-white shadow-md' : 'text-[#1B4332]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Créer un Compte</span>
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
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                      : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3] hover:border-[#1B4332]'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-10 h-10 rounded-xl bg-[#E8A33D] text-[#0F291E] flex items-center justify-center text-xl font-bold shrink-0">
                      {isBoutique ? '👗' : isBar ? '🍺' : '🍟'}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-black text-base truncate">{etab.nom}</h4>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-[#E8A33D]/20 px-2 py-0.5 rounded-full border border-[#E8A33D]/40">
                          {etab.type_activite || 'Boutique'}
                        </span>
                      </div>
                      <p className="text-xs opacity-80 truncate">{etab.ville} - {etab.adresse}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleSyncToCloud(etab.id, e)}
                      title="Sauvegarder sur le Cloud pour y accéder depuis un autre ordinateur/téléphone"
                      className="px-2.5 py-1.5 rounded-xl bg-[#0F291E] text-[#E8A33D] hover:bg-[#E8A33D] hover:text-[#0F291E] text-[10px] font-bold flex items-center gap-1 transition-all border border-[#E8A33D]/40"
                    >
                      <CloudUpload className="w-3.5 h-3.5" />
                      <span>Sync Cloud</span>
                    </button>
                    {isSelected && <Check className="w-6 h-6 text-[#E8A33D]" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 2: TELECHARGEMENT DEPUIS LE CLOUD POUR AUTRE APPAREIL */}
        {mode === 'cloud' && (
          <form onSubmit={handleDownloadFromCloud} className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs font-bold space-y-2">
              <div className="flex items-center gap-2 text-sm font-black text-blue-900">
                <CloudDownload className="w-5 h-5 text-blue-600" />
                <span>Synchronisation sur plusieurs appareils</span>
              </div>
              <p className="text-[11px] leading-relaxed font-normal opacity-90">
                Si vous avez créé votre boutique et son stock sur l'ordinateur de la boutique, vous pouvez récupérer <strong>l'intégralité de la boutique à la maison</strong> en saisissant le Nom ou Code de votre boutique ci-dessous.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-1">
                Saisissez le Nom exact ou le Code de la Boutique *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: Boutique Éléganza"
                  value={cloudSearchCode}
                  onChange={(e) => setCloudSearchCode(e.target.value)}
                  className="w-full bg-white border-2 border-[#1E3A8A] rounded-2xl p-3.5 pl-10 text-xs font-bold text-[#1B4332]"
                  required
                />
                <Search className="w-4 h-4 text-[#1E3A8A] absolute left-3.5 top-4" />
              </div>
            </div>

            <button
              type="submit"
              disabled={cloudSyncStatus?.loading}
              className="w-full py-4 px-4 rounded-2xl bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
            >
              <CloudDownload className="w-5 h-5 text-[#E8A33D]" />
              <span>Télécharger & Synchroniser cette Boutique ➔</span>
            </button>
          </form>
        )}

        {/* MODE 3: ONBOARDING & CRÉATION DE COMPTE */}
        {mode === 'create' && (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Essai gratuit de 7 jours activé automatiquement, synchronisation Cloud incluse !</span>
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

            {/* Champ spécifique Boutique */}
            {typeActivite === 'boutique' && (
              <div className="p-4 bg-[#FBF7EF] rounded-2xl border border-[#E2D5C3] space-y-3">
                <label className="text-xs font-bold text-[#1B4332] block">
                  2. Que vendez-vous principalement dans votre Boutique ? *
                </label>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '👗 Vêtements & Mode', val: 'Vêtements & Mode' },
                    { label: '📱 Téléphones & Électronique', val: 'Téléphones & Électronique' },
                    { label: '🔌 Électroménager', val: 'Électroménager' },
                    { label: '🛒 Alimentation générale', val: 'Alimentation générale' },
                    { label: '👞 Chaussures & Maroquinerie', val: 'Chaussures & Maroquinerie' },
                  ].map((chip) => (
                    <button
                      key={chip.val}
                      type="button"
                      onClick={() => setSecteurBoutique(chip.val)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                        secteurBoutique === chip.val
                          ? 'bg-[#1B4332] text-white shadow-md'
                          : 'bg-white text-[#1B4332] border border-[#E2D5C3] hover:bg-[#E2D5C3]/40'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Ou précisez en texte libre (ex: Vêtements traditionnels, Pagne)..."
                  value={secteurBoutique}
                  onChange={(e) => setSecteurBoutique(e.target.value)}
                  className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  required
                />
              </div>
            )}

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
