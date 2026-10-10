import { supabase } from './supabase';
import { offlineDB } from './offlineDB';
import { syncEngine } from './supabaseSyncEngine';

export interface StockReceptionInput {
  activiteId: string;
  articleId: string;
  quantiteAnnoncee: number;
  saisiParNom: string;
  saisiParRole?: string;
  noteRef?: string;
}

export interface ConfirmReceptionInput {
  receptionId: string;
  activiteId: string;
  articleId: string;
  quantiteComptee: number;
  confirmeParNom: string;
  commentaireEcart?: string;
}

export async function fetchStockReceptionsFromCloud(
  activiteId: string
): Promise<{ success: boolean; receptions: any[]; error?: string }> {
  try {
    if (!activiteId) return { success: true, receptions: [] };

    const { data, error } = await supabase
      .from('receptions')
      .select('*, articles(nom, code_unique)')
      .eq('activite_id', activiteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, receptions: data || [] };
  } catch (err: any) {
    console.error('[StockReceptionService] Exception fetchStockReceptionsFromCloud:', err);
    return { success: false, receptions: [], error: err?.message };
  }
}

export async function createStockReception(
  input: StockReceptionInput
): Promise<{ success: boolean; receptionId: string; error?: string }> {
  try {
    const receptionId = `rcp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    const payload = {
      id: receptionId,
      activite_id: input.activiteId,
      article_id: input.articleId,
      statut: 'en_attente',
      quantite_annoncee: input.quantiteAnnoncee,
      quantite_comptee: null,
      saisi_par_nom: input.saisiParNom || 'Employé',
      saisi_par_role: input.saisiParRole || 'employe',
      confirme_par_nom: null,
      commentaire_ecart: input.noteRef || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 1. Enfiler dans receptions sur Supabase
    syncEngine.enqueue('receptions', 'insert', payload);

    // 2. Traçabilité dans journal_audit
    const auditPayload = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      activite_id: input.activiteId,
      action_type: 'saisie_stock_employe',
      article_id: input.articleId,
      variation_quantite: input.quantiteAnnoncee,
      motif: `Entrée de stock saisie par l'employé (${input.saisiParNom}) - En attente de confirmation Patron`,
      auteur_nom: input.saisiParNom,
      auteur_role: input.saisiParRole || 'employe',
      created_at: nowIso,
    };
    syncEngine.enqueue('journal_audit', 'insert', auditPayload);

    return { success: true, receptionId };
  } catch (err: any) {
    console.error('[StockReceptionService] Exception createStockReception:', err);
    return { success: false, receptionId: '', error: err?.message };
  }
}

export async function confirmStockReception(
  input: ConfirmReceptionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const mvtId = `mvt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // 1. Créer le mouvement de stock validé (entrée effective)
    const mvtPayload = {
      id: mvtId,
      activite_id: input.activiteId,
      article_id: input.articleId,
      type_mouvement: 'entree',
      quantite: input.quantiteComptee,
      motif: `Validation réception stock (Confirmé par ${input.confirmeParNom})`,
      auteur_nom: input.confirmeParNom,
      created_at: nowIso,
    };
    syncEngine.enqueue('mouvements_stock', 'insert', mvtPayload);

    // 2. Mettre à jour la réception
    const updatePayload = {
      id: input.receptionId,
      activite_id: input.activiteId,
      statut: 'valide',
      quantite_comptee: input.quantiteComptee,
      mouvement_id: mvtId,
      confirme_par_nom: input.confirmeParNom,
      commentaire_ecart: input.commentaireEcart || null,
      updated_at: nowIso,
    };
    syncEngine.enqueue('receptions', 'upsert', updatePayload);

    // 3. Traçabilité dans journal_audit
    const auditPayload = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      activite_id: input.activiteId,
      action_type: 'validation_stock_patron',
      article_id: input.articleId,
      variation_quantite: input.quantiteComptee,
      motif: `Réception de stock validée et débloquée par le Patron (${input.confirmeParNom})`,
      auteur_nom: input.confirmeParNom,
      auteur_role: 'patron',
      created_at: nowIso,
    };
    syncEngine.enqueue('journal_audit', 'insert', auditPayload);

    return { success: true };
  } catch (err: any) {
    console.error('[StockReceptionService] Exception confirmStockReception:', err);
    return { success: false, error: err?.message };
  }
}
