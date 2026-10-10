'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Settings,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Zap,
  Lock,
  Unlock,
  Package,
  Layers,
  Star,
  Send,
  CreditCard,
  Check,
  X,
  FileText
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import {
  Etablissement,
  Paiement,
  PalierTarifaire,
  StatutAbonnement,
  ConfigPaiementManuel,
  DemandePaiementAbonnement
} from '@/types';

export default function SuperAdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<'activites' | 'demandes' | 'config'>('activites');
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [demandes, setDemandes] = useState<DemandePaiementAbonnement[]>([]);
  const [paliers, setPaliers] = useState<PalierTarifaire[]>([]);
  const [configManuel, setConfigManuel] = useState<ConfigPaiementManuel>(offlineDB.getConfigPaiementManuel());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('tous');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Modal Prolongation d'essai
  const [selectedEtabForAction, setSelectedEtabForAction] = useState<Etablissement | null>(null);
  const [extendDaysInput, setExtendDaysInput] = useState<number>(7);

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  const loadAdminData = () => {
    try {
      const etabs = offlineDB.getEtablissements();
      setEtablissements(etabs);
      setPaliers(offlineDB.getPaliersTarifaires());
      setConfigManuel(offlineDB.getConfigPaiementManuel());
      setDemandes(offlineDB.getDemandesPaiementAbonnement());

      const dataPaiements = typeof window !== 'undefined' ? localStorage.getItem('oeko_paiements') : null;
      const parsedPaiements: Paiement[] = dataPaiements
        ? JSON.parse(dataPaiements)
        : [];
      setPaiements(parsedPaiements);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'oeko2026' || adminPassword === 'admin') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Mot de passe Super-Admin incorrect (Essayer: oeko2026).');
    }
  };

  // Actions d'Abonnement Super-Admin
  const handleConfirmPaiementDirect = (etab: Etablissement) => {
    // Prolonger de 30 jours et passer en actif
    const currentNextPayment = new Date(etab.date_prochain_paiement || etab.date_fin_essai || Date.now()).getTime();
    const baseTime = currentNextPayment > Date.now() ? currentNextPayment : Date.now();
    const newDueDate = new Date(baseTime + 30 * 24 * 3600 * 1000).toISOString();

    const tarif = etab.tarif_mensuel || 5000;
    offlineDB.updateEtablissement(etab.id, {
      statut_abonnement: 'actif',
      date_prochain_paiement: newDueDate,
      date_fin_essai: newDueDate,
    });

    // Enregistrer le paiement dans l'historique
    offlineDB.processMobileMoneyPayment({
      plan: tarif >= 10000 ? 'Premium' : 'Basique',
      methode: 'Orange Money',
      telephone_payeur: etab.telephone || 'Super-Admin',
      reference_transaction: `SA-CONFIRM-${Date.now()}`,
      montant: tarif,
    });

    setSuccessMsg(`Paiement confirmé pour "${etab.nom}" ! Abonnement prolongé d'un mois (+30j) jusqu'au ${new Date(newDueDate).toLocaleDateString('fr-FR')}.`);
    setTimeout(() => setSuccessMsg(''), 5000);
    loadAdminData();
  };

  const handleConfirmDemandePaiement = (demandeId: string) => {
    const res = offlineDB.confirmPaiementAbonnement(demandeId);
    if (res.success) {
      setSuccessMsg(`Paiement de ${res.demande?.montant.toLocaleString('fr-FR')} FCFA pour "${res.demande?.etablissement_nom}" validé ! Abonnement prolongé d'un mois.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      loadAdminData();
    }
  };

  const handleRejectDemandePaiement = (demandeId: string) => {
    const res = offlineDB.rejectPaiementAbonnement(demandeId);
    if (res.success) {
      setSuccessMsg(`Demande de paiement rejetée.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      loadAdminData();
    }
  };

  const handleBlockEtab = (etab: Etablissement) => {
    offlineDB.blockEtablissement(etab.id);
    setSuccessMsg(`Le commerce "${etab.nom}" a été bloqué par l'administration. Ses données sont 100% conservées en sécurité.`);
    setTimeout(() => setSuccessMsg(''), 5000);
    loadAdminData();
  };

  const handleUnblockEtab = (etab: Etablissement) => {
    offlineDB.unblockEtablissement(etab.id);
    setSuccessMsg(`Le commerce "${etab.nom}" a été débloqué et réactivé.`);
    setTimeout(() => setSuccessMsg(''), 5000);
    loadAdminData();
  };

  const handleExtendTrial = (etabId: string) => {
    const etab = etablissements.find((e) => e.id === etabId);
    if (!etab) return;
    const currentEnd = new Date(etab.date_fin_essai || Date.now()).getTime();
    const newEnd = new Date(currentEnd + extendDaysInput * 24 * 3600 * 1000).toISOString();
    offlineDB.updateEtablissement(etabId, { date_fin_essai: newEnd, statut_abonnement: 'essai' });
    setSelectedEtabForAction(null);
    setSuccessMsg(`Essai prolongé de ${extendDaysInput} jours pour "${etab.nom}".`);
    setTimeout(() => setSuccessMsg(''), 4000);
    loadAdminData();
  };

  const handleSaveTierThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    offlineDB.savePaliersTarifaires(paliers);
    setSuccessMsg('Grille des 3 paliers d\'abonnement enregistrée.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSaveConfigManuel = (e: React.FormEvent) => {
    e.preventDefault();
    offlineDB.saveConfigPaiementManuel(configManuel);
    setSuccessMsg('Coordonnées de paiement manuel (Orange Money, MTN MoMo) mises à jour pour tous les patrons.');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const totalRevenuEncaisse = paiements
    .filter((p) => p.statut === 'reussi')
    .reduce((acc, p) => acc + p.montant, 0);

  const pendingDemandes = demandes.filter((d) => d.statut === 'en_attente');
  const countEssentiel = etablissements.filter((e) => (e.tarif_mensuel || 5000) <= 3000).length;
  const countStandard = etablissements.filter(
    (e) => (e.tarif_mensuel || 5000) > 3000 && (e.tarif_mensuel || 5000) <= 5000
  ).length;
  const countPro = etablissements.filter((e) => (e.tarif_mensuel || 5000) > 5000).length;
  const blockedCount = etablissements.filter((e) => e.statut_abonnement === 'bloque').length;

  const filteredEtabs = etablissements.filter((e) => {
    const matchSearch =
      e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.secteur_boutique || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.ville.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'tous' || e.statut_abonnement === statusFilter;
    return matchSearch && matchStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F291E] text-white flex items-center justify-center p-4 font-sans">
        <form
          onSubmit={handleAdminLogin}
          className="bg-[#1B4332] border border-[#2D6A4F] rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-5 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#E8A33D] text-[#0F291E] flex items-center justify-center text-3xl font-black mx-auto shadow-md">
            👁️
          </div>
          <div>
            <h1 className="font-serif font-black text-2xl text-white">œko Super-Admin</h1>
            <p className="text-xs text-[#E8A33D] font-bold">Espace de Gestion des Abonnements & Validation des Paiements</p>
          </div>

          {authError && (
            <div className="p-3 bg-red-900/80 border border-red-700 text-red-200 rounded-2xl text-xs font-bold">
              {authError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
              Mot de passe Super-Admin
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full bg-[#0F291E] border border-[#2D6A4F] rounded-2xl p-3.5 text-sm font-mono text-center text-white focus:border-[#E8A33D]"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            Se Connecter au Dashboard Super-Admin ➔
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] font-sans p-4 lg:p-8 space-y-6">
      {/* Top Header Super Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0F291E] text-[#E8A33D] flex items-center justify-center text-2xl font-black shadow-md">
            👁️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-black text-2xl text-[#1B4332]">Dashboard Super-Admin œko</h1>
              <span className="text-[10px] font-black uppercase bg-[#B8442C] text-white px-2.5 py-0.5 rounded-full">
                Administration
              </span>
            </div>
            <p className="text-xs text-gray-600 font-bold">
              Validation des paiements manuels, gestion des blocages & configuration dynamique
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAuthenticated(false)}
          className="py-2.5 px-4 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs self-start sm:self-auto cursor-pointer"
        >
          Déconnexion
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid KPIs Globaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-bold">
            💰
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Revenu Total Encaissé</p>
            <p className="font-serif font-black text-xl text-[#1B4332]">
              {totalRevenuEncaisse.toLocaleString('fr-FR')} <span className="text-xs text-gray-500">FCFA</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-2xl font-bold">
            🏢
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Activités / Commerces</p>
            <p className="font-serif font-black text-xl text-[#1B4332]">
              {etablissements.length} <span className="text-xs text-gray-500">inscrits</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center text-2xl font-bold">
            ⏳
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Paiements en Attente</p>
            <p className="font-serif font-black text-xl text-amber-900">
              {pendingDemandes.length} <span className="text-xs text-gray-500">à vérifier</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-800 flex items-center justify-center text-2xl font-bold">
            🔒
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Commerces Bloqués</p>
            <p className="font-serif font-black text-xl text-red-600">
              {blockedCount} <span className="text-xs text-gray-500">bloqués</span>
            </p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-[#E2D5C3] pb-2">
        <button
          onClick={() => setActiveTab('activites')}
          className={`py-2.5 px-5 rounded-2xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'activites'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'bg-white text-[#1B4332] border border-[#E2D5C3]'
          }`}
        >
          🏢 Liste des Activités & Statuts ({etablissements.length})
        </button>

        <button
          onClick={() => setActiveTab('demandes')}
          className={`py-2.5 px-5 rounded-2xl font-black text-xs transition-all cursor-pointer relative ${
            activeTab === 'demandes'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'bg-white text-[#1B4332] border border-[#E2D5C3]'
          }`}
        >
          <span>💸 Demandes de Paiement Manuel & Historique</span>
          {pendingDemandes.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#B8442C] text-white">
              {pendingDemandes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`py-2.5 px-5 rounded-2xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'config'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'bg-white text-[#1B4332] border border-[#E2D5C3]'
          }`}
        >
          ⚙️ Config Paliers & Paiement Manuel
        </button>
      </div>

      {/* TAB 1: LISTE DES ACTIVITÉS & ACTIONS */}
      {activeTab === 'activites' && (
        <div className="bg-white border border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="font-serif font-black text-lg text-[#1B4332]">Gestion des Activités & Abonnements</h2>
              <p className="text-xs text-gray-600 font-medium">
                Confirmez les règlements (+30j), bloquez ou débloquez les accès sans perte de données.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Rechercher nom, ville, secteur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl pl-9 pr-3 py-2 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl px-3 py-2 text-xs font-bold text-[#1B4332]"
              >
                <option value="tous">Tous les statuts</option>
                <option value="essai">En essai</option>
                <option value="actif">Actif à jour</option>
                <option value="en_attente_validation">En attente de validation</option>
                <option value="expire">Expiré</option>
                <option value="bloque">Bloqué</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#E2D5C3]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBF7EF] border-b border-[#E2D5C3] text-[11px] font-black text-[#1B4332] uppercase">
                <tr>
                  <th className="p-3">Activité / Commerce</th>
                  <th className="p-3">Compte Patron</th>
                  <th className="p-3">Articles & Palier</th>
                  <th className="p-3">Ville & Adresse</th>
                  <th className="p-3">Tarif Mensuel</th>
                  <th className="p-3">Statut Abonnement</th>
                  <th className="p-3 text-center">Actions Super-Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D5C3]">
                {filteredEtabs.map((etab) => {
                  const daysLeft = offlineDB.getTrialDaysRemaining(etab);
                  const isBlocked = etab.statut_abonnement === 'bloque';
                  const isPending = etab.statut_abonnement === 'en_attente_validation';
                  const usage = offlineDB.checkEtablissementTierUsage(etab);

                  return (
                    <tr key={etab.id} className="hover:bg-[#FBF7EF]/50">
                      <td className="p-3">
                        <p className="font-bold text-[#1B4332] flex items-center gap-1.5">
                          <span>👗</span>
                          <span>{etab.nom}</span>
                        </p>
                        <p className="text-[10px] text-gray-500">{etab.secteur_boutique || 'Commerce'}</p>
                      </td>

                      <td className="p-3">
                        <span className="font-mono text-xs font-bold text-[#1B4332] block">
                          {etab.email_patron || 'compte@gmail.com'}
                        </span>
                        <span className="text-[10px] text-gray-500">{etab.telephone || 'Non renseigné'}</span>
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-[#1B4332] block">
                          {usage.distinctCount} article(s)
                        </span>
                        <span className="text-[10px] font-bold text-[#B8442C]">
                          Palier {usage.recommendedTier.nom}
                        </span>
                      </td>

                      <td className="p-3 font-medium text-gray-700">
                        {etab.ville} — {etab.adresse}
                      </td>

                      <td className="p-3">
                        <span className="font-serif font-black text-xs text-[#B8442C]">
                          {(etab.tarif_mensuel || usage.recommendedTier.tarif_mensuel).toLocaleString('fr-FR')} FCFA
                        </span>
                      </td>

                      <td className="p-3">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                            isBlocked
                              ? 'bg-red-950 text-red-200 border border-red-800'
                              : isPending
                              ? 'bg-amber-200 text-amber-950 border border-amber-400 font-extrabold animate-pulse'
                              : etab.statut_abonnement === 'actif'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {isBlocked
                            ? 'Bloqué'
                            : isPending
                            ? 'En Attente Paiement'
                            : etab.statut_abonnement === 'actif'
                            ? 'Actif (+30j)'
                            : `Essai (${daysLeft}j)`}
                        </span>
                      </td>

                      <td className="p-3 text-center space-x-1.5 whitespace-nowrap">
                        {/* Bouton Confirmer le paiement reçu (+30j) */}
                        <button
                          onClick={() => handleConfirmPaiementDirect(etab)}
                          title="Confirmer la réception du paiement et prolonger l'abonnement d'un mois (+30 jours)"
                          className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirmer Paiement (+30j)</span>
                        </button>

                        {/* Bouton Bloquer / Débloquer */}
                        {isBlocked ? (
                          <button
                            onClick={() => handleUnblockEtab(etab)}
                            title="Débloquer l'accès pour ce commerce"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Débloquer</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockEtab(etab)}
                            title="Bloquer l'accès tout en conservant 100% des données intactes"
                            className="px-2.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Bloquer</span>
                          </button>
                        )}

                        {/* Prolonger l'essai */}
                        <button
                          onClick={() => setSelectedEtabForAction(etab)}
                          className="px-2 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                        >
                          +Jours
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEMANDES DE PAIEMENT MANUEL & HISTORIQUE */}
      {activeTab === 'demandes' && (
        <div className="space-y-6">
          {/* Section 1: Demandes en Attente de Confirmation */}
          <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h2 className="font-serif font-black text-lg text-[#1B4332]">
                    Demandes de Paiement Manuel en Attente ({pendingDemandes.length})
                  </h2>
                  <p className="text-xs text-gray-600 font-medium">
                    Paiements soumis par les patrons. Vérifiez la réception sur votre compte Mobile Money avant de valider.
                  </p>
                </div>
              </div>
            </div>

            {pendingDemandes.length === 0 ? (
              <div className="p-8 text-center bg-[#FBF7EF] rounded-2xl border border-dashed border-[#E2D5C3] text-gray-500 font-bold text-xs">
                Aucune demande de paiement en attente pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#E2D5C3]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-50 border-b border-amber-200 text-[11px] font-black text-amber-950 uppercase">
                    <tr>
                      <th className="p-3">Date Soumission</th>
                      <th className="p-3">Commerce</th>
                      <th className="p-3">Palier & Montant</th>
                      <th className="p-3">Moyen & N° Payeur</th>
                      <th className="p-3">Référence Transaction</th>
                      <th className="p-3 text-center">Action Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2D5C3]">
                    {pendingDemandes.map((d) => (
                      <tr key={d.id} className="bg-amber-50/30 hover:bg-amber-50">
                        <td className="p-3 font-mono text-[11px] font-bold">
                          {new Date(d.created_at).toLocaleString('fr-FR')}
                        </td>
                        <td className="p-3 font-bold text-[#1B4332]">
                          {d.etablissement_nom}
                          <span className="block text-[10px] text-gray-500 font-mono font-normal">
                            {d.email_patron}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-serif font-black text-sm text-[#B8442C]">
                            {d.montant.toLocaleString('fr-FR')} FCFA
                          </span>
                          <span className="block text-[10px] font-bold text-gray-600">
                            Palier {d.nom_palier}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold block">{d.methode}</span>
                          <span className="font-mono text-xs text-gray-600">{d.telephone_payeur}</span>
                        </td>
                        <td className="p-3 font-mono font-black text-xs text-[#1B4332] bg-white p-2 rounded-xl border border-[#E2D5C3]">
                          {d.reference_transaction}
                        </td>
                        <td className="p-3 text-center space-x-2">
                          <button
                            onClick={() => handleConfirmDemandePaiement(d.id)}
                            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer inline-flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            <span>Confirmer le paiement reçu (+30j)</span>
                          </button>

                          <button
                            onClick={() => handleRejectDemandePaiement(d.id)}
                            className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-xl font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            <span>Rejeter</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Historique Global des Transactions Confirmées */}
          <div className="bg-white border border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-black text-lg text-[#1B4332]">Historique des Transactions Valides</h2>

            <div className="overflow-x-auto rounded-2xl border border-[#E2D5C3]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBF7EF] border-b border-[#E2D5C3] text-[11px] font-black text-[#1B4332] uppercase">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Montant</th>
                    <th className="p-3">Opérateur / Moyen</th>
                    <th className="p-3">Téléphone Payeur</th>
                    <th className="p-3">Référence Transaction</th>
                    <th className="p-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D5C3]">
                  {paiements.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3 font-mono text-xs">{new Date(p.created_at).toLocaleString('fr-FR')}</td>
                      <td className="p-3 font-serif font-black text-sm text-[#B8442C]">
                        {p.montant.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="p-3 font-bold">{p.methode}</td>
                      <td className="p-3 font-mono">{p.telephone_payeur}</td>
                      <td className="p-3 font-mono font-bold text-[#1B4332]">{p.reference_transaction}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Encaissé (Validé)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURATION DYNAMIQUE DES PALIERS ET COORDONNÉES PAIEMENT */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Formulaire 1: Coordonnées de Paiement Manuel */}
          <div className="bg-white border-2 border-[#1B4332] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-xl font-black shadow-md">
                📲
              </div>
              <div>
                <h2 className="font-serif font-black text-lg text-[#1B4332]">
                  Configuration des Coordonnées de Paiement Manuel (Mobile Money)
                </h2>
                <p className="text-xs text-gray-600 font-medium">
                  Modifiables à tout moment. Ces coordonnées s'affichent instantanément sur l'écran des patrons.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveConfigManuel} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Orange Money */}
                <div className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-3">
                  <h4 className="font-bold text-xs text-[#FF6600] uppercase tracking-wider">
                    🟧 Orange Money Cameroun
                  </h4>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Numéro de Téléphone OM *</label>
                    <input
                      type="text"
                      value={configManuel.orange_money_numero}
                      onChange={(e) => setConfigManuel({ ...configManuel, orange_money_numero: e.target.value })}
                      className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-mono font-bold text-[#1B4332]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Nom du Destinataire OM *</label>
                    <input
                      type="text"
                      value={configManuel.orange_money_nom}
                      onChange={(e) => setConfigManuel({ ...configManuel, orange_money_nom: e.target.value })}
                      className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                      required
                    />
                  </div>
                </div>

                {/* MTN MoMo */}
                <div className="p-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] space-y-3">
                  <h4 className="font-bold text-xs text-[#FFCC00] uppercase tracking-wider">
                    🟡 MTN Mobile Money Cameroun
                  </h4>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Numéro de Téléphone MTN *</label>
                    <input
                      type="text"
                      value={configManuel.mtn_momo_numero}
                      onChange={(e) => setConfigManuel({ ...configManuel, mtn_momo_numero: e.target.value })}
                      className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-mono font-bold text-[#1B4332]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Nom du Destinataire MTN *</label>
                    <input
                      type="text"
                      value={configManuel.mtn_momo_nom}
                      onChange={(e) => setConfigManuel({ ...configManuel, mtn_momo_nom: e.target.value })}
                      className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Consignes et Instructions affichées au Patron</label>
                <textarea
                  rows={3}
                  value={configManuel.consignes || ''}
                  onChange={(e) => setConfigManuel({ ...configManuel, consignes: e.target.value })}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-xs font-medium text-[#1B4332]"
                />
              </div>

              <button
                type="submit"
                className="py-3 px-6 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md transition-all cursor-pointer"
              >
                Enregistrer les Coordonnées de Paiement Manuel ➔
              </button>
            </form>
          </div>

          {/* Formulaire 2: Grille des Paliers Tarifaires */}
          <div className="bg-white border border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-serif font-black text-lg text-[#1B4332]">
                Configuration Dynamique des Paliers (Articles & Prix)
              </h2>
              <p className="text-xs text-gray-600 font-medium">
                Essentiel (jusqu'à 100 articles = 3 000 FCFA), Standard (101 à 400 articles = 5 000 FCFA), Pro (au-delà de 400 = 10 000 FCFA).
              </p>
            </div>

            <form onSubmit={handleSaveTierThresholds} className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {paliers.map((palier, idx) => (
                <div key={palier.id} className="p-5 rounded-3xl bg-[#FBF7EF] border-2 border-[#E2D5C3] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full">
                      Code : {palier.code_palier}
                    </span>
                    {palier.badge_recommande && (
                      <span className="text-[9px] font-black bg-[#E8A33D] text-[#0F291E] px-2 py-0.5 rounded-full">
                        Recommandé
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Nom du Palier</label>
                    <input
                      type="text"
                      value={palier.nom}
                      onChange={(e) => {
                        const copy = [...paliers];
                        copy[idx].nom = e.target.value;
                        setPaliers(copy);
                      }}
                      className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">Tarif Mensuel (FCFA)</label>
                      <input
                        type="number"
                        value={palier.tarif_mensuel}
                        onChange={(e) => {
                          const copy = [...paliers];
                          copy[idx].tarif_mensuel = parseInt(e.target.value, 10) || 3000;
                          setPaliers(copy);
                        }}
                        className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-black text-[#B8442C]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">Articles Max (Boutique)</label>
                      <input
                        type="number"
                        value={palier.articles_max}
                        onChange={(e) => {
                          const copy = [...paliers];
                          copy[idx].articles_max = parseInt(e.target.value, 10) || 100;
                          setPaliers(copy);
                        }}
                        className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={palier.description}
                      onChange={(e) => {
                        const copy = [...paliers];
                        copy[idx].description = e.target.value;
                        setPaliers(copy);
                      }}
                      className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-medium text-[#1B4332]"
                    />
                  </div>
                </div>
              ))}

              <div className="md:col-span-3 pt-2 text-right">
                <button
                  type="submit"
                  className="py-3.5 px-6 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Enregistrer la Grille des Paliers ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Prolongation d'essai */}
      {selectedEtabForAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-center">
            <h3 className="font-serif font-black text-xl text-[#1B4332]">
              Prolonger l'Essai de "{selectedEtabForAction.nom}"
            </h3>

            <div className="p-4 bg-white rounded-2xl border border-[#E2D5C3] space-y-3 text-left">
              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Jours à Ajouter</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={extendDaysInput}
                    onChange={(e) => setExtendDaysInput(parseInt(e.target.value, 10) || 7)}
                    className="flex-1 bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                  />
                  <button
                    onClick={() => handleExtendTrial(selectedEtabForAction.id)}
                    className="px-4 py-2 bg-[#B8442C] text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Prolonger
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedEtabForAction(null)}
              className="w-full py-2.5 rounded-xl bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
