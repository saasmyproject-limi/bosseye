'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Printer,
  Share2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Smartphone,
  X,
  Users,
  UtensilsCrossed,
  GlassWater,
  FileText,
  UserCheck
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Produit, Employe, VenteItem, Vente, TableOrder } from '@/types';
import { generateInvoicePDF, shareReceiptWhatsApp } from '@/lib/pdfGenerator';
import OfflineBadge from '@/components/OfflineBadge';

export default function CaissePage() {
  const [modeService, setModeService] = useState<'snack' | 'bar_table'>('snack');
  const [produits, setProduits] = useState<Produit[]>([]);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [categories, setCategories] = useState<string[]>(['Tous', 'Bière', 'Nectar / Soft', 'Plat Chaud', 'Snack']);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');

  // État du Ticket / Panier Snack
  const [ticketItems, setTicketItems] = useState<VenteItem[]>([]);
  const [selectedServeuseId, setSelectedServeuseId] = useState<string>('');
  const [selectedCaissiereId, setSelectedCaissiereId] = useState<string>('');

  // État Mode Bar (Tables & Clients)
  const [tablesOrders, setTablesOrders] = useState<TableOrder[]>([]);
  const [selectedTableNum, setSelectedTableNum] = useState<string>('Table 1');
  const [selectedClientSubTicket, setSelectedClientSubTicket] = useState<string>('Client A');

  // Modals & Facture finale
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'momo' | 'orange_money' | 'credit'>('cash');
  const [lastVente, setLastVente] = useState<Vente | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const listTablesPreset = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'VIP 1', 'VIP 2', 'Terrasse 1'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const prods = offlineDB.getProduits();
    const emps = offlineDB.getEmployes();
    const tbls = offlineDB.getTableOrders();
    setProduits(prods);
    setEmployes(emps);
    setTablesOrders(tbls);

    const serveuses = emps.filter((e) => e.actif && (e.role === 'Serveuse' || e.role === 'Owner'));
    const caissieres = emps.filter((e) => e.actif && (e.role === 'Caissière' || e.role === 'Owner'));

    if (serveuses.length > 0 && !selectedServeuseId) setSelectedServeuseId(serveuses[0].id);
    if (caissieres.length > 0 && !selectedCaissiereId) setSelectedCaissiereId(caissieres[0].id);
  };

  // --- MODE SNACK (COMMANDE DIRECTE) ---
  const handleAddToCartSnack = (p: Produit) => {
    setTicketItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.produit_id === p.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantite_bouteilles + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantite_bouteilles: newQty,
          subtotal: newQty * updated[existingIndex].prix_unitaire,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            produit_id: p.id,
            nom_produit: p.nom,
            quantite_bouteilles: 1,
            prix_unitaire: p.prix_vente_bouteille,
            subtotal: p.prix_vente_bouteille,
            client_nom: 'Client Direct',
          },
        ];
      }
    });
  };

  // --- MODE BAR (TABLES & CLIENTS) ---
  const handleAddToCartBarTable = (p: Produit) => {
    const newItem: VenteItem = {
      produit_id: p.id,
      nom_produit: p.nom,
      quantite_bouteilles: 1,
      prix_unitaire: p.prix_vente_bouteille,
      subtotal: p.prix_vente_bouteille,
      client_nom: selectedClientSubTicket,
    };

    offlineDB.addOrUpdateTableOrder(selectedTableNum, selectedServeuseId, newItem);
    loadData();
  };

  const currentTableOrder = tablesOrders.find((t) => t.table_numero === selectedTableNum);
  const currentTableTotal = currentTableOrder
    ? currentTableOrder.items.reduce((acc, i) => acc + i.subtotal, 0)
    : 0;

  const totalAmountSnack = ticketItems.reduce((acc, i) => acc + i.subtotal, 0);

  const handlePayerClick = () => {
    if (modeService === 'snack' && ticketItems.length === 0) return;
    if (modeService === 'bar_table' && (!currentTableOrder || currentTableOrder.items.length === 0)) return;
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    const boutique = offlineDB.getBoutique();

    if (modeService === 'snack') {
      const newVente = offlineDB.addVente({
        boutique_id: boutique.id,
        mode_service: 'snack',
        serveuse_id: selectedServeuseId,
        caissiere_id: selectedCaissiereId,
        total_amount: totalAmountSnack,
        mode_paiement: paymentMode,
        status: 'payee',
        items: ticketItems,
      });
      setLastVente(newVente);
      setTicketItems([]);
    } else {
      if (!currentTableOrder) return;
      const newVente = offlineDB.addVente({
        boutique_id: boutique.id,
        mode_service: 'bar_table',
        table_numero: selectedTableNum,
        serveuse_id: selectedServeuseId,
        caissiere_id: selectedCaissiereId,
        total_amount: currentTableTotal,
        mode_paiement: paymentMode,
        status: 'payee',
        items: currentTableOrder.items,
      });

      offlineDB.closeTableOrder(selectedTableNum);
      setLastVente(newVente);
    }

    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(true);
    loadData();
  };

  const handlePrintPDF = () => {
    if (!lastVente) return;
    const doc = generateInvoicePDF(lastVente);
    doc.save(`Facture_${lastVente.numero_facture}.pdf`);
  };

  const serveusesList = employes.filter((e) => e.actif && (e.role === 'Serveuse' || e.role === 'Owner'));
  const caissieresList = employes.filter((e) => e.actif && (e.role === 'Caissière' || e.role === 'Owner'));

  const currentServeuse = employes.find((e) => e.id === selectedServeuseId);
  const currentCaissiere = employes.find((e) => e.id === selectedCaissiereId);

  const filteredProduits = selectedCategory === 'Tous'
    ? produits
    : produits.filter((p) => {
        if (selectedCategory === 'Bière') return p.nom.toLowerCase().includes('beaufort') || p.nom.toLowerCase().includes('33') || p.nom.toLowerCase().includes('castel') || p.nom.toLowerCase().includes('mutzig') || p.nom.toLowerCase().includes('isenbeck') || p.nom.toLowerCase().includes('guinness') || p.nom.toLowerCase().includes('heineken') || p.nom.toLowerCase().includes('76');
        if (selectedCategory === 'Plat Chaud') return p.nom.toLowerCase().includes('poisson') || p.nom.toLowerCase().includes('poulet');
        return true;
      });

  return (
    <main className="min-h-screen bg-brand-black text-white p-3 max-w-xl mx-auto pb-36 pt-3">
      {/* Top Header & Offline Badge */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-1.5">
            <ShoppingBag className="w-5 h-5 text-brand-orange" />
            Caisse Enregistreuse
          </h1>
        </div>
        <OfflineBadge />
      </div>

      {/* TOGGLE MODE SNACK (DIRECT) vs MODE BAR (TABLES & CLIENTS) */}
      <div className="grid grid-cols-2 gap-2 mb-3 p-1.5 rounded-2xl bg-brand-card border border-brand-border">
        <button
          onClick={() => setModeService('snack')}
          className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            modeService === 'snack'
              ? 'bg-brand-orange text-white shadow-glow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          ⚡ Mode Snack (Direct)
        </button>

        <button
          onClick={() => setModeService('bar_table')}
          className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            modeService === 'bar_table'
              ? 'bg-amber-500 text-black shadow-glow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <GlassWater className="w-4 h-4" />
          🍹 Mode Bar (Par Table)
        </button>
      </div>

      {/* SELECTION SERVEUSE AVEC PHOTOS ET NOMS */}
      <div className="mb-3 p-2.5 rounded-2xl bg-brand-card border border-brand-border">
        <label className="text-[10px] font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">
          Serveuse qui gère la commande :
        </label>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {serveusesList.map((serveuse) => {
            const isSelected = serveuse.id === selectedServeuseId;
            return (
              <div
                key={serveuse.id}
                onClick={() => setSelectedServeuseId(serveuse.id)}
                className={`flex items-center gap-2 p-1.5 pr-3 rounded-2xl border cursor-pointer transition-all shrink-0 ${
                  isSelected
                    ? 'bg-brand-orange/20 border-brand-orange shadow-glow text-white font-bold'
                    : 'bg-brand-black border-brand-border text-gray-400 opacity-70'
                }`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-brand-orange shrink-0">
                  {serveuse.photo_url ? (
                    <img src={serveuse.photo_url} alt={serveuse.nom} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-orange flex items-center justify-center text-white font-bold text-xs">
                      {serveuse.nom[0]}
                    </div>
                  )}
                </div>
                <span className="text-xs whitespace-nowrap">{serveuse.nom.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* INTÉGRATION MODE BAR : SELECTION DE TABLE & DE CLIENT (SOUS-TICKETS) */}
      {modeService === 'bar_table' && (
        <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
              📍 Choix de la Table :
            </span>
            <span className="text-[11px] text-gray-300 font-bold">
              Total Table: <strong className="text-amber-400 text-sm">{currentTableTotal.toLocaleString('fr-FR')} F</strong>
            </span>
          </div>

          {/* Grille des Tables */}
          <div className="grid grid-cols-4 gap-1.5">
            {listTablesPreset.map((tbl) => {
              const activeTbl = tablesOrders.find((t) => t.table_numero === tbl && t.status === 'ouverte');
              const isSelected = tbl === selectedTableNum;
              const hasItems = activeTbl && activeTbl.items.length > 0;

              return (
                <button
                  key={tbl}
                  onClick={() => setSelectedTableNum(tbl)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center border ${
                    isSelected
                      ? 'bg-amber-500 text-black border-amber-400 shadow-glow font-black scale-105'
                      : hasItems
                      ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 animate-pulse'
                      : 'bg-brand-black border-brand-border text-gray-400'
                  }`}
                >
                  <span>{tbl}</span>
                  {hasItems && (
                    <span className="text-[9px] font-black">{activeTbl.items.length} art.</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Identification du Client sur la table (Sous-tickets pour ne pas mélanger les factures) */}
          <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-300">Client de la {selectedTableNum} :</span>
            <div className="flex items-center gap-1.5">
              {['Client A', 'Client B', 'Client C'].map((cNom) => (
                <button
                  key={cNom}
                  onClick={() => setSelectedClientSubTicket(cNom)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    selectedClientSubTicket === cNom
                      ? 'bg-brand-orange text-white shadow-glow'
                      : 'bg-brand-black border border-brand-border text-gray-400'
                  }`}
                >
                  {cNom}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FILTRE CATÉGORIES */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-brand-orange text-white shadow-glow'
                : 'bg-brand-card border border-brand-border text-gray-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GRILLE DES PRODUITS AVEC STOCK "8c+3b" */}
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {filteredProduits.map((p) => {
          const stockText = `${p.casiers_pleins}c + ${p.bouteilles_vrac}b`;
          const isLowStock = p.casiers_pleins < 2;

          return (
            <div
              key={p.id}
              onClick={() => (modeService === 'snack' ? handleAddToCartSnack(p) : handleAddToCartBarTable(p))}
              className="relative p-3 rounded-3xl bg-brand-card border border-brand-border hover:border-brand-orange cursor-pointer transition-all active:scale-95 flex flex-col justify-between h-36 group shadow-card"
            >
              <div className="flex items-start justify-between">
                <img
                  src={p.photo_url || 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=200&q=80'}
                  alt={p.nom}
                  className="w-12 h-12 rounded-2xl object-cover border border-brand-border"
                />

                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    isLowStock
                      ? 'bg-red-950/80 border-red-500/50 text-red-400 animate-pulse'
                      : 'bg-brand-black border-brand-border text-brand-orange'
                  }`}
                >
                  Stock: {stockText}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-xs text-white leading-snug line-clamp-2">{p.nom}</h3>
                <p className="text-sm font-black text-amber-400 mt-1">
                  {p.prix_vente_bouteille.toLocaleString('fr-FR')} FCFA
                </p>
              </div>

              <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-brand-orange text-white flex items-center justify-center font-black shadow-glow group-hover:scale-110 transition-transform">
                +
              </div>
            </div>
          );
        })}
      </div>

      {/* PANIER / TICKET EN BAS (ADAPTÉ SNACK vs BAR TABLE) */}
      <div className="fixed bottom-16 left-0 right-0 p-3 bg-brand-card/95 backdrop-blur-xl border-t border-brand-border max-w-xl mx-auto z-40 rounded-t-3xl shadow-glow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            📋 {modeService === 'snack' ? `Commande Directe (${ticketItems.length})` : `Addition ${selectedTableNum} (${currentTableOrder?.items.length || 0})`}
          </span>

          {currentServeuse && (
            <span className="text-xs font-semibold text-brand-orange flex items-center gap-1">
              Serveuse: <strong>{currentServeuse.nom.split(' ')[0]}</strong>
            </span>
          )}
        </div>

        {/* AFFICHAGE DES ARTICLES */}
        {modeService === 'snack' ? (
          ticketItems.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-2 italic">
              Mode Snack : Cliquez sur une boisson pour l'ajouter au ticket...
            </p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-2 mb-3 pr-1">
              {ticketItems.map((item) => (
                <div key={item.produit_id} className="flex items-center justify-between bg-brand-black/70 p-2 rounded-2xl border border-brand-border/60">
                  <span className="text-xs font-bold text-white truncate max-w-[150px]">{item.nom_produit}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-400">x{item.quantite_bouteilles}</span>
                    <span className="text-xs font-bold text-white w-16 text-right">{item.subtotal.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          !currentTableOrder || currentTableOrder.items.length === 0 ? (
            <p className="text-xs text-amber-400 text-center py-2 italic">
              Mode Bar ({selectedTableNum}) : Cliquez sur une boisson pour l'ajouter à la table...
            </p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-2 mb-3 pr-1">
              {currentTableOrder.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-brand-black/70 p-2 rounded-2xl border border-amber-500/30">
                  <div>
                    <span className="text-xs font-bold text-white block">{item.nom_produit} (x{item.quantite_bouteilles})</span>
                    <span className="text-[10px] text-amber-400 font-bold">{item.client_nom || 'Client A'}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400">{item.subtotal.toLocaleString('fr-FR')} F</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Total & Bouton Payer */}
        <div className="flex items-center justify-between pt-2 border-t border-brand-border">
          <div>
            <span className="text-[10px] uppercase text-gray-400 font-bold block">Total à payer</span>
            <span className="text-xl font-black text-brand-orange">
              {(modeService === 'snack' ? totalAmountSnack : currentTableTotal).toLocaleString('fr-FR')} FCFA
            </span>
          </div>

          <button
            disabled={modeService === 'snack' ? ticketItems.length === 0 : !currentTableOrder || currentTableOrder.items.length === 0}
            onClick={handlePayerClick}
            className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-sm shadow-glow transition-transform active:scale-95 disabled:opacity-40"
          >
            💳 ENCAISSER #BAR
          </button>
        </div>
      </div>

      {/* MODAL PAIEMENT CASH / MOMO / CREDIT + PHOTO CAISSIÈRE */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 w-full max-w-md shadow-glow relative">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-brand-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-black text-white mb-1">Encaissement Caisse</h2>
            <p className="text-xs text-gray-400 mb-4">
              Montant total : <strong className="text-brand-orange text-base">{(modeService === 'snack' ? totalAmountSnack : currentTableTotal).toLocaleString('fr-FR')} FCFA</strong>
            </p>

            {/* SELECTION CAISSIÈRE (PHOTO) */}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Caissière effectuant la transaction (Photo) :
              </label>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-black border border-brand-border">
                {currentCaissiere?.photo_url ? (
                  <img src={currentCaissiere.photo_url} alt={currentCaissiere.nom} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                    {currentCaissiere?.nom[0] || 'C'}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-white">{currentCaissiere?.nom || 'Caissière'}</h4>
                  <span className="text-[11px] text-emerald-400 font-semibold">Responsable Caisse</span>
                </div>
              </div>
            </div>

            {/* CHOIX MODE DE PAIEMENT */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold text-gray-300 block">Mode de paiement :</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('cash')}
                  className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMode === 'cash'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-glow'
                      : 'bg-brand-black text-gray-400 border-brand-border'
                  }`}
                >
                  <DollarSign className="w-4 h-4" /> Espèces (Cash)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('momo')}
                  className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMode === 'momo'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-glow'
                      : 'bg-brand-black text-gray-400 border-brand-border'
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> Mobile Money
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('orange_money')}
                  className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMode === 'orange_money'
                      ? 'bg-brand-orange/20 text-brand-orange border-brand-orange shadow-glow'
                      : 'bg-brand-black text-gray-400 border-brand-border'
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> Orange Money
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('credit')}
                  className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMode === 'credit'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500 shadow-glow'
                      : 'bg-brand-black text-gray-400 border-brand-border'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> Carnet Crédit
                </button>
              </div>
            </div>

            <button
              onClick={handleConfirmPayment}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-base shadow-glow transition-transform active:scale-95"
            >
              ✅ VALIDER & GÉNÉRER FACTURE #BAR
            </button>
          </div>
        </div>
      )}

      {/* MODAL REÇU FINAL */}
      {isReceiptModalOpen && lastVente && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 w-full max-w-md shadow-glow relative text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-xl font-black text-white">Vente Enregistrée !</h2>
            <p className="text-xs text-brand-orange font-bold mt-1">Facture {lastVente.numero_facture}</p>

            <div className="my-4 p-3 rounded-2xl bg-brand-black border border-brand-border text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Montant total :</span>
                <span className="font-bold text-amber-400">{lastVente.total_amount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Serveuse :</span>
                <span className="font-bold text-white">{lastVente.serveuse?.nom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Caissière :</span>
                <span className="font-bold text-white">{lastVente.caissiere?.nom}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={handlePrintPDF}
                className="py-3 px-4 rounded-2xl bg-brand-black hover:bg-brand-hover border border-brand-border text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-brand-orange" />
                Imprimer / PDF
              </button>

              <button
                onClick={() => shareReceiptWhatsApp(lastVente)}
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                WhatsApp
              </button>
            </div>

            <button
              onClick={() => setIsReceiptModalOpen(false)}
              className="w-full py-3 rounded-2xl bg-brand-orange text-white font-bold text-sm"
            >
              Nouvelle Commande
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
