-- ====================================================================
-- CEKO SYSTEM - SÉCURITÉ PRIX D'ACHAT & ROW LEVEL SECURITY (RLS)
-- Protection absolue du Prix d'Achat (PA) contre l'accès par les Employés
-- ====================================================================

-- 1. Table isolée pour le stockage des prix d'achat (Séparation stricte)
CREATE TABLE IF NOT EXISTS public.produit_prix_achat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produit_id VARCHAR(255) NOT NULL,
    etablissement_id VARCHAR(255) NOT NULL,
    prix_achat_unitaire NUMERIC DEFAULT 0,
    prix_achat_casier NUMERIC DEFAULT 0,
    cout_achat_unitaire_cmp NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_produit FOREIGN KEY (produit_id) REFERENCES public.produits(id) ON DELETE CASCADE
);

-- 2. Activation de la sécurité au niveau des lignes (Row Level Security - RLS)
ALTER TABLE public.produit_prix_achat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;

-- 3. Politique RLS : Seul le rôle PATRON peut interroger ou modifier la table des prix d'achat
DROP POLICY IF EXISTS "Prix Achat Visible Uniquement Par Patron" ON public.produit_prix_achat;
CREATE POLICY "Prix Achat Visible Uniquement Par Patron"
ON public.produit_prix_achat
FOR ALL
TO authenticated, anon
USING (
    coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '') IN ('Patron', 'Patronne', 'Directeur', 'Gerant')
    OR current_setting('request.headers', true)::json ->> 'x-user-role' IN ('Patron', 'Patronne', 'Directeur', 'Gerant')
);

-- 4. Vue sécurisée publique pour l'Employé (Exclusion stricte des colonnes de prix d'achat)
CREATE OR REPLACE VIEW public.v_produits_employe AS
SELECT 
    p.id,
    p.etablissement_id,
    p.nom,
    p.categorie,
    p.oko_code,
    p.unite,
    p.mode_suivi,
    p.quantite_totale,
    p.seuil_alerte,
    p.prix_vente_unitaire,
    p.prix_vente_bouteille,
    p.variantes,
    p.exemplaires,
    p.prix_achat_statut,
    p.statut_validation_patron,
    p.actif,
    p.created_at
FROM public.produits p;

-- Octroyer les droits de lecture sur la vue pour les utilisateurs de l'app
GRANT SELECT ON public.v_produits_employe TO authenticated, anon;
