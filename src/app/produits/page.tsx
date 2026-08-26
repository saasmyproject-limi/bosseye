'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Package, AlertTriangle, Plus, Search, Tag, Check, Layers } from 'lucide-react';
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
  const [casiers, setCasiers] = useState<number>(0);
  const [vrac, setVrac] = useState<number>(0);
  const [bouteillesParCasier, setBouteillesParCasier] = useState<12 | 24>(24);
  const [quantiteTotalePiece, setQuantiteTotalePiece] = useState<number>(10);
  const [seuilAlerte, setSeuilAlerte] = useState<number>(10);
  const [prixAchatCasier, setPrixAchatCasier] = useState<number>(6000);
  const [prixVenteBouteille, setPrixVenteBouteille] = useState<number>(600);
  const [prixAchatUnitaire, setPrixAchatUnitaire] = useState<number>(250);

  // Variantes pour Boutique (Taille / Couleur)
  const [taillesInput, setTaillesInput] = useState<string>('S, M, L, XL');
  const [couleursInput, setCouleursInput] = useState<string>('Noir, Blanc, Rouge');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setProduits(offlineDB.getProduits());
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
            quantite_stock: Math.floor(quantiteTotalePiece / (tList.length * cArray.length)) || 2,
          });
        });
      });
    }

    const qTot = isBoutique
      ? quantiteTotalePiece
      : casiers * bouteillesParCasier + vrac;

    const pAchatUnit = isBoutique ? prixAchatUnitaire : Math.round(prixAchatCasier / bouteillesParCasier);

    const newProd: Produit = {
      id: prodId,
      etablissement_id: etab.id,
      nom: nom.trim(),
      categorie: categorie.trim() || (isBoutique ? 'Articles' : 'Boissons'),
      unite: isBoutique ? 'piece' : 'bouteille',
      casiers_pleins: isBoutique ? 0 : casiers,
      bouteilles_vrac: isBoutique ? 0 : vrac,
      bouteilles_par_casier: bouteillesParCasier,
      quantite_totale: qTot,
      seuil_alerte: seuilAlerte,
      prix_achat_casier: prixAchatCasier,
      prix_vente_bouteille: prixVenteBouteille,
      prix_achat_unitaire: pAchatUnit,
      prix_vente_unitaire: prixVenteBouteille,
      cout_achat_unitaire_cmp: pAchatUnit,
      variantes: generatedVariantes,
      actif: true,
      created_at: new Date().toISOString(),
    };

    offlineDB.saveProduits([newProd, ...produits]);
    setNom('');
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              {term.stockLabel}
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Inventaire & Catalogues ({produits.length} {term.itemsLabel.toLowerCase()})
            </h1>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="py-3 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs flex items-center justify-center gap-2 shadow-glow-brique transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Ajouter un {term.itemLabel}</span>
          </button>
        </div>

        {/* Barre de Recherche et Filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={`Rechercher un ${term.itemLabel.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-[#1B4332] placeholder-gray-400 focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterCategory('tous')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                filterCategory === 'tous'
                  ? 'bg-[#1B4332] text-white shadow-sm'
                  : 'bg-[#F3ECE0] text-[#1B4332] border border-[#E2D5C3]'
              }`}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterCategory === cat
                    ? 'bg-[#1B4332] text-white shadow-sm'
                    : 'bg-[#F3ECE0] text-[#1B4332] border border-[#E2D5C3]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Liste / Grille des Produits */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProduits.map((p) => {
            const isBoutique = etablissement?.type_activite === 'boutique';
            const totalStock = p.quantite_totale || (p.casiers_pleins || 0) * (p.bouteilles_par_casier || 24) + (p.bouteilles_vrac || 0);
            const isLowStock = totalStock <= (p.seuil_alerte || 10);
            const priceVente = p.prix_vente_unitaire || p.prix_vente_bouteille || 0;
            const coutCmp = p.cout_achat_unitaire_cmp || p.prix_achat_unitaire || 0;
            const margeRatio = priceVente > 0 ? Math.round(((priceVente - coutCmp) / priceVente) * 100) : 0;

            return (
              <div
                key={p.id}
                className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full">
                      {p.categorie}
                    </span>
                    {isLowStock && (
                      <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Stock Bas !
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif font-black text-lg text-[#1B4332]">{p.nom}</h3>

                  {/* Variantes Boutique */}
                  {p.variantes && p.variantes.length > 0 && (
                    <div className="mt-3 p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-1.5">
                      <span className="text-[10px] font-black text-gray-500 uppercase block">
                        Déclinaisons ({p.variantes.length} variantes) :
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {p.variantes.map((v) => (
                          <span
                            key={v.id}
                            className="text-[10px] font-bold bg-[#F3ECE0] border border-[#E2D5C3] px-2 py-0.5 rounded-md text-[#1B4332]"
                          >
                            {v.taille} / {v.couleur} ({v.quantite_stock})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Détail Quantité Stock */}
                  <div className="mt-3 text-xs space-y-1 text-gray-700 font-medium">
                    {isBoutique ? (
                      <div className="flex justify-between">
                        <span>Quantité en stock :</span>
                        <strong className="text-[#1B4332] font-black text-sm">{totalStock} pièces</strong>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span>Casiers pleins :</span>
                        <strong className="text-[#1B4332]">{p.casiers_pleins || 0} casier(s) ({p.bouteilles_vrac || 0} vrac)</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2D5C3] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Prix de vente</span>
                    <strong className="font-serif text-base font-black text-[#1B4332]">
                      {priceVente.toLocaleString('fr-FR')} FCFA
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-800 block">Marge estimée</span>
                    <strong className="text-emerald-700 font-bold">+{margeRatio}%</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Création Produit / Article */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <h2 className="font-serif text-xl font-black text-[#1B4332] mb-1">
                Ajouter un {term.itemLabel}
              </h2>
              <p className="text-xs text-gray-600 mb-4">
                Définissez le nom, le prix et les variantes de votre produit.
              </p>

              <form onSubmit={handleCreateProduct} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du produit *</label>
                  <input
                    type="text"
                    placeholder="Ex: Robe de Soirée Soie / Beaufort 65cl"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Catégorie</label>
                  <input
                    type="text"
                    placeholder="Ex: Robe, Chemise, Bière..."
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                  />
                </div>

                {etablissement?.type_activite === 'boutique' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-[#1B4332] block mb-1">Prix Vente Unitaire (FCFA)</label>
                        <input
                          type="number"
                          value={prixVenteBouteille}
                          onChange={(e) => setPrixVenteBouteille(Number(e.target.value))}
                          className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#1B4332] block mb-1">Coût Achat Unitaire (FCFA)</label>
                        <input
                          type="number"
                          value={prixAchatUnitaire}
                          onChange={(e) => setPrixAchatUnitaire(Number(e.target.value))}
                          className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#1B4332] block mb-1">
                        Tailles disponibles (séparées par virgules)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: S, M, L, XL ou 40, 41, 42"
                        value={taillesInput}
                        onChange={(e) => setTaillesInput(e.target.value)}
                        className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#1B4332] block mb-1">
                        Couleurs disponibles (séparées par virgules)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Noir, Blanc, Rouge, Bleu"
                        value={couleursInput}
                        onChange={(e) => setCouleursInput(e.target.value)}
                        className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                      />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-[#1B4332] block mb-1">Prix Achat Casier (FCFA)</label>
                      <input
                        type="number"
                        value={prixAchatCasier}
                        onChange={(e) => setPrixAchatCasier(Number(e.target.value))}
                        className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#1B4332] block mb-1">Prix Vente Bouteille (FCFA)</label>
                      <input
                        type="number"
                        value={prixVenteBouteille}
                        onChange={(e) => setPrixVenteBouteille(Number(e.target.value))}
                        className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
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
                    className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
