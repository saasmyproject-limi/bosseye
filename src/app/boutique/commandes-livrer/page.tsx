'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  MessageSquare,
  Phone,
  MapPin,
  X,
  Printer,
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import {
  CommandeEnLigne,
  StatutLivraison,
  Produit,
  Client,
  Utilisateur,
  Etablissement,
} from '@/types';
import { generateReceiptPDF } from '@/lib/pdfGenerator';
import { syncShopToCloud } from '@/lib/supabaseSync';

export default function BoutiqueCommandesLivrerPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [commandes, setCommandes] = useState<CommandeEnLigne[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('toutes');

  // Modal Nouvelle Commande à Livrer
  const [isNewDeliveryModalOpen, setIsNewDeliveryModalOpen] = useState(false);
  const [newCmdClientNom, setNewCmdClientNom] = useState('');
  const [newCmdClientPhone, setNewCmdClientPhone] = useState('');
  const [newCmdAdresse, setNewCmdAdresse] = useState('');
  const [newCmdQuartier, setNewCmdQuartier] = useState('');
  const [newCmdDate, setNewCmdDate] = useState('');

  // Cart pour la nouvelle commande
  const [deliveryCart, setDeliveryCart] = useState<
    Array<{
      produit: Produit;
      varianteInfo?: string;
      quantite: number;
      prix_unitaire: number;
    }>
  >([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      const user = offlineDB.getCurrentUser();
      setCurrentUser(user);
      const cmds = offlineDB.getCommandesEnLigne();
      setCommandes(cmds);
      const prods = offlineDB.getProduits();
      setProduits(prods);
      const clis = offlineDB.getClients();
      setClients(clis);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = (id: string, nextStatus: StatutLivraison) => {
    offlineDB.updateStatutCommandeEnLigne(id, nextStatus, currentUser?.nom || 'Livreur Boutique');
    const etab = offlineDB.getEtablissement();
    if (etab) syncShopToCloud(etab.id);
    loadData();
  };

  const handleAddToCart = (p: Produit, varianteLabel?: string) => {
    const unitPrice = p.prix_vente_unitaire || 0;
    const existingIndex = deliveryCart.findIndex(
      (item) => item.produit.id === p.id && item.varianteInfo === varianteLabel
    );

    if (existingIndex >= 0) {
      const updated = [...deliveryCart];
      updated[existingIndex].quantite += 1;
      setDeliveryCart(updated);
    } else {
      setDeliveryCart([
        ...deliveryCart,
        {
          produit: p,
          varianteInfo: varianteLabel,
          quantite: 1,
          prix_unitaire: unitPrice,
        },
      ]);
    }
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = deliveryCart.filter((_, i) => i !== index);
    setDeliveryCart(updated);
  };

  const totalDeliveryCartAmount = deliveryCart.reduce(
    (sum, item) => sum + item.quantite * item.prix_unitaire,
    0
  );

  const handleCreateDeliveryOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmdClientNom.trim() || !newCmdClientPhone.trim() || deliveryCart.length === 0) return;

    const count = commandes.length + 1;
    const numCmd = `CMD-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    const newCmd = offlineDB.addCommandeEnLigne({
      numero_commande: numCmd,
      client_nom: newCmdClientNom.trim(),
      client_telephone: newCmdClientPhone.trim(),
      adresse_livraison: newCmdAdresse.trim() || 'Adresse non spécifiée',
      quartier_livraison: newCmdQuartier.trim() || 'Douala',
      date_livraison: newCmdDate || 'Aujourd\'hui',
      statut: 'en_attente_prise_en_charge',
      pris_par_id: currentUser?.id,
      pris_par_nom: currentUser?.nom,
      lignes: deliveryCart.map((item) => ({
        produit_id: item.produit.id,
        nom_produit: item.produit.nom,
        detail_variante: item.varianteInfo,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
      })),
      montant_total: totalDeliveryCartAmount,
    });

    // Optionnel : enregistrer automatiquement le client s'il est nouveau
    const matchClient = clients.find((c) => c.telephone_whatsapp === newCmdClientPhone.trim());
    if (!matchClient) {
      offlineDB.addClient({
        nom: newCmdClientNom.trim(),
        telephone_whatsapp: newCmdClientPhone.trim(),
        note_quartier: newCmdQuartier.trim(),
      });
    }

    const etab = offlineDB.getEtablissement();
    if (etab) syncShopToCloud(etab.id);

    setIsNewDeliveryModalOpen(false);
    setNewCmdClientNom('');
    setNewCmdClientPhone('');
    setNewCmdAdresse('');
    setNewCmdQuartier('');
    setDeliveryCart([]);
    loadData();
  };

  const handlePrintDeliveryReceipt = (cmd: CommandeEnLigne) => {
    if (!etablissement) return;

    generateReceiptPDF({
      etablissementNom: etablissement.nom,
      etablissementVille: etablissement.ville || 'Douala',
      etablissementQuartier: etablissement.quartier,
      etablissementTelephone: etablissement.telephone_proprio,
      numeroTicket: cmd.numero_commande,
      dateStr: new Date(cmd.created_at).toLocaleString('fr-FR'),
      typeVenteLabel: 'COMMANDE À LIVRER',
      clientNom: cmd.client_nom,
      clientTelephone: cmd.client_telephone,
      caissiereNom: cmd.pris_par_nom || 'Service Livraison',
      lignes: cmd.lignes.map((l) => ({
        nom_produit: `${l.nom_produit} ${l.detail_variante ? `(${l.detail_variante})` : ''}`,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
        total: l.quantite * l.prix_unitaire,
      })),
      totalGeneral: cmd.montant_total,
      remise: 0,
      montantVerse: cmd.montant_total,
      monnaieRendue: 0,
      modePaiementLabel: `Livraison (${cmd.quartier_livraison || 'Akwa'})`,
    });
  };

  // Filtrage des commandes
  const filteredCommandes = commandes.filter((c) => {
    if (!c) return false;
    const matchStatus = statusFilter === 'toutes' || c.statut === statusFilter;
    const matchSearch =
      (c.client_nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.client_telephone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.numero_commande || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.quartier_livraison || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lignes.some((l) => l.nom_produit.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const pendingCount = commandes.filter((c) => c.statut === 'en_attente_prise_en_charge').length;
  const inTransitCount = commandes.filter((c) => c.statut === 'prise_en_charge_livreur').length;
  const deliveredCount = commandes.filter((c) => c.statut === 'livree').length;
  const totalAmountDelivered = commandes
    .filter((c) => c.statut === 'livree')
    .reduce((sum, c) => sum + c.montant_total, 0);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E2D5C3]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-1 rounded-full border border-[#B8442C]/20">
            BOUTIQUE LIVRAISONS & COMMANDES EN LIGNE
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#1B4332] mt-1 flex items-center gap-2">
            <Truck className="w-8 h-8 text-[#B8442C]" />
            <span>Commandes À LIVRER & Habits Commandés</span>
          </h1>
          <p className="text-xs text-gray-600 font-medium mt-0.5">
            Visionnez tous les vêtements et articles commandés à livrer aux clients (WhatsApp, Téléphone, En Ligne).
          </p>
        </div>

        <button
          onClick={() => setIsNewDeliveryModalOpen(true)}
          className="py-3 px-5 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>+ Nouvelle Commande à Livrer</span>
        </button>
      </div>

      {/* Cartes KPI Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">En attente livreur</span>
          <span className="font-black text-xl text-amber-700">{pendingCount} commandes</span>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">En cours de livraison</span>
          <span className="font-black text-xl text-blue-700">{inTransitCount} en route</span>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Livrées & Encaissées</span>
          <span className="font-black text-xl text-emerald-800">{deliveredCount} livraisons</span>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Encaissé Livraisons</span>
          <span className="font-black text-xl text-[#1B4332]">{totalAmountDelivered.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-[#F3ECE0] p-4 rounded-3xl border border-[#E2D5C3]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Rechercher par client, vêtement, quartier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-[#1B4332] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'toutes', label: 'Toutes les commandes' },
            { id: 'en_attente_prise_en_charge', label: '⏳ En Attente' },
            { id: 'prise_en_charge_livreur', label: '🏍️ En Route' },
            { id: 'livree', label: '✅ Livrées' },
            { id: 'annulee', label: '❌ Annulées' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-[#1B4332] text-white shadow-md font-black'
                  : 'bg-[#FBF7EF] border border-[#E2D5C3] text-[#1B4332] hover:bg-[#EADECB]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cartes des Commandes et Habits à Livrer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCommandes.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-[#E2D5C3] rounded-3xl text-gray-500 font-bold space-y-3">
            <Truck className="w-12 h-12 text-gray-300 mx-auto" />
            <p>Aucune commande à livrer enregistrée pour le moment.</p>
            <button
              onClick={() => setIsNewDeliveryModalOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-[#1B4332] text-white font-bold text-xs shadow-md"
            >
              Saisir une nouvelle commande à livrer
            </button>
          </div>
        ) : (
          filteredCommandes.map((cmd) => {
            const isPending = cmd.statut === 'en_attente_prise_en_charge';
            const isInTransit = cmd.statut === 'prise_en_charge_livreur';
            const isDelivered = cmd.statut === 'livree';

            return (
              <div
                key={cmd.id}
                className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-[#B8442C] transition-all"
              >
                <div>
                  {/* Top Bar Header de Carte */}
                  <div className="flex items-start justify-between pb-3 border-b border-[#E2D5C3]">
                    <div>
                      <span className="font-mono font-black text-sm text-[#1B4332]">
                        {cmd.numero_commande}
                      </span>
                      <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                        {new Date(cmd.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        isPending
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isInTransit
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : isDelivered
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-red-100 text-red-900 border border-red-300'
                      }`}
                    >
                      {isPending
                        ? '⏳ En attente'
                        : isInTransit
                        ? '🏍️ En cours'
                        : isDelivered
                        ? '✅ Livrée'
                        : '❌ Annulée'}
                    </span>
                  </div>

                  {/* Infos Client & Adresse de Livraison */}
                  <div className="py-3 border-b border-[#E2D5C3] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#1B4332] text-sm">{cmd.client_nom}</span>
                      <a
                        href={`https://wa.me/${cmd.client_telephone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1 px-2.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] flex items-center gap-1 border border-emerald-300 transition-colors"
                        title="Contacter sur WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{cmd.client_telephone}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-gray-700 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-[#B8442C] shrink-0 mt-0.5" />
                      <span>
                        {cmd.quartier_livraison ? `${cmd.quartier_livraison} - ` : ''}
                        {cmd.adresse_livraison}
                      </span>
                    </div>
                  </div>

                  {/* Liste des Habits / Articles Commandés */}
                  <div className="py-3 space-y-2">
                    <span className="text-[10px] font-black uppercase text-[#B8442C] tracking-wider block">
                      👕 Articles / Vêtements à livrer ({cmd.lignes.length})
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {cmd.lignes.map((line, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between text-xs font-bold text-[#1B4332]"
                        >
                          <div>
                            <span>{line.nom_produit}</span>
                            {line.detail_variante && (
                              <span className="text-[10px] text-gray-500 font-normal block">
                                Taille/Couleur : {line.detail_variante}
                              </span>
                            )}
                          </div>
                          <span className="font-black">
                            {line.quantite}x {line.prix_unitaire.toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Montant & Actions */}
                <div className="pt-3 border-t border-[#E2D5C3] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-500">Montant Total :</span>
                    <span className="font-black text-lg text-[#1B4332]">
                      {cmd.montant_total.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintDeliveryReceipt(cmd)}
                      className="p-2.5 rounded-xl bg-[#F3ECE0] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] transition-colors"
                      title="Imprimer le bon de livraison PDF"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(cmd.id, 'prise_en_charge_livreur')}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Prendre en charge</span>
                      </button>
                    )}

                    {isInTransit && (
                      <button
                        onClick={() => handleUpdateStatus(cmd.id, 'livree')}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marquer Livrée & Encaissée</span>
                      </button>
                    )}

                    {isDelivered && (
                      <span className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs text-center border border-emerald-200">
                        ✅ Livrée par {cmd.livre_par_nom || 'Service Express'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* MODAL CRÉATION COMMANDE LIVRAISON */}
      {isNewDeliveryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateDeliveryOrder}
            className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
              <h3 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                <Truck className="w-6 h-6 text-[#B8442C]" />
                <span>Nouvelle Commande à Livrer</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewDeliveryModalOpen(false)}
                className="text-gray-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Infos Client & Adresse */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Nom du Client *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Mme Chantal, M. Paul..."
                  value={newCmdClientNom}
                  onChange={(e) => setNewCmdClientNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Téléphone / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="ex: 699445566"
                  value={newCmdClientPhone}
                  onChange={(e) => setNewCmdClientPhone(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Quartier de livraison</label>
                <input
                  type="text"
                  placeholder="ex: Akwa, Bonapriso, Bastos..."
                  value={newCmdQuartier}
                  onChange={(e) => setNewCmdQuartier(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Adresse / Repère précis</label>
                <input
                  type="text"
                  placeholder="ex: Rue des Palmiers, Immeuble..."
                  value={newCmdAdresse}
                  onChange={(e) => setNewCmdAdresse(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>
            </div>

            {/* Sélection des Vêtements & Articles du Stock */}
            <div className="space-y-2 pt-2 border-t border-[#E2D5C3]">
              <label className="block text-xs font-black text-[#1B4332] uppercase">
                👕 Choisir les Vêtements / Articles à livrer
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {produits.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-white border border-[#E2D5C3] rounded-2xl flex flex-col justify-between space-y-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#1B4332]">{p.nom}</span>
                      <span className="text-[10px] font-black text-emerald-800 block">
                        {(p.prix_vente_unitaire || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    {/* Declinaisons Taille / Couleur */}
                    {p.variantes && p.variantes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.variantes.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleAddToCart(p, `${v.taille} - ${v.couleur}`)}
                            className="px-2 py-1 bg-[#F3ECE0] hover:bg-[#B8442C] hover:text-white rounded-lg text-[10px] font-bold text-[#1B4332] transition-colors"
                          >
                            + {v.taille}/{v.couleur}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        className="py-1 px-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-lg text-[11px] font-bold self-start transition-colors"
                      >
                        + Ajouter au Panier
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Panier de Livraison Saisi */}
            {deliveryCart.length > 0 && (
              <div className="p-3 bg-white rounded-2xl border border-[#E2D5C3] space-y-2">
                <span className="text-[11px] font-black uppercase text-[#1B4332]">
                  Résumé des Articles Sélectionnés ({deliveryCart.length}) :
                </span>
                <div className="space-y-1 text-xs">
                  {deliveryCart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 bg-[#FBF7EF] rounded-xl">
                      <span>
                        {item.produit.nom} {item.varianteInfo ? `(${item.varianteInfo})` : ''} x{item.quantite}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1B4332]">
                          {(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} F
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-red-600 font-bold hover:underline"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#E2D5C3] flex justify-between items-center text-xs font-black text-[#1B4332]">
                  <span>Total à Encaisser à la Livraison :</span>
                  <span className="text-sm font-black text-emerald-800">
                    {totalDeliveryCartAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            )}

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
                className="flex-1 py-3 px-4 rounded-xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-md"
              >
                Créer la Commande à Livrer
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
