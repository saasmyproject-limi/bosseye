'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  TrendingDown,
  TrendingUp,
  History,
  AlertTriangle,
  Users,
  Store,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  MessageSquare,
  Building2,
  Calendar,
  Sun,
  Sunset,
  Moon,
  Zap,
  ShoppingBag,
  CreditCard,
  Eye,
  Lock,
  Truck
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB, getTerminology } from '@/lib/offlineDB';
import { Etablissement, Utilisateur, Produit, MouvementStock } from '@/types';

export default function DashboardPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);
  const [lowStockProduits, setLowStockProduits] = useState<Produit[]>([]);
  const [salutation, setSalutation] = useState<string>('Bonjour');

  // Formulaire Mouvement Rapide
  const [selectedProduitId, setSelectedProduitId] = useState<string>('');
  const [typeMvt, setTypeMvt] = useState<'entree' | 'sortie' | 'casse_perte'>('entree');
  const [quantiteInput, setQuantiteInput] = useState<number>(1);
  const [motifInput, setMotifInput] = useState<string>('');
  const [mvtSuccessMsg, setMvtSuccessMsg] = useState<string>('');

  useEffect(() => {
    loadData();

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setSalutation('Bonjour');
    else if (hour >= 12 && hour < 18) setSalutation('Bon après-midi');
    else setSalutation('Bonsoir');
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      const user = offlineDB.getCurrentUser();
      const prods = offlineDB.getProduits();
      const mvts = offlineDB.getMouvements();
      const alertes = offlineDB.getLowStockProducts();

      setEtablissement(etab);
      setCurrentUser(user);
      setProduits(prods);
      setMouvements(mvts.slice(0, 10));
      setLowStockProduits(alertes);

      if (prods.length > 0) {
        setSelectedProduitId(prods[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const term = getTerminology(etablissement?.type_activite);

  const comptabilite = offlineDB.getComptabiliteJournaliere('semaine');
  const facturesCredit = offlineDB.getFactures().filter((f) => f.statut === 'credit_encours');
  const totalCreditedAmount = facturesCredit.reduce((acc, f) => acc + f.montant_restant, 0);

  const daysLeftTrial = etablissement ? offlineDB.getTrialDaysRemaining(etablissement) : 7;
  const isTrialExpired = etablissement ? offlineDB.isTrialExpired(etablissement) : false;

  const isEmploye = currentUser?.role === 'Employé';
  const isPatronRemote = currentUser?.role === 'Patron' && etablissement?.type_activite === 'snack';

  const handleAddMouvementRapide = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProdId = selectedProduitId || (produits[0] ? produits[0].id : '');
    if (!targetProdId || quantiteInput <= 0) return;

    const prod = produits.find((p) => p.id === targetProdId);
    if (!prod) return;

    offlineDB.addMouvementStock({
      produit_id: targetProdId,
      type_mouvement: typeMvt,
      quantite_bouteilles: quantiteInput,
      utilisateur_id: currentUser?.id || 'user-1',
      note_motif: motifInput || `Ajustement rapide ${typeMvt}`,
    });

    setMvtSuccessMsg(`Mouvement de stock enregistré avec succès pour "${prod.nom}" !`);
    setTimeout(() => setMvtSuccessMsg(''), 4000);
    setQuantiteInput(1);
    setMotifInput('');
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        {/* Banner statut abonnement */}
        {isTrialExpired ? (
          <div className="p-4 rounded-2xl bg-red-100 border-2 border-red-300 text-red-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-700" />
              <span className="font-bold text-xs">Période d'essai 7 jours expirée. Veuillez procéder au paiement MoMo.</span>
            </div>
            <Link href="/payer" className="px-3 py-1.5 rounded-xl bg-red-700 text-white font-bold text-xs">
              S'abonner
            </Link>
          </div>
        ) : daysLeftTrial <= 2 ? (
          <div className="p-3 rounded-2xl bg-[#E8A33D]/20 border border-[#E8A33D] text-[#1B4332] flex items-center justify-between text-xs font-bold">
            <span>⏳ Essai gratuit : {daysLeftTrial} jour(s) restant(s).</span>
            <Link href="/payer" className="underline text-[#B8442C]">S'abonner maintenant</Link>
          </div>
        ) : null}

        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#B8442C]" />
              <span className="text-xs font-black uppercase tracking-widest text-[#B8442C]">
                {salutation}, {currentUser?.nom || 'Patron'} !
              </span>
            </div>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Tableau de Bord — {etablissement?.nom}
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              Rôle actif : <strong className="text-[#1B4332] font-bold">{currentUser?.role}</strong>{' '}
              {isPatronRemote && '(Lecture seule à distance)'}
            </p>
          </div>

          <Link
            href="/ventes"
            className="py-3 px-5 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-2"
          >
            <span>Ouvrir {term.salesScreenTitle}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#F3ECE0] border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {isEmploye ? 'Articles Vendus (Semaine)' : 'Chiffre d\'Affaires (7j)'}
            </span>
            <h3 className="font-serif font-black text-2xl text-[#1B4332]">
              {isEmploye ? `${comptabilite.facturesCount} vente(s)` : `${comptabilite.caTotal.toLocaleString('fr-FR')} FCFA`}
            </h3>
            <p className="text-[11px] text-emerald-700 font-bold">✓ {comptabilite.facturesCount} vente(s) enregistrée(s)</p>
          </div>

          {!isEmploye && (
            <div className="bg-[#F3ECE0] border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Marge Brute CMP (7j)</span>
              <h3 className="font-serif font-black text-2xl text-[#1B4332]">
                {comptabilite.margeBrute.toLocaleString('fr-FR')} FCFA
              </h3>
              <p className="text-[11px] text-gray-600 font-bold">Taux moyen: {comptabilite.tauxMargeMoyenne.toFixed(1)}%</p>
            </div>
          )}

          <div className="bg-[#F3ECE0] border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Argent à Récupérer</span>
            <h3 className="font-serif font-black text-2xl text-[#B8442C]">
              {totalCreditedAmount.toLocaleString('fr-FR')} FCFA
            </h3>
            <p className="text-[11px] text-[#B8442C] font-bold">{facturesCredit.length} client(s) à crédit</p>
          </div>

          <div className="bg-[#F3ECE0] border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Alertes Stock Bas</span>
            <h3 className="font-serif font-black text-2xl text-[#1B4332]">
              {lowStockProduits.length} {term.itemLabel}(s)
            </h3>
            <p className="text-[11px] text-amber-800 font-bold">
              {lowStockProduits.length > 0 ? 'Ruptures imminentes' : 'Stock en bon état'}
            </p>
          </div>
        </div>

        {/* Section Suivi des Créances & Manquants Dus sur le Dashboard */}
        {facturesCredit.length > 0 && (
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#B8442C]">Suivi des Crédits</span>
                <h3 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#B8442C]" />
                  Clients Débiteurs (Avances & Manquants Dus)
                </h3>
              </div>
              <Link href="/credits" className="text-xs font-bold text-[#B8442C] hover:underline flex items-center gap-1">
                <span>Voir le volet Crédit complet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {facturesCredit.map((fac) => (
                <div key={fac.id} className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black text-[#B8442C] uppercase">{fac.numero_facture}</span>
                      <h4 className="font-bold text-xs text-[#1B4332] truncate">{fac.client?.nom || 'Client Inconnu'}</h4>
                      <p className="text-[10px] text-gray-500 font-bold">📱 {fac.client?.telephone_whatsapp || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-gray-400 block">MANQUANT DÛ</span>
                      <span className="font-serif font-black text-sm text-[#B8442C]">
                        {fac.montant_restant.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] pt-1.5 border-t border-[#E2D5C3]">
                    <span className="text-gray-500 font-bold">Avance: <strong className="text-emerald-800">{(fac.montant_paye || 0).toLocaleString('fr-FR')} F</strong></span>
                    <span className="text-gray-500 font-bold">Total: <strong className="text-[#1B4332]">{fac.montant_total.toLocaleString('fr-FR')} F</strong></span>
                  </div>

                  <Link
                    href="/credits"
                    className="w-full py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm mt-1"
                  >
                    <span>📱 Relancer WhatsApp</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire de Mouvement de Stock Rapide */}
        <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
            <Package className="w-5 h-5 text-[#B8442C]" />
            Ajustement Rapide du {term.stockLabel}
          </h3>

          {mvtSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs">
              {mvtSuccessMsg}
            </div>
          )}

          <form onSubmit={handleAddMouvementRapide} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Article / Produit</label>
              <select
                value={selectedProduitId}
                onChange={(e) => setSelectedProduitId(e.target.value)}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
              >
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} (Stock: {p.quantite_totale || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Type de Mouvement</label>
              <select
                value={typeMvt}
                onChange={(e) => setTypeMvt(e.target.value as any)}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
              >
                <option value="entree">📥 Entrée Stock (Achat)</option>
                <option value="sortie">📤 Sortie Stock (Vente/Perte)</option>
                <option value="casse_perte">⚠️ Casse / Démarque</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-[#1B4332] block mb-1">Quantité</label>
              <input
                type="number"
                min="1"
                value={quantiteInput}
                onChange={(e) => setQuantiteInput(Number(e.target.value))}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
              >
                Valider Mouvement
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
