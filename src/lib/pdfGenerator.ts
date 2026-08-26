import { jsPDF } from 'jspdf';
import { MouvementStock, Produit, Etablissement } from '@/types';

export function generateStockReportPDF(
  etablissement: Etablissement,
  produits: Produit[],
  mouvements: MouvementStock[]
): jsPDF {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const margin = 15;
  let y = 20;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 107, 0); // #FF6B00
  doc.text(etablissement.nom.toUpperCase(), margin, y);

  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Rapport de Stock & Mouvements - ${etablissement.ville}`, margin, y);

  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 210 - margin, y);

  // Resume Stock
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('1. État de l\'Inventaire', margin, y);

  y += 8;
  doc.setFontSize(9);
  doc.text('Produit', margin, y);
  doc.text('Stock Casiers + Vrac', 90, y);
  doc.text('Prix Vente (b)', 150, y);
  doc.text('Statut', 180, y);

  y += 3;
  doc.line(margin, y, 210 - margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  produits.forEach((p) => {
    const totalB = p.casiers_pleins * p.bouteilles_par_casier + p.bouteilles_vrac;
    const isLow = totalB <= p.seuil_alerte;

    doc.text(p.nom, margin, y);
    doc.text(`${p.casiers_pleins}c + ${p.bouteilles_vrac}b (${totalB}b)`, 90, y);
    doc.text(`${p.prix_vente_bouteille.toLocaleString('fr-FR')} F`, 150, y);
    doc.text(isLow ? 'STOCK BAS' : 'OK', 180, y);
    y += 6;
  });

  return doc;
}

export function shareStockReportWhatsApp(etablissement: Etablissement, lowStockCount: number) {
  const text = `📊 *RAPPORT STOCK EN TEMPS RÉEL - ${etablissement.nom.toUpperCase()}*\n` +
    `-----------------------------\n` +
    `📍 Ville : ${etablissement.ville}\n` +
    `🗓️ Date : ${new Date().toLocaleDateString('fr-FR')}\n` +
    `⚠️ Produits sous le seuil d'alerte : *${lowStockCount}*\n` +
    `-----------------------------\n` +
    `Suivi généré avec TAKAMBAR SaaS.`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
