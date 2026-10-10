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
  ClotureJournaliere,
  ClotureMensuelle,
  PalierTarifaire,
  ExemplaireArticle,
  SessionBar,
  LigneSessionBar,
  CompteUtilisateur,
  AuditStockLog,
  InventaireReference,
  StatutConfirmationStock,
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
  CURRENT_COMPTE: 'oeko_current_compte',
  COMPTES_LIST: 'oeko_comptes_list',
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
  CLOTURES_JOURNALIERES: 'oeko_clotures_journalieres',
  CLOTURES_MENSUELLES: 'oeko_clotures_mensuelles',
  PALIERS_TARIFAIRES: 'oeko_paliers_tarifaires',
  SESSIONS_BAR: 'oeko_sessions_bar',
  AUDIT_STOCK_LOGS: 'oeko_audit_stock_logs',
  INVENTAIRES_REFERENCE: 'oeko_inventaires_reference',
  RECEPTIONS: 'oeko_receptions',
  OFFLINE_QUEUE: 'oeko_offline_queue',
  RESET_ZERO: 'oeko_db_reset_zero',
};

// Helper pour nettoyer et formater les segments de code (ex: "Pépite d'Or" -> "PEP", "Vêtements" -> "VET")
export function cleanCodeSegment(str?: string, length = 3): string {
  if (!str) return '';
  const cleaned = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return cleaned.slice(0, length);
}

// Helper pour déterminer le vocabulaire selon le type d'activité (œko)
export function getTerminology(type_activite?: TypeActivite) {
  return {
    appName: 'œko',
    appTagline: 'L\'œil du patron',
    itemLabel: 'Article',
    itemsLabel: 'Articles',
    unitLabel: 'Pièces',
    unitSingular: 'Pièce',
    stockLabel: 'Stock d\'articles',
    sellerLabel: 'Vendeuse / Employée',
    salesScreenTitle: 'Vente',
    salesScreenDesc: 'Vente directe au comptoir, gestion des déclinaisons (tailles/couleurs) et suivi des commandes en ligne.',
  };
}

export const offlineDB = {
  // --- NIVEAU 1 : COMPTE GOOGLE (GMAIL) ---
  getCompteActuel(): CompteUtilisateur | null {
    try {
      if (typeof window === 'undefined') return null;
      const data = localStorage.getItem(KEYS.CURRENT_COMPTE);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch {
      return null;
    }
  },

  loginWithGoogle(email: string, nom: string, photo_url?: string): CompteUtilisateur {
    const cleanEmail = email.trim().toLowerCase();
    const allComptes = this.getComptesGlobal();
    const existing = allComptes.find((c) => c && c.email && c.email.toLowerCase() === cleanEmail);

    const compteId = existing?.id || `compte-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

    const compte: CompteUtilisateur = {
      id: compteId,
      email: cleanEmail,
      nom: nom.trim() || existing?.nom || 'Utilisateur Google',
      photo_url: photo_url || existing?.photo_url,
      provider: 'google',
      created_at: existing?.created_at || new Date().toISOString(),
    };

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.CURRENT_COMPTE, JSON.stringify(compte));
        const existingIdx = allComptes.findIndex((c) => c && c.email && c.email.toLowerCase() === cleanEmail);
        if (existingIdx >= 0) allComptes[existingIdx] = compte;
        else allComptes.push(compte);
        localStorage.setItem(KEYS.COMPTES_LIST, JSON.stringify(allComptes));
      }
    } catch (e) {
      console.error(e);
    }

    return compte;
  },

  logoutGoogleCompte() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(KEYS.CURRENT_COMPTE);
      }
    } catch (e) {
      console.error(e);
    }
  },

  getComptesGlobal(): CompteUtilisateur[] {
    try {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.COMPTES_LIST);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getActivitesDuCompte(compteId?: string): Etablissement[] {
    const currentCompte = this.getCompteActuel();
    const targetCompteId = compteId || currentCompte?.id;
    const targetEmail = (currentCompte?.email || '').trim().toLowerCase();

    const all = this.getEtablissements();
    if (!targetCompteId && !targetEmail) return [];

    // Si c'est le compte démo par défaut, renvoyer les établissements de démonstration
    if (targetEmail === 'patronne.demo@gmail.com' || targetCompteId === 'compte-google-demo') {
      return all;
    }

    // Filtrer les établissements créés par ce compte utilisateur ou rattachés à son email
    return all.filter((e) => {
      if (!e) return false;
      const etabEmail = (e.email_patron || (e as any).compte_email || '').trim().toLowerCase();
      if (etabEmail && targetEmail && etabEmail === targetEmail) return true;
      if (e.compte_id && targetCompteId && e.compte_id === targetCompteId) return true;
      return false;
    });
  },

  dismissWelcomeModal(etabId: string) {
    this.updateEtablissement(etabId, { show_welcome_modal: false });
  },

  // --- NIVEAU 2 : ACTIVITÉ / COMMERCE (PROFIL NETFLIX) ---
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
    let act: TypeActivite = e.type_activite || 'boutique';
    if (!e.type_activite) {
      act = 'boutique';
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
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.ETABLISSEMENTS);

      if (!data) {
        return [];
      }
      const parsed: Etablissement[] = JSON.parse(data);
      return (parsed || []).map((e) => this.normalizeEtablissement(e));
    } catch {
      return [];
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

  updateEtablissement(id: string, updates: Partial<Etablissement>): Etablissement | null {
    const etabs = this.getEtablissements();
    const existing = etabs.find((e) => e.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    const all = etabs.map((e) => (e.id === id ? updated : e));
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.ETABLISSEMENTS, JSON.stringify(all));
      }
    } catch (e) {
      console.error(e);
    }
    return updated;
  },

  deleteEtablissement(id: string): boolean {
    const etabs = this.getEtablissements();
    const filtered = etabs.filter((e) => e.id !== id);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.ETABLISSEMENTS, JSON.stringify(filtered));
        const activeId = localStorage.getItem(KEYS.ACTIVE_ETAB_ID);
        if (activeId === id) {
          localStorage.removeItem(KEYS.ACTIVE_ETAB_ID);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return true;
  },

  createEtablissement(params: {
    nom: string;
    type?: TypeEtablissement;
    type_activite: TypeActivite;
    secteur_boutique?: string;
    ville: string;
    adresse: string;
    patronNom: string;
    telephone?: string;
    email_patron?: string;
    patronPin: string;
    tarif_mensuel?: number;
  }): Etablissement {
    const etabs = this.getEtablissements();
    const currentCompte = this.getCompteActuel();
    const newId = `etab-${Date.now()}`;
    const act = params.type_activite;
    const tarif = params.tarif_mensuel || TARIFS_ABONNEMENT[act] || 5000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const nowIso = new Date().toISOString();
    const endTrialIso = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();

    const newEtab: Etablissement = {
      id: newId,
      compte_id: currentCompte?.id,
      nom: params.nom,
      type: params.type || (act as TypeEtablissement),
      type_activite: act,
      secteur_boutique: params.secteur_boutique,
      ville: params.ville,
      adresse: params.adresse,
      telephone: params.telephone,
      email_patron: params.email_patron || currentCompte?.email,
      plan: 'Premium',
      statut_abonnement: 'essai',
      tarif_mensuel: tarif,
      date_fin_essai: endTrialIso,
      date_prochain_paiement: endTrialIso,
      show_welcome_modal: true, // Déclenche le modal de bienvenue spécifique à cette activité
      created_at: nowIso,
    };

    const patronRole = act === 'snack' ? 'Directeur' : 'Patronne';

    const newPatron: Utilisateur = {
      id: `user-patron-${Date.now()}`,
      etablissement_id: newId,
      nom: params.patronNom || (act === 'snack' ? 'M. Directeur' : 'Mme Patronne'),
      role: patronRole,
      pin_code: params.patronPin || '1234',
      telephone: params.telephone,
      email: params.email_patron,
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
  saveEtablissements(data: Etablissement[]) {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.ETABLISSEMENTS, JSON.stringify(data));
    } catch (e) { console.error(e); }
  },
  saveFactures(data: Facture[]) {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.FACTURES, JSON.stringify(data));
    } catch (e) { console.error(e); }
  },
  saveReservations(data: Reservation[]) {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(data));
    } catch (e) { console.error(e); }
  },
  saveClients(data: Client[]) {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    } catch (e) { console.error(e); }
  },
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

  getUtilisateursByEtablissementId(etabId: string): Utilisateur[] {
    try {
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') return SEED_UTILISATEURS.filter((u) => u && u.etablissement_id === etabId);
      const data = localStorage.getItem(KEYS.UTILISATEURS);
      if (!data) {
        if (isResetZero) return [];
        localStorage.setItem(KEYS.UTILISATEURS, JSON.stringify(SEED_UTILISATEURS));
        return SEED_UTILISATEURS.filter((u) => u && u.etablissement_id === etabId);
      }
      const parsed: Utilisateur[] = JSON.parse(data);
      return (parsed || []).filter((u) => u && u.etablissement_id === etabId);
    } catch {
      return SEED_UTILISATEURS.filter((u) => u && u.etablissement_id === etabId);
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

  addCommandeEnLigne(cmd: Omit<CommandeEnLigne, 'id' | 'etablissement_id' | 'numero_commande' | 'created_at'> & { numero_commande?: string }): CommandeEnLigne {
    const etab = this.getEtablissement();
    const numSeq = Math.floor(100 + Math.random() * 900);
    const newCmd: CommandeEnLigne = {
      ...cmd,
      id: `cmd-${Date.now()}`,
      etablissement_id: etab.id,
      numero_commande: (cmd as any).numero_commande || `CMD-2026-${numSeq}`,
      created_at: new Date().toISOString(),
    };
    const all = this.getAllCommandesGlobal();
    const updated = [newCmd, ...all];
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.COMMANDES_LIGNE, JSON.stringify(updated));
    } catch (e) { console.error(e); }
    return newCmd;
  },

  updateStatutCommandeEnLigne(commandeId: string, newStatut: StatutLivraison, livreParNom?: string): CommandeEnLigne | null {
    const cmds = this.getCommandesEnLigne();
    const cmd = cmds.find((c) => c.id === commandeId);
    if (!cmd) return null;

    const updatedCmd: CommandeEnLigne = {
      ...cmd,
      statut: newStatut,
      livre_par_nom: livreParNom || cmd.livre_par_nom,
    };

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

  getAllCommandesEnLigneGlobal(): CommandeEnLigne[] {
    return this.getAllCommandesGlobal();
  },

  // --- PRODUITS & VARIANTES ---
  getProduits(): Produit[] {
    try {
      const etab = this.getEtablissement();
      const currentUser = this.getCurrentUser();
      const isEmployee = ['Employée', 'Employé', 'Vendeuse', 'Serveuse', 'Caissière'].includes(currentUser?.role || '');
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';

      let rawList: Produit[] = [];
      if (typeof window === 'undefined') {
        rawList = SEED_PRODUITS.filter((p) => p && p.etablissement_id === etab.id);
      } else {
        const data = localStorage.getItem(KEYS.PRODUITS);
        if (!data) {
          if (isResetZero) return [];
          localStorage.setItem(KEYS.PRODUITS, JSON.stringify(SEED_PRODUITS));
          rawList = SEED_PRODUITS.filter((p) => p && p.etablissement_id === etab.id);
        } else {
          const parsed: Produit[] = JSON.parse(data);
          rawList = (parsed || []).filter((p) => p && p.etablissement_id === etab.id);
        }
      }

      return rawList.map((p) => {
        const paMissing = !p.prix_achat_unitaire || p.prix_achat_unitaire === 0 || p.prix_achat_statut === 'prix_achat_a_completer';
        const paStatut = paMissing ? 'prix_achat_a_completer' : 'complet';
        let pClean = { ...p, prix_achat_statut: paStatut as 'prix_achat_a_completer' | 'complet' };

        if (!pClean.oko_code) {
          const mainCouleur = pClean.variantes?.[0]?.couleur || pClean.champs_specifiques?.couleur;
          const generatedCode = this.generateStructuredOkoCode({
            etabId: pClean.etablissement_id || etab.id,
            categorie: pClean.categorie,
            couleur: mainCouleur,
          });
          pClean = { ...pClean, oko_code: generatedCode };
        }

        if (isEmployee) {
          pClean = {
            ...pClean,
            prix_achat_unitaire: 0,
            prix_achat_casier: 0,
            cout_achat_unitaire_cmp: 0,
          };
        }

        return pClean;
      });
    } catch {
      return SEED_PRODUITS;
    }
  },

  saveProduits(produits: Produit[]) {
    try {
      const etab = this.getEtablissement();
      const verifiedProds = produits.map((p) => {
        if (!p.oko_code) {
          const mainCouleur = p.variantes?.[0]?.couleur || p.champs_specifiques?.couleur;
          return {
            ...p,
            oko_code: this.generateStructuredOkoCode({
              etabId: p.etablissement_id || etab.id,
              categorie: p.categorie,
              couleur: mainCouleur,
            }),
          };
        }
        return p;
      });
      const allOther = this.getAllProduitsGlobal().filter((p) => p && p.etablissement_id !== etab.id);
      const newAll = [...verifiedProds, ...allOther];
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.PRODUITS, JSON.stringify(newAll));
    } catch (e) { console.error(e); }
  },

  bulkAddOrUpdateStock(
    items: Array<{
      nom: string;
      categorie: string;
      quantite: number;
      prix_achat?: number;
      prix_vente?: number;
    }>,
    usageType: 'initial' | 'reapprovisionnement' | 'physique' = 'reapprovisionnement'
  ): { addedCount: number; updatedCount: number } {
    const etab = this.getEtablissement();
    const currentProds = this.getProduits();
    const user = this.getCurrentUser();
    const isPatron = ['Patron', 'Patronne', 'Directeur'].includes(user?.role || '');
    const nowIso = new Date().toISOString();

    let addedCount = 0;
    let updatedCount = 0;

    const newProdsList = [...currentProds];
    const newMvtsList: MouvementStock[] = [];

    items.forEach((item, idx) => {
      const cleanNom = (item.nom || 'Article Sans Nom').trim();
      if (!cleanNom) return;

      const qty = Math.max(0, Number(item.quantite) || 1);
      const pxAchat = isPatron ? Math.max(0, Number(item.prix_achat) || 0) : 0;
      const pxVente = Math.max(0, Number(item.prix_vente) || 0);
      const cat = (item.categorie || 'À vérifier').trim();

      const existingIndex = newProdsList.findIndex(
        (p) => p && p.nom && p.nom.trim().toLowerCase() === cleanNom.toLowerCase()
      );

      let targetProdId = '';
      let oldQty = 0;

      if (existingIndex >= 0) {
        const p = newProdsList[existingIndex];
        targetProdId = p.id;
        oldQty = p.quantite_totale || 0;
        const newQty = oldQty + qty;

        const effectivePA = isPatron && pxAchat > 0 ? pxAchat : (p.prix_achat_unitaire || 0);
        const paStatut = (!effectivePA || effectivePA === 0) ? 'prix_achat_a_completer' : 'complet';

        newProdsList[existingIndex] = {
          ...p,
          quantite_totale: newQty,
          bouteilles_vrac: (p.bouteilles_vrac || 0) + qty,
          prix_achat_unitaire: effectivePA,
          prix_vente_unitaire: pxVente > 0 ? pxVente : p.prix_vente_unitaire,
          prix_vente_bouteille: pxVente > 0 ? pxVente : p.prix_vente_bouteille,
          prix_achat_casier: effectivePA * (p.bouteilles_par_casier || 12),
          prix_achat_statut: paStatut as any,
          statut_validation_patron: isPatron ? 'valide' : 'en_attente_validation_patron',
        };
        updatedCount++;

        newMvtsList.push({
          id: `mvt-${Date.now()}-${idx}`,
          etablissement_id: etab.id,
          produit_id: p.id,
          type_mouvement: 'entree',
          quantite_bouteilles: qty,
          utilisateur_id: user.id,
          note_motif: `Arrivage / Scan (${usageType})`,
          sync_status: typeof navigator !== 'undefined' && !navigator.onLine ? 'pending_offline' : 'synced',
          client_timestamp: nowIso,
          created_at: nowIso,
        });

        this.addAuditStockLog({
          produit_id: p.id,
          nom_produit: p.nom,
          type_action: 'entree',
          quantite_avant: oldQty,
          quantite_modifiee: qty,
          quantite_apres: newQty,
          motif: `Arrivage / Import / Scan IA (${usageType})`,
          prix_achat_statut: paStatut as any,
          statut_confirmation: isPatron ? 'non_confirme' : 'en_attente_validation_patron',
        });
      } else {
        targetProdId = `prod-${Date.now()}-${idx}`;
        const isBoutique = etab.type_activite === 'boutique';
        const paStatut = (!pxAchat || pxAchat === 0) ? 'prix_achat_a_completer' : 'complet';

        const newProd: Produit = {
          id: targetProdId,
          etablissement_id: etab.id,
          nom: cleanNom,
          categorie: cat,
          unite: isBoutique ? 'piece' : 'bouteille',
          bouteilles_par_casier: 12,
          bouteilles_vrac: isBoutique ? 0 : qty,
          casiers_pleins: 0,
          quantite_totale: qty,
          seuil_alerte: 5,
          prix_achat_unitaire: pxAchat,
          prix_vente_unitaire: pxVente,
          prix_vente_bouteille: pxVente,
          prix_achat_casier: pxAchat * 12,
          cout_achat_unitaire_cmp: pxAchat,
          prix_achat_statut: paStatut as any,
          statut_validation_patron: isPatron ? 'valide' : 'en_attente_validation_patron',
          actif: true,
          created_at: nowIso,
        };
        newProdsList.push(newProd);
        addedCount++;

        newMvtsList.push({
          id: `mvt-${Date.now()}-${idx}`,
          etablissement_id: etab.id,
          produit_id: targetProdId,
          type_mouvement: 'entree',
          quantite_bouteilles: qty,
          utilisateur_id: user.id,
          note_motif: `Création & Scan IA (${usageType})`,
          sync_status: typeof navigator !== 'undefined' && !navigator.onLine ? 'pending_offline' : 'synced',
          client_timestamp: nowIso,
          created_at: nowIso,
        });

        this.addAuditStockLog({
          produit_id: targetProdId,
          nom_produit: cleanNom,
          type_action: 'entree',
          quantite_avant: 0,
          quantite_modifiee: qty,
          quantite_apres: qty,
          motif: `Création & Import / Scan (${usageType})`,
          prix_achat_statut: paStatut as any,
          statut_confirmation: isPatron ? 'non_confirme' : 'en_attente_validation_patron',
        });
      }
    });

    this.saveProduits(newProdsList);

    if (newMvtsList.length > 0) {
      const allMvts = this.getAllMouvementsGlobal();
      const updatedAllMvts = [...newMvtsList, ...allMvts];
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(KEYS.MOUVEMENTS, JSON.stringify(updatedAllMvts));
        }
      } catch (e) {
        console.error(e);
      }
    }

    return { addedCount, updatedCount };
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
      telephone_whatsapp: (c.telephone_whatsapp || '').replace(/[^0-9]/g, ''),
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

  updateClient(id: string, updates: Partial<Client>): Client | null {
    const all = this.getAllClientsGlobal();
    const index = all.findIndex((c) => c && c.id === id);
    if (index === -1) return null;
    const updated = { ...all[index], ...updates };
    all[index] = updated;
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.CLIENTS, JSON.stringify(all));
    } catch (e) { console.error(e); }
    return updated;
  },

  deleteClient(id: string) {
    const all = this.getAllClientsGlobal();
    const updated = all.filter((c) => c && c.id !== id);
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.CLIENTS, JSON.stringify(updated));
    } catch (e) { console.error(e); }
  },

  getAllClientsGlobal(): Client[] {
    try {
      if (typeof window === 'undefined') return SEED_CLIENTS;
      const data = localStorage.getItem(KEYS.CLIENTS);
      return data ? JSON.parse(data) : SEED_CLIENTS;
    } catch { return SEED_CLIENTS; }
  },

  // --- FACTURES ---
  getFactures(limit?: number): Facture[] {
    try {
      const etab = this.getEtablissement();
      const users = this.getAllUtilisateursGlobal();
      const clients = this.getAllClientsGlobal();
      const isResetZero = typeof window !== 'undefined' && localStorage.getItem(KEYS.RESET_ZERO) === 'true';
      if (typeof window === 'undefined') {
        let raw = SEED_FACTURES.filter((f) => f && f.etablissement_id === etab.id);
        if (limit && limit > 0) raw = raw.slice(-limit);
        return raw;
      }
      const data = localStorage.getItem(KEYS.FACTURES);
      if (!data && isResetZero) return [];
      const allFacs: Facture[] = data ? JSON.parse(data) : SEED_FACTURES;

      let filtered = allFacs.filter((f) => f && f.etablissement_id === etab.id);
      if (limit && limit > 0) {
        filtered = filtered.slice(-limit);
      }

      return filtered.map((f) => ({
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
      return [];
    }
  },

  getRemboursementsGlobal(): RemboursementCredit[] {
    try {
      if (typeof window === 'undefined') return SEED_REMBOURSEMENTS;
      const data = localStorage.getItem(KEYS.REMBOURSEMENTS);
      return data ? JSON.parse(data) : SEED_REMBOURSEMENTS;
    } catch {
      return SEED_REMBOURSEMENTS;
    }
  },

  getRemboursements(): RemboursementCredit[] {
    const etab = this.getEtablissement();
    const all = this.getRemboursementsGlobal();
    return all.filter((r) => r && r.etablissement_id === etab.id);
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

  // --- GÉNÉRATEUR AUTOMATIQUE DE CODE UNIQUE STRUCTURÉ (PEP-ROB-ROU-001) ---
  generateStructuredOkoCode(params: {
    etabId?: string;
    categorie?: string;
    couleur?: string;
  }): string {
    const etab = this.getEtablissement();
    const shopAbrev = (etab.abrev_boutique || cleanCodeSegment(etab.nom || 'OEKO', 3)).toUpperCase();
    const catAbrev = cleanCodeSegment(params.categorie || 'ART', 3) || 'ART';
    const colorAbrev = cleanCodeSegment(params.couleur, 3);

    const comboKeyParts = [shopAbrev, catAbrev];
    if (colorAbrev) comboKeyParts.push(colorAbrev);
    const comboPrefix = comboKeyParts.join('-');

    const targetEtabId = params.etabId || etab.id;
    const counterKey = `oeko_seq_counter_${targetEtabId}_${comboPrefix}`;
    let currentCounter = 1;

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(counterKey);
      if (stored) {
        currentCounter = parseInt(stored, 10) + 1;
      } else {
        const existingProds = this.getProduits();
        const matchingCount = existingProds.filter((p) => {
          const pCode = (p.oko_code || '').toUpperCase();
          return pCode.startsWith(comboPrefix);
        }).length;
        currentCounter = matchingCount + 1;
      }
      localStorage.setItem(counterKey, currentCounter.toString());
    } else {
      currentCounter = Math.floor(1 + Math.random() * 9);
    }

    const seqStr = currentCounter.toString().padStart(3, '0');
    return `${comboPrefix}-${seqStr}`;
  },

  generateNextOkoCode(etabId?: string, categorie?: string, couleur?: string): string {
    return this.generateStructuredOkoCode({ etabId, categorie, couleur });
  },

  generateUniqueArticleCode(categorie?: string, couleur?: string): string {
    return this.generateNextOkoCode(undefined, categorie, couleur);
  },

  // --- CLÔTURES JOURNALIÈRES FIGÉES ---
  getCloturesJournalieres(): ClotureJournaliere[] {
    const etab = this.getEtablissement();
    try {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.CLOTURES_JOURNALIERES);
      const all: ClotureJournaliere[] = data ? JSON.parse(data) : [];
      return all.filter((c) => c && c.etablissement_id === etab.id);
    } catch { return []; }
  },

  saveCloturesJournalieres(list: ClotureJournaliere[]): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(KEYS.CLOTURES_JOURNALIERES, JSON.stringify(list));
    } catch (e) { console.error(e); }
  },

  cloturerJournee(dateTarget?: string, createdByNom?: string): ClotureJournaliere {
    const etab = this.getEtablissement();
    const user = this.getCurrentUser();
    const dateStr = dateTarget || new Date().toISOString().split('T')[0];

    const factures = this.getFactures().filter((f) => f.created_at.startsWith(dateStr) && f.statut !== 'annulee');
    const mvtsEntrees = this.getMouvements().filter((m) => m.created_at.startsWith(dateStr) && m.type_mouvement === 'entree');
    const rembs = this.getRemboursements().filter((r) => r.created_at.startsWith(dateStr));
    const produits = this.getProduits();

    const total_ventes = factures.reduce((acc, f) => acc + (f.montant_total || 0), 0);
    const total_encaisse_cash = factures.filter((f) => f.mode_paiement === 'cash').reduce((acc, f) => acc + (f.montant_paye || 0), 0);
    const total_encaisse_om = factures.filter((f) => f.mode_paiement === 'orange_money').reduce((acc, f) => acc + (f.montant_paye || 0), 0);
    const total_encaisse_momo = factures.filter((f) => f.mode_paiement === 'mtn_momo').reduce((acc, f) => acc + (f.montant_paye || 0), 0);

    const remb_cash = rembs.filter((r) => r.methode === 'cash').reduce((acc, r) => acc + r.montant_regle, 0);
    const remb_om = rembs.filter((r) => r.methode === 'orange_money').reduce((acc, r) => acc + r.montant_regle, 0);
    const remb_momo = rembs.filter((r) => r.methode === 'mtn_momo').reduce((acc, r) => acc + r.montant_regle, 0);

    let quantite_stock_sorti = 0;
    let valeur_stock_sorti = 0;
    let marge_brute_cmp = 0;

    factures.forEach((f) => {
      if (f.lignes) {
        f.lignes.forEach((l) => {
          quantite_stock_sorti += l.quantite_bouteilles || 1;
          valeur_stock_sorti += l.sous_total_cout || 0;
          marge_brute_cmp += l.marge_brute || 0;
        });
      }
    });

    const quantite_stock_entre = mvtsEntrees.reduce((acc, m) => acc + (m.quantite_bouteilles || 1), 0);
    const valeur_stock_entre = mvtsEntrees.reduce((acc, m) => {
      const prod = produits.find((p) => p.id === m.produit_id);
      const cost = prod?.prix_achat_unitaire || prod?.cout_achat_unitaire_cmp || 0;
      return acc + (m.quantite_bouteilles || 1) * cost;
    }, 0);

    const quantite_stock_restant_total = produits.reduce((acc, p) => acc + (p.quantite_totale || 0), 0);
    const nombre_articles_differents = produits.length;

    const creances_accordees_jour = factures.reduce((acc, f) => acc + (f.montant_restant || 0), 0);
    const creances_recouvrees_jour = rembs.reduce((acc, r) => acc + r.montant_regle, 0);

    const newCloture: ClotureJournaliere = {
      id: `cloture-j-${dateStr}-${Date.now()}`,
      etablissement_id: etab.id,
      date_cloture: dateStr,
      total_ventes,
      total_encaisse_cash: total_encaisse_cash + remb_cash,
      total_encaisse_om: total_encaisse_om + remb_om,
      total_encaisse_momo: total_encaisse_momo + remb_momo,
      valeur_stock_sorti,
      quantite_stock_sorti,
      quantite_stock_entre,
      valeur_stock_entre,
      quantite_stock_restant_total,
      nombre_articles_differents,
      marge_brute_cmp,
      creances_accordees_jour,
      creances_recouvrees_jour,
      fige_le: new Date().toISOString(),
      cree_par: createdByNom || user?.nom || 'Patron',
    };

    try {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(KEYS.CLOTURES_JOURNALIERES);
        const all: ClotureJournaliere[] = data ? JSON.parse(data) : [];
        const existingIndex = all.findIndex((c) => c.etablissement_id === etab.id && c.date_cloture === dateStr);
        if (existingIndex >= 0) all[existingIndex] = newCloture;
        else all.unshift(newCloture);
        localStorage.setItem(KEYS.CLOTURES_JOURNALIERES, JSON.stringify(all));
      }
    } catch (e) { console.error(e); }

    return newCloture;
  },

  // --- CLÔTURES MENSUELLES ---
  getCloturesMensuelles(): ClotureMensuelle[] {
    const etab = this.getEtablissement();
    try {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.CLOTURES_MENSUELLES);
      const all: ClotureMensuelle[] = data ? JSON.parse(data) : [];
      return all.filter((c) => c && c.etablissement_id === etab.id);
    } catch { return []; }
  },

  cloturerMois(moisAnneeTarget?: string, createdByNom?: string): ClotureMensuelle {
    const etab = this.getEtablissement();
    const user = this.getCurrentUser();
    const moisAnnee = moisAnneeTarget || new Date().toISOString().slice(0, 7); // YYYY-MM

    const factures = this.getFactures().filter((f) => f.created_at.startsWith(moisAnnee) && f.statut !== 'annulee');
    const charges = this.getCharges().filter((c) => c.date.startsWith(moisAnnee));

    const total_ventes = factures.reduce((acc, f) => acc + (f.montant_total || 0), 0);
    let cout_marchandises_vendues = 0;
    let marge_brute_cmp = 0;

    factures.forEach((f) => {
      if (f.lignes) {
        f.lignes.forEach((l) => {
          cout_marchandises_vendues += l.sous_total_cout || 0;
          marge_brute_cmp += l.marge_brute || 0;
        });
      }
    });

    const total_charges = charges.reduce((acc, c) => acc + c.montant, 0);
    const resultat_net = marge_brute_cmp - total_charges;

    const newCloture: ClotureMensuelle = {
      id: `cloture-m-${moisAnnee}-${Date.now()}`,
      etablissement_id: etab.id,
      mois_annee: moisAnnee,
      total_ventes,
      cout_marchandises_vendues,
      marge_brute_cmp,
      total_charges,
      resultat_net,
      fige_le: new Date().toISOString(),
      cree_par: createdByNom || user?.nom || 'Patron',
    };

    try {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(KEYS.CLOTURES_MENSUELLES);
        const all: ClotureMensuelle[] = data ? JSON.parse(data) : [];
        const existingIndex = all.findIndex((c) => c.etablissement_id === etab.id && c.mois_annee === moisAnnee);
        if (existingIndex >= 0) all[existingIndex] = newCloture;
        else all.unshift(newCloture);
        localStorage.setItem(KEYS.CLOTURES_MENSUELLES, JSON.stringify(all));
      }
    } catch (e) { console.error(e); }

    return newCloture;
  },

  // --- PALIERS TARIFAIRES CONFIGURABLES ---
  getPaliersTarifaires(): PalierTarifaire[] {
    const defaultPaliers: PalierTarifaire[] = [
      {
        id: 'palier-essentiel',
        code_palier: 'essentiel',
        nom: 'Essentiel',
        tarif_mensuel: 3000,
        articles_max: 100,
        tables_max: 5,
        utilisateurs_max: 1,
        description: 'Pour démarrer simplement : stock, ventes au comptoir et factures imprimables (Patron seul).',
        modules_inclus: [
          'Stock & Ventes au comptoir',
          'Facture imprimable',
          'Patron seul (1 utilisateur max)',
        ],
      },
      {
        id: 'palier-standard',
        code_palier: 'standard',
        nom: 'Standard',
        tarif_mensuel: 5000,
        articles_max: 400,
        tables_max: 15,
        utilisateurs_max: 3,
        description: 'Le choix idéal : équipe jusqu\'à 3 personnes, ardoises/WhatsApp et commandes en ligne/livraison.',
        modules_inclus: [
          'Stock & Ventes',
          'Facture imprimable',
          'Jusqu\'à 3 utilisateurs (Patron + 2 employés)',
          'Module Crédit / Ardoise & Relance WhatsApp',
          'Commandes en ligne & Livraison',
        ],
        badge_recommande: true,
      },
      {
        id: 'palier-pro',
        code_palier: 'pro',
        nom: 'Pro',
        tarif_mensuel: 10000,
        articles_max: 999999,
        tables_max: 999999,
        utilisateurs_max: 999999,
        description: 'Pour grands commerces et lounges : tout illimité, mode série/IMEI, multi-caisses et rapports comptables.',
        modules_inclus: [
          'Articles & Tables illimités',
          'Utilisateurs illimités',
          'Suivi Unité / Série / IMEI / Autocollants',
          'Multi-caisses / zones',
          'Clôtures & Rapports comptables avancés',
        ],
      },
    ];

    try {
      if (typeof window === 'undefined') return defaultPaliers;
      const data = localStorage.getItem(KEYS.PALIERS_TARIFAIRES);
      if (!data) {
        localStorage.setItem(KEYS.PALIERS_TARIFAIRES, JSON.stringify(defaultPaliers));
        return defaultPaliers;
      }
      const parsed: PalierTarifaire[] = JSON.parse(data);
      return parsed.map((p) => ({
        ...p,
        articles_max: p.articles_max ?? (p as any).articles_distincts_max ?? 100,
        tables_max: p.tables_max ?? (p.code_palier === 'essentiel' ? 5 : p.code_palier === 'standard' ? 15 : 999999),
        utilisateurs_max: p.utilisateurs_max ?? (p.code_palier === 'essentiel' ? 1 : p.code_palier === 'standard' ? 3 : 999999),
        modules_inclus: p.modules_inclus || [],
      }));
    } catch {
      return defaultPaliers;
    }
  },

  savePaliersTarifaires(paliers: PalierTarifaire[]) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.PALIERS_TARIFAIRES, JSON.stringify(paliers));
      }
    } catch (e) {
      console.error(e);
    }
  },

  checkEtablissementTierUsage(etabTarget?: Etablissement): {
    distinctCount: number;
    tablesCount: number;
    usersCount: number;
    currentTier: PalierTarifaire;
    recommendedTier: PalierTarifaire;
    isOverflow: boolean;
    overflowReason?: string;
  } {
    const etab = etabTarget || this.getEtablissement();
    const prods = this.getProduits();
    const users = this.getUtilisateurs();
    const sessions = this.getSessionsBar();
    const paliers = this.getPaliersTarifaires();

    const distinctCount = prods.length;
    const usersCount = users.filter((u) => u.actif).length;
    const tablesCount = new Set(sessions.map((s) => s.table_numero)).size || 1;

    const essentielTier = paliers.find((p) => p.code_palier === 'essentiel') || paliers[0];
    const standardTier = paliers.find((p) => p.code_palier === 'standard') || paliers[1] || paliers[0];
    const proTier = paliers.find((p) => p.code_palier === 'pro') || paliers[2] || paliers[paliers.length - 1];

    let currentTier = essentielTier;
    if (etab.tarif_mensuel >= (proTier?.tarif_mensuel || 8000)) {
      currentTier = proTier;
    } else if (etab.tarif_mensuel >= (standardTier?.tarif_mensuel || 5000)) {
      currentTier = standardTier;
    } else {
      currentTier = essentielTier;
    }

    let recommendedTier = essentielTier;
    let reasons: string[] = [];

    const isBar = etab.type_activite === 'bar';

    const excedeEssentiel =
      distinctCount > essentielTier.articles_max ||
      (isBar && tablesCount > essentielTier.tables_max) ||
      usersCount > essentielTier.utilisateurs_max;

    const excedeStandard =
      distinctCount > standardTier.articles_max ||
      (isBar && tablesCount > standardTier.tables_max) ||
      usersCount > standardTier.utilisateurs_max;

    if (excedeStandard) {
      recommendedTier = proTier;
      if (distinctCount > standardTier.articles_max) reasons.push(`${distinctCount} articles (${standardTier.articles_max} max pour Standard)`);
      if (isBar && tablesCount > standardTier.tables_max) reasons.push(`${tablesCount} tables (${standardTier.tables_max} max pour Standard)`);
      if (usersCount > standardTier.utilisateurs_max) reasons.push(`${usersCount} utilisateurs (${standardTier.utilisateurs_max} max pour Standard)`);
    } else if (excedeEssentiel) {
      recommendedTier = standardTier;
      if (distinctCount > essentielTier.articles_max) reasons.push(`${distinctCount} articles (${essentielTier.articles_max} max pour Essentiel)`);
      if (isBar && tablesCount > essentielTier.tables_max) reasons.push(`${tablesCount} tables (${essentielTier.tables_max} max pour Essentiel)`);
      if (usersCount > essentielTier.utilisateurs_max) reasons.push(`${usersCount} utilisateurs (${essentielTier.utilisateurs_max} max pour Essentiel)`);
    } else {
      recommendedTier = essentielTier;
    }

    const isOverflow = recommendedTier.tarif_mensuel > currentTier.tarif_mensuel;

    return {
      distinctCount,
      tablesCount,
      usersCount,
      currentTier,
      recommendedTier,
      isOverflow,
      overflowReason: isOverflow ? reasons.join(', ') : undefined,
    };
  },

  checkStockTierOverflow(etabTarget?: Etablissement) {
    const res = this.checkEtablissementTierUsage(etabTarget);
    return {
      distinctCount: res.distinctCount,
      currentTier: res.currentTier,
      nextTier: res.isOverflow ? res.recommendedTier : undefined,
      isOverflow: res.isOverflow,
    };
  },

  // --- STATUTS ET RETARDS D'ABONNEMENT ---
  isRestrictedMode(etabTarget?: Etablissement): boolean {
    const etab = etabTarget || this.getEtablissement();
    if (etab.statut_abonnement === 'en_retard' || etab.statut_abonnement === 'expire') return true;
    if (etab.statut_abonnement === 'essai') {
      return this.isTrialExpired(etab);
    }
    return false;
  },

  isSuspendedMode(etabTarget?: Etablissement): boolean {
    const etab = etabTarget || this.getEtablissement();
    if (etab.statut_abonnement === 'suspendu') return true;
    const now = new Date().getTime();
    const dueTime = new Date(etab.date_prochain_paiement || etab.date_fin_essai).getTime();
    const graceDays = etab.delai_grace_jours || 5;
    const suspendTime = dueTime + (graceDays + 15) * 24 * 3600 * 1000;
    return now > suspendTime && etab.statut_abonnement !== 'actif';
  },

  // --- MISE À JOUR STATUT LIVRAISON / COMPTABLE ---
  updateCommandeStatus(
    commandeId: string,
    newStatus: StatutLivraison,
    userNom?: string
  ): boolean {
    const allCmds = this.getAllCommandesEnLigneGlobal();
    const cmdIndex = allCmds.findIndex((c) => c.id === commandeId);
    if (cmdIndex < 0) return false;

    const currentCmd = allCmds[cmdIndex];
    const user = this.getCurrentUser();
    const updatedCmd: CommandeEnLigne = {
      ...currentCmd,
      statut: newStatus,
    };

    if (newStatus === 'paiement_valide') {
      updatedCmd.valide_par_comptable_id = user?.id;
      updatedCmd.valide_par_comptable_nom = userNom || user?.nom || 'Comptable';
    } else if (newStatus === 'en_livraison') {
      updatedCmd.livre_par_id = user?.id;
      updatedCmd.livre_par_nom = userNom || user?.nom || 'Livreur';
    }

    allCmds[cmdIndex] = updatedCmd;
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEYS.COMMANDES_LIGNE, JSON.stringify(allCmds));
    } catch (e) { console.error(e); }

    return true;
  },

  // --- SESSIONS BAR & FACTURATION ---
  getSessionsBar(): SessionBar[] {
    try {
      const etab = this.getEtablissement();
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.SESSIONS_BAR);
      const parsed: SessionBar[] = data ? JSON.parse(data) : [];
      return (parsed || []).filter((s) => s && s.etablissement_id === etab.id);
    } catch {
      return [];
    }
  },

  getAllSessionsBarGlobal(): SessionBar[] {
    try {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.SESSIONS_BAR);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSessionBar(session: SessionBar): SessionBar {
    const all = this.getAllSessionsBarGlobal();
    const idx = all.findIndex((s) => s.id === session.id);
    let updated: SessionBar[];
    if (idx >= 0) {
      all[idx] = session;
      updated = [...all];
    } else {
      updated = [session, ...all];
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.SESSIONS_BAR, JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }
    return session;
  },

  deleteSessionBar(sessionId: string) {
    const all = this.getAllSessionsBarGlobal();
    const updated = all.filter((s) => s.id !== sessionId);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEYS.SESSIONS_BAR, JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }
  },

  closeAndPaySessionBar(params: {
    sessionId: string;
    mode_paiement: 'cash' | 'orange_money' | 'mtn_momo' | 'credit';
    montant_paye?: number;
    remise?: number;
    montant_verse?: number;
    montant_rendu?: number;
    client_id?: string;
    lignesPayees?: LigneSessionBar[];
  }): Facture | null {
    const sessions = this.getSessionsBar();
    const session = sessions.find((s) => s.id === params.sessionId);
    if (!session) return null;

    const targetLignes = params.lignesPayees || session.lignes;
    if (targetLignes.length === 0) return null;

    const fac = this.createFacture({
      client_id: params.client_id,
      lignes: targetLignes.map((l) => ({
        produit_id: l.produit_id,
        nom_produit: l.nom_produit,
        quantite_bouteilles: l.quantite,
        prix_unitaire: l.prix_unitaire,
      })),
      remise: params.remise || 0,
      mode_paiement: params.mode_paiement,
      montant_paye: params.montant_paye,
      montant_verse: params.montant_verse,
      montant_rendu: params.montant_rendu,
      transaction_id: `BAR-${session.table_numero}-${Date.now()}`,
      serveuse_id: session.serveuse_id,
    });

    if (!params.lignesPayees || params.lignesPayees.length === session.lignes.length) {
      const updatedSession: SessionBar = {
        ...session,
        statut: params.mode_paiement === 'credit' ? 'cloturee_credit' : 'cloturee_payee',
        closed_at: new Date().toISOString(),
      };
      this.saveSessionBar(updatedSession);
    } else {
      const remainingLignes = session.lignes.filter(
        (l) => !targetLignes.some((paid) => paid.id === l.id)
      );
      const updatedSession: SessionBar = {
        ...session,
        lignes: remainingLignes,
      };
      this.saveSessionBar(updatedSession);
    }

    return fac;
  },

  getCompteurPlatsServisJour(dateStr?: string): number {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const factures = this.getFactures();
    const prods = this.getProduits();
    
    const foodKeywords = ['plat', 'nourriture', 'grillade', 'repas', 'cuisine', 'snack', 'manger', 'poulet', 'poisson', 'porc', 'brochette'];

    let totalPlats = 0;
    factures.forEach((f) => {
      if (!f.created_at || !f.created_at.startsWith(today)) return;
      (f.lignes || []).forEach((l) => {
        const prod = prods.find((p) => p.id === l.produit_id);
        const cat = (prod?.categorie || '').toLowerCase();
        const name = (l.nom_produit || '').toLowerCase();
        const isFood = foodKeywords.some((k) => cat.includes(k) || name.includes(k));
        if (isFood) {
          totalPlats += l.quantite_bouteilles || 1;
        }
      });
    });

    return totalPlats;
  },

  // --- MODULE AUDIT IMMUABLE & TRANSPARENCE PREUVE STOCK ---
  getDeviceInfo(): string {
    if (typeof window === 'undefined') return 'Appareil Inconnu';
    const ua = navigator.userAgent;
    let browser = 'Chrome/Safari';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    
    let os = 'Appareil Web';
    if (ua.includes('Android')) os = 'Android Mobile';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS Mobile';
    else if (ua.includes('Windows')) os = 'Windows PC';
    else if (ua.includes('Mac')) os = 'Mac Desktop';
    
    return `${os} (${browser})`;
  },

  getAuditStockLogs(etabIdTarget?: string): AuditStockLog[] {
    try {
      this.check48hUnconfirmedAuditLogs();
      const etab = etabIdTarget ? { id: etabIdTarget } : this.getEtablissement();
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.AUDIT_STOCK_LOGS);
      const all: AuditStockLog[] = data ? JSON.parse(data) : [];
      return (all || []).filter((l) => l && l.etablissement_id === etab.id);
    } catch {
      return [];
    }
  },

  check48hUnconfirmedAuditLogs(): number {
    try {
      if (typeof window === 'undefined') return 0;
      const data = localStorage.getItem(KEYS.AUDIT_STOCK_LOGS);
      if (!data) return 0;
      const all: AuditStockLog[] = JSON.parse(data);
      const now = Date.now();
      const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
      let updatedCount = 0;

      const updated = all.map((log) => {
        if (log.statut_confirmation === 'non_confirme') {
          const createdAtMs = new Date(log.created_at).getTime();
          if (now - createdAtMs >= FORTY_EIGHT_HOURS_MS) {
            updatedCount++;
            return { ...log, statut_confirmation: 'non_confirme_48h' as const };
          }
        }
        return log;
      });

      if (updatedCount > 0) {
        localStorage.setItem(KEYS.AUDIT_STOCK_LOGS, JSON.stringify(updated));
      }
      return updatedCount;
    } catch {
      return 0;
    }
  },

  addAuditStockLog(params: {
    produit_id: string;
    nom_produit: string;
    variante_id?: string;
    detail_variante?: string;
    type_action: 'entree' | 'ajustement_hausse' | 'ajustement_baisse' | 'inventaire_initial' | 'correction' | 'vente';
    quantite_avant: number;
    quantite_modifiee: number;
    quantite_apres: number;
    motif: string;
    reference_mouvement_id?: string;
    correction_reference_id?: string;
    auto_confirm?: boolean;
    statut_confirmation?: StatutConfirmationStock;
    confirme_par_id?: string;
    confirme_par_nom?: string;
    confirme_le?: string;
    prix_achat_statut?: 'complet' | 'prix_achat_a_completer';
    quantite_comptee_employe?: number;
    commentaire_employe?: string;
  }): AuditStockLog {
    const etab = this.getEtablissement();
    const user = this.getCurrentUser();
    const isPatron = ['Patron', 'Patronne', 'Directeur'].includes(user?.role || '');
    const userRole = user?.role || 'Patron';

    let defaultStatut: StatutConfirmationStock = 'non_confirme';
    if (!isPatron) {
      defaultStatut = 'en_attente_validation_patron';
    } else if (params.auto_confirm) {
      defaultStatut = 'confirme';
    }

    const statutConf: StatutConfirmationStock = params.statut_confirmation || defaultStatut;
    const deviceInfo = this.getDeviceInfo();

    const newLog: AuditStockLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      etablissement_id: etab.id,
      produit_id: params.produit_id,
      nom_produit: params.nom_produit,
      variante_id: params.variante_id,
      detail_variante: params.detail_variante,
      type_action: params.type_action,
      quantite_avant: params.quantite_avant,
      quantite_modifiee: params.quantite_modifiee,
      quantite_apres: params.quantite_apres,
      utilisateur_id: user?.id || 'u-user',
      utilisateur_nom: user?.nom || 'Utilisateur',
      utilisateur_role: userRole,
      saisi_par_role: isPatron ? 'Patron' : 'Employe',
      motif: params.motif || 'Mouvement de stock',
      reference_mouvement_id: params.reference_mouvement_id,
      correction_reference_id: params.correction_reference_id,
      statut_confirmation: statutConf,
      prix_achat_statut: params.prix_achat_statut || (!isPatron ? 'prix_achat_a_completer' : 'complet'),
      confirme_par_id: params.confirme_par_id || (statutConf === 'confirme' ? user?.id : undefined),
      confirme_par_nom: params.confirme_par_nom || (statutConf === 'confirme' ? user?.nom : undefined),
      confirme_le: params.confirme_le || (statutConf === 'confirme' ? new Date().toISOString() : undefined),
      device_info: deviceInfo,
      quantite_comptee_employe: params.quantite_comptee_employe,
      commentaire_employe: params.commentaire_employe,
      created_at: new Date().toISOString(),
    };

    try {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(KEYS.AUDIT_STOCK_LOGS);
        const all: AuditStockLog[] = data ? JSON.parse(data) : [];
        all.unshift(newLog);
        localStorage.setItem(KEYS.AUDIT_STOCK_LOGS, JSON.stringify(all));
      }
    } catch (e) {
      console.error(e);
    }

    return newLog;
  },

  confirmOrContestAuditLog(
    logId: string,
    action: StatutConfirmationStock,
    userId?: string,
    userNom?: string,
    comment?: string,
    quantiteComptee?: number
  ): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const user = this.getCurrentUser();
      const data = localStorage.getItem(KEYS.AUDIT_STOCK_LOGS);
      const all: AuditStockLog[] = data ? JSON.parse(data) : [];
      const idx = all.findIndex((l) => l.id === logId);
      if (idx < 0) return false;

      const current = all[idx];
      const deviceInfo = this.getDeviceInfo();
      all[idx] = {
        ...current,
        statut_confirmation: action,
        confirme_par_id: userId || user?.id,
        confirme_par_nom: userNom || user?.nom || 'Employé en poste',
        confirme_le: new Date().toISOString(),
        commentaire_employe: comment?.trim() || undefined,
        quantite_comptee_employe: quantiteComptee !== undefined ? quantiteComptee : current.quantite_comptee_employe,
        device_info: current.device_info ? `${current.device_info} | Confirmé sur: ${deviceInfo}` : deviceInfo,
      };

      localStorage.setItem(KEYS.AUDIT_STOCK_LOGS, JSON.stringify(all));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  resolveStockDiscrepancy(
    logId: string,
    decision: 'accepter_comptage' | 'maintenir_declare',
    comment: string
  ): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const user = this.getCurrentUser();
      const data = localStorage.getItem(KEYS.AUDIT_STOCK_LOGS);
      const all: AuditStockLog[] = data ? JSON.parse(data) : [];
      const idx = all.findIndex((l) => l.id === logId);
      if (idx < 0) return false;

      const currentLog = all[idx];
      const nowIso = new Date().toISOString();

      if (decision === 'accepter_comptage') {
        const qtyCounted = currentLog.quantite_comptee_employe ?? currentLog.quantite_apres;
        const diff = qtyCounted - currentLog.quantite_apres;

        if (diff !== 0) {
          const prods = this.getProduits();
          const targetProd = prods.find((p) => p.id === currentLog.produit_id);
          if (targetProd) {
            const oldQty = targetProd.quantite_totale || 0;
            const newQty = Math.max(0, oldQty + diff);

            this.saveProduits(
              prods.map((p) =>
                p.id === targetProd.id
                  ? {
                      ...p,
                      quantite_totale: newQty,
                      bouteilles_vrac: Math.max(0, (p.bouteilles_vrac || 0) + diff),
                    }
                  : p
              )
            );

            this.addAuditStockLog({
              produit_id: targetProd.id,
              nom_produit: targetProd.nom,
              type_action: diff > 0 ? 'ajustement_hausse' : 'ajustement_baisse',
              quantite_avant: oldQty,
              quantite_modifiee: diff,
              quantite_apres: newQty,
              motif: `Ajustement suite acceptation comptage employé par Patron: ${comment}`,
              auto_confirm: true,
              correction_reference_id: currentLog.id,
            });
          }
        }
      }

      all[idx] = {
        ...all[idx],
        decision_patron_ecart: decision,
        commentaire_patron_ecart: comment,
        patron_valide_par_id: user?.id,
        patron_valide_par_nom: user?.nom,
        patron_valide_le: nowIso,
      };

      localStorage.setItem(KEYS.AUDIT_STOCK_LOGS, JSON.stringify(all));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  validateAndCompletePurchasePrice(produitId: string, prixAchat: number, logId?: string): boolean {
    try {
      const user = this.getCurrentUser();
      const prods = this.getProduits();
      const targetProd = prods.find((p) => p.id === produitId);
      if (!targetProd) return false;

      const updatedProds = prods.map((p) =>
        p.id === produitId
          ? {
              ...p,
              prix_achat_unitaire: prixAchat,
              prix_achat_casier: prixAchat * (p.bouteilles_par_casier || 12),
              cout_achat_unitaire_cmp: prixAchat,
              prix_achat_statut: 'complet' as const,
              statut_validation_patron: 'valide' as const,
            }
          : p
      );
      this.saveProduits(updatedProds);

      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(KEYS.AUDIT_STOCK_LOGS);
        const all: AuditStockLog[] = data ? JSON.parse(data) : [];
        const nowIso = new Date().toISOString();

        const updatedLogs = all.map((log) => {
          if (log.produit_id === produitId && (log.id === logId || log.statut_confirmation === 'en_attente_validation_patron' || log.prix_achat_statut === 'prix_achat_a_completer')) {
            return {
              ...log,
              prix_achat_statut: 'complet' as const,
              statut_confirmation: log.statut_confirmation === 'en_attente_validation_patron' ? ('confirme' as const) : log.statut_confirmation,
              patron_valide_par_id: user?.id,
              patron_valide_par_nom: user?.nom,
              patron_valide_le: nowIso,
            };
          }
          return log;
        });

        localStorage.setItem(KEYS.AUDIT_STOCK_LOGS, JSON.stringify(updatedLogs));
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  getPendingConfirmationsForEmployee(): AuditStockLog[] {
    const logs = this.getAuditStockLogs();
    return logs.filter((l) => l.statut_confirmation === 'non_confirme');
  },

  // --- INVENTAIRE DE RÉFÉRENCE CONJOINT ---
  getInventairesReference(): InventaireReference[] {
    try {
      const etab = this.getEtablissement();
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(KEYS.INVENTAIRES_REFERENCE);
      const all: InventaireReference[] = data ? JSON.parse(data) : [];
      return (all || []).filter((inv) => inv && inv.etablissement_id === etab.id);
    } catch {
      return [];
    }
  },

  createInventaireReference(params: {
    lignes: Array<{
      produit_id: string;
      nom_produit: string;
      variante_id?: string;
      detail_variante?: string;
      quantite_theorique: number;
      quantite_physique_comptee: number;
      note?: string;
    }>;
    commentaires?: string;
  }): InventaireReference {
    const etab = this.getEtablissement();
    const user = this.getCurrentUser();
    const isPatron = ['Patron', 'Patronne', 'Directeur'].includes(user?.role || '');

    const nowIso = new Date().toISOString();
    const count = this.getInventairesReference().length + 1;
    const numInv = `INV-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    const newInv: InventaireReference = {
      id: `inv-ref-${Date.now()}`,
      etablissement_id: etab.id,
      numero_inventaire: numInv,
      date_comptage: nowIso,
      statut: 'en_attente_double_validation',
      valide_par_patron: isPatron,
      patron_id: isPatron ? user?.id : undefined,
      patron_nom: isPatron ? user?.nom : undefined,
      patron_valide_le: isPatron ? nowIso : undefined,
      valide_par_employe: !isPatron,
      employe_id: !isPatron ? user?.id : undefined,
      employe_nom: !isPatron ? user?.nom : undefined,
      employe_valide_le: !isPatron ? nowIso : undefined,
      commentaires: params.commentaires,
      lignes: params.lignes.map((l) => ({
        ...l,
        ecart: l.quantite_physique_comptee - l.quantite_theorique,
      })),
      created_at: nowIso,
    };

    try {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(KEYS.INVENTAIRES_REFERENCE);
        const all: InventaireReference[] = data ? JSON.parse(data) : [];
        all.unshift(newInv);
        localStorage.setItem(KEYS.INVENTAIRES_REFERENCE, JSON.stringify(all));
      }
    } catch (e) {
      console.error(e);
    }

    return newInv;
  },

  validateInventaireReference(invId: string, role: 'patron' | 'employe', userNom?: string): InventaireReference | null {
    try {
      if (typeof window === 'undefined') return null;
      const user = this.getCurrentUser();
      const data = localStorage.getItem(KEYS.INVENTAIRES_REFERENCE);
      const all: InventaireReference[] = data ? JSON.parse(data) : [];
      const idx = all.findIndex((inv) => inv.id === invId);
      if (idx < 0) return null;

      const current = all[idx];
      const nowIso = new Date().toISOString();

      let patronValid = current.valide_par_patron;
      let employeValid = current.valide_par_employe;

      if (role === 'patron') {
        patronValid = true;
        current.patron_id = user?.id;
        current.patron_nom = userNom || user?.nom || 'Patron';
        current.patron_valide_le = nowIso;
      } else {
        employeValid = true;
        current.employe_id = user?.id;
        current.employe_nom = userNom || user?.nom || 'Employé';
        current.employe_valide_le = nowIso;
      }

      const isBothValid = patronValid && employeValid;
      const updatedInv: InventaireReference = {
        ...current,
        valide_par_patron: patronValid,
        valide_par_employe: employeValid,
        statut: isBothValid ? 'valide_officiel' : 'en_attente_double_validation',
      };

      all[idx] = updatedInv;
      localStorage.setItem(KEYS.INVENTAIRES_REFERENCE, JSON.stringify(all));
      return updatedInv;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  getLatestOfficialInventaireReference(): InventaireReference | null {
    const list = this.getInventairesReference();
    const official = list.find((inv) => inv.statut === 'valide_officiel');
    return official || null;
  },

  // --- RÉCEPTIONS DE STOCK DOUBLE-ENTRÉE (PHASE 5) ---
  getReceptions(): any[] {
    try {
      if (typeof window === 'undefined') return [];
      const etab = this.getEtablissement();
      const data = localStorage.getItem(KEYS.RECEPTIONS);
      const list = data ? JSON.parse(data) : [];
      return list.filter((r: any) => r && r.activite_id === etab.id);
    } catch {
      return [];
    }
  },

  saveReception(reception: any): void {
    try {
      if (typeof window === 'undefined') return;
      const data = localStorage.getItem(KEYS.RECEPTIONS);
      const list = data ? JSON.parse(data) : [];
      const updated = [reception, ...list.filter((r: any) => r.id !== reception.id)];
      localStorage.setItem(KEYS.RECEPTIONS, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  },

  confirmReception(receptionId: string, quantiteComptee: number, confirmeParNom: string): void {
    try {
      if (typeof window === 'undefined') return;
      const list = this.getReceptions();
      const targetIndex = list.findIndex((r) => r.id === receptionId);
      if (targetIndex >= 0) {
        const item = list[targetIndex];
        item.statut = 'valide';
        item.quantite_comptee = quantiteComptee;
        item.confirme_par_nom = confirmeParNom;
        item.updated_at = new Date().toISOString();
        this.saveReception(item);

        // Incrémenter le stock effectif
        const prods = this.getProduits();
        const pIndex = prods.findIndex((p) => p.id === item.article_id);
        if (pIndex >= 0) {
          prods[pIndex].quantite_totale = (prods[pIndex].quantite_totale || 0) + quantiteComptee;
          this.saveProduits(prods);
        }
      }
    } catch (e) {
      console.error(e);
    }
  },
};


