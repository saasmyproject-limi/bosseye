'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import BarReceiptModal from '@/components/BarReceiptModal';
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
  Gift,
  Split,
  Printer,
  X,
  UserPlus,
  Clock,
  Utensils,
  ChevronRight
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import {
  Produit,
  Etablissement,
  Utilisateur,
  Client,
  Facture,
  SessionBar,
  LigneSessionBar
} from '@/types';

export default function BarVentesPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<SessionBar[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'tous' | 'boissons' | 'nourriture'>('tous');

  // Table sélectionnée (repère physique)
  const [activeTableNumber, setActiveTableNumber] = useState<string>('Table 01');
  // Session sélectionnée parmi celles de la table active
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Modals & Options
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'globale' | 'division_egale' | 'sur_mesure'>('globale');
  const [splitCount, setSplitCount] = useState<number>(2);
  const [selectedLigneIds, setSelectedLigneIds] = useState<string[]>([]);

  // Cadeau / Table de service option
  const [giftTableTarget, setGiftTableTarget] = useState<string>('');
  const [isGiftMode, setIsGiftMode] = useState<boolean>(false);

  // Paiement details
  const [paymentMode, setPaymentMode] = useState<'cash' | 'orange_money' | 'mtn_momo' | 'credit'>('cash');
  const [remiseInput, setRemiseInput] = useState<number>(0);
  const [acompteCreditInput, setAcompteCreditInput] = useState<number>(0);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isNewClientMode, setIsNewClientMode] = useState<boolean>(false);
  const [newClientNom, setNewClientNom] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');

  // Impression Ticket Thermique
  const [createdFactureForReceipt, setCreatedFactureForReceipt] = useState<Facture | null>(null);
  const [receiptSplitInfo, setReceiptSplitInfo] = useState<{ partNumber: number; totalParts: number } | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      const user = offlineDB.getCurrentUser();
      const prods = offlineDB.getProduits();
      const cls = offlineDB.getClients();
      let sessList = offlineDB.getSessionsBar().filter((s) => s.statut === 'active');

      // Si aucune session active n'existe, créer des sessions initiales démo
      if (sessList.length === 0) {
        const demoSession1: SessionBar = {
          id: `ses-demo-1`,
          etablissement_id: etab.id,
          numero_session: 'SES-0001',
          table_numero: 'Table 01',
          nom_client_session: 'Session Paul (Facture A)',
          serveuse_id: user?.id || 'user-1',
          serveuse_nom: user?.nom || 'Serveuse Bar',
          statut: 'active',
          created_at: new Date().toISOString(),
          lignes: [
            {
              id: `lig-demo-1`,
              produit_id: prods[0]?.id || 'p-1',
              nom_produit: prods[0]?.nom || 'Beaufort Lager 65cl',
              categorie_type: 'boisson',
              quantite: 3,
              prix_unitaire: prods[0]?.prix_vente_bouteille || 650,
              sous_total: (prods[0]?.prix_vente_bouteille || 650) * 3,
              serveuse_id: user?.id,
              serveuse_nom: user?.nom,
              created_at: new Date().toISOString(),
            },
          ],
        };

        const demoSession2: SessionBar = {
          id: `ses-demo-2`,
          etablissement_id: etab.id,
          numero_session: 'SES-0002',
          table_numero: 'Table 01',
          nom_client_session: 'Session Marc (Facture B)',
          serveuse_id: user?.id || 'user-1',
          serveuse_nom: user?.nom || 'Serveuse Bar',
          statut: 'active',
          created_at: new Date().toISOString(),
          lignes: [],
        };

        offlineDB.saveSessionBar(demoSession1);
        offlineDB.saveSessionBar(demoSession2);
        sessList = [demoSession1, demoSession2];
      }

      setEtablissement(etab);
      setCurrentUser(user);
      setProduits(prods);
      setClients(cls);
      setSessions(sessList);

      // Auto-sélectionner la première session si nécessaire
      if (sessList.length > 0) {
        const activeSess = sessList.find((s) => s.table_numero === activeTableNumber) || sessList[0];
        setActiveSessionId(activeSess.id);
        setActiveTableNumber(activeSess.table_numero);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Liste des numéros de tables uniques existants
  const tableNumbersList = Array.from(
    new Set([...sessions.map((s) => s.table_numero), 'Table 01', 'Table 02', 'Table 03', 'Table 04'])
  ).sort();

  // Sessions rattachées à la table physique active
  const currentTableSessions = sessions.filter((s) => s.table_numero === activeTableNumber && s.statut === 'active');
  const activeSessionObj = sessions.find((s) => s.id === activeSessionId) || currentTableSessions[0];

  // Gestion des tables physiques
  const handleAddTable = () => {
    const existingNums = tableNumbersList.map((t) => {
      const match = t.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    const nextNumStr = `Table ${String(maxNum + 1).padStart(2, '0')}`;
    
    // Créer une première session pour cette nouvelle table
    handleAddSessionToTable(nextNumStr);
    setActiveTableNumber(nextNumStr);
  };

  // Créer une nouvelle session indépendante sur la même table
  const handleAddSessionToTable = (tNum: string = activeTableNumber) => {
    const etab = offlineDB.getEtablissement();
    const countOnTable = sessions.filter((s) => s.table_numero === tNum).length;
    const letter = String.fromCharCode(65 + countOnTable);
    const newSessionId = `ses-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const newSession: SessionBar = {
      id: newSessionId,
      etablissement_id: etab.id,
      numero_session: `SES-${Math.floor(1000 + Math.random() * 9000)}`,
      table_numero: tNum,
      nom_client_session: `Client ${countOnTable + 1} (Session ${letter})`,
      serveuse_id: currentUser?.id || 'user-1',
      serveuse_nom: currentUser?.nom || 'Serveuse',
      statut: 'active',
      lignes: [],
      created_at: new Date().toISOString(),
    };

    offlineDB.saveSessionBar(newSession);
    loadData();
    setActiveSessionId(newSessionId);
    setActiveTableNumber(tNum);
  };

  // Ajouter un article à la session active
  const handleAddItemToSession = (p: Produit) => {
    if (!activeSessionObj) return;

    const price = p.prix_vente_bouteille || p.prix_vente_unitaire || 0;
    const catLower = (p.categorie || '').toLowerCase();
    const isFood = ['plat', 'nourriture', 'grillade', 'repas', 'cuisine', 'snack'].some((k) => catLower.includes(k));

    const newLigne: LigneSessionBar = {
      id: `lig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      produit_id: p.id,
      nom_produit: p.nom,
      categorie_type: isFood ? 'plat' : 'boisson',
      quantite: 1,
      prix_unitaire: price,
      sous_total: price,
      table_service: isGiftMode && giftTableTarget ? giftTableTarget : undefined,
      serveuse_id: currentUser?.id,
      serveuse_nom: currentUser?.nom,
      created_at: new Date().toISOString(),
    };

    // Chercher si la même ligne (même produit et même table de service) existe déjà dans la session
    const existingIdx = activeSessionObj.lignes.findIndex(
      (l) => l.produit_id === p.id && (l.table_service || '') === (newLigne.table_service || '')
    );

    let updatedLignes = [...activeSessionObj.lignes];
    if (existingIdx >= 0) {
      const existing = updatedLignes[existingIdx];
      const newQty = existing.quantite + 1;
      updatedLignes[existingIdx] = {
        ...existing,
        quantite: newQty,
        sous_total: newQty * existing.prix_unitaire,
      };
    } else {
      updatedLignes.push(newLigne);
    }

    const updatedSession: SessionBar = {
      ...activeSessionObj,
      lignes: updatedLignes,
    };

    offlineDB.saveSessionBar(updatedSession);
    loadData();

    if (isGiftMode) {
      setIsGiftMode(false);
      setGiftTableTarget('');
    }
  };

  // Modifier la quantité d'une ligne de session
  const handleUpdateLigneQty = (ligneId: string, delta: number) => {
    if (!activeSessionObj) return;

    const updatedLignes = activeSessionObj.lignes
      .map((l) => {
        if (l.id !== ligneId) return l;
        const newQty = l.quantite + delta;
        if (newQty <= 0) return null;
        return {
          ...l,
          quantite: newQty,
          sous_total: newQty * l.prix_unitaire,
        };
      })
      .filter(Boolean) as LigneSessionBar[];

    const updatedSession: SessionBar = {
      ...activeSessionObj,
      lignes: updatedLignes,
    };

    offlineDB.saveSessionBar(updatedSession);
    loadData();
  };

  // Supprimer une session si elle est vide
  const handleDeleteSession = (sessionId: string) => {
    offlineDB.deleteSessionBar(sessionId);
    loadData();
  };

  // Calculs totaux
  const activeSessionTotal = (activeSessionObj?.lignes || []).reduce((acc, l) => acc + l.sous_total, 0);
  const tableGlobalTotal = currentTableSessions.reduce(
    (acc, s) => acc + s.lignes.reduce((sum, l) => sum + l.sous_total, 0),
    0
  );

  // Validation Encaissement / Clôture Session Bar
  const handleFinalizePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionObj) return;

    let targetClientId = selectedClientId;
    if (isNewClientMode && newClientNom.trim()) {
      const newCl = offlineDB.addClient({
        nom: newClientNom.trim(),
        telephone_whatsapp: newClientPhone.trim(),
      });
      targetClientId = newCl.id;
    }

    if (checkoutMode === 'globale') {
      const finalFac = offlineDB.closeAndPaySessionBar({
        sessionId: activeSessionObj.id,
        mode_paiement: paymentMode,
        remise: remiseInput,
        montant_paye: paymentMode === 'credit' ? acompteCreditInput : Math.max(0, activeSessionTotal - remiseInput),
        client_id: targetClientId || undefined,
      });

      if (finalFac) {
        setCreatedFactureForReceipt(finalFac);
        setReceiptSplitInfo(null);
        setIsReceiptModalOpen(true);
      }
    } else if (checkoutMode === 'division_egale') {
      const parts = Math.max(1, splitCount);
      const partAmount = Math.round(activeSessionTotal / parts);

      // Générer une facture pour la première part et ouvrir le reçu
      const fac = offlineDB.closeAndPaySessionBar({
        sessionId: activeSessionObj.id,
        mode_paiement: paymentMode,
        remise: remiseInput,
        montant_paye: partAmount,
        client_id: targetClientId || undefined,
      });

      if (fac) {
        setCreatedFactureForReceipt(fac);
        setReceiptSplitInfo({ partNumber: 1, totalParts: parts });
        setIsReceiptModalOpen(true);
      }
    } else if (checkoutMode === 'sur_mesure') {
      const selectedLignes = activeSessionObj.lignes.filter((l) => selectedLigneIds.includes(l.id));
      if (selectedLignes.length === 0) return;

      const fac = offlineDB.closeAndPaySessionBar({
        sessionId: activeSessionObj.id,
        mode_paiement: paymentMode,
        remise: remiseInput,
        montant_paye: paymentMode === 'credit' ? acompteCreditInput : Math.max(0, selectedLignes.reduce((a, b) => a + b.sous_total, 0) - remiseInput),
        client_id: targetClientId || undefined,
        lignesPayees: selectedLignes,
      });

      if (fac) {
        setCreatedFactureForReceipt(fac);
        setReceiptSplitInfo(null);
        setIsReceiptModalOpen(true);
      }
    }

    setIsPaymentModalOpen(false);
    setRemiseInput(0);
    setAcompteCreditInput(0);
    setIsNewClientMode(false);
    setNewClientNom('');
    setNewClientPhone('');
    setSelectedLigneIds([]);
    loadData();
  };

  // Produits filtrés par recherche et type (Boissons vs Nourriture)
  const filteredProduits = produits.filter((p) => {
    if (!p) return false;
    const matchQuery =
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categorie.toLowerCase().includes(searchQuery.toLowerCase());

    const catLower = (p.categorie || '').toLowerCase();
    const isFood = ['plat', 'nourriture', 'grillade', 'repas', 'cuisine', 'snack'].some((k) => catLower.includes(k));

    if (categoryFilter === 'boissons') return matchQuery && !isFood;
    if (categoryFilter === 'nourriture') return matchQuery && isFood;
    return matchQuery;
  });

  return (
    <AppLayout>
      {/* Top Header Ventes Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              🍺 Plan de Tables & Factures Bar
            </span>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              Serveuse : {currentUser?.nom || 'Serveuse'}
            </span>
          </div>
          <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
            Gestion des Sessions par Table (Unité de Facturation)
          </h1>
          <p className="text-xs text-gray-600 font-medium">
            Ouvrez et gérez plusieurs sessions indépendantes sur une même table.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddTable}
            className="py-3 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#E8A33D]" />
            <span>+ Ajouter une Table Physique</span>
          </button>
        </div>
      </div>

      {/* Barre de Sélection des Tables Physiques */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E2D5C3]">
        {tableNumbersList.map((tNum) => {
          const isActiveTable = activeTableNumber === tNum;
          const tSessions = sessions.filter((s) => s.table_numero === tNum && s.statut === 'active');
          const tTotal = tSessions.reduce((acc, s) => acc + s.lignes.reduce((sum, l) => sum + l.sous_total, 0), 0);
          const isOccupied = tTotal > 0;

          return (
            <div
              key={tNum}
              onClick={() => {
                setActiveTableNumber(tNum);
                if (tSessions.length > 0) setActiveSessionId(tSessions[0].id);
              }}
              className={`p-3 rounded-2xl border cursor-pointer transition-all min-w-[130px] flex items-center justify-between relative ${
                isActiveTable
                  ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md font-black'
                  : isOccupied
                  ? 'bg-amber-100/90 text-amber-950 border-amber-300 font-bold'
                  : 'bg-white text-gray-700 border-[#E2D5C3] font-medium'
              }`}
            >
              <div>
                <p className="text-xs font-black truncate">{tNum}</p>
                <p className="text-[10px] opacity-80 mt-0.5">
                  {isOccupied ? `${tTotal.toLocaleString('fr-FR')} F (${tSessions.length} sess.)` : 'Libre'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Layout Principal : Catalogue Menu (Gauche 7 cols) vs Sessions Actives Table (Droite 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CATALOGUE MENU : BOISSONS & PLATS (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Recherche & Filtres Catégories */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Rechercher une bière, plat, grillade, soft..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-9 pr-4 py-3 text-xs font-bold text-[#1B4332]"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setCategoryFilter('tous')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  categoryFilter === 'tous'
                    ? 'bg-[#1B4332] text-white font-black'
                    : 'bg-white text-[#1B4332] border border-[#E2D5C3]'
                }`}
              >
                Tout
              </button>
              <button
                onClick={() => setCategoryFilter('boissons')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  categoryFilter === 'boissons'
                    ? 'bg-[#1B4332] text-white font-black'
                    : 'bg-white text-[#1B4332] border border-[#E2D5C3]'
                }`}
              >
                <Beer className="w-3.5 h-3.5" />
                <span>Boissons</span>
              </button>
              <button
                onClick={() => setCategoryFilter('nourriture')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  categoryFilter === 'nourriture'
                    ? 'bg-[#1B4332] text-white font-black'
                    : 'bg-white text-[#1B4332] border border-[#E2D5C3]'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Plats & Grillades</span>
              </button>
            </div>
          </div>

          {/* Option "Cadeau entre tables / Offrir un verre" */}
          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-950 font-bold">
              <Gift className="w-4 h-4 text-purple-700" />
              <span>Option "Offrir un verre / Plat" :</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-purple-900 cursor-pointer flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={isGiftMode}
                  onChange={(e) => setIsGiftMode(e.target.checked)}
                  className="rounded text-purple-700 focus:ring-purple-600"
                />
                <span>Activer Cadeau</span>
              </label>

              {isGiftMode && (
                <select
                  value={giftTableTarget}
                  onChange={(e) => setGiftTableTarget(e.target.value)}
                  className="bg-white border border-purple-300 rounded-xl px-2 py-1 text-xs font-bold text-purple-950"
                >
                  <option value="">Servir à quelle table ?</option>
                  {tableNumbersList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Grille des Articles du Menu */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredProduits.map((p) => {
              const catLower = (p.categorie || '').toLowerCase();
              const isFood = ['plat', 'nourriture', 'grillade', 'repas', 'cuisine', 'snack'].some((k) => catLower.includes(k));

              return (
                <div
                  key={p.id}
                  onClick={() => handleAddItemToSession(p)}
                  className={`p-3.5 rounded-2xl bg-white border hover:border-[#B8442C] cursor-pointer transition-all shadow-sm space-y-2 flex flex-col justify-between ${
                    isFood ? 'border-amber-300 bg-amber-50/30' : 'border-[#E2D5C3]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isFood ? 'bg-amber-200 text-amber-900' : 'bg-[#B8442C]/10 text-[#B8442C]'
                      }`}>
                        {p.categorie}
                      </span>
                      {isFood ? (
                        <Utensils className="w-3.5 h-3.5 text-amber-700" />
                      ) : (
                        <Beer className="w-3.5 h-3.5 text-[#B8442C]" />
                      )}
                    </div>
                    <h4 className="font-serif font-black text-sm text-[#1B4332] mt-1 truncate">{p.nom}</h4>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F3ECE0]">
                    <span className="font-black text-xs text-[#1B4332]">
                      {(p.prix_vente_bouteille || p.prix_vente_unitaire || 0).toLocaleString('fr-FR')} F
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {isFood ? 'Compteur' : `${p.casiers_pleins || 0} casiers`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FICHES SESSIONS & FACTURES DE LA TABLE ACTIVE (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Header Table & Sessions */}
            <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
              <div>
                <h3 className="font-serif font-black text-lg text-[#1B4332]">
                  {activeTableNumber} (Sessions Clients)
                </h3>
                <p className="text-[11px] text-gray-500 font-bold">
                  Total Table : {tableGlobalTotal.toLocaleString('fr-FR')} FCFA
                </p>
              </div>

              <button
                onClick={() => handleAddSessionToTable(activeTableNumber)}
                className="text-xs font-bold text-[#B8442C] bg-[#B8442C]/10 px-3 py-1.5 rounded-xl border border-[#B8442C]/30 hover:bg-[#B8442C] hover:text-white transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nouvelle Session</span>
              </button>
            </div>

            {/* Onglets des Sessions Actives sur cette Table */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {currentTableSessions.map((s) => {
                const isSelected = s.id === activeSessionId;
                const sTotal = s.lignes.reduce((acc, l) => acc + l.sous_total, 0);

                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#1B4332] text-white shadow-md font-black'
                        : 'bg-[#FBF7EF] text-gray-700 border border-[#E2D5C3]'
                    }`}
                  >
                    <span>{s.nom_client_session}</span>
                    <span className="text-[10px] font-black opacity-90">({sTotal.toLocaleString('fr-FR')} F)</span>
                  </button>
                );
              })}
            </div>

            {/* Détail de la Session Sélectionnée */}
            {activeSessionObj && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                  <span>Ouvert par : {activeSessionObj.serveuse_nom}</span>
                  <button
                    onClick={() => handleDeleteSession(activeSessionObj.id)}
                    className="text-red-600 hover:underline text-[10px]"
                  >
                    Supprimer session
                  </button>
                </div>

                {/* Liste des Consommations de cette Session */}
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {activeSessionObj.lignes.length === 0 ? (
                    <div className="p-6 text-center bg-[#FBF7EF] rounded-2xl border border-dashed border-[#E2D5C3] text-gray-500 text-xs font-medium">
                      Cliquez sur une boisson ou un plat à gauche pour l'ajouter à cette session.
                    </div>
                  ) : (
                    activeSessionObj.lignes.map((l) => (
                      <div
                        key={l.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                          l.table_service ? 'bg-purple-50 border-purple-200' : 'bg-[#FBF7EF] border-[#E2D5C3]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold text-[#1B4332] truncate">{l.nom_produit}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span>{l.prix_unitaire.toLocaleString('fr-FR')} F/unité</span>
                            {l.table_service && (
                              <span className="font-black text-purple-700 bg-purple-100 px-1.5 rounded">
                                🎁 Servir à {l.table_service}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white border border-[#E2D5C3] rounded-xl p-1">
                            <button
                              onClick={() => handleUpdateLigneQty(l.id, -1)}
                              className="p-1 hover:bg-[#F3ECE0] rounded text-gray-700"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-black px-1.5">{l.quantite}</span>
                            <button
                              onClick={() => handleUpdateLigneQty(l.id, 1)}
                              className="p-1 hover:bg-[#F3ECE0] rounded text-gray-700"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-black text-[#1B4332] w-16 text-right">
                            {l.sous_total.toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions Encaissement Session Bar */}
          <div className="pt-3 border-t border-[#E2D5C3] space-y-3">
            <div className="flex justify-between items-center text-xs font-bold">
              <span>Facture {activeSessionObj?.nom_client_session} :</span>
              <span className="font-serif font-black text-xl text-[#1B4332]">
                {activeSessionTotal.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={activeSessionTotal === 0}
                onClick={() => {
                  setCheckoutMode('globale');
                  setIsPaymentModalOpen(true);
                }}
                className="py-3 px-3 rounded-2xl bg-[#1B4332] disabled:bg-gray-300 text-white font-black text-xs shadow flex items-center justify-center gap-1"
              >
                <span>Encaisser Session Globale</span>
              </button>

              <button
                disabled={activeSessionTotal === 0}
                onClick={() => {
                  setCheckoutMode('division_egale');
                  setIsPaymentModalOpen(true);
                }}
                className="py-3 px-3 rounded-2xl bg-[#B8442C] disabled:bg-gray-300 text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-1"
              >
                <Split className="w-3.5 h-3.5" />
                <span>Diviser Addition ➔</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL ENCAISSEMENT & DIVISION FACTURE BAR */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleFinalizePayment}
            className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                Encaissement : {activeSessionObj?.nom_client_session} ({activeTableNumber})
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode d'addition : Globale vs Division N parts vs Sur-mesure */}
            <div className="p-3 rounded-2xl bg-white border border-[#E2D5C3] space-y-2">
              <label className="text-xs font-bold text-[#1B4332] block">Format de Division de la Facture</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'globale', label: '1 Ticket Total' },
                  { id: 'division_egale', label: '÷ N Parts Égales' },
                  { id: 'sur_mesure', label: 'Sélection Articles' },
                ].map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setCheckoutMode(m.id as any)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold text-center transition-all ${
                      checkoutMode === m.id
                        ? 'bg-[#1B4332] text-white font-black shadow'
                        : 'bg-[#FBF7EF] text-gray-700 border border-[#E2D5C3]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {checkoutMode === 'division_egale' && (
                <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-950 bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <span>Nombre de personnes à diviser :</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                      className="px-2 py-0.5 bg-white border rounded font-black"
                    >
                      -
                    </button>
                    <span className="font-black text-sm">{splitCount} pers</span>
                    <button
                      type="button"
                      onClick={() => setSplitCount(splitCount + 1)}
                      className="px-2 py-0.5 bg-white border rounded font-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Client / Habitué */}
            <div className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1B4332]">Client Habitué (Requis si Ardoise)</span>
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
                  <option value="">Client Anonyme (Comptoir / Table)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.telephone_whatsapp || 'Sans numéro'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Mode de Règlement */}
            <div>
              <label className="text-xs font-bold text-[#1B4332] block mb-2">Mode de Règlement</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: '💵 Cash' },
                  { id: 'orange_money', label: '🟧 OM' },
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

            {/* Remise & Acompte */}
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

            {/* Récapitulatif Final */}
            <div className="p-4 rounded-2xl bg-[#1B4332] text-white flex justify-between items-center">
              <span className="text-xs font-bold">MONTANT À ENCAISSER :</span>
              <span className="font-serif font-black text-2xl text-[#E8A33D]">
                {Math.max(
                  0,
                  (checkoutMode === 'division_egale'
                    ? Math.round(activeSessionTotal / splitCount)
                    : activeSessionTotal) - remiseInput
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
                Valider & Générer Ticket Thermique ➔
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL TICKET THERMIQUE BLUETOOTH RECEIPT */}
      <BarReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        facture={createdFactureForReceipt}
        etablissement={etablissement}
        tableNumero={activeTableNumber}
        serveuseNom={currentUser?.nom || 'Serveuse Bar'}
        splitInfo={receiptSplitInfo}
      />
    </AppLayout>
  );
}
