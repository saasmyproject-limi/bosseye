'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  ShoppingBag,
  Beer,
  Utensils,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Search,
  CreditCard,
  UserCheck,
  Receipt,
  QrCode,
  Tag,
  Split,
  MessageSquare
} from 'lucide-react';
import { offlineDB, getTerminology } from '@/lib/offlineDB';
import { Produit, VarianteProduit, Etablissement, Utilisateur, Client, Facture, LigneTransaction } from '@/types';

export default function VentesPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Boutique Cart / Direct Sale State
  const [cart, setCart] = useState<Array<{
    produit: Produit;
    variante?: VarianteProduit;
    quantite: number;
    prix_unitaire: number;
  }>>([]);
  
  // Selected variant for modal picker
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Produit | null>(null);
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'orange_money' | 'mtn_momo' | 'credit'>('cash');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [lastCreatedFacture, setLastCreatedFacture] = useState<Facture | null>(null);

  // Bar Open Tables State
  const [tables, setTables] = useState<Array<{
    tableNumber: string;
    items: Array<{ produit: Produit; quantite: number }>;
    status: 'libre' | 'occupee';
  }>>([
    { tableNumber: 'Table 01', items: [], status: 'libre' },
    { tableNumber: 'Table 02', items: [], status: 'libre' },
    { tableNumber: 'Table 03 (VIP)', items: [], status: 'libre' },
    { tableNumber: 'Table 04 (Terrasse)', items: [], status: 'libre' },
  ]);
  const [activeTableNumber, setActiveTableNumber] = useState<string>('Table 01');
  const [splitCount, setSplitCount] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setCurrentUser(offlineDB.getCurrentUser());
      setProduits(offlineDB.getProduits());
      setClients(offlineDB.getClients());
    } catch (e) { console.error(e); }
  };

  const term = getTerminology(etablissement?.type_activite);

  // Filter products by search query (Name, Category, SKU)
  const filteredProduits = produits.filter((p) => {
    if (!p) return false;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const matchName = p.nom.toLowerCase().includes(query);
    const matchCat = p.categorie.toLowerCase().includes(query);
    const matchSku = (p.variantes || []).some((v) => (v.sku_code || '').toLowerCase().includes(query));
    return matchName || matchCat || matchSku;
  });

  // --- BOUTIQUE CART ACTIONS ---
  const handleAddProductToCart = (prod: Produit, variante?: VarianteProduit) => {
    if (prod.variantes && prod.variantes.length > 0 && !variante) {
      setSelectedProductForVariant(prod);
      return;
    }

    const price = variante?.prix_vente_override || prod.prix_vente_unitaire || prod.prix_vente_bouteille || 0;
    
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.produit.id === prod.id && item.variante?.id === variante?.id
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantite += 1;
        return updated;
      } else {
        return [...prev, { produit: prod, variante, quantite: 1, prix_unitaire: price }];
      }
    });

    if (selectedProductForVariant) {
      setSelectedProductForVariant(null);
    }
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantite + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantite = newQty;
      return updated;
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0);

  // --- CHECKOUT & FACTURE GENERATION ---
  const handleFinalizeSale = () => {
    if (cart.length === 0) return;

    const lignes = cart.map((item) => {
      let detail = '';
      if (item.variante) {
        const t = item.variante.taille ? `Taille ${item.variante.taille}` : '';
        const c = item.variante.couleur ? `${item.variante.couleur}` : '';
        detail = [t, c].filter(Boolean).join(' / ');
      }

      return {
        produit_id: item.produit.id,
        variante_id: item.variante?.id,
        nom_produit: item.produit.nom,
        detail_variante: detail,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
      };
    });

    const newFac = offlineDB.createFacture({
      lignes,
      mode_paiement: paymentMode,
      client_id: paymentMode === 'credit' ? selectedClientId : undefined,
    });

    setLastCreatedFacture(newFac);
    setCart([]);
    setIsPaymentModalOpen(false);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        {/* Top Activity Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">
                {etablissement?.type_activite === 'boutique' ? '👗' : etablissement?.type_activite === 'bar' ? '🍺' : '🍟'}
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
                Mode {etablissement?.type_activite === 'boutique' ? 'Boutique (Vente Directe)' : etablissement?.type_activite === 'bar' ? 'Bar & Lounge (Tables)' : 'Snack-Bar (Caisse)'}
              </span>
            </div>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332]">
              {term.salesScreenTitle}
            </h1>
            <p className="text-xs text-[#1B4332]/70 font-medium">
              {term.salesScreenDesc}
            </p>
          </div>
        </div>

        {/* --- SECTEUR 1: BOUTIQUE (VENTE COMPTOIR DIRECTE AVEC VARIANTES) --- */}
        {etablissement?.type_activite === 'boutique' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Colonne Gauche: Catalogue Produits & Variantes (8 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Barre de Recherche / Scanneur Code-barres */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher vêtement, taille, couleur ou SKU code-barres..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-[#1B4332] placeholder-gray-400 focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              {/* Grille des Articles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[650px] overflow-y-auto pr-1">
                {filteredProduits.map((p) => {
                  const hasVariants = p.variantes && p.variantes.length > 0;
                  const price = p.prix_vente_unitaire || p.prix_vente_bouteille || 0;
                  const stockTotal = p.quantite_totale || (p.casiers_pleins || 0) * 24 + (p.bouteilles_vrac || 0);

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAddProductToCart(p)}
                      className="bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl p-4 hover:border-[#1B4332] transition-all cursor-pointer shadow-sm hover:shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-black uppercase text-[#B8442C] bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                            {p.categorie}
                          </span>
                          <span className={`text-[10px] font-bold ${stockTotal <= p.seuil_alerte ? 'text-red-600' : 'text-gray-500'}`}>
                            Stock: {stockTotal} {term.unitSingular}s
                          </span>
                        </div>
                        <h3 className="font-serif font-black text-base text-[#1B4332]">{p.nom}</h3>

                        {/* badges variantes */}
                        {hasVariants && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.variantes?.map((v) => (
                              <span
                                key={v.id}
                                className="text-[10px] font-bold bg-[#FBF7EF] border border-[#E2D5C3] px-2 py-0.5 rounded-md text-[#1B4332]"
                              >
                                {v.taille} • {v.couleur} ({v.quantite_stock})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#E2D5C3]">
                        <span className="font-serif font-black text-base text-[#1B4332]">
                          {price.toLocaleString('fr-FR')} FCFA
                        </span>
                        <button className="px-3 py-1.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#2D6A4F]">
                          <Plus className="w-3.5 h-3.5" />
                          <span>{hasVariants ? 'Choisir Taille' : 'Ajouter'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Colonne Droite: Panier Comptoir & Encaissement Direct (5 Cols) */}
            <div className="lg:col-span-5 bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E2D5C3]">
                  <h2 className="font-serif font-black text-lg text-[#1B4332] flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#B8442C]" />
                    Panier Vente Comptoir
                  </h2>
                  <span className="text-xs font-bold text-gray-500">{cart.length} article(s)</span>
                </div>

                {cart.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <ShoppingBag className="w-12 h-12 mx-auto opacity-30 text-[#1B4332]" />
                    <p className="text-xs font-bold">Cliquez sur un article pour l'ajouter au panier</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 mt-4 max-h-[380px] overflow-y-auto pr-1">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className="bg-[#FBF7EF] p-3 rounded-2xl border border-[#E2D5C3] flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 truncate">
                          <h4 className="font-bold text-xs text-[#1B4332] truncate">{item.produit.nom}</h4>
                          {item.variante && (
                            <span className="text-[10px] font-bold text-[#B8442C]">
                              Taille: {item.variante.taille} | Couleur: {item.variante.couleur}
                            </span>
                          )}
                          <p className="text-[11px] font-black text-[#1B4332]/80 mt-0.5">
                            {item.prix_unitaire.toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#F3ECE0] p-1 rounded-xl border border-[#E2D5C3]">
                          <button
                            onClick={() => handleUpdateQuantity(index, -1)}
                            className="p-1 rounded-lg bg-[#FBF7EF] text-[#1B4332] hover:bg-gray-200"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-black text-xs px-2">{item.quantite}</span>
                          <button
                            onClick={() => handleUpdateQuantity(index, 1)}
                            className="p-1 rounded-lg bg-[#FBF7EF] text-[#1B4332] hover:bg-gray-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total & Action d'Encaissement */}
              <div className="pt-4 border-t border-[#E2D5C3] space-y-3">
                <div className="flex items-center justify-between text-base">
                  <span className="font-bold text-[#1B4332]">Total à encaisser :</span>
                  <span className="font-serif font-black text-2xl text-[#1B4332]">
                    {cartTotal.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <button
                  disabled={cart.length === 0}
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full py-4 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-sm flex items-center justify-center gap-2 shadow-glow-brique disabled:opacity-50 transition-transform active:scale-95"
                >
                  <Receipt className="w-5 h-5 text-white" />
                  <span>Encaisser et Éditer Facture</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- SECTEUR 2: BAR (GESTION DE TABLES OUVERTES & SPLIT D'ADDITION) --- */}
        {etablissement?.type_activite === 'bar' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {tables.map((t) => (
                <div
                  key={t.tableNumber}
                  onClick={() => setActiveTableNumber(t.tableNumber)}
                  className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                    activeTableNumber === t.tableNumber
                      ? 'bg-[#1B4332] border-[#1B4332] text-white shadow-md'
                      : 'bg-[#F3ECE0] border-[#E2D5C3] text-[#1B4332]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif font-black text-lg">{t.tableNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.items.length > 0 ? 'bg-[#E8A33D] text-[#0F291E]' : 'bg-gray-300 text-gray-700'}`}>
                      {t.items.length > 0 ? 'Occupée' : 'Libre'}
                    </span>
                  </div>
                  <p className="text-xs opacity-80">{t.items.length} consommation(s)</p>
                </div>
              ))}
            </div>

            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-md">
              <h3 className="font-serif font-black text-xl text-[#1B4332] mb-3 flex items-center gap-2">
                <Beer className="w-5 h-5 text-[#B8442C]" />
                Addition Ouverte : {activeTableNumber}
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                Sélectionnez les boissons servies sur cette table. L'addition s'accumule et peut être divisée (Split) au moment du départ.
              </p>

              {/* Option de Split addition */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] mb-4">
                <Split className="w-5 h-5 text-[#B8442C]" />
                <div>
                  <h4 className="font-bold text-xs text-[#1B4332]">Diviser l'addition (Split note)</h4>
                  <p className="text-[11px] text-gray-500">Nombre de personnes partageant l'addition :</p>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                    className="w-8 h-8 rounded-xl bg-[#F3ECE0] font-black"
                  >
                    -
                  </button>
                  <span className="font-black text-sm">{splitCount} pers.</span>
                  <button
                    onClick={() => setSplitCount(splitCount + 1)}
                    className="w-8 h-8 rounded-xl bg-[#F3ECE0] font-black"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL SELECTION VARIANTE PRODUIT --- */}
        {selectedProductForVariant && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
              <h3 className="font-serif font-black text-xl text-[#1B4332] mb-1">
                {selectedProductForVariant.nom}
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                Choisissez la taille et la couleur souhaitée par le client :
              </p>

              <div className="space-y-2 mb-6">
                {selectedProductForVariant.variantes?.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleAddProductToCart(selectedProductForVariant, v)}
                    className="p-3.5 rounded-2xl border-2 border-[#E2D5C3] bg-[#FBF7EF] hover:border-[#1B4332] cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-[#1B4332]">
                        Taille {v.taille} • Couleur {v.couleur}
                      </h4>
                      <span className="text-[11px] text-gray-500">SKU: {v.sku_code || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-[#1B4332]">
                        {(v.prix_vente_override || selectedProductForVariant.prix_vente_unitaire || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                      <p className="text-[10px] text-gray-500 font-bold">{v.quantite_stock} en stock</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedProductForVariant(null)}
                className="w-full py-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* --- MODAL DE PAIEMENT & ENCAISSEMENT --- */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                Encaissement Vente Directe
              </h3>

              <div className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between">
                <span className="font-bold text-xs text-[#1B4332]">Montant total :</span>
                <span className="font-serif font-black text-xl text-[#1B4332]">
                  {cartTotal.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-2">Mode de Règlement</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: 'cash', label: '💵 Cash Espèces' },
                    { mode: 'orange_money', label: '🟧 Orange Money' },
                    { mode: 'mtn_momo', label: '🟡 MTN MoMo' },
                    { mode: 'credit', label: '📝 Crédit Client' },
                  ].map((m) => (
                    <button
                      key={m.mode}
                      onClick={() => setPaymentMode(m.mode as any)}
                      className={`p-3 rounded-xl border font-bold text-xs transition-all ${
                        paymentMode === m.mode
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMode === 'credit' && (
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Sélectionner le Client à Crédit</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332]"
                  >
                    <option value="">-- Choisir un client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.telephone_whatsapp})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  onClick={handleFinalizeSale}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-md"
                >
                  Confirmer Encaissement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL CONFIRMATION FACTURE IMPRESSION --- */}
        {lastCreatedFacture && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                Vente Clôturée & Enregistrée !
              </h3>
              <p className="text-xs font-bold text-gray-600">
                Facture n° <strong className="text-[#1B4332]">{lastCreatedFacture.numero_facture}</strong> • Montant :{' '}
                <strong className="text-[#1B4332]">{lastCreatedFacture.montant_total.toLocaleString('fr-FR')} FCFA</strong>
              </p>

              <div className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-left text-xs space-y-1">
                {lastCreatedFacture.lignes?.map((l) => (
                  <div key={l.id} className="flex justify-between">
                    <span>
                      {l.quantite_bouteilles}x {l.nom_produit} {l.detail_variante ? `(${l.detail_variante})` : ''}
                    </span>
                    <span className="font-bold">{l.sous_total_vente.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setLastCreatedFacture(null)}
                className="w-full py-3 rounded-2xl bg-[#1B4332] text-white font-black text-xs shadow-md"
              >
                Nouvelle Vente
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
