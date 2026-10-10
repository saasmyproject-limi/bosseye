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

    if (!userId) {
      // Fallback local si pas encore connecté à Supabase Auth
      const localCompte = offlineDB.getCompteActuel();
      if (localCompte) {
        return {
          success: true,
          activites: offlineDB.getActivitesDuCompte(localCompte.id),
        };
      }
      return { success: true, activites: offlineDB.getEtablissements() };
    }

    const { data, error } = await supabase
      .from('activites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ActivitesSyncService] Erreur Supabase select activites:', error.message);
      return {
        success: false,
        activites: offlineDB.getEtablissements(),
        error: `Impossible de joindre le serveur Cloud (${error.message})`,
      };
    }

    // Convertir le résultat Supabase vers le type Etablissement de l'application
    const mapped: Etablissement[] = (data || []).map((row: any) => ({
      id: row.id,
      compte_id: row.proprietaire_id,
      nom: row.nom,
      type: 'boutique',
      type_activite: 'boutique',
      secteur_boutique: row.secteur || 'Vêtements & Mode',
      abrev_boutique: row.abbreviation_code || cleanCodeSegment(row.nom, 3),
      ville: row.ville || 'Douala',
      adresse: row.adresse || '',
      telephone: row.telephone,
      plan: 'Basique',
      statut_abonnement: row.statut_abonnement || 'essai',
      date_fin_essai: row.fin_essai || new Date(Date.now() + 14 * 86400000).toISOString(),
      date_prochain_paiement: row.fin_essai || new Date(Date.now() + 14 * 86400000).toISOString(),
      tarif_mensuel: row.palier === 'Essentiel' ? 3000 : row.palier === 'Pro' ? 10000 : 5000,
      created_at: row.created_at,
    }));

    // Mettre à jour le cache local avec les données réelles du cloud
    offlineDB.saveEtablissements(mapped);

    return { success: true, activites: mapped };
  } catch (err: any) {
    console.error('[ActivitesSyncService] Exception fetchActivitesFromCloud:', err);
    return {
      success: false,
      activites: offlineDB.getEtablissements(),
      error: 'Impossible de joindre le serveur. Vérifiez votre connexion internet.',
    };
  }
}

export async function saveActiviteToCloud(etab: Etablissement): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const payload = {
      id: etab.id,
      proprietaire_id: userId || etab.compte_id || '00000000-0000-0000-0000-000000000000',
      type_activite: 'boutique',
      secteur: etab.secteur_boutique || 'Vêtements & Mode',
      nom: etab.nom,
      abbreviation_code: etab.abrev_boutique || cleanCodeSegment(etab.nom, 3),
      ville: etab.ville || 'Douala',
      adresse: etab.adresse || '',
      telephone: etab.telephone || '',
      palier: etab.tarif_mensuel <= 3000 ? 'Essentiel' : etab.tarif_mensuel > 5000 ? 'Pro' : 'Standard',
      statut_abonnement: etab.statut_abonnement || 'essai',
      fin_essai: etab.date_fin_essai || new Date(Date.now() + 14 * 86400000).toISOString(),
      acces_bloque: false,
      updated_at: new Date().toISOString(),
    };

    // 1. Sauvegarder dans le cache local
    const all = offlineDB.getEtablissements();
    const idx = all.findIndex((e) => e.id === etab.id);
    if (idx >= 0) all[idx] = etab;
    else all.push(etab);
    offlineDB.saveEtablissements(all);

    // 2. Enfiler dans le moteur de synchro Cloud
    syncEngine.enqueue('activites', 'upsert', payload);

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
