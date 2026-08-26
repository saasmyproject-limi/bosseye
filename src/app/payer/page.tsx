'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, CheckCircle2, MessageCircle, ExternalLink, ShieldCheck, RefreshCcw } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { Etablissement, Paiement } from '@/types';

export default function PayerPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [telephonePayeur, setTelephonePayeur] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successPaiement, setSuccessPaiement] = useState<Paiement | null>(null);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setTelephonePayeur('699001122');
    } catch (e) { console.error(e); }
  };

  const handlePayMobileMoney = (methode: 'Orange Money' | 'MTN MoMo') => {
    setIsProcessing(true);
    setTimeout(() => {
      const res = offlineDB.processMobileMoneyPayment({
        montant: 5000,
        methode,
        telephone_payeur: telephonePayeur,
      });
      setIsProcessing(false);
      setSuccessPaiement(res);
      loadInfo();
    }, 1500);
  };

  if (!etablissement) return null;

  const dateFinStr = etablissement.date_fin_essai
    ? new Date(etablissement.date_fin_essai).toLocaleDateString('fr-FR', { dateStyle: 'full' })
    : 'Date non définie';

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E2D5C3]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2D6A4F] bg-[#1B4332]/10 px-2.5 py-1 rounded-full border border-[#1B4332]/20">
              Essai Gratuit 14 Jours
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#1B4332] mt-1">
              Abonnement & Paiement Mobile Money
            </h1>
          </div>
        </div>

        {/* Subscription Status Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0F291E] text-white border-2 border-[#E8A33D]/40 shadow-xl mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-gray-300 uppercase">Statut Établissement :</span>
            <h2 className="font-serif text-2xl font-black text-white mt-1 flex items-center justify-center sm:justify-start gap-2">
              {etablissement.nom}
              <span className="text-xs font-black px-3 py-1 rounded-full bg-[#E8A33D] text-[#0F291E] uppercase">
                {etablissement.statut_abonnement || 'ESSAI'}
              </span>
            </h2>
            <p className="text-xs text-gray-300 mt-1 font-medium">
              Valide jusqu'au <strong className="text-[#E8A33D]">{dateFinStr}</strong>
            </p>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-[10px] uppercase text-gray-300 font-bold block">Tarif Mensuel</span>
            <span className="font-serif text-3xl font-black text-[#E8A33D]">5 000 FCFA</span>
            <span className="text-xs text-gray-300 block mt-0.5 font-semibold">/ mois sans engagement</span>
          </div>
        </div>

        {successPaiement && (
          <div className="mb-6 p-4 rounded-3xl bg-[#1B4332] text-white border border-[#E8A33D] text-xs font-bold flex items-center gap-3 shadow-md animate-bounce">
            <CheckCircle2 className="w-6 h-6 text-[#E8A33D] shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-[#E8A33D]">Paiement Mobile Money Réussi !</h4>
              <p>Référence: {successPaiement.reference_transaction} • Abonnement prolongé de +30 jours.</p>
            </div>
          </div>
        )}

        {/* Mobile Money Payment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* MTN Mobile Money */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-2xl bg-[#E8A33D] text-[#0F291E] font-black flex items-center justify-center text-xs shadow-sm">
                  MTN
                </span>
                <span className="text-xs font-bold text-[#1B4332] bg-[#E8A33D]/20 px-2.5 py-1 rounded-full border border-[#E8A33D]/40">
                  MoMo Cameroun
                </span>
              </div>

              <h3 className="font-serif font-black text-xl text-[#1B4332] mb-1">MTN Mobile Money</h3>
              <p className="text-xs text-[#1B4332]/80 mb-4 font-medium">
                Paiement instantané via votre téléphone MTN MoMo au Cameroun.
              </p>

              <div className="mb-4">
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Numéro MTN MoMo *</label>
                <input
                  type="tel"
                  value={telephonePayeur}
                  onChange={(e) => setTelephonePayeur(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <button
              disabled={isProcessing}
              onClick={() => handlePayMobileMoney('MTN MoMo')}
              className="w-full py-4 rounded-2xl bg-[#E8A33D] hover:bg-[#D4922D] text-[#0F291E] font-black text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              <span>Payer 5 000 FCFA avec MTN MoMo</span>
            </button>
          </div>

          {/* Orange Money */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-2xl bg-[#B8442C] text-white font-black flex items-center justify-center text-xs shadow-sm">
                  OM
                </span>
                <span className="text-xs font-bold text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-1 rounded-full border border-[#B8442C]/20">
                  Orange Money CM
                </span>
              </div>

              <h3 className="font-serif font-black text-xl text-[#1B4332] mb-1">Orange Money</h3>
              <p className="text-xs text-[#1B4332]/80 mb-4 font-medium">
                Paiement instantané via votre compte Orange Money Cameroun.
              </p>

              <div className="mb-4">
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Numéro Orange Money *</label>
                <input
                  type="tel"
                  value={telephonePayeur}
                  onChange={(e) => setTelephonePayeur(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <button
              disabled={isProcessing}
              onClick={() => handlePayMobileMoney('Orange Money')}
              className="w-full py-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-sm shadow-glow-brique flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              <span>Payer 5 000 FCFA avec Orange Money</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
