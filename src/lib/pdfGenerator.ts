import { jsPDF } from 'jspdf';
import { Vente } from '@/types';

export function generateInvoicePDF(vente: Vente, barName = 'TAKAMBAR'): jsPDF {
  // Format ticket de caisse 80mm de large (226 points)
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 190],
  });

  // Fond / Marges
  const margin = 5;
  let y = 10;

  // En-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 107, 0); // Orange TAKAM BAR #FF6B00
  doc.text(barName, 40, y, { align: 'center' });

  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Snack-Bar Premium - Yaoundé (Bastos)', 40, y, { align: 'center' });
  doc.text('Tél: +237 699 00 11 22', 40, y + 4, { align: 'center' });

  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 80 - margin, y);

  // Numéro de Facture & Date
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`FACTURE : ${vente.numero_facture}`, margin, y);
  
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const dateFormatted = new Date(vente.created_at).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  doc.text(`Date : ${dateFormatted}`, margin, y);
  doc.text(`Mode : ${vente.mode_paiement.toUpperCase()}`, margin + 35, y);

  // Information Staff (Serveuse & Caissière)
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Serveuse : ${vente.serveuse?.nom || 'Serveuse'}`, margin, y);
  y += 4;
  doc.text(`Caissière : ${vente.caissiere?.nom || 'Caissière'}`, margin, y);

  y += 5;
  doc.line(margin, y, 80 - margin, y);

  // Tableau Articles
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Article', margin, y);
  doc.text('Qté', 48, y, { align: 'right' });
  doc.text('Total (FCFA)', 75, y, { align: 'right' });

  y += 2;
  doc.line(margin, y, 80 - margin, y);

  y += 4;
  doc.setFont('helvetica', 'normal');
  vente.items.forEach((item) => {
    // Tronquer le nom du produit si trop long
    const nomShort = item.nom_produit.length > 20 ? item.nom_produit.substring(0, 18) + '..' : item.nom_produit;
    doc.text(nomShort, margin, y);
    doc.text(`${item.quantite_bouteilles}`, 48, y, { align: 'right' });
    doc.text(`${item.subtotal.toLocaleString('fr-FR')} F`, 75, y, { align: 'right' });
    y += 5;
  });

  doc.line(margin, y, 80 - margin, y);

  // Total Général
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 107, 0);
  doc.text('TOTAL :', margin, y);
  doc.text(`${vente.total_amount.toLocaleString('fr-FR')} FCFA`, 75, y, { align: 'right' });

  // Pied de page / Message de remerciement
  y += 12;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Merci pour votre visite au TAKAM BAR !', 40, y, { align: 'center' });
  doc.text('*** À bientôt à Yaoundé ***', 40, y + 4, { align: 'center' });

  return doc;
}

export function shareReceiptWhatsApp(vente: Vente, barName = 'TAKAM BAR CHIC') {
  const text = `🧾 *FACTURE ${vente.numero_facture} - ${barName}*\n` +
    `-----------------------------\n` +
    `🗓️ Date : ${new Date(vente.created_at).toLocaleString('fr-FR')}\n` +
    `👤 Serveuse : ${vente.serveuse?.nom || 'N/A'}\n` +
    `💳 Mode : ${vente.mode_paiement.toUpperCase()}\n` +
    `-----------------------------\n` +
    vente.items.map((i) => `• ${i.nom_produit} x${i.quantite_bouteilles} = ${i.subtotal.toLocaleString('fr-FR')} F`).join('\n') +
    `\n-----------------------------\n` +
    `💰 *TOTAL : ${vente.total_amount.toLocaleString('fr-FR')} FCFA*\n\n` +
    `Merci de votre confiance ! 🍹`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
