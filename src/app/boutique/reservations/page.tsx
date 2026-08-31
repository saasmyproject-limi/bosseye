'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  Bookmark,
  Search,
  MessageSquare,
  Package,
  Send,
  X,
  Check
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Reservation, Etablissement, Facture } from '@/types';

export default function BoutiqueReservationsPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResForWhatsApp, setSelectedResForWhatsApp] = useState<Reservation | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<'courtois' | 'fin_de_mois' | 'vip'>('courtois');

  // Modal Solder Réservation
  const [selectedResForSolder, setSelectedResForSolder] = useState<Reservation | null>(null);
  const [montantSolderInput, setMontantSolderInput] = useState<number>(0);
  const [methodeSolder, setMethodeSolder] = useState<'cash' | 'orange_money' | 'mtn_momo'>('cash');
  const [lastCreatedFacture, setLastCreatedFacture] = useState<Facture | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setReservations(offlineDB.getReservations());
    } catch (e) {
      console.error(e);
    }
  };

  const reservationsActives = reservations.filter((r) => r.statut === 'en_attente');
  const totalAcomptesRecus = reservationsActives.reduce((acc, r) => acc + (r.acompte_paye || 0), 0);
  const totalResteASolder = reservationsActives.reduce((acc, r) => acc + (r.reste_a_solder || 0), 0);

  const filteredReservations = reservations.filter((r) => {
    const q = searchQuery.toLowerCase();
    const clientNom = (r.client?.nom || '').toLowerCase();
    const clientPhone = (r.client?.telephone_whatsapp || '').toLowerCase();
    const numRes = (r.numero_reservation || '').toLowerCase();
    return clientNom.includes(q) || clientPhone.includes(q) || numRes.includes(q);
  });

  const getWhatsAppMessageText = (res: Reservation) => {
    const clientNom = res.client?.nom || 'Cher Client';
    const etabNom = etablissement?.nom || 'notre boutique';
    const total = res.montant_total.toLocaleString('fr-FR');
    const acompte = res.acompte_paye.toLocaleString('fr-FR');
    const solde = res.reste_a_solder.toLocaleString('fr-FR');
    const resNum = res.numero_reservation;
    const itemsStr = res.lignes.map((l) => `${l.quantite}x ${l.nom_produit}${l.detail_variante ? ` (${l.detail_variante})` : ''}`).join(', ');

    if (whatsappTemplate === 'fin_de_mois') {
      return `Bonjour ${clientNom}, ${etabNom} vous souhaite un très bon mois ! Votre article (${itemsStr}) est toujours mis de côté sous la réservation #${resNum}. Il vous reste ${solde} FCFA à solder. Merci de nous indiquer quand vous souhaitez passer !`;
    } else if (whatsappTemplate === 'vip') {
      return `Bonjour ${clientNom}, nous vous remercions pour votre confiance auprès de ${etabNom} ! Votre article (${itemsStr}) est prêt et réservé. Pour des raisons d'inventaire, nous vous invitons à venir le récupérer en soldant le restant de ${solde} FCFA. Merci !`;
    }

    return `Bonjour ${clientNom}, ${etabNom} vous informe que votre article (${itemsStr}) est bien réservé et conservé en boutique (Réservation #${resNum}). Après votre acompte de ${acompte} FCFA, il reste ${solde} FCFA à solder lors du retrait. À très bientôt !`;
  };

  const handleSendWhatsApp = (res: Reservation) => {
    const phone = (res.client?.telephone_whatsapp || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(getWhatsAppMessageText(res));
    const url = `https://wa.me/${phone.startsWith('237') ? phone : '237' + phone}?text=${text}`;

    offlineDB.recordReservationWhatsAppRelance(res.id);
    loadData();
    window.open(url, '_blank');
    setSelectedResForWhatsApp(null);
  };

  const handleSolderReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResForSolder) return;

    const fac = offlineDB.solderReservation(selectedResForSolder.id, {
      montant_regle: montantSolderInput || selectedResForSolder.reste_a_solder,
      methode: methodeSolder,
    });

    if (fac) {
      setLastCreatedFacture(fac);
    }

    setSelectedResForSolder(null);
    setMontantSolderInput(0);
    loadData();
  };

  const handleAnnulerReservation = (resId: string) => {
    if (window.confirm('Voulez-vous vraiment annuler cette réservation ? L\'article sera remis dans le stock disponible.')) {
      offlineDB.annulerReservation(resId);
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-[#E2D5C3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              Mises de Côté & Retraits Boutique
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1 flex items-center gap-2">
              <Bookmark className="w-7 h-7 text-[#B8442C]" />
              Réservations d'Articles en Boutique
            </h1>
            <p className="text-xs text-gray-600 font-medium mt-0.5">
              Suivez les articles bloqués et conservés en boutique, gérez les acomptes et relancez vos clients sur WhatsApp pour le retrait.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Rechercher client ou N°..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F3ECE0] border border-[#E2D5C3] rounded-2xl pl-9 pr-4 py-2.5 text-xs font-bold text-[#1B4332] shadow-inner"
            />
          </div>
        </div>

        {/* Dashboard Cards Récapitulatif Réservations */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-[#1B4332] text-white shadow-xl space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E8A33D]">Réservations Actives</span>
            <h2 className="font-serif font-black text-3xl mt-1">
              {reservationsActives.length} article(s)
            </h2>
            <p className="text-[11px] text-emerald-100/80 font-medium">Bloqués et conservés en boutique</p>
          </div>

          <div className="p-5 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-sm space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">Acomptes Déjà Perçus</span>
            <h2 className="font-serif font-black text-2xl text-[#1B4332] mt-1">
              {totalAcomptesRecus.toLocaleString('fr-FR')} FCFA
            </h2>
            <p className="text-[11px] text-gray-500 font-bold">Avances encaissées</p>
          </div>

          <div className="p-5 rounded-3xl bg-[#B8442C] text-white shadow-xl space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Reste à Solder au Retrait</span>
            <h2 className="font-serif font-black text-2xl mt-1">
              {totalResteASolder.toLocaleString('fr-FR')} FCFA
            </h2>
            <p className="text-[11px] opacity-90 font-medium">Montant restant à encaisser au retrait</p>
          </div>
        </div>

        {/* Liste des Réservations */}
        <div className="space-y-4">
          <h2 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
            <Package className="w-5 h-5 text-[#B8442C]" />
            Fiches de Réservation & Articles en Attente de Retrait
          </h2>

          {filteredReservations.length === 0 ? (
            <div className="p-8 text-center bg-[#F3ECE0] rounded-3xl border-2 border-dashed border-[#E2D5C3] space-y-2">
              <Bookmark className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="font-serif font-bold text-base text-[#1B4332]">Aucune réservation trouvée</p>
              <p className="text-xs text-gray-500">Pour réserver un article, ouvrez l'écran de vente boutique et choisissez le mode "Réservation (Mise de Côté)".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReservations.map((res) => {
                const isEnAttente = res.statut === 'en_attente';
                const isSoldee = res.statut === 'soldee_recuperee';

                return (
                  <div
                    key={res.id}
                    className={`bg-[#F3ECE0] border-2 rounded-3xl p-5 shadow-sm space-y-3 relative flex flex-col justify-between ${
                      isEnAttente ? 'border-[#E2D5C3]' : isSoldee ? 'border-emerald-300 opacity-90' : 'border-red-200 opacity-60'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between pb-2 border-b border-[#E2D5C3]">
                        <div>
                          <span className="text-[10px] font-black uppercase text-[#B8442C]">
                            {res.numero_reservation}
                          </span>
                          <h3 className="font-serif font-black text-base text-[#1B4332]">
                            {res.client?.nom || 'Client Inconnu'}
                          </h3>
                          <p className="text-xs text-gray-600 font-bold">📱 {res.client?.telephone_whatsapp || 'Non renseigné'}</p>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                            isEnAttente
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : isSoldee
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-red-100 text-red-900 border-red-300'
                          }`}
                        >
                          {isEnAttente ? '🔖 En Réservation' : isSoldee ? '✓ Soldé & Retiré' : '✕ Annulée'}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-xs space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Article(s) conservé(s) en boutique :</span>
                        {res.lignes.map((l) => (
                          <div key={l.id} className="flex justify-between font-bold text-[#1B4332]">
                            <span>{l.quantite}x {l.nom_produit} {l.detail_variante && `(${l.detail_variante})`}</span>
                            <span>{l.sous_total.toLocaleString('fr-FR')} F</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs p-2.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                        <div>
                          <span className="text-gray-400 font-bold block text-[9px] uppercase">TOTAL</span>
                          <span className="font-black text-[#1B4332] text-xs">{res.montant_total.toLocaleString('fr-FR')} F</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block text-[9px] uppercase">ACOMPTE</span>
                          <span className="font-black text-emerald-800 text-xs">{res.acompte_paye.toLocaleString('fr-FR')} F</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block text-[9px] uppercase">RESTE DÛ</span>
                          <span className="font-black text-[#B8442C] text-xs">{res.reste_a_solder.toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>
                    </div>

                    {isEnAttente && (
                      <div className="pt-3 border-t border-[#E2D5C3] space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedResForWhatsApp(res);
                              setWhatsappTemplate('courtois');
                            }}
                            className="flex-1 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Relancer WhatsApp</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedResForSolder(res);
                              setMontantSolderInput(res.reste_a_solder);
                            }}
                            className="px-3 py-2 rounded-xl bg-[#1B4332] text-white font-bold text-xs flex items-center gap-1 shadow"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Solder & Retirer</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleAnnulerReservation(res.id)}
                          className="w-full text-center text-[11px] font-bold text-red-600 hover:underline pt-1"
                        >
                          ✕ Annuler la réservation & remettre l'article en stock
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal WhatsApp */}
        {selectedResForWhatsApp && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-700" />
                Relance WhatsApp Réservation
              </h3>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-2">Choisir le Ton du Message</label>
                <div className="space-y-2">
                  {[
                    { id: 'courtois', label: '😊 Ton Courtois & Rappel Retrait' },
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

              <div className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-xs font-medium text-gray-700 leading-relaxed italic">
                "{getWhatsAppMessageText(selectedResForWhatsApp)}"
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setSelectedResForWhatsApp(null)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleSendWhatsApp(selectedResForWhatsApp)}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Ouvrir WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Solder Réservation */}
        {selectedResForSolder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleSolderReservation} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                Solder la Réservation & Remettre l'Article
              </h3>

              <p className="text-xs text-gray-600 font-medium">
                Saisissez le montant perçu pour solder la réservation #{selectedResForSolder.numero_reservation} de <strong>{selectedResForSolder.client?.nom}</strong>.
              </p>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Montant Perçu au Retrait (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  value={montantSolderInput}
                  onChange={(e) => setMontantSolderInput(Number(e.target.value))}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-3 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-2">Mode de Règlement</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: '💵 Cash' },
                    { id: 'orange_money', label: '🟧 OM' },
                    { id: 'mtn_momo', label: '🟡 MoMo' },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setMethodeSolder(m.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        methodeSolder === m.id
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedResForSolder(null)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs shadow-md"
                >
                  Valider & Générer Facture Clôturée
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Ticket Facture de Clôture */}
        {lastCreatedFacture && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-center space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="font-serif font-black text-xl text-[#1B4332]">
                Réservation Soldée & Clôturée !
              </h3>
              <p className="text-xs text-gray-600 font-bold">La facture d'achat finale a été générée avec succès.</p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setLastCreatedFacture(null)}
                  className="w-full py-3.5 rounded-2xl bg-[#1B4332] text-white font-black text-xs shadow-md"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
