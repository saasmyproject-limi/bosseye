-- ==============================================================================
-- SCRIPT SQL UNIVERSAL & BLINDÉ - ŒKO BOUTIQUE (COMPATIBLE TOUTE BASE SUPABASE)
-- Exécuter ce script dans le SQL Editor de Supabase
-- ==============================================================================

-- 1. Activation de l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Création de toutes les tables si elles n'existent pas encore
CREATE TABLE IF NOT EXISTS public.activites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proprietaire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type_activite TEXT NOT NULL DEFAULT 'boutique',
    secteur TEXT DEFAULT 'Vêtements & Mode',
    nom TEXT NOT NULL DEFAULT 'Ma Boutique',
    abbreviation_code TEXT NOT NULL DEFAULT 'OEK',
    ville TEXT DEFAULT 'Douala',
    adresse TEXT,
    telephone TEXT,
    palier TEXT NOT NULL DEFAULT 'Essentiel',
    statut_abonnement TEXT NOT NULL DEFAULT 'essai',
    fin_essai TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
    acces_bloque BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nom TEXT NOT NULL DEFAULT 'Membre',
    role TEXT NOT NULL DEFAULT 'employe',
    pin_hash TEXT,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    nom TEXT NOT NULL DEFAULT 'Article',
    categorie TEXT DEFAULT 'Général',
    attributs_variables JSONB DEFAULT '{}'::jsonb,
    code_unique TEXT NOT NULL DEFAULT 'ART-001',
    prix_vente NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    mode_suivi TEXT NOT NULL DEFAULT 'quantite',
    seuil_alerte INTEGER DEFAULT 5,
    image_url TEXT,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.couts_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    prix_achat NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fournisseur_nom TEXT,
    fournisseur_recu_photo TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mouvements_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    type_mouvement TEXT NOT NULL DEFAULT 'entree',
    quantite INTEGER NOT NULL DEFAULT 0,
    motif TEXT,
    auteur_nom TEXT NOT NULL DEFAULT 'Système',
    auteur_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    mouvement_id UUID REFERENCES public.mouvements_stock(id) ON DELETE SET NULL,
    statut TEXT NOT NULL DEFAULT 'en_attente',
    quantite_annoncee INTEGER NOT NULL DEFAULT 0,
    quantite_comptee INTEGER,
    saisi_par_nom TEXT NOT NULL DEFAULT 'Inconnu',
    saisi_par_role TEXT NOT NULL DEFAULT 'employe',
    confirme_par_nom TEXT,
    commentaire_ecart TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    nom TEXT NOT NULL DEFAULT 'Client',
    telephone TEXT,
    adresse TEXT,
    solde_dette NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ventes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    numero_facture TEXT NOT NULL DEFAULT 'FAC-000',
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_nom TEXT,
    total_ht NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    montant_remise NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_ttc NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    montant_paye NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    reste_a_payer NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    mode_paiement TEXT NOT NULL DEFAULT 'especes',
    statut TEXT NOT NULL DEFAULT 'payee',
    vendeur_nom TEXT NOT NULL DEFAULT 'Inconnu',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lignes_vente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vente_id UUID REFERENCES public.ventes(id) ON DELETE CASCADE,
    article_id UUID REFERENCES public.articles(id) ON DELETE RESTRICT,
    article_nom TEXT NOT NULL DEFAULT 'Article',
    code_unique TEXT,
    quantite INTEGER NOT NULL DEFAULT 1,
    prix_unitaire NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_ligne NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    vente_id UUID REFERENCES public.ventes(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'dette_initiale',
    montant NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    mode_reglement TEXT DEFAULT 'especes',
    auteur_nom TEXT NOT NULL DEFAULT 'Système',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    client_nom TEXT NOT NULL DEFAULT 'Client',
    client_telephone TEXT,
    article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    article_nom TEXT NOT NULL DEFAULT 'Article',
    quantite INTEGER NOT NULL DEFAULT 1,
    acompte_paye NUMERIC(12,2) DEFAULT 0.00,
    prix_total NUMERIC(12,2) DEFAULT 0.00,
    date_echeance TIMESTAMPTZ,
    statut TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commandes_en_ligne (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    numero_commande TEXT NOT NULL DEFAULT 'CMD-000',
    client_nom TEXT NOT NULL DEFAULT 'Client',
    client_telephone TEXT NOT NULL DEFAULT '',
    adresse_livraison TEXT,
    articles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    statut TEXT NOT NULL DEFAULT 'en_attente',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    titre TEXT NOT NULL DEFAULT 'Charge',
    categorie TEXT DEFAULT 'Divers',
    montant NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    auteur_nom TEXT NOT NULL DEFAULT 'Système',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clotures_journalieres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    date_cloture DATE NOT NULL DEFAULT CURRENT_DATE,
    total_ventes_especes NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_ventes_mobile NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_recouvrement_credits NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_charges NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fond_caisse_fermeture NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ecart_caisse NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    auteur_nom TEXT NOT NULL DEFAULT 'Système',
    notes TEXT,
    figee BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL DEFAULT 'action',
    article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    article_nom TEXT,
    quantite_avant INTEGER,
    quantite_apres INTEGER,
    variation_quantite INTEGER,
    motif TEXT NOT NULL DEFAULT 'Log système',
    auteur_nom TEXT NOT NULL DEFAULT 'Système',
    auteur_role TEXT NOT NULL DEFAULT 'utilisateur',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.abonnements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    palier TEXT NOT NULL DEFAULT 'Essentiel',
    prix_mensuel NUMERIC(12,2) NOT NULL DEFAULT 15000.00,
    date_debut TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_expiration TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
    statut TEXT NOT NULL DEFAULT 'actif',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.paiements_abonnement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    montant NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    mode_paiement TEXT NOT NULL DEFAULT 'orange_money',
    reference_transaction TEXT,
    statut TEXT NOT NULL DEFAULT 'en_attente',
    valide_par_superadmin_id UUID REFERENCES auth.users(id),
    valide_le TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parametres_plateforme (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cle TEXT UNIQUE NOT NULL,
    valeur_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. MIGRATION & RÉTROCOMPATIBILITÉ : GARANTIR 100% DES COLONNES SUR LES TABLES EXISTANTES
-- (Empêche toute erreur "column does not exist" si une table préexistait)
-- ==============================================================================

-- 1. activites
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS proprietaire_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS type_activite TEXT DEFAULT 'boutique';
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS secteur TEXT DEFAULT 'Vêtements & Mode';
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS nom TEXT DEFAULT 'Ma Boutique';
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS abbreviation_code TEXT DEFAULT 'OEK';
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS ville TEXT DEFAULT 'Douala';
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS telephone TEXT;
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS palier TEXT DEFAULT 'Essentiel';
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS statut_abonnement TEXT DEFAULT 'essai';
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS fin_essai TIMESTAMPTZ DEFAULT (now() + interval '14 days');
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS acces_bloque BOOLEAN DEFAULT false;
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.activites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. membres
ALTER TABLE public.membres ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.membres ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.membres ADD COLUMN IF NOT EXISTS nom TEXT DEFAULT 'Membre';
ALTER TABLE public.membres ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'employe';
ALTER TABLE public.membres ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE public.membres ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;
ALTER TABLE public.membres ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.membres ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. articles
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS nom TEXT DEFAULT 'Article';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS categorie TEXT DEFAULT 'Général';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS attributs_variables JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS code_unique TEXT DEFAULT 'ART-000';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS prix_vente NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS mode_suivi TEXT DEFAULT 'quantite';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS seuil_alerte INTEGER DEFAULT 5;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. couts_articles
ALTER TABLE public.couts_articles ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE;
ALTER TABLE public.couts_articles ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.couts_articles ADD COLUMN IF NOT EXISTS prix_achat NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.couts_articles ADD COLUMN IF NOT EXISTS fournisseur_nom TEXT;
ALTER TABLE public.couts_articles ADD COLUMN IF NOT EXISTS fournisseur_recu_photo TEXT;
ALTER TABLE public.couts_articles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 5. mouvements_stock
ALTER TABLE public.mouvements_stock ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.mouvements_stock ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE;
ALTER TABLE public.mouvements_stock ADD COLUMN IF NOT EXISTS type_mouvement TEXT DEFAULT 'entree';
ALTER TABLE public.mouvements_stock ADD COLUMN IF NOT EXISTS quantite INTEGER DEFAULT 0;
ALTER TABLE public.mouvements_stock ADD COLUMN IF NOT EXISTS motif TEXT;
ALTER TABLE public.mouvements_stock ADD COLUMN IF NOT EXISTS auteur_nom TEXT DEFAULT 'Système';
ALTER TABLE public.mouvements_stock ADD COLUMN IF NOT EXISTS auteur_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.mouvements_stock ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 6. receptions
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS mouvement_id UUID REFERENCES public.mouvements_stock(id) ON DELETE SET NULL;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'en_attente';
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS quantite_annoncee INTEGER DEFAULT 0;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS quantite_comptee INTEGER;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS saisi_par_nom TEXT DEFAULT 'Inconnu';
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS saisi_par_role TEXT DEFAULT 'employe';
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS confirme_par_nom TEXT;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS commentaire_ecart TEXT;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 7. clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nom TEXT DEFAULT 'Client';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS telephone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS solde_dette NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 8. ventes
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS numero_facture TEXT DEFAULT 'FAC-000';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS client_nom TEXT;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS total_ht NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS montant_remise NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS total_ttc NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS montant_paye NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS reste_a_payer NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS mode_paiement TEXT DEFAULT 'especes';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'payee';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS vendeur_nom TEXT DEFAULT 'Inconnu';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 9. lignes_vente
ALTER TABLE public.lignes_vente ADD COLUMN IF NOT EXISTS vente_id UUID REFERENCES public.ventes(id) ON DELETE CASCADE;
ALTER TABLE public.lignes_vente ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES public.articles(id) ON DELETE RESTRICT;
ALTER TABLE public.lignes_vente ADD COLUMN IF NOT EXISTS article_nom TEXT DEFAULT 'Article';
ALTER TABLE public.lignes_vente ADD COLUMN IF NOT EXISTS code_unique TEXT;
ALTER TABLE public.lignes_vente ADD COLUMN IF NOT EXISTS quantite INTEGER DEFAULT 1;
ALTER TABLE public.lignes_vente ADD COLUMN IF NOT EXISTS prix_unitaire NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.lignes_vente ADD COLUMN IF NOT EXISTS total_ligne NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.lignes_vente ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 10. creances
ALTER TABLE public.creances ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.creances ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.creances ADD COLUMN IF NOT EXISTS vente_id UUID REFERENCES public.ventes(id) ON DELETE SET NULL;
ALTER TABLE public.creances ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'dette_initiale';
ALTER TABLE public.creances ADD COLUMN IF NOT EXISTS montant NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.creances ADD COLUMN IF NOT EXISTS mode_reglement TEXT DEFAULT 'especes';
ALTER TABLE public.creances ADD COLUMN IF NOT EXISTS auteur_nom TEXT DEFAULT 'Système';
ALTER TABLE public.creances ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.creances ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 11. reservations
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS client_nom TEXT DEFAULT 'Client';
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS client_telephone TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS article_nom TEXT DEFAULT 'Article';
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS quantite INTEGER DEFAULT 1;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS acompte_paye NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS prix_total NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS date_echeance TIMESTAMPTZ;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'active';
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 12. commandes_en_ligne
ALTER TABLE public.commandes_en_ligne ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.commandes_en_ligne ADD COLUMN IF NOT EXISTS numero_commande TEXT DEFAULT 'CMD-000';
ALTER TABLE public.commandes_en_ligne ADD COLUMN IF NOT EXISTS client_nom TEXT DEFAULT 'Client';
ALTER TABLE public.commandes_en_ligne ADD COLUMN IF NOT EXISTS client_telephone TEXT DEFAULT '';
ALTER TABLE public.commandes_en_ligne ADD COLUMN IF NOT EXISTS adresse_livraison TEXT;
ALTER TABLE public.commandes_en_ligne ADD COLUMN IF NOT EXISTS articles_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.commandes_en_ligne ADD COLUMN IF NOT EXISTS total NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.commandes_en_ligne ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'en_attente';
ALTER TABLE public.commandes_en_ligne ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 13. charges
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS titre TEXT DEFAULT 'Charge';
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS categorie TEXT DEFAULT 'Divers';
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS montant NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS auteur_nom TEXT DEFAULT 'Système';
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 14. clotures_journalieres
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS date_cloture DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS total_ventes_especes NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS total_ventes_mobile NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS total_recouvrement_credits NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS total_charges NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS fond_caisse_fermeture NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS ecart_caisse NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS auteur_nom TEXT DEFAULT 'Système';
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS figee BOOLEAN DEFAULT true;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 15. journal_audit
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'action';
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL;
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS article_nom TEXT;
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS quantite_avant INTEGER;
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS quantite_apres INTEGER;
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS variation_quantite INTEGER;
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS motif TEXT DEFAULT 'Log système';
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS auteur_nom TEXT DEFAULT 'Système';
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS auteur_role TEXT DEFAULT 'utilisateur';
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 16. abonnements
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS palier TEXT DEFAULT 'Essentiel';
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS prix_mensuel NUMERIC(12,2) DEFAULT 15000.00;
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS date_debut TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS date_expiration TIMESTAMPTZ DEFAULT (now() + interval '30 days');
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'actif';
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 17. paiements_abonnement
ALTER TABLE public.paiements_abonnement ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.paiements_abonnement ADD COLUMN IF NOT EXISTS montant NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.paiements_abonnement ADD COLUMN IF NOT EXISTS mode_paiement TEXT DEFAULT 'orange_money';
ALTER TABLE public.paiements_abonnement ADD COLUMN IF NOT EXISTS reference_transaction TEXT;
ALTER TABLE public.paiements_abonnement ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'en_attente';
ALTER TABLE public.paiements_abonnement ADD COLUMN IF NOT EXISTS valide_par_superadmin_id UUID REFERENCES auth.users(id);
ALTER TABLE public.paiements_abonnement ADD COLUMN IF NOT EXISTS valide_le TIMESTAMPTZ;
ALTER TABLE public.paiements_abonnement ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 18. parametres_plateforme
ALTER TABLE public.parametres_plateforme ADD COLUMN IF NOT EXISTS cle TEXT;
ALTER TABLE public.parametres_plateforme ADD COLUMN IF NOT EXISTS valeur_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.parametres_plateforme ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.parametres_plateforme ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ==============================================================================
-- 4. VUE SÉCURISÉE DE STOCK CALCULÉ (security_invoker = true)
-- ==============================================================================
DROP VIEW IF EXISTS public.vue_stock_articles CASCADE;
CREATE OR REPLACE VIEW public.vue_stock_articles WITH (security_invoker = true) AS
SELECT 
    a.id AS article_id,
    a.activite_id,
    a.nom,
    a.categorie,
    a.code_unique,
    a.prix_vente,
    a.mode_suivi,
    a.seuil_alerte,
    COALESCE(SUM(m.quantite), 0) AS stock_actuel,
    a.actif,
    a.created_at
FROM public.articles a
LEFT JOIN public.mouvements_stock m ON a.id = m.article_id
GROUP BY a.id, a.activite_id, a.nom, a.categorie, a.code_unique, a.prix_vente, a.mode_suivi, a.seuil_alerte, a.actif, a.created_at;

-- ==============================================================================
-- 5. FONCTIONS SÉCURITÉ & VÉRIFICATION DES RÔLES (HELPER FUNCTIONS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.est_membre_activite(p_activite_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_activite_id IS NULL THEN RETURN true; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.activites WHERE id = p_activite_id AND proprietaire_id = auth.uid()
        UNION
        SELECT 1 FROM public.membres WHERE activite_id = p_activite_id AND user_id = auth.uid() AND actif = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.est_patron_activite(p_activite_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_activite_id IS NULL THEN RETURN true; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.activites WHERE id = p_activite_id AND proprietaire_id = auth.uid()
        UNION
        SELECT 1 FROM public.membres WHERE activite_id = p_activite_id AND user_id = auth.uid() AND role = 'patron' AND actif = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.est_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean,
        (auth.jwt() ->> 'email') = 'admin@oeko.cm',
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. ACTIVATION RLS (ROW LEVEL SECURITY) SUR TOUTES LES TABLES
-- ==============================================================================
ALTER TABLE public.activites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couts_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mouvements_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lignes_vente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commandes_en_ligne ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clotures_journalieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements_abonnement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametres_plateforme ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 7. STRATÉGIES RLS (POLICIES)
-- ==============================================================================

-- 1. activites
DROP POLICY IF EXISTS "Lecture activites" ON public.activites;
CREATE POLICY "Lecture activites" ON public.activites
    FOR SELECT USING (public.est_membre_activite(id) OR public.est_super_admin());

DROP POLICY IF EXISTS "Insertion activites" ON public.activites;
CREATE POLICY "Insertion activites" ON public.activites
    FOR INSERT WITH CHECK (auth.uid() = proprietaire_id OR proprietaire_id IS NOT NULL);

DROP POLICY IF EXISTS "Modification activites" ON public.activites;
CREATE POLICY "Modification activites" ON public.activites
    FOR UPDATE USING (public.est_patron_activite(id) OR public.est_super_admin());

-- 2. membres
DROP POLICY IF EXISTS "Accès membres" ON public.membres;
CREATE POLICY "Accès membres" ON public.membres
    FOR ALL USING (public.est_membre_activite(activite_id));

-- 3. articles
DROP POLICY IF EXISTS "Accès articles" ON public.articles;
CREATE POLICY "Accès articles" ON public.articles
    FOR ALL USING (public.est_membre_activite(activite_id));

-- 4. couts_articles (RÉSERVÉ EXCLUSIVEMENT AU PATRON)
DROP POLICY IF EXISTS "Accès coût d'achat patron seul" ON public.couts_articles;
CREATE POLICY "Accès coût d'achat patron seul" ON public.couts_articles
    FOR ALL USING (public.est_patron_activite(activite_id));

-- 5. mouvements_stock
DROP POLICY IF EXISTS "Accès mouvements" ON public.mouvements_stock;
CREATE POLICY "Accès mouvements" ON public.mouvements_stock
    FOR ALL USING (public.est_membre_activite(activite_id));

-- 6. receptions
DROP POLICY IF EXISTS "Accès réceptions" ON public.receptions;
CREATE POLICY "Accès réceptions" ON public.receptions
    FOR ALL USING (public.est_membre_activite(activite_id));

-- 7. clients
DROP POLICY IF EXISTS "Accès clients" ON public.clients;
CREATE POLICY "Accès clients" ON public.clients
    FOR ALL USING (public.est_membre_activite(activite_id));

-- 8. ventes & lignes_vente
DROP POLICY IF EXISTS "Accès ventes" ON public.ventes;
CREATE POLICY "Accès ventes" ON public.ventes
    FOR ALL USING (public.est_membre_activite(activite_id));

DROP POLICY IF EXISTS "Accès lignes de vente" ON public.lignes_vente;
CREATE POLICY "Accès lignes de vente" ON public.lignes_vente
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.ventes v WHERE v.id = vente_id AND public.est_membre_activite(v.activite_id))
    );

-- 9. creances
DROP POLICY IF EXISTS "Accès créances" ON public.creances;
CREATE POLICY "Accès créances" ON public.creances
    FOR ALL USING (public.est_membre_activite(activite_id));

-- 10. reservations
DROP POLICY IF EXISTS "Accès réservations" ON public.reservations;
CREATE POLICY "Accès réservations" ON public.reservations
    FOR ALL USING (public.est_membre_activite(activite_id));

-- 11. commandes_en_ligne
DROP POLICY IF EXISTS "Accès commandes en ligne" ON public.commandes_en_ligne;
CREATE POLICY "Accès commandes en ligne" ON public.commandes_en_ligne
    FOR ALL USING (public.est_membre_activite(activite_id));

-- 12. charges
DROP POLICY IF EXISTS "Accès charges" ON public.charges;
CREATE POLICY "Accès charges" ON public.charges
    FOR ALL USING (public.est_membre_activite(activite_id));

-- 13. clotures_journalieres
DROP POLICY IF EXISTS "Lecture clôtures" ON public.clotures_journalieres;
CREATE POLICY "Lecture clôtures" ON public.clotures_journalieres
    FOR SELECT USING (public.est_membre_activite(activite_id));

DROP POLICY IF EXISTS "Création clôtures" ON public.clotures_journalieres;
CREATE POLICY "Création clôtures" ON public.clotures_journalieres
    FOR INSERT WITH CHECK (public.est_membre_activite(activite_id));

-- 14. journal_audit (IMMUABLE : LECTURE + CRÉATION UNIQUEMENT)
DROP POLICY IF EXISTS "Lecture journal d'audit" ON public.journal_audit;
CREATE POLICY "Lecture journal d'audit" ON public.journal_audit
    FOR SELECT USING (public.est_membre_activite(activite_id));

DROP POLICY IF EXISTS "Ajout journal d'audit" ON public.journal_audit;
CREATE POLICY "Ajout journal d'audit" ON public.journal_audit
    FOR INSERT WITH CHECK (public.est_membre_activite(activite_id));

-- 15. TABLES SUPER-ADMIN
DROP POLICY IF EXISTS "Accès superadmin abonnements" ON public.abonnements;
CREATE POLICY "Accès superadmin abonnements" ON public.abonnements
    FOR ALL USING (public.est_super_admin() OR public.est_patron_activite(activite_id));

DROP POLICY IF EXISTS "Accès superadmin paiements" ON public.paiements_abonnement;
CREATE POLICY "Accès superadmin paiements" ON public.paiements_abonnement
    FOR ALL USING (public.est_super_admin() OR public.est_patron_activite(activite_id));

DROP POLICY IF EXISTS "Accès superadmin parametres" ON public.parametres_plateforme;
CREATE POLICY "Accès superadmin parametres" ON public.parametres_plateforme
    FOR ALL USING (public.est_super_admin());
