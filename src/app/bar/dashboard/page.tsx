'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Beer,
  Package,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Send,
  Lock,
  Plus
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { Etablissement, Utilisateur, Produit, MouvementStock, Facture } from '@/types';

export default function BarDashboardPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);
  const [lowStockProduits, setLowStockProduits] = useState<Produit[]>([]);
  const [salutation, setSalutation] = useState<string>('Bonjour');

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

  const comptabilite = offlineDB.getComptabiliteJournaliere('semaine');
  const facturesCredit = offlineDB.getFactures().filter((f) => f.statut === 'credit_encours' || f.montant_restant > 0);
  const totalCreditedAmount = facturesCredit.reduce((acc, f) => acc + f.montant_restant, 0);

  const daysLeftTrial = etablissement ? offlineDB.getTrialDaysRemaining(etablissement) : 7;
  const isTrialExpired = etablissement ? offlineDB.isTrialExpired(etablissement) : false;

  const isServeuse = currentUser?.role === 'Serveuse';

  const totalCasiers = produits.reduce((acc, p) => acc + (p.casiers_pleins || 0), 0);
  const totalBouteillesVrac = produits.reduce((acc, p) => acc + (p.bouteilles_vrac || 0), 0);

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
      note_motif: motifInput || `Ajustement rapide bar ${typeMvt}`,
    });

    setMvtSuccessMsg(`Mouvement enregistré avec succès pour "${prod.nom}" !`);
    setTimeout(() => setMvtSuccessMsg(''), 4000);
    setQuantiteInput(1);
    setMotifInput('');
    loadData();
  };

  const handleDirectWhatsAppRelance = (fac: Facture) => {
    const clientNom = fac.client?.nom || 'Cher Client';
    const etabNom = etablissement?.nom || 'le Bar';
    const total = fac.montant_total.toLocaleString('fr-FR');
    const avance = (fac.montant_paye || 0).toLocaleString('fr-FR');
    const manquant = fac.montant_restant.toLocaleString('fr-FR');
    const facNum = fac.numero_facture;

    const message = `Bonjour ${clientNom}, ${etabNom} vous rappelle poliment votre ardoise en cours de ${manquant} FCFA sur la consommation #${facNum} (Total: ${total} FCFA). Merci et à très bientôt au Bar !`;
    
    const phone = (fac.client?.telephone_whatsapp || '').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${phone.startsWith('237') ? phone : '237' + phone}?text=${encoded}`;
    
    offlineDB.recordWhatsAppRelance(fac.id);
    loadData();
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        {/* Banner statut abonnement */}
        {!isServeuse && isTrialExpired && (
          <div className="p-4 rounded-2xl bg-red-100 border-2 border-red-300 text-red-950 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-700" />
              <div>
                <p className="font-bold text-xs">Période d'essai expirée</p>
                <p className="text-[11px] opacity-80">Renouvelez votre abonnement pour débloquer toutes les fonctionnalités.</p>
              </div>
            </div>
            <Link href="/commun/payer" className="px-3.5 py-1.5 bg-red-700 text-white rounded-xl text-xs font-bold shadow hover:bg-red-800">
              S'abonner
            </Link>
          </div>
        )}

        {/* Top Greeting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
                🍺 Mode Bar & Lounge
              </span>
              {daysLeftTrial > 0 && !isTrialExpired && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Essai : {daysLeftTrial}j restant{daysLeftTrial > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              {salutation}, {currentUser?.nom || 'Patron'} 👋
            </h1>
            <p className="text-xs text-[#1B4332]/70 font-medium">
              Gestion du plan de tables, suivi des casiers de bières et ardoises clients du Bar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/bar/ventes"
              className="py-3 px-5 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Beer className="w-4 h-4" />
              <span>Gestion des Tables & Factures ➔</span>
            </Link>
          </div>
        </div>

        {/* Grid KPIs Spécifiques Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold">
              💰
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ventes Bar 7j</p>
              <h2 className="font-serif font-black text-2xl sm:text-3xl text-[#1B4332]">
            {comptabilite.caTotal.toLocaleString('fr-FR')} <span className="text-xs font-bold text-gray-500">FCFA</span>
          </h2>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-bold">
              🍺
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Stock Casiers Pleins</p>
              <p className="font-serif font-black text-xl text-[#1B4332]">
                {totalCasiers} <span className="text-xs font-bold text-gray-500">casiers</span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-xl font-bold">
              🍾
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bouteilles au Vrac</p>
              <p className="font-serif font-black text-xl text-[#1B4332]">
                {totalBouteillesVrac} <span className="text-xs font-bold text-gray-500">btl</span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-800 flex items-center justify-center text-xl font-bold">
              💳
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ardoises / Crédits Bar</p>
              <p className="font-serif font-black text-xl text-[#1B4332]">
                {totalCreditedAmount.toLocaleString('fr-FR')} <span className="text-xs font-bold text-gray-500">FCFA</span>
              </p>
            </div>
          </div>
        </div>

        {/* Section Actions Rapides & Stock Alerte */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulaire Mouvement Rapide Bouteilles Bar */}
          <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#B8442C]" />
              <h2 className="font-serif font-black text-lg text-[#1B4332]">Entrée / Sortie Rapide de Bouteilles</h2>
            </div>

            {mvtSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300">
                {mvtSuccessMsg}
              </div>
            )}

            <form onSubmit={handleAddMouvementRapide} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">Boisson / Produit</label>
                <select
                  value={selectedProduitId}
                  onChange={(e) => setSelectedProduitId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] font-bold text-[#1B4332]"
                >
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} ({p.casiers_pleins || 0} casiers, {p.bouteilles_vrac || 0} btl)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">Type Mouvement</label>
                  <select
                    value={typeMvt}
                    onChange={(e) => setTypeMvt(e.target.value as any)}
                    className="w-full p-2.5 text-xs rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] font-bold text-[#1B4332]"
                  >
                    <option value="entree">➕ Entrée Casiers</option>
                    <option value="sortie">➖ Sortie / Consommation</option>
                    <option value="casse_perte">⚠️ Casse / Bouteille Cassée</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">Quantité (Bouteilles)</label>
                  <input
                    type="number"
                    min="1"
                    value={quantiteInput}
                    onChange={(e) => setQuantiteInput(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 text-xs rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">Motif / Note</label>
                <input
                  type="text"
                  placeholder="ex: Réception brasserie, casse en salle..."
                  value={motifInput}
                  onChange={(e) => setMotifInput(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] font-medium text-[#1B4332]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#1B4332] text-white font-black text-xs hover:bg-[#2D6A4F] shadow-md transition-all"
              >
                Enregistrer Mouvement Stock ➔
              </button>
            </form>
          </div>

          {/* Alertes Boissons Bas de Stock */}
          <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h2 className="font-serif font-black text-lg text-[#1B4332]">Boissons à Seuil Critique ({lowStockProduits.length})</h2>
              </div>
              <Link href="/bar/produits" className="text-xs font-bold text-[#B8442C] underline">
                Voir tout le stock ➔
              </Link>
            </div>

            {lowStockProduits.length === 0 ? (
              <div className="p-8 text-center bg-[#FBF7EF] rounded-2xl border border-dashed border-[#E2D5C3]">
                <p className="text-2xl mb-1">🍺</p>
                <p className="font-bold text-xs text-[#1B4332]">Stock de casiers et bouteilles optimal au Bar.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {lowStockProduits.map((p) => (
                  <div key={p.id} className="p-3 rounded-2xl bg-[#FBF7EF] border border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#1B4332]">{p.nom}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Catégorie : {p.categorie}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full text-[11px]">
                        {p.casiers_pleins || 0} casiers + {p.bouteilles_vrac || 0} vrac (total: {p.quantite_totale} btl)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Relances WhatsApp Ardoises Bar */}
        {facturesCredit.length > 0 && (
          <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                <h2 className="font-serif font-black text-lg text-[#1B4332]">Relances Ardoises Bar (WhatsApp Direct)</h2>
              </div>
              <Link href="/bar/credits" className="text-xs font-bold text-[#B8442C] underline">
                Voir toutes les ardoises ➔
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {facturesCredit.slice(0, 6).map((fac) => (
                <div key={fac.id} className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-black text-xs text-[#1B4332]">
                      Client : {fac.client?.nom || 'Inconnu'}
                    </span>
                    <span className="text-[10px] font-black text-[#B8442C] bg-red-100 px-2 py-0.5 rounded-full">
                      -{fac.montant_restant.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Facture #{fac.numero_facture} • Total : {fac.montant_total.toLocaleString('fr-FR')} FCFA
                  </p>
                  <button
                    onClick={() => handleDirectWhatsAppRelance(fac)}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Relancer par WhatsApp</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
