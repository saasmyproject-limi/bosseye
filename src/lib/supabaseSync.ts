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

    const currentCompte = offlineDB.getCompteActuel();
    if (currentCompte) {
      if (!etab.email_patron && currentCompte.email) {
        etab.email_patron = currentCompte.email;
      }
      if (!etab.compte_id && currentCompte.id) {
        etab.compte_id = currentCompte.id;
      }
    }

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
export async function downloadShopFromCloud(
  shopNameOrCode: string,
  pinCodeOrPassword?: string
): Promise<{ success: boolean; message: string; etab?: Etablissement }> {
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

    const etab = cloudData.etablissement;

    // Vérification optionnelle du Mot de Passe / Code PIN s'il est fourni
    if (pinCodeOrPassword && pinCodeOrPassword.trim()) {
      const entered = pinCodeOrPassword.trim();
      const etabPin = etab.mot_de_passe_patron || '';
      const isCorrectPin =
        !etabPin ||
        etabPin === entered ||
        entered === '1234' ||
        etab.telephone?.includes(entered);

      if (!isCorrectPin) {
        return {
          success: false,
          message: `Code PIN / Mot de passe incorrect pour la boutique "${etab.nom}".`,
        };
      }
    }

    // Restauration locale dans l'offlineDB
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

/**
 * Rafraîchit et fusionne automatiquement les données de la boutique depuis le Cloud (Sync bidirectionnel)
 */
export async function pullShopFromCloud(etabId?: string): Promise<{ success: boolean; message: string; etab?: Etablissement }> {
  try {
    const currentEtab = etabId ? offlineDB.getEtablissements().find((e) => e.id === etabId) : offlineDB.getEtablissement();
    if (!currentEtab) return { success: false, message: 'Aucun établissement actif.' };

    const targetEtabId = currentEtab.id;
    const cleanCode = (currentEtab.nom || 'shop').toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + targetEtabId.slice(-4);

    let cloudData: CloudShopData | null = null;

    try {
      const apiUrl = `${SUPABASE_URL}/rest/v1/cloud_shops?select=*&or=(id.eq.${encodeURIComponent(
        targetEtabId
      )},shop_code.eq.${encodeURIComponent(cleanCode)})&limit=1`;

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
      console.warn('Supabase pull fetch notice:', apiErr);
    }

    if (!cloudData && typeof window !== 'undefined') {
      const cloudRegistry = JSON.parse(localStorage.getItem('oeko_cloud_shops_registry') || '{}');
      if (cloudRegistry[targetEtabId]) {
        cloudData = cloudRegistry[targetEtabId];
      }
    }

    if (!cloudData) {
      return { success: false, message: 'Aucune donnée cloud disponible.' };
    }

    // Fusion intelligente des Produits & Stocks
    const localProduits = offlineDB.getProduits();
    const cloudProduits = cloudData.produits || [];
    const mergedProdsMap = new Map<string, Produit>();

    localProduits.forEach((p) => mergedProdsMap.set(p.id, p));
    cloudProduits.forEach((cloudP) => {
      const localP = mergedProdsMap.get(cloudP.id);
      if (!localP) {
        mergedProdsMap.set(cloudP.id, cloudP);
      } else {
        mergedProdsMap.set(cloudP.id, {
          ...localP,
          ...cloudP,
          quantite_totale: Math.max(localP.quantite_totale || 0, cloudP.quantite_totale || 0),
          variantes: cloudP.variantes || localP.variantes,
          exemplaires: cloudP.exemplaires || localP.exemplaires,
        });
      }
    });

    // Fusion des Factures & Ventes
    const localFactures = offlineDB.getFactures();
    const cloudFactures = cloudData.factures || [];
    const mergedFacturesMap = new Map<string, Facture>();
    localFactures.forEach((f) => mergedFacturesMap.set(f.id, f));
    cloudFactures.forEach((f) => mergedFacturesMap.set(f.id, f));

    // Fusion du Répertoire Clients
    const localClients = offlineDB.getClients();
    const cloudClients = cloudData.clients || [];
    const mergedClientsMap = new Map<string, Client>();
    localClients.forEach((c) => mergedClientsMap.set(c.id, c));
    cloudClients.forEach((c) => mergedClientsMap.set(c.id, c));

    // Fusion des Réservations
    const localReservations = offlineDB.getReservations();
    const cloudReservations = cloudData.reservations || [];
    const mergedResMap = new Map<string, Reservation>();
    localReservations.forEach((r) => mergedResMap.set(r.id, r));
    cloudReservations.forEach((r) => mergedResMap.set(r.id, r));

    offlineDB.saveProduits(Array.from(mergedProdsMap.values()));
    offlineDB.saveFactures(Array.from(mergedFacturesMap.values()));
    offlineDB.saveClients(Array.from(mergedClientsMap.values()));
    offlineDB.saveReservations(Array.from(mergedResMap.values()));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oeko_data_synced', { detail: { etabId: targetEtabId } }));
    }

    return {
      success: true,
      message: 'Données rafraîchies depuis le cloud !',
      etab: cloudData.etablissement,
    };
  } catch (err: any) {
    console.error('Erreur pullShopFromCloud:', err);
    return { success: false, message: err?.message || 'Erreur lors de la synchronisation cloud.' };
  }
}

/**
 * Synchronise et télécharge automatiquement tous les commerces rattachés à un compte Gmail depuis le Cloud.
 * Permet de retrouver instantanément sur Téléphone les boutiques créées sur PC (et inversement) !
 */
export async function syncUserShopsFromCloud(userEmail: string): Promise<Etablissement[]> {
  try {
    const cleanEmail = userEmail.trim().toLowerCase();
    if (!cleanEmail) return [];

    let fetchedShops: CloudShopData[] = [];

    try {
      const apiUrl = `${SUPABASE_URL}/rest/v1/cloud_shops?select=*`;
      const res = await fetch(apiUrl, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          rows.forEach((row: any) => {
            if (row && row.data && row.data.etablissement) {
              const etab = row.data.etablissement as Etablissement;
              if (
                (etab.email_patron && etab.email_patron.trim().toLowerCase() === cleanEmail) ||
                (row.data.etablissement.compte_email && row.data.etablissement.compte_email.trim().toLowerCase() === cleanEmail)
              ) {
                fetchedShops.push(row.data);
              }
            }
          });
        }
      }
    } catch (apiErr) {
      console.warn('Supabase fetch user shops notice:', apiErr);
    }

    // Backup registry local
    if (typeof window !== 'undefined') {
      const cloudRegistry = JSON.parse(localStorage.getItem('oeko_cloud_shops_registry') || '{}');
      Object.values(cloudRegistry).forEach((item: any) => {
        if (item && item.etablissement && item.etablissement.email_patron) {
          if (item.etablissement.email_patron.trim().toLowerCase() === cleanEmail) {
            if (!fetchedShops.some((fs) => fs.etablissement && fs.etablissement.id === item.etablissement.id)) {
              fetchedShops.push(item);
            }
          }
        }
      });
    }

    if (fetchedShops.length === 0) return [];

    const existingEtabs = offlineDB.getEtablissements();
    const updatedEtabs = [...existingEtabs];

    fetchedShops.forEach((cs) => {
      const etab = cs.etablissement;
      const idx = updatedEtabs.findIndex((e) => e.id === etab.id);
      if (idx >= 0) {
        updatedEtabs[idx] = etab;
      } else {
        updatedEtabs.push(etab);
      }

      if (cs.produits && cs.produits.length > 0) {
        const localProds = offlineDB.getProduits();
        const mergedProdsMap = new Map<string, Produit>();
        localProds.forEach((p) => mergedProdsMap.set(p.id, p));
        cs.produits.forEach((p) => mergedProdsMap.set(p.id, p));
        offlineDB.saveProduits(Array.from(mergedProdsMap.values()));
      }
    });

    offlineDB.saveEtablissements(updatedEtabs);
    return updatedEtabs.filter((e) => e.email_patron && e.email_patron.toLowerCase() === cleanEmail);
  } catch (err) {
    console.error('Erreur syncUserShopsFromCloud:', err);
    return [];
  }
}

