'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, AlertTriangle, Edit, Trash2, CheckCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { Produit } from '@/types';

export default function ProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State Nouveau Produit
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('Bière');
  const [casiersPleins, setCasiersPleins] = useState(5);
  const [bouteillesVrac, setBouteillesVrac] = useState(0);
  const [bouteillesParCasier, setBouteillesParCasier] = useState<12 | 24>(24);
  const [prixAchatCasier, setPrixAchatCasier] = useState(6000);
  const [prixVenteBouteille, setPrixVenteBouteille] = useState(700);
  const [seuilAlerte, setSeuilAlerte] = useState(48);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setProduits(offlineDB.getProduits());
  };

  const handleSaveProduit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    const etab = offlineDB.getEtablissement();
    const newProd: Produit = {
      id: 'prod-' + Date.now(),
      etablissement_id: etab.id,
      nom: nom.trim(),
      categorie,
      unite: 'bouteille',
      casiers_pleins: Number(casiersPleins) || 0,
      bouteilles_vrac: Number(bouteillesVrac) || 0,
      bouteilles_par_casier: bouteillesParCasier,
      quantite_totale_bouteilles: casiersPleins * bouteillesParCasier + bouteillesVrac,
      seuil_alerte: Number(seuilAlerte) || 48,
      prix_achat_casier: Number(prixAchatCasier) || 0,
      prix_vente_bouteille: Number(prixVenteBouteille) || 0,
      actif: true,
    };

    offlineDB.saveProduits([newProd, ...produits]);
    loadData();
    setIsAddModalOpen(false);
    setNom('');
  };

  const filteredProduits = produits.filter((p) => {
    const matchesSearch = p.nom.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'Tous' || p.categorie === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#0F1115] text-white flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 max-w-7xl mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-brand-border/60">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange bg-brand-orangeLight px-2.5 py-1 rounded-full border border-brand-orange/30">
              Gestion de Stock
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Catalogue Produits & Casiers</h1>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-xs flex items-center gap-2 shadow-glow transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Ajouter un Produit</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Rechercher une boisson..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {['Tous', 'Bière', 'Soft', 'Nectar', 'Plat Chaud'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? 'bg-brand-orange text-white shadow-glow'
                    : 'bg-brand-card border border-brand-border text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Products Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProduits.map((p) => {
            const isLow = (p.casiers_pleins * p.bouteilles_par_casier + p.bouteilles_vrac) <= p.seuil_alerte;
            return (
              <div
                key={p.id}
                className={`p-5 rounded-3xl bg-brand-card border transition-all flex flex-col justify-between shadow-card ${
                  isLow ? 'border-red-500/50 bg-red-950/20 shadow-glow' : 'border-brand-border'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[10px] font-black uppercase text-brand-orange bg-brand-black px-2 py-0.5 rounded-full border border-brand-border">
                      {p.categorie}
                    </span>
                    {isLow && (
                      <span className="text-[10px] font-black text-red-400 bg-red-950 px-2 py-0.5 rounded-full border border-red-500/40 animate-pulse">
                        ⚠️ ALERTE SEUIL
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-base text-white mb-1">{p.nom}</h3>
                  <div className="p-3 rounded-2xl bg-brand-black/70 border border-brand-border/60 my-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Casiers pleins :</span>
                      <span className="font-black text-amber-400">{p.casiers_pleins} ({p.bouteilles_par_casier}b/casier)</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Bouteilles vrac :</span>
                      <span className="font-black text-amber-400">{p.bouteilles_vrac} bouteilles</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Prix Vente</span>
                    <span className="text-sm font-black text-emerald-400">{p.prix_vente_bouteille.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <span className="text-xs font-bold text-gray-400">Seuil: {p.seuil_alerte}b</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL AJOUT PRODUIT */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-brand-card border border-brand-border rounded-3xl p-6 w-full max-w-md shadow-glow relative">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-brand-black"
              >
                ✕
              </button>

              <h2 className="text-xl font-black text-white mb-1">Nouveau Produit</h2>
              <p className="text-xs text-gray-400 mb-4">Ajoutez une boisson ou un plat à votre inventaire.</p>

              <form onSubmit={handleSaveProduit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Nom du Produit *</label>
                  <input
                    type="text"
                    placeholder="Ex: Heineken 65cl"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-sm focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Catégorie</label>
                    <select
                      value={categorie}
                      onChange={(e) => setCategorie(e.target.value)}
                      className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                    >
                      <option value="Bière">Bière</option>
                      <option value="Soft">Soft / Nectar</option>
                      <option value="Plat Chaud">Plat Chaud</option>
                      <option value="Snack">Snack</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Seuil Alerte (bouteilles)</label>
                    <input
                      type="number"
                      value={seuilAlerte}
                      onChange={(e) => setSeuilAlerte(parseInt(e.target.value) || 24)}
                      className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Casiers Pleins</label>
                    <input
                      type="number"
                      value={casiersPleins}
                      onChange={(e) => setCasiersPleins(parseInt(e.target.value) || 0)}
                      className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Bouteilles Vrac</label>
                    <input
                      type="number"
                      value={bouteillesVrac}
                      onChange={(e) => setBouteillesVrac(parseInt(e.target.value) || 0)}
                      className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Prix Achat Casier (F)</label>
                    <input
                      type="number"
                      value={prixAchatCasier}
                      onChange={(e) => setPrixAchatCasier(parseInt(e.target.value) || 0)}
                      className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Prix Vente Bouteille (F)</label>
                    <input
                      type="number"
                      value={prixVenteBouteille}
                      onChange={(e) => setPrixVenteBouteille(parseInt(e.target.value) || 0)}
                      className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 text-white font-black text-base shadow-glow transition-transform active:scale-95 mt-2"
                >
                  Enregistrer le Produit
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
