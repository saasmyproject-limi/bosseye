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

  // --- AUTHENTIFICATION PAR PIN ---
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

  // --- UTILISATEURS ---
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

  // --- PRODUITS & CMP ---
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

  // --- MOUVEMENTS DE STOCK & CALCUL CMP ENTRÉE ---
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
      note_motif: data.note_motif,
      sync_status: isOnline ? 'synced' : 'pending_offline',
      client_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const delta = data.type_mouvement === 'entree' ? data.quantite_bouteilles : -data.quantite_bouteilles;
    const produits = this.getProduits();
    const updatedProduits = produits.map((p) => {
      if (p.id === data.produit_id) {
        const oldTotal = p.casiers_pleins * p.bouteilles_par_casier + p.bouteilles_vrac;
        let totalBottles = oldTotal + delta;
        if (totalBottles < 0) totalBottles = 0;

        let newCMP = p.cout_achat_unitaire_cmp || Math.round(p.prix_achat_casier / p.bouteilles_par_casier);

        // Recalcul du CMP en cas d'entrée de livraison
        if (data.type_mouvement === 'entree' && data.prix_achat_casier_nouveau) {
          const newUnitPrice = Math.round(data.prix_achat_casier_nouveau / p.bouteilles_par_casier);
          if (oldTotal + data.quantite_bouteilles > 0) {
            newCMP = Math.round(
              (oldTotal * newCMP + data.quantite_bouteilles * newUnitPrice) / (oldTotal + data.quantite_bouteilles)
            );
          }
        }

        const casiers = Math.floor(totalBottles / p.bouteilles_par_casier);
        const vrac = totalBottles % p.bouteilles_par_casier;

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

    const saved = localStorage.getItem(STORAGE_KEYS.MOUVEMENTS);
    const allMvts: MouvementStock[] = saved ? JSON.parse(saved) : SEED_MOUVEMENTS;
    const updatedMvts = [newMvt, ...allMvts];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MOUVEMENTS, JSON.stringify(updatedMvts));
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
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    let allClients: Client[] = [];
    if (saved) {
      try { allClients = JSON.parse(saved); } catch (e) { console.error(e); }
    } else {
      allClients = SEED_CLIENTS;
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(allClients));
    }

    const factures = this.getFactures();
    return allClients
      .filter((c) => c.etablissement_id === etab.id)
      .map((c) => {
        const clientFactures = factures.filter((f) => f.client_id === c.id && f.statut === 'credit_encours');
        const totalDette = clientFactures.reduce((acc, f) => acc + f.montant_restant, 0);
        return {
          ...c,
          total_dette_actuelle: totalDette,
        };
      });
  },

  addClient(data: { nom: string; telephone_whatsapp: string; note_quartier?: string }): Client {
    const etab = this.getEtablissement();
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    const allClients: Client[] = saved ? JSON.parse(saved) : SEED_CLIENTS;

    let phone = data.telephone_whatsapp.replace(/[^0-9]/g, '');
    if (phone.length === 9) phone = '237' + phone;

    const newClient: Client = {
      id: 'client-' + Date.now(),
      etablissement_id: etab.id,
      nom: data.nom,
      telephone_whatsapp: phone,
      note_quartier: data.note_quartier || '',
      created_at: new Date().toISOString(),
    };

    const updated = [newClient, ...allClients];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updated));
    }
    return newClient;
  },

  // --- FACTURATION & CRÉDITS ---
  getFactures(): Facture[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_FACTURES.filter((f) => f.etablissement_id === etab.id);
    const saved = localStorage.getItem(STORAGE_KEYS.FACTURES);
    let allFacs: Facture[] = [];
    if (saved) {
      try { allFacs = JSON.parse(saved); } catch (e) { console.error(e); }
    } else {
      allFacs = SEED_FACTURES;
      localStorage.setItem(STORAGE_KEYS.FACTURES, JSON.stringify(allFacs));
    }

    const clients = this.getClients();
    const users = this.getUtilisateurs();

    return allFacs
      .filter((f) => f.etablissement_id === etab.id)
      .map((f) => ({
        ...f,
        client: clients.find((c) => c.id === f.client_id),
        utilisateur: users.find((u) => u.id === f.utilisateur_id),
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
        const coutCMP = p.cout_achat_unitaire_cmp || Math.round(p.prix_achat_casier / p.bouteilles_par_casier);
        const sousTotalVente = item.quantite_bouteilles * p.prix_vente_bouteille;
        const sousTotalCout = item.quantite_bouteilles * coutCMP;
        const marge = sousTotalVente - sousTotalCout;

        totalVente += sousTotalVente;

        lignesCompletes.push({
          id: 'lig-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
          facture_id: '',
          produit_id: p.id,
          nom_produit: p.nom,
          quantite_bouteilles: item.quantite_bouteilles,
          prix_unitaire_vente: p.prix_vente_bouteille,
          cout_unitaire_cmp: coutCMP,
          sous_total_vente: sousTotalVente,
          sous_total_cout: sousTotalCout,
          marge_brute: marge,
        });

        // Décrémenter le stock automatiquement avec un mouvement 'sortie'
        this.addMouvementStock({
          produit_id: p.id,
          type_mouvement: 'sortie',
          quantite_bouteilles: item.quantite_bouteilles,
          note_motif: `Facture ${numStr}`,
        });
      }
    });

    const montantRestant = Math.max(0, totalVente - data.montant_paye);
    const isCredit = data.mode_paiement === 'credit' || montantRestant > 0;

    const newFacture: Facture = {
      id: 'fac-' + Date.now(),
      etablissement_id: etab.id,
      numero_facture: numStr,
      client_id: data.client_id,
      utilisateur_id: currentUser.id,
      montant_total: totalVente,
      montant_paye: data.montant_paye,
      montant_restant: montantRestant,
      mode_paiement: data.mode_paiement,
      statut: isCredit ? 'credit_encours' : 'payee',
      created_at: new Date().toISOString(),
      lignes: lignesCompletes.map((l) => ({ ...l, facture_id: 'fac-' + Date.now() })),
    };

    const saved = localStorage.getItem(STORAGE_KEYS.FACTURES);
    const allFacs: Facture[] = saved ? JSON.parse(saved) : SEED_FACTURES;
    const updated = [newFacture, ...allFacs];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FACTURES, JSON.stringify(updated));
    }

    return newFacture;
  },

  // RECORD RELANCE WHATSAPP
  recordWhatsAppRelance(factureId: string): void {
    const saved = localStorage.getItem(STORAGE_KEYS.FACTURES);
    const allFacs: Facture[] = saved ? JSON.parse(saved) : SEED_FACTURES;

    const updated = allFacs.map((f) => {
      if (f.id === factureId) {
        return {
          ...f,
          date_derniere_relance_whatsapp: new Date().toISOString(),
          compteur_relances: (f.compteur_relances || 0) + 1,
        };
      }
      return f;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FACTURES, JSON.stringify(updated));
    }
  },

  // --- REMBOURSEMENTS DE CRÉDIT ---
  getRemboursements(): RemboursementCredit[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_REMBOURSEMENTS.filter((r) => r.etablissement_id === etab.id);
    const saved = localStorage.getItem(STORAGE_KEYS.REMBOURSEMENTS);
    let allRembs: RemboursementCredit[] = [];
    if (saved) {
      try { allRembs = JSON.parse(saved); } catch (e) { console.error(e); }
    } else {
      allRembs = SEED_REMBOURSEMENTS;
      localStorage.setItem(STORAGE_KEYS.REMBOURSEMENTS, JSON.stringify(allRembs));
    }
    return allRembs.filter((r) => r.etablissement_id === etab.id);
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

    const savedRembs = localStorage.getItem(STORAGE_KEYS.REMBOURSEMENTS);
    const allRembs: RemboursementCredit[] = savedRembs ? JSON.parse(savedRembs) : SEED_REMBOURSEMENTS;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.REMBOURSEMENTS, JSON.stringify([newRemb, ...allRembs]));
    }

    // Mettre à jour la facture (montant payé & restant dû)
    const savedFacs = localStorage.getItem(STORAGE_KEYS.FACTURES);
    const allFacs: Facture[] = savedFacs ? JSON.parse(savedFacs) : SEED_FACTURES;
    const updatedFacs = allFacs.map((f) => {
      if (f.id === data.facture_id) {
        const newPaye = f.montant_paye + data.montant_regle;
        const newRestant = Math.max(0, f.montant_total - newPaye);
        return {
          ...f,
          montant_paye: newPaye,
          montant_restant: newRestant,
          statut: (newRestant === 0 ? 'payee' : 'credit_encours') as any,
        };
      }
      return f;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FACTURES, JSON.stringify(updatedFacs));
    }

    return newRemb;
  },

  // --- CHARGES JOURNALIÈRES ---
  getCharges(): ChargeJournaliere[] {
    const etab = this.getEtablissement();
    if (typeof window === 'undefined') return SEED_CHARGES.filter((c) => c.etablissement_id === etab.id);
    const saved = localStorage.getItem(STORAGE_KEYS.CHARGES);
    let allCharges: ChargeJournaliere[] = [];
    if (saved) {
      try { allCharges = JSON.parse(saved); } catch (e) { console.error(e); }
    } else {
      allCharges = SEED_CHARGES;
      localStorage.setItem(STORAGE_KEYS.CHARGES, JSON.stringify(allCharges));
    }
    return allCharges.filter((c) => c.etablissement_id === etab.id);
  },

  addChargeJournaliere(data: { motif: string; montant: number; date?: string }): ChargeJournaliere {
    const etab = this.getEtablissement();
    const saved = localStorage.getItem(STORAGE_KEYS.CHARGES);
    const allCharges: ChargeJournaliere[] = saved ? JSON.parse(saved) : SEED_CHARGES;

    const newCharge: ChargeJournaliere = {
      id: 'chg-' + Date.now(),
      etablissement_id: etab.id,
      motif: data.motif,
      montant: data.montant,
      date: data.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    const updated = [newCharge, ...allCharges];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CHARGES, JSON.stringify(updated));
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
      const d = new Date(dateStr);
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

    const caTotal = periodFactures.reduce((acc, f) => acc + f.montant_total, 0);
    const encaisseDirect = periodFactures.reduce((acc, f) => acc + f.montant_paye, 0);
    const encaisseRembs = periodRembs.reduce((acc, r) => acc + r.montant_regle, 0);
    const encaisseReel = encaisseDirect + encaisseRembs;

    let cmvTotal = 0;
    periodFactures.forEach((f) => {
      if (f.lignes) {
        f.lignes.forEach((l) => {
          cmvTotal += l.sous_total_cout;
        });
      }
    });

    const margeBrute = caTotal - cmvTotal;
    const totalCharges = periodCharges.reduce((acc, c) => acc + c.montant, 0);
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

    const savedMvts = localStorage.getItem(STORAGE_KEYS.MOUVEMENTS);
    if (savedMvts) {
      const allMvts: MouvementStock[] = JSON.parse(savedMvts);
      const synced = allMvts.map((m) => ({ ...m, sync_status: 'synced' as const }));
      localStorage.setItem(STORAGE_KEYS.MOUVEMENTS, JSON.stringify(synced));
    }
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
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
