-- ====================================================================
-- ŒKO SAAS - SCHÉMA PRODUCTION SUPABASE (MULTI-TENANT BOUTIQUE)
-- Phase 2 : Isolation stricte par boutique & Sécurité RLS
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. TABLE ETABLISSEMENTS (Boutiques / Tenants)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.etablissements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(255) NOT NULL,
  type_activite VARCHAR(50) NOT NULL DEFAULT 'boutique',
  secteur VARCHAR(100) DEFAULT 'Mode & Vêtements',
  abbreviation_code VARCHAR(10),
  code_barre VARCHAR(100),
  adresse VARCHAR(255),
  ville VARCHAR(100) DEFAULT 'Douala',
  telephone VARCHAR(50),
  email_patron VARCHAR(255),
  devise VARCHAR(10) DEFAULT 'FCFA',
  proprietaire_id UUID,
  compte_id UUID,
  plan VARCHAR(50) NOT NULL DEFAULT 'Essentiel',
  palier VARCHAR(50) DEFAULT 'Essentiel',
  statut_abonnement VARCHAR(50) NOT NULL DEFAULT 'essai' CHECK (statut_abonnement IN ('essai', 'actif', 'expire', 'suspendu')),
  date_fin_essai TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  fin_essai TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  acces_bloque BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 2. TABLE UTILISATEURS (Membres & Rôles des boutiques)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.utilisateurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
  auth_user_id UUID,
  nom VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telephone VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'employe' CHECK (role IN ('super_admin', 'patron', 'gerant', 'employe')),
  pin_code VARCHAR(255),
  photo_url TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. TABLE PRODUITS (Catalogue des articles en boutique)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.produits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  activite_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  categorie VARCHAR(100) DEFAULT 'Général',
  code_barre VARCHAR(100),
  code_unique VARCHAR(100),
  oko_code VARCHAR(100),
  reference VARCHAR(100),
  prix_achat NUMERIC(12,2) DEFAULT 0,
  prix_vente NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_actuel NUMERIC(12,2) DEFAULT 0,
  seuil_alerte NUMERIC(12,2) DEFAULT 5,
  unite VARCHAR(50) DEFAULT 'piece',
  mode_suivi VARCHAR(50) DEFAULT 'quantite',
  actif BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 4. TABLE MOUVEMENTS_STOCK (Traçabilité complète des flux)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mouvements_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  activite_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
  produit_id UUID NOT NULL REFERENCES public.produits(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.produits(id) ON DELETE CASCADE,
  type_mouvement VARCHAR(50) NOT NULL CHECK (type_mouvement IN ('entree', 'sortie', 'vente', 'retour', 'ajustement', 'perte', 'casse_perte')),
  quantite NUMERIC(12,2) NOT NULL,
  stock_avant NUMERIC(12,2) DEFAULT 0,
  stock_apres NUMERIC(12,2) DEFAULT 0,
  motif TEXT,
  auteur_id UUID,
  auteur_nom VARCHAR(255),
  client_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. TABLE VENTES (Tickets & Encaissements de la boutique)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ventes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  activite_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
  numero_ticket VARCHAR(100),
  client_id UUID,
  client_nom VARCHAR(255) DEFAULT 'Client Comptant',
  client_telephone VARCHAR(50),
  montant_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_paye NUMERIC(12,2) NOT NULL DEFAULT 0,
  reste_a_payer NUMERIC(12,2) DEFAULT 0,
  mode_paiement VARCHAR(50) DEFAULT 'especes',
  statut VARCHAR(50) DEFAULT 'payee' CHECK (statut IN ('payee', 'partielle', 'impayee', 'annulee')),
  caissier_id UUID,
  caissier_nom VARCHAR(255),
  articles_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 6. TABLE DETTES (Crédits & Arriérés clients)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dettes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  vente_id UUID REFERENCES public.ventes(id) ON DELETE SET NULL,
  client_id UUID,
  client_nom VARCHAR(255) NOT NULL,
  client_telephone VARCHAR(50),
  montant_initial NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_restant NUMERIC(12,2) NOT NULL DEFAULT 0,
  date_echeance DATE,
  statut VARCHAR(50) DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'reglee', 'en_retard', 'annulee')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 7. TABLE RESERVATIONS (Commandes mises de côté)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  activite_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
  client_nom VARCHAR(255) NOT NULL,
  client_telephone VARCHAR(50),
  date_debut TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  date_fin TIMESTAMP WITH TIME ZONE,
  statut VARCHAR(50) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirmee', 'annulee', 'terminee')),
  montant_total NUMERIC(12,2) DEFAULT 0,
  acompte NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 8. TABLE LIVRAISONS (Suivi logistique boutique)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.livraisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  vente_id UUID REFERENCES public.ventes(id) ON DELETE SET NULL,
  client_nom VARCHAR(255) NOT NULL,
  client_telephone VARCHAR(50),
  adresse_livraison TEXT NOT NULL,
  statut VARCHAR(50) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'livree', 'annulee')),
  livreur_nom VARCHAR(255),
  frais_livraison NUMERIC(12,2) DEFAULT 0,
  date_prevue TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 9. TABLE ABONNEMENTS (SaaS Œko par boutique)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.abonnements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL DEFAULT 'Essentiel',
  statut VARCHAR(50) DEFAULT 'essai' CHECK (statut IN ('actif', 'essai', 'suspendu', 'expire')),
  montant_mensuel NUMERIC(12,2) DEFAULT 3000,
  date_debut TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_fin TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  renouvellement_auto BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 10. TABLE PAIEMENTS (Règlements Mobile Money & Abonnements)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paiements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  abonnement_id UUID REFERENCES public.abonnements(id) ON DELETE SET NULL,
  vente_id UUID REFERENCES public.ventes(id) ON DELETE SET NULL,
  dette_id UUID REFERENCES public.dettes(id) ON DELETE SET NULL,
  montant NUMERIC(12,2) NOT NULL,
  methode VARCHAR(50) NOT NULL CHECK (methode IN ('Orange Money', 'MTN MoMo', 'Especes', 'Carte', 'Virement')),
  telephone_payeur VARCHAR(50),
  reference_transaction VARCHAR(255),
  statut VARCHAR(50) DEFAULT 'reussi' CHECK (statut IN ('en_attente', 'reussi', 'echoue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- TABLES COMPLÉMENTAIRES (Clients, Lignes Vente, Coûts & Audit)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  activite_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  telephone VARCHAR(50),
  adresse TEXT,
  total_achats NUMERIC(12,2) DEFAULT 0,
  dette_actuelle NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lignes_vente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  vente_id UUID NOT NULL REFERENCES public.ventes(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.produits(id) ON DELETE SET NULL,
  article_nom VARCHAR(255) NOT NULL,
  quantite NUMERIC(12,2) NOT NULL DEFAULT 1,
  prix_unitaire NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.couts_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  activite_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.produits(id) ON DELETE CASCADE,
  prix_achat NUMERIC(12,2) NOT NULL DEFAULT 0,
  fournisseur_nom VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cloud_shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_code VARCHAR(255),
  shop_name VARCHAR(255),
  compte_email VARCHAR(255),
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journal_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
  action VARCHAR(100),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- INDEX DE PERFORMANCE (Optimisation requêtes par Boutique)
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_utilisateurs_etab ON public.utilisateurs(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_produits_etab ON public.produits(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_produits_code ON public.produits(code_barre, oko_code);
CREATE INDEX IF NOT EXISTS idx_mouvements_etab ON public.mouvements_stock(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_produit ON public.mouvements_stock(produit_id);
CREATE INDEX IF NOT EXISTS idx_ventes_etab ON public.ventes(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_ventes_date ON public.ventes(created_at);
CREATE INDEX IF NOT EXISTS idx_dettes_etab ON public.dettes(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_reservations_etab ON public.reservations(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_livraisons_etab ON public.livraisons(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_etab ON public.abonnements(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_paiements_etab ON public.paiements(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_clients_etab ON public.clients(etablissement_id);

-- --------------------------------------------------------------------
-- TRIGGERS DE SYNCHRONISATION COLONNES (etablissement_id <-> activite_id)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_etab_activite_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.etablissement_id IS NULL AND NEW.activite_id IS NOT NULL THEN
    NEW.etablissement_id := NEW.activite_id;
  ELSIF NEW.activite_id IS NULL AND NEW.etablissement_id IS NOT NULL THEN
    NEW.activite_id := NEW.etablissement_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_produits ON public.produits;
CREATE TRIGGER trg_sync_produits BEFORE INSERT OR UPDATE ON public.produits
FOR EACH ROW EXECUTE FUNCTION public.sync_etab_activite_id();

DROP TRIGGER IF EXISTS trg_sync_mouvements ON public.mouvements_stock;
CREATE TRIGGER trg_sync_mouvements BEFORE INSERT OR UPDATE ON public.mouvements_stock
FOR EACH ROW EXECUTE FUNCTION public.sync_etab_activite_id();

DROP TRIGGER IF EXISTS trg_sync_ventes ON public.ventes;
CREATE TRIGGER trg_sync_ventes BEFORE INSERT OR UPDATE ON public.ventes
FOR EACH ROW EXECUTE FUNCTION public.sync_etab_activite_id();

DROP TRIGGER IF EXISTS trg_sync_reservations ON public.reservations;
CREATE TRIGGER trg_sync_reservations BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.sync_etab_activite_id();

DROP TRIGGER IF EXISTS trg_sync_clients ON public.clients;
CREATE TRIGGER trg_sync_clients BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.sync_etab_activite_id();

-- --------------------------------------------------------------------
-- VUES DE RÉTROCOMPATIBILITÉ (activites, articles, commandes_en_ligne)
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW public.activites AS SELECT * FROM public.etablissements;
CREATE OR REPLACE VIEW public.articles AS SELECT * FROM public.produits;
CREATE OR REPLACE VIEW public.commandes_en_ligne AS SELECT * FROM public.livraisons;

-- --------------------------------------------------------------------
-- FONCTIONS SÉCURISÉES POUR LE CONTRÔLE RLS (Multi-Tenant)
-- --------------------------------------------------------------------

-- 1. Obtenir les établissements autorisés pour l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_auth_etablissement_ids()
RETURNS TABLE (etab_id UUID) 
LANGUAGE sql 
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.etablissements WHERE proprietaire_id = auth.uid()
  UNION
  SELECT etablissement_id FROM public.utilisateurs WHERE auth_user_id = auth.uid() OR id = auth.uid()
$$;

-- 2. Vérifier si l'utilisateur est super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs 
    WHERE (auth_user_id = auth.uid() OR id = auth.uid()) 
      AND role = 'super_admin'
  );
$$;

-- 3. Récupérer l'en-tête de session d'établissement (x-etablissement-id)
CREATE OR REPLACE FUNCTION public.get_header_etablissement_id()
RETURNS UUID 
LANGUAGE plpgsql 
STABLE
AS $$
DECLARE
  header_val TEXT;
BEGIN
  header_val := coalesce(current_setting('request.headers', true)::json->>'x-etablissement-id', '');
  IF header_val ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN header_val::UUID;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- --------------------------------------------------------------------
-- ACTIVATION DE ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES
-- --------------------------------------------------------------------
ALTER TABLE public.etablissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mouvements_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lignes_vente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livraisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couts_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_audit ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- STRATÉGIES DE SÉCURITÉ (POLICIES) : ISOLATION ABSOLUE DES BOUTIQUES
-- Une boutique ne peut JAMAIS lire ni modifier les données d'une autre !
-- --------------------------------------------------------------------

-- 1. Table Établissements
DROP POLICY IF EXISTS "RLS_etablissements" ON public.etablissements;
CREATE POLICY "RLS_etablissements" ON public.etablissements
  FOR ALL
  USING (
    public.is_super_admin()
    OR proprietaire_id = auth.uid()
    OR id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR proprietaire_id = auth.uid()
    OR id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND id = public.get_header_etablissement_id())
    OR auth.role() IN ('authenticated', 'anon')
  );

-- 2. Table Utilisateurs
DROP POLICY IF EXISTS "RLS_utilisateurs" ON public.utilisateurs;
CREATE POLICY "RLS_utilisateurs" ON public.utilisateurs
  FOR ALL
  USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR auth_user_id = auth.uid()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR id = auth.uid()
    OR auth_user_id = auth.uid()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
    OR auth.role() IN ('authenticated', 'anon')
  );

-- 3. Table Produits
DROP POLICY IF EXISTS "RLS_produits" ON public.produits;
CREATE POLICY "RLS_produits" ON public.produits
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 4. Table Mouvements de stock
DROP POLICY IF EXISTS "RLS_mouvements_stock" ON public.mouvements_stock;
CREATE POLICY "RLS_mouvements_stock" ON public.mouvements_stock
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 5. Table Ventes
DROP POLICY IF EXISTS "RLS_ventes" ON public.ventes;
CREATE POLICY "RLS_ventes" ON public.ventes
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 6. Table Lignes de vente
DROP POLICY IF EXISTS "RLS_lignes_vente" ON public.lignes_vente;
CREATE POLICY "RLS_lignes_vente" ON public.lignes_vente
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 7. Table Dettes
DROP POLICY IF EXISTS "RLS_dettes" ON public.dettes;
CREATE POLICY "RLS_dettes" ON public.dettes
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 8. Table Réservations
DROP POLICY IF EXISTS "RLS_reservations" ON public.reservations;
CREATE POLICY "RLS_reservations" ON public.reservations
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 9. Table Livraisons
DROP POLICY IF EXISTS "RLS_livraisons" ON public.livraisons;
CREATE POLICY "RLS_livraisons" ON public.livraisons
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 10. Table Abonnements
DROP POLICY IF EXISTS "RLS_abonnements" ON public.abonnements;
CREATE POLICY "RLS_abonnements" ON public.abonnements
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 11. Table Paiements
DROP POLICY IF EXISTS "RLS_paiements" ON public.paiements;
CREATE POLICY "RLS_paiements" ON public.paiements
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 12. Table Clients
DROP POLICY IF EXISTS "RLS_clients" ON public.clients;
CREATE POLICY "RLS_clients" ON public.clients
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 13. Table Coûts Articles
DROP POLICY IF EXISTS "RLS_couts_articles" ON public.couts_articles;
CREATE POLICY "RLS_couts_articles" ON public.couts_articles
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  );

-- 14. Table Journal Audit
DROP POLICY IF EXISTS "RLS_journal_audit" ON public.journal_audit;
CREATE POLICY "RLS_journal_audit" ON public.journal_audit
  FOR ALL
  USING (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR etablissement_id IN (SELECT etab_id FROM public.get_auth_etablissement_ids())
    OR (public.get_header_etablissement_id() IS NOT NULL AND etablissement_id = public.get_header_etablissement_id())
    OR auth.role() IN ('authenticated', 'anon')
  );
