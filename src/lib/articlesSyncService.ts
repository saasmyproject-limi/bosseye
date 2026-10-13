import { supabase } from './supabase';
import { offlineDB, generateUUID } from './offlineDB';
import { Produit } from '@/types';
import { syncEngine } from './supabaseSyncEngine';

export async function fetchArticlesFromCloud(activiteId: string): Promise<{
  success: boolean;
  produits: Produit[];
  error?: string;
}> {
  const localProds = offlineDB.getProduits().filter((p) => !p.etablissement_id || p.etablissement_id === activiteId);
  try {
    if (!activiteId) {
      return { success: true, produits: localProds };
    }

    const networkFetch = async (): Promise<{ success: boolean; produits: Produit[]; error?: string }> => {
      // 1. Lire les articles depuis la table physique produits (ou la vue articles)
      let artData: any[] | null = null;
      let artErr: any = null;

      const resProduits = await supabase
        .from('produits')
        .select('*')
        .or(`etablissement_id.eq.${activiteId},activite_id.eq.${activiteId}`)
        .eq('actif', true)
        .order('created_at', { ascending: false });

      if (resProduits.error) {
        // Fallback vue articles
        const resArticles = await supabase
          .from('articles')
          .select('*')
          .or(`etablissement_id.eq.${activiteId},activite_id.eq.${activiteId}`)
          .eq('actif', true)
          .order('created_at', { ascending: false });
        artData = resArticles.data;
        artErr = resArticles.error;
      } else {
        artData = resProduits.data;
      }

      if (artErr) throw artErr;

      // 2. Lire les mouvements de stock pour calculer le stock réel consolidé
      const { data: mvtData, error: mvtErr } = await supabase
        .from('mouvements_stock')
        .select('produit_id, article_id, quantite')
        .or(`etablissement_id.eq.${activiteId},activite_id.eq.${activiteId}`);

      if (mvtErr) console.warn('[ArticlesSyncService] Notice mvt fetch:', mvtErr.message);

      // 3. Tenter de lire les coûts d'achat (si autorisé par RLS)
      let coutsMap: Record<string, { prix_achat: number; fournisseur?: string }> = {};
      try {
        const { data: coutsData } = await supabase
          .from('couts_articles')
          .select('*')
          .or(`etablissement_id.eq.${activiteId},activite_id.eq.${activiteId}`);

        if (coutsData) {
          coutsData.forEach((c: any) => {
            const key = c.article_id || c.produit_id;
            if (key) {
              coutsMap[key] = {
                prix_achat: Number(c.prix_achat) || 0,
                fournisseur: c.fournisseur_nom,
              };
            }
          });
        }
      } catch (e) {
        // RLS a bloqué l'accès si employé : coutsMap reste vide (sécurité garantie)
      }

      // 4. Calculer le stock cumulé par article à partir des mouvements
      const stockMap: Record<string, number> = {};
      (mvtData || []).forEach((m: any) => {
        const targetId = m.produit_id || m.article_id;
        if (targetId) {
          stockMap[targetId] = (stockMap[targetId] || 0) + (Number(m.quantite) || 0);
        }
      });

      const existingMap = new Map<string, Produit>();
      localProds.forEach((p) => existingMap.set(p.id, p));

      const produitsMapped: Produit[] = (artData || []).map((a: any) => {
        const calculatedStock = stockMap[a.id] !== undefined ? stockMap[a.id] : (Number(a.stock_actuel) || 0);
        const coutInfo = coutsMap[a.id];
        const existing = existingMap.get(a.id);

        return {
          ...existing,
          id: a.id,
          etablissement_id: a.etablissement_id || a.activite_id || activiteId,
          nom: a.nom,
          categorie: a.categorie || 'Général',
          oko_code: a.oko_code || a.code_unique || a.code_barre || existing?.oko_code,
          prix_vente_unitaire: Number(a.prix_vente) || existing?.prix_vente_unitaire || 0,
          prix_achat_unitaire: coutInfo ? coutInfo.prix_achat : (Number(a.prix_achat) || existing?.prix_achat_unitaire || 0),
          cout_achat_unitaire_cmp: coutInfo ? coutInfo.prix_achat : (Number(a.prix_achat) || existing?.cout_achat_unitaire_cmp || 0),
          quantite_totale: calculatedStock,
          seuil_alerte: a.seuil_alerte || 5,
          unite: a.unite || (a.mode_suivi === 'unite' ? 'unite' : 'piece'),
          mode_suivi: a.mode_suivi || existing?.mode_suivi || 'quantite',
          actif: a.actif !== false,
          prix_achat_statut: (coutInfo && coutInfo.prix_achat > 0) || (a.prix_achat > 0) ? 'complet' : 'prix_achat_a_completer',
        };
      });

      if (produitsMapped.length > 0) {
        offlineDB.saveProduits(produitsMapped);
        return { success: true, produits: produitsMapped };
      }
      return { success: true, produits: localProds };
    };

    // Timeout réseau tolérant pour connexions mobiles
    const timeoutPromise = new Promise<{ success: boolean; produits: Produit[]; error?: string }>((resolve) =>
      setTimeout(() => resolve({ success: false, produits: localProds, error: 'Délai d\'attente réseau dépassé (8s)' }), 8000)
    );

    return await Promise.race([networkFetch(), timeoutPromise]);
  } catch (err: any) {
    console.error('[ArticlesSyncService] Erreur fetchArticlesFromCloud:', err);
    return {
      success: false,
      produits: localProds,
      error: err?.message || 'Impossible de joindre Supabase pour charger le stock.',
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

    // Vérifier la conformité UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(article.id);
    if (!isUuid) {
      article.id = generateUUID();
    }

    const articlePayload = {
      id: article.id,
      etablissement_id: activiteId,
      activite_id: activiteId,
      nom: article.nom,
      categorie: article.categorie || 'Général',
      code_barre: article.oko_code || (article as any).code_barres || null,
      code_unique: article.oko_code || (article as any).code_unique || `ART-${Date.now().toString().slice(-6)}`,
      oko_code: article.oko_code || null,
      prix_vente: article.prix_vente_unitaire || (article as any).prix_vente || 0,
      prix_achat: prixAchat !== undefined ? prixAchat : (article.prix_achat_unitaire || 0),
      stock_actuel: article.quantite_totale || 0,
      mode_suivi: article.unite === 'unite' ? 'unite' : 'quantite',
      seuil_alerte: article.seuil_alerte || 5,
      unite: article.unite || 'piece',
      actif: article.actif !== false,
      updated_at: new Date().toISOString(),
    };

    // 1. Mettre à jour le cache local
    const all = offlineDB.getProduits();
    const idx = all.findIndex((p) => p.id === article.id);
    if (idx >= 0) all[idx] = article;
    else all.push(article);
    offlineDB.saveProduits(all);

    // 2. Sauvegarde directe dans Supabase table produits
    const { error: directErr } = await supabase.from('produits').upsert(articlePayload);
    if (directErr) {
      console.warn('[ArticlesSyncService] Direct upsert warning, enqueuing:', directErr.message);
      syncEngine.enqueue('produits', 'upsert', articlePayload);
    }

    // 3. Sauvegarde dans couts_articles si prix d'achat présent
    if (prixAchat !== undefined && prixAchat > 0) {
      const coutPayload = {
        id: generateUUID(),
        etablissement_id: activiteId,
        activite_id: activiteId,
        article_id: article.id,
        prix_achat: prixAchat,
        fournisseur_nom: fournisseurNom || null,
        updated_at: new Date().toISOString(),
      };
      const { error: coutErr } = await supabase.from('couts_articles').upsert(coutPayload);
      if (coutErr) {
        syncEngine.enqueue('couts_articles', 'upsert', coutPayload);
      }
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
  typeMouvement: 'entree' | 'vente' | 'ajustement' | 'retour' | 'sortie';
  quantite: number;
  motif?: string;
  auteurNom: string;
  quantiteAvant?: number;
  quantiteApres?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const mouvementId = generateUUID();
    const nowIso = new Date().toISOString();

    const mouvementPayload = {
      id: mouvementId,
      etablissement_id: params.activiteId,
      activite_id: params.activiteId,
      produit_id: params.articleId,
      article_id: params.articleId,
      type_mouvement: params.typeMouvement,
      quantite: params.quantite,
      stock_avant: params.quantiteAvant || 0,
      stock_apres: params.quantiteApres || 0,
      motif: params.motif || 'Mouvement de stock',
      auteur_nom: params.auteurNom,
      client_timestamp: nowIso,
      created_at: nowIso,
    };

    // 1. Écriture directe dans mouvements_stock
    const { error: mvtErr } = await supabase.from('mouvements_stock').insert(mouvementPayload);
    if (mvtErr) {
      console.warn('[ArticlesSyncService] Direct mvt insert notice, enqueuing:', mvtErr.message);
      syncEngine.enqueue('mouvements_stock', 'insert', mouvementPayload);
    }

    // 2. Traçabilité dans journal_audit
    const auditPayload = {
      id: generateUUID(),
      etablissement_id: params.activiteId,
      action: params.typeMouvement,
      details: {
        article_id: params.articleId,
        quantite_avant: params.quantiteAvant || 0,
        quantite_apres: params.quantiteApres || 0,
        variation_quantite: params.quantite,
        motif: params.motif || 'Mouvement de stock',
        auteur_nom: params.auteurNom,
        auteur_role: 'utilisateur',
      },
      created_at: nowIso,
    };

    const { error: auditErr } = await supabase.from('journal_audit').insert(auditPayload);
    if (auditErr) {
      syncEngine.enqueue('journal_audit', 'insert', auditPayload);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[ArticlesSyncService] Exception recordStockMouvementToCloud:', err);
    return { success: false, error: err?.message || 'Erreur d\'enregistrement du mouvement' };
  }
}
