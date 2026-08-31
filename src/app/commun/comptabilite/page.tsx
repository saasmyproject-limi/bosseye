'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  Plus,
  Calendar,
  PieChart,
  X
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { Facture, ChargeJournaliere } from '@/types';

export default function CommunComptabilitePage() {
  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois'>('jour');
  const [stats, setStats] = useState({
    caTotal: 0,
    encaisseReel: 0,
    cmvTotal: 0,
    margeBrute: 0,
    totalCharges: 0,
    resultatNet: 0,
    nbFactures: 0,
    factures: [] as Facture[],
    charges: [] as ChargeJournaliere[],
  });

  // Modal Saisie de Charge du Jour
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeMotif, setChargeMotif] = useState('');
  const [chargeMontant, setChargeMontant] = useState(5000);

  useEffect(() => {
    loadCompta();
  }, [period]);

  const loadCompta = () => {
    const data = offlineDB.getComptabiliteJournaliere(period);
    setStats(data);
  };

  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeMotif.trim() || !chargeMontant) return;

    offlineDB.addChargeJournaliere({
      motif: chargeMotif.trim(),
      montant: Number(chargeMontant),
    });

    setChargeMotif('');
    setChargeMontant(5000);
    setIsChargeModalOpen(false);
    loadCompta();
  };

  const tauxMarge = stats.caTotal > 0 ? Math.round((stats.margeBrute / stats.caTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E2D5C3]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-1 rounded-full border border-[#B8442C]/20">
              Gestion Financière & Marges
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#1B4332] mt-1">
              Comptabilité & Bilan Financier CMP
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChargeModalOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#E8A33D]" />
              <span>+ Ajouter une Charge (Loyer/Glace)</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto">
          {[
            { id: 'jour', label: "Aujourd'hui" },
            { id: 'semaine', label: '7 Derniers Jours' },
            { id: 'mois', label: 'Ce Mois-ci' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${
                period === tab.id
                  ? 'bg-[#1B4332] text-white shadow-md'
                  : 'bg-[#F3ECE0] border border-[#E2D5C3] text-gray-700 hover:bg-[#EADECB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-[#E2D5C3] p-5 rounded-3xl shadow-sm space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Chiffre d'Affaires Brut</span>
            <h2 className="font-serif font-black text-2xl text-[#1B4332]">
              {stats.caTotal.toLocaleString('fr-FR')} <span className="text-xs font-bold text-gray-500">FCFA</span>
            </h2>
            <p className="text-[11px] font-bold text-gray-500">{stats.nbFactures} facture(s) émises</p>
          </div>

          <div className="bg-white border border-[#E2D5C3] p-5 rounded-3xl shadow-sm space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Encaissé Réel en Caisse</span>
            <h2 className="font-serif font-black text-2xl text-emerald-800">
              {stats.encaisseReel.toLocaleString('fr-FR')} <span className="text-xs font-bold text-gray-500">FCFA</span>
            </h2>
            <p className="text-[11px] font-bold text-gray-500">Hors crédits clients impayés</p>
          </div>

          <div className="bg-white border border-[#E2D5C3] p-5 rounded-3xl shadow-sm space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#B8442C]">Coût d'Achat (CMV)</span>
            <h2 className="font-serif font-black text-2xl text-[#B8442C]">
              {stats.cmvTotal.toLocaleString('fr-FR')} <span className="text-xs font-bold text-gray-500">FCFA</span>
            </h2>
            <p className="text-[11px] font-bold text-gray-500">Calculé sur CMP fournisseur</p>
          </div>

          <div className="bg-[#1B4332] text-white p-5 rounded-3xl shadow-xl space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E8A33D]">Marge Brute Générée</span>
            <h2 className="font-serif font-black text-2xl">
              {stats.margeBrute.toLocaleString('fr-FR')} <span className="text-xs font-bold text-gray-300">FCFA</span>
            </h2>
            <p className="text-[11px] font-bold text-emerald-200">Taux de Marge : {tauxMarge}%</p>
          </div>
        </div>

        {/* Détails Charges & Résultat Net */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-2">
            <h3 className="font-serif font-black text-lg text-[#1B4332] flex items-center justify-between">
              <span>Journal des Charges Dépensées</span>
              <span className="text-xs font-bold text-[#B8442C]">
                Total: {stats.totalCharges.toLocaleString('fr-FR')} FCFA
              </span>
            </h3>

            {stats.charges.length === 0 ? (
              <div className="p-8 text-center bg-[#FBF7EF] rounded-2xl border border-dashed border-[#E2D5C3] text-gray-500 text-xs font-medium">
                Aucune charge enregistrée pour cette période.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {stats.charges.map((c) => (
                  <div key={c.id} className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-[#1B4332]">{c.motif}</p>
                      <p className="text-[10px] text-gray-500">{new Date(c.created_at).toLocaleString('fr-FR')}</p>
                    </div>
                    <span className="font-black text-red-600">
                      -{c.montant.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-black uppercase text-[#B8442C]">Résultat Net d'Exploitation</span>
              <h2 className="font-serif font-black text-3xl text-[#1B4332]">
                {stats.resultatNet.toLocaleString('fr-FR')} <span className="text-sm font-bold text-gray-600">FCFA</span>
              </h2>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                Résultat Net = Marge Brute - Total des Charges.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Charge */}
        {isChargeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleAddCharge} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Enregistrer une Charge</h3>
                <button type="button" onClick={() => setIsChargeModalOpen(false)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Motif de la Charge *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Loyer du local, Achat de glace, Électricité..."
                  value={chargeMotif}
                  onChange={(e) => setChargeMotif(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Montant Dépensé (FCFA) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={chargeMontant}
                  onChange={(e) => setChargeMontant(Number(e.target.value))}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChargeModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
                >
                  Valider la Charge
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
