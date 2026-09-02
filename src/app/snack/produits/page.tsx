'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import StockAiScannerModal from '@/components/StockAiScannerModal';
import { Utensils, Plus, Search, AlertTriangle, Edit2, ShieldAlert, X, Sparkles } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Produit, Etablissement } from '@/types';

export default function SnackProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiScanOpen, setIsAiScanOpen] = useState(false);

  // Formulaire d'ajout de plat / produit Snack
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('Plats Rapides');
  const [quantiteTotale, setQuantiteTotale] = useState<number>(20);
  const [seuilAlerte, setSeuilAlerte] = useState<number>(5);
  const [prixAchatUnitaire, setPrixAchatUnitaire] = useState<number>(1000);
  const [prixVenteUnitaire, setPrixVenteUnitaire] = useState<number>(2500);

  // Modal d'Édition du Plat
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null);
  const [editNom, setEditNom] = useState<string>('');
  const [editCategorie, setEditCategorie] = useState<string>('');
  const [editPrixAchatUnit, setEditPrixAchatUnit] = useState<number>(1000);
  const [editPrixVenteUnit, setEditPrixVenteUnit] = useState<number>(2500);
  const [editSeuilAlerte, setEditSeuilAlerte] = useState<number>(5);
  const [editStockTotal, setEditStockTotal] = useState<number>(20);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      const prods = offlineDB.getProduits();
      setProduits(prods);
    } catch (e) { console.error(e); }
  };

  const categories = Array.from(new Set(produits.map((p) => p.categorie))).filter(Boolean);

  const filteredProduits = produits.filter((p) => {
    if (!p) return false;
    const matchCat = filterCategory === 'tous' || p.categorie === filterCategory;
    const matchSearch =
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categorie.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    const etab = offlineDB.getEtablissement();
    const prodId = `prod-${Date.now()}`;

    const newProd: Produit = {
      id: prodId,
      etablissement_id: etab.id,
      nom: nom.trim(),
      categorie: categorie.trim() || 'Plat',
      unite: 'piece',
      quantite_totale: quantiteTotale,
      seuil_alerte: seuilAlerte,
      prix_achat_unitaire: prixAchatUnitaire,
      prix_vente_unitaire: prixVenteUnitaire,
      cout_achat_unitaire_cmp: prixAchatUnitaire,
      actif: true,
      created_at: new Date().toISOString(),
    };

    const currentProds = offlineDB.getProduits();
    offlineDB.saveProduits([newProd, ...currentProds]);

    setIsModalOpen(false);
    setNom('');
    loadData();
  };

  const handleOpenEditModal = (p: Produit) => {
    setEditingProduit(p);
    setEditNom(p.nom);
    setEditCategorie(p.categorie);
    setEditPrixAchatUnit(p.cout_achat_unitaire_cmp || p.prix_achat_unitaire || 1000);
    setEditPrixVenteUnit(p.prix_vente_unitaire || 2500);
    setEditSeuilAlerte(p.seuil_alerte || 5);
    setEditStockTotal(p.quantite_totale || 20);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduit) return;

    const updated = produits.map((p) => {
      if (p.id !== editingProduit.id) return p;
      return {
        ...p,
        nom: editNom.trim() || p.nom,
        categorie: editCategorie.trim() || p.categorie,
        prix_achat_unitaire: editPrixAchatUnit,
        cout_achat_unitaire_cmp: editPrixAchatUnit,
        prix_vente_unitaire: editPrixVenteUnit,
        seuil_alerte: editSeuilAlerte,
        quantite_totale: editStockTotal,
      };
    });

    offlineDB.saveProduits(updated);
    setEditingProduit(null);
    loadData();
  };

  const calcMargePortion = prixVenteUnitaire - prixAchatUnitaire;
  const calcTauxMarge = prixVenteUnitaire > 0 ? (calcMargePortion / prixVenteUnitaire) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        {/* Top Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              Menu & Stock Snack
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Carte des Plats, Boissons & Fast-Food
            </h1>
            <p className="text-xs text-[#1B4332]/70 font-medium">
              Gérez votre menu de restauration rapide (poulet, frites, chawarma, jus, boissons).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAiScanOpen(true)}
              className="py-3 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 border border-[#E8A33D]"
            >
              <Sparkles className="w-4 h-4 text-[#E8A33D]" />
              <span>📸 Saisie Rapide IA / CSV</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="py-3 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Plat / Boisson</span>
            </button>
          </div>
        </div>

        {/* Filtres et Recherche */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F3ECE0] p-4 rounded-3xl border border-[#E2D5C3]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Rechercher un plat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl pl-9 pr-4 py-2 text-xs font-bold text-[#1B4332]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterCategory('tous')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterCategory === 'tous'
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-[#FBF7EF] text-[#1B4332] border border-[#E2D5C3]'
              }`}
            >
              Tous
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterCategory === c
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-[#FBF7EF] text-[#1B4332] border border-[#E2D5C3]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des Plats Snack */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProduits.map((p) => {
            const lowStock = (p.quantite_totale || 0) <= (p.seuil_alerte || 5);
            const pAchat = p.cout_achat_unitaire_cmp || p.prix_achat_unitaire || 0;
            const pVente = p.prix_vente_unitaire || 0;
            const margePortion = pVente - pAchat;

            return (
              <div
                key={p.id}
                className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-3 relative hover:border-[#B8442C] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black text-[#B8442C] uppercase tracking-wider bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                        {p.categorie}
                      </span>
                      <h3 className="font-serif font-black text-lg text-[#1B4332] mt-1">{p.nom}</h3>
                    </div>

                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-2 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] hover:bg-[#E2D5C3] text-[#1B4332] transition-colors"
                      title="Modifier le plat"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] mt-3 space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-[#1B4332]">
                      <span>Portions / Quantité Disponibles :</span>
                      <span className={`text-sm font-black ${lowStock ? 'text-red-600' : 'text-emerald-800'}`}>
                        {p.quantite_totale} portions
                      </span>
                    </div>

                    {lowStock && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-red-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Stock faible ({p.seuil_alerte} portions restantes)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2D5C3] grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-[#FBF7EF]">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Coût Revient</span>
                    <span className="font-black text-[#1B4332]">{pAchat.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FBF7EF]">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Prix Vente</span>
                    <span className="font-black text-emerald-800">{pVente.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FBF7EF]">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Marge</span>
                    <span className="font-black text-[#B8442C]">+{margePortion.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL CRÉATION PLAT SNACK */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateProduct}
              className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Ajouter un Plat au Menu</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Nom du Plat / Produit</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Poulet Pané Frites, Chawarma Viande, Burger..."
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Catégorie</label>
                  <input
                    type="text"
                    placeholder="Plats, Boissons..."
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Portions en Stock</label>
                  <input
                    type="number"
                    min="1"
                    value={quantiteTotale}
                    onChange={(e) => setQuantiteTotale(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Coût de Revient (FCFA)</label>
                  <input
                    type="number"
                    value={prixAchatUnitaire}
                    onChange={(e) => setPrixAchatUnitaire(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Prix de Vente (FCFA)</label>
                  <input
                    type="number"
                    value={prixVenteUnitaire}
                    onChange={(e) => setPrixVenteUnitaire(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              {/* Marge Calculée */}
              <div className="p-3 rounded-2xl bg-emerald-100/60 border border-emerald-300 text-xs flex justify-between items-center font-bold text-emerald-900">
                <span>Marge par portion :</span>
                <span>+{calcMargePortion.toLocaleString('fr-FR')} FCFA ({calcTauxMarge.toFixed(1)}%)</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
                >
                  Ajouter au Menu
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL ÉDITION PLAT SNACK */}
        {editingProduit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveEditProduct}
              className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Modifier le Plat</h3>
                <button type="button" onClick={() => setEditingProduit(null)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Nom du Plat</label>
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Coût de Revient (FCFA)</label>
                  <input
                    type="number"
                    value={editPrixAchatUnit}
                    onChange={(e) => setEditPrixAchatUnit(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Prix de Vente (FCFA)</label>
                  <input
                    type="number"
                    value={editPrixVenteUnit}
                    onChange={(e) => setEditPrixVenteUnit(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Portions Disponibles</label>
                  <input
                    type="number"
                    value={editStockTotal}
                    onChange={(e) => setEditStockTotal(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Seuil Alerte Stock</label>
                  <input
                    type="number"
                    value={editSeuilAlerte}
                    onChange={(e) => setEditSeuilAlerte(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduit(null)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Scan IA Stock */}
        <StockAiScannerModal
          isOpen={isAiScanOpen}
          onClose={() => setIsAiScanOpen(false)}
          onSuccess={loadData}
        />
      </main>
    </div>
  );
}
