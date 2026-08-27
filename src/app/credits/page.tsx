'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  CreditCard,
  Search,
  Plus,
  MessageSquare,
  History,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  UserPlus,
  ArrowUpRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { offlineDB, getTerminology } from '@/lib/offlineDB';
import { Client, Facture, Etablissement, RemboursementCredit } from '@/types';

export default function CreditsPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFactureForWhatsApp, setSelectedFactureForWhatsApp] = useState<Facture | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<'courtois' | 'fin_de_mois' | 'vip'>('courtois');

  // Modal Remboursement
  const [selectedFactureForRemb, setSelectedFactureForRemb] = useState<Facture | null>(null);
  const [montantRemb, setMontantRemb] = useState<number>(0);
  const [methodeRemb, setMethodeRemb] = useState<'cash' | 'orange_money' | 'mtn_momo'>('cash');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setClients(offlineDB.getClients());
      setFactures(offlineDB.getFactures());
    } catch (e) { console.error(e); }
  };

  const term = getTerminology(etablissement?.type_activite);

  const facturesCredit = factures.filter(
    (f) => f.statut === 'credit_encours' || f.montant_restant > 0
  );

  const totalArgentARecuperer = facturesCredit.reduce((acc, f) => acc + f.montant_restant, 0);

  // Générateur de message WhatsApp Poli & Courtois pour œko
  const getWhatsAppMessageText = (fac: Facture) => {
    const clientNom = fac.client?.nom || 'Cher Client';
    const etabNom = etablissement?.nom || 'notre établissement';
    const total = fac.montant_total.toLocaleString('fr-FR');
    const avance = (fac.montant_paye || 0).toLocaleString('fr-FR');
    const manquant = fac.montant_restant.toLocaleString('fr-FR');
    const facNum = fac.numero_facture;

    if (whatsappTemplate === 'fin_de_mois') {
      return `Bonjour ${clientNom}, ${etabNom} vous souhaite un excellent mois ! Concernant votre facture #${facNum} de ${total} FCFA (avance reçue: ${avance} FCFA), nous vous rappelons poliment le manquant de ${manquant} FCFA à solder. Merci de votre confiance !`;
    } else if (whatsappTemplate === 'vip') {
      return `Bonjour ${clientNom}, nous vous remercions chaleureusement pour votre fidélité auprès de ${etabNom}. Pour la facture #${facNum} (${total} FCFA, avance versée: ${avance} FCFA), nous vous invitons à solder le manquant restant de ${manquant} FCFA. Merci beaucoup !`;
    }

    // Default: Courtois
    return `Bonjour ${clientNom}, ${etabNom} vous rappelle poliment qu'après votre avance de ${avance} FCFA sur la facture #${facNum} (Total: ${total} FCFA), il reste un manquant dû de ${manquant} FCFA à solder. Merci de votre confiance !`;
  };

  const handleSendWhatsApp = (fac: Facture) => {
    const phone = (fac.client?.telephone_whatsapp || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(getWhatsAppMessageText(fac));
    const url = `https://wa.me/${phone.startsWith('237') ? phone : '237' + phone}?text=${text}`;

    offlineDB.recordWhatsAppRelance(fac.id);
    loadData();
    window.open(url, '_blank');
    setSelectedFactureForWhatsApp(null);
  };

  const handleProcessRemb = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactureForRemb || montantRemb <= 0) return;

    offlineDB.processRemboursementCredit({
      facture_id: selectedFactureForRemb.id,
      montant_regle: montantRemb,
      methode: methodeRemb,
    });

    setSelectedFactureForRemb(null);
    setMontantRemb(0);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-[#E2D5C3]">
          <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
            Gestion du Crédit Client & Relance WhatsApp
          </span>
          <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
            Argent à Récupérer & Fiches Clients
          </h1>
          <p className="text-xs text-gray-600 font-medium mt-0.5">
            Suivez les créances, visualisez les avances versées et les manquants dus, et relancez vos clients poliment via WhatsApp en 1 clic.
          </p>
        </div>

        {/* Dashboard Card Total Crédits */}
        <div className="p-6 rounded-3xl bg-[#B8442C] text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Total Argent à Récupérer (Manquants Dus)</span>
            <h2 className="font-serif font-black text-3xl sm:text-4xl mt-1">
              {totalArgentARecuperer.toLocaleString('fr-FR')} FCFA
            </h2>
            <p className="text-xs font-medium opacity-90 mt-1">
              {facturesCredit.length} facture(s) en attente de solde complet
            </p>
          </div>
        </div>

        {/* Liste des Factures à Crédit avec Avances et Manquants */}
        <div className="space-y-4">
          <h2 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#B8442C]" />
            Créances, Avances & Manquants Dus
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facturesCredit.map((fac) => (
              <div key={fac.id} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between pb-2 border-b border-[#E2D5C3]">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#B8442C]">
                      {fac.numero_facture}
                    </span>
                    <h3 className="font-serif font-black text-base text-[#1B4332]">
                      {fac.client?.nom || 'Client Inconnu'}
                    </h3>
                    <p className="text-xs text-gray-600 font-bold">📱 {fac.client?.telephone_whatsapp || 'Non renseigné'}</p>
                  </div>

                  <div className="text-right bg-[#FBF7EF] px-3 py-1.5 rounded-2xl border border-[#E2D5C3]">
                    <span className="text-[10px] font-bold text-gray-500 block">MANQUANT DÛ</span>
                    <span className="font-serif font-black text-lg text-[#B8442C]">
                      {fac.montant_restant.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>

                {/* Détail Avance et Total */}
                <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                  <div>
                    <span className="text-gray-500 font-bold block text-[10px]">TOTAL INITIAL :</span>
                    <span className="font-black text-[#1B4332]">{fac.montant_total.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-bold block text-[10px]">AVANCE REÇUE :</span>
                    <span className="font-black text-emerald-800">{(fac.montant_paye || 0).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-500">
                    Relances : <strong>{fac.compteur_relances || 0} fois</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedFactureForWhatsApp(fac)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Relancer WhatsApp</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedFactureForRemb(fac);
                        setMontantRemb(fac.montant_restant);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#1B4332] text-white font-bold text-xs"
                    >
                      Solder / Regler
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- MODAL RELANCE WHATSAPP --- */}
        {selectedFactureForWhatsApp && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-700" />
                Relance WhatsApp Courtoise
              </h3>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-2">Choisir le Ton du Message</label>
                <div className="space-y-2">
                  {[
                    { id: 'courtois', label: '😊 Ton Courtois & Poliment Rappelé' },
                    { id: 'fin_de_mois', label: '📅 Ton Fin de Mois & Vœux' },
                    { id: 'vip', label: '⭐ Ton Client VIP (Inventaire)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setWhatsappTemplate(t.id as any)}
                      className={`w-full p-3 rounded-2xl border text-left text-xs font-bold transition-all ${
                        whatsappTemplate === t.id
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aperçu du texte */}
              <div className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-xs font-medium text-gray-700 leading-relaxed italic">
                "{getWhatsAppMessageText(selectedFactureForWhatsApp)}"
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setSelectedFactureForWhatsApp(null)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>

                <button
                  onClick={() => handleSendWhatsApp(selectedFactureForWhatsApp)}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Ouvrir WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL REMBOURSEMENT --- */}
        {selectedFactureForRemb && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleProcessRemb} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                Enregistrer un Remboursement
              </h3>
              <p className="text-xs text-gray-600 font-bold">
                Facture n° {selectedFactureForRemb.numero_facture} • Client : {selectedFactureForRemb.client?.nom}
              </p>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Montant Réglé (FCFA)</label>
                <input
                  type="number"
                  value={montantRemb}
                  onChange={(e) => setMontantRemb(Number(e.target.value))}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-sm font-bold text-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Moyen de Règlement</label>
                <select
                  value={methodeRemb}
                  onChange={(e) => setMethodeRemb(e.target.value as any)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                >
                  <option value="cash">Espèces Cash</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="mtn_momo">MTN MoMo</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFactureForRemb(null)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] text-white font-black text-xs shadow-md"
                >
                  Valider le Remboursement
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
