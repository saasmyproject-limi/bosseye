import { supabase } from './supabase';
import { offlineDB } from './offlineDB';
import { Client } from '@/types';
import { syncEngine } from './supabaseSyncEngine';

export async function fetchClientsFromCloud(
  activiteId: string
): Promise<{ success: boolean; clients: Client[]; error?: string }> {
  try {
    if (!activiteId) {
      return { success: true, clients: offlineDB.getClients() };
    }

    const { data: clientsData, error: clientsErr } = await supabase
      .from('clients')
      .select('*')
      .eq('activite_id', activiteId)
      .order('nom', { ascending: true });

    if (clientsErr) throw clientsErr;

    const clientsMapped: Client[] = (clientsData || []).map((c: any) => ({
      id: c.id,
      etablissement_id: c.activite_id,
      nom: c.nom || 'Client',
      telephone_whatsapp: c.telephone || '',
      note_quartier: c.adresse || '',
      total_dette_actuelle: Number(c.solde_dette) || 0,
      created_at: c.created_at,
    }));

    offlineDB.saveClients(clientsMapped);
    return { success: true, clients: clientsMapped };
  } catch (err: any) {
    console.error('[ClientsSyncService] Exception fetchClientsFromCloud:', err);
    return {
      success: false,
      clients: offlineDB.getClients(),
      error: err?.message || 'Erreur de chargement des clients depuis le serveur',
    };
  }
}

export async function saveClientToCloud(
  client: Client
): Promise<{ success: boolean; clientId: string; error?: string }> {
  try {
    const activiteId = client.etablissement_id || offlineDB.getEtablissement()?.id;
    if (!activiteId) return { success: false, clientId: '', error: 'Aucun commerce actif' };

    const clientId = client.id || `cli-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    const clientPayload = {
      id: clientId,
      activite_id: activiteId,
      nom: client.nom || 'Client',
      telephone: client.telephone_whatsapp || null,
      adresse: client.note_quartier || null,
      solde_dette: client.total_dette_actuelle || 0,
      updated_at: nowIso,
    };

    // 1. Mise à jour du cache local
    const clientToSave: Client = {
      ...client,
      id: clientId,
      etablissement_id: activiteId,
    };
    const all = offlineDB.getClients();
    const idx = all.findIndex((c) => c.id === clientId);
    if (idx >= 0) all[idx] = clientToSave;
    else all.push(clientToSave);
    offlineDB.saveClients(all);

    // 2. Enfiler dans la file de synchronisation Supabase
    syncEngine.enqueue('clients', 'upsert', clientPayload);

    return { success: true, clientId };
  } catch (err: any) {
    console.error('[ClientsSyncService] Exception saveClientToCloud:', err);
    return { success: false, clientId: '', error: err?.message || 'Erreur d\'enregistrement du client' };
  }
}

export async function deleteClientFromCloud(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    offlineDB.deleteClient(clientId);
    syncEngine.enqueue('clients', 'delete', { id: clientId });
    return { success: true };
  } catch (err: any) {
    console.error('[ClientsSyncService] Exception deleteClientFromCloud:', err);
    return { success: false, error: err?.message || 'Erreur de suppression du client' };
  }
}

export async function recordReglementCreditToCloud(params: {
  activiteId: string;
  clientId?: string;
  venteId?: string;
  montantRegle: number;
  modeReglement: 'especes' | 'orange_money' | 'mtn_momo';
  auteurNom: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const creanceId = `crc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const creancePayload = {
      id: creanceId,
      activite_id: params.activiteId,
      client_id: params.clientId || null,
      vente_id: params.venteId || null,
      type: 'reglement_partiel',
      montant: params.montantRegle,
      mode_reglement: params.modeReglement || 'especes',
      auteur_nom: params.auteurNom || 'Employé',
      notes: params.notes || 'Règlement de crédit / ardoise',
      created_at: nowIso,
    };

    // 1. Enfiler la créance dans Supabase
    syncEngine.enqueue('creances', 'insert', creancePayload);

    // 2. Enfiler l'entrée dans le journal d'audit immuable
    const auditPayload = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      activite_id: params.activiteId,
      action_type: 'reglement_credit',
      motif: `Règlement crédit client (${params.montantRegle} FCFA via ${params.modeReglement})`,
      auteur_nom: params.auteurNom || 'Employé',
      auteur_role: 'employe',
      created_at: nowIso,
    };
    syncEngine.enqueue('journal_audit', 'insert', auditPayload);

    // 3. Mettre à jour la facture locale dans offlineDB
    if (params.venteId) {
      offlineDB.processRemboursementCredit({
        facture_id: params.venteId,
        montant_regle: params.montantRegle,
        methode: params.modeReglement,
      });

      // Mettre à jour le solde du reste_a_payer sur Supabase pour la vente
      const currentFacture = offlineDB.getFactures().find((f) => f.id === params.venteId);
      if (currentFacture) {
        const updateVentePayload = {
          id: currentFacture.id,
          activite_id: params.activiteId,
          montant_paye: currentFacture.montant_paye,
          reste_a_payer: currentFacture.montant_restant,
          statut: currentFacture.montant_restant <= 0 ? 'payee' : 'credit_encours',
        };
        syncEngine.enqueue('ventes', 'upsert', updateVentePayload);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[ClientsSyncService] Exception recordReglementCreditToCloud:', err);
    return { success: false, error: err?.message || 'Erreur d\'enregistrement du règlement' };
  }
}
