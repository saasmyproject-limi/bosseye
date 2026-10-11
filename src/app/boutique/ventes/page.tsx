'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import OkoBarcodeScannerModal from '@/components/OkoBarcodeScannerModal';
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
  FileText,
  Camera
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
import { recordSaleToCloud, fetchSalesFromCloud } from '@/lib/salesSyncService';
import { fetchArticlesFromCloud } from '@/lib/articlesSyncService';
import { saveReservationToCloud, saveCommandeEnLigneToCloud } from '@/lib/reservationsSyncService';

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
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

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
  const [clientValidationError, setClientValidationError] = useState<string>('');

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
  const [newCmdStatutPaiement, setNewCmdStatutPaiement] = useState<'a_la_livraison' | 'paye_avance' | 'credit'>('a_la_livraison');
  const [newCmdCart, setNewCmdCart] = useState<CartItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setCurrentUser(offlineDB.getCurrentUser());
      setClients(offlineDB.getClients());
      setCommandesLigne(offlineDB.getCommandesEnLigne());

      // 1. AFFICHAGE IMMÉDIAT CACHE-FIRST (< 50ms, même hors-ligne)
      const cachedProds = offlineDB.getProduits();
      setProduits(cachedProds);

      // 2. RAFRAÎCHISSEMENT DISCRET EN ARRIÈRE-PLAN SANS BLOQUER L'ÉCRAN
      if (etab?.id) {
        fetchArticlesFromCloud(etab.id)
          .then(({ produits: cloudProds }) => {
            if (cloudProds && cloudProds.length > 0) {
              setProduits(cloudProds);
            }
          })
          .catch((err) => {
            console.warn('[Ventes] Background sync articles warning:', err);
          });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProduits = produits.filter((p) => {
    if (!p) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchCat = p.categorie.toLowerCase().includes(q);
    const matchNom = p.nom.toLowerCase().includes(q);
    const matchOkoCode = (p.oko_code || '').toLowerCase().includes(q);
    const matchExemplaire = (p.exemplaires || []).some((ex) => (ex.identifiant_unique || '').toLowerCase().includes(q));
    const matchVariante = (p.variantes || []).some((v) => (v.oko_code || v.sku_code || '').toLowerCase().includes(q));
    return matchCat || matchNom || matchOkoCode || matchExemplaire || matchVariante;
  });

  const handleScanCodeResult = (code: string) => {
    const q = code.trim().toLowerCase();
    const found = produits.find((p) => {
      if ((p.oko_code || '').toLowerCase() === q) return true;
      if ((p.exemplaires || []).some((ex) => (ex.identifiant_unique || '').toLowerCase() === q)) return true;
      if ((p.variantes || []).some((v) => (v.oko_code || v.sku_code || '').toLowerCase() === q)) return true;
      if (p.nom.toLowerCase() === q) return true;
      return false;
    });

    if (found) {
      handleAddToCart(found);
      setSearchQuery('');
    } else {
      setSearchQuery(code);
    }
  };

  const handleAddToCart = (p: Produit, variante?: VarianteProduit) => {
    const selectedVar = variante || (p.variantes && p.variantes.length > 0 ? p.variantes[0] : undefined);
    const itemPrice = selectedVar?.prix_vente_override || p.prix_vente_unitaire || 0;
    const existingIndex = cart.findIndex(
      (item) => item.produit.id === p.id && item.variante?.id === selectedVar?.id
    );

    if (existingIndex >= 0) {
      const copy = [...cart];
      copy[existingIndex].quantite += 1;
      setCart(copy);
    } else {
      setCart([...cart, { produit: p, variante: selectedVar, quantite: 1, prix_unitaire: itemPrice }]);
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
  const verseActuel =
    paymentMode === 'reservation'
      ? montantVerseInput || 0
      : paymentMode === 'credit'
      ? montantVerseInput || 0
      : montantVerseInput !== 0
      ? montantVerseInput
      : paymentMode === 'cash' || paymentMode === 'orange_money' || paymentMode === 'mtn_momo'
      ? cartTotalFinal
      : 0;

  const calculDetteOuReste = Math.max(0, cartTotalFinal - verseActuel);

  const handleFinalizeEncaissement = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !etablissement) return;
    setClientValidationError('');

    let targetClientId = selectedClientId;
    let clientName = clients.find((c) => c.id === selectedClientId)?.nom || '';
    let clientPhone = clients.find((c) => c.id === selectedClientId)?.telephone_whatsapp || '';

    const isDetteOuCredit = (paymentMode === 'credit' || calculDetteOuReste > 0) && paymentMode !== 'reservation';

    // 1. CONTRÔLE STRICT POUR DETTE AU COMPTOIR : NOM ET NUMÉRO OBLIGATOIRES
    if (isDetteOuCredit) {
      if (isNewClientMode) {
        if (!newClientNom.trim()) {
          setClientValidationError('Le nom du client est obligatoire pour une vente avec dette ou solde restant dû.');
          return;
        }
        const cleanPhone = newClientPhone.replace(/[^0-9]/g, '');
        if (!cleanPhone || cleanPhone.length < 8) {
          setClientValidationError('Un numéro de téléphone / WhatsApp valide (au moins 8 chiffres) est obligatoire pour le suivi de la dette.');
          return;
        }
      } else {
        if (!selectedClientId) {
          setClientValidationError('Veuillez sélectionner ou créer un client avec son nom et son numéro pour enregistrer une vente avec dette.');
          return;
        }
        const selCl = clients.find((c) => c.id === selectedClientId);
        const cleanPhone = (selCl?.telephone_whatsapp || '').replace(/[^0-9]/g, '');
        if (!cleanPhone || cleanPhone.length < 8) {
          setClientValidationError(`Le client sélectionné (${selCl?.nom}) n'a pas de numéro de téléphone. Renseignez son numéro pour le suivi de la dette.`);
          return;
        }
      }
    }

    // 2. ENREGISTREMENT OU RÉUTILISATION CLIENT SANS CRÉATION DE DOUBLON
    if (isNewClientMode && newClientNom.trim()) {
      const cleanPhone = newClientPhone.replace(/[^0-9]/g, '');
      const existingClient = clients.find((c) => {
        const p = (c.telephone_whatsapp || '').replace(/[^0-9]/g, '');
        return p && cleanPhone && (p === cleanPhone || (cleanPhone.length >= 8 && p.endsWith(cleanPhone)) || (p.length >= 8 && cleanPhone.endsWith(p)));
      });

      if (existingClient) {
        targetClientId = existingClient.id;
        clientName = existingClient.nom;
        clientPhone = existingClient.telephone_whatsapp || newClientPhone.trim();
      } else {
        const newCl = offlineDB.addClient({
          nom: newClientNom.trim(),
          telephone_whatsapp: newClientPhone.trim(),
        });
        targetClientId = newCl.id;
        clientName = newCl.nom;
        clientPhone = newCl.telephone_whatsapp || '';
      }
    }

    const ticketNo = `TK-${Date.now().toString().slice(-6)}`;
    const dateNowStr = new Date().toLocaleString('fr-FR');
    const montantVerse = verseActuel;
    const resteDette = calculDetteOuReste;

    if (paymentMode === 'reservation') {
      // 3. MODE RÉSERVATION : TOUJOURS ENREGISTRÉ (MÊME AVEC 0 FCFA D'ACOMPTE)
      const montantAcompte = montantVerseInput || 0;
      const resteReservation = Math.max(0, cartTotalFinal - montantAcompte);

      const newRes = offlineDB.createReservation({
        client_id: targetClientId || undefined,
        lignes: cart.map((item) => ({
          produit_id: item.produit.id,
          nom_produit: item.produit.nom,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          detail_variante: item.variante ? `${item.variante.taille} / ${item.variante.couleur}` : undefined,
        })),
        acompte_paye: montantAcompte,
      });

      // Synchronisation sur le serveur
      if (etablissement?.id) {
        saveReservationToCloud({
          resId: newRes.id,
          activiteId: etablissement.id,
          clientNom: clientName || 'Client Réservation',
          clientTelephone: clientPhone,
          articleNom: cart.map((i) => `${i.quantite}x ${i.produit.nom}`).join(', '),
          quantite: cart.reduce((acc, i) => acc + i.quantite, 0),
          acomptePaye: montantAcompte,
          prixTotal: cartTotalFinal,
        });
      }

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
        montantVerse: montantAcompte,
        resteAPayer: resteReservation,
        typeVente: 'reservation',
        dateStr: dateNowStr,
      });
    } else {
      const isPartielOuDette = paymentMode === 'credit' || resteDette > 0;
      // Enregistrer la vente sur Supabase avec mouvements de stock et journal d'audit
      recordSaleToCloud({
        activiteId: etablissement.id,
        numeroFacture: ticketNo,
        clientId: targetClientId || undefined,
        clientNom: clientName,
        totalHt: cartSousTotal,
        montantRemise: remiseInput,
        totalTtc: cartTotalFinal,
        montantPaye: montantVerse,
        resteAPayer: resteDette,
        modePaiement: isPartielOuDette ? 'credit' : paymentMode,
        vendeurNom: currentUser?.nom || 'Employé',
        lignes: cart.map((item) => ({
          articleId: item.produit.id,
          articleNom: item.produit.nom,
          codeUnique: item.produit.oko_code,
          quantite: item.quantite,
          prixUnitaire: item.prix_unitaire,
          totalLigne: item.quantite * item.prix_unitaire,
        })),
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

    // Synchronisation en arrière-plan et rafraîchissement
    syncShopToCloud(etablissement.id);
    loadData();

    setIsPaymentModalOpen(false);
    setCart([]);
    setRemiseInput(0);
    setMontantVerseInput(0);
    setIsNewClientMode(false);
    setNewClientNom('');
    setNewClientPhone('');
    setClientValidationError('');
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
    if (!newCmdClientNom.trim()) {
      alert('Veuillez saisir le nom du destinataire de la livraison.');
      return;
    }
    const cleanPhone = newCmdClientPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      alert('Veuillez saisir un numéro de téléphone/WhatsApp valide (au moins 8 chiffres).');
      return;
    }
    if (!newCmdAdresse.trim()) {
      alert('Veuillez indiquer le lieu ou le quartier de livraison.');
      return;
    }

    const itemsToDeliver = newCmdCart.length > 0 ? newCmdCart : cart;
    if (itemsToDeliver.length === 0) {
      alert('Veuillez ajouter au moins un article à livrer.');
      return;
    }

    const totalCmd = itemsToDeliver.reduce((acc, item) => acc + item.quantite * item.prix_unitaire, 0);

    const paymentLabel =
      newCmdStatutPaiement === 'paye_avance'
        ? 'Payé d\'avance'
        : newCmdStatutPaiement === 'credit'
        ? 'Vente à Crédit / Dette'
        : 'À payer à la livraison';

    const fullAdresse = `${newCmdAdresse.trim()}${newCmdDate ? ` | Date: ${newCmdDate}` : ''}${newCmdHeure ? ` à ${newCmdHeure}` : ''}${newCmdNotes ? ` (${newCmdNotes})` : ''} | Paiement: ${paymentLabel}`;

    // Déstockage immédiat pour bloquer les articles en livraison
    const user = offlineDB.getCurrentUser();
    itemsToDeliver.forEach((item) => {
      offlineDB.addMouvementStock({
        produit_id: item.produit.id,
        variante_id: item.variante?.id,
        type_mouvement: 'sortie',
        quantite_bouteilles: item.quantite,
        utilisateur_id: user?.id || 'u-vendeur',
        note_motif: `Commande Livraison pour ${newCmdClientNom.trim()}`,
      });
    });

    const newCmd = offlineDB.addCommandeEnLigne({
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
    saveCommandeEnLigneToCloud(newCmd);

    // Incrémentation immédiate et synchrone du compteur de l'onglet Livraisons
    const allUpdatedCmds = offlineDB.getCommandesEnLigne();
    setCommandesLigne(allUpdatedCmds);

    setIsNewDeliveryModalOpen(false);
    setNewCmdClientNom('');
    setNewCmdClientPhone('');
    setNewCmdAdresse('');
    setNewCmdDate('');
    setNewCmdHeure('');
    setNewCmdNotes('');
    setNewCmdStatutPaiement('a_la_livraison');
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
              <span>À LIVRER ({commandesLigne.filter((c) => c.statut !== 'livree_payee').length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: VENTE COMPTOIR BOUTIQUE */}
        {activeTab === 'comptoir' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Colonne Gauche: Catalogue Articles (8 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    placeholder="Rechercher par Nom, Catégorie ou Code OKO-XXXXXX..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-9 pr-4 py-3 text-xs font-bold text-[#1B4332]"
                  />
                </div>
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
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-[9px] font-black text-[#B8442C] uppercase bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                          {p.categorie}
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-[#1B4332]/10 text-[#1B4332] px-1.5 py-0.5 rounded-full">
                          🏷️ {p.oko_code || `OKO-000${p.id.slice(-4)}`}
                        </span>
                      </div>
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

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[#1B4332] block">Choisissez le type d'opération :</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      disabled={cart.length === 0}
                      onClick={() => {
                        setPaymentMode('cash');
                        setMontantVerseInput(cartTotalFinal);
                        setIsPaymentModalOpen(true);
                      }}
                      className="py-3 px-2 rounded-2xl bg-[#B8442C] disabled:bg-gray-300 text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-white" />
                      <span>Payé Comptant</span>
                    </button>

                    <button
                      disabled={cart.length === 0}
                      onClick={() => {
                        setNewCmdCart([...cart]);
                        setNewCmdClientNom('');
                        setNewCmdClientPhone('');
                        setNewCmdAdresse('');
                        setIsNewDeliveryModalOpen(true);
                      }}
                      className="py-3 px-2 rounded-2xl bg-[#1B4332] disabled:bg-gray-300 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Truck className="w-4 h-4 text-[#E8A33D]" />
                      <span>À Livrer</span>
                    </button>

                    <button
                      disabled={cart.length === 0}
                      onClick={() => {
                        setPaymentMode('reservation');
                        setMontantVerseInput(0);
                        setIsPaymentModalOpen(true);
                      }}
                      className="py-3 px-2 rounded-2xl bg-purple-900 disabled:bg-gray-300 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4 text-[#E8A33D]" />
                      <span>Réservation</span>
                    </button>
                  </div>
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
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            (cmd.adresse_livraison || '').includes('Payé')
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : (cmd.adresse_livraison || '').includes('Crédit')
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {(cmd.adresse_livraison || '').includes('Payé')
                            ? '💳 Payé d\'avance'
                            : (cmd.adresse_livraison || '').includes('Crédit')
                            ? '⚠️ Crédit / Dette'
                            : '⏳ Paiement à la livraison'}
                        </span>
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
                            ? '📦 À Livrer'
                            : cmd.statut === 'en_livraison'
                            ? '🚚 En Livraison'
                            : '🎉 Livrée & Payée'}
                        </span>
                      </div>
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
                            setCommandesLigne(offlineDB.getCommandesEnLigne());
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
                            setCommandesLigne(offlineDB.getCommandesEnLigne());
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
                  <span className={`text-xs font-bold ${calculDetteOuReste > 0 || paymentMode === 'credit' ? 'text-red-700 font-black' : 'text-[#1B4332]'}`}>
                    {calculDetteOuReste > 0 || paymentMode === 'credit' ? '⚠️ Client Obligatoire (Vente avec Dette / Solde restant dû) *' : 'Nom du Client (Recommandé)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewClientMode(!isNewClientMode);
                      setClientValidationError('');
                    }}
                    className="text-[11px] font-bold text-[#B8442C] underline"
                  >
                    {isNewClientMode ? 'Sélectionner Client Existant' : '+ Nouveau Client'}
                  </button>
                </div>

                {isNewClientMode ? (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nom du Client *"
                        value={newClientNom}
                        onChange={(e) => {
                          setNewClientNom(e.target.value);
                          setClientValidationError('');
                        }}
                        className={`bg-white border rounded-xl p-2 text-xs font-bold text-[#1B4332] ${
                          (calculDetteOuReste > 0 || paymentMode === 'credit') && !newClientNom.trim() ? 'border-red-400 ring-1 ring-red-400' : 'border-[#E2D5C3]'
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="N° WhatsApp/Tél *"
                        value={newClientPhone}
                        onChange={(e) => {
                          setNewClientPhone(e.target.value);
                          setClientValidationError('');
                        }}
                        className={`bg-white border rounded-xl p-2 text-xs font-bold text-[#1B4332] ${
                          (calculDetteOuReste > 0 || paymentMode === 'credit') && newClientPhone.replace(/[^0-9]/g, '').length < 8 ? 'border-red-400 ring-1 ring-red-400' : 'border-[#E2D5C3]'
                        }`}
                      />
                    </div>

                    {/* Suggestion automatique si numéro déjà attribué */}
                    {(() => {
                      const cleanPhone = newClientPhone.replace(/[^0-9]/g, '');
                      const matched = cleanPhone.length >= 8 ? clients.find((c) => {
                        const p = (c.telephone_whatsapp || '').replace(/[^0-9]/g, '');
                        return p && (p === cleanPhone || p.endsWith(cleanPhone) || cleanPhone.endsWith(p));
                      }) : null;

                      if (!matched) return null;
                      return (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs flex items-center justify-between text-emerald-900">
                          <div>
                            <p className="font-bold">💡 Ce numéro appartient à : {matched.nom}</p>
                            <p className="text-[10px] text-gray-500">N° : {matched.telephone_whatsapp}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(matched.id);
                              setIsNewClientMode(false);
                              setNewClientNom('');
                              setNewClientPhone('');
                              setClientValidationError('');
                            }}
                            className="px-2.5 py-1 bg-[#1B4332] text-white rounded-lg text-[10px] font-bold shadow-sm"
                          >
                            Utiliser ce client
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      setClientValidationError('');
                    }}
                    className={`w-full bg-white border rounded-xl p-2.5 text-xs font-bold text-[#1B4332] ${
                      (calculDetteOuReste > 0 || paymentMode === 'credit') && !selectedClientId ? 'border-red-400 ring-1 ring-red-400' : 'border-[#E2D5C3]'
                    }`}
                  >
                    <option value="">{calculDetteOuReste > 0 || paymentMode === 'credit' ? '-- Sélectionner un Client Obligatoire --' : 'Client Anonyme (Vente direct au comptoir)'}</option>
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
                        setClientValidationError('');
                        if (m.id === 'cash' || m.id === 'orange_money' || m.id === 'mtn_momo') {
                          setMontantVerseInput(cartTotalFinal);
                        } else if (m.id === 'reservation') {
                          setMontantVerseInput(0);
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
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setNewCmdCart([...cart]);
                      setNewCmdClientNom(newClientNom || clients.find((c) => c.id === selectedClientId)?.nom || '');
                      setNewCmdClientPhone(newClientPhone || clients.find((c) => c.id === selectedClientId)?.telephone_whatsapp || '');
                      setIsNewDeliveryModalOpen(true);
                    }}
                    className="p-3 rounded-2xl border border-dashed border-[#1B4332] bg-emerald-50 text-[#1B4332] hover:bg-emerald-100 text-xs font-bold text-center transition-all flex items-center justify-center gap-1"
                  >
                    <Truck className="w-3.5 h-3.5 text-[#B8442C]" />
                    <span>🚚 Vente à Livrer</span>
                  </button>
                </div>
              </div>

              {/* Remise & Saisie Montant Versé */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 flex items-center h-6 mb-1">Remise Accordée (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    onFocus={(e) => e.target.select()}
                    value={remiseInput || ''}
                    onChange={(e) => setRemiseInput(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 flex items-center h-6 mb-1">Montant Versé (FCFA) *</label>
                  <input
                    type="number"
                    min="0"
                    onFocus={(e) => e.target.select()}
                    value={montantVerseInput || ''}
                    onChange={(e) => setMontantVerseInput(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder={paymentMode === 'reservation' ? '0' : `${cartTotalFinal}`}
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
                  <p className="text-[11px] font-normal opacity-90">Les articles seront immédiatement mis de côté (stock réservé), avec {montantVerseInput || 0} FCFA d'acompte et {Math.max(0, cartTotalFinal - (montantVerseInput || 0)).toLocaleString('fr-FR')} FCFA restant à solder.</p>
                </div>
              )}

              {/* Erreur de validation explicite pour la dette */}
              {clientValidationError && (
                <div className="p-3 rounded-2xl bg-red-100 border-2 border-red-400 text-red-900 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{clientValidationError}</span>
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

              {/* Sélection des Articles à Livrer */}
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Articles à Livrer (Catalogue Boutique) *</label>
                <div className="bg-white border border-[#E2D5C3] rounded-2xl p-2.5 max-h-44 overflow-y-auto space-y-1.5">
                  {produits.map((p) => {
                    const existingIndex = newCmdCart.findIndex((i) => i.produit.id === p.id);
                    const qty = existingIndex >= 0 ? newCmdCart[existingIndex].quantite : 0;

                    return (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-xs">
                        <div className="truncate pr-2">
                          <p className="font-bold text-[#1B4332] truncate">{p.nom}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{(p.prix_vente_unitaire || 0).toLocaleString('fr-FR')} FCFA/pc</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {qty > 0 ? (
                            <div className="flex items-center gap-1 bg-[#1B4332] text-white px-2 py-1 rounded-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  if (qty === 1) {
                                    setNewCmdCart(newCmdCart.filter((i) => i.produit.id !== p.id));
                                  } else {
                                    const copy = [...newCmdCart];
                                    copy[existingIndex].quantite -= 1;
                                    setNewCmdCart(copy);
                                  }
                                }}
                                className="font-black px-1"
                              >
                                -
                              </button>
                              <span className="font-bold text-xs">{qty}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = [...newCmdCart];
                                  copy[existingIndex].quantite += 1;
                                  setNewCmdCart(copy);
                                }}
                                className="font-black px-1"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setNewCmdCart([
                                  ...newCmdCart,
                                  { produit: p, quantite: 1, prix_unitaire: p.prix_vente_unitaire || 0 },
                                ]);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-[10px]"
                            >
                              Ajouter +
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {newCmdCart.length > 0 && (
                  <p className="text-[11px] font-black text-[#B8442C] mt-1 text-right">
                    Total articles : {newCmdCart.reduce((acc, i) => acc + i.quantite * i.prix_unitaire, 0).toLocaleString('fr-FR')} FCFA
                  </p>
                )}
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
                {(() => {
                  const cleanPhone = newCmdClientPhone.replace(/[^0-9]/g, '');
                  const matchedClient = cleanPhone.length >= 8 ? clients.find((c) => {
                    const p = (c.telephone_whatsapp || '').replace(/[^0-9]/g, '');
                    return p && (p === cleanPhone || p.endsWith(cleanPhone) || cleanPhone.endsWith(p));
                  }) : null;

                  if (!matchedClient || matchedClient.nom === newCmdClientNom) return null;
                  return (
                    <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-xl text-xs flex items-center justify-between text-emerald-900 mt-1">
                      <span>💡 Client existant trouvé : <strong>{matchedClient.nom}</strong></span>
                      <button
                        type="button"
                        onClick={() => setNewCmdClientNom(matchedClient.nom)}
                        className="px-2 py-0.5 bg-[#1B4332] text-white rounded text-[10px] font-bold"
                      >
                        Utiliser son nom
                      </button>
                    </div>
                  );
                })()}
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

              {/* Statut de paiement */}
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Statut du Paiement pour la Livraison *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'a_la_livraison', label: '🟡 À la livraison' },
                    { id: 'paye_avance', label: '🟢 Payé d\'avance' },
                    { id: 'credit', label: '🟠 Crédit / Dette' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNewCmdStatutPaiement(opt.id as any)}
                      className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all text-center ${
                        newCmdStatutPaiement === opt.id
                          ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-sm'
                          : 'bg-white text-gray-700 border-[#E2D5C3]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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

        {/* Modal Scanner Caméra Code-barres OKO */}
        {isBarcodeScannerOpen && (
          <OkoBarcodeScannerModal
            isOpen={isBarcodeScannerOpen}
            onClose={() => setIsBarcodeScannerOpen(false)}
            onScanSuccess={handleScanCodeResult}
          />
        )}
      </div>
    </AppLayout>
  );
}
