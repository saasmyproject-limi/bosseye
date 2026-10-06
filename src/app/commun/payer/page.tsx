'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { CreditCard, CheckCircle2, Zap, Lock, Calendar, Check, AlertCircle, ArrowUpRight, Users, Package, Utensils, Star } from 'lucide-react';
import { offlineDB, getTerminology } from '@/lib/offlineDB';
import Link from 'next/link';
import { Utilisateur, Etablissement, MethodePaiement, Paiement, PalierTarifaire, DEFAULT_PALIERS_LIST } from '@/types';

export default function CommunPayerPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [paliers, setPaliers] = useState<PalierTarifaire[]>(DEFAULT_PALIERS_LIST);
  const [selectedPalierCode, setSelectedPalierCode] = useState<'essentiel' | 'standard' | 'pro'>('standard');

  const [methode, setMethode] = useState<MethodePaiement>('Orange Money');
  const [telephone, setTelephone] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastPayment, setLastPayment] = useState<Paiement | null>(null);

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

      setEtablissement(etab);
      setCurrentUser(user);
      setPaliers(palList);
      setUsageInfo(usage);

      // Auto-sélectionner le palier recommandé selon l'usage ou le palier actuel
      if (usage.isOverflow) {
        setSelectedPalierCode(usage.recommendedTier.code_palier);
      } else {
        setSelectedPalierCode(usage.currentTier.code_palier);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isServeuseOrNonPatron = ['Serveuse', 'Caissière', 'Employé'].includes(currentUser?.role || '');
  const isBar = etablissement?.type_activite === 'bar';
  const term = getTerminology(etablissement?.type_activite);

  const daysLeft = etablissement ? offlineDB.getTrialDaysRemaining(etablissement) : 7;
  const isExpired = etablissement ? offlineDB.isTrialExpired(etablissement) : false;

  const activePalier = paliers.find((p) => p?.code_palier === selectedPalierCode) || paliers[1] || paliers[0] || DEFAULT_PALIERS_LIST[1];
  const tarifAbonnement = activePalier ? activePalier.tarif_mensuel : 5000;

  const handlePayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (isServeuseOrNonPatron || !telephone.trim() || !reference.trim()) return;

    setIsProcessing(true);
    setTimeout(() => {
      const paiement = offlineDB.processMobileMoneyPayment({
        plan: activePalier.code_palier === 'pro' ? 'Premium' : 'Basique',
        methode,
        telephone_payeur: telephone.trim(),
        reference_transaction: reference.trim(),
        montant: tarifAbonnement,
      });

      // Mettre à jour le tarif mensuel du commerce
      if (etablissement) {
        offlineDB.updateEtablissement(etablissement.id, {
          tarif_mensuel: tarifAbonnement,
          palier_actuel_id: activePalier.id,
        });
      }

      setLastPayment(paiement);
      setIsProcessing(false);
      loadData();
    }, 1500);
  };

  return (
    <AppLayout>
      {isServeuseOrNonPatron ? (
        <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-md mt-12">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-3xl font-bold">
            🔒
          </div>
          <h2 className="font-serif font-black text-2xl text-[#1B4332]">
            Accès Restreint — Gestion de l'Abonnement
          </h2>
          <p className="text-xs text-gray-700 font-bold leading-relaxed">
            Seul la Patronne ou le Directeur du commerce a accès à la gestion de l'abonnement et aux règlements.
          </p>
          <div className="pt-2">
            <Link
              href={`/${etablissement?.type_activite || 'snack'}/ventes`}
              className="inline-block py-3.5 px-6 rounded-2xl bg-[#1B4332] text-white font-black text-xs shadow-md hover:bg-[#2D6A4F] transition-all"
            >
              ← Retour à la Prise de Ventes
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Header Abonnement Patron */}
          <div className="pb-4 border-b border-[#E2D5C3]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
                Abonnement œko ({etablissement?.type_activite?.toUpperCase() || 'COMMERCE'})
              </span>
              {usageInfo?.currentTier && (
                <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Palier Actuel : {usageInfo.currentTier.nom} ({usageInfo.currentTier.tarif_mensuel.toLocaleString('fr-FR')} F/mois)
                </span>
              )}
            </div>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Grille des 3 Paliers d'Abonnement & Mobile Money
            </h1>
            <p className="text-xs text-gray-600 font-medium mt-0.5">
              Tarifs clairs et évolutifs sans engagement, adaptés au volume d'activité de votre commerce.
            </p>
          </div>

          {/* Banner Dépassement de Palier / Notification Clôture sans blocage */}
          {usageInfo?.isOverflow && (
            <div className="p-4 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-amber-900">
                  Avis d'Évolution d'Activité (Prochaine Échéance)
                </h4>
                <p className="font-medium leading-relaxed">
                  Votre commerce s'est développé ! Votre utilisation réelle (<strong>{usageInfo.overflowReason}</strong>) correspond au <strong>Palier {usageInfo.recommendedTier.nom} ({usageInfo.recommendedTier.tarif_mensuel.toLocaleString('fr-FR')} FCFA/mois)</strong>.
                </p>
                <p className="text-[11px] font-bold text-amber-800">
                  💡 Jamais de blocage : votre application reste totalement fonctionnelle. Votre tarif sera gentiment ajusté lors du prochain règlement.
                </p>
              </div>
            </div>
          )}

          {/* Banner Échéance ou Essai Expire */}
          {isExpired ? (
            <div className="p-5 rounded-3xl bg-red-100 border-2 border-red-300 text-red-950 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-700" />
                <h3 className="font-serif font-black text-lg">Mode Restreint — Abonnement à Régulariser !</h3>
              </div>
              <p className="text-xs font-bold leading-relaxed">
                Votre période d'essai ou d'abonnement est arrivée à terme. L'enregistrement de nouvelles ventes est temporairement bloqué. Vos données restent <strong className="underline">stockées en toute sécurité sans jamais être supprimées</strong>.
              </p>
            </div>
          ) : daysLeft <= 2 ? (
            <div className="p-4 rounded-3xl bg-[#E8A33D]/20 border-2 border-[#E8A33D] text-[#1B4332] flex items-center gap-3">
              <Zap className="w-6 h-6 text-[#E8A33D] shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Rappel Préventif — Échéance dans {daysLeft} jour(s)</h4>
                <p className="text-xs">Réglez votre abonnement mensuel à l'avance pour éviter toute interruption de service.</p>
              </div>
            </div>
          ) : null}

          {/* SECTION 1 : LES 3 PALIERS D'ABONNEMENT (Essentiel, Standard, Pro) */}
          <div className="space-y-3">
            <h2 className="font-serif font-black text-xl text-[#1B4332]">
              Choisissez ou Vérifiez votre Palier d'Abonnement
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {paliers.map((palier) => {
                const isSelected = selectedPalierCode === palier.code_palier;
                const isCurrent = usageInfo?.currentTier.code_palier === palier.code_palier;
                const isRecommended = palier.badge_recommande;

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
                    {/* Badges Recommandé / Palier Actuel */}
                    <div className="flex items-center justify-between mb-2">
                      {isRecommended && (
                        <span className="text-[10px] font-black uppercase bg-[#E8A33D] text-[#0F291E] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 fill-[#0F291E]" />
                          Recommandé Démo
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase bg-emerald-700 text-white px-2.5 py-0.5 rounded-full ml-auto">
                          Palier Actuel
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

                      {/* Critères Clairs du Palier */}
                      <div className="space-y-2 text-xs pt-2 border-t border-[#E2D5C3]">
                        <div className="flex items-center gap-2 text-[#1B4332] font-bold">
                          <Package className="w-4 h-4 text-[#B8442C]" />
                          <span>
                            {isBar
                              ? `Jusqu'à ${palier.tables_max > 999 ? 'illimité' : palier.tables_max + ' tables'}`
                              : `Jusqu'à ${palier.articles_max > 999 ? 'illimité' : palier.articles_max + ' articles'}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[#1B4332] font-bold">
                          <Users className="w-4 h-4 text-[#1B4332]" />
                          <span>
                            {palier.utilisateurs_max === 1
                              ? '1 seul utilisateur (Patron)'
                              : palier.utilisateurs_max > 999
                              ? 'Utilisateurs illimités'
                              : `Jusqu'à ${palier.utilisateurs_max} utilisateurs`}
                          </span>
                        </div>
                      </div>

                      {/* Liste des Modules Inclus */}
                      <div className="space-y-1.5 pt-2 border-t border-[#E2D5C3]">
                        <span className="text-[10px] font-black uppercase text-gray-400 block">Modules inclus :</span>
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
                        {isSelected ? '✓ Palier Sélectionné' : 'Choisir ce Palier'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2 : FORMULAIRE DE PAIEMENT MOBILE MONEY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
            {/* Détails du Compte & Usage Réel */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-serif font-black text-lg text-[#1B4332] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#B8442C]" />
                  Utilisation Réelle de votre Commerce
                </h3>

                {usageInfo && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2D5C3] space-y-1">
                      <div className="flex justify-between font-bold text-[#1B4332]">
                        <span>Articles / Produits distincts :</span>
                        <span className="font-black text-sm">{usageInfo.distinctCount} articles</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#1B4332] h-full"
                          style={{
                            width: `${Math.min(100, (usageInfo.distinctCount / activePalier.articles_max) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 block text-right">
                        Limite Palier {activePalier.nom} : {activePalier.articles_max > 999 ? 'Illimité' : activePalier.articles_max}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2D5C3] space-y-1">
                      <div className="flex justify-between font-bold text-[#1B4332]">
                        <span>Utilisateurs Actifs :</span>
                        <span className="font-black text-sm">{usageInfo.usersCount} compte(s)</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#B8442C] h-full"
                          style={{
                            width: `${Math.min(100, (usageInfo.usersCount / activePalier.utilisateurs_max) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 block text-right">
                        Limite Palier {activePalier.nom} : {activePalier.utilisateurs_max > 999 ? 'Illimité' : activePalier.utilisateurs_max}
                      </span>
                    </div>

                    {isBar && (
                      <div className="p-3.5 rounded-2xl bg-white border border-[#E2D5C3] space-y-1">
                        <div className="flex justify-between font-bold text-[#1B4332]">
                          <span>Tables Configuées :</span>
                          <span className="font-black text-sm">{usageInfo.tablesCount} table(s)</span>
                        </div>
                        <span className="text-[10px] text-gray-500 block text-right">
                          Limite Palier {activePalier.nom} : {activePalier.tables_max > 999 ? 'Illimité' : activePalier.tables_max}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Formulaire Mobile Money Direct */}
            <div className="lg:col-span-7 bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#B8442C]" />
                Règlement Direct par Mobile Money (Orange / MTN)
              </h3>

              {lastPayment && (
                <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                    <span>Paiement Reçu et Abonnement Confirmé !</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    Réf: {lastPayment.reference_transaction} • Montant: {lastPayment.montant.toLocaleString('fr-FR')} FCFA.
                  </p>
                </div>
              )}

              <form onSubmit={handlePayer} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-2">Choix de l'Opérateur *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMethode('Orange Money')}
                      className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
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
                      className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        methode === 'MTN MoMo'
                          ? 'bg-[#FFCC00] text-black border-[#FFCC00] shadow-md font-black'
                          : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      <span>🟡 MTN Mobile Money</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">Téléphone Payeur *</label>
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
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">Réf / Transaction MoMo *</label>
                    <input
                      type="text"
                      placeholder="Ex: MP20260827.0012.A84"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#1B4332] text-white flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold block">Tarif Mensuel (Palier {activePalier.nom}) :</span>
                    <span className="text-[10px] text-gray-300">Renouvellement 30 jours</span>
                  </div>
                  <span className="font-serif font-black text-2xl text-[#E8A33D]">
                    {tarifAbonnement.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-sm flex items-center justify-center gap-2 shadow-glow-brique disabled:opacity-50 transition-transform active:scale-95"
                >
                  {isProcessing ? 'Traitement en cours...' : `Confirmer & Régler (${tarifAbonnement.toLocaleString('fr-FR')} FCFA) ➔`}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
