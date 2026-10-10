import { supabase } from './supabase';
import { offlineDB } from './offlineDB';
import { ClotureJournaliere, ChargeJournaliere } from '@/types';
import { syncEngine } from './supabaseSyncEngine';

export async function fetchCloturesFromCloud(
  activiteId: string
): Promise<{ success: boolean; clotures: ClotureJournaliere[]; error?: string }> {
  try {
    if (!activiteId) {
      return { success: true, clotures: offlineDB.getCloturesJournalieres() };
    }

    const { data: clotData, error: clotErr } = await supabase
      .from('clotures_journalieres')
      .select('*')
      .eq('activite_id', activiteId)
      .order('date_cloture', { ascending: false });

    if (clotErr) throw clotErr;

    const clotMapped: ClotureJournaliere[] = (clotData || []).map((c: any) => ({
      id: c.id,
      etablissement_id: c.activite_id,
      date_cloture: c.date_cloture,
      ventes_total: (Number(c.total_ventes_especes) || 0) + (Number(c.total_ventes_mobile) || 0),
      encaissement_cash: Number(c.total_ventes_especes) || 0,
      encaissement_mobile: Number(c.total_ventes_mobile) || 0,
      total_credits_accordes: 0,
      recouvrement_credits: Number(c.total_recouvrement_credits) || 0,
      total_charges: Number(c.total_charges) || 0,
      benefice_estime: (Number(c.total_ventes_especes) || 0) + (Number(c.total_ventes_mobile) || 0) - (Number(c.total_charges) || 0),
      cloture_par_nom: c.auteur_nom || 'Système',
      is_figee: c.figee !== false,
      created_at: c.created_at,
    }));

    offlineDB.saveCloturesJournalieres(clotMapped);
    return { success: true, clotures: clotMapped };
  } catch (err: any) {
    console.error('[CloturesSyncService] Exception fetchCloturesFromCloud:', err);
    return {
      success: false,
      clotures: offlineDB.getCloturesJournalieres(),
      error: err?.message || 'Erreur de chargement des clôtures depuis le serveur',
    };
  }
}

export async function saveClotureJournaliereToCloud(
  cloture: ClotureJournaliere
): Promise<{ success: boolean; clotureId: string; error?: string }> {
  try {
    const activiteId = cloture.etablissement_id || offlineDB.getEtablissement()?.id;
    if (!activiteId) return { success: false, clotureId: '', error: 'Aucun commerce actif' };

    const clotureId = cloture.id || `clt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    const cloturePayload = {
      id: clotureId,
      activite_id: activiteId,
      date_cloture: cloture.date_cloture || nowIso.split('T')[0],
      total_ventes_especes: cloture.encaissement_cash || 0,
      total_ventes_mobile: cloture.encaissement_mobile || 0,
      total_recouvrement_credits: cloture.recouvrement_credits || 0,
      total_charges: cloture.total_charges || 0,
      fond_caisse_fermeture: cloture.encaissement_cash || 0,
      ecart_caisse: 0,
      auteur_nom: cloture.cloture_par_nom || 'Employé',
      figee: true,
      created_at: nowIso,
    };

    // 1. Enfiler la clôture dans Supabase
    syncEngine.enqueue('clotures_journalieres', 'upsert', cloturePayload);

    // 2. Enfiler dans le journal d'audit immuable
    const auditPayload = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      activite_id: activiteId,
      action_type: 'cloture_journaliere_figee',
      motif: `Clôture journalière figée pour la date du ${cloture.date_cloture || nowIso.split('T')[0]}`,
      auteur_nom: cloture.cloture_par_nom || 'Employé',
      auteur_role: 'patron',
      created_at: nowIso,
    };
    syncEngine.enqueue('journal_audit', 'insert', auditPayload);

    return { success: true, clotureId };
  } catch (err: any) {
    console.error('[CloturesSyncService] Exception saveClotureJournaliereToCloud:', err);
    return { success: false, clotureId: '', error: err?.message || 'Erreur d\'enregistrement de la clôture' };
  }
}

export async function saveChargeToCloud(
  charge: ChargeJournaliere
): Promise<{ success: boolean; chargeId: string; error?: string }> {
  try {
    const activiteId = charge.etablissement_id || offlineDB.getEtablissement()?.id;
    if (!activiteId) return { success: false, chargeId: '', error: 'Aucun commerce actif' };

    const chargeId = charge.id || `chg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    const chargePayload = {
      id: chargeId,
      activite_id: activiteId,
      titre: charge.motif || 'Charge journalière',
      categorie: 'Divers',
      montant: charge.montant || 0,
      auteur_nom: 'Employé',
      created_at: nowIso,
    };

    syncEngine.enqueue('charges', 'insert', chargePayload);
    return { success: true, chargeId };
  } catch (err: any) {
    console.error('[CloturesSyncService] Exception saveChargeToCloud:', err);
    return { success: false, chargeId: '', error: err?.message || 'Erreur d\'enregistrement de la charge' };
  }
}
