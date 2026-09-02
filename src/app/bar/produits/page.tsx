'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import StockAiScannerModal from '@/components/StockAiScannerModal';
import { Package, Plus, Search, AlertTriangle, Edit2, ShieldAlert, X, Beer, Layers, Sparkles } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Produit, Etablissement } from '@/types';

export default function BarProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiScanOpen, setIsAiScanOpen] = useState(false);

  // Formulaire d'ajout de boisson Bar
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('Bière');
  const [casiers, setCasiers] = useState<number>(5);
  const [vrac, setVrac] = useState<number>(0);
  const [bouteillesParCasier, setBouteillesParCasier] = useState<number>(12);
  const [seuilAlerte, setSeuilAlerte] = useState<number>(5);
  const [prixAchatCasier, setPrixAchatCasier] = useState<number>(6000);
  const [prixVenteBouteille, setPrixVenteBouteille] = useState<number>(600);
  const [prixAchatUnitaire, setPrixAchatUnitaire] = useState<number>(500);

  // Modal d'Édition Complète de la Boisson
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null);
  const [editNom, setEditNom] = useState<string>('');
  const [editCategorie, setEditCategorie] = useState<string>('');
  const [editBouteillesParCasier, setEditBouteillesParCasier] = useState<number>(12);
  const [editPrixAchatUnit, setEditPrixAchatUnit] = useState<number>(500);
  const [editPrixVenteBouteille, setEditPrixVenteBouteille] = useState<number>(600);
  const [editSeuilAlerte, setEditSeuilAlerte] = useState<number>(5);
  const [editCasiers, setEditCasiers] = useState<number>(5);
  const [editVrac, setEditVrac] = useState<number>(0);

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

  const handleCategorySelect = (catName: string) => {
    setCategorie(catName);
    if (catName.toLowerCase().includes('vin') || catName.toLowerCase().includes('jus')) {
      setBouteillesParCasier(6);
      setPrixAchatUnitaire(Math.round(prixAchatCasier / 6));
    } else if (nom.toLowerCase().includes('guinness') || nom.toLowerCase().includes('malta')) {
      setBouteillesParCasier(24);
      setPrixAchatUnitaire(Math.round(prixAchatCasier / 24));
    } else {
      setBouteillesParCasier(12);
      setPrixAchatUnitaire(Math.round(prixAchatCasier / 12));
    }
  };

  const handleBouteillesParCasierChange = (val: number) => {
    const num = Math.max(1, val);
    setBouteillesParCasier(num);
    setPrixAchatUnitaire(Math.round(prixAchatCasier / num));
  };

  const handlePrixCasierChange = (val: number) => {
    setPrixAchatCasier(val);
    setPrixAchatUnitaire(Math.round(val / (bouteillesParCasier || 12)));
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    const etab = offlineDB.getEtablissement();
    const prodId = `prod-${Date.now()}`;
    const qTot = casiers * bouteillesParCasier + vrac;

    const newProd: Produit = {
      id: prodId,
      etablissement_id: etab.id,
      nom: nom.trim(),
      categorie: categorie.trim() || 'Bière',
      unite: 'bouteille',
      casiers_pleins: casiers,
      bouteilles_vrac: vrac,
      bouteilles_par_casier: bouteillesParCasier,
      quantite_totale: qTot,
      seuil_alerte: seuilAlerte,
      prix_achat_casier: prixAchatCasier,
      prix_vente_bouteille: prixVenteBouteille,
      prix_achat_unitaire: prixAchatUnitaire,
      prix_vente_unitaire: prixVenteBouteille,
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
    setEditBouteillesParCasier(p.bouteilles_par_casier || 12);
    setEditPrixAchatUnit(p.cout_achat_unitaire_cmp || p.prix_achat_unitaire || 500);
    setEditPrixVenteBouteille(p.prix_vente_bouteille || p.prix_vente_unitaire || 600);
    setEditSeuilAlerte(p.seuil_alerte || 5);
    setEditCasiers(p.casiers_pleins || 0);
    setEditVrac(p.bouteilles_vrac || 0);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduit) return;

    const qTot = editCasiers * editBouteillesParCasier + editVrac;

    const updated = produits.map((p) => {
      if (p.id !== editingProduit.id) return p;
      return {
        ...p,
        nom: editNom.trim() || p.nom,
        categorie: editCategorie.trim() || p.categorie,
        bouteilles_par_casier: editBouteillesParCasier,
        casiers_pleins: editCasiers,
        bouteilles_vrac: editVrac,
        quantite_totale: qTot,
        prix_achat_unitaire: editPrixAchatUnit,
        cout_achat_unitaire_cmp: editPrixAchatUnit,
        prix_achat_casier: editPrixAchatUnit * editBouteillesParCasier,
        prix_vente_bouteille: editPrixVenteBouteille,
        prix_vente_unitaire: editPrixVenteBouteille,
        seuil_alerte: editSeuilAlerte,
      };
    });

    offlineDB.saveProduits(updated);
    setEditingProduit(null);
    loadData();
  };

  const calcMargeBouteille = prixVenteBouteille - prixAchatUnitaire;
  const calcTauxMarge = prixVenteBouteille > 0 ? (calcMargeBouteille / prixVenteBouteille) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-28 lg:pb-8 space-y-6">
        {/* Top Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              Stock Boissons & Casiers Bar
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Catalogue Boissons & Conditionnements (Casiers 12, 24 / Vins 6 btl)
            </h1>
            <p className="text-xs text-[#1B4332]/70 font-medium">
              Gérez vos casiers de bières, bouteilles vrac, spiritueux et consignes du Bar.
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
              <span>Nouvelle Boisson / Casier</span>
            </button>
          </div>
        </div>

        {/* Filtres et Recherche */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F3ECE0] p-4 rounded-3xl border border-[#E2D5C3]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Rechercher une boisson..."
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

        {/* Liste des Boissons Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProduits.map((p) => {
            const lowStock = (p.quantite_totale || 0) <= (p.seuil_alerte || 5);
            const pAchatUnit = p.cout_achat_unitaire_cmp || p.prix_achat_unitaire || 0;
            const pVenteBtl = p.prix_vente_bouteille || p.prix_vente_unitaire || 0;
            const margeBtl = pVenteBtl - pAchatUnit;

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
                      title="Modifier la boisson"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stock Casiers & Vrac */}
                  <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
                      <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="text-[9px] font-bold text-amber-800 uppercase block">Casiers (Packs)</span>
                        <span className="font-black text-amber-950 text-sm">{p.casiers_pleins || 0} casiers</span>
                        <span className="text-[9px] text-gray-500 block">({p.bouteilles_par_casier || 12} btl/casier)</span>
                      </div>

                      <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                        <span className="text-[9px] font-bold text-blue-800 uppercase block">Bouteilles Vrac</span>
                        <span className="font-black text-blue-950 text-sm">{p.bouteilles_vrac || 0} btl</span>
                        <span className="text-[9px] text-gray-500 block">Hors casiers</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-[#1B4332] pt-1">
                      <span>Total Bouteilles Disponibles :</span>
                      <span className={`text-sm font-black ${lowStock ? 'text-red-600' : 'text-emerald-800'}`}>
                        {p.quantite_totale} btl
                      </span>
                    </div>

                    {lowStock && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-red-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Seuil d'alerte atteint ({p.seuil_alerte} btl)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tarifs & Marges */}
                <div className="pt-3 border-t border-[#E2D5C3] grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-[#FBF7EF]">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">PA Bouteille</span>
                    <span className="font-black text-[#1B4332]">{pAchatUnit.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FBF7EF]">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">PV Bouteille</span>
                    <span className="font-black text-emerald-800">{pVenteBtl.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FBF7EF]">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Marge / Btl</span>
                    <span className="font-black text-[#B8442C]">+{margeBtl.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL CRÉATION BOISSON BAR */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateProduct}
              className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Ajouter une Boisson Bar</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Nom de la Boisson</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Beaufort Lager 65cl, 33 Export, Castel, Vin Rouge..."
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Catégorie</label>
                  <select
                    value={categorie}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  >
                    <option value="Bière">Bière</option>
                    <option value="Soft / Jus">Soft / Jus</option>
                    <option value="Vin">Vin / Champagne</option>
                    <option value="Spiritueux">Spiritueux / Liqueur</option>
                    <option value="Eau">Eau Minérale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Contenance du Casier / Carton</label>
                  <select
                    value={bouteillesParCasier}
                    onChange={(e) => handleBouteillesParCasierChange(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  >
                    <option value={12}>12 bouteilles (Standard)</option>
                    <option value={24}>24 bouteilles (Guinness / Petit Modèle)</option>
                    <option value={6}>6 bouteilles (Carton de Vin / Jus)</option>
                    <option value={20}>20 bouteilles (Spécial)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Nombre de Casiers Pleins</label>
                  <input
                    type="number"
                    min="0"
                    value={casiers}
                    onChange={(e) => setCasiers(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Bouteilles au Vrac</label>
                  <input
                    type="number"
                    min="0"
                    value={vrac}
                    onChange={(e) => setVrac(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Prix Achat Casier Plein (FCFA)</label>
                  <input
                    type="number"
                    value={prixAchatCasier}
                    onChange={(e) => handlePrixCasierChange(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Prix Vente Bouteille (FCFA)</label>
                  <input
                    type="number"
                    value={prixVenteBouteille}
                    onChange={(e) => setPrixVenteBouteille(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              {/* Marge Calculée Bouteille */}
              <div className="p-3 rounded-2xl bg-emerald-100/60 border border-emerald-300 text-xs flex justify-between items-center font-bold text-emerald-900">
                <span>Coût Achat Unitaire Btl : {prixAchatUnitaire} FCFA</span>
                <span>Marge/Btl : +{calcMargeBouteille.toLocaleString('fr-FR')} FCFA ({calcTauxMarge.toFixed(1)}%)</span>
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
                  Créer la Boisson Bar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL ÉDITION BOISSON BAR */}
        {editingProduit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveEditProduct}
              className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Modifier la Boisson</h3>
                <button type="button" onClick={() => setEditingProduit(null)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Nom de la Boisson</label>
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Casiers Pleins</label>
                  <input
                    type="number"
                    value={editCasiers}
                    onChange={(e) => setEditCasiers(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Bouteilles Vrac</label>
                  <input
                    type="number"
                    value={editVrac}
                    onChange={(e) => setEditVrac(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Prix Achat Btl (FCFA)</label>
                  <input
                    type="number"
                    value={editPrixAchatUnit}
                    onChange={(e) => setEditPrixAchatUnit(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Prix Vente Btl (FCFA)</label>
                  <input
                    type="number"
                    value={editPrixVenteBouteille}
                    onChange={(e) => setEditPrixVenteBouteille(Number(e.target.value))}
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
                  Enregistrer la Modification
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
