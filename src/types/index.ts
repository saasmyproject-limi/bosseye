export type TypeEtablissement = 'bar' | 'snack_bar' | 'lounge';
export type RoleUtilisateur = 'Patron' | 'Gérant' | 'Employé';
export type TypeMouvement = 'entree' | 'sortie' | 'casse_perte';
export type StatutAbonnement = 'essai' | 'actif' | 'expire';
export type MethodePaiement = 'Orange Money' | 'MTN MoMo';

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
