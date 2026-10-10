import { NextRequest, NextResponse } from 'next/server';
import { offlineDB } from '@/lib/offlineDB';

// Helper de filtrage serveur : Supprime 100% des prix d'achat et marges si l'utilisateur est un Employé
function stripPurchasePricesForEmployee(data: any, isEmployee: boolean): any {
  if (!isEmployee || !data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => stripPurchasePricesForEmployee(item, isEmployee));
  }

  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Masquer les champs sensibles de prix d'achat, marges et reçus fournisseur
      if (
        key.includes('prix_achat') ||
        key.includes('cout_achat') ||
        key.includes('marge') ||
        key.includes('fournisseur_recu_photo') ||
        key.includes('valeur_stock_achat')
      ) {
        continue; // Exclus du JSON renvoyé par l'API
      }
      cleaned[key] = stripPurchasePricesForEmployee(value, isEmployee);
    }
    return cleaned;
  }

  return data;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userRole = req.headers.get('x-user-role') || searchParams.get('role') || '';
    const isEmployee = userRole === 'Employé' || userRole === 'employe';

    const produits = offlineDB.getProduits();
    const safeProduits = stripPurchasePricesForEmployee(produits, isEmployee);

    return NextResponse.json({
      success: true,
      roleApplied: isEmployee ? 'Employé (Prix d\'achat censurés)' : 'Patron',
      produits: safeProduits,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Erreur serveur API Produits' }, { status: 500 });
  }
}
