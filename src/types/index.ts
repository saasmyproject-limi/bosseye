export type TypeActivite = 'bar' | 'snack' | 'boutique';
export type TypeEtablissement = TypeActivite | 'snack_bar' | 'lounge'; // Rétrocompatibilité

export type RoleUtilisateur =
  | 'Patron'      // Lecture seule à distance (Snack) ou accès complet
  | 'Patronne'    // Accès complet (Boutique / Bar)
  | 'Directeur'   // Accès complet sur site (Snack)
  | 'Gérant'      // Accès gérance
  | 'Caissière'   // Encaissement sur sa propre caisse (Snack)
  | 'Serveuse'    // Prise de commande & service (Bar / Snack)
  | 'Employé';    // Vente & stock sans marges/rapports globaux (Boutique)

export type TypeMouvement = 'entree' | 'sortie' | 'casse_perte';
export type StatutAbonnement = 'essai' | 'actif' | 'expire';
export type MethodePaiement = 'Orange Money' | 'MTN MoMo';
export type ModePaiementVente = 'cash' | 'orange_money' | 'mtn_momo' | 'credit' | 'mixte';
export type StatutFacture = 'payee' | 'credit_encours' | 'annulee';
export type StatutTransaction = 'ouverte' | 'en_attente_caisse' | 'payee' | 'annulee';
export type StatutLivraison = 'en_attente' | 'en_livraison' | 'livree_payee' | 'annulee';

export const TARIFS_ABONNEMENT: Record<TypeActivite, number> = {
  boutique: 5000,
  bar: 5000,
  snack: 10000,
};

export interface Etablissement {
  id: string;
  nom: string;
  type: TypeEtablissement;
  type_activite: TypeActivite;
  ville: string;
  adresse: string;
  plan: 'Basique' | 'Premium';
  statut_abonnement: StatutAbonnement;
  date_fin_essai: string; // ISO String (7 jours pour œko)
  date_prochain_paiement: string; // ISO String
  tarif_mensuel: number; // 5000 ou 10000 FCFA
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
  caisse_id?: string; // Si rôle Caissière
  actif: boolean;
  created_at?: string;
}

export interface Caisse {
  id: string;
  etablissement_id: string;
  caissiere_id: string;
  caissiere_nom: string;
  nom_caisse: string; // Ex: "Caisse Principale", "Caisse Terrasse"
  total_encaisse_du_jour: number;
  active: boolean;
  created_at?: string;
}

export interface VarianteProduit {
  id: string;
  produit_id: string;
  sku_code?: string;
  taille?: string; // Ex: 'S', 'M', 'L', 'XL', '42'
  couleur?: string; // Ex: 'Noir', 'Rouge', 'Bleu Marine'
  quantite_stock: number;
  prix_vente_override?: number;
}

export interface Produit {
  id: string;
  etablissement_id: string;
  nom: string;
  categorie: string; // Bière, Soft, Vêtements, Chaussures, Plats
  unite: 'bouteille' | 'casier' | 'piece' | 'unite';
  casiers_pleins?: number;
  bouteilles_vrac?: number;
  bouteilles_par_casier?: 12 | 24;
  quantite_totale: number; // Générique pour bouteilles ou pièces
  seuil_alerte: number;
  prix_achat_casier?: number;
  prix_vente_bouteille?: number;
  prix_achat_unitaire?: number;
  prix_vente_unitaire?: number;
  cout_achat_unitaire_cmp: number;
  variantes?: VarianteProduit[]; // Déclinaisons taille/couleur pour boutique
  actif: boolean;
  created_at?: string;
}

export interface CommandeEnLigne {
  id: string;
  etablissement_id: string;
  numero_commande: string; // Ex: "CMD-2026-001"
  client_nom: string;
  client_telephone: string;
  adresse_livraison: string;
  statut: StatutLivraison;
  lignes: Array<{
    produit_id: string;
    variante_id?: string;
    nom_produit: string;
    detail_variante?: string;
    quantite: number;
    prix_unitaire: number;
  }>;
  montant_total: number;
  facture_id?: string;
  created_at: string;
}

export interface MouvementStock {
  id: string;
  etablissement_id: string;
  produit_id: string;
  variante_id?: string;
  type_mouvement: TypeMouvement;
  quantite_bouteilles: number;
  utilisateur_id: string;
  note_motif: string;
  sync_status: 'synced' | 'pending_offline';
  client_timestamp: string;
  created_at: string;
  
  // Joins pour l'affichage visuel
  produit?: Produit;
  variante?: VarianteProduit;
  utilisateur?: Utilisateur;
}

export interface Client {
  id: string;
  etablissement_id: string;
  nom: string;
  telephone_whatsapp: string; // Ex: "237699001122"
  note_quartier?: string;
  total_dette_actuelle?: number;
  created_at: string;
}

export interface LigneTransaction {
  id: string;
  transaction_id: string;
  produit_id: string;
  variante_id?: string;
  nom_produit: string;
  detail_variante?: string; // Ex: "Taille M / Noir"
  quantite: number;
  prix_unitaire: number;
  cout_unitaire_cmp: number;
  sous_total: number;
}

export interface TransactionVente {
  id: string;
  etablissement_id: string;
  numero_ticket: string; // Ex: "TRX-2026-0089"
  type_activite: TypeActivite;
  statut: StatutTransaction;
  
  table_numero?: string; // Utilisé pour les bars (ex: "Table 04", "VIP 1")
  is_vip_table?: boolean;
  serveur_id?: string;
  caissier_id?: string;
  caisse_id?: string;
  client_id?: string;
  
  montant_total: number;
  montant_paye?: number;
  lignes: LigneTransaction[];
  created_at: string;

  // Joins UI
  client?: Client;
  serveur?: Utilisateur;
  caissier?: Utilisateur;
}

export interface LigneFacture {
  id: string;
  facture_id: string;
  produit_id: string;
  variante_id?: string;
  nom_produit: string;
  detail_variante?: string;
  quantite_bouteilles: number;
  prix_unitaire_vente: number;
  cout_unitaire_cmp: number;
  sous_total_vente: number;
  sous_total_cout: number;
  marge_brute: number;
}

export interface Facture {
  id: string;
  etablissement_id: string;
  numero_facture: string; // Ex: "FAC-2026-0042"
  transaction_id?: string;
  client_id?: string;
  utilisateur_id: string;
  caissiere_id?: string;
  serveuse_id?: string;
  montant_total: number;
  montant_paye: number;
  montant_restant: number;
  mode_paiement: ModePaiementVente;
  statut: StatutFacture;
  
  date_derniere_relance_whatsapp?: string;
  compteur_relances?: number;
  
  created_at: string;

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

  facture?: Facture;
  utilisateur?: Utilisateur;
}

export interface ChargeJournaliere {
  id: string;
  etablissement_id: string;
  motif: string;
  montant: number;
  date: string;
  created_at: string;
}

export interface Abonnement {
  id: string;
  etablissement_id: string;
  plan: 'Basique' | 'Premium';
  statut: StatutAbonnement;
  tarif_mensuel: number;
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
