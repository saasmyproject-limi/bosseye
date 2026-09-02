'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Utensils,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Search,
  CreditCard,
  UserCheck,
  Receipt,
  Tag,
  User,
  X,
  UserPlus
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import {
  Produit,
  Etablissement,
  Utilisateur,
  Client,
  Facture,
  Caisse,
} from '@/types';

export interface SnackCartItem {
  produit: Produit;
  quantite: number;
  prix_unitaire: number;
}

export default function SnackVentesPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [caisses, setCaisses] = useState<Caisse[]>([]);
  const [selectedCaisseId, setSelectedCaisseId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Panier Commande Snack Express
  const [cart, setCart] = useState<SnackCartItem[]>([]);

  // Serveuse / Caissière sélectionnée pour l'encaissement
  const [selectedServeuseId, setSelectedServeuseId] = useState<string>('');

  // Modal Encaissement
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'orange_money' | 'mtn_momo' | 'credit'>('cash');
  const [remiseInput, setRemiseInput] = useState<number>(0);
  const [acompteCreditInput, setAcompteCreditInput] = useState<number>(0);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isNewClientMode, setIsNewClientMode] = useState<boolean>(false);
  const [newClientNom, setNewClientNom] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');
  const [lastCreatedFacture, setLastCreatedFacture] = useState<Facture | null>(null);

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
      const caissesList = offlineDB.getCaisses();
      setCaisses(caissesList);
      if (caissesList.length > 0) setSelectedCaisseId(caissesList[0].id);
    } catch (e) { console.error(e); }
  };

  const filteredProduits = produits.filter((p) => {
    if (!p) return false;
    return (
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categorie.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleAddToCart = (p: Produit) => {
    const price = p.prix_vente_unitaire || p.prix_vente_bouteille || 0;
    const existingIndex = cart.findIndex((item) => item.produit.id === p.id);

    if (existingIndex >= 0) {
      const copy = [...cart];
      copy[existingIndex].quantite += 1;
      setCart(copy);
    } else {
      setCart([...cart, { produit: p, quantite: 1, prix_unitaire: price }]);
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

  const handleFinalizeEncaissement = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    let targetClientId = selectedClientId;

    if (isNewClientMode && newClientNom.trim()) {
      const newCl = offlineDB.addClient({
        nom: newClientNom.trim(),
        telephone_whatsapp: newClientPhone.trim(),
      });
      targetClientId = newCl.id;
    }

    const isCredit = paymentMode === 'credit';
    const mPaye = isCredit ? acompteCreditInput : cartTotalFinal;

    const fac = offlineDB.createFacture({
      client_id: targetClientId || undefined,
      caissiere_id: currentUser?.id,
      serveuse_id: selectedServeuseId || undefined,
      lignes: cart.map((item) => ({
        produit_id: item.produit.id,
        nom_produit: item.produit.nom,
        quantite_bouteilles: item.quantite,
        prix_unitaire: item.prix_unitaire,
      })),
      remise: remiseInput,
      mode_paiement: isCredit ? 'credit' : (paymentMode as any),
      montant_paye: mPaye,
      transaction_id: `SNACK-${Date.now()}`,
    });

    setLastCreatedFacture(fac);
    setIsPaymentModalOpen(false);
    setCart([]);
    setRemiseInput(0);
    setAcompteCreditInput(0);
    setIsNewClientMode(false);
    setNewClientNom('');
    setNewClientPhone('');
    loadData();
  };

  return (
    <AppLayout>
        {/* Top Header Snack */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              Module Caisse & Restauration Snack
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Prise de Commande Express & Caisses
            </h1>
          </div>

          {/* Sélecteur de caisse active */}
          {caisses.length > 0 && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#E2D5C3]">
              <span className="text-xs font-bold text-gray-600">Caisse Active :</span>
              <select
                value={selectedCaisseId}
                onChange={(e) => setSelectedCaisseId(e.target.value)}
                className="bg-[#F3ECE0] border border-[#E2D5C3] rounded-xl p-1.5 text-xs font-bold text-[#1B4332]"
              >
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom_caisse} ({c.active ? 'Ouverte' : 'Fermée'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Grille Principale Snack */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Menu / Plats à Gauche (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Rechercher un plat, boisson..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-9 pr-4 py-3 text-xs font-bold text-[#1B4332]"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredProduits.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddToCart(p)}
                  className="p-3.5 rounded-2xl bg-white border border-[#E2D5C3] hover:border-[#B8442C] cursor-pointer transition-all shadow-sm space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[9px] font-black text-[#B8442C] uppercase bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                      {p.categorie}
                    </span>
                    <h4 className="font-serif font-black text-sm text-[#1B4332] mt-1 line-clamp-2">{p.nom}</h4>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F3ECE0]">
                    <span className="font-black text-xs text-[#1B4332]">
                      {(p.prix_vente_unitaire || p.prix_vente_bouteille || 0).toLocaleString('fr-FR')} F
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {p.quantite_totale} pcs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket de caisse Snack à Droite (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-lg text-[#1B4332] flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#B8442C]" />
                  Commande Caisse
                </h3>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs font-bold text-red-600 hover:underline">
                    Vider
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center bg-[#FBF7EF] rounded-2xl border border-dashed border-[#E2D5C3] text-gray-500 text-xs font-medium">
                  Cliquez sur un plat ou boisson pour l'ajouter au ticket de caisse.
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between text-xs">
                      <div className="flex-1 truncate pr-2">
                        <p className="font-bold text-[#1B4332] truncate">{item.produit.nom}</p>
                        <p className="text-[10px] text-gray-500 font-medium">
                          {item.prix_unitaire.toLocaleString('fr-FR')} F/portion
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

            {/* Total & Encaissement Caisse Snack */}
            <div className="pt-4 border-t border-[#E2D5C3] space-y-3">
              <div className="flex justify-between items-center text-sm font-bold">
                <span>Total Ticket Caisse :</span>
                <span className="font-serif font-black text-xl text-[#1B4332]">
                  {cartSousTotal.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-4 rounded-2xl bg-[#B8442C] disabled:bg-gray-300 text-white font-black text-sm shadow-glow-brique flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <CreditCard className="w-5 h-5" />
                <span>Encaisser & Imprimer Ticket ➔</span>
              </button>
            </div>
          </div>
        </div>

        {/* MODAL ENCAISSEMENT SNACK */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleFinalizeEncaissement} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Encaissement Caisse Snack</h3>
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Choix Client */}
              <div className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B4332]">Client (Facultatif ou Obligatoire pour Crédit)</span>
                  <button
                    type="button"
                    onClick={() => setIsNewClientMode(!isNewClientMode)}
                    className="text-[11px] font-bold text-[#B8442C] underline"
                  >
                    {isNewClientMode ? 'Client Existant' : '+ Nouveau Client'}
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
                    <option value="">Client Anonyme (Comptoir)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.telephone_whatsapp || 'Sans tel'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Mode de Paiement */}
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-2">Mode de Règlement</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: '💵 Cash' },
                    { id: 'orange_money', label: '🟧 Orange' },
                    { id: 'mtn_momo', label: '🟡 MoMo' },
                    { id: 'credit', label: '💳 Crédit' },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPaymentMode(m.id as any)}
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

              {/* Remise */}
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

                {paymentMode === 'credit' && (
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Acompte Perçu (FCFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={acompteCreditInput}
                      onChange={(e) => setAcompteCreditInput(Number(e.target.value))}
                      className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#1B4332] text-white flex justify-between items-center">
                <span className="text-xs font-bold">MONTANT A ENCAISSER :</span>
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
                  Valider la Commande Snack ➔
                </button>
              </div>
            </form>
          </div>
        )}
    </AppLayout>
  );
}
