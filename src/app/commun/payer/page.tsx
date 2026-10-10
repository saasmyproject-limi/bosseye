'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Lock,
  Calendar,
  Check,
  AlertCircle,
  Users,
  Package,
  Star,
  Clock,
  PhoneCall,
  ShieldCheck,
  Send,
  AlertTriangle,
  Info
} from 'lucide-react';
import { offlineDB, getTerminology } from '@/lib/offlineDB';
import Link from 'next/link';
import {
  Utilisateur,
  Etablissement,
  PalierTarifaire,
  DEFAULT_PALIERS_LIST,
  ConfigPaiementManuel,
  DemandePaiementAbonnement
} from '@/types';

export default function CommunPayerPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [paliers, setPaliers] = useState<PalierTarifaire[]>(DEFAULT_PALIERS_LIST);
  const [selectedPalierCode, setSelectedPalierCode] = useState<'essentiel' | 'standard' | 'pro'>('standard');
  const [configManuel, setConfigManuel] = useState<ConfigPaiementManuel>(offlineDB.getConfigPaiementManuel());

  const [methode, setMethode] = useState<string>('Orange Money');
  const [telephone, setTelephone] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedDemande, setSubmittedDemande] = useState<DemandePaiementAbonnement | null>(null);

  const [usageInfo, setUsageInfo] = useState<{
    distinctCount: number;
    tablesCount: number;
    usersCount: number;
    currentTier: PalierTarifaire;
    recommendedTier: PalierTarifaire;
    isOverflow: boolean;
    overflowReason?: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      const user = offlineDB.getCurrentUser();
      const palList = offlineDB.getPaliersTarifaires();
      const usage = offlineDB.checkEtablissementTierUsage(etab);
      const config = offlineDB.getConfigPaiementManuel();

      setEtablissement(etab);
      setCurrentUser(user);
      setPaliers(palList);
      setUsageInfo(usage);
      setConfigManuel(config);

      // Sélectionner le palier recommandé selon les articles
      if (usage.isOverflow) {
        setSelectedPalierCode(usage.recommendedTier.code_palier);
      } else {
        setSelectedPalierCode(usage.currentTier.code_palier);
      }

      // Vérifier si une demande est déjà en attente
      const demandes = offlineDB.getDemandesPaiementAbonnement();
      const pending = demandes.find((d) => d.etablissement_id === etab.id && d.statut === 'en_attente');
      if (pending) {
        setSubmittedDemande(pending);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isServeuseOrNonPatron = ['Serveuse', 'Caissière', 'Employé'].includes(currentUser?.role || '');
  const daysLeft = etablissement ? offlineDB.getTrialDaysRemaining(etablissement) : 7;
  const isExpired = etablissement ? offlineDB.isTrialExpired(etablissement) : false;
  const isBlocked = etablissement?.statut_abonnement === 'bloque';
  const isPendingValidation = etablissement?.statut_abonnement === 'en_attente_validation';

  const activePalier = paliers.find((p) => p?.code_palier === selectedPalierCode) || paliers[1] || paliers[0] || DEFAULT_PALIERS_LIST[1];
  const tarifAbonnement = activePalier ? activePalier.tarif_mensuel : 5000;

  const handleSubmitPaiementManuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (isServeuseOrNonPatron || !telephone.trim() || !reference.trim() || !etablissement) return;

    setIsSubmitting(true);

    const demande = offlineDB.submitDemandePaiementAbonnement({
      etablissement,
      palier: activePalier,
      methode,
      telephone: telephone.trim(),
      reference: reference.trim(),
    });

    setSubmittedDemande(demande);
    setIsSubmitting(false);
    loadData();
  };

  return (
    <AppLayout>
      {isServeuseOrNonPatron ? (
        <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-md mt-12">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-3xl font-bold">
            🔒
          </div>
          <h2 className="font-serif font-black text-2xl text-[#1B4332]">
            Accès Restreint — Mon Abonnement
          </h2>
          <p className="text-xs text-gray-700 font-bold leading-relaxed">
            Seul le Patron ou Gérant de la boutique a accès à la gestion de l'abonnement et aux déclarations de paiement.
          </p>
          <div className="pt-2">
            <Link
              href="/boutique/ventes"
              className="inline-block py-3.5 px-6 rounded-2xl bg-[#1B4332] text-white font-black text-xs shadow-md hover:bg-[#2D6A4F] transition-all"
            >
              ← Retour à l'écran de Ventes
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Header Abonnement Patron */}
          <div className="pb-4 border-b border-[#E2D5C3]">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
                Mon Abonnement œko
              </span>

              {/* Badge de statut d'abonnement */}
              {isBlocked ? (
                <span className="text-xs font-black uppercase bg-red-950 text-red-200 px-3 py-0.5 rounded-full border border-red-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-red-400" />
                  Compte Bloqué Par Administration
                </span>
              ) : isPendingValidation ? (
                <span className="text-xs font-black uppercase bg-amber-100 text-amber-900 px-3 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 animate-pulse">
                  <Clock className="w-3 h-3 text-amber-700" />
                  Paiement Soumis — En Attente de Confirmation
                </span>
              ) : isExpired ? (
                <span className="text-xs font-black uppercase bg-rose-100 text-rose-900 px-3 py-0.5 rounded-full border border-rose-300">
                  Abonnement Expiré
                </span>
              ) : etablissement?.statut_abonnement === 'actif' ? (
                <span className="text-xs font-black uppercase bg-emerald-100 text-emerald-900 px-3 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Abonnement Actif (Valide)
                </span>
              ) : (
                <span className="text-xs font-black uppercase bg-amber-100 text-amber-900 px-3 py-0.5 rounded-full border border-amber-300">
                  Essai Gratuit ({daysLeft}j restants)
                </span>
              )}
            </div>

            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Gestion de mon abonnement & Règlement manuel
            </h1>
            <p className="text-xs text-gray-600 font-medium mt-0.5">
              Tarifs selon votre volume d'articles (Essentiel, Standard, Pro). Vos données ne sont jamais supprimées.
            </p>
          </div>

          {/* Banner Compte Bloqué */}
          {isBlocked && (
            <div className="p-5 rounded-3xl bg-red-950 text-red-100 border-2 border-red-800 space-y-2 shadow-lg">
              <div className="flex items-center gap-2">
                <Lock className="w-6 h-6 text-red-400 shrink-0" />
                <h3 className="font-serif font-black text-xl text-white">Activité Bloquée par l'Administration</h3>
              </div>
              <p className="text-xs font-medium text-red-200 leading-relaxed">
                Votre boutique est actuellement suspendue par le super-admin. <strong>Vos données (articles, stocks, historiques) restent 100% conservées en sécurité sans aucune perte.</strong>
              </p>
              <p className="text-xs font-bold text-amber-300 pt-1">
                👉 Veuillez effectuer le virement Mobile Money vers les coordonnées ci-dessous, puis valider avec le bouton "J'ai envoyé le paiement" ou contacter l'administration.
              </p>
            </div>
          )}

          {/* Banner Demande en attente de confirmation par le super-admin */}
          {isPendingValidation && (
            <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-400 text-amber-950 space-y-2 shadow-md">
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-amber-700 shrink-0 animate-spin" />
                <h3 className="font-serif font-black text-xl text-amber-900">Demande de Paiement Soumise !</h3>
              </div>
              <p className="text-xs font-medium leading-relaxed text-amber-900">
                Votre déclaration de virement Mobile Money (Réf: <strong className="font-mono">{submittedDemande?.reference_transaction || 'EN-COURS'}</strong> — {submittedDemande?.montant.toLocaleString('fr-FR')} FCFA) a bien été reçue.
              </p>
              <p className="text-xs font-bold text-amber-950 bg-amber-200/80 p-3 rounded-2xl border border-amber-300">
                ⏳ <strong>Aucun déblocage automatique :</strong> le super-admin vérifie manuellement la réception de votre virement sur son compte. Dès confirmation, votre abonnement sera prolongé d'un mois.
              </p>
            </div>
          )}

          {/* Banner Échéance / Retard */}
          {!isBlocked && !isPendingValidation && isExpired && (
            <div className="p-5 rounded-3xl bg-rose-100 border-2 border-rose-300 text-rose-950 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-rose-700 shrink-0" />
                <h3 className="font-serif font-black text-lg">Abonnement Expiré — Renouvellement Requis</h3>
              </div>
              <p className="text-xs font-bold leading-relaxed">
                Votre période d'essai ou d'abonnement est terminée. Effectuez votre règlement par Mobile Money ci-dessous pour renouveler votre accès. Vos données sont <strong>100% conservées sans jamais être perdues</strong>.
              </p>
            </div>
          )}

          {/* SECTION 1 : LA GRILLE DES PALIERS TARIFAIRES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif font-black text-xl text-[#1B4332]">
                  Paliers Tarifaires d'Abonnement
                </h2>
                <p className="text-xs text-gray-600 font-medium">
                  Le palier est calculé selon le nombre d'articles en stock dans votre boutique.
                </p>
              </div>
              {usageInfo && (
                <span className="text-xs font-bold text-[#1B4332] bg-[#F3ECE0] px-3.5 py-1.5 rounded-full border border-[#E2D5C3]">
                  Stock Actuel : <strong>{usageInfo.distinctCount} articles</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {paliers.map((palier) => {
                const isSelected = selectedPalierCode === palier.code_palier;
                const isCurrent = usageInfo?.currentTier.code_palier === palier.code_palier;
                const isRecommended = usageInfo?.recommendedTier.code_palier === palier.code_palier;

                return (
                  <div
                    key={palier.id}
                    onClick={() => setSelectedPalierCode(palier.code_palier)}
                    className={`rounded-3xl p-6 border-2 cursor-pointer transition-all flex flex-col justify-between relative shadow-sm ${
                      isSelected
                        ? 'bg-white border-[#1B4332] shadow-xl ring-2 ring-[#1B4332]/20'
                        : 'bg-[#FBF7EF] border-[#E2D5C3] hover:border-[#1B4332]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {isRecommended && (
                        <span className="text-[10px] font-black uppercase bg-[#E8A33D] text-[#0F291E] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 fill-[#0F291E]" />
                          Votre Palier Articles ({usageInfo.distinctCount})
                        </span>
                      )}
                      {isCurrent && !isRecommended && (
                        <span className="text-[10px] font-black uppercase bg-emerald-700 text-white px-2.5 py-0.5 rounded-full ml-auto">
                          Actuel
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="font-serif font-black text-2xl text-[#1B4332]">{palier.nom}</h3>
                        <p className="text-xs text-gray-600 font-medium mt-1 min-h-[36px]">
                          {palier.description}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#F3ECE0] border border-[#E2D5C3] text-center">
                        <span className="font-serif font-black text-3xl text-[#B8442C]">
                          {palier.tarif_mensuel.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-xs font-bold text-gray-600 block">FCFA / mois</span>
                      </div>

                      <div className="space-y-2 text-xs pt-2 border-t border-[#E2D5C3]">
                        <div className="flex items-center gap-2 text-[#1B4332] font-bold">
                          <Package className="w-4 h-4 text-[#B8442C]" />
                          <span>
                            {palier.code_palier === 'essentiel'
                              ? 'Jusqu\'à 100 articles'
                              : palier.code_palier === 'standard'
                              ? '101 à 400 articles'
                              : 'Au-delà de 400 articles'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[#1B4332] font-bold">
                          <Users className="w-4 h-4 text-[#1B4332]" />
                          <span>
                            {palier.utilisateurs_max === 1
                              ? '1 utilisateur (Patron)'
                              : palier.utilisateurs_max > 999
                              ? 'Utilisateurs illimités'
                              : `Jusqu'à ${palier.utilisateurs_max} utilisateurs`}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#E2D5C3]">
                        <span className="text-[10px] font-black uppercase text-gray-400 block">Inclus :</span>
                        {(palier.modules_inclus || []).map((mod, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] font-medium text-gray-700">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{mod}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="button"
                        className={`w-full py-3 rounded-2xl font-black text-xs transition-all ${
                          isSelected
                            ? 'bg-[#1B4332] text-white shadow-md'
                            : 'bg-white text-[#1B4332] border border-[#E2D5C3]'
                        }`}
                      >
                        {isSelected ? '✓ Sélectionné' : 'Choisir ce Palier'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2 : COORDONNÉES DE PAIEMENT MANUEL & DÉCLARATION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
            {/* Coordonnées de paiement configurées par le Super-Admin */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#1B4332] text-white rounded-3xl p-6 shadow-md space-y-4 border border-[#2D6A4F]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#E8A33D] text-[#0F291E] flex items-center justify-center text-xl font-black shadow-md">
                    📲
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-lg text-white">Coordonnées de Paiement Manuel</h3>
                    <p className="text-[10px] text-[#E8A33D] font-bold uppercase tracking-wider">
                      Modifiables par l'Administration
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-200 leading-relaxed">
                  {configManuel.consignes || 'Effectuez votre transfert Mobile Money vers un des numéros ci-dessous, puis saisissez la référence pour transmettre votre paiement.'}
                </p>

                <div className="space-y-3 pt-1">
                  {/* Orange Money */}
                  <div className="p-4 rounded-2xl bg-[#0F291E] border border-[#2D6A4F] space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#FF6600] tracking-wider block">
                      🟧 Orange Money Cameroun
                    </span>
                    <p className="font-mono font-black text-xl text-white tracking-widest">
                      {configManuel.orange_money_numero}
                    </p>
                    <p className="text-[11px] text-gray-300 font-bold">
                      Nom : {configManuel.orange_money_nom}
                    </p>
                  </div>

                  {/* MTN MoMo */}
                  <div className="p-4 rounded-2xl bg-[#0F291E] border border-[#2D6A4F] space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#FFCC00] tracking-wider block">
                      🟡 MTN Mobile Money Cameroun
                    </span>
                    <p className="font-mono font-black text-xl text-white tracking-widest">
                      {configManuel.mtn_momo_numero}
                    </p>
                    <p className="text-[11px] text-gray-300 font-bold">
                      Nom : {configManuel.mtn_momo_nom}
                    </p>
                  </div>

                  {/* Waves / Virement */}
                  {configManuel.virement_wave_info && (
                    <div className="p-3 rounded-2xl bg-[#0F291E]/60 border border-[#2D6A4F]/60 text-xs text-gray-300">
                      💡 {configManuel.virement_wave_info}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Formulaire Bouton "J'ai envoyé le paiement" */}
            <div className="lg:col-span-7 bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#B8442C]" />
                  Déclarer un Paiement Envoyé
                </h3>
                <p className="text-xs text-gray-600 font-medium mt-0.5">
                  Renseignez votre virement effectué pour transmettre la demande de validation au super-admin.
                </p>
              </div>

              <form onSubmit={handleSubmitPaiementManuel} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-2">Moyen de Règlement Utilisé *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMethode('Orange Money')}
                      className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        methode === 'Orange Money'
                          ? 'bg-[#FF6600] text-white border-[#FF6600] shadow-md font-black'
                          : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      <span>🟧 Orange Money</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethode('MTN MoMo')}
                      className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        methode === 'MTN MoMo'
                          ? 'bg-[#FFCC00] text-black border-[#FFCC00] shadow-md font-black'
                          : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      <span>🟡 MTN MoMo</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">Votre N° Téléphone Payeur *</label>
                    <input
                      type="tel"
                      placeholder="Ex: 699001122 ou 677889900"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">Réf / ID Transaction reçu *</label>
                    <input
                      type="text"
                      placeholder="Ex: MP20261010.0012.A84"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-mono font-bold text-[#1B4332]"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#1B4332] text-white flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold block">Montant du Virement (Palier {activePalier.nom}) :</span>
                    <span className="text-[10px] text-gray-300">Renouvellement +30 jours après validation</span>
                  </div>
                  <span className="font-serif font-black text-2xl text-[#E8A33D]">
                    {tarifAbonnement.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !telephone.trim() || !reference.trim()}
                  className="w-full py-4 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-sm flex items-center justify-center gap-2 shadow-glow-brique disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>J'ai envoyé le paiement ({tarifAbonnement.toLocaleString('fr-FR')} FCFA) ➔</span>
                </button>

                <p className="text-[11px] text-gray-500 text-center font-medium">
                  ⚠️ En cliquant sur ce bouton, une demande de validation est transmise au Super-Admin. Votre compte passe en "En attente" sans déblocage immédiat tant que le paiement n'a pas été confirmé.
                </p>
              </form>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
