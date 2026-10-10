import { supabase } from './supabase';
import { offlineDB } from './offlineDB';
import { Reservation, CommandeEnLigne } from '@/types';
import { syncEngine } from './supabaseSyncEngine';

export async function fetchReservationsFromCloud(
  activiteId: string
): Promise<{ success: boolean; reservations: Reservation[]; error?: string }> {
  try {
    if (!activiteId) {
      return { success: true, reservations: offlineDB.getReservations() };
    }

    const { data: resData, error: resErr } = await supabase
      .from('reservations')
      .select('*')
      .eq('activite_id', activiteId)
      .order('created_at', { ascending: false });

    if (resErr) throw resErr;

    const resMapped: Reservation[] = (resData || []).map((r: any) => ({
      id: r.id,
      etablissement_id: r.activite_id,
      numero_reservation: `RES-${r.id.slice(-6)}`,
      client_id: undefined,
      utilisateur_id: r.serveur_id || r.client_id || 'systeme',
      client: {
        id: `cli-${r.id}`,
        etablissement_id: r.activite_id,
        nom: r.client_nom || 'Client',
        telephone_whatsapp: r.client_telephone || '',
        created_at: r.created_at,
      },
      lignes: [
        {
          id: `lres-${r.id}`,
          reservation_id: r.id,
          produit_id: r.article_id || '',
          nom_produit: r.article_nom || 'Article',
          quantite: r.quantite || 1,
          prix_unitaire: Number(r.prix_total) / Math.max(1, r.quantite || 1),
          sous_total: Number(r.prix_total) || 0,
        },
      ],
      montant_total: Number(r.prix_total) || 0,
      acompte_paye: Number(r.acompte_paye) || 0,
      reste_a_solder: Math.max(0, (Number(r.prix_total) || 0) - (Number(r.acompte_paye) || 0)),
      statut: r.statut === 'soldee' ? 'soldee_recuperee' : r.statut === 'annulee' ? 'annulee' : 'en_attente',
      created_at: r.created_at,
    }));

    offlineDB.saveReservations(resMapped);
    return { success: true, reservations: resMapped };
  } catch (err: any) {
    console.error('[ReservationsSyncService] Exception fetchReservationsFromCloud:', err);
    return {
      success: false,
      reservations: offlineDB.getReservations(),
      error: err?.message || 'Erreur de chargement des réservations depuis le serveur',
    };
  }
}

export async function saveReservationToCloud(params: {
  activiteId: string;
  clientNom: string;
  clientTelephone?: string;
  articleId?: string;
  articleNom: string;
  quantite: number;
  acomptePaye: number;
  prixTotal: number;
}): Promise<{ success: boolean; resId: string; error?: string }> {
  try {
    const resId = `res-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    const resPayload = {
      id: resId,
      activite_id: params.activiteId,
      client_nom: params.clientNom || 'Client',
      client_telephone: params.clientTelephone || null,
      article_id: params.articleId || null,
      article_nom: params.articleNom,
      quantite: params.quantite || 1,
      acompte_paye: params.acomptePaye || 0,
      prix_total: params.prixTotal || 0,
      statut: 'active',
      created_at: nowIso,
    };

    // 1. Enfiler dans Supabase
    syncEngine.enqueue('reservations', 'insert', resPayload);

    // 2. Enfiler dans le journal d'audit immuable
    const auditPayload = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      activite_id: params.activiteId,
      action_type: 'creation_reservation',
      article_id: params.articleId || null,
      article_nom: params.articleNom,
      variation_quantite: -Math.abs(params.quantite),
      motif: `Réservation d'article par ${params.clientNom} (Acompte: ${params.acomptePaye} FCFA)`,
      auteur_nom: 'Employé',
      auteur_role: 'employe',
      created_at: nowIso,
    };
    syncEngine.enqueue('journal_audit', 'insert', auditPayload);

    return { success: true, resId };
  } catch (err: any) {
    console.error('[ReservationsSyncService] Exception saveReservationToCloud:', err);
    return { success: false, resId: '', error: err?.message || 'Erreur d\'enregistrement de la réservation' };
  }
}

export async function solderReservationOnCloud(
  resId: string,
  activiteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const updateResPayload = {
      id: resId,
      activite_id: activiteId,
      statut: 'soldee',
    };
    syncEngine.enqueue('reservations', 'upsert', updateResPayload);

    // Mettre à jour offlineDB
    offlineDB.solderReservation(resId, {
      montant_regle: 0,
      methode: 'cash',
    });

    return { success: true };
  } catch (err: any) {
    console.error('[ReservationsSyncService] Exception solderReservationOnCloud:', err);
    return { success: false, error: err?.message || 'Erreur lors du règlement de la réservation' };
  }
}

export async function saveCommandeEnLigneToCloud(
  cmd: CommandeEnLigne
): Promise<{ success: boolean; cmdId: string; error?: string }> {
  try {
    const activiteId = cmd.etablissement_id || offlineDB.getEtablissement()?.id;
    if (!activiteId) return { success: false, cmdId: '', error: 'Aucun commerce actif' };

    const cmdId = cmd.id || `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    const cmdPayload = {
      id: cmdId,
      activite_id: activiteId,
      numero_commande: cmd.numero_commande || `CMD-${Date.now().toString().slice(-6)}`,
      client_nom: cmd.client_nom || 'Client',
      client_telephone: cmd.client_telephone || '',
      adresse_livraison: cmd.adresse_livraison || null,
      articles_json: cmd.lignes || [],
      total: cmd.montant_total || 0,
      statut: cmd.statut || 'en_attente',
      created_at: nowIso,
    };

    syncEngine.enqueue('commandes_en_ligne', 'upsert', cmdPayload);
    return { success: true, cmdId };
  } catch (err: any) {
    console.error('[ReservationsSyncService] Exception saveCommandeEnLigneToCloud:', err);
    return { success: false, cmdId: '', error: err?.message || 'Erreur d\'enregistrement de la commande' };
  }
}
