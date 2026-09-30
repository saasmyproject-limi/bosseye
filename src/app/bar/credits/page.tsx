'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { CreditCard, Search, Send, CheckCircle2, X, Clock, DollarSign, ArrowDownRight } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Facture, Etablissement } from '@/types';

export default function BarCreditsPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [facturesCredit, setFacturesCredit] = useState<Facture[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'anciennete' | 'montant'>('anciennete');

  // Modal de Règlement d'Ardoise Bar
  const [selectedFactureForPay, setSelectedFactureForPay] = useState<Facture | null>(null);
  const [montantRegleInput, setMontantRegleInput] = useState<number>(0);
  const [methodePaiement, setMethodePaiement] = useState<'cash' | 'orange_money' | 'mtn_momo'>('cash');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      const factures = offlineDB.getFactures();
      const credits = factures.filter((f) => f && f.statut === 'credit_encours' && (f.montant_restant || 0) > 0);

      // Tri par défaut par ancienneté (du plus ancien au plus récent)
      credits.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setFacturesCredit(credits);
    } catch (e) {
      console.error(e);
    }
  };

  const totalCreditAmount = facturesCredit.reduce((acc, f) => acc + f.montant_restant, 0);
  const totalStockSortiValeur = facturesCredit.reduce((acc, f) => acc + f.montant_total, 0);
  const totalAcomptesEncaisses = facturesCredit.reduce((acc, f) => acc + (f.montant_paye || 0), 0);

  // Filtrage et Tri
  const filteredCredits = facturesCredit
    .filter((f) => {
      const q = searchQuery.toLowerCase();
      const clientNom = (f.client?.nom || '').toLowerCase();
      const clientPhone = (f.client?.telephone_whatsapp || '').toLowerCase();
      const numFac = (f.numero_facture || '').toLowerCase();
      return clientNom.includes(q) || clientPhone.includes(q) || numFac.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'montant') {
        return b.montant_restant - a.montant_restant;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const handleWhatsAppRelance = (fac: Facture) => {
    const clientNom = fac.client?.nom || 'Cher Client';
    const etabNom = etablissement?.nom || 'notre Bar';
    const total = fac.montant_total.toLocaleString('fr-FR');
    const manquant = fac.montant_restant.toLocaleString('fr-FR');
    const facNum = fac.numero_facture;

    const message = `Bonjour ${clientNom}, ${etabNom} vous rappelle poliment votre ardoise en cours de ${manquant} FCFA sur la consommation #${facNum} (Total: ${total} FCFA). Merci de votre passage au Bar pour solder dès que possible. Santé !`;

    const phone = (fac.client?.telephone_whatsapp || '').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${phone.startsWith('237') ? phone : '237' + phone}?text=${encoded}`;

    offlineDB.recordWhatsAppRelance(fac.id);
    loadData();
    window.open(url, '_blank');
  };

  const handlePayCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactureForPay) return;

    offlineDB.processRemboursementCredit({
      facture_id: selectedFactureForPay.id,
      montant_regle: montantRegleInput,
      methode: methodePaiement as any,
    });

    setSelectedFactureForPay(null);
    setMontantRegleInput(0);
    loadData();
  };

  const getAgeDays = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="pb-4 border-b border-[#E2D5C3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
            Gestion des Ardoises & Créances Bar
          </span>
          <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-[#B8442C]" />
            Argent à Récupérer (Créances Triées par Ancienneté)
          </h1>
          <p className="text-xs text-gray-600 font-medium mt-0.5">
            Suivez les créances des clients habitués, relancez avec courtoisie par WhatsApp et enregistrez les remboursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Rechercher client ou N°..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-9 pr-4 py-2.5 text-xs font-bold text-[#1B4332]"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards : Distinction claire Stock Sorti vs Argent Réellement Encaissé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[#B8442C] text-white shadow-xl space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">Reste Dû (Créances en cours)</span>
          <h2 className="font-serif font-black text-3xl">
            {totalCreditAmount.toLocaleString('fr-FR')} <span className="text-xs font-bold opacity-80">FCFA</span>
          </h2>
          <p className="text-[11px] opacity-90 font-medium">
            {facturesCredit.length} ardoise(s) impayée(s) à récupérer
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valeur du Stock Sorti</span>
          <p className="font-serif font-black text-2xl text-[#1B4332]">
            {totalStockSortiValeur.toLocaleString('fr-FR')} <span className="text-xs font-bold text-gray-500">FCFA</span>
          </p>
          <p className="text-[11px] text-gray-500 font-medium">Valeur consommations servies à crédit</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-1">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Acomptes Réellement Encaissés</span>
          <p className="font-serif font-black text-2xl text-emerald-900">
            {totalAcomptesEncaisses.toLocaleString('fr-FR')} <span className="text-xs font-bold text-gray-500">FCFA</span>
          </p>
          <p className="text-[11px] text-emerald-700 font-medium">Cash déjà perçu sur ces ardoises</p>
        </div>
      </div>

      {/* Options de Tri & Filtres */}
      <div className="flex items-center justify-between bg-[#F3ECE0] p-3 rounded-2xl border border-[#E2D5C3] text-xs">
        <span className="font-bold text-[#1B4332]">Trier les ardoises par :</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy('anciennete')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              sortBy === 'anciennete'
                ? 'bg-[#1B4332] text-white font-black'
                : 'bg-white text-gray-700 border border-[#E2D5C3]'
            }`}
          >
            ⏳ Ancienneté (Plus anciennes d'abord)
          </button>
          <button
            onClick={() => setSortBy('montant')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              sortBy === 'montant'
                ? 'bg-[#1B4332] text-white font-black'
                : 'bg-white text-gray-700 border border-[#E2D5C3]'
            }`}
          >
            💵 Montant le plus élevé
          </button>
        </div>
      </div>

      {/* Liste des Ardoises Bar */}
      <div className="space-y-3">
        {filteredCredits.length === 0 ? (
          <div className="p-8 text-center bg-[#F3ECE0] rounded-3xl border-2 border-dashed border-[#E2D5C3] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="font-serif font-bold text-base text-[#1B4332]">Toutes les ardoises du Bar sont réglées !</p>
            <p className="text-xs text-gray-500">Aucune ardoise impayée en attente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCredits.map((fac) => {
              const ageDays = getAgeDays(fac.created_at);

              return (
                <div
                  key={fac.id}
                  className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-[#B8442C] uppercase">
                            Ardoise #{fac.numero_facture}
                          </span>
                          <span className="text-[9px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ageDays === 0 ? "Aujourd'hui" : `Il y a ${ageDays}j`}
                          </span>
                        </div>
                        <h3 className="font-serif font-black text-base text-[#1B4332] mt-1">
                          {fac.client?.nom || 'Client Habitué'}
                        </h3>
                        <p className="text-xs text-gray-500 font-bold">
                          📱 {fac.client?.telephone_whatsapp || 'Pas de numéro WhatsApp'}
                        </p>
                      </div>

                      <span className="text-xs font-black text-red-600 bg-red-100 px-2.5 py-1 rounded-full">
                        -{fac.montant_restant.toLocaleString('fr-FR')} F
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-xs space-y-1">
                      <div className="flex justify-between text-gray-600 font-medium">
                        <span>Total Stock Sorti (Servi) :</span>
                        <span className="font-bold text-[#1B4332]">{fac.montant_total.toLocaleString('fr-FR')} F</span>
                      </div>
                      <div className="flex justify-between text-gray-600 font-medium">
                        <span>Acompte Encaissé :</span>
                        <span className="font-bold text-emerald-800">{(fac.montant_paye || 0).toLocaleString('fr-FR')} F</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E2D5C3] flex items-center gap-2">
                    <button
                      onClick={() => handleWhatsAppRelance(fac)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Relancer WhatsApp</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedFactureForPay(fac);
                        setMontantRegleInput(fac.montant_restant);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs shadow"
                    >
                      Solder
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Règlement Ardoise Bar */}
      {selectedFactureForPay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handlePayCredit}
            className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
              <h3 className="font-serif font-black text-xl text-[#1B4332]">Solder l'Ardoise du Client</h3>
              <button
                type="button"
                onClick={() => setSelectedFactureForPay(null)}
                className="text-gray-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 font-medium">
              Client : <strong>{selectedFactureForPay.client?.nom}</strong> (Reste dû :{' '}
              {selectedFactureForPay.montant_restant.toLocaleString('fr-FR')} FCFA)
            </p>

            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Montant Encaissé (FCFA)</label>
              <input
                type="number"
                min="1"
                max={selectedFactureForPay.montant_restant}
                value={montantRegleInput}
                onChange={(e) => setMontantRegleInput(Number(e.target.value))}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-2">Mode de Règlement</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: '💵 Cash' },
                  { id: 'orange_money', label: '🟧 OM' },
                  { id: 'mtn_momo', label: '🟡 MoMo' },
                ].map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setMethodePaiement(m.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      methodePaiement === m.id
                        ? 'bg-[#1B4332] text-white border-[#1B4332]'
                        : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFactureForPay(null)}
                className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
              >
                Valider le Règlement Ardoise
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
