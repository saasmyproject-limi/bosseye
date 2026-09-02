'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { CreditCard, CheckCircle2, Zap, Lock, Calendar } from 'lucide-react';
import { offlineDB, getTerminology } from '@/lib/offlineDB';
import Link from 'next/link';
import { Utilisateur, Etablissement, MethodePaiement, Paiement, TARIFS_ABONNEMENT } from '@/types';

export default function CommunPayerPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [methode, setMethode] = useState<MethodePaiement>('Orange Money');
  const [telephone, setTelephone] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastPayment, setLastPayment] = useState<Paiement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      const user = offlineDB.getCurrentUser();
      setEtablissement(etab);
      setCurrentUser(user);
    } catch (e) { console.error(e); }
  };

  const isServeuseOrNonPatron = ['Serveuse', 'Caissière', 'Employé'].includes(currentUser?.role || '');

  const term = getTerminology(etablissement?.type_activite);
  const daysLeft = etablissement ? offlineDB.getTrialDaysRemaining(etablissement) : 7;
  const isExpired = etablissement ? offlineDB.isTrialExpired(etablissement) : false;

  const tarifMensuel = etablissement ? TARIFS_ABONNEMENT[etablissement.type_activite] || 5000 : 5000;

  const handlePayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (isServeuseOrNonPatron || !telephone.trim() || !reference.trim()) return;

    setIsProcessing(true);
    setTimeout(() => {
      const paiement = offlineDB.processMobileMoneyPayment({
        plan: 'Premium',
        methode,
        telephone_payeur: telephone.trim(),
        reference_transaction: reference.trim(),
        montant: tarifMensuel,
      });

      setLastPayment(paiement);
      setIsProcessing(false);
      loadData();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-28 lg:pb-8 space-y-6">
        {isServeuseOrNonPatron ? (
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-md mt-12">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-3xl font-bold">
              🔒
            </div>
            <h2 className="font-serif font-black text-2xl text-[#1B4332]">
              Accès Restreint — Gestion de l'Abonnement
            </h2>
            <p className="text-xs text-gray-700 font-bold leading-relaxed">
              La serveuse ne peut pas ajouter d'abonnement. Seul le patron ou le gérant contrôle et peut gérer le compte et le règlement de l'abonnement du commerce.
            </p>
            <div className="pt-2">
              <Link
                href={`/${etablissement?.type_activite || 'snack'}/ventes`}
                className="inline-block py-3.5 px-6 rounded-2xl bg-[#1B4332] text-white font-black text-xs shadow-md hover:bg-[#2D6A4F] transition-all"
              >
                ← Retour à la Gestion des Ventes
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="pb-4 border-b border-[#E2D5C3]">
              <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
                Abonnement œko ({etablissement?.type_activite?.toUpperCase() || 'COMMERCE'})
              </span>
              <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
                Statut de votre Compte & Mobile Money
              </h1>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                Réglez votre abonnement mensuel via Orange Money ou MTN MoMo pour conserver l'accès continu à votre commerce.
              </p>
            </div>

            {isExpired ? (
              <div className="p-5 rounded-3xl bg-red-100 border-2 border-red-300 text-red-950 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-red-700" />
                  <h3 className="font-serif font-black text-lg">Période d'essai de 7 jours expirée !</h3>
                </div>
                <p className="text-xs font-bold leading-relaxed">
                  Votre période d'essai gratuit de 7 jours est arrivée à échéance. Veuillez effectuer le paiement mensuel de{' '}
                  <strong className="text-red-900 font-black">{tarifMensuel.toLocaleString('fr-FR')} FCFA</strong> via Mobile Money ci-dessous pour débloquer immédiatement l'application.
                </p>
              </div>
            ) : daysLeft <= 2 ? (
              <div className="p-4 rounded-3xl bg-[#E8A33D]/20 border-2 border-[#E8A33D] text-[#1B4332] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-[#E8A33D] shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Rappel Expiration Imminente !</h4>
                    <p className="text-xs">Il vous reste <strong>{daysLeft} jour(s)</strong> d'essai gratuit. Pensez à renouveler dès maintenant.</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-serif font-black text-lg text-[#1B4332] flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#B8442C]" />
                    Détails du Compte œko
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex justify-between items-center">
                      <span className="font-bold text-gray-600">Catégorie Commerce :</span>
                      <span className="font-black uppercase text-[#1B4332] bg-[#1B4332]/10 px-2 py-0.5 rounded-full">
                        {etablissement?.type_activite || 'Boutique'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex justify-between items-center">
                      <span className="font-bold text-gray-600">Tarif Mensuel :</span>
                      <span className="font-serif font-black text-base text-[#B8442C]">
                        {tarifMensuel.toLocaleString('fr-FR')} FCFA / mois
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex justify-between items-center">
                      <span className="font-bold text-gray-600">Statut Abonnement :</span>
                      <span className={`font-black text-xs px-2.5 py-0.5 rounded-full ${
                        etablissement?.statut_abonnement === 'actif'
                          ? 'bg-emerald-100 text-emerald-800'
                          : isExpired
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {etablissement?.statut_abonnement === 'actif' ? 'Actif' : isExpired ? 'Expiré' : `Essai 7j (${daysLeft}j restants)`}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex justify-between items-center">
                      <span className="font-bold text-gray-600">Prochain Règlement :</span>
                      <span className="font-bold text-[#1B4332]">
                        {etablissement?.date_prochain_paiement
                          ? new Date(etablissement.date_prochain_paiement).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#B8442C]" />
                  Paiement Mobile Money Direct (Cameroun)
                </h3>

                {lastPayment && (
                  <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                      <span>Paiement Validé avec Succès !</span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      Réf: {lastPayment.reference_transaction} • Montant: {lastPayment.montant.toLocaleString('fr-FR')} FCFA. Votre abonnement est actif.
                    </p>
                  </div>
                )}

                <form onSubmit={handlePayer} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-2">Opérateur Mobile Money *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMethode('Orange Money')}
                        className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                          methode === 'Orange Money'
                            ? 'bg-[#FF6600] text-white border-[#FF6600] shadow-md'
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

                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">Numéro de Téléphone Payeur *</label>
                    <input
                      type="tel"
                      placeholder="Ex: 699001122 ou 677889900"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-sm font-bold text-[#1B4332]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">Référence / ID de Transaction MoMo *</label>
                    <input
                      type="text"
                      placeholder="Ex: MP20260827.0012.A84"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-sm font-bold text-[#1B4332]"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1B4332]">Montant à payer :</span>
                    <span className="font-serif font-black text-xl text-[#B8442C]">
                      {tarifMensuel.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-sm flex items-center justify-center gap-2 shadow-glow-brique disabled:opacity-50 transition-transform active:scale-95"
                  >
                    {isProcessing ? 'Validation en cours...' : `Confirmer le Paiement (${tarifMensuel.toLocaleString('fr-FR')} FCFA)`}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
