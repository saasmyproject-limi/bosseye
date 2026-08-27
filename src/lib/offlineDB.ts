import {
  Etablissement,
  Utilisateur,
  Produit,
  MouvementStock,
  Client,
  Facture,
  RemboursementCredit,
  ChargeJournaliere,
  TransactionVente,
  LigneTransaction,
  VarianteProduit,
  TypeActivite,
  TypeEtablissement,
  MethodePaiement,
  Paiement,
  CommandeEnLigne,
  Caisse,
  TARIFS_ABONNEMENT,
  StatutLivraison,
  Reservation,
  LigneReservation,
} from '@/types';
import {
  SEED_ETABLISSEMENT,
  SEED_ETABLISSEMENTS_LIST,
  SEED_UTILISATEURS,
  SEED_PRODUITS,
  SEED_MOUVEMENTS,
  SEED_CLIENTS,
  SEED_FACTURES,
  SEED_REMBOURSEMENTS,
  SEED_CHARGES,
  SEED_COMMANDES_LIGNE,
  SEED_CAISSES,
} from './presetData';

const KEYS = {
  ACTIVE_ETAB_ID: 'oeko_active_etab_id',
  ETABLISSEMENTS: 'oeko_etablissements',
  UTILISATEURS: 'oeko_utilisateurs',
  CURRENT_USER_ID: 'oeko_current_user_id',
  PRODUITS: 'oeko_produits',
  MOUVEMENTS: 'oeko_mouvements',
  CLIENTS: 'oeko_clients',
  FACTURES: 'oeko_factures',
  TRANSACTIONS: 'oeko_transactions_ventes',
  COMMANDES_LIGNE: 'oeko_commandes_ligne',
  CAISSES: 'oeko_caisses',
  REMBOURSEMENTS: 'oeko_remboursements',
  CHARGES: 'oeko_charges',
  RESERVATIONS: 'oeko_reservations',
  OFFLINE_QUEUE: 'oeko_offline_queue',
  RESET_ZERO: 'oeko_db_reset_zero',
};

// Helper pour déterminer le vocabulaire selon le type d'activité (œko)
export function getTerminology(type_activite?: TypeActivite) {
  const isBoutique = type_activite === 'boutique';
  const isBar = type_activite === 'bar';

  return {
    appName: 'œko',
    appTagline: 'L\'œil du patron',
    itemLabel: isBoutique ? 'Article' : 'Produit / Boisson',
    itemsLabel: isBoutique ? 'Articles' : 'Boissons',
    unitLabel: isBoutique ? 'Pièces' : 'Bouteilles',
    unitSingular: isBoutique ? 'Pièce' : 'Bouteille',
    stockLabel: isBoutique ? 'Stock d\'articles' : 'Stock de casiers & bouteilles',
    sellerLabel: isBoutique ? 'Vendeuse / Employée' : isBar ? 'Serveuse' : 'Serveuse / Caissière',
    salesScreenTitle: isBoutique ? 'Vente Comptoir & Livraisons' : isBar ? 'Gestion des Tables' : 'Prise de Commande & Caisses',
    salesScreenDesc: isBoutique
      ? 'Vente directe au comptoir, gestion des déclinaisons (tailles/couleurs) et suivi des commandes en ligne.'
      : isBar
      ? 'Ouverture de table, accumulation de consommations et factures divisibles.'
      : 'Flux 2 étapes : serveuse transmet à la caisse, la caissière valide et déstocke.',
  };
}

export const offlineDB = {
  // --- ÉTABLISSEMENT & SECTEUR ---
  getEtablissement(): Etablissement {
    try {
      const activeId = typeof window !== 'undefined' ? localStorage.getItem(KEYS.ACTIVE_ETAB_ID) : null;
      const all = this.getEtablissements();
      if (all.length === 0) {
        return {
          id: 'etab-nouveau',
          nom: 'Nouveau Commerce œko',
          type: 'boutique',
          type_activite: 'boutique',
          ville: 'Douala',
          adresse: 'Nouveau commerce',
          plan: 'Premium',
          statut_abonnement: 'essai',
          tarif_mensuel: 5000,
          date_fin_essai: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          date_prochain_paiement: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        };
      }
      if (activeId) {
        const found = all.find((e) => e && e.id === activeId);
        if (found) return this.normalizeEtablissement(found);
      }
      return this.normalizeEtablissement(all[0] || SEED_ETABLISSEMENT);
    } catch {
      return this.normalizeEtablissement(SEED_ETABLISSEMENT);
    }
  },

  normalizeEtablissement(e: Etablissement): Etablissement {
    let act: TypeActivite = e.type_activite || 'snack';
    if (!e.type_activite) {
      if (e.type === 'boutique') act = 'boutique';
      else if (e.type === 'bar' || e.type === 'lounge') act = 'bar';
      else act = 'snack';
    }
    const tarif = e.tarif_mensuel || TARIFS_ABONNEMENT[act] || 5000;
    return {
      ...e,
      type_activite: act,
      tarif_mensuel: tarif,
    };
  },

  getEtablissements(): Etablissement[] {
    try {
      if (typeof window === 'undefined') return SEED_ETABLISSEMENTS_LIST.map((e) => this.normalizeEtablissement(e));
      const isResetZero = localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      const data = localStorage.getItem(KEYS.ETABLISSEMENTS);

      if (!data) {
        if (isResetZero) return [];
        localStorage.setItem(KEYS.ETABLISSEMENTS, JSON.stringify(SEED_ETABLISSEMENTS_LIST));
        return SEED_ETABLISSEMENTS_LIST.map((e) => this.normalizeEtablissement(e));
      }
      const parsed: Etablissement[] = JSON.parse(data);
      return (parsed || []).map((e) => this.normalizeEtablissement(e));
    } catch {
      return SEED_ETABLISSEMENTS_LIST.map((e) => this.normalizeEtablissement(e));
    }
  },

  switchEtablissement(id: string) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.ACTIVE_ETAB_ID, id);
        const users = this.getUtilisateurs();
        const firstUserInEtab = users.find((u) => u && u.etablissement_id === id);
        if (firstUserInEtab) {
          localStorage.setItem(KEYS.CURRENT_USER_ID, firstUserInEtab.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  createEtablissement(params: {
    nom: string;
    type?: TypeEtablissement;
    type_activite: TypeActivite;
    ville: string;
    adresse: string;
    patronNom: string;
    patronPin: string;
  }): Etablissement {
    const etabs = this.getEtablissements();
    const newId = `etab-${Date.now()}`;
    const act = params.type_activite;
    const tarif = TARIFS_ABONNEMENT[act] || 5000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const nowIso = new Date().toISOString();
    const endTrialIso = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();

    const newEtab: Etablissement = {
      id: newId,
      nom: params.nom,
      type: params.type || (act as TypeEtablissement),
      type_activite: act,
      ville: params.ville,
      adresse: params.adresse,
      plan: 'Premium',
      statut_abonnement: 'essai',
      tarif_mensuel: tarif,
      date_fin_essai: endTrialIso,
      date_prochain_paiement: endTrialIso,
      created_at: nowIso,
    };

    const patronRole = act === 'snack' ? 'Directeur' : 'Patronne';

    const newPatron: Utilisateur = {
      id: `user-patron-${Date.now()}`,
      etablissement_id: newId,
      nom: params.patronNom || (act === 'snack' ? 'M. Directeur' : 'Mme Patronne'),
      role: patronRole,
      pin_code: params.patronPin || '1234',
      actif: true,
      created_at: nowIso,
    };

    const users = this.getUtilisateurs();
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.ETABLISSEMENTS, JSON.stringify([newEtab, ...etabs]));
        localStorage.setItem(KEYS.UTILISATEURS, JSON.stringify([newPatron, ...users]));
        localStorage.setItem(KEYS.ACTIVE_ETAB_ID, newId);
        localStorage.setItem(KEYS.CURRENT_USER_ID, newPatron.id);
      }
    } catch (e) {
      console.error(e);
    }

    return newEtab;
  },

  // --- PURGER LA BASE DE DONNÉES À ZÉRO (TEST FROM SCRATCH) ---
  clearAllDataToZero() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.RESET_ZERO, 'true');
        localStorage.setItem(KEYS.ETABLISSEMENTS, JSON.stringify([]));
        localStorage.setItem(KEYS.UTILISATEURS, JSON.stringify([]));
        localStorage.setItem(KEYS.PRODUITS, JSON.stringify([]));
        localStorage.setItem(KEYS.FACTURES, JSON.stringify([]));
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
        localStorage.setItem(KEYS.COMMANDES_LIGNE, JSON.stringify([]));
        localStorage.setItem(KEYS.CLIENTS, JSON.stringify([]));
        localStorage.setItem(KEYS.CAISSES, JSON.stringify([]));
        localStorage.setItem(KEYS.MOUVEMENTS, JSON.stringify([]));
        localStorage.setItem(KEYS.CHARGES, JSON.stringify([]));
        localStorage.setItem(KEYS.REMBOURSEMENTS, JSON.stringify([]));
        localStorage.removeItem(KEYS.ACTIVE_ETAB_ID);
        localStorage.removeItem(KEYS.CURRENT_USER_ID);
      }
    } catch (e) { console.error(e); }
  },

  // --- RECHARGER LES DONNÉES DÉMO D'ORIGINE ---
  restoreDemoSeedData() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(KEYS.RESET_ZERO);
        localStorage.setItem(KEYS.ETABLISSEMENTS, JSON.stringify(SEED_ETABLISSEMENTS_LIST));
        localStorage.setItem(KEYS.UTILISATEURS, JSON.stringify(SEED_UTILISATEURS));
        localStorage.setItem(KEYS.PRODUITS, JSON.stringify(SEED_PRODUITS));
        localStorage.setItem(KEYS.FACTURES, JSON.stringify(SEED_FACTURES));
        localStorage.setItem(KEYS.COMMANDES_LIGNE, JSON.stringify(SEED_COMMANDES_LIGNE));
        localStorage.setItem(KEYS.CLIENTS, JSON.stringify(SEED_CLIENTS));
        localStorage.setItem(KEYS.CAISSES, JSON.stringify(SEED_CAISSES));
        localStorage.setItem(KEYS.MOUVEMENTS, JSON.stringify(SEED_MOUVEMENTS));
        localStorage.setItem(KEYS.CHARGES, JSON.stringify(SEED_CHARGES));
        localStorage.setItem(KEYS.REMBOURSEMENTS, JSON.stringify(SEED_REMBOURSEMENTS));
        localStorage.setItem(KEYS.ACTIVE_ETAB_ID, SEED_ETABLISSEMENT.id);
        localStorage.setItem(KEYS.CURRENT_USER_ID, SEED_UTILISATEURS[0].id);
      }
    } catch (e) { console.error(e); }
  },

  isTrialExpired(etab: Etablissement): boolean {
    if (etab.statut_abonnement === 'actif') return false;
    if (etab.statut_abonnement === 'expire') return true;
    const endTrial = new Date(etab.date_fin_essai).getTime();
    return Date.now() > endTrial;
  },

  getTrialDaysRemaining(etab: Etablissement): number {
    if (etab.statut_abonnement === 'actif') return 30;
    const endTrial = new Date(etab.date_fin_essai).getTime();
    const diff = endTrial - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  processMobileMoneyPayment(params: {
    plan?: 'Basique' | 'Premium';
    methode: MethodePaiement;
    telephone?: string;
    telephone_payeur?: string;
    reference?: string;
    reference_transaction?: string;
    montant?: number;
  }) {
    const etab = this.getEtablissement();
    const now = new Date();
    const nextPay = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const updated = {
      ...etab,
      plan: params.plan || 'Premium',
      statut_abonnement: 'actif' as const,
      date_prochain_paiement: nextPay,
    };

    const phone = params.telephone || params.telephone_payeur || '';
    const ref = params.reference || params.reference_transaction || '';

    const newPaiement: Paiement = {
      id: `pay-${Date.now()}`,
      etablissement_id: etab.id,
      montant: params.montant || etab.tarif_mensuel || 5000,
      methode: params.methode,
      telephone_payeur: phone,
      reference_transaction: ref,
      statut: 'reussi',
      created_at: now.toISOString(),
    };

    const etabs = this.getEtablissements();
    const newEtabs = etabs.map((e) => (e.id === etab.id ? updated : e));
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.ETABLISSEMENTS, JSON.stringify(newEtabs));
      }
    } catch (e) { console.error(e); }
    return newPaiement;
  },

  // --- UTILISATEURS ---
  getCurrentUser(): Utilisateur {
    try {
      const users = this.getUtilisateurs();
      const currentId = typeof window !== 'undefined' ? localStorage.getItem(KEYS.CURRENT_USER_ID) : null;
      if (currentId) {
        const found = users.find((u) => u && u.id === currentId);
        if (found) return found;
      }
      return users[0] || {
        id: 'user-patron-defaut',
        etablissement_id: 'etab-nouveau',
        nom: 'Mme Patronne',
        role: 'Patronne',
        pin_code: '1234',
        actif: true,
      };
    } catch {
      return SEED_UTILISATEURS[0];
    }
  },

  setCurrentUserById(id: string) {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.CURRENT_USER_ID, id);
    } catch (e) {
      console.error(e);
    }
  },

  getUtilisateurs(): Utilisateur[] {
    try {
      const etab = this.getEtablissement();
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') return SEED_UTILISATEURS.filter((u) => u && u.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.UTILISATEURS);
      if (!data) {
        if (isResetZero) return [];
        localStorage.setItem(KEYS.UTILISATEURS, JSON.stringify(SEED_UTILISATEURS));
        return SEED_UTILISATEURS.filter((u) => u && u.etablissement_id === etab.id);
      }
      const parsed: Utilisateur[] = JSON.parse(data);
      return (parsed || []).filter((u) => u && u.etablissement_id === etab.id);
    } catch {
      return SEED_UTILISATEURS;
    }
  },

  loginWithPin(code: string): { success: boolean; user?: Utilisateur; message?: string } {
    const users = this.getUtilisateurs();
    const match = users.find((u) => u && u.actif && u.pin_code === code.trim());
    if (match) {
      this.setCurrentUserById(match.id);
      return { success: true, user: match };
    }
    return { success: false, message: 'Code PIN incorrect. Réessayez.' };
  },

  addUtilisateur(user: Partial<Utilisateur> & { nom: string; role: any; pin_code: string }): Utilisateur {
    const etab = this.getEtablissement();
    const allUsers = this.getAllUtilisateursGlobal();
    const newUser: Utilisateur = {
      ...user,
      id: `user-${Date.now()}`,
      etablissement_id: etab.id,
      actif: user.actif ?? true,
      created_at: new Date().toISOString(),
    };
    const updated = [newUser, ...allUsers];
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.UTILISATEURS, JSON.stringify(updated));
    } catch (e) { console.error(e); }
    return newUser;
  },

  getAllUtilisateursGlobal(): Utilisateur[] {
    try {
      if (typeof window === 'undefined') return SEED_UTILISATEURS;
      const data = localStorage.getItem(KEYS.UTILISATEURS);
      return data ? JSON.parse(data) : SEED_UTILISATEURS;
    } catch { return SEED_UTILISATEURS; }
  },

  toggleUtilisateurStatus(id: string) {
    const allUsers = this.getAllUtilisateursGlobal();
    const updated = allUsers.map((u) => (u.id === id ? { ...u, actif: !u.actif } : u));
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.UTILISATEURS, JSON.stringify(updated));
    } catch (e) { console.error(e); }
  },

  // --- MULTI-CAISSES (SNACK) ---
  getCaisses(): Caisse[] {
    try {
      const etab = this.getEtablissement();
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') return SEED_CAISSES.filter((c) => c && c.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.CAISSES);
      if (!data) {
        if (isResetZero) return [];
        localStorage.setItem(KEYS.CAISSES, JSON.stringify(SEED_CAISSES));
        return SEED_CAISSES.filter((c) => c && c.etablissement_id === etab.id);
      }
      const parsed: Caisse[] = JSON.parse(data);
      return (parsed || []).filter((c) => c && c.etablissement_id === etab.id);
    } catch { return SEED_CAISSES; }
  },

  // --- COMMANDES EN LIGNE & LIVRAISONS (BOUTIQUE) ---
  getCommandesEnLigne(): CommandeEnLigne[] {
    try {
      const etab = this.getEtablissement();
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') return SEED_COMMANDES_LIGNE.filter((c) => c && c.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.COMMANDES_LIGNE);
      if (!data) {
        if (isResetZero) return [];
        localStorage.setItem(KEYS.COMMANDES_LIGNE, JSON.stringify(SEED_COMMANDES_LIGNE));
        return SEED_COMMANDES_LIGNE.filter((c) => c && c.etablissement_id === etab.id);
      }
      const parsed: CommandeEnLigne[] = JSON.parse(data);
      return (parsed || []).filter((c) => c && c.etablissement_id === etab.id);
    } catch { return SEED_COMMANDES_LIGNE; }
  },

  addCommandeEnLigne(cmd: Omit<CommandeEnLigne, 'id' | 'etablissement_id' | 'numero_commande' | 'created_at'>): CommandeEnLigne {
    const etab = this.getEtablissement();
    const numSeq = Math.floor(100 + Math.random() * 900);
    const newCmd: CommandeEnLigne = {
      ...cmd,
      id: `cmd-${Date.now()}`,
      etablissement_id: etab.id,
      numero_commande: `CMD-2026-${numSeq}`,
      created_at: new Date().toISOString(),
    };
    const all = this.getAllCommandesGlobal();
    const updated = [newCmd, ...all];
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.COMMANDES_LIGNE, JSON.stringify(updated));
    } catch (e) { console.error(e); }
    return newCmd;
  },

  updateStatutCommandeEnLigne(commandeId: string, newStatut: StatutLivraison): CommandeEnLigne | null {
    const cmds = this.getCommandesEnLigne();
    const cmd = cmds.find((c) => c.id === commandeId);
    if (!cmd) return null;

    const updatedCmd: CommandeEnLigne = { ...cmd, statut: newStatut };

    if (newStatut === 'livree_payee' && cmd.statut !== 'livree_payee') {
      const fac = this.createFacture({
        lignes: cmd.lignes.map((l) => ({
          produit_id: l.produit_id,
          variante_id: l.variante_id,
          nom_produit: l.nom_produit,
          detail_variante: l.detail_variante,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire,
        })),
        mode_paiement: 'cash',
        transaction_id: `LIVRAISON-${cmd.numero_commande}`,
      });
      updatedCmd.facture_id = fac.id;
    }

    const all = this.getAllCommandesGlobal().map((c) => (c.id === commandeId ? updatedCmd : c));
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.COMMANDES_LIGNE, JSON.stringify(all));
    } catch (e) { console.error(e); }

    return updatedCmd;
  },

  getAllCommandesGlobal(): CommandeEnLigne[] {
    try {
      if (typeof window === 'undefined') return SEED_COMMANDES_LIGNE;
      const data = localStorage.getItem(KEYS.COMMANDES_LIGNE);
      return data ? JSON.parse(data) : SEED_COMMANDES_LIGNE;
    } catch { return SEED_COMMANDES_LIGNE; }
  },

  // --- PRODUITS & VARIANTES ---
  getProduits(): Produit[] {
    try {
      const etab = this.getEtablissement();
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') return SEED_PRODUITS.filter((p) => p && p.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.PRODUITS);
      if (!data) {
        if (isResetZero) return [];
        localStorage.setItem(KEYS.PRODUITS, JSON.stringify(SEED_PRODUITS));
        return SEED_PRODUITS.filter((p) => p && p.etablissement_id === etab.id);
      }
      const parsed: Produit[] = JSON.parse(data);
      return (parsed || []).filter((p) => p && p.etablissement_id === etab.id);
    } catch {
      return SEED_PRODUITS;
    }
  },

  saveProduits(produits: Produit[]) {
    try {
      const etab = this.getEtablissement();
      const allOther = this.getAllProduitsGlobal().filter((p) => p && p.etablissement_id !== etab.id);
      const newAll = [...produits, ...allOther];
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.PRODUITS, JSON.stringify(newAll));
    } catch (e) { console.error(e); }
  },

  getAllProduitsGlobal(): Produit[] {
    try {
      if (typeof window === 'undefined') return SEED_PRODUITS;
      const data = localStorage.getItem(KEYS.PRODUITS);
      return data ? JSON.parse(data) : SEED_PRODUITS;
    } catch { return SEED_PRODUITS; }
  },

  getLowStockProducts(): Produit[] {
    const prods = this.getProduits();
    return prods.filter((p) => {
      if (!p) return false;
      const totalUnits = (p.casiers_pleins || 0) * (p.bouteilles_par_casier || 24) + (p.bouteilles_vrac || 0) + (p.quantite_totale || 0);
      return totalUnits <= (p.seuil_alerte || 10);
    });
  },

  // --- TRANSACTIONS DE VENTE ---
  getTransactions(): TransactionVente[] {
    try {
      const etab = this.getEtablissement();
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.TRANSACTIONS);
      const parsed: TransactionVente[] = data ? JSON.parse(data) : [];
      return (parsed || []).filter((t) => t && t.etablissement_id === etab.id);
    } catch { return []; }
  },

  saveTransaction(trx: TransactionVente): TransactionVente {
    const all = this.getAllTransactionsGlobal();
    const existingIndex = all.findIndex((t) => t.id === trx.id);
    let updated: TransactionVente[];
    if (existingIndex >= 0) {
      all[existingIndex] = trx;
      updated = [...all];
    } else {
      updated = [trx, ...all];
    }
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));
    } catch (e) { console.error(e); }
    return trx;
  },

  getAllTransactionsGlobal(): TransactionVente[] {
    try {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  // --- MOUVEMENTS STOCK ---
  getMouvements(): MouvementStock[] {
    try {
      const etab = this.getEtablissement();
      const users = this.getAllUtilisateursGlobal();
      const prods = this.getAllProduitsGlobal();
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') return SEED_MOUVEMENTS.filter((m) => m && m.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.MOUVEMENTS);
      if (!data && isResetZero) return [];
      const list: MouvementStock[] = data ? JSON.parse(data) : SEED_MOUVEMENTS;

      return (list || [])
        .filter((m) => m && m.etablissement_id === etab.id)
        .map((m) => ({
          ...m,
          utilisateur: users.find((u) => u && u.id === m.utilisateur_id),
          produit: prods.find((p) => p && p.id === m.produit_id),
        }));
    } catch {
      return SEED_MOUVEMENTS;
    }
  },

  addMouvementStock(mvt: Omit<MouvementStock, 'id' | 'etablissement_id' | 'sync_status' | 'client_timestamp' | 'created_at'>): MouvementStock {
    const etab = this.getEtablissement();
    const nowIso = new Date().toISOString();
    const newMvt: MouvementStock = {
      ...mvt,
      id: `mvt-${Date.now()}`,
      etablissement_id: etab.id,
      sync_status: typeof navigator !== 'undefined' && !navigator.onLine ? 'pending_offline' : 'synced',
      client_timestamp: nowIso,
      created_at: nowIso,
    };

    const allMvts = this.getAllMouvementsGlobal();
    const updatedMvts = [newMvt, ...allMvts];

    const prods = this.getProduits();
    const updatedProds = prods.map((p) => {
      if (p.id !== mvt.produit_id) return p;

      let newVrac = p.bouteilles_vrac || 0;
      let newCasiers = p.casiers_pleins || 0;
      let newTotale = p.quantite_totale || 0;

      if (mvt.type_mouvement === 'entree') {
        newVrac += mvt.quantite_bouteilles;
        newTotale += mvt.quantite_bouteilles;
      } else {
        newVrac = Math.max(0, newVrac - mvt.quantite_bouteilles);
        newTotale = Math.max(0, newTotale - mvt.quantite_bouteilles);
      }

      let updatedVariantes = p.variantes;
      if (mvt.variante_id && p.variantes) {
        updatedVariantes = p.variantes.map((v) => {
          if (v.id !== mvt.variante_id) return v;
          const newQty = mvt.type_mouvement === 'entree'
            ? v.quantite_stock + mvt.quantite_bouteilles
            : Math.max(0, v.quantite_stock - mvt.quantite_bouteilles);
          return { ...v, quantite_stock: newQty };
        });
      }

      return {
        ...p,
        bouteilles_vrac: newVrac,
        casiers_pleins: newCasiers,
        quantite_totale: newTotale,
        variantes: updatedVariantes,
      };
    });

    this.saveProduits(updatedProds);

    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.MOUVEMENTS, JSON.stringify(updatedMvts));
    } catch (e) { console.error(e); }

    return newMvt;
  },

  getAllMouvementsGlobal(): MouvementStock[] {
    try {
      if (typeof window === 'undefined') return SEED_MOUVEMENTS;
      const data = localStorage.getItem(KEYS.MOUVEMENTS);
      return data ? JSON.parse(data) : SEED_MOUVEMENTS;
    } catch { return SEED_MOUVEMENTS; }
  },

  // --- CLIENTS ---
  getClients(): Client[] {
    try {
      const etab = this.getEtablissement();
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') return SEED_CLIENTS.filter((c) => c && c.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.CLIENTS);
      if (!data) {
        if (isResetZero) return [];
        localStorage.setItem(KEYS.CLIENTS, JSON.stringify(SEED_CLIENTS));
        return SEED_CLIENTS.filter((c) => c && c.etablissement_id === etab.id);
      }
      const parsed: Client[] = JSON.parse(data);
      return (parsed || []).filter((c) => c && c.etablissement_id === etab.id);
    } catch { return SEED_CLIENTS; }
  },

  addClient(c: Omit<Client, 'id' | 'etablissement_id' | 'created_at'>): Client {
    const etab = this.getEtablissement();
    const newClient: Client = {
      ...c,
      id: `client-${Date.now()}`,
      etablissement_id: etab.id,
      telephone_whatsapp: c.telephone_whatsapp.replace(/[^0-9]/g, ''),
      total_dette_actuelle: 0,
      created_at: new Date().toISOString(),
    };
    const all = this.getAllClientsGlobal();
    const updated = [newClient, ...all];
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.CLIENTS, JSON.stringify(updated));
    } catch (e) { console.error(e); }
    return newClient;
  },

  getAllClientsGlobal(): Client[] {
    try {
      if (typeof window === 'undefined') return SEED_CLIENTS;
      const data = localStorage.getItem(KEYS.CLIENTS);
      return data ? JSON.parse(data) : SEED_CLIENTS;
    } catch { return SEED_CLIENTS; }
  },

  // --- FACTURES ---
  getFactures(): Facture[] {
    try {
      const etab = this.getEtablissement();
      const users = this.getAllUtilisateursGlobal();
      const clients = this.getAllClientsGlobal();
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') return SEED_FACTURES.filter((f) => f && f.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.FACTURES);
      if (!data && isResetZero) return [];
      const allFacs: Facture[] = data ? JSON.parse(data) : SEED_FACTURES;

      return allFacs
        .filter((f) => f && f.etablissement_id === etab.id)
        .map((f) => ({
          ...f,
          client: clients.find((c) => c && c.id === f.client_id),
          utilisateur: users.find((u) => u && u.id === f.utilisateur_id),
          lignes: (f.lignes || []).map((l) => ({
            ...l,
            sous_total_cout: l ? (l.sous_total_cout ?? 0) : 0,
            marge_brute: l ? (l.marge_brute ?? ((l.sous_total_vente || 0) - (l.sous_total_cout || 0))) : 0,
          })),
        }));
    } catch {
      return SEED_FACTURES;
    }
  },

  createFacture(params: {
    lignes: Array<{
      produit_id: string;
      variante_id?: string;
      nom_produit?: string;
      detail_variante?: string;
      quantite?: number;
      quantite_bouteilles?: number;
      prix_unitaire?: number;
      prix_unitaire_vente?: number;
    }>;
    mode_paiement: 'cash' | 'orange_money' | 'mtn_momo' | 'credit';
    montant_paye?: number;
    remise?: number;
    montant_verse?: number;
    montant_rendu?: number;
    client_id?: string;
    transaction_id?: string;
    caissiere_id?: string;
    serveuse_id?: string;
  }): Facture {
    const etab = this.getEtablissement();
    const currentUser = this.getCurrentUser();
    const prods = this.getProduits();

    let totalVente = 0;
    let totalCout = 0;

    const lignesFacture = params.lignes.map((l, index) => {
      const prod = prods.find((p) => p.id === l.produit_id);
      const pName = l.nom_produit || prod?.nom || 'Article';
      const coutCmp = prod ? (prod.cout_achat_unitaire_cmp || prod.prix_achat_unitaire || 0) : 0;
      const qty = l.quantite ?? l.quantite_bouteilles ?? 1;
      const pUnit = l.prix_unitaire ?? l.prix_unitaire_vente ?? 0;
      const sTotalVente = qty * pUnit;
      const sTotalCout = qty * coutCmp;
      const marge = sTotalVente - sTotalCout;

      totalVente += sTotalVente;
      totalCout += sTotalCout;

      if (prod) {
        this.addMouvementStock({
          produit_id: prod.id,
          variante_id: l.variante_id,
          type_mouvement: 'sortie',
          quantite_bouteilles: qty,
          utilisateur_id: currentUser.id,
          note_motif: `Vente Facture #${params.transaction_id || 'COMPTOIR'}`,
        });
      }

      return {
        id: `lig-${Date.now()}-${index}`,
        facture_id: '',
        produit_id: l.produit_id,
        variante_id: l.variante_id,
        nom_produit: pName,
        detail_variante: l.detail_variante,
        quantite_bouteilles: qty,
        prix_unitaire_vente: pUnit,
        cout_unitaire_cmp: coutCmp,
        sous_total_vente: sTotalVente,
        sous_total_cout: sTotalCout,
        marge_brute: marge,
      };
    });

    const remiseVal = params.remise || 0;
    const netAPayer = Math.max(0, totalVente - remiseVal);

    const mPaye = (params.montant_paye !== undefined && params.montant_paye !== null)
      ? params.montant_paye
      : (params.mode_paiement === 'credit' ? 0 : netAPayer);

    const mRestant = Math.max(0, netAPayer - mPaye);
    const isCredit = mRestant > 0 || params.mode_paiement === 'credit';

    const numSeq = Math.floor(1000 + Math.random() * 9000);
    const newFac: Facture = {
      id: `fac-${Date.now()}`,
      etablissement_id: etab.id,
      numero_facture: `FAC-2026-${numSeq}`,
      transaction_id: params.transaction_id,
      client_id: params.client_id,
      utilisateur_id: currentUser.id,
      caissiere_id: params.caissiere_id || currentUser.id,
      serveuse_id: params.serveuse_id,
      montant_total: totalVente,
      remise: remiseVal,
      net_a_payer: netAPayer,
      montant_verse: params.montant_verse !== undefined ? params.montant_verse : mPaye,
      montant_rendu: params.montant_rendu !== undefined ? params.montant_rendu : (params.montant_verse ? Math.max(0, params.montant_verse - netAPayer) : 0),
      montant_paye: mPaye,
      montant_restant: mRestant,
      mode_paiement: params.mode_paiement,
      statut: isCredit ? 'credit_encours' : 'payee',
      created_at: new Date().toISOString(),
      lignes: lignesFacture,
    };

    lignesFacture.forEach((l) => (l.facture_id = newFac.id));

    const allFacs = this.getAllFacturesGlobal();
    const updatedFacs = [newFac, ...allFacs];

    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.FACTURES, JSON.stringify(updatedFacs));
    } catch (e) { console.error(e); }

    return newFac;
  },

  getAllFacturesGlobal(): Facture[] {
    try {
      if (typeof window === 'undefined') return SEED_FACTURES;
      const data = localStorage.getItem(KEYS.FACTURES);
      return data ? JSON.parse(data) : SEED_FACTURES;
    } catch { return SEED_FACTURES; }
  },

  recordWhatsAppRelance(factureId: string) {
    const allFacs = this.getAllFacturesGlobal();
    const updated = allFacs.map((f) => {
      if (f.id !== factureId) return f;
      return {
        ...f,
        date_derniere_relance_whatsapp: new Date().toISOString(),
        compteur_relances: (f.compteur_relances || 0) + 1,
      };
    });
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.FACTURES, JSON.stringify(updated));
    } catch (e) { console.error(e); }
  },

  processRemboursementCredit(params: {
    facture_id: string;
    montant?: number;
    montant_regle?: number;
    methode: 'cash' | 'orange_money' | 'mtn_momo';
    note?: string;
    note_reference?: string;
  }): RemboursementCredit {
    const etab = this.getEtablissement();
    const currentUser = this.getCurrentUser();
    const nowIso = new Date().toISOString();

    const amount = params.montant ?? params.montant_regle ?? 0;

    const newRemb: RemboursementCredit = {
      id: `remb-${Date.now()}`,
      facture_id: params.facture_id,
      etablissement_id: etab.id,
      montant_regle: amount,
      methode: params.methode,
      utilisateur_id: currentUser.id,
      note_reference: params.note || params.note_reference,
      created_at: nowIso,
    };

    const allFacs = this.getAllFacturesGlobal();
    const updatedFacs = allFacs.map((f) => {
      if (f.id !== params.facture_id) return f;
      const newPaye = f.montant_paye + amount;
      const newRestant = Math.max(0, f.montant_total - newPaye);
      return {
        ...f,
        montant_paye: newPaye,
        montant_restant: newRestant,
        statut: newRestant === 0 ? ('payee' as const) : ('credit_encours' as const),
      };
    });

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.FACTURES, JSON.stringify(updatedFacs));
        const rembsData = localStorage.getItem(KEYS.REMBOURSEMENTS);
        const rembsList: RemboursementCredit[] = rembsData ? JSON.parse(rembsData) : SEED_REMBOURSEMENTS;
        localStorage.setItem(KEYS.REMBOURSEMENTS, JSON.stringify([newRemb, ...rembsList]));
      }
    } catch (e) { console.error(e); }

    return newRemb;
  },

  // --- COMPTABILITÉ P&L ---
  getComptabiliteJournaliere(periode: 'jour' | 'semaine' | 'mois' | number = 1) {
    const facs = this.getFactures();
    const charges = this.getCharges();

    let periodeDays = 1;
    if (typeof periode === 'number') periodeDays = periode;
    else if (periode === 'semaine') periodeDays = 7;
    else if (periode === 'mois') periodeDays = 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodeDays);

    const periodFacs = facs.filter((f) => f && new Date(f.created_at) >= cutoffDate && f.statut !== 'annulee');
    const periodCharges = charges.filter((c) => c && new Date(c.created_at) >= cutoffDate);

    let chiffreAffairesTotal = 0;
    let coutTotalVendu = 0;

    periodFacs.forEach((f) => {
      chiffreAffairesTotal += f.montant_total || 0;
      (f.lignes || []).forEach((l) => {
        coutTotalVendu += l.sous_total_cout || 0;
      });
    });

    const margeBruteTotal = chiffreAffairesTotal - coutTotalVendu;
    const totalChargesExploitation = periodCharges.reduce((acc, c) => acc + (c.montant || 0), 0);
    const beneficeNetGlobal = margeBruteTotal - totalChargesExploitation;
    const tauxMargeMoyenne = chiffreAffairesTotal > 0 ? (margeBruteTotal / chiffreAffairesTotal) * 100 : 0;

    return {
      caTotal: chiffreAffairesTotal,
      encaisseReel: chiffreAffairesTotal,
      cmvTotal: coutTotalVendu,
      margeBrute: margeBruteTotal,
      totalCharges: totalChargesExploitation,
      resultatNet: beneficeNetGlobal,
      tauxMargeMoyenne,
      nbFactures: periodFacs.length,
      factures: periodFacs,
      charges: periodCharges,
      chiffreAffairesTotal,
      coutTotalVendu,
      margeBruteTotal,
      totalChargesExploitation,
      beneficeNetGlobal,
      facturesCount: periodFacs.length,
      chargesCount: periodCharges.length,
    };
  },

  getCharges(): ChargeJournaliere[] {
    try {
      const etab = this.getEtablissement();
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') return SEED_CHARGES.filter((c) => c && c.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.CHARGES);
      if (!data) {
        if (isResetZero) return [];
        return SEED_CHARGES.filter((c) => c && c.etablissement_id === etab.id);
      }
      const parsed: ChargeJournaliere[] = JSON.parse(data);
      return (parsed || []).filter((c) => c && c.etablissement_id === etab.id);
    } catch { return SEED_CHARGES; }
  },

  addChargeJournaliere(arg1: string | { motif: string; montant: number }, arg2?: number): ChargeJournaliere {
    const etab = this.getEtablissement();
    let motif = '';
    let montant = 0;

    if (typeof arg1 === 'object') {
      motif = arg1.motif;
      montant = arg1.montant;
    } else {
      motif = arg1;
      montant = arg2 || 0;
    }

    const newCharge: ChargeJournaliere = {
      id: `chg-${Date.now()}`,
      etablissement_id: etab.id,
      motif,
      montant,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    const all = this.getAllChargesGlobal();
    const updated = [newCharge, ...all];
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.CHARGES, JSON.stringify(updated));
    } catch (e) { console.error(e); }
    return newCharge;
  },

  getAllChargesGlobal(): ChargeJournaliere[] {
    try {
      if (typeof window === 'undefined') return SEED_CHARGES;
      const data = localStorage.getItem(KEYS.CHARGES);
      return data ? JSON.parse(data) : SEED_CHARGES;
    } catch { return SEED_CHARGES; }
  },

  // --- RÉSERVATIONS & MISES DE CÔTÉ ---
  getReservations(): Reservation[] {
    try {
      const etab = this.getEtablissement();
      const clients = this.getAllClientsGlobal();
      const users = this.getAllUtilisateursGlobal();
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.RESERVATIONS);
      if (!data && isResetZero) return [];
      const all: Reservation[] = data ? JSON.parse(data) : [];

      return all
        .filter((r) => r && r.etablissement_id === etab.id)
        .map((r) => ({
          ...r,
          client: clients.find((c) => c && c.id === r.client_id),
          utilisateur: users.find((u) => u && u.id === r.utilisateur_id),
        }));
    } catch { return []; }
  },

  getAllReservationsGlobal(): Reservation[] {
    try {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.RESERVATIONS);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  createReservation(params: {
    lignes: Array<{
      produit_id: string;
      variante_id?: string;
      nom_produit?: string;
      detail_variante?: string;
      quantite?: number;
      prix_unitaire?: number;
    }>;
    acompte_paye: number;
    client_id?: string;
    date_limite_retrait?: string;
  }): Reservation {
    const etab = this.getEtablissement();
    const currentUser = this.getCurrentUser();
    const prods = this.getProduits();

    let totalVal = 0;
    const lignesRes = params.lignes.map((l, index) => {
      const prod = prods.find((p) => p.id === l.produit_id);
      const pName = l.nom_produit || prod?.nom || 'Article';
      const qty = l.quantite || 1;
      const pUnit = l.prix_unitaire || 0;
      const sTotal = qty * pUnit;

      totalVal += sTotal;

      // Retirer du stock dispo pour bloquer l'article en réservation / mise de côté
      if (prod) {
        this.addMouvementStock({
          produit_id: prod.id,
          variante_id: l.variante_id,
          type_mouvement: 'sortie',
          quantite_bouteilles: qty,
          utilisateur_id: currentUser.id,
          note_motif: `Mise de Côté / Réservation Article`,
        });
      }

      return {
        id: `lig-res-${Date.now()}-${index}`,
        produit_id: l.produit_id,
        variante_id: l.variante_id,
        nom_produit: pName,
        detail_variante: l.detail_variante,
        quantite: qty,
        prix_unitaire: pUnit,
        sous_total: sTotal,
      };
    });

    const numSeq = Math.floor(100 + Math.random() * 900);
    const resteASolder = Math.max(0, totalVal - (params.acompte_paye || 0));

    const newRes: Reservation = {
      id: `res-${Date.now()}`,
      etablissement_id: etab.id,
      numero_reservation: `RES-2026-${numSeq}`,
      client_id: params.client_id,
      utilisateur_id: currentUser.id,
      lignes: lignesRes,
      montant_total: totalVal,
      acompte_paye: params.acompte_paye || 0,
      reste_a_solder: resteASolder,
      statut: 'en_attente',
      date_limite_retrait: params.date_limite_retrait,
      created_at: new Date().toISOString(),
    };

    const all = this.getAllReservationsGlobal();
    const updated = [newRes, ...all];
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(updated));
    } catch (e) { console.error(e); }

    return newRes;
  },

  solderReservation(reservationId: string, params: {
    montant_regle: number;
    methode: 'cash' | 'orange_money' | 'mtn_momo';
  }): Facture | null {
    const reservations = this.getReservations();
    const res = reservations.find((r) => r.id === reservationId);
    if (!res) return null;

    const currentUser = this.getCurrentUser();

    // 1. Passer la réservation en 'soldee_recuperee'
    const updatedRes: Reservation = {
      ...res,
      reste_a_solder: 0,
      statut: 'soldee_recuperee',
    };

    const allRes = this.getAllReservationsGlobal().map((r) => (r.id === reservationId ? updatedRes : r));
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(allRes));
    } catch (e) { console.error(e); }

    // 2. Générer la Facture Clôturée Finale
    const fac = this.createFacture({
      lignes: res.lignes.map((l: LigneReservation) => ({
        produit_id: l.produit_id,
        variante_id: l.variante_id,
        nom_produit: l.nom_produit,
        detail_variante: l.detail_variante,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
      })),
      mode_paiement: params.methode,
      montant_paye: res.montant_total,
      montant_verse: params.montant_regle,
      client_id: res.client_id,
      transaction_id: `RETRAIT-${res.numero_reservation}`,
      caissiere_id: currentUser.id,
    });

    return fac;
  },

  annulerReservation(reservationId: string): boolean {
    const reservations = this.getReservations();
    const res = reservations.find((r) => r.id === reservationId);
    if (!res) return false;

    const currentUser = this.getCurrentUser();

    // Remettre le stock d'articles réservés en disponible
    res.lignes.forEach((l: LigneReservation) => {
      this.addMouvementStock({
        produit_id: l.produit_id,
        variante_id: l.variante_id,
        type_mouvement: 'entree',
        quantite_bouteilles: l.quantite,
        utilisateur_id: currentUser.id,
        note_motif: `Annulation Réservation #${res.numero_reservation}`,
      });
    });

    const updatedRes: Reservation = {
      ...res,
      statut: 'annulee',
    };

    const allRes = this.getAllReservationsGlobal().map((r) => (r.id === reservationId ? updatedRes : r));
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(allRes));
    } catch (e) { console.error(e); }

    return true;
  },

  recordReservationWhatsAppRelance(reservationId: string) {
    const all = this.getAllReservationsGlobal();
    const updated = all.map((r) => {
      if (r.id === reservationId) {
        return {
          ...r,
          compteur_relances: (r.compteur_relances || 0) + 1,
          date_derniere_relance_whatsapp: new Date().toISOString(),
        };
      }
      return r;
    });
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(updated));
    } catch (e) { console.error(e); }
  },

  // --- QUEUE DE SYNCHRO HORS-LIGNE ---
  getOfflineQueueCount(): number {
    try {
      const mvts = this.getMouvements();
      return mvts.filter((m) => m && m.sync_status === 'pending_offline').length;
    } catch { return 0; }
  },

  syncOfflineQueue(): number {
    const etab = this.getEtablissement();
    const allMvts = this.getAllMouvementsGlobal();
    let syncedCount = 0;
    const updated = allMvts.map((m) => {
      if (m.etablissement_id === etab.id && m.sync_status === 'pending_offline') {
        syncedCount++;
        return { ...m, sync_status: 'synced' as const };
      }
      return m;
    });
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.MOUVEMENTS, JSON.stringify(updated));
    } catch (e) { console.error(e); }
    return syncedCount;
  },
};
