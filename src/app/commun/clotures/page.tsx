'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Lock,
  Calendar,
  CheckCircle2,
  Printer,
  DollarSign,
  TrendingUp,
  CreditCard,
  History,
  Sparkles,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { generateCloturePDF } from '@/lib/pdfGenerator';
import { ClotureJournaliere, ClotureMensuelle, Etablissement, Utilisateur } from '@/types';

import { fetchCloturesFromCloud, saveClotureJournaliereToCloud } from '@/lib/cloturesSyncService';

export default function CloturesPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [cloturesJ, setCloturesJ] = useState<ClotureJournaliere[]>([]);
  const [cloturesM, setCloturesM] = useState<ClotureMensuelle[]>([]);
  const [activeTab, setActiveTab] = useState<'journalieres' | 'mensuelles'>('journalieres');
  const [selectedClotureJ, setSelectedClotureJ] = useState<ClotureJournaliere | null>(null);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const etab = offlineDB.getEtablissement();
      const user = offlineDB.getCurrentUser();
      setEtablissement(etab);
      setCurrentUser(user);

      if (etab?.id) {
        const { clotures: cloudClotures } = await fetchCloturesFromCloud(etab.id);
        setCloturesJ(cloudClotures && cloudClotures.length > 0 ? cloudClotures : offlineDB.getCloturesJournalieres());
      } else {
        setCloturesJ(offlineDB.getCloturesJournalieres());
      }
      setCloturesM(offlineDB.getCloturesMensuelles());
    } catch (e) { console.error(e); }
  };

  const handleCloturerJourneeNow = () => {
    const today = new Date().toISOString().split('T')[0];
    const newCloture = offlineDB.cloturerJournee(today, currentUser?.nom);
    if (newCloture) {
      saveClotureJournaliereToCloud(newCloture);
    }
    setSuccessMsg(`La journée du ${today} a été clôturée et figée avec succès !`);
    setTimeout(() => setSuccessMsg(''), 4000);
    loadData();
  };

  const handleCloturerMoisNow = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const newCloture = offlineDB.cloturerMois(currentMonth, currentUser?.nom);
    setSuccessMsg(`Le mois ${currentMonth} a été clôturé et figé avec succès !`);
    setTimeout(() => setSuccessMsg(''), 4000);
    loadData();
  };

  const handleDownloadPDF = async (cloture: any, type: 'journaliere' | 'mensuelle') => {
    if (!etablissement) return;
    const doc = await generateCloturePDF(etablissement, cloture, type);
    const dateStr = type === 'journaliere' ? cloture.date_cloture : cloture.mois_annee;
    doc.save(`Rapport-Cloture-${type}-${dateStr}.pdf`);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isTodayClotured = cloturesJ.some((c) => c.date_cloture === todayStr);

  const monthStr = new Date().toISOString().slice(0, 7);
  const isMonthClotured = cloturesM.some((c) => c.mois_annee === monthStr);

  return (
    <AppLayout>
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
            Rapports Figés & Clôtures Officieuses
          </span>
          <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
            Clôtures Journalières & Mensuelles Figées
          </h1>
          <p className="text-xs text-[#1B4332]/70 font-medium">
            Générez des rapports quotidiens et mensuels figés (non recalculables) consultables et imprimables à tout moment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCloturerJourneeNow}
            className="py-3 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 border border-[#E8A33D]"
          >
            <Lock className="w-4 h-4 text-[#E8A33D]" />
            <span>Figer la Journée d'Aujourd'hui ➔</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Cartes d'action rapides pour aujourd'hui & ce mois */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Carte Journée */}
        <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#B8442C]" />
              <h2 className="font-serif font-black text-base text-[#1B4332]">Journée en Cours ({todayStr})</h2>
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                isTodayClotured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {isTodayClotured ? '🔒 Clôturée & Figée' : '⏳ En cours'}
            </span>
          </div>

          <p className="text-xs text-gray-600 font-medium">
            Le rapport figé capture l'état exact des ventes, du stock sorti, des encaissements (Cash, Orange Money, MTN MoMo) et des créances de la journée.
          </p>

          <button
            onClick={handleCloturerJourneeNow}
            className="w-full py-3 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-[#E8A33D]" />
            <span>{isTodayClotured ? 'Re-figer / Mettre à jour le Rapport Figé du Jour' : 'Clôturer & Figer la Journée'}</span>
          </button>
        </div>

        {/* Carte Mois */}
        <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-700" />
              <h2 className="font-serif font-black text-base text-[#1B4332]">Mois en Cours ({monthStr})</h2>
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                isMonthClotured ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-900'
              }`}
            >
              {isMonthClotured ? '🔒 Mois Figé' : '⏳ Mois en cours'}
            </span>
          </div>

          <p className="text-xs text-gray-600 font-medium">
            Fige le résultat net comptable du mois (Ventes - Coût CMP des marchandises vendues - Charges du mois = Résultat Net).
          </p>

          <button
            onClick={handleCloturerMoisNow}
            className="w-full py-3 rounded-2xl bg-purple-900 hover:bg-purple-950 text-white font-black text-xs shadow flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-purple-300" />
            <span>{isMonthClotured ? 'Re-figer la Clôture Mensuelle' : 'Figer la Clôture du Mois'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher entre Journalier et Mensuel */}
      <div className="flex items-center gap-2 bg-[#F3ECE0] p-1.5 rounded-2xl border border-[#E2D5C3] w-full sm:w-80">
        <button
          onClick={() => setActiveTab('journalieres')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'journalieres' ? 'bg-[#1B4332] text-white shadow' : 'text-[#1B4332]'
          }`}
        >
          Rapports Journaliers ({cloturesJ.length})
        </button>
        <button
          onClick={() => setActiveTab('mensuelles')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'mensuelles' ? 'bg-[#1B4332] text-white shadow' : 'text-[#1B4332]'
          }`}
        >
          Clôtures Mensuelles ({cloturesM.length})
        </button>
      </div>

      {/* TAB 1: CLÔTURES JOURNALIÈRES FIGÉES */}
      {activeTab === 'journalieres' && (
        <div className="space-y-4">
          {cloturesJ.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-[#E2D5C3] text-gray-500 text-xs font-medium space-y-2">
              <History className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="font-serif font-bold text-base text-[#1B4332]">Aucun rapport quotidien figé pour l'instant</p>
              <p>Cliquez sur "Figer la Journée" pour enregistrer votre premier rapport officiel quotidien.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cloturesJ.map((c) => (
                <div key={c.id} className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#B8442C]" />
                      <h3 className="font-serif font-black text-base text-[#1B4332]">Journée du {c.date_cloture}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">Figé par {c.cree_par}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-600">Total Ventes :</span>
                      <span className="text-[#1B4332]">{c.total_ventes.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-600">Encaissé Cash :</span>
                      <span className="text-emerald-800">{c.total_encaisse_cash.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-600">Encaissé Orange Money :</span>
                      <span className="text-orange-700">{c.total_encaisse_om.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-600">Encaissé MTN MoMo :</span>
                      <span className="text-amber-700">{c.total_encaisse_momo.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-100 pt-1">
                      <span className="text-gray-600">Marge CMP Réalisée :</span>
                      <span className="text-[#B8442C]">+{c.marge_brute_cmp.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-100 pt-1">
                      <span className="text-gray-600">Articles Référencés :</span>
                      <span className="text-gray-800">{c.nombre_articles_differents || 0}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-600">Stock Entré (Jour) :</span>
                      <span className="text-blue-700">+{c.quantite_stock_entre || 0} pcs ({(c.valeur_stock_entre || 0).toLocaleString('fr-FR')} F)</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-600">Stock Sorti (Jour) :</span>
                      <span className="text-amber-800">-{c.quantite_stock_sorti || 0} pcs</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-600">Stock Restant Total :</span>
                      <span className="text-[#1B4332]">{c.quantite_stock_restant_total || 0} pcs</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E2D5C3] grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedClotureJ(c)}
                      className="py-2.5 px-3 rounded-xl bg-[#F3ECE0] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-4 h-4 text-[#B8442C]" />
                      <span>Ticket 🎟️</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPDF(c, 'journaliere')}
                      className="py-2.5 px-3 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      <FileText className="w-4 h-4 text-[#E8A33D]" />
                      <span>Rapport PDF 📄</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLÔTURES MENSUELLES FIGÉES */}
      {activeTab === 'mensuelles' && (
        <div className="space-y-4">
          {cloturesM.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-[#E2D5C3] text-gray-500 text-xs font-medium space-y-2">
              <History className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="font-serif font-bold text-base text-[#1B4332]">Aucune clôture mensuelle figée</p>
              <p>Figez le mois pour conserver l'historique non révisable de votre résultat comptable net.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cloturesM.map((c) => (
                <div key={c.id} className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-700" />
                      <h3 className="font-serif font-black text-lg text-[#1B4332]">Clôture du Mois {c.mois_annee}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">Figé le {new Date(c.fige_le).toLocaleDateString('fr-FR')}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Ventes</span>
                      <span className="font-serif font-black text-base text-[#1B4332]">{c.total_ventes.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Marge Commerciale Brute</span>
                      <span className="font-serif font-black text-base text-emerald-800">+{c.marge_brute_cmp.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Charges du Mois</span>
                      <span className="font-serif font-black text-base text-red-600">-{c.total_charges.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                      <span className="text-[10px] font-bold text-purple-900 uppercase block">Résultat Net Comptable</span>
                      <span className="font-serif font-black text-base text-purple-900">{c.resultat_net.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadPDF(c, 'mensuelle')}
                    className="w-full py-2.5 rounded-xl bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <FileText className="w-4 h-4 text-purple-200" />
                    <span>Télécharger le Rapport Mensuel PDF 📄</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Impression / Consultation Rapport Figé Journalier */}
      {selectedClotureJ && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-left border border-gray-300">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#B8442C]" />
                <h3 className="font-serif font-black text-lg text-[#1B4332]">Consultation Rapport Figé</h3>
              </div>
              <button onClick={() => setSelectedClotureJ(null)} className="text-gray-500 hover:text-black">
                ✕
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl font-mono text-xs space-y-2 border border-gray-200">
              <p className="font-black text-center text-sm text-black">{etablissement?.nom || 'ŒKO COMMERCE'}</p>
              <p className="text-center text-[10px] text-gray-500">RAPPORT FIGÉ — DU {selectedClotureJ.date_cloture}</p>
              <p className="text-[10px] text-gray-500 text-center">Figé le : {new Date(selectedClotureJ.fige_le).toLocaleString('fr-FR')}</p>
              <hr className="border-dashed border-gray-300" />
              <div className="flex justify-between"><span>TOTAL VENTES:</span><strong>{selectedClotureJ.total_ventes.toLocaleString('fr-FR')} F</strong></div>
              <div className="flex justify-between"><span>ENCAISSÉ CASH:</span><strong>{selectedClotureJ.total_encaisse_cash.toLocaleString('fr-FR')} F</strong></div>
              <div className="flex justify-between"><span>ENCAISSÉ ORANGE M:</span><strong>{selectedClotureJ.total_encaisse_om.toLocaleString('fr-FR')} F</strong></div>
              <div className="flex justify-between"><span>ENCAISSÉ MTN MOMO:</span><strong>{selectedClotureJ.total_encaisse_momo.toLocaleString('fr-FR')} F</strong></div>
              <div className="flex justify-between"><span>MARGE BRUTE CMP:</span><strong>+{selectedClotureJ.marge_brute_cmp.toLocaleString('fr-FR')} F</strong></div>
              <div className="flex justify-between"><span>CRÉANCES ACCORDÉES:</span><strong>{selectedClotureJ.creances_accordees_jour.toLocaleString('fr-FR')} F</strong></div>
              <div className="flex justify-between"><span>CRÉANCES RECOUVRÉES:</span><strong>{selectedClotureJ.creances_recouvrees_jour.toLocaleString('fr-FR')} F</strong></div>
              <hr className="border-dashed border-gray-300" />
              <div className="flex justify-between"><span>ARTICLES RÉFÉRENCÉS:</span><strong>{selectedClotureJ.nombre_articles_differents || 0}</strong></div>
              <div className="flex justify-between"><span>STOCK ENTRÉ JOUR:</span><strong>+{selectedClotureJ.quantite_stock_entre || 0} pcs ({(selectedClotureJ.valeur_stock_entre || 0).toLocaleString('fr-FR')} F)</strong></div>
              <div className="flex justify-between"><span>STOCK SORTI JOUR:</span><strong>-{selectedClotureJ.quantite_stock_sorti || 0} pcs</strong></div>
              <div className="flex justify-between"><span>STOCK RESTANT TOTAL:</span><strong>{selectedClotureJ.quantite_stock_restant_total || 0} pcs</strong></div>
              <hr className="border-dashed border-gray-300" />
              <p className="text-[10px] text-center text-gray-500">Logiciel œko — L'œil du patron</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { window.print(); setSelectedClotureJ(null); }}
                className="py-3.5 rounded-2xl bg-[#F3ECE0] text-[#1B4332] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#E2D5C3]"
              >
                <Printer className="w-4 h-4 text-[#B8442C]" />
                <span>Ticket Caissière</span>
              </button>

              <button
                onClick={() => {
                  handleDownloadPDF(selectedClotureJ, 'journaliere');
                  setSelectedClotureJ(null);
                }}
                className="py-3.5 rounded-2xl bg-[#1B4332] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <FileText className="w-4 h-4 text-[#E8A33D]" />
                <span>Rapport PDF 📄</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
