'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  UserCheck,
  UserPlus,
  RefreshCcw,
  ShieldAlert,
  Smartphone,
  Check,
  ChevronRight
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { Facture, Client, Etablissement, Produit } from '@/types';

export default function CreditsPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [facturesCredit, setFacturesCredit] = useState<Facture[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [search, setSearch] = useState('');

  // Modal Nouveau Client
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientNom, setClientNom] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientQuartier, setClientQuartier] = useState('');

  // Modal Relance WhatsApp
  const [selectedFactureForRelance, setSelectedFactureForRelance] = useState<Facture | null>(null);
  const [relanceVariant, setRelanceVariant] = useState<'amicale' | 'vip' | 'directe'>('amicale');

  // Modal Remboursement
  const [selectedFactureForRemb, setSelectedFactureForRemb] = useState<Facture | null>(null);
  const [rembMontant, setRembMontant] = useState(0);
  const [rembMethode, setRembMethode] = useState<'cash' | 'orange_money' | 'mtn_momo'>('cash');
  const [rembNote, setRembNote] = useState('');

  // Modal Nouvelle Vente à Crédit
  const [isNewVenteModalOpen, setIsNewVenteModalOpen] = useState(false);
  const [venteClientId, setVenteClientId] = useState('');
  const [venteProduitId, setVenteProduitId] = useState('');
  const [venteQty, setVenteQty] = useState(1);
  const [venteAcompte, setVenteAcompte] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setEtablissement(offlineDB.getEtablissement());
    const allFacs = offlineDB.getFactures();
    const credFacs = allFacs.filter((f) => f.statut === 'credit_encours' && f.montant_restant > 0);
    const cls = offlineDB.getClients();
    const prods = offlineDB.getProduits();

    setFacturesCredit(credFacs);
    setClients(cls);
    setProduits(prods);

    if (cls.length > 0 && !venteClientId) {
      setVenteClientId(cls[0].id);
    }
    if (prods.length > 0 && !venteProduitId) {
      setVenteProduitId(prods[0].id);
    }
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientNom.trim() || !clientPhone.trim()) return;

    offlineDB.addClient({
      nom: clientNom.trim(),
      telephone_whatsapp: clientPhone.trim(),
      note_quartier: clientQuartier.trim(),
    });

    setClientNom('');
    setClientPhone('');
    setClientQuartier('');
    setIsClientModalOpen(false);
    loadData();
  };

  const handleSaveVenteCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!venteProduitId || !venteQty) return;

    offlineDB.createFacture({
      client_id: venteClientId || undefined,
      mode_paiement: 'credit',
      montant_paye: Number(venteAcompte) || 0,
      lignes: [{ produit_id: venteProduitId, quantite_bouteilles: Number(venteQty) }],
    });

    setIsNewVenteModalOpen(false);
    loadData();
  };

  const handleProcessRemboursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactureForRemb || !rembMontant) return;

    offlineDB.processRemboursementCredit({
      facture_id: selectedFactureForRemb.id,
      montant_regle: Number(rembMontant),
      methode: rembMethode,
      note_reference: rembNote.trim() || 'Règlement crédit',
    });

    setSelectedFactureForRemb(null);
    loadData();
  };

  const handleSendWhatsAppRelance = () => {
    if (!selectedFactureForRelance || !selectedFactureForRelance.client) return;

    const c = selectedFactureForRelance.client;
    const barNom = etablissement?.nom || 'notre établissement';
    const dateStr = new Date(selectedFactureForRelance.created_at).toLocaleDateString('fr-FR');
    const montantRestantStr = selectedFactureForRelance.montant_restant.toLocaleString('fr-FR');

    let text = '';

    if (relanceVariant === 'amicale') {
      text = `Bonjour ${c.nom}, j'espère que vous allez bien ! Petit rappel amical de la part du ${barNom} concernant votre note de ${montantRestantStr} FCFA du ${dateStr}. Merci beaucoup pour votre fidélité et excellente journée à vous ! 🍺`;
    } else if (relanceVariant === 'vip') {
      text = `Salut ${c.nom}, c'est le gérant du ${barNom}. Juste un petit point rapide sur le compte : il reste ${montantRestantStr} FCFA sur la consommation du ${dateStr}. Dis-moi quand tu penses passer ou si tu préfères un transfert Mobile Money (Orange/MTN). À très vite !`;
    } else {
      text = `Bonjour ${c.nom}, nous vous remercions pour votre confiance au ${barNom}. Pour information, le solde restant dû sur la facture n°${selectedFactureForRelance.numero_facture} est de ${montantRestantStr} FCFA. Règlement possible par Mobile Money ou au comptoir. Cordialement !`;
    }

    // Format numéro WhatsApp international 237
    let phone = c.telephone_whatsapp.replace(/[^0-9]/g, '');
    if (phone.length === 9) phone = '237' + phone;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

    // Enregistrer l'horodatage de l'action
    offlineDB.recordWhatsAppRelance(selectedFactureForRelance.id);

    window.open(url, '_blank');
    setSelectedFactureForRelance(null);
    loadData();
  };

  // KPIs
  const totalDettes = facturesCredit.reduce((acc, f) => acc + f.montant_restant, 0);
  const uniqueDebteursCount = new Set(facturesCredit.map((f) => f.client_id)).size;
  const relancesSentCount = facturesCredit.reduce((acc, f) => acc + (f.compteur_relances || 0), 0);

  const filteredFactures = facturesCredit.filter((f) => {
    const clientNomMatch = f.client?.nom.toLowerCase().includes(search.toLowerCase());
    const numFacMatch = f.numero_facture.toLowerCase().includes(search.toLowerCase());
    return clientNomMatch || numFacMatch;
  });

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E2D5C3]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-1 rounded-full border border-[#B8442C]/20">
              Gestion du Carnet de Dettes
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#1B4332] mt-1">
              Crédits Clients & Relances WhatsApp
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-[#F3ECE0] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-[#1B4332]" />
              <span>+ Nouveau Client VIP</span>
            </button>

            <button
              onClick={() => setIsNewVenteModalOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-bold text-xs flex items-center gap-1.5 shadow-glow-brique transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Vente à Crédit</span>
            </button>
          </div>
        </div>

        {/* 1. TOP CREDIT KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {/* Card 1: Total Dettes */}
          <div className="p-6 rounded-3xl bg-[#FFF9EE] border-2 border-[#E8A33D] shadow-card">
            <span className="text-xs font-bold text-[#1B4332]/70 uppercase tracking-wider block mb-2">Total Crédits en Cours</span>
            <h3 className="font-serif text-3xl font-black text-[#B8442C]">
              {totalDettes.toLocaleString('fr-FR')} <span className="text-sm font-sans font-bold text-[#1B4332]/70">FCFA</span>
            </h3>
            <p className="text-xs text-[#1B4332]/80 font-bold mt-2">
              À recouvrer auprès de vos clients réguliers
            </p>
          </div>

          {/* Card 2: Clients Débiteurs */}
          <div className="p-6 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card">
            <span className="text-xs font-bold text-[#1B4332]/70 uppercase tracking-wider block mb-2">Clients Débiteurs</span>
            <h3 className="font-serif text-3xl font-black text-[#1B4332]">
              {uniqueDebteursCount} <span className="text-sm font-sans font-bold text-[#1B4332]/70">client(s)</span>
            </h3>
            <p className="text-xs text-[#2D6A4F] font-bold mt-2">
              Fiches WhatsApp enregistrées
            </p>
          </div>

          {/* Card 3: Relances Effectuées */}
          <div className="p-6 rounded-3xl bg-[#0F291E] text-white border-2 border-[#E8A33D]/40 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">Relances WhatsApp</span>
              <h3 className="font-serif text-3xl font-black text-[#E8A33D]">
                {relancesSentCount} <span className="text-sm font-sans font-bold text-gray-200">envoyées</span>
              </h3>
            </div>
            <p className="text-xs text-gray-300 font-medium mt-2 pt-2 border-t border-[#2D6A4F]">
              💬 Relance polie en 1-clic via wa.me
            </p>
          </div>
        </div>

        {/* 2. RECHERCHE & LISTE DES CRÉDITS CLIENTS */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-serif font-black text-xl text-[#1B4332]">Factures à Crédit ({filteredFactures.length})</h3>
              <p className="text-xs text-[#1B4332]/70 font-medium">Fiches de crédit avec relance directe sur WhatsApp</p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Rechercher un client ou n° facture..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl py-2.5 pl-10 pr-4 text-xs text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
              />
            </div>
          </div>

          {filteredFactures.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FBF7EF] border border-[#2D6A4F]/30 text-center space-y-2">
              <div className="text-3xl">🎉</div>
              <h4 className="font-serif font-bold text-base text-[#1B4332]">Aucun crédit en cours pour le moment !</h4>
              <p className="text-xs text-[#2D6A4F] font-medium">Toutes vos consommations sont réglées au comptoir.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFactures.map((f) => {
                const client = f.client;
                const createdDate = new Date(f.created_at);
                const joursEcoules = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
                const dateStr = createdDate.toLocaleDateString('fr-FR');

                const derniereRelanceStr = f.date_derniere_relance_whatsapp
                  ? new Date(f.date_derniere_relance_whatsapp).toLocaleDateString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                  : null;

                return (
                  <div
                    key={f.id}
                    className="p-5 rounded-3xl bg-[#FBF7EF] border-2 border-[#E2D5C3] hover:border-[#1B4332] transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    {/* Left Info Client & Note */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center font-black text-base shadow-sm">
                          {client?.nom[0] || 'C'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif font-black text-lg text-[#1B4332]">{client?.nom || 'Client Inconnu'}</h4>
                            <span className="text-[10px] font-black uppercase text-[#B8442C] bg-[#B8442C]/10 px-2 py-0.5 rounded-full border border-[#B8442C]/20">
                              {joursEcoules === 0 ? "Aujourd'hui" : `Dette depuis ${joursEcoules}j`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 font-medium">
                            📱 WhatsApp : <strong className="text-[#1B4332]">{client?.telephone_whatsapp}</strong> {client?.note_quartier ? `• ${client.note_quartier}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Detail Consommation */}
                      <div className="p-3 rounded-2xl bg-[#F3ECE0] border border-[#E2D5C3] text-xs text-[#1B4332]">
                        <span className="font-bold font-mono text-[#1B4332]">{f.numero_facture}</span> du {dateStr} :{' '}
                        {f.lignes ? (
                          <span>
                            {f.lignes.map((l) => `${l.quantite_bouteilles}x ${l.nom_produit}`).join(', ')}
                          </span>
                        ) : (
                          <span>Consommation au bar</span>
                        )}
                      </div>
                    </div>

                    {/* Middle Financial Dues */}
                    <div className="text-left md:text-right space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Reste à Régler</span>
                      <span className="font-serif text-3xl font-black text-[#B8442C]">
                        {f.montant_restant.toLocaleString('fr-FR')} <span className="text-sm font-sans font-bold text-gray-600">FCFA</span>
                      </span>
                      <span className="text-[11px] text-gray-500 block">
                        Total : {f.montant_total.toLocaleString('fr-FR')} F (Acompte : {f.montant_paye.toLocaleString('fr-FR')} F)
                      </span>
                    </div>

                    {/* Right Actions: Relance WhatsApp & Remboursement */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                      <button
                        onClick={() => setSelectedFactureForRelance(f)}
                        className="py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-black font-black text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
                      >
                        <MessageSquare className="w-4 h-4 fill-black text-black" />
                        <span>💬 Relancer WhatsApp</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedFactureForRemb(f);
                          setRembMontant(f.montant_restant);
                        }}
                        className="py-3 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95"
                      >
                        <DollarSign className="w-4 h-4 text-[#E8A33D]" />
                        <span>Encaisse Remboursement</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODAL RELANCE WHATSAPP AVEC 3 VARIANTES POLIES */}
      {selectedFactureForRelance && selectedFactureForRelance.client && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setSelectedFactureForRelance(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black p-1.5 rounded-full bg-[#FBF7EF]"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-9 h-9 rounded-2xl bg-[#25D366] text-black flex items-center justify-center font-black">💬</span>
              <div>
                <h2 className="font-serif text-xl font-black text-[#1B4332]">Relance Polie par WhatsApp</h2>
                <p className="text-xs text-[#1B4332]/70 font-medium">Pour {selectedFactureForRelance.client.nom} ({selectedFactureForRelance.montant_restant.toLocaleString('fr-FR')} FCFA)</p>
              </div>
            </div>

            <div className="space-y-4 my-6">
              <label className="text-xs font-bold text-[#1B4332] block">Choisissez la variante du message :</label>

              {/* Variant 1: Amicale */}
              <div
                onClick={() => setRelanceVariant('amicale')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  relanceVariant === 'amicale'
                    ? 'bg-[#FBF7EF] border-[#1B4332] shadow-md'
                    : 'bg-[#FBF7EF]/50 border-[#E2D5C3]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#1B4332]">😊 Variante 1 : Amicale & Respectueuse (Recommandée)</span>
                  {relanceVariant === 'amicale' && <Check className="w-4 h-4 text-[#2D6A4F]" />}
                </div>
                <p className="text-xs text-gray-600 italic">
                  "Bonjour {selectedFactureForRelance.client.nom}, j'espère que vous allez bien ! Petit rappel amical de la part du {etablissement?.nom} concernant votre note de {selectedFactureForRelance.montant_restant.toLocaleString('fr-FR')} FCFA. Merci beaucoup et excellente journée ! 🍺"
                </p>
              </div>

              {/* Variant 2: VIP / Conviviale */}
              <div
                onClick={() => setRelanceVariant('vip')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  relanceVariant === 'vip'
                    ? 'bg-[#FBF7EF] border-[#1B4332] shadow-md'
                    : 'bg-[#FBF7EF]/50 border-[#E2D5C3]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#1B4332]">🤝 Variante 2 : VIP & Conviviale</span>
                  {relanceVariant === 'vip' && <Check className="w-4 h-4 text-[#2D6A4F]" />}
                </div>
                <p className="text-xs text-gray-600 italic">
                  "Salut {selectedFactureForRelance.client.nom}, c'est le gérant du {etablissement?.nom}. Juste un petit point rapide sur le compte : il reste {selectedFactureForRelance.montant_restant.toLocaleString('fr-FR')} FCFA. Dis-moi quand tu penses passer ou si tu préfères un transfert MoMo. À très vite !"
                </p>
              </div>

              {/* Variant 3: Directe */}
              <div
                onClick={() => setRelanceVariant('directe')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  relanceVariant === 'directe'
                    ? 'bg-[#FBF7EF] border-[#1B4332] shadow-md'
                    : 'bg-[#FBF7EF]/50 border-[#E2D5C3]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#1B4332]">📜 Variante 3 : Directe & Professionnelle</span>
                  {relanceVariant === 'directe' && <Check className="w-4 h-4 text-[#2D6A4F]" />}
                </div>
                <p className="text-xs text-gray-600 italic">
                  "Bonjour {selectedFactureForRelance.client.nom}, nous vous remercions pour votre confiance. Pour information, le solde restant dû sur la facture n°{selectedFactureForRelance.numero_facture} est de {selectedFactureForRelance.montant_restant.toLocaleString('fr-FR')} FCFA. Règlement possible par Mobile Money ou au comptoir."
                </p>
              </div>
            </div>

            <button
              onClick={handleSendWhatsAppRelance}
              className="w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-black font-black text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Ouvrir WhatsApp & Envoyer la Relance</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL ENREGISTRER REMBOURSEMENT */}
      {selectedFactureForRemb && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setSelectedFactureForRemb(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black p-1.5 rounded-full bg-[#FBF7EF]"
            >
              ✕
            </button>

            <h2 className="font-serif text-xl font-black text-[#1B4332] mb-1">
              💵 Encaissement d'un Remboursement
            </h2>
            <p className="text-xs text-[#1B4332]/70 mb-4 font-medium">
              Facture n°{selectedFactureForRemb.numero_facture} ({selectedFactureForRemb.client?.nom})
            </p>

            <form onSubmit={handleProcessRemboursement} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Montant Réglé (FCFA) *</label>
                <input
                  type="number"
                  max={selectedFactureForRemb.montant_restant}
                  value={rembMontant}
                  onChange={(e) => setRembMontant(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-black text-lg focus:outline-none focus:border-[#1B4332]"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">Reste dû maximum : {selectedFactureForRemb.montant_restant.toLocaleString('fr-FR')} FCFA</span>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Mode de Règlement *</label>
                <select
                  value={rembMethode}
                  onChange={(e) => setRembMethode(e.target.value as any)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                >
                  <option value="cash">Espèces / Cash</option>
                  <option value="orange_money">Orange Money Cameroun</option>
                  <option value="mtn_momo">MTN Mobile Money</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Note / Référence Transaction</label>
                <input
                  type="text"
                  placeholder="Ex: Reçu en cash au comptoir..."
                  value={rembNote}
                  onChange={(e) => setRembNote(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-xs focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-base shadow-md transition-transform active:scale-95"
              >
                Valider l'Encaissement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU CLIENT */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsClientModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black p-1.5 rounded-full bg-[#FBF7EF]"
            >
              ✕
            </button>

            <h2 className="font-serif text-xl font-black text-[#1B4332] mb-1">
              👤 Ajouter un Client VIP
            </h2>
            <p className="text-xs text-[#1B4332]/70 mb-4 font-medium">
              Enregistrez le nom et le numéro WhatsApp pour activer les crédits et relances.
            </p>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Client *</label>
                <input
                  type="text"
                  placeholder="Ex: Papa TCHAMBA"
                  value={clientNom}
                  onChange={(e) => setClientNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Numéro WhatsApp (Cameroun) *</label>
                <input
                  type="tel"
                  placeholder="Ex: 699112233"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Quartier / Remarque</label>
                <input
                  type="text"
                  placeholder="Ex: Client régulier Akwa Nord..."
                  value={clientQuartier}
                  onChange={(e) => setClientQuartier(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-xs focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-base shadow-md transition-transform active:scale-95"
              >
                Créer la Fiche Client
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE VENTE À CRÉDIT */}
      {isNewVenteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsNewVenteModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black p-1.5 rounded-full bg-[#FBF7EF]"
            >
              ✕
            </button>

            <h2 className="font-serif text-xl font-black text-[#1B4332] mb-1">
              📝 Saisir une Vente à Crédit
            </h2>
            <p className="text-xs text-[#1B4332]/70 mb-4 font-medium">
              Génère une facture liée au stock et enregistre la dette du client.
            </p>

            <form onSubmit={handleSaveVenteCredit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Client Débiteurs *</label>
                <select
                  value={venteClientId}
                  onChange={(e) => setVenteClientId(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.telephone_whatsapp})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Boisson Consommée *</label>
                <select
                  value={venteProduitId}
                  onChange={(e) => setVenteProduitId(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                >
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} - {p.prix_vente_bouteille} FCFA / b
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Nombre Bouteilles *</label>
                  <input
                    type="number"
                    min="1"
                    value={venteQty}
                    onChange={(e) => setVenteQty(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-black text-base focus:outline-none focus:border-[#1B4332]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Acompte Versé (F)</label>
                  <input
                    type="number"
                    value={venteAcompte}
                    onChange={(e) => setVenteAcompte(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-base focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-base shadow-glow-brique transition-transform active:scale-95"
              >
                Générer la Facture à Crédit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
