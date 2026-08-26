import jsPDF from 'jspdf';
import { Produit, Etablissement } from '@/types';

export function generateStockPDF(etablissement: Etablissement, produits: Produit[]) {
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

export function shareStockReportWhatsApp(etablissement: Etablissement, lowStockCount: number) {
  const message = `*INVENTAIRE STOCK - ${etablissement.nom}*\n` +
    `Bonjour Patron, voici l'état des stocks au ${new Date().toLocaleDateString('fr-FR')} :\n` +
    `- Articles sous le seuil d'alerte : *${lowStockCount}*\n` +
    `Consultez l'application Stockia pour passer commande d'urgence.`;

  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}
