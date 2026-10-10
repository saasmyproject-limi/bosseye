import { supabase } from './supabase';
import { offlineDB } from './offlineDB';
import { Facture, LigneFacture } from '@/types';
import { syncEngine } from './supabaseSyncEngine';

export interface VenteInput {
  activiteId: string;
  numeroFacture: string;
  clientId?: string;
  clientNom?: string;
  totalHt: number;
  montantRemise: number;
  totalTtc: number;
  montantPaye: number;
  resteAPayer: number;
  modePaiement: string;
  vendeurNom: string;
  lignes: Array<{
    articleId: string;
    articleNom: string;
    codeUnique?: string;
    quantite: number;
    prixUnitaire: number;
    totalLigne: number;
  }>;
}

export async function recordSaleToCloud(
  input: VenteInput
): Promise<{ success: boolean; venteId: string; error?: string }> {
  try {
    const venteId = `vte-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    // 1. Payload Vente principale
    const ventePayload = {
      id: venteId,
      activite_id: input.activiteId,
      numero_facture: input.numeroFacture,
      client_id: input.clientId || null,
      client_nom: input.clientNom || 'Client Comptoir',
      total_ht: input.totalHt || 0,
      montant_remise: input.montantRemise || 0,
      total_ttc: input.totalTtc || 0,
      montant_paye: input.montantPaye || 0,
      reste_a_payer: input.resteAPayer || 0,
      mode_paiement: input.modePaiement || 'especes',
      statut: input.resteAPayer > 0 ? 'credit_encours' : 'payee',
      vendeur_nom: input.vendeurNom || 'Employé',
      created_at: nowIso,
    };

    // 2. Enfiler la vente dans la file de synchro Supabase
    syncEngine.enqueue('ventes', 'insert', ventePayload);

    // 3. Enfiler chaque ligne de vente & l'impact sur le stock
    for (const ligne of input.lignes) {
      const ligneId = `lgv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const lignePayload = {
        id: ligneId,
        vente_id: venteId,
        article_id: ligne.articleId,
        article_nom: ligne.articleNom,
        code_unique: ligne.codeUnique || null,
        quantite: ligne.quantite,
        prix_unitaire: ligne.prixUnitaire,
        total_ligne: ligne.totalLigne,
        created_at: nowIso,
      };
      syncEngine.enqueue('lignes_vente', 'insert', lignePayload);

      // Mouvement de déstockage automatique (quantité négative pour une sortie de vente)
      const mvtId = `mvt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const mouvementPayload = {
        id: mvtId,
        activite_id: input.activiteId,
        article_id: ligne.articleId,
        type_mouvement: 'sortie',
        quantite: -Math.abs(ligne.quantite),
        motif: `Vente ${input.numeroFacture}`,
        auteur_nom: input.vendeurNom || 'Employé',
        created_at: nowIso,
      };
      syncEngine.enqueue('mouvements_stock', 'insert', mouvementPayload);

      // Entrée journal d'audit immuable
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const auditPayload = {
        id: auditId,
        activite_id: input.activiteId,
        action_type: 'sortie_vente',
        article_id: ligne.articleId,
        article_nom: ligne.articleNom,
        variation_quantite: -Math.abs(ligne.quantite),
        motif: `Vente ticket ${input.numeroFacture}`,
        auteur_nom: input.vendeurNom || 'Employé',
        auteur_role: 'employe',
        created_at: nowIso,
      };
      syncEngine.enqueue('journal_audit', 'insert', auditPayload);
    }

    // 4. Mettre à jour offlineDB pour conservation hors-ligne instantanée
    const localFacture: Facture = {
      id: venteId,
      etablissement_id: input.activiteId,
      numero_facture: input.numeroFacture,
      client_id: input.clientId,
      utilisateur_id: input.vendeurNom,
      montant_total: input.totalTtc,
      remise: input.montantRemise,
      montant_paye: input.montantPaye,
      montant_restant: input.resteAPayer,
      mode_paiement: input.modePaiement as any,
      statut: input.resteAPayer > 0 ? 'credit_encours' : 'payee',
      created_at: nowIso,
      lignes: input.lignes.map((l) => ({
        id: `lg-${l.articleId}`,
        facture_id: venteId,
        produit_id: l.articleId,
        nom_produit: l.articleNom,
        quantite_bouteilles: l.quantite,
        prix_unitaire_vente: l.prixUnitaire,
        cout_unitaire_cmp: 0,
        sous_total_vente: l.totalLigne,
        sous_total_cout: 0,
        marge_brute: 0,
      })),
    };

    const existingFactures = offlineDB.getFactures();
    offlineDB.saveFactures([localFacture, ...existingFactures]);

    return { success: true, venteId };
  } catch (err: any) {
    console.error('[SalesSyncService] Exception recordSaleToCloud:', err);
    return { success: false, venteId: '', error: err?.message || 'Erreur d\'enregistrement de la vente' };
  }
}

export async function fetchSalesFromCloud(
  activiteId: string
): Promise<{ success: boolean; factures: Facture[]; error?: string }> {
  try {
    if (!activiteId) {
      return { success: true, factures: offlineDB.getFactures() };
    }

    const { data: ventesData, error: ventesErr } = await supabase
      .from('ventes')
      .select('*, lignes_vente(*)')
      .eq('activite_id', activiteId)
      .order('created_at', { ascending: false });

    if (ventesErr) throw ventesErr;

    const facturesMapped: Facture[] = (ventesData || []).map((v: any) => {
      const lignes: LigneFacture[] = (v.lignes_vente || []).map((l: any) => ({
        id: l.id,
        facture_id: v.id,
        produit_id: l.article_id,
        nom_produit: l.article_nom,
        quantite_bouteilles: l.quantite || 1,
        prix_unitaire_vente: Number(l.prix_unitaire) || 0,
        cout_unitaire_cmp: 0,
        sous_total_vente: Number(l.total_ligne) || 0,
        sous_total_cout: 0,
        marge_brute: 0,
      }));

      return {
        id: v.id,
        etablissement_id: v.activite_id,
        numero_facture: v.numero_facture,
        client_id: v.client_id,
        utilisateur_id: v.vendeur_nom || 'Employé',
        montant_total: Number(v.total_ttc) || 0,
        remise: Number(v.montant_remise) || 0,
        montant_paye: Number(v.montant_paye) || 0,
        montant_restant: Number(v.reste_a_payer) || 0,
        mode_paiement: v.mode_paiement || 'especes',
        statut: v.statut || 'payee',
        created_at: v.created_at,
        lignes,
      };
    });

    offlineDB.saveFactures(facturesMapped);
    return { success: true, factures: facturesMapped };
  } catch (err: any) {
    console.error('[SalesSyncService] Exception fetchSalesFromCloud:', err);
    return {
      success: false,
      factures: offlineDB.getFactures(),
      error: err?.message || 'Erreur de chargement des ventes depuis le serveur',
    };
  }
}
