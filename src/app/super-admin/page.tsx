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
  EyeOff,
  Package,
  Layers,
  Star,
  Trash2
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Etablissement, Paiement, PalierTarifaire, StatutAbonnement } from '@/types';

export default function SuperAdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [paliers, setPaliers] = useState<PalierTarifaire[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('tous');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Modal Ajustement Manuel
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

      const dataPaiements = typeof window !== 'undefined' ? localStorage.getItem('oeko_paiements') : null;
      const parsedPaiements: Paiement[] = dataPaiements
        ? JSON.parse(dataPaiements)
        : [
            {
              id: 'pay-1',
              etablissement_id: etabs[0]?.id || 'etab-1',
              montant: 5000,
              methode: 'Orange Money',
              telephone_payeur: '699001122',
              reference_transaction: 'OM-2026-99128',
              statut: 'reussi',
              created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
            },
            {
              id: 'pay-2',
              etablissement_id: etabs[1]?.id || 'etab-2',
              montant: 10000,
              methode: 'MTN MoMo',
              telephone_payeur: '677443322',
              reference_transaction: 'MOMO-2026-44102',
              statut: 'reussi',
              created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
            },
          ];
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
      setAuthError('Mot de passe Super-Admin incorrect.');
    }
  };

  const handleToggleEtabActive = (etabId: string, currentStatus: StatutAbonnement) => {
    const newStatus: StatutAbonnement = currentStatus === 'suspendu' ? 'actif' : 'suspendu';
    offlineDB.updateEtablissement(etabId, { statut_abonnement: newStatus });
    setSuccessMsg(`Le commerce a été passé en statut "${newStatus}".`);
    setTimeout(() => setSuccessMsg(''), 4000);
    loadAdminData();
  };

  const handleExtendTrial = (etabId: string) => {
    const etab = etablissements.find((e) => e.id === etabId);
    if (!etab) return;
    const currentEnd = new Date(etab.date_fin_essai).getTime();
    const newEnd = new Date(currentEnd + extendDaysInput * 24 * 3600 * 1000).toISOString();
    offlineDB.updateEtablissement(etabId, { date_fin_essai: newEnd, statut_abonnement: 'essai' });
    setSelectedEtabForAction(null);
    setSuccessMsg(`Essai prolongé de ${extendDaysInput} jours.`);
    setTimeout(() => setSuccessMsg(''), 4000);
    loadAdminData();
  };

  const handleSaveTierThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    offlineDB.savePaliersTarifaires(paliers);
    setSuccessMsg('La grille des paliers tarifaires et critères a été enregistrée avec succès.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const totalRevenuEncaisse = paiements
    .filter((p) => p.statut === 'reussi')
    .reduce((acc, p) => acc + p.montant, 0);

  // Distribution des commerces par palier
  const countEssentiel = etablissements.filter((e) => (e.tarif_mensuel || 5000) <= 3000).length;
  const countStandard = etablissements.filter(
    (e) => (e.tarif_mensuel || 5000) > 3000 && (e.tarif_mensuel || 5000) <= 5000
  ).length;
  const countPro = etablissements.filter((e) => (e.tarif_mensuel || 5000) > 5000).length;

  const trialsExpiringIn48h = etablissements.filter((e) => {
    const daysLeft = offlineDB.getTrialDaysRemaining(e);
    return daysLeft > 0 && daysLeft <= 2 && e.statut_abonnement === 'essai';
  });

  const overdueEtabs = etablissements.filter((e) => e.statut_abonnement === 'en_retard' || offlineDB.isRestrictedMode(e));

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
      <div className="min-h-screen bg-[#0F291E] text-white flex items-center justify-center p-4">
        <form
          onSubmit={handleAdminLogin}
          className="bg-[#1B4332] border border-[#2D6A4F] rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-5 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#E8A33D] text-[#0F291E] flex items-center justify-center text-3xl font-black mx-auto shadow-md">
            👁️
          </div>
          <div>
            <h1 className="font-serif font-black text-2xl text-white">œko Super-Admin</h1>
            <p className="text-xs text-[#E8A33D] font-bold">Espace de Gestion de la Grille & Abonnements</p>
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
            className="w-full py-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-md transition-transform active:scale-95"
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
                Accès Créateur
              </span>
            </div>
            <p className="text-xs text-gray-600 font-bold">
              Répartition des clients par palier & Configuration dynamique de la grille tarifaire
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAuthenticated(false)}
          className="py-2.5 px-4 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs self-start sm:self-auto"
        >
          Déconnexion Super-Admin
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid KPIs Globaux & Répartition des Clients par Palier */}
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
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Commerces Inscrits</p>
            <p className="font-serif font-black text-xl text-[#1B4332]">
              {etablissements.length} <span className="text-xs text-gray-500">commerces</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-bold">
            ⏳
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Essais Expirant &lt;48h</p>
            <p className="font-serif font-black text-xl text-amber-900">
              {trialsExpiringIn48h.length} <span className="text-xs text-gray-500">alertes</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E2D5C3] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-800 flex items-center justify-center text-2xl font-bold">
            ⚠️
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Commerces en Retard</p>
            <p className="font-serif font-black text-xl text-red-600">
              {overdueEtabs.length} <span className="text-xs text-gray-500">à relancer</span>
            </p>
          </div>
        </div>
      </div>

      {/* BLOC RÉPARTITION DES CLIENTS PAR PALIER D'ABONNEMENT */}
      <div className="p-5 rounded-3xl bg-[#1B4332] text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-black text-lg text-[#E8A33D] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#E8A33D]" />
            Répartition des Commerces par Palier d'Abonnement
          </h2>
          <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-gray-200">
            {etablissements.length} commerces au total
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-[#0F291E] border border-[#2D6A4F] flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Palier 1 : Essentiel (3 000 FCFA)</span>
              <span className="font-serif font-black text-2xl text-white">{countEssentiel} client(s)</span>
            </div>
            <span className="text-xs font-black text-[#E8A33D] bg-[#E8A33D]/10 px-2.5 py-1 rounded-full border border-[#E8A33D]/30">
              {etablissements.length > 0 ? Math.round((countEssentiel / etablissements.length) * 100) : 0}%
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F291E] border border-[#E8A33D]/40 flex justify-between items-center shadow-sm">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#E8A33D] block">Palier 2 : Standard (5 000 FCFA) ★</span>
              <span className="font-serif font-black text-2xl text-white">{countStandard} client(s)</span>
            </div>
            <span className="text-xs font-black text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
              {etablissements.length > 0 ? Math.round((countStandard / etablissements.length) * 100) : 0}%
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F291E] border border-[#2D6A4F] flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Palier 3 : Pro (10 000 FCFA)</span>
              <span className="font-serif font-black text-2xl text-white">{countPro} client(s)</span>
            </div>
            <span className="text-xs font-black text-[#E8A33D] bg-[#E8A33D]/10 px-2.5 py-1 rounded-full border border-[#E8A33D]/30">
              {etablissements.length > 0 ? Math.round((countPro / etablissements.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* SECTION CONFIGURATION DYNAMIQUE DES PALIERS ET CRITÈRES */}
      <div className="bg-white border border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif font-black text-lg text-[#1B4332]">
              Configuration Dynamique de la Grille des Paliers
            </h2>
            <p className="text-xs text-gray-600 font-medium">
              Ajustez les tarifs et critères (articles max, tables max, utilisateurs max) sans modifier le code.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveTierThresholds} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {paliers.map((palier, idx) => (
            <div key={palier.id} className="p-5 rounded-3xl bg-[#FBF7EF] border-2 border-[#E2D5C3] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full">
                  Code : {palier.code_palier || `palier-${idx+1}`}
                </span>
                {palier.badge_recommande && (
                  <span className="text-[9px] font-black bg-[#E8A33D] text-[#0F291E] px-2 py-0.5 rounded-full">
                    Recommandé Démo
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
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Tarif (FCFA/mois)</label>
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
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Utilisateurs Max</label>
                  <input
                    type="number"
                    value={palier.utilisateurs_max}
                    onChange={(e) => {
                      const copy = [...paliers];
                      copy[idx].utilisateurs_max = parseInt(e.target.value, 10) || 1;
                      setPaliers(copy);
                    }}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
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

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Tables Max (Bar)</label>
                  <input
                    type="number"
                    value={palier.tables_max}
                    onChange={(e) => {
                      const copy = [...paliers];
                      copy[idx].tables_max = parseInt(e.target.value, 10) || 5;
                      setPaliers(copy);
                    }}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">Description Terrain</label>
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
              className="py-3.5 px-6 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md transition-transform active:scale-95"
            >
              Enregistrer les Nouveaux Paliers & Tarifs ➔
            </button>
          </div>
        </form>
      </div>

      {/* SECTION LISTE DES COMMERCES ET ACTIONS ADMIN */}
      <div className="bg-white border border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="font-serif font-black text-lg text-[#1B4332]">Gestion des Commerces & Inscriptions</h2>

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
              <option value="en_retard">En retard</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E2D5C3]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FBF7EF] border-b border-[#E2D5C3] text-[11px] font-black text-[#1B4332] uppercase">
              <tr>
                <th className="p-3">Nom Commerce</th>
                <th className="p-3">Activité</th>
                <th className="p-3">Ville</th>
                <th className="p-3">Tarif & Palier</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-center">Actions Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2D5C3]">
              {filteredEtabs.map((etab) => {
                const daysLeft = offlineDB.getTrialDaysRemaining(etab);

                return (
                  <tr key={etab.id} className="hover:bg-[#FBF7EF]/50">
                    <td className="p-3">
                      <p className="font-bold text-[#1B4332]">{etab.nom}</p>
                      <p className="text-[10px] text-gray-500">{etab.adresse}</p>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#B8442C] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        {etab.secteur_boutique || etab.type_activite}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-gray-700">{etab.ville}</td>
                    <td className="p-3">
                      <span className="font-serif font-black text-xs text-[#B8442C]">
                        {(etab.tarif_mensuel || 5000).toLocaleString('fr-FR')} FCFA
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          etab.statut_abonnement === 'actif'
                            ? 'bg-emerald-100 text-emerald-900'
                            : etab.statut_abonnement === 'suspendu'
                            ? 'bg-red-100 text-red-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {etab.statut_abonnement} ({daysLeft}j)
                      </span>
                    </td>
                    <td className="p-3 text-center space-x-1">
                      <button
                        onClick={() => setSelectedEtabForAction(etab)}
                        className="px-2.5 py-1 bg-[#1B4332] text-white rounded-lg text-[11px] font-bold hover:bg-[#2D6A4F]"
                      >
                        Prolonger
                      </button>
                      <button
                        onClick={() => handleToggleEtabActive(etab.id, etab.statut_abonnement)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          etab.statut_abonnement === 'suspendu'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-red-700 text-white'
                        }`}
                      >
                        {etab.statut_abonnement === 'suspendu' ? 'Réactiver' : 'Suspendre'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
                    className="px-4 py-2 bg-[#B8442C] text-white rounded-xl font-bold text-xs"
                  >
                    Prolonger
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedEtabForAction(null)}
              className="w-full py-2.5 rounded-xl bg-gray-200 text-gray-800 font-bold text-xs"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
