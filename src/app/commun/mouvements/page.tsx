'use client';

import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, AlertTriangle, Search, ShieldCheck, ClipboardCheck, BarChart3, Check, X, FileText, Lock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { offlineDB } from '@/lib/offlineDB';
import { AuditStockLog, InventaireReference, Utilisateur, Produit } from '@/types';

export default function CommunMouvementsPage() {
  const [activeTab, setActiveTab] = useState<'journal' | 'inventaire' | 'ecarts'>('journal');
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditStockLog[]>([]);
  const [inventaires, setInventaires] = useState<InventaireReference[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('tous');

  // Modal Nouvel Inventaire Conjoint
  const [isNewInvModalOpen, setIsNewInvModalOpen] = useState(false);
  const [invCounts, setInvCounts] = useState<Record<string, number>>({});
  const [invNotes, setInvNotes] = useState<Record<string, string>>({});
  const [invComment, setInvComment] = useState('');

  // Modals Patron & Employé
  const [resolutionModalLog, setResolutionModalLog] = useState<AuditStockLog | null>(null);
  const [resolutionDecision, setResolutionDecision] = useState<'accepter_comptage' | 'maintenir_declare'>('accepter_comptage');
  const [resolutionComment, setResolutionComment] = useState<string>('');

  const [paModalLog, setPaModalLog] = useState<AuditStockLog | null>(null);
  const [paValueInput, setPaValueInput] = useState<number>(0);

  const [ecartModalLog, setEcartModalLog] = useState<AuditStockLog | null>(null);
  const [ecartQtyCounted, setEcartQtyCounted] = useState<number>(0);
  const [ecartCommentInput, setEcartCommentInput] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const user = offlineDB.getCurrentUser();
      setCurrentUser(user);
      const logs = offlineDB.getAuditStockLogs();
      setAuditLogs(logs);
      const invs = offlineDB.getInventairesReference();
      setInventaires(invs);
      const prods = offlineDB.getProduits();
      setProduits(prods);

      // Initialiser les comptages physiques par défaut
      const initialCounts: Record<string, number> = {};
      prods.forEach((p) => {
        initialCounts[p.id] = p.quantite_totale || 0;
      });
      setInvCounts(initialCounts);
    } catch (e) {
      console.error(e);
    }
  };

  const isEmployee = currentUser?.role === 'Employé';
  const isPatron = ['Patron', 'Patronne', 'Directeur', 'Gerant'].includes(currentUser?.role || '');

  // 1. FILTRAGE JOURNAL D'AUDIT
  const filteredLogs = auditLogs.filter((l) => {
    if (!l) return false;
    const matchType = typeFilter === 'tous' || l.type_action === typeFilter;
    const matchSearch =
      (l.nom_produit || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.motif || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.utilisateur_nom || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // Action Confirmation/Contestation
  const handleConfirmLog = (logId: string) => {
    if (!currentUser) return;
    offlineDB.confirmOrContestAuditLog(logId, 'confirme', currentUser.id, currentUser.nom);
    loadData();
  };

  const handleOpenSignalEcartModal = (log: AuditStockLog) => {
    setEcartModalLog(log);
    setEcartQtyCounted(log.quantite_modifiee || 0);
    setEcartCommentInput('');
  };

  const handleSignalEcartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ecartModalLog || !currentUser) return;
    offlineDB.confirmOrContestAuditLog(
      ecartModalLog.id,
      'ecart_signale',
      currentUser.id,
      currentUser.nom,
      ecartCommentInput.trim() || 'Écart de quantité signalé par l\'employé',
      ecartQtyCounted
    );
    setEcartModalLog(null);
    loadData();
  };

  const handleResolveDiscrepancySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionModalLog || !resolutionComment.trim()) return;
    offlineDB.resolveStockDiscrepancy(
      resolutionModalLog.id,
      resolutionDecision,
      resolutionComment.trim()
    );
    setResolutionModalLog(null);
    loadData();
  };

  const handleCompletePaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paModalLog || paValueInput <= 0) return;
    offlineDB.validateAndCompletePurchasePrice(
      paModalLog.produit_id,
      paValueInput,
      paModalLog.id
    );
    setPaModalLog(null);
    loadData();
  };

  // 2. CRÉATION INVENTAIRE CONJOINT
  const handleCreateInventaireConjoint = (e: React.FormEvent) => {
    e.preventDefault();
    const lignes = produits.map((p) => ({
      produit_id: p.id,
      nom_produit: p.nom,
      quantite_theorique: p.quantite_totale || 0,
      quantite_physique_comptee: invCounts[p.id] ?? (p.quantite_totale || 0),
      note: invNotes[p.id] || '',
    }));

    offlineDB.createInventaireReference({
      lignes,
      commentaires: invComment.trim() || 'Inventaire de référence contradictoire',
    });

    setIsNewInvModalOpen(false);
    setInvComment('');
    loadData();
  };

  // 3. VALIDATION D'INVENTAIRE DE RÉFÉRENCE (PATRON / EMPLOYÉ)
  const handleValidateInventaire = (invId: string, role: 'patron' | 'employe') => {
    offlineDB.validateInventaireReference(invId, role, currentUser?.nom);
    loadData();
  };

  // 4. CALCUL DU RAPPORT D'ÉCARTS DE STOCK
  const latestOfficialInv = offlineDB.getLatestOfficialInventaireReference();

  const calculateDiscrepancyReport = () => {
    if (!latestOfficialInv) return [];

    const invDateIso = latestOfficialInv.date_comptage;

    return produits.map((p) => {
      // Quantité initiale au moment du dernier inventaire de référence conjoint
      const invLine = latestOfficialInv.lignes.find((l) => l.produit_id === p.id);
      const stockRefInitial = invLine ? invLine.quantite_physique_comptee : 0;

      // Logs postérieurs à cet inventaire
      const postLogs = auditLogs.filter(
        (l) => l.produit_id === p.id && new Date(l.created_at) >= new Date(invDateIso)
      );

      // Entrées confirmées par l'employé
      const entreesConfirmees = postLogs
        .filter((l) => (l.type_action === 'entree' || l.type_action === 'ajustement_hausse') && l.statut_confirmation === 'confirme')
        .reduce((sum, l) => sum + (l.quantite_modifiee || 0), 0);

      // Entrées non confirmées par l'employé
      const entreesNonConfirmees = postLogs
        .filter((l) => l.type_action === 'entree' && l.statut_confirmation === 'non_confirme')
        .reduce((sum, l) => sum + (l.quantite_modifiee || 0), 0);

      // Ventes et ajustements négatifs
      const ventesOuRetraits = postLogs
        .filter((l) => l.type_action === 'vente' || l.type_action === 'ajustement_baisse')
        .reduce((sum, l) => sum + Math.abs(l.quantite_modifiee || 0), 0);

      // Stock théorique opposable (Référence + Entrées confirmées - Ventes/Retraits)
      const stockTheoriqueOfficiel = stockRefInitial + entreesConfirmees - ventesOuRetraits;

      // Stock physique réel actuel
      const stockPhysiqueActuel = p.quantite_totale || 0;

      // Écart officiel imputable (Physique - Théorique Officiel)
      const ecartImputable = stockPhysiqueActuel - stockTheoriqueOfficiel;

      return {
        produit: p,
        stockRefInitial,
        entreesConfirmees,
        entreesNonConfirmees,
        ventesOuRetraits,
        stockTheoriqueOfficiel,
        stockPhysiqueActuel,
        ecartImputable,
      };
    });
  };

  const discrepancyReportData = calculateDiscrepancyReport();

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E2D5C3]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-1 rounded-full border border-[#B8442C]/20">
            TRANSPARENCE & PREUVE DE STOCK
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#1B4332] mt-1">
            Journal d'Audit Immuable & Inventaire Conjoint
          </h1>
          <p className="text-xs text-gray-600 font-medium mt-0.5">
            Protection bilatérale de l'employé et du patron. Traçabilité infalsifiable des quantités.
          </p>
        </div>

        {activeTab === 'inventaire' && (
          <button
            onClick={() => setIsNewInvModalOpen(true)}
            className="py-2.5 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Nouvel Inventaire de Référence Conjoint</span>
          </button>
        )}
      </div>

      {/* Onglets de Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#E2D5C3] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('journal')}
          className={`py-2.5 px-4 rounded-2xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'journal'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'bg-[#F3ECE0] text-[#1B4332] border border-[#E2D5C3] hover:bg-[#EADECB]'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>1. Journal d'Audit Immuable ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventaire')}
          className={`py-2.5 px-4 rounded-2xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'inventaire'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'bg-[#F3ECE0] text-[#1B4332] border border-[#E2D5C3] hover:bg-[#EADECB]'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>2. Inventaire de Référence Conjoint ({inventaires.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ecarts')}
          className={`py-2.5 px-4 rounded-2xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'ecarts'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'bg-[#F3ECE0] text-[#1B4332] border border-[#E2D5C3] hover:bg-[#EADECB]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>3. Rapport d'Écarts de Stock</span>
        </button>
      </div>

      {/* --- ONGLET 1: JOURNAL D'AUDIT IMMUABLE --- */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] text-xs text-[#1B4332] font-semibold flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#1B4332] shrink-0" />
            <div>
              <p className="font-bold">Règle d'Immuabilité de l'Audit :</p>
              <p className="text-[#1B4332]/80 text-[11px]">
                Aucune ligne de ce journal ne peut être modifiée ni supprimée par quiconque (y compris le patron). Les corrections génèrent de nouvelles lignes d'ajustement.
              </p>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Rechercher article, motif, auteur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl py-2.5 pl-10 pr-4 text-xs text-[#1B4332] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'tous', label: 'Tous' },
                { id: 'entree', label: '➕ Entrées' },
                { id: 'ajustement_hausse', label: '📈 Ajustements +' },
                { id: 'ajustement_baisse', label: '📉 Ajustements -' },
                { id: 'vente', label: '🛒 Ventes' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTypeFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                    typeFilter === f.id
                      ? 'bg-[#1B4332] text-white font-black'
                      : 'bg-[#F3ECE0] border border-[#E2D5C3] text-[#1B4332]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table d'audit */}
          <div className="bg-white border border-[#E2D5C3] rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3ECE0] text-[#1B4332] font-black uppercase border-b border-[#E2D5C3]">
                  <tr>
                    <th className="p-4">Date & Heure</th>
                    <th className="p-4">Article</th>
                    <th className="p-4">Action</th>
                    <th className="p-4 text-center">Avant</th>
                    <th className="p-4 text-center">Modif.</th>
                    <th className="p-4 text-center">Après</th>
                    <th className="p-4">Motif Obligatoire</th>
                    <th className="p-4">Auteur</th>
                    <th className="p-4 text-center">Preuve Réception Employé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D5C3]">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 font-bold">
                        Aucune entrée dans le journal d'audit.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FBF7EF] transition-colors">
                        <td className="p-4 font-mono font-bold text-gray-600 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </td>
                        <td className="p-4 font-serif font-black text-[#1B4332]">
                          {log.nom_produit}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              log.type_action === 'entree'
                                ? 'bg-emerald-100 text-emerald-900'
                                : log.type_action === 'ajustement_hausse'
                                ? 'bg-blue-100 text-blue-900'
                                : log.type_action === 'vente'
                                ? 'bg-purple-100 text-purple-900'
                                : 'bg-red-100 text-red-900'
                            }`}
                          >
                            {log.type_action === 'entree'
                              ? '➕ Livré'
                              : log.type_action === 'ajustement_hausse'
                              ? '📈 Ajust. +'
                              : log.type_action === 'vente'
                              ? '🛒 Vente'
                              : '📉 Retrait'}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-gray-600">{log.quantite_avant} pcs</td>
                        <td
                          className={`p-4 text-center font-black text-sm ${
                            log.quantite_modifiee > 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {log.quantite_modifiee > 0 ? `+${log.quantite_modifiee}` : log.quantite_modifiee}
                        </td>
                        <td className="p-4 text-center font-black text-[#1B4332]">{log.quantite_apres} pcs</td>
                        <td className="p-4 text-gray-800 font-semibold">{log.motif || 'N/A'}</td>
                        <td className="p-4 font-bold text-[#1B4332]">
                          {log.utilisateur_nom} <span className="text-[10px] text-gray-500">({log.utilisateur_role})</span>
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          {log.statut_confirmation === 'confirme' ? (
                            <div className="flex flex-col items-center">
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center gap-1 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Confirmé par {log.confirme_par_nom || 'Employé'}</span>
                              </span>
                              {log.device_info && (
                                <span className="text-[9px] text-gray-400 font-mono mt-0.5" title={log.device_info}>
                                  📱 {log.device_info.slice(0, 24)}...
                                </span>
                              )}
                            </div>
                          ) : log.statut_confirmation === 'ecart_signale' || log.statut_confirmation === 'conteste' ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-black text-[10px] flex items-center gap-1 border border-red-300">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                <span>Écart Signalé (Compté: {log.quantite_comptee_employe ?? log.quantite_apres} pcs)</span>
                              </span>
                              {log.commentaire_employe && (
                                <span className="text-[10px] text-red-700 italic max-w-xs truncate" title={log.commentaire_employe}>
                                  "{log.commentaire_employe}"
                                </span>
                              )}
                              {log.decision_patron_ecart ? (
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[9px] font-bold border border-purple-300">
                                  {log.decision_patron_ecart === 'accepter_comptage' ? '✅ Comptage accepté par Patron' : '⚠️ Déclaré maintenu par Patron'}
                                  {log.commentaire_patron_ecart && ` : "${log.commentaire_patron_ecart}"`}
                                </span>
                              ) : isPatron ? (
                                <button
                                  onClick={() => {
                                    setResolutionModalLog(log);
                                    setResolutionDecision('accepter_comptage');
                                    setResolutionComment('');
                                  }}
                                  className="mt-1 py-1 px-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-[10px] shadow-sm transition-transform active:scale-95"
                                >
                                  ⚖️ Résoudre l'écart
                                </button>
                              ) : null}
                            </div>
                          ) : log.statut_confirmation === 'non_confirme_48h' ? (
                            <div className="flex flex-col items-center">
                              <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-900 font-black text-[10px] border border-orange-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-orange-600" />
                                <span>Non confirmée après 48h</span>
                              </span>
                            </div>
                          ) : log.statut_confirmation === 'en_attente_validation_patron' ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 font-black text-[10px] border border-purple-300">
                                ⏳ Attente Patron & Prix d'Achat
                              </span>
                              {isPatron && (
                                <button
                                  onClick={() => {
                                    setPaModalLog(log);
                                    setPaValueInput(0);
                                  }}
                                  className="py-1 px-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-[10px] shadow-sm"
                                >
                                  💰 Valider & Renseigner PA
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                                ⏳ Non confirmée
                              </span>
                              {isEmployee && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleConfirmLog(log.id)}
                                    className="py-1 px-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-[10px] font-bold flex items-center gap-1"
                                    title="Tout est correct"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Correct</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenSignalEcartModal(log)}
                                    className="py-1 px-2 rounded-lg bg-red-100 text-red-800 hover:bg-red-200 text-[10px] font-bold border border-red-300"
                                    title="Signaler un écart"
                                  >
                                    Écart
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- ONGLET 2: INVENTAIRE DE RÉFÉRENCE CONJOINT --- */}
      {activeTab === 'inventaire' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6 text-amber-700 shrink-0" />
            <div>
              <p className="font-bold">Principe de l'Inventaire de Référence Conjoint :</p>
              <p className="text-amber-800 text-[11px]">
                Cet inventaire exige une double validation distincte (Patron ET Employé). Une fois validé par les deux parties, il devient la référence officielle légale. Tous les écarts ultérieurs sont calculés à partir de ce point de départ.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {inventaires.length === 0 ? (
              <div className="p-12 text-center bg-white border border-[#E2D5C3] rounded-3xl text-gray-500 font-bold space-y-3">
                <FileText className="w-10 h-10 text-gray-300 mx-auto" />
                <p>Aucun inventaire de référence n'a encore été créé.</p>
                <button
                  onClick={() => setIsNewInvModalOpen(true)}
                  className="py-2.5 px-4 rounded-2xl bg-[#1B4332] text-white font-bold text-xs shadow-md"
                >
                  Lancer le premier comptage contradictoire
                </button>
              </div>
            ) : (
              inventaires.map((inv) => {
                const isOfficial = inv.statut === 'valide_officiel';

                return (
                  <div
                    key={inv.id}
                    className={`bg-white border rounded-3xl p-5 shadow-sm space-y-4 ${
                      isOfficial ? 'border-emerald-500/50 bg-emerald-50/20' : 'border-[#E2D5C3]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2D5C3]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-[#1B4332]">{inv.numero_inventaire}</span>
                          {isOfficial ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300 uppercase">
                              ✅ RÉFÉRENCE OFFICIELLE VALIDÉE
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300 uppercase">
                              ⏳ EN ATTENTE DE DOUBLE VALIDATION
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          Date du comptage physique : {new Date(inv.date_comptage).toLocaleString('fr-FR')}
                        </p>
                      </div>

                      {/* Statuts des 2 validations */}
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-2xl text-center border text-xs font-bold ${
                          inv.valide_par_patron ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-gray-100 border-gray-300 text-gray-500'
                        }`}>
                          <span className="text-[9px] uppercase block">Patron</span>
                          <span>{inv.valide_par_patron ? `✅ ${inv.patron_nom || 'Validé'}` : '⏳ Non validé'}</span>
                        </div>

                        <div className={`p-2 rounded-2xl text-center border text-xs font-bold ${
                          inv.valide_par_employe ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-gray-100 border-gray-300 text-gray-500'
                        }`}>
                          <span className="text-[9px] uppercase block">Employé en poste</span>
                          <span>{inv.valide_par_employe ? `✅ ${inv.employe_nom || 'Validé'}` : '⏳ Non validé'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Lignes de comptage */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F3ECE0] text-[#1B4332] font-black uppercase">
                          <tr>
                            <th className="p-3">Article</th>
                            <th className="p-3 text-center">Théorique Système</th>
                            <th className="p-3 text-center">Comptage Physique Réel</th>
                            <th className="p-3 text-center">Écart de Départ</th>
                            <th className="p-3">Remarques</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2D5C3]">
                          {inv.lignes.map((line, idx) => (
                            <tr key={idx} className="hover:bg-[#FBF7EF]">
                              <td className="p-3 font-bold text-[#1B4332]">{line.nom_produit}</td>
                              <td className="p-3 text-center font-bold text-gray-600">{line.quantite_theorique} pcs</td>
                              <td className="p-3 text-center font-black text-[#1B4332]">{line.quantite_physique_comptee} pcs</td>
                              <td className={`p-3 text-center font-black ${
                                line.ecart === 0 ? 'text-gray-500' : line.ecart > 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {line.ecart > 0 ? `+${line.ecart}` : line.ecart} pcs
                              </td>
                              <td className="p-3 text-gray-600 italic">{line.note || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Boutons de Validation distincts */}
                    {!isOfficial && (
                      <div className="pt-2 flex justify-end gap-2 border-t border-[#E2D5C3]">
                        {isPatron && !inv.valide_par_patron && (
                          <button
                            onClick={() => handleValidateInventaire(inv.id, 'patron')}
                            className="py-2.5 px-4 rounded-xl bg-[#1B4332] text-white font-black text-xs shadow-md flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Valider cet inventaire en tant que Patron</span>
                          </button>
                        )}
                        {isEmployee && !inv.valide_par_employe && (
                          <button
                            onClick={() => handleValidateInventaire(inv.id, 'employe')}
                            className="py-2.5 px-4 rounded-xl bg-emerald-700 text-white font-black text-xs shadow-md flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Valider et certifier le comptage (Employé)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- ONGLET 3: RAPPORT D'ÉCARTS DE STOCK --- */}
      {activeTab === 'ecarts' && (
        <div className="space-y-4">
          {!latestOfficialInv ? (
            <div className="p-8 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-700" />
                <h3 className="font-serif font-black text-base text-amber-900">
                  Aucun inventaire de référence conjoint validé
                </h3>
              </div>
              <p className="text-xs text-amber-800 font-medium">
                Pour calculer et imputer légalement des écarts de stock à un employé, un inventaire de référence doit être saisi puis validé à la fois par le patron ET par l'employé dans l'onglet "Inventaire de référence conjoint".
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-emerald-100/60 border border-emerald-300 text-xs text-emerald-900 font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <span>
                    Point de départ officiel : <strong>{latestOfficialInv.numero_inventaire}</strong> du {new Date(latestOfficialInv.date_comptage).toLocaleDateString('fr-FR')} (Validé par Patron & Employé)
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-400">
                  Opposable & Legally Binding
                </span>
              </div>

              {/* Tableau du Rapport d'Écarts */}
              <div className="bg-white border border-[#E2D5C3] rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F3ECE0] text-[#1B4332] font-black uppercase border-b border-[#E2D5C3]">
                      <tr>
                        <th className="p-4">Article</th>
                        <th className="p-4 text-center">Base Inv. Réf.</th>
                        <th className="p-4 text-center">Entrées Confirmées</th>
                        <th className="p-4 text-center bg-amber-100/60 text-amber-900">Entrées Non-Confirmées ⚠️</th>
                        <th className="p-4 text-center">Ventes / Sorties</th>
                        <th className="p-4 text-center">Stock Théorique Officiel</th>
                        <th className="p-4 text-center">Comptage Physique Actuel</th>
                        <th className="p-4 text-center">Écart Imputable Employé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2D5C3]">
                      {discrepancyReportData.map((row) => (
                        <tr key={row.produit.id} className="hover:bg-[#FBF7EF]">
                          <td className="p-4 font-serif font-black text-[#1B4332]">{row.produit.nom}</td>
                          <td className="p-4 text-center font-bold text-gray-600">{row.stockRefInitial} pcs</td>
                          <td className="p-4 text-center font-bold text-emerald-700">+{row.entreesConfirmees} pcs</td>
                          <td className="p-4 text-center font-black bg-amber-50 text-amber-900">
                            {row.entreesNonConfirmees > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black">
                                +{row.entreesNonConfirmees} non confirmées
                              </span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="p-4 text-center font-bold text-red-600">-{row.ventesOuRetraits} pcs</td>
                          <td className="p-4 text-center font-black text-[#1B4332]">{row.stockTheoriqueOfficiel} pcs</td>
                          <td className="p-4 text-center font-black text-blue-900">{row.stockPhysiqueActuel} pcs</td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full font-black text-xs ${
                                row.ecartImputable === 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.ecartImputable > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800 shadow-sm'
                              }`}
                            >
                              {row.ecartImputable === 0
                                ? 'OK (0)'
                                : row.ecartImputable > 0
                                ? `Surplus (+${row.ecartImputable})`
                                : `Perte (${row.ecartImputable})`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL CREATION INVENTAIRE CONJOINT */}
      {isNewInvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateInventaireConjoint}
            className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
              <h3 className="font-serif font-black text-xl text-[#1B4332]">Saisie d'Inventaire Conjoint</h3>
              <button type="button" onClick={() => setIsNewInvModalOpen(false)} className="text-gray-500 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 font-medium">
              Saisissez le comptage physique réel compté à deux en boutique. Après enregistrement, il sera soumis à la validation finale du patron et de l'employé.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {produits.map((p) => (
                <div key={p.id} className="p-3 bg-white rounded-2xl border border-[#E2D5C3] flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[#1B4332]">{p.nom}</span>
                    <span className="text-[10px] text-gray-500 block">Stock système actuel: {p.quantite_totale} pcs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-gray-600">Compté :</label>
                    <input
                      type="number"
                      min="0"
                      value={invCounts[p.id] ?? (p.quantite_totale || 0)}
                      onChange={(e) =>
                        setInvCounts({ ...invCounts, [p.id]: Number(e.target.value) })
                      }
                      className="w-20 bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2 font-black text-center text-[#1B4332]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B4332] mb-1">Commentaires généraux d'inventaire</label>
              <textarea
                rows={2}
                placeholder="Remarques éventuelles signées par les deux parties..."
                value={invComment}
                onChange={(e) => setInvComment(e.target.value)}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewInvModalOpen(false)}
                className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
              >
                Enregistrer pour validation conjointe
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL SIGNALER UN ÉCART (EMPLOYÉ) */}
      {ecartModalLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSignalEcartSubmit}
            className="bg-[#F3ECE0] border-2 border-red-400 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
              <h3 className="font-serif font-black text-lg text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Signaler un Écart de Réception</span>
              </h3>
              <button type="button" onClick={() => setEcartModalLog(null)} className="text-gray-500 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs space-y-1">
              <p><strong className="text-gray-700">Article :</strong> {ecartModalLog.nom_produit}</p>
              <p><strong className="text-gray-700">Quantité annoncée par le patron :</strong> <span className="font-bold text-[#1B4332]">+{ecartModalLog.quantite_modifiee} pcs</span></p>
              <p><strong className="text-gray-700">Stock théorique après :</strong> {ecartModalLog.quantite_apres} pcs</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B4332] mb-1">
                Quantité réellement comptée en boutique *
              </label>
              <input
                type="number"
                required
                min="0"
                value={ecartQtyCounted}
                onChange={(e) => setEcartQtyCounted(Number(e.target.value))}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-black text-[#1B4332]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B4332] mb-1">
                Commentaire explicatif de l'employé *
              </label>
              <textarea
                required
                rows={3}
                placeholder="ex: 2 pièces manquantes au déballage, carton endommagé..."
                value={ecartCommentInput}
                onChange={(e) => setEcartCommentInput(e.target.value)}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEcartModalLog(null)}
                className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-red-700 hover:bg-red-800 text-white font-black text-xs shadow-md"
              >
                Transmettre l'Écart au Patron
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL RÉSOLUTION D'ÉCART (PATRON) */}
      {resolutionModalLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleResolveDiscrepancySubmit}
            className="bg-[#F3ECE0] border-2 border-purple-400 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
              <h3 className="font-serif font-black text-lg text-purple-950 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-700" />
                <span>Arbitrage / Résolution d'Écart par le Patron</span>
              </h3>
              <button type="button" onClick={() => setResolutionModalLog(null)} className="text-gray-500 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-1">
              <p><strong className="text-gray-700">Article :</strong> {resolutionModalLog.nom_produit}</p>
              <p><strong className="text-gray-700">Quantité annoncée :</strong> +{resolutionModalLog.quantite_modifiee} pcs</p>
              <p><strong className="text-gray-700">Quantité réellement comptée par l'employé :</strong> <span className="font-black text-red-700">{resolutionModalLog.quantite_comptee_employe ?? resolutionModalLog.quantite_apres} pcs</span></p>
              <p><strong className="text-gray-700">Commentaire employé :</strong> "{resolutionModalLog.commentaire_employe}"</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B4332] mb-2">Décision du Patron *</label>
              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer ${
                  resolutionDecision === 'accepter_comptage'
                    ? 'bg-purple-100 border-purple-500 text-purple-950 font-bold'
                    : 'bg-white border-[#E2D5C3] text-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="decision"
                    value="accepter_comptage"
                    checked={resolutionDecision === 'accepter_comptage'}
                    onChange={() => setResolutionDecision('accepter_comptage')}
                    className="mt-0.5"
                  />
                  <div className="text-xs">
                    <span className="font-black">1. Accepter le comptage de l'employé (Ligne d'ajustement immuable)</span>
                    <p className="text-[11px] font-normal opacity-80 mt-0.5">
                      Le stock sera ajusté à la quantité comptée par l'employé. Une nouvelle ligne d'ajustement immuable sera créée. Rien n'est supprimé.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer ${
                  resolutionDecision === 'maintenir_declare'
                    ? 'bg-amber-100 border-amber-500 text-amber-950 font-bold'
                    : 'bg-white border-[#E2D5C3] text-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="decision"
                    value="maintenir_declare"
                    checked={resolutionDecision === 'maintenir_declare'}
                    onChange={() => setResolutionDecision('maintenir_declare')}
                    className="mt-0.5"
                  />
                  <div className="text-xs">
                    <span className="font-black">2. Maintenir la quantité déclarée à l'origine</span>
                    <p className="text-[11px] font-normal opacity-80 mt-0.5">
                      Le stock reste tel quel. Vous devez fournir une justification obligatoire ci-dessous.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B4332] mb-1">
                Commentaire / Explication de la décision * (Obligatoire)
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explication claire du motif de décision..."
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolutionModalLog(null)}
                className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-purple-900 hover:bg-purple-950 text-white font-black text-xs shadow-md"
              >
                Enregistrer la Décision Patron
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL COMPLÉTER PRIX D'ACHAT (PATRON) */}
      {paModalLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCompletePaSubmit}
            className="bg-[#F3ECE0] border-2 border-purple-400 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
              <h3 className="font-serif font-black text-lg text-[#1B4332]">Renseigner le Prix d'Achat</h3>
              <button type="button" onClick={() => setPaModalLog(null)} className="text-gray-500 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl text-xs space-y-1">
              <p><strong className="text-gray-700">Article :</strong> {paModalLog.nom_produit}</p>
              <p><strong className="text-gray-700">Saisi par :</strong> {paModalLog.utilisateur_nom} ({paModalLog.saisi_par_role})</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B4332] mb-1">
                Prix d'Achat Unitaire (FCFA) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="ex: 12000"
                value={paValueInput || ''}
                onChange={(e) => setPaValueInput(Number(e.target.value))}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-black text-[#1B4332]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaModalLog(null)}
                className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
              >
                Valider & Débloquer Calcul Marges
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
