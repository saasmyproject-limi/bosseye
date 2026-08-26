export type TypeEtablissement = 'bar' | 'snack_bar' | 'lounge';
export type RoleUtilisateur = 'Patron' | 'Gérant' | 'Employé';
export type TypeMouvement = 'entree' | 'sortie' | 'casse_perte';
export type StatutAbonnement = 'essai' | 'actif' | 'expire';
export type MethodePaiement = 'Orange Money' | 'MTN MoMo';
export type ModePaiementVente = 'cash' | 'orange_money' | 'mtn_momo' | 'credit' | 'mixte';
export type StatutFacture = 'payee' | 'credit_encours' | 'annulee';

export interface Etablissement {
  id: string;
  nom: string;
  type: TypeEtablissement;
  ville: string;
  adresse: string;
  plan: 'Basique' | 'Premium';
  statut_abonnement: StatutAbonnement;
  date_fin_essai: string; // ISO String (14 jours)
  date_prochain_paiement: string; // ISO String
  created_at?: string;
}

export interface Utilisateur {
  id: string;
  etablissement_id: string;
  nom: string;
  role: RoleUtilisateur;
  pin_code: string; // PIN à 4 chiffres (ex: "1234")
  telephone?: string;
  photo_url?: string | null;
  actif: boolean;
  created_at?: string;
}

export interface Produit {
  id: string;
  etablissement_id: string;
  nom: string;
  categorie: string; // Bière, Soft, Nectar, Plat, Liquide
  unite: 'bouteille' | 'casier';
  casiers_pleins: number;
  bouteilles_vrac: number;
  bouteilles_par_casier: 12 | 24;
  quantite_totale_bouteilles: number;
  seuil_alerte: number; // En bouteilles ou casiers
  prix_achat_casier: number;
  prix_vente_bouteille: number;
  cout_achat_unitaire_cmp: number; // Coût d'achat moyen d'une bouteille (CMP)
  actif: boolean;
  created_at?: string;
}

export interface MouvementStock {
  id: string;
  etablissement_id: string;
  produit_id: string;
  type_mouvement: TypeMouvement;
  quantite_bouteilles: number;
  utilisateur_id: string;
  note_motif: string;
  sync_status: 'synced' | 'pending_offline';
  client_timestamp: string;
  created_at: string;
  
  // Joins pour l'affichage visuel
  produit?: Produit;
  utilisateur?: Utilisateur;
}

export interface Client {
  id: string;
  etablissement_id: string;
  nom: string;
  telephone_whatsapp: string; // Ex: "237699001122" (Format international sans espace)
  note_quartier?: string;
  created_at: string;
}

export interface LigneFacture {
  id: string;
  facture_id: string;
  produit_id: string;
  nom_produit: string;
  quantite_bouteilles: number;
  prix_unitaire_vente: number;
  cout_unitaire_cmp: number; // CMP au moment de la vente
  sous_total_vente: number;
  sous_total_cout: number;
  marge_brute: number;
}

export interface Facture {
  id: string;
  etablissement_id: string;
  numero_facture: string; // Ex: "FAC-2026-0042"
  client_id?: string;
  utilisateur_id: string; // Caissier / Employé qui a encaissé
  montant_total: number;
  montant_paye: number;
  montant_restant: number;
  mode_paiement: ModePaiementVente;
  statut: StatutFacture;
  
  // Suivi Relances WhatsApp
  date_derniere_relance_whatsapp?: string;
  compteur_relances?: number;
  
  created_at: string;

  // Joins pour l'UI
  client?: Client;
  utilisateur?: Utilisateur;
  lignes?: LigneFacture[];
}

export interface RemboursementCredit {
  id: string;
  facture_id: string;
  etablissement_id: string;
  montant_regle: number;
  methode: 'cash' | 'orange_money' | 'mtn_momo';
  utilisateur_id: string;
  note_reference?: string;
  created_at: string;

  // Joins
  facture?: Facture;
  utilisateur?: Utilisateur;
}

export interface ChargeJournaliere {
  id: string;
  etablissement_id: string;
  motif: string; // Ex: "Loyer local", "Glace en bloc"
  montant: number;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface Abonnement {
  id: string;
  etablissement_id: string;
  plan: 'Basique' | 'Premium';
  statut: StatutAbonnement;
  date_prochain_paiement: string;
}

export interface Paiement {
  id: string;
  etablissement_id: string;
  abonnement_id?: string;
  montant: number;
  methode: MethodePaiement;
  telephone_payeur: string;
  reference_transaction: string;
  statut: 'en_attente' | 'reussi' | 'echoue';
  created_at: string;
}
