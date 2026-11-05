'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  X,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
  LogIn,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { supabase } from '@/lib/supabase';
import { CompteUtilisateur } from '@/types';
import { fetchActivitesFromCloud } from '@/lib/activitesSyncService';
import { syncEngine } from '@/lib/supabaseSyncEngine';

interface GoogleAuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose?: () => void;
  onSuccess?: (compte: CompteUtilisateur) => void;
}

export default function GoogleAuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}: GoogleAuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setSuccessMsg('');
      setPassword('');
      // Préremplir avec l'email du compte local si existant
      const localCompte = offlineDB.getCompteActuel();
      if (localCompte?.email) {
        setEmail(localCompte.email);
        setNom(localCompte.nom || '');
      }
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  // Authentification Google OAuth 2.0
  const handleGoogleOAuthLogin = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/activites`
          : 'https://bosseye-sooty.vercel.app/activites';

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (authError) throw authError;
    } catch (err: any) {
      console.warn('OAuth Google direct:', err);
      setError(
        `Connexion Google non disponible : ${err?.message || 'Utilisez la connexion E-mail + Mot de passe ci-dessous.'}`
      );
      setIsSubmitting(false);
    }
  };

  // Traitement Connexion / Inscription E-mail + Mot de passe officiel Supabase
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const formattedEmail = email.trim().toLowerCase();
    if (!formattedEmail || !formattedEmail.includes('@') || !formattedEmail.includes('.')) {
      setError('Veuillez saisir une adresse e-mail valide (ex: patron@gmail.com).');
      return;
    }

    if (!password || password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        // 1. INSCRIPTION CLOUD (SIGN UP)
        const displayName = nom.trim() || formattedEmail.split('@')[0];
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: formattedEmail,
          password: password,
          options: {
            data: {
              full_name: displayName,
            },
          },
        });

        if (signUpErr) {
          // Si l'utilisateur existe déjà, tenter directement la connexion
          if (
            signUpErr.message.toLowerCase().includes('already registered') ||
            signUpErr.message.toLowerCase().includes('already exists')
          ) {
            setMode('login');
            setError('Ce compte existe déjà. Veuillez saisir votre mot de passe pour vous connecter.');
            setIsSubmitting(false);
            return;
          }
          throw signUpErr;
        }

        const authUser = signUpData.user;
        const session = signUpData.session;

        if (session && authUser) {
          // Session immédiate (Confirm email désactivé sur Supabase)
          const compte = offlineDB.loginWithGoogle(
            formattedEmail,
            displayName,
            authUser.user_metadata?.avatar_url,
            authUser.id
          );

          setSuccessMsg('Compte créé avec succès ! Synchronisation en cours...');
          if (onSuccess) onSuccess(compte);

          // Tenter d'envoyer immédiatement les éléments en attente avec le nouveau token
          syncEngine.processQueue();

          setTimeout(async () => {
            const res = await fetchActivitesFromCloud();
            if (res.success && res.activites && res.activites.length > 0) {
              offlineDB.switchEtablissement(res.activites[0].id);
              router.push('/boutique/dashboard');
            } else {
              router.push('/activites?create=true');
            }
            if (onClose) onClose();
          }, 800);
          return;
        } else {
          // Email confirmation requis par la config Supabase
          setSuccessMsg(
            'Compte créé avec succès ! Un e-mail de confirmation a été envoyé à votre adresse. Cliquez sur le lien reçu, puis connectez-vous.'
          );
          setMode('login');
          setIsSubmitting(false);
          return;
        }
      } else {
        // 2. CONNEXION CLOUD (SIGN IN WITH PASSWORD)
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: formattedEmail,
          password: password,
        });

        if (signInErr) {
          if (signInErr.message.toLowerCase().includes('email not confirmed')) {
            setError(
              'Votre e-mail n\'a pas encore été confirmé. Vérifiez votre boîte de réception ou désactivez "Confirm email" dans votre console Supabase.'
            );
            setIsSubmitting(false);
            return;
          }
          if (signInErr.message.toLowerCase().includes('invalid login credentials')) {
            setError('Adresse e-mail ou mot de passe incorrect.');
            setIsSubmitting(false);
            return;
          }
          throw signInErr;
        }

        const authUser = signInData.user;
        const displayName = authUser?.user_metadata?.full_name || nom.trim() || formattedEmail.split('@')[0];

        // Enregistrer la session dans offlineDB avec le vrai UUID Supabase
        const compte = offlineDB.loginWithGoogle(
          formattedEmail,
          displayName,
          authUser?.user_metadata?.avatar_url,
          authUser?.id
        );

        setSuccessMsg('Connexion réussie ! Chargement de vos boutiques...');
        if (onSuccess) onSuccess(compte);

        // Déclencher le vidage de la file d'attente avec le token d'authentification valide
        syncEngine.processQueue();

        // Récupérer les boutiques Cloud de ce compte
        setTimeout(async () => {
          try {
            const res = await fetchActivitesFromCloud();
            if (res.success && res.activites && res.activites.length > 0) {
              offlineDB.switchEtablissement(res.activites[0].id);
              router.push('/boutique/dashboard');
            } else {
              router.push('/activites?create=true');
            }
          } catch (err) {
            router.push('/boutique/dashboard');
          }
          if (onClose) onClose();
        }, 600);
      }
    } catch (err: any) {
      console.error('Erreur authentification Supabase:', err);
      setError(err?.message || 'Erreur lors de la connexion. Vérifiez votre connexion internet.');
      setIsSubmitting(false);
    }
  };

  // Accès de secours hors-ligne (si aucune connexion internet disponible)
  const handleOfflineFallback = () => {
    const formattedEmail = email.trim().toLowerCase() || 'patron@oeko.cm';
    const displayName = nom.trim() || formattedEmail.split('@')[0];
    const compte = offlineDB.loginWithGoogle(formattedEmail, displayName);
    if (onSuccess) onSuccess(compte);
    if (onClose) onClose();
    router.push('/boutique/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FAF9F5] border-2 border-[#E2D5C3] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200">
        {/* Bouton Fermer */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* En-tête avec Logo Œko */}
        <div className="text-center space-y-1 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center mx-auto text-2xl font-black shadow-md">
            👁️
          </div>
          <h2 className="font-serif text-2xl font-black text-[#1B4332]">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'} <span className="text-[#B8442C]">œko</span>
          </h2>
          <p className="text-xs text-gray-600 font-medium">
            {mode === 'login'
              ? 'Accédez à votre boutique et retrouvez vos données sur tous vos appareils.'
              : 'Créez votre compte patron pour synchroniser votre boutique en temps réel.'}
          </p>
        </div>

        {/* TABS : Se connecter / Créer un compte */}
        <div className="flex rounded-2xl bg-[#EFE7D8] p-1 border border-[#E2D5C3]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-[#1B4332] text-white shadow-sm'
                : 'text-[#1B4332]/70 hover:text-[#1B4332]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Se connecter</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-[#1B4332] text-white shadow-sm'
                : 'text-[#1B4332]/70 hover:text-[#1B4332]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Créer un compte</span>
          </button>
        </div>

        {/* Messages d'erreur ou de succès */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Formulaire E-mail + Mot de Passe */}
        <form onSubmit={handleAuthSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-[#1B4332] mb-1 uppercase tracking-wider">
                Nom complet / Nom du patron *
              </label>
              <input
                type="text"
                placeholder="ex: M. TCHINDA"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required={mode === 'register'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-gray-900 shadow-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[#1B4332] mb-1 uppercase tracking-wider">
              Adresse E-mail *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="votre.adresse@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-gray-900 shadow-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#1B4332] mb-1 uppercase tracking-wider">
              Mot de passe *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Au moins 6 caractères..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-gray-900 shadow-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#E8A33D]" />
                <span>{mode === 'login' ? 'Connexion en cours...' : 'Création du compte...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Se connecter à mon compte' : 'Créer mon compte & Démarrer'}</span>
                <ArrowRight className="w-4 h-4 text-[#E8A33D]" />
              </>
            )}
          </button>
        </form>

        {/* Séparateur pour option Google */}
        <div className="relative my-2 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E2D5C3]" />
          </div>
          <span className="relative bg-[#FAF9F5] px-3 text-[10px] uppercase font-bold tracking-widest text-gray-400">
            ou Google en 1 clic
          </span>
        </div>

        {/* Bouton Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleOAuthLogin}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-gray-50 border border-[#E2D5C3] text-[#1B4332] font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuer avec Google</span>
        </button>

        {/* Footer avec sécurité et mode secours */}
        <div className="pt-1 flex flex-col items-center gap-1 text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5 font-medium text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authentification sécurisée Cloud Supabase</span>
          </div>
          <button
            type="button"
            onClick={handleOfflineFallback}
            className="text-[10px] text-gray-400 hover:text-gray-600 underline cursor-pointer mt-1"
          >
            Passer et continuer en mode local hors-ligne (secours)
          </button>
        </div>
      </div>
    </div>
  );
}
