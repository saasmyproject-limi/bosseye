'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  Beer,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Search,
  CreditCard,
  UserCheck,
  Receipt,
  Tag,
  Split,
  Printer,
  X,
  User,
  UserPlus,
  Edit2,
  RotateCcw
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import {
  Produit,
  Etablissement,
  Utilisateur,
  Client,
  Facture,
} from '@/types';

export interface ClientOrderItem {
  produit: Produit;
  quantite: number;
  prix_unitaire: number;
}

export interface TableClientOrder {
  id: string;
  nom: string;
  items: ClientOrderItem[];
}

export default function BarVentesPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Tables Bar State (Multi-factures clients par table)
  const [tablesState, setTablesState] = useState<Record<string, TableClientOrder[]>>({
    'Table 01': [
      {
        id: 'c-t1-pierre',
        nom: 'Pierre (Facture A)',
        items: [
          {
            produit: { id: 'prod-beaufort', nom: 'Beaufort Lager 65cl', categorie: 'Bière', unite: 'bouteille', quantite_totale: 100, seuil_alerte: 10, prix_vente_bouteille: 650, cout_achat_unitaire_cmp: 271, etablissement_id: '', actif: true },
            quantite: 4,
            prix_unitaire: 650,
          },
        ],
      },
      {
        id: 'c-t1-raoul',
        nom: 'Raoul (Facture B)',
        items: [
          {
            produit: { id: 'prod-33export', nom: '33 Export 65cl', categorie: 'Bière', unite: 'bouteille', quantite_totale: 120, seuil_alerte: 10, prix_vente_bouteille: 500, cout_achat_unitaire_cmp: 250, etablissement_id: '', actif: true },
            quantite: 3,
            prix_unitaire: 500,
          },
        ],
      },
    ],
    'Table 02': [{ id: 'c-t2-1', nom: 'Client 1 (Facture A)', items: [] }],
    'Table 03': [{ id: 'c-t3-1', nom: 'Client 1 (Facture A)', items: [] }],
  });

  const [activeTableNumber, setActiveTableNumber] = useState<string>('Table 01');
  const [activeClientId, setActiveClientId] = useState<string>('c-t1-pierre');
  const [checkoutTarget, setCheckoutTarget] = useState<'client_actuel' | 'toute_la_table'>('toute_la_table');
  const [editingClientNameId, setEditingClientNameId] = useState<string | null>(null);
  const [editingClientNameValue, setEditingClientNameValue] = useState<string>('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'orange_money' | 'mtn_momo' | 'credit'>('cash');
  const [remiseInput, setRemiseInput] = useState<number>(0);
  const [acompteCreditInput, setAcompteCreditInput] = useState<number>(0);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isNewClientMode, setIsNewClientMode] = useState<boolean>(false);
  const [newClientNom, setNewClientNom] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');
  const [lastCreatedFacture, setLastCreatedFacture] = useState<Facture | null>(null);
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

  const handleAddTable = () => {
    setTablesState((prev) => {
      const existingNumbers = Object.keys(prev).map((name) => {
        const match = name.match(/Table (\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      });
      const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const nextNum = String(maxNum + 1).padStart(2, '0');
      const newTableName = `Table ${nextNum}`;
      return {
        ...prev,
        [newTableName]: [{ id: `c-${newTableName}-${Date.now()}`, nom: 'Client 1 (Facture A)', items: [] }],
      };
    });
  };

  const handleDeleteTable = (tNum: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (Object.keys(tablesState).length <= 1) return;
    setTablesState((prev) => {
      const copy = { ...prev };
      delete copy[tNum];
      return copy;
    });
    if (activeTableNumber === tNum) {
      const remaining = Object.keys(tablesState).filter((t) => t !== tNum);
      if (remaining.length > 0) {
        handleSelectTable(remaining[0]);
      }
    }
  };

  const handleSelectTable = (tNum: string) => {
    setActiveTableNumber(tNum);
    const clientsInTable = tablesState[tNum] || [];
    if (clientsInTable.length > 0) {
      setActiveClientId(clientsInTable[0].id);
    }
  };

  const currentTableClients = tablesState[activeTableNumber] || [];
  const activeClientObj = currentTableClients.find((c) => c.id === activeClientId) || currentTableClients[0];

  const handleAddClientToTable = () => {
    const letter = String.fromCharCode(65 + currentTableClients.length);
    const newId = `c-${activeTableNumber}-${Date.now()}`;
    const newObj: TableClientOrder = {
      id: newId,
      nom: `Client ${currentTableClients.length + 1} (Facture ${letter})`,
      items: [],
    };
    setTablesState((prev) => ({
      ...prev,
      [activeTableNumber]: [...(prev[activeTableNumber] || []), newObj],
    }));
    setActiveClientId(newId);
  };

  const handleAddItemToActiveClient = (p: Produit) => {
    if (!activeClientObj) return;
    const price = p.prix_vente_bouteille || p.prix_vente_unitaire || 0;

    setTablesState((prev) => {
      const tClients = prev[activeTableNumber] || [];
      const updatedClients = tClients.map((c) => {
        if (c.id !== activeClientObj.id) return c;
        const existingIdx = c.items.findIndex((it) => it.produit.id === p.id);
        let newItems = [...c.items];
        if (existingIdx >= 0) {
          newItems[existingIdx] = {
            ...newItems[existingIdx],
            quantite: newItems[existingIdx].quantite + 1,
          };
        } else {
          newItems.push({ produit: p, quantite: 1, prix_unitaire: price });
        }
        return { ...c, items: newItems };
      });
      return { ...prev, [activeTableNumber]: updatedClients };
    });
  };

  const handleUpdateItemQty = (cId: string, pId: string, delta: number) => {
    setTablesState((prev) => {
      const tClients = prev[activeTableNumber] || [];
      const updatedClients = tClients.map((c) => {
        if (c.id !== cId) return c;
        const newItems = c.items
          .map((it) => {
            if (it.produit.id !== pId) return it;
            const newQty = it.quantite + delta;
            return newQty <= 0 ? null : { ...it, quantite: newQty };
          })
          .filter(Boolean) as ClientOrderItem[];
        return { ...c, items: newItems };
      });
      return { ...prev, [activeTableNumber]: updatedClients };
    });
  };

  const totalTableAmount = currentTableClients.reduce(
    (acc, c) => acc + c.items.reduce((sum, it) => sum + it.quantite * it.prix_unitaire, 0),
    0
  );

  const activeClientAmount = (activeClientObj?.items || []).reduce(
    (acc, it) => acc + it.quantite * it.prix_unitaire,
    0
  );

  const handleFinalizeEncaissementTable = (e: React.FormEvent) => {
    e.preventDefault();
    let targetClientId = selectedClientId;

    if (isNewClientMode && newClientNom.trim()) {
      const newCl = offlineDB.addClient({
        nom: newClientNom.trim(),
        telephone_whatsapp: newClientPhone.trim(),
      });
      targetClientId = newCl.id;
    }

    const itemsToPay: ClientOrderItem[] = [];
    if (checkoutTarget === 'client_actuel' && activeClientObj) {
      itemsToPay.push(...activeClientObj.items);
    } else {
      currentTableClients.forEach((c) => itemsToPay.push(...c.items));
    }

    if (itemsToPay.length === 0) return;

    const totalBeforeRemise = itemsToPay.reduce((acc, it) => acc + it.quantite * it.prix_unitaire, 0);
    const finalAmount = Math.max(0, totalBeforeRemise - remiseInput);
    const isCredit = paymentMode === 'credit';
    const mPaye = isCredit ? acompteCreditInput : finalAmount;

    const fac = offlineDB.createFacture({
      client_id: targetClientId || undefined,
      lignes: itemsToPay.map((it) => ({
        produit_id: it.produit.id,
        nom_produit: it.produit.nom,
        quantite_bouteilles: it.quantite,
        prix_unitaire: it.prix_unitaire,
      })),
      remise: remiseInput,
      mode_paiement: isCredit ? 'credit' : (paymentMode as any),
      montant_paye: mPaye,
      transaction_id: `BAR-${activeTableNumber}-${Date.now()}`,
    });

    setLastCreatedFacture(fac);

    // Vider les items payés de la table
    setTablesState((prev) => {
      const tClients = prev[activeTableNumber] || [];
      if (checkoutTarget === 'client_actuel' && activeClientObj) {
        const updated = tClients.map((c) => (c.id === activeClientObj.id ? { ...c, items: [] } : c));
        return { ...prev, [activeTableNumber]: updated };
      } else {
        const updated = tClients.map((c) => ({ ...c, items: [] }));
        return { ...prev, [activeTableNumber]: updated };
      }
    });

    setIsPaymentModalOpen(false);
    setRemiseInput(0);
    setAcompteCreditInput(0);
    setIsNewClientMode(false);
    setNewClientNom('');
    setNewClientPhone('');
    loadData();
  };

  const filteredProduits = produits.filter((p) => {
    if (!p) return false;
    return (
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categorie.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              Module Bar & Plan de Tables
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Gestion des Tables & Additions Clients Bar
            </h1>
          </div>

          <button
            onClick={handleAddTable}
            className="py-3 px-5 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#E8A33D]" />
            <span>+ Ajouter une Table</span>
          </button>
        </div>

        {/* Sélection des Tables du Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E2D5C3]">
          {Object.keys(tablesState).map((tNum) => {
            const isActive = activeTableNumber === tNum;
            const tClients = tablesState[tNum] || [];
            const tTotal = tClients.reduce((acc, c) => acc + c.items.reduce((sum, it) => sum + it.quantite * it.prix_unitaire, 0), 0);
            const isOccupied = tTotal > 0;

            return (
              <div
                key={tNum}
                onClick={() => handleSelectTable(tNum)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all min-w-[130px] flex items-center justify-between relative group ${
                  isActive
                    ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md font-black'
                    : isOccupied
                    ? 'bg-amber-100/80 text-amber-950 border-amber-300 font-bold'
                    : 'bg-white text-gray-700 border-[#E2D5C3] font-medium'
                }`}
              >
                <div>
                  <p className="text-xs font-black truncate">{tNum}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    {isOccupied ? `${tTotal.toLocaleString('fr-FR')} F` : 'Libre'}
                  </p>
                </div>

                {Object.keys(tablesState).length > 1 && (
                  <button
                    onClick={(e) => handleDeleteTable(tNum, e)}
                    className="p-1 opacity-60 hover:opacity-100 hover:bg-red-200 rounded text-red-700"
                    title="Supprimer la table"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Grille Principale Bar : Catalogue Boissons (Gauches) vs Factures Table (Droite) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Catalogue Boissons (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Rechercher une bière, boisson..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-9 pr-4 py-3 text-xs font-bold text-[#1B4332]"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto pr-1">
              {filteredProduits.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddItemToActiveClient(p)}
                  className="p-3.5 rounded-2xl bg-white border border-[#E2D5C3] hover:border-[#B8442C] cursor-pointer transition-all shadow-sm space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[9px] font-black text-[#B8442C] uppercase bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                      {p.categorie}
                    </span>
                    <h4 className="font-serif font-black text-sm text-[#1B4332] mt-1">{p.nom}</h4>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F3ECE0]">
                    <span className="font-black text-xs text-[#1B4332]">
                      {(p.prix_vente_bouteille || p.prix_vente_unitaire || 0).toLocaleString('fr-FR')} F
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      {p.casiers_pleins || 0} casiers
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fiches Factures Clients de la Table Active (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-lg text-[#1B4332] flex items-center gap-2">
                  <Beer className="w-5 h-5 text-[#B8442C]" />
                  {activeTableNumber} (Addition Bar)
                </h3>

                <button
                  onClick={handleAddClientToTable}
                  className="text-xs font-bold text-[#B8442C] bg-[#B8442C]/10 px-3 py-1.5 rounded-xl border border-[#B8442C]/30 hover:bg-[#B8442C] hover:text-white transition-all"
                >
                  + Séparer Client / Facture
                </button>
              </div>

              {/* Onglets Clients de la Table */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {currentTableClients.map((c) => {
                  const isSelected = c.id === activeClientId;
                  const cTotal = c.items.reduce((sum, it) => sum + it.quantite * it.prix_unitaire, 0);

                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveClientId(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#1B4332] text-white shadow-sm'
                          : 'bg-[#FBF7EF] text-gray-700 border border-[#E2D5C3]'
                      }`}
                    >
                      <span>{c.nom}</span>
                      <span className="text-[10px] font-black opacity-80">({cTotal.toLocaleString('fr-FR')} F)</span>
                    </button>
                  );
                })}
              </div>

              {/* Liste des Consommations du Client Sélectionné */}
              {activeClientObj && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">
                    Consommations pour : {activeClientObj.nom}
                  </span>

                  {activeClientObj.items.length === 0 ? (
                    <div className="p-6 text-center bg-[#FBF7EF] rounded-2xl border border-dashed border-[#E2D5C3] text-gray-500 text-xs font-medium">
                      Cliquez sur une boisson à gauche pour l'ajouter à cette facture.
                    </div>
                  ) : (
                    activeClientObj.items.map((it) => (
                      <div key={it.produit.id} className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between text-xs">
                        <div className="truncate pr-2">
                          <p className="font-bold text-[#1B4332] truncate">{it.produit.nom}</p>
                          <p className="text-[10px] text-gray-500">{it.prix_unitaire.toLocaleString('fr-FR')} F/btl</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white border border-[#E2D5C3] rounded-xl p-1">
                            <button
                              onClick={() => handleUpdateItemQty(activeClientObj.id, it.produit.id, -1)}
                              className="p-1 hover:bg-[#F3ECE0] rounded text-gray-700"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-black px-1.5">{it.quantite}</span>
                            <button
                              onClick={() => handleUpdateItemQty(activeClientObj.id, it.produit.id, 1)}
                              className="p-1 hover:bg-[#F3ECE0] rounded text-gray-700"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-black text-[#1B4332] w-16 text-right">
                            {(it.quantite * it.prix_unitaire).toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Total Table & Encaissement Bar */}
            <div className="pt-3 border-t border-[#E2D5C3] space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Facture {activeClientObj?.nom} :</span>
                  <span className="font-serif font-black text-base text-[#1B4332]">
                    {activeClientAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-[#B8442C]">
                  <span>Total Toute la Table :</span>
                  <span className="font-serif font-black text-xl">
                    {totalTableAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={activeClientAmount === 0}
                  onClick={() => {
                    setCheckoutTarget('client_actuel');
                    setIsPaymentModalOpen(true);
                  }}
                  className="py-3 px-3 rounded-2xl bg-[#1B4332] disabled:bg-gray-300 text-white font-black text-xs shadow flex items-center justify-center gap-1"
                >
                  <span>Encaisser {activeClientObj?.nom}</span>
                </button>

                <button
                  disabled={totalTableAmount === 0}
                  onClick={() => {
                    setCheckoutTarget('toute_la_table');
                    setIsPaymentModalOpen(true);
                  }}
                  className="py-3 px-3 rounded-2xl bg-[#B8442C] disabled:bg-gray-300 text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-1"
                >
                  <span>Encaisser Toute la Table ➔</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL ENCAISSEMENT BAR */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleFinalizeEncaissementTable} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">
                  Encaissement Facture Bar ({checkoutTarget === 'client_actuel' ? activeClientObj?.nom : 'Toute la Table'})
                </h3>
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Choix Client / Habitué */}
              <div className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B4332]">Client Habitué (Obligatoire pour Ardoise / Crédit)</span>
                  <button
                    type="button"
                    onClick={() => setIsNewClientMode(!isNewClientMode)}
                    className="text-[11px] font-bold text-[#B8442C] underline"
                  >
                    {isNewClientMode ? 'Client Existant' : '+ Nouveau Client Bar'}
                  </button>
                </div>

                {isNewClientMode ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Nom Client *"
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
                    <option value="">Client Anonyme (Table)</option>
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
                <label className="text-xs font-bold text-[#1B4332] block mb-2">Sélectionnez le Mode de Règlement</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: '💵 Cash' },
                    { id: 'orange_money', label: '🟧 Orange' },
                    { id: 'mtn_momo', label: '🟡 MoMo' },
                    { id: 'credit', label: '💳 Ardoise' },
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
                  {Math.max(
                    0,
                    (checkoutTarget === 'client_actuel' ? activeClientAmount : totalTableAmount) - remiseInput
                  ).toLocaleString('fr-FR')}{' '}
                  FCFA
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
                  Valider & Générer Ticket Bar ➔
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
