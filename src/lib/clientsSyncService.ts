import { supabase } from './supabase';
import { offlineDB, generateUUID } from './offlineDB';
import { Client } from '@/types';
import { syncEngine } from './supabaseSyncEngine';

function isUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function formatPaymentMethod(mode: string): 'Orange Money' | 'MTN MoMo' | 'Especes' | 'Carte' | 'Virement' {
  const m = (mode || '').toLowerCase();
  if (m.includes('orange') || m.includes('om')) return 'Orange Money';
  if (m.includes('mtn') || m.includes('momo')) return 'MTN MoMo';
  if (m.includes('carte') || m.includes('card')) return 'Carte';
  if (m.includes('vir')) return 'Virement';
  return 'Especes';
}

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
      .or(`etablissement_id.eq.${activiteId},activite_id.eq.${activiteId}`)
      .order('nom', { ascending: true });

    if (clientsErr) throw clientsErr;

    const clientsMapped: Client[] = (clientsData || []).map((c: any) => ({
      id: c.id,
      etablissement_id: c.etablissement_id || c.activite_id || activiteId,
      nom: c.nom || 'Client',
      telephone_whatsapp: c.telephone || '',
      note_quartier: c.adresse || '',
      total_dette_actuelle: Number(c.dette_actuelle || c.solde_dette) || 0,
      total_depense: Number(c.total_achats) || 0,
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

    const validId = isUUID(client.id) ? client.id : generateUUID();
    const nowIso = new Date().toISOString();

    const clientPayload = {
      id: validId,
      etablissement_id: activiteId,
      activite_id: activiteId,
      nom: client.nom || 'Client',
      telephone: client.telephone_whatsapp || null,
      adresse: client.note_quartier || null,
      dette_actuelle: client.total_dette_actuelle || 0,
      total_achats: (client as any).total_depense || 0,
      created_at: client.created_at || nowIso,
    };

    // 1. Mise à jour du cache local
    const clientToSave: Client = {
      ...client,
      id: validId,
      etablissement_id: activiteId,
    };
    const all = offlineDB.getClients();
    const idx = all.findIndex((c) => c.id === validId);
    if (idx >= 0) all[idx] = clientToSave;
    else all.push(clientToSave);
    offlineDB.saveClients(all);

    // 2. Écriture directe Supabase table clients
    const { error: clientErr } = await supabase.from('clients').upsert(clientPayload);
    if (clientErr) {
      console.warn('[ClientsSyncService] Direct client upsert notice, enqueuing:', clientErr.message);
      syncEngine.enqueue('clients', 'upsert', clientPayload);
    }

    return { success: true, clientId: validId };
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
    if (isUUID(clientId)) {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) {
        syncEngine.enqueue('clients', 'delete', { id: clientId });
      }
    }
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
  detteId?: string;
  montantRegle: number;
  modeReglement: 'especes' | 'orange_money' | 'mtn_momo';
  auteurNom: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const validVenteId = isUUID(params.venteId) ? params.venteId : null;
    const validDetteId = isUUID(params.detteId) ? params.detteId : null;
    const validClientId = isUUID(params.clientId) ? params.clientId : null;

    // 1. Enregistrer le paiement réel dans table paiements
    const paiementId = generateUUID();
    const paiementPayload = {
      id: paiementId,
      etablissement_id: params.activiteId,
      vente_id: validVenteId,
      dette_id: validDetteId,
      montant: params.montantRegle,
      methode: formatPaymentMethod(params.modeReglement),
      statut: 'reussi',
      created_at: nowIso,
    };

    const { error: payErr } = await supabase.from('paiements').insert(paiementPayload);
    if (payErr) {
      console.warn('[ClientsSyncService] Direct paiement insert notice, enqueuing:', payErr.message);
      syncEngine.enqueue('paiements', 'insert', paiementPayload);
    }

    // 2. Mettre à jour la table dettes
    if (validDetteId) {
      const { data: dData } = await supabase.from('dettes').select('montant_restant').eq('id', validDetteId).single();
      const currentRestant = dData ? Number(dData.montant_restant) : params.montantRegle;
      const newRestant = Math.max(0, currentRestant - params.montantRegle);

      const { error: detteErr } = await supabase
        .from('dettes')
        .update({
          montant_restant: newRestant,
          statut: newRestant <= 0 ? 'reglee' : 'en_cours',
          updated_at: nowIso,
        })
        .eq('id', validDetteId);

      if (detteErr) {
        syncEngine.enqueue('dettes', 'update', {
          id: validDetteId,
          montant_restant: newRestant,
          statut: newRestant <= 0 ? 'reglee' : 'en_cours',
          updated_at: nowIso,
        });
      }
    } else if (validVenteId) {
      // Trouver la dette liée à la vente
      const { data: dData } = await supabase.from('dettes').select('id, montant_restant').eq('vente_id', validVenteId).single();
      if (dData) {
        const newRestant = Math.max(0, Number(dData.montant_restant) - params.montantRegle);
        await supabase
          .from('dettes')
          .update({
            montant_restant: newRestant,
            statut: newRestant <= 0 ? 'reglee' : 'en_cours',
            updated_at: nowIso,
          })
          .eq('id', dData.id);
      }
    }

    // 3. Mettre à jour la table ventes (montant_paye, reste_a_payer, statut)
    if (validVenteId) {
      const { data: vData } = await supabase.from('ventes').select('montant_total, montant_paye, reste_a_payer').eq('id', validVenteId).single();
      if (vData) {
        const total = Number(vData.montant_total) || 0;
        const currentPaye = Number(vData.montant_paye) || 0;
        const newPaye = currentPaye + params.montantRegle;
        const newReste = Math.max(0, total - newPaye);
        const newStatut = newReste <= 0 ? 'payee' : 'partielle';

        await supabase
          .from('ventes')
          .update({
            montant_paye: newPaye,
            reste_a_payer: newReste,
            statut: newStatut,
          })
          .eq('id', validVenteId);
      }
    }

    // 4. Mettre à jour le solde du client si renseigné
    if (validClientId) {
      const { data: cData } = await supabase.from('clients').select('dette_actuelle').eq('id', validClientId).single();
      if (cData) {
        const currentDette = Number(cData.dette_actuelle) || 0;
        const newDette = Math.max(0, currentDette - params.montantRegle);
        await supabase.from('clients').update({ dette_actuelle: newDette }).eq('id', validClientId);
      }
    }

    // 5. Audit de sécurité
    const auditPayload = {
      id: generateUUID(),
      etablissement_id: params.activiteId,
      action: 'reglement_credit',
      details: {
        montant: params.montantRegle,
        mode: params.modeReglement,
        vente_id: validVenteId,
        dette_id: validDetteId,
        auteur: params.auteurNom,
        notes: params.notes,
      },
      created_at: nowIso,
    };
    const { error: auditErr } = await supabase.from('journal_audit').insert(auditPayload);
    if (auditErr) {
      syncEngine.enqueue('journal_audit', 'insert', auditPayload);
    }

    // 6. Mettre à jour offlineDB
    if (params.venteId) {
      offlineDB.processRemboursementCredit({
        facture_id: params.venteId,
        montant_regle: params.montantRegle,
        methode: params.modeReglement === 'especes' ? 'cash' : (params.modeReglement as any),
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('[ClientsSyncService] Exception recordReglementCreditToCloud:', err);
    return { success: false, error: err?.message || 'Erreur d\'enregistrement du règlement' };
  }
}
