'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Plus,
  Minus,
  ShieldAlert,
  Search,
  CheckCircle2,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { Produit, MouvementStock, Utilisateur, Etablissement } from '@/types';

export default function DashboardPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);
  const [lowStockProduits, setLowStockProduits] = useState<Produit[]>([]);

  // Modal Saisie Mouvement Rapide
  const [isMvtModalOpen, setIsMvtModalOpen] = useState(false);
  const [mvtType, setMvtType] = useState<'entree' | 'sortie' | 'casse_perte'>('entree');
  const [mvtProduitId, setMvtProduitId] = useState('');
  const [mvtQty, setMvtQty] = useState(1);
  const [mvtMotif, setMvtMotif] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setEtablissement(offlineDB.getEtablissement());
    setCurrentUser(offlineDB.getCurrentUser());
    const prods = offlineDB.getProduits();
    const mvts = offlineDB.getMouvements();
    const lowStock = offlineDB.getLowStockProducts();

    setProduits(prods);
    setMouvements(mvts);
    setLowStockProduits(lowStock);

    if (prods.length > 0 && !mvtProduitId) {
      setMvtProduitId(prods[0].id);
    }
  };

  const handleOpenMvtModal = (type: 'entree' | 'sortie' | 'casse_perte') => {
    setMvtType(type);
    setMvtQty(1);
    setMvtMotif(type === 'entree' ? 'Livraison Fournisseur' : type === 'sortie' ? 'Vente au Bar' : 'Casse au service');
    setIsMvtModalOpen(true);
  };

  const handleSaveMouvement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mvtProduitId || !mvtQty) return;

    offlineDB.addMouvementStock({
      produit_id: mvtProduitId,
      type_mouvement: mvtType,
      quantite_bouteilles: Number(mvtQty),
      note_motif: mvtMotif,
    });

    loadData();
    setIsMvtModalOpen(false);
  };

  // Calculs KPI Style Sastrify
  const totalProduitsCount = produits.length;
  const totalBouteillesCount = produits.reduce(
    (acc, p) => acc + (p.casiers_pleins * p.bouteilles_par_casier + p.bouteilles_vrac),
    0
  );
  const totalValeurStock = produits.reduce(
    (acc, p) => acc + (p.casiers_pleins * p.prix_achat_casier + (p.bouteilles_vrac * p.prix_vente_bouteille)),
    0
  );

  return (
    <div className="min-h-screen bg-[#0F1115] text-white flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Dashboard Area */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 max-w-7xl mx-auto pb-24">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-brand-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange bg-brand-orangeLight px-2.5 py-1 rounded-full border border-brand-orange/30">
                {etablissement?.type.toUpperCase()} • {etablissement?.ville}
              </span>
              <span className="text-xs text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                Essai 14j Actif
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Dashboard Inventaire & Contrôle
            </h1>
          </div>

          {/* Quick Mouvement Action Buttons (Inspired by Sastrify Top Right Actions) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenMvtModal('entree')}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-glow transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Entrée Stock</span>
            </button>

            <button
              onClick={() => handleOpenMvtModal('sortie')}
              className="py-2.5 px-4 rounded-xl bg-brand-orange hover:bg-brand-orangeHover text-white font-bold text-xs flex items-center gap-1.5 shadow-glow transition-transform active:scale-95"
            >
              <Minus className="w-4 h-4" />
              <span>- Vente / Sortie</span>
            </button>

            <button
              onClick={() => handleOpenMvtModal('casse_perte')}
              className="py-2.5 px-4 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>⚠️ Signaler Casse</span>
            </button>
          </div>
        </div>

        {/* 1. SASTRIFY KPI CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Total Products */}
          <div className="p-5 rounded-3xl bg-brand-card border border-brand-border shadow-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase">Total Produits</span>
              <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                📦
              </span>
            </div>
            <h3 className="text-3xl font-black text-white">{totalProduitsCount} <span className="text-xs text-gray-400 font-medium">articles</span></h3>
            <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
              <span className="text-emerald-400 font-bold flex items-center"><ArrowUpRight className="w-3.5 h-3.5" /> +100%</span> actif
            </p>
          </div>

          {/* Card 2: Total Quantity Bottles & Crates */}
          <div className="p-5 rounded-3xl bg-brand-card border border-brand-border shadow-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase">Quantité Totale</span>
              <span className="w-8 h-8 rounded-xl bg-brand-orange/20 text-brand-orange flex items-center justify-center font-bold text-xs">
                🍺
              </span>
            </div>
            <h3 className="text-3xl font-black text-brand-orange">{totalBouteillesCount} <span className="text-xs text-gray-400 font-medium">bouteilles</span></h3>
            <p className="text-[11px] text-gray-400 mt-2">Suivi en casiers + bouteilles vrac</p>
          </div>

          {/* Card 3: Stock Value FCFA */}
          <div className="p-5 rounded-3xl bg-brand-card border border-brand-border shadow-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase">Valeur du Stock</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                FCFA
              </span>
            </div>
            <h3 className="text-2xl font-black text-emerald-400">{totalValeurStock.toLocaleString('fr-FR')} F</h3>
            <p className="text-[11px] text-gray-400 mt-2">Valeur marchande estimée</p>
          </div>

          {/* Card 4: Restocking Alert Threshold */}
          <div className={`p-5 rounded-3xl border shadow-card relative overflow-hidden transition-all ${
            lowStockProduits.length > 0
              ? 'bg-red-950/30 border-red-500/50 shadow-glow'
              : 'bg-brand-card border-brand-border'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase">Alerte Stock Bas</span>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                lowStockProduits.length > 0 ? 'bg-red-500 text-white animate-bounce' : 'bg-gray-800 text-gray-400'
              }`}>
                ⚠️
              </span>
            </div>
            <h3 className={`text-3xl font-black ${lowStockProduits.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {lowStockProduits.length} <span className="text-xs text-gray-400 font-medium">produit(s)</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-2">Sous le seuil de réapprovisionnement</p>
          </div>
        </div>

        {/* 2. CHART & RECENT MOVEMENTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Chart Area */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-brand-card border border-brand-border shadow-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-white">Mouvements de Stock (7 Derniers Jours)</h3>
                <p className="text-xs text-gray-400">Évolution des entrées, sorties et casses au Cameroun</p>
              </div>
              <span className="text-xs text-brand-orange font-bold bg-brand-orange/20 px-3 py-1 rounded-full border border-brand-orange/40">
                Temps Réel
              </span>
            </div>

            {/* Visual Bar Chart Bar Mockup */}
            <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-brand-border/60 pb-2">
              {[
                { day: 'Lun', val: 40, color: 'bg-emerald-500' },
                { day: 'Mar', val: 65, color: 'bg-brand-orange' },
                { day: 'Mer', val: 30, color: 'bg-emerald-500' },
                { day: 'Jeu', val: 85, color: 'bg-brand-orange' },
                { day: 'Ven', val: 95, color: 'bg-brand-orange' },
                { day: 'Sam', val: 110, color: 'bg-amber-400' },
                { day: 'Dim', val: 75, color: 'bg-brand-orange' },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="text-[10px] text-gray-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.val}b
                  </div>
                  <div
                    style={{ height: `${item.val}%` }}
                    className={`w-full rounded-t-xl transition-all ${item.color} group-hover:brightness-125 shadow-glow`}
                  />
                  <span className="text-xs text-gray-400 font-bold">{item.day}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 mt-4 text-xs font-semibold text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Entrées Stock</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-brand-orange" /> Ventes / Sorties</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400" /> Pic Samedi</span>
            </div>
          </div>

          {/* Right Low Stock Alert List */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-brand-card border border-brand-border shadow-card flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Alertes Réapprovisionnement
              </h3>
              <p className="text-xs text-gray-400 mb-4">Produits sous le seuil d'alerte configuré</p>

              {lowStockProduits.length === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
                  ✅ Aucun produit sous le seuil d'alerte !
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockProduits.map((p) => (
                    <div key={p.id} className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🍺</span>
                        <div>
                          <h4 className="font-bold text-xs text-white">{p.nom}</h4>
                          <span className="text-[11px] text-red-400 font-bold">
                            Stock: {p.casiers_pleins}c + {p.bouteilles_vrac}b ({p.quantite_totale_bouteilles}b)
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 bg-black/60 px-2 py-1 rounded-lg">
                        Seuil: {p.seuil_alerte}b
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/produits"
              className="w-full mt-6 py-3 rounded-2xl bg-brand-black hover:bg-brand-hover border border-brand-border text-brand-orange font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Voir tout l'inventaire</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 3. SASTRIFY INVENTORY DATA TABLE */}
        <div className="p-6 rounded-3xl bg-brand-card border border-brand-border shadow-card overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-bold text-lg text-white">Tableau d'Inventaire Complet</h3>
              <p className="text-xs text-gray-400">Suivi en direct des bouteilles, casiers et valeurs FCFA</p>
            </div>

            <Link
              href="/produits"
              className="py-2.5 px-4 rounded-xl bg-brand-orange text-white font-bold text-xs shadow-glow flex items-center gap-1.5"
            >
              <Package className="w-4 h-4" />
              <span>Gérer les Produits</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-brand-black/80 text-gray-400 uppercase text-[10px] tracking-wider border-b border-brand-border">
                <tr>
                  <th className="py-3 px-4">Produit</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Stock Casiers + Vrac</th>
                  <th className="py-3 px-4">Prix Vente (Bouteille)</th>
                  <th className="py-3 px-4">Seuil Alerte</th>
                  <th className="py-3 px-4">Statut Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {produits.map((p) => {
                  const isLow = (p.casiers_pleins * p.bouteilles_par_casier + p.bouteilles_vrac) <= p.seuil_alerte;
                  return (
                    <tr key={p.id} className="hover:bg-brand-hover/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-orange" />
                        {p.nom}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-400">{p.categorie}</td>
                      <td className="py-3.5 px-4 font-black text-amber-400">
                        {p.casiers_pleins} casiers + {p.bouteilles_vrac} vrac ({p.quantite_totale_bouteilles}b)
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        {p.prix_vente_bouteille.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-400">{p.seuil_alerte} bouteilles</td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 font-bold text-[10px] animate-pulse">
                            ⚠️ Stock Bas
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold text-[10px]">
                            ✅ En Stock
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

      {/* MODAL SAISIE DE MOUVEMENT RAPIDE */}
      {isMvtModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-3xl p-6 w-full max-w-md shadow-glow relative">
            <button
              onClick={() => setIsMvtModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-brand-black"
            >
              ✕
            </button>

            <h2 className="text-xl font-black text-white mb-1">
              {mvtType === 'entree' ? '➕ Entrée de Stock (Livraison)' : mvtType === 'sortie' ? '➖ Sortie / Vente' : '⚠️ Casse / Perte'}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Ce mouvement sera enregistré et synchronisé avec l'établissement.
            </p>

            <form onSubmit={handleSaveMouvement} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Produit concerné *</label>
                <select
                  value={mvtProduitId}
                  onChange={(e) => setMvtProduitId(e.target.value)}
                  className="w-full bg-brand-black border border-brand-border rounded-2xl p-3.5 text-white font-bold text-sm focus:outline-none focus:border-brand-orange"
                >
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} (Stock actuel: {p.casiers_pleins}c + {p.bouteilles_vrac}b)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Quantité de Bouteilles *</label>
                <input
                  type="number"
                  min="1"
                  value={mvtQty}
                  onChange={(e) => setMvtQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-brand-black border border-brand-border rounded-2xl p-3.5 text-white font-black text-base focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Motif / Note *</label>
                <input
                  type="text"
                  placeholder="Ex: Livraison Brasseries du Cameroun..."
                  value={mvtMotif}
                  onChange={(e) => setMvtMotif(e.target.value)}
                  className="w-full bg-brand-black border border-brand-border rounded-2xl p-3.5 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-base shadow-glow transition-transform active:scale-95"
              >
                Valider Mouvement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
