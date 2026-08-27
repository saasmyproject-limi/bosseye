'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Package, AlertTriangle, Plus, Search, Tag, Check, Layers, Edit2, ShieldAlert } from 'lucide-react';
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
  const [prixVenteUnitaire, setPrixVenteUnitaire] = useState<number>(15000);

  // Variantes pour Boutique (Taille / Couleur)
  const [taillesInput, setTaillesInput] = useState<string>('S, M, L, XL');
  const [couleursInput, setCouleursInput] = useState<string>('Noir, Blanc, Rouge');

  // Modal d'Édition du Produit / Seuil d'Alerte
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null);
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
      } else {
        setUnite('bouteille');
        setCategorie('Bière');
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

    const pAchatUnit = isBoutique ? prixAchatUnitaire : Math.round(prixAchatCasier / bouteillesParCasier);
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

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduit) return;

    const updated = produits.map((p) => {
      if (p.id !== editingProduit.id) return p;
      return {
        ...p,
        seuil_alerte: editSeuilAlerte,
        quantite_totale: editStockTotal,
      };
    });

    offlineDB.saveProduits(updated);
    setEditingProduit(null);
    loadData();
  };

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
              Catalogue & Seuils d'Alerte Personnalisés
            </h1>
            <p className="text-xs text-[#1B4332]/70 font-medium">
              Définissez la quantité initiale et le seuil de stock bas (ex: alerter à 5 casiers ou 3 pièces).
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
            const price = p.prix_vente_unitaire || p.prix_vente_bouteille || 0;

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

                  <div className="mt-3 p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-500">Quantité en Stock :</span>
                      <span className="font-black text-[#1B4332]">
                        {p.quantite_totale} {isBoutique || p.unite === 'piece' ? 'pièce(s)' : 'bouteille(s)'}
                        {!isBoutique && p.casiers_pleins !== undefined && ` (${p.casiers_pleins} casier(s))`}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-bold text-gray-500">Seuil d'Alerte Bas :</span>
                      <span className="font-bold text-[#B8442C]">{p.seuil_alerte || 5} unité(s)</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-bold text-gray-500">Prix de Vente :</span>
                      <span className="font-black text-[#1B4332]">{price.toLocaleString('fr-FR')} FCFA</span>
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
                    Achat: {(p.prix_achat_unitaire || 0).toLocaleString('fr-FR')} F
                  </span>

                  <button
                    onClick={() => {
                      setEditingProduit(p);
                      setEditSeuilAlerte(p.seuil_alerte || 5);
                      setEditStockTotal(p.quantite_totale || 10);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#2D6A4F]"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#E8A33D]" />
                    <span>Modifier Seuil</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL CRÉATION PRODUIT AVEC QUANTITÉ ET SEUIL DE STOCK BAS EXPLICITES */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateProduct}
              className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                Ajouter un {term.itemLabel}
              </h3>

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
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Prix de Vente Unitaire (FCFA) *</label>
                  <input
                    type="number"
                    value={etablissement?.type_activite === 'boutique' ? prixVenteUnitaire : prixVenteBouteille}
                    onChange={(e) =>
                      etablissement?.type_activite === 'boutique'
                        ? setPrixVenteUnitaire(Number(e.target.value))
                        : setPrixVenteBouteille(Number(e.target.value))
                    }
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                    required
                  />
                </div>
              </div>

              {/* SAISIE DE LA QUANTITÉ INITIALE EXPLICITE */}
              <div className="p-4 rounded-2xl bg-[#FBF7EF] border-2 border-[#1B4332]/20 space-y-3">
                <h4 className="font-serif font-black text-sm text-[#1B4332] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#B8442C]" />
                  1. Quantité Initiale en Stock *
                </h4>

                {etablissement?.type_activite === 'boutique' ? (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Nombre total de pièces en rayon *</label>
                    <input
                      type="number"
                      min="1"
                      value={quantiteTotalePiece}
                      onChange={(e) => setQuantiteTotalePiece(Number(e.target.value))}
                      className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-3 text-sm font-black text-[#1B4332]"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Nombre de Casiers pleins</label>
                      <input
                        type="number"
                        min="0"
                        value={casiers}
                        onChange={(e) => setCasiers(Number(e.target.value))}
                        className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-3 text-sm font-black text-[#1B4332]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Bouteilles vrac</label>
                      <input
                        type="number"
                        min="0"
                        value={vrac}
                        onChange={(e) => setVrac(Number(e.target.value))}
                        className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-3 text-sm font-black text-[#1B4332]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SEUIL D'ALERTE DE STOCK BAS PERSONNALISABLE */}
              <div className="p-4 rounded-2xl bg-amber-100/60 border-2 border-amber-300 space-y-2">
                <h4 className="font-serif font-black text-sm text-amber-950 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-800" />
                  2. Seuil d'Alerte Personnalisé (Stock Bas) *
                </h4>
                <p className="text-[11px] text-amber-900 font-medium">
                  Recevez une alerte de rupture dès que le stock descend en dessous de ce niveau :
                </p>
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

        {/* MODAL ÉDITION DU SEUIL D'ALERTE PRODUIT */}
        {editingProduit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleSaveEditProduct} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                Modifier le Seuil d'Alerte : {editingProduit.nom}
              </h3>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Seuil d'Alerte de Stock Bas (Unités) *</label>
                <input
                  type="number"
                  min="1"
                  value={editSeuilAlerte}
                  onChange={(e) => setEditSeuilAlerte(Number(e.target.value))}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-sm font-bold text-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Quantité Totale en Stock *</label>
                <input
                  type="number"
                  min="0"
                  value={editStockTotal}
                  onChange={(e) => setEditStockTotal(Number(e.target.value))}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-sm font-bold text-[#1B4332]"
                />
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
