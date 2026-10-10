'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/AppLayout';
import ArticleLabelPrinterModal from '@/components/ArticleLabelPrinterModal';
import { Plus, Search, Check, Edit2, X, AlertTriangle, FileSpreadsheet, Printer, Bell } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { syncShopToCloud } from '@/lib/supabaseSync';
import { Produit, Etablissement, VarianteProduit, ModeSuiviStock, ExemplaireArticle, Utilisateur, AuditStockLog } from '@/types';

const StockAiScannerModal = dynamic(() => import('@/components/StockAiScannerModal'), { ssr: false });
const ExcelCsvImporterModal = dynamic(() => import('@/components/ExcelCsvImporterModal'), { ssr: false });

export default function BoutiqueProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [pendingLogs, setPendingLogs] = useState<AuditStockLog[]>([]);
  const [contestModalLog, setContestModalLog] = useState<AuditStockLog | null>(null);
  const [contestComment, setContestComment] = useState<string>('');

  const [filterCategory, setFilterCategory] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiScanOpen, setIsAiScanOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [labelModalProduit, setLabelModalProduit] = useState<Produit | null>(null);

  // Formulaire d'ajout d'article adaptatif
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('Vêtements');
  const [customOkoCode, setCustomOkoCode] = useState('');
  const [modeSuivi, setModeSuivi] = useState<ModeSuiviStock>('quantite');
  const [quantiteTotalePiece, setQuantiteTotalePiece] = useState<number>(10);
  const [seuilAlerte, setSeuilAlerte] = useState<number>(3);
  const [prixAchatUnitaire, setPrixAchatUnitaire] = useState<number>(12000);
  const [prixVenteUnitaire, setPrixVenteUnitaire] = useState<number>(25000);
  const [motifCreation, setMotifCreation] = useState<string>('Stock initial à la création');

  // Champs spécifiques selon le secteur
  const [champMatiere, setChampMatiere] = useState('');
  const [champMarque, setChampMarque] = useState('');
  const [champModele, setChampModele] = useState('');
  const [champImei, setChampImei] = useState('');
  const [champDosage, setChampDosage] = useState('');
  const [champLot, setChampLot] = useState('');
  const [champPeremption, setChampPeremption] = useState('');
  const [champGarantie, setChampGarantie] = useState('');

  // Champs personnalisés libres
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);

  // Variantes pour Boutique (Taille / Couleur)
  const [taillesInput, setTaillesInput] = useState<string>('S, M, L, XL');
  const [couleursInput, setCouleursInput] = useState<string>('Noir, Blanc, Rouge');

  // Modal d'Édition Complète de l'Article
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null);
  const [editNom, setEditNom] = useState<string>('');
  const [editCategorie, setEditCategorie] = useState<string>('');
  const [editPrixAchatUnit, setEditPrixAchatUnit] = useState<number>(12000);
  const [editPrixVenteUnit, setEditPrixVenteUnit] = useState<number>(25000);
  const [editSeuilAlerte, setEditSeuilAlerte] = useState<number>(3);
  const [editStockTotal, setEditStockTotal] = useState<number>(10);
  const [editMotif, setEditMotif] = useState<string>('Ajustement manuel de stock');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      const user = offlineDB.getCurrentUser();
      setCurrentUser(user);
      const prods = offlineDB.getProduits();
      setProduits(prods);

      const pending = offlineDB.getPendingConfirmationsForEmployee();
      setPendingLogs(pending);

      // Auto-suggestion par défaut du mode de suivi selon le secteur
      const sec = etab.secteur_boutique || '';
      if (sec.includes('Téléphone') || sec.includes('Électronique') || sec.includes('Électroménager') || sec.includes('Pharmacie')) {
        setModeSuivi('unite_serie');
      } else {
        setModeSuivi('quantite');
      }
    } catch (e) { console.error(e); }
  };

  const isEmployee = currentUser?.role === 'Employé';

  const categories = Array.from(new Set(produits.map((p) => p.categorie))).filter(Boolean);

  const filteredProduits = produits.filter((p) => {
    if (!p) return false;
    const matchCat = filterCategory === 'tous' || p.categorie === filterCategory;
    const matchSearch =
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categorie.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.oko_code || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    const etab = offlineDB.getEtablissement();
    const prodId = `prod-${Date.now()}`;
    const firstCouleur = couleursInput.split(',')[0]?.trim();

    const finalOkoCode = customOkoCode.trim().toUpperCase() || offlineDB.generateStructuredOkoCode({
      etabId: etab.id,
      categorie: categorie.trim() || 'Article',
      couleur: firstCouleur,
    });

    let generatedVariantes: VarianteProduit[] | undefined = undefined;

    if (taillesInput.trim()) {
      const tList = taillesInput.split(',').map((s) => s.trim()).filter(Boolean);
      const cList = couleursInput.split(',').map((s) => s.trim()).filter(Boolean);

      generatedVariantes = [];
      let vIndex = 1;
      tList.forEach((t) => {
        const cArray = cList.length > 0 ? cList : ['Standard'];
        cArray.forEach((c) => {
          const varCode = offlineDB.generateStructuredOkoCode({
            etabId: etab.id,
            categorie: categorie.trim() || 'Article',
            couleur: c,
          });
          generatedVariantes!.push({
            id: `var-${prodId}-${vIndex++}`,
            produit_id: prodId,
            sku_code: `${nom.slice(0, 3).toUpperCase()}-${t}-${c.slice(0, 3).toUpperCase()}`,
            oko_code: varCode,
            taille: t,
            couleur: c,
            quantite_stock: Math.max(1, Math.floor(quantiteTotalePiece / (tList.length * cArray.length))),
          });
        });
      });
    }

    let generatedExemplaires: ExemplaireArticle[] | undefined = undefined;
    if (modeSuivi === 'unite_serie') {
      generatedExemplaires = [];
      const totalEx = Math.max(1, quantiteTotalePiece);
      for (let i = 1; i <= totalEx; i++) {
        const idCode = i === 1 && champImei.trim() ? champImei.trim() : offlineDB.generateStructuredOkoCode({ etabId: etab.id, categorie });
        generatedExemplaires.push({
          id: `ex-${prodId}-${i}`,
          produit_id: prodId,
          identifiant_unique: idCode,
          prix_achat_specifique: prixAchatUnitaire,
          statut: 'en_stock',
        });
      }
    }

    // Assemblage des champs spécifiques & personnalisés
    const champsSpec: Record<string, any> = {};
    if (champMatiere) champsSpec['matiere'] = champMatiere.trim();
    if (champMarque) champsSpec['marque'] = champMarque.trim();
    if (champModele) champsSpec['modele'] = champModele.trim();
    if (champImei) champsSpec['imei_sn'] = champImei.trim();
    if (champDosage) champsSpec['dosage'] = champDosage.trim();
    if (champLot) champsSpec['numero_lot'] = champLot.trim();
    if (champPeremption) champsSpec['date_peremption'] = champPeremption.trim();
    if (champGarantie) champsSpec['garantie_mois'] = champGarantie.trim();

    customFields.forEach((cf) => {
      if (cf.key.trim() && cf.value.trim()) {
        champsSpec[cf.key.trim()] = cf.value.trim();
      }
    });

    const newProd: Produit = {
      id: prodId,
      etablissement_id: etab.id,
      nom: nom.trim(),
      categorie: categorie.trim() || 'Article',
      oko_code: finalOkoCode,
      unite: 'piece',
      mode_suivi: modeSuivi,
      quantite_totale: quantiteTotalePiece,
      seuil_alerte: seuilAlerte,
      prix_achat_unitaire: prixAchatUnitaire,
      prix_vente_unitaire: prixVenteUnitaire,
      cout_achat_unitaire_cmp: prixAchatUnitaire,
      variantes: generatedVariantes,
      exemplaires: generatedExemplaires,
      champs_specifiques: Object.keys(champsSpec).length > 0 ? champsSpec : undefined,
      actif: true,
      created_at: new Date().toISOString(),
    };

    const currentProds = offlineDB.getProduits();
    offlineDB.saveProduits([newProd, ...currentProds]);

    // Enregistrement immuable dans le Journal d'Audit
    offlineDB.addAuditStockLog({
      produit_id: newProd.id,
      nom_produit: newProd.nom,
      type_action: 'entree',
      quantite_avant: 0,
      quantite_modifiee: newProd.quantite_totale,
      quantite_apres: newProd.quantite_totale,
      motif: motifCreation.trim() || 'Arrivage de stock initial',
      statut_confirmation: isEmployee ? 'confirme' : 'non_confirme',
      confirme_par_id: isEmployee ? currentUser?.id : undefined,
      confirme_par_nom: isEmployee ? currentUser?.nom : undefined,
      confirme_le: isEmployee ? new Date().toISOString() : undefined,
    });

    if (etab) syncShopToCloud(etab.id);

    setIsModalOpen(false);
    setNom('');
    setCustomFields([]);
    loadData();
  };

  const handleConfirmStock = (logId: string) => {
    if (!currentUser) return;
    offlineDB.confirmOrContestAuditLog(logId, 'confirme', currentUser.id, currentUser.nom);
    loadData();
  };

  const handleOpenContestModal = (log: AuditStockLog) => {
    setContestModalLog(log);
    setContestComment('');
  };

  const handleSubmitContest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestModalLog || !currentUser) return;
    offlineDB.confirmOrContestAuditLog(
      contestModalLog.id,
      'conteste',
      currentUser.id,
      currentUser.nom,
      contestComment.trim() || 'Quantité comptée différente de l\'entrée patron'
    );
    setContestModalLog(null);
    loadData();
  };

  const handleOpenEditModal = (p: Produit) => {
    setEditingProduit(p);
    setEditNom(p.nom);
    setEditCategorie(p.categorie);
    setEditPrixAchatUnit(p.cout_achat_unitaire_cmp || p.prix_achat_unitaire || 12000);
    setEditPrixVenteUnit(p.prix_vente_unitaire || 25000);
    setEditSeuilAlerte(p.seuil_alerte || 3);
    setEditStockTotal(p.quantite_totale || 10);
    setEditMotif('Ajustement manuel de stock');
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduit) return;

    const oldQty = editingProduit.quantite_totale || 0;
    const diffQty = editStockTotal - oldQty;

    const updated = produits.map((p) => {
      if (p.id !== editingProduit.id) return p;
      return {
        ...p,
        nom: editNom.trim() || p.nom,
        categorie: editCategorie.trim() || p.categorie,
        prix_achat_unitaire: editPrixAchatUnit,
        cout_achat_unitaire_cmp: editPrixAchatUnit,
        prix_vente_unitaire: editPrixVenteUnit,
        seuil_alerte: editSeuilAlerte,
        quantite_totale: editStockTotal,
      };
    });

    offlineDB.saveProduits(updated);

    // Enregistrement immuable de l'ajustement dans le Journal d'Audit si la quantité a changé
    if (diffQty !== 0) {
      const typeAct = diffQty > 0 ? 'ajustement_hausse' : 'ajustement_baisse';
      offlineDB.addAuditStockLog({
        produit_id: editingProduit.id,
        nom_produit: editNom.trim() || editingProduit.nom,
        type_action: typeAct,
        quantite_avant: oldQty,
        quantite_modifiee: diffQty,
        quantite_apres: editStockTotal,
        motif: editMotif.trim() || (diffQty < 0 ? 'Retrait manuel (Casse / Perte / Vol / Erreur)' : 'Ajustement inventaire à la hausse'),
        statut_confirmation: isEmployee ? 'confirme' : 'non_confirme',
        confirme_par_id: isEmployee ? currentUser?.id : undefined,
        confirme_par_nom: isEmployee ? currentUser?.nom : undefined,
        confirme_le: isEmployee ? new Date().toISOString() : undefined,
      });
    }

    const etab = offlineDB.getEtablissement();
    if (etab) syncShopToCloud(etab.id);
    setEditingProduit(null);
    loadData();
  };

  const calcMargeUnit = prixVenteUnitaire - prixAchatUnitaire;
  const calcTauxMarge = prixVenteUnitaire > 0 ? (calcMargeUnit / prixVenteUnitaire) * 100 : 0;

  return (
    <AppLayout>
        {/* Banner de Confirmation d'Entrée de Stock pour l'Employé */}
        {isEmployee && pendingLogs.length > 0 && (
          <div className="mb-6 p-4 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-700 animate-bounce" />
                <h3 className="font-serif font-black text-sm text-amber-900">
                  🔔 Confirmation de Réception de Stock ({pendingLogs.length} en attente)
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                Preuve Employé
              </span>
            </div>
            <p className="text-xs text-amber-800 font-medium">
              Le patron a enregistré des entrées de stock. Veuillez vérifier physiquement vos articles et confirmer pour vous protéger en cas d'écart.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {pendingLogs.map((log) => (
                <div key={log.id} className="p-3 bg-white/80 rounded-2xl border border-amber-300/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[#1B4332]">{log.nom_produit}</span> :{' '}
                    <span className="font-black text-emerald-800">+{log.quantite_modifiee} pcs</span>{' '}
                    <span className="text-gray-500 font-mono">({new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})</span>
                    <p className="text-[11px] text-gray-600 font-italic mt-0.5">Motif: {log.motif}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleConfirmStock(log.id)}
                      className="py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>J'ai reçu et compté ces articles</span>
                    </button>
                    <button
                      onClick={() => handleOpenContestModal(log)}
                      className="py-1.5 px-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs border border-red-300 transition-colors"
                    >
                      Contester
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              STOCK ARTICLES
            </span>
            <p className="text-xs text-[#1B4332]/80 font-semibold mt-1">
              Gérez votre stock d'articles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExcelImportOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-[#F3ECE0] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#1B4332]" />
              <span>📊 Import Excel/CSV</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] border border-[#B8442C] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Ajouter un article</span>
            </button>
          </div>
        </div>

        {/* Filtres et Recherche */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F3ECE0] p-4 rounded-3xl border border-[#E2D5C3]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl pl-9 pr-4 py-2 text-xs font-bold text-[#1B4332]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterCategory('tous')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterCategory === 'tous'
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-[#FBF7EF] text-[#1B4332] border border-[#E2D5C3]'
              }`}
            >
              Tous
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterCategory === c
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-[#FBF7EF] text-[#1B4332] border border-[#E2D5C3]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des Articles Boutique */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProduits.map((p) => {
            const lowStock = (p.quantite_totale || 0) <= (p.seuil_alerte || 5);
            const pAchat = p.cout_achat_unitaire_cmp || p.prix_achat_unitaire || 0;
            const pVente = p.prix_vente_unitaire || 0;
            const margeUnit = pVente - pAchat;

            return (
              <div
                key={p.id}
                className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-3 relative hover:border-[#B8442C] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-[#B8442C] uppercase tracking-wider bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                          {p.categorie}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-[#1B4332]/10 text-[#1B4332] px-2 py-0.5 rounded-full border border-[#1B4332]/20">
                          🏷️ {p.oko_code || `OKO-000${p.id.slice(-4)}`}
                        </span>
                        {p.mode_suivi === 'unite_serie' && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                            🏷️ À l'unité
                          </span>
                        )}
                        {(p.mode_suivi as any) === 'lot_pharmacie' && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full border border-purple-300">
                            💊 Lot Pharmacie
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif font-black text-lg text-[#1B4332] mt-1">{p.nom}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setLabelModalProduit(p)}
                        className="p-2 rounded-xl bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-900 transition-colors"
                        title="Imprimer étiquette autocollante OKO-Code / Barcode"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-2 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] hover:bg-[#E2D5C3] text-[#1B4332] transition-colors"
                        title="Modifier l'article"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Badges Exemplaires Uniques / IMEI */}
                  {p.exemplaires && p.exemplaires.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.exemplaires.slice(0, 4).map((ex) => (
                        <span key={ex.id} className="text-[10px] font-mono bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                          {ex.identifiant_unique}
                        </span>
                      ))}
                      {p.exemplaires.length > 4 && (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          +{p.exemplaires.length - 4} autres
                        </span>
                      )}
                    </div>
                  )}

                  {/* Badges Tailles & Variantes */}
                  {p.variantes && p.variantes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.variantes.map((v) => (
                        <span key={v.id} className="text-[10px] font-bold bg-[#F3ECE0] text-[#1B4332] px-2 py-0.5 rounded-md border border-[#E2D5C3]">
                          {v.taille} - {v.couleur} ({v.quantite_stock} pcs)
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stock Statut */}
                  <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] mt-3 space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-[#1B4332]">
                      <span>Stock Total Disponible :</span>
                      <span className={`text-sm font-black ${lowStock ? 'text-red-600' : 'text-emerald-800'}`}>
                        {p.quantite_totale} pièces
                      </span>
                    </div>

                    {lowStock && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-red-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Seuil d'alerte atteint ({p.seuil_alerte} pcs)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tarifs & Marges : Prix d'achat et Marges STRICTEMENT MASQUÉS pour l'Employé */}
                {isEmployee ? (
                  <div className="pt-3 border-t border-[#E2D5C3] text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3]">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Prix de Vente Unitaire</span>
                      <span className="font-black text-base text-[#1B4332]">{pVente.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-[#E2D5C3] grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-[#FBF7EF]">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">PA Unitaire</span>
                      <span className="font-black text-[#1B4332]">
                        {pAchat > 0 ? `${pAchat.toLocaleString('fr-FR')} F` : 'À compléter'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#FBF7EF]">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">PV Unitaire</span>
                      <span className="font-black text-emerald-800">{pVente.toLocaleString('fr-FR')} F</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#FBF7EF]">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Marge</span>
                      {pAchat > 0 ? (
                        <span className="font-black text-[#B8442C]">+{margeUnit.toLocaleString('fr-FR')} F</span>
                      ) : (
                        <span className="font-bold text-amber-700 text-[10px] block leading-tight">Incomplète (Prix d'achat manquant)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* MODAL CRÉATION ARTICLE BOUTIQUE */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateProduct}
              className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Ajouter un article</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Nom de l'Article *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Robe Soie, iPhone 13, Paracétamol, TV Samsung..."
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Catégorie</label>
                  <input
                    type="text"
                    placeholder="Vêtements, Électronique, etc."
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Stock Initial (Pièces)</label>
                  <input
                    type="number"
                    min="1"
                    onFocus={(e) => e.target.select()}
                    value={quantiteTotalePiece}
                    onChange={(e) => setQuantiteTotalePiece(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              {/* Champ Motif d'entrée */}
              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Motif d'entrée / Origine du stock *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Livraison Fournisseur, Stock initial, Achat grossiste..."
                  value={motifCreation}
                  onChange={(e) => setMotifCreation(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!isEmployee && (
                  <div>
                    <label className="block text-xs font-bold text-[#1B4332] mb-1">Prix d'Achat Unitaire (FCFA)</label>
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      value={prixAchatUnitaire}
                      onChange={(e) => setPrixAchatUnitaire(Number(e.target.value))}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                    />
                  </div>
                )}
                <div className={isEmployee ? 'col-span-2' : ''}>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Prix de Vente Unitaire (FCFA)</label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    value={prixVenteUnitaire}
                    onChange={(e) => setPrixVenteUnitaire(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              {/* Marge Calculée - Masquée pour l'Employé */}
              {!isEmployee && (
                <div className="p-3 rounded-2xl bg-emerald-100/60 border border-emerald-300 text-xs flex justify-between items-center font-bold text-emerald-900">
                  <span>Marge par pièce vendue :</span>
                  <span>+{calcMargeUnit.toLocaleString('fr-FR')} FCFA ({calcTauxMarge.toFixed(1)}%)</span>
                </div>
              )}

              {/* Code Article Structuré (Etiquette & Code-barres OKO) Tout en bas */}
              <div className="p-3.5 bg-[#FBF7EF] rounded-2xl border border-[#E2D5C3] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-[#1B4332]">Code Article / Étiquette Sticker</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomOkoCode(offlineDB.generateStructuredOkoCode({ categorie }));
                    }}
                    className="text-[10px] font-bold text-[#B8442C] hover:underline"
                  >
                    🔄 Auto-générer
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="ex: PEP-ROB-ROU-001 (auto-généré si vide)"
                    value={customOkoCode}
                    onChange={(e) => setCustomOkoCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-mono font-black text-[#1B4332] uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      let code = customOkoCode;
                      if (!code) {
                        code = offlineDB.generateStructuredOkoCode({ categorie });
                        setCustomOkoCode(code);
                      }
                      const tempProduit: Produit = {
                        id: 'temp-' + Date.now(),
                        etablissement_id: etablissement?.id || 'demo',
                        nom: nom || 'Article En Cours',
                        categorie: categorie || 'Vêtements',
                        unite: 'piece',
                        prix_vente_unitaire: prixVenteUnitaire || 0,
                        prix_achat_unitaire: prixAchatUnitaire || 0,
                        cout_achat_unitaire_cmp: prixAchatUnitaire || 0,
                        quantite_totale: quantiteTotalePiece || 1,
                        seuil_alerte: 5,
                        oko_code: code,
                        actif: true,
                        created_at: new Date().toISOString()
                      };
                      setLabelModalProduit(tempProduit);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
                    title="Aperçu et impression de l'étiquette sticker pour cet article"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer Étiquette</span>
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 font-medium">
                  Imprime l'étiquette avec code-barres / code OKO sur papier autocollant à coller directement sur vos articles.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
                >
                  Créer l'Article Boutique
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL ÉDITION ARTICLE BOUTIQUE */}
        {editingProduit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveEditProduct}
              className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Modifier l'Article</h3>
                <button type="button" onClick={() => setEditingProduit(null)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Nom de l'Article</label>
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!isEmployee && (
                  <div>
                    <label className="block text-xs font-bold text-[#1B4332] mb-1">Prix Achat Unitaire (FCFA)</label>
                    <input
                      type="number"
                      value={editPrixAchatUnit}
                      onChange={(e) => setEditPrixAchatUnit(Number(e.target.value))}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                    />
                  </div>
                )}
                <div className={isEmployee ? 'col-span-2' : ''}>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Prix Vente Unitaire (FCFA)</label>
                  <input
                    type="number"
                    value={editPrixVenteUnit}
                    onChange={(e) => setEditPrixVenteUnit(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Stock Total (Pièces)</label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    value={editStockTotal}
                    onChange={(e) => setEditStockTotal(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Seuil d'Alerte Stock</label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    value={editSeuilAlerte}
                    onChange={(e) => setEditSeuilAlerte(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              {/* Motif Obligatoire pour tout changement de stock */}
              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">
                  Motif de la modification de stock * <span className="text-red-600">(ex: Casse, Vol, Arrivage, Erreur saisie)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: 1 pièce défectueuse au déballage, Réassort,..."
                  value={editMotif}
                  onChange={(e) => setEditMotif(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduit(null)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
                >
                  Enregistrer la Modification
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL CONTESTATION RÉCEPTION STOCK */}
        {contestModalLog && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleSubmitContest}
              className="bg-[#F3ECE0] border-2 border-red-400 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-lg text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>Contester la Réception de Stock</span>
                </h3>
                <button type="button" onClick={() => setContestModalLog(null)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs space-y-1">
                <p><strong className="text-gray-700">Article :</strong> {contestModalLog.nom_produit}</p>
                <p><strong className="text-gray-700">Quantité déclarée par le patron :</strong> <span className="font-bold text-[#1B4332]">+{contestModalLog.quantite_modifiee} pcs</span></p>
                <p><strong className="text-gray-700">Motif d'origine :</strong> {contestModalLog.motif}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">
                  Explication / Remarque de l'employé *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="ex: J'ai compté seulement 8 articles au lieu de 10 livrés. 2 articles manquent à l'appel."
                  value={contestComment}
                  onChange={(e) => setContestComment(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setContestModalLog(null)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-red-700 hover:bg-red-800 text-white font-black text-xs shadow-md"
                >
                  Enregistrer la Contestation Immuable
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Scan IA Stock */}
        <StockAiScannerModal
          isOpen={isAiScanOpen}
          onClose={() => setIsAiScanOpen(false)}
          onSuccess={loadData}
        />

        {/* Modal Import Excel/CSV */}
        <ExcelCsvImporterModal
          isOpen={isExcelImportOpen}
          onClose={() => setIsExcelImportOpen(false)}
          onSuccess={loadData}
        />

        {/* Modal Impression Étiquettes Thermiques Autocollantes Bluetooth */}
        {labelModalProduit && (
          <ArticleLabelPrinterModal
            isOpen={!!labelModalProduit}
            onClose={() => setLabelModalProduit(null)}
            produit={labelModalProduit}
          />
        )}
    </AppLayout>
  );
}
