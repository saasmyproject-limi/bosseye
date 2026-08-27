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
  MessageSquare,
  Truck,
  Package,
  Clock,
  Printer,
  ShieldAlert,
  Sparkles,
  Send,
  X
} from 'lucide-react';
import { offlineDB, getTerminology } from '@/lib/offlineDB';
import {
  Produit,
  VarianteProduit,
  Etablissement,
  Utilisateur,
  Client,
  Facture,
  CommandeEnLigne,
  Caisse,
  StatutLivraison,
} from '@/types';

export default function VentesPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commandesLigne, setCommandesLigne] = useState<CommandeEnLigne[]>([]);
  const [caisses, setCaisses] = useState<Caisse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Mode Onglet pour Boutique
  const [activeTab, setActiveTab] = useState<'comptoir' | 'livraisons'>('comptoir');

  // Panier Vente Comptoir (Feuille Facture Client Directe)
  const [cart, setCart] = useState<Array<{
    produit: Produit;
    variante?: VarianteProduit;
    quantite: number;
    prix_unitaire: number;
  }>>([]);

  // Variantes Modal Picker
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Produit | null>(null);

  // Modal Encaissement & Payment Mode
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'orange_money' | 'mtn_momo' | 'credit'>('cash');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [lastCreatedFacture, setLastCreatedFacture] = useState<Facture | null>(null);

  // --- MODAL CRÉATION COMMANDE LIVRAISON WHATSAPP ---
  const [isNewDeliveryModalOpen, setIsNewDeliveryModalOpen] = useState(false);
  const [newCmdClientNom, setNewCmdClientNom] = useState('');
  const [newCmdClientPhone, setNewCmdClientPhone] = useState('');
  const [newCmdAdresse, setNewCmdAdresse] = useState('');
  const [newCmdCart, setNewCmdCart] = useState<Array<{
    produit: Produit;
    variante?: VarianteProduit;
    quantite: number;
    prix_unitaire: number;
  }>>([]);

  // --- GESTION DES TABLES BAR & SNACK ---
  const [tablesState, setTablesState] = useState<Record<string, Array<{
    produit: Produit;
    quantite: number;
    prix_unitaire: number;
  }>>>({
    'Table 01': [
      {
        produit: { id: 'prod-beaufort', nom: 'Beaufort Lager 65cl', categorie: 'Bière', unite: 'bouteille', quantite_totale: 100, seuil_alerte: 10, prix_vente_bouteille: 650, cout_achat_unitaire_cmp: 271, etablissement_id: '', actif: true },
        quantite: 3,
        prix_unitaire: 650,
      },
    ],
    'Table 02': [],
    'Table 03': [],
    'Carré VIP 1': [],
    'Carré VIP 2': [],
  });

  const [activeTableNumber, setActiveTableNumber] = useState<string>('Table 01');
  const [splitCount, setSplitCount] = useState<number>(1);
  const [selectedCaisseId, setSelectedCaisseId] = useState<string>('');

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
      setCommandesLigne(offlineDB.getCommandesEnLigne());
      const caissesList = offlineDB.getCaisses();
      setCaisses(caissesList);
      if (caissesList.length > 0) setSelectedCaisseId(caissesList[0].id);
    } catch (e) { console.error(e); }
  };

  const term = getTerminology(etablissement?.type_activite);

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

  const handleUpdateCartQuantity = (index: number, delta: number) => {
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

  // --- NOUVELLE COMMANDE LIVRAISON WHATSAPP ---
  const handleAddProductToDeliveryCart = (prod: Produit, variante?: VarianteProduit) => {
    const price = variante?.prix_vente_override || prod.prix_vente_unitaire || 0;
    setNewCmdCart((prev) => {
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
  };

  const handleCreateDeliveryOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmdClientNom.trim() || !newCmdAdresse.trim() || newCmdCart.length === 0) return;

    const total = newCmdCart.reduce((acc, i) => acc + i.quantite * i.prix_unitaire, 0);

    offlineDB.addCommandeEnLigne({
      client_nom: newCmdClientNom.trim(),
      client_telephone: newCmdClientPhone.trim() || '237600000000',
      adresse_livraison: newCmdAdresse.trim(),
      statut: 'en_attente',
      montant_total: total,
      lignes: newCmdCart.map((item) => {
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
      }),
    });

    setIsNewDeliveryModalOpen(false);
    setNewCmdClientNom('');
    setNewCmdClientPhone('');
    setNewCmdAdresse('');
    setNewCmdCart([]);
    loadData();
  };

  // --- BAR/SNACK TABLE ACTIONS ---
  const handleAddDrinkToTable = (prod: Produit) => {
    const price = prod.prix_vente_bouteille || prod.prix_vente_unitaire || 0;

    setTablesState((prev) => {
      const currentItems = prev[activeTableNumber] || [];
      const existingIndex = currentItems.findIndex((item) => item.produit.id === prod.id);

      let updatedItems;
      if (existingIndex >= 0) {
        updatedItems = [...currentItems];
        updatedItems[existingIndex].quantite += 1;
      } else {
        updatedItems = [...currentItems, { produit: prod, quantite: 1, prix_unitaire: price }];
      }

      return {
        ...prev,
        [activeTableNumber]: updatedItems,
      };
    });
  };

  const handleUpdateTableItemQuantity = (tableNum: string, index: number, delta: number) => {
    setTablesState((prev) => {
      const currentItems = prev[tableNum] || [];
      const updated = [...currentItems];
      const newQty = updated[index].quantite + delta;
      if (newQty <= 0) {
        return { ...prev, [tableNum]: updated.filter((_, i) => i !== index) };
      }
      updated[index].quantite = newQty;
      return { ...prev, [tableNum]: updated };
    });
  };

  const currentTableItems = tablesState[activeTableNumber] || [];
  const currentTableTotal = currentTableItems.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0);

  const cartTotal = cart.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0);

  // --- FINALISER VENTE / ENCAISSER TABLE OU COMPTOIR ---
  const handleFinalizeSale = () => {
    const isBarOrSnack = etablissement?.type_activite !== 'boutique';
    const itemsToProcess = isBarOrSnack ? currentTableItems : cart;

    if (itemsToProcess.length === 0) return;

    const lignes = itemsToProcess.map((item: any) => {
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
      transaction_id: isBarOrSnack ? activeTableNumber : 'COMPTOIR',
      caissiere_id: currentUser?.id,
    });

    setLastCreatedFacture(newFac);

    if (isBarOrSnack) {
      setTablesState((prev) => ({ ...prev, [activeTableNumber]: [] }));
    } else {
      setCart([]);
    }

    setIsPaymentModalOpen(false);
    loadData();
  };

  const handleUpdateStatutLivraison = (cmdId: string, nextStatut: StatutLivraison) => {
    offlineDB.updateStatutCommandeEnLigne(cmdId, nextStatut);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">
                {etablissement?.type_activite === 'boutique' ? '👗' : etablissement?.type_activite === 'bar' ? '🍺' : '🍟'}
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
                Mode {etablissement?.type_activite === 'boutique' ? 'Boutique Mode & Vêtements' : etablissement?.type_activite === 'bar' ? 'Bar & Lounge (Tables)' : 'Snack-Bar (Flux 2 Étapes & Caisses)'}
              </span>
            </div>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332]">
              {term.salesScreenTitle}
            </h1>
            <p className="text-xs text-[#1B4332]/70 font-medium">
              {term.salesScreenDesc}
            </p>
          </div>

          {etablissement?.type_activite === 'boutique' && (
            <div className="flex items-center gap-2 bg-[#F3ECE0] p-1.5 rounded-2xl border border-[#E2D5C3]">
              <button
                onClick={() => setActiveTab('comptoir')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'comptoir' ? 'bg-[#1B4332] text-white shadow-md' : 'text-[#1B4332] hover:bg-[#FBF7EF]'
                }`}
              >
                🏬 Vente Comptoir (Facture)
              </button>
              <button
                onClick={() => setActiveTab('livraisons')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'livraisons' ? 'bg-[#1B4332] text-white shadow-md' : 'text-[#1B4332] hover:bg-[#FBF7EF]'
                }`}
              >
                <Truck className="w-4 h-4 text-[#E8A33D]" />
                <span>Livraisons WhatsApp ({commandesLigne.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* --- SECTEUR 1: BOUTIQUE (VENTE COMPTOIR DIRECTE & LIVRAISONS WHATSAPP) --- */}
        {etablissement?.type_activite === 'boutique' && activeTab === 'comptoir' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Catalogue Produits & Variantes (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher vêtement, taille, couleur ou SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-[#1B4332] placeholder-gray-400 focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[620px] overflow-y-auto pr-1">
                {filteredProduits.map((p) => {
                  const hasVariants = p.variantes && p.variantes.length > 0;
                  const price = p.prix_vente_unitaire || p.prix_vente_bouteille || 0;
                  const stockTotal = p.quantite_totale || 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAddProductToCart(p)}
                      className="bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl p-4 hover:border-[#1B4332] transition-all cursor-pointer shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-black uppercase text-[#B8442C] bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                            {p.categorie}
                          </span>
                          <span className={`text-[10px] font-bold ${stockTotal <= p.seuil_alerte ? 'text-red-600 font-black' : 'text-gray-500'}`}>
                            Stock: {stockTotal} pièce(s)
                          </span>
                        </div>
                        <h3 className="font-serif font-black text-base text-[#1B4332]">{p.nom}</h3>

                        {/* CLIC DIRECT SUR LES PILULES TAILLE & COULEUR POUR AJOUT SUR FACTURE */}
                        {hasVariants && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {p.variantes?.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddProductToCart(p, v);
                                }}
                                className="text-[11px] font-bold bg-[#FBF7EF] hover:bg-[#1B4332] hover:text-white border border-[#E2D5C3] px-2.5 py-1 rounded-xl text-[#1B4332] transition-colors shadow-sm active:scale-95 flex items-center gap-1"
                              >
                                <span>{v.taille} • {v.couleur}</span>
                                <span className="font-black text-[10px] opacity-75">({v.quantite_stock}) +</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#E2D5C3]">
                        <span className="font-serif font-black text-base text-[#1B4332]">
                          {price.toLocaleString('fr-FR')} FCFA
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddProductToCart(p);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#2D6A4F] shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#E8A33D]" />
                          <span>{hasVariants ? 'Choisir Taille' : 'Cocher / Ajouter'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FEUILLE FACTURE TICKET CLIENT DIRECTE (5 Cols) */}
            <div className="lg:col-span-5 bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E2D5C3]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#B8442C]">Générateur de Facture</span>
                    <h2 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-[#B8442C]" />
                      Facture Ticket Client
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-gray-500">{cart.length} ligne(s)</span>
                </div>

                {cart.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <ShoppingBag className="w-12 h-12 mx-auto opacity-30 text-[#1B4332]" />
                    <p className="text-xs font-bold">Cliquez sur une taille/couleur à gauche pour cocher et créer la facture du client</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 mt-4 max-h-[380px] overflow-y-auto pr-1">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className="bg-[#FBF7EF] p-3 rounded-2xl border border-[#E2D5C3] flex items-center justify-between gap-2 shadow-sm"
                      >
                        <div className="flex-1 truncate">
                          <h4 className="font-bold text-xs text-[#1B4332] truncate">{item.produit.nom}</h4>
                          {item.variante && (
                            <span className="text-[10px] font-black text-[#B8442C]">
                              Taille: {item.variante.taille} | Couleur: {item.variante.couleur}
                            </span>
                          )}
                          <p className="text-[11px] font-black text-[#1B4332]/80 mt-0.5">
                            {item.prix_unitaire.toLocaleString('fr-FR')} FCFA / pièce
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#F3ECE0] p-1 rounded-xl border border-[#E2D5C3]">
                          <button
                            onClick={() => handleUpdateCartQuantity(index, -1)}
                            className="p-1 rounded-lg bg-[#FBF7EF] text-[#1B4332] hover:bg-gray-200"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-black text-xs px-2">{item.quantite}</span>
                          <button
                            onClick={() => handleUpdateCartQuantity(index, 1)}
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

              {/* Total & Action Encaissement */}
              <div className="pt-4 border-t border-[#E2D5C3] space-y-3">
                <div className="flex items-center justify-between text-base">
                  <span className="font-bold text-[#1B4332]">Total Facture Client :</span>
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
                  <span>Encaisser & Éditer Facture</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- SECTEUR 1 (SUITE): COMMANDES EN LIGNE & LIVRAISONS WHATSAPP (BOUTIQUE) --- */}
        {etablissement?.type_activite === 'boutique' && activeTab === 'livraisons' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#B8442C]" />
                Commandes à Livrer (depuis WhatsApp & Réseaux)
              </h2>

              <button
                onClick={() => setIsNewDeliveryModalOpen(true)}
                className="py-3 px-5 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nouvelle Commande WhatsApp</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {commandesLigne.map((cmd) => (
                <div key={cmd.id} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#B8442C]">
                        {cmd.numero_commande}
                      </span>
                      <h3 className="font-serif font-black text-base text-[#1B4332]">{cmd.client_nom}</h3>
                      <p className="text-xs text-gray-600 font-bold">📱 {cmd.client_telephone}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      cmd.statut === 'livree_payee'
                        ? 'bg-emerald-100 text-emerald-800'
                        : cmd.statut === 'en_livraison'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-blue-100 text-blue-900'
                    }`}>
                      {cmd.statut === 'livree_payee' ? '✓ Livrée & Payée' : cmd.statut === 'en_livraison' ? '🚚 En cours de livraison' : '⏳ En attente de livraison'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-xs space-y-1">
                    <p className="text-gray-500 font-bold">📍 Adresse : {cmd.adresse_livraison}</p>
                    {cmd.lignes.map((l, i) => (
                      <div key={i} className="flex justify-between font-medium">
                        <span>{l.quantite}x {l.nom_produit} {l.detail_variante ? `(${l.detail_variante})` : ''}</span>
                        <span className="font-bold">{l.prix_unitaire.toLocaleString('fr-FR')} F</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2D5C3]">
                    <span className="font-serif font-black text-lg text-[#1B4332]">
                      Total: {cmd.montant_total.toLocaleString('fr-FR')} FCFA
                    </span>

                    {cmd.statut !== 'livree_payee' && (
                      <div className="flex items-center gap-2">
                        {cmd.statut === 'en_attente' && (
                          <button
                            onClick={() => handleUpdateStatutLivraison(cmd.id, 'en_livraison')}
                            className="px-3 py-1.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold"
                          >
                            Passer En Livraison
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateStatutLivraison(cmd.id, 'livree_payee')}
                          className="px-3 py-1.5 rounded-xl bg-[#B8442C] text-white text-xs font-bold"
                        >
                          Valider Livrée & Payée (Auto-Déstockage)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SECTEUR 2: BAR & SNACK (GESTION INTERACTIVE DES TABLES ET BOISSONS) --- */}
        {etablissement?.type_activite !== 'boutique' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Colonne Gauche: Tables & Catalogue de Boissons (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <h3 className="font-serif font-black text-base text-[#1B4332] mb-2.5">
                  1. Cliquez sur une Table pour ouvrir sa Commande :
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.keys(tablesState).map((tNum) => {
                    const tItems = tablesState[tNum] || [];
                    const isSelected = activeTableNumber === tNum;
                    const isVip = tNum.includes('VIP');
                    const tTotal = tItems.reduce((acc, i) => acc + i.quantite * i.prix_unitaire, 0);

                    return (
                      <div
                        key={tNum}
                        onClick={() => setActiveTableNumber(tNum)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#1B4332] border-[#1B4332] text-white shadow-md'
                            : 'bg-[#F3ECE0] border-[#E2D5C3] text-[#1B4332] hover:border-[#1B4332]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif font-black text-base">{tNum}</span>
                          {isVip && (
                            <span className="text-[9px] font-black uppercase bg-[#E8A33D] text-[#0F291E] px-2 py-0.5 rounded-full">
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold opacity-80">
                          {tItems.length > 0 ? `${tTotal.toLocaleString('fr-FR')} F (${tItems.length} article)` : 'Table Libre'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-black text-base text-[#1B4332]">
                    2. Ajoutez des Boissons sur {activeTableNumber} :
                  </h3>
                  <span className="text-xs font-bold text-gray-500">Cliquez pour ajouter +1</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {filteredProduits.map((p) => {
                    const price = p.prix_vente_bouteille || p.prix_vente_unitaire || 0;

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleAddDrinkToTable(p)}
                        className="bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl p-3.5 hover:border-[#1B4332] cursor-pointer transition-all shadow-sm flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="text-[9px] font-black uppercase text-[#B8442C] bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                            {p.categorie}
                          </span>
                          <h4 className="font-serif font-black text-sm text-[#1B4332] mt-1">{p.nom}</h4>
                          <span className="font-serif font-black text-xs text-[#1B4332]/80">
                            {price.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>

                        <button className="w-8 h-8 rounded-xl bg-[#1B4332] text-white flex items-center justify-center hover:bg-[#2D6A4F]">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Ticket Facture Client de la Table Active (5 Cols) */}
            <div className="lg:col-span-5 bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E2D5C3]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#B8442C]">Addition Ouverte</span>
                    <h2 className="font-serif font-black text-xl text-[#1B4332]">{activeTableNumber}</h2>
                  </div>
                  <span className="text-xs font-bold text-gray-500">{currentTableItems.length} conso(s)</span>
                </div>

                {currentTableItems.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Beer className="w-12 h-12 mx-auto opacity-30 text-[#1B4332]" />
                    <p className="text-xs font-bold">Cliquez sur une boisson à gauche pour l'ajouter à l'addition de {activeTableNumber}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 mt-4 max-h-[320px] overflow-y-auto pr-1">
                    {currentTableItems.map((item, index) => (
                      <div
                        key={index}
                        className="bg-[#FBF7EF] p-3 rounded-2xl border border-[#E2D5C3] flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 truncate">
                          <h4 className="font-bold text-xs text-[#1B4332] truncate">{item.produit.nom}</h4>
                          <p className="text-[11px] font-black text-[#1B4332]/80 mt-0.5">
                            {item.prix_unitaire.toLocaleString('fr-FR')} FCFA / bout.
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#F3ECE0] p-1 rounded-xl border border-[#E2D5C3]">
                          <button
                            onClick={() => handleUpdateTableItemQuantity(activeTableNumber, index, -1)}
                            className="p-1 rounded-lg bg-[#FBF7EF] text-[#1B4332] hover:bg-gray-200"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-black text-xs px-2">{item.quantite}</span>
                          <button
                            onClick={() => handleUpdateTableItemQuantity(activeTableNumber, index, 1)}
                            className="p-1 rounded-lg bg-[#FBF7EF] text-[#1B4332] hover:bg-gray-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentTableItems.length > 0 && (
                  <div className="mt-3 p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Split className="w-4 h-4 text-[#B8442C]" />
                      <span className="font-bold text-[#1B4332]">Split (Partage note) :</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                        className="w-6 h-6 rounded-lg bg-[#F3ECE0] font-black text-xs"
                      >
                        -
                      </button>
                      <span className="font-black">{splitCount} pers.</span>
                      <button
                        onClick={() => setSplitCount(splitCount + 1)}
                        className="w-6 h-6 rounded-lg bg-[#F3ECE0] font-black text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#E2D5C3] space-y-3">
                <div className="flex items-center justify-between text-base">
                  <span className="font-bold text-[#1B4332]">Total {activeTableNumber} :</span>
                  <div className="text-right">
                    <span className="font-serif font-black text-2xl text-[#1B4332]">
                      {currentTableTotal.toLocaleString('fr-FR')} FCFA
                    </span>
                    {splitCount > 1 && (
                      <p className="text-[10px] text-[#B8442C] font-bold">
                        Soit {Math.round(currentTableTotal / splitCount).toLocaleString('fr-FR')} FCFA / personne
                      </p>
                    )}
                  </div>
                </div>

                <button
                  disabled={currentTableItems.length === 0}
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full py-4 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-sm flex items-center justify-center gap-2 shadow-glow-brique disabled:opacity-50 transition-transform active:scale-95"
                >
                  <Receipt className="w-5 h-5 text-white" />
                  <span>Encaisser & Clôturer {activeTableNumber}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL POPUP SELECTION VARIANTE PRODUIT --- */}
        {selectedProductForVariant && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2D5C3] pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#B8442C]">Sélection de Taille / Couleur</span>
                  <h3 className="font-serif font-black text-xl text-[#1B4332]">
                    {selectedProductForVariant.nom}
                  </h3>
                </div>
                <button onClick={() => setSelectedProductForVariant(null)} className="p-1 text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-600 font-bold">
                Cliquez sur la déclinaison souhaitée par le client pour l'ajouter sur sa facture :
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {selectedProductForVariant.variantes?.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleAddProductToCart(selectedProductForVariant, v)}
                    className="p-3.5 rounded-2xl border-2 border-[#E2D5C3] bg-[#FBF7EF] hover:border-[#1B4332] hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-all shadow-sm"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-[#1B4332]">
                        Taille {v.taille} • Couleur {v.couleur}
                      </h4>
                      <span className="text-[11px] text-gray-500 font-bold">SKU: {v.sku_code || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-[#1B4332]">
                        {(v.prix_vente_override || selectedProductForVariant.prix_vente_unitaire || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                      <p className="text-[10px] text-emerald-800 font-black">{v.quantite_stock} en stock +</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedProductForVariant(null)}
                className="w-full py-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* --- MODAL CRÉATION COMMANDE WHATSAPP (BOUTIQUE) --- */}
        {isNewDeliveryModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleCreateDeliveryOrder} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#B8442C]" />
                  Nouvelle Commande à Livrer (WhatsApp)
                </h3>
                <button type="button" onClick={() => setIsNewDeliveryModalOpen(false)} className="p-1 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Client *</label>
                  <input
                    type="text"
                    placeholder="Ex: Mme CHANTAL VIP"
                    value={newCmdClientNom}
                    onChange={(e) => setNewCmdClientNom(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Téléphone WhatsApp *</label>
                  <input
                    type="tel"
                    placeholder="Ex: 699445566"
                    value={newCmdClientPhone}
                    onChange={(e) => setNewCmdClientPhone(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Adresse / Quartier de Livraison *</label>
                <input
                  type="text"
                  placeholder="Ex: Douala - Bonapriso (Face Clinique)"
                  value={newCmdAdresse}
                  onChange={(e) => setNewCmdAdresse(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                  required
                />
              </div>

              {/* Sélection des Articles à réserver */}
              <div className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-2">
                <label className="text-xs font-bold text-[#1B4332] block">Sélectionner les Articles Commandés :</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {produits.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProductToDeliveryCart(p)}
                      className="p-2 rounded-xl bg-[#F3ECE0] hover:bg-[#E2D5C3] cursor-pointer text-xs font-bold text-[#1B4332] flex justify-between items-center"
                    >
                      <span className="truncate">{p.nom}</span>
                      <span className="font-black text-[#B8442C]">{(p.prix_vente_unitaire || 0).toLocaleString('fr-FR')} F +</span>
                    </div>
                  ))}
                </div>

                {newCmdCart.length > 0 && (
                  <div className="pt-2 border-t border-[#E2D5C3] space-y-1">
                    <span className="text-[11px] font-bold text-gray-500">Articles réservés ({newCmdCart.length}) :</span>
                    {newCmdCart.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs font-bold">
                        <span>{item.quantite}x {item.produit.nom}</span>
                        <span>{(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewDeliveryModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={newCmdCart.length === 0}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#B8442C] text-white font-black text-xs shadow-md disabled:opacity-50"
                >
                  Enregistrer la Commande à Livrer
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- MODAL PAIEMENT & ENCAISSEMENT --- */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                Encaissement & Édition de Ticket
              </h3>

              <div className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between">
                <span className="font-bold text-xs text-[#1B4332]">Montant total à régler :</span>
                <span className="font-serif font-black text-xl text-[#1B4332]">
                  {(etablissement?.type_activite === 'boutique' ? cartTotal : currentTableTotal).toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-2">Moyen de Règlement</label>
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

        {/* --- MODAL CONFIRMATION TICKET THERMIQUE BLUETOOTH --- */}
        {lastCreatedFacture && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                Facture Clôturée & Enregistrée !
              </h3>
              <p className="text-xs font-bold text-gray-600">
                Facture n° <strong className="text-[#1B4332]">{lastCreatedFacture.numero_facture}</strong> • Total :{' '}
                <strong className="text-[#1B4332]">{lastCreatedFacture.montant_total.toLocaleString('fr-FR')} FCFA</strong>
              </p>

              <div className="p-4 rounded-2xl bg-white border border-[#E2D5C3] text-left text-xs font-mono space-y-1 shadow-inner">
                <div className="text-center font-bold pb-2 border-b border-gray-200">
                  <p className="text-sm font-sans font-black">{etablissement?.nom}</p>
                  <p className="text-[10px] text-gray-500 font-sans">{etablissement?.ville} - {etablissement?.adresse}</p>
                </div>
                {lastCreatedFacture.lignes?.map((l) => (
                  <div key={l.id} className="flex justify-between">
                    <span>{l.quantite_bouteilles}x {l.nom_produit} {l.detail_variante ? `(${l.detail_variante})` : ''}</span>
                    <span className="font-bold">{l.sous_total_vente.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3.5 rounded-2xl bg-[#1B4332] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4 text-[#E8A33D]" />
                  <span>Imprimer Ticket Bluetooth</span>
                </button>

                <button
                  onClick={() => setLastCreatedFacture(null)}
                  className="py-3.5 px-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
