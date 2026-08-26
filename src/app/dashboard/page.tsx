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
  ShoppingBag
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
  const [greetingIcon, setGreetingIcon] = useState<'sun' | 'sunset' | 'moon'>('sun');

  // Formulaire Mouvement Rapide
  const [selectedProduitId, setSelectedProduitId] = useState<string>('');
  const [typeMvt, setTypeMvt] = useState<'entree' | 'sortie' | 'casse_perte'>('entree');
  const [quantiteInput, setQuantiteInput] = useState<number>(1);
  const [motifInput, setMotifInput] = useState<string>('');
  const [mvtSuccessMsg, setMvtSuccessMsg] = useState<string>('');

  useEffect(() => {
    loadData();

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setSalutation('Bonjour');
      setGreetingIcon('sun');
    } else if (hour >= 12 && hour < 18) {
      setSalutation('Bon après-midi');
      setGreetingIcon('sunset');
    } else {
      setSalutation('Bonsoir');
      setGreetingIcon('moon');
    }
  }, []);

  const loadData = () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setCurrentUser(offlineDB.getCurrentUser());
      const prods = offlineDB.getProduits();
      const mvts = offlineDB.getMouvements();
      const lowStock = offlineDB.getLowStockProducts();

      setProduits(prods);
      setMouvements(mvts);
      setLowStockProduits(lowStock);
      if (prods.length > 0) setSelectedProduitId(prods[0].id);
    } catch (e) { console.error(e); }
  };

  const term = getTerminology(etablissement?.type_activite);

  const handleMouvementRapide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduitId || quantiteInput <= 0) return;

    offlineDB.addMouvementStock({
      produit_id: selectedProduitId,
      type_mouvement: typeMvt,
      quantite_bouteilles: quantiteInput,
      utilisateur_id: currentUser?.id || 'user-patron',
      note_motif: motifInput || `Ajustement rapide depuis le Dashboard (${typeMvt})`,
    });

    setMvtSuccessMsg(`Mouvement enregistré avec succès !`);
    setTimeout(() => setMvtSuccessMsg(''), 4000);
    setQuantiteInput(1);
    setMotifInput('');
    loadData();
  };

  // Calculs KPI
  const isBoutique = etablissement?.type_activite === 'boutique';
  const totalProduitsCount = produits.length;
  const totalBouteillesCount = produits.reduce(
    (acc, p) => acc + ((p?.casiers_pleins || 0) * (p?.bouteilles_par_casier || 24) + (p?.bouteilles_vrac || 0) + (p?.quantite_totale || 0)),
    0
  );
  const totalValeurStock = produits.reduce(
    (acc, p) => acc + ((p?.quantite_totale || (p?.casiers_pleins || 0) * 24 + (p?.bouteilles_vrac || 0)) * (p?.prix_vente_unitaire || p?.prix_vente_bouteille || 0)),
    0
  );

  const todayMvts = mouvements.filter((m) => {
    if (!m || !m.created_at) return false;
    const mDate = new Date(m.created_at).toDateString();
    const today = new Date().toDateString();
    return mDate === today;
  });

  const dateFin = etablissement?.date_fin_essai ? new Date(etablissement.date_fin_essai) : new Date();
  const joursRestants = Math.max(0, Math.ceil((dateFin.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-8">
        {/* Header de Bienvenue */}
        <section className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              {greetingIcon === 'sun' && <Sun className="w-5 h-5 text-[#E8A33D]" />}
              {greetingIcon === 'sunset' && <Sunset className="w-5 h-5 text-[#E8A33D]" />}
              {greetingIcon === 'moon' && <Moon className="w-5 h-5 text-[#E8A33D]" />}

              <span className="font-serif font-black text-[#1B4332] text-lg">
                {salutation} {currentUser?.nom || 'Patron'} !
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#1B4332]/10 text-[#1B4332] px-2.5 py-0.5 rounded-full">
                📍 {etablissement?.ville || 'Cameroun'}
              </span>
            </div>

            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] tracking-tight">
              Voici l'état de <span className="text-[#B8442C]">{etablissement?.nom || 'votre établissement'}</span> aujourd'hui.
            </h1>
            <p className="text-xs text-[#1B4332]/80 font-medium max-w-xl">
              Votre tableau de bord récapitule vos stocks, vos mouvements du jour et la valeur estimée de votre inventaire.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 shrink-0">
            <Link
              href="/ventes"
              className="py-3 px-5 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>{term.salesScreenTitle}</span>
            </Link>
          </div>
        </section>

        {/* Grille des 4 Cartes KPI */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Valeur Totale du Stock */}
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">Valeur Totale Stock</span>
              <div className="w-9 h-9 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center font-bold text-sm">
                💰
              </div>
            </div>
            <div className="space-y-0.5">
              <h3 className="font-serif font-black text-2xl text-[#1B4332]">
                {totalValeurStock.toLocaleString('fr-FR')} <span className="text-xs font-sans font-bold">FCFA</span>
              </h3>
              <p className="text-[11px] text-[#2D6A4F] font-bold">Prix de vente public estimé</p>
            </div>
          </div>

          {/* Card 2: Total Pièces / Bouteilles */}
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">Total {term.unitLabel}</span>
              <div className="w-9 h-9 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center font-bold text-sm">
                {isBoutique ? '👗' : '🍺'}
              </div>
            </div>
            <div className="space-y-0.5">
              <h3 className="font-serif font-black text-2xl text-[#1B4332]">
                {totalBouteillesCount} <span className="text-xs font-sans font-bold">{term.unitLabel.toLowerCase()}</span>
              </h3>
              <p className="text-[11px] text-gray-600 font-bold">Répartis sur {totalProduitsCount} références</p>
            </div>
          </div>

          {/* Card 3: Alertes Stock Bas */}
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">Alertes Stock Bas</span>
              <div className="w-9 h-9 rounded-2xl bg-[#B8442C] text-white flex items-center justify-center font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h3 className="font-serif font-black text-2xl text-[#B8442C]">
                {lowStockProduits.length} <span className="text-xs font-sans font-bold">{term.itemLabel.toLowerCase()}(s)</span>
              </h3>
              <p className="text-[11px] text-red-700 font-bold">Stock sous le seuil d'alerte</p>
            </div>
          </div>

          {/* Card 4: Période d'essai / Abonnement */}
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">Statut Compte</span>
              <div className="w-9 h-9 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center font-bold text-sm">
                <Zap className="w-5 h-5 text-[#E8A33D]" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h3 className="font-serif font-black text-2xl text-[#1B4332]">
                {joursRestants} <span className="text-xs font-sans font-bold">jour(s)</span>
              </h3>
              <p className="text-[11px] text-[#2D6A4F] font-bold">Abonnement {etablissement?.statut_abonnement || 'Essai'}</p>
            </div>
          </div>
        </section>

        {/* Section Principale: Grille 2 Colonnes (Alertes & Ajustement Rapide) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonne Gauche: Articles à Recommander Urgent (7 Cols) */}
          <div className="lg:col-span-7 bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D5C3]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#B8442C]" />
                <h2 className="font-serif font-black text-xl text-[#1B4332]">
                  {term.itemsLabel} à Commander d'Urgence
                </h2>
              </div>
              <Link href="/produits" className="text-xs font-bold text-[#B8442C] hover:underline flex items-center gap-1">
                Voir Tout ({produits.length})
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {lowStockProduits.length === 0 ? (
              <div className="py-8 text-center text-gray-500 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <p className="font-bold text-xs">Tous vos stocks sont au-dessus des seuils d'alerte !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProduits.map((p) => {
                  const stockTotal = p.quantite_totale || (p.casiers_pleins || 0) * 24 + (p.bouteilles_vrac || 0);
                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-black text-sm text-[#1B4332]">{p.nom}</h4>
                          <span className="text-[10px] font-black uppercase text-[#B8442C] bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                            {p.categorie}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                          Prix Vente : <strong>{(p.prix_vente_unitaire || p.prix_vente_bouteille || 0).toLocaleString('fr-FR')} FCFA</strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-serif font-black text-base text-red-600 block">
                          {stockTotal} {term.unitSingular.toLowerCase()}(s)
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">Seuil: {p.seuil_alerte}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Colonne Droite: Formulaire Mouvement Rapide (5 Cols) */}
          <div className="lg:col-span-5 bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="pb-3 border-b border-[#E2D5C3]">
              <h2 className="font-serif font-black text-xl text-[#1B4332] flex items-center gap-2">
                <History className="w-5 h-5 text-[#B8442C]" />
                Entrée / Sortie Rapide
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Ajustez votre stock instantanément en cas d'arrivage ou d'avarie.
              </p>
            </div>

            {mvtSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-2">
                ✓ {mvtSuccessMsg}
              </div>
            )}

            <form onSubmit={handleMouvementRapide} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Sélectionner l'article *</label>
                <select
                  value={selectedProduitId}
                  onChange={(e) => setSelectedProduitId(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
                >
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} ({p.quantite_totale || (p.casiers_pleins || 0) * 24 + (p.bouteilles_vrac || 0)} en stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Type de Mouvement</label>
                  <select
                    value={typeMvt}
                    onChange={(e) => setTypeMvt(e.target.value as any)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
                  >
                    <option value="entree">➕ Entrée Stock</option>
                    <option value="sortie">➖ Sortie / Vente</option>
                    <option value="casse_perte">⚠️ Casse / Perte</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Quantité ({term.unitLabel})</label>
                  <input
                    type="number"
                    min="1"
                    value={quantiteInput}
                    onChange={(e) => setQuantiteInput(Number(e.target.value))}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Note / Motif (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Arrivage Brasserie, Erreur de comptage..."
                  value={motifInput}
                  onChange={(e) => setMotifInput(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md transition-transform active:scale-95"
              >
                💾 Valider le Mouvement de Stock
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
