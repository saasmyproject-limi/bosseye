'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Plus,
  Minus,
  CheckCircle2,
  RefreshCcw,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Clock,
  Wine,
  CreditCard,
  Building2,
  Users,
  ShieldCheck,
  ChevronRight,
  Sun,
  Moon,
  Sunset
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { Produit, MouvementStock, Utilisateur, Etablissement } from '@/types';

export default function DashboardPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);
  const [lowStockProduits, setLowStockProduits] = useState<Produit[]>([]);

  // Modal Saisie Mouvement Rapide
  const [isMvtModalOpen, setIsMvtModalOpen] = useState(false);
  const [mvtType, setMvtType] = useState<'entree' | 'sortie' | 'casse_perte'>('entree');
  const [mvtProduitId, setMvtProduitId] = useState('');
  const [mvtQty, setMvtQty] = useState(1);
  const [mvtMotif, setMvtMotif] = useState('');

  // Salutation temporelle
  const [salutation, setSalutation] = useState('Bonjour');
  const [greetingIcon, setGreetingIcon] = useState<'sun' | 'sunset' | 'moon'>('sun');

  useEffect(() => {
    loadData();

    // Calcul de la salutation en fonction de l'heure
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
    setEtablissement(offlineDB.getEtablissement());
    setCurrentUser(offlineDB.getCurrentUser());
    const prods = offlineDB.getProduits();
    const mvts = offlineDB.getMouvements();
    const lowStock = offlineDB.getLowStockProducts();

    setProduits(prods);
    setMouvements(mvts);
    setLowStockProduits(lowStock);

    if (prods.length > 0 && !mvtProduitId) {
      setMvtProduitId(prods[0].id);
    }
  };

  const handleOpenMvtModal = (type: 'entree' | 'sortie' | 'casse_perte') => {
    setMvtType(type);
    setMvtQty(1);
    setMvtMotif(type === 'entree' ? 'Livraison Fournisseur' : type === 'sortie' ? 'Vente au Bar' : 'Casse au service');
    setIsMvtModalOpen(true);
  };

  const handleSaveMouvement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mvtProduitId || !mvtQty) return;

    offlineDB.addMouvementStock({
      produit_id: mvtProduitId,
      type_mouvement: mvtType,
      quantite_bouteilles: Number(mvtQty),
      note_motif: mvtMotif,
    });

    loadData();
    setIsMvtModalOpen(false);
  };

  // Calculs KPI
  const totalProduitsCount = produits.length;
  const totalBouteillesCount = produits.reduce(
    (acc, p) => acc + (p.casiers_pleins * p.bouteilles_par_casier + p.bouteilles_vrac),
    0
  );
  const totalValeurStock = produits.reduce(
    (acc, p) => acc + (p.casiers_pleins * p.prix_achat_casier + (p.bouteilles_vrac * p.prix_vente_bouteille)),
    0
  );

  // Mouvements aujourd'hui
  const todayMvts = mouvements.filter((m) => {
    const mDate = new Date(m.created_at).toDateString();
    const today = new Date().toDateString();
    return mDate === today;
  });

  // Calcul jours d'essai ou d'abonnement restants
  const dateFin = etablissement ? new Date(etablissement.date_fin_essai) : new Date();
  const joursRestants = Math.max(0, Math.ceil((dateFin.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
        {/* 1. EN-TÊTE PERSONNALISÉ & SALUTATION CHALEUREUSE */}
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-3 py-1 rounded-full border border-[#B8442C]/20 flex items-center gap-1.5">
                {greetingIcon === 'sun' && <Sun className="w-3.5 h-3.5 text-[#E8A33D]" />}
                {greetingIcon === 'sunset' && <Sunset className="w-3.5 h-3.5 text-[#E8A33D]" />}
                {greetingIcon === 'moon' && <Moon className="w-3.5 h-3.5 text-[#E8A33D]" />}
                <span>{salutation} {currentUser?.nom || 'Patron'}</span>
              </span>

              <span className="text-xs font-bold text-[#2D6A4F] bg-[#1B4332]/10 px-3 py-1 rounded-full border border-[#1B4332]/20">
                📍 {etablissement?.ville || 'Cameroun'}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#1B4332] tracking-tight">
              Voici l'état de <span className="text-[#B8442C]">{etablissement?.nom || 'votre établissement'}</span> aujourd'hui
            </h1>
            <p className="text-xs sm:text-sm text-[#1B4332]/80 font-medium">
              Tout est à jour. Vos serveuses et gérants ont enregistré <strong className="text-[#1B4332] font-black">{todayMvts.length || mouvements.length} mouvements</strong> récents.
            </p>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 relative z-10 w-full sm:w-auto">
            <button
              onClick={() => handleOpenMvtModal('entree')}
              className="flex-1 sm:flex-none py-3 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#E8A33D]" />
              <span>+ Entrée Stock</span>
            </button>

            <button
              onClick={() => handleOpenMvtModal('sortie')}
              className="flex-1 sm:flex-none py-3 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-glow-brique transition-transform active:scale-95"
            >
              <Minus className="w-4 h-4 text-white" />
              <span>- Vente / Sortie</span>
            </button>

            <button
              onClick={() => handleOpenMvtModal('casse_perte')}
              className="py-3 px-4 rounded-2xl bg-[#FBF7EF] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#B8442C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-[#B8442C]" />
              <span>Casse</span>
            </button>
          </div>
        </div>

        {/* 2. CARTES RÉSUMÉ AÉRÉES (4 KPIS VISUELS CHALEUREUX) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Card 1: Valeur Totale du Stock */}
          <div className="p-6 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card hover:border-[#1B4332] transition-all relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#1B4332]/70 uppercase tracking-wider">Valeur du Stock</span>
              <span className="w-10 h-10 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center font-black text-sm shadow-sm">
                FCFA
              </span>
            </div>
            <h3 className="font-serif text-3xl font-black text-[#1B4332]">
              {totalValeurStock.toLocaleString('fr-FR')} <span className="text-sm font-sans font-bold text-[#1B4332]/70">F</span>
            </h3>
            <p className="text-xs text-[#2D6A4F] font-bold mt-2 flex items-center gap-1">
              <span>📦 {totalBouteillesCount} bouteilles</span> • <span>{totalProduitsCount} boissons</span>
            </p>
          </div>

          {/* Card 2: Produits en Alerta (Stock Bas) */}
          <div className={`p-6 rounded-3xl border shadow-card transition-all relative overflow-hidden ${
            lowStockProduits.length > 0
              ? 'bg-[#FFF9EE] border-[#E8A33D] shadow-glow'
              : 'bg-[#F3ECE0] border-[#E2D5C3]'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#1B4332]/70 uppercase tracking-wider">À Recommander</span>
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                lowStockProduits.length > 0 ? 'bg-[#E8A33D] text-[#0F291E]' : 'bg-[#1B4332]/10 text-[#1B4332]'
              }`}>
                ⚠️
              </span>
            </div>
            <h3 className={`font-serif text-3xl font-black ${lowStockProduits.length > 0 ? 'text-[#B8442C]' : 'text-[#2D6A4F]'}`}>
              {lowStockProduits.length} <span className="text-sm font-sans font-bold text-[#1B4332]/70">boisson(s)</span>
            </h3>
            <p className="text-xs text-[#1B4332]/80 font-bold mt-2">
              {lowStockProduits.length > 0 ? 'Sous le seuil d\'alerte défini' : '✅ Aucun réapprovisionnement urgent'}
            </p>
          </div>

          {/* Card 3: Mouvements Aujourd'hui */}
          <div className="p-6 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card hover:border-[#1B4332] transition-all relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#1B4332]/70 uppercase tracking-wider">Mouvements Aujourd'hui</span>
              <span className="w-10 h-10 rounded-2xl bg-[#E8A33D]/20 text-[#1B4332] flex items-center justify-center font-black text-sm shadow-sm">
                🔄
              </span>
            </div>
            <h3 className="font-serif text-3xl font-black text-[#1B4332]">
              {todayMvts.length || mouvements.length} <span className="text-sm font-sans font-bold text-[#1B4332]/70">saisies</span>
            </h3>
            <p className="text-xs text-[#2D6A4F] font-bold mt-2">
              Enregistrés par vos serveuses & gérants
            </p>
          </div>

          {/* Card 4: Statut Abonnement */}
          <div className="p-6 rounded-3xl bg-[#0F291E] text-white border-2 border-[#E8A33D]/40 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Abonnement</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8A33D] text-[#0F291E] text-[10px] font-black uppercase">
                  {etablissement?.statut_abonnement || 'Essai'}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-black text-[#E8A33D]">
                {joursRestants} <span className="text-sm font-sans font-bold text-gray-200">jours restants</span>
              </h3>
            </div>

            <Link
              href="/payer"
              className="mt-3 pt-2 border-t border-[#2D6A4F] text-xs font-bold text-[#E8A33D] hover:underline flex items-center justify-between"
            >
              <span>Prolonger par MoMo / OM</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 3. SECTION PRODUITS À REAPPROVISIONNER & RECENT ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Left Column: Actionable Low Stock List */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-1 rounded-full border border-[#B8442C]/20">
                    Plan d'Action Réapprovisionnement
                  </span>
                  <h3 className="font-serif font-black text-xl text-[#1B4332] mt-1">
                    Boissons à commander aux brasseries
                  </h3>
                </div>

                <Link
                  href="/produits"
                  className="text-xs font-bold text-[#1B4332] hover:text-[#B8442C] flex items-center gap-1 transition-colors"
                >
                  <span>Voir le catalogue</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {lowStockProduits.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#FBF7EF] border border-[#2D6A4F]/30 text-center space-y-2">
                  <div className="text-2xl">🎉</div>
                  <h4 className="font-bold text-sm text-[#1B4332]">Votre stock est parfaitement approvisionné !</h4>
                  <p className="text-xs text-[#2D6A4F] font-medium">Toutes vos boissons sont au-dessus de leur seuil d'alerte.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockProduits.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] hover:border-[#E8A33D] transition-all flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-[#E8A33D]/20 text-[#1B4332] flex items-center justify-center font-bold text-lg">
                          🍺
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1B4332]">{p.nom}</h4>
                          <p className="text-xs text-[#1B4332]/70 font-semibold">
                            Reste : <strong className="text-[#B8442C]">{p.casiers_pleins} casier(s) + {p.bouteilles_vrac} vrac ({p.quantite_totale_bouteilles}b)</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setMvtProduitId(p.id);
                          handleOpenMvtModal('entree');
                        }}
                        className="py-2 px-3 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#E8A33D]" />
                        <span>Commander</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2D5C3] text-center">
              <span className="text-xs text-[#1B4332]/70 font-medium">
                💡 Astuce : Les alertes se mettent à jour automatiquement dès qu'une serveuse saisit une sortie par son PIN.
              </span>
            </div>
          </div>

          {/* Right Column: Humanized Activity Timeline Feed */}
          <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2D6A4F] bg-[#1B4332]/10 px-2.5 py-1 rounded-full border border-[#1B4332]/20">
                    Fil d'Actualité Serveuses & Gérants
                  </span>
                  <h3 className="font-serif font-black text-xl text-[#1B4332] mt-1">
                    Dernières activités au bar
                  </h3>
                </div>

                <Link
                  href="/mouvements"
                  className="text-xs font-bold text-[#1B4332] hover:text-[#B8442C] flex items-center gap-1 transition-colors"
                >
                  <span>Tout l'historique</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Activity List */}
              <div className="space-y-4">
                {mouvements.slice(0, 5).map((m) => {
                  const timeStr = new Date(m.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#1B4332] shrink-0">
                        {m.utilisateur?.photo_url ? (
                          <img src={m.utilisateur.photo_url} alt={m.utilisateur.nom} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-xs">
                            {m.utilisateur?.nom[0] || 'U'}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-[#1B4332]">
                            {m.utilisateur?.nom || 'Employé'} <span className="text-[10px] text-[#2D6A4F] font-normal">({m.utilisateur?.role})</span>
                          </h4>
                          <span className="text-[10px] font-bold text-gray-500">{timeStr}</span>
                        </div>

                        <p className="text-xs text-[#1B4332]/80 mt-0.5">
                          {m.type_mouvement === 'entree' ? (
                            <span className="text-[#2D6A4F] font-bold">➕ Entrée : +{m.quantite_bouteilles} {m.produit?.nom}</span>
                          ) : m.type_mouvement === 'sortie' ? (
                            <span className="text-[#B8442C] font-bold">➖ Vente : -{m.quantite_bouteilles} {m.produit?.nom}</span>
                          ) : (
                            <span className="text-[#E8A33D] font-bold">⚠️ Casse : -{m.quantite_bouteilles} {m.produit?.nom}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500 italic mt-0.5">{m.note_motif}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2D5C3] text-center">
              <span className="text-xs text-[#2D6A4F] font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
                Traçabilité 100% garantie avec les PINs individuels
              </span>
            </div>
          </div>
        </div>

        {/* 4. BANNIÈRE DE SÉRÉNITÉ & ENCOURAGEMENT EN BAS */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#1B4332] via-[#0F291E] to-[#1B4332] text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#E8A33D]/20 text-[#E8A33D] flex items-center justify-center font-bold text-2xl shrink-0">
              ✨
            </div>
            <div>
              <h3 className="font-serif font-black text-lg text-white">
                Tout est sous contrôle dans votre établissement !
              </h3>
              <p className="text-xs text-gray-200 font-medium">
                Vos données de stock sont sauvegardées localement et synchronisées en toute sécurité.
              </p>
            </div>
          </div>

          <Link
            href="/produits"
            className="py-3 px-6 rounded-2xl bg-[#E8A33D] hover:bg-[#D4922D] text-[#0F291E] font-black text-xs whitespace-nowrap shadow-md transition-transform active:scale-95"
          >
            Gérer mon catalogue →
          </Link>
        </div>
      </main>

      {/* MODAL SAISIE DE MOUVEMENT RAPIDE */}
      {isMvtModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsMvtModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black p-1.5 rounded-full bg-[#FBF7EF]"
            >
              ✕
            </button>

            <h2 className="font-serif text-xl font-black text-[#1B4332] mb-1">
              {mvtType === 'entree' ? '➕ Entrée de Stock (Livraison)' : mvtType === 'sortie' ? '➖ Sortie / Vente' : '⚠️ Casse / Perte'}
            </h2>
            <p className="text-xs text-[#1B4332]/70 mb-4 font-medium">
              Ce mouvement sera enregistré immédiatement dans l'inventaire.
            </p>

            <form onSubmit={handleSaveMouvement} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Boisson concernée *</label>
                <select
                  value={mvtProduitId}
                  onChange={(e) => setMvtProduitId(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                >
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} (Stock: {p.casiers_pleins}c + {p.bouteilles_vrac}b)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Quantité de Bouteilles *</label>
                <input
                  type="number"
                  min="1"
                  value={mvtQty}
                  onChange={(e) => setMvtQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-black text-base focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Motif / Note *</label>
                <input
                  type="text"
                  placeholder="Ex: Livraison Brasseries..."
                  value={mvtMotif}
                  onChange={(e) => setMvtMotif(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-xs focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-base shadow-glow-brique transition-transform active:scale-95"
              >
                Enregistrer le Mouvement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
