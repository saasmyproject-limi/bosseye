'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  FileText,
  Eye,
  Download,
  MessageSquare,
  HelpCircle,
  Trash2,
  User,
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { fetchGlobalActivitesForSuperAdmin, saveActiviteToCloud, deleteActiviteFromCloud } from '@/lib/activitesSyncService';
import {
  Etablissement,
  Paiement,
  PalierTarifaire,
  StatutAbonnement,
  ConfigPaiementManuel,
  DemandePaiementAbonnement,
  CompteUtilisateur,
} from '@/types';

function formatInscriptionDate(isoDate?: string, dateFinEssai?: string) {
  let d: Date;
  if (isoDate) {
    d = new Date(isoDate);
  } else if (dateFinEssai) {
    d = new Date(new Date(dateFinEssai).getTime() - 7 * 24 * 3600 * 1000);
  } else {
    d = new Date();
  }

  const dateStr = d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const diffMs = Date.now() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let badge = '';
  if (diffHours < 24) {
    badge = '✨ Aujourd\'hui';
  } else if (diffDays === 1) {
    badge = 'Hier';
  } else if (diffDays < 7) {
    badge = `Il y a ${diffDays}j`;
  }

  return { dateStr, timeStr, badge };
}

function formatFinEssaiDate(dateFinEssai?: string) {
  const d = dateFinEssai ? new Date(dateFinEssai) : new Date(Date.now() + 7 * 24 * 3600 * 1000);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'activites' | 'comptes' | 'demandes' | 'config'>('activites');
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [comptes, setComptes] = useState<CompteUtilisateur[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [demandes, setDemandes] = useState<DemandePaiementAbonnement[]>([]);
  const [paliers, setPaliers] = useState<PalierTarifaire[]>([]);
  const [configManuel, setConfigManuel] = useState<ConfigPaiementManuel>(offlineDB.getConfigPaiementManuel());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('tous');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Modal Création directe d'Activité / Commerce
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newVille, setNewVille] = useState('Douala');
  const [newAdresse, setNewAdresse] = useState('');
  const [newPatronNom, setNewPatronNom] = useState('');
  const [newPatronEmail, setNewPatronEmail] = useState('');
  const [newPatronPhone, setNewPatronPhone] = useState('');
  const [newPalierTarif, setNewPalierTarif] = useState<number>(5000);
  const [newStatutAbonnement, setNewStatutAbonnement] = useState<'essai' | 'actif'>('essai');

  // Modal Prolongation d'essai
  const [selectedEtabForAction, setSelectedEtabForAction] = useState<Etablissement | null>(null);
  const [extendDaysInput, setExtendDaysInput] = useState<number>(7);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = sessionStorage.getItem('oeko_superadmin_auth') === 'true';
      if (isAuth) {
        setIsAuthenticated(true);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  const loadAdminData = () => {
    try {
      offlineDB.cleanLegacyDemoData();
      const etabs = offlineDB.getEtablissements();
      setEtablissements(etabs);
      setComptes(offlineDB.getComptesGlobal());
      setPaliers(offlineDB.getPaliersTarifaires());
      setConfigManuel(offlineDB.getConfigPaiementManuel());
      setDemandes(offlineDB.getDemandesPaiementAbonnement());

      const dataPaiements = typeof window !== 'undefined' ? localStorage.getItem('oeko_paiements') : null;
      const parsedPaiements: Paiement[] = dataPaiements
        ? JSON.parse(dataPaiements)
        : [];
      setPaiements(parsedPaiements);

      // Synchro cloud automatique pour charger les boutiques créées sur tous les appareils
      fetchGlobalActivitesForSuperAdmin()
        .then((res) => {
          if (res.success && res.activites.length > 0) {
            setEtablissements(res.activites);
            setComptes(offlineDB.getComptesGlobal());
          }
        })
        .catch((err) => console.warn('[SuperAdmin] fetchGlobalActivites auto-error:', err));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const configuredAdminPass =
      process.env.NEXT_PUBLIC_SUPERADMIN_PASSWORD ||
      process.env.NEXT_PUBLIC_SUPER_ADMIN_PASSWORD ||
      'oeko2026';
    if (adminPassword.trim() === configuredAdminPass.trim()) {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('oeko_superadmin_auth', 'true');
      }
      setAuthError('');
    } else {
      setAuthError('Mot de passe Super-Admin incorrect.');
    }
  };

  const handleAdminLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('oeko_superadmin_auth');
    }
    setIsAuthenticated(false);
    setAdminPassword('');
  };

  // Actions d'Abonnement Super-Admin
  const handleConfirmPaiementDirect = async (etab: Etablissement) => {
    // Prolonger de 30 jours et passer en actif
    const currentNextPayment = new Date(etab.date_prochain_paiement || etab.date_fin_essai || Date.now()).getTime();
    const baseTime = currentNextPayment > Date.now() ? currentNextPayment : Date.now();
    const newDueDate = new Date(baseTime + 30 * 24 * 3600 * 1000).toISOString();

    const tarif = etab.tarif_mensuel || 5000;
    const updated = offlineDB.updateEtablissement(etab.id, {
      statut_abonnement: 'actif',
      date_prochain_paiement: newDueDate,
      date_fin_essai: newDueDate,
    });

    if (updated) {
      await saveActiviteToCloud(updated);
    }

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

  const handleBlockEtab = async (etab: Etablissement) => {
    const updated = offlineDB.blockEtablissement(etab.id);
    if (updated) {
      await saveActiviteToCloud(updated);
    }
    setSuccessMsg(`Boutique "${etab.nom}" BLOQUÉE manuellement. L'écran de suspension est actif pour le commerçant, 100% de ses données restent sécurisées.`);
    setTimeout(() => setSuccessMsg(''), 5000);
    loadAdminData();
  };

  const handleUnblockEtab = async (etab: Etablissement) => {
    const updated = offlineDB.unblockEtablissement(etab.id);
    if (updated) {
      await saveActiviteToCloud(updated);
    }
    setSuccessMsg(`Boutique "${etab.nom}" DÉBLOQUÉE manuellement. L'accès complet est immédiatement rétabli.`);
    setTimeout(() => setSuccessMsg(''), 5000);
    loadAdminData();
  };

  const handleExtendTrial = async (etabId: string) => {
    const etab = etablissements.find((e) => e.id === etabId);
    if (!etab) return;
    const currentEnd = new Date(etab.date_fin_essai || Date.now()).getTime();
    const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
    const newEnd = new Date(baseTime + extendDaysInput * 24 * 3600 * 1000).toISOString();
    const updated = offlineDB.updateEtablissement(etabId, { date_fin_essai: newEnd, statut_abonnement: 'essai' });
    if (updated) {
      await saveActiviteToCloud(updated);
    }
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

  const handleCreateActivityDirectly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim()) return;

    const created = offlineDB.createEtablissement({
      nom: newNom.trim(),
      type_activite: 'boutique',
      secteur_boutique: 'Commerce général',
      ville: newVille,
      adresse: newAdresse.trim() || 'Commerce principal',
      patronNom: newPatronNom.trim() || 'Patron (Propriétaire)',
      telephone: newPatronPhone.trim() || undefined,
      email_patron: newPatronEmail.trim().toLowerCase() || undefined,
      patronPin: '1234',
      tarif_mensuel: newPalierTarif,
    });

    if (newStatutAbonnement === 'actif') {
      const dueDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      offlineDB.updateEtablissement(created.id, {
        statut_abonnement: 'actif',
        date_fin_essai: dueDate,
        date_prochain_paiement: dueDate,
      });
    }

    saveActiviteToCloud(created);

    setSuccessMsg(`Activité "${created.nom}" créée avec succès et disponible immédiatement pour vos manipulations !`);
    setTimeout(() => setSuccessMsg(''), 5000);
    setShowCreateModal(false);
    setNewNom('');
    setNewAdresse('');
    setNewPatronNom('');
    setNewPatronEmail('');
    setNewPatronPhone('');
    loadAdminData();
  };

  const handleDeleteEtab = (etab: Etablissement) => {
    if (confirm(`Voulez-vous vraiment supprimer le commerce "${etab.nom}" ? Cette action est irréversible.`)) {
      offlineDB.deleteEtablissement(etab.id);
      deleteActiviteFromCloud(etab.id);
      setSuccessMsg(`Le commerce "${etab.nom}" a été supprimé.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      loadAdminData();
    }
  };


  const handleInspectShop = (etab: Etablissement) => {
    offlineDB.switchEtablissement(etab.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('oeko_superadmin_inspect_active', 'true');
      localStorage.setItem('oeko_superadmin_inspect_name', etab.nom);
    }
    router.push('/boutique/dashboard');
  };

  const handleSyncCloudSuperAdmin = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await fetchGlobalActivitesForSuperAdmin();
      if (res.success) {
        setEtablissements(res.activites);
        setSuccessMsg(`Synchronisation Cloud réussie : ${res.activites.length} activités disponibles en direct !`);
      } else {
        setSuccessMsg(`Mode local actif (${res.activites.length} activités). ${res.error || ''}`);
      }
    } catch (e: any) {
      setSuccessMsg(`Erreur synchro cloud: ${e?.message || e}`);
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const handleExportCSV = () => {
    if (etablissements.length === 0) {
      alert('Aucune activité à exporter.');
      return;
    }
    const headers = [
      'ID',
      'Nom_Commerce',
      'Patron_Email',
      'Telephone',
      'Ville',
      'Adresse',
      'Secteur_Activite',
      'Statut_Abonnement',
      'Tarif_Mensuel_FCFA',
      'Date_Creation',
      'Date_Echeance_Abonnement',
    ];

    const rows = etablissements.map((e) => [
      `"${e.id}"`,
      `"${(e.nom || '').replace(/"/g, '""')}"`,
      `"${(e.email_patron || '').replace(/"/g, '""')}"`,
      `"${(e.telephone || '').replace(/"/g, '""')}"`,
      `"${(e.ville || '').replace(/"/g, '""')}"`,
      `"${(e.adresse || '').replace(/"/g, '""')}"`,
      `"${(e.secteur_boutique || '').replace(/"/g, '""')}"`,
      `"${e.statut_abonnement || 'essai'}"`,
      `"${e.tarif_mensuel || 5000}"`,
      `"${e.created_at ? new Date(e.created_at).toLocaleDateString('fr-FR') : ''}"`,
      `"${e.date_prochain_paiement || e.date_fin_essai ? new Date(e.date_prochain_paiement || e.date_fin_essai || '').toLocaleDateString('fr-FR') : ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `oeko_commerces_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessMsg('Fichier CSV exporté avec succès ! Compatible avec Microsoft Excel.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleWhatsAppReminder = (etab: Etablissement) => {
    const rawPhone = (etab.telephone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      alert(`Aucun numéro de téléphone renseigné pour le commerce "${etab.nom}".`);
      return;
    }
    const cleanPhone = rawPhone.length === 9 ? `237${rawPhone}` : rawPhone;
    const dueDate = etab.date_prochain_paiement || etab.date_fin_essai;
    const dateFormatted = dueDate ? new Date(dueDate).toLocaleDateString('fr-FR') : 'bientôt';
    const msg = encodeURIComponent(
      `Bonjour ${etab.nom}, c'est l'administration centrale Œko (L'œil du patron). Votre abonnement Œko arrive à échéance le ${dateFormatted}. Pour renouveler votre compte sans interruption, vous pouvez effectuer votre transfert Orange Money ou MTN MoMo. N'hésitez pas si vous avez la moindre question !`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const filteredEtabs = etablissements.filter((e) => {
    const matchSearch =
      e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.secteur_boutique || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.ville.toLowerCase().includes(searchQuery.toLowerCase());
    let matchStatus = statusFilter === 'tous' || e.statut_abonnement === statusFilter;
    if (statusFilter === 'expirant_bientot') {
      const daysLeft = offlineDB.getTrialDaysRemaining(e);
      matchStatus = daysLeft <= 3 && e.statut_abonnement !== 'bloque';
    }
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

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Bouton Créer Commerce Directement */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="py-2.5 px-3.5 rounded-xl bg-[#E8A33D] hover:bg-[#D4932D] text-[#1B4332] font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Créer une nouvelle activité ou boutique pour vos tests et manipulations"
          >
            <Plus className="w-4 h-4 text-[#1B4332]" />
            <span>Créer Commerce</span>
          </button>


          {/* Bouton Synchro Cloud Supabase */}
          <button
            onClick={handleSyncCloudSuperAdmin}
            disabled={isSyncingCloud}
            className="py-2.5 px-3.5 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Charger en direct toutes les boutiques créées dans Supabase (Multi-appareils)"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#E8A33D] ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Synchro en cours...' : 'Synchro Cloud Supabase'}</span>
          </button>

          {/* Bouton Export CSV */}
          <button
            onClick={handleExportCSV}
            className="py-2.5 px-3.5 rounded-xl bg-white hover:bg-[#FAF9F5] text-[#1B4332] border border-[#E2D5C3] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Télécharger la liste complète des commerces en fichier CSV compatible Excel"
          >
            <Download className="w-3.5 h-3.5 text-[#B8442C]" />
            <span>Exporter CSV</span>
          </button>

          {/* Bouton Guide Connexion */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#FAF9F5] text-[#1B4332] border border-[#E2D5C3] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Étapes pour se connecter en tant que Super-Admin"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#E8A33D]" />
            <span>Guide d'accès</span>
          </button>

          {/* Déconnexion */}
          <button
            onClick={handleAdminLogout}
            className="py-2.5 px-4 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs cursor-pointer"
          >
            Déconnexion
          </button>
        </div>
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
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center text-2xl font-bold">
            👤
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Comptes Utilisateurs</p>
            <p className="font-serif font-black text-xl text-purple-900">
              {comptes.length} <span className="text-xs text-gray-500">propriétaires</span>
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
              {pendingDemandes.length} <span className="text-xs text-gray-500">à valider</span>
            </p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2D5C3] pb-2">
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
          onClick={() => setActiveTab('comptes')}
          className={`py-2.5 px-5 rounded-2xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'comptes'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'bg-white text-[#1B4332] border border-[#E2D5C3]'
          }`}
        >
          👤 Comptes Utilisateurs & Patrons ({comptes.length})
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
                <option value="expirant_bientot">🚨 Expirations proches (≤ 3j)</option>
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
                  <th className="p-3.5">🏢 Boutique & Propriétaire</th>
                  <th className="p-3.5">📅 Date d'inscription</th>
                  <th className="p-3.5">⏳ Fin d'essai (7 jours)</th>
                  <th className="p-3.5">💳 Statut de paiement</th>
                  <th className="p-3.5 text-center">🔒 Blocage & Actions Super-Admin</th>
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
                      {/* 1. BOUTIQUE & PROPRIÉTAIRE */}
                      <td className="p-3.5 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-[#0F291E] text-[#E8A33D] flex items-center justify-center text-lg font-black shrink-0 shadow-sm mt-0.5">
                            👗
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-serif font-black text-sm text-[#1B4332]">{etab.nom}</span>
                              <span className="text-[9px] font-black uppercase bg-[#F3ECE0] text-[#1B4332] px-2 py-0.5 rounded-full border border-[#E2D5C3]">
                                {etab.secteur_boutique || 'Commerce'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 font-medium">
                              📍 {etab.ville}{etab.adresse ? ` — ${etab.adresse}` : ''}
                            </p>
                            <div className="text-[11px] text-gray-700 space-y-0.5 pt-0.5">
                              <p className="font-bold flex items-center gap-1 text-[#1B4332]">
                                <span className="text-gray-400 font-normal">Patron :</span>
                                <span>{etab.email_patron || 'Compte Google'}</span>
                              </p>
                              {etab.telephone && (
                                <p className="text-[10px] text-gray-500 font-mono">
                                  📞 {etab.telephone}
                                </p>
                              )}
                            </div>
                            <p className="text-[10px] text-[#B8442C] font-bold">
                              📦 {usage.distinctCount} article(s) • Palier {usage.recommendedTier.nom}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. DATE D'INSCRIPTION */}
                      <td className="p-3.5 align-top">
                        {(() => {
                          const insc = formatInscriptionDate(etab.created_at, etab.date_fin_essai);
                          return (
                            <div className="space-y-1">
                              <span className="font-serif font-black text-xs text-[#1B4332] block">
                                {insc.dateStr}
                              </span>
                              <span className="font-mono text-[10px] text-gray-500 block">
                                à {insc.timeStr}
                              </span>
                              {insc.badge && (
                                <span className="inline-block text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full">
                                  {insc.badge}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 3. FIN D'ESSAI (7 JOURS) */}
                      <td className="p-3.5 align-top">
                        {(() => {
                          const finEssaiStr = formatFinEssaiDate(etab.date_fin_essai);
                          const isPaid = etab.statut_abonnement === 'actif';
                          const isExpired = offlineDB.isTrialExpired(etab);
                          return (
                            <div className="space-y-1.5">
                              <span className="font-bold text-xs text-[#1B4332] block">
                                {finEssaiStr}
                              </span>
                              <div>
                                {isBlocked ? (
                                  <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-950 text-red-200 border border-red-800">
                                    ⛔ Accès Bloqué
                                  </span>
                                ) : isPaid ? (
                                  <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    ✅ Payé (+30j)
                                  </span>
                                ) : isExpired || daysLeft === 0 ? (
                                  <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-300">
                                    🔴 Essai 7j expiré
                                  </span>
                                ) : daysLeft === 1 ? (
                                  <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-400 font-extrabold animate-pulse">
                                    ⚠️ Dernier jour (1j)
                                  </span>
                                ) : daysLeft <= 3 ? (
                                  <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                    🟠 {daysLeft} jours restants
                                  </span>
                                ) : (
                                  <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    🟢 {daysLeft} jours restants
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => setSelectedEtabForAction(etab)}
                                title="Prolonger l'essai gratuit de cette boutique"
                                className="text-[10px] text-gray-500 hover:text-[#1B4332] font-bold underline cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>+ Prolonger essai</span>
                              </button>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 4. STATUT DE PAIEMENT */}
                      <td className="p-3.5 align-top">
                        <div className="space-y-1.5">
                          <div>
                            {isBlocked ? (
                              <span className="inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-red-950 text-red-200 border border-red-800">
                                ⛔ Bloqué Manuel
                              </span>
                            ) : isPending ? (
                              <span className="inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 border border-amber-400 font-extrabold animate-pulse">
                                🟠 En Attente Validation
                              </span>
                            ) : etab.statut_abonnement === 'actif' ? (
                              <span className="inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                🟢 Payé & Actif (+30j)
                              </span>
                            ) : offlineDB.isTrialExpired(etab) ? (
                              <span className="inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-red-100 text-red-900 border border-red-300">
                                🔴 Impayé / Expiré
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300">
                                🟡 Essai Gratuit (7j)
                              </span>
                            )}
                          </div>

                          <p className="font-serif font-black text-xs text-[#B8442C]">
                            {(etab.tarif_mensuel || usage.recommendedTier.tarif_mensuel).toLocaleString('fr-FR')} FCFA <span className="text-[10px] text-gray-500 font-sans font-normal">/ mois</span>
                          </p>

                          {/* Bouton rapide Confirmer +30j */}
                          <button
                            onClick={() => handleConfirmPaiementDirect(etab)}
                            title="Confirmer la réception de 5 000 FCFA et prolonger de 30 jours"
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                            <span>Confirmer (+30j)</span>
                          </button>
                        </div>
                      </td>

                      {/* 5. BLOCAGE / DÉBLOCAGE MANUEL & ACTIONS */}
                      <td className="p-3.5 align-top text-center space-y-2 whitespace-nowrap">
                        {/* BOUTON BLOQUER / DÉBLOQUER MANUELLEMENT */}
                        <div>
                          {isBlocked ? (
                            <button
                              onClick={() => handleUnblockEtab(etab)}
                              title="Débloquer manuellement l'accès à cette boutique immédiatement"
                              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-transform active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-md border border-emerald-500"
                            >
                              <Unlock className="w-4 h-4 text-white" />
                              <span>Débloquer l'accès</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlockEtab(etab)}
                              title="Bloquer manuellement l'accès (données 100% conservées en sécurité)"
                              className="w-full py-2 px-3 bg-[#B8442C] hover:bg-[#9C3823] text-white rounded-xl text-xs font-black transition-transform active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-md border border-red-700"
                            >
                              <Lock className="w-4 h-4 text-white" />
                              <span>Bloquer l'accès</span>
                            </button>
                          )}
                        </div>

                        {/* Actions complémentaires */}
                        <div className="flex items-center justify-center gap-1.5 pt-1">
                          {/* Mode Inspection */}
                          <button
                            onClick={() => handleInspectShop(etab)}
                            title="Mode Caméléon : Inspecter la boutique exactement comme son patron"
                            className="px-2.5 py-1.5 bg-[#1B4332] hover:bg-[#143326] text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#E8A33D]" />
                            <span>Inspecter</span>
                          </button>

                          {/* Rappel WhatsApp */}
                          {etab.telephone && (
                            <button
                              onClick={() => handleWhatsAppReminder(etab)}
                              title="Envoyer un rappel de paiement ou message sur WhatsApp"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          )}

                          {/* Supprimer (tests / nettoyage) */}
                          <button
                            onClick={() => handleDeleteEtab(etab)}
                            title="Supprimer cette boutique (nettoyage test)"
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredEtabs.length === 0 && (
            <div className="p-8 text-center bg-[#FBF7EF] rounded-2xl border border-dashed border-[#E2D5C3] space-y-3">
              <div className="text-3xl">🏢</div>
              <h3 className="font-serif font-black text-base text-[#1B4332]">Aucun commerce affiché</h3>
              <p className="text-xs text-gray-600 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'tous'
                  ? "Aucun commerce ne correspond à vos filtres actuels."
                  : "Aucune boutique enregistrée pour le moment. Cliquez sur 'Créer Commerce' ou synchronisez avec Supabase Cloud."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-[#1B4332] hover:bg-[#143326] text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-[#E8A33D]" />
                  <span>Créer un Commerce</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB COMPTES: LISTE DES COMPTES UTILISATEURS & PATRONS */}
      {activeTab === 'comptes' && (
        <div className="bg-white border border-[#E2D5C3] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="font-serif font-black text-lg text-[#1B4332]">
                Comptes Utilisateurs & Propriétaires ({comptes.length})
              </h2>
              <p className="text-xs text-gray-600 font-medium">
                Visualisez chaque compte utilisateur, son email et l'ensemble de ses boutiques associées.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="py-2 px-3.5 rounded-2xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#E8A33D]" />
              <span>Créer Commerce</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#E2D5C3]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBF7EF] border-b border-[#E2D5C3] text-[11px] font-black text-[#1B4332] uppercase">
                <tr>
                  <th className="p-3">Utilisateur / Patron</th>
                  <th className="p-3">Email du Compte</th>
                  <th className="p-3">Date d'inscription</th>
                  <th className="p-3">Commerces Rattachés</th>
                  <th className="p-3 text-center">Action Directe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D5C3]">
                {comptes.map((c) => {
                  const userEtabs = etablissements.filter((e) => {
                    if (e.compte_id && e.compte_id === c.id) return true;
                    if (e.email_patron && e.email_patron.toLowerCase() === c.email.toLowerCase()) return true;
                    return false;
                  });

                  return (
                    <tr key={c.id} className="hover:bg-[#FBF7EF]/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#1B4332] text-[#E8A33D] flex items-center justify-center font-bold text-xs shrink-0">
                            {c.nom ? c.nom.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-[#1B4332]">{c.nom}</p>
                            <p className="text-[10px] text-gray-500 font-mono">ID: {c.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-mono text-xs font-bold text-[#1B4332]">{c.email}</span>
                      </td>

                      <td className="p-3 text-gray-600 font-medium">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : 'Récent'}
                      </td>

                      <td className="p-3">
                        {userEtabs.length === 0 ? (
                          <span className="text-gray-400 italic text-[11px]">Aucun commerce rattaché</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {userEtabs.map((ue) => (
                              <span
                                key={ue.id}
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1"
                              >
                                <span>👗</span>
                                <span>{ue.nom}</span>
                                <span className="text-[10px] text-emerald-700">({ue.ville})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {userEtabs.length > 0 ? (
                          <button
                            onClick={() => handleInspectShop(userEtabs[0])}
                            className="px-2.5 py-1.5 bg-[#1B4332] hover:bg-[#143326] text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#E8A33D]" />
                            <span>Inspecter {userEtabs[0].nom}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setNewPatronEmail(c.email);
                              setNewPatronNom(c.nom);
                              setShowCreateModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ajouter Boutique</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DEMANDES DE PAIEMENT MANUEL & HISTORIQUE */}
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

      {/* Modal Guide d'Accès Super-Admin */}
      {showGuideModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowGuideModal(false); }}
        >
          <div className="bg-[#FAF9F5] border-2 border-[#E2D5C3] rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl relative space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-5 right-5 text-gray-500 hover:text-black p-2 rounded-xl bg-white border border-[#E2D5C3] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-2xl font-black shadow-md">
                🛡️
              </div>
              <div>
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Guide d'Accès Super-Admin œko</h3>
                <p className="text-xs text-gray-600 font-bold">Votre tour de contrôle centralisée</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-white rounded-2xl border border-[#E2D5C3] space-y-2">
                <p className="font-bold text-[#1B4332] text-sm flex items-center gap-2">
                  <span>1.</span>
                  <span>Comment vous connecter ?</span>
                </p>
                <p className="text-gray-700">
                  Ouvrez votre navigateur sur l'adresse dédiée :{' '}
                  <code className="bg-emerald-100 text-[#1B4332] px-2 py-0.5 rounded font-mono font-bold">
                    /super-admin
                  </code>
                </p>
                <p className="text-gray-700">
                  Saisissez votre mot de passe maître confidentiel défini dans vos paramètres de déploiement (NEXT_PUBLIC_SUPER_ADMIN_PASSWORD).
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-[#E2D5C3] space-y-2">
                <p className="font-bold text-[#1B4332] text-sm flex items-center gap-2">
                  <span>2.</span>
                  <span>Validation des paiements manuels Mobile Money</span>
                </p>
                <p className="text-gray-700">
                  Lorsque le patron clique sur "J'ai envoyé le paiement" après son transfert, sa demande apparaît dans{' '}
                  <strong>💸 Demandes de Paiement</strong>.
                </p>
                <p className="text-gray-700">
                  Vérifiez la réception sur votre téléphone, puis cliquez sur{' '}
                  <strong className="text-emerald-800">"Confirmer le paiement reçu (+30j)"</strong>. L'accès de la boutique est instantanément prolongé d'un mois.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-[#E2D5C3] space-y-2">
                <p className="font-bold text-[#1B4332] text-sm flex items-center gap-2">
                  <span>3.</span>
                  <span>Mode Inspection / Caméléon (Support)</span>
                </p>
                <p className="text-gray-700">
                  Cliquez sur <strong>"👁️ Inspecter"</strong> en face d'une boutique pour entrer dans son interface exactement comme son patron, sans lui demander son code PIN.
                </p>
                <p className="text-gray-700">
                  Un bandeau orange en haut de l'écran vous permettra de revenir au Super-Admin en 1 clic dès votre diagnostic terminé.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-[#E2D5C3] space-y-2">
                <p className="font-bold text-[#1B4332] text-sm flex items-center gap-2">
                  <span>4.</span>
                  <span>Synchro Cloud & Sauvegardes</span>
                </p>
                <p className="text-gray-700">
                  - Cliquez sur <strong>"Synchro Cloud Supabase"</strong> pour charger toutes les boutiques créées sur d'autres téléphones ou ordinateurs.
                </p>
                <p className="text-gray-700">
                  - Cliquez sur <strong>"Exporter CSV"</strong> pour télécharger votre registre client au format Excel.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 rounded-2xl bg-[#1B4332] hover:bg-[#143326] text-white font-black text-xs cursor-pointer shadow-md transition-all"
            >
              Compris, fermer le guide ➔
            </button>
          </div>
        </div>
      )}

      {/* Modal Création d'Activité / Boutique Directe */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className="bg-[#FAF9F5] border-2 border-[#E2D5C3] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-gray-500 hover:text-black p-2 rounded-xl bg-white border border-[#E2D5C3] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-2xl font-black shadow-md">
                🏢
              </div>
              <div>
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Créer un Commerce / Activité</h3>
                <p className="text-xs text-gray-600 font-bold">Ajout immédiat pour manipulations et tests Super-Admin</p>
              </div>
            </div>

            <form onSubmit={handleCreateActivityDirectly} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Commerce *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Boutique Élégance Bonapriso"
                  value={newNom}
                  onChange={(e) => setNewNom(e.target.value)}
                  className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Ville *</label>
                  <select
                    value={newVille}
                    onChange={(e) => setNewVille(e.target.value)}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  >
                    <option value="Douala">Douala</option>
                    <option value="Yaoundé">Yaoundé</option>
                    <option value="Bafoussam">Bafoussam</option>
                    <option value="Garoua">Garoua</option>
                    <option value="Kribi">Kribi</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Adresse / Quartier</label>
                  <input
                    type="text"
                    placeholder="ex: Rue des Palmiers"
                    value={newAdresse}
                    onChange={(e) => setNewAdresse(e.target.value)}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom du Patron</label>
                  <input
                    type="text"
                    placeholder="ex: M. TCHINDA"
                    value={newPatronNom}
                    onChange={(e) => setNewPatronNom(e.target.value)}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Téléphone WhatsApp</label>
                  <input
                    type="text"
                    placeholder="ex: 699001122"
                    value={newPatronPhone}
                    onChange={(e) => setNewPatronPhone(e.target.value)}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Email du Compte Patron</label>
                <input
                  type="email"
                  placeholder="ex: patron@gmail.com"
                  value={newPatronEmail}
                  onChange={(e) => setNewPatronEmail(e.target.value)}
                  className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Palier Tarifaire</label>
                  <select
                    value={newPalierTarif}
                    onChange={(e) => setNewPalierTarif(Number(e.target.value))}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  >
                    <option value={3000}>Essentiel (3 000 FCFA)</option>
                    <option value={5000}>Standard (5 000 FCFA)</option>
                    <option value={10000}>Pro (10 000 FCFA)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Statut Initial</label>
                  <select
                    value={newStatutAbonnement}
                    onChange={(e) => setNewStatutAbonnement(e.target.value as 'essai' | 'actif')}
                    className="w-full bg-white border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  >
                    <option value="essai">Essai gratuit (7 jours)</option>
                    <option value="actif">Actif (+30 jours)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-[#E8A33D]" />
                  <span>Enregistrer & Créer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
