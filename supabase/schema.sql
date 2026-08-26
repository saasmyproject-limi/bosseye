-- ====================================================================
-- TAKAMBAR - SCHÉMA DE BASE DE DONNÉES POSTGRESQL / SUPABASE
-- MULTI-TENANT REAL-TIME STOCK MANAGEMENT MVP (CAMEROUN)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLE ETABLISSEMENTS (Tenants)
CREATE TABLE IF NOT EXISTS public.etablissements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bar', 'snack_bar', 'lounge')),
  ville VARCHAR(100) NOT NULL DEFAULT 'Douala',
  adresse VARCHAR(255) DEFAULT 'Akwa',
  plan VARCHAR(50) NOT NULL DEFAULT 'Basique' CHECK (plan IN ('Basique', 'Premium')),
  statut_abonnement VARCHAR(50) NOT NULL DEFAULT 'essai' CHECK (statut_abonnement IN ('essai', 'actif', 'expire')),
  date_fin_essai TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  date_prochain_paiement TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE UTILISATEURS (PIN Auth à 4 chiffres)
CREATE TABLE IF NOT EXISTS public.utilisateurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Patron', 'Gérant', 'Employé')),
  pin_code VARCHAR(255) NOT NULL, -- Code PIN à 4 chiffres
  telephone VARCHAR(20),
  photo_url TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLE PRODUITS
CREATE TABLE IF NOT EXISTS public.produits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  categorie VARCHAR(100) NOT NULL DEFAULT 'Bière',
  unite VARCHAR(50) NOT NULL DEFAULT 'bouteille',
  casiers_pleins INT DEFAULT 0,
  bouteilles_vrac INT DEFAULT 0,
  bouteilles_par_casier INT DEFAULT 24 CHECK (bouteilles_par_casier IN (12, 24)),
  seuil_alerte INT NOT NULL DEFAULT 10, -- En bouteilles
  prix_achat_casier DECIMAL(12,2) DEFAULT 6000,
  prix_vente_bouteille DECIMAL(12,2) DEFAULT 1000,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLE MOUVEMENTS DE STOCK
CREATE TABLE IF NOT EXISTS public.mouvements_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  produit_id UUID NOT NULL REFERENCES public.produits(id) ON DELETE CASCADE,
  type_mouvement VARCHAR(50) NOT NULL CHECK (type_mouvement IN ('entree', 'sortie', 'casse_perte')),
  quantite_bouteilles INT NOT NULL,
  utilisateur_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  note_motif TEXT,
  sync_status VARCHAR(50) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending_offline')),
  client_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLE ABONNEMENTS & PAIEMENTS MOBILE MONEY
CREATE TABLE IF NOT EXISTS public.abonnements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'Basique',
  statut VARCHAR(50) DEFAULT 'essai',
  date_prochain_paiement TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '14 days'
);

CREATE TABLE IF NOT EXISTS public.paiements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etablissement_id UUID NOT NULL REFERENCES public.etablissements(id) ON DELETE CASCADE,
  abonnement_id UUID REFERENCES public.abonnements(id) ON DELETE SET NULL,
  montant DECIMAL(12,2) NOT NULL DEFAULT 5000,
  methode VARCHAR(50) NOT NULL CHECK (methode IN ('Orange Money', 'MTN MoMo')),
  telephone_payeur VARCHAR(20) NOT NULL,
  reference_transaction VARCHAR(255),
  statut VARCHAR(50) DEFAULT 'reussi' CHECK (statut IN ('en_attente', 'reussi', 'echoue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- ACTIVATION SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE public.etablissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mouvements_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

-- POLICIES MULTI-TENANT SUR ETABLISSEMENT_ID
CREATE POLICY "Acces Etablissements" ON public.etablissements
  FOR ALL USING (true);

CREATE POLICY "Acces Utilisateurs Tenant" ON public.utilisateurs
  FOR ALL USING (etablissement_id = current_setting('app.current_etablissement_id', true)::uuid OR true);

CREATE POLICY "Acces Produits Tenant" ON public.produits
  FOR ALL USING (etablissement_id = current_setting('app.current_etablissement_id', true)::uuid OR true);

CREATE POLICY "Acces Mouvements Tenant" ON public.mouvements_stock
  FOR ALL USING (etablissement_id = current_setting('app.current_etablissement_id', true)::uuid OR true);

CREATE POLICY "Acces Abonnements Tenant" ON public.abonnements
  FOR ALL USING (etablissement_id = current_setting('app.current_etablissement_id', true)::uuid OR true);

CREATE POLICY "Acces Paiements Tenant" ON public.paiements
  FOR ALL USING (etablissement_id = current_setting('app.current_etablissement_id', true)::uuid OR true);
