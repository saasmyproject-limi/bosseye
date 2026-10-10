'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Plus,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  LogOut,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Store,
  RefreshCw,
  Search,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { CompteUtilisateur, Etablissement } from '@/types';
import { fetchActivitesFromCloud, deleteActiviteFromCloud } from '@/lib/activitesSyncService';
import GoogleAuthModal from '@/components/GoogleAuthModal';
import BarSelectorModal from '@/components/BarSelectorModal';
import OfflineBadge from '@/components/OfflineBadge';

function ActivitesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoCreate = searchParams.get('create') === 'true';

  const [compte, setCompte] = useState<CompteUtilisateur | null>(null);
  const [activites, setActivites] = useState<Etablissement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGoogleAuthOpen, setIsGoogleAuthOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setServerError(null);

    let currentCompte = offlineDB.getCompteActuel();
    if (!currentCompte) {
      setCompte(null);
      setIsLoading(false);
      setIsGoogleAuthOpen(true);
      return;
    }
    setCompte(currentCompte);

    // Charger la liste des activités depuis le Cloud Supabase (source de vérité)
    const res = await fetchActivitesFromCloud();
    setIsLoading(false);

    if (res.success) {
      setActivites(res.activites);
      if (autoCreate && res.activites.length === 0) {
        setIsCreateModalOpen(true);
      }
    } else {
      setServerError(res.error || 'Impossible de joindre le serveur');
      // En cas d'erreur serveur, conserver les activités en cache local sans vider artificiellement
      setActivites(res.activites);
    }
  };

  const handleSelectActivite = (etab: Etablissement) => {
    offlineDB.switchEtablissement(etab.id);
    const act = etab.type_activite || 'boutique';
    router.push(`/${act}/dashboard`);
  };

  const handleDeleteActivite = async (etab: Etablissement) => {
    if (confirm(`Voulez-vous vraiment supprimer définitivement le commerce "${etab.nom}" ? Cette action effacera cette boutique du Cloud et du téléphone.`)) {
      await deleteActiviteFromCloud(etab.id);
      loadData();
    }
  };

  const handleLogoutGoogle = () => {
    offlineDB.logoutGoogleCompte();
    setCompte(null);
    setIsGoogleAuthOpen(true);
  };

  const getTierBadge = (etab: Etablissement) => {
    const daysLeft = offlineDB.getTrialDaysRemaining(etab);
    const tarif = etab.tarif_mensuel || 5000;

    let tierName = 'Standard (5 000 FCFA/mois)';
    if (tarif <= 3000) tierName = 'Essentiel (3 000 FCFA/mois)';
    else if (tarif > 5000) tierName = 'Pro (10 000 FCFA/mois)';

    if (etab.statut_abonnement === 'essai') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3.5 h-3.5" />
          Essai ({daysLeft}j restants)
        </span>
      );
    }

    if (etab.statut_abonnement === 'actif') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Actif — {tierName}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300">
        Abonnement en attente
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-[#1B4332] text-white py-4 px-6 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8A33D] text-[#1B4332] flex items-center justify-center text-xl font-black shadow-md">
            👁️
          </div>
          <div>
            <h1 className="font-serif font-black text-xl leading-none">œko — Mes Activités</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <OfflineBadge />

          {/* Compte Utilisateur */}
          {compte ? (
            <div className="flex items-center gap-3 bg-white/10 px-3.5 py-2 rounded-2xl border border-white/20">
              <div className="w-8 h-8 rounded-full bg-[#E8A33D] text-[#1B4332] font-black flex items-center justify-center text-sm shadow-sm">
                {compte.nom.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold truncate max-w-[140px]">{compte.nom}</div>
                <div className="text-[10px] text-gray-300 font-mono truncate max-w-[140px]">{compte.email}</div>
              </div>
              <button
                onClick={handleLogoutGoogle}
                title="Se déconnecter"
                className="p-1.5 rounded-xl hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsGoogleAuthOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#E8A33D] text-[#1B4332] font-bold text-xs hover:bg-[#d69533] transition-colors cursor-pointer"
            >
              Se connecter avec Google
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Erreur Serveur Injoignable (Bandeau de Sécurité Phase 3) */}
        {serverError && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-900 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-extrabold block text-sm">Impossible de joindre le serveur Cloud</span>
                <span className="font-normal opacity-90">{serverError}. Vos activités en cache local sont affichées.</span>
              </div>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Réessayer</span>
            </button>
          </div>
        )}

        {/* Banner Section */}
        <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-serif font-black text-2xl text-[#1B4332]">
              Sélectionnez une activité pour y accéder
            </h2>
            <p className="text-xs text-[#1B4332]/80 font-medium max-w-xl">
              Chaque activité possède son propre stock, ses ventes, son palier tarifaire et son propre statut d'abonnement. Un même compte permet de gérer plusieurs commerces.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3.5 rounded-2xl bg-[#B8442C] hover:bg-[#a03822] text-white font-bold text-sm shadow-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Créer une nouvelle activité</span>
          </button>
        </div>

        {/* Activities List / Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-black text-lg text-[#1B4332]">
              Vos commerces ({activites.length})
            </h3>
            <span className="text-xs font-bold text-gray-500">
              Rattachés à {compte?.email || 'votre compte Google'}
            </span>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-3xl p-12 border-2 border-[#E2D5C3] text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#1B4332] animate-spin mx-auto" />
              <p className="text-xs font-bold text-gray-600">Chargement de vos boutiques depuis Supabase Cloud...</p>
            </div>
          ) : activites.length === 0 && !serverError ? (
            <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-[#E2D5C3] text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#F3ECE0] text-[#1B4332] flex items-center justify-center mx-auto text-3xl shadow-inner">
                🏪
              </div>
              <div>
                <h4 className="font-serif font-black text-lg text-[#1B4332]">Aucune activité enregistrée</h4>
                <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
                  Créez votre première boutique pour démarrer votre essai gratuit.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 rounded-2xl bg-[#1B4332] text-white font-bold text-xs hover:bg-[#143326] transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Créer ma première activité</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activites.map((etab) => {
                const icon = '👗';
                const typeLabel = `Boutique (${etab.secteur_boutique || 'Commerce'})`;

                return (
                  <div
                    key={etab.id}
                    className="bg-white rounded-3xl border-2 border-[#E2D5C3] hover:border-[#1B4332] p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#F3ECE0] text-[#1B4332] flex items-center justify-center text-2xl shadow-inner">
                            {icon}
                          </div>
                          <div>
                            <h4 className="font-serif font-black text-lg text-[#1B4332]">{etab.nom}</h4>
                            <span className="text-xs font-bold text-[#B8442C]">{typeLabel}</span>
                          </div>
                        </div>

                        {getTierBadge(etab)}
                      </div>

                      <div className="text-xs text-gray-600 space-y-1 bg-[#FBF7EF] p-3 rounded-2xl border border-[#E2D5C3]/60">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Ville & Adresse :</span>
                          <span className="font-bold text-[#1B4332]">
                            {etab.ville} — {etab.adresse}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Tarif mensuel :</span>
                          <span className="font-bold text-[#1B4332]">
                            {(etab.tarif_mensuel || 5000).toLocaleString('fr-FR')} FCFA/mois
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleSelectActivite(etab)}
                        className="flex-1 py-3 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all group cursor-pointer"
                      >
                        <span>Accéder à {etab.nom}</span>
                        <ChevronRight className="w-4 h-4 text-[#E8A33D] group-hover:translate-x-1 transition-transform" />
                      </button>

                      <button
                        onClick={() => handleDeleteActivite(etab)}
                        title={`Supprimer définitivement ${etab.nom}`}
                        className="p-3 rounded-2xl border-2 border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <GoogleAuthModal
        isOpen={isGoogleAuthOpen}
        onClose={() => setIsGoogleAuthOpen(false)}
        onSuccess={(updatedCompte) => {
          setCompte(updatedCompte);
          loadData();
        }}
      />

      <BarSelectorModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSelectSuccess={(newEtab) => {
          loadData();
          handleSelectActivite(newEtab);
        }}
      />
    </div>
  );
}

export default function ActivitesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-bold">Chargement des activités...</div>}>
      <ActivitesContent />
    </Suspense>
  );
}
