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
    const etab = offlineDB.getEtablissement();
    setEtablissement(etab);
    setTelephonePayeur(etab.telephone || '699001122');
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

  const dateFinStr = new Date(etablissement.date_fin_essai).toLocaleDateString('fr-FR', {
    dateStyle: 'full',
  });

  return (
    <div className="min-h-screen bg-[#0F1115] text-white flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 max-w-5xl mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-brand-border/60">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
              Essai Gratuit 14 Jours
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Abonnement & Paiement Mobile Money</h1>
          </div>
        </div>

        {/* Subscription Status Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-brand-card via-[#181A20] to-brand-black border border-brand-orange/40 shadow-glow mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase">Statut Établissement :</span>
            <h2 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
              {etablissement.nom}
              <span className="text-xs text-emerald-400 bg-emerald-950 font-bold px-3 py-1 rounded-full border border-emerald-500/40">
                {etablissement.statut_abonnement.toUpperCase()}
              </span>
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Valide jusqu'au <strong className="text-amber-400">{dateFinStr}</strong>
            </p>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-[10px] uppercase text-gray-400 font-bold block">Tarif Mensuel</span>
            <span className="text-3xl font-black text-brand-orange">5 000 FCFA</span>
            <span className="text-xs text-gray-400 block mt-0.5">/ mois sans engagement</span>
          </div>
        </div>

        {successPaiement && (
          <div className="mb-6 p-4 rounded-3xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-3 shadow-glow animate-bounce">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Paiement Mobile Money Réussi !</h4>
              <p>Référence: {successPaiement.reference_transaction} • Abonnement prolongé de +30 jours.</p>
            </div>
          </div>
        )}

        {/* Mobile Money Payment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* MTN Mobile Money */}
          <div className="p-6 rounded-3xl bg-brand-card border border-brand-border hover:border-amber-500/50 transition-all shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-2xl bg-amber-500 text-black font-black flex items-center justify-center text-xs">
                  MTN
                </span>
                <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/40">
                  MoMo Cameroun
                </span>
              </div>

              <h3 className="font-bold text-lg text-white mb-1">MTN Mobile Money</h3>
              <p className="text-xs text-gray-300 mb-4">
                Paiement instantané via votre téléphone MTN MoMo au Cameroun.
              </p>

              <div className="mb-4">
                <label className="text-xs font-bold text-gray-400 block mb-1">Numéro MTN MoMo *</label>
                <input
                  type="tel"
                  value={telephonePayeur}
                  onChange={(e) => setTelephonePayeur(e.target.value)}
                  className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              disabled={isProcessing}
              onClick={() => handlePayMobileMoney('MTN MoMo')}
              className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-sm shadow-glow flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              <span>Payer 5 000 FCFA avec MTN MoMo</span>
            </button>
          </div>

          {/* Orange Money */}
          <div className="p-6 rounded-3xl bg-brand-card border border-brand-border hover:border-brand-orange/50 transition-all shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-2xl bg-brand-orange text-white font-black flex items-center justify-center text-xs">
                  OM
                </span>
                <span className="text-xs font-bold text-brand-orange bg-brand-orangeLight px-2.5 py-1 rounded-full border border-brand-orange/30">
                  Orange Money CM
                </span>
              </div>

              <h3 className="font-bold text-lg text-white mb-1">Orange Money</h3>
              <p className="text-xs text-gray-300 mb-4">
                Paiement instantané via votre compte Orange Money Cameroun.
              </p>

              <div className="mb-4">
                <label className="text-xs font-bold text-gray-400 block mb-1">Numéro Orange Money *</label>
                <input
                  type="tel"
                  value={telephonePayeur}
                  onChange={(e) => setTelephonePayeur(e.target.value)}
                  className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-sm focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            <button
              disabled={isProcessing}
              onClick={() => handlePayMobileMoney('Orange Money')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-sm shadow-glow flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
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
