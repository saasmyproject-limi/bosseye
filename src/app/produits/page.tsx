'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Package, AlertTriangle, Plus, Search, Tag, Check, Layers, Edit2, ShieldAlert, DollarSign, TrendingUp, X } from 'lucide-react';
import { offlineDB, getTerminology } from '@/lib/offlineDB';
import { Produit, Etablissement, VarianteProduit } from '@/types';

export default function ProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulaire d'ajout de produit
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('');
  const [unite, setUnite] = useState<'bouteille' | 'casier' | 'piece'>('bouteille');
  const [casiers, setCasiers] = useState<number>(5);
  const [vrac, setVrac] = useState<number>(0);
  const [bouteillesParCasier, setBouteillesParCasier] = useState<12 | 24>(24);
  const [quantiteTotalePiece, setQuantiteTotalePiece] = useState<number>(10);
  const [seuilAlerte, setSeuilAlerte] = useState<number>(5);
  const [prixAchatCasier, setPrixAchatCasier] = useState<number>(6000);
  const [prixVenteBouteille, setPrixVenteBouteille] = useState<number>(600);
  const [prixAchatUnitaire, setPrixAchatUnitaire] = useState<number>(250);
  const [prixVenteUnitaire, setPrixVenteUnitaire] = useState<number>(1000);

  // Variantes pour Boutique (Taille / Couleur)
  const [taillesInput, setTaillesInput] = useState<string>('S, M, L, XL');
  const [couleursInput, setCouleursInput] = useState<string>('Noir, Blanc, Rouge');

  // Modal d'Édition Complète du Produit (Prix d'Achat, Prix de Vente, Stock, Seuil)
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null);
  const [editNom, setEditNom] = useState<string>('');
  const [editCategorie, setEditCategorie] = useState<string>('');
  const [editPrixAchatUnit, setEditPrixAchatUnit] = useState<number>(250);
  const [editPrixVenteUnit, setEditPrixVenteUnit] = useState<number>(600);
  const [editSeuilAlerte, setEditSeuilAlerte] = useState<number>(5);
  const [editStockTotal, setEditStockTotal] = useState<number>(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      const prods = offlineDB.getProduits();
      setProduits(prods);
      if (etab.type_activite === 'boutique') {
        setUnite('piece');
        setCategorie('Vêtements');
        setPrixAchatUnitaire(12000);
        setPrixVenteUnitaire(25000);
      } else {
        setUnite('bouteille');
        setCategorie('Bière');
        setPrixAchatUnitaire(250);
        setPrixVenteBouteille(600);
      }
    } catch (e) { console.error(e); }
  };

  const term = getTerminology(etablissement?.type_activite);

  const categories = Array.from(new Set(produits.map((p) => p.categorie))).filter(Boolean);

  const filteredProduits = produits.filter((p) => {
    if (!p) return false;
    const matchCat = filterCategory === 'tous' || p.categorie === filterCategory;
    const matchSearch =
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categorie.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Gestion du changement de prix d'achat par casier -> Mise à jour du prix d'achat unitaire
  const handlePrixCasierChange = (val: number) => {
    setPrixAchatCasier(val);
    setPrixAchatUnitaire(Math.round(val / bouteillesParCasier));
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    const etab = offlineDB.getEtablissement();
    const isBoutique = etab.type_activite === 'boutique';
    const prodId = `prod-${Date.now()}`;

    let generatedVariantes: VarianteProduit[] | undefined = undefined;

    if (isBoutique && taillesInput.trim()) {
      const tList = taillesInput.split(',').map((s) => s.trim()).filter(Boolean);
      const cList = couleursInput.split(',').map((s) => s.trim()).filter(Boolean);

      generatedVariantes = [];
      let vIndex = 1;
      tList.forEach((t) => {
        const cArray = cList.length > 0 ? cList : ['Standard'];
        cArray.forEach((c) => {
          generatedVariantes!.push({
            id: `var-${prodId}-${vIndex++}`,
            produit_id: prodId,
            sku_code: `${nom.slice(0, 3).toUpperCase()}-${t}-${c.slice(0, 3).toUpperCase()}`,
            taille: t,
            couleur: c,
            quantite_stock: Math.max(1, Math.floor(quantiteTotalePiece / (tList.length * cArray.length))),
          });
        });
      });
    }

    const qTot = isBoutique
      ? quantiteTotalePiece
      : casiers * bouteillesParCasier + vrac;

    const pAchatUnit = isBoutique ? prixAchatUnitaire : prixAchatUnitaire;
    const pVenteUnit = isBoutique ? prixVenteUnitaire : prixVenteBouteille;

    const newProd: Produit = {
      id: prodId,
      etablissement_id: etab.id,
      nom: nom.trim(),
      categorie: categorie.trim() || (isBoutique ? 'Article' : 'Boisson'),
      unite: isBoutique ? 'piece' : 'bouteille',
      casiers_pleins: isBoutique ? undefined : casiers,
      bouteilles_vrac: isBoutique ? undefined : vrac,
      bouteilles_par_casier: isBoutique ? undefined : bouteillesParCasier,
      quantite_totale: qTot,
      seuil_alerte: seuilAlerte,
      prix_achat_casier: isBoutique ? undefined : prixAchatCasier,
      prix_vente_bouteille: isBoutique ? undefined : prixVenteBouteille,
      prix_achat_unitaire: pAchatUnit,
      prix_vente_unitaire: pVenteUnit,
      cout_achat_unitaire_cmp: pAchatUnit,
      variantes: generatedVariantes,
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
    setEditPrixAchatUnit(p.cout_achat_unitaire_cmp || p.prix_achat_unitaire || 250);
    setEditPrixVenteUnit(p.prix_vente_bouteille || p.prix_vente_unitaire || 600);
    setEditSeuilAlerte(p.seuil_alerte || 5);
    setEditStockTotal(p.quantite_totale || 10);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduit) return;

    const isBoutique = etablissement?.type_activite === 'boutique';

    const updated = produits.map((p) => {
      if (p.id !== editingProduit.id) return p;
      return {
        ...p,
        nom: editNom.trim() || p.nom,
        categorie: editCategorie.trim() || p.categorie,
        prix_achat_unitaire: editPrixAchatUnit,
        cout_achat_unitaire_cmp: editPrixAchatUnit,
        prix_achat_casier: p.bouteilles_par_casier ? editPrixAchatUnit * p.bouteilles_par_casier : p.prix_achat_casier,
        prix_vente_unitaire: editPrixVenteUnit,
        prix_vente_bouteille: isBoutique ? undefined : editPrixVenteUnit,
        seuil_alerte: editSeuilAlerte,
        quantite_totale: editStockTotal,
      };
    });

    offlineDB.saveProduits(updated);
    setEditingProduit(null);
    loadData();
  };

  // Calculateurs de marge
  const calcMargeUnit = prixVenteUnitaire - prixAchatUnitaire;
  const calcTauxMarge = prixVenteUnitaire > 0 ? (calcMargeUnit / prixVenteUnitaire) * 100 : 0;

  const editMargeUnit = editPrixVenteUnit - editPrixAchatUnit;
  const editTauxMarge = editPrixVenteUnit > 0 ? (editMargeUnit / editPrixVenteUnit) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        {/* Top Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              Gestion du {term.stockLabel}
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Catalogue, Prix d'Achat / Vente & Marges
            </h1>
            <p className="text-xs text-[#1B4332]/70 font-medium">
              Saisissez ou modifiez les prix d'achat, prix de vente, stocks et seuils d'alerte pour calculer vos marges bénéficiaires.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="py-3 px-5 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau {term.itemLabel}</span>
          </button>
        </div>

        {/* Filtres & Recherche */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={`Rechercher un ${term.itemLabel.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold text-[#1B4332]"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#1B4332]"
          >
            <option value="tous">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Liste des produits */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProduits.map((p) => {
            const isLowStock = (p.quantite_totale || 0) <= (p.seuil_alerte || 10);
            const pVente = p.prix_vente_unitaire || p.prix_vente_bouteille || 0;
            const pAchat = p.cout_achat_unitaire_cmp || p.prix_achat_unitaire || 0;
            const margeUnit = pVente - pAchat;
            const tauxMarge = pVente > 0 ? (margeUnit / pVente) * 100 : 0;

            return (
              <div
                key={p.id}
                className={`bg-[#F3ECE0] border-2 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-3 transition-all ${
                  isLowStock ? 'border-amber-500 bg-amber-50/50' : 'border-[#E2D5C3]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full">
                      {p.categorie}
                    </span>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isLowStock ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isLowStock ? '⚠️ Stock Bas' : 'OK Stock'}
                    </span>
                  </div>

                  <h3 className="font-serif font-black text-lg text-[#1B4332]">{p.nom}</h3>

                  <div className="mt-3 p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-500">Stock Disponible :</span>
                      <span className="font-black text-[#1B4332]">
                        {p.quantite_totale} {etablissement?.type_activite === 'boutique' || p.unite === 'piece' ? 'pièce(s)' : 'bouteille(s)'}
                        {etablissement?.type_activite !== 'boutique' && p.casiers_pleins !== undefined && ` (${p.casiers_pleins} casier(s))`}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-bold text-gray-500">Seuil d'Alerte :</span>
                      <span className="font-bold text-[#B8442C]">{p.seuil_alerte || 5} unité(s)</span>
                    </div>

                    <div className="pt-2 border-t border-[#E2D5C3] grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-gray-500 font-bold block">Prix d'Achat CMP :</span>
                        <span className="font-black text-gray-800">{pAchat.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-bold block">Prix de Vente :</span>
                        <span className="font-black text-[#1B4332]">{pVente.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>

                    {/* Marge Calculée en Direct */}
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-[11px]">
                      <span className="font-bold text-emerald-950">Marge Brute :</span>
                      <span className="font-black text-emerald-900">
                        +{margeUnit.toLocaleString('fr-FR')} F ({tauxMarge.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {p.variantes && p.variantes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.variantes.map((v) => (
                        <span key={v.id} className="text-[10px] font-bold bg-[#FBF7EF] border border-[#E2D5C3] px-2 py-0.5 rounded-md">
                          {v.taille} • {v.couleur} ({v.quantite_stock})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E2D5C3] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500">
                    ID: {p.id.slice(0, 12)}
                  </span>

                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#2D6A4F] shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#E8A33D]" />
                    <span>Modifier Prix & Stock</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL CRÉATION PRODUIT AVEC SAISIE DÉTAILLÉE DE PRIX D'ACHAT ET PRIX DE VENTE */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateProduct}
              className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#E2D5C3] pb-3">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">
                  Ajouter un {term.itemLabel}
                </h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Produit / Article *</label>
                <input
                  type="text"
                  placeholder={etablissement?.type_activite === 'boutique' ? 'Ex: Robe de Soirée Éléganza' : 'Ex: Beaufort Lager 65cl'}
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Catégorie *</label>
                  <input
                    type="text"
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Unité de Mesure</label>
                  <select
                    value={unite}
                    onChange={(e) => setUnite(e.target.value as any)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                  >
                    <option value="bouteille">Bouteille / Canette</option>
                    <option value="casier">Casier</option>
                    <option value="piece">Pièce / Article</option>
                  </select>
                </div>
              </div>

              {/* SAISIE EXPLICITE DES PRIX D'ACHAT ET PRIX DE VENTE */}
              <div className="p-4 rounded-2xl bg-[#FBF7EF] border-2 border-[#1B4332]/20 space-y-3">
                <h4 className="font-serif font-black text-sm text-[#1B4332] flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#B8442C]" />
                  1. Prix d'Achat & Prix de Vente *
                </h4>

                {etablissement?.type_activite !== 'boutique' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Prix d'Achat du Casier (FCFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={prixAchatCasier}
                      onChange={(e) => handlePrixCasierChange(Number(e.target.value))}
                      className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Prix d'Achat Unitaire (CMP FCFA) *</label>
                    <input
                      type="number"
                      min="0"
                      value={prixAchatUnitaire}
                      onChange={(e) => setPrixAchatUnitaire(Number(e.target.value))}
                      className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Prix de Vente Unitaire (FCFA) *</label>
                    <input
                      type="number"
                      min="0"
                      value={etablissement?.type_activite === 'boutique' ? prixVenteUnitaire : prixVenteBouteille}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPrixVenteUnitaire(val);
                        setPrixVenteBouteille(val);
                      }}
                      className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                      required
                    />
                  </div>
                </div>

                {/* BADGE DE CALCUL DE LA MARGE */}
                <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-950">Marge Brute Calculée :</span>
                  <span className="font-serif font-black text-emerald-950">
                    +{calcMargeUnit.toLocaleString('fr-FR')} FCFA ({calcTauxMarge.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* SAISIE DE LA QUANTITÉ INITIALE EXPLICITE */}
              <div className="p-4 rounded-2xl bg-[#FBF7EF] border-2 border-[#1B4332]/20 space-y-3">
                <h4 className="font-serif font-black text-sm text-[#1B4332] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#B8442C]" />
                  2. Quantité Initiale en Stock *
                </h4>

                {etablissement?.type_activite === 'boutique' ? (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Nombre total de pièces en stock *</label>
                    <input
                      type="number"
                      min="0"
                      value={quantiteTotalePiece}
                      onChange={(e) => setQuantiteTotalePiece(Number(e.target.value))}
                      className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-3 text-sm font-black text-[#1B4332]"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Casiers pleins ({bouteillesParCasier} btl/casier)</label>
                      <input
                        type="number"
                        min="0"
                        value={casiers}
                        onChange={(e) => setCasiers(Number(e.target.value))}
                        className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-3 text-sm font-black text-[#1B4332]"
                      />
                      <span className="text-[10px] text-gray-500 font-bold block mt-1">📦 Casiers intacts non entamés</span>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Bouteilles vrac (Isolées)</label>
                      <input
                        type="number"
                        min="0"
                        value={vrac}
                        onChange={(e) => setVrac(Number(e.target.value))}
                        className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-3 text-sm font-black text-[#1B4332]"
                      />
                      <span className="text-[10px] text-gray-500 font-bold block mt-1">🍾 Bouteilles seules hors casier (ex: au frigo)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* SEUIL D'ALERTE DE STOCK BAS PERSONNALISABLE */}
              <div className="p-4 rounded-2xl bg-amber-100/60 border-2 border-amber-300 space-y-2">
                <h4 className="font-serif font-black text-sm text-amber-950 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-800" />
                  3. Seuil d'Alerte Personnalisé (Stock Bas) *
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={seuilAlerte}
                    onChange={(e) => setSeuilAlerte(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-amber-400 rounded-xl p-3 text-sm font-black text-[#1B4332]"
                  />
                  <span className="text-xs font-bold text-amber-950 shrink-0">unités en stock</span>
                </div>
              </div>

              {/* Variantes Boutique */}
              {etablissement?.type_activite === 'boutique' && (
                <div className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-2 text-xs">
                  <label className="font-bold text-[#1B4332] block">Déclinaisons Tailles & Couleurs</label>
                  <div>
                    <span className="text-gray-500 font-bold block mb-1">Tailles (séparées par virgules) :</span>
                    <input
                      type="text"
                      value={taillesInput}
                      onChange={(e) => setTaillesInput(e.target.value)}
                      className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-2 font-bold text-[#1B4332]"
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 font-bold block mb-1">Couleurs (séparées par virgules) :</span>
                    <input
                      type="text"
                      value={couleursInput}
                      onChange={(e) => setCouleursInput(e.target.value)}
                      className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-2 font-bold text-[#1B4332]"
                    />
                  </div>
                </div>
              )}

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
                  className="flex-1 py-3 px-4 rounded-xl bg-[#B8442C] text-white font-black text-xs shadow-md"
                >
                  Enregistrer le {term.itemLabel}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL ÉDITION COMPLÈTE DU PRODUIT (PRIX D'ACHAT, PRIX DE VENTE, STOCK, SEUIL) */}
        {editingProduit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleSaveEditProduct} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E2D5C3] pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#B8442C]">Modification de Fiche Produit</span>
                  <h3 className="font-serif font-black text-xl text-[#1B4332]">
                    {editingProduit.nom}
                  </h3>
                </div>
                <button type="button" onClick={() => setEditingProduit(null)} className="p-1 text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Produit *</label>
                  <input
                    type="text"
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Catégorie *</label>
                  <input
                    type="text"
                    value={editCategorie}
                    onChange={(e) => setEditCategorie(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                    required
                  />
                </div>
              </div>

              {/* MODIFICATION DE PRIX D'ACHAT ET DE VENTE */}
              <div className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-3">
                <span className="text-xs font-bold text-[#1B4332] block">💵 Modification des Prix & Marges :</span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Prix d'Achat CMP (FCFA) *</label>
                    <input
                      type="number"
                      min="0"
                      value={editPrixAchatUnit}
                      onChange={(e) => setEditPrixAchatUnit(Number(e.target.value))}
                      className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Prix de Vente (FCFA) *</label>
                    <input
                      type="number"
                      min="0"
                      value={editPrixVenteUnit}
                      onChange={(e) => setEditPrixVenteUnit(Number(e.target.value))}
                      className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                      required
                    />
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-950">Nouvelle Marge Calculée :</span>
                  <span className="font-serif font-black text-emerald-950">
                    +{editMargeUnit.toLocaleString('fr-FR')} FCFA ({editTauxMarge.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* MODIFICATION DE STOCK ET SEUIL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Stock Total Disponible *</label>
                  <input
                    type="number"
                    min="0"
                    value={editStockTotal}
                    onChange={(e) => setEditStockTotal(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Seuil d'Alerte Stock Bas *</label>
                  <input
                    type="number"
                    min="1"
                    value={editSeuilAlerte}
                    onChange={(e) => setEditSeuilAlerte(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                    required
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
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] text-white font-black text-xs shadow-md"
                >
                  Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
