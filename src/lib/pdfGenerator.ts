import { Produit, Etablissement, Client } from '@/types';

export async function generateStockPDF(etablissement: Etablissement, produits: Produit[]) {
  const { jsPDF } = await import('jspdf/dist/jspdf.umd.min.js' as any);
  const doc = new jsPDF();
  const margin = 15;
  let y = 20;

  // En-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(etablissement.nom.toUpperCase(), margin, y);

  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ville: ${etablissement.ville} - ${etablissement.adresse}`, margin, y);
  doc.text(`Date de l'inventaire: ${new Date().toLocaleDateString('fr-FR')}`, 140, y);

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("RAPPORT DE STOCK & ETAT DE L'INVENTAIRE", margin, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Article / Produit', margin, y);
  doc.text('Quantité Stock', 90, y);
  doc.text('Prix Vente', 150, y);
  doc.text('Statut', 180, y);

  y += 3;
  doc.line(margin, y, 210 - margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  produits.forEach((p) => {
    const casiers = p.casiers_pleins || 0;
    const bParCasier = p.bouteilles_par_casier || 24;
    const vrac = p.bouteilles_vrac || 0;
    const totalB = p.quantite_totale || casiers * bParCasier + vrac;
    const isLow = totalB <= (p.seuil_alerte || 10);
    const pVente = p.prix_vente_unitaire || p.prix_vente_bouteille || 0;

    doc.text(p.nom || 'Sans nom', margin, y);
    doc.text(`${totalB} unité(s)`, 90, y);
    doc.text(`${pVente.toLocaleString('fr-FR')} F`, 150, y);
    doc.text(isLow ? 'STOCK BAS' : 'OK', 180, y);
    y += 6;
  });

  return doc;
}

export interface ReceiptItem {
  nom?: string;
  nom_produit?: string;
  quantite: number;
  prix_unitaire: number;
  varianteInfo?: string;
  total?: number;
}

export async function generateReceiptPDF(options: {
  etablissement?: Etablissement;
  etablissementNom?: string;
  etablissementVille?: string;
  etablissementQuartier?: string;
  etablissementTelephone?: string;
  numeroTicket: string;
  client?: Client | { nom: string; telephone?: string };
  clientNom?: string;
  clientTelephone?: string;
  caissiereNom?: string;
  typeVenteLabel?: string;
  modePaiementLabel?: string;
  lignes: ReceiptItem[];
  totalGeneral: number;
  remise?: number;
  montantVerse: number;
  monnaieRendue?: number;
  resteAPayer?: number;
  typeVente?: 'comptoir' | 'livraison' | 'reservation';
  dateStr?: string;
}) {
  const {
    etablissement,
    etablissementNom = etablissement?.nom || 'OEKO SHOP',
    etablissementVille = etablissement?.ville || 'Douala',
    etablissementQuartier = etablissement?.quartier || '',
    etablissementTelephone = etablissement?.telephone || etablissement?.telephone_proprio || '',
    numeroTicket,
    client,
    clientNom = client?.nom,
    clientTelephone = (client as any)?.telephone || (client as any)?.telephone_whatsapp,
    caissiereNom,
    typeVenteLabel,
    modePaiementLabel,
    lignes,
    totalGeneral,
    remise = 0,
    montantVerse,
    resteAPayer = 0,
    typeVente = 'comptoir',
    dateStr = new Date().toLocaleString('fr-FR'),
  } = options;

  const { jsPDF } = await import('jspdf/dist/jspdf.umd.min.js' as any);

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200], // Ticket caisse format 80mm
  });

  const margin = 5;
  let y = 10;

  // En-tête du ticket
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(etablissementNom.toUpperCase(), 40, y, { align: 'center' });

  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const locationStr = etablissementQuartier ? `${etablissementVille} - ${etablissementQuartier}` : etablissementVille;
  doc.text(locationStr, 40, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'bold');
  const titreType = typeVenteLabel || (typeVente === 'reservation' ? 'TICKET RÉSERVATION' : typeVente === 'livraison' ? 'BON DE LIVRAISON' : 'REÇU DE VENTE');
  doc.text(`*** ${titreType} ***`, 40, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Ticket N° : ${numeroTicket}`, margin, y);
  y += 4;
  doc.text(`Date : ${dateStr}`, margin, y);

  const activeClientNom = clientNom || client?.nom;
  const activeClientPhone = clientTelephone || (client as any)?.telephone || (client as any)?.telephone_whatsapp;
  if (activeClientNom) {
    y += 4;
    doc.text(`Client : ${activeClientNom}`, margin, y);
    if (activeClientPhone) {
      y += 4;
      doc.text(`Tél : ${activeClientPhone}`, margin, y);
    }
  }

  if (caissiereNom) {
    y += 4;
    doc.text(`Pris par : ${caissiereNom}`, margin, y);
  }

  if (modePaiementLabel) {
    y += 4;
    doc.text(`Mode : ${modePaiementLabel}`, margin, y);
  }

  y += 4;
  doc.text('----------------------------------------------------------------------', margin, y);

  // En-tête du tableau
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Article', margin, y);
  doc.text('Qté', 45, y);
  doc.text('Total', 75, y, { align: 'right' });

  y += 2;
  doc.text('----------------------------------------------------------------------', margin, y);

  y += 4;
  doc.setFont('helvetica', 'normal');
  lignes.forEach((item) => {
    const itemTotal = item.total ?? item.quantite * item.prix_unitaire;
    let label = item.nom || item.nom_produit || 'Article';
    if (item.varianteInfo) label += ` (${item.varianteInfo})`;
    if (label.length > 22) label = label.substring(0, 20) + '..';

    doc.text(label, margin, y);
    doc.text(`${item.quantite}`, 45, y);
    doc.text(`${itemTotal.toLocaleString('fr-FR')} F`, 75, y, { align: 'right' });
    y += 4;
  });

  y += 2;
  doc.text('----------------------------------------------------------------------', margin, y);

  // Totaux
  y += 4;
  if (remise > 0) {
    doc.text(`Remise :`, margin, y);
    doc.text(`-${remise.toLocaleString('fr-FR')} FCFA`, 75, y, { align: 'right' });
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL :`, margin, y);
  doc.text(`${totalGeneral.toLocaleString('fr-FR')} FCFA`, 75, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Montant Versé :`, margin, y);
  doc.text(`${montantVerse.toLocaleString('fr-FR')} FCFA`, 75, y, { align: 'right' });

  y += 4;
  if (resteAPayer > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(`DETTE / RESTE :`, margin, y);
    doc.text(`${resteAPayer.toLocaleString('fr-FR')} FCFA`, 75, y, { align: 'right' });
  } else {
    const monnaie = montantVerse - totalGeneral;
    if (monnaie > 0) {
      doc.text(`Monnaie rendue :`, margin, y);
      doc.text(`${monnaie.toLocaleString('fr-FR')} FCFA`, 75, y, { align: 'right' });
    }
  }

  y += 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text('Merci de votre confiance !', 40, y, { align: 'center' });
  y += 4;
  doc.text('Logiciel œko — L\'œil du patron', 40, y, { align: 'center' });

  return doc;
}

export function shareStockReportWhatsApp(etablissement: Etablissement, lowStockCount: number) {
  const message = `*INVENTAIRE STOCK - ${etablissement.nom}*\n` +
    `Bonjour Patron, voici l'état des stocks au ${new Date().toLocaleDateString('fr-FR')} :\n` +
    `- Articles sous le seuil d'alerte : *${lowStockCount}*\n` +
    `Consultez l'application Stockia pour passer commande d'urgence.`;

  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

export async function generateCloturePDF(etablissement: Etablissement, cloture: any, type: 'journaliere' | 'mensuelle' = 'journaliere') {
  const { jsPDF } = await import('jspdf/dist/jspdf.umd.min.js' as any);
  const doc = new jsPDF();
  const margin = 15;
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(etablissement.nom.toUpperCase(), margin, y);

  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ville: ${etablissement.ville} - ${etablissement.adresse}`, margin, y);
  doc.text(`Date d'émission: ${new Date().toLocaleDateString('fr-FR')}`, 140, y);

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const title = type === 'journaliere' 
    ? `RAPPORT FIGÉ DE CLÔTURE JOURNALIÈRE — DU ${cloture.date_cloture}`
    : `RAPPORT FIGÉ DE CLÔTURE MENSUELLE — MOIS ${cloture.mois_annee}`;
  doc.text(title, margin, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Figé officiellement le: ${new Date(cloture.fige_le || Date.now()).toLocaleString('fr-FR')} par ${cloture.cree_par || 'Système'}`, margin, y);

  y += 8;
  doc.line(margin, y, 210 - margin, y);

  y += 10;
  doc.setFontSize(11);

  if (type === 'journaliere') {
    const items = [
      ['Chiffre d\'Affaires / Total Ventes du jour:', `${(cloture.total_ventes || 0).toLocaleString('fr-FR')} FCFA`],
      ['Encaissements Espèces (Cash):', `${(cloture.total_encaisse_cash || 0).toLocaleString('fr-FR')} FCFA`],
      ['Encaissements Orange Money:', `${(cloture.total_encaisse_om || 0).toLocaleString('fr-FR')} FCFA`],
      ['Encaissements MTN Mobile Money:', `${(cloture.total_encaisse_momo || 0).toLocaleString('fr-FR')} FCFA`],
      ['--- ENTRÉES & SORTIES STOCK DU JOUR ---', ''],
      ['Entrées de Stock ce Jour (Quantité):', `${(cloture.quantite_stock_entre || 0)} pièce(s)`],
      ['Valeur d\'Achat du Stock Entré:', `${(cloture.valeur_stock_entre || 0).toLocaleString('fr-FR')} FCFA`],
      ['Sorties / Ventes de Stock (Quantité):', `${(cloture.quantite_stock_sorti || 0)} pièce(s)`],
      ['Coût des Marchandises Vendues:', `${(cloture.valeur_stock_sorti || 0).toLocaleString('fr-FR')} FCFA`],
      ['Stock Restant Disponible en Magasin:', `${(cloture.quantite_stock_restant_total || 0)} pièce(s)`],
      ['Nombre d\'Articles en Catalogue:', `${(cloture.nombre_articles_differents || 0)} article(s)`],
      ['--- COMPTABILITÉ & DÉBTS ---', ''],
      ['Marge Commerciale Brute CMP:', `+${(cloture.marge_brute_cmp || 0).toLocaleString('fr-FR')} FCFA`],
      ['Créances / Dettes accordées ce jour:', `${(cloture.creances_accordees_jour || 0).toLocaleString('fr-FR')} FCFA`],
      ['Dettes recouvrées ce jour:', `${(cloture.creances_recouvrees_jour || 0).toLocaleString('fr-FR')} FCFA`],
    ];

    items.forEach(([label, val]) => {
      if (label.startsWith('---')) {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, y);
        y += 6;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text(label, margin, y);
        doc.setFont('helvetica', 'bold');
        doc.text(val, 180, y, { align: 'right' });
        y += 6;
      }
    });
  } else {
    const items = [
      ['Total Ventes du Mois:', `${(cloture.total_ventes || 0).toLocaleString('fr-FR')} FCFA`],
      ['Marge Commerciale Brute CMP:', `+${(cloture.marge_brute_cmp || 0).toLocaleString('fr-FR')} FCFA`],
      ['Total Charges Exploitation du Mois:', `-${(cloture.total_charges || 0).toLocaleString('fr-FR')} FCFA`],
      ['RÉSULTAT NET COMPTABLE FIGÉ:', `${(cloture.resultat_net || 0).toLocaleString('fr-FR')} FCFA`],
    ];

    items.forEach(([label, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'bold');
      doc.text(val, 180, y, { align: 'right' });
      y += 8;
    });
  }

  y += 10;
  doc.line(margin, y, 210 - margin, y);

  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Document officiel issu de l\'application œko — L\'œil du patron.', margin, y);

  return doc;
}
