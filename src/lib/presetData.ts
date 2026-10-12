import {
  Etablissement,
  Utilisateur,
  Produit,
  MouvementStock,
  Client,
  Facture,
  RemboursementCredit,
  ChargeJournaliere,
  CommandeEnLigne,
  Caisse,
} from '@/types';

// Plus AUCUNE donnée de démo ou seed codé en dur
export const SEED_ETABLISSEMENT: Etablissement | null = null;
export const SEED_ETABLISSEMENTS_LIST: Etablissement[] = [];
export const SEED_UTILISATEURS: Utilisateur[] = [];
export const SEED_CAISSES: Caisse[] = [];
export const SEED_PRODUITS: Produit[] = [];
export const SEED_COMMANDES_LIGNE: CommandeEnLigne[] = [];
export const SEED_MOUVEMENTS: MouvementStock[] = [];
export const SEED_CLIENTS: Client[] = [];
export const SEED_FACTURES: Facture[] = [];
export const SEED_REMBOURSEMENTS: RemboursementCredit[] = [];
export const SEED_CHARGES: ChargeJournaliere[] = [];
