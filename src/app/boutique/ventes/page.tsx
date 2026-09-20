'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Search,
  CreditCard,
  UserCheck,
  Receipt,
  Tag,
  MessageSquare,
  Truck,
  Package,
  Clock,
  Printer,
  Bookmark,
  Send,
  X,
  UserPlus,
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import {
  Produit,
  VarianteProduit,
  Etablissement,
  Utilisateur,
  Client,
  Facture,
  Reservation,
  CommandeEnLigne,
  StatutLivraison,
} from '@/types';
import { generateReceiptPDF } from '@/lib/pdfGenerator';
import { syncShopToCloud } from '@/lib/supabaseSync';

export interface CartItem {
  produit: Produit;
  variante?: VarianteProduit;
  quantite: number;
  prix_unitaire: number;
}

export default function BoutiqueVentesPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commandesLigne, setCommandesLigne] = useState<CommandeEnLigne[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Mode Onglet pour Boutique (Comptoir / Livraisons)
  const [activeTab, setActiveTab] = useState<'comptoir' | 'livraisons'>('comptoir');

  // Panier Vente Comptoir
  const [cart, setCart] = useState<CartItem[]>([]);

  // Variantes Modal Picker
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Produit | null>(null);

  // Modal Encaissement, Remise & Payment Mode
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'orange_money' | 'mtn_momo' | 'credit' | 'reservation'>('cash');
  const [remiseInput, setRemiseInput] = useState<number>(0);
  const [montantVerseInput, setMontantVerseInput] = useState<number>(0);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isNewClientMode, setIsNewClientMode] = useState<boolean>(false);
  const [newClientNom, setNewClientNom] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');

  // Modal Succès & Impression Reçu PDF
  const [successReceiptData, setSuccessReceiptData] = useState<{
    numeroTicket: string;
    clientNom?: string;
    clientPhone?: string;
    lignes: Array<{ nom: string; quantite: number; prix_unitaire: number; varianteInfo?: string }>;
    totalGeneral: number;
    remise: number;
    montantVerse: number;
    resteAPayer: number;
    typeVente: 'comptoir' | 'livraison' | 'reservation';
    dateStr: string;
  } | null>(null);

  // Modal Création Commande Livraison
  const [isNewDeliveryModalOpen, setIsNewDeliveryModalOpen] = useState(false);
  const [newCmdClientNom, setNewCmdClientNom] = useState('');
  const [newCmdClientPhone, setNewCmdClientPhone] = useState('');
  const [newCmdAdresse, setNewCmdAdresse] = useState('');
  const [newCmdDate, setNewCmdDate] = useState('');
  const [newCmdHeure, setNewCmdHeure] = useState('');
  const [newCmdNotes, setNewCmdNotes] = useState('');
  const [newCmdCart, setNewCmdCart] = useState<CartItem[]>([]);

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
    } catch (e) { console.error(e); }
  };

  const filteredProduits = produits.filter((p) => {
    if (!p) return false;
    const matchCat = p.categorie.toLowerCase().includes(searchQuery.toLowerCase());
    const matchNom = p.nom.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat || matchNom;
  });

  const handleAddToCart = (p: Produit, variante?: VarianteProduit) => {
    if (p.variantes && p.variantes.length > 0 && !variante) {
      setSelectedProductForVariant(p);
      return;
    }

    const itemPrice = p.prix_vente_unitaire || 0;
    const existingIndex = cart.findIndex(
      (item) => item.produit.id === p.id && item.variante?.id === variante?.id
    );

    if (existingIndex >= 0) {
      const copy = [...cart];
      copy[existingIndex].quantite += 1;
      setCart(copy);
    } else {
      setCart([...cart, { produit: p, variante, quantite: 1, prix_unitaire: itemPrice }]);
    }
  };

  const handleUpdateCartQty = (index: number, delta: number) => {
    const copy = [...cart];
    const newQty = copy[index].quantite + delta;
    if (newQty <= 0) {
      copy.splice(index, 1);
    } else {
      copy[index].quantite = newQty;
    }
    setCart(copy);
  };

  const cartSousTotal = cart.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0);
  const cartTotalFinal = Math.max(0, cartSousTotal - remiseInput);

  // Calcul automatique de la dette ou du reste
  const verseActuel = montantVerseInput || (paymentMode === 'cash' || paymentMode === 'orange_money' || paymentMode === 'mtn_momo' ? cartTotalFinal : 0);
  const calculDetteOuReste = Math.max(0, cartTotalFinal - verseActuel);

  const handleFinalizeEncaissement = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !etablissement) return;

    let targetClientId = selectedClientId;
    let clientName = clients.find((c) => c.id === selectedClientId)?.nom || '';
    let clientPhone = clients.find((c) => c.id === selectedClientId)?.telephone_whatsapp || '';

    if (isNewClientMode && newClientNom.trim()) {
      const newCl = offlineDB.addClient({
        nom: newClientNom.trim(),
        telephone_whatsapp: newClientPhone.trim(),
      });
      targetClientId = newCl.id;
      clientName = newCl.nom;
      clientPhone = newCl.telephone_whatsapp || '';
    }

    const ticketNo = `TK-${Date.now().toString().slice(-6)}`;
    const dateNowStr = new Date().toLocaleString('fr-FR');
    const montantVerse = verseActuel;
    const resteDette = calculDetteOuReste;

    if (paymentMode === 'reservation') {
      // 1. Mode Réservation avec Acompte
      offlineDB.createReservation({
        client_id: targetClientId || undefined,
        lignes: cart.map((item) => ({
          produit_id: item.produit.id,
          nom_produit: item.produit.nom,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          detail_variante: item.variante ? `${item.variante.taille} / ${item.variante.couleur}` : undefined,
        })),
        acompte_paye: montantVerse,
      });

      setSuccessReceiptData({
        numeroTicket: ticketNo,
        clientNom: clientName || 'Client Réservation',
        clientPhone,
        lignes: cart.map((i) => ({
          nom: i.produit.nom,
          quantite: i.quantite,
          prix_unitaire: i.prix_unitaire,
          varianteInfo: i.variante ? `${i.variante.taille}/${i.variante.couleur}` : undefined,
        })),
        totalGeneral: cartTotalFinal,
        remise: remiseInput,
        montantVerse,
        resteAPayer: resteDette,
        typeVente: 'reservation',
        dateStr: dateNowStr,
      });
    } else {
      // 2. Mode Vente Comptoir (Totalement Payée ou avec Dette enregistrée)
      const isPartielOuDette = paymentMode === 'credit' || resteDette > 0;

      offlineDB.createFacture({
        client_id: targetClientId || undefined,
        lignes: cart.map((item) => ({
          produit_id: item.produit.id,
          nom_produit: item.produit.nom,
          quantite_bouteilles: item.quantite,
          prix_unitaire: item.prix_unitaire,
          detail_variante: item.variante ? `${item.variante.taille} / ${item.variante.couleur}` : undefined,
        })),
        remise: remiseInput,
        mode_paiement: isPartielOuDette ? 'credit' : (paymentMode as any),
        montant_paye: montantVerse,
        transaction_id: ticketNo,
      });

      setSuccessReceiptData({
        numeroTicket: ticketNo,
        clientNom: clientName,
        clientPhone,
        lignes: cart.map((i) => ({
          nom: i.produit.nom,
          quantite: i.quantite,
          prix_unitaire: i.prix_unitaire,
          varianteInfo: i.variante ? `${i.variante.taille}/${i.variante.couleur}` : undefined,
        })),
        totalGeneral: cartTotalFinal,
        remise: remiseInput,
        montantVerse,
        resteAPayer: resteDette,
        typeVente: 'comptoir',
        dateStr: dateNowStr,
      });
    }

    // Synchronisation en arrière-plan
    syncShopToCloud(etablissement.id);

    setIsPaymentModalOpen(false);
    setCart([]);
    setRemiseInput(0);
    setMontantVerseInput(0);
    setIsNewClientMode(false);
    setNewClientNom('');
    setNewClientPhone('');
    loadData();
  };

  const handlePrintPDF = async () => {
    if (!successReceiptData || !etablissement) return;

    const doc = await generateReceiptPDF({
      etablissement,
      numeroTicket: successReceiptData.numeroTicket,
      client: successReceiptData.clientNom ? { nom: successReceiptData.clientNom, telephone: successReceiptData.clientPhone } : undefined,
      lignes: successReceiptData.lignes,
      totalGeneral: successReceiptData.totalGeneral,
      remise: successReceiptData.remise,
      montantVerse: successReceiptData.montantVerse,
      resteAPayer: successReceiptData.resteAPayer,
      typeVente: successReceiptData.typeVente,
      dateStr: successReceiptData.dateStr,
    });

    doc.save(`Ticket-${successReceiptData.numeroTicket}.pdf`);
  };

  const handleCreateDeliveryCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmdClientNom.trim()) return;

    const itemsToDeliver = newCmdCart.length > 0 ? newCmdCart : cart;
    if (itemsToDeliver.length === 0) return;

    const totalCmd = itemsToDeliver.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0);

    const fullAdresse = `${newCmdAdresse.trim()}${newCmdDate ? ` | Date: ${newCmdDate}` : ''}${newCmdHeure ? ` à ${newCmdHeure}` : ''}${newCmdNotes ? ` (${newCmdNotes})` : ''}`;

    offlineDB.addCommandeEnLigne({
      client_nom: newCmdClientNom.trim(),
      client_telephone: newCmdClientPhone.trim(),
      adresse_livraison: fullAdresse,
      lignes: itemsToDeliver.map((item) => ({
        produit_id: item.produit.id,
        variante_id: item.variante?.id,
        nom_produit: item.produit.nom,
        detail_variante: item.variante ? `${item.variante.taille} / ${item.variante.couleur}` : undefined,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
      })),
      montant_total: totalCmd,
      statut: 'en_attente_paiement',
    });

    if (etablissement) syncShopToCloud(etablissement.id);

    setIsNewDeliveryModalOpen(false);
    setNewCmdClientNom('');
    setNewCmdClientPhone('');
    setNewCmdAdresse('');
    setNewCmdDate('');
    setNewCmdHeure('');
    setNewCmdNotes('');
    setNewCmdCart([]);
    setCart([]);
    loadData();
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Onglets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              Caisse & Ventes Boutique
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Vente
            </h1>
          </div>

          {/* Selector Tabs Boutique */}
          <div className="flex items-center gap-2 bg-[#F3ECE0] p-1.5 rounded-2xl border border-[#E2D5C3]">
            <button
              onClick={() => setActiveTab('comptoir')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'comptoir' ? 'bg-[#1B4332] text-white shadow-sm' : 'text-gray-600 hover:text-black'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Vente Comptoir</span>
            </button>

            <button
              onClick={() => setActiveTab('livraisons')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'livraisons' ? 'bg-[#1B4332] text-white shadow-sm' : 'text-gray-600 hover:text-black'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Vente Livraison ({commandesLigne.filter((c) => c.statut !== 'livree_payee').length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: VENTE COMPTOIR BOUTIQUE */}
        {activeTab === 'comptoir' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Colonne Gauche: Catalogue Articles (8 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Rechercher un article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-9 pr-4 py-3 text-xs font-bold text-[#1B4332]"
                />
              </div>

              {/* Grid Cards Articles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredProduits.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="bg-white border border-[#E2D5C3] hover:border-[#B8442C] rounded-2xl p-3.5 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-2 group"
                  >
                    <div>
                      <span className="text-[9px] font-black text-[#B8442C] uppercase bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                        {p.categorie}
                      </span>
                      <h4 className="font-serif font-black text-sm text-[#1B4332] mt-1 line-clamp-2 group-hover:text-[#B8442C] transition-colors">
                        {p.nom}
                      </h4>
                      {p.variantes && p.variantes.length > 0 && (
                        <span className="text-[10px] text-purple-700 font-bold block mt-0.5">
                          {p.variantes.length} variante(s) (Tailles/Couleurs)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#F3ECE0]">
                      <span className="font-black text-xs text-[#1B4332]">
                        {(p.prix_vente_unitaire || 0).toLocaleString('fr-FR')} F
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {p.quantite_totale} pcs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Colonne Droite: Panier Vente Comptoir (4 cols) */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2D5C3]">
                  <h3 className="font-serif font-black text-lg text-[#1B4332] flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#B8442C]" />
                    Panier Vente
                  </h3>
                  {cart.length > 0 && (
                    <button onClick={() => setCart([])} className="text-xs font-bold text-red-600 hover:underline">
                      Vider
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="p-8 text-center bg-[#FBF7EF] rounded-2xl border border-dashed border-[#E2D5C3] text-gray-500 text-xs font-medium space-y-2">
                    <ShoppingBag className="w-8 h-8 text-gray-400 mx-auto" />
                    <p>Cliquez sur un article pour l'ajouter au panier de vente.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {cart.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between text-xs">
                        <div className="flex-1 truncate pr-2">
                          <p className="font-bold text-[#1B4332] truncate">{item.produit.nom}</p>
                          {item.variante && (
                            <p className="text-[10px] text-purple-700 font-bold">
                              {item.variante.taille} / {item.variante.couleur}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-500 font-medium">
                            {item.prix_unitaire.toLocaleString('fr-FR')} F/pc
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white border border-[#E2D5C3] rounded-xl p-1">
                            <button onClick={() => handleUpdateCartQty(idx, -1)} className="p-1 hover:bg-[#F3ECE0] rounded-lg text-gray-700">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-black px-1.5">{item.quantite}</span>
                            <button onClick={() => handleUpdateCartQty(idx, 1)} className="p-1 hover:bg-[#F3ECE0] rounded-lg text-gray-700">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-black text-[#1B4332] w-16 text-right">
                            {(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total & Encaissement */}
              <div className="pt-4 border-t border-[#E2D5C3] space-y-3">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>Total Panier :</span>
                  <span className="font-serif font-black text-xl text-[#1B4332]">
                    {cartSousTotal.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={cart.length === 0}
                    onClick={() => {
                      setNewCmdCart([...cart]);
                      setNewCmdClientNom('');
                      setNewCmdClientPhone('');
                      setNewCmdAdresse('');
                      setIsNewDeliveryModalOpen(true);
                    }}
                    className="py-3.5 px-3 rounded-2xl bg-[#1B4332] disabled:bg-gray-300 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Truck className="w-4 h-4 text-[#E8A33D]" />
                    <span>Créer Livraison</span>
                  </button>

                  <button
                    disabled={cart.length === 0}
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="py-3.5 px-3 rounded-2xl bg-[#B8442C] disabled:bg-gray-300 text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <CreditCard className="w-4 h-4 text-white" />
                    <span>Encaisser Vente ➔</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VENTE LIVRAISON BOUTIQUE */}
        {activeTab === 'livraisons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                <Truck className="w-6 h-6 text-[#B8442C]" />
                Commandes & Ventes en Livraison
              </h2>

              <button
                onClick={() => {
                  setNewCmdCart([]);
                  setIsNewDeliveryModalOpen(true);
                }}
                className="py-2.5 px-4 rounded-2xl bg-[#1B4332] text-white font-bold text-xs shadow flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Commande Livraison</span>
              </button>
            </div>

            {commandesLigne.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-[#E2D5C3] text-gray-500 text-xs font-medium space-y-2">
                <Truck className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="font-serif font-bold text-base text-[#1B4332]">Aucune commande en livraison</p>
                <p>Enregistrez les commandes d'expéditions reçues sur votre WhatsApp ou par téléphone.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {commandesLigne.map((cmd) => (
                  <div key={cmd.id} className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between pb-2 border-b border-[#E2D5C3]">
                      <div>
                        <h4 className="font-serif font-black text-base text-[#1B4332]">{cmd.client_nom || 'Client'}</h4>
                        <p className="text-xs text-gray-500 font-bold">📱 {cmd.client_telephone || 'Non indiqué'}</p>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          cmd.statut === 'livree_payee'
                            ? 'bg-emerald-100 text-emerald-900'
                            : cmd.statut === 'en_livraison'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {cmd.statut === 'en_attente_paiement'
                          ? '⏳ En Attente'
                          : cmd.statut === 'en_livraison'
                          ? '🚚 En Livraison'
                          : '🎉 Livrée & Payée'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-xs space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Paramètres Livraison :</span>
                      <p className="font-bold text-[#1B4332]">{cmd.adresse_livraison || 'Au comptoir'}</p>
                    </div>

                    <div className="space-y-1 text-xs">
                      {cmd.lignes.map((l, i) => (
                        <div key={i} className="flex justify-between font-bold text-[#1B4332]">
                          <span>{l.quantite}x {l.nom_produit}</span>
                          <span>{(l.quantite * l.prix_unitaire).toLocaleString('fr-FR')} F</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#E2D5C3] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-black text-sm text-[#1B4332]">
                          Total : {cmd.montant_total.toLocaleString('fr-FR')} F
                        </span>
                      </div>

                      {cmd.statut === 'en_attente_paiement' && (
                        <button
                          onClick={() => {
                            offlineDB.updateStatutCommandeEnLigne(cmd.id, 'en_livraison');
                            loadData();
                          }}
                          className="w-full py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Envoyer en Livraison ➔</span>
                        </button>
                      )}

                      {cmd.statut === 'en_livraison' && (
                        <button
                          onClick={() => {
                            offlineDB.updateStatutCommandeEnLigne(cmd.id, 'livree_payee');
                            loadData();
                          }}
                          className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marquer Livrée & Payée ➔</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL ENCAISSEMENT VENTE COMPTOIR */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleFinalizeEncaissement} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Encaissement Vente Comptoir</h3>
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Choix Client */}
              <div className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B4332]">Nom du Client (Recommandé pour Dette/Réservation)</span>
                  <button
                    type="button"
                    onClick={() => setIsNewClientMode(!isNewClientMode)}
                    className="text-[11px] font-bold text-[#B8442C] underline"
                  >
                    {isNewClientMode ? 'Sélectionner Client Existant' : '+ Nouveau Client'}
                  </button>
                </div>

                {isNewClientMode ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Nom du Client *"
                      value={newClientNom}
                      onChange={(e) => setNewClientNom(e.target.value)}
                      className="bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                    />
                    <input
                      type="text"
                      placeholder="N° WhatsApp"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className="bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                    />
                  </div>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  >
                    <option value="">Client Anonyme (Vente direct au comptoir)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.telephone_whatsapp || 'Sans tel'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Mode de Paiement / Option */}
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-2">Mode de Vente / Paiement</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: '💵 Espèces' },
                    { id: 'orange_money', label: '🟧 Orange Money' },
                    { id: 'mtn_momo', label: '🟡 MTN MoMo' },
                    { id: 'credit', label: '💳 Vente avec Dette' },
                    { id: 'reservation', label: '🔖 Réservation (Acompte)' },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => {
                        setPaymentMode(m.id as any);
                        if (m.id === 'cash' || m.id === 'orange_money' || m.id === 'mtn_momo') {
                          setMontantVerseInput(cartTotalFinal);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
                        paymentMode === m.id
                          ? 'bg-[#1B4332] text-white border-[#1B4332] shadow'
                          : 'bg-white text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remise & Saisie Montant Versé */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Remise Accordée (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={remiseInput}
                    onChange={(e) => setRemiseInput(Number(e.target.value))}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Montant Versé par le Client (FCFA) *</label>
                  <input
                    type="number"
                    min="0"
                    value={montantVerseInput}
                    onChange={(e) => setMontantVerseInput(Number(e.target.value))}
                    placeholder={`${cartTotalFinal}`}
                    className="w-full bg-white border-2 border-[#1B4332] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              {/* Recalcul Dette ou Reste */}
              {calculDetteOuReste > 0 && paymentMode !== 'reservation' && (
                <div className="p-3.5 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between">
                  <span>Dette restante à récupérer :</span>
                  <span className="text-sm font-black text-red-700">+{calculDetteOuReste.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}

              {paymentMode === 'reservation' && (
                <div className="p-3.5 rounded-2xl bg-purple-100 border border-purple-300 text-purple-900 text-xs font-bold space-y-1">
                  <p>🔖 Réservation d'articles activée</p>
                  <p className="text-[11px] font-normal opacity-90">Cette vente sera enregistrée dans le tableau des Réservations / Mise de côté.</p>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-[#1B4332] text-white flex justify-between items-center">
                <span className="text-xs font-bold">TOTAL À PAYER :</span>
                <span className="font-serif font-black text-2xl text-[#E8A33D]">
                  {cartTotalFinal.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-white border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-md"
                >
                  Valider & Générer le Reçu ➔
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL SUCCÈS VENTE & REÇU PDF */}
        {successReceiptData && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-2xl font-bold">
                ✅
              </div>
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                {successReceiptData.typeVente === 'reservation' ? 'Réservation Enregistrée !' : 'Vente Validée avec Succès !'}
              </h3>
              <p className="text-xs text-gray-600 font-bold">
                Ticket N° : <span className="font-mono text-[#1B4332]">{successReceiptData.numeroTicket}</span>
              </p>

              {successReceiptData.resteAPayer > 0 && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-2xl text-xs font-bold text-red-900">
                  Dette enregistrée : {successReceiptData.resteAPayer.toLocaleString('fr-FR')} FCFA dans l'onglet Dettes.
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={handlePrintPDF}
                  className="w-full py-3.5 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-[#E8A33D]" />
                  <span>Imprimer / Télécharger le Reçu PDF</span>
                </button>

                <button
                  onClick={() => setSuccessReceiptData(null)}
                  className="w-full py-2.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-700 font-bold text-xs"
                >
                  Fermer & Nouvelle Vente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PICKER VARIANTES BOUTIQUE */}
        {selectedProductForVariant && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-lg text-[#1B4332]">
                  Choisir la Variante : {selectedProductForVariant.nom}
                </h3>
                <button onClick={() => setSelectedProductForVariant(null)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedProductForVariant.variantes?.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      handleAddToCart(selectedProductForVariant, v);
                      setSelectedProductForVariant(null);
                    }}
                    className="w-full p-3 rounded-2xl bg-white border border-[#E2D5C3] hover:border-[#B8442C] flex items-center justify-between text-xs font-bold text-[#1B4332] transition-all"
                  >
                    <span>Taille : {v.taille} | Couleur : {v.couleur}</span>
                    <span className="text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full text-[11px]">
                      {v.quantite_stock} en stock
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL CRÉATION VENTE LIVRAISON */}
        {isNewDeliveryModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleCreateDeliveryCommand} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Nouvelle Commande Livraison</h3>
                <button type="button" onClick={() => setIsNewDeliveryModalOpen(false)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Client *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mme Marie"
                  value={newCmdClientNom}
                  onChange={(e) => setNewCmdClientNom(e.target.value)}
                  className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">N° WhatsApp Client *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: 699000000"
                  value={newCmdClientPhone}
                  onChange={(e) => setNewCmdClientPhone(e.target.value)}
                  className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Quartier & Adresse de Livraison *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Akwa, Douala derrière Total"
                  value={newCmdAdresse}
                  onChange={(e) => setNewCmdAdresse(e.target.value)}
                  className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Date de livraison</label>
                  <input
                    type="date"
                    value={newCmdDate}
                    onChange={(e) => setNewCmdDate(e.target.value)}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Heure de livraison</label>
                  <input
                    type="time"
                    value={newCmdHeure}
                    onChange={(e) => setNewCmdHeure(e.target.value)}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Notes & Instructions (Optionnel)</label>
                <input
                  type="text"
                  placeholder="ex: Livrer avant 14h, appeler avant d'arriver"
                  value={newCmdNotes}
                  onChange={(e) => setNewCmdNotes(e.target.value)}
                  className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewDeliveryModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-white border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] text-white font-black text-xs shadow-md"
                >
                  Créer la Commande de Livraison
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
