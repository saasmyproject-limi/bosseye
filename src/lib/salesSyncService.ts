import { supabase } from './supabase';
import { offlineDB, generateUUID } from './offlineDB';
import { Facture, LigneFacture } from '@/types';
import { syncEngine } from './supabaseSyncEngine';

export interface VenteInput {
  activiteId: string;
  numeroFacture: string;
  clientId?: string;
  clientNom?: string;
  clientTelephone?: string;
  totalHt: number;
  montantRemise: number;
  totalTtc: number;
  montantPaye: number;
  resteAPayer: number;
  modePaiement: string;
  vendeurNom: string;
  lignes: Array<{
    articleId: string;
    articleNom: string;
    codeUnique?: string;
    quantite: number;
    prixUnitaire: number;
    totalLigne: number;
  }>;
}

function formatPaymentMethod(mode: string): 'Orange Money' | 'MTN MoMo' | 'Especes' | 'Carte' | 'Virement' {
  const m = (mode || '').toLowerCase();
  if (m.includes('orange') || m.includes('om')) return 'Orange Money';
  if (m.includes('mtn') || m.includes('momo')) return 'MTN MoMo';
  if (m.includes('carte') || m.includes('card')) return 'Carte';
  if (m.includes('vir')) return 'Virement';
  return 'Especes';
}

function isUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function recordSaleToCloud(
  input: VenteInput
): Promise<{ success: boolean; venteId: string; error?: string }> {
  try {
    const venteId = generateUUID();
    const nowIso = new Date().toISOString();

    // Statut conforme au check constraint Postgres ('payee', 'partielle', 'impayee', 'annulee')
    const statutDb = input.resteAPayer <= 0 ? 'payee' : (input.montantPaye > 0 ? 'partielle' : 'impayee');
    const validClientId = isUUID(input.clientId) ? input.clientId : null;

    // 1. Payload Vente principale
    const ventePayload = {
      id: venteId,
      etablissement_id: input.activiteId,
      activite_id: input.activiteId,
      numero_ticket: input.numeroFacture,
      client_id: validClientId,
      client_nom: input.clientNom || 'Client Comptant',
      client_telephone: input.clientTelephone || null,
      montant_total: input.totalTtc || 0,
      montant_paye: input.montantPaye || 0,
      reste_a_payer: input.resteAPayer || 0,
      mode_paiement: input.modePaiement || 'especes',
      statut: statutDb,
      caissier_nom: input.vendeurNom || 'Employé',
      articles_json: input.lignes,
      created_at: nowIso,
    };

    // Tentative d'insertion directe
    const { error: venteErr } = await supabase.from('ventes').insert(ventePayload);
    if (venteErr) {
      console.warn('[SalesSyncService] Direct vente insert notice, enqueuing:', venteErr.message);
      syncEngine.enqueue('ventes', 'insert', ventePayload);
    }

    // 2. Lignes de vente et déstockage automatique
    for (const ligne of input.lignes) {
      const ligneId = generateUUID();
      const validArtId = isUUID(ligne.articleId) ? ligne.articleId : null;

      const lignePayload = {
        id: ligneId,
        etablissement_id: input.activiteId,
        vente_id: venteId,
        article_id: validArtId,
        article_nom: ligne.articleNom,
        quantite: ligne.quantite,
        prix_unitaire: ligne.prixUnitaire,
        total: ligne.totalLigne,
        created_at: nowIso,
      };

      const { error: lgErr } = await supabase.from('lignes_vente').insert(lignePayload);
      if (lgErr) {
        syncEngine.enqueue('lignes_vente', 'insert', lignePayload);
      }

      // Mouvement de déstockage automatique (quantité négative)
      if (validArtId) {
        const mvtId = generateUUID();
        const mouvementPayload = {
          id: mvtId,
          etablissement_id: input.activiteId,
          activite_id: input.activiteId,
          produit_id: validArtId,
          article_id: validArtId,
          type_mouvement: 'sortie',
          quantite: -Math.abs(ligne.quantite),
          motif: `Vente ${input.numeroFacture}`,
          auteur_nom: input.vendeurNom || 'Employé',
          created_at: nowIso,
        };

        const { error: mvtErr } = await supabase.from('mouvements_stock').insert(mouvementPayload);
        if (mvtErr) {
          syncEngine.enqueue('mouvements_stock', 'insert', mouvementPayload);
        }
      }
    }

    // 3. Enregistrement de la dette si crédit / reste à payer
    if (input.resteAPayer > 0) {
      const detteId = generateUUID();
      const dettePayload = {
        id: detteId,
        etablissement_id: input.activiteId,
        vente_id: venteId,
        client_id: validClientId,
        client_nom: input.clientNom || 'Client Comptant',
        client_telephone: input.clientTelephone || null,
        montant_initial: input.resteAPayer,
        montant_restant: input.resteAPayer,
        statut: 'en_cours',
        notes: `Crédit restant sur ticket ${input.numeroFacture}`,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const { error: detteErr } = await supabase.from('dettes').insert(dettePayload);
      if (detteErr) {
        console.warn('[SalesSyncService] Direct dette insert notice, enqueuing:', detteErr.message);
        syncEngine.enqueue('dettes', 'insert', dettePayload);
      }
    }

    // 4. Enregistrement du paiement effectif si acompte ou règlement total
    if (input.montantPaye > 0) {
      const paiementId = generateUUID();
      const paiementPayload = {
        id: paiementId,
        etablissement_id: input.activiteId,
        vente_id: venteId,
        montant: input.montantPaye,
        methode: formatPaymentMethod(input.modePaiement),
        telephone_payeur: input.clientTelephone || null,
        reference_transaction: input.numeroFacture,
        statut: 'reussi',
        created_at: nowIso,
      };

      const { error: payErr } = await supabase.from('paiements').insert(paiementPayload);
      if (payErr) {
        syncEngine.enqueue('paiements', 'insert', paiementPayload);
      }
    }

    // 5. Audit de sécurité dans journal_audit
    const auditPayload = {
      id: generateUUID(),
      etablissement_id: input.activiteId,
      action: 'vente',
      details: {
        ticket: input.numeroFacture,
        total: input.totalTtc,
        paye: input.montantPaye,
        reste: input.resteAPayer,
        client: input.clientNom,
        vendeur: input.vendeurNom,
        articles_count: input.lignes.length,
      },
      created_at: nowIso,
    };
    const { error: auditErr } = await supabase.from('journal_audit').insert(auditPayload);
    if (auditErr) {
      syncEngine.enqueue('journal_audit', 'insert', auditPayload);
    }

    // 6. Mettre à jour offlineDB pour cache local instantané
    const localFacture: Facture = {
      id: venteId,
      etablissement_id: input.activiteId,
      numero_facture: input.numeroFacture,
      client_id: input.clientId,
      utilisateur_id: input.vendeurNom,
      montant_total: input.totalTtc,
      remise: input.montantRemise,
      montant_paye: input.montantPaye,
      montant_restant: input.resteAPayer,
      mode_paiement: input.modePaiement as any,
      statut: input.resteAPayer > 0 ? 'credit_encours' : 'payee',
      created_at: nowIso,
      lignes: input.lignes.map((l) => ({
        id: generateUUID(),
        facture_id: venteId,
        produit_id: l.articleId,
        nom_produit: l.articleNom,
        quantite_bouteilles: l.quantite,
        prix_unitaire_vente: l.prixUnitaire,
        cout_unitaire_cmp: 0,
        sous_total_vente: l.totalLigne,
        sous_total_cout: 0,
        marge_brute: 0,
      })),
    };

    const existingFactures = offlineDB.getFactures();
    offlineDB.saveFactures([localFacture, ...existingFactures]);

    return { success: true, venteId };
  } catch (err: any) {
    console.error('[SalesSyncService] Exception recordSaleToCloud:', err);
    return { success: false, venteId: '', error: err?.message || 'Erreur d\'enregistrement de la vente' };
  }
}

export async function fetchSalesFromCloud(
  activiteId: string
): Promise<{ success: boolean; factures: Facture[]; error?: string }> {
  try {
    if (!activiteId) {
      return { success: true, factures: offlineDB.getFactures() };
    }

    const { data: ventesData, error: ventesErr } = await supabase
      .from('ventes')
      .select('*, lignes_vente(*)')
      .or(`etablissement_id.eq.${activiteId},activite_id.eq.${activiteId}`)
      .order('created_at', { ascending: false });

    if (ventesErr) throw ventesErr;

    const facturesMapped: Facture[] = (ventesData || []).map((v: any) => {
      const lignes: LigneFacture[] = (v.lignes_vente || []).map((l: any) => ({
        id: l.id,
        facture_id: v.id,
        produit_id: l.article_id,
        nom_produit: l.article_nom,
        quantite_bouteilles: Number(l.quantite) || 1,
        prix_unitaire_vente: Number(l.prix_unitaire) || 0,
        cout_unitaire_cmp: 0,
        sous_total_vente: Number(l.total || l.total_ligne) || 0,
        sous_total_cout: 0,
        marge_brute: 0,
      }));

      const totalVal = Number(v.montant_total || v.total_ttc) || 0;
      const payeVal = Number(v.montant_paye) || 0;
      const restantVal = Number(v.reste_a_payer) !== undefined ? Number(v.reste_a_payer) : Math.max(0, totalVal - payeVal);

      return {
        id: v.id,
        etablissement_id: v.etablissement_id || v.activite_id || activiteId,
        numero_facture: v.numero_ticket || v.numero_facture,
        client_id: v.client_id,
        utilisateur_id: v.caissier_nom || v.vendeur_nom || 'Employé',
        montant_total: totalVal,
        remise: Number(v.montant_remise) || 0,
        montant_paye: payeVal,
        montant_restant: restantVal,
        mode_paiement: v.mode_paiement || 'especes',
        statut: restantVal > 0 ? 'credit_encours' : 'payee',
        created_at: v.created_at,
        lignes,
      };
    });

    const localFactures = offlineDB.getFactures();
    const facMap = new Map<string, Facture>();
    localFactures.forEach((f) => facMap.set(f.id, f));
    facturesMapped.forEach((f) => facMap.set(f.id, f));
    const mergedFactures = Array.from(facMap.values());

    offlineDB.saveFactures(mergedFactures);
    return { success: true, factures: mergedFactures };
  } catch (err: any) {
    console.error('[SalesSyncService] Exception fetchSalesFromCloud:', err);
    return {
      success: false,
      factures: offlineDB.getFactures(),
      error: err?.message || 'Erreur de chargement des ventes depuis le serveur',
    };
  }
}
