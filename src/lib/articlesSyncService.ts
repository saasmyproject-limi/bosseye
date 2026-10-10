import { supabase } from './supabase';
import { offlineDB } from './offlineDB';
import { Produit } from '@/types';
import { syncEngine } from './supabaseSyncEngine';

export async function fetchArticlesFromCloud(activiteId: string): Promise<{
  success: boolean;
  produits: Produit[];
  error?: string;
}> {
  try {
    if (!activiteId) {
      return { success: true, produits: offlineDB.getProduits() };
    }

    // 1. Lire les articles
    const { data: artData, error: artErr } = await supabase
      .from('articles')
      .select('*')
      .eq('activite_id', activiteId)
      .eq('actif', true)
      .order('created_at', { ascending: false });

    if (artErr) throw artErr;

    // 2. Lire les mouvements de stock pour calculer le stock réel
    const { data: mvtData, error: mvtErr } = await supabase
      .from('mouvements_stock')
      .select('article_id, quantite')
      .eq('activite_id', activiteId);

    if (mvtErr) console.warn('[ArticlesSyncService] Notice mvt fetch:', mvtErr.message);

    // 3. Tenter de lire les coûts d'achat (accessible uniquement si RLS Patron autorise)
    let coutsMap: Record<string, { prix_achat: number; fournisseur?: string }> = {};
    try {
      const { data: coutsData } = await supabase
        .from('couts_articles')
        .select('*')
        .eq('activite_id', activiteId);

      if (coutsData) {
        coutsData.forEach((c: any) => {
          coutsMap[c.article_id] = {
            prix_achat: Number(c.prix_achat) || 0,
            fournisseur: c.fournisseur_nom,
          };
        });
      }
    } catch (e) {
      // RLS a bloqué l'accès car l'utilisateur est un employé : coutsMap reste vide
    }

    // 4. Calculer le stock cumulé par article à partir des mouvements
    const stockMap: Record<string, number> = {};
    (mvtData || []).forEach((m: any) => {
      stockMap[m.article_id] = (stockMap[m.article_id] || 0) + (m.quantite || 0);
    });

    const produitsMapped: Produit[] = (artData || []).map((a: any) => {
      const calculatedStock = stockMap[a.id] !== undefined ? stockMap[a.id] : 0;
      const coutInfo = coutsMap[a.id];

      return {
        id: a.id,
        etablissement_id: a.activite_id,
        nom: a.nom,
        categorie: a.categorie || 'Général',
        code_barres: a.code_unique,
        code_interne: a.code_unique,
        prix_vente: Number(a.prix_vente) || 0,
        prix_achat: coutInfo ? coutInfo.prix_achat : 0, // Masqué pour les employés
        stock: calculatedStock,
        quantite_totale: calculatedStock,
        seuil_alerte: a.seuil_alerte || 5,
        unite: a.mode_suivi === 'unite' ? 'unite' : 'piece',
        actif: a.actif !== false,
        prix_achat_statut: coutInfo && coutInfo.prix_achat > 0 ? 'complet' : 'prix_achat_a_completer',
      };
    });

    // Mettre à jour le cache local
    offlineDB.saveProduits(produitsMapped);

    return { success: true, produits: produitsMapped };
  } catch (err: any) {
    console.error('[ArticlesSyncService] Erreur fetchArticlesFromCloud:', err);
    return {
      success: false,
      produits: offlineDB.getProduits().filter((p) => !p.etablissement_id || p.etablissement_id === activiteId),
      error: 'Impossible de joindre le serveur pour charger le stock.',
    };
  }
}

export async function saveArticleToCloud(
  article: Produit,
  prixAchat?: number,
  fournisseurNom?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const activiteId = article.etablissement_id || offlineDB.getEtablissement()?.id;
    if (!activiteId) return { success: false, error: 'Aucun commerce actif' };

    const articlePayload = {
      id: article.id,
      activite_id: activiteId,
      nom: article.nom,
      categorie: article.categorie || 'Général',
      code_unique: article.oko_code || (article as any).code_barres || (article as any).code_interne || `ART-${Date.now().toString().slice(-6)}`,
      prix_vente: article.prix_vente || 0,
      mode_suivi: article.unite === 'unite' ? 'unite' : 'quantite',
      seuil_alerte: article.seuil_alerte || 5,
      actif: article.actif !== false,
      updated_at: new Date().toISOString(),
    };

    // 1. Mettre à jour le cache local
    const all = offlineDB.getProduits();
    const idx = all.findIndex((p) => p.id === article.id);
    if (idx >= 0) all[idx] = article;
    else all.push(article);
    offlineDB.saveProduits(all);

    // 2. Enfiler l'article dans la queue de synchro Supabase
    syncEngine.enqueue('articles', 'upsert', articlePayload);

    // 3. Si un prix d'achat a été renseigné (saisie patron), sauvegarder séparément dans couts_articles
    if (prixAchat !== undefined && prixAchat > 0) {
      const coutPayload = {
        article_id: article.id,
        activite_id: activiteId,
        prix_achat: prixAchat,
        fournisseur_nom: fournisseurNom || null,
        updated_at: new Date().toISOString(),
      };
      syncEngine.enqueue('couts_articles', 'upsert', coutPayload);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[ArticlesSyncService] Exception saveArticleToCloud:', err);
    return { success: false, error: err?.message || 'Erreur d\'enregistrement de l\'article' };
  }
}

export async function recordStockMouvementToCloud(params: {
  activiteId: string;
  articleId: string;
  typeMouvement: 'entree' | 'vente' | 'ajustement' | 'retour';
  quantite: number;
  motif?: string;
  auteurNom: string;
  quantiteAvant?: number;
  quantiteApres?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const mouvementId = `mvt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const mouvementPayload = {
      id: mouvementId,
      activite_id: params.activiteId,
      article_id: params.articleId,
      type_mouvement: params.typeMouvement,
      quantite: params.quantite,
      motif: params.motif || 'Mouvement de stock',
      auteur_nom: params.auteurNom,
      created_at: new Date().toISOString(),
    };

    // Enfiler le mouvement de stock
    syncEngine.enqueue('mouvements_stock', 'insert', mouvementPayload);

    // Enfiler également dans le journal_audit (IMMUABLE)
    const auditPayload = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      activite_id: params.activiteId,
      action_type: params.typeMouvement,
      article_id: params.articleId,
      quantite_avant: params.quantiteAvant || 0,
      quantite_apres: params.quantiteApres || 0,
      variation_quantite: params.quantite,
      motif: params.motif || 'Mouvement de stock',
      auteur_nom: params.auteurNom,
      auteur_role: 'utilisateur',
      created_at: new Date().toISOString(),
    };
    syncEngine.enqueue('journal_audit', 'insert', auditPayload);

    return { success: true };
  } catch (err: any) {
    console.error('[ArticlesSyncService] Exception recordStockMouvementToCloud:', err);
    return { success: false, error: err?.message || 'Erreur d\'enregistrement du mouvement' };
  }
}
