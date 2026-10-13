import { supabase } from './supabase';
import { offlineDB, generateUUID } from './offlineDB';
import { Reservation, CommandeEnLigne } from '@/types';
import { syncEngine } from './supabaseSyncEngine';

function isUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

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
      .or(`etablissement_id.eq.${activiteId},activite_id.eq.${activiteId}`)
      .order('created_at', { ascending: false });

    if (resErr) throw resErr;

    const resMapped: Reservation[] = (resData || []).map((r: any) => ({
      id: r.id,
      etablissement_id: r.etablissement_id || r.activite_id || activiteId,
      numero_reservation: `RES-${r.id.slice(-6)}`,
      client_id: r.client_id,
      utilisateur_id: r.serveur_id || 'systeme',
      client: {
        id: generateUUID(),
        etablissement_id: r.etablissement_id || r.activite_id || activiteId,
        nom: r.client_nom || 'Client',
        telephone_whatsapp: r.client_telephone || '',
        created_at: r.created_at,
      },
      lignes: [
        {
          id: generateUUID(),
          reservation_id: r.id,
          produit_id: r.article_id || '',
          nom_produit: r.article_nom || 'Article',
          quantite: r.quantite || 1,
          prix_unitaire: Number(r.montant_total || r.prix_total || 0) / Math.max(1, r.quantite || 1),
          sous_total: Number(r.montant_total || r.prix_total) || 0,
        },
      ],
      montant_total: Number(r.montant_total || r.prix_total) || 0,
      acompte_paye: Number(r.acompte || r.acompte_paye) || 0,
      reste_a_solder: Math.max(0, (Number(r.montant_total || r.prix_total) || 0) - (Number(r.acompte || r.acompte_paye) || 0)),
      statut: r.statut === 'terminee' ? 'soldee_recuperee' : r.statut === 'annulee' ? 'annulee' : 'en_attente',
      created_at: r.created_at,
    }));

    const localRes = offlineDB.getReservations();
    const resMap = new Map<string, Reservation>();
    localRes.forEach((r) => resMap.set(r.id, r));
    resMapped.forEach((r) => resMap.set(r.id, r));
    const mergedReservations = Array.from(resMap.values());

    offlineDB.saveReservations(mergedReservations);
    return { success: true, reservations: mergedReservations };
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
  resId?: string;
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
    const resId = isUUID(params.resId) ? params.resId! : generateUUID();
    const nowIso = new Date().toISOString();

    const resPayload = {
      id: resId,
      etablissement_id: params.activiteId,
      activite_id: params.activiteId,
      client_nom: params.clientNom || 'Client',
      client_telephone: params.clientTelephone || null,
      montant_total: params.prixTotal || 0,
      acompte: params.acomptePaye || 0,
      statut: 'en_attente',
      created_at: nowIso,
    };

    const { error } = await supabase.from('reservations').upsert(resPayload);
    if (error) {
      console.warn('[ReservationsSyncService] Direct upsert notice, enqueuing:', error.message);
      syncEngine.enqueue('reservations', 'insert', resPayload);
    }

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
    if (isUUID(resId)) {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: 'terminee' })
        .eq('id', resId);

      if (error) {
        syncEngine.enqueue('reservations', 'update', { id: resId, statut: 'terminee' });
      }
    }

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

    const cmdId = isUUID(cmd.id) ? cmd.id : generateUUID();
    const nowIso = new Date().toISOString();

    const cmdPayload = {
      id: cmdId,
      etablissement_id: activiteId,
      client_nom: cmd.client_nom || 'Client',
      client_telephone: cmd.client_telephone || '',
      adresse_livraison: cmd.adresse_livraison || 'En boutique',
      statut: 'en_attente',
      frais_livraison: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { error } = await supabase.from('livraisons').upsert(cmdPayload);
    if (error) {
      syncEngine.enqueue('livraisons', 'upsert', cmdPayload);
    }
    return { success: true, cmdId };
  } catch (err: any) {
    console.error('[ReservationsSyncService] Exception saveCommandeEnLigneToCloud:', err);
    return { success: false, cmdId: '', error: err?.message || 'Erreur d\'enregistrement de la commande' };
  }
}

export async function fetchCommandesEnLigneFromCloud(
  activiteId: string
): Promise<{ success: boolean; commandes: CommandeEnLigne[]; error?: string }> {
  try {
    if (!activiteId) {
      return { success: true, commandes: offlineDB.getCommandesEnLigne() };
    }
    const { data, error } = await supabase
      .from('livraisons')
      .select('*')
      .eq('etablissement_id', activiteId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped: CommandeEnLigne[] = (data || []).map((row: any) => ({
      id: row.id,
      etablissement_id: row.etablissement_id,
      numero_commande: `CMD-${row.id.slice(-6)}`,
      client_nom: row.client_nom || 'Client',
      client_telephone: row.client_telephone || '',
      adresse_livraison: row.adresse_livraison || '',
      statut:
        row.statut === 'terminee' || row.statut === 'livree'
          ? 'livree_payee'
          : row.statut === 'en_livraison'
          ? 'en_livraison'
          : 'en_attente_paiement',
      montant_total: Number(row.montant_total || row.frais_livraison || 0),
      created_at: row.created_at,
      lignes: row.articles_json || [],
    }));

    const localCmds = offlineDB.getCommandesEnLigne();
    const cmdMap = new Map<string, CommandeEnLigne>();
    localCmds.forEach((c) => cmdMap.set(c.id, c));
    mapped.forEach((c) => cmdMap.set(c.id, c));
    const merged = Array.from(cmdMap.values());
    offlineDB.saveCommandesEnLigne(merged);

    return { success: true, commandes: merged };
  } catch (err: any) {
    console.warn('[ReservationsSyncService] fetchCommandesEnLigne notice:', err);
    return { success: false, commandes: offlineDB.getCommandesEnLigne(), error: err?.message };
  }
}
