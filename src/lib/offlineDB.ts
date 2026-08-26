import {
  Etablissement,
  Utilisateur,
  Produit,
  MouvementStock,
  Paiement,
  Client,
  Facture,
  LigneFacture,
  RemboursementCredit,
  ChargeJournaliere,
  ModePaiementVente
} from '@/types';
import {
  SEED_ETABLISSEMENT,
  SEED_UTILISATEURS,
  SEED_PRODUITS,
  SEED_MOUVEMENTS,
  SEED_CLIENTS,
  SEED_FACTURES,
  SEED_REMBOURSEMENTS,
  SEED_CHARGES
} from './presetData';

const STORAGE_KEYS = {
  ETABLISSEMENTS: 'saas_etablissements',
  ACTIVE_ETAB_ID: 'saas_active_etab_id',
  CURRENT_USER_ID: 'saas_current_user_id',
  UTILISATEURS: 'saas_utilisateurs',
  PRODUITS: 'saas_produits',
  MOUVEMENTS: 'saas_mouvements',
  PAIEMENTS: 'saas_paiements',
  OFFLINE_QUEUE: 'saas_offline_queue',
  CLIENTS: 'saas_clients',
  FACTURES: 'saas_factures',
  REMBOURSEMENTS: 'saas_remboursements',
  CHARGES: 'saas_charges',
};

export const offlineDB = {
  // --- MULTI-TENANT ETABLISSEMENTS ---
  getEtablissements(): Etablissement[] {
    if (typeof window === 'undefined') return [SEED_ETABLISSEMENT];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ETABLISSEMENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error reading etablissements:', e);
    }
    const initial = [SEED_ETABLISSEMENT];
    try {
      localStorage.setItem(STORAGE_KEYS.ETABLISSEMENTS, JSON.stringify(initial));
    } catch (e) {}
    return initial;
  },

  getEtablissement(): Etablissement {
    if (typeof window === 'undefined') return SEED_ETABLISSEMENT;
    const etabs = this.getEtablissements();
    try {
      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_ETAB_ID);
      const active = etabs.find((e) => e && e.id === activeId);
      if (active) return active;
    } catch (e) {}

    if (etabs.length > 0) {
      try { localStorage.setItem(STORAGE_KEYS.ACTIVE_ETAB_ID, etabs[0].id); } catch (e) {}
      return etabs[0];
    }
    return SEED_ETABLISSEMENT;
  },

  createEtablissement(data: { nom: string; type: 'bar' | 'snack_bar' | 'lounge'; ville: string; adresse?: string; patronNom: string; patronPin: string }): Etablissement {
    const list = this.getEtablissements();
    const newId = 'etab-' + Date.now();
    const newEtab: Etablissement = {
      id: newId,
      nom: data.nom || 'Nouveau Bar',
      type: data.type || 'bar',
      ville: data.ville || 'Douala',
      adresse: data.adresse || 'Centre Ville',
      plan: 'Premium',
      statut_abonnement: 'essai',
      date_fin_essai: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      date_prochain_paiement: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    const updated = [newEtab, ...list];
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.ETABLISSEMENTS, JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ETAB_ID, newId);
      } catch (e) {}
    }

    // Créer le patron principal pour ce bar
    const newPatron: Utilisateur = {
      id: 'user-patron-' + Date.now(),
      etablissement_id: newId,
      nom: data.patronNom || 'Patron Principal',
      role: 'Patron',
      pin_code: data.patronPin || '1234',
      actif: true,
      created_at: new Date().toISOString(),
    };

    // Créer aussi un serveur / gérant démo pour ce bar
    const newGerant: Utilisateur = {
      id: 'user-gerant-' + Date.now(),
      etablissement_id: newId,
      nom: 'Jean-Paul (Gérant/Serveur)',
      role: 'Gérant',
      pin_code: '5678',
      actif: true,
      created_at: new Date().toISOString(),
    };

    let allUsers: Utilisateur[] = [];
    if (typeof window !== 'undefined') {
      try {
        const savedUsers = localStorage.getItem(STORAGE_KEYS.UTILISATEURS);
        allUsers = savedUsers ? JSON.parse(savedUsers) : SEED_UTILISATEURS;
      } catch (e) { allUsers = SEED_UTILISATEURS; }
      try {
        localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify([newPatron, newGerant, ...allUsers]));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newPatron.id);
      } catch (e) {}
    }

    const demoProds: Produit[] = SEED_PRODUITS.map((p) => ({
      ...p,
      id: `prod-${newId}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      etablissement_id: newId,
      cout_achat_unitaire_cmp: p.cout_achat_unitaire_cmp || Math.round((p.prix_achat_casier || 6000) / (p.bouteilles_par_casier || 24)),
    }));

    if (typeof window !== 'undefined') {
      try {
        const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUITS);
        const allProds: Produit[] = savedProds ? JSON.parse(savedProds) : SEED_PRODUITS;
        localStorage.setItem(STORAGE_KEYS.PRODUITS, JSON.stringify([...demoProds, ...allProds]));
      } catch (e) {}
    }

    return newEtab;
  },

  switchEtablissement(id: string): Etablissement | null {
    const etabs = this.getEtablissements();
    const target = etabs.find((e) => e && e.id === id);
    if (target && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ETAB_ID, id);
        // Basculer sur le premier utilisateur du bar sélectionné
        const users = this.getUtilisateursForEtablissement(id);
        if (users.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, users[0].id);
        }
      } catch (e) {}
      return target;
    }
    return null;
  },

  // --- AUTHENTIFICATION PAR PIN & SÉLECTION DE RÔLE ---
  loginWithPin(pinCode: string): { user: Utilisateur; etablissement: Etablissement } | null {
    if (!pinCode) return null;
    const activeEtab = this.getEtablissement();
    const users = this.getUtilisateurs();
    const matched = users.find((u) => u && u.pin_code && u.pin_code.toString().trim() === pinCode.toString().trim() && u.actif);

    if (matched) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
        } catch (e) {}
      }
      return { user: matched, etablissement: activeEtab };
    }
    return null;
  },

  setCurrentUserById(userId: string): Utilisateur | null {
    const users = this.getUtilisateurs();
    const matched = users.find((u) => u && u.id === userId);
    if (matched && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
      } catch (e) {}
      return matched;
    }
    return null;
  },

  getCurrentUser(): Utilisateur {
    const users = this.getUtilisateurs();
    if (typeof window === 'undefined') return users[0] || SEED_UTILISATEURS[0];
    try {
      const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      const current = users.find((u) => u && u.id === currentId);
      if (current) return current;
    } catch (e) {}
    return users[0] || SEED_UTILISATEURS[0];
  },

  // --- UTILISATEURS ---
  getUtilisateurs(): Utilisateur[] {
    const etab = this.getEtablissement();
    return this.getUtilisateursForEtablissement(etab.id);
  },

  getUtilisateursForEtablissement(etabId: string): Utilisateur[] {
    if (typeof window === 'undefined') return SEED_UTILISATEURS.filter((u) => u.etablissement_id === etabId);
    let allUsers: Utilisateur[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.UTILISATEURS);
      if (saved) {
        allUsers = JSON.parse(saved);
      } else {
        allUsers = SEED_UTILISATEURS;
        localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify(allUsers));
      }
    } catch (e) {
      allUsers = SEED_UTILISATEURS;
    }

    const filtered = allUsers.filter((u) => u && u.etablissement_id === etabId);
    if (filtered.length > 0) return filtered;
    
    // Si aucun utilisateur n'existe encore pour cet établissement, générer le patron par défaut
    const defaultUsers = SEED_UTILISATEURS.map((u) => ({ ...u, etablissement_id: etabId }));
    try {
      localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify([...defaultUsers, ...allUsers]));
    } catch (e) {}
    return defaultUsers;
  },

  addUtilisateur(user: Omit<Utilisateur, 'id' | 'etablissement_id'>): Utilisateur {
    const etab = this.getEtablissement();
    let allUsers: Utilisateur[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.UTILISATEURS);
      allUsers = saved ? JSON.parse(saved) : SEED_UTILISATEURS;
    } catch (e) { allUsers = SEED_UTILISATEURS; }

    const newUser: Utilisateur = {
      ...user,
      id: 'user-' + Date.now(),
      etablissement_id: etab.id,
      created_at: new Date().toISOString(),
    };

    const updated = [newUser, ...allUsers];
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify(updated)); } catch (e) {}
    }
    return newUser;
  },

  toggleUtilisateurStatus(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.UTILISATEURS);
      if (!saved) return;
      const allUsers: Utilisateur[] = JSON.parse(saved);
      const updated = allUsers.map((u) => (u && u.id === id ? { ...u, actif: !u.actif } : u));
      localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify(updated));
    } catch (e) {}
  },

  // --- PRODUITS & CMP ---
  getProduits(): Produit[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_PRODUITS.filter((p) => p.etablissement_id === etab.id);
    let allProds: Produit[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUITS);
      if (saved) {
        allProds = JSON.parse(saved);
      } else {
        allProds = SEED_PRODUITS;
        localStorage.setItem(STORAGE_KEYS.PRODUITS, JSON.stringify(allProds));
      }
    } catch (e) {
      allProds = SEED_PRODUITS;
    }

    return allProds
      .filter((p) => p && p.etablissement_id === etab.id)
      .map((p) => ({
        ...p,
        casiers_pleins: p.casiers_pleins ?? 0,
        bouteilles_vrac: p.bouteilles_vrac ?? 0,
        bouteilles_par_casier: p.bouteilles_par_casier || 24,
        quantite_totale_bouteilles: p.quantite_totale_bouteilles ?? (p.casiers_pleins * (p.bouteilles_par_casier || 24) + p.bouteilles_vrac),
        cout_achat_unitaire_cmp: p.cout_achat_unitaire_cmp ?? Math.round((p.prix_achat_casier || 6000) / (p.bouteilles_par_casier || 24)),
      }));
  },

  saveProduits(produits: Produit[]): void {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUITS);
      const allProds: Produit[] = saved ? JSON.parse(saved) : SEED_PRODUITS;
      const otherProds = allProds.filter((p) => p && p.etablissement_id !== etab.id);
      localStorage.setItem(STORAGE_KEYS.PRODUITS, JSON.stringify([...produits, ...otherProds]));
    } catch (e) {}
  },

  getLowStockProducts(): Produit[] {
    const prods = this.getProduits();
    return prods.filter((p) => {
      const totalBottles = (p.casiers_pleins || 0) * (p.bouteilles_par_casier || 24) + (p.bouteilles_vrac || 0);
      return totalBottles <= (p.seuil_alerte || 48);
    });
  },

  // --- MOUVEMENTS DE STOCK & CMP ---
  getMouvements(): MouvementStock[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_MOUVEMENTS.filter((m) => m.etablissement_id === etab.id);
    let allMvts: MouvementStock[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOUVEMENTS);
      if (saved) {
        allMvts = JSON.parse(saved);
      } else {
        allMvts = SEED_MOUVEMENTS;
        localStorage.setItem(STORAGE_KEYS.MOUVEMENTS, JSON.stringify(allMvts));
      }
    } catch (e) {
      allMvts = SEED_MOUVEMENTS;
    }

    const prods = this.getProduits();
    const users = this.getUtilisateurs();

    return allMvts
      .filter((m) => m && m.etablissement_id === etab.id)
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
    prix_achat_casier_nouveau?: number;
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
      note_motif: data.note_motif || '',
      sync_status: isOnline ? 'synced' : 'pending_offline',
      client_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const delta = data.type_mouvement === 'entree' ? data.quantite_bouteilles : -data.quantite_bouteilles;
    const produits = this.getProduits();
    const updatedProduits = produits.map((p) => {
      if (p.id === data.produit_id) {
        const bpc = p.bouteilles_par_casier || 24;
        const oldTotal = (p.casiers_pleins || 0) * bpc + (p.bouteilles_vrac || 0);
        let totalBottles = oldTotal + delta;
        if (totalBottles < 0) totalBottles = 0;

        let newCMP = p.cout_achat_unitaire_cmp || Math.round((p.prix_achat_casier || 6000) / bpc);

        if (data.type_mouvement === 'entree' && data.prix_achat_casier_nouveau) {
          const newUnitPrice = Math.round(data.prix_achat_casier_nouveau / bpc);
          if (oldTotal + data.quantite_bouteilles > 0) {
            newCMP = Math.round(
              (oldTotal * newCMP + data.quantite_bouteilles * newUnitPrice) / (oldTotal + data.quantite_bouteilles)
            );
          }
        }

        const casiers = Math.floor(totalBottles / bpc);
        const vrac = totalBottles % bpc;

        return {
          ...p,
          casiers_pleins: casiers,
          bouteilles_vrac: vrac,
          quantite_totale_bouteilles: totalBottles,
          cout_achat_unitaire_cmp: newCMP,
          prix_achat_casier: data.prix_achat_casier_nouveau || p.prix_achat_casier,
        };
      }
      return p;
    });
    this.saveProduits(updatedProduits);

    let allMvts: MouvementStock[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOUVEMENTS);
      allMvts = saved ? JSON.parse(saved) : SEED_MOUVEMENTS;
    } catch (e) { allMvts = SEED_MOUVEMENTS; }

    const updatedMvts = [newMvt, ...allMvts];
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEYS.MOUVEMENTS, JSON.stringify(updatedMvts)); } catch (e) {}
    }

    if (!isOnline) {
      this.addToOfflineQueue(newMvt);
    }

    return newMvt;
  },

  // --- CLIENTS ---
  getClients(): Client[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_CLIENTS.filter((c) => c.etablissement_id === etab.id);
    let allClients: Client[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (saved) {
        allClients = JSON.parse(saved);
      } else {
        allClients = SEED_CLIENTS;
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(allClients));
      }
    } catch (e) {
      allClients = SEED_CLIENTS;
    }

    const factures = this.getFactures();
    return allClients
      .filter((c) => c && c.etablissement_id === etab.id)
      .map((c) => {
        const clientFactures = factures.filter((f) => f.client_id === c.id && f.statut === 'credit_encours');
        const totalDette = clientFactures.reduce((acc, f) => acc + (f.montant_restant || 0), 0);
        return {
          ...c,
          total_dette_actuelle: totalDette,
        };
      });
  },

  addClient(data: { nom: string; telephone_whatsapp: string; note_quartier?: string }): Client {
    const etab = this.getEtablissement();
    let allClients: Client[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      allClients = saved ? JSON.parse(saved) : SEED_CLIENTS;
    } catch (e) { allClients = SEED_CLIENTS; }

    let phone = (data.telephone_whatsapp || '').replace(/[^0-9]/g, '');
    if (phone.length === 9) phone = '237' + phone;

    const newClient: Client = {
      id: 'client-' + Date.now(),
      etablissement_id: etab.id,
      nom: data.nom || 'Client Inconnu',
      telephone_whatsapp: phone || '237600000000',
      note_quartier: data.note_quartier || '',
      created_at: new Date().toISOString(),
    };

    const updated = [newClient, ...allClients];
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updated)); } catch (e) {}
    }
    return newClient;
  },

  // --- FACTURATION & CRÉDITS ---
  getFactures(): Facture[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_FACTURES.filter((f) => f.etablissement_id === etab.id);
    let allFacs: Facture[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FACTURES);
      if (saved) {
        allFacs = JSON.parse(saved);
      } else {
        allFacs = SEED_FACTURES;
        localStorage.setItem(STORAGE_KEYS.FACTURES, JSON.stringify(allFacs));
      }
    } catch (e) {
      allFacs = SEED_FACTURES;
    }

    const clients = this.getClients();
    const users = this.getUtilisateurs();

    return allFacs
      .filter((f) => f && f.etablissement_id === etab.id)
      .map((f) => ({
        ...f,
        client: clients.find((c) => c.id === f.client_id),
        utilisateur: users.find((u) => u.id === f.utilisateur_id),
        lignes: (f.lignes || []).map((l) => ({
          ...l,
          sous_total_cout: l.sous_total_cout ?? 0,
          marge_brute: l.marge_brute ?? (l.sous_total_vente - (l.sous_total_cout || 0)),
        })),
      }));
  },

  createFacture(data: {
    client_id?: string;
    mode_paiement: ModePaiementVente;
    montant_paye: number;
    lignes: Array<{ produit_id: string; quantite_bouteilles: number }>;
  }): Facture {
    const etab = this.getEtablissement();
    const currentUser = this.getCurrentUser();
    const produits = this.getProduits();

    const existingFactures = this.getFactures();
    const seqNumber = existingFactures.length + 1;
    const numStr = `FAC-${new Date().getFullYear()}-${seqNumber.toString().padStart(4, '0')}`;

    let totalVente = 0;
    const lignesCompletes: LigneFacture[] = [];

    data.lignes.forEach((item) => {
      const p = produits.find((prod) => prod.id === item.produit_id);
      if (p) {
        const coutCMP = p.cout_achat_unitaire_cmp || Math.round((p.prix_achat_casier || 6000) / (p.bouteilles_par_casier || 24));
        const sousTotalVente = item.quantite_bouteilles * (p.prix_vente_bouteille || 600);
        const sousTotalCout = item.quantite_bouteilles * coutCMP;
        const marge = sousTotalVente - sousTotalCout;

        totalVente += sousTotalVente;

        lignesCompletes.push({
          id: 'lig-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
          facture_id: '',
          produit_id: p.id,
          nom_produit: p.nom,
          quantite_bouteilles: item.quantite_bouteilles,
          prix_unitaire_vente: p.prix_vente_bouteille || 600,
          cout_unitaire_cmp: coutCMP,
          sous_total_vente: sousTotalVente,
          sous_total_cout: sousTotalCout,
          marge_brute: marge,
        });

        this.addMouvementStock({
          produit_id: p.id,
          type_mouvement: 'sortie',
          quantite_bouteilles: item.quantite_bouteilles,
          note_motif: `Facture ${numStr}`,
        });
      }
    });

    const montantRestant = Math.max(0, totalVente - (data.montant_paye || 0));
    const isCredit = data.mode_paiement === 'credit' || montantRestant > 0;

    const newFacture: Facture = {
      id: 'fac-' + Date.now(),
      etablissement_id: etab.id,
      numero_facture: numStr,
      client_id: data.client_id,
      utilisateur_id: currentUser.id,
      montant_total: totalVente,
      montant_paye: data.montant_paye || 0,
      montant_restant: montantRestant,
      mode_paiement: data.mode_paiement,
      statut: isCredit ? 'credit_encours' : 'payee',
      created_at: new Date().toISOString(),
      lignes: lignesCompletes.map((l) => ({ ...l, facture_id: 'fac-' + Date.now() })),
    };

    let allFacs: Facture[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FACTURES);
      allFacs = saved ? JSON.parse(saved) : SEED_FACTURES;
    } catch (e) { allFacs = SEED_FACTURES; }

    const updated = [newFacture, ...allFacs];
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEYS.FACTURES, JSON.stringify(updated)); } catch (e) {}
    }

    return newFacture;
  },

  recordWhatsAppRelance(factureId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FACTURES);
      const allFacs: Facture[] = saved ? JSON.parse(saved) : SEED_FACTURES;

      const updated = allFacs.map((f) => {
        if (f && f.id === factureId) {
          return {
            ...f,
            date_derniere_relance_whatsapp: new Date().toISOString(),
            compteur_relances: (f.compteur_relances || 0) + 1,
          };
        }
        return f;
      });

      localStorage.setItem(STORAGE_KEYS.FACTURES, JSON.stringify(updated));
    } catch (e) {}
  },

  // --- REMBOURSEMENTS DE CRÉDIT ---
  getRemboursements(): RemboursementCredit[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_REMBOURSEMENTS.filter((r) => r.etablissement_id === etab.id);
    let allRembs: RemboursementCredit[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REMBOURSEMENTS);
      if (saved) {
        allRembs = JSON.parse(saved);
      } else {
        allRembs = SEED_REMBOURSEMENTS;
        localStorage.setItem(STORAGE_KEYS.REMBOURSEMENTS, JSON.stringify(allRembs));
      }
    } catch (e) {
      allRembs = SEED_REMBOURSEMENTS;
    }
    return allRembs.filter((r) => r && r.etablissement_id === etab.id);
  },

  processRemboursementCredit(data: {
    facture_id: string;
    montant_regle: number;
    methode: 'cash' | 'orange_money' | 'mtn_momo';
    note_reference?: string;
  }): RemboursementCredit {
    const etab = this.getEtablissement();
    const currentUser = this.getCurrentUser();

    const newRemb: RemboursementCredit = {
      id: 'remb-' + Date.now(),
      facture_id: data.facture_id,
      etablissement_id: etab.id,
      montant_regle: data.montant_regle,
      methode: data.methode,
      utilisateur_id: currentUser.id,
      note_reference: data.note_reference || 'Remboursement crédit client',
      created_at: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      try {
        const savedRembs = localStorage.getItem(STORAGE_KEYS.REMBOURSEMENTS);
        const allRembs: RemboursementCredit[] = savedRembs ? JSON.parse(savedRembs) : SEED_REMBOURSEMENTS;
        localStorage.setItem(STORAGE_KEYS.REMBOURSEMENTS, JSON.stringify([newRemb, ...allRembs]));

        const savedFacs = localStorage.getItem(STORAGE_KEYS.FACTURES);
        const allFacs: Facture[] = savedFacs ? JSON.parse(savedFacs) : SEED_FACTURES;
        const updatedFacs = allFacs.map((f) => {
          if (f && f.id === data.facture_id) {
            const newPaye = (f.montant_paye || 0) + data.montant_regle;
            const newRestant = Math.max(0, (f.montant_total || 0) - newPaye);
            return {
              ...f,
              montant_paye: newPaye,
              montant_restant: newRestant,
              statut: (newRestant === 0 ? 'payee' : 'credit_encours') as any,
            };
          }
          return f;
        });

        localStorage.setItem(STORAGE_KEYS.FACTURES, JSON.stringify(updatedFacs));
      } catch (e) {}
    }

    return newRemb;
  },

  // --- CHARGES JOURNALIÈRES ---
  getCharges(): ChargeJournaliere[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_CHARGES.filter((c) => c.etablissement_id === etab.id);
    let allCharges: ChargeJournaliere[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHARGES);
      if (saved) {
        allCharges = JSON.parse(saved);
      } else {
        allCharges = SEED_CHARGES;
        localStorage.setItem(STORAGE_KEYS.CHARGES, JSON.stringify(allCharges));
      }
    } catch (e) {
      allCharges = SEED_CHARGES;
    }
    return allCharges.filter((c) => c && c.etablissement_id === etab.id);
  },

  addChargeJournaliere(data: { motif: string; montant: number; date?: string }): ChargeJournaliere {
    const etab = this.getEtablissement();
    let allCharges: ChargeJournaliere[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHARGES);
      allCharges = saved ? JSON.parse(saved) : SEED_CHARGES;
    } catch (e) { allCharges = SEED_CHARGES; }

    const newCharge: ChargeJournaliere = {
      id: 'chg-' + Date.now(),
      etablissement_id: etab.id,
      motif: data.motif || 'Charge divers',
      montant: data.montant || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    const updated = [newCharge, ...allCharges];
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEYS.CHARGES, JSON.stringify(updated)); } catch (e) {}
    }
    return newCharge;
  },

  // --- MODULE COMPTABILITÉ & ÉTAT DU JOUR ---
  getComptabiliteJournaliere(range: 'jour' | 'semaine' | 'mois' = 'jour') {
    const factures = this.getFactures();
    const rembs = this.getRemboursements();
    const charges = this.getCharges();

    const now = new Date();

    const filterByRange = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      if (range === 'jour') {
        return d.toDateString() === now.toDateString();
      } else if (range === 'semaine') {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      } else {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
    };

    const periodFactures = factures.filter((f) => filterByRange(f.created_at));
    const periodRembs = rembs.filter((r) => filterByRange(r.created_at));
    const periodCharges = charges.filter((c) => filterByRange(c.created_at));

    const caTotal = periodFactures.reduce((acc, f) => acc + (f.montant_total || 0), 0);
    const encaisseDirect = periodFactures.reduce((acc, f) => acc + (f.montant_paye || 0), 0);
    const encaisseRembs = periodRembs.reduce((acc, r) => acc + (r.montant_regle || 0), 0);
    const encaisseReel = encaisseDirect + encaisseRembs;

    let cmvTotal = 0;
    periodFactures.forEach((f) => {
      if (f.lignes) {
        f.lignes.forEach((l) => {
          cmvTotal += l.sous_total_cout || 0;
        });
      }
    });

    const margeBrute = caTotal - cmvTotal;
    const totalCharges = periodCharges.reduce((acc, c) => acc + (c.montant || 0), 0);
    const resultatNet = margeBrute - totalCharges;

    return {
      caTotal,
      encaisseReel,
      cmvTotal,
      margeBrute,
      totalCharges,
      resultatNet,
      nbFactures: periodFactures.length,
      factures: periodFactures,
      charges: periodCharges,
    };
  },

  // --- FILE D'ATTENTE HORS-LIGNE & SYNCHRO ---
  addToOfflineQueue(item: any): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      const queue = saved ? JSON.parse(saved) : [];
      queue.push(item);
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (e) {}
  },

  getOfflineQueueCount(): number {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return saved ? JSON.parse(saved).length : 0;
    } catch (e) { return 0; }
  },

  syncOfflineQueue(): number {
    if (typeof window === 'undefined') return 0;
    const count = this.getOfflineQueueCount();
    if (count === 0) return 0;

    try {
      const savedMvts = localStorage.getItem(STORAGE_KEYS.MOUVEMENTS);
      if (savedMvts) {
        const allMvts: MouvementStock[] = JSON.parse(savedMvts);
        const synced = allMvts.map((m) => ({ ...m, sync_status: 'synced' as const }));
        localStorage.setItem(STORAGE_KEYS.MOUVEMENTS, JSON.stringify(synced));
      }
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    } catch (e) {}
    return count;
  },

  // --- ABONNEMENT MOBILE MONEY ---
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
      statut: 'reussi',
      created_at: new Date().toISOString(),
    };

    const currentFin = etab.date_fin_essai ? new Date(etab.date_fin_essai) : new Date();
    const now = new Date();
    const baseDate = currentFin > now ? currentFin : now;
    baseDate.setDate(baseDate.getDate() + 30);

    const updatedEtab: Etablissement = {
      ...etab,
      statut_abonnement: 'actif',
      date_prochain_paiement: baseDate.toISOString(),
      date_fin_essai: baseDate.toISOString(),
    };

    if (typeof window !== 'undefined') {
      try {
        const etabs = this.getEtablissements();
        const updatedList = etabs.map((e) => (e.id === etab.id ? updatedEtab : e));
        localStorage.setItem(STORAGE_KEYS.ETABLISSEMENTS, JSON.stringify(updatedList));

        const savedPaiements = localStorage.getItem(STORAGE_KEYS.PAIEMENTS);
        const allPaiements: Paiement[] = savedPaiements ? JSON.parse(savedPaiements) : [];
        localStorage.setItem(STORAGE_KEYS.PAIEMENTS, JSON.stringify([newPaiement, ...allPaiements]));
      } catch (e) {}
    }

    return newPaiement;
  },
};
