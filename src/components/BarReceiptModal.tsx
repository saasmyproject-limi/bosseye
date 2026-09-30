'use client';

import React from 'react';
import { X, Printer, CheckCircle2, Share2 } from 'lucide-react';
import { Facture, Etablissement, Utilisateur } from '@/types';

interface BarReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  facture: Facture | null;
  etablissement: Etablissement | null;
  tableNumero?: string;
  serveuseNom?: string;
  splitInfo?: { partNumber: number; totalParts: number } | null;
}

export default function BarReceiptModal({
  isOpen,
  onClose,
  facture,
  etablissement,
  tableNumero = 'Table 01',
  serveuseNom = 'Serveuse Bar',
  splitInfo = null,
}: BarReceiptModalProps) {
  if (!isOpen || !facture) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(facture.created_at).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      {/* Container Ticket Thermique */}
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#1B4332] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#E8A33D]" />
            <h3 className="font-serif font-black text-sm">Ticket / Receipt Bar</h3>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ticket Content Area (Style Imprimante Thermique 80mm / 58mm) */}
        <div id="thermal-ticket-content" className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-black bg-white select-text">
          {/* Logo & Header Commerce */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
            <h2 className="font-serif font-black text-lg uppercase tracking-wider text-black">
              {etablissement?.nom || 'ŒKO BAR & LOUNGE'}
            </h2>
            <p className="text-[11px] font-bold text-gray-700">
              {etablissement?.adresse || 'Douala'}, {etablissement?.ville || 'Cameroun'}
            </p>
            {etablissement?.telephone && (
              <p className="text-[10px] font-medium text-gray-600">Tél: {etablissement.telephone}</p>
            )}
            <p className="text-[10px] font-bold text-[#1B4332] pt-1">--- TICKET DE CAISSE BAR ---</p>
          </div>

          {/* Méta Ticket (Facture, Table, Serveuse, Date) */}
          <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-gray-400">
            <div className="flex justify-between font-bold">
              <span>N° Ticket :</span>
              <span>#{facture.numero_facture}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Repère Table :</span>
              <span className="uppercase text-[#B8442C] font-black">{tableNumero}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Serveuse / Caissier :</span>
              <span>{serveuseNom}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Date & Heure :</span>
              <span>{formattedDate}</span>
            </div>
            {facture.client?.nom && (
              <div className="flex justify-between text-gray-800 font-bold">
                <span>Client Habitué :</span>
                <span>{facture.client.nom}</span>
              </div>
            )}
            {splitInfo && (
              <div className="mt-1 p-1 bg-amber-100 text-amber-900 text-center font-bold text-[10px] rounded">
                TICKET DIVISÉ : Part {splitInfo.partNumber} / {splitInfo.totalParts}
              </div>
            )}
          </div>

          {/* Table / Grille des Articles Consommés */}
          <div className="space-y-2 pb-3 border-b border-dashed border-gray-400">
            <div className="flex justify-between font-bold text-[10px] uppercase text-gray-700">
              <span className="w-1/2">Article / Conso</span>
              <span className="w-1/6 text-center">Qté</span>
              <span className="w-1/3 text-right">Montant</span>
            </div>

            {(facture.lignes || []).map((l, idx) => (
              <div key={idx} className="flex justify-between text-[11px] items-start">
                <div className="w-1/2 pr-1 font-bold truncate">
                  {l.nom_produit}
                  {l.detail_variante && (
                    <span className="block text-[9px] font-normal text-gray-500">{l.detail_variante}</span>
                  )}
                </div>
                <div className="w-1/6 text-center font-bold">x{l.quantite_bouteilles}</div>
                <div className="w-1/3 text-right font-black">
                  {(l.sous_total_vente || 0).toLocaleString('fr-FR')} F
                </div>
              </div>
            ))}
          </div>

          {/* Totaux & Règlements */}
          <div className="space-y-1 text-[11px] pt-1">
            <div className="flex justify-between text-gray-700">
              <span>Sous-total Consommations :</span>
              <span>{(facture.montant_total || 0).toLocaleString('fr-FR')} F</span>
            </div>

            {(facture.remise || 0) > 0 && (
              <div className="flex justify-between text-red-700 font-bold">
                <span>Remise Accordée :</span>
                <span>-{(facture.remise || 0).toLocaleString('fr-FR')} F</span>
              </div>
            )}

            <div className="flex justify-between text-base font-black border-t border-b border-black py-1 my-1">
              <span>TOTAL NET :</span>
              <span>{(facture.net_a_payer || facture.montant_total).toLocaleString('fr-FR')} FCFA</span>
            </div>

            <div className="flex justify-between text-gray-700 font-bold">
              <span>Mode de Règlement :</span>
              <span className="uppercase text-[#1B4332]">{facture.mode_paiement}</span>
            </div>

            {facture.montant_verse !== undefined && (
              <div className="flex justify-between text-gray-700">
                <span>Montant Versé :</span>
                <span>{facture.montant_verse.toLocaleString('fr-FR')} F</span>
              </div>
            )}

            {(facture.montant_rendu || 0) > 0 && (
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>Monnaie Rendue :</span>
                <span>{(facture.montant_rendu || 0).toLocaleString('fr-FR')} F</span>
              </div>
            )}

            {facture.statut === 'credit_encours' && (
              <div className="p-2 bg-red-100 text-red-900 rounded-lg text-center font-bold text-[10px] mt-2">
                ⚠️ ARDOISE EN COURS - Reste dû : {(facture.montant_restant || 0).toLocaleString('fr-FR')} FCFA
              </div>
            )}
          </div>

          {/* Footer Receipt */}
          <div className="text-center pt-4 text-[10px] text-gray-600 space-y-1">
            <p className="font-bold">Merci de votre visite au {etablissement?.nom || 'Bar'} !</p>
            <p className="italic">Logiciel Œko • L'œil du patron</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-gray-100 border-t border-gray-200 flex items-center gap-2 print:hidden">
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-white border border-gray-300 text-gray-700 font-bold text-xs"
          >
            Fermer
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4 text-[#E8A33D]" />
            <span>Imprimer Ticket Thermique 🖨️</span>
          </button>
        </div>
      </div>
    </div>
  );
}
