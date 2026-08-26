import { Etablissement, Utilisateur, Produit, MouvementStock, Paiement, StatutAbonnement } from '@/types';
import { SEED_ETABLISSEMENT, SEED_UTILISATEURS, SEED_PRODUITS, SEED_MOUVEMENTS } from './presetData';

const STORAGE_KEYS = {
  ETABLISSEMENTS: 'saas_etablissements',
  ACTIVE_ETAB_ID: 'saas_active_etab_id',
  CURRENT_USER_ID: 'saas_current_user_id',
  UTILISATEURS: 'saas_utilisateurs',
  PRODUITS: 'saas_produits',
  MOUVEMENTS: 'saas_mouvements',
  PAIEMENTS: 'saas_paiements',
  OFFLINE_QUEUE: 'saas_offline_queue',
};

export const offlineDB = {
  // --- MULTI-TENANT ETABLISSEMENTS ---
  getEtablissements(): Etablissement[] {
    if (typeof window === 'undefined') return [SEED_ETABLISSEMENT];
    const saved = localStorage.getItem(STORAGE_KEYS.ETABLISSEMENTS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const initial = [SEED_ETABLISSEMENT];
    localStorage.setItem(STORAGE_KEYS.ETABLISSEMENTS, JSON.stringify(initial));
    return initial;
  },

  getEtablissement(): Etablissement {
    if (typeof window === 'undefined') return SEED_ETABLISSEMENT;
    const etabs = this.getEtablissements();
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_ETAB_ID);
    const active = etabs.find((e) => e.id === activeId);
    if (active) return active;

    localStorage.setItem(STORAGE_KEYS.ACTIVE_ETAB_ID, etabs[0].id);
    return etabs[0];
  },

  createEtablissement(data: { nom: string; type: 'bar' | 'snack_bar' | 'lounge'; ville: string; adresse?: string; patronNom: string; patronPin: string }): Etablissement {
    const list = this.getEtablissements();
    const newId = 'etab-' + Date.now();
    const newEtab: Etablissement = {
      id: newId,
      nom: data.nom,
      type: data.type,
      ville: data.ville,
      adresse: data.adresse || 'Centre Ville',
      plan: 'Premium',
      statut_abonnement: 'essai',
      date_fin_essai: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      date_prochain_paiement: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    const updated = [newEtab, ...list];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ETABLISSEMENTS, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ETAB_ID, newId);
    }

    // Créer le Patron avec PIN 4 chiffres
    const newPatron: Utilisateur = {
      id: 'user-' + Date.now(),
      etablissement_id: newId,
      nom: data.patronNom || 'Patron',
      role: 'Patron',
      pin_code: data.patronPin || '1234',
      actif: true,
      created_at: new Date().toISOString(),
    };

    const savedUsers = localStorage.getItem(STORAGE_KEYS.UTILISATEURS);
    const allUsers: Utilisateur[] = savedUsers ? JSON.parse(savedUsers) : SEED_UTILISATEURS;
    localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify([newPatron, ...allUsers]));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newPatron.id);

    // Copier les produits de démonstration pour cet établissement
    const demoProds: Produit[] = SEED_PRODUITS.map((p) => ({
      ...p,
      id: `prod-${newId}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      etablissement_id: newId,
    }));
    const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUITS);
    const allProds: Produit[] = savedProds ? JSON.parse(savedProds) : SEED_PRODUITS;
    localStorage.setItem(STORAGE_KEYS.PRODUITS, JSON.stringify([...demoProds, ...allProds]));

    return newEtab;
  },

  switchEtablissement(id: string): Etablissement | null {
    const etabs = this.getEtablissements();
    const target = etabs.find((e) => e.id === id);
    if (target && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ETAB_ID, id);
      return target;
    }
    return null;
  },

  // --- AUTHENTIFICATION PAR CODE PIN 4 CHIFFRES ---
  loginWithPin(pinCode: string): { user: Utilisateur; etablissement: Etablissement } | null {
    const activeEtab = this.getEtablissement();
    const users = this.getUtilisateurs();
    const matched = users.find((u) => u.pin_code === pinCode.trim() && u.actif);

    if (matched) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
      }
      return { user: matched, etablissement: activeEtab };
    }
    return null;
  },

  getCurrentUser(): Utilisateur {
    const users = this.getUtilisateurs();
    if (typeof window === 'undefined') return users[0] || SEED_UTILISATEURS[0];
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const current = users.find((u) => u.id === currentId);
    if (current) return current;
    return users[0] || SEED_UTILISATEURS[0];
  },

  // --- UTILISATEURS (PIN & RÔLES) ---
  getUtilisateurs(): Utilisateur[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_UTILISATEURS.filter((u) => u.etablissement_id === etab.id);
    const saved = localStorage.getItem(STORAGE_KEYS.UTILISATEURS);
    let allUsers: Utilisateur[] = [];
    if (saved) {
      try { allUsers = JSON.parse(saved); } catch (e) { console.error(e); }
    } else {
      allUsers = SEED_UTILISATEURS;
      localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify(allUsers));
    }
    return allUsers.filter((u) => u.etablissement_id === etab.id);
  },

  addUtilisateur(user: Omit<Utilisateur, 'id' | 'etablissement_id'>): Utilisateur {
    const etab = this.getEtablissement();
    const saved = localStorage.getItem(STORAGE_KEYS.UTILISATEURS);
    const allUsers: Utilisateur[] = saved ? JSON.parse(saved) : SEED_UTILISATEURS;

    const newUser: Utilisateur = {
      ...user,
      id: 'user-' + Date.now(),
      etablissement_id: etab.id,
      created_at: new Date().toISOString(),
    };

    const updated = [newUser, ...allUsers];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify(updated));
    }
    return newUser;
  },

  toggleUtilisateurStatus(id: string): void {
    const saved = localStorage.getItem(STORAGE_KEYS.UTILISATEURS);
    if (!saved) return;
    const allUsers: Utilisateur[] = JSON.parse(saved);
    const updated = allUsers.map((u) => (u.id === id ? { ...u, actif: !u.actif } : u));
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify(updated));
    }
  },

  // --- PRODUITS & STOCK ---
  getProduits(): Produit[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_PRODUITS.filter((p) => p.etablissement_id === etab.id);
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUITS);
    let allProds: Produit[] = [];
    if (saved) {
      try { allProds = JSON.parse(saved); } catch (e) { console.error(e); }
    } else {
      allProds = SEED_PRODUITS;
      localStorage.setItem(STORAGE_KEYS.PRODUITS, JSON.stringify(allProds));
    }
    return allProds.filter((p) => p.etablissement_id === etab.id);
  },

  saveProduits(produits: Produit[]): void {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUITS);
    const allProds: Produit[] = saved ? JSON.parse(saved) : SEED_PRODUITS;
    const otherProds = allProds.filter((p) => p.etablissement_id !== etab.id);
    localStorage.setItem(STORAGE_KEYS.PRODUITS, JSON.stringify([...produits, ...otherProds]));
  },

  getLowStockProducts(): Produit[] {
    const prods = this.getProduits();
    return prods.filter((p) => {
      const totalBottles = p.casiers_pleins * p.bouteilles_par_casier + p.bouteilles_vrac;
      return totalBottles <= p.seuil_alerte;
    });
  },

  // --- MOUVEMENTS DE STOCK (AVEC SUPPORT HORS-LIGNE & DELTA SYNC) ---
  getMouvements(): MouvementStock[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_MOUVEMENTS.filter((m) => m.etablissement_id === etab.id);
    const saved = localStorage.getItem(STORAGE_KEYS.MOUVEMENTS);
    let allMvts: MouvementStock[] = [];
    if (saved) {
      try { allMvts = JSON.parse(saved); } catch (e) { console.error(e); }
    } else {
      allMvts = SEED_MOUVEMENTS;
      localStorage.setItem(STORAGE_KEYS.MOUVEMENTS, JSON.stringify(allMvts));
    }

    const prods = this.getProduits();
    const users = this.getUtilisateurs();

    return allMvts
      .filter((m) => m.etablissement_id === etab.id)
      .map((m) => ({
        ...m,
        produit: prods.find((p) => p.id === m.produit_id),
        utilisateur: users.find((u) => u.id === m.utilisateur_id),
      }));
  },

  addMouvementStock(data: {
    produit_id: string;
    type_mouvement: 'entree' | 'sortie' | 'casse_perte';
    quantite_bouteilles: number;
    utilisateur_id?: string;
    note_motif: string;
  }): MouvementStock {
    const etab = this.getEtablissement();
    const currentUser = this.getCurrentUser();
    const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;

    const newMvt: MouvementStock = {
      id: 'mvt-' + Date.now(),
      etablissement_id: etab.id,
      produit_id: data.produit_id,
      type_mouvement: data.type_mouvement,
      quantite_bouteilles: data.quantite_bouteilles,
      utilisateur_id: data.utilisateur_id || currentUser.id,
      note_motif: data.note_motif,
      sync_status: isOnline ? 'synced' : 'pending_offline',
      client_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // Mettre à jour le stock en temps réel localement
    const delta = data.type_mouvement === 'entree' ? data.quantite_bouteilles : -data.quantite_bouteilles;
    const produits = this.getProduits();
    const updatedProduits = produits.map((p) => {
      if (p.id === data.produit_id) {
        let totalBottles = p.casiers_pleins * p.bouteilles_par_casier + p.bouteilles_vrac + delta;
        if (totalBottles < 0) totalBottles = 0;
        const casiers = Math.floor(totalBottles / p.bouteilles_par_casier);
        const vrac = totalBottles % p.bouteilles_par_casier;
        return {
          ...p,
          casiers_pleins: casiers,
          bouteilles_vrac: vrac,
          quantite_totale_bouteilles: totalBottles,
        };
      }
      return p;
    });
    this.saveProduits(updatedProduits);

    // Sauvegarder le mouvement
    const saved = localStorage.getItem(STORAGE_KEYS.MOUVEMENTS);
    const allMvts: MouvementStock[] = saved ? JSON.parse(saved) : SEED_MOUVEMENTS;
    const updatedMvts = [newMvt, ...allMvts];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MOUVEMENTS, JSON.stringify(updatedMvts));
    }

    // Ajouter à la file hors-ligne si déconnecté
    if (!isOnline) {
      this.addToOfflineQueue(newMvt);
    }

    return newMvt;
  },

  // FILE D'ATTENTE HORS-LIGNE & SYNCHRO
  addToOfflineQueue(item: any): void {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    const queue = saved ? JSON.parse(saved) : [];
    queue.push(item);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  },

  getOfflineQueueCount(): number {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return saved ? JSON.parse(saved).length : 0;
  },

  syncOfflineQueue(): number {
    if (typeof window === 'undefined') return 0;
    const count = this.getOfflineQueueCount();
    if (count === 0) return 0;

    // Marquer tous les mouvements hors-ligne comme synchronisés
    const savedMvts = localStorage.getItem(STORAGE_KEYS.MOUVEMENTS);
    if (savedMvts) {
      const allMvts: MouvementStock[] = JSON.parse(savedMvts);
      const synced = allMvts.map((m) => ({ ...m, sync_status: 'synced' as const }));
      localStorage.setItem(STORAGE_KEYS.MOUVEMENTS, JSON.stringify(synced));
    }
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return count;
  },

  // --- ABONNEMENT & PAIEMENT MOBILE MONEY (ORANGE MONEY / MTN MOMO) ---
  processMobileMoneyPayment(data: {
    montant: number;
    methode: 'Orange Money' | 'MTN MoMo';
    telephone_payeur: string;
  }): Paiement {
    const etab = this.getEtablissement();
    const newPaiement: Paiement = {
      id: 'pay-' + Date.now(),
      etablissement_id: etab.id,
      montant: data.montant,
      methode: data.methode,
      telephone_payeur: data.telephone_payeur,
      reference_transaction: `TXN-${data.methode === 'Orange Money' ? 'OM' : 'MOMO'}-${Date.now().toString().slice(-6)}`,
      statut: 'reussi', // Webhook simulé valide immédiatement
      created_at: new Date().toISOString(),
    };

    // Repousser la date d'expiration de l'abonnement de +30 jours
    const currentFin = new Date(etab.date_fin_essai);
    const now = new Date();
    const baseDate = currentFin > now ? currentFin : now;
    baseDate.setDate(baseDate.getDate() + 30);

    const updatedEtab: Etablissement = {
      ...etab,
      statut_abonnement: 'actif',
      date_prochain_paiement: baseDate.toISOString(),
      date_fin_essai: baseDate.toISOString(),
    };

    const etabs = this.getEtablissements();
    const updatedList = etabs.map((e) => (e.id === etab.id ? updatedEtab : e));
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ETABLISSEMENTS, JSON.stringify(updatedList));

      const savedPaiements = localStorage.getItem(STORAGE_KEYS.PAIEMENTS);
      const allPaiements: Paiement[] = savedPaiements ? JSON.parse(savedPaiements) : [];
      localStorage.setItem(STORAGE_KEYS.PAIEMENTS, JSON.stringify([newPaiement, ...allPaiements]));
    }

    return newPaiement;
  },
};
