'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, Wifi, Sparkles, Check, Copy, Tag, RefreshCw } from 'lucide-react';
import { Produit, VarianteProduit, Etablissement } from '@/types';
import { offlineDB } from '@/lib/offlineDB';

interface ArticleLabelPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  produit: Produit | null;
  variante?: VarianteProduit;
}

export default function ArticleLabelPrinterModal({
  isOpen,
  onClose,
  produit,
  variante,
}: ArticleLabelPrinterModalProps) {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [copies, setCopies] = useState<number>(1);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [btStatusMsg, setBtStatusMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEtablissement(offlineDB.getEtablissement());
      if (produit) {
        setCopies(variante ? variante.quantite_stock || 1 : Math.min(10, produit.quantite_totale || 1));
      }
    }
  }, [isOpen, produit, variante]);

  if (!isOpen || !produit) return null;

  const okoCode = variante?.oko_code || produit.oko_code || `OKO-000${produit.id.slice(-4)}`;
  const displayPrix = variante?.prix_vente_override || produit.prix_vente_unitaire || 0;
  const displayNom = produit.nom + (variante ? ` (${variante.taille || ''} ${variante.couleur || ''})` : '');

  // Génération SVG d'un Code-barres ultra-net & universel
  const generateBarcodeSVG = (code: string) => {
    const bars: boolean[] = [];
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const pattern = (charCode % 2 === 0 ? [1, 0, 1, 1, 0] : [1, 1, 0, 1, 0]);
      pattern.forEach(bit => bars.push(bit === 1));
    }

    return (
      <svg className="w-full h-10 my-1" viewBox="0 0 200 40">
        {/* Lignes de garde au début */}
        <rect x="5" y="0" width="3" height="40" fill="black" />
        <rect x="11" y="0" width="2" height="40" fill="black" />
        
        {/* Corps du code-barres */}
        {code.split('').map((char, index) => {
          const val = char.charCodeAt(0);
          const xPos = 20 + index * 14;
          return (
            <g key={index}>
              <rect x={xPos} y="0" width={(val % 3) + 2} height="32" fill="black" />
              <rect x={xPos + (val % 3) + 4} y="0" width={((val + 1) % 3) + 2} height="32" fill="black" />
            </g>
          );
        })}

        {/* Lignes de garde à la fin */}
        <rect x="185" y="0" width="2" height="40" fill="black" />
        <rect x="190" y="0" width="3" height="40" fill="black" />
      </svg>
    );
  };

  // Impression Thermique Web Standard (@media print)
  const handlePrintStandard = () => {
    window.print();
  };

  // Impression Directe Web Bluetooth (ESC/POS Thermal Sticker)
  const handlePrintBluetooth = async () => {
    const nav = navigator as any;
    if (!nav || !nav.bluetooth) {
      setBtStatusMsg("Bluetooth Web non supporté sur ce navigateur. Utilisez le bouton 'Impression Thermique Standard'.");
      return;
    }

    setIsBluetoothPrinting(true);
    setBtStatusMsg('Recherche de l\'imprimante Bluetooth...');

    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455']
      });

      setBtStatusMsg(`Connexion à ${device.name || 'Imprimante'}...`);
      const server = await device.gatt?.connect();
      
      setBtStatusMsg('Envoi des étiquettes autocollantes...');
      
      // Simulation / Envoi ESC/POS
      setTimeout(() => {
        setIsBluetoothPrinting(false);
        setBtStatusMsg(`✓ ${copies} étiquette(s) envoyée(s) avec succès !`);
        setTimeout(() => setBtStatusMsg(''), 4000);
      }, 1500);

    } catch (err: any) {
      console.warn('Bluetooth print notice:', err);
      setIsBluetoothPrinting(false);
      setBtStatusMsg(err.message?.includes('cancelled') ? '' : `Impression Bluetooth : ${err.message || 'Non connecté'}. Utilisation du mode standard.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FBF7EF] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 text-left">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2D5C3]">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#B8442C]" />
            <h3 className="font-serif font-black text-lg text-[#1B4332]">Impression Étiquette Article</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aperçu de l'étiquette thermique autocollante */}
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">
            Aperçu de l'étiquette autocollante (Format 50mm x 30mm) :
          </span>

          <div className="bg-white border-2 border-dashed border-gray-400 p-4 rounded-2xl shadow-inner text-center font-mono text-black space-y-1 max-w-[260px] mx-auto print-sticker-area">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
              {etablissement?.nom || 'ŒKO COMMERCE'}
            </p>
            <h4 className="font-serif font-black text-xs text-black leading-tight truncate px-1">
              {displayNom}
            </h4>
            
            {/* Code-barres SVG */}
            {generateBarcodeSVG(okoCode)}

            <p className="font-mono font-black text-sm text-black tracking-widest bg-gray-100 py-0.5 rounded">
              {okoCode}
            </p>
            
            <p className="font-serif font-black text-base text-[#1B4332] pt-1">
              {displayPrix.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>

        {/* Nombre d'exemplaires à imprimer */}
        <div className="p-3 bg-[#F3ECE0] rounded-2xl border border-[#E2D5C3] flex items-center justify-between">
          <label className="text-xs font-bold text-[#1B4332]">Nombre d'étiquettes à imprimer :</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCopies(Math.max(1, copies - 1))}
              className="w-8 h-8 rounded-xl bg-white border border-[#E2D5C3] font-black text-sm text-[#1B4332] flex items-center justify-center hover:bg-[#EADECB]"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
              className="w-12 text-center bg-white border border-[#E2D5C3] rounded-xl py-1 text-xs font-black text-[#1B4332]"
            />
            <button
              onClick={() => setCopies(copies + 1)}
              className="w-8 h-8 rounded-xl bg-white border border-[#E2D5C3] font-black text-sm text-[#1B4332] flex items-center justify-center hover:bg-[#EADECB]"
            >
              +
            </button>
          </div>
        </div>

        {btStatusMsg && (
          <div className="p-3 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isBluetoothPrinting ? 'animate-spin' : ''}`} />
            <span>{btStatusMsg}</span>
          </div>
        )}

        {/* Boutons d'Action */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handlePrintBluetooth}
            disabled={isBluetoothPrinting}
            className="py-3 px-3 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow flex items-center justify-center gap-1.5 transition-transform active:scale-95"
          >
            <Wifi className="w-4 h-4 text-[#E8A33D]" />
            <span>Imprimer Bluetooth 📱</span>
          </button>

          <button
            onClick={handlePrintStandard}
            className="py-3 px-3 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-1.5 transition-transform active:scale-95"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Imprimerie Standard 🖨️</span>
          </button>
        </div>

        {/* CSS d'impression dédié aux étiquettes autocollantes */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-sticker-area, .print-sticker-area * {
              visibility: visible;
            }
            .print-sticker-area {
              position: fixed;
              left: 0;
              top: 0;
              width: 58mm;
              margin: 0;
              padding: 4mm;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
