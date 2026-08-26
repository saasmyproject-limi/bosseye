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
} from './presetData';

const KEYS = {
  ACTIVE_ETAB_ID: 'takam_active_etab_id',
  ETABLISSEMENTS: 'takam_etablissements',
  UTILISATEURS: 'takam_utilisateurs',
  CURRENT_USER_ID: 'takam_current_user_id',
  PRODUITS: 'takam_produits',
  MOUVEMENTS: 'takam_mouvements',
  CLIENTS: 'takam_clients',
  FACTURES: 'takam_factures',
  TRANSACTIONS: 'takam_transactions_ventes',
  REMBOURSEMENTS: 'takam_remboursements',
  CHARGES: 'takam_charges',
  OFFLINE_QUEUE: 'takam_offline_queue',
};

// Helper pour déterminer le vocabulaire selon le type d'activité
export function getTerminology(type_activite?: TypeActivite) {
  const isBoutique = type_activite === 'boutique';
  const isBar = type_activite === 'bar';

  return {
    itemLabel: isBoutique ? 'Article' : 'Produit / Boisson',
    itemsLabel: isBoutique ? 'Articles' : 'Boissons',
    unitLabel: isBoutique ? 'Pièces' : 'Bouteilles',
    unitSingular: isBoutique ? 'Pièce' : 'Bouteille',
    stockLabel: isBoutique ? 'Stock d\'articles' : 'Stock de casiers & bouteilles',
    sellerLabel: isBoutique ? 'Vendeuse' : isBar ? 'Serveuse' : 'Serveuse / Caissière',
    salesScreenTitle: isBoutique ? 'Vente Comptoir' : isBar ? 'Gestion des Tables' : 'Prise de Commande & Caisse',
    salesScreenDesc: isBoutique
      ? 'Vente directe, encaissement immédiat et sélection des déclinaisons (tailles/couleurs).'
      : isBar
      ? 'Ouverture de table, accumulation de consommations et clôture avec addition.'
      : 'Prise de commande par serveuse transmise instantanément en caisse.',
  };
}

export const offlineDB = {
  // --- ÉTABLISSEMENT & SECTEUR ---
  getEtablissement(): Etablissement {
    try {
      const activeId = typeof window !== 'undefined' ? localStorage.getItem(KEYS.ACTIVE_ETAB_ID) : null;
      const all = this.getEtablissements();
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
    return {
      ...e,
      type_activite: act,
    };
  },

  getEtablissements(): Etablissement[] {
    try {
      if (typeof window === 'undefined') return SEED_ETABLISSEMENTS_LIST.map((e) => this.normalizeEtablissement(e));
      const data = localStorage.getItem(KEYS.ETABLISSEMENTS);
      if (!data) {
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
      if (typeof window !== 'undefined') return;
      localStorage.setItem(KEYS.ACTIVE_ETAB_ID, id);
      const users = this.getUtilisateurs();
      const firstUserInEtab = users.find((u) => u && u.etablissement_id === id);
      if (firstUserInEtab) {
        localStorage.setItem(KEYS.CURRENT_USER_ID, firstUserInEtab.id);
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
    const newEtab: Etablissement = {
      id: newId,
      nom: params.nom,
      type: params.type || (params.type_activite as TypeEtablissement),
      type_activite: params.type_activite,
      ville: params.ville,
      adresse: params.adresse,
      plan: 'Premium',
      statut_abonnement: 'essai',
      date_fin_essai: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      date_prochain_paiement: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    const newPatron: Utilisateur = {
      id: `user-patron-${Date.now()}`,
      etablissement_id: newId,
      nom: params.patronNom || 'Patron',
      role: 'Patron',
      pin_code: params.patronPin || '1234',
      actif: true,
      created_at: new Date().toISOString(),
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
      plan: params.plan,
      statut_abonnement: 'actif' as const,
      date_prochain_paiement: nextPay,
    };

    const phone = params.telephone || params.telephone_payeur || '';
    const ref = params.reference || params.reference_transaction || '';

    const newPaiement: Paiement = {
      id: `pay-${Date.now()}`,
      etablissement_id: etab.id,
      montant: params.montant || (params.plan === 'Premium' ? 25000 : 15000),
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
      return users[0] || SEED_UTILISATEURS[0];
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
      if (typeof window === 'undefined') return SEED_UTILISATEURS.filter((u) => u && u.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.UTILISATEURS);
      if (!data) {
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

  // --- PRODUITS & VARIANTES ---
  getProduits(): Produit[] {
    try {
      const etab = this.getEtablissement();
      if (typeof window === 'undefined') return SEED_PRODUITS.filter((p) => p && p.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.PRODUITS);
      if (!data) {
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

  // --- TRANSACTIONS DE VENTE (MOTEUR UNIQUE) ---
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
      if (typeof window === 'undefined') return SEED_MOUVEMENTS.filter((m) => m && m.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.MOUVEMENTS);
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

    // Mise à jour du stock produit
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
      if (typeof window === 'undefined') return SEED_CLIENTS.filter((c) => c && c.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.CLIENTS);
      if (!data) {
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
      if (typeof window === 'undefined') return SEED_FACTURES.filter((f) => f && f.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.FACTURES);
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
    client_id?: string;
    transaction_id?: string;
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

    const mPaye = params.mode_paiement === 'credit' ? (params.montant_paye || 0) : totalVente;
    const mRestant = Math.max(0, totalVente - mPaye);
    const isCredit = mRestant > 0 || params.mode_paiement === 'credit';

    const numSeq = Math.floor(1000 + Math.random() * 9000);
    const newFac: Facture = {
      id: `fac-${Date.now()}`,
      etablissement_id: etab.id,
      numero_facture: `FAC-2026-${numSeq}`,
      transaction_id: params.transaction_id,
      client_id: params.client_id,
      utilisateur_id: currentUser.id,
      montant_total: totalVente,
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
      // Alias rétrocompatibilité
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
      if (typeof window === 'undefined') return SEED_CHARGES.filter((c) => c && c.etablissement_id === etab.id);
      const data = localStorage.getItem(KEYS.CHARGES);
      if (!data) return SEED_CHARGES.filter((c) => c && c.etablissement_id === etab.id);
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
