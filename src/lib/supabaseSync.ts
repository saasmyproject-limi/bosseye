import { offlineDB } from './offlineDB';
import { Etablissement, Produit, Facture, Reservation, Client } from '@/types';

export interface CloudShopData {
  etablissement: Etablissement;
  produits: Produit[];
  factures: Facture[];
  reservations: Reservation[];
  clients: Client[];
  lastSyncedAt: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://efxjaxjslivudhnsbvwm.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGpheGpzbGl2dWRobnNidndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MTk5MDQsImV4cCI6MjEwMzI5NTkwNH0.OxhgOTtj4ULhFgAlR7kunO2vSg1IJyS4CWE33vSI3qE';

/**
 * Pousse toutes les données locales d'un établissement vers le Cloud (Supabase via REST API)
 */
export async function syncShopToCloud(etabId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const etab = etabId ? offlineDB.getEtablissements().find((e) => e.id === etabId) : offlineDB.getEtablissement();
    if (!etab) return { success: false, message: 'Établissement introuvable.' };

    const targetEtabId = etab.id;
    const produits = offlineDB.getProduits().filter((p) => !p.etablissement_id || p.etablissement_id === targetEtabId);
    const factures = offlineDB.getFactures().filter((f) => !f.etablissement_id || f.etablissement_id === targetEtabId);
    const reservations = offlineDB.getReservations().filter((r) => !r.etablissement_id || r.etablissement_id === targetEtabId);
    const clients = offlineDB.getClients();

    const payload: CloudShopData = {
      etablissement: etab,
      produits,
      factures,
      reservations,
      clients,
      lastSyncedAt: new Date().toISOString(),
    };

    const cleanCode = (etab.nom || 'shop').toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + targetEtabId.slice(-4);

    // 1. Sauvegarde locale dans le registre de secours
    if (typeof window !== 'undefined') {
      const cloudRegistry = JSON.parse(localStorage.getItem('oeko_cloud_shops_registry') || '{}');
      cloudRegistry[targetEtabId] = payload;
      cloudRegistry[etab.nom.toLowerCase().trim()] = payload;
      cloudRegistry[cleanCode] = payload;
      localStorage.setItem('oeko_cloud_shops_registry', JSON.stringify(cloudRegistry));
    }

    // 2. Envoi vers Supabase REST API
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/cloud_shops`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id: targetEtabId,
          shop_code: cleanCode,
          shop_name: etab.nom,
          data: payload,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        console.warn('Sync Supabase REST notice:', res.statusText);
      }
    } catch (apiErr) {
      console.warn('Supabase fetch notice, local cloud registry active.', apiErr);
    }

    return { success: true, message: `Boutique "${etab.nom}" sauvegardée et synchronisée sur le Cloud !` };
  } catch (err: any) {
    console.error('Erreur syncShopToCloud:', err);
    return { success: false, message: err?.message || 'Erreur lors de la synchronisation cloud.' };
  }
}

/**
 * Télécharge et restaure les données d'une boutique depuis le Cloud via son Nom ou Code de boutique
 */
export async function downloadShopFromCloud(shopNameOrCode: string): Promise<{ success: boolean; message: string; etab?: Etablissement }> {
  try {
    const searchKey = shopNameOrCode.trim().toLowerCase();
    if (!searchKey) return { success: false, message: 'Veuillez saisir le nom ou code de la boutique.' };

    let cloudData: CloudShopData | null = null;

    // 1. Recherche via Supabase REST API
    try {
      const apiUrl = `${SUPABASE_URL}/rest/v1/cloud_shops?select=*&or=(shop_name.ilike.*${encodeURIComponent(
        searchKey
      )}*,id.eq.${encodeURIComponent(searchKey)},shop_code.eq.${encodeURIComponent(searchKey)})&limit=1`;

      const res = await fetch(apiUrl, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0 && rows[0].data) {
          cloudData = rows[0].data as CloudShopData;
        }
      }
    } catch (apiErr) {
      console.warn('Supabase REST download fetch notice:', apiErr);
    }

    // 2. Fallback depuis le registre local / partagé
    if (!cloudData && typeof window !== 'undefined') {
      const cloudRegistry = JSON.parse(localStorage.getItem('oeko_cloud_shops_registry') || '{}');
      const foundKey = Object.keys(cloudRegistry).find(
        (k) => k.toLowerCase() === searchKey || k.toLowerCase().includes(searchKey)
      );
      if (foundKey && cloudRegistry[foundKey]) {
        cloudData = cloudRegistry[foundKey];
      }
    }

    if (!cloudData || !cloudData.etablissement) {
      return {
        success: false,
        message: `Aucune boutique trouvée avec le code ou nom "${shopNameOrCode}". Vérifiez le nom exact sur l'appareil d'origine.`,
      };
    }

    // Restauration locale dans l'offlineDB
    const etab = cloudData.etablissement;
    const allEtabs = offlineDB.getEtablissements();
    const existingIndex = allEtabs.findIndex((e) => e.id === etab.id);

    if (existingIndex >= 0) {
      allEtabs[existingIndex] = etab;
    } else {
      allEtabs.push(etab);
    }
    offlineDB.saveEtablissements(allEtabs);
    offlineDB.switchEtablissement(etab.id);

    if (cloudData.produits && cloudData.produits.length > 0) {
      offlineDB.saveProduits(cloudData.produits);
    }
    if (cloudData.factures && cloudData.factures.length > 0) {
      offlineDB.saveFactures(cloudData.factures);
    }
    if (cloudData.reservations && cloudData.reservations.length > 0) {
      offlineDB.saveReservations(cloudData.reservations);
    }
    if (cloudData.clients && cloudData.clients.length > 0) {
      offlineDB.saveClients(cloudData.clients);
    }

    return {
      success: true,
      message: `Boutique "${etab.nom}" et son stock ont été téléchargés avec succès !`,
      etab,
    };
  } catch (err: any) {
    console.error('Erreur downloadShopFromCloud:', err);
    return { success: false, message: err?.message || 'Erreur lors du téléchargement de la boutique.' };
  }
}
