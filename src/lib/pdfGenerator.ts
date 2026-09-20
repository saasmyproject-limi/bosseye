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
  nom: string;
  quantite: number;
  prix_unitaire: number;
  varianteInfo?: string;
}

export async function generateReceiptPDF(options: {
  etablissement: Etablissement;
  numeroTicket: string;
  client?: Client | { nom: string; telephone?: string };
  lignes: ReceiptItem[];
  totalGeneral: number;
  remise?: number;
  montantVerse: number;
  resteAPayer?: number;
  typeVente: 'comptoir' | 'livraison' | 'reservation';
  dateStr?: string;
}) {
  const {
    etablissement,
    numeroTicket,
    client,
    lignes,
    totalGeneral,
    remise = 0,
    montantVerse,
    resteAPayer = 0,
    typeVente,
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
  doc.text(etablissement.nom.toUpperCase(), 40, y, { align: 'center' });

  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${etablissement.ville} - ${etablissement.adresse}`, 40, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'bold');
  const titreType = typeVente === 'reservation' ? 'TICKET RÉSERVATION' : typeVente === 'livraison' ? 'BON DE LIVRAISON' : 'REÇU DE VENTE';
  doc.text(`*** ${titreType} ***`, 40, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Ticket N° : ${numeroTicket}`, margin, y);
  y += 4;
  doc.text(`Date : ${dateStr}`, margin, y);

  if (client?.nom) {
    y += 4;
    doc.text(`Client : ${client.nom}`, margin, y);
    const tel = (client as any).telephone || (client as any).telephone_whatsapp;
    if (tel) {
      y += 4;
      doc.text(`Tél : ${tel}`, margin, y);
    }
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
    const itemTotal = item.quantite * item.prix_unitaire;
    let label = item.nom;
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
