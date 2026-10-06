export type TypeActivite = 'bar' | 'snack' | 'boutique';
export type TypeEtablissement = TypeActivite | 'snack_bar' | 'lounge'; // Rétrocompatibilité

export type RoleUtilisateur =
  | 'Patron'      // Lecture seule à distance ou accès complet
  | 'Patronne'    // Accès complet
  | 'Directeur'   // Accès complet sur site
  | 'Gérant'      // Accès gérance
  | 'Caissière'   // Encaissement sur sa propre caisse
  | 'Serveuse'    // Prise de commande & service
  | 'Employé'     // Vente & stock sans marges/rapports globaux
  | 'Comptable';   // Validation des paiements de commandes avant livraison sans accès direct stock/prix

export type ModeSuiviStock = 'quantite' | 'unite_serie';
export type TypeMouvement = 'entree' | 'sortie' | 'casse_perte';
export type StatutAbonnement = 'essai' | 'actif' | 'en_retard' | 'suspendu' | 'expire';
export type MethodePaiement = 'Orange Money' | 'MTN MoMo';
export type ModePaiementVente = 'cash' | 'orange_money' | 'mtn_momo' | 'credit' | 'mixte';
export type StatutFacture = 'payee' | 'credit_encours' | 'annulee';
export type StatutTransaction = 'ouverte' | 'en_attente_caisse' | 'payee' | 'annulee';
export type StatutLivraison = 'en_attente_paiement' | 'paiement_valide' | 'en_livraison' | 'livree_payee' | 'annulee';

export interface LigneSessionBar {
  id: string;
  produit_id: string;
  nom_produit: string;
  categorie_type: 'boisson' | 'plat'; // boisson (déstocke casiers/vrac) ou plat (menu simple/compteur plats)
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
  table_service?: string; // Table de livraison physique si différente de la table payante
  serveuse_id?: string;
  serveuse_nom?: string;
  created_at: string;
}

export interface SessionBar {
  id: string;
  etablissement_id: string;
  numero_session: string; // Ex: "SES-2026-0012"
  table_numero: string; // Table principale de la session payante (ex: "Table 03")
  nom_client_session: string; // Ex: "Session Client 1" ou "Groupe Paul"
  serveuse_id: string;
  serveuse_nom: string;
  statut: 'active' | 'cloturee_payee' | 'cloturee_credit';
  lignes: LigneSessionBar[];
  created_at: string;
  closed_at?: string;
}


export const TARIFS_ABONNEMENT: Record<TypeActivite, number> = {
  boutique: 5000,
  bar: 5000,
  snack: 10000,
};

export interface PalierTarifaire {
  id: string;
  code_palier: 'essentiel' | 'standard' | 'pro';
  nom: string;
  tarif_mensuel: number; // Ex: 3000, 5000, 10000 FCFA
  articles_max: number; // Ex: 100, 400, 999999 (Boutique)
  tables_max: number; // Ex: 5, 15, 999999 (Bar)
  utilisateurs_max: number; // Ex: 1, 3, 999999 (Illimité)
  description: string;
  modules_inclus: string[];
  badge_recommande?: boolean;
}


export interface Etablissement {
  id: string;
  nom: string;
  type: TypeEtablissement;
  type_activite: TypeActivite;
  secteur_boutique?: string; // Ex: 'Vêtements', 'Téléphones/Électronique', 'Pharmacie/Médicaments', 'Électroménager', 'Alimentation générale', etc.
  abrev_boutique?: string; // Abréviation personnalisée du commerce (ex: 'PEP', 'OEK', 'BOU')
  ville: string;
  adresse: string;
  telephone?: string;
  email_patron?: string;
  mot_de_passe_patron?: string;
  plan: 'Basique' | 'Premium';
  statut_abonnement: StatutAbonnement;
  delai_grace_jours?: number; // Défaut 3-5 jours
  date_fin_essai: string; // ISO String (7 jours pour œko)
  date_prochain_paiement: string; // ISO String
  tarif_mensuel: number; // 5000 ou 10000 FCFA
  palier_actuel_id?: string;
  comptable_actif?: boolean;
  created_at?: string;
}

export interface Utilisateur {
  id: string;
  etablissement_id: string;
  nom: string;
  role: RoleUtilisateur;
  pin_code: string; // PIN à 4 chiffres (ex: "1234")
  telephone?: string;
  email?: string;
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
  oko_code?: string; // Code unique automatique (ex: OKO-000452)
  taille?: string; // Ex: 'S', 'M', 'L', 'XL', '42'
  couleur?: string; // Ex: 'Noir', 'Rouge', 'Bleu Marine'
  quantite_stock: number;
  prix_vente_override?: number;
}

export interface ExemplaireArticle {
  id: string;
  produit_id: string;
  identifiant_unique: string; // Ex: OKO-000452, IMEI, S/N
  numero_lot?: string;
  date_peremption?: string;
  prix_achat_specifique?: number;
  statut: 'en_stock' | 'vendu' | 'reserve' | 'perdu';
  date_vente?: string;
}

export interface Produit {
  id: string;
  etablissement_id: string;
  nom: string;
  categorie: string; // Vêtements, Électronique, Pharmacie, etc.
  oko_code?: string; // Code unique automatique attribué par Œko (ex: OKO-000452)
  unite: 'bouteille' | 'casier' | 'piece' | 'unite';
  mode_suivi?: ModeSuiviStock; // 'quantite' | 'unite_serie' | 'lot_pharmacie'
  champs_specifiques?: Record<string, any>; // Taille, couleur, matière, marque, modèle, IMEI, dosage, lot, garantie, etc.
  casiers_pleins?: number;
  bouteilles_vrac?: number;
  bouteilles_par_casier?: number;
  quantite_totale: number; // Quantité globale ou somme des exemplaires
  seuil_alerte: number;
  prix_achat_casier?: number;
  prix_vente_bouteille?: number;
  prix_achat_unitaire?: number;
  prix_vente_unitaire?: number;
  cout_achat_unitaire_cmp: number;
  variantes?: VarianteProduit[]; // Déclinaisons taille/couleur pour boutique
  exemplaires?: ExemplaireArticle[]; // Exemplaires physiques pour suivi à l'unité (IMEI, OKO-code, etc.)
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
  quartier_livraison?: string;
  date_livraison?: string;
  heure_livraison?: string;
  statut: StatutLivraison;
  pris_par_id?: string;
  pris_par_nom?: string;
  valide_par_comptable_id?: string;
  valide_par_comptable_nom?: string;
  livre_par_id?: string;
  livre_par_nom?: string;
  lignes: Array<{
    produit_id: string;
    variante_id?: string;
    exemplaire_id?: string;
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
  exemplaire_id?: string;
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
  exemplaire?: ExemplaireArticle;
  utilisateur?: Utilisateur;
}

export interface Client {
  id: string;
  etablissement_id: string;
  nom: string;
  telephone_whatsapp: string; // Ex: "237699001122"
  sexe?: 'Homme' | 'Femme' | 'Autre';
  note_quartier?: string;
  total_dette_actuelle?: number;
  created_at: string;
}

export interface LigneTransaction {
  id: string;
  transaction_id: string;
  produit_id: string;
  variante_id?: string;
  exemplaire_id?: string;
  nom_produit: string;
  detail_variante?: string; // Ex: "Taille M / Noir" ou "IMEI: 35492810..."
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
  
  table_numero?: string;
  is_vip_table?: boolean;
  serveur_id?: string;
  caissier_id?: string;
  caisse_id?: string;
  client_id?: string;
  
  montant_total: number;
  montant_paye?: number;
  lignes: LigneTransaction[];
  created_at: string;

  client?: Client;
  serveur?: Utilisateur;
  caissier?: Utilisateur;
}

export interface LigneFacture {
  id: string;
  facture_id: string;
  produit_id: string;
  variante_id?: string;
  exemplaire_id?: string;
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
  remise?: number;
  net_a_payer?: number;
  montant_verse?: number;
  montant_rendu?: number;
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
  palier_tarifaire_id?: string;
}

export interface Paiement {
  id: string;
  etablissement_id: string;
  abonnement_id?: string;
  montant: number;
  methode: MethodePaiement;
  telephone_payeur?: string;
  reference_transaction: string;
  statut: 'en_attente' | 'reussi' | 'echoue';
  created_at: string;
}

export type StatutReservation = 'en_attente' | 'soldee_recuperee' | 'annulee';

export interface LigneReservation {
  id: string;
  reservation_id?: string;
  produit_id: string;
  variante_id?: string;
  exemplaire_id?: string;
  nom_produit: string;
  detail_variante?: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
}

export interface Reservation {
  id: string;
  etablissement_id: string;
  numero_reservation: string; // Ex: "RES-2026-0042"
  client_id?: string;
  utilisateur_id: string;
  
  lignes: LigneReservation[];

  montant_total: number;
  acompte_paye: number;
  reste_a_solder: number;
  statut: StatutReservation;
  date_limite_retrait?: string;
  
  compteur_relances?: number;
  date_derniere_relance_whatsapp?: string;

  created_at: string;

  client?: Client;
  utilisateur?: Utilisateur;
}

export interface ClotureJournaliere {
  id: string;
  etablissement_id: string;
  date_cloture: string; // Format YYYY-MM-DD
  total_ventes: number;
  total_encaisse_cash: number;
  total_encaisse_om: number;
  total_encaisse_momo: number;
  valeur_stock_sorti: number;
  quantite_stock_sorti: number;
  quantite_stock_entre?: number;
  valeur_stock_entre?: number;
  quantite_stock_restant_total?: number;
  nombre_articles_differents?: number;
  marge_brute_cmp: number;
  creances_accordees_jour: number;
  creances_recouvrees_jour: number;
  fige_le: string; // ISO date timestamp
  cree_par: string; // Utilisateur nom/role
}

export interface ClotureMensuelle {
  id: string;
  etablissement_id: string;
  mois_annee: string; // Format YYYY-MM
  total_ventes: number;
  cout_marchandises_vendues: number;
  marge_brute_cmp: number;
  total_charges: number;
  resultat_net: number;
  fige_le: string;
  cree_par: string;
}


