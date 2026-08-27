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
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Filter
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { Facture, ChargeJournaliere } from '@/types';

export default function ComptabilitePage() {
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
              Comptabilité Journalière & Résultats
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
            { id: 'jour', label: "Aujourd'hui (État du Jour)" },
            { id: 'semaine', label: '7 Derniers Jours' },
            { id: 'mois', label: 'Ce Mois-ci' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                period === p.id
                  ? 'bg-[#1B4332] text-white shadow-md font-black'
                  : 'bg-[#F3ECE0] border border-[#E2D5C3] text-[#1B4332] hover:bg-[#EADECB]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 1. TOP FINANCIAL KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Card 1: Chiffre d'Affaires */}
          <div className="p-6 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card">
            <span className="text-xs font-bold text-[#1B4332]/70 uppercase tracking-wider block mb-2">Chiffre d'Affaires Brut</span>
            <h3 className="font-serif text-3xl font-black text-[#1B4332]">
              {stats.caTotal.toLocaleString('fr-FR')} <span className="text-sm font-sans font-bold text-[#1B4332]/70">FCFA</span>
            </h3>
            <p className="text-xs text-[#2D6A4F] font-bold mt-2 flex items-center gap-1">
              <span>🧾 {stats.nbFactures} factures émises</span>
            </p>
          </div>

          {/* Card 2: Encaissé Réel */}
          <div className="p-6 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card">
            <span className="text-xs font-bold text-[#1B4332]/70 uppercase tracking-wider block mb-2">Encaissé Réel (Cash/MoMo)</span>
            <h3 className="font-serif text-3xl font-black text-[#2D6A4F]">
              {stats.encaisseReel.toLocaleString('fr-FR')} <span className="text-sm font-sans font-bold text-[#1B4332]/70">FCFA</span>
            </h3>
            <p className="text-xs text-[#1B4332]/80 font-bold mt-2">
              {stats.caTotal - stats.encaisseReel > 0 ? (
                <span className="text-[#B8442C]">⚠️ {(stats.caTotal - stats.encaisseReel).toLocaleString('fr-FR')} F en crédits en cours</span>
              ) : (
                '✅ 100% de la caisse encaissée'
              )}
            </p>
          </div>

          {/* Card 3: Marge Brute */}
          <div className="p-6 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#1B4332]/70 uppercase tracking-wider">Marge Brute (Marge %)</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E8A33D] text-[#0F291E] text-[10px] font-black">
                {tauxMarge}%
              </span>
            </div>
            <h3 className="font-serif text-3xl font-black text-[#1B4332]">
              {stats.margeBrute.toLocaleString('fr-FR')} <span className="text-sm font-sans font-bold text-[#1B4332]/70">FCFA</span>
            </h3>
            <p className="text-xs text-[#1B4332]/70 font-bold mt-2">
              CMV (Achats) : {stats.cmvTotal.toLocaleString('fr-FR')} FCFA
            </p>
          </div>

          {/* Card 4: Résultat Net Estimé */}
          <div className="p-6 rounded-3xl bg-[#0F291E] text-white border-2 border-[#E8A33D]/40 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">Résultat Net Estimé</span>
              <h3 className="font-serif text-3xl font-black text-[#E8A33D]">
                {stats.resultatNet.toLocaleString('fr-FR')} <span className="text-sm font-sans font-bold text-gray-200">FCFA</span>
              </h3>
            </div>
            <p className="text-xs text-gray-300 font-medium mt-2 pt-2 border-t border-[#2D6A4F]">
              Après déduction de {stats.totalCharges.toLocaleString('fr-FR')} F de charges
            </p>
          </div>
        </div>

        {/* 2. SYNTHÈSE COMPTABLE & LISTE DES CHARGES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Tableau détaillé de calcul P&L */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#1B4332] bg-[#1B4332]/10 px-2.5 py-1 rounded-full border border-[#1B4332]/20">
                  Décompte P&L
                </span>
                <h3 className="font-serif font-black text-xl text-[#1B4332] mt-1">
                  Structure des Marges & Bilan
                </h3>
              </div>
            </div>

            <div className="space-y-3.5 text-xs font-semibold text-[#1B4332]">
              <div className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between">
                <span>(+) Chiffre d'Affaires Total des Ventes :</span>
                <span className="font-black text-base text-[#1B4332]">{stats.caTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between text-[#B8442C]">
                <span>(-) Coût des Marchandises Vendues (CMV basés sur le CMP) :</span>
                <span className="font-black text-base">-{stats.cmvTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1B4332] text-white flex items-center justify-between">
                <span className="font-bold">(=) Marge Brute Établissement :</span>
                <span className="font-serif font-black text-lg text-[#E8A33D]">{stats.margeBrute.toLocaleString('fr-FR')} FCFA ({tauxMarge}%)</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between text-[#B8442C]">
                <span>(-) Charges Journalières (Loyer, Glace, Électricité...) :</span>
                <span className="font-black text-base">-{stats.totalCharges.toLocaleString('fr-FR')} FCFA</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F291E] text-white border border-[#E8A33D]/50 flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-[#E8A33D]">(=) RÉSULTAT NET ESTIMÉ PATRON :</span>
                <span className="font-serif font-black text-xl text-white">{stats.resultatNet.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          {/* Charges Saisies */}
          <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-1 rounded-full border border-[#B8442C]/20">
                    Charges de la Période
                  </span>
                  <h3 className="font-serif font-black text-xl text-[#1B4332] mt-1">
                    Dépenses & Frais Généraux
                  </h3>
                </div>

                <button
                  onClick={() => setIsChargeModalOpen(true)}
                  className="p-2 rounded-xl bg-[#1B4332] text-[#E8A33D]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {stats.charges.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-center text-xs text-gray-500 font-medium">
                  Aucune charge enregistrée pour cette période.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.charges.map((c) => (
                    <div key={c.id} className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-[#1B4332]">{c.motif}</h4>
                        <span className="text-[10px] text-gray-500">{c.date}</span>
                      </div>
                      <span className="font-black text-xs text-[#B8442C]">-{c.montant.toLocaleString('fr-FR')} F</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2D5C3] text-center">
              <span className="text-xs text-[#1B4332]/70 font-medium">
                💡 Saisissez les petits frais quotidiens pour avoir un résultat net ultra-réel.
              </span>
            </div>
          </div>
        </div>

        {/* 3. HISTORIQUE DES FACTURES ÉMISES */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-serif font-black text-xl text-[#1B4332]">Factures Émises ({stats.factures.length})</h3>
              <p className="text-xs text-[#1B4332]/70 font-medium">Détail des tickets de caisse et ventes enregistrées</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1B4332]">
              <thead className="bg-[#FBF7EF] text-[#1B4332]/70 uppercase text-[10px] tracking-wider border-b border-[#E2D5C3]">
                <tr>
                  <th className="py-3 px-4">N° Facture</th>
                  <th className="py-3 px-4">Heure / Date</th>
                  <th className="py-3 px-4">Client / Mode</th>
                  <th className="py-3 px-4">Montant Total</th>
                  <th className="py-3 px-4">Payé</th>
                  <th className="py-3 px-4">Restant Dû</th>
                  <th className="py-3 px-4">Marge Brute</th>
                  <th className="py-3 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D5C3]">
                {stats.factures.map((f) => {
                  const dateStr = new Date(f.created_at).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  const totalMarge = f.lignes ? f.lignes.reduce((acc, l) => acc + l.marge_brute, 0) : 0;

                  return (
                    <tr key={f.id} className="hover:bg-[#FBF7EF]/60 transition-colors">
                      <td className="py-3.5 px-4 font-black font-mono text-[#1B4332]">{f.numero_facture}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-600">{dateStr}</td>
                      <td className="py-3.5 px-4 font-bold">
                        {f.client ? f.client.nom : 'Client Comptoir'}
                        <span className="block text-[10px] text-gray-500 font-normal uppercase">{f.mode_paiement}</span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-[#1B4332]">{f.montant_total.toLocaleString('fr-FR')} F</td>
                      <td className="py-3.5 px-4 font-bold text-[#2D6A4F]">{f.montant_paye.toLocaleString('fr-FR')} F</td>
                      <td className="py-3.5 px-4 font-bold text-[#B8442C]">
                        {f.montant_restant > 0 ? `${f.montant_restant.toLocaleString('fr-FR')} F` : '0 F'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#E8A33D]">{totalMarge.toLocaleString('fr-FR')} F</td>
                      <td className="py-3.5 px-4">
                        {f.statut === 'payee' ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#1B4332]/10 text-[#2D6A4F] font-bold text-[10px]">
                            ✅ Payée
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-[#B8442C]/10 text-[#B8442C] font-bold text-[10px] animate-pulse">
                            ⚠️ Crédit ({f.montant_restant} F)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL SAISIE DE CHARGE */}
      {isChargeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsChargeModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black p-1.5 rounded-full bg-[#FBF7EF]"
            >
              ✕
            </button>

            <h2 className="font-serif text-xl font-black text-[#1B4332] mb-1">
              ➕ Saisir une Charge / Dépense
            </h2>
            <p className="text-xs text-[#1B4332]/70 mb-4 font-medium">
              Renseignez les frais (glace, loyer, transport) pour déduire de la marge brute.
            </p>

            <form onSubmit={handleAddCharge} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1.5">Catégories Rapides de Dépense</label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    '🏢 Loyer du magasin/local',
                    '👩‍💼 Salaire Vendeuse / Serveuse',
                    '⚡ Électricité & Eau (ENEO)',
                    '🚚 Transport & Livraison',
                    '🧊 Sacs de glace en bloc',
                    '📦 Emballages & Sacs',
                    '🛠️ Entretien & Matériel',
                  ].map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setChargeMotif(cat)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-all ${
                        chargeMotif === cat
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3] hover:border-[#1B4332]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <label className="text-xs font-bold text-[#1B4332] block mb-1">Motif / Libellé de la Dépense *</label>
                <input
                  type="text"
                  placeholder="Ex: Loyer du mois, Salaire Carine..."
                  value={chargeMotif}
                  onChange={(e) => setChargeMotif(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Montant de la Dépense (FCFA) *</label>
                <input
                  type="number"
                  min="0"
                  value={chargeMontant}
                  onChange={(e) => setChargeMontant(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-black text-base focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-base shadow-md transition-transform active:scale-95"
              >
                Enregistrer la Charge & Déduire du Résultat Net
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
