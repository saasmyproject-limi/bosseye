import { supabase } from './supabase';
import { offlineDB } from './offlineDB';
import { Etablissement, Produit, Facture, Client, Reservation } from '@/types';

export interface SyncQueueItem {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'upsert' | 'delete';
  payload: any;
  createdAt: string;
}

export interface SyncEngineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

const QUEUE_STORAGE_KEY = 'oeko_offline_sync_queue';

class SupabaseSyncEngine {
  private isOnlineStatus: boolean = typeof window !== 'undefined' ? navigator.onLine : true;
  private isSyncingStatus: boolean = false;
  private lastErrorStatus: string | null = null;
  private lastSyncTime: string | null = null;
  private listeners: Set<(status: SyncEngineStatus) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnlineStatus = true;
        this.notify();
        this.processQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnlineStatus = false;
        this.notify();
      });
    }
  }

  public subscribe(callback: (status: SyncEngineStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => this.listeners.delete(callback);
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => cb(status));
  }

  public getStatus(): SyncEngineStatus {
    return {
      isOnline: this.isOnlineStatus,
      isSyncing: this.isSyncingStatus,
      pendingCount: this.getQueue().length,
      lastSyncAt: this.lastSyncTime,
      lastError: this.lastErrorStatus,
    };
  }

  public getQueue(): SyncQueueItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: SyncQueueItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    this.notify();
  }

  public enqueue(table: string, action: 'insert' | 'update' | 'upsert' | 'delete', payload: any): void {
    const queue = this.getQueue();
    // Anti-doublon basé sur l'UUID (id)
    const existingIdx = queue.findIndex((q) => q.table === table && q.payload?.id && q.payload.id === payload.id);

    const newItem: SyncQueueItem = {
      id: payload.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      table,
      action,
      payload,
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      queue[existingIdx] = newItem;
    } else {
      queue.push(newItem);
    }

    this.saveQueue(queue);

    if (this.isOnlineStatus) {
      this.processQueue();
    }
  }

  public async processQueue(): Promise<void> {
    if (this.isSyncingStatus || !this.isOnlineStatus) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncingStatus = true;
    this.notify();

    const remainingQueue: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        let targetTable = item.table;
        let payload = { ...item.payload };

        if (targetTable === 'articles') targetTable = 'produits';
        if (targetTable === 'commandes_en_ligne') targetTable = 'livraisons';
        if (targetTable === 'creances') targetTable = 'dettes';

        // Sanitiser les colonnes selon le schéma de tables Supabase
        if (targetTable === 'produits') {
          if (!payload.etablissement_id && payload.activite_id) payload.etablissement_id = payload.activite_id;
          if (!payload.activite_id && payload.etablissement_id) payload.activite_id = payload.etablissement_id;
        } else if (targetTable === 'mouvements_stock') {
          if (!payload.etablissement_id && payload.activite_id) payload.etablissement_id = payload.activite_id;
          if (!payload.activite_id && payload.etablissement_id) payload.activite_id = payload.etablissement_id;
          if (!payload.produit_id && payload.article_id) payload.produit_id = payload.article_id;
          if (!payload.article_id && payload.produit_id) payload.article_id = payload.produit_id;
        } else if (targetTable === 'ventes') {
          if (!payload.etablissement_id && payload.activite_id) payload.etablissement_id = payload.activite_id;
          if (!payload.activite_id && payload.etablissement_id) payload.activite_id = payload.etablissement_id;
          if (!payload.numero_ticket && payload.numero_facture) payload.numero_ticket = payload.numero_facture;
          if (payload.montant_total === undefined && payload.total_ttc !== undefined) payload.montant_total = payload.total_ttc;
          if (payload.statut === 'credit_encours') {
            payload.statut = (payload.montant_paye && payload.montant_paye > 0) ? 'partielle' : 'impayee';
          }
        } else if (targetTable === 'lignes_vente') {
          if (payload.total === undefined && payload.total_ligne !== undefined) payload.total = payload.total_ligne;
          if (!payload.etablissement_id && payload.activite_id) payload.etablissement_id = payload.activite_id;
        } else if (targetTable === 'dettes') {
          if (!payload.etablissement_id && payload.activite_id) payload.etablissement_id = payload.activite_id;
          if (!payload.statut) payload.statut = 'en_cours';
        } else if (targetTable === 'paiements') {
          if (!payload.etablissement_id && payload.activite_id) payload.etablissement_id = payload.activite_id;
          const m = (payload.methode || '').toLowerCase();
          if (m.includes('orange') || m.includes('om')) payload.methode = 'Orange Money';
          else if (m.includes('mtn') || m.includes('momo')) payload.methode = 'MTN MoMo';
          else if (m.includes('carte')) payload.methode = 'Carte';
          else if (m.includes('vir')) payload.methode = 'Virement';
          else payload.methode = 'Especes';
        } else if (targetTable === 'journal_audit') {
          const raw = payload;
          payload = {
            id: raw.id,
            etablissement_id: raw.etablissement_id || raw.activite_id,
            action: raw.action || raw.action_type || 'audit',
            details: raw.details || {
              article_id: raw.article_id,
              variation_quantite: raw.variation_quantite,
              quantite_avant: raw.quantite_avant,
              quantite_apres: raw.quantite_apres,
              motif: raw.motif,
              auteur_nom: raw.auteur_nom,
              auteur_role: raw.auteur_role,
            },
            created_at: raw.created_at || new Date().toISOString(),
          };
        }

        let err = null;
        if (item.action === 'insert' || item.action === 'upsert') {
          const { error } = await supabase.from(targetTable).upsert(payload);
          err = error;
        } else if (item.action === 'update') {
          const { error } = await supabase.from(targetTable).update(payload).eq('id', payload.id);
          err = error;
        } else if (item.action === 'delete') {
          const { error } = await supabase.from(targetTable).delete().eq('id', payload.id);
          err = error;
        }

        if (err) {
          console.warn(`[SyncEngine] Erreur sync item ${targetTable}:${item.id}`, err.message);
          this.lastErrorStatus = `Table ${targetTable} : ${err.message}`;
          remainingQueue.push(item);
        }
      } catch (err: any) {
        console.error(`[SyncEngine] Exception sync item`, err);
        remainingQueue.push(item);
      }
    }

    this.saveQueue(remainingQueue);
    this.isSyncingStatus = false;
    this.lastSyncTime = new Date().toLocaleTimeString('fr-FR');
    this.notify();
  }

  /**
   * Charge la boutique et son catalogue complet depuis Supabase Cloud
   */
  public async fetchActiviteFromCloud(activiteId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isOnlineStatus) {
      return { success: false, error: 'Serveur injoignable (Mode hors-ligne)' };
    }

    this.isSyncingStatus = true;
    this.notify();

    try {
      // 1. Charger l'activité
      const { data: actData, error: actErr } = await supabase
        .from('activites')
        .select('*')
        .eq('id', activiteId)
        .single();

      if (actErr) throw actErr;

      // 2. Charger les articles
      const { data: artData, error: artErr } = await supabase
        .from('articles')
        .select('*')
        .eq('activite_id', activiteId);

      if (artErr) throw artErr;

      // 3. Charger les mouvements de stock pour calculer les quantités exactes
      const { data: mvtData, error: mvtErr } = await supabase
        .from('mouvements_stock')
        .select('*')
        .eq('activite_id', activiteId);

      if (mvtErr) throw mvtErr;

      // 4. Charger les ventes & clients
      const { data: ventesData } = await supabase.from('ventes').select('*').eq('activite_id', activiteId);
      const { data: clientsData } = await supabase.from('clients').select('*').eq('activite_id', activiteId);

      // Fusionner et sauvegarder dans le cache local
      if (actData) {
        offlineDB.saveEtablissements([actData as any]);
        offlineDB.switchEtablissement(actData.id);
      }

      if (artData) {
        // Calcul du stock exact à partir des mouvements
        const stockMap: Record<string, number> = {};
        (mvtData || []).forEach((m: any) => {
          stockMap[m.article_id] = (stockMap[m.article_id] || 0) + (m.quantite || 0);
        });

        const produitsMapped: Produit[] = artData.map((a: any) => {
          const currentStock = stockMap[a.id] !== undefined ? stockMap[a.id] : 0;
          return {
            id: a.id,
            etablissement_id: a.activite_id,
            nom: a.nom,
            categorie: a.categorie || 'Général',
            code_barres: a.code_unique,
            code_interne: a.code_unique,
            prix_vente: Number(a.prix_vente) || 0,
            prix_achat: 0, // Inaccessible par défaut si rôle employé
            stock: currentStock,
            quantite_totale: currentStock,
            actif: a.actif !== false,
            unite: a.mode_suivi === 'unite' ? 'unite' : 'piece',
            seuil_alerte: a.seuil_alerte || 5,
          };
        });

        offlineDB.saveProduits(produitsMapped);
      }

      if (ventesData) {
        offlineDB.saveFactures(ventesData as any);
      }

      if (clientsData) {
        offlineDB.saveClients(clientsData as any);
      }

      this.isSyncingStatus = false;
      this.lastErrorStatus = null;
      this.lastSyncTime = new Date().toLocaleTimeString('fr-FR');
      this.notify();

      return { success: true };
    } catch (err: any) {
      console.error('[SyncEngine] Error fetchActiviteFromCloud:', err);
      this.isSyncingStatus = false;
      this.lastErrorStatus = err?.message || 'Impossible de joindre le serveur Cloud';
      this.notify();
      return { success: false, error: this.lastErrorStatus || 'Impossible de joindre le serveur' };
    }
  }
}

export const syncEngine = new SupabaseSyncEngine();
