import { supabase } from './supabase';
import { offlineDB, cleanCodeSegment } from './offlineDB';
import { Etablissement } from '@/types';
import { syncEngine } from './supabaseSyncEngine';

export async function fetchActivitesFromCloud(): Promise<{
  success: boolean;
  activites: Etablissement[];
  error?: string;
}> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const userEmail = userData?.user?.email;

    let query = supabase.from('etablissements').select('*');

    if (userId && userEmail) {
      query = query.or(`proprietaire_id.eq.${userId},email_patron.eq.${userEmail}`);
    } else if (userId) {
      query = query.eq('proprietaire_id', userId);
    } else if (userEmail) {
      query = query.eq('email_patron', userEmail);
    } else {
      const localCompte = offlineDB.getCompteActuel();
      if (localCompte?.email) {
        query = query.eq('email_patron', localCompte.email);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('[ActivitesSyncService] Erreur Supabase select etablissements:', error.message);
      return {
        success: false,
        activites: offlineDB.getEtablissements(),
        error: `Erreur Cloud Supabase: ${error.message}`,
      };
    }

    // Convertir le résultat Supabase vers le type Etablissement de l'application
    const mapped: Etablissement[] = (data || []).map((row: any) => ({
      id: row.id,
      compte_id: row.proprietaire_id,
      nom: row.nom,
      type: 'boutique',
      type_activite: 'boutique',
      secteur_boutique: row.secteur || 'Commerce général',
      abrev_boutique: row.abbreviation_code || cleanCodeSegment(row.nom, 3),
      ville: row.ville || 'Douala',
      adresse: row.adresse || '',
      telephone: row.telephone,
      email_patron: row.email_patron,
      plan: 'Basique',
      statut_abonnement: row.statut_abonnement || (row.acces_bloque ? 'bloque' : 'essai'),
      date_fin_essai: row.fin_essai || row.date_fin_essai || new Date(Date.now() + 7 * 86400000).toISOString(),
      date_prochain_paiement: row.fin_essai || row.date_fin_essai || new Date(Date.now() + 7 * 86400000).toISOString(),
      tarif_mensuel: row.palier === 'Essentiel' ? 3000 : row.palier === 'Pro' ? 10000 : 5000,
      show_welcome_modal: false, // Jamais de welcome modal récurrent lors des reconnexions
      created_at: row.created_at,
    }));

    if (mapped.length > 0) {
      offlineDB.saveEtablissements(mapped);
    }
    return { success: true, activites: mapped };
  } catch (err: any) {
    console.error('[ActivitesSyncService] Exception fetchActivitesFromCloud:', err);
    return {
      success: false,
      activites: offlineDB.getEtablissements(),
      error: `Impossible de joindre le serveur Cloud: ${err?.message || 'Erreur réseau'}`,
    };
  }
}

export async function saveActiviteToCloud(etab: Etablissement): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const userEmail = userData?.user?.email || etab.email_patron;
    const finalProprietaireId = userId || (etab.compte_id && etab.compte_id.length === 36 ? etab.compte_id : null);

    const payload = {
      id: etab.id,
      proprietaire_id: finalProprietaireId,
      type_activite: 'boutique',
      secteur: etab.secteur_boutique || 'Commerce général',
      nom: etab.nom,
      abbreviation_code: etab.abrev_boutique || cleanCodeSegment(etab.nom, 3),
      ville: etab.ville || 'Douala',
      adresse: etab.adresse || '',
      telephone: etab.telephone || '',
      email_patron: userEmail || null,
      palier: etab.tarif_mensuel <= 3000 ? 'Essentiel' : etab.tarif_mensuel > 5000 ? 'Pro' : 'Standard',
      statut_abonnement: etab.statut_abonnement || 'essai',
      date_fin_essai: etab.date_fin_essai || new Date(Date.now() + 7 * 86400000).toISOString(),
      fin_essai: etab.date_fin_essai || new Date(Date.now() + 7 * 86400000).toISOString(),
      acces_bloque: etab.statut_abonnement === 'bloque',
      updated_at: new Date().toISOString(),
    };

    // 1. Sauvegarder dans le cache local
    const all = offlineDB.getEtablissements();
    const idx = all.findIndex((e) => e.id === etab.id);
    if (idx >= 0) all[idx] = etab;
    else all.push(etab);
    offlineDB.saveEtablissements(all);

    // 2. Écriture directe immédiate dans la table etablissements
    try {
      await supabase.from('etablissements').upsert(payload);
    } catch (directErr) {
      console.warn('[ActivitesSyncService] Écriture directe différée:', directErr);
    }

    // 3. Enfiler dans le moteur de synchro Cloud
    syncEngine.enqueue('etablissements', 'upsert', payload);

    return { success: true };
  } catch (err: any) {
    console.error('[ActivitesSyncService] Exception saveActiviteToCloud:', err);
    return { success: false, error: err?.message || 'Erreur d\'enregistrement de l\'activité' };
  }
}

export async function deleteActiviteFromCloud(etabId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Supprimer localement
    const all = offlineDB.getEtablissements().filter((e) => e.id !== etabId);
    offlineDB.saveEtablissements(all);

    // Enfiler suppression Supabase Cloud
    syncEngine.enqueue('activites', 'delete', { id: etabId });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur de suppression' };
  }
}

export async function fetchGlobalActivitesForSuperAdmin(): Promise<{
  success: boolean;
  activites: Etablissement[];
  count: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('activites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ActivitesSyncService] Erreur Supabase select activites super-admin:', error.message);
      return {
        success: false,
        activites: [],
        count: 0,
        error: `Erreur Cloud Supabase: ${error.message}`,
      };
    }

    const mapped: Etablissement[] = (data || []).map((row: any) => ({
      id: row.id,
      compte_id: row.proprietaire_id,
      nom: row.nom || 'Commerce sans nom',
      type: 'boutique',
      type_activite: 'boutique',
      secteur_boutique: row.secteur || 'Commerce général',
      abrev_boutique: row.abbreviation_code || cleanCodeSegment(row.nom, 3),
      ville: row.ville || 'Douala',
      adresse: row.adresse || '',
      telephone: row.telephone || '',
      email_patron: row.email_patron || (row.proprietaire_id ? `proprietaire_${row.proprietaire_id.slice(0, 6)}@gmail.com` : undefined),
      plan: 'Basique',
      statut_abonnement: row.statut_abonnement || (row.acces_bloque ? 'bloque' : 'essai'),
      date_fin_essai: row.fin_essai || new Date(Date.now() + 7 * 86400000).toISOString(),
      date_prochain_paiement: row.fin_essai || new Date(Date.now() + 7 * 86400000).toISOString(),
      tarif_mensuel: row.palier === 'Essentiel' ? 3000 : row.palier === 'Pro' ? 10000 : 5000,
      created_at: row.created_at || new Date().toISOString(),
    }));

    offlineDB.saveEtablissements(mapped);
    return {
      success: true,
      activites: mapped,
      count: mapped.length,
    };
  } catch (err: any) {
    return {
      success: false,
      activites: [],
      count: 0,
      error: `Erreur réseau Cloud: ${err?.message || 'Serveur injoignable'}`,
    };
  }
}
