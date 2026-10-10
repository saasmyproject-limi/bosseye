-- ==============================================================================
-- SCRIPT SQL IDEMPOTENT ET BLINDÉ - ŒKO BOUTIQUE (SUPABASE BACKEND V2)
-- Exécuter ce script dans le SQL Editor de Supabase (Projet: "oeko")
-- ==============================================================================

-- Activation de l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABLE : activites
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proprietaire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type_activite TEXT NOT NULL DEFAULT 'boutique',
    secteur TEXT DEFAULT 'Vêtements & Mode',
    nom TEXT NOT NULL,
    abbreviation_code TEXT NOT NULL,
    ville TEXT DEFAULT 'Douala',
    adresse TEXT,
    telephone TEXT,
    palier TEXT NOT NULL DEFAULT 'Essentiel', -- 'Essentiel', 'Standard', 'Pro'
    statut_abonnement TEXT NOT NULL DEFAULT 'essai', -- 'essai', 'actif', 'expiré', 'en_attente'
    fin_essai TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
    acces_bloque BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 2. TABLE : membres
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.membres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nom TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employe', -- 'patron', 'employe', 'comptable'
    pin_hash TEXT,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. TABLE : articles
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    categorie TEXT DEFAULT 'Général',
    attributs_variables JSONB DEFAULT '{}'::jsonb,
    code_unique TEXT NOT NULL,
    prix_vente NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    mode_suivi TEXT NOT NULL DEFAULT 'quantite',
    seuil_alerte INTEGER DEFAULT 5,
    image_url TEXT,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 4. TABLE : couts_articles
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.couts_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    prix_achat NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fournisseur_nom TEXT,
    fournisseur_recu_photo TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 5. TABLE : mouvements_stock
-- ==============================================================================
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

-- ==============================================================================
-- 6. TABLE : receptions
-- ==============================================================================
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

-- ==============================================================================
-- 7. TABLE : clients
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    telephone TEXT,
    adresse TEXT,
    solde_dette NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 8. TABLE : ventes
-- ==============================================================================
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

-- ==============================================================================
-- 9. TABLE : lignes_vente
-- ==============================================================================
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

-- ==============================================================================
-- 10. TABLE : creances
-- ==============================================================================
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

-- ==============================================================================
-- 11. TABLE : reservations
-- ==============================================================================
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

-- ==============================================================================
-- 12. TABLE : commandes_en_ligne
-- ==============================================================================
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

-- ==============================================================================
-- 13. TABLE : charges
-- ==============================================================================
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

-- ==============================================================================
-- 14. TABLE : clotures_journalieres
-- ==============================================================================
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

-- ==============================================================================
-- 15. TABLE : journal_audit
-- ==============================================================================
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

-- ==============================================================================
-- 16. TABLES SUPER-ADMIN : abonnements, paiements_abonnement, parametres_plateforme
-- ==============================================================================
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
-- BLINDAGE RÉTROCOMPATIBILITÉ : GARANTIR LA PRÉSENCE DE LA COLONNE activite_id
-- ==============================================================================
ALTER TABLE public.membres ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.couts_articles ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.mouvements_stock ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.mouvements_stock ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.creances ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.commandes_en_ligne ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.clotures_journalieres ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.journal_audit ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;
ALTER TABLE public.paiements_abonnement ADD COLUMN IF NOT EXISTS activite_id UUID REFERENCES public.activites(id) ON DELETE CASCADE;

-- ==============================================================================
-- VUE SÉCURISÉE DE STOCK CALCULÉ (security_invoker = true)
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
-- FONCTIONS SÉCURITÉ & VÉRIFICATION DES RÔLES (HELPER FUNCTIONS)
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
-- ACTIVATION RLS (ROW LEVEL SECURITY) SUR TOUTES LES TABLES
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
-- STRATÉGIES RLS (POLICIES)
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
